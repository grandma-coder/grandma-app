import { useState, useMemo } from 'react'
import { View, Text, Pressable, TextInput, Modal, ScrollView, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { PaperCard } from '../ui/PaperCard'
import { useTheme } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'

type ThemeShape = ReturnType<typeof useTheme>

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

interface TypeOption {
  id: string
  label: string
  icon: string
  color: string
}

type TFn = ReturnType<typeof useTranslation>['t']

function buildTypes(stickers: ThemeShape['stickers'], t: TFn): TypeOption[] {
  return [
    { id: 'checkup', label: t('preg_appts_type_checkup'), icon: 'medkit-outline', color: stickers.blue },
    { id: 'bloodwork', label: t('preg_appts_type_bloodwork'), icon: 'water-outline', color: stickers.coral },
    { id: 'ultrasound', label: t('preg_appts_type_ultrasound'), icon: 'image-outline', color: stickers.pink },
    { id: 'glucose_test', label: t('preg_appts_type_glucose'), icon: 'flask-outline', color: stickers.yellow },
    { id: 'fertility', label: t('preg_appts_type_fertility'), icon: 'flower-outline', color: stickers.green },
    { id: 'specialist', label: t('preg_appts_type_specialist'), icon: 'person-outline', color: stickers.lilac },
    { id: 'other', label: t('preg_appts_type_other'), icon: 'ellipsis-horizontal-outline', color: stickers.peach },
  ]
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function AppointmentList({ appointments, selectedDate, onAdd }: AppointmentListProps) {
  const theme = useTheme()
  const { colors, stickers, radius } = theme
  const styles = useMemo(() => makeStyles(theme), [theme])
  const { t } = useTranslation()
  const TYPES = useMemo(() => buildTypes(stickers, t), [stickers, t])

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
      <PaperCard radius={radius.lg} padding={20} key={appt.id} style={styles.apptCard}>
        <View style={styles.apptRow}>
          <View style={[styles.apptIconBox, { backgroundColor: typeInfo.color + '22' }]}>
            <Ionicons name={typeInfo.icon as any} size={20} color={typeInfo.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.apptTitle}>{appt.title}</Text>
            <Text style={styles.apptDate}>{formatDate(appt.date)}</Text>
            {appt.doctorName && (
              <Text style={styles.apptDoctor}>{t('preg_appts_doctorName', { name: appt.doctorName })}</Text>
            )}
          </View>
          <View style={[styles.typeBadge, { backgroundColor: typeInfo.color + '2F' }]}>
            <Text style={[styles.typeBadgeText, { color: typeInfo.color }]}>
              {typeInfo.label}
            </Text>
          </View>
        </View>
      </PaperCard>
    )
  }

  return (
    <View style={styles.container}>
      {/* Filled pill CTA per design system */}
      <Pressable
        onPress={() => setShowAdd(true)}
        style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
        accessibilityLabel={t('appointmentList_a11yAdd')}
      >
        <Ionicons name="add-circle-outline" size={20} color={colors.textInverse} />
        <Text style={styles.addButtonText}>{t('preg_appts_addButton')}</Text>
      </Pressable>

      {upcoming.length > 0 && (
        <View>
          <Text style={styles.sectionLabel}>{t('preg_appts_upcoming')}</Text>
          {upcoming.map(renderAppointment)}
        </View>
      )}

      {past.length > 0 && (
        <View>
          <Text style={styles.sectionLabel}>{t('preg_appts_past')}</Text>
          {past.map(renderAppointment)}
        </View>
      )}

      {appointments.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="medical-outline" size={40} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>{t('preg_appts_emptyTitle')}</Text>
          <Text style={styles.emptyDesc}>
            {t('preg_appts_emptyDesc')}
          </Text>
        </View>
      )}

      <Modal
        visible={showAdd}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAdd(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowAdd(false)}
          accessibilityLabel={t('appointmentList_a11yDismiss')}
        >
          <Pressable style={styles.modalSheet} onPress={() => { /* swallow */ }}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('preg_appts_modalTitle')}</Text>

            <Text style={styles.modalLabel}>{t('preg_appts_label_type')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
              {TYPES.map((type) => {
                const isActive = selectedType === type.id
                return (
                  <Pressable
                    key={type.id}
                    onPress={() => setSelectedType(type.id)}
                    style={[
                      styles.typeChip,
                      isActive && { borderColor: type.color, backgroundColor: type.color + '22' },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={t('appointmentList_a11yType', { type: type.label })}
                  >
                    <Ionicons name={type.icon as any} size={14} color={isActive ? type.color : colors.textMuted} />
                    <Text style={[styles.typeChipText, isActive && { color: type.color }]}>{type.label}</Text>
                  </Pressable>
                )
              })}
            </ScrollView>

            <Text style={styles.modalLabel}>{t('preg_appts_label_title')}</Text>
            <TextInput
              style={styles.input}
              selectionColor={stickers.blue}
              placeholder={t('preg_appts_placeholder_title')}
              placeholderTextColor={colors.textFaint}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.modalLabel}>{t('preg_appts_label_doctor')}</Text>
            <TextInput
              style={styles.input}
              selectionColor={stickers.blue}
              placeholder={t('preg_appts_placeholder_doctor')}
              placeholderTextColor={colors.textFaint}
              value={doctorName}
              onChangeText={setDoctorName}
            />

            <Text style={styles.modalLabel}>{t('preg_appts_label_notes')}</Text>
            <TextInput
              style={[styles.input, { minHeight: 80 }]}
              selectionColor={stickers.blue}
              placeholder={t('preg_appts_placeholder_notes')}
              placeholderTextColor={colors.textFaint}
              value={notes}
              onChangeText={setNotes}
              multiline
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowAdd(false)}
                style={styles.cancelButton}
                accessibilityRole="button"
                accessibilityLabel={t('common_cancel')}
              >
                <Text style={styles.cancelText}>{t('common_cancel')}</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmit}
                style={[styles.submitButton, !title.trim() && { opacity: 0.5 }]}
                disabled={!title.trim()}
                accessibilityRole="button"
                accessibilityLabel={t('appointmentList_a11yAdd')}
              >
                <Text style={styles.submitText}>{t('preg_appts_submitAdd')}</Text>
                <Ionicons name="add-circle" size={18} color={colors.textInverse} />
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

function makeStyles({ colors, stickers, font, radius }: ThemeShape) {
  return StyleSheet.create({
    container: {},
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 56,
      borderRadius: radius.full,
      backgroundColor: stickers.charcoal,
      marginBottom: 20,
    },
    addButtonText: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.textInverse,
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontFamily: font.bodySemiBold,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
      letterSpacing: 3,
      textTransform: 'uppercase',
      marginBottom: 12,
      marginTop: 8,
      fontFamily: font.bodySemiBold,
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
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    apptTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
      textTransform: 'uppercase',
      fontFamily: font.bodySemiBold,
    },
    apptDate: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
      fontFamily: font.body,
    },
    apptDoctor: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
      fontFamily: font.body,
    },
    typeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: radius.full,
    },
    typeBadgeText: {
      fontSize: 9,
      fontWeight: '800',
      textTransform: 'uppercase',
      fontFamily: font.bodySemiBold,
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
      fontFamily: font.bodySemiBold,
    },
    emptyDesc: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 18,
      paddingHorizontal: 16,
      fontFamily: font.body,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(20,19,19,0.55)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
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
      marginBottom: 24,
      fontFamily: font.display,
    },
    modalLabel: {
      fontSize: 10,
      fontWeight: '900',
      color: colors.textMuted,
      letterSpacing: 3,
      textTransform: 'uppercase',
      marginBottom: 10,
      fontFamily: font.bodySemiBold,
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
      borderRadius: radius.full,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surfaceRaised,
    },
    typeChipText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      fontFamily: font.bodySemiBold,
    },
    input: {
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: 16,
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 16,
      fontFamily: font.body,
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    cancelButton: {
      flex: 1,
      height: 56,
      borderRadius: radius.full,
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
      fontFamily: font.bodySemiBold,
    },
    submitButton: {
      flex: 2,
      height: 56,
      borderRadius: radius.full,
      backgroundColor: stickers.charcoal,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    submitText: {
      fontSize: 14,
      fontWeight: '900',
      color: colors.textInverse,
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontFamily: font.bodySemiBold,
    },
  })
}
