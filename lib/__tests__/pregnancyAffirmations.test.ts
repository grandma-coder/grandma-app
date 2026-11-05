import { pregnancyAffirmations, getDailyAffirmation } from '../pregnancyAffirmations'
import { PREGNANCY_AFFIRMATIONS_I18N } from '../pregnancyAffirmationsContent'

describe('pregnancy affirmations are bundled in every language', () => {
  it('covers the 11 non-English languages', () => {
    expect(Object.keys(PREGNANCY_AFFIRMATIONS_I18N)).toHaveLength(11)
  })
  for (const [lang, list] of Object.entries(PREGNANCY_AFFIRMATIONS_I18N)) {
    it(`${lang}: one non-empty, non-English line per English affirmation`, () => {
      expect(list).toHaveLength(pregnancyAffirmations.length)
      list.forEach((line, i) => {
        expect(line.trim()).not.toBe('')
        expect(line).not.toBe(pregnancyAffirmations[i])
      })
      expect(new Set(list).size).toBe(list.length)
    })
  }
  it('getDailyAffirmation returns the localized line', () => {
    expect(getDailyAffirmation('pt-BR')).not.toBe(getDailyAffirmation('en'))
  })
})
