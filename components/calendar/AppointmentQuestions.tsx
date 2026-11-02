/**
 * AppointmentQuestions — "My questions" for an appointment (site look only).
 *
 * The user writes questions down during the week; on the day, each one is ticked as
 * asked. Questions live in useAppointmentQuestionsStore (local, keyed by appointment
 * id). If `claimFrom` is set, the journey's pending "next appointment" questions move
 * onto this appointment when it opens.
 *
 * Also exports the small "+" that copies a suggested question into the list, and
 * helpers the calendars use for the quiet "3 questions" count.
 */

import React, { useEffect, useState } from 'react'
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native'
import { Check, Plus, X } from 'lucide-react-native'
import { useTheme, getModeColorSoft } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import { SiteSticker } from '../stickers/SiteSticker'
import { ACTION_TONES } from '../ui/AuthDock'
import {
  useAppointmentQuestions,
  useAppointmentQuestionsStore,
} from '../../store/useAppointmentQuestionsStore'
import type { Behavior } from '../../store/useBehaviorStore'
import { STANDARD_APPOINTMENTS } from '../../lib/pregnancyAppointments'

const MONO = 'SpaceMono_400Regular'

/** The pregnancy appointment that's next up (first one not yet past). */
export function nextStandardAppointmentId(currentWeek: number): string | null {
  return STANDARD_APPOINTMENTS.find((a) => a.week >= currentWeek)?.id ?? null
}

/** Kids logs that are a visit someone can bring questions to: doctor visits and vaccines. */
export function isKidsVisitLog(type: string, value: string | null | undefined): boolean {
  if (type === 'vaccine' || type === 'health') return true
  if (type !== 'note') return false
  try {
    const v = JSON.parse(value ?? '{}')
    return v?.eventType === 'Doctor visit'
  } catch {
    return false
  }
}

/** Quiet eyebrow count for rows/cards — renders nothing at 0. */
export function QuestionCountHint({ count, style }: { count: number; style?: object }) {
  const { colors } = useTheme()
  const { t } = useTranslation()
  if (count <= 0) return null
  return (
    <Text style={[styles.countHint, { color: colors.textMuted }, style]}>
      {count === 1 ? t('apptQuestions_countOne') : t('apptQuestions_count', { count })}
    </Text>
  )
}

interface Props {
  /** Appointment id (or a `pending:<behavior>` bucket). */
  appointmentKey: string
  /** Journey tone for the done fill. */
  mode: 'pregnancy' | 'kids'
  /** When set, this journey's pending questions move here on open. */
  claimFrom?: Behavior
  /** Eyebrow override (default "My questions"). */
  title?: string
  /** Quiet line under the eyebrow. */
  hint?: string
}

export function AppointmentQuestions({ appointmentKey, mode, claimFrom, title, hint }: Props) {
  const { colors, font, isDark } = useTheme()
  const { t } = useTranslation()
  const questions = useAppointmentQuestions(appointmentKey)
  const add = useAppointmentQuestionsStore((s) => s.add)
  const toggle = useAppointmentQuestionsStore((s) => s.toggle)
  const remove = useAppointmentQuestionsStore((s) => s.remove)
  const claimPending = useAppointmentQuestionsStore((s) => s.claimPending)
  const [writing, setWriting] = useState(false)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    if (claimFrom) claimPending(claimFrom, appointmentKey)
  }, [claimFrom, appointmentKey, claimPending])

  // A new appointment opens with the field closed.
  useEffect(() => {
    setWriting(false)
    setDraft('')
  }, [appointmentKey])

  const ink = colors.text
  const tone = getModeColorSoft(mode, isDark)
  const peach = isDark ? colors.surface : ACTION_TONES.peach

  const save = () => {
    if (add(appointmentKey, draft)) setDraft('')
  }

  return (
    <View>
      <View style={styles.head}>
        <SiteSticker name="doc" size={24} cut />
        <Text style={[styles.eyebrow, { color: colors.textMuted }]}>{title ?? t('apptQuestions_title')}</Text>
      </View>
      {hint ? <Text style={[styles.hint, { color: colors.textSecondary, fontFamily: font.body }]}>{hint}</Text> : null}

      {questions.map((q, i) => (
        <View
          key={q.id}
          style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
        >
          <Pressable
            onPress={() => toggle(appointmentKey, q.id)}
            hitSlop={8}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: q.done }}
            accessibilityLabel={q.text}
            style={({ pressed }) => [
              styles.check,
              { borderColor: ink, backgroundColor: q.done ? tone : colors.surface, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            {q.done ? <Check size={13} color={ink} strokeWidth={3} /> : null}
          </Pressable>
          <Text
            style={[
              styles.text,
              { fontFamily: font.body, color: q.done ? colors.textMuted : ink },
              q.done && styles.struck,
            ]}
          >
            {q.text}
          </Text>
          <Pressable
            onPress={() => remove(appointmentKey, q.id)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('apptQuestions_delete')}
            style={({ pressed }) => [styles.delete, { opacity: pressed ? 0.5 : 1 }]}
          >
            <X size={16} color={colors.textMuted} strokeWidth={2.2} />
          </Pressable>
        </View>
      ))}

      {writing ? (
        <View style={[styles.writeRow, questions.length > 0 && { marginTop: 10 }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t('apptQuestions_placeholder')}
            placeholderTextColor={colors.textMuted}
            autoFocus
            multiline
            blurOnSubmit
            returnKeyType="done"
            onSubmitEditing={save}
            style={[styles.field, { borderColor: ink, backgroundColor: colors.surface, color: ink, fontFamily: font.body }]}
          />
          <Pressable
            onPress={save}
            disabled={!draft.trim()}
            accessibilityRole="button"
            accessibilityLabel={t('common_save')}
            style={({ pressed }) => [
              styles.savePill,
              { borderColor: ink, backgroundColor: tone, opacity: !draft.trim() ? 0.45 : pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.saveLabel, { color: ink, fontFamily: font.bodyBold }]}>{t('common_save')}</Text>
          </Pressable>
          <Pressable
            onPress={() => { setWriting(false); setDraft('') }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('common_close')}
            style={({ pressed }) => [styles.delete, { opacity: pressed ? 0.5 : 1 }]}
          >
            <X size={18} color={ink} strokeWidth={2.2} />
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => setWriting(true)}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.addPill,
            { borderColor: ink, backgroundColor: peach, opacity: pressed ? 0.7 : 1 },
            questions.length > 0 && { marginTop: 10 },
          ]}
        >
          <SiteSticker name="pencil" size={22} />
          <Text style={[styles.addLabel, { color: ink, fontFamily: font.bodyBold }]}>{t('apptQuestions_add')}</Text>
        </Pressable>
      )}
    </View>
  )
}

/** Small "+" on a suggested question: copies it into "My questions" (tick once it's there). */
export function CopySuggestedQuestion({ appointmentKey, text }: { appointmentKey: string; text: string }) {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const questions = useAppointmentQuestions(appointmentKey)
  const add = useAppointmentQuestionsStore((s) => s.add)
  const added = questions.some((q) => q.text === text.trim())
  const ink = colors.text
  return (
    <Pressable
      onPress={() => { if (!added) add(appointmentKey, text) }}
      disabled={added}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={t('apptQuestions_copySuggested')}
      accessibilityState={{ disabled: added }}
      style={({ pressed }) => [
        styles.copy,
        { borderColor: added ? colors.border : ink, backgroundColor: colors.surface, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      {added
        ? <Check size={12} color={colors.textMuted} strokeWidth={3} />
        : <Plus size={13} color={ink} strokeWidth={2.6} />}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  eyebrow: { fontFamily: MONO, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase' },
  hint: { fontSize: 13, lineHeight: 19, marginTop: -2, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10 },
  check: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', marginTop: -1,
  },
  text: { flex: 1, fontSize: 15, lineHeight: 21 },
  struck: { textDecorationLine: 'line-through' },
  delete: { paddingTop: 2, paddingHorizontal: 2 },
  addPill: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderRadius: 999, paddingVertical: 8, paddingLeft: 10, paddingRight: 16,
  },
  addLabel: { fontSize: 14 },
  writeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  field: {
    flex: 1, minHeight: 46, maxHeight: 120, borderWidth: 1.5, borderRadius: 14,
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, fontSize: 16, lineHeight: 21,
  },
  savePill: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 16, height: 40, justifyContent: 'center' },
  saveLabel: { fontSize: 14 },
  copy: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', marginTop: -1,
  },
  countHint: { fontFamily: MONO, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 3 },
})
