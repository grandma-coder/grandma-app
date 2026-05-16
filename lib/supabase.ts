import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.'
  )
}

// SecureStore has a hard 2KB-per-value limit on iOS. Supabase auth tokens
// (JWT + refresh_token) routinely exceed this. We chunk values across multiple
// keys so the session survives long-lived refresh tokens.
const CHUNK_SIZE = 1800
const CHUNK_COUNT_SUFFIX = '__chunks'

async function getChunkedItem(key: string): Promise<string | null> {
  const countStr = await SecureStore.getItemAsync(`${key}${CHUNK_COUNT_SUFFIX}`)
  if (!countStr) {
    return await SecureStore.getItemAsync(key)
  }
  const count = parseInt(countStr, 10)
  if (!Number.isFinite(count) || count <= 0) return null
  const parts: string[] = []
  for (let i = 0; i < count; i++) {
    const part = await SecureStore.getItemAsync(`${key}__${i}`)
    if (part === null) return null
    parts.push(part)
  }
  return parts.join('')
}

async function setChunkedItem(key: string, value: string): Promise<void> {
  await removeChunkedItem(key)
  if (value.length <= CHUNK_SIZE) {
    await SecureStore.setItemAsync(key, value)
    return
  }
  const chunks: string[] = []
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.slice(i, i + CHUNK_SIZE))
  }
  await SecureStore.setItemAsync(`${key}${CHUNK_COUNT_SUFFIX}`, String(chunks.length))
  for (let i = 0; i < chunks.length; i++) {
    await SecureStore.setItemAsync(`${key}__${i}`, chunks[i])
  }
}

async function removeChunkedItem(key: string): Promise<void> {
  const countStr = await SecureStore.getItemAsync(`${key}${CHUNK_COUNT_SUFFIX}`)
  if (countStr) {
    const count = parseInt(countStr, 10)
    if (Number.isFinite(count) && count > 0) {
      for (let i = 0; i < count; i++) {
        await SecureStore.deleteItemAsync(`${key}__${i}`)
      }
    }
    await SecureStore.deleteItemAsync(`${key}${CHUNK_COUNT_SUFFIX}`)
  }
  await SecureStore.deleteItemAsync(key)
}

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => getChunkedItem(key),
  setItem: (key: string, value: string) => setChunkedItem(key, value),
  removeItem: (key: string) => removeChunkedItem(key),
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
