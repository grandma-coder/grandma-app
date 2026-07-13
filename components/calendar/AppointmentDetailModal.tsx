/**
 * AppointmentDetailModal — sticker-on-paper bottom sheet for a STANDARD_APPOINTMENT.
 *
 * Hero: cream paper card with status sticker icon, week caps caption,
 * Fraunces title, and a status pill.
 * Body: About / How to prep / What to expect / Questions sections.
 * Actions: sticker Mark-as-done + sticker Add-details buttons.
 */

import React from 'react'
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { X, Check, Plus, Stethoscope } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, font, shadows } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import { useTranslatedContent } from '../../lib/useTranslatedContent'
import { Display, Body, MonoCaps } from '../ui/Typography'
import type { StandardAppointment } from '../../lib/pregnancyAppointments'

type Status = 'done' | 'next' | 'future'

interface Props {
  appointment: StandardAppointment | null
  status: Status
  onClose: () => void
  onMarkDone?: () => void
  onAddToLogs?: () => void
}

const STATUS_LABEL: Record<Status, string> = {
  done: 'Done',
  next: 'Up next',
  future: 'Upcoming',
}

export function AppointmentDetailModal({
  appointment,
  status,
  onClose,
  onMarkDone,
  onAddToLogs,
}: Props) {
  const { colors, stickers, radius, brand: themeBrand } = useTheme()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()

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

  const visible = appointment !== null

  // Tokens-only, warm cream-paper. Violet is an ACCENT here (the "next/soon"
  // status tint + the small question dots) — never a flooded surface. Cards are
  // paper-white on the cream sheet with hairline borders + soft shadows; no
  // heavy ink outlines or hard offset "sticker" shadows.
  const sheetBg = colors.bg
  const paper = colors.surface
  const hairline = colors.border
  const inkText = colors.text
  const muted = colors.textMuted

  // Per-status accent, from the sticker palette (soft wash + dark ink). The
  // "next/soon" status is the only place lavender appears as a fill, and even
  // then it's the *soft* wash, not the saturated brand violet.
  const accent =
    status === 'done' ? { soft: stickers.greenSoft, ink: stickers.greenInk }
    : status === 'next' ? { soft: stickers.lilacSoft, ink: stickers.lilacInk }
    : { soft: stickers.peachSoft, ink: stickers.peachInk }

  // Small violet detail — the question bullets carry the mode accent as a dot,
  // the "specific detail" the brand is meant for.
  const dotAccent = themeBrand.pregnancy

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.sheet,
            {
              backgroundColor: sheetBg,
              borderColor: hairline,
              paddingBottom: insets.bottom + 16,
            },
            shadows.pop,
          ]}
        >
          {/* Drag handle */}
          <View style={[styles.handle, { backgroundColor: hairline }]} />

          {/* Close — soft paper chip, hairline border */}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeBtn,
              { backgroundColor: paper, borderColor: hairline, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <X size={16} color={muted} strokeWidth={2.5} />
          </Pressable>

          {appointment && (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scroll}
            >
              {/* ─── Hero — status-soft wash on paper, hairline, soft shadow ── */}
              <View
                style={[
                  styles.hero,
                  { backgroundColor: accent.soft, borderColor: hairline, borderRadius: radius.lg },
                  shadows.card,
                ]}
              >
                <View style={[styles.heroIcon, { backgroundColor: paper, borderColor: hairline }]}>
                  {status === 'done'
                    ? <Check size={24} color={accent.ink} strokeWidth={2.6} />
                    : <Stethoscope size={24} color={accent.ink} strokeWidth={2.2} />
                  }
                </View>
                <View style={styles.heroText}>
                  <MonoCaps size={11} color={muted}>
                    {t('pregnancy_appt_weekTiming', { week: appointment.week, timing: appointment.type.replace('_', ' ') })}
                  </MonoCaps>
                  <Display size={24} color={inkText} style={{ marginTop: 4 }}>
                    {appointment.name}
                  </Display>
                  <View style={[styles.statusChip, { backgroundColor: paper, borderColor: hairline, borderRadius: radius.full }]}>
                    <MonoCaps size={11} color={accent.ink}>
                      {STATUS_LABEL[status]}
                    </MonoCaps>
                  </View>
                </View>
              </View>

              {/* ─── Body sections ───────────────────────────────────── */}
              <Section title={t('pregnancy_appt_about')} muted={muted}>
                <Body size={14} color={inkText}>
                  {description}
                </Body>
              </Section>

              <Section title={t('pregnancy_appt_prep')} muted={muted}>
                <Body size={14} color={inkText}>
                  {prepNote}
                </Body>
              </Section>

              <Section title={t('pregnancy_appt_whatToExpect')} muted={muted}>
                <Body size={14} color={inkText}>
                  {whatToExpect}
                </Body>
              </Section>

              <Section title={t('pregnancy_appt_questionsToAsk')} muted={muted}>
                <View style={{ gap: 10 }}>
                  {appointment.questions.map((q, i) => (
                    <View
                      key={i}
                      style={[
                        styles.questionRow,
                        { backgroundColor: paper, borderColor: hairline, borderRadius: radius.md },
                      ]}
                    >
                      {/* Small violet dot — the "specific detail" accent. */}
                      <View style={[styles.questionDot, { backgroundColor: dotAccent }]} />
                      <Body size={14} color={inkText} style={{ flex: 1 }}>
                        {q}
                      </Body>
                    </View>
                  ))}
                </View>
              </Section>

              {/* ─── Actions — filled ink primary + paper secondary pill ── */}
              <View style={styles.actionsRow}>
                {status !== 'done' && onMarkDone && (
                  <Pressable
                    onPress={onMarkDone}
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      { backgroundColor: inkText, borderRadius: radius.full, opacity: pressed ? 0.85 : 1 },
                      shadows.subtle,
                    ]}
                  >
                    <Check size={16} color={colors.textInverse} strokeWidth={3} />
                    <Text style={[styles.primaryBtnText, { color: colors.textInverse }]}>{t('kids_home_reminder_mark_done')}</Text>
                  </Pressable>
                )}
                {onAddToLogs && (
                  <Pressable
                    onPress={onAddToLogs}
                    style={({ pressed }) => [
                      styles.secondaryBtn,
                      { backgroundColor: paper, borderColor: hairline, borderRadius: radius.full, opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Plus size={16} color={inkText} strokeWidth={2.5} />
                    <Text style={[styles.secondaryBtnText, { color: inkText }]}>
                      {t('calAppt_addDetails')}
                    </Text>
                  </Pressable>
                )}
              </View>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// Section header uses the mono-caps "label voice" (MonoCaps) — the same eyebrow
// grammar as the hero's WEEK · TYPE caption and the rest of the app's section
// labels — so the sheet mixes Fraunces (titles) · DM Sans (prose) · mono-caps
// (labels) instead of one flat sans everywhere.
function Section({
  title,
  muted,
  children,
}: {
  title: string
  muted: string
  children: React.ReactNode
}) {
  return (
    <View style={styles.section}>
      <MonoCaps size={11} color={muted}>
        {title}
      </MonoCaps>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    // Warm ink scrim, matching LogSheet's 0.55 (shared bottom-sheet convention).
    backgroundColor: 'rgba(20,19,19,0.55)',
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    maxHeight: '92%',
    paddingTop: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    top: 18,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  hero: {
    flexDirection: 'row',
    gap: 14,
    padding: 18,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 8,
    // borderRadius: radius.lg — applied inline (radius from useTheme)
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  heroText: {
    flex: 1,
    minWidth: 0,
  },
  statusChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    marginTop: 10,
    // borderRadius: radius.full — applied inline
  },
  section: {
    marginTop: 18,
    gap: 8,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderWidth: 1,
    // borderRadius: radius.md — applied inline
  },
  questionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 7,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  primaryBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    // borderRadius: radius.full — applied inline
  },
  primaryBtnText: {
    fontSize: 14,
    fontFamily: font.bodyBold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderWidth: 1,
    // borderRadius: radius.full — applied inline
  },
  secondaryBtnText: {
    fontSize: 14,
    fontFamily: font.bodyBold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
})
