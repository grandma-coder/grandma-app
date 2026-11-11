import {
  ALL_MENOPAUSE_SYMPTOMS,
  menopauseSymptomLabel,
  resolveMenopauseSymptomId,
} from '../menopauseSymptoms'

describe('menopauseSymptoms', () => {
  it('lists 13 curated symptoms across 5 groups', () => {
    expect(ALL_MENOPAUSE_SYMPTOMS).toHaveLength(13)
    expect(new Set(ALL_MENOPAUSE_SYMPTOMS.map((s) => s.group)).size).toBe(5)
  })
  it('labels an id', () => {
    expect(menopauseSymptomLabel('hot_flash')).toBe('Hot flashes')
  })
  it('resolves id, label, and spacing/case variants', () => {
    expect(resolveMenopauseSymptomId('hot_flash')).toBe('hot_flash')
    expect(resolveMenopauseSymptomId('Hot flashes')).toBe('hot_flash')
    expect(resolveMenopauseSymptomId('night sweats')).toBe('night_sweat')
    expect(resolveMenopauseSymptomId('totally unknown')).toBeNull()
  })
})

describe('seedMenopauseQuickLog — onboarding picks become the home dock pins', () => {
  const { seedMenopauseQuickLog, MENOPAUSE_QUICK_LOG_MAX } = require('../menopauseSymptoms') as typeof import('../menopauseSymptoms')
  const DEFAULTS = ['hot_flash', 'night_sweat', 'sleep']
  it('no picks keep the defaults', () => {
    expect(seedMenopauseQuickLog([], DEFAULTS)).toEqual(DEFAULTS)
  })
  it('picks replace the defaults, in catalog order, without duplicates or unknown ids', () => {
    expect(seedMenopauseQuickLog(['brain_fog', 'hot_flash', 'hot_flash', 'nope'] as never, DEFAULTS)).toEqual(['hot_flash', 'brain_fog'])
  })
  it('never more than the dock holds', () => {
    const all = ['hot_flash', 'night_sweat', 'sleep', 'fatigue', 'low_mood', 'anxiety', 'brain_fog', 'joint_pain', 'headache', 'palpitations', 'weight', 'vaginal_dryness', 'libido']
    expect(seedMenopauseQuickLog(all as never, DEFAULTS)).toHaveLength(MENOPAUSE_QUICK_LOG_MAX)
    expect(MENOPAUSE_QUICK_LOG_MAX).toBe(8)
  })
})
