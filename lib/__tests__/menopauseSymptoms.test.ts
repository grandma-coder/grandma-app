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
