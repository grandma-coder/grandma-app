import type { JourneyMode } from '../../types'
import type { DailyQuestion, DailyCard } from './types'
import { PREGNANCY_QUESTIONS } from './questions.pregnancy'
import { PREGNANCY_CARDS } from './cards.pregnancy'
import { PREPREGNANCY_QUESTIONS } from './questions.prePregnancy'
import { PREPREGNANCY_CARDS } from './cards.prePregnancy'

const QUESTIONS_BY_MODE: Record<JourneyMode, DailyQuestion[]> = {
  'pre-pregnancy': PREPREGNANCY_QUESTIONS, pregnancy: PREGNANCY_QUESTIONS, kids: [],
}
const CARDS_BY_MODE: Record<JourneyMode, DailyCard[]> = {
  'pre-pregnancy': PREPREGNANCY_CARDS, pregnancy: PREGNANCY_CARDS, kids: [],
}

// Lookups search every populated bank — a saved daily_messages row references a
// question/card id and must resolve regardless of which mode is active now.
const ALL_QUESTIONS = [...PREGNANCY_QUESTIONS, ...PREPREGNANCY_QUESTIONS]
const ALL_CARDS = [...PREGNANCY_CARDS, ...PREPREGNANCY_CARDS]

export const getQuestionsForMode = (m: JourneyMode) => QUESTIONS_BY_MODE[m]
export const getCardsForMode = (m: JourneyMode) => CARDS_BY_MODE[m]
export const getQuestionById = (id: string) =>
  ALL_QUESTIONS.find((q) => q.id === id)
export const getCardById = (id: string) =>
  ALL_CARDS.find((c) => c.id === id)

export * from './types'
export * from './tags'
export { matchCard } from './matcher'
export { pickDailyQuestion } from './pickDailyQuestion'
