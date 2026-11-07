import { z } from "zod"
import { router, adminProcedure } from "../trpc"
import { listIssues } from "@/lib/sentry-api"
import { writeAudit } from "@/lib/audit"

/**
 * Sentry crash-triage — read-only. Admin-only: crash payloads can contain
 * sensitive context, so this sits behind adminProcedure. Every listing is
 * audit-logged (who looked at crashes, over what window).
 */
export const sentryRouter = router({
  issues: adminProcedure
    .input(
      z.object({
        statsPeriod: z.enum(["24h", "7d", "14d"]).default("24h"),
        query: z.string().max(200).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const result = await listIssues({ statsPeriod: input.statsPeriod, query: input.query })
      await writeAudit({
        actorEmail: ctx.userEmail ?? "unknown",
        action: "sentry.issues.view",
        meta: { statsPeriod: input.statsPeriod, count: result.issues.length },
      })
      return result
    }),
})
