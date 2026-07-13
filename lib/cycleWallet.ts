/**
 * cycleWallet — pure builder for the pre-pregnancy (cycle) home wallet stack.
 *
 * Mirrors lib/weekWallet.ts. Like the pregnancy Week Wallet, each card taps
 * straight to a pop-up sheet / route — nothing expands inline. Holds:
 *   • reminders — opens a sheet with the shared UserReminders (add + list)
 *   • pillars   — opens a sheet with the cycle pillar grid (each → /pillar/[id])
 *
 * Evolution: 'today' → standalone quick-log card; 'nudge' → Daily Message
 * module; 'mood' (mood & symptoms) → tappable signals in the Today card.
 */

import type { WalletTone } from './wallet'

export type CycleWalletCardId = 'reminders' | 'pillars' | 'exams'

export interface CycleWalletCardDescriptor {
  id: CycleWalletCardId
  tone: WalletTone
  linkOnly: boolean
}

export function buildCycleWalletCards(): CycleWalletCardDescriptor[] {
  return [
    { id: 'reminders', tone: 'yellow', linkOnly: true },
    { id: 'pillars', tone: 'lilac', linkOnly: true },
    { id: 'exams', tone: 'blue', linkOnly: true },
  ]
}
