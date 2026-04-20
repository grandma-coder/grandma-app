/**
 * AppointmentDetailModal — bottom sheet with rich detail for a STANDARD_APPOINTMENT.
 *
 * Shows: name + week badge + status, prep notes, what to expect,
 * questions to ask, plus action buttons (mark done / add log).
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
import { getTint } from './tints'
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
  const { colors, isDark, font } = useTheme()
  const insets = useSafeAreaInsets()

  const visible = appointment !== null
  const tint = getTint('appointment', isDark)
  const ink = isDark ? colors.text : '#141313'
  const muted = isDark ? colors.textMuted : '#6E6763'
  const paper = isDark ? colors.surface : '#FFFEF8'
  const border = isDark ? colors.border : 'rgba(20,19,19,0.08)'

  const statusColor =
    status === 'done' ? colors.success : status === 'next' ? brand.pregnancy : muted

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
              backgroundColor: paper,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <View style={styles.handle} />
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <X size={20} color={muted} strokeWidth={2} />
          </Pressable>

          {appointment && (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scroll}
            >
              {/* Header — colored hero */}
              <View
                style={[
                  styles.hero,
                  { backgroundColor: tint.fill, borderColor: border },
                ]}
              >
                <View style={[styles.heroIcon, { backgroundColor: tint.ink + '22' }]}>
                  <Stethoscope size={28} color={tint.ink} strokeWidth={2} />
                </View>
                <View style={styles.heroText}>
                  <MonoCaps size={11} color={muted}>
                    Week {appointment.week} · {appointment.type.replace('_', ' ')}
                  </MonoCaps>
                  <Display size={24} color={ink} style={{ marginTop: 4 }}>
                    {appointment.name}
                  </Display>
                  <View
                    style={[
                      styles.statusChip,
                      {
                        backgroundColor: statusColor + '22',
                        borderColor: statusColor + '40',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        { color: statusColor, fontFamily: font.bodySemiBold },
                      ]}
                    >
                      {STATUS_LABEL[status]}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Body sections */}
              <Section title="About">
                <Body size={14} color={ink}>
                  {appointment.description}
                </Body>
              </Section>

              <Section title="How to prep">
                <Body size={14} color={ink}>
                  {appointment.prepNote}
                </Body>
              </Section>

              <Section title="What to expect">
                <Body size={14} color={ink}>
                  {appointment.whatToExpect}
                </Body>
              </Section>

              <Section title="Questions to ask">
                <View style={{ gap: 8 }}>
                  {appointment.questions.map((q, i) => (
                    <View key={i} style={styles.questionRow}>
                      <View
                        style={[styles.questionDot, { backgroundColor: tint.ink }]}
                      />
                      <Body size={14} color={ink} style={{ flex: 1 }}>
                        {q}
                      </Body>
                    </View>
                  ))}
                </View>
              </Section>

              {/* Actions */}
              <View style={styles.actionsRow}>
                {status !== 'done' && onMarkDone && (
                  <Pressable
                    onPress={onMarkDone}
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      { backgroundColor: brand.pregnancy, opacity: pressed ? 0.85 : 1 },
                    ]}
                  >
                    <Check size={16} color="#fff" strokeWidth={2.5} />
                    <Text style={styles.primaryBtnText}>Mark as done</Text>
                  </Pressable>
                )}
                {onAddToLogs && (
                  <Pressable
                    onPress={onAddToLogs}
                    style={({ pressed }) => [
                      styles.secondaryBtn,
                      {
                        backgroundColor: paper,
                        borderColor: border,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Plus size={16} color={ink} strokeWidth={2.5} />
                    <Text style={[styles.secondaryBtnText, { color: ink }]}>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors, isDark, font } = useTheme()
  const muted = isDark ? colors.textMuted : '#6E6763'
  return (
    <View style={styles.section}>
      <Text
        style={[
          styles.sectionTitle,
          { color: muted, fontFamily: font.bodySemiBold },
        ]}
      >
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
    backgroundColor: 'rgba(127,127,127,0.3)',
    alignSelf: 'center',
    marginBottom: 8,
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    top: 12,
    padding: 8,
    zIndex: 10,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  hero: {
    flexDirection: 'row',
    gap: 14,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 8,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    flex: 1,
    minWidth: 0,
  },
  statusChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 8,
  },
  statusChipText: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
  section: {
    marginTop: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 1.2,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  questionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 999,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 999,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
})
