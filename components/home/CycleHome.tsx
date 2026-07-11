/**
 * CycleHome — pre-pregnancy home (full-ring 2026 redesign).
 *
 *   1. HomeGreeting
 *   2. CycleJourneyRingFull        (full-size phase-sticker ring + day panel)
 *   3. DailyNudgeCard              (phase-aware nudge)
 *   4. MoodSymptomStrip            (mood face + symptom chips)
 *   5. CyclePillarsGrid            (2×2 + See all → /cycle-pillars)
 */

import { useCallback, useMemo, useState } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, useDiffuseTheme } from '../../constants/theme'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { getCycleInfo, toDateStr, type CycleConfig, type CyclePhase } from '../../lib/cycleLogic'
import { useCycleHistory } from '../../lib/cycleAnalytics'
import { useJourneyStore } from '../../store/useJourneyStore'
import { useProfile } from '../../lib/useProfile'
import { HomeGreeting } from './HomeGreeting'
import { CycleJourneyRingFull } from './cycle/CycleJourneyRingFull'
import { DailyNudgeCard } from './cycle/DailyNudgeCard'
import { MoodSymptomStrip } from './cycle/MoodSymptomStrip'
import { CyclePillarsGrid } from './cycle/CyclePillarsGrid'
import { CycleTodaySummaryCard } from './cycle/CycleTodaySummaryCard'

function getMicroLabel(): string {
  const d = new Date()
  const day = d.toLocaleDateString('en-US', { weekday: 'long' })
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${day.toUpperCase()} · ${date.toUpperCase()} · CYCLE`
}

export function CycleHome() {
  const { colors } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const bg = diffuse ? dt.colors.bg : colors.bg
  const insets = useSafeAreaInsets()
  const parentName = useJourneyStore((s) => s.parentName)
  const { data: profile } = useProfile()
  const displayName = profile?.name ?? parentName
  const { data: history, isPending: historyPending } = useCycleHistory()
  // Date-based label only changes day-to-day; memo it so it isn't rebuilt on
  // every render (string formatting via toLocaleDateString twice per call).
  const microLabel = useMemo(() => getMicroLabel(), [])

  const cycleConfig: CycleConfig = (() => {
    const latest = history?.cycles[history.cycles.length - 1]
    const avgLen = history?.avg ?? 28
    if (latest) {
      return { lastPeriodStart: latest.startDate, cycleLength: avgLen, periodLength: 5, lutealPhase: 14 }
    }
    const d = new Date()
    d.setDate(d.getDate() - 10)
    return { lastPeriodStart: toDateStr(d), cycleLength: 28, periodLength: 5, lutealPhase: 14 }
  })()

  const info = getCycleInfo(cycleConfig, toDateStr(new Date()))

  // The day the ring is scrubbed to — drives the daily nudge below. Starts on
  // today; the ring lifts changes up via onSelectedDateChange.
  const [selectedDate, setSelectedDate] = useState(() => toDateStr(new Date()))
  const handleSelectedDateChange = useCallback((d: string) => setSelectedDate(d), [])

  if (historyPending) {
    return <View style={[styles.root, { backgroundColor: bg }]} />
  }

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.greetingWrap}>
          <HomeGreeting name={displayName} microLabel={microLabel} />
        </View>

        <CycleJourneyRingFull cycleConfig={cycleConfig} onSelectedDateChange={handleSelectedDateChange} />

        <View style={styles.cardWrap}>
          <DailyNudgeCard cycleConfig={cycleConfig} selectedDate={selectedDate} />
        </View>
        <MoodSymptomStrip phase={info.phase as CyclePhase} />

        <CycleTodaySummaryCard phase={info.phase as CyclePhase} />

        <CyclePillarsGrid />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 120 },
  greetingWrap: { paddingHorizontal: 20, marginBottom: 12 },
  cardWrap: { paddingHorizontal: 20, marginTop: 12 },
})
