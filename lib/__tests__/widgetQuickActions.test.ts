import { buildQuickActions } from '../widgets/quickActions'
import type { WidgetSnapshot } from '../widgets/types'

const snap = (over: Partial<WidgetSnapshot> = {}): WidgetSnapshot => ({
  version: 1, signedIn: true, generatedAt: '', activeKey: 'kids:c1', lang: 'en',
  strings: { signIn: '', pickChild: '', refresh: '', start: { cycle: '', pregnancy: '', kids: '', menopause: '' },
    phases: { m: '', f: '', o: '', l: '' }, styles: { journey: '', cream: '', dark: '' } },
  entries: [{
    key: 'kids:c1', journey: 'kids', name: 'Leo', state: 'ok', days: [], todayFor: '', stats: [], openUrl: 'grandma-app://log/kids/home?child=c1',
    buttons: ['feeding', 'sleep', 'diaper', 'mood'].map((t) => ({ type: t, label: t, sticker: 'star', url: `grandma-app://log/kids/${t}?child=c1` })),
    choices: [],
  }],
  ...over,
})

describe('buildQuickActions', () => {
  it('four logs for the active entry plus the calendar', () => {
    const a = buildQuickActions(snap(), 'Calendar')
    expect(a).toHaveLength(5)
    expect(a[0]).toMatchObject({ title: 'feeding', params: { href: '/log/kids/feeding?child=c1' } })
    expect(a[4]).toMatchObject({ title: 'Calendar', params: { href: '/(tabs)/agenda' } })
  })
  it('signed out or no active entry: no shortcuts', () => {
    expect(buildQuickActions(snap({ signedIn: false }), 'Calendar')).toEqual([])
    expect(buildQuickActions(snap({ activeKey: 'menopause' }), 'Calendar')).toEqual([])
  })
})
