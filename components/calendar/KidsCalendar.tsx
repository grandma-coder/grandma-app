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

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
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
  Minus,
  Baby,
} from 'lucide-react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
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
  DiaperForm,
  type RoutinePrefill,
  type EditLog,
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
  logged_by: string | null
}

type LogType = 'feeding' | 'sleep' | 'health' | 'mood' | 'memory' | 'activity' | 'diaper'

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
  diaper: { label: 'Diaper', icon: Baby, color: brand.secondary },
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
  { id: 'diaper', label: 'Diaper', icon: Baby, color: brand.secondary },
  { id: 'health', label: 'Health', icon: Heart, color: brand.error },
  { id: 'activity', label: 'Activity', icon: Dumbbell, color: brand.phase.ovulation },
  { id: 'mood', label: 'Mood', icon: Smile, color: brand.accent },
  { id: 'memory', label: 'Memory', icon: Camera, color: brand.phase.ovulation },
]

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Map routine type → sheet LogType */
const ROUTINE_SHEET_MAP: Record<string, string> = {
  feeding: 'feeding', food: 'feeding', sleep: 'sleep',
  activity: 'activity', mood: 'mood', health: 'health', memory: 'memory', diaper: 'diaper',
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
        case 'diaper': {
          const parts: string[] = []
          const typeLabels: Record<string, string> = { pee: 'Pee 💧', poop: 'Poop 💩', mixed: 'Both 🔄' }
          if (parsed.diaperType) parts.push(typeLabels[parsed.diaperType] ?? parsed.diaperType)
          if (parsed.color) parts.push(parsed.color.charAt(0).toUpperCase() + parsed.color.slice(1))
          if (parsed.consistency) parts.push(parsed.consistency.charAt(0).toUpperCase() + parsed.consistency.slice(1))
          if (parsed.time) parts.push(fmtTime(parsed.time))
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
  const [view, setView] = useState<'month' | 'day' | 'list'>('month')
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
  const [loading, setLoading] = useState(false)
  const [profileNames, setProfileNames] = useState<Record<string, string>>({}) // userId → display name
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
            .from('profiles')
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

  // Auto-scroll day view to current time (or 8 AM) when opening it
  useEffect(() => {
    if (view !== 'day') return
    const now = new Date()
    const targetHours = selectedDate === todayStr
      ? Math.max(DAY_VIEW_START, now.getHours() + now.getMinutes() / 60 - 2)
      : 8
    const scrollY = Math.max(0, (targetHours - DAY_VIEW_START) * dayZoomH)
    setTimeout(() => dayScrollRef.current?.scrollTo({ y: scrollY, animated: false }), 80)
  }, [view, selectedDate, todayStr, dayZoomH])

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
    await supabase.from('child_logs').delete().eq('id', logId)
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
    await supabase.from('child_logs').delete().eq('id', target.id)
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
    // Map log type → sheet type
    const LOG_TO_SHEET: Record<string, LogType> = {
      food: 'feeding', feeding: 'feeding', sleep: 'sleep',
      temperature: 'health', vaccine: 'health', medicine: 'health', note: 'health',
      mood: 'mood', photo: 'memory', activity: 'activity', diaper: 'diaper',
    }
    const sheetLogType = LOG_TO_SHEET[log.type] ?? 'feeding'
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
            // If a specific meal is set on the routine, require it to match
            if (rv.meal && lv?.meal) return rv.meal === lv.meal
            // If a feedType is set, require it to match
            if (rv.feedType && lv?.feedType) return rv.feedType === lv.feedType
          } catch {}
        }
        // No specific criteria — any food/feeding log for this child counts
        return true
      }

      // ── Activity ──────────────────────────────────────────────────────────
      if (routine.type === 'activity') {
        if (routine.value) {
          try {
            const rv = JSON.parse(routine.value)
            const lv = log.value ? JSON.parse(log.value) : null
            // If a name is set, require exact name match (prevents false dedup)
            if (rv.name && lv?.name) return rv.name === lv.name
            // If activityType is set, require it to match
            if (rv.activityType && lv?.activityType) return rv.activityType === lv.activityType
          } catch {}
        }
        // No name/type set → match by time proximity (within 1 hour)
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
            onPress={() => setView('day')}
            style={[styles.toggleBtn, { backgroundColor: view === 'day' ? colors.primary : 'transparent', borderRadius: radius.md }]}
          >
            <Text style={[styles.toggleText, { color: view === 'day' ? '#FFFFFF' : colors.textSecondary }]}>Day</Text>
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

            {/* 5. Day Detail Panel — grouped per child */}
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

              {selectedChildId === 'all' ? (
                /* All Kids: grouped per child with individual expand/collapse + logged sub-section */
                (() => {
                  const dayGroups = children.map((child, ci) => {
                    const color = childColor(ci)
                    const childPending = pendingRoutines.filter((r) => r.child_id === child.id)
                    const childSkipped = skippedDayRoutines.filter((r) => r.child_id === child.id)
                    const childLogged = selectedDayLogs.filter((l) => l.child_id === child.id && l.type !== 'skipped')
                    if (childPending.length === 0 && childSkipped.length === 0 && childLogged.length === 0) return null
                    return { child, ci, color, childPending, childSkipped, childLogged }
                  }).filter(Boolean) as { child: (typeof children)[0]; ci: number; color: string; childPending: ChildRoutine[]; childSkipped: ChildRoutine[]; childLogged: ChildLog[] }[]

                  if (dayGroups.length === 0) {
                    return (
                      <View style={styles.emptyDay}>
                        <Text style={[styles.emptyDayText, { color: colors.textMuted }]}>No activities logged</Text>
                        <Text style={[styles.emptyDayHint, { color: colors.textMuted }]}>Tap + to add one</Text>
                      </View>
                    )
                  }

                  return dayGroups.map(({ child, ci, color, childPending, childSkipped, childLogged }) => {
                    const isSectionCollapsed = collapsedDayChildren.has(child.id)
                    const isLoggedCollapsed = loggedCollapsedByChild[child.id] ?? true

                    return (
                      <View key={child.id} style={{ marginBottom: 2 }}>
                        {/* Child section header */}
                        <Pressable
                          onPress={() => setCollapsedDayChildren((prev) => {
                            const next = new Set(prev)
                            if (next.has(child.id)) next.delete(child.id); else next.add(child.id)
                            return next
                          })}
                          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 4, gap: 8 }}
                        >
                          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
                          <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700', flex: 1 }}>{child.name}</Text>
                          <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                            {childPending.length > 0 ? `${childPending.length} pending` : ''}
                            {childPending.length > 0 && childLogged.length > 0 ? ' · ' : ''}
                            {childLogged.length > 0 ? `${childLogged.length} logged` : ''}
                            {childPending.length === 0 && childLogged.length === 0 && childSkipped.length > 0 ? 'skipped' : ''}
                          </Text>
                          {isSectionCollapsed
                            ? <ChevronDown size={14} color={colors.textMuted} />
                            : <ChevronUp size={14} color={colors.textMuted} />}
                        </Pressable>

                        {!isSectionCollapsed && (
                          <View style={{ paddingLeft: 18 }}>
                            {/* Pending routines for this child — collapsible */}
                            {(childPending.length > 0 || childSkipped.length > 0) && (
                              <Pressable
                                onPress={() => {
                                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
                                  setPendingCollapsedByChild((prev) => ({ ...prev, [child.id]: !(prev[child.id] ?? true) }))
                                }}
                                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7, gap: 6 }}
                              >
                                <AlertCircle size={13} color={brand.accent} strokeWidth={2.5} />
                                <Text style={{ color: brand.accent, fontSize: 12, fontWeight: '700', flex: 1 }}>
                                  {childPending.length} pending{childSkipped.length > 0 ? ` · ${childSkipped.length} skipped` : ''}
                                </Text>
                                {(pendingCollapsedByChild[child.id] ?? true)
                                  ? <ChevronDown size={14} color={brand.accent} />
                                  : <ChevronUp size={14} color={brand.accent} />}
                              </Pressable>
                            )}
                            {!(pendingCollapsedByChild[child.id] ?? true) && (childPending.length > 0 || childSkipped.length > 0) && (
                              (() => {
                                const catK = (type: string) => (type === 'food' ? 'feeding' : type)
                                const seen = new Set<string>()
                                const orderedCats: string[] = []
                                for (const r of [...childPending, ...childSkipped]) {
                                  const k = catK(r.type)
                                  if (!seen.has(k)) { seen.add(k); orderedCats.push(k) }
                                }
                                return orderedCats.map((ck) => {
                                  const catPending = childPending.filter((r) => catK(r.type) === ck)
                                  const catSkipped = childSkipped.filter((r) => catK(r.type) === ck)
                                  const catMeta = LOG_META[ck] ?? { label: ck, icon: Calendar, color: colors.textMuted }
                                  const CatIcon = catMeta.icon
                                  const catExpandKey = `${child.id}:${ck}`
                                  const isCatExpanded = expandedPendingCats.has(catExpandKey)
                                  return (
                                    <View key={ck} style={{ marginBottom: 4 }}>
                                      <Pressable
                                        onPress={() => {
                                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
                                          setExpandedPendingCats((prev) => {
                                            const next = new Set(prev)
                                            if (next.has(catExpandKey)) next.delete(catExpandKey); else next.add(catExpandKey)
                                            return next
                                          })
                                        }}
                                        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, backgroundColor: catMeta.color + '12', borderRadius: radius.md, gap: 8 }}
                                      >
                                        <CatIcon size={13} color={catMeta.color} strokeWidth={2.5} />
                                        <Text style={{ color: catMeta.color, fontSize: 12, fontWeight: '700', flex: 1 }}>{catMeta.label}</Text>
                                        <Text style={{ color: catMeta.color + 'AA', fontSize: 11, fontWeight: '600' }}>{catPending.length + catSkipped.length}</Text>
                                        {isCatExpanded ? <ChevronUp size={12} color={catMeta.color} /> : <ChevronDown size={12} color={catMeta.color} />}
                                      </Pressable>
                                      {isCatExpanded && (
                                        <View style={[styles.dayLogList, { marginTop: 4 }]}>
                                          {catPending.map((routine) => {
                                            const meta = LOG_META[routine.type] ?? { label: routine.type, icon: Calendar, color: colors.textMuted }
                                            const Icon = meta.icon
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
                                                  styles.dayLogItem, styles.pendingRoutineItem,
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
                                                  {routine.time && <Text style={[styles.dayLogTime, { color: colors.textMuted }]}>{fmtTime(routine.time)}</Text>}
                                                </View>
                                                <ChevronRightSmall size={14} color={colors.textMuted} style={{ marginLeft: 4 }} />
                                              </Pressable>
                                            )
                                          })}
                                          {catSkipped.map((routine) => {
                                            const meta = LOG_META[routine.type] ?? { label: routine.type, icon: Calendar, color: colors.textMuted }
                                            const Icon = meta.icon
                                            return (
                                              <Pressable
                                                key={`skipped-${routine.id}`}
                                                onPress={() =>
                                                  Alert.alert(
                                                    'Undo skip?',
                                                    `Restore "${routine.name}" as pending for this day.`,
                                                    [
                                                      { text: 'Cancel', style: 'cancel' },
                                                      { text: 'Undo skip', onPress: () => unskipRoutine(routine) },
                                                    ]
                                                  )
                                                }
                                                style={({ pressed }) => [styles.dayLogItem, styles.pendingRoutineItem, { borderColor: '#88888840', backgroundColor: '#88888808', borderRadius: radius.lg, opacity: pressed ? 0.5 : 0.75 }]}
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
                                                    {routine.time ? `${fmtTime(routine.time)} · ` : ''}Skipped · Tap to undo
                                                  </Text>
                                                </View>
                                                {routine.time && <Text style={[styles.dayLogTime, { color: colors.textMuted }]}>{fmtTime(routine.time)}</Text>}
                                              </Pressable>
                                            )
                                          })}
                                        </View>
                                      )}
                                    </View>
                                  )
                                })
                              })()
                            )}

                            {/* Logged activities for this child — collapsible */}
                            {childLogged.length > 0 && (
                              <>
                                {!(pendingCollapsedByChild[child.id] ?? true) && (childPending.length > 0 || childSkipped.length > 0) && (
                                  <View style={[styles.listDivider, { backgroundColor: colors.border }]} />
                                )}
                                <Pressable
                                  onPress={() => setLoggedCollapsedByChild((prev) => ({ ...prev, [child.id]: !(prev[child.id] ?? true) }))}
                                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7, gap: 6 }}
                                >
                                  <CheckCircle2 size={13} color={brand.success} strokeWidth={2.5} />
                                  <Text style={{ color: brand.success, fontSize: 12, fontWeight: '700', flex: 1 }}>
                                    {childLogged.length} {childLogged.length === 1 ? 'activity' : 'activities'} logged
                                  </Text>
                                  {isLoggedCollapsed
                                    ? <ChevronDown size={14} color={brand.success} />
                                    : <ChevronUp size={14} color={brand.success} />}
                                </Pressable>
                                {!isLoggedCollapsed && (
                                  <View style={styles.dayLogList}>
                                    {childLogged.map((log) => {
                                      const meta = LOG_META[log.type] ?? { label: log.type, icon: Calendar, color: colors.textMuted }
                                      const Icon = meta.icon
                                      const isFromRoutine = selectedDayRoutines.some((r) => isRoutineDone(r, [log]))
                                      const loggerName = log.logged_by ? profileNames[log.logged_by] : undefined
                                      return (
                                        <Pressable
                                          key={log.id}
                                          onPress={() => { setSelectedLog(log); setEditing(false) }}
                                          onLongPress={() => setUnlogTarget(log)}
                                          delayLongPress={400}
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
                                              <Text style={[styles.dayLogType, { color: colors.text }]}>{logTitle(log)}</Text>
                                              {isFromRoutine && <Repeat size={10} color={colors.textMuted} strokeWidth={2.5} />}
                                            </View>
                                            {formatLogDisplay(log.type, log.value, log.notes) !== '' && (
                                              <Text style={[styles.dayLogDetail, { color: colors.textSecondary }]} numberOfLines={2}>
                                                {formatLogDisplay(log.type, log.value, log.notes)}
                                              </Text>
                                            )}
                                          </View>
                                          <View style={styles.dayLogMeta}>
                                            <Text style={[styles.dayLogTime, { color: colors.textMuted }]}>{activityTimeDisplay(log)}</Text>
                                            {loggerName && (
                                              <Text style={{ fontSize: 9, color: colors.textMuted, fontWeight: '500' }}>by {loggerName}</Text>
                                            )}
                                          </View>
                                          <ChevronRightSmall size={14} color={colors.textMuted} style={{ marginLeft: 4 }} />
                                        </Pressable>
                                      )
                                    })}
                                  </View>
                                )}
                              </>
                            )}
                          </View>
                        )}
                      </View>
                    )
                  })
                })()
              ) : (
                /* Single child — pending routines + skipped + collapsible logged */
                <>
                  {/* Pending routines — collapsible */}
                  {(pendingRoutines.length > 0 || skippedDayRoutines.length > 0) && (
                    <>
                      <Pressable
                        onPress={() => {
                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
                          setPendingCollapsed((v) => !v)
                        }}
                        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 6 }}
                      >
                        <AlertCircle size={13} color={brand.accent} strokeWidth={2.5} />
                        <Text style={{ color: brand.accent, fontSize: 12, fontWeight: '700', flex: 1 }}>
                          {pendingRoutines.length} pending{skippedDayRoutines.length > 0 ? ` · ${skippedDayRoutines.length} skipped` : ''}
                        </Text>
                        {pendingCollapsed
                          ? <ChevronDown size={14} color={brand.accent} />
                          : <ChevronUp size={14} color={brand.accent} />}
                      </Pressable>
                    </>
                  )}
                  {!pendingCollapsed && (pendingRoutines.length > 0 || skippedDayRoutines.length > 0) && (
                    (() => {
                      const catK = (type: string) => (type === 'food' ? 'feeding' : type)
                      const seen = new Set<string>()
                      const orderedCats: string[] = []
                      for (const r of [...pendingRoutines, ...skippedDayRoutines]) {
                        const k = catK(r.type)
                        if (!seen.has(k)) { seen.add(k); orderedCats.push(k) }
                      }
                      return orderedCats.map((ck) => {
                        const catPending = pendingRoutines.filter((r) => catK(r.type) === ck)
                        const catSkipped = skippedDayRoutines.filter((r) => catK(r.type) === ck)
                        const catMeta = LOG_META[ck] ?? { label: ck, icon: Calendar, color: colors.textMuted }
                        const CatIcon = catMeta.icon
                        const isCatExpanded = expandedPendingCats.has(ck)
                        return (
                          <View key={ck} style={{ marginBottom: 4 }}>
                            <Pressable
                              onPress={() => {
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
                                setExpandedPendingCats((prev) => {
                                  const next = new Set(prev)
                                  if (next.has(ck)) next.delete(ck); else next.add(ck)
                                  return next
                                })
                              }}
                              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, backgroundColor: catMeta.color + '12', borderRadius: radius.md, gap: 8 }}
                            >
                              <CatIcon size={13} color={catMeta.color} strokeWidth={2.5} />
                              <Text style={{ color: catMeta.color, fontSize: 12, fontWeight: '700', flex: 1 }}>{catMeta.label}</Text>
                              <Text style={{ color: catMeta.color + 'AA', fontSize: 11, fontWeight: '600' }}>{catPending.length + catSkipped.length}</Text>
                              {isCatExpanded ? <ChevronUp size={12} color={catMeta.color} /> : <ChevronDown size={12} color={catMeta.color} />}
                            </Pressable>
                            {isCatExpanded && (
                              <View style={[styles.dayLogList, { marginTop: 4 }]}>
                                {catPending.map((routine) => {
                                  const meta = LOG_META[routine.type] ?? { label: routine.type, icon: Calendar, color: colors.textMuted }
                                  const Icon = meta.icon
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
                                        {routine.time && <Text style={[styles.dayLogTime, { color: colors.textMuted }]}>{fmtTime(routine.time)}</Text>}
                                      </View>
                                      <ChevronRightSmall size={14} color={colors.textMuted} style={{ marginLeft: 4 }} />
                                    </Pressable>
                                  )
                                })}
                                {catSkipped.map((routine) => {
                                  const meta = LOG_META[routine.type] ?? { label: routine.type, icon: Calendar, color: colors.textMuted }
                                  const Icon = meta.icon
                                  return (
                                    <Pressable
                                      key={`skipped-${routine.id}`}
                                      onPress={() =>
                                        Alert.alert(
                                          'Undo skip?',
                                          `Restore "${routine.name}" as pending for this day.`,
                                          [
                                            { text: 'Cancel', style: 'cancel' },
                                            { text: 'Undo skip', onPress: () => unskipRoutine(routine) },
                                          ]
                                        )
                                      }
                                      style={({ pressed }) => [styles.dayLogItem, styles.pendingRoutineItem, { borderColor: '#88888840', backgroundColor: '#88888808', borderRadius: radius.lg, opacity: pressed ? 0.5 : 0.75 }]}
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
                                          {routine.time ? `${fmtTime(routine.time)} · ` : ''}Skipped · Tap to undo
                                        </Text>
                                      </View>
                                      {routine.time && <Text style={[styles.dayLogTime, { color: colors.textMuted }]}>{fmtTime(routine.time)}</Text>}
                                    </Pressable>
                                  )
                                })}
                              </View>
                            )}
                          </View>
                        )
                      })
                    })()
                  )}

                  {/* Divider — only when pending section is expanded */}
                  {!pendingCollapsed && (pendingRoutines.length > 0 || skippedDayRoutines.length > 0) && selectedDayLogs.filter((l) => l.type !== 'skipped').length > 0 && (
                    <View style={[styles.listDivider, { backgroundColor: colors.border }]} />
                  )}

                  {/* Logged activities — collapsible / empty state */}
                  {selectedDayLogs.filter((l) => l.type !== 'skipped').length === 0 && pendingRoutines.length === 0 && skippedDayRoutines.length === 0 ? (
                    <View style={styles.emptyDay}>
                      <Text style={[styles.emptyDayText, { color: colors.textMuted }]}>No activities logged</Text>
                      <Text style={[styles.emptyDayHint, { color: colors.textMuted }]}>Tap + to add one</Text>
                    </View>
                  ) : selectedDayLogs.filter((l) => l.type !== 'skipped').length > 0 ? (
                    <>
                      {/* Logged activities grouped by category */}
                      {(() => {
                        const logsToShow = selectedDayLogs.filter((l) => l.type !== 'skipped')
                        // Canonical category key: food/feeding → 'feeding', rest by type
                        const categoryKey = (type: string) => (type === 'food' ? 'feeding' : type)
                        // Build ordered unique category list preserving first-seen order
                        const seen = new Set<string>()
                        const orderedCats: string[] = []
                        for (const l of logsToShow) {
                          const k = categoryKey(l.type)
                          if (!seen.has(k)) { seen.add(k); orderedCats.push(k) }
                        }
                        const totalLogged = logsToShow.length
                        return (
                          <>
                            {/* All-categories header */}
                            <Pressable
                              onPress={() => {
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
                                setLoggedCollapsed((v) => !v)
                              }}
                              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 6 }}
                            >
                              <CheckCircle2 size={13} color={brand.success} strokeWidth={2.5} />
                              <Text style={{ color: brand.success, fontSize: 12, fontWeight: '700', flex: 1 }}>
                                {totalLogged} {totalLogged === 1 ? 'activity' : 'activities'} logged
                              </Text>
                              {loggedCollapsed
                                ? <ChevronDown size={14} color={brand.success} />
                                : <ChevronUp size={14} color={brand.success} />}
                            </Pressable>

                            {!loggedCollapsed && orderedCats.map((catKey) => {
                              const catLogs = logsToShow.filter((l) => categoryKey(l.type) === catKey)
                              const catMeta = LOG_META[catKey] ?? { label: catKey, icon: Calendar, color: colors.textMuted }
                              const CatIcon = catMeta.icon
                              const catCollapsed = !expandedLogCategories.has(catKey)
                              return (
                                <View key={catKey} style={{ marginBottom: 4 }}>
                                  {/* Category header */}
                                  <Pressable
                                    onPress={() => {
                                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
                                      setExpandedLogCategories((prev) => {
                                        const next = new Set(prev)
                                        if (next.has(catKey)) next.delete(catKey); else next.add(catKey)
                                        return next
                                      })
                                    }}
                                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, backgroundColor: catMeta.color + '12', borderRadius: radius.md, gap: 8 }}
                                  >
                                    <CatIcon size={13} color={catMeta.color} strokeWidth={2.5} />
                                    <Text style={{ color: catMeta.color, fontSize: 12, fontWeight: '700', flex: 1 }}>{catMeta.label}</Text>
                                    <Text style={{ color: catMeta.color + 'AA', fontSize: 11, fontWeight: '600' }}>{catLogs.length}</Text>
                                    {catCollapsed
                                      ? <ChevronDown size={12} color={catMeta.color} />
                                      : <ChevronUp size={12} color={catMeta.color} />}
                                  </Pressable>

                                  {/* Category items */}
                                  {!catCollapsed && (
                                    <View style={[styles.dayLogList, { marginTop: 4 }]}>
                                      {catLogs.map((log) => {
                                        const meta = LOG_META[log.type] ?? { label: log.type, icon: Calendar, color: colors.textMuted }
                                        const Icon = meta.icon
                                        const isFromRoutine = selectedDayRoutines.some((r) => isRoutineDone(r, [log]))
                                        const loggerName = log.logged_by ? profileNames[log.logged_by] : undefined
                                        return (
                                          <Pressable
                                            key={log.id}
                                            onPress={() => { setSelectedLog(log); setEditing(false) }}
                                            onLongPress={() => setUnlogTarget(log)}
                                            delayLongPress={400}
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
                                                <Text style={[styles.dayLogType, { color: colors.text }]}>{logTitle(log)}</Text>
                                                {isFromRoutine && <Repeat size={10} color={colors.textMuted} strokeWidth={2.5} />}
                                              </View>
                                              {formatLogDisplay(log.type, log.value, log.notes) !== '' && (
                                                <Text style={[styles.dayLogDetail, { color: colors.textSecondary }]} numberOfLines={2}>
                                                  {formatLogDisplay(log.type, log.value, log.notes)}
                                                </Text>
                                              )}
                                            </View>
                                            <View style={styles.dayLogMeta}>
                                              <Text style={[styles.dayLogTime, { color: colors.textMuted }]}>{activityTimeDisplay(log)}</Text>
                                              {loggerName && (
                                                <Text style={{ fontSize: 9, color: colors.textMuted, fontWeight: '500' }}>by {loggerName}</Text>
                                              )}
                                            </View>
                                            <ChevronRightSmall size={14} color={colors.textMuted} style={{ marginLeft: 4 }} />
                                          </Pressable>
                                        )
                                      })}
                                    </View>
                                  )}
                                </View>
                              )
                            })}
                          </>
                        )
                      })()}
                    </>
                  ) : null}
                </>
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
        ) : view === 'day' ? (
          /* Day Time View — Google Calendar-style vertical timeline */
          <View style={[{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.xl, overflow: 'hidden' }]}>
            {/* Day nav header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Pressable onPress={prevDay} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <ChevronLeft size={20} color={colors.text} />
              </Pressable>
              <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
                <Text style={[styles.dayDetailTitle, { color: colors.text }]}>
                  {formatDayLabel(selectedDate, todayStr)}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                  {[
                    pendingRoutines.length > 0 && `${pendingRoutines.length} pending`,
                    selectedDayLogs.filter((l) => l.type !== 'skipped').length > 0 && `${selectedDayLogs.filter((l) => l.type !== 'skipped').length} logged`,
                  ].filter(Boolean).join(' · ') || 'No activities'}
                </Text>
              </View>
              <Pressable onPress={nextDay} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <ChevronRight size={20} color={colors.text} />
              </Pressable>
            </View>

            {/* Zoom controls */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 6, paddingHorizontal: 12, paddingBottom: 6 }}>
              <Pressable
                onPress={() => setDayZoomH((h) => Math.min(h + 16, DAY_VIEW_MAX_HOUR_H))}
                style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}
              >
                <Plus size={14} color={colors.textSecondary} strokeWidth={2.5} />
              </Pressable>
              <Pressable
                onPress={() => setDayZoomH((h) => Math.max(h - 16, DAY_VIEW_MIN_HOUR_H))}
                style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}
              >
                <Minus size={14} color={colors.textSecondary} strokeWidth={2.5} />
              </Pressable>
            </View>

            {/* Time grid — full 24h, flex height */}
            <ScrollView ref={dayScrollRef} style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', height: (DAY_VIEW_END - DAY_VIEW_START) * dayZoomH + dayZoomH }}>
                {/* Time labels column */}
                <View style={{ width: 52 }}>
                  {Array.from({ length: DAY_VIEW_END - DAY_VIEW_START + 1 }, (_, i) => (
                    <View key={i} style={{ height: dayZoomH, paddingTop: 5, alignItems: 'flex-end', paddingRight: 8 }}>
                      <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '600' }}>
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
                    type DvEvent = {
                      id: string; title: string; hours: number; durationHours: number
                      color: string; childId: string; isPending: boolean; isSkipped: boolean; isLogged: boolean
                      routine?: ChildRoutine; log?: ChildLog
                    }
                    const events: DvEvent[] = []

                    // Build a set of normalized skipped signatures so pending blocks for
                    // duplicate routines never appear alongside their skipped counterpart.
                    const skippedSigsDv = new Set(
                      skippedDayRoutines.map((r) => routineSig(r))
                    )
                    // Track seen pending sigs to dedup duplicate pending routines on the timeline
                    const seenPendingSigs = new Set<string>()
                    for (const r of pendingRoutines) {
                      if (!r.time) continue
                      const sig = routineSig(r)
                      if (skippedSigsDv.has(sig)) continue
                      if (seenPendingSigs.has(sig)) continue
                      seenPendingSigs.add(sig)
                      const hours = timeStrToHours(r.time)
                      if (hours < DAY_VIEW_START - 0.25 || hours > DAY_VIEW_END) continue
                      const rMeta = LOG_META[r.type] ?? { color: colors.textMuted }
                      events.push({ id: `p-${r.id}`, title: r.name, hours, durationHours: 0.75, color: rMeta.color, childId: r.child_id, isPending: true, isSkipped: false, isLogged: false, routine: r })
                    }
                    const seenSkipSigs = new Set<string>()
                    for (const r of skippedDayRoutines) {
                      if (!r.time) continue
                      const sig = routineSig(r)
                      if (seenSkipSigs.has(sig)) continue
                      seenSkipSigs.add(sig)
                      const hours = timeStrToHours(r.time)
                      if (hours < DAY_VIEW_START - 0.25 || hours > DAY_VIEW_END) continue
                      events.push({ id: `s-${r.id}`, title: r.name, hours, durationHours: 0.75, color: '#888888', childId: r.child_id, isPending: false, isSkipped: true, isLogged: false, routine: r })
                    }
                    for (const log of selectedDayLogs.filter((l) => l.type !== 'skipped')) {
                      const hours = activityTimeHours(log)
                      if (hours < DAY_VIEW_START - 0.25 || hours > DAY_VIEW_END) continue
                      const meta = LOG_META[log.type] ?? { label: log.type, color: colors.textMuted }
                      events.push({ id: `l-${log.id}`, title: logTitle(log), hours, durationHours: 0.75, color: meta.color, childId: log.child_id, isPending: false, isSkipped: false, isLogged: true, log })
                    }

                    if (events.length === 0) {
                      return (
                        <View style={{ position: 'absolute', top: (8 - DAY_VIEW_START) * dayZoomH, left: 0, right: 8, alignItems: 'center' }}>
                          <Text style={{ color: colors.textMuted, fontSize: 12 }}>No activities — tap + to add</Text>
                        </View>
                      )
                    }

                    // Greedy column assignment
                    const sorted = [...events].sort((a, b) => a.hours - b.hours)
                    const colEndTimes: number[] = []
                    const withCol = sorted.map((ev) => {
                      const evEnd = ev.hours + ev.durationHours
                      let col = colEndTimes.findIndex((t) => t <= ev.hours + 0.05)
                      if (col === -1) { col = colEndTimes.length; colEndTimes.push(evEnd) }
                      else colEndTimes[col] = evEnd
                      return { ...ev, col }
                    })
                    // Determine max concurrent columns per event
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
                      const childName = children.find((c) => c.id === ev.childId)?.name

                      return (
                        <Pressable
                          key={ev.id}
                          onPress={() => {
                            if (ev.isPending && ev.routine) {
                              setRoutinePrefill({ routineId: ev.routine.id, childId: ev.routine.child_id, time: ev.routine.time ?? undefined, value: ev.routine.value ?? undefined, name: ev.routine.name })
                              setSheetType((ROUTINE_SHEET_MAP[ev.routine.type] ?? 'feeding') as LogType)
                            } else if (ev.isLogged && ev.log) {
                              setSelectedLog(ev.log); setEditing(false)
                            }
                          }}
                          onLongPress={() => ev.routine && handleRoutineOptions(ev.routine)}
                          delayLongPress={400}
                          style={({ pressed }) => ({
                            position: 'absolute' as const,
                            top: y + 2,
                            height: blockH,
                            left: leftPct,
                            width: widthPct,
                            backgroundColor: ev.isSkipped ? '#88888812' : ev.color + (ev.isLogged ? '28' : '18'),
                            borderLeftWidth: 3,
                            borderLeftColor: ev.isSkipped ? '#888888' : ev.color,
                            borderRadius: 6,
                            paddingVertical: 5,
                            paddingLeft: 7,
                            paddingRight: 4,
                            zIndex: 5,
                            opacity: pressed ? 0.7 : (ev.isSkipped ? 0.55 : 1),
                          })}
                        >
                          <Text style={{ color: ev.isSkipped ? '#888888' : ev.color, fontSize: dayZoomH < 50 ? 9 : 11, fontWeight: '700', lineHeight: dayZoomH < 50 ? 11 : 14 }} numberOfLines={1}>
                            {ev.title}
                          </Text>
                          {dayZoomH >= 40 && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 1, gap: 3 }}>
                              <Text style={{ color: colors.textMuted, fontSize: 9 }} numberOfLines={1}>
                                {fmtTime(hoursToHHMM(ev.hours))}
                              </Text>
                              {ev.isLogged
                                ? <CheckCircle2 size={9} color={brand.success} strokeWidth={2.5} />
                                : ev.isPending
                                  ? <AlertCircle size={9} color={brand.accent} strokeWidth={2.5} />
                                  : <MinusCircle size={9} color="#888888" strokeWidth={2.5} />}
                            </View>
                          )}
                          {dayZoomH >= 56 && selectedChildId === 'all' && childName && ev.totalCols < 3 && (
                            <View style={{ marginTop: 3, alignSelf: 'flex-start', backgroundColor: ev.color + '30', borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 }}>
                              <Text style={{ color: ev.color, fontSize: 8, fontWeight: '700' }} numberOfLines={1}>{childName}</Text>
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
        ) : (
          /* 5. List View */
          <View style={styles.listWrap}>
            {allLogsForList.length === 0 && !loading ? (
              <View style={[styles.emptyList, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
                <Text style={[styles.emptyDayText, { color: colors.textMuted }]}>No activities this month</Text>
              </View>
            ) : selectedChildId === 'all' ? (
              /* All Kids: grouped by child, collapsible */
              (() => {
                const groups = children.map((child, ci) => {
                  const childLogs = allLogsForList.filter((l) => l.child_id === child.id)
                  return { child, ci, logs: childLogs }
                }).filter((g) => g.logs.length > 0)
                return groups.map(({ child, ci, logs }) => {
                  const color = childColor(ci)
                  const collapsed = !expandedChildren.has(child.id)
                  return (
                    <View key={child.id}>
                      {/* Child section header */}
                      <Pressable
                        onPress={() => setExpandedChildren((prev) => {
                          const next = new Set(prev)
                          if (next.has(child.id)) next.delete(child.id); else next.add(child.id)
                          return next
                        })}
                        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, gap: 8 }}
                      >
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
                        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700', flex: 1 }}>{child.name}</Text>
                        <Text style={{ color: colors.textMuted, fontSize: 12 }}>{logs.length}</Text>
                        {collapsed
                          ? <ChevronDown size={16} color={colors.textMuted} />
                          : <ChevronUp size={16} color={colors.textMuted} />}
                      </Pressable>
                      {!collapsed && (() => {
                        const ck = (type: string) => (type === 'food' ? 'feeding' : type)
                        const dateGroups: Array<{ date: string; cats: Array<{ key: string; cLogs: ChildLog[] }> }> = []
                        for (const log of logs) {
                          let dg = dateGroups.find((d) => d.date === log.date)
                          if (!dg) { dg = { date: log.date, cats: [] }; dateGroups.push(dg) }
                          const k = ck(log.type)
                          let cg = dg.cats.find((c) => c.key === k)
                          if (!cg) { cg = { key: k, cLogs: [] }; dg.cats.push(cg) }
                          cg.cLogs.push(log)
                        }
                        return dateGroups.map(({ date, cats }) => (
                          <View key={date}>
                            <Text style={[styles.listDateHeader, { color: colors.textSecondary }]}>
                              {formatDayLabel(date, todayStr).toUpperCase()}
                            </Text>
                            {cats.map(({ key: catK, cLogs }) => {
                              const catMeta = LOG_META[catK] ?? { label: catK, icon: Calendar, color: colors.textMuted }
                              const CatIcon = catMeta.icon
                              const collapseKey = `${child.id}:${date}:${catK}`
                              const isCatCollapsed = !expandedListCats.has(collapseKey)
                              return (
                                <View key={catK} style={{ marginBottom: 6 }}>
                                  <Pressable
                                    onPress={() => {
                                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
                                      setExpandedListCats((prev) => {
                                        const next = new Set(prev)
                                        if (next.has(collapseKey)) next.delete(collapseKey); else next.add(collapseKey)
                                        return next
                                      })
                                    }}
                                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: catMeta.color + '12', borderRadius: radius.lg, gap: 8, marginBottom: isCatCollapsed ? 0 : 4 }}
                                  >
                                    <CatIcon size={14} color={catMeta.color} strokeWidth={2.5} />
                                    <Text style={{ color: catMeta.color, fontSize: 13, fontWeight: '700', flex: 1 }}>{catMeta.label}</Text>
                                    <Text style={{ color: catMeta.color + 'AA', fontSize: 11, fontWeight: '600' }}>{cLogs.length}</Text>
                                    {isCatCollapsed ? <ChevronDown size={13} color={catMeta.color} /> : <ChevronUp size={13} color={catMeta.color} />}
                                  </Pressable>
                                  {!isCatCollapsed && cLogs.map((log) => {
                                    const meta = LOG_META[log.type] ?? { label: log.type, icon: Calendar, color: colors.textMuted }
                                    const Icon = meta.icon
                                    const loggerName = log.logged_by ? profileNames[log.logged_by] : undefined
                                    return (
                                      <Pressable
                                        key={log.id}
                                        onPress={() => { setSelectedLog(log); setEditing(false) }}
                                        onLongPress={() => setUnlogTarget(log)}
                                        delayLongPress={400}
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
                                          <Text style={[styles.listType, { color: colors.text }]}>{logTitle(log)}</Text>
                                          {formatLogDisplay(log.type, log.value, log.notes) !== '' && (
                                            <Text style={[styles.listDetail, { color: colors.textSecondary }]} numberOfLines={1}>
                                              {formatLogDisplay(log.type, log.value, log.notes)}
                                            </Text>
                                          )}
                                        </View>
                                        <View style={styles.listMeta}>
                                          <Text style={[styles.listTime, { color: colors.textMuted }]}>{activityTimeDisplay(log)}</Text>
                                          {loggerName && <Text style={[styles.listChild, { color: colors.textMuted }]}>by {loggerName}</Text>}
                                        </View>
                                        <ChevronRightSmall size={14} color={colors.textMuted} style={{ marginLeft: 2 }} />
                                      </Pressable>
                                    )
                                  })}
                                </View>
                              )
                            })}
                          </View>
                        ))
                      })()}
                    </View>
                  )
                })
              })()
            ) : (
              /* Single child: grouped by type within each date section */
              (() => {
                // Build date → catKey → logs[]
                const catKey = (type: string) => (type === 'food' ? 'feeding' : type)
                const dateGroups: Array<{ date: string; cats: Array<{ key: string; logs: ChildLog[] }> }> = []
                for (const log of allLogsForList) {
                  let dg = dateGroups.find((d) => d.date === log.date)
                  if (!dg) { dg = { date: log.date, cats: [] }; dateGroups.push(dg) }
                  const ck = catKey(log.type)
                  let cg = dg.cats.find((c) => c.key === ck)
                  if (!cg) { cg = { key: ck, logs: [] }; dg.cats.push(cg) }
                  cg.logs.push(log)
                }
                return dateGroups.map(({ date, cats }) => (
                  <View key={date}>
                    <Text style={[styles.listDateHeader, { color: colors.textSecondary }]}>
                      {formatDayLabel(date, todayStr).toUpperCase()}
                    </Text>
                    {cats.map(({ key: ck, logs: catLogs }) => {
                      const catMeta = LOG_META[ck] ?? { label: ck, icon: Calendar, color: colors.textMuted }
                      const CatIcon = catMeta.icon
                      const collapseKey = `${date}:${ck}`
                      const isCatCollapsed = !expandedListCats.has(collapseKey)
                      return (
                        <View key={ck} style={{ marginBottom: 6 }}>
                          {/* Category header row */}
                          <Pressable
                            onPress={() => {
                              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
                              setExpandedListCats((prev) => {
                                const next = new Set(prev)
                                if (next.has(collapseKey)) next.delete(collapseKey); else next.add(collapseKey)
                                return next
                              })
                            }}
                            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: catMeta.color + '12', borderRadius: radius.lg, gap: 8, marginBottom: isCatCollapsed ? 0 : 4 }}
                          >
                            <CatIcon size={14} color={catMeta.color} strokeWidth={2.5} />
                            <Text style={{ color: catMeta.color, fontSize: 13, fontWeight: '700', flex: 1 }}>{catMeta.label}</Text>
                            <Text style={{ color: catMeta.color + 'AA', fontSize: 11, fontWeight: '600' }}>{catLogs.length}</Text>
                            {isCatCollapsed
                              ? <ChevronDown size={13} color={catMeta.color} />
                              : <ChevronUp size={13} color={catMeta.color} />}
                          </Pressable>

                          {!isCatCollapsed && catLogs.map((log) => {
                            const meta = LOG_META[log.type] ?? { label: log.type, icon: Calendar, color: colors.textMuted }
                            const Icon = meta.icon
                            const loggerName = log.logged_by ? profileNames[log.logged_by] : undefined
                            return (
                              <Pressable
                                key={log.id}
                                onPress={() => { setSelectedLog(log); setEditing(false) }}
                                onLongPress={() => setUnlogTarget(log)}
                                delayLongPress={400}
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
                                  <Text style={[styles.listType, { color: colors.text }]}>{logTitle(log)}</Text>
                                  {formatLogDisplay(log.type, log.value, log.notes) !== '' && (
                                    <Text style={[styles.listDetail, { color: colors.textSecondary }]} numberOfLines={1}>
                                      {formatLogDisplay(log.type, log.value, log.notes)}
                                    </Text>
                                  )}
                                </View>
                                <View style={styles.listMeta}>
                                  <Text style={[styles.listTime, { color: colors.textMuted }]}>{activityTimeDisplay(log)}</Text>
                                  {loggerName && (
                                    <Text style={[styles.listChild, { color: colors.textMuted }]}>by {loggerName}</Text>
                                  )}
                                </View>
                                <ChevronRightSmall size={14} color={colors.textMuted} style={{ marginLeft: 2 }} />
                              </Pressable>
                            )
                          })}
                        </View>
                      )
                    })}
                  </View>
                ))
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

      <LogSheet visible={sheetType === 'feeding'} title={editingLog ? 'Edit Entry' : (routinePrefill?.name ?? 'Log Feeding')} onClose={closeSheet}>
        <FeedingForm onSaved={handleSaved} initialDate={selectedDate} prefill={routinePrefill ?? undefined} editLog={editingLog ?? undefined} onSkip={routinePrefill?.routineId ? () => { skipRoutine({ id: routinePrefill!.routineId!, child_id: routinePrefill!.childId, name: routinePrefill!.name ?? '', type: 'feeding', value: routinePrefill!.value ?? null, days_of_week: [], time: routinePrefill!.time ?? null, active: true }); closeSheet() } : undefined} />
      </LogSheet>

      <LogSheet visible={sheetType === 'sleep'} title={editingLog ? 'Edit Entry' : (routinePrefill?.name ?? 'Log Sleep')} onClose={closeSheet}>
        <SleepForm onSaved={handleSaved} initialDate={selectedDate} prefill={routinePrefill ?? undefined} editLog={editingLog ?? undefined} onSkip={routinePrefill?.routineId ? () => { skipRoutine({ id: routinePrefill!.routineId!, child_id: routinePrefill!.childId, name: routinePrefill!.name ?? '', type: 'sleep', value: routinePrefill!.value ?? null, days_of_week: [], time: routinePrefill!.time ?? null, active: true }); closeSheet() } : undefined} />
      </LogSheet>

      <LogSheet visible={sheetType === 'health'} title={editingLog ? 'Edit Entry' : (routinePrefill?.name ?? 'Log Health Event')} onClose={closeSheet}>
        <HealthEventForm onSaved={handleSaved} initialDate={selectedDate} prefill={routinePrefill ?? undefined} editLog={editingLog ?? undefined} onSkip={routinePrefill?.routineId ? () => { skipRoutine({ id: routinePrefill!.routineId!, child_id: routinePrefill!.childId, name: routinePrefill!.name ?? '', type: 'health', value: routinePrefill!.value ?? null, days_of_week: [], time: routinePrefill!.time ?? null, active: true }); closeSheet() } : undefined} />
      </LogSheet>

      <LogSheet visible={sheetType === 'mood'} title={editingLog ? 'Edit Entry' : (routinePrefill?.name ?? 'Log Mood')} onClose={closeSheet}>
        <KidsMoodForm onSaved={handleSaved} initialDate={selectedDate} prefill={routinePrefill ?? undefined} editLog={editingLog ?? undefined} onSkip={routinePrefill?.routineId ? () => { skipRoutine({ id: routinePrefill!.routineId!, child_id: routinePrefill!.childId, name: routinePrefill!.name ?? '', type: 'mood', value: routinePrefill!.value ?? null, days_of_week: [], time: routinePrefill!.time ?? null, active: true }); closeSheet() } : undefined} />
      </LogSheet>

      <LogSheet visible={sheetType === 'activity'} title={editingLog ? 'Edit Entry' : (routinePrefill?.name ?? 'Log Activity')} onClose={closeSheet}>
        <ActivityForm onSaved={handleSaved} initialDate={selectedDate} prefill={routinePrefill ?? undefined} editLog={editingLog ?? undefined} onSkip={routinePrefill?.routineId ? () => { skipRoutine({ id: routinePrefill!.routineId!, child_id: routinePrefill!.childId, name: routinePrefill!.name ?? '', type: 'activity', value: routinePrefill!.value ?? null, days_of_week: [], time: routinePrefill!.time ?? null, active: true }); closeSheet() } : undefined} />
      </LogSheet>

      <LogSheet visible={sheetType === 'memory'} title="Capture Memory" onClose={closeSheet}>
        <MemoryForm onSaved={handleSaved} initialDate={selectedDate} />
      </LogSheet>

      <LogSheet visible={sheetType === 'diaper'} title={editingLog ? 'Edit Diaper Log' : 'Log Diaper'} onClose={closeSheet}>
        <DiaperForm onSaved={handleSaved} initialDate={selectedDate} editLog={editingLog ?? undefined} />
      </LogSheet>

      {/* ─── Routine Manager ────────────────────────────────────────── */}
      <Modal
        visible={showRoutineManager}
        animationType="slide"
        transparent
        onRequestClose={() => { setShowRoutineManager(false); setRoutineEditing(null); setRoutineFilterKid(null) }}
      >
        <Pressable style={styles.popupBackdrop} onPress={() => { setShowRoutineManager(false); setRoutineEditing(null); setRoutineFilterKid(null) }} />
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
            <Pressable onPress={() => { setShowRoutineManager(false); setRoutineEditing(null); setRoutineFilterKid(null) }} style={styles.popupClose}>
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
                {['feeding', 'food', 'sleep', 'diaper', 'activity', 'mood', 'health'].map((t) => {
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
                  Active Routines ({routineFilterKid ? routines.filter((r) => r.child_id === routineFilterKid).length : routines.length})
                </Text>

                {/* Kid filter pills */}
                {children.length > 1 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 4, paddingBottom: 12 }}>
                    <Pressable
                      onPress={() => setRoutineFilterKid(null)}
                      style={[
                        styles.routineTypeChip,
                        {
                          backgroundColor: routineFilterKid === null ? colors.primary + '20' : colors.surfaceRaised,
                          borderColor: routineFilterKid === null ? colors.primary : colors.border,
                          borderRadius: radius.full,
                        },
                      ]}
                    >
                      <Text style={[styles.routineTypeText, { color: routineFilterKid === null ? colors.primary : colors.textSecondary }]}>All Kids</Text>
                    </Pressable>
                    {children.map((child, i) => {
                      const cc = childColor(i)
                      const active = routineFilterKid === child.id
                      return (
                        <Pressable
                          key={child.id}
                          onPress={() => setRoutineFilterKid(active ? null : child.id)}
                          style={[
                            styles.routineTypeChip,
                            {
                              backgroundColor: active ? cc + '20' : colors.surfaceRaised,
                              borderColor: active ? cc : colors.border,
                              borderRadius: radius.full,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 5,
                            },
                          ]}
                        >
                          <View style={[styles.childDot, { backgroundColor: cc, width: 7, height: 7 }]} />
                          <Text style={[styles.routineTypeText, { color: active ? cc : colors.textSecondary }]}>{child.name}</Text>
                        </Pressable>
                      )
                    })}
                  </ScrollView>
                )}

                {(routineFilterKid ? routines.filter((r) => r.child_id === routineFilterKid) : routines).map((r) => {
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
                    {formatDayLabel(selectedLog.date, todayStr)} at {activityTimeDisplay(selectedLog)}
                  </Text>
                </View>

                {/* Logged by */}
                {selectedLog.logged_by && profileNames[selectedLog.logged_by] && (
                  <View style={[styles.popupRow, { backgroundColor: colors.surface, borderRadius: radius.lg }]}>
                    <CheckCircle2 size={16} color={brand.success} strokeWidth={2} />
                    <Text style={[styles.popupRowText, { color: colors.textSecondary }]}>
                      Logged by <Text style={{ color: colors.text, fontWeight: '600' }}>{profileNames[selectedLog.logged_by]}</Text>
                    </Text>
                  </View>
                )}

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
                        ate_well: { label: '😊 Ate well', color: '#A2FF86' },
                        ate_little: { label: '😐 Ate a little', color: '#F4FD50' },
                        did_not_eat: { label: '😔 Did not eat', color: '#FF6B6B' },
                      }
                      const quality = fp.quality ? qualityMap[fp.quality] : null
                      return (
                        <>
                          {/* Calorie hero */}
                          {cals !== null && (
                            <View style={{ backgroundColor: '#FF6B3515', borderRadius: 24, paddingVertical: 24, paddingHorizontal: 20, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#FF6B3530' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
                                <Text style={{ color: '#FF6B35', fontSize: 64, fontWeight: '800', lineHeight: 68, letterSpacing: -2 }}>{cals}</Text>
                                <Text style={{ color: '#FF6B35', fontSize: 20, fontWeight: '700', marginBottom: 10 }}>kcal</Text>
                              </View>
                              <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 4, letterSpacing: 1, textTransform: 'uppercase' }}>Estimated calories</Text>
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
                                <View style={{ backgroundColor: '#FF6B3520', borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8 }}>
                                  <Text style={{ color: '#FF6B35', fontSize: 13, fontWeight: '700' }}>{mealName}</Text>
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
                              <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>What they ate</Text>
                              <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22 }}>{selectedLog.notes}</Text>
                            </View>
                          )}

                          {/* New food badge */}
                          {fp.isNewFood && (
                            <View style={{ backgroundColor: '#B983FF15', borderRadius: 18, padding: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#B983FF30' }}>
                              <Sparkles size={18} color="#B983FF" />
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: '#B983FF', fontSize: 13, fontWeight: '700' }}>New food introduced!</Text>
                                {fp.newFoodName && <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{fp.newFoodName}</Text>}
                              </View>
                            </View>
                          )}

                          {/* Reaction alert */}
                          {fp.hasReaction && (
                            <View style={{ backgroundColor: '#FF6B6B15', borderRadius: 18, padding: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#FF6B6B30' }}>
                              <AlertCircle size={18} color="#FF6B6B" />
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: '#FF6B6B', fontSize: 13, fontWeight: '700' }}>Reaction noted</Text>
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
                      const accentColor = '#FF8AD8'
                      return (
                        <>
                          <View style={{ backgroundColor: accentColor + '15', borderRadius: 24, paddingVertical: 24, paddingHorizontal: 20, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: accentColor + '30' }}>
                            {isBreast ? (
                              <>
                                <Text style={{ color: accentColor, fontSize: 48, fontWeight: '800', lineHeight: 52 }}>{fp.duration ? `${fp.duration}` : '—'}</Text>
                                <Text style={{ color: accentColor, fontSize: 16, fontWeight: '700', marginTop: 2 }}>minutes</Text>
                                <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 6, letterSpacing: 1, textTransform: 'uppercase' }}>Breastfeeding</Text>
                              </>
                            ) : (
                              <>
                                <Text style={{ color: accentColor, fontSize: 48, fontWeight: '800', lineHeight: 52 }}>{fp.amount ? `${fp.amount}` : '—'}</Text>
                                <Text style={{ color: accentColor, fontSize: 16, fontWeight: '700', marginTop: 2 }}>ml</Text>
                                <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 6, letterSpacing: 1, textTransform: 'uppercase' }}>Bottle feeding</Text>
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
                              <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>Notes</Text>
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
                      const sleepColor = '#B983FF'
                      const durNum = sp.duration ? String(sp.duration).replace(/[^\d.]/g, '') : null
                      const qualityMap: Record<string, { emoji: string; color: string }> = {
                        great:    { emoji: '😴', color: '#A2FF86' },
                        good:     { emoji: '😊', color: '#4D96FF' },
                        restless: { emoji: '😤', color: '#F4FD50' },
                        poor:     { emoji: '😞', color: '#FF6B35' },
                      }
                      const q = sp.quality ? qualityMap[sp.quality.toLowerCase()] ?? null : null
                      return (
                        <>
                          <View style={{ backgroundColor: sleepColor + '15', borderRadius: 24, paddingVertical: 24, paddingHorizontal: 20, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: sleepColor + '30' }}>
                            <Text style={{ fontSize: 52, lineHeight: 56 }}>🌙</Text>
                            {durNum ? (
                              <>
                                <Text style={{ color: sleepColor, fontSize: 56, fontWeight: '800', lineHeight: 64, letterSpacing: -2, marginTop: 6 }}>{durNum}</Text>
                                <Text style={{ color: sleepColor, fontSize: 16, fontWeight: '700', marginTop: 2 }}>hours</Text>
                              </>
                            ) : (
                              <Text style={{ color: sleepColor, fontSize: 20, fontWeight: '700', marginTop: 8 }}>Sleep logged</Text>
                            )}
                            <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 6, letterSpacing: 1, textTransform: 'uppercase' }}>Sleep session</Text>
                          </View>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                            {sp.startTime && sp.endTime && (
                              <View style={{ backgroundColor: colors.surface, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Clock size={13} color={colors.textMuted} />
                                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{fmtTime(sp.startTime)} – {fmtTime(sp.endTime)}</Text>
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
                      const actColor = '#A2FF86'
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
                              <Text style={{ color: actColor, fontSize: 26, fontWeight: '800', marginTop: 10, textAlign: 'center' }}>{ap.name}</Text>
                            ) : null}
                            {durUnit && (
                              <>
                                <Text style={{ color: actColor, fontSize: 20, fontWeight: '700', marginTop: ap.name ? 4 : 10 }}>{durUnit}</Text>
                              </>
                            )}
                            <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 6, letterSpacing: 1, textTransform: 'uppercase' }}>Activity</Text>
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
                                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{fmtTime(ap.startTime)} – {fmtTime(ap.endTime)}</Text>
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
                      const diaperColor = '#4D96FF'
                      const typeMap: Record<string, { emoji: string; label: string }> = {
                        pee:   { emoji: '💧', label: 'Pee' },
                        poop:  { emoji: '💩', label: 'Poop' },
                        mixed: { emoji: '🔄', label: 'Both' },
                      }
                      const dt = dp.diaperType ? (typeMap[dp.diaperType] ?? { emoji: '🍼', label: dp.diaperType }) : null
                      return (
                        <>
                          <View style={{ backgroundColor: diaperColor + '12', borderRadius: 24, paddingVertical: 24, paddingHorizontal: 20, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: diaperColor + '30' }}>
                            <Text style={{ fontSize: 64, lineHeight: 68 }}>{dt?.emoji ?? '🍼'}</Text>
                            <Text style={{ color: diaperColor, fontSize: 24, fontWeight: '800', marginTop: 8 }}>{dt?.label ?? 'Diaper'}</Text>
                            <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 6, letterSpacing: 1, textTransform: 'uppercase' }}>Diaper change</Text>
                          </View>
                          {(dp.color || dp.consistency) && (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                              {dp.color && (
                                <View style={{ backgroundColor: colors.surface, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8 }}>
                                  <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>Color: {dp.color.charAt(0).toUpperCase() + dp.color.slice(1)}</Text>
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
                      const moodVal = selectedLog.value ?? ''
                      const moodMap: Record<string, { emoji: string; label: string; color: string }> = {
                        happy:     { emoji: '😄', label: 'Happy',     color: '#A2FF86' },
                        calm:      { emoji: '😌', label: 'Calm',      color: '#4D96FF' },
                        fussy:     { emoji: '😤', label: 'Fussy',     color: '#F4FD50' },
                        cranky:    { emoji: '😠', label: 'Cranky',    color: '#FF6B35' },
                        energetic: { emoji: '⚡', label: 'Energetic', color: '#B983FF' },
                      }
                      const m = moodMap[moodVal] ?? { emoji: '🙂', label: moodVal, color: brand.accent }
                      return (
                        <View style={{ backgroundColor: m.color + '12', borderRadius: 24, paddingVertical: 32, paddingHorizontal: 20, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: m.color + '30' }}>
                          <Text style={{ fontSize: 72, lineHeight: 80 }}>{m.emoji}</Text>
                          <Text style={{ color: m.color, fontSize: 32, fontWeight: '800', marginTop: 10, letterSpacing: -1 }}>{m.label}</Text>
                          <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 8, letterSpacing: 1, textTransform: 'uppercase' }}>Today's mood</Text>
                        </View>
                      )
                    })()}

                    {/* ── Health / Temperature / Vaccine / Medicine ── */}
                    {['health', 'temperature', 'vaccine', 'medicine', 'note'].includes(selectedLog.type) && (() => {
                      const healthColor = brand.error
                      const typeEmojiMap: Record<string, string> = {
                        temperature: '🌡️', vaccine: '💉', medicine: '💊', health: '❤️', note: '📝',
                      }
                      const emoji = typeEmojiMap[selectedLog.type] ?? '❤️'
                      const rawVal = selectedLog.value ?? ''
                      let displayVal = rawVal
                      try {
                        const p = JSON.parse(rawVal)
                        if (typeof p === 'object') displayVal = p.value ?? p.name ?? rawVal
                      } catch {}
                      return (
                        <>
                          <View style={{ backgroundColor: healthColor + '12', borderRadius: 24, paddingVertical: 24, paddingHorizontal: 20, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: healthColor + '30' }}>
                            <Text style={{ fontSize: 52, lineHeight: 56 }}>{emoji}</Text>
                            {displayVal && displayVal !== selectedLog.type ? (
                              <Text style={{ color: healthColor, fontSize: 32, fontWeight: '800', marginTop: 10, textAlign: 'center', letterSpacing: -1 }}>{displayVal}</Text>
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
                        <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>Notes</Text>
                        <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22 }}>{selectedLog.notes}</Text>
                      </View>
                    )}

                    {/* Fallback for unknown types */}
                    {!['food', 'feeding', 'sleep', 'activity', 'diaper', 'mood', 'health', 'temperature', 'vaccine', 'medicine', 'note'].includes(selectedLog.type) && (
                      <>
                        {formatLogDisplay(selectedLog.type, selectedLog.value, null) !== '' && (
                          <View style={[styles.popupSection, { backgroundColor: colors.surface, borderRadius: radius.lg }]}>
                            <Text style={[styles.popupSectionLabel, { color: colors.textMuted }]}>Details</Text>
                            <Text style={[styles.popupSectionValue, { color: colors.text }]}>
                              {formatLogDisplay(selectedLog.type, selectedLog.value, null)}
                            </Text>
                          </View>
                        )}
                      </>
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

      {/* ── Unlog Confirmation Modal ── */}
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
                    Remove this logged activity? This cannot be undone.
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Pressable
                      onPress={() => setUnlogTarget(null)}
                      style={{ flex: 1, height: 52, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ color: colors.textSecondary, fontSize: 15, fontWeight: '700' }}>Cancel</Text>
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
                        : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Trash2 size={15} color="#FFF" strokeWidth={2.5} /><Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>Unlog</Text></View>}
                    </Pressable>
                  </View>
                </>
              )
            })()}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Day Complete Congrats Modal ── */}
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
                <Text style={{ fontSize: 40 }}>🌟</Text>
              </View>

              <Text style={{ color: brand.accent, fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginBottom: 8, textAlign: 'center' }}>
                Amazing job!
              </Text>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 6 }}>
                {formatDayLabel(selectedDate, todayStr)}'s activities are all logged ✓
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
                      <Text style={{ color: brand.accent, fontSize: 28, fontWeight: '800' }}>{loggedToday.length}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>Activities</Text>
                    </View>
                    {totalCals > 0 && (
                      <View style={{ flex: 1, backgroundColor: colors.bg, borderRadius: 20, padding: 16, alignItems: 'center' }}>
                        <Text style={{ color: '#FF6B35', fontSize: 28, fontWeight: '800' }}>{totalCals}</Text>
                        <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>kcal today</Text>
                      </View>
                    )}
                    <View style={{ flex: 1, backgroundColor: colors.bg, borderRadius: 20, padding: 16, alignItems: 'center' }}>
                      <Text style={{ color: '#A2FF86', fontSize: 28, fontWeight: '800' }}>{selectedDayRoutines.length > 0 ? selectedDayRoutines.length : loggedToday.length}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>Routines</Text>
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
                <Text style={{ color: '#1A1030', fontSize: 16, fontWeight: '800' }}>Awesome! 🎉</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
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
