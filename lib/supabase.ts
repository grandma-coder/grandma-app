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

// Reads from PostgREST get a timeout: without one, a stalled database leaves every query
// pending forever and every loading skeleton stuck on screen. Writes, storage uploads and edge
// functions keep the default (aborting a save that would have succeeded is worse than waiting).
const READ_TIMEOUT_MS = 12000
export const fetchWithReadTimeout: typeof fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
  const method = (init?.method ?? (typeof input === 'object' && 'method' in input ? (input as Request).method : 'GET')).toUpperCase()
  if (!url.includes('/rest/v1/') || (method !== 'GET' && method !== 'HEAD') || init?.signal) return fetch(input, init)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), READ_TIMEOUT_MS)
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer))
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: fetchWithReadTimeout },
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

/** PostgREST returns at most this many rows per request (Supabase's default `max_rows`). */
const PAGE_SIZE = 1000

/**
 * Every row of a query, page by page. A plain select stops at the server's 1000-row cap without
 * an error, and for "all my logs, oldest first" queries the rows dropped are the NEWEST — a
 * months-long tracker's analytics and reports froze at the cut-off. `makeQuery` must return a
 * fresh, fully filtered and ordered builder each call (include a unique tiebreaker such as `id`
 * in the order so pages don't overlap). Throws the first error rather than returning a partial list.
 */
export async function fetchAllRows<T>(
  makeQuery: () => { range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }> },
): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await makeQuery().range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    const page = data ?? []
    out.push(...page)
    if (page.length < PAGE_SIZE) return out
  }
}
