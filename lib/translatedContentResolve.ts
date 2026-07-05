/**
 * Pure resolver for useTranslatedContent's return value. Kept import-free and in
 * its own file so it can be unit-tested under Node/Jest without dragging in the
 * Supabase client or React Query (which need RN/env context Jest doesn't have).
 *
 * Given the active language, the fetched translation (if any), whether a fetch is
 * enabled, and its load state, decide what text to show and whether we're loading.
 */
export function resolveTranslatedContent(
  language: string,
  sourceText: string,
  fetched: string | undefined,
  enabled: boolean,
  isLoading: boolean,
): { text: string; loading: boolean } {
  if (language === 'en') return { text: sourceText, loading: false }
  return { text: fetched ?? sourceText, loading: enabled && isLoading }
}
