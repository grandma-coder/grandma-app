/**
 * kidsWallet — pure builder for the kids-home wallet card stack.
 *
 * Mirrors lib/weekWallet.ts: turns the flags KidsHome already computes into an
 * ordered, conditional list of card descriptors. No React here so it can be
 * unit-tested in isolation.
 *
 * Card set (below the 2×2 stat tiles), in order:
 *   goals (always) · health (always) · exams (always) · diaper? ·
 *   growth_leap? · reminders (always) · ask_grandma (always) · rewards (always)
 */

import type { WalletTone } from './wallet'

export type KidsWalletCardId =
  | 'goals' | 'health' | 'exams' | 'diaper' | 'growth_leap'
  | 'reminders' | 'ask_grandma' | 'rewards'

export interface KidsWalletCardDescriptor {
  id: KidsWalletCardId
  tone: WalletTone
  /** true → tapping the header opens a modal / routes (no inline body). */
  linkOnly: boolean
}

interface BuildKidsWalletCardsInput {
  /** diaper summary has at least one entry in range */
  hasDiaper: boolean
  /** an active Wonder-Weeks growth leap exists for this child's age */
  hasGrowthLeap: boolean
}

export function buildKidsWalletCards(input: BuildKidsWalletCardsInput): KidsWalletCardDescriptor[] {
  const { hasDiaper, hasGrowthLeap } = input

  const cards: KidsWalletCardDescriptor[] = [
    { id: 'goals', tone: 'yellow', linkOnly: true },
    { id: 'health', tone: 'green', linkOnly: true },
    { id: 'exams', tone: 'lilac', linkOnly: true },
  ]

  if (hasDiaper) {
    cards.push({ id: 'diaper', tone: 'blue', linkOnly: true })
  }
  if (hasGrowthLeap) {
    cards.push({ id: 'growth_leap', tone: 'peach', linkOnly: false })
  }

  // Reminders expands to the add-reminder input inline (with a "view all"
  // link to the manage modal).
  cards.push({ id: 'reminders', tone: 'lilac', linkOnly: false })
  cards.push({ id: 'ask_grandma', tone: 'mode', linkOnly: true })
  cards.push({ id: 'rewards', tone: 'coral', linkOnly: true })

  return cards
}
