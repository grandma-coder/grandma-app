import { cycleMetaChips, pregnancyMetaChips, childAgeChip, contextLine } from '../pillarMeta'
import { findPillar, pillarNameKey, pillarDescKey, pillarContentKeys } from '../pillarCopy'
import { prePregPillars } from '../prePregPillars'
import { pregnancyPillars } from '../pregnancyPillars'
import { pillars as kidsPillars } from '../pillars'
import { en } from '../i18n/en'
import { ptBR } from '../i18n/pt-BR'

// Minimal translator over a real catalog, so the tests catch missing keys and bad templates.
function makeT(cat: Record<string, string>) {
  return (key: string, params?: Record<string, string | number>) => {
    const raw = cat[key]
    if (raw === undefined) throw new Error(`missing key ${key}`)
    return raw.replace(/\{\{(\w+)\}\}/g, (_, n) => String(params?.[n] ?? `{{${n}}}`))
  }
}
const tPt = makeT(ptBR as unknown as Record<string, string>) as never
const tEn = makeT(en as unknown as Record<string, string>) as never

const luteal = { cycleDay: 16, phaseLabel: 'Fase lútea', daysUntilPeriod: 13, daysUntilOvulation: -2, fertileStart: 9, fertileEnd: 15 }

describe('cycleMetaChips', () => {
  it('composes whole phrases — no duplicated "fase", no leading separator', () => {
    const chips = cycleMetaChips(tPt, 'nutrition-prep', luteal)
    expect(chips).toEqual(['Dia 16 do ciclo', 'Fase lútea', 'Menstruação em 13 dias'])
    for (const c of chips) {
      expect(c.startsWith('·')).toBe(false)
      expect(c).not.toMatch(/\{\{/)
    }
  })

  it('uses the singular form for 1', () => {
    expect(cycleMetaChips(tEn, 'nutrition-prep', { ...luteal, daysUntilPeriod: 1 })[2]).toBe('Period in 1 day')
  })

  it('fertility shows ovulation timing and the fertile window', () => {
    expect(cycleMetaChips(tEn, 'fertility', luteal)).toEqual(['Cycle day 16', '2 days since ovulation', 'Fertile window: days 9–15'])
    expect(cycleMetaChips(tEn, 'fertility', { ...luteal, daysUntilOvulation: 0 })[1]).toBe('Ovulation likely today')
    expect(cycleMetaChips(tEn, 'fertility', { ...luteal, daysUntilOvulation: 3 })[1]).toBe('Ovulation in 3 days')
  })
})

describe('pregnancy / kids chips', () => {
  it('pregnancy: week, water (nutrition only), days to go', () => {
    expect(pregnancyMetaChips(tEn, 'pregnancy-nutrition', { week: 20, daysToGo: 140, water: 1 })).toEqual(['Week 20', '1 glass of water today', '140 days to go'])
    expect(pregnancyMetaChips(tEn, 'baby-gear', { week: 20, daysToGo: 0, water: 3 })).toEqual(['Week 20'])
  })
  it('child age switches from months to years at 24 months', () => {
    expect(childAgeChip(tPt, 1)).toBe('1 mês')
    expect(childAgeChip(tPt, 14)).toBe('14 meses')
    expect(childAgeChip(tPt, 30)).toBe('2 anos')
    expect(childAgeChip(tPt, null)).toBeNull()
  })
  it('context line is localized per journey', () => {
    expect(contextLine(tPt, 'pre-pregnancy', { cyclePhase: 'luteal' })).toBe('Escolhidas para a fase lútea')
    expect(contextLine(tEn, 'pregnancy', { pregnancyWeek: 12 })).toBe('Chosen for week 12')
    expect(contextLine(tEn, 'kids', {})).toBeNull()
  })
})

describe('pillarCopy', () => {
  const all = [...prePregPillars, ...pregnancyPillars, ...kidsPillars]

  it('every pillar has a name + description in every catalog', () => {
    const langs = ['en', 'pt-BR', 'es', 'fr', 'de', 'it', 'ja', 'ko', 'zh', 'ar', 'hi', 'tr']
    for (const lang of langs) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const cat = require(`../i18n/${lang}`)[lang === 'pt-BR' ? 'ptBR' : lang] as Record<string, string>
      for (const p of all) {
        expect(cat[pillarNameKey(p.id)]).toBeTruthy()
        expect(cat[pillarDescKey(p.id)]).toBeTruthy()
      }
    }
  })

  it('finds pillars in every journey and tolerates bad ids', () => {
    expect(findPillar('nutrition-prep')?.journey).toBe('pre-pregnancy')
    expect(findPillar('birth-planning')?.journey).toBe('pregnancy')
    expect(findPillar('milestones')?.journey).toBe('kids')
    expect(findPillar('nope')).toBeUndefined()
    expect(findPillar(undefined)).toBeUndefined()
    expect(findPillar('')).toBeUndefined()
  })

  it('tip translation keys are unique within each pillar', () => {
    for (const p of all) {
      const keys = p.tips.map((tip) => pillarContentKeys.tipBody(p.id, tip.label))
      expect(new Set(keys).size).toBe(keys.length)
    }
  })
})
