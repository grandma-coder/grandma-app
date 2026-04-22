/**
 * GalleryCharts — RN chart primitives ported from the studio design system.
 *
 * Each primitive is a small, self-contained visual used by one of the three
 * behaviors (pre-pregnancy, pregnancy, kids). They share a warm sticker palette
 * from constants/theme.ts and use react-native-svg + react-native-reanimated v4
 * for entrance + ambient animations.
 *
 * Components exported:
 *   - HormoneWave           (pre-preg · hormone card)
 *   - LiquidFillBottle      (pre-preg · hydration)
 *   - CycleTodayPulse       (pre-preg · cycle ring decoration)
 *   - WeeksProgressBeads    (pregnancy · week display)
 *   - PulseBubblesLive      (pregnancy · kicks / heartbeat)
 *   - PolarClock24h         (kids · sleep rhythm)
 *   - MoodStripLollipop     (kids · mood week)
 *   - BlockTower            (kids · vaccines done)
 *   - RadarWellness         (shared analytics · 6-axis score)
 *   - Candlesticks          (pregnancy · weight range)
 */

import { useEffect, useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, {
  Path,
  Circle,
  Rect,
  Line,
  Defs,
  LinearGradient,
  Stop,
  ClipPath,
  G,
  Polygon,
  Polyline,
  Text as SvgText,
} from 'react-native-svg'
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
  cancelAnimation,
  type SharedValue,
} from 'react-native-reanimated'
import { useTheme } from '../../constants/theme'

const AnimatedPath = Animated.createAnimatedComponent(Path)
const AnimatedCircle = Animated.createAnimatedComponent(Circle)
const AnimatedG = Animated.createAnimatedComponent(G)
const AnimatedRect = Animated.createAnimatedComponent(Rect)

/* ────────────────────────────────────────────────────────────────────────────
 * 1. HormoneWave — scrolling living wave with gradient area
 * Used by: pre-pregnancy HormoneChart
 * ────────────────────────────────────────────────────────────────────────── */

interface HormoneWaveProps {
  /** 0–1 progress through the cycle, shows "today" marker at that x */
  progress: number
  /** Main wave color (defaults to mode-accent) */
  color?: string
  /** Secondary (progesterone) color */
  colorAlt?: string
  height?: number
  label?: string
}

export function HormoneWave({
  progress,
  color,
  colorAlt,
  height = 120,
  label,
}: HormoneWaveProps) {
  const { colors, stickers, font, isDark } = useTheme()
  const primary = color ?? colors.primary
  const secondary = colorAlt ?? stickers.lilac

  // Continuous horizontal scroll for the wave
  const shift = useSharedValue(0)
  useEffect(() => {
    shift.value = 0
    shift.value = withRepeat(
      withTiming(-80, { duration: 5000, easing: Easing.linear }),
      -1,
      false,
    )
    return () => cancelAnimation(shift)
  }, [shift])
  const waveStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shift.value }],
  }))
  const waveSlowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shift.value * 0.6 }],
  }))

  // Marker position across a 400-wide viewBox
  const markerX = Math.max(8, Math.min(392, progress * 400))

  return (
    <View style={{ height, overflow: 'hidden', borderRadius: 16 }}>
      <Animated.View style={[StyleSheet.absoluteFill, waveStyle]}>
        <Svg width="160%" height={height} viewBox={`-80 0 400 ${height}`}>
          <Defs>
            <LinearGradient id="hw-grad" x1="0" x2="0" y1="0" y2="1">
              <Stop offset="0%" stopColor={primary} stopOpacity={isDark ? 0.55 : 0.4} />
              <Stop offset="100%" stopColor={primary} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path
            d={`M-80,${height * 0.55} Q-60,${height * 0.3} -40,${height * 0.55} T0,${height * 0.55} T40,${height * 0.55} T80,${height * 0.55} T120,${height * 0.55} T160,${height * 0.55} T200,${height * 0.55} T240,${height * 0.55} T280,${height * 0.55} L280,${height} L-80,${height} Z`}
            fill="url(#hw-grad)"
          />
          <Path
            d={`M-80,${height * 0.55} Q-60,${height * 0.3} -40,${height * 0.55} T0,${height * 0.55} T40,${height * 0.55} T80,${height * 0.55} T120,${height * 0.55} T160,${height * 0.55} T200,${height * 0.55} T240,${height * 0.55} T280,${height * 0.55}`}
            fill="none"
            stroke={primary}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, waveSlowStyle, { opacity: 0.5 }]}>
        <Svg width="160%" height={height} viewBox={`-80 0 400 ${height}`}>
          <Path
            d={`M-80,${height * 0.68} Q-60,${height * 0.52} -40,${height * 0.68} T0,${height * 0.68} T40,${height * 0.68} T80,${height * 0.68} T120,${height * 0.68} T160,${height * 0.68} T200,${height * 0.68} T240,${height * 0.68} T280,${height * 0.68}`}
            fill="none"
            stroke={secondary}
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray="2 4"
          />
        </Svg>
      </Animated.View>

      {/* "today" marker */}
      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 400 ${height}`}
        preserveAspectRatio="none"
        style={StyleSheet.absoluteFill}
      >
        <Line
          x1={markerX}
          y1={16}
          x2={markerX}
          y2={height - 4}
          stroke={stickers.green}
          strokeWidth={1}
          strokeDasharray="3 4"
          opacity={0.5}
        />
        <Circle cx={markerX} cy={16} r={5} fill={stickers.green} />
      </Svg>

      {label ? (
        <Text
          style={{
            position: 'absolute',
            right: 10,
            top: 8,
            color: colors.textMuted,
            fontSize: 9,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            fontFamily: font.body,
            fontWeight: '700',
          }}
        >
          {label}
        </Text>
      ) : null}
    </View>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
 * 2. LiquidFillBottle — bottle-shaped SVG with animated wave water fill
 * Used by: pre-pregnancy HealthDashboard hydration
 * ────────────────────────────────────────────────────────────────────────── */

interface LiquidFillBottleProps {
  /** 0–1 current fill level */
  percent: number
  /** Bottle width; height is width * 1.25 */
  size?: number
  color?: string
  label?: string
}

export function LiquidFillBottle({
  percent,
  size = 140,
  color,
  label,
}: LiquidFillBottleProps) {
  const { colors, stickers } = useTheme()
  const blue = color ?? stickers.blue
  const height = size * 1.25

  const shift = useSharedValue(0)
  useEffect(() => {
    shift.value = withRepeat(
      withTiming(-80, { duration: 4800, easing: Easing.linear }),
      -1,
      false,
    )
    return () => cancelAnimation(shift)
  }, [shift])
  const waveStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shift.value }],
  }))
  const waveSlowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shift.value * 0.6 }],
  }))

  const pct = Math.max(0, Math.min(1, percent))
  // Map fill percent -> water surface y (bottle interior roughly 24..156 on 170-tall)
  const surfaceY = 156 - pct * (156 - 24)

  return (
    <View style={{ width: size, height, alignSelf: 'center' }}>
      <Svg width={size} height={height} viewBox="0 0 140 170">
        <Defs>
          <ClipPath id="bottle-clip">
            <Path d="M58,14 L58,30 Q58,36 54,40 L42,58 Q38,64 38,74 L38,148 Q38,158 48,158 L92,158 Q102,158 102,148 L102,74 Q102,64 98,58 L86,40 Q82,36 82,30 L82,14 Z" />
          </ClipPath>
        </Defs>
        <Path
          d="M58,14 L58,30 Q58,36 54,40 L42,58 Q38,64 38,74 L38,148 Q38,158 48,158 L92,158 Q102,158 102,148 L102,74 Q102,64 98,58 L86,40 Q82,36 82,30 L82,14 Z"
          fill={colors.surfaceRaised}
          stroke={colors.borderStrong}
          strokeWidth={1.5}
        />
        <Rect x="60" y="6" width="20" height="10" rx="3" fill={colors.text} />
      </Svg>
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { overflow: 'hidden', borderRadius: size / 3 },
        ]}
      >
        <Svg
          width={size}
          height={height}
          viewBox="0 0 140 170"
          style={StyleSheet.absoluteFill}
        >
          <Defs>
            <ClipPath id="bottle-clip-2">
              <Path d="M58,14 L58,30 Q58,36 54,40 L42,58 Q38,64 38,74 L38,148 Q38,158 48,158 L92,158 Q102,158 102,148 L102,74 Q102,64 98,58 L86,40 Q82,36 82,30 L82,14 Z" />
            </ClipPath>
          </Defs>
          <G clipPath="url(#bottle-clip-2)">
            <Rect x="0" y={surfaceY} width="140" height="170" fill={blue} opacity={0.85} />
          </G>
        </Svg>
        <Animated.View
          style={[StyleSheet.absoluteFill, waveStyle, { opacity: 0.9 }]}
        >
          <Svg width="160%" height={height} viewBox={`-80 0 400 ${170}`}>
            <Defs>
              <ClipPath id="bottle-clip-3">
                <Path d="M58,14 L58,30 Q58,36 54,40 L42,58 Q38,64 38,74 L38,148 Q38,158 48,158 L92,158 Q102,158 102,148 L102,74 Q102,64 98,58 L86,40 Q82,36 82,30 L82,14 Z" />
              </ClipPath>
            </Defs>
            <G clipPath="url(#bottle-clip-3)">
              <Path
                d={`M-80,${surfaceY + 0} Q-60,${surfaceY - 6} -40,${surfaceY} T0,${surfaceY} T40,${surfaceY} T80,${surfaceY} T120,${surfaceY} T160,${surfaceY} T200,${surfaceY} T240,${surfaceY} T280,${surfaceY} L280,170 L-80,170 Z`}
                fill={blue}
              />
            </G>
          </Svg>
        </Animated.View>
        <Animated.View
          style={[StyleSheet.absoluteFill, waveSlowStyle, { opacity: 0.5 }]}
        >
          <Svg width="160%" height={height} viewBox={`-80 0 400 ${170}`}>
            <Defs>
              <ClipPath id="bottle-clip-4">
                <Path d="M58,14 L58,30 Q58,36 54,40 L42,58 Q38,64 38,74 L38,148 Q38,158 48,158 L92,158 Q102,158 102,148 L102,74 Q102,64 98,58 L86,40 Q82,36 82,30 L82,14 Z" />
              </ClipPath>
            </Defs>
            <G clipPath="url(#bottle-clip-4)">
              <Path
                d={`M-80,${surfaceY + 8} Q-60,${surfaceY + 2} -40,${surfaceY + 8} T0,${surfaceY + 8} T40,${surfaceY + 8} T80,${surfaceY + 8} T120,${surfaceY + 8} T160,${surfaceY + 8} T200,${surfaceY + 8} T240,${surfaceY + 8} T280,${surfaceY + 8} L280,170 L-80,170 Z`}
                fill={stickers.blueSoft}
              />
            </G>
          </Svg>
        </Animated.View>
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            fontFamily: 'Fraunces_600SemiBold',
            fontSize: 24,
            color: colors.text,
          }}
        >
          {Math.round(pct * 100)}%
        </Text>
        {label ? (
          <Text
            style={{
              fontSize: 9,
              fontWeight: '700',
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: colors.textMuted,
              marginTop: 2,
            }}
          >
            {label}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
 * 3. CycleTodayPulse — an overlay that paints a pulsing ring on today's dot
 * Used by: pre-pregnancy CyclePhaseRing
 * ────────────────────────────────────────────────────────────────────────── */

interface CycleTodayPulseProps {
  x: number
  y: number
  color: string
  /** Absolute pixel radius of the base dot */
  r?: number
}

export function CycleTodayPulse({ x, y, color, r = 6 }: CycleTodayPulseProps) {
  const scale = useSharedValue(1)
  const opacity = useSharedValue(0.9)
  useEffect(() => {
    scale.value = withRepeat(
      withTiming(3.2, { duration: 2400, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    )
    opacity.value = withRepeat(
      withTiming(0, { duration: 2400, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    )
    return () => {
      cancelAnimation(scale)
      cancelAnimation(opacity)
    }
  }, [scale, opacity])
  const rippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }))
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: x - r,
          top: y - r,
          width: r * 2,
          height: r * 2,
          borderRadius: r,
          backgroundColor: color,
        },
        rippleStyle,
      ]}
    />
  )
}

/* ────────────────────────────────────────────────────────────────────────────
 * 4. WeeksProgressBeads — 40-week S-curve path with beads at milestone weeks
 * Used by: pregnancy PregnancyWeekDisplay
 * ────────────────────────────────────────────────────────────────────────── */

interface WeeksProgressBeadsProps {
  week: number
  color?: string
  height?: number
}

export function WeeksProgressBeads({
  week,
  color,
  height = 84,
}: WeeksProgressBeadsProps) {
  const { colors, stickers } = useTheme()
  const accent = color ?? colors.primary

  const beads = [
    { w: 8, x: 28, y: 70 },
    { w: 16, x: 68, y: 50 },
    { w: 24, x: 108, y: 58 },
    { w: 32, x: 148, y: 66 },
    { w: 40, x: 186, y: 48 },
  ]

  // Determine which bead is active (closest current week)
  const activeIndex = useMemo(() => {
    let best = 0
    let bestDelta = Infinity
    beads.forEach((b, i) => {
      const d = Math.abs(b.w - week)
      if (d < bestDelta) {
        best = i
        bestDelta = d
      }
    })
    return best
  }, [week])

  // Reveal path
  const reveal = useSharedValue(0)
  useEffect(() => {
    reveal.value = 0
    reveal.value = withTiming(1, { duration: 1400, easing: Easing.out(Easing.cubic) })
  }, [reveal])
  const pathProps = useAnimatedProps(() => ({
    strokeDashoffset: 260 * (1 - reveal.value),
  }))

  // Pulse on active bead
  const pulse = useSharedValue(1)
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.25, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    )
    return () => cancelAnimation(pulse)
  }, [pulse])
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }))

  return (
    <View style={{ width: '100%', height }}>
      <Svg width="100%" height={height} viewBox="0 0 200 100">
        <Path
          d="M6,88 C40,88 40,58 70,58 S100,88 130,88 S160,58 190,58"
          fill="none"
          stroke={colors.borderLight}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <AnimatedPath
          d="M6,88 C40,88 40,58 70,58 S100,88 130,88 S160,58 190,58"
          fill="none"
          stroke={accent}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={260}
          animatedProps={pathProps}
        />
        {beads.map((b, i) => {
          const isActive = i === activeIndex
          return (
            <G key={i}>
              <Circle
                cx={b.x}
                cy={b.y}
                r={isActive ? 6 : 4.5}
                fill={isActive ? accent : colors.surface}
                stroke={colors.text}
                strokeWidth={1.4}
              />
            </G>
          )
        })}
      </Svg>
      {/* Pulse overlay on active bead */}
      {(() => {
        const b = beads[activeIndex]
        if (!b) return null
        // translate SVG-coords to parent-coords (viewBox 0..200 → width 100%)
        return (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                left: `${(b.x / 200) * 100}%`,
                top: (b.y / 100) * height - 8,
                width: 16,
                height: 16,
                marginLeft: -8,
                borderRadius: 8,
                backgroundColor: accent,
                opacity: 0.25,
              },
              pulseStyle,
            ]}
          />
        )
      })()}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: 10,
          marginTop: -8,
        }}
      >
        {beads.map((b, i) => (
          <Text
            key={i}
            style={{
              fontSize: 9,
              color: i === activeIndex ? colors.text : colors.textMuted,
              fontWeight: i === activeIndex ? '700' : '500',
              fontFamily: 'Fraunces_600SemiBold',
            }}
          >
            W{b.w}
          </Text>
        ))}
      </View>
    </View>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
 * 5. PulseBubblesLive — expanding ripples behind a heart pulse
 * Used by: pregnancy KickCounter / ContractionTimer live views
 * ────────────────────────────────────────────────────────────────────────── */

interface PulseBubblesLiveProps {
  /** 'live' = continuous pulse; 'paused' = still */
  state?: 'live' | 'paused'
  color?: string
  size?: number
}

export function PulseBubblesLive({
  state = 'live',
  color,
  size = 140,
}: PulseBubblesLiveProps) {
  const { stickers } = useTheme()
  const coral = color ?? stickers.coral

  const ripple1 = useSharedValue(0)
  const ripple2 = useSharedValue(0)
  const ripple3 = useSharedValue(0)
  const heart = useSharedValue(1)

  useEffect(() => {
    if (state !== 'live') {
      cancelAnimation(ripple1)
      cancelAnimation(ripple2)
      cancelAnimation(ripple3)
      cancelAnimation(heart)
      ripple1.value = 0
      ripple2.value = 0
      ripple3.value = 0
      heart.value = 1
      return
    }
    const loop = (sv: SharedValue<number>, delay: number) => {
      sv.value = withDelay(
        delay,
        withRepeat(
          withTiming(1, { duration: 2400, easing: Easing.out(Easing.cubic) }),
          -1,
          false,
        ),
      )
    }
    loop(ripple1, 0)
    loop(ripple2, 800)
    loop(ripple3, 1600)
    heart.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 350, easing: Easing.out(Easing.ease) }),
        withTiming(0.96, { duration: 350, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.04, { duration: 350, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 350, easing: Easing.in(Easing.ease) }),
      ),
      -1,
      false,
    )
    return () => {
      cancelAnimation(ripple1)
      cancelAnimation(ripple2)
      cancelAnimation(ripple3)
      cancelAnimation(heart)
    }
  }, [state])

  const r1 = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(ripple1.value, [0, 1], [0.4, 2.6]) }],
    opacity: interpolate(ripple1.value, [0, 1], [0.9, 0]),
  }))
  const r2 = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(ripple2.value, [0, 1], [0.4, 2.6]) }],
    opacity: interpolate(ripple2.value, [0, 1], [0.9, 0]),
  }))
  const r3 = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(ripple3.value, [0, 1], [0.4, 2.6]) }],
    opacity: interpolate(ripple3.value, [0, 1], [0.9, 0]),
  }))
  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heart.value }],
  }))

  const innerSize = 34
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
      }}
    >
      {[r1, r2, r3].map((st, i) => (
        <Animated.View
          key={i}
          style={[
            {
              position: 'absolute',
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
              backgroundColor: coral,
              opacity: 0.3,
            },
            st,
          ]}
        />
      ))}
      <Animated.View
        style={[
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            backgroundColor: coral,
            alignItems: 'center',
            justifyContent: 'center',
          },
          heartStyle,
        ]}
      >
        <Text style={{ color: '#fff', fontSize: 18 }}>♥</Text>
      </Animated.View>
    </View>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
 * 6. PolarClock24h — 24h clock with activity arc segments
 * Used by: kids · sleep/activity rhythm
 * ────────────────────────────────────────────────────────────────────────── */

export interface ClockSegment {
  /** Start angle 0..360 (0 = midnight top, clockwise) */
  s: number
  /** End angle 0..360 */
  e: number
  color: string
  label?: string
}

interface PolarClock24hProps {
  segments: ClockSegment[]
  size?: number
  centerLabel?: string
  centerSub?: string
}

function polarArc(
  r1: number,
  r2: number,
  start: number,
  end: number,
  cx = 90,
  cy = 90,
) {
  const rad = (d: number) => ((d - 90) * Math.PI) / 180
  const large = end - start > 180 ? 1 : 0
  const p1x = cx + Math.cos(rad(start)) * r2
  const p1y = cy + Math.sin(rad(start)) * r2
  const p2x = cx + Math.cos(rad(end)) * r2
  const p2y = cy + Math.sin(rad(end)) * r2
  const p3x = cx + Math.cos(rad(end)) * r1
  const p3y = cy + Math.sin(rad(end)) * r1
  const p4x = cx + Math.cos(rad(start)) * r1
  const p4y = cy + Math.sin(rad(start)) * r1
  return `M${p1x},${p1y} A${r2},${r2} 0 ${large} 1 ${p2x},${p2y} L${p3x},${p3y} A${r1},${r1} 0 ${large} 0 ${p4x},${p4y} Z`
}

export function PolarClock24h({
  segments,
  size = 180,
  centerLabel,
  centerSub,
}: PolarClock24hProps) {
  const { colors } = useTheme()
  const bloom = useSharedValue(0)
  useEffect(() => {
    bloom.value = 0
    bloom.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) })
  }, [bloom])
  const bloomStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(bloom.value, [0, 1], [0.4, 1]) }],
    opacity: bloom.value,
  }))

  // 24 ticks
  const ticks = Array.from({ length: 24 }).map((_, i) => {
    const a = (i / 24) * Math.PI * 2 - Math.PI / 2
    const r1 = 76
    const r2 = i % 6 === 0 ? 82 : 79
    return {
      x1: 90 + Math.cos(a) * r1,
      y1: 90 + Math.sin(a) * r1,
      x2: 90 + Math.cos(a) * r2,
      y2: 90 + Math.sin(a) * r2,
      strong: i % 6 === 0,
    }
  })

  const labels = [
    { a: 0, t: '12a' },
    { a: 90, t: '6a' },
    { a: 180, t: '12p' },
    { a: 270, t: '6p' },
  ].map((m) => {
    const r = (m.a - 90) * (Math.PI / 180)
    return { x: 90 + Math.cos(r) * 42, y: 90 + Math.sin(r) * 42 + 3, t: m.t }
  })

  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }}>
      <Animated.View style={[StyleSheet.absoluteFill, bloomStyle]}>
        <Svg width={size} height={size} viewBox="0 0 180 180">
          <Circle
            cx="90"
            cy="90"
            r="68"
            fill="none"
            stroke={colors.borderLight}
            strokeWidth={1}
          />
          {segments.map((seg, i) => (
            <Path
              key={i}
              d={polarArc(52, 76, seg.s, seg.e)}
              fill={seg.color}
              stroke={colors.surface}
              strokeWidth={1.5}
            />
          ))}
          {ticks.map((t, i) => (
            <Line
              key={i}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke={colors.textMuted}
              strokeWidth={t.strong ? 1.2 : 0.5}
            />
          ))}
          {labels.map((l, i) => (
            <SvgText
              key={i}
              x={l.x}
              y={l.y}
              textAnchor="middle"
              fontSize="8"
              fill={colors.textMuted}
            >
              {l.t}
            </SvgText>
          ))}
          <Circle
            cx="90"
            cy="90"
            r="18"
            fill={colors.surface}
            stroke={colors.text}
            strokeWidth={1.5}
          />
        </Svg>
      </Animated.View>
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { alignItems: 'center', justifyContent: 'center' },
        ]}
      >
        {centerLabel ? (
          <Text
            style={{
              fontFamily: 'Fraunces_600SemiBold',
              fontSize: 16,
              color: colors.text,
              lineHeight: 18,
            }}
          >
            {centerLabel}
          </Text>
        ) : null}
        {centerSub ? (
          <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 2 }}>
            {centerSub}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
 * 7. MoodStripLollipop — 7 rounded bars with lollipop dots on top
 * Used by: kids · mood week
 * ────────────────────────────────────────────────────────────────────────── */

export interface MoodCell {
  /** 0..1 intensity */
  v: number
  color: string
  /** e.g. 'M' */
  label: string
}

export function MoodStripLollipop({
  data,
  height = 120,
}: {
  data: MoodCell[]
  height?: number
}) {
  const { colors } = useTheme()
  const cols = data.length
  const colW = 200 / cols

  const phase = useSharedValue(0)
  useEffect(() => {
    phase.value = 0
    phase.value = withTiming(1, {
      duration: 520 + cols * 80,
      easing: Easing.out(Easing.cubic),
    })
  }, [cols])

  return (
    <View style={{ height, width: '100%' }}>
      <Svg width="100%" height={height} viewBox="0 0 200 120" preserveAspectRatio="none">
        {data.map((m, i) => {
          const x = i * colW + colW / 2
          const fullH = 4 + m.v * 92
          const start = (i * 80) / (520 + cols * 80)
          const end = (i * 80 + 520) / (520 + cols * 80)
          return (
            <MoodBar
              key={i}
              x={x}
              h={fullH}
              color={m.color}
              phase={phase}
              start={start}
              end={end}
            />
          )
        })}
      </Svg>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          marginTop: -4,
        }}
      >
        {data.map((m, i) => (
          <Text
            key={i}
            style={{
              fontSize: 10,
              color: colors.textMuted,
              fontWeight: '600',
              width: `${100 / cols}%`,
              textAlign: 'center',
            }}
          >
            {m.label}
          </Text>
        ))}
      </View>
    </View>
  )
}

function MoodBar({
  x,
  h,
  color,
  phase,
  start,
  end,
}: {
  x: number
  h: number
  color: string
  phase: SharedValue<number>
  start: number
  end: number
}) {
  const { colors } = useTheme()
  const animatedProps = useAnimatedProps(() => {
    const t = Math.max(0, Math.min(1, (phase.value - start) / Math.max(0.0001, end - start)))
    const eff = h * t
    return {
      y: 100 - eff,
      height: eff,
    } as any
  })
  const cyProps = useAnimatedProps(() => {
    const t = Math.max(0, Math.min(1, (phase.value - start) / Math.max(0.0001, end - start)))
    const eff = h * t
    return { cy: 100 - eff - 4 } as any
  })
  return (
    <G>
      <AnimatedRect
        x={x - 10}
        width={20}
        rx={10}
        fill={color}
        animatedProps={animatedProps}
      />
      <AnimatedCircle
        cx={x}
        r={4}
        fill={colors.surface}
        stroke={colors.text}
        strokeWidth={1.2}
        animatedProps={cyProps}
      />
    </G>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
 * 8. BlockTower — stacking colored blocks representing given vaccines
 * Used by: kids · vaccines done
 * ────────────────────────────────────────────────────────────────────────── */

export interface BlockTowerItem {
  label: string
  color: string
}

export function BlockTower({
  items,
  height = 170,
}: {
  items: BlockTowerItem[]
  height?: number
}) {
  const { colors } = useTheme()
  const n = items.length
  const total = 500 + n * 100

  const phase = useSharedValue(0)
  useEffect(() => {
    phase.value = 0
    phase.value = withTiming(1, { duration: total, easing: Easing.out(Easing.back(2)) })
  }, [n])

  return (
    <View style={{ height, width: '100%' }}>
      <Svg width="100%" height={height} viewBox={`0 0 200 ${height}`}>
        <Line
          x1="10"
          y1={height - 10}
          x2="190"
          y2={height - 10}
          stroke={colors.borderStrong}
          strokeWidth={1}
        />
        {items.map((b, i) => {
          const y = height - 10 - (i + 1) * 20
          const x = 60 + (i % 2 === 0 ? 0 : 4)
          const start = (i * 100) / total
          const end = (i * 100 + 500) / total
          return (
            <BlockTowerRow
              key={i}
              x={x}
              y={y}
              color={b.color}
              label={b.label}
              phase={phase}
              start={start}
              end={end}
            />
          )
        })}
      </Svg>
    </View>
  )
}

function BlockTowerRow({
  x,
  y,
  color,
  label,
  phase,
  start,
  end,
}: {
  x: number
  y: number
  color: string
  label: string
  phase: SharedValue<number>
  start: number
  end: number
}) {
  const { colors } = useTheme()
  const animatedProps = useAnimatedProps(() => {
    const t = Math.max(0, Math.min(1, (phase.value - start) / Math.max(0.0001, end - start)))
    const dy = interpolate(t, [0, 1], [-28, 0])
    return { transform: `translate(${x} ${y + dy})` } as any
  })
  return (
    <AnimatedG animatedProps={animatedProps}>
      <Rect
        x={0}
        y={0}
        width={80}
        height={18}
        rx={4}
        fill={color}
        stroke={colors.text}
        strokeWidth={1.2}
      />
      <Circle cx={6} cy={9} r={2} fill={colors.text} opacity={0.35} />
      <Circle cx={74} cy={9} r={2} fill={colors.text} opacity={0.35} />
      <SvgText
        x={40}
        y={13}
        textAnchor="middle"
        fontSize={10}
        fill={colors.text}
        fontFamily="Fraunces_600SemiBold"
      >
        {label}
      </SvgText>
    </AnimatedG>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
 * 9. RadarWellness — 6-axis polygon with labels
 * Used by: shared analytics / pillar snapshot
 * ────────────────────────────────────────────────────────────────────────── */

interface RadarWellnessProps {
  /** 6 values 0..1 */
  values: number[]
  /** 6 labels */
  labels: string[]
  size?: number
  color?: string
}

export function RadarWellness({
  values,
  labels,
  size = 180,
  color,
}: RadarWellnessProps) {
  const { colors } = useTheme()
  const accent = color ?? colors.primary
  const n = Math.min(6, values.length)
  const cx = 90
  const cy = 90
  const rMax = 60

  const pts = values.slice(0, n).map((v, j) => {
    const a = (j / n) * Math.PI * 2 - Math.PI / 2
    return [
      cx + Math.cos(a) * rMax * Math.max(0, Math.min(1, v)),
      cy + Math.sin(a) * rMax * Math.max(0, Math.min(1, v)),
    ] as const
  })

  const reveal = useSharedValue(0)
  useEffect(() => {
    reveal.value = 0
    reveal.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) })
  }, [reveal])
  const polyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(reveal.value, [0, 1], [0.4, 1]) }],
    opacity: reveal.value,
  }))

  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 180 180">
        {[0.33, 0.66, 1].map((k, i) => (
          <Polygon
            key={i}
            points={Array.from({ length: n })
              .map((_, j) => {
                const a = (j / n) * Math.PI * 2 - Math.PI / 2
                return `${cx + Math.cos(a) * rMax * k},${cy + Math.sin(a) * rMax * k}`
              })
              .join(' ')}
            fill="none"
            stroke={colors.borderLight}
            strokeWidth={i === 2 ? 1.2 : 0.6}
            strokeDasharray={i === 2 ? undefined : '1 2'}
          />
        ))}
        {Array.from({ length: n }).map((_, j) => {
          const a = (j / n) * Math.PI * 2 - Math.PI / 2
          return (
            <Line
              key={j}
              x1={cx}
              y1={cy}
              x2={cx + Math.cos(a) * rMax}
              y2={cy + Math.sin(a) * rMax}
              stroke={colors.borderLight}
              strokeWidth={0.8}
            />
          )
        })}
        {labels.slice(0, n).map((lbl, j) => {
          const a = (j / n) * Math.PI * 2 - Math.PI / 2
          return (
            <SvgText
              key={j}
              x={cx + Math.cos(a) * (rMax + 18)}
              y={cy + Math.sin(a) * (rMax + 18) + 3}
              textAnchor="middle"
              fontSize="9"
              fill={colors.textMuted}
            >
              {lbl}
            </SvgText>
          )
        })}
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, polyStyle]}>
        <Svg width={size} height={size} viewBox="0 0 180 180">
          <Polygon
            points={pts.map(([x, y]) => `${x},${y}`).join(' ')}
            fill={accent}
            fillOpacity={0.25}
            stroke={accent}
            strokeWidth={2.2}
            strokeLinejoin="round"
          />
          {pts.map(([x, y], i) => (
            <Circle
              key={i}
              cx={x}
              cy={y}
              r={3.5}
              fill={colors.surface}
              stroke={colors.text}
              strokeWidth={1.4}
            />
          ))}
        </Svg>
      </Animated.View>
    </View>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
 * 10. Candlesticks — weekly OHLC candles
 * Used by: pregnancy · weight range
 * ────────────────────────────────────────────────────────────────────────── */

export interface Candle {
  o: number
  c: number
  l: number
  h: number
}

export function Candlesticks({
  data,
  height = 120,
  upColor,
  downColor,
}: {
  data: Candle[]
  height?: number
  upColor?: string
  downColor?: string
}) {
  const { colors, stickers } = useTheme()
  const up = upColor ?? stickers.green
  const down = downColor ?? stickers.coral
  const n = data.length
  if (n === 0) return null

  const values = data.flatMap((d) => [d.l, d.h, d.o, d.c])
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(1, max - min)

  const padX = 12
  const colW = (200 - padX * 2) / n

  const totalDur = 520 + n * 60
  const phase = useSharedValue(0)
  useEffect(() => {
    phase.value = 0
    phase.value = withTiming(1, { duration: totalDur, easing: Easing.out(Easing.cubic) })
  }, [n])

  return (
    <View style={{ height, width: '100%' }}>
      <Svg width="100%" height={height} viewBox="0 0 200 100" preserveAspectRatio="none">
        <Line
          x1="4"
          y1="96"
          x2="196"
          y2="96"
          stroke={colors.borderStrong}
          strokeDasharray="2 3"
        />
        {data.map((k, i) => {
          const x = padX + i * colW + (colW - 10) / 2
          const up_ = k.c >= k.o
          const scaleY = (v: number) => 100 - 4 - ((v - min) / span) * 88
          const yHigh = scaleY(k.h)
          const yLow = scaleY(k.l)
          const yTop = scaleY(Math.max(k.o, k.c))
          const yBot = scaleY(Math.min(k.o, k.c))
          const start = (i * 60) / totalDur
          const end = (i * 60 + 520) / totalDur
          return (
            <CandleBar
              key={i}
              x={x}
              yHigh={yHigh}
              yLow={yLow}
              yTop={yTop}
              yBot={yBot}
              color={up_ ? up : down}
              ink={colors.text}
              phase={phase}
              start={start}
              end={end}
            />
          )
        })}
      </Svg>
    </View>
  )
}

function CandleBar({
  x,
  yHigh,
  yLow,
  yTop,
  yBot,
  color,
  ink,
  phase,
  start,
  end,
}: {
  x: number
  yHigh: number
  yLow: number
  yTop: number
  yBot: number
  color: string
  ink: string
  phase: SharedValue<number>
  start: number
  end: number
}) {
  const animatedProps = useAnimatedProps(() => {
    const t = Math.max(0, Math.min(1, (phase.value - start) / Math.max(0.0001, end - start)))
    return {
      opacity: t,
      transform: `translate(0 ${(1 - t) * 6})`,
    } as any
  })
  return (
    <AnimatedG animatedProps={animatedProps}>
      <Line
        x1={x + 5}
        y1={yHigh}
        x2={x + 5}
        y2={yLow}
        stroke={ink}
        strokeWidth={1}
        strokeLinecap="round"
      />
      <Rect
        x={x}
        y={yTop}
        width={10}
        height={Math.max(2, yBot - yTop)}
        rx={2}
        fill={color}
        stroke={ink}
        strokeWidth={1}
      />
    </AnimatedG>
  )
}
