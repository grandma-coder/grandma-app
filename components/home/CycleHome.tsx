/**
 * CycleHome — pre-pregnancy home screen (2026 cream-paper redesign).
 *
 * Layout:
 *   1. HomeGreeting
 *   2. YourCycleCard (hero with ring + phase label)
 *   3. HormonesCard + WisdomCard (2-col row)
 *   4. FertileWindowStrip (7-day pills)
 *   5. CyclePillarsGrid (2x2 tappable tiles)
 *
 * Data sources:
 *   - useCycleHistory() for latest period_start + cycle length
 *   - Falls back to a sensible demo config when user has no logs yet
 *     (keeps the screen populated and prevents ugly zero-state on first launch)
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
import { YourCycleCard } from './cycle/YourCycleCard'
import { HormonesCard } from './cycle/HormonesCard'
import { WisdomCard } from './cycle/WisdomCard'
import { FertileWindowStrip } from './cycle/FertileWindowStrip'
import { CyclePillarsGrid } from './cycle/CyclePillarsGrid'
import { CycleHomeDetailSheet, type CycleHomeDetailType } from './cycle/CycleHomeDetailSheets'

// ─── Helpers ───────────────────────────────────────────────────────────────

function getMicroLabel(): string {
  const d = new Date()
  const day = d.toLocaleDateString('en-US', { weekday: 'long' })
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${day.toUpperCase()} · ${date.toUpperCase()} · CYCLE`
}

function getStatusLine(info: ReturnType<typeof getCycleInfo>): string {
  if (info.isFertile) {
    if (info.conceptionProbability === 'peak') return 'Peak today. Window open.'
    if (info.daysUntilOvulation >= 0) {
      return `Ovulation in ${info.daysUntilOvulation} day${info.daysUntilOvulation === 1 ? '' : 's'}.`
    }
    return 'Fertile window — log if you can.'
  }
  if (info.phase === 'menstruation') {
    return `Day ${info.cycleDay} of your period.`
  }
  const d = info.daysUntilPeriod
  return `Next period in ${d} day${d === 1 ? '' : 's'}.`
}

// ─── Main Component ────────────────────────────────────────────────────────

export function CycleHome() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const parentName = useJourneyStore((s) => s.parentName)
  const { data: profile } = useProfile()
  const displayName = profile?.name ?? parentName
  const { data: history } = useCycleHistory()
  const [detailType, setDetailType] = useState<CycleHomeDetailType | null>(null)

  // Derive cycle config from latest history, or fall back to a demo
  // (10 days ago, 28-day cycle). This keeps the hero populated when
  // a user hasn't logged their first period yet.
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
  const phaseLabel = info.isFertile ? 'Fertile' : info.phaseLabel

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
          <YourCycleCard
            cycleDay={info.cycleDay}
            cycleLength={info.cycleLength}
            phaseLabel={phaseLabel}
            isFertile={info.isFertile}
            statusLine={getStatusLine(info)}
          />
        </Pressable>

        <View style={styles.duoRow}>
          <Pressable style={{ flex: 1 }} onPress={() => setDetailType('hormones')}>
            <HormonesCard cycleDay={info.cycleDay} cycleLength={info.cycleLength} />
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={() => setDetailType('wisdom')}>
            <WisdomCard phase={info.phase as CyclePhase} />
          </Pressable>
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
  scroll: {
    paddingBottom: 120,
  },
  greetingWrap: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  duoRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 12,
  },
})
