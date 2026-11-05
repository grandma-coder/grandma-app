import { dateLoc } from './kpLocale'

/** "HH:MM" → clock time in the app language ("7:00 AM" in en, "07:00" in pt-BR). */
export function clockLabel(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  if (isNaN(h)) return hhmm
  return new Date(2000, 0, 1, h, isNaN(m) ? 0 : m).toLocaleTimeString(dateLoc(), { hour: 'numeric', minute: '2-digit' })
}

/** Hour 0–23 → hour label in the app language ("7 AM" / "07"). */
export function hourLabel(h: number): string {
  return new Date(2000, 0, 1, h, 0).toLocaleTimeString(dateLoc(), { hour: 'numeric' })
}
