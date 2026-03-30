import { useState } from 'react'
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native'
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'

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
    fontSize: 12,
    fontWeight: '600',
    color: '#888888',
    letterSpacing: 1,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E4DC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  inputText: {
    fontSize: 16,
    color: '#1A1A2E',
  },
  placeholder: {
    color: '#CCCCCC',
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E4DC',
    marginBottom: 16,
    overflow: 'hidden',
  },
  doneButton: {
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8E4DC',
  },
  doneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7BAE8E',
  },
})
