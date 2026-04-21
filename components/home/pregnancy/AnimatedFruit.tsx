/**
 * AnimatedFruit — wraps BabyIllustration with a per-week motion animation.
 *
 * Reads the week's motion class from weekMotion.ts and applies the
 * corresponding Animated transform loop. Matches the spirit of the
 * `.wk-1` … `.wk-42` CSS animations in pregnancy-weeks.html.
 */

import { useEffect, useRef } from 'react'
import { Animated, Easing, View } from 'react-native'
import { BabyIllustration } from './babyIllustrations'
import { getWeekMotion, WeekMotion } from './weekMotion'

interface Props {
  week: number
  size: number
  character?: boolean
}

export function AnimatedFruit({ week, size, character }: Props) {
  const motion: WeekMotion = getWeekMotion(week)
  const anim = useRef(new Animated.Value(0)).current
  // Secondary value for two-axis motions (squish X/Y, wave circular, drift rotate)
  const anim2 = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const duration = DURATION_BY_MOTION[motion]
    const easing = EASING_BY_MOTION[motion]

    const makeLoop = (v: Animated.Value, d: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: d / 2, easing, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: d / 2, easing, useNativeDriver: true }),
        ])
      )

    const primary = motion === 'spin'
      ? Animated.loop(
          Animated.timing(anim, {
            toValue: 1, duration, easing: Easing.linear, useNativeDriver: true,
          })
        )
      : makeLoop(anim, duration)

    const secondary =
      motion === 'wave' || motion === 'drift' || motion === 'squish'
        ? makeLoop(anim2, duration * 1.4)
        : null

    primary.start()
    secondary?.start()
    return () => {
      primary.stop()
      secondary?.stop()
    }
  }, [motion, anim, anim2])

  const transforms = buildTransforms(motion, anim, anim2)

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={{ transform: transforms }}>
        <BabyIllustration week={week} size={size} character={character} />
      </Animated.View>
    </View>
  )
}

const DURATION_BY_MOTION: Record<WeekMotion, number> = {
  bounce: 1400,
  sway: 2000,
  drift: 2400,
  spin: 6000,
  squish: 1600,
  pulse: 1800,
  shake: 800,
  wave: 3200,
  float: 3000,
}

const EASING_BY_MOTION: Record<WeekMotion, (v: number) => number> = {
  bounce: Easing.inOut(Easing.quad),
  sway: Easing.inOut(Easing.sin),
  drift: Easing.inOut(Easing.quad),
  spin: Easing.linear,
  squish: Easing.inOut(Easing.back(1.5)),
  pulse: Easing.inOut(Easing.quad),
  shake: Easing.inOut(Easing.quad),
  wave: Easing.inOut(Easing.sin),
  float: Easing.inOut(Easing.sin),
}

function buildTransforms(
  motion: WeekMotion,
  a: Animated.Value,
  b: Animated.Value,
): any[] {
  switch (motion) {
    case 'bounce': {
      const scale = a.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.15] })
      return [{ scale }]
    }
    case 'sway': {
      const rot = a.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-10deg', '0deg', '10deg'] })
      return [{ rotate: rot }]
    }
    case 'drift': {
      const ty = a.interpolate({ inputRange: [0, 1], outputRange: [0, -14] })
      const rot = b.interpolate({ inputRange: [0, 1], outputRange: ['-6deg', '6deg'] })
      return [{ translateY: ty }, { rotate: rot }]
    }
    case 'spin': {
      const rot = a.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
      return [{ rotate: rot }]
    }
    case 'squish': {
      const sx = a.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.15] })
      const sy = b.interpolate({ inputRange: [0, 1], outputRange: [1.15, 0.9] })
      return [{ scaleX: sx }, { scaleY: sy }]
    }
    case 'pulse': {
      const scale = a.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.08] })
      return [{ scale }]
    }
    case 'shake': {
      const tx = a.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-6, 0, 6] })
      return [{ translateX: tx }]
    }
    case 'wave': {
      const tx = a.interpolate({ inputRange: [0, 1], outputRange: [-8, 8] })
      const ty = b.interpolate({ inputRange: [0, 1], outputRange: [-6, 6] })
      return [{ translateX: tx }, { translateY: ty }]
    }
    case 'float':
    default: {
      const ty = a.interpolate({ inputRange: [0, 1], outputRange: [0, -10] })
      return [{ translateY: ty }]
    }
  }
}
