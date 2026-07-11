import type { JourneyMode } from '../../types'
import type { DailyQuestion, DailyCard } from './types'
import { PREGNANCY_QUESTIONS } from './questions.pregnancy'
import { PREGNANCY_CARDS } from './cards.pregnancy'

const QUESTIONS_BY_MODE: Record<JourneyMode, DailyQuestion[]> = {
  'pre-pregnancy': [], pregnancy: PREGNANCY_QUESTIONS, kids: [],
}
const CARDS_BY_MODE: Record<JourneyMode, DailyCard[]> = {
  'pre-pregnancy': [], pregnancy: PREGNANCY_CARDS, kids: [],
}

export const getQuestionsForMode = (m: JourneyMode) => QUESTIONS_BY_MODE[m]
export const getCardsForMode = (m: JourneyMode) => CARDS_BY_MODE[m]
export const getQuestionById = (id: string) =>
  [...PREGNANCY_QUESTIONS].find((q) => q.id === id)
export const getCardById = (id: string) =>
  [...PREGNANCY_CARDS].find((c) => c.id === id)

export * from './types'
export * from './tags'
export { matchCard } from './matcher'
export { pickDailyQuestion } from './pickDailyQuestion'
