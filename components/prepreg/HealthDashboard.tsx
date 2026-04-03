import { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { GlassCard } from '../ui/GlassCard'
import { useAppTheme } from '../ui/ThemeProvider'
import { colors, THEME_COLORS, borderRadius, shadows } from '../../constants/theme'
import { DAILY_WATER_GOAL, getHydrationLevel } from '../../lib/cycleLogic'

interface HealthDashboardProps {
  waterGlasses?: number
  sleepHours?: number
  onAddWater?: () => void
  onLogSleep?: (hours: number) => void
}

export function HealthDashboard({ waterGlasses = 0, sleepHours = 0, onAddWater, onLogSleep }: HealthDashboardProps) {
  const { colors: tc } = useAppTheme()
  const hydration = getHydrationLevel(waterGlasses)

  return (
    <View style={styles.container}>
      {/* Hydration Card */}
      <GlassCard style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: '#4D96FF15' }]}>
            <Ionicons name="water" size={22} color="#4D96FF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: tc.text }]}>HYDRATION</Text>
            <Text style={[styles.cardSubtitle, { color: tc.textTertiary }]}>{hydration.message}</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={[styles.progressBarBg, { backgroundColor: tc.border }]}>
          <View style={[styles.progressBarFill, { width: `${hydration.percentage}%`, backgroundColor: hydration.color }]} />
        </View>
        <View style={styles.progressLabels}>
          <Text style={[styles.progressPct, { color: hydration.color }]}>{hydration.percentage}%</Text>
          <Text style={[styles.progressGoal, { color: tc.textTertiary }]}>{waterGlasses}/{DAILY_WATER_GOAL} glasses</Text>
        </View>

        {/* Water glasses visual */}
        <View style={styles.glassesRow}>
          {Array.from({ length: DAILY_WATER_GOAL }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.glass,
                { borderColor: tc.border },
                i < waterGlasses && { backgroundColor: '#4D96FF', borderColor: '#4D96FF' },
              ]}
            >
              {i < waterGlasses && (
                <Ionicons name="water" size={14} color="#FFF" />
              )}
            </View>
          ))}
        </View>

        {/* Add water button */}
        <Pressable
          onPress={onAddWater}
          style={({ pressed }) => [styles.addWaterBtn, pressed && { transform: [{ scale: 0.95 }] }]}
        >
          <Ionicons name="add-circle" size={20} color="#4D96FF" />
          <Text style={styles.addWaterText}>Add Glass</Text>
        </Pressable>
      </GlassCard>

      {/* Sleep + Supplements row */}
      <View style={styles.metricsRow}>
        {/* Sleep Card */}
        <GlassCard style={styles.metricCard}>
          <View style={[styles.metricIcon, { backgroundColor: '#B983FF15' }]}>
            <Ionicons name="moon" size={20} color="#B983FF" />
          </View>
          <Text style={[styles.metricValue, { color: tc.text }]}>
            {sleepHours > 0 ? `${sleepHours}` : '--'}
          </Text>
          <Text style={[styles.metricUnit, { color: tc.textTertiary }]}>hours</Text>
          <Text style={[styles.metricLabel, { color: tc.textTertiary }]}>SLEEP</Text>
          {sleepHours > 0 && sleepHours >= 7 && (
            <View style={[styles.metricBadge, { backgroundColor: THEME_COLORS.green + '20' }]}>
              <Ionicons name="checkmark" size={10} color={THEME_COLORS.green} />
            </View>
          )}
        </GlassCard>

        {/* Supplements Card */}
        <GlassCard style={styles.metricCard}>
          <View style={[styles.metricIcon, { backgroundColor: '#FF8AD815' }]}>
            <Ionicons name="medical" size={20} color="#FF8AD8" />
          </View>
          <Text style={[styles.metricValue, { color: tc.text }]}>Folic</Text>
          <Text style={[styles.metricUnit, { color: tc.textTertiary }]}>400mcg</Text>
          <Text style={[styles.metricLabel, { color: tc.textTertiary }]}>PRENATAL</Text>
        </GlassCard>

        {/* Exercise Card */}
        <GlassCard style={styles.metricCard}>
          <View style={[styles.metricIcon, { backgroundColor: '#A2FF8615' }]}>
            <Ionicons name="fitness" size={20} color="#A2FF86" />
          </View>
          <Text style={[styles.metricValue, { color: tc.text }]}>
            {0}
          </Text>
          <Text style={[styles.metricUnit, { color: tc.textTertiary }]}>min</Text>
          <Text style={[styles.metricLabel, { color: tc.textTertiary }]}>EXERCISE</Text>
        </GlassCard>
      </View>

      {/* Nutrition tip */}
      <GlassCard style={styles.nutritionTip}>
        <View style={styles.nutritionHeader}>
          <Ionicons name="nutrition" size={18} color={THEME_COLORS.green} />
          <Text style={styles.nutritionTitle}>NUTRITION TIP</Text>
        </View>
        <Text style={[styles.nutritionText, { color: tc.textSecondary }]}>
          Take your folic acid (400mcg) daily — ideally 1-3 months before conceiving. It prevents neural tube defects and is the single most important supplement for pre-conception.
        </Text>
      </GlassCard>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },

  card: {},
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 1,
  },
  cardSubtitle: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
  },

  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressPct: {
    fontSize: 14,
    fontWeight: '900',
  },
  progressGoal: {
    fontSize: 12,
    color: colors.textTertiary,
  },

  glassesRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginBottom: 16,
  },
  glass: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  addWaterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: '#4D96FF',
    borderStyle: 'dashed',
  },
  addWaterText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4D96FF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Metrics row
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    position: 'relative',
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
  },
  metricUnit: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textTertiary,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.textTertiary,
    letterSpacing: 1,
  },
  metricBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Nutrition tip
  nutritionTip: {},
  nutritionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  nutritionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: THEME_COLORS.green,
    letterSpacing: 1,
  },
  nutritionText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    lineHeight: 19,
  },
})
