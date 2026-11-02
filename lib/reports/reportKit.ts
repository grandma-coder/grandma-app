/**
 * reportKit — the shared parts of every "report for the doctor" PDF.
 *
 *   - PDF plumbing: probe expo-print, print HTML to a file, open the share sheet.
 *   - The page shell and base styles (shared with the Kids pediatric report).
 *   - A generic report model (facts + sections of summaries and tables) and
 *     its pure HTML renderer, used by the Pregnancy / Cycle / Menopause builders.
 *   - Small pure helpers: periods, localized dates and numbers, label lookups.
 *
 * Builders stay pure (no hooks, no network) so they're unit-testable; the
 * screen gathers data with the existing queries and calls a builder.
 *
 * Content rules (docs/compliance/2026-11-02-regras-saude.md): factual tables
 * and short summaries only — no scores, no interpretations, no normal/abnormal.
 */

import * as Sharing from 'expo-sharing'
import { requireOptionalNativeModule } from 'expo-modules-core'
import type * as PrintType from 'expo-print'
import type { SiteStickerName } from '../../components/stickers/SiteSticker'
import type { NoteKey, Translate } from '../grandmaNotes/types'

// ─── PDF plumbing ────────────────────────────────────────────────────────────

// expo-print resolves its NATIVE module ('ExpoPrint') at IMPORT time, so a bare
// top-level `import * as Print from 'expo-print'` crashes any client without the
// native binary (Expo Go, or a dev client built before expo-print was added) —
// the crash happens when this file is imported, before any try/catch can run.
// Probe for the native module first, require the JS wrapper only when present.
// Same pattern as lib/pushNotifications.ts and lib/appLock.ts.
let _print: typeof PrintType | null | undefined

function getPrint(): typeof PrintType | null {
  if (_print !== undefined) return _print
  _print = null
  try {
    if (requireOptionalNativeModule('ExpoPrint')) {
      _print = require('expo-print')
    }
  } catch {
    _print = null
  }
  return _print ?? null
}

/** True when PDF generation is available (native module present). */
export function isPdfExportAvailable(): boolean {
  return getPrint() !== null
}

/** Print HTML to a PDF file and open the OS share sheet. */
export async function printAndSharePdf(html: string, dialogTitle: string): Promise<void> {
  const Print = getPrint()
  if (!Print) {
    // Recognized by the caller's catch → shows a "please update the app" message.
    throw new Error('ExpoPrint native module unavailable')
  }
  const { uri } = await Print.printToFileAsync({ html })
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle,
      UTI: 'com.adobe.pdf',
    })
  }
}

/** True when an error from printAndSharePdf means "this build has no PDF module". */
export function isMissingPdfModuleError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String((e as { message?: string } | null)?.message ?? '')
  return /native module|ExpoPrint/i.test(msg)
}

// ─── HTML shell + styles ─────────────────────────────────────────────────────

export function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Base print styles shared by every report (Kids included). */
export const REPORT_BASE_CSS = `  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
    color: #1a1a1a; margin: 0; padding: 32px 30px; font-size: 12px; line-height: 1.5;
  }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a1a1a; padding-bottom: 14px; }
  .title { font-size: 21px; font-weight: 700; margin: 0; }
  .subtitle { color: #666; font-size: 11px; margin: 3px 0 0; }
  .brand { text-align: right; font-size: 11px; color: #888; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #444; margin: 22px 0 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  .row { display: flex; padding: 3px 0; }
  .k { width: 130px; color: #666; flex-shrink: 0; }
  .v { flex: 1; }
  .muted { color: #999; }
  .chip { display: inline-block; background: #f0efe9; border-radius: 10px; padding: 2px 9px; margin: 1px 0; font-size: 11px; }
  .chip.overdue { background: #fbe3de; color: #b43e2e; }
  .chip.due { background: #eef2e4; color: #5a6b34; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th { text-align: left; color: #666; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; padding: 5px 8px; border-bottom: 1px solid #ddd; }
  td { padding: 6px 8px; border-bottom: 1px solid #f0f0f0; }
  .grid2 { display: flex; gap: 24px; }
  .grid2 > section { flex: 1; }
  .disclaimer { margin-top: 26px; padding: 12px 14px; background: #f7f5ef; border-radius: 8px; color: #666; font-size: 10px; line-height: 1.5; }
  section { break-inside: avoid; }`

/** Extra styles for the generic journey reports. */
const JOURNEY_CSS = `
  .k { width: 190px; }
  .facts { margin-top: 12px; }
  .note { color: #999; font-size: 10px; margin: 4px 0 0; }
  .summary { margin-bottom: 6px; }
  td.n, th.n { text-align: right; }
  table { break-inside: auto; }
  tr { break-inside: avoid; }
  [dir="rtl"] th, [dir="rtl"] td { text-align: right; }
  [dir="rtl"] td.n, [dir="rtl"] th.n { text-align: left; }
  [dir="rtl"] .brand { text-align: left; }`

/** The full HTML document around a report body. */
export function reportDocument(body: string, opts: { extraCss?: string; dir?: 'rtl' } = {}): string {
  return `<!DOCTYPE html>
<html${opts.dir ? ` dir="${opts.dir}"` : ''}>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
${REPORT_BASE_CSS}${opts.extraCss ?? ''}
</style>
</head>
<body>
${body}
</body>
</html>`
}

// ─── Generic report model ────────────────────────────────────────────────────

export type ReportBehavior = 'pregnancy' | 'pre-pregnancy' | 'menopause'
export type ReportPeriod = '30' | '90' | 'all'
export const REPORT_PERIODS: ReportPeriod[] = ['30', '90', 'all']

export interface ReportFact { label: string; value: string }

export interface ReportTable {
  columns: string[]
  rows: string[][]
  /** Column indexes holding numbers (right-aligned). */
  numeric?: number[]
  /** Shown under the table, e.g. "+ 12 earlier entries not shown". */
  footnote?: string
}

export interface ReportSection {
  id: string
  title: string
  /** Sticker for the screen's "include" checklist. */
  sticker: SiteStickerName
  /** How many entries back this section (0 → nothing to include). */
  count: number
  summary: ReportFact[]
  table?: ReportTable
  /** A short factual note (e.g. how phases are estimated). */
  note?: string
}

export interface ReportModel {
  behavior: ReportBehavior
  /** "Pregnancy summary". */
  title: string
  /** Facts under the header (week, due date, stage…). */
  facts: ReportFact[]
  sections: ReportSection[]
  labels: {
    /** "Information recorded by the user in grandma.app". */
    recordedBy: string
    /** "Generated 2 Nov 2026". */
    generatedOn: string
    periodLabel: string
    periodValue: string
    noEntries: string
    /** The medical disclaimer (footer). */
    disclaimer: string
  }
  rtl?: boolean
}

function factRow(f: ReportFact): string {
  return `<div class="row"><span class="k">${esc(f.label)}</span><span class="v">${esc(f.value)}</span></div>`
}

function tableHtml(tb: ReportTable): string {
  const num = new Set(tb.numeric ?? [])
  const cls = (i: number) => (num.has(i) ? ' class="n"' : '')
  const head = tb.columns.map((c, i) => `<th${cls(i)}>${esc(c)}</th>`).join('')
  const body = tb.rows.map((r) => `<tr>${r.map((c, i) => `<td${cls(i)}>${esc(c)}</td>`).join('')}</tr>`).join('')
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>${
    tb.footnote ? `<p class="note">${esc(tb.footnote)}</p>` : ''
  }`
}

function sectionHtml(s: ReportSection, noEntries: string): string {
  const empty = s.count === 0 || (!s.summary.length && !(s.table && s.table.rows.length))
  const inner = empty
    ? `<p class="muted">${esc(noEntries)}</p>`
    : `${s.summary.length ? `<div class="summary">${s.summary.map(factRow).join('')}</div>` : ''}${
        s.table && s.table.rows.length ? tableHtml(s.table) : ''
      }${s.note ? `<p class="note">${esc(s.note)}</p>` : ''}`
  return `<section>
    <h2>${esc(s.title)}</h2>
    ${inner}
  </section>`
}

/**
 * Render a report model to HTML. Pure — same input → same output.
 * `include` lists the section ids to print (default: every section).
 */
export function renderReportHtml(m: ReportModel, include?: readonly string[]): string {
  const keep = include ? new Set(include) : null
  const sections = m.sections.filter((s) => !keep || keep.has(s.id))
  const facts = [...m.facts, { label: m.labels.periodLabel, value: m.labels.periodValue }]
  const body = `  <div class="head">
    <div>
      <p class="title">${esc(m.title)}</p>
      <p class="subtitle">${esc(m.labels.recordedBy)}</p>
    </div>
    <div class="brand">grandma.app<br/>${esc(m.labels.generatedOn)}</div>
  </div>

  <div class="facts">${facts.map(factRow).join('')}</div>

  ${sections.map((s) => sectionHtml(s, m.labels.noEntries)).join('\n  ')}

  <div class="disclaimer">${esc(m.labels.disclaimer)}</div>`
  return reportDocument(body, { extraCss: JOURNEY_CSS, dir: m.rtl ? 'rtl' : undefined })
}

/** Render + print + share a journey report. */
export async function shareReportPdf(m: ReportModel, include?: readonly string[]): Promise<void> {
  await printAndSharePdf(renderReportHtml(m, include), m.title)
}

// ─── Pure helpers for builders ───────────────────────────────────────────────

export interface ReportContext {
  t: Translate
  /** App language code ('en', 'pt-BR', …) — used for dates and numbers. */
  locale: string
  period: ReportPeriod
  today?: Date
}

/** Max rows per table — keeps "All" reports to a sane length. */
export const MAX_TABLE_ROWS = 60

export function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDaysIso(d: Date, n: number): string {
  return isoDay(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12, 0, 0))
}

/** First day (inclusive) of the period, or null for "all". */
export function periodStart(period: ReportPeriod, today: Date): string | null {
  if (period === 'all') return null
  return addDaysIso(today, -(Number(period) - 1))
}

/** True when a 'YYYY-MM-DD' date falls inside the period (through today). */
export function inPeriod(date: string | null | undefined, from: string | null, to: string): boolean {
  if (!date) return false
  const d = date.slice(0, 10)
  return (!from || d >= from) && d <= to
}

/** Localized date ("2 Nov 2026" / "2 de nov. de 2026"). */
export function formatReportDate(iso: string, locale: string): string {
  const d = new Date(iso.slice(0, 10) + 'T12:00:00')
  if (isNaN(d.getTime())) return iso
  try {
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return iso.slice(0, 10)
  }
}

/** Localized number with up to `digits` decimals. */
export function formatReportNumber(n: number, locale: string, digits = 1): string {
  try {
    return n.toLocaleString(locale, { maximumFractionDigits: digits, minimumFractionDigits: 0 })
  } catch {
    return String(Math.round(n * 10 ** digits) / 10 ** digits)
  }
}

export function average(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
}

/**
 * Translate a key that's built at runtime (e.g. a stored symptom id). The i18n
 * engine returns the key itself when it's missing, so fall back to `fallback`.
 */
export function labelFor(t: Translate, key: string | null | undefined, fallback: string): string {
  if (!key) return fallback
  const s = t(key as NoteKey)
  return s && s !== key ? s : fallback
}

/** 'back-pain' / 'hot_flash' → 'Back pain' / 'Hot flash' for unknown free-text values. */
export function prettify(raw: string): string {
  const s = raw.replace(/[_-]+/g, ' ').trim()
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : raw
}

/** Keep at most MAX_TABLE_ROWS rows (the most recent first), with a footnote for the rest. */
export function capRows(rows: string[][], t: Translate): { rows: string[][]; footnote?: string } {
  if (rows.length <= MAX_TABLE_ROWS) return { rows }
  return {
    rows: rows.slice(0, MAX_TABLE_ROWS),
    footnote: t('report_moreRows', { count: rows.length - MAX_TABLE_ROWS }),
  }
}

/**
 * The report chrome every builder shares: header line, period line, generated
 * date and the medical disclaimer footer. `firstDate` is the earliest entry
 * (used to print the real range for "All").
 */
export function reportLabels(ctx: ReportContext, firstDate: string | null): ReportModel['labels'] {
  const { t, locale, period } = ctx
  const today = ctx.today ?? new Date()
  const todayIso = isoDay(today)
  const from = periodStart(period, today) ?? firstDate
  return {
    recordedBy: t('report_recordedByUser'),
    generatedOn: t('report_generatedOn', { date: formatReportDate(todayIso, locale) }),
    periodLabel: t('report_periodLabel'),
    periodValue: from
      ? `${formatReportDate(from, locale)} – ${formatReportDate(todayIso, locale)}`
      : t('report_period_allLong'),
    noEntries: t('report_noEntries'),
    disclaimer: t('disclaimer_medical'),
  }
}

export function isRtl(locale: string): boolean {
  return locale === 'ar'
}
