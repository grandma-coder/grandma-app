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

export function checkKeyParity() {
  const enKeys = Object.keys(en)
  return Object.entries(translations).map(([locale, obj]) => {
    const keys = Object.keys(obj)
    return {
      locale,
      missing: enKeys.filter((k) => !keys.includes(k)),
      extra: keys.filter((k) => !enKeys.includes(k)),
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
