/**
 * PeriodSelector — 4-pill time range selector (Week / Month / 3 mo / Year).
 * Paper pills with ink-filled active state, matches the 2026 redesign reference.
 */

import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { useTheme } from '../../../constants/theme'

export type Period = 'week' | 'month' | '3mo' | 'year' | 'custom'

const OPTIONS: { key: Period; label: string }[] = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: '3mo', label: '3 mo' },
  { key: 'year', label: 'Year' },
  { key: 'custom', label: 'Custom' },
]

interface Props {
  value: Period
  onChange: (p: Period) => void
  /** Optional label appended to the "Custom" pill when active (e.g. "Apr 1–14"). */
  customLabel?: string
  /** Hide the "Custom" option — defaults to true. */
  showCustom?: boolean
}

export function PeriodSelector({ value, onChange, customLabel, showCustom = true }: Props) {
  const { colors, font } = useTheme()
  const options = showCustom ? OPTIONS : OPTIONS.filter((o) => o.key !== 'custom')
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {options.map((o) => {
        const active = value === o.key
        const label = o.key === 'custom' && active && customLabel ? customLabel : o.label
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[
              styles.pill,
              {
                backgroundColor: active ? colors.text : colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                {
                  color: active ? colors.bg : colors.textSecondary,
                  fontFamily: font.bodyMedium,
                },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  label: {
    fontSize: 13,
  },
})
