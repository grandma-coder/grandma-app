/**
 * VaccineTrackerSheet — standalone vaccine-schedule sheet.
 *
 * Extracted verbatim from the "Vaccine Schedule" section of KidsHome's
 * `HealthDetailModal` (both the Diffuse and cream branches). Renders ONLY the
 * vaccine schedule: the age-milestone tree, per-dose rows with "Set date" /
 * mark-given actions, the inline date picker, the empty state, and the
 * per-vaccine info modal.
 *
 * The heavy machinery this section depends on — the `VaccineScheduleTree`
 * component, its child `VaccineInfoModal`, and the `buildVaccineScheduleTree`
 * data engine (plus the multi-country `VACCINE_SCHEDULES` catalog and the
 * small pure helpers `formatHealthDate` / `formatMilestoneLabel` /
 * `getScheduleForCountry` / `monthsSince`) — all live LOCALLY in KidsHome and
 * are not exported, so they are inlined here to keep this file self-contained.
 * When KidsHome's `HealthDetailModal` is retired (Task 6), these inlined
 * copies become the single source of truth for this surface.
 *
 * Shell mirrors `HealthDetailModal`: DiffuseSheet under `useIsDiffuse()`, else
 * LogSheet (which itself renders the cream paper-sheet chrome).
 */
import { useMemo, useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native'
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { useQuery } from '@tanstack/react-query'
import { Check } from 'lucide-react-native'
import { useTheme, brand, font, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../../../constants/theme'
import { useIsDiffuse, DiffuseArrow } from '../../ui/diffuse/DiffuseKit'
import { DiffuseSectionHeader, DiffuseSheet } from '../../ui/diffuse/DiffusePrimitives'
import { Character } from '../../characters/Characters'
import { Cross as CrossSticker } from '../../ui/Stickers'
import { LogSheet } from '../../calendar/LogSheet'
import { supabase } from '../../../lib/supabase'
import { getAgeMonths } from '../../../store/useGoalsStore'
import { getVaccineInfo, type VaccineInfo } from '../../../lib/vaccineInfo'
import { MEDICAL_DISCLAIMER, VACCINE_SCHEDULE_NOTE } from '../../../lib/medicalSources'
import type { ChildWithRole } from '../../../types'
import { useTranslation } from '../../../lib/i18n'
import type { TranslationKeys } from '../../../lib/i18n/keys'

// `kids_vaccines_title` is added by Task 7. Referenced verbatim here (do not
// substitute another key); cast so the file typechecks before the key lands.
// Until then t() returns the key name at runtime, per the Task 2 brief.
const KIDS_VACCINES_TITLE_KEY = 'kids_vaccines_title' as keyof TranslationKeys

// ─── Types (inlined from KidsHome — not exported there) ─────────────────────

interface HealthRecord {
  id: string
  type: string
  value: string
  notes: string
  date: string
}

interface HealthHistoryData {
  vaccines: HealthRecord[]
  meds: HealthRecord[]
  growth: HealthRecord[]
  temps: HealthRecord[]
  milestones: HealthRecord[]
}

interface MilestoneVaccineItem {
  name: string
  doseLabel: string   // "dose 2" or ""
  dueAge: string      // human label from schedule e.g. "4 months"
  status: 'done' | 'upcoming' | 'overdue' | 'future'
  givenDate?: string  // ISO date if done
  scheduleKey: string // unique key: "<name>-<doseIndex>"
}

interface AgeMilestone {
  key: string                 // stringified monthMin e.g. "0", "2", "4"
  label: string               // display label e.g. "Birth", "2 Months"
  monthMin: number
  vaccines: MilestoneVaccineItem[]
  milestoneStatus: 'done' | 'partial' | 'future'
}

type VaccineEntry = { name: string; ages: string[]; monthRanges: [number, number][] }

// ─── Vaccine catalog (inlined verbatim from KidsHome) ───────────────────────

const VACCINE_SCHEDULES: Record<string, VaccineEntry[]> = {
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
}

function getScheduleForCountry(countryCode: string): VaccineEntry[] {
  return VACCINE_SCHEDULES[countryCode] ?? VACCINE_SCHEDULES['US']
}

// Sentinel monthMax used in the schedule for annual / recurring vaccines
// (e.g. Influenza [6, 999] = "from 6 months onward, every year"). The
// overdue check for these doses lives in the date domain (months since
// last given) rather than the age domain (otherwise `ageMonths > 1000`
// would mean a child has to be 83 to be flagged for a missed flu shot).
const ANNUAL_VACCINE_SENTINEL = 999
const ANNUAL_OVERDUE_MONTHS = 13 // 12-month cycle + 1 month grace

function monthsSince(dateStr: string): number {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return Infinity
  const now = new Date()
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
}

function formatMilestoneLabel(monthMin: number, ageLabel: string): string {
  if (monthMin === 0) return 'Birth'
  return ageLabel.charAt(0).toUpperCase() + ageLabel.slice(1)
}

function formatHealthDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return dateStr }
}

function buildVaccineScheduleTree(
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

// ─── VaccineInfoModal (inlined verbatim from KidsHome) ──────────────────────

function VaccineInfoModal({ visible, onClose, vaccineName, doseLabel, info, accent }: {
  visible: boolean; onClose: () => void
  vaccineName: string; doseLabel: string
  info: VaccineInfo | null
  accent: string
}) {
  const { colors, isDark, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const ink = colors.text
  const ink3 = colors.textMuted
  const paper = colors.surface
  const paperBorder = colors.border

  if (diffuse) {
    const dCol = dt.colors
    const acc = getDiffuseAccent('kids', dt.isDark)
    return (
      <DiffuseSheet
        visible={visible}
        title={vaccineName}
        onClose={onClose}
        chip={doseLabel || undefined}
      >
        <View style={{ alignItems: 'flex-start', marginBottom: 18 }}>
          <Character name="vaccine" size={28} color={acc} />
        </View>
        {info ? (
          <View style={{ gap: 18 }}>
            <View>
              <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: dCol.ink3, marginBottom: 7 }}>{t('kids_home_vaccine_info_protects')}</Text>
              <Text style={{ fontFamily: diffuseFont.body, fontSize: 15, lineHeight: 23, color: dCol.ink }}>{info.protects}</Text>
            </View>
            <View>
              <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: dCol.ink3, marginBottom: 7 }}>{t('kids_home_vaccine_info_why')}</Text>
              <Text style={{ fontFamily: diffuseFont.body, fontSize: 14, lineHeight: 22, color: dCol.ink2 }}>{info.why}</Text>
            </View>
            {info.sideEffects ? (
              <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: dCol.line2, paddingTop: 16 }}>
                <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: dCol.ink3, marginBottom: 7 }}>{t('kids_home_vaccine_info_side_effects')}</Text>
                <Text style={{ fontFamily: diffuseFont.body, fontSize: 13, lineHeight: 21, color: dCol.ink2 }}>{info.sideEffects}</Text>
              </View>
            ) : null}
            <Text style={{ fontFamily: diffuseFont.italic, fontSize: 12, color: dCol.ink3, textAlign: 'center', marginTop: 4 }}>{t('kids_home_vaccine_info_disclaimer')}</Text>
            <Text style={{ fontFamily: diffuseFont.body, fontSize: 11, lineHeight: 16, color: dCol.ink3, textAlign: 'center' }}>{MEDICAL_DISCLAIMER}</Text>
            <Text style={{ fontFamily: diffuseFont.body, fontSize: 11, lineHeight: 16, color: dCol.ink3, textAlign: 'center' }}>{VACCINE_SCHEDULE_NOTE}</Text>
          </View>
        ) : (
          <Text style={{ fontFamily: diffuseFont.body, fontSize: 14, lineHeight: 22, color: dCol.ink3 }}>{t('kids_home_vaccine_no_info')}</Text>
        )}
      </DiffuseSheet>
    )
  }

  return (
    <LogSheet
      visible={visible}
      title={vaccineName}
      onClose={onClose}
      chip={doseLabel || undefined}
    >
      {info ? (
        <View style={{ gap: 16 }}>
          <View>
            <Text style={{ color: ink3, fontSize: 11, fontFamily: font.bodySemiBold, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 6 }}>
              {t('kids_home_vaccine_info_protects')}
            </Text>
            <Text style={{ color: ink, fontSize: 15, fontFamily: font.bodyMedium, lineHeight: 22 }}>
              {info.protects}
            </Text>
          </View>
          <View>
            <Text style={{ color: ink3, fontSize: 11, fontFamily: font.bodySemiBold, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 6 }}>
              {t('kids_home_vaccine_info_why')}
            </Text>
            <Text style={{ color: ink, fontSize: 14, fontFamily: font.body, lineHeight: 22 }}>
              {info.why}
            </Text>
          </View>
          {info.sideEffects && (
            <View style={{ backgroundColor: paper, borderWidth: 1, borderColor: paperBorder, borderRadius: 18, padding: 14, gap: 4 }}>
              <Text style={{ color: ink3, fontSize: 11, fontFamily: font.bodySemiBold, textTransform: 'uppercase', letterSpacing: 1.4 }}>
                {t('kids_home_vaccine_info_side_effects')}
              </Text>
              <Text style={{ color: ink, fontSize: 13, fontFamily: font.body, lineHeight: 20 }}>
                {info.sideEffects}
              </Text>
            </View>
          )}
          <Text style={{ color: ink3, fontSize: 11, fontFamily: font.body, fontStyle: 'italic', textAlign: 'center', marginTop: 8 }}>
            {t('kids_home_vaccine_info_disclaimer')}
          </Text>
          <Text style={{ color: colors.textMuted, fontFamily: font.body, fontSize: 11, marginTop: 12, textAlign: 'center', lineHeight: 16 }}>
            {MEDICAL_DISCLAIMER}
          </Text>
          <Text style={{ color: colors.textMuted, fontFamily: font.body, fontSize: 11, marginTop: 6, textAlign: 'center', lineHeight: 16 }}>
            {VACCINE_SCHEDULE_NOTE}
          </Text>
        </View>
      ) : (
        <Text style={{ color: ink3, fontSize: 14, fontFamily: font.body, lineHeight: 22 }}>
          {t('kids_home_vaccine_no_info')}
        </Text>
      )}
    </LogSheet>
  )
}

// ─── VaccineScheduleTree (inlined verbatim from KidsHome) ────────────────────

function VaccineScheduleTree({ child, healthHistory, scheduledVaccines, onSetVaccineDate, onMarkVaccineGiven }: {
  child: ChildWithRole
  healthHistory: HealthHistoryData
  scheduledVaccines: Record<string, string>
  onSetVaccineDate: (key: string, date: string | null) => void
  onMarkVaccineGiven: (name: string, date: string, key: string) => Promise<void>
}) {
  const { colors, isDark, stickers: themeStickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const milestones = useMemo(
    () => buildVaccineScheduleTree(child.birthDate ?? '', healthHistory.vaccines, child.countryCode ?? 'US'),
    [child.birthDate, healthHistory.vaccines, child.countryCode],
  )

  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(() => {
    const set = new Set<string>()
    for (const m of milestones) {
      if (m.milestoneStatus === 'partial') set.add(m.key)
    }
    return set
  })
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [pickerDate, setPickerDate] = useState(new Date())
  const [infoVaccine, setInfoVaccine] = useState<{ name: string; doseLabel: string; info: VaccineInfo | null; accent: string } | null>(null)
  // Some Android DateTimePicker builds fire `set` twice for a single confirm
  // (notably across rotation). Track which scheduleKey we've already
  // written so the duplicate doesn't corrupt scheduledVaccines.
  const datePickerWroteRef = useRef<string | null>(null)

  const ink = colors.text
  const ink3 = colors.textMuted

  // Sticker palette (cream-paper design system) — bright fills + ink borders for the sticker-on-paper feel
  const ST_INK = '#141313'
  const ST_GREEN = themeStickers.green
  const ST_GREEN_SOFT = isDark ? '#283016' : '#DDE7BB'
  const ST_YELLOW = themeStickers.yellow
  const ST_YELLOW_SOFT = isDark ? '#3A3116' : '#FBEA9E'
  const ST_PEACH = themeStickers.peach
  const ST_PEACH_SOFT = isDark ? '#3A2618' : '#F9D6C0'
  const ST_CREAM = isDark ? colors.surface : '#F7F0DF'
  const ST_LINE = isDark ? 'rgba(245,237,220,0.20)' : 'rgba(20,19,19,0.20)'

  const DONE_BG = ST_GREEN
  const DONE_BORDER = ST_INK
  const DONE_INK = ST_INK
  const PARTIAL_BG = ST_YELLOW
  const PARTIAL_BORDER = ST_INK
  const PARTIAL_INK = ST_INK
  const OVERDUE_BG = ST_PEACH
  const OVERDUE_BORDER = ST_INK
  const FUTURE_BG = ST_CREAM
  const FUTURE_BORDER = ST_LINE

  function toggleMilestone(key: string) {
    setExpandedMilestones((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (milestones.length === 0) {
    if (diffuse) {
      return (
        <Text style={{ fontFamily: diffuseFont.body, fontSize: 13, color: dt.colors.ink3, marginBottom: 8 }}>
          {t('kids_home_vaccine_schedule_empty')}
        </Text>
      )
    }
    return (
      <Text style={{ color: ink3, fontSize: 13, marginBottom: 8 }}>
        {t('kids_home_vaccine_schedule_empty')}
      </Text>
    )
  }

  if (diffuse) {
    const dCol = dt.colors
    const acc = getDiffuseAccent('kids', dt.isDark)
    // Node states: done = filled ink ring; partial/upcoming = hollow accent ring; future = faint hollow.
    return (
      <View>
        {milestones.map((milestone, idx) => {
          const isExpanded = expandedMilestones.has(milestone.key)
          const isLast = idx === milestones.length - 1
          const isDoneMilestone = milestone.milestoneStatus === 'done'
          const isPartialMilestone = milestone.milestoneStatus === 'partial'
          const doneCount = milestone.vaccines.filter((v) => v.status === 'done').length
          const totalCount = milestone.vaccines.length
          const badgeText = isDoneMilestone
            ? `${doneCount}/${totalCount} done`
            : isPartialMilestone
            ? `${doneCount}/${totalCount} · due soon`
            : `${totalCount} ahead`
          // milestone node ring
          const nodeFill = isDoneMilestone ? dCol.ink : dCol.bg
          const nodeStroke = isDoneMilestone ? dCol.ink : isPartialMilestone ? acc : dCol.line2

          return (
            <View key={milestone.key} style={{ position: 'relative' }}>
              {/* connector line */}
              {!isLast ? (
                <View pointerEvents="none" style={{ position: 'absolute', left: 12, top: 24, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: dCol.line2 }} />
              ) : null}
              {/* milestone row */}
              <Pressable
                onPress={() => toggleMilestone(milestone.key)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 }}
              >
                {/* ring node */}
                <View style={{ width: 25, alignItems: 'center' }}>
                  <View style={{ width: 15, height: 15, borderRadius: 999, borderWidth: 1.5, borderColor: nodeStroke, backgroundColor: nodeFill, alignItems: 'center', justifyContent: 'center' }}>
                    {isDoneMilestone ? <Check size={9} color={dCol.bg} strokeWidth={3} /> : null}
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: diffuseFont.display, fontSize: 18, color: dCol.ink, letterSpacing: -0.3 }}>{milestone.label}</Text>
                  <Text style={{ fontFamily: diffuseFont.mono, fontSize: 9.5, letterSpacing: 1, textTransform: 'uppercase', color: isDoneMilestone ? dCol.ink2 : dCol.ink3, marginTop: 4 }}>{badgeText}</Text>
                </View>
                <Text style={{ fontFamily: diffuseFont.body, fontSize: 18, color: dCol.ink3, width: 20, textAlign: 'center' }}>{isExpanded ? '−' : '+'}</Text>
              </Pressable>

              {/* expanded vaccine list */}
              {isExpanded ? (
                <View style={{ marginLeft: 12, paddingLeft: 24, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: dCol.line2, paddingBottom: isLast ? 0 : 6 }}>
                  {milestone.vaccines.map((vax) => {
                    const apptDate = scheduledVaccines[vax.scheduleKey] ?? null
                    const isPickerOpen = expandedKey === vax.scheduleKey
                    const fullName = vax.name + (vax.doseLabel ? ` · ${vax.doseLabel}` : '')
                    // vaccine dot ring
                    const dotFill = vax.status === 'done' ? dCol.ink : dCol.bg
                    const dotStroke = vax.status === 'done' ? dCol.ink
                      : vax.status === 'overdue' ? dCol.error
                      : vax.status === 'upcoming' ? acc
                      : dCol.line2
                    return (
                      <View key={vax.scheduleKey}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
                          <Pressable
                            onPress={() => setInfoVaccine({
                              name: vax.name,
                              doseLabel: vax.doseLabel,
                              info: getVaccineInfo(vax.name),
                              accent: acc,
                            })}
                            style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.6 : 1 })}
                          >
                            <View style={{ width: 12, height: 12, borderRadius: 999, borderWidth: 1.5, borderColor: dotStroke, backgroundColor: dotFill, flexShrink: 0 }} />
                            <Text style={{ flex: 1, fontFamily: diffuseFont.body, fontSize: 14, color: dCol.ink }}>{fullName}</Text>
                          </Pressable>
                          {vax.status === 'done' ? (
                            <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 0.5, color: dCol.ink3 }}>{vax.givenDate ? formatHealthDate(vax.givenDate) : ''}</Text>
                          ) : vax.status === 'upcoming' || vax.status === 'overdue' ? (
                            apptDate ? (
                              <View style={{ gap: 6, alignItems: 'flex-end' }}>
                                <Pressable onPress={() => { setExpandedKey(isPickerOpen ? null : vax.scheduleKey); setPickerDate(new Date(apptDate + 'T12:00:00')) }}>
                                  <Text style={{ fontFamily: diffuseFont.monoBold, fontSize: 11, letterSpacing: 0.5, color: dCol.ink }}>{formatHealthDate(apptDate)}</Text>
                                </Pressable>
                                <Pressable
                                  onPress={() => onMarkVaccineGiven(vax.name + (vax.doseLabel ? ` - ${vax.doseLabel}` : ''), apptDate, vax.scheduleKey)}
                                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 5, opacity: pressed ? 0.6 : 1 })}
                                >
                                  <Check size={11} color={dCol.success} strokeWidth={2.5} />
                                  <Text style={{ fontFamily: diffuseFont.mono, fontSize: 9.5, letterSpacing: 1, textTransform: 'uppercase', color: dCol.success }}>{t('kids_home_vaccine_mark_given')}</Text>
                                </Pressable>
                              </View>
                            ) : (
                              <Pressable
                                onPress={() => { setExpandedKey(isPickerOpen ? null : vax.scheduleKey); setPickerDate(new Date()) }}
                                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 5, opacity: pressed ? 0.6 : 1 })}
                              >
                                <Text style={{ fontFamily: diffuseFont.mono, fontSize: 9.5, letterSpacing: 1, textTransform: 'uppercase', color: dCol.ink2 }}>{t('kids_home_vaccine_set_date')}</Text>
                                <DiffuseArrow color={dCol.ink3} size={14} />
                              </Pressable>
                            )
                          ) : (
                            <Text style={{ fontFamily: diffuseFont.mono, fontSize: 9.5, letterSpacing: 0.5, color: dCol.ink3 }}>{vax.dueAge}</Text>
                          )}
                        </View>

                        {/* inline date picker — hairline card */}
                        {isPickerOpen ? (
                          <View style={{ marginTop: 4, marginBottom: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: dCol.line2, borderRadius: 20, padding: 12, backgroundColor: dCol.surface }}>
                            <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: dCol.ink3, paddingHorizontal: 4, paddingBottom: 4 }}>{t('kids_home_picker_pick_date')}</Text>
                            <DateTimePicker
                              value={pickerDate}
                              mode="date"
                              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                              minimumDate={new Date()}
                              themeVariant={dt.isDark ? 'dark' : 'light'}
                              accentColor={acc}
                              textColor={dCol.ink}
                              onChange={(e: DateTimePickerEvent, d?: Date) => {
                                if (Platform.OS === 'android') setExpandedKey(null)
                                if (e.type === 'set' && d) {
                                  if (datePickerWroteRef.current === vax.scheduleKey) return
                                  datePickerWroteRef.current = vax.scheduleKey
                                  setPickerDate(d)
                                  const y = d.getFullYear()
                                  const mo = String(d.getMonth() + 1).padStart(2, '0')
                                  const day = String(d.getDate()).padStart(2, '0')
                                  onSetVaccineDate(vax.scheduleKey, `${y}-${mo}-${day}`)
                                  if (Platform.OS === 'android') setExpandedKey(null)
                                  setTimeout(() => { datePickerWroteRef.current = null }, 0)
                                }
                                if (e.type === 'dismissed') {
                                  datePickerWroteRef.current = null
                                  setExpandedKey(null)
                                }
                              }}
                            />
                            {Platform.OS === 'ios' ? (
                              <Pressable
                                onPress={() => setExpandedKey(null)}
                                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: dCol.line2, paddingTop: 14, marginTop: 6, opacity: pressed ? 0.6 : 1 })}
                              >
                                <Text style={{ fontFamily: diffuseFont.mono, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: dCol.ink }}>{t('common_done')}</Text>
                                <DiffuseArrow color={dCol.ink3} size={16} />
                              </Pressable>
                            ) : null}
                          </View>
                        ) : null}
                      </View>
                    )
                  })}
                </View>
              ) : null}
            </View>
          )
        })}
        <VaccineInfoModal
          visible={infoVaccine !== null}
          onClose={() => setInfoVaccine(null)}
          vaccineName={infoVaccine?.name ?? ''}
          doseLabel={infoVaccine?.doseLabel ?? ''}
          info={infoVaccine?.info ?? null}
          accent={infoVaccine?.accent ?? acc}
        />
      </View>
    )
  }

  return (
    <View>
      {milestones.map((milestone, idx) => {
        const isExpanded = expandedMilestones.has(milestone.key)
        const isLast = idx === milestones.length - 1

        const isDoneMilestone = milestone.milestoneStatus === 'done'
        const isPartialMilestone = milestone.milestoneStatus === 'partial'

        const nodeBg = isDoneMilestone ? DONE_BG : isPartialMilestone ? PARTIAL_BG : FUTURE_BG
        const nodeBorder = isDoneMilestone ? DONE_BORDER : isPartialMilestone ? PARTIAL_BORDER : FUTURE_BORDER
        const nodeAccent = isDoneMilestone ? ST_GREEN : isPartialMilestone ? ST_YELLOW : ST_PEACH

        const doneCount = milestone.vaccines.filter((v) => v.status === 'done').length
        const totalCount = milestone.vaccines.length
        const badgeText = isDoneMilestone
          ? `${doneCount}/${totalCount} done`
          : isPartialMilestone
          ? `${doneCount}/${totalCount} · due soon`
          : `${totalCount} ahead`

        return (
          <View key={milestone.key} style={{ marginBottom: 4 }}>
            {/* Age milestone row — sticker-on-paper */}
            <Pressable
              onPress={() => toggleMilestone(milestone.key)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}
            >
              {/* Squishy sticker age node */}
              <View style={{
                width: 52, height: 44, borderRadius: 14,
                backgroundColor: nodeBg, borderWidth: 1.5, borderColor: nodeBorder,
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                shadowColor: ST_INK, shadowOffset: { width: 0, height: 3 },
                shadowOpacity: isDoneMilestone || isPartialMilestone ? 1 : 0,
                shadowRadius: 0, elevation: isDoneMilestone || isPartialMilestone ? 3 : 0,
              }}>
                <Text style={{
                  fontSize: 11, fontFamily: font.display,
                  color: isDoneMilestone || isPartialMilestone ? ST_INK : ink3,
                  textAlign: 'center', lineHeight: 13, letterSpacing: -0.2,
                }}>
                  {milestone.label.replace(/^Months$/i, 'mo').replace(/\bMonths\b/g, 'mo').replace(/\bYears\b/g, 'yr')}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontFamily: font.display, color: ink, letterSpacing: -0.3 }}>
                  {milestone.label}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  {isDoneMilestone && <Check size={10} color={ST_INK} strokeWidth={3} />}
                  <Text style={{
                    fontSize: 11, fontFamily: font.bodySemiBold,
                    color: isDoneMilestone || isPartialMilestone ? ST_INK : ink3,
                    textTransform: 'uppercase', letterSpacing: 0.8,
                  }}>
                    {badgeText}
                  </Text>
                </View>
              </View>
              <View style={{
                width: 24, height: 24, borderRadius: 12,
                backgroundColor: isExpanded ? nodeAccent : 'transparent',
                borderWidth: 1.5, borderColor: isExpanded ? ST_INK : ST_LINE,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 10, color: isExpanded ? ST_INK : ink3, fontFamily: font.bodyBold }}>
                  {isExpanded ? '−' : '+'}
                </Text>
              </View>
            </Pressable>

            {/* Branch content */}
            {isExpanded ? (
              <View style={{
                borderLeftWidth: 2, borderLeftColor: nodeBorder,
                borderStyle: 'dashed',
                marginLeft: 25, marginBottom: isLast ? 0 : 4, paddingBottom: 4, paddingTop: 2,
              }}>
                {milestone.vaccines.map((vax) => {
                  const apptDate = scheduledVaccines[vax.scheduleKey] ?? null
                  const isPickerOpen = expandedKey === vax.scheduleKey
                  const fullName = vax.name + (vax.doseLabel ? ` · ${vax.doseLabel}` : '')

                  const stickerFill = vax.status === 'done' ? ST_GREEN
                    : vax.status === 'overdue' ? ST_PEACH
                    : vax.status === 'upcoming' ? ST_YELLOW
                    : ST_CREAM
                  const stickerStroke = vax.status === 'future' ? ST_LINE : ST_INK
                  const metaColor = vax.status === 'done' ? (isDark ? ST_GREEN : '#3A7A28')
                    : vax.status === 'overdue' ? (isDark ? ST_PEACH : '#8A3A00')
                    : vax.status === 'upcoming' ? (isDark ? ST_YELLOW : '#7A6100')
                    : ink3

                  return (
                    <View key={vax.scheduleKey}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, paddingLeft: 12, paddingRight: 4 }}>
                        {/* Cross sticker + name — tap to open info */}
                        <Pressable
                          onPress={() => setInfoVaccine({
                            name: vax.name,
                            doseLabel: vax.doseLabel,
                            info: getVaccineInfo(vax.name),
                            accent: stickerFill,
                          })}
                          style={({ pressed }) => ({
                            flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
                            opacity: pressed ? 0.65 : 1,
                          })}
                        >
                          {/* Cross sticker bullet */}
                          <View style={{
                            width: 22, height: 22, alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                            shadowColor: ST_INK,
                            shadowOffset: { width: 0, height: 1.5 },
                            shadowOpacity: vax.status === 'future' ? 0 : 0.5,
                            shadowRadius: 0, elevation: vax.status === 'future' ? 0 : 2,
                          }}>
                            <CrossSticker size={22} fill={stickerFill} stroke={stickerStroke} />
                            {vax.status === 'done' && (
                              <View style={{ position: 'absolute' }}>
                                <Check size={10} color={ST_INK} strokeWidth={3.5} />
                              </View>
                            )}
                          </View>
                          {/* Name */}
                          <Text style={{ flex: 1, fontSize: 13, fontFamily: font.bodyMedium, color: ink }}>
                            {fullName}
                          </Text>
                        </Pressable>
                        {/* Meta / actions */}
                        {vax.status === 'done' ? (
                          <Text style={{ fontSize: 11, fontFamily: font.bodyMedium, color: metaColor }}>
                            {vax.givenDate ? formatHealthDate(vax.givenDate) : ''}
                          </Text>
                        ) : vax.status === 'upcoming' || vax.status === 'overdue' ? (
                          apptDate ? (
                            <View style={{ gap: 4, alignItems: 'flex-end' }}>
                              <Pressable onPress={() => {
                                setExpandedKey(isPickerOpen ? null : vax.scheduleKey)
                                setPickerDate(new Date(apptDate + 'T12:00:00'))
                              }}>
                                <Text style={{ fontSize: 11, fontFamily: font.bodySemiBold, color: ST_INK }}>
                                  {formatHealthDate(apptDate)}
                                </Text>
                              </Pressable>
                              <Pressable
                                onPress={() => onMarkVaccineGiven(
                                  vax.name + (vax.doseLabel ? ` - ${vax.doseLabel}` : ''),
                                  apptDate,
                                  vax.scheduleKey,
                                )}
                                style={[styles.hdVaxBtn, { backgroundColor: brand.success + '18', borderColor: brand.success + '50' }]}
                              >
                                <Check size={10} color={brand.success} strokeWidth={3} />
                                <Text style={[styles.hdVaxBtnText, { color: brand.success }]}>{t('kids_home_vaccine_mark_given')}</Text>
                              </Pressable>
                            </View>
                          ) : (
                            <Pressable
                              onPress={() => {
                                setExpandedKey(isPickerOpen ? null : vax.scheduleKey)
                                setPickerDate(new Date())
                              }}
                              style={[styles.hdVaxBtn, { backgroundColor: colors.surface, borderColor: colors.borderStrong }]}
                            >
                              <Text style={[styles.hdVaxBtnText, { color: colors.textSecondary }]}>{t('kids_home_vaccine_set_date')}</Text>
                            </Pressable>
                          )
                        ) : (
                          <Text style={{ fontSize: 10, fontFamily: font.body, color: ink3 }}>
                            {vax.dueAge}
                          </Text>
                        )}
                      </View>

                      {/* Inline date picker — sticker-paper card */}
                      {isPickerOpen && (
                        <View style={{
                          marginTop: 6, marginBottom: 12, marginLeft: 10, marginRight: 4,
                          backgroundColor: colors.surface,
                          borderWidth: 1.5, borderColor: ST_INK,
                          borderRadius: 22, padding: 12,
                          shadowColor: ST_INK,
                          shadowOffset: { width: 0, height: 3 },
                          shadowOpacity: 1,
                          shadowRadius: 0,
                          elevation: 3,
                        }}>
                          <Text style={{
                            fontSize: 11, fontFamily: font.bodySemiBold,
                            color: ink3, textTransform: 'uppercase', letterSpacing: 1.4,
                            paddingHorizontal: 4, paddingBottom: 4,
                          }}>
                            {t('kids_home_picker_pick_date')}
                          </Text>
                          <DateTimePicker
                            value={pickerDate}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            minimumDate={new Date()}
                            themeVariant={isDark ? 'dark' : 'light'}
                            accentColor={ST_INK}
                            textColor={ST_INK}
                            onChange={(e: DateTimePickerEvent, d?: Date) => {
                              if (Platform.OS === 'android') setExpandedKey(null)
                              if (e.type === 'set' && d) {
                                // Some Android builds fire `set` twice on a
                                // single confirm (notably across rotation /
                                // double-tap). Guard so onSetVaccineDate
                                // can't write the same date twice.
                                if (datePickerWroteRef.current === vax.scheduleKey) return
                                datePickerWroteRef.current = vax.scheduleKey
                                setPickerDate(d)
                                const y = d.getFullYear()
                                const mo = String(d.getMonth() + 1).padStart(2, '0')
                                const day = String(d.getDate()).padStart(2, '0')
                                onSetVaccineDate(vax.scheduleKey, `${y}-${mo}-${day}`)
                                if (Platform.OS === 'android') setExpandedKey(null)
                                // Release the guard on the next tick so the
                                // picker can be reopened cleanly.
                                setTimeout(() => { datePickerWroteRef.current = null }, 0)
                              }
                              if (e.type === 'dismissed') {
                                datePickerWroteRef.current = null
                                setExpandedKey(null)
                              }
                            }}
                          />
                          {Platform.OS === 'ios' && (
                            <Pressable
                              onPress={() => setExpandedKey(null)}
                              style={({ pressed }) => ({
                                alignSelf: 'center',
                                marginTop: 6,
                                paddingHorizontal: 28,
                                height: 44,
                                borderRadius: 999,
                                borderWidth: 2,
                                borderColor: ST_INK,
                                backgroundColor: ST_YELLOW,
                                alignItems: 'center',
                                justifyContent: 'center',
                                shadowColor: ST_INK,
                                shadowOffset: { width: 0, height: pressed ? 1 : 3 },
                                shadowOpacity: 1,
                                shadowRadius: 0,
                                elevation: 4,
                                transform: [{ translateY: pressed ? 2 : 0 }],
                              })}
                            >
                              <Text style={{
                                fontSize: 14, fontFamily: font.bodyBold,
                                color: ST_INK, letterSpacing: -0.2,
                              }}>
                                {t('common_done')}
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      )}
                    </View>
                  )
                })}
              </View>
            ) : (
              /* Collapsed: dashed stub + one-line summary for done milestones */
              <View style={{
                borderLeftWidth: 2,
                borderLeftColor: isDoneMilestone ? ST_GREEN : ST_LINE,
                borderStyle: 'dashed',
                marginLeft: 25,
                marginBottom: isLast ? 0 : 4,
                paddingBottom: 6,
                minHeight: 14,
              }}>
                {isDoneMilestone && (
                  <Text style={{ fontSize: 11, fontFamily: font.body, color: ink3, paddingLeft: 12, paddingTop: 4 }} numberOfLines={1}>
                    {milestone.vaccines.map((v) => v.name.split(' ')[0]).join(' · ')}
                    {milestone.vaccines[0]?.givenDate ? ` · ${formatHealthDate(milestone.vaccines[0].givenDate)}` : ''}
                  </Text>
                )}
              </View>
            )}
          </View>
        )
      })}
      <VaccineInfoModal
        visible={infoVaccine !== null}
        onClose={() => setInfoVaccine(null)}
        vaccineName={infoVaccine?.name ?? ''}
        doseLabel={infoVaccine?.doseLabel ?? ''}
        info={infoVaccine?.info ?? null}
        accent={infoVaccine?.accent ?? ST_YELLOW}
      />
    </View>
  )
}

// ─── VaccineTrackerSheet — exported shell ───────────────────────────────────

interface VaccineTrackerSheetProps {
  visible: boolean
  onClose: () => void
  child: ChildWithRole
  childColor?: string
  scheduledVaccines: Record<string, string>
  onSetVaccineDate: (key: string, date: string | null) => void
  onMarkVaccineGiven: (name: string, date: string, key: string) => Promise<void>
}

/**
 * Standalone vaccine-schedule sheet. Reads the child's vaccine history from the
 * child store so the parent only has to pass the schedule/handler props.
 */
export function VaccineTrackerSheet({
  visible,
  onClose,
  child,
  childColor,
  scheduledVaccines,
  onSetVaccineDate,
  onMarkVaccineGiven,
}: VaccineTrackerSheetProps) {
  const { colors, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()

  // The tree derives per-dose "done" status from the child's recorded vaccine
  // history (child_logs, type='vaccine'). HealthDetailModal received this as a
  // `healthHistory` prop from KidsHome's main component; this standalone sheet
  // (props deliberately omit healthHistory) fetches the vaccine records itself
  // via the same child_logs query, so it stays self-contained for Task 5's
  // mount. Only `vaccines` is read by VaccineScheduleTree.
  const { data: vaccineRecords } = useQuery({
    queryKey: ['vaccine-tracker-history', child.id],
    queryFn: async (): Promise<HealthRecord[]> => {
      const { data } = await supabase
        .from('child_logs')
        .select('id, type, value, notes, date')
        .eq('child_id', child.id)
        .eq('type', 'vaccine')
        .order('date', { ascending: false })
        .limit(50)
      if (!data) return []
      return (data as any[]).map((r) => ({
        id: r.id,
        type: r.type,
        value: typeof r.value === 'string' ? r.value : JSON.stringify(r.value ?? ''),
        notes: r.notes ?? '',
        date: String(r.date ?? '').substring(0, 10),
      }))
    },
    enabled: visible && !!child.id,
  })

  const healthHistory: HealthHistoryData = useMemo(
    () => ({
      vaccines: vaccineRecords ?? [],
      meds: [],
      growth: [],
      temps: [],
      milestones: [],
    }),
    [vaccineRecords],
  )

  const stickerInk = isDark ? 'rgba(255,255,255,0.18)' : '#141313'

  if (diffuse) {
    const acc = getDiffuseAccent('kids', dt.isDark)
    return (
      <DiffuseSheet
        visible={visible}
        title={t(KIDS_VACCINES_TITLE_KEY)}
        onClose={onClose}
        chip={childColor ? child.name : undefined}
      >
        <DiffuseSectionHeader
          title={t('kids_home_health_vaccine_schedule')}
          icon={<Character name="vaccine" size={21} color={acc} />}
        />
        <VaccineScheduleTree
          child={child}
          healthHistory={healthHistory}
          scheduledVaccines={scheduledVaccines}
          onSetVaccineDate={onSetVaccineDate}
          onMarkVaccineGiven={onMarkVaccineGiven}
        />
      </DiffuseSheet>
    )
  }

  return (
    <LogSheet
      visible={visible}
      title={t(KIDS_VACCINES_TITLE_KEY)}
      onClose={onClose}
      chip={childColor ? child.name : undefined}
      chipColor={childColor}
    >
      <View style={styles.modalSectionRow}>
        <View style={{ transform: [{ rotate: '-6deg' }] }}>
          <CrossSticker size={22} fill="#F5D652" stroke={stickerInk} />
        </View>
        <Text style={[styles.modalSectionTitle, { color: colors.text, marginTop: 0, marginBottom: 0 }]}>{t('kids_home_health_vaccine_schedule')}</Text>
      </View>
      <VaccineScheduleTree
        child={child}
        healthHistory={healthHistory}
        scheduledVaccines={scheduledVaccines}
        onSetVaccineDate={onSetVaccineDate}
        onMarkVaccineGiven={onMarkVaccineGiven}
      />
    </LogSheet>
  )
}

const styles = StyleSheet.create({
  modalSectionTitle: { fontSize: 17, fontFamily: font.displayBold, marginTop: 20, marginBottom: 10, letterSpacing: -0.3 },
  modalSectionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 22, marginBottom: 8 },
  hdVaxBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  hdVaxBtnText: { fontSize: 12, fontFamily: font.bodySemiBold },
})
