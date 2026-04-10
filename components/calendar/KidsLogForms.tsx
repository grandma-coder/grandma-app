/**
 * Kids Log Forms — 5 bottom sheet forms for child activity tracking.
 *
 * Forms: Feeding/Food (complex), Sleep, Health Event, Mood, Memory
 * Persist to Supabase child_logs table.
 */

import { useState, useMemo } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  Alert,
  ScrollView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import * as ImagePicker from 'expo-image-picker'
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
} from 'lucide-react-native'
import { useTheme, brand } from '../../constants/theme'
import { useChildStore } from '../../store/useChildStore'
import { supabase } from '../../lib/supabase'
import { estimateCalories, categoryColor } from '../../lib/foodCalories'
import type { ChildWithRole } from '../../types'

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
    date: date ?? new Date().toISOString().split('T')[0],
    type,
    value: value ?? null,
    notes: notes ?? null,
    photos: photos ?? [],
    logged_by: session.user.id,
  })
  if (error) throw error
}

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

export function FeedingForm({ onSaved, initialDate }: { onSaved: () => void; initialDate?: string }) {
  const { colors, radius } = useTheme()
  const children = useChildStore((s) => s.children)
  const activeChild = useChildStore((s) => s.activeChild)

  const [childId, setChildId] = useState(children.length <= 1 ? (children[0]?.id ?? '') : '')
  const [logDate, setLogDate] = useState(initialDate ?? toDateStr(new Date()))
  const [startTime, setStartTime] = useState(toTimeStr(new Date()))
  const [feedType, setFeedType] = useState<FeedingType>('solids')
  const [meal, setMeal] = useState<MealMoment | null>(null)
  const [photos, setPhotos] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [quality, setQuality] = useState<EatQuality | null>(null)
  const [isNewFood, setIsNewFood] = useState(false)
  const [newFoodName, setNewFoodName] = useState('')
  const [hasReaction, setHasReaction] = useState(false)
  const [reactionFood, setReactionFood] = useState('')
  const [reactionDesc, setReactionDesc] = useState('')
  const [saving, setSaving] = useState(false)

  // Breast/bottle fields
  const [duration, setDuration] = useState('')
  const [amount, setAmount] = useState('')

  // Live calorie estimation
  const calorieEstimate = useMemo(() => estimateCalories(description), [description])

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: 4,
    })
    if (!result.canceled) {
      setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 4))
    }
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) return Alert.alert('Permission needed', 'Camera access is required')
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 })
    if (!result.canceled && result.assets[0]) {
      setPhotos((prev) => [...prev, result.assets[0].uri].slice(0, 4))
    }
  }

  async function save() {
    if (!childId) return
    setSaving(true)
    try {
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
          estimatedCals: calorieEstimate.totalCals || undefined,
          matchedFoods: calorieEstimate.matches.length > 0
            ? calorieEstimate.matches.map((m) => m.food)
            : undefined,
        })
        await saveChildLog(childId, 'food', value, description || undefined, photos, logDate)
      } else {
        const value = JSON.stringify({
          feedType,
          time: startTime,
          duration: duration || undefined,
          amount: amount || undefined,
        })
        await saveChildLog(childId, 'feeding', value, undefined, undefined, logDate)
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
                <Image key={i} source={{ uri }} style={[styles.photoThumb, { borderRadius: radius.lg }]} />
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

            {/* Description + live calorie estimate */}
            <View>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="What did they eat? (e.g. rice, chicken, banana)"
                placeholderTextColor={colors.textMuted}
                multiline
                style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, minHeight: 48 }]}
              />
              {calorieEstimate.matches.length > 0 && (
                <View style={[styles.calorieBanner, { backgroundColor: brand.success + '10', borderColor: brand.success + '30', borderRadius: radius.lg }]}>
                  <View style={styles.calorieHeader}>
                    <Utensils size={14} color={brand.success} strokeWidth={2} />
                    <Text style={[styles.calorieTotalText, { color: brand.success }]}>
                      ~{calorieEstimate.totalCals} kcal estimated
                    </Text>
                  </View>
                  <View style={styles.calorieMatchList}>
                    {calorieEstimate.matches.map((m) => (
                      <View key={m.food} style={styles.calorieMatchRow}>
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
        ) : (
          <>
            {/* Breast / Bottle */}
            <TextInput
              value={duration}
              onChangeText={setDuration}
              placeholder={feedType === 'breast' ? 'Duration (minutes)' : 'Amount (ml)'}
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
            />
          </>
        )}

        <SaveButton onPress={save} saving={saving} disabled={!childId} />
      </View>
    </ScrollView>
  )
}

// ─── 2. SLEEP FORM ─────────────────────────────────────────────────────────

export function SleepForm({ onSaved, initialDate }: { onSaved: () => void; initialDate?: string }) {
  const { colors, radius } = useTheme()
  const children = useChildStore((s) => s.children)
  const activeChild = useChildStore((s) => s.activeChild)

  const [childId, setChildId] = useState(children.length <= 1 ? (children[0]?.id ?? '') : '')
  const [logDate, setLogDate] = useState(initialDate ?? toDateStr(new Date()))
  const [startTime, setStartTime] = useState(toTimeStr(new Date()))
  const [endTime, setEndTime] = useState('')
  const [quality, setQuality] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const autoDuration = useMemo(() => calcDuration(startTime, endTime), [startTime, endTime])

  const qualities = ['Great', 'Good', 'Restless', 'Poor']

  async function save() {
    if (!childId) return
    setSaving(true)
    try {
      const value = JSON.stringify({ duration: autoDuration || undefined, quality, startTime, endTime: endTime || undefined })
      await saveChildLog(childId, 'sleep', value, notes || undefined, undefined, logDate)
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
      <SaveButton onPress={save} saving={saving} disabled={!childId} />
    </View>
  )
}

// ─── 3. HEALTH EVENT FORM ──────────────────────────────────────────────────

const HEALTH_EVENTS = ['Temperature', 'Vaccine', 'Medicine', 'Doctor visit', 'Injury', 'Other']

export function HealthEventForm({ onSaved, initialDate }: { onSaved: () => void; initialDate?: string }) {
  const { colors, radius } = useTheme()
  const children = useChildStore((s) => s.children)
  const activeChild = useChildStore((s) => s.activeChild)

  const [childId, setChildId] = useState(children.length <= 1 ? (children[0]?.id ?? '') : '')
  const [logDate, setLogDate] = useState(initialDate ?? toDateStr(new Date()))
  const [startTime, setStartTime] = useState(toTimeStr(new Date()))
  const [eventType, setEventType] = useState<string | null>(null)
  const [value, setValue] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!childId || !eventType) return
    setSaving(true)
    try {
      const logType = eventType === 'Temperature' ? 'temperature'
        : eventType === 'Vaccine' ? 'vaccine'
        : eventType === 'Medicine' ? 'medicine'
        : 'note'
      await saveChildLog(childId, logType, value || eventType, notes || undefined, undefined, logDate)
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
      <SaveButton onPress={save} saving={saving} disabled={!childId || !eventType} />
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

export function KidsMoodForm({ onSaved, initialDate }: { onSaved: () => void; initialDate?: string }) {
  const { colors, radius } = useTheme()
  const children = useChildStore((s) => s.children)
  const activeChild = useChildStore((s) => s.activeChild)

  const [childId, setChildId] = useState(children.length <= 1 ? (children[0]?.id ?? '') : '')
  const [logDate, setLogDate] = useState(initialDate ?? toDateStr(new Date()))
  const [startTime, setStartTime] = useState(toTimeStr(new Date()))
  const [mood, setMood] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!childId || !mood) return
    setSaving(true)
    try {
      await saveChildLog(childId, 'mood', mood, notes || undefined, undefined, logDate)
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
      <SaveButton onPress={save} saving={saving} disabled={!childId || !mood} />
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
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: 4,
    })
    if (!result.canceled) {
      setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 4))
    }
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) return Alert.alert('Permission needed', 'Camera access is required')
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 })
    if (!result.canceled && result.assets[0]) {
      setPhotos((prev) => [...prev, result.assets[0].uri].slice(0, 4))
    }
  }

  async function save() {
    if (!childId) return
    setSaving(true)
    try {
      await saveChildLog(childId, 'photo', 'memory', caption || undefined, photos, logDate)
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
          <Image key={i} source={{ uri }} style={[styles.photoThumb, { borderRadius: radius.lg }]} />
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

export function ActivityForm({ onSaved, initialDate }: { onSaved: () => void; initialDate?: string }) {
  const { colors, radius } = useTheme()
  const children = useChildStore((s) => s.children)

  const [childId, setChildId] = useState(children.length <= 1 ? (children[0]?.id ?? '') : '')
  const [logDate, setLogDate] = useState(initialDate ?? toDateStr(new Date()))
  const [startTime, setStartTime] = useState(toTimeStr(new Date()))
  const [endTime, setEndTime] = useState('')
  const [activityType, setActivityType] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const autoDuration = useMemo(() => calcDuration(startTime, endTime), [startTime, endTime])

  async function save() {
    if (!childId || !activityType) return
    setSaving(true)
    try {
      const value = JSON.stringify({
        activityType,
        name: name || undefined,
        duration: autoDuration || undefined,
        startTime,
        endTime: endTime || undefined,
      })
      await saveChildLog(childId, 'activity', value, notes || undefined, undefined, logDate)
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
        <SaveButton onPress={save} saving={saving} disabled={!childId || !activityType} />
      </View>
    </ScrollView>
  )
}

// ─── Save Button ───────────────────────────────────────────────────────────

function SaveButton({ onPress, saving, disabled }: { onPress: () => void; saving: boolean; disabled?: boolean }) {
  const { colors, radius } = useTheme()
  return (
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

  // Calorie banner
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
})
