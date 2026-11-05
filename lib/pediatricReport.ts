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

import { estimatePercentile, resolveSex, type Metric } from './growthStandards'
import type { TranslationKey } from './i18n'
import { esc, isPdfExportAvailable, printAndSharePdf, reportDocument } from './reports/reportKit'

// PDF plumbing (expo-print probe, print + share), the page shell and base styles
// live in lib/reports/reportKit and are shared with the journey reports.
export { isPdfExportAvailable }

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
  /** Translator + RTL flag so the PDF follows the app language. */
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
  rtl?: boolean
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

type T = PediatricReportData['t']

function metricLabel(m: Metric, t: T): string {
  return t(m === 'weight' ? 'pedReport_weight' : m === 'height' ? 'pedReport_height' : 'pedReport_head')
}

function chip(label: string, values: string[]): string {
  if (!values.length) return `<div class="row"><span class="k">${esc(label)}</span><span class="v muted">—</span></div>`
  return `<div class="row"><span class="k">${esc(label)}</span><span class="v">${values.map((v) => `<span class="chip">${esc(v)}</span>`).join(' ')}</span></div>`
}

/** Build the full report HTML. Pure — same input → same output. */
export function buildReportHtml(d: PediatricReportData): string {
  const t = d.t
  const growthRows = d.growth.length
    ? d.growth
        .map((g) => {
          const pct = g.percentile != null ? t('pedReport_percentile', { n: g.percentile }) : '—'
          return `<tr>
            <td>${esc(metricLabel(g.metric, t))}</td>
            <td>${g.value} ${esc(g.unit)}</td>
            <td>${esc(pct)}</td>
            <td class="muted">${esc(g.date)}</td>
          </tr>`
        })
        .join('')
    : `<tr><td colspan="4" class="muted">${esc(t('pedReport_noGrowth'))}</td></tr>`

  const given = d.vaccines.filter((v) => v.status === 'given')
  const due = d.vaccines.filter((v) => v.status !== 'given')
  const givenRows = given.length
    ? given.map((v) => `<tr><td>${esc(v.name)}</td><td class="muted">${esc(v.date)}</td></tr>`).join('')
    : `<tr><td colspan="2" class="muted">${esc(t('pedReport_noVaccines'))}</td></tr>`
  const dueList = due.length
    ? `<div class="due">${due
        .map((v) => `<span class="chip ${v.status === 'overdue' ? 'overdue' : 'due'}">${esc(v.name)}${v.status === 'overdue' ? ` (${esc(t('pedReport_overdue'))})` : ''}</span>`)
        .join(' ')}</div>`
    : `<p class="muted">${esc(t('pedReport_noneDue'))}</p>`

  const ped = d.pediatrician
  const pedLine = ped && (ped.name || ped.clinic || ped.phone)
    ? [ped.name, ped.clinic, ped.phone].filter((x): x is string => !!x).map(esc).join(' · ')
    : '—'

  const routine = (d.feedingSummary || d.sleepSummary)
    ? `<section>
        <h2>${esc(t('pedReport_typicalDay'))}</h2>
        ${d.feedingSummary ? `<p><strong>${esc(t('pedReport_feeding'))}</strong> ${esc(d.feedingSummary)}</p>` : ''}
        ${d.sleepSummary ? `<p><strong>${esc(t('pedReport_sleep'))}</strong> ${esc(d.sleepSummary)}</p>` : ''}
      </section>`
    : ''

  return reportDocument(`  <div class="head">
    <div>
      <p class="title">${esc(d.childName)}</p>
      <p class="subtitle">${esc(t('pedReport_title'))} · ${esc(d.ageLabel)}${d.sex ? ' · ' + esc(d.sex) : ''}</p>
    </div>
    <div class="brand">grandma.app<br/>${esc(t('pedReport_generated', { date: d.generatedOn }))}</div>
  </div>

  <section>
    <h2>${esc(t('pedReport_child'))}</h2>
    <div class="row"><span class="k">${esc(t('pedReport_dob'))}</span><span class="v">${esc(d.birthDate)}</span></div>
    <div class="row"><span class="k">${esc(t('pedReport_bloodType'))}</span><span class="v ${d.bloodType ? '' : 'muted'}">${esc(d.bloodType || '—')}</span></div>
    ${chip(t('pedReport_allergies'), d.allergies)}
    ${chip(t('pedReport_conditions'), d.conditions)}
    ${chip(t('pedReport_medications'), d.medications)}
    <div class="row"><span class="k">${esc(t('pedReport_pediatrician'))}</span><span class="v ${pedLine === '—' ? 'muted' : ''}">${pedLine === '—' ? '—' : esc(pedLine)}</span></div>
  </section>

  <section>
    <h2>${esc(t('pedReport_growth'))}</h2>
    <table>
      <thead><tr><th>${esc(t('pedReport_measure'))}</th><th>${esc(t('pedReport_latest'))}</th><th>${esc(t('pedReport_percentileHead'))}</th><th>${esc(t('pedReport_date'))}</th></tr></thead>
      <tbody>${growthRows}</tbody>
    </table>
  </section>

  <div class="grid2">
    <section>
      <h2>${esc(t('pedReport_vaccinesGiven'))}</h2>
      <table>
        <thead><tr><th>${esc(t('pedReport_vaccine'))}</th><th>${esc(t('pedReport_date'))}</th></tr></thead>
        <tbody>${givenRows}</tbody>
      </table>
    </section>
    <section>
      <h2>${esc(t('pedReport_dueOverdue'))}</h2>
      ${dueList}
    </section>
  </div>

  ${routine}

  <div class="disclaimer">${esc(t('pedReport_disclaimer'))}
  </div>`, { dir: d.rtl ? 'rtl' : undefined })
}

/** Generate the PDF from report data and open the OS share sheet. */
export async function generateAndShareReport(d: PediatricReportData): Promise<void> {
  await printAndSharePdf(buildReportHtml(d), d.t('pedReport_fileName', { name: d.childName }))
}
