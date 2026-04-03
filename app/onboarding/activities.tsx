import { useState, useEffect } from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useJourneyStore } from '../../store/useJourneyStore'
import { useModeStore } from '../../store/useModeStore'
import { CosmicBackground } from '../../components/ui/CosmicBackground'
import { GradientButton } from '../../components/ui/GradientButton'
import { colors, typography, spacing, borderRadius } from '../../constants/theme'

const ACTIVITIES = [
  { id: 'feeding', emoji: '🍼', label: 'Feeding', subtitle: 'Breast, bottle, solids' },
  { id: 'sleep', emoji: '😴', label: 'Sleep', subtitle: 'Naps, bedtime, wake-ups' },
  { id: 'diaper', emoji: '🧷', label: 'Diaper', subtitle: 'Wet, dirty, changes' },
  { id: 'mood', emoji: '😊', label: 'Mood', subtitle: 'How baby is feeling' },
  { id: 'growth', emoji: '📏', label: 'Growth', subtitle: 'Weight, height, milestones' },
  { id: 'medicine', emoji: '💊', label: 'Medicine', subtitle: 'Doses, vitamins, meds' },
  { id: 'vaccines', emoji: '💉', label: 'Vaccines', subtitle: 'Schedule, reactions' },
  { id: 'milestones', emoji: '⭐', label: 'Milestones', subtitle: 'First steps, words, skills' },
]

const PREGNANCY_ACTIVITIES = [
  { id: 'symptoms', emoji: '🤢', label: 'Symptoms', subtitle: 'Nausea, fatigue, kicks' },
  { id: 'appointments', emoji: '🏥', label: 'Appointments', subtitle: 'Checkups, ultrasounds' },
  { id: 'mood', emoji: '😊', label: 'Mood', subtitle: "How you're feeling" },
  { id: 'weight', emoji: '⚖️', label: 'Weight', subtitle: 'Track your gain' },
  { id: 'nutrition', emoji: '🥗', label: 'Nutrition', subtitle: 'Meals, cravings, water' },
  { id: 'medicine', emoji: '💊', label: 'Supplements', subtitle: 'Prenatal, iron, folic acid' },
]

const PRE_PREGNANCY_ACTIVITIES = [
  { id: 'fertility', emoji: '🌸', label: 'Fertility', subtitle: 'Cycle tracking, ovulation' },
  { id: 'nutrition', emoji: '🥗', label: 'Nutrition', subtitle: 'Prenatal diet prep' },
  { id: 'appointments', emoji: '🏥', label: 'Appointments', subtitle: 'Pre-conception checkups' },
  { id: 'mood', emoji: '😊', label: 'Mood', subtitle: "How you're feeling" },
  { id: 'fitness', emoji: '🧘', label: 'Fitness', subtitle: 'Exercise, wellness' },
  { id: 'learning', emoji: '📚', label: 'Learning', subtitle: 'Courses, preparation' },
]

export default function Activities() {
  const insets = useSafeAreaInsets()
  const mode = useModeStore((s) => s.mode)
  const setTrackedActivities = useJourneyStore((s) => s.setTrackedActivities)

  const items =
    mode === 'pregnancy'
      ? PREGNANCY_ACTIVITIES
      : mode === 'pre-pregnancy'
        ? PRE_PREGNANCY_ACTIVITIES
        : ACTIVITIES

  const defaultSelected =
    mode === 'pregnancy'
      ? ['symptoms', 'appointments', 'mood', 'nutrition']
      : mode === 'pre-pregnancy'
        ? ['fertility', 'nutrition', 'mood']
        : ['feeding', 'sleep', 'diaper', 'mood']

  const [selected, setSelected] = useState<string[]>(defaultSelected)

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function handleContinue() {
    setTrackedActivities(selected)
    router.push('/onboarding/child-profile')
  }

  return (
    <CosmicBackground>
      <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        <Text style={styles.title}>What would you{'\n'}like to track?</Text>
        <Text style={styles.subtitle}>
          Pick the ones that matter most — you can always change later
        </Text>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {items.map((item) => {
            const isSelected = selected.includes(item.id)
            return (
              <Pressable
                key={item.id}
                onPress={() => toggle(item.id)}
                style={[
                  styles.card,
                  isSelected && styles.cardSelected,
                ]}
              >
                <Text style={styles.cardEmoji}>{item.emoji}</Text>
                <View style={styles.cardText}>
                  <Text style={styles.cardLabel}>{item.label}</Text>
                  <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                </View>
                <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                  {isSelected && <Ionicons name="checkmark" size={16} color={colors.textOnAccent} />}
                </View>
              </Pressable>
            )
          })}
        </ScrollView>

        <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={styles.countText}>{selected.length} selected</Text>
          <GradientButton
            title="Let's go"
            onPress={handleContinue}
            disabled={selected.length === 0}
          />
        </View>
      </View>
    </CosmicBackground>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing['2xl'],
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    ...typography.heading,
    paddingHorizontal: spacing['2xl'],
    marginBottom: 8,
  },
  subtitle: {
    ...typography.bodySecondary,
    paddingHorizontal: spacing['2xl'],
    marginBottom: 24,
    lineHeight: 22,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing['2xl'],
    paddingBottom: 16,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceGlass,
    gap: 14,
  },
  cardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  cardEmoji: {
    fontSize: 28,
  },
  cardText: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  bottom: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  countText: {
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: 'center',
  },
})
