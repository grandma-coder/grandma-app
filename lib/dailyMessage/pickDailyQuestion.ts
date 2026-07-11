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
  const bank = getQuestionsForMode(mode)
  const idx = hash(`${date}:${userId}`) % bank.length
  return bank[idx]
}
