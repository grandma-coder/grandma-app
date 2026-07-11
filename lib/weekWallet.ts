/**
 * weekWallet — pure builder for the pregnancy-home "Week Wallet" card stack.
 *
 * Turns the data PregnancyHome already computes (week, today's logs, upcoming
 * appointment, whether a week tip exists) into an ordered, conditional list of
 * card descriptors. Kept free of React so it can be unit-tested in isolation.
 */

import type { TodayLogEntry } from './analyticsData'
import type { StandardAppointment } from './pregnancyAppointments'

export type WalletCardId =
  | 'today' | 'appointment' | 'week_tip' | 'kicks'
  | 'weight' | 'birth_guide' | 'ask_grandma'

/** Sticker palette tone for the card cover. 'surface' = paper white. */
export type WalletTone = 'surface' | 'yellow' | 'lilac' | 'green' | 'peach' | 'lavender'

export interface WalletCardDescriptor {
  id: WalletCardId
  tone: WalletTone
  /** true → tapping the header routes / opens a modal (no inline body). */
  linkOnly: boolean
  /** present only on the 'appointment' card. */
  appointment?: StandardAppointment
}

interface BuildWalletCardsInput {
  weekNumber: number
  todayLogs: Record<string, TodayLogEntry>
  hasWeekTip: boolean
  upcomingAppointment: StandardAppointment | null
}

/** Kick counting is surfaced from week 28 (matches RemindersSection). */
const KICK_COUNT_FROM_WEEK = 28

export function buildWalletCards(input: BuildWalletCardsInput): WalletCardDescriptor[] {
  const { weekNumber, todayLogs, hasWeekTip, upcomingAppointment } = input

  const cards: WalletCardDescriptor[] = [
    { id: 'today', tone: 'surface', linkOnly: false },
  ]

  if (upcomingAppointment) {
    cards.push({ id: 'appointment', tone: 'yellow', linkOnly: false, appointment: upcomingAppointment })
  }
  if (hasWeekTip) {
    cards.push({ id: 'week_tip', tone: 'lilac', linkOnly: false })
  }
  if (weekNumber >= KICK_COUNT_FROM_WEEK && !todayLogs['kick_count']) {
    cards.push({ id: 'kicks', tone: 'green', linkOnly: false })
  }

  cards.push({ id: 'weight', tone: 'peach', linkOnly: false })
  cards.push({ id: 'birth_guide', tone: 'green', linkOnly: true })
  cards.push({ id: 'ask_grandma', tone: 'lavender', linkOnly: true })

  return cards
}
