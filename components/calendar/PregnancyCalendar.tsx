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
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { usePregnancyStore } from '../../store/usePregnancyStore'
import { getTrimester, weekForDate } from '../../lib/pregnancyWeeks'
import { pregnancyWeeks } from '../../lib/pregnancyData'
import { toDateStr } from '../../lib/cycleLogic'
import { supabase } from '../../lib/supabase'
import {
  usePregnancyCalendarLogs,
  usePregnancyTodayLogs,
} from '../../lib/analyticsData'
import type { PregnancyCalendarLog } from '../../lib/analyticsData'
import { STANDARD_APPOINTMENTS } from '../../lib/pregnancyAppointments'
import { AgendaHeader } from './AgendaHeader'
import { SegmentedTabs } from './SegmentedTabs'
import { LogTile, LogTileGrid } from './LogTile'
import { ActivityPillCard } from './ActivityPillCard'
import { AgendaWeekStrip } from './AgendaWeekStrip'
import { AppointmentDetailModal } from './AppointmentDetailModal'
import { LogSheet } from './LogSheet'
import { Display, Body, MonoCaps } from '../ui/Typography'
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

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const COLOR_GREEN = '#A2FF86'
const COLOR_AMBER = '#FBBF24'
const COLOR_BLUE = '#60B4FF'
const COLOR_ORANGE = '#FF6B35'

// Trimester colors — brand.trimester doesn't exist, use direct values
const TRIMESTER_TINT: Record<1 | 2 | 3, string> = {
  1: COLOR_GREEN + '20',
  2: brand.pregnancy + '20',
  3: COLOR_AMBER + '20',
}
const TRIMESTER_COLOR: Record<1 | 2 | 3, string> = {
  1: COLOR_GREEN,
  2: brand.pregnancy,
  3: COLOR_AMBER,
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewTab = 'timeline' | 'journey' | 'appointments'
type TimelineMode = 'cards' | 'hours'
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
  exam_result: { label: 'Exam Result', icon: FlaskConical, color: brand.phase?.ovulation ?? '#C084FC' },
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
  const insets = useSafeAreaInsets()

  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const bg = isDark ? colors.bg : '#F3ECD9'
  const ink = isDark ? colors.text : '#141313'
  const accent = brand.pregnancy

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.fabSheetBackdrop} onPress={onClose} />
      <View style={[styles.fabSheet, { backgroundColor: bg, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.fabSheetHandle}>
          <View style={[styles.fabSheetHandleBar, { backgroundColor: paperBorder }]} />
        </View>
        <View style={styles.fabSheetHeaderRow}>
          <Display size={22} color={ink}>Log something</Display>
          <Pressable onPress={onClose} style={[styles.fabSheetClose, { backgroundColor: paper, borderColor: paperBorder }]}>
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
            style={({ pressed }) => [
              styles.manageRoutinesBtn,
              { backgroundColor: paper, borderColor: paperBorder },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Calendar size={18} color={accent} strokeWidth={2} />
            <Body size={14} color={accent} style={{ fontFamily: font.bodySemiBold, flex: 1 }}>
              Manage Routines
            </Body>
            <ChevronRight size={16} color={ink} strokeWidth={2} />
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
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()

  const [form, setForm] = useState({
    name: '',
    type: 'vitamins' as string,
    time: '08:00',
    days: [0, 1, 2, 3, 4, 5, 6] as number[],
  })
  const [saving, setSaving] = useState(false)

  const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  async function handleSave() {
    if (!form.name.trim()) {
      Alert.alert('Name required', 'Please enter a routine name.')
      return
    }
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      const { error } = await supabase.from('pregnancy_routines').insert({
        user_id: session.user.id,
        type: form.type,
        name: form.name.trim(),
        days_of_week: form.days,
        time: form.time || null,
        active: true,
      })
      if (error) throw error
      setForm({ name: '', type: 'vitamins', time: '08:00', days: [0,1,2,3,4,5,6] })
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    Alert.alert('Delete Routine', 'Remove this routine?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('pregnancy_routines').delete().eq('id', id)
          onDeleted()
        },
      },
    ])
  }

  function toggleDay(d: number) {
    setForm((prev) => {
      const days = prev.days.includes(d)
        ? prev.days.filter((x) => x !== d)
        : [...prev.days, d].sort()
      return { ...prev, days }
    })
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.modalOverlay]}>
        <View style={[styles.routineManagerSheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.modalHandle} />
          <View style={styles.routineManagerHeader}>
            <Text style={[styles.routineManagerTitle, { color: colors.text }]}>Manage Routines</Text>
            <Pressable onPress={onClose} style={styles.modalClose}>
              <X size={20} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.routineManagerScroll}>
            {/* Existing routines */}
            {routines.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No routines yet</Text>
            ) : (
              routines.map((r) => {
                const meta = LOG_META[r.type] ?? { label: r.type, icon: Calendar, color: colors.textMuted }
                const Icon = meta.icon
                const daysLabel = r.days_of_week.length === 7
                  ? 'Every day'
                  : r.days_of_week.map((d) => WEEKDAYS[d]).join(', ')
                return (
                  <View key={r.id} style={[styles.routineRow, { backgroundColor: colors.surfaceRaised ?? colors.surface, borderColor: colors.border }]}>
                    <View style={[styles.routineIconWrap, { backgroundColor: meta.color + '18' }]}>
                      <Icon size={18} color={meta.color} strokeWidth={2} />
                    </View>
                    <View style={styles.routineInfo}>
                      <Text style={[styles.routineName, { color: colors.text }]}>{r.name}</Text>
                      <Text style={[styles.routineDetail, { color: colors.textMuted }]}>
                        {r.time ? `${fmtTime(r.time)} · ` : ''}{daysLabel}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => handleDelete(r.id)}
                      style={[styles.routineDeleteBtn, { backgroundColor: brand.error + '15' }]}
                    >
                      <Trash2 size={14} color={brand.error} strokeWidth={2} />
                    </Pressable>
                  </View>
                )
              })
            )}

            {/* Add routine form */}
            <View style={[styles.addRoutineForm, { backgroundColor: colors.surfaceRaised ?? colors.surface, borderColor: brand.pregnancy + '30' }]}>
              <Text style={[styles.addRoutineTitle, { color: brand.pregnancy }]}>Add Routine</Text>

              {/* Name */}
              <TextInput
                value={form.name}
                onChangeText={(t) => setForm((p) => ({ ...p, name: t }))}
                placeholder="Routine name"
                placeholderTextColor={colors.textMuted}
                style={[styles.routineInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              />

              {/* Type selector */}
              <Text style={[styles.addRoutineLabel, { color: colors.textSecondary }]}>Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                {ALL_LOG_TYPES.map((t) => {
                  const meta = LOG_META[t]
                  const active = form.type === t
                  return (
                    <Pressable
                      key={t}
                      onPress={() => setForm((p) => ({ ...p, type: t }))}
                      style={[
                        styles.typePill,
                        {
                          backgroundColor: active ? meta.color + '25' : colors.surface,
                          borderColor: active ? meta.color : colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.typePillText, { color: active ? meta.color : colors.textMuted }]}>
                        {meta.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </ScrollView>

              {/* Time */}
              <Text style={[styles.addRoutineLabel, { color: colors.textSecondary }]}>Time (HH:MM)</Text>
              <TextInput
                value={form.time}
                onChangeText={(t) => setForm((p) => ({ ...p, time: t }))}
                placeholder="08:00"
                placeholderTextColor={colors.textMuted}
                keyboardType="numbers-and-punctuation"
                style={[styles.routineInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              />

              {/* Days of week */}
              <Text style={[styles.addRoutineLabel, { color: colors.textSecondary }]}>Days</Text>
              <View style={styles.daysRow}>
                {DAY_LABELS.map((label, idx) => {
                  const active = form.days.includes(idx)
                  return (
                    <Pressable
                      key={idx}
                      onPress={() => toggleDay(idx)}
                      style={[
                        styles.dayPill,
                        {
                          backgroundColor: active ? brand.pregnancy : colors.surface,
                          borderColor: active ? brand.pregnancy : colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.dayPillText, { color: active ? '#fff' : colors.textMuted }]}>
                        {label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>

              <Pressable
                onPress={handleSave}
                disabled={saving}
                style={[styles.saveRoutineBtn, { backgroundColor: brand.pregnancy, opacity: saving ? 0.6 : 1 }]}
              >
                <Text style={styles.saveRoutineBtnText}>{saving ? 'Saving…' : 'Save Routine'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

// ─── Log Detail Popup ─────────────────────────────────────────────────────────

function LogDetailPopup({
  log,
  onClose,
  onEdit,
  onDeleted,
}: {
  log: PregnancyCalendarLog
  onClose: () => void
  onEdit: () => void
  onDeleted: () => void
}) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const meta = LOG_META[log.log_type] ?? { label: log.log_type, icon: Calendar, color: brand.pregnancy }
  const Icon = meta.icon

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

  async function handleDelete() {
    Alert.alert('Delete log?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('pregnancy_logs').delete().eq('id', log.id)
          onDeleted()
        },
      },
    ])
  }

  return (
    <View style={[styles.detailSheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.detailHandle} />

      {/* Header */}
      <View style={styles.detailHeader}>
        <Text style={[styles.detailTitle, { color: colors.text }]}>{meta.label}</Text>
        <Pressable onPress={onClose} style={styles.detailClose}>
          <X size={20} color={colors.textMuted} strokeWidth={2} />
        </Pressable>
      </View>

      {/* Date row */}
      <View style={[styles.detailInfoRow, { backgroundColor: colors.surfaceRaised ?? colors.surface }]}>
        <Timer size={14} color={colors.textMuted} strokeWidth={2} />
        <Text style={[styles.detailInfoText, { color: colors.textSecondary }]}>
          {dateLabel} at {formatTime(log.created_at)}
        </Text>
      </View>

      {/* Big metric card */}
      <View style={[styles.detailMetricCard, { backgroundColor: meta.color + '10', borderColor: meta.color + '20' }]}>
        {log.log_type === 'mood' ? (
          <MoodFace size={64} variant={moodFaceVariant(rawValue.toLowerCase())} fill={moodFaceFill(rawValue.toLowerCase())} />
        ) : (
          <Icon size={28} color={meta.color + '70'} strokeWidth={2} />
        )}
        {isText ? (
          <Text style={[styles.detailMetricText, { color: meta.color }]}>{metric}</Text>
        ) : (
          <Text style={[styles.detailMetricBig, { color: meta.color }]}>
            {metric}
            {unit ? <Text style={styles.detailMetricUnit}>{` ${unit}`}</Text> : null}
          </Text>
        )}
        <Text style={[styles.detailMetricLabel, { color: colors.textMuted }]}>{sublabel}</Text>
      </View>

      {/* Pills */}
      <View style={styles.detailPillsRow}>
        {pills.map((p, i) => (
          <View key={i} style={[styles.detailPill, { backgroundColor: p.color + '18', borderColor: p.color + '35' }]}>
            <Text style={[styles.detailPillText, { color: p.color }]}>{p.label}</Text>
          </View>
        ))}
      </View>

      {/* Plain notes */}
      {plainNotes && (
        <View style={[styles.detailNotesBox, { backgroundColor: colors.surfaceRaised ?? colors.surface }]}>
          <Text style={[styles.detailNotesText, { color: colors.textSecondary }]}>{plainNotes}</Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.detailActions}>
        <Pressable onPress={onEdit} style={[styles.detailEditBtn, { backgroundColor: brand.pregnancy }]}>
          <Edit3 size={16} color="#fff" strokeWidth={2} />
          <Text style={styles.detailActionText}>Edit</Text>
        </Pressable>
        <Pressable onPress={handleDelete} style={[styles.detailDeleteBtn, { backgroundColor: brand.error + '18', borderColor: brand.error + '40' }]}>
          <Trash2 size={16} color={brand.error} strokeWidth={2} />
          <Text style={[styles.detailActionText, { color: brand.error }]}>Delete</Text>
        </Pressable>
      </View>
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
    <View style={[styles.dayPanel, { backgroundColor: colors.surface }]}>
      {/* Header — calendar icon + date + activity count */}
      <View style={styles.dayPanelHeader}>
        <View style={styles.dayPanelDateRow}>
          <Calendar size={15} color={brand.pregnancy} strokeWidth={2} />
          <Text style={[styles.dayPanelDate, { color: colors.text }]}>
            {formatDayLabel(dateStr, todayStr)}
          </Text>
        </View>
        <Text style={[styles.dayPanelCount, { color: colors.textMuted }]}>
          {nonEmptyLogs.length} {nonEmptyLogs.length === 1 ? 'activity' : 'activities'}
        </Text>
      </View>

      {/* Empty state */}
      {nonEmptyLogs.length === 0 && pendingRoutines.length === 0 && (
        <Text style={[styles.emptyDay, { color: colors.textMuted }]}>No logs for this day</Text>
      )}

      {/* ── Pending routines — grouped by type ────────────────────────────── */}
      {pendingRoutines.length > 0 && (
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
              {pendingRoutines.length} pending
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
                        {routine.time ? `${fmtTime(routine.time)} · ` : ''}Tap to log
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
      {pendingRoutines.length > 0 && nonEmptyLogs.length > 0 && (
        <View style={[styles.listDivider, { backgroundColor: colors.border }]} />
      )}

      {/* ── Logged entries — grouped by type ──────────────────────────────── */}
      {nonEmptyLogs.length > 0 && (
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
              {nonEmptyLogs.length} logged
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
                          'Delete log?',
                          `Remove this ${meta.label} entry?`,
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

// ─── Main Component ────────────────────────────────────────────────────────────

export function PregnancyCalendar() {
  const { colors, isDark } = useTheme()
  const insets = useSafeAreaInsets()

  const weekNumber = usePregnancyStore((s) => s.weekNumber) ?? 24
  const dueDate = usePregnancyStore((s) => s.dueDate) ?? ''

  const [view, setView] = useState<ViewTab>('timeline')
  const [timelineMode, setTimelineMode] = useState<TimelineMode>('cards')
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

  const [userId, setUserId] = useState<string | undefined>(undefined)
  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user.id))
  }, [])

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
    await supabase.from('pregnancy_logs').delete().eq('id', log.id)
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

  // Auto-scroll day timeline to current time / morning (Hours mode only)
  useEffect(() => {
    if (view !== 'timeline' || timelineMode !== 'hours') return
    const now = new Date()
    const targetHours = selectedDate === todayStr
      ? Math.max(DAY_VIEW_START, now.getHours() + now.getMinutes() / 60 - 2)
      : 6
    const scrollY = Math.max(0, (targetHours - DAY_VIEW_START) * dayZoomH)
    setTimeout(() => dayScrollRef.current?.scrollTo({ y: scrollY, animated: false }), 80)
  }, [view, timelineMode, selectedDate, todayStr, dayZoomH])

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

  // ── Render: Timeline View (Cards or Hours) ───────────────────────────────

  function renderTimelineView() {
    return timelineMode === 'cards' ? renderTimelineCards() : renderTimelineHours()
  }

  function renderModeToggle() {
    return (
      <View style={[styles.modeToggle, { backgroundColor: colors.surfaceGlass, borderColor: colors.border }]}>
        {(['cards', 'hours'] as TimelineMode[]).map((m) => {
          const active = timelineMode === m
          return (
            <Pressable
              key={m}
              onPress={() => setTimelineMode(m)}
              style={[
                styles.modeToggleBtn,
                active && { backgroundColor: brand.pregnancy },
              ]}
            >
              <Text
                style={[
                  styles.modeToggleLabel,
                  { color: active ? '#fff' : colors.textSecondary },
                ]}
              >
                {m === 'cards' ? 'Cards' : 'Hours'}
              </Text>
            </Pressable>
          )
        })}
      </View>
    )
  }

  // Build dotsByDate for the week strip — one color per unique log type per day
  const dotsByDate = useMemo<Record<string, string[]>>(() => {
    const out: Record<string, string[]> = {}
    for (const [date, logs] of Object.entries(calLogs)) {
      const types = [...new Set(logs.map((l) => l.log_type))].slice(0, 3)
      out[date] = types.map((t) => dotColor(t))
    }
    return out
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
      time: string  // display label for left gutter (e.g. "08:00", "—")
      sortHours: number
      title: string
      subtitle?: string
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
        time: r.time ? fmtTime(r.time) : '—',
        sortHours,
        title: r.name,
        subtitle: 'Tap to log',
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
        time: formatTime(log.created_at),
        sortHours,
        title: meta.label,
        subtitle: summaryStr || 'Logged',
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

    return (
      <>
        <View style={styles.timelineHeader}>
          <Display size={22} color={colors.text}>{dayLabel}</Display>
          <Body size={12} color={colors.textMuted} style={{ marginTop: 2 }}>{summary}</Body>
        </View>

        {rows.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Body size={14} color={colors.textSecondary} align="center">
              Nothing planned for this day.
            </Body>
            <Body size={12} color={colors.textMuted} align="center" style={{ marginTop: 4 }}>
              Tap + above to log something.
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

  function renderTimelineHours() {
    const selLogs = calLogs[selectedDate] ?? []
    const selPending = pendingRoutinesForDate(selectedDate)
    const loggedLogs = selLogs.filter((l) => l.log_type !== 'skipped')

    return (
      <>
        {/* Day Timeline Card */}
        <View style={[styles.dayTimelineCard, { backgroundColor: colors.surface }]}>
          {/* Day nav header */}
          <View style={[styles.dayTimelineHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={prevDay} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <ChevronLeft size={20} color={colors.text} strokeWidth={2} />
            </Pressable>
            <View style={styles.dayTimelineHeaderCenter}>
              <Text style={[styles.dayPanelDate, { color: colors.text }]}>
                {formatDayLabel(selectedDate, todayStr)}
              </Text>
              <Text style={[styles.dayTimelineSub, { color: colors.textMuted }]}>
                {[
                  selPending.length > 0 && `${selPending.length} pending`,
                  loggedLogs.length > 0 && `${loggedLogs.length} logged`,
                ].filter(Boolean).join(' · ') || 'No activities'}
              </Text>
            </View>
            <Pressable onPress={nextDay} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <ChevronRight size={20} color={colors.text} strokeWidth={2} />
            </Pressable>
          </View>

          {/* Zoom controls */}
          <View style={styles.dayZoomRow}>
            <Pressable
              onPress={() => setDayZoomH((h) => Math.min(h + 16, DAY_VIEW_MAX_HOUR_H))}
              style={[styles.dayZoomBtn, { backgroundColor: colors.surfaceRaised ?? colors.surface, borderColor: colors.border }]}
            >
              <Plus size={14} color={colors.textSecondary} strokeWidth={2.5} />
            </Pressable>
            <Pressable
              onPress={() => setDayZoomH((h) => Math.max(h - 16, DAY_VIEW_MIN_HOUR_H))}
              style={[styles.dayZoomBtn, { backgroundColor: colors.surfaceRaised ?? colors.surface, borderColor: colors.border }]}
            >
              <Minus size={14} color={colors.textSecondary} strokeWidth={2.5} />
            </Pressable>
          </View>

          {/* Time grid */}
          <ScrollView
            ref={dayScrollRef}
            style={styles.dayTimelineScroll}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            <View style={{ flexDirection: 'row', height: (DAY_VIEW_END - DAY_VIEW_START) * dayZoomH + dayZoomH }}>
              {/* Hour labels */}
              <View style={{ width: 52 }}>
                {Array.from({ length: DAY_VIEW_END - DAY_VIEW_START + 1 }, (_, i) => (
                  <View key={i} style={{ height: dayZoomH, paddingTop: 5, alignItems: 'flex-end', paddingRight: 8 }}>
                    <Text style={[styles.dayHourLabel, { color: colors.textMuted }]}>
                      {fmtHourLabel(DAY_VIEW_START + i)}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Events canvas */}
              <View style={{ flex: 1, position: 'relative', height: (DAY_VIEW_END - DAY_VIEW_START) * dayZoomH }}>
                {/* Hour grid lines */}
                {Array.from({ length: DAY_VIEW_END - DAY_VIEW_START }, (_, i) => (
                  <View key={`h-${i}`} style={{ position: 'absolute', top: i * dayZoomH, left: 0, right: 8, height: 1, backgroundColor: colors.border }} />
                ))}
                {/* Half-hour lines */}
                {Array.from({ length: DAY_VIEW_END - DAY_VIEW_START }, (_, i) => (
                  <View key={`hh-${i}`} style={{ position: 'absolute', top: i * dayZoomH + dayZoomH / 2, left: 0, right: 8, height: 0.5, backgroundColor: colors.border + '50' }} />
                ))}

                {/* Current time indicator */}
                {selectedDate === todayStr && (() => {
                  const now = new Date()
                  const nowH = now.getHours() + now.getMinutes() / 60
                  const y = (nowH - DAY_VIEW_START) * dayZoomH
                  return (
                    <View style={{ position: 'absolute', top: y, left: 0, right: 8, flexDirection: 'row', alignItems: 'center', zIndex: 20 }} pointerEvents="none">
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF4444', marginLeft: -2 }} />
                      <View style={{ flex: 1, height: 2, backgroundColor: '#FF4444' }} />
                    </View>
                  )
                })()}

                {/* Event blocks */}
                {(() => {
                  interface DvEvent {
                    id: string; title: string; hours: number; durationHours: number
                    color: string; isPending: boolean; isLogged: boolean
                    routine?: PregnancyRoutine; log?: PregnancyCalendarLog
                  }
                  const events: DvEvent[] = []

                  // Pending routines
                  for (const r of selPending) {
                    if (!r.time) continue
                    const hours = timeStrToHours(r.time)
                    if (hours < DAY_VIEW_START - 0.25 || hours > DAY_VIEW_END) continue
                    const rMeta = LOG_META[r.type] ?? { color: brand.pregnancy }
                    events.push({ id: `p-${r.id}`, title: r.name, hours, durationHours: 0.75, color: rMeta.color, isPending: true, isLogged: false, routine: r })
                  }

                  // Logged entries
                  for (const log of loggedLogs) {
                    const hours = activityTimeHoursPreg(log)
                    if (hours < DAY_VIEW_START - 0.25 || hours > DAY_VIEW_END) continue
                    const meta = LOG_META[log.log_type] ?? { label: log.log_type, color: brand.pregnancy }
                    events.push({ id: `l-${log.id}`, title: meta.label, hours, durationHours: 0.75, color: meta.color, isPending: false, isLogged: true, log })
                  }

                  if (events.length === 0) {
                    return (
                      <View style={{ position: 'absolute', top: (8 - DAY_VIEW_START) * dayZoomH, left: 0, right: 8, alignItems: 'center' }}>
                        <Text style={{ color: colors.textMuted, fontSize: 12 }}>No activities — tap + to add</Text>
                      </View>
                    )
                  }

                  // Greedy column assignment for overlap
                  const sorted = [...events].sort((a, b) => a.hours - b.hours)
                  const colEndTimes: number[] = []
                  const withCol = sorted.map((ev) => {
                    const evEnd = ev.hours + ev.durationHours
                    let col = colEndTimes.findIndex((t) => t <= ev.hours + 0.05)
                    if (col === -1) { col = colEndTimes.length; colEndTimes.push(evEnd) }
                    else colEndTimes[col] = evEnd
                    return { ...ev, col }
                  })
                  const withTotalCols = withCol.map((ev) => {
                    const evEnd = ev.hours + ev.durationHours
                    const concurrent = withCol.filter((other) => {
                      const otherEnd = other.hours + other.durationHours
                      return other.hours < evEnd - 0.05 && otherEnd > ev.hours + 0.05
                    })
                    return { ...ev, totalCols: concurrent.length > 0 ? Math.max(...concurrent.map((c) => c.col)) + 1 : 1 }
                  })

                  return withTotalCols.map((ev) => {
                    const clampedH = Math.max(DAY_VIEW_START, ev.hours)
                    const y = (clampedH - DAY_VIEW_START) * dayZoomH
                    const blockH = Math.max(dayZoomH > 50 ? 44 : 28, ev.durationHours * dayZoomH - 4)
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const leftPct = `${(ev.col / ev.totalCols) * 100}%` as any
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const widthPct = `${(1 / ev.totalCols) * 100 - 1}%` as any

                    return (
                      <Pressable
                        key={ev.id}
                        onPress={() => {
                          if (ev.isPending && ev.routine) {
                            setLogForm({ type: ev.routine.type as LogFormType, date: selectedDate })
                          } else if (ev.isLogged && ev.log) {
                            setSelectedLog(ev.log)
                          }
                        }}
                        style={({ pressed }) => ({
                          position: 'absolute' as const,
                          top: y + 2,
                          height: blockH,
                          left: leftPct,
                          width: widthPct,
                          backgroundColor: ev.color + (ev.isLogged ? '28' : '18'),
                          borderLeftWidth: 3,
                          borderLeftColor: ev.color,
                          borderRadius: 6,
                          paddingVertical: 5,
                          paddingLeft: 7,
                          paddingRight: 4,
                          zIndex: 5,
                          opacity: pressed ? 0.7 : 1,
                        })}
                      >
                        <Text
                          style={{ color: ev.color, fontSize: dayZoomH < 50 ? 9 : 11, fontWeight: '700', lineHeight: dayZoomH < 50 ? 11 : 14 }}
                          numberOfLines={1}
                        >
                          {ev.title}
                        </Text>
                        {dayZoomH >= 40 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 1, gap: 3 }}>
                            <Text style={{ color: colors.textMuted, fontSize: 9 }} numberOfLines={1}>
                              {fmtTime(hoursToHHMM(ev.hours))}
                            </Text>
                            {ev.isLogged
                              ? <CheckCircle2 size={9} color={COLOR_GREEN} strokeWidth={2.5} />
                              : <AlertCircle size={9} color={COLOR_AMBER} strokeWidth={2.5} />}
                          </View>
                        )}
                      </Pressable>
                    )
                  })
                })()}
              </View>
            </View>
          </ScrollView>
        </View>
      </>
    )
  }

  // ── Render: Journey View (cards) ─────────────────────────────────────────

  function renderJourneyView() {
    return (
      <View style={{ gap: 10 }}>
        {pregnancyWeeks.map((wkData) => {
          const isCurrent = wkData.week === weekNumber
          const isPast = wkData.week < weekNumber
          const tri = getTrimester(wkData.week) as 1 | 2 | 3
          const triColor = TRIMESTER_COLOR[tri]
          const firstSentence = wkData.developmentFact.split('. ')[0] + (wkData.developmentFact.includes('. ') ? '.' : '')

          const wrappedIcon = (
            <View
              style={{
                width: 40, height: 40, borderRadius: 20,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: isPast || isCurrent ? triColor : triColor + '20',
              }}
            >
              <Text style={{ fontFamily: 'Fraunces_800ExtraBold', fontSize: 16, color: isPast || isCurrent ? '#fff' : triColor }}>
                {wkData.week}
              </Text>
            </View>
          )

          return (
            <View key={wkData.week} style={{ opacity: isPast || isCurrent ? 1 : 0.55 }}>
              <ActivityPillCard
                icon={wrappedIcon}
                title={`${wkData.babySize} · ${wkData.babyLength}`}
                subtitle={firstSentence}
                tint={tri === 1 ? 'memory' : tri === 2 ? 'sleep' : 'mood'}
                chip={
                  isCurrent
                    ? { label: 'Now', color: brand.pregnancy }
                    : isPast
                    ? { label: 'Done', color: COLOR_GREEN }
                    : undefined
                }
                onPress={() => setSelectedJourneyWeek(wkData.week)}
              />
            </View>
          )
        })}
      </View>
    )
  }

  // ── Render: Appointments View (cards) ───────────────────────────────────

  function renderAppointmentsView() {
    return (
      <View style={{ gap: 10 }}>
        {STANDARD_APPOINTMENTS.map((appt) => {
          const isDone = weekNumber > appt.week
          const isNext = !isDone && weekNumber >= appt.week - 2
          const status: 'done' | 'next' | 'future' = isDone ? 'done' : isNext ? 'next' : 'future'

          const ringColor = isDone ? COLOR_GREEN : isNext ? COLOR_AMBER : colors.textMuted
          const ringBg = isDone ? COLOR_GREEN : isNext ? COLOR_AMBER : 'transparent'

          const wrappedIcon = (
            <View
              style={{
                width: 40, height: 40, borderRadius: 20,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: ringBg,
                borderWidth: isDone || isNext ? 0 : 2,
                borderColor: ringColor,
              }}
            >
              {isDone ? (
                <Check size={18} color="#fff" strokeWidth={3} />
              ) : (
                <Text style={{ fontFamily: 'Fraunces_800ExtraBold', fontSize: 12, color: isNext ? '#fff' : ringColor }}>
                  W{appt.week}
                </Text>
              )}
            </View>
          )

          const subtitle =
            isDone
              ? `Done · Week ${appt.week}`
              : `Week ${appt.week} · ${appt.prepNote.length > 60 ? appt.prepNote.slice(0, 57) + '…' : appt.prepNote}`

          return (
            <View key={appt.id} style={{ opacity: status === 'future' ? 0.7 : 1 }}>
              <ActivityPillCard
                icon={wrappedIcon}
                title={appt.name}
                subtitle={subtitle}
                tint={isNext ? 'appointment' : 'activity'}
                chip={isNext ? { label: 'Soon', color: COLOR_AMBER } : undefined}
                onPress={() => setSelectedAppt(appt)}
              />
            </View>
          )
        })}
        <Pressable
          onPress={() => setLogForm({ type: 'appointment', date: todayStr })}
          style={[styles.addApptBtn, { backgroundColor: brand.pregnancy }]}
        >
          <Plus size={18} color="#fff" strokeWidth={3} />
          <Text style={styles.addApptBtnText}>Add appointment / exam</Text>
        </Pressable>
      </View>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Header — "Agenda." title + "+" action */}
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16 }}>
        <AgendaHeader onAdd={() => setShowQuickLog(true)} />
      </View>

      {/* Segmented tabs — 3 tabs */}
      <View style={[styles.segRow, { backgroundColor: colors.bg }]}>
        <SegmentedTabs
          options={[
            { key: 'timeline', label: 'Timeline' },
            { key: 'journey', label: 'Journey' },
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
            <AgendaWeekStrip
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              dotsByDate={dotsByDate}
              weekLabel={`Week ${weekNumber}`}
              modeColor={brand.pregnancy}
            />
            <View style={{ height: 12 }} />
            {renderModeToggle()}
            <View style={{ height: 12 }} />
            {renderTimelineView()}
          </>
        )}
        {view === 'journey' && renderJourneyView()}
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
      <Modal
        visible={selectedLog !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedLog(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedLog(null)}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            {selectedLog !== null && (
              <LogDetailPopup
                log={selectedLog}
                onClose={() => setSelectedLog(null)}
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
          </Pressable>
        </Pressable>
      </Modal>

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
    shadowColor: '#B983FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
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
  segLabel: { fontSize: 12, fontFamily: 'DMSans_500Medium', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },

  scroll: { padding: 16 },

  // Month grid
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navBtn: { padding: 8 },
  monthLabel: { fontSize: 18, fontFamily: 'Fraunces_800ExtraBold' },
  weekdayRow: { flexDirection: 'row', marginBottom: 8 },
  weekdayLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontFamily: 'DMSans_500Medium', fontWeight: '700' },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, padding: 4, alignItems: 'center' },
  dayNum: { fontSize: 14, fontFamily: 'DMSans_500Medium', fontWeight: '700' },
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
  highlightTitle: { fontSize: 13, fontFamily: 'DMSans_500Medium', fontWeight: '700' },
  highlightDetail: { fontSize: 11, fontFamily: 'DMSans_500Medium', marginTop: 1 },
  highlightDots: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  highlightDot: { width: 5, height: 5, borderRadius: 3 },

  // Day panel
  dayPanel: { borderRadius: 20, padding: 16, marginTop: 12 },
  dayPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dayPanelDateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dayPanelDate: { fontSize: 14, fontFamily: 'DMSans_500Medium', fontWeight: '700' },
  dayPanelCount: { fontSize: 12, fontFamily: 'DMSans_500Medium' },
  emptyDay: { fontSize: 13, fontFamily: 'DMSans_500Medium', textAlign: 'center', paddingVertical: 8 },
  listDivider: { height: 1, marginVertical: 8 },

  // Section toggle (pending / logged headers)
  sectionToggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 6 },
  sectionToggleLabel: { fontSize: 12, fontFamily: 'DMSans_500Medium', fontWeight: '700', flex: 1 },

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
  typeGroupLabel: { flex: 1, fontSize: 13, fontFamily: 'DMSans_500Medium', fontWeight: '700' },
  typeGroupCount: { fontSize: 11, fontFamily: 'DMSans_500Medium', fontWeight: '600' },

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
  routineItemIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  routineItemContent: { flex: 1 },
  routineItemName: { fontSize: 13, fontFamily: 'DMSans_500Medium', fontWeight: '600' },
  routineItemSub: { fontSize: 11, fontFamily: 'DMSans_500Medium', marginTop: 1 },
  routineItemTime: { fontSize: 11, fontFamily: 'DMSans_500Medium' },

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
  loggedItemValue: { fontSize: 12, fontFamily: 'DMSans_500Medium', color: 'rgba(255,255,255,0.65)' },
  loggedItemTime: { fontSize: 11, fontFamily: 'DMSans_500Medium' },

  // Week strip
  weekStrip: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  weekDayBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, marginHorizontal: 2 },
  weekDayName: { fontSize: 10, fontFamily: 'DMSans_500Medium', fontWeight: '700', marginBottom: 2 },
  weekDayNum: { fontSize: 16, fontFamily: 'Fraunces_800ExtraBold' },
  weekDotIndicator: { width: 4, height: 4, borderRadius: 2, marginTop: 3 },

  // Journey
  journeyRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 12, marginBottom: 8, gap: 12 },
  journeyWeekBadge: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  journeyWeekNum: { fontSize: 14, fontFamily: 'Fraunces_800ExtraBold' },
  journeyContent: { flex: 1 },
  journeySize: { fontSize: 14, fontFamily: 'DMSans_500Medium', fontWeight: '600' },
  journeyFact: { fontSize: 12, fontFamily: 'DMSans_500Medium', marginTop: 1 },
  currentBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  currentBadgeText: { fontSize: 10, fontFamily: 'DMSans_500Medium', fontWeight: '700', color: '#fff' },

  // Appointments
  apptRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  apptTimelineLeft: { alignItems: 'center', width: 24 },
  apptDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  apptLine: { width: 2, flex: 1, marginTop: 2 },
  apptCard: { flex: 1, borderRadius: 16, padding: 12, marginBottom: 8 },
  apptCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  apptName: { fontSize: 14, fontFamily: 'DMSans_500Medium', fontWeight: '600' },
  apptWeek: { fontSize: 12, fontFamily: 'DMSans_500Medium' },
  apptPrep: { fontSize: 12, fontFamily: 'DMSans_500Medium', marginTop: 4 },
  apptDone: { fontSize: 12, fontFamily: 'DMSans_500Medium', marginTop: 4 },
  addApptBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 999, marginTop: 16 },
  addApptBtnText: { fontSize: 15, fontFamily: 'DMSans_500Medium', fontWeight: '700', color: '#fff' },

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
  fabSheetTitle: { fontSize: 18, fontFamily: 'Fraunces_800ExtraBold' },
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
  fabSheetLabel: { fontSize: 11, fontFamily: 'DMSans_500Medium', fontWeight: '700', textAlign: 'center' },

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
  manageRoutinesBtnText: { flex: 1, fontSize: 14, fontFamily: 'DMSans_500Medium', fontWeight: '700' },

  // Routine Manager
  routineManagerSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '92%',
    paddingTop: 8,
  },
  routineManagerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  routineManagerTitle: { flex: 1, fontSize: 18, fontFamily: 'Fraunces_800ExtraBold' },
  routineManagerScroll: { paddingHorizontal: 16, paddingTop: 12 },
  routineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  routineIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  routineInfo: { flex: 1 },
  routineName: { fontSize: 14, fontFamily: 'DMSans_500Medium', fontWeight: '700' },
  routineDetail: { fontSize: 11, fontFamily: 'DMSans_500Medium', marginTop: 2 },
  routineDeleteBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 13, fontFamily: 'DMSans_500Medium', textAlign: 'center', paddingVertical: 12 },

  // Add routine form
  addRoutineForm: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    gap: 10,
  },
  addRoutineTitle: { fontSize: 14, fontFamily: 'Fraunces_800ExtraBold' },
  addRoutineLabel: { fontSize: 12, fontFamily: 'DMSans_500Medium', fontWeight: '700', marginTop: 4 },
  routineInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
  },
  typePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  typePillText: { fontSize: 12, fontFamily: 'DMSans_500Medium', fontWeight: '600' },
  daysRow: { flexDirection: 'row', gap: 6 },
  dayPill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillText: { fontSize: 12, fontFamily: 'DMSans_500Medium', fontWeight: '700' },
  saveRoutineBtn: { paddingVertical: 14, borderRadius: 999, alignItems: 'center', marginTop: 4 },
  saveRoutineBtnText: { fontSize: 15, fontFamily: 'DMSans_500Medium', fontWeight: '700', color: '#fff' },

  // Log Detail Bottom Sheet (Kids style)
  detailSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 8,
    paddingHorizontal: 20,
  },
  detailHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center', marginBottom: 20,
  },
  detailHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 14,
  },
  detailTitle: { fontSize: 22, fontFamily: 'Fraunces_800ExtraBold' },
  detailClose: { padding: 8 },
  detailInfoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, padding: 12, marginBottom: 10,
  },
  detailInfoText: { fontSize: 13, fontFamily: 'DMSans_500Medium', fontWeight: '600' },
  detailMetricCard: {
    borderRadius: 24, borderWidth: 1, padding: 24,
    alignItems: 'center', gap: 6, marginBottom: 14,
  },
  detailMetricBig: { fontSize: 52, fontFamily: 'Fraunces_800ExtraBold', letterSpacing: -2 },
  detailMetricText: { fontSize: 22, fontFamily: 'Fraunces_800ExtraBold', textAlign: 'center' },
  detailMetricUnit: { fontSize: 20, fontFamily: 'DMSans_500Medium', fontWeight: '600' },
  detailMetricLabel: {
    fontSize: 11, fontFamily: 'DMSans_500Medium', fontWeight: '700',
    letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2,
  },
  detailPillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  detailPill: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1,
  },
  detailPillText: { fontSize: 12, fontFamily: 'DMSans_500Medium', fontWeight: '600' },
  detailNotesBox: { borderRadius: 14, padding: 14, marginBottom: 14 },
  detailNotesText: { fontSize: 14, fontFamily: 'DMSans_500Medium' },
  detailActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  detailEditBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 999,
  },
  detailDeleteBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 999, borderWidth: 1,
  },
  detailActionText: { fontSize: 15, fontFamily: 'DMSans_500Medium', fontWeight: '700', color: '#fff' },

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
    fontFamily: 'DMSans_500Medium',
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
    fontFamily: 'DMSans_500Medium',
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
    fontFamily: 'DMSans_500Medium',
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
    fontFamily: 'DMSans_500Medium',
  },
})
