/**
 * Content sets the translation sync manages. Each is a flat key → English map plus one
 * locale file per language. English is the only text anyone edits; locales are generated.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { en } from '../../lib/i18n/en'
import { pillarContentEnglish } from '../../lib/pillarContent/english'
import { pregnancyContentEnglish } from '../../lib/pregnancyContent/english'
import { birthGuideEnglish } from '../../lib/birthGuideContent/english'

const ROOT = join(__dirname, '../..')

export interface ContentSet {
  name: string
  english(): Record<string, string>
  localePath(lang: string): string
}

export const SETS: ContentSet[] = [
  { name: 'ui', english: () => ({ ...(en as unknown as Record<string, string>) }), localePath: (l) => join(ROOT, 'lib/i18n', `${l}.ts`) },
  { name: 'pillars', english: pillarContentEnglish, localePath: (l) => join(ROOT, 'lib/pillarContent', `${l}.ts`) },
  { name: 'pregnancy', english: pregnancyContentEnglish, localePath: (l) => join(ROOT, 'lib/pregnancyContent', `${l}.ts`) },
  { name: 'birthGuide', english: birthGuideEnglish, localePath: (l) => join(ROOT, 'lib/birthGuideContent', `${l}.ts`) },
]

/**
 * Languages offered in the app (SUPPORTED_LANGUAGES) minus English. Read from the store
 * source as text — importing the store would pull in native modules outside the app.
 */
export function activeLanguages(): string[] {
  const src = readFileSync(join(ROOT, 'store/useLanguageStore.ts'), 'utf8')
  const start = src.indexOf('export const SUPPORTED_LANGUAGES')
  const end = src.indexOf('export const UPCOMING_LANGUAGES')
  if (start === -1 || end === -1 || end < start) throw new Error('store/useLanguageStore.ts: SUPPORTED_LANGUAGES / UPCOMING_LANGUAGES markers not found')
  const block = src.slice(start, end)
  return [...block.matchAll(/code:\s*'([^']+)'/g)].map((m) => m[1]).filter((c) => c !== 'en')
}

export const LANGUAGE_NAMES: Record<string, string> = {
  'pt-BR': 'Brazilian Portuguese', es: 'Spanish (neutral Latin American)', fr: 'French', de: 'German',
  it: 'Italian', ja: 'Japanese', ko: 'Korean', zh: 'Simplified Chinese', hi: 'Hindi', tr: 'Turkish', ar: 'Arabic',
}
