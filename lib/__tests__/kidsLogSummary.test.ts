import { kidsLogSummary, kidsLogTitle } from '../kidsLogSummary'
import { translations } from '../i18n'

const pt = translations['pt-BR'] as unknown as Record<string, string>
const tPt = (k: string, p?: Record<string, any>) =>
  (pt[k] ?? k).replace(/\{\{(\w+)\}\}/g, (_, n) => String(p?.[n] ?? ''))

describe('kidsLogSummary', () => {
  it('localizes diaper enums, never raw ids', () => {
    const s = kidsLogSummary(tPt, 'c', 'diaper', JSON.stringify({ diaperType: 'poop', color: 'green', consistency: 'soft' }), null)
    expect(s).toBe([pt.kids_logForm_diaperPoop, pt.kids_logForm_diaperColorGreen, pt.kids_logForm_diaperConsistSoft].join(' · '))
  })
  it('localizes meals, quality and activity types; drops unknown ids', () => {
    expect(kidsLogSummary(tPt, 'c', 'food', JSON.stringify({ meal: 'lunch', quality: 'ate_well' }), null))
      .toBe(`${pt.kids_logForm_mealLunch} · ${pt.kids_logForm_ateWell}`)
    expect(kidsLogSummary(tPt, 'c', 'activity', JSON.stringify({ activityType: 'swim' }), null)).toBe(pt.kids_logForm_activitySwimming)
    expect(kidsLogSummary(tPt, 'c', 'diaper', JSON.stringify({ color: 'mystery' }), null)).toBe('')
  })
  it('breastfeeding side and temperature unit', () => {
    expect(kidsLogSummary(tPt, 'c', 'feeding', JSON.stringify({ feedType: 'breast', side: 'left', duration: 10 }), null))
      .toBe(`${pt.kp_kc_breastfed} · ${pt.kp_kc_left} · 10 min`)
    expect(kidsLogSummary(tPt, 'f', 'temperature', '37', null)).toBe('98.6°F')
    expect(kidsLogSummary(tPt, 'c', 'temperature', JSON.stringify({ value: 37.5 }), null)).toBe('37.5°C')
  })
  it('titles and no raw JSON', () => {
    expect(kidsLogTitle(tPt, 'diaper', null)).toBe(pt.kids_calendar_labelDiaper)
    expect(kidsLogTitle(tPt, 'mood', JSON.stringify({ mood: 'happy' }))).toContain(pt.kids_logForm_moodHappy)
    expect(kidsLogSummary(tPt, 'c', 'health', JSON.stringify({ eventType: 'Injury', description: 'Joelho ralado' }), null)).toBe('Joelho ralado')
  })
})
