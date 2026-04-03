import { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { GlassCard } from '../ui/GlassCard'
import { CyclePhaseRing } from '../prepreg/CyclePhaseRing'
import { getCycleInfo, getMonthCycleDots, toDateStr } from '../../lib/cycleLogic'
import type { CycleInfo } from '../../lib/cycleLogic'
import { colors, THEME_COLORS, borderRadius, typography } from '../../constants/theme'

interface CycleTrackerProps {
  selectedDate: string
  onLogEntry?: (type: string, value?: string, notes?: string) => void
}

const QUICK_LOGS = [
  { type: 'period_start', label: 'Period Started', icon: 'water-outline', color: '#FF6B6B' },
  { type: 'period_end', label: 'Period Ended', icon: 'water-outline', color: '#FFA07A' },
  { type: 'ovulation', label: 'Ovulation Sign', icon: 'flower-outline', color: THEME_COLORS.green },
  { type: 'symptom', label: 'Symptom', icon: 'pulse-outline', color: THEME_COLORS.yellow },
  { type: 'basal_temp', label: 'Basal Temp', icon: 'thermometer-outline', color: THEME_COLORS.blue },
  { type: 'intercourse', label: 'Intercourse', icon: 'heart-outline', color: THEME_COLORS.pink },
]

const SYMPTOM_OPTIONS = [
  { id: 'cramps', label: 'Cramps', icon: 'flash-outline', color: '#FF6B6B' },
  { id: 'bloating', label: 'Bloating', icon: 'resize-outline', color: '#FDBA74' },
  { id: 'headache', label: 'Headache', icon: 'flash-outline', color: '#FDE68A' },
  { id: 'fatigue', label: 'Fatigue', icon: 'bed-outline', color: '#93C5FD' },
  { id: 'mood_swings', label: 'Mood Swings', icon: 'happy-outline', color: '#C4B5FD' },
  { id: 'breast_tenderness', label: 'Breast Pain', icon: 'body-outline', color: '#F9A8D4' },
  { id: 'acne', label: 'Acne', icon: 'ellipse-outline', color: '#FCA5A5' },
  { id: 'nausea', label: 'Nausea', icon: 'water-outline', color: '#86EFAC' },
  { id: 'cm_eggwhite', label: 'CM: Egg White', icon: 'water', color: '#A2FF86' },
  { id: 'cm_creamy', label: 'CM: Creamy', icon: 'water', color: '#FDE68A' },
  { id: 'cm_sticky', label: 'CM: Sticky', icon: 'water', color: '#FDBA74' },
  { id: 'cm_dry', label: 'CM: Dry', icon: 'water-outline', color: colors.textTertiary },
]

export function CycleTracker({ selectedDate, onLogEntry }: CycleTrackerProps) {
  // Demo: period started 10 days ago — in production from Supabase
  const [lastPeriodStart] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 10)
    return toDateStr(d)
  })

  const cycleInfo = getCycleInfo({ lastPeriodStart, cycleLength: 28, periodLength: 5 }, selectedDate)
  const selectedInfo = getCycleInfo({ lastPeriodStart, cycleLength: 28, periodLength: 5 }, selectedDate)

  return (
    <View style={styles.container}>
      {/* Cycle Phase Ring */}
      <CyclePhaseRing cycleInfo={cycleInfo} />

      {/* Selected date phase info */}
      <GlassCard style={styles.dateInfoCard}>
        <View style={styles.dateInfoHeader}>
          <View style={[styles.datePhaseDot, { backgroundColor: selectedInfo.phaseColor }]} />
          <Text style={styles.dateInfoPhase}>{selectedInfo.phaseLabel}</Text>
          <Text style={styles.dateInfoDay}>Day {selectedInfo.cycleDay}</Text>
        </View>
        <Text style={styles.dateInfoDesc}>{selectedInfo.phaseDescription}</Text>

        {/* Fertility indicator */}
        {selectedInfo.isFertile && (
          <View style={styles.fertileBanner}>
            <Ionicons name="flower" size={16} color={THEME_COLORS.green} />
            <Text style={styles.fertileText}>Fertile window — {selectedInfo.conceptionProbability} chance of conception</Text>
          </View>
        )}
      </GlassCard>

      {/* Quick log buttons */}
      <Text style={styles.sectionLabel}>QUICK LOG</Text>
      <View style={styles.quickGrid}>
        {QUICK_LOGS.map((log) => (
          <Pressable
            key={log.type}
            onPress={() => onLogEntry?.(log.type)}
            style={({ pressed }) => [
              styles.quickBtn,
              pressed && { transform: [{ scale: 0.95 }] },
            ]}
          >
            <View style={[styles.quickIconBox, { backgroundColor: log.color + '15' }]}>
              <Ionicons name={log.icon as any} size={20} color={log.color} />
            </View>
            <Text style={styles.quickLabel}>{log.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Symptom tracking */}
      <Text style={styles.sectionLabel}>SYMPTOMS & CERVICAL MUCUS</Text>
      <View style={styles.symptomGrid}>
        {SYMPTOM_OPTIONS.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => onLogEntry?.('symptom', s.id)}
            style={({ pressed }) => [
              styles.symptomChip,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name={s.icon as any} size={14} color={s.color} />
            <Text style={styles.symptomChipText}>{s.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Phase tips */}
      <Text style={styles.sectionLabel}>TODAY'S TIPS</Text>
      {cycleInfo.dailyTips.map((tip, i) => (
        <View key={i} style={styles.tipRow}>
          <View style={[styles.tipBullet, { backgroundColor: cycleInfo.phaseColor }]} />
          <Text style={styles.tipText}>{tip}</Text>
        </View>
      ))}

      {/* Nutrition for this phase */}
      <GlassCard style={styles.nutritionCard}>
        <View style={styles.nutritionHeader}>
          <Ionicons name="nutrition" size={18} color={THEME_COLORS.green} />
          <Text style={styles.nutritionTitle}>NUTRITION FOR {cycleInfo.phaseLabel.toUpperCase()}</Text>
        </View>
        {cycleInfo.nutritionTips.map((tip, i) => (
          <Text key={i} style={styles.nutritionItem}>• {tip}</Text>
        ))}
      </GlassCard>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {},

  dateInfoCard: {
    marginBottom: 20,
  },
  dateInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  datePhaseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dateInfoPhase: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  dateInfoDay: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textTertiary,
  },
  dateInfoDesc: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    lineHeight: 19,
  },
  fertileBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME_COLORS.green + '15',
    borderRadius: borderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 12,
  },
  fertileText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME_COLORS.green,
    flex: 1,
  },

  sectionLabel: {
    ...typography.label,
    marginBottom: 12,
  },

  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  quickBtn: {
    width: '31%',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: colors.surfaceGlass,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  quickIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    textAlign: 'center',
  },

  symptomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  symptomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surfaceGlass,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  symptomChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },

  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  tipBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    lineHeight: 18,
  },

  nutritionCard: {
    marginTop: 16,
  },
  nutritionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  nutritionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: THEME_COLORS.green,
    letterSpacing: 1,
  },
  nutritionItem: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
})
