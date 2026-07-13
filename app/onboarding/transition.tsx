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
import { useTheme, stickers, getModeColor, useDiffuseTheme, diffuseFont, getModeField, getDiffuseAccent } from '../../constants/theme'
import { useIsDiffuse } from '../../components/ui/diffuse/DiffuseKit'
import { AuraField, type AuraBloom } from '../../components/ui/diffuse/AuraField'
import { DiffuseSolidCTA, DiffuseTextLink } from '../../components/ui/diffuse/DiffuseActions'
import { Character, type CharacterName } from '../../components/characters/Characters'
import { useOnboardingStore } from '../../store/useOnboardingStore'
import { useBehaviorStore, type Behavior } from '../../store/useBehaviorStore'
import { useModeStore } from '../../store/useModeStore'
import { useTranslation } from '../../lib/i18n'

const SCREEN_W = Dimensions.get('window').width
const AUTO_ADVANCE_MS = 8000

export default function TransitionScreen() {
  const { colors, font, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { next } = useLocalSearchParams<{ next: string }>()

  const BEHAVIOR_CONTENT: Record<Behavior, {
    sticker: React.ReactNode
    char: CharacterName
    heading: string
    subtext: string
    route: string
  }> = {
    pregnancy: {
      sticker: <Heart size={96} fill={stickers.pink} />,
      char: 'heart',
      heading: t('onboardingTransition_pregnancy_heading'),
      subtext: t('onboardingTransition_pregnancy_subtext'),
      route: '/onboarding/pregnancy',
    },
    kids: {
      sticker: <Star size={96} fill={stickers.blue} />,
      char: 'star',
      heading: t('onboardingTransition_kids_heading'),
      subtext: t('onboardingTransition_kids_subtext'),
      route: '/onboarding/kids',
    },
    'pre-pregnancy': {
      sticker: <Moon size={96} fill={stickers.lilac} />,
      char: 'night',
      heading: t('onboardingTransition_cycle_heading'),
      subtext: t('onboardingTransition_cycle_subtext'),
      route: '/onboarding/cycle',
    },
}

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

  // ── Diffuse variant (default): aura field + character hero, matching the
  // onboarding shell so there's no cream-paper seam right before home. ────────
  if (diffuse) {
    const [g1, g2, g3] = getModeField(nextBehavior, dt.isDark)
    const auraBlooms: AuraBloom[] = [
      { color: g1, cx: '18%', cy: '16%', opacity: 0.42 },
      { color: g2, cx: '84%', cy: '26%', opacity: 0.4 },
      { color: g3, cx: '50%', cy: '100%', opacity: 0.4 },
    ]
    const accent = getDiffuseAccent(nextBehavior, dt.isDark)
    return (
      <AuraField blooms={auraBlooms} style={{ backgroundColor: dt.colors.bg }}>
        <Animated.View
          style={[
            styles.content,
            { paddingTop: insets.top + 80, opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View style={styles.iconWrap}>
            <Character name={content.char} size={92} color={accent} />
          </View>
          <Text style={[styles.heading, { color: dt.colors.ink, fontFamily: diffuseFont.displayLight }]}>
            {content.heading}
          </Text>
          <Text style={[styles.subtext, { color: dt.colors.ink2, fontFamily: diffuseFont.body }]}>
            {content.subtext}
          </Text>
        </Animated.View>

        <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.ctaWrap}>
            <DiffuseSolidCTA label={t('onboardingTransition_cta').toUpperCase()} onPress={handleContinue} />
          </View>
          <DiffuseTextLink label={t('onboardingTransition_skip')} onPress={handleSkip} />
          <View style={[styles.progressTrack, { backgroundColor: dt.colors.line }]}>
            <Animated.View style={[styles.progressFill, { backgroundColor: accent, width: progressWidth }]} />
          </View>
        </View>
      </AuraField>
    )
  }

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
          <PillButton label={t('onboardingTransition_cta')} variant="ink" onPress={handleContinue} />
        </View>

        {/* Skip */}
        <Pressable onPress={handleSkip} style={styles.skipBtn}>
          <Text style={[styles.skipText, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
            {t('onboardingTransition_skip')}
          </Text>
        </Pressable>

        {/* Auto-advance progress bar */}
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <Animated.View
            style={[
              styles.progressFill,
              { backgroundColor: getModeColor(nextBehavior, isDark), width: progressWidth },
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
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  subtext: {
    fontSize: 15,
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
  skipBtn: {
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
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
