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
import { useTheme, font, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../../constants/theme'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
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
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()

  // Under Diffuse the whole chart is recolored to muted mode tokens: the P50
  // line + the child's dots carry the accent; all other bands, grid, and axis
  // labels fall to hairlines / ink-3. No sticker fills.
  const dAccent = getDiffuseAccent('kids', isDark)

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
      <View style={[
        styles.card,
        diffuse
          ? { backgroundColor: dt.colors.surface, borderColor: dt.colors.line, borderWidth: 1 }
          : { backgroundColor: colors.surface, borderColor: colors.border },
      ]}>
        <Text style={[styles.title, { color: diffuse ? dt.colors.ink : colors.text }, diffuse && { fontFamily: diffuseFont.display, fontSize: 17 }]}>{title}</Text>
        <Text style={[styles.empty, { color: diffuse ? dt.colors.ink3 : colors.textMuted }, diffuse && { fontFamily: diffuseFont.body, fontStyle: 'normal' }]}>
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

  // Diffuse chart palette — muted mode tokens over the sticker fills.
  const bandLine = diffuse ? dt.colors.ink3 : BAND_LINE
  const bandP3P15 = diffuse ? dAccent : BAND_FILL_P3_P15
  const bandP15P85 = diffuse ? dAccent : BAND_FILL_P15_P85
  const bandP85P97 = diffuse ? dAccent : BAND_FILL_P85_P97
  const axisLabelColor = diffuse ? dt.colors.ink3 : (isDark ? colors.textMuted : '#6E6763')
  const pointFill = diffuse ? dAccent : POINT_FILL
  const pointStroke = diffuse ? dt.colors.bg : POINT_STROKE

  return (
    <View style={[
      styles.card,
      diffuse
        ? { backgroundColor: dt.colors.surface, borderColor: dt.colors.line, borderWidth: 1 }
        : { backgroundColor: colors.surface, borderColor: colors.border },
    ]}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: diffuse ? dt.colors.ink : colors.text }, diffuse && { fontFamily: diffuseFont.display, fontSize: 17, letterSpacing: -0.3 }]}>{title}</Text>
        {latestPct !== null ? (
          <View style={[styles.pctChip, { borderColor: diffuse ? dt.colors.line2 : (isDark ? colors.border : 'rgba(20,19,19,0.12)') }]}>
            <Text style={[styles.pctChipText, { color: diffuse ? dt.colors.ink3 : colors.text }, diffuse && { fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }]}>
              {t('growthChart_pctChipLabel', { name: childName ? `${childName} · ` : '', pct: latestPct })}
            </Text>
          </View>
        ) : null}
      </View>

      <Svg width={width} height={totalH}>
        {/* Filled band regions — Diffuse: very low-opacity accent wash */}
        <Path d={buildArea('p3', 'p15')} fill={bandP3P15} opacity={diffuse ? (isDark ? 0.05 : 0.06) : 0.7} />
        <Path d={buildArea('p15', 'p85')} fill={bandP15P85} opacity={diffuse ? (isDark ? 0.1 : 0.1) : 1} />
        <Path d={buildArea('p85', 'p97')} fill={bandP85P97} opacity={diffuse ? (isDark ? 0.05 : 0.06) : 1} />

        {/* Percentile lines — Diffuse: hairline ink-3, P50 = accent */}
        {(['p3', 'p15', 'p50', 'p85', 'p97'] as const).map((k) => (
          <Path
            key={k}
            d={buildPath(k)}
            stroke={diffuse ? (k === 'p50' ? dAccent : bandLine) : BAND_LINE}
            strokeWidth={k === 'p50' ? 1.5 : diffuse ? 0.75 : 0.6}
            strokeOpacity={diffuse ? (k === 'p50' ? 0.9 : 0.22) : (k === 'p50' ? 0.4 : 0.18)}
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
              stroke={bandLine}
              strokeOpacity={diffuse ? 0.3 : 0.4}
            />
            <SvgText
              x={xFor(m)}
              y={padTop + chartH + 18}
              fontSize={diffuse ? 9 : 10}
              fontFamily={diffuse ? diffuseFont.mono : undefined}
              fill={axisLabelColor}
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
            fontSize={diffuse ? 9 : 10}
            fontFamily={diffuse ? diffuseFont.mono : undefined}
            fill={axisLabelColor}
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
              r={diffuse ? 4 : 5}
              fill={pointFill}
              stroke={pointStroke}
              strokeWidth={2}
            />
          )
        })}
      </Svg>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: diffuse ? dAccent : BAND_FILL_P15_P85, opacity: diffuse ? 0.35 : 1 }]} />
          <Text style={[styles.legendText, { color: diffuse ? dt.colors.ink3 : colors.textMuted }, diffuse && { fontFamily: diffuseFont.mono, letterSpacing: 0.8, textTransform: 'uppercase', fontSize: 9 }]}>{t('growthChart_legendTypical')}</Text>
        </View>
        <Text style={[styles.legendText, { color: diffuse ? dt.colors.ink3 : colors.textMuted }, diffuse && { fontFamily: diffuseFont.mono, letterSpacing: 0.8, textTransform: 'uppercase', fontSize: 9 }]}>
          {sortedPoints.length === 1
            ? t('growthChart_measurementOne', { count: sortedPoints.length, unit: valueUnit })
            : t('growthChart_measurementMany', { count: sortedPoints.length, unit: valueUnit })}
        </Text>
      </View>

      <Text style={[styles.disclaimer, { color: diffuse ? dt.colors.ink3 : colors.textMuted }, diffuse && { fontFamily: diffuseFont.body, fontStyle: 'normal' }]}>
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
