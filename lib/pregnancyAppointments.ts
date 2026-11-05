// lib/pregnancyAppointments.ts
// Standard pregnancy appointment timeline — pre-seeded for all users.
// Aligned with ACOG-recommended prenatal care: 10 universal milestones from
// confirmation through pre-birth. Conditional items (3-hr GTT, amnio, NST,
// flu shot, COVID booster) are intentionally not in the curve to keep it
// focused — they surface contextually elsewhere.

import { useLanguageStore } from '../store/useLanguageStore'
import { PREGNANCY_CONTENT } from './pregnancyContent'

import { APPOINTMENTS_SOURCE_NOTE, STANDARD_APPOINTMENTS, type StandardAppointment } from './pregnancyAppointmentsData'
export { APPOINTMENTS_SOURCE_NOTE, STANDARD_APPOINTMENTS, type StandardAppointment }


export function getAppointmentByWeek(week: number): StandardAppointment | undefined {
  return STANDARD_APPOINTMENTS.find((a) => a.week === week)
}

export function getUpcomingAppointment(currentWeek: number): StandardAppointment | undefined {
  return getStandardAppointments().find((a) => a.week >= currentWeek)
}

const localizedCache = new Map<string, StandardAppointment[]>()

/** The standard timeline in the app language (bundled translations; English falls through). */
export function getStandardAppointments(): StandardAppointment[] {
  const lang = useLanguageStore.getState().language
  if (lang === 'en') return STANDARD_APPOINTMENTS
  const hit = localizedCache.get(lang)
  if (hit) return hit
  const c = PREGNANCY_CONTENT[lang] ?? {}
  const pick = (key: string, en: string) => (c[key] && c[key].trim() ? c[key] : en)
  const out = STANDARD_APPOINTMENTS.map((a) => ({
    ...a,
    name: pick(`appt_${a.id}_name`, a.name),
    description: pick(`appt_${a.id}_description`, a.description),
    prepNote: pick(`appt_${a.id}_prepNote`, a.prepNote),
    whatToExpect: pick(`appt_${a.id}_whatToExpect`, a.whatToExpect),
    questions: a.questions.map((q, i) => pick(`appt_${a.id}_q${i}`, q)),
  }))
  localizedCache.set(lang, out)
  return out
}

/** The ACOG attribution line in the app language. */
export function appointmentsSourceNote(): string {
  const lang = useLanguageStore.getState().language
  if (lang === 'en') return APPOINTMENTS_SOURCE_NOTE
  const v = PREGNANCY_CONTENT[lang]?.appt_sourceNote
  return v && v.trim() ? v : APPOINTMENTS_SOURCE_NOTE
}

export function getPastAppointments(currentWeek: number): StandardAppointment[] {
  return getStandardAppointments().filter((a) => a.week < currentWeek)
}
