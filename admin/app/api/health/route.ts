import { db } from "@/db"
import { profiles } from "@/db/schema"
import { count } from "drizzle-orm"
import { NextResponse } from "next/server"

/**
 * Health probe — proves the privileged connection to grandma's Postgres works.
 * Returns the live profiles count. This is the Phase 1 exit criterion.
 *
 * Public route (excluded from the Clerk gate in middleware) so it can be
 * checked without a session; it exposes only a count, no PII.
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const [row] = await db.select({ value: count() }).from(profiles)
    return NextResponse.json({ ok: true, profiles: row?.value ?? 0 })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 500 },
    )
  }
}
