import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAppTheme } from '../ui/ThemeProvider'
import { THEME_COLORS, borderRadius } from '../../constants/theme'
import type { CycleInfo } from '../../lib/cycleLogic'

interface CyclePhaseRingProps {
  cycleInfo: CycleInfo
  onEditPeriod?: () => void
  onAddPeriod?: () => void
}

// Phase colors for the 28 ring dots
function getDotColor(day: number, info: CycleInfo): string {
  if (day <= info.periodLength) return THEME_COLORS.pink    // Menstruation
  if (day < info.fertileStart) return '#F4FD50'             // Follicular (yellow)
  if (day >= info.fertileStart && day <= info.fertileEnd) return THEME_COLORS.green // Ovulation/Fertile
  return '#B983FF'                                           // Luteal (purple)
}

const RING_RADIUS = 105
const DOT_SIZE = 8

export function CyclePhaseRing({ cycleInfo, onEditPeriod, onAddPeriod }: CyclePhaseRingProps) {
  const { colors: tc } = useAppTheme()
  const { cycleDay, phaseLabel, phaseColor, daysUntilPeriod, cycleLength } = cycleInfo
  const showData = cycleDay > 0

  // Generate 28 dots positioned in a circle
  const dots = Array.from({ length: cycleLength }, (_, i) => {
    const day = i + 1
    const angle = (i / cycleLength) * 2 * Math.PI - Math.PI / 2 // start at top
    const x = Math.cos(angle) * RING_RADIUS
    const y = Math.sin(angle) * RING_RADIUS
    const isToday = day === cycleDay
    const color = getDotColor(day, cycleInfo)
    return { day, x, y, isToday, color }
  })

  return (
    <View style={styles.container}>
      {/* Ring container */}
      <View style={styles.ringWrapper}>
        {/* Render 28 dots */}
        {dots.map((dot) => (
          <View
            key={dot.day}
            style={[
              styles.dot,
              {
                backgroundColor: dot.color,
                width: dot.isToday ? 14 : DOT_SIZE,
                height: dot.isToday ? 14 : DOT_SIZE,
                borderRadius: dot.isToday ? 7 : DOT_SIZE / 2,
                left: 120 + dot.x - (dot.isToday ? 7 : DOT_SIZE / 2),
                top: 120 + dot.y - (dot.isToday ? 7 : DOT_SIZE / 2),
                opacity: dot.isToday ? 1 : 0.7,
              },
              dot.isToday && {
                borderWidth: 2,
                borderColor: 'rgba(255,255,255,0.6)',
                shadowColor: dot.color,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 8,
              },
            ]}
          />
        ))}

        {/* Center content */}
        <View style={styles.center}>
          {showData ? (
            <>
              <Text style={[styles.periodLabel, { color: tc.textTertiary }]}>
                PERIOD IN
              </Text>
              <View style={styles.countdownRow}>
                <Text style={styles.countdownNumber}>{daysUntilPeriod}</Text>
                <Text style={styles.countdownUnit}>days</Text>
              </View>
              <Pressable
                onPress={onAddPeriod}
                style={({ pressed }) => [
                  styles.addPeriodBtn,
                  pressed && { transform: [{ scale: 0.95 }] },
                ]}
              >
                <Text style={styles.addPeriodText}>Add Period</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Ionicons name="flower-outline" size={48} color={THEME_COLORS.pink} style={{ opacity: 0.6 }} />
              <Text style={[styles.noDataTitle, { color: tc.text }]}>Start Tracking</Text>
              <Pressable
                onPress={onAddPeriod}
                style={({ pressed }) => [
                  styles.addPeriodBtn,
                  pressed && { transform: [{ scale: 0.95 }] },
                ]}
              >
                <Text style={styles.addPeriodText}>Add Period</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>

      {/* Phase legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: THEME_COLORS.pink }]} />
          <Text style={[styles.legendText, { color: tc.textTertiary }]}>Period</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#F4FD50' }]} />
          <Text style={[styles.legendText, { color: tc.textTertiary }]}>Follicular</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: THEME_COLORS.green }]} />
          <Text style={[styles.legendText, { color: tc.textTertiary }]}>Ovulation</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#B983FF' }]} />
          <Text style={[styles.legendText, { color: tc.textTertiary }]}>Luteal</Text>
        </View>
      </View>

      {/* Edit period link */}
      {showData && onEditPeriod && (
        <Pressable onPress={onEditPeriod} style={styles.editButton}>
          <Text style={styles.editButtonText}>Edit period dates</Text>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 16,
  },

  ringWrapper: {
    width: 240,
    height: 240,
    position: 'relative',
  },

  dot: {
    position: 'absolute',
  },

  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  periodLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  countdownNumber: {
    fontSize: 56,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -2,
  },
  countdownUnit: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    marginLeft: 4,
  },

  addPeriodBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: THEME_COLORS.pink,
    borderRadius: borderRadius.full,
    shadowColor: THEME_COLORS.pink,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
  },
  addPeriodText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1A1030',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  noDataTitle: {
    fontSize: 18,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 12,
  },

  legendRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  editButton: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME_COLORS.pink,
  },
})
