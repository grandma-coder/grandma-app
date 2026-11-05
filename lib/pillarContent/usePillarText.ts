import { useLanguageStore } from '../../store/useLanguageStore'
import { useTranslatedContent } from '../useTranslatedContent'
import { bundledPillarText } from './index'

/**
 * Pillar copy in the active language. Bundled translation (cycle pillars) → returned at once,
 * no network, no placeholder. Otherwise → the runtime translator (`useTranslatedContent`),
 * exactly as before. Both paths always call the same hooks, so hook order never changes.
 */
export function usePillarText(contentKey: string, sourceText: string): { text: string; loading: boolean } {
  const language = useLanguageStore((s) => s.language)
  const bundled = sourceText ? bundledPillarText(contentKey, language) : undefined
  // With an empty source the runtime translator stays disabled (no request).
  const remote = useTranslatedContent(bundled ? '' : contentKey, bundled ? '' : sourceText)
  return bundled ? { text: bundled, loading: false } : remote
}
