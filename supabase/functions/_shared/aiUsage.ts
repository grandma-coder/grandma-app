// @ts-nocheck — Deno Edge Function (URL imports, Deno globals; not type-checked by the app's tsconfig).
// Shared AI-usage logger for edge functions that call Claude.
//
// One fire-and-forget row per Claude call into `ai_usage` (owned by the command
// center's migrations). The command center's AI-cost pillar reads this table and
// prices token counts at read time. Logging must NEVER break the AI call it
// records — every path swallows errors after logging them.
//
// Usage inside an edge function (which already has a service-role supabase
// client and the parsed Anthropic response):
//
//   import { logAiUsage } from '../_shared/aiUsage.ts'
//   const started = Date.now()
//   const response = await fetch('https://api.anthropic.com/v1/messages', { … })
//   const json = await response.json()
//   await logAiUsage(supabase, {
//     fn: 'nana-chat',
//     model: 'claude-sonnet-4-5',
//     userId,                         // the authenticated caller (or null)
//     usage: json.usage,             // Anthropic's usage block
//     ok: response.ok,
//     latencyMs: Date.now() - started,
//   })
//
// On an errored call, pass `ok: false` and omit/zero the usage.

// Minimal shape of a supabase-js client's insert path — avoids importing the
// full type here (each function pins its own supabase-js version).
interface InsertableClient {
  from(table: string): { insert(rows: unknown): Promise<{ error: unknown }> }
}

// Anthropic Messages API `usage` block (field names vary across cache betas;
// all optional and defaulted to 0).
export interface AnthropicUsage {
  input_tokens?: number
  output_tokens?: number
  cache_read_input_tokens?: number
  cache_creation_input_tokens?: number
}

export interface LogAiUsageArgs {
  fn: string
  model: string
  userId?: string | null
  usage?: AnthropicUsage | null
  ok?: boolean
  latencyMs?: number | null
}

export async function logAiUsage(client: InsertableClient, args: LogAiUsageArgs): Promise<void> {
  try {
    const u = args.usage ?? {}
    const { error } = await client.from("ai_usage").insert({
      fn: args.fn,
      model: args.model,
      user_id: args.userId ?? null,
      input_tokens: u.input_tokens ?? 0,
      output_tokens: u.output_tokens ?? 0,
      cache_read_tokens: u.cache_read_input_tokens ?? 0,
      cache_write_tokens: u.cache_creation_input_tokens ?? 0,
      ok: args.ok ?? true,
      latency_ms: args.latencyMs ?? null,
    })
    if (error) console.error("[aiUsage] insert failed", args.fn, error)
  } catch (err) {
    console.error("[aiUsage] logging error", args.fn, err)
  }
}
