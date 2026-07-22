/**
 * Vaccine schedule — shared data + pure logic.
 *
 * The single source of truth for the multi-country vaccine catalog and the
 * schedule-tree engine that powers the Kids health surface. Extracted from
 * `components/home/KidsHome.tsx` so both KidsHome and the standalone
 * `components/home/kids/VaccineTrackerSheet.tsx` consume ONE copy (they
 * previously each inlined the same ~700 lines, which would drift).
 *
 * NO JSX / React here — this module is pure data + functions. The React
 * components that render this data live in
 * `components/home/kids/VaccineScheduleTree.tsx`.
 */
import { getAgeMonths } from '../store/useGoalsStore'

// ─── Health record shapes ────────────────────────────────────────────────────

export interface HealthRecord {
  id: string
  type: string
  value: string
  notes: string
  date: string
}

export interface HealthHistoryData {
  vaccines: HealthRecord[]
  meds: HealthRecord[]
  growth: HealthRecord[]
  temps: HealthRecord[]
  milestones: HealthRecord[]
}

// ─── Vaccine Schedules by Country ─────────────────────────────────────────────

export type VaccineEntry = { name: string; ages: string[]; monthRanges: [number, number][] }

export const VACCINE_SCHEDULES: Record<string, VaccineEntry[]> = {
  // ── United States (CDC) ──────────────────────────────────────────────────
  US: [
    { name: 'Hepatitis B',  ages: ['Birth', '1-2 months', '6-18 months'],                          monthRanges: [[0,1],[1,2],[6,18]] },
    { name: 'DTaP',         ages: ['2 months', '4 months', '6 months', '15-18 months', '4-6 yrs'], monthRanges: [[2,2],[4,4],[6,6],[15,18],[48,72]] },
    { name: 'IPV',          ages: ['2 months', '4 months', '6-18 months', '4-6 yrs'],              monthRanges: [[2,2],[4,4],[6,18],[48,72]] },
    { name: 'MMR',          ages: ['12-15 months', '4-6 yrs'],                                     monthRanges: [[12,15],[48,72]] },
    { name: 'Varicella',    ages: ['12-15 months', '4-6 yrs'],                                     monthRanges: [[12,15],[48,72]] },
    { name: 'Hib',          ages: ['2 months', '4 months', '6 months', '12-15 months'],            monthRanges: [[2,2],[4,4],[6,6],[12,15]] },
    { name: 'PCV15',        ages: ['2 months', '4 months', '6 months', '12-15 months'],            monthRanges: [[2,2],[4,4],[6,6],[12,15]] },
    { name: 'Rotavirus',    ages: ['2 months', '4 months', '6 months'],                            monthRanges: [[2,2],[4,4],[6,6]] },
    { name: 'Influenza',    ages: ['6 months (yearly)'],                                           monthRanges: [[6,999]] },
    { name: 'Hepatitis A',  ages: ['12-23 months', '18-23 months'],                                monthRanges: [[12,23],[18,23]] },
  ],

  // ── Brazil (PNI — Programa Nacional de Imunizações) ──────────────────────
  BR: [
    { name: 'BCG',              ages: ['Birth'],                                                    monthRanges: [[0,1]] },
    { name: 'Hepatite B',       ages: ['Birth', '2 meses', '6 meses'],                             monthRanges: [[0,1],[2,2],[6,6]] },
    { name: 'Pentavalente',     ages: ['2 meses', '4 meses', '6 meses'],                           monthRanges: [[2,2],[4,4],[6,6]] },
    { name: 'VIP/VOP (Polio)',  ages: ['2 meses', '4 meses', '6 meses', '15 meses', '4 anos'],    monthRanges: [[2,2],[4,4],[6,6],[15,15],[48,48]] },
    { name: 'Rotavírus',        ages: ['2 meses', '4 meses'],                                      monthRanges: [[2,2],[4,4]] },
    { name: 'Pneumocócica 10',  ages: ['2 meses', '4 meses', '12 meses (reforço)'],               monthRanges: [[2,2],[4,4],[12,12]] },
    { name: 'Meningocócica C',  ages: ['3 meses', '5 meses', '12 meses (reforço)'],               monthRanges: [[3,3],[5,5],[12,12]] },
    { name: 'Febre Amarela',    ages: ['9 meses', '4 anos'],                                       monthRanges: [[9,9],[48,48]] },
    { name: 'Tríplice Viral',   ages: ['12 meses', '15 meses'],                                    monthRanges: [[12,12],[15,15]] },
    { name: 'Varicela',         ages: ['15 meses'],                                                monthRanges: [[15,15]] },
    { name: 'DTP (reforço)',    ages: ['15 meses', '4 anos'],                                      monthRanges: [[15,15],[48,48]] },
    { name: 'Hepatite A',       ages: ['15 meses'],                                                monthRanges: [[15,15]] },
    { name: 'Influenza',        ages: ['6 meses (anual)'],                                         monthRanges: [[6,999]] },
  ],

  // ── United Kingdom (NHS) ──────────────────────────────────────────────────
  GB: [
    { name: '6-in-1 (DTaP/IPV/Hib/HepB)', ages: ['8 weeks', '12 weeks', '16 weeks'],             monthRanges: [[2,2],[3,3],[4,4]] },
    { name: 'Rotavirus',        ages: ['8 weeks', '12 weeks'],                                     monthRanges: [[2,2],[3,3]] },
    { name: 'MenB',             ages: ['8 weeks', '16 weeks', '1 year'],                           monthRanges: [[2,2],[4,4],[12,12]] },
    { name: 'PCV (pneumo)',     ages: ['12 weeks', '1 year'],                                      monthRanges: [[3,3],[12,12]] },
    { name: 'Hib/MenC',        ages: ['1 year'],                                                   monthRanges: [[12,12]] },
    { name: 'MMR',              ages: ['1 year', '3 years 4 months'],                              monthRanges: [[12,12],[40,40]] },
    { name: '4-in-1 (DTaP/IPV)', ages: ['3 years 4 months'],                                      monthRanges: [[40,40]] },
    { name: 'Flu (nasal spray)',ages: ['2 years (annually)'],                                      monthRanges: [[24,999]] },
  ],

  // ── Australia (NHMRC) ─────────────────────────────────────────────────────
  AU: [
    { name: 'Hepatitis B',      ages: ['Birth', '2 months', '4 months', '6 months'],               monthRanges: [[0,1],[2,2],[4,4],[6,6]] },
    { name: 'DTaP/IPV/Hib',    ages: ['2 months', '4 months', '6 months'],                        monthRanges: [[2,2],[4,4],[6,6]] },
    { name: 'Rotavirus',        ages: ['2 months', '4 months', '6 months'],                        monthRanges: [[2,2],[4,4],[6,6]] },
    { name: 'PCV13',            ages: ['2 months', '4 months', '6 months', '12 months'],           monthRanges: [[2,2],[4,4],[6,6],[12,12]] },
    { name: 'MenACWY',          ages: ['12 months'],                                               monthRanges: [[12,12]] },
    { name: 'MMR',              ages: ['12 months', '18 months'],                                  monthRanges: [[12,12],[18,18]] },
    { name: 'Varicella',        ages: ['18 months'],                                               monthRanges: [[18,18]] },
    { name: 'Hib booster',      ages: ['18 months'],                                               monthRanges: [[18,18]] },
    { name: 'DTaP/IPV (booster)',ages: ['4 years'],                                                monthRanges: [[48,48]] },
    { name: 'Influenza',        ages: ['6 months (annually)'],                                     monthRanges: [[6,999]] },
  ],

  // ── Canada ────────────────────────────────────────────────────────────────
  CA: [
    { name: 'Hepatitis B',      ages: ['Birth', '2 months', '6 months'],                          monthRanges: [[0,1],[2,2],[6,6]] },
    { name: 'DTaP/IPV/Hib',    ages: ['2 months', '4 months', '6 months', '18 months'],           monthRanges: [[2,2],[4,4],[6,6],[18,18]] },
    { name: 'Rotavirus',        ages: ['2 months', '4 months'],                                    monthRanges: [[2,2],[4,4]] },
    { name: 'PCV13',            ages: ['2 months', '4 months', '12 months'],                       monthRanges: [[2,2],[4,4],[12,12]] },
    { name: 'MMR',              ages: ['12 months', '18 months'],                                  monthRanges: [[12,12],[18,18]] },
    { name: 'Varicella',        ages: ['12 months', '18 months'],                                  monthRanges: [[12,12],[18,18]] },
    { name: 'MenC',             ages: ['12 months'],                                               monthRanges: [[12,12]] },
    { name: 'DTaP/IPV (booster)',ages: ['4-6 years'],                                              monthRanges: [[48,72]] },
    { name: 'Influenza',        ages: ['6 months (annually)'],                                     monthRanges: [[6,999]] },
  ],

  // ── Portugal (DGS) ───────────────────────────────────────────────────────
  PT: [
    { name: 'BCG',              ages: ['Nascimento'],                                              monthRanges: [[0,1]] },
    { name: 'Hepatite B',       ages: ['Nascimento', '2 meses', '6 meses'],                       monthRanges: [[0,1],[2,2],[6,6]] },
    { name: 'Hexavalente',      ages: ['2 meses', '4 meses', '6 meses'],                          monthRanges: [[2,2],[4,4],[6,6]] },
    { name: 'PCV13',            ages: ['2 meses', '4 meses', '12 meses'],                         monthRanges: [[2,2],[4,4],[12,12]] },
    { name: 'MenC',             ages: ['3 meses', '12 meses'],                                    monthRanges: [[3,3],[12,12]] },
    { name: 'Rotavírus',        ages: ['2 meses', '3 meses', '4 meses'],                          monthRanges: [[2,2],[3,3],[4,4]] },
    { name: 'VASPR (MMR)',      ages: ['12 meses', '5 anos'],                                     monthRanges: [[12,12],[60,60]] },
    { name: 'Varicela',         ages: ['2 anos', '5 anos'],                                       monthRanges: [[24,24],[60,60]] },
    { name: 'Influenza',        ages: ['6 meses (anual)'],                                        monthRanges: [[6,999]] },
  ],

  // ── Germany (STIKO) ──────────────────────────────────────────────────────
  DE: [
    { name: 'Hepatitis B',      ages: ['Birth', '2 months', '4 months', '11 months'],             monthRanges: [[0,1],[2,2],[4,4],[11,11]] },
    { name: 'DTaP/IPV/Hib',    ages: ['2 months', '4 months', '11 months'],                      monthRanges: [[2,2],[4,4],[11,11]] },
    { name: 'Rotavirus',        ages: ['2 months', '3 months', '4 months'],                       monthRanges: [[2,2],[3,3],[4,4]] },
    { name: 'PCV13',            ages: ['2 months', '4 months', '11 months'],                      monthRanges: [[2,2],[4,4],[11,11]] },
    { name: 'MenC',             ages: ['12 months'],                                              monthRanges: [[12,12]] },
    { name: 'MMR',              ages: ['11 months', '15 months'],                                 monthRanges: [[11,11],[15,15]] },
    { name: 'Varizellen',       ages: ['11 months', '15 months'],                                 monthRanges: [[11,11],[15,15]] },
    { name: 'Influenza',        ages: ['6 months (annually)'],                                    monthRanges: [[6,999]] },
  ],

  // ── France (Calendrier vaccinal) ──────────────────────────────────────────
  FR: [
    { name: 'Hépatite B',       ages: ['2 mois', '4 mois', '11 mois'],                           monthRanges: [[2,2],[4,4],[11,11]] },
    { name: 'DTCaP-Hib (Hexa)',  ages: ['2 mois', '4 mois', '11 mois'],                          monthRanges: [[2,2],[4,4],[11,11]] },
    { name: 'Rotavirus',        ages: ['2 mois', '3 mois', '4 mois'],                            monthRanges: [[2,2],[3,3],[4,4]] },
    { name: 'Pneumocoque (PCV13)', ages: ['2 mois', '4 mois', '11 mois'],                        monthRanges: [[2,2],[4,4],[11,11]] },
    { name: 'Méningocoque C',   ages: ['5 mois', '12 mois'],                                     monthRanges: [[5,5],[12,12]] },
    { name: 'ROR (MMR)',        ages: ['12 mois', '16-18 mois'],                                  monthRanges: [[12,12],[16,18]] },
    { name: 'Influenza',        ages: ['6 mois (annuel)'],                                        monthRanges: [[6,999]] },
  ],

  // ── Mexico (CENSIA) ──────────────────────────────────────────────────────
  MX: [
    { name: 'BCG',              ages: ['Nacimiento'],                                             monthRanges: [[0,1]] },
    { name: 'Hepatitis B',      ages: ['Nacimiento', '2 meses', '6 meses'],                      monthRanges: [[0,1],[2,2],[6,6]] },
    { name: 'Pentavalente',     ages: ['2 meses', '4 meses', '6 meses', '18 meses'],             monthRanges: [[2,2],[4,4],[6,6],[18,18]] },
    { name: 'Rotavirus',        ages: ['2 meses', '4 meses'],                                    monthRanges: [[2,2],[4,4]] },
    { name: 'Neumocócica',      ages: ['2 meses', '4 meses', '12 meses'],                        monthRanges: [[2,2],[4,4],[12,12]] },
    { name: 'SRP (MMR)',        ages: ['12 meses', '6 años'],                                    monthRanges: [[12,12],[72,72]] },
    { name: 'Varicela',         ages: ['12 meses'],                                              monthRanges: [[12,12]] },
    { name: 'Influenza',        ages: ['6 meses (anual)'],                                       monthRanges: [[6,999]] },
  ],

  // ── Argentina (MSAL) ─────────────────────────────────────────────────────
  AR: [
    { name: 'BCG',              ages: ['Nacimiento'],                                             monthRanges: [[0,1]] },
    { name: 'Hepatitis B',      ages: ['Nacimiento', '2 meses', '6 meses'],                      monthRanges: [[0,1],[2,2],[6,6]] },
    { name: 'Pentavalente',     ages: ['2 meses', '4 meses', '6 meses'],                         monthRanges: [[2,2],[4,4],[6,6]] },
    { name: 'IPV (Polio)',      ages: ['2 meses', '4 meses', '6 meses', '18 meses'],             monthRanges: [[2,2],[4,4],[6,6],[18,18]] },
    { name: 'Rotavirus',        ages: ['2 meses', '4 meses'],                                    monthRanges: [[2,2],[4,4]] },
    { name: 'Neumocócica',      ages: ['2 meses', '4 meses', '12 meses'],                        monthRanges: [[2,2],[4,4],[12,12]] },
    { name: 'Meningocócica',    ages: ['3 meses', '5 meses', '15 meses'],                        monthRanges: [[3,3],[5,5],[15,15]] },
    { name: 'SRP (MMR)',        ages: ['12 meses', '18 meses'],                                  monthRanges: [[12,12],[18,18]] },
    { name: 'Varicela',         ages: ['15 meses'],                                              monthRanges: [[15,15]] },
    { name: 'Fiebre Amarilla',  ages: ['15 meses'],                                              monthRanges: [[15,15]] },
    { name: 'Influenza',        ages: ['6 meses (anual)'],                                       monthRanges: [[6,999]] },
  ],

  // ── India (UIP) ──────────────────────────────────────────────────────────
  IN: [
    { name: 'BCG',              ages: ['Birth'],                                                  monthRanges: [[0,1]] },
    { name: 'Oral Polio Vaccine', ages: ['Birth', '6 weeks', '10 weeks', '14 weeks'],            monthRanges: [[0,1],[1,1],[2,2],[3,3]] },
    { name: 'Hepatitis B',      ages: ['Birth', '6 weeks', '10 weeks', '14 weeks'],              monthRanges: [[0,1],[1,1],[2,2],[3,3]] },
    { name: 'DPT',              ages: ['6 weeks', '10 weeks', '14 weeks', '16-24 months', '5 yrs'], monthRanges: [[1,1],[2,2],[3,3],[16,24],[60,60]] },
    { name: 'Rotavirus',        ages: ['6 weeks', '10 weeks', '14 weeks'],                       monthRanges: [[1,1],[2,2],[3,3]] },
    { name: 'Pneumococcal (PCV)', ages: ['6 weeks', '14 weeks', '9 months'],                     monthRanges: [[1,1],[3,3],[9,9]] },
    { name: 'IPV',              ages: ['6 weeks', '14 weeks'],                                   monthRanges: [[1,1],[3,3]] },
    { name: 'Measles (MR)',     ages: ['9-12 months', '16-24 months'],                           monthRanges: [[9,12],[16,24]] },
    { name: 'Japanese Encephalitis', ages: ['9-12 months', '16-24 months'],                      monthRanges: [[9,12],[16,24]] },
    { name: 'Vitamin A',        ages: ['9 months (every 6mo)'],                                  monthRanges: [[9,999]] },
  ],

  // ── WHO EPI essential schedule (global reference baseline) ──────────────
  // CLINICAL-REVIEW: pending sign-off. Source: WHO recommended routine
  // immunizations for children. Used only as a reference for countries not in
  // this catalog — see VACCINE_SCHEDULE_SOURCES['WHO'].
  WHO: [
    { name: 'BCG',            ages: ['Birth'],                                 monthRanges: [[0,1]] },
    { name: 'Hepatitis B',    ages: ['Birth'],                                 monthRanges: [[0,1]] },
    { name: 'OPV (Polio)',    ages: ['Birth', '6 weeks', '10 weeks', '14 weeks'], monthRanges: [[0,1],[1,1],[2,2],[3,3]] },
    { name: 'IPV',            ages: ['14 weeks'],                              monthRanges: [[3,3]] },
    { name: 'Pentavalent',    ages: ['6 weeks', '10 weeks', '14 weeks'],       monthRanges: [[1,1],[2,2],[3,3]] },
    { name: 'Pneumococcal',   ages: ['6 weeks', '10 weeks', '14 weeks'],       monthRanges: [[1,1],[2,2],[3,3]] },
    { name: 'Rotavirus',      ages: ['6 weeks', '10 weeks'],                   monthRanges: [[1,1],[2,2]] },
    { name: 'Measles (MR)',   ages: ['9 months', '15-18 months'],             monthRanges: [[9,9],[15,18]] },
  ],
}

export interface VaccineScheduleSource {
  authority: string   // e.g. "US CDC/ACIP"
  title: string       // e.g. "CDC childhood immunization schedule"
  url: string
  reviewed: string    // ISO-ish "2026-07" — forcing-function against silent drift
}

export type ScheduleProvenance = 'national' | 'who-reference'

export interface ResolvedSchedule {
  entries: VaccineEntry[]
  provenance: ScheduleProvenance
  countryCode: string
  source: VaccineScheduleSource
}

// CLINICAL-REVIEW: pending sign-off — titles/URLs to be confirmed against each
// authority's current published schedule.
export const VACCINE_SCHEDULE_SOURCES: Record<string, VaccineScheduleSource> = {
  US: { authority: 'US CDC/ACIP', title: 'CDC childhood immunization schedule', url: 'https://www.cdc.gov/vaccines/schedules/', reviewed: '2026-07' },
  BR: { authority: 'Brasil PNI', title: 'Calendário Nacional de Vacinação (PNI)', url: 'https://www.gov.br/saude/pt-br/vacinacao', reviewed: '2026-07' },
  GB: { authority: 'UK NHS', title: 'NHS routine immunisation schedule', url: 'https://www.nhs.uk/vaccinations/nhs-vaccinations-and-when-to-have-them/', reviewed: '2026-07' },
  AU: { authority: 'Australia NIP', title: 'National Immunisation Program schedule', url: 'https://www.health.gov.au/topics/immunisation/nip', reviewed: '2026-07' },
  CA: { authority: 'PHAC Canada', title: 'Canadian Immunization Guide', url: 'https://www.canada.ca/en/public-health/services/canadian-immunization-guide.html', reviewed: '2026-07' },
  PT: { authority: 'Portugal DGS', title: 'Programa Nacional de Vacinação', url: 'https://www.sns.gov.pt/', reviewed: '2026-07' },
  DE: { authority: 'Germany STIKO', title: 'STIKO-Impfkalender', url: 'https://www.rki.de/impfen', reviewed: '2026-07' },
  FR: { authority: 'France', title: 'Calendrier vaccinal', url: 'https://sante.gouv.fr/', reviewed: '2026-07' },
  MX: { authority: 'México CENSIA', title: 'Cartilla Nacional de Vacunación', url: 'https://www.gob.mx/salud/censia', reviewed: '2026-07' },
  AR: { authority: 'Argentina MSAL', title: 'Calendario Nacional de Vacunación', url: 'https://www.argentina.gob.ar/salud', reviewed: '2026-07' },
  IN: { authority: 'India UIP', title: 'Universal Immunization Programme', url: 'https://www.nhp.gov.in/universal-immunisation-programme_pg', reviewed: '2026-07' },
  WHO: { authority: 'WHO', title: 'WHO recommended routine immunizations', url: 'https://immunizationdata.who.int/', reviewed: '2026-07' },
}

export function getScheduleForCountry(countryCode: string): ResolvedSchedule {
  const national = VACCINE_SCHEDULES[countryCode]
  if (national) {
    return {
      entries: national,
      provenance: 'national',
      countryCode,
      source: VACCINE_SCHEDULE_SOURCES[countryCode] ?? VACCINE_SCHEDULE_SOURCES['WHO'],
    }
  }
  // Uncatalogued country → honest WHO reference, NEVER a silent US substitution.
  return {
    entries: VACCINE_SCHEDULES['WHO'],
    provenance: 'who-reference',
    countryCode,
    source: VACCINE_SCHEDULE_SOURCES['WHO'],
  }
}

// Sentinel monthMax used in the schedule for annual / recurring vaccines
// (e.g. Influenza [6, 999] = "from 6 months onward, every year"). The
// overdue check for these doses lives in the date domain (months since
// last given) rather than the age domain (otherwise `ageMonths > 1000`
// would mean a child has to be 83 to be flagged for a missed flu shot).
const ANNUAL_VACCINE_SENTINEL = 999
const ANNUAL_OVERDUE_MONTHS = 13 // 12-month cycle + 1 month grace

// ─── Schedule tree ────────────────────────────────────────────────────────────

export interface MilestoneVaccineItem {
  name: string
  doseLabel: string   // "dose 2" or ""
  dueAge: string      // human label from schedule e.g. "4 months"
  status: 'done' | 'upcoming' | 'overdue' | 'future'
  givenDate?: string  // ISO date if done
  scheduleKey: string // unique key: "<name>-<doseIndex>"
}

export interface AgeMilestone {
  key: string                 // stringified monthMin e.g. "0", "2", "4"
  label: string               // display label e.g. "Birth", "2 Months"
  monthMin: number
  vaccines: MilestoneVaccineItem[]
  milestoneStatus: 'done' | 'partial' | 'future'
}

export function formatMilestoneLabel(monthMin: number, ageLabel: string): string {
  if (monthMin === 0) return 'Birth'
  return ageLabel.charAt(0).toUpperCase() + ageLabel.slice(1)
}

export function buildVaccineScheduleTree(
  birthDate: string,
  givenVaccines: HealthRecord[],
  countryCode: string = 'US',
): AgeMilestone[] {
  if (!birthDate) return []
  const ageMonths = getAgeMonths(birthDate)
  const schedule = getScheduleForCountry(countryCode)
  const milestoneMap = new Map<number, AgeMilestone>()

  const normalize = (s: string) => s.trim().toLowerCase()
  for (const v of schedule) {
    // Exact-name match — substring matching collides across vaccines
    // (e.g. Hepatitis A vs Hepatitis B, DTaP vs DTaP/IPV/Hib).
    const target = normalize(v.name)
    const doseCount = givenVaccines.filter((g) => normalize(g.value) === target).length

    const isAnnualSchedule = v.monthRanges.some(([, max]) => max === ANNUAL_VACCINE_SENTINEL)

    for (let i = 0; i < v.monthRanges.length; i++) {
      const [monthMin, monthMax] = v.monthRanges[i]
      const ageLabel = v.ages[i]

      let status: MilestoneVaccineItem['status']
      if (i < doseCount) {
        status = 'done'
      } else if (isAnnualSchedule) {
        // Annual vaccines: cap "overdue" against the time since the last
        // given dose, not the age domain — otherwise monthMax=999 means
        // the child must be ~83 years old to be marked overdue.
        if (ageMonths < monthMin - 2) {
          status = 'future'
        } else if (doseCount === 0) {
          status = ageMonths > monthMin + 2 ? 'overdue' : 'upcoming'
        } else {
          const lastDate = givenVaccines
            .filter((g) => normalize(g.value) === target)
            .map((g) => g.date)
            .sort()
            .pop()
          const monthsSinceLast = lastDate ? monthsSince(lastDate) : Infinity
          status = monthsSinceLast >= ANNUAL_OVERDUE_MONTHS
            ? 'overdue'
            : monthsSinceLast >= 11
              ? 'upcoming'
              : 'future'
        }
      } else if (ageMonths > monthMax + 1) {
        status = 'overdue'
      } else if (ageMonths >= monthMin - 2) {
        status = 'upcoming'
      } else {
        status = 'future'
      }

      let givenDate: string | undefined
      if (status === 'done') {
        const match = givenVaccines.filter((g) => normalize(g.value) === target)[i]
        givenDate = match?.date
      }

      if (!milestoneMap.has(monthMin)) {
        milestoneMap.set(monthMin, {
          key: String(monthMin),
          label: formatMilestoneLabel(monthMin, ageLabel),
          monthMin,
          vaccines: [],
          milestoneStatus: 'done',
        })
      }

      milestoneMap.get(monthMin)!.vaccines.push({
        name: v.name,
        doseLabel: v.monthRanges.length > 1 ? `dose ${i + 1}` : '',
        dueAge: ageLabel,
        status,
        givenDate,
        // Namespace by country so scheduled appointments don't leak across
        // schedules. E.g. a US "Hepatitis B-0" entry should not surface as
        // "matched" when the user switches to a UK schedule that has no
        // equivalent first-dose Hepatitis B.
        scheduleKey: `${countryCode}:${v.name}-${i}`,
      })
    }
  }

  for (const milestone of milestoneMap.values()) {
    const hasOverdueOrUpcoming = milestone.vaccines.some(
      (v) => v.status === 'overdue' || v.status === 'upcoming',
    )
    const allDone = milestone.vaccines.every((v) => v.status === 'done')
    if (allDone) milestone.milestoneStatus = 'done'
    else if (hasOverdueOrUpcoming) milestone.milestoneStatus = 'partial'
    else milestone.milestoneStatus = 'future'
  }

  return Array.from(milestoneMap.values()).sort((a, b) => a.monthMin - b.monthMin)
}

export function formatHealthDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return dateStr }
}

export interface UpcomingVaccine {
  key: string         // unique: name + dose index
  name: string
  doseLabel: string   // e.g. "dose 2"
  dueAge: string      // e.g. "4 months"
  overdue: boolean
}

export function monthsSince(dateStr: string): number {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return Infinity
  const now = new Date()
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
}

export function getNextDueVaccines(birthDate: string, givenVaccines: HealthRecord[], countryCode: string = 'US'): UpcomingVaccine[] {
  if (!birthDate) return []
  const ageMonths = getAgeMonths(birthDate)
  const result: UpcomingVaccine[] = []
  const schedule = getScheduleForCountry(countryCode)

  const normalize = (s: string) => s.trim().toLowerCase()
  for (const v of schedule) {
    const target = normalize(v.name)
    const matchedDoses = givenVaccines.filter((g) => normalize(g.value) === target)
    const doseCount = matchedDoses.length

    const isAnnualSchedule = v.monthRanges.some(([, max]) => max === ANNUAL_VACCINE_SENTINEL)

    if (!isAnnualSchedule && doseCount >= v.monthRanges.length) continue // all doses done

    // Annual vaccines reuse the same monthRange every year. Non-annual
    // vaccines advance through monthRanges by doseCount.
    const rangeIdx = isAnnualSchedule
      ? Math.min(doseCount, v.monthRanges.length - 1)
      : doseCount
    const [minMo, maxMo] = v.monthRanges[rangeIdx]

    let overdue = false
    let isUpcoming = false

    if (isAnnualSchedule) {
      // Child must be old enough for the vaccine, then surface every year.
      if (ageMonths < minMo - 2) continue
      if (doseCount === 0) {
        // Never received — overdue once they cross the minimum age window.
        overdue = ageMonths > minMo + 2
        isUpcoming = true
      } else {
        // Last dose: overdue if it's been > 13 months since the most
        // recent administration (yearly + grace).
        const lastDate = matchedDoses
          .map((g) => g.date)
          .sort()
          .pop()
        const monthsSinceLast = lastDate ? monthsSince(lastDate) : Infinity
        if (monthsSinceLast >= ANNUAL_OVERDUE_MONTHS) {
          overdue = true
          isUpcoming = true
        } else if (monthsSinceLast >= 11) {
          // Due window: within 2 months of the next annual dose.
          isUpcoming = true
        }
      }
    } else {
      // Regular scheduled dose: show if within 2 months of becoming
      // eligible, or overdue (up to 18 months past max age).
      isUpcoming = ageMonths >= minMo - 2 && ageMonths <= maxMo + 18
      overdue = ageMonths > maxMo + 1
    }

    if (!isUpcoming) continue

    result.push({
      key: `${v.name}-${doseCount}`,
      name: v.name,
      doseLabel: isAnnualSchedule
        ? (doseCount === 0 ? '' : `dose ${doseCount + 1}`)
        : (v.monthRanges.length > 1 ? `dose ${doseCount + 1}` : ''),
      dueAge: v.ages[Math.min(doseCount, v.ages.length - 1)],
      overdue,
    })
    if (result.length >= 5) break
  }

  return result
}

/**
 * Parse a child's growth-history entries into the latest weight + height.
 * Accepts any of:
 *   "Weight: 7.5 kg"  (the canonical writer at health-history.tsx)
 *   "weight 7.5kg"     (legacy / imported, no colon)
 *   "7.5 kg"           (just the number + unit)
 *   "7,5 kg"           (European comma decimal — normalize on read)
 *   "16.5 lbs"         (imperial — convert to kg)
 *   "33 in" / "33.5 inches" (imperial height — convert to cm)
 * Shared by KidsHome's HealthCard and the Health tracker sheet so both read
 * the "latest growth" identically.
 */
export function parseGrowthValue(entries: HealthRecord[]): { weight: string | null; height: string | null } {
  let weight: string | null = null
  let height: string | null = null

  const numPattern = '([0-9]+(?:[.,][0-9]+)?)'
  const toNum = (raw: string) => parseFloat(raw.replace(',', '.'))

  for (const e of entries) {
    const v = (e.value || '').trim()
    if (!weight) {
      // Prefer labeled match first ("weight: X kg" or "weight X kg"), then
      // fall back to a unit-only match ("X kg" or "X lbs"). lbs → kg.
      const labeled = v.match(new RegExp(`weight[:\\s]+${numPattern}\\s*(kg|lbs?|lb)`, 'i'))
      const bare = !labeled && v.match(new RegExp(`^${numPattern}\\s*(kg|lbs?|lb)$`, 'i'))
      const m = labeled || bare || null
      if (m) {
        const n = toNum(m[1])
        const unit = m[2].toLowerCase()
        const kg = unit === 'kg' ? n : n * 0.45359237
        weight = `${kg.toFixed(kg < 10 ? 2 : 1)} kg`
      }
    }
    if (!height) {
      const labeled = v.match(new RegExp(`height[:\\s]+${numPattern}\\s*(cm|in|inches?|inch)`, 'i'))
      const bare = !labeled && v.match(new RegExp(`^${numPattern}\\s*(cm|in|inches?|inch)$`, 'i'))
      const m = labeled || bare || null
      if (m) {
        const n = toNum(m[1])
        const unit = m[2].toLowerCase()
        const cm = unit === 'cm' ? n : n * 2.54
        height = `${cm.toFixed(1)} cm`
      }
    }
    if (weight && height) break
  }

  return { weight, height }
}
