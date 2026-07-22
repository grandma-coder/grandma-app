import "server-only"
import { eq, sql } from "drizzle-orm"
import { db } from "@/db"
import { pushCampaigns, pushRecipients } from "@/db/schema"
import { resolveTokens, type PushCategory } from "@/lib/expo/resolve-tokens"
import { sendPushBatch } from "@/lib/expo/send-push-batch"
import { deactivateTokens } from "@/lib/expo/deactivate-tokens"

export interface DeliverResult {
  sent: number
  failed: number
  skipped: number
}

interface DeliverOpts {
  /** Statuses a campaign may be in for delivery to proceed. */
  allowStatuses: readonly string[]
}

/**
 * Deliver one campaign to its audience. Single source of truth for the send
 * pipeline, shared by the manual send (push.sendCampaign) and the scheduled
 * dispatcher (/api/cron/dispatch). Steps:
 *   1. atomically flip → sending (only from an allowed status; guards double-send)
 *   2. resolve audience tokens with the category consent filter
 *   3. sendPushBatch to Expo
 *   4. write a push_recipients row per token + a `notifications` row per
 *      recipient (so it shows in the app's in-app feed)
 *   5. deactivate any dead tokens Expo reported
 *   6. record sent/failed/skipped counts, flip → sent (or failed)
 *
 * Throws on hard failure after marking the campaign failed; callers audit-log
 * the returned result.
 */
export async function deliverCampaign(campaignId: string, opts: DeliverOpts): Promise<DeliverResult> {
  const statusList = sql.join(
    opts.allowStatuses.map((s) => sql`${s}`),
    sql`, `,
  )

  // 1. Claim the campaign atomically — only from an allowed status.
  const claimed = await db.execute<{
    id: string
    title: string
    body: string
    category: string
    deep_link: string | null
    target_type: string
    target_user_ids: string[]
  }>(sql`
    update push_campaigns
    set status = 'sending', cron_processed_at = now()
    where id = ${campaignId} and status in (${statusList})
    returning id, title, body, category, deep_link, target_type, target_user_ids
  `)
  const campaign = Array.from(claimed)[0]
  if (!campaign) {
    // Either already claimed (concurrent send) or in a non-sendable state.
    throw new Error("Campaign not found or not in a sendable state")
  }

  try {
    // 2. Resolve audience with consent filter.
    const target =
      campaign.target_type === "users"
        ? { type: "users" as const, userIds: campaign.target_user_ids ?? [] }
        : { type: "all" as const }
    const { tokens, skippedOptOut } = await resolveTokens(target, campaign.category as PushCategory)

    // 3. Pre-create a recipient row per token (before sending) so each push can
    //    carry its own recipientId in the data payload — that's the handle the
    //    app reports back on tap (notification-opened) to close the open funnel.
    let recipients: { id: string; token: string | null }[] = []
    if (tokens.length) {
      recipients = await db
        .insert(pushRecipients)
        .values(tokens.map((token) => ({ campaignId: campaign.id, token, status: "ok" as const })))
        .returning({ id: pushRecipients.id, token: pushRecipients.token })
    }

    // 4. Send — each message tagged with its recipientId for open-tracking.
    const baseData: Record<string, unknown> = { category: campaign.category }
    if (campaign.deep_link) baseData.url = campaign.deep_link
    const result = await sendPushBatch(
      recipients.map((r) => ({
        to: r.token ?? "",
        title: campaign.title,
        body: campaign.body,
        data: { ...baseData, recipientId: r.id },
      })),
    )

    // 4b. Backfill each recipient with its ticket outcome.
    for (let i = 0; i < recipients.length; i++) {
      const tk = result.tickets[i]
      await db
        .update(pushRecipients)
        .set({
          status: tk?.status === "ok" ? "ok" : "error",
          ticketId: tk?.id ?? null,
          error: tk?.status === "error" ? tk.message ?? tk.details?.error ?? "error" : null,
        })
        .where(eq(pushRecipients.id, recipients[i].id))
    }
    // In-app feed: one notifications row per targeted token's user.
    await db.execute(sql`
      insert into notifications (user_id, title, body, type)
      select distinct t.user_id, ${campaign.title}, ${campaign.body}, 'push'
      from push_tokens t
      where t.is_active and t.token = any(${sql`array[${tokens.length ? sql.join(tokens.map((t) => sql`${t}`), sql`, `) : sql`null`}]::text[]`})
    `)

    // 5. Prune dead tokens.
    if (result.terminalTokens.length) await deactivateTokens(result.terminalTokens)

    // 6. Record + finalize.
    await db
      .update(pushCampaigns)
      .set({
        status: "sent",
        sentCount: result.okCount,
        failedCount: result.errorCount,
        skippedOptoutCount: skippedOptOut,
        errorMessage: result.errorCount > 0 ? `${result.errorCount} of ${tokens.length} messages failed` : null,
        cronLastError: null,
        sentAt: new Date(),
      })
      .where(eq(pushCampaigns.id, campaign.id))

    return { sent: result.okCount, failed: result.errorCount, skipped: skippedOptOut }
  } catch (err) {
    const message = err instanceof Error ? err.message : "send failed"
    await db
      .update(pushCampaigns)
      .set({ status: "failed", errorMessage: message, cronLastError: message })
      .where(eq(pushCampaigns.id, campaign.id))
    throw err
  }
}
