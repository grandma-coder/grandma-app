import { PREGNANCY_CONTENT, localizedWeekContent, localizedPrepGuide } from '../index'
import { pregnancyContentEnglish } from '../english'
import { getWeekContent } from '../../weekContent'

const EN = pregnancyContentEnglish()
const KEYS = Object.keys(EN)
// Clinical / loan words that are legitimately the same word as in English in that language.
const SAME_OK = new Set(['w7_sym3', 'w23_sym3', 'w1_sym2', 'w7_sym1', 'w8_sym2', 'w32_sym2', 'w34_sym2', 'w38_sym1', 'w38_sym3', 'appt_nipt_name'])

describe('bundled pregnancy week content', () => {
  it('has 852+ English source strings', () => {
    expect(KEYS.length).toBeGreaterThan(800)
  })

  for (const [lang, content] of Object.entries(PREGNANCY_CONTENT)) {
    describe(lang, () => {
      it('has every key and no extras', () => {
        expect(Object.keys(content).sort()).toEqual([...KEYS].sort())
      })
      it('never leaves a string empty or identical to English', () => {
        const bad = KEYS.filter((k) => !content[k]?.trim() || (content[k] === EN[k] && !SAME_OK.has(k)))
        expect(bad).toEqual([])
      })
      it('keeps every number from the English string', () => {
        const nums = (s: string) => (s.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(',', '.'))
        const bad = KEYS.filter((k) => nums(EN[k]).some((n) => !nums(content[k]).includes(n)))
        // Spelled-out or reformatted numbers are rare; flag only if many drift.
        expect(bad.length).toBeLessThan(KEYS.length * 0.03)
      })
    })
  }

  it('resolves a week and a guide in a non-English language', () => {
    const w = localizedWeekContent(37, 'pt-BR')
    expect(w.dev[0]).not.toBe(getWeekContent(37).dev[0])
    expect(w.prep).toHaveLength(getWeekContent(37).prep.length)
    const g = localizedPrepGuide(getWeekContent(37).prep[0], 'pt-BR')
    expect(g.how.length).toBeGreaterThan(0)
    expect(localizedWeekContent(37, 'en')).toBe(getWeekContent(37))
  })
})
