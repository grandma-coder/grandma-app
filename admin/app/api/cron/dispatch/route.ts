import { NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { db } from "@/db"
import { deliverCampaign } from "@/lib/notifications/deliver"
import { writeAudit } from "@/lib/audit"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Scheduled-notification dispatcher. Vercel Cron hits this every minute (see
 * vercel.json). Two phases, ported from Aura's process_scheduled_admin_pushes():
 *
 *   1. Stuck recovery — any campaign in 'sending' for > 5 min is marked 'failed'
 *      (catches a dispatcher crash/timeout mid-send).
 *   2. Dispatch due — any campaign 'scheduled' with scheduled_at <= now() is
 *      delivered via the shared deliverCampaign pipeline, which atomically
 *      claims it (scheduled → sending) so a double-tick can't double-send.
 *
 * Auth: Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. If CRON_SECRET
 * is unset, the route refuses to run (fail-closed) rather than exposing an open
 * send trigger.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 })
  }
  const auth = req.headers.get("authorization")
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  // Phase 1 — recover stuck 'sending' campaigns (> 5 min). We key off
  // cron_processed_at (stamped when deliverCampaign claims a row) and fall back
  // to created_at for a row claimed by a path that didn't stamp it.
  const recovered = await db.execute<{ id: string }>(sql`
    update push_campaigns
    set status = 'failed',
        error_message = coalesce(error_message, 'Stuck in sending — auto-recovered'),
        cron_last_error = 'Stuck in sending — auto-recovered'
    where status = 'sending'
      and coalesce(cron_processed_at, created_at) < now() - interval '5 minutes'
    returning id
  `)
  const recoveredIds = Array.from(recovered).map((r) => r.id)

  // Phase 2 — find due scheduled campaigns.
  const due = await db.execute<{ id: string }>(sql`
    select id from push_campaigns
    where status = 'scheduled' and scheduled_at is not null and scheduled_at <= now()
    order by scheduled_at asc
    limit 25
  `)
  const dueIds = Array.from(due).map((r) => r.id)

  const results: { id: string; ok: boolean; sent?: number; failed?: number; error?: string }[] = []
  for (const id of dueIds) {
    try {
      const r = await deliverCampaign(id, { allowStatuses: ["scheduled"] })
      results.push({ id, ok: true, sent: r.sent, failed: r.failed })
    } catch (e) {
      results.push({ id, ok: false, error: e instanceof Error ? e.message : "failed" })
    }
  }

  if (dueIds.length || recoveredIds.length) {
    await writeAudit({
      actorEmail: "system:cron",
      action: "push.cron.dispatch",
      meta: { dispatched: dueIds.length, recovered: recoveredIds.length },
    })
  }

  return NextResponse.json({
    recovered: recoveredIds.length,
    dispatched: dueIds.length,
    results,
  })
}
