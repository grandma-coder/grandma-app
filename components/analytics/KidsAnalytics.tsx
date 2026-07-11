/**
 * Kids Analytics Screen — Premium wellness dashboard
 *
 * Improvements:
 *  1. Per-child only (no "All Kids" aggregation)
 *  2. Header with child name, age, and score-info (ℹ) button
 *  3. ScoreInfoModal: explains each pillar with age benchmarks
 *  4. GrandmaInsightCard: real data-driven message + full context to chat
 *  5. HealthTipsSection: age-aware, data-specific tips + TipDetailModal on tap
 *  6. PillarRow: trend arrows + score takeaway text
 *  7. Growth: shows single measurement card (not just line chart)
 *  8. DayDetailStrip: tap a day chip below any bar chart for per-day breakdown
 *  9. Ask Grandma passes full analytics context automatically
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
  withRepeat,
  Easing,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
  AppState,
  Modal,
} from 'react-native'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Svg, {
  Path,
  Circle,
  Rect,
  Line,
  G,
  Text as SvgText,
} from 'react-native-svg'
import {
  MessageCircle,
  ChevronRight,
  ChevronUp,
  Utensils,
  Moon,
  Smile,
  Heart,
  TrendingUp,
  Shield,
  Syringe,
  RefreshCw,
  FileQuestion,
  Sparkles,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  MinusCircle,
  SkipForward,
  Zap,
  X,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand, font, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../../constants/theme'
import { useIsDiffuse, SoftBloom } from '../ui/diffuse/DiffuseKit'
import {
  DiffuseBloomIcon,
  DiffuseSectionHeader,
  DiffuseSegmentPill,
  DiffuseMetricTile,
  DiffuseListRow,
  DiffuseSheet,
  DiffuseEmptyState,
  DiffuseCircularMetric,
} from '../ui/diffuse/DiffusePrimitives'
import { toDateStr } from '../../lib/cycleLogic'
import { useChildStore } from '../../store/useChildStore'
import { LineChart, BarChart, BubbleGrid, MoodBubbleCluster } from '../charts/SvgCharts'
import { FullScreenChart } from '../charts/FullScreenChart'
import {
  useKidsAnalytics,
  type AnalyticsData,
  type SleepData,
  type PillarScore,
  type WellnessScores,
  type RoutineComplianceData,
} from '../../lib/analyticsData'
import { supabase } from '../../lib/supabase'
import { runWellnessNotifications } from '../../lib/notificationEngine'
import { ChildPill, CHILD_COLORS, formatChildAge as sharedFormatChildAge } from '../ui/ChildPills'
import { AnalyticsTitle } from './shared/AnalyticsTitle'
import { MoodFace } from '../stickers/RewardStickers'
import { moodFaceVariant, moodFaceFill } from '../../lib/moodFace'
import { stickerForEmoji } from '../../lib/emojiToSticker'

function EmojiSticker({ size = 20, children, style }: { size?: number; children: string | undefined; style?: any }) {
  const S = stickerForEmoji(children ?? '')
  return <View style={style}><S size={size} /></View>
}
import { PeriodSelector, type Period } from './shared/PeriodSelector'
import { BigChartCard } from './shared/BigChartCard'
import { HealthScoreRing, type RingSegment } from './shared/HealthScoreRing'
import { CustomRangeModal } from './shared/CustomRangeModal'
import { KidsAnalyticsHero } from './KidsAnalyticsHero'
import { KidsPillarBands, type PillarBandItem } from './KidsPillarBands'
import {
  WaterDropIcon, SleepIcon, HandHeartIcon, StethoscopeIcon, WeightIcon, FootprintIcon,
} from '../stickers/LineIcons'
import {
  Heart as StickerHeart,
  Moon as StickerMoon,
  Drop as StickerDrop,
  Cross as StickerCross,
  Leaf as StickerLeaf,
  Burst as StickerBurst,
  Star as StickerStar,
  Flower as StickerFlower,
} from '../ui/Stickers'
import { BrandedLoader } from '../ui/BrandedLoader'
import { useTranslation } from '../../lib/i18n'

const SCREEN_W = Dimensions.get('window').width
const SCREEN_H = Dimensions.get('window').height

const AnimatedPath = Animated.createAnimatedComponent(Path)

// ─── Radar Chart — module-level geometry (SCREEN_W is constant) ────────────
const RADAR_SIZE  = SCREEN_W - 64
const RADAR_CX    = RADAR_SIZE / 2
const RADAR_CY    = RADAR_SIZE / 2
const RADAR_R     = RADAR_SIZE * 0.34   // max radius for score = 10
const RADAR_LABEL_R = RADAR_R + 24      // label distance from center
const GRID_LEVELS = [0.25, 0.5, 0.75, 1.0]

function hexPath(cx: number, cy: number, r: number): string {
  let d = ''
  for (let i = 0; i < 6; i++) {
    const a = (-90 + i * 60) * (Math.PI / 180)
    const x = cx + r * Math.cos(a)
    const y = cy + r * Math.sin(a)
    d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1)
  }
  return d + 'Z'
}

// Breathing wobble — per-axis phase offset for organic feel (worklet-safe)
function radarWobble(i: number, phase: number): number {
  'worklet'
  return 1 + 0.025 * Math.sin(phase + i * 1.05)
}

// ─── Pillar Config ─────────────────────────────────────────────────────────

// Pillar colors map to the cream-paper sticker palette (not the legacy neon).
// These are the vivid sticker chip tones; soft tints come from `pillarPalette()`.
const PILLAR_CONFIG = {
  nutrition: { label: 'Nutrition', color: '#7A9D4A', icon: Utensils },  // sticker green (deepened)
  sleep:     { label: 'Sleep',     color: '#8E72C9', icon: Moon },      // sticker lilac (deepened)
  mood:      { label: 'Mood',      color: '#D87CA0', icon: Smile },     // sticker pink (deepened)
  health:    { label: 'Health',    color: '#5F8FC1', icon: Heart },     // sticker blue (deepened)
  growth:    { label: 'Growth',    color: '#C9A02C', icon: TrendingUp }, // sticker yellow (deepened)
  activity:  { label: 'Activity',  color: '#D86A4F', icon: Zap },        // sticker coral (deepened)
} as const

type PillarKey = keyof typeof PILLAR_CONFIG
const PILLAR_ORDER: PillarKey[] = ['nutrition', 'sleep', 'mood', 'health', 'growth', 'activity']

// Single-stroke LineIcon per pillar for the editorial band rows (Diffuse).
const PILLAR_LINE_ICON: Record<PillarKey, (size: number, color: string) => React.ReactNode> = {
  nutrition: (s, c) => <WaterDropIcon size={s} color={c} />,
  sleep:     (s, c) => <SleepIcon size={s} color={c} />,
  mood:      (s, c) => <HandHeartIcon size={s} color={c} />,
  health:    (s, c) => <StethoscopeIcon size={s} color={c} />,
  growth:    (s, c) => <WeightIcon size={s} color={c} />,
  activity:  (s, c) => <FootprintIcon size={s} color={c} />,
}

// Maps each pillar to a sticker component and the paper-palette tint used for
// the 2026 redesign (soft pastel bg + vivid chip color).
type StickerVariant = 'leaf' | 'moon' | 'heart' | 'cross' | 'drop' | 'burst' | 'star' | 'flower'
function stickerForPillar(key: PillarKey): StickerVariant {
  switch (key) {
    case 'nutrition': return 'leaf'
    case 'sleep':     return 'moon'
    case 'mood':      return 'heart'
    case 'health':    return 'cross'
    case 'growth':    return 'star'
    case 'activity':  return 'burst'
  }
}

function renderPillarSticker(kind: StickerVariant, color: string, size = 24) {
  switch (kind) {
    case 'leaf':   return <StickerLeaf size={size} fill={color} />
    case 'moon':   return <StickerMoon size={size} fill={color} />
    case 'heart':  return <StickerHeart size={size} fill={color} />
    case 'cross':  return <StickerCross size={size} fill={color} />
    case 'drop':   return <StickerDrop size={size} fill={color} />
    case 'burst':  return <StickerBurst size={size} fill={color} points={8} />
    case 'star':   return <StickerStar size={size} fill={color} />
    case 'flower': return <StickerFlower size={size} petal={color} />
  }
}

interface PillarPalette { bar: string; tint: string; chip: string }
function pillarPalette(
  key: PillarKey,
  st: { green: string; greenSoft: string; lilac: string; lilacSoft: string; pink: string; pinkSoft: string; yellow: string; yellowSoft: string; blue: string; blueSoft: string; coral: string; peachSoft: string },
): PillarPalette {
  switch (key) {
    case 'nutrition': return { bar: st.green,  tint: st.greenSoft,  chip: st.green  }
    case 'sleep':     return { bar: st.lilac,  tint: st.lilacSoft,  chip: st.lilac  }
    case 'mood':      return { bar: st.pink,   tint: st.pinkSoft,   chip: st.pink   }
    case 'health':    return { bar: st.yellow, tint: st.yellowSoft, chip: st.yellow }
    case 'growth':    return { bar: st.blue,   tint: st.blueSoft,   chip: st.blue   }
    case 'activity':  return { bar: st.coral,  tint: st.peachSoft,  chip: st.coral  }
  }
}

function formatChildAge(bd: string): string {
  if (!bd) return ''
  return sharedFormatChildAge(bd)
}

const MOOD_COLORS: Record<string, string> = {
  happy: '#FBBF24', calm: '#6AABF7', energetic: '#6EC96E',
  fussy: '#FFB347', cranky: '#FF7070',
}
const MOOD_EMOJI: Record<string, string> = {
  happy: '😊', calm: '😌', energetic: '⚡', fussy: '😣', cranky: '😤',
}

// ─── Age Helpers ───────────────────────────────────────────────────────────

function getAgeMonths(birthDate: string): number {
  const bd = new Date(birthDate)
  const now = new Date()
  return Math.max(0, (now.getFullYear() - bd.getFullYear()) * 12 + (now.getMonth() - bd.getMonth()))
}

function getAgeLabel(ageMonths: number): string {
  if (ageMonths < 12) return `${ageMonths}mo`
  const y = Math.floor(ageMonths / 12)
  const m = ageMonths % 12
  return m > 0 ? `${y}y ${m}mo` : `${y}y`
}

function getAgeSleepTarget(ageMonths: number): number {
  if (ageMonths < 4) return 15
  if (ageMonths < 12) return 13
  if (ageMonths < 36) return 12
  return 10.5
}

// Module-level helpers can't access useTheme(); use the light sticker-palette
// hex VALUES directly (stickers.green/blue/peach/coral from constants/theme.ts).
function scoreColor(v: number): string {
  if (v >= 8.5) return '#BDD48C' // stickers.green
  if (v >= 7) return '#9DC3E8'   // stickers.blue
  if (v >= 5) return '#FBBF24'
  if (v >= 3) return '#F5B896'   // stickers.peach
  return '#EE7B6D'               // stickers.coral
}

function rankColor(i: number): string {
  if (i === 0) return '#FBBF24'  // gold
  if (i === 1) return '#9DC3E8'  // stickers.blue (silver-blue)
  if (i === 2) return '#BDD48C'  // stickers.green
  return '#FFFFFF66'             // muted white
}

// Downsample a daily series to ≤ maxBuckets by summing each bucket and
// taking the first label of the bucket (or first+last for wide spans).
// Keeps short series untouched so weekly views stay per-day.
function binSeries(data: number[], labels: string[], maxBuckets = 14): { data: number[]; labels: string[] } {
  const n = data.length
  if (n <= maxBuckets) return { data, labels }
  const stride = Math.ceil(n / maxBuckets)
  const buckets: number[] = []
  const bucketLabels: string[] = []
  for (let i = 0; i < n; i += stride) {
    let sum = 0
    for (let j = i; j < Math.min(i + stride, n); j++) sum += data[j]
    buckets.push(sum)
    bucketLabels.push(labels[i] ?? '')
  }
  return { data: buckets, labels: bucketLabels }
}

// ─── Tip Data Interface ────────────────────────────────────────────────────

interface TipData {
  title: string
  body: string
  detail: string
  color: string
  icon: any
  /** Which pillar this tip belongs to. Optional for backwards compatibility. */
  pillar?: PillarKey
}

// Tips in getHealthTips() are distinguished only by their lucide icon. Map back
// to a pillar so we can fold each tip into its matching thriving-breakdown row.
function tipPillarFromIcon(tip: TipData): PillarKey | undefined {
  if (tip.icon === Moon)       return 'sleep'
  if (tip.icon === Utensils)   return 'nutrition'
  if (tip.icon === Smile)      return 'mood'
  if (tip.icon === Heart)      return 'health'
  if (tip.icon === TrendingUp) return 'growth'
  if (tip.icon === Zap)        return 'activity'
  return undefined
}

function tipByPillar(tips: TipData[]): Partial<Record<PillarKey, TipData>> {
  const map: Partial<Record<PillarKey, TipData>> = {}
  for (const tip of tips) {
    const key = tip.pillar ?? tipPillarFromIcon(tip)
    if (key && !map[key]) map[key] = tip
  }
  return map
}

// ─── Health Tips (data-driven, age-aware) ─────────────────────────────────

function getHealthTips(
  scores: WellnessScores,
  analytics: AnalyticsData,
  ageMonths: number,
  childName: string,
): TipData[] {
  const tips: TipData[] = []

  // ── Sleep
  if (scores.sleep.hasData) {
    const target = getAgeSleepTarget(ageMonths)
    const avg = analytics.sleep.avgHours
    const totalQ = analytics.sleep.qualityCounts
    const goodPct = (() => {
      const total = totalQ.great + totalQ.good + totalQ.restless + totalQ.poor
      return total > 0 ? Math.round(((totalQ.great + totalQ.good) / total) * 100) : 0
    })()
    if (avg > 0 && avg < target * 0.85) {
      tips.push({
        title: 'Sleep Below Target',
        body: `${childName} avg ${avg.toFixed(1)}h/night — target is ${target}h for their age.`,
        detail: `At ${ageMonths} months, children need ~${target}h sleep/day. ${childName} is averaging ${avg.toFixed(1)}h. ${goodPct}% of sessions are good quality. Try an earlier bedtime, dim lights 30 min before sleep, and a consistent wind-down routine to reach the target.`,
        color: PILLAR_CONFIG.sleep.color,
        icon: Moon,
      })
    } else if (avg > 0) {
      tips.push({
        title: 'Sleep Goal Met ✓',
        body: `${childName} avg ${avg.toFixed(1)}h — on track! ${goodPct}% good-quality sessions.`,
        detail: `Great sleep pattern for ${ageMonths} months! ${avg.toFixed(1)}h average meets the ${target}h target. ${goodPct}% of sleep sessions are rated good or great. Quality sleep strengthens memory, immunity, and emotional regulation.`,
        color: PILLAR_CONFIG.sleep.color,
        icon: Moon,
      })
    }
  } else {
    tips.push({
      title: 'Start Logging Sleep',
      body: `Track sleep to see if ${childName} meets the ${getAgeSleepTarget(ageMonths)}h daily target.`,
      detail: `For ${ageMonths < 4 ? 'newborns' : ageMonths < 12 ? 'infants' : ageMonths < 36 ? 'toddlers' : 'children'} at ${ageMonths} months, the recommended sleep is ${getAgeSleepTarget(ageMonths)}h per day including naps. Log each sleep session in Calendar → Sleep.`,
      color: PILLAR_CONFIG.sleep.color,
      icon: Moon,
    })
  }

  // ── Nutrition
  if (scores.nutrition.hasData) {
    const totalMeals = analytics.nutrition.mealFrequency.reduce((a, b) => a + b, 0)
    const daysLogged = analytics.nutrition.mealFrequency.filter((m) => m > 0).length
    const avgMeals = daysLogged > 0 ? (totalMeals / daysLogged).toFixed(1) : '0'
    const goodTotal = analytics.nutrition.eatQuality.good.reduce((a, b) => a + b, 0)
    const goodPct = totalMeals > 0 ? Math.round((goodTotal / totalMeals) * 100) : 0
    if (scores.nutrition.value < 7) {
      tips.push({
        title: 'Improve Meal Quality',
        body: `${goodPct}% of meals eaten well, ${avgMeals} meals/day. Try 1-2 new foods this week.`,
        detail: `${childName} averages ${avgMeals} meals/day with ${goodPct}% rated "ate well." Introduce new foods alongside familiar ones — it typically takes 10-15 exposures before a child accepts something new. Consistent mealtimes and positive food environments help too.`,
        color: PILLAR_CONFIG.nutrition.color,
        icon: Utensils,
      })
    } else {
      tips.push({
        title: 'Great Nutrition Week!',
        body: `${goodPct}% meals eaten well, ${avgMeals}/day avg — excellent consistency!`,
        detail: `${childName} is eating well this week with ${goodPct}% of meals rated "ate well" across ${avgMeals} meals per day. Continue offering variety across all food groups. This consistency supports healthy growth and development.`,
        color: PILLAR_CONFIG.nutrition.color,
        icon: Utensils,
      })
    }
  }

  // ── Mood
  if (scores.mood.hasData) {
    const cranky = analytics.mood.dominantMoods.find((m) => m.mood === 'cranky')?.count ?? 0
    const fussy = analytics.mood.dominantMoods.find((m) => m.mood === 'fussy')?.count ?? 0
    const totalMoods = analytics.mood.dominantMoods.reduce((a, m) => a + m.count, 0)
    const negPct = totalMoods > 0 ? Math.round(((cranky + fussy) / totalMoods) * 100) : 0
    const topMood = analytics.mood.dominantMoods[0]?.mood ?? 'calm'
    if (negPct > 30) {
      tips.push({
        title: 'Mood Needs Attention',
        body: `${negPct}% cranky/fussy episodes this week. Check sleep & routine.`,
        detail: `Higher irritability at ${ageMonths} months can signal teething (common 6–24 months), growth spurts, disrupted sleep, or routine changes. Try extra comfort, check that sleep targets are being met, and monitor for other symptoms like drooling or temperature.`,
        color: PILLAR_CONFIG.mood.color,
        icon: Smile,
      })
    } else {
      tips.push({
        title: 'Positive Mood Week',
        body: `Dominant mood: ${topMood}. ${negPct}% negative episodes — great emotional health!`,
        detail: `${childName}'s emotional wellbeing looks great this week. The dominant mood is "${topMood}" with only ${negPct}% negative episodes. Consistent routines, responsive caregiving, and adequate sleep all contribute to positive mood patterns.`,
        color: PILLAR_CONFIG.mood.color,
        icon: Smile,
      })
    }
  }

  // ── Activity
  const activityTarget = ageMonths < 12 ? '20–30 min tummy time' : '60 min active play'
  tips.push({
    title: 'Daily Activity Goal',
    body: `Target: ${activityTarget} daily for ${getAgeLabel(ageMonths)}.`,
    detail: ageMonths < 12
      ? 'Tummy time builds neck, shoulder, and core strength essential for rolling, sitting, and crawling. Start with 2–3 min sessions and work up to 20–30 min spread across the day. Get on the floor with your baby to make it fun.'
      : 'Physical activity supports gross motor skills, better sleep, healthy weight, and improved mood. Outdoor play adds vitamin D, fresh air, and sensory stimulation. Even 3 × 20-minute sessions count toward the daily target.',
    color: PILLAR_CONFIG.activity.color,
    icon: TrendingUp,
  })

  // ── Growth tracking nudge
  if (!scores.growth.hasData) {
    tips.push({
      title: 'Log Growth Data',
      body: `Record ${childName}'s weight & height to track development.`,
      detail: 'Regular growth tracking helps detect early nutritional issues or developmental concerns. Log measurements after each pediatrician visit in Calendar → Growth. Weight, height, and head circumference data become more meaningful over time.',
      color: PILLAR_CONFIG.growth.color,
      icon: TrendingUp,
    })
  }

  // ── Diaper
  if (analytics.diaper.hasData) {
    const { totalCount, typeCounts } = analytics.diaper
    // Denominator was hardcoded to 7 even when the window was 30 days,
    // which made the "low diaper count" tip trigger constantly on long
    // ranges. Use the actual day count from dailyCounts.
    const windowDays = Math.max(1, analytics.diaper.dailyCounts.length)
    const avgPerDay = (totalCount / windowDays).toFixed(1)
    const poopPct = totalCount > 0 ? Math.round((typeCounts.poop + typeCounts.mixed) / totalCount * 100) : 0
    if (ageMonths < 6 && totalCount / windowDays < 6) {
      tips.push({
        title: 'Low Diaper Count',
        body: `${avgPerDay} diapers/day — newborns typically need 8-12. Check hydration.`,
        detail: `${childName} is averaging ${avgPerDay} diapers per day this week. Newborns under 6 months typically have 8-12 wet/dirty diapers daily. Fewer than 6 wet diapers may indicate insufficient feeding. Track diapers in Calendar → Diaper and consult your pediatrician if concerned.`,
        color: brand.secondary,
        icon: Heart,
      })
    } else if (analytics.diaper.colorCounts['green'] && analytics.diaper.colorCounts['green'] > 3) {
      tips.push({
        title: 'Green Stools Noticed',
        body: `${analytics.diaper.colorCounts['green']} green diapers this week — worth monitoring.`,
        detail: `Green stools can be normal (especially with dietary changes or iron supplements), but persistent green poop may indicate foremilk/hindmilk imbalance in breastfed babies, or food sensitivities. If accompanied by fussiness or other symptoms, consult your pediatrician.`,
        color: brand.secondary,
        icon: Heart,
      })
    }
  } else if (ageMonths < 24) {
    tips.push({
      title: 'Track Diapers',
      body: `Log ${childName}'s diaper changes to monitor hydration and digestion.`,
      detail: 'Diaper tracking helps you spot dehydration, dietary reactions, and digestive patterns. For newborns, adequate wet diapers (6+/day) confirm sufficient feeding. Log each change in Calendar → Diaper.',
      color: brand.secondary,
      icon: Heart,
    })
  }

  return tips.slice(0, 4)
}

// ─── Grandma Context Builder ───────────────────────────────────────────────

function buildGrandmaContext(
  scores: WellnessScores,
  analytics: AnalyticsData,
  childName: string,
  ageMonths: number,
): string {
  const lines: string[] = [
    `Analytics for ${childName} (${getAgeLabel(ageMonths)}) — this week:`,
    `Overall thriving score: ${scores.overall.toFixed(1)}/10`,
  ]

  if (scores.sleep.hasData) {
    const target = getAgeSleepTarget(ageMonths)
    lines.push(`Sleep: ${scores.sleep.value.toFixed(1)}/10 — avg ${analytics.sleep.avgHours.toFixed(1)}h/night (target ${target}h)`)
  }
  if (scores.nutrition.hasData) {
    const totalMeals = analytics.nutrition.mealFrequency.reduce((a, b) => a + b, 0)
    const good = analytics.nutrition.eatQuality.good.reduce((a, b) => a + b, 0)
    const pct = totalMeals > 0 ? Math.round((good / totalMeals) * 100) : 0
    lines.push(`Nutrition: ${scores.nutrition.value.toFixed(1)}/10 — ${pct}% meals eaten well`)
  }
  if (scores.mood.hasData) {
    const top = analytics.mood.dominantMoods[0]
    lines.push(`Mood: ${scores.mood.value.toFixed(1)}/10 — dominant: ${top?.mood ?? 'no data'}`)
  }
  if (scores.health.hasData) {
    lines.push(`Health: ${scores.health.value.toFixed(1)}/10`)
  }
  if (scores.growth.hasData) {
    const w = analytics.growth.weights.at(-1)
    const h = analytics.growth.heights.at(-1)
    if (w) lines.push(`Latest weight: ${w.value}kg`)
    if (h) lines.push(`Latest height: ${h.value}cm`)
  }
  if (analytics.diaper.hasData) {
    const { totalCount, typeCounts } = analytics.diaper
    const windowDays = Math.max(1, analytics.diaper.dailyCounts.length)
    const windowLabel = windowDays === 7 ? 'this week' : `last ${windowDays} days`
    lines.push(`Diapers: ${totalCount} ${windowLabel} (${typeCounts.pee} pee, ${typeCounts.poop} poop, ${typeCounts.mixed} mixed) — avg ${(totalCount / windowDays).toFixed(1)}/day`)
  }

  const lowest = PILLAR_ORDER.reduce<PillarKey | null>((min, key) => {
    if (!scores[key].hasData) return min
    if (!min || scores[key].value < scores[min].value) return key
    return min
  }, null)
  if (lowest && scores[lowest].value < 7) {
    lines.push(`Main concern: ${PILLAR_CONFIG[lowest].label} at ${scores[lowest].value.toFixed(1)}/10`)
  }

  return lines.join('\n')
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function KidsAnalytics() {
  const { t } = useTranslation()
  const { colors, radius, stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const insets = useSafeAreaInsets()
  const children = useChildStore((s) => s.children)
  const setActiveChild = useChildStore((s) => s.setActiveChild)

  const [selectedChildId, setSelectedChildId] = useState<string>(() => children[0]?.id ?? '')
  const [selectedPillar, setSelectedPillar] = useState<PillarKey | null>(null)
  const [fullScreen, setFullScreen] = useState<string | null>(null)
  const [showScoreInfo, setShowScoreInfo] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [period, setPeriod] = useState<Period>('week')
  const [customRange, setCustomRange] = useState<{ from: string; to: string } | null>(null)
  const [showCustomModal, setShowCustomModal] = useState(false)

  // Map the selected period to an analytics window.
  // Memoize against the actual inputs so the reference is stable between
  // renders (otherwise downstream comparisons of object identity, including
  // React Query's internal effect-deps, see a fresh object every render).
  const analyticsRange = useMemo(() => {
    if (period === 'custom' && customRange) {
      return { kind: 'custom' as const, from: customRange.from, to: customRange.to }
    }
    const days = period === 'week' ? 7 : period === 'month' ? 30 : period === '3mo' ? 90 : period === 'year' ? 365 : 7
    return { kind: 'last' as const, days }
  }, [period, customRange?.from, customRange?.to])

  const customLabel = customRange
    ? (() => {
        const f = new Date(customRange.from)
        const t = new Date(customRange.to)
        const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
        return `${f.toLocaleDateString('en-US', opts)} – ${t.toLocaleDateString('en-US', opts)}`
      })()
    : undefined

  function handlePeriodChange(next: Period) {
    if (next === 'custom') {
      setShowCustomModal(true)
      return
    }
    setPeriod(next)
  }

  function handleCustomApply(from: string, to: string) {
    // Guard against inverted ranges. Without this, `to < from` silently
    // produced an empty result set in analyticsData (the .gte/.lte pair
    // matches nothing) and the user saw a blank dashboard with no hint
    // that they typed the dates in the wrong order.
    if (from && to && from > to) {
      const swapped = { from: to, to: from }
      setCustomRange(swapped)
    } else {
      setCustomRange({ from, to })
    }
    setPeriod('custom')
    setShowCustomModal(false)
  }

  // Default to first child when children load
  useEffect(() => {
    if (!selectedChildId && children.length > 0) {
      setSelectedChildId(children[0].id)
      setActiveChild(children[0])
    }
  }, [children, selectedChildId, setActiveChild])

  const { data: analytics, isLoading, error, refetch } = useKidsAnalytics(
    selectedChildId,
    analyticsRange,
  )

  const selectedChild = children.find((c) => c.id === selectedChildId) ?? children[0] ?? null
  const ageMonths = selectedChild?.birthDate ? getAgeMonths(selectedChild.birthDate) : 12
  const childName = selectedChild?.name ?? 'your child'
  const chartW = SCREEN_W - 72

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  // Realtime updates
  useEffect(() => {
    if (!selectedChildId) return
    const channel = supabase
      .channel('analytics-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'child_logs' }, (payload: any) => {
        if (payload.new?.child_id === selectedChildId || payload.old?.child_id === selectedChildId) {
          refetch()
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedChildId, refetch])

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') refetch() })
    return () => sub.remove()
  }, [refetch])

  // Wellness notifications
  useEffect(() => {
    if (!analytics?.scores || !selectedChild) return
    runWellnessNotifications(analytics.scores, selectedChild.id, selectedChild.name).catch(() => {})
  }, [analytics?.scores, selectedChild])

  // ── Diffuse period options for the hairline segment pill ──
  const diffusePeriodOptions: { key: Period; label: string }[] = [
    { key: 'week', label: '7 Days' },
    { key: 'month', label: '30 Days' },
    { key: '3mo', label: '3 Mo' },
    { key: 'year', label: '1 Yr' },
    { key: 'custom', label: customLabel ? customLabel : 'Custom' },
  ]

  return (
    <View style={[styles.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={diffuse ? getDiffuseAccent('kids', dt.isDark) : colors.primary} colors={[diffuse ? getDiffuseAccent('kids', dt.isDark) : colors.primary]} />}
      >
        {/* ── HEADER (2026 redesign) ── */}
        {diffuse ? (
          <View style={{ marginBottom: 4 }}>
            <DiffuseSectionHeader
              eyebrow={getAgeLabel(ageMonths)}
              title={`${childName}'s patterns`}
              right={(
                <Pressable
                  onPress={() => setShowScoreInfo(true)}
                  hitSlop={10}
                  style={({ pressed }) => [
                    styles.infoBtnNew,
                    { backgroundColor: 'transparent', borderColor: dt.colors.hairline },
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <Info size={16} color={dt.colors.ink3} strokeWidth={1.6} />
                </Pressable>
              )}
            />
          </View>
        ) : (
          <View style={styles.headerEditorial}>
            <View style={{ flex: 1 }}>
              <AnalyticsTitle
                primary={`${childName}'s patterns`}
                italic="so far."
              />
              <Text
                style={[
                  styles.headerSub,
                  { color: colors.textSecondary, fontFamily: font.body },
                ]}
              >
                {getAgeLabel(ageMonths)}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => setShowScoreInfo(true)}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.infoBtnNew,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Info size={16} color={colors.text} strokeWidth={2} />
              </Pressable>
            </View>
          </View>
        )}

        {diffuse ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
            <DiffuseSegmentPill
              options={diffusePeriodOptions}
              value={period}
              onChange={handlePeriodChange}
            />
          </ScrollView>
        ) : (
          <PeriodSelector
            value={period}
            onChange={handlePeriodChange}
            customLabel={customLabel}
          />
        )}

        {/* ── 1. CHILD SELECTOR ── */}
        {diffuse ? (
          children.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
              {children.map((c, idx) => {
                const on = selectedChildId === c.id
                const kidColor = CHILD_COLORS[idx % CHILD_COLORS.length]
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => { setSelectedChildId(c.id); setActiveChild(c) }}
                    style={({ pressed }) => [
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: on ? dt.colors.hairline : dt.colors.line,
                        backgroundColor: on ? dt.colors.surface : 'transparent',
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: kidColor }} />
                    <Text style={{ fontFamily: on ? diffuseFont.bodySemiBold : diffuseFont.body, fontSize: 13, color: on ? dt.colors.ink : dt.colors.ink3 }}>
                      {c.name}
                    </Text>
                  </Pressable>
                )
              })}
            </ScrollView>
          ) : null
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.childRow}>
            {children.map((c, idx) => (
              <ChildChip
                key={c.id}
                label={c.name}
                age={formatChildAge(c.birthDate)}
                active={selectedChildId === c.id}
                color={CHILD_COLORS[idx % CHILD_COLORS.length]}
                onPress={() => { setSelectedChildId(c.id); setActiveChild(c) }}
              />
            ))}
          </ScrollView>
        )}

        {isLoading && (
          <View style={styles.loadingWrap}>
            <BrandedLoader logoSize={72} motion="blinkOnly" label={t('kids_analytics_loading')} />
          </View>
        )}

        {error && !isLoading && (
          <Pressable onPress={() => refetch()} style={[styles.errorCard, { backgroundColor: diffuse ? 'transparent' : brand.error + '15', borderRadius: radius.xl, borderWidth: diffuse ? 1 : 0, borderColor: diffuse ? dt.colors.line : 'transparent' }]}>
            <Text style={[styles.errorText, { color: diffuse ? dt.colors.error : brand.error, fontFamily: diffuse ? diffuseFont.body : font.bodySemiBold }]}>{t('kids_analytics_error_load')}</Text>
            <View style={styles.row}>
              <RefreshCw size={14} color={diffuse ? dt.colors.error : brand.error} strokeWidth={diffuse ? 1.6 : 2} />
              <Text style={[styles.errorRetry, { color: diffuse ? dt.colors.error : brand.error, fontFamily: diffuse ? diffuseFont.mono : font.bodyMedium }]}>{t('kids_analytics_tap_retry')}</Text>
            </View>
          </Pressable>
        )}

        {analytics && (() => {
          const tips = getHealthTips(analytics.scores, analytics, ageMonths, childName)
          const tipMap = tipByPillar(tips)

          if (diffuse) {
            // ── Editorial dashboard (Diffuse): hero stat → Grandma one-liner →
            //    pillar bands sorted worst-first → compact Grandma card → routines.
            const s = analytics.scores
            const hasAnyData = PILLAR_ORDER.some((k) => s[k].hasData)
            const overall = Number.isFinite(s.overall) ? s.overall : 0
            const band = overall >= 8.5 ? t('kids_analytics_caption_thriving')
              : overall >= 7 ? t('kids_analytics_caption_on_track')
              : overall >= 5 ? t('kids_analytics_caption_developing')
              : t('kids_analytics_caption_needs_care')
            const highlights = buildInsightHighlights(s, analytics, childName, ageMonths)
            const softFor: Record<PillarKey, string> = {
              nutrition: stickers.greenSoft, sleep: stickers.lilacSoft, mood: stickers.pinkSoft,
              health: stickers.blueSoft, growth: stickers.yellowSoft, activity: stickers.peachSoft,
            }
            const bandItems: PillarBandItem[] = PILLAR_ORDER.map((key) => ({
              key,
              label: PILLAR_CONFIG[key].label,
              color: PILLAR_CONFIG[key].color,
              softColor: softFor[key],
              score: s[key],
              takeaway: tipMap[key]?.body,
              icon: PILLAR_LINE_ICON[key],
            }))
            return (
              <View style={{ gap: 4 }}>
                <KidsAnalyticsHero
                  overall={overall}
                  hasData={hasAnyData}
                  caption={`${t('kids_analytics_thriving_breakdown')} · ${band}`.toUpperCase()}
                  childName={childName}
                  band={band}
                />
                {highlights.message ? (
                  <Text style={{ fontFamily: diffuseFont.body, fontSize: 14, lineHeight: 20, color: dt.colors.ink2, borderLeftWidth: 2, borderLeftColor: dt.colors.line2, paddingLeft: 12, marginTop: 10, marginBottom: 18 }}>
                    {highlights.message}
                  </Text>
                ) : <View style={{ height: 14 }} />}
                <KidsPillarBands items={bandItems} onPillarPress={(key) => setSelectedPillar(key as PillarKey)} />
                <View style={{ marginTop: 14 }}>
                  <GrandmaInsightCard
                    scores={s}
                    analytics={analytics}
                    childName={childName}
                    ageMonths={ageMonths}
                    compact
                  />
                </View>
                <View style={{ marginTop: 14 }}>
                  <RoutineComplianceSection data={analytics.routineCompliance} />
                </View>
              </View>
            )
          }

          // ── Current system (unchanged): ring → grandma → tip rows → routines.
          return (
            <>
              <KidsWellnessRingCard scores={analytics.scores} onPillarPress={setSelectedPillar} />
              <GrandmaInsightCard scores={analytics.scores} analytics={analytics} childName={childName} ageMonths={ageMonths} />
              <View style={styles.pillarSection}>
                <Text style={[styles.pillarSectionTitle, { color: colors.text, fontFamily: font.display }]}>
                  {t('kids_analytics_thriving_breakdown')}
                </Text>
                {PILLAR_ORDER.map((key) => (
                  <PillarRow key={key} pillarKey={key} score={analytics.scores[key]} tip={tipMap[key]} onPress={() => setSelectedPillar(key)} />
                ))}
                <RoutineComplianceSection data={analytics.routineCompliance} />
              </View>
            </>
          )
        })()}

        {analytics && analytics.totalLogs === 0 && !isLoading && (
          diffuse ? (
            <DiffuseEmptyState
              icon={<DiffuseBloomIcon color={getDiffuseAccent('kids', dt.isDark)} size={48} intensity={0.5}><FileQuestion size={24} color={dt.colors.ink3} strokeWidth={1.4} /></DiffuseBloomIcon>}
              title={t('kids_analytics_no_data_title')}
              message={t('kids_analytics_no_data_hint')}
            />
          ) : (
            <View style={[styles.emptyAll, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
              <FileQuestion size={32} color={colors.textMuted} />
              <Text style={[styles.emptyAllTitle, { color: colors.text }]}>{t('kids_analytics_no_data_title')}</Text>
              <Text style={[styles.emptyAllSub, { color: colors.textMuted }]}>
                {t('kids_analytics_no_data_hint')}
              </Text>
            </View>
          )
        )}
      </ScrollView>

      {/* ── Full-screen chart modals ── */}
      {analytics && (
        <>
          <FullScreenChart visible={fullScreen === 'eat_quality'} title={t('kids_analytics_chart_eat_quality')} onClose={() => setFullScreen(null)}>
            <StackedBarChart good={analytics.nutrition.eatQuality.good} little={analytics.nutrition.eatQuality.little} none={analytics.nutrition.eatQuality.none} labels={analytics.nutrition.weekLabels} width={SCREEN_W - 48} height={220} />
          </FullScreenChart>
          <FullScreenChart visible={fullScreen === 'meal_freq'} title={t('kids_analytics_chart_meals_per_day')} onClose={() => setFullScreen(null)}>
            <BarChart data={analytics.nutrition.mealFrequency} labels={analytics.nutrition.weekLabels} color={PILLAR_CONFIG.nutrition.color} width={SCREEN_W - 48} height={220} />
          </FullScreenChart>
          <FullScreenChart visible={fullScreen === 'top_foods'} title={t('kids_analytics_chart_top_foods')} onClose={() => setFullScreen(null)}>
            <BubbleGrid items={analytics.nutrition.topFoods.map((f, i) => ({
              label: f.label, value: f.count,
              color: [PILLAR_CONFIG.nutrition.color, PILLAR_CONFIG.health.color, PILLAR_CONFIG.mood.color, PILLAR_CONFIG.sleep.color, PILLAR_CONFIG.growth.color, PILLAR_CONFIG.activity.color][i % 6],
            }))} />
          </FullScreenChart>
          <FullScreenChart visible={fullScreen === 'sleep_weekly'} title={t('kids_analytics_chart_sleep_daily')} onClose={() => setFullScreen(null)}>
            <BarChart data={analytics.sleep.dailyHours} labels={analytics.sleep.weekLabels} color={PILLAR_CONFIG.sleep.color} width={SCREEN_W - 48} height={220} />
          </FullScreenChart>
          <FullScreenChart visible={fullScreen === 'sleep_quality'} title={t('kids_analytics_chart_sleep_quality')} onClose={() => setFullScreen(null)}>
            <SleepQualityChart counts={analytics.sleep.qualityCounts} />
          </FullScreenChart>
          <FullScreenChart visible={fullScreen === 'mood_dist'} title={t('kids_analytics_chart_mood_dist')} onClose={() => setFullScreen(null)}>
            <MoodDistribution moods={analytics.mood.dominantMoods} />
          </FullScreenChart>
          <FullScreenChart visible={fullScreen === 'mood_daily'} title={t('kids_analytics_chart_mood_daily')} onClose={() => setFullScreen(null)}>
            <MoodDailyChart dailyCounts={analytics.mood.dailyCounts} labels={analytics.mood.weekLabels} width={SCREEN_W - 48} />
          </FullScreenChart>
          <FullScreenChart visible={fullScreen === 'health_freq'} title={t('kids_analytics_chart_health_events')} onClose={() => setFullScreen(null)}>
            <BarChart data={analytics.health.weeklyFrequency} labels={analytics.health.weekLabels} color={PILLAR_CONFIG.health.color} width={SCREEN_W - 48} height={220} />
          </FullScreenChart>
          {analytics.growth.weights.length >= 2 && (
            <FullScreenChart visible={fullScreen === 'weight'} title={t('kids_analytics_chart_weight')} onClose={() => setFullScreen(null)}>
              <LineChart data={analytics.growth.weights.map((w) => w.value)} labels={analytics.growth.weights.map((w) => { const d = new Date(w.date); return `${d.getMonth() + 1}/${d.getDate()}` })} color={PILLAR_CONFIG.health.color} width={SCREEN_W - 48} height={220} unit="kg" showAverage />
            </FullScreenChart>
          )}
          {analytics.growth.heights.length >= 2 && (
            <FullScreenChart visible={fullScreen === 'height'} title={t('kids_analytics_chart_height')} onClose={() => setFullScreen(null)}>
              <LineChart data={analytics.growth.heights.map((h) => h.value)} labels={analytics.growth.heights.map((h) => { const d = new Date(h.date); return `${d.getMonth() + 1}/${d.getDate()}` })} color={PILLAR_CONFIG.growth.color} width={SCREEN_W - 48} height={220} unit="cm" showAverage />
            </FullScreenChart>
          )}
        </>
      )}

      {/* ── Pillar Detail Modal ── */}
      {analytics && (
        <PillarDetailModal
          visible={selectedPillar !== null}
          pillarKey={selectedPillar}
          analytics={analytics}
          chartW={chartW}
          childName={childName}
          ageMonths={ageMonths}
          onClose={() => setSelectedPillar(null)}
          onFullScreen={setFullScreen}
        />
      )}

      {/* ── Score Info Modal ── */}
      <ScoreInfoModal
        visible={showScoreInfo}
        scores={analytics?.scores ?? null}
        ageMonths={ageMonths}
        childName={childName}
        onClose={() => setShowScoreInfo(false)}
      />

      {/* ── Custom Range Modal ── */}
      <CustomRangeModal
        visible={showCustomModal}
        initialFrom={customRange?.from}
        initialTo={customRange?.to}
        onClose={() => setShowCustomModal(false)}
        onApply={handleCustomApply}
      />

    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCORE INFO MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function ScoreInfoModal({
  visible, scores, ageMonths, childName, onClose,
}: {
  visible: boolean
  scores: WellnessScores | null
  ageMonths: number
  childName: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { colors, radius, stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const insets = useSafeAreaInsets()

  // Band colors mirror scoreColor() — sticker-palette hex values.
  const SCORE_BANDS = [
    { range: '8.5 – 10', label: 'Excellent', color: stickers.green },
    { range: '7.0 – 8.4', label: 'Good',      color: stickers.blue },
    { range: '5.0 – 6.9', label: 'Fair',      color: '#FBBF24' },
    { range: '3.0 – 4.9', label: 'Needs Attention', color: stickers.peach },
    { range: '0 – 2.9',   label: 'Low',       color: stickers.coral },
  ]

  const PILLAR_EXPLAIN: Record<PillarKey, string> = {
    nutrition: `Tracks meal frequency and quality (ate well / a little / didn't eat). ${ageMonths < 6 ? 'For infants under 6 months breast/bottle feeds count.' : ageMonths < 12 ? 'Mixed stage — milk + early solids both tracked.' : 'Variety, frequency, and eating quality all factor in.'}`,
    sleep: `Sleep duration and quality (great/good/restless/poor). Target for ${getAgeLabel(ageMonths)}: ${getAgeSleepTarget(ageMonths)}h/day. Consistency across the week adds a bonus.`,
    mood: `Weighted from logged moods: happy/calm/energetic raise the score; fussy/cranky lower it. The more days logged, the more accurate the score.`,
    health: `Combines vaccine completion and health event frequency. More vaccines done + fewer incidents (temperature, medicine) = higher score.`,
    growth: `Reflects how regularly weight and height are measured. Frequent tracking earns a higher score. Recent measurements get a recency bonus.`,
    activity: `Scored by active days per week (how many days had at least one logged session) plus a variety bonus for mixing different types. 7 active days = perfect score.`,
  }

  const WEIGHTS: Record<PillarKey, string> = {
    nutrition: '27%', sleep: '22%', mood: '18%', health: '13%', growth: '9%', activity: '11%',
  }

  if (diffuse) {
    return (
      <DiffuseSheet visible={visible} title={t('kids_analytics_score_guide_title')} onClose={onClose}>
        {scores && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, borderTopWidth: 1, borderTopColor: dt.colors.line, paddingVertical: 16 }}>
            <Text style={{ fontFamily: diffuseFont.displayLight, fontSize: 44, color: dt.colors.ink, letterSpacing: -1 }}>{scores.overall.toFixed(1)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: diffuseFont.body, fontSize: 15, color: dt.colors.ink }}>{t('kids_analytics_score_child_label', { childName })}</Text>
              <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: dt.colors.ink3, marginTop: 3 }}>{t('kids_analytics_score_weighted_avg')}</Text>
            </View>
          </View>
        )}

        <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: dt.colors.ink3, marginTop: 8, marginBottom: 6 }}>{t('kids_analytics_score_scale_label')}</Text>
        {SCORE_BANDS.map((b) => (
          <DiffuseListRow key={b.label} title={b.label} dotColor={b.color} value={b.range} valueColor={dt.colors.ink3} />
        ))}

        <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: dt.colors.ink3, marginTop: 18, marginBottom: 6 }}>{t('kids_analytics_pillar_scoring_label')}</Text>
        {PILLAR_ORDER.map((key) => {
          const config = PILLAR_CONFIG[key]
          const Icon = config.icon
          const score = scores?.[key]
          return (
            <View key={key} style={{ borderTopWidth: 1, borderTopColor: dt.colors.line, paddingVertical: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <DiffuseBloomIcon color={config.color} size={26} intensity={0.4}><Icon size={15} color={dt.colors.ink3} strokeWidth={1.5} /></DiffuseBloomIcon>
                <Text style={{ flex: 1, fontFamily: diffuseFont.display, fontSize: 17, color: dt.colors.ink }}>{config.label}</Text>
                <Text style={{ fontFamily: diffuseFont.mono, fontSize: 11, letterSpacing: 1, color: dt.colors.ink3 }}>{WEIGHTS[key]}</Text>
                {score?.hasData && (
                  <Text style={{ fontFamily: diffuseFont.monoBold, fontSize: 12, color: dt.colors.ink }}>{score.value.toFixed(1)}</Text>
                )}
              </View>
              <Text style={{ fontFamily: diffuseFont.body, fontSize: 13, lineHeight: 19, color: dt.colors.ink2 }}>{PILLAR_EXPLAIN[key]}</Text>
            </View>
          )
        })}

        <View style={{ borderTopWidth: 1, borderTopColor: dt.colors.line, paddingTop: 16, marginTop: 4 }}>
          <Text style={{ fontFamily: diffuseFont.display, fontSize: 18, color: dt.colors.ink, marginBottom: 6 }}>{childName}{' at '}{getAgeLabel(ageMonths)}</Text>
          <Text style={{ fontFamily: diffuseFont.body, fontSize: 13, lineHeight: 20, color: dt.colors.ink2 }}>
            {'Sleep target: ' + getAgeSleepTarget(ageMonths) + 'h/day\n' +
              (ageMonths < 6 ? 'Nutrition: breast/formula only (8–12 feeds/day)' :
                ageMonths < 12 ? 'Nutrition: introducing solids alongside milk' :
                  ageMonths < 24 ? 'Nutrition: 3 meals + snacks, ~1000 cal/day' :
                    'Nutrition: 3 meals + 2 snacks/day')}
          </Text>
        </View>
      </DiffuseSheet>
    )
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderRadius: radius.xl, paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('kids_analytics_score_guide_title')}</Text>
            <Pressable onPress={onClose} hitSlop={8} style={[styles.modalClose, { backgroundColor: colors.surfaceRaised }]}>
              <X size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: SCREEN_H * 0.62 }}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          >
            {scores && (
              <View style={[styles.scoreHighlight, { backgroundColor: colors.primaryTint, borderRadius: radius.xl, borderColor: colors.primary + '30' }]}>
                <Text style={[styles.scoreHighlightNum, { color: scoreColor(scores.overall) }]}>
                  {scores.overall.toFixed(1)}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.scoreHighlightLabel, { color: colors.text }]}>{t('kids_analytics_score_child_label', { childName })}</Text>
                  <Text style={[styles.scoreHighlightSub, { color: colors.textSecondary }]}>{t('kids_analytics_score_weighted_avg')}</Text>
                </View>
              </View>
            )}

            <Text style={[styles.infoSectionLabel, { color: colors.textSecondary }]}>{t('kids_analytics_score_scale_label')}</Text>
            <View style={{ gap: 8, marginBottom: 20 }}>
              {SCORE_BANDS.map((b) => (
                <View key={b.label} style={styles.bandRow}>
                  <View style={[styles.bandDot, { backgroundColor: b.color }]} />
                  <Text style={[styles.bandLabel, { color: colors.text }]}>{b.label}</Text>
                  <Text style={[styles.bandRange, { color: colors.textMuted }]}>{b.range}</Text>
                </View>
              ))}
            </View>

            <Text style={[styles.infoSectionLabel, { color: colors.textSecondary }]}>{t('kids_analytics_pillar_scoring_label')}</Text>
            <View style={{ gap: 10, marginBottom: 20 }}>
              {PILLAR_ORDER.map((key) => {
                const config = PILLAR_CONFIG[key]
                const Icon = config.icon
                const score = scores?.[key]
                return (
                  <View key={key} style={[styles.pillarInfoCard, { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg }]}>
                    <View style={styles.pillarInfoHeader}>
                      <View style={[styles.pillarInfoIcon, { backgroundColor: config.color + '15' }]}>
                        <Icon size={16} color={config.color} strokeWidth={2} />
                      </View>
                      <Text style={[styles.pillarInfoName, { color: colors.text }]}>{config.label}</Text>
                      <Text style={[styles.pillarInfoWeight, { color: colors.textMuted }]}>{WEIGHTS[key]}</Text>
                      {score?.hasData && (
                        <View style={[styles.pillarInfoScoreBadge, { backgroundColor: config.color + '20' }]}>
                          <Text style={[styles.pillarInfoScoreText, { color: config.color }]}>{score.value.toFixed(1)}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.pillarInfoBody, { color: colors.textSecondary }]}>{PILLAR_EXPLAIN[key]}</Text>
                  </View>
                )
              })}
            </View>

            <View style={[styles.ageBanner, { backgroundColor: brand.kids + '10', borderRadius: radius.xl, borderColor: brand.kids + '30' }]}>
              <Text style={[styles.ageBannerTitle, { color: brand.kids }]}>
                {childName}{' at '}{getAgeLabel(ageMonths)}
              </Text>
              <Text style={[styles.ageBannerBody, { color: colors.textSecondary }]}>
                {'Sleep target: ' + getAgeSleepTarget(ageMonths) + 'h/day\n' +
                  (ageMonths < 6 ? 'Nutrition: breast/formula only (8–12 feeds/day)' :
                    ageMonths < 12 ? 'Nutrition: introducing solids alongside milk' :
                      ageMonths < 24 ? 'Nutrition: 3 meals + snacks, ~1000 cal/day' :
                        'Nutrition: 3 meals + 2 snacks/day')}
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIP DETAIL MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function TipDetailModal({
  tip, childName, analytics, scores, ageMonths, onClose,
}: {
  tip: TipData
  childName: string
  analytics: AnalyticsData | null
  scores: WellnessScores | null
  ageMonths: number
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { colors, radius } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const insets = useSafeAreaInsets()
  const Icon = tip.icon

  function handleAskGrandma() {
    const ctx = scores && analytics
      ? buildGrandmaContext(scores, analytics, childName, ageMonths) + `\n\nI have a specific question about: ${tip.title} — ${tip.body}`
      : `${tip.title}: ${tip.body}`
    onClose()
    // Stash the (potentially large) context in AsyncStorage rather than the
    // router params — Android URL params silently truncate around 2KB and
    // grandma-talk-side consumers can pull it from the key when they're
    // wired up. Use a tiny marker param so consumers know to look.
    AsyncStorage.setItem('grandma-insight-context', ctx).catch(() => {})
    setTimeout(() => router.push({ pathname: '/grandma-talk', params: { hasInsightContext: '1' } } as any), 150)
  }

  if (diffuse) {
    const accent = getDiffuseAccent('kids', dt.isDark)
    return (
      <DiffuseSheet visible title={tip.title} onClose={onClose} scroll={false}>
        <View style={{ alignItems: 'center', paddingBottom: 12 }}>
          <DiffuseBloomIcon color={tip.color} size={48} intensity={0.5}><Icon size={24} color={dt.colors.ink3} strokeWidth={1.4} /></DiffuseBloomIcon>
        </View>
        <Text style={{ fontFamily: diffuseFont.display, fontSize: 18, lineHeight: 24, color: dt.colors.ink, marginBottom: 12 }}>{tip.body}</Text>
        <Text style={{ fontFamily: diffuseFont.body, fontSize: 14, lineHeight: 21, color: dt.colors.ink2, marginBottom: 20 }}>{tip.detail}</Text>
        <Pressable
          onPress={handleAskGrandma}
          style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: dt.colors.line2, paddingTop: 16, opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={{ fontFamily: diffuseFont.monoBold, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: dt.colors.ink }}>{t('kids_analytics_ask_grandma_tip')}</Text>
          <Text style={{ fontFamily: diffuseFont.body, fontSize: 18, color: dt.colors.ink3 }}>→</Text>
        </Pressable>
      </DiffuseSheet>
    )
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[styles.tipModalContent, { backgroundColor: colors.surface, borderRadius: radius.xl, paddingBottom: insets.bottom + 20 }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.tipModalHeaderRow}>
            <View style={[styles.tipModalIconWrap, { backgroundColor: tip.color + '20' }]}>
              <Icon size={22} color={tip.color} strokeWidth={2} />
            </View>
            <Pressable onPress={onClose} hitSlop={8} style={[styles.modalClose, { backgroundColor: colors.surfaceRaised }]}>
              <X size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          <Text style={[styles.tipModalTitle, { color: colors.text }]}>{tip.title}</Text>
          <View style={[styles.tipModalSummary, { backgroundColor: tip.color + '12', borderRadius: radius.lg }]}>
            <Text style={[styles.tipModalSummaryText, { color: tip.color }]}>{tip.body}</Text>
          </View>
          <Text style={[styles.tipModalDetail, { color: colors.textSecondary }]}>{tip.detail}</Text>

          <Pressable
            onPress={handleAskGrandma}
            style={({ pressed }) => [
              styles.tipAskBtn,
              { backgroundColor: colors.primaryTint, borderRadius: radius.full, borderColor: colors.primary + '30' },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Sparkles size={16} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.tipAskBtnText, { color: colors.primary }]}>{t('kids_analytics_ask_grandma_tip')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// WELLNESS RING (2026 redesign) — paper card with 6-arc HealthScoreRing + mini stats
// ═══════════════════════════════════════════════════════════════════════════════

function KidsWellnessRingCard({
  scores,
  onPillarPress,
}: {
  scores: WellnessScores
  onPillarPress: (key: PillarKey) => void
}) {
  const { t } = useTranslation()
  const { stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()

  // Map pillars → ring segments (clockwise from top). The `id` routes taps
  // back to the matching pillar detail modal via onPillarPress.
  const segments: RingSegment[] = [
    { sticker: 'leaf',   color: stickers.green,  id: 'nutrition' },
    { sticker: 'cross',  color: stickers.yellow, id: 'health'    },
    { sticker: 'heart',  color: stickers.pink,   id: 'mood'      },
    { sticker: 'burst',  color: stickers.coral,  id: 'activity'  },
    { sticker: 'moon',   color: stickers.lilac,  id: 'sleep'     },
    { sticker: 'drop',   color: stickers.blue,   id: 'growth'    },
  ]

  const hasAnyData = PILLAR_ORDER.some((k) => scores[k].hasData)
  const rawOverall = hasAnyData ? scores.overall : 0
  const overall = Number.isFinite(rawOverall) ? rawOverall : 0
  const caption = overall >= 8.5 ? t('kids_analytics_caption_thriving') : overall >= 7 ? t('kids_analytics_caption_on_track') : overall >= 5 ? t('kids_analytics_caption_developing') : t('kids_analytics_caption_needs_care')

  if (diffuse) {
    // No wheel, no pillar list — a big reference-style overall number + caption
    // heads the screen; the pillar collage below carries the per-pillar read.
    return (
      <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 4 }}>
        <Text style={{ fontFamily: diffuseFont.displayLight, fontSize: 96, lineHeight: 100, color: dt.colors.ink, letterSpacing: -3 }}>
          {hasAnyData ? overall.toFixed(1) : '—'}
        </Text>
        <Text style={{ fontFamily: diffuseFont.mono, fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase', color: dt.colors.ink3, marginTop: 6 }}>
          {caption.toUpperCase()}
        </Text>
      </View>
    )
  }

  return (
    <View style={{ gap: 12 }}>
      <BigChartCard
        label={t('kids_analytics_child_wellness_label')}
        blobColor={stickers.pinkSoft}
        labelAlign="center"
      >
        <HealthScoreRing
          score={Number(overall.toFixed(1))}
          caption={caption}
          segments={segments}
          size={220}
          onSegmentPress={(id) => onPillarPress(id as PillarKey)}
        />
      </BigChartCard>
    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// WELLNESS RADAR CHART
// ═══════════════════════════════════════════════════════════════════════════════

function WellnessScoreArc({
  scores,
  onInfoPress,
  childId,
}: {
  scores: WellnessScores
  onInfoPress: () => void
  childId: string
}) {
  const { t } = useTranslation()
  const { colors, radius } = useTheme()
  const [activePillar, setActivePillar] = useState<PillarKey | null>(null)

  // Six shared values — one per axis (React hooks rules: no hooks in loops)
  const p0 = useSharedValue(0); const p1 = useSharedValue(0)
  const p2 = useSharedValue(0); const p3 = useSharedValue(0)
  const p4 = useSharedValue(0); const p5 = useSharedValue(0)
  const scoreOpacity = useSharedValue(0)
  // Continuous breathing — phase drives a sine wave per axis
  const breathe = useSharedValue(0)

  // Animated data polygon path
  const dataPathProps = useAnimatedProps(() => {
    'worklet'
    const vals = [p0.value, p1.value, p2.value, p3.value, p4.value, p5.value]
    const ph = breathe.value
    let d = ''
    for (let i = 0; i < 6; i++) {
      const a = (-90 + i * 60) * (Math.PI / 180)
      const r = vals[i] * RADAR_R * radarWobble(i, ph)
      const x = RADAR_CX + r * Math.cos(a)
      const y = RADAR_CY + r * Math.sin(a)
      d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1)
    }
    return { d: d + 'Z' }
  })

  // Animated icon positions — explicit per-axis (hooks rules)
  const ICON_HALF = 16  // half the icon container size
  const is0 = useAnimatedStyle(() => { const a = -90*(Math.PI/180); const r = p0.value*RADAR_R*radarWobble(0,breathe.value); return { left: RADAR_CX+r*Math.cos(a)-ICON_HALF, top: RADAR_CY+r*Math.sin(a)-ICON_HALF } })
  const is1 = useAnimatedStyle(() => { const a = -30*(Math.PI/180); const r = p1.value*RADAR_R*radarWobble(1,breathe.value); return { left: RADAR_CX+r*Math.cos(a)-ICON_HALF, top: RADAR_CY+r*Math.sin(a)-ICON_HALF } })
  const is2 = useAnimatedStyle(() => { const a =  30*(Math.PI/180); const r = p2.value*RADAR_R*radarWobble(2,breathe.value); return { left: RADAR_CX+r*Math.cos(a)-ICON_HALF, top: RADAR_CY+r*Math.sin(a)-ICON_HALF } })
  const is3 = useAnimatedStyle(() => { const a =  90*(Math.PI/180); const r = p3.value*RADAR_R*radarWobble(3,breathe.value); return { left: RADAR_CX+r*Math.cos(a)-ICON_HALF, top: RADAR_CY+r*Math.sin(a)-ICON_HALF } })
  const is4 = useAnimatedStyle(() => { const a = 150*(Math.PI/180); const r = p4.value*RADAR_R*radarWobble(4,breathe.value); return { left: RADAR_CX+r*Math.cos(a)-ICON_HALF, top: RADAR_CY+r*Math.sin(a)-ICON_HALF } })
  const is5 = useAnimatedStyle(() => { const a = 210*(Math.PI/180); const r = p5.value*RADAR_R*radarWobble(5,breathe.value); return { left: RADAR_CX+r*Math.cos(a)-ICON_HALF, top: RADAR_CY+r*Math.sin(a)-ICON_HALF } })
  const iconStyles = [is0, is1, is2, is3, is4, is5]

  const scoreAnimStyle = useAnimatedStyle(() => ({
    opacity: scoreOpacity.value,
    transform: [{ scale: 0.85 + 0.15 * scoreOpacity.value }],
  }))

  // Track whether we've animated in yet — only the FIRST mount resets to 0
  // and runs the staggered intro. Subsequent updates (child swap, score
  // change) spring smoothly from the current values to the new targets so
  // the polygon doesn't collapse to center on every refresh.
  const hasAnimatedInRef = useRef(false)
  useEffect(() => {
    const spring = { damping: 14, stiffness: 90, mass: 0.8 }
    // No-data axes get a small minimum so the polygon doesn't collapse to center
    const targets = PILLAR_ORDER.map((key) => scores[key].hasData ? scores[key].value / 10 : 0.08)

    if (!hasAnimatedInRef.current) {
      // First mount — full staggered intro from 0
      p0.value = 0; p1.value = 0; p2.value = 0
      p3.value = 0; p4.value = 0; p5.value = 0
      scoreOpacity.value = 0
      p0.value = withDelay(0,   withSpring(targets[0], spring))
      p1.value = withDelay(100, withSpring(targets[1], spring))
      p2.value = withDelay(200, withSpring(targets[2], spring))
      p3.value = withDelay(300, withSpring(targets[3], spring))
      p4.value = withDelay(400, withSpring(targets[4], spring))
      p5.value = withDelay(500, withSpring(targets[5], spring))
      scoreOpacity.value = withDelay(600, withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) }))
      // Start continuous breathing after entrance
      breathe.value = 0
      breathe.value = withDelay(1000, withRepeat(
        withTiming(2 * Math.PI, { duration: 4000, easing: Easing.linear }),
        -1, false
      ))
      hasAnimatedInRef.current = true
    } else {
      // Subsequent updates — spring directly from current to new without
      // resetting to 0 (which caused the polygon to snap to center).
      p0.value = withSpring(targets[0], spring)
      p1.value = withSpring(targets[1], spring)
      p2.value = withSpring(targets[2], spring)
      p3.value = withSpring(targets[3], spring)
      p4.value = withSpring(targets[4], spring)
      p5.value = withSpring(targets[5], spring)
    }
  }, [childId, scores.overall])

  const hasAnyData = PILLAR_ORDER.some((k) => scores[k].hasData)
  const overall    = hasAnyData ? scores.overall : 0
  const overallC   = hasAnyData ? scoreColor(overall) : colors.textMuted

  // Label positions (computed once per render)
  const labelPositions = PILLAR_ORDER.map((_, i) => {
    const a = (-90 + i * 60) * (Math.PI / 180)
    return { x: RADAR_CX + RADAR_LABEL_R * Math.cos(a), y: RADAR_CY + RADAR_LABEL_R * Math.sin(a) }
  })

  function getPillarExplanation(key: PillarKey): string {
    const score = scores[key]
    const pct   = score.hasData ? Math.round((score.value / 10) * 100) : 0
    const explanations: Record<PillarKey, string> = {
      nutrition: `${pct}% — tracks meal frequency, eating quality, and food variety this week`,
      sleep:     `${pct}% — measures avg sleep hours vs age target, quality, and consistency`,
      mood:      `${pct}% — based on daily mood logs (happy, calm, energetic, fussy, cranky)`,
      health:    `${pct}% — reflects vaccine completion and health event frequency`,
      growth:    `${pct}% — tracks weight & height measurement regularity`,
      activity:  `${pct}% — based on active days this week and variety of activities logged`,
    }
    return score.hasData
      ? explanations[key]
      : t('kids_analytics_pillar_no_data_hint')
  }

  return (
    <View style={styles.arcContainer}>
      <View style={{ width: RADAR_SIZE, height: RADAR_SIZE }}>
        <Svg width={RADAR_SIZE} height={RADAR_SIZE}>
          {/* Grid hexagons */}
          {GRID_LEVELS.map((level) => (
            <Path
              key={level}
              d={hexPath(RADAR_CX, RADAR_CY, RADAR_R * level)}
              fill="none"
              stroke={colors.border}
              strokeWidth={1}
              opacity={level === 1 ? 0.3 : 0.12}
            />
          ))}
          {/* Axis lines */}
          {PILLAR_ORDER.map((key, i) => {
            const a = (-90 + i * 60) * (Math.PI / 180)
            return (
              <Line
                key={key}
                x1={RADAR_CX} y1={RADAR_CY}
                x2={RADAR_CX + RADAR_R * Math.cos(a)}
                y2={RADAR_CY + RADAR_R * Math.sin(a)}
                stroke={colors.border}
                strokeWidth={1}
                opacity={0.1}
              />
            )
          })}
          {/* Data polygon — filled + stroked */}
          <AnimatedPath
            animatedProps={dataPathProps}
            fill="#7048B830"
            stroke="#A07FDC"
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
        </Svg>

        {/* Pillar icons at each vertex */}
        {PILLAR_ORDER.map((key, i) => {
          const Icon = PILLAR_CONFIG[key].icon
          const color = PILLAR_CONFIG[key].color
          const hasData = scores[key].hasData
          return (
            <Animated.View
              key={key}
              style={[{
                position: 'absolute',
                width: ICON_HALF * 2,
                height: ICON_HALF * 2,
                borderRadius: ICON_HALF,
                backgroundColor: color + '40',
                borderWidth: 1.5,
                borderColor: color + '80',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: !hasData ? 0.3 : activePillar !== null && activePillar !== key ? 0.35 : 1,
              }, iconStyles[i]]}
            >
              <Icon size={16} color={color} strokeWidth={2.5} />
            </Animated.View>
          )
        })}

        {/* Axis labels — positioned absolutely */}
        {PILLAR_ORDER.map((key, i) => {
          const pos    = labelPositions[i]
          const score  = scores[key]
          const isActive = activePillar === key
          const isTop  = i === 0
          const isBot  = i === 3
          const isLeft = i === 4 || i === 5
          return (
            <Pressable
              key={key}
              onPress={() => setActivePillar(activePillar === key ? null : key)}
              hitSlop={8}
              style={{
                position: 'absolute',
                left: pos.x - 50,
                top:  pos.y - (isTop ? 24 : isBot ? -6 : 10),
                width: 100,
                alignItems: isTop || isBot ? 'center' : isLeft ? 'flex-end' : 'flex-start',
              }}
            >
              <Text style={{
                fontSize: 13,
                fontWeight: isActive ? '900' : '800',
                color: PILLAR_CONFIG[key].color,
                opacity: activePillar !== null && !isActive ? 0.4 : 1,
              }}>
                {PILLAR_CONFIG[key].label}{' '}
                {score.hasData ? score.value.toFixed(0) : '—'}
              </Text>
            </Pressable>
          )
        })}

        {/* Center score overlay */}
        <Animated.View
          style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }, scoreAnimStyle]}
          pointerEvents="none"
        >
          {activePillar ? (
            <>
              <Text style={{ fontSize: 34, fontWeight: '900', color: PILLAR_CONFIG[activePillar].color, lineHeight: 38, fontFamily: font.display }}>
                {scores[activePillar].hasData ? scores[activePillar].value.toFixed(1) : '—'}
              </Text>
              <Text style={{ fontSize: 10, fontWeight: '700', fontFamily: font.bodySemiBold, color: PILLAR_CONFIG[activePillar].color + 'AA', marginTop: 2, letterSpacing: 0.5 }}>
                {PILLAR_CONFIG[activePillar].label.toLowerCase()}
              </Text>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 34, fontWeight: '900', color: overallC, lineHeight: 38, fontFamily: font.display }}>
                {hasAnyData ? overall.toFixed(1) : '—'}
              </Text>
              <Text style={{ fontSize: 10, fontWeight: '600', fontFamily: font.bodySemiBold, color: colors.textSecondary, marginTop: 2 }}>
                {t('kids_analytics_caption_thriving')}
              </Text>
            </>
          )}
        </Animated.View>
      </View>

      {/* Tooltip when a pillar is selected */}
      {activePillar && (
        <Pressable
          onPress={() => setActivePillar(null)}
          style={[
            styles.arcTooltip,
            {
              backgroundColor: PILLAR_CONFIG[activePillar].color + '15',
              borderColor:     PILLAR_CONFIG[activePillar].color + '40',
              borderRadius: radius.xl,
            },
          ]}
        >
          <View style={styles.arcTooltipHeader}>
            <View style={[styles.arcTooltipIcon, { backgroundColor: PILLAR_CONFIG[activePillar].color + '25' }]}>
              {(() => {
                const Icon = PILLAR_CONFIG[activePillar].icon
                return <Icon size={16} color={PILLAR_CONFIG[activePillar].color} strokeWidth={2} />
              })()}
            </View>
            <Text style={[styles.arcTooltipTitle, { color: PILLAR_CONFIG[activePillar].color }]}>
              {PILLAR_CONFIG[activePillar].label}
              {' — '}
              {scores[activePillar].hasData
                ? `${scores[activePillar].value.toFixed(1)}/10`
                : t('kids_analytics_no_data_short')}
            </Text>
          </View>
          <Text style={[styles.arcTooltipBody, { color: colors.textSecondary }]}>
            {getPillarExplanation(activePillar)}
          </Text>
        </Pressable>
      )}

      <Pressable onPress={onInfoPress} style={styles.arcInfoHint} hitSlop={12}>
        <Info size={12} color={colors.textMuted} strokeWidth={2} />
        <Text style={[styles.arcInfoText, { color: colors.textMuted }]}>
          {t('kids_analytics_tap_info_hint')}
        </Text>
      </Pressable>
    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRANDMA AI INSIGHT CARD
// ═══════════════════════════════════════════════════════════════════════════════

type InsightHighlight = { pillar: PillarKey; score: number; reason: string }
type InsightTrend = { pillar: PillarKey; direction: 'improving' | 'declining'; delta: number }
type InsightHighlights = {
  message: string
  overallLabel: string
  overallScore: number
  strength: InsightHighlight | null
  concern: InsightHighlight | null
  trend: InsightTrend | null
  actions: string[]
}

function buildInsightHighlights(
  scores: WellnessScores,
  analytics: AnalyticsData,
  childName: string,
  ageMonths: number,
): InsightHighlights {
  const lowest = PILLAR_ORDER.reduce<PillarKey | null>((min, key) => {
    if (!scores[key].hasData) return min
    if (!min || scores[key].value < scores[min].value) return key
    return min
  }, null)

  const highest = PILLAR_ORDER.reduce<PillarKey | null>((max, key) => {
    if (!scores[key].hasData) return max
    if (!max || scores[key].value > scores[max].value) return key
    return max
  }, null)

  const overallLabel =
    scores.overall >= 8.5 ? 'excellent' :
    scores.overall >= 7 ? 'on track' :
    scores.overall >= 5 ? 'developing' :
    'needs attention'

  const parts: string[] = [`${childName} is ${overallLabel} at ${scores.overall.toFixed(1)}/10 overall.`]

  let concern: InsightHighlight | null = null
  if (lowest && scores[lowest].value < 7) {
    let reason = `${PILLAR_CONFIG[lowest].label} is the main area to work on at ${scores[lowest].value.toFixed(1)}/10.`
    if (lowest === 'sleep' && analytics.sleep.hasData) {
      const target = getAgeSleepTarget(ageMonths)
      const deficit = (target - analytics.sleep.avgHours).toFixed(1)
      reason = `Sleep is the main focus — averaging ${analytics.sleep.avgHours.toFixed(1)}h vs ${target}h target (${deficit}h short).`
    } else if (lowest === 'nutrition' && analytics.nutrition.hasData) {
      const total = analytics.nutrition.mealFrequency.reduce((a, b) => a + b, 0)
      const good = analytics.nutrition.eatQuality.good.reduce((a, b) => a + b, 0)
      const pct = total > 0 ? Math.round((good / total) * 100) : 0
      reason = `Nutrition needs attention — ${pct}% of meals eaten well this week (score: ${scores.nutrition.value.toFixed(1)}/10).`
    }
    parts.push(reason)
    concern = { pillar: lowest, score: scores[lowest].value, reason }
  }

  let strength: InsightHighlight | null = null
  if (highest && scores[highest].value >= 8 && highest !== lowest) {
    let reason = `${PILLAR_CONFIG[highest].label} is a strength at ${scores[highest].value.toFixed(1)}/10.`
    if (highest === 'sleep' && analytics.sleep.hasData) {
      reason = `Sleep is a strength — ${analytics.sleep.avgHours.toFixed(1)}h avg with great consistency!`
    } else if (highest === 'nutrition' && analytics.nutrition.hasData) {
      const total = analytics.nutrition.mealFrequency.reduce((a, b) => a + b, 0)
      const good = analytics.nutrition.eatQuality.good.reduce((a, b) => a + b, 0)
      const pct = total > 0 ? Math.round((good / total) * 100) : 0
      reason = `Nutrition is a strength — ${pct}% of meals eaten well (${scores.nutrition.value.toFixed(1)}/10).`
    }
    parts.push(reason)
    strength = { pillar: highest, score: scores[highest].value, reason }
  }

  let trend: InsightTrend | null = null
  // Pick the pillar with the largest absolute trend (≥10%), not the first
  // one that crosses 10% in PILLAR_ORDER. The old find() hid a 40% activity
  // decline behind a 12% nutrition wobble simply because nutrition came
  // earlier in the array.
  const trendPillar = PILLAR_ORDER
    .filter((k) => scores[k].hasData && Math.abs(scores[k].trend) >= 10)
    .reduce<PillarKey | null>(
      (best, k) => (best === null || Math.abs(scores[k].trend) > Math.abs(scores[best].trend) ? k : best),
      null,
    )
  if (trendPillar) {
    const direction: 'improving' | 'declining' = scores[trendPillar].trend > 0 ? 'improving' : 'declining'
    const delta = Math.abs(scores[trendPillar].trend)
    parts.push(`${PILLAR_CONFIG[trendPillar].label} ${direction} ${delta}% this week.`)
    trend = { pillar: trendPillar, direction, delta }
  }

  return {
    message: parts.join(' '),
    overallLabel,
    overallScore: scores.overall,
    strength,
    concern,
    trend,
    actions: buildInsightActions(concern, trend, analytics, ageMonths),
  }
}

function buildInsightActions(
  concern: InsightHighlight | null,
  trend: InsightTrend | null,
  analytics: AnalyticsData,
  ageMonths: number,
): string[] {
  const actions: string[] = []
  if (concern) {
    switch (concern.pillar) {
      case 'sleep': {
        const target = getAgeSleepTarget(ageMonths)
        actions.push(`Aim for ${target}h tonight — try bringing bedtime 30 min earlier.`)
        actions.push('Keep the last hour calm: dim lights, wind-down routine, no screens.')
        break
      }
      case 'nutrition':
        actions.push('Offer a protein + veg combo at the next meal — small portions, no pressure.')
        actions.push('Plan 2 snack windows between meals so appetite is stronger at mealtime.')
        break
      case 'activity':
        actions.push('Fit in 30 min of outdoor play — even a short walk counts.')
        actions.push('Break up screen time with active bursts: dancing, stretches, chase games.')
        break
      case 'mood':
        actions.push('Look for patterns — tired, hungry, overstimulated? Address the trigger first.')
        actions.push('Carve out 15 min of one-on-one connection time today.')
        break
      case 'health':
        actions.push('Log any symptoms in the calendar so the pattern is easy to spot.')
        actions.push('If anything persists beyond 48h, book a pediatrician check-in.')
        break
      case 'growth':
        actions.push('Keep logging weight + height weekly — trend matters more than a single point.')
        break
    }
  }
  if (trend && trend.direction === 'declining' && (!concern || trend.pillar !== concern.pillar)) {
    actions.push(`${PILLAR_CONFIG[trend.pillar].label} dropped ${trend.delta}% this week — worth a closer look.`)
  }
  return actions.slice(0, 2)
}

function GrandmaInsightCard({
  scores, analytics, childName, ageMonths, compact = false,
}: {
  scores: WellnessScores
  analytics: AnalyticsData
  childName: string
  ageMonths: number
  compact?: boolean
}) {
  const { t } = useTranslation()
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const [detailOpen, setDetailOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const highlights = buildInsightHighlights(scores, analytics, childName, ageMonths)

  function handleDiscussPress() {
    setConfirmOpen(true)
  }

  function handleConfirmYes() {
    const ctx = buildGrandmaContext(scores, analytics, childName, ageMonths)
    setConfirmOpen(false)
    setTimeout(() => {
      AsyncStorage.setItem('grandma-insight-context', ctx).catch(() => {})
      router.push({ pathname: '/grandma-talk', params: { hasInsightContext: '1' } } as any)
    }, 150)
  }

  if (diffuse) {
    const accent = getDiffuseAccent('kids', dt.isDark)
    return (
      <>
        <Pressable
          onPress={() => setDetailOpen(true)}
          style={({ pressed }) => [
            {
              borderRadius: compact ? 20 : 26,
              padding: compact ? 16 : 20,
              backgroundColor: dt.colors.surface,
              borderWidth: compact ? 1 : 0,
              borderColor: dt.colors.line,
              overflow: 'hidden',
              opacity: pressed ? 0.94 : 1,
            },
          ]}
        >
          <SoftBloom color={accent} cx="86%" cy="14%" opacity={dt.isDark ? 0.26 : 0.36} spread={0.55} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: compact ? 8 : 12 }}>
            <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: dt.colors.ink3 }}>
              {t('kids_analytics_grandma_says_label')}
            </Text>
            <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: dt.colors.ink3 }}>
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          </View>
          <Text
            style={{ fontFamily: diffuseFont.body, fontSize: compact ? 14 : 22, lineHeight: compact ? 20 : 28, color: compact ? dt.colors.ink2 : dt.colors.ink, letterSpacing: compact ? 0 : -0.3 }}
            numberOfLines={compact ? 3 : undefined}
          >
            {highlights.message}
          </Text>
          <Pressable
            onPress={(e) => { e.stopPropagation?.(); handleDiscussPress() }}
            hitSlop={8}
            style={({ pressed }) => [
              { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: dt.colors.line2, paddingTop: compact ? 12 : 16, marginTop: compact ? 12 : 18, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Text style={{ fontFamily: diffuseFont.monoBold, fontSize: compact ? 11 : 12, letterSpacing: 2, textTransform: 'uppercase', color: dt.colors.ink }}>
              {t('kids_analytics_discuss_btn')}
            </Text>
            <Text style={{ fontFamily: diffuseFont.body, fontSize: 18, color: dt.colors.ink3 }}>→</Text>
          </Pressable>
        </Pressable>

        {detailOpen && (
          <GrandmaInsightDetailSheet
            highlights={highlights}
            childName={childName}
            onClose={() => setDetailOpen(false)}
            onDiscuss={() => {
              setDetailOpen(false)
              setTimeout(() => setConfirmOpen(true), 150)
            }}
          />
        )}

        {confirmOpen && (
          <DiscussConfirmSheet
            childName={childName}
            onClose={() => setConfirmOpen(false)}
            onConfirm={handleConfirmYes}
          />
        )}
      </>
    )
  }

  return (
    <>
      <Pressable
        onPress={() => setDetailOpen(true)}
        style={({ pressed }) => [
          styles.grandmaInsightPaper,
          { backgroundColor: colors.accentSoft, borderColor: colors.border },
          pressed && { opacity: 0.95, transform: [{ scale: 0.99 }] },
        ]}
      >
        {/* Big Heart sticker tucked into the bottom-right corner */}
        <View style={styles.grandmaInsightStickerBg} pointerEvents="none">
          <StickerHeart size={150} fill={stickers.pink} />
        </View>

        {/* Header: label + date */}
        <View style={styles.grandmaInsightHeader}>
          <Animated.View entering={FadeIn.duration(400)}>
            <Text
              style={[
                styles.grandmaInsightLabel,
                { color: colors.textMuted, fontFamily: font.bodySemiBold },
              ]}
            >
              {t('kids_analytics_grandma_says_label')}
            </Text>
          </Animated.View>
          <Text
            style={[
              styles.grandmaInsightDate,
              { color: colors.textMuted, fontFamily: font.body },
            ]}
          >
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>

        {/* Word-by-word animated reveal — staggered fade-in for a delightful feel */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(120)}
          style={styles.grandmaInsightMessageWrap}
        >
          <Text
            style={[
              styles.grandmaInsightMessage,
              { color: colors.text, fontFamily: font.body },
            ]}
          >
            {highlights.message}
          </Text>
        </Animated.View>

        {/* "Let's discuss →" ink-dark pill button — opens confirm sheet */}
        <Animated.View entering={FadeIn.duration(400).delay(500)}>
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.()
              handleDiscussPress()
            }}
            hitSlop={8}
            style={({ pressed }) => [
              styles.grandmaInsightBtn,
              { backgroundColor: colors.text },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text
              style={[
                styles.grandmaInsightBtnText,
                { color: colors.bg, fontFamily: font.bodyMedium },
              ]}
            >
              {t('kids_analytics_discuss_btn')}
            </Text>
          </Pressable>
        </Animated.View>
      </Pressable>

      {detailOpen && (
        <GrandmaInsightDetailSheet
          highlights={highlights}
          childName={childName}
          onClose={() => setDetailOpen(false)}
          onDiscuss={() => {
            setDetailOpen(false)
            setTimeout(() => setConfirmOpen(true), 150)
          }}
        />
      )}

      {confirmOpen && (
        <DiscussConfirmSheet
          childName={childName}
          onClose={() => setConfirmOpen(false)}
          onConfirm={handleConfirmYes}
        />
      )}
    </>
  )
}

// ─── Grandma Insight Detail Sheet ──────────────────────────────────────────

function GrandmaInsightDetailSheet({
  highlights, childName, onClose, onDiscuss,
}: {
  highlights: InsightHighlights
  childName: string
  onClose: () => void
  onDiscuss: () => void
}) {
  const { t } = useTranslation()
  const { colors, radius, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const insets = useSafeAreaInsets()

  if (diffuse) {
    const accent = getDiffuseAccent('kids', dt.isDark)
    const rows: { label: string; title: string; titleColor: string; body: string }[] = []
    if (highlights.strength) rows.push({ label: t('kids_analytics_insight_strength_label'), title: PILLAR_CONFIG[highlights.strength.pillar].label, titleColor: dt.colors.ink, body: highlights.strength.reason })
    if (highlights.concern) rows.push({ label: t('kids_analytics_insight_concern_label'), title: PILLAR_CONFIG[highlights.concern.pillar].label, titleColor: dt.colors.ink, body: highlights.concern.reason })
    if (highlights.trend) rows.push({ label: t('kids_analytics_insight_trend_label'), title: `${PILLAR_CONFIG[highlights.trend.pillar].label} ${highlights.trend.direction}`, titleColor: highlights.trend.direction === 'improving' ? dt.colors.success : dt.colors.error, body: `${highlights.trend.delta}% week-over-week change.` })
    return (
      <DiffuseSheet
        visible
        title={`${childName} is ${highlights.overallLabel}`}
        chip={`${highlights.overallScore.toFixed(1)}/10`}
        onClose={onClose}
      >
        {rows.map((r, i) => (
          <View key={i} style={{ borderTopWidth: 1, borderTopColor: dt.colors.line, paddingVertical: 14 }}>
            <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: dt.colors.ink3, marginBottom: 4 }}>{r.label}</Text>
            <Text style={{ fontFamily: diffuseFont.display, fontSize: 18, color: r.titleColor, marginBottom: 4 }}>{r.title}</Text>
            <Text style={{ fontFamily: diffuseFont.body, fontSize: 14, lineHeight: 20, color: dt.colors.ink2 }}>{r.body}</Text>
          </View>
        ))}
        {highlights.actions.length > 0 && (
          <View style={{ borderTopWidth: 1, borderTopColor: dt.colors.line, paddingTop: 14, marginTop: 4 }}>
            <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: dt.colors.ink3, marginBottom: 10 }}>{t('kids_analytics_insight_next_steps_label')}</Text>
            {highlights.actions.map((a, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                <DiffuseBloomIcon color={accent} size={26} intensity={0.4}><Lightbulb size={15} color={dt.colors.ink3} strokeWidth={1.5} /></DiffuseBloomIcon>
                <Text style={{ flex: 1, fontFamily: diffuseFont.body, fontSize: 14, lineHeight: 20, color: dt.colors.ink }}>{a}</Text>
              </View>
            ))}
          </View>
        )}
        {rows.length === 0 && (
          <Text style={{ fontFamily: diffuseFont.body, fontSize: 14, color: dt.colors.ink3, textAlign: 'center', paddingVertical: 20 }}>{t('kids_analytics_insight_no_highlights')}</Text>
        )}
        <Pressable
          onPress={onDiscuss}
          style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: dt.colors.line2, paddingTop: 18, marginTop: 8, opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={{ fontFamily: diffuseFont.monoBold, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: dt.colors.ink }}>{t('kids_analytics_discuss_btn')}</Text>
          <Text style={{ fontFamily: diffuseFont.body, fontSize: 18, color: dt.colors.ink3 }}>→</Text>
        </Pressable>
      </DiffuseSheet>
    )
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[
            styles.insightDetailSheet,
            {
              backgroundColor: colors.surface,
              borderRadius: radius.xl,
              paddingBottom: insets.bottom + 20,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.insightDetailHeaderRow}>
            <View style={styles.insightDetailLabelWrap}>
              <Text
                style={[
                  styles.grandmaInsightLabel,
                  { color: colors.textMuted, fontFamily: font.bodySemiBold },
                ]}
              >
                {t('kids_analytics_grandma_says_label')}
              </Text>
              <Text
                style={[
                  styles.insightDetailOverall,
                  { color: colors.text, fontFamily: font.display },
                ]}
              >
                {childName}{' is '}{highlights.overallLabel}
              </Text>
              <Text
                style={[
                  styles.insightDetailOverallSub,
                  { color: colors.textSecondary, fontFamily: font.body },
                ]}
              >
                {t('kids_analytics_insight_overall_week', { score: highlights.overallScore.toFixed(1) })}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={[styles.modalClose, { backgroundColor: colors.surfaceRaised }]}
            >
              <X size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          {highlights.strength && (
            <HighlightRow
              icon={<StickerBurst size={28} fill={stickers.yellow} points={8} />}
              label={t('kids_analytics_insight_strength_label')}
              labelColor={colors.textMuted}
              title={PILLAR_CONFIG[highlights.strength.pillar].label}
              titleColor={PILLAR_CONFIG[highlights.strength.pillar].color}
              body={highlights.strength.reason}
              bodyColor={colors.textSecondary}
              bgColor={colors.surfaceRaised}
              radius={radius.lg}
              font={font}
            />
          )}

          {highlights.concern && (
            <HighlightRow
              icon={<StickerHeart size={28} fill={stickers.pink} />}
              label={t('kids_analytics_insight_concern_label')}
              labelColor={colors.textMuted}
              title={PILLAR_CONFIG[highlights.concern.pillar].label}
              titleColor={PILLAR_CONFIG[highlights.concern.pillar].color}
              body={highlights.concern.reason}
              bodyColor={colors.textSecondary}
              bgColor={colors.surfaceRaised}
              radius={radius.lg}
              font={font}
            />
          )}

          {highlights.trend && (
            <HighlightRow
              icon={
                highlights.trend.direction === 'improving'
                  ? <ArrowUpRight size={24} color={colors.success} strokeWidth={2.2} />
                  : <ArrowDownRight size={24} color={colors.error} strokeWidth={2.2} />
              }
              label={t('kids_analytics_insight_trend_label')}
              labelColor={colors.textMuted}
              title={`${PILLAR_CONFIG[highlights.trend.pillar].label} ${highlights.trend.direction}`}
              titleColor={highlights.trend.direction === 'improving' ? colors.success : colors.error}
              body={`${highlights.trend.delta}% week-over-week change.`}
              bodyColor={colors.textSecondary}
              bgColor={colors.surfaceRaised}
              radius={radius.lg}
              font={font}
            />
          )}

          {highlights.actions.length > 0 && (
            <View style={styles.insightActionsBlock}>
              <Text
                style={[
                  styles.grandmaInsightLabel,
                  { color: colors.textMuted, fontFamily: font.bodySemiBold },
                ]}
              >
                {t('kids_analytics_insight_next_steps_label')}
              </Text>
              {highlights.actions.map((a, i) => (
                <View
                  key={i}
                  style={[
                    styles.insightActionRow,
                    { backgroundColor: colors.primaryTint, borderRadius: radius.md },
                  ]}
                >
                  <Lightbulb size={16} color={colors.primary} strokeWidth={2} />
                  <Text
                    style={[
                      styles.insightActionText,
                      { color: colors.text, fontFamily: font.body },
                    ]}
                  >
                    {a}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {!highlights.strength && !highlights.concern && !highlights.trend && (
            <View style={[styles.insightEmpty, { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg }]}>
              <Text style={[styles.insightEmptyText, { color: colors.textSecondary, fontFamily: font.body }]}>
                {t('kids_analytics_insight_no_highlights')}
              </Text>
            </View>
          )}

          <Pressable
            onPress={onDiscuss}
            style={({ pressed }) => [
              styles.insightDetailCta,
              { backgroundColor: colors.text, borderRadius: radius.full },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Sparkles size={16} color={colors.bg} strokeWidth={2} />
            <Text style={[styles.insightDetailCtaText, { color: colors.bg, fontFamily: font.bodySemiBold }]}>
              {t('kids_analytics_discuss_btn')}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function HighlightRow({
  icon, label, labelColor, title, titleColor, body, bodyColor, bgColor, radius, font,
}: {
  icon: React.ReactNode
  label: string
  labelColor: string
  title: string
  titleColor: string
  body: string
  bodyColor: string
  bgColor: string
  radius: number
  font: { body: string; bodyMedium: string; bodySemiBold: string; display: string }
}) {
  return (
    <View style={[styles.insightHighlightRow, { backgroundColor: bgColor, borderRadius: radius }]}>
      <View style={styles.insightHighlightIcon}>{icon}</View>
      <View style={styles.insightHighlightBody}>
        <Text style={[styles.insightHighlightLabel, { color: labelColor, fontFamily: font.bodySemiBold }]}>
          {label}
        </Text>
        <Text style={[styles.insightHighlightTitle, { color: titleColor, fontFamily: font.bodySemiBold }]}>
          {title}
        </Text>
        <Text style={[styles.insightHighlightText, { color: bodyColor, fontFamily: font.body }]}>
          {body}
        </Text>
      </View>
    </View>
  )
}

// ─── Discuss Confirm Sheet ─────────────────────────────────────────────────

function DiscussConfirmSheet({
  childName, onClose, onConfirm,
}: {
  childName: string
  onClose: () => void
  onConfirm: () => void
}) {
  const { t } = useTranslation()
  const { colors, radius, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const insets = useSafeAreaInsets()

  if (diffuse) {
    const accent = getDiffuseAccent('kids', dt.isDark)
    return (
      <DiffuseSheet visible title={t('kids_analytics_confirm_share_title')} onClose={onClose} scroll={false}>
        <View style={{ alignItems: 'center', paddingTop: 4, paddingBottom: 8 }}>
          <DiffuseBloomIcon color={accent} size={48} intensity={0.5}><Sparkles size={24} color={dt.colors.ink3} strokeWidth={1.4} /></DiffuseBloomIcon>
        </View>
        <Text style={{ fontFamily: diffuseFont.body, fontSize: 15, lineHeight: 22, color: dt.colors.ink2, textAlign: 'center', marginBottom: 20 }}>
          {t('kids_analytics_confirm_share_body', { childName })}
        </Text>
        <Pressable
          onPress={onConfirm}
          style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: dt.colors.line2, paddingTop: 16, opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={{ fontFamily: diffuseFont.monoBold, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: dt.colors.ink }}>{t('kids_analytics_confirm_share_yes')}</Text>
          <Text style={{ fontFamily: diffuseFont.body, fontSize: 18, color: dt.colors.ink3 }}>→</Text>
        </Pressable>
        <Pressable onPress={onClose} style={({ pressed }) => [{ paddingVertical: 16, alignItems: 'center', opacity: pressed ? 0.6 : 1 }]}>
          <Text style={{ fontFamily: diffuseFont.mono, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: dt.colors.ink3 }}>{t('kids_analytics_confirm_share_no')}</Text>
        </Pressable>
      </DiffuseSheet>
    )
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.modalOverlay, styles.confirmOverlay]} onPress={onClose}>
        <Pressable
          style={[
            styles.confirmSheet,
            { backgroundColor: colors.surface, borderRadius: radius.xl, paddingBottom: insets.bottom + 20 },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.confirmIconWrap} pointerEvents="none">
            <StickerHeart size={72} fill={stickers.pink} />
          </View>

          <Text style={[styles.confirmTitle, { color: colors.text, fontFamily: font.display }]}>
            {t('kids_analytics_confirm_share_title')}
          </Text>
          <Text style={[styles.confirmBody, { color: colors.textSecondary, fontFamily: font.body }]}>
            {t('kids_analytics_confirm_share_body', { childName })}
          </Text>

          <Pressable
            onPress={onConfirm}
            style={({ pressed }) => [
              styles.confirmPrimary,
              { backgroundColor: colors.text, borderRadius: radius.full },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Sparkles size={16} color={colors.bg} strokeWidth={2} />
            <Text style={[styles.confirmPrimaryText, { color: colors.bg, fontFamily: font.bodySemiBold }]}>
              {t('kids_analytics_confirm_share_yes')}
            </Text>
          </Pressable>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.confirmSecondary,
              { borderRadius: radius.full, borderColor: colors.border },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.confirmSecondaryText, { color: colors.textSecondary, fontFamily: font.bodyMedium }]}>
              {t('kids_analytics_confirm_share_no')}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH TIPS SECTION
// ═══════════════════════════════════════════════════════════════════════════════

function HealthTipsSection({
  tips, scores, analytics, childName, ageMonths, onTipPress,
}: {
  tips: TipData[]
  scores: WellnessScores
  analytics: AnalyticsData
  childName: string
  ageMonths: number
  onTipPress: (tip: TipData) => void
}) {
  const { t } = useTranslation()
  const { colors, radius } = useTheme()

  function handleAskGrandma() {
    const ctx = buildGrandmaContext(scores, analytics, childName, ageMonths)
    router.push({ pathname: '/grandma-talk', params: { insightContext: ctx } } as any)
  }

  return (
    <View style={styles.tipsSection}>
      <View style={styles.tipsSectionHeader}>
        <Text style={[styles.tipsSectionTitle, { color: colors.text }]}>{t('kids_analytics_health_tips_label')}</Text>
        <Text style={[styles.tipsSectionSub, { color: colors.textMuted }]}>{t('kids_analytics_personalized_for_today', { childName })}</Text>
      </View>

      <View style={styles.tipsGrid}>
        {tips.map((tip, i) => {
          const Icon = tip.icon
          return (
            <Pressable
              key={i}
              onPress={() => onTipPress(tip)}
              style={({ pressed }) => [
                styles.tipCard,
                { backgroundColor: tip.color + '10', borderRadius: radius.lg, borderWidth: 1, borderColor: tip.color + '20' },
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.tipIconWrap, { backgroundColor: tip.color + '20' }]}>
                  <Icon size={14} color={tip.color} strokeWidth={2} />
                </View>
                <Text style={[styles.tipTitle, { color: colors.text, flex: 1 }]} numberOfLines={2}>{tip.title}</Text>
              </View>
              <Text style={[styles.tipBody, { color: colors.textSecondary }]} numberOfLines={2}>{tip.body}</Text>
              <View style={styles.tipTapHint}>
                <ChevronRight size={10} color={tip.color} strokeWidth={2.5} />
                <Text style={[styles.tipTapText, { color: tip.color }]}>{t('kids_analytics_tip_tap_details')}</Text>
              </View>
            </Pressable>
          )
        })}
      </View>

      <Pressable
        onPress={handleAskGrandma}
        style={({ pressed }) => [
          styles.askButton,
          { backgroundColor: colors.surface, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
          pressed && { opacity: 0.8 },
        ]}
      >
        <Sparkles size={16} color={colors.primary} strokeWidth={2} />
        <Text style={[styles.askButtonText, { color: colors.text }]}>{t('kids_analytics_ask_grandma_full_ctx')}</Text>
      </Pressable>
    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTINE COMPLIANCE SECTION
// ═══════════════════════════════════════════════════════════════════════════════

function RoutineComplianceSection({ data }: { data: RoutineComplianceData }) {
  const { t } = useTranslation()
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const [showModal, setShowModal] = useState(false)
  const adherenceRate = 100 - data.skipRate
  // Three tiers: ≥70 healthy (green), 40–69 watch (coral), <40 alarm
  // (brand.error). The duplicate `coral : coral` branch made the 40
  // threshold dead code so users with severe routine drift saw the same
  // color as a mild lapse.
  const adherenceColor =
    adherenceRate >= 70 ? stickers.green :
    adherenceRate >= 40 ? stickers.coral :
    brand.error
  const tint = adherenceRate >= 70 ? stickers.greenSoft : stickers.peachSoft

  if (diffuse) {
    const diffuseAdherenceColor = adherenceRate >= 70 ? dt.colors.success : adherenceRate >= 40 ? getDiffuseAccent('kids', dt.isDark) : dt.colors.error
    return (
      <View>
        <Pressable
          onPress={() => setShowModal(true)}
          style={({ pressed }) => [
            { paddingVertical: 16, borderTopWidth: 1, borderTopColor: dt.colors.line, opacity: pressed ? 0.65 : 1 },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <DiffuseBloomIcon color={stickers.coral} size={30} intensity={0.45}>
              <SkipForward size={16} color={dt.colors.ink3} strokeWidth={1.5} />
            </DiffuseBloomIcon>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: diffuseFont.display, fontSize: 18, color: dt.colors.ink }}>{t('kids_analytics_routine_compliance_title')}</Text>
              <View style={{ height: 2, borderRadius: 999, backgroundColor: dt.colors.line, marginTop: 8, overflow: 'hidden' }}>
                <View style={{ width: `${adherenceRate}%`, height: 2, borderRadius: 999, backgroundColor: dt.colors.ink3 }} />
              </View>
            </View>
            {data.hasData ? (
              <Text style={{ fontFamily: diffuseFont.display, fontSize: 26, color: dt.colors.ink }}>
                {data.totalSkips}
                <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, color: dt.colors.ink3 }}>{' skips'}</Text>
              </Text>
            ) : (
              <Text style={{ fontFamily: diffuseFont.mono, fontSize: 13, color: dt.colors.ink3 }}>{'—'}</Text>
            )}
          </View>
          <Text style={{ fontFamily: diffuseFont.body, fontSize: 13, lineHeight: 19, color: dt.colors.ink2, marginTop: 10 }}>
            {data.hasData
              ? `${adherenceRate}% adherence this week — ${data.totalSkips} total skip${data.totalSkips === 1 ? '' : 's'}.`
              : 'No routines tracked yet — add skips in the calendar.'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
            <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: diffuseAdherenceColor }}>{t('kids_analytics_tip_tap_details')}</Text>
            <Text style={{ fontFamily: diffuseFont.body, fontSize: 14, color: diffuseAdherenceColor }}>→</Text>
          </View>
        </Pressable>

        <RoutineComplianceModal
          visible={showModal}
          data={data}
          adherenceRate={adherenceRate}
          adherenceColor={diffuseAdherenceColor}
          tint={tint}
          onClose={() => setShowModal(false)}
        />
      </View>
    )
  }

  return (
    <View style={{ marginTop: 2 }}>
      <Pressable
        onPress={() => setShowModal(true)}
        style={({ pressed }) => [
          styles.pillarPaper,
          { backgroundColor: colors.surface, borderColor: colors.border },
          pressed && { opacity: 0.92 },
        ]}
      >
        <View style={styles.pillarPaperHead}>
          <View
            style={[
              styles.pillarStickerChip,
              { backgroundColor: tint, borderColor: colors.border },
            ]}
          >
            <StickerFlower size={26} petal={stickers.coral} />
          </View>

          <View style={{ flex: 1 }}>
            <View style={styles.pillarPaperTitleRow}>
              <Text
                style={[
                  styles.pillarPaperName,
                  { color: colors.text, fontFamily: font.display },
                ]}
              >
                {t('kids_analytics_routine_compliance_title')}
              </Text>
            </View>

            <View
              style={[styles.pillarPaperBarBg, { backgroundColor: tint }]}
            >
              <View
                style={[
                  styles.pillarPaperBarFill,
                  { width: `${adherenceRate}%`, backgroundColor: adherenceColor },
                ]}
              />
            </View>
          </View>

          <View style={styles.pillarPaperScore}>
            {data.hasData ? (
              <>
                <Text
                  style={[
                    styles.pillarPaperValue,
                    { color: colors.text, fontFamily: font.display },
                  ]}
                >
                  {data.totalSkips}
                </Text>
                <Text style={[styles.pillarPaperOf, { color: colors.textMuted }]}>
                  {' skips'}
                </Text>
              </>
            ) : (
              <Text style={[styles.pillarPaperOf, { color: colors.textMuted }]}>
                {'—'}
              </Text>
            )}
          </View>
        </View>

        <Text
          style={[
            styles.pillarPaperBody,
            { color: colors.textSecondary, fontFamily: font.body },
          ]}
        >
          {data.hasData
            ? `${adherenceRate}% adherence this week — ${data.totalSkips} total skip${data.totalSkips === 1 ? '' : 's'}.`
            : 'No routines tracked yet — add skips in the calendar.'}
        </Text>

        <View style={styles.pillarPaperFooter}>
          <Text
            style={[
              styles.pillarPaperFooterText,
              { color: adherenceColor, fontFamily: font.bodySemiBold },
            ]}
          >
            {t('kids_analytics_tip_tap_details')}
          </Text>
          <ChevronRight size={14} color={adherenceColor} strokeWidth={2.5} />
        </View>
      </Pressable>

      <RoutineComplianceModal
        visible={showModal}
        data={data}
        adherenceRate={adherenceRate}
        adherenceColor={adherenceColor}
        tint={tint}
        onClose={() => setShowModal(false)}
      />
    </View>
  )
}

function RoutineComplianceModal({
  visible, data, adherenceRate, adherenceColor, tint, onClose,
}: {
  visible: boolean
  data: RoutineComplianceData
  adherenceRate: number
  adherenceColor: string
  tint: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const insets = useSafeAreaInsets()
  const sheetH = SCREEN_H * 0.78

  if (diffuse) {
    const maxSkip = Math.max(...(data.weeklySkips.length ? data.weeklySkips : [1]), 1)
    return (
      <DiffuseSheet
        visible={visible}
        title={t('kids_analytics_routine_compliance_title')}
        chip={data.hasData ? `${adherenceRate}%` : undefined}
        onClose={onClose}
      >
        <View style={{ flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: dt.colors.line, paddingTop: 16 }}>
          <DiffuseMetricTile value={`${adherenceRate}%`} label={t('kids_analytics_routine_adherence')} />
          <DiffuseMetricTile value={data.totalSkips} label={t('kids_analytics_routine_total_skips')} />
        </View>

        {data.hasData && (
          <View style={{ marginTop: 20 }}>
            <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: dt.colors.ink3, marginBottom: 12 }}>{t('kids_analytics_routine_skips_per_day')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 60, gap: 6 }}>
              {data.weeklySkips.map((count, i) => {
                const barH = count > 0 ? Math.max((count / maxSkip) * 48, 6) : 3
                return (
                  <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                    <View style={{ width: '70%', height: barH, backgroundColor: count > 0 ? dt.colors.ink3 : dt.colors.line, borderRadius: 3 }} />
                    <Text style={{ fontFamily: diffuseFont.mono, fontSize: 8.5, color: dt.colors.ink3, marginTop: 6 }}>{data.weekLabels[i]}</Text>
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {data.mostSkipped.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: dt.colors.ink3, marginBottom: 4 }}>{t('kids_analytics_routine_most_skipped')}</Text>
            {data.mostSkipped.map((item, i) => (
              <DiffuseListRow key={i} title={item.name} value={`${item.count}×`} last={i === data.mostSkipped.length - 1} />
            ))}
          </View>
        )}

        {!data.hasData && (
          <Text style={{ fontFamily: diffuseFont.body, fontSize: 13, color: dt.colors.ink3, textAlign: 'center', paddingVertical: 20 }}>{t('kids_analytics_routine_no_skips')}</Text>
        )}
      </DiffuseSheet>
    )
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View
          style={[
            styles.modalSheet,
            { height: sheetH, backgroundColor: colors.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32 },
          ]}
        >
          {/* Handle */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>

          {/* Header */}
          <View
            style={[
              styles.modalHeader,
              {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.border,
                paddingBottom: 16,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 999,
                  backgroundColor: tint,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <StickerFlower size={26} petal={stickers.coral} />
              </View>
              <View>
                <Text
                  style={[
                    styles.modalTitle,
                    { color: colors.text, fontFamily: font.display },
                  ]}
                >
                  {t('kids_analytics_routine_compliance_title')}
                </Text>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 13,
                    fontFamily: font.body,
                  }}
                >
                  {data.hasData
                    ? `${adherenceRate}% adherence · ${data.totalSkips} skip${data.totalSkips === 1 ? '' : 's'}`
                    : 'No routines tracked yet'}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={[
                styles.modalClose,
                { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
              ]}
            >
              <X size={16} color={colors.text} strokeWidth={2} />
            </Pressable>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: insets.bottom + 24,
              gap: 16,
            }}
          >
            <Animated.View entering={FadeInDown.duration(220)} style={[
              styles.routineExpand,
              { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 0 },
            ]}>
              <View style={styles.routineStatRow}>
            <View style={styles.routineStatCell}>
              <Text
                style={[
                  styles.routineStatValue,
                  { color: colors.text, fontFamily: font.display },
                ]}
              >
                {adherenceRate}%
              </Text>
              <Text
                style={[
                  styles.routineStatLabel,
                  { color: colors.textMuted, fontFamily: font.body },
                ]}
              >
                {t('kids_analytics_routine_adherence')}
              </Text>
            </View>
            <View style={styles.routineStatCell}>
              <Text
                style={[
                  styles.routineStatValue,
                  { color: colors.text, fontFamily: font.display },
                ]}
              >
                {data.totalSkips}
              </Text>
              <Text
                style={[
                  styles.routineStatLabel,
                  { color: colors.textMuted, fontFamily: font.body },
                ]}
              >
                {t('kids_analytics_routine_total_skips')}
              </Text>
            </View>
          </View>

          {data.hasData && (
            <View>
              <Text
                style={[
                  styles.routineSubheader,
                  { color: colors.textMuted, fontFamily: font.bodySemiBold },
                ]}
              >
                {t('kids_analytics_routine_skips_per_day')}
              </Text>
              <View style={styles.routineBarsRow}>
                {data.weeklySkips.map((count, i) => {
                  const maxV = Math.max(...data.weeklySkips, 1)
                  const barH = count > 0 ? Math.max((count / maxV) * 44, 10) : 4
                  return (
                    <View key={i} style={styles.routineBarCell}>
                      <View
                        style={{
                          width: '80%',
                          height: barH,
                          backgroundColor: count > 0 ? stickers.coral : colors.border,
                          borderRadius: 4,
                        }}
                      />
                      <Text
                        style={{
                          color: colors.textMuted,
                          fontFamily: font.body,
                          fontSize: 11,
                          marginTop: 6,
                        }}
                      >
                        {data.weekLabels[i]}
                      </Text>
                    </View>
                  )
                })}
              </View>
            </View>
          )}

          {data.mostSkipped.length > 0 && (
            <View>
              <Text
                style={[
                  styles.routineSubheader,
                  { color: colors.textMuted, fontFamily: font.bodySemiBold },
                ]}
              >
                {t('kids_analytics_routine_most_skipped')}
              </Text>
              <View style={{ gap: 10 }}>
                {data.mostSkipped.map((item, i) => (
                  <View key={i} style={styles.routineSkipRow}>
                    <MinusCircle size={16} color={stickers.coral} strokeWidth={2} />
                    <Text
                      style={{
                        color: colors.text,
                        fontFamily: font.body,
                        fontSize: 14,
                        flex: 1,
                      }}
                    >
                      {item.name}
                    </Text>
                    <View style={[styles.routineSkipBadge, { backgroundColor: stickers.peachSoft }]}>
                      <Text
                        style={{
                          color: stickers.coral,
                          fontFamily: font.bodySemiBold,
                          fontSize: 13,
                        }}
                      >
                        {item.count}{'×'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {!data.hasData && (
            <Text
              style={{
                color: colors.textMuted,
                fontFamily: font.body,
                fontSize: 13,
                textAlign: 'center',
              }}
            >
              {t('kids_analytics_routine_no_skips')}
            </Text>
          )}
            </Animated.View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PILLAR ROW — score bar with trend + takeaway
// ═══════════════════════════════════════════════════════════════════════════════

function PillarRow({ pillarKey, score, tip, onPress }: {
  pillarKey: PillarKey
  score: PillarScore
  tip?: TipData
  onPress: () => void
}) {
  const { t } = useTranslation()
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const config = PILLAR_CONFIG[pillarKey]
  const safeValue = Number.isFinite(score.value) ? score.value : 0
  const pct = score.hasData ? Math.max(0, Math.min(100, (safeValue / 10) * 100)) : 0
  const palette = pillarPalette(pillarKey, stickers)

  // Prefer the data-driven tip body; fall back to a generic takeaway.
  const body = tip
    ? tip.body
    : score.hasData
    ? t('kids_analytics_pillar_tap_details')
    : t('kids_analytics_pillar_no_data')

  if (diffuse) {
    const Icon = config.icon
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          { paddingVertical: 16, borderTopWidth: 1, borderTopColor: dt.colors.line, opacity: pressed ? 0.65 : 1 },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <DiffuseBloomIcon color={palette.chip} size={30} intensity={0.45}>
            <Icon size={17} color={dt.colors.ink3} strokeWidth={1.5} />
          </DiffuseBloomIcon>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontFamily: diffuseFont.display, fontSize: 18, color: dt.colors.ink }}>{config.label}</Text>
              {score.hasData && score.trend !== 0 && (
                <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 0.5, color: score.trend > 0 ? dt.colors.success : dt.colors.error }}>
                  {score.trend > 0 ? '↑' : '↓'}{Math.abs(score.trend)}%
                </Text>
              )}
            </View>
            {/* thin hairline progress */}
            <View style={{ height: 2, borderRadius: 999, backgroundColor: dt.colors.line, marginTop: 8, overflow: 'hidden' }}>
              <View style={{ width: `${pct}%`, height: 2, borderRadius: 999, backgroundColor: dt.colors.ink3 }} />
            </View>
          </View>
          {score.hasData && Number.isFinite(score.value) ? (
            <Text style={{ fontFamily: diffuseFont.display, fontSize: 26, color: dt.colors.ink }}>
              {score.value.toFixed(1)}
              <Text style={{ fontFamily: diffuseFont.mono, fontSize: 11, color: dt.colors.ink3 }}>{' /10'}</Text>
            </Text>
          ) : (
            <Text style={{ fontFamily: diffuseFont.mono, fontSize: 13, color: dt.colors.ink3 }}>{'—'}</Text>
          )}
        </View>
        {tip && (
          <Text style={{ fontFamily: diffuseFont.bodySemiBold, fontSize: 13, color: dt.colors.ink, marginTop: 10 }} numberOfLines={1}>{tip.title}</Text>
        )}
        <Text style={{ fontFamily: diffuseFont.body, fontSize: 13, lineHeight: 19, color: dt.colors.ink2, marginTop: tip ? 3 : 10 }} numberOfLines={3}>{body}</Text>
      </Pressable>
    )
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pillarPaper,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.92 },
      ]}
    >
      <View style={styles.pillarPaperHead}>
        <View
          style={[
            styles.pillarStickerChip,
            { backgroundColor: palette.tint, borderColor: colors.border },
          ]}
        >
          {renderPillarSticker(stickerForPillar(pillarKey), palette.chip, 26)}
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.pillarPaperTitleRow}>
            <Text
              style={[
                styles.pillarPaperName,
                { color: colors.text, fontFamily: font.display },
              ]}
            >
              {config.label}
            </Text>
            {score.hasData && score.trend !== 0 && (
              <View style={styles.trendBadge}>
                {score.trend > 0
                  ? <ArrowUpRight size={12} color={brand.success} strokeWidth={2.5} />
                  : <ArrowDownRight size={12} color={brand.error} strokeWidth={2.5} />}
                <Text
                  style={[
                    styles.trendText,
                    { color: score.trend > 0 ? brand.success : brand.error },
                  ]}
                >
                  {Math.abs(score.trend)}%
                </Text>
              </View>
            )}
          </View>

          <View
            style={[
              styles.pillarPaperBarBg,
              { backgroundColor: palette.tint },
            ]}
          >
            <View
              style={[
                styles.pillarPaperBarFill,
                { width: `${pct}%`, backgroundColor: palette.bar },
              ]}
            />
          </View>
        </View>

        <View style={styles.pillarPaperScore}>
          {score.hasData && Number.isFinite(score.value) ? (
            <>
              <Text
                style={[
                  styles.pillarPaperValue,
                  { color: colors.text, fontFamily: font.display },
                ]}
              >
                {score.value.toFixed(1)}
              </Text>
              <Text style={[styles.pillarPaperOf, { color: colors.textMuted }]}>
                /10
              </Text>
            </>
          ) : (
            <Text style={[styles.pillarPaperOf, { color: colors.textMuted }]}>
              {'—'}
            </Text>
          )}
        </View>
      </View>

      {/* Integrated tip body — replaces the old "Health Tips" cards. */}
      {tip && (
        <Text
          style={[
            styles.pillarPaperTipTitle,
            { color: colors.text, fontFamily: font.bodySemiBold },
          ]}
          numberOfLines={1}
        >
          {tip.title}
        </Text>
      )}
      <Text
        style={[
          styles.pillarPaperBody,
          { color: colors.textSecondary, fontFamily: font.body },
        ]}
        numberOfLines={3}
      >
        {body}
      </Text>

      <View style={styles.pillarPaperFooter}>
        <Text
          style={[
            styles.pillarPaperFooterText,
            { color: palette.bar, fontFamily: font.bodySemiBold },
          ]}
        >
          {t('kids_analytics_tip_tap_details')}
        </Text>
        <ChevronRight size={14} color={palette.bar} strokeWidth={2.5} />
      </View>
    </Pressable>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PILLAR DETAIL MODAL — slide-up bottom sheet
// ═══════════════════════════════════════════════════════════════════════════════

function PillarDetailModal({
  visible, pillarKey, analytics, chartW, childName, ageMonths, onClose, onFullScreen,
}: {
  visible: boolean
  pillarKey: PillarKey | null
  analytics: AnalyticsData
  chartW: number
  childName: string
  ageMonths: number
  onClose: () => void
  onFullScreen: (id: string) => void
}) {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const insets = useSafeAreaInsets()
  if (!pillarKey) return null
  const config = PILLAR_CONFIG[pillarKey]
  const score = analytics.scores[pillarKey]
  const palette = pillarPalette(pillarKey, stickers)

  const sheetH = SCREEN_H * 0.87

  if (diffuse) {
    return (
      <DiffuseSheet
        visible={visible}
        title={config.label}
        chip={score.hasData ? `${score.value.toFixed(1)}/10` : undefined}
        onClose={onClose}
      >
        <PillarDetail
          pillarKey={pillarKey}
          analytics={analytics}
          chartW={chartW}
          onFullScreen={onFullScreen}
          childName={childName}
          ageMonths={ageMonths}
        />
      </DiffuseSheet>
    )
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        {/* Backdrop tap closes modal */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        {/* Sheet — fixed height so ScrollView flex:1 works */}
        <View style={[styles.modalSheet, { height: sheetH, backgroundColor: colors.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32 }]}>
          {/* Handle bar */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>

          {/* Header — matches kids-analytics-screen.jsx mockup */}
          <View style={[styles.modalHeader, { paddingBottom: 14 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 999,
                  backgroundColor: palette.tint,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {renderPillarSticker(stickerForPillar(pillarKey), palette.chip, 22)}
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontFamily: font.display,
                    fontSize: 26,
                    letterSpacing: -0.5,
                    lineHeight: 30,
                  }}
                >
                  {config.label}
                </Text>
                {score.hasData && (
                  <Text
                    style={{
                      color: PILLAR_CONFIG[pillarKey].color,
                      fontSize: 13,
                      fontFamily: font.bodyMedium,
                      marginTop: 2,
                    }}
                  >
                    {score.value.toFixed(1)}{'/10 — '}{score.label}
                  </Text>
                )}
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={[styles.modalClose, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, width: 32, height: 32, borderRadius: 16 }]}>
              <X size={14} color={colors.text} strokeWidth={2} />
            </Pressable>
          </View>

          {/* Scrollable content — flex:1 fills the remaining sheet height */}
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: insets.bottom + 24, gap: 16 }}
          >
            <Animated.View entering={FadeInDown.duration(220)}>
              <PillarDetail
                pillarKey={pillarKey}
                analytics={analytics}
                chartW={chartW}
                onFullScreen={onFullScreen}
                childName={childName}
                ageMonths={ageMonths}
              />
            </Animated.View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVITY SECTION — age-appropriate targets, no score yet
// ═══════════════════════════════════════════════════════════════════════════════

function ActivitySection({ ageMonths, childName }: { ageMonths: number; childName: string }) {
  const { colors, radius } = useTheme()
  const { t } = useTranslation()
  const [showModal, setShowModal] = useState(false)
  const ACTIVITY_COLOR = PILLAR_CONFIG.activity.color

  const target = ageMonths < 12
    ? '20–30 min tummy time & floor play daily'
    : ageMonths < 36
    ? '180 min of light active play spread throughout the day'
    : '60 min of moderate-to-vigorous physical activity daily'

  const tip = ageMonths < 12
    ? 'At this age, tummy time builds neck, shoulder, and core strength — the foundation for crawling and walking.'
    : ageMonths < 36
    ? 'Unstructured active play (climbing, running, dancing) is best. Limit screen time to build movement habits early.'
    : 'Outdoor play, swimming, dancing, or active games all count. Limit sitting time to under 1 hour at a stretch.'

  return (
    <>
      <Pressable
        style={({ pressed }) => [
          styles.pillarRow,
          { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border },
          pressed && { opacity: 0.85 },
        ]}
        onPress={() => setShowModal(true)}
      >
        <View style={[styles.pillarIcon, { backgroundColor: ACTIVITY_COLOR + '15' }]}>
          <Zap size={20} color={ACTIVITY_COLOR} strokeWidth={2} />
        </View>
        <View style={styles.pillarInfo}>
          <Text style={[styles.pillarName, { color: colors.text }]}>{t('kids_analytics_pillar_activity')}</Text>
          <Text style={[styles.pillarTakeaway, { color: colors.textMuted }]} numberOfLines={2}>{target}</Text>
          <Text style={[{ fontSize: 11, fontWeight: '500', fontFamily: font.bodyMedium, color: colors.textMuted, marginTop: 2 }]} numberOfLines={2}>{tip}</Text>
        </View>
        <ChevronRight size={18} color={colors.textMuted} />
      </Pressable>

      <ActivityModal
        visible={showModal}
        ageMonths={ageMonths}
        childName={childName}
        onClose={() => setShowModal(false)}
      />
    </>
  )
}

function ActivityModal({
  visible, ageMonths, childName, onClose,
}: {
  visible: boolean
  ageMonths: number
  childName: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const ACTIVITY_COLOR = PILLAR_CONFIG.activity.color

  interface ActivityItem { rank: number; label: string; pct: number; emoji: string; tip: string }

  const activities: ActivityItem[] = ageMonths < 12
    ? [
        { rank: 1, label: 'Tummy time', pct: 35, emoji: '👶', tip: 'Builds neck, shoulder, and core strength for crawling' },
        { rank: 2, label: 'Floor play', pct: 30, emoji: '🧸', tip: 'Reaching, grasping, rolling — motor development' },
        { rank: 3, label: 'Movement & carrying', pct: 20, emoji: '🚶', tip: 'Supported sitting, bouncing, gentle movement' },
        { rank: 4, label: 'Rest & sleep', pct: 15, emoji: '😴', tip: 'Essential for brain development at this age' },
      ]
    : ageMonths < 36
    ? [
        { rank: 1, label: 'Active free play', pct: 40, emoji: '🏃', tip: 'Climbing, running, dancing — unstructured is best' },
        { rank: 2, label: 'Outdoor time', pct: 30, emoji: '🌳', tip: 'Fresh air, nature exploration, sensory play' },
        { rank: 3, label: 'Structured play', pct: 20, emoji: '🧩', tip: 'Puzzles, building, role-play — cognitive growth' },
        { rank: 4, label: 'Quiet rest', pct: 10, emoji: '📖', tip: 'Story time, calm activities between active sessions' },
      ]
    : [
        { rank: 1, label: 'Physical activity', pct: 40, emoji: '⚽', tip: 'Running, jumping, sports — at least 60 min/day' },
        { rank: 2, label: 'Outdoor play', pct: 25, emoji: '🌳', tip: 'Parks, nature, free exploration' },
        { rank: 3, label: 'Creative play', pct: 20, emoji: '🎨', tip: 'Art, building, imaginative games' },
        { rank: 4, label: 'Structured learning', pct: 15, emoji: '📚', tip: 'Reading, puzzles, educational activities' },
      ]

  const sheetH = SCREEN_H * 0.75

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={[styles.modalSheet, { height: sheetH, backgroundColor: colors.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32 }]}>
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>

          <View style={[styles.modalHeader, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingBottom: 16 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: ACTIVITY_COLOR + '20', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={20} color={ACTIVITY_COLOR} strokeWidth={2} />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{t('kids_analytics_activity_guide_title')}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '500', fontFamily: font.bodyMedium }}>
                  {childName}{' · recommended split'}
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={[styles.modalClose, { backgroundColor: colors.surfaceRaised }]}>
              <X size={18} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: insets.bottom + 20, gap: 12 }}
          >
            {activities.map((item) => (
              <View
                key={item.rank}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderRadius: radius.xl, padding: 16, borderWidth: 1, borderColor: colors.border }}
              >
                <EmojiSticker size={26}>{item.emoji}</EmojiSticker>
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', fontFamily: font.bodySemiBold }}>{item.label}</Text>
                    <Text style={{ color: ACTIVITY_COLOR, fontSize: 18, fontWeight: '900', fontFamily: font.display }}>{item.pct}%</Text>
                  </View>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: ACTIVITY_COLOR + '15', overflow: 'hidden' }}>
                    <View style={{ width: `${item.pct}%`, height: '100%', backgroundColor: ACTIVITY_COLOR + 'CC', borderRadius: 3 }} />
                  </View>
                  <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '500', fontFamily: font.bodyMedium }}>{item.tip}</Text>
                </View>
              </View>
            ))}

            <View style={{ backgroundColor: ACTIVITY_COLOR + '10', borderRadius: radius.xl, padding: 16, borderWidth: 1, borderColor: ACTIVITY_COLOR + '25', flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <EmojiSticker size={18}>{'💡'}</EmojiSticker>
              <Text style={{ flex: 1, color: ACTIVITY_COLOR, fontSize: 13, fontWeight: '700', fontFamily: font.bodySemiBold }}>
                {ageMonths < 12
                  ? 'Aim for 20–30 min tummy time daily, spread across sessions.'
                  : ageMonths < 36
                  ? 'WHO recommends 180 min of activity/day for toddlers, spread throughout.'
                  : 'WHO recommends 60 min of moderate-to-vigorous activity daily for children 3+.'}
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCORE MATH BREAKDOWN — shows the step-by-step formula & numbers per pillar
// ═══════════════════════════════════════════════════════════════════════════════

interface MathStep {
  label: string      // "Quality" / "Consistency bonus"
  formula: string    // "(good × 10 + little × 5) / meals"
  value: string      // "7.5"
}

// The kids-analytics-screen.jsx mockup deliberately omits a step-by-step
// score-math card — the modal flow is header → tiles → "How this score works"
// → body charts. We render nothing here so the data hooks/conditionals upstream
// stay valid without surfacing a calculation table that's not in the design.
/**
 * Score-math breakdown card — currently a no-op placeholder.
 *
 * Renders nothing today. The 8 call sites compute the steps/final values
 * because the math is also useful for the surrounding "explain" copy and
 * because the wiring is ready for when this card is brought back.
 *
 * If the card is determined to be permanently scrapped (rather than just
 * hidden), the 8 call sites + their IIFE wrappers can be removed in a
 * dedicated cleanup commit. Leaving them in place for now keeps the
 * scoring math visible alongside the user-facing copy.
 */
function ScoreMathCard(_props: {
  title: string
  steps: MathStep[]
  final: { label: string; value: string }
  color: string
}) {
  return null
}

// ═══════════════════════════════════════════════════════════════════════════════
// PILLAR DETAIL — charts with day detail strip
// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════

function PillarDetail({ pillarKey, analytics, chartW, onFullScreen, childName, ageMonths }: {
  pillarKey: PillarKey
  analytics: AnalyticsData
  chartW: number
  onFullScreen: (id: string) => void
  childName: string
  ageMonths: number
}) {
  const { colors, radius } = useTheme()
  const { t } = useTranslation()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()

  // Diffuse "explanation" block — hairline top rule, mono eyebrow, sans body.
  // Under the flag-off path we keep the paper card so behavior is unchanged.
  const explainCardStyle = diffuse
    ? { borderTopWidth: 1, borderTopColor: dt.colors.line, paddingTop: 16, marginTop: 4, gap: 8 } as const
    : { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, gap: 8, borderWidth: 1, borderColor: colors.border } as const
  const cardStyle = diffuse
    ? { borderTopWidth: 1, borderTopColor: dt.colors.line, paddingTop: 16, marginTop: 4 } as const
    : { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border } as const
  const helpCapsColor = diffuse ? dt.colors.ink3 : colors.text
  const explainColor = diffuse ? dt.colors.ink2 : colors.textSecondary
  const chartTitleColor = diffuse ? dt.colors.ink : colors.text

  switch (pillarKey) {
    case 'nutrition': {
      const nutr = analytics.nutrition
      const mode = nutr.mode
      const totalMeals = nutr.mealFrequency.reduce((a, b) => a + b, 0)
      const windowDays = Math.max(1, nutr.mealFrequency.length)
      const daysLogged = nutr.mealFrequency.filter((m) => m > 0).length
      const avgPerDay = daysLogged > 0 ? (totalMeals / daysLogged).toFixed(1) : '—'
      const score = analytics.scores.nutrition
      const variety = nutr.topFoods.length

      const totalBreast = nutr.breastSessions.reduce((a, b) => a + b, 0)
      const totalBottle = nutr.bottleSessions.reduce((a, b) => a + b, 0)
      const totalBottleMl = nutr.bottleMlPerDay.reduce((a, b) => a + b, 0)

      const totalGood = nutr.eatQuality.good.reduce((a, b) => a + b, 0)
      const totalLittle = nutr.eatQuality.little.reduce((a, b) => a + b, 0)
      const totalNone = nutr.eatQuality.none.reduce((a, b) => a + b, 0)
      const pctGood = totalMeals > 0 ? Math.round((totalGood / totalMeals) * 100) : 0
      const pctLittle = totalMeals > 0 ? Math.round((totalLittle / totalMeals) * 100) : 0
      const pctNone = totalMeals > 0 ? Math.round((totalNone / totalMeals) * 100) : 0

      // Mode-specific stat pills + explainer + math card.
      const isMilkPhase = mode === 'milk'
      const isMixedPhase = mode === 'mixed'

      return nutr.hasData ? (
        <View style={styles.detailBody}>
          {/* Summary stats — differ by age mode */}
          <View style={[styles.statRow]}>
            {isMilkPhase ? (
              <>
                <StatPill label="Avg feeds/day" value={avgPerDay} color={PILLAR_CONFIG.nutrition.color} />
                <StatPill label="Breast sessions" value={`${totalBreast}`} color={brand.secondary} />
                <StatPill
                  label="Bottle total"
                  value={totalBottleMl > 0 ? `${Math.round(totalBottleMl)}ml` : `${totalBottle}×`}
                  color={brand.accent}
                />
              </>
            ) : isMixedPhase ? (
              <>
                <StatPill label="Avg feeds/day" value={avgPerDay} color={PILLAR_CONFIG.nutrition.color} />
                <StatPill label="Milk feeds" value={`${totalBreast + totalBottle}`} color={brand.secondary} />
                <StatPill label="Foods tried" value={`${variety}`} color={brand.accent} />
              </>
            ) : (
              <>
                <StatPill label="Ate well" value={`${pctGood}%`} color={brand.success} />
                <StatPill label="Avg meals/day" value={avgPerDay} color={PILLAR_CONFIG.nutrition.color} />
                <StatPill label="Foods variety" value={`${variety}`} color={brand.secondary} />
              </>
            )}
          </View>

          {/* Explanation — different copy per mode */}
          <View style={[explainCardStyle]}>
            <Text style={[styles.helpCardCaps, { color: helpCapsColor, fontFamily: diffuse ? diffuseFont.mono : font.display }]}>{t('kids_analytics_how_score_works')}</Text>
            {isMilkPhase ? (
              <>
                <Text style={[styles.detailExplain, { color: explainColor, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
                  {`At ${getAgeLabel(ageMonths)}, ${childName} is on milk feeds only. Score reflects feed frequency vs the age target of ${nutr.feedTarget} feeds/day, and how consistently you're logging.`}
                </Text>
                <Text style={[styles.detailExplain, { color: explainColor, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
                  {`${totalBreast} breast session${totalBreast !== 1 ? 's' : ''} · ${totalBottle} bottle${totalBottle !== 1 ? 's' : ''}${totalBottleMl > 0 ? ` (${Math.round(totalBottleMl)}ml total)` : ''} logged across ${daysLogged} of ${windowDays} days.`}
                </Text>
                {daysLogged < Math.min(5, windowDays) && (
                  <Text style={[styles.detailExplain, { color: brand.accent }]}>
                    {t('kids_analytics_log_every_feed_hint')}
                  </Text>
                )}
              </>
            ) : isMixedPhase ? (
              <>
                <Text style={[styles.detailExplain, { color: explainColor, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
                  {`At ${getAgeLabel(ageMonths)}, ${childName} is transitioning to solids. Score = milk feed frequency (60%) + solid-food variety (40%).`}
                </Text>
                <Text style={[styles.detailExplain, { color: explainColor, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
                  {`${totalBreast + totalBottle} milk feed${totalBreast + totalBottle !== 1 ? 's' : ''}, ${variety} unique solid food${variety !== 1 ? 's' : ''} tried this window.`}
                </Text>
                {variety < 3 && (
                  <Text style={[styles.detailExplain, { color: brand.accent }]}>
                    {`Aim for 3+ distinct first foods per week — variety builds a safer, broader palate.`}
                  </Text>
                )}
              </>
            ) : (
              <>
                <Text style={[styles.detailExplain, { color: explainColor, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
                  {`${pctGood}% of ${totalMeals} meals this week were eaten well. ${pctLittle > 0 ? `${pctLittle}% were eaten partially. ` : ''}${pctNone > 0 ? `${pctNone}% were refused. ` : ''}${daysLogged < windowDays ? `Only ${daysLogged} of ${windowDays} days logged — consistent logging improves accuracy.` : 'Great logging consistency!'}`}
                </Text>
                {variety < 5 && (
                  <Text style={[styles.detailExplain, { color: brand.accent }]}>
                    {`${variety} unique food${variety !== 1 ? 's' : ''} logged. Aim for 5+ different foods to boost the variety bonus.`}
                  </Text>
                )}
              </>
            )}
            {score.trend !== 0 && (
              <Text style={[styles.detailExplain, { color: score.trend > 0 ? brand.success : brand.error }]}>
                {`Nutrition ${score.trend > 0 ? '↑ improving' : '↓ declining'} ${Math.abs(score.trend)}% vs the start of the window.`}
              </Text>
            )}
          </View>

          {/* Math breakdown — branches on mode */}
          {(() => {
            const avgFeedsLogged = daysLogged > 0 ? totalMeals / daysLogged : 0

            if (isMilkPhase) {
              const freqRatio = Math.min(avgFeedsLogged / Math.max(1, nutr.feedTarget), 1.2)
              const freqScore = Math.min(freqRatio / 1.2, 1) * 8
              const consistencyBonus = Math.min(daysLogged / windowDays, 1) * 2
              return (
                <ScoreMathCard
                  title={`Nutrition · ${Number.isFinite(score.value) ? score.value.toFixed(1) : '—'}/10`}
                  color={PILLAR_CONFIG.nutrition.color}
                  steps={[
                    {
                      label: 'Feed frequency',
                      formula: `${avgFeedsLogged.toFixed(1)} feeds/day ÷ target ${nutr.feedTarget} × 8`,
                      value: freqScore.toFixed(1),
                    },
                    {
                      label: 'Consistency bonus',
                      formula: `min(${daysLogged} / ${windowDays} days, 1) × 2`,
                      value: `+${consistencyBonus.toFixed(1)}`,
                    },
                  ]}
                  final={{
                    label: 'Score = min(sum, 10)',
                    value: Number.isFinite(score.value) ? score.value.toFixed(1) : '—',
                  }}
                />
              )
            }

            if (isMixedPhase) {
              const freqRatio = Math.min(avgFeedsLogged / Math.max(1, nutr.feedTarget), 1)
              const freqScore = freqRatio * 10
              const varietyScore = Math.min(variety / 3, 1) * 10
              return (
                <ScoreMathCard
                  title={`Nutrition · ${Number.isFinite(score.value) ? score.value.toFixed(1) : '—'}/10`}
                  color={PILLAR_CONFIG.nutrition.color}
                  steps={[
                    {
                      label: 'Feed frequency (×0.6)',
                      formula: `${avgFeedsLogged.toFixed(1)} feeds/day ÷ target ${nutr.feedTarget}`,
                      value: (freqScore * 0.6).toFixed(1),
                    },
                    {
                      label: 'Solid variety (×0.4)',
                      formula: `min(${variety} foods / 3, 1) × 10`,
                      value: (varietyScore * 0.4).toFixed(1),
                    },
                  ]}
                  final={{
                    label: 'Score = weighted sum',
                    value: Number.isFinite(score.value) ? score.value.toFixed(1) : '—',
                  }}
                />
              )
            }

            // Solids phase (12+)
            const qualityScore = totalMeals > 0 ? (totalGood * 10 + totalLittle * 5) / totalMeals : 0
            const freqBonus = Math.min(daysLogged / windowDays, 1) * 1.5
            const varietyBonus = Math.min(variety / 5, 1) * 1.0
            return (
              <ScoreMathCard
                title={`Nutrition · ${Number.isFinite(score.value) ? score.value.toFixed(1) : '—'}/10`}
                color={PILLAR_CONFIG.nutrition.color}
                steps={[
                  {
                    label: 'Quality',
                    formula: `(${totalGood} × 10 + ${totalLittle} × 5) ÷ ${totalMeals} meals`,
                    value: qualityScore.toFixed(1),
                  },
                  {
                    label: 'Frequency bonus',
                    formula: `min(${daysLogged} / ${windowDays} days, 1) × 1.5`,
                    value: `+${freqBonus.toFixed(1)}`,
                  },
                  {
                    label: 'Variety bonus',
                    formula: `min(${variety} foods / 5, 1) × 1.0`,
                    value: `+${varietyBonus.toFixed(1)}`,
                  },
                ]}
                final={{
                  label: 'Score = min(sum, 10)',
                  value: Number.isFinite(score.value) ? score.value.toFixed(1) : '—',
                }}
              />
            )
          })()}
          {/* Mode-specific charts */}
          {isMilkPhase && (
            <ChartCard title="Feeds per Day" onExpand={() => onFullScreen('meal_freq')}>
              <MealsLineChart
                data={analytics.nutrition.mealFrequency}
                labels={analytics.nutrition.weekLabels}
                width={chartW}
              />
            </ChartCard>
          )}

          {isMilkPhase && (totalBreast > 0 || totalBottle > 0) && (
            <View style={[styles.card, diffuse ? cardStyle : { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
              <Text style={[styles.chartTitle, { color: chartTitleColor, fontFamily: diffuse ? diffuseFont.display : font.display }]}>{t('kids_home_feeding_modal_breast_vs_bottle')}</Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
                <View style={{ flex: 1, alignItems: 'center', padding: 16, backgroundColor: colors.surfaceRaised, borderRadius: radius.lg }}>
                  <Text style={{ color: PILLAR_CONFIG.nutrition.color, fontSize: 28, fontFamily: font.display }}>{totalBreast}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, fontFamily: font.bodyMedium, marginTop: 4 }}>{t('kids_analytics_breast_sessions')}</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'center', padding: 16, backgroundColor: colors.surfaceRaised, borderRadius: radius.lg }}>
                  <Text style={{ color: brand.secondary, fontSize: 28, fontFamily: font.display }}>{totalBottle}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, fontFamily: font.bodyMedium, marginTop: 4 }}>
                    {totalBottleMl > 0 ? `${Math.round(totalBottleMl)}ml total` : 'bottles'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {!isMilkPhase && (
            <ChartCard title="Weekly Eat Quality" onExpand={() => onFullScreen('eat_quality')}>
              <EatQualityBubbles
                good={analytics.nutrition.eatQuality.good}
                little={analytics.nutrition.eatQuality.little}
                none={analytics.nutrition.eatQuality.none}
              />
            </ChartCard>
          )}
          {!isMilkPhase && (
            <ChartCard title="Meals per Day" onExpand={() => onFullScreen('meal_freq')}>
              <MealsLineChart
                data={analytics.nutrition.mealFrequency}
                labels={analytics.nutrition.weekLabels}
                width={chartW}
              />
            </ChartCard>
          )}
          {!isMilkPhase && analytics.nutrition.topFoods.length > 0 && (
            <View style={[styles.card, diffuse ? cardStyle : { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
              <Text style={[styles.chartTitle, { color: chartTitleColor, fontFamily: diffuse ? diffuseFont.display : font.display }]}>{t('kids_analytics_most_logged_foods')}</Text>
              <View style={{ gap: 0 }}>
                {analytics.nutrition.topFoods.map((food, i) => (
                  <View
                    key={i}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 14,
                      paddingVertical: 12,
                      borderBottomWidth: i < analytics.nutrition.topFoods.length - 1 ? StyleSheet.hairlineWidth : 0,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: rankColor(i) + '25', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: rankColor(i), fontSize: 12, fontWeight: '900', fontFamily: font.display }}>#{i + 1}</Text>
                    </View>
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', fontFamily: font.bodySemiBold, flex: 1 }}>{food.label}</Text>
                    <View style={{ backgroundColor: PILLAR_CONFIG.nutrition.color + '20', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 }}>
                      <Text style={{ color: PILLAR_CONFIG.nutrition.color, fontSize: 14, fontWeight: '800', fontFamily: font.display }}>{t('kids_analytics_times_prefix', { count: food.count })}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      ) : <EmptyDetail pillar="nutrition" />
    }

    case 'sleep': {
      const target = getAgeSleepTarget(ageMonths)
      const avg = analytics.sleep.avgHours
      const deficit = target - avg
      const daysOnTarget = analytics.sleep.dailyHours.filter((h) => h > 0 && h >= target).length
      const daysLogged = analytics.sleep.dailyHours.filter((h) => h > 0).length
      const totalSessions = analytics.sleep.qualityCounts.great + analytics.sleep.qualityCounts.good + analytics.sleep.qualityCounts.restless + analytics.sleep.qualityCounts.poor
      const pctGoodSleep = totalSessions > 0
        ? Math.round(((analytics.sleep.qualityCounts.great + analytics.sleep.qualityCounts.good) / totalSessions) * 100)
        : 0
      const sleepScore = analytics.scores.sleep

      return analytics.sleep.hasData ? (
        <View style={styles.detailBody}>
          {/* Stats at top */}
          <View style={[styles.statRow]}>
            <StatPill label="Avg/night" value={`${avg.toFixed(1)}h`} color={PILLAR_CONFIG.sleep.color} />
            <StatPill label="Quality" value={getBestQuality(analytics.sleep.qualityCounts)} color={brand.success} />
            <StatPill label="Target" value={`${target}h`} color={colors.textMuted} />
          </View>

          {/* Explanation */}
          <View style={[explainCardStyle]}>
            <Text style={[styles.helpCardCaps, { color: helpCapsColor, fontFamily: diffuse ? diffuseFont.mono : font.display }]}>{t('kids_analytics_how_score_works')}</Text>
            <Text style={[styles.detailExplain, { color: explainColor, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
              {`${childName} averaged ${avg.toFixed(1)}h/night across ${daysLogged} logged days. The target for ${getAgeLabel(ageMonths)} is ${target}h including naps. `}
              {deficit > 0.5
                ? `That's a ${deficit.toFixed(1)}h nightly deficit — consistent early bedtimes and a wind-down routine can help close this gap.`
                : `${childName} is meeting the sleep target!`}
            </Text>
            {daysOnTarget > 0 && (
              <Text style={[styles.detailExplain, { color: brand.success }]}>
                {`${daysOnTarget} of ${daysLogged} logged nights hit the ${target}h target.`}
              </Text>
            )}
            {sleepScore.trend !== 0 && (
              <Text style={[styles.detailExplain, { color: sleepScore.trend > 0 ? brand.success : brand.error }]}>
                {`Sleep ${sleepScore.trend > 0 ? '↑ improving' : '↓ declining'} ${Math.abs(sleepScore.trend)}% vs the start of the window.`}
              </Text>
            )}
            {daysLogged < 5 && (
              <Text style={[styles.detailExplain, { color: brand.accent }]}>
                {`Only ${daysLogged} days logged — log sleep daily for a more accurate score.`}
              </Text>
            )}
          </View>

          {(() => {
            const qc = analytics.sleep.qualityCounts
            const totalQ = qc.great + qc.good + qc.restless + qc.poor
            const qualityScore = totalQ > 0
              ? (qc.great * 10 + qc.good * 7.5 + qc.restless * 4 + qc.poor * 1) / totalQ
              : 0
            const windowDays = Math.max(1, analytics.sleep.dailyHours.length)
            const daysWithSleep = analytics.sleep.dailyHours.filter((h) => h > 0).length
            const consistencyBonus = Math.min(daysWithSleep / windowDays, 1) * 1.5
            return (
              <ScoreMathCard
                title={`Sleep · ${Number.isFinite(sleepScore.value) ? sleepScore.value.toFixed(1) : '—'}/10`}
                color={PILLAR_CONFIG.sleep.color}
                steps={[
                  {
                    label: 'Quality',
                    formula: `(great·10 + good·7.5 + restless·4 + poor·1) ÷ ${totalQ} sessions`,
                    value: qualityScore.toFixed(1),
                  },
                  {
                    label: 'Quality × 0.85',
                    formula: 'weighting to leave room for the consistency bonus',
                    value: (qualityScore * 0.85).toFixed(1),
                  },
                  {
                    label: 'Consistency bonus',
                    formula: `min(${daysWithSleep} / ${windowDays} days, 1) × 1.5`,
                    value: `+${consistencyBonus.toFixed(1)}`,
                  },
                ]}
                final={{
                  label: 'Score = min(sum, 10)',
                  value: Number.isFinite(sleepScore.value) ? sleepScore.value.toFixed(1) : '—',
                }}
              />
            )
          })()}

          {/* Highlighted bar chart */}
          <ChartCard title="Daily Sleep Hours" onExpand={() => onFullScreen('sleep_weekly')}>
            <HighlightBarChart
              data={analytics.sleep.dailyHours}
              labels={analytics.sleep.weekLabels}
              color={PILLAR_CONFIG.sleep.color}
              width={chartW}
              unit="h"
            />
          </ChartCard>

          {/* Sleep quality breakdown */}
          <ChartCard title="Sleep Quality Breakdown" onExpand={() => onFullScreen('sleep_quality')}>
            <SleepQualityChart counts={analytics.sleep.qualityCounts} />
          </ChartCard>
        </View>
      ) : <EmptyDetail pillar="sleep" />
    }

    case 'mood': {
      const moodWeights: Record<string, number> = { happy: 10, calm: 9, energetic: 8, fussy: 3, cranky: 1 }
      const totalMoods = analytics.mood.dominantMoods.reduce((a, m) => a + m.count, 0)
      const moodScore = analytics.scores.mood
      return analytics.mood.hasData ? (
        <View style={styles.detailBody}>
          <View style={[explainCardStyle]}>
            <Text style={[styles.helpCardCaps, { color: helpCapsColor, fontFamily: diffuse ? diffuseFont.mono : font.display }]}>{t('kids_analytics_how_score_works')}</Text>
            <Text style={[styles.detailExplain, { color: explainColor, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
              {t('kids_analytics_mood_score_weights_hint')}
            </Text>
          </View>

          <ScoreMathCard
            title={`Mood · ${Number.isFinite(moodScore.value) ? moodScore.value.toFixed(1) : '—'}/10`}
            color={PILLAR_CONFIG.mood.color}
            steps={analytics.mood.dominantMoods.map((m) => ({
              label: `${m.mood} × ${m.count}`,
              formula: `weight ${moodWeights[m.mood] ?? 5} per log`,
              value: `${((moodWeights[m.mood] ?? 5) * m.count).toFixed(0)}`,
            })).concat([{
              label: 'Total logs',
              formula: 'sum of mood counts',
              value: String(totalMoods),
            }])}
            final={{
              label: 'Score = weighted sum ÷ total',
              value: Number.isFinite(moodScore.value) ? moodScore.value.toFixed(1) : '—',
            }}
          />

          <ChartCard title="Mood Distribution This Week" onExpand={() => onFullScreen('mood_dist')}>
            <MoodDistribution moods={analytics.mood.dominantMoods} />
          </ChartCard>
          <ChartCard title="Daily Mood Tracking" onExpand={() => onFullScreen('mood_daily')}>
            <MoodDailyChart dailyCounts={analytics.mood.dailyCounts} labels={analytics.mood.weekLabels} width={chartW} />
          </ChartCard>
        </View>
      ) : <EmptyDetail pillar="mood" />
    }

    case 'health': {
      const doneVaccines = analytics.health.vaccines.filter((v) => v.done).length
      const totalVaccines = analytics.health.vaccines.length
      const vaccinePct = totalVaccines > 0 ? Math.round((doneVaccines / totalVaccines) * 100) : 0
      const totalEvents = analytics.health.weeklyFrequency.reduce((a, b) => a + b, 0)

      // Group events by type
      const eventsByType: Record<string, typeof analytics.health.recentEvents> = {}
      for (const e of analytics.health.recentEvents) {
        if (!eventsByType[e.type]) eventsByType[e.type] = []
        eventsByType[e.type].push(e)
      }

      return (
        <View style={styles.detailBody}>
          {/* Summary card */}
          <View style={[styles.statRow]}>
            <StatPill label="Vaccines done" value={`${doneVaccines}/${totalVaccines}`} color={brand.success} />
            <StatPill label="Events this week" value={`${totalEvents}`} color={totalEvents === 0 ? brand.success : brand.accent} />
            <StatPill label="Completion" value={`${vaccinePct}%`} color={PILLAR_CONFIG.health.color} />
          </View>

          {/* Health score explanation */}
          <View style={[explainCardStyle]}>
            <Text style={[styles.helpCardCaps, { color: helpCapsColor, fontFamily: diffuse ? diffuseFont.mono : font.display }]}>{t('kids_analytics_how_score_works')}</Text>
            <Text style={[styles.detailExplain, { color: explainColor, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
              {`Health score = vaccine completion (60%) + low health incidents (40%). ${doneVaccines}/${totalVaccines} vaccines logged. ${totalEvents === 0 ? 'No health events this week — great!' : `${totalEvents} health event${totalEvents !== 1 ? 's' : ''} logged this week.`}`}
            </Text>
          </View>

          {analytics.scores.health.hasData && (() => {
            const healthScore = analytics.scores.health
            const vaccineScore = totalVaccines > 0 ? (doneVaccines / totalVaccines) * 10 : 5
            const eventPenalty = Math.min(totalEvents * 0.8, 5)
            const eventScore = Math.max(10 - eventPenalty, 2)
            return (
              <ScoreMathCard
                title={`Health · ${Number.isFinite(healthScore.value) ? healthScore.value.toFixed(1) : '—'}/10`}
                color={PILLAR_CONFIG.health.color}
                steps={[
                  {
                    label: 'Vaccine score (×0.6)',
                    formula: totalVaccines > 0
                      ? `${doneVaccines}/${totalVaccines} vaccines × 10 = ${vaccineScore.toFixed(1)}`
                      : 'no vaccines logged — default 5.0',
                    value: (vaccineScore * 0.6).toFixed(1),
                  },
                  {
                    label: 'Event score (×0.4)',
                    formula: `max(10 − ${totalEvents} events × 0.8, 2) = ${eventScore.toFixed(1)}`,
                    value: (eventScore * 0.4).toFixed(1),
                  },
                ]}
                final={{
                  label: 'Score = weighted sum',
                  value: Number.isFinite(healthScore.value) ? healthScore.value.toFixed(1) : '—',
                }}
              />
            )
          })()}

          {/* Recent events by type */}
          {analytics.health.hasData && analytics.health.recentEvents.length > 0 && (
            <View style={[styles.card, diffuse ? cardStyle : { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border }]}>
              <Text style={[styles.chartTitle, { color: chartTitleColor, marginBottom: 14, fontFamily: diffuse ? diffuseFont.display : font.display }]}>{t('kids_analytics_health_recent_events')}</Text>
              {Object.entries(eventsByType).map(([type, events]) => (
                <View key={type} style={{ marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <EmojiSticker size={14}>{getHealthEventEmoji(type)}</EmojiSticker>
                    <Text style={{ color: getEventColor(type), fontSize: 11, fontWeight: '600', fontFamily: font.bodySemiBold, letterSpacing: 1.4 }}>
                      {getHealthEventLabel(type).toUpperCase()}
                    </Text>
                  </View>
                  {events.map((e, i) => (
                    <View
                      key={i}
                      style={[styles.eventRow, { borderBottomColor: i < events.length - 1 ? colors.border : 'transparent' }]}
                    >
                      <View style={[styles.eventDot, { backgroundColor: getEventColor(type) }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.eventLabel, { color: colors.text }]} numberOfLines={1}>{e.label}</Text>
                        <Text style={[styles.eventDate, { color: colors.textMuted }]}>{e.date}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}

          {/* Weekly event frequency chart */}
          {analytics.health.hasData && (
            <ChartCard title="Health Events This Week" onExpand={() => onFullScreen('health_freq')}>
              <BarChart data={analytics.health.weeklyFrequency} labels={analytics.health.weekLabels} color={PILLAR_CONFIG.health.color} width={chartW} />
            </ChartCard>
          )}

          {/* Vaccine tracker */}
          <View style={[styles.card, diffuse ? cardStyle : { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border }]}>
            <View style={[styles.row, { marginBottom: 4 }]}>
              <Syringe size={18} color={PILLAR_CONFIG.health.color} strokeWidth={2} />
              <Text style={[styles.chartTitle, { color: chartTitleColor, marginBottom: 0, fontFamily: diffuse ? diffuseFont.display : font.display }]}>{t('kids_analytics_vaccine_tracker_title')}</Text>
            </View>
            {/* Progress bar */}
            <View style={{ height: 8, borderRadius: 999, marginTop: 12, marginBottom: 12, overflow: 'hidden', backgroundColor: brand.success + '22' }}>
              <View style={{ width: `${vaccinePct}%`, height: '100%', backgroundColor: brand.success, borderRadius: 999 }} />
            </View>
            <Text style={[styles.detailExplain, { color: colors.textSecondary, marginBottom: 14 }]}>
              {`${doneVaccines}/${totalVaccines} logged as completed`}
            </Text>
            <View style={styles.vaccineGrid}>
              {analytics.health.vaccines.map((v, i) => (
                <View
                  key={i}
                  style={[styles.vaccineChip, {
                    backgroundColor: v.done ? brand.success + '1A' : colors.surfaceRaised,
                    borderColor: v.done ? brand.success + '55' : colors.borderStrong,
                    borderRadius: radius.full,
                  }]}
                >
                  {v.done && <Shield size={14} color={brand.success} strokeWidth={2.5} />}
                  <Text style={[styles.vaccineText, { color: v.done ? brand.success : colors.textSecondary }]}>{v.name}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )
    }

    case 'growth':
      if (!analytics.growth.hasData) return <EmptyDetail pillar="growth" />
      return (
        <View style={styles.detailBody}>
          <Text style={[styles.detailExplain, { color: explainColor, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
            {t('kids_analytics_growth_track_hint', { name: childName })}
          </Text>

          {(() => {
            const growthScore = analytics.scores.growth
            const totalMeasurements = analytics.growth.weights.length + analytics.growth.heights.length
            const measureScore = Math.min(totalMeasurements / 4, 1) * 7
            const sevenDaysAgo = new Date()
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
            const recentDate = toDateStr(sevenDaysAgo)
            const hasRecent = analytics.growth.weights.some((w) => w.date >= recentDate)
              || analytics.growth.heights.some((h) => h.date >= recentDate)
            const recencyBonus = hasRecent ? 3 : 1
            return (
              <ScoreMathCard
                title={`Growth · ${Number.isFinite(growthScore.value) ? growthScore.value.toFixed(1) : '—'}/10`}
                color={PILLAR_CONFIG.growth.color}
                steps={[
                  {
                    label: 'Measurement score',
                    formula: `min(${totalMeasurements} logs / 4, 1) × 7`,
                    value: measureScore.toFixed(1),
                  },
                  {
                    label: 'Recency bonus',
                    formula: hasRecent ? 'logged in the last 7 days: +3' : 'no recent logs: +1',
                    value: `+${recencyBonus}`,
                  },
                ]}
                final={{
                  label: 'Score = min(sum, 10)',
                  value: Number.isFinite(growthScore.value) ? growthScore.value.toFixed(1) : '—',
                }}
              />
            )
          })()}

          {/* Latest measurements — always shown */}
          {(() => {
            const lastWeight = analytics.growth.weights[analytics.growth.weights.length - 1]
            const lastHeight = analytics.growth.heights[analytics.growth.heights.length - 1]
            if (!lastWeight && !lastHeight) return null
            return (
              <View style={[styles.statRow]}>
                {lastWeight && (
                  <StatPill
                    label={`Weight (${new Date(lastWeight.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`}
                    value={`${lastWeight.value}kg`}
                    color={PILLAR_CONFIG.health.color}
                  />
                )}
                {lastHeight && (
                  <StatPill
                    label={`Height (${new Date(lastHeight.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`}
                    value={`${lastHeight.value}cm`}
                    color={PILLAR_CONFIG.growth.color}
                  />
                )}
              </View>
            )
          })()}

          {/* Line charts when enough data */}
          {analytics.growth.weights.length >= 2 && (
            <ChartCard title="Weight over time (kg)" onExpand={() => onFullScreen('weight')}>
              <LineChart
                data={analytics.growth.weights.map((w) => w.value)}
                labels={analytics.growth.weights.map((w) => { const d = new Date(w.date); return `${d.getMonth() + 1}/${d.getDate()}` })}
                color={PILLAR_CONFIG.health.color}
                width={chartW}
                unit="kg"
                showAverage
              />
            </ChartCard>
          )}
          {analytics.growth.heights.length >= 2 && (
            <ChartCard title="Height over time (cm)" onExpand={() => onFullScreen('height')}>
              <LineChart
                data={analytics.growth.heights.map((h) => h.value)}
                labels={analytics.growth.heights.map((h) => { const d = new Date(h.date); return `${d.getMonth() + 1}/${d.getDate()}` })}
                color={PILLAR_CONFIG.growth.color}
                width={chartW}
                unit="cm"
                showAverage
              />
            </ChartCard>
          )}

          {analytics.growth.weights.length < 2 && analytics.growth.heights.length < 2 && (
            <View style={[styles.card, diffuse ? { ...cardStyle, alignItems: 'center', paddingVertical: 20 } : { backgroundColor: colors.surface, borderRadius: radius.xl, alignItems: 'center', paddingVertical: 20 }]}>
              <TrendingUp size={24} color={diffuse ? dt.colors.ink3 : colors.textMuted} strokeWidth={1.5} />
              <Text style={[styles.emptyText, { color: diffuse ? dt.colors.ink3 : colors.textMuted, marginTop: 8, fontFamily: diffuse ? diffuseFont.body : font.bodyMedium }]}>
                {t('kids_analytics_add_measurements_hint')}
              </Text>
            </View>
          )}
        </View>
      )

    case 'activity': {
      const act = analytics.activity
      const COLOR = PILLAR_CONFIG.activity.color
      const ageLabel = getAgeLabel(ageMonths)
      const weeklyTarget = ageMonths < 12
        ? '20–30 min tummy time & floor play daily'
        : ageMonths < 36
        ? '180 min of light active play daily'
        : '60 min of moderate-to-vigorous activity daily'

      const guideItems = ageMonths < 12
        ? [
            { emoji: '👶', label: 'Tummy time', pct: 35, tip: 'Builds neck, shoulder, and core strength for crawling' },
            { emoji: '🧸', label: 'Floor play',  pct: 30, tip: 'Reaching, grasping, rolling — motor development' },
            { emoji: '🚶', label: 'Movement & carrying', pct: 20, tip: 'Supported sitting, bouncing, gentle movement' },
            { emoji: '😴', label: 'Rest & sleep', pct: 15, tip: 'Essential for brain development at this age' },
          ]
        : ageMonths < 36
        ? [
            { emoji: '🏃', label: 'Active free play', pct: 40, tip: 'Climbing, running, dancing — unstructured is best' },
            { emoji: '🌳', label: 'Outdoor time',     pct: 30, tip: 'Fresh air, nature exploration, sensory play' },
            { emoji: '🧩', label: 'Structured play',  pct: 20, tip: 'Puzzles, building, role-play — cognitive growth' },
            { emoji: '📖', label: 'Quiet rest',        pct: 10, tip: 'Story time, calm activities between active sessions' },
          ]
        : [
            { emoji: '⚽', label: 'Physical activity',    pct: 40, tip: 'Running, jumping, sports — at least 60 min/day' },
            { emoji: '🌳', label: 'Outdoor play',         pct: 25, tip: 'Parks, nature, free exploration' },
            { emoji: '🎨', label: 'Creative play',        pct: 20, tip: 'Art, building, imaginative games' },
            { emoji: '📚', label: 'Structured learning',  pct: 15, tip: 'Reading, puzzles, educational activities' },
          ]

      return (
        <View style={styles.detailBody}>
          {/* Stats */}
          <View style={[styles.statRow]}>
            <StatPill label="Active days" value={act.hasData ? `${act.activeDays}/7` : '—'} color={COLOR} />
            <StatPill label="Sessions" value={act.hasData ? `${act.totalSessions}` : '—'} color={brand.secondary} />
            <StatPill label="Types" value={act.hasData ? `${act.uniqueTypes.length}` : '—'} color={brand.accent} />
          </View>

          {/* Explanation */}
          <View style={[explainCardStyle]}>
            <Text style={[styles.helpCardCaps, { color: helpCapsColor, fontFamily: diffuse ? diffuseFont.mono : font.display }]}>{t('kids_analytics_how_score_works')}</Text>
            <Text style={[styles.detailExplain, { color: explainColor, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
              {act.hasData
                ? `${childName} was active on ${act.activeDays} of ${act.dailySessions.length} days (${act.totalSessions} session${act.totalSessions !== 1 ? 's' : ''}, ${act.uniqueTypes.length} unique type${act.uniqueTypes.length !== 1 ? 's' : ''}).`
                : `No activity logs found. Log sessions from Calendar → Activity to track ${childName}'s movement.`}
            </Text>
            <Text style={[styles.detailExplain, { color: colors.textMuted }]}>
              {`Target for ${ageLabel}: ${weeklyTarget}`}
            </Text>
          </View>

          {act.hasData && (() => {
            const activityScore = analytics.scores.activity
            const windowDays = Math.max(1, act.dailySessions.length)
            const base = (act.activeDays / windowDays) * 9
            const varietyBonus = Math.min(act.uniqueTypes.length / 3, 1)
            return (
              <ScoreMathCard
                title={`Activity · ${Number.isFinite(activityScore.value) ? activityScore.value.toFixed(1) : '—'}/10`}
                color={COLOR}
                steps={[
                  {
                    label: 'Active-day rate',
                    formula: `${act.activeDays} / ${windowDays} days × 9`,
                    value: base.toFixed(1),
                  },
                  {
                    label: 'Variety bonus',
                    formula: `min(${act.uniqueTypes.length} types / 3, 1)`,
                    value: `+${varietyBonus.toFixed(1)}`,
                  },
                ]}
                final={{
                  label: 'Score = min(sum, 10)',
                  value: Number.isFinite(activityScore.value) ? activityScore.value.toFixed(1) : '—',
                }}
              />
            )
          })()}

          {/* Weekly sessions bar chart */}
          {act.hasData && (
            <ChartCard title="Activity Sessions This Week" onExpand={() => onFullScreen('activity_weekly')}>
              <HighlightBarChart
                data={act.dailySessions}
                labels={act.weekLabels}
                color={COLOR}
                width={chartW}
              />
            </ChartCard>
          )}

          {/* Age-appropriate guide — RecSplit pattern from the mockup */}
          <View style={[styles.card, diffuse ? { ...cardStyle, padding: 0 } : { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16 }]}>
            <Text style={[styles.chartTitle, { color: chartTitleColor, marginBottom: 6, fontFamily: diffuse ? diffuseFont.display : font.display }]}>{t('kids_analytics_activity_rec_split')}</Text>
            {guideItems.map((item) => (
              <View key={item.label} style={{ paddingVertical: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 12 }}>{item.emoji}</Text>
                  </View>
                  <Text style={{ flex: 1, color: colors.text, fontSize: 14, fontFamily: font.display, letterSpacing: -0.1 }}>
                    {item.label}
                  </Text>
                  <Text style={{ color: COLOR, fontSize: 16, fontFamily: font.display, letterSpacing: -0.3 }}>
                    {item.pct}%
                  </Text>
                </View>
                <View style={{ height: 6, borderRadius: 999, backgroundColor: colors.surfaceRaised, marginTop: 6, overflow: 'hidden' }}>
                  <View style={{ width: `${item.pct}%`, height: '100%', backgroundColor: COLOR }} />
                </View>
                <Text style={{ color: colors.textMuted, fontSize: 11, fontFamily: font.body, lineHeight: 14, marginTop: 4 }}>
                  {item.tip}
                </Text>
              </View>
            ))}
            <View style={{ backgroundColor: COLOR + '15', borderRadius: radius.md, padding: 12, marginTop: 8, borderWidth: 1, borderColor: COLOR + '30', flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 14, lineHeight: 16 }}>{'📋'}</Text>
              <Text style={{ color: COLOR, fontSize: 12, fontFamily: font.bodyMedium, flex: 1, lineHeight: 16 }}>
                {ageMonths < 12
                  ? 'Aim for 20–30 min tummy time daily, spread across sessions.'
                  : ageMonths < 36
                  ? 'WHO recommends 180 min of activity/day for toddlers, spread throughout.'
                  : 'WHO recommends 60 min of moderate-to-vigorous activity daily for children 3+.'}
              </Text>
            </View>
          </View>
        </View>
      )
    }

    default:
      return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// SHARED SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function ChildChip({ label, age, active, color, onPress }: { label: string; age: string; active: boolean; color: string; onPress: () => void }) {
  return <ChildPill label={label} age={age} active={active} color={color} onPress={onPress} />
}

function ChartCard({ title, children, onExpand }: { title: string; children: React.ReactNode; onExpand: () => void }) {
  const { colors, radius } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  if (diffuse) {
    return (
      <View style={{ borderTopWidth: 1, borderTopColor: dt.colors.line, paddingTop: 16, marginTop: 4 }}>
        <Pressable onPress={onExpand} style={styles.chartHeader}>
          <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: dt.colors.ink3 }}>{title}</Text>
          <ChevronRight size={16} color={dt.colors.ink3} strokeWidth={1.5} />
        </Pressable>
        <View style={styles.chartBody}>{children}</View>
      </View>
    )
  }
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16 }]}>
      <Pressable onPress={onExpand} style={styles.chartHeader}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>{title}</Text>
        <ChevronRight size={18} color={colors.textMuted} strokeWidth={1.75} />
      </Pressable>
      <View style={styles.chartBody}>{children}</View>
    </View>
  )
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  const { colors, radius } = useTheme()
  const diffuse = useIsDiffuse()
  if (diffuse) {
    return <DiffuseMetricTile value={value} label={label} />
  }
  return (
    <View style={[styles.statPill, {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
    }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  )
}

function EmptyDetail({ pillar }: { pillar: PillarKey }) {
  const { colors, radius } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const config = PILLAR_CONFIG[pillar]
  const Icon = config.icon
  const messages: Record<PillarKey, string> = {
    nutrition: 'No meals logged yet this week. Log feeding from the calendar to see nutrition trends.',
    sleep: 'No sleep entries yet. Log sleep from the calendar to track patterns.',
    mood: "No mood entries yet. Track your child's mood daily to see patterns.",
    health: 'No health events logged. Record temperatures, vaccines, and doctor visits here.',
    growth: 'No growth data yet. Log weight and height measurements to track development.',
    activity: 'No activities logged yet this week. Log sessions from the calendar to track movement.',
  }
  if (diffuse) {
    return (
      <DiffuseEmptyState
        icon={<DiffuseBloomIcon color={config.color} size={48} intensity={0.5}><Icon size={24} color={dt.colors.ink3} strokeWidth={1.4} /></DiffuseBloomIcon>}
        title={config.label}
        message={messages[pillar]}
      />
    )
  }
  return (
    <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border }]}>
      <Icon size={22} color={colors.textMuted} strokeWidth={1.75} />
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>{messages[pillar]}</Text>
    </View>
  )
}

// ─── Chart Sub-components ─────────────────────────────────────────────────────

function StackedBarChart({ good, little, none, labels, width = 300, height = 200 }: {
  good: number[]; little: number[]; none: number[]; labels: string[]; width?: number; height?: number
}) {
  const { colors, stickers: st } = useTheme()
  const { t } = useTranslation()
  const leftPad = 40, rightPad = 16, topPad = 28, bottomPad = 8
  const chartW = width - leftPad - rightPad
  const chartH = height - topPad - bottomPad
  const count = good.length
  const maxVal = Math.max(...good.map((g, i) => g + little[i] + none[i]), 1)

  // Empty state
  if (maxVal === 0 || count === 0) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={[styles.detailExplain, { color: colors.textMuted, textAlign: 'center' }]}>
          {t('kids_analytics_log_meals_eat_quality')}
        </Text>
      </View>
    )
  }

  const barW = Math.min(36, chartW / count - 10)
  const barR = Math.min(10, barW / 2.5)
  const ticks = [0, Math.round(maxVal / 2), maxVal]

  // Sticker palette: green=ate well, peach=a little, coral=didn't eat
  const colGood = st.green
  const colLittle = st.peach
  const colNone = st.coral

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={width} height={height}>
        {/* Grid lines + Y labels */}
        {ticks.map((tick, i) => {
          const y = topPad + chartH - (tick / maxVal) * chartH
          return (
            <G key={`grid-${i}`}>
              <Line
                x1={leftPad} y1={y} x2={width - rightPad} y2={y}
                stroke={colors.border} strokeWidth={1} opacity={0.45}
                strokeDasharray={i === 0 ? undefined : '3,5'}
                strokeLinecap="round"
              />
              <SvgText x={leftPad - 10} y={y + 4} fill={colors.textMuted} fontSize={11} fontWeight="600" textAnchor="end" fontFamily={font.bodyMedium}>
                {tick}
              </SvgText>
            </G>
          )
        })}

        {/* Stacked sticker bars */}
        {good.map((g, i) => {
          const x = leftPad + (i + 0.5) * (chartW / count) - barW / 2
          const baseY = topPad + chartH
          const gH = (g / maxVal) * chartH
          const lH = (little[i] / maxVal) * chartH
          const nH = (none[i] / maxVal) * chartH
          const totalH = gH + lH + nH
          const topR = totalH > barR * 2 ? barR : Math.min(totalH / 2, barR)

          return (
            <G key={i}>
              {(() => {
                const hasN = nH > 0, hasL = lH > 0, hasG = gH > 0
                const topSeg = hasN ? 'none' : hasL ? 'little' : 'good'
                const segments: { fill: string; key: string; y0: number; h: number }[] = []
                if (hasG) segments.push({ fill: colGood, key: 'good', y0: baseY - gH, h: gH })
                if (hasL) segments.push({ fill: colLittle, key: 'little', y0: baseY - gH - lH, h: lH })
                if (hasN) segments.push({ fill: colNone, key: 'none', y0: baseY - totalH, h: nH })

                return segments.map((seg, si) => {
                  const isTop = seg.key === topSeg
                  if (isTop && seg.h > 2) {
                    const r = Math.min(topR, seg.h / 2)
                    return (
                      <Path key={si} d={`M ${x} ${seg.y0 + seg.h} L ${x} ${seg.y0 + r} Q ${x} ${seg.y0}, ${x + r} ${seg.y0} L ${x + barW - r} ${seg.y0} Q ${x + barW} ${seg.y0}, ${x + barW} ${seg.y0 + r} L ${x + barW} ${seg.y0 + seg.h} Z`} fill={seg.fill} />
                    )
                  }
                  return <Rect key={si} x={x} y={seg.y0} width={barW} height={Math.max(seg.h, 1)} fill={seg.fill} />
                })
              })()}
            </G>
          )
        })}
      </Svg>
      <View style={[styles.labelRow, { width, paddingLeft: leftPad, paddingRight: rightPad }]}>
        {labels.map((l, i) => <Text key={i} style={[styles.label, { color: colors.textMuted }]}>{l}</Text>)}
      </View>
      <View style={styles.legendRow}>
        <LegendDot color={colGood} label="Ate well" />
        <LegendDot color={colLittle} label="A little" />
        <LegendDot color={colNone} label="Didn't eat" />
      </View>
    </View>
  )
}

// Mockup-faithful donut: stroked ring + percentage in center.
function Donut({ size = 100, pct, color, label, bgRing }: {
  size?: number
  pct: number
  color: string
  label: string
  bgRing: string
}) {
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const labelColor = diffuse ? dt.colors.ink3 : '#6E6763'
  const numColor = diffuse ? dt.colors.ink : color
  const numFont = diffuse ? diffuseFont.display : font.display
  const stroke = 10
  const r = size / 2 - stroke / 2 - 1
  const cf = 2 * Math.PI * r
  const offset = cf - (cf * pct) / 100
  return (
    <View style={{ alignItems: 'center', gap: 8 }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={bgRing} strokeWidth={stroke} fill="none" />
          <Circle
            cx={size / 2} cy={size / 2} r={r}
            stroke={color} strokeWidth={stroke} fill="none"
            strokeDasharray={cf} strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 20, fontFamily: numFont, color: numColor, letterSpacing: -0.5 }}>
            {pct}%
          </Text>
        </View>
      </View>
      <Text style={{ fontSize: 12, color: labelColor, fontFamily: diffuse ? diffuseFont.mono : font.bodyMedium }}>{label}</Text>
    </View>
  )
}

// EatQualityBubbles → donut pair, matches the kids-analytics-screen.jsx mockup.
function EatQualityBubbles({
  good, little, none,
}: {
  good: number[]
  little: number[]
  none: number[]
}) {
  const { colors, stickers: st } = useTheme()
  const { t } = useTranslation()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const totalGood = good.reduce((a, b) => a + b, 0)
  const totalLittle = little.reduce((a, b) => a + b, 0)
  const totalNone = none.reduce((a, b) => a + b, 0)
  const total = totalGood + totalLittle + totalNone
  if (total === 0) {
    return (
      <Text style={[styles.detailExplain, { color: diffuse ? dt.colors.ink3 : colors.textMuted, textAlign: 'center', paddingVertical: 20, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
        {t('kids_analytics_log_meals_eat_quality')}
      </Text>
    )
  }

  const pctGood = Math.round((totalGood / total) * 100)
  const pctLittle = Math.round((totalLittle / total) * 100)
  const pctNone = 100 - pctGood - pctLittle

  const items = [
    { label: 'Ate well', pct: pctGood, color: st.green },
    { label: 'A little', pct: pctLittle, color: st.peach },
    { label: "Didn't eat", pct: pctNone, color: st.coral },
  ].filter((i) => i.pct > 0)

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 24, paddingVertical: 12 }}>
      {items.map((item) => (
        <Donut key={item.label} size={100} pct={item.pct} color={item.color} label={item.label} bgRing={diffuse ? dt.colors.line : colors.surfaceRaised} />
      ))}
    </View>
  )
}

// Mockup-faithful LineChart from kids-analytics-screen.jsx (line 402–419):
// simple polyline + 10px circles with paper-deep fill + line-stroke, value
// shown inside each circle, day label below. No area fill, no smooth curve.
function MealsLineChart({
  data: rawData, labels: rawLabels, width,
}: {
  data: number[]
  labels: string[]
  width: number
}) {
  const { colors } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const color = diffuse ? getDiffuseAccent('kids', dt.isDark) : PILLAR_CONFIG.nutrition.color
  const axisColor = diffuse ? dt.colors.ink3 : colors.textMuted
  const nodeFill = diffuse ? dt.colors.surface : colors.surfaceRaised
  const nodeStroke = diffuse ? dt.colors.line2 : colors.borderStrong
  const numFont = diffuse ? diffuseFont.mono : font.display
  const labelFont = diffuse ? diffuseFont.mono : font.body

  // Bin to ≤ 14 points to keep wide windows legible
  const { data, labels } = binSeries(rawData, rawLabels, 14)
  if (data.length < 2) return null

  const pad = 16
  const svgH = 90
  const labelH = 18
  const totalH = svgH + labelH
  const innerW = width - pad * 2
  const step = innerW / (data.length - 1)

  const maxV = Math.max(...data, 1)
  const pts = data.map((v, i) => ({
    x: pad + i * step,
    y: pad + (svgH - pad * 2) - (v / maxV) * (svgH - pad * 2),
    v,
  }))
  const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ')
  const nonZeroData = data.some((v) => v > 0)

  return (
    <View style={{ width: '100%', paddingVertical: 4 }}>
      <Svg width={width} height={totalH}>
        {/* Connecting polyline — straight lines, 2px stroke, no fill */}
        {nonZeroData && (
          <Path
            d={'M ' + pts.map((p) => `${p.x} ${p.y}`).join(' L ')}
            fill="none" stroke={color} strokeWidth={2}
            strokeLinejoin="round" strokeLinecap="round"
          />
        )}

        {/* Each point: bg-deep circle with line stroke + value text inside */}
        {pts.map((p, i) => (
          <G key={i}>
            <Circle cx={p.x} cy={p.y} r={11} fill={nodeFill} stroke={nodeStroke} strokeWidth={1} />
            <SvgText
              x={p.x} y={p.y + 3}
              textAnchor="middle"
              fontSize={10}
              fontFamily={numFont}
              fill={p.v > 0 ? color : axisColor}
            >
              {p.v}
            </SvgText>
            {/* Day label below */}
            <SvgText
              x={p.x} y={svgH + 14}
              textAnchor="middle"
              fontSize={10}
              fontFamily={labelFont}
              fill={axisColor}
            >
              {labels[i]}
            </SvgText>
          </G>
        ))}
      </Svg>
    </View>
  )
}

// Mockup-faithful bar chart: flex bars, no grid, color-mix for non-highlighted,
// tiny "1h" label on the highlighted (max) bar. Matches kids-analytics-screen.jsx.
function HighlightBarChart({
  data: rawData, labels: rawLabels, color, width: _width, height = 140, unit = '',
}: {
  data: number[]
  labels: string[]
  color: string
  width?: number
  height?: number
  unit?: string
}) {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const barColor = diffuse ? getDiffuseAccent('kids', dt.isDark) : color
  const axisColor = diffuse ? dt.colors.ink3 : colors.textMuted
  const emptyBar = diffuse ? dt.colors.line : colors.surfaceRaised
  const numFont = diffuse ? diffuseFont.mono : font.display
  const labelFont = diffuse ? diffuseFont.mono : font.body
  const labelFontActive = diffuse ? diffuseFont.monoBold : font.bodySemiBold
  if (rawData.length === 0) return null

  const realMax = Math.max(...rawData, 0)
  if (realMax === 0) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <Text style={[styles.detailExplain, { color: axisColor, textAlign: 'center', fontFamily: diffuse ? diffuseFont.body : font.body }]}>
          {t('kids_analytics_no_entries_window')}
        </Text>
      </View>
    )
  }

  const { data, labels } = binSeries(rawData, rawLabels, 14)
  const maxV = Math.max(...data, 0.1)
  const maxIdx = data.indexOf(maxV)
  const yTop = realMax % 1 === 0 ? Math.ceil(maxV) : Number(maxV.toFixed(1))
  const yMid = Math.round(maxV / 2)

  const fmt = (v: number) => (v % 1 === 0 ? `${v}` : v.toFixed(1))
  const dimmed = diffuse ? `${barColor}55` : `${color}66` // 40% over paper, mockup-equivalent of color-mix

  return (
    <View style={{ width: '100%', paddingVertical: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, paddingLeft: 22, gap: 4, position: 'relative' }}>
        {/* Y axis labels — left edge, 3 only, no grid lines */}
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, justifyContent: 'space-between', paddingVertical: 2 }}>
          <Text style={{ fontSize: 10, color: axisColor, fontFamily: labelFont }}>{fmt(yTop)}</Text>
          <Text style={{ fontSize: 10, color: axisColor, fontFamily: labelFont }}>{fmt(yMid)}</Text>
          <Text style={{ fontSize: 10, color: axisColor, fontFamily: labelFont }}>0</Text>
        </View>
        {data.map((v, i) => {
          const pct = Math.max((v / maxV) * 100, v > 0 ? 2 : 0)
          const isMax = i === maxIdx && v > 0
          return (
            <View key={i} style={{ flex: 1, alignItems: 'stretch', position: 'relative', height: '100%', justifyContent: 'flex-end' }}>
              {/* Highlighted label tooltip */}
              {isMax && (
                <View style={{ position: 'absolute', top: -2, left: 0, right: 0, alignItems: 'center' }}>
                  <View style={{ backgroundColor: barColor + '22', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 }}>
                    <Text style={{ fontSize: 10, fontFamily: numFont, color: diffuse ? dt.colors.ink : color }}>
                      {fmt(v)}{unit}
                    </Text>
                  </View>
                </View>
              )}
              <View style={{
                height: `${pct}%`,
                marginHorizontal: 2,
                borderRadius: 6,
                backgroundColor: v === 0 ? emptyBar : (isMax ? barColor : dimmed),
              }} />
            </View>
          )
        })}
      </View>
      {/* X labels */}
      <View style={{ flexDirection: 'row', paddingLeft: 22, gap: 4, marginTop: 8 }}>
        {labels.map((l, i) => (
          <Text key={i} style={{
            flex: 1, textAlign: 'center', fontSize: 10,
            color: i === maxIdx && data[i] > 0 ? (diffuse ? dt.colors.ink : color) : axisColor,
            fontFamily: i === maxIdx && data[i] > 0 ? labelFontActive : labelFont,
          }}>
            {l}
          </Text>
        ))}
      </View>
    </View>
  )
}

function SleepQualityChart({ counts }: { counts: { great: number; good: number; restless: number; poor: number } }) {
  const { colors, radius } = useTheme()
  const { t } = useTranslation()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const labelColor = diffuse ? dt.colors.ink : colors.text
  const mutedColor = diffuse ? dt.colors.ink3 : colors.textMuted
  const total = counts.great + counts.good + counts.restless + counts.poor
  if (total === 0) {
    return (
      <Text style={[styles.detailExplain, { color: mutedColor, textAlign: 'center', paddingVertical: 18, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
        {t('kids_analytics_log_sleep_quality_hint')}
      </Text>
    )
  }
  const items = [
    { label: 'Great', count: counts.great, color: brand.success, emoji: '😴' },
    { label: 'Good', count: counts.good, color: PILLAR_CONFIG.health.color, emoji: '🙂' },
    { label: 'Restless', count: counts.restless, color: brand.accent, emoji: '😐' },
    { label: 'Poor', count: counts.poor, color: brand.error, emoji: '😣' },
  ]
  return (
    <View style={styles.qualityWrap}>
      {items.map((item, i) => {
        const pct = Math.round((item.count / total) * 100)
        if (item.count === 0) return null
        return (
          <View key={i} style={styles.qualityRow}>
            <EmojiSticker size={24}>{item.emoji}</EmojiSticker>
            <Text style={[styles.qualityLabel, { color: labelColor, fontFamily: diffuse ? diffuseFont.body : font.bodyMedium }]}>{item.label}</Text>
            <View style={[styles.qualityBarBg, { backgroundColor: item.color + '1A', borderRadius: radius.full, height: 12 }]}>
              <View style={[styles.qualityBarFill, { width: `${pct}%`, backgroundColor: item.color, borderRadius: radius.full }]} />
            </View>
            <Text style={[styles.qualityPct, { color: diffuse ? dt.colors.ink : item.color, fontFamily: diffuse ? diffuseFont.mono : font.display }]}>{pct}%</Text>
          </View>
        )
      })}
    </View>
  )
}

function MoodDistribution({ moods }: { moods: { mood: string; count: number }[] }) {
  return <MoodBubbleCluster items={moods} />
}

function MoodDailyChart({ dailyCounts, labels, width }: { dailyCounts: Record<string, number[]>; labels: string[]; width: number }) {
  const { colors, isDark } = useTheme()
  const { t } = useTranslation()
  const days = labels.length
  const moods = Object.keys(dailyCounts)
  const totalAcrossWindow = moods.reduce((sum, m) => sum + dailyCounts[m].reduce((a, b) => a + b, 0), 0)
  if (totalAcrossWindow === 0) {
    return (
      <Text style={[styles.detailExplain, { color: colors.textMuted, textAlign: 'center', paddingVertical: 24 }]}>
        {t('kids_analytics_no_moods_window')}
      </Text>
    )
  }
  // Cap to ≤14 columns on long windows so dots don't overlap
  const stride = Math.max(1, Math.ceil(days / 14))
  const ink = isDark ? colors.text : '#141313'
  const colW = width / Math.ceil(days / stride)
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', width, flexWrap: 'nowrap' }}>
        {labels.filter((_, i) => i % stride === 0).map((label, colIdx) => {
          const dayIdx = colIdx * stride
          const dayMoods = moods.filter((m) => (dailyCounts[m]?.[dayIdx] ?? 0) > 0)
          return (
            <View key={dayIdx} style={{ width: colW, alignItems: 'center', gap: 4, paddingVertical: 10 }}>
              {dayMoods.length > 0 ? dayMoods.slice(0, 3).map((mood) => {
                const fill = moodFaceFill(mood)
                return (
                  <View key={mood} style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: fill + '55', borderWidth: 1.5, borderColor: ink, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <MoodFace size={20} variant={moodFaceVariant(mood)} fill={fill} stroke={ink} />
                  </View>
                )
              }) : (
                <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong }} />
              )}
              <Text style={[styles.label, { color: dayMoods.length > 0 ? colors.textSecondary : colors.textMuted }]} numberOfLines={1}>
                {label}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  const { colors } = useTheme()
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getEventColor(type: string): string {
  switch (type.toLowerCase()) {
    case 'vaccine': return PILLAR_CONFIG.health.color
    case 'temperature': return brand.error
    case 'medicine': return brand.accent
    default: return brand.secondary
  }
}

function getHealthEventLabel(type: string): string {
  switch (type.toLowerCase()) {
    case 'temperature': return 'Temperature'
    case 'medicine': return 'Medicine'
    case 'vaccine': return 'Vaccine'
    case 'note': return 'Note'
    default: return type
  }
}

function getHealthEventEmoji(type: string): string {
  switch (type.toLowerCase()) {
    case 'temperature': return '🌡️'
    case 'medicine': return '💊'
    case 'vaccine': return '💉'
    case 'note': return '📝'
    default: return ''
  }
}

function getBestQuality(counts: { great: number; good: number; restless: number; poor: number }): string {
  const total = counts.great + counts.good + counts.restless + counts.poor
  if (total === 0) return '—'
  return `${Math.round(((counts.great + counts.good) / total) * 100)}% good`
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 20 },

  // Header
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  screenTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5, fontFamily: font.display },
  screenSub: { fontSize: 14, fontWeight: '500', fontFamily: font.bodyMedium, marginTop: 2 },
  infoBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  // Header — 2026 redesign
  headerEditorial: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginHorizontal: -20,
  },
  headerSub: {
    fontSize: 14,
    paddingHorizontal: 24,
    marginTop: -4,
    marginBottom: 2,
  },
  infoBtnNew: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 16,
    marginRight: 20,
  },

  // 2x2 mini stat grid
  miniStatGrid: {
    gap: 10,
    marginTop: 2,
  },
  miniStatRow: {
    flexDirection: 'row',
    gap: 10,
  },

  // Child selector
  childRow: { gap: 10, paddingVertical: 4 },
  childChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 18, borderWidth: 1 },
  childChipName: { fontSize: 15, fontWeight: '700', fontFamily: font.bodySemiBold },
  childChipAge: { fontSize: 12, fontWeight: '500', fontFamily: font.bodyMedium },

  // Arc
  arcContainer: { alignItems: 'center', marginTop: 8, overflow: 'visible' },
  arcLegend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 6 },
  arcTooltip: { marginTop: 10, padding: 16, borderWidth: 1, gap: 8, width: '100%' },
  arcTooltipHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  arcTooltipIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  arcTooltipTitle: { fontSize: 16, fontWeight: '800', fontFamily: font.display },
  arcTooltipBody: { fontSize: 14, fontWeight: '500', fontFamily: font.bodyMedium, lineHeight: 20 },
  arcInfoHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, paddingVertical: 4 },
  arcInfoText: { fontSize: 12, fontWeight: '500', fontFamily: font.bodyMedium },

  // Insight card
  insightCard: { padding: 16, gap: 10 },
  insightHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  insightBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  insightBadgeText: { fontSize: 12, fontWeight: '700', fontFamily: font.bodySemiBold },
  insightDate: { fontSize: 11, fontWeight: '500', fontFamily: font.bodyMedium },
  insightMessage: { fontSize: 14, fontWeight: '600', fontFamily: font.bodySemiBold, lineHeight: 21 },
  insightButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 20, alignSelf: 'flex-start' },
  insightButtonText: { fontSize: 14, fontWeight: '700', fontFamily: font.bodySemiBold },

  // Grandma insight — 2026 paper redesign
  grandmaInsightPaper: {
    borderRadius: 26,
    padding: 18,
    paddingBottom: 20,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  grandmaInsightStickerBg: {
    position: 'absolute',
    right: -20,
    bottom: -28,
    opacity: 0.85,
  },
  grandmaInsightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grandmaInsightLabel: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  grandmaInsightDate: {
    fontSize: 11,
  },
  grandmaInsightMessageWrap: {
    marginTop: 10,
    marginBottom: 14,
    maxWidth: SCREEN_W * 0.68,
  },
  grandmaInsightMessage: {
    fontSize: 15,
    lineHeight: 22,
  },
  grandmaInsightBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  grandmaInsightBtnText: {
    fontSize: 13,
  },

  // Tips
  tipsSection: { gap: 12 },
  tipsSectionHeader: { gap: 3 },
  tipsSectionTitle: { fontSize: 12, fontWeight: '900', fontFamily: font.display, letterSpacing: 2 },
  tipsSectionSub: { fontSize: 13, fontWeight: '500', fontFamily: font.bodyMedium },
  tipsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tipCard: { width: (SCREEN_W - 40 - 8) / 2, padding: 12, gap: 8 },
  tipIconWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tipTitle: { fontSize: 13, fontWeight: '800', fontFamily: font.display, lineHeight: 18 },
  tipBody: { fontSize: 11, fontWeight: '500', fontFamily: font.bodyMedium, lineHeight: 15 },
  tipTapHint: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  tipTapText: { fontSize: 10, fontWeight: '600', fontFamily: font.bodySemiBold },
  askButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: 2 },
  askButtonText: { fontSize: 15, fontWeight: '700', fontFamily: font.bodySemiBold },

  // Pillar section
  pillarSection: { gap: 12 },
  pillarSectionTitle: { fontSize: 13, fontWeight: '900', fontFamily: font.display, letterSpacing: 2, marginBottom: 4 },
  pillarRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  pillarIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  pillarInfo: { flex: 1, gap: 6 },
  pillarNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pillarName: { fontSize: 16, fontWeight: '700', fontFamily: font.bodySemiBold },
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  trendText: { fontSize: 12, fontWeight: '700', fontFamily: font.bodySemiBold },
  pillarBarBg: { height: 8, width: '100%', overflow: 'hidden' },
  pillarBarFill: { height: '100%' },
  pillarTakeaway: { fontSize: 12, fontWeight: '500', fontFamily: font.bodyMedium },
  pillarScoreWrap: { flexDirection: 'row', alignItems: 'baseline', marginRight: 4 },
  pillarScoreValue: { fontSize: 22, fontWeight: '900', fontFamily: font.display },
  pillarScoreOf: { fontSize: 12, fontWeight: '600', fontFamily: font.bodySemiBold },

  // Pillar row — 2026 paper redesign
  pillarPaper: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  pillarPaperHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pillarStickerChip: {
    width: 46,
    height: 46,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarPaperTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  pillarPaperName: {
    fontSize: 20,
    lineHeight: 22,
  },
  pillarPaperBarBg: {
    height: 8,
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
  },
  pillarPaperBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  pillarPaperScore: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginLeft: 4,
  },
  pillarPaperValue: {
    fontSize: 24,
    lineHeight: 26,
  },
  pillarPaperOf: {
    fontSize: 11,
    marginLeft: 1,
  },
  pillarPaperTipTitle: {
    fontSize: 14,
    marginTop: 2,
  },
  pillarPaperBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  pillarPaperFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  pillarPaperFooterText: {
    fontSize: 12,
  },

  // Routine compliance expand
  routineExpand: {
    marginTop: 6,
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
    gap: 16,
  },
  routineStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  routineStatCell: {
    alignItems: 'center',
  },
  routineStatValue: {
    fontSize: 28,
    lineHeight: 30,
  },
  routineStatLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  routineSubheader: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  routineBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 60,
  },
  routineBarCell: {
    flex: 1,
    alignItems: 'center',
  },
  routineSkipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  routineSkipBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  // Detail body
  detailBody: { gap: 16, paddingTop: 8 },
  detailExplain: { fontSize: 14, fontFamily: font.body, lineHeight: 20, paddingHorizontal: 4 },
  helpCardCaps: { fontSize: 15, fontFamily: font.display, letterSpacing: -0.2, marginBottom: 4 },

  // Chart card — paper-cutout sticker style (no harsh black shadow)
  card: {
    padding: 20,
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  chartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  chartTitle: { fontSize: 15, fontFamily: font.display, letterSpacing: -0.1 },
  chartBody: { alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },


  // Labels & Legend
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  label: { fontSize: 12, fontFamily: font.bodyMedium, textAlign: 'center' },
  legendRow: { flexDirection: 'row', gap: 16, marginTop: 12, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 12, fontFamily: font.bodyMedium },

  // Events
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  eventDot: { width: 12, height: 12, borderRadius: 6 },
  eventLabel: { fontSize: 15, fontFamily: font.bodyMedium },
  eventDate: { fontSize: 13, fontFamily: font.body },

  // Vaccines
  vaccineGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  vaccineChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1 },
  vaccineText: { fontSize: 14, fontFamily: font.bodyMedium },

  // Sleep quality bars
  qualityWrap: { width: '100%', gap: 12, paddingVertical: 6 },
  qualityRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qualityEmoji: { fontSize: 18, width: 28, textAlign: 'center' },
  qualityLabel: { fontSize: 14, fontFamily: font.bodyMedium, width: 64 },
  qualityBarBg: { flex: 1, height: 16, overflow: 'hidden' },
  qualityBarFill: { height: '100%' },
  qualityPct: { fontSize: 14, fontFamily: font.display, width: 44, textAlign: 'right' },

  // Stat row — paper tiles like the design-system mockup
  statRow: { flexDirection: 'row', gap: 8, padding: 0, backgroundColor: 'transparent' as any },
  statPill: { flex: 1, alignItems: 'center', paddingVertical: 16, paddingHorizontal: 10, gap: 2 },
  statValue: { fontSize: 24, fontFamily: font.display, letterSpacing: -0.4, lineHeight: 28 },
  statLabel: { fontSize: 11, fontFamily: font.body, textAlign: 'center', lineHeight: 14, marginTop: 2 },

  // Loading / Error / Empty
  loadingWrap: { alignItems: 'center', gap: 10, paddingVertical: 32 },
  loadingText: { fontSize: 14, fontFamily: font.bodyMedium },
  errorCard: { padding: 20, alignItems: 'center', gap: 10 },
  errorText: { fontSize: 15, fontFamily: font.bodySemiBold },
  errorRetry: { fontSize: 14, fontFamily: font.bodyMedium },
  emptyCard: { padding: 24, alignItems: 'center', gap: 10 },
  emptyText: { fontSize: 14, fontFamily: font.bodyMedium, textAlign: 'center', lineHeight: 20 },
  emptyAll: { padding: 40, alignItems: 'center', gap: 14, marginTop: 16 },
  emptyAllTitle: { fontSize: 20, fontFamily: font.display },
  emptyAllSub: { fontSize: 15, fontFamily: font.body, textAlign: 'center', lineHeight: 22 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { marginHorizontal: 0 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  modalTitle: { fontSize: 22, fontFamily: font.display },
  modalClose: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  // Score info modal
  scoreHighlight: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, marginHorizontal: 20, marginBottom: 20, borderWidth: 1 },
  scoreHighlightNum: { fontSize: 44, fontFamily: font.display },
  scoreHighlightLabel: { fontSize: 16, fontFamily: font.bodySemiBold },
  scoreHighlightSub: { fontSize: 13, fontFamily: font.body, marginTop: 2 },
  infoSectionLabel: { fontSize: 12, fontFamily: font.bodySemiBold, letterSpacing: 1.5, marginHorizontal: 20, marginBottom: 10 },
  bandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20 },
  bandDot: { width: 12, height: 12, borderRadius: 6 },
  bandLabel: { flex: 1, fontSize: 15, fontFamily: font.bodyMedium },
  bandRange: { fontSize: 14, fontFamily: font.body },
  pillarInfoCard: { marginHorizontal: 20, padding: 16, gap: 10 },
  pillarInfoHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pillarInfoIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pillarInfoName: { flex: 1, fontSize: 15, fontFamily: font.bodySemiBold },
  pillarInfoWeight: { fontSize: 13, fontFamily: font.bodyMedium },
  pillarInfoScoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillarInfoScoreText: { fontSize: 14, fontFamily: font.display },
  pillarInfoBody: { fontSize: 13, fontFamily: font.body, lineHeight: 19 },
  ageBanner: { marginHorizontal: 20, marginBottom: 10, padding: 18, borderWidth: 1, gap: 8 },
  ageBannerTitle: { fontSize: 15, fontFamily: font.bodySemiBold },
  ageBannerBody: { fontSize: 14, fontFamily: font.body, lineHeight: 21 },

  // Grandma insight detail sheet
  insightDetailSheet: { marginHorizontal: 16, marginBottom: 16, padding: 22, gap: 14 },
  insightDetailHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  insightDetailLabelWrap: { flex: 1, gap: 4 },
  insightDetailOverall: { fontSize: 22, lineHeight: 26, marginTop: 4 },
  insightDetailOverallSub: { fontSize: 13, lineHeight: 18 },
  insightHighlightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 14 },
  insightHighlightIcon: { width: 36, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  insightHighlightBody: { flex: 1, gap: 4 },
  insightHighlightLabel: { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' },
  insightHighlightTitle: { fontSize: 15, lineHeight: 20 },
  insightHighlightText: { fontSize: 14, lineHeight: 20 },
  insightActionsBlock: { gap: 8, marginTop: 2 },
  insightActionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 12, paddingHorizontal: 14 },
  insightActionText: { flex: 1, fontSize: 14, lineHeight: 20 },
  insightEmpty: { padding: 16 },
  insightEmptyText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  insightDetailCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: 6 },
  insightDetailCtaText: { fontSize: 15 },

  // Discuss confirm sheet
  confirmOverlay: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  confirmSheet: { width: '100%', maxWidth: 420, padding: 26, paddingTop: 28, gap: 12, alignItems: 'center' },
  confirmIconWrap: { marginBottom: 4 },
  confirmTitle: { fontSize: 22, lineHeight: 28, textAlign: 'center' },
  confirmBody: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 10 },
  confirmPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 22, alignSelf: 'stretch' },
  confirmPrimaryText: { fontSize: 15 },
  confirmSecondary: { paddingVertical: 12, paddingHorizontal: 22, alignSelf: 'stretch', alignItems: 'center', borderWidth: 1 },
  confirmSecondaryText: { fontSize: 14 },

  // Tip detail modal
  tipModalContent: { marginHorizontal: 20, marginBottom: 20, padding: 24, gap: 16 },
  tipModalHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tipModalIconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  tipModalTitle: { fontSize: 22, fontFamily: font.display, lineHeight: 28 },
  tipModalSummary: { padding: 14 },
  tipModalSummaryText: { fontSize: 15, fontFamily: font.bodyMedium, lineHeight: 22 },
  tipModalDetail: { fontSize: 15, fontFamily: font.body, lineHeight: 23 },
  tipAskBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderWidth: 1, marginTop: 4 },
  tipAskBtnText: { fontSize: 16, fontFamily: font.bodySemiBold },
})
