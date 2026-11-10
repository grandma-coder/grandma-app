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
  /** The widget's big-number layout (eyebrow, hero number + unit, caption, footer line). */
  hero?: WidgetHero
  /** Cycle phase strip: today = cycle day (1-based); phases[i] is day i+1. */
  strip?: { today: number; length: number; phases: ('m' | 'f' | 'o' | 'l')[] }
}

/**
 * `big` empty + `live` = the widget renders the hero number itself from `sinceLast.at`
 * (kids: "2h" since last feed), so it stays right between app opens.
 */
export interface WidgetHero { eyebrow: string; big: string; unit: string; caption: string; footer: string; live?: boolean }

/** daily = the value counts today only; widgets show "0" once the snapshot is from an earlier day. */
export interface WidgetStat { label: string; value: string; daily: boolean }

/** 7 values, oldest first, ending on todayFor. moods: 0 = none, 1..5. */
export interface WidgetSeries {
  label: string
  kind: 'bars' | 'moods'
  values: number[]
  /** One-line reading of the week, e.g. "avg 4/day". */
  summary?: string
  /** Fixed top of the scale (hot-flash severity is 1–5); otherwise the week's max. */
  scaleMax?: number
}

export interface WidgetButton {
  /** Log type, e.g. "feeding" — what "Edit Widget" stores when the person picks this button. */
  type: string
  label: string
  /** Name in assets/stickers-site (lib/logStickers). */
  sticker: string
  url: string
}

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
  /** Every log the person can put on a button in "Edit Widget". */
  choices: WidgetButton[]
  /** Pregnancy progress bar end labels ("wk 1", "wk 40"). */
  progressEnds?: [string, string]
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
  /** App language (BCP 47), for weekday letters under the charts. */
  lang: string
  strings: {
    signIn: string
    pickChild: string
    refresh: string
    start: Record<WidgetJourney, string>
    /** Cycle strip legend, by phase code. */
    phases: Record<'m' | 'f' | 'o' | 'l', string>
    /** "Edit Widget" style picker. */
    styles: { journey: string; cream: string; dark: string }
  }
}
