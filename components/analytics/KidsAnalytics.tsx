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

import { dateLoc } from '../../lib/kpLocale'
import { fmt1 } from '../../lib/grandmaNotes/shared'
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
  Zap,
  X,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand, font, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../../constants/theme'
import { useIsDiffuse, useScrollBottomInset, SoftBloom } from '../ui/diffuse/DiffuseKit'
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
import { useChildStore } from '../../store/useChildStore'
import { useGrandmaChatEnabled } from '../../store/useFeatureFlags'
import { LineChart, BarChart, BubbleGrid, MoodBubbleCluster } from '../charts/SvgCharts'
import { DotCountRows, MilestoneTrail, type DotRow, SipColumns, MiniBarChart } from './shared/MiniCharts'
import { bucketSeries } from './shared/bucketSeries'
import { FullScreenChart } from '../charts/FullScreenChart'
import {
  useKidsAnalytics,
  type AnalyticsData,
  type SleepData,
  type PillarScore,
  type WellnessScores,
  type RoutineComplianceData,
} from '../../lib/analyticsData'
import { getAgeSleepTarget } from '../../lib/kidsScoring'
import { computeCrossInsights } from '../../lib/kidsCrossInsights'
import {
  buildHealthInsight,
  buildSleepInsight,
  buildNutritionInsight,
  buildMoodInsight,
  buildGrowthInsight,
  buildActivityInsight,
  type PillarInsight,
} from '../../lib/kidsPillarInsights'
import { resolveSex, type Sex } from '../../lib/growthStandards'
import {
  buildInsightHighlights,
  type InsightHighlights,
  LOW_CONF,
} from '../../lib/kidsInsightHighlights'
import { supabase } from '../../lib/supabase'
import { runWellnessNotifications } from '../../lib/notificationEngine'
import { ChildPill, CHILD_COLORS, formatChildAge as sharedFormatChildAge } from '../ui/ChildPills'
import { AnalyticsTitle } from './shared/AnalyticsTitle'
import { buildKidsNote } from '../../lib/grandmaNotes/kids'
import { GrandmaNote, GrandmaNotesTitle, NotesDetailsEyebrow } from '../notes/GrandmaNote'
import { MoodFace } from '../stickers/RewardStickers'
import { moodFaceVariant, moodFaceFill, moodExpression, moodBlobFill } from '../../lib/moodFace'
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
import { Character } from '../characters/Characters'
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
import { GrandmaLogo } from '../ui/GrandmaLogo'
import { useTranslation, t as tNow } from '../../lib/i18n'
import { SiteSticker, type SiteStickerName } from '../stickers/SiteSticker'
import { DetailSheetHeader } from '../ui/DetailSheetHeader'
import { FadeUp } from '../ui/Motion'
import { InsightsDisclaimer } from './shared/InsightsDisclaimer'
import { Skeleton, SkeletonRing } from '../ui/Skeleton'
import { SkeletonStatRows } from './shared/AnalyticsSkeleton'
import { parseLocalDate } from '../../lib/localDate'
import { SheetModal } from '../ui/SheetModal'
import { CenterModal } from '../ui/CenterModal'

const SCREEN_W = Dimensions.get('window').width
const SCREEN_H = Dimensions.get('window').height

// ─── Site look (light rendering only) ──────────────────────────────────────
const MONO = 'SpaceMono_400Regular'
const HAIR = StyleSheet.hairlineWidth * 2

// Pillar → site sticker (+ the soft tone that sits behind it in sheet headers).
const PILLAR_SITE_STICKER: Record<'nutrition' | 'sleep' | 'mood' | 'health' | 'growth' | 'activity', SiteStickerName> = {
  nutrition: 'avocado', sleep: 'moon', mood: 'face3', health: 'thermo', growth: 'ruler', activity: 'shoe',
}
// Old emoji used by the guide lists → the nearest site sticker.
const EMOJI_SITE_STICKER: Record<string, SiteStickerName> = {
  '👶': 'baby', '🧸': 'star', '🚶': 'shoe', '😴': 'zz', '🏃': 'shoe', '🌳': 'leaf',
  '🧩': 'pencil', '📖': 'books', '⚽': 'shoe', '🎨': 'pencil', '📚': 'books',
}
// Pillar colour → its soft tone (for outlined chart bars).
const SOFT_BY_PILLAR_COLOR: Record<string, string> = {
  '#7A9D4A': '#D7F0DD', // nutrition → greenSoft
  '#8E72C9': '#DCCFF9', // sleep → lilacSoft
  '#D87CA0': '#F9CFE0', // mood → pinkSoft
  '#5F8FC1': '#CFE1FA', // health → blueSoft
  '#C9A02C': '#FFF1B8', // growth → yellowSoft
  '#D86A4F': '#FBD3B3', // activity → peachSoft
}
const MOOD_SITE_STICKER: Record<string, SiteStickerName> = {
  happy: 'face4', calm: 'face3', energetic: 'star', fussy: 'face2', cranky: 'face1',
}
const HEALTH_EVENT_STICKER: Record<string, SiteStickerName> = {
  temperature: 'thermo', medicine: 'pill', vaccine: 'syringe', note: 'pencil',
}

/** Light bottom sheet: bg paper, 2.5px ink top border, 26px top radius, grabber at 25% ink. */
function LightSheet({ visible, onClose, height, children }: {
  visible: boolean
  onClose: () => void
  height?: number
  children: React.ReactNode
}) {
  const { colors } = useTheme()
  return (
    // Sheet motion shared with every log sheet: fading backdrop, eased rise, played-out close, drag to close.
    <SheetModal visible={visible} onClose={onClose} avoidKeyboard={false}>
      {(dragZone) => (
        <View
          style={[
            styles.modalSheet,
            {
              height,
              maxHeight: SCREEN_H * 0.92,
              backgroundColor: colors.bg,
              borderTopLeftRadius: 26,
              borderTopRightRadius: 26,
              borderTopWidth: 2.5,
              borderColor: colors.text,
            },
          ]}
        >
          <View {...dragZone} style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 8 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.text, opacity: 0.25 }} />
          </View>
          {children}
        </View>
      )}
    </SheetModal>
  )
}

/** 34px close button: white disc, 2px ink ring. */
function SiteClose({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={tNow('common_close')}
      style={({ pressed }) => [
        { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: colors.text, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
        pressed && { opacity: 0.7 },
      ]}
    >
      <X size={16} color={colors.text} strokeWidth={2.2} />
    </Pressable>
  )
}

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
  nutrition: { get label() { return tNow('kp_ka_p_nutrition') }, color: '#7A9D4A', icon: Utensils },  // sticker green (deepened)
  sleep:     { get label() { return tNow('kp_ka_p_sleep') },     color: '#8E72C9', icon: Moon },      // sticker lilac (deepened)
  mood:      { get label() { return tNow('kp_ka_p_mood') },      color: '#D87CA0', icon: Smile },     // sticker pink (deepened)
  health:    { get label() { return tNow('kp_ka_p_health') },    color: '#5F8FC1', icon: Heart },     // sticker blue (deepened)
  growth:    { get label() { return tNow('kp_ka_p_growth') },    color: '#C9A02C', icon: TrendingUp }, // sticker yellow (deepened)
  activity:  { get label() { return tNow('kp_ka_p_activity') },  color: '#D86A4F', icon: Zap },        // sticker coral (deepened)
} as const

type PillarKey = keyof typeof PILLAR_CONFIG
const PILLAR_ORDER: PillarKey[] = ['nutrition', 'sleep', 'mood', 'health', 'growth', 'activity']

// Playful character-blob glyph per pillar for the editorial band rows (Diffuse).
const PILLAR_LINE_ICON: Record<PillarKey, (size: number, color: string) => React.ReactNode> = {
  nutrition: (s, c) => <Character name="nutrition" size={s} color={c} />,
  sleep:     (s, c) => <Character name="sleep" size={s} color={c} />,
  mood:      (s, c) => <Character name="mood" size={s} color={c} />,
  health:    (s, c) => <Character name="health" size={s} color={c} />,
  growth:    (s, c) => <Character name="growth" size={s} color={c} />,
  activity:  (s, c) => <Character name="activity" size={s} color={c} />,
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
  const bd = parseLocalDate(birthDate)
  const now = new Date()
  return Math.max(0, (now.getFullYear() - bd.getFullYear()) * 12 + (now.getMonth() - bd.getMonth()))
}

function activityGuide(ageMonths: number): { emoji: string; label: string; pct: number; tip: string }[] {
  const g = ageMonths < 12
    ? [['👶', 'Baby1', 35], ['🧸', 'Baby2', 30], ['🚶', 'Baby3', 20], ['😴', 'Baby4', 15]]
    : ageMonths < 36
    ? [['🏃', 'Tod1', 40], ['🌳', 'Tod2', 30], ['🧩', 'Tod3', 20], ['📖', 'Tod4', 10]]
    : [['⚽', 'Kid1', 40], ['🌳', 'Kid2', 25], ['🎨', 'Kid3', 20], ['📚', 'Kid4', 15]]
  return g.map(([emoji, k, pct]) => ({
    emoji: emoji as string,
    pct: pct as number,
    label: tNow(`sw2_an_ag${k}l` as 'sw2_an_agBaby1l'),
    tip: tNow(`sw2_an_ag${k}t` as 'sw2_an_agBaby1t'),
  }))
}

function getAgeLabel(ageMonths: number): string {
  if (ageMonths < 12) return tNow('kp_kh_ageMo', { n: ageMonths })
  const y = Math.floor(ageMonths / 12)
  const m = ageMonths % 12
  return m > 0 ? tNow('kp_kh_ageYMo', { y, r: m }) : tNow('kp_kh_ageY', { y })
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

// ─── Neutral pillar stat (light UI) ─────────────────────────────────────────
// What a pillar row / detail header shows instead of a `/10` grade: a plain
// count or average from the logs, plus how much of the window has logs
// (drives the thin bar — "how much was logged", never "how well").

type PillarStatUnitKey =
  | 'kids_analytics_unit_h_day'
  | 'kids_analytics_unit_meals'
  | 'kids_analytics_unit_feeds'
  | 'kids_analytics_unit_moods'
  | 'kids_analytics_unit_measures'
  | 'kids_analytics_unit_active_days'

interface PillarStat {
  value: string
  unitKey: PillarStatUnitKey
  /** Share of days in the window with at least one log, 0..1. */
  coverage: number
}

function dayCoverage(perDay: number[]): number {
  if (perDay.length === 0) return 0
  return perDay.filter((v) => v > 0).length / perDay.length
}

function pillarStat(key: PillarKey, a: AnalyticsData): PillarStat | null {
  switch (key) {
    case 'sleep':
      if (!a.sleep.hasData) return null
      return { value: fmt1(a.sleep.avgHours), unitKey: 'kids_analytics_unit_h_day', coverage: dayCoverage(a.sleep.dailyHours) }
    case 'nutrition': {
      if (!a.nutrition.hasData) return null
      const total = a.nutrition.mealFrequency.reduce((x, y) => x + y, 0)
      return {
        value: String(total),
        unitKey: a.nutrition.mode === 'milk' ? 'kids_analytics_unit_feeds' : 'kids_analytics_unit_meals',
        coverage: dayCoverage(a.nutrition.mealFrequency),
      }
    }
    case 'mood': {
      if (!a.mood.hasData) return null
      const total = a.mood.dominantMoods.reduce((x, m) => x + m.count, 0)
      const series = Object.values(a.mood.dailyCounts)
      const perDay = (series[0] ?? []).map((_, i) => series.reduce((sum, arr) => sum + (arr[i] ?? 0), 0))
      return { value: String(total), unitKey: 'kids_analytics_unit_moods', coverage: dayCoverage(perDay) }
    }
    case 'growth': {
      if (!a.growth.hasData) return null
      const count = a.growth.weights.length + a.growth.heights.length
      // Growth isn't daily — three measurements fill the bar.
      return { value: String(count), unitKey: 'kids_analytics_unit_measures', coverage: Math.min(1, count / 3) }
    }
    case 'activity':
      if (!a.activity.hasData) return null
      return { value: String(a.activity.activeDays), unitKey: 'kids_analytics_unit_active_days', coverage: dayCoverage(a.activity.dailySessions) }
    case 'health':
      // Reference pillar — no stat; the row says "Reference".
      return null
  }
}

// ─── Health Tips (data-driven, age-aware) ─────────────────────────────────

function getHealthTips(
  scores: WellnessScores,
  analytics: AnalyticsData,
  ageMonths: number,
  childName: string,
  neutral = false,
): TipData[] {
  // Light UI: counts and averages only — no grades, no alarm words.
  if (neutral) return getNeutralHealthTips(scores, analytics, ageMonths, childName)
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
    pillar: 'activity',
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

/**
 * Light-UI twin of getHealthTips: same pillars, same selection, but every
 * title/body is a neutral count or average in Grandma's voice — no grades
 * ("great", "needs attention"), no clinical read ("check hydration", "may
 * indicate"). Scores only decide which suggestion to add, never what's shown.
 * See docs/compliance/2026-11-02-regras-saude.md.
 */
function getNeutralHealthTips(
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
    const q = analytics.sleep.qualityCounts
    const totalQ = q.great + q.good + q.restless + q.poor
    const goodCount = q.great + q.good
    if (avg > 0) {
      const below = avg < target * 0.85
      tips.push({
        title: tNow('sw2_an_sleepTitle'),
        body: tNow('sw2_an_sleepBody', { avg: fmt1(avg), target }),
        detail: `${tNow('sw2_an_sleepDetail', { name: childName, avg: fmt1(avg), months: ageMonths, target })}${totalQ > 0 ? ` ${tNow('sw2_an_sleepGood', { good: goodCount, total: totalQ })}` : ''}${below ? ` ${tNow('sw2_an_sleepHint')}` : ''}`,
        color: PILLAR_CONFIG.sleep.color,
        icon: Moon,
      })
    }
  } else {
    tips.push({
      title: tNow('sw2_an_sleepStartTitle'),
      body: tNow('sw2_an_sleepStartBody', { name: childName, target: getAgeSleepTarget(ageMonths) }),
      detail: tNow('sw2_an_sleepStartDetail', { months: ageMonths, target: getAgeSleepTarget(ageMonths) }),
      color: PILLAR_CONFIG.sleep.color,
      icon: Moon,
    })
  }

  // ── Nutrition
  if (scores.nutrition.hasData) {
    const n = analytics.nutrition
    const totalMeals = n.mealFrequency.reduce((a, b) => a + b, 0)
    const daysLogged = n.mealFrequency.filter((m) => m > 0).length
    const avgMeals = daysLogged > 0 ? fmt1(totalMeals / daysLogged) : '0'
    const goodTotal = n.eatQuality.good.reduce((a, b) => a + b, 0)
    const goodPct = totalMeals > 0 ? Math.round((goodTotal / totalMeals) * 100) : 0
    const isMilk = n.mode === 'milk'
    const suggest = scores.nutrition.value < 7
    tips.push({
      title: isMilk ? tNow('sw2_an_feedsTitle') : tNow('sw2_an_mealsTitle'),
      body: isMilk
        ? tNow('sw2_an_feedsBody', { n: totalMeals, avg: avgMeals })
        : `${goodPct > 0 ? tNow('sw2_an_mealsBodyAte', { n: totalMeals, avg: avgMeals, pct: goodPct }) : tNow('sw2_an_mealsBody', { n: totalMeals, avg: avgMeals })}${suggest ? ` ${tNow('sw2_an_tryNew')}` : ''}`,
      detail: isMilk
        ? tNow('sw2_an_feedsDetail', { name: childName, avg: avgMeals })
        : tNow('sw2_an_mealsDetail', { name: childName, avg: avgMeals, pct: goodPct }),
      color: PILLAR_CONFIG.nutrition.color,
      icon: Utensils,
    })
  }

  // ── Mood
  if (scores.mood.hasData) {
    const moods = analytics.mood.dominantMoods
    const cranky = moods.find((m) => m.mood === 'cranky')?.count ?? 0
    const fussy = moods.find((m) => m.mood === 'fussy')?.count ?? 0
    const totalMoods = moods.reduce((a, m) => a + m.count, 0)
    const fussyCount = cranky + fussy
    const topMood = moods[0]?.mood ?? 'calm'
    const topMoodLabel = ({ happy: tNow('kids_logForm_moodHappy'), calm: tNow('kids_logForm_moodCalm'), energetic: tNow('kids_logForm_moodEnergetic'), fussy: tNow('kids_logForm_moodFussy'), cranky: tNow('kids_logForm_moodCranky') } as Record<string, string>)[topMood] ?? topMood
    tips.push({
      title: tNow('sw2_an_moodsTitle'),
      body: tNow('sw2_an_moodsBody', { n: totalMoods, top: topMoodLabel, fussy: fussyCount }),
      detail: fussyCount > 0
        ? tNow('sw2_an_moodsDetailFussy', { name: childName, top: topMoodLabel, fussy: fussyCount, total: totalMoods })
        : tNow('sw2_an_moodsDetailCalm', { name: childName, top: topMoodLabel }),
      color: PILLAR_CONFIG.mood.color,
      icon: Smile,
    })
  }

  // ── Activity (age guide — not a score)
  const activityTarget = ageMonths < 12 ? tNow('sw2_an_actTargetTummy') : tNow('sw2_an_actTargetPlay')
  tips.push({
    title: tNow('sw2_an_actTitle'),
    body: tNow('sw2_an_actBody', { target: activityTarget, age: getAgeLabel(ageMonths) }),
    detail: ageMonths < 12
      ? tNow('sw2_an_actDetailBaby')
      : tNow('sw2_an_actDetailToddler'),
    color: PILLAR_CONFIG.activity.color,
    icon: TrendingUp,
    pillar: 'activity',
  })

  // ── Growth logging nudge
  if (!scores.growth.hasData) {
    tips.push({
      title: tNow('sw2_an_growthTitle'),
      body: tNow('sw2_an_growthBody', { name: childName }),
      detail: tNow('sw2_an_growthDetail'),
      color: PILLAR_CONFIG.growth.color,
      icon: TrendingUp,
    })
  }

  // ── Diapers
  if (analytics.diaper.hasData) {
    const { totalCount } = analytics.diaper
    const windowDays = Math.max(1, analytics.diaper.dailyCounts.length)
    const avgPerDay = fmt1(totalCount / windowDays)
    const green = analytics.diaper.colorCounts['green'] ?? 0
    if (ageMonths < 6 && totalCount / windowDays < 6) {
      tips.push({
        title: tNow('sw2_an_diaperTitle'),
        body: tNow('sw2_an_diaperLowBody', { avg: avgPerDay }),
        detail: tNow('sw2_an_diaperLowDetail', { name: childName, avg: avgPerDay, days: windowDays }),
        color: brand.secondary,
        icon: Heart,
      })
    } else if (green > 3) {
      tips.push({
        title: tNow('sw2_an_diaperTitle'),
        body: tNow('sw2_an_diaperGreenBody', { n: green }),
        detail: tNow('sw2_an_diaperGreenDetail'),
        color: brand.secondary,
        icon: Heart,
      })
    }
  } else if (ageMonths < 24) {
    tips.push({
      title: tNow('sw2_an_diaperTrackTitle'),
      body: tNow('sw2_an_diaperTrackBody', { name: childName }),
      detail: tNow('sw2_an_diaperTrackDetail'),
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
  // Light UI: no `/10` anywhere in the context, so Grandma can't read a
  // grade back to the parent. Counts and averages only.
  neutral = false,
): string {
  const lines: string[] = neutral
    ? [`Analytics for ${childName} (${getAgeLabel(ageMonths)}) — ${analytics.totalLogs} logs in this window:`]
    : [
      `Analytics for ${childName} (${getAgeLabel(ageMonths)}) — this week:`,
      `Overall thriving score: ${scores.overall.toFixed(1)}/10`,
    ]
  const gradePrefix = (v: number) => (neutral ? '' : `${v.toFixed(1)}/10 — `)

  if (scores.sleep.hasData) {
    const target = getAgeSleepTarget(ageMonths)
    lines.push(neutral
      ? `Sleep: avg ${analytics.sleep.avgHours.toFixed(1)}h/day on logged days (usual guide ${target}h)`
      : `Sleep: ${scores.sleep.value.toFixed(1)}/10 — avg ${analytics.sleep.avgHours.toFixed(1)}h/night (target ${target}h)`)
  }
  if (scores.nutrition.hasData) {
    const totalMeals = analytics.nutrition.mealFrequency.reduce((a, b) => a + b, 0)
    const good = analytics.nutrition.eatQuality.good.reduce((a, b) => a + b, 0)
    const pct = totalMeals > 0 ? Math.round((good / totalMeals) * 100) : 0
    lines.push(`Nutrition: ${gradePrefix(scores.nutrition.value)}${neutral ? `${totalMeals} logged, ` : ''}${pct}% meals eaten well`)
  }
  if (scores.mood.hasData) {
    const top = analytics.mood.dominantMoods[0]
    lines.push(`Mood: ${gradePrefix(scores.mood.value)}dominant: ${top?.mood ?? 'no data'}`)
  }
  if (scores.health.hasData) {
    // Health is reference-only (not part of `overall`) — give Grandma the
    // vaccine/concern facts instead of a `/10` she could parrot back as a
    // fake grade.
    const doneVaccines = analytics.health.vaccines.filter((v) => v.done).length
    const totalVaccines = analytics.health.vaccines.length
    const concernNote = analytics.health.concernEvents > 0 ? `, ${analytics.health.concernEvents} concern(s) flagged` : ', no concerns flagged'
    lines.push(`Health (reference, not scored): ${doneVaccines}/${totalVaccines} vaccines on record${concernNote}`)
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

  // Health is reference-only and excluded from this "main concern" pick —
  // same honesty rule as buildInsightHighlights: it has no `/10` to be a
  // concern at.
  const lowest = PILLAR_ORDER.filter((k) => k !== 'health').reduce<PillarKey | null>((min, key) => {
    if (!scores[key].hasData) return min
    if (!min || scores[key].value < scores[min].value) return key
    return min
  }, null)
  if (lowest && scores[lowest].value < 7) {
    lines.push(neutral
      ? `Worth a closer look: ${PILLAR_CONFIG[lowest].label}`
      : `Main concern: ${PILLAR_CONFIG[lowest].label} at ${scores[lowest].value.toFixed(1)}/10`)
  }
  if (neutral) {
    lines.push('Please talk about these as counts and patterns — no scores, grades or diagnoses.')
  }

  return lines.join('\n')
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function KidsAnalytics() {
  const { t } = useTranslation()
  const chatEnabled = useGrandmaChatEnabled()
  const { colors, radius, stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const insets = useSafeAreaInsets()
  const bottomInset = useScrollBottomInset(insets.bottom + 56)
  const children = useChildStore((s) => s.children)
  const setActiveChild = useChildStore((s) => s.setActiveChild)
  const activeChild = useChildStore((s) => s.activeChild)

  // Start on (and follow) the child picked anywhere else in the app — Home's pills set the shared
  // active child, and this tab stays mounted, so a local-only pick showed a different child.
  const [selectedChildId, setSelectedChildId] = useState<string>(() => activeChild?.id ?? children[0]?.id ?? '')
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
        return `${f.toLocaleDateString(dateLoc(), opts)} – ${t.toLocaleDateString(dateLoc(), opts)}`
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

  useEffect(() => {
    if (activeChild && activeChild.id !== selectedChildId && children.some((c) => c.id === activeChild.id)) {
      setSelectedChildId(activeChild.id)
    }
  }, [activeChild?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Default to the active child (or the first) when children load
  useEffect(() => {
    if (!selectedChildId && children.length > 0) {
      const first = activeChild ?? children[0]
      setSelectedChildId(first.id)
      if (!activeChild) setActiveChild(first)
    }
  }, [children, selectedChildId, setActiveChild, activeChild])

  const { data: analytics, isLoading, error, refetch } = useKidsAnalytics(
    selectedChildId,
    analyticsRange,
  )

  const selectedChild = children.find((c) => c.id === selectedChildId) ?? children[0] ?? null
  const ageMonths = selectedChild?.birthDate ? getAgeMonths(selectedChild.birthDate) : 12
  const childName = selectedChild?.name ?? t('kp_ka_yourChild')
  // Resolves the same way `buildScores`/analyticsData does: an unresolved
  // sex (`isFallback`) can't be placed on a sex-specific WHO curve with
  // confidence, so the growth pop-up insight gets `null`, never a silently
  // assumed value.
  const resolvedSex = resolveSex(selectedChild?.sex)
  const sex: Sex | null = resolvedSex.isFallback ? null : resolvedSex.sex
  const chartW = SCREEN_W - 72

  // Light: Grandma's note about the selected child — pure rules over the
  // analytics already loaded for this page (no extra queries).
  const notesLetter = useMemo(() => {
    if (diffuse || (isLoading && !analytics)) return null
    return buildKidsNote({ analytics, childName, ageMonths }, t)
  }, [diffuse, isLoading, analytics, childName, ageMonths, t])

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
    { key: 'week', label: t('kp_ka_p7') },
    { key: 'month', label: t('kp_ka_p30') },
    { key: '3mo', label: t('kp_ka_p3m') },
    { key: 'year', label: t('kp_ka_p1y') },
    { key: 'custom', label: customLabel ? customLabel : t('kp_ka_custom') },
  ]

  return (
    <View style={[styles.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: bottomInset }]}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={diffuse ? getDiffuseAccent('kids', dt.isDark) : colors.primary} colors={[diffuse ? getDiffuseAccent('kids', dt.isDark) : colors.primary]} />}
      >
        {/* ── HEADER (2026 redesign) ── */}
        {diffuse ? (
          <View style={{ marginTop: 8, marginBottom: 4 }}>
            <DiffuseSectionHeader
              eyebrow={getAgeLabel(ageMonths)}
              title={t('kp_ka_patterns', { name: childName })}
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
          // Light: the tab opens with Grandma's note about the selected child,
          // addressed to the parent. Selectors + details follow below.
          <View style={{ marginHorizontal: -20 }}>
            <GrandmaNotesTitle
              right={(
                <Pressable
                  onPress={() => setShowScoreInfo(true)}
                  hitSlop={10}
                  accessibilityLabel={t('kp_ka_howWork')}
                  style={({ pressed }) => [
                    styles.infoBtnNew,
                    { backgroundColor: colors.surface, borderColor: colors.text, borderWidth: 2, width: 34, height: 34 },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Info size={16} color={colors.text} strokeWidth={2.2} />
                </Pressable>
              )}
            />
            {/* The note is about one child — choose the child first. */}
            {children.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.childRow, { paddingHorizontal: 20 }]} style={{ marginBottom: 4 }}>
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
            ) : null}
            <GrandmaNote
              letter={notesLetter}
              loading={isLoading && !analytics}
              range={analytics?.dateRange
                ? { from: analytics.dateRange.from.slice(0, 10), to: analytics.dateRange.to.slice(0, 10) }
                : undefined}
              onNotePress={(area) => setSelectedPillar(area as PillarKey)}
            />
          </View>
        )}

        {diffuse ? (
          // Compact one-line segmented row — pills flex to share the width so all
          // five periods fit without horizontal scrolling.
          <View style={styles.periodRowD}>
            {diffusePeriodOptions.map((o) => {
              const on = o.key === period
              return (
                <Pressable
                  key={o.key}
                  onPress={() => handlePeriodChange(o.key)}
                  style={({ pressed }) => [
                    styles.periodPillD,
                    {
                      borderColor: on ? dt.colors.hairline : dt.colors.line,
                      backgroundColor: on ? dt.colors.surface : 'transparent',
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: on ? diffuseFont.monoBold : diffuseFont.mono,
                      fontSize: 10.5,
                      letterSpacing: 0.3,
                      textTransform: 'uppercase',
                      color: on ? dt.colors.ink : dt.colors.ink3,
                    }}
                  >
                    {o.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
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
          null
        )}

        {!diffuse && <NotesDetailsEyebrow style={{ marginHorizontal: 4, marginTop: 0, marginBottom: -8 }} />}

        {isLoading && (diffuse ? (
          <View style={styles.loadingWrap}>
            <BrandedLoader logoSize={72} motion="blinkOnly" label={t('kids_analytics_loading')} />
          </View>
        ) : (
          // Light first load: ghosts shaped like ring card → Grandma card → pillar rows.
          <View style={{ gap: 20 }}>
            <BigChartCard label={t('kids_analytics_child_wellness_label')} blobColor={stickers.pinkSoft} labelAlign="center">
              <SkeletonRing size={220} />
            </BigChartCard>
            <Skeleton height={96} radius={18} />
            <View>
              <Text style={[styles.pillarSectionTitle, { color: colors.text, fontFamily: font.display, fontSize: 18, letterSpacing: 0.2, textTransform: 'uppercase', marginBottom: 0 }]}>
                {t('kids_analytics_thriving_breakdown')}
              </Text>
              <SkeletonStatRows count={6} />
            </View>
          </View>
        ))}

        {error && !isLoading && (
          <Pressable onPress={() => refetch()} style={[styles.errorCard, { backgroundColor: diffuse ? 'transparent' : colors.surface, borderRadius: diffuse ? radius.xl : 18, borderWidth: diffuse ? 1 : 1.5, borderColor: diffuse ? dt.colors.line : colors.text }]}>
            <Text style={[styles.errorText, { color: diffuse ? dt.colors.error : colors.text, fontFamily: diffuse ? diffuseFont.body : font.bodySemiBold }]}>{t('kids_analytics_error_load')}</Text>
            <View style={styles.row}>
              <RefreshCw size={14} color={diffuse ? dt.colors.error : colors.text} strokeWidth={diffuse ? 1.6 : 2} />
              <Text style={[styles.errorRetry, { color: diffuse ? dt.colors.error : colors.textSecondary, fontFamily: diffuse ? diffuseFont.mono : MONO, fontSize: diffuse ? undefined : 11, letterSpacing: diffuse ? undefined : 1.4, textTransform: diffuse ? undefined : 'uppercase' }]}>{t('kids_analytics_tap_retry')}</Text>
            </View>
          </Pressable>
        )}

        {analytics && (() => {
          // Light UI gets the neutral copy (counts/averages, no grades);
          // Diffuse keeps its existing copy.
          const tips = getHealthTips(analytics.scores, analytics, ageMonths, childName, !diffuse)
          const tipMap = tipByPillar(tips)
          // Task 8's cross-log pattern engine — surface only the single
          // most-important observation (most-important-first per
          // computeCrossInsights' own sort) on the main screen.
          const cross = computeCrossInsights(analytics.logs, ageMonths)
          const crossLine = cross[0]?.line ?? null

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
            const highlights = buildInsightHighlights(s, analytics, childName, ageMonths, crossLine)
            const softFor: Record<PillarKey, string> = {
              nutrition: stickers.greenSoft, sleep: stickers.lilacSoft, mood: stickers.pinkSoft,
              health: stickers.blueSoft, growth: stickers.yellowSoft, activity: stickers.peachSoft,
            }
            // Health is a REFERENCE row (vaccines-on-record + concern flags),
            // not a graded one — no `/10`, just a status pinned at the
            // bottom of the band (see sortLowestFirst in KidsPillarBands).
            const healthConcerns = analytics.health.concernEvents
            const bandItems: PillarBandItem[] = PILLAR_ORDER.map((key) => ({
              key,
              label: PILLAR_CONFIG[key].label,
              color: PILLAR_CONFIG[key].color,
              softColor: softFor[key],
              score: s[key],
              takeaway: tipMap[key]?.body,
              icon: PILLAR_LINE_ICON[key],
              reference: key === 'health',
              statusText: key === 'health'
                ? (healthConcerns === 0 ? t('kp_ka_allClear') : t('kp_ka_toNote', { n: healthConcerns }))
                : undefined,
            }))
            return (
              <View style={{ gap: 4 }}>
                <KidsAnalyticsHero
                  overall={overall}
                  hasData={hasAnyData}
                  caption={`${t('kids_analytics_thriving_breakdown')} · ${band}`.toUpperCase()}
                  childName={childName}
                  band={band}
                  lowConfidence={s.overallConfidence < LOW_CONF}
                />
                {highlights.message ? (
                  <Text style={{ fontFamily: diffuseFont.body, fontSize: 14, lineHeight: 20, color: dt.colors.ink2, borderLeftWidth: 2, borderLeftColor: dt.colors.line2, paddingLeft: 12, marginTop: 10, marginBottom: 12 }}>
                    {highlights.message}
                  </Text>
                ) : <View style={{ height: 10 }} />}
                {highlights.crossLine && (
                  <View style={{ marginTop: -4, marginBottom: 14 }}>
                    <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: dt.colors.ink3, marginBottom: 4 }}>
                      {t('kids_analytics_grandma_noticed_label')}
                    </Text>
                    <Text style={{ fontFamily: diffuseFont.display, fontSize: 16, lineHeight: 22, color: dt.colors.ink }}>
                      {highlights.crossLine}
                    </Text>
                  </View>
                )}
                {/* Ask-Grandma pill — heart-eye logo + prompt. Replaces the old
                    duplicate "GRANDMA SAYS" card (same text as the summary). */}
                {chatEnabled && (
                <Pressable
                  onPress={() => {
                    const ctx = buildGrandmaContext(s, analytics, childName, ageMonths)
                    AsyncStorage.setItem('grandma-insight-context', ctx).catch(() => {})
                    setTimeout(() => router.push({ pathname: '/grandma-talk', params: { hasInsightContext: '1' } } as any), 150)
                  }}
                  style={({ pressed }) => [{
                    flexDirection: 'row', alignItems: 'center', gap: 10,
                    alignSelf: 'flex-start',
                    paddingLeft: 8, paddingRight: 14, paddingVertical: 7,
                    borderRadius: 999, borderWidth: 1, borderColor: dt.colors.line2,
                    marginBottom: 18, opacity: pressed ? 0.6 : 1,
                  }]}
                >
                  <GrandmaLogo size={26} palette="sky" outline={dt.colors.ink} motion="default" />
                  <Text style={{ fontFamily: diffuseFont.monoBold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: dt.colors.ink }}>
                    {t('kids_analytics_ask_grandma_tip')}
                  </Text>
                  <Text style={{ fontFamily: diffuseFont.body, fontSize: 15, color: dt.colors.ink3 }}>→</Text>
                </Pressable>
                )}
                <KidsPillarBands items={bandItems} onPillarPress={(key) => setSelectedPillar(key as PillarKey)} />
              </View>
            )
          }

          // ── Current system (unchanged): ring → grandma → tip rows → routines.
          return (
            <>
              <KidsWellnessRingCard scores={analytics.scores} logCount={analytics.totalLogs} periodIsWeek={period === 'week'} onPillarPress={setSelectedPillar} />
              <GrandmaInsightCard scores={analytics.scores} analytics={analytics} childName={childName} ageMonths={ageMonths} crossLine={crossLine} />
              <View style={styles.pillarSection}>
                <Text style={[styles.pillarSectionTitle, { color: colors.text, fontFamily: font.display, fontSize: 18, letterSpacing: 0.2, textTransform: 'uppercase', marginBottom: 0 }]}>
                  {t('kids_analytics_thriving_breakdown')}
                </Text>
                {PILLAR_ORDER.map((key) => (
                  <PillarRow key={key} pillarKey={key} score={analytics.scores[key]} stat={pillarStat(key, analytics)} tip={tipMap[key]} onPress={() => setSelectedPillar(key)} />
                ))}
                <RoutineComplianceSection data={analytics.routineCompliance} />
              </View>
            </>
          )
        })()}

        {analytics && analytics.totalLogs === 0 && !isLoading && (
          diffuse ? (
            <DiffuseEmptyState
              icon={<DiffuseBloomIcon color={getDiffuseAccent('kids', dt.isDark)} size={48} intensity={0.5}><Character name="empty" size={24} color={dt.colors.ink3} /></DiffuseBloomIcon>}
              title={t('kids_analytics_no_data_title')}
              message={t('kids_analytics_no_data_hint')}
            />
          ) : (
            <View style={styles.emptyAll}>
              <SiteSticker name="cloud" size={56} cut />
              <Text style={[styles.emptyAllTitle, { color: colors.text, fontFamily: font.display, textTransform: 'uppercase', letterSpacing: 0.3 }]}>{t('kids_analytics_no_data_title')}</Text>
              <Text style={[styles.emptyAllSub, { color: colors.textSecondary }]}>
                {t('kids_analytics_no_data_hint')}
              </Text>
            </View>
          )
        )}

        {/* Report for doctor — pediatric PDF export (Phase 2). At the bottom,
            after the metrics. Character-blob icon + Diffuse type roles. */}
        {selectedChildId && !isLoading && !error ? (
          <Pressable
            onPress={() => router.push(`/child-report?childId=${selectedChildId}`)}
            style={({ pressed }) => [
              styles.reportCard,
              {
                backgroundColor: diffuse ? dt.colors.surface : colors.surface,
                borderColor: diffuse ? dt.colors.line : colors.text,
                borderWidth: diffuse ? 1 : 1.5,
                borderRadius: diffuse ? radius.lg : 18,
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <View style={[styles.reportIcon, { backgroundColor: diffuse ? dt.stickers.blueSoft : 'transparent' }]}>
              {diffuse
                ? <Character name="exam" size={26} color={getDiffuseAccent('kids', dt.isDark)} />
                : <SiteSticker name="doc" size={38} cut />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.reportTitle, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.bodySemiBold : font.bodyBold }]}>
                {t('report_cardTitle')}
              </Text>
              <Text style={[styles.reportDesc, { color: diffuse ? dt.colors.ink3 : colors.textSecondary, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
                {t('report_cardDesc')}
              </Text>
            </View>
            <ChevronRight size={16} color={diffuse ? dt.colors.ink3 : colors.text} strokeWidth={diffuse ? 1.5 : 2} />
          </Pressable>
        ) : null}
        <InsightsDisclaimer />
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
              <LineChart data={analytics.growth.weights.map((w) => w.value)} labels={analytics.growth.weights.map((w) => { const d = parseLocalDate(w.date); return `${d.getMonth() + 1}/${d.getDate()}` })} color={PILLAR_CONFIG.health.color} width={SCREEN_W - 48} height={220} unit="kg" showAverage />
            </FullScreenChart>
          )}
          {analytics.growth.heights.length >= 2 && (
            <FullScreenChart visible={fullScreen === 'height'} title={t('kids_analytics_chart_height')} onClose={() => setFullScreen(null)}>
              <LineChart data={analytics.growth.heights.map((h) => h.value)} labels={analytics.growth.heights.map((h) => { const d = parseLocalDate(h.date); return `${d.getMonth() + 1}/${d.getDate()}` })} color={PILLAR_CONFIG.growth.color} width={SCREEN_W - 48} height={220} unit="cm" showAverage />
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
          sex={sex}
          onClose={() => setSelectedPillar(null)}
          onFullScreen={setFullScreen}
        />
      )}

      {/* ── Score Info Modal ── */}
      <ScoreInfoModal
        visible={showScoreInfo}
        scores={analytics?.scores ?? null}
        logCount={analytics?.totalLogs ?? null}
        periodIsWeek={period === 'week'}
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
  visible, scores, logCount = null, periodIsWeek = true, ageMonths, childName, onClose,
}: {
  visible: boolean
  scores: WellnessScores | null
  /** Light UI hero: logs in the window (not a score). */
  logCount?: number | null
  periodIsWeek?: boolean
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
    // Health is NOT one of the weighted pillars below — illness is episodic
    // and vaccines aren't a score. This panel is a reference: vaccines on
    // record, plus any genuine concerns (fever-range temp, injury, doctor
    // visit) flagged from your logs. Routine logging never lowers anything,
    // because there's nothing here to lower.
    health: `Not scored — a reference for vaccines on record and any genuine concerns flagged from your logs (fever-range temps, injuries, doctor visits). Routine logging never counts against anything here.`,
    growth: `Reflects how regularly weight and height are measured. Frequent tracking earns a higher score. Recent measurements get a recency bonus.`,
    activity: `Scored by active days per week (how many days had at least one logged session) plus a variety bonus for mixing different types. 7 active days = perfect score.`,
  }

  // Weights for the FIVE pillars that feed `overall` (nutrition/sleep/mood/
  // growth/activity), renormalized to 100% now that Health has been dropped
  // from the weighted blend (matches the pillars array in buildScores —
  // 0.27/0.22/0.18/0.09/0.11 out of an 0.87 total). Health shows a
  // "Reference" label instead of a weight — it isn't part of this average.
  const WEIGHTS: Record<PillarKey, string> = {
    nutrition: '31%', sleep: '25%', mood: '21%', health: 'Reference', growth: '10%', activity: '13%',
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
                {PILLAR_LINE_ICON[key](22, config.color)}
                <Text style={{ flex: 1, fontFamily: diffuseFont.display, fontSize: 17, color: dt.colors.ink }}>{config.label}</Text>
                <Text style={{ fontFamily: diffuseFont.mono, fontSize: 11, letterSpacing: 1, color: dt.colors.ink3 }}>{WEIGHTS[key]}</Text>
                {key !== 'health' && score?.hasData && (
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

  const eyebrowS = [styles.siteEyebrow, { color: colors.textSecondary }]
  // Light UI: what each area COUNTS — no score scale, no weights, no
  // per-pillar number (see docs/compliance/2026-11-02-regras-saude.md).
  const PILLAR_COUNTS: Record<PillarKey, string> = {
    nutrition: `${t(ageMonths < 6 ? 'sw2_an_cntNutBreast' : 'sw2_an_cntNutMeals')} ${ageMonths < 6 ? t('sw2_an_cntNutU6') : ageMonths < 12 ? t('sw2_an_cntNut612') : t('sw2_an_cntNut12')}`,
    sleep: t('sw2_an_cntSleep', { age: getAgeLabel(ageMonths), target: getAgeSleepTarget(ageMonths) }),
    mood: t('sw2_an_cntMood'),
    health: t('sw2_an_cntHealth'),
    growth: t('sw2_an_cntGrowth'),
    activity: t('sw2_an_cntActivity'),
  }
  const ageLine =
    t('sw2_an_ageSleep', { target: getAgeSleepTarget(ageMonths) }) + '\n' +
    (ageMonths < 6 ? t('sw2_an_ageNutU6') :
      ageMonths < 12 ? t('sw2_an_ageNut12') :
        ageMonths < 24 ? t('sw2_an_ageNut24') :
          t('sw2_an_ageNut24p'))

  return (
    <LightSheet visible={visible} onClose={onClose} height={SCREEN_H * 0.86}>
      <View style={{ paddingHorizontal: 20 }}>
        <DetailSheetHeader
          title={t('kids_analytics_guide_title')}
          sticker="bars"
          tone={stickers.blueSoft}
          onClose={onClose}
        />
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: insets.bottom + 28 }}
      >
        {logCount !== null && (
          <FadeUp index={0}>
            <View style={styles.siteHeroRow}>
              <Text style={[styles.siteHero, { color: colors.text, fontFamily: font.displayBold }]}>{logCount}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.siteBody, { color: colors.text, fontFamily: font.bodySemiBold }]}>{t(periodIsWeek ? 'kids_analytics_logs_week' : 'kids_analytics_logs_window')}</Text>
                <Text style={[styles.siteEyebrow, { color: colors.textSecondary, marginBottom: 0, marginTop: 4 }]}>{childName}{' · '}{getAgeLabel(ageMonths)}</Text>
              </View>
            </View>
          </FadeUp>
        )}

        <FadeUp index={1}>
          <View style={[styles.siteDivider, { backgroundColor: colors.border }]} />
          <Text style={eyebrowS}>{t('kids_analytics_guide_areas_label')}</Text>
          {PILLAR_ORDER.map((key, idx) => {
            const config = PILLAR_CONFIG[key]
            return (
              <View key={key} style={[styles.pillarInfoRowSite, idx > 0 && { borderTopWidth: HAIR, borderTopColor: colors.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <SiteSticker name={PILLAR_SITE_STICKER[key]} size={28} cut />
                  <Text style={[styles.siteSectionTitle, { color: colors.text, fontFamily: font.display, flex: 1 }]}>{config.label}</Text>
                  {key === 'health' && (
                    <Text style={[styles.siteMono, { color: colors.textSecondary }]}>{t('kp_ka_reference')}</Text>
                  )}
                </View>
                <Text style={[styles.siteSmall, { color: colors.textSecondary, fontFamily: font.body }]}>{PILLAR_COUNTS[key]}</Text>
              </View>
            )
          })}
        </FadeUp>

        <FadeUp index={2}>
          <View style={[styles.siteDivider, { backgroundColor: colors.border }]} />
          <Text style={[styles.siteSectionTitle, { color: colors.text, fontFamily: font.display, marginBottom: 6 }]}>
            {t('sw2_an_nameAtAge', { name: childName, age: getAgeLabel(ageMonths) })}
          </Text>
          <Text style={[styles.siteSmall, { color: colors.textSecondary, fontFamily: font.body, lineHeight: 21 }]}>{ageLine}</Text>
        </FadeUp>
      </ScrollView>
    </LightSheet>
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
  const chatEnabled = useGrandmaChatEnabled()
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
        {chatEnabled && (
        <Pressable
          onPress={handleAskGrandma}
          style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: dt.colors.line2, paddingTop: 16, opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={{ fontFamily: diffuseFont.monoBold, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: dt.colors.ink }}>{t('kids_analytics_ask_grandma_tip')}</Text>
          <Text style={{ fontFamily: diffuseFont.body, fontSize: 18, color: dt.colors.ink3 }}>→</Text>
        </Pressable>
        )}
      </DiffuseSheet>
    )
  }

  return (
    <SheetModal visible onClose={onClose}>
      {(dragZone) => (
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

          {chatEnabled && (
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
          )}
        </Pressable>
      )}
    </SheetModal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// WELLNESS RING (2026 redesign) — paper card with 6-arc HealthScoreRing + mini stats
// ═══════════════════════════════════════════════════════════════════════════════

function KidsWellnessRingCard({
  scores,
  logCount,
  periodIsWeek,
  onPillarPress,
}: {
  scores: WellnessScores
  /** Light UI center: how many logs are in the window (not a score). */
  logCount: number
  periodIsWeek: boolean
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
        {/* Center = a neutral count of logs in the window, never the
            internal wellness score or a "needs care" grade. */}
        <HealthScoreRing
          score={Number.isFinite(logCount) ? Math.max(0, logCount) : 0}
          decimals={0}
          caption={t(periodIsWeek ? 'kids_analytics_logs_week' : 'kids_analytics_logs_window')}
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
    // Health is a REFERENCE line, not a graded percentage — illness is
    // episodic and vaccines aren't a score. Vaccine + concern-flag data
    // still backs the reference panel; it just isn't phrased as a `%` here.
    const explanations: Record<PillarKey, string> = {
      nutrition: `${pct}% — tracks meal frequency, eating quality, and food variety this week`,
      sleep:     `${pct}% — measures avg sleep hours vs age target, quality, and consistency`,
      mood:      `${pct}% — based on daily mood logs (happy, calm, energetic, fussy, cranky)`,
      health:    `Reference — vaccines on record and any genuine concerns flagged, not scored`,
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
              <Text style={{ fontFamily: 'HankenGrotesk_400Regular',
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
              {activePillar === 'health'
                ? tNow('kp_ka_reference')
                : scores[activePillar].hasData
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

// buildInsightHighlights / buildInsightActions / InsightHighlights (+
// InsightHighlight / InsightTrend) now live in lib/kidsInsightHighlights.ts —
// extracted so the narrative + honesty-gating logic is unit-testable without
// pulling React Native into the test (see honest-scores spec, Task 9).

function GrandmaInsightCard({
  scores, analytics, childName, ageMonths, crossLine = null, compact = false,
}: {
  scores: WellnessScores
  analytics: AnalyticsData
  childName: string
  ageMonths: number
  crossLine?: string | null
  compact?: boolean
}) {
  const { t } = useTranslation()
  const chatEnabled = useGrandmaChatEnabled()
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const [detailOpen, setDetailOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Light UI: neutral wording (counts/averages, no `/10`, no grade labels).
  const highlights = buildInsightHighlights(scores, analytics, childName, ageMonths, crossLine, { neutral: !diffuse })

  function handleDiscussPress() {
    setConfirmOpen(true)
  }

  function handleConfirmYes() {
    const ctx = buildGrandmaContext(scores, analytics, childName, ageMonths, !diffuse)
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
              {new Date().toLocaleDateString(dateLoc(), { month: 'short', day: 'numeric' })}
            </Text>
          </View>
          <Text
            style={{ fontFamily: diffuseFont.body, fontSize: compact ? 14 : 22, lineHeight: compact ? 20 : 28, color: compact ? dt.colors.ink2 : dt.colors.ink, letterSpacing: compact ? 0 : -0.3 }}
            numberOfLines={compact ? 3 : undefined}
          >
            {highlights.message}
          </Text>
          {highlights.crossLine && !compact && (
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: dt.colors.ink3, marginBottom: 4 }}>
                {t('kids_analytics_grandma_noticed_label')}
              </Text>
              <Text style={{ fontFamily: diffuseFont.display, fontSize: 16, lineHeight: 22, color: dt.colors.ink }}>
                {highlights.crossLine}
              </Text>
            </View>
          )}
          {chatEnabled && (
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
          )}
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
          { backgroundColor: colors.surface, borderColor: colors.text },
          pressed && { opacity: 0.95, transform: [{ scale: 0.99 }] },
        ]}
      >
        {/* Header: small heart sticker + eyebrow, date on the right */}
        <View style={styles.grandmaInsightHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <SiteSticker name="heart" size={26} cut />
            <Animated.View entering={FadeIn.duration(400)}>
              <Text style={[styles.grandmaInsightLabel, { color: colors.textSecondary, fontFamily: MONO, letterSpacing: 1.4 }]}>
                {t('kids_analytics_grandma_says_label')}
              </Text>
            </Animated.View>
          </View>
          <Text style={[styles.grandmaInsightDate, { color: colors.textSecondary, fontFamily: MONO, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase' }]}>
            {new Date().toLocaleDateString(dateLoc(), { month: 'short', day: 'numeric' })}
          </Text>
        </View>

        <Animated.View entering={FadeInDown.duration(500).delay(120)} style={styles.grandmaInsightMessageWrap}>
          <Text style={[styles.grandmaInsightMessage, { color: colors.text, fontFamily: font.body, fontSize: 16, lineHeight: 23 }]}>
            {highlights.message}
          </Text>
        </Animated.View>

        {highlights.crossLine && (
          <Animated.View entering={FadeIn.duration(400).delay(300)} style={[styles.grandmaInsightCrossWrap, { borderTopWidth: HAIR, borderTopColor: colors.border, paddingTop: 12 }]}>
            <Text style={[styles.grandmaInsightLabel, { color: colors.textSecondary, fontFamily: MONO, letterSpacing: 1.4, marginBottom: 6 }]}>
              {t('kids_analytics_grandma_noticed_label')}
            </Text>
            <Text style={[styles.grandmaInsightMessage, { color: colors.text, fontFamily: font.bodySemiBold }]}>
              {highlights.crossLine}
            </Text>
          </Animated.View>
        )}

        {/* "Let's discuss →" ink pill — opens confirm sheet */}
        <Animated.View entering={FadeIn.duration(400).delay(500)}>
          {chatEnabled && (
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
            <Text style={[styles.grandmaInsightBtnText, { color: colors.surface, fontFamily: font.bodyBold }]}>
              {t('kids_analytics_discuss_btn')}
            </Text>
          </Pressable>
          )}
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
  const chatEnabled = useGrandmaChatEnabled()
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
                <DiffuseBloomIcon color={accent} size={26} intensity={0.4}><Character name="tip" size={15} color={dt.colors.ink3} /></DiffuseBloomIcon>
                <Text style={{ flex: 1, fontFamily: diffuseFont.body, fontSize: 14, lineHeight: 20, color: dt.colors.ink }}>{a}</Text>
              </View>
            ))}
          </View>
        )}
        {rows.length === 0 && (
          <Text style={{ fontFamily: diffuseFont.body, fontSize: 14, color: dt.colors.ink3, textAlign: 'center', paddingVertical: 20 }}>{t('kids_analytics_insight_no_highlights')}</Text>
        )}
        {chatEnabled && (
        <Pressable
          onPress={onDiscuss}
          style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: dt.colors.line2, paddingTop: 18, marginTop: 8, opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={{ fontFamily: diffuseFont.monoBold, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: dt.colors.ink }}>{t('kids_analytics_discuss_btn')}</Text>
          <Text style={{ fontFamily: diffuseFont.body, fontSize: 18, color: dt.colors.ink3 }}>→</Text>
        </Pressable>
        )}
      </DiffuseSheet>
    )
  }

  return (
    <LightSheet visible onClose={onClose}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: insets.bottom + 24 }}
      >
        <View style={styles.insightDetailHeaderRow}>
          <View style={styles.insightDetailLabelWrap}>
            <Text style={[styles.siteEyebrow, { color: colors.textSecondary, marginBottom: 0 }]}>
              {t('kids_analytics_grandma_says_label')}
            </Text>
            {/* Neutral title + log count — no "is needs attention", no `/10`. */}
            <Text style={[styles.insightDetailOverall, { color: colors.text, fontFamily: font.display, textTransform: 'uppercase', letterSpacing: 0.3 }]}>
              {t('kids_analytics_insight_title_patterns', { childName })}
            </Text>
            {highlights.logCount > 0 && (
              <Text style={[styles.insightDetailOverallSub, { color: colors.textSecondary, fontFamily: font.body }]}>
                {t('kids_analytics_insight_based_on', { count: highlights.logCount })}
              </Text>
            )}
          </View>
          <SiteClose onPress={onClose} />
        </View>

        <View style={{ marginTop: 8 }}>
          {highlights.strength && (
            <HighlightRow
              icon={<SiteSticker name="star" size={30} cut />}
              label={t('kids_analytics_insight_steady_label')}
              title={PILLAR_CONFIG[highlights.strength.pillar].label}
              body={highlights.strength.reason}
            />
          )}

          {highlights.concern && (
            <HighlightRow
              icon={<SiteSticker name="eye" size={30} cut />}
              label={t('kids_analytics_grandma_noticed_label')}
              title={PILLAR_CONFIG[highlights.concern.pillar].label}
              body={highlights.concern.reason}
            />
          )}

          {highlights.trend && (
            <HighlightRow
              icon={<SiteSticker name="bars" size={30} cut />}
              label={t('kids_analytics_insight_trend_label')}
              title={t(highlights.trend.direction === 'improving' ? 'sw2_an_trendUp' : 'sw2_an_trendDown', { pillar: PILLAR_CONFIG[highlights.trend.pillar].label })}
              body={t('sw2_an_vsLastWeek')}
            />
          )}
        </View>

        {highlights.actions.length > 0 && (
          <View style={[styles.insightActionsBlock, { borderTopWidth: HAIR, borderTopColor: colors.border, paddingTop: 16, marginTop: 4 }]}>
            <Text style={[styles.siteEyebrow, { color: colors.textSecondary, marginBottom: 4 }]}>
              {t('kids_analytics_insight_next_steps_label')}
            </Text>
            {highlights.actions.map((a, i) => (
              <View key={i} style={styles.insightActionRow}>
                <SiteSticker name="pencil" size={22} />
                <Text style={[styles.insightActionText, { color: colors.text, fontFamily: font.body }]}>{a}</Text>
              </View>
            ))}
          </View>
        )}

        {!highlights.strength && !highlights.concern && !highlights.trend && (
          <Text style={[styles.insightEmptyText, { color: colors.textSecondary, fontFamily: font.body, paddingVertical: 16 }]}>
            {t('kids_analytics_insight_no_highlights')}
          </Text>
        )}

        {chatEnabled && (
        <Pressable
          onPress={onDiscuss}
          style={({ pressed }) => [
            styles.insightDetailCta,
            { backgroundColor: colors.text, borderRadius: radius.full },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Sparkles size={16} color={colors.surface} strokeWidth={2} />
          <Text style={[styles.insightDetailCtaText, { color: colors.surface, fontFamily: font.bodyBold }]}>
            {t('kids_analytics_discuss_btn')}
          </Text>
        </Pressable>
        )}
      </ScrollView>
    </LightSheet>
  )
}

function HighlightRow({
  icon, label, title, body,
}: {
  icon: React.ReactNode
  label: string
  title: string
  body: string
}) {
  const { colors } = useTheme()
  return (
    <View style={[styles.insightHighlightRow, { borderTopWidth: HAIR, borderTopColor: colors.border }]}>
      <View style={styles.insightHighlightIcon}>{icon}</View>
      <View style={styles.insightHighlightBody}>
        <Text style={[styles.insightHighlightLabel, { color: colors.textSecondary, fontFamily: MONO, letterSpacing: 1.4 }]}>
          {label}
        </Text>
        <Text style={[styles.insightHighlightTitle, { color: colors.text, fontFamily: font.bodyBold }]}>
          {title}
        </Text>
        <Text style={[styles.insightHighlightText, { color: colors.textSecondary, fontFamily: font.body }]}>
          {body}
        </Text>
      </View>
    </View>
  )
}

// DiscussConfirmSheet is mounted/unmounted by its parent, so CenterModal never sees `visible` go false.
// Close locally first (the card plays its exit), then tell the parent once it's done.
function useModalClose(onClose: () => void) {
  const [open, setOpen] = useState(true)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  const close = useCallback(() => {
    if (timer.current) return
    setOpen(false)
    timer.current = setTimeout(() => onCloseRef.current(), 220)
  }, [])
  return [open, close] as const
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
  const [open, closeSheet] = useModalClose(onClose)

  if (diffuse) {
    const accent = getDiffuseAccent('kids', dt.isDark)
    return (
      <DiffuseSheet visible title={t('kids_analytics_confirm_share_title')} onClose={onClose} scroll={false}>
        <View style={{ alignItems: 'center', paddingTop: 4, paddingBottom: 8 }}>
          <DiffuseBloomIcon color={accent} size={48} intensity={0.5}><Character name="sparkle" size={24} color={dt.colors.ink3} /></DiffuseBloomIcon>
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
    <CenterModal visible={open} onClose={closeSheet}>
      <Pressable
        style={[
          styles.confirmSheet,
          { backgroundColor: colors.surface, borderColor: colors.text, borderWidth: 1.5, borderRadius: 18, paddingBottom: insets.bottom > 0 ? 26 : 26 },
          { shadowColor: colors.text, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 0 },
        ]}
        onPress={(e) => e.stopPropagation()}
      >
        <View style={styles.confirmIconWrap} pointerEvents="none">
          <SiteSticker name="heart" size={64} cut />
        </View>

        <Text style={[styles.confirmTitle, { color: colors.text, fontFamily: font.display, textTransform: 'uppercase', letterSpacing: 0.3 }]}>
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
          <Sparkles size={16} color={colors.surface} strokeWidth={2} />
          <Text style={[styles.confirmPrimaryText, { color: colors.surface, fontFamily: font.bodyBold }]}>
            {t('kids_analytics_confirm_share_yes')}
          </Text>
        </Pressable>

        <Pressable
          onPress={closeSheet}
          style={({ pressed }) => [
            styles.confirmSecondary,
            { borderRadius: radius.full, borderColor: colors.text, borderWidth: 1.5, backgroundColor: colors.surface },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={[styles.confirmSecondaryText, { color: colors.text, fontFamily: font.bodyBold }]}>
            {t('kids_analytics_confirm_share_no')}
          </Text>
        </Pressable>
      </Pressable>
    </CenterModal>
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
  const chatEnabled = useGrandmaChatEnabled()
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

      {chatEnabled && (
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
      )}
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
              <Character name="skip" size={16} color={dt.colors.ink3} />
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
    <View>
      <Pressable
        onPress={() => setShowModal(true)}
        style={({ pressed }) => [
          styles.pillarRowSite,
          { borderTopColor: colors.border },
          pressed && { opacity: 0.7 },
        ]}
      >
        <View style={styles.pillarPaperHead}>
          <SiteSticker name="cal" size={34} cut />
          <View style={{ flex: 1 }}>
            <Text style={[styles.siteSectionTitle, { color: colors.text, fontFamily: font.display }]}>
              {t('kids_analytics_routine_compliance_title')}
            </Text>
            <View style={[styles.siteBarTrack, { backgroundColor: colors.border }]}>
              <View style={[styles.siteBarFill, { width: `${adherenceRate}%`, backgroundColor: tint, borderColor: colors.text }]} />
            </View>
          </View>
          <View style={styles.pillarPaperScore}>
            {data.hasData ? (
              <>
                <Text style={[styles.siteNum, { color: colors.text, fontFamily: font.displayBold }]}>{data.totalSkips}</Text>
                <Text style={[styles.siteMono, { color: colors.textSecondary, marginLeft: 3 }]}>{'skips'}</Text>
              </>
            ) : (
              <Text style={[styles.siteMono, { color: colors.textSecondary }]}>{'—'}</Text>
            )}
          </View>
        </View>

        <Text style={[styles.siteSmall, { color: colors.textSecondary, fontFamily: font.body, marginTop: 10 }]}>
          {data.hasData
            ? `${adherenceRate}% adherence this week — ${data.totalSkips} total skip${data.totalSkips === 1 ? '' : 's'}.`
            : 'No routines tracked yet — add skips in the calendar.'}
        </Text>

        <View style={styles.pillarPaperFooter}>
          <Text style={[styles.siteMono, { color: colors.text }]}>{t('kids_analytics_tip_tap_details')}</Text>
          <ChevronRight size={14} color={colors.text} strokeWidth={2.2} />
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

  const maxSkipSite = Math.max(...(data.weeklySkips.length ? data.weeklySkips : [1]), 1)
  return (
    <LightSheet visible={visible} onClose={onClose} height={sheetH}>
      <View style={{ paddingHorizontal: 20 }}>
        <DetailSheetHeader
          title={t('kids_analytics_routine_compliance_title')}
          sticker="cal"
          tone={tint}
          onClose={onClose}
        />
      </View>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: insets.bottom + 28 }}
      >
        <FadeUp index={0}>
          <Text style={[styles.siteEyebrow, { color: colors.textSecondary }]}>{t('kids_analytics_routine_adherence')}</Text>
          <View style={styles.siteHeroRow}>
            <Text style={[styles.siteHero, { color: colors.text, fontFamily: font.displayBold }]}>{data.hasData ? `${adherenceRate}%` : '—'}</Text>
            <Text style={[styles.siteBody, { color: colors.textSecondary, fontFamily: font.body }]}>
              {data.hasData
                ? `${data.totalSkips} ${t('kids_analytics_routine_total_skips').toLowerCase()}`
                : t('sw2_an_noRoutines')}
            </Text>
          </View>
        </FadeUp>

        {data.hasData && (
          <FadeUp index={1}>
            <View style={[styles.siteDivider, { backgroundColor: colors.border }]} />
            <Text style={[styles.siteEyebrow, { color: colors.textSecondary }]}>{t('kids_analytics_routine_skips_per_day')}</Text>
            <View style={styles.routineBarsRow}>
              {data.weeklySkips.map((count, i) => {
                const barH = count > 0 ? Math.max((count / maxSkipSite) * 44, 8) : 3
                return (
                  <View key={i} style={styles.routineBarCell}>
                    <Text style={[styles.siteSmall, { color: colors.text, fontFamily: font.bodySemiBold, height: 16 }]}>{count > 0 ? count : ''}</Text>
                    <View style={{ flex: 1, justifyContent: 'flex-end', width: '100%' }}>
                      <View style={{ height: barH, backgroundColor: count > 0 ? tint : colors.border, borderRadius: 8, borderWidth: count > 0 ? 1.5 : 0, borderColor: colors.text }} />
                    </View>
                    <Text style={[styles.siteSmall, { color: colors.textSecondary, fontFamily: font.body, marginTop: 4 }]}>{data.weekLabels[i]}</Text>
                  </View>
                )
              })}
            </View>
          </FadeUp>
        )}

        {data.mostSkipped.length > 0 && (
          <FadeUp index={2}>
            <View style={[styles.siteDivider, { backgroundColor: colors.border }]} />
            <Text style={[styles.siteEyebrow, { color: colors.textSecondary }]}>{t('kids_analytics_routine_most_skipped')}</Text>
            {data.mostSkipped.map((item, i) => (
              <View key={i} style={[styles.routineSkipRow, { paddingVertical: 11 }, i > 0 && { borderTopWidth: HAIR, borderTopColor: colors.border }]}>
                <Text style={[styles.siteBody, { color: colors.text, fontFamily: font.body, flex: 1 }]}>{item.name}</Text>
                <Text style={[styles.siteNum, { color: colors.text, fontFamily: font.displayBold, fontSize: 18 }]}>{item.count}{'×'}</Text>
              </View>
            ))}
          </FadeUp>
        )}

        {!data.hasData && (
          <Text style={[styles.siteSmall, { color: colors.textSecondary, fontFamily: font.body, textAlign: 'center', marginTop: 20 }]}>
            {t('kids_analytics_routine_no_skips')}
          </Text>
        )}
      </ScrollView>
    </LightSheet>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PILLAR ROW — score bar with trend + takeaway
// ═══════════════════════════════════════════════════════════════════════════════

function PillarRow({ pillarKey, score, stat = null, tip, onPress }: {
  pillarKey: PillarKey
  score: PillarScore
  /** Light UI: neutral count/average shown instead of a `/10` grade. */
  stat?: PillarStat | null
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
  const coveragePct = stat ? Math.round(Math.max(0, Math.min(1, stat.coverage)) * 100) : 0

  // Prefer the data-driven tip body; fall back to a generic takeaway.
  const body = tip
    ? tip.body
    : score.hasData
    ? (diffuse ? t('kids_analytics_pillar_tap_details') : '')
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
          {PILLAR_LINE_ICON[pillarKey](26, palette.chip)}
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
          {pillarKey === 'health' ? (
            // Health is reference-only — no `/10` grade, ever. (Not wrapped
            // in t() — PILLAR_EXPLAIN/WEIGHTS above this component are also
            // untranslated English literals; see the i18n coverage plan.)
            <Text style={{ fontFamily: diffuseFont.mono, fontSize: 11, letterSpacing: 1, color: dt.colors.ink3 }}>
              REFERENCE
            </Text>
          ) : score.hasData && Number.isFinite(score.value) ? (
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
        styles.pillarRowSite,
        { borderTopColor: colors.border },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.pillarPaperHead}>
        <SiteSticker name={PILLAR_SITE_STICKER[pillarKey]} size={34} cut />

        <View style={{ flex: 1 }}>
          <View style={styles.pillarPaperTitleRow}>
            <Text style={[styles.siteSectionTitle, { color: colors.text, fontFamily: font.display }]}>
              {config.label}
            </Text>
            {/* Trend = direction only (steadier / less steady than last
                week). The % was a change in an internal score — not shown. */}
            {score.hasData && score.trend !== 0 && pillarKey !== 'health' && (
              <View style={styles.trendBadge} accessibilityLabel={score.trend > 0 ? 'steadier than last week' : 'less steady than last week'}>
                {score.trend > 0
                  ? <ArrowUpRight size={12} color={colors.text} strokeWidth={2.5} />
                  : <ArrowDownRight size={12} color={colors.text} strokeWidth={2.5} />}
              </View>
            )}
          </View>

          {/* Bar = how much of the window has logs (never a grade). */}
          {pillarKey !== 'health' && (
            <View style={[styles.siteBarTrack, { backgroundColor: colors.border }]}>
              <View style={[styles.siteBarFill, { width: `${coveragePct}%`, backgroundColor: palette.tint, borderColor: coveragePct > 0 ? colors.text : 'transparent' }]} />
            </View>
          )}
        </View>

        <View style={styles.pillarPaperScore}>
          {pillarKey === 'health' ? (
            // Health is reference-only — no `/10` grade, ever.
            <Text style={[styles.siteMono, { color: colors.textSecondary }]}>{tNow('kp_ka_reference')}</Text>
          ) : stat ? (
            <>
              <Text style={[styles.siteNum, { color: colors.text, fontFamily: font.displayBold }]}>{stat.value}</Text>
              <Text style={[styles.siteMono, { color: colors.textSecondary, marginLeft: 4 }]}>{t(stat.unitKey)}</Text>
            </>
          ) : (
            <Text style={[styles.siteMono, { color: colors.textSecondary }]}>{'—'}</Text>
          )}
        </View>
      </View>

      {/* Integrated tip body — replaces the old "Health Tips" cards. */}
      {tip && (
        <Text style={[styles.pillarPaperTipTitle, { color: colors.text, fontFamily: font.bodySemiBold, marginTop: 10 }]} numberOfLines={1}>
          {tip.title}
        </Text>
      )}
      {body ? (
        <Text
          style={[styles.siteSmall, { color: colors.textSecondary, fontFamily: font.body, marginTop: tip ? 3 : 10 }]}
          numberOfLines={3}
        >
          {body}
        </Text>
      ) : null}

      <View style={styles.pillarPaperFooter}>
        <Text style={[styles.siteMono, { color: colors.text }]}>{t('kids_analytics_tip_tap_details')}</Text>
        <ChevronRight size={14} color={colors.text} strokeWidth={2.2} />
      </View>
    </Pressable>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PILLAR DETAIL MODAL — slide-up bottom sheet
// ═══════════════════════════════════════════════════════════════════════════════

function PillarDetailModal({
  visible, pillarKey, analytics, chartW, childName, ageMonths, sex, onClose, onFullScreen,
}: {
  visible: boolean
  pillarKey: PillarKey | null
  analytics: AnalyticsData
  chartW: number
  childName: string
  ageMonths: number
  sex: Sex | null
  onClose: () => void
  onFullScreen: (id: string) => void
}) {
  const { t } = useTranslation()
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const insets = useSafeAreaInsets()
  if (!pillarKey) return null
  const config = PILLAR_CONFIG[pillarKey]
  const score = analytics.scores[pillarKey]
  const lightStat = pillarStat(pillarKey, analytics)
  const palette = pillarPalette(pillarKey, stickers)

  const sheetH = SCREEN_H * 0.87

  if (diffuse) {
    return (
      <DiffuseSheet
        visible={visible}
        title={config.label}
        // Health is a REFERENCE pillar (vaccines-on-record + concern flags) —
        // never a graded `/10`. A mono "REFERENCE" chip (existing DiffuseSheet
        // chip styling — roleType.data) replaces the numeric chip for it.
        chip={pillarKey === 'health' ? 'REFERENCE' : score.hasData ? `${score.value.toFixed(1)}/10` : undefined}
        onClose={onClose}
      >
        <PillarDetail
          pillarKey={pillarKey}
          analytics={analytics}
          chartW={chartW}
          onFullScreen={onFullScreen}
          childName={childName}
          ageMonths={ageMonths}
          sex={sex}
        />
      </DiffuseSheet>
    )
  }

  return (
    <LightSheet visible={visible} onClose={onClose} height={sheetH}>
      <View style={{ paddingHorizontal: 20 }}>
        <DetailSheetHeader
          title={config.label}
          sticker={PILLAR_SITE_STICKER[pillarKey]}
          tone={palette.tint}
          onClose={onClose}
        />
        {pillarKey === 'health' ? (
          <Text style={[styles.siteEyebrow, { color: colors.textSecondary, marginBottom: 0 }]}>
            Reference — vaccines on record, not scored
          </Text>
        ) : lightStat ? (
          // Neutral count/average — never a `/10` grade or label.
          <Text style={[styles.siteEyebrow, { color: colors.textSecondary, marginBottom: 0 }]}>
            {lightStat.value}{' '}{t(lightStat.unitKey)}
          </Text>
        ) : null}
      </View>

      {/* Scrollable content — flex:1 fills the remaining sheet height */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 28, gap: 16 }}
      >
        <FadeUp index={0}>
          <PillarDetail
            pillarKey={pillarKey}
            analytics={analytics}
            chartW={chartW}
            onFullScreen={onFullScreen}
            childName={childName}
            ageMonths={ageMonths}
            sex={sex}
          />
        </FadeUp>
      </ScrollView>
    </LightSheet>
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

  const activities: ActivityItem[] = activityGuide(ageMonths).map((x, i) => ({ rank: i + 1, ...x }))

  const sheetH = SCREEN_H * 0.75

  return (
    <SheetModal visible={visible} onClose={onClose}>
      {(dragZone) => (
        <View style={[styles.modalSheet, { height: sheetH, backgroundColor: colors.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32 }]}>
          <View {...dragZone} style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>

          <View {...dragZone} style={[styles.modalHeader, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingBottom: 16 }]}>
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
      )}
    </SheetModal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PILLAR DETAIL — charts with day detail strip
// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════

function PillarDetail({ pillarKey, analytics, chartW, onFullScreen, childName, ageMonths, sex }: {
  pillarKey: PillarKey
  analytics: AnalyticsData
  chartW: number
  onFullScreen: (id: string) => void
  childName: string
  ageMonths: number
  sex: Sex | null
}) {
  const { colors, radius, stickers } = useTheme()
  const { t } = useTranslation()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  // Every pillar sheet leads with the observation-led insight (headline +
  // supporting lines) and demotes its existing detailed content — explain
  // block, stat trio, charts, lists — behind one "Show details" disclosure,
  // collapsed by default (spec: docs/superpowers/specs/2026-07-28-kids-
  // insights-observation-led-content.md §2). `PillarDetailModal` returns
  // null while no pillar is selected, so each pillar selection remounts a
  // fresh `PillarDetail` — this single flag never leaks open/closed state
  // from one pillar's sheet into the next.
  const [showDetails, setShowDetails] = useState(true)

  const cardStyle = diffuse
    ? { borderTopWidth: 1, borderTopColor: dt.colors.line, paddingTop: 16, marginTop: 4 } as const
    : { borderTopWidth: HAIR, borderTopColor: colors.border, paddingTop: 16 } as const
  const chartTitleColor = diffuse ? dt.colors.ink : colors.text
  // Light section: hairline rule + a Space Mono eyebrow, no boxes.
  const quietSection = { borderTopWidth: HAIR, borderTopColor: colors.border, paddingTop: 16 } as const
  const siteEyebrowStyle = [styles.siteEyebrow, { color: colors.textSecondary }]

  // Lead + supporting render — identical treatment across all six pillars
  // (spec §2's "one honest sentence" headline, then 1–2 supporting lines).
  const renderLead = (insight: PillarInsight) => (
    <View style={{ gap: 8 }}>
      <Text style={{
        fontSize: diffuse ? 20 : 18,
        lineHeight: diffuse ? 27 : 26,
        color: diffuse ? dt.colors.ink : colors.text,
        fontFamily: diffuse ? dt.typeRole.title : font.bodySemiBold,
        letterSpacing: diffuse ? -0.2 : 0,
      }}>
        {insight.lead}
      </Text>
      {insight.supporting.map((line, i) => (
        <Text
          key={i}
          style={[styles.detailExplain, { color: diffuse ? dt.colors.ink2 : colors.textSecondary, fontFamily: diffuse ? diffuseFont.body : font.body, paddingHorizontal: diffuse ? 4 : 0 }]}
        >
          {line}
        </Text>
      ))}
    </View>
  )

  // Demotes the pillar's raw chart/explain/stat content behind a single
  // "Show details" toggle, collapsed by default — the lead above is the
  // whole point; this is for the parent who wants to dig into the diary.
  const renderDetailsToggle = (content: React.ReactNode) => (
    <View>
      <Pressable
        onPress={() => setShowDetails((v) => !v)}
        style={({ pressed }) => [
          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, opacity: pressed ? 0.6 : 1 },
          !diffuse && { borderTopWidth: HAIR, borderTopColor: colors.border, paddingTop: 14 },
        ]}
      >
        <Text style={diffuse
          ? [styles.diffuseEyebrow, { color: dt.colors.ink3, marginBottom: 0 }]
          : [styles.siteEyebrow, { color: colors.text, marginBottom: 0 }]}>
          {showDetails ? t('kp_ka_hideDetails') : t('kp_ka_showDetails')}
        </Text>
        <Text style={{ fontFamily: 'HankenGrotesk_400Regular', color: diffuse ? dt.colors.ink3 : colors.text, fontSize: 15 }}>{showDetails ? '▾' : '▸'}</Text>
      </Pressable>
      {showDetails && <View style={{ gap: 16 }}>{content}</View>}
    </View>
  )

  switch (pillarKey) {
    case 'nutrition': {
      const nutr = analytics.nutrition
      const mode = nutr.mode
      const totalMeals = nutr.mealFrequency.reduce((a, b) => a + b, 0)
      const daysLogged = nutr.mealFrequency.filter((m) => m > 0).length
      const avgPerDay = daysLogged > 0 ? fmt1(totalMeals / daysLogged) : '—'
      const variety = nutr.topFoods.length

      const totalBreast = nutr.breastSessions.reduce((a, b) => a + b, 0)
      const totalBottle = nutr.bottleSessions.reduce((a, b) => a + b, 0)
      const totalBottleMl = nutr.bottleMlPerDay.reduce((a, b) => a + b, 0)

      // "Ate well" is a share of RATED meals only (good + little + none) — a
      // meal with no quality logged is neither good nor bad and must not
      // silently count toward the denominator. Matches buildNutritionInsight's
      // rated-meal % (this used to divide by ALL meals incl. unrated, which
      // is how it could read "0% ate well" of 441 meals).
      const totalGood = nutr.eatQuality.good.reduce((a, b) => a + b, 0)
      const totalLittle = nutr.eatQuality.little.reduce((a, b) => a + b, 0)
      const totalNone = nutr.eatQuality.none.reduce((a, b) => a + b, 0)
      const ratedTotal = totalGood + totalLittle + totalNone
      const pctGood = ratedTotal > 0 ? Math.round((totalGood / ratedTotal) * 100) : 0

      // Mode-specific stat pills.
      const isMilkPhase = mode === 'milk'
      const isMixedPhase = mode === 'mixed'

      const insight = buildNutritionInsight(analytics, ageMonths, childName)

      return (
        <View style={styles.detailBody}>
          {renderLead(insight)}
          {!nutr.hasData && <EmptyDetail pillar="nutrition" />}
          {insight.demotedAvailable && renderDetailsToggle(<>
          {/* Summary stats — differ by age mode */}
          <StatRow>
            {isMilkPhase ? (
              <>
                <StatPill label={t('kp_ka_avgFeeds')} value={avgPerDay} color={PILLAR_CONFIG.nutrition.color} />
                <StatPill label={t('kidsAnalytics_breastTotal')} value={`${totalBreast}`} color={brand.secondary} />
                <StatPill
                  label={t('kidsAnalytics_bottleTotal')}
                  value={totalBottleMl > 0 ? `${Math.round(totalBottleMl)}ml` : `${totalBottle}×`}
                  color={brand.accent}
                />
              </>
            ) : isMixedPhase ? (
              <>
                <StatPill label={t('kp_ka_avgFeeds')} value={avgPerDay} color={PILLAR_CONFIG.nutrition.color} />
                <StatPill label={t('kidsAnalytics_milkFeedsTotal')} value={`${totalBreast + totalBottle}`} color={brand.secondary} />
                <StatPill label={t('kidsAnalytics_foodsTriedTotal')} value={`${variety}`} color={brand.accent} />
              </>
            ) : (
              <>
                <StatPill label={t('kids_logForm_ateWell')} value={ratedTotal > 0 ? `${pctGood}%` : '—'} color={brand.success} />
                <StatPill label={t('kp_ka_avgMeals')} value={avgPerDay} color={PILLAR_CONFIG.nutrition.color} />
                <StatPill label={t('kp_ka_foodsVariety')} value={`${variety}`} color={brand.secondary} />
              </>
            )}
          </StatRow>

          {/* Mode-specific charts */}
          {isMilkPhase && (
            <ChartCard title={t('kp_ka_feedsPerDay')} onExpand={() => onFullScreen('meal_freq')}>
              <MealsLineChart
                data={analytics.nutrition.mealFrequency}
                labels={analytics.nutrition.weekLabels}
                width={chartW}
              />
            </ChartCard>
          )}

          {isMilkPhase && (totalBreast > 0 || totalBottle > 0) && (
            <View style={[styles.card, diffuse ? cardStyle : { ...quietSection, padding: 0, shadowOpacity: 0, elevation: 0 }]}>
              <Text style={diffuse
                ? [styles.chartTitle, { color: chartTitleColor, fontFamily: diffuseFont.display }]
                : siteEyebrowStyle}>{t('kids_home_feeding_modal_breast_vs_bottle')}</Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: diffuse ? 10 : 0 }}>
                <View style={{ flex: 1, alignItems: diffuse ? 'center' : 'flex-start', padding: diffuse ? 16 : 0, backgroundColor: diffuse ? colors.surfaceRaised : 'transparent', borderRadius: radius.lg }}>
                  <Text style={{ color: diffuse ? PILLAR_CONFIG.nutrition.color : colors.text, fontSize: 28, fontFamily: diffuse ? font.display : font.displayBold }}>{totalBreast}</Text>
                  <Text style={{ color: diffuse ? colors.textMuted : colors.textSecondary, fontSize: 12, fontFamily: font.bodyMedium, marginTop: 4 }}>{t('kids_analytics_breast_sessions')}</Text>
                </View>
                <View style={{ flex: 1, alignItems: diffuse ? 'center' : 'flex-start', padding: diffuse ? 16 : 0, backgroundColor: diffuse ? colors.surfaceRaised : 'transparent', borderRadius: radius.lg }}>
                  <Text style={{ color: diffuse ? brand.secondary : colors.text, fontSize: 28, fontFamily: diffuse ? font.display : font.displayBold }}>{totalBottle}</Text>
                  <Text style={{ color: diffuse ? colors.textMuted : colors.textSecondary, fontSize: 12, fontFamily: font.bodyMedium, marginTop: 4 }}>
                    {totalBottleMl > 0 ? t('kp_ka_mlTotal', { n: Math.round(totalBottleMl) }) : t('kp_ka_bottles')}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {!isMilkPhase && (
            <ChartCard title={t('kp_ka_eatQuality')} onExpand={() => onFullScreen('eat_quality')}>
              <EatQualityBubbles
                good={analytics.nutrition.eatQuality.good}
                little={analytics.nutrition.eatQuality.little}
                none={analytics.nutrition.eatQuality.none}
              />
            </ChartCard>
          )}
          {!isMilkPhase && (
            <ChartCard title={t('kp_ka_mealsPerDay')} onExpand={() => onFullScreen('meal_freq')}>
              <MealsLineChart
                data={analytics.nutrition.mealFrequency}
                labels={analytics.nutrition.weekLabels}
                width={chartW}
              />
            </ChartCard>
          )}
          {!isMilkPhase && analytics.nutrition.topFoods.length > 0 && (
            <View style={diffuse
              ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: dt.colors.line, paddingTop: 16, marginTop: 4 }
              : quietSection}>
              <Text style={diffuse
                ? [styles.diffuseEyebrow, { color: dt.colors.ink3 }]
                : siteEyebrowStyle}>{t('kids_analytics_most_logged_foods')}</Text>
              <View style={{ gap: 0 }}>
                {analytics.nutrition.topFoods.map((food, i) => (
                  <View
                    key={i}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 14,
                      paddingVertical: 12,
                      borderBottomWidth: i < analytics.nutrition.topFoods.length - 1 ? StyleSheet.hairlineWidth : 0,
                      borderBottomColor: diffuse ? dt.colors.line : colors.border,
                    }}
                  >
                    {diffuse ? (
                      <View style={{ width: 24, alignItems: 'center' }}>
                        <Text style={{ color: rankColor(i), fontSize: 12, fontFamily: diffuseFont.monoBold }}>{i + 1}</Text>
                      </View>
                    ) : (
                      <View style={{ width: 24, alignItems: 'center' }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: MONO }}>{i + 1}</Text>
                      </View>
                    )}
                    <Text style={{ color: diffuse ? dt.colors.ink : colors.text, fontSize: 15, fontWeight: diffuse ? '600' : undefined, fontFamily: diffuse ? diffuseFont.body : font.bodySemiBold, flex: 1 }}>{food.label}</Text>
                    {diffuse ? (
                      <Text style={{ color: dt.colors.ink3, fontSize: 12, fontFamily: diffuseFont.mono, letterSpacing: 0.4, textTransform: 'uppercase' }}>{t('kids_analytics_times_prefix', { count: food.count })}</Text>
                    ) : (
                      <Text style={{ color: colors.text, fontSize: 12, fontFamily: MONO, letterSpacing: 0.4, textTransform: 'uppercase' }}>{t('kids_analytics_times_prefix', { count: food.count })}</Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}
          </>)}
        </View>
      )
    }

    case 'sleep': {
      const target = getAgeSleepTarget(ageMonths)
      const avg = analytics.sleep.avgHours
      const insight = buildSleepInsight(analytics, ageMonths, childName)

      return (
        <View style={styles.detailBody}>
          {renderLead(insight)}
          {!analytics.sleep.hasData && <EmptyDetail pillar="sleep" />}
          {insight.demotedAvailable && renderDetailsToggle(<>
          {/* Stats at top */}
          <StatRow>
            <StatPill label={t('kidsAnalytics_avgPerNight')} value={`${fmt1(avg)}h`} color={PILLAR_CONFIG.sleep.color} />
            <StatPill label={t('kp_ka_quality')} value={getBestQuality(analytics.sleep.qualityCounts)} color={brand.success} />
            <StatPill label={t('kidsAnalytics_targetPerNight')} value={`${target}h`} color={colors.textMuted} />
          </StatRow>

          {/* Highlighted bar chart */}
          <ChartCard title={t('kp_ka_dailySleep')} onExpand={() => onFullScreen('sleep_weekly')}>
            <HighlightBarChart
              data={analytics.sleep.dailyHours}
              labels={analytics.sleep.weekLabels}
              color={PILLAR_CONFIG.sleep.color}
              width={chartW}
              unit="h"
              target={target}
            />
          </ChartCard>

          {/* Sleep quality breakdown */}
          <ChartCard title={t('kp_ka_sleepQualityBreakdown')} onExpand={() => onFullScreen('sleep_quality')}>
            <SleepQualityChart counts={analytics.sleep.qualityCounts} />
          </ChartCard>
          </>)}
        </View>
      )
    }

    case 'mood': {
      const insight = buildMoodInsight(analytics, ageMonths, childName)
      return (
        <View style={styles.detailBody}>
          {renderLead(insight)}
          {!analytics.mood.hasData && <EmptyDetail pillar="mood" />}
          {insight.demotedAvailable && renderDetailsToggle(<>
          <ChartCard title={t('kp_ka_moodDist')} onExpand={() => onFullScreen('mood_dist')}>
            <MoodDistribution moods={analytics.mood.dominantMoods} />
          </ChartCard>
          <ChartCard title={t('kp_ka_moodDaily')} onExpand={() => onFullScreen('mood_daily')}>
            <MoodDailyChart dailyCounts={analytics.mood.dailyCounts} labels={analytics.mood.weekLabels} width={chartW} />
          </ChartCard>
          </>)}
        </View>
      )
    }

    case 'health': {
      const doneVaccines = analytics.health.vaccines.filter((v) => v.done).length
      const totalVaccines = analytics.health.vaccines.length
      const vaccinePct = totalVaccines > 0 ? Math.round((doneVaccines / totalVaccines) * 100) : 0
      // Observation-led lead + supporting copy (spec: kids-insights-observation-
      // led-content §4 HEALTH) — replaces the old stat-trio/diary-first layout.
      // Health carries no /10 score, so this IS the "how's my child doing" answer.
      const insight = buildHealthInsight(analytics, ageMonths, childName)

      // Group events by type
      const eventsByType: Record<string, typeof analytics.health.recentEvents> = {}
      for (const e of analytics.health.recentEvents) {
        if (!eventsByType[e.type]) eventsByType[e.type] = []
        eventsByType[e.type].push(e)
      }

      return (
        <View style={styles.detailBody}>
          {/* Lead insight — the wellness read, not the raw log */}
          {renderLead(insight)}

          {renderDetailsToggle(<>
          {/* Weekly event frequency chart — the one supporting visual. Health is
              becoming a reference surface (vaccines + genuine concerns only,
              not a graded score), so this low-value frequency chart is dropped
              in Diffuse; kept for the legacy theme. */}
          {analytics.health.hasData && !diffuse && (
            <ChartCard title={t('kp_ka_careLogged')} onExpand={() => onFullScreen('health_freq')}>
              <BarChart data={analytics.health.weeklyFrequency} labels={analytics.health.weekLabels} color={PILLAR_CONFIG.health.color} width={chartW} />
            </ChartCard>
          )}

          {/* Raw care log — the lead above already says what matters; this is
              the diary for a parent who wants to dig in, folded into the same
              "Show details" disclosure rather than a second nested toggle. */}
          {analytics.health.hasData && analytics.health.recentEvents.length > 0 && (
            <View style={diffuse
              ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: dt.colors.line, paddingTop: 16, marginTop: 4 }
              : quietSection}>
              <Text style={diffuse
                ? [styles.diffuseEyebrow, { color: dt.colors.ink3 }]
                : siteEyebrowStyle}>{t('kp_ka_recentCare')}</Text>
              {Object.entries(eventsByType).map(([type, events]) => (
                <View key={type} style={{ marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    {diffuse
                      ? <EmojiSticker size={14}>{getHealthEventEmoji(type)}</EmojiSticker>
                      : <SiteSticker name={HEALTH_EVENT_STICKER[type.toLowerCase()] ?? 'pencil'} size={20} />}
                    <Text style={{ color: diffuse ? dt.colors.ink3 : colors.textSecondary, fontSize: 11, fontWeight: diffuse ? '600' : undefined, fontFamily: diffuse ? diffuseFont.mono : MONO, letterSpacing: 1.4 }}>
                      {getHealthEventLabel(type).toUpperCase()}
                    </Text>
                  </View>
                  {events.map((e, i) => (
                    <View
                      key={i}
                      style={[styles.eventRow, { borderBottomColor: i < events.length - 1 ? (diffuse ? dt.colors.line : colors.border) : 'transparent' }]}
                    >
                      <View style={[styles.eventDot, { backgroundColor: diffuse ? dt.colors.ink3 : colors.text, width: diffuse ? 12 : 6, height: diffuse ? 12 : 6, borderRadius: diffuse ? 6 : 3 }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.eventLabel, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.body : font.body }]} numberOfLines={1}>{e.label}</Text>
                        <Text style={[styles.eventDate, { color: diffuse ? dt.colors.ink3 : colors.textSecondary, fontFamily: diffuse ? diffuseFont.mono : MONO, fontSize: diffuse ? undefined : 11 }]}>{e.date}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}

          {/* Vaccine tracker */}
          <View style={diffuse
            ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: dt.colors.line, paddingTop: 16, marginTop: 4 }
            : quietSection}>
            <View style={[styles.row, { marginBottom: 4 }]}>
              {diffuse
                ? <Character name="vaccine" size={20} color={getDiffuseAccent('kids', dt.isDark)} />
                : <SiteSticker name="syringe" size={26} cut />}
              <Text style={diffuse
                ? [styles.diffuseEyebrow, { color: dt.colors.ink3, marginBottom: 0 }]
                : [styles.siteEyebrow, { color: colors.textSecondary, marginBottom: 0 }]}>{t('kids_analytics_vaccine_tracker_title')}</Text>
            </View>
            {/* Progress bar */}
            <View style={{ height: diffuse ? 4 : 6, borderRadius: 999, marginTop: 12, marginBottom: 12, overflow: 'hidden', backgroundColor: diffuse ? dt.colors.line : colors.border }}>
              <View style={{ width: `${vaccinePct}%`, height: '100%', backgroundColor: diffuse ? getDiffuseAccent('kids', dt.isDark) : stickers.green, borderRadius: 999 }} />
            </View>
            <Text style={[styles.detailExplain, { color: diffuse ? dt.colors.ink3 : colors.textSecondary, marginBottom: 14, fontFamily: diffuse ? diffuseFont.body : undefined }]}>
              {t('kp_ka_completed', { done: doneVaccines, total: totalVaccines })}
            </Text>
            <View style={styles.vaccineGrid}>
              {analytics.health.vaccines.map((v, i) => (
                <View
                  key={i}
                  style={[styles.vaccineChip, {
                    backgroundColor: v.done ? (diffuse ? getDiffuseAccent('kids', dt.isDark) + '22' : stickers.greenSoft) : (diffuse ? 'transparent' : colors.surface),
                    borderColor: v.done ? (diffuse ? getDiffuseAccent('kids', dt.isDark) + '66' : colors.text) : (diffuse ? dt.colors.line2 : colors.border),
                    borderWidth: diffuse ? 1 : (v.done ? 1.5 : 1),
                    borderRadius: radius.full,
                  }]}
                >
                  {v.done && (diffuse
                    ? <Character name="vaccine" size={13} color={getDiffuseAccent('kids', dt.isDark)} />
                    : <Shield size={14} color={colors.text} strokeWidth={2.5} />)}
                  <Text style={[styles.vaccineText, { color: v.done ? (diffuse ? dt.colors.ink : colors.text) : (diffuse ? dt.colors.ink3 : colors.textSecondary), fontFamily: diffuse ? diffuseFont.mono : (v.done ? font.bodyBold : font.body) }]}>{v.name}</Text>
                </View>
              ))}
            </View>
          </View>
          </>)}
        </View>
      )
    }

    case 'growth': {
      const insight = buildGrowthInsight(analytics, ageMonths, childName, sex)
      return (
        <View style={styles.detailBody}>
          {renderLead(insight)}
          {!analytics.growth.hasData && <EmptyDetail pillar="growth" />}
          {insight.demotedAvailable && renderDetailsToggle(<>
          {/* Latest measurements — always shown */}
          {(() => {
            const lastWeight = analytics.growth.weights[analytics.growth.weights.length - 1]
            const lastHeight = analytics.growth.heights[analytics.growth.heights.length - 1]
            if (!lastWeight && !lastHeight) return null
            return (
              <StatRow>
                {lastWeight && (
                  <StatPill
                    label={t('kp_ka_weightDate', { date: parseLocalDate(lastWeight.date).toLocaleDateString(dateLoc(), { month: 'short', day: 'numeric' }) })}
                    value={`${lastWeight.value}kg`}
                    color={PILLAR_CONFIG.health.color}
                  />
                )}
                {lastHeight && (
                  <StatPill
                    label={t('kp_ka_heightDate', { date: parseLocalDate(lastHeight.date).toLocaleDateString(dateLoc(), { month: 'short', day: 'numeric' }) })}
                    value={`${lastHeight.value}cm`}
                    color={PILLAR_CONFIG.growth.color}
                  />
                )}
              </StatRow>
            )
          })()}

          {/* Growth over time — Diffuse: Kids milestone-trail bubbles; else line */}
          {analytics.growth.weights.length >= 2 && (
            <ChartCard title={t('kp_ka_weightOverTime')} onExpand={() => onFullScreen('weight')}>
              {diffuse ? (
                <MilestoneTrail
                  data={analytics.growth.weights.map((w) => w.value)}
                  labels={analytics.growth.weights.map((w) => { const d = parseLocalDate(w.date); return `${d.getMonth() + 1}/${d.getDate()}` })}
                  color={stickers.yellow}
                  accent={getDiffuseAccent('kids', dt.isDark)}
                />
              ) : (
                <LineChart
                  data={analytics.growth.weights.map((w) => w.value)}
                  labels={analytics.growth.weights.map((w) => { const d = parseLocalDate(w.date); return `${d.getMonth() + 1}/${d.getDate()}` })}
                  color={PILLAR_CONFIG.health.color}
                  width={chartW}
                  unit="kg"
                  showAverage
                />
              )}
            </ChartCard>
          )}
          {analytics.growth.heights.length >= 2 && (
            <ChartCard title={t('kp_ka_heightOverTime')} onExpand={() => onFullScreen('height')}>
              {diffuse ? (
                <MilestoneTrail
                  data={analytics.growth.heights.map((h) => h.value)}
                  labels={analytics.growth.heights.map((h) => { const d = parseLocalDate(h.date); return `${d.getMonth() + 1}/${d.getDate()}` })}
                  color={stickers.green}
                  accent={getDiffuseAccent('kids', dt.isDark)}
                />
              ) : (
                <LineChart
                  data={analytics.growth.heights.map((h) => h.value)}
                  labels={analytics.growth.heights.map((h) => { const d = parseLocalDate(h.date); return `${d.getMonth() + 1}/${d.getDate()}` })}
                  color={PILLAR_CONFIG.growth.color}
                  width={chartW}
                  unit="cm"
                  showAverage
                />
              )}
            </ChartCard>
          )}

          {analytics.growth.weights.length < 2 && analytics.growth.heights.length < 2 && (
            <View style={[styles.card, diffuse ? { ...cardStyle, alignItems: 'center', paddingVertical: 20 } : { alignItems: 'center', paddingVertical: 20, padding: 0, shadowOpacity: 0, elevation: 0 }]}>
              {diffuse
                ? <Character name="growth" size={24} color={dt.colors.ink3} />
                : <SiteSticker name="ruler" size={40} cut />}
              <Text style={[styles.emptyText, { color: diffuse ? dt.colors.ink3 : colors.textSecondary, marginTop: 8, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
                {t('kids_analytics_add_measurements_hint')}
              </Text>
            </View>
          )}
          </>)}
        </View>
      )
    }

    case 'activity': {
      const act = analytics.activity
      const COLOR = PILLAR_CONFIG.activity.color
      // Real span of the selected window — "active days" is out of however
      // many days are actually in view, never a hardcoded /7 (that broke the
      // stat once a 30/90-day range was selected).
      const windowDays = Math.max(1, act.dailySessions.length)

      const guideItems = activityGuide(ageMonths)

      const insight = buildActivityInsight(analytics, ageMonths, childName)

      return (
        <View style={styles.detailBody}>
          {renderLead(insight)}
          {renderDetailsToggle(<>
          {/* Stats */}
          <StatRow>
            <StatPill label={t('kidsAnalytics_activeDaysTotal')} value={act.hasData ? `${act.activeDays}/${windowDays}` : '—'} color={COLOR} />
            <StatPill label={t('kidsAnalytics_sessionsTotal')} value={act.hasData ? `${act.totalSessions}` : '—'} color={brand.secondary} />
            <StatPill label={t('kidsAnalytics_activityTypes')} value={act.hasData ? `${act.uniqueTypes.length}` : '—'} color={brand.accent} />
          </StatRow>

          {/* Weekly sessions bar chart */}
          {act.hasData && (
            <ChartCard title={t('kp_ka_activitySessions')} onExpand={() => onFullScreen('activity_weekly')}>
              <HighlightBarChart
                data={act.dailySessions}
                labels={act.weekLabels}
                color={COLOR}
                width={chartW}
              />
            </ChartCard>
          )}

          {/* Age-appropriate guide — RecSplit pattern from the mockup */}
          {(() => {
            const splitAccent = diffuse ? getDiffuseAccent('kids', dt.isDark) : COLOR
            return (
              <View style={diffuse
                ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: dt.colors.line, paddingTop: 16, marginTop: 4 }
                : quietSection}>
                <Text style={diffuse
                  ? [styles.diffuseEyebrow, { color: dt.colors.ink3 }]
                  : siteEyebrowStyle}>{t('kids_analytics_activity_rec_split')}</Text>
                {guideItems.map((item) => (
                  <View key={item.label} style={{ paddingVertical: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      {!diffuse && <SiteSticker name={EMOJI_SITE_STICKER[item.emoji] ?? 'star'} size={26} cut />}
                      <Text style={{ flex: 1, color: diffuse ? dt.colors.ink : colors.text, fontSize: diffuse ? 14 : 15, fontFamily: diffuse ? diffuseFont.display : font.bodySemiBold, letterSpacing: diffuse ? -0.1 : 0 }}>
                        {item.label}
                      </Text>
                      <Text style={{ color: diffuse ? dt.colors.ink : colors.text, fontSize: 16, fontFamily: diffuse ? diffuseFont.mono : font.displayBold, letterSpacing: diffuse ? -0.3 : 0 }}>
                        {item.pct}%
                      </Text>
                    </View>
                    <View style={{ height: diffuse ? 4 : 6, borderRadius: 999, backgroundColor: diffuse ? dt.colors.line : colors.border, marginTop: 6, overflow: 'hidden' }}>
                      <View style={{ width: `${item.pct}%`, height: '100%', backgroundColor: diffuse ? splitAccent : stickers.peach }} />
                    </View>
                    <Text style={{ color: diffuse ? dt.colors.ink3 : colors.textSecondary, fontSize: diffuse ? 11 : 12, fontFamily: diffuse ? diffuseFont.body : font.body, lineHeight: diffuse ? 14 : 17, marginTop: 4 }}>
                      {item.tip}
                    </Text>
                  </View>
                ))}
                {diffuse ? (
                  <Text style={{ color: dt.colors.ink3, fontSize: 12, fontFamily: diffuseFont.body, lineHeight: 17, marginTop: 10 }}>
                    {ageMonths < 12
                      ? 'Aim for 20–30 min tummy time daily, spread across sessions.'
                      : ageMonths < 36
                      ? 'WHO recommends 180 min of activity/day for toddlers, spread throughout.'
                      : 'WHO recommends 60 min of moderate-to-vigorous activity daily for children 3+.'}
                  </Text>
                ) : (
                  <View style={{ marginTop: 8, flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderTopWidth: HAIR, borderTopColor: colors.border, paddingTop: 12 }}>
                    <SiteSticker name="bell" size={22} />
                    <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: font.body, flex: 1, lineHeight: 19 }}>
                      {ageMonths < 12
                        ? 'Aim for 20–30 min tummy time daily, spread across sessions.'
                        : ageMonths < 36
                        ? 'WHO recommends 180 min of activity/day for toddlers, spread throughout.'
                        : 'WHO recommends 60 min of moderate-to-vigorous activity daily for children 3+.'}
                    </Text>
                  </View>
                )}
              </View>
            )
          })()}
          </>)}
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
    <View style={{ borderTopWidth: HAIR, borderTopColor: colors.border, paddingTop: 16 }}>
      <Pressable onPress={onExpand} style={styles.chartHeader}>
        <Text style={[styles.siteEyebrow, { color: colors.textSecondary, marginBottom: 0 }]}>{title}</Text>
        <ChevronRight size={16} color={colors.text} strokeWidth={2} />
      </Pressable>
      <View style={styles.chartBody}>{children}</View>
    </View>
  )
}

// Container for a row of StatPills. In Diffuse it's the single hairline strip
// (rounded, overflow-clipped so the cells' right-dividers read as interior
// splits and the last one is clipped); in the legacy theme it's the plain gap
// row of boxed pills.
function StatRow({ children }: { children: React.ReactNode }) {
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  if (diffuse) {
    return (
      <View style={[styles.statStrip, { borderColor: dt.colors.line }]}>{children}</View>
    )
  }
  return <View style={styles.statRowSite}>{children}</View>
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  const { colors, radius } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  if (diffuse) {
    // De-carded cell — value on top (serif) + mono caption. A right hairline
    // divider makes it a segment of the one strip its parent `statRow` becomes
    // (the container's rounded overflow:hidden clips the last cell's divider).
    return (
      <View style={[styles.statStripCell, { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: dt.colors.line }]}>
        <Text
          style={[styles.statStripValue, { color: dt.colors.ink }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {value}
        </Text>
        <Text style={[styles.statStripLabel, { color: dt.colors.ink3 }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    )
  }
  // Light: bare number + mono caption, left-aligned — no boxes.
  return (
    <View style={styles.statCellSite}>
      <Text style={[styles.statValueSite, { color: colors.text, fontFamily: font.displayBold }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{value}</Text>
      <Text style={[styles.statLabelSite, { color: colors.textSecondary }]} numberOfLines={2}>{label}</Text>
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
    nutrition: tNow('kp_ka_emptyNutrition'),
    sleep: tNow('kp_ka_emptySleep'),
    mood: tNow('kp_ka_emptyMood'),
    health: tNow('kp_ka_emptyHealth'),
    growth: tNow('kp_ka_emptyGrowth'),
    activity: tNow('kp_ka_emptyActivity'),
  }
  if (diffuse) {
    return (
      <DiffuseEmptyState
        icon={PILLAR_LINE_ICON[pillar](40, config.color)}
        title={config.label}
        message={messages[pillar]}
      />
    )
  }
  return (
    <View style={styles.emptyCard}>
      <SiteSticker name={PILLAR_SITE_STICKER[pillar]} size={48} cut />
      <Text style={[styles.emptyText, { color: colors.textSecondary, fontFamily: font.body }]}>{messages[pillar]}</Text>
    </View>
  )
}

// ─── Chart Sub-components ─────────────────────────────────────────────────────

function StackedBarChart({ good, little, none, labels, width = 300, height = 200 }: {
  good: number[]; little: number[]; none: number[]; labels: string[]; width?: number; height?: number
}) {
  const { colors, stickers: st } = useTheme()
  const { t } = useTranslation()
  const diffuse = useIsDiffuse()
  const axisText = diffuse ? colors.textMuted : colors.textSecondary
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
              <SvgText x={leftPad - 10} y={y + 4} fill={axisText} fontSize={11} fontWeight="600" textAnchor="end" fontFamily={font.bodyMedium}>
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
        {labels.map((l, i) => <Text key={i} style={[styles.label, { color: axisText }]}>{l}</Text>)}
      </View>
      <View style={styles.legendRow}>
        <LegendDot color={colGood} label={t('kids_analytics_legend_ate_well')} />
        <LegendDot color={colLittle} label={t('kids_analytics_legend_a_little')} />
        <LegendDot color={colNone} label={t('kids_analytics_legend_didnt_eat')} />
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
  const { colors: themeColors } = useTheme()
  const labelColor = diffuse ? dt.colors.ink3 : themeColors.textSecondary
  const numColor = diffuse ? dt.colors.ink : themeColors.text
  const numFont = diffuse ? diffuseFont.display : font.displayBold
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
    { label: t('kids_analytics_legend_ate_well'), pct: pctGood, color: st.green },
    { label: t('kids_analytics_legend_a_little'), pct: pctLittle, color: st.peach },
    { label: t('kids_analytics_legend_didnt_eat'), pct: pctNone, color: st.coral },
  ].filter((i) => i.pct > 0)

  // Diffuse: the Kids dot-count rows — consistent with the sleep-quality
  // breakdown, replacing the pair of donut rings.
  if (diffuse) {
    return <DotCountRows rows={items.map((i) => ({ label: i.label, pct: i.pct, color: i.color }))} />
  }

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
  const axisColor = diffuse ? dt.colors.ink3 : colors.textSecondary
  const nodeFill = diffuse ? dt.colors.surface : colors.surface
  const nodeStroke = diffuse ? dt.colors.line2 : colors.text
  const numFont = diffuse ? diffuseFont.mono : font.bodyBold
  const labelFont = diffuse ? diffuseFont.mono : font.body

  // Diffuse: meals/feeds per day as clean labelled bars — counts read clearer
  // as bars (magnitude + day labels + tap value) than an abstract line with no
  // visible axis. Bucket first so wide windows don't underflow the bar width.
  if (diffuse) {
    if (rawData.length === 0) return null
    const b = bucketSeries(rawData, rawLabels, 13)
    return (
      <MiniBarChart
        data={b.data}
        labels={b.labels}
        color={color}
        height={150}
        unit="meals"
      />
    )
  }

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
              fill={diffuse ? (p.v > 0 ? color : axisColor) : (p.v > 0 ? colors.text : axisColor)}
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
  data: rawData, labels: rawLabels, color, width: _width, height = 140, unit = '', target,
}: {
  data: number[]
  labels: string[]
  color: string
  width?: number
  height?: number
  unit?: string
  /** Reference goal (e.g. age sleep target). When set, Diffuse renders filled
   * columns against this line instead of a plain trend line. */
  target?: number
}) {
  const { colors, stickers } = useTheme()
  const { t } = useTranslation()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const barColor = diffuse ? getDiffuseAccent('kids', dt.isDark) : color
  const axisColor = diffuse ? dt.colors.ink3 : colors.textMuted
  const emptyBar = diffuse ? dt.colors.line : colors.surfaceRaised
  const numFont = diffuse ? diffuseFont.mono : font.display
  const labelFont = diffuse ? diffuseFont.mono : font.body
  const labelFontActive = diffuse ? diffuseFont.monoBold : font.bodySemiBold
  // Long windows (30/90/365 days) have too many per-day bars/columns to draw;
  // bucket to a legible count so the chart renders on any date range. The
  // Diffuse SipColumns branch below relies on this having already run.
  { const b = bucketSeries(rawData, rawLabels, 13); rawData = b.data; rawLabels = b.labels }
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

  // Diffuse: a clear trend, not the illegible toy-brick grid. Sleep passes a
  // `target` so the age-appropriate goal is visible as a reference line on
  // filled columns; everything else (Activity sessions) reads as a smooth
  // area line. Distinct sticker hue per pillar so the two never look alike.
  if (diffuse) {
    if (target !== undefined) {
      return (
        <SipColumns
          data={rawData}
          target={target}
          color={stickers.lilac}
          accent={barColor}
          labels={rawLabels}
          height={Math.max(height, 150)}
          unit={unit}
        />
      )
    }
    return (
      <MiniBarChart
        data={rawData}
        color={barColor}
        labels={rawLabels}
        height={Math.max(height, 150)}
        unit={unit}
      />
    )
  }

  // Light (site look): ink-outlined soft-tone bars with the TRUE value over each bar.
  // A freak day can't flatten the rest: bars scale to a robust ceiling (2.5× the median logged
  // day, never above a 24h day for hours), and an over-ceiling bar is simply drawn full-height
  // while its label keeps the real number.
  const { data, labels } = binSeries(rawData, rawLabels, 14)
  const logged = data.filter((v) => v > 0).sort((x, y) => x - y)
  const median = logged.length ? logged[Math.floor(logged.length / 2)] : 0
  const trueMax = Math.max(...data, 0.1)
  let ceiling = trueMax
  if (logged.length >= 3 && trueMax > median * 3) ceiling = median * 2.5
  if (unit === 'h') ceiling = Math.min(ceiling, 24)
  if (target !== undefined) ceiling = Math.max(ceiling, Math.min(target, 24))
  ceiling = Math.max(ceiling, 0.1)
  const BAR_AREA = Math.max(height - 40, 80)
  const maxIdx = data.indexOf(trueMax)
  const showAll = data.length <= 9
  const fmt = (v: number) => (Math.abs(v - Math.round(v)) < 0.05 ? `${Math.round(v)}` : fmt1(v))
  const tone = SOFT_BY_PILLAR_COLOR[color] ?? stickers.lilacSoft

  return (
    <View style={{ width: '100%', paddingVertical: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, position: 'relative' }}>
        {target !== undefined && target > 0 && (
          <View
            pointerEvents="none"
            style={{ position: 'absolute', left: 0, right: 0, top: 16 + BAR_AREA * (1 - Math.min(target, ceiling) / ceiling), height: 1, backgroundColor: colors.text, opacity: 0.45 }}
          />
        )}
        {data.map((v, i) => {
          const h = v > 0 ? Math.max(4, (Math.min(v, ceiling) / ceiling) * BAR_AREA) : 3
          const labelHere = v > 0 && (showAll || i === maxIdx)
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 11, height: 16, fontFamily: font.bodySemiBold, color: colors.text }} numberOfLines={1}>
                {labelHere ? `${fmt(v)}${unit}` : ''}
              </Text>
              <View style={{ height: BAR_AREA, justifyContent: 'flex-end', width: '100%' }}>
                <View style={{ height: h, borderRadius: 8, borderWidth: v > 0 ? 1.5 : 0, borderColor: colors.text, backgroundColor: v > 0 ? tone : colors.border }} />
              </View>
            </View>
          )
        })}
      </View>
      {/* X labels */}
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
        {labels.map((l, i) => (
          <Text key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: colors.textSecondary, fontFamily: font.body }} numberOfLines={1}>
            {l}
          </Text>
        ))}
      </View>
      {target !== undefined && target > 0 && (
        <Text style={{ fontSize: 11, color: colors.textSecondary, fontFamily: font.body, marginTop: 8 }}>
          {t('analytics_targetLine', { target, unit })}
        </Text>
      )}
    </View>
  )
}

function SleepQualityChart({ counts }: { counts: { great: number; good: number; restless: number; poor: number } }) {
  const { colors, radius, stickers } = useTheme()
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
    { label: t('kids_analytics_sleep_quality_great'), count: counts.great, color: brand.success, emoji: '😴' },
    { label: t('kids_analytics_sleep_quality_good'), count: counts.good, color: PILLAR_CONFIG.health.color, emoji: '🙂' },
    { label: t('kids_analytics_sleep_quality_restless'), count: counts.restless, color: brand.accent, emoji: '😐' },
    { label: t('kids_analytics_sleep_quality_poor'), count: counts.poor, color: brand.error, emoji: '😣' },
  ]

  // Diffuse: the distinct Kids dot-count rows (one row per quality level with a
  // run of filled dots for its share). Sticker hues keep it playful.
  if (diffuse) {
    const hues = [stickers.green, stickers.blue, stickers.peach, stickers.coral]
    const rows: DotRow[] = items
      .map((it, i) => ({ label: it.label, pct: (it.count / total) * 100, color: hues[i] }))
      .filter((r) => r.pct > 0)
    return <DotCountRows rows={rows} />
  }

  const siteTone = [stickers.greenSoft, stickers.blueSoft, stickers.peachSoft, stickers.pinkSoft]
  const siteSticker: SiteStickerName[] = ['zz', 'moon', 'face2', 'face1']
  return (
    <View style={styles.qualityWrap}>
      {items.map((item, i) => {
        const pct = Math.round((item.count / total) * 100)
        if (item.count === 0) return null
        return (
          <View key={i} style={styles.qualityRow}>
            <SiteSticker name={siteSticker[i]} size={26} cut />
            <Text style={[styles.qualityLabel, { color: labelColor, fontFamily: font.body }]}>{item.label}</Text>
            <View style={[styles.qualityBarBg, { backgroundColor: colors.border, borderRadius: radius.full, height: 8 }]}>
              <View style={[styles.qualityBarFill, { width: `${pct}%`, backgroundColor: siteTone[i], borderColor: colors.text, borderWidth: 1.5, borderRadius: radius.full }]} />
            </View>
            <Text style={[styles.qualityPct, { color: colors.text, fontFamily: font.displayBold }]}>{pct}%</Text>
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
  const diffuse = useIsDiffuse()
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
                if (!diffuse) {
                  return <SiteSticker key={mood} name={MOOD_SITE_STICKER[mood] ?? 'face3'} size={28} cut />
                }
                return (
                  <View key={mood} style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: fill + '55', borderWidth: 1.5, borderColor: ink, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <Character name="mood" size={22} face={moodExpression(mood)} color={moodBlobFill(mood)} />
                  </View>
                )
              }) : (
                <View style={diffuse
                  ? { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong }
                  : { width: 8, height: 8, borderRadius: 4, marginVertical: 7, backgroundColor: colors.border }} />
              )}
              <Text style={[styles.label, { color: diffuse ? (dayMoods.length > 0 ? colors.textSecondary : colors.textMuted) : colors.textSecondary }]} numberOfLines={1}>
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
    case 'temperature': return tNow('kids_logForm_healthTemp')
    case 'medicine': return tNow('kids_logForm_healthMedicine')
    case 'vaccine': return tNow('kids_logForm_healthVaccine')
    case 'note': return tNow('kids_calendar_labelNote')
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
  return tNow('kp_ka_pctGood', { pct: Math.round(((counts.great + counts.good) / total) * 100) })
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
    fontSize: 10,
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
  // Compact one-line period segmented row (Diffuse) — pills share the width.
  periodRowD: {
    flexDirection: 'row',
    gap: 6,
  },
  periodPillD: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 4,
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
    borderRadius: 18,
    padding: 16,
    paddingBottom: 18,
    borderWidth: 1.5,
    shadowColor: '#161513',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 0,
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
    marginTop: 12,
    marginBottom: 14,
  },
  grandmaInsightMessage: {
    fontSize: 15,
    lineHeight: 22,
  },
  grandmaInsightCrossWrap: {
    marginBottom: 14,
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
  pillarSection: { gap: 0 },
  // Site look — quiet rows, hairlines, mono eyebrows
  pillarRowSite: { paddingVertical: 16, borderTopWidth: StyleSheet.hairlineWidth * 2 },
  siteEyebrow: { fontFamily: MONO, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 10 },
  siteMono: { fontFamily: MONO, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase' },
  siteSectionTitle: { fontSize: 17, lineHeight: 22, letterSpacing: 0.2, textTransform: 'uppercase' },
  siteBody: { fontSize: 15, lineHeight: 22 },
  siteSmall: { fontSize: 13, lineHeight: 19 },
  siteNum: { fontSize: 24, lineHeight: 28 },
  siteHero: { fontSize: 52, lineHeight: 58, letterSpacing: -1.5 },
  siteHeroRow: { flexDirection: 'row', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' },
  siteDivider: { height: StyleSheet.hairlineWidth * 2, marginVertical: 18 },
  siteBarTrack: { height: 6, borderRadius: 999, overflow: 'hidden', marginTop: 8 },
  siteBarFill: { height: '100%', borderRadius: 999, borderWidth: 1 },
  bandRowSite: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7 },
  bandSwatch: { width: 14, height: 14, borderRadius: 4, borderWidth: 1.5 },
  pillarInfoRowSite: { paddingVertical: 14 },
  statRowSite: { flexDirection: 'row', gap: 16 },
  statCellSite: { flex: 1, gap: 4 },
  statValueSite: { fontSize: 26, lineHeight: 30, letterSpacing: -0.5 },
  statLabelSite: { fontFamily: MONO, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', lineHeight: 13 },
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
  // Diffuse: bare section eyebrow (mono caps) for de-carded list sections.
  diffuseEyebrow: { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', fontFamily: diffuseFont.mono, marginBottom: 12 },
  // Diffuse: the de-carded hairline stat strip (matches pregnancy's calloutRow).
  statStrip: { flexDirection: 'row', borderWidth: StyleSheet.hairlineWidth, borderRadius: 18, overflow: 'hidden' },
  statStripCell: { flex: 1, paddingVertical: 16, paddingHorizontal: 10, alignItems: 'center', gap: 5 },
  statStripValue: { fontSize: 26, fontFamily: diffuseFont.display, letterSpacing: -0.5, textAlign: 'center' },
  statStripLabel: { fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', fontFamily: diffuseFont.mono, textAlign: 'center' },

  // Loading / Error / Empty
  loadingWrap: { alignItems: 'center', gap: 10, paddingVertical: 32 },
  reportCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginTop: 20, borderWidth: 1 },
  reportIcon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  reportTitle: { fontSize: 16 },
  reportDesc: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  loadingText: { fontSize: 14, fontFamily: font.bodyMedium },
  errorCard: { padding: 20, alignItems: 'center', gap: 10 },
  errorText: { fontSize: 15, fontFamily: font.bodySemiBold },
  errorRetry: { fontSize: 14, fontFamily: font.bodyMedium },
  emptyCard: { paddingVertical: 20, paddingHorizontal: 12, alignItems: 'center', gap: 10 },
  emptyText: { fontSize: 14, fontFamily: font.bodyMedium, textAlign: 'center', lineHeight: 20 },
  emptyAll: { padding: 32, alignItems: 'center', gap: 12, marginTop: 8 },
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
  insightHighlightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 14 },
  insightHighlightIcon: { width: 36, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  insightHighlightBody: { flex: 1, gap: 4 },
  insightHighlightLabel: { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' },
  insightHighlightTitle: { fontSize: 15, lineHeight: 20 },
  insightHighlightText: { fontSize: 14, lineHeight: 20 },
  insightActionsBlock: { gap: 8, marginTop: 2 },
  insightActionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8 },
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
