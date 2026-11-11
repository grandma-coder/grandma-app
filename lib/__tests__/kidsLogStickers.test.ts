import { KIDS_LOG_STICKER } from '../logStickers'
import { KIDS_QUICK_LOGS } from '../kidsQuickLogs'
import { en } from '../i18n/en'
import { ptBR as pt } from '../i18n/pt-BR'
import { localizeAgeLabel } from '../vaccineSchedule'
import { VACCINE_SCHEDULES } from '../vaccineSchedule'

describe('kids log stickers', () => {
  it('every quick log has a sticker and no two log types share one', () => {
    const stickers = KIDS_QUICK_LOGS.map((q) => KIDS_LOG_STICKER[q.logType])
    expect(stickers.every(Boolean)).toBe(true)
    expect(new Set(stickers).size).toBe(stickers.length)
  })

  it('quick-log key and sheet id resolve to the same sticker', () => {
    for (const q of KIDS_QUICK_LOGS) expect(KIDS_LOG_STICKER[q.key]).toBe(KIDS_LOG_STICKER[q.logType])
  })

  it('stored child_logs types resolve to their canonical sticker', () => {
    expect(KIDS_LOG_STICKER.photo).toBe(KIDS_LOG_STICKER.memory)
    expect(KIDS_LOG_STICKER.temperature).toBe('thermo')
    expect(KIDS_LOG_STICKER.health).not.toBe(KIDS_LOG_STICKER.temperature)
    expect(KIDS_LOG_STICKER.food).not.toBe(KIDS_LOG_STICKER.feeding)
    expect(KIDS_LOG_STICKER.potty).not.toBe(KIDS_LOG_STICKER.diaper)
  })
})

describe('kids quick-log short labels', () => {
  it('every chip has a short label key that exists and is short', () => {
    for (const q of KIDS_QUICK_LOGS) {
      expect(q.shortKey in en).toBe(true)
      expect((en as unknown as Record<string, string>)[q.shortKey].length).toBeLessThanOrEqual(10)
      expect((pt as unknown as Record<string, string>)[q.shortKey].length).toBeLessThanOrEqual(12)
    }
  })
})

describe('vaccine age labels', () => {
  it('maps every source shape onto the translated phrases', () => {
    expect(localizeAgeLabel('Nacimiento')).toBe(en.kids_vac_birth)
    expect(localizeAgeLabel('12-15 months')).toBe('12-15 months')
    expect(localizeAgeLabel('2 meses')).toBe('2 months')
    expect(localizeAgeLabel('4-6 yrs')).toBe('4-6 years')
    expect(localizeAgeLabel('6 mois (annuel)')).toBe('6 months (yearly)')
    expect(localizeAgeLabel('12 meses (reforço)')).toBe('12 months (booster)')
    expect(localizeAgeLabel('3 years 4 months')).toBe('3 years 4 months')
    expect(localizeAgeLabel('1 year')).toBe('1 year')
  })

  it('no schedule age string falls through unparsed', () => {
    const unparsed: string[] = []
    for (const list of Object.values(VACCINE_SCHEDULES)) {
      for (const v of list) for (const a of v.ages) {
        // Parsed output is always English here; an unparsed string would keep a foreign unit.
        if (/\b(meses|mois|anos|años|ans|Monate|mesi)\b/i.test(localizeAgeLabel(a))) unparsed.push(a)
      }
    }
    expect(unparsed).toEqual([])
  })
})

import { vaccineValueMatches } from '../vaccineSchedule'

describe('vaccineValueMatches', () => {
  it('counts a dose marked as given with its dose label', () => {
    expect(vaccineValueMatches('DTaP - dose 2', 'DTaP')).toBe(true)
    expect(vaccineValueMatches('DTaP - dose 2', 'DTaP')).toBe(true)
    expect(vaccineValueMatches('dtap', 'DTaP')).toBe(true)
  })
  it('never matches a different vaccine with a shared prefix', () => {
    expect(vaccineValueMatches('Hepatitis A - dose 1', 'Hepatitis B')).toBe(false)
    expect(vaccineValueMatches('DTaP/IPV/Hib - dose 1', 'DTaP')).toBe(false)
  })
})
