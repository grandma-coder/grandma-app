/**
 * Home-screen widget snapshot. The app writes one of these as JSON to shared storage;
 * the iOS extension (targets/widget/Snapshot.swift) and the Android widget
 * (widgets/android/) decode exactly these field names — change both when changing this.
 */
import type { WidgetJourney } from './deepLinks'

export const WIDGET_SNAPSHOT_VERSION = 1

/** Precomputed lines for one calendar day (today and the next 7), so widgets need no domain logic. */
export interface WidgetDay {
  date: string // YYYY-MM-DD
  title: string
  subtitle: string
  /** 0..1 — pregnancy progress to the due date. */
  progress?: number
  /** Cycle phase strip: today = cycle day (1-based); phases[i] is day i+1. */
  strip?: { today: number; length: number; phases: ('m' | 'f' | 'o' | 'l')[] }
}

/** daily = the value counts today only; widgets show "0" once the snapshot is from an earlier day. */
export interface WidgetStat { label: string; value: string; daily: boolean }

/** 7 values, oldest first, ending on todayFor. moods: 0 = none, 1..5. */
export interface WidgetSeries { label: string; kind: 'bars' | 'moods'; values: number[] }

export interface WidgetButton { label: string; url: string }

export interface WidgetEntry {
  /** 'cycle' | 'pregnancy' | 'menopause' | `kids:<childId>` */
  key: string
  journey: WidgetJourney
  /** Shown in the widget's picker ("Cycle", "Leo"). */
  name: string
  state: 'ok' | 'empty'
  emptyText?: string
  days: WidgetDay[]
  /** The day the daily stats and series were computed for. */
  todayFor: string
  /** Rendered live by the widget as relative time, e.g. "2h since last feed". */
  sinceLast?: { label: string; at: string }
  stats: WidgetStat[]
  series?: WidgetSeries
  buttons: WidgetButton[]
  openUrl: string
  /** Base64 PNG (pregnancy fruit). */
  image?: string
}

export interface WidgetSnapshot {
  version: number
  signedIn: boolean
  generatedAt: string
  /** Entry shown by widgets the person hasn't configured — follows the app's active journey/child. */
  activeKey: string | null
  entries: WidgetEntry[]
  strings: { signIn: string; pickChild: string; refresh: string; start: Record<WidgetJourney, string> }
}
