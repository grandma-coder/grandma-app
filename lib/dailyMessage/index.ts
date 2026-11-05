import type { JourneyMode } from '../../types'
import type { AppLanguage } from '../../store/useLanguageStore'
import type { DailyQuestion, DailyCard } from './types'
import { PREGNANCY_QUESTIONS } from './questions.pregnancy'
import { PREGNANCY_CARDS } from './cards.pregnancy'
import { PREPREGNANCY_QUESTIONS } from './questions.prePregnancy'
import { PREPREGNANCY_CARDS } from './cards.prePregnancy'
import { getRemoteQuestionsForMode, getAllRemoteQuestions } from './questions.remote'
import { isQuestionTranslated } from './localize'

const QUESTIONS_BY_MODE: Record<JourneyMode, DailyQuestion[]> = {
  'pre-pregnancy': PREPREGNANCY_QUESTIONS, pregnancy: PREGNANCY_QUESTIONS, kids: [], menopause: [],
}
const CARDS_BY_MODE: Record<JourneyMode, DailyCard[]> = {
  'pre-pregnancy': PREPREGNANCY_CARDS, pregnancy: PREGNANCY_CARDS, kids: [], menopause: [],
}

// Lookups search every populated bank — a saved daily_messages row references a
// question/card id and must resolve regardless of which mode is active now.
const ALL_QUESTIONS = [...PREGNANCY_QUESTIONS, ...PREPREGNANCY_QUESTIONS]
const ALL_CARDS = [...PREGNANCY_CARDS, ...PREPREGNANCY_CARDS]

// DB-first: questions managed in the command center (content_daily_questions)
// take precedence when hydrated; otherwise fall back to the bundled arrays so
// the app always has questions. See questions.remote.ts.
//
// The DB rows are English-only. For any other language we keep only the remote
// questions we hold a translation for (same id as a bundled question); if none
// qualify, the bundled — fully translated — bank is used. A non-English user
// never sees an English question.
export const getQuestionsForMode = (m: JourneyMode, lang: AppLanguage = 'en'): DailyQuestion[] => {
  const remote = getRemoteQuestionsForMode(m)
  if (remote) {
    if (lang === 'en') return remote
    const usable = remote.filter((q) => isQuestionTranslated(q, lang))
    if (usable.length > 0) return usable
  }
  return QUESTIONS_BY_MODE[m]
}
export const getCardsForMode = (m: JourneyMode) => CARDS_BY_MODE[m]
export const getQuestionById = (id: string) =>
  (getAllRemoteQuestions() ?? ALL_QUESTIONS).find((q) => q.id === id) ??
  ALL_QUESTIONS.find((q) => q.id === id)
export const getCardById = (id: string) =>
  ALL_CARDS.find((c) => c.id === id)

export * from './types'
export * from './tags'
export { matchCard } from './matcher'
export { pickDailyQuestion } from './pickDailyQuestion'
export { hydrateDailyQuestions } from './questions.remote'
export { localizeQuestion, localizeCard, isQuestionTranslated } from './localize'
