/**
 * Display-time localisation for community content that lives in the database
 * in English: the official seeded channels + anonymous circles (system-owned,
 * matched by their exact seeded name), the "Anonymous <Animal>" circle handles,
 * the Village listing categories, and the compact chat timestamps.
 *
 * Matching stays on the raw DB value (suggestions, glyphs and filters keep
 * working on it); only what the user READS goes through t(). Anything we don't
 * recognise (user-created channels, custom categories) is shown as typed.
 */

import { parseLocalDate } from '../../lib/localDate'
import { t, type TranslationKey } from '../../lib/i18n'
import { dateLoc } from '../../lib/kpLocale'

// ─── Seeded channels (supabase/migrations/20260717200000_seed_topic_channels.sql)

const SEEDED_CHANNELS: Record<string, string> = {
  'Trying to Conceive': 'ttc',
  'Fertility & Nutrition': 'fertNutrition',
  'The Two-Week Wait': 'twoWeekWait',
  'First Trimester': 'firstTri',
  'Second & Third Trimester': 'laterTri',
  'Birth & Labor': 'birth',
  'Newborn Days': 'newborn',
  'Baby Sleep': 'babySleep',
  'Feeding & Weaning': 'feeding',
  'Milestones & Development': 'milestones',
  'Health & Vaccines': 'health',
  'Ask the Village': 'askVillage',
}

/** Channel name as the user should read it. */
export function channelDisplayName(name: string | null | undefined): string {
  if (!name) return ''
  const slug = SEEDED_CHANNELS[name]
  return slug ? t(`comm_ch_${slug}_name` as TranslationKey) : name
}

/** Channel description as the user should read it (seeded ones localised). */
export function channelDisplayDesc(name: string | null | undefined, desc: string | null | undefined): string | undefined {
  const slug = name ? SEEDED_CHANNELS[name] : undefined
  if (slug) return t(`comm_ch_${slug}_desc` as TranslationKey)
  return desc ?? undefined
}

// Channel `category` is stored lower-case English (channel/create lower-cases
// its CATEGORIES; seeds add "health"). Custom "Other" text is shown as typed.
const CHANNEL_CATEGORY_KEYS: Record<string, TranslationKey> = {
  parenting: 'channelCreate_category_parenting',
  pregnancy: 'channelCreate_category_pregnancy',
  fertility: 'channelCreate_category_fertility',
  feeding: 'channelCreate_category_feeding',
  sleep: 'channelCreate_category_sleep',
  community: 'channelCreate_category_community',
  wellness: 'channelCreate_category_wellness',
  milestones: 'channelCreate_category_milestones',
  other: 'channelCreate_category_other',
  health: 'comm_cat_health',
}

export function channelCategoryLabel(category: string | null | undefined): string {
  if (!category) return ''
  const key = CHANNEL_CATEGORY_KEYS[category.toLowerCase()]
  return key ? t(key) : category
}

// ─── Seeded circles (supabase/migrations/20260717240000_circles_foundation.sql)

const SEEDED_CIRCLES: Record<string, string> = {
  'The Trying Years': 'tryingYears',
  'Pregnancy Fears': 'pregFears',
  'Am I a Good Parent?': 'goodParent',
  'Postpartum & Me': 'postpartum',
  'Relationship Real Talk': 'relationship',
  'No Judgment Zone': 'noJudgment',
}

export function circleDisplayName(name: string | null | undefined): string {
  if (!name) return ''
  const slug = SEEDED_CIRCLES[name]
  return slug ? t(`comm_circle_${slug}_name` as TranslationKey) : name
}

export function circleDisplayDesc(name: string | null | undefined, desc: string | null | undefined): string | null {
  const slug = name ? SEEDED_CIRCLES[name] : undefined
  if (slug) return t(`comm_circle_${slug}_desc` as TranslationKey)
  return desc ?? null
}

// ─── Anonymous handles ("Anonymous Owl" — lib/circles HANDLE_ANIMALS) ───────
// Translated as a whole phrase per animal so gendered languages agree.

const HANDLE_ANIMALS = new Set([
  'Owl', 'Fox', 'Wren', 'Deer', 'Otter', 'Robin', 'Hare', 'Finch', 'Lark', 'Dove',
  'Heron', 'Sparrow', 'Bear', 'Swan', 'Moth', 'Bee', 'Fawn', 'Crane', 'Quail', 'Vole',
])

export function anonHandleLabel(handle: string | null | undefined): string {
  const m = /^Anonymous (\w+)$/.exec(handle ?? '')
  if (m && HANDLE_ANIMALS.has(m[1])) return t(`comm_handle_${m[1].toLowerCase()}` as TranslationKey)
  if (!handle || handle === 'Anonymous') return t('comm_handle_generic')
  return handle
}

// ─── Village (garage) listing categories ────────────────────────────────────
// Stored values are the English labels from app/garage/create.tsx CATEGORIES.

const VILLAGE_CATEGORY_KEYS: Record<string, TranslationKey> = {
  'For You': 'village_cat_forYou',
  Clothing: 'village_cat_clothing',
  Gear: 'village_cat_gear',
  Toys: 'village_cat_toys',
  Furniture: 'village_cat_furniture',
  Books: 'village_cat_books',
  Maternity: 'village_cat_maternity',
  Nursery: 'village_cat_nursery',
  Other: 'village_cat_other',
}

export function villageCategoryLabel(category: string | null | undefined): string {
  if (!category) return ''
  const key = VILLAGE_CATEGORY_KEYS[category]
  return key ? t(key) : category
}

// ─── Compact chat timestamp ─────────────────────────────────────────────────

export function chatTime(dateStr: string): string {
  const d = parseLocalDate(dateStr)
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000)
  if (diffMin < 1) return t('app_nlist_justNow')
  if (diffMin < 60) return t('app_nlist_minAgo', { n: diffMin })
  const diffHrs = Math.floor(diffMin / 60)
  if (diffHrs < 24) return t('app_nlist_hrAgo', { n: diffHrs })
  return d.toLocaleDateString(dateLoc(), { month: 'short', day: 'numeric' })
}
