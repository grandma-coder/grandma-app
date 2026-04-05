/**
 * Pregnancy Log Forms — 5 bottom sheet forms for pregnancy tracking.
 *
 * Each form saves to Supabase pregnancy_logs table.
 * Forms: Mood, Symptoms, Appointment, ExamResult, KickCount
 */

import { useState, useRef } from 'react'
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
    date,
    type,
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
    } catch (e: any) {
      Alert.alert('Error', e.message)
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
    } catch (e: any) {
      Alert.alert('Error', e.message)
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
    } catch (e: any) {
      Alert.alert('Error', e.message)
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
        'blood_pressure',
        title,
        JSON.stringify({ result: result || undefined, notes: notes || undefined })
      )
      onSaved()
    } catch (e: any) {
      Alert.alert('Error', e.message)
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
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  const elapsedMin = Math.floor((Date.now() - startTime) / 60000)

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
    fontWeight: '900',
  },
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
})
