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
import { useTheme, brand } from '../../constants/theme'
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
  const { colors, isDark } = useTheme()
  const insets = useSafeAreaInsets()

  const visible = appointment !== null

  const ST_INK = '#141313'
  const ST_PAPER = isDark ? colors.surface : '#FFFEF8'
  const ST_CREAM = isDark ? colors.surfaceRaised : '#F7F0DF'
  const ST_SHEET = isDark ? colors.bg : '#FAF6E8'
  const ST_LAVENDER = isDark ? '#C4B5EF' : brand.pregnancy
  const ST_GREEN = isDark ? '#9DD68A' : '#86C46F'
  const ST_CORAL = isDark ? '#F2A088' : '#E58968'
  const inkBorder = isDark ? colors.border : ST_INK
  const inkText = isDark ? colors.text : ST_INK
  const muted = isDark ? colors.textMuted : '#6E6763'

  // Hero color per status
  const heroFill =
    status === 'done' ? '#DDEBCB'
    : status === 'next' ? '#FBE0DC'
    : ST_CREAM
  const heroIconBg =
    status === 'done' ? ST_GREEN
    : status === 'next' ? ST_CORAL
    : ST_LAVENDER
  const statusFill =
    status === 'done' ? ST_GREEN
    : status === 'next' ? ST_CORAL
    : ST_LAVENDER

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
              backgroundColor: ST_SHEET,
              borderTopWidth: 1.5,
              borderLeftWidth: 1.5,
              borderRightWidth: 1.5,
              borderColor: inkBorder,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          {/* Drag handle */}
          <View style={[styles.handle, { backgroundColor: isDark ? colors.border : '#14131340' }]} />

          {/* Sticker close */}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeBtn,
              {
                backgroundColor: ST_CREAM,
                borderColor: inkBorder,
                shadowColor: ST_INK,
                shadowOffset: { width: 0, height: pressed ? 1 : 2 },
                shadowOpacity: 1,
                shadowRadius: 0,
                elevation: 3,
                transform: [{ translateY: pressed ? 1 : 0 }],
              },
            ]}
          >
            <X size={15} color={inkText} strokeWidth={2.5} />
          </Pressable>

          {appointment && (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scroll}
            >
              {/* ─── Hero (sticker paper card) ───────────────────────── */}
              <View
                style={[
                  styles.hero,
                  {
                    backgroundColor: heroFill,
                    borderColor: inkBorder,
                    shadowColor: ST_INK,
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: isDark ? 0 : 0.10,
                    shadowRadius: 0,
                    elevation: 3,
                  },
                ]}
              >
                <View
                  style={[
                    styles.heroIcon,
                    {
                      backgroundColor: heroIconBg,
                      borderColor: inkBorder,
                    },
                  ]}
                >
                  {status === 'done'
                    ? <Check size={26} color="#FFF" strokeWidth={3} />
                    : <Stethoscope size={26} color={inkText} strokeWidth={2.2} />
                  }
                </View>
                <View style={styles.heroText}>
                  <MonoCaps size={11} color={muted}>
                    Week {appointment.week} · {appointment.type.replace('_', ' ')}
                  </MonoCaps>
                  <Display size={24} color={inkText} style={{ marginTop: 4 }}>
                    {appointment.name}
                  </Display>
                  <View
                    style={[
                      styles.statusChip,
                      {
                        backgroundColor: statusFill,
                        borderColor: inkBorder,
                      },
                    ]}
                  >
                    <Text style={[styles.statusChipText, { color: '#FFF' }]}>
                      {STATUS_LABEL[status]}
                    </Text>
                  </View>
                </View>
              </View>

              {/* ─── Body sections ───────────────────────────────────── */}
              <Section title="About" muted={muted}>
                <Body size={14} color={inkText}>
                  {appointment.description}
                </Body>
              </Section>

              <Section title="How to prep" muted={muted}>
                <Body size={14} color={inkText}>
                  {appointment.prepNote}
                </Body>
              </Section>

              <Section title="What to expect" muted={muted}>
                <Body size={14} color={inkText}>
                  {appointment.whatToExpect}
                </Body>
              </Section>

              <Section title="Questions to ask" muted={muted}>
                <View style={{ gap: 10 }}>
                  {appointment.questions.map((q, i) => (
                    <View
                      key={i}
                      style={[
                        styles.questionRow,
                        {
                          backgroundColor: ST_PAPER,
                          borderColor: inkBorder,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.questionDot,
                          { backgroundColor: ST_LAVENDER, borderColor: inkBorder },
                        ]}
                      />
                      <Body size={14} color={inkText} style={{ flex: 1 }}>
                        {q}
                      </Body>
                    </View>
                  ))}
                </View>
              </Section>

              {/* ─── Actions (sticker buttons) ───────────────────────── */}
              <View style={styles.actionsRow}>
                {status !== 'done' && onMarkDone && (
                  <Pressable
                    onPress={onMarkDone}
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      {
                        backgroundColor: ST_LAVENDER,
                        borderColor: inkBorder,
                        shadowColor: ST_INK,
                        shadowOffset: { width: 0, height: pressed ? 2 : 4 },
                        shadowOpacity: 1,
                        shadowRadius: 0,
                        elevation: 5,
                        transform: [{ translateY: pressed ? 2 : 0 }],
                      },
                    ]}
                  >
                    <Check size={16} color="#FFF" strokeWidth={3} />
                    <Text style={styles.primaryBtnText}>Mark as done</Text>
                  </Pressable>
                )}
                {onAddToLogs && (
                  <Pressable
                    onPress={onAddToLogs}
                    style={({ pressed }) => [
                      styles.secondaryBtn,
                      {
                        backgroundColor: ST_CREAM,
                        borderColor: inkBorder,
                        shadowColor: ST_INK,
                        shadowOffset: { width: 0, height: pressed ? 1 : 3 },
                        shadowOpacity: 1,
                        shadowRadius: 0,
                        elevation: 4,
                        transform: [{ translateY: pressed ? 2 : 0 }],
                      },
                    ]}
                  >
                    <Plus size={16} color={inkText} strokeWidth={2.5} />
                    <Text style={[styles.secondaryBtnText, { color: inkText }]}>
                      Add details
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
      <Text style={[styles.sectionTitle, { color: muted }]}>
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
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
    borderWidth: 1.5,
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
    borderRadius: 24,
    borderWidth: 1.5,
    marginTop: 8,
    marginBottom: 8,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  heroText: {
    flex: 1,
    minWidth: 0,
  },
  statusChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1.5,
    marginTop: 10,
  },
  statusChipText: {
    fontSize: 11,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  section: {
    marginTop: 18,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 1.4,
    fontFamily: 'DMSans_700Bold',
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  questionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
    borderWidth: 1.2,
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
    borderRadius: 999,
    borderWidth: 2,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'DMSans_700Bold',
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
    borderRadius: 999,
    borderWidth: 1.5,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
})
