/**
 * Key-sync: ensure every locale file contains every key present in en.
 * Missing keys are appended as English placeholders (so parity + typecheck pass);
 * existing translations are preserved verbatim. Extra keys (not in en) are dropped.
 * Rebuilds each locale file normalized to one-key-per-line in en's order.
 *
 * Imports the compiled locale modules (not a regex parse) so values round-trip
 * exactly — no escaping bugs, no dropped multi-key-per-line entries.
 *
 * Run: npx tsx scripts/i18n-sync-keys.ts           (all 11 non-en locales)
 *      npx tsx scripts/i18n-sync-keys.ts pt-BR es   (subset)
 *
 * After this, run i18n-fill-translations.ts for pt-BR/es to translate the new
 * English placeholders. The other 9 locales stay English until enabled.
 */
import { writeFileSync } from 'node:fs'

import { en } from '../lib/i18n/en'
import { ptBR } from '../lib/i18n/pt-BR'
import { es } from '../lib/i18n/es'
import { fr } from '../lib/i18n/fr'
import { de } from '../lib/i18n/de'
import { it } from '../lib/i18n/it'
import { ja } from '../lib/i18n/ja'
import { ko } from '../lib/i18n/ko'
import { zh } from '../lib/i18n/zh'
import { ar } from '../lib/i18n/ar'
import { hi } from '../lib/i18n/hi'
import { tr } from '../lib/i18n/tr'

const asMap = (o: unknown) => o as Record<string, string>
const LOCALES: Record<string, { obj: Record<string, string>; constName: string }> = {
  'pt-BR': { obj: asMap(ptBR), constName: 'ptBR' },
  es: { obj: asMap(es), constName: 'es' },
  fr: { obj: asMap(fr), constName: 'fr' },
  de: { obj: asMap(de), constName: 'de' },
  it: { obj: asMap(it), constName: 'it' },
  ja: { obj: asMap(ja), constName: 'ja' },
  ko: { obj: asMap(ko), constName: 'ko' },
  zh: { obj: asMap(zh), constName: 'zh' },
  ar: { obj: asMap(ar), constName: 'ar' },
  hi: { obj: asMap(hi), constName: 'hi' },
  tr: { obj: asMap(tr), constName: 'tr' },
}

const enObj = asMap(en)
const enKeys = Object.keys(enObj)
const targets = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(LOCALES)

for (const locale of targets) {
  const entry = LOCALES[locale]
  if (!entry) {
    console.error(`skip unknown locale: ${locale}`)
    continue
  }
  const loc = entry.obj
  let added = 0
  const lines = enKeys.map((k) => {
    const has = Object.prototype.hasOwnProperty.call(loc, k)
    if (!has) added++
    const value = has ? loc[k] : enObj[k]
    return `  ${k}: ${JSON.stringify(value)},`
  })
  const body = `import type { TranslationKeys } from './keys'\n\nexport const ${entry.constName}: TranslationKeys = {\n${lines.join('\n')}\n}\n`
  writeFileSync(`lib/i18n/${locale}.ts`, body)
  console.log(`✓ ${locale}: +${added} placeholder(s), ${enKeys.length} keys total`)
}
