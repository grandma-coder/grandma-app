import { pgTable, uuid, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core"

export const NOTIFICATION_STATUSES = [
  "draft",
  "scheduled",
  "sending",
  "sent",
  "cancelled",
  "failed",
] as const
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number]

/**
 * Tables OWNED by the command center (created via migrations/ into grandma's
 * Supabase, but center-only).
 */
export const adminAuditLog = pgTable("admin_audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorEmail: text("actor_email").notNull(),
  action: text("action").notNull(),
  target: text("target"),
  meta: jsonb("meta"),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
})

export const pushCampaigns = pgTable("push_campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  category: text("category").notNull().default("broadcast"),
  deepLink: text("deep_link"),
  data: jsonb("data"),
  targetType: text("target_type").notNull().default("all"),
  targetUserIds: uuid("target_user_ids").array().notNull().default([]),
  status: text("status").notNull().default("draft"),
  sentCount: integer("sent_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  skippedOptoutCount: integer("skipped_optout_count").notNull().default(0),
  createdBy: text("created_by"),
  errorMessage: text("error_message"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  cronAttempts: integer("cron_attempts").notNull().default(0),
  cronLastError: text("cron_last_error"),
  cronProcessedAt: timestamp("cron_processed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
})

export const notificationTemplates = pgTable("notification_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull().unique(),
  titleTemplate: text("title_template").notNull(),
  bodyTemplate: text("body_template").notNull(),
  description: text("description"),
  variables: text("variables").array().notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by"),
})

export const notificationCopySettings = pgTable("notification_copy_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by"),
})

export const pushRecipients = pgTable("push_recipients", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id").notNull(),
  userId: uuid("user_id"),
  token: text("token"),
  status: text("status").notNull().default("ok"),
  ticketId: text("ticket_id"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})
