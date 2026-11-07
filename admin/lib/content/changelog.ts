import "server-only"
import Anthropic from "@anthropic-ai/sdk"

const MODEL = process.env.CHANGELOG_MODEL || "claude-sonnet-4-5"

export function isChangelogAiAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

export interface DraftedChangelog {
  title: string
  highlights: string[]
  changelog: string
}

/**
 * Turn raw git commit text (one or more messages) into a clean changelog:
 * a short headline, user-facing highlight bullets, and a tidied internal
 * changelog. Two audiences in one pass — highlights read like App Store "What's
 * New", changelog is the fuller team-facing note.
 *
 * Throws if ANTHROPIC_API_KEY is unset — gate with isChangelogAiAvailable().
 */
export async function draftChangelog(commitText: string, version: string): Promise<DraftedChangelog> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set")

  const client = new Anthropic({ apiKey })
  const system = [
    "You turn raw git commit messages into a release changelog for grandma.app, a warm parenting companion.",
    "Produce two things:",
    "- highlights: 2–5 short, user-facing bullet points, written for parents (App Store 'What's New' voice). Warm, plain, benefit-first. No jargon, no commit prefixes (feat/fix/chore), no ticket ids.",
    "- changelog: a slightly fuller, tidy internal note grouping the changes (still readable, not raw commits).",
    "- title: one short headline (≤ 60 chars) capturing the release.",
    "Only describe what the commits actually say — do not invent features. If the commits are trivial (chores/bumps), say so plainly and keep highlights minimal or empty.",
  ].join("\n")

  const user = `Version: ${version}\n\nRaw commit message(s):\n${commitText.slice(0, 6000)}\n\nDraft the changelog by calling emit_changelog.`

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 1200,
    system,
    tools: [
      {
        name: "emit_changelog",
        description: "Return the drafted changelog.",
        input_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            highlights: { type: "array", items: { type: "string" } },
            changelog: { type: "string" },
          },
          required: ["title", "highlights", "changelog"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "emit_changelog" },
    messages: [{ role: "user", content: user }],
  })

  const toolUse = res.content.find((c): c is Anthropic.ToolUseBlock => c.type === "tool_use")
  if (!toolUse) throw new Error("Model did not return a changelog")
  const out = toolUse.input as { title?: unknown; highlights?: unknown; changelog?: unknown }
  return {
    title: typeof out.title === "string" ? out.title.trim().slice(0, 160) : "",
    highlights: Array.isArray(out.highlights)
      ? out.highlights.filter((h): h is string => typeof h === "string").map((h) => h.trim()).filter(Boolean).slice(0, 8)
      : [],
    changelog: typeof out.changelog === "string" ? out.changelog.trim().slice(0, 6000) : "",
  }
}
