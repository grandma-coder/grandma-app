/**
 * FertileWindowStrip — a 7-day pill row showing this week's fertile-window state.
 * Today has a ringed border. Fertile days filled with pink (peak day = solid, others = soft).
 */

import { View, StyleSheet } from 'react-native'
import { useTheme } from '../../../constants/theme'
import { MonoCaps, Body } from '../../ui/Typography'
import { getCycleInfo, toDateStr, type CycleConfig } from '../../../lib/cycleLogic'

interface Props {
  cycleConfig: Pick<CycleConfig, 'lastPeriodStart' | 'cycleLength' | 'periodLength'>
}

function mondayOfWeek(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day // push back to Monday
  const m = new Date(d)
  m.setDate(d.getDate() + diff)
  return m
}

export function FertileWindowStrip({ cycleConfig }: Props) {
  const { colors, stickers, isDark } = useTheme()
  const today = new Date()
  const monday = mondayOfWeek(today)
  const todayStr = toDateStr(today)

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <MonoCaps size={10} color={colors.textMuted}>FERTILE WINDOW</MonoCaps>
        <Body size={11} color={colors.textMuted}>this week</Body>
      </View>
      <View style={styles.row}>
        {days.map((d, i) => {
          const dStr = toDateStr(d)
          const isToday = dStr === todayStr
          const info = getCycleInfo(cycleConfig, dStr)
          const isPeak =
            info.conceptionProbability === 'peak' || info.conceptionProbability === 'high'
          const isFertile = info.isFertile

          const bg = isPeak
            ? stickers.pink
            : isFertile
            ? stickers.pinkSoft
            : colors.surfaceRaised

          const ink = isDark ? colors.text : '#141313'
          const numColor = isPeak ? '#FFFEF8' : ink

          return (
            <View key={i} style={styles.dayCol}>
              <View
                style={[
                  styles.pill,
                  {
                    backgroundColor: bg,
                    borderColor: isToday ? ink : 'transparent',
                    borderWidth: isToday ? 2 : 0,
                  },
                ]}
              >
                <Body size={14} color={numColor} style={{ fontWeight: '600' }}>
                  {d.getDate()}
                </Body>
              </View>
              <Body size={10} color={colors.textMuted} style={{ marginTop: 4 }}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
              </Body>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCol: {
    alignItems: 'center',
    flex: 1,
  },
  pill: {
    width: 40,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
