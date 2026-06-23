import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const LOCALES = ['pt-BR', 'es', 'fr', 'de', 'it', 'ja', 'ko', 'zh', 'ar', 'hi', 'tr']
const constName: Record<string, string> = { 'pt-BR': 'ptBR', es: 'es', fr: 'fr', de: 'de', it: 'it', ja: 'ja', ko: 'ko', zh: 'zh', ar: 'ar', hi: 'hi', tr: 'tr' }

for (const locale of LOCALES) {
  const jsonPath = `tolgee/${locale}.json`
  if (!existsSync(jsonPath)) { console.warn(`skip ${locale} (no pull)`); continue }
  const data = JSON.parse(readFileSync(jsonPath, 'utf8')) as Record<string, string>
  const entries = Object.entries(data)
    .map(([k, v]) => `  ${/^[a-zA-Z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${JSON.stringify(v)},`)
    .join('\n')
  const body = `import type { TranslationKeys } from './keys'\n\nexport const ${constName[locale]}: TranslationKeys = {\n${entries}\n}\n`
  writeFileSync(`lib/i18n/${locale}.ts`, body)
  console.log(`✓ Wrote lib/i18n/${locale}.ts (${Object.keys(data).length} keys)`)
}
