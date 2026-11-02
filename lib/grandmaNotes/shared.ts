// lib/grandmaNotes/shared.ts — small pure helpers shared by the four builders.
import type { GrandmaNoteItem, NoteCandidate } from './types'

export const MAX_NOTES = 3

/**
 * Words a note must never contain (docs/compliance/2026-11-02-regras-saude.md):
 * grades, scores, normal/abnormal, "needs care/attention". Also used to vet
 * free-text tips (e.g. the English `momTip`) before showing them.
 */
export const BANNED_PATTERNS: RegExp[] = [
  /thriv/i,
  /needs? care/i,
  /needs? attention/i,
  /\bnormal/i,
  /abnormal/i,
  /\/\s*10\b/,
  /\bscore/i,
  /\bgrade/i,
  /diagnos/i,
]

/** Treatment / supplement words a curated suggestion must not carry. */
const CLINICAL_PATTERNS: RegExp[] = [/vitamin/i, /supplement/i, /medic/i, /\bdrug/i, /\bdose/i, /treatment/i]

export function hasBannedWords(text: string): boolean {
  return BANNED_PATTERNS.some((re) => re.test(text))
}

/** A free-text tip is usable when it carries no banned or clinical wording. */
export function isSafeTip(text: string | null | undefined): text is string {
  if (!text || !text.trim()) return false
  return !hasBannedWords(text) && !CLINICAL_PATTERNS.some((re) => re.test(text))
}

export function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12, 0, 0)
}

/** This week = the 7 days ending today; last week = the 7 days before that. */
export function weekWindows(today: Date): {
  thisFrom: string; thisTo: string; prevFrom: string; prevTo: string
} {
  return {
    thisFrom: dateStr(addDays(today, -6)),
    thisTo: dateStr(today),
    prevFrom: dateStr(addDays(today, -13)),
    prevTo: dateStr(addDays(today, -7)),
  }
}

export function inRange(d: string | null | undefined, from: string, to: string): boolean {
  return !!d && d >= from && d <= to
}

/** One decimal, trailing ".0" dropped ("7.5", "8"). */
export function fmt1(n: number): string {
  const r = Math.round(n * 10) / 10
  return Number.isInteger(r) ? String(r) : r.toFixed(1)
}

/** Highest weight first; stable on ties; one note per id. */
export function pickTop(candidates: NoteCandidate[], max = MAX_NOTES): GrandmaNoteItem[] {
  const seen = new Set<string>()
  return candidates
    .map((c, i) => ({ c, i }))
    .sort((a, b) => (b.c.weight - a.c.weight) || (a.i - b.i))
    .filter(({ c }) => (seen.has(c.id) ? false : (seen.add(c.id), true)))
    .slice(0, max)
    .map(({ c }) => {
      const { weight: _w, ...note } = c
      return note
    })
}
