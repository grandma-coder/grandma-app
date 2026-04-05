/**
 * Journey Selection Screen — two modes:
 *
 * 1. FIRST TIME (no enrolled behaviors): multi-select, full onboarding.
 * 2. ADD MODE (from Profile): only un-enrolled behaviors selectable,
 *    enrolled shown as dimmed. Single-select, adds to existing journeys.
 */

import { useState } from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Moon, Heart, Star, Check, Sparkles, ArrowLeft, X } from 'lucide-react-native'
import { useTheme, brand } from '../../constants/theme'
import { useBehaviorStore, type Behavior } from '../../store/useBehaviorStore'
import { useOnboardingStore } from '../../store/useOnboardingStore'
import { useModeStore } from '../../store/useModeStore'

const JOURNEYS: {
  id: Behavior
  icon: typeof Moon
  title: string
  subtitle: string
  color: string
}[] = [
  {
    id: 'pre-pregnancy',
    icon: Moon,
    title: 'Pre-Pregnancy & Cycle Tracking',
    subtitle: 'Track your cycle and prepare for what comes next',
    color: brand.prePregnancy,
  },
  {
    id: 'pregnancy',
    icon: Heart,
    title: 'Pregnancy',
    subtitle: 'Follow your pregnancy week by week',
    color: brand.pregnancy,
  },
  {
    id: 'kids',
    icon: Star,
    title: 'I have kids',
    subtitle: 'Track health, growth, and every beautiful moment',
    color: brand.kids,
  },
]

/** First onboarding route per behavior */
const FIRST_ROUTE: Record<Behavior, string> = {
  'pre-pregnancy': '/onboarding/cycle',
  pregnancy: '/onboarding/pregnancy',
  kids: '/onboarding/kids',
}

export default function JourneyScreen() {
  const insets = useSafeAreaInsets()
  const { colors, radius } = useTheme()
  const params = useLocalSearchParams<{ addMode?: string }>()

  const isAddMode = params.addMode === 'true'

  const enrolledBehaviors = useBehaviorStore((s) => s.enrolledBehaviors)
  const toggleBehavior = useBehaviorStore((s) => s.toggleBehavior)
  const enroll = useBehaviorStore((s) => s.enroll)
  const switchTo = useBehaviorStore((s) => s.switchTo)
  const buildQueue = useOnboardingStore((s) => s.buildQueue)
  const currentOnboarding = useOnboardingStore((s) => s.currentOnboarding)
  const setMode = useModeStore((s) => s.setMode)

  // In add mode, track new selections separately
  const [newSelections, setNewSelections] = useState<Behavior[]>([])

  // Derive what's selectable
  const unenrolledBehaviors = JOURNEYS.filter((j) => !enrolledBehaviors.includes(j.id))
  const allEnrolled = unenrolledBehaviors.length === 0

  // First-time mode uses enrolledBehaviors (toggled live)
  // Add mode uses newSelections (local state)
  const selections = isAddMode ? newSelections : enrolledBehaviors
  const hasSelection = selections.length > 0

  function handleToggle(b: Behavior) {
    if (isAddMode) {
      // Single-select in add mode
      setNewSelections((prev) => prev.includes(b) ? [] : [b])
    } else {
      toggleBehavior(b)
    }
  }

  function handleContinue() {
    if (!hasSelection) return

    if (isAddMode) {
      // Add mode: enroll single new behavior, go to its onboarding
      const behavior = newSelections[0]
      enroll(behavior)
      buildQueue([behavior])
      setMode(behavior)
      switchTo(behavior)
      router.replace(FIRST_ROUTE[behavior] as any)
    } else {
      // First-time: enroll all selected, build priority queue, start first
      for (const b of selections) enroll(b)
      buildQueue(selections)

      // currentOnboarding is set by buildQueue (priority-sorted first)
      const first = useOnboardingStore.getState().currentOnboarding!
      setMode(first)
      switchTo(first)
      router.push(FIRST_ROUTE[first] as any)
    }
  }

  // All enrolled — warm empty state
  if (isAddMode && allEnrolled) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <View style={[styles.emptyWrap, { paddingTop: insets.top + 80 }]}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primaryTint }]}>
            <Sparkles size={36} color={colors.primary} strokeWidth={1.5} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            You have all three journeys{'\n'}active, dear.
          </Text>
          <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
            You are amazing. All your data is being tracked across every journey.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.continueButton,
              { backgroundColor: colors.primary, borderRadius: radius.lg, marginTop: 24, width: '100%' },
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text style={styles.continueText}>Back to Profile</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Back / Close button */}
        {isAddMode && (
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <X size={24} color={colors.textMuted} />
          </Pressable>
        )}

        {/* Header */}
        <Text style={[styles.heading, { color: colors.text }]}>
          {isAddMode ? 'Add a Journey, Dear' : 'Where are you\non your journey?'}
        </Text>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {isAddMode
            ? 'Your existing data stays exactly as it is.'
            : "Pick all that apply — Grandma's here for every chapter of your story."}
        </Text>

        {/* Journey cards */}
        <View style={styles.cards}>
          {JOURNEYS.map((journey) => {
            const isEnrolled = enrolledBehaviors.includes(journey.id)
            const isSelected = isAddMode
              ? newSelections.includes(journey.id)
              : enrolledBehaviors.includes(journey.id)
            const isDimmed = isAddMode && isEnrolled
            const Icon = journey.icon

            return (
              <Pressable
                key={journey.id}
                onPress={() => !isDimmed && handleToggle(journey.id)}
                disabled={isDimmed}
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: isDimmed
                      ? colors.surfaceRaised
                      : isSelected
                      ? colors.primaryTint
                      : colors.surface,
                    borderRadius: radius.xl,
                    borderColor: isSelected ? colors.primary : colors.border,
                    borderWidth: isSelected ? 2 : 1,
                    opacity: isDimmed ? 0.55 : 1,
                  },
                  pressed && !isDimmed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
                ]}
              >
                {/* Icon circle */}
                <View
                  style={[
                    styles.iconCircle,
                    {
                      backgroundColor: isSelected || isDimmed
                        ? journey.color + '20'
                        : colors.surfaceGlass,
                    },
                  ]}
                >
                  <Icon
                    size={28}
                    color={isDimmed ? colors.textMuted : isSelected ? journey.color : colors.textMuted}
                    strokeWidth={2}
                  />
                </View>

                {/* Text */}
                <View style={styles.cardText}>
                  <Text style={[styles.cardTitle, { color: isDimmed ? colors.textMuted : colors.text }]}>
                    {journey.title}
                  </Text>
                  <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                    {journey.subtitle}
                  </Text>
                </View>

                {/* Status indicator */}
                {isDimmed ? (
                  <View style={[styles.activeBadge, { backgroundColor: journey.color + '20', borderRadius: radius.full }]}>
                    <Text style={[styles.activeBadgeText, { color: journey.color }]}>Active</Text>
                  </View>
                ) : isSelected ? (
                  <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                    <Check size={16} color="#FFFFFF" strokeWidth={3} />
                  </View>
                ) : null}
              </Pressable>
            )
          })}
        </View>
      </ScrollView>

      {/* CTA button — fixed at bottom */}
      {hasSelection && (
        <View
          style={[styles.bottomBar, { paddingBottom: insets.bottom + 16, backgroundColor: colors.bg }]}
        >
          <Pressable
            onPress={handleContinue}
            style={({ pressed }) => [
              styles.continueButton,
              { backgroundColor: colors.primary, borderRadius: radius.lg },
              pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
            ]}
          >
            <Text style={styles.continueText}>
              {isAddMode ? 'Add Journey' : 'Continue'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 24 },

  backBtn: { alignSelf: 'flex-start', padding: 4, marginBottom: 8 },

  // Header
  heading: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -0.8,
    lineHeight: 42,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
    marginBottom: 32,
  },

  // Cards
  cards: { gap: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  cardSubtitle: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBadge: { paddingVertical: 4, paddingHorizontal: 10 },
  activeBadgeText: { fontSize: 11, fontWeight: '700' },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  continueButton: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Empty state
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
    textAlign: 'center',
    lineHeight: 30,
  },
  emptyBody: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
})
