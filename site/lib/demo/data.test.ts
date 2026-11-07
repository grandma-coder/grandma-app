import { describe, it, expect } from 'vitest'
import { PATHS } from '@/components/stickers/paths'
import { MODES } from '@/lib/modes'
import { getDemoData, fmt } from './index'
import { dataEn } from './data.en'
import { dataPt } from './data.pt'
import { forGoal, type DemoData, type Goal, type OptKey } from './types'

const GOALS: Goal[] = ['track', 'ttc']

/** Expand goal-dependent values into `{ track, ttc }` so both branches get compared. */
const expand = (v: unknown): unknown => (typeof v === 'function' ? { __goal: GOALS.map((g) => (v as (g: Goal) => unknown)(g)) } : v)

/** Structural fingerprint: object keys, array lengths, primitive kinds. Strings, numbers and booleans carry no content here. */
const shape = (v: unknown): unknown => {
  v = expand(v)
  if (Array.isArray(v)) return v.map(shape)
  if (v === null) return 'null'
  if (typeof v === 'object') return Object.fromEntries(Object.entries(v as object).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, shape(x)]))
  return typeof v
}

/** Every [path, value] under keys whose name is `icon` / `icons`, plus `optIcons` and `rangeVis`. */
const iconRefs = (v: unknown, path = ''): [string, string][] => {
  v = expand(v)
  if (Array.isArray(v)) return v.flatMap((x, i) => iconRefs(x, `${path}[${i}]`))
  if (v && typeof v === 'object') {
    return Object.entries(v as object).flatMap(([k, x]) => {
      const p = path ? `${path}.${k}` : k
      if ((k === 'icon' || k === 'icons') && typeof x === 'string') return [[p, x] as [string, string]]
      if (k === 'optIcons') return Object.entries(x as Record<string, string[]>).flatMap(([id, arr]) => arr.map((a, i): [string, string] => [`${p}.${id}[${i}]`, a]))
      if (k === 'rangeVis') return Object.entries(x as Record<string, { icon: string }>).map(([id, r]): [string, string] => [`${p}.${id}`, r.icon])
      return iconRefs(x, p)
    })
  }
  return []
}

const strings = (v: unknown, path = ''): [string, string][] => {
  v = expand(v)
  if (typeof v === 'string') return [[path, v]]
  if (Array.isArray(v)) return v.flatMap((x, i) => strings(x, `${path}[${i}]`))
  if (v && typeof v === 'object') return Object.entries(v as object).flatMap(([k, x]) => strings(x, path ? `${path}.${k}` : k))
  return []
}

const locales: [string, DemoData][] = [['pt', dataPt], ['en', dataEn]]

/** Strings under these keys are ids, colours, icons or enum values and must match across locales; every other string is display text. */
const NEUTRAL = new Set(['id', 'icon', 'icons', 'kind', 'tone', 'accent', 'dot', 'color', 'ring', 'badge', 'status', 'flag', 'how', 't', 'screen', 'mode', 'kid', 'year', 'u', 'p'])
const neutral = (v: unknown, key = ''): unknown => {
  v = expand(v)
  if (typeof v === 'string') return NEUTRAL.has(key) || key.includes(':') ? v : '#'
  if (Array.isArray(v)) return v.map((x) => neutral(x, key))
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v as object).map(([k, x]) => [k, neutral(x, k)]))
  return v
}

describe('demo seed data', () => {
  it('en and pt agree on every language-neutral field (ids, numbers, booleans, colours, icons, kinds)', () => {
    expect(neutral(dataEn)).toEqual(neutral(dataPt))
  })

  it('en and pt share the exact same structure and array lengths', () => {
    expect(shape(dataEn)).toEqual(shape(dataPt))
  })

  it('getDemoData picks the right module', () => {
    expect(getDemoData('pt')).toBe(dataPt)
    expect(getDemoData('en')).toBe(dataEn)
    expect(dataPt.locale).toBe('pt')
    expect(dataEn.locale).toBe('en')
  })

  it('has all four phases and the same kids', () => {
    for (const [, d] of locales) {
      expect(Object.keys(d.phases).sort()).toEqual([...MODES].sort())
      expect(Object.keys(d.kids).sort()).toEqual(['kenji', 'lua'])
    }
    expect(dataEn.kids.kenji.name).toBe('Kenji')
    expect(dataEn.kids.lua.name).toBe('Lua')
    expect(dataEn.ui.user).toBe('Amara')
  })

  it.each(locales)('%s: every icon name exists in the sticker set', (_, d) => {
    const refs = iconRefs(d)
    expect(refs.length).toBeGreaterThan(100)
    expect(refs.filter(([, n]) => !(n in PATHS))).toEqual([])
  })

  it.each(locales)('%s: ids stay consistent across the data', (_, d) => {
    const kids = new Set(Object.keys(d.kids))
    const screens = new Set(Object.keys(d.ui.screens))
    for (const m of MODES) {
      for (const goal of GOALS) {
        const p = d.phases[m]
        for (const x of [...p.today, ...p.events, ...p.mem]) if (x.kid) expect(kids.has(x.kid)).toBe(true)
        for (const q of forGoal(p.quick, goal)) expect(screens.has(q.screen)).toBe(true)
        for (const c of forGoal(p.chans, goal)) expect(d.msgs[c.id], `msgs for ${c.id}`).toBeDefined()
        for (const chip of forGoal(p.chips, goal)) {
          if (chip.cfg.t === 'pick') for (const o of chip.cfg.options) expect(d.optIcons[`${chip.id}:${o.id}` as OptKey], `optIcons ${chip.id}:${o.id}`).toBeDefined()
          if (chip.cfg.t === 'range' && d.rangeVis[chip.id]) expect(['grow', 'count']).toContain(d.rangeVis[chip.id]!.how)
        }
      }
    }
    for (const f of d.feats) if ('screen' in f.action) expect(screens.has(f.action.screen)).toBe(true)
    for (const s of [...d.ui.profile.items, ...d.ui.shortcuts.items]) expect(screens.has(s.screen)).toBe(true)
  })

  it('pre phase changes with the goal; other phases are plain values', () => {
    for (const d of [dataPt, dataEn]) {
      const pre = d.phases.pre
      expect(typeof pre.hero).toBe('function')
      expect(forGoal(pre.hero!, 'track')).not.toEqual(forGoal(pre.hero!, 'ttc'))
      expect(forGoal(pre.chips, 'track').map((c) => c.id)).not.toEqual(forGoal(pre.chips, 'ttc').map((c) => c.id))
      expect(forGoal(pre.quick, 'track')).not.toEqual(forGoal(pre.quick, 'ttc'))
      expect(forGoal(pre.chans, 'track')).not.toEqual(forGoal(pre.chans, 'ttc'))
      for (const m of ['preg', 'kids', 'meno'] as const) {
        expect(typeof d.phases[m].chips).not.toBe('function')
        expect(typeof d.phases[m].quick).not.toBe('function')
        expect(typeof d.phases[m].chans).not.toBe('function')
      }
    }
  })

  it('pregnancy fruit table runs weeks 8 to 40', () => {
    for (const d of [dataPt, dataEn]) expect(d.weeks.map((w) => w.week)).toEqual([8, 12, 16, 20, 24, 28, 32, 36, 40])
    expect(dataEn.weeks.map((w) => w.name.replace(/^an? (head of |ear of )?/, ''))).toEqual(
      ['raspberry', 'plum', 'avocado', 'banana', 'corn', 'eggplant', 'jicama', 'romaine lettuce', 'pumpkin'],
    )
  })

  it('en copy is English: no PT leftovers, CDC instead of PNI, no BRL', () => {
    const all = strings(dataEn).map(([, s]) => s).join('\n')
    expect(all).not.toMatch(/PNI|R\$|calendário|Bem-vinda|vovó/i)
    expect(all).toMatch(/CDC schedule/)
    // decimals use a dot, not a comma, in numbers like 1.6 cm
    expect(all).not.toMatch(/\d,\d+ ?(cm|kg|g|°C|ng|mg)/)
    expect(dataEn.ui.decimal).toBe('.')
    expect(dataPt.ui.decimal).toBe(',')
  })

  it('no country-order copy anywhere in the seed data', () => {
    for (const [, d] of locales) expect(strings(d).filter(([, s]) => /brasil|brazil|first in|primeiro no/i.test(s))).toEqual([])
  })

  it('no empty display strings except exam ranges and the optional row labels', () => {
    for (const [, d] of locales) {
      const empties = strings(d).filter(([p, s]) => !s.trim() && !/\.range$/.test(p))
      expect(empties).toEqual([])
    }
  })

  it('fmt substitutes {tokens} and leaves unknown ones', () => {
    expect(fmt('Olá, {name}.', { name: 'Amara' })).toBe('Olá, Amara.')
    expect(fmt('{n} de {total}', { n: 2, total: 5 })).toBe('2 de 5')
    expect(fmt('keep {this}', {})).toBe('keep {this}')
  })
})

describe('cycle numbers agree (28-day cycle)', () => {
  it.each([['en', dataEn], ['pt', dataPt]] as const)('%s: cycle day, next period, calendar and wheel line up', (_l, d) => {
    const pre = d.phases.pre
    const { year, month, day } = d.demoDate
    // the calendar's first period day is cycle day 1
    const cycleDay = day - pre.cal.per[0] + 1
    for (const g of GOALS) expect(forGoal(pre.hero!, g).n).toBe(String(cycleDay))
    const daysLeft = 28 - cycleDay + 1
    const next = new Date(Date.UTC(year, month - 1, day + daysLeft))
    const nextDay = String(next.getUTCDate())
    const track = forGoal(pre.hero!, 'track')
    expect(track.row[0].value).toContain(String(daysLeft))
    expect(track.row[1].value).toContain('28')
    expect(forGoal(pre.hero!, 'ttc').row[1].value).toContain(nextDay)
    const predicted = pre.events.find((e) => e.icon === 'moon')!
    expect(predicted.when).toContain(nextDay)
    expect(forGoal(pre.quick, 'track').find((q) => q.screen === 'reminders')!.sub).toContain(String(daysLeft))
    // today is the fertile peak the calendar stars
    expect(pre.cal.star).toBe(day)
  })
})
