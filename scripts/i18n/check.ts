/**
 * Offline translation check: every active language has every key of every set, made from
 * the current English (manifest hash), with the same {{params}}, and not left in English.
 * `npm run i18n:check` prints problems; lib/__tests__/i18nCoverage.test.ts gates CI.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { fnv1a } from '../../lib/i18nHash'
import { paramMismatch, readLocaleFile, type Manifest } from './core'
import { SETS, activeLanguages } from './sets'

export const MANIFEST_PATH = join(__dirname, '../../i18n-manifest.json')

export function readManifest(): Manifest {
  return existsSync(MANIFEST_PATH) ? JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) : {}
}

/** Strings that may legitimately read the same as English (brand, acronyms, "OK"). */
const SAME_OK = /^(OK|Grandma|grandma\.app|[A-Z0-9 .+\-/:%°]{1,12})$/

export function checkAll(): string[] {
  const manifest = readManifest()
  const problems: string[] = []
  for (const set of SETS) {
    const english = set.english()
    for (const lang of activeLanguages()) {
      const locale = readLocaleFile(set.localePath(lang))
      const done = manifest[set.name]?.[lang] ?? {}
      for (const [k, en] of Object.entries(english)) {
        const tr = locale[k]
        if (tr === undefined) { problems.push(`${set.name}/${lang}: missing ${k}`); continue }
        if (done[k] !== fnv1a(en)) problems.push(`${set.name}/${lang}: stale ${k} (English changed — run npm run i18n:sync)`)
        if (paramMismatch(en, tr)) problems.push(`${set.name}/${lang}: {{param}} mismatch in ${k}`)
        // An escape written twice shows up on screen as \\" or \\u2026.
        if (tr.includes('\\') && !en.includes('\\')) problems.push(`${set.name}/${lang}: stray backslash in ${k}`)
        if (tr === en && /[A-Za-z]{3,}\s[a-z]{3,}/.test(en) && !SAME_OK.test(en)) problems.push(`${set.name}/${lang}: still English ${k}`)
      }
    }
  }
  return problems
}

if (require.main === module) {
  const problems = checkAll()
  if (problems.length) {
    console.error(problems.slice(0, 50).join('\n'))
    if (problems.length > 50) console.error(`… and ${problems.length - 50} more`)
    console.error(`\n${problems.length} translation problem(s). Run: npm run i18n:sync`)
    process.exit(1)
  }
  console.log('Translations complete for', activeLanguages().join(', '))
}
