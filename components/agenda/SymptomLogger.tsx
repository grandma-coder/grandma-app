import { useState, useMemo } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { PaperCard } from '../ui/PaperCard'
import { stickers, borderRadius, typography, useTheme } from '../../constants/theme'
import { useTranslation, type TranslationKey } from '../../lib/i18n'

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

const SYMPTOMS: { id: string; labelKey: TranslationKey; icon: any; color: string }[] = [
  { id: 'nausea', labelKey: 'preg_symptom_nausea', icon: 'water-outline', color: '#86EFAC' },
  { id: 'fatigue', labelKey: 'preg_symptom_fatigue', icon: 'bed-outline', color: '#93C5FD' },
  { id: 'back_pain', labelKey: 'preg_symptom_backPain', icon: 'body-outline', color: '#FCA5A5' },
  { id: 'cravings', labelKey: 'preg_symptom_cravings', icon: 'restaurant-outline', color: '#FDBA74' },
  { id: 'mood_swings', labelKey: 'preg_symptom_moodSwings', icon: 'happy-outline', color: '#C4B5FD' },
  { id: 'swelling', labelKey: 'preg_symptom_swelling', icon: 'resize-outline', color: '#F9A8D4' },
  { id: 'headache', labelKey: 'preg_symptom_headache', icon: 'flash-outline', color: '#FDE68A' },
  { id: 'heartburn', labelKey: 'preg_symptom_heartburn', icon: 'flame-outline', color: '#FDBA74' },
  { id: 'insomnia', labelKey: 'preg_symptom_insomnia', icon: 'moon-outline', color: '#67E8F9' },
  { id: 'braxton_hicks', labelKey: 'preg_symptom_braxtonHicks', icon: 'pulse-outline', color: '#FCA5A5' },
]

const SEVERITY_OPTIONS: { id: 'mild' | 'moderate' | 'strong'; labelKey: TranslationKey; color: string }[] = [
  { id: 'mild', labelKey: 'sw1_sev_mild', color: stickers.green },
  { id: 'moderate', labelKey: 'sw1_sev_moderate', color: stickers.yellow },
  { id: 'strong', labelKey: 'sw1_sev_strong', color: stickers.coral },
]

export function SymptomLogger({ selectedDate, entries = [], onLog }: SymptomLoggerProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
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
      <Text style={styles.sectionLabel}>{t('agendaSymptom_tapToLog')}</Text>
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
              <Text style={styles.symptomLabel}>{t(s.labelKey)}</Text>
              {isLogged && (
                <Ionicons name="checkmark-circle" size={14} color={stickers.green} style={{ position: 'absolute', top: 6, right: 6 }} />
              )}
            </Pressable>
          )
        })}
      </View>

      {/* Severity selector (when a symptom is selected) */}
      {selectedSymptom && (
        <PaperCard radius={28} padding={20} style={styles.severityCard}>
          <Text style={styles.severityTitle}>
            {t('agendaSymptom_howSevere', { symptom: (() => { const k = SYMPTOMS.find((s) => s.id === selectedSymptom)?.labelKey; return k ? t(k).toLowerCase() : '' })() })}
          </Text>
          <View style={styles.severityRow}>
            {SEVERITY_OPTIONS.map((sev) => (
              <Pressable
                key={sev.id}
                onPress={() => handleSeveritySelect(sev.id)}
                style={[styles.severityBtn, { borderColor: sev.color }]}
              >
                <Text style={[styles.severityBtnText, { color: sev.color }]}>{t(sev.labelKey)}</Text>
              </Pressable>
            ))}
          </View>
        </PaperCard>
      )}

      {/* Today's logged symptoms */}
      {todayEntries.length > 0 && (
        <View>
          <Text style={styles.sectionLabel}>{t('agendaSymptom_loggedToday')}</Text>
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
                  <Text style={styles.loggedText}>{symptomInfo ? t(symptomInfo.labelKey) : ''}</Text>
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
          <Ionicons name="pulse-outline" size={40} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>{t('agendaSymptom_emptyTitle')}</Text>
          <Text style={styles.emptyDesc}>
            {t('agendaSymptom_emptyDesc')}
          </Text>
        </View>
      )}
    </View>
  )
}

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {},

  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
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
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
})
