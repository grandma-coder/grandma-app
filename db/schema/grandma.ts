import { pgTable, uuid, text, timestamp, date, jsonb, boolean } from "drizzle-orm/pg-core"

/**
 * Drizzle definitions for grandma-app's EXISTING tables that the command center
 * READS. Column names verified against the live schema via introspection — the
 * center never migrates these.
 *
 * NOTE: `profiles.id` IS the auth user UUID (there is no `user_id` on profiles),
 * and email lives right on `profiles` (no auth.users join needed).
 */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email"),
  name: text("name"),
  journeyMode: text("journey_mode"),
  subscriptionTier: text("subscription_tier"),
  subscriptionStatus: text("subscription_status"),
  language: text("language"),
  countryCode: text("country_code"),
  dob: date("dob"),
  dueDate: date("due_date"),
  photoUrl: text("photo_url"),
  location: text("location"),
  notificationPrefs: jsonb("notification_prefs"),
  privacySettings: jsonb("privacy_settings"),
  consentedAt: timestamp("consented_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }),
})

export const behaviors = pgTable("behaviors", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id"),
  type: text("type"),
  active: boolean("active"),
  createdAt: timestamp("created_at", { withTimezone: true }),
})

export const pushTokens = pgTable("push_tokens", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id"),
  token: text("token"),
  platform: text("platform"),
  deviceName: text("device_name"),
  isActive: boolean("is_active"),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }),
})

// ─── Activity-signal tables (used for last-active + log counts) ──────────────

export const childLogs = pgTable("child_logs", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id"),
  childId: uuid("child_id"),
  createdAt: timestamp("created_at", { withTimezone: true }),
})

export const cycleLogs = pgTable("cycle_logs", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }),
})

export const pregnancyLogs = pgTable("pregnancy_logs", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }),
})

export const channelPosts = pgTable("channel_posts", {
  id: uuid("id").primaryKey(),
  authorId: uuid("author_id"),
  createdAt: timestamp("created_at", { withTimezone: true }),
})

export const children = pgTable("children", {
  id: uuid("id").primaryKey(),
  parentId: uuid("parent_id"),
  name: text("name"),
  birthDate: date("birth_date"),
  createdAt: timestamp("created_at", { withTimezone: true }),
})
