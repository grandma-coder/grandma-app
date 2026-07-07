/**
 * One-time bulk translation fill. Finds every key in a target locale whose value
 * still equals the English source (an untranslated placeholder) and translates it
 * via the Anthropic API in batches, writing results back into the locale .ts file.
 *
 * Run: npx tsx scripts/i18n-fill-translations.ts pt-BR
 *      npx tsx scripts/i18n-fill-translations.ts es
 *
 * Reads ANTHROPIC_API_KEY from .env (dev-only script; the app never ships this key).
 * Idempotent: keys already translated (value !== en) are skipped, so re-running only
 * fills what's still missing. Preserves {{placeholders}}.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const LOCALE = process.argv[2]
const DRY_RUN = process.argv.includes('--dry-run')
const LOCALE_NAMES: Record<string, string> = {
  'pt-BR': 'Brazilian Portuguese',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  tr: 'Turkish',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Simplified Chinese',
  hi: 'Hindi',
  ar: 'Arabic',
}
if (!LOCALE || !LOCALE_NAMES[LOCALE]) {
  console.error('Usage: npx tsx scripts/i18n-fill-translations.ts <pt-BR|es>')
  process.exit(1)
}

// --- read the API key from .env ---
const env = readFileSync('.env', 'utf8')
const keyMatch = env.match(/ANTHROPIC_API_KEY\s*=\s*["']?([^"'\n]+)/)
const ANTHROPIC_API_KEY = keyMatch?.[1]?.trim()
if (!ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY not found in .env')
  process.exit(1)
}

// --- parse a locale .ts file into { key: value } (order-preserving list of lines) ---
function parseLocale(path: string): Record<string, string> {
  const src = readFileSync(path, 'utf8')
  const out: Record<string, string> = {}
  // matches:  keyName: 'value',  or  keyName: "value",  (values may contain \' or \n escapes)
  for (const m of src.matchAll(/^\s+([a-zA-Z0-9_]+):\s*(["'])((?:\\.|(?!\2).)*)\2/gm)) {
    out[m[1]] = m[3]
  }
  return out
}

const en = parseLocale('lib/i18n/en.ts')
const localePath = `lib/i18n/${LOCALE}.ts`
const loc = parseLocale(localePath)

// A value with no letters (punctuation/symbol/number only — e.g. '·', '•', '‹',
// smart quotes, '{{n}}d') is language-neutral: never translate it, just carry the
// English value over. Translating these also breaks the JSON round-trip (a raw
// curly quote inside a JSON string value is invalid).
const hasLetters = (s: string) => /\p{L}{2,}/u.test(s)

// placeholders = keys where the locale value is missing OR identical to English,
// AND the value actually contains translatable words.
const todo = Object.keys(en).filter(
  (k) => (!(k in loc) || loc[k] === en[k]) && hasLetters(en[k]),
)
console.log(`${LOCALE}: ${todo.length} translatable untranslated keys (of ${Object.keys(en).length})`)
if (DRY_RUN) { console.log('[dry-run] no changes written'); process.exit(0) }
if (todo.length === 0) { console.log('nothing to do'); process.exit(0) }

const BATCH = 50
const language = LOCALE_NAMES[LOCALE]

async function translateBatch(pairs: [string, string][]): Promise<Record<string, string>> {
  const payload = Object.fromEntries(pairs)
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      system:
        `You are a professional UI translator for a warm, supportive parenting-companion ` +
        `app. Translate each JSON string VALUE from English into ${language}. Rules: keep ` +
        `the JSON KEYS unchanged; preserve any {{placeholder}} tokens EXACTLY — never ` +
        `translate or reorder the variable names inside {{ }} (e.g. {{count}}, {{week}}, ` +
        `{{label}}); keep \\n newlines; for UPPERCASE labels keep them uppercase. Do NOT ` +
        `translate: brand terms ("grandma", "Guru Grandma", "Nana"); units ("kcal", "ml", ` +
        `"g"); institutional names (ACOG, NICE, WHO, CDC, USDA, IOM); or the standalone ` +
        `token "OK". Match the app's warm, concise tone and keep medical/pregnancy terms ` +
        `accurate. Return ONLY a valid JSON object mapping the same keys to translated ` +
        `values — no markdown, no prose.`,
      messages: [{ role: 'user', content: JSON.stringify(payload) }],
    }),
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
  const json = await res.json()
  let text = json?.content?.[0]?.text ?? '{}'
  // strip accidental markdown fences
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  return JSON.parse(text)
}

async function main() {
  const translations: Record<string, string> = {}
  for (let i = 0; i < todo.length; i += BATCH) {
    const slice = todo.slice(i, i + BATCH)
    const pairs = slice.map((k) => [k, en[k]] as [string, string])
    try {
      const got = await translateBatch(pairs)
      for (const k of slice) if (typeof got[k] === 'string') translations[k] = got[k]
      console.log(`  batch ${i / BATCH + 1}/${Math.ceil(todo.length / BATCH)} → ${Object.keys(got).length} keys`)
    } catch (e) {
      console.error(`  batch ${i / BATCH + 1} FAILED (keeping English for these):`, String(e).slice(0, 120))
    }
  }

  // --- rewrite the locale file: merge existing + new, preserve the full en key set + order ---
  const merged: Record<string, string> = {}
  for (const k of Object.keys(en)) {
    merged[k] = translations[k] ?? (loc[k] ?? en[k])
  }
  const constName: Record<string, string> = { 'pt-BR': 'ptBR', es: 'es' }
  const entries = Object.entries(merged)
    .map(([k, v]) => `  ${k}: ${JSON.stringify(v)},`)
    .join('\n')
  const body = `import type { TranslationKeys } from './keys'\n\nexport const ${constName[LOCALE]}: TranslationKeys = {\n${entries}\n}\n`
  writeFileSync(localePath, body)

  const filled = Object.keys(translations).length
  console.log(`✓ ${LOCALE}: filled ${filled} keys → ${localePath}`)
}

main()
