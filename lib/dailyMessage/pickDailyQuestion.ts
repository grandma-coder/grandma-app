import type { JourneyMode } from '../../types'
import type { AppLanguage } from '../../store/useLanguageStore'
import type { DailyQuestion } from './types'
import { getQuestionsForMode } from './index'

// Stable string hash (djb2) → non-negative int.
function hash(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

// Whole days since 1970-01-01 for a local "YYYY-MM-DD" date. Computed in UTC
// from the date STRING, so it never shifts with the device timezone or DST —
// the caller decides what "today" is (the user's local calendar day).
function dayNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Math.floor(Date.UTC(y, (m || 1) - 1, d || 1) / 86_400_000)
}

// Seeded Fisher–Yates (mulberry32) → a per-user order of the bank.
function seededOrder(n: number, seed: number): number[] {
  let a = seed >>> 0
  const rand = () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const order = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

/**
 * Today's question for (date, user, mode). Deterministic: the same inputs give
 * the same question on every launch and device. Each user walks her own shuffled
 * order of the bank one step per day, so a question never repeats until the
 * whole bank has been seen (no back-to-back repeats).
 *
 * `lang` only picks WHICH bank is eligible (see getQuestionsForMode); the result
 * is the canonical English question — localize it for display with
 * localizeQuestion().
 */
export function pickDailyQuestion(
  date: string, userId: string, mode: JourneyMode, lang: AppLanguage = 'en',
): DailyQuestion {
  // 'kids' / 'menopause' banks are empty arrays — fail with a clear, named error
  // instead of `% 0 = NaN` and a silent `undefined`.
  const bank = getQuestionsForMode(mode, lang)
  if (bank.length === 0) {
    throw new Error(`pickDailyQuestion: no questions for mode "${mode}"`)
  }
  const order = seededOrder(bank.length, hash(`${userId}:${mode}`))
  const day = dayNumber(date)
  return bank[order[((day % bank.length) + bank.length) % bank.length]]
}
