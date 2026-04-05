/**
 * B1 — Journey Selection Screen
 *
 * Multi-select: user picks one or more behaviors (pre-pregnancy, pregnancy, kids).
 * Selections stored in useBehaviorStore. Primary mode set in useModeStore.
 * Continue → queues onboarding flows for each selected behavior.
 */

import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Moon, Heart, Star, Check } from 'lucide-react-native'
import { useTheme, brand } from '../../constants/theme'
import { useBehaviorStore, type Behavior } from '../../store/useBehaviorStore'
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

  const behaviors = useBehaviorStore((s) => s.behaviors)
  const toggleBehavior = useBehaviorStore((s) => s.toggleBehavior)
  const setOnboardingQueue = useBehaviorStore((s) => s.setOnboardingQueue)
  const setMode = useModeStore((s) => s.setMode)

  const hasSelection = behaviors.length > 0

  function handleContinue() {
    if (!hasSelection) return

    // Set primary mode to first selected behavior
    setMode(behaviors[0])

    // Queue remaining behaviors for sequential onboarding
    const [first, ...rest] = behaviors
    setOnboardingQueue(rest)

    router.push(FIRST_ROUTE[first] as any)
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
        {/* Header */}
        <Text style={[styles.heading, { color: colors.text }]}>
          Where are you{'\n'}on your journey?
        </Text>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Pick all that apply — Grandma's here for every chapter of your story.
        </Text>

        {/* Journey cards */}
        <View style={styles.cards}>
          {JOURNEYS.map((journey) => {
            const selected = behaviors.includes(journey.id)
            const Icon = journey.icon

            return (
              <Pressable
                key={journey.id}
                onPress={() => toggleBehavior(journey.id)}
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderRadius: radius.xl,
                    borderColor: selected ? colors.primary : colors.border,
                    borderWidth: selected ? 2 : 1,
                  },
                  selected && {
                    backgroundColor: colors.primaryTint,
                  },
                  pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
                ]}
              >
                {/* Icon circle */}
                <View
                  style={[
                    styles.iconCircle,
                    {
                      backgroundColor: selected
                        ? journey.color + '20'
                        : colors.surfaceGlass,
                    },
                  ]}
                >
                  <Icon
                    size={28}
                    color={selected ? journey.color : colors.textMuted}
                    strokeWidth={2}
                  />
                </View>

                {/* Text */}
                <View style={styles.cardText}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    {journey.title}
                  </Text>
                  <Text
                    style={[
                      styles.cardSubtitle,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {journey.subtitle}
                  </Text>
                </View>

                {/* Check indicator */}
                {selected && (
                  <View
                    style={[
                      styles.checkCircle,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Check size={16} color="#FFFFFF" strokeWidth={3} />
                  </View>
                )}
              </Pressable>
            )
          })}
        </View>
      </ScrollView>

      {/* Continue button — fixed at bottom */}
      {hasSelection && (
        <View
          style={[
            styles.bottomBar,
            {
              paddingBottom: insets.bottom + 16,
              backgroundColor: colors.bg,
            },
          ]}
        >
          <Pressable
            onPress={handleContinue}
            style={({ pressed }) => [
              styles.continueButton,
              {
                backgroundColor: colors.primary,
                borderRadius: radius.lg,
              },
              pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
            ]}
          >
            <Text style={styles.continueText}>Continue</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 24,
  },

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
  cards: {
    gap: 16,
  },
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
  cardText: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

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
})
