/**
 * Notification engine logic against a tiny in-memory Supabase: the pregnancy week must match the
 * home (completed weeks, not rounded up), and cycle notifications must use the same cycle config
 * as the home (settings → measured average → 28), fire "late" when late, and leave "period soon"
 * to the local reminder (lib/cycleReminders.ts).
 */
type Row = Record<string, any>

const db: Record<string, Row[]> = {}
const inserted: Row[] = []

function mockBuilder(table: string) {
  const filters: ((r: Row) => boolean)[] = []
  const orderBy: [string, boolean][] = []
  let limitN: number | null = null
  let rangeAB: [number, number] | null = null
  let head = false
  let single = false
  let isInsert = false
  const b: any = {
    select: (_c?: string, opts?: { count?: string; head?: boolean }) => { if (opts?.head) head = true; return b },
    eq: (c: string, v: unknown) => { filters.push((r) => r[c] === v); return b },
    neq: (c: string, v: unknown) => { filters.push((r) => r[c] !== v); return b },
    in: (c: string, vs: unknown[]) => { filters.push((r) => vs.includes(r[c])); return b },
    gte: (c: string, v: string) => { filters.push((r) => r[c] >= v); return b },
    lte: (c: string, v: string) => { filters.push((r) => r[c] <= v); return b },
    contains: () => { filters.push(() => false); return b }, // nothing was notified before
    order: (c: string, o?: { ascending?: boolean }) => { orderBy.push([c, o?.ascending !== false]); return b },
    limit: (n: number) => { limitN = n; return b },
    range: (a: number, z: number) => { rangeAB = [a, z]; return b },
    maybeSingle: () => { single = true; return b },
    insert: (p: Row | Row[]) => { isInsert = true; inserted.push(...(Array.isArray(p) ? p : [p])); return b },
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(run()).then(res, rej),
  }
  function run() {
    if (isInsert) return { data: null, error: null }
    let out = (db[table] ?? []).filter((r) => filters.every((f) => f(r)))
    if (orderBy.length) {
      const [c, asc] = orderBy[0]
      out = [...out].sort((x, y) => (x[c] < y[c] ? -1 : x[c] > y[c] ? 1 : 0) * (asc ? 1 : -1))
    }
    const count = out.length
    if (rangeAB) out = out.slice(rangeAB[0], rangeAB[1] + 1)
    if (limitN != null) out = out.slice(0, limitN)
    if (head) return { data: null, error: null, count }
    if (single) return { data: out[0] ?? null, error: null }
    return { data: out, error: null, count }
  }
  return b
}

jest.mock('../supabase', () => {
  const actual = jest.requireActual('../supabase')
  return { ...actual, supabase: { from: (t: string) => mockBuilder(t), auth: actual.supabase.auth } }
})

import { generateCycleNotifications, generatePregnancyNotifications } from '../notificationEngine'
import { useCycleSettingsStore } from '../../store/useCycleSettingsStore'
import { useLanguageStore } from '../../store/useLanguageStore'

const USER = 'u1'

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] })
  jest.setSystemTime(new Date('2026-11-09T10:00:00'))
  for (const k of Object.keys(db)) delete db[k]
  inserted.length = 0
  useLanguageStore.setState({ language: 'en' })
  useCycleSettingsStore.setState({ cycleLength: null, periodLength: 5, lutealPhase: 14 })
})
afterEach(() => jest.useRealTimers())

describe('pregnancy notifications', () => {
  const onboard = (dueDate: string) => {
    db.pregnancy_logs = [
      { id: 'p1', user_id: USER, log_type: 'note', value: 'onboarding', log_date: '2026-11-09', notes: JSON.stringify({ dueDate }) },
    ]
  }
  it('week milestone uses completed weeks like the home (27w6d is not week 28)', async () => {
    onboard('2027-02-02') // 85 days to go → home shows week 27
    await generatePregnancyNotifications(USER)
    expect(inserted.find((n) => n.type === 'milestone')).toBeUndefined()
  })
  it('week milestone fires on the first day of the week', async () => {
    onboard('2027-02-01') // 84 days to go → week 28
    await generatePregnancyNotifications(USER)
    expect(inserted.find((n) => n.type === 'milestone')?.data.week).toBe(28)
  })
})

describe('cycle notifications', () => {
  const periods = (...dates: string[]) => {
    db.cycle_logs = dates.map((date, i) => ({ id: `c${i}`, user_id: USER, date, type: 'period_start', value: null, notes: null }))
  }
  it('late period fires, counted with the measured average (not 28)', async () => {
    periods('2026-08-01', '2026-09-02', '2026-10-04') // 32-day cycles → expected Nov 5 → 4 days late
    await generateCycleNotifications(USER)
    const late = inserted.find((n) => n.data?.dedupeKey === 'cycle_late')
    expect(late?.data.lateDays).toBe(4)
    // While late there is no new cycle: no invented ovulation / fertile window.
    expect(inserted.some((n) => /ovulation|fertile/.test(String(n.data?.dedupeKey)))).toBe(false)
  })
  it('uses the declared cycle length from settings', async () => {
    useCycleSettingsStore.setState({ cycleLength: 34 })
    periods('2026-10-21') // day 20 of 34, luteal 14 → ovulation day 20
    await generateCycleNotifications(USER)
    expect(inserted.some((n) => String(n.data?.dedupeKey).startsWith('cycle_ovulation_'))).toBe(true)
  })
  it('leaves "period soon" to the local reminder (no duplicate)', async () => {
    periods('2026-10-13') // 28-day cycle → period tomorrow
    await generateCycleNotifications(USER)
    expect(inserted.some((n) => String(n.data?.dedupeKey).startsWith('cycle_period_soon'))).toBe(false)
  })
})
