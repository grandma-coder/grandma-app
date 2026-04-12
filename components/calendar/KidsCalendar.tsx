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

import { useState, useMemo, useEffect, useCallback } from 'react'
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
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { useChildStore } from '../../store/useChildStore'
import { toDateStr } from '../../lib/cycleLogic'
import { supabase } from '../../lib/supabase'
import { LogSheet } from './LogSheet'
import {
  FeedingForm,
  SleepForm,
  HealthEventForm,
  KidsMoodForm,
  MemoryForm,
  ActivityForm,
  type RoutinePrefill,
} from './KidsLogForms'

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
}

type LogType = 'feeding' | 'sleep' | 'health' | 'mood' | 'memory' | 'activity'

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

// ─── Child colors (cycle through for multi-child dots) ─────────────────────

const CHILD_COLORS = [brand.kids, brand.prePregnancy, brand.accent, brand.phase.ovulation, brand.pregnancy, brand.secondary]

function childColor(index: number) {
  return CHILD_COLORS[index % CHILD_COLORS.length]
}

// ─── Constants ─────────────────────────────────────────────────────────────

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const LOG_META: Record<string, { label: string; icon: typeof Utensils; color: string }> = {
  feeding: { label: 'Feeding', icon: Utensils, color: brand.kids },
  food: { label: 'Food', icon: Utensils, color: brand.kids },
  sleep: { label: 'Sleep', icon: Moon, color: brand.pregnancy },
  health: { label: 'Health', icon: Heart, color: brand.error },
  temperature: { label: 'Temperature', icon: Heart, color: brand.error },
  medicine: { label: 'Medicine', icon: Heart, color: brand.error },
  vaccine: { label: 'Vaccine', icon: Heart, color: brand.error },
  mood: { label: 'Mood', icon: Smile, color: brand.accent },
  memory: { label: 'Memory', icon: Camera, color: brand.phase.ovulation },
  photo: { label: 'Photo', icon: Camera, color: brand.phase.ovulation },
  diaper: { label: 'Diaper', icon: Smile, color: brand.secondary },
  growth: { label: 'Growth', icon: Heart, color: brand.success },
  milestone: { label: 'Milestone', icon: Camera, color: brand.accent },
  activity: { label: 'Activity', icon: Dumbbell, color: brand.phase.ovulation },
  note: { label: 'Note', icon: Calendar, color: brand.primaryLight },
  skipped: { label: 'Skipped', icon: MinusCircle, color: '#888888' },
}

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

const QUICK_LOGS: { id: LogType; label: string; icon: typeof Utensils; color: string }[] = [
  { id: 'feeding', label: 'Feeding', icon: Utensils, color: brand.kids },
  { id: 'sleep', label: 'Sleep', icon: Moon, color: brand.pregnancy },
  { id: 'health', label: 'Health', icon: Heart, color: brand.error },
  { id: 'activity', label: 'Activity', icon: Dumbbell, color: brand.phase.ovulation },
  { id: 'mood', label: 'Mood', icon: Smile, color: brand.accent },
  { id: 'memory', label: 'Memory', icon: Camera, color: brand.phase.ovulation },
]

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Map routine type → sheet LogType */
const ROUTINE_SHEET_MAP: Record<string, string> = {
  feeding: 'feeding', food: 'feeding', sleep: 'sleep',
  activity: 'activity', mood: 'mood', health: 'health', memory: 'memory',
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatTime(isoStr: string): string {
  const d = new Date(isoStr)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatDayLabel(dateStr: string, todayStr: string): string {
  if (dateStr === todayStr) return 'Today'
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
            const d = stripUnit(String(parsed.duration), ['hrs', 'hr', 'hours', 'hour', 'h'])
            parts.push(`${d} hrs`)
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
        default: {
          const parts = Object.entries(parsed)
            .filter(([, v]) => v && v !== false)
            .map(([k, v]) => (v === true ? k : `${v}`))
          return parts.join(' · ') || notes || ''
        }
      }
    }
  } catch {
    // Not JSON — use value as-is
  }
  return value
}

// ─── FAB + Quick Log Sheet ────────────────────────────────────────────────

function FabWithSheet({ onSelect, onManageRoutines }: { onSelect: (type: LogType) => void; onManageRoutines: () => void }) {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const [open, setOpen] = useState(false)

  function handleSelect(type: LogType) {
    setOpen(false)
    onSelect(type)
  }

  return (
    <>
      {/* FAB button */}
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.fabBtn,
          { backgroundColor: colors.primary, top: insets.top + 12 },
          pressed && { transform: [{ scale: 0.93 }] },
        ]}
      >
        <Plus size={26} color="#FFFFFF" strokeWidth={2.5} />
      </Pressable>

      {/* Quick log sheet */}
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.fabSheetBackdrop} onPress={() => setOpen(false)} />
        <View style={[styles.fabSheet, { backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.fabSheetHandle}>
            <View style={[styles.fabSheetHandleBar, { backgroundColor: colors.border }]} />
          </View>
          <Text style={[styles.fabSheetTitle, { color: colors.text }]}>Log Activity</Text>
          <View style={styles.fabSheetGrid}>
            {QUICK_LOGS.map((log) => {
              const Icon = log.icon
              return (
                <Pressable
                  key={log.id}
                  onPress={() => handleSelect(log.id)}
                  style={({ pressed }) => [
                    styles.fabSheetItem,
                    { backgroundColor: colors.surface, borderRadius: radius.xl },
                    pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
                  ]}
                >
                  <View style={[styles.fabSheetIcon, { backgroundColor: log.color + '15' }]}>
                    <Icon size={22} color={log.color} strokeWidth={2} />
                  </View>
                  <Text style={[styles.fabSheetLabel, { color: colors.text }]}>{log.label}</Text>
                </Pressable>
              )
            })}
          </View>

          {/* Manage Routines button */}
          <Pressable
            onPress={() => { setOpen(false); onManageRoutines() }}
            style={({ pressed }) => [
              styles.fabRoutineBtn,
              { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Repeat size={18} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.fabRoutineBtnText, { color: colors.primary }]}>Manage Routines</Text>
            <ChevronRightSmall size={16} color={colors.textMuted} />
          </Pressable>
        </View>
      </Modal>
    </>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────

export function KidsCalendar() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()

  const children = useChildStore((s) => s.children)
  const activeChild = useChildStore((s) => s.activeChild)
  const setActiveChild = useChildStore((s) => s.setActiveChild)

  const [selectedChildId, setSelectedChildId] = useState<string | 'all'>('all')
  const [view, setView] = useState<'month' | 'list'>('month')
  const [viewDate, setViewDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()))
  const [sheetType, setSheetType] = useState<LogType | null>(null)
  const [routinePrefill, setRoutinePrefill] = useState<RoutinePrefill | null>(null)
  const [skippedToday, setSkippedToday] = useState<Set<string>>(new Set())

  // Real data from Supabase
  const [monthLogs, setMonthLogs] = useState<ChildLog[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedLog, setSelectedLog] = useState<ChildLog | null>(null)

  // Routines
  const [routines, setRoutines] = useState<ChildRoutine[]>([])
  const [showRoutineManager, setShowRoutineManager] = useState(false)
  const [routineEditing, setRoutineEditing] = useState<ChildRoutine | null>(null)
  const [routineForm, setRoutineForm] = useState({ name: '', type: 'activity' as string, time: '09:00', days: [0,1,2,3,4,5,6] as number[] })
  const [routineSaving, setRoutineSaving] = useState(false)
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
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
      const endYear = month + 2 > 12 ? year + 1 : year
      const endMonth = month + 2 > 12 ? 1 : month + 2

      const { data, error } = await supabase
        .from('child_logs')
        .select('id, child_id, date, type, value, notes, photos, created_at')
        .in('child_id', childIds)
        .gte('date', startDate)
        .lt('date', `${endYear}-${String(endMonth).padStart(2, '0')}-01`)
        .order('created_at', { ascending: true })

      if (!error && data) {
        setMonthLogs(data)
      }
    } catch {
      // silently fail — UI will show empty state
    } finally {
      setLoading(false)
    }
  }, [year, month, selectedChildId, children])

  useEffect(() => { fetchLogs() }, [fetchLogs])

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

  // Reset skipped routines when the selected date changes
  useEffect(() => { setSkippedToday(new Set()) }, [selectedDate])

  function handleSaved() {
    // Optimistically mark the routine as done so it disappears from pending immediately
    if (routinePrefill?.routineId) {
      setSkippedToday((prev) => new Set([...prev, routinePrefill.routineId!]))
    }
    setSheetType(null)
    setRoutinePrefill(null)
    fetchLogs()
  }

  function closeSheet() {
    setSheetType(null)
    setRoutinePrefill(null)
  }

  async function handleDeleteLog(logId: string) {
    await supabase.from('child_logs').delete().eq('id', logId)
    setSelectedLog(null)
    setEditing(false)
    fetchLogs()
  }

  function openEdit(log: ChildLog) {
    setEditValue(log.value ?? '')
    setEditNotes(log.notes ?? '')
    setEditing(true)
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
      Alert.alert('Error', e.message)
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
      const dayLabel = offset === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

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
          title: meta.label,
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
    return (dayLogs ?? []).some((log) => {
      if (log.child_id !== routine.child_id) return false
      // Match by type and (for food) meal, or by name
      if (log.type !== routine.type && !(routine.type === 'food' && log.type === 'feeding') && !(routine.type === 'feeding' && log.type === 'food')) {
        // Also match exact types
        if (log.type !== routine.type) return false
      }
      // For food logs, match by meal
      if (routine.type === 'food' && routine.value) {
        try {
          const rv = JSON.parse(routine.value)
          const lv = log.value ? JSON.parse(log.value) : null
          if (rv.meal && lv && lv.meal === rv.meal) return true
        } catch {}
      }
      // For feeding type, match by time or feedType
      if (routine.type === 'feeding' && routine.value) {
        try {
          const rv = JSON.parse(routine.value)
          const lv = log.value ? JSON.parse(log.value) : null
          if (rv.feedType && lv && lv.feedType === rv.feedType && routine.time) {
            // Close enough if within 2 hours
            const rHour = parseInt(routine.time.split(':')[0])
            const logTime = new Date(log.created_at)
            if (Math.abs(logTime.getHours() - rHour) <= 2) return true
          }
        } catch {}
      }
      // For activity, match by name
      if (routine.type === 'activity' && routine.value) {
        try {
          const rv = JSON.parse(routine.value)
          const lv = log.value ? JSON.parse(log.value) : null
          if (rv.name && lv && lv.name === rv.name) return true
        } catch {}
      }
      // For mood, any same-child mood log on the same day = done
      if (routine.type === 'mood') return true
      // For sleep, match by time proximity
      if (routine.type === 'sleep' && routine.time) {
        const rHour = parseInt(routine.time.split(':')[0])
        const logTime = new Date(log.created_at)
        if (Math.abs(logTime.getHours() - rHour) <= 2) return true
      }
      return false
    })
  }

  /** Routines scheduled today that haven't been logged yet and not skipped */
  const pendingRoutines = useMemo(
    () => selectedDayRoutines.filter(
      (r) => !isRoutineDone(r, selectedDayLogs) && !skippedToday.has(r.id) && !isRoutineSkipped(r, selectedDayLogs)
    ),
    [selectedDayRoutines, selectedDayLogs, skippedToday],
  )

  /** Save a new or edited routine */
  async function saveRoutine() {
    setRoutineSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      const childId = selectedChildId !== 'all' ? selectedChildId : (activeChild?.id ?? children[0]?.id)
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
      Alert.alert('Error', e.message)
    } finally {
      setRoutineSaving(false)
    }
  }

  async function deleteRoutine(id: string) {
    Alert.alert('Delete Routine', 'Remove this routine?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('child_routines').delete().eq('id', id)
        fetchRoutines()
      }},
    ])
  }

  async function skipRoutine(routine: ChildRoutine) {
    // Optimistic UI update
    setSkippedToday((prev) => new Set([...prev, routine.id]))
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      await supabase.from('child_logs').insert({
        child_id: routine.child_id,
        user_id: session.user.id,
        date: selectedDate,
        type: 'skipped',
        value: JSON.stringify({ routineId: routine.id, routineName: routine.name, routineType: routine.type }),
        notes: null,
        photos: [],
      })
      fetchLogs()
    } catch {
      // silently fail — optimistic state still hides the item
    }
  }

  function handleRoutineOptions(routine: ChildRoutine) {
    Alert.alert(
      routine.name,
      'What would you like to do?',
      [
        {
          text: 'Skip today',
          onPress: () => skipRoutine(routine),
        },
        {
          text: 'Delete entire routine',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Delete routine',
              `Remove "${routine.name}" from all future days?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    await supabase.from('child_routines').delete().eq('id', routine.id)
                    fetchRoutines()
                  },
                },
              ]
            ),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    )
  }

  async function toggleRoutine(id: string, active: boolean) {
    await supabase.from('child_routines').update({ active: !active }).eq('id', id)
    fetchRoutines()
  }

  // ── Derived data ────────────────────────────────────────────────────────

  const logsByDate = useMemo(() => {
    const map = new Map<string, ChildLog[]>()
    for (const log of monthLogs) {
      const existing = map.get(log.date) ?? []
      existing.push(log)
      map.set(log.date, existing)
    }
    return map
  }, [monthLogs])

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

  /** Routines that were explicitly skipped for the selected day */
  const skippedDayRoutines = useMemo(
    () => selectedDayRoutines.filter((r) => isRoutineSkipped(r, selectedDayLogs)),
    [selectedDayRoutines, selectedDayLogs],
  )

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

  function handleDayPress(dateStr: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setSelectedDate(dateStr)
  }

  const monthLabel = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const allLogsForList = useMemo(() => {
    return [...monthLogs]
      .filter((l) => l.date <= todayStr)
      .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
  }, [monthLogs, todayStr])

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Child Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.childSelectorRow}
        >
          <Pressable
            onPress={() => setSelectedChildId('all')}
            style={[
              styles.childSelectorChip,
              {
                backgroundColor: selectedChildId === 'all' ? colors.primaryTint : colors.surface,
                borderColor: selectedChildId === 'all' ? colors.primary : colors.border,
                borderRadius: radius.full,
              },
            ]}
          >
            <Text style={[styles.childSelectorText, { color: selectedChildId === 'all' ? colors.primary : colors.text }]}>
              All Kids
            </Text>
          </Pressable>
          {children.map((c, i) => {
            const active = selectedChildId === c.id
            return (
              <Pressable
                key={c.id}
                onPress={() => {
                  setSelectedChildId(c.id)
                  setActiveChild(c)
                }}
                style={[
                  styles.childSelectorChip,
                  {
                    backgroundColor: active ? childColor(i) + '15' : colors.surface,
                    borderColor: active ? childColor(i) : colors.border,
                    borderRadius: radius.full,
                  },
                ]}
              >
                <View style={[styles.childDot, { backgroundColor: childColor(i) }]} />
                <Text style={[styles.childSelectorText, { color: active ? childColor(i) : colors.text }]}>
                  {c.name}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>

        {/* 2. View Toggle */}
        <View style={[styles.toggleRow, { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg }]}>
          <Pressable
            onPress={() => setView('month')}
            style={[styles.toggleBtn, { backgroundColor: view === 'month' ? colors.primary : 'transparent', borderRadius: radius.md }]}
          >
            <Text style={[styles.toggleText, { color: view === 'month' ? '#FFFFFF' : colors.textSecondary }]}>Month</Text>
          </Pressable>
          <Pressable
            onPress={() => setView('list')}
            style={[styles.toggleBtn, { backgroundColor: view === 'list' ? colors.primary : 'transparent', borderRadius: radius.md }]}
          >
            <Text style={[styles.toggleText, { color: view === 'list' ? '#FFFFFF' : colors.textSecondary }]}>List</Text>
          </Pressable>
        </View>

        {view === 'month' ? (
          <>
            {/* 3. Month Header */}
            <View style={styles.monthHeader}>
              <Pressable onPress={prevMonth} style={styles.chevron}>
                <ChevronLeft size={24} color={colors.text} />
              </Pressable>
              <Text style={[styles.monthLabel, { color: colors.text }]}>{monthLabel}</Text>
              <Pressable onPress={nextMonth} style={styles.chevron}>
                <ChevronRight size={24} color={colors.text} />
              </Pressable>
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarWrap}>
              <View style={styles.weekRow}>
                {WEEKDAYS.map((w) => (
                  <Text key={w} style={[styles.weekday, { color: colors.textMuted }]}>{w}</Text>
                ))}
              </View>
              <View style={styles.dayGrid}>
                {calendarDays.map((d, idx) => {
                  if (!d.inMonth) return <View key={`e-${idx}`} style={styles.dayCell} />
                  const isSelected = d.date === selectedDate
                  const dayChildIds = childIdsByDate.get(d.date)
                  const hasLogs = !!dayChildIds && dayChildIds.size > 0
                  return (
                    <Pressable
                      key={d.date}
                      onPress={() => handleDayPress(d.date)}
                      style={[
                        styles.dayCell,
                        {
                          backgroundColor: isSelected
                            ? colors.primary + '20'
                            : d.isToday
                              ? brand.accent + '12'
                              : colors.surface,
                          borderRadius: radius.sm,
                          opacity: d.isFuture ? 0.4 : 1,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.dayInner,
                          isSelected && {
                            borderWidth: 2,
                            borderColor: colors.primary,
                            borderRadius: radius.sm,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayNumber,
                            { color: isSelected ? colors.primary : d.isToday ? brand.accent : colors.text },
                            (isSelected || d.isToday) && { fontWeight: '800' },
                          ]}
                        >
                          {d.day}
                        </Text>
                        {/* Today indicator dot */}
                        {d.isToday && !isSelected && (
                          <View style={[styles.todayDot, { backgroundColor: brand.accent }]} />
                        )}
                        {hasLogs && (
                          <View style={styles.dotRow}>
                            {Array.from(dayChildIds).slice(0, 3).map((cid) => {
                              const ci = childIndexMap.get(cid) ?? 0
                              return (
                                <View
                                  key={cid}
                                  style={[styles.logDot, { backgroundColor: childColor(ci) }]}
                                />
                              )
                            })}
                          </View>
                        )}
                      </View>
                    </Pressable>
                  )
                })}
              </View>
            </View>

            {loading && (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginBottom: 12 }} />
            )}

            {/* 4. Upcoming Highlights Banner */}
            {upcomingHighlights.length > 0 && (() => {
              const h = upcomingHighlights[highlightIndex % upcomingHighlights.length]
              if (!h) return null
              const meta = LOG_META[h.icon] ?? { icon: Calendar, color: brand.accent }
              const HIcon = meta.icon
              return (
                <View style={[styles.highlightBanner, { backgroundColor: h.color + '10', borderColor: h.color + '25', borderRadius: radius.xl }]}>
                  <View style={[styles.highlightIconWrap, { backgroundColor: h.color + '20' }]}>
                    <HIcon size={18} color={h.color} strokeWidth={2} />
                  </View>
                  <View style={styles.highlightContent}>
                    <Text style={[styles.highlightTitle, { color: colors.text }]} numberOfLines={1}>{h.title}</Text>
                    <Text style={[styles.highlightDetail, { color: colors.textSecondary }]} numberOfLines={1}>{h.detail}</Text>
                  </View>
                  <View style={[styles.highlightChildTag, { backgroundColor: h.childColor + '18' }]}>
                    <Text style={[styles.highlightChildName, { color: h.childColor }]}>{h.childName}</Text>
                  </View>
                  {upcomingHighlights.length > 1 && (
                    <View style={styles.highlightDots}>
                      {upcomingHighlights.map((_, i) => (
                        <View key={i} style={[styles.highlightDot, { backgroundColor: i === (highlightIndex % upcomingHighlights.length) ? colors.primary : colors.border }]} />
                      ))}
                    </View>
                  )}
                </View>
              )
            })()}

            {/* 5. Day Detail Panel — pending routines + logged activities merged */}
            <View style={[styles.dayDetailPanel, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
              <View style={styles.dayDetailHeader}>
                <View style={styles.dayDetailTitleRow}>
                  <Calendar size={16} color={colors.primary} strokeWidth={2} />
                  <Text style={[styles.dayDetailTitle, { color: colors.text }]}>
                    {formatDayLabel(selectedDate, todayStr)}
                  </Text>
                </View>
                <Text style={[styles.dayDetailCount, { color: colors.textMuted }]}>
                  {selectedDayLogs.filter((l) => l.type !== 'skipped').length} {selectedDayLogs.filter((l) => l.type !== 'skipped').length === 1 ? 'activity' : 'activities'}
                </Text>
              </View>

              {/* Pending routines — tap to open the log form */}
              {pendingRoutines.length > 0 && (
                <View style={styles.dayLogList}>
                  {pendingRoutines.map((routine) => {
                    const meta = LOG_META[routine.type] ?? { label: routine.type, icon: Calendar, color: colors.textMuted }
                    const Icon = meta.icon
                    const routineChild = children.find((c) => c.id === routine.child_id)
                    const ci = childIndexMap.get(routine.child_id) ?? 0
                    return (
                      <Pressable
                        key={`pending-${routine.id}`}
                        onPress={() => {
                          setRoutinePrefill({ routineId: routine.id, childId: routine.child_id, time: routine.time ?? undefined, value: routine.value ?? undefined, name: routine.name })
                          setSheetType((ROUTINE_SHEET_MAP[routine.type] ?? 'feeding') as LogType)
                        }}
                        onLongPress={() => handleRoutineOptions(routine)}
                        delayLongPress={400}
                        style={({ pressed }) => [
                          styles.dayLogItem,
                          styles.pendingRoutineItem,
                          { borderColor: meta.color + '60', backgroundColor: meta.color + '08', borderRadius: radius.lg },
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <View>
                          <View style={[styles.dayLogIcon, { backgroundColor: meta.color + '15' }]}>
                            <Icon size={16} color={meta.color} strokeWidth={2} />
                          </View>
                          <View style={[styles.loggedBadge, { backgroundColor: colors.bg, borderColor: brand.accent + '80' }]}>
                            <AlertCircle size={12} color={brand.accent} strokeWidth={2.5} />
                          </View>
                        </View>
                        <View style={styles.dayLogContent}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                            <Text style={[styles.dayLogType, { color: colors.textSecondary }]}>{routine.name}</Text>
                            <Repeat size={10} color={colors.textMuted} strokeWidth={2.5} />
                          </View>
                          <Text style={[styles.dayLogDetail, { color: colors.textMuted }]}>
                            {routine.time ? `${fmtTime(routine.time)} · ` : ''}Tap to log
                          </Text>
                        </View>
                        <View style={styles.dayLogMeta}>
                          {routine.time && (
                            <Text style={[styles.dayLogTime, { color: colors.textMuted }]}>{fmtTime(routine.time)}</Text>
                          )}
                          {selectedChildId === 'all' && routineChild && (
                            <View style={[styles.dayLogChildTag, { backgroundColor: childColor(ci) + '15' }]}>
                              <Text style={[styles.dayLogChildName, { color: childColor(ci) }]}>{routineChild.name}</Text>
                            </View>
                          )}
                        </View>
                        <ChevronRightSmall size={14} color={colors.textMuted} style={{ marginLeft: 4 }} />
                      </Pressable>
                    )
                  })}
                </View>
              )}

              {/* Skipped routines */}
              {skippedDayRoutines.length > 0 && (
                <>
                  {pendingRoutines.length > 0 && (
                    <View style={[styles.listDivider, { backgroundColor: colors.border }]} />
                  )}
                  <View style={styles.dayLogList}>
                    {skippedDayRoutines.map((routine) => {
                      const meta = LOG_META[routine.type] ?? { label: routine.type, icon: Calendar, color: colors.textMuted }
                      const Icon = meta.icon
                      const routineChild = children.find((c) => c.id === routine.child_id)
                      const ci = childIndexMap.get(routine.child_id) ?? 0
                      return (
                        <View
                          key={`skipped-${routine.id}`}
                          style={[
                            styles.dayLogItem,
                            styles.pendingRoutineItem,
                            { borderColor: '#88888840', backgroundColor: '#88888808', borderRadius: radius.lg, opacity: 0.75 },
                          ]}
                        >
                          <View>
                            <View style={[styles.dayLogIcon, { backgroundColor: '#88888815' }]}>
                              <Icon size={16} color="#888888" strokeWidth={2} />
                            </View>
                            <View style={[styles.loggedBadge, { backgroundColor: colors.bg, borderColor: '#88888880' }]}>
                              <MinusCircle size={12} color="#888888" strokeWidth={2.5} />
                            </View>
                          </View>
                          <View style={styles.dayLogContent}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                              <Text style={[styles.dayLogType, { color: colors.textMuted, textDecorationLine: 'line-through' }]}>{routine.name}</Text>
                              <Repeat size={10} color={colors.textMuted} strokeWidth={2.5} />
                            </View>
                            <Text style={[styles.dayLogDetail, { color: colors.textMuted }]}>
                              {routine.time ? `${fmtTime(routine.time)} · ` : ''}Skipped
                            </Text>
                          </View>
                          <View style={styles.dayLogMeta}>
                            {routine.time && (
                              <Text style={[styles.dayLogTime, { color: colors.textMuted }]}>{fmtTime(routine.time)}</Text>
                            )}
                            {selectedChildId === 'all' && routineChild && (
                              <View style={[styles.dayLogChildTag, { backgroundColor: childColor(ci) + '15' }]}>
                                <Text style={[styles.dayLogChildName, { color: childColor(ci) }]}>{routineChild.name}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      )
                    })}
                  </View>
                </>
              )}

              {/* Divider when both sections have content */}
              {(pendingRoutines.length > 0 || skippedDayRoutines.length > 0) && selectedDayLogs.filter((l) => l.type !== 'skipped').length > 0 && (
                <View style={[styles.listDivider, { backgroundColor: colors.border }]} />
              )}

              {/* Logged activities */}
              {selectedDayLogs.filter((l) => l.type !== 'skipped').length === 0 && pendingRoutines.length === 0 && skippedDayRoutines.length === 0 ? (
                <View style={styles.emptyDay}>
                  <Text style={[styles.emptyDayText, { color: colors.textMuted }]}>No activities logged</Text>
                  <Text style={[styles.emptyDayHint, { color: colors.textMuted }]}>Tap + to add one</Text>
                </View>
              ) : (
                <View style={styles.dayLogList}>
                  {selectedDayLogs.filter((l) => l.type !== 'skipped').map((log) => {
                    const meta = LOG_META[log.type] ?? { label: log.type, icon: Calendar, color: colors.textMuted }
                    const Icon = meta.icon
                    const logChildName = children.find((c) => c.id === log.child_id)?.name
                    const ci = childIndexMap.get(log.child_id) ?? 0
                    const isFromRoutine = selectedDayRoutines.some((r) => isRoutineDone(r, [log]))
                    return (
                      <Pressable
                        key={log.id}
                        onPress={() => { setSelectedLog(log); setEditing(false) }}
                        style={({ pressed }) => [
                          styles.dayLogItem,
                          styles.loggedItem,
                          { borderColor: brand.success + '50', backgroundColor: brand.success + '08', borderRadius: radius.lg },
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <View>
                          <View style={[styles.dayLogIcon, { backgroundColor: meta.color + '15' }]}>
                            <Icon size={16} color={meta.color} strokeWidth={2} />
                          </View>
                          <View style={[styles.loggedBadge, { backgroundColor: colors.bg, borderColor: brand.success + '80' }]}>
                            <CheckCircle2 size={12} color={brand.success} strokeWidth={2.5} />
                          </View>
                        </View>
                        <View style={styles.dayLogContent}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                            <Text style={[styles.dayLogType, { color: colors.text }]}>{meta.label}</Text>
                            {isFromRoutine && <Repeat size={10} color={colors.textMuted} strokeWidth={2.5} />}
                          </View>
                          {formatLogDisplay(log.type, log.value, log.notes) !== '' && (
                            <Text style={[styles.dayLogDetail, { color: colors.textSecondary }]} numberOfLines={2}>
                              {formatLogDisplay(log.type, log.value, log.notes)}
                            </Text>
                          )}
                        </View>
                        <View style={styles.dayLogMeta}>
                          <Text style={[styles.dayLogTime, { color: colors.textMuted }]}>{formatTime(log.created_at)}</Text>
                          {selectedChildId === 'all' && logChildName && (
                            <View style={[styles.dayLogChildTag, { backgroundColor: childColor(ci) + '15' }]}>
                              <Text style={[styles.dayLogChildName, { color: childColor(ci) }]}>{logChildName}</Text>
                            </View>
                          )}
                        </View>
                        <ChevronRightSmall size={14} color={colors.textMuted} style={{ marginLeft: 4 }} />
                      </Pressable>
                    )
                  })}
                </View>
              )}
            </View>

            {/* Next Event Banner (fallback if no highlights) */}
            {upcomingHighlights.length === 0 && nextEvent && (
              <View style={[styles.banner, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
                <View style={styles.bannerHeader}>
                  <Calendar size={18} color={colors.primary} strokeWidth={2} />
                  <Text style={[styles.bannerTitle, { color: colors.text }]}>Upcoming</Text>
                </View>
                <Text style={[styles.bannerEvent, { color: colors.text }]}>
                  {nextEvent.label}{nextEvent.detail ? ` — ${nextEvent.detail}` : ''}
                </Text>
                <Text style={[styles.bannerDate, { color: colors.textSecondary }]}>
                  {formatDayLabel(nextEvent.date, todayStr)} — {nextEvent.childName}
                </Text>
              </View>
            )}
          </>
        ) : (
          /* 5. List View */
          <View style={styles.listWrap}>
            {allLogsForList.length === 0 && !loading ? (
              <View style={[styles.emptyList, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
                <Text style={[styles.emptyDayText, { color: colors.textMuted }]}>
                  No activities this month
                </Text>
              </View>
            ) : (
              (() => {
                let lastDate = ''
                return allLogsForList.map((log) => {
                  const meta = LOG_META[log.type] ?? { label: log.type, icon: Calendar, color: colors.textMuted }
                  const Icon = meta.icon
                  const logChildName = children.find((c) => c.id === log.child_id)?.name
                  const showDateHeader = log.date !== lastDate
                  lastDate = log.date

                  return (
                    <View key={log.id}>
                      {showDateHeader && (
                        <Text style={[styles.listDateHeader, { color: colors.textSecondary }]}>
                          {formatDayLabel(log.date, todayStr)}
                        </Text>
                      )}
                      <Pressable
                        onPress={() => { setSelectedLog(log); setEditing(false) }}
                        style={({ pressed }) => [
                          styles.listItem,
                          { backgroundColor: colors.surface, borderRadius: radius.xl },
                          pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
                        ]}
                      >
                        <View style={[styles.listIcon, { backgroundColor: meta.color + '15' }]}>
                          <Icon size={18} color={meta.color} strokeWidth={2} />
                        </View>
                        <View style={styles.listContent}>
                          <Text style={[styles.listType, { color: colors.text }]}>
                            {meta.label}
                          </Text>
                          {formatLogDisplay(log.type, log.value, log.notes) !== '' && (
                            <Text style={[styles.listDetail, { color: colors.textSecondary }]} numberOfLines={1}>
                              {formatLogDisplay(log.type, log.value, log.notes)}
                            </Text>
                          )}
                        </View>
                        <View style={styles.listMeta}>
                          <Text style={[styles.listTime, { color: colors.textMuted }]}>{formatTime(log.created_at)}</Text>
                          {logChildName && (
                            <Text style={[styles.listChild, { color: colors.textMuted }]}>{logChildName}</Text>
                          )}
                        </View>
                        <ChevronRightSmall size={14} color={colors.textMuted} style={{ marginLeft: 2 }} />
                      </Pressable>
                    </View>
                  )
                })
              })()
            )}
            {loading && (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 16 }} />
            )}
          </View>
        )}
      </ScrollView>

      {/* ─── FAB + Quick Log Sheet ─────────────────────────────────────── */}
      <FabWithSheet onSelect={(type) => { setRoutinePrefill(null); setSheetType(type) }} onManageRoutines={() => setShowRoutineManager(true)} />

      {/* ─── Bottom Sheets ────────────────────────────────────────────── */}

      <LogSheet visible={sheetType === 'feeding'} title={routinePrefill?.name ?? 'Log Feeding'} onClose={closeSheet}>
        <FeedingForm onSaved={handleSaved} initialDate={selectedDate} prefill={routinePrefill ?? undefined} />
      </LogSheet>

      <LogSheet visible={sheetType === 'sleep'} title={routinePrefill?.name ?? 'Log Sleep'} onClose={closeSheet}>
        <SleepForm onSaved={handleSaved} initialDate={selectedDate} prefill={routinePrefill ?? undefined} />
      </LogSheet>

      <LogSheet visible={sheetType === 'health'} title={routinePrefill?.name ?? 'Log Health Event'} onClose={closeSheet}>
        <HealthEventForm onSaved={handleSaved} initialDate={selectedDate} prefill={routinePrefill ?? undefined} />
      </LogSheet>

      <LogSheet visible={sheetType === 'mood'} title={routinePrefill?.name ?? 'Log Mood'} onClose={closeSheet}>
        <KidsMoodForm onSaved={handleSaved} initialDate={selectedDate} prefill={routinePrefill ?? undefined} />
      </LogSheet>

      <LogSheet visible={sheetType === 'activity'} title={routinePrefill?.name ?? 'Log Activity'} onClose={closeSheet}>
        <ActivityForm onSaved={handleSaved} initialDate={selectedDate} prefill={routinePrefill ?? undefined} />
      </LogSheet>

      <LogSheet visible={sheetType === 'memory'} title="Capture Memory" onClose={closeSheet}>
        <MemoryForm onSaved={handleSaved} initialDate={selectedDate} />
      </LogSheet>

      {/* ─── Routine Manager ────────────────────────────────────────── */}
      <Modal
        visible={showRoutineManager}
        animationType="slide"
        transparent
        onRequestClose={() => { setShowRoutineManager(false); setRoutineEditing(null) }}
      >
        <Pressable style={styles.popupBackdrop} onPress={() => { setShowRoutineManager(false); setRoutineEditing(null) }} />
        <View style={[styles.popupSheet, { backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.popupHandleWrap}>
            <View style={[styles.popupHandle, { backgroundColor: colors.border }]} />
          </View>
          <View style={[styles.popupHeader, { paddingBottom: 12 }]}>
            <View style={[styles.popupIconLarge, { backgroundColor: colors.primary + '15' }]}>
              <Repeat size={24} color={colors.primary} strokeWidth={2} />
            </View>
            <View style={styles.popupHeaderText}>
              <Text style={[styles.popupTitle, { color: colors.text }]}>Routines</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '500' }}>
                Recurring activities for your kids
              </Text>
            </View>
            <Pressable onPress={() => { setShowRoutineManager(false); setRoutineEditing(null) }} style={styles.popupClose}>
              <X size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={styles.popupBody} showsVerticalScrollIndicator={false}>
            {/* Add / Edit Form */}
            <View style={[styles.routineFormWrap, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
              <Text style={[styles.routineFormTitle, { color: colors.text }]}>
                {routineEditing ? 'Edit Routine' : 'New Routine'}
              </Text>

              {/* Name */}
              <TextInput
                value={routineForm.name}
                onChangeText={(t) => setRoutineForm((f) => ({ ...f, name: t }))}
                placeholder="Routine name (e.g. Morning bottle)"
                placeholderTextColor={colors.textMuted}
                style={[styles.routineInput, { color: colors.text, borderColor: colors.border, borderRadius: radius.md }]}
              />

              {/* Type */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.routineTypeRow}>
                {['feeding', 'food', 'sleep', 'activity', 'mood', 'health'].map((t) => {
                  const meta = LOG_META[t]
                  const active = routineForm.type === t
                  return (
                    <Pressable
                      key={t}
                      onPress={() => setRoutineForm((f) => ({ ...f, type: t }))}
                      style={[
                        styles.routineTypeChip,
                        { backgroundColor: active ? meta.color + '20' : colors.surfaceRaised, borderColor: active ? meta.color : colors.border, borderRadius: radius.full },
                      ]}
                    >
                      <Text style={[styles.routineTypeText, { color: active ? meta.color : colors.textSecondary }]}>
                        {meta.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </ScrollView>

              {/* Time */}
              <View style={styles.routineTimeRow}>
                <Clock size={16} color={colors.textMuted} />
                <TextInput
                  value={routineForm.time}
                  onChangeText={(t) => setRoutineForm((f) => ({ ...f, time: t }))}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.routineTimeInput, { color: colors.text, borderColor: colors.border, borderRadius: radius.md }]}
                  keyboardType="numbers-and-punctuation"
                />
              </View>

              {/* Days */}
              <View style={styles.routineDaysRow}>
                {DAY_NAMES.map((name, i) => {
                  const active = routineForm.days.includes(i)
                  return (
                    <Pressable
                      key={i}
                      onPress={() => setRoutineForm((f) => ({
                        ...f,
                        days: active ? f.days.filter((d) => d !== i) : [...f.days, i].sort(),
                      }))}
                      style={[
                        styles.routineDayChip,
                        {
                          backgroundColor: active ? colors.primary : colors.surfaceRaised,
                          borderColor: active ? colors.primary : colors.border,
                          borderRadius: radius.full,
                        },
                      ]}
                    >
                      <Text style={[styles.routineDayText, { color: active ? '#FFF' : colors.textSecondary }]}>
                        {name.charAt(0)}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>

              {/* Save */}
              <Pressable
                onPress={saveRoutine}
                disabled={!routineForm.name.trim() || routineSaving}
                style={({ pressed }) => [
                  styles.routineSaveBtn,
                  { backgroundColor: colors.primary, borderRadius: radius.lg, opacity: (!routineForm.name.trim() || routineSaving) ? 0.4 : 1 },
                  pressed && { opacity: 0.9 },
                ]}
              >
                {routineSaving
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <Text style={styles.routineSaveBtnText}>{routineEditing ? 'Update' : 'Add Routine'}</Text>
                }
              </Pressable>
            </View>

            {/* Existing Routines List */}
            {routines.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.routineFormTitle, { color: colors.text, marginBottom: 10, paddingHorizontal: 4 }]}>
                  Active Routines ({routines.length})
                </Text>
                {routines.map((r) => {
                  const meta = LOG_META[r.type] ?? { label: r.type, icon: Calendar, color: colors.textMuted }
                  const Icon = meta.icon
                  const childName = children.find((c) => c.id === r.child_id)?.name
                  const ci = childIndexMap.get(r.child_id) ?? 0
                  return (
                    <View
                      key={r.id}
                      style={[styles.routineManagerItem, { backgroundColor: colors.surface, borderRadius: radius.lg }]}
                    >
                      <View style={[styles.routineIcon, { backgroundColor: meta.color + '12' }]}>
                        <Icon size={14} color={meta.color} strokeWidth={2} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[styles.routineName, { color: colors.text }]}>{r.name}</Text>
                        <Text style={[styles.routineTime, { color: colors.textMuted }]}>
                          {r.time ? fmtTime(r.time) : 'Anytime'}
                          {' · '}
                          {r.days_of_week.length === 7 ? 'Daily' : r.days_of_week.map((d) => DAY_NAMES[d].charAt(0)).join(' ')}
                          {childName ? ` · ${childName}` : ''}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => {
                          setRoutineEditing(r)
                          setRoutineForm({ name: r.name, type: r.type, time: r.time ?? '09:00', days: r.days_of_week })
                        }}
                        style={{ padding: 6 }}
                      >
                        <Pencil size={14} color={colors.textMuted} />
                      </Pressable>
                      <Pressable onPress={() => deleteRoutine(r.id)} style={{ padding: 6 }}>
                        <Trash2 size={14} color={brand.error} />
                      </Pressable>
                    </View>
                  )
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* ─── Log Detail Popup with Edit ───────────────────────────────── */}
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
                  <Text style={[styles.popupTitle, { color: colors.text }]}>{meta.label}</Text>
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
                    {formatDayLabel(selectedLog.date, todayStr)} at {formatTime(selectedLog.created_at)}
                  </Text>
                </View>

                {editing ? (
                  /* ── Edit Mode ── */
                  <>
                    <View style={[styles.popupSection, { backgroundColor: colors.surface, borderRadius: radius.lg }]}>
                      <Text style={[styles.popupSectionLabel, { color: colors.textMuted }]}>Details</Text>
                      <TextInput
                        value={editValue}
                        onChangeText={setEditValue}
                        placeholder="Details..."
                        placeholderTextColor={colors.textMuted}
                        multiline
                        style={[styles.editInput, { color: colors.text, borderColor: colors.border, borderRadius: radius.md }]}
                      />
                    </View>
                    <View style={[styles.popupSection, { backgroundColor: colors.surface, borderRadius: radius.lg }]}>
                      <Text style={[styles.popupSectionLabel, { color: colors.textMuted }]}>Notes</Text>
                      <TextInput
                        value={editNotes}
                        onChangeText={setEditNotes}
                        placeholder="Notes..."
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
                        <Text style={[styles.editCancelText, { color: colors.textSecondary }]}>Cancel</Text>
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
                              <Text style={styles.editSaveText}>Save</Text>
                            </>
                        }
                      </Pressable>
                    </View>
                  </>
                ) : (
                  /* ── View Mode ── */
                  <>
                    {formatLogDisplay(selectedLog.type, selectedLog.value, null) !== '' && (
                      <View style={[styles.popupSection, { backgroundColor: colors.surface, borderRadius: radius.lg }]}>
                        <Text style={[styles.popupSectionLabel, { color: colors.textMuted }]}>Details</Text>
                        <Text style={[styles.popupSectionValue, { color: colors.text }]}>
                          {formatLogDisplay(selectedLog.type, selectedLog.value, null)}
                        </Text>
                      </View>
                    )}

                    {selectedLog.notes && (
                      <View style={[styles.popupSection, { backgroundColor: colors.surface, borderRadius: radius.lg }]}>
                        <Text style={[styles.popupSectionLabel, { color: colors.textMuted }]}>Notes</Text>
                        <Text style={[styles.popupSectionValue, { color: colors.text }]}>{selectedLog.notes}</Text>
                      </View>
                    )}

                    {hasPhotos && (
                      <View style={styles.popupPhotos}>
                        <Text style={[styles.popupSectionLabel, { color: colors.textMuted, marginBottom: 8, paddingHorizontal: 16 }]}>Photos</Text>
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
                          No additional details recorded
                        </Text>
                      </View>
                    )}

                    {/* Action buttons */}
                    <View style={styles.popupActions}>
                      <Pressable
                        onPress={() => openEdit(selectedLog)}
                        style={({ pressed }) => [
                          styles.popupEditBtn,
                          { backgroundColor: colors.primary, borderRadius: radius.lg },
                          pressed && { opacity: 0.9 },
                        ]}
                      >
                        <Pencil size={16} color="#FFF" strokeWidth={2} />
                        <Text style={styles.popupEditText}>Edit</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeleteLog(selectedLog.id)}
                        style={({ pressed }) => [
                          styles.popupDeleteBtn,
                          { borderColor: colors.border, borderRadius: radius.lg },
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <Trash2 size={16} color={brand.error} />
                        <Text style={[styles.popupDeleteText, { color: brand.error }]}>Delete</Text>
                      </Pressable>
                    </View>
                  </>
                )}
              </ScrollView>
            </View>
          )
        })()}
      </Modal>
    </View>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16 },

  // Child selector
  childSelectorRow: { gap: 8, marginBottom: 12, paddingVertical: 4 },
  childSelectorChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1 },
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
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
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

  // FAB + Sheet
  fabBtn: { position: 'absolute', right: 16, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 6, zIndex: 10 },
  fabSheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  fabSheet: { position: 'absolute', bottom: 0, left: 0, right: 0 },
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
  popupEditBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14 },
  popupEditText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  popupDeleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderWidth: 1, paddingHorizontal: 20 },
  popupDeleteText: { fontSize: 14, fontWeight: '700' },

  // Edit mode
  editInput: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontWeight: '500', minHeight: 44 },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 6, marginBottom: 20 },
  editCancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 14, borderWidth: 1 },
  editCancelText: { fontSize: 14, fontWeight: '700' },
  editSaveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14 },
  editSaveText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
})
