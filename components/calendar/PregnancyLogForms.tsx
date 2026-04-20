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
  Smile,
  Frown,
  Meh,
  Laugh,
  Zap,
  Check,
  Calendar,
  FlaskConical,
  Hand,
} from 'lucide-react-native'
import { useTheme, brand } from '../../constants/theme'
import { supabase } from '../../lib/supabase'
import { Emoji } from '../ui/Emoji'

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
}

// ─── Mood Form ─────────────────────────────────────────────────────────────

const MOODS = [
  { id: 'excited', icon: Laugh, label: 'Excited' },
  { id: 'happy', icon: Smile, label: 'Happy' },
  { id: 'okay', icon: Meh, label: 'Okay' },
  { id: 'anxious', icon: Frown, label: 'Anxious' },
  { id: 'energetic', icon: Zap, label: 'Energetic' },
]

export function PregnancyMoodForm({
  date,
  onSaved,
}: {
  date: string
  onSaved: () => void
}) {
  const { colors, radius } = useTheme()
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
      <View style={styles.moodRow}>
        {MOODS.map((m) => {
          const Icon = m.icon
          const active = mood === m.id
          return (
            <Pressable
              key={m.id}
              onPress={() => setMood(m.id)}
              style={[
                styles.moodBtn,
                {
                  backgroundColor: active ? colors.primaryTint : colors.surface,
                  borderRadius: radius.lg,
                },
              ]}
            >
              <Icon
                size={24}
                color={active ? colors.primary : colors.textMuted}
                strokeWidth={2}
              />
              <Text
                style={[
                  styles.moodLabel,
                  { color: active ? colors.primary : colors.textMuted },
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
        style={[
          styles.input,
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
  const { colors, radius } = useTheme()
  const [selected, setSelected] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  function toggle(s: string) {
    setSelected((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
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
      <View style={styles.chipGrid}>
        {SYMPTOMS.map((s) => {
          const active = selected.includes(s)
          return (
            <Pressable
              key={s}
              onPress={() => toggle(s)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.primaryTint : colors.surface,
                  borderColor: active ? colors.primary : colors.border,
                  borderRadius: radius.full,
                },
              ]}
            >
              {active && (
                <Check size={12} color={colors.primary} strokeWidth={3} />
              )}
              <Text
                style={[
                  styles.chipText,
                  { color: active ? colors.primary : colors.text },
                ]}
              >
                {s}
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
        style={[
          styles.input,
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
  const { colors, radius } = useTheme()
  const [type, setType] = useState<string | null>(null)
  const [doctor, setDoctor] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!type) return
    setSaving(true)
    try {
      await savePregnancyLog(
        date,
        'appointment',
        type,
        JSON.stringify({ doctor: doctor || undefined, notes: notes || undefined })
      )
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <View style={[styles.iconBanner, { backgroundColor: brand.secondary + '15' }]}>
        <Calendar size={20} color={brand.secondary} strokeWidth={2} />
        <Text style={[styles.bannerLabel, { color: colors.text }]}>
          Appointment on {formatDate(date)}
        </Text>
      </View>
      <View style={styles.chipGrid}>
        {APPOINTMENT_TYPES.map((t) => {
          const active = type === t
          return (
            <Pressable
              key={t}
              onPress={() => setType(t)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.primaryTint : colors.surface,
                  borderColor: active ? colors.primary : colors.border,
                  borderRadius: radius.full,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: active ? colors.primary : colors.text },
                ]}
              >
                {t}
              </Text>
            </Pressable>
          )
        })}
      </View>
      <TextInput
        value={doctor}
        onChangeText={setDoctor}
        placeholder="Doctor name (optional)"
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.lg,
          },
        ]}
      />
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Notes (optional)"
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.lg,
          },
        ]}
      />
      <SaveButton onPress={save} saving={saving} disabled={!type} />
    </View>
  )
}

// ─── Exam Result Form ──────────────────────────────────────────────────────

export function ExamResultForm({
  date,
  onSaved,
}: {
  date: string
  onSaved: () => void
}) {
  const { colors, radius } = useTheme()
  const [title, setTitle] = useState('')
  const [result, setResult] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!title) return
    setSaving(true)
    try {
      await savePregnancyLog(
        date,
        'exam_result',
        title,
        JSON.stringify({ result: result || undefined, notes: notes || undefined })
      )
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <View style={[styles.iconBanner, { backgroundColor: brand.phase.ovulation + '15' }]}>
        <FlaskConical size={20} color={brand.phase.ovulation} strokeWidth={2} />
        <Text style={[styles.bannerLabel, { color: colors.text }]}>Exam / Test Result</Text>
      </View>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Test name (e.g. Blood work, Glucose)"
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.lg,
          },
        ]}
      />
      <TextInput
        value={result}
        onChangeText={setResult}
        placeholder="Result (e.g. Normal, 120/80)"
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.lg,
          },
        ]}
      />
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Notes (optional)"
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.lg,
          },
        ]}
      />
      <SaveButton onPress={save} saving={saving} disabled={!title} />
    </View>
  )
}

// ─── Kick Count Form ───────────────────────────────────────────────────────

export function KickCountForm({
  date,
  onSaved,
}: {
  date: string
  onSaved: () => void
}) {
  const { colors, radius } = useTheme()
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

  return (
    <View style={styles.form}>
      <View style={styles.kickCenter}>
        <Pressable
          onPress={() => setCount((c) => c + 1)}
          style={({ pressed }) => [
            styles.kickTapBtn,
            { backgroundColor: brand.pregnancy, borderRadius: radius.xl },
            pressed && { transform: [{ scale: 0.95 }] },
          ]}
        >
          <Hand size={36} color="#FFFFFF" strokeWidth={2} />
          <Text style={styles.kickTapLabel}>TAP</Text>
        </Pressable>
        <Text style={[styles.kickCount, { color: colors.text }]}>{count} kicks</Text>
        <Text style={[styles.kickGoal, { color: colors.textMuted }]}>
          {count >= 10
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
  const { colors, radius } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      disabled={saving || disabled}
      style={({ pressed }) => [
        styles.saveBtn,
        {
          backgroundColor: colors.primary,
          borderRadius: radius.lg,
          opacity: disabled ? 0.4 : 1,
        },
        pressed && !disabled && { transform: [{ scale: 0.98 }], opacity: 0.9 },
      ]}
    >
      {saving ? (
        <ActivityIndicator color="#FFF" />
      ) : (
        <Text style={styles.saveBtnText}>{label ?? 'Save'}</Text>
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
  const { colors, radius } = useTheme()
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
      <View style={[styles.iconBanner, { backgroundColor: brand.pregnancy + '15' }]}>
        <Emoji size={20}>😴</Emoji>
        <Text style={[styles.bannerLabel, { color: colors.text }]}>Sleep on {formatDate(date)}</Text>
      </View>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Hours slept</Text>
      <View style={styles.numberRow}>
        {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
          <Pressable
            key={h}
            onPress={() => setHours(h)}
            style={[
              styles.numberBtn,
              {
                backgroundColor: hours === h ? brand.pregnancy : colors.surface,
                borderRadius: radius.md,
                borderColor: hours === h ? brand.pregnancy : colors.border,
              },
            ]}
          >
            <Text style={[styles.numberBtnText, { color: hours === h ? '#fff' : colors.text }]}>{h}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Quality (1–10)</Text>
      <View style={styles.numberRow}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((q) => (
          <Pressable
            key={q}
            onPress={() => setQuality(q)}
            style={[
              styles.numberBtn,
              {
                backgroundColor: quality === q ? brand.pregnancy : colors.surface,
                borderRadius: radius.md,
                borderColor: quality === q ? brand.pregnancy : colors.border,
              },
            ]}
          >
            <Text style={[styles.numberBtnText, { color: quality === q ? '#fff' : colors.text }]}>{q}</Text>
          </Pressable>
        ))}
      </View>
      <SaveButton onPress={save} saving={saving} disabled={false} />
    </View>
  )
}

// ─── Exercise Log Form ─────────────────────────────────────────────────────

const EXERCISE_TYPES = ['Yoga', 'Walk', 'Swim', 'Stretching', 'Pilates', 'Other']

export function ExerciseLogForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, radius } = useTheme()
  const [exerciseType, setExerciseType] = useState<string | null>(null)
  const [minutes, setMinutes] = useState(30)
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!exerciseType) return
    setSaving(true)
    try {
      await savePregnancyLog(date, 'exercise', minutes.toString(), JSON.stringify({ type: exerciseType }))
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <View style={[styles.iconBanner, { backgroundColor: brand.pregnancy + '15' }]}>
        <Emoji size={20}>🧘</Emoji>
        <Text style={[styles.bannerLabel, { color: colors.text }]}>Exercise on {formatDate(date)}</Text>
      </View>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Type</Text>
      <View style={styles.chipRow}>
        {EXERCISE_TYPES.map((t) => (
          <Pressable
            key={t}
            onPress={() => setExerciseType(t)}
            style={[
              styles.chip,
              {
                backgroundColor: exerciseType === t ? brand.pregnancy + '20' : colors.surface,
                borderColor: exerciseType === t ? brand.pregnancy : colors.border,
                borderRadius: radius.full,
              },
            ]}
          >
            <Text style={[styles.chipText, { color: exerciseType === t ? brand.pregnancy : colors.text }]}>{t}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Minutes</Text>
      <View style={styles.numberRow}>
        {[15, 20, 30, 45, 60, 90].map((m) => (
          <Pressable
            key={m}
            onPress={() => setMinutes(m)}
            style={[
              styles.numberBtn,
              {
                backgroundColor: minutes === m ? brand.pregnancy : colors.surface,
                borderRadius: radius.md,
                borderColor: minutes === m ? brand.pregnancy : colors.border,
              },
            ]}
          >
            <Text style={[styles.numberBtnText, { color: minutes === m ? '#fff' : colors.text }]}>{m}</Text>
          </Pressable>
        ))}
      </View>
      <SaveButton onPress={save} saving={saving} disabled={!exerciseType} />
    </View>
  )
}

// ─── Nutrition Log Form ────────────────────────────────────────────────────

const NUTRITION_TAGS = ['Iron', 'Folic acid', 'Protein', 'Calcium', 'DHA', 'Vitamin D']

export function NutritionLogForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, radius } = useTheme()
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
      <View style={[styles.iconBanner, { backgroundColor: brand.pregnancy + '15' }]}>
        <Emoji size={20}>🥗</Emoji>
        <Text style={[styles.bannerLabel, { color: colors.text }]}>Nutrition on {formatDate(date)}</Text>
      </View>
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
                  backgroundColor: active ? brand.pregnancy + '20' : colors.surface,
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
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
      />
      <SaveButton onPress={save} saving={saving} disabled={tags.length === 0} />
    </View>
  )
}

// ─── Kegel Log Form ────────────────────────────────────────────────────────

export function KegelLogForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, radius } = useTheme()
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
      <View style={[styles.iconBanner, { backgroundColor: brand.pregnancy + '15' }]}>
        <Emoji size={20}>💪</Emoji>
        <Text style={[styles.bannerLabel, { color: colors.text }]}>Kegel exercises</Text>
      </View>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Sets completed</Text>
      <View style={styles.counterRow}>
        <Pressable onPress={() => setSets((s) => Math.max(1, s - 1))} style={[styles.counterBtn, { backgroundColor: colors.surface, borderRadius: radius.full }]}>
          <Text style={[styles.counterBtnText, { color: colors.text }]}>−</Text>
        </Pressable>
        <Text style={[styles.counterValue, { color: colors.text }]}>{sets}</Text>
        <Pressable onPress={() => setSets((s) => Math.min(20, s + 1))} style={[styles.counterBtn, { backgroundColor: colors.surface, borderRadius: radius.full }]}>
          <Text style={[styles.counterBtnText, { color: colors.text }]}>+</Text>
        </Pressable>
      </View>
      <SaveButton onPress={save} saving={saving} disabled={false} />
    </View>
  )
}

// ─── Water Log Form ────────────────────────────────────────────────────────

export function WaterLogForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, radius } = useTheme()
  const [glasses, setGlasses] = useState(1)
  const [saving, setSaving] = useState(false)

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

  return (
    <View style={styles.form}>
      <View style={[styles.iconBanner, { backgroundColor: brand.pregnancy + '15' }]}>
        <Emoji size={20}>💧</Emoji>
        <Text style={[styles.bannerLabel, { color: colors.text }]}>Water intake</Text>
      </View>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Glasses today</Text>
      <View style={styles.counterRow}>
        <Pressable onPress={() => setGlasses((g) => Math.max(1, g - 1))} style={[styles.counterBtn, { backgroundColor: colors.surface, borderRadius: radius.full }]}>
          <Text style={[styles.counterBtnText, { color: colors.text }]}>−</Text>
        </Pressable>
        <Text style={[styles.counterValue, { color: colors.text }]}>{glasses}</Text>
        <Pressable onPress={() => setGlasses((g) => Math.min(20, g + 1))} style={[styles.counterBtn, { backgroundColor: colors.surface, borderRadius: radius.full }]}>
          <Text style={[styles.counterBtnText, { color: colors.text }]}>+</Text>
        </Pressable>
      </View>
      <Text style={[styles.fieldLabel, { color: colors.textMuted, textAlign: 'center' }]}>
        Goal: 8 glasses · {glasses >= 8 ? '🎉 Done!' : `${8 - glasses} more to go`}
      </Text>
      <SaveButton onPress={save} saving={saving} disabled={false} />
    </View>
  )
}

// ─── Vitamins Log Form ─────────────────────────────────────────────────────

export function VitaminsLogForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors } = useTheme()
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
      <View style={[styles.iconBanner, { backgroundColor: brand.pregnancy + '15' }]}>
        <Emoji size={20}>💊</Emoji>
        <Text style={[styles.bannerLabel, { color: colors.text }]}>Prenatal vitamins</Text>
      </View>
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
  const { colors, radius } = useTheme()
  const [nestingTitle, setNestingTitle] = useState('')
  const [nestingCategory, setNestingCategory] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!nestingTitle) return
    setSaving(true)
    try {
      await savePregnancyLog(date, 'nesting', done ? '1' : '0', JSON.stringify({ title: nestingTitle, category: nestingCategory ?? 'Other' }))
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <View style={[styles.iconBanner, { backgroundColor: brand.pregnancy + '15' }]}>
        <Emoji size={20}>🪺</Emoji>
        <Text style={[styles.bannerLabel, { color: colors.text }]}>Nesting task</Text>
      </View>
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
                backgroundColor: nestingCategory === cat ? brand.pregnancy + '20' : colors.surface,
                borderColor: nestingCategory === cat ? brand.pregnancy : colors.border,
                borderRadius: radius.full,
              },
            ]}
          >
            <Text style={[styles.chipText, { color: nestingCategory === cat ? brand.pregnancy : colors.text }]}>{cat}</Text>
          </Pressable>
        ))}
      </View>
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
  const { colors, radius } = useTheme()
  const [birthPrepTitle, setBirthPrepTitle] = useState('')
  const [birthPrepCategory, setBirthPrepCategory] = useState<string | null>(null)
  const [dueWeek, setDueWeek] = useState<number | null>(null)
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!birthPrepTitle) return
    setSaving(true)
    try {
      await savePregnancyLog(date, 'birth_prep', done ? '1' : '0', JSON.stringify({ title: birthPrepTitle, category: birthPrepCategory ?? 'Other', dueWeek }))
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <View style={[styles.iconBanner, { backgroundColor: brand.pregnancy + '15' }]}>
        <Emoji size={20}>🏥</Emoji>
        <Text style={[styles.bannerLabel, { color: colors.text }]}>Birth prep task</Text>
      </View>
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
                backgroundColor: birthPrepCategory === cat ? brand.pregnancy + '20' : colors.surface,
                borderColor: birthPrepCategory === cat ? brand.pregnancy : colors.border,
                borderRadius: radius.full,
              },
            ]}
          >
            <Text style={[styles.chipText, { color: birthPrepCategory === cat ? brand.pregnancy : colors.text }]}>{cat}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Due by week</Text>
      <View style={styles.numberRow}>
        {[28, 30, 32, 34, 36, 38, 40].map((w) => (
          <Pressable
            key={w}
            onPress={() => setDueWeek(w)}
            style={[
              styles.numberBtn,
              {
                backgroundColor: dueWeek === w ? brand.pregnancy : colors.surface,
                borderRadius: radius.md,
                borderColor: dueWeek === w ? brand.pregnancy : colors.border,
              },
            ]}
          >
            <Text style={[styles.numberBtnText, { color: dueWeek === w ? '#fff' : colors.text }]}>W{w}</Text>
          </Pressable>
        ))}
      </View>
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
  const { colors, radius } = useTheme()
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
      <View style={[styles.iconBanner, { backgroundColor: brand.pregnancy + '15' }]}>
        <Emoji size={20}>⏱️</Emoji>
        <Text style={[styles.bannerLabel, { color: colors.text }]}>Contraction on {formatDate(date)}</Text>
      </View>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Duration (seconds)</Text>
      <View style={styles.counterRow}>
        <Pressable onPress={() => setDurationSec((s) => Math.max(10, s - 5))} style={[styles.counterBtn, { backgroundColor: colors.surface, borderRadius: radius.full }]}>
          <Text style={[styles.counterBtnText, { color: colors.text }]}>−</Text>
        </Pressable>
        <Text style={[styles.counterValue, { color: colors.text }]}>{durationSec}s</Text>
        <Pressable onPress={() => setDurationSec((s) => Math.min(300, s + 5))} style={[styles.counterBtn, { backgroundColor: colors.surface, borderRadius: radius.full }]}>
          <Text style={[styles.counterBtnText, { color: colors.text }]}>+</Text>
        </Pressable>
      </View>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Interval (minutes apart)</Text>
      <View style={styles.counterRow}>
        <Pressable onPress={() => setIntervalMin((m) => Math.max(1, m - 1))} style={[styles.counterBtn, { backgroundColor: colors.surface, borderRadius: radius.full }]}>
          <Text style={[styles.counterBtnText, { color: colors.text }]}>−</Text>
        </Pressable>
        <Text style={[styles.counterValue, { color: colors.text }]}>{intervalMin}m</Text>
        <Pressable onPress={() => setIntervalMin((m) => Math.min(60, m + 1))} style={[styles.counterBtn, { backgroundColor: colors.surface, borderRadius: radius.full }]}>
          <Text style={[styles.counterBtnText, { color: colors.text }]}>+</Text>
        </Pressable>
      </View>
      <TextInput
        value={contractionNotes}
        onChangeText={setContractionNotes}
        placeholder="Notes (intensity, location)"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
      />
      <SaveButton onPress={save} saving={saving} disabled={false} />
    </View>
  )
}

// ─── Weight Log Form ──────────────────────────────────────────────────────

export function WeightLogForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, radius } = useTheme()
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
      <View style={[styles.iconBanner, { backgroundColor: brand.pregnancy + '15' }]}>
        <Emoji size={20}>⚖️</Emoji>
        <Text style={[styles.bannerLabel, { color: colors.text }]}>Weight on {formatDate(date)}</Text>
      </View>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Weight (kg)</Text>
      <TextInput
        value={weight}
        onChangeText={setWeight}
        keyboardType="decimal-pad"
        placeholder="e.g. 68.5"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
      />
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
  iconBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
  },
  bannerLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 15,
    fontWeight: '500',
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
    paddingVertical: 14,
    gap: 4,
  },
  moodLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  kickCenter: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  kickTapBtn: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  kickTapLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  kickCount: {
    fontSize: 32,
    fontWeight: '900', fontFamily: 'Fraunces_600SemiBold' },
  kickGoal: {
    fontSize: 14,
    fontWeight: '500',
  },
  saveBtn: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: 'Satoshi-Variable',
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
    fontFamily: 'Satoshi-Variable',
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
    fontFamily: 'CabinetGrotesk-Black',
    lineHeight: 32,
  },
  counterValue: {
    fontSize: 48,
    fontFamily: 'CabinetGrotesk-Black',
    minWidth: 64,
    textAlign: 'center',
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
    fontFamily: 'Satoshi-Variable',
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
