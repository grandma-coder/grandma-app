/**
 * CycleLogConfirm — post-log "updating your data" confirmation overlay.
 *
 * The cycle-home equivalent of Flo's "Updating predictions… → Predictions
 * updated!" moment, tuned to the "Hi, Rai" editorial language (calm, minimal,
 * typographic — no loud confetti). After any cycle_logs save, a soft phase-tint
 * circle appears over a dimmed scrim: it reads "Updating your cycle…" while the
 * app recalculates, then flips to "Cycle updated" with a check, then quietly
 * auto-dismisses and hands back to the home (which has already re-rendered with
 * the new data underneath).
 *
 * Two beats:
 *   1. UPDATING  — the circle breathes; caption "updating your cycle…"
 *   2. DONE      — check draws in; caption "cycle updated"
 * Timeline ≈ 1.3s total, then onDone(). Honors reduce-motion (skips straight to
 * the DONE state and holds briefly).
 */
import { useEffect, useRef, useState } from 'react'
import { View, Text, Modal, StyleSheet, AccessibilityInfo } from 'react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedProps, withTiming, withRepeat,
  withSequence, withDelay, withSpring, Easing, cancelAnimation, runOnJS,
} from 'react-native-reanimated'
import Svg, { Path } from 'react-native-svg'
import { useTheme, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../../../constants/theme'
import { useIsDiffuse, SoftBloom } from '../../ui/diffuse/DiffuseKit'
import { Character } from '../../characters/Characters'
import type { CyclePhase } from '../../../lib/cycleLogic'
import { useTranslation } from '../../../lib/i18n'

const AnimatedPath = Animated.createAnimatedComponent(Path)

// Soft phase tint for the breathing circle — same hues the ring/strip use, kept
// muted so the overlay whispers rather than shouts.
const PHASE_TINT: Record<CyclePhase, { fill: string; ink: string }> = {
  menstruation: { fill: '#F9D8E2', ink: '#C9776B' },
  follicular:   { fill: '#DDE7BB', ink: '#8FB06A' },
  ovulation:    { fill: '#F9D6C0', ink: '#CE8E68' },
  luteal:       { fill: '#E3D8F2', ink: '#9E8CC4' },
}

interface Props {
  visible: boolean
  phase: CyclePhase
  onDone: () => void
}

const UPDATING_MS = 620   // beat 1 — recalculating
const DONE_HOLD_MS = 680  // beat 2 — "updated" held before dismiss

export function CycleLogConfirm({ visible, phase, onDone }: Props) {
  const { colors, font, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()

  const [phaseStep, setPhaseStep] = useState<'updating' | 'done'>('updating')
  const [reduceMotion, setReduceMotion] = useState(false)

  const scrim = useSharedValue(0)
  const pop = useSharedValue(0)     // circle enter (scale/opacity)
  const breathe = useSharedValue(0) // updating pulse
  const check = useSharedValue(0)   // check-mark draw progress
  const donePulse = useSharedValue(0) // completion bloom-pulse (Diffuse delight)

  const tint = PHASE_TINT[phase]
  // Under Diffuse the circle stays paper (surface) but gains a soft phase-tint
  // BLOOM behind it (below) so it reads on-brand, not a sterile white disc. The
  // check/accent hue keeps the phase character (tint.ink) rather than flat ink.
  const circleFill = diffuse ? dt.colors.surface : tint.fill
  const phaseAccent = tint.ink                 // phase-charactered hue, both variants
  const ringInk = diffuse ? phaseAccent : tint.ink
  // Diffuse: a real dim scrim (translucent ink) so the moment is focused —
  // not the old cream-on-cream wash that let the home bleed through.
  const scrimColor = diffuse ? (isDark ? 'rgba(10,9,8,0.72)' : 'rgba(30,26,22,0.44)') : colors.bg
  const captionColor = diffuse ? dt.colors.ink3 : colors.textMuted
  const titleColor = diffuse ? dt.colors.ink : colors.text

  // Drive the whole sequence off `visible`. Timers are cleared on unmount/close.
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = [] }

  useEffect(() => {
    let alive = true
    AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (alive) setReduceMotion(v) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!visible) return
    setPhaseStep('updating')

    if (reduceMotion) {
      // No motion: show the scrim + finished state, hold briefly, dismiss.
      scrim.value = 1
      pop.value = 1
      check.value = 1
      donePulse.value = 1
      setPhaseStep('done')
      const tmr = setTimeout(() => onDone(), UPDATING_MS + DONE_HOLD_MS)
      timers.current.push(tmr)
      return clearTimers
    }

    scrim.value = withTiming(1, { duration: 180 })
    pop.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.back(1.4)) })
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 480, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 480, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    )

    // Beat 1 → Beat 2: stop the breathe, draw the check, flip caption.
    const toDone = setTimeout(() => {
      cancelAnimation(breathe)
      breathe.value = withTiming(0, { duration: 200 })
      check.value = withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) })
      // Completion bloom-pulse: a soft spring swell as the check lands, then
      // settle — makes "done" feel earned rather than a static tick.
      donePulse.value = withSequence(
        withSpring(1, { damping: 9, stiffness: 140, mass: 0.6 }),
        withDelay(120, withTiming(0.6, { duration: 260, easing: Easing.out(Easing.quad) })),
      )
      setPhaseStep('done')
    }, UPDATING_MS)

    // Dismiss after the DONE state has been held.
    const done = setTimeout(() => {
      scrim.value = withTiming(0, { duration: 220 })
      pop.value = withTiming(0, { duration: 200 }, (finished) => {
        'worklet'
        if (finished) runOnJS(onDone)()
      })
    }, UPDATING_MS + DONE_HOLD_MS)

    timers.current.push(toDone, done)
    return () => {
      clearTimers()
      cancelAnimation(breathe)
      cancelAnimation(pop)
      cancelAnimation(scrim)
      cancelAnimation(check)
      cancelAnimation(donePulse)
    }
    // Re-run the sequence each time the overlay is (re)opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reduceMotion])

  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.value * 0.96 }))
  const circleStyle = useAnimatedStyle(() => ({
    opacity: pop.value,
    transform: [
      // enter pop + breathing pulse + a small completion swell on the done beat
      { scale: 0.86 + pop.value * 0.14 + breathe.value * 0.05 + donePulse.value * 0.06 },
    ],
  }))
  // Soft phase-tint bloom behind the circle — grows/brightens as the check lands.
  const bloomStyle = useAnimatedStyle(() => ({
    opacity: pop.value * (0.55 + donePulse.value * 0.45),
    transform: [{ scale: 0.9 + pop.value * 0.2 + donePulse.value * 0.25 }],
  }))
  // Sparkle accent — only appears on the completion beat.
  const sparkleStyle = useAnimatedStyle(() => ({
    opacity: check.value * donePulse.value,
    transform: [{ scale: 0.6 + donePulse.value * 0.6 }],
  }))
  // Draw the check by animating the dash offset from full length → 0 (SVG
  // stroke props animate via animatedProps, not style).
  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: (1 - check.value) * 26,
    opacity: check.value,
  }))
  const dotsStyle = useAnimatedStyle(() => ({
    opacity: (1 - check.value) * (0.5 + breathe.value * 0.5),
  }))

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, { backgroundColor: scrimColor }, scrimStyle]}>
        <View style={styles.center}>
          <View style={styles.circleStage}>
            {/* Diffuse: a soft phase-tint bloom halo behind the paper circle,
                so the moment glows in the phase's color instead of a flat disc. */}
            {diffuse && (
              <Animated.View pointerEvents="none" style={[styles.bloom, bloomStyle]}>
                <SoftBloom color={phaseAccent} opacity={isDark ? 0.5 : 0.65} spread={0.7} radius="70%" />
              </Animated.View>
            )}
            <Animated.View
              style={[
                styles.circle,
                { backgroundColor: circleFill, borderColor: diffuse ? dt.colors.line2 : ringInk + '55' },
                circleStyle,
              ]}
            >
            <Svg width={44} height={44} viewBox="0 0 44 44">
              {/* Updating dots collapse into the check as it draws in. */}
              <AnimatedPath
                d="M14 22 L20 28 L31 16"
                stroke={ringInk}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray={26}
                animatedProps={checkProps}
              />
            </Svg>
            {/* Breathing "recalculating" dot ring, fades as the check draws. */}
            <Animated.View style={[styles.dots, dotsStyle]} pointerEvents="none">
              <View style={[styles.dot, { backgroundColor: ringInk }]} />
              <View style={[styles.dot, { backgroundColor: ringInk }]} />
              <View style={[styles.dot, { backgroundColor: ringInk }]} />
            </Animated.View>
            </Animated.View>
            {/* Sparkle accent on completion — the little "ta-da". */}
            <Animated.View pointerEvents="none" style={[styles.sparkle, sparkleStyle]}>
              <Character name="sparkle" size={22} color={phaseAccent} />
            </Animated.View>
          </View>

          <Text
            style={[
              styles.title,
              { color: titleColor, fontFamily: diffuse ? diffuseFont.display : font.display },
            ]}
          >
            {phaseStep === 'done' ? t('cycleConfirm_doneTitle') : t('cycleConfirm_updatingTitle')}
          </Text>
          <Text
            style={[
              styles.caption,
              diffuse
                ? { color: captionColor, fontFamily: diffuseFont.mono, letterSpacing: 1.4, textTransform: 'uppercase', fontSize: 10 }
                : { color: captionColor, fontFamily: font.italic, fontStyle: 'italic', fontSize: 13 },
            ]}
          >
            {phaseStep === 'done' ? t('cycleConfirm_doneCaption') : t('cycleConfirm_updatingCaption')}
          </Text>
        </View>
      </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  scrim: { alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center', gap: 16 },
  circleStage: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bloom: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
  },
  circle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkle: {
    position: 'absolute',
    top: 14,
    right: 20,
  },
  dots: {
    position: 'absolute',
    flexDirection: 'row',
    gap: 5,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  title: { fontSize: 22, letterSpacing: -0.3, textAlign: 'center' },
  caption: { textAlign: 'center' },
})
