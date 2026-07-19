import { z } from "zod"
import { eq } from "drizzle-orm"
import { router, protectedProcedure, adminProcedure } from "../trpc"
import { db } from "@/db"
import { notificationCopySettings } from "@/db/schema"
import { DEFAULT_SUGGEST_SYSTEM_PROMPT } from "@/lib/notifications/default-suggest-prompt"
import { suggestCopy, isSuggestAvailable } from "@/lib/notifications/suggest"
import { writeAudit } from "@/lib/audit"

const PROMPT_KEY = "suggest_system_prompt"
const MAX_PROMPT = 10_000

/**
 * AI copy settings — the editable "suggest copy" system prompt + the Suggest
 * endpoint itself. Absence of the DB row = use the built-in grandma default.
 * Ported from Aura's notification-copy-settings + suggest-copy routes.
 */
export const notificationCopyRouter = router({
  /**
   * Current effective prompt state. Viewer+ may read it (so they can see how
   * copy is generated); editing is admin-only.
   */
  getSettings: protectedProcedure.query(async () => {
    const [row] = await db
      .select()
      .from(notificationCopySettings)
      .where(eq(notificationCopySettings.key, PROMPT_KEY))
    return {
      suggestSystemPrompt: row?.value ?? "",
      updatedAt: row?.updatedAt ?? null,
      updatedBy: row?.updatedBy ?? null,
      defaultSuggestSystemPrompt: DEFAULT_SUGGEST_SYSTEM_PROMPT,
      suggestAvailable: isSuggestAvailable(),
    }
  }),

  /**
   * Save the override prompt. Empty (or equal-to-default) → delete the row,
   * reverting to the built-in default. Admin only + audited.
   */
  setPrompt: adminProcedure
    .input(z.object({ suggestSystemPrompt: z.string().max(MAX_PROMPT) }))
    .mutation(async ({ ctx, input }) => {
      const trimmed = input.suggestSystemPrompt.trim()

      if (trimmed.length === 0 || trimmed === DEFAULT_SUGGEST_SYSTEM_PROMPT.trim()) {
        await db.delete(notificationCopySettings).where(eq(notificationCopySettings.key, PROMPT_KEY))
        await writeAudit({ actorEmail: ctx.userEmail ?? "unknown", action: "notification.copy_prompt.reset" })
        return { suggestSystemPrompt: "", updatedAt: null }
      }

      const [row] = await db
        .insert(notificationCopySettings)
        .values({ key: PROMPT_KEY, value: trimmed, updatedBy: ctx.userEmail ?? "unknown" })
        .onConflictDoUpdate({
          target: notificationCopySettings.key,
          set: { value: trimmed, updatedAt: new Date(), updatedBy: ctx.userEmail ?? "unknown" },
        })
        .returning()
      await writeAudit({ actorEmail: ctx.userEmail ?? "unknown", action: "notification.copy_prompt.set" })
      return { suggestSystemPrompt: row.value, updatedAt: row.updatedAt }
    }),

  /**
   * Draft copy with Claude. Admin only (it's a compose aid for a privileged
   * send). Uses the DB override prompt when present, else the default.
   */
  suggest: adminProcedure
    .input(
      z.object({
        brief: z.string().min(1).max(400),
        vibe: z.string().max(120).optional(),
        excludeTitles: z.array(z.string().max(200)).max(10).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      if (!isSuggestAvailable()) {
        return { available: false as const, title: "", body: "" }
      }
      const [row] = await db
        .select()
        .from(notificationCopySettings)
        .where(eq(notificationCopySettings.key, PROMPT_KEY))
      const result = await suggestCopy({
        systemPrompt: row?.value ?? null,
        brief: input.brief,
        vibe: input.vibe,
        excludeTitles: input.excludeTitles,
      })
      return { available: true as const, ...result }
    }),
})
