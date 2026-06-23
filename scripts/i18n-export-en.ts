import { writeFileSync, mkdirSync } from 'node:fs'
import { en } from '../lib/i18n/en'

mkdirSync('tolgee', { recursive: true })
writeFileSync('tolgee/en.json', JSON.stringify(en, null, 2))
console.log(`✓ Exported ${Object.keys(en).length} keys → tolgee/en.json`)
