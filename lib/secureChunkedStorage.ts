import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import type { StateStorage } from 'zustand/middleware'

/**
 * zustand `StateStorage` backed by the iOS Keychain / Android Keystore
 * (expo-secure-store) instead of plaintext AsyncStorage — for persisted state
 * that holds health free text (e.g. Grandma chat history).
 *
 * - WHEN_UNLOCKED_THIS_DEVICE_ONLY: encrypted at rest, unreadable while the
 *   device is locked, never included in backups or migrated to a new device.
 * - SecureStore values should stay under ~2KB (Android), so a value is split
 *   into chunks: `<key>.n` holds the count, `<key>.<i>` the parts.
 * - Writes are debounced (persist fires on every state change) — the latest
 *   value wins; reads see a pending value immediately.
 * - `legacyAsyncStorageKey`: a value still in AsyncStorage from before is moved
 *   over on first read and the plaintext copy deleted.
 */
const CHUNK_SIZE = 1800
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
}

/** SecureStore keys allow only [A-Za-z0-9._-]. */
function safeKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, '_')
}

async function readChunks(key: string): Promise<string | null> {
  const base = safeKey(key)
  const countStr = await SecureStore.getItemAsync(`${base}.n`, OPTIONS)
  if (!countStr) return null
  const count = parseInt(countStr, 10)
  if (!Number.isFinite(count) || count < 0) return null
  const parts: string[] = []
  for (let i = 0; i < count; i++) {
    const part = await SecureStore.getItemAsync(`${base}.${i}`, OPTIONS)
    if (part == null) return null // torn write — treat as empty rather than corrupt JSON
    parts.push(part)
  }
  return parts.join('')
}

async function writeChunks(key: string, value: string): Promise<void> {
  const base = safeKey(key)
  const prevStr = await SecureStore.getItemAsync(`${base}.n`, OPTIONS)
  const prevCount = prevStr ? parseInt(prevStr, 10) || 0 : 0
  const parts: string[] = []
  for (let i = 0; i < value.length; i += CHUNK_SIZE) parts.push(value.slice(i, i + CHUNK_SIZE))
  for (let i = 0; i < parts.length; i++) {
    await SecureStore.setItemAsync(`${base}.${i}`, parts[i], OPTIONS)
  }
  await SecureStore.setItemAsync(`${base}.n`, String(parts.length), OPTIONS)
  for (let i = parts.length; i < prevCount; i++) {
    await SecureStore.deleteItemAsync(`${base}.${i}`, OPTIONS)
  }
}

async function removeChunks(key: string): Promise<void> {
  const base = safeKey(key)
  const countStr = await SecureStore.getItemAsync(`${base}.n`, OPTIONS)
  const count = countStr ? parseInt(countStr, 10) || 0 : 0
  for (let i = 0; i < count; i++) await SecureStore.deleteItemAsync(`${base}.${i}`, OPTIONS)
  await SecureStore.deleteItemAsync(`${base}.n`, OPTIONS)
}

interface Options {
  legacyAsyncStorageKey?: string
  debounceMs?: number
}

export function createSecureChunkedStorage({ legacyAsyncStorageKey, debounceMs = 800 }: Options = {}): StateStorage {
  const pending = new Map<string, string>()
  const timers = new Map<string, ReturnType<typeof setTimeout>>()
  // Serialise writes per key so a slow write can't land after a newer one.
  const chains = new Map<string, Promise<void>>()

  function enqueue(key: string, op: () => Promise<void>): Promise<void> {
    const next = (chains.get(key) ?? Promise.resolve()).then(op).catch((e) => {
      console.warn('[secureStorage] write failed:', e instanceof Error ? e.message : e)
    })
    chains.set(key, next)
    return next
  }

  return {
    getItem: async (key) => {
      const p = pending.get(key)
      if (p !== undefined) return p
      const value = await readChunks(key)
      if (value != null || !legacyAsyncStorageKey) return value
      const legacy = await AsyncStorage.getItem(legacyAsyncStorageKey)
      if (legacy == null) return null
      await enqueue(key, () => writeChunks(key, legacy))
      await AsyncStorage.removeItem(legacyAsyncStorageKey)
      return legacy
    },
    setItem: (key, value) => {
      pending.set(key, value)
      const t = timers.get(key)
      if (t) clearTimeout(t)
      timers.set(key, setTimeout(() => {
        timers.delete(key)
        const latest = pending.get(key)
        if (latest === undefined) return
        void enqueue(key, () => writeChunks(key, latest)).then(() => {
          if (pending.get(key) === latest) pending.delete(key)
        })
      }, debounceMs))
    },
    removeItem: async (key) => {
      const t = timers.get(key)
      if (t) clearTimeout(t)
      timers.delete(key)
      pending.delete(key)
      await enqueue(key, () => removeChunks(key))
      if (legacyAsyncStorageKey) await AsyncStorage.removeItem(legacyAsyncStorageKey)
    },
  }
}
