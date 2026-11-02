import { translations } from '../i18n'
import { en } from '../i18n/en'

// The note templates in every language stay free of grades, scores and
// normal/abnormal wording, and keep the same {{params}} as English.
const BANNED_ANY = /\bnormal|abnormal|normale|\/10|score|thriv|needs care|needs attention|正常|异常|異常|정상|طبيعي|सामान्य/i
const gnKeys = (Object.keys(en) as (keyof typeof en)[]).filter((k) => k.startsWith('gn_'))
const params = (s: string): string => (s.match(/\{\{\w+\}\}/g) ?? []).sort().join(',')

describe("Grandma's notes i18n", () => {
  it('has the note keys', () => {
    expect(gnKeys.length).toBeGreaterThan(100)
  })

  for (const [lang, table] of Object.entries(translations)) {
    it(`${lang}: no banned words, same params as English`, () => {
      for (const k of gnKeys) {
        const v = table[k]
        expect(typeof v).toBe('string')
        expect(v).not.toMatch(BANNED_ANY)
        expect(params(String(v))).toBe(params(String(en[k])))
      }
    })
  }
})
