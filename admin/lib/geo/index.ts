// Pure helpers for Pessoas › Mapa. The SVG paths come from scripts/geo/build-paths.mjs.

/** Waitlist signups and app accounts in one place (a country, region or city). */
export interface PlaceCount { key: string; waitlist: number; app: number }

export type MapSource = "all" | "waitlist" | "app"

export const countOf = (r: PlaceCount, source: MapSource) =>
  source === "waitlist" ? r.waitlist : source === "app" ? r.app : r.waitlist + r.app

/**
 * Fill strength 0..1 for a count, square-root scaled so one big country (Brazil) does not
 * wash every other one out. 0 stays 0 (drawn as "nobody here"); any person is at least 0.12.
 */
export function intensity(n: number, max: number): number {
  if (n <= 0 || max <= 0) return 0
  return Math.max(0.12, Math.sqrt(n) / Math.sqrt(max))
}

/** Joins per-source counts by key, sorted by the total, biggest first. Keys are uppercased. */
export function mergeCounts(waitlist: { key: string; n: number }[], app: { key: string; n: number }[]): PlaceCount[] {
  const by = new Map<string, PlaceCount>()
  const get = (key: string) => {
    const k = key.toUpperCase()
    let r = by.get(k)
    if (!r) by.set(k, (r = { key: k, waitlist: 0, app: 0 }))
    return r
  }
  for (const w of waitlist) get(w.key).waitlist += w.n
  for (const a of app) get(a.key).app += a.n
  return [...by.values()].sort((a, b) => b.waitlist + b.app - (a.waitlist + a.app) || a.key.localeCompare(b.key))
}

/**
 * Folds places with fewer than `min` people into one "others" bucket, so a small city does
 * not point at one person for someone who may not see personal data. Order is kept.
 */
export function foldSmall<T extends { n: number }>(rows: T[], min: number, others: (n: number, places: number) => T): T[] {
  if (min <= 1) return rows
  const keep = rows.filter((r) => r.n >= min)
  const small = rows.filter((r) => r.n < min)
  if (small.length === 0) return keep
  return [...keep, others(small.reduce((a, r) => a + r.n, 0), small.length)]
}

/** 'BR' → 🇧🇷. Anything that is not two letters (OTHER, null) gets the globe. */
export function flag(code: string | null | undefined): string {
  const c = (code ?? "").toUpperCase()
  if (!/^[A-Z]{2}$/.test(c)) return "🌐"
  return String.fromCodePoint(...[...c].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65))
}

/** Localized country name; falls back to the code itself (and OTHER → the given label). */
export function countryName(code: string, lang: string, unknownLabel: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return unknownLabel
  try {
    return new Intl.DisplayNames([lang], { type: "region" }).of(code) ?? code
  } catch {
    return code
  }
}
