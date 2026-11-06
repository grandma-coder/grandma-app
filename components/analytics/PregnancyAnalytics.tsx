/**
 * PregnancyAnalytics — 2026 sticker-collage redesign (parity with KidsAnalytics)
 *
 * Pillars:
 *   wellbeing · weight · kicks · sleep · mood · symptoms · hydration ·
 *   nutrition · exercise · contractions (3rd tri) · birth readiness (3rd tri)
 *
 * Each pillar opens a rich PillarDetailModal with stat tiles, charts, and
 * trimester-aware tips. ScoreInfoModal explains how Wellbeing is computed.
 */

import { afterSheets } from '../../lib/afterSheets'
import { shortDayMonth } from '../../lib/timeFormat'
import { router } from 'expo-router'
import { dateLoc } from '../../lib/kpLocale'
import React, { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import {
  ChevronRight, Info, X, FlaskConical,
} from 'lucide-react-native'

import { useTheme, font, useDiffuseTheme, diffuseFont, getDiffuseAccent, getModeField } from '../../constants/theme'
import { useIsDiffuse, useScrollBottomInset, DiffuseFieldSurface, SoftBloom, DiffuseGrain } from '../ui/diffuse/DiffuseKit'
import { DiffuseSheet, DiffuseStatCard, DiffuseMetricTile, DiffuseSectionHeader } from '../ui/diffuse/DiffusePrimitives'
import { MoodBubbleCluster, type MoodBubbleItem } from '../charts/SvgCharts'
import { supabase } from '../../lib/supabase'
import { toDateStr } from '../../lib/cycleLogic'
import { useTranslation, t as tNow, type TranslationKey } from '../../lib/i18n'
import { usePregnancyStore } from '../../store/usePregnancyStore'
import { useUnitsStore } from '../../store/useUnitsStore'
import { kgToDisplay, weightLabel } from '../../lib/units'
import { getCurrentWeekFromDueDate, getWeekData } from '../../lib/pregnancyData'
import { buildPregnancyNote } from '../../lib/grandmaNotes/pregnancy'
import { GrandmaNote, GrandmaNotesTitle, NotesDetailsEyebrow } from '../notes/GrandmaNote'
import { PregnancyJourneyRing } from '../pregnancy/PregnancyJourneyRing'
import {
  usePregnancyWeightHistory,
  usePregnancyKickSessions,
  usePregnancySymptomFrequency,
  usePregnancySleepHistory,
  usePregnancyWellbeingScore,
  usePregnancyMoodTrend,
  usePregnancyHydrationHistory,
  usePregnancyNutritionMatrix,
  usePregnancyExerciseHistory,
  usePregnancyContractions,
  usePregnancyKickTimeOfDay,
  usePregnancyBirthReadiness,
  usePregnancyWeightByWeek,
  type PregnancyWellbeingScore,
  type PregnancyExerciseEntry,
  type PregnancyContractionSession,
  type KickHourBucket,
  type BirthReadiness,
  type PregnancyWeightByWeek,
} from '../../lib/analyticsData'

import { Character, type CharacterName } from '../characters/Characters'
import { AnalyticsHeader } from './shared/AnalyticsHeader'
import { AnalyticsTitle } from './shared/AnalyticsTitle'
import { PeriodSelector, type Period } from './shared/PeriodSelector'
import { CustomRangeModal } from './shared/CustomRangeModal'
import { Section } from './shared/Section'
import { MoodStrip } from './shared/MoodStrip'
import { pregMoodToStrip } from '../../lib/moodTrend'
import { MiniLineChart, PillDivergingChart, GlowAreaLine, BlobCluster, SipColumns, PetalBurst, BeadedThread, CrescentBars, ConcentricArcs, TieredLozenges, SplitMeters, CheckpointPills, NutrientMatrix, type ArcDatum, type TierRow, type MeterRow, type CheckRow } from './shared/MiniCharts'
import { Display, Body } from '../ui/Typography'
import {
  Heart,
  Moon,
  Leaf,
  Drop,
  Bolt,
  Sparkle,
  Crown,
  Flower,
  ClockFace,
  Cross,
  Burst,
  Smiley,
} from '../ui/Stickers'
import { MoodFace } from '../stickers/RewardStickers'
import { moodFaceVariant, moodFaceFill, moodExpression, moodBlobFill } from '../../lib/moodFace'
import { SiteSticker, type SiteStickerName } from '../stickers/SiteSticker'
import { DetailSheetHeader } from '../ui/DetailSheetHeader'
import { FadeUp } from '../ui/Motion'
import { bucketSeries } from './shared/bucketSeries'
import { InsightsDisclaimer } from './shared/InsightsDisclaimer'
import { ReportEntryRow } from '../../lib/reports/ReportEntryRow'
import { Skeleton, SkeletonLines } from '../ui/Skeleton'
import { SkeletonChartSection, SkeletonStatRow, SkeletonStatRows } from './shared/AnalyticsSkeleton'
import {
  buildPregnancyWeekFacts,
  weekCoveragePct,
  areaDays,
  type PregnancyWeekFacts,
  type PregnancyWeekArea,
} from '../../lib/pregnancyWeekFacts'
import { SheetModal } from '../ui/SheetModal'

const nf = (x: number, n: number): string => x.toLocaleString(dateLoc(), { minimumFractionDigits: n, maximumFractionDigits: n, useGrouping: false })

const SCREEN_W = Dimensions.get('window').width
const SCREEN_H = Dimensions.get('window').height

// ─── Site look (light rendering only) ──────────────────────────────────────
const MONO = 'SpaceMono_400Regular'
const HAIR = StyleSheet.hairlineWidth * 2

// Pillar → site sticker (card-less, sits straight on the page).
const WELLBEING_STICKER: Record<string, SiteStickerName> = {
  sleep: 'moon', mood: 'face3', nutrition: 'avocado', exercise: 'dumbbell', hydration: 'glass',
}
const PILLAR_SITE_STICKER: Record<PillarKey, SiteStickerName> = {
  wellbeing: 'flower', weight: 'scale', kicks: 'foot', sleep: 'moon', mood: 'face3',
  symptoms: 'headache', hydration: 'glass', nutrition: 'avocado', exercise: 'dumbbell',
  contractions: 'stopwatch', birth: 'backpack',
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
              borderTopColor: colors.text,
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

/** 34px close button: white disc, 2px ink ring (info buttons on the header use the same shape). */
function SiteIconButton({ onPress, label, children }: { onPress: () => void; label: string; children: React.ReactNode }) {
  const { colors } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: colors.text, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
        pressed && { opacity: 0.7 },
      ]}
    >
      {children}
    </Pressable>
  )
}

/** Thin bar: hairline track, soft-tone fill with an ink outline. */
function SiteMeter({ pct, tone, height = 6 }: { pct: number; tone: string; height?: number }) {
  const { colors } = useTheme()
  const w = Math.max(0, Math.min(100, pct))
  return (
    <View style={{ height, borderRadius: 999, overflow: 'hidden', backgroundColor: colors.border }}>
      <View style={{ width: `${w}%`, height: '100%', borderRadius: 999, borderWidth: 1, backgroundColor: tone, borderColor: w > 0 ? colors.text : 'transparent' }} />
    </View>
  )
}

/**
 * Light bar chart: ink-outlined soft-tone bars with the TRUE value over each bar. A freak day
 * can't flatten the rest — bars scale to a robust ceiling (2.5× the median logged day) and an
 * over-ceiling bar is drawn full-height while its label keeps the real number. Long windows are
 * averaged into ≤ 14 bars; `caption` says what one bar means (total vs average).
 */
function SiteBars({ data: rawData, labels: rawLabels, tone, height = 140, unit = '', target, caption }: {
  data: number[]
  labels: string[]
  tone: string
  height?: number
  unit?: string
  target?: number
  caption?: string
}) {
  const { t } = useTranslation()
  const { colors, font } = useTheme()
  const b = bucketSeries(rawData, rawLabels, 14)
  const data = b.data
  const labels = b.labels
  const bucketed = data.length < rawData.length
  const trueMax = Math.max(...data, 0)
  if (data.length === 0 || trueMax <= 0) return null
  const logged = data.filter((v) => v > 0).sort((x, y) => x - y)
  const median = logged.length ? logged[Math.floor(logged.length / 2)] : 0
  let ceiling = trueMax
  if (logged.length >= 3 && trueMax > median * 3) ceiling = median * 2.5
  if (unit === 'h') ceiling = Math.min(ceiling, 24)
  if (target !== undefined) ceiling = Math.max(ceiling, Math.min(target, 24))
  ceiling = Math.max(ceiling, 0.1)
  const BAR_AREA = Math.max(height - 40, 80)
  const maxIdx = data.indexOf(trueMax)
  const showAll = data.length <= 9
  const fmt = (v: number) => (Math.abs(v - Math.round(v)) < 0.05 ? `${Math.round(v)}` : nf(v, 1))
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
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
        {labels.map((l, i) => (
          <Text key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: colors.textSecondary, fontFamily: font.body }} numberOfLines={1}>
            {l}
          </Text>
        ))}
      </View>
      {(caption || (target !== undefined && target > 0)) && (
        <Text style={{ fontSize: 11, color: colors.textSecondary, fontFamily: font.body, marginTop: 8 }}>
          {[caption ? `${caption}${bucketed ? ' (each bar = average of several days)' : ''}` : null, target !== undefined && target > 0 ? t('analytics_targetLine', { target, unit }) : null].filter(Boolean).join(' · ')}
        </Text>
      )}
    </View>
  )
}

/** Light quiet row: card-less sticker + label/sub + value, hairline above. */
function SiteRow({ sticker, label, sub, value, valueSub, pct, tone, onPress, first }: {
  sticker: SiteStickerName
  label: string
  sub?: string
  value: string
  valueSub?: string
  pct?: number
  tone: string
  onPress?: () => void
  first?: boolean
}) {
  const { colors, font } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderTopWidth: first ? 0 : HAIR, borderTopColor: colors.border },
        pressed && { opacity: 0.7 },
      ]}
    >
      <SiteSticker name={sticker} size={34} cut />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: font.display, fontSize: 16, lineHeight: 20, letterSpacing: 0.2, textTransform: 'uppercase', color: colors.text }} numberOfLines={1}>{label}</Text>
        {sub ? <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 16, color: colors.textSecondary, marginTop: 1 }} numberOfLines={1}>{sub}</Text> : null}
        {pct !== undefined ? <View style={{ marginTop: 7 }}><SiteMeter pct={pct} tone={tone} /></View> : null}
      </View>
      <View style={{ alignItems: 'flex-end', maxWidth: 120 }}>
        <Text style={{ fontFamily: font.displayBold, fontSize: 22, lineHeight: 26, color: colors.text }} numberOfLines={1}>{value}</Text>
        {valueSub ? <Text style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.textSecondary }} numberOfLines={1}>{valueSub}</Text> : null}
      </View>
      {onPress ? <ChevronRight size={16} color={colors.text} strokeWidth={2.2} /> : null}
    </Pressable>
  )
}

// ─── Pillar config ─────────────────────────────────────────────────────────

type PillarKey =
  | 'wellbeing'
  | 'weight'
  | 'kicks'
  | 'sleep'
  | 'mood'
  | 'symptoms'
  | 'hydration'
  | 'nutrition'
  | 'exercise'
  | 'contractions'
  | 'birth'

interface PillarMeta {
  label: string
  blurb: string
}

const PILLAR_META: Record<PillarKey, PillarMeta> = {
  wellbeing:    { label: 'Wellbeing',     blurb: 'Five-pillar score' },
  weight:       { label: 'Weight Gain',   blurb: 'Week-over-week change' },
  kicks:        { label: 'Baby Kicks',    blurb: 'Counts per session' },
  sleep:        { label: 'Sleep',         blurb: 'Hours per night' },
  mood:         { label: 'Mood',          blurb: 'How you feel each day' },
  symptoms:     { label: 'Symptoms',      blurb: 'Frequency & breakdown' },
  hydration:    { label: 'Hydration',     blurb: 'Glasses per day' },
  nutrition:    { label: 'Nutrition',     blurb: 'Daily nutrient checklist' },
  exercise:     { label: 'Movement',      blurb: 'Active minutes per day' },
  contractions: { label: 'Contractions',  blurb: 'Frequency & intervals' },
  birth:        { label: 'Birth Ready',   blurb: 'Plan, bag & paperwork' },
}

// i18n key for each pillar's display label. Lookups via t(PILLAR_LABEL_KEY[key]).
const PILLAR_LABEL_KEY: Record<PillarKey, string> = {
  wellbeing:    'preg_analytics_pillar_wellbeing',
  weight:       'preg_analytics_pillar_weight',
  kicks:        'preg_analytics_pillar_kicks',
  sleep:        'preg_analytics_pillar_sleep',
  mood:         'preg_analytics_pillar_mood',
  symptoms:     'preg_analytics_pillar_symptoms',
  hydration:    'preg_analytics_pillar_hydration',
  nutrition:    'preg_analytics_pillar_nutrition',
  exercise:     'preg_analytics_pillar_exercise',
  contractions: 'preg_analytics_pillar_contractions',
  birth:        'preg_analytics_pillar_birthReadiness',
}

const PILLAR_BLURB_KEY: Record<PillarKey, TranslationKey> = {
  wellbeing:    'sw1_pa_blurb_wellbeing',
  weight:       'sw1_pa_blurb_weight',
  kicks:        'sw1_pa_blurb_kicks',
  sleep:        'sw1_pa_blurb_sleep',
  mood:         'sw1_pa_blurb_mood',
  symptoms:     'sw1_pa_blurb_symptoms',
  hydration:    'sw1_pa_blurb_hydration',
  nutrition:    'sw1_pa_blurb_nutrition',
  exercise:     'sw1_pa_blurb_exercise',
  contractions: 'sw1_pa_blurb_contractions',
  birth:        'sw1_pa_blurb_birth',
}

// Stored symptom / mood values stay English; only the shown label is translated.
const SYMPTOM_LABEL_KEYS: Record<string, TranslationKey> = {
  'nausea': 'preg_symptom_nausea', 'fatigue': 'preg_symptom_fatigue', 'back pain': 'preg_symptom_backPain',
  'headache': 'preg_symptom_headache', 'swelling': 'preg_symptom_swelling', 'heartburn': 'preg_symptom_heartburn',
  'insomnia': 'preg_symptom_insomnia', 'cramps': 'preg_symptom_cramps', 'mood swings': 'preg_symptom_moodSwings',
  'cravings': 'preg_symptom_cravings', 'braxton hicks': 'preg_symptom_braxtonHicks', 'shortness of breath': 'preg_symptom_shortBreath',
}
function symptomLabel(name: string): string {
  const k = SYMPTOM_LABEL_KEYS[name.toLowerCase()]
  return k ? tNow(k) : name
}
const MOOD_LABEL_KEYS: Record<string, TranslationKey> = {
  excited: 'preg_mood_excited', happy: 'preg_mood_happy', okay: 'preg_mood_okay', anxious: 'preg_mood_anxious',
  energetic: 'preg_mood_energetic', radiant: 'sw1_pa_moodRadiant', unknown: 'sw1_pp_oUnknown',
}
function moodLabel(name: string): string {
  const k = MOOD_LABEL_KEYS[name.toLowerCase()]
  return k ? tNow(k) : name
}

interface Palette { tint: string; chip: string; bar: string }

function pillarPalette(
  key: PillarKey,
  st: ReturnType<typeof useTheme>['stickers'],
): Palette {
  switch (key) {
    case 'wellbeing':    return { tint: st.greenSoft,  chip: st.green,  bar: st.green }
    case 'weight':       return { tint: st.lilacSoft,  chip: st.lilac,  bar: st.lilac }
    case 'kicks':        return { tint: st.pinkSoft,   chip: st.pink,   bar: st.pink }
    case 'sleep':        return { tint: st.lilacSoft,  chip: st.lilac,  bar: st.lilac }
    case 'mood':         return { tint: st.peachSoft,  chip: st.peach,  bar: st.peach }
    case 'symptoms':     return { tint: st.yellowSoft, chip: st.yellow, bar: st.yellow }
    case 'hydration':    return { tint: st.blueSoft,   chip: st.blue,   bar: st.blue }
    case 'nutrition':    return { tint: st.greenSoft,  chip: st.green,  bar: st.green }
    case 'exercise':     return { tint: st.peachSoft,  chip: st.coral,  bar: st.coral }
    case 'contractions': return { tint: st.peachSoft,  chip: st.coral,  bar: st.coral }
    case 'birth':        return { tint: st.blueSoft,   chip: st.blue,   bar: st.blue }
  }
}

function renderPillarSticker(key: PillarKey, color: string, size = 24) {
  switch (key) {
    case 'wellbeing':    return <Crown size={size} fill={color} />
    case 'weight':       return <Flower size={size} petal={color} />
    case 'kicks':        return <Heart size={size} fill={color} />
    case 'sleep':        return <Moon size={size} fill={color} />
    case 'mood':         return <Smiley size={size} fill={color} />
    case 'symptoms':     return <Bolt size={size} fill={color} />
    case 'hydration':    return <Drop size={size} fill={color} />
    case 'nutrition':    return <Leaf size={size} fill={color} />
    case 'exercise':     return <Burst size={size} fill={color} points={8} />
    case 'contractions': return <ClockFace size={size} fill={color} />
    case 'birth':        return <Cross size={size} fill={color} />
  }
}

/** Diffuse: the pillar glyph as a thin Lucide line icon (over a bloom). */
// Pregnancy pillar → character-blob concept. The glyph now renders a Character
// (self-contained, no bloom needed); `color` fills the blob.
const PREG_PILLAR_CHARACTER: Record<PillarKey, CharacterName> = {
  wellbeing: 'crown', weight: 'growth', kicks: 'kick', sleep: 'sleep',
  mood: 'mood', symptoms: 'activity', hydration: 'water', nutrition: 'nutrition',
  exercise: 'activity', contractions: 'contraction', birth: 'baby',
}

function renderPillarGlyph(key: PillarKey, color: string, size = 18) {
  return <Character name={PREG_PILLAR_CHARACTER[key]} size={size + 6} color={color} />
}

// Ordered sticker-hue palette for the symptom list — the Insights "Top
// Symptoms" card (its dot legend) and the detail-sheet breakdown share this so
// the same symptom is the same colour in both, by rank. Takes the theme's
// `stickers` (a hook value, so it can't live at module scope) and returns the
// hue for a given row index.
const SYMPTOM_HUE_KEYS = ['coral', 'yellow', 'blue', 'green', 'lilac'] as const
function symptomHue(stickers: Record<string, string>, i: number): string {
  return stickers[SYMPTOM_HUE_KEYS[i % SYMPTOM_HUE_KEYS.length]]
}
// Light rendering: the soft tone of the same rank hue (ink-outlined bar fill).
const SYMPTOM_SOFT_KEYS = ['peachSoft', 'yellowSoft', 'blueSoft', 'greenSoft', 'lilacSoft'] as const
function symptomSoft(stickers: Record<string, string>, i: number): string {
  return stickers[SYMPTOM_SOFT_KEYS[i % SYMPTOM_SOFT_KEYS.length]]
}

// ─── Trimester / week helpers ──────────────────────────────────────────────

function trimesterFor(week: number): 1 | 2 | 3 {
  if (week <= 13) return 1
  if (week <= 27) return 2
  return 3
}

function trimesterLabel(t: 1 | 2 | 3): string {
  return tNow(t === 1 ? 'preg_ring_trimester1' : t === 2 ? 'preg_ring_trimester2' : 'preg_ring_trimester3')
}

function daysToDue(due: string | null): number | null {
  if (!due) return null
  const d = new Date(due + 'T00:00:00')
  const now = new Date()
  return Math.ceil((d.getTime() - now.getTime()) / 86_400_000)
}

/** Bar labels: weekday letter for a short window; once SiteBars buckets (>14 points) a weekday
 *  letter no longer names the bar, so use the bucket's start date (M/D). */
function barDayLabels(dates: string[]): string[] {
  if (dates.length <= 14) return dates.map(shortDay)
  return dates.map((iso) => {
    const d = new Date(iso + 'T12:00:00')
    return isNaN(d.getTime()) ? '' : shortDayMonth(d)
  })
}

function shortDay(isoDate: string): string {
  try {
    const d = new Date(isoDate + 'T12:00:00')
    return d.toLocaleDateString(dateLoc(), { weekday: 'short' }).slice(0, 1)
  } catch {
    return ''
  }
}

/** Localized weekday name for a note ("Thursday" / "quinta-feira"). */
function weekdayName(isoDate: string, language: string): string {
  const d = new Date(isoDate + 'T12:00:00')
  try {
    return d.toLocaleDateString(language, { weekday: 'long' })
  } catch {
    return d.toLocaleDateString(dateLoc(), { weekday: 'long' })
  }
}

function formatLogDate(isoDate: string): string {
  try {
    const d = new Date(isoDate + 'T12:00:00')
    return d.toLocaleDateString(dateLoc(), { month: 'short', day: 'numeric' })
  } catch {
    return isoDate
  }
}

// ─── Main screen ───────────────────────────────────────────────────────────

interface PregnancyAnalyticsProps {
  onExamsPress?: () => void
}

export function PregnancyAnalytics({ onExamsPress }: PregnancyAnalyticsProps = {}) {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const accent = getDiffuseAccent('preg', dt.isDark)
  const { t, language } = useTranslation()
  const insets = useSafeAreaInsets()
  // Display unit for weight (B4). Data is canonical kg; convert for display only.
  const prefWeightUnit = useUnitsStore((s) => s.weightUnit)
  const prefWeightLabel = weightLabel(prefWeightUnit)
  const bottomInset = useScrollBottomInset(insets.bottom + 100)

  const storedWeek = usePregnancyStore((s) => s.weekNumber)
  const dueDate = usePregnancyStore((s) => s.dueDate)
  const weekNumber = dueDate ? getCurrentWeekFromDueDate(dueDate) : (storedWeek ?? 1)
  const trimester = trimesterFor(weekNumber)
  const dDays = daysToDue(dueDate)

  const [period, setPeriod] = useState<Period>('month')
  const [customRange, setCustomRange] = useState<{ from: string; to: string } | null>(null)
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [userId, setUserId] = useState<string | undefined>(undefined)
  // Queries are disabled (not "loading") until the session resolves, so the light
  // skeletons also wait on this — otherwise the page flashes empty values first.
  const [sessionChecked, setSessionChecked] = useState(false)
  const [openPillar, setOpenPillar] = useState<PillarKey | null>(null)
  const [showInfo, setShowInfo] = useState(false)

  useEffect(() => {
    // getSession() can stay pending during the cold-start auth handshake — the auth listener's
    // INITIAL_SESSION answers first; the timeout keeps skeletons from sticking.
    let gotUser = false
    const finish = (uid: string | undefined) => {
      if (gotUser) return
      if (uid) { gotUser = true; setUserId(uid) }
      setSessionChecked(true)
    }
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => finish(session?.user.id))
    supabase.auth.getSession().then(({ data: { session } }) => finish(session?.user.id)).catch(() => setSessionChecked(true))
    const timer = setTimeout(() => setSessionChecked(true), 4000)
    return () => { sub.subscription.unsubscribe(); clearTimeout(timer) }
  }, [])

  const uid = userId ?? ''

  // The selected period drives the analytics window. Every day-based hook reads
  // from `windowDays`; hooks measured in weeks/points derive from it too, so the
  // filter actually changes the data (not just the pill highlight).
  const windowDays = useMemo(() => {
    if (period === 'custom' && customRange) {
      const from = new Date(customRange.from + 'T00:00:00')
      const to = new Date(customRange.to + 'T00:00:00')
      const d = Math.round((to.getTime() - from.getTime()) / 86400000) + 1
      return Math.max(1, d)
    }
    return period === 'week' ? 7 : period === 'month' ? 30 : period === '3mo' ? 90 : period === 'year' ? 365 : 30
  }, [period, customRange?.from, customRange?.to])
  const windowWeeks = Math.max(1, Math.ceil(windowDays / 7))

  const customLabel = customRange
    ? (() => {
        const f = new Date(customRange.from + 'T00:00:00')
        const t = new Date(customRange.to + 'T00:00:00')
        const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
        return `${f.toLocaleDateString(dateLoc(), opts)} – ${t.toLocaleDateString(dateLoc(), opts)}`
      })()
    : undefined

  function handlePeriodChange(next: Period) {
    if (next === 'custom') { setShowCustomModal(true); return }
    setPeriod(next)
  }
  function handleCustomApply(from: string, to: string) {
    // Guard inverted ranges — otherwise the .gte/.lte queries match nothing.
    setCustomRange(from && to && from > to ? { from: to, to: from } : { from, to })
    setPeriod('custom')
    setShowCustomModal(false)
  }

  // Hooks — all windowed by the selected period.
  const { data: weightHistory = [], isLoading: weightLoadingQ } = usePregnancyWeightHistory(uid, windowDays)
  const { data: weightByWeek = [] } = usePregnancyWeightByWeek(uid, dueDate)
  const { data: kickSessions = [], isLoading: kicksLoadingQ } = usePregnancyKickSessions(uid, windowDays)
  const { data: kickHours = [] } = usePregnancyKickTimeOfDay(uid, windowDays)
  const { data: symptomFreq = [], isLoading: symptomsLoadingQ } = usePregnancySymptomFrequency(uid)
  const { data: sleepHistory = [], isLoading: sleepLoadingQ } = usePregnancySleepHistory(uid, windowWeeks)
  const { data: wellbeing } = usePregnancyWellbeingScore(uid)
  const { data: moodTrend = [], isLoading: moodLoadingQ } = usePregnancyMoodTrend(uid, windowWeeks)
  const { data: hydrationHistory = [], isLoading: hydrationLoadingQ } = usePregnancyHydrationHistory(uid, windowDays)
  const { data: nutritionMatrix, isLoading: nutritionLoadingQ } = usePregnancyNutritionMatrix(uid, windowDays)
  const { data: exerciseHistory = [], isLoading: exerciseLoadingQ } = usePregnancyExerciseHistory(uid, windowDays)
  const { data: contractions = [], isLoading: contractionsLoadingQ } = usePregnancyContractions(uid, windowDays)
  const { data: birthReady, isLoading: birthLoadingQ } = usePregnancyBirthReadiness(uid)

  // First load per section (no cached data for this key yet). A period change is a
  // new key, so its sections ghost too while the selector stays put.
  const weightLoading = !sessionChecked || weightLoadingQ
  // Stat rows + the chart sections below them (mood, hydration, nutrition,
  // movement, symptoms) all read from these.
  const statsLoading = !sessionChecked || kicksLoadingQ || symptomsLoadingQ || sleepLoadingQ
    || moodLoadingQ || hydrationLoadingQ || nutritionLoadingQ || exerciseLoadingQ
  const contractionsLoading = !sessionChecked || contractionsLoadingQ
  const birthLoading = !sessionChecked || birthLoadingQ

  // Light UI: plain counts from the last 7 days (never a score). A window
  // shorter than a week only has that many days of data to count.
  const weekFacts = useMemo(() => buildPregnancyWeekFacts({
    sleep: sleepHistory, moods: moodTrend, water: hydrationHistory,
    exercise: exerciseHistory, nutrition: nutritionMatrix, days: Math.min(7, windowDays),
  }), [sleepHistory, moodTrend, hydrationHistory, exerciseHistory, nutritionMatrix, windowDays])

  // Light: Grandma's weekly note — pure rules over the logs already loaded here.
  const notesLetter = useMemo(() => (diffuse ? null : buildPregnancyNote({
    week: weekNumber,
    sleep: sleepHistory,
    moods: moodTrend,
    water: hydrationHistory,
    exercise: exerciseHistory,
    nutrition: nutritionMatrix,
    kicks: kickSessions,
    // momTip is English-only — other languages get the curated, translated line.
    momTip: language === 'en' ? getWeekData(weekNumber).momTip : null,
    formatDay: (iso) => weekdayName(iso, language),
  }, t)), [diffuse, weekNumber, sleepHistory, moodTrend, hydrationHistory, exerciseHistory,
    nutritionMatrix, kickSessions, language, t])

  // Quick takeaways
  const tk = useMemo(() => buildTakeaways({
    weightHistory, kickSessions, sleepHistory, moodTrend, symptomFreq,
    hydrationHistory, exerciseHistory, contractions, weekFacts, nutritionMatrix,
    birthReady, trimester, weightUnit: prefWeightUnit,
  }), [weightHistory, kickSessions, sleepHistory, moodTrend, symptomFreq,
       hydrationHistory, exerciseHistory, contractions, weekFacts, nutritionMatrix,
       birthReady, trimester, prefWeightUnit])

  // Derived display values for stat tiles
  const weights = weightHistory.map((e) => e.weight).filter((w) => w > 0)
  const latestWeight = weights.length ? weights[weights.length - 1] : null
  const firstWeight = weights.length ? weights[0] : null
  const weeklyGain =
    firstWeight && latestWeight && weights.length > 1
      ? (latestWeight - firstWeight) / Math.max(1, weights.length - 1)
      : null

  const weightValue = latestWeight ? nf(kgToDisplay(latestWeight, prefWeightUnit), 1) : '—'
  const weightUnit = weeklyGain !== null
    ? `${prefWeightLabel} · ${weeklyGain >= 0 ? '+' : ''}${nf(kgToDisplay(weeklyGain, prefWeightUnit), 1)} / wk`
    : prefWeightLabel

  const avgKicks = kickSessions.length > 0
    ? Math.round(kickSessions.reduce((a, b) => a + b.kicks, 0) / kickSessions.length)
    : 0
  const symptomCount = symptomFreq.reduce((a, b) => a + b.count, 0)
  const sleepHrsArr = sleepHistory.map((s) => s.hours)
  const sleepAvg = sleepHrsArr.length > 0
    ? nf(sleepHrsArr.reduce((a, b) => a + b, 0) / sleepHrsArr.length, 1) + 'h'
    : '—'
  const hydrationData = hydrationHistory.map((h) => h.glasses)

  // Extras shown only when relevant
  const showContractions = trimester === 3 || contractions.length > 0

  return (
    <View style={[styles.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomInset }]}
        showsVerticalScrollIndicator={false}
      >
        <AnalyticsHeader hide />

        {diffuse ? (
          <View style={{ marginTop: 8, marginBottom: 4, paddingHorizontal: 20 }}>
            <DiffuseSectionHeader
              eyebrow="PREGNANCY"
              title="Week over week"
              right={(
                <View style={styles.actionRow}>
                  {onExamsPress ? (
                    <Pressable
                      onPress={onExamsPress}
                      hitSlop={10}
                      style={[styles.infoBtn, { backgroundColor: 'transparent', borderColor: dt.colors.line2 }]}
                      accessibilityLabel={t('sw1_pa_a11yExams')}
                    >
                      <Character name="exam" size={16} color={dt.colors.ink3} />
                    </Pressable>
                  ) : null}
                  <Pressable
                    onPress={() => setShowInfo(true)}
                    hitSlop={10}
                    style={[styles.infoBtn, { backgroundColor: 'transparent', borderColor: dt.colors.line2 }]}
                    accessibilityLabel={t('sw1_pa_a11yHow')}
                  >
                    <Info size={16} color={dt.colors.ink3} strokeWidth={1.6} />
                  </Pressable>
                </View>
              )}
            />
          </View>
        ) : (
          <>
            {/* Light: the tab opens with Grandma's weekly note; the charts
                and sections follow under "The details". */}
            <GrandmaNotesTitle
              right={(
                <>
                  {onExamsPress ? (
                    <SiteIconButton onPress={onExamsPress} label={t('sw1_pa_a11yExams')}>
                      <FlaskConical size={16} color={colors.text} strokeWidth={2.2} />
                    </SiteIconButton>
                  ) : null}
                  <SiteIconButton onPress={() => setShowInfo(true)} label={t('sw1_pa_a11yHow')}>
                    <Info size={16} color={colors.text} strokeWidth={2.2} />
                  </SiteIconButton>
                </>
              )}
            />
            <GrandmaNote
              letter={notesLetter}
              loading={statsLoading}
              onNotePress={(area) => setOpenPillar(area as PillarKey)}
              onAction={notesLetter?.suggestion?.actionArea
                ? () => setOpenPillar(notesLetter.suggestion!.actionArea as PillarKey)
                : undefined}
            />
            <PeriodSelector value={period} onChange={handlePeriodChange} customLabel={customLabel} />
            <NotesDetailsEyebrow />
          </>
        )}

        {/* Journey ring — the hero (moved here from Calendar → Journey). Shows
            the spinnable week wheel + size/length/weight/this-week detail. */}
        {dueDate ? (
          <PregnancyJourneyRing weekNumber={weekNumber} dueDate={dueDate} />
        ) : null}

        {/* PeriodSelector self-gates to Diffuse segment pills. Light renders
            it above "The details" instead. */}
        {diffuse ? (
          <PeriodSelector value={period} onChange={handlePeriodChange} customLabel={customLabel} />
        ) : null}

        {/* Hero: Weight gain chart — tap to expand */}
        {diffuse ? (
          <Pressable onPress={() => setOpenPillar('weight')} style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}>
            {/* Clean paper card + a soft-blue chart line (not the lavender mode
                wash) so the screen isn't uniformly purple. */}
            <View
              style={{ marginHorizontal: 20, marginTop: 8, padding: 20, borderRadius: 28, borderWidth: 1, borderColor: dt.colors.line, backgroundColor: dt.colors.surface }}
            >
              <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: dt.colors.ink3 }}>
                {`WEIGHT GAIN · WEEK ${weekNumber}`}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 4, gap: 6 }}>
                <Text style={{ fontFamily: diffuseFont.display, fontSize: 38, lineHeight: 40, color: dt.colors.ink, letterSpacing: -0.5 }}>
                  {weightValue}
                </Text>
                <Text style={{ fontFamily: diffuseFont.mono, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', color: dt.colors.ink3, paddingBottom: 8 }}>
                  {weightUnit}
                </Text>
              </View>
              <View style={{ marginTop: 14 }}>
                <GlowAreaLine data={weights} color={stickers.green} color2={stickers.blue} />
              </View>
            </View>
          </Pressable>
        ) : weightLoading ? (
          // Weight first load: ghost number + chart, not a bare "KG LATEST" + empty chart.
          <View style={{ marginHorizontal: 20, marginTop: 8, paddingTop: 4 }}>
            <Text style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.textSecondary }}>
              {t('sw1_pa_weightWeek', { n: weekNumber })}
            </Text>
            <Skeleton height={48} width="45%" radius={10} style={{ marginTop: 8 }} />
            <Skeleton height={64} radius={12} style={{ marginTop: 14 }} />
          </View>
        ) : (
          <Pressable
            onPress={() => setOpenPillar('weight')}
            style={({ pressed }) => [{ marginHorizontal: 20, marginTop: 8, paddingTop: 4, opacity: pressed ? 0.8 : 1 }]}
          >
            <Text style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.textSecondary }}>
              {t('sw1_pa_weightWeek', { n: weekNumber })}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
              <Text style={{ fontFamily: font.displayBold, fontSize: 52, lineHeight: 58, letterSpacing: -1.5, color: colors.text }}>
                {weightValue}
              </Text>
              <Text style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.textSecondary }}>
                {weeklyGain !== null
                  ? t('sw1_pa_wLatestAvg', { unit: prefWeightLabel, delta: `${weeklyGain >= 0 ? '+' : ''}${nf(kgToDisplay(weeklyGain, prefWeightUnit), 1)}` })
                  : t('sw1_pa_wLatest', { unit: prefWeightLabel })}
              </Text>
            </View>
            <View style={{ marginTop: 10 }}>
              <MiniLineChart data={weights} color={stickers.lilac} />
            </View>
          </Pressable>
        )}

        {/* 2×2 tappable stat grid */}
        {diffuse ? (
          <View style={styles.grid}>
            <View style={styles.gridRow}>
              <DiffuseStatCard
                flex={1}
                label="KICKS / DAY"
                value={avgKicks ? String(avgKicks) : undefined}
                emptyLabel="—"
                icon={renderPillarGlyph('kicks', stickers.pink, 18)}
                iconNoBloom
                accent={stickers.pink}
                accent2={stickers.peach}
                onPress={() => setOpenPillar('kicks')}
              />
              <DiffuseStatCard
                flex={1}
                label="SYMPTOMS"
                value={symptomCount > 0 ? String(symptomCount) : undefined}
                sub={symptomCount > 0 ? 'LOGGED' : undefined}
                emptyLabel="None"
                icon={renderPillarGlyph('symptoms', stickers.yellow, 18)}
                iconNoBloom
                accent={stickers.yellow}
                accent2={stickers.peach}
                onPress={() => setOpenPillar('symptoms')}
              />
            </View>
            <View style={styles.gridRow}>
              <DiffuseStatCard
                flex={1}
                label="SLEEP"
                value={sleepAvg !== '—' ? sleepAvg : undefined}
                emptyLabel="—"
                icon={renderPillarGlyph('sleep', stickers.lilac, 18)}
                iconNoBloom
                accent={stickers.lilac}
                accent2={stickers.blue}
                onPress={() => setOpenPillar('sleep')}
              />
              <DiffuseStatCard
                flex={1}
                label="WELLBEING"
                value={wellbeing ? `${wellbeing.overall}%` : undefined}
                emptyLabel="—"
                icon={renderPillarGlyph('wellbeing', stickers.green, 18)}
                iconNoBloom
                accent={stickers.green}
                accent2={stickers.blue}
                onPress={() => setOpenPillar('wellbeing')}
              />
            </View>
          </View>
        ) : statsLoading ? (
          <SkeletonStatRows count={4} style={{ paddingHorizontal: 20, marginTop: 14 }} />
        ) : (
          <View style={{ paddingHorizontal: 20, marginTop: 14 }}>
            <SiteRow
              first
              sticker={PILLAR_SITE_STICKER.kicks}
              label={tNow('kp_pc_m_kick_count')}
              sub={t('pregAnalytics_avgPerSession')}
              value={avgKicks ? String(avgKicks) : '—'}
              tone={stickers.pinkSoft}
              onPress={() => setOpenPillar('kicks')}
            />
            <SiteRow
              sticker={PILLAR_SITE_STICKER.symptoms}
              label={tNow('kp_pc_m_symptom')}
              sub={t('pregAnalytics_totalLoggedThisPeriod')}
              value={symptomCount > 0 ? String(symptomCount) : tNow('kp_pa_none')}
              tone={stickers.yellowSoft}
              onPress={() => setOpenPillar('symptoms')}
            />
            <SiteRow
              sticker={PILLAR_SITE_STICKER.sleep}
              label={tNow('kp_pc_m_sleep')}
              sub={t('pregAnalytics_avgPerNight')}
              value={sleepAvg}
              pct={tk.sleep.pct}
              tone={stickers.lilacSoft}
              onPress={() => setOpenPillar('sleep')}
            />
            {/* Was a composite Wellbeing %. Now a plain count of this week's
                logs; the bar = how many days have a log, never a grade. */}
            <SiteRow
              sticker={PILLAR_SITE_STICKER.wellbeing}
              label={t('preg_week_title')}
              sub={t('preg_week_daysLogged', { days: weekFacts.daysLogged, total: weekFacts.days })}
              value={weekFacts.logCount > 0 ? String(weekFacts.logCount) : '—'}
              valueSub={weekFacts.logCount > 0 ? t('preg_analytics_logsShort') : undefined}
              pct={tk.wellbeing.pct}
              tone={stickers.greenSoft}
              onPress={() => setOpenPillar('wellbeing')}
            />
          </View>
        )}

        {/* Light first load: one ghost chart where the mood / hydration /
            nutrition / movement / symptom sections will land. */}
        {!diffuse && statsLoading && (
          <SkeletonChartSection style={{ marginHorizontal: 20, marginTop: 28 }} />
        )}

        {/* Mood trend strip */}
        {moodTrend.length > 0 && (
          <Section
            title={tNow('kp_pa_moodTrend')}
            subtitle={tNow('kp_pa_past4', { n: moodTrend.length })}
            onPress={() => setOpenPillar('mood')}
          >
            <MoodStrip data={pregMoodToStrip(moodTrend)} />
          </Section>
        )}

        {/* Hydration bars */}
        {hydrationData.some((v) => v > 0) && (
          <Section
            title={tNow('pregnancy_logTitle_water')}
            subtitle={tNow('kp_pa_glassesTarget')}
            onPress={() => setOpenPillar('hydration')}
          >
            <View style={diffuse
              ? [styles.chartCard, { backgroundColor: dt.colors.surface, borderColor: dt.colors.line }]
              : styles.chartBare}>
              {diffuse ? (
                // Filled sip-columns: fill LEVEL per day, ghost outline for the
                // empty part, violet ring dot when the 8-glass target is met.
                <SipColumns
                  data={hydrationData}
                  labels={hydrationHistory.map((h) => shortDay(h.date))}
                  longLabels={hydrationHistory.map((h) => formatLogDate(h.date))}
                  target={8}
                  color={stickers.blue}
                  accent={accent}
                  unit="gl"
                />
              ) : (
                <SiteBars
                  data={hydrationData}
                  labels={barDayLabels(hydrationHistory.map((h) => h.date))}
                  tone={stickers.blueSoft}
                  target={8}
                  unit=""
                  caption={tNow('kp_pa_glassesDay')}
                />
              )}
            </View>
          </Section>
        )}

        {/* Nutrition matrix mini */}
        {nutritionMatrix && (nutritionMatrix.iron.some(Boolean) || nutritionMatrix.folic.some(Boolean) || nutritionMatrix.protein.some(Boolean) || nutritionMatrix.calcium.some(Boolean)) && (
          <Section
            title={tNow('kp_pc_m_nutrition')}
            subtitle={tNow('kp_pa_nutrients')}
            onPress={() => setOpenPillar('nutrition')}
          >
            <View style={styles.chartBare}>
              <NutritionMini matrix={nutritionMatrix} />
            </View>
          </Section>
        )}

        {/* Movement / exercise mini */}
        {exerciseHistory.some((e) => e.minutes > 0) && (
          <Section
            title={tNow('kp_pc_d_exercise')}
            subtitle={diffuse ? 'Minutes per session · target 150 / week' : t('pregAnalytics_minutesPerDayTarget')}
            onPress={() => setOpenPillar('exercise')}
          >
            <View style={styles.chartBare}>
              {diffuse ? (
                // Radial petal burst — floats on the page (no card), the shape
                // is self-contained enough to stand alone.
                <PetalBurst
                  data={exerciseHistory.map((e) => e.minutes)}
                  color={stickers.coral}
                  color2={stickers.peach}
                  centerLabel={String(exerciseHistory.filter((e) => e.minutes > 0).length)}
                />
              ) : (
                <SiteBars
                  data={exerciseHistory.map((e) => e.minutes)}
                  labels={barDayLabels(exerciseHistory.map((e) => e.date))}
                  tone={stickers.peachSoft}
                  target={Math.round(150 / 7)}
                  unit="m"
                  caption={t('pregAnalytics_minutesPerDay')}
                />
              )}
            </View>
          </Section>
        )}

        {/* Top symptoms list */}
        {symptomFreq.length > 0 && (
          <Section
            title={tNow('kp_pa_topSymptoms')}
            subtitle={tNow('kp_pa_uniqueSymptoms', { n: symptomFreq.length })}
            onPress={() => setOpenPillar('symptoms')}
          >
            {diffuse ? (
              // Glance summary — the full ranked breakdown lives in the detail
              // sheet (tap the card). Here we surface only what a glance needs:
              // the most-common symptom as the headline + total logged, with the
              // 5 rank-hue dots as a legend that ties to the sheet's coloured
              // bars. Avoids duplicating the ranked list card↔sheet.
              <SymptomsGlance
                total={symptomFreq.reduce((a, b) => a + b.count, 0)}
                mostCommon={symptomFreq[0]?.symptom ?? '—'}
                hues={symptomFreq.slice(0, 5).map((_, i) => symptomHue(stickers, i))}
              />
            ) : (
            <View>
              {symptomFreq.map((s, i) => (
                <View
                  key={s.symptom}
                  style={[
                    styles.listRow,
                    { borderTopWidth: i === 0 ? 0 : HAIR, borderTopColor: colors.border },
                  ]}
                >
                  <Text style={{ width: 22, fontSize: 11, letterSpacing: 1.2, fontFamily: MONO, color: colors.textSecondary }}>{i + 1}</Text>
                  <Text style={[styles.listLabel, { color: colors.text }]}>{symptomLabel(s.symptom)}</Text>
                  <Text style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: MONO, color: colors.text }}>{t('preg_analytics_times_prefix', { count: s.count })}</Text>
                </View>
              ))}
            </View>
            )}
          </Section>
        )}

        {/* Labor & birth — grouped hero banners */}
        <View style={{ paddingHorizontal: 20, marginTop: 28, gap: diffuse ? 12 : 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: diffuse ? 0 : 6 }}>
            <View>
              <Text style={diffuse
                ? { fontSize: 20, color: dt.colors.ink, fontFamily: diffuseFont.display, letterSpacing: -0.3 }
                : { fontSize: 20, color: colors.text, fontFamily: font.display, letterSpacing: 0.2, textTransform: 'uppercase' }}>
                {tNow('kp_pa_labor')}
              </Text>
              <Text style={diffuse
                ? { fontSize: 10, color: dt.colors.ink3, fontFamily: diffuseFont.mono, marginTop: 4, letterSpacing: 1, textTransform: 'uppercase' }
                : { fontSize: 10, color: colors.textMuted, fontFamily: MONO, marginTop: 3, letterSpacing: 1.4, textTransform: 'uppercase' }}>
                {tNow('kp_pa_laborSub')}
              </Text>
            </View>
          </View>

          {!diffuse && contractionsLoading ? (
            // Only ghost the row where it will show anyway (3rd trimester).
            trimester === 3 ? <SkeletonStatRow first /> : null
          ) : showContractions && (
            <HeroBanner
              pillarKey="contractions"
              label={t('sw1_pa_contractionsCap')}
              title={contractions.length > 0 ? `${contractions.length}` : '—'}
              subtitle={contractions.length > 0
                ? t(contractions[contractions.length - 1].count === 1 ? 'pregAnalytics_lastSessionContractions_one' : 'pregAnalytics_lastSessionContractions_other', { count: contractions[contractions.length - 1].count })
                : (tk.contractions.takeaway ?? '')}
              badgeText=""
              badgeCaption={t('sw1_pa_sessionsCap')}
              onPress={() => setOpenPillar('contractions')}
            />
          )}

          {!diffuse && birthLoading ? (
            <SkeletonStatRow first={!(trimester === 3 || showContractions)} />
          ) : (
            <HeroBanner
              pillarKey="birth"
              label={diffuse ? 'BIRTH READINESS' : tNow('kp_pa_birthPrep')}
              // Light: a count of tasks marked done and the next concrete step — no readiness %
              // (a composite score that read as "how ready you are for birth").
              title={diffuse ? tk.birth.headline : birthReady ? tNow('kp_pa_nDone', { n: birthReady.birthPlanCount + birthReady.nestingCount }) : '—'}
              // Light never shows the "Loading your readiness…" placeholder copy:
              // loading is the skeleton above; a failed load just has no subtitle.
              subtitle={diffuse ? (tk.birth.takeaway ?? '') : birthReady ? birthNextStep(birthReady, trimester) : ''}
              badgeText=""
              badgeCaption={diffuse ? 'READY' : t('sw1_pa_tasksCap')}
              onPress={() => setOpenPillar('birth')}
            />
          )}
        </View>
        {/* Report for the doctor — light only, last row of the details. */}
        {!diffuse && <ReportEntryRow behavior="pregnancy" />}
        <InsightsDisclaimer />
      </ScrollView>

      {/* Detail sheet */}
      <PillarDetailModal
        pillarKey={openPillar}
        onClose={() => setOpenPillar(null)}
        weekNumber={weekNumber}
        trimester={trimester}
        weightHistory={weightHistory}
        weightByWeek={weightByWeek}
        kickSessions={kickSessions}
        kickHours={kickHours}
        symptomFreq={symptomFreq}
        sleepHistory={sleepHistory}
        wellbeing={wellbeing ?? null}
        weekFacts={weekFacts}
        moodTrend={moodTrend}
        hydrationHistory={hydrationHistory}
        nutritionMatrix={nutritionMatrix ?? null}
        exerciseHistory={exerciseHistory}
        contractions={contractions}
        birthReady={birthReady ?? null}
      />

      {/* Score info sheet */}
      <ScoreInfoModal
        visible={showInfo}
        onClose={() => setShowInfo(false)}
        wellbeing={wellbeing ?? null}
        weekFacts={weekFacts}
        weekNumber={weekNumber}
        trimester={trimester}
      />

      {/* Custom date-range picker */}
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

// ─── Symptoms glance (Insights card body) ──────────────────────────────────
// A compact summary for the "Top Symptoms" card. The full ranked breakdown
// lives in the detail sheet (SymptomsDetail); this only surfaces the headline
// (most-common symptom) + total, plus the 5 rank-hue dots as a legend tying to
// the sheet's coloured bars — so the card previews rather than duplicates.
function SymptomsGlance({ total, mostCommon, hues }: { total: number; mostCommon: string; hues: string[] }) {
  const { colors } = useDiffuseTheme()
  return (
    <View style={styles.symptomsGlance}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.symptomsGlanceEyebrow, { color: colors.ink3 }]}>Most common</Text>
        <Text style={[styles.symptomsGlanceValue, { color: colors.ink }]} numberOfLines={1}>
          {mostCommon}
        </Text>
        <View style={styles.symptomsGlanceDots}>
          {hues.map((h, i) => (
            <View key={i} style={[styles.symptomsGlanceDot, { backgroundColor: h }]} />
          ))}
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.symptomsGlanceTotal, { color: colors.ink }]}>{total}</Text>
        <Text style={[styles.symptomsGlanceEyebrow, { color: colors.ink3 }]}>Logged</Text>
      </View>
    </View>
  )
}


// ─── Nutrition mini grid (4 nutrients × 7 days) ────────────────────────────

function NutritionMini({
  matrix,
}: {
  matrix: { iron: boolean[]; folic: boolean[]; protein: boolean[]; calcium: boolean[]; dates: string[] }
}) {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const accent = getDiffuseAccent('preg', dt.isDark)
  const { t } = useTranslation()
  const rows = [
    { label: t('sw1_pa_iron'),    arr: matrix.iron,    color: stickers.coral, soft: stickers.peachSoft },
    { label: t('sw1_pa_folic'),   arr: matrix.folic,   color: stickers.green, soft: stickers.greenSoft },
    { label: t('sw1_pa_protein'), arr: matrix.protein, color: stickers.peach, soft: stickers.peachSoft },
    { label: t('sw1_pa_calcium'), arr: matrix.calcium, color: stickers.blue,  soft: stickers.blueSoft },
  ]
  if (diffuse) {
    // Dot matrix — one hue per nutrient row, filled dot = hit that day.
    return (
      <View style={{ gap: 8 }}>
        <NutrientMatrix
          matrix={rows.map((r) => r.arr)}
          colors={rows.map((r) => r.color)}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
          {rows.map((r) => (
            <View key={r.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: r.color }} />
              <Text style={{ color: dt.colors.ink2, fontSize: 11, fontFamily: diffuseFont.mono }}>
                {r.label} {r.arr.filter(Boolean).length}/{r.arr.length}
              </Text>
            </View>
          ))}
        </View>
      </View>
    )
  }
  return (
    <View style={{ gap: 12 }}>
      {rows.map((r) => (
        <View key={r.label}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
            <Text style={{ color: colors.text, fontSize: 13, fontFamily: font.bodySemiBold }}>{r.label}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 10, fontFamily: MONO, letterSpacing: 1.2, textTransform: 'uppercase' }}>
              {t('sw1_pa_hitOfDays', { hit: r.arr.filter(Boolean).length, total: r.arr.length })}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {r.arr.map((hit, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: 16,
                  borderRadius: 5,
                  borderWidth: hit ? 1.5 : 0,
                  borderColor: colors.text,
                  backgroundColor: hit ? r.soft : colors.border,
                }}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  )
}

// ─── Hero week card ────────────────────────────────────────────────────────

function HeroWeekCard({
  weekNumber, trimester, daysToDue,
}: { weekNumber: number; trimester: 1 | 2 | 3; daysToDue: number | null }) {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const accent = getDiffuseAccent('preg', dt.isDark)
  const palette = pillarPalette('weight', stickers)
  const dDaysText = daysToDue === null
    ? '—'
    : daysToDue > 0
    ? tNow(daysToDue === 1 ? 'kp_pa_dayToGo1' : 'kp_ph_daysToGo', { n: daysToDue })
    : daysToDue === 0
    ? tNow('kp_pa_dueToday')
    : tNow(daysToDue === -1 ? 'kp_pa_pastDue1' : 'kp_pa_pastDueN', { n: Math.abs(daysToDue) })

  if (diffuse) {
    return (
      <DiffuseFieldSurface
        mode="preg"
        isDark={dt.isDark}
        radius={26}
        style={[styles.hero, { borderWidth: 1, borderColor: dt.colors.line }]}
      >
        <View style={[styles.heroChip, { borderWidth: 0 }]}>
          {renderPillarGlyph('weight', stickers.green, 28)}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heroLabel, { color: dt.colors.ink3, fontFamily: diffuseFont.mono }]}>
            {trimesterLabel(trimester).toUpperCase()}
          </Text>
          <Text style={[styles.heroValue, { color: dt.colors.ink, fontFamily: diffuseFont.display }]}>
            {tNow('kp_pa_weekN', { n: weekNumber })}
          </Text>
          <Text style={[styles.heroSub, { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 0.6, textTransform: 'uppercase', fontSize: 10 }]}>
            {dDaysText}
          </Text>
        </View>
        <View style={styles.heroBadge}>
          <View style={[styles.heroBadgeInner, { backgroundColor: 'transparent', borderColor: dt.colors.line2 }]}>
            <Text style={[styles.heroBadgeNum, { color: dt.colors.ink, fontFamily: diffuseFont.display }]}>
              {trimester}
            </Text>
            <Text style={[styles.heroBadgeT, { color: dt.colors.ink3, fontFamily: diffuseFont.mono }]}>
              {'TRI'}
            </Text>
          </View>
        </View>
      </DiffuseFieldSurface>
    )
  }

  return (
    <View
      style={[
        styles.hero,
        { backgroundColor: palette.tint, borderColor: 'rgba(20,19,19,0.12)' },
      ]}
    >
      <View style={[styles.heroChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {renderPillarSticker('weight', palette.chip, 26)}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.heroLabel, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
          {trimesterLabel(trimester).toUpperCase()}
        </Text>
        <Text style={[styles.heroValue, { color: colors.text, fontFamily: font.display }]}>
          {tNow('kp_pa_weekN', { n: weekNumber })}
        </Text>
        <Text style={[styles.heroSub, { color: colors.textSecondary, fontFamily: font.bodyMedium }]}>
          {dDaysText}
        </Text>
      </View>
      <View style={styles.heroBadge}>
        <View style={[styles.heroBadgeInner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.heroBadgeNum, { color: colors.text, fontFamily: font.display }]}>
            {trimester}
          </Text>
          <Text style={[styles.heroBadgeT, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
            {'TRI'}
          </Text>
        </View>
      </View>
    </View>
  )
}

// ─── Hero banner (reused for Contractions + Birth Ready) ───────────────────

function HeroBanner({
  pillarKey, label, title, subtitle, badgeText, badgeCaption, onPress,
}: {
  pillarKey: PillarKey
  label: string
  title: string
  subtitle: string
  badgeText: string
  badgeCaption: string
  onPress: () => void
}) {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const accent = getDiffuseAccent('preg', dt.isDark)
  const palette = pillarPalette(pillarKey, stickers)

  if (diffuse) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}>
        <DiffuseFieldSurface
          mode="preg"
          isDark={dt.isDark}
          radius={26}
          style={[styles.hero, { marginHorizontal: 0, marginTop: 0, marginBottom: 0, borderWidth: 1, borderColor: dt.colors.line }]}
        >
          <View style={[styles.heroChip, { borderWidth: 0 }]}>
            {renderPillarGlyph(pillarKey, palette.chip, 28)}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroLabel, { color: dt.colors.ink3, fontFamily: diffuseFont.mono }]}>
              {label}
            </Text>
            <Text style={[styles.heroValue, { color: dt.colors.ink, fontFamily: diffuseFont.display }]}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={[styles.heroSub, { color: dt.colors.ink3, fontFamily: diffuseFont.body }]} numberOfLines={2}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <View style={styles.heroBadge}>
            <View style={[styles.heroBadgeInner, { backgroundColor: 'transparent', borderColor: dt.colors.line2 }]}>
              <Text style={[styles.heroBadgeNum, { color: dt.colors.ink, fontFamily: diffuseFont.display }]}>
                {badgeText}
              </Text>
              <Text style={[styles.heroBadgeT, { color: dt.colors.ink3, fontFamily: diffuseFont.mono }]}>
                {badgeCaption}
              </Text>
            </View>
          </View>
        </DiffuseFieldSurface>
      </Pressable>
    )
  }

  return (
    <SiteRow
      first={pillarKey === 'contractions'}
      sticker={PILLAR_SITE_STICKER[pillarKey]}
      label={label}
      sub={subtitle || undefined}
      value={title}
      valueSub={`${badgeText} ${badgeCaption}`.trim()}
      tone={palette.tint}
      onPress={onPress}
    />
  )
}

// ─── Pillar row ────────────────────────────────────────────────────────────

function PillarRow({
  pillarKey, takeaway, onPress,
}: { pillarKey: PillarKey; takeaway: Takeaway; onPress: () => void }) {
  const { colors, stickers, font } = useTheme()
  const { t } = useTranslation()
  const meta = PILLAR_META[pillarKey]
  const label = t(PILLAR_LABEL_KEY[pillarKey] as any)
  const palette = pillarPalette(pillarKey, stickers)
  const pct = takeaway.pct ?? 0

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pillarPaper,
        {
          backgroundColor: colors.surface,
          borderColor: 'rgba(20,19,19,0.12)',
        },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={styles.pillarHead}>
        <View style={[styles.pillarChip, { backgroundColor: palette.tint, borderColor: 'rgba(20,19,19,0.12)' }]}>
          {renderPillarSticker(pillarKey, palette.chip, 24)}
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.pillarTitleRow}>
            <Text style={[styles.pillarName, { color: colors.text, fontFamily: font.display }]}>
              {label}
            </Text>
            {takeaway.trend ? (
              <View style={[styles.trendChip, { backgroundColor: palette.tint }]}>
                <Text style={[styles.trendText, { color: colors.text, fontFamily: font.bodySemiBold }]}>
                  {takeaway.trend}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.pillarBlurb, { color: colors.textMuted, fontFamily: font.bodyMedium }]}>
            {t(PILLAR_BLURB_KEY[pillarKey])}
          </Text>
        </View>
        <View style={styles.pillarValueWrap}>
          <Text style={[styles.pillarValue, { color: colors.text, fontFamily: font.display }]}>
            {takeaway.headline}
          </Text>
          <ChevronRight size={16} color={colors.textMuted} strokeWidth={2} />
        </View>
      </View>

      {/* Progress bar */}
      <View style={[styles.pillarBarBg, { backgroundColor: palette.tint }]}>
        <View
          style={[
            styles.pillarBarFill,
            { width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: palette.bar },
          ]}
        />
      </View>

      {takeaway.takeaway ? (
        <Text style={[styles.pillarTakeaway, { color: colors.textSecondary, fontFamily: font.bodyMedium }]}>
          {takeaway.takeaway}
        </Text>
      ) : null}
    </Pressable>
  )
}

// ─── Detail modal ──────────────────────────────────────────────────────────

interface DetailProps {
  pillarKey: PillarKey | null
  onClose: () => void
  weekNumber: number
  trimester: 1 | 2 | 3
  weightHistory: { date: string; weight: number }[]
  weightByWeek: PregnancyWeightByWeek[]
  kickSessions: { date: string; kicks: number }[]
  kickHours: KickHourBucket[]
  symptomFreq: { symptom: string; count: number }[]
  sleepHistory: { date: string; hours: number }[]
  wellbeing: PregnancyWellbeingScore | null
  /** Light UI: this week's counts (replaces the wellbeing score). */
  weekFacts: PregnancyWeekFacts
  moodTrend: { log_date: string; value: string | null }[]
  hydrationHistory: { date: string; glasses: number }[]
  nutritionMatrix: {
    dates: string[]; iron: boolean[]; folic: boolean[]; protein: boolean[]; calcium: boolean[]
  } | null
  exerciseHistory: PregnancyExerciseEntry[]
  contractions: PregnancyContractionSession[]
  birthReady: BirthReadiness | null
}

function PillarDetailModal(props: DetailProps) {
  const { pillarKey, onClose } = props
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const dAccent = getDiffuseAccent('preg', dt.isDark)
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()

  if (!pillarKey) return null
  const meta = PILLAR_META[pillarKey]
  const label = t(PILLAR_LABEL_KEY[pillarKey] as any)
  const palette = pillarPalette(pillarKey, stickers)
  const sheetH = SCREEN_H * 0.87

  if (diffuse) {
    return (
      <DiffuseSheet visible title={label} onClose={onClose} chip={t(PILLAR_BLURB_KEY[pillarKey]).toUpperCase()}>
        <View style={{ gap: 16, paddingTop: 4 }}>
          <Animated.View entering={FadeInDown.duration(220)}>
            {/* Use the pillar's OWN hue (not the violet mode accent) so each
                detail sheet's charts read in that metric's colour. */}
            <DetailDispatcher {...props} pillarKey={pillarKey} accentColor={palette.chip} accentTint={palette.tint} />
          </Animated.View>
        </View>
      </DiffuseSheet>
    )
  }

  // Light: the old "Wellbeing · Five-pillar score" sheet is now "This week".
  const isWeek = pillarKey === 'wellbeing'
  return (
    <LightSheet visible onClose={onClose} height={sheetH}>
      <View style={{ paddingHorizontal: 20 }}>
        <DetailSheetHeader
          title={isWeek ? t('preg_week_title') : label}
          sticker={PILLAR_SITE_STICKER[pillarKey]}
          tone={palette.tint}
          onClose={onClose}
        />
        <Text style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.textSecondary }}>
          {isWeek ? t('preg_week_blurb') : t(PILLAR_BLURB_KEY[pillarKey])}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 14,
          paddingBottom: insets.bottom + 28,
          gap: 18,
        }}
      >
        <FadeUp index={0} style={{ gap: 18 }}>
          <DetailDispatcher {...props} pillarKey={pillarKey} accentColor={palette.chip} accentTint={palette.tint} />
        </FadeUp>
      </ScrollView>
    </LightSheet>
  )
}

function DetailDispatcher(props: DetailProps & { pillarKey: PillarKey; accentColor?: string; accentTint?: string }) {
  switch (props.pillarKey) {
    case 'wellbeing':    return <WellbeingDetail {...props} />
    case 'weight':       return <WeightDetail {...props} />
    case 'kicks':        return <KicksDetail {...props} />
    case 'sleep':        return <SleepDetail {...props} />
    case 'mood':         return <MoodDetail {...props} />
    case 'symptoms':     return <SymptomsDetail {...props} />
    case 'hydration':    return <HydrationDetail {...props} />
    case 'nutrition':    return <NutritionDetail {...props} />
    case 'exercise':     return <ExerciseDetail {...props} />
    case 'contractions': return <ContractionsDetail {...props} />
    case 'birth':        return <BirthDetail {...props} />
  }
}

// ─── Detail bodies ─────────────────────────────────────────────────────────

function WellbeingDetail(props: DetailProps & { accentColor?: string; accentTint?: string }) {
  const diffuse = useIsDiffuse()
  // Light: plain counts for the week. The composite score, its "Strongest /
  // Watch" call-outs and per-pillar /10 values stay Diffuse-only.
  if (!diffuse) return <WeekDetail {...props} />
  return <WellbeingDetailDiffuse {...props} />
}

/** Light "This week" sheet — counts and averages from the user's own logs, never a grade. */
function WeekDetail({ weekFacts: facts, weekNumber, trimester, accentColor, accentTint }: DetailProps & { accentColor?: string; accentTint?: string }) {
  const { colors, stickers, font } = useTheme()
  const { t } = useTranslation()

  if (facts.logCount === 0) {
    return (
      <>
        <PaperCard>
          <Body size={13} color={colors.textMuted}>{t('preg_week_empty')}</Body>
        </PaperCard>
        <TrimesterTip trimester={trimester} kind="wellbeing" weekNumber={weekNumber} />
      </>
    )
  }

  const areas: { key: PregnancyWeekArea; label: string; tint: string; sticker: SiteStickerName }[] = [
    { key: 'sleep',     label: t('preg_analytics_pillar_sleep'),     tint: stickers.lilacSoft, sticker: WELLBEING_STICKER.sleep },
    { key: 'mood',      label: t('preg_analytics_pillar_mood'),      tint: stickers.pinkSoft,  sticker: WELLBEING_STICKER.mood },
    { key: 'nutrition', label: t('preg_analytics_pillar_nutrition'), tint: stickers.greenSoft, sticker: WELLBEING_STICKER.nutrition },
    { key: 'movement',  label: t('sw1_pa_movement'),                 tint: stickers.peachSoft, sticker: WELLBEING_STICKER.exercise },
    { key: 'water',     label: t('preg_analytics_pillar_hydration'), tint: stickers.blueSoft,  sticker: WELLBEING_STICKER.hydration },
  ]
  const total = facts.days
  const fact = (key: PregnancyWeekArea): string => {
    switch (key) {
      case 'sleep':
        return facts.sleep
          ? t('preg_week_sleepFact', { hours: nf(facts.sleep.avgHours, 1), nights: facts.sleep.nights, total })
          : t('preg_week_notLogged')
      case 'mood':
        return facts.mood
          ? t(facts.mood.count === 1 ? 'preg_week_moodFact_one' : 'preg_week_moodFact_other', { count: facts.mood.count, mood: moodLabel(facts.mood.topMood) })
          : t('preg_week_notLogged')
      case 'nutrition':
        return facts.nutrition
          ? t('preg_week_nutritionFact', { days: facts.nutrition.days, total })
          : t('preg_week_notLogged')
      case 'movement':
        return facts.movement
          ? t('preg_week_movementFact', { days: facts.movement.days, minutes: facts.movement.minutes, total })
          : t('preg_week_notLogged')
      case 'water':
        return facts.water
          ? t('preg_week_waterFact', { days: facts.water.days, glasses: nf(facts.water.avgGlasses, 1), total })
          : t('preg_week_notLogged')
    }
  }

  return (
    <>
      <View>
        <Text style={{ color: colors.text, fontSize: 56, lineHeight: 62, fontFamily: font.displayBold, letterSpacing: -1.5 }}>
          {facts.logCount}
        </Text>
        <Text style={[styles.siteMono, { color: colors.textSecondary }]}>{t('kids_analytics_logs_week')}</Text>
      </View>

      <StatTilesRow
        tint={accentTint}
        color={accentColor}
        items={[
          { label: t('preg_week_tileDays'), value: `${facts.daysLogged}/${total}` },
          { label: t('preg_week_tileAreas'), value: `${facts.areasLogged}/5` },
          { label: t('preg_profile_trimester'), value: String(trimester) },
        ]}
      />

      <PaperCard title={t('preg_week_whatYouLogged')}>
        <View style={{ gap: 14 }}>
          {areas.map((a) => {
            // Bar = how many days of the week have a log for this area — never a grade.
            const pct = Math.round((areaDays(facts, a.key) / total) * 100)
            return (
              <View key={a.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <SiteSticker name={a.sticker} size={30} cut />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 14, fontFamily: font.bodySemiBold }}>{a.label}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 17, fontFamily: font.body, marginTop: 1, marginBottom: 6 }}>
                    {fact(a.key)}
                  </Text>
                  <SiteMeter pct={pct} tone={a.tint} />
                </View>
              </View>
            )
          })}
        </View>
      </PaperCard>

      <PaperCard title={t('preg_week_howCountedTitle')}>
        <Body size={13} color={colors.textSecondary} style={{ lineHeight: 20 }}>
          {t('preg_week_howCountedBody')}
        </Body>
      </PaperCard>

      <TrimesterTip trimester={trimester} kind="wellbeing" weekNumber={weekNumber} />
    </>
  )
}

function WellbeingDetailDiffuse({ wellbeing, weekNumber, trimester }: DetailProps & { accentColor?: string; accentTint?: string }) {
  const { stickers } = useTheme()
  const dt = useDiffuseTheme()
  const ink = dt.colors.ink
  const sec = dt.colors.ink2
  const muted = dt.colors.ink3
  const { t } = useTranslation()

  if (!wellbeing) {
    return (
      <PaperCard>
        <Body size={13} color={muted}>
          Not enough recent logs to compute wellbeing yet. Keep logging sleep, mood, water,
          nutrition, and movement and a score will appear here.
        </Body>
      </PaperCard>
    )
  }

  const pillars: { key: keyof PregnancyWellbeingScore; label: string; color: string; tint: string }[] = [
    { key: 'sleep',     label: 'Sleep',     color: stickers.lilac,  tint: stickers.lilacSoft },
    { key: 'mood',      label: 'Mood',      color: stickers.pink,   tint: stickers.pinkSoft },
    { key: 'nutrition', label: 'Nutrition', color: stickers.green,  tint: stickers.greenSoft },
    { key: 'exercise',  label: 'Movement',  color: stickers.coral,  tint: stickers.peachSoft },
    { key: 'hydration', label: 'Hydration', color: stickers.blue,   tint: stickers.blueSoft },
  ]

  const weakest = [...pillars].sort((a, b) => (wellbeing[a.key] as number) - (wellbeing[b.key] as number))[0]
  const strongest = [...pillars].sort((a, b) => (wellbeing[b.key] as number) - (wellbeing[a.key] as number))[0]

  return (
    <>
      <ScoreHero value={`${wellbeing.overall}%`} caption={t('preg_analytics_overall_last7')} />

      <WellbeingCallouts
        strongest={{ label: strongest.label, color: strongest.color }}
        watch={{ label: weakest.label, color: weakest.color }}
        trimester={String(trimester)}
      />

      {/* De-carded: the chart + legend breathe on the page under a plain
          eyebrow, so the sheet isn't a stack of nested white boxes. */}
      <View style={{ marginTop: 4 }}>
        <Text style={[styles.diffuseEyebrow, { color: dt.colors.ink3 }]}>Five pillars</Text>
        <ConcentricArcs
          data={pillars.map((p) => ({ value: wellbeing[p.key] as number, color: p.color } as ArcDatum))}
        />
        {/* Legend key — each pillar's colour, name and score on its own row. */}
        <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: dt.colors.line, marginTop: 16, paddingTop: 16, gap: 12 }}>
          {pillars.map((p) => (
            <View key={p.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 9, height: 9, borderRadius: 999, backgroundColor: p.color }} />
              <Text style={{ flex: 1, color: dt.colors.ink2, fontSize: 12, fontFamily: diffuseFont.mono }}>
                {p.label}
              </Text>
              <Text style={{ color: dt.colors.ink, fontSize: 12, fontFamily: diffuseFont.mono }}>
                {nf(wellbeing[p.key] as number, 1)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Footnote, not a card — a hairline rule + eyebrow, text on the page. */}
      <View style={{ marginTop: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: dt.colors.line, paddingTop: 16 }}>
        <Text style={[styles.diffuseEyebrow, { color: dt.colors.ink3 }]}>How it's computed</Text>
        <Body size={13} color={sec} style={{ lineHeight: 20 }}>
          Each pillar scores 0–10 from your last 7 days of logs.{' '}
          <Body size={13} color={ink}>{'Sleep'}</Body>{' '}maps hours against a 9h target.{' '}
          <Body size={13} color={ink}>{'Mood'}</Body>{' '}counts positive entries.{' '}
          <Body size={13} color={ink}>{'Nutrition, movement and hydration'}</Body>{' '}each weight
          logs-per-day against healthy pregnancy targets. Overall = average × 10.
        </Body>
      </View>

      <TrimesterTip trimester={trimester} kind="wellbeing" weekNumber={weekNumber} />
    </>
  )
}

function WeightDetail({ weightHistory, weightByWeek, weekNumber, trimester, accentColor, accentTint }: DetailProps & { accentColor?: string; accentTint?: string }) {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const sec = diffuse ? dt.colors.ink2 : colors.textSecondary
  const muted = diffuse ? dt.colors.ink3 : colors.textMuted
  const { t } = useTranslation()
  // Weights are canonical kg from the DB; convert to the user's chosen unit for
  // display only (B4). A gain/delta converts by scale (offset cancels).
  const weightUnit = useUnitsStore((s) => s.weightUnit)
  const uLabel = weightLabel(weightUnit)
  const toU = (kg: number) => kgToDisplay(kg, weightUnit)
  const validEntries = weightHistory.filter((e) => e.weight > 0)
  const weights = validEntries.map((e) => toU(e.weight))
  const weightLabels = validEntries.map((e) => formatLogDate(e.date))
  const firstW = weights[0]
  const lastW = weights[weights.length - 1]
  const totalGain = firstW && lastW ? lastW - firstW : null
  const avgWeekly = totalGain !== null && weights.length > 1 ? totalGain / (weights.length - 1) : null

  // Target-per-week thresholds are in kg; compare against the kg average.
  const kgWeights = validEntries.map((e) => e.weight)
  const kgGain = kgWeights.length > 1 ? kgWeights[kgWeights.length - 1] - kgWeights[0] : null
  const kgAvgWeekly = kgGain !== null ? kgGain / (kgWeights.length - 1) : null
  const targetPerWeek = trimester === 1 ? 0.2 : trimester === 2 ? 0.4 : 0.3
  const onTrack = kgAvgWeekly !== null && Math.abs(kgAvgWeekly - targetPerWeek) <= 0.25

  return (
    <>
      <StatTilesRow
        tint={accentTint}
        color={accentColor}
        items={[
          { label: t('sw1_pa_latest'), value: lastW ? `${nf(lastW, 1)} ${uLabel}` : '—' },
          { label: t('sw1_pa_totalGain'), value: totalGain !== null ? `${totalGain >= 0 ? '+' : ''}${nf(totalGain, 1)} ${uLabel}` : '—' },
          { label: diffuse ? 'Per week' : t('sw1_pa_avgWeek'), value: avgWeekly !== null ? `${avgWeekly >= 0 ? '+' : ''}${nf(avgWeekly, 2)}` : '—' },
        ]}
      />

      <PaperCard title={t('sw1_pa_weightOverTime')} accent={accentColor} withBlob>
        {weights.length >= 2 ? (
          <MiniLineChart
            data={weights}
            labels={weightLabels}
            unit={uLabel}
            color={accentColor ?? stickers.lilac}
            height={180}
          />
        ) : (
          <Body size={13} color={muted}>
            {t('preg_analytics_noWeightTrend')}
          </Body>
        )}
      </PaperCard>

      {weightByWeek.length >= 2 ? (
        <PaperCard title={t('sw1_pa_byWeek')}>
          {diffuse ? (
            (() => {
              const rows = weightByWeek.slice(-8)
              const min = Math.min(...rows.map((r) => toU(r.weight)))
              const max = Math.max(...rows.map((r) => toU(r.weight)))
              return (
                <TieredLozenges
                  color={accentColor ?? stickers.green}
                  min={min}
                  max={max}
                  rows={rows.map((w) => ({ label: `W${w.week}`, value: toU(w.weight), display: `${nf(toU(w.weight), 1)}${uLabel}` } as TierRow))}
                />
              )
            })()
          ) : (
            <WeightByWeekList rows={weightByWeek.slice(-8)} accent={accentColor ?? stickers.lilac} tint={accentTint ?? stickers.lilacSoft} unit={uLabel} toDisplay={toU} />
          )}
        </PaperCard>
      ) : null}

      <PaperCard title={diffuse ? `Healthy range · Week ${weekNumber}` : t('kp_weightGuide_title', { week: weekNumber })}>
        <Body size={13} color={sec} style={{ lineHeight: 20 }}>
          {!diffuse ? t(trimester === 1 ? 'sw1_pa_wgT1' : trimester === 2 ? 'sw1_pa_wgT2' : 'sw1_pa_wgT3') : trimester === 1
            ? 'In the first trimester, gaining 0.5–2 kg total is typical — many people lose a little from nausea.'
            : trimester === 2
            ? 'Trimester 2 averages 0.3–0.5 kg per week. Steady gain reflects the placenta and baby growing.'
            : 'Trimester 3 often slows to 0.2–0.4 kg per week. Sudden jumps can signal swelling — flag it to your OB.'}
        </Body>
        {/* Light: guidance only — no on-track / below-target verdict on the pregnancy's weight gain. */}
        {!diffuse ? null : onTrack ? (
          <Pill color={stickers.green} tint={stickers.greenSoft} label={t('preg_analytics_pill_onTrack')} />
        ) : avgWeekly !== null ? (
          <Pill
            color={stickers.coral}
            tint={stickers.peachSoft}
            label={t('preg_analytics_pill_belowTarget')}
          />
        ) : null}
      </PaperCard>
    </>
  )
}

function KicksDetail({ kickSessions, kickHours, weekNumber, trimester, accentColor, accentTint }: DetailProps & { accentColor?: string; accentTint?: string }) {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const dAccent = getDiffuseAccent('preg', dt.isDark)
  const ink = diffuse ? dt.colors.ink : colors.text
  const sec = diffuse ? dt.colors.ink2 : colors.textSecondary
  const muted = diffuse ? dt.colors.ink3 : colors.textMuted
  const barFill = diffuse ? (accentColor ?? dAccent) : stickers.pinkSoft
  const barTrack = diffuse ? dt.colors.line : colors.border
  const barEdge = diffuse ? 0 : 1
  const { t } = useTranslation()
  const avg = kickSessions.length > 0
    ? Math.round(kickSessions.reduce((a, b) => a + b.kicks, 0) / kickSessions.length)
    : 0
  const max = kickSessions.length > 0 ? Math.max(...kickSessions.map((k) => k.kicks)) : 0
  const kickValues = kickSessions.map((k) => k.kicks)
  const kickLabels = kickSessions.map((k) => shortDay(k.date))
  const meets10in2h = kickSessions.filter((k) => k.kicks >= 10).length
  const compliancePct = kickSessions.length > 0
    ? Math.round((meets10in2h / kickSessions.length) * 100)
    : 0

  // Time-of-day buckets: 4 quadrants
  const morning = kickHours.slice(6, 12).reduce((a, b) => a + b.count, 0)
  const afternoon = kickHours.slice(12, 18).reduce((a, b) => a + b.count, 0)
  const evening = kickHours.slice(18, 24).reduce((a, b) => a + b.count, 0)
  const night = (kickHours.slice(0, 6).reduce((a, b) => a + b.count, 0))
  const todBuckets = [
    { label: t('sw1_pa_morning'), value: morning },
    { label: t('sw1_pa_afternoon'), value: afternoon },
    { label: t('sw1_pa_evening'), value: evening },
    { label: t('sw1_pa_night'), value: night },
  ]
  const totalTod = todBuckets.reduce((a, b) => a + b.value, 0)
  const peak = totalTod > 0 ? todBuckets.sort((a, b) => b.value - a.value)[0] : null

  return (
    <>
      <StatTilesRow
        tint={accentTint}
        color={accentColor}
        items={[
          { label: t('sw1_pa_avgSession'), value: avg ? String(avg) : '—' },
          { label: t('sw1_pa_peak'), value: max ? String(max) : '—' },
          { label: t('sw1_pa_sessions'), value: String(kickSessions.length) },
        ]}
      />

      <PaperCard title={t('sw1_pa_recentKicks')}>
        {kickSessions.length > 0 ? (
          diffuse ? (
            <BeadedThread data={kickValues} labels={kickLabels} color={stickers.pink} accent={accentColor ?? stickers.pink} />
          ) : (
            <SiteBars data={kickValues} labels={kickLabels} tone={stickers.pinkSoft} caption={t('pregAnalytics_kicksPerSession')} />
          )
        ) : (
          <Body size={13} color={muted}>
            {t('preg_analytics_noKickSessions')}
          </Body>
        )}
      </PaperCard>

      {/* Light: guidance only. The old card scored sessions against "10 in 2 hours" (it never checked
          the 2 hours) and showed a % plus "less than that warrants a call" — a verdict on the baby.
          Shown from week 28, which is what the copy says. */}
      {!diffuse && weekNumber >= 28 ? (
        <PaperCard title={tNow('kp_pa_kicksTitle')}>
          <Body size={13} color={sec} style={{ lineHeight: 20 }}>
            {tNow('kp_pa_kicksBody')}
          </Body>
        </PaperCard>
      ) : null}

      {diffuse && weekNumber >= 24 ? (
        <PaperCard title="10-in-2-hours rule">
          <Body size={13} color={sec} style={{ lineHeight: 20 }}>
            From week 28, aim for 10 distinct movements in under 2 hours. Less than that warrants a
            call to your OB.
          </Body>
          <View style={{ marginTop: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ color: ink, fontSize: 13, fontFamily: diffuse ? diffuseFont.body : font.bodyMedium }}>
                {t('preg_analytics_sessionsHittingTarget')}
              </Text>
              <Text style={{ color: diffuse ? dt.colors.ink : colors.text, fontSize: 13, fontFamily: diffuse ? diffuseFont.monoBold : font.bodyBold }}>
                {meets10in2h} / {kickSessions.length} ({compliancePct}%)
              </Text>
            </View>
            <View style={{ height: diffuse ? 3 : 8, borderRadius: 999, backgroundColor: barTrack, overflow: 'hidden' }}>
              <View style={{ width: `${compliancePct}%`, height: '100%', backgroundColor: barFill, borderRadius: 999, borderWidth: compliancePct > 0 ? barEdge : 0, borderColor: colors.text }} />
            </View>
          </View>
        </PaperCard>
      ) : null}

      {totalTod > 0 ? (
        <PaperCard title={t('sw1_pa_whenActive')}>
          <View style={{ gap: 8 }}>
            {todBuckets.map((b) => {
              const pct = totalTod ? Math.round((b.value / totalTod) * 100) : 0
              return (
                <View key={b.label}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: ink, fontSize: 13, fontFamily: diffuse ? diffuseFont.body : font.bodyMedium }}>{b.label}</Text>
                    <Text style={{ color: muted, fontSize: 12, fontFamily: diffuse ? diffuseFont.mono : font.body }}>{t('preg_analytics_stat_value_pct', { value: b.value, pct })}</Text>
                  </View>
                  <View style={{ height: diffuse ? 3 : 6, borderRadius: 3, backgroundColor: barTrack, overflow: 'hidden' }}>
                    <View style={{ width: `${pct}%`, height: '100%', backgroundColor: barFill, borderRadius: 3, borderWidth: pct > 0 ? barEdge : 0, borderColor: colors.text }} />
                  </View>
                </View>
              )
            })}
          </View>
          {peak ? (
            <Pill color={stickers.pink} tint={stickers.pinkSoft} label={t('sw1_pa_mostActive', { part: peak.label })} />
          ) : null}
        </PaperCard>
      ) : null}

      <TrimesterTip trimester={trimester} kind="kicks" weekNumber={weekNumber} />
    </>
  )
}

function SleepDetail({ sleepHistory, trimester, weekNumber, accentColor, accentTint }: DetailProps & { accentColor?: string; accentTint?: string }) {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const dAccent = getDiffuseAccent('preg', dt.isDark)
  const ink = diffuse ? dt.colors.ink : colors.text
  const sec = diffuse ? dt.colors.ink2 : colors.textSecondary
  const muted = diffuse ? dt.colors.ink3 : colors.textMuted
  const { t } = useTranslation()
  const hours = sleepHistory.map((s) => s.hours)
  const labels = sleepHistory.map((s) => shortDay(s.date))
  const avg = hours.length > 0 ? hours.reduce((a, b) => a + b, 0) / hours.length : 0
  const best = hours.length > 0 ? Math.max(...hours) : 0
  const worst = hours.length > 0 ? Math.min(...hours) : 0
  const debt = hours.length > 0 ? Math.max(0, hours.length * 8 - hours.reduce((a, b) => a + b, 0)) : 0

  return (
    <>
      <StatTilesRow
        tint={accentTint}
        color={accentColor}
        items={[
          { label: diffuse ? 'Average' : t('sw1_pa_avgNight'), value: avg ? `${nf(avg, 1)}h` : '—' },
          { label: diffuse ? 'Best' : t('sw1_pa_longest'), value: best ? `${nf(best, 1)}h` : '—' },
          { label: diffuse ? 'Worst' : t('sw1_pa_shortest'), value: worst ? `${nf(worst, 1)}h` : '—' },
        ]}
      />

      <PaperCard title={t('sw1_pa_sleepHours')}>
        {hours.length > 0 ? (
          diffuse ? (
            <CrescentBars data={hours} labels={labels} color={accentColor ?? stickers.lilac} max={9} />
          ) : (
            <SiteBars data={hours} labels={labels} tone={stickers.lilacSoft} unit="h" caption={t('sw1_pa_hoursPerNight')} />
          )
        ) : (
          <Body size={13} color={muted}>
            {t('preg_analytics_noSleepLogs')}
          </Body>
        )}
      </PaperCard>

      {hours.length > 0 ? (
        <PaperCard title={diffuse ? 'Sleep debt' : t('pregAnalytics_sleepDebtTotal')}>
          <Text style={{ color: ink, fontSize: 24, fontFamily: diffuse ? diffuseFont.display : font.displayBold }}>
            {nf(debt, 1)}{'h'}
          </Text>
          <Body size={13} color={sec}>
            {diffuse ? `vs an 8-hour target across the last ${hours.length} nights you logged.` : t('sw1_pa_sleepVs', { n: hours.length })}
          </Body>
        </PaperCard>
      ) : null}

      <TrimesterTip trimester={trimester} kind="sleep" weekNumber={weekNumber} />
    </>
  )
}

function MoodDetail({ moodTrend, trimester, weekNumber, accentColor, accentTint }: DetailProps & { accentColor?: string; accentTint?: string }) {
  const { colors, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const ink = diffuse ? dt.colors.ink : colors.text
  const muted = diffuse ? dt.colors.ink3 : colors.textMuted
  const { t } = useTranslation()
  const positive = ['happy', 'radiant', 'energetic', 'okay']
  const totals: Record<string, number> = {}
  for (const m of moodTrend) {
    const v = m.value ?? 'unknown'
    totals[v] = (totals[v] ?? 0) + 1
  }
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1])
  const positiveCount = moodTrend.filter((m) => positive.includes(m.value ?? '')).length
  const positivePct = moodTrend.length > 0 ? Math.round((positiveCount / moodTrend.length) * 100) : 0

  return (
    <>
      <StatTilesRow
        tint={accentTint}
        color={accentColor}
        items={[
          { label: t('sw1_pa_logged'), value: String(moodTrend.length) },
          // Light: a plain day count instead of a "% positive" share.
          diffuse
            ? { label: 'Positive', value: `${positivePct}%` }
            : { label: t('sw1_pa_days'), value: String(new Set(moodTrend.map((m) => m.log_date)).size) },
          { label: t('sw1_pa_mostCommon'), value: sorted[0]?.[0] ? moodLabel(sorted[0][0]) : '—' },
        ]}
      />

      <PaperCard title={t('sw1_pa_moodMix')}>
        {moodTrend.length > 0 ? (
          <MoodBubbleCluster
            items={(Object.entries(totals) as [string, number][])
              .filter(([, c]) => c > 0)
              .map(([mood, count]): MoodBubbleItem => ({ mood, count }))}
          />
        ) : (
          <Body size={13} color={muted}>{t('preg_analytics_no_moods')}</Body>
        )}
      </PaperCard>

      {sorted.length > 0 ? (
        <PaperCard title={t('sw1_pa_distribution')}>
          <View style={{ gap: 8 }}>
            {sorted.map(([mood, n]) => {
              const pct = Math.round((n / moodTrend.length) * 100)
              // Each mood carries its own hue — the same per-mood fill the Mood
              // Mix bubbles use (moodFaceFill), so the distribution reads as the
              // same color language instead of one flat accent for every row.
              const color = moodFaceFill(mood)
              return (
                <View key={mood}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: ink, fontSize: 13, fontFamily: diffuse ? diffuseFont.body : font.bodyMedium, textTransform: 'capitalize' }}>
                      {moodLabel(mood)}
                    </Text>
                    <Text style={{ color: muted, fontSize: 12, fontFamily: diffuse ? diffuseFont.mono : font.body }}>{t('preg_analytics_stat_value_pct', { value: n, pct })}</Text>
                  </View>
                  <View style={{ height: diffuse ? 3 : 6, borderRadius: 3, backgroundColor: diffuse ? dt.colors.line : colors.border, overflow: 'hidden' }}>
                    <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: 3, borderWidth: diffuse || pct === 0 ? 0 : 1, borderColor: colors.text }} />
                  </View>
                </View>
              )
            })}
          </View>
        </PaperCard>
      ) : null}

      <TrimesterTip trimester={trimester} kind="mood" weekNumber={weekNumber} />
    </>
  )
}

function SymptomsDetail({ symptomFreq, trimester, weekNumber, accentColor, accentTint }: DetailProps & { accentColor?: string; accentTint?: string }) {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const ink = diffuse ? dt.colors.ink : colors.text
  const sec = diffuse ? dt.colors.ink2 : colors.textSecondary
  const muted = diffuse ? dt.colors.ink3 : colors.textMuted
  const { t } = useTranslation()
  const total = symptomFreq.reduce((a, b) => a + b.count, 0)

  // Severe symptoms warranting OB call
  const severe = ['severe headache', 'vision changes', 'bleeding', 'severe swelling', 'fever', 'no kicks']
  const severeHits = symptomFreq.filter((s) => severe.includes(s.symptom.toLowerCase()))

  return (
    <>
      <StatTilesRow
        tint={accentTint}
        color={accentColor}
        items={[
          { label: t('sw1_pa_totalLogged'), value: String(total) },
          { label: t('sw1_pa_unique'), value: String(symptomFreq.length) },
          { label: t('sw1_pa_mostCommon'), value: symptomFreq[0]?.symptom ? symptomLabel(symptomFreq[0].symptom) : '—' },
        ]}
      />

      {diffuse ? (
        // De-carded breakdown — hairline top rule + mono eyebrow, and each bar
        // carries the SAME per-symptom sticker hue as the "Top Symptoms" card
        // it was opened from (via symptomHue by rank), so the chart is
        // consistent inside and outside instead of a monochrome accent version.
        <View style={{ marginTop: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: dt.colors.line, paddingTop: 16 }}>
          <Text style={[styles.diffuseEyebrow, { color: dt.colors.ink3 }]}>Breakdown</Text>
          {symptomFreq.length > 0 ? (
            <View style={{ gap: 12 }}>
              {symptomFreq.map((s, i) => {
                const pct = Math.round((s.count / Math.max(total, 1)) * 100)
                const hue = symptomHue(stickers, i)
                return (
                  <View key={s.symptom}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ color: ink, fontSize: 13, fontFamily: diffuseFont.body, textTransform: 'capitalize' }}>
                        {symptomLabel(s.symptom)}
                      </Text>
                      <Text style={{ color: muted, fontSize: 12, fontFamily: diffuseFont.mono }}>{t('preg_analytics_stat_value_pct', { value: s.count, pct })}</Text>
                    </View>
                    <View style={{ height: 4, borderRadius: 999, backgroundColor: dt.colors.line, overflow: 'hidden' }}>
                      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: hue, borderRadius: 999 }} />
                    </View>
                  </View>
                )
              })}
            </View>
          ) : (
            <Body size={13} color={muted}>{t('preg_analytics_no_symptoms')}</Body>
          )}
        </View>
      ) : (
        <PaperCard title={t('sw1_pa_breakdown')}>
          {symptomFreq.length > 0 ? (
            <View style={{ gap: 8 }}>
              {symptomFreq.map((s, i) => {
                const pct = Math.round((s.count / Math.max(total, 1)) * 100)
                return (
                  <View key={s.symptom}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ color: ink, fontSize: 13, fontFamily: font.bodySemiBold, textTransform: 'capitalize' }}>
                        {symptomLabel(s.symptom)}
                      </Text>
                      <Text style={{ color: sec, fontSize: 12, fontFamily: font.body }}>{t('preg_analytics_stat_value_pct', { value: s.count, pct })}</Text>
                    </View>
                    <SiteMeter pct={pct} tone={symptomSoft(stickers, i)} />
                  </View>
                )
              })}
            </View>
          ) : (
            <Body size={13} color={muted}>{t('preg_analytics_no_symptoms')}</Body>
          )}
        </PaperCard>
      )}

      {severeHits.length > 0 ? (
        diffuse ? (
          <View style={{ marginTop: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: dt.colors.line, paddingTop: 16 }}>
            <Text style={[styles.diffuseEyebrow, { color: dt.colors.ink3 }]}>Worth a call</Text>
            <Body size={13} color={sec} style={{ lineHeight: 20 }}>
              You've logged{' '}
              <Body size={13} color={ink}>{severeHits.map((s) => symptomLabel(s.symptom)).join(', ')}</Body>
              . These can be normal but warrant a call to your provider — especially if persistent or severe.
            </Body>
          </View>
        ) : (
          <PaperCard title={tNow('kp_pa_worthCall')}>
            <Body size={13} color={sec} style={{ lineHeight: 20 }}>
              {tNow('kp_pa_loggedPrefix')}{' '}
              <Body size={13} color={ink}>{severeHits.map((s) => symptomLabel(s.symptom)).join(', ')}</Body>
              {tNow('kp_pa_worthCallSuffix')}
            </Body>
          </PaperCard>
        )
      ) : null}

      <TrimesterTip trimester={trimester} kind="symptoms" weekNumber={weekNumber} />
    </>
  )
}

function HydrationDetail({ hydrationHistory, trimester, weekNumber, accentColor, accentTint }: DetailProps & { accentColor?: string; accentTint?: string }) {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const dAccent = getDiffuseAccent('preg', dt.isDark)
  const ink = diffuse ? dt.colors.ink : colors.text
  const sec = diffuse ? dt.colors.ink2 : colors.textSecondary
  const muted = diffuse ? dt.colors.ink3 : colors.textMuted
  const df = diffuse ? diffuseFont : null
  const { t } = useTranslation()
  const accent = diffuse ? (accentColor ?? dAccent) : (accentColor ?? stickers.blue)
  const tint = diffuse ? dt.colors.line : (accentTint ?? stickers.blueSoft)
  const TARGET = 8

  const data = hydrationHistory.map((h) => h.glasses)
  const labels = hydrationHistory.map((h) => shortDay(h.date))
  const longLabels = hydrationHistory.map((h) => formatLogDate(h.date))
  const avg = data.length > 0 ? data.reduce((a, b) => a + b, 0) / data.length : 0
  const daysHittingTarget = data.filter((g) => g >= TARGET).length
  const totalGlasses = data.reduce((a, b) => a + b, 0)
  const totalLitres = totalGlasses * 0.25 // 1 glass ≈ 250ml

  const todayKey = toDateStr(new Date())
  const todayEntry = hydrationHistory.find((h) => h.date === todayKey)
  const todayGlasses = todayEntry?.glasses ?? 0
  const todayPct = Math.min(100, Math.round((todayGlasses / TARGET) * 100))
  const todayRemaining = Math.max(0, TARGET - todayGlasses)

  // Streak: consecutive most-recent days that hit target
  const streak = (() => {
    let s = 0
    for (let i = hydrationHistory.length - 1; i >= 0; i--) {
      if (hydrationHistory[i].glasses >= TARGET) s++
      else break
    }
    return s
  })()

  const bestDay = hydrationHistory.length > 0
    ? hydrationHistory.reduce((best, cur) => (cur.glasses > best.glasses ? cur : best))
    : null

  // Time-of-day pattern: morning / afternoon / evening (rough thirds)
  const morning = data.length > 0 ? Math.round(avg * 0.35 * 10) / 10 : 0
  const afternoon = data.length > 0 ? Math.round(avg * 0.4 * 10) / 10 : 0
  const evening = data.length > 0 ? Math.round(avg * 0.25 * 10) / 10 : 0

  const hitRate = data.length > 0 ? Math.round((daysHittingTarget / data.length) * 100) : 0

  return (
    <>
      <StatTilesRow
        tint={tint}
        color={accent}
        items={[
          { label: t('sw1_pa_avgDay'), value: avg ? nf(avg, 1) : '—' },
          { label: t('sw1_pa_target'), value: `${TARGET} ${t('sw1_pa_glAbbr')}` },
          { label: t('sw1_pa_onTarget'), value: data.length ? `${daysHittingTarget}/${data.length}` : '—' },
        ]}
      />

      {/* Today's progress hero */}
      <PaperCard title={t('sw1_pa_today')} accent={accent} withBlob>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: 999,
              backgroundColor: diffuse ? 'transparent' : tint,
              borderWidth: diffuse ? 1.5 : 2,
              borderColor: diffuse ? dt.colors.line2 : colors.text,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontFamily: df?.display ?? font.displayBold, fontSize: 30, color: ink, letterSpacing: -0.5 }}>
              {todayGlasses}
            </Text>
            <Text style={{ fontFamily: df?.mono ?? MONO, fontSize: 10, color: sec, marginTop: -2 }}>
              {t('sw1_pa_ofN', { n: TARGET })}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: df?.display ?? font.displayBold, fontSize: 22, color: ink, letterSpacing: -0.4 }}>
              {t('sw1_pa_pctGoal', { pct: todayPct })}
            </Text>
            <Text style={{ fontFamily: df?.body ?? font.bodyMedium, fontSize: 13, color: sec, marginTop: 2 }}>
              {todayRemaining > 0 ? t(todayRemaining === 1 ? 'sw1_pa_moreGlass_one' : 'sw1_pa_moreGlass_other', { n: todayRemaining }) : t('sw1_pa_goalReached')}
            </Text>
            {diffuse ? (
              <View style={{ marginTop: 10, height: 3, borderRadius: 999, backgroundColor: dt.colors.line, overflow: 'hidden' }}>
                <View style={{ width: `${todayPct}%`, height: '100%', backgroundColor: accent, borderRadius: 999 }} />
              </View>
            ) : (
              <View style={{ marginTop: 10 }}>
                <SiteMeter pct={todayPct} tone={tint} height={8} />
              </View>
            )}
          </View>
        </View>
      </PaperCard>

      {/* Glass tracker — soft water-drop blobs that fill as you sip. Filled =
          a bloomed drop sticker in the hue; empty = a hairline ghost drop. */}
      <PaperCard title={t('sw1_pa_glassByGlass')}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6 }}>
          {Array.from({ length: TARGET }, (_, i) => {
            const filled = i < todayGlasses
            return (
              <View key={i} style={{ flex: 1, aspectRatio: 0.74, alignItems: 'center', justifyContent: 'center' }}>
                {/* Soft blob halo behind a filled drop */}
                {filled && diffuse ? (
                  <View style={StyleSheet.absoluteFill}>
                    <SoftBloom color={accent} opacity={dt.isDark ? 0.4 : 0.5} spread={0.5} radius="52%" />
                  </View>
                ) : null}
                {diffuse ? (
                  <Drop
                    size={30}
                    fill={filled ? accent : 'transparent'}
                    stroke={filled ? accent : dt.colors.line2}
                  />
                ) : (
                  <View style={{ opacity: filled ? 1 : 0.2 }}>
                    <SiteSticker name="drop" size={30} cut />
                  </View>
                )}
              </View>
            )
          })}
        </View>
        {todayGlasses > TARGET ? (
          <Text style={{ marginTop: 10, fontSize: 11, color: sec, fontFamily: df?.body ?? font.bodyMedium }}>
            {t('sw1_pa_extraKeep', { n: todayGlasses - TARGET })}
          </Text>
        ) : null}
      </PaperCard>

      {/* Last 7 days — diverging pills (met above / shortfall hatched below) */}
      <PaperCard title={diffuse ? 'Last 7 days' : t('kp_pa_glassesDay')}>
        {data.length > 0 ? (
          <>
            {diffuse ? (
              <SipColumns
                data={data}
                labels={labels}
                longLabels={longLabels}
                target={TARGET}
                color={stickers.blue}
                accent={accent}
                height={170}
                unit="gl"
              />
            ) : (
              <SiteBars
                data={data}
                labels={barDayLabels(hydrationHistory.map((h) => h.date))}
                tone={tint}
                height={140}
                target={TARGET}
                caption={tNow('kp_pa_glassesDay')}
              />
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
              <Text style={{ fontSize: 11, color: sec, fontFamily: df?.body ?? font.bodyMedium }}>
                {t('sw1_pa_goalLine', { n: TARGET })}
              </Text>
              <Text style={{ fontSize: 11, color: diffuse ? dt.colors.ink : colors.text, fontFamily: df?.monoBold ?? font.bodyBold }}>
                {diffuse ? `${hitRate}% hit rate` : t('sw1_pa_daysAtGoal', { pct: hitRate })}
              </Text>
            </View>
          </>
        ) : (
          <Body size={13} color={muted}>
            {t('preg_analytics_noHydrationLogs')}
          </Body>
        )}
      </PaperCard>

      {/* Streak + Best day + Volume — 3 mini stats */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <MiniInfoTile
          label={t('sw1_pa_streak')}
          value={streak > 0 ? t('common_nDays', { n: streak }) : '—'}
          caption={streak > 0 ? t('sw1_pa_hittingGoal') : t('sw1_pa_hitToStart', { n: TARGET })}
          tint={tint}
          accent={accent}
        />
        <MiniInfoTile
          label={diffuse ? 'Best day' : t('sw1_pa_topDay')}
          value={bestDay ? `${bestDay.glasses}` : '—'}
          caption={bestDay ? formatLogDate(bestDay.date) : t('sw1_pa_noLogsYet')}
          tint={tint}
          accent={accent}
        />
        <MiniInfoTile
          label={diffuse ? 'Volume' : t('sw1_pa_totalVolume')}
          value={totalLitres ? `${nf(totalLitres, 1)}L` : '—'}
          caption={diffuse ? `${totalGlasses} glasses · 7d` : t('sw1_pa_glassesTotal', { n: totalGlasses })}
          tint={tint}
          accent={accent}
        />
      </View>

      {/* Time-of-day estimate — Diffuse only. The split is a fixed 35/40/25% of the daily average,
          not anything the user logged, so the light look doesn't show it. */}
      {diffuse && data.length > 0 ? (
        <PaperCard title={t('sw1_pa_whenSip')}>
          {diffuse ? (
            // Soft split meters — three time-of-day meters in blue/mint/lilac,
            // not the violet progress bars.
            <SplitMeters
              rows={[
                { label: `Morning · ${nf(morning, 1)} gl`, frac: morning / TARGET, color: stickers.blue },
                { label: `Afternoon · ${nf(afternoon, 1)} gl`, frac: afternoon / TARGET, color: stickers.green },
                { label: `Evening · ${nf(evening, 1)} gl`, frac: evening / TARGET, color: stickers.lilac },
              ]}
            />
          ) : (
            <View style={{ gap: 10 }}>
              {[
                { label: t('sw1_pa_morning'), value: morning, hint: t('sw1_pa_hintMorning') },
                { label: t('sw1_pa_afternoon'), value: afternoon, hint: t('sw1_pa_hintAfternoon') },
                { label: t('sw1_pa_evening'), value: evening, hint: t('sw1_pa_hintEvening') },
              ].map((row) => {
                const pct = Math.min(100, (row.value / TARGET) * 100)
                return (
                  <View key={row.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text style={{ width: 84, fontSize: 13, color: ink, fontFamily: font.bodyMedium }}>
                      {row.label}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <SiteMeter pct={pct} tone={tint} height={8} />
                    </View>
                    <Text style={{ width: 60, textAlign: 'right', fontSize: 13, color: ink, fontFamily: font.bodySemiBold }}>
                      {nf(row.value, 1)}{' '}{t('sw1_pa_glAbbr')}
                    </Text>
                  </View>
                )
              })}
            </View>
          )}
          <Text style={{ marginTop: 12, fontSize: 11, color: muted, fontFamily: df?.body ?? font.bodyMedium, lineHeight: 16 }}>
            {t('sw1_pa_approxSplit')}
          </Text>
        </PaperCard>
      ) : null}

      {/* Status pill */}
      {data.length > 0 ? (
        <PaperCard title={t('sw1_pa_weekStatus', { n: weekNumber })}>
          <Body size={13} color={sec} style={{ lineHeight: 20 }}>
            {!diffuse ? t('sw1_pa_hydStatus', { avg: nf(avg, 1), target: TARGET }) : avg >= TARGET
              ? `You're averaging ${nf(avg, 1)} glasses — great rhythm. Keep sipping consistently across the day.`
              : avg >= TARGET * 0.75
              ? `Close to target at ${nf(avg, 1)} glasses. Try one extra glass with each meal to close the gap.`
              : `Averaging only ${nf(avg, 1)} glasses — well below the ${TARGET}-glass target. Keep a bottle within reach.`}
          </Body>
          {!diffuse ? null : avg >= TARGET ? (
            <Pill color={stickers.green} tint={stickers.greenSoft} label={t('preg_analytics_pill_onTrack')} />
          ) : avg >= TARGET * 0.75 ? (
            <Pill color={accent} tint={tint} label={t('preg_analytics_pill_almostThere')} />
          ) : (
            <Pill color={stickers.coral} tint={stickers.peachSoft} label={t('preg_analytics_pill_belowTarget')} />
          )}
        </PaperCard>
      ) : null}

      <PaperCard title={t('sw1_pa_whyHyd')}>
        <Body size={13} color={sec} style={{ lineHeight: 20 }}>
          {!diffuse ? t(trimester === 1 ? 'sw1_pa_hydT1' : trimester === 2 ? 'sw1_pa_hydT2' : 'sw1_pa_hydT3') : trimester === 1
            ? 'Water helps with morning sickness — sip slowly and keep a bottle by the bed.'
            : trimester === 2
            ? 'Blood volume rises ~50%. 2.3L (about 8 glasses) supports that and keeps swelling down.'
            : '3rd trimester: dehydration can trigger early contractions. Aim for pale-yellow urine and watch for dizziness.'}
        </Body>
      </PaperCard>

      <PaperCard title={t('sw1_pa_smartSip')}>
        <View style={{ gap: 8 }}>
          {[
            t('sw1_pa_tip1'),
            t('sw1_pa_tip2'),
            t('sw1_pa_tip3'),
            t('sw1_pa_tip4'),
            t('sw1_pa_tip5'),
          ].map((tip, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: diffuse ? accent : colors.text,
                  marginTop: 7,
                }}
              />
              <Text style={{ flex: 1, fontSize: 13, lineHeight: 20, color: sec, fontFamily: df?.body ?? font.bodyMedium }}>
                {tip}
              </Text>
            </View>
          ))}
        </View>
      </PaperCard>
    </>
  )
}

function MiniInfoTile({
  label, value, caption, tint, accent,
}: {
  label: string
  value: string
  caption: string
  tint: string
  accent: string
}) {
  const { colors, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  return (
    <View
      style={diffuse
        ? {
            flex: 1,
            backgroundColor: dt.colors.surface,
            borderWidth: 1,
            borderColor: dt.colors.line,
            borderRadius: 18,
            paddingVertical: 14,
            paddingHorizontal: 12,
          }
        : { flex: 1, gap: 2 }}
    >
      <Text
        style={diffuse
          ? { fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', color: dt.colors.ink3, fontFamily: diffuseFont.mono }
          : { fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.textSecondary, fontFamily: MONO }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: diffuse ? 22 : 26,
          color: diffuse ? dt.colors.ink : colors.text,
          fontFamily: diffuse ? diffuseFont.display : font.displayBold,
          letterSpacing: diffuse ? -0.3 : -0.5,
          marginTop: diffuse ? 4 : 0,
        }}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text
        style={diffuse
          ? { fontSize: 9, color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 3 }
          : { fontSize: 11, color: colors.textSecondary, fontFamily: font.body }}
        numberOfLines={1}
      >
        {caption}
      </Text>
    </View>
  )
}

function NutritionDetail({ nutritionMatrix, trimester, weekNumber, accentColor, accentTint }: DetailProps & { accentColor?: string; accentTint?: string }) {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const dAccent = getDiffuseAccent('preg', dt.isDark)
  const ink = diffuse ? dt.colors.ink : colors.text
  const sec = diffuse ? dt.colors.ink2 : colors.textSecondary
  const muted = diffuse ? dt.colors.ink3 : colors.textMuted
  const { t } = useTranslation()
  if (!nutritionMatrix) {
    return (
      <PaperCard>
        {diffuse ? (
          <Body size={13} color={muted}>
            {t('preg_analytics_nutritionLoading')}
          </Body>
        ) : (
          <SkeletonLines lines={3} />
        )}
      </PaperCard>
    )
  }
  const { iron, folic, protein, calcium, dates } = nutritionMatrix
  const nutrients = [
    { key: 'iron',    label: t('sw1_pa_iron'),    arr: iron,    color: stickers.coral, soft: stickers.peachSoft },
    { key: 'folic',   label: t('sw1_pa_folic'),   arr: folic,   color: stickers.green, soft: stickers.greenSoft },
    { key: 'protein', label: t('sw1_pa_protein'), arr: protein, color: stickers.peach, soft: stickers.peachSoft },
    { key: 'calcium', label: t('sw1_pa_calcium'), arr: calcium, color: stickers.blue,  soft: stickers.blueSoft },
  ]

  return (
    <>
      <StatTilesRow
        items={nutrients.slice(0, 3).map((n) => {
          const hits = n.arr.filter(Boolean).length
          return { label: n.label, value: `${hits}/${n.arr.length}` }
        })}
      />

      <PaperCard title={t('sw1_pa_dailyChecklist')}>
        <View style={{ gap: 12 }}>
          {nutrients.map((n) => (
            <View key={n.key}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: ink, fontSize: 13, fontFamily: diffuse ? diffuseFont.body : font.bodyMedium }}>{n.label}</Text>
                <Text style={{ color: muted, fontSize: 12, fontFamily: diffuse ? diffuseFont.mono : font.body }}>
                  {t('sw1_pa_hitOfDays', { hit: n.arr.filter(Boolean).length, total: n.arr.length })}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {n.arr.map((hit, i) => (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: 18,
                      borderRadius: diffuse ? 4 : 5,
                      backgroundColor: diffuse ? (hit ? dAccent : dt.colors.line) : (hit ? n.soft : colors.border),
                      borderWidth: !diffuse && hit ? 1.5 : 0,
                      borderColor: colors.text,
                    }}
                  />
                ))}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                {dates.map((d, i) => (
                  <Text
                    key={i}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      color: muted,
                      fontSize: 9,
                      fontFamily: diffuse ? diffuseFont.mono : font.bodyMedium,
                    }}
                  >
                    {shortDay(d)}
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </View>
      </PaperCard>

      <PaperCard title={t('preg_analytics_card_trimesterFocus')}>
        <Body size={13} color={sec} style={{ lineHeight: 20 }}>
          {!diffuse ? t(trimester === 1 ? 'sw1_pa_nutT1' : trimester === 2 ? 'sw1_pa_nutT2' : 'sw1_pa_nutT3') : trimester === 1
            ? 'Folic acid is the headline — 400–600 mcg/day reduces neural tube risk. If nausea blocks meals, small bland snacks count.'
            : trimester === 2
            ? 'Iron rises in importance as blood volume grows. Pair iron-rich foods with vitamin C for absorption.'
            : 'Protein and calcium peak now — baby is laying down bone and muscle. Aim for ~75g protein and ~1000mg calcium daily.'}
        </Body>
      </PaperCard>
    </>
  )
}

function ExerciseDetail({ exerciseHistory, trimester, weekNumber, accentColor, accentTint }: DetailProps & { accentColor?: string; accentTint?: string }) {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const { t } = useTranslation()
  const minutes = exerciseHistory.map((e) => e.minutes).filter((n) => n > 0)
  const labels = exerciseHistory.map((e) => shortDay(e.date))
  const total = minutes.reduce((a, b) => a + b, 0)
  const avg = minutes.length > 0 ? Math.round(total / minutes.length) : 0
  const activeDays = minutes.length

  return (
    <>
      <StatTilesRow
        tint={accentTint}
        color={accentColor}
        items={[
          { label: t('sw1_pa_activeDays'), value: String(activeDays) },
          { label: t('sw1_pa_totalMin'), value: String(total) },
          { label: diffuse ? 'Avg / session' : t('sw1_pa_avgActiveDay'), value: avg ? `${avg}m` : '—' },
        ]}
      />

      <PaperCard title={diffuse ? 'Minutes per session' : t('pregAnalytics_minutesPerActiveDay')}>
        {minutes.length > 0 ? (
          diffuse ? (
            <PetalBurst data={minutes} color={stickers.coral} color2={stickers.peach} centerLabel={String(activeDays)} />
          ) : (
            <SiteBars
              data={exerciseHistory.filter((e) => e.minutes > 0).map((e) => e.minutes)}
              labels={barDayLabels(exerciseHistory.filter((e) => e.minutes > 0).map((e) => e.date))}
              tone={stickers.peachSoft}
              unit="m"
              caption={t('pregAnalytics_minutesPerActiveDay')}
            />
          )
        ) : (
          <Body size={13} color={colors.textMuted}>
            {t('preg_analytics_noExerciseLogs')}
          </Body>
        )}
      </PaperCard>

      <PaperCard title={diffuse ? 'Safe movement target' : t('sw1_pa_movementGuide')}>
        <Body size={13} color={colors.textSecondary} style={{ lineHeight: 20 }}>
          {!diffuse ? t(trimester === 1 ? 'sw1_pa_exT1' : trimester === 2 ? 'sw1_pa_exT2' : 'sw1_pa_exT3') : (
            <>
              {'ACOG recommends 150 minutes of moderate movement per week (≈30 min × 5 days). '}
              {trimester === 1
                ? 'Energy can dip — short walks count.'
                : trimester === 2
                ? 'You may feel best now — swimming, prenatal yoga and walking are gold.'
                : 'Listen to your body. Pelvic-floor work and breath-led movement help prepare for labor.'}
            </>
          )}
        </Body>
      </PaperCard>
    </>
  )
}

function ContractionsDetail({ contractions, trimester, weekNumber, accentColor, accentTint }: DetailProps & { accentColor?: string; accentTint?: string }) {
  const { colors, stickers, font } = useTheme()
  const { t } = useTranslation()
  const totalToday = contractions.length > 0 ? contractions[contractions.length - 1].count : 0
  const interval = contractions.length > 0 ? contractions[contractions.length - 1].avgIntervalMin : null
  const sessions = contractions.length

  return (
    <>
      <StatTilesRow
        tint={accentTint}
        color={accentColor}
        items={[
          { label: t('sw1_pa_sessions'), value: String(sessions) },
          { label: t('sw1_pa_lastCount'), value: totalToday ? String(totalToday) : '—' },
          { label: t('sw1_pa_avgInterval'), value: interval ? t('sw1_pa_nMin', { n: Math.round(interval) }) : '—' },
        ]}
      />

      <PaperCard title={t('sw1_pa_recentContractions')}>
        {sessions > 0 ? (
          <View style={{ gap: 8 }}>
            {contractions.slice(-7).reverse().map((c) => (
              <View key={c.date} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.textMuted, fontSize: 13, fontFamily: font.bodyMedium }}>
                  {c.date}
                </Text>
                <Text style={{ color: colors.text, fontSize: 13, fontFamily: font.bodySemiBold }}>
                  {c.avgIntervalMin ? t('sw1_pa_contrRow', { count: c.count, min: Math.round(c.avgIntervalMin) }) : t('sw1_pa_contrRowNone', { count: c.count })}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Body size={13} color={colors.textMuted}>
            {t('preg_analytics_noContractionsYet')}
          </Body>
        )}
      </PaperCard>

      <PaperCard title={t('sw1_bg_warning_sub')}>
        <Body size={13} color={colors.textSecondary} style={{ lineHeight: 20 }}>
          {t('sw1_pa_c511Pre')}<Body size={13} color={colors.text}>{t('preg_analytics_511_rule')}</Body>{t('sw1_pa_c511Post')}
        </Body>
      </PaperCard>
    </>
  )
}

/** Light look: the next concrete prep step, from the first thing not started. */
// Where each readiness row leads: plan + bag live on the birth-plan page.
const BIRTH_BUCKET_ROUTE: Record<string, string> = {
  plan: '/birth-plan',
  bag: '/birth-plan',
  exams: '/exams?behavior=pregnancy',
  card: '/profile/emergency-insurance',
}

function birthNextStep(b: BirthReadiness, trimester: 1 | 2 | 3): string {
  if (!b.emergencyCardComplete) return tNow('kp_pa_next1')
  if (b.birthPlanCount === 0) return tNow('kp_pa_next2')
  if (b.nestingCount === 0) return trimester === 3 ? tNow('kp_pa_next3a') : tNow('kp_pa_next3b')
  return tNow('kp_pa_next4')
}

function BirthDetail({ birthReady, weekNumber, trimester, accentColor, accentTint, onClose }: DetailProps & { accentColor?: string; accentTint?: string }) {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const { t } = useTranslation()
  if (!birthReady) {
    return (
      <PaperCard>
        {diffuse ? (
          <Body size={13} color={colors.textMuted}>{t('preg_analytics_loading_birth')}</Body>
        ) : (
          <SkeletonLines lines={3} />
        )}
      </PaperCard>
    )
  }
  const buckets = [
    {
      id: 'plan',
      label: tNow('kp_pa_bPlan'),
      value: birthReady.birthPlanCount,
      target: 5,
      color: stickers.lilac,
      tint: stickers.lilacSoft,
    },
    {
      id: 'bag',
      label: tNow('kp_pa_bBag'),
      value: birthReady.nestingCount,
      target: 8,
      color: stickers.coral,
      tint: stickers.peachSoft,
    },
    {
      id: 'exams',
      label: tNow('kp_pa_bExams'),
      value: birthReady.examDocs,
      target: 4,
      color: stickers.green,
      tint: stickers.greenSoft,
    },
    {
      id: 'card',
      label: tNow('kp_pa_bCard'),
      value: birthReady.emergencyCardComplete ? 1 : 0,
      target: 1,
      color: stickers.pink,
      tint: stickers.pinkSoft,
    },
  ]

  return (
    <>
      {diffuse ? (
        <View style={[styles.scoreHero, { backgroundColor: stickers.blueSoft, borderColor: 'rgba(20,19,19,0.12)' }]}>
          <Text style={{ color: colors.text, fontSize: 56, fontFamily: font.display, letterSpacing: -1 }}>
            {birthReady.pct}%
          </Text>
          <Body size={13} color={colors.textSecondary}>{t('preg_analytics_birth_readiness_5buckets')}</Body>
        </View>
      ) : null /* light: no readiness % — the list below says what's done */}

      <PaperCard title={tNow('kp_pa_whatsReady')}>
        {diffuse ? (
          // Checkpoint fill pills — each item fills; complete = green ✓.
          <CheckpointPills
            color={accentColor ?? stickers.peach}
            doneColor={stickers.green}
            rows={buckets.map((b) => ({ label: b.label, done: Math.max(0, Math.min(1, b.value / b.target)) } as CheckRow))}
          />
        ) : (
          <View style={{ gap: 4 }}>
            {buckets.map((b) => (
              <Pressable
                key={b.label}
                accessibilityRole="button"
                accessibilityLabel={b.label}
                onPress={() => {
                  // Close the sheet first so the next screen isn't hidden under the modal.
                  onClose()
                  afterSheets(() => router.push(BIRTH_BUCKET_ROUTE[b.id] as never))
                }}
                style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }, pressed && { opacity: 0.6 }]}
              >
                <Text style={{ flex: 1, color: colors.text, fontSize: 14, fontFamily: font.bodySemiBold }}>
                  {b.label}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 14, fontFamily: font.body }}>
                  {b.id === 'card' ? (b.value ? tNow('kp_pa_set') : tNow('kp_pa_notSet')) : b.id === 'exams' ? tNow('kp_pa_nOnFile', { n: b.value }) : tNow('kp_pa_nDone', { n: b.value })}
                </Text>
                <ChevronRight size={16} color={colors.text} strokeWidth={2.2} />
              </Pressable>
            ))}
          </View>
        )}
      </PaperCard>

      <PaperCard title={tNow('kp_pa_nextStepTitle')}>
        <Body size={13} color={colors.textSecondary} style={{ lineHeight: 20 }}>
          {!diffuse ? birthNextStep(birthReady, trimester) : birthReady.pct >= 80
            ? 'You\'re in great shape. Confirm car-seat installation and put a printed birth plan in the bag.'
            : birthReady.pct >= 50
            ? trimester === 3
              ? 'Pack the hospital bag now if you haven\'t — many people deliver 1–2 weeks before the due date.'
              : 'Build the birth plan now while there\'s time. Add hospital docs to the vault as you collect them.'
            : 'Start with the emergency card — blood type, allergies, and a primary contact. It takes 2 minutes.'}
        </Body>
      </PaperCard>
    </>
  )
}

// ─── Score info modal ──────────────────────────────────────────────────────

function ScoreInfoModal({
  visible, onClose, wellbeing, weekFacts, weekNumber, trimester,
}: {
  visible: boolean
  onClose: () => void
  wellbeing: PregnancyWellbeingScore | null
  /** Light UI hero: this week's log count (not a score). */
  weekFacts: PregnancyWeekFacts
  weekNumber: number
  trimester: 1 | 2 | 3
}) {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()

  const PILLAR_EXPLAIN: { key: keyof PregnancyWellbeingScore; label: string; body: string; color: string }[] = [
    { key: 'sleep',     label: 'Sleep',     color: stickers.lilac, body: 'Hours / 9 × 10. Naps count toward total in 3rd trimester.' },
    { key: 'mood',      label: 'Mood',      color: stickers.pink,  body: 'Share of positive entries (happy / radiant / energetic / okay).' },
    { key: 'nutrition', label: 'Nutrition', color: stickers.green, body: 'Days with at least one nutrition log / 7. Variety adds bonus.' },
    { key: 'exercise',  label: 'Movement',  color: stickers.coral, body: 'Days with movement / 7 (×2 because the target is moderate).' },
    { key: 'hydration', label: 'Hydration', color: stickers.blue,  body: 'Avg glasses / 8 × 10, capped at 10.' },
  ]

  const SCORE_BANDS = [
    { range: '85 – 100', label: 'Thriving',         color: stickers.green },
    { range: '70 – 84',  label: 'Good',             color: stickers.blue },
    { range: '50 – 69',  label: 'Fair',             color: stickers.yellow },
    { range: '30 – 49',  label: 'Needs care',       color: stickers.peach },
    { range: '0 – 29',   label: 'Reach for support', color: stickers.coral },
  ]

  if (!diffuse) {
    // Light UI: what each area COUNTS — no score, no grade bands, no per-pillar
    // number (see docs/compliance/2026-11-02-regras-saude.md).
    const AREA_COUNTS: { key: PregnancyWeekArea; label: string; sticker: SiteStickerName; body: string }[] = [
      { key: 'sleep',     label: t('preg_analytics_pillar_sleep'),     sticker: WELLBEING_STICKER.sleep,     body: t('preg_week_guideSleep') },
      { key: 'mood',      label: t('preg_analytics_pillar_mood'),      sticker: WELLBEING_STICKER.mood,      body: t('preg_week_guideMood') },
      { key: 'nutrition', label: t('preg_analytics_pillar_nutrition'), sticker: WELLBEING_STICKER.nutrition, body: t('preg_week_guideNutrition') },
      { key: 'movement',  label: t('sw1_pa_movement'),                 sticker: WELLBEING_STICKER.exercise,  body: t('preg_week_guideMovement') },
      { key: 'water',     label: t('preg_analytics_pillar_hydration'), sticker: WELLBEING_STICKER.hydration, body: t('preg_week_guideWater') },
    ]
    return (
      <LightSheet visible={visible} onClose={onClose} height={SCREEN_H * 0.86}>
        <View style={{ paddingHorizontal: 20 }}>
          <DetailSheetHeader
            title={t('kids_analytics_guide_title')}
            sticker="flower"
            tone={stickers.greenSoft}
            onClose={onClose}
          />
          <Text style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.textSecondary }}>
            {tNow('kp_pa_weekN', { n: weekNumber })}{' · '}{trimesterLabel(trimester)}
          </Text>
        </View>
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: insets.bottom + 28, gap: 18 }}
        >
          {weekFacts.logCount > 0 && (
            <View>
              <Text style={{ color: colors.text, fontSize: 52, lineHeight: 58, fontFamily: font.displayBold, letterSpacing: -1.5 }}>
                {weekFacts.logCount}
              </Text>
              <Text style={[styles.siteMono, { color: colors.textSecondary }]}>
                {t('kids_analytics_logs_week')}{' · '}{t('preg_week_daysLogged', { days: weekFacts.daysLogged, total: weekFacts.days })}
              </Text>
            </View>
          )}

          <PaperCard title={t('kids_analytics_guide_areas_label')}>
            <View style={{ gap: 16 }}>
              {AREA_COUNTS.map((p) => (
                <View key={p.key} style={{ flexDirection: 'row', gap: 12 }}>
                  <SiteSticker name={p.sticker} size={30} cut />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 14, fontFamily: font.bodyBold, marginBottom: 3 }}>
                      {p.label}
                    </Text>
                    <Body size={13} color={colors.textSecondary}>{p.body}</Body>
                  </View>
                </View>
              ))}
            </View>
          </PaperCard>

          <PaperCard title={trimesterLabel(trimester)}>
            <Body size={13} color={colors.textSecondary} style={{ lineHeight: 20 }}>
              {t(trimester === 1 ? 'sw1_pa_guideT1' : trimester === 2 ? 'sw1_pa_guideT2' : 'sw1_pa_guideT3')}
            </Body>
          </PaperCard>
        </ScrollView>
      </LightSheet>
    )
  }

  return (
    <Modal visible={visible} transparent animationType={diffuse ? 'slide' : 'fade'} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.modalSheet,
            { height: SCREEN_H * 0.85, backgroundColor: colors.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32 },
          ]}
        >
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>

          <View style={[styles.modalHeader, { paddingBottom: 14 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <View
                style={{
                  width: 44, height: 44, borderRadius: 999,
                  backgroundColor: stickers.greenSoft,
                  borderWidth: 1, borderColor: 'rgba(20,19,19,0.12)',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Sparkle size={22} fill={stickers.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontFamily: font.display, fontSize: 24, letterSpacing: -0.4 }}>
                  {'Wellbeing score guide'}
                </Text>
                <Text style={{ color: stickers.green, fontSize: 13, fontFamily: font.bodyMedium, marginTop: 2 }}>
                  {tNow('kp_pa_weekN', { n: weekNumber })}{' · '}{trimesterLabel(trimester).toLowerCase()}
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
              <X size={14} color={colors.text} strokeWidth={2} />
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
            {wellbeing && (
              <View style={[styles.scoreHero, { backgroundColor: stickers.greenSoft, borderColor: 'rgba(20,19,19,0.12)' }]}>
                <Text style={{ color: colors.text, fontSize: 48, fontFamily: font.display }}>
                  {wellbeing.overall}%
                </Text>
                <Body size={13} color={colors.textSecondary}>{t('preg_analytics_your_score_last7')}</Body>
              </View>
            )}

            <PaperCard title="Score scale">
              <View style={{ gap: 10 }}>
                {SCORE_BANDS.map((b) => (
                  <View key={b.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: b.color }} />
                    <Text style={{ flex: 1, color: colors.text, fontSize: 14, fontFamily: font.bodyMedium }}>
                      {b.label}
                    </Text>
                    <Text style={{ fontFamily: 'HankenGrotesk_400Regular', color: colors.textMuted, fontSize: 13 }}>{b.range}</Text>
                  </View>
                ))}
              </View>
            </PaperCard>

            <PaperCard title="How each pillar is scored">
              <View style={{ gap: 14 }}>
                {PILLAR_EXPLAIN.map((p) => (
                  <View key={p.key}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: p.color + '22', alignItems: 'center', justifyContent: 'center' }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: p.color }} />
                      </View>
                      <Text style={{ flex: 1, color: colors.text, fontSize: 14, fontFamily: font.bodySemiBold }}>
                        {p.label}
                      </Text>
                      {wellbeing && (
                        <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: p.color + '22' }}>
                          <Text style={{ color: p.color, fontSize: 12, fontFamily: font.bodySemiBold }}>
                            {nf(wellbeing[p.key] as number, 1)}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Body size={13} color={colors.textSecondary}>{p.body}</Body>
                  </View>
                ))}
              </View>
            </PaperCard>

            <View style={[styles.scoreBanner, { backgroundColor: stickers.lilacSoft, borderColor: 'rgba(20,19,19,0.12)' }]}>
              <Text style={{ color: colors.text, fontSize: 15, fontFamily: font.bodySemiBold, marginBottom: 4 }}>
                {trimesterLabel(trimester)}
              </Text>
              <Body size={13} color={colors.textSecondary}>
                {trimester === 1
                  ? 'Many people log fewer entries early — it\'s ok if your score is rough now. Folic acid + sleep are the priorities.'
                  : trimester === 2
                  ? 'The honeymoon trimester — energy up, nausea down. Movement and balanced meals matter most here.'
                  : 'Pack the bag, plan support, and protect sleep. Steady wins now beat heroic stretches.'}
              </Body>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

// ─── Reusable bits ─────────────────────────────────────────────────────────

/** Diffuse-only big-score hero (soft field + serif number + mono caption). */
function ScoreHero({ value, caption }: { value: string; caption: string }) {
  const dt = useDiffuseTheme()
  return (
    <DiffuseFieldSurface
      mode="preg"
      isDark={dt.isDark}
      radius={24}
      style={[styles.scoreHero, { borderWidth: 1, borderColor: dt.colors.line }]}
    >
      <Text style={{ color: dt.colors.ink, fontSize: 56, fontFamily: diffuseFont.display, letterSpacing: -1 }}>
        {value}
      </Text>
      <Text style={{ color: dt.colors.ink3, fontSize: 10, fontFamily: diffuseFont.mono, letterSpacing: 1, textTransform: 'uppercase' }}>
        {caption}
      </Text>
    </DiffuseFieldSurface>
  )
}

function PaperCard({
  title, children, accent, withBlob,
}: {
  title?: string
  children: React.ReactNode
  accent?: string
  withBlob?: boolean
}) {
  const { colors, font, stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const blobColor = accent ?? stickers.lilac

  // Light (site look): no box — a hairline rule, a mono eyebrow, content on the page.
  if (!diffuse) {
    return (
      <View style={{ borderTopWidth: HAIR, borderTopColor: colors.border, paddingTop: 16 }}>
        {title ? (
          <Text style={[styles.siteEyebrow, { color: colors.textSecondary }]}>{title}</Text>
        ) : null}
        {children}
      </View>
    )
  }

  return (
    <View
      style={[
        styles.paperCard,
        { backgroundColor: dt.colors.surface, borderColor: dt.colors.line },
      ]}
    >
      {title ? (
        <Text
          style={{
            fontSize: 10,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: dt.colors.ink3,
            fontFamily: diffuseFont.mono,
            marginBottom: 12,
          }}
        >
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  )
}

// Wellbeing summary row — three read-outs that answer "which pillar is
// strongest / needs watching / which trimester". Unlike DiffuseMetricTile
// (number value on top), here the value is a *word* (a pillar name), so the
// hierarchy is flipped: the category is the eyebrow on top and the answer sits
// below at a single fixed size (no per-tile shrink jitter). The two pillar
// cells carry the star chart's hue as a small dot so the row ties back to the
// graph above it.
function WellbeingCallouts({
  strongest, watch, trimester,
}: {
  strongest: { label: string; color: string }
  watch: { label: string; color: string }
  trimester: string
}) {
  const dt = useDiffuseTheme()
  const c = dt.colors
  const cells: { eyebrow: string; value: string; dot?: string }[] = [
    { eyebrow: 'Strongest', value: strongest.label, dot: strongest.color },
    { eyebrow: 'Watch',     value: watch.label,     dot: watch.color },
    { eyebrow: 'Trimester', value: trimester },
  ]
  return (
    <View style={[styles.calloutRow, { borderColor: c.line }]}>
      {cells.map((cell, i) => (
        <View
          key={cell.eyebrow}
          style={[
            styles.calloutCell,
            i < cells.length - 1 && {
              borderRightWidth: StyleSheet.hairlineWidth,
              borderRightColor: c.line,
            },
          ]}
        >
          <Text style={[styles.calloutEyebrow, { color: c.ink3 }]} numberOfLines={1}>
            {cell.eyebrow}
          </Text>
          <View style={styles.calloutValueRow}>
            {cell.dot ? <View style={[styles.calloutDot, { backgroundColor: cell.dot }]} /> : null}
            <Text
              style={[styles.calloutValue, { color: c.ink }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {cell.value}
            </Text>
          </View>
        </View>
      ))}
    </View>
  )
}

function StatTilesRow({
  items, tint, color,
}: {
  items: { label: string; value: string }[]
  tint?: string
  color?: string
}) {
  const { colors, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()

  if (diffuse) {
    // De-carded: one hairline strip split by interior dividers, value on top +
    // mono caption below — replaces three boxed DiffuseMetricTiles so the top of
    // every detail sheet reads as one considered stat row, matching the
    // de-carded sections below it.
    return (
      <View style={[styles.calloutRow, { borderColor: dt.colors.line }]}>
        {items.map((it, i) => (
          <View
            key={it.label + i}
            style={[
              styles.statStripCell,
              i < items.length - 1 && {
                borderRightWidth: StyleSheet.hairlineWidth,
                borderRightColor: dt.colors.line,
              },
            ]}
          >
            <Text
              style={[styles.statStripValue, { color: dt.colors.ink }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {it.value}
            </Text>
            <Text style={[styles.statStripLabel, { color: dt.colors.ink3 }]} numberOfLines={1}>
              {it.label}
            </Text>
          </View>
        ))}
      </View>
    )
  }

  // Light: bare number + mono caption, left-aligned — no boxes.
  return (
    <View style={styles.statRowSite}>
      {items.map((it, i) => (
        <View key={it.label + i} style={styles.statCellSite}>
          <Text
            style={[styles.statValueSite, { color: colors.text, fontFamily: font.displayBold }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {it.value}
          </Text>
          <Text style={[styles.statLabelSite, { color: colors.textSecondary }]} numberOfLines={2}>
            {it.label}
          </Text>
        </View>
      ))}
    </View>
  )
}

function WeightByWeekList({
  rows, accent, tint, unit = 'kg', toDisplay = (kg: number) => kg,
}: {
  rows: PregnancyWeightByWeek[]
  accent: string
  tint: string
  unit?: string
  toDisplay?: (kg: number) => number
}) {
  const { colors, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  if (rows.length === 0) return null
  const min = Math.min(...rows.map((r) => r.weight))
  const max = Math.max(...rows.map((r) => r.weight))
  const range = Math.max(0.1, max - min)
  const track = diffuse ? dt.colors.line : colors.border
  return (
    <View style={{ gap: 10 }}>
      {rows.map((w, i) => {
        const pct = ((w.weight - min) / range) * 100
        return (
          <View
            key={w.week + '-' + w.weight + '-' + i}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <View
              style={{
                width: diffuse ? 60 : 40,
                paddingVertical: diffuse ? 4 : 0,
                paddingHorizontal: diffuse ? 10 : 0,
                borderRadius: 999,
                backgroundColor: 'transparent',
                borderWidth: diffuse ? 1 : 0,
                borderColor: dt.colors.line2,
                alignItems: diffuse ? 'center' : 'flex-start',
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  color: diffuse ? dt.colors.ink3 : colors.textSecondary,
                  fontFamily: diffuse ? diffuseFont.mono : MONO,
                  letterSpacing: diffuse ? 0.4 : 1.2,
                }}
              >
                {t('sw1_pa_weekShort', { n: w.week })}
              </Text>
            </View>
            <View style={{ flex: 1, height: 6, borderRadius: 999, backgroundColor: track, overflow: 'hidden' }}>
              <View
                style={{
                  width: `${Math.max(8, pct)}%`,
                  height: '100%',
                  backgroundColor: diffuse ? accent : tint,
                  borderRadius: 999,
                  borderWidth: diffuse ? 0 : 1,
                  borderColor: colors.text,
                }}
              />
            </View>
            <Text
              style={{
                color: diffuse ? dt.colors.ink : colors.text,
                fontSize: 13,
                fontFamily: diffuse ? diffuseFont.monoBold : font.bodySemiBold,
                minWidth: 56,
                textAlign: 'right',
              }}
            >
              {nf(toDisplay(w.weight), 1)}{' ' + unit}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

function Pill({ color, tint, label }: { color: string; tint: string; label: string }) {
  const { colors, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  if (diffuse) {
    return (
      <View
        style={{
          alignSelf: 'flex-start',
          marginTop: 12,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: dt.colors.line2,
        }}
      >
        <Text style={{ color: dt.colors.ink3, fontSize: 10, fontFamily: diffuseFont.mono, letterSpacing: 0.8, textTransform: 'uppercase' }}>{label}</Text>
      </View>
    )
  }
  // Light: soft tone fill + ink outline + ink label.
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        marginTop: 12,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: tint,
        borderWidth: 1.5,
        borderColor: colors.text,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 12, fontFamily: font.bodyBold }}>{label}</Text>
    </View>
  )
}

function TrimesterTip({
  trimester, kind, weekNumber,
}: { trimester: 1 | 2 | 3; kind: PillarKey; weekNumber: number }) {
  const { colors } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const tip = trimesterCopy(kind, trimester, weekNumber)
  if (!tip) return null

  // Diffuse: a de-carded footnote — hairline rule + mono eyebrow + text on the
  // page — so it matches the "How it's computed" note it follows instead of
  // reintroducing a white box at the bottom of the sheet.
  if (diffuse) {
    return (
      <View style={{ marginTop: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: dt.colors.line, paddingTop: 16 }}>
        <Text style={[styles.diffuseEyebrow, { color: dt.colors.ink3 }]}>{`Trimester ${trimester} note`}</Text>
        <Body size={13} color={dt.colors.ink2} style={{ lineHeight: 20 }}>
          {tip}
        </Body>
      </View>
    )
  }

  // Light: same tip, minus "normal" claims and score talk.
  const lightTip = trimesterCopy(kind, trimester, weekNumber, true) ?? tip
  return (
    <PaperCard title={t('sw1_pa_triNote', { n: trimester })}>
      <Body size={13} color={colors.textSecondary} style={{ lineHeight: 20 }}>
        {lightTip}
      </Body>
    </PaperCard>
  )
}

/**
 * `light` = the light UI's wording: no "is normal" claims and no talk of a
 * score (see docs/compliance/2026-11-02-regras-saude.md). Diffuse keeps the
 * original copy.
 */
function lightTipKey(kind: PillarKey, t: 1 | 2 | 3, week: number): TranslationKey | null {
  if (kind === 'kicks') return week < 18 ? 'sw1_pa_kickT1' : week < 28 ? 'sw1_pa_kickT2' : 'sw1_pa_kickT3'
  if (kind === 'sleep') return t === 1 ? 'sw1_pa_slT1' : t === 2 ? 'sw1_pa_slT2' : 'sw1_pa_slT3'
  if (kind === 'mood') return t === 1 ? 'sw1_pa_moT1' : t === 2 ? 'sw1_pa_moT2' : 'sw1_pa_moT3'
  if (kind === 'symptoms') return t === 1 ? 'sw1_pa_syT1' : t === 2 ? 'sw1_pa_syT2' : 'sw1_pa_syT3'
  if (kind === 'wellbeing') return t === 1 ? 'sw1_pa_wbT1' : t === 2 ? 'sw1_pa_wbT2' : 'sw1_pa_wbT3'
  return null
}

function trimesterCopy(kind: PillarKey, t: 1 | 2 | 3, week: number, light = false): string | null {
  if (light) {
    const lk = lightTipKey(kind, t, week)
    if (lk) return tNow(lk)
  }
  if (kind === 'kicks') {
    if (week < 18) return light
      ? 'Most people first feel quickening between week 16–22. Many feel it earlier in a second pregnancy.'
      : 'Most people first feel quickening between week 16–22. Earlier is normal in second pregnancies.'
    if (week < 28) return 'Movements are getting stronger — patterns aren\'t reliable yet. Don\'t panic if a day feels quiet.'
    return 'Track at the same time daily — usually after a meal in the evening when baby is most active.'
  }
  if (kind === 'sleep') {
    if (t === 1) return 'Fatigue peaks early. A 20-minute nap counts. Avoid lying flat right after meals to ease reflux.'
    if (t === 2) return 'Sleep often improves now. Side-sleeping (left preferred) supports placental blood flow.'
    return 'Use a body pillow. Empty the bladder right before bed, keep water nearby for the inevitable wake-ups.'
  }
  if (kind === 'mood') {
    if (t === 1) return 'Hormones spike fast. Mood swings now don\'t predict postpartum mood — just ride it.'
    if (t === 2) return 'Energy returning. If anxiety persists or joy feels flat for 2+ weeks, mention it at your next visit.'
    return light
      ? 'Feeling anxious before the birth is common. A short walk + 10 min of breathwork shifts more than you\'d think.'
      : 'Anticipatory anxiety is normal. A short walk + 10 min of breathwork shifts more than you\'d think.'
  }
  if (kind === 'symptoms') {
    if (t === 1) return 'Nausea, breast tenderness, fatigue and headaches dominate. Most ease by week 12–14.'
    if (t === 2) return 'New: round-ligament pinch, mild swelling, leg cramps. Sharp persistent pain warrants a call.'
    return 'Heartburn, swelling, hip pain and Braxton Hicks pick up. Sudden severe headache or vision change → call now.'
  }
  if (kind === 'wellbeing') {
    if (light) {
      if (t === 1) return 'Goal: any logging at all. Early weeks are a lot — focus on folic acid, water, and sleep.'
      if (t === 2) return 'Best window to build habits. Movement and varied meals are worth a little time right now.'
    }
    if (t === 1) return 'Goal: any logging at all. The score is rough early — focus on folic acid, water, and sleep.'
    if (t === 2) return 'Best window to build habits. Movement and varied meals lift the score fastest right now.'
    return 'Protect sleep aggressively. Lower the movement target if needed; rest is part of the work.'
  }
  return null
}

// ─── Takeaway computation ──────────────────────────────────────────────────

interface Takeaway {
  headline: string
  takeaway?: string
  pct?: number
  trend?: string
}

function buildTakeaways(args: {
  weightHistory: { date: string; weight: number }[]
  kickSessions: { date: string; kicks: number }[]
  sleepHistory: { date: string; hours: number }[]
  moodTrend: { log_date: string; value: string | null }[]
  symptomFreq: { symptom: string; count: number }[]
  hydrationHistory: { date: string; glasses: number }[]
  exerciseHistory: PregnancyExerciseEntry[]
  contractions: PregnancyContractionSession[]
  weekFacts: PregnancyWeekFacts
  nutritionMatrix: { iron: boolean[]; folic: boolean[]; protein: boolean[]; calcium: boolean[]; dates: string[] } | null | undefined
  birthReady: BirthReadiness | null | undefined
  trimester: 1 | 2 | 3
  weightUnit: import('../../store/useUnitsStore').WeightUnit
}): Record<PillarKey, Takeaway> {
  const {
    weightHistory, kickSessions, sleepHistory, moodTrend, symptomFreq,
    hydrationHistory, exerciseHistory, contractions, weekFacts, nutritionMatrix, birthReady,
    weightUnit,
  } = args
  const wLabel = weightLabel(weightUnit)

  // Weight
  const weights = weightHistory.map((e) => e.weight).filter((w) => w > 0)
  const lastW = weights[weights.length - 1]
  const firstW = weights[0]
  const weeklyGain = firstW && lastW && weights.length > 1 ? (lastW - firstW) / (weights.length - 1) : null

  // Kicks
  const avgKicks = kickSessions.length > 0
    ? Math.round(kickSessions.reduce((a, b) => a + b.kicks, 0) / kickSessions.length)
    : 0

  // Sleep
  const sleepHrs = sleepHistory.map((s) => s.hours)
  const avgSleep = sleepHrs.length > 0 ? sleepHrs.reduce((a, b) => a + b, 0) / sleepHrs.length : 0

  // Mood
  const positive = ['happy', 'radiant', 'energetic', 'okay']
  const positivePct = moodTrend.length > 0
    ? Math.round((moodTrend.filter((m) => positive.includes(m.value ?? '')).length / moodTrend.length) * 100)
    : 0

  // Symptoms
  const symptomTotal = symptomFreq.reduce((a, b) => a + b.count, 0)

  // Hydration
  const hydAvg = hydrationHistory.length > 0
    ? hydrationHistory.reduce((a, b) => a + b.glasses, 0) / hydrationHistory.length
    : 0

  // Nutrition: % of nutrient-days hit across 4 nutrients
  const nutHit = nutritionMatrix
    ? [
        ...nutritionMatrix.iron, ...nutritionMatrix.folic,
        ...nutritionMatrix.protein, ...nutritionMatrix.calcium,
      ]
    : []
  const nutPct = nutHit.length > 0
    ? Math.round((nutHit.filter(Boolean).length / nutHit.length) * 100)
    : 0

  // Exercise: active days / 7 (target)
  const exMinutes = exerciseHistory.reduce((a, b) => a + b.minutes, 0)
  const exDays = exerciseHistory.filter((e) => e.minutes > 0).length

  return {
    // No composite score here (it read as a health grade): a count of this
    // week's logs, and pct = share of days with a log ("how much", not "how well").
    wellbeing: weekFacts.logCount > 0
      ? {
          headline: String(weekFacts.logCount),
          pct: weekCoveragePct(weekFacts),
          takeaway: `${weekFacts.daysLogged} of ${weekFacts.days} days with a log.`,
        }
      : { headline: '—', pct: 0, takeaway: 'Log a few days to see your week.' },
    weight: {
      headline: lastW ? `${nf(kgToDisplay(lastW, weightUnit), 1)} ${wLabel}` : '—',
      takeaway: weeklyGain !== null
        ? `${weeklyGain >= 0 ? '+' : ''}${nf(kgToDisplay(weeklyGain, weightUnit), 2)} ${wLabel}/wk on average`
        : 'Log weight weekly to track trend.',
      pct: weights.length > 0 ? Math.min(100, weights.length * 10) : 0,
      trend: weeklyGain !== null
        ? weeklyGain > 0 ? '↑' : weeklyGain < 0 ? '↓' : '→'
        : undefined,
    },
    kicks: {
      headline: avgKicks ? String(avgKicks) : '—',
      takeaway: avgKicks > 0 ? `${kickSessions.length} sessions in 2 weeks` : 'Log a kick session in a quiet moment.',
      pct: kickSessions.length > 0 ? Math.min(100, (kickSessions.length / 14) * 100) : 0,
    },
    sleep: {
      headline: avgSleep ? `${nf(avgSleep, 1)}h` : '—',
      takeaway: avgSleep >= 7 ? 'Hitting the 7–9h window.' : avgSleep > 0 ? 'Below 7h — try an afternoon rest.' : 'Log a few nights to see your sleep.',
      pct: avgSleep ? Math.min(100, (avgSleep / 9) * 100) : 0,
    },
    mood: {
      headline: moodTrend.length ? `${positivePct}%` : '—',
      takeaway: moodTrend.length > 0 ? `${moodTrend.length} mood entries` : 'Tag a mood today to start the trend.',
      pct: positivePct,
    },
    symptoms: {
      headline: symptomTotal ? `${symptomTotal}` : 'None',
      takeaway: symptomFreq[0] ? `Most common: ${symptomFreq[0].symptom}` : 'Quiet week — log if any pop up.',
      pct: symptomFreq.length > 0 ? Math.min(100, symptomFreq.length * 20) : 0,
    },
    hydration: {
      headline: hydAvg ? `${nf(hydAvg, 1)}` : '—',
      takeaway: hydAvg >= 8 ? 'Hitting the 8 glasses target.' : hydAvg > 0 ? 'Aim for 8 glasses — sip early.' : 'Tap water in the calendar to log.',
      pct: hydAvg ? Math.min(100, (hydAvg / 8) * 100) : 0,
    },
    nutrition: {
      headline: `${nutPct}%`,
      takeaway: nutPct >= 70 ? 'Strong nutrient coverage.' : nutPct > 0 ? 'Add iron + folic on missed days.' : 'Tag nutrients in your meal logs.',
      pct: nutPct,
    },
    exercise: {
      headline: exDays > 0 ? `${exDays} day${exDays === 1 ? '' : 's'}` : '—',
      takeaway: exMinutes >= 150 ? 'Hit the 150 min/week guideline.' : exMinutes > 0 ? `${exMinutes} min so far this fortnight.` : 'A 20 min walk counts.',
      pct: Math.min(100, (exMinutes / 150) * 100),
    },
    contractions: {
      headline: contractions.length ? `${contractions[contractions.length - 1].count}` : '—',
      takeaway: contractions.length > 0 ? tNow(contractions.length === 1 ? 'sw1_pa_contrSessions_one' : 'sw1_pa_contrSessions_other', { count: contractions.length }) : tNow('sw1_pa_timeThem'),
      pct: contractions.length > 0 ? Math.min(100, contractions.length * 20) : 0,
    },
    birth: birthReady
      ? {
          headline: `${birthReady.pct}%`,
          takeaway: birthReady.pct >= 80 ? 'You\'re in great shape.' : birthReady.pct >= 40 ? 'Halfway there — keep stacking.' : 'Start with the emergency card.',
          pct: birthReady.pct,
        }
      : { headline: '—', takeaway: 'Loading your readiness…' },
  }
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingTop: 0 },

  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },

  // Hero week card
  hero: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 4,
    padding: 18,
    borderRadius: 26,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroChip: {
    width: 56,
    height: 56,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLabel: {
    fontSize: 10,
    letterSpacing: 1.6,
  },
  heroValue: {
    fontSize: 28,
    letterSpacing: -0.6,
    lineHeight: 32,
    marginTop: 2,
  },
  heroSub: {
    fontSize: 13,
    marginTop: 2,
  },
  heroBadge: {
    alignItems: 'center',
  },
  heroBadgeInner: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadgeNum: {
    fontSize: 24,
    lineHeight: 26,
  },
  heroBadgeT: {
    fontSize: 9,
    letterSpacing: 1.4,
    marginTop: -2,
  },

  // Pillar grid
  pillarStack: {
    paddingHorizontal: 20,
    marginTop: 14,
    gap: 12,
  },
  pillarPaper: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  pillarHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pillarChip: {
    width: 46,
    height: 46,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pillarName: {
    fontSize: 18,
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  pillarBlurb: {
    fontSize: 12,
    marginTop: 2,
  },
  pillarValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pillarValue: {
    fontSize: 18,
    letterSpacing: -0.3,
  },
  pillarBarBg: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  pillarBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  pillarTakeaway: {
    fontSize: 12,
  },
  trendChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  trendText: {
    fontSize: 11,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalHeaderBand: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 22,
    borderBottomWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  modalHeaderBlob: {
    position: 'absolute',
    right: -20,
    bottom: -28,
    opacity: 0.45,
  },
  modalHeaderBlobBg: {
    position: 'absolute',
    right: -50,
    bottom: -70,
    opacity: 0.32,
  },
  modalHeaderBurst: {
    position: 'absolute',
    right: 56,
    top: 14,
    opacity: 0.55,
    transform: [{ rotate: '-12deg' }],
  },
  paperCardBlob: {
    position: 'absolute',
    right: -14,
    top: -14,
    opacity: 0.5,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Detail bits
  scoreHero: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
    gap: 4,
  },
  scoreBanner: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  paperCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  statTilesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  // Wellbeing summary — a single hairline-bordered strip split into three
  // cells by interior hairlines (no gap between boxes), so it reads as one
  // considered read-out row rather than three floating cards.
  calloutRow: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    overflow: 'hidden',
  },
  calloutCell: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 7,
  },
  calloutEyebrow: {
    fontSize: 9,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    fontFamily: diffuseFont.mono,
  },
  calloutValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  calloutDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  calloutValue: {
    fontSize: 19,
    fontFamily: diffuseFont.display,
    letterSpacing: -0.3,
  },
  // Numeric stat strip (value on top, mono caption below) — shares the
  // calloutRow hairline strip; used by every detail-sheet StatTilesRow.
  statStripCell: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 5,
  },
  statStripValue: {
    fontSize: 26,
    fontFamily: diffuseFont.display,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  statStripLabel: {
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    fontFamily: diffuseFont.mono,
    textAlign: 'center',
  },
  // Bare section eyebrow (Diffuse) — mirrors PaperCard's diffuse title so
  // de-carded sections keep the same label rhythm without a box around them.
  // Colour is applied inline from dt.colors.ink3 (theme token).
  diffuseEyebrow: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontFamily: diffuseFont.mono,
    marginBottom: 12,
  },
  statTile: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  // Site look — bare stat cells, mono eyebrows
  statRowSite: { flexDirection: 'row', gap: 16 },
  statCellSite: { flex: 1, gap: 4 },
  statValueSite: { fontSize: 26, lineHeight: 30, letterSpacing: -0.5 },
  statLabelSite: { fontFamily: MONO, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', lineHeight: 13 },
  siteEyebrow: { fontFamily: MONO, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 10 },
  siteMono: { fontFamily: MONO, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase' },

  // Mixed-layout helpers
  grid: {
    paddingHorizontal: 20,
    marginTop: 10,
    gap: 10,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  chartCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
  },
  // Card-less chart wrapper — chart floats on the page bg (Diffuse). Padding
  // only, so some charts sit in a card and some breathe on the cream canvas.
  chartBare: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  // Symptoms glance card body — headline (most common) + total, dot legend.
  symptomsGlance: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 6,
    gap: 16,
  },
  symptomsGlanceEyebrow: {
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    fontFamily: diffuseFont.mono,
  },
  symptomsGlanceValue: {
    fontSize: 26,
    fontFamily: diffuseFont.display,
    letterSpacing: -0.5,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  symptomsGlanceDots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
  },
  symptomsGlanceDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
  },
  symptomsGlanceTotal: {
    fontSize: 32,
    fontFamily: diffuseFont.display,
    letterSpacing: -1,
  },
  listCard: {
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 14,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  rank: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 11,
    fontFamily: font.display,
  },
  listLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: font.bodyMedium,
    textTransform: 'capitalize',
  },
  countChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  countText: {
    fontSize: 11,
    fontFamily: font.bodySemiBold,
  },
})
