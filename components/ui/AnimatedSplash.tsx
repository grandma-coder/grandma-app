/**
 * AnimatedSplash — takes over from the native splash on cold start and "wakes Grandma up":
 * the eye blinks, gives a sticker boing, the wordmark settles, then the mark lifts away and
 * the cream fades to reveal the app (already rendered underneath — no extra waiting).
 *
 * The first frame is pixel-identical to the native splash (same image split into an eye
 * layer and a wordmark layer, same 240pt width, centered on the same background), so the
 * hand-off never flickers. Reduce Motion → a short fade only.
 */
import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, StyleSheet, useColorScheme } from 'react-native'

const WIDTH = 240 // app.json expo-splash-screen imageWidth
const SRC_W = 1800
const EYE_H = (WIDTH * 760) / SRC_W // splash-icon.png rows 0–760
const WORD_H = (WIDTH * 440) / SRC_W // rows 760–1200

const LIGHT = { bg: '#FBF6EA', eye: require('../../assets/splash-eye.png'), word: require('../../assets/splash-word.png') }
const DARK = { bg: '#1A1713', eye: require('../../assets/splash-dark-eye.png'), word: require('../../assets/splash-dark-word.png') }

export function AnimatedSplash({ onDone }: { onDone: () => void }) {
  const dark = useColorScheme() === 'dark'
  const look = dark ? DARK : LIGHT

  const lid = useRef(new Animated.Value(1)).current // eye scaleY (blink)
  const boing = useRef(new Animated.Value(0)).current // 0 → 1 → 0 pop
  const word = useRef(new Animated.Value(0)).current // wordmark settle
  const exit = useRef(new Animated.Value(0)).current // 0 → 1 lift + fade
  const [gone, setGone] = useState(false)

  useEffect(() => {
    let cancelled = false
    const finish = () => { if (!cancelled) { setGone(true); onDone() } }
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return
      if (reduce) {
        Animated.timing(exit, { toValue: 1, duration: 250, useNativeDriver: true }).start(finish)
        return
      }
      Animated.sequence([
        Animated.delay(120),
        // Blink — shut fast, open a touch slower.
        Animated.timing(lid, { toValue: 0.08, duration: 80, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(lid, { toValue: 1, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.parallel([
          // Sticker boing on the eye…
          Animated.sequence([
            Animated.timing(boing, { toValue: 1, duration: 150, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
            Animated.spring(boing, { toValue: 0, friction: 4, tension: 120, useNativeDriver: true }),
          ]),
          // …while the wordmark settles…
          Animated.sequence([
            Animated.delay(90),
            Animated.timing(word, { toValue: 1, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.spring(word, { toValue: 0, friction: 5, tension: 140, useNativeDriver: true }),
          ]),
          // …and on a fixed beat (not when the springs finish resting) the mark lifts away.
          Animated.sequence([
            Animated.delay(420),
            Animated.timing(exit, { toValue: 1, duration: 320, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
          ]),
        ]),
      ]).start(finish)
    })
    return () => { cancelled = true }
  }, [boing, exit, lid, onDone, word])

  if (gone) return null

  const eyeScale = boing.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] })
  const eyeRotate = boing.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-7deg'] })
  const wordY = word.interpolate({ inputRange: [0, 1], outputRange: [0, -7] })
  const markScale = exit.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] })
  const fade = exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: look.bg, opacity: fade }]}
    >
      <Animated.View style={{ transform: [{ scale: markScale }] }}>
        <Animated.Image
          source={look.eye}
          resizeMode="contain"
          style={{
            width: WIDTH,
            height: EYE_H,
            // Pivot on the eye itself (lower half of this layer — the rays sit above it).
            transformOrigin: '50% 58%',
            transform: [{ scale: eyeScale }, { rotate: eyeRotate }, { scaleY: lid }],
          }}
        />
        <Animated.Image
          source={look.word}
          resizeMode="contain"
          style={{ width: WIDTH, height: WORD_H, transform: [{ translateY: wordY }] }}
        />
      </Animated.View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', zIndex: 9999, elevation: 9999 },
})

export default AnimatedSplash
