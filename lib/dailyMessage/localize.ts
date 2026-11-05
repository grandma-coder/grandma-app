// Localized views over the English daily-message banks.
//
// The English banks (questions.*.ts / cards.*.ts) own ids, tags, colours and the
// option ORDER — the matcher and the saved daily_messages rows only ever see
// those. A locale (content/<lang>.ts) only carries words, keyed by the same ids,
// so swapping language never changes which card an answer maps to.
import type { AppLanguage } from '../../store/useLanguageStore'
import type { DailyCard, DailyQuestion } from './types'
import { DAILY_CONTENT } from './content'

function localeFor(lang: AppLanguage) {
  return lang === 'en' ? null : DAILY_CONTENT[lang] ?? null
}

/** True when this question can be shown in `lang` without any English leaking. */
export function isQuestionTranslated(q: DailyQuestion, lang: AppLanguage): boolean {
  if (lang === 'en') return true
  const tr = localeFor(lang)?.questions[q.id]
  return !!tr && tr.options.length === q.options.length
}

/** The question with its prompt + option labels in `lang` (English when untranslated). */
export function localizeQuestion(q: DailyQuestion, lang: AppLanguage): DailyQuestion {
  const tr = localeFor(lang)?.questions[q.id]
  if (!tr || tr.options.length !== q.options.length) return q
  return {
    ...q,
    prompt: tr.prompt,
    options: q.options.map((o, i) => ({ ...o, label: tr.options[i] })),
  }
}

/** The card with its text in `lang` (English when untranslated). */
export function localizeCard(card: DailyCard, lang: AppLanguage): DailyCard {
  const text = localeFor(lang)?.cards[card.id]
  return text ? { ...card, text } : card
}
