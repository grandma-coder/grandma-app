import "server-only"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

/**
 * Privileged Drizzle client over grandma's Supabase Postgres.
 *
 * Uses the Supabase POOLER connection string (transaction mode, port 6543) with
 * a service-role credential — this bypasses RLS BY DESIGN so the command center
 * can read across all users. It is server-only (see `import "server-only"`) and
 * must never reach the browser bundle.
 *
 * `prepare: false` is REQUIRED against Supabase's transaction-mode pooler:
 * prepared statements aren't supported there and will error otherwise.
 *
 * Lazy singleton behind a Proxy (mother-internal-dashboard pattern): the client
 * is created on first use, not at module load, so importing this file in an env
 * without DATABASE_URL (e.g. a type-check) doesn't throw.
 */

const DATABASE_URL = process.env.DATABASE_URL

let _db: ReturnType<typeof drizzle<typeof schema>> | undefined

function getDb() {
  if (!_db) {
    if (!DATABASE_URL) throw new Error("DATABASE_URL is not set")
    const client = postgres(DATABASE_URL, { prepare: false })
    _db = drizzle(client, { schema })
  }
  return _db
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop: string | symbol) {
    return Reflect.get(getDb(), prop)
  },
})

export type DB = typeof db
