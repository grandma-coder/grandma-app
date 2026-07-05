/**
 * GrowthPercentileChart — overlays a child's logged measurements on the
 * WHO (0–24mo) / CDC (2y+) percentile bands for weight or height.
 *
 * Shows the P3 / P15 / P50 / P85 / P97 bands as soft fills plus the
 * child's own data points. Each measurement gets a percentile estimate
 * via piecewise interpolation between the band lines.
 *
 * Decision-support, not clinical-grade. Source data is the standard
 * tables abbreviated to monthly (0–24mo) and yearly+ (2y+) checkpoints.
 */

import { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, { Path, Circle, Line, Text as SvgText, G } from 'react-native-svg'
import { useTheme, font } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import {
  type Metric,
  type Sex,
  sampleBands,
  rangeFor,
  estimatePercentile,
} from '../../lib/growthStandards'

interface GrowthPoint {
  ageMonths: number
  value: number     // kg for weight, cm for height
  date: string
}

interface Props {
  /** Title shown above the chart (e.g. "Weight-for-age"). */
  title: string
  metric: Metric
  sex: Sex
  childAgeMonths: number
  childName?: string
  /** Logged measurements (any order). Plotted as dots on the chart. */
  points: GrowthPoint[]
  /** Chart width in pixels (height is derived). */
  width: number
}

const BAND_FILL_P3_P15 = '#F2C9C2'   // soft coral
const BAND_FILL_P15_P85 = '#BDD48C40' // soft green band — the "expected" zone
const BAND_FILL_P85_P97 = '#F5D65240'
const BAND_LINE = '#141313'
const POINT_FILL = '#7048B8'
const POINT_STROKE = '#FFFEF8'

export function GrowthPercentileChart({
  title,
  metric,
  sex,
  childAgeMonths,
  childName,
  points,
  width,
}: Props) {
  const { colors, isDark } = useTheme()
  const { t } = useTranslation()

  // Window: 6 months of context on either side of the child's current age,
  // clamped to the table range.
  const window = useMemo(() => {
    const padding = childAgeMonths < 24 ? 6 : Math.max(12, Math.round(childAgeMonths * 0.2))
    const fromMonths = Math.max(0, childAgeMonths - padding)
    const toMonths = Math.min(240, childAgeMonths + padding)
    return { fromMonths, toMonths }
  }, [childAgeMonths])

  const bands = useMemo(
    () => sampleBands(metric, sex, window.fromMonths, window.toMonths, 30),
    [metric, sex, window.fromMonths, window.toMonths],
  )

  const yRange = useMemo(
    () => rangeFor(metric, sex, window.fromMonths, window.toMonths),
    [metric, sex, window.fromMonths, window.toMonths],
  )

  // Compute the most recent point's percentile for the headline.
  const sortedPoints = useMemo(
    () => [...points].sort((a, b) => a.ageMonths - b.ageMonths),
    [points],
  )
  const latest = sortedPoints[sortedPoints.length - 1]
  const latestPct = useMemo(() => {
    if (!latest) return null
    return estimatePercentile(metric, sex, latest.ageMonths, latest.value)
  }, [latest, metric, sex])

  // Guard a zero-width window. childAgeMonths >= 300 (25+ years) collapses
  // fromMonths and toMonths to the same value after clamping, which would
  // divide by zero inside xFor(). Also catches malformed birthDates that
  // produce ages outside the table.
  if (bands.length < 2 || !yRange || window.toMonths <= window.fromMonths) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.empty, { color: colors.textMuted }]}>
          {t('growthChart_noReferenceData')}
        </Text>
      </View>
    )
  }

  // Layout
  const padTop = 18
  const padBottom = 28
  const padLeft = 36
  const padRight = 12
  const chartW = width - padLeft - padRight
  const chartH = 200
  const totalH = chartH + padTop + padBottom

  const xFor = (m: number) =>
    padLeft + ((m - window.fromMonths) / (window.toMonths - window.fromMonths)) * chartW
  const yFor = (v: number) =>
    padTop + ((yRange.max - v) / (yRange.max - yRange.min)) * chartH

  // Build the percentile-band paths.
  const buildPath = (key: keyof typeof bands[number]) => {
    return bands.map((b, i) => {
      const x = xFor(b.ageMonths)
      const y = yFor(b[key] as number)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ')
  }

  // Filled regions between adjacent percentiles.
  const buildArea = (lo: keyof typeof bands[number], hi: keyof typeof bands[number]) => {
    const top = bands.map((b, i) => `${i === 0 ? 'M' : 'L'}${xFor(b.ageMonths).toFixed(1)},${yFor(b[hi] as number).toFixed(1)}`).join(' ')
    const bottom = [...bands].reverse().map((b) => `L${xFor(b.ageMonths).toFixed(1)},${yFor(b[lo] as number).toFixed(1)}`).join(' ')
    return `${top} ${bottom} Z`
  }

  // X-axis ticks: ~6 evenly spaced age labels.
  const xTickCount = 6
  const xTicks: number[] = []
  for (let i = 0; i < xTickCount; i++) {
    xTicks.push(window.fromMonths + ((window.toMonths - window.fromMonths) * i) / (xTickCount - 1))
  }

  const labelTick = (m: number) =>
    m < 24 ? `${Math.round(m)}m` : `${(m / 12).toFixed(m % 12 === 0 ? 0 : 1)}y`

  const valueUnit = metric === 'weight' ? 'kg' : 'cm'

  // Y-axis ticks: 4 evenly spaced
  const yTicks: number[] = []
  for (let i = 0; i < 4; i++) {
    yTicks.push(yRange.min + ((yRange.max - yRange.min) * i) / 3)
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {latestPct !== null ? (
          <View style={[styles.pctChip, { borderColor: isDark ? colors.border : 'rgba(20,19,19,0.12)' }]}>
            <Text style={[styles.pctChipText, { color: colors.text }]}>
              {t('growthChart_pctChipLabel', { name: childName ? `${childName} · ` : '', pct: latestPct })}
            </Text>
          </View>
        ) : null}
      </View>

      <Svg width={width} height={totalH}>
        {/* Filled band regions */}
        <Path d={buildArea('p3', 'p15')} fill={BAND_FILL_P3_P15} opacity={0.7} />
        <Path d={buildArea('p15', 'p85')} fill={BAND_FILL_P15_P85} />
        <Path d={buildArea('p85', 'p97')} fill={BAND_FILL_P85_P97} />

        {/* Percentile lines */}
        {(['p3', 'p15', 'p50', 'p85', 'p97'] as const).map((k) => (
          <Path
            key={k}
            d={buildPath(k)}
            stroke={BAND_LINE}
            strokeWidth={k === 'p50' ? 1.5 : 0.6}
            strokeOpacity={k === 'p50' ? 0.4 : 0.18}
            fill="none"
          />
        ))}

        {/* X-axis ticks */}
        {xTicks.map((m, i) => (
          <G key={`x-${i}`}>
            <Line
              x1={xFor(m)}
              x2={xFor(m)}
              y1={padTop + chartH}
              y2={padTop + chartH + 4}
              stroke={BAND_LINE}
              strokeOpacity={0.4}
            />
            <SvgText
              x={xFor(m)}
              y={padTop + chartH + 18}
              fontSize={10}
              fill={isDark ? colors.textMuted : '#6E6763'}
              textAnchor="middle"
            >
              {labelTick(m)}
            </SvgText>
          </G>
        ))}

        {/* Y-axis ticks */}
        {yTicks.map((v, i) => (
          <SvgText
            key={`y-${i}`}
            x={padLeft - 4}
            y={yFor(v) + 3}
            fontSize={10}
            fill={isDark ? colors.textMuted : '#6E6763'}
            textAnchor="end"
          >
            {v.toFixed(metric === 'weight' && v < 10 ? 1 : 0)}
          </SvgText>
        ))}

        {/* Child's measurements */}
        {sortedPoints.map((p, i) => {
          // Skip points outside the chart's x range.
          if (p.ageMonths < window.fromMonths || p.ageMonths > window.toMonths) return null
          // Clamp y to inside the chart so points near the edge still render.
          const yClamped = Math.min(Math.max(yFor(p.value), padTop), padTop + chartH)
          return (
            <Circle
              key={`pt-${i}-${p.date}`}
              cx={xFor(p.ageMonths)}
              cy={yClamped}
              r={5}
              fill={POINT_FILL}
              stroke={POINT_STROKE}
              strokeWidth={2}
            />
          )
        })}
      </Svg>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: BAND_FILL_P15_P85 }]} />
          <Text style={[styles.legendText, { color: colors.textMuted }]}>{t('growthChart_legendTypical')}</Text>
        </View>
        <Text style={[styles.legendText, { color: colors.textMuted }]}>
          {sortedPoints.length === 1
            ? t('growthChart_measurementOne', { count: sortedPoints.length, unit: valueUnit })
            : t('growthChart_measurementMany', { count: sortedPoints.length, unit: valueUnit })}
        </Text>
      </View>

      <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
        {t('growthChart_disclaimer')}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 14,
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontFamily: font.display,
    letterSpacing: -0.2,
  },
  pctChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  pctChipText: {
    fontSize: 12,
    fontFamily: font.bodyBold,
    letterSpacing: 0.3,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 14,
    height: 8,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 10,
    fontFamily: font.bodyMedium,
  },
  empty: {
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 16,
    textAlign: 'center',
  },
  disclaimer: {
    fontSize: 9,
    fontStyle: 'italic',
    letterSpacing: 0.2,
    textAlign: 'center',
    marginTop: 2,
  },
})
