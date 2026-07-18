/**
 * Circle topic → Character blob concept. Circles carry an emoji in the DB, but
 * the app renders a Character blob (the Diffuse icon system) instead of the raw
 * emoji — the emoji tofus on some devices and isn't part of the design language.
 * Matched by circle name; anything unmapped falls back to `community`.
 *
 * NOTE: keyed by the seeded (English, non-i18n'd) circle name — the DB stores one
 * canonical name per circle. If circles ever become renameable or their names get
 * localized, switch this to key off a stable circle id or a `topic` enum column,
 * or every circle silently collapses to the `community` fallback.
 */
import type { CharacterName } from '../components/characters/Characters'

const CIRCLE_BLOB: Record<string, CharacterName> = {
  'The Trying Years': 'night',
  'Pregnancy Fears': 'soothe',
  'Am I a Good Parent?': 'hug',
  'Postpartum & Me': 'selfcare',
  'Relationship Real Talk': 'heart',
  'No Judgment Zone': 'community',
}

export const circleBlob = (name: string): CharacterName => CIRCLE_BLOB[name] ?? 'community'
