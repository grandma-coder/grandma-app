/**
 * C5 — Pregnancy Calendar (v3)
 *
 * 4-tab view system:
 * 1. Month   — grid with trimester tints + log dots from real data
 * 2. Week    — 7-day strip + expand/collapse pending routines + logged section
 * 3. Journey — all 40 weeks with log summaries (UNCHANGED)
 * 4. Appts   — standard appointment timeline (UNCHANGED)
 *
 * New features (v3):
 * - LOG_META for all 15 pregnancy log types
 * - FAB (floating action button) → Quick Log Sheet
 * - Quick Log Sheet: 2-col grid of all 15 types + Manage Routines
 * - Month view: Upcoming Highlights Banner + collapsible Pending Routines + collapsible Logged
 * - Week view: same expand/collapse structure
 * - Log Detail Popup: tap a logged entry to see details, edit or delete
 * - Routine Manager: full CRUD against pregnancy_routines table
 */

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  Alert,
  TextInput,
  StyleSheet,
  Platform,
  UIManager,
  LayoutAnimation,
  ActivityIndicator,
  Dimensions,
} from 'react-native'
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Check,
  X,
  Smile,
  AlertCircle,
  Pill,
  Droplets,
  Moon,
  Dumbbell,
  Baby,
  Scale,
  Calendar,
  FlaskConical,
  Leaf,
  Zap,
  Home,
  Package,
  Timer,
  Trash2,
  Edit3,
  CheckCircle2,
  Minus,
  Pencil,
  Clock,
  Camera,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand, stickers as stickersLight, stickersDark, getModeColor, font, radius, useDiffuseTheme, getDiffuseAccent, diffuseFont, diffuseRadius } from '../../constants/theme'
import { useIsDiffuse, SoftBloom } from '../ui/diffuse/DiffuseKit'
import { DiffuseTimelineRow, DiffuseNowMarker, DiffuseLogIcon, DIFFUSE_LOG_CHARACTER, diffuseLogHue } from './DiffuseLogTimeline'
import { Character } from '../characters/Characters'
import { LogMonthGrid } from './LogMonthGrid'
import { DiffuseListRow, DiffuseEmptyState, DiffuseBloomIcon } from '../ui/diffuse/DiffusePrimitives'
import { usePregnancyStore } from '../../store/usePregnancyStore'
import { getTrimester, weekForDate } from '../../lib/pregnancyWeeks'
import { pregnancyWeeks, getCurrentWeekFromDueDate } from '../../lib/pregnancyData'
import { toDateStr } from '../../lib/cycleLogic'
import { supabase } from '../../lib/supabase'
import { invalidatePregnancyLogQueries } from '../../lib/queryClient'
import {
  usePregnancyCalendarLogs,
  usePregnancyTodayLogs,
} from '../../lib/analyticsData'
import type { PregnancyCalendarLog } from '../../lib/analyticsData'
import { STANDARD_APPOINTMENTS } from '../../lib/pregnancyAppointments'
import Svg, { Path as SvgPath, Circle as SvgCircle, G as SvgG, Line as SvgLine } from 'react-native-svg'
import { AgendaHeader } from './AgendaHeader'
import { SegmentedTabs } from './SegmentedTabs'
import { LogTile, LogTileGrid } from './LogTile'
import { ActivityPillCard } from './ActivityPillCard'
import { AgendaWeekStrip } from './AgendaWeekStrip'
import { AppointmentDetailModal } from './AppointmentDetailModal'
import { LogSheet } from './LogSheet'
import { LogFormSticker } from './LogFormSticker'
import { Display, Body, MonoCaps } from '../ui/Typography'
import { StickerButton } from '../ui/StickerButton'
import { PaperAlert } from '../ui/PaperAlert'
import { logSticker } from './logStickers'
import { MoodFace } from '../stickers/RewardStickers'
import { WeekDetailModal } from '../home/pregnancy/WeekDetailModal'
import type { StandardAppointment } from '../../lib/pregnancyAppointments'
import { moodFaceVariant, moodFaceFill } from '../../lib/moodFace'
import {
  PregnancyMoodForm,
  PregnancySymptomsForm,
  AppointmentForm,
  ExamResultForm,
  KickCountForm,
  WeightLogForm,
  SleepLogForm,
  ExerciseLogForm,
  KegelLogForm,
  WaterLogForm,
  VitaminsLogForm,
  NestingTaskForm,
  BirthPrepTaskForm,
  ContractionTimerLogForm,
} from './PregnancyLogForms'
import { PregnancyMealForm } from './PregnancyMealForm'
import { useTranslation } from '../../lib/i18n'

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
// Legacy accent constants — kept as locals so existing inline refs still work.
// Sourced from the new sticker / brand palette (no neons).
const COLOR_GREEN = stickersLight.green     // #BDD48C
const COLOR_AMBER = stickersLight.yellow    // #F5D652
const COLOR_BLUE = stickersLight.blue       // #9DC3E8
const COLOR_ORANGE = stickersLight.coral    // #EE7B6D

// Trimester colors — from brand.trimester.{first|second|third}
const TRIMESTER_TINT: Record<1 | 2 | 3, string> = {
  1: brand.trimester.first + '20',
  2: brand.trimester.second + '20',
  3: brand.trimester.third + '20',
}
const TRIMESTER_COLOR: Record<1 | 2 | 3, string> = {
  1: brand.trimester.first,
  2: brand.trimester.second,
  3: brand.trimester.third,
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewTab = 'timeline' | 'appointments'
type LogFormType =
  | 'mood' | 'weight' | 'symptom' | 'appointment' | 'exam_result' | 'kick_count'
  | 'sleep' | 'exercise' | 'nutrition' | 'kegel' | 'water' | 'vitamins'
  | 'nesting' | 'birth_prep' | 'contraction'

const LOG_FORM_TITLE: Record<LogFormType, string> = {
  mood: 'Log Mood',
  weight: 'Log Weight',
  symptom: 'Log Symptoms',
  appointment: 'Log Appointment',
  exam_result: 'Log Exam Result',
  kick_count: 'Count Kicks',
  sleep: 'Log Sleep',
  exercise: 'Log Movement',
  nutrition: 'Log Nutrition',
  kegel: 'Log Kegel',
  water: 'Log Water',
  vitamins: 'Log Vitamins',
  nesting: 'Nesting Task',
  birth_prep: 'Birth Prep',
  contraction: 'Log Contraction',
}

interface PregnancyRoutine {
  id: string
  user_id: string
  type: string
  name: string
  days_of_week: number[]
  time: string | null
  active: boolean
  created_at: string
}

// ─── LOG_META ─────────────────────────────────────────────────────────────────

const LOG_META: Record<string, { label: string; icon: typeof Smile; color: string }> = {
  mood:        { label: 'Mood',        icon: Smile,        color: brand.pregnancy },
  symptom:     { label: 'Symptom',     icon: AlertCircle,  color: COLOR_ORANGE },
  vitamins:    { label: 'Vitamins',    icon: Pill,         color: COLOR_GREEN },
  water:       { label: 'Water',       icon: Droplets,     color: COLOR_BLUE },
  sleep:       { label: 'Sleep',       icon: Moon,         color: brand.pregnancy },
  exercise:    { label: 'Exercise',    icon: Dumbbell,     color: COLOR_GREEN },
  kick_count:  { label: 'Kicks',       icon: Baby,         color: brand.pregnancy },
  weight:      { label: 'Weight',      icon: Scale,        color: COLOR_AMBER },
  appointment: { label: 'Appointment', icon: Calendar,     color: COLOR_AMBER },
  exam_result: { label: 'Exam Result', icon: FlaskConical, color: brand.phase.ovulation },
  nutrition:   { label: 'Nutrition',   icon: Leaf,         color: COLOR_GREEN },
  kegel:       { label: 'Kegel',       icon: Zap,          color: brand.pregnancy },
  nesting:     { label: 'Nesting',     icon: Home,         color: COLOR_ORANGE },
  birth_prep:  { label: 'Birth Prep',  icon: Package,      color: COLOR_ORANGE },
  contraction: { label: 'Contraction', icon: Timer,        color: brand.error },
}

const MOOD_EMOJI: Record<string, string> = {
  excited: '🤩', happy: '😊', okay: '😐', anxious: '😰', energetic: '⚡', sad: '😢',
}

const MOOD_LABEL: Record<string, string> = {
  excited: 'Excited', happy: 'Happy', okay: 'Okay', anxious: 'Anxious', energetic: 'Energetic', sad: 'Sad',
}

/** Maps a saturated meta color to a fixed pastel hex usable as a sticker fill. */
function softTintFor(c: string): string {
  switch (c) {
    case COLOR_GREEN:     return stickersLight.greenSoft
    case COLOR_BLUE:      return stickersLight.blueSoft
    case COLOR_AMBER:     return stickersLight.yellowSoft
    case COLOR_ORANGE:    return stickersLight.peachSoft
    case brand.error:     return stickersLight.peachSoft
    case brand.pregnancy: return brand.pregnancySoft
    default:              return brand.pregnancySoft
  }
}

const ALL_LOG_TYPES: LogFormType[] = [
  'mood', 'symptom', 'vitamins', 'water', 'sleep', 'exercise',
  'kick_count', 'weight', 'appointment', 'exam_result', 'nutrition',
  'kegel', 'nesting', 'birth_prep', 'contraction',
]

/** Map pregnancy log types → pastel tint keys in tints.ts */
const PREG_TINT_BY_TYPE: Record<string, string> = {
  mood: 'mood',
  symptom: 'symptom',
  vitamins: 'vitamins',
  water: 'water',
  sleep: 'sleep',
  exercise: 'exercise',
  kick_count: 'kicks',
  weight: 'weight',
  appointment: 'appointment',
  exam_result: 'exam',
  nutrition: 'nutrition',
  kegel: 'kegel',
  nesting: 'nesting',
  birth_prep: 'birthprep',
  contraction: 'contraction',
}

function dotColor(type: string): string {
  return LOG_META[type]?.color ?? 'rgba(255,255,255,0.3)'
}

// ─── Day View Constants ────────────────────────────────────────────────────────

const DAY_VIEW_DEFAULT_HOUR_H = 64
const DAY_VIEW_MIN_HOUR_H = 32
const DAY_VIEW_MAX_HOUR_H = 120
const DAY_VIEW_START = 0
const DAY_VIEW_END = 24

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  if (isNaN(h)) return t
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

function formatTime(isoStr: string): string {
  const d = new Date(isoStr)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatDayLabel(dateStr: string, todayStr: string): string {
  if (dateStr === todayStr) return 'Today'
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

function timeStrToHours(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return (isNaN(h) ? 0 : h) + (isNaN(m) ? 0 : m) / 60
}

function isoToLocalHours(iso: string): number {
  const d = new Date(iso)
  return d.getHours() + d.getMinutes() / 60
}

function fmtHourLabel(h: number): string {
  if (h === 0) return '12 AM'
  if (h === 12) return '12 PM'
  return h < 12 ? `${h} AM` : `${h - 12} PM`
}

function hoursToHHMM(h: number): string {
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return `${hrs}:${String(mins).padStart(2, '0')}`
}

function activityTimeHoursPreg(log: { value: string | null; created_at: string }): number {
  try {
    const v = JSON.parse(log.value ?? '{}')
    const t = v.startTime ?? v.time ?? null
    if (t && typeof t === 'string') return timeStrToHours(t)
  } catch { /* fall through */ }
  return isoToLocalHours(log.created_at)
}

function formatLogValue(log: PregnancyCalendarLog): string {
  if (!log.value) return ''
  try {
    const v = JSON.parse(log.value)
    if (typeof v === 'object' && v !== null) {
      const parts: string[] = []
      if (v.mood)      parts.push(v.mood)
      if (v.level)     parts.push(v.level)
      if (v.value)     parts.push(String(v.value))
      if (v.duration)  parts.push(`${v.duration} min`)
      if (v.amount)    parts.push(`${v.amount}`)
      if (v.count)     parts.push(`${v.count} kicks`)
      if (v.quality)   parts.push(v.quality)
      if (v.sets)      parts.push(`${v.sets} sets`)
      if (v.reps)      parts.push(`${v.reps} reps`)
      if (v.name)      parts.push(v.name)
      return parts.join(' · ') || log.value
    }
  } catch {
    // Not JSON — use as-is
  }
  return log.value
}

// ─── LogFormRouter ────────────────────────────────────────────────────────────

function LogFormRouter({
  type,
  date,
  onSaved,
}: {
  type: LogFormType
  date: string
  onSaved: () => void
}): React.ReactElement | null {
  if (type === 'mood')        return <PregnancyMoodForm date={date} onSaved={onSaved} />
  if (type === 'weight')      return <WeightLogForm date={date} onSaved={onSaved} />
  if (type === 'symptom')     return <PregnancySymptomsForm date={date} onSaved={onSaved} />
  if (type === 'appointment') return <AppointmentForm date={date} onSaved={onSaved} />
  if (type === 'exam_result') return <ExamResultForm date={date} onSaved={onSaved} />
  if (type === 'kick_count')  return <KickCountForm date={date} onSaved={onSaved} />
  if (type === 'sleep')       return <SleepLogForm date={date} onSaved={onSaved} />
  if (type === 'exercise')    return <ExerciseLogForm date={date} onSaved={onSaved} />
  if (type === 'nutrition')   return <PregnancyMealForm date={date} onSaved={onSaved} />
  if (type === 'kegel')       return <KegelLogForm date={date} onSaved={onSaved} />
  if (type === 'water')       return <WaterLogForm date={date} onSaved={onSaved} />
  if (type === 'vitamins')    return <VitaminsLogForm date={date} onSaved={onSaved} />
  if (type === 'nesting')     return <NestingTaskForm date={date} onSaved={onSaved} />
  if (type === 'birth_prep')  return <BirthPrepTaskForm date={date} onSaved={onSaved} />
  if (type === 'contraction') return <ContractionTimerLogForm date={date} onSaved={onSaved} />
  return null
}

// ─── Quick Log Sheet + FAB ────────────────────────────────────────────────────

function QuickLogSheet({
  visible,
  onClose,
  onSelect,
  onManageRoutines,
}: {
  visible: boolean
  onClose: () => void
  onSelect: (type: LogFormType) => void
  onManageRoutines: () => void
}) {
  const { colors, isDark, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()

  const paper = diffuse ? dt.colors.surface : colors.surface
  const paperBorder = diffuse ? dt.colors.line : colors.border
  const bg = diffuse ? dt.colors.bg : colors.bg
  const ink = diffuse ? dt.colors.ink : colors.text

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.fabSheetBackdrop} onPress={onClose} />
      <View style={[styles.fabSheet, { backgroundColor: bg, paddingBottom: insets.bottom + 16 }, diffuse ? { borderTopWidth: 1, borderColor: dt.colors.line } : null]}>
        <View style={styles.fabSheetHandle}>
          <View style={[styles.fabSheetHandleBar, { backgroundColor: diffuse ? dt.colors.line2 : paperBorder }]} />
        </View>
        <View style={styles.fabSheetHeaderRow}>
          {diffuse ? (
            <Text style={{ fontFamily: diffuseFont.display, fontSize: 24, letterSpacing: -0.3, color: ink }}>{t('pregCal_log_something')}</Text>
          ) : (
            <Display size={22} color={ink}>{t('pregCal_log_something')}</Display>
          )}
          <Pressable onPress={onClose} style={[styles.fabSheetClose, diffuse ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: dt.colors.hairline, borderRadius: 999, width: 34, height: 34, alignItems: 'center', justifyContent: 'center' } : { backgroundColor: paper, borderColor: paperBorder }]}>
            <X size={18} color={ink} strokeWidth={2} />
          </Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}>
          <LogTileGrid>
            {ALL_LOG_TYPES.map((type) => {
              const meta = LOG_META[type]
              const tint = PREG_TINT_BY_TYPE[type] ?? 'activity'
              return (
                <LogTile
                  key={type}
                  label={meta.label}
                  tint={tint}
                  icon={logSticker(type, 36, isDark)}
                  onPress={() => { onClose(); onSelect(type) }}
                />
              )
            })}
          </LogTileGrid>

          <Pressable
            onPress={() => { onClose(); onManageRoutines() }}
            style={({ pressed }) => diffuse ? [
              styles.manageRoutinesBtn,
              { backgroundColor: 'transparent', borderColor: dt.colors.line2, borderWidth: 1, opacity: pressed ? 0.6 : 1 },
            ] : [
              styles.manageRoutinesBtn,
              {
                backgroundColor: brand.pregnancySoft,
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
            <View style={diffuse ? {
              width: 30, height: 30, borderRadius: 15,
              backgroundColor: 'transparent',
              borderWidth: 1, borderColor: dt.colors.line2,
              alignItems: 'center', justifyContent: 'center',
            } : {
              width: 30, height: 30, borderRadius: 15,
              backgroundColor: paper,
              borderWidth: 1.5, borderColor: ink,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Calendar size={15} color={diffuse ? dt.colors.ink3 : ink} strokeWidth={diffuse ? 1.7 : 2.4} />
            </View>
            {diffuse ? (
              <Text style={{ fontFamily: diffuseFont.mono, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: dt.colors.ink, flex: 1 }}>
                {t('pregCal_manage_routines')}
              </Text>
            ) : (
              <Body size={14} color={ink} style={{ fontFamily: font.bodyBold, flex: 1, letterSpacing: 0.2 }}>
                {t('pregCal_manage_routines')}
              </Body>
            )}
            <ChevronRight size={16} color={diffuse ? dt.colors.ink3 : ink} strokeWidth={diffuse ? 1.7 : 2.4} />
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  )
}

// ─── Routine Manager ──────────────────────────────────────────────────────────

function RoutineManager({
  visible,
  onClose,
  routines,
  onSaved,
  onDeleted,
}: {
  visible: boolean
  onClose: () => void
  routines: PregnancyRoutine[]
  onSaved: () => void
  onDeleted: () => void
}) {
  const { colors, isDark, font, radius, stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()

  // Sticker palette (pregnancy = lavender accent). Under Diffuse these resolve
  // to the soft plum field tokens; hard offset shadows collapse to hairlines.
  const ST_INK = diffuse ? dt.colors.ink : colors.text
  const ST_PAPER = diffuse ? dt.colors.surface : colors.surface
  const ST_CREAM = diffuse ? dt.colors.surfaceRaised : colors.surfaceRaised
  const ST_SHEET = diffuse ? dt.colors.bg : colors.surfaceRaised
  const ST_LAVENDER = diffuse ? getDiffuseAccent('preg', dt.isDark) : getModeColor('preg', isDark)
  const ST_LAVENDER_SOFT = diffuse ? dt.colors.surfaceRaised : brand.pregnancySoft
  const ST_RED = diffuse ? dt.colors.error : (isDark ? '#E66B6B' : brand.error)
  // Resolved chrome helpers so the sticker geometry can stay while the Diffuse
  // path drops offset shadows and hard ink borders for hairlines + soft fonts.
  const stBorder = diffuse ? dt.colors.line : (isDark ? colors.border : ST_INK)
  const fDisplay = diffuse ? diffuseFont.display : font.display
  const fDisplayBold = diffuse ? diffuseFont.display : font.displayBold

  const DEFAULT_FORM = { name: '', type: 'vitamins' as string, time: '08:00', days: [0,1,2,3,4,5,6] as number[] }

  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [editingRoutine, setEditingRoutine] = useState<PregnancyRoutine | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  async function handleSave() {
    if (!form.name.trim()) {
      Alert.alert(t('pregCal_alertNameRequired'), t('pregCal_alertNameRequiredMsg'))
      return
    }
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      if (editingRoutine) {
        const { error } = await supabase.from('pregnancy_routines').update({
          type: form.type,
          name: form.name.trim(),
          days_of_week: form.days,
          time: form.time || null,
        }).eq('id', editingRoutine.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('pregnancy_routines').insert({
          user_id: session.user.id,
          type: form.type,
          name: form.name.trim(),
          days_of_week: form.days,
          time: form.time || null,
          active: true,
        })
        if (error) throw error
      }
      setForm(DEFAULT_FORM)
      setEditingRoutine(null)
      onSaved()
    } catch (e: unknown) {
      Alert.alert(t('pregCal_alertSaveError'), e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function openEdit(r: PregnancyRoutine) {
    setEditingRoutine(r)
    setForm({ name: r.name, type: r.type, time: r.time ?? '08:00', days: r.days_of_week })
  }

  function cancelEdit() {
    setEditingRoutine(null)
    setForm(DEFAULT_FORM)
  }

  async function performDelete() {
    const id = confirmDeleteId
    if (!id) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('pregnancy_routines').delete().eq('id', id)
      if (error) throw error
      onDeleted()
    } catch (e: unknown) {
      Alert.alert(t('pregCal_alertDeleteError'), e instanceof Error ? e.message : 'Please check your connection and try again.')
    } finally {
      setDeleting(false)
      setConfirmDeleteId(null)
    }
  }

  function toggleDay(d: number) {
    setForm((prev) => {
      const days = prev.days.includes(d)
        ? prev.days.filter((x) => x !== d)
        : [...prev.days, d].sort()
      return { ...prev, days }
    })
  }

  // ─── Reusable form fields (used inline AND inside the edit modal) ──────────
  const formFields = (
    <>
      {/* Name */}
      <View style={{
        backgroundColor: diffuse ? dt.colors.surface : ST_CREAM,
        borderColor: stBorder,
        borderWidth: diffuse ? 1 : 1.5,
        borderRadius: radius.full,
        height: 56,
        justifyContent: 'center',
      }}>
        <TextInput
          value={form.name}
          onChangeText={(t) => setForm((p) => ({ ...p, name: t }))}
          placeholder="Routine name"
          placeholderTextColor={diffuse ? dt.colors.ink3 : colors.textMuted}
          underlineColorAndroid="transparent"
          style={{
            color: diffuse ? dt.colors.ink : (isDark ? colors.text : ST_INK),
            paddingHorizontal: 22,
            paddingVertical: 0,
            fontSize: 15,
            fontFamily: diffuse ? diffuseFont.body : font.bodySemiBold,
          }}
        />
      </View>

      {/* Type chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4, paddingHorizontal: 2 }}>
        {ALL_LOG_TYPES.map((t) => {
          const meta = LOG_META[t]
          const active = form.type === t
          // Solid (no alpha) bg per mode — alpha bleeds the hard ink shadow.
          // Light: meta.color over cream gives a pastel; we use a fixed soft mix.
          // Dark: full saturation so it pops against the dark surface.
          const activeBg = isDark ? (meta.color || ST_LAVENDER) : softTintFor(meta.color || ST_LAVENDER)
          // Inactive bg in dark mode is the dark surface; ink text is invisible there.
          const labelColor = diffuse
            ? (active ? dt.colors.ink : dt.colors.ink3)
            : (active ? (isDark ? '#FFF' : ST_INK) : (isDark ? colors.text : ST_INK))
          return (
            <Pressable
              key={t}
              onPress={() => setForm((p) => ({ ...p, type: t }))}
              style={({ pressed }) => diffuse ? ({
                paddingHorizontal: 14, paddingVertical: 8,
                borderRadius: radius.full,
                borderWidth: 1,
                borderColor: active ? dt.colors.hairline : dt.colors.line,
                backgroundColor: active ? dt.colors.surface : 'transparent',
                opacity: pressed ? 0.7 : 1,
              }) : ({
                paddingHorizontal: 14, paddingVertical: 8,
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
              <Text style={{ color: labelColor, fontSize: diffuse ? 11 : 13, fontFamily: diffuse ? (active ? diffuseFont.monoBold : diffuseFont.mono) : (active ? font.bodyBold : font.bodySemiBold), letterSpacing: diffuse ? 0.8 : undefined, textTransform: diffuse ? 'uppercase' : 'none' }}>
                {meta.label}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>

      {/* Time */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{
          width: 32, height: 32, borderRadius: radius.full,
          backgroundColor: diffuse ? 'transparent' : ST_CREAM, borderWidth: diffuse ? 1 : 1.5, borderColor: diffuse ? dt.colors.line2 : ST_INK,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Clock size={14} color={diffuse ? dt.colors.ink3 : ST_INK} strokeWidth={diffuse ? 1.7 : 2.2} />
        </View>
        <TextInput
          value={form.time}
          onChangeText={(t) => setForm((p) => ({ ...p, time: t }))}
          placeholder="08:00"
          placeholderTextColor={diffuse ? dt.colors.ink3 : colors.textMuted}
          keyboardType="numbers-and-punctuation"
          style={{
            flex: 1,
            color: diffuse ? dt.colors.ink : (isDark ? colors.text : ST_INK),
            backgroundColor: diffuse ? dt.colors.surface : ST_CREAM,
            borderColor: stBorder,
            borderWidth: diffuse ? 1 : 1.5, borderRadius: radius.full,
            paddingHorizontal: 16, paddingVertical: 10,
            fontSize: 15, fontFamily: diffuse ? diffuseFont.mono : font.bodySemiBold,
          }}
        />
      </View>

      {/* Days */}
      <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'space-between' }}>
        {DAY_LABELS.map((label, idx) => {
          const active = form.days.includes(idx)
          return (
            <Pressable
              key={idx}
              onPress={() => toggleDay(idx)}
              style={({ pressed }) => diffuse ? ({
                width: 36, height: 36, borderRadius: radius.full,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1,
                borderColor: active ? dt.colors.hairline : dt.colors.line,
                backgroundColor: active ? dt.colors.surface : 'transparent',
                opacity: pressed ? 0.7 : 1,
              }) : ({
                width: 36, height: 36, borderRadius: radius.full,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1.5,
                borderColor: isDark && !active ? colors.border : ST_INK,
                backgroundColor: active ? ST_LAVENDER : ST_CREAM,
                shadowColor: ST_INK,
                shadowOffset: { width: 0, height: active ? (pressed ? 1 : 2) : 0 },
                shadowOpacity: active ? (1) : 0,
                shadowRadius: 0, elevation: active ? 3 : 0,
                transform: [{ translateY: active && pressed ? 1 : 0 }],
              })}
            >
              <Text style={{ fontSize: 13, fontFamily: diffuse ? (active ? diffuseFont.monoBold : diffuseFont.mono) : font.bodyBold, color: diffuse ? (active ? dt.colors.ink : dt.colors.ink3) : (active ? '#FFF' : (isDark ? colors.text : ST_INK)) }}>
                {label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </>
  )

  return (
    <>
      {/* ─── Manager sheet (sticker-on-paper) ─────────────────────── */}
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              maxHeight: '90%',
              backgroundColor: ST_SHEET,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              borderTopWidth: diffuse ? 1 : 1.5,
              borderLeftWidth: diffuse ? 1 : 1.5,
              borderRightWidth: diffuse ? 1 : 1.5,
              borderColor: diffuse ? dt.colors.line : (isDark ? colors.border : ST_INK),
              paddingBottom: insets.bottom + 20,
            }}
          >
            {/* Drag handle */}
            <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: diffuse ? dt.colors.line2 : (isDark ? colors.border : colors.borderLight) }} />
            </View>

            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 6, paddingBottom: 14, gap: 12 }}>
              {diffuse ? (
                <DiffuseBloomIcon color={ST_LAVENDER} size={44} intensity={0.5}>
                  <Calendar size={20} color={dt.colors.ink2} strokeWidth={1.7} />
                </DiffuseBloomIcon>
              ) : (
                <View style={{
                  width: 48, height: 48, borderRadius: radius.full,
                  backgroundColor: isDark ? colors.surfaceRaised : ST_LAVENDER_SOFT,
                  borderWidth: 1.5, borderColor: isDark ? colors.border : ST_INK,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Calendar size={22} color={ST_LAVENDER} strokeWidth={2.2} />
                </View>
              )}
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: diffuse ? dt.colors.ink : (isDark ? colors.text : ST_INK), fontSize: 24, letterSpacing: diffuse ? -0.3 : -0.5, fontFamily: fDisplay }}>
                  {t('pregCal_manage_routines')}
                </Text>
                <Text style={{ color: diffuse ? dt.colors.ink3 : colors.textMuted, fontSize: diffuse ? 11 : 13, fontFamily: diffuse ? diffuseFont.mono : font.bodyMedium, letterSpacing: diffuse ? 0.6 : undefined, textTransform: diffuse ? 'uppercase' : 'none' }}>
                  {t('pregCal_recurring_desc')}
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => diffuse ? ({
                  width: 36, height: 36, borderRadius: radius.full,
                  backgroundColor: 'transparent',
                  borderWidth: 1, borderColor: dt.colors.hairline,
                  alignItems: 'center', justifyContent: 'center',
                  opacity: pressed ? 0.6 : 1,
                }) : ({
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
                <X size={15} color={ST_INK} strokeWidth={diffuse ? 1.8 : 2.5} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}>
              {/* New routine form (paper card) — hidden while editing */}
              {!editingRoutine && (
                <View
                  style={diffuse ? {
                    backgroundColor: dt.colors.surface,
                    borderRadius: radius.lg,
                    borderWidth: 1, borderColor: dt.colors.line,
                    padding: 16, gap: 12,
                  } : {
                    backgroundColor: ST_PAPER,
                    borderRadius: radius.lg,
                    borderWidth: 1.5, borderColor: isDark ? colors.border : ST_INK,
                    padding: 16, gap: 12,
                    shadowColor: ST_INK,
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: isDark ? 0 : 0.12,
                    shadowRadius: 0, elevation: 2,
                  }}
                >
                  <Text style={{ color: diffuse ? dt.colors.ink : (isDark ? colors.text : ST_INK), fontSize: diffuse ? 20 : 18, fontFamily: fDisplayBold, letterSpacing: -0.3 }}>
                    {t('pregCal_new_routine')}
                  </Text>
                  {formFields}
                  {/* Save button */}
                  <Pressable
                    onPress={handleSave}
                    disabled={!form.name.trim() || saving}
                    style={({ pressed }) => {
                      const isDisabled = !form.name.trim() || saving
                      return diffuse ? {
                        height: 54,
                        borderRadius: radius.full,
                        backgroundColor: 'transparent',
                        borderWidth: 1, borderColor: dt.colors.hairline,
                        alignItems: 'center', justifyContent: 'center',
                        opacity: isDisabled ? 0.4 : (pressed ? 0.6 : 1),
                        marginTop: 4,
                      } : {
                        height: 56,
                        borderRadius: radius.full,
                        backgroundColor: isDisabled ? ST_LAVENDER + '88' : ST_LAVENDER,
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
                    {saving
                      ? <ActivityIndicator color={diffuse ? dt.colors.ink : '#FFF'} size="small" />
                      : <Text style={{ color: diffuse ? dt.colors.ink : '#FFF', fontFamily: diffuse ? diffuseFont.mono : font.bodyBold, fontSize: diffuse ? 12 : 15, letterSpacing: diffuse ? 1.4 : 0.8, textTransform: 'uppercase' }}>
                          {t('pregCal_add_routine')}
                        </Text>
                    }
                  </Pressable>
                </View>
              )}

              {/* Active routines list */}
              {routines.length > 0 && (
                <View style={{ marginTop: 20 }}>
                  <Text style={{ color: diffuse ? dt.colors.ink : (isDark ? colors.text : ST_INK), fontSize: diffuse ? 20 : 18, fontFamily: fDisplayBold, letterSpacing: -0.3, marginBottom: 12, paddingHorizontal: 4 }}>
                    {t('pregCal_active_routines', { count: routines.length })}
                  </Text>
                  {routines.map((r) => {
                    const meta = LOG_META[r.type] ?? { label: r.type, icon: Calendar, color: colors.textMuted }
                    const Icon = meta.icon
                    const daysLabel = r.days_of_week.length === 7
                      ? 'Every day'
                      : r.days_of_week.map((d) => WEEKDAYS[d]).join(', ')
                    if (diffuse) {
                      return (
                        <View
                          key={r.id}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 10,
                            padding: 12,
                            marginBottom: 10,
                            backgroundColor: dt.colors.surface,
                            borderRadius: radius.md,
                            borderWidth: 1, borderColor: dt.colors.line,
                          }}
                        >
                          <DiffuseBloomIcon color={getDiffuseAccent('preg', dt.isDark)} size={32} intensity={0.45}>
                            <Icon size={14} color={dt.colors.ink2} strokeWidth={1.7} />
                          </DiffuseBloomIcon>
                          <View style={{ flex: 1, gap: 3 }}>
                            <Text style={{ color: dt.colors.ink, fontSize: 15, fontFamily: diffuseFont.body }}>
                              {r.name}
                            </Text>
                            <Text style={{ color: dt.colors.ink3, fontSize: 9.5, fontFamily: diffuseFont.mono, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                              {r.time ? `${fmtTime(r.time)} · ` : ''}{daysLabel}
                            </Text>
                          </View>
                          <Pressable
                            onPress={() => openEdit(r)}
                            style={({ pressed }) => ({
                              width: 32, height: 32, borderRadius: radius.full,
                              backgroundColor: 'transparent',
                              borderWidth: 1, borderColor: dt.colors.line2,
                              alignItems: 'center', justifyContent: 'center',
                              opacity: pressed ? 0.6 : 1,
                            })}
                          >
                            <Pencil size={13} color={dt.colors.ink3} strokeWidth={1.8} />
                          </Pressable>
                          <Pressable
                            onPress={() => setConfirmDeleteId(r.id)}
                            style={({ pressed }) => ({
                              width: 32, height: 32, borderRadius: radius.full,
                              backgroundColor: 'transparent',
                              borderWidth: 1, borderColor: dt.colors.error,
                              alignItems: 'center', justifyContent: 'center',
                              opacity: pressed ? 0.6 : 1,
                            })}
                          >
                            <Trash2 size={13} color={dt.colors.error} strokeWidth={1.8} />
                          </Pressable>
                        </View>
                      )
                    }
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
                          borderWidth: 1.5, borderColor: isDark ? colors.border : ST_INK,
                          shadowColor: ST_INK,
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: isDark ? 0 : 0.08,
                          shadowRadius: 0, elevation: 2,
                        }}
                      >
                        <View style={{
                          width: 32, height: 32, borderRadius: radius.full,
                          backgroundColor: isDark ? meta.color : softTintFor(meta.color || ST_LAVENDER),
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
                            {r.time ? `${fmtTime(r.time)} · ` : ''}{daysLabel}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => openEdit(r)}
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
                          onPress={() => setConfirmDeleteId(r.id)}
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
                          <Trash2 size={13} color={ST_RED} strokeWidth={2.2} />
                        </Pressable>
                      </View>
                    )
                  })}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── Edit Routine popup ─────────────────────────────────── */}
      <Modal visible={!!editingRoutine} animationType="fade" transparent onRequestClose={cancelEdit}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', paddingHorizontal: 20 }}
          onPress={cancelEdit}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View
              style={diffuse ? {
                backgroundColor: dt.colors.surface,
                borderRadius: radius.lg,
                borderWidth: 1, borderColor: dt.colors.line,
                padding: 18, gap: 12,
                overflow: 'hidden',
              } : {
                backgroundColor: ST_PAPER,
                borderRadius: radius.lg,
                borderWidth: 1.5, borderColor: isDark ? colors.border : ST_INK,
                padding: 18, gap: 12,
                shadowColor: ST_INK,
                shadowOffset: { width: 0, height: 5 },
                shadowOpacity: 1, shadowRadius: 0, elevation: 8,
              }}
            >
              {diffuse ? <SoftBloom color={ST_LAVENDER} cx="88%" cy="8%" opacity={dt.isDark ? 0.2 : 0.28} spread={0.5} /> : null}
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {diffuse ? (
                    <DiffuseBloomIcon color={ST_LAVENDER} size={36} intensity={0.5}>
                      <Pencil size={16} color={dt.colors.ink2} strokeWidth={1.7} />
                    </DiffuseBloomIcon>
                  ) : (
                    <View style={{
                      width: 36, height: 36, borderRadius: radius.full,
                      backgroundColor: ST_LAVENDER_SOFT,
                      borderWidth: 1.5, borderColor: ST_INK,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Pencil size={16} color={ST_LAVENDER} strokeWidth={2.4} />
                    </View>
                  )}
                  <Text style={{ color: ST_INK, fontSize: 20, fontFamily: fDisplayBold, letterSpacing: -0.3 }}>
                    {t('pregCal_edit_routine')}
                  </Text>
                </View>
                <Pressable
                  onPress={cancelEdit}
                  style={({ pressed }) => diffuse ? ({
                    width: 32, height: 32, borderRadius: radius.full,
                    backgroundColor: 'transparent',
                    borderWidth: 1, borderColor: dt.colors.hairline,
                    alignItems: 'center', justifyContent: 'center',
                    opacity: pressed ? 0.6 : 1,
                  }) : ({
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
                  <X size={14} color={ST_INK} strokeWidth={diffuse ? 1.8 : 2.5} />
                </Pressable>
              </View>

              {formFields}

              {/* Action row: Cancel + Update */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                <Pressable
                  onPress={cancelEdit}
                  style={({ pressed }) => diffuse ? ({
                    flex: 1, height: 52,
                    borderRadius: radius.full,
                    backgroundColor: 'transparent',
                    borderWidth: 1, borderColor: dt.colors.line2,
                    alignItems: 'center', justifyContent: 'center',
                    opacity: pressed ? 0.6 : 1,
                  }) : ({
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
                  <Text style={{ color: diffuse ? dt.colors.ink3 : ST_INK, fontFamily: diffuse ? diffuseFont.mono : font.bodyBold, fontSize: diffuse ? 12 : 14, letterSpacing: diffuse ? 1.4 : 0.6, textTransform: 'uppercase' }}>
                    {t('common_cancel')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleSave}
                  disabled={!form.name.trim() || saving}
                  style={({ pressed }) => diffuse ? ({
                    flex: 1.4, height: 52,
                    borderRadius: radius.full,
                    backgroundColor: 'transparent',
                    borderWidth: 1, borderColor: dt.colors.hairline,
                    alignItems: 'center', justifyContent: 'center',
                    opacity: (!form.name.trim() || saving) ? 0.4 : (pressed ? 0.6 : 1),
                  }) : ({
                    flex: 1.4, height: 52,
                    borderRadius: radius.full,
                    backgroundColor: ST_LAVENDER,
                    borderWidth: 2, borderColor: ST_INK,
                    alignItems: 'center', justifyContent: 'center',
                    shadowColor: ST_INK,
                    shadowOffset: { width: 0, height: pressed ? 2 : 4 },
                    shadowOpacity: 1, shadowRadius: 0, elevation: 5,
                    transform: [{ translateY: pressed ? 2 : 0 }],
                    opacity: (!form.name.trim() || saving) ? 0.4 : 1,
                  })}
                >
                  {saving
                    ? <ActivityIndicator color={diffuse ? dt.colors.ink : '#FFF'} size="small" />
                    : <Text style={{ color: diffuse ? dt.colors.ink : '#FFF', fontFamily: diffuse ? diffuseFont.mono : font.bodyBold, fontSize: diffuse ? 12 : 14, letterSpacing: diffuse ? 1.4 : 0.6, textTransform: 'uppercase' }}>
                        {t('pregCal_update')}
                      </Text>
                  }
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ─── Delete confirm popup ───────────────────────────────── */}
      <Modal visible={!!confirmDeleteId} animationType="fade" transparent onRequestClose={() => !deleting && setConfirmDeleteId(null)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', paddingHorizontal: 32 }}
          onPress={() => !deleting && setConfirmDeleteId(null)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View
              style={diffuse ? {
                backgroundColor: dt.colors.surface,
                borderRadius: radius.xl,
                borderWidth: 1, borderColor: dt.colors.line,
                padding: 22, gap: 14,
                alignItems: 'center',
              } : {
                backgroundColor: ST_PAPER,
                borderRadius: radius.xl,
                borderWidth: 1.5, borderColor: isDark ? colors.border : ST_INK,
                padding: 22, gap: 14,
                alignItems: 'center',
                shadowColor: ST_INK,
                shadowOffset: { width: 0, height: 5 },
                shadowOpacity: 1, shadowRadius: 0, elevation: 8,
              }}
            >
              {diffuse ? (
                <DiffuseBloomIcon color={dt.colors.error} size={60} intensity={0.5}>
                  <Trash2 size={26} color={dt.colors.error} strokeWidth={1.8} />
                </DiffuseBloomIcon>
              ) : (
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
              )}
              <Text style={{ color: diffuse ? dt.colors.ink : (isDark ? colors.text : ST_INK), fontSize: 22, fontFamily: fDisplayBold, letterSpacing: -0.3, textAlign: 'center' }}>
                {t('pregCal_delete_routine_title')}
              </Text>
              <Text style={{ color: diffuse ? dt.colors.ink3 : colors.textMuted, fontSize: 14, fontFamily: diffuse ? diffuseFont.body : font.bodyMedium, textAlign: 'center', lineHeight: 20 }}>
                {t('pregCal_delete_routine_desc')}
              </Text>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 6, alignSelf: 'stretch' }}>
                <Pressable
                  onPress={() => setConfirmDeleteId(null)}
                  disabled={deleting}
                  style={({ pressed }) => diffuse ? ({
                    flex: 1, height: 52,
                    borderRadius: radius.full,
                    backgroundColor: 'transparent',
                    borderWidth: 1, borderColor: dt.colors.line2,
                    alignItems: 'center', justifyContent: 'center',
                    opacity: deleting ? 0.5 : (pressed ? 0.6 : 1),
                  }) : ({
                    flex: 1, height: 52,
                    borderRadius: radius.full,
                    backgroundColor: ST_CREAM,
                    borderWidth: 1.5, borderColor: ST_INK,
                    alignItems: 'center', justifyContent: 'center',
                    shadowColor: ST_INK,
                    shadowOffset: { width: 0, height: pressed ? 1 : 3 },
                    shadowOpacity: 1, shadowRadius: 0, elevation: 4,
                    transform: [{ translateY: pressed ? 2 : 0 }],
                    opacity: deleting ? 0.5 : 1,
                  })}
                >
                  <Text style={{ color: diffuse ? dt.colors.ink3 : ST_INK, fontFamily: diffuse ? diffuseFont.mono : font.bodyBold, fontSize: diffuse ? 12 : 14, letterSpacing: diffuse ? 1.4 : 0.6, textTransform: 'uppercase' }}>
                    {t('common_cancel')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={performDelete}
                  disabled={deleting}
                  style={({ pressed }) => diffuse ? ({
                    flex: 1, height: 52,
                    borderRadius: radius.full,
                    backgroundColor: 'transparent',
                    borderWidth: 1, borderColor: dt.colors.error,
                    alignItems: 'center', justifyContent: 'center',
                    opacity: deleting ? 0.6 : (pressed ? 0.6 : 1),
                  }) : ({
                    flex: 1, height: 52,
                    borderRadius: radius.full,
                    backgroundColor: ST_RED,
                    borderWidth: 2, borderColor: ST_INK,
                    alignItems: 'center', justifyContent: 'center',
                    shadowColor: ST_INK,
                    shadowOffset: { width: 0, height: pressed ? 2 : 4 },
                    shadowOpacity: 1, shadowRadius: 0, elevation: 5,
                    transform: [{ translateY: pressed ? 2 : 0 }],
                    opacity: deleting ? 0.6 : 1,
                  })}
                >
                  {deleting
                    ? <ActivityIndicator color={diffuse ? dt.colors.error : '#FFF'} size="small" />
                    : <Text style={{ color: diffuse ? dt.colors.error : '#FFF', fontFamily: diffuse ? diffuseFont.mono : font.bodyBold, fontSize: diffuse ? 12 : 14, letterSpacing: diffuse ? 1.4 : 0.6, textTransform: 'uppercase' }}>
                        {t('common_delete')}
                      </Text>
                  }
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

// ─── Log Detail Popup ─────────────────────────────────────────────────────────

/** Map pregnancy log types → sticker tint key + header label (matches add-log forms) */
const DETAIL_STICKER: Record<string, { tintKey: keyof typeof stickersLight; label: string }> = {
  mood:        { tintKey: 'yellowSoft', label: 'Mood check-in' },
  symptom:     { tintKey: 'peachSoft',  label: 'Symptom logged' },
  appointment: { tintKey: 'yellowSoft', label: 'Appointment' },
  exam_result: { tintKey: 'yellowSoft', label: 'Exam result' },
  kick_count:  { tintKey: 'pinkSoft',   label: "Baby's kicks" },
  sleep:       { tintKey: 'lilacSoft',  label: 'Sleep session' },
  exercise:    { tintKey: 'greenSoft',  label: 'Movement' },
  nutrition:   { tintKey: 'greenSoft',  label: 'Meal logged' },
  kegel:       { tintKey: 'lilacSoft',  label: 'Pelvic floor practice' },
  water:       { tintKey: 'blueSoft',   label: 'Hydration check-in' },
  vitamins:    { tintKey: 'greenSoft',  label: 'Prenatal vitamins' },
  nesting:     { tintKey: 'peachSoft',  label: 'Nesting task' },
  birth_prep:  { tintKey: 'lilacSoft',  label: 'Birth prep' },
  contraction: { tintKey: 'pinkSoft',   label: 'Contraction' },
  weight:      { tintKey: 'peachSoft',  label: 'Weight check' },
}

function LogDetailPopup({
  log,
  onEdit,
  onDeleted,
}: {
  log: PregnancyCalendarLog
  onEdit: () => void
  onDeleted: () => void
}) {
  const { colors, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const s = isDark ? stickersDark : stickersLight
  const meta = LOG_META[log.log_type] ?? { label: log.log_type, icon: Calendar, color: brand.pregnancy }
  const Icon = meta.icon
  const stickerCfg = DETAIL_STICKER[log.log_type] ?? { tintKey: 'yellowSoft' as const, label: meta.label }
  const stickerTint = s[stickerCfg.tintKey]
  const ink = diffuse ? dt.colors.ink : colors.text
  const inkMuted = diffuse ? dt.colors.ink3 : colors.textSecondary
  const paper = diffuse ? dt.colors.surface : colors.surface
  const paperBorder = diffuse ? dt.colors.line : colors.borderStrong

  // Parse value + notes
  const rawValue = log.value ?? ''
  const rawNotes = log.notes ?? ''
  let notesObj: Record<string, unknown> = {}
  try { notesObj = JSON.parse(rawNotes) as Record<string, unknown> } catch { /* plain text */ }

  // Format log date
  const logDate = new Date(log.log_date + 'T12:00:00')
  const dateLabel = logDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  // Build big metric (metric value, unit, sublabel)
  function getBigDisplay(): { metric: string; unit: string; sublabel: string; isText: boolean } {
    const isMood = log.log_type === 'mood'
    if (isMood) {
      const key = rawValue.toLowerCase()
      return { metric: MOOD_LABEL[key] ?? rawValue, unit: '', sublabel: (rawValue || 'mood').toUpperCase() + ' MOOD', isText: true }
    }
    switch (log.log_type) {
      case 'sleep':       return { metric: rawValue, unit: 'h', sublabel: 'SLEEP', isText: false }
      case 'weight':      return { metric: rawValue, unit: 'kg', sublabel: 'WEIGHT', isText: false }
      case 'water':       return { metric: rawValue, unit: 'gl', sublabel: 'WATER INTAKE', isText: false }
      case 'vitamins':    return { metric: '✓', unit: '', sublabel: 'VITAMINS TAKEN', isText: false }
      case 'kick_count':  return { metric: rawValue, unit: 'kicks', sublabel: 'KICK COUNT', isText: false }
      case 'exercise':    return { metric: rawValue, unit: 'min', sublabel: 'EXERCISE', isText: false }
      case 'contraction': return { metric: rawValue, unit: 's', sublabel: 'CONTRACTION', isText: false }
      case 'kegel':       return { metric: rawValue, unit: 'sets', sublabel: 'KEGEL', isText: false }
      case 'symptom':     return { metric: rawValue, unit: '', sublabel: 'SYMPTOM', isText: true }
      case 'appointment': return { metric: rawValue, unit: '', sublabel: 'APPOINTMENT', isText: true }
      case 'nutrition':   return { metric: rawValue, unit: 'kcal', sublabel: 'MEAL', isText: false }
      case 'nesting':     return { metric: rawValue, unit: '', sublabel: 'NESTING TASK', isText: true }
      case 'birth_prep':  return { metric: rawValue, unit: '', sublabel: 'BIRTH PREP', isText: true }
      case 'exam_result': return { metric: rawValue, unit: '', sublabel: 'EXAM RESULT', isText: true }
      default:            return { metric: rawValue, unit: '', sublabel: meta.label.toUpperCase(), isText: rawValue.length > 6 }
    }
  }

  // Build metadata pills
  interface Pill { label: string; color: string }
  function getPills(): Pill[] {
    const pills: Pill[] = [{ label: formatTime(log.created_at), color: colors.textSecondary }]
    if (typeof notesObj.type === 'string')            pills.push({ label: notesObj.type as string, color: COLOR_GREEN })
    if (typeof notesObj.quality === 'number')         pills.push({ label: `Quality ${notesObj.quality}`, color: meta.color })
    if (typeof notesObj.durationMinutes === 'number') pills.push({ label: `${notesObj.durationMinutes} min`, color: COLOR_BLUE })
    if (typeof notesObj.doctor === 'string')          pills.push({ label: notesObj.doctor as string, color: COLOR_AMBER })
    if (typeof notesObj.sets === 'number')            pills.push({ label: `${notesObj.sets} sets`, color: meta.color })
    if (typeof notesObj.duration === 'number')        pills.push({ label: `${notesObj.duration} min`, color: meta.color })
    return pills
  }

  const { metric, unit, sublabel, isText } = getBigDisplay()
  const pills = getPills()
  const plainNotes = rawNotes && !rawNotes.startsWith('{') ? rawNotes : null

  function handleDelete() {
    setConfirmingDelete(true)
  }

  async function confirmDelete() {
    setConfirmingDelete(false)
    const { error } = await supabase.from('pregnancy_logs').delete().eq('id', log.id)
    if (error) {
      Alert.alert(t('pregCal_alertDeleteError'), error.message)
      return
    }
    await invalidatePregnancyLogQueries()
    onDeleted()
  }

  return (
    <View style={styles.detailBody}>
      {/* Sticker header — matches add-log forms */}
      {diffuse ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <DiffuseLogIcon type={log.log_type} size={44} inkColor={dt.colors.ink3} />
          <Text style={{ fontFamily: diffuseFont.display, fontSize: 22, letterSpacing: -0.3, color: dt.colors.ink, flex: 1 }} numberOfLines={2}>
            {stickerCfg.label}
          </Text>
        </View>
      ) : (
        <LogFormSticker type={log.log_type} label={stickerCfg.label} tint={stickerTint} />
      )}

      {/* Big metric — Diffuse: bare on the sheet (no card / no gradient), with a
          log-type Character blob; cream: the paper card with a bloom. */}
      {diffuse ? (
        <View style={styles.detailMetricBare}>
          {log.log_type === 'mood' ? (
            <MoodFace size={64} variant={moodFaceVariant(rawValue.toLowerCase())} fill={moodFaceFill(rawValue.toLowerCase())} />
          ) : DIFFUSE_LOG_CHARACTER[log.log_type] ? (
            <Character name={DIFFUSE_LOG_CHARACTER[log.log_type]} size={52} color={diffuseLogHue(log.log_type)} bg={dt.colors.bg} />
          ) : (
            <Icon size={26} color={dt.colors.ink2} strokeWidth={1.6} />
          )}
          {isText ? (
            <Text style={[styles.detailMetricText, { color: ink, fontFamily: diffuseFont.display }]}>{metric}</Text>
          ) : (
            <Text style={[styles.detailMetricBig, { color: dt.colors.ink, fontFamily: diffuseFont.display }]}>
              {metric}
              {unit ? <Text style={[styles.detailMetricUnit, { color: dt.colors.ink3, fontFamily: diffuseFont.mono }]}>{` ${unit}`}</Text> : null}
            </Text>
          )}
          <Text style={[styles.detailMetricLabel, { color: inkMuted, fontFamily: diffuseFont.mono }]}>{sublabel}</Text>
        </View>
      ) : (
        <View style={[styles.detailMetricCard, { backgroundColor: paper, borderColor: paperBorder, borderWidth: 1.5, overflow: 'hidden' }]}>
          {log.log_type === 'mood' ? (
            <MoodFace size={64} variant={moodFaceVariant(rawValue.toLowerCase())} fill={moodFaceFill(rawValue.toLowerCase())} />
          ) : (
            <Icon size={26} color={meta.color} strokeWidth={2} />
          )}
          {isText ? (
            <Text style={[styles.detailMetricText, { color: ink }]}>{metric}</Text>
          ) : (
            <Text style={[styles.detailMetricBig, { color: meta.color }]}>
              {metric}
              {unit ? <Text style={[styles.detailMetricUnit, { color: meta.color }]}>{` ${unit}`}</Text> : null}
            </Text>
          )}
          <Text style={[styles.detailMetricLabel, { color: inkMuted }]}>{sublabel}</Text>
        </View>
      )}

      {/* Date pill row — paper chip with timer */}
      <View style={[styles.detailDateRow, { backgroundColor: diffuse ? 'transparent' : stickerTint, borderColor: diffuse ? dt.colors.line2 : paperBorder, borderWidth: diffuse ? 1 : 1.5 }]}>
        <Timer size={13} color={diffuse ? dt.colors.ink3 : ink} strokeWidth={diffuse ? 1.7 : 2} />
        <Text style={[styles.detailDateText, { color: diffuse ? dt.colors.ink3 : ink, fontFamily: diffuse ? diffuseFont.mono : undefined, letterSpacing: diffuse ? 0.6 : undefined, textTransform: diffuse ? 'uppercase' : 'none', fontSize: diffuse ? 11 : 13 }]}>{t('pregCal_date_at_time', { date: dateLabel, time: formatTime(log.created_at) })}</Text>
      </View>

      {/* Meta pills */}
      {pills.length > 1 && (
        <View style={styles.detailPillsRow}>
          {pills.slice(1).map((p, i) => (
            <View key={i} style={[styles.detailPill, { backgroundColor: diffuse ? 'transparent' : paper, borderColor: diffuse ? dt.colors.line2 : paperBorder, borderWidth: diffuse ? 1 : 1.5 }]}>
              <Text style={[styles.detailPillText, { color: diffuse ? dt.colors.ink3 : ink, fontFamily: diffuse ? diffuseFont.mono : undefined, letterSpacing: diffuse ? 0.6 : undefined, textTransform: diffuse ? 'uppercase' : 'none', fontSize: diffuse ? 10.5 : 12 }]}>{p.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Plain notes */}
      {plainNotes && (
        <View style={[styles.detailNotesBox, { backgroundColor: diffuse ? dt.colors.surface : paper, borderColor: diffuse ? dt.colors.line : paperBorder, borderWidth: diffuse ? 1 : 1.5 }]}>
          <Text style={[styles.detailNotesText, { color: ink, fontFamily: diffuse ? diffuseFont.body : undefined }]}>{plainNotes}</Text>
        </View>
      )}

      {/* Actions */}
      {diffuse ? (
        <View style={styles.detailActions}>
          <Pressable
            onPress={onEdit}
            style={({ pressed }) => ({ flex: 1, height: 52, borderRadius: 999, borderWidth: 1, borderColor: dt.colors.hairline, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: pressed ? 0.6 : 1 })}
          >
            <Edit3 size={16} color={dt.colors.ink} strokeWidth={1.8} />
            <Text style={{ fontFamily: diffuseFont.mono, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', color: dt.colors.ink }}>{t('common_edit')}</Text>
          </Pressable>
          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => ({ flex: 1, height: 52, borderRadius: 999, borderWidth: 1, borderColor: dt.colors.error, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: pressed ? 0.6 : 1 })}
          >
            <Trash2 size={16} color={dt.colors.error} strokeWidth={1.8} />
            <Text style={{ fontFamily: diffuseFont.mono, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', color: dt.colors.error }}>{t('common_delete')}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.detailActions}>
          <StickerButton
            label="Edit"
            color={brand.pregnancy}
            colorDark={'#141313'}
            icon={<Edit3 size={16} color="#fff" strokeWidth={2.2} />}
            textColor="#fff"
            height={56}
            fontSize={15}
            onPress={onEdit}
            style={{ flex: 1 }}
          />
          <StickerButton
            label="Delete"
            color={isDark ? brand.error + '33' : '#FCE3DD'}
            colorDark={brand.error}
            icon={<Trash2 size={16} color={brand.error} strokeWidth={2.2} />}
            textColor={brand.error}
            height={56}
            fontSize={15}
            onPress={handleDelete}
            style={{ flex: 1 }}
          />
        </View>
      )}

      <PaperAlert
        visible={confirmingDelete}
        title="Delete this log?"
        message="This cannot be undone."
        buttons={[
          { label: 'Cancel', variant: 'secondary' },
          { label: 'Delete', variant: 'danger', onPress: confirmDelete },
        ]}
        onRequestClose={() => setConfirmingDelete(false)}
      />
    </View>
  )
}

// ─── Day Detail Panel ─────────────────────────────────────────────────────────

function DayDetailPanel({
  dateStr,
  todayStr,
  logs,
  pendingRoutines,
  onOpenLog,
  onDeleteLog,
  onOpenRoutine,
}: {
  dateStr: string
  todayStr: string
  logs: PregnancyCalendarLog[]
  pendingRoutines: PregnancyRoutine[]
  onOpenLog: (log: PregnancyCalendarLog) => void
  onDeleteLog: (log: PregnancyCalendarLog) => void
  onOpenRoutine: (type: LogFormType) => void
}) {
  const { colors } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()

  const [pendingCollapsed, setPendingCollapsed] = useState(false)
  const [loggedCollapsed, setLoggedCollapsed] = useState(false)
  const [expandedLogTypes, setExpandedLogTypes] = useState<Set<string>>(new Set())
  const [expandedPendingTypes, setExpandedPendingTypes] = useState<Set<string>>(new Set())

  useEffect(() => {
    setPendingCollapsed(false)
    setLoggedCollapsed(false)
    setExpandedLogTypes(new Set())
    setExpandedPendingTypes(new Set())
  }, [dateStr])

  const nonEmptyLogs = logs.filter((l) => l.log_type !== 'skipped')

  // Group pending routines by type
  const pendingByType = useMemo(() => {
    const groups: Record<string, PregnancyRoutine[]> = {}
    for (const r of pendingRoutines) {
      if (!groups[r.type]) groups[r.type] = []
      groups[r.type].push(r)
    }
    return groups
  }, [pendingRoutines])

  // Group logged entries by type
  const logsByType = useMemo(() => {
    const groups: Record<string, PregnancyCalendarLog[]> = {}
    for (const log of nonEmptyLogs) {
      if (!groups[log.log_type]) groups[log.log_type] = []
      groups[log.log_type].push(log)
    }
    return groups
  }, [nonEmptyLogs])

  function togglePendingType(type: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpandedPendingTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type); else next.add(type)
      return next
    })
  }

  function toggleLogType(type: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpandedLogTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type); else next.add(type)
      return next
    })
  }

  return (
    <View style={[styles.dayPanel, diffuse ? { backgroundColor: dt.colors.surface, borderWidth: 1, borderColor: dt.colors.line } : { backgroundColor: colors.surface }]}>
      {/* Header — calendar icon + date + activity count */}
      <View style={styles.dayPanelHeader}>
        <View style={styles.dayPanelDateRow}>
          <Calendar size={15} color={diffuse ? dt.colors.ink3 : brand.pregnancy} strokeWidth={diffuse ? 1.6 : 2} />
          <Text style={[styles.dayPanelDate, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.display } : { color: colors.text }]}>
            {formatDayLabel(dateStr, todayStr)}
          </Text>
        </View>
        <Text style={[styles.dayPanelCount, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1, textTransform: 'uppercase', fontSize: 10 } : { color: colors.textMuted }]}>
          {nonEmptyLogs.length} {nonEmptyLogs.length === 1 ? 'activity' : 'activities'}
        </Text>
      </View>

      {/* Empty state */}
      {nonEmptyLogs.length === 0 && pendingRoutines.length === 0 && (
        <Text style={[styles.emptyDay, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.body } : { color: colors.textMuted }]}>{t('pregCal_no_logs_day')}</Text>
      )}

      {/* ── Diffuse: flat vertical "choice timeline" (match Kids/Cycle) ─────
          Pending routines render as un-logged rows, then logged entries as
          logged rows — one DiffuseTimelineRow per entry, no collapse groups. */}
      {diffuse ? (() => {
        const rows: Array<{ key: string; type: string; time?: string; title: string; sub?: string; logged: boolean; onPress: () => void }> = []
        for (const r of pendingRoutines) {
          const meta = LOG_META[r.type] ?? { label: r.type }
          rows.push({
            key: `p-${r.id}`,
            type: r.type,
            time: r.time ? fmtTime(r.time) : undefined,
            title: meta.label,
            sub: t('pregCal_tap_to_log'),
            logged: false,
            onPress: () => onOpenRoutine(r.type as LogFormType),
          })
        }
        for (const log of nonEmptyLogs) {
          const meta = LOG_META[log.log_type] ?? { label: log.log_type }
          const v = formatLogValue(log)
          rows.push({
            key: `l-${log.id}`,
            type: log.log_type,
            time: formatTime(log.created_at),
            title: meta.label,
            sub: v !== '' ? v : undefined,
            logged: true,
            onPress: () => onOpenLog(log),
          })
        }
        if (rows.length === 0) return null
        return (
          <View style={{ marginTop: 4 }}>
            {rows.map((r, i) => (
              <DiffuseTimelineRow
                key={r.key}
                type={r.type}
                time={r.time}
                title={r.title}
                sub={r.sub}
                logged={r.logged}
                first={i === 0}
                last={i === rows.length - 1}
                onPress={r.onPress}
              />
            ))}
          </View>
        )
      })() : null}

      {/* ── Pending routines — grouped by type ────────────────────────────── */}
      {!diffuse && pendingRoutines.length > 0 && (
        <>
          <Pressable
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
              setPendingCollapsed((v) => !v)
            }}
            style={styles.sectionToggleRow}
          >
            <AlertCircle size={13} color={COLOR_ORANGE} strokeWidth={2.5} />
            <Text style={[styles.sectionToggleLabel, { color: COLOR_ORANGE }]}>
              {t('pregCal_pending_count', { count: pendingRoutines.length })}
            </Text>
            {pendingCollapsed
              ? <ChevronDown size={14} color={COLOR_ORANGE} strokeWidth={2} />
              : <ChevronUp size={14} color={COLOR_ORANGE} strokeWidth={2} />}
          </Pressable>

          {!pendingCollapsed && Object.entries(pendingByType).map(([type, routines]) => {
            const meta = LOG_META[type] ?? { label: type, icon: Calendar, color: brand.pregnancy }
            const Icon = meta.icon
            const isExpanded = expandedPendingTypes.has(type)
            return (
              <View key={type} style={{ marginBottom: 4 }}>
                {/* Type row */}
                <Pressable
                  onPress={() => togglePendingType(type)}
                  style={[styles.typeGroupHeader, { backgroundColor: meta.color + '12' }]}
                >
                  <Icon size={14} color={meta.color} strokeWidth={2.5} />
                  <Text style={[styles.typeGroupLabel, { color: meta.color }]}>{meta.label}</Text>
                  <Text style={[styles.typeGroupCount, { color: meta.color + 'AA' }]}>{routines.length}</Text>
                  {isExpanded
                    ? <ChevronUp size={13} color={meta.color} strokeWidth={2} />
                    : <ChevronDown size={13} color={meta.color} strokeWidth={2} />}
                </Pressable>

                {/* Individual routine items */}
                {isExpanded && routines.map((routine) => (
                  <Pressable
                    key={routine.id}
                    onPress={() => onOpenRoutine(routine.type as LogFormType)}
                    style={({ pressed }) => [
                      styles.routineItem,
                      { borderColor: meta.color + '40', backgroundColor: meta.color + '08', marginTop: 3 },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <View style={styles.routineItemContent}>
                      <Text style={[styles.routineItemName, { color: colors.textSecondary }]}>{routine.name}</Text>
                      <Text style={[styles.routineItemSub, { color: colors.textMuted }]}>
                        {routine.time ? `${fmtTime(routine.time)} · ` : ''}{t('pregCal_tap_to_log')}
                      </Text>
                    </View>
                    {routine.time && (
                      <Text style={[styles.routineItemTime, { color: colors.textMuted }]}>{fmtTime(routine.time)}</Text>
                    )}
                    <ChevronRight size={14} color={colors.textMuted} strokeWidth={2} />
                  </Pressable>
                ))}
              </View>
            )
          })}
        </>
      )}

      {/* Divider between pending and logged */}
      {!diffuse && pendingRoutines.length > 0 && nonEmptyLogs.length > 0 && (
        <View style={[styles.listDivider, { backgroundColor: colors.border }]} />
      )}

      {/* ── Logged entries — grouped by type ──────────────────────────────── */}
      {!diffuse && nonEmptyLogs.length > 0 && (
        <>
          <Pressable
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
              setLoggedCollapsed((v) => !v)
            }}
            style={styles.sectionToggleRow}
          >
            <Check size={13} color={COLOR_GREEN} strokeWidth={2.5} />
            <Text style={[styles.sectionToggleLabel, { color: COLOR_GREEN }]}>
              {t('pregCal_logged_count', { count: nonEmptyLogs.length })}
            </Text>
            {loggedCollapsed
              ? <ChevronDown size={14} color={COLOR_GREEN} strokeWidth={2} />
              : <ChevronUp size={14} color={COLOR_GREEN} strokeWidth={2} />}
          </Pressable>

          {!loggedCollapsed && Object.entries(logsByType).map(([type, typeLogs]) => {
            const meta = LOG_META[type] ?? { label: type, icon: Calendar, color: brand.pregnancy }
            const Icon = meta.icon
            const isExpanded = expandedLogTypes.has(type)
            return (
              <View key={type} style={{ marginBottom: 4 }}>
                {/* Type row */}
                <Pressable
                  onPress={() => toggleLogType(type)}
                  style={[styles.typeGroupHeader, { backgroundColor: meta.color + '12' }]}
                >
                  <Icon size={14} color={meta.color} strokeWidth={2.5} />
                  <Text style={[styles.typeGroupLabel, { color: meta.color }]}>{meta.label}</Text>
                  <Text style={[styles.typeGroupCount, { color: meta.color + 'AA' }]}>{typeLogs.length}</Text>
                  {isExpanded
                    ? <ChevronUp size={13} color={meta.color} strokeWidth={2} />
                    : <ChevronDown size={13} color={meta.color} strokeWidth={2} />}
                </Pressable>

                {/* Individual log items */}
                {isExpanded && typeLogs.map((log, i) => {
                  const valueDisplay = formatLogValue(log)
                  return (
                    <Pressable
                      key={`${log.id}-${i}`}
                      onPress={() => onOpenLog(log)}
                      onLongPress={() => {
                        Alert.alert(
                          t('pregCal_alertDeleteLogTitle'),
                          t('pregCal_alertDeleteLog', { label: meta.label }),
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => onDeleteLog(log) },
                          ]
                        )
                      }}
                      delayLongPress={400}
                      style={({ pressed }) => [
                        styles.loggedItem,
                        { borderColor: meta.color + '30', backgroundColor: meta.color + '08', marginTop: 3 },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <View style={styles.loggedItemContent}>
                        {valueDisplay !== '' && (
                          <Text style={[styles.loggedItemValue, { color: colors.textSecondary }]} numberOfLines={1}>
                            {valueDisplay}
                          </Text>
                        )}
                      </View>
                      <Text style={[styles.loggedItemTime, { color: colors.textMuted }]}>
                        {formatTime(log.created_at)}
                      </Text>
                      <ChevronRight size={14} color={colors.textMuted} strokeWidth={2} />
                    </Pressable>
                  )
                })}
              </View>
            )
          })}
        </>
      )}
    </View>
  )
}

// ─── Diffuse week strip ─────────────────────────────────────────────────────
// The Diffuse counterpart to AgendaWeekStrip: a hairline day row. Each day is a
// thin hairline circle; selected = accent ring + soft radial bloom behind. Days
// with logs get the same blob markers as LogMonthGrid (up to 2 blobs, 1 blob +
// "+N" on overflow), fed from monthGridByDate — so Month and Week views show
// consistent per-day log icons. Falls back to accent dots when no types given.
// Mirrors KidsCalendar.DiffuseWeekStrip (pregnancy accent).
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
  const acc = getDiffuseAccent('preg', isDark)
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

// ─── Main Component ────────────────────────────────────────────────────────────

export function PregnancyCalendar() {
  const { colors, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const dAccent = getDiffuseAccent('preg', dt.isDark)
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()

  const storedWeek = usePregnancyStore((s) => s.weekNumber)
  const dueDate = usePregnancyStore((s) => s.dueDate) ?? ''
  const weekNumber = dueDate ? getCurrentWeekFromDueDate(dueDate) : (storedWeek ?? 1)

  const [view, setView] = useState<ViewTab>('timeline')
  const [calView, setCalView] = useState<'month' | 'week'>('month')
  const [viewDate, setViewDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()))
  const [logForm, setLogForm] = useState<{ type: LogFormType; date: string } | null>(null)
  const [showQuickLog, setShowQuickLog] = useState(false)
  const [showRoutineManager, setShowRoutineManager] = useState(false)
  const [selectedLog, setSelectedLog] = useState<PregnancyCalendarLog | null>(null)
  const [selectedJourneyWeek, setSelectedJourneyWeek] = useState<number | null>(null)
  const [selectedAppt, setSelectedAppt] = useState<StandardAppointment | null>(null)

  const [dayZoomH, setDayZoomH] = useState(DAY_VIEW_DEFAULT_HOUR_H)
  const dayScrollRef = useRef<ScrollView>(null)
  const apptCurveScrollRef = useRef<ScrollView>(null)

  const [userId, setUserId] = useState<string | undefined>(undefined)
  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => setUserId(session?.user.id))
      .catch(() => { /* transient network failure — retried on next mount */ })
  }, [])

  // Auto-center the appointment S-curve on the next-up milestone whenever
  // the user opens the Appts tab.
  useEffect(() => {
    if (view !== 'appointments') return
    const BEAD_GAP = 90
    const SIDE_PAD = 32
    const nextIdx = STANDARD_APPOINTMENTS.findIndex((a) => weekNumber <= a.week)
    const idx = nextIdx === -1 ? STANDARD_APPOINTMENTS.length - 1 : Math.max(0, nextIdx)
    const targetX = SIDE_PAD + idx * BEAD_GAP
    const winW = Dimensions.get('window').width
    const x = Math.max(0, targetX - winW / 2 + 16)
    const t = setTimeout(() => {
      apptCurveScrollRef.current?.scrollTo({ x, animated: true })
    }, 220)
    return () => clearTimeout(t)
  }, [view, weekNumber])

  // Routines state
  const [pregnancyRoutines, setPregnancyRoutines] = useState<PregnancyRoutine[]>([])

  const fetchRoutines = useCallback(async () => {
    if (!userId) return
    try {
      const { data } = await supabase
        .from('pregnancy_routines')
        .select('*')
        .eq('user_id', userId)
        .eq('active', true)
        .order('time', { ascending: true })
      if (data) setPregnancyRoutines(data as PregnancyRoutine[])
    } catch { /* silent */ }
  }, [userId])

  useEffect(() => { void fetchRoutines() }, [fetchRoutines])

  // Keep viewDate's month in sync with selectedDate so the calendar query
  // refetches when the user navigates into a previous (or future) month
  // via the week strip. Without this, logs saved to a date outside the
  // current viewDate's month never appear because they aren't fetched.
  useEffect(() => {
    const sel = new Date(selectedDate + 'T12:00:00')
    if (
      sel.getFullYear() !== viewDate.getFullYear() ||
      sel.getMonth() !== viewDate.getMonth()
    ) {
      setViewDate(sel)
    }
  }, [selectedDate, viewDate])

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const todayStr = toDateStr(new Date())

  const { data: calLogs = {}, refetch } = usePregnancyCalendarLogs(userId, year, month)
  const { data: todayLogs = {}, refetch: refetchToday } = usePregnancyTodayLogs(userId)

  // Pulse newly-added log entries once to confirm the save.
  const seenLogIdsRef = useRef<Set<string> | null>(null)
  const [pulsingLogIds, setPulsingLogIds] = useState<Set<string>>(() => new Set())
  useEffect(() => {
    const currentIds = new Set<string>()
    for (const dayLogs of Object.values(calLogs)) {
      for (const l of dayLogs) currentIds.add(l.id)
    }
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
  }, [calLogs])

  function handleSaved() {
    setLogForm(null)
    void refetch()
    void refetchToday()
  }

  async function handleDeleteLog(log: PregnancyCalendarLog) {
    let error: { message: string } | null = null
    try {
      ;({ error } = await supabase.from('pregnancy_logs').delete().eq('id', log.id))
    } catch (e: any) {
      error = { message: e?.message ?? 'Network error. Please try again.' }
    }
    if (error) {
      Alert.alert(t('pregCal_alertDeleteError'), error.message)
      return
    }
    await invalidatePregnancyLogQueries()
    void refetch()
    void refetchToday()
  }

  function prevDay() {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    setSelectedDate(toDateStr(d))
  }

  function nextDay() {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() + 1)
    setSelectedDate(toDateStr(d))
  }

  // ── Pending routines for selected date ────────────────────────────────────

  const pendingRoutinesForDate = useCallback((dateStr: string): PregnancyRoutine[] => {
    const d = new Date(dateStr + 'T12:00:00')
    const dow = d.getDay()
    const dayLogs = calLogs[dateStr] ?? []
    return pregnancyRoutines.filter((r) => {
      if (!r.days_of_week.includes(dow)) return false
      // Check if already logged for this date+type
      return !dayLogs.some((l) => l.log_type === r.type)
    })
  }, [pregnancyRoutines, calLogs])

  // ── Upcoming Highlights (next 3 days) ─────────────────────────────────────

  const [highlightIndex, setHighlightIndex] = useState(0)

  const upcomingHighlights = useMemo(() => {
    const highlights: { id: string; title: string; detail: string; color: string; icon: typeof Calendar; date: string }[] = []
    const today = new Date()
    for (let offset = 1; offset <= 3; offset++) {
      const d = new Date(today)
      d.setDate(d.getDate() + offset)
      const dow = d.getDay()
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const dayLabel = offset === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

      for (const r of pregnancyRoutines) {
        if (!r.days_of_week.includes(dow)) continue
        if (['appointment', 'exam_result'].includes(r.type)) {
          const meta = LOG_META[r.type] ?? { label: r.type, icon: Calendar, color: brand.pregnancy }
          highlights.push({
            id: `r-${r.id}-${offset}`,
            title: r.name,
            detail: `${r.time ? fmtTime(r.time) + ' · ' : ''}${dayLabel}`,
            color: meta.color,
            icon: meta.icon,
            date: dateStr,
          })
        }
      }
    }
    return highlights
  }, [pregnancyRoutines])

  // Auto-rotate highlights
  useEffect(() => {
    if (upcomingHighlights.length <= 1) return
    const timer = setInterval(() => {
      setHighlightIndex((i) => (i + 1) % upcomingHighlights.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [upcomingHighlights.length])

  // ── Calendar grid ─────────────────────────────────────────────────────────

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: {
      date: string
      day: number
      inMonth: boolean
      trimester: 1 | 2 | 3
      isToday: boolean
      isFuture: boolean
      logs: PregnancyCalendarLog[]
    }[] = []

    for (let i = 0; i < firstDay; i++) {
      days.push({ date: '', day: 0, inMonth: false, trimester: 1, isToday: false, isFuture: false, logs: [] })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const wk = dueDate ? weekForDate(dueDate, dateStr) : weekNumber
      const tri = getTrimester(wk) as 1 | 2 | 3
      days.push({
        date: dateStr,
        day: d,
        inMonth: true,
        trimester: tri,
        isToday: dateStr === todayStr,
        isFuture: dateStr > todayStr,
        logs: calLogs[dateStr] ?? [],
      })
    }
    return days
  }, [year, month, dueDate, weekNumber, todayStr, calLogs])

  // ── Week days ─────────────────────────────────────────────────────────────

  const weekDays = useMemo(() => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const sunday = new Date(today)
    sunday.setDate(today.getDate() - dayOfWeek)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday)
      d.setDate(sunday.getDate() + i)
      const dateStr = toDateStr(d)
      return {
        dateStr,
        dayLabel: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
        dayNum: d.getDate(),
        isToday: dateStr === todayStr,
        logs: calLogs[dateStr] ?? [],
      }
    })
  }, [calLogs, todayStr])

  // ── Render: Timeline View ────────────────────────────────────────────────

  // Build dotsByDate for the week strip — one color per unique log type per day
  const dotsByDate = useMemo<Record<string, string[]>>(() => {
    const out: Record<string, string[]> = {}
    for (const [date, logs] of Object.entries(calLogs)) {
      const types = [...new Set(logs.map((l) => l.log_type))].slice(0, 3)
      out[date] = types.map((tp) => (diffuse ? dAccent : dotColor(tp)))
    }
    return out
  }, [calLogs, diffuse, dAccent])

  // Month-grid adapter: date → distinct log types, ordered by significance so
  // the blob(s) shown in each day cell are the meaningful ones (appointments +
  // contractions before routine water/vitamins). Feeds <LogMonthGrid> in month
  // view and the <DiffuseWeekStrip> markers in week view — same source, so both
  // views show consistent per-day log icons. Mirrors KidsCalendar.monthGridByDate.
  const monthGridByDate = useMemo(() => {
    const PRIORITY = ['appointment', 'contraction', 'kick_count', 'symptom', 'weight', 'mood', 'sleep', 'nutrition', 'exercise', 'kegel', 'vitamins', 'water', 'note']
    const rank = (tp: string) => { const i = PRIORITY.indexOf(tp); return i === -1 ? 99 : i }
    const map = new Map<string, string[]>()
    for (const [date, logs] of Object.entries(calLogs)) {
      const seen = new Set<string>()
      for (const l of logs) if (l.log_type !== 'skipped') seen.add(l.log_type)
      map.set(date, [...seen].sort((a, b) => rank(a) - rank(b)))
    }
    return map
  }, [calLogs])

  // ── Cards mode ────────────────────────────────────────────────────────────

  function renderTimelineCards() {
    const selLogs = (calLogs[selectedDate] ?? []).filter((l) => l.log_type !== 'skipped')
    const selPending = pendingRoutinesForDate(selectedDate)
    const selDow = new Date(selectedDate + 'T12:00:00').getDay()
    const dayLabel = formatDayLabel(selectedDate, todayStr)
    const summary = [
      selPending.length > 0 && `${selPending.length} pending`,
      selLogs.length > 0 && `${selLogs.length} logged`,
    ].filter(Boolean).join(' · ') || 'Nothing planned'

    interface Row {
      key: string
      type: string
      time: string  // display label for left gutter (e.g. "08:00", "—")
      sortHours: number
      title: string
      subtitle?: string
      /** Diffuse: short value (e.g. "13 kicks") shown as an italic accent on the title. */
      accentValue?: string
      /** Diffuse: free-text note shown as the sub line under a logged entry. */
      note?: string
      tint: string
      icon: React.ReactNode
      onPress: () => void
      pulse?: boolean
      logged?: boolean
    }

    const rows: Row[] = []

    // Pending routines for selected day
    for (const r of selPending) {
      const tintKey = PREG_TINT_BY_TYPE[r.type] ?? 'activity'
      const sortHours = r.time ? timeStrToHours(r.time) : 25
      rows.push({
        key: `r-${r.id}`,
        type: r.type,
        time: r.time ? fmtTime(r.time) : '—',
        sortHours,
        title: r.name,
        subtitle: t('pregCal_tap_to_log'),
        tint: tintKey,
        icon: logSticker(r.type, 28, isDark),
        onPress: () => setLogForm({ type: r.type as LogFormType, date: selectedDate }),
      })
    }

    // Logged entries
    for (const log of selLogs) {
      const tintKey = PREG_TINT_BY_TYPE[log.log_type] ?? 'activity'
      const meta = LOG_META[log.log_type] ?? { label: log.log_type, icon: Calendar, color: brand.pregnancy }
      const sortHours = activityTimeHoursPreg(log)
      const summaryStr = formatLogValue(log)
      rows.push({
        key: `l-${log.id}`,
        type: log.log_type,
        time: formatTime(log.created_at),
        sortHours,
        title: meta.label,
        subtitle: summaryStr || t('pregCal_logged'),
        // Diffuse: value summary → italic title accent; free-text note → sub line.
        accentValue: summaryStr || undefined,
        note: log.notes || undefined,
        tint: tintKey,
        icon: logSticker(log.log_type, 28, isDark),
        onPress: () => setSelectedLog(log),
        pulse: pulsingLogIds.has(log.id),
        logged: true,
      })
    }

    // Standard appointments occurring this week (based on weekNumber)
    for (const appt of STANDARD_APPOINTMENTS) {
      const isThisWeek = appt.week === weekNumber
      if (!isThisWeek) continue
      // Surface on Mondays of the selected day's week (avoid duplication across days)
      if (selDow !== 1) continue
      rows.push({
        key: `a-${appt.id}`,
        type: 'appointment',
        time: `W${appt.week}`,
        sortHours: -1,  // pin to top
        title: appt.name,
        subtitle: appt.prepNote.length > 70 ? appt.prepNote.slice(0, 67) + '…' : appt.prepNote,
        tint: 'appointment',
        icon: logSticker('appointment', 28, isDark),
        onPress: () => setSelectedAppt(appt),
      })
    }

    rows.sort((a, b) => a.sortHours - b.sortHours)

    // Index of the first not-yet-logged (pending) row on today's timeline — the
    // "next up" entry the NOW marker sits above. Only shown for today.
    const isToday = selectedDate === todayStr
    const nowHours = new Date().getHours() + new Date().getMinutes() / 60
    const nowInsertIdx = isToday ? rows.findIndex((r) => !r.logged && r.sortHours >= nowHours) : -1
    const nowTimeLabel = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

    return (
      <>
        <View style={styles.timelineHeader}>
          {diffuse ? (
            <>
              <Text style={{ fontFamily: diffuseFont.display, fontSize: 24, letterSpacing: -0.3, color: dt.colors.ink }}>{dayLabel}</Text>
              <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: dt.colors.ink3, marginTop: 4 }}>{summary}</Text>
            </>
          ) : (
            <>
              <Display size={22} color={colors.text}>{dayLabel}</Display>
              <Body size={12} color={colors.textMuted} style={{ marginTop: 2 }}>{summary}</Body>
            </>
          )}
        </View>

        {rows.length === 0 ? (
          diffuse ? (
            <DiffuseEmptyState
              title={t('pregCal_nothing_planned')}
              message={t('pregCal_tap_to_add')}
            />
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Body size={14} color={colors.textSecondary} align="center">
                {t('pregCal_nothing_planned')}
              </Body>
              <Body size={12} color={colors.textMuted} align="center" style={{ marginTop: 4 }}>
                {t('pregCal_tap_to_add')}
              </Body>
            </View>
          )
        ) : diffuse ? (
          // Connector-spine timeline (v4 §06): a vertical spine threads every
          // entry as a bloom-node; a "NOW · <time>" marker splits logged (past)
          // from the next-up entry. Mirrors KidsCalendar.
          <View>
            {rows.map((r, idx) => (
              <React.Fragment key={r.key}>
                {idx === nowInsertIdx ? (
                  <DiffuseNowMarker label={t('pregCal_now')} time={nowTimeLabel} mode="preg" />
                ) : null}
                <DiffuseTimelineRow
                  type={r.type}
                  time={r.time}
                  title={r.title}
                  accent={r.logged ? r.accentValue : undefined}
                  sub={r.logged ? r.note : r.subtitle}
                  logged={r.logged}
                  active={idx === nowInsertIdx}
                  compact
                  first={idx === 0}
                  last={idx === rows.length - 1}
                  onPress={r.onPress}
                />
              </React.Fragment>
            ))}
            {/* NOW after the last row (everything is in the past / already logged). */}
            {isToday && nowInsertIdx === -1 && rows.some((r) => r.logged) ? (
              <DiffuseNowMarker label={t('pregCal_now')} time={nowTimeLabel} mode="preg" />
            ) : null}
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
                    onPress={r.onPress}
                    pulse={r.pulse}
                    logged={r.logged}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </>
    )
  }


  // ── Render: Timeline Hours mode (day grid) ──────────────────────────────


  // ── Render: Appointments View (sticker S-curve + cards) ────────────────

  function renderAppointmentsView() {
    const ST_INK = diffuse ? dt.colors.ink : '#141313'
    const ST_PAPER = diffuse ? dt.colors.surface : colors.surface
    const ST_CREAM = diffuse ? dt.colors.surfaceRaised : colors.surfaceRaised
    const ST_LAVENDER = diffuse ? dAccent : getModeColor('preg', isDark)
    const ST_GREEN = diffuse ? dt.colors.success : (isDark ? '#9DD68A' : '#86C46F')
    const ST_CORAL = diffuse ? dAccent : (isDark ? '#F2A088' : '#E58968')

    // ─── S-curve appointment path ────────────────────────────────────────
    // Wide canvas so each milestone gets breathing room; the parent
    // ScrollView lets the user pan left/right.
    const BEAD_GAP = 90
    const SIDE_PAD = 32
    const VB_H = 130
    const minWeek = STANDARD_APPOINTMENTS[0]?.week ?? 12
    const maxWeek = STANDARD_APPOINTMENTS[STANDARD_APPOINTMENTS.length - 1]?.week ?? 40
    const VB_W = SIDE_PAD * 2 + Math.max(1, STANDARD_APPOINTMENTS.length - 1) * BEAD_GAP
    const curveBeads = STANDARD_APPOINTMENTS.map((appt, i) => {
      const t = STANDARD_APPOINTMENTS.length > 1
        ? (appt.week - minWeek) / (maxWeek - minWeek)
        : 0.5
      const x = SIDE_PAD + i * BEAD_GAP
      // Sinusoidal Y centered around 65, amplitude 28, ~2.5 cycles across the curve
      const y = 65 + Math.sin(t * Math.PI * 2.4) * -28
      const isDone = weekNumber > appt.week
      const isNext = !isDone && weekNumber >= appt.week - 2
      const status: 'done' | 'next' | 'future' = isDone ? 'done' : isNext ? 'next' : 'future'
      return { appt, x, y, status, idx: i }
    })

    // Smooth S-curve path through all beads (Catmull–Rom-ish via cubic Beziers).
    const buildPath = (pts: { x: number; y: number }[]): string => {
      if (pts.length < 2) return ''
      let d = `M${pts[0].x},${pts[0].y}`
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] ?? pts[i]
        const p1 = pts[i]
        const p2 = pts[i + 1]
        const p3 = pts[i + 2] ?? p2
        const cp1x = p1.x + (p2.x - p0.x) / 6
        const cp1y = p1.y + (p2.y - p0.y) / 6
        const cp2x = p2.x - (p3.x - p1.x) / 6
        const cp2y = p2.y - (p3.y - p1.y) / 6
        d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
      }
      return d
    }
    const fullPath = buildPath(curveBeads)
    // Done segment: subset path through done beads + the next bead so it visually trails into the active one.
    const doneIdxMax = curveBeads.findIndex((b) => b.status !== 'done')
    const doneSlice = doneIdxMax === -1 ? curveBeads : curveBeads.slice(0, doneIdxMax + 1)
    const donePath = buildPath(doneSlice)

    const trimester = weekNumber <= 13 ? 1 : weekNumber <= 27 ? 2 : 3

    return (
      <View style={{ gap: 14 }}>
        {/* ─── S-curve sticker card ────────────────────────────────────── */}
        <View
          style={diffuse ? {
            backgroundColor: dt.colors.surface,
            borderRadius: diffuseRadius.lg,
            borderWidth: 1, borderColor: dt.colors.line,
            padding: 18,
            overflow: 'hidden',
          } : {
            backgroundColor: ST_PAPER,
            borderRadius: 24,
            borderWidth: 1.5, borderColor: isDark ? colors.border : ST_INK,
            padding: 18,
            shadowColor: ST_INK,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0 : 0.10,
            shadowRadius: 0, elevation: 3,
          }}
        >
          {diffuse ? <SoftBloom color={dAccent} cx="88%" cy="10%" opacity={dt.isDark ? 0.22 : 0.3} spread={0.5} /> : null}
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
            <View style={{ flex: 1 }}>
              <Text style={diffuse
                ? { color: dt.colors.ink, fontSize: 24, fontFamily: diffuseFont.display, letterSpacing: -0.3 }
                : { color: isDark ? colors.text : ST_INK, fontSize: 22, fontFamily: font.displayBold, letterSpacing: -0.4 }}>
                {t('pregCal_pregnancy_path')}
              </Text>
              <Text style={diffuse
                ? { color: dt.colors.ink3, fontSize: 10, fontFamily: diffuseFont.mono, letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 4 }
                : { color: colors.textMuted, fontSize: 11, fontFamily: font.bodyBold, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 4 }}>
                {t('pregCal_milestones_40w', { count: STANDARD_APPOINTMENTS.length })}
              </Text>
            </View>
            <View style={diffuse ? {
              backgroundColor: 'transparent',
              borderWidth: 1, borderColor: dt.colors.line2,
              borderRadius: 999,
              paddingHorizontal: 10, paddingVertical: 5,
            } : {
              backgroundColor: ST_CREAM,
              borderWidth: 1.5, borderColor: isDark ? colors.border : ST_INK,
              borderRadius: 999,
              paddingHorizontal: 10, paddingVertical: 5,
            }}>
              <Text style={diffuse
                ? { color: dt.colors.ink3, fontSize: 10, fontFamily: diffuseFont.mono, letterSpacing: 1, textTransform: 'uppercase' }
                : { color: isDark ? colors.text : ST_INK, fontSize: 10, fontFamily: font.bodyBold, letterSpacing: 1, textTransform: 'uppercase' }}>
                {t('pregCal_trimester', { n: trimester })}
              </Text>
            </View>
          </View>

          {/* SVG curve — horizontally scrollable */}
          <ScrollView
            ref={apptCurveScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 6, marginBottom: 4, marginHorizontal: -18 }}
            contentContainerStyle={{ paddingHorizontal: 18 }}
            decelerationRate="fast"
          >
            <View>
              <Svg width={VB_W} height={VB_H} viewBox={`0 0 ${VB_W} ${VB_H}`}>
                {/* Faint full path */}
                <SvgPath
                  d={fullPath}
                  fill="none"
                  stroke={diffuse ? dt.colors.line2 : (isDark ? colors.border : '#D9CFB6')}
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                {/* Done path overlay */}
                {doneSlice.length > 1 && (
                  <SvgPath
                    d={donePath}
                    fill="none"
                    stroke={ST_CORAL}
                    strokeWidth={3.5}
                    strokeLinecap="round"
                  />
                )}
                {/* Beads */}
                {curveBeads.map((b) => {
                  const fill = b.status === 'done' ? ST_GREEN : b.status === 'next' ? ST_CORAL : (diffuse ? dt.colors.surface : colors.surface)
                  const r = b.status === 'next' ? 9 : 7
                  return (
                    <SvgG key={b.appt.id}>
                      {/* Glow halo on the active/next bead */}
                      {b.status === 'next' && (
                        <SvgCircle cx={b.x} cy={b.y} r={16} fill={ST_CORAL} opacity={0.18} />
                      )}
                      <SvgCircle
                        cx={b.x} cy={b.y} r={r}
                        fill={fill}
                        stroke={diffuse ? (b.status === 'future' ? dt.colors.line2 : dt.colors.ink) : (isDark ? colors.text : ST_INK)}
                        strokeWidth={diffuse ? 1.4 : 1.8}
                      />
                    </SvgG>
                  )
                })}
              </Svg>

              {/* Week labels strip — aligned to bead x positions, tappable */}
              <View style={{ width: VB_W, height: 24, marginTop: 4 }}>
                {curveBeads.map((b) => {
                  const labelColor =
                    b.status === 'done' ? ST_GREEN
                    : b.status === 'next' ? ST_CORAL
                    : (diffuse ? dt.colors.ink3 : colors.textMuted)
                  return (
                    <Pressable
                      key={b.appt.id}
                      onPress={() => setSelectedAppt(b.appt)}
                      hitSlop={10}
                      style={{
                        position: 'absolute',
                        left: b.x - 22,
                        width: 44,
                        alignItems: 'center',
                        paddingVertical: 2,
                      }}
                    >
                      <Text style={{
                        color: labelColor,
                        fontSize: diffuse ? 10 : 11,
                        fontFamily: diffuse ? (b.status === 'next' ? diffuseFont.monoBold : diffuseFont.mono) : (b.status === 'next' ? font.bodyBold : font.bodySemiBold),
                        letterSpacing: diffuse ? 0.8 : 0.4,
                        textTransform: diffuse ? 'uppercase' : 'none',
                      }}>
                        {t('pregCal_week_label', { week: b.appt.week })}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>
          </ScrollView>

          {/* Legend */}
          <View style={{ flexDirection: 'row', gap: 14, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: diffuse ? dt.colors.line : (isDark ? colors.border : '#E8DEC6') }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: ST_GREEN, borderWidth: 1, borderColor: diffuse ? dt.colors.line2 : (isDark ? colors.text : ST_INK) }} />
              <Text style={diffuse ? { color: dt.colors.ink3, fontSize: 10, fontFamily: diffuseFont.mono, letterSpacing: 0.8, textTransform: 'uppercase' } : { color: colors.textMuted, fontSize: 11, fontFamily: font.bodySemiBold }}>{t('common_done')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: ST_CORAL, borderWidth: 1, borderColor: diffuse ? dt.colors.line2 : (isDark ? colors.text : ST_INK) }} />
              <Text style={diffuse ? { color: dt.colors.ink3, fontSize: 10, fontFamily: diffuseFont.mono, letterSpacing: 0.8, textTransform: 'uppercase' } : { color: colors.textMuted, fontSize: 11, fontFamily: font.bodySemiBold }}>{t('pregCal_status_soon')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: diffuse ? dt.colors.surface : colors.surface, borderWidth: 1, borderColor: diffuse ? dt.colors.line2 : (isDark ? colors.text : ST_INK) }} />
              <Text style={diffuse ? { color: dt.colors.ink3, fontSize: 10, fontFamily: diffuseFont.mono, letterSpacing: 0.8, textTransform: 'uppercase' } : { color: colors.textMuted, fontSize: 11, fontFamily: font.bodySemiBold }}>{t('pregCal_status_upcoming')}</Text>
            </View>
          </View>
        </View>

        {/* ─── Appointment cards (tap to open detail) ─────────────────── */}
        {diffuse ? (
          <View style={{ backgroundColor: dt.colors.surface, borderRadius: diffuseRadius.lg, borderWidth: 1, borderColor: dt.colors.line, paddingHorizontal: 16 }}>
            {STANDARD_APPOINTMENTS.map((appt, idx) => {
              const isDone = weekNumber > appt.week
              const isNext = !isDone && weekNumber >= appt.week - 2
              const beadColor = isDone ? ST_GREEN : isNext ? ST_CORAL : dt.colors.surface
              const wrappedIcon = (
                <View
                  style={{
                    width: 32, height: 32, borderRadius: 16,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: beadColor,
                    borderWidth: 1,
                    borderColor: isDone || isNext ? dt.colors.ink : dt.colors.line2,
                  }}
                >
                  {isDone ? (
                    <Check size={15} color={dt.colors.bg} strokeWidth={2.6} />
                  ) : (
                    <Text style={{ fontFamily: diffuseFont.monoBold, fontSize: 9.5, letterSpacing: 0.3, color: dt.colors.ink }}>
                      {String(appt.week)}
                    </Text>
                  )}
                </View>
              )
              const sub = isDone
                ? `${t('common_done')} · ${t('pregCal_week_label', { week: appt.week })}`
                : `${t('pregCal_week_label', { week: appt.week })} · ${appt.prepNote.length > 48 ? appt.prepNote.slice(0, 45) + '…' : appt.prepNote}`
              return (
                <DiffuseListRow
                  key={appt.id}
                  icon={wrappedIcon}
                  title={appt.name}
                  sub={sub}
                  onPress={() => setSelectedAppt(appt)}
                  showArrow
                  last={idx === STANDARD_APPOINTMENTS.length - 1}
                />
              )
            })}
          </View>
        ) : STANDARD_APPOINTMENTS.map((appt) => {
          const isDone = weekNumber > appt.week
          const isNext = !isDone && weekNumber >= appt.week - 2
          const status: 'done' | 'next' | 'future' = isDone ? 'done' : isNext ? 'next' : 'future'

          const beadColor = isDone ? ST_GREEN : isNext ? ST_CORAL : (colors.surface)

          const wrappedIcon = (
            <View
              style={{
                width: 40, height: 40, borderRadius: 20,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: beadColor,
                borderWidth: 1.5,
                borderColor: isDark ? colors.text : ST_INK,
              }}
            >
              {isDone ? (
                <Check size={16} color={isDark ? colors.text : ST_INK} strokeWidth={3} />
              ) : (
                <Text style={{ fontFamily: font.displayBold, fontSize: 11, color: isDark ? colors.text : ST_INK }}>
                  {t('pregCal_week_label', { week: appt.week })}
                </Text>
              )}
            </View>
          )

          const subtitle =
            isDone
              ? `Done · Week ${appt.week}`
              : `Week ${appt.week} · ${appt.prepNote.length > 60 ? appt.prepNote.slice(0, 57) + '…' : appt.prepNote}`

          return (
            <View key={appt.id} style={{ opacity: status === 'future' ? 0.75 : 1 }}>
              <ActivityPillCard
                icon={wrappedIcon}
                title={appt.name}
                subtitle={subtitle}
                tint={isNext ? 'appointment' : 'activity'}
                chip={isNext ? { label: 'Soon', color: ST_CORAL } : undefined}
                onPress={() => setSelectedAppt(appt)}
              />
            </View>
          )
        })}

        {/* Add appointment / exam — side-by-side sticker buttons.
            Appointment = quick text log; Exam = photo + AI extract via ExamForm. */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
          <Pressable
            onPress={() => setLogForm({ type: 'appointment', date: todayStr })}
            style={({ pressed }) => diffuse ? ({
              flex: 1,
              height: 52,
              borderRadius: 999,
              backgroundColor: 'transparent',
              borderWidth: 1, borderColor: dt.colors.hairline,
              alignItems: 'center', justifyContent: 'center',
              flexDirection: 'row', gap: 8,
              opacity: pressed ? 0.6 : 1,
            }) : ({
              flex: 1,
              height: 56,
              borderRadius: 999,
              backgroundColor: ST_LAVENDER,
              borderWidth: 2, borderColor: isDark ? colors.border : ST_INK,
              alignItems: 'center', justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
              shadowColor: ST_INK,
              shadowOffset: { width: 0, height: pressed ? 2 : 4 },
              shadowOpacity: 1, shadowRadius: 0, elevation: 5,
              transform: [{ translateY: pressed ? 2 : 0 }],
            })}
          >
            <Plus size={16} color={diffuse ? dt.colors.ink : '#FFF'} strokeWidth={diffuse ? 1.8 : 3} />
            <Text style={diffuse
              ? { color: dt.colors.ink, fontFamily: diffuseFont.mono, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' }
              : { color: '#FFF', fontFamily: font.bodyBold, fontSize: 12.5, letterSpacing: 0.6, textTransform: 'uppercase' }}>
              {t('pregCal_appointment_btn')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setLogForm({ type: 'exam_result', date: todayStr })}
            style={({ pressed }) => diffuse ? ({
              flex: 1,
              height: 52,
              borderRadius: 999,
              backgroundColor: 'transparent',
              borderWidth: 1, borderColor: dt.colors.line2,
              alignItems: 'center', justifyContent: 'center',
              flexDirection: 'row', gap: 8,
              opacity: pressed ? 0.6 : 1,
            }) : ({
              flex: 1,
              height: 56,
              borderRadius: 999,
              backgroundColor: colors.surface,
              borderWidth: 2, borderColor: isDark ? colors.border : ST_INK,
              alignItems: 'center', justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
              shadowColor: ST_INK,
              shadowOffset: { width: 0, height: pressed ? 2 : 4 },
              shadowOpacity: 1, shadowRadius: 0, elevation: 5,
              transform: [{ translateY: pressed ? 2 : 0 }],
            })}
          >
            <Camera size={16} color={diffuse ? dt.colors.ink3 : ST_INK} strokeWidth={diffuse ? 1.8 : 2.5} />
            <Text style={diffuse
              ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' }
              : { color: ST_INK, fontFamily: font.bodyBold, fontSize: 12.5, letterSpacing: 0.6, textTransform: 'uppercase' }}>
              {t('pregCal_upload_exam_btn')}
            </Text>
          </Pressable>
        </View>
      </View>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
      {/* Header — "Agenda." title + "+" action */}
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16 }}>
        <AgendaHeader onAdd={() => setShowQuickLog(true)} />
      </View>

      {/* Segmented tabs — 3 tabs */}
      <View style={[styles.segRow, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
        <SegmentedTabs
          options={[
            { key: 'timeline', label: 'Timeline' },
            { key: 'appointments', label: 'Appts' },
          ]}
          value={view}
          onChange={(k) => setView(k as ViewTab)}
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {view === 'timeline' && (
          <>
            {diffuse ? (
              <>
                {/* Month grid (default) vs. compact week strip — toggle chip. */}
                <View style={styles.calViewToggle}>
                  <Pressable onPress={() => setCalView('month')} hitSlop={6} style={[styles.calViewChip, calView === 'month' && { backgroundColor: dt.colors.surface, borderColor: dt.colors.hairline }]}>
                    <Text style={[styles.calViewChipText, { color: calView === 'month' ? dt.colors.ink : dt.colors.ink3, fontFamily: calView === 'month' ? diffuseFont.monoBold : diffuseFont.mono }]}>{t('pregCal_viewMonth')}</Text>
                  </Pressable>
                  <Pressable onPress={() => setCalView('week')} hitSlop={6} style={[styles.calViewChip, calView === 'week' && { backgroundColor: dt.colors.surface, borderColor: dt.colors.hairline }]}>
                    <Text style={[styles.calViewChipText, { color: calView === 'week' ? dt.colors.ink : dt.colors.ink3, fontFamily: calView === 'week' ? diffuseFont.monoBold : diffuseFont.mono }]}>{t('pregCal_viewWeek')}</Text>
                  </Pressable>
                </View>
                {calView === 'month' ? (
                  <LogMonthGrid
                    mode="preg"
                    selectedDate={selectedDate}
                    visibleMonth={{ year, month }}
                    onSelectDate={setSelectedDate}
                    onPrevMonth={() => setViewDate(new Date(year, month - 1, 1))}
                    onNextMonth={() => setViewDate(new Date(year, month + 1, 1))}
                    logsByDate={monthGridByDate}
                  />
                ) : (
                  <View style={[styles.weekStripCard, { backgroundColor: dt.colors.surface, borderColor: dt.colors.line }]}>
                    <DiffuseWeekStrip
                      selectedDate={selectedDate}
                      onSelectDate={setSelectedDate}
                      dotsByDate={dotsByDate}
                      logTypesByDate={monthGridByDate}
                    />
                  </View>
                )}
              </>
            ) : (
              <AgendaWeekStrip
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                dotsByDate={dotsByDate}
                weekLabel={`Week ${weekNumber}`}
                modeColor={brand.pregnancy}
              />
            )}
            <View style={{ height: 12 }} />
            {renderTimelineCards()}
          </>
        )}
        {view === 'appointments' && renderAppointmentsView()}
      </ScrollView>

      {/* Quick Log Sheet */}
      <QuickLogSheet
        visible={showQuickLog}
        onClose={() => setShowQuickLog(false)}
        onSelect={(type) => setLogForm({ type, date: selectedDate })}
        onManageRoutines={() => setShowRoutineManager(true)}
      />

      {/* Routine Manager */}
      <RoutineManager
        visible={showRoutineManager}
        onClose={() => setShowRoutineManager(false)}
        routines={pregnancyRoutines}
        onSaved={() => { void fetchRoutines() }}
        onDeleted={() => { void fetchRoutines() }}
      />

      {/* Log Form Sheet */}
      <LogSheet
        visible={logForm !== null}
        title={logForm ? LOG_FORM_TITLE[logForm.type] : ''}
        onClose={() => setLogForm(null)}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.logFormScroll}
        >
          {logForm !== null && (
            <LogFormRouter type={logForm.type} date={logForm.date} onSaved={handleSaved} />
          )}
        </ScrollView>
      </LogSheet>

      {/* Log Detail Popup */}
      <LogSheet
        visible={selectedLog !== null}
        title={selectedLog ? (LOG_META[selectedLog.log_type]?.label ?? selectedLog.log_type) : ''}
        onClose={() => setSelectedLog(null)}
      >
        {selectedLog !== null && (
          <LogDetailPopup
            log={selectedLog}
            onEdit={() => {
              const logToEdit = selectedLog
              setSelectedLog(null)
              setLogForm({ type: logToEdit.log_type as LogFormType, date: logToEdit.log_date })
            }}
            onDeleted={() => {
              setSelectedLog(null)
              void refetch()
              void refetchToday()
            }}
          />
        )}
      </LogSheet>

      {/* Journey Week Detail Modal */}
      <WeekDetailModal
        visible={selectedJourneyWeek !== null}
        week={selectedJourneyWeek ?? weekNumber}
        onClose={() => setSelectedJourneyWeek(null)}
      />

      {/* Appointment Detail Modal */}
      <AppointmentDetailModal
        appointment={selectedAppt}
        status={
          selectedAppt
            ? weekNumber > selectedAppt.week
              ? 'done'
              : weekNumber >= selectedAppt.week - 2
              ? 'next'
              : 'future'
            : 'future'
        }
        onClose={() => setSelectedAppt(null)}
        onMarkDone={() => {
          if (!selectedAppt) return
          setSelectedAppt(null)
          setLogForm({ type: 'appointment', date: todayStr })
        }}
        onAddToLogs={() => {
          if (!selectedAppt) return
          setSelectedAppt(null)
          setLogForm({ type: 'appointment', date: todayStr })
        }}
      />
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header row (FAB lives here)
  calHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  headerFabBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },

  // Segmented control (Kids style)
  segRow: { paddingHorizontal: 16, paddingBottom: 10 },
  segContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
  },
  segBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10 },
  segLabel: { fontSize: 12, fontFamily: font.bodyMedium, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },

  scroll: { padding: 16 },

  // Diffuse month/week view toggle + week-strip surface card (matches KidsCalendar)
  weekStripCard: { borderRadius: 24, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 14 },
  calViewToggle: { flexDirection: 'row', gap: 6, marginBottom: 10, alignSelf: 'flex-start' },
  calViewChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: 'transparent' },
  calViewChipText: { fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase' },

  // Month grid
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navBtn: { padding: 8 },
  monthLabel: { fontSize: 18, fontFamily: font.displayBold },
  weekdayRow: { flexDirection: 'row', marginBottom: 8 },
  weekdayLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontFamily: font.bodyMedium, fontWeight: '700' },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, padding: 4, alignItems: 'center' },
  dayNum: { fontSize: 14, fontFamily: font.bodyMedium, fontWeight: '700' },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  dot: { width: 4, height: 4, borderRadius: 2 },

  // Highlights banner
  highlightBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    gap: 10,
    marginTop: 12,
    marginBottom: 4,
  },
  highlightIconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  highlightContent: { flex: 1 },
  highlightTitle: { fontSize: 13, fontFamily: font.bodyMedium, fontWeight: '700' },
  highlightDetail: { fontSize: 11, fontFamily: font.bodyMedium, marginTop: 1 },
  highlightDots: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  highlightDot: { width: 5, height: 5, borderRadius: 3 },

  // Day panel
  dayPanel: { borderRadius: 20, padding: 16, marginTop: 12 },
  dayPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dayPanelDateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dayPanelDate: { fontSize: 14, fontFamily: font.bodyMedium, fontWeight: '700' },
  dayPanelCount: { fontSize: 12, fontFamily: font.bodyMedium },
  emptyDay: { fontSize: 13, fontFamily: font.bodyMedium, textAlign: 'center', paddingVertical: 8 },
  listDivider: { height: 1, marginVertical: 8 },

  // Section toggle (pending / logged headers)
  sectionToggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 6 },
  sectionToggleLabel: { fontSize: 12, fontFamily: font.bodyMedium, fontWeight: '700', flex: 1 },

  // Type group rows (Kids-style: Icon | Label | Count | Chevron)
  typeGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 2,
  },
  typeGroupLabel: { flex: 1, fontSize: 13, fontFamily: font.bodyMedium, fontWeight: '700' },
  typeGroupCount: { fontSize: 11, fontFamily: font.bodyMedium, fontWeight: '600' },

  // Routine items
  routineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  routineItemIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  routineItemContent: { flex: 1 },
  routineItemName: { fontSize: 13, fontFamily: font.bodyMedium, fontWeight: '600' },
  routineItemSub: { fontSize: 11, fontFamily: font.bodyMedium, marginTop: 1 },
  routineItemTime: { fontSize: 11, fontFamily: font.bodyMedium },

  // Logged sub-items (inside type group)
  loggedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 0,
  },
  loggedItemContent: { flex: 1 },
  loggedItemValue: { fontSize: 12, fontFamily: font.bodyMedium },
  loggedItemTime: { fontSize: 11, fontFamily: font.bodyMedium },

  // Week strip
  weekStrip: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  weekDayBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, marginHorizontal: 2 },
  weekDayName: { fontSize: 10, fontFamily: font.bodyMedium, fontWeight: '700', marginBottom: 2 },
  weekDayNum: { fontSize: 16, fontFamily: font.displayBold },
  weekDotIndicator: { width: 4, height: 4, borderRadius: 2, marginTop: 3 },

  // Journey
  journeyRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 12, marginBottom: 8, gap: 12 },
  journeyWeekBadge: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  journeyWeekNum: { fontSize: 14, fontFamily: font.displayBold },
  journeyContent: { flex: 1 },
  journeySize: { fontSize: 14, fontFamily: font.bodyMedium, fontWeight: '600' },
  journeyFact: { fontSize: 12, fontFamily: font.bodyMedium, marginTop: 1 },
  currentBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  currentBadgeText: { fontSize: 10, fontFamily: font.bodyMedium, fontWeight: '700', color: '#fff' },

  // Appointments
  apptRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  apptTimelineLeft: { alignItems: 'center', width: 24 },
  apptDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  apptLine: { width: 2, flex: 1, marginTop: 2 },
  apptCard: { flex: 1, borderRadius: 16, padding: 12, marginBottom: 8 },
  apptCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  apptName: { fontSize: 14, fontFamily: font.bodyMedium, fontWeight: '600' },
  apptWeek: { fontSize: 12, fontFamily: font.bodyMedium },
  apptPrep: { fontSize: 12, fontFamily: font.bodyMedium, marginTop: 4 },
  apptDone: { fontSize: 12, fontFamily: font.bodyMedium, marginTop: 4 },
  addApptBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 999, marginTop: 16 },
  addApptBtnText: { fontSize: 15, fontFamily: font.bodyMedium, fontWeight: '700', color: '#fff' },

  // Modals
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '85%' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginTop: 12 },
  modalClose: { position: 'absolute', right: 16, top: 12, padding: 8, zIndex: 10 },
  logFormScroll: { paddingBottom: 24 },

  // Quick Log Sheet
  fabSheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  fabSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 8,
    paddingHorizontal: 16,
    maxHeight: '80%',
  },
  fabSheetHandle: { alignItems: 'center', paddingVertical: 8 },
  fabSheetHandleBar: { width: 40, height: 4, borderRadius: 2 },
  fabSheetHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  fabSheetTitle: { fontSize: 18, fontFamily: font.displayBold },
  fabSheetClose: { padding: 6 },
  fabSheetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  fabSheetItem: {
    width: '30%',
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
  },
  fabSheetIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  fabSheetLabel: { fontSize: 11, fontFamily: font.bodyMedium, fontWeight: '700', textAlign: 'center' },

  // Manage Routines button inside sheet
  manageRoutinesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  manageRoutinesBtnText: { flex: 1, fontSize: 14, fontFamily: font.bodyMedium, fontWeight: '700' },

  // Routine Manager
  routineManagerSheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '92%',
    paddingTop: 8,
  },
  routineManagerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  routineManagerTitle: { flex: 1, fontSize: 18, fontFamily: font.displayBold },
  routineManagerScroll: { paddingHorizontal: 16, paddingTop: 12 },
  routineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: 8,
  },
  routineIconWrap: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  routineInfo: { flex: 1 },
  routineName: { fontSize: 14, fontFamily: font.bodyMedium, fontWeight: '700' },
  routineDetail: { fontSize: 11, fontFamily: font.bodyMedium, marginTop: 2 },
  routineDeleteBtn: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 13, fontFamily: font.bodyMedium, textAlign: 'center', paddingVertical: 12 },

  // Add routine form
  addRoutineForm: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    gap: 10,
  },
  addRoutineTitle: { fontSize: 14, fontFamily: font.displayBold },
  addRoutineLabel: { fontSize: 12, fontFamily: font.bodyMedium, fontWeight: '700', marginTop: 4 },
  routineInput: {
    height: 48,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: font.bodyMedium,
  },
  typePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  typePillText: { fontSize: 12, fontFamily: font.bodyMedium, fontWeight: '600' },
  daysRow: { flexDirection: 'row', gap: 6 },
  dayPill: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillText: { fontSize: 12, fontFamily: font.bodyMedium, fontWeight: '700' },
  saveRoutineBtn: { paddingVertical: 14, borderRadius: radius.full, alignItems: 'center', marginTop: 4 },
  saveRoutineBtnText: { fontSize: 15, fontFamily: font.bodyMedium, fontWeight: '700', color: '#fff' },

  // Log Detail (paper aesthetic — matches add-log forms)
  detailBody: { paddingTop: 4, paddingBottom: 16 },
  detailMetricCard: {
    borderRadius: 24, borderWidth: 1.5, padding: 24,
    alignItems: 'center', gap: 6, marginTop: 16, marginBottom: 12,
  },
  // Diffuse: same metric, no card/border/bloom — sits bare on the sheet.
  detailMetricBare: {
    alignItems: 'center', gap: 8, marginTop: 20, marginBottom: 18,
  },
  detailMetricBig: { fontSize: 56, fontFamily: font.displayBold, letterSpacing: -2 },
  detailMetricText: { fontSize: 22, fontFamily: font.displayBold, textAlign: 'center' },
  detailMetricUnit: { fontSize: 20, fontFamily: font.bodyMedium, fontWeight: '600' },
  detailMetricLabel: {
    fontSize: 11, fontFamily: font.bodyBold, fontWeight: '700',
    letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4,
  },
  detailDateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 999, borderWidth: 1.5,
    paddingHorizontal: 14, paddingVertical: 9,
    alignSelf: 'flex-start', marginBottom: 14,
  },
  detailDateText: { fontSize: 13, fontFamily: font.bodyBold },
  detailPillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  detailPill: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1.5,
  },
  detailPillText: { fontSize: 12, fontFamily: font.bodyBold },
  detailNotesBox: { borderRadius: 18, borderWidth: 1.5, padding: 14, marginBottom: 14 },
  detailNotesText: { fontSize: 14, fontFamily: font.bodyMedium, lineHeight: 20 },
  detailActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  detailEditBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 999, borderWidth: 1.5,
  },
  detailDeleteBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 999, borderWidth: 1.5,
  },
  detailActionText: { fontSize: 15, fontFamily: font.bodyBold, fontWeight: '700', color: '#fff' },

  // Timeline (Cards mode)
  modeToggle: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    borderRadius: 999,
    borderWidth: 1,
    padding: 3,
    gap: 2,
  },
  modeToggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  modeToggleLabel: {
    fontSize: 12,
    fontFamily: font.bodyMedium,
    fontWeight: '700',
  },
  timelineHeader: {
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timelineGutter: {
    width: 56,
    alignItems: 'flex-end',
    paddingRight: 4,
  },
  timelineTime: {
    fontSize: 12,
    fontFamily: font.bodyMedium,
    fontWeight: '600',
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 20,
    marginTop: 8,
  },

  // Day Timeline (Hours mode)
  dayTimelineCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 8,
  },
  dayTimelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  dayTimelineHeaderCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  dayTimelineSub: {
    fontSize: 11,
    fontFamily: font.bodyMedium,
  },
  dayZoomRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dayZoomBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  dayTimelineScroll: {
    maxHeight: 480,
  },
  dayHourLabel: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: font.bodyMedium,
  },
})
