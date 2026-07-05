import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'
import { useLanguageStore } from '../store/useLanguageStore'
import { resolveTranslatedContent } from './translatedContentResolve'

export { resolveTranslatedContent }

/**
 * Translate long-form app content (birth guide, pillar bodies, weekly content, etc.)
 * on demand for the active locale, cached server-side per (contentKey, locale).
 *
 * - English → returns the source immediately, no network.
 * - Other locales → React Query fetches from the translate-content edge function
 *   (which itself caches in the content_translations table). While loading, the
 *   English source is shown as a fallback so the UI never flashes empty.
 *
 * `contentKey` MUST be stable and id-based (e.g. `birthguide_natural_2`), never the
 * text itself — the edge function hashes the source separately to detect edits.
 */
export function useTranslatedContent(
  contentKey: string,
  sourceText: string,
): { text: string; loading: boolean } {
  const language = useLanguageStore((s) => s.language)
  const enabled = language !== 'en' && !!sourceText

  const { data, isLoading } = useQuery({
    queryKey: ['content-translation', contentKey, language, sourceText],
    enabled,
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('translate-content', {
        body: { contentKey, sourceText, locale: language },
      })
      if (error) throw error
      return (data as { translatedText: string }).translatedText
    },
  })

  return resolveTranslatedContent(language, sourceText, data, enabled, isLoading)
}
