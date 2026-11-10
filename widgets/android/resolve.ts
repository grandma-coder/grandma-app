/**
 * What an Android widget shows, from the snapshot JSON and its configured entry — the same
 * states as the iOS widget (targets/widget/Provider.swift). Pure; tested.
 */
import { WIDGET_SNAPSHOT_VERSION, type WidgetDay, type WidgetEntry, type WidgetSnapshot } from '../../lib/widgets/types'
import { isStale, pickDay, shiftSeries, daysBetweenISO } from '../../lib/widgets/day'
import { buildHomeUrl, type WidgetJourney } from '../../lib/widgets/deepLinks'

export type Resolved =
  | { kind: 'message'; text: string; url?: string }
  | { kind: 'ok'; entry: WidgetEntry; day: WidgetDay | null; stats: { label: string; value: string }[]; series: number[] | null }

const FALLBACK_SIGN_IN = 'Sign in to Grandma'
const FALLBACK_REFRESH = 'Open Grandma to refresh'

export function parseSnapshot(json: string | null): WidgetSnapshot | 'outdated' | null {
  if (!json) return null
  try {
    const s = JSON.parse(json) as WidgetSnapshot
    if (s.version !== WIDGET_SNAPSHOT_VERSION) return 'outdated'
    return s
  } catch {
    return null
  }
}

export function resolveEntry(json: string | null, chosenKey: string | null, todayISO: string): Resolved {
  const s = parseSnapshot(json)
  if (s === 'outdated') return { kind: 'message', text: FALLBACK_REFRESH }
  if (!s) return { kind: 'message', text: FALLBACK_SIGN_IN }
  if (!s.signedIn) return { kind: 'message', text: s.strings.signIn }

  const key = chosenKey ?? s.activeKey
  const entry = key ? s.entries.find((e) => e.key === key) : s.entries[0]
  if (!entry) {
    if (key?.startsWith('kids:')) return { kind: 'message', text: s.strings.pickChild, url: buildHomeUrl('kids') }
    const start = key ? (s.strings.start as Record<string, string>)[key] : undefined
    if (start) return { kind: 'message', text: start, url: buildHomeUrl(key as WidgetJourney) }
    return { kind: 'message', text: s.strings.start.cycle }
  }

  const day = pickDay(entry, todayISO)
  // Past the precomputed week (app not opened for days): ask for a refresh rather than freeze.
  if (!day && entry.days.length > 0) return { kind: 'message', text: s.strings.refresh, url: entry.openUrl }
  const stale = isStale(entry, todayISO)
  return {
    kind: 'ok',
    entry,
    day,
    stats: entry.stats.map((st) => ({ label: st.label, value: st.daily && stale ? '0' : st.value })),
    series: entry.series ? shiftSeries(entry.series.values, stale ? daysBetweenISO(entry.todayFor, todayISO) : 0) : null,
  }
}
