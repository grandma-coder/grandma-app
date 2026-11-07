// Pure metric shapers — adapted from Aura's lib/reporting/transforms.ts.
// SQL returns raw rows; these shape them; the router returns JSON. Kept pure so
// they're trivially unit-testable and reusable across pillars.

/** Percentage num/den, rounded to 1 decimal. Null on zero denominator. */
export function ratePct(num: number, den: number): number | null {
  return den === 0 ? null : Math.round((num / den) * 1000) / 10
}

/** Week-over-week (or window-over-window) delta %, 1 decimal. Null when prior is 0. */
export function wowPct(cur: number, prior: number): number | null {
  return prior === 0 ? null : Math.round(((cur - prior) / prior) * 1000) / 10
}

export interface DayRow {
  day: string
  dau: number
  newSignups: number
}

/**
 * Gap-fill a daily series so every day in [since, until] has a row (zeros where
 * the query returned nothing) — charts then have no holes.
 */
export function gapFillDaily(rows: DayRow[], since: string, until: string): DayRow[] {
  const byDay = new Map(rows.map((r) => [r.day, r]))
  const out: DayRow[] = []
  const start = new Date(since + "T00:00:00Z")
  const end = new Date(until + "T00:00:00Z")
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = d.toISOString().slice(0, 10)
    out.push(byDay.get(key) ?? { day: key, dau: 0, newSignups: 0 })
  }
  return out
}

export interface FunnelStage {
  stage: string
  count: number
  /** % of the previous stage (100 for the first). Null if the prior stage was 0. */
  stepPct: number | null
  /** % of the very first stage. Null if the first stage was 0. */
  overallPct: number | null
}

/** Attach step + overall conversion percentages to an ordered funnel. */
export function computeFunnelStages(rows: { stage: string; count: number }[]): FunnelStage[] {
  const first = rows[0]?.count ?? 0
  return rows.map((r, i) => ({
    stage: r.stage,
    count: r.count,
    stepPct: i === 0 ? 100 : ratePct(r.count, rows[i - 1].count),
    overallPct: ratePct(r.count, first),
  }))
}
