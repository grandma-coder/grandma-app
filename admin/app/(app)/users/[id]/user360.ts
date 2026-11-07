/**
 * Pure helpers for the "Usuário 360" detail page — no React, no DB, so they
 * can be unit-tested (lib/__tests__/users-360.test.ts) and shared by the tabs.
 */

export type Profile = Record<string, unknown>

// ─── Tabs (state lives in ?tab= so a tab is linkable) ────────────────────────

export const TABS = ["overview", "activity", "family", "community", "devices", "account"] as const
export type TabKey = (typeof TABS)[number]

/** Unknown / missing ?tab= values fall back to the overview. */
export function parseTab(v: string | string[] | undefined | null): TabKey {
  const s = Array.isArray(v) ? v[0] : v
  return (TABS as readonly string[]).includes(s ?? "") ? (s as TabKey) : "overview"
}

// ─── Profile field accessors ─────────────────────────────────────────────────

export function str(p: Profile, k: string): string {
  const v = p[k]
  return v == null || v === "" ? "—" : String(v)
}
export function num(p: Profile, k: string): number {
  return Number(p[k] ?? 0)
}

export function fmtDate(iso: unknown, lang: string): string {
  if (!iso) return "—"
  const d = new Date(String(iso))
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(lang)
}

/** Whole days since `iso`; null for missing/invalid/epoch (the detail query's "never" sentinel). */
export function daysSince(iso: unknown, now = Date.now()): number | null {
  if (!iso) return null
  const t = new Date(String(iso)).getTime()
  if (Number.isNaN(t) || t <= 0) return null
  return Math.floor((now - t) / 86_400_000)
}

export type LifecycleKey = "none" | "active" | "dormant" | "atRisk" | "churned"

/** active < 7d · dormant 7–29d · at-risk 30–59d · churned 60d+ */
export function lifecycle(days: number | null): { key: LifecycleKey; cls: string } {
  if (days == null) return { key: "none", cls: "" }
  if (days < 7) return { key: "active", cls: "pill-success" }
  if (days < 30) return { key: "dormant", cls: "pill-info" }
  if (days < 60) return { key: "atRisk", cls: "pill-warning" }
  return { key: "churned", cls: "pill-danger" }
}

/** Two-letter avatar fallback from the name, else the email. */
export function initials(name: string | null | undefined, email: string | null | undefined): string {
  const src = name || email || "?"
  return (
    src
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  )
}

// ─── Country ─────────────────────────────────────────────────────────────────

/** ISO 3166 alpha-2 → flag emoji via regional-indicator symbols; "" if not a 2-letter code. */
export function flagEmoji(cc: string | null | undefined): string {
  if (!cc || !/^[A-Za-z]{2}$/.test(cc)) return ""
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
}

/** Localized country name ("Brasil" / "Brazil"); falls back to the raw code. */
export function countryName(cc: string | null | undefined, lang: string): string | null {
  if (!cc) return null
  try {
    return new Intl.DisplayNames([lang], { type: "region" }).of(cc.toUpperCase()) ?? cc
  } catch {
    return cc
  }
}

// ─── Timeline grouping ───────────────────────────────────────────────────────

/** Calendar day (YYYY-MM-DD) of an instant in `timeZone` (default: the browser's). */
export function dayKey(iso: string, timeZone?: string): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso))
}

/** Groups an already time-desc list into consecutive day buckets, preserving order. */
export function groupByDay<T extends { at: string }>(events: T[], timeZone?: string): { day: string; events: T[] }[] {
  const out: { day: string; events: T[] }[] = []
  for (const e of events) {
    const day = dayKey(e.at, timeZone)
    const last = out[out.length - 1]
    if (last && last.day === day) last.events.push(e)
    else out.push({ day, events: [e] })
  }
  return out
}

/** "today" / "yesterday" relative to `todayKey`, else null (caller formats the date). */
export function relativeDay(day: string, todayKey: string): "today" | "yesterday" | null {
  if (day === todayKey) return "today"
  const y = new Date(`${todayKey}T12:00:00Z`)
  y.setUTCDate(y.getUTCDate() - 1)
  return day === y.toISOString().slice(0, 10) ? "yesterday" : null
}

// ─── Family ──────────────────────────────────────────────────────────────────

/** Age in whole years + remaining months from a YYYY-MM-DD birth date; null if missing or in the future. */
export function childAge(birthDate: string | null | undefined, now = new Date()): { years: number; months: number } | null {
  if (!birthDate) return null
  const [y, m, d] = birthDate.slice(0, 10).split("-").map(Number)
  if (!y || !m || !d) return null
  let months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m)
  if (now.getDate() < d) months -= 1
  if (months < 0) return null
  return { years: Math.floor(months / 12), months: months % 12 }
}

/**
 * Gestational week (40 − weeks until due) and days left from a YYYY-MM-DD due
 * date. null when missing, or more than 4 weeks past due (the pregnancy is over).
 */
export function pregnancyProgress(dueDate: string | null | undefined, now = new Date()): { week: number; daysLeft: number } | null {
  if (!dueDate) return null
  const [y, m, d] = dueDate.slice(0, 10).split("-").map(Number)
  if (!y || !m || !d) return null
  // Both sides as UTC midnights so DST never shifts the day count.
  const due = Date.UTC(y, m - 1, d)
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const daysLeft = Math.round((due - today) / 86_400_000)
  if (daysLeft < -28) return null
  const week = Math.min(42, Math.max(1, Math.floor((280 - daysLeft) / 7)))
  return { week, daysLeft }
}
