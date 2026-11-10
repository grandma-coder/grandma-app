import { resolveEntry } from '../../widgets/android/resolve'

const base = {
  version: 1, signedIn: true, generatedAt: '', activeKey: 'cycle',
  strings: { signIn: 'Sign in to Grandma', pickChild: 'Pick a child', refresh: 'Open Grandma to refresh', start: { cycle: 's-c', pregnancy: 's-p', kids: 's-k', menopause: 's-m' } },
  entries: [
    { key: 'cycle', journey: 'cycle', name: 'Cycle', state: 'ok', todayFor: '2026-11-09', openUrl: '', buttons: [],
      days: [{ date: '2026-11-09', title: 'Day 10', subtitle: '' }, { date: '2026-11-10', title: 'Day 11', subtitle: '' }],
      stats: [{ label: 'Logged today', value: '3', daily: true }, { label: 'Next period', value: 'Nov 28', daily: false }],
      series: { label: 'Mood', kind: 'moods', values: [1, 2, 3, 4, 5, 4, 3] } },
    { key: 'kids:c1', journey: 'kids', name: 'Leo', state: 'ok', todayFor: '2026-11-09', openUrl: '', buttons: [], days: [], stats: [] },
  ],
}
const json = (o: object = base) => JSON.stringify(o)

describe('resolveEntry (Android widget)', () => {
  it('no snapshot is signed out', () => expect(resolveEntry(null, null, '2026-11-09')).toEqual({ kind: 'message', text: 'Sign in to Grandma' }))
  it('signed-out snapshot uses its own string', () => {
    expect(resolveEntry(json({ ...base, signedIn: false }), null, '2026-11-09')).toEqual({ kind: 'message', text: 'Sign in to Grandma' })
  })
  it('newer snapshot version asks to refresh', () => {
    expect(resolveEntry(json({ ...base, version: 2 }), null, '2026-11-09')).toMatchObject({ kind: 'message', text: 'Open Grandma to refresh' })
  })
  it('garbage is signed out, not a crash', () => expect(resolveEntry('{nope', null, '2026-11-09').kind).toBe('message'))
  it('a removed child asks to pick a child', () => {
    expect(resolveEntry(json(), 'kids:gone', '2026-11-09')).toEqual({ kind: 'message', text: 'Pick a child', url: 'grandma-app://log/kids/home' })
  })
  it('a journey no longer enrolled asks to start it', () => {
    expect(resolveEntry(json(), 'menopause', '2026-11-09')).toEqual({ kind: 'message', text: 's-m', url: 'grandma-app://log/menopause/home' })
  })
  it('past the precomputed days it asks to open the app instead of freezing', () => {
    expect(resolveEntry(json(), 'cycle', '2026-11-30')).toMatchObject({ kind: 'message', text: 'Open Grandma to refresh' })
  })
  it('no choice follows activeKey', () => {
    const r = resolveEntry(json(), null, '2026-11-09')
    expect(r.kind === 'ok' && r.entry.key).toBe('cycle')
  })
  it('picks today and zeroes daily stats once stale', () => {
    const r = resolveEntry(json(), 'cycle', '2026-11-10')
    if (r.kind !== 'ok') throw new Error('expected ok')
    expect(r.day?.title).toBe('Day 11')
    expect(r.stats).toEqual([{ label: 'Logged today', value: '0' }, { label: 'Next period', value: 'Nov 28' }])
    expect(r.series).toEqual([2, 3, 4, 5, 4, 3, 0])
  })
})

import { sizeFor, sinceText } from '../../widgets/android/GrandmaWidget'

describe('Android widget layout helpers', () => {
  it('picks a layout from the widget size in dp', () => {
    expect(sizeFor(150, 150)).toBe('small')
    expect(sizeFor(320, 150)).toBe('medium')
    expect(sizeFor(320, 340)).toBe('large')
  })
  it('formats time since the last feed', () => {
    const now = new Date('2026-11-09T10:00:00Z')
    expect(sinceText('2026-11-09T09:25:00Z', now)).toBe('35m')
    expect(sinceText('2026-11-09T08:00:00Z', now)).toBe('2h')
    expect(sinceText('2026-11-06T10:00:00Z', now)).toBe('3d')
  })
})
