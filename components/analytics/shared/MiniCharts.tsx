/**
 * MiniCharts — bar & line chart variants used inside BigChartCard.
 * Paper-native SVG, no legends. Single color with accent on latest point.
 */

import { View, Text, StyleSheet, Dimensions } from 'react-native'
import Svg, { Path, Circle } from 'react-native-svg'
import { useTheme } from '../../../constants/theme'

const DEFAULT_CHART_W = Dimensions.get('window').width - 76

interface BarProps {
  /** Values (numeric). Empty → placeholder. */
  data: number[]
  /** Labels below each bar. Same length as data. */
  labels?: string[]
  /** Fill color (defaults to accent). */
  color?: string
  /** Paint latest bar in a bolder variant. */
  highlightLast?: boolean
  height?: number
}

export function MiniBarChart({
  data,
  labels = [],
  color,
  highlightLast = true,
  height = 130,
}: BarProps) {
  const { colors, stickers, font } = useTheme()
  const accent = color ?? stickers.yellow
  const softAccent = color ? color + '66' : stickers.yellowSoft

  if (data.length === 0) {
    return <EmptyChart height={height} />
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = Math.max(1, max - min)
  const barHeightFor = (v: number) => {
    const normalized = (v - min) / range
    return 20 + normalized * (height - 40) // keep a minimum bar height
  }

  return (
    <View style={[styles.barWrap, { height: height + 18 }]}>
      <View style={[styles.barRow, { height }]}>
        {data.map((v, i) => {
          const isLast = i === data.length - 1 && highlightLast
          return (
            <View key={i} style={styles.barCell}>
              <View
                style={[
                  styles.bar,
                  {
                    height: barHeightFor(v),
                    backgroundColor: isLast ? accent : softAccent,
                    borderColor: colors.border,
                  },
                ]}
              />
            </View>
          )
        })}
      </View>
      {labels.length > 0 && (
        <View style={styles.labelRow}>
          {labels.map((l, i) => (
            <Text
              key={i}
              style={[
                styles.barLabel,
                { color: colors.textMuted, fontFamily: font.body },
              ]}
              numberOfLines={1}
            >
              {l}
            </Text>
          ))}
        </View>
      )}
    </View>
  )
}

interface LineProps {
  data: number[]
  color?: string
  height?: number
  /** Width override — defaults to 100% of parent. */
  width?: number
}

export function MiniLineChart({ data, color, height = 130, width = DEFAULT_CHART_W }: LineProps) {
  const { colors, stickers } = useTheme()
  const accent = color ?? stickers.yellow

  if (data.length < 2) {
    return <EmptyChart height={height} />
  }

  const pad = 10
  const viewW = width
  const viewH = height

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = Math.max(0.01, max - min)

  const points = data.map((v, i) => {
    const x = pad + (i * (viewW - pad * 2)) / (data.length - 1)
    const y = viewH - pad - ((v - min) / range) * (viewH - pad * 2)
    return { x, y }
  })

  // Smooth path
  const smooth = (() => {
    let d = `M${points[0].x},${points[0].y}`
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]
      const cur = points[i]
      const mx = (prev.x + cur.x) / 2
      d += ` Q${mx},${prev.y} ${cur.x},${cur.y}`
    }
    return d
  })()

  // Area below
  const area = `${smooth} L${points[points.length - 1].x},${viewH - pad} L${points[0].x},${viewH - pad} Z`

  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <Svg width={viewW} height={viewH}>
        <Path d={area} fill={accent} opacity={0.18} />
        <Path d={smooth} stroke={accent} strokeWidth={3} strokeLinecap="round" fill="none" />
        {points.map((p, i) => {
          const isLast = i === points.length - 1
          return (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={isLast ? 5 : 3}
              fill={isLast ? colors.text : accent}
              stroke={colors.surface}
              strokeWidth={1.5}
            />
          )
        })}
      </Svg>
    </View>
  )
}

function EmptyChart({ height }: { height: number }) {
  const { colors, font } = useTheme()
  return (
    <View style={[styles.empty, { height, borderColor: colors.borderLight }]}>
      <Text
        style={{
          color: colors.textMuted,
          fontFamily: font.body,
          fontSize: 12,
        }}
      >
        Not enough data yet.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  barWrap: {
    justifyContent: 'flex-end',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  barCell: {
    flex: 1,
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    borderRadius: 10,
    borderWidth: 1,
  },
  labelRow: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 8,
  },
  barLabel: {
    flex: 1,
    fontSize: 10,
    textAlign: 'center',
  },
  empty: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
  },
})
