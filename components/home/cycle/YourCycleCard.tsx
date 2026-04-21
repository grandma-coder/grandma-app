/**
 * YourCycleCard — hero card on the cycle home screen.
 *
 * Left: SVG semicircular ring showing cycle progress, with "DAY X of Y" centered.
 * Right: phase label ("You're in Fertile window"), status line.
 * Decorative pink blob sticker top-right corner.
 */

import { View, StyleSheet } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { useTheme } from '../../../constants/theme'
import { Display, DisplayItalic, Body, MonoCaps } from '../../ui/Typography'
import { Blob } from '../../ui/Stickers'

interface Props {
  cycleDay: number            // 1-28 (or so)
  cycleLength: number         // 28 default
  phaseLabel: string          // "Fertile", "Menstruation", etc.
  isFertile: boolean
  statusLine: string          // "Peak today. 5 days to log." or phase description
}

const RING_SIZE = 120
const RING_STROKE = 10
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2

export function YourCycleCard({
  cycleDay,
  cycleLength,
  phaseLabel,
  isFertile,
  statusLine,
}: Props) {
  const { colors, stickers, isDark } = useTheme()

  const ink = isDark ? colors.text : '#141313'
  const cardBg = isDark ? colors.surfaceRaised : '#3A2438'  // plum for light mode hero
  const cardInk = '#FFFEF8'  // cream-white text on the plum card
  const cardMuted = 'rgba(255, 254, 248, 0.65)'

  // Semicircle progress (bottom half of circle)
  const progress = Math.min(1, Math.max(0, cycleDay / Math.max(1, cycleLength)))
  // Arc from 180° (left) through 0° (right) — bottom half
  // Use stroke-dasharray approach on a full circle, then rotate to expose bottom half
  const circumference = 2 * Math.PI * RING_RADIUS
  const half = circumference / 2

  const ringColor = stickers.pink

  return (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      {/* Blob top-right */}
      <View style={styles.blob} pointerEvents="none">
        <Blob size={110} fill={stickers.pinkSoft} variant={0} stroke={ink} />
      </View>

      <View style={styles.row}>
        {/* Left: ring with day number */}
        <View style={[styles.ringWrap, { width: RING_SIZE, height: RING_SIZE }]}>
          <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFillObject}>
            {/* bg track — bottom semicircle */}
            <Path
              d={`M ${RING_STROKE / 2} ${RING_SIZE / 2} A ${RING_RADIUS} ${RING_RADIUS} 0 0 0 ${RING_SIZE - RING_STROKE / 2} ${RING_SIZE / 2}`}
              stroke={'rgba(255,254,248,0.14)'}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              fill="none"
            />
            {/* progress — bottom semicircle partial */}
            <Path
              d={`M ${RING_STROKE / 2} ${RING_SIZE / 2} A ${RING_RADIUS} ${RING_RADIUS} 0 0 0 ${RING_SIZE - RING_STROKE / 2} ${RING_SIZE / 2}`}
              stroke={ringColor}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${half * progress} ${circumference}`}
              strokeDashoffset={0}
            />
          </Svg>
          <View style={styles.ringInner}>
            <MonoCaps size={10} color={cardMuted}>DAY</MonoCaps>
            <Display size={36} color={cardInk}>{cycleDay}</Display>
            <Body size={11} color={cardMuted}>of {cycleLength}</Body>
          </View>
        </View>

        {/* Right: phase label + status */}
        <View style={styles.textCol}>
          <Body size={14} color={cardMuted}>You're in</Body>
          <View style={styles.phaseRow}>
            <Display size={28} color={cardInk}>{phaseLabel}</Display>
            {isFertile && <DisplayItalic size={22} color={cardInk}> window</DisplayItalic>}
          </View>
          <Body size={13} color={cardMuted} style={{ marginTop: 10 }}>{statusLine}</Body>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 6,
    borderRadius: 28,
    padding: 20,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 180,
  },
  blob: {
    position: 'absolute',
    top: -20,
    right: -20,
    opacity: 0.9,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ringWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  textCol: {
    flex: 1,
  },
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
})
