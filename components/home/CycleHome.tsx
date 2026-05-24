/**
 * CycleHome — pre-pregnancy home (full-ring 2026 redesign).
 *
 *   1. HomeGreeting
 *   2. CycleJourneyRingFull        (full-size phase-sticker ring + day panel)
 *   3. DailyNudgeCard              (phase-aware nudge)
 *   4. MoodSymptomStrip            (mood face + symptom chips)
 *   5. CyclePillarsGrid            (2×2 + See all → /cycle-pillars)
 */

import { View, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../constants/theme'
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
  const insets = useSafeAreaInsets()
  const parentName = useJourneyStore((s) => s.parentName)
  const { data: profile } = useProfile()
  const displayName = profile?.name ?? parentName
  const { data: history, isPending: historyPending } = useCycleHistory()

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

  if (historyPending) {
    return <View style={[styles.root, { backgroundColor: colors.bg }]} />
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.greetingWrap}>
          <HomeGreeting name={displayName} microLabel={getMicroLabel()} />
        </View>

        <CycleJourneyRingFull cycleConfig={cycleConfig} />

        <View style={styles.cardWrap}>
          <DailyNudgeCard cycleConfig={cycleConfig} />
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
