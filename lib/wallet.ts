/**
 * Shared "wallet" primitives used by both the pregnancy Week Wallet and the
 * kids home wallet. The collapsible-card stack is one visual system across
 * modes; the per-mode card lists live in weekWallet.ts / kidsWallet.ts.
 */

/** Sticker palette tone for a wallet card cover. 'surface' = paper white.
 *  'mode' = the active journey mode's brand color (via getModeColor). */
export type WalletTone =
  | 'surface' | 'yellow' | 'lilac' | 'green' | 'peach' | 'lavender'
  | 'blue' | 'coral' | 'pink' | 'mode'
