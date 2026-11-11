/**
 * Widget collect vs home: the cycle average comes from the same full history the home reads
 * (not a 200-day window), and today's kicks are the same number the pregnancy home shows.
 */
type Row = Record<string, any>
const mockDb: Record<string, Row[]> = {}

function mockBuilder(table: string) {
  const filters: ((r: Row) => boolean)[] = []
  let rangeAB: [number, number] | null = null
  const b: any = {
    select: () => b,
    eq: (c: string, v: unknown) => { filters.push((r) => r[c] === v); return b },
    in: (c: string, vs: unknown[]) => { filters.push((r) => vs.includes(r[c])); return b },
    gte: (c: string, v: string) => { filters.push((r) => r[c] >= v); return b },
    order: () => b,
    range: (a: number, z: number) => { rangeAB = [a, z]; return b },
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => {
      let out = (mockDb[table] ?? []).filter((r) => filters.every((f) => f(r)))
      if (rangeAB) out = out.slice(rangeAB[0], rangeAB[1] + 1)
      return Promise.resolve({ data: out, error: null }).then(res, rej)
    },
  }
  return b
}

jest.mock('../supabase', () => {
  const actual = jest.requireActual('../supabase')
  return {
    ...actual,
    supabase: {
      from: (t: string) => mockBuilder(t),
      auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } }, error: null }) },
    },
  }
})

import { collectSnapshotInput } from '../widgets/collect'
import { groupPregnancyTodayLogs } from '../analyticsData'
import { queryClient } from '../queryClient'
import { useBehaviorStore } from '../../store/useBehaviorStore'
import { useCycleSettingsStore } from '../../store/useCycleSettingsStore'

const now = new Date('2026-11-09T10:00:00')

beforeEach(() => {
  for (const k of Object.keys(mockDb)) delete mockDb[k]
  queryClient.clear()
  useCycleSettingsStore.setState({ cycleLength: null, periodLength: 5, lutealPhase: 14 })
})

it('cycle: measured average uses the whole history, like the home', async () => {
  useBehaviorStore.setState({ enrolledBehaviors: ['pre-pregnancy'] })
  // 30-day cycles more than 200 days ago, then a long gap (outlier) to the latest period.
  mockDb.cycle_logs = ['2026-03-01', '2026-03-31', '2026-04-30', '2026-10-30'].map((date, i) => ({
    id: `c${i}`, user_id: 'u1', date, type: 'period_start', value: null, notes: null, created_at: date,
  }))
  const input = await collectSnapshotInput(now)
  expect(input?.cycle?.config?.cycleLength).toBe(30)
  expect(input?.cycle?.config?.lastPeriodStart).toBe('2026-10-30')
})

it('pregnancy kicks: widget and home show the same total for today', async () => {
  useBehaviorStore.setState({ enrolledBehaviors: ['pregnancy'] })
  const rows = [
    { user_id: 'u1', log_date: '2026-11-09', log_type: 'kick_count', value: '10', notes: null, created_at: '2026-11-09T08:00:00' },
    { user_id: 'u1', log_date: '2026-11-09', log_type: 'kick_count', value: '12', notes: null, created_at: '2026-11-09T09:00:00' },
  ]
  mockDb.pregnancy_logs = rows
  const input = await collectSnapshotInput(now)
  const home = groupPregnancyTodayLogs(rows)
  expect(home.kick_count.value).toBe('22') // label is "Kicks today" (widget) — a total
  expect(input?.pregnancy?.todayLogs.kick_count.value).toBe(home.kick_count.value)
})
