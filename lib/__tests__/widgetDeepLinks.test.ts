import { buildLogUrl, buildHomeUrl, parseWidgetLink, WIDGET_BUTTONS } from '../widgets/deepLinks'

describe('widget deep links', () => {
  it('round-trips a kids log link', () => {
    expect(buildLogUrl('kids', 'feeding', 'c1')).toBe('grandma-app://log/kids/feeding?child=c1')
    expect(parseWidgetLink('kids', 'feeding', 'c1')).toEqual({ journey: 'kids', mode: 'kids', type: 'feeding', childId: 'c1' })
  })
  it('maps cycle to the pre-pregnancy mode', () => {
    expect(parseWidgetLink('cycle', 'basal_temp')?.mode).toBe('pre-pregnancy')
  })
  it('home link has type "home" and parses to type null', () => {
    expect(buildHomeUrl('pregnancy')).toBe('grandma-app://log/pregnancy/home')
    expect(parseWidgetLink('pregnancy', 'home')?.type).toBeNull()
  })
  it('rejects unknown journeys and types', () => {
    expect(parseWidgetLink('garage', 'mood')).toBeNull()
    expect(parseWidgetLink('cycle', 'drop table')).toBeNull()
  })
  it('buttons match the spec', () => {
    expect(WIDGET_BUTTONS.cycle.map((b) => b.type)).toEqual(['period_start', 'symptom', 'mood', 'basal_temp'])
    expect(WIDGET_BUTTONS.pregnancy.map((b) => b.type)).toEqual(['mood', 'symptom', 'kick_count', 'water'])
    expect(WIDGET_BUTTONS.kids.map((b) => b.type)).toEqual(['feeding', 'sleep', 'diaper', 'mood'])
    expect(WIDGET_BUTTONS.menopause.map((b) => b.type)).toEqual(['hot_flash', 'night_sweat', 'sleep', 'low_mood'])
  })
})
