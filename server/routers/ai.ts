import { z } from "zod"
import { sql } from "drizzle-orm"
import { router, adminProcedure } from "../trpc"
import { db } from "@/db"
import { writeAudit } from "@/lib/audit"
import { costOf, PRICING, normalizeModel, type ModelPrice } from "@/lib/ai/pricing"

/**
 * AI cost — reads the `ai_usage` table the edge functions write on every Claude
 * call and turns token counts into dollar spend (priced at read time via
 * lib/ai/pricing). Admin-only: usage carries user_ids and is operationally
 * sensitive. Dormant-safe: an empty/absent table just yields zeros.
 */

interface TokenRow {
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cache_write_tokens: number
  [k: string]: unknown
}

function toCounts(r: Partial<TokenRow>) {
  return {
    inputTokens: Number(r.input_tokens ?? 0),
    outputTokens: Number(r.output_tokens ?? 0),
    cacheReadTokens: Number(r.cache_read_tokens ?? 0),
    cacheWriteTokens: Number(r.cache_write_tokens ?? 0),
  }
}

const rangeInput = z.object({ days: z.number().int().min(1).max(180).default(30) })

export const aiRouter = router({
  /** The pricing table the UI shows so the cost math is transparent. */
  pricing: adminProcedure.query((): Record<string, ModelPrice> => PRICING),

  /**
   * Cost dashboard over the last N days: headline totals, per-function and
   * per-model breakdowns (with cost), a daily series, and the top spenders.
   */
  overview: adminProcedure.input(rangeInput).query(async ({ ctx, input }) => {
    const days = input.days

    // Per (fn, model) token sums — cost is computed per model in JS so mixed
    // models in one function price correctly.
    const byFnModelRes = await db.execute<{ fn: string; model: string; calls: number; errors: number } & TokenRow>(sql`
      select fn, model,
             count(*)::int as calls,
             count(*) filter (where not ok)::int as errors,
             coalesce(sum(input_tokens),0)::bigint  as input_tokens,
             coalesce(sum(output_tokens),0)::bigint as output_tokens,
             coalesce(sum(cache_read_tokens),0)::bigint  as cache_read_tokens,
             coalesce(sum(cache_write_tokens),0)::bigint as cache_write_tokens
      from ai_usage
      where created_at >= now() - make_interval(days => ${days})
      group by fn, model
    `)
    const byFnModel = Array.from(byFnModelRes)

    // Fold to per-function and per-model, summing cost across models.
    const fnMap = new Map<string, { fn: string; calls: number; errors: number; cost: number; tokens: number }>()
    const modelMap = new Map<string, { model: string; calls: number; cost: number; tokens: number }>()
    let totalCost = 0
    let totalCalls = 0
    let totalErrors = 0
    let totalTokens = 0

    for (const r of byFnModel) {
      const counts = toCounts(r)
      const cost = costOf(r.model, counts)
      const tok = counts.inputTokens + counts.outputTokens + counts.cacheReadTokens + counts.cacheWriteTokens
      const calls = Number(r.calls)
      const errors = Number(r.errors)
      totalCost += cost
      totalCalls += calls
      totalErrors += errors
      totalTokens += tok

      const f = fnMap.get(r.fn) ?? { fn: r.fn, calls: 0, errors: 0, cost: 0, tokens: 0 }
      f.calls += calls
      f.errors += errors
      f.cost += cost
      f.tokens += tok
      fnMap.set(r.fn, f)

      const mk = normalizeModel(r.model)
      const m = modelMap.get(mk) ?? { model: mk, calls: 0, cost: 0, tokens: 0 }
      m.calls += calls
      m.cost += cost
      m.tokens += tok
      modelMap.set(mk, m)
    }

    // Daily cost series — group by day+model so each day prices correctly.
    const dailyRes = await db.execute<{ day: string; model: string } & TokenRow>(sql`
      select created_at::date::text as day, model,
             coalesce(sum(input_tokens),0)::bigint  as input_tokens,
             coalesce(sum(output_tokens),0)::bigint as output_tokens,
             coalesce(sum(cache_read_tokens),0)::bigint  as cache_read_tokens,
             coalesce(sum(cache_write_tokens),0)::bigint as cache_write_tokens
      from ai_usage
      where created_at >= now() - make_interval(days => ${days})
      group by day, model
      order by day
    `)
    const dayMap = new Map<string, number>()
    for (const r of Array.from(dailyRes)) {
      dayMap.set(r.day, (dayMap.get(r.day) ?? 0) + costOf(r.model, toCounts(r)))
    }
    const daily = Array.from(dayMap.entries()).map(([day, cost]) => ({ day, cost: Number(cost.toFixed(4)) }))

    // Top spenders (by cost) — join to profiles for an email label.
    const topRes = await db.execute<{ user_id: string; email: string | null; model: string; calls: number } & TokenRow>(sql`
      select u.user_id, p.email, u.model, u.calls,
             u.input_tokens, u.output_tokens, u.cache_read_tokens, u.cache_write_tokens
      from (
        select user_id, model,
               count(*)::int as calls,
               coalesce(sum(input_tokens),0)::bigint  as input_tokens,
               coalesce(sum(output_tokens),0)::bigint as output_tokens,
               coalesce(sum(cache_read_tokens),0)::bigint  as cache_read_tokens,
               coalesce(sum(cache_write_tokens),0)::bigint as cache_write_tokens
        from ai_usage
        where created_at >= now() - make_interval(days => ${days}) and user_id is not null
        group by user_id, model
      ) u
      left join profiles p on p.id = u.user_id
    `)
    const spenderMap = new Map<string, { userId: string; email: string | null; calls: number; cost: number }>()
    for (const r of Array.from(topRes)) {
      const s = spenderMap.get(r.user_id) ?? { userId: r.user_id, email: r.email, calls: 0, cost: 0 }
      s.calls += Number(r.calls)
      s.cost += costOf(r.model, toCounts(r))
      spenderMap.set(r.user_id, s)
    }
    const topUsers = Array.from(spenderMap.values())
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 15)
      .map((s) => ({ ...s, cost: Number(s.cost.toFixed(4)) }))

    await writeAudit({
      actorEmail: ctx.userEmail ?? "unknown",
      action: "ai.overview.view",
      meta: { days, totalCalls, totalCost: Number(totalCost.toFixed(2)) },
    })

    return {
      days,
      hasData: totalCalls > 0,
      totals: {
        cost: Number(totalCost.toFixed(2)),
        calls: totalCalls,
        errors: totalErrors,
        tokens: totalTokens,
        errorRate: totalCalls ? totalErrors / totalCalls : 0,
      },
      byFunction: Array.from(fnMap.values())
        .map((f) => ({ ...f, cost: Number(f.cost.toFixed(4)) }))
        .sort((a, b) => b.cost - a.cost),
      byModel: Array.from(modelMap.values())
        .map((m) => ({ ...m, cost: Number(m.cost.toFixed(4)) }))
        .sort((a, b) => b.cost - a.cost),
      daily,
      topUsers,
    }
  }),
})
