import { useState } from 'react'
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native'
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { colors, borderRadius, typography } from '../../constants/theme'

interface DatePickerFieldProps {
  label: string
  value: string
  onChange: (dateString: string) => void
  placeholder?: string
  maximumDate?: Date
  minimumDate?: Date
}

function toDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function DatePickerField({
  label,
  value,
  onChange,
  placeholder = 'Select a date',
  maximumDate,
  minimumDate,
}: DatePickerFieldProps) {
  const [show, setShow] = useState(false)

  const currentDate = value ? new Date(value) : new Date()

  function handleChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === 'android') setShow(false)
    if (event.type === 'set' && selectedDate) {
      onChange(toDateString(selectedDate))
    }
    if (event.type === 'dismissed') {
      setShow(false)
    }
  }

  function handleConfirm() {
    setShow(false)
  }

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <Pressable onPress={() => setShow(true)} style={styles.input}>
        <Text style={[styles.inputText, !value && styles.placeholder]}>
          {value || placeholder}
        </Text>
      </Pressable>

      {show && (
        <View style={styles.pickerContainer}>
          <DateTimePicker
            value={currentDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleChange}
            maximumDate={maximumDate}
            minimumDate={minimumDate}
            themeVariant="dark"
          />
          {Platform.OS === 'ios' && (
            <Pressable onPress={handleConfirm} style={styles.doneButton}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  label: {
    ...typography.label,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: 16,
    marginBottom: 16,
  },
  inputText: {
    fontSize: 16,
    color: colors.text,
  },
  placeholder: {
    color: colors.textTertiary,
  },
  pickerContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  doneButton: {
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  doneText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.accent,
  },
})
