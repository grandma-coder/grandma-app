/**
 * AppointmentDetailModal — rich detail sheet for standard pregnancy
 * appointments (NT scan, anatomy scan, glucose test, etc.).
 *
 * Shows prep note, what to expect, and suggested questions to ask the provider.
 * Deep-links to full agenda for scheduling.
 */

import { afterSheets } from '../../../lib/afterSheets'
import { useGrandmaChatEnabled } from '../../../store/useFeatureFlags'
import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { Character } from '../../characters/Characters'
import { useTheme, useDiffuseTheme, diffuseFont, getDiffuseAccent, getModeColorSoft } from '../../../constants/theme'
import { useIsDiffuse, DiffuseArrow } from '../../ui/diffuse/DiffuseKit'
import { DiffuseSheet } from '../../ui/diffuse/DiffusePrimitives'
import { useTranslation, type TranslationKey } from '../../../lib/i18n'
import { LogSheet } from '../../calendar/LogSheet'
import { SiteSticker, type SiteStickerName } from '../../stickers/SiteSticker'
import { FadeUp } from '../../ui/Motion'
import { AppointmentQuestions, CopySuggestedQuestion, nextStandardAppointmentId } from '../../calendar/AppointmentQuestions'
import type { StandardAppointment } from '../../../lib/pregnancyAppointments'

const TYPE_LABEL: Record<StandardAppointment['type'], { labelKey: TranslationKey; sticker: SiteStickerName }> = {
  ultrasound: { labelKey: 'preg_appts_type_ultrasound',  sticker: 'camera' },
  blood_test: { labelKey: 'sw1_appt_bloodTest',  sticker: 'syringe' },
  checkup:    { labelKey: 'preg_appts_type_checkup',    sticker: 'stetho' },
  test:       { labelKey: 'sw1_appt_test',       sticker: 'doc' },
  vaccine:    { labelKey: 'agenda_vaccine',     sticker: 'syringe' },
}

interface Props {
  visible: boolean
  appointment: StandardAppointment | null
  currentWeek: number
  onClose: () => void
}

export function AppointmentDetailModal({ visible, appointment, currentWeek, onClose }: Props) {
  const { colors, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  // Ask Grandma follows the remote grandma_chat flag (command center).
  const chatOn = useGrandmaChatEnabled()
  // Long-form appointment prose is translated at runtime + cached (Phase C).
  // Stable id-based keys so cache survives content edits (hash guards staleness).
  const description = appointment?.description ?? ''
  const prepNote = appointment?.prepNote ?? ''
  const whatToExpect = appointment?.whatToExpect ?? ''
  if (!appointment) return null

  const typeInfo = TYPE_LABEL[appointment.type]
  const weeksAway = appointment.week - currentWeek
  const timingLabel =
    weeksAway === 0 ? t('pregnancy_appt_thisWeek') :
    weeksAway === 1 ? t('pregnancy_appt_nextWeek') :
    weeksAway > 0 ? t('pregnancy_appt_inWeeks', { count: weeksAway }) : t('pregnancy_appt_overdue')

  // ─── Diffuse render — DiffuseSheet shell, hairline cards, mono data voice ──
  if (diffuse) {
    const accent = getDiffuseAccent('preg', dt.isDark)
    const ink = dt.colors.ink
    const ink2 = dt.colors.ink2
    const ink3 = dt.colors.ink3

    return (
      <DiffuseSheet visible={visible} title={appointment.name} onClose={onClose} chip={t(typeInfo.labelKey)}>
        {/* Timing eyebrow */}
        <Text style={[dstyles.timing, { color: ink3 }]}>
          {t('pregnancy_appt_weekTiming', { week: appointment.week, timing: timingLabel })}
        </Text>

        <Text style={[dstyles.description, { color: ink2 }]}>
          {description}
        </Text>

        {/* Prep */}
        <View style={[dstyles.card, { borderColor: dt.colors.line }]}>
          <View style={dstyles.cardHeader}>
            <Character name="note" size={22} color={accent} />
            <Text style={[dstyles.cardLabel, { color: ink3 }]}>{t('pregnancy_appt_prep')}</Text>
          </View>
          <Text style={[dstyles.cardBody, { color: ink2 }]}>{prepNote}</Text>
        </View>

        {/* What to expect */}
        <View style={[dstyles.card, { borderColor: dt.colors.line }]}>
          <View style={dstyles.cardHeader}>
            <Character name="checkup" size={22} color={accent} />
            <Text style={[dstyles.cardLabel, { color: ink3 }]}>{t('pregnancy_appt_whatToExpect')}</Text>
          </View>
          <Text style={[dstyles.cardBody, { color: ink2 }]}>{whatToExpect}</Text>
        </View>

        {/* Questions */}
        <View style={[dstyles.card, { borderColor: dt.colors.line }]}>
          <View style={dstyles.cardHeader}>
            <Character name="sparkle" size={22} color={accent} />
            <Text style={[dstyles.cardLabel, { color: ink3 }]}>{t('pregnancy_appt_questionsToAsk')}</Text>
          </View>
          {appointment.questions.map((q, i) => (
            <View key={i} style={dstyles.questionRow}>
              <Text style={[dstyles.questionNum, { color: accent }]}>{String(i + 1).padStart(2, '0')}</Text>
              <Text style={[dstyles.questionText, { color: ink2 }]}>{q}</Text>
            </View>
          ))}
        </View>

        {/* CTAs — containerless actions on hairline rules */}
        <Pressable
          onPress={() => { onClose(); afterSheets(() => router.push('/(tabs)/agenda')) }}
          style={({ pressed }) => [dstyles.action, { borderTopColor: dt.colors.line2, opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[dstyles.actionLabel, { color: ink }]}>{t('pregnancy_appt_scheduleInAgenda')}</Text>
          <DiffuseArrow color={ink3} size={16} />
        </Pressable>
        {chatOn && (
        <Pressable
          onPress={() => { onClose(); afterSheets(() => router.push('/grandma-talk')) }}
          style={({ pressed }) => [dstyles.action, { borderTopColor: dt.colors.line2, opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[dstyles.actionLabel, { color: ink }]}>{t('pregnancy_appt_askGrandma')}</Text>
          <DiffuseArrow color={ink3} size={16} />
        </Pressable>
        )}
      </DiffuseSheet>
    )
  }

  const ink = colors.text
  const eyebrow = [styles.eyebrow, { color: colors.textMuted }]
  const Divider = () => <View style={[styles.divider, { backgroundColor: colors.border }]} />
  const Action = ({ label, onPress }: { label: string; onPress: () => void }) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.action, { borderTopColor: colors.border, opacity: pressed ? 0.6 : 1 }]}
    >
      <Text style={[styles.actionLabel, { color: ink, fontFamily: font.bodyBold }]}>{label}</Text>
      <ChevronRight size={18} color={ink} strokeWidth={2} />
    </Pressable>
  )

  return (
    <LogSheet
      visible={visible}
      title={appointment.name}
      sticker={typeInfo.sticker}
      chip={t(typeInfo.labelKey)}
      onClose={onClose}
    >
      <View style={{ paddingBottom: 12 }}>
        <FadeUp index={0}>
          <Text style={eyebrow}>{t('pregnancy_appt_weekTiming', { week: appointment.week, timing: timingLabel })}</Text>
          <Text style={[styles.description, { color: colors.textSecondary, fontFamily: font.body }]}>{description}</Text>
        </FadeUp>

        <FadeUp index={1}>
          <Divider />
          <View style={styles.sectionHead}>
            <SiteSticker name="pencil" size={24} cut />
            <Text style={eyebrow}>{t('pregnancy_appt_prep')}</Text>
          </View>
          <Text style={[styles.body, { color: colors.textSecondary, fontFamily: font.body }]}>{prepNote}</Text>
        </FadeUp>

        <FadeUp index={2}>
          <Divider />
          <View style={styles.sectionHead}>
            <SiteSticker name="eye" size={24} cut />
            <Text style={eyebrow}>{t('pregnancy_appt_whatToExpect')}</Text>
          </View>
          <Text style={[styles.body, { color: colors.textSecondary, fontFamily: font.body }]}>{whatToExpect}</Text>
        </FadeUp>

        <FadeUp index={3}>
          <Divider />
          <AppointmentQuestions
            appointmentKey={appointment.id}
            mode="pregnancy"
            claimFrom={nextStandardAppointmentId(currentWeek) === appointment.id ? 'pregnancy' : undefined}
          />
          <Divider />
          <View style={styles.sectionHead}>
            <SiteSticker name="bubble" size={24} cut />
            <Text style={eyebrow}>{t('pregnancy_appt_questionsToAsk')}</Text>
          </View>
          {appointment.questions.map((q, i) => (
            <View key={i} style={styles.questionRow}>
              <Text style={[styles.questionNum, { color: ink, fontFamily: font.displayBold, backgroundColor: getModeColorSoft('pregnancy'), borderColor: ink }]}>{i + 1}</Text>
              <Text style={[styles.body, { flex: 1, color: ink, fontFamily: font.body }]}>{q}</Text>
              <CopySuggestedQuestion appointmentKey={appointment.id} text={q} />
            </View>
          ))}
        </FadeUp>

        <FadeUp index={4}>
          <View style={{ marginTop: 18 }}>
            <Action label={t('pregnancy_appt_scheduleInAgenda')} onPress={() => { onClose(); afterSheets(() => router.push('/(tabs)/agenda')) }} />
            {chatOn && (
              <Action label={t('pregnancy_appt_askGrandma')} onPress={() => { onClose(); afterSheets(() => router.push('/grandma-talk')) }} />
            )}
          </View>
        </FadeUp>
      </View>
    </LogSheet>
  )
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase' },
  description: { fontSize: 15, lineHeight: 22, marginTop: 8, marginBottom: 14 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 14 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  body: { fontSize: 14, lineHeight: 21 },
  questionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 5 },
  questionNum: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, overflow: 'hidden',
    textAlign: 'center', fontSize: 12, lineHeight: 19,
  },
  action: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 16,
  },
  actionLabel: { fontSize: 15 },
})

// ─── Diffuse styles — hairline cards, mono data voice, containerless CTAs ────
const dstyles = StyleSheet.create({
  timing: {
    fontFamily: diffuseFont.mono,
    fontSize: 10.5,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginTop: 2,
    marginBottom: 14,
  },
  description: {
    fontFamily: diffuseFont.body,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  cardLabel: {
    fontFamily: diffuseFont.mono,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  cardBody: {
    fontFamily: diffuseFont.body,
    fontSize: 13,
    lineHeight: 20,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 6,
  },
  questionNum: {
    fontFamily: diffuseFont.monoBold,
    fontSize: 12,
    letterSpacing: 0.5,
    marginTop: 1,
  },
  questionText: {
    flex: 1,
    fontFamily: diffuseFont.body,
    fontSize: 13,
    lineHeight: 20,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 16,
    paddingBottom: 4,
    marginTop: 4,
  },
  actionLabel: {
    fontFamily: diffuseFont.mono,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
})
