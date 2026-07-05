/**
 * MoodSymptomStrip — "Feeling anything today?" card below the Daily Nudge.
 *
 * A labelled card replacing the old bare chip strip: a heading question, a mood
 * face (top-right) that opens the mood sheet, and a row of phase-aware symptom
 * chips (icon + label). Tapping a chip toggles it immediately into cycle_logs
 * (no save button); the "more" tile opens the full picker sheet.
 *
 * Symptom ids are the canonical set from lib/cycleSymptoms — the same ids the
 * calendar log forms write, so home + calendar stay in sync.
 */

import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTheme } from '../../../constants/theme'
import { supabase } from '../../../lib/supabase'
import { toDateStr, type CyclePhase } from '../../../lib/cycleLogic'
import { symptomLabel, suggestedForPhase, type SymptomId } from '../../../lib/cycleSymptoms'
import { SymptomSticker } from '../../calendar/symptomStickers'
import { MoodSymptomPickerSheet } from './MoodSymptomPickerSheet'
import { LogSheet } from '../../calendar/LogSheet'
import { PaperCard } from '../../ui/PaperCard'
import { Sad, Smiley, Sleepy } from '../../ui/Stickers'
import { useDiffuseTheme, diffuseFont } from '../../../constants/theme'
import { useIsDiffuse } from '../../ui/diffuse/DiffuseKit'
import { useTranslation } from '../../../lib/i18n'

type MoodId = '1' | '2' | '3' | '4' | '5'

function MoodFace({ id, size = 22, stickerSet }: { id: MoodId; size?: number; stickerSet: ReturnType<typeof useTheme>['stickers'] }) {
  if (id === '1' || id === '2') return <Sad size={size} fill={stickerSet.blue} />
  if (id === '3') return <Sleepy size={size} fill={stickerSet.lilac} />
  return <Smiley size={size} fill={stickerSet.yellow} />
}

const MOODS: MoodId[] = ['1', '2', '3', '4', '5']

interface Props {
  phase: CyclePhase
}

export function MoodSymptomStrip({ phase }: Props) {
  const { colors, stickers, font, radius, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
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

  const chipSlots = useMemo<SymptomId[]>(() => {
    // Up to 3 chips: any logged-today symptoms first, then phase suggestions to backfill.
    const fromLogs = todaySymptoms.slice(0, 3) as SymptomId[]
    if (fromLogs.length >= 3) return fromLogs
    const suggestions = suggestedForPhase(phase).filter((d) => !fromLogs.includes(d))
    return [...fromLogs, ...suggestions].slice(0, 3)
  }, [phase, todaySymptoms])

  async function toggleChip(id: SymptomId) {
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

  const moodId = moodToday as MoodId | null
  const hasMood = moodId != null

  return (
    <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
      <PaperCard radius={radius.lg} padding={16}>
        <View style={styles.header}>
          <Text style={[styles.heading, { fontFamily: diffuse ? diffuseFont.display : font.display, color: diffuse ? dt.colors.ink : ink }]}>
            {t('cycleMoodStrip_heading')}
          </Text>
          <Pressable
            onPress={() => setMoodSheet(true)}
            hitSlop={6}
            style={[
              styles.face,
              diffuse
                ? {
                    backgroundColor: 'transparent',
                    borderColor: hasMood ? dt.colors.hairline : dt.colors.line2,
                    borderStyle: 'solid',
                  }
                : {
                    backgroundColor: hasMood ? stickers.yellow : colors.surfaceRaised,
                    borderColor: hasMood ? ink : colors.border,
                    borderStyle: hasMood ? 'solid' : 'dashed',
                  },
            ]}
          >
            {hasMood ? (
              <MoodFace id={moodId!} size={18} stickerSet={stickers} />
            ) : (
              <Text style={{ fontSize: 15, color: diffuse ? dt.colors.ink3 : colors.textMuted, fontFamily: diffuse ? diffuseFont.body : font.bodyBold, marginTop: -1 }}>
                +
              </Text>
            )}
          </Pressable>
        </View>

        <View style={styles.chips}>
          {chipSlots.map((id) => {
            const on = todaySymptoms.includes(id)
            if (diffuse) {
              // Hairline mono chip (`.chip` / `.chip.on`) — no filled sticker pill.
              return (
                <Pressable
                  key={id}
                  onPress={() => toggleChip(id)}
                  style={[
                    styles.chipD,
                    {
                      borderColor: on ? dt.colors.hairline : dt.colors.line,
                      backgroundColor: on ? dt.colors.surface : 'transparent',
                    },
                  ]}
                >
                  <Text style={{ fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase', fontFamily: on ? diffuseFont.monoBold : diffuseFont.mono, color: on ? dt.colors.ink : dt.colors.ink3 }}>
                    {symptomLabel(id)}
                  </Text>
                </Pressable>
              )
            }
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
                <SymptomSticker id={id} size={16} />
                <Text style={{ fontSize: 12, fontFamily: font.bodyBold, color: ink }}>
                  {symptomLabel(id)}
                </Text>
              </Pressable>
            )
          })}
          <Pressable
            onPress={() => setPickerOpen(true)}
            style={[
              diffuse ? styles.chipD : styles.moreChip,
              diffuse
                ? { borderColor: dt.colors.line, backgroundColor: 'transparent' }
                : { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
            ]}
            hitSlop={6}
          >
            <Text style={diffuse
              ? { fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase', color: dt.colors.ink3, fontFamily: diffuseFont.mono }
              : { fontSize: 11, color: colors.textMuted, fontFamily: font.bodyBold }}
            >{t('cycleMoodStrip_more')}</Text>
          </Pressable>
        </View>

        <Text style={[styles.hint, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.body } : { color: colors.textMuted, fontFamily: font.italic }]}>
          {t('cycleMoodStrip_hint')}
        </Text>
      </PaperCard>

      <MoodSymptomPickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        initialSelected={todaySymptoms}
      />
      <LogSheet visible={moodSheet} title="How's today?" onClose={() => setMoodSheet(false)}>
        <View style={styles.moodRow}>
          {MOODS.map((id) => {
            const active = moodToday === id
            return (
              <Pressable
                key={id}
                onPress={() => setMood(id)}
                style={[
                  styles.moodOpt,
                  diffuse
                    ? { backgroundColor: 'transparent', borderColor: active ? dt.colors.hairline : dt.colors.line2 }
                    : { backgroundColor: active ? stickers.yellow : colors.surfaceRaised, borderColor: active ? ink : colors.border },
                ]}
              >
                <MoodFace id={id} size={32} stickerSet={stickers} />
              </Pressable>
            )
          })}
        </View>
      </LogSheet>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
  },
  heading: { fontSize: 19, flex: 1 },
  face: {
    width: 34, height: 34, borderRadius: 999, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  chips: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 12 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 7, paddingHorizontal: 11, borderRadius: 999, borderWidth: 1,
  },
  chipD: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1,
  },
  moreChip: {
    paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1,
  },
  hint: { fontSize: 12, marginTop: 10 },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 6 },
  moodOpt: {
    width: 50, height: 50, borderRadius: 999, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
})
