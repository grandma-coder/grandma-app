/**
 * C6 — Kids Calendar Screen
 *
 * Child selector, Month/List toggle, colored dots per child,
 * day detail panel, FAB arc menu, 5 bottom sheet forms.
 *
 * Fetches real child_logs from Supabase for the visible month.
 * Tapping a day reveals that day's activities inline.
 * Tapping an activity opens a detail popup with edit/delete.
 */

import { useState, useMemo, useEffect, useCallback, useRef, Fragment } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  Modal,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native'
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Utensils,
  Moon,
  Heart,
  FlaskConical,
  Smile,
  Camera,
  Calendar,
  Clock,
  Dumbbell,
  ChevronRight as ChevronRightSmall,
  X,
  Trash2,
  Pencil,
  Check,
  Plus,
  Repeat,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Circle,
  Settings2,
  Bell,
  Sparkles,
  MinusCircle,
  Minus,
  Baby,
  Sun,
  Syringe,
  Pill,
  Thermometer,
  FileText,
} from 'lucide-react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand, stickers, font, getModeColor, useDiffuseTheme, diffuseFont, getDiffuseAccent, getModeField } from '../../constants/theme'
import { useIsDiffuse, SoftBloom, DiffuseArrow } from '../ui/diffuse/DiffuseKit'
import {
  DiffuseSheet,
  DiffuseBloomIcon,
  DiffuseListRow,
  DiffuseEmptyState,
  DiffuseMetricTile,
} from '../ui/diffuse/DiffusePrimitives'
import {
  DiffuseLogIcon,
  DiffuseTimelineRow,
  DiffuseNowMarker,
  DIFFUSE_LOG_CHARACTER,
  diffuseLogHue,
} from './DiffuseLogTimeline'
import { Character, type CharacterName } from '../characters/Characters'
import { useTranslation } from '../../lib/i18n'
import type { TranslationKeys } from '../../lib/i18n/keys'
type TranslationKey = keyof TranslationKeys
import { useChildStore } from '../../store/useChildStore'
import { toDateStr } from '../../lib/cycleLogic'
import { supabase } from '../../lib/supabase'
import { LogSheet } from './LogSheet'
import { SegmentedTabs } from './SegmentedTabs'
import { ActivityPillCard } from './ActivityPillCard'
import { LogTile, LogTileGrid } from './LogTile'
import { SectionHeader } from './SectionHeader'
import { AgendaWeekStrip } from './AgendaWeekStrip'
import { LogMonthGrid } from './LogMonthGrid'
import { Display, Body } from '../ui/Typography'
import { logSticker } from './logStickers'
import {
  FeedingForm,
  SleepForm,
  WakeUpForm,
  HealthEventForm,
  KidsMoodForm,
  MemoryForm,
  ActivityForm,
  DiaperForm,
  type RoutinePrefill,
  type EditLog,
} from './KidsLogForms'
import { ExamForm } from '../exams/ExamForm'
import { KidsJourneyRing } from '../kids/KidsJourneyRing'

// Enable layout animations on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

// ─── Types ────────────────────────────────────────────────────────────────

interface ChildLog {
  id: string
  child_id: string
  date: string
  type: string
  value: string | null
  notes: string | null
  photos: string[]
  created_at: string
  logged_by: string | null
}

type LogType = 'feeding' | 'sleep' | 'wake_up' | 'health' | 'mood' | 'memory' | 'activity' | 'diaper' | 'exam'

interface ChildRoutine {
  id: string
  child_id: string
  type: string
  name: string
  value: string | null
  days_of_week: number[]
  time: string | null
  active: boolean
}

// ─── Child colors (shared palette) ────────────────────────────────────────

import { CHILD_COLORS, childColor } from '../ui/ChildPills'
import { MoodFace } from '../stickers/RewardStickers'
import { moodFaceVariant, moodFaceFill } from '../../lib/moodFace'
import { stickerForEmoji } from '../../lib/emojiToSticker'

function EmojiSticker({ size = 20, children, style }: { size?: number; children: string | undefined; style?: any }) {
  const S = stickerForEmoji(children ?? '')
  return <View style={style}><S size={size} /></View>
}

// ─── Constants ─────────────────────────────────────────────────────────────

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const LOG_META: Record<string, { label: string; labelKey: TranslationKey; icon: typeof Utensils; color: string }> = {
  feeding: { label: 'Feeding', labelKey: 'kids_calendar_labelFeeding', icon: Utensils, color: brand.kids },
  food: { label: 'Food', labelKey: 'kids_calendar_labelFood', icon: Utensils, color: brand.kids },
  sleep: { label: 'Sleep', labelKey: 'kids_calendar_labelSleep', icon: Moon, color: brand.pregnancy },
  wake_up: { label: 'Wake Up', labelKey: 'kids_calendar_labelWakeUp', icon: Sun, color: brand.accent },
  health: { label: 'Health', labelKey: 'kids_calendar_labelHealth', icon: Heart, color: brand.error },
  temperature: { label: 'Temperature', labelKey: 'kids_calendar_labelTemperature', icon: Heart, color: brand.error },
  medicine: { label: 'Medicine', labelKey: 'kids_calendar_labelMedicine', icon: Heart, color: brand.error },
  vaccine: { label: 'Vaccine', labelKey: 'kids_calendar_labelVaccine', icon: Heart, color: brand.error },
  mood: { label: 'Mood', labelKey: 'kids_calendar_labelMood', icon: Smile, color: brand.accent },
  memory: { label: 'Memory', labelKey: 'kids_calendar_labelMemory', icon: Camera, color: brand.phase.ovulation },
  photo: { label: 'Photo', labelKey: 'kids_calendar_labelPhoto', icon: Camera, color: brand.phase.ovulation },
  diaper: { label: 'Diaper', labelKey: 'kids_calendar_labelDiaper', icon: Baby, color: brand.secondary },
  growth: { label: 'Growth', labelKey: 'kids_calendar_labelGrowth', icon: Heart, color: brand.success },
  milestone: { label: 'Milestone', labelKey: 'kids_calendar_labelMilestone', icon: Camera, color: brand.accent },
  activity: { label: 'Activity', labelKey: 'kids_calendar_labelActivity', icon: Dumbbell, color: brand.phase.ovulation },
  note: { label: 'Note', labelKey: 'kids_calendar_labelNote', icon: Calendar, color: brand.primaryLight },
  skipped: { label: 'Skipped', labelKey: 'kids_calendar_labelSkipped', icon: MinusCircle, color: '#888888' },
}

// ─── Diffuse (v4) log icon + timeline ──────────────────────────────────────
// The glyph/hue maps, bloom-icon, and vertical "choice timeline" now live in
// the shared ./DiffuseLogTimeline module so Cycle + Pregnancy render logs
// through the SAME system. Imported below (see top of file).

/** Check if a routine was skipped (persisted as a 'skipped' log) for the given day */
function isRoutineSkipped(routine: ChildRoutine, dayLogs: ChildLog[] | undefined): boolean {
  return (dayLogs ?? []).some((log) => {
    if (log.type !== 'skipped') return false
    try {
      const val = JSON.parse(log.value ?? '{}')
      return val.routineId === routine.id
    } catch {
      return false
    }
  })
}

const QUICK_LOG_DEFS: { id: LogType; labelKey: TranslationKey; icon: typeof Utensils; color: string }[] = [
  { id: 'feeding', labelKey: 'kids_calendar_labelFeeding', icon: Utensils, color: brand.kids },
  { id: 'sleep', labelKey: 'kids_calendar_labelSleep', icon: Moon, color: brand.pregnancy },
  { id: 'wake_up', labelKey: 'kids_calendar_labelWakeUp', icon: Sun, color: brand.accent },
  { id: 'diaper', labelKey: 'kids_calendar_labelDiaper', icon: Baby, color: brand.secondary },
  { id: 'health', labelKey: 'kids_calendar_labelHealth', icon: Heart, color: brand.error },
  { id: 'activity', labelKey: 'kids_calendar_labelActivity', icon: Dumbbell, color: brand.phase.ovulation },
  { id: 'mood', labelKey: 'kids_calendar_labelMood', icon: Smile, color: brand.accent },
  { id: 'memory', labelKey: 'kids_calendar_labelMemory', icon: Camera, color: brand.phase.ovulation },
  { id: 'exam', labelKey: 'kids_calendar_labelExam', icon: FlaskConical, color: brand.phase.ovulation },
]

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Growth leap schedule lives in lib/growthLeaps.ts and is consumed by
// KidsJourneyRing directly — no per-screen duplication needed.

/** Map routine type → sheet LogType */
const ROUTINE_SHEET_MAP: Record<string, string> = {
  feeding: 'feeding', food: 'feeding', sleep: 'sleep', wake_up: 'wake_up',
  activity: 'activity', mood: 'mood', health: 'health', memory: 'memory', diaper: 'diaper',
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatTime(isoStr: string): string {
  const d = new Date(isoStr)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatDayLabel(dateStr: string, todayStr: string, t: (key: TranslationKey) => string): string {
  if (dateStr === todayStr) return t('common_today')
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

/** Strip units the user may have typed so we don't double-suffix */
function stripUnit(val: string, units: string[]): string {
  let v = val.trim()
  for (const u of units) {
    if (v.toLowerCase().endsWith(u)) v = v.slice(0, -u.length).trim()
  }
  return v
}

/** Format "HH:MM" to "h:MM AM/PM" */
function fmtTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  if (isNaN(h)) return t
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

/** Convert "HH:MM" string to decimal hours */
function timeStrToHours(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return (isNaN(h) ? 0 : h) + (isNaN(m) ? 0 : m) / 60
}

/** Convert ISO timestamp to decimal hours in local timezone */
function isoToLocalHours(iso: string): number {
  const d = new Date(iso)
  return d.getHours() + d.getMinutes() / 60
}

/** Format hour number (0–23) to "h AM/PM" label */
function fmtHourLabel(h: number): string {
  if (h === 0) return '12 AM'
  if (h === 12) return '12 PM'
  return h < 12 ? `${h} AM` : `${h - 12} PM`
}

/** Convert decimal hours back to "HH:MM" for fmtTime */
function hoursToHHMM(h: number): string {
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return `${hrs}:${String(mins).padStart(2, '0')}`
}

/**
 * Returns the "activity time" for a log — the scheduled time the user logged
 * (startTime/time in value JSON), NOT the moment they tapped Save (created_at).
 * Falls back to created_at only when the log doesn't carry a scheduled time.
 */
function activityTimeDisplay(log: { value: string | null; created_at: string }): string {
  try {
    const v = JSON.parse(log.value ?? '{}')
    const t = v.startTime ?? v.time ?? null
    if (t && typeof t === 'string') return fmtTime(t)
  } catch {}
  return formatTime(log.created_at)
}

/** Same as activityTimeDisplay but returns decimal hours (for positioning) */
function activityTimeHours(log: { value: string | null; created_at: string }): number {
  try {
    const v = JSON.parse(log.value ?? '{}')
    const t = v.startTime ?? v.time ?? null
    if (t && typeof t === 'string') return timeStrToHours(t)
  } catch {}
  return isoToLocalHours(log.created_at)
}

/**
 * Returns the title for a logged activity. When the log was saved from a
 * routine the routine name is stamped into value.routineName — use it so the
 * card shows e.g. "Breakfast" instead of generic "Food". Falls back to the
 * log-type meta label (LOG_META).
 */
function logTitle(log: { type: string; value: string | null }): string {
  try {
    const v = JSON.parse(log.value ?? '{}')
    if (v && typeof v.routineName === 'string' && v.routineName.trim()) return v.routineName
  } catch {}
  return (LOG_META[log.type] ?? { label: log.type }).label
}

/** Normalize a routine identity signature so casing/whitespace duplicates collapse */
function routineSig(r: { child_id: string; type: string; name: string }): string {
  const type = r.type === 'food' ? 'feeding' : r.type
  return `${r.child_id}:${type}:${r.name.trim().toLowerCase()}`
}

// ─── Day View Constants ────────────────────────────────────────────────────
const DAY_VIEW_DEFAULT_HOUR_H = 64   // px per hour (default zoom)
const DAY_VIEW_MIN_HOUR_H = 32      // minimum zoom (fits 24h on smaller screens)
const DAY_VIEW_MAX_HOUR_H = 120     // maximum zoom
const DAY_VIEW_START = 0             // 12 AM — full 24h coverage
const DAY_VIEW_END = 24              // 12 AM next day

/** Parse JSON value fields into human-readable text */
function formatLogDisplay(type: string, value: string | null, notes: string | null): string {
  if (!value) return notes ?? ''

  try {
    const parsed = JSON.parse(value)
    if (typeof parsed === 'object' && parsed !== null) {
      switch (type) {
        case 'sleep': {
          const parts: string[] = []
          if (parsed.startTime && parsed.endTime) parts.push(`${fmtTime(parsed.startTime)}–${fmtTime(parsed.endTime)}`)
          else if (parsed.startTime) parts.push(fmtTime(parsed.startTime))
          if (parsed.duration) {
            parts.push(String(parsed.duration))
          }
          if (parsed.quality) parts.push(parsed.quality)
          return parts.join(' · ') || notes || ''
        }
        case 'feeding': {
          const parts: string[] = []
          if (parsed.feedType === 'breast') {
            parts.push('Breastfed')
            if (parsed.side) {
              const sideLabel = parsed.side === 'left' ? 'Left' : parsed.side === 'right' ? 'Right' : 'Both'
              parts.push(sideLabel)
            }
            if (parsed.duration) {
              const d = stripUnit(String(parsed.duration), ['min', 'mins', 'minutes', 'm'])
              parts.push(`${d} min`)
            }
          } else {
            parts.push('Bottle')
            if (parsed.amount) {
              const a = stripUnit(String(parsed.amount), ['ml', 'oz'])
              parts.push(`${a} ml`)
            }
          }
          return parts.join(' · ') || notes || ''
        }
        case 'food': {
          const parts: string[] = []
          if (parsed.time) parts.push(fmtTime(parsed.time))
          if (parsed.meal) {
            const mealLabels: Record<string, string> = {
              breakfast: 'Breakfast', morning_snack: 'AM Snack', lunch: 'Lunch',
              afternoon_snack: 'PM Snack', dinner: 'Dinner', night_snack: 'Night',
            }
            parts.push(mealLabels[parsed.meal] ?? parsed.meal)
          }
          if (parsed.quality) {
            const qualityLabels: Record<string, string> = {
              ate_well: 'Ate well', ate_little: 'Ate a little', did_not_eat: 'Did not eat',
            }
            parts.push(qualityLabels[parsed.quality] ?? parsed.quality)
          }
          if (parsed.estimatedCals) parts.push(`~${parsed.estimatedCals} kcal`)
          if (parsed.isNewFood && parsed.newFoodName) parts.push(`New: ${parsed.newFoodName}`)
          else if (parsed.isNewFood) parts.push('New food')
          if (parsed.hasReaction && parsed.reactionFood) parts.push(`Reaction to ${parsed.reactionFood}`)
          else if (parsed.hasReaction) parts.push('Reaction!')
          const base = parts.join(' · ')
          return notes ? `${base} — ${notes}` : base
        }
        case 'activity': {
          const parts: string[] = []
          if (parsed.activityType) {
            const label = parsed.activityType.charAt(0).toUpperCase() + parsed.activityType.slice(1)
            parts.push(label)
          }
          if (parsed.name) parts.push(parsed.name)
          if (parsed.startTime && parsed.endTime) parts.push(`${fmtTime(parsed.startTime)}–${fmtTime(parsed.endTime)}`)
          else if (parsed.startTime) parts.push(fmtTime(parsed.startTime))
          if (parsed.duration) {
            const d = stripUnit(String(parsed.duration), ['min', 'mins', 'minutes', 'm'])
            parts.push(`${d} min`)
          }
          return parts.join(' · ') || notes || ''
        }
        case 'diaper': {
          const parts: string[] = []
          const typeLabels: Record<string, string> = { pee: 'Pee', poop: 'Poop', mixed: 'Both' }
          if (parsed.diaperType) parts.push(typeLabels[parsed.diaperType] ?? parsed.diaperType)
          if (parsed.color) parts.push(parsed.color.charAt(0).toUpperCase() + parsed.color.slice(1))
          if (parsed.consistency) parts.push(parsed.consistency.charAt(0).toUpperCase() + parsed.consistency.slice(1))
          if (parsed.time) parts.push(fmtTime(parsed.time))
          return parts.join(' · ') || notes || ''
        }
        case 'mood': {
          // Routine-logged moods store { mood, routineId, routineName, ... }.
          // Show only the mood label — never the internal routine keys.
          const moodVal = parsed.mood ?? parsed.value ?? parsed.label
          if (typeof moodVal === 'string' && moodVal.trim()) return moodVal
          return notes || ''
        }
        default: {
          // Internal bookkeeping keys stamped when a log is saved from a
          // routine — must never surface to the user (they include a raw UUID).
          const INTERNAL_KEYS = new Set(['routineId', 'routineName', 'routineType', 'childId', 'id'])
          const parts = Object.entries(parsed)
            .filter(([k, v]) => v && v !== false && !INTERNAL_KEYS.has(k))
            .map(([k, v]) => (v === true ? k : `${v}`))
          return parts.join(' · ') || notes || ''
        }
        case 'note': {
          // Free-form health events (Doctor visit / Injury / Other) are
          // stored as { eventType, description }. Show the user's
          // description if it differs from the eventType label; otherwise
          // just the eventType.
          if (parsed.eventType && typeof parsed.eventType === 'string') {
            const desc = typeof parsed.description === 'string' ? parsed.description : ''
            if (desc && desc !== parsed.eventType) {
              return `${parsed.eventType}: ${desc}`
            }
            return parsed.eventType
          }
          return notes ?? ''
        }
      }
    }
  } catch {
    // Not JSON — use value as-is
  }
  return value
}

// ─── Log Activity Sheet (bottom sheet opened by header "+" button) ─────────

/** Tint key mapping for kids log types → pastel palette in tints.ts */
const KIDS_TINT_BY_TYPE: Record<LogType, string> = {
  feeding: 'feeding',
  sleep: 'sleep',
  wake_up: 'wake',
  health: 'health',
  exam: 'exam',
  mood: 'mood',
  memory: 'memory',
  activity: 'activity',
  diaper: 'diaper',
}

// ─── Diffuse style helpers (color-dependent → factory fns) ─────────────────
const diffuseSheetStyles = {
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 } as const,
  tile: {
    width: '30%' as const,
    flexGrow: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  tileLabel: (color: string) => ({
    fontFamily: diffuseFont.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    color,
    textAlign: 'center' as const,
  }),
  manageRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    paddingTop: 18,
    marginTop: 18,
    borderTopWidth: 1,
  },
  manageLabel: (color: string) => ({
    flex: 1,
    fontFamily: diffuseFont.monoBold,
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: 'uppercase' as const,
    color,
  }),
}

function LogActivitySheet({
  open,
  onClose,
  onSelect,
  onManageRoutines,
}: {
  open: boolean
  onClose: () => void
  onSelect: (type: LogType) => void
  onManageRoutines: () => void
}) {
  const { colors, isDark, font } = useTheme()
  const dt = useDiffuseTheme()
  const diffuse = useIsDiffuse()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()

  const QUICK_LOGS = QUICK_LOG_DEFS.map((d) => ({ ...d, label: t(d.labelKey) }))

  function handleSelect(type: LogType) {
    onClose()
    onSelect(type)
  }

  // ── Diffuse variant: bottom-sheet shell + hairline log-type tiles ──────────
  if (diffuse) {
    return (
      <DiffuseSheet visible={open} onClose={onClose} title={t('kids_calendar_logActivity')}>
        <View style={diffuseSheetStyles.tileGrid}>
          {QUICK_LOGS.map((log) => (
            <Pressable
              key={log.id}
              onPress={() => handleSelect(log.id)}
              style={({ pressed }) => [
                diffuseSheetStyles.tile,
                { borderColor: dt.colors.line, backgroundColor: dt.colors.surface, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <DiffuseLogIcon type={log.id} size={38} inkColor={dt.colors.ink3} />
              <Text style={diffuseSheetStyles.tileLabel(dt.colors.ink2)}>{log.label}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={() => { onClose(); onManageRoutines() }}
          style={({ pressed }) => [
            diffuseSheetStyles.manageRow,
            { borderTopColor: dt.colors.line2, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <DiffuseBloomIcon color={stickers.lilac} size={30}>
            <Repeat size={16} color={dt.colors.ink3} strokeWidth={1.6} />
          </DiffuseBloomIcon>
          <Text style={diffuseSheetStyles.manageLabel(dt.colors.ink)}>{t('kids_calendar_manageRoutines')}</Text>
          <DiffuseArrow color={dt.colors.ink3} size={16} />
        </Pressable>
      </DiffuseSheet>
    )
  }

  const paper = colors.surface
  const paperBorder = colors.border
  const bg = colors.bg
  const ink = colors.text
  const accent = isDark ? colors.primary : '#7048B8'

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.fabSheetBackdrop} onPress={onClose} />
      <View
        style={[
          styles.fabSheet,
          {
            backgroundColor: bg,
            paddingBottom: insets.bottom + 16,
          },
        ]}
      >
        <View style={styles.fabSheetHandle}>
          <View style={[styles.fabSheetHandleBar, { backgroundColor: paperBorder }]} />
        </View>
        <View style={styles.fabSheetTitleWrap}>
          <Display size={22} color={ink}>{t('kids_calendar_logActivity')}</Display>
        </View>
        <View style={styles.fabSheetBody}>
          <LogTileGrid>
            {QUICK_LOGS.map((log) => {
              const tint = KIDS_TINT_BY_TYPE[log.id] ?? 'activity'
              return (
                <LogTile
                  key={log.id}
                  label={log.label}
                  tint={tint}
                  icon={logSticker(log.id, 36, isDark)}
                  onPress={() => handleSelect(log.id)}
                />
              )
            })}
          </LogTileGrid>

          <Pressable
            onPress={() => { onClose(); onManageRoutines() }}
            style={({ pressed }) => [
              styles.manageRoutinesBtn,
              {
                backgroundColor: isDark ? colors.surfaceRaised : '#E9DFFB',
                borderColor: ink,
                borderWidth: 1.5,
                shadowColor: ink,
                shadowOffset: { width: 0, height: pressed ? 1 : 3 },
                shadowOpacity: 1,
                shadowRadius: 0,
                elevation: 4,
                transform: [{ translateY: pressed ? 2 : 0 }],
              },
            ]}
          >
            <View style={{
              width: 30, height: 30, borderRadius: 15,
              backgroundColor: colors.surface,
              borderWidth: 1.5, borderColor: ink,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Repeat size={15} color={ink} strokeWidth={2.4} />
            </View>
            <Body size={14} color={ink} style={{ fontFamily: font.bodyBold, flex: 1, letterSpacing: 0.2 }}>
              {t('kids_calendar_manageRoutines')}
            </Body>
            <ChevronRightSmall size={16} color={ink} />
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

// ─── Diffuse week strip ─────────────────────────────────────────────────────
// The Diffuse counterpart to AgendaWeekStrip: a hairline day row. Each day is a
// thin hairline circle; selected = accent ring + soft radial bloom behind;
// logged days get small accent-ish dots beneath. Mon-first, matches the .dotcal
// reference (row form). Kept inline so KidsCalendar owns its Diffuse timeline.
const DIFFUSE_DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function DiffuseWeekStrip({
  selectedDate,
  onSelectDate,
  dotsByDate,
  logTypesByDate,
}: {
  selectedDate: string
  onSelectDate: (date: string) => void
  dotsByDate?: Record<string, string[]>
  /** date → distinct log types (priority-ordered). When provided, the strip
   *  renders the same blob markers as the month grid instead of plain dots. */
  logTypesByDate?: Map<string, string[]>
}) {
  const { colors, isDark } = useDiffuseTheme()
  const acc = getDiffuseAccent('kids', isDark)
  const todayStr = toDateStr(new Date())

  const center = new Date(selectedDate + 'T00:00:00')
  const dow = center.getDay()
  const offsetToMon = dow === 0 ? -6 : 1 - dow
  const days: { date: Date; dateStr: string }[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(center)
    d.setDate(center.getDate() + offsetToMon + i)
    days.push({ date: d, dateStr: toDateStr(d) })
  }
  const monthLabel = days[0].date.toLocaleDateString('en-US', { month: 'long' }).toUpperCase()

  const stepWeek = (delta: number) => {
    const next = new Date(selectedDate + 'T00:00:00')
    next.setDate(next.getDate() + delta)
    onSelectDate(toDateStr(next))
  }

  return (
    <View style={diffuseStripStyles.container}>
      <View style={diffuseStripStyles.captionRow}>
        <Text style={[diffuseStripStyles.month, { color: colors.ink3 }]}>{monthLabel}</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Pressable onPress={() => stepWeek(-7)} hitSlop={8} style={[diffuseStripStyles.navBtn, { borderColor: colors.line2 }]}>
            <ChevronLeft size={14} color={colors.ink3} strokeWidth={1.8} />
          </Pressable>
          <Pressable onPress={() => stepWeek(7)} hitSlop={8} style={[diffuseStripStyles.navBtn, { borderColor: colors.line2 }]}>
            <ChevronRight size={14} color={colors.ink3} strokeWidth={1.8} />
          </Pressable>
        </View>
      </View>
      <View style={diffuseStripStyles.grid}>
        {days.map(({ date, dateStr }) => {
          const isSelected = dateStr === selectedDate
          const isToday = dateStr === todayStr && !isSelected
          const dots = dotsByDate?.[dateStr] ?? []
          return (
            <Pressable key={dateStr} onPress={() => onSelectDate(dateStr)} style={diffuseStripStyles.cell}>
              <Text style={[diffuseStripStyles.dow, { color: colors.ink3, fontFamily: isSelected ? diffuseFont.monoBold : diffuseFont.mono }]}>
                {DIFFUSE_DAY_INITIALS[date.getDay()]}
              </Text>
              <View style={diffuseStripStyles.bubbleWrap}>
                {isSelected ? (
                  <View pointerEvents="none" style={diffuseStripStyles.bloom}>
                    <SoftBloom color={acc} opacity={0.55} spread={0.34} radius="50%" />
                  </View>
                ) : null}
                <View
                  style={[
                    diffuseStripStyles.bubble,
                    { borderColor: isSelected ? acc : isToday ? colors.hairline : colors.line },
                  ]}
                >
                  <Text
                    style={{
                      fontFamily: isSelected ? diffuseFont.bodySemiBold : diffuseFont.body,
                      fontSize: 13,
                      color: isSelected ? colors.ink : colors.ink2,
                    }}
                  >
                    {date.getDate()}
                  </Text>
                </View>
              </View>
              <View style={diffuseStripStyles.dotRow}>
                {(() => {
                  // Same marker rule as LogMonthGrid: up to 2 blobs; on overflow
                  // show 1 blob + "+N". Falls back to accent dots if no types.
                  const types = logTypesByDate?.get(dateStr)
                  if (types && types.length > 0) {
                    const iconCount = types.length <= 2 ? types.length : 1
                    const shown = types.slice(0, iconCount)
                    const overflow = types.length - shown.length
                    return (
                      <>
                        {shown.map((type, i) => {
                          const char = DIFFUSE_LOG_CHARACTER[type]
                          if (!char) return <View key={i} style={[diffuseStripStyles.dot, { backgroundColor: diffuseLogHue(type) }]} />
                          return <Character key={i} name={char} size={11} color={diffuseLogHue(type)} />
                        })}
                        {overflow > 0 ? (
                          <Text style={{ fontFamily: diffuseFont.monoBold, fontSize: 9, color: colors.ink3, marginLeft: 1 }}>+{overflow}</Text>
                        ) : null}
                      </>
                    )
                  }
                  return dots.slice(0, 3).map((_, i) => (
                    <View key={i} style={[diffuseStripStyles.dot, { backgroundColor: acc }]} />
                  ))
                })()}
              </View>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const diffuseStripStyles = StyleSheet.create({
  container: { paddingHorizontal: 4, paddingTop: 4, paddingBottom: 2 },
  captionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 4 },
  month: { fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' },
  navBtn: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', justifyContent: 'space-between' },
  cell: { flex: 1, alignItems: 'center', gap: 5 },
  dow: { fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' },
  bubbleWrap: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  bloom: { position: 'absolute', width: '132%', height: '132%' },
  bubble: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dotRow: { flexDirection: 'row', gap: 3, height: 5, alignItems: 'center' },
  dot: { width: 4, height: 4, borderRadius: 2 },
})

const diffuseVisitStyles = StyleSheet.create({
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderTopWidth: 1,
    paddingTop: 18,
    marginTop: 8,
  },
})

// ─── Diffuse Routine Manager ────────────────────────────────────────────────
// The Diffuse counterpart to the sticker-on-paper routine manager: a DiffuseSheet
// with a hairline form (name input, mono type chips, time, day toggles), a
// containerless save action, and a hairline list of existing routines with
// inline edit/delete. Same handlers/state as the legacy manager — this only
// re-skins. Rendered only when the flag is on.

const ROUTINE_TYPES = ['feeding', 'food', 'sleep', 'diaper', 'activity', 'mood', 'health']

/** Routine category → character-blob concept for the compact type pills. */
const ROUTINE_TYPE_CHARACTER: Record<string, CharacterName> = {
  feeding: 'feeding', food: 'nutrition', sleep: 'sleep', diaper: 'diaper',
  activity: 'activity', mood: 'mood', health: 'checkup',
}

interface DiffuseRoutineManagerProps {
  visible: boolean
  onClose: () => void
  routines: ChildRoutine[]
  children: { id: string; name: string }[]
  routineForm: { name: string; type: string; time: string; days: number[] }
  setRoutineForm: React.Dispatch<React.SetStateAction<{ name: string; type: string; time: string; days: number[] }>>
  routineEditing: ChildRoutine | null
  setRoutineEditing: (r: ChildRoutine | null) => void
  routineSaving: boolean
  onSave: () => void
  onDelete: (id: string) => void
  onDeleteMany: (ids: string[], onDone?: () => void) => void
  routineFilterKid: string | null
  setRoutineFilterKid: (id: string | null) => void
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
}

function DiffuseRoutineManager({
  visible, onClose, routines, children, routineForm, setRoutineForm,
  routineEditing, setRoutineEditing, routineSaving, onSave, onDelete, onDeleteMany,
  routineFilterKid, setRoutineFilterKid, t,
}: DiffuseRoutineManagerProps) {
  const { colors } = useDiffuseTheme()
  const listed = routineFilterKid ? routines.filter((r) => r.child_id === routineFilterKid) : routines

  // Multi-select delete mode. Local to the manager — enter via "SELECT", tap
  // rows to toggle, then delete the batch or clear all.
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const exitSelect = () => { setSelectMode(false); setSelectedIds(new Set()) }
  const toggleSelected = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  const allSelected = listed.length > 0 && listed.every((r) => selectedIds.has(r.id))
  const toggleAll = () =>
    setSelectedIds(allSelected ? new Set() : new Set(listed.map((r) => r.id)))
  // Editing a routine or filtering to another kid should drop select mode.
  useEffect(() => { if (routineEditing) exitSelect() }, [routineEditing])

  const input = (value: string, onChange: (v: string) => void, placeholder: string, keyboardType?: 'numbers-and-punctuation') => (
    <View style={[dm.inputWrap, { borderColor: colors.line2, backgroundColor: colors.surface }]}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.ink4}
        underlineColorAndroid="transparent"
        keyboardType={keyboardType}
        style={{ color: colors.ink, fontFamily: diffuseFont.body, fontSize: 15, paddingVertical: 0 }}
      />
    </View>
  )

  const formBody = (
    <View style={{ gap: 12 }}>
      {input(routineForm.name, (v) => setRoutineForm((f) => ({ ...f, name: v })), 'Routine name (e.g. Morning bottle)')}
      {/* Type chips — mono hairline */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
        {ROUTINE_TYPES.map((rtype) => {
          const active = routineForm.type === rtype
          const meta = LOG_META[rtype]
          const char = ROUTINE_TYPE_CHARACTER[rtype]
          return (
            <Pressable
              key={rtype}
              onPress={() => setRoutineForm((f) => ({ ...f, type: rtype }))}
              style={({ pressed }) => [
                dm.typeChip,
                { borderColor: active ? colors.hairline : colors.line, backgroundColor: active ? colors.surface : 'transparent', opacity: pressed ? 0.7 : 1 },
              ]}
            >
              {char ? <Character name={char} size={18} color={active ? colors.ink : colors.ink3} /> : null}
              <Text style={{ fontFamily: active ? diffuseFont.monoBold : diffuseFont.mono, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', color: active ? colors.ink : colors.ink3 }}>
                {t(meta.labelKey)}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
      {/* Time */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <DiffuseBloomIcon color={stickers.yellow} size={30}><Clock size={15} color={colors.ink3} strokeWidth={1.6} /></DiffuseBloomIcon>
        <View style={{ flex: 1 }}>
          {input(routineForm.time, (v) => setRoutineForm((f) => ({ ...f, time: v })), 'HH:MM', 'numbers-and-punctuation')}
        </View>
      </View>
      {/* Days — hairline circles */}
      <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'space-between' }}>
        {DAY_NAMES.map((name, i) => {
          const active = routineForm.days.includes(i)
          return (
            <Pressable
              key={i}
              onPress={() => setRoutineForm((f) => ({ ...f, days: active ? f.days.filter((d) => d !== i) : [...f.days, i].sort() }))}
              style={({ pressed }) => [
                dm.dayChip,
                { borderColor: active ? colors.hairline : colors.line, backgroundColor: active ? colors.surface : 'transparent', opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={{ fontFamily: active ? diffuseFont.monoBold : diffuseFont.mono, fontSize: 12, color: active ? colors.ink : colors.ink3 }}>
                {name.charAt(0)}
              </Text>
            </Pressable>
          )
        })}
      </View>
      {/* Save / update — containerless action row */}
      <View style={{ flexDirection: 'row', gap: 14, marginTop: 6 }}>
        {routineEditing ? (
          <Pressable onPress={() => setRoutineEditing(null)} style={({ pressed }) => [dm.actionRow, { borderTopColor: colors.line2, opacity: pressed ? 0.6 : 1, flex: 1 }]}>
            <Text style={{ fontFamily: diffuseFont.monoBold, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: colors.ink3 }}>{t('common_cancel')}</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={onSave}
          disabled={!routineForm.name.trim() || routineSaving}
          style={({ pressed }) => [dm.actionRow, { borderTopColor: colors.hairline, opacity: (!routineForm.name.trim() || routineSaving) ? 0.4 : (pressed ? 0.6 : 1), flex: 1.4 }]}
        >
          {routineSaving ? (
            <ActivityIndicator color={colors.ink} size="small" />
          ) : (
            <>
              <Text style={{ fontFamily: diffuseFont.monoBold, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: colors.ink }}>
                {routineEditing ? t('common_update') : t('kids_calendar_addRoutine')}
              </Text>
              <DiffuseArrow color={colors.ink3} size={16} />
            </>
          )}
        </Pressable>
      </View>
    </View>
  )

  return (
    <DiffuseSheet visible={visible} onClose={onClose} title={t('kids_calendar_routines')}>
      {/* Form (new or edit) */}
      <View style={{ marginBottom: 8 }}>
        <Text style={{ fontFamily: diffuseFont.display, fontSize: 19, color: colors.ink, letterSpacing: -0.3, marginBottom: 12 }}>
          {routineEditing ? t('kids_calendar_editRoutine') : t('kids_calendar_newRoutine')}
        </Text>
        {formBody}
      </View>

      {/* Existing routines */}
      {listed.length > 0 && (
        <View style={{ marginTop: 24 }}>
          {/* Section header — count + select toggle */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: colors.ink3 }}>
              {selectMode
                ? t('kids_calendar_selectedCount', { count: selectedIds.size })
                : t('kids_logForm_activeRoutines', { count: listed.length })}
            </Text>
            <Pressable onPress={() => (selectMode ? exitSelect() : setSelectMode(true))} hitSlop={8}>
              <Text style={{ fontFamily: diffuseFont.monoBold, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: selectMode ? colors.ink : colors.ink3 }}>
                {selectMode ? t('common_done') : t('kids_calendar_select')}
              </Text>
            </Pressable>
          </View>
          {/* Kid filter chips */}
          {children.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
              <Pressable
                onPress={() => setRoutineFilterKid(null)}
                style={({ pressed }) => [dm.typeChip, { borderColor: routineFilterKid === null ? colors.hairline : colors.line, backgroundColor: routineFilterKid === null ? colors.surface : 'transparent', opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={{ fontFamily: routineFilterKid === null ? diffuseFont.monoBold : diffuseFont.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: routineFilterKid === null ? colors.ink : colors.ink3 }}>
                  {t('kids_calendar_allKids')}
                </Text>
              </Pressable>
              {children.map((child) => {
                const active = routineFilterKid === child.id
                return (
                  <Pressable
                    key={child.id}
                    onPress={() => setRoutineFilterKid(active ? null : child.id)}
                    style={({ pressed }) => [dm.typeChip, { borderColor: active ? colors.hairline : colors.line, backgroundColor: active ? colors.surface : 'transparent', opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Text style={{ fontFamily: active ? diffuseFont.monoBold : diffuseFont.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: active ? colors.ink : colors.ink3 }}>
                      {child.name}
                    </Text>
                  </Pressable>
                )
              })}
            </ScrollView>
          )}
          {listed.map((r, idx) => {
            const childName = children.find((c) => c.id === r.child_id)?.name
            const sub = `${r.time ? fmtTime(r.time) : t('kids_logForm_anytime')} · ${r.days_of_week.length === 7 ? t('kids_logForm_daily') : r.days_of_week.map((d) => DAY_NAMES[d].charAt(0)).join(' ')}${childName ? ` · ${childName}` : ''}`
            const checked = selectedIds.has(r.id)
            return (
              <DiffuseListRow
                key={r.id}
                title={r.name}
                sub={sub}
                icon={<DiffuseLogIcon type={r.type} size={22} inkColor={colors.ink3} />}
                last={idx === listed.length - 1}
                compact
                // Row tap = edit (out of select mode) / toggle (in select mode).
                onPress={selectMode
                  ? () => toggleSelected(r.id)
                  : () => { setRoutineEditing(r); setRoutineForm({ name: r.name, type: r.type, time: r.time ?? '09:00', days: r.days_of_week }) }}
                trailing={
                  selectMode ? (
                    checked ? (
                      <CheckCircle2 size={20} color={colors.ink} strokeWidth={1.8} />
                    ) : (
                      <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.line2 }} />
                    )
                  ) : (
                    <Pressable onPress={() => onDelete(r.id)} hitSlop={12}>
                      <Trash2 size={15} color={colors.ink3} strokeWidth={1.6} />
                    </Pressable>
                  )
                }
              />
            )
          })}

          {/* Batch action bar — only in select mode */}
          {selectMode && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 14 }}>
              <Pressable onPress={toggleAll} style={({ pressed }) => [dm.actionRow, { borderTopColor: colors.line2, opacity: pressed ? 0.6 : 1, flex: 1 }]}>
                <Text style={{ fontFamily: diffuseFont.monoBold, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: colors.ink3 }}>
                  {allSelected ? t('kids_calendar_clearSelection') : t('kids_calendar_selectAll')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => onDeleteMany(Array.from(selectedIds), exitSelect)}
                disabled={selectedIds.size === 0 || routineSaving}
                style={({ pressed }) => [dm.actionRow, { borderTopColor: selectedIds.size ? colors.error : colors.line2, opacity: selectedIds.size === 0 ? 0.4 : (pressed ? 0.6 : 1), flex: 1.4 }]}
              >
                <Trash2 size={15} color={selectedIds.size ? colors.error : colors.ink3} strokeWidth={1.8} />
                <Text style={{ fontFamily: diffuseFont.monoBold, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: selectedIds.size ? colors.error : colors.ink3 }}>
                  {t('kids_calendar_deleteN', { count: selectedIds.size })}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
    </DiffuseSheet>
  )
}

const dm = StyleSheet.create({
  inputWrap: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, height: 52, justifyContent: 'center' },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 8, paddingRight: 11, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  dayChip: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderTopWidth: 1, paddingTop: 16 },
})

// ─── Diffuse Log Detail Sheet ───────────────────────────────────────────────
// The Diffuse counterpart to the rich sticker detail popup: a DiffuseSheet with
// a bloom-icon hero, a serif hero value + mono meta chips (derived from the same
// formatLogDisplay helper), notes, photos, and an inline edit mode. Containerless
// edit/delete actions on hairlines. Same handlers as the legacy popup.

/** Pull a single serif "hero" value + unit out of a log's value JSON, per type. */
function diffuseHero(log: ChildLog): { value: string; unit?: string } | null {
  let p: Record<string, any> = {}
  try { p = JSON.parse(log.value ?? '{}') } catch { return null }
  switch (log.type) {
    case 'food':
      return p.estimatedCals ? { value: String(p.estimatedCals), unit: 'kcal' } : null
    case 'feeding':
      if (p.feedType === 'breast') return p.duration ? { value: String(p.duration), unit: 'min' } : null
      return p.amount ? { value: String(p.amount), unit: 'ml' } : null
    case 'sleep':
      return p.duration ? { value: String(p.duration) } : null
    case 'activity':
      return p.name ? { value: String(p.name) } : (p.activityType ? { value: String(p.activityType) } : null)
    default:
      return null
  }
}

interface DiffuseLogDetailSheetProps {
  log: ChildLog | null
  onClose: () => void
  childName?: string
  loggedByName?: string
  todayStr: string
  editing: boolean
  setEditing: (v: boolean) => void
  editValue: string
  setEditValue: (v: string) => void
  editNotes: string
  setEditNotes: (v: string) => void
  editSaving: boolean
  onSaveEdit: () => void
  onEdit: (log: ChildLog) => void
  onDelete: (log: ChildLog) => void
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
}

function DiffuseLogDetailSheet({
  log, onClose, childName, loggedByName, todayStr,
  editing, setEditing, editValue, setEditValue, editNotes, setEditNotes,
  editSaving, onSaveEdit, onEdit, onDelete, t,
}: DiffuseLogDetailSheetProps) {
  const { colors } = useDiffuseTheme()
  if (!log) return <DiffuseSheet visible={false} onClose={onClose} title="">{null}</DiffuseSheet>

  const hero = diffuseHero(log)
  const summary = formatLogDisplay(log.type, log.value, log.notes)
  const hasPhotos = log.photos && log.photos.length > 0

  return (
    <DiffuseSheet visible={!!log} onClose={onClose} title={logTitle(log)} chip={childName}>
      {/* Meta line */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Clock size={14} color={colors.ink3} strokeWidth={1.6} />
        <Text style={{ fontFamily: diffuseFont.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.ink3 }}>
          {`${formatDayLabel(log.date, todayStr, t)} · ${activityTimeDisplay(log)}`}
        </Text>
      </View>

      {editing ? (
        <View style={{ gap: 12 }}>
          <View>
            <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: colors.ink3, marginBottom: 6 }}>{t('kids_calendar_detail_details')}</Text>
            <View style={[dm.inputWrap, { borderColor: colors.line2, backgroundColor: colors.surface, height: 'auto', paddingVertical: 12 }]}>
              <TextInput value={editValue} onChangeText={setEditValue} placeholder={t('kids_calendar_detail_detailsPlaceholder')} placeholderTextColor={colors.ink4} multiline style={{ color: colors.ink, fontFamily: diffuseFont.body, fontSize: 15, minHeight: 40 }} />
            </View>
          </View>
          <View>
            <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: colors.ink3, marginBottom: 6 }}>{t('kids_calendar_detail_notes')}</Text>
            <View style={[dm.inputWrap, { borderColor: colors.line2, backgroundColor: colors.surface, height: 'auto', paddingVertical: 12 }]}>
              <TextInput value={editNotes} onChangeText={setEditNotes} placeholder={t('kids_calendar_detail_notesPlaceholder')} placeholderTextColor={colors.ink4} multiline style={{ color: colors.ink, fontFamily: diffuseFont.body, fontSize: 15, minHeight: 40 }} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 14, marginTop: 6 }}>
            <Pressable onPress={() => setEditing(false)} style={({ pressed }) => [dm.actionRow, { borderTopColor: colors.line2, opacity: pressed ? 0.6 : 1, flex: 1 }]}>
              <Text style={{ fontFamily: diffuseFont.monoBold, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: colors.ink3 }}>{t('common_cancel')}</Text>
            </Pressable>
            <Pressable onPress={onSaveEdit} disabled={editSaving} style={({ pressed }) => [dm.actionRow, { borderTopColor: colors.hairline, opacity: editSaving ? 0.5 : (pressed ? 0.6 : 1), flex: 1 }]}>
              {editSaving ? <ActivityIndicator color={colors.ink} size="small" /> : (
                <>
                  <Text style={{ fontFamily: diffuseFont.monoBold, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: colors.ink }}>{t('common_save')}</Text>
                  <DiffuseArrow color={colors.ink3} size={16} />
                </>
              )}
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          {/* Hero */}
          <View style={{ alignItems: 'center', paddingVertical: 8, marginBottom: 16 }}>
            <DiffuseLogIcon type={log.type} size={64} inkColor={colors.ink3} />
            {hero ? (
              <Text style={{ fontFamily: diffuseFont.displayLight, fontSize: 44, letterSpacing: -1, color: colors.ink, marginTop: 8 }}>
                {hero.value}
                {hero.unit ? <Text style={{ fontFamily: diffuseFont.display, fontSize: 22, color: colors.ink2 }}>{' ' + hero.unit}</Text> : null}
              </Text>
            ) : null}
            <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: colors.ink3, marginTop: hero ? 6 : 10 }}>
              {(LOG_META[log.type]?.label ?? log.type)}
            </Text>
          </View>

          {/* Summary (if not already the hero) */}
          {summary && !hero ? (
            <Text style={{ fontFamily: diffuseFont.body, fontSize: 15, lineHeight: 22, color: colors.ink2, textAlign: 'center', marginBottom: 16 }}>{summary}</Text>
          ) : null}

          {/* Notes */}
          {log.notes ? (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: colors.ink3, marginBottom: 6 }}>{t('kids_calendar_detail_notes')}</Text>
              <Text style={{ fontFamily: diffuseFont.body, fontSize: 15, lineHeight: 22, color: colors.ink }}>{log.notes}</Text>
            </View>
          ) : null}

          {/* Logged by */}
          {loggedByName ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <CheckCircle2 size={14} color={colors.success} strokeWidth={1.8} />
              <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: colors.ink3 }}>
                {t('kids_calendar_detail_loggedBy')} {loggedByName}
              </Text>
            </View>
          ) : null}

          {/* Photos */}
          {hasPhotos ? (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: colors.ink3, marginBottom: 8 }}>{t('kids_calendar_detail_photos')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {log.photos.map((uri, i) => (
                  <Image key={i} source={{ uri }} style={{ width: 180, height: 180, borderRadius: 20 }} />
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: 14, marginTop: 6 }}>
            <Pressable onPress={() => onEdit(log)} style={({ pressed }) => [dm.actionRow, { borderTopColor: colors.hairline, opacity: pressed ? 0.6 : 1, flex: 1 }]}>
              <Pencil size={14} color={colors.ink} strokeWidth={1.8} />
              <Text style={{ fontFamily: diffuseFont.monoBold, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: colors.ink }}>{t('kids_calendar_detail_edit')}</Text>
            </Pressable>
            <Pressable onPress={() => onDelete(log)} style={({ pressed }) => [dm.actionRow, { borderTopColor: colors.line2, opacity: pressed ? 0.6 : 1, flex: 1 }]}>
              <Trash2 size={14} color={colors.error} strokeWidth={1.8} />
              <Text style={{ fontFamily: diffuseFont.monoBold, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: colors.error }}>{t('kids_calendar_detail_delete')}</Text>
            </Pressable>
          </View>
        </>
      )}
    </DiffuseSheet>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────

export function KidsCalendar() {
  const { colors, radius, isDark } = useTheme()
  const dt = useDiffuseTheme()
  const diffuse = useIsDiffuse()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()

  const children = useChildStore((s) => s.children)
  const activeChild = useChildStore((s) => s.activeChild)
  const setActiveChild = useChildStore((s) => s.setActiveChild)

  const [selectedChildId, setSelectedChildId] = useState<string | 'all'>('all')
  const [view, setView] = useState<'timeline' | 'journey' | 'visits'>('timeline')
  // Timeline sub-view: the full month grid (default) vs the compact week strip.
  const [calView, setCalView] = useState<'month' | 'week'>('month')
  const [logSheetOpen, setLogSheetOpen] = useState(false)
  const [kidPickerOpen, setKidPickerOpen] = useState(false)
  const [dayZoomH, setDayZoomH] = useState(DAY_VIEW_DEFAULT_HOUR_H)
  const [viewDate, setViewDate] = useState(() => new Date())
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(new Set())
  const [loggedCollapsed, setLoggedCollapsed] = useState(true)
  const [collapsedDayChildren, setCollapsedDayChildren] = useState<Set<string>>(new Set())
  const [loggedCollapsedByChild, setLoggedCollapsedByChild] = useState<Record<string, boolean>>({})
  const dayScrollRef = useRef<ScrollView>(null)
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()))
  const [sheetType, setSheetType] = useState<LogType | null>(null)
  const [routinePrefill, setRoutinePrefill] = useState<RoutinePrefill | null>(null)
  // Date-aware "done" cache: dateStr → Set<routineId>. Persists across date changes so
  // navigating away and back doesn't cause a skipped/logged routine to reappear before
  // the DB fetch completes.
  const [doneByDate, setDoneByDate] = useState<Map<string, Set<string>>>(new Map())
  const [showDayCongrats, setShowDayCongrats] = useState(false)
  const congratsShownRef = useRef<Set<string>>(new Set())
  // Hydrate from AsyncStorage on mount so the popup won't re-show after tab switch / remount
  const congratsHydrated = useRef(false)
  useEffect(() => {
    AsyncStorage.getItem('congrats_shown').then((raw) => {
      if (raw) {
        try {
          const arr: string[] = JSON.parse(raw)
          // Only keep entries from today to avoid unbounded growth
          const todayPrefix = toDateStr(new Date())
          for (const k of arr) { if (k.startsWith(todayPrefix)) congratsShownRef.current.add(k) }
        } catch {}
      }
      congratsHydrated.current = true
    })
  }, [])
  const [editingLog, setEditingLog] = useState<EditLog | null>(null)
  const [expandedLogCategories, setExpandedLogCategories] = useState<Set<string>>(new Set())
  const [pendingCollapsed, setPendingCollapsed] = useState(true)
  const [pendingCollapsedByChild, setPendingCollapsedByChild] = useState<Record<string, boolean>>({})
  // List view: tracks expanded category per "date:catKey" key (empty set = all collapsed by default)
  const [expandedListCats, setExpandedListCats] = useState<Set<string>>(new Set())
  // Month view: tracks expanded pending category (empty = all collapsed)
  const [expandedPendingCats, setExpandedPendingCats] = useState<Set<string>>(new Set())

  // Real data from Supabase
  const [monthLogs, setMonthLogs] = useState<ChildLog[]>([])
  const seenLogIdsRef = useRef<Set<string> | null>(null)
  const [pulsingLogIds, setPulsingLogIds] = useState<Set<string>>(() => new Set())
  const [loading, setLoading] = useState(false)
  const [profileNames, setProfileNames] = useState<Record<string, string>>({}) // userId → display name
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [selectedLog, setSelectedLog] = useState<ChildLog | null>(null)
  const [unlogTarget, setUnlogTarget] = useState<ChildLog | null>(null)
  const [unlogging, setUnlogging] = useState(false)

  // Routines
  const [routines, setRoutines] = useState<ChildRoutine[]>([])
  const [showRoutineManager, setShowRoutineManager] = useState(false)
  const [routineEditing, setRoutineEditing] = useState<ChildRoutine | null>(null)
  const [routineForm, setRoutineForm] = useState({ name: '', type: 'activity' as string, time: '09:00', days: [0,1,2,3,4,5,6] as number[] })
  const [routineSaving, setRoutineSaving] = useState(false)
  const [routineFilterKid, setRoutineFilterKid] = useState<string | null>(null)
  const [confirmDeleteRoutineId, setConfirmDeleteRoutineId] = useState<string | null>(null)
  const [routineDeleting, setRoutineDeleting] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(0)

  // Edit state
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const todayStr = toDateStr(new Date())

  // ── Fetch logs for visible month ────────────────────────────────────────

  const fetchLogs = useCallback(async () => {
    const childIds = selectedChildId === 'all'
      ? children.map((c) => c.id)
      : [selectedChildId]

    if (childIds.length === 0) {
      setMonthLogs([])
      return
    }

    setLoading(true)
    try {
      // Fetch prev + current + next month so week strips that span month boundaries
      // (e.g. Apr 27–May 3) render with their full data.
      const startYear = month - 1 < 0 ? year - 1 : year
      const startMonth = month - 1 < 0 ? 12 : month
      const endYear = month + 2 > 12 ? year + 1 : year
      const endMonth = month + 2 > 12 ? 1 : month + 2
      const startDate = `${startYear}-${String(startMonth).padStart(2, '0')}-01`

      const { data, error } = await supabase
        .from('child_logs')
        .select('id, child_id, date, type, value, notes, photos, created_at, logged_by')
        .in('child_id', childIds)
        .gte('date', startDate)
        .lt('date', `${endYear}-${String(endMonth).padStart(2, '0')}-01`)
        .order('created_at', { ascending: true })

      if (!error && data) {
        setMonthLogs(data as ChildLog[])
        // Fetch profile names for logged_by user ids
        const loggedByIds = [...new Set((data as ChildLog[]).map((l) => l.logged_by).filter(Boolean) as string[])]
        if (loggedByIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles_public')
            .select('id, name')
            .in('id', loggedByIds)
          if (profiles) {
            const nameMap: Record<string, string> = {}
            for (const p of profiles) if (p.id && p.name) nameMap[p.id] = p.name
            setProfileNames(nameMap)
          }
        }
      }
    } catch {
      // silently fail — UI will show empty state
    } finally {
      setLoading(false)
    }
  }, [year, month, selectedChildId, children])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  // Cache current user id once so log cards can decide whether to show
  // a "by <name>" line (only for entries logged by other caregivers, not
  // the viewer themselves).
  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setCurrentUserId(session?.user.id ?? null)
      })
      .catch(() => { /* transient network failure — id stays null, retried on next mount */ })
  }, [])

  useEffect(() => {
    const currentIds = new Set<string>()
    for (const l of monthLogs) currentIds.add(l.id)
    if (seenLogIdsRef.current === null) {
      seenLogIdsRef.current = currentIds
      return
    }
    const newIds: string[] = []
    for (const id of currentIds) {
      if (!seenLogIdsRef.current.has(id)) newIds.push(id)
    }
    seenLogIdsRef.current = currentIds
    if (newIds.length === 0) return
    setPulsingLogIds((prev) => {
      const next = new Set(prev)
      for (const id of newIds) next.add(id)
      return next
    })
    const t = setTimeout(() => {
      setPulsingLogIds((prev) => {
        const next = new Set(prev)
        for (const id of newIds) next.delete(id)
        return next
      })
    }, 1200)
    return () => clearTimeout(t)
  }, [monthLogs])

  // ── Fetch routines ──────────────────────────────────────────────────────
  const fetchRoutines = useCallback(async () => {
    const childIds = selectedChildId === 'all'
      ? children.map((c) => c.id)
      : [selectedChildId]
    if (childIds.length === 0) { setRoutines([]); return }
    try {
      const { data } = await supabase
        .from('child_routines')
        .select('id, child_id, type, name, value, days_of_week, time, active')
        .in('child_id', childIds)
        .eq('active', true)
        .order('time', { ascending: true })
      if (data) setRoutines(data)
    } catch { /* silent */ }
  }, [selectedChildId, children])

  useEffect(() => { fetchRoutines() }, [fetchRoutines])

  // Reset UI collapse state when the selected date changes (NOT the done cache — that's date-keyed)
  useEffect(() => { setLoggedCollapsed(true); setLoggedCollapsedByChild({}); setExpandedLogCategories(new Set()); setPendingCollapsed(true); setPendingCollapsedByChild({}); setExpandedPendingCats(new Set()) }, [selectedDate])

  function handleSaved() {
    // Optimistically mark the routine as done so it disappears from pending immediately
    if (routinePrefill?.routineId) {
      const routineId = routinePrefill.routineId!
      const date = selectedDate
      setDoneByDate((prev) => {
        const next = new Map(prev)
        const set = new Set(next.get(date) ?? [])
        set.add(routineId)
        next.set(date, set)
        return next
      })
    }
    setSheetType(null)
    setRoutinePrefill(null)
    fetchLogs()
  }

  function closeSheet() {
    setSheetType(null)
    setRoutinePrefill(null)
    setEditingLog(null)
  }

  async function handleDeleteLog(logId: string) {
    const log = selectedLog
    let error: { message: string } | null = null
    try {
      ;({ error } = await supabase.from('child_logs').delete().eq('id', logId))
    } catch (e: any) {
      // Transport-level failure (e.g. "Network request failed") rejects rather
      // than returning { error } — surface it instead of crashing to the dev toast.
      error = { message: e?.message ?? 'Network error. Please try again.' }
    }
    if (error) {
      // Don't run the optimistic cleanup below — that would hide an entry the
      // DB still holds, so it reappears on the next fetch (a ghost delete).
      Alert.alert(t('kids_calendar_alertCouldNotDelete'), error.message)
      return
    }
    // If it was a skipped-routine log, unmark so the routine becomes pending again
    if (log?.type === 'skipped') {
      try {
        const v = JSON.parse(log.value ?? '{}')
        if (v.routineId) {
          setDoneByDate((prev) => {
            const next = new Map(prev)
            const set = new Set(next.get(log.date) ?? [])
            set.delete(v.routineId)
            next.set(log.date, set)
            return next
          })
        }
      } catch {}
    } else if (log) {
      const normType = (t: string) => (t === 'food' ? 'feeding' : t)
      const ids = routines
        .filter((r) => r.child_id === log.child_id && normType(r.type) === normType(log.type))
        .map((r) => r.id)
      if (ids.length) {
        setDoneByDate((prev) => {
          const next = new Map(prev)
          const set = new Set(next.get(log.date) ?? [])
          for (const id of ids) set.delete(id)
          next.set(log.date, set)
          return next
        })
      }
      congratsShownRef.current.delete(`${log.date}:${selectedChildId}`)
      AsyncStorage.setItem('congrats_shown', JSON.stringify([...congratsShownRef.current])).catch(() => {})
    }
    setSelectedLog(null)
    setEditing(false)
    fetchLogs()
  }

  async function handleUnlog() {
    if (!unlogTarget) return
    setUnlogging(true)
    const target = unlogTarget
    let error: { message: string } | null = null
    try {
      ;({ error } = await supabase.from('child_logs').delete().eq('id', target.id))
    } catch (e: any) {
      error = { message: e?.message ?? 'Network error. Please try again.' }
    }
    if (error) {
      Alert.alert(t('kids_calendar_alertCouldNotRemove'), error.message)
      setUnlogging(false)
      return
    }
    // Clear optimistic "done" marks for this date so the matching routine
    // re-appears as pending immediately (not just after fetchLogs resolves).
    const normType = (t: string) => (t === 'food' ? 'feeding' : t)
    const matchingRoutineIds = routines
      .filter((r) => r.child_id === target.child_id && normType(r.type) === normType(target.type))
      .map((r) => r.id)
    if (matchingRoutineIds.length > 0) {
      setDoneByDate((prev) => {
        const next = new Map(prev)
        const set = new Set(next.get(target.date) ?? [])
        for (const id of matchingRoutineIds) set.delete(id)
        next.set(target.date, set)
        return next
      })
    }
    // Allow the congrats popup to fire again once new logs re-satisfy all routines
    congratsShownRef.current.delete(`${target.date}:${selectedChildId}`)
    AsyncStorage.setItem('congrats_shown', JSON.stringify([...congratsShownRef.current])).catch(() => {})
    setUnlogTarget(null)
    setUnlogging(false)
    fetchLogs()
  }

  function openEdit(log: ChildLog) {
    // Map log type → sheet type.
    // Every type listed in the ChildLog union must map here — the previous
    // `?? 'feeding'` fallback sent growth/milestone/wake_up logs into the
    // FeedingForm, which then rewrote their `value` as a food shape on save.
    const LOG_TO_SHEET: Record<string, LogType> = {
      food: 'feeding', feeding: 'feeding',
      sleep: 'sleep', wake_up: 'sleep',
      temperature: 'health', vaccine: 'health', medicine: 'health',
      growth: 'health', milestone: 'health', note: 'health',
      mood: 'mood', photo: 'memory', activity: 'activity', diaper: 'diaper',
    }
    const sheetLogType = LOG_TO_SHEET[log.type]
    if (!sheetLogType) {
      // Unknown type → don't risk a destructive edit in the wrong form.
      // Surfacing a no-op alert beats silently reshaping the row.
      Alert.alert(
        'Can\'t edit this log',
        `This log type (${log.type}) doesn't have an editor yet. Delete and re-create if you need to change it.`,
      )
      return
    }
    setEditingLog({ id: log.id, child_id: log.child_id, date: log.date, type: log.type, value: log.value, notes: log.notes, photos: log.photos ?? [] })
    setSelectedLog(null)
    setSheetType(sheetLogType)
  }

  async function saveEdit() {
    if (!selectedLog) return
    setEditSaving(true)
    try {
      const { error } = await supabase
        .from('child_logs')
        .update({
          value: editValue || null,
          notes: editNotes || null,
        })
        .eq('id', selectedLog.id)
      if (error) throw error
      setEditing(false)
      setSelectedLog(null)
      fetchLogs()
    } catch (e: any) {
      Alert.alert(t('common_error'), e.message)
    } finally {
      setEditSaving(false)
    }
  }

  // ── Child index map (needed early for routines + highlights) ─────────────
  const childIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    children.forEach((c, i) => map.set(c.id, i))
    return map
  }, [children])

  // ── Routine helpers ──────────────────────────────────────────────────────

  /** Routines that apply to the selected day */
  const selectedDayRoutines = useMemo(() => {
    const d = new Date(selectedDate + 'T12:00:00')
    const dow = d.getDay()
    return routines.filter((r) => r.days_of_week.includes(dow))
  }, [routines, selectedDate])

  /** Upcoming highlights for the next 3 days — routines + milestones */
  const upcomingHighlights = useMemo(() => {
    const highlights: { id: string; icon: string; color: string; title: string; detail: string; childName: string; childColor: string; date: string }[] = []
    const today = new Date()

    for (let offset = 1; offset <= 3; offset++) {
      const d = new Date(today)
      d.setDate(d.getDate() + offset)
      const dow = d.getDay()
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const dayLabel = offset === 1 ? t('kids_calendar_tomorrow') : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

      // Routines for that day — only show notable ones (activities, not daily meals)
      for (const r of routines) {
        if (!r.days_of_week.includes(dow)) continue
        if (['activity'].includes(r.type)) {
          const childName = children.find((c) => c.id === r.child_id)?.name ?? ''
          const ci = childIndexMap.get(r.child_id) ?? 0
          highlights.push({
            id: `r-${r.id}-${offset}`,
            icon: r.type,
            color: (LOG_META[r.type] ?? { color: brand.accent }).color,
            title: r.name,
            detail: `${r.time ? fmtTime(r.time) : ''} · ${dayLabel}`,
            childName,
            childColor: childColor(ci),
            date: dateStr,
          })
        }
      }

      // Future logs (vaccines, doctor visits, etc.)
      const futureLogs = monthLogs.filter((l) => l.date === dateStr && ['vaccine', 'milestone', 'note'].includes(l.type))
      for (const log of futureLogs) {
        const meta = LOG_META[log.type] ?? { label: log.type, color: brand.accent }
        const childName = children.find((c) => c.id === log.child_id)?.name ?? ''
        const ci = childIndexMap.get(log.child_id) ?? 0
        highlights.push({
          id: `l-${log.id}`,
          icon: log.type,
          color: meta.color,
          title: logTitle(log),
          detail: `${formatLogDisplay(log.type, log.value, log.notes).slice(0, 40)} · ${dayLabel}`,
          childName,
          childColor: childColor(ci),
          date: dateStr,
        })
      }
    }
    return highlights
  }, [routines, monthLogs, children, childIndexMap])

  // Auto-rotate highlights
  useEffect(() => {
    if (upcomingHighlights.length <= 1) return
    const timer = setInterval(() => {
      setHighlightIndex((i) => (i + 1) % upcomingHighlights.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [upcomingHighlights.length])

  /** Check if a routine was already logged for a given date */
  function isRoutineDone(routine: ChildRoutine, dayLogs: ChildLog[] | undefined): boolean {
    // food and feeding are interchangeable log types
    const normalizeType = (t: string) => (t === 'food' ? 'feeding' : t)

    return (dayLogs ?? []).some((log) => {
      if (log.child_id !== routine.child_id) return false
      // ── Fast path: log was tagged with this routine's id during save ──────
      try {
        const lv = log.value ? JSON.parse(log.value) : null
        if (lv?.routineId && lv.routineId === routine.id) return true
        // Name-based match for pre-migration duplicate routines
        if (lv?.routineName && typeof lv.routineName === 'string'
            && lv.routineName.trim().toLowerCase() === routine.name.trim().toLowerCase()
            && normalizeType(log.type) === normalizeType(routine.type)) {
          return true
        }
      } catch {}
      if (normalizeType(log.type) !== normalizeType(routine.type)) return false

      // ── Food / Feeding ────────────────────────────────────────────────────
      if (routine.type === 'food' || routine.type === 'feeding') {
        if (routine.value) {
          try {
            const rv = JSON.parse(routine.value)
            const lv = log.value ? JSON.parse(log.value) : null
            // If the routine pins a meal (e.g. "breakfast"), the log MUST have
            // the matching meal. A log without a meal field is not a match —
            // otherwise an evening dinner log would mark a breakfast routine
            // as done.
            if (rv.meal) return lv?.meal === rv.meal
            // Same rule for feedType: routine says "bottle" → require bottle.
            if (rv.feedType) return lv?.feedType === rv.feedType
          } catch {}
        }
        // Routine without meal/feedType but WITH a time → require the log
        // to be within ±2 hours of that time. Otherwise a 9pm feed marks
        // a 7am-scheduled "Morning bottle" routine as done.
        if (routine.time) {
          const rHour = parseInt(routine.time.split(':')[0])
          try {
            const lv = log.value ? JSON.parse(log.value) : null
            if (lv?.startTime || lv?.time) {
              const t = String(lv.startTime ?? lv.time)
              const lHour = parseInt(t.split(':')[0])
              if (Number.isFinite(lHour)) return Math.abs(lHour - rHour) <= 2
            }
          } catch {}
          // Fallback when the log payload has no time: use created_at hour.
          const logHour = new Date(log.created_at).getHours()
          return Math.abs(logHour - rHour) <= 2
        }
        // No criteria AND no time — any food/feeding log on the day counts.
        return true
      }

      // ── Activity ──────────────────────────────────────────────────────────
      if (routine.type === 'activity') {
        if (routine.value) {
          try {
            const rv = JSON.parse(routine.value)
            const lv = log.value ? JSON.parse(log.value) : null
            // If routine pins a name or activityType, the log must match
            // exactly. Missing field on the log = mismatch (not a free pass).
            if (rv.name) return lv?.name === rv.name
            if (rv.activityType) return lv?.activityType === rv.activityType
          } catch {}
        }
        // No name/type criterion → fall back to time proximity (within 1 hour).
        if (routine.time) {
          const rHour = parseInt(routine.time.split(':')[0])
          try {
            const lv = log.value ? JSON.parse(log.value) : null
            if (lv?.startTime) {
              return Math.abs(parseInt(String(lv.startTime).split(':')[0]) - rHour) <= 1
            }
          } catch {}
        }
        return true
      }

      // ── Mood ──────────────────────────────────────────────────────────────
      if (routine.type === 'mood') return true

      // ── Sleep ─────────────────────────────────────────────────────────────
      if (routine.type === 'sleep') {
        if (routine.time) {
          const rHour = parseInt(routine.time.split(':')[0])
          try {
            const lv = log.value ? JSON.parse(log.value) : null
            if (lv?.startTime) {
              return Math.abs(parseInt(String(lv.startTime).split(':')[0]) - rHour) <= 2
            }
          } catch {}
          // Fallback: created_at hour (best-effort for same-day entries)
          const logHour = new Date(log.created_at).getHours()
          return Math.abs(logHour - rHour) <= 2
        }
        // No time set → any sleep log for this child counts
        return true
      }

      // ── Default: same type + same child = done ────────────────────────────
      return true
    })
  }

  const logsByDate = useMemo(() => {
    const map = new Map<string, ChildLog[]>()
    for (const log of monthLogs) {
      const existing = map.get(log.date) ?? []
      existing.push(log)
      map.set(log.date, existing)
    }
    return map
  }, [monthLogs])

  // Month-grid adapter: date → distinct log types, ordered by significance so
  // the top-3 shown in each day cell are the meaningful ones (health/milestones
  // before routine feeds). Feeds <LogMonthGrid>.
  const monthGridByDate = useMemo(() => {
    const PRIORITY = ['vaccine', 'health', 'temperature', 'medicine', 'milestone', 'growth', 'mood', 'sleep', 'feeding', 'food', 'diaper', 'activity', 'memory', 'note']
    const rank = (t: string) => { const i = PRIORITY.indexOf(t); return i === -1 ? 99 : i }
    const map = new Map<string, string[]>()
    for (const [date, logs] of logsByDate) {
      const seen = new Set<string>()
      for (const l of logs) seen.add(l.type)
      map.set(date, [...seen].sort((a, b) => rank(a) - rank(b)))
    }
    return map
  }, [logsByDate])

  const childIdsByDate = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const log of monthLogs) {
      if (!map.has(log.date)) map.set(log.date, new Set())
      map.get(log.date)!.add(log.child_id)
    }
    return map
  }, [monthLogs])

  const selectedDayLogs = useMemo(() => {
    return logsByDate.get(selectedDate) ?? []
  }, [logsByDate, selectedDate])

  /** Open-ended sleep log for the active child from yesterday or today — used for "still sleeping" banner */
  const openSleepLogForBanner = useMemo(() => {
    const todayStr = toDateStr(new Date())
    const prev = new Date()
    prev.setDate(prev.getDate() - 1)
    const yesterdayStr = toDateStr(prev)
    const candidates = monthLogs.filter((l) =>
      l.type === 'sleep' &&
      (l.date === todayStr || l.date === yesterdayStr) &&
      (selectedChildId === 'all' || l.child_id === selectedChildId)
    )
    return candidates.find((l) => {
      try {
        const p = JSON.parse(l.value ?? '{}')
        return !!p.startTime && !p.endTime
      } catch { return false }
    }) ?? null
  }, [monthLogs, selectedChildId])

  /** Routines scheduled today that haven't been logged yet and not skipped */
  const pendingRoutines = useMemo(() => {
    const doneTodaySet = doneByDate.get(selectedDate) ?? new Set<string>()
    // Build a set of "skipped signatures" so pre-migration duplicates don't surface
    // as both pending and skipped on the same day.
    const skippedSigs = new Set(
      selectedDayRoutines
        .filter((r) => isRoutineSkipped(r, selectedDayLogs))
        .map((r) => routineSig(r))
    )
    // Collapse duplicate routine entries (same child+type+name) — keep only first
    const seenSigs = new Set<string>()
    return selectedDayRoutines.filter((r) => {
      if (isRoutineDone(r, selectedDayLogs)) return false
      if (doneTodaySet.has(r.id)) return false
      if (isRoutineSkipped(r, selectedDayLogs)) return false
      const sig = routineSig(r)
      if (skippedSigs.has(sig)) return false
      if (seenSigs.has(sig)) return false
      seenSigs.add(sig)
      return true
    })
  }, [selectedDayRoutines, selectedDayLogs, doneByDate, selectedDate])

  // Congrats popup: fire once per date+child when all routines transition from pending>0 → 0.
  // Guards: only for TODAY, only when the *same* child transitions (not on child switch),
  // only once per session+child (persisted to AsyncStorage).
  const prevPendingRef = useRef<{ count: number; childId: string }>({ count: pendingRoutines.length, childId: selectedChildId })
  useEffect(() => {
    if (!congratsHydrated.current) return
    const prev = prevPendingRef.current
    prevPendingRef.current = { count: pendingRoutines.length, childId: selectedChildId }

    // Skip if child or date changed — the pending count drop is from switching context, not completing
    if (prev.childId !== selectedChildId) return
    if (selectedDate !== todayStr) return

    const dayLogCount = monthLogs.filter((l) => l.date === selectedDate && l.type !== 'skipped').length
    const transitioned = prev.count > 0 && pendingRoutines.length === 0
    const allDone = transitioned && dayLogCount > 0
    const key = `${selectedDate}:${selectedChildId}`
    if (allDone && !congratsShownRef.current.has(key)) {
      congratsShownRef.current.add(key)
      AsyncStorage.setItem('congrats_shown', JSON.stringify([...congratsShownRef.current])).catch(() => {})
      setShowDayCongrats(true)
    }
  }, [pendingRoutines.length, monthLogs, selectedDate, selectedChildId, todayStr])

  /** Save a new or edited routine */
  async function saveRoutine() {
    // Routines must belong to a specific child. In "All Kids" view there is
    // no defensible default — the previous code silently fell back to the
    // active child / children[0] and parents got routines silently attached
    // to the wrong kid.
    if (selectedChildId === 'all' && children.length > 1) {
      Alert.alert(
        t('kids_calendar_alertPickChild'),
        t('kids_calendar_alertPickChildMsg'),
      )
      return
    }
    setRoutineSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      // Multi-kid case is blocked above; in single-kid accounts "all" still
      // resolves to that one child (the only safe inference).
      const childId = selectedChildId !== 'all' ? selectedChildId : children[0]?.id
      if (!childId) throw new Error('Select a child first')

      if (routineEditing) {
        await supabase.from('child_routines').update({
          name: routineForm.name,
          type: routineForm.type,
          time: routineForm.time,
          days_of_week: routineForm.days,
        }).eq('id', routineEditing.id)
      } else {
        await supabase.from('child_routines').insert({
          child_id: childId,
          user_id: session.user.id,
          type: routineForm.type,
          name: routineForm.name,
          time: routineForm.time,
          days_of_week: routineForm.days,
          value: null,
        })
      }
      setRoutineEditing(null)
      setRoutineForm({ name: '', type: 'activity', time: '09:00', days: [0,1,2,3,4,5,6] })
      fetchRoutines()
    } catch (e: any) {
      Alert.alert(t('common_error'), e.message)
    } finally {
      setRoutineSaving(false)
    }
  }

  // Native confirm — a second Modal (DiffuseSheet) stacked on the already-open
  // routine-manager Modal doesn't reliably present on iOS, so the old in-app
  // confirm sheet silently did nothing. Alert.alert always sits above any modal.
  function deleteRoutine(id: string) {
    Alert.alert(
      t('kids_calendar_deleteRoutineConfirm'),
      t('kids_calendar_deleteRoutineConfirmMsg'),
      [
        { text: t('common_cancel'), style: 'cancel' },
        { text: t('common_delete'), style: 'destructive', onPress: () => performRoutineDelete(id) },
      ],
    )
  }

  async function performRoutineDelete(id: string) {
    if (!id) return
    setRoutineDeleting(true)
    try {
      const { error } = await supabase.from('child_routines').delete().eq('id', id)
      if (error) throw error
      await fetchRoutines()
    } catch (e: any) {
      Alert.alert(t('kids_calendar_alertCouldNotDelete'), e?.message ?? 'Please check your connection and try again.')
    } finally {
      setRoutineDeleting(false)
      setConfirmDeleteRoutineId(null)
    }
  }

  // Batch delete for the Diffuse routine manager's multi-select mode. Confirms
  // once, then deletes all ids in a single query. Returns true on success so the
  // caller can exit select mode.
  function deleteRoutinesMany(ids: string[], onDone?: () => void) {
    if (ids.length === 0) return
    Alert.alert(
      t('kids_calendar_deleteRoutineConfirm'),
      t('kids_calendar_deleteRoutinesConfirmMsg', { count: ids.length }),
      [
        { text: t('common_cancel'), style: 'cancel' },
        {
          text: t('common_delete'),
          style: 'destructive',
          onPress: async () => {
            setRoutineDeleting(true)
            try {
              const { error } = await supabase.from('child_routines').delete().in('id', ids)
              if (error) throw error
              await fetchRoutines()
              onDone?.()
            } catch (e: any) {
              Alert.alert(t('kids_calendar_alertCouldNotDelete'), e?.message ?? 'Please check your connection and try again.')
            } finally {
              setRoutineDeleting(false)
            }
          },
        },
      ],
    )
  }

  function cancelRoutineEdit() {
    setRoutineEditing(null)
    setRoutineForm({ name: '', type: 'activity', time: '09:00', days: [0,1,2,3,4,5,6] })
  }

  async function skipRoutine(routine: ChildRoutine) {
    const date = selectedDate

    // Optimistic UI update — date-keyed so navigating away and back won't clear it
    setDoneByDate((prev) => {
      const next = new Map(prev)
      const set = new Set(next.get(date) ?? [])
      set.add(routine.id)
      next.set(date, set)
      return next
    })

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        // No session — rollback optimistic update
        setDoneByDate((prev) => {
          const next = new Map(prev)
          const set = new Set(next.get(date) ?? [])
          set.delete(routine.id)
          next.set(date, set)
          return next
        })
        return
      }
      const { error } = await supabase.from('child_logs').insert({
        child_id: routine.child_id,
        user_id: session.user.id,
        date,
        type: 'skipped',
        value: JSON.stringify({ routineId: routine.id, routineName: routine.name, routineType: routine.type }),
        notes: null,
        photos: [],
      })
      if (error) {
        // Insert failed — rollback optimistic update
        setDoneByDate((prev) => {
          const next = new Map(prev)
          const set = new Set(next.get(date) ?? [])
          set.delete(routine.id)
          next.set(date, set)
          return next
        })
      }
    } catch {
      // Rollback on unexpected error
      setDoneByDate((prev) => {
        const next = new Map(prev)
        const set = new Set(next.get(date) ?? [])
        set.delete(routine.id)
        next.set(date, set)
        return next
      })
    } finally {
      // Always refresh logs so DB state drives the UI going forward
      fetchLogs()
    }
  }

  async function unskipRoutine(routine: ChildRoutine) {
    const date = selectedDate

    // Find the skipped log for this routine on this day
    const skipLog = selectedDayLogs.find((l) => {
      if (l.type !== 'skipped' || l.date !== date) return false
      try {
        const v = JSON.parse(l.value ?? '{}')
        return v.routineId === routine.id
      } catch {
        return false
      }
    })
    if (!skipLog) return

    // Optimistic UI — remove from done set so routine re-appears as pending
    setDoneByDate((prev) => {
      const next = new Map(prev)
      const set = new Set(next.get(date) ?? [])
      set.delete(routine.id)
      next.set(date, set)
      return next
    })

    const { error } = await supabase.from('child_logs').delete().eq('id', skipLog.id)
    if (error) {
      // Rollback on failure
      setDoneByDate((prev) => {
        const next = new Map(prev)
        const set = new Set(next.get(date) ?? [])
        set.add(routine.id)
        next.set(date, set)
        return next
      })
    }
    fetchLogs()
  }

  function handleRoutineOptions(routine: ChildRoutine) {
    Alert.alert(
      routine.name,
      t('kids_calendar_routineWhatToDo'),
      [
        {
          text: t('kids_calendar_routineSkipToday'),
          onPress: () => skipRoutine(routine),
        },
        {
          text: t('kids_calendar_routineDeleteAll'),
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              t('kids_calendar_routineDeleteConfirmTitle'),
              `Remove "${routine.name}" from all future days?`,
              [
                { text: t('common_cancel'), style: 'cancel' },
                {
                  text: t('common_delete'),
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const { error } = await supabase.from('child_routines').delete().eq('id', routine.id)
                      if (error) throw error
                      await fetchRoutines()
                    } catch (e: any) {
                      Alert.alert(t('kids_calendar_alertCouldNotDelete'), e?.message ?? 'Please check your connection and try again.')
                    }
                  },
                },
              ]
            ),
        },
        { text: t('common_cancel'), style: 'cancel' },
      ]
    )
  }

  async function toggleRoutine(id: string, active: boolean) {
    try {
      const { error } = await supabase.from('child_routines').update({ active: !active }).eq('id', id)
      if (error) throw error
      await fetchRoutines()
    } catch (e: any) {
      Alert.alert(t('kids_calendar_alertCouldNotUpdate'), e?.message ?? 'Please check your connection and try again.')
    }
  }

  // ── Derived data ────────────────────────────────────────────────────────

  /** Routines that were explicitly skipped for the selected day (deduped by sig) */
  const skippedDayRoutines = useMemo(() => {
    const seen = new Set<string>()
    return selectedDayRoutines.filter((r) => {
      if (!isRoutineSkipped(r, selectedDayLogs)) return false
      const sig = routineSig(r)
      if (seen.has(sig)) return false
      seen.add(sig)
      return true
    })
  }, [selectedDayRoutines, selectedDayLogs])

  const nextEvent = useMemo(() => {
    const futureLogs = monthLogs
      .filter((l) => l.date > todayStr)
      .sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at))

    if (futureLogs.length > 0) {
      const log = futureLogs[0]
      const childName = children.find((c) => c.id === log.child_id)?.name ?? 'Child'
      const meta = LOG_META[log.type]
      return {
        label: meta?.label ?? log.type,
        detail: formatLogDisplay(log.type, log.value, log.notes),
        date: log.date,
        childName,
      }
    }
    return null
  }, [monthLogs, todayStr, children])

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: { date: string; day: number; inMonth: boolean; isToday: boolean; isFuture: boolean }[] = []

    for (let i = 0; i < firstDay; i++) {
      days.push({ date: '', day: 0, inMonth: false, isToday: false, isFuture: false })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      days.push({
        date: dateStr,
        day: d,
        inMonth: true,
        isToday: dateStr === todayStr,
        isFuture: dateStr > todayStr,
      })
    }
    return days
  }, [year, month, todayStr])

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1))
    const prevDays = new Date(year, month, 0).getDate()
    const currentDay = parseInt(selectedDate.split('-')[2])
    const newDay = Math.min(currentDay, prevDays)
    setSelectedDate(`${year}-${String(month).padStart(2, '0')}-${String(newDay).padStart(2, '0')}`)
  }

  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1))
    const nextDays = new Date(year, month + 2, 0).getDate()
    const currentDay = parseInt(selectedDate.split('-')[2])
    const newDay = Math.min(currentDay, nextDays)
    setSelectedDate(`${year}-${String(month + 2).padStart(2, '0')}-${String(newDay).padStart(2, '0')}`)
  }

  function prevDay() {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    const next = toDateStr(d)
    setSelectedDate(next)
    const newView = new Date(d.getFullYear(), d.getMonth(), 1)
    if (d.getMonth() !== viewDate.getMonth() || d.getFullYear() !== viewDate.getFullYear()) setViewDate(newView)
  }

  function nextDay() {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() + 1)
    const next = toDateStr(d)
    setSelectedDate(next)
    const newView = new Date(d.getFullYear(), d.getMonth(), 1)
    if (d.getMonth() !== viewDate.getMonth() || d.getFullYear() !== viewDate.getFullYear()) setViewDate(newView)
  }

  function handleDayPress(dateStr: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setSelectedDate(dateStr)
  }

  const monthLabel = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const allLogsForList = useMemo(() => {
    return [...monthLogs]
      .filter((l) => l.date <= todayStr && l.type !== 'skipped')
      .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
  }, [monthLogs, todayStr])

  // Dots under each day in the week strip — one color per child who logged that day (max 3)
  const dotsByDate = useMemo<Record<string, string[]>>(() => {
    const out: Record<string, string[]> = {}
    for (const [date, childIds] of childIdsByDate.entries()) {
      out[date] = Array.from(childIds).slice(0, 3).map((cid) => childColor(childIndexMap.get(cid) ?? 0))
    }
    return out
  }, [childIdsByDate, childIndexMap])

  // ── Timeline rendering ────────────────────────────────────────────────────

  function renderTimelineCards() {
    const selLogs = selectedDayLogs.filter((l) => l.type !== 'skipped')
    const selPending = pendingRoutines
    const dayLabel = formatDayLabel(selectedDate, todayStr, t)
    const summary = [
      selPending.length > 0 && `${selPending.length} pending`,
      selLogs.length > 0 && `${selLogs.length} logged`,
    ].filter(Boolean).join(' · ') || t('kids_calendar_nothingSummary')

    interface Row {
      key: string
      type: string
      time: string
      sortHours: number
      title: string
      subtitle?: string
      /** Diffuse: short value (e.g. "140 ml") shown as an italic accent on the title. */
      accentValue?: string
      /** Diffuse: free-text note shown as the sub line under a logged entry. */
      note?: string
      tint: string
      icon: React.ReactNode
      chip?: { label: string; color: string }
      onPress: () => void
      pulse?: boolean
      logged?: boolean
      loggedBy?: string
    }

    const rows: Row[] = []

    for (const r of selPending) {
      const tintKey = (KIDS_TINT_BY_TYPE as Record<string, string>)[r.type] ?? 'activity'
      const sortHours = r.time ? timeStrToHours(r.time) : 25
      const ci = childIndexMap.get(r.child_id) ?? 0
      const childName = children.find((c) => c.id === r.child_id)?.name
      rows.push({
        key: `r-${r.id}`,
        type: r.type,
        time: r.time ? fmtTime(r.time) : '—',
        sortHours,
        title: r.name,
        subtitle: t('kids_calendar_tapToLogRoutine'),
        tint: tintKey,
        icon: logSticker(r.type, 28, isDark),
        chip: selectedChildId === 'all' && childName ? { label: childName, color: childColor(ci) } : undefined,
        onPress: () => {
          setRoutinePrefill({ routineId: r.id, childId: r.child_id, time: r.time ?? undefined, value: r.value ?? undefined, name: r.name })
          setSheetType((ROUTINE_SHEET_MAP[r.type] ?? 'feeding') as LogType)
        },
      })
    }

    for (const log of selLogs) {
      const tintKey = (KIDS_TINT_BY_TYPE as Record<string, string>)[log.type] ?? 'activity'
      const sortHours = activityTimeHours(log)
      const summaryStr = formatLogDisplay(log.type, log.value, log.notes)
      const ci = childIndexMap.get(log.child_id) ?? 0
      const childName = children.find((c) => c.id === log.child_id)?.name
      // Surface the caregiver who logged this when it wasn't the viewer.
      // (profileNames is populated by fetchLogs after monthLogs returns.)
      const loggedByName =
        log.logged_by && log.logged_by !== currentUserId
          ? profileNames[log.logged_by]
          : undefined
      rows.push({
        key: `l-${log.id}`,
        type: log.type,
        time: activityTimeDisplay(log),
        sortHours,
        title: logTitle(log),
        subtitle: summaryStr || 'Logged',
        // Diffuse: value summary → italic title accent; free-text note → sub line.
        accentValue: formatLogDisplay(log.type, log.value, null) || undefined,
        note: log.notes || undefined,
        tint: tintKey,
        icon: logSticker(log.type, 28, isDark),
        chip: selectedChildId === 'all' && childName ? { label: childName, color: childColor(ci) } : undefined,
        onPress: () => { setSelectedLog(log); setEditing(false) },
        pulse: pulsingLogIds.has(log.id),
        logged: true,
        loggedBy: loggedByName,
      })
    }

    rows.sort((a, b) => a.sortHours - b.sortHours)

    // Index of the first not-yet-logged (pending) row on today's timeline — the
    // "next up" entry the NOW marker sits above. Only shown for today.
    const isToday = selectedDate === todayStr
    const nowHours = new Date().getHours() + new Date().getMinutes() / 60
    const nowInsertIdx = isToday ? rows.findIndex((r) => !r.logged && r.sortHours >= nowHours) : -1
    const nowTimeLabel = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

    // ── Diffuse variant: serif day header + connector-spine timeline (v4 §06) ──
    // A vertical spine threads every entry; each entry is a bloom-node on the
    // line. A "NOW · <time>" marker splits logged (past) from the next-up entry.
    if (diffuse) {
      return (
        <>
          <View style={styles.timelineHeader}>
            <Text style={{ fontFamily: diffuseFont.display, fontSize: 26, letterSpacing: -0.5, color: dt.colors.ink }}>{dayLabel}</Text>
            <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: dt.colors.ink3, marginTop: 4 }}>{summary}</Text>
          </View>

          {rows.length === 0 ? (
            <DiffuseEmptyState
              icon={<DiffuseBloomIcon color={stickers.blue} size={48}><Calendar size={22} color={dt.colors.ink3} strokeWidth={1.5} /></DiffuseBloomIcon>}
              title={t('kids_calendar_nothingPlanned')}
              message={t('kids_calendar_tapToLog')}
            />
          ) : (
            <View>
              {rows.map((r, idx) => (
                <Fragment key={r.key}>
                  {idx === nowInsertIdx ? (
                    <DiffuseNowMarker label={t('kids_calendar_now')} time={nowTimeLabel} />
                  ) : null}
                  <DiffuseTimelineRow
                    type={r.type}
                    time={r.time}
                    title={r.title}
                    accent={r.accentValue}
                    sub={r.logged ? r.note : r.subtitle}
                    chip={r.chip ? { label: r.chip.label } : null}
                    logged={r.logged}
                    active={idx === nowInsertIdx}
                    compact
                    first={idx === 0}
                    last={idx === rows.length - 1}
                    onPress={r.onPress}
                  />
                </Fragment>
              ))}
              {/* NOW after the last row (everything is in the past / already logged). */}
              {isToday && nowInsertIdx === -1 && rows.some((r) => r.logged) ? (
                <DiffuseNowMarker label={t('kids_calendar_now')} time={nowTimeLabel} />
              ) : null}
            </View>
          )}
        </>
      )
    }

    return (
      <>
        <View style={styles.timelineHeader}>
          <Display size={22} color={colors.text}>{dayLabel}</Display>
          <Body size={12} color={colors.textMuted} style={{ marginTop: 2 }}>{summary}</Body>
        </View>

        {rows.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Body size={14} color={colors.textSecondary} align="center">
              {t('kids_calendar_nothingPlanned')}
            </Body>
            <Body size={12} color={colors.textMuted} align="center" style={{ marginTop: 4 }}>
              {t('kids_calendar_tapToLog')}
            </Body>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {rows.map((r) => (
              <View key={r.key} style={styles.timelineRow}>
                <View style={styles.timelineGutter}>
                  <Text style={[styles.timelineTime, { color: colors.textMuted }]}>{r.time}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <ActivityPillCard
                    icon={r.icon}
                    title={r.title}
                    subtitle={r.subtitle}
                    tint={r.tint}
                    chip={r.chip}
                    onPress={r.onPress}
                    pulse={r.pulse}
                    logged={r.logged}
                    loggedBy={r.loggedBy}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </>
    )
  }

  // ── Journey tab: growth leaps per active child ────────────────────────────

  function renderJourney() {
    const activeKid = selectedChildId !== 'all'
      ? children.find((c) => c.id === selectedChildId)
      : (activeChild ?? children[0])
    if (!activeKid) {
      if (diffuse) {
        return (
          <DiffuseEmptyState
            icon={<Character name="baby" size={40} color={stickers.green} />}
            title={t('kids_calendar_addChildToSeeJourney')}
          />
        )
      }
      return (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Body size={14} color={colors.textSecondary} align="center">{t('kids_calendar_addChildToSeeJourney')}</Body>
        </View>
      )
    }
    const birth = new Date(activeKid.birthDate + 'T00:00:00')
    const now = new Date()
    const weekAge = Math.max(0, Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 7)))

    return (
      <KidsJourneyRing
        weekAge={weekAge}
        childName={activeKid.name}
      />
    )
  }

  // ── Visits tab: vaccines / health / notes (future + past) ─────────────────

  function renderVisits() {
    const visitTypes = new Set(['vaccine', 'health', 'temperature', 'medicine', 'note', 'milestone'])
    const visits = monthLogs
      .filter((l) => visitTypes.has(l.type))
      .sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at))

    const upcomingRoutines = routines.filter((r) => visitTypes.has(r.type))

    // ── Diffuse variant ──────────────────────────────────────────────────────
    if (diffuse) {
      const addVisitBtn = (
        <Pressable
          onPress={() => { setRoutinePrefill(null); setSheetType('health') }}
          style={({ pressed }) => [diffuseVisitStyles.addRow, { borderTopColor: dt.colors.line2, opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={{ fontFamily: diffuseFont.monoBold, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: dt.colors.ink }}>
            {t('kids_calendar_addVisit')}
          </Text>
          <DiffuseArrow color={dt.colors.ink3} size={16} />
        </Pressable>
      )

      if (visits.length === 0 && upcomingRoutines.length === 0) {
        return (
          <View>
            <DiffuseEmptyState
              icon={<Character name="checkup" size={40} color={stickers.pink} />}
              title={t('kids_calendar_noVisitsYet')}
              message={t('kids_calendar_visitHint')}
            />
            {addVisitBtn}
          </View>
        )
      }

      const allRows: { key: string; title: string; sub: string; type: string; chip?: string; onPress: () => void }[] = []
      for (const r of upcomingRoutines) {
        const childName = children.find((c) => c.id === r.child_id)?.name ?? ''
        allRows.push({
          key: `r-${r.id}`,
          title: r.name,
          sub: `${r.time ? fmtTime(r.time) + ' · ' : ''}${t('kids_calendar_recurringLabel')}`,
          type: r.type,
          chip: childName || undefined,
          onPress: () => {
            setRoutinePrefill({ routineId: r.id, childId: r.child_id, time: r.time ?? undefined, value: r.value ?? undefined, name: r.name })
            setSheetType((ROUTINE_SHEET_MAP[r.type] ?? 'health') as LogType)
          },
        })
      }
      for (const log of visits) {
        const childName = children.find((c) => c.id === log.child_id)?.name ?? ''
        allRows.push({
          key: `l-${log.id}`,
          title: logTitle(log),
          sub: `${formatDayLabel(log.date, todayStr, t)} · ${formatLogDisplay(log.type, log.value, log.notes) || 'Logged'}`,
          type: log.type,
          chip: childName || undefined,
          onPress: () => { setSelectedLog(log); setEditing(false) },
        })
      }

      return (
        <View>
          <View style={styles.timelineHeader}>
            <Text style={{ fontFamily: diffuseFont.display, fontSize: 26, letterSpacing: -0.5, color: dt.colors.ink }}>{t('kids_calendar_visits')}</Text>
            <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: dt.colors.ink3, marginTop: 4 }}>{t('kids_calendar_visitsStats', { logged: visits.length, scheduled: upcomingRoutines.length })}</Text>
          </View>
          {allRows.map((r, idx) => (
            <DiffuseListRow
              key={r.key}
              title={r.title}
              sub={r.sub}
              icon={<DiffuseLogIcon type={r.type} size={34} inkColor={dt.colors.ink3} />}
              onPress={r.onPress}
              last={idx === allRows.length - 1}
              trailing={
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {r.chip ? (
                    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderColor: dt.colors.line2 }}>
                      <Text style={{ fontFamily: diffuseFont.mono, fontSize: 9, letterSpacing: 0.8, textTransform: 'uppercase', color: dt.colors.ink3 }}>{r.chip}</Text>
                    </View>
                  ) : null}
                  <DiffuseArrow color={dt.colors.ink3} size={15} />
                </View>
              }
            />
          ))}
          {addVisitBtn}
        </View>
      )
    }

    if (visits.length === 0 && upcomingRoutines.length === 0) {
      return (
        <View style={{ gap: 10 }}>
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Body size={14} color={colors.textSecondary} align="center">{t('kids_calendar_noVisitsYet')}</Body>
            <Body size={12} color={colors.textMuted} align="center" style={{ marginTop: 4 }}>
              {t('kids_calendar_visitHint')}
            </Body>
          </View>
          <Pressable
            onPress={() => { setRoutinePrefill(null); setSheetType('health') }}
            style={[styles.addVisitBtn, { backgroundColor: brand.kids }]}
          >
            <Plus size={18} color="#fff" strokeWidth={3} />
            <Text style={styles.addVisitBtnText}>{t('kids_calendar_addVisit')}</Text>
          </Pressable>
        </View>
      )
    }

    return (
      <View style={{ gap: 10 }}>
        <View style={styles.timelineHeader}>
          <Display size={22} color={colors.text}>{t('kids_calendar_visits')}</Display>
          <Body size={12} color={colors.textMuted} style={{ marginTop: 2 }}>{t('kids_calendar_visitsStats', { logged: visits.length, scheduled: upcomingRoutines.length })}</Body>
        </View>

        {upcomingRoutines.map((r) => {
          const ci = childIndexMap.get(r.child_id) ?? 0
          const childName = children.find((c) => c.id === r.child_id)?.name ?? ''
          return (
            <ActivityPillCard
              key={`r-${r.id}`}
              icon={logSticker(r.type, 28, isDark)}
              title={r.name}
              subtitle={`${r.time ? fmtTime(r.time) + ' · ' : ''}${t('kids_calendar_recurringLabel')}`}
              tint="health"
              chip={childName ? { label: childName, color: childColor(ci) } : undefined}
              onPress={() => {
                setRoutinePrefill({ routineId: r.id, childId: r.child_id, time: r.time ?? undefined, value: r.value ?? undefined, name: r.name })
                setSheetType((ROUTINE_SHEET_MAP[r.type] ?? 'health') as LogType)
              }}
            />
          )
        })}

        {visits.map((log) => {
          const ci = childIndexMap.get(log.child_id) ?? 0
          const childName = children.find((c) => c.id === log.child_id)?.name ?? ''
          return (
            <ActivityPillCard
              key={`l-${log.id}`}
              icon={logSticker(log.type, 28, isDark)}
              title={logTitle(log)}
              subtitle={`${formatDayLabel(log.date, todayStr, t)} · ${formatLogDisplay(log.type, log.value, log.notes) || 'Logged'}`}
              tint="health"
              chip={childName ? { label: childName, color: childColor(ci) } : undefined}
              onPress={() => { setSelectedLog(log); setEditing(false) }}
            />
          )
        })}

        <Pressable
          onPress={() => { setRoutinePrefill(null); setSheetType('health') }}
          style={[styles.addVisitBtn, { backgroundColor: brand.kids }]}
        >
          <Plus size={18} color="#fff" strokeWidth={3} />
          <Text style={styles.addVisitBtnText}>{t('kids_calendar_addVisit')}</Text>
        </Pressable>
      </View>
    )
  }

  // ── Kid selector layout strategy ──────────────────────────────────────────
  // ≤ 4 kids: show every kid inline (no overflow needed).
  // ≥ 5 kids: show "All Kids" + the active kid + a "+N more" pill that opens
  // an overflow sheet with the full list. Horizontal scroll is still possible
  // for power users, but the visible row stays compact and never collides
  // with the bell.
  const KID_PILL_LIMIT = 4
  const tooManyKids = children.length > KID_PILL_LIMIT
  const visibleKids = !tooManyKids
    ? children
    : children.filter((c) => c.id === selectedChildId)
  const hiddenKidsCount = children.length - visibleKids.length
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.10)'
  const fadeBg = diffuse ? dt.colors.bg : (isDark ? colors.bg : '#F0E5D2')
  const fadeTransparent = fadeBg + '00'

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Sticky top: child selector + segmented tabs (always visible across tabs) */}
      <View style={{ paddingTop: insets.top + 12, paddingLeft: 16, paddingRight: 20 }}>
        {/* 1. Child Selector Row — pills + inline "+" add-log button */}
        <View style={styles.childRowWrap}>
          <View style={styles.childScrollClip}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.childSelectorRow}
            >
              {(() => {
                const ST_INK = '#141313'
                const ST_LILAC = '#C8B6E8'
                const allActive = selectedChildId === 'all'
                // ── Diffuse: hairline mono pill (active = hairline border + surface) ──
                if (diffuse) {
                  return (
                    <Pressable
                      onPress={() => setSelectedChildId('all')}
                      style={({ pressed }) => [
                        styles.childSelectorChip,
                        {
                          backgroundColor: allActive ? dt.colors.surface : 'transparent',
                          borderColor: allActive ? dt.colors.hairline : dt.colors.line,
                          borderWidth: 1,
                          borderRadius: radius.full,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <Text style={[styles.childSelectorText, { fontFamily: allActive ? diffuseFont.monoBold : diffuseFont.mono, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: allActive ? dt.colors.ink : dt.colors.ink3 }]}>
                        {t('kids_calendar_allKids')}
                      </Text>
                    </Pressable>
                  )
                }
                return (
                  <Pressable
                    onPress={() => setSelectedChildId('all')}
                    style={({ pressed }) => [
                      styles.childSelectorChip,
                      {
                        backgroundColor: allActive ? ST_LILAC : (colors.surface),
                        borderColor: allActive ? ST_INK : paperBorder,
                        borderWidth: allActive ? 1.5 : 1,
                        borderRadius: radius.full,
                        shadowColor: ST_INK,
                        shadowOffset: { width: 0, height: allActive ? (pressed ? 1 : 3) : 0 },
                        shadowOpacity: allActive ? 1 : 0,
                        shadowRadius: 0,
                        elevation: allActive ? 4 : 0,
                        transform: [{ translateY: allActive && pressed ? 2 : 0 }],
                      },
                    ]}
                  >
                    <Text style={[styles.childSelectorText, { fontFamily: allActive ? font.bodyBold : font.bodySemiBold, color: allActive ? ST_INK : (colors.text) }]}>
                      {t('kids_calendar_allKids')}
                    </Text>
                  </Pressable>
                )
              })()}
              {visibleKids.map((c) => {
                const ST_INK = '#141313'
                const i = children.findIndex((ch) => ch.id === c.id)
                const active = selectedChildId === c.id
                const kidColor = childColor(i)
                // ── Diffuse: hairline pill; child dot stays as its color bloom-tone ──
                if (diffuse) {
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => {
                        setSelectedChildId(c.id)
                        setActiveChild(c)
                      }}
                      style={({ pressed }) => [
                        styles.childSelectorChip,
                        {
                          backgroundColor: active ? dt.colors.surface : 'transparent',
                          borderColor: active ? dt.colors.hairline : dt.colors.line,
                          borderWidth: 1,
                          borderRadius: radius.full,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <View style={[styles.childDot, { backgroundColor: kidColor }]} />
                      <Text style={[styles.childSelectorText, { fontFamily: active ? diffuseFont.monoBold : diffuseFont.mono, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: active ? dt.colors.ink : dt.colors.ink3 }]}>
                        {c.name}
                      </Text>
                    </Pressable>
                  )
                }
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => {
                      setSelectedChildId(c.id)
                      setActiveChild(c)
                    }}
                    style={({ pressed }) => [
                      styles.childSelectorChip,
                      {
                        backgroundColor: active ? kidColor : (colors.surface),
                        borderColor: active ? ST_INK : paperBorder,
                        borderWidth: active ? 1.5 : 1,
                        borderRadius: radius.full,
                        shadowColor: ST_INK,
                        shadowOffset: { width: 0, height: active ? (pressed ? 1 : 3) : 0 },
                        shadowOpacity: active ? 1 : 0,
                        shadowRadius: 0,
                        elevation: active ? 4 : 0,
                        transform: [{ translateY: active && pressed ? 2 : 0 }],
                      },
                    ]}
                  >
                    <View style={[styles.childDot, { backgroundColor: active ? ST_INK : kidColor }]} />
                    <Text style={[styles.childSelectorText, { fontFamily: active ? font.bodyBold : font.bodySemiBold, color: active ? ST_INK : (colors.text) }]}>
                      {c.name}
                    </Text>
                  </Pressable>
                )
              })}
              {hiddenKidsCount > 0 && (
                <Pressable
                  onPress={() => setKidPickerOpen(true)}
                  style={({ pressed }) => [
                    styles.childSelectorChip,
                    diffuse
                      ? {
                          backgroundColor: 'transparent',
                          borderColor: dt.colors.line,
                          borderWidth: 1,
                          borderRadius: radius.full,
                          opacity: pressed ? 0.7 : 1,
                        }
                      : {
                          backgroundColor: colors.surface,
                          borderColor: paperBorder,
                          borderWidth: 1,
                          borderRadius: radius.full,
                        },
                  ]}
                >
                  <Text style={[styles.childSelectorText, diffuse ? { fontFamily: diffuseFont.monoBold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: dt.colors.ink3 } : { fontFamily: font.bodyBold, color: colors.text }]}>
                    {t('kids_calendar_moreKids', { count: hiddenKidsCount })}
                  </Text>
                </Pressable>
              )}
            </ScrollView>

            {/* Right-edge fade so pills don't visually collide with the bell */}
            <LinearGradient
              colors={[fadeTransparent, fadeBg]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              pointerEvents="none"
              style={styles.childScrollFade}
            />
          </View>

          {/* Add-log "+" — inline with child pills per mock */}
          {diffuse ? (
            <Pressable
              onPress={() => setLogSheetOpen(true)}
              hitSlop={8}
              style={({ pressed }) => [
                styles.addLogBtnDiffuse,
                { borderColor: dt.colors.hairline, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <SoftBloom color={getDiffuseAccent('kids', isDark)} opacity={isDark ? 0.4 : 0.5} spread={0.42} radius="50%" />
              <Plus size={18} color={dt.colors.ink} strokeWidth={1.8} />
            </Pressable>
          ) : (
          <Pressable
            onPress={() => setLogSheetOpen(true)}
            style={({ pressed }) => [
              styles.addLogBtn,
              {
                backgroundColor: brand.kids,
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.94 : 1 }],
              },
            ]}
          >
            <Plus size={18} color="#FFFEF8" strokeWidth={2.5} />
          </Pressable>
          )}
        </View>

        {/* 2. View Toggle */}
        <View style={styles.toggleWrap}>
          <SegmentedTabs
            options={[
              { key: 'timeline', label: t('kids_calendar_tabTimeline') },
              { key: 'visits', label: t('kids_calendar_tabVisits') },
            ]}
            value={view}
            onChange={(k) => setView(k as 'timeline' | 'visits')}
            activeBg={isDark ? brand.kids + '40' : '#9EC5FF'}
            activeFg={colors.text}
          />
        </View>
      </View>

      {/* Tab content — Journey lives outside the ScrollView so its rotating ring
          PanResponder doesn't fight a parent vertical-scroll gesture. */}
      {view === 'journey' ? (
        renderJourney()
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
        {view === 'timeline' ? (
          <>
            {diffuse ? (
              <>
                {/* Month grid (default) vs. compact week strip — toggle chip. */}
                <View style={styles.calViewToggle}>
                  <Pressable onPress={() => setCalView('month')} hitSlop={6} style={[styles.calViewChip, calView === 'month' && { backgroundColor: dt.colors.surface, borderColor: dt.colors.hairline }]}>
                    <Text style={[styles.calViewChipText, { color: calView === 'month' ? dt.colors.ink : dt.colors.ink3, fontFamily: calView === 'month' ? diffuseFont.monoBold : diffuseFont.mono }]}>{t('kids_calendar_viewMonth')}</Text>
                  </Pressable>
                  <Pressable onPress={() => setCalView('week')} hitSlop={6} style={[styles.calViewChip, calView === 'week' && { backgroundColor: dt.colors.surface, borderColor: dt.colors.hairline }]}>
                    <Text style={[styles.calViewChipText, { color: calView === 'week' ? dt.colors.ink : dt.colors.ink3, fontFamily: calView === 'week' ? diffuseFont.monoBold : diffuseFont.mono }]}>{t('kids_calendar_viewWeek')}</Text>
                  </Pressable>
                </View>
                {calView === 'month' ? (
                  <LogMonthGrid
                    mode="kids"
                    selectedDate={selectedDate}
                    visibleMonth={{ year, month }}
                    onSelectDate={handleDayPress}
                    onPrevMonth={() => setViewDate(new Date(year, month - 1, 1))}
                    onNextMonth={() => setViewDate(new Date(year, month + 1, 1))}
                    logsByDate={monthGridByDate}
                  />
                ) : (
                  <View style={[styles.weekStripCard, { backgroundColor: dt.colors.surface, borderColor: dt.colors.line }]}>
                    <DiffuseWeekStrip
                      selectedDate={selectedDate}
                      onSelectDate={handleDayPress}
                      dotsByDate={dotsByDate}
                      logTypesByDate={monthGridByDate}
                    />
                  </View>
                )}
              </>
            ) : (
              <AgendaWeekStrip
                selectedDate={selectedDate}
                onSelectDate={handleDayPress}
                dotsByDate={dotsByDate}
                modeColor={brand.kids}
              />
            )}
            <View style={{ height: 12 }} />
            {renderTimelineCards()}
          </>
        ) : (
          renderVisits()
        )}
        </ScrollView>
      )}

      {/* ─── Log Activity Sheet (opened by header "+") ──────────────────── */}
      <LogActivitySheet
        open={logSheetOpen}
        onClose={() => setLogSheetOpen(false)}
        onSelect={(type) => { setRoutinePrefill(null); setSheetType(type) }}
        onManageRoutines={() => setShowRoutineManager(true)}
      />

      {/* ─── Kid Picker Sheet (opened by "+N more" pill) ────────────────── */}
      {diffuse && (
        <DiffuseSheet visible={kidPickerOpen} onClose={() => setKidPickerOpen(false)} title={t('kids_calendar_pickAKid')}>
          <DiffuseListRow
            title={t('kids_calendar_allKids')}
            sub={t('kids_calendar_nKids', { n: children.length })}
            onPress={() => { setSelectedChildId('all'); setKidPickerOpen(false) }}
            icon={<DiffuseBloomIcon color={stickers.lilac} size={34}><Baby size={17} color={dt.colors.ink3} strokeWidth={1.6} /></DiffuseBloomIcon>}
            trailing={selectedChildId === 'all' ? <Check size={16} color={dt.colors.success} strokeWidth={2} /> : <DiffuseArrow color={dt.colors.ink3} size={15} />}
          />
          {children.map((c, i) => {
            const active = selectedChildId === c.id
            return (
              <DiffuseListRow
                key={c.id}
                title={c.name}
                onPress={() => { setSelectedChildId(c.id); setActiveChild(c); setKidPickerOpen(false) }}
                icon={<DiffuseBloomIcon color={childColor(i)} size={34}><Baby size={17} color={dt.colors.ink3} strokeWidth={1.6} /></DiffuseBloomIcon>}
                last={i === children.length - 1}
                trailing={active ? <Check size={16} color={dt.colors.success} strokeWidth={2} /> : <DiffuseArrow color={dt.colors.ink3} size={15} />}
              />
            )
          })}
        </DiffuseSheet>
      )}
      {!diffuse && (
      <Modal visible={kidPickerOpen} transparent animationType="slide" onRequestClose={() => setKidPickerOpen(false)}>
        <Pressable style={styles.kidPickerOverlay} onPress={() => setKidPickerOpen(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.kidPickerSheet,
              {
                backgroundColor: isDark ? colors.bg : '#FFFEF8',
                borderColor: isDark ? colors.border : '#141313',
                paddingBottom: insets.bottom + 20,
              },
            ]}
          >
            <View style={{ alignItems: 'center', paddingTop: 10 }}>
              <View style={{ width: 42, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
            </View>
            <View style={styles.kidPickerHeader}>
              <Text style={[styles.kidPickerTitle, { color: colors.text, fontFamily: font.displayBold }]}>
                {t('kids_calendar_pickAKid')}
              </Text>
              <Pressable
                onPress={() => setKidPickerOpen(false)}
                hitSlop={12}
                style={{
                  width: 32, height: 32, borderRadius: 999,
                  backgroundColor: colors.surface,
                  borderWidth: 1.2, borderColor: isDark ? colors.border : '#141313',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={14} color={colors.text} strokeWidth={2.4} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8, gap: 8 }}>
              {/* All Kids row */}
              <Pressable
                onPress={() => { setSelectedChildId('all'); setKidPickerOpen(false) }}
                style={[
                  styles.kidPickerRow,
                  {
                    backgroundColor: colors.surface,
                    borderColor: selectedChildId === 'all' ? '#141313' : (isDark ? colors.border : 'rgba(20,19,19,0.10)'),
                    borderWidth: selectedChildId === 'all' ? 1.5 : 1,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {children.slice(0, 4).map((c, i) => (
                    <View
                      key={c.id}
                      style={{
                        width: 18, height: 18, borderRadius: 9,
                        backgroundColor: childColor(i),
                        borderWidth: 1.2, borderColor: '#141313',
                        marginLeft: i === 0 ? 0 : -6,
                      }}
                    />
                  ))}
                </View>
                <Text style={[styles.kidPickerName, { color: colors.text, fontFamily: font.bodyBold }]}>
                  {t('kids_calendar_allKids')}
                </Text>
                <Text style={[styles.kidPickerMeta, { color: colors.textMuted, fontFamily: font.bodyMedium }]}>
                  {t('kids_calendar_nKids', { n: children.length })}
                </Text>
              </Pressable>

              {children.map((c, i) => {
                const active = selectedChildId === c.id
                const kc = childColor(i)
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => { setSelectedChildId(c.id); setActiveChild(c); setKidPickerOpen(false) }}
                    style={[
                      styles.kidPickerRow,
                      {
                        backgroundColor: active ? kc + '22' : (colors.surface),
                        borderColor: active ? '#141313' : (isDark ? colors.border : 'rgba(20,19,19,0.10)'),
                        borderWidth: active ? 1.5 : 1,
                      },
                    ]}
                  >
                    <View style={{
                      width: 32, height: 32, borderRadius: 16,
                      backgroundColor: kc, borderWidth: 1.2, borderColor: '#141313',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ fontFamily: font.displayBold, fontSize: 13, color: '#141313' }}>
                        {c.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.kidPickerName, { color: colors.text, fontFamily: font.bodyBold }]}>
                      {c.name}
                    </Text>
                    {active && (
                      <View style={{
                        paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999,
                        backgroundColor: kc, borderWidth: 1, borderColor: '#141313',
                      }}>
                        <Text style={{ fontSize: 10, fontFamily: font.bodyBold, color: '#141313' }}>{t('kids_calendar_selected')}</Text>
                      </View>
                    )}
                  </Pressable>
                )
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
      )}

      {/* ─── Bottom Sheets ────────────────────────────────────────────── */}

      <LogSheet visible={sheetType === 'feeding'} title={editingLog ? t('kids_calendar_logSheet_editEntry') : (routinePrefill?.name ?? t('kids_calendar_logSheet_feeding'))} onClose={closeSheet}>
        <FeedingForm onSaved={handleSaved} initialDate={selectedDate} prefill={routinePrefill ?? undefined} editLog={editingLog ?? undefined} onSkip={routinePrefill?.routineId ? () => { skipRoutine({ id: routinePrefill!.routineId!, child_id: routinePrefill!.childId, name: routinePrefill!.name ?? '', type: 'feeding', value: routinePrefill!.value ?? null, days_of_week: [], time: routinePrefill!.time ?? null, active: true }); closeSheet() } : undefined} />
      </LogSheet>

      <LogSheet visible={sheetType === 'sleep'} title={editingLog ? t('kids_calendar_logSheet_editEntry') : (routinePrefill?.name ?? t('kids_calendar_logSheet_sleep'))} onClose={closeSheet}>
        <SleepForm onSaved={handleSaved} initialDate={selectedDate} prefill={routinePrefill ?? undefined} editLog={editingLog ?? undefined} onSkip={routinePrefill?.routineId ? () => { skipRoutine({ id: routinePrefill!.routineId!, child_id: routinePrefill!.childId, name: routinePrefill!.name ?? '', type: 'sleep', value: routinePrefill!.value ?? null, days_of_week: [], time: routinePrefill!.time ?? null, active: true }); closeSheet() } : undefined} />
      </LogSheet>

      <LogSheet visible={sheetType === 'wake_up'} title={routinePrefill?.name ?? t('kids_calendar_logSheet_wakeUp')} onClose={closeSheet}>
        <WakeUpForm onSaved={handleSaved} prefill={routinePrefill ?? undefined} onSkip={routinePrefill?.routineId ? () => { skipRoutine({ id: routinePrefill!.routineId!, child_id: routinePrefill!.childId, name: routinePrefill!.name ?? '', type: 'wake_up', value: routinePrefill!.value ?? null, days_of_week: [], time: routinePrefill!.time ?? null, active: true }); closeSheet() } : undefined} />
      </LogSheet>

      <LogSheet visible={sheetType === 'health'} title={editingLog ? t('kids_calendar_logSheet_editEntry') : (routinePrefill?.name ?? t('kids_calendar_logSheet_health'))} onClose={closeSheet}>
        <HealthEventForm onSaved={handleSaved} initialDate={selectedDate} prefill={routinePrefill ?? undefined} editLog={editingLog ?? undefined} onSkip={routinePrefill?.routineId ? () => { skipRoutine({ id: routinePrefill!.routineId!, child_id: routinePrefill!.childId, name: routinePrefill!.name ?? '', type: 'health', value: routinePrefill!.value ?? null, days_of_week: [], time: routinePrefill!.time ?? null, active: true }); closeSheet() } : undefined} />
      </LogSheet>

      <LogSheet visible={sheetType === 'mood'} title={editingLog ? t('kids_calendar_logSheet_editEntry') : (routinePrefill?.name ?? t('kids_calendar_logSheet_mood'))} onClose={closeSheet}>
        <KidsMoodForm onSaved={handleSaved} initialDate={selectedDate} prefill={routinePrefill ?? undefined} editLog={editingLog ?? undefined} onSkip={routinePrefill?.routineId ? () => { skipRoutine({ id: routinePrefill!.routineId!, child_id: routinePrefill!.childId, name: routinePrefill!.name ?? '', type: 'mood', value: routinePrefill!.value ?? null, days_of_week: [], time: routinePrefill!.time ?? null, active: true }); closeSheet() } : undefined} />
      </LogSheet>

      <LogSheet visible={sheetType === 'activity'} title={editingLog ? t('kids_calendar_logSheet_editEntry') : (routinePrefill?.name ?? t('kids_calendar_logSheet_activity'))} onClose={closeSheet}>
        <ActivityForm onSaved={handleSaved} initialDate={selectedDate} prefill={routinePrefill ?? undefined} editLog={editingLog ?? undefined} onSkip={routinePrefill?.routineId ? () => { skipRoutine({ id: routinePrefill!.routineId!, child_id: routinePrefill!.childId, name: routinePrefill!.name ?? '', type: 'activity', value: routinePrefill!.value ?? null, days_of_week: [], time: routinePrefill!.time ?? null, active: true }); closeSheet() } : undefined} />
      </LogSheet>

      <LogSheet visible={sheetType === 'memory'} title={t('kids_calendar_logSheet_memory')} onClose={closeSheet}>
        <MemoryForm onSaved={handleSaved} initialDate={selectedDate} />
      </LogSheet>

      <LogSheet visible={sheetType === 'diaper'} title={editingLog ? t('kids_calendar_logSheet_editDiaper') : t('kids_calendar_logSheet_diaper')} onClose={closeSheet}>
        <DiaperForm onSaved={handleSaved} initialDate={selectedDate} editLog={editingLog ?? undefined} />
      </LogSheet>

      <LogSheet visible={sheetType === 'exam'} title={t('kids_calendar_logSheet_exam')} onClose={closeSheet}>
        <ExamForm
          behavior="kids"
          childId={selectedChildId !== 'all' ? selectedChildId : (activeChild?.id ?? children[0]?.id ?? null)}
          date={selectedDate}
          onSaved={handleSaved}
        />
      </LogSheet>

      {/* ─── Routine Manager (Diffuse) ─────────────────────────────── */}
      {diffuse && (
        <DiffuseRoutineManager
          visible={showRoutineManager || !!routineEditing}
          onClose={() => {
            setShowRoutineManager(false)
            setRoutineEditing(null)
            setRoutineFilterKid(null)
            setRoutineForm({ name: '', type: 'activity', time: '09:00', days: [0,1,2,3,4,5,6] })
          }}
          routines={routines}
          children={children}
          routineForm={routineForm}
          setRoutineForm={setRoutineForm}
          routineEditing={routineEditing}
          setRoutineEditing={(r) => {
            setRoutineEditing(r)
            if (!r) setRoutineForm({ name: '', type: 'activity', time: '09:00', days: [0,1,2,3,4,5,6] })
          }}
          routineSaving={routineSaving}
          onSave={saveRoutine}
          onDelete={deleteRoutine}
          onDeleteMany={deleteRoutinesMany}
          routineFilterKid={routineFilterKid}
          setRoutineFilterKid={setRoutineFilterKid}
          t={t}
        />
      )}

      {/* ─── Routine Manager (sticker-on-paper) ─────────────────────── */}
      {!diffuse && (
      <Modal
        visible={showRoutineManager}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowRoutineManager(false)
          setRoutineEditing(null)
          setRoutineFilterKid(null)
          // Reset the form so a stale name/type from a half-finished edit
          // doesn't bleed into the next open.
          setRoutineForm({ name: '', type: 'activity', time: '09:00', days: [0,1,2,3,4,5,6] })
        }}
      >
        {(() => {
          const ST_INK = colors.text
          const ST_PAPER = colors.surface
          const ST_CREAM = colors.surfaceRaised
          const ST_SHEET = colors.surfaceRaised
          // Mode-colored accent (powder blue for Kids), matching how the
          // Pregnancy routine manager uses getModeColor('preg', …) for lavender.
          const ST_PURPLE = getModeColor('kids', isDark)
          const closeManager = () => {
            setShowRoutineManager(false)
            setRoutineEditing(null)
            setRoutineFilterKid(null)
            setRoutineForm({ name: '', type: 'activity', time: '09:00', days: [0,1,2,3,4,5,6] })
          }
          return (
            <>
              <Pressable style={styles.popupBackdrop} onPress={closeManager} />
              <View
                style={[
                  styles.popupSheet,
                  {
                    backgroundColor: ST_SHEET,
                    borderTopLeftRadius: radius.xl,
                    borderTopRightRadius: radius.xl,
                    borderTopWidth: 1.5,
                    borderLeftWidth: 1.5,
                    borderRightWidth: 1.5,
                    borderColor: isDark ? colors.border : ST_INK,
                    paddingBottom: insets.bottom + 20,
                  },
                ]}
              >
                {/* Drag handle */}
                <View style={styles.popupHandleWrap}>
                  <View style={[styles.popupHandle, { backgroundColor: isDark ? colors.border : colors.borderLight }]} />
                </View>

                {/* Header */}
                <View style={[styles.popupHeader, { paddingBottom: 12 }]}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: radius.full,
                      backgroundColor: isDark ? colors.surfaceRaised : brand.primaryTint,
                      borderWidth: 1.5,
                      borderColor: ST_INK,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Repeat size={22} color={ST_PURPLE} strokeWidth={2.2} />
                  </View>
                  <View style={styles.popupHeaderText}>
                    <Text style={{ color: isDark ? colors.text : ST_INK, fontSize: 24, letterSpacing: -0.5, fontFamily: font.display }}>
                      {t('kids_calendar_routines')}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 13, fontFamily: font.bodyMedium }}>
                      {t('kids_calendar_routinesSubtitle')}
                    </Text>
                  </View>
                  <Pressable
                    onPress={closeManager}
                    style={({ pressed }) => ({
                      width: 36, height: 36, borderRadius: radius.full,
                      backgroundColor: ST_CREAM,
                      borderWidth: 1.5, borderColor: ST_INK,
                      alignItems: 'center', justifyContent: 'center',
                      shadowColor: ST_INK,
                      shadowOffset: { width: 0, height: pressed ? 1 : 2 },
                      shadowOpacity: 1, shadowRadius: 0, elevation: 3,
                      transform: [{ translateY: pressed ? 1 : 0 }],
                    })}
                  >
                    <X size={15} color={ST_INK} strokeWidth={2.5} />
                  </Pressable>
                </View>

                <ScrollView style={styles.popupBody} showsVerticalScrollIndicator={false}>
                  {/* ─── New Routine Form (paper card) — hidden while editing ── */}
                  {!routineEditing && (
                  <View
                    style={{
                      backgroundColor: ST_PAPER,
                      borderRadius: radius.lg,
                      borderWidth: 1.5,
                      borderColor: isDark ? colors.border : ST_INK,
                      padding: 16,
                      gap: 12,
                      shadowColor: ST_INK,
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: isDark ? 0 : 0.12,
                      shadowRadius: 0,
                      elevation: 2,
                    }}
                  >
                    <Text style={{ color: isDark ? colors.text : ST_INK, fontSize: 18, fontFamily: font.displayBold, letterSpacing: -0.3 }}>
                      {t('kids_calendar_newRoutine')}
                    </Text>
                    {/* (form fields below — duplicated in Edit Modal) */}

                    {/* Name */}
                    <View style={{
                      backgroundColor: ST_CREAM,
                      borderColor: isDark ? colors.border : ST_INK,
                      borderWidth: 1.5,
                      borderRadius: radius.full,
                      height: 56,
                      justifyContent: 'center',
                    }}>
                      <TextInput
                        value={routineForm.name}
                        onChangeText={(t) => setRoutineForm((f) => ({ ...f, name: t }))}
                        placeholder="Routine name (e.g. Morning bottle)"
                        placeholderTextColor={colors.textMuted}
                        underlineColorAndroid="transparent"
                        style={{
                          color: isDark ? colors.text : ST_INK,
                          paddingHorizontal: 22,
                          paddingVertical: 0,
                          fontSize: 15,
                          fontFamily: font.bodySemiBold,
                        }}
                      />
                    </View>

                    {/* Type chips */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4, paddingHorizontal: 2 }}>
                      {['feeding', 'food', 'sleep', 'diaper', 'activity', 'mood', 'health'].map((rtype) => {
                        const meta = LOG_META[rtype]
                        const active = routineForm.type === rtype
                        // Solid pastel fills (avoid alpha — hard shadow bleeds through translucent bgs on iOS)
                        const activeBgLight = ({
                          feeding: stickers.blueSoft,
                          food: stickers.blueSoft,
                          sleep: stickers.lilacSoft,
                          diaper: stickers.blueSoft,
                          activity: stickers.greenSoft,
                          mood: stickers.peachSoft,
                          health: stickers.pinkSoft,
                        } as Record<string, string>)[rtype] || brand.primaryTint
                        const activeBg = isDark ? meta.color : activeBgLight
                        const labelColor = active ? (isDark ? '#FFF' : ST_INK) : (isDark ? colors.text : ST_INK)
                        return (
                          <Pressable
                            key={rtype}
                            onPress={() => setRoutineForm((f) => ({ ...f, type: rtype }))}
                            style={({ pressed }) => ({
                              paddingHorizontal: 14,
                              paddingVertical: 8,
                              borderRadius: radius.full,
                              borderWidth: 1.5,
                              borderColor: isDark && !active ? colors.border : ST_INK,
                              backgroundColor: active ? activeBg : ST_CREAM,
                              shadowColor: ST_INK,
                              shadowOffset: { width: 0, height: active ? (pressed ? 1 : 2) : 0 },
                              shadowOpacity: active ? (1) : 0,
                              shadowRadius: 0, elevation: active ? 3 : 0,
                              transform: [{ translateY: active && pressed ? 1 : 0 }],
                            })}
                          >
                            <Text style={{ color: labelColor, fontSize: 13, fontFamily: active ? font.bodyBold : font.bodySemiBold }}>
                              {t(meta.labelKey)}
                            </Text>
                          </Pressable>
                        )
                      })}
                    </ScrollView>

                    {/* Time */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{
                        width: 32, height: 32, borderRadius: radius.full,
                        backgroundColor: ST_CREAM, borderWidth: 1.5, borderColor: isDark ? colors.border : ST_INK,
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Clock size={14} color={isDark ? colors.text : ST_INK} strokeWidth={2.2} />
                      </View>
                      <TextInput
                        value={routineForm.time}
                        onChangeText={(txt) => setRoutineForm((f) => ({ ...f, time: txt }))}
                        placeholder="HH:MM"
                        placeholderTextColor={colors.textMuted}
                        style={{
                          flex: 1,
                          color: isDark ? colors.text : ST_INK,
                          backgroundColor: ST_CREAM,
                          borderColor: isDark ? colors.border : ST_INK,
                          borderWidth: 1.5,
                          borderRadius: radius.full,
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          fontSize: 15,
                          fontFamily: font.bodySemiBold,
                        }}
                        keyboardType="numbers-and-punctuation"
                      />
                    </View>

                    {/* Days */}
                    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'space-between' }}>
                      {DAY_NAMES.map((name, i) => {
                        const active = routineForm.days.includes(i)
                        return (
                          <Pressable
                            key={i}
                            onPress={() => setRoutineForm((f) => ({
                              ...f,
                              days: active ? f.days.filter((d) => d !== i) : [...f.days, i].sort(),
                            }))}
                            style={({ pressed }) => ({
                              width: 36, height: 36, borderRadius: radius.full,
                              alignItems: 'center', justifyContent: 'center',
                              borderWidth: 1.5, borderColor: isDark && !active ? colors.border : ST_INK,
                              backgroundColor: active ? ST_PURPLE : ST_CREAM,
                              shadowColor: ST_INK,
                              shadowOffset: { width: 0, height: active ? (pressed ? 1 : 2) : 0 },
                              shadowOpacity: active ? (1) : 0,
                              shadowRadius: 0, elevation: active ? 3 : 0,
                              transform: [{ translateY: active && pressed ? 1 : 0 }],
                            })}
                          >
                            <Text style={{ fontSize: 13, fontFamily: font.bodyBold, color: active ? '#FFF' : (isDark ? colors.text : ST_INK) }}>
                              {name.charAt(0)}
                            </Text>
                          </Pressable>
                        )
                      })}
                    </View>

                    {/* Save sticker button */}
                    <Pressable
                      onPress={saveRoutine}
                      disabled={!routineForm.name.trim() || routineSaving}
                      style={({ pressed }) => {
                        const isDisabled = !routineForm.name.trim() || routineSaving
                        return {
                          height: 56,
                          borderRadius: radius.full,
                          backgroundColor: isDisabled ? ST_PURPLE + '88' : ST_PURPLE,
                          borderWidth: 2, borderColor: ST_INK,
                          alignItems: 'center', justifyContent: 'center',
                          shadowColor: ST_INK,
                          shadowOffset: { width: 0, height: pressed ? 2 : 4 },
                          shadowOpacity: 1, shadowRadius: 0, elevation: 5,
                          transform: [{ translateY: pressed && !isDisabled ? 2 : 0 }],
                          marginTop: 4,
                        }
                      }}
                    >
                      {routineSaving
                        ? <ActivityIndicator color="#FFF" size="small" />
                        : <Text style={{ color: '#FFF', fontFamily: font.bodyBold, fontSize: 15, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                            {t('kids_calendar_addRoutine')}
                          </Text>
                      }
                    </Pressable>
                  </View>
                  )}

                  {/* ─── Existing Routines ─────────────────────────── */}
                  {routines.length > 0 && (
                    <View style={{ marginTop: 20 }}>
                      <Text style={{ color: isDark ? colors.text : ST_INK, fontSize: 18, fontFamily: font.displayBold, letterSpacing: -0.3, marginBottom: 12, paddingHorizontal: 4 }}>
                        {t('kids_logForm_activeRoutines', { count: routineFilterKid ? routines.filter((r) => r.child_id === routineFilterKid).length : routines.length })}
                      </Text>

                      {/* Kid filter pills */}
                      {children.length > 1 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 4, paddingBottom: 12 }}>
                          {(() => {
                            const allActive = routineFilterKid === null
                            return (
                              <Pressable
                                onPress={() => setRoutineFilterKid(null)}
                                style={({ pressed }) => ({
                                  paddingHorizontal: 14,
                                  paddingVertical: 8,
                                  borderRadius: radius.full,
                                  borderWidth: 1.5, borderColor: ST_INK,
                                  backgroundColor: allActive ? stickers.lilac : ST_CREAM,
                                  shadowColor: ST_INK,
                                  shadowOffset: { width: 0, height: allActive ? (pressed ? 1 : 2) : 0 },
                                  shadowOpacity: allActive ? 1 : 0,
                                  shadowRadius: 0, elevation: allActive ? 3 : 0,
                                  transform: [{ translateY: allActive && pressed ? 1 : 0 }],
                                })}
                              >
                                <Text style={{ color: ST_INK, fontSize: 13, fontFamily: allActive ? font.bodyBold : font.bodySemiBold }}>
                                  {t('kids_calendar_allKids')}
                                </Text>
                              </Pressable>
                            )
                          })()}
                          {children.map((child, i) => {
                            const cc = childColor(i)
                            const active = routineFilterKid === child.id
                            return (
                              <Pressable
                                key={child.id}
                                onPress={() => setRoutineFilterKid(active ? null : child.id)}
                                style={({ pressed }) => ({
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 6,
                                  paddingHorizontal: 14,
                                  paddingVertical: 8,
                                  borderRadius: radius.full,
                                  borderWidth: 1.5, borderColor: ST_INK,
                                  backgroundColor: active ? cc : ST_CREAM,
                                  shadowColor: ST_INK,
                                  shadowOffset: { width: 0, height: active ? (pressed ? 1 : 2) : 0 },
                                  shadowOpacity: active ? 1 : 0,
                                  shadowRadius: 0, elevation: active ? 3 : 0,
                                  transform: [{ translateY: active && pressed ? 1 : 0 }],
                                })}
                              >
                                <View style={{ width: 7, height: 7, borderRadius: radius.full, backgroundColor: active ? ST_INK : cc, borderWidth: 1, borderColor: ST_INK }} />
                                <Text style={{ color: ST_INK, fontSize: 13, fontFamily: active ? font.bodyBold : font.bodySemiBold }}>
                                  {child.name}
                                </Text>
                              </Pressable>
                            )
                          })}
                        </ScrollView>
                      )}

                      {(routineFilterKid ? routines.filter((r) => r.child_id === routineFilterKid) : routines).map((r) => {
                        const meta = LOG_META[r.type] ?? { label: r.type, icon: Calendar, color: colors.textMuted }
                        const Icon = meta.icon
                        const childName = children.find((c) => c.id === r.child_id)?.name
                        return (
                          <View
                            key={r.id}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 10,
                              padding: 12,
                              marginBottom: 10,
                              backgroundColor: ST_PAPER,
                              borderRadius: radius.md,
                              borderWidth: 1.5,
                              borderColor: isDark ? colors.border : ST_INK,
                              shadowColor: ST_INK,
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: isDark ? 0 : 0.08,
                              shadowRadius: 0,
                              elevation: 2,
                            }}
                          >
                            <View style={{
                              width: 32, height: 32, borderRadius: radius.full,
                              backgroundColor: isDark ? meta.color : (meta.color + '40'),
                              borderWidth: 1.5, borderColor: isDark ? colors.border : ST_INK,
                              alignItems: 'center', justifyContent: 'center',
                            }}>
                              <Icon size={14} color={isDark ? '#FFF' : ST_INK} strokeWidth={2.2} />
                            </View>
                            <View style={{ flex: 1, gap: 2 }}>
                              <Text style={{ color: isDark ? colors.text : ST_INK, fontSize: 14, fontFamily: font.displayBold }}>
                                {r.name}
                              </Text>
                              <Text style={{ color: colors.textMuted, fontSize: 12, fontFamily: font.bodyMedium }}>
                                {r.time ? fmtTime(r.time) : t('kids_logForm_anytime')}
                                {' · '}
                                {r.days_of_week.length === 7 ? t('kids_logForm_daily') : r.days_of_week.map((d) => DAY_NAMES[d].charAt(0)).join(' ')}
                                {childName ? ` · ${childName}` : ''}
                              </Text>
                            </View>
                            <Pressable
                              onPress={() => {
                                setRoutineEditing(r)
                                setRoutineForm({ name: r.name, type: r.type, time: r.time ?? '09:00', days: r.days_of_week })
                              }}
                              style={({ pressed }) => ({
                                width: 32, height: 32, borderRadius: radius.full,
                                backgroundColor: ST_CREAM,
                                borderWidth: 1.5, borderColor: ST_INK,
                                alignItems: 'center', justifyContent: 'center',
                                shadowColor: ST_INK,
                                shadowOffset: { width: 0, height: pressed ? 0 : 2 },
                                shadowOpacity: 1, shadowRadius: 0, elevation: 2,
                                transform: [{ translateY: pressed ? 1 : 0 }],
                              })}
                            >
                              <Pencil size={13} color={ST_INK} strokeWidth={2.2} />
                            </Pressable>
                            <Pressable
                              onPress={() => deleteRoutine(r.id)}
                              style={({ pressed }) => ({
                                width: 32, height: 32, borderRadius: radius.full,
                                backgroundColor: stickers.peachSoft,
                                borderWidth: 1.5, borderColor: ST_INK,
                                alignItems: 'center', justifyContent: 'center',
                                shadowColor: ST_INK,
                                shadowOffset: { width: 0, height: pressed ? 0 : 2 },
                                shadowOpacity: 1, shadowRadius: 0, elevation: 2,
                                transform: [{ translateY: pressed ? 1 : 0 }],
                              })}
                            >
                              <Trash2 size={13} color={brand.error} strokeWidth={2.2} />
                            </Pressable>
                          </View>
                        )
                      })}
                    </View>
                  )}
                </ScrollView>
              </View>
            </>
          )
        })()}
      </Modal>
      )}

      {/* ─── Edit Routine Modal (sticker popup) ─────────────────────── */}
      {!diffuse && (
      <Modal
        visible={!!routineEditing}
        animationType="fade"
        transparent
        onRequestClose={cancelRoutineEdit}
      >
        {(() => {
          const ST_INK = colors.text
          const ST_PAPER = colors.surface
          const ST_CREAM = colors.surfaceRaised
          // Mode-colored accent (powder blue for Kids), matching how the
          // Pregnancy routine manager uses getModeColor('preg', …) for lavender.
          const ST_PURPLE = getModeColor('kids', isDark)
          return (
            <Pressable
              style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', paddingHorizontal: 20 }}
              onPress={cancelRoutineEdit}
            >
              <Pressable onPress={(e) => e.stopPropagation()}>
                <View
                  style={{
                    backgroundColor: ST_PAPER,
                    borderRadius: radius.lg,
                    borderWidth: 1.5,
                    borderColor: isDark ? colors.border : ST_INK,
                    padding: 18,
                    gap: 12,
                    shadowColor: ST_INK,
                    shadowOffset: { width: 0, height: 5 },
                    shadowOpacity: 1,
                    shadowRadius: 0,
                    elevation: 8,
                  }}
                >
                  {/* Header row with title + close */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{
                        width: 36, height: 36, borderRadius: radius.full,
                        backgroundColor: brand.primaryTint,
                        borderWidth: 1.5, borderColor: ST_INK,
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Pencil size={16} color={ST_PURPLE} strokeWidth={2.4} />
                      </View>
                      <Text style={{ color: ST_INK, fontSize: 20, fontFamily: font.displayBold, letterSpacing: -0.3 }}>
                        {t('kids_calendar_editRoutine')}
                      </Text>
                    </View>
                    <Pressable
                      onPress={cancelRoutineEdit}
                      style={({ pressed }) => ({
                        width: 32, height: 32, borderRadius: radius.full,
                        backgroundColor: ST_CREAM,
                        borderWidth: 1.5, borderColor: ST_INK,
                        alignItems: 'center', justifyContent: 'center',
                        shadowColor: ST_INK,
                        shadowOffset: { width: 0, height: pressed ? 0 : 2 },
                        shadowOpacity: 1, shadowRadius: 0, elevation: 2,
                        transform: [{ translateY: pressed ? 1 : 0 }],
                      })}
                    >
                      <X size={14} color={ST_INK} strokeWidth={2.5} />
                    </Pressable>
                  </View>

                  {/* Name */}
                  <View style={{
                    backgroundColor: ST_CREAM,
                    borderColor: isDark ? colors.border : ST_INK,
                    borderWidth: 1.5,
                    borderRadius: radius.full,
                    height: 56,
                    justifyContent: 'center',
                  }}>
                    <TextInput
                      value={routineForm.name}
                      onChangeText={(t) => setRoutineForm((f) => ({ ...f, name: t }))}
                      placeholder="Routine name"
                      placeholderTextColor={colors.textMuted}
                      underlineColorAndroid="transparent"
                      style={{
                        color: isDark ? colors.text : ST_INK,
                        paddingHorizontal: 22,
                        paddingVertical: 0,
                        fontSize: 15,
                        fontFamily: font.bodySemiBold,
                      }}
                    />
                  </View>

                  {/* Type chips */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4, paddingHorizontal: 2 }}>
                    {['feeding', 'food', 'sleep', 'diaper', 'activity', 'mood', 'health'].map((rtype) => {
                      const meta = LOG_META[rtype]
                      const active = routineForm.type === rtype
                      const activeBgLight = ({
                        feeding: stickers.blueSoft, food: stickers.blueSoft, sleep: stickers.lilacSoft,
                        diaper: stickers.blueSoft, activity: stickers.greenSoft, mood: stickers.peachSoft, health: stickers.pinkSoft,
                      } as Record<string, string>)[rtype] || brand.primaryTint
                      const activeBg = isDark ? meta.color : activeBgLight
                      const labelColor = active ? (isDark ? '#FFF' : ST_INK) : (isDark ? colors.text : ST_INK)
                      return (
                        <Pressable
                          key={rtype}
                          onPress={() => setRoutineForm((f) => ({ ...f, type: rtype }))}
                          style={({ pressed }) => ({
                            paddingHorizontal: 14, paddingVertical: 8,
                            borderRadius: radius.full, borderWidth: 1.5,
                            borderColor: isDark && !active ? colors.border : ST_INK,
                            backgroundColor: active ? activeBg : ST_CREAM,
                            shadowColor: ST_INK,
                            shadowOffset: { width: 0, height: active ? (pressed ? 1 : 2) : 0 },
                            shadowOpacity: active ? (1) : 0,
                            shadowRadius: 0, elevation: active ? 3 : 0,
                            transform: [{ translateY: active && pressed ? 1 : 0 }],
                          })}
                        >
                          <Text style={{ color: labelColor, fontSize: 13, fontFamily: active ? font.bodyBold : font.bodySemiBold }}>
                            {t(meta.labelKey)}
                          </Text>
                        </Pressable>
                      )
                    })}
                  </ScrollView>

                  {/* Time */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{
                      width: 32, height: 32, borderRadius: radius.full,
                      backgroundColor: ST_CREAM, borderWidth: 1.5, borderColor: isDark ? colors.border : ST_INK,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Clock size={14} color={isDark ? colors.text : ST_INK} strokeWidth={2.2} />
                    </View>
                    <TextInput
                      value={routineForm.time}
                      onChangeText={(txt) => setRoutineForm((f) => ({ ...f, time: txt }))}
                      placeholder="HH:MM"
                      placeholderTextColor={colors.textMuted}
                      style={{
                        flex: 1,
                        color: isDark ? colors.text : ST_INK,
                        backgroundColor: ST_CREAM,
                        borderColor: isDark ? colors.border : ST_INK,
                        borderWidth: 1.5, borderRadius: radius.full,
                        paddingHorizontal: 16, paddingVertical: 10,
                        fontSize: 15, fontFamily: font.bodySemiBold,
                      }}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>

                  {/* Days */}
                  <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'space-between' }}>
                    {DAY_NAMES.map((name, i) => {
                      const active = routineForm.days.includes(i)
                      return (
                        <Pressable
                          key={i}
                          onPress={() => setRoutineForm((f) => ({
                            ...f,
                            days: active ? f.days.filter((d) => d !== i) : [...f.days, i].sort(),
                          }))}
                          style={({ pressed }) => ({
                            width: 36, height: 36, borderRadius: radius.full,
                            alignItems: 'center', justifyContent: 'center',
                            borderWidth: 1.5, borderColor: isDark && !active ? colors.border : ST_INK,
                            backgroundColor: active ? ST_PURPLE : ST_CREAM,
                            shadowColor: ST_INK,
                            shadowOffset: { width: 0, height: active ? (pressed ? 1 : 2) : 0 },
                            shadowOpacity: active ? (1) : 0,
                            shadowRadius: 0, elevation: active ? 3 : 0,
                            transform: [{ translateY: active && pressed ? 1 : 0 }],
                          })}
                        >
                          <Text style={{ fontSize: 13, fontFamily: font.bodyBold, color: active ? '#FFF' : (isDark ? colors.text : ST_INK) }}>
                            {name.charAt(0)}
                          </Text>
                        </Pressable>
                      )
                    })}
                  </View>

                  {/* Action row: Cancel + Update */}
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                    <Pressable
                      onPress={cancelRoutineEdit}
                      style={({ pressed }) => ({
                        flex: 1, height: 52,
                        borderRadius: radius.full,
                        backgroundColor: ST_CREAM,
                        borderWidth: 1.5, borderColor: ST_INK,
                        alignItems: 'center', justifyContent: 'center',
                        shadowColor: ST_INK,
                        shadowOffset: { width: 0, height: pressed ? 1 : 3 },
                        shadowOpacity: 1, shadowRadius: 0, elevation: 4,
                        transform: [{ translateY: pressed ? 2 : 0 }],
                      })}
                    >
                      <Text style={{ color: ST_INK, fontFamily: font.bodyBold, fontSize: 14, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                        {t('common_cancel')}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={saveRoutine}
                      disabled={!routineForm.name.trim() || routineSaving}
                      style={({ pressed }) => ({
                        flex: 1.4, height: 52,
                        borderRadius: radius.full,
                        backgroundColor: ST_PURPLE,
                        borderWidth: 2, borderColor: ST_INK,
                        alignItems: 'center', justifyContent: 'center',
                        shadowColor: ST_INK,
                        shadowOffset: { width: 0, height: pressed ? 2 : 4 },
                        shadowOpacity: 1, shadowRadius: 0, elevation: 5,
                        transform: [{ translateY: pressed ? 2 : 0 }],
                        opacity: (!routineForm.name.trim() || routineSaving) ? 0.4 : 1,
                      })}
                    >
                      {routineSaving
                        ? <ActivityIndicator color="#FFF" size="small" />
                        : <Text style={{ color: '#FFF', fontFamily: font.bodyBold, fontSize: 14, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                            {t('common_update')}
                          </Text>
                      }
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            </Pressable>
          )
        })()}
      </Modal>
      )}

      {/* ─── Delete Routine Confirm (Diffuse) ─────────────────────── */}
      {diffuse && (
        <DiffuseSheet visible={!!confirmDeleteRoutineId} onClose={() => !routineDeleting && setConfirmDeleteRoutineId(null)} title={t('kids_calendar_deleteRoutineConfirm')} scroll={false}>
          <Text style={{ fontFamily: diffuseFont.body, fontSize: 14, lineHeight: 20, color: dt.colors.ink3, marginBottom: 20 }}>
            {t('kids_calendar_deleteRoutineConfirmMsg')}
          </Text>
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <Pressable
              onPress={() => setConfirmDeleteRoutineId(null)}
              disabled={routineDeleting}
              style={({ pressed }) => [dm.actionRow, { borderTopColor: dt.colors.line2, opacity: routineDeleting ? 0.5 : (pressed ? 0.6 : 1), flex: 1 }]}
            >
              <Text style={{ fontFamily: diffuseFont.monoBold, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: dt.colors.ink3 }}>{t('common_cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={() => confirmDeleteRoutineId && performRoutineDelete(confirmDeleteRoutineId)}
              disabled={routineDeleting}
              style={({ pressed }) => [dm.actionRow, { borderTopColor: dt.colors.error, opacity: routineDeleting ? 0.6 : (pressed ? 0.6 : 1), flex: 1 }]}
            >
              {routineDeleting ? (
                <ActivityIndicator color={dt.colors.error} size="small" />
              ) : (
                <>
                  <Trash2 size={14} color={dt.colors.error} strokeWidth={1.8} />
                  <Text style={{ fontFamily: diffuseFont.monoBold, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: dt.colors.error }}>{t('common_delete')}</Text>
                </>
              )}
            </Pressable>
          </View>
        </DiffuseSheet>
      )}

      {/* ─── Delete Routine Confirm (sticker popup) ─────────────────── */}
      {!diffuse && (
      <Modal
        visible={!!confirmDeleteRoutineId}
        animationType="fade"
        transparent
        onRequestClose={() => !routineDeleting && setConfirmDeleteRoutineId(null)}
      >
        {(() => {
          const ST_INK = colors.text
          const ST_PAPER = colors.surface
          const ST_CREAM = colors.surfaceRaised
          const ST_RED = brand.error
          return (
            <Pressable
              style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', paddingHorizontal: 32 }}
              onPress={() => !routineDeleting && setConfirmDeleteRoutineId(null)}
            >
              <Pressable onPress={(e) => e.stopPropagation()}>
                <View
                  style={{
                    backgroundColor: ST_PAPER,
                    borderRadius: radius.xl,
                    borderWidth: 1.5,
                    borderColor: isDark ? colors.border : ST_INK,
                    padding: 22,
                    gap: 14,
                    alignItems: 'center',
                    shadowColor: ST_INK,
                    shadowOffset: { width: 0, height: 5 },
                    shadowOpacity: 1, shadowRadius: 0, elevation: 8,
                  }}
                >
                  {/* Sticker trash icon */}
                  <View style={{
                    width: 60, height: 60, borderRadius: radius.full,
                    backgroundColor: stickers.peachSoft,
                    borderWidth: 1.5, borderColor: isDark ? colors.border : ST_INK,
                    alignItems: 'center', justifyContent: 'center',
                    shadowColor: ST_INK,
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 1, shadowRadius: 0, elevation: 4,
                  }}>
                    <Trash2 size={26} color={ST_RED} strokeWidth={2.2} />
                  </View>

                  <Text style={{ color: isDark ? colors.text : ST_INK, fontSize: 22, fontFamily: font.displayBold, letterSpacing: -0.3, textAlign: 'center' }}>
                    {t('kids_calendar_deleteRoutineConfirm')}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 14, fontFamily: font.bodyMedium, textAlign: 'center', lineHeight: 20 }}>
                    {t('kids_calendar_deleteRoutineConfirmMsg')}
                  </Text>

                  {/* Action row */}
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 6, alignSelf: 'stretch' }}>
                    <Pressable
                      onPress={() => setConfirmDeleteRoutineId(null)}
                      disabled={routineDeleting}
                      style={({ pressed }) => ({
                        flex: 1, height: 52,
                        borderRadius: radius.full,
                        backgroundColor: ST_CREAM,
                        borderWidth: 1.5, borderColor: ST_INK,
                        alignItems: 'center', justifyContent: 'center',
                        shadowColor: ST_INK,
                        shadowOffset: { width: 0, height: pressed ? 1 : 3 },
                        shadowOpacity: 1, shadowRadius: 0, elevation: 4,
                        transform: [{ translateY: pressed ? 2 : 0 }],
                        opacity: routineDeleting ? 0.5 : 1,
                      })}
                    >
                      <Text style={{ color: ST_INK, fontFamily: font.bodyBold, fontSize: 14, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                        {t('common_cancel')}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => confirmDeleteRoutineId && performRoutineDelete(confirmDeleteRoutineId)}
                      disabled={routineDeleting}
                      style={({ pressed }) => ({
                        flex: 1, height: 52,
                        borderRadius: radius.full,
                        backgroundColor: ST_RED,
                        borderWidth: 2, borderColor: ST_INK,
                        alignItems: 'center', justifyContent: 'center',
                        shadowColor: ST_INK,
                        shadowOffset: { width: 0, height: pressed ? 2 : 4 },
                        shadowOpacity: 1, shadowRadius: 0, elevation: 5,
                        transform: [{ translateY: pressed ? 2 : 0 }],
                        opacity: routineDeleting ? 0.6 : 1,
                      })}
                    >
                      {routineDeleting
                        ? <ActivityIndicator color="#FFF" size="small" />
                        : <Text style={{ color: '#FFF', fontFamily: font.bodyBold, fontSize: 14, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                            {t('common_delete')}
                          </Text>
                      }
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            </Pressable>
          )
        })()}
      </Modal>
      )}

      {/* ─── Log Detail Sheet (Diffuse) ───────────────────────────────── */}
      {diffuse && (
        <DiffuseLogDetailSheet
          log={selectedLog}
          onClose={() => { setSelectedLog(null); setEditing(false) }}
          childName={selectedLog ? children.find((c) => c.id === selectedLog.child_id)?.name : undefined}
          loggedByName={selectedLog?.logged_by && selectedLog.logged_by !== currentUserId ? profileNames[selectedLog.logged_by] : undefined}
          todayStr={todayStr}
          editing={editing}
          setEditing={setEditing}
          editValue={editValue}
          setEditValue={setEditValue}
          editNotes={editNotes}
          setEditNotes={setEditNotes}
          editSaving={editSaving}
          onSaveEdit={saveEdit}
          onEdit={(log) => openEdit(log)}
          onDelete={(log) => setUnlogTarget(log)}
          t={t}
        />
      )}

      {/* ─── Log Detail Popup with Edit ───────────────────────────────── */}
      {!diffuse && (
      <Modal
        visible={!!selectedLog}
        animationType="slide"
        transparent
        onRequestClose={() => { setSelectedLog(null); setEditing(false) }}
      >
        <Pressable style={styles.popupBackdrop} onPress={() => { setSelectedLog(null); setEditing(false) }} />
        {selectedLog && (() => {
          const meta = LOG_META[selectedLog.type] ?? { label: selectedLog.type, icon: Calendar, color: colors.textMuted }
          const Icon = meta.icon
          const logChild = children.find((c) => c.id === selectedLog.child_id)
          const ci = childIndexMap.get(selectedLog.child_id) ?? 0
          const hasPhotos = selectedLog.photos && selectedLog.photos.length > 0
          return (
            <View style={[styles.popupSheet, { backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingBottom: insets.bottom + 20 }]}>
              {/* Handle */}
              <View style={styles.popupHandleWrap}>
                <View style={[styles.popupHandle, { backgroundColor: colors.border }]} />
              </View>

              {/* Header */}
              <View style={styles.popupHeader}>
                <View style={[styles.popupIconLarge, { backgroundColor: meta.color + '15' }]}>
                  <Icon size={24} color={meta.color} strokeWidth={2} />
                </View>
                <View style={styles.popupHeaderText}>
                  <Text style={[styles.popupTitle, { color: colors.text }]}>{logTitle(selectedLog)}</Text>
                  {logChild && (
                    <View style={[styles.popupChildTag, { backgroundColor: childColor(ci) + '15' }]}>
                      <Text style={[styles.popupChildName, { color: childColor(ci) }]}>{logChild.name}</Text>
                    </View>
                  )}
                </View>
                <Pressable onPress={() => { setSelectedLog(null); setEditing(false) }} style={styles.popupClose}>
                  <X size={20} color={colors.textMuted} />
                </Pressable>
              </View>

              <ScrollView style={styles.popupBody} showsVerticalScrollIndicator={false}>
                {/* Date & Time */}
                <View style={[styles.popupRow, { backgroundColor: colors.surface, borderRadius: radius.lg }]}>
                  <Clock size={16} color={colors.textMuted} />
                  <Text style={[styles.popupRowText, { color: colors.text }]}>
                    {`${formatDayLabel(selectedLog.date, todayStr, t)} ${t('common_at')} ${activityTimeDisplay(selectedLog)}`}
                  </Text>
                </View>

                {/* Logged by */}
                {selectedLog.logged_by && profileNames[selectedLog.logged_by] && (
                  <View style={[styles.popupRow, { backgroundColor: colors.surface, borderRadius: radius.lg }]}>
                    <CheckCircle2 size={16} color={brand.success} strokeWidth={2} />
                    <Text style={[styles.popupRowText, { color: colors.textSecondary }]}>
                      {t('kids_calendar_detail_loggedBy')} <Text style={{ color: colors.text, fontWeight: '600' }}>{profileNames[selectedLog.logged_by]}</Text>
                    </Text>
                  </View>
                )}

                {editing ? (
                  /* ── Edit Mode ── */
                  <>
                    <View style={[styles.popupSection, { backgroundColor: colors.surface, borderRadius: radius.lg }]}>
                      <Text style={[styles.popupSectionLabel, { color: colors.textMuted }]}>{t('kids_calendar_detail_details')}</Text>
                      <TextInput
                        value={editValue}
                        onChangeText={setEditValue}
                        placeholder={t('kids_calendar_detail_detailsPlaceholder')}
                        placeholderTextColor={colors.textMuted}
                        multiline
                        style={[styles.editInput, { color: colors.text, borderColor: colors.border, borderRadius: radius.md }]}
                      />
                    </View>
                    <View style={[styles.popupSection, { backgroundColor: colors.surface, borderRadius: radius.lg }]}>
                      <Text style={[styles.popupSectionLabel, { color: colors.textMuted }]}>{t('kids_calendar_detail_notes')}</Text>
                      <TextInput
                        value={editNotes}
                        onChangeText={setEditNotes}
                        placeholder={t('kids_calendar_detail_notesPlaceholder')}
                        placeholderTextColor={colors.textMuted}
                        multiline
                        style={[styles.editInput, { color: colors.text, borderColor: colors.border, borderRadius: radius.md }]}
                      />
                    </View>

                    <View style={styles.editActions}>
                      <Pressable
                        onPress={() => setEditing(false)}
                        style={[styles.editCancelBtn, { borderColor: colors.border, borderRadius: radius.lg }]}
                      >
                        <Text style={[styles.editCancelText, { color: colors.textSecondary }]}>{t('common_cancel')}</Text>
                      </Pressable>
                      <Pressable
                        onPress={saveEdit}
                        disabled={editSaving}
                        style={({ pressed }) => [
                          styles.editSaveBtn,
                          { backgroundColor: colors.primary, borderRadius: radius.lg },
                          pressed && { opacity: 0.9 },
                        ]}
                      >
                        {editSaving
                          ? <ActivityIndicator color="#FFF" size="small" />
                          : <>
                              <Check size={16} color="#FFF" strokeWidth={2.5} />
                              <Text style={styles.editSaveText}>{t('common_save')}</Text>
                            </>
                        }
                      </Pressable>
                    </View>
                  </>
                ) : (
                  /* ── View Mode ── */
                  <>
                    {/* ── Food Rich Card ── */}
                    {(selectedLog.type === 'food') && (() => {
                      let fp: Record<string, any> = {}
                      try { fp = JSON.parse(selectedLog.value ?? '{}') } catch {}
                      const mealLabels: Record<string, string> = {
                        breakfast: 'Breakfast', morning_snack: 'AM Snack', lunch: 'Lunch',
                        afternoon_snack: 'PM Snack', dinner: 'Dinner', night_snack: 'Night',
                      }
                      const mealName = fp.meal ? (mealLabels[fp.meal] ?? fp.meal) : ''
                      const mealTime = fp.time ? fmtTime(fp.time) : ''
                      const cals = fp.estimatedCals ? Number(fp.estimatedCals) : null
                      const qualityMap: Record<string, { label: string; color: string }> = {
                        ate_well: { label: '😊 Ate well', color: stickers.green },
                        ate_little: { label: '😐 Ate a little', color: stickers.yellow },
                        did_not_eat: { label: '😔 Did not eat', color: stickers.coral },
                      }
                      const quality = fp.quality ? qualityMap[fp.quality] : null
                      return (
                        <>
                          {/* Calorie hero */}
                          {cals !== null && (
                            <View style={{ backgroundColor: stickers.coral + '22', borderRadius: 24, paddingVertical: 24, paddingHorizontal: 20, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: stickers.coral + '40' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
                                <Text style={{ color: stickers.coralInk, fontSize: 64, fontWeight: '800', lineHeight: 68, letterSpacing: -2, fontFamily: font.display }}>{cals}</Text>
                                <Text style={{ color: stickers.coralInk, fontSize: 20, fontWeight: '700', marginBottom: 10 }}>{t('common_kcal')}</Text>
                              </View>
                              <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 4, letterSpacing: 1, textTransform: 'uppercase' }}>{t('kids_calendar_detail_estimatedCals')}</Text>
                            </View>
                          )}

                          {/* Meal chips row */}
                          {(mealTime || mealName || quality) && (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                              {mealTime !== '' && (
                                <View style={{ backgroundColor: colors.surface, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Clock size={13} color={colors.textMuted} />
                                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{mealTime}</Text>
                                </View>
                              )}
                              {mealName !== '' && (
                                <View style={{ backgroundColor: stickers.coral + '22', borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8 }}>
                                  <Text style={{ color: stickers.coralInk, fontSize: 13, fontWeight: '700' }}>{mealName}</Text>
                                </View>
                              )}
                              {quality !== null && (
                                <View style={{ backgroundColor: quality.color + '25', borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8 }}>
                                  <Text style={{ color: quality.color, fontSize: 13, fontWeight: '700' }}>{quality.label}</Text>
                                </View>
                              )}
                            </View>
                          )}

                          {/* What they ate (notes) */}
                          {selectedLog.notes && (
                            <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 16, marginBottom: 12 }}>
                              <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>{t('kids_calendar_detail_whatTheyAte')}</Text>
                              <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22 }}>{selectedLog.notes}</Text>
                            </View>
                          )}

                          {/* New food badge */}
                          {fp.isNewFood && (
                            <View style={{ backgroundColor: stickers.lilac + '22', borderRadius: 18, padding: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: stickers.lilac + '40' }}>
                              <Sparkles size={18} color={stickers.lilacInk} />
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: stickers.lilacInk, fontSize: 13, fontWeight: '700' }}>{t('kids_calendar_detail_newFoodIntro')}</Text>
                                {fp.newFoodName && <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{fp.newFoodName}</Text>}
                              </View>
                            </View>
                          )}

                          {/* Reaction alert */}
                          {fp.hasReaction && (
                            <View style={{ backgroundColor: stickers.coral + '22', borderRadius: 18, padding: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: stickers.coral + '40' }}>
                              <AlertCircle size={18} color={stickers.coral} />
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: stickers.coral, fontSize: 13, fontWeight: '700' }}>{t('kids_calendar_detail_reactionNoted')}</Text>
                                {fp.reactionFood && <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{fp.reactionFood}</Text>}
                              </View>
                            </View>
                          )}
                        </>
                      )
                    })()}

                    {/* ── Feeding Rich Card ── */}
                    {(selectedLog.type === 'feeding') && (() => {
                      let fp: Record<string, any> = {}
                      try { fp = JSON.parse(selectedLog.value ?? '{}') } catch {}
                      const isBreast = fp.feedType === 'breast'
                      const accentColor = stickers.pink
                      return (
                        <>
                          <View style={{ backgroundColor: accentColor + '15', borderRadius: 24, paddingVertical: 24, paddingHorizontal: 20, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: accentColor + '30' }}>
                            {isBreast ? (
                              <>
                                <Text style={{ color: accentColor, fontSize: 48, fontWeight: '800', lineHeight: 52, fontFamily: font.display }}>{fp.duration ? `${fp.duration}` : '—'}</Text>
                                <Text style={{ color: accentColor, fontSize: 16, fontWeight: '700', marginTop: 2 }}>{t('kids_calendar_detail_minutesUnit')}</Text>
                                <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 6, letterSpacing: 1, textTransform: 'uppercase' }}>{t('kids_calendar_detail_breastfeeding')}</Text>
                              </>
                            ) : (
                              <>
                                <Text style={{ color: accentColor, fontSize: 48, fontWeight: '800', lineHeight: 52, fontFamily: font.display }}>{fp.amount ? `${fp.amount}` : '—'}</Text>
                                <Text style={{ color: accentColor, fontSize: 16, fontWeight: '700', marginTop: 2 }}>{t('kids_calendar_detail_mlUnit')}</Text>
                                <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 6, letterSpacing: 1, textTransform: 'uppercase' }}>{t('kids_calendar_detail_bottleFeeding')}</Text>
                              </>
                            )}
                          </View>
                          {isBreast && fp.side && (
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                              <View style={{ backgroundColor: accentColor + '20', borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8 }}>
                                <Text style={{ color: accentColor, fontSize: 13, fontWeight: '700' }}>
                                  {fp.side === 'left' ? '← Left' : fp.side === 'right' ? 'Right →' : '↔ Both sides'}
                                </Text>
                              </View>
                            </View>
                          )}
                          {selectedLog.notes && (
                            <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 16, marginBottom: 12 }}>
                              <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>{t('kids_calendar_detail_notes2')}</Text>
                              <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22 }}>{selectedLog.notes}</Text>
                            </View>
                          )}
                        </>
                      )
                    })()}

                    {/* ── Sleep Rich Card ── */}
                    {selectedLog.type === 'sleep' && (() => {
                      let sp: Record<string, any> = {}
                      try { sp = JSON.parse(selectedLog.value ?? '{}') } catch {}
                      const sleepColor = stickers.lilac
                      // Duration is stored as "10h 10m", "45m", "2h" — display it directly
                      const durStr = sp.duration ? String(sp.duration) : null
                      const qualityMap: Record<string, { emoji: string; color: string }> = {
                        great:    { emoji: '😴', color: stickers.green },
                        good:     { emoji: '😊', color: stickers.blue },
                        restless: { emoji: '😤', color: stickers.yellow },
                        poor:     { emoji: '😞', color: stickers.coral },
                      }
                      const q = sp.quality ? qualityMap[sp.quality.toLowerCase()] ?? null : null
                      return (
                        <>
                          <View style={{ backgroundColor: sleepColor + '15', borderRadius: 24, paddingVertical: 24, paddingHorizontal: 20, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: sleepColor + '30' }}>
                            <EmojiSticker size={52}>{'🌙'}</EmojiSticker>
                            {durStr ? (
                              <Text style={{ color: sleepColor, fontSize: 56, fontWeight: '800', lineHeight: 64, letterSpacing: -2, marginTop: 6, fontFamily: font.display }}>{durStr}</Text>
                            ) : (
                              <Text style={{ color: sleepColor, fontSize: 20, fontWeight: '700', marginTop: 8 }}>{t('kids_calendar_detail_sleepLogged')}</Text>
                            )}
                            <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 6, letterSpacing: 1, textTransform: 'uppercase' }}>{t('kids_calendar_detail_sleepSession')}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                            {sp.startTime && sp.endTime && (
                              <View style={{ backgroundColor: colors.surface, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Clock size={13} color={colors.textMuted} />
                                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{`${fmtTime(sp.startTime)} – ${fmtTime(sp.endTime)}`}</Text>
                              </View>
                            )}
                            {q && (
                              <View style={{ backgroundColor: q.color + '25', borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8 }}>
                                <Text style={{ color: q.color, fontSize: 13, fontWeight: '700' }}>{q.emoji} {sp.quality.charAt(0).toUpperCase() + sp.quality.slice(1)}</Text>
                              </View>
                            )}
                          </View>
                        </>
                      )
                    })()}

                    {/* ── Activity Rich Card ── */}
                    {selectedLog.type === 'activity' && (() => {
                      let ap: Record<string, any> = {}
                      try { ap = JSON.parse(selectedLog.value ?? '{}') } catch {}
                      const actColor = stickers.green
                      const emojiMap: Record<string, string> = {
                        class: '📚', sport: '⚽', swim: '🏊', dance: '💃',
                        music: '🎵', art: '🎨', playground: '🛝', walk: '🚶',
                        therapy: '🧩', playdate: '👫', other: '🎯',
                      }
                      const emoji = ap.activityType ? (emojiMap[ap.activityType] ?? '🎯') : '🎯'
                      const durRaw = ap.duration ? String(ap.duration).replace(/[^\d.]/g, '') : null
                      const durUnit = durRaw ? (Number(durRaw) >= 60 ? `${Math.floor(Number(durRaw) / 60)}h ${Number(durRaw) % 60}m` : `${durRaw} min`) : null
                      return (
                        <>
                          <View style={{ backgroundColor: actColor + '12', borderRadius: 24, paddingVertical: 24, paddingHorizontal: 20, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: actColor + '30' }}>
                            <Text style={{ fontSize: 52, lineHeight: 56 }}>{emoji}</Text>
                            {ap.name ? (
                              <Text style={{ color: actColor, fontSize: 26, fontWeight: '800', marginTop: 10, textAlign: 'center', fontFamily: font.display }}>{ap.name}</Text>
                            ) : null}
                            {durUnit && (
                              <>
                                <Text style={{ color: actColor, fontSize: 20, fontWeight: '700', marginTop: ap.name ? 4 : 10 }}>{durUnit}</Text>
                              </>
                            )}
                            <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 6, letterSpacing: 1, textTransform: 'uppercase' }}>{t('kids_calendar_detail_activity')}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                            {ap.activityType && (
                              <View style={{ backgroundColor: actColor + '20', borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8 }}>
                                <Text style={{ color: actColor, fontSize: 13, fontWeight: '700' }}>{ap.activityType.charAt(0).toUpperCase() + ap.activityType.slice(1)}</Text>
                              </View>
                            )}
                            {ap.startTime && ap.endTime && (
                              <View style={{ backgroundColor: colors.surface, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Clock size={13} color={colors.textMuted} />
                                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{`${fmtTime(ap.startTime)} – ${fmtTime(ap.endTime)}`}</Text>
                              </View>
                            )}
                          </View>
                        </>
                      )
                    })()}

                    {/* ── Diaper Rich Card ── */}
                    {selectedLog.type === 'diaper' && (() => {
                      let dp: Record<string, any> = {}
                      try { dp = JSON.parse(selectedLog.value ?? '{}') } catch {}
                      const diaperColor = stickers.blue
                      const typeMap: Record<string, { emoji: string; label: string }> = {
                        pee:   { emoji: '💧', label: 'Pee' },
                        poop:  { emoji: '💩', label: 'Poop' },
                        mixed: { emoji: '🔄', label: 'Both' },
                      }
                      const dt = dp.diaperType ? (typeMap[dp.diaperType] ?? { emoji: '🍼', label: dp.diaperType }) : null
                      return (
                        <>
                          <View style={{ backgroundColor: diaperColor + '12', borderRadius: 24, paddingVertical: 24, paddingHorizontal: 20, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: diaperColor + '30' }}>
                            <EmojiSticker size={64}>{dt?.emoji ?? '🍼'}</EmojiSticker>
                            <Text style={{ color: diaperColor, fontSize: 24, fontWeight: '800', marginTop: 8, fontFamily: font.display }}>{dt?.label ?? 'Diaper'}</Text>
                            <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 6, letterSpacing: 1, textTransform: 'uppercase' }}>{t('kids_calendar_detail_diaperChange')}</Text>
                          </View>
                          {(dp.color || dp.consistency) && (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                              {dp.color && (
                                <View style={{ backgroundColor: colors.surface, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8 }}>
                                  <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>{t('kids_calendar_detail_colorLabel', { value: dp.color.charAt(0).toUpperCase() + dp.color.slice(1) })}</Text>
                                </View>
                              )}
                              {dp.consistency && (
                                <View style={{ backgroundColor: colors.surface, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8 }}>
                                  <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>{dp.consistency.charAt(0).toUpperCase() + dp.consistency.slice(1)}</Text>
                                </View>
                              )}
                            </View>
                          )}
                        </>
                      )
                    })()}

                    {/* ── Mood Rich Card ── */}
                    {selectedLog.type === 'mood' && (() => {
                      // A mood logged from a routine stores JSON
                      // ({ mood, routineId, routineName, … }); a direct mood
                      // log stores the bare mood string. Extract the mood
                      // either way so we never surface the raw JSON / UUID.
                      const rawMood = selectedLog.value ?? ''
                      let moodVal = rawMood
                      try {
                        const p = JSON.parse(rawMood)
                        if (p && typeof p === 'object') moodVal = p.mood ?? p.value ?? p.label ?? ''
                      } catch {}
                      const moodMeta: Record<string, { label: string; color: string }> = {
                        happy:     { label: 'Happy',     color: stickers.green },
                        calm:      { label: 'Calm',      color: stickers.blue },
                        fussy:     { label: 'Fussy',     color: stickers.yellow },
                        cranky:    { label: 'Cranky',    color: stickers.coral },
                        energetic: { label: 'Energetic', color: stickers.lilac },
                      }
                      const m = moodMeta[moodVal] ?? { label: moodVal || 'Mood', color: brand.accent }
                      return (
                        <View style={{ backgroundColor: m.color + '12', borderRadius: 24, paddingVertical: 32, paddingHorizontal: 20, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: m.color + '30' }}>
                          <MoodFace size={84} variant={moodFaceVariant(moodVal)} fill={moodFaceFill(moodVal)} />
                          <Text style={{ color: m.color, fontSize: 32, fontWeight: '800', marginTop: 10, letterSpacing: -1, fontFamily: font.display }}>{m.label}</Text>
                          <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 8, letterSpacing: 1, textTransform: 'uppercase' }}>{t('kids_calendar_detail_todaysMood')}</Text>
                        </View>
                      )
                    })()}

                    {/* ── Health / Temperature / Vaccine / Medicine ── */}
                    {['health', 'temperature', 'vaccine', 'medicine', 'note'].includes(selectedLog.type) && (() => {
                      const healthColor = brand.error
                      const ST_INK = '#141313'
                      const typeIconMap: Record<string, typeof Heart> = {
                        temperature: Thermometer,
                        vaccine: Syringe,
                        medicine: Pill,
                        health: Heart,
                        note: FileText,
                      }
                      const IconCmp = typeIconMap[selectedLog.type] ?? Heart
                      const rawVal = selectedLog.value ?? ''
                      let displayVal = rawVal
                      try {
                        const p = JSON.parse(rawVal)
                        if (typeof p === 'object') displayVal = p.value ?? p.name ?? rawVal
                      } catch {}
                      return (
                        <>
                          <View style={{
                            backgroundColor: healthColor + '12',
                            borderRadius: 24,
                            paddingVertical: 24,
                            paddingHorizontal: 20,
                            marginBottom: 12,
                            alignItems: 'center',
                            borderWidth: 1.5,
                            borderColor: isDark ? colors.border : ST_INK,
                            shadowColor: ST_INK,
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.08,
                            shadowRadius: 4,
                            elevation: 1,
                          }}>
                            {/* Sticker icon — circle with ink stroke, hand-drawn feel */}
                            <View style={{
                              width: 72,
                              height: 72,
                              borderRadius: 36,
                              backgroundColor: '#FFFEF8',
                              borderWidth: 2,
                              borderColor: isDark ? colors.border : ST_INK,
                              alignItems: 'center',
                              justifyContent: 'center',
                              shadowColor: ST_INK,
                              shadowOffset: { width: 0, height: 3 },
                              shadowOpacity: 0.12,
                              shadowRadius: 0,
                              elevation: 2,
                              transform: [{ rotate: '-3deg' }],
                            }}>
                              <IconCmp size={36} color={healthColor} strokeWidth={2.2} />
                            </View>
                            {displayVal && displayVal !== selectedLog.type ? (
                              <Text style={{ color: healthColor, fontSize: 28, fontWeight: '800', marginTop: 14, textAlign: 'center', letterSpacing: -0.8, fontFamily: font.display }}>{displayVal}</Text>
                            ) : null}
                            <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 8, letterSpacing: 1, textTransform: 'uppercase' }}>
                              {selectedLog.type.charAt(0).toUpperCase() + selectedLog.type.slice(1)}
                            </Text>
                          </View>
                        </>
                      )
                    })()}

                    {/* Notes for non-food/feeding types */}
                    {!['food', 'feeding'].includes(selectedLog.type) && selectedLog.notes && (
                      <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 16, marginBottom: 12 }}>
                        <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>{t('kids_calendar_detail_notes')}</Text>
                        <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22 }}>{selectedLog.notes}</Text>
                      </View>
                    )}

                    {/* Fallback for unknown types */}
                    {!['food', 'feeding', 'sleep', 'activity', 'diaper', 'mood', 'health', 'temperature', 'vaccine', 'medicine', 'note'].includes(selectedLog.type) && (
                      <>
                        {formatLogDisplay(selectedLog.type, selectedLog.value, null) !== '' && (
                          <View style={[styles.popupSection, { backgroundColor: colors.surface, borderRadius: radius.lg }]}>
                            <Text style={[styles.popupSectionLabel, { color: colors.textMuted }]}>{t('kids_calendar_detail_details')}</Text>
                            <Text style={[styles.popupSectionValue, { color: colors.text }]}>
                              {formatLogDisplay(selectedLog.type, selectedLog.value, null)}
                            </Text>
                          </View>
                        )}
                      </>
                    )}

                    {hasPhotos && (
                      <View style={styles.popupPhotos}>
                        <Text style={[styles.popupSectionLabel, { color: colors.textMuted, marginBottom: 8, paddingHorizontal: 16 }]}>{t('kids_calendar_detail_photos')}</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.popupPhotoScroll}>
                          {selectedLog.photos.map((uri, i) => (
                            <Image key={i} source={{ uri }} style={[styles.popupPhoto, { borderRadius: radius.lg }]} />
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    {!formatLogDisplay(selectedLog.type, selectedLog.value, null) && !selectedLog.notes && !hasPhotos && (
                      <View style={[styles.popupSection, { backgroundColor: colors.surface, borderRadius: radius.lg }]}>
                        <Text style={[styles.popupSectionValue, { color: colors.textMuted, fontStyle: 'italic' }]}>
                          {t('kids_calendar_detail_nothing')}
                        </Text>
                      </View>
                    )}

                    {/* Action buttons */}
                    <View style={styles.popupActions}>
                      <Pressable
                        onPress={() => openEdit(selectedLog)}
                        style={({ pressed }) => [
                          styles.popupEditBtn,
                          {
                            backgroundColor: colors.text,
                            borderColor: colors.text,
                            borderWidth: 1.5,
                            borderRadius: 999,
                          },
                          pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 },
                        ]}
                      >
                        <Pencil size={16} color="#FFFEF8" strokeWidth={2} />
                        <Text style={[styles.popupEditText, { color: '#FFFEF8' }]}>{t('kids_calendar_detail_edit')}</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          // Route through the unlogTarget confirmation modal
                          // so a stray tap doesn't permanently destroy a log.
                          // handleDeleteLog was firing immediately on press —
                          // no confirm, no undo.
                          setUnlogTarget(selectedLog)
                        }}
                        style={({ pressed }) => [
                          styles.popupDeleteBtn,
                          {
                            backgroundColor: colors.surface,
                            borderColor: isDark ? colors.border : '#141313',
                            borderRadius: 999,
                          },
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <Trash2 size={16} color={brand.error} />
                        <Text style={[styles.popupDeleteText, { color: brand.error }]}>{t('kids_calendar_detail_delete')}</Text>
                      </Pressable>
                    </View>
                  </>
                )}
              </ScrollView>
            </View>
          )
        })()}
      </Modal>
      )}

      {/* ── Unlog Confirmation (Diffuse) ── */}
      {diffuse && (
        <DiffuseSheet visible={!!unlogTarget} onClose={() => setUnlogTarget(null)} title={t('kids_calendar_unlogBtn')} scroll={false}>
          {unlogTarget && (() => {
            const detail = formatLogDisplay(unlogTarget.type, unlogTarget.value, unlogTarget.notes)
            return (
              <>
                <DiffuseListRow
                  title={logTitle(unlogTarget)}
                  sub={[detail || null, activityTimeDisplay(unlogTarget)].filter(Boolean).join(' · ')}
                  icon={<DiffuseLogIcon type={unlogTarget.type} size={34} inkColor={dt.colors.ink3} />}
                  last
                />
                <Text style={{ fontFamily: diffuseFont.body, fontSize: 14, lineHeight: 20, color: dt.colors.ink3, textAlign: 'center', marginVertical: 16 }}>
                  {t('kids_calendar_unlogConfirm')}
                </Text>
                <View style={{ flexDirection: 'row', gap: 14 }}>
                  <Pressable onPress={() => setUnlogTarget(null)} style={({ pressed }) => [dm.actionRow, { borderTopColor: dt.colors.line2, opacity: pressed ? 0.6 : 1, flex: 1 }]}>
                    <Text style={{ fontFamily: diffuseFont.monoBold, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: dt.colors.ink3 }}>{t('common_cancel')}</Text>
                  </Pressable>
                  <Pressable onPress={handleUnlog} disabled={unlogging} style={({ pressed }) => [dm.actionRow, { borderTopColor: dt.colors.error, opacity: unlogging ? 0.6 : (pressed ? 0.6 : 1), flex: 1 }]}>
                    {unlogging ? <ActivityIndicator color={dt.colors.error} size="small" /> : (
                      <>
                        <Trash2 size={14} color={dt.colors.error} strokeWidth={1.8} />
                        <Text style={{ fontFamily: diffuseFont.monoBold, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: dt.colors.error }}>{t('kids_calendar_unlogBtn')}</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </>
            )
          })()}
        </DiffuseSheet>
      )}

      {/* ── Unlog Confirmation Modal ── */}
      {!diffuse && (
      <Modal visible={!!unlogTarget} animationType="fade" transparent onRequestClose={() => setUnlogTarget(null)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
          onPress={() => setUnlogTarget(null)}
        >
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 24, paddingBottom: insets.bottom + 16, gap: 16 }}>
            {/* Handle */}
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center' }} />
            {unlogTarget && (() => {
              const meta = LOG_META[unlogTarget.type] ?? { label: unlogTarget.type, icon: Calendar, color: colors.textMuted }
              const Icon = meta.icon
              const detail = formatLogDisplay(unlogTarget.type, unlogTarget.value, unlogTarget.notes)
              return (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: meta.color + '20', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={20} color={meta.color} strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{logTitle(unlogTarget)}</Text>
                      {detail ? <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }} numberOfLines={1}>{detail}</Text> : null}
                      <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{activityTimeDisplay(unlogTarget)}</Text>
                    </View>
                  </View>
                  <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center' }}>
                    {t('kids_calendar_unlogConfirm')}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Pressable
                      onPress={() => setUnlogTarget(null)}
                      style={{ flex: 1, height: 52, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ color: colors.textSecondary, fontSize: 15, fontWeight: '700' }}>{t('common_cancel')}</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleUnlog}
                      disabled={unlogging}
                      style={({ pressed }) => ({
                        flex: 1, height: 52, borderRadius: radius.full,
                        backgroundColor: brand.error, alignItems: 'center', justifyContent: 'center',
                        opacity: pressed || unlogging ? 0.7 : 1,
                      })}
                    >
                      {unlogging
                        ? <ActivityIndicator color="#FFF" size="small" />
                        : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Trash2 size={15} color="#FFF" strokeWidth={2.5} /><Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>{t('kids_calendar_unlogBtn')}</Text></View>}
                    </Pressable>
                  </View>
                </>
              )
            })()}
          </Pressable>
        </Pressable>
      </Modal>
      )}

      {/* ── Day Complete Congrats (Diffuse) ── */}
      {diffuse && (
        <Modal visible={showDayCongrats} animationType="fade" transparent onRequestClose={() => setShowDayCongrats(false)}>
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(20,19,19,0.55)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}
            onPress={() => setShowDayCongrats(false)}
          >
            <Pressable onPress={(e) => e.stopPropagation()} style={{ width: '100%' }}>
              <View style={{ backgroundColor: dt.colors.bg, borderRadius: 28, borderWidth: 1, borderColor: dt.colors.line, padding: 28, alignItems: 'center', overflow: 'hidden' }}>
                <SoftBloom color={getDiffuseAccent('kids', isDark)} cx="50%" cy="8%" opacity={isDark ? 0.3 : 0.4} spread={0.5} />
                <DiffuseBloomIcon color={stickers.yellow} size={64}>
                  <Sparkles size={30} color={dt.colors.ink3} strokeWidth={1.5} />
                </DiffuseBloomIcon>
                <Text style={{ fontFamily: diffuseFont.display, fontSize: 30, letterSpacing: -0.6, color: dt.colors.ink, marginTop: 12, textAlign: 'center' }}>
                  {t('kids_calendar_congrats_title')}
                </Text>
                <Text style={{ fontFamily: diffuseFont.body, fontSize: 15, lineHeight: 22, color: dt.colors.ink2, textAlign: 'center', marginTop: 6 }}>
                  {t('kids_calendar_congrats_allLogged', { day: formatDayLabel(selectedDate, todayStr, t) })}
                </Text>
                {(() => {
                  const loggedToday = selectedDayLogs.filter((l) => l.type !== 'skipped')
                  const foodLogs = loggedToday.filter((l) => l.type === 'food')
                  const totalCals = foodLogs.reduce((sum, l) => {
                    try { const v = JSON.parse(l.value ?? '{}'); return sum + (Number(v.estimatedCals) || 0) } catch { return sum }
                  }, 0)
                  return (
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 22, marginBottom: 22, width: '100%' }}>
                      <DiffuseMetricTile value={loggedToday.length} label={t('kids_calendar_congrats_activities')} />
                      {totalCals > 0 ? <DiffuseMetricTile value={totalCals} label={t('kids_calendar_congrats_kcal')} /> : null}
                      <DiffuseMetricTile value={selectedDayRoutines.length > 0 ? selectedDayRoutines.length : loggedToday.length} label={t('kids_calendar_congrats_routines')} />
                    </View>
                  )
                })()}
                <Pressable onPress={() => setShowDayCongrats(false)} style={({ pressed }) => [dm.actionRow, { borderTopColor: dt.colors.hairline, opacity: pressed ? 0.6 : 1, alignSelf: 'stretch' }]}>
                  <Text style={{ fontFamily: diffuseFont.monoBold, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: dt.colors.ink }}>{t('kids_calendar_congrats_btn')}</Text>
                  <DiffuseArrow color={dt.colors.ink3} size={16} />
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* ── Day Complete Congrats Modal ── */}
      {!diffuse && (
      <Modal
        visible={showDayCongrats}
        animationType="fade"
        transparent
        onRequestClose={() => setShowDayCongrats(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}
          onPress={() => setShowDayCongrats(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()} style={{ width: '100%' }}>
            <View style={{ backgroundColor: colors.surface, borderRadius: 32, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: brand.accent + '40' }}>
              {/* Star burst */}
              <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: brand.accent + '20', alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 2, borderColor: brand.accent + '50' }}>
                <EmojiSticker size={40}>{'🌟'}</EmojiSticker>
              </View>

              <Text style={{ color: brand.accent, fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginBottom: 8, textAlign: 'center', fontFamily: font.display }}>
                {t('kids_calendar_congrats_title')}
              </Text>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 6 }}>
                {t('kids_calendar_congrats_allLogged', { day: formatDayLabel(selectedDate, todayStr, t) })}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 28 }}>
                {selectedChildId === 'all'
                  ? "Every child\u2019s day is fully tracked. Keep up the incredible work!"
                  : `${children.find(c => c.id === selectedChildId)?.name ?? 'Their'}\u2019s day is fully tracked. You\u2019re doing great!`}
              </Text>

              {/* Stats row */}
              {(() => {
                const loggedToday = selectedDayLogs.filter((l) => l.type !== 'skipped')
                const foodLogs = loggedToday.filter(l => l.type === 'food')
                const totalCals = foodLogs.reduce((sum, l) => {
                  try { const v = JSON.parse(l.value ?? '{}'); return sum + (Number(v.estimatedCals) || 0) } catch { return sum }
                }, 0)
                return (
                  <View style={{ flexDirection: 'row', gap: 12, marginBottom: 28, width: '100%' }}>
                    <View style={{ flex: 1, backgroundColor: colors.bg, borderRadius: 20, padding: 16, alignItems: 'center' }}>
                      <Text style={{ color: brand.accent, fontSize: 28, fontWeight: '800', fontFamily: font.display }}>{loggedToday.length}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>{t('kids_calendar_congrats_activities')}</Text>
                    </View>
                    {totalCals > 0 && (
                      <View style={{ flex: 1, backgroundColor: colors.bg, borderRadius: 20, padding: 16, alignItems: 'center' }}>
                        <Text style={{ color: stickers.coral, fontSize: 28, fontWeight: '800', fontFamily: font.display }}>{totalCals}</Text>
                        <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>{t('kids_calendar_congrats_kcal')}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1, backgroundColor: colors.bg, borderRadius: 20, padding: 16, alignItems: 'center' }}>
                      <Text style={{ color: stickers.green, fontSize: 28, fontWeight: '800', fontFamily: font.display }}>{selectedDayRoutines.length > 0 ? selectedDayRoutines.length : loggedToday.length}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>{t('kids_calendar_congrats_routines')}</Text>
                    </View>
                  </View>
                )
              })()}

              <Pressable
                onPress={() => setShowDayCongrats(false)}
                style={({ pressed }) => ({
                  backgroundColor: brand.accent,
                  borderRadius: 999,
                  paddingVertical: 16,
                  paddingHorizontal: 40,
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>{t('kids_calendar_congrats_btn')}</Text>
                  <EmojiSticker size={18}>{'🎉'}</EmojiSticker>
                </View>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      )}
    </View>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16 },

  // Timeline (matches pregnancy)
  modeToggle: { flexDirection: 'row', padding: 4, borderRadius: 999, borderWidth: 1 },
  modeToggleBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 999 },
  modeToggleLabel: { fontSize: 13, fontWeight: '700' },
  timelineHeader: { marginBottom: 10, paddingHorizontal: 4 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timelineGutter: { width: 52, alignItems: 'flex-end' },
  timelineTime: { fontSize: 11, fontWeight: '600' },
  emptyCard: { padding: 24, borderRadius: 20, borderWidth: 1, alignItems: 'center' },
  addVisitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 999, marginTop: 8 },
  addVisitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },


  // Child selector
  childSelectorRow: { gap: 8, paddingVertical: 4, paddingLeft: 0, paddingRight: 28 },
  childSelectorChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1 },
  childScrollClip: { flex: 1, position: 'relative', overflow: 'hidden', marginBottom: 12 },
  childScrollFade: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 28 },
  kidPickerOverlay: { flex: 1, backgroundColor: 'rgba(20,19,19,0.5)', justifyContent: 'flex-end' },
  kidPickerSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderRightWidth: 1.5, maxHeight: '78%' },
  kidPickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14 },
  kidPickerTitle: { fontSize: 22, letterSpacing: -0.4 },
  kidPickerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 18 },
  kidPickerName: { flex: 1, fontSize: 15, letterSpacing: -0.1 },
  kidPickerMeta: { fontSize: 12 },
  childSelectorText: { fontSize: 14, fontWeight: '600' },
  childDot: { width: 8, height: 8, borderRadius: 4 },

  // Toggle
  toggleRow: { flexDirection: 'row', padding: 4, marginBottom: 16 },
  toggleBtn: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  toggleText: { fontSize: 14, fontWeight: '700' },

  // Month header
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, marginBottom: 16 },
  chevron: { padding: 8 },
  monthLabel: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },

  // Calendar grid
  calendarWrap: { marginBottom: 8 },
  weekRow: { flexDirection: 'row', marginBottom: 8 },
  weekday: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, height: 52, padding: 2 },
  dayInner: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  dayNumber: { fontSize: 14, fontWeight: '600' },
  todayDot: { width: 5, height: 5, borderRadius: 3, position: 'absolute', bottom: 4 },
  dotRow: { flexDirection: 'row', gap: 2 },
  logDot: { width: 4, height: 4, borderRadius: 2 },

  // Day detail panel
  dayDetailPanel: { padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  dayDetailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  dayDetailTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayDetailTitle: { fontSize: 16, fontWeight: '700' },
  dayDetailCount: { fontSize: 13, fontWeight: '500' },
  emptyDay: { alignItems: 'center', paddingVertical: 20, gap: 4 },
  emptyDayText: { fontSize: 14, fontWeight: '600' },
  emptyDayHint: { fontSize: 13 },
  dayLogList: { gap: 8 },
  dayLogItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 10 },
  loggedItem: { borderWidth: 1 },
  pendingRoutineItem: { borderWidth: 1, borderStyle: 'dashed' },
  listDivider: { height: StyleSheet.hairlineWidth, marginVertical: 8 },
  dayLogIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  loggedBadge: { position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  dayLogContent: { flex: 1, gap: 2 },
  dayLogType: { fontSize: 14, fontWeight: '700' },
  dayLogDetail: { fontSize: 13, fontWeight: '400' },
  dayLogMeta: { alignItems: 'flex-end', gap: 4 },
  dayLogTime: { fontSize: 12, fontWeight: '600' },
  dayLogChildTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  dayLogChildName: { fontSize: 10, fontWeight: '700' },

  // List view
  listWrap: { gap: 8, marginBottom: 16 },
  listDateHeader: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8, marginBottom: 4, paddingHorizontal: 4 },
  listItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  listIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  listContent: { flex: 1, gap: 2 },
  listType: { fontSize: 14, fontWeight: '700' },
  listDetail: { fontSize: 13, fontWeight: '400' },
  listMeta: { alignItems: 'flex-end', gap: 2 },
  listTime: { fontSize: 12, fontWeight: '600' },
  listChild: { fontSize: 11, fontWeight: '500' },
  emptyList: { padding: 32, alignItems: 'center' },

  // Banner
  banner: { padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  bannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  bannerTitle: { fontSize: 14, fontWeight: '700' },
  bannerEvent: { fontSize: 17, fontWeight: '700' },
  bannerDate: { fontSize: 14, fontWeight: '500', marginTop: 2 },

  // Highlight banner
  highlightBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, marginBottom: 12, borderWidth: 1 },
  highlightIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  highlightContent: { flex: 1, gap: 2 },
  highlightTitle: { fontSize: 14, fontWeight: '700' },
  highlightDetail: { fontSize: 12, fontWeight: '500' },
  highlightChildTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  highlightChildName: { fontSize: 10, fontWeight: '700' },
  highlightDots: { position: 'absolute', bottom: 6, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 4 },
  highlightDot: { width: 4, height: 4, borderRadius: 2 },

  // Routine panel

  // Routine manager
  routineFormWrap: { padding: 16, gap: 12 },
  routineFormTitle: { fontSize: 16, fontWeight: '700' },
  routineInput: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontWeight: '500' },
  routineTypeRow: { gap: 8, paddingVertical: 2 },
  routineTypeChip: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
  routineTypeText: { fontSize: 13, fontWeight: '600' },
  routineTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routineTimeInput: { flex: 1, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontWeight: '500' },
  routineDaysRow: { flexDirection: 'row', gap: 6, justifyContent: 'space-between' },
  routineDayChip: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  routineDayText: { fontSize: 13, fontWeight: '700' },
  routineSaveBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  routineSaveBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  routineManagerItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 8 },
  routineIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  routineName: { fontSize: 14, fontWeight: '700' },
  routineTime: { fontSize: 12, fontWeight: '500' },

  // FAB + Sheet
  fabBtn: { position: 'absolute', right: 16, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 6, zIndex: 10 },
  childRowWrap: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  addLogBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 3 },
  addLogBtnDiffuse: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  toggleWrap: { marginBottom: 14 },
  weekStripCard: { borderRadius: 24, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 14 },
  calViewToggle: { flexDirection: 'row', gap: 6, marginBottom: 10, alignSelf: 'flex-start' },
  calViewChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: 'transparent' },
  calViewChipText: { fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase' },
  fabSheetTitleWrap: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
  fabSheetBody: { paddingHorizontal: 20, gap: 14 },
  manageRoutinesBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 999, borderWidth: 1 },
  fabSheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,8,6,0.55)' },
  fabSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: '90%', borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  fabSheetHandle: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  fabSheetHandleBar: { width: 36, height: 4, borderRadius: 2 },
  fabSheetTitle: { fontSize: 18, fontWeight: '800', paddingHorizontal: 20, paddingBottom: 16 },
  fabSheetGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10 },
  fabSheetItem: { width: '31%', flexGrow: 1, alignItems: 'center', paddingVertical: 16, gap: 8 },
  fabSheetIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  fabSheetLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  fabRoutineBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 12, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1 },
  fabRoutineBtnText: { flex: 1, fontSize: 14, fontWeight: '700' },

  // Detail popup
  popupBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  popupSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: '85%' },
  popupHandleWrap: { alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
  popupHandle: { width: 36, height: 4, borderRadius: 2 },
  popupHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  popupIconLarge: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  popupHeaderText: { flex: 1, gap: 4 },
  popupTitle: { fontSize: 20, fontWeight: '800' },
  popupChildTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  popupChildName: { fontSize: 12, fontWeight: '700' },
  popupClose: { padding: 6 },
  popupBody: { paddingHorizontal: 20 },
  popupRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, marginBottom: 10 },
  popupRowText: { fontSize: 14, fontWeight: '600' },
  popupSection: { padding: 14, marginBottom: 10 },
  popupSectionLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  popupSectionValue: { fontSize: 15, fontWeight: '500', lineHeight: 22 },
  popupPhotos: { marginBottom: 10 },
  popupPhotoScroll: { paddingHorizontal: 16, gap: 10 },
  popupPhoto: { width: 200, height: 200 },

  // View mode actions
  popupActions: { flexDirection: 'row', gap: 10, marginTop: 6, marginBottom: 20 },
  popupEditBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14,
    shadowColor: '#141313', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 2,
  },
  popupEditText: { fontSize: 14, fontWeight: '700' },
  popupDeleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderWidth: 1.5, paddingHorizontal: 20,
    shadowColor: '#141313', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 1,
  },
  popupDeleteText: { fontSize: 14, fontWeight: '700' },

  // Edit mode
  editInput: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontWeight: '500', minHeight: 44 },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 6, marginBottom: 20 },
  editCancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 14, borderWidth: 1 },
  editCancelText: { fontSize: 14, fontWeight: '700' },
  editSaveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14 },
  editSaveText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
})
