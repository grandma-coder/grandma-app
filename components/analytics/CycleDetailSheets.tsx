/**
 * CycleDetailSheets — tap-through detail for each CycleAnalytics stat tile.
 *
 * One exported `CycleDetailSheet` driven by a `type` prop; each type has its
 * own internal body component that calls the matching cycleAnalytics hook.
 */

import { View, Text, ActivityIndicator, StyleSheet, ScrollView } from 'react-native'
import { useTheme } from '../../constants/theme'
import { LogSheet } from '../calendar/LogSheet'
import { Body, Display } from '../ui/Typography'
import { useCycleHistory, useRegularity } from '../../lib/cycleAnalytics'
import { MiniBarChart } from './shared/MiniCharts'

export type CycleDetailType =
  | 'cycleLength'
  | 'regularity'
  | 'pms'
  | 'fertile'
  | 'mood'

interface Props {
  type: CycleDetailType | null
  onClose: () => void
}

const TITLES: Record<CycleDetailType, string> = {
  cycleLength: 'Cycle Length',
  regularity: 'Regularity',
  pms: 'PMS Days',
  fertile: 'Fertile Window',
  mood: 'Mood',
}

export function CycleDetailSheet({ type, onClose }: Props) {
  const visible = type !== null
  const title = type ? TITLES[type] : ''

  return (
    <LogSheet visible={visible} title={title} onClose={onClose}>
      <ScrollView
        style={{ maxHeight: 540 }}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {type === 'cycleLength' && <CycleLengthDetail />}
        {type === 'regularity' && <RegularityDetail />}
        {type === 'pms' && <PMSDetail />}
        {type === 'fertile' && <FertileDetail />}
        {type === 'mood' && <MoodDetail />}
      </ScrollView>
    </LogSheet>
  )
}

// ─── Placeholder bodies (filled in by later tasks) ────────────────────────

function CycleLengthDetail() {
  const { colors, stickers, font } = useTheme()
  const { data, isLoading, error } = useCycleHistory()

  if (isLoading) return <Loading />
  if (error) return <ErrorState />
  if (!data || data.avg === null || data.cycles.length === 0) {
    return <EmptyState copy="Log your first period to start tracking cycle length." />
  }

  const last12 = data.cycles
    .filter((c) => c.lengthDays !== null)
    .slice(-12)
  const values = last12.map((c) => c.lengthDays as number)
  const labels = last12.map((_, i) => `C${i + 1}`)

  const recentCycles = [...data.cycles].reverse().slice(0, 6)

  return (
    <View style={{ gap: 18 }}>
      <View style={detailStyles.heroRow}>
        <Display size={40} color={colors.text}>{data.avg}</Display>
        <Text style={[detailStyles.heroUnit, { color: colors.textMuted, fontFamily: font.body }]}>days avg</Text>
      </View>

      <View style={detailStyles.minMaxRow}>
        <StatChip label="MIN" value={`${data.min}d`} tint={stickers.blueSoft} />
        <StatChip label="MAX" value={`${data.max}d`} tint={stickers.pinkSoft} />
        <StatChip label="CYCLES" value={String(values.length)} tint={stickers.yellowSoft} />
      </View>

      <View>
        <Text style={[detailStyles.sectionLabel, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
          LAST {values.length} CYCLES
        </Text>
        <MiniBarChart data={values} labels={labels} color={stickers.pink} />
      </View>

      <View style={{ gap: 8 }}>
        <Text style={[detailStyles.sectionLabel, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
          HISTORY
        </Text>
        {recentCycles.map((c) => (
          <View
            key={c.startDate}
            style={[detailStyles.historyRow, { borderColor: colors.borderLight }]}
          >
            <Body size={13} color={colors.text}>
              {formatRange(c.startDate, c.endDate)}
            </Body>
            <Body size={13} color={colors.textSecondary}>
              {c.lengthDays ? `${c.lengthDays}d` : '—'}
            </Body>
          </View>
        ))}
      </View>
    </View>
  )
}

// ─── Shared detail helpers ────────────────────────────────────────────────

function StatChip({ label, value, tint }: { label: string; value: string; tint: string }) {
  const { colors, font } = useTheme()
  return (
    <View style={[detailStyles.statChip, { backgroundColor: tint, borderColor: colors.border }]}>
      <Text style={[detailStyles.statLabel, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>{label}</Text>
      <Text style={[detailStyles.statValue, { color: colors.text, fontFamily: font.display }]}>{value}</Text>
    </View>
  )
}

function formatRange(start: string, end: string | null): string {
  const s = formatShort(start)
  if (!end) return `${s} – now`
  return `${s} – ${formatShort(end)}`
}

function formatShort(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const detailStyles = StyleSheet.create({
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  heroUnit: {
    fontSize: 14,
    paddingBottom: 6,
  },
  minMaxRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statChip: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    gap: 2,
  },
  statLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 18,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
})

function RegularityDetail() {
  const { colors, stickers, font } = useTheme()
  const { data, isLoading, error } = useRegularity()

  if (isLoading) return <Loading />
  if (error) return <ErrorState />
  if (!data || data.percent === null) {
    return <EmptyState copy="We need at least 3 complete cycles to measure regularity." />
  }

  return (
    <View style={{ gap: 18 }}>
      <View style={detailStyles.heroRow}>
        <Display size={56} color={colors.text}>{data.percent}%</Display>
        <Text style={[detailStyles.heroUnit, { color: colors.textMuted, fontFamily: font.body }]}>regular</Text>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={[detailStyles.sectionLabel, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
          LEGEND
        </Text>
        <View style={regStyles.legendRow}>
          <LegendDot color={stickers.green} text="≤ 2 days" />
          <LegendDot color={stickers.yellow} text="≤ 4 days" />
          <LegendDot color={stickers.coral} text="> 4 days" />
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={[detailStyles.sectionLabel, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
          PER-CYCLE DEVIATION
        </Text>
        {data.deviations.slice(-10).map((d) => {
          const dotColor =
            d.delta <= 2 ? stickers.green : d.delta <= 4 ? stickers.yellow : stickers.coral
          return (
            <View
              key={d.cycleIdx}
              style={[detailStyles.historyRow, { borderColor: colors.borderLight }]}
            >
              <View style={regStyles.rowLeft}>
                <View style={[regStyles.dot, { backgroundColor: dotColor }]} />
                <Body size={13} color={colors.text}>Cycle {d.cycleIdx}</Body>
              </View>
              <Body size={13} color={colors.textSecondary}>
                {d.lengthDays}d · {d.delta === 0 ? 'on avg' : `±${d.delta}d`}
              </Body>
            </View>
          )
        })}
      </View>
    </View>
  )
}

function LegendDot({ color, text }: { color: string; text: string }) {
  const { colors, font } = useTheme()
  return (
    <View style={regStyles.legendItem}>
      <View style={[regStyles.dot, { backgroundColor: color }]} />
      <Text style={{ fontSize: 12, color: colors.textMuted, fontFamily: font.body }}>{text}</Text>
    </View>
  )
}

const regStyles = StyleSheet.create({
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
})

function PMSDetail() { return <Loading /> }
function FertileDetail() { return <Loading /> }
function MoodDetail() { return <Loading /> }

// ─── Shared UI helpers ────────────────────────────────────────────────────

function Loading() {
  const { colors } = useTheme()
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} />
    </View>
  )
}

export function EmptyState({ copy }: { copy: string }) {
  const { colors } = useTheme()
  return (
    <View style={styles.center}>
      <Body size={14} color={colors.textMuted} align="center">{copy}</Body>
    </View>
  )
}

export function ErrorState() {
  const { colors } = useTheme()
  return (
    <View style={styles.center}>
      <Body size={14} color={colors.textMuted} align="center">
        Couldn't load. Please try again.
      </Body>
    </View>
  )
}

const styles = StyleSheet.create({
  body: {
    paddingBottom: 8,
    gap: 16,
  },
  center: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
