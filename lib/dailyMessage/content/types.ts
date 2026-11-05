/**
 * Translated daily-message content for one language. Keyed by the ids of the
 * English banks (questions.*.ts / cards.*.ts) — English stays the source of
 * truth for ids, tags, colours and option ORDER; a locale only carries words.
 * `options[i]` translates the English option at the same index.
 */
export interface DailyContentLocale {
  questions: Record<string, { prompt: string; options: string[] }>
  cards: Record<string, string>
}
