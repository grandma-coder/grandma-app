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
import { useTheme, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../../../constants/theme'
import { useIsDiffuse } from '../../ui/diffuse/DiffuseKit'
import { useModeStore } from '../../../store/useModeStore'
import { PillButton } from '../../ui/PillButton'
import { useTranslation } from '../../../lib/i18n'

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
  const { colors, font, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const mode = useModeStore((s) => s.mode)
  const { t } = useTranslation()

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

  if (diffuse) {
    const dCol = dt.colors
    const acc = getDiffuseAccent(mode, dt.isDark)
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable
            style={[
              styles.sheet,
              { backgroundColor: dCol.bg, borderColor: dCol.line2 },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.handle}>
              <View style={[styles.handleBar, { backgroundColor: dCol.line2 }]} />
            </View>

            <Text style={[styles.title, { color: dCol.ink, fontFamily: diffuseFont.display, letterSpacing: -0.4 }]}>
              {t('kids_home_custom_range_title')}
            </Text>

            <View style={styles.rowGroup}>
              <DateRow
                label="From"
                value={from}
                active={picking === 'from'}
                onPress={() => handlePick('from')}
                diffuse
                accent={acc}
              />
              {picking === 'from' && (
                <DateTimePicker
                  value={from}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  maximumDate={today}
                  themeVariant={dt.isDark ? 'dark' : 'light'}
                  accentColor={acc}
                  onChange={(_e, d) => handleChange('from', d)}
                />
              )}
              <DateRow
                label="To"
                value={to}
                active={picking === 'to'}
                onPress={() => handlePick('to')}
                diffuse
                accent={acc}
              />
              {picking === 'to' && (
                <DateTimePicker
                  value={to}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  minimumDate={from}
                  maximumDate={today}
                  themeVariant={dt.isDark ? 'dark' : 'light'}
                  accentColor={acc}
                  onChange={(_e, d) => handleChange('to', d)}
                />
              )}
            </View>

            {/* Footer — containerless mono actions */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: dCol.line2, paddingTop: 16 }}>
              <Pressable onPress={onClose} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                <Text style={{ fontSize: 11, fontFamily: diffuseFont.mono, color: dCol.ink3, letterSpacing: 1.2, textTransform: 'uppercase' }}>Cancel</Text>
              </Pressable>
              <View style={{ flex: 1 }} />
              <Pressable
                onPress={() => onApply(toISO(from), toISO(to))}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, opacity: pressed ? 0.6 : 1 })}
              >
                <Text style={{ fontSize: 12, fontFamily: diffuseFont.monoBold, color: dCol.ink, letterSpacing: 2, textTransform: 'uppercase' }}>Apply Range</Text>
                <Text style={{ fontFamily: diffuseFont.body, fontSize: 16, color: acc }}>→</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    )
  }

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
            {t('kids_home_custom_range_title')}
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
                themeVariant={isDark ? 'dark' : 'light'}
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
                themeVariant={isDark ? 'dark' : 'light'}
                onChange={(_e, d) => handleChange('to', d)}
              />
            )}
          </View>

          <View style={styles.footer}>
            <PillButton
              label="Cancel"
              variant="paper"
              onPress={onClose}
              height={52}
              style={{ flex: 1 }}
            />
            <PillButton
              label="Apply"
              variant="ink"
              onPress={() => onApply(toISO(from), toISO(to))}
              height={52}
              style={{ flex: 1 }}
            />
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
  diffuse = false,
  accent,
}: {
  label: string
  value: Date
  active: boolean
  onPress: () => void
  diffuse?: boolean
  accent?: string
}) {
  const { colors, font } = useTheme()
  const dt = useDiffuseTheme()
  if (diffuse) {
    const dCol = dt.colors
    return (
      <Pressable
        onPress={onPress}
        style={[
          styles.dateRow,
          {
            backgroundColor: active ? dCol.surface : 'transparent',
            borderColor: active ? dCol.hairline : dCol.line,
          },
        ]}
      >
        <Text
          style={{
            color: dCol.ink3,
            fontFamily: diffuseFont.mono,
            fontSize: 10,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            color: dCol.ink,
            fontFamily: active ? diffuseFont.monoBold : diffuseFont.mono,
            fontSize: 16,
            letterSpacing: 0.5,
            marginTop: 4,
          }}
        >
          {formatPretty(value)}
        </Text>
      </Pressable>
    )
  }
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
