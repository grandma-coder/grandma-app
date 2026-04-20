/**
 * AnimatedSticker — wraps a sticker shape with a per-type idle motion.
 * Pure transform animations driven by the native driver. Honors reduce-motion.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Easing, AccessibilityInfo, type TransformsStyle } from 'react-native'
import * as Stickers from './Stickers'

export type AnimatedStickerType =
  | 'Heart'
  | 'Star'
  | 'Leaf'
  | 'Drop'
  | 'Burst'
  | 'Flower'
  | 'Moon'
  | 'Cross'

interface Props {
  type: AnimatedStickerType
  size?: number
  fill?: string
  petal?: string
  center?: string
}

type TransformList = NonNullable<TransformsStyle['transform']>

interface MotionConfig {
  duration: number
  build: (v: Animated.Value) => TransformList
}

const MOTIONS: Record<AnimatedStickerType, MotionConfig> = {
  Heart: {
    duration: 1600,
    build: (v) => [
      {
        scale: v.interpolate({
          inputRange: [0, 0.18, 0.36, 1],
          outputRange: [1, 1.08, 0.98, 1],
        }),
      },
    ],
  },
  Star: {
    duration: 3000,
    build: (v) => [
      {
        rotate: v.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: ['-4deg', '4deg', '-4deg'],
        }),
      },
      {
        scale: v.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [1, 1.05, 1],
        }),
      },
    ],
  },
  Leaf: {
    duration: 2600,
    build: (v) => [
      {
        rotate: v.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: ['-6deg', '6deg', '-6deg'],
        }),
      },
    ],
  },
  Drop: {
    duration: 2000,
    build: (v) => [
      {
        translateY: v.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [-2, 2, -2],
        }),
      },
      {
        scaleY: v.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [1, 0.97, 1],
        }),
      },
    ],
  },
  Burst: {
    duration: 8000,
    build: (v) => [
      {
        rotate: v.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        }),
      },
    ],
  },
  Flower: {
    duration: 3000,
    build: (v) => [
      {
        rotate: v.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: ['-8deg', '8deg', '-8deg'],
        }),
      },
    ],
  },
  Moon: {
    duration: 4000,
    build: (v) => [
      {
        rotate: v.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: ['-3deg', '3deg', '-3deg'],
        }),
      },
    ],
  },
  Cross: {
    duration: 2000,
    build: (v) => [
      {
        scale: v.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [1, 1.05, 1],
        }),
      },
    ],
  },
}

export function AnimatedSticker({ type, size, fill, petal, center }: Props) {
  const [reduceMotion, setReduceMotion] = useState(false)
  const progress = useRef(new Animated.Value(0)).current
  const phaseDelay = useRef(Math.random() * MOTIONS[type].duration).current

  useEffect(() => {
    let mounted = true
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled)
    })
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => setReduceMotion(enabled)
    )
    return () => {
      mounted = false
      sub.remove()
    }
  }, [])

  const motion = MOTIONS[type]

  useEffect(() => {
    if (reduceMotion) return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: motion.duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    )
    const timer = setTimeout(() => loop.start(), phaseDelay)
    return () => {
      clearTimeout(timer)
      loop.stop()
    }
  }, [reduceMotion, motion.duration, progress, phaseDelay])

  const transform = useMemo(() => motion.build(progress), [motion, progress])

  const Sticker = Stickers[type] as React.ComponentType<{
    size?: number
    fill?: string
    petal?: string
    center?: string
  }>

  if (reduceMotion) {
    return <Sticker size={size} fill={fill} petal={petal} center={center} />
  }

  return (
    <Animated.View style={{ transform }}>
      <Sticker size={size} fill={fill} petal={petal} center={center} />
    </Animated.View>
  )
}
