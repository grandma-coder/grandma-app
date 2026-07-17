import "server-only"
import { sql } from "drizzle-orm"
import { db } from "@/db"

/**
 * Push categories → the consent gate each respects. This is grandma's advantage
 * over Aura's single global boolean: content categories map to the matching
 * notification_prefs toggle; a `broadcast` (marketing) respects the separate
 * privacy_settings.marketing flag. See EXECUTION_PLAN category→gate table.
 */
export type PushCategory =
  | "broadcast"
  | "insights"
  | "appointments"
  | "cycle"
  | "milestones"
  | "care_circle"
  | "reminder"

type Prefs = Record<string, unknown> | null
type Privacy = Record<string, unknown> | null

/** True if the user has NOT opted out of this category. Defaults to opted-IN
 *  for content categories (a missing toggle means "not disabled"); broadcast
 *  requires an explicit privacy_settings.marketing === true. */
export function isOptedIn(category: PushCategory, prefs: Prefs, privacy: Privacy): boolean {
  const p = prefs ?? {}
  switch (category) {
    case "broadcast":    return (privacy ?? {}).marketing === true
    case "insights":     return p.insights !== false
    case "appointments": return p.appointments !== false
    case "cycle":        return p.cycle_predictions !== false
    case "milestones":   return p.milestones !== false
    case "care_circle":  return p.care_circle !== false
    case "reminder":     return p.daily_reminder !== false
  }
}

export interface ResolveResult {
  tokens: string[]
  skippedOptOut: number
}

type TokenRow = {
  token: string
  notification_prefs: Prefs
  privacy_settings: Privacy
  [key: string]: unknown
}

/**
 * Resolve active Expo tokens for a target audience, applying the category
 * consent filter. `target` is either all users or an explicit user-id list.
 * Returns opted-in tokens + a count of opted-out recipients (for reporting).
 */
export async function resolveTokens(
  target: { type: "all" } | { type: "users"; userIds: string[] },
  category: PushCategory,
): Promise<ResolveResult> {
  const userFilter =
    target.type === "users"
      ? sql`and t.user_id = any(${sql`array[${sql.join(target.userIds.map((id) => sql`${id}::uuid`), sql`, `)}]`})`
      : sql``

  // Empty user list → nothing to send.
  if (target.type === "users" && target.userIds.length === 0) {
    return { tokens: [], skippedOptOut: 0 }
  }

  const rows = await db.execute<TokenRow>(sql`
    select t.token, p.notification_prefs, p.privacy_settings
    from push_tokens t
    join profiles p on p.id = t.user_id
    where t.is_active ${userFilter}
  `)

  const tokens: string[] = []
  let skippedOptOut = 0
  for (const r of Array.from(rows)) {
    if (isOptedIn(category, r.notification_prefs, r.privacy_settings)) tokens.push(r.token)
    else skippedOptOut += 1
  }
  return { tokens, skippedOptOut }
}
