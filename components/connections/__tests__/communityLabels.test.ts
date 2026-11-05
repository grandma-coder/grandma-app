import { translations } from '../../../lib/i18n'
import { en } from '../../../lib/i18n/en'
import {
  anonHandleLabel,
  channelCategoryLabel,
  channelDisplayDesc,
  channelDisplayName,
  circleDisplayDesc,
  circleDisplayName,
  villageCategoryLabel,
} from '../communityLabels'

// Seeded community content is stored in English; these helpers swap it for the
// reader's language. Every key they can produce must exist in every locale.
const PREFIXES = ['comm_', 'village_cat_', 'channelScreen_system', 'channelCreate_category_']
const keys = (Object.keys(en) as (keyof typeof en)[]).filter((k) => PREFIXES.some((p) => k.startsWith(p)))
const params = (s: string): string => (s.match(/\{\{\w+\}\}/g) ?? []).sort().join(',')

describe('communityLabels', () => {
  it('maps seeded channels/circles and keeps user-created ones as typed', () => {
    expect(channelDisplayName('Trying to Conceive')).toBe(en.comm_ch_ttc_name)
    expect(channelDisplayDesc('The Two-Week Wait', 'raw')).toBe(en.comm_ch_twoWeekWait_desc)
    expect(channelDisplayName('My own channel')).toBe('My own channel')
    expect(channelDisplayDesc('My own channel', undefined)).toBeUndefined()
    expect(circleDisplayName('The Trying Years')).toBe(en.comm_circle_tryingYears_name)
    expect(circleDisplayDesc('Custom', null)).toBeNull()
  })

  it('localises anonymous handles, categories', () => {
    expect(anonHandleLabel('Anonymous Owl')).toBe(en.comm_handle_owl)
    expect(anonHandleLabel('Anonymous')).toBe(en.comm_handle_generic)
    expect(anonHandleLabel('Anonymous Unicorn')).toBe('Anonymous Unicorn')
    expect(villageCategoryLabel('Maternity')).toBe(en.village_cat_maternity)
    expect(villageCategoryLabel('Hand-knitted')).toBe('Hand-knitted')
    expect(channelCategoryLabel('fertility')).toBe(en.channelCreate_category_fertility)
    expect(channelCategoryLabel('health')).toBe(en.comm_cat_health)
  })

  it('has the keys', () => {
    expect(keys.length).toBeGreaterThan(60)
  })

  for (const [lang, table] of Object.entries(translations)) {
    it(`${lang}: every community label exists with the same params`, () => {
      for (const k of keys) {
        const v = (table as unknown as Record<string, string>)[k]
        expect(typeof v).toBe('string')
        expect(v.length).toBeGreaterThan(0)
        expect(params(v)).toBe(params(String(en[k])))
      }
    })
  }
})
