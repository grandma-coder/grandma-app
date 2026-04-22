import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { THEME_COLORS } from '../../constants/theme'
import { HormoneWave } from '../charts/GalleryCharts'
import type { CycleInfo } from '../../lib/cycleLogic'

interface HormoneChartProps {
  cycleInfo: CycleInfo
}

export function HormoneChart({ cycleInfo }: HormoneChartProps) {
  const progress = cycleInfo.cycleProgress

  return (
    // matches HTML: .bg-white/5.rounded-[32px].p-6.border.border-white/10.relative.overflow-hidden
    <View style={styles.card}>
      {/* Title — matches: text-sm font-bold tracking-wide uppercase mb-6 flex items-center */}
      <View style={styles.header}>
        <Ionicons name="pulse" size={16} color="#B983FF" />
        <Text style={styles.title}>Hormone Rhythm</Text>
      </View>

      {/* Living hormone wave — scrolling, gradient fill, today marker */}
      <View style={styles.chartWrap}>
        <HormoneWave
          progress={progress}
          color={THEME_COLORS.pink}
          height={120}
          label={cycleInfo.cycleDay > 0 ? `DAY ${cycleInfo.cycleDay}` : undefined}
        />
      </View>

      {/* Phase pills — matches HTML: .flex.flex-wrap.gap-2 */}
      <View style={styles.pills}>
        <View style={[
          styles.pill,
          cycleInfo.phase === 'follicular' && styles.pillActiveYellow,
        ]}>
          <Text style={[
            styles.pillText,
            cycleInfo.phase === 'follicular' && { color: '#F4FD50', fontWeight: '700' },
          ]}>FOLLICULAR</Text>
        </View>
        <View style={[
          styles.pill,
          cycleInfo.phase === 'ovulation' && styles.pillActiveGreen,
        ]}>
          <Text style={[
            styles.pillText,
            cycleInfo.phase === 'ovulation' && { color: '#A2FF86', fontWeight: '700' },
          ]}>OVULATION</Text>
        </View>
        <View style={[
          styles.pill,
          cycleInfo.phase === 'luteal' && styles.pillActivePurple,
        ]}>
          <Text style={[
            styles.pillText,
            cycleInfo.phase === 'luteal' && { color: '#B983FF', fontWeight: '700' },
          ]}>LUTEAL</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  // matches: bg-white/5 rounded-[32px] p-6 border border-white/10
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },

  // matches: text-sm font-bold tracking-wide uppercase mb-6 flex items-center
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // matches: .h-32.w-full.relative.mb-6
  chartWrap: {
    height: 120,
    width: '100%',
    marginBottom: 24,
  },

  // matches: .flex.flex-wrap.gap-2
  pills: {
    flexDirection: 'row',
    gap: 8,
  },

  // matches: px-3 py-1 bg-white/5 rounded-full text-[10px] text-white/60 border border-white/10
  pill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  pillText: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.5,
  },

  // Active states match HTML: bg-[color]/20 text-[color] font-bold border-[color]/30
  pillActiveGreen: {
    backgroundColor: 'rgba(162,255,134,0.2)',
    borderColor: 'rgba(162,255,134,0.3)',
  },
  pillActiveYellow: {
    backgroundColor: 'rgba(244,253,80,0.2)',
    borderColor: 'rgba(244,253,80,0.3)',
  },
  pillActivePurple: {
    backgroundColor: 'rgba(185,131,255,0.2)',
    borderColor: 'rgba(185,131,255,0.3)',
  },
})
