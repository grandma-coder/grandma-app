// Every health claim on the cycle pillar screens shows where it comes from (App Store 1.4.1).
// Sources must resolve, be https, and every tip in the health pillars must cite at least one.
import { prePregPillars } from '../prePregPillars'
import { MEDICAL_SOURCES, MEDICAL_SOURCE_LIST, pillarSources, resolveSources } from '../medicalSources'

/** Pillars where every tip makes a health claim. */
const HEALTH_PILLARS = ['fertility', 'nutrition-prep', 'health-checkups']

/** Mixed pillars: these tips make a health claim and must be sourced; the rest are life advice. */
const HEALTH_TIPS: Record<string, string[]> = {
  'emotional-readiness': ['It\'s a journey', 'Manage stress', 'Sleep is fertility', 'Lower the stakes of one test'],
  'partner-journey': ['Both get checked', 'Lifestyle together', 'Mind the heat', 'Sperm-friendly habits'],
}

/** Country-specific bodies are off-limits — the app ships worldwide. */
const COUNTRY_SPECIFIC = /febrasgo|saude\.gov\.br|gov\.br\//i

const cited = prePregPillars.flatMap((p) => [...(p.introSources ?? []), ...p.tips.flatMap((t) => t.sources ?? [])])

it('registry ids are unique and complete', () => {
  expect(new Set(MEDICAL_SOURCE_LIST.map((s) => s.id)).size).toBe(MEDICAL_SOURCE_LIST.length)
  for (const s of MEDICAL_SOURCE_LIST) {
    expect({ id: s.id, org: !!s.org.trim(), title: !!s.title.trim() }).toEqual({ id: s.id, org: true, title: true })
    if (s.year !== undefined) expect(s.year).toBeGreaterThan(1990)
  }
})

it('every URL is https and international', () => {
  for (const s of MEDICAL_SOURCE_LIST) {
    expect({ id: s.id, https: /^https:\/\/[^\s]+$/.test(s.url) }).toEqual({ id: s.id, https: true })
    expect({ id: s.id, intl: !COUNTRY_SPECIFIC.test(s.url) }).toEqual({ id: s.id, intl: true })
  }
})

it('every referenced source id exists', () => {
  for (const id of cited) expect({ id, known: id in MEDICAL_SOURCES }).toEqual({ id, known: true })
})

it('every registry entry is cited somewhere (no dead sources)', () => {
  const used = new Set(cited)
  for (const s of MEDICAL_SOURCE_LIST) expect({ id: s.id, used: used.has(s.id) }).toEqual({ id: s.id, used: true })
})

it.each(HEALTH_PILLARS)('every tip in %s has at least one source', (id) => {
  const pillar = prePregPillars.find((p) => p.id === id)!
  expect(pillar).toBeDefined()
  expect(pillar.introSources?.length ?? 0).toBeGreaterThan(0)
  for (const tip of pillar.tips) expect({ tip: tip.label, n: (tip.sources?.length ?? 0) > 0 }).toEqual({ tip: tip.label, n: true })
})

it.each(Object.keys(HEALTH_TIPS))('health-claim tips in %s are sourced', (id) => {
  const pillar = prePregPillars.find((p) => p.id === id)!
  for (const label of HEALTH_TIPS[id]) {
    const tip = pillar.tips.find((t) => t.label === label)
    expect({ label, found: !!tip, n: (tip?.sources?.length ?? 0) > 0 }).toEqual({ label, found: true, n: true })
  }
})

it('financial planning cites nothing (no health claims)', () => {
  expect(pillarSources(prePregPillars.find((p) => p.id === 'financial-planning')!)).toEqual([])
})

it('resolveSources keeps order, drops unknown ids and duplicates', () => {
  expect(resolveSources(['cdc-folic-acid', 'nope', 'cdc-folic-acid', 'who-folic-acid']).map((s) => s.id))
    .toEqual(['cdc-folic-acid', 'who-folic-acid'])
  expect(resolveSources(undefined)).toEqual([])
})
