/**
 * CustomRangeModal — Paper sheet with two inline date pickers (From / To).
 * Used by analytics screens when the user taps the "Custom" period pill.
 */

import { useState, useEffect } from 'react'
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useTheme } from '../../../constants/theme'

interface Props {
  visible: boolean
  /** ISO YYYY-MM-DD (or undefined for sensible defaults). */
  initialFrom?: string
  initialTo?: string
  onClose: () => void
  onApply: (from: string, to: string) => void
}

function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatPretty(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function CustomRangeModal({ visible, initialFrom, initialTo, onClose, onApply }: Props) {
  const { colors, font } = useTheme()

  const defaultTo = new Date()
  const defaultFrom = new Date()
  defaultFrom.setDate(defaultFrom.getDate() - 13)

  const [from, setFrom] = useState<Date>(initialFrom ? new Date(initialFrom) : defaultFrom)
  const [to, setTo] = useState<Date>(initialTo ? new Date(initialTo) : defaultTo)
  const [picking, setPicking] = useState<'from' | 'to' | null>(null)

  useEffect(() => {
    if (initialFrom) setFrom(new Date(initialFrom))
    if (initialTo) setTo(new Date(initialTo))
  }, [initialFrom, initialTo])

  function handlePick(which: 'from' | 'to') {
    if (Platform.OS === 'ios') {
      // iOS inline pickers — toggle visibility
      setPicking(picking === which ? null : which)
    } else {
      setPicking(which)
    }
  }

  function handleChange(which: 'from' | 'to', date?: Date) {
    if (!date) return
    if (which === 'from') {
      const clamped = date > to ? to : date
      setFrom(clamped)
    } else {
      const clamped = date < from ? from : date
      setTo(clamped)
    }
    if (Platform.OS !== 'ios') setPicking(null)
  }

  const today = new Date()

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            { backgroundColor: colors.bg, borderColor: colors.border },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle}>
            <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
          </View>

          <Text
            style={[styles.title, { color: colors.text, fontFamily: font.display }]}
          >
            Custom range
          </Text>

          <View style={styles.rowGroup}>
            <DateRow
              label="From"
              value={from}
              active={picking === 'from'}
              onPress={() => handlePick('from')}
            />
            {picking === 'from' && (
              <DateTimePicker
                value={from}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                maximumDate={today}
                onChange={(_e, d) => handleChange('from', d)}
              />
            )}
            <DateRow
              label="To"
              value={to}
              active={picking === 'to'}
              onPress={() => handlePick('to')}
            />
            {picking === 'to' && (
              <DateTimePicker
                value={to}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                minimumDate={from}
                maximumDate={today}
                onChange={(_e, d) => handleChange('to', d)}
              />
            )}
          </View>

          <View style={styles.footer}>
            <Pressable
              onPress={onClose}
              style={[
                styles.btn,
                styles.btnGhost,
                { borderColor: colors.border },
              ]}
            >
              <Text
                style={{
                  color: colors.textSecondary,
                  fontFamily: font.bodyMedium,
                  fontSize: 14,
                }}
              >
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={() => onApply(toISO(from), toISO(to))}
              style={[styles.btn, styles.btnApply, { backgroundColor: colors.text }]}
            >
              <Text
                style={{
                  color: colors.bg,
                  fontFamily: font.bodyMedium,
                  fontSize: 14,
                }}
              >
                Apply
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function DateRow({
  label,
  value,
  active,
  onPress,
}: {
  label: string
  value: Date
  active: boolean
  onPress: () => void
}) {
  const { colors, font } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.dateRow,
        {
          backgroundColor: colors.surface,
          borderColor: active ? colors.text : colors.border,
        },
      ]}
    >
      <Text
        style={{
          color: colors.textMuted,
          fontFamily: font.bodySemiBold,
          fontSize: 11,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: colors.text,
          fontFamily: font.display,
          fontSize: 20,
          marginTop: 2,
        }}
      >
        {formatPretty(value)}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    padding: 20,
    paddingBottom: 36,
    gap: 16,
  },
  handle: {
    alignItems: 'center',
    marginBottom: 4,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  title: {
    fontSize: 24,
    marginBottom: 4,
  },
  rowGroup: {
    gap: 10,
  },
  dateRow: {
    padding: 14,
    borderRadius: 22,
    borderWidth: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhost: {
    borderWidth: 1,
  },
  btnApply: {},
})
