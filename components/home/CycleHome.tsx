/**
 * CycleHome — pre-pregnancy home (final 2026 redesign layout).
 *
 *   1. HomeGreeting
 *   2. CycleJourneyRing            (170px ring hero)
 *   3. FertileWindowCard           (today % + 7-day forecast)
 *   4. FertilitySignalsCard        (BBT/LH/CM/Sex tiles + sparkline)
 *   5. DailyNudgeCard              (phase-aware nudge)
 *   6. MoodSymptomStrip            (mood face + symptom chips)
 *   7. CyclePillarsGrid            (2×2 + See all → /cycle-pillars)
 */

import { View, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../constants/theme'
import { getCycleInfo, toDateStr, type CycleConfig, type CyclePhase } from '../../lib/cycleLogic'
import { useCycleHistory } from '../../lib/cycleAnalytics'
import { useJourneyStore } from '../../store/useJourneyStore'
import { useProfile } from '../../lib/useProfile'
import { HomeGreeting } from './HomeGreeting'
import { CycleJourneyRing } from './cycle/CycleJourneyRing'
import { FertileWindowCard } from './cycle/FertileWindowCard'
import { FertilitySignalsCard } from './cycle/FertilitySignalsCard'
import { DailyNudgeCard } from './cycle/DailyNudgeCard'
import { MoodSymptomStrip } from './cycle/MoodSymptomStrip'
import { CyclePillarsGrid } from './cycle/CyclePillarsGrid'

function getMicroLabel(): string {
  const d = new Date()
  const day = d.toLocaleDateString('en-US', { weekday: 'long' })
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${day.toUpperCase()} · ${date.toUpperCase()} · CYCLE`
}

function getTitleItalic(phase: CyclePhase): string {
  switch (phase) {
    case 'menstruation': return 'quiet day'
    case 'follicular':   return 'rising day'
    case 'ovulation':    return 'peak day'
    case 'luteal':       return 'soft day'
  }
}

function getSubline(info: ReturnType<typeof getCycleInfo>): string {
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${today} · ${info.phaseLabel}`
}

function getPeriodLine(info: ReturnType<typeof getCycleInfo>): string {
  if (info.phase === 'menstruation') return `Period day ${info.cycleDay} of ~${info.periodLength}`
  if (info.isFertile && info.conceptionProbability === 'peak') return 'Peak today — window open'
  if (info.daysUntilOvulation > 0) return `Ovulation in ${info.daysUntilOvulation} day${info.daysUntilOvulation === 1 ? '' : 's'}`
  return `Next period in ${info.daysUntilPeriod} day${info.daysUntilPeriod === 1 ? '' : 's'}`
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

        <CycleJourneyRing
          cycleDay={info.cycleDay}
          cycleLength={info.cycleLength}
          phaseLabel={info.phaseLabel}
          phase={info.phase as CyclePhase}
          titleItalic={getTitleItalic(info.phase as CyclePhase)}
          subline={getSubline(info)}
          periodLine={getPeriodLine(info)}
          hint="↻ tap any day"
        />

        <FertileWindowCard cycleConfig={cycleConfig} />
        <FertilitySignalsCard />
        <View style={styles.cardWrap}>
          <DailyNudgeCard cycleConfig={cycleConfig} />
        </View>
        <MoodSymptomStrip phase={info.phase as CyclePhase} />

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
