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
import { X, ChevronRight } from 'lucide-react-native'
import { useTheme } from '../../../constants/theme'
import { PaperCard } from '../../ui/PaperCard'
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
  if (!appointment) return null

  const typeInfo = TYPE_LABEL[appointment.type]
  const weeksAway = appointment.week - currentWeek
  const timingLabel =
    weeksAway === 0 ? 'This week' :
    weeksAway === 1 ? 'Next week' :
    weeksAway > 0 ? `In ${weeksAway} weeks` : 'Overdue'

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.overlayBg} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.bgWarm }]}>
          <View style={styles.handle} />
          <Pressable onPress={onClose} style={styles.close}>
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
                Week {appointment.week} · {timingLabel}
              </Body>
            </View>

            <Body size={14} color={colors.textSecondary} style={styles.description}>
              {appointment.description}
            </Body>

            {/* Prep */}
            <PaperCard tint={stickers.yellowSoft} radius={16} padding={14} flat style={styles.card}>
              <View style={styles.cardHeader}>
                <TipRead size={20} />
                <MonoCaps size={10} color={colors.textMuted}>PREP</MonoCaps>
              </View>
              <Body size={13} color={colors.text} style={{ lineHeight: 19 }}>
                {appointment.prepNote}
              </Body>
            </PaperCard>

            {/* What to expect */}
            <PaperCard tint={stickers.blueSoft} radius={16} padding={14} flat style={styles.card}>
              <View style={styles.cardHeader}>
                <LogUltrasound size={20} />
                <MonoCaps size={10} color={colors.textMuted}>WHAT TO EXPECT</MonoCaps>
              </View>
              <Body size={13} color={colors.text} style={{ lineHeight: 19 }}>
                {appointment.whatToExpect}
              </Body>
            </PaperCard>

            {/* Questions */}
            <PaperCard tint={stickers.greenSoft} radius={16} padding={14} flat style={styles.card}>
              <View style={styles.cardHeader}>
                <NotifyInsight size={20} />
                <MonoCaps size={10} color={colors.textMuted}>QUESTIONS TO ASK</MonoCaps>
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
              <Pressable
                onPress={() => { onClose(); router.push('/(tabs)/agenda') }}
                style={[styles.ctaPrimary, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.ctaPrimaryText, { color: colors.textInverse }]}>
                  Schedule in agenda
                </Text>
                <ChevronRight size={14} color={colors.textInverse} strokeWidth={2.5} />
              </Pressable>

              <Pressable
                onPress={() => { onClose(); router.push('/grandma-talk') }}
                style={[styles.ctaSecondary, { borderColor: colors.border }]}
              >
                <Text style={[styles.ctaSecondaryText, { color: colors.textSecondary }]}>
                  Ask Grandma
                </Text>
              </Pressable>
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
  typeLabel: { fontSize: 11, fontFamily: 'DMSans_600SemiBold' },

  description: { paddingHorizontal: 24, marginBottom: 16, lineHeight: 20 },

  card: { marginHorizontal: 20, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },

  questionRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    paddingVertical: 4,
  },

  ctaRow: { paddingHorizontal: 20, marginTop: 8, gap: 8 },
  ctaPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14, borderRadius: 999,
  },
  ctaPrimaryText: { fontSize: 15, fontFamily: 'DMSans_600SemiBold' },
  ctaSecondary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 999, borderWidth: 1,
  },
  ctaSecondaryText: { fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
})
