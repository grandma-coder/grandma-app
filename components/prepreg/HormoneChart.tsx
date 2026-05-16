/**
 * HormoneChart — cycle hormone wave + 3 phase pills (follicular / ovulation /
 * luteal). Phase colors map to brand.phase.* tokens; pills follow the
 * paper-pill sticker-on-cream system.
 */

import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, radius, spacing } from '../../constants/theme'
import { HormoneWave } from '../charts/GalleryCharts'
import type { CycleInfo } from '../../lib/cycleLogic'

interface HormoneChartProps {
  cycleInfo: CycleInfo
}

export function HormoneChart({ cycleInfo }: HormoneChartProps) {
  const { colors, brand, font } = useTheme()
  const progress = cycleInfo.cycleProgress

  // Phases to render in order, paired with their token colors.
  const phases: Array<{
    key: 'follicular' | 'ovulation' | 'luteal'
    label: string
    color: string
  }> = [
    { key: 'follicular', label: 'FOLLICULAR', color: brand.phase.follicular },
    { key: 'ovulation', label: 'OVULATION', color: brand.phase.ovulation },
    { key: 'luteal', label: 'LUTEAL', color: brand.phase.luteal },
  ]

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.header}>
        <Ionicons name="pulse" size={16} color={brand.phase.luteal} />
        <Text style={[styles.title, { color: colors.text, fontFamily: font.bodySemiBold }]}>
          Hormone Rhythm
        </Text>
      </View>

      <View style={styles.chartWrap}>
        <HormoneWave
          progress={progress}
          color={brand.prePregnancy}
          height={120}
          label={cycleInfo.cycleDay > 0 ? `DAY ${cycleInfo.cycleDay}` : undefined}
        />
      </View>

      <View style={styles.pills}>
        {phases.map((p) => {
          const isActive = cycleInfo.phase === p.key
          return (
            <View
              key={p.key}
              style={[
                styles.pill,
                {
                  backgroundColor: isActive ? p.color + '26' : colors.surfaceRaised,
                  borderColor: isActive ? p.color : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  {
                    color: isActive ? p.color : colors.textMuted,
                    fontFamily: isActive ? font.bodySemiBold : font.bodyMedium,
                  },
                ]}
              >
                {p.label}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  chartWrap: {
    height: 120,
    width: '100%',
    marginBottom: spacing.lg,
  },
  pills: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
  },
  pillText: {
    fontSize: 10,
    letterSpacing: 1.2,
  },
})
