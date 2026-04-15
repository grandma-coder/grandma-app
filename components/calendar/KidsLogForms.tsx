/**
 * Kids Log Forms — 5 bottom sheet forms for child activity tracking.
 *
 * Forms: Feeding/Food (complex), Sleep, Health Event, Mood, Memory
 * Persist to Supabase child_logs table.
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  Alert,
  Modal,
  ScrollView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Vibration,
  AppState,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import DateTimePicker from '@react-native-community/datetimepicker'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import {
  Utensils,
  Moon,
  Heart,
  Smile,
  Frown,
  Meh,
  Laugh,
  Zap,
  Camera,
  Plus,
  Check,
  Baby,
  AlertTriangle,
  CalendarDays,
  Clock,
  Dumbbell,
  Repeat,
  MinusCircle,
  Sparkles,
  ScanLine,
  X,
} from 'lucide-react-native'
import { useTheme, brand } from '../../constants/theme'
import { useChildStore } from '../../store/useChildStore'
import { supabase } from '../../lib/supabase'
import { estimateCalories, matchSingleTag, categoryColor } from '../../lib/foodCalories'
import type { CalorieMatch } from '../../lib/foodCalories'
import { estimateFromText, estimateFromImage, type AiFoodItem } from '../../lib/foodAi'
import type { ChildWithRole } from '../../types'

// ─── Routine Prefill type ─────────────────────────────────────────────────

export interface RoutinePrefill {
  routineId?: string
  childId: string
  time?: string   // 'HH:MM'
  value?: string  // JSON string matching the routine's stored value
  name?: string
}

// ─── Edit Log type (minimal shape for editing an existing child_log) ──────

export interface EditLog {
  id: string
  child_id: string
  date: string
  type: string
  value: string | null
  notes: string | null
  photos: string[]
}

// ─── Routine tag helper ────────────────────────────────────────────────────
// Stamps routineId/routineName onto a JSON value string so the log carries
// identity back to the routine that produced it. Enables reliable dedup in the
// calendar and lets logged cards display the routine name (e.g. "Breakfast")
// instead of the generic log-type label (e.g. "Food").
function tagWithRoutine(value: string | undefined, prefill?: RoutinePrefill): string | undefined {
  if (!prefill?.routineId) return value
  try {
    const obj = value ? JSON.parse(value) : {}
    if (typeof obj !== 'object' || obj === null) return value
    return JSON.stringify({ ...obj, routineId: prefill.routineId, routineName: prefill.name ?? undefined })
  } catch {
    return value
  }
}

// ─── Stabilise a picked image ─────────────────────────────────────────────
// iOS image picker URIs (ph://) can become unreadable once the picker closes.
// Run the image through expo-image-manipulator immediately to copy it to a
// stable file:// path and compress to < 1 MB (per project rules).

async function stabiliseUri(uri: string): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1200 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
    )
    return result.uri
  } catch {
    // If manipulate fails, return original and let upload handle it
    return uri
  }
}

// ─── Photo upload helper ───────────────────────────────────────────────────

async function uploadPhotos(uris: string[]): Promise<string[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session || uris.length === 0) return []

  const publicUrls: string[] = []
  for (const uri of uris) {
    try {
      const path = `kids-logs/${session.user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`
      const formData = new FormData()
      formData.append('', { uri, name: path.split('/').pop(), type: 'image/jpeg' } as any)
      const { error } = await supabase.storage
        .from('garage-photos')
        .upload(path, formData, { contentType: 'multipart/form-data', upsert: true })
      if (!error) {
        const { data: urlData } = supabase.storage.from('garage-photos').getPublicUrl(path)
        publicUrls.push(urlData.publicUrl)
      }
    } catch {}
  }
  return publicUrls
}

// ─── Safe camera launcher ─────────────────────────────────────────────────

async function launchCameraSafe(): Promise<string | null> {
  try {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Camera access is required')
      return null
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 })
    if (!result.canceled && result.assets[0]) {
      return stabiliseUri(result.assets[0].uri)
    }
  } catch {
    Alert.alert('Camera unavailable', 'Please use the gallery to pick a photo instead.')
  }
  return null
}

// ─── Shared save helper ────────────────────────────────────────────────────

async function saveChildLog(
  childId: string,
  type: string,
  value?: string,
  notes?: string,
  photos?: string[],
  date?: string
) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const { data: child } = await supabase
    .from('children')
    .select('user_id')
    .eq('id', childId)
    .single()

  const { error } = await supabase.from('child_logs').insert({
    child_id: childId,
    user_id: child?.user_id ?? session.user.id,
    date: date ?? toDateStr(new Date()),
    type,
    value: value ?? null,
    notes: notes ?? null,
    photos: photos ?? [],
    logged_by: session.user.id,
  })
  if (error) throw error
}

async function updateChildLog(
  id: string,
  value?: string | null,
  notes?: string | null,
  photos?: string[]
) {
  const { error } = await supabase
    .from('child_logs')
    .update({ value: value ?? null, notes: notes ?? null, ...(photos ? { photos } : {}) })
    .eq('id', id)
  if (error) throw error
}

// ─── Save as Routine helper ────────────────────────────────────────────────

async function saveAsRoutine(
  childId: string,
  type: string,
  name: string,
  value: string | null,
  time: string | null,
  daysOfWeek: number[] = [0, 1, 2, 3, 4, 5, 6],
) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return
  await supabase.from('child_routines').insert({
    child_id: childId,
    user_id: session.user.id,
    type,
    name,
    value,
    time,
    days_of_week: daysOfWeek,
    active: true,
  })
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function RoutineToggle({
  enabled,
  onToggle,
  days,
  onDaysChange,
  locked,
}: {
  enabled: boolean
  onToggle: (v: boolean) => void
  days: number[]
  onDaysChange: (d: number[]) => void
  locked?: boolean
}) {
  const { colors, radius } = useTheme()
  if (locked) {
    return (
      <View style={[routineStyles.toggleRow, { backgroundColor: brand.success + '12', borderColor: brand.success + '40', borderRadius: radius.lg }]}>
        <Repeat size={16} color={brand.success} strokeWidth={2} />
        <Text style={[routineStyles.toggleText, { color: brand.success }]}>Already a routine</Text>
        <Check size={16} color={brand.success} strokeWidth={2.5} />
      </View>
    )
  }
  return (
    <View style={routineStyles.wrap}>
      <Pressable
        onPress={() => onToggle(!enabled)}
        style={[
          routineStyles.toggleRow,
          {
            backgroundColor: enabled ? colors.primary + '12' : colors.surface,
            borderColor: enabled ? colors.primary + '40' : colors.border,
            borderRadius: radius.lg,
          },
        ]}
      >
        <Repeat size={16} color={enabled ? colors.primary : colors.textMuted} strokeWidth={2} />
        <Text style={[routineStyles.toggleText, { color: enabled ? colors.primary : colors.textSecondary }]}>
          Save as routine
        </Text>
        <View
          style={[
            routineStyles.toggleSwitch,
            {
              backgroundColor: enabled ? colors.primary : colors.border,
              borderRadius: 10,
            },
          ]}
        >
          <View
            style={[
              routineStyles.toggleKnob,
              { transform: [{ translateX: enabled ? 14 : 0 }] },
            ]}
          />
        </View>
      </Pressable>
      {enabled && (
        <View style={routineStyles.daysRow}>
          {DAY_LABELS.map((label, i) => {
            const active = days.includes(i)
            return (
              <Pressable
                key={i}
                onPress={() =>
                  onDaysChange(active ? days.filter((d) => d !== i) : [...days, i].sort())
                }
                style={[
                  routineStyles.dayChip,
                  {
                    backgroundColor: active ? colors.primary : 'transparent',
                    borderColor: active ? colors.primary : colors.border,
                    borderRadius: radius.full,
                  },
                ]}
              >
                <Text style={[routineStyles.dayText, { color: active ? '#FFF' : colors.textMuted }]}>
                  {label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      )}
    </View>
  )
}

const routineStyles = StyleSheet.create({
  wrap: { gap: 8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1 },
  toggleText: { flex: 1, fontSize: 14, fontWeight: '600' },
  toggleSwitch: { width: 34, height: 20, padding: 3, justifyContent: 'center' },
  toggleKnob: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#FFF' },
  daysRow: { flexDirection: 'row', gap: 6, justifyContent: 'space-between', paddingHorizontal: 4 },
  dayChip: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  dayText: { fontSize: 12, fontWeight: '700' },
})

// ─── Child Selector (shared) ───────────────────────────────────────────────

function ChildSelector({
  selected,
  onSelect,
}: {
  selected: string | null
  onSelect: (id: string) => void
}) {
  const { colors, radius } = useTheme()
  const children = useChildStore((s) => s.children)

  if (children.length <= 1) return null

  const needsSelection = !selected

  return (
    <View style={styles.childSelectorWrap}>
      {needsSelection && (
        <Text style={[styles.childSelectorPrompt, { color: brand.accent }]}>
          Select a child to continue
        </Text>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.childRow}>
        {children.map((c) => {
          const active = selected === c.id
          return (
            <Pressable
              key={c.id}
              onPress={() => onSelect(c.id)}
              style={[
                styles.childChip,
                {
                  backgroundColor: active ? colors.primaryTint : colors.surface,
                  borderColor: active ? colors.primary : needsSelection ? brand.accent + '40' : colors.border,
                  borderRadius: radius.full,
                },
              ]}
            >
              <Text style={[styles.childChipText, { color: active ? colors.primary : colors.text }]}>
                {c.name}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

// ─── Date Picker Chip (shared) ────────────────────────────────────────────

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDateLabel(dateStr: string): string {
  const today = toDateStr(new Date())
  if (dateStr === today) return 'Today'
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (dateStr === toDateStr(yesterday)) return 'Yesterday'
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function DateChip({
  value,
  onChange,
}: {
  value: string
  onChange: (dateStr: string) => void
}) {
  const { colors, radius } = useTheme()
  const [showPicker, setShowPicker] = useState(false)
  const [tempDate, setTempDate] = useState(value)

  function openPicker() {
    setTempDate(value)
    setShowPicker(true)
  }

  function confirmDate() {
    onChange(tempDate)
    setShowPicker(false)
  }

  return (
    <View>
      <Pressable
        onPress={openPicker}
        style={[styles.dateChip, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.full }]}
      >
        <CalendarDays size={14} color={colors.primary} strokeWidth={2} />
        <Text style={[styles.dateChipText, { color: colors.primary }]}>
          {formatDateLabel(value)}
        </Text>
      </Pressable>
      {showPicker && (
        <View style={[styles.datePickerWrap, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
          <DateTimePicker
            value={new Date((showPicker ? tempDate : value) + 'T12:00:00')}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()}
            themeVariant="dark"
            onChange={(e, d) => {
              if (Platform.OS === 'android') {
                setShowPicker(false)
                if (e.type === 'set' && d) onChange(toDateStr(d))
              } else {
                if (d) setTempDate(toDateStr(d))
              }
              if (e.type === 'dismissed') setShowPicker(false)
            }}
          />
          {Platform.OS === 'ios' && (
            <Pressable onPress={confirmDate} style={[styles.datePickerDone, { borderColor: colors.border }]}>
              <Text style={[styles.datePickerDoneText, { color: colors.primary }]}>Done</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  )
}

// ─── Time Picker Chip (shared) ────────────────────────────────────────────

function toTimeStr(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatTimeLabel(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

function TimeChip({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (timeStr: string) => void
  label: string
}) {
  const { colors, radius } = useTheme()
  const [showPicker, setShowPicker] = useState(false)
  // Local temp value so iOS spinner doesn't fight with parent state
  const [tempTime, setTempTime] = useState(value)

  function openPicker() {
    setTempTime(value)
    setShowPicker(true)
  }

  function confirmTime() {
    onChange(tempTime)
    setShowPicker(false)
  }

  const dateVal = useMemo(() => {
    const d = new Date()
    const [h, m] = (showPicker ? tempTime : value).split(':').map(Number)
    d.setHours(h, m, 0, 0)
    return d
  }, [showPicker ? tempTime : value])

  return (
    <View>
      <Pressable
        onPress={openPicker}
        style={[styles.timeChip, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.full }]}
      >
        <Clock size={12} color={colors.textSecondary} strokeWidth={2} />
        <Text style={[styles.timeChipLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.timeChipValue, { color: colors.text }]}>{formatTimeLabel(value)}</Text>
      </Pressable>
      {showPicker && (
        <View style={[styles.datePickerWrap, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
          <DateTimePicker
            value={dateVal}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            themeVariant="dark"
            minuteInterval={5}
            onChange={(e, d) => {
              if (Platform.OS === 'android') {
                setShowPicker(false)
                if (e.type === 'set' && d) onChange(toTimeStr(d))
              } else {
                // iOS: just update local temp, don't commit yet
                if (d) setTempTime(toTimeStr(d))
              }
              if (e.type === 'dismissed') setShowPicker(false)
            }}
          />
          {Platform.OS === 'ios' && (
            <Pressable onPress={confirmTime} style={[styles.datePickerDone, { borderColor: colors.border }]}>
              <Text style={[styles.datePickerDoneText, { color: colors.primary }]}>Done</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  )
}

// ─── Duration calculator from start/end time ──────────────────────────────

function calcDuration(start: string, end: string): string {
  if (!start || !end) return ''
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins <= 0) mins += 24 * 60 // overnight
  if (mins >= 60) {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  return `${mins}m`
}

// ─── 1. FEEDING / FOOD LOG FORM ────────────────────────────────────────────

type FeedingType = 'breast' | 'bottle' | 'solids'
type MealMoment = 'breakfast' | 'morning_snack' | 'lunch' | 'afternoon_snack' | 'dinner' | 'night_snack'
type EatQuality = 'ate_well' | 'ate_little' | 'did_not_eat'

const MEAL_MOMENTS: { id: MealMoment; label: string }[] = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'morning_snack', label: 'AM Snack' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'afternoon_snack', label: 'PM Snack' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'night_snack', label: 'Night' },
]

const EAT_QUALITIES: { id: EatQuality; label: string; icon: typeof Smile; color: string }[] = [
  { id: 'ate_well', label: 'Ate well', icon: Laugh, color: brand.success },
  { id: 'ate_little', label: 'Ate a little', icon: Meh, color: brand.accent },
  { id: 'did_not_eat', label: 'Did not eat', icon: Frown, color: brand.error },
]

export function FeedingForm({ onSaved, initialDate, prefill, onSkip, editLog }: { onSaved: () => void; initialDate?: string; prefill?: RoutinePrefill; onSkip?: () => void; editLog?: EditLog }) {
  const { colors, radius } = useTheme()
  const children = useChildStore((s) => s.children)
  const activeChild = useChildStore((s) => s.activeChild)

  const [childId, setChildId] = useState(children.length <= 1 ? (children[0]?.id ?? '') : '')
  const [logDate, setLogDate] = useState(initialDate ?? toDateStr(new Date()))
  // Seed startTime directly from prefill so the activity time is the routine's time, not "now"
  const [startTime, setStartTime] = useState(() => prefill?.time ?? toTimeStr(new Date()))
  const [feedType, setFeedType] = useState<FeedingType>('solids')
  const [meal, setMeal] = useState<MealMoment | null>(null)
  const [photos, setPhotos] = useState<string[]>([])
  const [foodTags, setFoodTags] = useState<{ name: string; match: CalorieMatch | null; manualCals: number | null }[]>([])
  const [foodInput, setFoodInput] = useState('')
  const [manualCalIdx, setManualCalIdx] = useState<number | null>(null)
  const [manualCalInput, setManualCalInput] = useState('')
  const [quality, setQuality] = useState<EatQuality | null>(null)
  const [isNewFood, setIsNewFood] = useState(false)
  const [newFoodName, setNewFoodName] = useState('')
  const [hasReaction, setHasReaction] = useState(false)
  const [reactionFood, setReactionFood] = useState('')
  const [reactionDesc, setReactionDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [routineEnabled, setRoutineEnabled] = useState(false)
  const [routineDays, setRoutineDays] = useState([0, 1, 2, 3, 4, 5, 6])

  // Breast fields
  const [duration, setDuration] = useState('')
  const [breastSide, setBreastSide] = useState<'left' | 'right' | 'both' | null>(null)
  const [lastSide, setLastSide] = useState<string | null>(null)
  const [lastSideLoading, setLastSideLoading] = useState(false)

  // Live timer state
  const [timerActive, setTimerActive] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [timerSide, setTimerSide] = useState<'left' | 'right'>('left')
  const [timerSwitched, setTimerSwitched] = useState(false)
  const [switchAlertShown, setSwitchAlertShown] = useState(false)
  const [switchTargetMin, setSwitchTargetMin] = useState(15)  // default 15 min per side
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerStartRef = useRef<number>(0)
  // Track left/right durations separately
  const [leftSeconds, setLeftSeconds] = useState(0)
  const [rightSeconds, setRightSeconds] = useState(0)

  // Bottle fields
  const [amount, setAmount] = useState('')

  // AI enrichment state — tracks tags currently being estimated by the backend
  // (for unknown foods not in local FOOD_DB) + plate-photo scanning
  const [aiLoadingIdx, setAiLoadingIdx] = useState<Set<number>>(new Set())
  const [scanningPlate, setScanningPlate] = useState(false)

  // Derive child age in months for AI context — improves portion estimation
  const childAgeMonths = useMemo(() => {
    const c = children.find((x) => x.id === childId) ?? activeChild
    if (!c?.birthDate) return undefined
    const d = new Date(c.birthDate)
    if (isNaN(d.getTime())) return undefined
    const now = new Date()
    return Math.max(0, (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth()))
  }, [children, childId, activeChild])

  // Apply routine prefill when it changes
  useEffect(() => {
    setRoutineEnabled(!!prefill)
    if (!prefill) return
    if (prefill.childId) setChildId(prefill.childId)
    if (prefill.time) setStartTime(prefill.time)
    if (prefill.value) {
      try {
        const p = JSON.parse(prefill.value)
        if (p.feedType) setFeedType(p.feedType as FeedingType)
        if (p.meal) setMeal(p.meal as MealMoment)
        if (p.quality) setQuality(p.quality as EatQuality)
        if (p.amount) setAmount(String(p.amount))
        if (p.side) setBreastSide(p.side)
      } catch {}
    }
  }, [prefill])

  // Apply editLog when opening in edit mode
  useEffect(() => {
    if (!editLog) return
    setChildId(editLog.child_id)
    setLogDate(editLog.date)
    if (editLog.notes) setFoodTags(
      editLog.notes.split(',').map((s) => s.trim()).filter(Boolean).map((name) => ({ name, match: matchSingleTag(name), manualCals: null }))
    )
    if (editLog.photos?.length) setPhotos(editLog.photos)
    try {
      const p = JSON.parse(editLog.value ?? '{}')
      if (p.feedType) setFeedType(p.feedType as FeedingType)
      if (p.meal) setMeal(p.meal as MealMoment)
      if (p.quality) setQuality(p.quality as EatQuality)
      if (p.amount) setAmount(String(p.amount))
      if (p.side) setBreastSide(p.side)
      if (p.duration) setDuration(String(p.duration))
      if (p.time) setStartTime(p.time)
    } catch {}
  }, [editLog?.id])

  // Fetch last breast side for this child
  useEffect(() => {
    if (feedType !== 'breast' || !childId) { setLastSide(null); return }
    setLastSideLoading(true)
    supabase
      .from('child_logs')
      .select('value')
      .eq('child_id', childId)
      .eq('type', 'feeding')
      .like('value', '%breast%')
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data[0]?.value) {
          try {
            const parsed = JSON.parse(data[0].value)
            if (parsed.side) setLastSide(parsed.side)
            else setLastSide(null)
          } catch { setLastSide(null) }
        } else {
          setLastSide(null)
        }
        setLastSideLoading(false)
      })
  }, [feedType, childId])

  // Timer tick
  useEffect(() => {
    if (!timerActive) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      return
    }
    timerStartRef.current = Date.now() - timerSeconds * 1000
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - timerStartRef.current) / 1000)
      setTimerSeconds(elapsed)
      // Track per-side time
      if (timerSide === 'left') setLeftSeconds((p) => p + 1)
      else setRightSeconds((p) => p + 1)
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [timerActive, timerSide])

  // Switch side alert
  useEffect(() => {
    if (!timerActive || switchAlertShown) return
    const currentSideSeconds = timerSide === 'left' ? leftSeconds : rightSeconds
    if (currentSideSeconds >= switchTargetMin * 60) {
      setSwitchAlertShown(true)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      Vibration.vibrate([0, 400, 200, 400])
    }
  }, [leftSeconds, rightSeconds, timerActive, switchTargetMin, switchAlertShown, timerSide])

  function startTimer(side: 'left' | 'right') {
    setTimerSide(side)
    setBreastSide(side)
    setTimerActive(true)
    setTimerSeconds(0)
    setLeftSeconds(0)
    setRightSeconds(0)
    setTimerSwitched(false)
    setSwitchAlertShown(false)
  }

  function switchSide() {
    const newSide = timerSide === 'left' ? 'right' : 'left'
    setTimerSide(newSide)
    setTimerSwitched(true)
    setSwitchAlertShown(false)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  }

  function stopTimer() {
    setTimerActive(false)
    const totalMin = Math.round(timerSeconds / 60)
    setDuration(String(totalMin || 1))
    setBreastSide(timerSwitched ? 'both' : timerSide)
  }

  function formatTimer(secs: number): string {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  // description derived from tags — used for saving as notes
  const description = foodTags.map((t) => t.name).join(', ')

  // Calorie summary derived directly from tags (match cals or manually entered)
  const calorieMatches = useMemo(() =>
    foodTags
      .filter((t) => t.match !== null || t.manualCals !== null)
      .map((t) => t.match ? { ...t.match, cals: t.manualCals ?? t.match.cals } : { food: t.name, cals: t.manualCals!, category: 'mixed' as const }),
    [foodTags]
  )
  const totalEstimatedCals = useMemo(() => calorieMatches.reduce((s, m) => s + m.cals, 0), [calorieMatches])

  async function pickPhoto() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.7,
        selectionLimit: 4,
      })
      if (!result.canceled) {
        const stable = await Promise.all(result.assets.map((a) => stabiliseUri(a.uri)))
        setPhotos((prev) => [...prev, ...stable].slice(0, 4))
      }
    } catch (e: any) {
      Alert.alert('Error', 'Could not open photo library')
    }
  }

  async function takePhoto() {
    const uri = await launchCameraSafe()
    if (uri) setPhotos((prev) => [...prev, uri].slice(0, 4))
  }

  /** Convert an AI food item to the tag shape used by FeedingForm */
  function aiItemToTag(item: AiFoodItem): { name: string; match: CalorieMatch; manualCals: null } {
    return {
      name: item.name,
      match: { food: item.name, cals: item.cals, category: item.category },
      manualCals: null,
    }
  }

  /** Enrich a typed food tag via the food-ai backend (used when local DB misses) */
  async function enrichTagWithAi(indexAtSubmit: number, name: string) {
    setAiLoadingIdx((prev) => { const next = new Set(prev); next.add(indexAtSubmit); return next })
    try {
      const res = await estimateFromText({ text: name, childAgeMonths, meal: meal ?? undefined })
      const first = res.foods[0]
      if (first) {
        setFoodTags((prev) => prev.map((t, i) => (i === indexAtSubmit ? aiItemToTag(first) : t)))
      }
    } catch {
      // Silent — user can still tap the ⚠︎ on the tag to enter kcal manually
    } finally {
      setAiLoadingIdx((prev) => { const next = new Set(prev); next.delete(indexAtSubmit); return next })
    }
  }

  /** Take/pick a photo of the plate and auto-populate foodTags via Claude Vision */
  async function scanPlate(source: 'camera' | 'library') {
    try {
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync()
        if (!perm.granted) { Alert.alert('Permission needed', 'Camera access is required'); return }
      }
      const launcher = source === 'camera'
        ? ImagePicker.launchCameraAsync
        : ImagePicker.launchImageLibraryAsync
      const pick = await launcher({ mediaTypes: ['images'], quality: 0.8, base64: false })
      if (pick.canceled || !pick.assets[0]) return
      const uri = pick.assets[0].uri

      setScanningPlate(true)
      // Compress + base64 to keep the payload small (<1MB) per project rules
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      )
      if (!manipulated.base64) throw new Error('Could not encode photo')

      const res = await estimateFromImage({
        imageBase64: manipulated.base64,
        mediaType: 'image/jpeg',
        childAgeMonths,
        meal: meal ?? undefined,
      })

      if (res.foods.length === 0) {
        Alert.alert('No food detected', res.notes ?? 'Try another angle or closer shot.')
        return
      }

      // Keep the photo alongside the tags so the log has visual evidence
      setPhotos((prev) => [...prev, uri].slice(0, 4))
      // Merge AI results with existing tags (don't duplicate by name)
      setFoodTags((prev) => {
        const existing = new Set(prev.map((t) => t.name.toLowerCase()))
        const added = res.foods
          .filter((f) => !existing.has(f.name.toLowerCase()))
          .map(aiItemToTag)
        return [...prev, ...added]
      })
      if (res.notes) Alert.alert('Grandma noticed', res.notes)
    } catch (e: unknown) {
      Alert.alert('Scan failed', (e as Error)?.message ?? 'Please try again')
    } finally {
      setScanningPlate(false)
    }
  }

  async function save() {
    if (!childId) return
    setSaving(true)
    try {
      const uploadedPhotos = photos.some((p) => !p.startsWith('http')) ? await uploadPhotos(photos.filter((p) => !p.startsWith('http'))) : []
      const finalPhotos = [...photos.filter((p) => p.startsWith('http')), ...uploadedPhotos]
      if (editLog) {
        // Edit mode — UPDATE existing log, preserving original routine metadata
        let routineMeta: { routineId?: string; routineName?: string } = {}
        try {
          const orig = JSON.parse(editLog.value ?? '{}')
          if (orig.routineId) routineMeta = { routineId: orig.routineId, routineName: orig.routineName }
        } catch {}
        let value: string
        if (feedType === 'solids') {
          value = JSON.stringify({ feedType: 'solids', meal, quality, time: startTime, isNewFood, newFoodName: isNewFood ? newFoodName : undefined, hasReaction, reactionFood: hasReaction ? reactionFood : undefined, reactionDesc: hasReaction ? reactionDesc : undefined, estimatedCals: totalEstimatedCals || undefined, ...routineMeta })
        } else if (feedType === 'breast') {
          value = JSON.stringify({ feedType: 'breast', time: startTime, duration: duration || undefined, side: breastSide || undefined, ...routineMeta })
        } else {
          value = JSON.stringify({ feedType: 'bottle', time: startTime, amount: amount || undefined, ...routineMeta })
        }
        await updateChildLog(editLog.id, tagWithRoutine(value, prefill) ?? value, feedType === 'solids' ? (description || null) : null, finalPhotos.length ? finalPhotos : undefined)
        onSaved()
        return
      }
      if (feedType === 'solids') {
        const value = JSON.stringify({
          feedType: 'solids',
          meal,
          quality,
          time: startTime,
          isNewFood,
          newFoodName: isNewFood ? newFoodName : undefined,
          hasReaction,
          reactionFood: hasReaction ? reactionFood : undefined,
          reactionDesc: hasReaction ? reactionDesc : undefined,
          estimatedCals: totalEstimatedCals || undefined,
          matchedFoods: calorieMatches.length > 0 ? calorieMatches.map((m) => m.food) : undefined,
        })
        await saveChildLog(childId, 'food', tagWithRoutine(value, prefill) ?? value, description || undefined, finalPhotos, logDate)
      } else if (feedType === 'breast') {
        const value = JSON.stringify({
          feedType: 'breast',
          time: startTime,
          duration: duration || undefined,
          side: breastSide || undefined,
        })
        await saveChildLog(childId, 'feeding', tagWithRoutine(value, prefill) ?? value, undefined, undefined, logDate)
      } else {
        // Bottle
        const value = JSON.stringify({
          feedType: 'bottle',
          time: startTime,
          amount: amount || undefined,
        })
        await saveChildLog(childId, 'feeding', tagWithRoutine(value, prefill) ?? value, undefined, undefined, logDate)
      }
      // Save as routine if toggled (only for new logs, not from existing routines)
      if (routineEnabled && !prefill) {
        const routineName = feedType === 'solids'
          ? (meal ? MEAL_MOMENTS.find((m) => m.id === meal)?.label ?? 'Meal' : 'Meal')
          : (feedType === 'breast' ? 'Breastfeed' : 'Bottle')
        const routineValue = feedType === 'solids'
          ? JSON.stringify({ feedType: 'solids', meal })
          : JSON.stringify({ feedType, amount: amount || undefined, duration: duration || undefined })
        await saveAsRoutine(childId, feedType === 'solids' ? 'food' : 'feeding', routineName, routineValue, startTime, routineDays)
      }
      onSaved()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
      <View style={styles.form}>
        <View style={styles.topRow}>
          <ChildSelector selected={childId} onSelect={setChildId} />
          <View style={styles.dateTimeRow}>
            <DateChip value={logDate} onChange={setLogDate} />
            <TimeChip value={startTime} onChange={setStartTime} label="Time" />
          </View>
        </View>

        {/* Feed type toggle */}
        <View style={[styles.toggleRow, { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg }]}>
          {(['breast', 'bottle', 'solids'] as FeedingType[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setFeedType(t)}
              style={[
                styles.toggleBtn,
                {
                  backgroundColor: feedType === t ? colors.primary : 'transparent',
                  borderRadius: radius.md,
                },
              ]}
            >
              <Text
                style={[styles.toggleText, { color: feedType === t ? '#FFFFFF' : colors.textSecondary }]}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {feedType === 'solids' ? (
          <>
            {/* Meal moment */}
            <View style={styles.chipGrid}>
              {MEAL_MOMENTS.map((m) => {
                const active = meal === m.id
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => setMeal(m.id)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? colors.primaryTint : colors.surface,
                        borderColor: active ? colors.primary : colors.border,
                        borderRadius: radius.full,
                      },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: active ? colors.primary : colors.text }]}>
                      {m.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            {/* Photo area */}
            <View style={styles.photoRow}>
              {photos.map((uri, i) => (
                <View key={i} style={{ position: 'relative' }}>
                  <Image source={{ uri }} style={[styles.photoThumb, { borderRadius: radius.lg }]} />
                  <Pressable
                    onPress={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                    style={styles.photoDeleteBtn}
                    hitSlop={4}
                  >
                    <X size={14} color="#FFFFFF" strokeWidth={3} />
                  </Pressable>
                </View>
              ))}
              {photos.length < 4 && (
                <View style={styles.photoButtons}>
                  <Pressable
                    onPress={takePhoto}
                    style={[styles.cameraBtn, { backgroundColor: colors.primary, borderRadius: radius.lg }]}
                  >
                    <Camera size={24} color="#FFFFFF" strokeWidth={2} />
                  </Pressable>
                  <Pressable
                    onPress={pickPhoto}
                    style={[styles.galleryBtn, { backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderRadius: radius.lg }]}
                  >
                    <Plus size={20} color={colors.textMuted} strokeWidth={2} />
                  </Pressable>
                </View>
              )}
            </View>

            {/* Scan plate — Claude Vision identifies every food + estimates kcal */}
            <Pressable
              onPress={() =>
                Alert.alert('Scan plate', "Let Grandma identify what's on the plate and estimate calories.", [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Take photo', onPress: () => scanPlate('camera') },
                  { text: 'From library', onPress: () => scanPlate('library') },
                ])
              }
              disabled={scanningPlate}
              style={({ pressed }) => [
                styles.scanPlateBtn,
                { backgroundColor: colors.primary + '14', borderColor: colors.primary + '40', borderRadius: radius.lg },
                pressed && { opacity: 0.7 },
              ]}
            >
              {scanningPlate
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <ScanLine size={18} color={colors.primary} strokeWidth={2.2} />}
              <Text style={[styles.scanPlateText, { color: colors.primary }]}>
                {scanningPlate ? 'Reading the plate…' : 'Scan plate — auto-detect foods & calories'}
              </Text>
              <Sparkles size={14} color={colors.primary} strokeWidth={2} />
            </Pressable>

            {/* Food tag input + live calorie estimate */}
            <View>
              {/* Existing tags */}
              {foodTags.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  {foodTags.map((tag, i) => {
                    const loading = aiLoadingIdx.has(i)
                    const known = tag.match !== null || tag.manualCals !== null
                    const borderColor = loading ? colors.primary : known ? brand.success : brand.error
                    return (
                      <View key={`${tag.name}-${i}`} style={[styles.foodTag, { backgroundColor: colors.surfaceRaised, borderColor, borderRadius: radius.full }]}>
                        {loading
                          ? <ActivityIndicator size="small" color={colors.primary} />
                          : known
                            ? <Check size={12} color={brand.success} strokeWidth={3} />
                            : (
                              <Pressable onPress={() => { setManualCalIdx(i); setManualCalInput('') }} hitSlop={8}>
                                <AlertTriangle size={12} color={brand.error} strokeWidth={2.5} />
                              </Pressable>
                            )
                        }
                        <Text style={[styles.foodTagText, { color: colors.text }]}>{tag.name}</Text>
                        <Pressable onPress={() => setFoodTags((prev) => prev.filter((_, idx) => idx !== i))} hitSlop={8}>
                          <Text style={[styles.foodTagRemove, { color: colors.textMuted }]}>×</Text>
                        </Pressable>
                      </View>
                    )
                  })}
                </View>
              )}
              {/* Input for next food */}
              <TextInput
                value={foodInput}
                onChangeText={setFoodInput}
                placeholder={foodTags.length === 0 ? 'Add a food (e.g. banana) and press ↵' : 'Add another food…'}
                placeholderTextColor={colors.textMuted}
                returnKeyType="done"
                blurOnSubmit={false}
                onSubmitEditing={() => {
                  const trimmed = foodInput.trim()
                  if (!trimmed) return
                  const match = matchSingleTag(trimmed)
                  setFoodTags((prev) => {
                    const idx = prev.length
                    // Kick off AI enrichment in the background if the local DB missed
                    if (!match) enrichTagWithAi(idx, trimmed)
                    return [...prev, { name: trimmed, match, manualCals: null }]
                  })
                  setFoodInput('')
                }}
                style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, minHeight: 48 }]}
              />
              {calorieMatches.length > 0 && (
                <View style={[styles.calorieBanner, { backgroundColor: brand.success + '10', borderColor: brand.success + '30', borderRadius: radius.lg }]}>
                  <View style={styles.calorieHeader}>
                    <Utensils size={14} color={brand.success} strokeWidth={2} />
                    <Text style={[styles.calorieTotalText, { color: brand.success }]}>
                      ~{totalEstimatedCals} kcal estimated
                    </Text>
                  </View>
                  <View style={styles.calorieMatchList}>
                    {calorieMatches.map((m, i) => (
                      <View key={`${m.food}-${i}`} style={styles.calorieMatchRow}>
                        <View style={[styles.calorieMatchDot, { backgroundColor: categoryColor(m.category) }]} />
                        <Text style={[styles.calorieMatchFood, { color: colors.text }]}>
                          {m.food.charAt(0).toUpperCase() + m.food.slice(1)}
                        </Text>
                        <Text style={[styles.calorieMatchCals, { color: colors.textMuted }]}>
                          {m.cals} kcal
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Manual kcal popup for unrecognized foods */}
              <Modal visible={manualCalIdx !== null} transparent animationType="fade" onRequestClose={() => setManualCalIdx(null)}>
                <Pressable style={styles.popupBackdrop} onPress={() => setManualCalIdx(null)} />
                <View style={[styles.manualCalPopup, { backgroundColor: colors.surface, borderRadius: radius.xl, borderColor: colors.border }]}>
                  <Text style={[styles.manualCalTitle, { color: colors.text }]}>
                    Unknown food — add kcal manually
                  </Text>
                  <Text style={[styles.manualCalSubtitle, { color: colors.textSecondary }]}>
                    "{manualCalIdx !== null ? foodTags[manualCalIdx]?.name : ''}" wasn't found in our database. How many kcal?
                  </Text>
                  <TextInput
                    value={manualCalInput}
                    onChangeText={setManualCalInput}
                    placeholder="e.g. 120"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    style={[styles.input, { color: colors.text, backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderRadius: radius.lg, minHeight: 48, marginTop: 12 }]}
                    autoFocus
                  />
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                    <Pressable
                      onPress={() => setManualCalIdx(null)}
                      style={[styles.manualCalBtn, { backgroundColor: colors.surfaceRaised, borderColor: colors.border, flex: 1 }]}
                    >
                      <Text style={[styles.manualCalBtnText, { color: colors.textSecondary }]}>Skip</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        const n = parseInt(manualCalInput, 10)
                        if (!isNaN(n) && n > 0 && manualCalIdx !== null) {
                          setFoodTags((prev) => prev.map((t, i) => i === manualCalIdx ? { ...t, manualCals: n } : t))
                        }
                        setManualCalIdx(null)
                        setManualCalInput('')
                      }}
                      style={[styles.manualCalBtn, { backgroundColor: colors.primary, borderColor: colors.primary, flex: 1 }]}
                    >
                      <Text style={[styles.manualCalBtnText, { color: '#FFF' }]}>Confirm</Text>
                    </Pressable>
                  </View>
                </View>
              </Modal>
            </View>

            {/* Eat quality */}
            <View style={styles.qualityRow}>
              {EAT_QUALITIES.map((q) => {
                const Icon = q.icon
                const active = quality === q.id
                return (
                  <Pressable
                    key={q.id}
                    onPress={() => setQuality(q.id)}
                    style={[
                      styles.qualityBtn,
                      {
                        backgroundColor: active ? q.color + '15' : colors.surface,
                        borderColor: active ? q.color : colors.border,
                        borderRadius: radius.lg,
                      },
                    ]}
                  >
                    <Icon size={22} color={active ? q.color : colors.textMuted} strokeWidth={2} />
                    <Text style={[styles.qualityLabel, { color: active ? q.color : colors.textMuted }]}>
                      {q.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            {/* Flags + expandable fields */}
            <View style={styles.flagRow}>
              <Pressable
                onPress={() => setIsNewFood(!isNewFood)}
                style={[styles.flagChip, {
                  backgroundColor: isNewFood ? brand.secondary + '15' : colors.surface,
                  borderColor: isNewFood ? brand.secondary : colors.border,
                  borderRadius: radius.full,
                }]}
              >
                <Baby size={14} color={isNewFood ? brand.secondary : colors.textMuted} strokeWidth={2} />
                <Text style={[styles.flagText, { color: isNewFood ? brand.secondary : colors.textMuted }]}>
                  New food
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setHasReaction(!hasReaction)}
                style={[styles.flagChip, {
                  backgroundColor: hasReaction ? brand.error + '15' : colors.surface,
                  borderColor: hasReaction ? brand.error : colors.border,
                  borderRadius: radius.full,
                }]}
              >
                <AlertTriangle size={14} color={hasReaction ? brand.error : colors.textMuted} strokeWidth={2} />
                <Text style={[styles.flagText, { color: hasReaction ? brand.error : colors.textMuted }]}>
                  Reaction
                </Text>
              </Pressable>
            </View>

            {/* New food expanded */}
            {isNewFood && (
              <View style={[styles.expandedFlag, { backgroundColor: brand.secondary + '08', borderColor: brand.secondary + '25', borderRadius: radius.lg }]}>
                <Text style={[styles.expandedFlagLabel, { color: brand.secondary }]}>What was the new food?</Text>
                <TextInput
                  value={newFoodName}
                  onChangeText={setNewFoodName}
                  placeholder="e.g. Kiwi, shrimp..."
                  placeholderTextColor={colors.textMuted}
                  style={[styles.expandedFlagInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}
                />
              </View>
            )}

            {/* Reaction expanded */}
            {hasReaction && (
              <View style={[styles.expandedFlag, { backgroundColor: brand.error + '08', borderColor: brand.error + '25', borderRadius: radius.lg }]}>
                <Text style={[styles.expandedFlagLabel, { color: brand.error }]}>Reaction details</Text>
                <TextInput
                  value={reactionFood}
                  onChangeText={setReactionFood}
                  placeholder="Which food caused it?"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.expandedFlagInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}
                />
                <TextInput
                  value={reactionDesc}
                  onChangeText={setReactionDesc}
                  placeholder="Describe the reaction (rash, vomit, swelling...)"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  style={[styles.expandedFlagInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, minHeight: 60 }]}
                />
              </View>
            )}
          </>
        ) : feedType === 'breast' ? (
          <>
            {/* ── Breast Feeding with Live Timer ── */}

            {/* Last side reminder */}
            {!timerActive && (lastSideLoading ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ alignSelf: 'flex-start' }} />
            ) : lastSide ? (
              <View style={[styles.lastSideBanner, { backgroundColor: brand.accent + '12', borderColor: brand.accent + '25', borderRadius: radius.lg }]}>
                <Text style={[styles.lastSideLabel, { color: colors.textSecondary }]}>
                  Last session was <Text style={{ fontWeight: '800', color: brand.accent }}>
                    {lastSide === 'left' ? 'Left' : lastSide === 'right' ? 'Right' : 'Both'}
                  </Text> — try <Text style={{ fontWeight: '800', color: colors.text }}>
                    {lastSide === 'left' ? 'Right' : lastSide === 'right' ? 'Left' : 'alternating'}
                  </Text> next
                </Text>
              </View>
            ) : null)}

            {timerActive ? (
              /* ── LIVE TIMER MODE ── */
              <View style={[styles.timerWrap, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
                {/* Current side indicator with body icon */}
                <View style={styles.timerSideIndicator}>
                  <View style={styles.breastIcon}>
                    <View style={[styles.breastShape, styles.breastShapeL, {
                      backgroundColor: (timerSide === 'left' ? colors.primary : colors.textMuted + '20') + '20',
                      borderColor: timerSide === 'left' ? colors.primary : colors.textMuted + '30',
                    }]}>
                      {timerSide === 'left' && <View style={[styles.breastNipple, { backgroundColor: colors.primary }]} />}
                    </View>
                    <View style={[styles.breastShape, styles.breastShapeR, {
                      backgroundColor: (timerSide === 'right' ? colors.primary : colors.textMuted + '20') + '20',
                      borderColor: timerSide === 'right' ? colors.primary : colors.textMuted + '30',
                    }]}>
                      {timerSide === 'right' && <View style={[styles.breastNipple, { backgroundColor: colors.primary }]} />}
                    </View>
                  </View>
                  <Text style={[styles.timerSideLabel, { color: colors.primary }]}>
                    {timerSide === 'left' ? 'Left side' : 'Right side'}
                  </Text>
                </View>

                {/* Big timer display */}
                <Text style={[styles.timerDisplay, { color: colors.text }]}>
                  {formatTimer(timerSeconds)}
                </Text>

                {/* Per-side breakdown */}
                <View style={styles.timerBreakdown}>
                  <View style={[styles.timerBreakdownItem, { backgroundColor: timerSide === 'left' ? colors.primary + '15' : 'transparent', borderRadius: radius.md }]}>
                    <View style={[styles.timerBreakdownDot, { backgroundColor: timerSide === 'left' ? colors.primary : colors.textMuted }]} />
                    <Text style={[styles.timerBreakdownLabel, { color: timerSide === 'left' ? colors.text : colors.textMuted }]}>L</Text>
                    <Text style={[styles.timerBreakdownTime, { color: timerSide === 'left' ? colors.primary : colors.textMuted }]}>
                      {formatTimer(leftSeconds)}
                    </Text>
                  </View>
                  <View style={[styles.timerBreakdownItem, { backgroundColor: timerSide === 'right' ? colors.primary + '15' : 'transparent', borderRadius: radius.md }]}>
                    <View style={[styles.timerBreakdownDot, { backgroundColor: timerSide === 'right' ? colors.primary : colors.textMuted }]} />
                    <Text style={[styles.timerBreakdownLabel, { color: timerSide === 'right' ? colors.text : colors.textMuted }]}>R</Text>
                    <Text style={[styles.timerBreakdownTime, { color: timerSide === 'right' ? colors.primary : colors.textMuted }]}>
                      {formatTimer(rightSeconds)}
                    </Text>
                  </View>
                </View>

                {/* Switch alert banner */}
                {switchAlertShown && (
                  <View style={[styles.switchAlert, { backgroundColor: brand.accent + '15', borderColor: brand.accent + '30', borderRadius: radius.lg }]}>
                    <Text style={[styles.switchAlertText, { color: brand.accent }]}>
                      {switchTargetMin} min reached — time to switch sides!
                    </Text>
                  </View>
                )}

                {/* Timer actions */}
                <View style={styles.timerActions}>
                  <Pressable
                    onPress={switchSide}
                    style={({ pressed }) => [
                      styles.timerSwitchBtn,
                      { backgroundColor: brand.accent + '15', borderColor: brand.accent + '40', borderRadius: radius.lg },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Repeat size={18} color={brand.accent} strokeWidth={2} />
                    <Text style={[styles.timerSwitchText, { color: brand.accent }]}>Switch side</Text>
                  </Pressable>
                  <Pressable
                    onPress={stopTimer}
                    style={({ pressed }) => [
                      styles.timerStopBtn,
                      { backgroundColor: colors.primary, borderRadius: radius.lg },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Check size={18} color="#FFF" strokeWidth={2.5} />
                    <Text style={styles.timerStopText}>Done</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              /* ── START MODE — pick side and go ── */
              <>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Tap a side to start live timer</Text>
                <View style={styles.sideRow}>
                  {([
                    { id: 'left' as const, label: 'Left' },
                    { id: 'right' as const, label: 'Right' },
                  ]).map((s) => {
                    const isRecommended = lastSide && (
                      (lastSide === 'left' && s.id === 'right') ||
                      (lastSide === 'right' && s.id === 'left')
                    )
                    const accentC = colors.primary
                    const dimC = colors.textMuted + '30'
                    const lFill = s.id === 'left' ? accentC : dimC
                    const rFill = s.id === 'right' ? accentC : dimC
                    return (
                      <Pressable
                        key={s.id}
                        onPress={() => startTimer(s.id)}
                        style={({ pressed }) => [
                          styles.sideBtn,
                          {
                            backgroundColor: colors.surface,
                            borderColor: isRecommended ? brand.accent + '50' : colors.border,
                            borderRadius: radius.lg,
                          },
                          pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] },
                        ]}
                      >
                        <View style={styles.breastIcon}>
                          <View style={[styles.breastShape, styles.breastShapeL, { backgroundColor: lFill + '20', borderColor: lFill }]}>
                            {s.id === 'left' && <View style={[styles.breastNipple, { backgroundColor: lFill }]} />}
                          </View>
                          <View style={[styles.breastShape, styles.breastShapeR, { backgroundColor: rFill + '20', borderColor: rFill }]}>
                            {s.id === 'right' && <View style={[styles.breastNipple, { backgroundColor: rFill }]} />}
                          </View>
                        </View>
                        <Text style={[styles.sideBtnText, { color: colors.text }]}>{s.label}</Text>
                        {isRecommended && (
                          <View style={[styles.recommendedTag, { backgroundColor: brand.accent + '20' }]}>
                            <Text style={{ fontSize: 9, fontWeight: '700', color: brand.accent }}>NEXT</Text>
                          </View>
                        )}
                      </Pressable>
                    )
                  })}
                </View>

                {/* Switch target setting */}
                <View style={[styles.switchTargetRow, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
                  <Clock size={14} color={colors.textMuted} strokeWidth={2} />
                  <Text style={[styles.switchTargetLabel, { color: colors.textSecondary }]}>Alert to switch at</Text>
                  {[10, 15, 20].map((min) => (
                    <Pressable
                      key={min}
                      onPress={() => setSwitchTargetMin(min)}
                      style={[
                        styles.switchTargetChip,
                        {
                          backgroundColor: switchTargetMin === min ? colors.primary : 'transparent',
                          borderColor: switchTargetMin === min ? colors.primary : colors.border,
                          borderRadius: radius.full,
                        },
                      ]}
                    >
                      <Text style={[styles.switchTargetChipText, { color: switchTargetMin === min ? '#FFF' : colors.textMuted }]}>
                        {min}m
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Or log manually */}
                <View style={styles.manualDivider}>
                  <View style={[styles.manualDividerLine, { backgroundColor: colors.border }]} />
                  <Text style={[styles.manualDividerText, { color: colors.textMuted }]}>or log manually</Text>
                  <View style={[styles.manualDividerLine, { backgroundColor: colors.border }]} />
                </View>

                {/* Manual side selection */}
                <View style={styles.sideRow}>
                  {([
                    { id: 'left' as const, label: 'Left' },
                    { id: 'right' as const, label: 'Right' },
                    { id: 'both' as const, label: 'Both' },
                  ]).map((s) => {
                    const active = breastSide === s.id
                    return (
                      <Pressable
                        key={s.id}
                        onPress={() => setBreastSide(s.id)}
                        style={[
                          styles.sideChipSmall,
                          {
                            backgroundColor: active ? colors.primaryTint : 'transparent',
                            borderColor: active ? colors.primary : colors.border,
                            borderRadius: radius.full,
                          },
                        ]}
                      >
                        <Text style={[styles.sideChipSmallText, { color: active ? colors.primary : colors.textMuted }]}>{s.label}</Text>
                      </Pressable>
                    )
                  })}
                </View>

                <TextInput
                  value={duration}
                  onChangeText={setDuration}
                  placeholder="Duration (minutes)"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
                />
              </>
            )}
          </>
        ) : (
          <>
            {/* ── Bottle ── */}
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="Amount (ml)"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
            />
          </>
        )}

        <RoutineToggle enabled={routineEnabled} onToggle={setRoutineEnabled} days={routineDays} onDaysChange={setRoutineDays} locked={!!prefill} />
        <SaveButton onPress={save} saving={saving} disabled={!childId} onSkip={prefill?.routineId ? onSkip : undefined} />
      </View>
    </ScrollView>
  )
}

// ─── 2. SLEEP FORM ─────────────────────────────────────────────────────────

export function SleepForm({ onSaved, initialDate, prefill, onSkip, editLog }: { onSaved: () => void; initialDate?: string; prefill?: RoutinePrefill; onSkip?: () => void; editLog?: EditLog }) {
  const { colors, radius } = useTheme()
  const children = useChildStore((s) => s.children)
  const activeChild = useChildStore((s) => s.activeChild)

  const [childId, setChildId] = useState(children.length <= 1 ? (children[0]?.id ?? '') : '')
  const [logDate, setLogDate] = useState(initialDate ?? toDateStr(new Date()))
  // Seed startTime directly from prefill so the activity time is the routine's time, not "now"
  const [startTime, setStartTime] = useState(() => {
    if (prefill?.value) {
      try { const p = JSON.parse(prefill.value); if (p.startTime) return p.startTime } catch {}
    }
    return prefill?.time ?? toTimeStr(new Date())
  })
  const [endTime, setEndTime] = useState(() => {
    if (prefill?.value) {
      try { const p = JSON.parse(prefill.value); if (p.endTime) return p.endTime } catch {}
    }
    return ''
  })
  const [quality, setQuality] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [routineEnabled, setRoutineEnabled] = useState(!!prefill)
  const [routineDays, setRoutineDays] = useState([0, 1, 2, 3, 4, 5, 6])

  // Apply routine prefill when it changes (handles cases where prefill changes after mount)
  useEffect(() => {
    setRoutineEnabled(!!prefill)
    if (!prefill) return
    if (prefill.childId) setChildId(prefill.childId)
    if (prefill.time) setStartTime(prefill.time)
    if (prefill.value) {
      try {
        const p = JSON.parse(prefill.value)
        if (p.quality) setQuality(p.quality)
        if (p.startTime) setStartTime(p.startTime)
        if (p.endTime) setEndTime(p.endTime)
      } catch {}
    }
  }, [prefill])

  // Apply editLog when opening in edit mode
  useEffect(() => {
    if (!editLog) return
    setChildId(editLog.child_id)
    setLogDate(editLog.date)
    if (editLog.notes) setNotes(editLog.notes)
    try {
      const p = JSON.parse(editLog.value ?? '{}')
      if (p.startTime) setStartTime(p.startTime)
      if (p.endTime) setEndTime(p.endTime)
      if (p.quality) setQuality(p.quality)
    } catch {}
  }, [editLog?.id])

  const autoDuration = useMemo(() => calcDuration(startTime, endTime), [startTime, endTime])

  const qualities = ['Great', 'Good', 'Restless', 'Poor']

  async function save() {
    if (!childId) return
    setSaving(true)
    try {
      // When editing a routine-tagged log, preserve the original routineId/routineName
      // so the log remains linked to its routine (e.g. "Afternoon Nap" stays "Afternoon Nap")
      let routineMeta: { routineId?: string; routineName?: string } = {}
      if (editLog) {
        try {
          const orig = JSON.parse(editLog.value ?? '{}')
          if (orig.routineId) routineMeta = { routineId: orig.routineId, routineName: orig.routineName }
        } catch {}
      }
      const valueObj: Record<string, unknown> = { duration: autoDuration || undefined, quality, startTime, endTime: endTime || undefined, ...routineMeta }
      const value = JSON.stringify(valueObj)
      const taggedValue = tagWithRoutine(value, prefill) ?? value
      if (editLog) {
        await updateChildLog(editLog.id, taggedValue, notes || null)
        onSaved()
        return
      }
      await saveChildLog(childId, 'sleep', taggedValue, notes || undefined, undefined, logDate)
      if (routineEnabled && !prefill) {
        const isNap = parseInt(startTime.split(':')[0]) < 16
        await saveAsRoutine(childId, 'sleep', isNap ? 'Nap' : 'Bedtime', JSON.stringify({ startTime, quality }), startTime, routineDays)
      }
      onSaved()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <View style={styles.topRow}>
        <ChildSelector selected={childId} onSelect={setChildId} />
        <View style={styles.dateTimeRow}>
          <DateChip value={logDate} onChange={setLogDate} />
          <TimeChip value={startTime} onChange={setStartTime} label="Start" />
          {endTime ? (
            <TimeChip value={endTime} onChange={setEndTime} label="End" />
          ) : (
            <Pressable
              onPress={() => setEndTime(toTimeStr(new Date()))}
              style={[styles.timeChip, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999 }]}
            >
              <Plus size={12} color={colors.textMuted} strokeWidth={2} />
              <Text style={[styles.timeChipLabel, { color: colors.textMuted }]}>End</Text>
            </Pressable>
          )}
        </View>
      </View>
      <View style={[styles.iconBanner, { backgroundColor: brand.pregnancy + '15' }]}>
        <Moon size={20} color={brand.pregnancy} strokeWidth={2} />
        <Text style={[styles.bannerLabel, { color: colors.text }]}>Sleep Log</Text>
        {autoDuration !== '' && (
          <Text style={[styles.autoDuration, { color: brand.pregnancy }]}>{autoDuration}</Text>
        )}
      </View>
      <View style={styles.chipGrid}>
        {qualities.map((q) => {
          const active = quality === q
          return (
            <Pressable
              key={q}
              onPress={() => setQuality(q)}
              style={[styles.chip, {
                backgroundColor: active ? colors.primaryTint : colors.surface,
                borderColor: active ? colors.primary : colors.border,
                borderRadius: radius.full,
              }]}
            >
              <Text style={[styles.chipText, { color: active ? colors.primary : colors.text }]}>{q}</Text>
            </Pressable>
          )
        })}
      </View>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Notes (optional)"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
      />
      <RoutineToggle enabled={routineEnabled} onToggle={setRoutineEnabled} days={routineDays} onDaysChange={setRoutineDays} locked={!!prefill} />
      <SaveButton onPress={save} saving={saving} disabled={!childId} onSkip={prefill?.routineId ? onSkip : undefined} />
    </View>
  )
}

// ─── 3. HEALTH EVENT FORM ──────────────────────────────────────────────────

const HEALTH_EVENTS = ['Temperature', 'Vaccine', 'Medicine', 'Doctor visit', 'Injury', 'Other']

export function HealthEventForm({ onSaved, initialDate, prefill, onSkip, editLog }: { onSaved: () => void; initialDate?: string; prefill?: RoutinePrefill; onSkip?: () => void; editLog?: EditLog }) {
  const { colors, radius } = useTheme()
  const children = useChildStore((s) => s.children)
  const activeChild = useChildStore((s) => s.activeChild)

  const [childId, setChildId] = useState(children.length <= 1 ? (children[0]?.id ?? '') : '')
  const [logDate, setLogDate] = useState(initialDate ?? toDateStr(new Date()))
  const [startTime, setStartTime] = useState(() => prefill?.time ?? toTimeStr(new Date()))
  const [eventType, setEventType] = useState<string | null>(null)
  const [value, setValue] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Apply routine prefill when it changes
  useEffect(() => {
    if (!prefill) return
    if (prefill.childId) setChildId(prefill.childId)
    if (prefill.time) setStartTime(prefill.time)
    if (prefill.name) {
      const matched = HEALTH_EVENTS.find((e) => e.toLowerCase() === prefill.name!.toLowerCase())
      if (matched) setEventType(matched)
    }
  }, [prefill])

  // Apply editLog when opening in edit mode
  useEffect(() => {
    if (!editLog) return
    setChildId(editLog.child_id)
    setLogDate(editLog.date)
    if (editLog.notes) setNotes(editLog.notes)
    // Reverse-map log type to event label
    const typeToLabel: Record<string, string> = { temperature: 'Temperature', vaccine: 'Vaccine', medicine: 'Medicine', note: 'Other' }
    if (typeToLabel[editLog.type]) setEventType(typeToLabel[editLog.type])
    else if (HEALTH_EVENTS.includes(editLog.type)) setEventType(editLog.type)
    if (editLog.value) setValue(editLog.value)
  }, [editLog?.id])

  async function save() {
    if (!childId || !eventType) return
    setSaving(true)
    try {
      const logType = eventType === 'Temperature' ? 'temperature'
        : eventType === 'Vaccine' ? 'vaccine'
        : eventType === 'Medicine' ? 'medicine'
        : 'note'
      const tagged = tagWithRoutine(value || eventType, prefill) ?? (value || eventType)
      if (editLog) {
        await updateChildLog(editLog.id, tagged, notes || null)
        onSaved()
        return
      }
      await saveChildLog(childId, logType, tagged, notes || undefined, undefined, logDate)
      onSaved()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <View style={styles.topRow}>
        <ChildSelector selected={childId} onSelect={setChildId} />
        <View style={styles.dateTimeRow}>
          <DateChip value={logDate} onChange={setLogDate} />
          <TimeChip value={startTime} onChange={setStartTime} label="Time" />
        </View>
      </View>
      <View style={[styles.iconBanner, { backgroundColor: brand.error + '15' }]}>
        <Heart size={20} color={brand.error} strokeWidth={2} />
        <Text style={[styles.bannerLabel, { color: colors.text }]}>Health Event</Text>
      </View>
      <View style={styles.chipGrid}>
        {HEALTH_EVENTS.map((e) => {
          const active = eventType === e
          return (
            <Pressable
              key={e}
              onPress={() => setEventType(e)}
              style={[styles.chip, {
                backgroundColor: active ? colors.primaryTint : colors.surface,
                borderColor: active ? colors.primary : colors.border,
                borderRadius: radius.full,
              }]}
            >
              <Text style={[styles.chipText, { color: active ? colors.primary : colors.text }]}>{e}</Text>
            </Pressable>
          )
        })}
      </View>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder={eventType === 'Temperature' ? 'Temperature (e.g. 37.5°C)' : 'Details'}
        placeholderTextColor={colors.textMuted}
        keyboardType={eventType === 'Temperature' ? 'decimal-pad' : 'default'}
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
      />
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Notes (optional)"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
      />
      <SaveButton onPress={save} saving={saving} disabled={!childId || !eventType} onSkip={prefill?.routineId ? onSkip : undefined} />
    </View>
  )
}

// ─── 4. MOOD FORM ──────────────────────────────────────────────────────────

const MOODS = [
  { id: 'happy', icon: Laugh, label: 'Happy' },
  { id: 'calm', icon: Smile, label: 'Calm' },
  { id: 'fussy', icon: Meh, label: 'Fussy' },
  { id: 'cranky', icon: Frown, label: 'Cranky' },
  { id: 'energetic', icon: Zap, label: 'Energetic' },
]

export function KidsMoodForm({ onSaved, initialDate, prefill, onSkip, editLog }: { onSaved: () => void; initialDate?: string; prefill?: RoutinePrefill; onSkip?: () => void; editLog?: EditLog }) {
  const { colors, radius } = useTheme()
  const children = useChildStore((s) => s.children)
  const activeChild = useChildStore((s) => s.activeChild)

  const [childId, setChildId] = useState(children.length <= 1 ? (children[0]?.id ?? '') : '')
  const [logDate, setLogDate] = useState(initialDate ?? toDateStr(new Date()))
  const [startTime, setStartTime] = useState(() => prefill?.time ?? toTimeStr(new Date()))
  const [mood, setMood] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [routineEnabled, setRoutineEnabled] = useState(!!prefill)
  const [routineDays, setRoutineDays] = useState([0, 1, 2, 3, 4, 5, 6])

  // Apply routine prefill when it changes
  useEffect(() => {
    setRoutineEnabled(!!prefill)
    if (!prefill) return
    if (prefill.childId) setChildId(prefill.childId)
    if (prefill.time) setStartTime(prefill.time)
    if (prefill.value) {
      try {
        const p = JSON.parse(prefill.value)
        if (p.mood) setMood(p.mood)
      } catch {
        // value might be the mood string directly
        if (MOODS.some((m) => m.id === prefill.value)) setMood(prefill.value!)
      }
    }
  }, [prefill])

  // Apply editLog when opening in edit mode
  useEffect(() => {
    if (!editLog) return
    setChildId(editLog.child_id)
    setLogDate(editLog.date)
    if (editLog.notes) setNotes(editLog.notes)
    if (editLog.value && MOODS.some((m) => m.id === editLog.value)) setMood(editLog.value)
  }, [editLog?.id])

  async function save() {
    if (!childId || !mood) return
    setSaving(true)
    try {
      if (editLog) {
        await updateChildLog(editLog.id, mood, notes || null)
        onSaved()
        return
      }
      await saveChildLog(childId, 'mood', mood, notes || undefined, undefined, logDate)
      if (routineEnabled && !prefill) {
        await saveAsRoutine(childId, 'mood', 'Mood check', null, startTime, routineDays)
      }
      onSaved()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <View style={styles.topRow}>
        <ChildSelector selected={childId} onSelect={setChildId} />
        <View style={styles.dateTimeRow}>
          <DateChip value={logDate} onChange={setLogDate} />
          <TimeChip value={startTime} onChange={setStartTime} label="Time" />
        </View>
      </View>
      <View style={styles.moodRow}>
        {MOODS.map((m) => {
          const Icon = m.icon
          const active = mood === m.id
          return (
            <Pressable
              key={m.id}
              onPress={() => setMood(m.id)}
              style={[styles.moodBtn, {
                backgroundColor: active ? colors.primaryTint : colors.surface,
                borderRadius: radius.lg,
              }]}
            >
              <Icon size={24} color={active ? colors.primary : colors.textMuted} strokeWidth={2} />
              <Text style={[styles.moodLabel, { color: active ? colors.primary : colors.textMuted }]}>{m.label}</Text>
            </Pressable>
          )
        })}
      </View>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="What happened?"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
      />
      <RoutineToggle enabled={routineEnabled} onToggle={setRoutineEnabled} days={routineDays} onDaysChange={setRoutineDays} locked={!!prefill} />
      <SaveButton onPress={save} saving={saving} disabled={!childId || !mood} onSkip={prefill?.routineId ? onSkip : undefined} />
    </View>
  )
}

// ─── 5. MEMORY FORM ────────────────────────────────────────────────────────

export function MemoryForm({ onSaved, initialDate }: { onSaved: () => void; initialDate?: string }) {
  const { colors, radius } = useTheme()
  const children = useChildStore((s) => s.children)
  const activeChild = useChildStore((s) => s.activeChild)

  const [childId, setChildId] = useState(children.length <= 1 ? (children[0]?.id ?? '') : '')
  const [logDate, setLogDate] = useState(initialDate ?? toDateStr(new Date()))
  const [startTime, setStartTime] = useState(toTimeStr(new Date()))
  const [photos, setPhotos] = useState<string[]>([])
  const [caption, setCaption] = useState('')
  const [saving, setSaving] = useState(false)

  async function pickPhoto() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.7,
        selectionLimit: 4,
      })
      if (!result.canceled) {
        const stable = await Promise.all(result.assets.map((a) => stabiliseUri(a.uri)))
        setPhotos((prev) => [...prev, ...stable].slice(0, 4))
      }
    } catch (e: any) {
      Alert.alert('Error', 'Could not open photo library')
    }
  }

  async function takePhoto() {
    const uri = await launchCameraSafe()
    if (uri) setPhotos((prev) => [...prev, uri].slice(0, 4))
  }

  async function save() {
    if (!childId) return
    setSaving(true)
    try {
      const uploadedPhotos = await uploadPhotos(photos)
      await saveChildLog(childId, 'photo', 'memory', caption || undefined, uploadedPhotos, logDate)
      onSaved()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <View style={styles.topRow}>
        <ChildSelector selected={childId} onSelect={setChildId} />
        <View style={styles.dateTimeRow}>
          <DateChip value={logDate} onChange={setLogDate} />
          <TimeChip value={startTime} onChange={setStartTime} label="Time" />
        </View>
      </View>
      <View style={styles.photoRow}>
        {photos.map((uri, i) => (
          <View key={i} style={{ position: 'relative' }}>
            <Image source={{ uri }} style={[styles.photoThumb, { borderRadius: radius.lg }]} />
            <Pressable
              onPress={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
              style={styles.photoDeleteBtn}
              hitSlop={4}
            >
              <X size={14} color="#FFFFFF" strokeWidth={3} />
            </Pressable>
          </View>
        ))}
        {photos.length < 4 && (
          <View style={styles.photoButtons}>
            <Pressable onPress={takePhoto} style={[styles.cameraBtn, { backgroundColor: colors.primary, borderRadius: radius.lg }]}>
              <Camera size={24} color="#FFFFFF" strokeWidth={2} />
            </Pressable>
            <Pressable onPress={pickPhoto} style={[styles.galleryBtn, { backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderRadius: radius.lg }]}>
              <Plus size={20} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
          </View>
        )}
      </View>
      <TextInput
        value={caption}
        onChangeText={setCaption}
        placeholder="Caption this moment..."
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
      />
      <SaveButton onPress={save} saving={saving} disabled={!childId} />
    </View>
  )
}

// ─── 6. ACTIVITY FORM ─────────────────────────────────────────────────────

const ACTIVITY_TYPES = [
  { id: 'class', label: 'Class' },
  { id: 'sport', label: 'Sport' },
  { id: 'swim', label: 'Swimming' },
  { id: 'dance', label: 'Dance' },
  { id: 'music', label: 'Music' },
  { id: 'art', label: 'Art' },
  { id: 'playground', label: 'Playground' },
  { id: 'walk', label: 'Walk' },
  { id: 'therapy', label: 'Therapy' },
  { id: 'playdate', label: 'Playdate' },
  { id: 'other', label: 'Other' },
]

export function ActivityForm({ onSaved, initialDate, prefill, onSkip, editLog }: { onSaved: () => void; initialDate?: string; prefill?: RoutinePrefill; onSkip?: () => void; editLog?: EditLog }) {
  const { colors, radius } = useTheme()
  const children = useChildStore((s) => s.children)

  const [childId, setChildId] = useState(children.length <= 1 ? (children[0]?.id ?? '') : '')
  const [logDate, setLogDate] = useState(initialDate ?? toDateStr(new Date()))
  const [startTime, setStartTime] = useState(() => prefill?.time ?? toTimeStr(new Date()))
  const [endTime, setEndTime] = useState('')
  const [activityType, setActivityType] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [routineEnabled, setRoutineEnabled] = useState(false)
  const [routineDays, setRoutineDays] = useState([0, 1, 2, 3, 4, 5, 6])

  // Apply routine prefill when it changes
  useEffect(() => {
    setRoutineEnabled(!!prefill)
    if (!prefill) return
    if (prefill.childId) setChildId(prefill.childId)
    if (prefill.time) setStartTime(prefill.time)
    if (prefill.value) {
      try {
        const p = JSON.parse(prefill.value)
        if (p.activityType) setActivityType(p.activityType)
        if (p.name) setName(p.name)
        if (p.startTime) setStartTime(p.startTime)
        if (p.endTime) setEndTime(p.endTime)
      } catch {}
    } else if (prefill.name) {
      setName(prefill.name)
    }
  }, [prefill])

  // Apply editLog when opening in edit mode
  useEffect(() => {
    if (!editLog) return
    setChildId(editLog.child_id)
    setLogDate(editLog.date)
    if (editLog.notes) setNotes(editLog.notes)
    try {
      const p = JSON.parse(editLog.value ?? '{}')
      if (p.activityType) setActivityType(p.activityType)
      if (p.name) setName(p.name)
      if (p.startTime) setStartTime(p.startTime)
      if (p.endTime) setEndTime(p.endTime)
    } catch {}
  }, [editLog?.id])

  const autoDuration = useMemo(() => calcDuration(startTime, endTime), [startTime, endTime])

  async function save() {
    if (!childId || !activityType) return
    setSaving(true)
    try {
      // Preserve original routine metadata when editing
      let routineMeta: { routineId?: string; routineName?: string } = {}
      if (editLog) {
        try {
          const orig = JSON.parse(editLog.value ?? '{}')
          if (orig.routineId) routineMeta = { routineId: orig.routineId, routineName: orig.routineName }
        } catch {}
      }
      const value = JSON.stringify({
        activityType,
        name: name || undefined,
        duration: autoDuration || undefined,
        startTime,
        endTime: endTime || undefined,
        ...routineMeta,
      })
      const tagged = tagWithRoutine(value, prefill) ?? value
      if (editLog) {
        await updateChildLog(editLog.id, tagged, notes || null)
        onSaved()
        return
      }
      await saveChildLog(childId, 'activity', tagged, notes || undefined, undefined, logDate)
      if (routineEnabled && !prefill) {
        const routineName = name || ACTIVITY_TYPES.find((a) => a.id === activityType)?.label || 'Activity'
        await saveAsRoutine(childId, 'activity', routineName, value, startTime, routineDays)
      }
      onSaved()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
      <View style={styles.form}>
        <View style={styles.topRow}>
          <ChildSelector selected={childId} onSelect={setChildId} />
          <View style={styles.dateTimeRow}>
            <DateChip value={logDate} onChange={setLogDate} />
            <TimeChip value={startTime} onChange={setStartTime} label="Start" />
            {endTime ? (
              <TimeChip value={endTime} onChange={setEndTime} label="End" />
            ) : (
              <Pressable
                onPress={() => setEndTime(toTimeStr(new Date()))}
                style={[styles.timeChip, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999 }]}
              >
                <Plus size={12} color={colors.textMuted} strokeWidth={2} />
                <Text style={[styles.timeChipLabel, { color: colors.textMuted }]}>End</Text>
              </Pressable>
            )}
          </View>
        </View>
        <View style={[styles.iconBanner, { backgroundColor: brand.phase.ovulation + '15' }]}>
          <Dumbbell size={20} color={brand.phase.ovulation} strokeWidth={2} />
          <Text style={[styles.bannerLabel, { color: colors.text }]}>Log Activity</Text>
          {autoDuration !== '' && (
            <Text style={[styles.autoDuration, { color: brand.phase.ovulation }]}>{autoDuration}</Text>
          )}
        </View>

        {/* Activity type chips */}
        <View style={styles.chipGrid}>
          {ACTIVITY_TYPES.map((a) => {
            const active = activityType === a.id
            return (
              <Pressable
                key={a.id}
                onPress={() => setActivityType(a.id)}
                style={[styles.chip, {
                  backgroundColor: active ? colors.primaryTint : colors.surface,
                  borderColor: active ? colors.primary : colors.border,
                  borderRadius: radius.full,
                }]}
              >
                <Text style={[styles.chipText, { color: active ? colors.primary : colors.text }]}>{a.label}</Text>
              </Pressable>
            )
          })}
        </View>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Activity name (e.g. Soccer practice)"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
        />
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Notes (optional)"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
        />
        <RoutineToggle enabled={routineEnabled} onToggle={setRoutineEnabled} days={routineDays} onDaysChange={setRoutineDays} locked={!!prefill} />
        <SaveButton onPress={save} saving={saving} disabled={!childId || !activityType} onSkip={prefill?.routineId ? onSkip : undefined} />
      </View>
    </ScrollView>
  )
}

// ─── 7. DIAPER FORM ────────────────────────────────────────────────────────

type DiaperType = 'pee' | 'poop' | 'mixed'
type DiaperColor = 'yellow' | 'green' | 'brown' | 'black' | 'red' | 'orange'
type DiaperConsistency = 'liquid' | 'soft' | 'normal' | 'hard'

const DIAPER_TYPES: { id: DiaperType; label: string; emoji: string }[] = [
  { id: 'pee', label: 'Pee', emoji: '💧' },
  { id: 'poop', label: 'Poop', emoji: '💩' },
  { id: 'mixed', label: 'Both', emoji: '🔄' },
]

const DIAPER_COLORS: { id: DiaperColor; label: string; hex: string }[] = [
  { id: 'yellow', label: 'Yellow', hex: '#F4D03F' },
  { id: 'green', label: 'Green', hex: '#58D68D' },
  { id: 'brown', label: 'Brown', hex: '#A04000' },
  { id: 'black', label: 'Black', hex: '#2C2C2C' },
  { id: 'orange', label: 'Orange', hex: '#F39C12' },
  { id: 'red', label: 'Red', hex: '#E74C3C' },
]

const DIAPER_CONSISTENCIES: { id: DiaperConsistency; label: string }[] = [
  { id: 'liquid', label: 'Liquid' },
  { id: 'soft', label: 'Soft' },
  { id: 'normal', label: 'Normal' },
  { id: 'hard', label: 'Hard' },
]

export function DiaperForm({ onSaved, initialDate, editLog }: { onSaved: () => void; initialDate?: string; editLog?: EditLog }) {
  const { colors, radius } = useTheme()
  const children = useChildStore((s) => s.children)

  const [childId, setChildId] = useState(children.length <= 1 ? (children[0]?.id ?? '') : '')
  const [logDate, setLogDate] = useState(initialDate ?? toDateStr(new Date()))
  const [logTime, setLogTime] = useState(toTimeStr(new Date()))
  const [diaperType, setDiaperType] = useState<DiaperType | null>(null)
  const [color, setColor] = useState<DiaperColor | null>(null)
  const [consistency, setConsistency] = useState<DiaperConsistency | null>(null)
  const [photos, setPhotos] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const showPooDetails = diaperType === 'poop' || diaperType === 'mixed'

  useEffect(() => {
    if (!editLog) return
    setChildId(editLog.child_id)
    setLogDate(editLog.date)
    if (editLog.notes) setNotes(editLog.notes)
    if (editLog.photos?.length) setPhotos(editLog.photos)
    try {
      const p = JSON.parse(editLog.value ?? '{}')
      if (p.diaperType) setDiaperType(p.diaperType)
      if (p.color) setColor(p.color)
      if (p.consistency) setConsistency(p.consistency)
      if (p.time) setLogTime(p.time)
    } catch {}
  }, [editLog?.id])

  async function pickPhoto() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: false, quality: 0.7 })
      if (!result.canceled && result.assets[0]) {
        const stable = await stabiliseUri(result.assets[0].uri)
        setPhotos([stable])
      }
    } catch {
      Alert.alert('Error', 'Could not open photo library')
    }
  }

  async function takePhoto() {
    const uri = await launchCameraSafe()
    if (uri) setPhotos([uri])
  }

  async function save() {
    if (!childId || !diaperType) return
    setSaving(true)
    try {
      const value = JSON.stringify({
        diaperType,
        color: showPooDetails ? (color ?? undefined) : undefined,
        consistency: showPooDetails ? (consistency ?? undefined) : undefined,
        time: logTime,
      })
      const uploadedPhotos = photos.length ? await uploadPhotos(photos) : undefined
      if (editLog) {
        await updateChildLog(editLog.id, value, notes || null, uploadedPhotos)
        onSaved()
        return
      }
      await saveChildLog(childId, 'diaper', value, notes || undefined, uploadedPhotos, logDate)
      onSaved()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
      <View style={styles.form}>
        <View style={styles.topRow}>
          <ChildSelector selected={childId} onSelect={setChildId} />
          <View style={styles.dateTimeRow}>
            <DateChip value={logDate} onChange={setLogDate} />
            <TimeChip value={logTime} onChange={setLogTime} label="Time" />
          </View>
        </View>

        <View style={[styles.iconBanner, { backgroundColor: brand.secondary + '15' }]}>
          <Baby size={20} color={brand.secondary} strokeWidth={2} />
          <Text style={[styles.bannerLabel, { color: colors.text }]}>Log Diaper</Text>
        </View>

        {/* Diaper type */}
        <View style={styles.chipGrid}>
          {DIAPER_TYPES.map((t) => {
            const active = diaperType === t.id
            return (
              <Pressable
                key={t.id}
                onPress={() => setDiaperType(t.id)}
                style={[styles.chip, {
                  backgroundColor: active ? brand.secondary + '25' : colors.surface,
                  borderColor: active ? brand.secondary : colors.border,
                  borderRadius: radius.full,
                  gap: 4,
                }]}
              >
                <Text style={{ fontSize: 14 }}>{t.emoji}</Text>
                <Text style={[styles.chipText, { color: active ? brand.secondary : colors.text }]}>{t.label}</Text>
              </Pressable>
            )
          })}
        </View>

        {/* Poop details */}
        {showPooDetails && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Color</Text>
            <View style={[styles.chipGrid, { gap: 8 }]}>
              {DIAPER_COLORS.map((c) => {
                const active = color === c.id
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setColor(c.id)}
                    style={[styles.chip, {
                      backgroundColor: active ? c.hex + '25' : colors.surface,
                      borderColor: active ? c.hex : colors.border,
                      borderRadius: radius.full,
                      gap: 6,
                    }]}
                  >
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.hex }} />
                    <Text style={[styles.chipText, { color: active ? c.hex : colors.text }]}>{c.label}</Text>
                  </Pressable>
                )
              })}
            </View>

            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Consistency</Text>
            <View style={styles.chipGrid}>
              {DIAPER_CONSISTENCIES.map((c) => {
                const active = consistency === c.id
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setConsistency(c.id)}
                    style={[styles.chip, {
                      backgroundColor: active ? colors.primaryTint : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                      borderRadius: radius.full,
                    }]}
                  >
                    <Text style={[styles.chipText, { color: active ? colors.primary : colors.text }]}>{c.label}</Text>
                  </Pressable>
                )
              })}
            </View>
          </>
        )}

        {/* Optional photo */}
        <View style={styles.photoRow}>
          {photos.map((uri, i) => (
            <View key={i} style={{ position: 'relative' }}>
              <Image source={{ uri }} style={[styles.photoThumb, { borderRadius: radius.lg }]} />
              <Pressable
                onPress={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                style={styles.photoDeleteBtn}
                hitSlop={4}
              >
                <X size={14} color="#FFFFFF" strokeWidth={3} />
              </Pressable>
            </View>
          ))}
          {photos.length === 0 && (
            <View style={styles.photoButtons}>
              <Pressable onPress={takePhoto} style={[styles.cameraBtn, { backgroundColor: colors.primary, borderRadius: radius.lg }]}>
                <Camera size={24} color="#FFFFFF" strokeWidth={2} />
              </Pressable>
              <Pressable onPress={pickPhoto} style={[styles.galleryBtn, { backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderRadius: radius.lg }]}>
                <Plus size={20} color={colors.textMuted} strokeWidth={2} />
              </Pressable>
            </View>
          )}
        </View>

        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Notes (optional)"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
        />
        <SaveButton onPress={save} saving={saving} disabled={!childId || !diaperType} />
      </View>
    </ScrollView>
  )
}

// ─── Save Button ───────────────────────────────────────────────────────────

function SaveButton({ onPress, saving, disabled, onSkip }: { onPress: () => void; saving: boolean; disabled?: boolean; onSkip?: () => void }) {
  const { colors, radius } = useTheme()
  return (
    <View style={{ gap: 8 }}>
      {onSkip && (
        <Pressable
          onPress={onSkip}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveBtn,
            {
              backgroundColor: 'transparent',
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              opacity: saving ? 0.4 : 1,
            },
            pressed && { opacity: 0.7 },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MinusCircle size={16} color={colors.textMuted} strokeWidth={2} />
            <Text style={[styles.saveBtnText, { color: colors.textMuted }]}>Skip this time</Text>
          </View>
        </Pressable>
      )}
      <Pressable
        onPress={onPress}
        disabled={saving || disabled}
        style={({ pressed }) => [
          styles.saveBtn,
          { backgroundColor: colors.primary, borderRadius: radius.lg, opacity: disabled ? 0.4 : 1 },
          pressed && !disabled && { transform: [{ scale: 0.98 }], opacity: 0.9 },
        ]}
      >
        {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save</Text>}
      </Pressable>
    </View>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  form: { gap: 16, paddingBottom: 8 },
  topRow: { gap: 10 },
  dateTimeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dateChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1 },
  dateChipText: { fontSize: 13, fontWeight: '700' },
  datePickerWrap: { marginTop: 4, borderWidth: 1, overflow: 'hidden' },
  datePickerDone: { alignItems: 'center', paddingVertical: 10, borderTopWidth: 1 },
  datePickerDoneText: { fontSize: 15, fontWeight: '700' },
  timeChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1 },
  timeChipLabel: { fontSize: 10, fontWeight: '600' },
  timeChipValue: { fontSize: 13, fontWeight: '700' },
  childSelectorWrap: { gap: 6 },
  childSelectorPrompt: { fontSize: 13, fontWeight: '700' },
  childRow: { gap: 8 },
  childChip: { paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1 },
  childChipText: { fontSize: 14, fontWeight: '600' },
  iconBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12 },
  bannerLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  autoDuration: { fontSize: 14, fontWeight: '800' },
  input: { borderWidth: 1, paddingHorizontal: 16, height: 48, fontSize: 15, fontWeight: '500' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', padding: 4 },
  toggleBtn: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  toggleText: { fontSize: 14, fontWeight: '700' },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoThumb: { width: 72, height: 72 },
  photoDeleteBtn: { position: 'absolute', top: -6, right: -6, backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 999, width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  photoButtons: { flexDirection: 'row', gap: 8 },
  cameraBtn: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  galleryBtn: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed' },
  qualityRow: { flexDirection: 'row', gap: 8 },
  qualityBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 6, borderWidth: 1 },
  qualityLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  flagRow: { flexDirection: 'row', gap: 8 },
  flagChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1 },
  flagText: { fontSize: 13, fontWeight: '600' },
  moodRow: { flexDirection: 'row', gap: 8 },
  moodBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 4 },
  moodLabel: { fontSize: 11, fontWeight: '600' },
  saveBtn: { height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  // Scan plate (AI vision)
  scanPlateBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1, marginBottom: 12 },
  scanPlateText: { flex: 1, fontSize: 14, fontWeight: '700' },

  // Calorie banner
  foodTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1.5 },
  foodTagText: { fontSize: 13, fontWeight: '600' },
  foodTagRemove: { fontSize: 18, lineHeight: 20, fontWeight: '400' },
  popupBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  manualCalPopup: { position: 'absolute', left: 24, right: 24, top: '35%', padding: 20, borderWidth: 1 },
  manualCalTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  manualCalSubtitle: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  manualCalBtn: { paddingVertical: 12, alignItems: 'center', borderRadius: 999, borderWidth: 1 },
  manualCalBtnText: { fontSize: 14, fontWeight: '700' },
  calorieBanner: { marginTop: 8, padding: 12, borderWidth: 1 },
  calorieHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  calorieTotalText: { fontSize: 13, fontWeight: '700' },
  calorieMatchList: { gap: 3 },
  calorieMatchRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  calorieMatchDot: { width: 6, height: 6, borderRadius: 3 },
  calorieMatchFood: { flex: 1, fontSize: 12, fontWeight: '500' },
  calorieMatchCals: { fontSize: 12, fontWeight: '600' },

  // Expanded flag fields
  expandedFlag: { padding: 12, gap: 8, borderWidth: 1 },
  expandedFlagLabel: { fontSize: 13, fontWeight: '700' },
  expandedFlagInput: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, fontWeight: '500' },

  // Breast feeding
  lastSideBanner: { padding: 12, borderWidth: 1 },
  lastSideLabel: { fontSize: 13, fontWeight: '500', lineHeight: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  sideRow: { flexDirection: 'row', gap: 8 },
  sideBtn: { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 8, borderWidth: 1 },
  breastIcon: { flexDirection: 'row', gap: 2, alignItems: 'flex-end' },
  breastShape: { width: 22, height: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 3 },
  breastShapeL: { borderTopLeftRadius: 14, borderTopRightRadius: 4, borderBottomLeftRadius: 10, borderBottomRightRadius: 4 },
  breastShapeR: { borderTopLeftRadius: 4, borderTopRightRadius: 14, borderBottomLeftRadius: 4, borderBottomRightRadius: 10 },
  breastNipple: { width: 5, height: 5, borderRadius: 3 },
  sideBtnText: { fontSize: 13, fontWeight: '700' },
  recommendedTag: { position: 'absolute', top: 4, right: 4, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  sideChipSmall: { flex: 1, alignItems: 'center', paddingVertical: 8, borderWidth: 1 },
  sideChipSmallText: { fontSize: 13, fontWeight: '600' },

  // Live timer
  timerWrap: { padding: 20, alignItems: 'center', gap: 16 },
  timerSideIndicator: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timerSideLabel: { fontSize: 16, fontWeight: '700' },
  timerDisplay: { fontSize: 56, fontWeight: '200', letterSpacing: 2, fontVariant: ['tabular-nums'] },
  timerBreakdown: { flexDirection: 'row', gap: 12, width: '100%' },
  timerBreakdownItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  timerBreakdownDot: { width: 8, height: 8, borderRadius: 4 },
  timerBreakdownLabel: { fontSize: 14, fontWeight: '700' },
  timerBreakdownTime: { fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  switchAlert: { width: '100%', padding: 12, borderWidth: 1, alignItems: 'center' },
  switchAlertText: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  timerActions: { flexDirection: 'row', gap: 10, width: '100%' },
  timerSwitchBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderWidth: 1 },
  timerSwitchText: { fontSize: 14, fontWeight: '700' },
  timerStopBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  timerStopText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  switchTargetRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderWidth: 1 },
  switchTargetLabel: { flex: 1, fontSize: 13, fontWeight: '500' },
  switchTargetChip: { paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  switchTargetChipText: { fontSize: 12, fontWeight: '700' },
  manualDivider: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  manualDividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  manualDividerText: { fontSize: 12, fontWeight: '500' },
})
