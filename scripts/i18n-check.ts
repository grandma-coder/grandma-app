import { readFileSync } from 'node:fs'
import { join } from 'node:path'

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

const translations = { en, 'pt-BR': ptBR, es, fr, de, it, ja, ko, zh, ar, hi, tr }

/**
 * Keys declared optional (`key?: string`) in TranslationKeys are allowed to be
 * absent from a locale — at runtime they fall back to en. Parse keys.ts as text
 * to collect them, since runtime JS can't see TypeScript optionality.
 */
function readOptionalKeys(): Set<string> {
  const text = readFileSync(join(__dirname, '../lib/i18n/keys.ts'), 'utf8')
  const optional = new Set<string>()
  for (const match of text.matchAll(/^\s*([A-Za-z0-9_]+)\?\s*:/gm)) {
    optional.add(match[1])
  }
  return optional
}

export function checkKeyParity() {
  const optionalKeys = readOptionalKeys()
  const requiredKeys = Object.keys(en).filter((k) => !optionalKeys.has(k))
  return Object.entries(translations).map(([locale, obj]) => {
    const keys = Object.keys(obj)
    return {
      locale,
      missing: requiredKeys.filter((k) => !keys.includes(k)),
      extra: keys.filter((k) => !(k in en)),
    }
  })
}

if (require.main === module) {
  const report = checkKeyParity()
  const broken = report.filter((r) => r.missing.length || r.extra.length)
  if (broken.length) {
    console.error('Key parity broken:', JSON.stringify(broken, null, 2))
    process.exit(1)
  }
  console.log('✓ All locales in parity with en')
}
