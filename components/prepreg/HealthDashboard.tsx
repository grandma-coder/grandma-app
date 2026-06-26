import { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { PaperCard } from '../ui/PaperCard'
import { useAppTheme } from '../ui/ThemeProvider'
import { brand, stickers, borderRadius, shadows } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import { LiquidFillBottle } from '../charts/GalleryCharts'
import { DAILY_WATER_GOAL, getHydrationLevel } from '../../lib/cycleLogic'

interface HealthDashboardProps {
  waterGlasses?: number
  sleepHours?: number
  onAddWater?: () => void
  onLogSleep?: (hours: number) => void
}

export function HealthDashboard({ waterGlasses = 0, sleepHours = 0, onAddWater, onLogSleep }: HealthDashboardProps) {
  const { colors: tc } = useAppTheme()
  const { t } = useTranslation()
  const hydration = getHydrationLevel(waterGlasses)

  return (
    <View style={styles.container}>
      {/* Hydration Card */}
      <PaperCard radius={28} padding={20} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: brand.kids + '15' }]}>
            <Ionicons name="water" size={22} color={stickers.blue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: tc.text }]}>{t('prepreg_healthDash_hydration')}</Text>
            <Text style={[styles.cardSubtitle, { color: tc.textTertiary }]}>{hydration.message}</Text>
          </View>
        </View>

        {/* Liquid-fill bottle — pattern 23 from the gallery */}
        <View style={styles.bottleRow}>
          <LiquidFillBottle
            percent={hydration.percentage / 100}
            size={120}
            color={hydration.color}
          />
          <View style={styles.bottleSide}>
            <Text style={[styles.progressPct, { color: hydration.color }]}>
              {waterGlasses}
              <Text style={[styles.progressGoal, { color: tc.textTertiary }]}>/{DAILY_WATER_GOAL}</Text>
            </Text>
            <Text style={[styles.progressGoal, { color: tc.textTertiary }]}>{t('prepreg_healthDash_glassesToday')}</Text>
            <View style={styles.glassesRow}>
              {Array.from({ length: DAILY_WATER_GOAL }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.glass,
                    { borderColor: tc.border },
                    i < waterGlasses && { backgroundColor: brand.kids, borderColor: brand.kids },
                  ]}
                >
                  {i < waterGlasses && (
                    <Ionicons name="water" size={10} color="#FFF" />
                  )}
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Add water button */}
        <Pressable
          onPress={onAddWater}
          style={({ pressed }) => [styles.addWaterBtn, pressed && { transform: [{ scale: 0.95 }] }]}
        >
          <Ionicons name="add-circle" size={20} color={stickers.blue} />
          <Text style={styles.addWaterText}>{t('prepreg_healthDash_addGlass')}</Text>
        </Pressable>
      </PaperCard>

      {/* Sleep + Supplements row */}
      <View style={styles.metricsRow}>
        {/* Sleep Card */}
        <PaperCard radius={28} padding={20} style={styles.metricCard}>
          <View style={[styles.metricIcon, { backgroundColor: brand.pregnancy + '15' }]}>
            <Ionicons name="moon" size={20} color={stickers.lilac} />
          </View>
          <Text style={[styles.metricValue, { color: tc.text }]}>
            {sleepHours > 0 ? `${sleepHours}` : '--'}
          </Text>
          <Text style={[styles.metricUnit, { color: tc.textTertiary }]}>{t('prepreg_healthDash_hours')}</Text>
          <Text style={[styles.metricLabel, { color: tc.textTertiary }]}>{t('prepreg_healthDash_sleep')}</Text>
          {sleepHours > 0 && sleepHours >= 7 && (
            <View style={[styles.metricBadge, { backgroundColor: stickers.green + '20' }]}>
              <Ionicons name="checkmark" size={10} color={stickers.green} />
            </View>
          )}
        </PaperCard>

        {/* Supplements Card */}
        <PaperCard radius={28} padding={20} style={styles.metricCard}>
          <View style={[styles.metricIcon, { backgroundColor: brand.prePregnancy + '15' }]}>
            <Ionicons name="medical" size={20} color={stickers.pink} />
          </View>
          <Text style={[styles.metricValue, { color: tc.text }]}>{t('prepreg_healthDash_folic')}</Text>
          <Text style={[styles.metricUnit, { color: tc.textTertiary }]}>{t('prepreg_healthDash_folicDose')}</Text>
          <Text style={[styles.metricLabel, { color: tc.textTertiary }]}>{t('prepreg_healthDash_prenatal')}</Text>
        </PaperCard>

        {/* Exercise Card */}
        <PaperCard radius={28} padding={20} style={styles.metricCard}>
          <View style={[styles.metricIcon, { backgroundColor: stickers.green + '15' }]}>
            <Ionicons name="fitness" size={20} color={stickers.green} />
          </View>
          <Text style={[styles.metricValue, { color: tc.text }]}>
            {0}
          </Text>
          <Text style={[styles.metricUnit, { color: tc.textTertiary }]}>{t('prepreg_healthDash_min')}</Text>
          <Text style={[styles.metricLabel, { color: tc.textTertiary }]}>{t('prepreg_healthDash_exercise')}</Text>
        </PaperCard>
      </View>

      {/* Nutrition tip */}
      <PaperCard radius={28} padding={20} style={styles.nutritionTip}>
        <View style={styles.nutritionHeader}>
          <Ionicons name="nutrition" size={18} color={stickers.green} />
          <Text style={styles.nutritionTitle}>{t('prepreg_healthDash_nutritionTip')}</Text>
        </View>
        <Text style={[styles.nutritionText, { color: tc.textSecondary }]}>
          Take your folic acid (400mcg) daily — ideally 1-3 months before conceiving. It prevents neural tube defects and is the single most important supplement for pre-conception.
        </Text>
      </PaperCard>
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
    letterSpacing: 1,
  },
  cardSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },

  progressBarBg: {
    height: 8,
    borderRadius: 4,
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
  },

  bottleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
    marginTop: 4,
  },
  bottleSide: {
    flex: 1,
    gap: 4,
  },
  glassesRow: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
    marginTop: 6,
  },
  glass: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
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
    borderColor: brand.kids,
    borderStyle: 'dashed',
  },
  addWaterText: {
    fontSize: 13,
    fontWeight: '800',
    color: brand.kids,
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
  },
  metricUnit: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '900',
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
    color: stickers.green,
    letterSpacing: 1,
  },
  nutritionText: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
  },
})
