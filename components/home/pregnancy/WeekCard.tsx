/**
 * WeekCard — pregnancy week card (v4, matches pregnancy-weeks.html grid layout)
 *
 * Layout (mirrors the HTML's CSS grid):
 *   row 1 | meta   | sizename (right aligned)
 *   row 2 | mega   | stats (spans rows 2+3)
 *   row 3 | stage  | stats (continues)
 *   row 4 | ruler (full width)
 *
 * Background color cycles through 5 palettes (purple, cream, peach, coral, green).
 */

import { View, Text, Pressable, StyleSheet } from 'react-native'
import { WeekRuler } from './WeekRuler'
import { AnimatedFruit } from './AnimatedFruit'
import { getWeekData } from '../../../lib/pregnancyData'
import { getWeekStat, formatWeight } from '../../../lib/weekStats'

function getTrimester(week: number): 1 | 2 | 3 {
  if (week <= 13) return 1
  if (week <= 26) return 2
  return 3
}

const TRI_NAMES = ['FIRST', 'SECOND', 'THIRD'] as const

function parseCm(len: string): number {
  if (!len) return 0
  const trimmed = len.trim().toLowerCase()
  if (trimmed.startsWith('<')) {
    if (trimmed.endsWith('mm')) return 0.05
    if (trimmed.endsWith('cm')) return 0.5
  }
  const num = parseFloat(trimmed)
  if (Number.isNaN(num)) return 0
  if (trimmed.endsWith('mm')) return num / 10
  return num
}

/** Illustration size — proportional to cm, sqrt scaled, capped by the stage column. */
function illustrationSize(cm: number, stageSize: number): number {
  const min = 44
  const max = Math.min(190, stageSize)
  if (cm <= 0) return min
  const t = Math.min(1, Math.sqrt(cm / 51))
  return min + (max - min) * t
}

interface Palette {
  bg: string
  fg: string
  metaFg: string
  dotColor: string
  dotStroke: string
  rulerLine: string
  rulerText: string
}

const PALETTES: Palette[] = [
  { // 0 — deep purple
    bg: '#2A1F4A', fg: '#FFFEF8', metaFg: '#E9DFFF',
    dotColor: '#F5D652', dotStroke: '#FFFEF8',
    rulerLine: 'rgba(255,254,248,0.32)', rulerText: '#FFFEF8',
  },
  { // 1 — cream
    bg: '#FFFEF8', fg: '#141313', metaFg: '#6B5E56',
    dotColor: '#EE4A3C', dotStroke: '#141313',
    rulerLine: 'rgba(20,19,19,0.28)', rulerText: '#141313',
  },
  { // 2 — peach
    bg: '#F5B896', fg: '#141313', metaFg: '#5A3A24',
    dotColor: '#D94A3E', dotStroke: '#141313',
    rulerLine: 'rgba(20,19,19,0.3)', rulerText: '#141313',
  },
  { // 3 — coral
    bg: '#EE7B6D', fg: '#FFFEF8', metaFg: '#FFE6E0',
    dotColor: '#F5D652', dotStroke: '#FFFEF8',
    rulerLine: 'rgba(255,254,248,0.4)', rulerText: '#FFFEF8',
  },
  { // 4 — green
    bg: '#BDD48C', fg: '#141313', metaFg: '#3E5A20',
    dotColor: '#EE4A3C', dotStroke: '#141313',
    rulerLine: 'rgba(20,19,19,0.3)', rulerText: '#141313',
  },
]
function paletteForWeek(week: number): Palette {
  return PALETTES[(week - 1) % PALETTES.length]
}

function articleFor(name: string): 'a' | 'an' {
  return /^[aeiou]/i.test(name.trim()) ? 'an' : 'a'
}

interface WeekCardProps {
  week: number
  daysLabel?: string
  onPress?: () => void
  width: number
}

export function WeekCard({ week, daysLabel, onPress, width }: WeekCardProps) {
  const data = getWeekData(week)
  const stat = getWeekStat(week)
  const pal = paletteForWeek(week)
  const tri = getTrimester(week)
  const cm = stat.cm > 0 ? stat.cm : parseCm(data.babyLength)
  const weekStr = String(week).padStart(2, '0')
  const fruitName = data.babySize.toLowerCase()
  const article = articleFor(fruitName)
  const weightStr = formatWeight(stat.g)
  const lengthStr = `${cm}cm`

  // Computed stage column width for the illustration sizing (roughly half the card minus gutters)
  const stageColWidth = (width - 56) / 2 - 12
  const illSize = illustrationSize(cm, stageColWidth)

  const statBorder = pal.fg + 'E5' // ~90% opacity of fg for tick line

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: pal.bg, width, opacity: pressed ? 0.96 : 1 },
      ]}
    >
      {/* Top row: meta (left) + sizename (right) */}
      <View style={styles.topRow}>
        <Text style={[styles.meta, { color: pal.metaFg }]}>
          WEEK · {TRI_NAMES[tri - 1]} TRIMESTER
        </Text>
        <Text style={[styles.sizeName, { color: pal.fg }]} numberOfLines={1}>
          {article}{' '}
          <Text style={[styles.sizeNameBold, { color: pal.fg }]}>
            {fruitName}
          </Text>
        </Text>
      </View>

      {/* Middle grid: left = mega + stage, right = stats */}
      <View style={styles.middleGrid}>
        <View style={styles.leftCol}>
          <Text style={[styles.mega, { color: pal.fg }]}>{weekStr}</Text>
          <View style={styles.stage}>
            <AnimatedFruit week={week} size={illSize} />
          </View>
        </View>

        <View style={styles.rightCol}>
          <View style={[styles.statCell, { borderTopColor: statBorder }]}>
            <Text style={[styles.statLabel, { color: pal.fg }]}>LENGTH</Text>
            <Text style={[styles.statValue, { color: pal.fg }]}>
              {cm}
              <Text style={[styles.statUnit, { color: pal.fg }]}>cm</Text>
            </Text>
          </View>
          <View style={[styles.statCell, { borderTopColor: statBorder }]}>
            <Text style={[styles.statLabel, { color: pal.fg }]}>WEIGHT</Text>
            <Text style={[styles.statValue, { color: pal.fg }]}>
              {formatWeightValue(stat.g)}
              <Text style={[styles.statUnit, { color: pal.fg }]}>
                {formatWeightUnit(stat.g)}
              </Text>
            </Text>
          </View>
        </View>
      </View>

      {daysLabel && (
        <View style={styles.footer}>
          <Text style={[styles.footerLabel, { color: pal.metaFg }]}>
            {daysLabel.toUpperCase()}
          </Text>
          <Text style={[styles.footerLabel, { color: pal.metaFg }]}>
            TAP FOR DETAILS ›
          </Text>
        </View>
      )}

      {/* Full-width ruler at the bottom */}
      <WeekRuler
        cm={cm}
        dotColor={pal.dotColor}
        lineColor={pal.rulerLine}
        textColor={pal.rulerText}
        dotStroke={pal.dotStroke}
      />
    </Pressable>
  )
}

// Split weight into number + unit so the unit can be styled smaller & italic (like .u in HTML)
function formatWeightValue(g: number | null): string {
  if (g == null) return '<1'
  if (g < 1000) return String(g)
  return (g / 1000).toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}
function formatWeightUnit(g: number | null): string {
  if (g == null || g < 1000) return 'g'
  return 'kg'
}
// keep formatWeight imported but mark as used to avoid unused-import
void formatWeight

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 18,
    minHeight: 440,
    overflow: 'hidden',
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 22,
    elevation: 6,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 2,
  },
  meta: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    flex: 1,
  },
  sizeName: {
    fontFamily: 'Fraunces_500Medium',
    fontSize: 20,
    letterSpacing: -0.3,
    textAlign: 'right',
  },
  sizeNameBold: {
    fontFamily: 'InstrumentSerif_400Regular_Italic',
    fontStyle: 'italic',
    fontWeight: '400',
  },

  middleGrid: {
    flex: 1,
    flexDirection: 'row',
    gap: 20,
    marginTop: 4,
  },
  leftCol: {
    flex: 1,
  },
  rightCol: {
    flex: 1.05,
    justifyContent: 'center',
    gap: 18,
    paddingRight: 4,
  },

  mega: {
    // Matches HTML .mega: Fraunces 800 extra-bold, with subtle emboss shadow
    fontFamily: 'Fraunces_800ExtraBold',
    fontSize: 82,
    fontWeight: '800',
    letterSpacing: -4.5,
    lineHeight: 96,
    marginLeft: -3,
    paddingTop: 8,
    textShadowColor: 'rgba(0,0,0,0.12)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },

  statCell: {
    borderTopWidth: 1.5,
    paddingTop: 10,
    gap: 3,
  },
  statLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 9.5,
    letterSpacing: 2,
    textTransform: 'uppercase',
    opacity: 0.7,
  },
  statValue: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 32,
    letterSpacing: -1,
    lineHeight: 34,
  },
  statUnit: {
    fontFamily: 'InstrumentSerif_400Regular_Italic',
    fontStyle: 'italic',
    fontSize: 14,
    opacity: 0.75,
    fontWeight: '400',
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  footerLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
})
