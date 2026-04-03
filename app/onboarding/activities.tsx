import { useState } from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useJourneyStore } from '../../store/useJourneyStore'
import { useModeStore } from '../../store/useModeStore'
import { CosmicBackground } from '../../components/ui/CosmicBackground'
import { THEME_COLORS, spacing, borderRadius } from '../../constants/theme'

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
      <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.6)" />
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
                style={({ pressed }) => [
                  styles.card,
                  isSelected && styles.cardSelected,
                  pressed && { transform: [{ scale: 0.98 }] },
                ]}
              >
                <View style={styles.emojiCircle}>
                  <Text style={styles.cardEmoji}>{item.emoji}</Text>
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardLabel}>{item.label}</Text>
                  <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                </View>
                <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                  {isSelected && <Ionicons name="checkmark" size={14} color="#000" />}
                </View>
              </Pressable>
            )
          })}
        </ScrollView>

        <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={styles.countText}>{selected.length} selected</Text>
          <Pressable
            onPress={handleContinue}
            disabled={selected.length === 0}
            style={({ pressed }) => [
              styles.ctaButton,
              pressed && { transform: [{ scale: 0.95 }] },
              selected.length === 0 && { opacity: 0.4 },
            ]}
          >
            <Text style={styles.ctaText}>Let's go</Text>
          </Pressable>
        </View>
      </View>
    </CosmicBackground>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing['2xl'],
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 36,
    paddingHorizontal: spacing['2xl'],
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    gap: 14,
  },
  cardSelected: {
    borderColor: 'rgba(162,255,134,0.3)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  emojiCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEmoji: {
    fontSize: 22,
  },
  cardText: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.45)',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: THEME_COLORS.green,
    borderColor: THEME_COLORS.green,
  },
  bottom: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    gap: 10,
  },
  countText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  ctaButton: {
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: THEME_COLORS.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME_COLORS.yellow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1030',
    letterSpacing: 0.5,
  },
})
