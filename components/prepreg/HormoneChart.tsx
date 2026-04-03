import { View, Text, StyleSheet } from 'react-native'
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line } from 'react-native-svg'
import { Ionicons } from '@expo/vector-icons'
import { useAppTheme } from '../ui/ThemeProvider'
import { GlassCard } from '../ui/GlassCard'
import { THEME_COLORS, borderRadius } from '../../constants/theme'
import type { CycleInfo } from '../../lib/cycleLogic'

interface HormoneChartProps {
  cycleInfo: CycleInfo
}

export function HormoneChart({ cycleInfo }: HormoneChartProps) {
  const { colors: tc } = useAppTheme()
  const progress = cycleInfo.cycleProgress

  // SVG wave representing estrogen levels across cycle
  // Peak at ovulation (~day 14)
  const markerX = progress * 360 + 20

  return (
    <GlassCard>
      <View style={styles.header}>
        <Ionicons name="pulse" size={16} color="#B983FF" />
        <Text style={[styles.title, { color: tc.text }]}>HORMONE RHYTHM</Text>
      </View>

      <View style={styles.chartContainer}>
        <Svg width="100%" height={100} viewBox="0 0 400 100">
          <Defs>
            <LinearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={THEME_COLORS.pink} stopOpacity={1} />
              <Stop offset="30%" stopColor="#F4FD50" stopOpacity={1} />
              <Stop offset="55%" stopColor={THEME_COLORS.green} stopOpacity={1} />
              <Stop offset="100%" stopColor="#B983FF" stopOpacity={1} />
            </LinearGradient>
          </Defs>

          {/* Estrogen wave */}
          <Path
            d="M0,80 C50,80 80,15 150,15 C220,15 250,65 300,65 C350,65 380,30 400,30"
            fill="none"
            stroke="url(#waveGrad)"
            strokeWidth={3.5}
            strokeLinecap="round"
          />

          {/* Progesterone wave (subtle dashed) */}
          <Path
            d="M0,70 C80,70 120,75 200,75 C280,75 320,20 400,20"
            fill="none"
            stroke="white"
            strokeOpacity={0.1}
            strokeWidth={2}
            strokeDasharray="4,4"
          />

          {/* Today marker */}
          {cycleInfo.cycleDay > 0 && (
            <>
              <Line
                x1={markerX} y1={0} x2={markerX} y2={100}
                stroke={cycleInfo.phaseColor}
                strokeWidth={1}
                strokeDasharray="4,4"
                opacity={0.5}
              />
              <Circle cx={markerX} cy={30} r={5} fill={cycleInfo.phaseColor} />
            </>
          )}
        </Svg>
      </View>

      {/* Phase pills */}
      <View style={styles.phasePills}>
        <View style={[
          styles.pill,
          cycleInfo.phase === 'follicular' && { backgroundColor: 'rgba(244,253,80,0.15)', borderColor: 'rgba(244,253,80,0.3)' },
        ]}>
          <Text style={[
            styles.pillText,
            { color: tc.textTertiary },
            cycleInfo.phase === 'follicular' && { color: '#F4FD50' },
          ]}>FOLLICULAR</Text>
        </View>
        <View style={[
          styles.pill,
          cycleInfo.phase === 'ovulation' && { backgroundColor: 'rgba(162,255,134,0.15)', borderColor: 'rgba(162,255,134,0.3)' },
        ]}>
          <Text style={[
            styles.pillText,
            { color: tc.textTertiary },
            cycleInfo.phase === 'ovulation' && { color: THEME_COLORS.green },
          ]}>OVULATION</Text>
        </View>
        <View style={[
          styles.pill,
          cycleInfo.phase === 'luteal' && { backgroundColor: 'rgba(185,131,255,0.15)', borderColor: 'rgba(185,131,255,0.3)' },
        ]}>
          <Text style={[
            styles.pillText,
            { color: tc.textTertiary },
            cycleInfo.phase === 'luteal' && { color: '#B983FF' },
          ]}>LUTEAL</Text>
        </View>
      </View>
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  chartContainer: {
    marginBottom: 16,
  },

  phasePills: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  pillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
})
