import { pgTable, uuid, text, timestamp, jsonb, integer, boolean } from "drizzle-orm/pg-core"

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
  behavior: text("behavior").notNull().default("general"),
  status: text("status").notNull().default("planned"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by"),
})

export const notificationCopySettings = pgTable("notification_copy_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by"),
})

export const contentDailyQuestions = pgTable("content_daily_questions", {
  id: text("id").primaryKey(),
  mode: text("mode").notNull(),
  prompt: text("prompt").notNull(),
  options: jsonb("options").notNull().default([]),
  active: boolean("active").notNull().default(true),
  sort: integer("sort").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by"),
})

export const contentBirthTopics = pgTable("content_birth_topics", {
  key: text("key").primaryKey(),
  emoji: text("emoji").notNull().default(""),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull().default(""),
  heroColor: text("hero_color"),
  heroBorder: text("hero_border"),
  disclaimer: text("disclaimer"),
  sections: jsonb("sections").notNull().default([]),
  sources: jsonb("sources").notNull().default([]),
  active: boolean("active").notNull().default(true),
  sort: integer("sort").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by"),
})

export const contentSources = pgTable("content_sources", {
  key: text("key").primaryKey(),
  org: text("org").notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  topic: text("topic"),
  active: boolean("active").notNull().default(true),
  sort: integer("sort").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by"),
})

export const contentNews = pgTable("content_news", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  summary: text("summary"),
  body: text("body").notNull(),
  topic: text("topic"),
  mode: text("mode"),
  sources: jsonb("sources").notNull().default([]),
  status: text("status").notNull().default("draft"),
  imageUrl: text("image_url"),
  createdBy: text("created_by"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const betaTesters = pgTable("beta_testers", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  platform: text("platform").notNull().default("both"),
  note: text("note"),
  invitedBy: text("invited_by"),
  invitedAt: timestamp("invited_at", { withTimezone: true }).notNull().defaultNow(),
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
