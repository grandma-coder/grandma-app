// lib/grandmaNotes/testing.ts — helpers for the builder unit tests.
// An English translator backed by the real `en` table, plus the banned-word
// check from docs/compliance/2026-11-02-regras-saude.md.
import { en } from '../i18n/en'
import type { GrandmaLetter, Translate } from './types'

export const tEn: Translate = (key, params) => {
  const raw = en[key] ?? key
  if (!params) return raw
  return raw.replace(/\{\{(\w+)\}\}/g, (_, name: string) => (name in params ? String(params[name]) : `{{${name}}}`))
}

/** Words no note may contain. */
export const BANNED = /thriving|needs care|needs attention|\bnormal\b|abnormal|\/10|score/i

export function letterText(l: GrandmaLetter): string {
  return [
    l.intro,
    ...l.notes.flatMap((n) => [n.title, n.body]),
    l.suggestion?.text ?? '',
    l.suggestion?.actionLabel ?? '',
  ].join('\n')
}
