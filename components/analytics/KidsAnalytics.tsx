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

import React, { useState, useEffect, useCallback } from 'react'
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
import Svg, {
  Path,
  Circle,
  Rect,
  Line,
  Defs,
  LinearGradient,
  Stop,
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
import { useTheme, brand } from '../../constants/theme'
import { useChildStore } from '../../store/useChildStore'
import { LineChart, BarChart, BubbleGrid, smoothPath } from '../charts/SvgCharts'
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
import { Emoji } from '../ui/Emoji'
import { PeriodSelector, type Period } from './shared/PeriodSelector'
import { BigChartCard } from './shared/BigChartCard'
import { HealthScoreRing, type RingSegment } from './shared/HealthScoreRing'
import { CustomRangeModal } from './shared/CustomRangeModal'
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

const PILLAR_CONFIG = {
  nutrition: { label: 'Nutrition', color: '#A2FF86', icon: Utensils },
  sleep:     { label: 'Sleep',     color: '#B983FF', icon: Moon },
  mood:      { label: 'Mood',      color: '#FF8AD8', icon: Smile },
  health:    { label: 'Health',    color: '#4D96FF', icon: Heart },
  growth:    { label: 'Growth',    color: '#F59E0B', icon: TrendingUp },
  activity:  { label: 'Activity',  color: '#FF6B35', icon: Zap },
} as const

type PillarKey = keyof typeof PILLAR_CONFIG
const PILLAR_ORDER: PillarKey[] = ['nutrition', 'sleep', 'mood', 'health', 'growth', 'activity']

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

function scoreColor(v: number): string {
  if (v >= 8.5) return '#A2FF86'
  if (v >= 7) return '#6AABF7'
  if (v >= 5) return '#FBBF24'
  if (v >= 3) return '#FF8C42'
  return '#FF7070'
}

function rankColor(i: number): string {
  if (i === 0) return '#FBBF24' // gold
  if (i === 1) return '#6AABF7' // silver-blue
  if (i === 2) return '#A2FF86' // green
  return '#FFFFFF66'            // muted white
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
    color: '#FF6B35',
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
    const avgPerDay = (totalCount / 7).toFixed(1)
    const poopPct = totalCount > 0 ? Math.round((typeCounts.poop + typeCounts.mixed) / totalCount * 100) : 0
    if (ageMonths < 6 && totalCount / 7 < 6) {
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
    lines.push(`Diapers: ${totalCount} this week (${typeCounts.pee} pee, ${typeCounts.poop} poop, ${typeCounts.mixed} mixed) — avg ${(totalCount / 7).toFixed(1)}/day`)
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
  const { colors, radius } = useTheme()
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
  const analyticsRange = (() => {
    if (period === 'custom' && customRange) {
      return { kind: 'custom' as const, from: customRange.from, to: customRange.to }
    }
    const days = period === 'week' ? 7 : period === 'month' ? 30 : period === '3mo' ? 90 : period === 'year' ? 365 : 7
    return { kind: 'last' as const, days }
  })()

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
    setCustomRange({ from, to })
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

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {/* ── HEADER (2026 redesign) ── */}
        <View style={styles.headerEditorial}>
          <View style={{ flex: 1 }}>
            <AnalyticsTitle
              primary={`${childName}'s patterns`}
              italic="so far."
            />
            <Text
              style={[
                styles.headerSub,
                { color: colors.textSecondary, fontFamily: 'DMSans_400Regular' },
              ]}
            >
              {getAgeLabel(ageMonths)}
            </Text>
          </View>
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

        <PeriodSelector
          value={period}
          onChange={handlePeriodChange}
          customLabel={customLabel}
        />

        {/* ── 1. CHILD SELECTOR ── */}
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

        {isLoading && (
          <View style={styles.loadingWrap}>
            <BrandedLoader logoSize={72} motion="blinkOnly" label="Loading analytics…" />
          </View>
        )}

        {error && !isLoading && (
          <Pressable onPress={() => refetch()} style={[styles.errorCard, { backgroundColor: brand.error + '15', borderRadius: radius.xl }]}>
            <Text style={[styles.errorText, { color: brand.error }]}>Failed to load data</Text>
            <View style={styles.row}>
              <RefreshCw size={14} color={brand.error} />
              <Text style={[styles.errorRetry, { color: brand.error }]}>Tap to retry</Text>
            </View>
          </Pressable>
        )}

        {analytics && (
          <>
            {/* ── 2. WELLNESS RING (2026 redesign) ── */}
            <KidsWellnessRingCard
              scores={analytics.scores}
              onPillarPress={setSelectedPillar}
            />

            {/* ── 3. GRANDMA AI INSIGHT ── */}
            <GrandmaInsightCard
              scores={analytics.scores}
              analytics={analytics}
              childName={childName}
              ageMonths={ageMonths}
            />

            {/* ── 4. THRIVING BREAKDOWN (tips folded into each pillar row) ── */}
            {(() => {
              const tips = getHealthTips(analytics.scores, analytics, ageMonths, childName)
              const tipMap = tipByPillar(tips)
              return (
                <View style={styles.pillarSection}>
                  <Text style={[styles.pillarSectionTitle, { color: colors.text }]}>
                    THRIVING BREAKDOWN
                  </Text>
                  {PILLAR_ORDER.map((key) => (
                    <PillarRow
                      key={key}
                      pillarKey={key}
                      score={analytics.scores[key]}
                      tip={tipMap[key]}
                      onPress={() => setSelectedPillar(key)}
                    />
                  ))}
                  <RoutineComplianceSection data={analytics.routineCompliance} />
                </View>
              )
            })()}
          </>
        )}

        {analytics && analytics.totalLogs === 0 && !isLoading && (
          <View style={[styles.emptyAll, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            <FileQuestion size={32} color={colors.textMuted} />
            <Text style={[styles.emptyAllTitle, { color: colors.text }]}>No data yet</Text>
            <Text style={[styles.emptyAllSub, { color: colors.textMuted }]}>
              Start logging meals, sleep, mood, and activities from the Calendar tab.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── Full-screen chart modals ── */}
      {analytics && (
        <>
          <FullScreenChart visible={fullScreen === 'eat_quality'} title="Weekly Eat Quality" onClose={() => setFullScreen(null)}>
            <StackedBarChart good={analytics.nutrition.eatQuality.good} little={analytics.nutrition.eatQuality.little} none={analytics.nutrition.eatQuality.none} labels={analytics.nutrition.weekLabels} width={SCREEN_W - 48} height={220} />
          </FullScreenChart>
          <FullScreenChart visible={fullScreen === 'meal_freq'} title="Meals per Day" onClose={() => setFullScreen(null)}>
            <BarChart data={analytics.nutrition.mealFrequency} labels={analytics.nutrition.weekLabels} color={PILLAR_CONFIG.nutrition.color} width={SCREEN_W - 48} height={220} />
          </FullScreenChart>
          <FullScreenChart visible={fullScreen === 'top_foods'} title="Most Logged Foods" onClose={() => setFullScreen(null)}>
            <BubbleGrid items={analytics.nutrition.topFoods.map((f, i) => ({
              label: f.label, value: f.count,
              color: [PILLAR_CONFIG.nutrition.color, PILLAR_CONFIG.health.color, PILLAR_CONFIG.mood.color, PILLAR_CONFIG.sleep.color, PILLAR_CONFIG.growth.color, '#FF6B35'][i % 6],
            }))} />
          </FullScreenChart>
          <FullScreenChart visible={fullScreen === 'sleep_weekly'} title="Daily Sleep Hours" onClose={() => setFullScreen(null)}>
            <BarChart data={analytics.sleep.dailyHours} labels={analytics.sleep.weekLabels} color={PILLAR_CONFIG.sleep.color} width={SCREEN_W - 48} height={220} />
          </FullScreenChart>
          <FullScreenChart visible={fullScreen === 'sleep_quality'} title="Sleep Quality" onClose={() => setFullScreen(null)}>
            <SleepQualityChart counts={analytics.sleep.qualityCounts} />
          </FullScreenChart>
          <FullScreenChart visible={fullScreen === 'mood_dist'} title="Mood Distribution" onClose={() => setFullScreen(null)}>
            <MoodDistribution moods={analytics.mood.dominantMoods} />
          </FullScreenChart>
          <FullScreenChart visible={fullScreen === 'mood_daily'} title="Daily Mood Tracking" onClose={() => setFullScreen(null)}>
            <MoodDailyChart dailyCounts={analytics.mood.dailyCounts} labels={analytics.mood.weekLabels} width={SCREEN_W - 48} />
          </FullScreenChart>
          <FullScreenChart visible={fullScreen === 'health_freq'} title="Health Events" onClose={() => setFullScreen(null)}>
            <BarChart data={analytics.health.weeklyFrequency} labels={analytics.health.weekLabels} color={PILLAR_CONFIG.health.color} width={SCREEN_W - 48} height={220} />
          </FullScreenChart>
          {analytics.growth.weights.length >= 2 && (
            <FullScreenChart visible={fullScreen === 'weight'} title="Weight (kg)" onClose={() => setFullScreen(null)}>
              <LineChart data={analytics.growth.weights.map((w) => w.value)} labels={analytics.growth.weights.map((w) => { const d = new Date(w.date); return `${d.getMonth() + 1}/${d.getDate()}` })} color={PILLAR_CONFIG.health.color} width={SCREEN_W - 48} height={220} unit="kg" showAverage />
            </FullScreenChart>
          )}
          {analytics.growth.heights.length >= 2 && (
            <FullScreenChart visible={fullScreen === 'height'} title="Height (cm)" onClose={() => setFullScreen(null)}>
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
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()

  const SCORE_BANDS = [
    { range: '8.5 – 10', label: 'Excellent', color: '#A2FF86' },
    { range: '7.0 – 8.4', label: 'Good',      color: '#6AABF7' },
    { range: '5.0 – 6.9', label: 'Fair',      color: '#FBBF24' },
    { range: '3.0 – 4.9', label: 'Needs Attention', color: '#FF8C42' },
    { range: '0 – 2.9',   label: 'Low',       color: '#FF7070' },
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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderRadius: radius.xl, paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Thriving Score Guide</Text>
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
                  <Text style={[styles.scoreHighlightLabel, { color: colors.text }]}>{childName}'s thriving score</Text>
                  <Text style={[styles.scoreHighlightSub, { color: colors.textSecondary }]}>Weighted average of 5 pillars</Text>
                </View>
              </View>
            )}

            <Text style={[styles.infoSectionLabel, { color: colors.textSecondary }]}>SCORE SCALE</Text>
            <View style={{ gap: 8, marginBottom: 20 }}>
              {SCORE_BANDS.map((b) => (
                <View key={b.label} style={styles.bandRow}>
                  <View style={[styles.bandDot, { backgroundColor: b.color }]} />
                  <Text style={[styles.bandLabel, { color: colors.text }]}>{b.label}</Text>
                  <Text style={[styles.bandRange, { color: colors.textMuted }]}>{b.range}</Text>
                </View>
              ))}
            </View>

            <Text style={[styles.infoSectionLabel, { color: colors.textSecondary }]}>HOW EACH PILLAR IS SCORED</Text>
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
                {childName} at {getAgeLabel(ageMonths)}
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
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const Icon = tip.icon

  function handleAskGrandma() {
    const ctx = scores && analytics
      ? buildGrandmaContext(scores, analytics, childName, ageMonths) + `\n\nI have a specific question about: ${tip.title} — ${tip.body}`
      : `${tip.title}: ${tip.body}`
    onClose()
    setTimeout(() => router.push({ pathname: '/grandma-talk', params: { insightContext: ctx } } as any), 150)
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
            <Text style={[styles.tipAskBtnText, { color: colors.primary }]}>Ask Grandma about this</Text>
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
  const { stickers } = useTheme()

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
  const caption = overall >= 8.5 ? 'thriving' : overall >= 7 ? 'on track' : overall >= 5 ? 'developing' : 'needs care'

  return (
    <View style={{ gap: 12 }}>
      <BigChartCard
        label="CHILD WELLNESS"
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

  useEffect(() => {
    p0.value = 0; p1.value = 0; p2.value = 0
    p3.value = 0; p4.value = 0; p5.value = 0
    scoreOpacity.value = 0

    const spring = { damping: 14, stiffness: 90, mass: 0.8 }
    // No-data axes get a small minimum so the polygon doesn't collapse to center
    const targets = PILLAR_ORDER.map((key) => scores[key].hasData ? scores[key].value / 10 : 0.08)
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
      -1,  // infinite
      false // restart from 0 each cycle (full sine wave)
    ))
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
      : 'No data logged yet — start logging to see progress'
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
              <Text style={{ fontSize: 34, fontWeight: '900', color: PILLAR_CONFIG[activePillar].color, lineHeight: 38, fontFamily: 'Fraunces_600SemiBold' }}>
                {scores[activePillar].hasData ? scores[activePillar].value.toFixed(1) : '—'}
              </Text>
              <Text style={{ fontSize: 10, fontWeight: '700', fontFamily: 'DMSans_600SemiBold', color: PILLAR_CONFIG[activePillar].color + 'AA', marginTop: 2, letterSpacing: 0.5 }}>
                {PILLAR_CONFIG[activePillar].label.toLowerCase()}
              </Text>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 34, fontWeight: '900', color: overallC, lineHeight: 38, fontFamily: 'Fraunces_600SemiBold' }}>
                {hasAnyData ? overall.toFixed(1) : '—'}
              </Text>
              <Text style={{ fontSize: 10, fontWeight: '600', fontFamily: 'DMSans_600SemiBold', color: colors.textSecondary, marginTop: 2 }}>
                thriving
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
                : 'No data'}
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
          Tap ℹ for score guide
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
  const trendPillar = PILLAR_ORDER.find((k) => scores[k].hasData && Math.abs(scores[k].trend) >= 10)
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
  scores, analytics, childName, ageMonths,
}: {
  scores: WellnessScores
  analytics: AnalyticsData
  childName: string
  ageMonths: number
}) {
  const { colors, stickers, font } = useTheme()
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
      router.push({ pathname: '/grandma-talk', params: { insightContext: ctx } } as any)
    }, 150)
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
              GRANDMA SAYS
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
              Let's discuss →
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
  const { colors, radius, stickers, font } = useTheme()
  const insets = useSafeAreaInsets()

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
                GRANDMA SAYS
              </Text>
              <Text
                style={[
                  styles.insightDetailOverall,
                  { color: colors.text, fontFamily: font.display },
                ]}
              >
                {childName} is {highlights.overallLabel}
              </Text>
              <Text
                style={[
                  styles.insightDetailOverallSub,
                  { color: colors.textSecondary, fontFamily: font.body },
                ]}
              >
                Overall {highlights.overallScore.toFixed(1)}/10 this week
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
              label="STRENGTH"
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
              label="AREA TO WORK ON"
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
              label="TREND"
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
                SUGGESTED NEXT STEPS
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
                Keep logging — more detailed highlights appear once there's a full week of data.
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
              Let's discuss →
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
  const { colors, radius, stickers, font } = useTheme()
  const insets = useSafeAreaInsets()

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
            Share with Grandma?
          </Text>
          <Text style={[styles.confirmBody, { color: colors.textSecondary, fontFamily: font.body }]}>
            We'll send {childName}'s wellness metrics to Grandma so she can walk through them with you.
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
              Yes, share & chat
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
              Not now
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
  const { colors, radius } = useTheme()

  function handleAskGrandma() {
    const ctx = buildGrandmaContext(scores, analytics, childName, ageMonths)
    router.push({ pathname: '/grandma-talk', params: { insightContext: ctx } } as any)
  }

  return (
    <View style={styles.tipsSection}>
      <View style={styles.tipsSectionHeader}>
        <Text style={[styles.tipsSectionTitle, { color: colors.text }]}>HEALTH TIPS</Text>
        <Text style={[styles.tipsSectionSub, { color: colors.textMuted }]}>Personalized for {childName} today</Text>
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
                <Text style={[styles.tipTapText, { color: tip.color }]}>Tap for details</Text>
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
        <Text style={[styles.askButtonText, { color: colors.text }]}>Ask Grandma with full context</Text>
      </Pressable>
    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTINE COMPLIANCE SECTION
// ═══════════════════════════════════════════════════════════════════════════════

function RoutineComplianceSection({ data }: { data: RoutineComplianceData }) {
  const { colors, stickers, font } = useTheme()
  const [showModal, setShowModal] = useState(false)
  const adherenceRate = 100 - data.skipRate
  const adherenceColor =
    adherenceRate >= 70 ? stickers.green :
    adherenceRate >= 40 ? stickers.coral :
    stickers.coral
  const tint = adherenceRate >= 70 ? stickers.greenSoft : stickers.peachSoft

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
                Routine Compliance
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
                  {' '}skips
                </Text>
              </>
            ) : (
              <Text style={[styles.pillarPaperOf, { color: colors.textMuted }]}>
                —
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
            Tap for details
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
  const { colors, stickers, font } = useTheme()
  const insets = useSafeAreaInsets()
  const sheetH = SCREEN_H * 0.78

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
                  Routine Compliance
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
            <View
              style={[
                styles.routineExpand,
                { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 0 },
              ]}
            >
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
                adherence
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
                total skips
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
                SKIPS PER DAY
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
                MOST SKIPPED
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
                        {item.count}×
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
              No skipped routines this week
            </Text>
          )}
            </View>
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
  const { colors, stickers, font } = useTheme()
  const config = PILLAR_CONFIG[pillarKey]
  const safeValue = Number.isFinite(score.value) ? score.value : 0
  const pct = score.hasData ? Math.max(0, Math.min(100, (safeValue / 10) * 100)) : 0
  const palette = pillarPalette(pillarKey, stickers)

  // Prefer the data-driven tip body; fall back to a generic takeaway.
  const body = tip
    ? tip.body
    : score.hasData
    ? 'Tap to see details.'
    : 'No data logged yet.'

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
              —
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
          Tap for details
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
  const insets = useSafeAreaInsets()
  if (!pillarKey) return null
  const config = PILLAR_CONFIG[pillarKey]
  const score = analytics.scores[pillarKey]
  const palette = pillarPalette(pillarKey, stickers)

  const sheetH = SCREEN_H * 0.87

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

          {/* Header — paper-sticker redesign */}
          <View style={[styles.modalHeader, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingBottom: 16 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 999,
                  backgroundColor: palette.tint,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {renderPillarSticker(stickerForPillar(pillarKey), palette.chip, 26)}
              </View>
              <View>
                <Text
                  style={[
                    styles.modalTitle,
                    { color: colors.text, fontFamily: font.display },
                  ]}
                >
                  {config.label}
                </Text>
                {score.hasData && (
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 13,
                      fontFamily: font.body,
                    }}
                  >
                    {score.value.toFixed(1)}/10 — {score.label}
                  </Text>
                )}
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={[styles.modalClose, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}>
              <X size={16} color={colors.text} strokeWidth={2} />
            </Pressable>
          </View>

          {/* Scrollable content — flex:1 fills the remaining sheet height */}
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: insets.bottom + 24, gap: 16 }}
          >
            <PillarDetail
              pillarKey={pillarKey}
              analytics={analytics}
              chartW={chartW}
              onFullScreen={onFullScreen}
              childName={childName}
              ageMonths={ageMonths}
            />
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
  const [showModal, setShowModal] = useState(false)
  const ACTIVITY_COLOR = '#FF6B35'

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
          <Text style={[styles.pillarName, { color: colors.text }]}>Activity</Text>
          <Text style={[styles.pillarTakeaway, { color: colors.textMuted }]} numberOfLines={2}>{target}</Text>
          <Text style={[{ fontSize: 11, fontWeight: '500', fontFamily: 'DMSans_500Medium', color: colors.textMuted, marginTop: 2 }]} numberOfLines={2}>{tip}</Text>
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
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const ACTIVITY_COLOR = '#FF6B35'

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
                <Text style={[styles.modalTitle, { color: colors.text }]}>Activity Guide</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '500', fontFamily: 'DMSans_500Medium' }}>
                  {childName} · recommended split
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
                <Emoji size={26}>{item.emoji}</Emoji>
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', fontFamily: 'DMSans_600SemiBold' }}>{item.label}</Text>
                    <Text style={{ color: ACTIVITY_COLOR, fontSize: 18, fontWeight: '900', fontFamily: 'Fraunces_600SemiBold' }}>{item.pct}%</Text>
                  </View>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: ACTIVITY_COLOR + '15', overflow: 'hidden' }}>
                    <View style={{ width: `${item.pct}%`, height: '100%', backgroundColor: ACTIVITY_COLOR + 'CC', borderRadius: 3 }} />
                  </View>
                  <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '500', fontFamily: 'DMSans_500Medium' }}>{item.tip}</Text>
                </View>
              </View>
            ))}

            <View style={{ backgroundColor: ACTIVITY_COLOR + '10', borderRadius: radius.xl, padding: 16, borderWidth: 1, borderColor: ACTIVITY_COLOR + '25', flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <Emoji size={18}>💡</Emoji>
              <Text style={{ flex: 1, color: ACTIVITY_COLOR, fontSize: 13, fontWeight: '700', fontFamily: 'DMSans_600SemiBold' }}>
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

function ScoreMathCard({ title, steps, final, color }: {
  title: string
  steps: MathStep[]
  final: { label: string; value: string }
  color: string
}) {
  const { colors, font } = useTheme()
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 26,
        padding: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text
        style={{
          color: colors.textMuted,
          fontFamily: font.bodySemiBold,
          fontSize: 10,
          letterSpacing: 2,
          textTransform: 'uppercase',
        }}
      >
        Score math
      </Text>
      <Text
        style={{
          color: colors.text,
          fontFamily: font.display,
          fontSize: 20,
          lineHeight: 24,
        }}
      >
        {title}
      </Text>
      <View style={{ gap: 10, marginTop: 4 }}>
        {steps.map((s, i) => (
          <View key={i} style={{ gap: 3 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text style={{ color: colors.textSecondary, fontFamily: font.bodySemiBold, fontSize: 13 }}>
                {s.label}
              </Text>
              <Text style={{ color: colors.text, fontFamily: font.display, fontSize: 16 }}>
                {s.value}
              </Text>
            </View>
            <Text style={{ color: colors.textMuted, fontFamily: font.body, fontSize: 12, lineHeight: 16 }}>
              {s.formula}
            </Text>
          </View>
        ))}
      </View>
      <View
        style={{
          marginTop: 6,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <Text style={{ color: colors.text, fontFamily: font.bodySemiBold, fontSize: 14 }}>
          {final.label}
        </Text>
        <Text style={{ color, fontFamily: font.display, fontSize: 26 }}>
          {final.value}
        </Text>
      </View>
    </View>
  )
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
          <View style={[styles.statRow, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
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
          <View style={[{ backgroundColor: colors.surfaceRaised, borderRadius: radius.xl, padding: 16, gap: 8 }]}>
            <Text style={[styles.detailExplain, { color: colors.text, fontWeight: '700', fontFamily: 'DMSans_600SemiBold' }]}>
              How this score works
            </Text>
            {isMilkPhase ? (
              <>
                <Text style={[styles.detailExplain, { color: colors.textSecondary }]}>
                  {`At ${getAgeLabel(ageMonths)}, ${childName} is on milk feeds only. Score reflects feed frequency vs the age target of ${nutr.feedTarget} feeds/day, and how consistently you're logging.`}
                </Text>
                <Text style={[styles.detailExplain, { color: colors.textSecondary }]}>
                  {`${totalBreast} breast session${totalBreast !== 1 ? 's' : ''} · ${totalBottle} bottle${totalBottle !== 1 ? 's' : ''}${totalBottleMl > 0 ? ` (${Math.round(totalBottleMl)}ml total)` : ''} logged across ${daysLogged} of ${windowDays} days.`}
                </Text>
                {daysLogged < Math.min(5, windowDays) && (
                  <Text style={[styles.detailExplain, { color: brand.accent }]}>
                    Log every feed to keep this score accurate — newborns feed 6–10× per day.
                  </Text>
                )}
              </>
            ) : isMixedPhase ? (
              <>
                <Text style={[styles.detailExplain, { color: colors.textSecondary }]}>
                  {`At ${getAgeLabel(ageMonths)}, ${childName} is transitioning to solids. Score = milk feed frequency (60%) + solid-food variety (40%).`}
                </Text>
                <Text style={[styles.detailExplain, { color: colors.textSecondary }]}>
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
                <Text style={[styles.detailExplain, { color: colors.textSecondary }]}>
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
            <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
              <Text style={[styles.chartTitle, { color: colors.text }]}>Breast vs Bottle</Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
                <View style={{ flex: 1, alignItems: 'center', padding: 16, backgroundColor: colors.surfaceRaised, borderRadius: radius.lg }}>
                  <Text style={{ color: PILLAR_CONFIG.nutrition.color, fontSize: 28, fontFamily: 'Fraunces_600SemiBold' }}>{totalBreast}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, fontFamily: 'DMSans_500Medium', marginTop: 4 }}>breast sessions</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'center', padding: 16, backgroundColor: colors.surfaceRaised, borderRadius: radius.lg }}>
                  <Text style={{ color: brand.secondary, fontSize: 28, fontFamily: 'Fraunces_600SemiBold' }}>{totalBottle}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, fontFamily: 'DMSans_500Medium', marginTop: 4 }}>
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
            <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
              <Text style={[styles.chartTitle, { color: colors.text }]}>Most Logged Foods</Text>
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
                      <Text style={{ color: rankColor(i), fontSize: 12, fontWeight: '900', fontFamily: 'Fraunces_600SemiBold' }}>#{i + 1}</Text>
                    </View>
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', fontFamily: 'DMSans_600SemiBold', flex: 1 }}>{food.label}</Text>
                    <View style={{ backgroundColor: PILLAR_CONFIG.nutrition.color + '20', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 }}>
                      <Text style={{ color: PILLAR_CONFIG.nutrition.color, fontSize: 14, fontWeight: '800', fontFamily: 'Fraunces_600SemiBold' }}>×{food.count}</Text>
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
          <View style={[styles.statRow, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            <StatPill label="Avg/night" value={`${avg.toFixed(1)}h`} color={PILLAR_CONFIG.sleep.color} />
            <StatPill label="Quality" value={getBestQuality(analytics.sleep.qualityCounts)} color={brand.success} />
            <StatPill label="Target" value={`${target}h`} color={colors.textMuted} />
          </View>

          {/* Explanation */}
          <View style={[{ backgroundColor: colors.surfaceRaised, borderRadius: radius.xl, padding: 16, gap: 8 }]}>
            <Text style={[styles.detailExplain, { color: colors.text, fontWeight: '700', fontFamily: 'DMSans_600SemiBold' }]}>
              How this score works
            </Text>
            <Text style={[styles.detailExplain, { color: colors.textSecondary }]}>
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
          <Text style={[styles.detailExplain, { color: colors.textSecondary }]}>
            Mood score weights: happy/calm = positive, energetic = neutral-positive, fussy/cranky = negative. More consistent logging improves accuracy.
          </Text>

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
          <View style={[styles.statRow, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            <StatPill label="Vaccines done" value={`${doneVaccines}/${totalVaccines}`} color={brand.success} />
            <StatPill label="Events this week" value={`${totalEvents}`} color={totalEvents === 0 ? brand.success : brand.accent} />
            <StatPill label="Completion" value={`${vaccinePct}%`} color={PILLAR_CONFIG.health.color} />
          </View>

          {/* Health score explanation */}
          <View style={[{ backgroundColor: colors.surfaceRaised, borderRadius: radius.xl, padding: 16, gap: 8 }]}>
            <Text style={[styles.detailExplain, { color: colors.text, fontWeight: '700', fontFamily: 'DMSans_600SemiBold' }]}>How this score works</Text>
            <Text style={[styles.detailExplain, { color: colors.textSecondary }]}>
              {`Health score = vaccine completion (60%) + low health incidents (40%). ${doneVaccines}/${totalVaccines} vaccines logged. ${totalEvents === 0 ? 'No health events this week — great!' : `${totalEvents} health event${totalEvents !== 1 ? 's' : ''} logged this week.`}`}
            </Text>
          </View>

          {(() => {
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
            <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
              <Text style={[styles.chartTitle, { color: colors.text }]}>Recent Events</Text>
              {Object.entries(eventsByType).map(([type, events]) => (
                <View key={type} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Emoji size={14}>{getHealthEventEmoji(type)}</Emoji>
                    <Text style={{ color: getEventColor(type), fontSize: 12, fontWeight: '800', fontFamily: 'Fraunces_600SemiBold', letterSpacing: 1 }}>
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
          <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            <View style={styles.row}>
              <Syringe size={20} color={PILLAR_CONFIG.health.color} strokeWidth={2} />
              <Text style={[styles.chartTitle, { color: colors.text, marginBottom: 0 }]}>Vaccine Tracker</Text>
            </View>
            {/* Progress bar */}
            <View style={{ height: 6, borderRadius: 3, marginTop: 10, marginBottom: 14, overflow: 'hidden', backgroundColor: brand.success + '20' }}>
              <View style={{ width: `${vaccinePct}%`, height: '100%', backgroundColor: brand.success, borderRadius: 3 }} />
            </View>
            <Text style={[styles.detailExplain, { color: colors.textSecondary, marginBottom: 12 }]}>
              {`${doneVaccines}/${totalVaccines} logged as completed`}
            </Text>
            <View style={styles.vaccineGrid}>
              {analytics.health.vaccines.map((v, i) => (
                <View
                  key={i}
                  style={[styles.vaccineChip, {
                    backgroundColor: v.done ? brand.success + '15' : colors.surfaceRaised,
                    borderColor: v.done ? brand.success + '40' : colors.border,
                    borderRadius: radius.full,
                  }]}
                >
                  {v.done && <Shield size={14} color={brand.success} strokeWidth={2.5} />}
                  <Text style={[styles.vaccineText, { color: v.done ? brand.success : colors.textMuted }]}>{v.name}</Text>
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
          <Text style={[styles.detailExplain, { color: colors.textSecondary }]}>
            Track {childName}'s weight and height over time. Log measurements after each pediatrician visit for the most accurate growth chart.
          </Text>

          {(() => {
            const growthScore = analytics.scores.growth
            const totalMeasurements = analytics.growth.weights.length + analytics.growth.heights.length
            const measureScore = Math.min(totalMeasurements / 4, 1) * 7
            const sevenDaysAgo = new Date()
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
            const recentDate = sevenDaysAgo.toISOString().split('T')[0]
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
          {(analytics.growth.weights.length >= 1 || analytics.growth.heights.length >= 1) && (
            <View style={[styles.statRow, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
              {analytics.growth.weights.length >= 1 && (
                <StatPill
                  label={`Weight (${new Date(analytics.growth.weights.at(-1)!.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`}
                  value={`${analytics.growth.weights.at(-1)!.value}kg`}
                  color={PILLAR_CONFIG.health.color}
                />
              )}
              {analytics.growth.heights.length >= 1 && (
                <StatPill
                  label={`Height (${new Date(analytics.growth.heights.at(-1)!.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`}
                  value={`${analytics.growth.heights.at(-1)!.value}cm`}
                  color={PILLAR_CONFIG.growth.color}
                />
              )}
            </View>
          )}

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
            <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl, alignItems: 'center', paddingVertical: 20 }]}>
              <TrendingUp size={24} color={colors.textMuted} strokeWidth={1.5} />
              <Text style={[styles.emptyText, { color: colors.textMuted, marginTop: 8 }]}>
                Add at least 2 measurements to see a growth chart. Log more from Calendar → Growth.
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
          <View style={[styles.statRow, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            <StatPill label="Active days" value={act.hasData ? `${act.activeDays}/7` : '—'} color={COLOR} />
            <StatPill label="Sessions" value={act.hasData ? `${act.totalSessions}` : '—'} color={brand.secondary} />
            <StatPill label="Types" value={act.hasData ? `${act.uniqueTypes.length}` : '—'} color={brand.accent} />
          </View>

          {/* Explanation */}
          <View style={[{ backgroundColor: colors.surfaceRaised, borderRadius: radius.xl, padding: 16, gap: 8 }]}>
            <Text style={[styles.detailExplain, { color: colors.text, fontWeight: '700', fontFamily: 'DMSans_600SemiBold' }]}>How this score works</Text>
            <Text style={[styles.detailExplain, { color: colors.textSecondary }]}>
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

          {/* Age-appropriate guide */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>Recommended Activity Split</Text>
            <View style={{ gap: 12, marginTop: 4 }}>
              {guideItems.map((item) => (
                <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Emoji size={22}>{item.emoji}</Emoji>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700', fontFamily: 'DMSans_600SemiBold' }}>{item.label}</Text>
                      <Text style={{ color: COLOR, fontSize: 15, fontWeight: '900', fontFamily: 'Fraunces_600SemiBold' }}>{item.pct}%</Text>
                    </View>
                    <View style={{ height: 5, borderRadius: 3, backgroundColor: COLOR + '18', overflow: 'hidden' }}>
                      <View style={{ width: `${item.pct}%`, height: '100%', backgroundColor: COLOR + 'CC', borderRadius: 3 }} />
                    </View>
                    <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '500', fontFamily: 'DMSans_500Medium' }}>{item.tip}</Text>
                  </View>
                </View>
              ))}
            </View>
            <View style={{ backgroundColor: COLOR + '10', borderRadius: 12, padding: 12, marginTop: 12, borderWidth: 1, borderColor: COLOR + '25' }}>
              <Text style={{ color: COLOR, fontSize: 12, fontWeight: '700', fontFamily: 'DMSans_600SemiBold' }}>
                {ageMonths < 12
                  ? '📋 Aim for 20–30 min tummy time daily, spread across sessions.'
                  : ageMonths < 36
                  ? '📋 WHO recommends 180 min of activity/day for toddlers, spread throughout.'
                  : '📋 WHO recommends 60 min of moderate-to-vigorous activity daily for children 3+.'}
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
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
      <Pressable onPress={onExpand} style={styles.chartHeader}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>{title}</Text>
        <ChevronRight size={16} color={colors.textMuted} />
      </Pressable>
      <View style={styles.chartBody}>{children}</View>
    </View>
  )
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  const { colors, radius } = useTheme()
  return (
    <View style={[styles.statPill, { backgroundColor: color + '12', borderRadius: radius.xl }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  )
}

function EmptyDetail({ pillar }: { pillar: PillarKey }) {
  const { colors, radius } = useTheme()
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
  return (
    <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
      <Icon size={20} color={colors.textMuted} />
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>{messages[pillar]}</Text>
    </View>
  )
}

// ─── Chart Sub-components ─────────────────────────────────────────────────────

function StackedBarChart({ good, little, none, labels, width = 300, height = 200 }: {
  good: number[]; little: number[]; none: number[]; labels: string[]; width?: number; height?: number
}) {
  const { colors } = useTheme()
  const leftPad = 40, rightPad = 16, topPad = 28, bottomPad = 8
  const chartW = width - leftPad - rightPad
  const chartH = height - topPad - bottomPad
  const count = good.length
  const maxVal = Math.max(...good.map((g, i) => g + little[i] + none[i]), 1)
  const barW = Math.min(36, chartW / count - 10)
  const barR = Math.min(8, barW / 3)

  // Y-axis ticks
  const ticks = [0, Math.round(maxVal / 2), maxVal]

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="stackGood" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={brand.success} stopOpacity="1" />
            <Stop offset="1" stopColor={brand.success} stopOpacity="0.55" />
          </LinearGradient>
          <LinearGradient id="stackLittle" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={brand.accent} stopOpacity="1" />
            <Stop offset="1" stopColor={brand.accent} stopOpacity="0.6" />
          </LinearGradient>
          <LinearGradient id="stackNone" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={brand.error} stopOpacity="0.85" />
            <Stop offset="1" stopColor={brand.error} stopOpacity="0.45" />
          </LinearGradient>
        </Defs>

        {/* Grid lines + Y labels */}
        {ticks.map((tick, i) => {
          const y = topPad + chartH - (tick / maxVal) * chartH
          return (
            <G key={`grid-${i}`}>
              <Line
                x1={leftPad} y1={y} x2={width - rightPad} y2={y}
                stroke={colors.border} strokeWidth={0.5} opacity={0.3}
                strokeDasharray={i === 0 ? undefined : '4,4'}
              />
              <SvgText x={leftPad - 10} y={y + 4} fill={colors.textMuted} fontSize={11} fontWeight="600" textAnchor="end">
                {tick}
              </SvgText>
            </G>
          )
        })}

        {/* Stacked bars */}
        {good.map((g, i) => {
          const x = leftPad + (i + 0.5) * (chartW / count) - barW / 2
          const baseY = topPad + chartH
          const gH = (g / maxVal) * chartH
          const lH = (little[i] / maxVal) * chartH
          const nH = (none[i] / maxVal) * chartH
          const totalH = gH + lH + nH

          // Build stacked segments with rounded top on topmost segment
          const topR = totalH > barR * 2 ? barR : Math.min(totalH / 2, barR)
          const topY = baseY - totalH

          return (
            <G key={i}>
              {/* Determine which is the topmost segment for rounded corners */}
              {(() => {
                const hasN = nH > 0, hasL = lH > 0, hasG = gH > 0
                const topSeg = hasN ? 'none' : hasL ? 'little' : 'good'
                const segments: { fill: string; y0: number; h: number }[] = []
                if (hasG) segments.push({ fill: 'url(#stackGood)', y0: baseY - gH, h: gH })
                if (hasL) segments.push({ fill: 'url(#stackLittle)', y0: baseY - gH - lH, h: lH })
                if (hasN) segments.push({ fill: 'url(#stackNone)', y0: topY, h: nH })

                return segments.map((seg, si) => {
                  const isTop = (seg.fill.includes('Good') && topSeg === 'good')
                    || (seg.fill.includes('Little') && topSeg === 'little')
                    || (seg.fill.includes('None') && topSeg === 'none')

                  if (isTop && seg.h > 2) {
                    const r = Math.min(topR, seg.h / 2)
                    return (
                      <Path key={si} d={`
                        M ${x} ${seg.y0 + seg.h}
                        L ${x} ${seg.y0 + r}
                        Q ${x} ${seg.y0}, ${x + r} ${seg.y0}
                        L ${x + barW - r} ${seg.y0}
                        Q ${x + barW} ${seg.y0}, ${x + barW} ${seg.y0 + r}
                        L ${x + barW} ${seg.y0 + seg.h}
                        Z
                      `} fill={seg.fill} />
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
        <LegendDot color={brand.success} label="Ate well" />
        <LegendDot color={brand.accent} label="A little" />
        <LegendDot color={brand.error} label="Didn't eat" />
      </View>
    </View>
  )
}

function EatQualityBubbles({
  good, little, none,
}: {
  good: number[]
  little: number[]
  none: number[]
}) {
  const { colors } = useTheme()
  const totalGood = good.reduce((a, b) => a + b, 0)
  const totalLittle = little.reduce((a, b) => a + b, 0)
  const totalNone = none.reduce((a, b) => a + b, 0)
  const total = totalGood + totalLittle + totalNone
  if (total === 0) return null

  const pctGood = Math.round((totalGood / total) * 100)
  const pctLittle = Math.round((totalLittle / total) * 100)
  const pctNone = 100 - pctGood - pctLittle

  const items = [
    { label: 'Ate well', pct: pctGood, color: brand.success },
    { label: 'A little', pct: pctLittle, color: brand.accent },
    { label: "Didn't eat", pct: pctNone, color: brand.error },
  ].filter((i) => i.pct > 0)

  const maxPct = Math.max(...items.map((i) => i.pct), 1)

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 20, paddingVertical: 16 }}>
      {items.map((item) => {
        const size = 56 + (item.pct / maxPct) * 52 // 56–108px
        return (
          <View key={item.label} style={{ alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: size, height: size, borderRadius: size / 2,
                backgroundColor: item.color + '20',
                borderWidth: 2, borderColor: item.color + '50',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ color: item.color, fontSize: size > 80 ? 20 : 16, fontWeight: '900', fontFamily: 'Fraunces_600SemiBold' }}>
                {item.pct}%
              </Text>
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600', fontFamily: 'DMSans_600SemiBold', textAlign: 'center', maxWidth: size + 8 }}>
              {item.label}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

function MealsLineChart({
  data, labels, width,
}: {
  data: number[]
  labels: string[]
  width: number
}) {
  const { colors } = useTheme()
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const color = PILLAR_CONFIG.nutrition.color

  const leftPad = 32
  const rightPad = 16
  const topPad = 32
  const bottomPad = 8
  const svgH = 160
  const innerW = width - leftPad - rightPad
  const innerH = svgH - topPad - bottomPad

  const maxV = Math.max(...data, 1)
  const nonZeroData = data.some((v) => v > 0)

  const pts = data.map((v, i) => ({
    x: leftPad + (i / Math.max(data.length - 1, 1)) * innerW,
    y: topPad + innerH - (v / maxV) * innerH,
    v,
  }))

  const curvePath = nonZeroData ? smoothPath(pts) : ''
  const areaPath = nonZeroData
    ? curvePath + ` L ${pts[pts.length - 1].x} ${topPad + innerH} L ${pts[0].x} ${topPad + innerH} Z`
    : ''

  return (
    <View>
      <View>
        <Svg width={width} height={svgH}>
          <Defs>
            <LinearGradient id="mealsAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity="0.18" />
              <Stop offset="1" stopColor={color} stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* Area fill */}
          {nonZeroData && <Path d={areaPath} fill="url(#mealsAreaGrad)" />}

          {/* Smooth line */}
          {nonZeroData && (
            <Path d={curvePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* Y-axis max label */}
          <SvgText x={leftPad - 6} y={topPad + 4} fill={colors.textMuted} fontSize={11} fontWeight="600" textAnchor="end">
            {maxV}
          </SvgText>
          <SvgText x={leftPad - 6} y={topPad + innerH + 4} fill={colors.textMuted} fontSize={11} fontWeight="600" textAnchor="end">
            0
          </SvgText>

          {/* Point circles — outer ring + filled inner dot (no SVG emoji, not reliable) */}
          {pts.map((p, i) => (
            <G key={i}>
              <Circle
                cx={p.x} cy={p.y} r={selectedDay === i ? 20 : 15}
                fill={selectedDay === i ? color + '30' : color + '15'}
                stroke={selectedDay === i ? color : color + '60'}
                strokeWidth={1.5}
              />
              <Circle
                cx={p.x} cy={p.y} r={selectedDay === i ? 6 : 4.5}
                fill={color}
              />
            </G>
          ))}
        </Svg>

        {/* Pressable overlay for each point */}
        <View style={[StyleSheet.absoluteFill, { flexDirection: 'row' }]}>
          {pts.map((p, i) => (
            <Pressable
              key={i}
              onPress={() => setSelectedDay(selectedDay === i ? null : i)}
              style={{ position: 'absolute', left: p.x - 20, top: p.y - 20, width: 40, height: 40 }}
            />
          ))}
        </View>
      </View>

      {/* X-axis labels */}
      <View style={{ flexDirection: 'row', paddingLeft: leftPad, paddingRight: rightPad, marginTop: 4 }}>
        {labels.map((label, i) => (
          <Text
            key={i}
            style={{
              flex: 1, textAlign: 'center', fontSize: 12, fontWeight: selectedDay === i ? '800' : '600',
              color: selectedDay === i ? color : colors.textMuted,
            }}
          >
            {label}
          </Text>
        ))}
      </View>

      {/* Tap tooltip */}
      {selectedDay !== null && (
        <View style={{ backgroundColor: color + '15', borderRadius: 12, padding: 12, marginTop: 10, borderWidth: 1, borderColor: color + '30' }}>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', fontFamily: 'DMSans_600SemiBold' }}>
            <Text style={{ color, fontWeight: '800', fontFamily: 'Fraunces_600SemiBold' }}>{labels[selectedDay]}: </Text>
            {data[selectedDay] === 0
              ? 'No meals logged'
              : `${data[selectedDay]} meal${data[selectedDay] !== 1 ? 's' : ''} logged`}
          </Text>
        </View>
      )}
    </View>
  )
}

function HighlightBarChart({
  data, labels, color, width = 300, height = 180,
}: {
  data: number[]
  labels: string[]
  color: string
  width?: number
  height?: number
}) {
  const { colors } = useTheme()
  if (data.length === 0) return null

  const leftPad = 40
  const rightPad = 16
  const topPad = 28
  const bottomPad = 8
  const chartW = width - leftPad - rightPad
  const chartH = height - topPad - bottomPad

  const maxV = Math.max(...data, 0.1)
  const maxIdx = data.indexOf(maxV)
  const ticks = [0, Math.round(maxV / 2), Math.round(maxV)]
  const barW = Math.min(36, chartW / data.length - 10)
  const barR = Math.min(8, barW / 3)

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="hlBarHigh" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="1" />
            <Stop offset="1" stopColor={color} stopOpacity="0.55" />
          </LinearGradient>
          <LinearGradient id="hlBarLow" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.45" />
            <Stop offset="1" stopColor={color} stopOpacity="0.2" />
          </LinearGradient>
        </Defs>

        {/* Grid lines */}
        {ticks.map((tick, i) => {
          const y = topPad + chartH - (tick / maxV) * chartH
          return (
            <G key={i}>
              <Line x1={leftPad} y1={y} x2={width - rightPad} y2={y} stroke={colors.border} strokeWidth={0.5} opacity={0.3} strokeDasharray={i === 0 ? undefined : '4,4'} />
              <SvgText x={leftPad - 10} y={y + 4} fill={colors.textMuted} fontSize={11} fontWeight="600" textAnchor="end">
                {tick}
              </SvgText>
            </G>
          )
        })}

        {/* Bars */}
        {data.map((v, i) => {
          const rawH = v > 0 ? Math.max((v / maxV) * chartH, 4) : 4
          const x = leftPad + (i + 0.5) * (chartW / data.length) - barW / 2
          const y = topPad + chartH - rawH
          const isMax = i === maxIdx && v > 0
          const rTop = rawH > barR * 2 ? barR : Math.min(rawH / 2, barR)
          const barPath = `M ${x} ${y + rawH} L ${x} ${y + rTop} Q ${x} ${y}, ${x + rTop} ${y} L ${x + barW - rTop} ${y} Q ${x + barW} ${y}, ${x + barW} ${y + rTop} L ${x + barW} ${y + rawH} Z`

          return (
            <G key={i}>
              {isMax && (
                <Path d={barPath} fill={color} opacity={0.12} transform={`translate(0, 2) scale(1.05, 1)`} />
              )}
              <Path d={barPath} fill={isMax ? 'url(#hlBarHigh)' : 'url(#hlBarLow)'} />
              {isMax && v > 0 && (
                <>
                  <Rect x={x - 4} y={y - 22} width={barW + 8} height={18} rx={4} fill={color} opacity={0.15} />
                  <SvgText x={x + barW / 2} y={y - 9} fill={color} fontSize={12} fontWeight="900" textAnchor="middle">
                    {v % 1 === 0 ? v : v.toFixed(1)}h
                  </SvgText>
                </>
              )}
              {!isMax && v > 0 && (
                <SvgText x={x + barW / 2} y={y - 6} fill={colors.textMuted} fontSize={11} fontWeight="600" textAnchor="middle">
                  {v % 1 === 0 ? v : v.toFixed(1)}
                </SvgText>
              )}
            </G>
          )
        })}
      </Svg>

      {/* X labels */}
      <View style={[styles.labelRow, { width, paddingLeft: leftPad, paddingRight: rightPad }]}>
        {labels.map((l, i) => (
          <Text key={i} style={[styles.label, { color: i === maxIdx && data[i] > 0 ? color : colors.textMuted, fontWeight: i === maxIdx && data[i] > 0 ? '800' : '600' }]}>
            {l}
          </Text>
        ))}
      </View>
    </View>
  )
}

function SleepQualityChart({ counts }: { counts: { great: number; good: number; restless: number; poor: number } }) {
  const { colors, radius } = useTheme()
  const total = counts.great + counts.good + counts.restless + counts.poor
  if (total === 0) return null
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
            <Emoji size={22}>{item.emoji}</Emoji>
            <Text style={[styles.qualityLabel, { color: colors.textSecondary }]}>{item.label}</Text>
            <View style={[styles.qualityBarBg, { backgroundColor: colors.surfaceRaised, borderRadius: radius.full }]}>
              <View style={[styles.qualityBarFill, { width: `${pct}%`, backgroundColor: item.color, borderRadius: radius.full }]} />
            </View>
            <Text style={[styles.qualityPct, { color: item.color }]}>{pct}%</Text>
          </View>
        )
      })}
    </View>
  )
}

function MoodDistribution({ moods }: { moods: { mood: string; count: number }[] }) {
  const { colors, radius } = useTheme()
  const total = moods.reduce((a, m) => a + m.count, 0)
  return (
    <View style={styles.moodDistWrap}>
      {moods.map((m, i) => {
        const pct = Math.round((m.count / total) * 100)
        const color = MOOD_COLORS[m.mood] || colors.primary
        return (
          <View key={i} style={[styles.moodChip, { backgroundColor: color + '15', borderColor: color + '30', borderRadius: radius.xl }]}>
            <MoodFace size={18} variant={moodFaceVariant(m.mood)} fill={moodFaceFill(m.mood)} />
            <Text style={[styles.moodLabel, { color }]}>{m.mood}</Text>
            <Text style={[styles.moodPct, { color: colors.textSecondary }]}>{pct}%</Text>
          </View>
        )
      })}
    </View>
  )
}

function MoodDailyChart({ dailyCounts, labels, width }: { dailyCounts: Record<string, number[]>; labels: string[]; width: number }) {
  const { colors } = useTheme()
  const days = labels.length
  const moods = Object.keys(dailyCounts)
  const colW = width / days
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', width }}>
        {labels.map((label, dayIdx) => {
          const dayMoods = moods.filter((m) => dailyCounts[m][dayIdx] > 0)
          return (
            <View key={dayIdx} style={{ width: colW, alignItems: 'center', gap: 6, paddingVertical: 10 }}>
              {dayMoods.length > 0 ? dayMoods.map((mood) => {
                const count = dailyCounts[mood][dayIdx]
                const color = MOOD_COLORS[mood] || colors.primary
                return Array.from({ length: Math.min(count, 3) }).map((_, dotIdx) => (
                  <View key={`${mood}-${dotIdx}`} style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: color + '30', borderWidth: 1.5, borderColor: color + '50', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <MoodFace size={20} variant={moodFaceVariant(mood)} fill={moodFaceFill(mood)} />
                  </View>
                ))
              }) : (
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border }} />
              )}
              <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
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
  screenTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5, fontFamily: 'Fraunces_600SemiBold' },
  screenSub: { fontSize: 14, fontWeight: '500', fontFamily: 'DMSans_500Medium', marginTop: 2 },
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
  childChipName: { fontSize: 15, fontWeight: '700', fontFamily: 'DMSans_600SemiBold' },
  childChipAge: { fontSize: 12, fontWeight: '500', fontFamily: 'DMSans_500Medium' },

  // Arc
  arcContainer: { alignItems: 'center', marginTop: 8, overflow: 'visible' },
  arcLegend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 6 },
  arcTooltip: { marginTop: 10, padding: 16, borderWidth: 1, gap: 8, width: '100%' },
  arcTooltipHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  arcTooltipIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  arcTooltipTitle: { fontSize: 16, fontWeight: '800', fontFamily: 'Fraunces_600SemiBold' },
  arcTooltipBody: { fontSize: 14, fontWeight: '500', fontFamily: 'DMSans_500Medium', lineHeight: 20 },
  arcInfoHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, paddingVertical: 4 },
  arcInfoText: { fontSize: 12, fontWeight: '500', fontFamily: 'DMSans_500Medium' },

  // Insight card
  insightCard: { padding: 16, gap: 10 },
  insightHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  insightBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  insightBadgeText: { fontSize: 12, fontWeight: '700', fontFamily: 'DMSans_600SemiBold' },
  insightDate: { fontSize: 11, fontWeight: '500', fontFamily: 'DMSans_500Medium' },
  insightMessage: { fontSize: 14, fontWeight: '600', fontFamily: 'DMSans_600SemiBold', lineHeight: 21 },
  insightButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 20, alignSelf: 'flex-start' },
  insightButtonText: { fontSize: 14, fontWeight: '700', fontFamily: 'DMSans_600SemiBold' },

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
  tipsSectionTitle: { fontSize: 12, fontWeight: '900', fontFamily: 'Fraunces_600SemiBold', letterSpacing: 2 },
  tipsSectionSub: { fontSize: 13, fontWeight: '500', fontFamily: 'DMSans_500Medium' },
  tipsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tipCard: { width: (SCREEN_W - 40 - 8) / 2, padding: 12, gap: 8 },
  tipIconWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tipTitle: { fontSize: 13, fontWeight: '800', fontFamily: 'Fraunces_600SemiBold', lineHeight: 18 },
  tipBody: { fontSize: 11, fontWeight: '500', fontFamily: 'DMSans_500Medium', lineHeight: 15 },
  tipTapHint: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  tipTapText: { fontSize: 10, fontWeight: '600', fontFamily: 'DMSans_600SemiBold' },
  askButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: 2 },
  askButtonText: { fontSize: 15, fontWeight: '700', fontFamily: 'DMSans_600SemiBold' },

  // Pillar section
  pillarSection: { gap: 12 },
  pillarSectionTitle: { fontSize: 13, fontWeight: '900', fontFamily: 'Fraunces_600SemiBold', letterSpacing: 2, marginBottom: 4 },
  pillarRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  pillarIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  pillarInfo: { flex: 1, gap: 6 },
  pillarNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pillarName: { fontSize: 16, fontWeight: '700', fontFamily: 'DMSans_600SemiBold' },
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  trendText: { fontSize: 12, fontWeight: '700', fontFamily: 'DMSans_600SemiBold' },
  pillarBarBg: { height: 8, width: '100%', overflow: 'hidden' },
  pillarBarFill: { height: '100%' },
  pillarTakeaway: { fontSize: 12, fontWeight: '500', fontFamily: 'DMSans_500Medium' },
  pillarScoreWrap: { flexDirection: 'row', alignItems: 'baseline', marginRight: 4 },
  pillarScoreValue: { fontSize: 22, fontWeight: '900', fontFamily: 'Fraunces_600SemiBold' },
  pillarScoreOf: { fontSize: 12, fontWeight: '600', fontFamily: 'DMSans_600SemiBold' },

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
  detailExplain: { fontSize: 13, fontFamily: 'DMSans_400Regular', lineHeight: 19, paddingHorizontal: 4 },

  // Chart card
  card: { padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  chartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  chartTitle: { fontSize: 16, fontFamily: 'Fraunces_600SemiBold', marginBottom: 8 },
  chartBody: { alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },


  // Labels & Legend
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  label: { fontSize: 12, fontFamily: 'DMSans_500Medium', textAlign: 'center' },
  legendRow: { flexDirection: 'row', gap: 16, marginTop: 12, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 12, fontFamily: 'DMSans_500Medium' },

  // Events
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  eventDot: { width: 12, height: 12, borderRadius: 6 },
  eventLabel: { fontSize: 15, fontFamily: 'DMSans_500Medium' },
  eventDate: { fontSize: 13, fontFamily: 'DMSans_400Regular' },

  // Vaccines
  vaccineGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  vaccineChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1 },
  vaccineText: { fontSize: 14, fontFamily: 'DMSans_500Medium' },

  // Sleep quality bars
  qualityWrap: { width: '100%', gap: 12, paddingVertical: 6 },
  qualityRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qualityEmoji: { fontSize: 18, width: 28, textAlign: 'center' },
  qualityLabel: { fontSize: 14, fontFamily: 'DMSans_500Medium', width: 64 },
  qualityBarBg: { flex: 1, height: 16, overflow: 'hidden' },
  qualityBarFill: { height: '100%' },
  qualityPct: { fontSize: 14, fontFamily: 'Fraunces_600SemiBold', width: 44, textAlign: 'right' },

  // Mood
  moodDistWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  moodChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1 },
  moodEmoji: { fontSize: 18 },
  moodLabel: { fontSize: 14, fontFamily: 'DMSans_600SemiBold', textTransform: 'capitalize' },
  moodPct: { fontSize: 13, fontFamily: 'DMSans_500Medium' },

  // Stat row
  statRow: { flexDirection: 'row', gap: 12, padding: 8 },
  statPill: { flex: 1, alignItems: 'center', padding: 16, gap: 6 },
  statValue: { fontSize: 24, fontFamily: 'Fraunces_600SemiBold' },
  statLabel: { fontSize: 12, fontFamily: 'DMSans_500Medium', textAlign: 'center' },

  // Loading / Error / Empty
  loadingWrap: { alignItems: 'center', gap: 10, paddingVertical: 32 },
  loadingText: { fontSize: 14, fontFamily: 'DMSans_500Medium' },
  errorCard: { padding: 20, alignItems: 'center', gap: 10 },
  errorText: { fontSize: 15, fontFamily: 'DMSans_600SemiBold' },
  errorRetry: { fontSize: 14, fontFamily: 'DMSans_500Medium' },
  emptyCard: { padding: 24, alignItems: 'center', gap: 10 },
  emptyText: { fontSize: 14, fontFamily: 'DMSans_500Medium', textAlign: 'center', lineHeight: 20 },
  emptyAll: { padding: 40, alignItems: 'center', gap: 14, marginTop: 16 },
  emptyAllTitle: { fontSize: 20, fontFamily: 'Fraunces_600SemiBold' },
  emptyAllSub: { fontSize: 15, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 22 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { marginHorizontal: 0 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  modalTitle: { fontSize: 22, fontFamily: 'Fraunces_600SemiBold' },
  modalClose: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  // Score info modal
  scoreHighlight: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, marginHorizontal: 20, marginBottom: 20, borderWidth: 1 },
  scoreHighlightNum: { fontSize: 44, fontFamily: 'Fraunces_600SemiBold' },
  scoreHighlightLabel: { fontSize: 16, fontFamily: 'DMSans_600SemiBold' },
  scoreHighlightSub: { fontSize: 13, fontFamily: 'DMSans_400Regular', marginTop: 2 },
  infoSectionLabel: { fontSize: 12, fontFamily: 'DMSans_600SemiBold', letterSpacing: 1.5, marginHorizontal: 20, marginBottom: 10 },
  bandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20 },
  bandDot: { width: 12, height: 12, borderRadius: 6 },
  bandLabel: { flex: 1, fontSize: 15, fontFamily: 'DMSans_500Medium' },
  bandRange: { fontSize: 14, fontFamily: 'DMSans_400Regular' },
  pillarInfoCard: { marginHorizontal: 20, padding: 16, gap: 10 },
  pillarInfoHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pillarInfoIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pillarInfoName: { flex: 1, fontSize: 15, fontFamily: 'DMSans_600SemiBold' },
  pillarInfoWeight: { fontSize: 13, fontFamily: 'DMSans_500Medium' },
  pillarInfoScoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillarInfoScoreText: { fontSize: 14, fontFamily: 'Fraunces_600SemiBold' },
  pillarInfoBody: { fontSize: 13, fontFamily: 'DMSans_400Regular', lineHeight: 19 },
  ageBanner: { marginHorizontal: 20, marginBottom: 10, padding: 18, borderWidth: 1, gap: 8 },
  ageBannerTitle: { fontSize: 15, fontFamily: 'DMSans_600SemiBold' },
  ageBannerBody: { fontSize: 14, fontFamily: 'DMSans_400Regular', lineHeight: 21 },

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
  tipModalTitle: { fontSize: 22, fontFamily: 'Fraunces_600SemiBold', lineHeight: 28 },
  tipModalSummary: { padding: 14 },
  tipModalSummaryText: { fontSize: 15, fontFamily: 'DMSans_500Medium', lineHeight: 22 },
  tipModalDetail: { fontSize: 15, fontFamily: 'DMSans_400Regular', lineHeight: 23 },
  tipAskBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderWidth: 1, marginTop: 4 },
  tipAskBtnText: { fontSize: 16, fontFamily: 'DMSans_600SemiBold' },
})
