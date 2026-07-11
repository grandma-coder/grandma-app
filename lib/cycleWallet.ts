/**
 * cycleWallet — pure builder for the pre-pregnancy (cycle) home wallet stack.
 *
 * Mirrors lib/weekWallet.ts / lib/kidsWallet.ts. The cycle home shows the phase
 * ring (with the day/fertility number) up top; everything below it collapses
 * into this wallet: the daily nudge, mood & symptoms, today's log summary, and
 * the pillars grid.
 */

import type { WalletTone } from './wallet'

export type CycleWalletCardId = 'nudge' | 'mood' | 'today' | 'pillars'

export interface CycleWalletCardDescriptor {
  id: CycleWalletCardId
  tone: WalletTone
  linkOnly: boolean
}

export function buildCycleWalletCards(): CycleWalletCardDescriptor[] {
  return [
    { id: 'nudge', tone: 'mode', linkOnly: false },
    { id: 'mood', tone: 'pink', linkOnly: false },
    { id: 'today', tone: 'surface', linkOnly: false },
    { id: 'pillars', tone: 'lilac', linkOnly: false },
  ]
}
