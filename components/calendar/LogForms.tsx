/**
 * Cycle Log Forms — 6 bottom sheet forms for cycle tracking.
 *
 * Each form saves to Supabase cycle_logs table.
 * Forms: PeriodStart, PeriodEnd, Symptoms, Mood, Temperature, Intimacy
 */

import { useState } from 'react'
import { View, Text, TextInput, Pressable, Alert, StyleSheet, ActivityIndicator } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import {
  Smile,
  Frown,
  Meh,
  Laugh,
  Zap,
  Check,
} from 'lucide-react-native'
import { useTheme, stickers as stickersLight, stickersDark } from '../../constants/theme'
import { supabase } from '../../lib/supabase'
import { LogFormSticker } from './LogFormSticker'

// ─── Shared save helper ────────────────────────────────────────────────────

async function saveCycleLog(
  date: string,
  type: string,
  value?: string | null,
  notes?: string
) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const { error } = await supabase.from('cycle_logs').insert({
    user_id: session.user.id,
    date,
    type,
    value: value ?? null,
    notes: notes ?? null,
  })
  if (error) throw error
}

// ─── Period Start Form ─────────────────────────────────────────────────────

export function PeriodStartForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, radius, isDark } = useTheme()
  const queryClient = useQueryClient()
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const s = isDark ? stickersDark : stickersLight

  async function save() {
    setSaving(true)
    try {
      await saveCycleLog(date, 'period_start', null, notes || undefined)
      await queryClient.invalidateQueries({ queryKey: ['cycleLogs'] })
      onSaved()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <LogFormSticker
        type="period_start"
        label={`Period started on ${formatDate(date)}`}
        tint={s.pinkSoft}
      />
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Notes (optional)"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
      />
      <SaveButton onPress={save} saving={saving} />
    </View>
  )
}

// ─── Period End Form ───────────────────────────────────────────────────────

export function PeriodEndForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { isDark } = useTheme()
  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)
  const s = isDark ? stickersDark : stickersLight

  async function save() {
    setSaving(true)
    try {
      await saveCycleLog(date, 'period_end')
      await queryClient.invalidateQueries({ queryKey: ['cycleLogs'] })
      onSaved()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <LogFormSticker
        type="period_end"
        label={`Period ended on ${formatDate(date)}`}
        tint={s.pinkSoft}
      />
      <SaveButton onPress={save} saving={saving} />
    </View>
  )
}

// ─── Symptoms Form ─────────────────────────────────────────────────────────

const SYMPTOMS = [
  'Cramps', 'Headache', 'Bloating', 'Fatigue', 'Nausea',
  'Back pain', 'Breast tenderness', 'Acne', 'Insomnia', 'Cravings',
]

export function SymptomsForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, radius, isDark } = useTheme()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const s = isDark ? stickersDark : stickersLight

  function toggle(sym: string) {
    setSelected((prev) =>
      prev.includes(sym) ? prev.filter((x) => x !== sym) : [...prev, sym]
    )
  }

  async function save() {
    if (selected.length === 0) return
    setSaving(true)
    try {
      await saveCycleLog(date, 'symptom', selected.join(', '), notes || undefined)
      await queryClient.invalidateQueries({ queryKey: ['cycleLogs'] })
      onSaved()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <LogFormSticker
        type="symptom"
        label="How's your body feeling today?"
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
                  backgroundColor: active ? colors.primaryTint : colors.surface,
                  borderColor: active ? colors.primary : colors.border,
                  borderRadius: radius.full,
                },
              ]}
            >
              {active && <Check size={12} color={colors.primary} strokeWidth={3} />}
              <Text style={[styles.chipText, { color: active ? colors.primary : colors.text }]}>{sym}</Text>
            </Pressable>
          )
        })}
      </View>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Additional notes"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
      />
      <SaveButton onPress={save} saving={saving} disabled={selected.length === 0} />
    </View>
  )
}

// ─── Mood Form ─────────────────────────────────────────────────────────────

const MOODS = [
  { id: 'great', icon: Laugh, label: 'Great' },
  { id: 'good', icon: Smile, label: 'Good' },
  { id: 'okay', icon: Meh, label: 'Okay' },
  { id: 'low', icon: Frown, label: 'Low' },
  { id: 'energetic', icon: Zap, label: 'Energetic' },
]

export function MoodForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, radius, isDark } = useTheme()
  const queryClient = useQueryClient()
  const [mood, setMood] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const s = isDark ? stickersDark : stickersLight

  async function save() {
    if (!mood) return
    setSaving(true)
    try {
      await saveCycleLog(date, 'mood', mood, notes || undefined)
      await queryClient.invalidateQueries({ queryKey: ['cycleLogs'] })
      onSaved()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <LogFormSticker
        type="mood"
        label="How's your mood today?"
        tint={s.yellowSoft}
      />
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
              <Icon size={24} color={active ? colors.primary : colors.textMuted} strokeWidth={2} />
              <Text style={[styles.moodLabel, { color: active ? colors.primary : colors.textMuted }]}>{m.label}</Text>
            </Pressable>
          )
        })}
      </View>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="How are you feeling?"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
      />
      <SaveButton onPress={save} saving={saving} disabled={!mood} />
    </View>
  )
}

// ─── Temperature Form ──────────────────────────────────────────────────────

export function TemperatureForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, radius, isDark } = useTheme()
  const queryClient = useQueryClient()
  const [temp, setTemp] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const s = isDark ? stickersDark : stickersLight

  async function save() {
    if (!temp) return
    setSaving(true)
    try {
      await saveCycleLog(date, 'basal_temp', temp, notes || undefined)
      await queryClient.invalidateQueries({ queryKey: ['cycleLogs'] })
      onSaved()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <LogFormSticker
        type="basal_temp"
        label="Basal Temperature"
        tint={s.blueSoft}
      />
      <View style={[styles.tempRow, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
        <TextInput
          value={temp}
          onChangeText={setTemp}
          placeholder="36.5"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          style={[styles.tempInput, { color: colors.text }]}
        />
        <Text style={[styles.tempUnit, { color: colors.textSecondary }]}>°C</Text>
      </View>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Notes (optional)"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
      />
      <SaveButton onPress={save} saving={saving} disabled={!temp} />
    </View>
  )
}

// ─── Intimacy Form ─────────────────────────────────────────────────────────

export function IntimacyForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, radius, isDark } = useTheme()
  const queryClient = useQueryClient()
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const s = isDark ? stickersDark : stickersLight

  async function save() {
    setSaving(true)
    try {
      await saveCycleLog(date, 'intercourse', 'yes', notes || undefined)
      await queryClient.invalidateQueries({ queryKey: ['cycleLogs'] })
      onSaved()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <LogFormSticker
        type="intercourse"
        label={`Intimacy logged for ${formatDate(date)}`}
        tint={s.pinkSoft}
      />
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Notes (optional)"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
      />
      <SaveButton onPress={save} saving={saving} />
    </View>
  )
}

// ─── Shared Save Button ────────────────────────────────────────────────────

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
      {saving ? (
        <ActivityIndicator color="#FFF" />
      ) : (
        <Text style={styles.saveBtnText}>Save</Text>
      )}
    </Pressable>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  form: {
    gap: 16,
    paddingBottom: 8,
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
  tempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 56,
  },
  tempInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    fontFamily: 'Fraunces_600SemiBold',
  },
  tempUnit: {
    fontSize: 18,
    fontWeight: '600',
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
