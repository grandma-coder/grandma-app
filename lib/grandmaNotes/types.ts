// lib/grandmaNotes/types.ts — shared shapes for the "note from grandma" builders.
//
// Builders are pure and rule-based (no AI, no network, no React Native). They
// take a `t` function so every sentence comes out of the i18n tables, and tests
// can pass a plain dictionary-backed translator.
import type { TranslationKeys } from '../i18n/keys'
import type { SiteStickerName } from '../../components/stickers/SiteSticker'

export type NoteKey = keyof TranslationKeys
export type NoteParams = Record<string, string | number>
export type Translate = (key: NoteKey, params?: NoteParams) => string

export interface GrandmaNoteItem {
  id: string
  sticker: SiteStickerName
  title: string
  body: string
  /** Detail area the row opens when tapped (page-specific key), if any. */
  area?: string
}

export interface GrandmaNoteSuggestion {
  text: string
  actionLabel?: string
  /** Site sticker for the action pill. */
  actionSticker?: SiteStickerName
  actionRoute?: string
  /** In-page detail area the action opens instead of a route. */
  actionArea?: string
}

export interface GrandmaLetter {
  intro: string
  notes: GrandmaNoteItem[]
  suggestion?: GrandmaNoteSuggestion
}

/** A note candidate before ranking — higher weight = more informative. */
export interface NoteCandidate extends GrandmaNoteItem {
  weight: number
}
