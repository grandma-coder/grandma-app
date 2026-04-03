import { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { GlassCard } from '../ui/GlassCard'
import { colors, THEME_COLORS, borderRadius, typography } from '../../constants/theme'

interface SymptomEntry {
  id: string
  date: string
  symptom: string
  severity: 'mild' | 'moderate' | 'strong'
}

interface SymptomLoggerProps {
  selectedDate: string
  entries?: SymptomEntry[]
  onLog?: (symptom: string, severity: 'mild' | 'moderate' | 'strong') => void
}

const SYMPTOMS = [
  { id: 'nausea', label: 'Nausea', icon: 'water-outline', color: '#86EFAC' },
  { id: 'fatigue', label: 'Fatigue', icon: 'bed-outline', color: '#93C5FD' },
  { id: 'back_pain', label: 'Back Pain', icon: 'body-outline', color: '#FCA5A5' },
  { id: 'cravings', label: 'Cravings', icon: 'restaurant-outline', color: '#FDBA74' },
  { id: 'mood_swings', label: 'Mood Swings', icon: 'happy-outline', color: '#C4B5FD' },
  { id: 'swelling', label: 'Swelling', icon: 'resize-outline', color: '#F9A8D4' },
  { id: 'headache', label: 'Headache', icon: 'flash-outline', color: '#FDE68A' },
  { id: 'heartburn', label: 'Heartburn', icon: 'flame-outline', color: '#FDBA74' },
  { id: 'insomnia', label: 'Insomnia', icon: 'moon-outline', color: '#67E8F9' },
  { id: 'braxton_hicks', label: 'Braxton Hicks', icon: 'pulse-outline', color: '#FCA5A5' },
]

const SEVERITY_OPTIONS: { id: 'mild' | 'moderate' | 'strong'; label: string; color: string }[] = [
  { id: 'mild', label: 'Mild', color: THEME_COLORS.green },
  { id: 'moderate', label: 'Moderate', color: THEME_COLORS.yellow },
  { id: 'strong', label: 'Strong', color: THEME_COLORS.orange },
]

export function SymptomLogger({ selectedDate, entries = [], onLog }: SymptomLoggerProps) {
  const [selectedSymptom, setSelectedSymptom] = useState<string | null>(null)
  const todayEntries = entries.filter((e) => e.date === selectedDate)

  function handleSeveritySelect(severity: 'mild' | 'moderate' | 'strong') {
    if (!selectedSymptom) return
    onLog?.(selectedSymptom, severity)
    setSelectedSymptom(null)
  }

  return (
    <View style={styles.container}>
      {/* Symptom grid */}
      <Text style={styles.sectionLabel}>TAP TO LOG</Text>
      <View style={styles.grid}>
        {SYMPTOMS.map((s) => {
          const isLogged = todayEntries.some((e) => e.symptom === s.id)
          const isSelected = selectedSymptom === s.id
          return (
            <Pressable
              key={s.id}
              onPress={() => setSelectedSymptom(isSelected ? null : s.id)}
              style={({ pressed }) => [
                styles.symptomCard,
                isSelected && { borderColor: s.color, borderWidth: 2 },
                isLogged && { opacity: 0.6 },
                pressed && { transform: [{ scale: 0.95 }] },
              ]}
            >
              <View style={[styles.symptomIconBox, { backgroundColor: s.color + '15' }]}>
                <Ionicons name={s.icon as any} size={20} color={s.color} />
              </View>
              <Text style={styles.symptomLabel}>{s.label}</Text>
              {isLogged && (
                <Ionicons name="checkmark-circle" size={14} color={THEME_COLORS.green} style={{ position: 'absolute', top: 6, right: 6 }} />
              )}
            </Pressable>
          )
        })}
      </View>

      {/* Severity selector (when a symptom is selected) */}
      {selectedSymptom && (
        <GlassCard style={styles.severityCard}>
          <Text style={styles.severityTitle}>
            How severe is your {SYMPTOMS.find((s) => s.id === selectedSymptom)?.label?.toLowerCase()}?
          </Text>
          <View style={styles.severityRow}>
            {SEVERITY_OPTIONS.map((sev) => (
              <Pressable
                key={sev.id}
                onPress={() => handleSeveritySelect(sev.id)}
                style={[styles.severityBtn, { borderColor: sev.color }]}
              >
                <Text style={[styles.severityBtnText, { color: sev.color }]}>{sev.label}</Text>
              </Pressable>
            ))}
          </View>
        </GlassCard>
      )}

      {/* Today's logged symptoms */}
      {todayEntries.length > 0 && (
        <View>
          <Text style={styles.sectionLabel}>LOGGED TODAY</Text>
          <View style={styles.loggedRow}>
            {todayEntries.map((entry) => {
              const symptomInfo = SYMPTOMS.find((s) => s.id === entry.symptom)
              const sevInfo = SEVERITY_OPTIONS.find((s) => s.id === entry.severity)
              return (
                <View key={entry.id} style={styles.loggedChip}>
                  <Ionicons
                    name={(symptomInfo?.icon ?? 'ellipse') as any}
                    size={14}
                    color={symptomInfo?.color ?? colors.text}
                  />
                  <Text style={styles.loggedText}>{symptomInfo?.label}</Text>
                  <View style={[styles.sevDot, { backgroundColor: sevInfo?.color }]} />
                </View>
              )
            })}
          </View>
        </View>
      )}

      {/* Empty state */}
      {todayEntries.length === 0 && !selectedSymptom && (
        <View style={styles.emptyState}>
          <Ionicons name="pulse-outline" size={40} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>No symptoms logged</Text>
          <Text style={styles.emptyDesc}>
            Tap a symptom above to log how you're feeling today. Track patterns across your pregnancy.
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {},

  sectionLabel: {
    ...typography.label,
    marginBottom: 12,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  symptomCard: {
    width: '31%',
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: colors.surfaceGlass,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  symptomIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symptomLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    textAlign: 'center',
  },

  severityCard: {
    marginBottom: 20,
  },
  severityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  severityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  severityBtn: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  severityBtnText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  loggedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  loggedChip: {
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
  loggedText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
  },
  sevDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
})
