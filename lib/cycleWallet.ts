/**
 * cycleWallet — pure builder for the pre-pregnancy (cycle) home wallet stack.
 *
 * Mirrors lib/weekWallet.ts / lib/kidsWallet.ts. The cycle home shows the phase
 * ring up top, then the Daily Message card and a standalone "Log something"
 * quick-log card; the wallet below now holds only the pillars grid.
 *
 * Evolution: 'today' → standalone quick-log card; 'nudge' → Daily Message
 * module; 'mood' (mood & symptoms) removed entirely — mood + symptoms are
 * already tappable signals inside the Today-at-a-glance card, so a separate
 * wallet card was redundant.
 */

import type { WalletTone } from './wallet'

export type CycleWalletCardId = 'pillars'

export interface CycleWalletCardDescriptor {
  id: CycleWalletCardId
  tone: WalletTone
  linkOnly: boolean
}

export function buildCycleWalletCards(): CycleWalletCardDescriptor[] {
  return [
    { id: 'pillars', tone: 'lilac', linkOnly: false },
  ]
}
