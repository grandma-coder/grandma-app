import "server-only"
import Anthropic from "@anthropic-ai/sdk"

const MODEL = process.env.NEWS_RESEARCH_MODEL || "claude-sonnet-4-5"
const TITLE_MAX = 140
const SUMMARY_MAX = 240
const BODY_MAX = 4000

export function isResearchAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

export interface NewsSource {
  title: string
  url: string
}
export interface DraftNewsItem {
  title: string
  summary: string
  body: string
  sources: NewsSource[]
}

export interface ResearchInput {
  topic: string
  /** journey area, steers the framing */
  mode?: string
  /** how many items to draft (1–5) */
  count?: number
}

/**
 * Research a topic on the live web with Claude's web_search tool and return
 * drafted news items with REAL source URLs pulled from the search results.
 *
 * Two things make this safe for a health-adjacent feed:
 *  - warm, non-alarming, non-prescriptive tone enforced in the system prompt
 *    (mirrors the app's notification voice — no medical advice, no fear)
 *  - every item must carry the actual source URLs the search returned, so an
 *    admin reviews cited evidence before publishing.
 *
 * Throws if ANTHROPIC_API_KEY is unset — gate with isResearchAvailable().
 */
export async function researchNews(input: ResearchInput): Promise<DraftNewsItem[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set")

  const count = Math.min(Math.max(input.count ?? 3, 1), 5)
  const client = new Anthropic({ apiKey })

  const system = [
    "You research current, reputable information for grandma.app — a warm companion for people trying to conceive, expecting, and raising young kids.",
    "Use web search to find CURRENT, credible information on the requested topic. Prefer health authorities (ACOG, NHS, NICE, WHO, CDC, AAP), major medical centers, and reputable journalism. Avoid forums, ads, and low-quality sources.",
    "",
    "Then write short news/article items for parents. Rules:",
    "- Warm, plain, reassuring. Never alarmist. Never give medical advice or tell someone what to do with their body or baby — inform, don't prescribe.",
    "- No fear-mongering headlines. A parent should feel informed, not scared.",
    "- Every item MUST cite the real sources you found (title + URL). Do not invent URLs.",
    "- If you can't find credible current information, return fewer items rather than fabricating.",
    `- title ≤ ${TITLE_MAX} chars, summary ≤ ${SUMMARY_MAX} chars, body ≤ ${BODY_MAX} chars.`,
  ].join("\n")

  const user = [
    `Topic: ${input.topic}`,
    input.mode ? `Audience: ${input.mode} journey` : "",
    `Search the web, then draft ${count} news item(s) for parents on this topic.`,
    "Return them by calling emit_news with the items and their real sources.",
  ]
    .filter(Boolean)
    .join("\n")

  // web_search tool config is only typed under the beta namespace in this SDK
  // version; the stable Messages API accepts it at runtime. Cast to satisfy TS.
  const tools = [
    { type: "web_search_20250305", name: "web_search", max_uses: 6 },
    {
      name: "emit_news",
      description: "Return the drafted news items with their real sources.",
      input_schema: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                summary: { type: "string" },
                body: { type: "string" },
                sources: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: { title: { type: "string" }, url: { type: "string" } },
                    required: ["title", "url"],
                  },
                },
              },
              required: ["title", "summary", "body", "sources"],
            },
          },
        },
        required: ["items"],
      },
    },
  ] as unknown as Anthropic.Tool[]

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system,
    tools,
    messages: [{ role: "user", content: user }],
  })

  // Find the emit_news tool call in the final content.
  const toolUse = res.content.find(
    (c): c is Anthropic.ToolUseBlock => c.type === "tool_use" && c.name === "emit_news",
  )
  if (!toolUse) {
    // Model may have stopped to keep searching; not returning a draft is an
    // honest "no result" rather than a fabrication.
    return []
  }
  const out = toolUse.input as { items?: unknown }
  const items = Array.isArray(out.items) ? out.items : []

  const clean: DraftNewsItem[] = []
  for (const raw of items) {
    const it = raw as { title?: unknown; summary?: unknown; body?: unknown; sources?: unknown }
    const title = typeof it.title === "string" ? it.title.trim().slice(0, TITLE_MAX) : ""
    const summary = typeof it.summary === "string" ? it.summary.trim().slice(0, SUMMARY_MAX) : ""
    const body = typeof it.body === "string" ? it.body.trim().slice(0, BODY_MAX) : ""
    const sources: NewsSource[] = Array.isArray(it.sources)
      ? it.sources
          .map((s) => {
            const so = s as { title?: unknown; url?: unknown }
            return {
              title: typeof so.title === "string" ? so.title : "",
              url: typeof so.url === "string" ? so.url : "",
            }
          })
          .filter((s) => /^https?:\/\//.test(s.url))
      : []
    if (title && body) clean.push({ title, summary, body, sources })
  }
  return clean
}
