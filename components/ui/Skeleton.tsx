/**
 * Skeleton — the one loading look for the site style.
 *
 * Soft shapes in the shape of the content that's coming, pulsing gently. Use these
 * instead of "Loading…" text, a spinner on an empty page, or — worst — provisional
 * data that later jumps (a fake cycle day, "Tap to log" on a tile that has logs).
 * Reduce Motion → static shapes, no pulse.
 */
import { useEffect, useRef } from 'react'
import { AccessibilityInfo, Animated, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '../../constants/theme'

function usePulse() {
  const v = useRef(new Animated.Value(1)).current
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null
    let cancelled = false
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled || reduce) return
      loop = Animated.loop(Animated.sequence([
        Animated.timing(v, { toValue: 0.45, duration: 700, useNativeDriver: true }),
        Animated.timing(v, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]))
      loop.start()
    })
    return () => { cancelled = true; loop?.stop() }
  }, [v])
  return v
}

/** A single pulsing block. */
export function Skeleton({ width = '100%', height = 16, radius = 10, style }: { width?: DimensionValue; height?: DimensionValue; radius?: number; style?: StyleProp<ViewStyle> }) {
  const { colors, isDark } = useTheme()
  const opacity = usePulse()
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: radius, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border, opacity }, style]}
    />
  )
}

/** A few text lines — last one shorter. */
export function SkeletonLines({ lines = 3, gap = 8, style }: { lines?: number; gap?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ gap }, style]}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height={12} width={i === lines - 1 ? '60%' : '100%'} radius={6} />
      ))}
    </View>
  )
}

/** Ghost bar chart. */
export function SkeletonBars({ bars = 7, height = 120, style }: { bars?: number; height?: number; style?: StyleProp<ViewStyle> }) {
  const shape = [0.6, 0.85, 0.5, 0.75, 0.65, 0.9, 0.55, 0.7, 0.8, 0.6]
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height }, style]}>
      {Array.from({ length: bars }, (_, i) => (
        <Skeleton key={i} height={height * shape[i % shape.length]} radius={8} style={{ flex: 1 }} width={undefined} />
      ))}
    </View>
  )
}

/** Ghost ring (cycle wheel, wellness ring, menopause ring). */
export function SkeletonRing({ size = 240, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  const { colors, isDark } = useTheme()
  const opacity = usePulse()
  const stroke = isDark ? 'rgba(255,255,255,0.08)' : colors.border
  return (
    <Animated.View style={[{ width: size, height: size, borderRadius: size / 2, borderWidth: size * 0.09, borderColor: stroke, opacity, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }, style]}>
      <View style={{ width: size * 0.3, height: size * 0.18, borderRadius: 10, backgroundColor: stroke }} />
    </Animated.View>
  )
}

/** Ghost list row: disc + two lines. */
export function SkeletonRow({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }, style]}>
      <Skeleton width={36} height={36} radius={18} />
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton height={13} width="55%" radius={6} />
        <Skeleton height={11} width="80%" radius={6} />
      </View>
    </View>
  )
}

/** A whole page placeholder: title block, a hero, a chart, a few rows. */
export function SkeletonPage({ hero = 'ring', style }: { hero?: 'ring' | 'bars' | 'block'; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ paddingHorizontal: 20, paddingTop: 12, gap: 22 }, style]}>
      <View style={{ gap: 10 }}>
        <Skeleton height={28} width="70%" radius={8} />
        <Skeleton height={12} width="35%" radius={6} />
      </View>
      {hero === 'ring' ? <SkeletonRing size={220} /> : hero === 'bars' ? <SkeletonBars /> : <Skeleton height={160} radius={22} />}
      <View>
        <SkeletonRow /><SkeletonRow /><SkeletonRow />
      </View>
    </View>
  )
}
