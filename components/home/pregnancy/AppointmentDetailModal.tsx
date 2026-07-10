/**
 * AppointmentDetailModal — rich detail sheet for standard pregnancy
 * appointments (NT scan, anatomy scan, glucose test, etc.).
 *
 * Shows prep note, what to expect, and suggested questions to ask the provider.
 * Deep-links to full agenda for scheduling.
 */

import React from 'react'
import { View, Text, Pressable, ScrollView, Modal, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { X, BookOpen, Scan, Lightbulb } from 'lucide-react-native'
import { useTheme, font, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../../../constants/theme'
import { useIsDiffuse, DiffuseArrow } from '../../ui/diffuse/DiffuseKit'
import { DiffuseSheet, DiffuseBloomIcon } from '../../ui/diffuse/DiffusePrimitives'
import { useTranslation } from '../../../lib/i18n'
import { useTranslatedContent } from '../../../lib/useTranslatedContent'
import { PaperCard } from '../../ui/PaperCard'
import { StickerButton } from '../../ui/StickerButton'
import { Display, MonoCaps, Body } from '../../ui/Typography'
import {
  LogUltrasound, LogExamResult, LogAppointment, HealthCheckup,
  TipRead, NotifyInsight,
} from '../../stickers/RewardStickers'
import type { StandardAppointment } from '../../../lib/pregnancyAppointments'

type StickerFn = (props: { size?: number; fill?: string; stroke?: string }) => React.ReactElement

const TYPE_LABEL: Record<StandardAppointment['type'], { label: string; Sticker: StickerFn }> = {
  ultrasound: { label: 'Ultrasound',  Sticker: LogUltrasound },
  blood_test: { label: 'Blood test',  Sticker: LogExamResult },
  checkup:    { label: 'Checkup',     Sticker: HealthCheckup },
  test:       { label: 'Test',        Sticker: LogAppointment },
  vaccine:    { label: 'Vaccine',     Sticker: HealthCheckup },
}

interface Props {
  visible: boolean
  appointment: StandardAppointment | null
  currentWeek: number
  onClose: () => void
}

export function AppointmentDetailModal({ visible, appointment, currentWeek, onClose }: Props) {
  const { colors, stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  // Long-form appointment prose is translated at runtime + cached (Phase C).
  // Stable id-based keys so cache survives content edits (hash guards staleness).
  const { text: description } = useTranslatedContent(
    `appt_${appointment?.id ?? 'none'}_description`,
    appointment?.description ?? '',
  )
  const { text: prepNote } = useTranslatedContent(
    `appt_${appointment?.id ?? 'none'}_prepNote`,
    appointment?.prepNote ?? '',
  )
  const { text: whatToExpect } = useTranslatedContent(
    `appt_${appointment?.id ?? 'none'}_whatToExpect`,
    appointment?.whatToExpect ?? '',
  )
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
      <DiffuseSheet visible={visible} title={appointment.name} onClose={onClose} chip={typeInfo.label}>
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
            <DiffuseBloomIcon color={accent} size={30}>
              <BookOpen size={16} color={ink3} strokeWidth={1.6} />
            </DiffuseBloomIcon>
            <Text style={[dstyles.cardLabel, { color: ink3 }]}>{t('pregnancy_appt_prep')}</Text>
          </View>
          <Text style={[dstyles.cardBody, { color: ink2 }]}>{prepNote}</Text>
        </View>

        {/* What to expect */}
        <View style={[dstyles.card, { borderColor: dt.colors.line }]}>
          <View style={dstyles.cardHeader}>
            <DiffuseBloomIcon color={accent} size={30}>
              <Scan size={16} color={ink3} strokeWidth={1.6} />
            </DiffuseBloomIcon>
            <Text style={[dstyles.cardLabel, { color: ink3 }]}>{t('pregnancy_appt_whatToExpect')}</Text>
          </View>
          <Text style={[dstyles.cardBody, { color: ink2 }]}>{whatToExpect}</Text>
        </View>

        {/* Questions */}
        <View style={[dstyles.card, { borderColor: dt.colors.line }]}>
          <View style={dstyles.cardHeader}>
            <DiffuseBloomIcon color={accent} size={30}>
              <Lightbulb size={16} color={ink3} strokeWidth={1.6} />
            </DiffuseBloomIcon>
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
          onPress={() => { onClose(); router.push('/(tabs)/agenda') }}
          style={({ pressed }) => [dstyles.action, { borderTopColor: dt.colors.line2, opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[dstyles.actionLabel, { color: ink }]}>{t('pregnancy_appt_scheduleInAgenda')}</Text>
          <DiffuseArrow color={ink3} size={16} />
        </Pressable>
        <Pressable
          onPress={() => { onClose(); router.push('/grandma-talk') }}
          style={({ pressed }) => [dstyles.action, { borderTopColor: dt.colors.line2, opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[dstyles.actionLabel, { color: ink }]}>{t('pregnancy_appt_askGrandma')}</Text>
          <DiffuseArrow color={ink3} size={16} />
        </Pressable>
      </DiffuseSheet>
    )
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.overlayBg} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.bgWarm }]}>
          <View style={styles.handle} />
          <Pressable
            onPress={onClose}
            style={styles.close}
            accessibilityRole="button"
            accessibilityLabel="Close appointment details"
            hitSlop={10}
          >
            <X size={18} color={colors.textMuted} strokeWidth={2} />
          </Pressable>

          <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <View style={[styles.typeBadge, { backgroundColor: stickers.yellowSoft }]}>
                <typeInfo.Sticker size={20} />
                <Text style={[styles.typeLabel, { color: colors.text }]}>{typeInfo.label}</Text>
              </View>
              <Display size={28} color={colors.text} style={{ marginTop: 8 }}>
                {appointment.name}
              </Display>
              <Body size={13} color={colors.textMuted} style={{ marginTop: 4 }}>
                {t('pregnancy_appt_weekTiming', { week: appointment.week, timing: timingLabel })}
              </Body>
            </View>

            <Body size={14} color={colors.textSecondary} style={styles.description}>
              {description}
            </Body>

            {/* Prep */}
            <PaperCard tint={stickers.yellowSoft} radius={16} padding={14} flat style={styles.card}>
              <View style={styles.cardHeader}>
                <TipRead size={20} />
                <MonoCaps size={10} color={colors.textMuted}>{t('pregnancy_appt_prep')}</MonoCaps>
              </View>
              <Body size={13} color={colors.text} style={{ lineHeight: 19 }}>
                {prepNote}
              </Body>
            </PaperCard>

            {/* What to expect */}
            <PaperCard tint={stickers.blueSoft} radius={16} padding={14} flat style={styles.card}>
              <View style={styles.cardHeader}>
                <LogUltrasound size={20} />
                <MonoCaps size={10} color={colors.textMuted}>{t('pregnancy_appt_whatToExpect')}</MonoCaps>
              </View>
              <Body size={13} color={colors.text} style={{ lineHeight: 19 }}>
                {whatToExpect}
              </Body>
            </PaperCard>

            {/* Questions */}
            <PaperCard tint={stickers.greenSoft} radius={16} padding={14} flat style={styles.card}>
              <View style={styles.cardHeader}>
                <NotifyInsight size={20} />
                <MonoCaps size={10} color={colors.textMuted}>{t('pregnancy_appt_questionsToAsk')}</MonoCaps>
              </View>
              {appointment.questions.map((q, i) => (
                <View key={i} style={styles.questionRow}>
                  <Body size={13} color={colors.textMuted}>{i + 1}.</Body>
                  <Body size={13} color={colors.text} style={{ flex: 1, lineHeight: 19 }}>{q}</Body>
                </View>
              ))}
            </PaperCard>

            {/* CTAs */}
            <View style={styles.ctaRow}>
              <StickerButton
                label={t('pregnancy_appt_scheduleInAgenda')}
                color={stickers.lilac}
                colorSoft={stickers.lilacSoft}
                onPress={() => { onClose(); router.push('/(tabs)/agenda') }}
              />
              <StickerButton
                label={t('pregnancy_appt_askGrandma')}
                color={stickers.yellow}
                colorSoft={stickers.yellowSoft}
                active={false}
                onPress={() => { onClose(); router.push('/grandma-talk') }}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20,19,19,0.55)' },
  sheet: {
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingTop: 12, maxHeight: '88%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(245,237,220,0.2)', alignSelf: 'center', marginBottom: 16 },
  close: { position: 'absolute', top: 12, right: 20, padding: 8, zIndex: 10 },

  header: { paddingHorizontal: 24, marginBottom: 16 },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
  },
  typeLabel: { fontSize: 11, fontFamily: font.bodySemiBold },

  description: { paddingHorizontal: 24, marginBottom: 16, lineHeight: 20 },

  card: { marginHorizontal: 20, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },

  questionRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    paddingVertical: 4,
  },

  ctaRow: { paddingHorizontal: 20, marginTop: 8, gap: 10 },
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
