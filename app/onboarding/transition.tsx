/**
 * Onboarding Transition Screen
 *
 * Warm, encouraging moment between onboarding flows.
 * Auto-advances after 8 seconds. Skip option available.
 */

import { useEffect, useRef } from 'react'
import { View, Text, Pressable, Animated, StyleSheet, Dimensions } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Moon, Heart, Star } from '../../components/ui/Stickers'
import { PillButton } from '../../components/ui/PillButton'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand, stickers } from '../../constants/theme'
import { useOnboardingStore } from '../../store/useOnboardingStore'
import { useBehaviorStore, type Behavior } from '../../store/useBehaviorStore'
import { useModeStore } from '../../store/useModeStore'

const SCREEN_W = Dimensions.get('window').width
const AUTO_ADVANCE_MS = 8000

const BEHAVIOR_CONTENT: Record<Behavior, {
  sticker: React.ReactNode
  color: string
  heading: string
  subtext: string
  route: string
}> = {
  pregnancy: {
    sticker: <Heart size={96} fill={stickers.pink} />,
    color: brand.pregnancy,
    heading: "Now, let's talk about\nyour little one on the way",
    subtext: 'Just a few things to help Grandma support you through your pregnancy.',
    route: '/onboarding/pregnancy',
  },
  kids: {
    sticker: <Star size={96} fill={stickers.blue} />,
    color: brand.kids,
    heading: "Now, let's meet\nyour little ones",
    subtext: 'Tell me about your children so I can help you take the best care of them.',
    route: '/onboarding/kids',
  },
  'pre-pregnancy': {
    sticker: <Moon size={96} fill={stickers.lilac} />,
    color: brand.prePregnancy,
    heading: "Now, let's understand\nyour cycle",
    subtext: 'A little about your cycle so I can help you understand your body.',
    route: '/onboarding/cycle',
  },
}

export default function TransitionScreen() {
  const { colors, font } = useTheme()
  const insets = useSafeAreaInsets()
  const { next } = useLocalSearchParams<{ next: string }>()

  const skipCurrentFlow = useOnboardingStore((s) => s.skipCurrentFlow)
  const queue = useOnboardingStore((s) => s.queue)
  const switchTo = useBehaviorStore((s) => s.switchTo)
  const setMode = useModeStore((s) => s.setModeUnsafe)

  const nextBehavior = (next as Behavior) ?? null
  const content = nextBehavior ? BEHAVIOR_CONTENT[nextBehavior] : null

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.85)).current
  const progressAnim = useRef(new Animated.Value(0)).current
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Redirect home if we landed here without a valid next-behavior. Must be in
  // an effect — calling router.replace during render triggers React's "cannot
  // update during render" warning and can double-navigate in concurrent mode.
  useEffect(() => {
    if (!content) router.replace('/(tabs)' as any)
  }, [content])

  // Keep the latest handleContinue in a ref so the auto-advance timer always
  // reads current state instead of capturing a stale closure on first mount.
  const handleContinueRef = useRef<() => void>(() => {})
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
  handleContinueRef.current = handleContinue

  useEffect(() => {
    if (!content) return
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
      handleContinueRef.current()
    }, AUTO_ADVANCE_MS)

    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current)
    }
  }, [content])

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
    // Effect above will run the redirect. Render nothing in the meantime.
    return null
  }

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
        {/* Sticker */}
        <View style={styles.iconWrap}>{content.sticker}</View>

        {/* Heading */}
        <Text style={[styles.heading, { color: colors.text, fontFamily: font.display }]}>
          {content.heading}
        </Text>

        {/* Subtext */}
        <Text
          style={[styles.subtext, { color: colors.textSecondary, fontFamily: font.body }]}
        >
          {content.subtext}
        </Text>
      </Animated.View>

      {/* Bottom section */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
        {/* CTA */}
        <View style={styles.ctaWrap}>
          <PillButton label="Let's go, dear" variant="ink" onPress={handleContinue} />
        </View>

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
  ctaWrap: {
    width: '100%',
  },

  // Text
  heading: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 36,
  },
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
    borderWidth: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
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
