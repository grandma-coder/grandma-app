/**
 * CycleAnalytics — 2026 redesign (cream-paper sticker-collage)
 *
 * Lean overview matching the reference AnalyticsScreen (feature-screens.jsx):
 *   1. Hero title + period selector
 *   2. BigChartCard — last N cycles (bars)
 *   3. 2x2 MiniStatTile grid (Regular, PMS days, Fertile, Mood avg)
 *
 * Each tile is tappable → opens CycleDetailSheet.
 */

import { useState, useMemo } from 'react'
import { View, ScrollView, StyleSheet, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useTheme } from '../../constants/theme'
import { AnalyticsHeader } from './shared/AnalyticsHeader'
import { AnalyticsTitle } from './shared/AnalyticsTitle'
import { PeriodSelector, type Period } from './shared/PeriodSelector'
import { BigChartCard } from './shared/BigChartCard'
import { MiniStatTile } from './shared/MiniStatTile'
import { MiniBarChart } from './shared/MiniCharts'
import { Moon, Burst, Flower, Heart } from '../ui/Stickers'
import {
  useCycleHistory,
  useRegularity,
  usePMSStats,
  useFertileWindow,
  useMoodStats,
} from '../../lib/cycleAnalytics'
import { CycleDetailSheet, type CycleDetailType } from './CycleDetailSheets'

export function CycleAnalytics() {
  const { colors, stickers } = useTheme()
  const insets = useSafeAreaInsets()
  const [period, setPeriod] = useState<Period>('month')
  const [detailType, setDetailType] = useState<CycleDetailType | null>(null)

  const { data: history } = useCycleHistory()
  const { data: regularity } = useRegularity()
  const { data: pms } = usePMSStats()
  const { data: fertile } = useFertileWindow()
  const { data: mood } = useMoodStats()

  const cycleValues = useMemo(() => {
    const closed = history?.cycles.filter((c) => c.lengthDays !== null) ?? []
    return closed.slice(-7).map((c) => c.lengthDays as number)
  }, [history])

  const cycleLabels = useMemo(
    () => cycleValues.map((_, i) => `C${i + 1}`),
    [cycleValues]
  )

  const avgLabel = history?.avg ?? '—'
  const regularLabel = regularity?.percent !== null && regularity?.percent !== undefined ? `${regularity.percent}%` : '—'
  const pmsLabel = pms?.avgDays !== null && pms?.avgDays !== undefined ? String(pms.avgDays) : '—'
  const fertileLabel = formatFertile(fertile?.current)
  const moodLabel = mood?.avgScore !== null && mood?.avgScore !== undefined ? String(mood.avgScore) : '—'

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AnalyticsHeader hide />
        <AnalyticsTitle primary="Your cycle," italic="in detail." />
        <PeriodSelector value={period} onChange={setPeriod} showCustom={false} />

        <Pressable onPress={() => setDetailType('cycleLength')}>
          <BigChartCard
            label={`CYCLE LENGTH (LAST ${cycleValues.length || 0})`}
            value={String(avgLabel)}
            unit="days avg"
            blobColor={stickers.pinkSoft}
          >
            <MiniBarChart
              data={cycleValues}
              labels={cycleLabels}
              color={stickers.pink}
            />
          </BigChartCard>
        </Pressable>

        <View style={styles.grid}>
          <View style={styles.row}>
            <Pressable style={styles.pressable} onPress={() => setDetailType('regularity')}>
              <MiniStatTile
                label="REGULAR"
                value={regularLabel}
                sticker={<Moon size={28} fill={stickers.lilac} />}
                tint={stickers.lilacSoft}
              />
            </Pressable>
            <Pressable style={styles.pressable} onPress={() => setDetailType('pms')}>
              <MiniStatTile
                label="PMS DAYS"
                value={pmsLabel}
                sticker={<Burst size={28} fill={stickers.coral} points={8} />}
                tint={stickers.pinkSoft}
              />
            </Pressable>
          </View>
          <View style={styles.row}>
            <Pressable style={styles.pressable} onPress={() => setDetailType('fertile')}>
              <MiniStatTile
                label="FERTILE"
                value={fertileLabel}
                sticker={<Flower size={28} petal={stickers.pink} center={stickers.yellow} />}
                tint={stickers.yellowSoft}
              />
            </Pressable>
            <Pressable style={styles.pressable} onPress={() => setDetailType('mood')}>
              <MiniStatTile
                label="MOOD AVG"
                value={moodLabel}
                sticker={<Heart size={28} fill={stickers.pink} />}
                tint={stickers.greenSoft}
              />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <CycleDetailSheet type={detailType} onClose={() => setDetailType(null)} />
    </View>
  )
}

function formatFertile(current: { start: string; end: string } | null | undefined): string {
  if (!current) return '—'
  const s = new Date(current.start + 'T00:00:00')
  const e = new Date(current.end + 'T00:00:00')
  const month = s.toLocaleDateString('en-US', { month: 'short' })
  return `${month} ${s.getDate()}–${e.getDate()}`
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingTop: 0 },
  grid: {
    paddingHorizontal: 20,
    marginTop: 10,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  pressable: {
    flex: 1,
  },
})
