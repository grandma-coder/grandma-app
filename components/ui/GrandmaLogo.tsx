/**
 * GrandmaLogo — canonical brand mark (heart-eye)
 *
 * Anatomy: almond body + radiating lashes + heart iris + highlight crescent.
 * Palettes + motion variants mirror the reference in logo-studio.html.
 */

import { useEffect, useMemo, useRef } from 'react'
import { Animated, Easing, View } from 'react-native'
import Svg, { Circle, G, Path } from 'react-native-svg'
import { useModeStore } from '../../store/useModeStore'

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

// ---- Palette presets (mirror logo-studio.html blinkColors + iconVariants) ----

export type GrandmaLogoPalette =
  | 'sunny'        // default yellow + coral
  | 'rose'         // pre-pregnancy — pink body + deep coral heart
  | 'lilac'        // pregnancy — lavender body + coral heart
  | 'sky'          // kids — powder blue body + coral heart
  | 'leaf'         // wellness — green body + coral heart
  | 'peach'        // warm — peach body + ink heart
  | 'ember'        // sunset — coral body + ink heart
  | 'bubblegum'    // playful — pink body + lilac heart
  | 'mint-gold'    // green body + yellow heart
  | 'cream-on-ink' // dark mode — cream body + coral heart, cream outline
  | 'neon-night'   // yellow body + hot pink heart, cream outline

interface PaletteColors {
  body: string
  heart: string
  outline: string
}

const PALETTES: Record<GrandmaLogoPalette, PaletteColors> = {
  sunny:          { body: '#F5D652', heart: '#EE7B6D', outline: '#141313' },
  rose:           { body: '#F2B2C7', heart: '#EE4A3C', outline: '#141313' },
  lilac:          { body: '#C8B6E8', heart: '#EE7B6D', outline: '#141313' },
  sky:            { body: '#9DC3E8', heart: '#EE4A3C', outline: '#141313' },
  leaf:           { body: '#BDD48C', heart: '#EE4A3C', outline: '#141313' },
  peach:          { body: '#F5B896', heart: '#141313', outline: '#141313' },
  ember:          { body: '#EE7B6D', heart: '#141313', outline: '#141313' },
  bubblegum:      { body: '#F2B2C7', heart: '#C8B6E8', outline: '#141313' },
  'mint-gold':    { body: '#BDD48C', heart: '#F5D652', outline: '#141313' },
  'cream-on-ink': { body: '#F3ECD9', heart: '#EE7B6D', outline: '#F3ECD9' },
  'neon-night':   { body: '#F5D652', heart: '#FF4FAF', outline: '#F5D652' },
}

// Mode → palette. 'auto' reads the current useModeStore.
const MODE_PALETTE: Record<'pre-pregnancy' | 'pregnancy' | 'kids', GrandmaLogoPalette> = {
  'pre-pregnancy': 'rose',
  pregnancy: 'lilac',
  kids: 'sky',
}

// ---- Motion variants ----

export type GrandmaLogoMotion =
  | 'default'    // blink + heart pulse (idle)
  | 'none'       // static
  | 'blinkOnly'
  | 'pulseOnly'
  | 'sleepy'     // long slow half-blinks (night / rest)
  | 'float'      // gentle vertical bob (calm)
  | 'grow'       // heart swells rhythmically (milestone)
  | 'sparkle'    // blink + orbiting sparkles (premium)
  | 'squeeze'    // heart squish (tap / confirm)

interface GrandmaLogoProps {
  size?: number
  palette?: GrandmaLogoPalette
  /** When set, palette is derived from the journey mode. Pass 'auto' to read from useModeStore. */
  mode?: 'pre-pregnancy' | 'pregnancy' | 'kids' | 'auto'
  /** Override individual colors (wins over palette/mode). */
  body?: string
  outline?: string
  accent?: string
  stroke?: number
  motion?: GrandmaLogoMotion
  animate?: boolean
}

export function GrandmaLogo({
  size = 120,
  palette,
  mode,
  body,
  outline,
  accent,
  stroke = 4.5,
  motion = 'default',
  animate = true,
}: GrandmaLogoProps) {
  const activeMode = useModeStore((s) => s.mode)

  const resolved = useMemo<PaletteColors>(() => {
    const fromMode =
      mode === 'auto' ? MODE_PALETTE[activeMode]
      : mode ? MODE_PALETTE[mode]
      : null
    const base = PALETTES[palette ?? fromMode ?? 'sunny']
    return {
      body: body ?? base.body,
      heart: accent ?? base.heart,
      outline: outline ?? base.outline,
    }
  }, [palette, mode, activeMode, body, accent, outline])

  const wantsBlink = animate && ['default', 'blinkOnly', 'sparkle'].includes(motion)
  const wantsPulse = animate && ['default', 'pulseOnly', 'sparkle'].includes(motion)
  const wantsSleepy = animate && motion === 'sleepy'
  const wantsFloat = animate && motion === 'float'
  const wantsGrow = animate && motion === 'grow'
  const wantsSparkle = animate && motion === 'sparkle'
  const wantsSqueeze = animate && motion === 'squeeze'

  const blink = useRef(new Animated.Value(1)).current
  const pulse = useRef(new Animated.Value(1)).current
  const sleepy = useRef(new Animated.Value(1)).current
  const float = useRef(new Animated.Value(0)).current
  const grow = useRef(new Animated.Value(1)).current
  const orbit = useRef(new Animated.Value(0)).current
  const squeezeX = useRef(new Animated.Value(1)).current
  const squeezeY = useRef(new Animated.Value(1)).current

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

  useEffect(() => {
    if (!wantsSleepy) return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sleepy, { toValue: 1, duration: 1200, useNativeDriver: false }),
        Animated.timing(sleepy, { toValue: 0.32, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(sleepy, { toValue: 0.32, duration: 1200, useNativeDriver: false }),
        Animated.timing(sleepy, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [wantsSleepy, sleepy])

  useEffect(() => {
    if (!wantsFloat) return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: -12, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(float, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [wantsFloat, float])

  useEffect(() => {
    if (!wantsGrow) return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(grow, { toValue: 1.45, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(grow, { toValue: 0.6, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [wantsGrow, grow])

  useEffect(() => {
    if (!wantsSparkle) return
    const loop = Animated.loop(
      Animated.timing(orbit, { toValue: 360, duration: 6000, easing: Easing.linear, useNativeDriver: false })
    )
    loop.start()
    return () => loop.stop()
  }, [wantsSparkle, orbit])

  useEffect(() => {
    if (!wantsSqueeze) return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(squeezeX, { toValue: 1.25, duration: 540, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
          Animated.timing(squeezeY, { toValue: 0.85, duration: 540, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        ]),
        Animated.parallel([
          Animated.timing(squeezeX, { toValue: 0.85, duration: 540, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
          Animated.timing(squeezeY, { toValue: 1.15, duration: 540, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        ]),
        Animated.parallel([
          Animated.timing(squeezeX, { toValue: 1, duration: 720, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
          Animated.timing(squeezeY, { toValue: 1, duration: 720, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        ]),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [wantsSqueeze, squeezeX, squeezeY])

  // Sparkles for "sparkle" motion — positions mirror logo-studio.html
  const sparkles = wantsSparkle ? [
    { cx: 178, cy: 52, r: 6, color: '#F5D652' },
    { cx: 22, cy: 148, r: 5, color: '#F2B2C7' },
    { cx: 165, cy: 175, r: 4.5, color: '#C8B6E8' },
    { cx: 30, cy: 55, r: 4, color: '#9DC3E8' },
  ] : []

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        {/* Float wraps everything (vertical bob) */}
        <AnimatedG translateY={wantsFloat ? (float as unknown as number) : 0}>
          {/* Lashes — behind the eye so blink doesn't clip them */}
          {LASH_PATHS.map(([x1, y1, x2, y2], i) => (
            <Path
              key={i}
              d={`M${x1} ${y1} L${x2} ${y2}`}
              stroke={resolved.outline}
              strokeWidth={stroke}
              strokeLinecap="round"
              fill="none"
            />
          ))}

          {/* Eye group — scales on blink or sleepy half-close */}
          <AnimatedG
            originX={100}
            originY={100}
            scaleX={wantsSqueeze ? (squeezeX as unknown as number) : 1}
            scaleY={
              wantsSleepy
                ? (sleepy as unknown as number)
                : wantsSqueeze
                  ? (squeezeY as unknown as number)
                  : (blink as unknown as number)
            }
          >
            <Path
              d="M 35 100 Q 100 55 165 100 Q 100 145 35 100 Z"
              fill={resolved.body}
              stroke={resolved.outline}
              strokeWidth={stroke}
              strokeLinejoin="round"
            />

            {/* Heart iris — pulses (default) or grows (milestone) */}
            <AnimatedG
              originX={100}
              originY={104}
              scale={wantsGrow ? (grow as unknown as number) : (pulse as unknown as number)}
            >
              <Path
                d="M100 128 C 72 106 64 86 82 76 C 92 71 100 80 100 88 C 100 80 108 71 118 76 C 136 86 128 106 100 128 Z"
                fill={resolved.outline}
              />
              <Path
                d="M100 122 C 78 104 72 88 86 80 C 94 77 100 83 100 90 C 100 83 106 77 114 80 C 128 88 122 104 100 122 Z"
                fill={resolved.heart}
              />
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

          {/* Sparkle halo — orbits around the logo */}
          {wantsSparkle && (
            <AnimatedG originX={100} originY={100} rotation={orbit as unknown as number}>
              {sparkles.map((s, i) => (
                <Circle
                  key={i}
                  cx={s.cx}
                  cy={s.cy}
                  r={s.r}
                  fill={s.color}
                  stroke={resolved.outline}
                  strokeWidth={1}
                />
              ))}
            </AnimatedG>
          )}
        </AnimatedG>
      </Svg>
    </View>
  )
}
