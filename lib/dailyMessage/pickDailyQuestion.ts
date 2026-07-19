import type { JourneyMode } from '../../types'
import type { DailyQuestion } from './types'
import { getQuestionsForMode } from './index'

// Stable string hash (djb2) → non-negative int.
function hash(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

// Deterministic per (date, user): same input → same question; rotates by day.
export function pickDailyQuestion(date: string, userId: string, mode: JourneyMode): DailyQuestion {
  // Pregnancy + pre-pregnancy banks are populated ('kids' is still an empty
  // array — see lib/dailyMessage/index.ts QUESTIONS_BY_MODE). Guard here with a
  // clear, named error instead of letting an empty bank fall through to
  // `hash(...) % 0 = NaN` and a silent `undefined` return.
  const bank = getQuestionsForMode(mode)
  if (bank.length === 0) {
    throw new Error(`pickDailyQuestion: no questions for mode "${mode}"`)
  }

  const idx = hash(`${date}:${userId}`) % bank.length
  return bank[idx]
}
