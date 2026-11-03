import { create } from 'zustand'
import type { QueryCache } from '@tanstack/react-query'

type QueryCacheConfig = NonNullable<ConstructorParameters<typeof QueryCache>[0]>

/**
 * Connection trouble, as seen by data reads. There is no NetInfo in the app (it would need a
 * native build), so the query cache is the signal: a read that fails on the network sets
 * `trouble`, the next successful read clears it. Screens default failed reads to empty lists, so
 * without this an offline user saw "nothing logged" instead of "can't reach Grandma".
 */
export const useConnectionStore = create<{ trouble: boolean; setTrouble: (v: boolean) => void }>((set) => ({
  trouble: false,
  setTrouble: (trouble) => set({ trouble }),
}))

const NETWORK_PATTERN = /network request failed|failed to fetch|fetch failed|timed out|timeout|network error|internet connection appears to be offline/i

/** True for transport failures (RN fetch, supabase-js wrapping them); false for app/RLS errors. */
export function isNetworkError(err: unknown): boolean {
  if (!err) return false
  const message = typeof err === 'string' ? err : (err as { message?: unknown }).message
  return typeof message === 'string' && NETWORK_PATTERN.test(message)
}

export const connectionQueryCacheHandlers: QueryCacheConfig = {
  onError: (error: unknown) => {
    if (isNetworkError(error) && !useConnectionStore.getState().trouble) useConnectionStore.getState().setTrouble(true)
  },
  onSuccess: () => {
    if (useConnectionStore.getState().trouble) useConnectionStore.getState().setTrouble(false)
  },
}
