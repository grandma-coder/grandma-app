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
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useTheme } from '../../constants/theme'
import { AnalyticsHeader } from './shared/AnalyticsHeader'
import { AnalyticsTitle } from './shared/AnalyticsTitle'
import { PeriodSelector, type Period } from './shared/PeriodSelector'
import { BigChartCard } from './shared/BigChartCard'
import { MiniStatTile } from './shared/MiniStatTile'
import { MiniBarChart } from './shared/MiniCharts'
import { Moon, Burst, Flower, Heart, Drop } from '../ui/Stickers'
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
            label={cycleValues.length > 0 ? `CYCLE LENGTH (LAST ${cycleValues.length})` : 'CYCLE LENGTH'}
            value={String(avgLabel)}
            unit="days avg"
            blobColor={stickers.pinkSoft}
            hideValue={cycleValues.length === 0}
          >
            <MiniBarChart
              data={cycleValues}
              labels={cycleLabels}
              color={stickers.pink}
              height={100}
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

        <RecentCyclesCard cycles={history?.cycles ?? []} />
      </ScrollView>

      <CycleDetailSheet type={detailType} onClose={() => setDetailType(null)} />
    </View>
  )
}

function RecentCyclesCard({
  cycles,
}: {
  cycles: { startDate: string; endDate: string | null; lengthDays: number | null }[]
}) {
  const { colors, stickers, font } = useTheme()
  const closed = cycles.filter((c) => c.lengthDays !== null).slice(-5).reverse()
  const open = cycles.find((c) => c.lengthDays === null)

  const today = new Date()
  const formatRange = (start: string, end: string | null) => {
    const s = new Date(start + 'T00:00:00')
    if (!end) return s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · current'
    const e = new Date(end + 'T00:00:00')
    const sStr = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const eStr = e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return `${sStr} – ${eStr}`
  }

  const currentDay = open
    ? Math.max(1, Math.floor((today.getTime() - new Date(open.startDate + 'T00:00:00').getTime()) / 86400000) + 1)
    : null

  return (
    <View style={[styles.recentCard, { backgroundColor: colors.surface, borderColor: 'rgba(20,19,19,0.12)' }]}>
      <View pointerEvents="none" style={styles.recentBlob}>
        <Drop size={48} fill={stickers.pinkSoft} stroke={colors.text} />
      </View>

      <Text style={[styles.recentTitle, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
        RECENT CYCLES
      </Text>

      {open && currentDay !== null ? (
        <View style={[styles.recentOpenRow, { backgroundColor: stickers.pinkSoft, borderColor: 'rgba(20,19,19,0.10)' }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontFamily: font.display, fontSize: 18, letterSpacing: -0.3 }}>
              Day {currentDay}
            </Text>
            <Text style={{ color: colors.textSecondary, fontFamily: font.bodyMedium, fontSize: 12, marginTop: 2 }}>
              Started {formatRange(open.startDate, null)}
            </Text>
          </View>
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 999,
              backgroundColor: stickers.pink,
              borderWidth: 1,
              borderColor: 'rgba(20,19,19,0.14)',
            }}
          >
            <Text style={{ color: '#141313', fontFamily: font.bodySemiBold, fontSize: 11, letterSpacing: 0.4 }}>
              CURRENT
            </Text>
          </View>
        </View>
      ) : null}

      {closed.length > 0 ? (
        <View style={{ gap: 10, marginTop: open ? 12 : 4 }}>
          {closed.map((c, i) => (
            <View key={c.startDate + i} style={styles.recentRow}>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 999,
                  backgroundColor: stickers.pinkSoft,
                  borderWidth: 1,
                  borderColor: 'rgba(20,19,19,0.10)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: colors.text, fontFamily: font.bodySemiBold, fontSize: 11 }}>
                  C{closed.length - i}
                </Text>
              </View>
              <Text style={{ flex: 1, color: colors.textSecondary, fontFamily: font.bodyMedium, fontSize: 13 }}>
                {formatRange(c.startDate, c.endDate)}
              </Text>
              <Text style={{ color: colors.text, fontFamily: font.bodySemiBold, fontSize: 13 }}>
                {c.lengthDays}d
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={{ marginTop: 8, color: colors.textMuted, fontFamily: font.bodyMedium, fontSize: 13, lineHeight: 19 }}>
          Log a couple of period starts and your closed cycles will appear here.
        </Text>
      )}
    </View>
  )
}

function formatFertile(current: { start: string; end: string } | null | undefined): string {
  if (!current) return '—'
  const s = new Date(current.start + 'T00:00:00')
  const e = new Date(current.end + 'T00:00:00')
  const sMonth = s.toLocaleDateString('en-US', { month: 'short' })
  const eMonth = e.toLocaleDateString('en-US', { month: 'short' })
  if (sMonth === eMonth) {
    return `${sMonth} ${s.getDate()}–${e.getDate()}`
  }
  return `${sMonth} ${s.getDate()} – ${eMonth} ${e.getDate()}`
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingTop: 0 },
  grid: {
    paddingHorizontal: 20,
    marginTop: 14,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  pressable: {
    flex: 1,
  },
  recentCard: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 28,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  recentBlob: {
    position: 'absolute',
    top: 10,
    right: 12,
    opacity: 0.55,
  },
  recentTitle: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  recentOpenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
})
