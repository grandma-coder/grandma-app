/**
 * BadgeIcon — resolves a badge ID to a design-system sticker.
 *
 * Replaces the emoji `icon` field on BadgeDef (emojis render inconsistently
 * across iOS/Android and break the sticker-collage look). The light (site) look
 * draws the hand-drawn SiteSticker set, the same family as the rest of the app;
 * Diffuse keeps its Character blobs.
 *
 * Fallback: unknown IDs render a Star sticker.
 */

import { stickers } from '../../constants/theme'
import { Character, type CharacterName } from '../characters/Characters'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { SiteSticker, type SiteStickerName } from './SiteSticker'

interface BadgeIconProps {
  badgeId: string
  size?: number
  color?: string // optional fill override
}

// Diffuse: badge ID → Character concept + hue. Achievements reuse existing
// concepts where they fit (streak/crown/gem/nutrition/sleep/mood/vaccine/…) and
// the new reward blobs (badge/trophy/reward) for the abstract milestone/daily
// ones. Prefix match keeps it resilient to new tiers (streak_45 → streak).
function badgeCharacter(badgeId: string): { name: CharacterName; hue: string } {
  const s = stickers
  const map: [RegExp, CharacterName, string][] = [
    [/^streak_(3|7|14|21)$/, 'streak', s.coral],
    [/^streak_(30|60)$/, 'crown', s.yellow],
    [/^streak_100$/, 'gem', s.blue],
    [/^streak_/, 'streak', s.coral],
    [/^nutrition_variety$/, 'sparkle', s.green],
    [/^nutrition_master$/, 'star', s.yellow],
    [/^nutrition_/, 'nutrition', s.green],
    [/^sleep_master$/, 'sparkle', s.yellow],
    [/^sleep_/, 'sleep', s.lilac],
    [/^mood_happy$/, 'heart', s.pink],
    [/^mood_/, 'mood', s.pink],
    [/^health_(vaccine|all_vax)$/, 'vaccine', s.blue],
    [/^health_/, 'checkup', s.blue],
    [/^diaper_/, 'diaper', s.blue],
    [/^growth_/, 'growth', s.yellow],
    [/^community_helpful$/, 'heart', s.pink],
    [/^community_/, 'community', s.lilac],
    [/^milestone_first_photo$/, 'photo', s.peach],
    [/^milestone_(100|500)_logs$/, 'trophy', s.yellow],
    [/^milestone_/, 'badge', s.peach],
    [/^daily_checkin_/, 'reward', s.yellow],
  ]
  for (const [re, name, hue] of map) if (re.test(badgeId)) return { name, hue }
  return { name: 'star', hue: s.yellow }
}

// Light (site) look: badge ID → SiteSticker, by meaning. Exact IDs first, then prefixes.
const BADGE_SITE: Record<string, SiteStickerName> = {
  streak_100: 'star',
  nutrition_first: 'avocado', nutrition_variety: 'lettuce', nutrition_master: 'banana', nutrition_100: 'corn',
  sleep_first: 'moon', sleep_week: 'moon2', sleep_master: 'moon',
  mood_first: 'face3', mood_week: 'face4', mood_happy: 'face4',
  health_vaccine: 'syringe', health_all_vax: 'syringe', health_checkup: 'stetho',
  growth_first: 'ruler', growth_tracker: 'ruler',
  community_first: 'bubble', community_helpful: 'love', community_leader: 'star',
  milestone_first_log: 'pencil', milestone_first_photo: 'camera',
  milestone_100_logs: 'notebook', milestone_500_logs: 'notebook',
}
const BADGE_SITE_PREFIX: [string, SiteStickerName][] = [
  ['streak_', 'cal'], ['nutrition_', 'avocado'], ['sleep_', 'moon'], ['mood_', 'face3'],
  ['health_', 'stetho'], ['diaper_', 'diaper'], ['growth_', 'ruler'], ['community_', 'bubble'],
  ['milestone_', 'notebook'], ['daily_checkin_', 'star'],
]

export function badgeSiteSticker(badgeId: string): SiteStickerName {
  return BADGE_SITE[badgeId] ?? BADGE_SITE_PREFIX.find(([p]) => badgeId.startsWith(p))?.[1] ?? 'star'
}

export function BadgeIcon({ badgeId, size = 32, color }: BadgeIconProps) {
  const diffuse = useIsDiffuse()
  if (diffuse) {
    const { name, hue } = badgeCharacter(badgeId)
    return <Character name={name} size={size} color={color ?? hue} />
  }
  return <SiteSticker name={badgeSiteSticker(badgeId)} size={size} />
}
