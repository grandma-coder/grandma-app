import { useState } from 'react'
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useJourneyStore } from '../../store/useJourneyStore'
import DatePickerField from '../../components/ui/DatePickerField'

type Mode = 'due' | 'lmp'

export default function DueDate() {
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

    if (mode === 'due') {
      setDueDate(dateInput)
    } else {
      setLmpDate(dateInput)
    }
    setWeekNumber(week)

    router.push('/onboarding/activities')
  }

  function handleSkip() {
    router.push('/onboarding/activities')
  }

  // Due date: future only (next ~9 months)
  // LMP: past only (up to ~10 months ago)
  const now = new Date()
  const minDue = new Date(now)
  const maxDue = new Date(now)
  maxDue.setMonth(maxDue.getMonth() + 10)

  const minLmp = new Date(now)
  minLmp.setMonth(minLmp.getMonth() - 10)

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
      </Pressable>

      <Text style={styles.title}>
        {mode === 'due' ? "When's your due date?" : 'First day of last period?'}
      </Text>
      <Text style={styles.subtitle}>
        This helps Grandma track your pregnancy week by week
      </Text>

      {/* Mode toggle */}
      <View style={styles.toggleRow}>
        <Pressable
          onPress={() => { setMode('due'); setDateInput('') }}
          style={[styles.toggleChip, mode === 'due' && styles.toggleChipActive]}
        >
          <Text style={[styles.toggleText, mode === 'due' && styles.toggleTextActive]}>
            I know my due date
          </Text>
        </Pressable>
        <Pressable
          onPress={() => { setMode('lmp'); setDateInput('') }}
          style={[styles.toggleChip, mode === 'lmp' && styles.toggleChipActive]}
        >
          <Text style={[styles.toggleText, mode === 'lmp' && styles.toggleTextActive]}>
            I know my LMP
          </Text>
        </Pressable>
      </View>

      {/* Date picker */}
      <DatePickerField
        label={mode === 'due' ? 'DUE DATE' : 'LAST MENSTRUAL PERIOD'}
        value={dateInput}
        onChange={setDateInput}
        placeholder="Tap to select"
        minimumDate={mode === 'due' ? minDue : minLmp}
        maximumDate={mode === 'due' ? maxDue : now}
      />

      {/* Week preview */}
      {dateInput ? (
        <View style={styles.weekPreview}>
          <Text style={styles.weekEmoji}>🤰</Text>
          <Text style={styles.weekText}>
            Week {calculateWeek(new Date(dateInput))} of 40
          </Text>
        </View>
      ) : null}

      <View style={styles.bottomActions}>
        <Pressable onPress={handleContinue} style={styles.continueButton}>
          <Text style={styles.continueText}>Continue</Text>
        </Pressable>
        <Pressable onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>I don't know yet — skip</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F4',
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E8E4DC',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#888888',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E8E4DC',
    alignItems: 'center',
  },
  toggleChipActive: {
    borderColor: '#7BAE8E',
    backgroundColor: '#E1F5EE',
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888888',
  },
  toggleTextActive: {
    color: '#7BAE8E',
  },
  weekPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FDE8F0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  weekEmoji: {
    fontSize: 28,
  },
  weekText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  bottomActions: {
    marginTop: 'auto',
    paddingBottom: 40,
    gap: 12,
  },
  continueButton: {
    backgroundColor: '#7BAE8E',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: {
    color: '#888888',
    fontSize: 14,
  },
})
