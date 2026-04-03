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

// matches HTML: .relative.w-[210px].h-[210px] with transform-origin 0 100px
const RING_SIZE = 210
const RING_RADIUS = 100 // matches HTML transform-origin: 0 100px
const DOT_SIZE = 8

export function CyclePhaseRing({ cycleInfo, onEditPeriod, onAddPeriod }: CyclePhaseRingProps) {
  const { colors: tc } = useAppTheme()
  const { cycleDay, phaseLabel, phaseColor, daysUntilPeriod, cycleLength } = cycleInfo
  const showData = cycleDay > 0
  const center = RING_SIZE / 2

  // Generate 28 dots positioned in a circle (matches HTML rotation pattern)
  const dots = Array.from({ length: cycleLength }, (_, i) => {
    const day = i + 1
    // HTML uses rotate(0deg) to rotate(347.1deg), which is i * (360/28)
    const angleDeg = i * (360 / cycleLength)
    const angleRad = (angleDeg - 90) * (Math.PI / 180) // -90 to start at top
    const x = Math.cos(angleRad) * RING_RADIUS
    const y = Math.sin(angleRad) * RING_RADIUS
    const isToday = day === cycleDay
    const color = getDotColor(day, cycleInfo)
    return { day, x, y, isToday, color }
  })

  return (
    // matches HTML: .relative.flex.justify-center.items-center.py-10.min-h-[320px]
    <View style={styles.container}>
      {/* Ring wrapper — matches: .relative.w-[210px].h-[210px] */}
      <View style={styles.ringWrapper}>
        {/* Render 28 dots */}
        {dots.map((dot) => {
          const size = dot.isToday ? 12 : DOT_SIZE
          return (
            <View
              key={dot.day}
              style={[
                styles.dot,
                {
                  backgroundColor: dot.color,
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  left: center + dot.x - size / 2,
                  top: center + dot.y - size / 2,
                },
                // matches HTML: today dot has scale-150 ring-2 ring-white/50
                dot.isToday && {
                  borderWidth: 2,
                  borderColor: 'rgba(255,255,255,0.5)',
                  shadowColor: dot.color,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8,
                  shadowRadius: 8,
                },
              ]}
            />
          )
        })}

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
  // matches HTML: .relative.flex.justify-center.items-center.py-10.min-h-[320px]
  container: {
    alignItems: 'center',
    paddingVertical: 40,
    minHeight: 320,
  },

  // matches HTML: .relative.w-[210px].h-[210px]
  ringWrapper: {
    width: RING_SIZE,
    height: RING_SIZE,
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

  // matches HTML: text-[10px] tracking-[0.3em] font-bold text-white/50 uppercase mb-1
  periodLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  // matches HTML: text-5xl font-display font-bold text-white
  countdownNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // matches HTML: text-lg ml-1
  countdownUnit: {
    fontSize: 18,
    fontWeight: '400',
    color: '#FFFFFF',
    marginLeft: 4,
  },

  // matches HTML: px-5 py-2.5 bg-[#FF8AD8] text-[#1A1030] rounded-full text-xs font-bold uppercase tracking-wider neon-shadow-pink
  addPeriodBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FF8AD8',
    borderRadius: 999,
    shadowColor: '#FF8AD8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
  },
  addPeriodText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1030',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
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
