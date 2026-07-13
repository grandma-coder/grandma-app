/**
 * cycleWallet — pure builder for the pre-pregnancy (cycle) home wallet stack.
 *
 * Mirrors lib/weekWallet.ts / lib/kidsWallet.ts. The cycle home shows the phase
 * ring (with the day/fertility number) up top, then a standalone "Log something"
 * quick-log card; everything below that collapses into this wallet: the daily
 * nudge, mood & symptoms, and the pillars grid. ('today' was lifted out into
 * the standalone customizable quick-log card, matching the pregnancy home.)
 */

import type { WalletTone } from './wallet'

export type CycleWalletCardId = 'nudge' | 'mood' | 'pillars'

export interface CycleWalletCardDescriptor {
  id: CycleWalletCardId
  tone: WalletTone
  linkOnly: boolean
}

export function buildCycleWalletCards(): CycleWalletCardDescriptor[] {
  return [
    { id: 'nudge', tone: 'mode', linkOnly: false },
    { id: 'mood', tone: 'pink', linkOnly: false },
    { id: 'pillars', tone: 'lilac', linkOnly: false },
  ]
}
