import { en } from '../lib/i18n/en'
import { ptBR } from '../lib/i18n/pt-BR'
import { es } from '../lib/i18n/es'

/**
 * Reports keys whose translated value is byte-identical to English.
 * Most of these are genuinely-untranslated placeholders. A tail is
 * "language-neutral" (symbols, brand names, bare units, pure {{vars}}) —
 * we heuristically filter those so the signal is high.
 *
 * Run: npx tsx scripts/i18n-untranslated.ts [pt-BR|es]
 */

const NEUTRAL_EXACT = new Set([
  'OK', 'ml', 'kcal', 'g', 'kg', 'cm', 'mm', 'h', 'min', 's', 'BPM', 'bpm',
  'IMC', 'BMI', 'REM', '%', 'AM', 'PM', 'grandma.app', 'Guru Grandma',
  'AirTag', 'Apple', 'Google', 'RevenueCat', 'Claude', 'Supabase',
])

/** A value is "language-neutral" if it plausibly reads the same in any language. */
function isNeutral(value: string): boolean {
  const v = value.trim()
  if (!v) return true
  if (NEUTRAL_EXACT.has(v)) return true
  // Pure punctuation / symbols / arrows / quotes
  if (/^[\p{P}\p{S}\s]+$/u.test(v)) return true
  // Pure placeholder(s): "{{n}}", "{{a}} · {{b}}", "{{n}}%", "{{n}}d"
  if (/^(\{\{[^}]+\}\}|[\p{P}\p{S}\s%]|d|h|w|kg|g|ml|cm)+$/u.test(v) && v.includes('{{')) return true
  // Bare number + unit: "12 kg", "3d", "40w"
  if (/^\d+\s*(kg|g|ml|cm|mm|h|min|s|d|w|%|kcal|BPM|bpm)?$/i.test(v)) return true
  // Single emoji / no letters at all
  if (!/\p{L}/u.test(v)) return true
  return false
}

function report(localeName: string, locale: Record<string, string>) {
  const rows: { key: string; en: string; got: string }[] = []
  for (const key of Object.keys(en) as (keyof typeof en)[]) {
    const enVal = en[key]
    const locVal = locale[key as string]
    if (typeof enVal !== 'string' || typeof locVal !== 'string') continue
    if (enVal !== locVal) continue
    if (isNeutral(enVal)) continue
    rows.push({ key: key as string, en: enVal, got: locVal })
  }
  return rows
}

const asMap = (o: unknown) => o as Record<string, string>
const targets: Record<string, Record<string, string>> = { 'pt-BR': asMap(ptBR), es: asMap(es) }
const only = process.argv[2]
const entries = only ? [[only, targets[only]] as const] : Object.entries(targets)

let total = 0
for (const [name, loc] of entries) {
  const rows = report(name, loc as Record<string, string>)
  total += rows.length
  console.log(`\n=== ${name}: ${rows.length} untranslated (value === en) ===`)
  for (const r of rows) {
    console.log(`  ${r.key}\n      "${r.en}"`)
  }
}
console.log(`\nTOTAL suspected-untranslated: ${total}`)
