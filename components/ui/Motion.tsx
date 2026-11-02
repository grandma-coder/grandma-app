/**
 * Motion kit — the app's small set of moves, so every screen moves the same way.
 *
 * - FadeUp: a block rises 16pt and fades in; `index` staggers siblings by 70ms.
 * - StickerEnter: a sticker pops in (scale 0 → 1, -30° → its tilt, spring), then idles
 *   with a slow sway so the page feels alive without pulling focus.
 * - useIdleSway: the sway on its own, for stickers that are already on screen.
 *
 * Reduce Motion on: everything appears in place, no sway.
 */

import { Children, ReactNode, useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, type StyleProp, type ViewStyle } from 'react-native'

const STAGGER = 70

function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {})
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce)
    return () => sub.remove()
  }, [])
  return reduce
}

export function FadeUp({
  index = 0,
  delay = 0,
  children,
  style,
}: {
  index?: number
  delay?: number
  children: ReactNode
  style?: StyleProp<ViewStyle>
}) {
  const v = useRef(new Animated.Value(0)).current
  const reduce = useReduceMotion()
  useEffect(() => {
    if (reduce) { v.setValue(1); return }
    Animated.spring(v, { toValue: 1, friction: 9, tension: 70, delay: delay + index * STAGGER, useNativeDriver: true }).start()
  }, [v, index, delay, reduce])
  return (
    <Animated.View
      style={[
        style,
        { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] },
      ]}
    >
      {children}
    </Animated.View>
  )
}

/** Slow sway: ±`deg` around `tilt`, a 2.6–3.4s loop with a per-sticker phase. */
export function useIdleSway(deg = 4, seed = 0) {
  const v = useRef(new Animated.Value(0)).current
  const reduce = useReduceMotion()
  useEffect(() => {
    if (reduce) return
    const half = 1300 + (seed % 5) * 160
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: half, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: -1, duration: half * 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: half, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    )
    const t = setTimeout(() => loop.start(), (seed % 7) * 180)
    return () => { clearTimeout(t); loop.stop() }
  }, [v, seed, reduce])
  return {
    rotate: v.interpolate({ inputRange: [-1, 1], outputRange: [`${-deg}deg`, `${deg}deg`] }),
    translateY: v.interpolate({ inputRange: [-1, 0, 1], outputRange: [1.5, 0, -1.5] }),
  }
}

export function StickerEnter({
  delay = 0,
  tilt = 0,
  seed = 0,
  children,
  style,
}: {
  delay?: number
  tilt?: number
  seed?: number
  children: ReactNode
  style?: StyleProp<ViewStyle>
}) {
  const pop = useRef(new Animated.Value(0)).current
  const reduce = useReduceMotion()
  const sway = useIdleSway(3, seed)
  useEffect(() => {
    if (reduce) { pop.setValue(1); return }
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 90, delay, useNativeDriver: true }).start()
  }, [pop, delay, reduce])
  return (
    <Animated.View
      style={[
        style,
        {
          transform: [
            { scale: pop },
            { rotate: pop.interpolate({ inputRange: [0, 1], outputRange: [`${tilt - 30}deg`, `${tilt}deg`] }) },
          ],
        },
      ]}
    >
      <Animated.View style={{ transform: [{ translateY: sway.translateY }, { rotate: sway.rotate }] }}>
        {children}
      </Animated.View>
    </Animated.View>
  )
}

/** Wraps each child in a FadeUp with a rising index — drop it around a screen's column. */
export function Stagger({ delay = 0, children }: { delay?: number; children: ReactNode }) {
  let i = 0
  return <>{Children.map(children, (child) => (child == null || child === false ? child : <FadeUp index={i++} delay={delay}>{child}</FadeUp>))}</>
}
