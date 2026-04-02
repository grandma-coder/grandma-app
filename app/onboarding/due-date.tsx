import { useState } from 'react'
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useJourneyStore } from '../../store/useJourneyStore'
import { CosmicBackground } from '../../components/ui/CosmicBackground'
import { GlassCard } from '../../components/ui/GlassCard'
import { GradientButton } from '../../components/ui/GradientButton'
import DatePickerField from '../../components/ui/DatePickerField'
import { colors, typography, spacing } from '../../constants/theme'

type Mode = 'due' | 'lmp'

export default function DueDate() {
  const insets = useSafeAreaInsets()
  const { setDueDate, setLmpDate, setWeekNumber } = useJourneyStore()
  const [mode, setMode] = useState<Mode>('due')
  const [dateInput, setDateInput] = useState('')

  function calculateWeek(date: Date): number {
    const now = new Date()
    if (mode === 'due') {
      const diffMs = date.getTime() - now.getTime()
      const weeksLeft = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
      return Math.max(1, 40 - weeksLeft)
    } else {
      const diffMs = now.getTime() - date.getTime()
      return Math.max(1, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)))
    }
  }

  function handleContinue() {
    if (!dateInput) {
      Alert.alert('Required', mode === 'due' ? "When's your due date?" : "When was the first day of your last period?")
      return
    }
    const parsed = new Date(dateInput)
    const week = calculateWeek(parsed)
    if (mode === 'due') setDueDate(dateInput)
    else setLmpDate(dateInput)
    setWeekNumber(week)
    router.push('/onboarding/baby-name')
  }

  function handleSkip() {
    router.push('/onboarding/baby-name')
  }

  const now = new Date()
  const maxDue = new Date(now)
  maxDue.setMonth(maxDue.getMonth() + 10)
  const minLmp = new Date(now)
  minLmp.setMonth(minLmp.getMonth() - 10)

  return (
    <CosmicBackground variant="pregnancy">
      <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        <Text style={styles.title}>
          {mode === 'due' ? "When's your\ndue date?" : "First day of\nlast period?"}
        </Text>
        <Text style={styles.subtitle}>
          This helps Grandma track your pregnancy week by week
        </Text>

        {/* Mode toggle */}
        <View style={styles.toggleRow}>
          {(['due', 'lmp'] as Mode[]).map((m) => (
            <Pressable
              key={m}
              onPress={() => { setMode(m); setDateInput('') }}
              style={[styles.toggleChip, mode === m && styles.toggleChipActive]}
            >
              <Text style={[styles.toggleText, mode === m && styles.toggleTextActive]}>
                {m === 'due' ? 'I know my due date' : 'I know my LMP'}
              </Text>
            </Pressable>
          ))}
        </View>

        <DatePickerField
          label={mode === 'due' ? 'EXPECTED DUE DATE' : 'LAST MENSTRUAL PERIOD'}
          value={dateInput}
          onChange={setDateInput}
          placeholder="mm/dd/yyyy"
          minimumDate={mode === 'due' ? now : minLmp}
          maximumDate={mode === 'due' ? maxDue : now}
        />

        {dateInput ? (
          <GlassCard variant="accent" style={styles.weekPreview}>
            <View style={styles.weekRow}>
              <Text style={styles.weekEmoji}>🌙</Text>
              <Text style={styles.weekText}>
                Week {calculateWeek(new Date(dateInput))} of 40
              </Text>
            </View>
          </GlassCard>
        ) : null}

        <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
          <GradientButton title="Continue" onPress={handleContinue} />
          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>I don't know yet — skip</Text>
          </Pressable>
        </View>
      </View>
    </CosmicBackground>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing['2xl'],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    ...typography.heading,
    marginBottom: 8,
  },
  subtitle: {
    ...typography.bodySecondary,
    marginBottom: 32,
    lineHeight: 22,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  toggleChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  toggleChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  toggleTextActive: {
    color: colors.accent,
  },
  weekPreview: {
    marginBottom: 16,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  weekEmoji: {
    fontSize: 28,
  },
  weekText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  bottom: {
    marginTop: 'auto',
    gap: 12,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    color: colors.textTertiary,
  },
})
