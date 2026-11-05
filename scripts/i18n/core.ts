/**
 * Translation sync core: which keys need translating, placeholder parity, and an
 * in-place reader/writer for flat locale files (`export const x: T = { key: "…", }`).
 */
import { readFileSync, writeFileSync } from 'node:fs'

import { fnv1a } from '../../lib/i18nHash'

/** set → lang → key → hash of the English the translation was made from. */
export type Manifest = Record<string, Record<string, Record<string, string>>>

/** Keys to (re)translate — missing in the locale or English changed since — and keys English dropped. */
export function diffSet(
  english: Record<string, string>,
  locale: Record<string, string>,
  done: Record<string, string>,
): { todo: string[]; removed: string[] } {
  const todo = Object.keys(english).filter((k) => !(k in locale) || done[k] !== fnv1a(english[k]))
  const removed = Object.keys(locale).filter((k) => !(k in english))
  return { todo, removed }
}

export function paramsOf(s: string): string {
  return [...s.matchAll(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g)].map((m) => m[1]).sort().join(',')
}

export function paramMismatch(english: string, translated: string): boolean {
  return paramsOf(english) !== paramsOf(translated)
}

// Key may be bare (`ab_c:`) or quoted (`"pillar_x-y":`, used when it isn't an identifier).
const LINE = /^(\s+)(?:"([^"]+)"|'([^']+)'|([A-Za-z0-9_$]+)):\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'),?\s*$/

function lineKey(m: RegExpMatchArray): string { return m[2] ?? m[3] ?? m[4] }
function keyLiteral(k: string): string { return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) ? k : JSON.stringify(k) }

function parseLiteral(lit: string): string {
  if (lit.startsWith('"')) return JSON.parse(lit)
  // Single-quoted TS string → JSON: unescape \' and escape bare double quotes.
  const body = lit.slice(1, -1).replace(/\\'/g, "'").replace(/(^|[^\\])"/g, '$1\\"')
  return JSON.parse(`"${body}"`)
}

export function readLocaleFile(path: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(LINE)
    if (m) out[lineKey(m)] = parseLiteral(m[5])
  }
  return out
}

/** Replace values in place, append new keys before the closing `}`, delete removed keys. */
export function writeLocaleFile(path: string, updates: Record<string, string>, removed: string[]): void {
  const lines = readFileSync(path, 'utf8').split('\n')
  const pending = { ...updates }
  const drop = new Set(removed)
  const out: string[] = []
  for (const line of lines) {
    const m = line.match(LINE)
    if (m && drop.has(lineKey(m))) continue
    if (m && lineKey(m) in pending) {
      const k = lineKey(m)
      out.push(`${m[1]}${keyLiteral(k)}: ${JSON.stringify(pending[k])},`)
      delete pending[k]
      continue
    }
    out.push(line)
  }
  let close = -1
  for (let i = out.length - 1; i >= 0; i--) if (/^}/.test(out[i])) { close = i; break }
  if (close === -1) throw new Error(`No closing brace in ${path}`)
  const added = Object.entries(pending).map(([k, v]) => `  ${keyLiteral(k)}: ${JSON.stringify(v)},`)
  out.splice(close, 0, ...added)
  writeFileSync(path, out.join('\n'))
}
