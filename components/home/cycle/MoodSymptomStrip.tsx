/**
 * MoodSymptomStrip — compact full-width strip below the Daily Nudge.
 *
 * 32px mood face (today's pick) + 3–4 chips for the most-likely symptoms
 * keyed off the cycle phase + a "+" tile that opens the full picker sheet.
 *
 * Toggling a chip writes immediately to cycle_logs (no save button).
 */

import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTheme } from '../../../constants/theme'
import { supabase } from '../../../lib/supabase'
import { toDateStr, type CyclePhase } from '../../../lib/cycleLogic'
import { MoodSymptomPickerSheet, ALL_SYMPTOMS } from './MoodSymptomPickerSheet'
import { LogSheet } from '../../calendar/LogSheet'

const MOODS = [
  { id: '1', sticker: '😞' },
  { id: '2', sticker: '😕' },
  { id: '3', sticker: '😐' },
  { id: '4', sticker: '🙂' },
  { id: '5', sticker: '😄' },
]

const PHASE_DEFAULTS: Record<CyclePhase, string[]> = {
  menstruation: ['cramps', 'tired', 'bloated'],
  follicular:   ['acne', 'restless', 'craving'],
  ovulation:    ['tender', 'craving', 'restless'],
  luteal:       ['bloated', 'low-mood', 'tender'],
}

interface Props {
  phase: CyclePhase
}

export function MoodSymptomStrip({ phase }: Props) {
  const { colors, stickers, font, radius, isDark } = useTheme()
  const qc = useQueryClient()
  const ink = isDark ? colors.text : '#141313'

  const [userId, setUserId] = useState<string | undefined>()
  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user.id))
  }, [])

  const today = toDateStr(new Date())

  const { data: rows = [] } = useQuery({
    queryKey: ['cycleLogs', 'moodSym', userId, today],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('cycle_logs')
        .select('type, value')
        .eq('user_id', userId)
        .eq('date', today)
        .in('type', ['mood', 'symptom'])
      if (error) throw error
      return data ?? []
    },
    enabled: !!userId,
  })

  const [pickerOpen, setPickerOpen] = useState(false)
  const [moodSheet, setMoodSheet] = useState(false)

  const moodToday = rows.find((r) => r.type === 'mood')?.value ?? null
  const todaySymptoms = useMemo(
    () => rows.filter((r) => r.type === 'symptom').map((r) => r.value).filter((v): v is string => !!v),
    [rows],
  )

  const chipSlots = useMemo(() => {
    // Up to 4 chips: any logged-today first, then phase defaults to backfill.
    const fromLogs = todaySymptoms.slice(0, 4)
    if (fromLogs.length >= 4) return fromLogs
    const defaults = PHASE_DEFAULTS[phase].filter((d) => !fromLogs.includes(d))
    return [...fromLogs, ...defaults].slice(0, 4)
  }, [phase, todaySymptoms])

  async function toggleChip(id: string) {
    if (!userId) return
    const currentlyOn = todaySymptoms.includes(id)
    try {
      if (currentlyOn) {
        await supabase
          .from('cycle_logs')
          .delete()
          .eq('user_id', userId)
          .eq('date', today)
          .eq('type', 'symptom')
          .eq('value', id)
      } else {
        await supabase
          .from('cycle_logs')
          .insert({ user_id: userId, date: today, type: 'symptom', value: id })
      }
      await qc.invalidateQueries({ queryKey: ['cycleLogs'] })
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error'
      Alert.alert('Error', message)
    }
  }

  async function setMood(id: string) {
    if (!userId) return
    try {
      // Replace today's mood row (one per day)
      await supabase
        .from('cycle_logs')
        .delete()
        .eq('user_id', userId)
        .eq('date', today)
        .eq('type', 'mood')
      await supabase
        .from('cycle_logs')
        .insert({ user_id: userId, date: today, type: 'mood', value: id })
      await qc.invalidateQueries({ queryKey: ['cycleLogs'] })
      setMoodSheet(false)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error'
      Alert.alert('Error', message)
    }
  }

  const moodSticker = MOODS.find((m) => m.id === moodToday)?.sticker ?? '🙂'

  return (
    <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
      <View style={[
        styles.strip,
        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg },
      ]}>
        <Pressable
          onPress={() => setMoodSheet(true)}
          style={[styles.face, { backgroundColor: stickers.yellow, borderColor: ink }]}
        >
          <Text style={{ fontSize: 16 }}>{moodSticker}</Text>
        </Pressable>

        <View style={styles.chips}>
          {chipSlots.map((id) => {
            const meta = ALL_SYMPTOMS.find((s) => s.id === id)
            const on = todaySymptoms.includes(id)
            return (
              <Pressable
                key={id}
                onPress={() => toggleChip(id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: on ? stickers.pinkSoft : colors.surfaceRaised,
                    borderColor: on ? ink : colors.border,
                  },
                ]}
              >
                <Text style={{ fontSize: 11, fontFamily: font.bodyBold, color: ink }}>
                  {meta?.sticker ?? ''} {meta?.label ?? id}
                </Text>
              </Pressable>
            )
          })}
          <Pressable
            onPress={() => setPickerOpen(true)}
            style={[styles.chip, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}
            hitSlop={6}
          >
            <Text style={{ fontSize: 13, color: colors.textMuted, fontFamily: font.bodyBold }}>+</Text>
          </Pressable>
        </View>
      </View>

      <MoodSymptomPickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        initialSelected={todaySymptoms}
      />
      <LogSheet visible={moodSheet} title="How's today?" onClose={() => setMoodSheet(false)}>
        <View style={styles.moodRow}>
          {MOODS.map((m) => {
            const active = moodToday === m.id
            return (
              <Pressable
                key={m.id}
                onPress={() => setMood(m.id)}
                style={[
                  styles.moodOpt,
                  { backgroundColor: active ? stickers.yellow : colors.surfaceRaised, borderColor: active ? ink : colors.border },
                ]}
              >
                <Text style={{ fontSize: 26 }}>{m.sticker}</Text>
              </Pressable>
            )
          })}
        </View>
      </LogSheet>
    </View>
  )
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1,
  },
  face: {
    width: 32, height: 32, borderRadius: 999, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  chips: { flex: 1, flexDirection: 'row', gap: 5, flexWrap: 'nowrap', overflow: 'hidden' },
  chip: {
    paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1,
  },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 6 },
  moodOpt: {
    width: 50, height: 50, borderRadius: 999, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
})
