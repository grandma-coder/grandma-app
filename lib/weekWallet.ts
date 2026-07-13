/**
 * weekWallet — pure builder for the pregnancy-home "Week Wallet" card stack.
 *
 * Turns the data PregnancyHome already computes (week, today's logs, upcoming
 * appointment, whether a week tip exists) into an ordered, conditional list of
 * card descriptors. Kept free of React so it can be unit-tested in isolation.
 */

import type { TodayLogEntry } from './analyticsData'
import type { StandardAppointment } from './pregnancyAppointments'
import type { WalletTone } from './wallet'

export type { WalletTone }

export type WalletCardId =
  | 'appointment' | 'week_tip' | 'kicks'
  | 'reminders' | 'birth_guide' | 'ask_grandma'

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

  const cards: WalletCardDescriptor[] = []

  if (upcomingAppointment) {
    cards.push({ id: 'appointment', tone: 'yellow', linkOnly: false, appointment: upcomingAppointment })
  }
  if (hasWeekTip) {
    cards.push({ id: 'week_tip', tone: 'lilac', linkOnly: false })
  }
  if (weekNumber >= KICK_COUNT_FROM_WEEK && !todayLogs['kick_count']) {
    cards.push({ id: 'kicks', tone: 'green', linkOnly: false })
  }

  cards.push({ id: 'reminders', tone: 'blue', linkOnly: false })
  cards.push({ id: 'birth_guide', tone: 'green', linkOnly: true })
  cards.push({ id: 'ask_grandma', tone: 'lavender', linkOnly: true })

  return cards
}
