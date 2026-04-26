/**
 * Pregnancy Log Forms — 15 log forms for pregnancy tracking.
 *
 * Each form saves to Supabase pregnancy_logs table.
 * Forms: Mood, Symptoms, Appointment, ExamResult, KickCount,
 *        Sleep, Exercise, Nutrition, Kegel, Water, Vitamins,
 *        NestingTask, BirthPrepTask, ContractionTimer, Weight
 */

import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import {
  Check,
  Hand,
} from 'lucide-react-native'
import Svg, { Path } from 'react-native-svg'
import {
  useTheme,
  brand,
  stickers as stickersLight,
  stickersDark,
} from '../../constants/theme'
import { supabase } from '../../lib/supabase'
import { queryClient } from '../../lib/queryClient'
import { LogFormSticker } from './LogFormSticker'
import { MoodFace } from '../stickers/RewardStickers'
import { Heart as HeartSticker, Burst as BurstSticker, Star as StarSticker } from '../stickers/BrandStickers'
import { moodFaceVariant, moodFaceFill } from '../../lib/moodFace'
import { ExamForm } from '../exams/ExamForm'
import { StepSlider } from '../ui/StepSlider'

// ─── Shared save helper ────────────────────────────────────────────────────

async function savePregnancyLog(
  date: string,
  type: string,
  value?: string,
  notes?: string
) {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const { error } = await supabase.from('pregnancy_logs').insert({
    user_id: session.user.id,
    log_date: date,
    log_type: type,
    value: value ?? null,
    notes: notes ?? null,
  })
  if (error) throw error
  await queryClient.invalidateQueries({ queryKey: ['pregnancy-week-logs'] })
}

// ─── Mood Form ─────────────────────────────────────────────────────────────

const MOODS = [
  { id: 'excited', label: 'Excited' },
  { id: 'happy', label: 'Happy' },
  { id: 'okay', label: 'Okay' },
  { id: 'anxious', label: 'Anxious' },
  { id: 'energetic', label: 'Energetic' },
] as const

export function PregnancyMoodForm({
  date,
  onSaved,
}: {
  date: string
  onSaved: () => void
}) {
  const { colors, radius, isDark } = useTheme()
  const s = isDark ? stickersDark : stickersLight
  const [mood, setMood] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!mood) return
    setSaving(true)
    try {
      await savePregnancyLog(date, 'mood', mood, notes || undefined)
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <LogFormSticker
        type="mood"
        label="How are you feeling today?"
        tint={s.yellowSoft}
      />
      <View style={styles.moodRow}>
        {MOODS.map((m) => {
          const active = mood === m.id
          return (
            <Pressable
              key={m.id}
              onPress={() => setMood(m.id)}
              style={[
                styles.moodBtn,
                {
                  backgroundColor: active ? brand.pregnancy + '24' : colors.surface,
                  borderColor: active ? brand.pregnancy : colors.border,
                  borderRadius: radius.lg,
                },
              ]}
            >
              <MoodFace
                variant={moodFaceVariant(m.id)}
                fill={moodFaceFill(m.id)}
                size={44}
              />
              <Text
                style={[
                  styles.moodLabel,
                  { color: active ? brand.pregnancy : colors.textSecondary },
                ]}
              >
                {m.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="How are you feeling?"
        placeholderTextColor={colors.textMuted}
        multiline
        style={[
          styles.inputMultiline,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.lg,
          },
        ]}
      />
      <SaveButton onPress={save} saving={saving} disabled={!mood} />
    </View>
  )
}

// ─── Symptoms Form ─────────────────────────────────────────────────────────

const SYMPTOMS = [
  'Nausea',
  'Fatigue',
  'Back pain',
  'Headache',
  'Swelling',
  'Heartburn',
  'Insomnia',
  'Cramps',
  'Mood swings',
  'Cravings',
  'Braxton Hicks',
  'Shortness of breath',
]

export function PregnancySymptomsForm({
  date,
  onSaved,
}: {
  date: string
  onSaved: () => void
}) {
  const { colors, radius, isDark } = useTheme()
  const s = isDark ? stickersDark : stickersLight
  const [selected, setSelected] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  function toggle(sym: string) {
    setSelected((prev) =>
      prev.includes(sym) ? prev.filter((x) => x !== sym) : [...prev, sym]
    )
  }

  async function save() {
    if (selected.length === 0) return
    setSaving(true)
    try {
      await savePregnancyLog(date, 'symptom', selected.join(', '), notes || undefined)
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <LogFormSticker
        type="symptom"
        label="What's going on with your body?"
        tint={s.peachSoft}
      />
      <View style={styles.chipGrid}>
        {SYMPTOMS.map((sym) => {
          const active = selected.includes(sym)
          return (
            <Pressable
              key={sym}
              onPress={() => toggle(sym)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? brand.pregnancy + '24' : colors.surface,
                  borderColor: active ? brand.pregnancy : colors.border,
                  borderRadius: radius.full,
                },
              ]}
            >
              {active && (
                <Check size={12} color={brand.pregnancy} strokeWidth={3} />
              )}
              <Text
                style={[
                  styles.chipText,
                  { color: active ? brand.pregnancy : colors.text },
                ]}
              >
                {sym}
              </Text>
            </Pressable>
          )
        })}
      </View>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Additional notes"
        placeholderTextColor={colors.textMuted}
        multiline
        style={[
          styles.inputMultiline,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.lg,
          },
        ]}
      />
      <SaveButton
        onPress={save}
        saving={saving}
        disabled={selected.length === 0}
      />
    </View>
  )
}

// ─── Appointment Form ──────────────────────────────────────────────────────

const APPOINTMENT_TYPES = [
  'Regular checkup',
  'Ultrasound',
  'Blood test',
  'Glucose test',
  'Group B strep',
  'Specialist',
  'Other',
]

export function AppointmentForm({
  date,
  onSaved,
}: {
  date: string
  onSaved: () => void
}) {
  const { colors, radius, isDark } = useTheme()
  const s = isDark ? stickersDark : stickersLight
  const [type, setType] = useState<string | null>(null)
  const [customType, setCustomType] = useState('')
  const [doctor, setDoctor] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const isOther = type === 'Other'
  const finalType = isOther ? customType.trim() : type
  const canSave = !!finalType

  async function save() {
    if (!finalType) return
    setSaving(true)
    try {
      await savePregnancyLog(
        date,
        'appointment',
        finalType,
        JSON.stringify({ doctor: doctor || undefined, notes: notes || undefined })
      )
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  // Sticker-on-paper palette (mode = pregnancy → lavender accent)
  const ST_INK = '#141313'
  const ST_PAPER = isDark ? colors.surface : '#FFFEF8'
  const ST_CREAM = isDark ? colors.surfaceRaised : '#F7F0DF'
  const ST_LAVENDER = isDark ? '#C4B5EF' : brand.pregnancy
  const ST_LAVENDER_SOFT = '#E0D6F4'
  const inkBorder = isDark ? colors.border : ST_INK
  const inkText = isDark ? colors.text : ST_INK

  return (
    <View style={styles.form}>
      <LogFormSticker
        type="appointment"
        label={`Visit on ${formatDate(date)}`}
        tint={s.yellowSoft}
      />

      {/* Type chips — sticker pills */}
      <View style={styles.chipGrid}>
        {APPOINTMENT_TYPES.map((t) => {
          const active = type === t
          return (
            <Pressable
              key={t}
              onPress={() => setType(t)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: active ? ST_LAVENDER_SOFT : ST_CREAM,
                  borderColor: isDark && !active ? colors.border : ST_INK,
                  borderWidth: 1.5,
                  borderRadius: 999,
                  shadowColor: ST_INK,
                  shadowOffset: { width: 0, height: active ? (pressed ? 1 : 2) : 0 },
                  shadowOpacity: active ? (1) : 0,
                  shadowRadius: 0,
                  elevation: active ? 3 : 0,
                  transform: [{ translateY: active && pressed ? 1 : 0 }],
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color: inkText,
                    fontFamily: active ? 'DMSans_700Bold' : 'DMSans_600SemiBold',
                  },
                ]}
              >
                {t}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {isOther && (
        <TextInput
          value={customType}
          onChangeText={setCustomType}
          placeholder="Describe the appointment"
          placeholderTextColor={isDark ? colors.textMuted : '#8A8480'}
          autoFocus
          style={[
            styles.input,
            {
              color: inkText,
              backgroundColor: ST_CREAM,
              borderColor: inkBorder,
              borderWidth: 1.5,
              borderRadius: 999,
              height: 52,
            },
          ]}
        />
      )}

      <TextInput
        value={doctor}
        onChangeText={setDoctor}
        placeholder="Doctor name (optional)"
        placeholderTextColor={isDark ? colors.textMuted : '#8A8480'}
        style={[
          styles.input,
          {
            color: inkText,
            backgroundColor: ST_CREAM,
            borderColor: inkBorder,
            borderWidth: 1.5,
            borderRadius: 999,
            height: 56,
            paddingVertical: 0,
            textAlignVertical: 'center',
          },
        ]}
      />

      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Notes (optional)"
        placeholderTextColor={isDark ? colors.textMuted : '#8A8480'}
        multiline
        style={[
          styles.inputMultiline,
          {
            color: inkText,
            backgroundColor: ST_CREAM,
            borderColor: inkBorder,
            borderWidth: 1.5,
            borderRadius: 22,
          },
        ]}
      />

      <SaveButton onPress={save} saving={saving} disabled={!canSave} />
    </View>
  )
}

// ─── Exam Result Form ──────────────────────────────────────────────────────
// Delegates to the shared cross-behavior ExamForm (photo + AI extract + save
// into the unified `exams` table).

export function ExamResultForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  return <ExamForm behavior="pregnancy" date={date} onSaved={onSaved} />
}

// ─── Kick Count Form ───────────────────────────────────────────────────────

export function KickCountForm({
  date,
  onSaved,
}: {
  date: string
  onSaved: () => void
}) {
  const { colors, radius, isDark } = useTheme()
  const s = isDark ? stickersDark : stickersLight
  const [count, setCount] = useState(0)
  const [startTime] = useState(() => Date.now())
  const [saving, setSaving] = useState(false)

  async function save() {
    if (count === 0) return
    const durationMin = Math.round((Date.now() - startTime) / 60000)
    setSaving(true)
    try {
      await savePregnancyLog(
        date,
        'kick_count',
        count.toString(),
        JSON.stringify({ durationMinutes: durationMin })
      )
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  const goal = 10
  const goalReached = count >= goal
  const dots = Array.from({ length: goal }, (_, i) => i < count)
  const ink = '#141313'
  const cream = '#FFFEF8'
  const pinkSticker = '#F2B2C7'

  return (
    <View style={styles.form}>
      <LogFormSticker
        type="kick_count"
        label="Count baby's kicks"
        tint={s.pinkSoft}
      />

      <View style={styles.kickCenter}>
        {/* Big tap button — sticker style with ink border + corner stickers */}
        <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center', paddingTop: 14, paddingBottom: 6 }}>
          <View style={{ position: 'absolute', top: -2, left: 14, transform: [{ rotate: '-18deg' }], opacity: 0.85 }} pointerEvents="none">
            <HeartSticker size={28} fill={pinkSticker} stroke={ink} />
          </View>
          <View style={{ position: 'absolute', top: 8, right: 14, transform: [{ rotate: '20deg' }], opacity: 0.85 }} pointerEvents="none">
            <StarSticker size={26} fill="#F5D652" stroke={ink} />
          </View>
          <View style={{ position: 'absolute', bottom: 6, right: 36, transform: [{ rotate: '-12deg' }], opacity: 0.7 }} pointerEvents="none">
            <BurstSticker size={22} fill="#9DC3E8" stroke={ink} />
          </View>

          <Pressable
            onPress={() => setCount((c) => c + 1)}
            style={({ pressed }) => [
              {
                width: 168,
                height: 168,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: goalReached ? '#BDD48C' : pinkSticker,
                borderWidth: 2.5,
                borderColor: ink,
                shadowColor: ink,
                shadowOpacity: pressed ? 0.05 : 0.15,
                shadowRadius: pressed ? 4 : 12,
                shadowOffset: { width: 0, height: pressed ? 2 : 6 },
                transform: [{ scale: pressed ? 0.96 : 1 }],
              },
            ]}
          >
            <View style={{
              width: 140,
              height: 140,
              borderRadius: 999,
              backgroundColor: cream,
              borderWidth: 1.5,
              borderColor: ink,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}>
              <Hand size={42} color={ink} strokeWidth={2} />
              <Text style={{ fontSize: 12, fontFamily: 'DMSans_700Bold', color: ink, letterSpacing: 2 }}>TAP</Text>
            </View>
          </Pressable>
        </View>

        {/* Big count — Fraunces */}
        <Text style={{
          fontSize: 56,
          fontFamily: 'Fraunces_600SemiBold',
          color: isDark ? colors.text : ink,
          letterSpacing: -1.5,
          lineHeight: 60,
          marginTop: 4,
        }}>
          {count}
          <Text style={{
            fontSize: 22,
            fontFamily: 'Fraunces_600SemiBold',
            color: isDark ? colors.textMuted : 'rgba(20,19,19,0.55)',
            letterSpacing: -0.4,
          }}>{count === 1 ? ' kick' : ' kicks'}</Text>
        </Text>

        {/* Goal dot ring */}
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
          {dots.map((filled, i) => (
            <View
              key={i}
              style={{
                width: 11,
                height: 11,
                borderRadius: 999,
                backgroundColor: filled ? (goalReached ? '#BDD48C' : pinkSticker) : 'transparent',
                borderWidth: 1.5,
                borderColor: filled ? ink : (isDark ? colors.border : 'rgba(20,19,19,0.22)'),
              }}
            />
          ))}
        </View>

        <Text style={{
          fontSize: 13,
          fontFamily: 'DMSans_500Medium',
          color: isDark ? colors.textMuted : 'rgba(20,19,19,0.55)',
          textAlign: 'center',
          marginTop: 6,
        }}>
          {goalReached
            ? 'Goal reached! Great session.'
            : `Goal: 10 kicks in 2 hours`}
        </Text>
      </View>

      <SaveButton
        onPress={save}
        saving={saving}
        disabled={count === 0}
        label="Save Session"
      />
    </View>
  )
}

// ─── Shared Save Button ────────────────────────────────────────────────────

function SaveButton({
  onPress,
  saving,
  disabled,
  label,
}: {
  onPress: () => void
  saving: boolean
  disabled?: boolean
  label?: string
}) {
  const { colors, isDark } = useTheme()
  const ST_INK = '#141313'
  const ST_LAVENDER = isDark ? '#C4B5EF' : brand.pregnancy
  const ST_CREAM = isDark ? colors.surfaceRaised : '#F7F0DF'
  const isDisabled = !!disabled
  return (
    <Pressable
      onPress={onPress}
      disabled={saving || isDisabled}
      style={({ pressed }) => [
        styles.saveBtn,
        {
          backgroundColor: isDisabled ? ST_CREAM : ST_LAVENDER,
          borderColor: isDark && isDisabled ? colors.border : ST_INK,
          borderWidth: 2,
          borderRadius: 999,
          shadowColor: ST_INK,
          shadowOffset: { width: 0, height: pressed ? 2 : 4 },
          shadowOpacity: 1,
          shadowRadius: 0,
          elevation: 5,
          transform: [{ translateY: pressed && !isDisabled ? 2 : 0 }],
          opacity: isDisabled ? 0.55 : 1,
        },
      ]}
    >
      {saving ? (
        <ActivityIndicator color={isDisabled ? colors.textMuted : '#FFFEF8'} />
      ) : (
        <Text
          style={[
            styles.saveBtnText,
            { color: isDisabled ? (isDark ? colors.textMuted : '#6E6763') : '#FFFEF8' },
          ]}
        >
          {label ?? 'Save'}
        </Text>
      )}
    </Pressable>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

// ─── Sleep Log Form ────────────────────────────────────────────────────────

export function SleepLogForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, radius, isDark } = useTheme()
  const s = isDark ? stickersDark : stickersLight
  const [hours, setHours] = useState(7)
  const [quality, setQuality] = useState(5)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await savePregnancyLog(date, 'sleep', hours.toString(), JSON.stringify({ quality }))
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <LogFormSticker
        type="sleep"
        label={`Sleep on ${formatDate(date)}`}
        tint={s.lilacSoft}
      />
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Hours slept</Text>
      <StepSlider
        min={3}
        max={12}
        value={hours}
        onChange={setHours}
        color={brand.pregnancy}
        unit={hours === 1 ? 'hour' : 'hours'}
      />
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Quality (1–10)</Text>
      <StepSlider
        min={1}
        max={10}
        value={quality}
        onChange={setQuality}
        color={brand.pregnancy}
      />
      <SaveButton onPress={save} saving={saving} disabled={false} />
    </View>
  )
}

// ─── Exercise Log Form ─────────────────────────────────────────────────────

const EXERCISE_TYPES = ['Yoga', 'Walk', 'Swim', 'Stretching', 'Pilates', 'Other']

export function ExerciseLogForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, radius, isDark } = useTheme()
  const s = isDark ? stickersDark : stickersLight
  const [exerciseType, setExerciseType] = useState<string | null>(null)
  const [customType, setCustomType] = useState('')
  const [minutes, setMinutes] = useState(30)
  const [saving, setSaving] = useState(false)

  const isOther = exerciseType === 'Other'
  const finalType = isOther ? customType.trim() : exerciseType
  const canSave = !!finalType

  async function save() {
    if (!finalType) return
    setSaving(true)
    try {
      await savePregnancyLog(date, 'exercise', minutes.toString(), JSON.stringify({ type: finalType }))
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <LogFormSticker
        type="exercise"
        label={`Movement on ${formatDate(date)}`}
        tint={s.greenSoft}
      />
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Type</Text>
      <View style={styles.chipRow}>
        {EXERCISE_TYPES.map((t) => (
          <Pressable
            key={t}
            onPress={() => setExerciseType(t)}
            style={[
              styles.chip,
              {
                backgroundColor: exerciseType === t ? brand.pregnancy + '24' : colors.surface,
                borderColor: exerciseType === t ? brand.pregnancy : colors.border,
                borderRadius: radius.full,
              },
            ]}
          >
            <Text style={[styles.chipText, { color: exerciseType === t ? brand.pregnancy : colors.text }]}>{t}</Text>
          </Pressable>
        ))}
      </View>
      {isOther && (
        <TextInput
          value={customType}
          onChangeText={setCustomType}
          placeholder="What kind of movement?"
          placeholderTextColor={colors.textMuted}
          autoFocus
          style={[
            styles.input,
            {
              color: colors.text,
              backgroundColor: colors.surface,
              borderColor: brand.pregnancy,
              borderRadius: radius.lg,
            },
          ]}
        />
      )}
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Minutes</Text>
      <StepSlider
        min={5}
        max={120}
        value={minutes}
        onChange={setMinutes}
        color={brand.pregnancy}
        unit="min"
      />
      <SaveButton onPress={save} saving={saving} disabled={!canSave} />
    </View>
  )
}

// ─── Nutrition Log Form ────────────────────────────────────────────────────

const NUTRITION_TAGS = ['Iron', 'Folic acid', 'Protein', 'Calcium', 'DHA', 'Vitamin D']

export function NutritionLogForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, radius, isDark } = useTheme()
  const s = isDark ? stickersDark : stickersLight
  const [tags, setTags] = useState<string[]>([])
  const [nutritionNotes, setNutritionNotes] = useState('')
  const [saving, setSaving] = useState(false)

  function toggle(tag: string) {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])
  }

  async function save() {
    if (tags.length === 0) return
    setSaving(true)
    try {
      await savePregnancyLog(date, 'nutrition', tags.join(','), nutritionNotes || undefined)
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <LogFormSticker
        type="nutrition"
        label={`Nourish on ${formatDate(date)}`}
        tint={s.greenSoft}
      />
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Nutrients covered today</Text>
      <View style={styles.chipRow}>
        {NUTRITION_TAGS.map((tag) => {
          const active = tags.includes(tag)
          return (
            <Pressable
              key={tag}
              onPress={() => toggle(tag)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? brand.pregnancy + '24' : colors.surface,
                  borderColor: active ? brand.pregnancy : colors.border,
                  borderRadius: radius.full,
                },
              ]}
            >
              <Text style={[styles.chipText, { color: active ? brand.pregnancy : colors.text }]}>{tag}</Text>
            </Pressable>
          )
        })}
      </View>
      <TextInput
        value={nutritionNotes}
        onChangeText={setNutritionNotes}
        placeholder="Notes (optional)"
        placeholderTextColor={colors.textMuted}
        multiline
        style={[styles.inputMultiline, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
      />
      <SaveButton onPress={save} saving={saving} disabled={tags.length === 0} />
    </View>
  )
}

// ─── Kegel Log Form ────────────────────────────────────────────────────────

export function KegelLogForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, radius, isDark } = useTheme()
  const s = isDark ? stickersDark : stickersLight
  const [sets, setSets] = useState(3)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await savePregnancyLog(date, 'kegel', sets.toString(), undefined)
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <LogFormSticker
        type="kegel"
        label="Pelvic floor practice"
        tint={s.lilacSoft}
      />
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Sets completed</Text>
      <StepSlider
        min={1}
        max={20}
        value={sets}
        onChange={setSets}
        color={brand.pregnancy}
        unit={sets === 1 ? 'set' : 'sets'}
      />
      <SaveButton onPress={save} saving={saving} disabled={false} />
    </View>
  )
}

// ─── Water Log Form ────────────────────────────────────────────────────────

export function WaterLogForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, isDark, font } = useTheme()
  const s = isDark ? stickersDark : stickersLight
  const [glasses, setGlasses] = useState(1)
  const [saving, setSaving] = useState(false)

  const GOAL = 8
  const remaining = Math.max(0, GOAL - glasses)
  const ink = isDark ? colors.text : '#141313'
  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.10)'
  const dropFill = '#9DC3E8'                                  // sticker blue
  const dropMuted = isDark ? colors.border : 'rgba(20,19,19,0.18)'

  async function save() {
    setSaving(true)
    try {
      await savePregnancyLog(date, 'water', glasses.toString(), undefined)
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  const hint =
    glasses >= GOAL ? 'Beautifully hydrated today.'
    : glasses >= GOAL / 2 ? `Halfway there — ${remaining} more to go.`
    : `${remaining} more to reach today's goal.`

  return (
    <View style={styles.form}>
      <LogFormSticker type="water" label="Hydration check-in" tint={s.blueSoft} />

      {/* Counter card */}
      <View style={[styles.waterCard, { backgroundColor: paper, borderColor: paperBorder }]}>
        <Text style={[styles.waterMetaLabel, { color: ink, fontFamily: font.bodySemiBold }]}>
          GLASSES TODAY
        </Text>

        <View style={styles.waterCounterRow}>
          <Pressable
            onPress={() => setGlasses((g) => Math.max(0, g - 1))}
            hitSlop={8}
            style={({ pressed }) => [
              styles.waterStepBtn,
              { backgroundColor: paper, borderColor: paperBorder },
              pressed && { transform: [{ scale: 0.94 }], opacity: 0.85 },
            ]}
          >
            <Text style={[styles.waterStepText, { color: ink, fontFamily: font.display }]}>−</Text>
          </Pressable>

          <Text style={[styles.waterValue, { color: ink, fontFamily: font.display }]}>
            {glasses}
            <Text style={[styles.waterValueUnit, { color: ink, fontFamily: font.italic }]}>
              /{GOAL}
            </Text>
          </Text>

          <Pressable
            onPress={() => setGlasses((g) => Math.min(20, g + 1))}
            hitSlop={8}
            style={({ pressed }) => [
              styles.waterStepBtn,
              { backgroundColor: paper, borderColor: paperBorder },
              pressed && { transform: [{ scale: 0.94 }], opacity: 0.85 },
            ]}
          >
            <Text style={[styles.waterStepText, { color: ink, fontFamily: font.display }]}>+</Text>
          </Pressable>
        </View>

        {/* Droplet progress tally */}
        <View style={styles.waterDropletRow}>
          {Array.from({ length: GOAL }, (_, i) => (
            <Droplet key={i} filled={i < glasses} fill={dropFill} stroke={ink} muted={dropMuted} />
          ))}
        </View>

        <Text style={[styles.waterHint, { color: ink, fontFamily: font.italic }]}>
          {hint}
        </Text>
      </View>

      <SaveButton onPress={save} saving={saving} disabled={false} />
    </View>
  )
}

function Droplet({ filled, fill, stroke, muted }: { filled: boolean; fill: string; stroke: string; muted: string }) {
  return (
    <Svg width={18} height={24} viewBox="0 0 20 26">
      <Path
        d="M10 2 C5.5 9 2.5 14 2.5 18 C2.5 22.4 5.9 25.5 10 25.5 C14.1 25.5 17.5 22.4 17.5 18 C17.5 14 14.5 9 10 2 Z"
        fill={filled ? fill : 'none'}
        stroke={filled ? stroke : muted}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// ─── Vitamins Log Form ─────────────────────────────────────────────────────

export function VitaminsLogForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, isDark } = useTheme()
  const s = isDark ? stickersDark : stickersLight
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await savePregnancyLog(date, 'vitamins', '1', undefined)
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <LogFormSticker
        type="vitamins"
        label="Prenatal vitamins"
        tint={s.greenSoft}
      />
      <Text style={[styles.fieldLabel, { color: colors.textSecondary, textAlign: 'center' }]}>
        Did you take your prenatal vitamins today?
      </Text>
      <SaveButton onPress={save} saving={saving} disabled={false} />
    </View>
  )
}

// ─── Nesting Task Form ─────────────────────────────────────────────────────

const NESTING_CATEGORIES = ['Nursery', 'Cleaning', 'Laundry', 'Shopping', 'Organizing', 'Other']

export function NestingTaskForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, radius, isDark } = useTheme()
  const s = isDark ? stickersDark : stickersLight
  const [nestingTitle, setNestingTitle] = useState('')
  const [nestingCategory, setNestingCategory] = useState<string | null>(null)
  const [customCategory, setCustomCategory] = useState('')
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)

  const isOther = nestingCategory === 'Other'
  const finalCategory = isOther ? (customCategory.trim() || 'Other') : (nestingCategory ?? 'Other')

  async function save() {
    if (!nestingTitle) return
    setSaving(true)
    try {
      await savePregnancyLog(date, 'nesting', done ? '1' : '0', JSON.stringify({ title: nestingTitle, category: finalCategory }))
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <LogFormSticker
        type="nesting"
        label="Getting ready at home"
        tint={s.peachSoft}
      />
      <TextInput
        value={nestingTitle}
        onChangeText={setNestingTitle}
        placeholder="Task name (e.g. Set up crib)"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
      />
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Category</Text>
      <View style={styles.chipRow}>
        {NESTING_CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            onPress={() => setNestingCategory(cat)}
            style={[
              styles.chip,
              {
                backgroundColor: nestingCategory === cat ? brand.pregnancy + '24' : colors.surface,
                borderColor: nestingCategory === cat ? brand.pregnancy : colors.border,
                borderRadius: radius.full,
              },
            ]}
          >
            <Text style={[styles.chipText, { color: nestingCategory === cat ? brand.pregnancy : colors.text }]}>{cat}</Text>
          </Pressable>
        ))}
      </View>
      {isOther && (
        <TextInput
          value={customCategory}
          onChangeText={setCustomCategory}
          placeholder="Custom category"
          placeholderTextColor={colors.textMuted}
          autoFocus
          style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: brand.pregnancy, borderRadius: radius.lg }]}
        />
      )}
      <Pressable
        onPress={() => setDone((d) => !d)}
        style={[styles.toggleRow2, { backgroundColor: colors.surface, borderRadius: radius.lg }]}
      >
        <Text style={[styles.toggleLabel, { color: colors.text }]}>Already done?</Text>
        <View style={[styles.togglePill, { backgroundColor: done ? brand.pregnancy : colors.border }]}>
          <View style={[styles.toggleThumb, { marginLeft: done ? 20 : 2 }]} />
        </View>
      </Pressable>
      <SaveButton onPress={save} saving={saving} disabled={!nestingTitle} />
    </View>
  )
}

// ─── Birth Prep Task Form ──────────────────────────────────────────────────

const BIRTH_PREP_CATEGORIES = ['Hospital bag', 'Birth plan', 'Classes', 'Postpartum', 'Baby gear', 'Admin', 'Other']

export function BirthPrepTaskForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, radius, isDark } = useTheme()
  const s = isDark ? stickersDark : stickersLight
  const [birthPrepTitle, setBirthPrepTitle] = useState('')
  const [birthPrepCategory, setBirthPrepCategory] = useState<string | null>(null)
  const [customCategory, setCustomCategory] = useState('')
  const [dueWeek, setDueWeek] = useState<number>(36)
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)

  const isOther = birthPrepCategory === 'Other'
  const finalCategory = isOther ? (customCategory.trim() || 'Other') : (birthPrepCategory ?? 'Other')

  async function save() {
    if (!birthPrepTitle) return
    setSaving(true)
    try {
      await savePregnancyLog(date, 'birth_prep', done ? '1' : '0', JSON.stringify({ title: birthPrepTitle, category: finalCategory, dueWeek }))
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <LogFormSticker
        type="birth_prep"
        label="Preparing for baby"
        tint={s.lilacSoft}
      />
      <TextInput
        value={birthPrepTitle}
        onChangeText={setBirthPrepTitle}
        placeholder="Task name (e.g. Pack hospital bag)"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
      />
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Category</Text>
      <View style={styles.chipRow}>
        {BIRTH_PREP_CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            onPress={() => setBirthPrepCategory(cat)}
            style={[
              styles.chip,
              {
                backgroundColor: birthPrepCategory === cat ? brand.pregnancy + '24' : colors.surface,
                borderColor: birthPrepCategory === cat ? brand.pregnancy : colors.border,
                borderRadius: radius.full,
              },
            ]}
          >
            <Text style={[styles.chipText, { color: birthPrepCategory === cat ? brand.pregnancy : colors.text }]}>{cat}</Text>
          </Pressable>
        ))}
      </View>
      {isOther && (
        <TextInput
          value={customCategory}
          onChangeText={setCustomCategory}
          placeholder="Custom category"
          placeholderTextColor={colors.textMuted}
          autoFocus
          style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: brand.pregnancy, borderRadius: radius.lg }]}
        />
      )}
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Due by week</Text>
      <StepSlider
        min={20}
        max={42}
        value={dueWeek}
        onChange={setDueWeek}
        color={brand.pregnancy}
        unit={`week${dueWeek === 1 ? '' : 's'}`}
      />
      <Pressable
        onPress={() => setDone((d) => !d)}
        style={[styles.toggleRow2, { backgroundColor: colors.surface, borderRadius: radius.lg }]}
      >
        <Text style={[styles.toggleLabel, { color: colors.text }]}>Already done?</Text>
        <View style={[styles.togglePill, { backgroundColor: done ? brand.pregnancy : colors.border }]}>
          <View style={[styles.toggleThumb, { marginLeft: done ? 20 : 2 }]} />
        </View>
      </Pressable>
      <SaveButton onPress={save} saving={saving} disabled={!birthPrepTitle} />
    </View>
  )
}

// ─── Contraction Timer Log Form ─────────────────────────────────────────────

export function ContractionTimerLogForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, radius, isDark } = useTheme()
  const s = isDark ? stickersDark : stickersLight
  const [durationSec, setDurationSec] = useState(45)
  const [intervalMin, setIntervalMin] = useState(10)
  const [contractionNotes, setContractionNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await savePregnancyLog(date, 'contraction', durationSec.toString(), JSON.stringify({ intervalMin, notes: contractionNotes || undefined }))
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <LogFormSticker
        type="contraction"
        label={`Contraction on ${formatDate(date)}`}
        tint={s.pinkSoft}
      />
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Duration (seconds)</Text>
      <StepSlider
        min={10}
        max={180}
        value={durationSec}
        onChange={setDurationSec}
        color={brand.pregnancy}
        unit="sec"
      />
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Interval (minutes apart)</Text>
      <StepSlider
        min={1}
        max={30}
        value={intervalMin}
        onChange={setIntervalMin}
        color={brand.pregnancy}
        unit={intervalMin === 1 ? 'minute' : 'minutes'}
      />
      <TextInput
        value={contractionNotes}
        onChangeText={setContractionNotes}
        placeholder="Notes (intensity, location)"
        placeholderTextColor={colors.textMuted}
        multiline
        style={[styles.inputMultiline, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
      />
      <SaveButton onPress={save} saving={saving} disabled={false} />
    </View>
  )
}

// ─── Weight Log Form ──────────────────────────────────────────────────────

export function WeightLogForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, radius, isDark } = useTheme()
  const s = isDark ? stickersDark : stickersLight
  const [weight, setWeight] = useState('70')
  const [saving, setSaving] = useState(false)

  async function save() {
    const parsed = parseFloat(weight)
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert('Invalid', 'Please enter a valid weight.')
      return
    }
    setSaving(true)
    try {
      await savePregnancyLog(date, 'weight', parsed.toString(), undefined)
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <LogFormSticker
        type="weight"
        label={`Weight on ${formatDate(date)}`}
        tint={s.peachSoft}
      />
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Weight</Text>
      <View style={[styles.weightCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
        <TextInput
          value={weight}
          onChangeText={setWeight}
          keyboardType="decimal-pad"
          placeholder="68.5"
          placeholderTextColor={colors.textMuted}
          style={[styles.weightInput, { color: colors.text, fontFamily: 'Fraunces_600SemiBold' }]}
        />
        <Text style={[styles.weightUnit, { color: colors.textMuted, fontFamily: 'DMSans_500Medium' }]}>kg</Text>
      </View>
      <SaveButton onPress={save} saving={saving} disabled={weight.trim() === ''} />
    </View>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  form: {
    gap: 16,
    paddingBottom: 8,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 18,
    height: 56,
    fontSize: 15,
    fontFamily: 'DMSans_500Medium',
    fontWeight: '500',
  },
  inputMultiline: {
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 16,
    minHeight: 80,
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    textAlignVertical: 'top',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  moodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  moodBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    gap: 8,
    borderWidth: 1,
  },
  moodLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  kickCenter: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
  },
  saveBtn: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    fontSize: 15,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 8,
  },
  numberRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  numberBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  numberBtnText: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    fontWeight: '600',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    marginVertical: 16,
  },
  counterBtn: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterBtnText: {
    fontSize: 28,
    fontFamily: 'Fraunces_800ExtraBold',
    lineHeight: 32,
  },
  counterValue: {
    fontSize: 48,
    fontFamily: 'Fraunces_800ExtraBold',
    minWidth: 64,
    textAlign: 'center',
  },

  weightCard: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    borderWidth: 1,
    paddingVertical: 24,
    paddingHorizontal: 24,
    gap: 8,
  },
  weightInput: {
    fontSize: 48,
    minWidth: 100,
    textAlign: 'right',
    padding: 0,
  },
  weightUnit: {
    fontSize: 18,
  },

  // ── Water log card ───────────────────────────────────────────────────────
  waterCard: {
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 22,
    gap: 14,
  },
  waterMetaLabel: {
    fontSize: 11,
    letterSpacing: 1.8,
    textAlign: 'center',
    opacity: 0.55,
    textTransform: 'uppercase',
  },
  waterCounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  waterStepBtn: {
    width: 52,
    height: 52,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  waterStepText: {
    fontSize: 28,
    lineHeight: 30,
  },
  waterValue: {
    fontSize: 72,
    letterSpacing: -3,
    lineHeight: 76,
  },
  waterValueUnit: {
    fontSize: 28,
    opacity: 0.45,
    fontWeight: '400',
    fontStyle: 'italic',
  },
  waterDropletRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 4,
  },
  waterHint: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
    fontStyle: 'italic',
    paddingTop: 4,
  },
  toggleRow2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginTop: 8,
  },
  toggleLabel: {
    fontSize: 15,
    fontFamily: 'DMSans_500Medium',
    fontWeight: '600',
  },
  togglePill: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
})
