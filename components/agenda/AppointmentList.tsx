import { useState } from 'react'
import { View, Text, Pressable, TextInput, Modal, ScrollView, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { GlassCard } from '../ui/GlassCard'
import { colors, THEME_COLORS, borderRadius, shadows, typography } from '../../constants/theme'

export interface AppointmentEntry {
  id: string
  date: string
  title: string
  type: string
  doctorName?: string
  location?: string
  notes?: string
}

interface AppointmentListProps {
  appointments: AppointmentEntry[]
  selectedDate: string
  onAdd?: (appointment: Omit<AppointmentEntry, 'id'>) => void
}

const TYPES = [
  { id: 'checkup', label: 'Checkup', icon: 'medkit-outline', color: THEME_COLORS.blue },
  { id: 'bloodwork', label: 'Bloodwork', icon: 'water-outline', color: '#FF6B6B' },
  { id: 'ultrasound', label: 'Ultrasound', icon: 'image-outline', color: THEME_COLORS.pink },
  { id: 'glucose_test', label: 'Glucose Test', icon: 'flask-outline', color: THEME_COLORS.yellow },
  { id: 'fertility', label: 'Fertility', icon: 'flower-outline', color: THEME_COLORS.green },
  { id: 'specialist', label: 'Specialist', icon: 'person-outline', color: THEME_COLORS.purple },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline', color: THEME_COLORS.orange },
]

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function AppointmentList({ appointments, selectedDate, onAdd }: AppointmentListProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState('')
  const [selectedType, setSelectedType] = useState('checkup')
  const [doctorName, setDoctorName] = useState('')
  const [notes, setNotes] = useState('')

  const upcoming = appointments
    .filter((a) => a.date >= selectedDate)
    .sort((a, b) => a.date.localeCompare(b.date))

  const past = appointments
    .filter((a) => a.date < selectedDate)
    .sort((a, b) => b.date.localeCompare(a.date))

  function handleSubmit() {
    if (!title.trim()) return
    onAdd?.({
      date: selectedDate,
      title: title.trim(),
      type: selectedType,
      doctorName: doctorName.trim() || undefined,
      notes: notes.trim() || undefined,
    })
    setTitle('')
    setDoctorName('')
    setNotes('')
    setSelectedType('checkup')
    setShowAdd(false)
  }

  function renderAppointment(appt: AppointmentEntry) {
    const typeInfo = TYPES.find((t) => t.id === appt.type) ?? TYPES[6]
    return (
      <GlassCard key={appt.id} style={styles.apptCard}>
        <View style={styles.apptRow}>
          <View style={[styles.apptIconBox, { backgroundColor: typeInfo.color + '15' }]}>
            <Ionicons name={typeInfo.icon as any} size={20} color={typeInfo.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.apptTitle}>{appt.title}</Text>
            <Text style={styles.apptDate}>{formatDate(appt.date)}</Text>
            {appt.doctorName && (
              <Text style={styles.apptDoctor}>Dr. {appt.doctorName}</Text>
            )}
          </View>
          <View style={[styles.typeBadge, { backgroundColor: typeInfo.color + '20' }]}>
            <Text style={[styles.typeBadgeText, { color: typeInfo.color }]}>
              {typeInfo.label}
            </Text>
          </View>
        </View>
      </GlassCard>
    )
  }

  return (
    <View style={styles.container}>
      {/* Add Appointment button */}
      <Pressable
        onPress={() => setShowAdd(true)}
        style={({ pressed }) => [styles.addButton, pressed && { transform: [{ scale: 0.97 }] }]}
      >
        <Ionicons name="add-circle-outline" size={20} color={THEME_COLORS.yellow} />
        <Text style={styles.addButtonText}>Add Appointment</Text>
      </Pressable>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <View>
          <Text style={styles.sectionLabel}>UPCOMING</Text>
          {upcoming.map(renderAppointment)}
        </View>
      )}

      {/* Past */}
      {past.length > 0 && (
        <View>
          <Text style={styles.sectionLabel}>PAST</Text>
          {past.map(renderAppointment)}
        </View>
      )}

      {/* Empty */}
      {appointments.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="medical-outline" size={40} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>No appointments</Text>
          <Text style={styles.emptyDesc}>
            Add doctor visits, ultrasounds, and checkups to keep track of your appointments.
          </Text>
        </View>
      )}

      {/* Add Modal */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>New Appointment</Text>

            <Text style={styles.modalLabel}>TYPE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
              {TYPES.map((type) => {
                const isActive = selectedType === type.id
                return (
                  <Pressable
                    key={type.id}
                    onPress={() => setSelectedType(type.id)}
                    style={[styles.typeChip, isActive && { borderColor: type.color, backgroundColor: type.color + '15' }]}
                  >
                    <Ionicons name={type.icon as any} size={14} color={isActive ? type.color : colors.textTertiary} />
                    <Text style={[styles.typeChipText, isActive && { color: type.color }]}>{type.label}</Text>
                  </Pressable>
                )
              })}
            </ScrollView>

            <Text style={styles.modalLabel}>TITLE</Text>
            <TextInput
              style={styles.input}
              selectionColor={THEME_COLORS.blue}
              placeholder="e.g. OB/GYN checkup"
              placeholderTextColor={colors.textTertiary}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.modalLabel}>DOCTOR (OPTIONAL)</Text>
            <TextInput
              style={styles.input}
              selectionColor={THEME_COLORS.blue}
              placeholder="Doctor's name"
              placeholderTextColor={colors.textTertiary}
              value={doctorName}
              onChangeText={setDoctorName}
            />

            <Text style={styles.modalLabel}>NOTES (OPTIONAL)</Text>
            <TextInput
              style={[styles.input, { minHeight: 80 }]}
              selectionColor={THEME_COLORS.blue}
              placeholder="Any notes..."
              placeholderTextColor={colors.textTertiary}
              value={notes}
              onChangeText={setNotes}
              multiline
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowAdd(false)} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmit}
                style={[styles.submitButton, !title.trim() && { opacity: 0.5 }]}
                disabled={!title.trim()}
              >
                <Text style={styles.submitText}>Add</Text>
                <Ionicons name="add-circle" size={18} color={colors.textOnAccent} />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {},

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: THEME_COLORS.yellow,
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME_COLORS.yellow,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  sectionLabel: {
    ...typography.label,
    marginBottom: 12,
    marginTop: 8,
  },

  apptCard: { marginBottom: 8 },
  apptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  apptIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  apptTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    textTransform: 'uppercase',
  },
  apptDate: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
  },
  apptDoctor: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
    marginBottom: 24, fontFamily: 'Fraunces_600SemiBold' },
  modalLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.textTertiary,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 20,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceGlass,
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textTertiary,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: 16,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    height: 56,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  submitButton: {
    flex: 2,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: THEME_COLORS.yellow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadows.glow,
  },
  submitText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textOnAccent,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
})
