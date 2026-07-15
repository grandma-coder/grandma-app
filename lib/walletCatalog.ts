/**
 * walletCatalog — the shared catalog of ADDABLE wallet shortcut cards.
 *
 * These are navigation shortcuts a user can pin to any behavior's home wallet
 * (Talk with Grandma · Rewards · Exams · Channels · Village). They're already
 * reachable everywhere via the center "+" menu; the wallet version is a
 * convenience pin. Behavior-SPECIFIC cards (appointment, week_tip, kicks,
 * birth_guide, pillars, goals, health, diaper, growth_leap) are NOT here — they
 * stay in each behavior's own builder. This catalog is the single source shared
 * by the wallet builders and the WalletPicker (mirrors lib/pregnancyQuickLogs.ts).
 *
 * Pure data — no React — so the builders stay unit-testable.
 */
import type { TranslationKey } from './i18n'
import type { WalletTone } from './wallet'
import type { JourneyMode } from '../types'

/** Stable ids for the common shortcut cards. */
export type WalletShortcutId =
  | 'ask_grandma' | 'rewards' | 'exams' | 'channels' | 'village'

export interface WalletShortcutDef {
  key: WalletShortcutId
  /** i18n label shown on the card + in the picker. */
  labelKey: TranslationKey
  /** Wallet card tone (background accent). */
  tone: WalletTone
  /**
   * Route to push when tapped. A function so exams can carry the active
   * behavior as a query param (the exams screen locks to that behavior).
   */
  route: (mode: JourneyMode) => string
}

const behaviorParam = (mode: JourneyMode): string => mode // 'pre-pregnancy' | 'pregnancy' | 'kids'

export const WALLET_SHORTCUTS: WalletShortcutDef[] = [
  { key: 'ask_grandma', labelKey: 'wallet_askGrandma_title', tone: 'lilac',  route: () => '/grandma-talk' },
  { key: 'rewards',     labelKey: 'wallet_rewards_title',     tone: 'coral',  route: () => '/daily-rewards' },
  { key: 'exams',       labelKey: 'wallet_exams_title',       tone: 'lilac',  route: (m) => `/exams?behavior=${behaviorParam(m)}` },
  { key: 'channels',    labelKey: 'wallet_channels_title',    tone: 'peach',  route: () => '/connections?tab=channels' },
  { key: 'village',     labelKey: 'wallet_village_title',     tone: 'green',  route: () => '/connections' },
]

export function walletShortcutByKey(key: string): WalletShortcutDef | undefined {
  return WALLET_SHORTCUTS.find((s) => s.key === key)
}

/** All shortcuts are offered in every behavior (they're mode-agnostic destinations). */
export const DEFAULT_WALLET_SHORTCUT_KEYS: WalletShortcutId[] = ['ask_grandma', 'rewards', 'exams']
