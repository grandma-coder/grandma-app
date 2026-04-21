/**
 * SimplePregnancyLogForm — shared numpad-input log form for numeric
 * pregnancy metrics (water, weight, sleep, exercise, nutrition).
 *
 * Used by:
 * - components/home/pregnancy/VitalsCarousel.tsx (via vital card tap)
 * - components/home/PregnancyHome.tsx (via Today's Routines chip tap)
 * - components/home/pregnancy/RemindersSection.tsx (via reminder card tap)
 */

import React, { useState } from 'react'
import {
  View, Text, Pressable, StyleSheet, Dimensions, ActivityIndicator,
} from 'react-native'
import { useTheme } from '../../constants/theme'
import { supabase } from '../../lib/supabase'

const SCREEN_W = Dimensions.get('window').width

export type SimpleLogType = 'weight' | 'water' | 'sleep' | 'exercise' | 'nutrition'

interface Props {
  type: SimpleLogType
  userId: string | undefined
  onSaved: () => void
}

const CONFIGS: Record<SimpleLogType, {
  label: string
  placeholder: string
  unit: string
  keyboard: 'decimal-pad' | 'number-pad'
}> = {
  weight:    { label: '⚖️ Log Weight',   placeholder: 'e.g. 68.5',              unit: 'kg',      keyboard: 'decimal-pad' },
  water:     { label: '💧 Log Water',    placeholder: 'Glasses today (0–8)',    unit: 'glasses', keyboard: 'number-pad' },
  sleep:     { label: '😴 Log Sleep',    placeholder: 'Hours slept e.g. 7.5',   unit: 'hours',   keyboard: 'decimal-pad' },
  exercise:  { label: '🧘 Log Exercise', placeholder: 'Minutes e.g. 30',        unit: 'min',     keyboard: 'number-pad' },
  nutrition: { label: '🥗 Log Meals',    placeholder: 'Meals today (1–6)',      unit: 'meals',   keyboard: 'number-pad' },
}

export function SimplePregnancyLogForm({ type, userId, onSaved }: Props) {
  const { colors } = useTheme()
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  const cfg = CONFIGS[type]

  const handleSave = async () => {
    if (!userId || !value.trim()) return
    setSaving(true)
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('pregnancy_logs').insert({
      user_id: userId,
      log_date: today,
      log_type: type,
      value: value.trim(),
    })
    setSaving(false)
    onSaved()
  }

  return (
    <View style={styles.form}>
      <Text style={[styles.title, { color: colors.text }]}>{cfg.label}</Text>

      <View style={[styles.input, { backgroundColor: colors.surfaceGlass, borderColor: colors.border }]}>
        <Text
          style={[styles.inputText, { color: value ? colors.text : colors.textMuted }]}
          numberOfLines={1}
        >
          {value || cfg.placeholder}
        </Text>
        <Text style={[styles.unit, { color: colors.textMuted }]}>{cfg.unit}</Text>
      </View>

      <View style={styles.numpad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map((key) => (
          <Pressable
            key={key}
            onPress={() => {
              if (key === '⌫') setValue((v) => v.slice(0, -1))
              else if (key === '.' && (value.includes('.') || cfg.keyboard === 'number-pad')) return
              else setValue((v) => v + key)
            }}
            style={({ pressed }) => [
              styles.key,
              { backgroundColor: pressed ? colors.surface : colors.surfaceGlass },
            ]}
          >
            <Text style={[styles.keyText, { color: colors.text }]}>{key}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={handleSave}
        style={[styles.saveBtn, {
          backgroundColor: colors.primary,
          opacity: !value.trim() || saving ? 0.6 : 1,
        }]}
        disabled={saving || !value.trim()}
      >
        {saving
          ? <ActivityIndicator color={colors.textInverse} />
          : <Text style={[styles.saveText, { color: colors.textInverse }]}>Save</Text>
        }
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  form: { padding: 24, gap: 16 },
  title: { fontSize: 20, fontFamily: 'Fraunces_600SemiBold', textAlign: 'center' },
  input: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 16, paddingHorizontal: 20, paddingVertical: 14, borderWidth: 1,
  },
  inputText: { fontSize: 18, fontFamily: 'Fraunces_600SemiBold', flex: 1 },
  unit: { fontSize: 13, fontFamily: 'DMSans_400Regular' },
  numpad: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  key: {
    width: (SCREEN_W - 48 - 16) / 3 - 6,
    paddingVertical: 14, borderRadius: 12, alignItems: 'center',
  },
  keyText: { fontSize: 18, fontFamily: 'Fraunces_600SemiBold' },
  saveBtn: { borderRadius: 999, paddingVertical: 16, alignItems: 'center' },
  saveText: { fontSize: 16, fontFamily: 'DMSans_600SemiBold' },
})
