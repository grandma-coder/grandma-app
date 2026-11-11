/** The pregnancy report reads every log, not the first 1000 (a single PostgREST select caps there). */
const mockRows = Array.from({ length: 1500 }, (_, i) => ({
  log_date: `2026-${String(1 + Math.floor(i / 200)).padStart(2, '0')}-01`, log_type: 'weight', value: String(60 + i / 100), notes: null, id: i,
}))

jest.mock('../supabase', () => {
  const actual = jest.requireActual('../supabase')
  const query = () => {
    let rangeAB: [number, number] | null = null
    const b: any = {
      select: () => b, eq: () => b, in: () => b, order: () => b,
      range: (a: number, z: number) => { rangeAB = [a, z]; return b },
      then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => {
        const [a, z] = rangeAB ?? [0, 999] // server-side default cap
        return Promise.resolve({ data: mockRows.slice(a, z + 1), error: null }).then(res, rej)
      },
    }
    return b
  }
  return {
    ...actual,
    supabase: {
      from: query,
      auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } }, error: null }) },
    },
  }
})

import { fetchPregnancyReportLogs } from '../reports/useJourneyReport'

it('pregnancy report logs are paged past 1000 rows', async () => {
  const logs = await fetchPregnancyReportLogs()
  expect(logs).toHaveLength(1500)
})
