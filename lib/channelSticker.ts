/**
 * Channel sticker picker — deterministic per channel id, or explicit user pick.
 * Maps a channel to a brand sticker + matching pastel fill/tint, so each channel
 * has a consistent visual identity in place of the generic `#`.
 *
 * Explicit picks are stored in `avatar_url` using the scheme `sticker://<name>/<color>`.
 */

import type { ComponentType } from 'react'
import { Star, Heart, Leaf, Moon, Drop } from '../components/ui/Stickers'
import { stickers as stickersLight, stickersDark } from '../constants/theme'
import type { CharacterName } from '../components/characters/Characters'

type StickerComponent = ComponentType<{ size?: number; fill?: string; stroke?: string }>

const STICKER_MAP: Record<string, StickerComponent> = {
  star: Star, heart: Heart, leaf: Leaf, moon: Moon, drop: Drop,
}
const STICKER_NAMES = ['star', 'heart', 'leaf', 'moon', 'drop'] as const
const COLOR_KEYS = ['yellow', 'pink', 'green', 'lilac', 'blue'] as const
type StickerName = typeof STICKER_NAMES[number]
type ColorKey = typeof COLOR_KEYS[number]

/** 5 curated preset combos — same order as hash fallback so picks feel native. */
export const STICKER_PRESETS: { name: StickerName; color: ColorKey }[] = [
  { name: 'star', color: 'yellow' },
  { name: 'heart', color: 'pink' },
  { name: 'leaf', color: 'green' },
  { name: 'moon', color: 'lilac' },
  { name: 'drop', color: 'blue' },
]

export const STICKER_URL_PREFIX = 'sticker://'

export function encodeStickerUrl(name: StickerName, color: ColorKey): string {
  return `${STICKER_URL_PREFIX}${name}/${color}`
}

export function parseStickerUrl(url: string | null | undefined): { name: StickerName; color: ColorKey } | null {
  if (!url || !url.startsWith(STICKER_URL_PREFIX)) return null
  const rest = url.slice(STICKER_URL_PREFIX.length)
  const [name, color] = rest.split('/')
  if (!STICKER_NAMES.includes(name as StickerName)) return null
  if (!COLOR_KEYS.includes(color as ColorKey)) return null
  return { name: name as StickerName, color: color as ColorKey }
}

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

export function stickerByNameColor(name: StickerName, color: ColorKey, isDark: boolean) {
  const palette = isDark ? stickersDark : stickersLight
  return {
    Component: STICKER_MAP[name],
    fill: palette[color],
    tint: palette[`${color}Soft` as keyof typeof palette],
  }
}

/** Resolve a channel's sticker. Prefers explicit avatar_url pick, else falls back to hash. */
export function channelSticker(id: string, isDark: boolean, avatarUrl?: string | null) {
  const picked = parseStickerUrl(avatarUrl)
  if (picked) return stickerByNameColor(picked.name, picked.color, isDark)

  const idx = hashString(id) % STICKER_NAMES.length
  return stickerByNameColor(STICKER_NAMES[idx], COLOR_KEYS[idx], isDark)
}

// ─── Channel → Character blob ────────────────────────────────────────────────
// Channels render a Character blob (the icon system) rather than the geometric
// sticker glyph. Keyed by the channel's `category` (stable, semantic) so each
// topic gets a meaningful blob; a few high-traffic names override the category
// for extra nuance. Falls back to `community`.
//
// Keys MUST stay in sync with the lowercased CATEGORIES list in
// app/channel/create.tsx — a new category with no entry here silently degrades
// to `community`. `health` is not a create.tsx category today but is kept for
// the seeded "Health & Vaccines" channel and future use.
const CATEGORY_BLOB: Record<string, CharacterName> = {
  parenting: 'baby',
  pregnancy: 'heartbeat',
  fertility: 'ovulation',
  feeding: 'feeding',
  sleep: 'sleep',
  community: 'community',
  wellness: 'selfcare',
  milestones: 'growth',
  other: 'community',
  health: 'health',
}
const NAME_BLOB: Record<string, CharacterName> = {
  'Trying to Conceive': 'ovulation',
  'Fertility & Nutrition': 'nutrition',
  'The Two-Week Wait': 'night',
  'First Trimester': 'heartbeat',
  'Second & Third Trimester': 'kick',
  'Birth & Labor': 'contraction',
  'Newborn Days': 'baby',
  'Baby Sleep': 'sleep',
  'Feeding & Weaning': 'feeding',
  'Milestones & Development': 'growth',
  'Health & Vaccines': 'vaccine',
  'Ask the Village': 'community',
}

/** A channel's Character blob concept — name override first, then category, then community. */
export function channelBlob(name: string, category?: string | null): CharacterName {
  return NAME_BLOB[name] ?? (category ? CATEGORY_BLOB[category] : undefined) ?? 'community'
}

// The create-channel avatar picker offers the 5 sticker presets as its slots
// (persisted as sticker://name/color so channelSticker's color logic is intact),
// but renders each slot as a Character blob concept to match the icon system.
const PRESET_BLOB: Record<StickerName, CharacterName> = {
  star: 'star',
  heart: 'heart',
  leaf: 'nutrition',
  moon: 'night',
  drop: 'water',
}

/** Character blob concept for a sticker preset index (create-channel picker). */
export function presetBlob(index: number): CharacterName {
  const preset = STICKER_PRESETS[index] ?? STICKER_PRESETS[0]
  return PRESET_BLOB[preset.name]
}
