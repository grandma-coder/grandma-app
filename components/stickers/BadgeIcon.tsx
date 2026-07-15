/**
 * BadgeIcon — resolves a badge ID to a design-system sticker.
 *
 * Replaces the emoji `icon` field on BadgeDef (emojis render inconsistently
 * across iOS/Android and break the sticker-collage look). Every badge gets
 * a paper-friendly SVG sticker from `components/ui/Stickers` or
 * `components/stickers/RewardStickers`.
 *
 * Fallback: unknown IDs render a Star sticker in the sticker-yellow color.
 */

import {
  Flame,
  QuestRibbon,
  DayBadge,
  TalkMaster,
  LogAppointment,
  LogNutrition,
  LogWater,
  FirstStep,
  MoodFace,
} from './RewardStickers'
import {
  Star,
  Heart,
  Moon,
  Sparkle,
  Smiley,
  Sleepy,
  Rainbow,
  Apple,
  Cross,
  Crown,
  Diamond,
  Burst,
  Drop,
} from '../ui/Stickers'
import { stickers } from '../../constants/theme'
import { Character, type CharacterName } from '../characters/Characters'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'

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

export function BadgeIcon({ badgeId, size = 32, color }: BadgeIconProps) {
  const diffuse = useIsDiffuse()
  if (diffuse) {
    const { name, hue } = badgeCharacter(badgeId)
    return <Character name={name} size={size} color={color ?? hue} />
  }
  switch (badgeId) {
    // ─── STREAK ────────────────────────────────────────────────────────────
    case 'streak_3':
    case 'streak_7':
    case 'streak_14':
    case 'streak_21':
      return <Flame size={size} fill={color ?? stickers.coral} />
    case 'streak_30':
      return <Crown size={size} fill={color ?? stickers.yellow} />
    case 'streak_60':
      return <Crown size={size} fill={color ?? stickers.peach} />
    case 'streak_100':
      return <Diamond size={size} fill={color ?? stickers.blue} />

    // ─── NUTRITION ─────────────────────────────────────────────────────────
    case 'nutrition_first':
      return <Apple size={size} fill={color ?? stickers.coral} />
    case 'nutrition_variety':
      return <Rainbow size={size} />
    case 'nutrition_master':
      return <Star size={size} fill={color ?? stickers.yellow} />
    case 'nutrition_100':
      return <LogNutrition size={size} fill={color ?? stickers.green} />

    // ─── SLEEP ─────────────────────────────────────────────────────────────
    case 'sleep_first':
      return <Moon size={size} fill={color ?? stickers.lilac} />
    case 'sleep_week':
      return <Sleepy size={size} fill={color ?? stickers.lilac} />
    case 'sleep_master':
      return <Sparkle size={size} fill={color ?? stickers.yellow} />

    // ─── MOOD ──────────────────────────────────────────────────────────────
    case 'mood_first':
      return <Smiley size={size} fill={color ?? stickers.yellow} />
    case 'mood_week':
      return <MoodFace size={size} variant="great" fill={color ?? stickers.pink} />
    case 'mood_happy':
      return <Star size={size} fill={color ?? stickers.pink} />

    // ─── HEALTH ────────────────────────────────────────────────────────────
    case 'health_vaccine':
    case 'health_all_vax':
      return <Cross size={size} fill={color ?? stickers.blue} />
    case 'health_checkup':
      return <LogAppointment size={size} fill={color ?? stickers.blue} />

    // ─── DIAPER (health category) ──────────────────────────────────────────
    case 'diaper_first':
      return <Drop size={size} fill={color ?? stickers.blue} />
    case 'diaper_week':
      return <LogWater size={size} fill={color ?? stickers.blue} />
    case 'diaper_100':
      return <Crown size={size} fill={color ?? stickers.peach} />

    // ─── GROWTH ────────────────────────────────────────────────────────────
    case 'growth_first':
      return <DayBadge size={size} fill={color ?? stickers.yellow} day={1} />
    case 'growth_tracker':
      return <Burst size={size} fill={color ?? stickers.yellow} points={10} />

    // ─── COMMUNITY ─────────────────────────────────────────────────────────
    case 'community_first':
      return <TalkMaster size={size} fill={color ?? stickers.lilac} />
    case 'community_helpful':
      return <Heart size={size} fill={color ?? stickers.pink} />
    case 'community_leader':
      return <Star size={size} fill={color ?? stickers.lilac} />

    // ─── MILESTONE ─────────────────────────────────────────────────────────
    case 'milestone_first_log':
      return <FirstStep size={size} fill={color ?? stickers.peach} />
    case 'milestone_first_photo':
      return <Sparkle size={size} fill={color ?? stickers.peach} />
    case 'milestone_100_logs':
      return <Burst size={size} fill={color ?? stickers.peach} points={10} />
    case 'milestone_500_logs':
      return <Crown size={size} fill={color ?? stickers.peach} />

    // ─── DAILY CHECK-IN ────────────────────────────────────────────────────
    case 'daily_checkin_7':
    case 'daily_checkin_30':
    case 'daily_checkin_100':
      return <QuestRibbon size={size} fill={color ?? stickers.yellow} />

    // ─── Fallback ──────────────────────────────────────────────────────────
    default:
      return <Star size={size} fill={color ?? stickers.yellow} />
  }
}
