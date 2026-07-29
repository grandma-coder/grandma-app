// lib/kidsPillarInsights.ts — pure, observation-led pillar pop-up copy (no
// supabase/react-query/zustand/RN deps). Mirrors `kidsCrossInsights.ts`:
// consumes already-built analytics + raw logs and returns human-readable
// copy, never a diagnostic verdict. One `build<Pillar>Insight` per pillar —
// Health is the first (the template the other five follow). See
// docs/superpowers/specs/2026-07-28-kids-insights-observation-led-content.md.

import type { AnalyticsData, ChildLog, HealthData } from './analyticsData'

/**
 * Shared return shape every `build<Pillar>Insight` produces (spec §6): one
 * honest lead sentence, a couple of supporting lines, and whether there's a
 * raw log worth demoting behind a "show all" toggle.
 */
export interface PillarInsight {
  lead: string
  supporting: string[]
  demotedAvailable: boolean
}

type ConcernEvent = HealthData['concernTimeline'][number]
type ConcernKind = ConcernEvent['kind']

// ─── Local date helpers ─────────────────────────────────────────────────────
// No `toISOString()` — that converts through UTC and shifts `YYYY-MM-DD`
// dates by a day for users east of UTC (see CLAUDE.md's local-date rule).

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

function daysBetween(fromStr: string, toStr: string): number {
  const from = parseLocalDate(fromStr)
  const to = parseLocalDate(toStr)
  return Math.round((to.getTime() - from.getTime()) / 86_400_000)
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatMonthDay(dateStr: string): string {
  const d = parseLocalDate(dateStr)
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`
}

/** "1 week" / "6 weeks" — the honest window/gap phrasing cross-cutting rule
 * (spec §5): never a hardcoded "/7", always the real span, rounded to whole
 * weeks and clamped so a same-day cluster never reads as "0 weeks". */
function weeksPhrase(days: number): string {
  const weeks = Math.max(1, Math.round(days / 7))
  return weeks === 1 ? 'week' : `${weeks} weeks`
}

/** Names a selected date span in the lead sentence — "week" for the default
 * 7-day window, "month" for a ~30-day one, else the literal week count. */
function describeWindowSpan(days: number): string {
  if (days <= 8) return 'week'
  if (days <= 31) return 'month'
  return weeksPhrase(days)
}

// ─── Health ─────────────────────────────────────────────────────────────────

const CONCERN_KIND_NOUN: Record<ConcernKind, (n: number) => string> = {
  fever: (n) => (n === 1 ? 'fever day' : 'fever days'),
  injury: (n) => (n === 1 ? 'injury' : 'injuries'),
  doctor: (n) => (n === 1 ? 'doctor visit' : 'doctor visits'),
}

/**
 * Groups fever dates into consecutive-day runs and returns the most recent
 * run — the "episode" behind the best-effort recovery line. Returns null
 * when there's no fever entry at all, or when the most recent run hasn't
 * actually concluded yet (its last day is still within the visible window),
 * since we can't honestly claim it "settled" until at least a day has
 * passed with no further fever entry (spec §4: "infer … if determinable").
 */
function lastFeverEpisode(
  concernTimeline: ConcernEvent[],
  windowTo: string,
): { start: string; days: number } | null {
  const dates = [...new Set(concernTimeline.filter((c) => c.kind === 'fever').map((c) => c.date))].sort()
  if (dates.length === 0) return null

  const runs: string[][] = [[dates[0]]]
  for (let i = 1; i < dates.length; i++) {
    if (daysBetween(dates[i - 1], dates[i]) === 1) {
      runs[runs.length - 1].push(dates[i])
    } else {
      runs.push([dates[i]])
    }
  }

  const last = runs[runs.length - 1]
  const lastDay = last[last.length - 1]
  if (daysBetween(lastDay, windowTo) < 1) return null // still ongoing — not confirmed settled
  return { start: last[0], days: last.length }
}

/**
 * A medicine log only earns a supporting line while it reads as an
 * "active/recent course" (spec §4) — anything older is routine and gets
 * omitted rather than surfaced as a diary entry.
 */
function recentMedicineNote(logs: ChildLog[], windowTo: string): string | null {
  const medicineLogs = logs.filter((l) => l.type === 'medicine' && typeof l.value === 'string' && l.value.trim())
  if (medicineLogs.length === 0) return null

  const latest = [...medicineLogs].sort((a, b) => b.date.localeCompare(a.date))[0]
  const daysAgo = daysBetween(latest.date, windowTo)
  if (daysAgo < 0 || daysAgo > 7) return null

  const name = (latest.value ?? '').trim()
  const when = daysAgo <= 1 ? 'today' : `${daysAgo} days ago`
  return `${name} noted ${when} — worth watching if it continues.`
}

/**
 * Health pop-up lead + supporting copy (spec §4 HEALTH). Health carries no
 * /10 score — it's a reference, not a graded pillar — so this function IS
 * the whole "how is my child doing on health" answer: well, or a real
 * pattern, backed by a vaccine-on-record count and (best-effort) a
 * recovery/medicine note. The full care-log diary lives behind
 * `demotedAvailable`; the caller renders it as a collapsed "show all".
 *
 * `ageMonths` is threaded through for signature parity with the other
 * `build<Pillar>Insight` functions (sleep/nutrition age-scale their
 * targets) — unused for Health today.
 */
export function buildHealthInsight(analytics: AnalyticsData, ageMonths: number, childName: string): PillarInsight {
  const { health, dateRange, logs } = analytics
  const timeline = health.concernTimeline // chronological, oldest first
  const windowDays = daysBetween(dateRange.from, dateRange.to) + 1
  const inWindow = timeline.filter((c) => c.date >= dateRange.from && c.date <= dateRange.to)

  const supporting: string[] = []
  let lead: string

  if (inWindow.length === 0) {
    // Well case — nothing within the selected window. Reach into the full
    // concern history (which spans more than the display window — see
    // `buildHealthData`'s wider fetch range) for a more generous, still
    // honest reassurance span: weeks since the most recent concern ever
    // logged, or since the window itself started if none ever happened.
    // Computed via max rather than trusting array order, so this holds even
    // if a future caller hands in an unsorted timeline.
    const mostRecent = timeline.length > 0
      ? timeline.reduce((latest, c) => (c.date > latest.date ? c : latest))
      : null
    const spanDays = mostRecent ? daysBetween(mostRecent.date, dateRange.to) : windowDays
    lead = `${childName}'s been well — no fever, injury, or doctor visit in the last ${weeksPhrase(spanDays)}.`
  } else {
    const counts: Record<ConcernKind, number> = { fever: 0, injury: 0, doctor: 0 }
    for (const c of inWindow) counts[c.kind]++
    const kindsPresent = (Object.keys(counts) as ConcernKind[]).filter((k) => counts[k] > 0)

    const subject = kindsPresent.length === 1
      ? `${counts[kindsPresent[0]]} ${CONCERN_KIND_NOUN[kindsPresent[0]](counts[kindsPresent[0]])}`
      : `${inWindow.length} health concern${inWindow.length === 1 ? '' : 's'}`

    const windowPhrase = describeWindowSpan(windowDays)

    if (inWindow.length >= 2) {
      const sorted = [...inWindow].sort((a, b) => a.date.localeCompare(b.date))
      const spreadDays = daysBetween(sorted[0].date, sorted[sorted.length - 1].date)
      const avgGapDays = spreadDays / (sorted.length - 1)
      lead = `${subject} in the last ${windowPhrase} — about one every ${weeksPhrase(avgGapDays)}.`
    } else {
      lead = `${subject} in the last ${windowPhrase}.`
    }

    const episode = lastFeverEpisode(timeline, dateRange.to)
    if (episode) {
      supporting.push(
        `${childName}'s last fever (${formatMonthDay(episode.start)}) settled within ~${episode.days} day${episode.days === 1 ? '' : 's'}.`,
      )
    }
  }

  // Always-on reassurance reference — a count, never a completion % or
  // schedule-compliance verdict (spec §4 explicitly forbids that framing).
  const vaccineCount = health.vaccines.filter((v) => v.done).length
  supporting.push(`${vaccineCount} vaccine${vaccineCount === 1 ? '' : 's'} on record.`)

  const medNote = recentMedicineNote(logs, dateRange.to)
  if (medNote) supporting.push(medNote)

  return {
    lead,
    supporting,
    demotedAvailable: health.recentEvents.length > 0,
  }
}
