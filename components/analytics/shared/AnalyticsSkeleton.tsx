/**
 * AnalyticsSkeleton — light (site look) loading ghosts for the insights pages.
 *
 * Built from `components/ui/Skeleton` so every insights page loads the same way:
 * shapes where the content is coming, never "—", "Loading…" or an empty-state line
 * that later jumps to real numbers. Diffuse keeps its own loaders.
 */
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '../../../constants/theme'
import { Skeleton, SkeletonBars } from '../../ui/Skeleton'

const HAIR = StyleSheet.hairlineWidth * 2

/** Ghost of a quiet stat row: sticker disc · label + sub lines · value block. */
export function SkeletonStatRow({ first = false, style }: { first?: boolean; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme()
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderTopWidth: first ? 0 : HAIR, borderTopColor: colors.border },
        style,
      ]}
    >
      <Skeleton width={34} height={34} radius={17} />
      <View style={{ flex: 1, gap: 7 }}>
        <Skeleton height={14} width="45%" radius={6} />
        <Skeleton height={11} width="70%" radius={6} />
      </View>
      <Skeleton width={44} height={22} radius={6} />
    </View>
  )
}

/** A stack of ghost stat rows divided by hairlines. */
export function SkeletonStatRows({ count = 4, style }: { count?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style}>
      {Array.from({ length: count }, (_, i) => <SkeletonStatRow key={i} first={i === 0} />)}
    </View>
  )
}

/** Ghost headline: mono eyebrow, one big word/number, one supporting line. */
export function SkeletonHeadline({ big = 40, style }: { big?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ gap: 8 }, style]}>
      <Skeleton height={10} width={110} radius={5} />
      <Skeleton height={big} width="55%" radius={10} />
      <Skeleton height={12} width="75%" radius={6} />
    </View>
  )
}

/** Ghost chart section: eyebrow + title line + bars. */
export function SkeletonChartSection({ bars = 7, height = 110, style }: { bars?: number; height?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ gap: 10 }, style]}>
      <Skeleton height={10} width={120} radius={5} />
      <Skeleton height={16} width="40%" radius={6} />
      <SkeletonBars bars={bars} height={height} style={{ marginTop: 4 }} />
    </View>
  )
}
