import { z } from "zod"
import { sql, type SQL } from "drizzle-orm"
import { WAITLIST_MODES, WAITLIST_LOCALES, WAITLIST_COUNTRIES } from "@/db/schema"

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")

export const waitlistFilterSchema = z.object({
  mode: z.enum(WAITLIST_MODES).optional(),
  locale: z.enum(WAITLIST_LOCALES).optional(),
  country: z.enum(WAITLIST_COUNTRIES).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  invited: z.enum(["all", "invited", "pending"]).default("all"),
  q: z.string().trim().max(120).optional(),
})
export type WaitlistFilter = z.infer<typeof waitlistFilterSchema>

export interface WaitlistRowOut {
  id: string
  email: string
  name: string | null
  mode: string
  locale: string
  country: string
  notifyLaunch: boolean
  utmSource: string | null
  createdAt: string
  invitedAt: string | null
  signedUp: boolean
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`)

/** WHERE clause over `public.waitlist w`. Always starts with `where`. */
export function buildWaitlistWhere(f: WaitlistFilter): SQL {
  const parts: SQL[] = []
  if (f.mode) parts.push(sql`w.mode = ${f.mode}`)
  if (f.locale) parts.push(sql`w.locale = ${f.locale}`)
  if (f.country) parts.push(sql`w.country = ${f.country}`)
  if (f.from) parts.push(sql`w.created_at >= ${f.from}::date`)
  if (f.to) parts.push(sql`w.created_at < (${f.to}::date + 1)`)
  if (f.invited === "invited") parts.push(sql`w.invited_at is not null`)
  if (f.invited === "pending") parts.push(sql`w.invited_at is null`)
  if (f.q) {
    const like = `%${escapeLike(f.q)}%`
    parts.push(sql`(w.email ilike ${like} or w.name ilike ${like})`)
  }
  return parts.length === 0 ? sql`where true` : sql`where ${sql.join(parts, sql` and `)}`
}

const COLS: [string, (r: WaitlistRowOut) => string | boolean | null][] = [
  ["email", (r) => r.email], ["name", (r) => r.name], ["mode", (r) => r.mode], ["locale", (r) => r.locale],
  ["country", (r) => r.country], ["notify_launch", (r) => r.notifyLaunch], ["utm_source", (r) => r.utmSource],
  ["created_at", (r) => r.createdAt], ["invited_at", (r) => r.invitedAt], ["signed_up", (r) => r.signedUp],
]

function cell(v: string | boolean | null): string {
  if (v === null) return ""
  let s = String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}` // OWASP CSV-injection guard
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`
  return s
}

export function toCsv(rows: WaitlistRowOut[]): string {
  return [COLS.map(([h]) => h).join(","), ...rows.map((r) => COLS.map(([, g]) => cell(g(r))).join(","))].join("\r\n")
}
