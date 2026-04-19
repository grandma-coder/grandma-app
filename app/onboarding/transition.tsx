/**
 * Onboarding Transition Screen
 *
 * Warm, encouraging moment between onboarding flows.
 * Auto-advances after 8 seconds. Skip option available.
 */

import { useEffect, useRef } from 'react'
import { View, Text, Pressable, Animated, StyleSheet, Dimensions } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Moon, Heart, Star, ChevronRight } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { useOnboardingStore } from '../../store/useOnboardingStore'
import { useBehaviorStore, type Behavior } from '../../store/useBehaviorStore'
import { useModeStore } from '../../store/useModeStore'

const SCREEN_W = Dimensions.get('window').width
const AUTO_ADVANCE_MS = 8000

const BEHAVIOR_CONTENT: Record<Behavior, {
  icon: typeof Moon
  color: string
  heading: string
  subtext: string
  route: string
}> = {
  pregnancy: {
    icon: Heart,
    color: brand.pregnancy,
    heading: "Now, let's talk about\nyour little one on the way",
    subtext: 'Just a few things to help Grandma support you through your pregnancy.',
    route: '/onboarding/pregnancy',
  },
  kids: {
    icon: Star,
    color: brand.kids,
    heading: "Now, let's meet\nyour little ones",
    subtext: 'Tell me about your children so I can help you take the best care of them.',
    route: '/onboarding/kids',
  },
  'pre-pregnancy': {
    icon: Moon,
    color: brand.prePregnancy,
    heading: "Now, let's understand\nyour cycle",
    subtext: 'A little about your cycle so I can help you understand your body.',
    route: '/onboarding/cycle',
  },
}

export default function TransitionScreen() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const { next } = useLocalSearchParams<{ next: string }>()

  const skipCurrentFlow = useOnboardingStore((s) => s.skipCurrentFlow)
  const queue = useOnboardingStore((s) => s.queue)
  const switchTo = useBehaviorStore((s) => s.switchTo)
  const setMode = useModeStore((s) => s.setMode)

  const nextBehavior = (next as Behavior) ?? null
  const content = nextBehavior ? BEHAVIOR_CONTENT[nextBehavior] : null

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.85)).current
  const progressAnim = useRef(new Animated.Value(0)).current
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 30, friction: 8, useNativeDriver: true }),
    ]).start()

    // Progress bar + auto-advance
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: AUTO_ADVANCE_MS,
      useNativeDriver: false,
    }).start()

    autoAdvanceTimer.current = setTimeout(() => {
      handleContinue()
    }, AUTO_ADVANCE_MS)

    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current)
    }
  }, [])

  function handleContinue() {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current)
    if (!nextBehavior || !content) {
      router.replace('/(tabs)' as any)
      return
    }
    switchTo(nextBehavior)
    setMode(nextBehavior)
    router.replace(content.route as any)
  }

  function handleSkip() {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current)
    skipCurrentFlow()

    // Check if there's another one after skip
    const remaining = useOnboardingStore.getState().queue
    const nextInQueue = useOnboardingStore.getState().currentOnboarding

    if (nextInQueue) {
      router.replace({
        pathname: '/onboarding/transition',
        params: { next: nextInQueue },
      } as any)
    } else {
      // All done — go home
      const first = useBehaviorStore.getState().enrolledBehaviors[0]
      if (first) {
        switchTo(first)
        setMode(first)
      }
      router.replace('/(tabs)' as any)
    }
  }

  if (!content) {
    router.replace('/(tabs)' as any)
    return null
  }

  const Icon = content.icon
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  })

  return (
    <View style={[styles.root, { backgroundColor: colors.bgWarm }]}>
      <Animated.View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 80,
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Icon with glow */}
        <View style={styles.iconWrap}>
          <View style={[styles.iconGlow, { backgroundColor: content.color, opacity: 0.15 }]} />
          <View style={[styles.iconCircle, { shadowColor: content.color }]}>
            <Icon size={80} color={content.color} strokeWidth={1.5} />
          </View>
        </View>

        {/* Heading */}
        <Text style={[styles.heading, { color: colors.text }]}>
          {content.heading}
        </Text>

        {/* Subtext */}
        <Text style={[styles.subtext, { color: colors.textSecondary }]}>
          {content.subtext}
        </Text>
      </Animated.View>

      {/* Bottom section */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
        {/* CTA */}
        <Pressable
          onPress={handleContinue}
          style={({ pressed }) => [
            styles.ctaButton,
            { backgroundColor: content.color, borderRadius: radius.full },
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          ]}
        >
          <Text style={styles.ctaText}>Let's go, dear</Text>
          <ChevronRight size={20} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>

        {/* Skip */}
        <Pressable onPress={handleSkip} style={styles.skipBtn}>
          <Text style={[styles.skipText, { color: colors.textMuted }]}>
            Skip for now
          </Text>
        </Pressable>

        {/* Auto-advance progress bar */}
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <Animated.View
            style={[
              styles.progressFill,
              { backgroundColor: content.color, width: progressWidth },
            ]}
          />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 24,
  },

  // Icon
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  iconCircle: {
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },

  // Text
  heading: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 36, fontFamily: 'Fraunces_600SemiBold' },
  subtext: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },

  // Bottom
  bottom: {
    paddingHorizontal: 24,
    gap: 16,
    alignItems: 'center',
  },
  ctaButton: {
    width: '100%',
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  skipBtn: {
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Progress
  progressTrack: {
    width: '100%',
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
})
