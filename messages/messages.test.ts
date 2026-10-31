import { describe, it, expect } from 'vitest'
import en from './en.json'
import pt from './pt.json'

const keys = (o: unknown, p = ''): string[] =>
  typeof o !== 'object' || o === null || Array.isArray(o) ? [p] : Object.entries(o).flatMap(([k, v]) => keys(v, p ? `${p}.${k}` : k))
const strings = (o: unknown, p = ''): [string, string][] =>
  typeof o === 'string' ? [[p, o]] : Array.isArray(o) ? o.flatMap((v, i) => strings(v, `${p}[${i}]`)) : typeof o === 'object' && o ? Object.entries(o).flatMap(([k, v]) => strings(v, p ? `${p}.${k}` : k)) : []
const arrays = (o: unknown, p = ''): [string, number][] =>
  Array.isArray(o) ? [[p, o.length]] : typeof o === 'object' && o ? Object.entries(o).flatMap(([k, v]) => arrays(v, p ? `${p}.${k}` : k)) : []

describe('messages', () => {
  it('same keys in en and pt', () => {
    const e = new Set(keys(en)), p = new Set(keys(pt))
    expect([...e].filter((k) => !p.has(k)), 'missing in pt').toEqual([])
    expect([...p].filter((k) => !e.has(k)), 'missing in en').toEqual([])
  })
  it('no empty strings', () => expect([...strings(en), ...strings(pt)].filter(([, s]) => !s.trim())).toEqual([]))
  it('same array lengths', () => expect(arrays(pt)).toEqual(arrays(en)))
  it('no prices on the site', () => expect([...strings(en), ...strings(pt)].filter(([, s]) => /\$\s?\d/.test(s))).toEqual([]))
  describe('v3 namespace', () => {
    const v3 = (m: typeof en) => (m as unknown as { v3?: Record<string, Record<string, unknown>> }).v3
    it.each([['en', en], ['pt', pt]] as const)('%s has every v3 group', (_, m) => {
      expect(Object.keys(v3(m) ?? {}).sort()).toEqual(['explore', 'features', 'hero', 'mobile', 'phases', 'pop', 'tabs', 'tour', 'waitlist'])
    })
    it.each([['en', en], ['pt', pt]] as const)('%s rebus carries the three sticker tokens, in order, as [token]', (_, m) => {
      const r = String((v3(m)?.hero as { rebus?: string } | undefined)?.rebus)
      expect(r.match(/\[(\w+)\]/g)).toEqual(['[flower]', '[baby]', '[phone]'])
      expect(r).not.toMatch(/[{}]/)
    })
  })
  it('no country-order copy anywhere (launch is worldwide)', () =>
    expect([...strings(en), ...strings(pt)].filter(([, s]) => /brasil|brazil|then the us|depois os eua|in my country|no meu país/i.test(s))).toEqual([]))
})
