// A failed read with no connection used to look like "nothing logged". The query cache now flags
// network failures (not app/permission errors) so a banner can say so, and clears on success.
import { QueryClient, QueryCache } from '@tanstack/react-query'
import { isNetworkError, useConnectionStore, connectionQueryCacheHandlers } from '../connectionStatus'

function client() {
  return new QueryClient({
    queryCache: new QueryCache(connectionQueryCacheHandlers),
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  })
}

describe('isNetworkError', () => {
  it('matches fetch failures as thrown by RN and as wrapped by supabase-js', () => {
    expect(isNetworkError(new TypeError('Network request failed'))).toBe(true)
    expect(isNetworkError({ message: 'TypeError: Network request failed', details: '' })).toBe(true)
    expect(isNetworkError(new Error('Failed to fetch'))).toBe(true)
    expect(isNetworkError(new Error('The request timed out.'))).toBe(true)
  })

  it('ignores app and permission errors', () => {
    expect(isNetworkError({ message: 'new row violates row-level security policy', code: '42501' })).toBe(false)
    expect(isNetworkError(new Error('Not signed in'))).toBe(false)
    expect(isNetworkError(null)).toBe(false)
  })
})

describe('connection store via the query cache', () => {
  beforeEach(() => useConnectionStore.setState({ trouble: false }))

  it('flags trouble when a query fails on the network and clears it on the next success', async () => {
    const qc = client()
    await qc.fetchQuery({ queryKey: ['a'], queryFn: () => Promise.reject(new TypeError('Network request failed')) }).catch(() => {})
    expect(useConnectionStore.getState().trouble).toBe(true)

    await qc.fetchQuery({ queryKey: ['b'], queryFn: () => Promise.resolve(1) })
    expect(useConnectionStore.getState().trouble).toBe(false)
  })

  it('does not flag trouble for a non-network failure', async () => {
    const qc = client()
    await qc.fetchQuery({ queryKey: ['c'], queryFn: () => Promise.reject(new Error('Not signed in')) }).catch(() => {})
    expect(useConnectionStore.getState().trouble).toBe(false)
  })
})
