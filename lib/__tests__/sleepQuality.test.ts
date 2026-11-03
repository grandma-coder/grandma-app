import { normalizeSleepQuality } from '../sleepQuality'
import { translations } from '../i18n'

describe('normalizeSleepQuality', () => {
  it('reads the stable ids in any case', () => {
    expect(normalizeSleepQuality('great')).toBe('great')
    expect(normalizeSleepQuality('Poor')).toBe('poor')
  })

  it('reads labels stored by older builds in any locale', () => {
    for (const lang of Object.values(translations)) {
      expect(normalizeSleepQuality(lang.kids_logForm_sleepQualityGreat)).toBe('great')
      expect(normalizeSleepQuality(lang.kids_logForm_sleepQualityRestless)).toBe('restless')
    }
  })

  it('returns null for anything else', () => {
    expect(normalizeSleepQuality('')).toBeNull()
    expect(normalizeSleepQuality(undefined)).toBeNull()
    expect(normalizeSleepQuality('meh')).toBeNull()
  })
})
