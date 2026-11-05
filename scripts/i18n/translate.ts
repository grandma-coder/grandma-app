/**
 * Translate a batch of English strings with the Anthropic Messages API. Returns the same
 * keys translated; throws if keys or {{params}} don't match so nothing broken is written.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { paramMismatch } from './core'
import { LANGUAGE_NAMES } from './sets'

const MODEL = 'claude-sonnet-5-5'

export function apiKey(): string | undefined {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY
  // .env.local wins over .env (both git-ignored); an empty value falls through.
  for (const file of ['.env.local', '.env']) {
    const envPath = join(__dirname, '../..', file)
    if (!existsSync(envPath)) continue
    const m = readFileSync(envPath, 'utf8').match(/^ANTHROPIC_API_KEY=(.*)$/m)
    const v = m ? m[1].trim().replace(/^["']|["']$/g, '') : ''
    if (v) return v
  }
  return undefined
}

function systemPrompt(lang: string): string {
  return [
    `You translate the text of "grandma", a pregnancy, cycle, kids and menopause companion app, from English into ${LANGUAGE_NAMES[lang] ?? lang}.`,
    'Voice: a warm, calm grandmother speaking to a woman. Use the feminine second person wherever the language marks gender. Natural, idiomatic, never literal or stiff.',
    'Keep every {{param}} exactly as written (same name, braces). Keep numbers, units, doses, ranges, percentages, drug names, organisation names (WHO, ACOG, NHS, CDC…) and the name "Grandma" exactly.',
    'Medical facts must be translated faithfully: do not add, soften, strengthen or drop any claim. Keep \\n line breaks where they are.',
    'Never call the body "normal". No scores, no pressure.',
    'Input is a JSON object of key → English. Reply with ONLY a JSON object with exactly the same keys and the translated strings as values.',
  ].join('\n')
}

export async function translateBatch(lang: string, entries: Record<string, string>): Promise<Record<string, string>> {
  const key = apiKey()
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set (env or .env)')
  let lastError: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 16000,
          system: systemPrompt(lang),
          messages: [{ role: 'user', content: JSON.stringify(entries) }],
        }),
      })
      if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 300)}`)
      const data = (await res.json()) as { content: { type: string; text?: string }[] }
      const text = data.content.filter((c) => c.type === 'text').map((c) => c.text ?? '').join('')
      const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)
      const out = JSON.parse(json) as Record<string, string>
      const want = Object.keys(entries).sort().join('|')
      if (Object.keys(out).sort().join('|') !== want) throw new Error('Translated keys differ from the batch')
      for (const [k, v] of Object.entries(out)) {
        if (typeof v !== 'string' || !v.trim()) throw new Error(`Empty translation for ${k}`)
        if (paramMismatch(entries[k], v)) throw new Error(`{{param}} mismatch in ${k}`)
      }
      return out
    } catch (e) {
      lastError = e
    }
  }
  throw lastError
}
