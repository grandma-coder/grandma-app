import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core"

/**
 * Tables OWNED by the command center (created via migrations/ into grandma's
 * Supabase, but center-only). Grows as phases land: metrics_daily,
 * push_campaigns, push_recipients come later.
 */
export const adminAuditLog = pgTable("admin_audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorEmail: text("actor_email").notNull(),
  action: text("action").notNull(),
  target: text("target"),
  meta: jsonb("meta"),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
})
