// lib/kidsCrossInsights.ts — pure cross-log pattern engine (no supabase/react-query/store deps)
//
// Takes already-fetched `child_logs` rows and returns zero or more ranked,
// human-readable observations that JOIN across log types (e.g. a run of
// short-sleep nights followed by cranky next-days). Pure functions only —
// no network calls, no store reads. The caller (KidsAnalytics) is
// responsible for fetching `child_logs`; this module never imports
// supabase/react-query/zustand.

interface ChildLog {
  id: string
  child_id: string
  date: string
  type: string
  value: string | null
  notes: string | null
  photos: string[]
  created_at: string
}

export interface CrossInsight {
  kind: 'sleep_mood' | 'food_reaction' | 'night_waking'
  severity: 'watch' | 'note' | 'win'
  line: string
  /** Pillar keys this observation relates to — for future deep-link into pop-ups. */
  pillars: string[]
}

// A log's `value` column is heterogeneous across log types: a JSON object
// (`{duration, quality}`), a bare string (mood logged as plain 'cranky'), or
// null. Parsing is defensive — malformed JSON never throws, it just falls
// back to the raw string.
type ParsedLogValue = Record<string, unknown> | string | number | boolean | null

function parseValue(value: string | null): ParsedLogValue {
  if (!value) return null
  try {
    const parsed: unknown = JSON.parse(value)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
    if (typeof parsed === 'string' || typeof parsed === 'number' || typeof parsed === 'boolean') {
      return parsed
    }
    return null
  } catch {
    // Not JSON — treat as a bare string value.
    return value
  }
}

function asRecord(value: ParsedLogValue): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value : null
}

/**
 * Local-date-safe "day after" a `YYYY-MM-DD` string.
 *
 * Deliberately avoids `toISOString()` — that converts through UTC and shifts
 * the date by one day for users east of UTC, which would silently break this
 * join for a huge share of users. See CLAUDE.md's "local date strings only"
 * rule / the `useTranslatedContent` incident this mirrors.
 *
 * `new Date(\`${date}T00:00:00\`)` (no trailing `Z`/offset) is parsed as
 * local time, so the local getters below round-trip correctly — including
 * across month/year boundaries (`2026-12-31` → `2027-01-01`).
 */
export function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00`)
  d.setDate(d.getDate() + 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const CRANKY_MOODS = new Set(['cranky', 'fussy'])
// Each pattern has an explicit min-sample threshold so a coincidence never
// reads as a "pattern" — noise must never fire.
const MIN_SLEEP_MOOD_HITS = 3
const MIN_FOOD_REACTIONS = 2
const SHORT_SLEEP_HOURS = 8 // toddler-ish; tune per age in a later pass

function isShortSleepNight(log: ChildLog): boolean {
  const v = asRecord(parseValue(log.value))
  if (!v) return false
  const duration = parseFloat(String(v.duration ?? ''))
  const isShort = !isNaN(duration) && duration < SHORT_SLEEP_HOURS
  const isPoor = String(v.quality ?? '').toLowerCase() === 'poor'
  return isShort || isPoor
}

/** A mood value may be a bare string (`'cranky'`) or a JSON object (`{ mood: 'cranky' }`). */
function moodOf(log: ChildLog): string {
  const parsed = parseValue(log.value)
  if (typeof parsed === 'string') return parsed.toLowerCase().trim()
  const rec = asRecord(parsed)
  if (rec && typeof rec.mood === 'string') return rec.mood.toLowerCase().trim()
  return ''
}

function isCrankyMood(log: ChildLog): boolean {
  return CRANKY_MOODS.has(moodOf(log))
}

function computeSleepMoodInsight(logs: ChildLog[]): CrossInsight | null {
  const shortNights = new Set(
    logs.filter((l) => l.type === 'sleep' && isShortSleepNight(l)).map((l) => l.date),
  )
  const crankyDays = new Set(
    logs.filter((l) => l.type === 'mood' && isCrankyMood(l)).map((l) => l.date),
  )

  let hits = 0
  shortNights.forEach((date) => {
    if (crankyDays.has(nextDay(date))) hits++
  })

  if (hits < MIN_SLEEP_MOOD_HITS) return null
  return {
    kind: 'sleep_mood',
    severity: 'watch',
    pillars: ['sleep', 'mood'],
    line: `On the ${hits} shortest-sleep nights, the next day was crankier.`,
  }
}

interface FoodReaction {
  hasReaction: boolean
  reactionFood: string | null
}

function foodReactionOf(log: ChildLog): FoodReaction {
  const v = asRecord(parseValue(log.value))
  if (!v) return { hasReaction: false, reactionFood: null }
  const reactionFood = typeof v.reactionFood === 'string' ? v.reactionFood : null
  const hasReaction = v.hasReaction === true || reactionFood !== null
  return { hasReaction, reactionFood }
}

function computeFoodReactionInsight(logs: ChildLog[]): CrossInsight | null {
  const reactions = logs
    .filter((l) => l.type === 'food' || l.type === 'feeding')
    .map(foodReactionOf)
    .filter((r) => r.hasReaction)

  if (reactions.length < MIN_FOOD_REACTIONS) return null

  const food = reactions.find((r) => r.reactionFood)?.reactionFood ?? null
  return {
    kind: 'food_reaction',
    severity: 'watch',
    pillars: ['nutrition'],
    line: food
      ? `Possible reactions logged around ${food} — worth watching.`
      : `A couple of food reactions were logged recently — worth watching.`,
  }
}

const SEVERITY_ORDER: Record<CrossInsight['severity'], number> = { watch: 0, note: 1, win: 2 }

/**
 * Cross-log pattern engine. Consumes raw `child_logs` rows (same shape used
 * by `analyticsData`) and returns zero or more ranked (most-important-first)
 * human-readable observations that JOIN across log types. Surface-only —
 * never a diagnostic or clinical verdict.
 *
 * `ageMonths` is threaded through for future age-tuned thresholds (e.g.
 * scaling `SHORT_SLEEP_HOURS` per age); unused today.
 */
export function computeCrossInsights(logs: ChildLog[], _ageMonths: number): CrossInsight[] {
  const out: CrossInsight[] = []

  const sleepMood = computeSleepMoodInsight(logs)
  if (sleepMood) out.push(sleepMood)

  const foodReaction = computeFoodReactionInsight(logs)
  if (foodReaction) out.push(foodReaction)

  return out.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
}
