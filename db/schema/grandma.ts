import { pgTable, uuid, text, timestamp, date, jsonb } from "drizzle-orm/pg-core"

/**
 * Drizzle definitions for grandma-app's EXISTING tables that the command center
 * READS. These mirror grandma's live schema — the center never migrates them.
 *
 * Start minimal (just `profiles`) to prove the connection in Phase 1; Phase 3
 * (Users pillar) extends this with behaviors / push_tokens / *_logs / children
 * + an auth.users view, after confirming exact column names via
 * `drizzle-kit introspect`.
 *
 * NOTE: `profiles.id` IS the auth user UUID (there is no `user_id` column on
 * profiles). Filter `.eq(profiles.id, userId)`.
 */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  name: text("name"),
  journeyMode: text("journey_mode"),
  subscriptionTier: text("subscription_tier"),
  language: text("language"),
  dueDate: date("due_date"),
  notificationPrefs: jsonb("notification_prefs"),
  privacySettings: jsonb("privacy_settings"),
  createdAt: timestamp("created_at", { withTimezone: true }),
})
