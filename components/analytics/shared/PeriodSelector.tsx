/**
 * PeriodSelector — 4-pill time range selector (Week / Month / 3 mo / Year).
 * Paper pills; active = soft tone fill + ink outline + ink label, matches the 2026 redesign reference.
 */

import { useEffect, useRef } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { useTheme, useDiffuseTheme, diffuseFont, stickers } from '../../../constants/theme'
import { useTranslation, t as tNow } from '../../../lib/i18n'
import { useIsDiffuse } from '../../ui/diffuse/DiffuseKit'

export type Period = 'week' | 'month' | '3mo' | 'year' | 'custom'

const OPTIONS: { key: Period; label: string }[] = [
  { key: 'week', get label() { return tNow('sw3_period_week') } },
  { key: 'month', get label() { return tNow('sw3_period_month') } },
  { key: '3mo', get label() { return tNow('sw3_period_3mo') } },
  { key: 'year', get label() { return tNow('sw3_period_year') } },
  { key: 'custom', get label() { return tNow('kids_home_range_custom') } },
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
  const { colors, font, isDark } = useTheme()
  useTranslation() // re-render on language change (labels resolve at render)
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  // Site look: three calm choices — week, month, year. Diffuse keeps the full set.
  const options = diffuse
    ? (showCustom ? OPTIONS : OPTIONS.filter((o) => o.key !== 'custom'))
    : OPTIONS.filter((o) => o.key === 'week' || o.key === 'month' || o.key === 'year')
  // The custom pill (last, and widest when it shows a date range) can sit past
  // the right edge — scroll it fully into view whenever it's the active choice.
  const scrollRef = useRef<ScrollView>(null)
  useEffect(() => {
    if (value === 'custom') {
      const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60)
      return () => clearTimeout(id)
    }
  }, [value, customLabel])
  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {options.map((o) => {
        const active = value === o.key
        const label = o.key === 'custom' && active && customLabel ? customLabel : o.label
        if (diffuse) {
          // v4 .seg: hairline mono pill; active = surface fill + ink hairline + mono-bold.
          return (
            <Pressable
              key={o.key}
              onPress={() => onChange(o.key)}
              style={({ pressed }) => [
                styles.pill,
                { borderColor: active ? dt.colors.hairline : dt.colors.line, backgroundColor: active ? dt.colors.surface : 'transparent', opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={{ fontFamily: active ? diffuseFont.monoBold : diffuseFont.mono, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: active ? dt.colors.ink : dt.colors.ink3 }}>
                {label}
              </Text>
            </Pressable>
          )
        }
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[
              styles.pill,
              {
                backgroundColor: active ? (isDark ? colors.surfaceRaised ?? colors.surface : stickers.yellowSoft) : colors.surface,
                borderColor: colors.text,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                {
                  color: colors.text,
                  fontFamily: font.bodyBold,
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
    paddingLeft: 20,
    paddingRight: 24,
    paddingTop: 10,
    paddingBottom: 6,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  label: {
    fontSize: 13,
  },
})
