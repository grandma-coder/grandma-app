/**
 * CycleHome — pre-pregnancy home screen (Slice 1 of redesign).
 *
 * Section order (interim — Slice 2 will refactor further):
 *   1. HomeGreeting
 *   2. CycleJourneyRing            (replaces YourCycleCard)
 *   3. HormonesCard                (unchanged this slice — deleted in Slice 2)
 *   4. DailyNudgeCard              (replaces WisdomCard)
 *   5. FertileWindowStrip          (unchanged this slice — deleted in Slice 2)
 *   6. CyclePillarsGrid
 */

import { useState } from 'react'
import { View, ScrollView, StyleSheet, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../constants/theme'
import { getCycleInfo, toDateStr, type CycleConfig, type CyclePhase } from '../../lib/cycleLogic'
import { useCycleHistory } from '../../lib/cycleAnalytics'
import { useJourneyStore } from '../../store/useJourneyStore'
import { useProfile } from '../../lib/useProfile'
import { HomeGreeting } from './HomeGreeting'
import { CycleJourneyRing } from './cycle/CycleJourneyRing'
import { HormonesCard } from './cycle/HormonesCard'
import { DailyNudgeCard } from './cycle/DailyNudgeCard'
import { FertileWindowStrip } from './cycle/FertileWindowStrip'
import { CyclePillarsGrid } from './cycle/CyclePillarsGrid'
import { CycleHomeDetailSheet, type CycleHomeDetailType } from './cycle/CycleHomeDetailSheets'

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
  const [detailType, setDetailType] = useState<CycleHomeDetailType | null>(null)

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

        <Pressable onPress={() => setDetailType('cycle')}>
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
        </Pressable>

        <View style={styles.cardWrap}>
          <Pressable onPress={() => setDetailType('hormones')}>
            <HormonesCard cycleDay={info.cycleDay} cycleLength={info.cycleLength} />
          </Pressable>
        </View>

        <View style={styles.cardWrap}>
          <DailyNudgeCard phase={info.phase as CyclePhase} />
        </View>

        <Pressable onPress={() => setDetailType('fertile')}>
          <FertileWindowStrip cycleConfig={cycleConfig} />
        </Pressable>

        <CyclePillarsGrid />
      </ScrollView>

      <CycleHomeDetailSheet
        type={detailType}
        onClose={() => setDetailType(null)}
        cycleConfig={cycleConfig}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 120 },
  greetingWrap: { paddingHorizontal: 20, marginBottom: 12 },
  cardWrap: { paddingHorizontal: 20, marginTop: 12 },
})
