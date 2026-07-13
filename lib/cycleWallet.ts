/**
 * cycleWallet — pure builder for the pre-pregnancy (cycle) home wallet stack.
 *
 * Mirrors lib/weekWallet.ts / lib/kidsWallet.ts. The cycle home shows the phase
 * ring (with the day/fertility number) up top, then the Daily Message card and a
 * standalone "Log something" quick-log card; everything below that collapses
 * into this wallet: mood & symptoms, and the pillars grid.
 *
 * ('today' was lifted out into the standalone customizable quick-log card, and
 * the old phase-aware 'nudge' card was replaced by the Daily Message module —
 * the mode-agnostic daily-question → collectible-card flow ported from the
 * pregnancy home. Both live above the wallet now.)
 */

import type { WalletTone } from './wallet'

export type CycleWalletCardId = 'mood' | 'pillars'

export interface CycleWalletCardDescriptor {
  id: CycleWalletCardId
  tone: WalletTone
  linkOnly: boolean
}

export function buildCycleWalletCards(): CycleWalletCardDescriptor[] {
  return [
    { id: 'mood', tone: 'pink', linkOnly: false },
    { id: 'pillars', tone: 'lilac', linkOnly: false },
  ]
}
