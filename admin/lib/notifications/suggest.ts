import "server-only"
import Anthropic from "@anthropic-ai/sdk"
import { DEFAULT_SUGGEST_SYSTEM_PROMPT } from "./default-suggest-prompt"

const TITLE_MAX = 100
const BODY_MAX = 500
// Fast, capable text model — matches grandma's edge-function default tier.
const MODEL = process.env.NOTIFICATION_COPY_MODEL || "claude-sonnet-4-5"

export function isSuggestAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

export interface SuggestInput {
  /** Optional override system prompt (from notification_copy_settings). */
  systemPrompt?: string | null
  /** What the notification is about (free text the admin types). */
  brief: string
  /** Tone/vibe hint (optional). */
  vibe?: string
  /** Titles already generated this session — ask for a fresh angle. */
  excludeTitles?: string[]
}

export interface Suggestion {
  title: string
  body: string
}

/**
 * Draft one push notification (title + body) with Claude, using the effective
 * system prompt (DB override or built-in grandma default) plus a hard-limits
 * appendix. Structured output is forced via a tool call so we always get a
 * clean {title, body}. Ported from Aura's suggest-copy route.
 *
 * Throws if ANTHROPIC_API_KEY is unset — callers should gate on
 * isSuggestAvailable() first.
 */
export async function suggestCopy(input: SuggestInput): Promise<Suggestion> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set")

  const base = input.systemPrompt?.trim() || DEFAULT_SUGGEST_SYSTEM_PROMPT
  const system = `${base}\n\n---\n\nHard limits enforced by the platform: title must be ${TITLE_MAX} characters or fewer, body must be ${BODY_MAX} characters or fewer.`

  const lines: string[] = []
  lines.push(`What this notification is about: ${input.brief.trim()}`)
  if (input.vibe?.trim()) lines.push(`Tone / vibe the admin wants: ${input.vibe.trim()}`)
  if (input.excludeTitles?.length) {
    lines.push(
      "You have already generated these titles. Pick a fresh angle — different hook, different shape, different energy:",
    )
    for (const t of input.excludeTitles) lines.push(`- ${t}`)
  }
  lines.push("Write one push notification (title + body).")

  const client = new Anthropic({ apiKey })
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    temperature: 1,
    system,
    tools: [
      {
        name: "emit_notification",
        description: "Return the drafted push notification.",
        input_schema: {
          type: "object",
          properties: {
            title: { type: "string", description: `The title, ${TITLE_MAX} chars or fewer.` },
            body: { type: "string", description: `The body, ${BODY_MAX} chars or fewer.` },
          },
          required: ["title", "body"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "emit_notification" },
    messages: [{ role: "user", content: lines.join("\n") }],
  })

  const toolUse = res.content.find((c): c is Anthropic.ToolUseBlock => c.type === "tool_use")
  if (!toolUse) throw new Error("Model did not return a suggestion")
  const out = toolUse.input as { title?: unknown; body?: unknown }
  const title = typeof out.title === "string" ? out.title.trim().slice(0, TITLE_MAX) : ""
  const body = typeof out.body === "string" ? out.body.trim().slice(0, BODY_MAX) : ""
  if (!title || !body) throw new Error("Model returned an empty suggestion")
  return { title, body }
}
