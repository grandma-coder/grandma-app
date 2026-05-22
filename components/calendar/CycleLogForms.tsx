/**
 * Cycle log forms — fertility signal logging for TTC.
 *
 * 4 bottom sheets matching the sticker-paper styling of LogForms.tsx /
 * PregnancyLogForms.tsx. Each writes a row to cycle_logs.
 *
 *   BBT          → type 'basal_temp', value '<°C>' e.g. '36.42'
 *   LH           → type 'lh',          value 'negative' | 'faint' | 'positive' | 'peak'
 *   CM           → type 'cervical_mucus', value 'dry' | 'sticky' | 'creamy' | 'watery' | 'eggwhite'
 *   Intercourse  → type 'intercourse', value 'unprotected' | 'protected'
 *
 * Saved rows invalidate the ['cycleLogs'] React Query key.
 */

import { useState } from 'react'
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { useTheme } from '../../constants/theme'
import { supabase } from '../../lib/supabase'
import { PillButton } from '../ui/PillButton'

async function saveCycleLog(
  date: string,
  type: 'basal_temp' | 'lh' | 'cervical_mucus' | 'intercourse',
  value: string,
  notes?: string,
) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  const { error } = await supabase.from('cycle_logs').insert({
    user_id: session.user.id,
    date,
    type,
    value,
    notes: notes ?? null,
  })
  if (error) throw error
}

// ─── BBT ───────────────────────────────────────────────────────────────────

const BBT_MIN = 350 // 35.0 °C × 10
const BBT_MAX = 380 // 38.0 °C × 10

export function BbtForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, stickers, font, isDark } = useTheme()
  const qc = useQueryClient()
  const [tenths, setTenths] = useState(364) // 36.4 default
  const [saving, setSaving] = useState(false)
  const ink = isDark ? colors.text : '#141313'

  function bump(delta: number) {
    setTenths((v) => Math.max(BBT_MIN, Math.min(BBT_MAX, v + delta)))
  }

  async function save() {
    setSaving(true)
    try {
      await saveCycleLog(date, 'basal_temp', (tenths / 10).toFixed(2))
      await qc.invalidateQueries({ queryKey: ['cycleLogs'] })
      onSaved()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <Text style={[styles.label, { color: colors.textMuted, fontFamily: font.bodyBold }]}>BBT (morning)</Text>
      <View style={styles.bbtRow}>
        <Pressable onPress={() => bump(-5)} style={[styles.bumpBtn, { borderColor: ink, backgroundColor: colors.surface }]}>
          <Text style={{ color: ink, fontSize: 24, fontFamily: font.displayBold }}>−</Text>
        </Pressable>
        <Text style={[styles.bbtValue, { color: ink, fontFamily: font.displayBold }]}>
          {(tenths / 10).toFixed(1)}°
        </Text>
        <Pressable onPress={() => bump(5)} style={[styles.bumpBtn, { borderColor: ink, backgroundColor: colors.surface }]}>
          <Text style={{ color: ink, fontSize: 24, fontFamily: font.displayBold }}>+</Text>
        </Pressable>
      </View>
      <Text style={[styles.hint, { color: colors.textMuted, fontFamily: font.body }]}>
        Take it right after waking up — same time, same conditions.
      </Text>
      <PillButton label={saving ? 'Saving…' : 'Save'} variant="accent" accentColor={stickers.pink} onPress={save} disabled={saving} />
    </View>
  )
}

// ─── LH ────────────────────────────────────────────────────────────────────

type LhValue = 'negative' | 'faint' | 'positive' | 'peak'
const LH_OPTIONS = [
  { value: 'negative' as LhValue, label: 'Negative', tint: 'lilacSoft' as const },
  { value: 'faint'    as LhValue, label: 'Faint',    tint: 'pinkSoft' as const },
  { value: 'positive' as LhValue, label: 'Positive', tint: 'pink' as const },
  { value: 'peak'     as LhValue, label: 'Peak',     tint: 'coral' as const },
]

export function LhForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, stickers, font, isDark } = useTheme()
  const qc = useQueryClient()
  const [pick, setPick] = useState<LhValue | null>(null)
  const [saving, setSaving] = useState(false)
  const ink = isDark ? colors.text : '#141313'

  async function save() {
    if (!pick) return
    setSaving(true)
    try {
      await saveCycleLog(date, 'lh', pick)
      await qc.invalidateQueries({ queryKey: ['cycleLogs'] })
      onSaved()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <Text style={[styles.label, { color: colors.textMuted, fontFamily: font.bodyBold }]}>LH test result</Text>
      <View style={styles.options}>
        {LH_OPTIONS.map((o) => {
          const active = pick === o.value
          return (
            <Pressable
              key={o.value}
              onPress={() => setPick(o.value)}
              style={[
                styles.option,
                {
                  backgroundColor: stickers[o.tint],
                  borderColor: active ? ink : colors.border,
                  borderWidth: active ? 2 : 1,
                },
              ]}
            >
              <Text style={{ color: o.value === 'peak' ? '#fff' : ink, fontFamily: font.bodyBold }}>{o.label}</Text>
            </Pressable>
          )
        })}
      </View>
      <PillButton label={saving ? 'Saving…' : 'Save'} variant="accent" accentColor={stickers.pink} onPress={save} disabled={!pick || saving} />
    </View>
  )
}

// ─── CM ────────────────────────────────────────────────────────────────────

type CmValue = 'dry' | 'sticky' | 'creamy' | 'watery' | 'eggwhite'
const CM_OPTIONS = [
  { value: 'dry'      as CmValue, label: 'Dry',       tint: 'lilacSoft' as const },
  { value: 'sticky'   as CmValue, label: 'Sticky',    tint: 'peachSoft' as const },
  { value: 'creamy'   as CmValue, label: 'Creamy',    tint: 'yellowSoft' as const },
  { value: 'watery'   as CmValue, label: 'Watery',    tint: 'blueSoft' as const },
  { value: 'eggwhite' as CmValue, label: 'Egg-white', tint: 'greenSoft' as const },
]

export function CmForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, stickers, font, isDark } = useTheme()
  const qc = useQueryClient()
  const [pick, setPick] = useState<CmValue | null>(null)
  const [saving, setSaving] = useState(false)
  const ink = isDark ? colors.text : '#141313'

  async function save() {
    if (!pick) return
    setSaving(true)
    try {
      await saveCycleLog(date, 'cervical_mucus', pick)
      await qc.invalidateQueries({ queryKey: ['cycleLogs'] })
      onSaved()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <Text style={[styles.label, { color: colors.textMuted, fontFamily: font.bodyBold }]}>Cervical fluid</Text>
      <View style={styles.options}>
        {CM_OPTIONS.map((o) => {
          const active = pick === o.value
          return (
            <Pressable
              key={o.value}
              onPress={() => setPick(o.value)}
              style={[
                styles.option,
                {
                  backgroundColor: stickers[o.tint],
                  borderColor: active ? ink : colors.border,
                  borderWidth: active ? 2 : 1,
                },
              ]}
            >
              <Text style={{ color: ink, fontFamily: font.bodyBold }}>{o.label}</Text>
            </Pressable>
          )
        })}
      </View>
      <PillButton label={saving ? 'Saving…' : 'Save'} variant="accent" accentColor={stickers.pink} onPress={save} disabled={!pick || saving} />
    </View>
  )
}

// ─── Intercourse ───────────────────────────────────────────────────────────

export function IntercourseForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, stickers, font, isDark } = useTheme()
  const qc = useQueryClient()
  const [protectedSex, setProtectedSex] = useState(false)
  const [saving, setSaving] = useState(false)
  const ink = isDark ? colors.text : '#141313'

  async function save() {
    setSaving(true)
    try {
      await saveCycleLog(date, 'intercourse', protectedSex ? 'protected' : 'unprotected')
      await qc.invalidateQueries({ queryKey: ['cycleLogs'] })
      onSaved()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <Text style={[styles.label, { color: colors.textMuted, fontFamily: font.bodyBold }]}>Log intimacy</Text>
      <Pressable
        onPress={() => setProtectedSex((v) => !v)}
        style={[
          styles.toggle,
          {
            backgroundColor: protectedSex ? stickers.lilacSoft : stickers.pinkSoft,
            borderColor: ink,
          },
        ]}
      >
        <Text style={{ color: ink, fontFamily: font.bodyBold }}>
          {protectedSex ? 'Protected' : 'Unprotected'}
        </Text>
      </Pressable>
      <Text style={[styles.hint, { color: colors.textMuted, fontFamily: font.body }]}>
        We use this to mark "covered" days on the fertile window forecast.
      </Text>
      <PillButton label={saving ? 'Saving…' : 'Save'} variant="accent" accentColor={stickers.pink} onPress={save} disabled={saving} />
    </View>
  )
}

const styles = StyleSheet.create({
  form: { gap: 14, paddingTop: 4 },
  label: { fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' },
  bbtRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginVertical: 12 },
  bumpBtn: {
    width: 48, height: 48, borderRadius: 999, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  bbtValue: { fontSize: 48, minWidth: 120, textAlign: 'center' },
  hint: { fontSize: 12, lineHeight: 17 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999 },
  toggle: {
    alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 20,
    borderRadius: 999, borderWidth: 1.5,
  },
})
