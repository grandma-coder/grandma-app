import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { fnv1a } from '../../../lib/i18nHash'
import { diffSet, paramMismatch, readLocaleFile, writeLocaleFile } from '../core'

describe('fnv1a', () => {
  it('is a stable 8-hex hash', () => {
    expect(fnv1a('abc')).toMatch(/^[0-9a-f]{8}$/)
    expect(fnv1a('abc')).toBe(fnv1a('abc'))
    expect(fnv1a('abc')).not.toBe(fnv1a('abd'))
  })
})

describe('diffSet', () => {
  const english = { a: 'One', b: 'Two', c: 'Three' }
  it('flags missing, stale and removed keys', () => {
    const locale = { a: 'Um', b: 'Dois', z: 'Velho' }
    const done = { a: fnv1a('One'), b: fnv1a('Two (old)') }
    const { todo, removed } = diffSet(english, locale, done)
    expect(todo.sort()).toEqual(['b', 'c']) // b stale, c missing
    expect(removed).toEqual(['z'])
  })
  it('is clean when every key matches its hash', () => {
    const done = { a: fnv1a('One'), b: fnv1a('Two'), c: fnv1a('Three') }
    expect(diffSet(english, { a: 'Um', b: 'Dois', c: 'Três' }, done)).toEqual({ todo: [], removed: [] })
  })
})

describe('paramMismatch', () => {
  it('detects renamed or dropped params', () => {
    expect(paramMismatch('Hi {{name}}', 'Olá {{nome}}')).toBe(true)
    expect(paramMismatch('Hi {{name}}', 'Olá')).toBe(true)
    expect(paramMismatch('{{a}} and {{b}}', '{{b}} e {{a}}')).toBe(false)
  })
})

describe('locale file round-trip', () => {
  it('keeps untouched lines, updates, appends and removes', () => {
    const dir = mkdtempSync(join(tmpdir(), 'i18n-'))
    const p = join(dir, 'pt-BR.ts')
    const src = [
      '// header',
      "import type { X } from './types'",
      '',
      'export const ptBR: X = {',
      '  keep: "a \\"q\\" \\n ç",',
      "  single: 'it\\'s',",
      '  change: "old",',
      '  drop: "bye",',
      '  "pillar_a-b": "hífen",',
      '}',
      '',
    ].join('\n')
    writeFileSync(p, src)
    expect(readLocaleFile(p)).toEqual({ keep: 'a "q" \n ç', single: "it's", change: 'old', drop: 'bye', 'pillar_a-b': 'hífen' })
    writeLocaleFile(p, { change: 'novo', added: 'olá "x"', 'pillar_a-b': 'traço' }, ['drop'])
    const out = readFileSync(p, 'utf8')
    expect(out).toContain('  keep: "a \\"q\\" \\n ç",')
    expect(out).toContain("  single: 'it\\'s',")
    expect(out).toContain('  change: "novo",')
    expect(out).not.toContain('drop')
    expect(out).toMatch(/ {2}added: "olá \\"x\\"",\n}\n$/)
    expect(out).toContain('  "pillar_a-b": "traço",')
    expect(readLocaleFile(p)).toEqual({ keep: 'a "q" \n ç', single: "it's", change: 'novo', 'pillar_a-b': 'traço', added: 'olá "x"' })
  })
})
