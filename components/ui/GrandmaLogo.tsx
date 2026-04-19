/**
 * GrandmaLogo — canonical brand mark (heart-eye)
 *
 * Anatomy: almond body + radiating lashes + heart iris + highlight crescent.
 * Motion: eye blinks every ~3.6s, heart pulses every ~1.6s.
 *
 * Ported from src/logo-component.jsx in the design handoff.
 */

import { useEffect, useRef } from 'react'
import { Animated, Easing, View } from 'react-native'
import Svg, { G, Path } from 'react-native-svg'

const AnimatedG = Animated.createAnimatedComponent(G)

const LASH_PATHS: Array<[number, number, number, number]> = [
  [100, 35, 100, 60],
  [70, 42, 78, 65],
  [130, 42, 122, 65],
  [48, 58, 62, 74],
  [152, 58, 138, 74],
  [100, 160, 100, 140],
  [70, 158, 78, 138],
  [130, 158, 122, 138],
  [48, 142, 62, 128],
  [152, 142, 138, 128],
]

export type GrandmaLogoMotion =
  | 'default'   // blink + pulse
  | 'none'      // static
  | 'blinkOnly'
  | 'pulseOnly'

interface GrandmaLogoProps {
  size?: number
  body?: string       // almond fill
  outline?: string    // lashes + strokes
  accent?: string     // heart iris
  stroke?: number
  motion?: GrandmaLogoMotion
  animate?: boolean
}

export function GrandmaLogo({
  size = 120,
  body = '#F5D652',
  outline = '#141313',
  accent = '#EE7B6D',
  stroke = 4.5,
  motion = 'default',
  animate = true,
}: GrandmaLogoProps) {
  const wantsBlink = animate && (motion === 'default' || motion === 'blinkOnly')
  const wantsPulse = animate && (motion === 'default' || motion === 'pulseOnly')

  const blink = useRef(new Animated.Value(1)).current
  const pulse = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (!wantsBlink) return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 1, duration: 3168, useNativeDriver: false }),
        Animated.timing(blink, { toValue: 0.05, duration: 144, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(blink, { toValue: 0.05, duration: 144, useNativeDriver: false }),
        Animated.timing(blink, { toValue: 1, duration: 144, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [wantsBlink, blink])

  useEffect(() => {
    if (!wantsPulse) return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 640, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0.96, duration: 320, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 1, duration: 640, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [wantsPulse, pulse])

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        {/* Lashes — rendered behind eye so blink doesn't hide them */}
        {LASH_PATHS.map(([x1, y1, x2, y2], i) => (
          <Path
            key={i}
            d={`M${x1} ${y1} L${x2} ${y2}`}
            stroke={outline}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
          />
        ))}

        {/* Eye group — scales vertically on blink, pivot at almond center */}
        <AnimatedG
          originX={100}
          originY={100}
          scaleX={1}
          scaleY={blink as unknown as number}
        >
          {/* Almond body */}
          <Path
            d="M 35 100 Q 100 55 165 100 Q 100 145 35 100 Z"
            fill={body}
            stroke={outline}
            strokeWidth={stroke}
            strokeLinejoin="round"
          />

          {/* Heart iris group — pulses */}
          <AnimatedG
            originX={100}
            originY={104}
            scale={pulse as unknown as number}
          >
            {/* Shadow / outline of heart */}
            <Path
              d="M100 128 C 72 106 64 86 82 76 C 92 71 100 80 100 88 C 100 80 108 71 118 76 C 136 86 128 106 100 128 Z"
              fill={outline}
            />
            {/* Heart fill */}
            <Path
              d="M100 122 C 78 104 72 88 86 80 C 94 77 100 83 100 90 C 100 83 106 77 114 80 C 128 88 122 104 100 122 Z"
              fill={accent}
            />
            {/* Highlight crescent */}
            <Path
              d="M92 88 C 88 86 84 90 86 94"
              stroke="#FFFEF8"
              strokeWidth={2.5}
              strokeLinecap="round"
              fill="none"
              opacity={0.9}
            />
          </AnimatedG>
        </AnimatedG>
      </Svg>
    </View>
  )
}
