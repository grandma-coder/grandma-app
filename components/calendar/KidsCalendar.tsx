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
}

const QUICK_LOGS: { id: LogType; label: string; icon: typeof Utensils; color: string }[] = [
  { id: 'feeding', label: 'Feeding', icon: Utensils, color: brand.kids },
  { id: 'sleep', label: 'Sleep', icon: Moon, color: brand.pregnancy },
  { id: 'health', label: 'Health', icon: Heart, color: brand.error },
  { id: 'activity', label: 'Activity', icon: Dumbbell, color: brand.phase.ovulation },
  { id: 'mood', label: 'Mood', icon: Smile, color: brand.accent },
  { id: 'memory', label: 'Memory', icon: Camera, color: brand.phase.ovulation },
]

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
          if (parsed.feedType) parts.push(parsed.feedType === 'breast' ? 'Breastfed' : 'Bottle')
          if (parsed.duration) {
            const d = stripUnit(String(parsed.duration), ['min', 'mins', 'minutes', 'm'])
            parts.push(`${d} min`)
          }
          if (parsed.amount) {
            const a = stripUnit(String(parsed.amount), ['ml', 'oz'])
            parts.push(`${a} ml`)
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

function FabWithSheet({ onSelect }: { onSelect: (type: LogType) => void }) {
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

  // Real data from Supabase
  const [monthLogs, setMonthLogs] = useState<ChildLog[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedLog, setSelectedLog] = useState<ChildLog | null>(null)

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

  function handleSaved() {
    setSheetType(null)
    fetchLogs()
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

  const childIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    children.forEach((c, i) => map.set(c.id, i))
    return map
  }, [children])

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

            {/* 4. Day Detail Panel */}
            <View style={[styles.dayDetailPanel, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
              <View style={styles.dayDetailHeader}>
                <View style={styles.dayDetailTitleRow}>
                  <Calendar size={16} color={colors.primary} strokeWidth={2} />
                  <Text style={[styles.dayDetailTitle, { color: colors.text }]}>
                    {formatDayLabel(selectedDate, todayStr)}
                  </Text>
                </View>
                <Text style={[styles.dayDetailCount, { color: colors.textMuted }]}>
                  {selectedDayLogs.length} {selectedDayLogs.length === 1 ? 'activity' : 'activities'}
                </Text>
              </View>

              {selectedDayLogs.length === 0 ? (
                <View style={styles.emptyDay}>
                  <Text style={[styles.emptyDayText, { color: colors.textMuted }]}>
                    No activities logged
                  </Text>
                  <Text style={[styles.emptyDayHint, { color: colors.textMuted }]}>
                    Tap + to add one
                  </Text>
                </View>
              ) : (
                <View style={styles.dayLogList}>
                  {selectedDayLogs.map((log) => {
                    const meta = LOG_META[log.type] ?? { label: log.type, icon: Calendar, color: colors.textMuted }
                    const Icon = meta.icon
                    const logChildName = children.find((c) => c.id === log.child_id)?.name
                    const ci = childIndexMap.get(log.child_id) ?? 0
                    return (
                      <Pressable
                        key={log.id}
                        onPress={() => { setSelectedLog(log); setEditing(false) }}
                        style={({ pressed }) => [
                          styles.dayLogItem,
                          { borderColor: colors.border },
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <View style={[styles.dayLogIcon, { backgroundColor: meta.color + '15' }]}>
                          <Icon size={16} color={meta.color} strokeWidth={2} />
                        </View>
                        <View style={styles.dayLogContent}>
                          <Text style={[styles.dayLogType, { color: colors.text }]}>
                            {meta.label}
                          </Text>
                          {formatLogDisplay(log.type, log.value, log.notes) !== '' && (
                            <Text style={[styles.dayLogDetail, { color: colors.textSecondary }]} numberOfLines={2}>
                              {formatLogDisplay(log.type, log.value, log.notes)}
                            </Text>
                          )}
                        </View>
                        <View style={styles.dayLogMeta}>
                          <Text style={[styles.dayLogTime, { color: colors.textMuted }]}>
                            {formatTime(log.created_at)}
                          </Text>
                          {selectedChildId === 'all' && logChildName && (
                            <View style={[styles.dayLogChildTag, { backgroundColor: childColor(ci) + '15' }]}>
                              <Text style={[styles.dayLogChildName, { color: childColor(ci) }]}>
                                {logChildName}
                              </Text>
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

            {/* Next Event Banner */}
            {nextEvent && (
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
      <FabWithSheet onSelect={(type) => setSheetType(type)} />

      {/* ─── Bottom Sheets ────────────────────────────────────────────── */}

      <LogSheet visible={sheetType === 'feeding'} title="Log Feeding" onClose={() => setSheetType(null)}>
        <FeedingForm onSaved={handleSaved} initialDate={selectedDate} />
      </LogSheet>

      <LogSheet visible={sheetType === 'sleep'} title="Log Sleep" onClose={() => setSheetType(null)}>
        <SleepForm onSaved={handleSaved} initialDate={selectedDate} />
      </LogSheet>

      <LogSheet visible={sheetType === 'health'} title="Log Health Event" onClose={() => setSheetType(null)}>
        <HealthEventForm onSaved={handleSaved} initialDate={selectedDate} />
      </LogSheet>

      <LogSheet visible={sheetType === 'mood'} title="Log Mood" onClose={() => setSheetType(null)}>
        <KidsMoodForm onSaved={handleSaved} initialDate={selectedDate} />
      </LogSheet>

      <LogSheet visible={sheetType === 'activity'} title="Log Activity" onClose={() => setSheetType(null)}>
        <ActivityForm onSaved={handleSaved} initialDate={selectedDate} />
      </LogSheet>

      <LogSheet visible={sheetType === 'memory'} title="Capture Memory" onClose={() => setSheetType(null)}>
        <MemoryForm onSaved={handleSaved} initialDate={selectedDate} />
      </LogSheet>

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
  dayLogList: { gap: 10 },
  dayLogItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  dayLogIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
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
