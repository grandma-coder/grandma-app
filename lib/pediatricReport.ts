/**
 * Pediatric report for the doctor (Phase 2 — the marquee superset feature).
 *
 * A one-page, print-ready medical summary a parent can hand (or email) to their
 * pediatrician: identity + vitals, allergies/conditions/meds, growth with WHO/CDC
 * percentiles, vaccines given + due, and a plain-language feeding/sleep summary.
 * Flo has no kids mode, so this is unique to us.
 *
 * Split so the HTML is a PURE function of a data object (testable, no hooks):
 * a component gathers the data (useChildStore + useKidsAnalytics + a vaccine
 * query), then calls buildReportHtml() → generateAndShareReport().
 *
 * Uses expo-print (native — needs a rebuild) + expo-sharing (already in the
 * build). Model: Print.printToFileAsync({html}) → Sharing.shareAsync(uri, pdf).
 */

import * as Sharing from 'expo-sharing'
import { requireOptionalNativeModule } from 'expo-modules-core'
import { estimatePercentile, resolveSex, type Metric } from './growthStandards'
import type * as PrintType from 'expo-print'

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

export interface ReportMeasurement {
  metric: Metric
  value: number
  unit: string
  date: string
  ageMonths: number
  percentile: number | null
}

export interface ReportVaccine {
  name: string
  date: string // ISO, empty if only "due"
  status: 'given' | 'due' | 'overdue'
}

export interface PediatricReportData {
  childName: string
  birthDate: string
  ageLabel: string // "14 months" / "3 years, 2 months"
  sex: string // raw ('male'|'female'|'other'|'')
  bloodType?: string | null
  allergies: string[]
  conditions: string[]
  medications: string[]
  pediatrician?: { name?: string; phone?: string; clinic?: string } | null
  // Latest growth measurement per metric, with percentile.
  growth: ReportMeasurement[]
  vaccines: ReportVaccine[]
  // Plain-language summary lines (built by the caller from useKidsAnalytics).
  feedingSummary?: string
  sleepSummary?: string
  generatedOn: string // localized date string, passed in (no Date.now here)
}

// ── percentile helper (caller can also precompute) ─────────────────────────
export function measurementPercentile(
  metric: Metric,
  rawSex: string | null | undefined,
  ageMonths: number,
  value: number,
): number | null {
  const { sex } = resolveSex(rawSex)
  return estimatePercentile(metric, sex, ageMonths, value)
}

// ── HTML building blocks ────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function metricLabel(m: Metric): string {
  return m === 'weight' ? 'Weight' : m === 'height' ? 'Height' : 'Head circ.'
}

function chip(label: string, values: string[]): string {
  if (!values.length) return `<div class="row"><span class="k">${esc(label)}</span><span class="v muted">—</span></div>`
  return `<div class="row"><span class="k">${esc(label)}</span><span class="v">${values.map((v) => `<span class="chip">${esc(v)}</span>`).join(' ')}</span></div>`
}

/** Build the full report HTML. Pure — same input → same output. */
export function buildReportHtml(d: PediatricReportData): string {
  const growthRows = d.growth.length
    ? d.growth
        .map((g) => {
          const pct = g.percentile != null ? `${ordinal(g.percentile)} percentile` : '—'
          return `<tr>
            <td>${esc(metricLabel(g.metric))}</td>
            <td>${g.value} ${esc(g.unit)}</td>
            <td>${esc(pct)}</td>
            <td class="muted">${esc(g.date)}</td>
          </tr>`
        })
        .join('')
    : `<tr><td colspan="4" class="muted">No growth measurements logged.</td></tr>`

  const given = d.vaccines.filter((v) => v.status === 'given')
  const due = d.vaccines.filter((v) => v.status !== 'given')
  const givenRows = given.length
    ? given.map((v) => `<tr><td>${esc(v.name)}</td><td class="muted">${esc(v.date)}</td></tr>`).join('')
    : `<tr><td colspan="2" class="muted">No vaccines logged.</td></tr>`
  const dueList = due.length
    ? `<div class="due">${due
        .map((v) => `<span class="chip ${v.status === 'overdue' ? 'overdue' : 'due'}">${esc(v.name)}${v.status === 'overdue' ? ' (overdue)' : ''}</span>`)
        .join(' ')}</div>`
    : `<p class="muted">None due.</p>`

  const ped = d.pediatrician
  const pedLine = ped && (ped.name || ped.clinic || ped.phone)
    ? [ped.name, ped.clinic, ped.phone].filter((x): x is string => !!x).map(esc).join(' · ')
    : '—'

  const routine = (d.feedingSummary || d.sleepSummary)
    ? `<section>
        <h2>Typical day</h2>
        ${d.feedingSummary ? `<p><strong>Feeding.</strong> ${esc(d.feedingSummary)}</p>` : ''}
        ${d.sleepSummary ? `<p><strong>Sleep.</strong> ${esc(d.sleepSummary)}</p>` : ''}
      </section>`
    : ''

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  * { box-sizing: border-box; }
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
  section { break-inside: avoid; }
</style>
</head>
<body>
  <div class="head">
    <div>
      <p class="title">${esc(d.childName)}</p>
      <p class="subtitle">Pediatric summary · ${esc(d.ageLabel)}${d.sex ? ' · ' + esc(d.sex) : ''}</p>
    </div>
    <div class="brand">grandma.app<br/>Generated ${esc(d.generatedOn)}</div>
  </div>

  <section>
    <h2>Child</h2>
    <div class="row"><span class="k">Date of birth</span><span class="v">${esc(d.birthDate)}</span></div>
    <div class="row"><span class="k">Blood type</span><span class="v ${d.bloodType ? '' : 'muted'}">${esc(d.bloodType || '—')}</span></div>
    ${chip('Allergies', d.allergies)}
    ${chip('Conditions', d.conditions)}
    ${chip('Medications', d.medications)}
    <div class="row"><span class="k">Pediatrician</span><span class="v ${pedLine === '—' ? 'muted' : ''}">${pedLine === '—' ? '—' : esc(pedLine)}</span></div>
  </section>

  <section>
    <h2>Growth</h2>
    <table>
      <thead><tr><th>Measure</th><th>Latest</th><th>Percentile</th><th>Date</th></tr></thead>
      <tbody>${growthRows}</tbody>
    </table>
  </section>

  <div class="grid2">
    <section>
      <h2>Vaccines given</h2>
      <table>
        <thead><tr><th>Vaccine</th><th>Date</th></tr></thead>
        <tbody>${givenRows}</tbody>
      </table>
    </section>
    <section>
      <h2>Due / overdue</h2>
      ${dueList}
    </section>
  </div>

  ${routine}

  <div class="disclaimer">
    This report is a summary of caregiver-logged information from grandma.app for
    discussion with your child's healthcare provider. Percentiles are estimated
    from WHO/CDC growth standards for decision-support only and are not a clinical
    diagnosis. Please verify all values against your own records.
  </div>
</body>
</html>`
}

/** Generate the PDF from report data and open the OS share sheet. */
export async function generateAndShareReport(d: PediatricReportData): Promise<void> {
  const Print = getPrint()
  if (!Print) {
    // Recognized by the caller's catch → shows a "please update the app" message.
    throw new Error('ExpoPrint native module unavailable')
  }
  const html = buildReportHtml(d)
  const { uri } = await Print.printToFileAsync({ html })
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `${d.childName} — pediatric report`,
      UTI: 'com.adobe.pdf',
    })
  }
}
