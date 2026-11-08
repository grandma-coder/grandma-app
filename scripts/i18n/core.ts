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
  // A backslash the English doesn't have is an escape written twice (shows as \\" or \\u2026).
  const brokenEscape = (k: string) => locale[k].includes('\\') && !english[k].includes('\\')
  const todo = Object.keys(english).filter((k) => !(k in locale) || done[k] !== fnv1a(english[k]) || brokenEscape(k) || looksUntranslated(english[k], locale[k]))
  const removed = Object.keys(locale).filter((k) => !(k in english))
  return { todo, removed }
}

/** Strings that may legitimately read the same as English (brand, acronyms, "OK"). */
export const SAME_OK = /^(OK|Grandma|grandma\.app|[A-Z0-9 .+\-/:%°]{1,12})$/

const plainQuotes = (s: string) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').trim()

/** A translated value that is still the English sentence (quote style ignored). */
export function looksUntranslated(english: string, translated: string): boolean {
  return plainQuotes(english) === plainQuotes(translated) && /[A-Za-z]{3,}\s[a-z]{3,}/.test(english) && !SAME_OK.test(english)
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

/** Hidden (not yet offered) languages: keep their translations, add new keys as English placeholders, drop removed keys — so typecheck and key parity hold without translating them. */
export function fillPlaceholders(path: string, english: Record<string, string>): void {
  const locale = readLocaleFile(path)
  const missing = Object.fromEntries(Object.keys(english).filter((k) => !(k in locale)).map((k) => [k, english[k]]))
  const removed = Object.keys(locale).filter((k) => !(k in english))
  if (Object.keys(missing).length || removed.length) writeLocaleFile(path, missing, removed)
}
