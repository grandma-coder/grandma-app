/**
 * CyclePhaseRing — the 28-day cycle dot ring with center countdown.
 *
 * Phase colors map to brand.phase tokens (menstrual / follicular / ovulation /
 * luteal). Today's dot pulses via CycleTodayPulse. Everything is token-driven
 * so the ring reads correctly in both light and dark mode.
 */

import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, radius } from '../../constants/theme'
import { CycleTodayPulse } from '../charts/GalleryCharts'
import type { CycleInfo } from '../../lib/cycleLogic'

interface CyclePhaseRingProps {
  cycleInfo: CycleInfo
  onEditPeriod?: () => void
  onAddPeriod?: () => void
}

const RING_SIZE = 210
const RING_RADIUS = 100
const DOT_SIZE = 8

export function CyclePhaseRing({ cycleInfo, onEditPeriod, onAddPeriod }: CyclePhaseRingProps) {
  const { colors, brand, font } = useTheme()
  const { cycleDay, daysUntilPeriod, cycleLength } = cycleInfo
  const showData = cycleDay > 0
  const center = RING_SIZE / 2

  // Phase colors come from the design system (brand.phase.*)
  const getDotColor = (day: number): string => {
    if (day <= cycleInfo.periodLength) return brand.phase.menstrual
    if (day < cycleInfo.fertileStart) return brand.phase.follicular
    if (day >= cycleInfo.fertileStart && day <= cycleInfo.fertileEnd) return brand.phase.ovulation
    return brand.phase.luteal
  }

  const dots = Array.from({ length: cycleLength }, (_, i) => {
    const day = i + 1
    const angleDeg = i * (360 / cycleLength)
    const angleRad = (angleDeg - 90) * (Math.PI / 180)
    const x = Math.cos(angleRad) * RING_RADIUS
    const y = Math.sin(angleRad) * RING_RADIUS
    const isToday = day === cycleDay
    const color = getDotColor(day)
    return { day, x, y, isToday, color }
  })

  return (
    <View style={styles.container}>
      <View style={styles.ringWrapper}>
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
                dot.isToday && {
                  borderWidth: 2,
                  borderColor: colors.borderStrong,
                  shadowColor: dot.color,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.5,
                  shadowRadius: 6,
                },
              ]}
            />
          )
        })}

        {(() => {
          const today = dots.find((d) => d.isToday)
          if (!today) return null
          return (
            <CycleTodayPulse
              x={center + today.x}
              y={center + today.y}
              color={today.color}
              r={6}
            />
          )
        })()}

        <View style={styles.center}>
          {showData ? (
            <>
              <Text style={[styles.periodLabel, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
                PERIOD IN
              </Text>
              <View style={styles.countdownRow}>
                <Text style={[styles.countdownNumber, { color: colors.text, fontFamily: font.display }]}>
                  {daysUntilPeriod}
                </Text>
                <Text style={[styles.countdownUnit, { color: colors.textSecondary, fontFamily: font.body }]}>
                  days
                </Text>
              </View>
              <Pressable
                onPress={onAddPeriod}
                style={({ pressed }) => [
                  styles.addPeriodBtn,
                  {
                    backgroundColor: brand.prePregnancy,
                    borderColor: colors.text,
                  },
                  pressed && { transform: [{ translateY: 2 }] },
                ]}
              >
                <Text style={[styles.addPeriodText, { color: colors.text, fontFamily: font.bodySemiBold }]}>
                  Add Period
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Ionicons name="flower-outline" size={48} color={brand.prePregnancy} style={{ opacity: 0.6 }} />
              <Text style={[styles.noDataTitle, { color: colors.text, fontFamily: font.display }]}>
                Start Tracking
              </Text>
              <Pressable
                onPress={onAddPeriod}
                style={({ pressed }) => [
                  styles.addPeriodBtn,
                  {
                    backgroundColor: brand.prePregnancy,
                    borderColor: colors.text,
                  },
                  pressed && { transform: [{ translateY: 2 }] },
                ]}
              >
                <Text style={[styles.addPeriodText, { color: colors.text, fontFamily: font.bodySemiBold }]}>
                  Add Period
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </View>

      {/* Phase legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: brand.phase.menstrual }]} />
          <Text style={[styles.legendText, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>Period</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: brand.phase.follicular }]} />
          <Text style={[styles.legendText, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>Follicular</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: brand.phase.ovulation }]} />
          <Text style={[styles.legendText, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>Ovulation</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: brand.phase.luteal }]} />
          <Text style={[styles.legendText, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>Luteal</Text>
        </View>
      </View>

      {showData && onEditPeriod && (
        <Pressable
          onPress={onEditPeriod}
          style={[
            styles.editButton,
            { borderColor: colors.border },
          ]}
        >
          <Text style={[styles.editButtonText, { color: brand.prePregnancy, fontFamily: font.bodySemiBold }]}>
            Edit period dates
          </Text>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 40,
    minHeight: 320,
  },
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
  periodLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  countdownNumber: {
    fontSize: 48,
    letterSpacing: -0.8,
  },
  countdownUnit: {
    fontSize: 18,
    marginLeft: 4,
  },
  addPeriodBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  addPeriodText: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  noDataTitle: {
    fontSize: 18,
    textTransform: 'uppercase',
    letterSpacing: -0.4,
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
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  editButton: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  editButtonText: {
    fontSize: 12,
  },
})
