// Every shipping language must carry every cycle-pillar string (intro, tip titles, tip
// bodies, "ask Grandma" questions), so a non-English user never sees an English word on
// the pillar screen — even offline, before any runtime translation arrives.
import { prePregPillars } from '../../prePregPillars'
import { pillarContentEnglish } from '../english'
import { pillarContentKeys } from '../../pillarCopy'
import { PILLAR_CONTENT, bundledPillarText } from '..'

const CYCLE_IDS = ['fertility', 'nutrition-prep', 'emotional-readiness', 'financial-planning', 'partner-journey', 'health-checkups']

/** English source keyed exactly as the pillar screen asks for it. */
const SOURCE: Record<string, string> = pillarContentEnglish()

/** Strings allowed to stay identical to English (acronym-only text). Keep it short. */
const SAME_AS_ENGLISH_OK = new Set(['MTHFR', 'DHA'])

/** "Normal" about the body is off-limits in the app's voice — in every language. */
const NO_NORMAL: Partial<Record<keyof typeof PILLAR_CONTENT, RegExp>> = {
  'pt-BR': /normal/i, es: /normal/i, fr: /normal/i, de: /normal/i, it: /normal/i, tr: /normal/i,
  ja: /正常|普通/, zh: /正常/, ko: /정상/, hi: /सामान्य|नॉर्मल/, ar: /طبيعي/,
}

const LANGS = Object.keys(PILLAR_CONTENT) as (keyof typeof PILLAR_CONTENT)[]

it('covers exactly the six cycle pillars', () => {
  expect(prePregPillars.map((p) => p.id).sort()).toEqual([...CYCLE_IDS].sort())
  expect(Object.keys(SOURCE).length).toBeGreaterThan(100)
})

describe.each(LANGS)('cycle pillar content: %s', (lang) => {
  const loc = PILLAR_CONTENT[lang]

  it('translates every key, none left in English', () => {
    for (const [key, en] of Object.entries(SOURCE)) {
      const text = loc[key]
      expect({ key, ok: !!text?.trim() }).toEqual({ key, ok: true })
      if (!SAME_AS_ENGLISH_OK.has(en)) expect({ key, same: text === en }).toEqual({ key, same: false })
    }
  })

  it('has no stray keys', () => {
    for (const key of Object.keys(loc)) expect({ key, known: key in SOURCE }).toEqual({ key, known: true })
  })

  it('keeps every number from the English (doses, ranges, ages)', () => {
    for (const [key, en] of Object.entries(SOURCE)) {
      const digits: string[] = loc[key].match(/\d+/g) ?? []
      for (const d of en.match(/\d+/g) ?? []) expect({ key, d, kept: digits.includes(d) }).toEqual({ key, d, kept: true })
    }
  })

  it('never says "normal"', () => {
    const re = NO_NORMAL[lang]
    if (!re) return
    for (const [key, text] of Object.entries(loc)) expect({ key, normal: re.test(text) }).toEqual({ key, normal: false })
  })

  it('resolves bundled text by content key', () => {
    const key = pillarContentKeys.tipLabel('nutrition-prep', 'Start folic acid now')
    expect(bundledPillarText(key, lang)).toBe(loc[key])
    expect(bundledPillarText('pillar_week-by-week_intro', lang)).toBeUndefined()
  })
})

it('English is never bundled (the source is the English copy)', () => {
  expect(bundledPillarText(pillarContentKeys.intro('fertility'), 'en')).toBeUndefined()
})
