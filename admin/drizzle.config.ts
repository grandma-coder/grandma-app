import { defineConfig } from "drizzle-kit"

/**
 * Drizzle Kit config for introspection + migrations against grandma's Supabase.
 *
 * schemaFilter includes BOTH `public` (grandma's app tables + the center-owned
 * tables) AND `auth` — the command center reads `auth.users` for user emails,
 * which the service-role credential is permitted to see.
 */
export default defineConfig({
  schema: "./db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  schemaFilter: ["public", "auth"],
  verbose: true,
  strict: true,
})
