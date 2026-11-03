import { z } from "zod"
import { router, protectedProcedure, piiProcedure } from "../trpc"
import { revenueCatConfigured, fetchRevenueOverview, fetchCustomer } from "@/lib/revenuecat/client"
import { writeAudit } from "@/lib/audit"

/**
 * Revenue — real billing from RevenueCat (what Apple/Google actually charged),
 * the source of truth beside the metrics overview's estimated-MRR proxy.
 * Read-only: nothing here writes to RevenueCat. Project-level overview is
 * viewer+; a per-customer subscription lookup is billing PII → admin + audited.
 */
export const revenueRouter = router({
  /** Connection state — drives the setup card vs. the live dashboard. */
  status: protectedProcedure.query(() => ({ configured: revenueCatConfigured })),

  /** Live project overview metrics (active subs, MRR, revenue, trials, …). */
  overview: protectedProcedure.query(async () => {
    return fetchRevenueOverview()
  }),

  /**
   * One user's real subscription state, keyed by their Supabase auth UUID
   * (which is the RevenueCat App User ID for grandma). Billing PII → admin +
   * audited at the call site.
   */
  customer: piiProcedure
    .input(z.object({ appUserId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const result = await fetchCustomer(input.appUserId)
      await writeAudit({
        actorEmail: ctx.userEmail ?? "unknown",
        action: "revenue.customer.view",
        target: input.appUserId,
        meta: { found: result.found, entitlements: result.entitlements.length },
      })
      return result
    }),
})
