/**
 * CycleHome — pre-pregnancy home (full-ring 2026 redesign).
 *
 *   1. HomeGreeting
 *   2. CycleJourneyRingFull        (full-size phase-sticker ring + day panel)
 *   3. DailyMessageCard            (daily-question → collectible card, women's-general)
 *   4. CycleTodaySummaryCard       (standalone customizable quick-log)
 *   5. CycleWallet                 (mood & symptoms, pillars grid)
 */

import { useMemo } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, useDiffuseTheme } from '../../constants/theme'
import { useIsDiffuse, useScrollBottomInset } from '../ui/diffuse/DiffuseKit'
import { getCycleInfo, toDateStr, type CycleConfig, type CyclePhase } from '../../lib/cycleLogic'
import { useCycleHistory } from '../../lib/cycleAnalytics'
import { useJourneyStore } from '../../store/useJourneyStore'
import { useCycleSettingsStore } from '../../store/useCycleSettingsStore'
import { useProfile } from '../../lib/useProfile'
import { HomeGreeting } from './HomeGreeting'
import { MonoCaps } from '../ui/Typography'
import { CycleJourneyRingFull } from './cycle/CycleJourneyRingFull'
import { CycleTodaySummaryCard } from './cycle/CycleTodaySummaryCard'
import { CycleWallet } from './cycle/CycleWallet'
import { DailyMessageCard } from './pregnancy/DailyMessageCard'
import { useTranslation } from '../../lib/i18n'

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
  const bottomInset = useScrollBottomInset(insets.bottom + 120)
  const { t } = useTranslation()
  const parentName = useJourneyStore((s) => s.parentName)
  const { data: profile } = useProfile()
  const displayName = profile?.name ?? parentName
  const { data: history, isPending: historyPending } = useCycleHistory()
  // Date-based label only changes day-to-day; memo it so it isn't rebuilt on
  // every render (string formatting via toLocaleDateString twice per call).
  const microLabel = useMemo(() => getMicroLabel(), [])

  // User cycle settings override the measured average + hardcoded defaults.
  const cycleSettings = useCycleSettingsStore()
  const cycleConfig: CycleConfig = (() => {
    const latest = history?.cycles[history.cycles.length - 1]
    // Declared cycle length wins; else the measured average; else 28.
    const cycleLength = cycleSettings.cycleLength ?? history?.avg ?? 28
    const periodLength = cycleSettings.periodLength
    const lutealPhase = cycleSettings.lutealPhase
    if (latest) {
      return { lastPeriodStart: latest.startDate, cycleLength, periodLength, lutealPhase }
    }
    const d = new Date()
    d.setDate(d.getDate() - 10)
    return { lastPeriodStart: toDateStr(d), cycleLength, periodLength, lutealPhase }
  })()

  const info = getCycleInfo(cycleConfig, toDateStr(new Date()))

  if (historyPending) {
    return <View style={[styles.root, { backgroundColor: bg }]} />
  }

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: bottomInset },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.greetingWrap}>
          <HomeGreeting name={displayName} microLabel={microLabel} />
        </View>

        <CycleJourneyRingFull cycleConfig={cycleConfig} />

        {/* Daily Message — women's-general daily-question → collectible card.
            Same mode-agnostic component the pregnancy home uses; it reads the
            active mode and pulls from the pre-pregnancy question/card bank. */}
        <View style={styles.section}>
          <DailyMessageCard />
        </View>

        {/* Standalone customizable quick-log card (mirrors the pregnancy home).
            The card supplies its own horizontal padding (styles.wrap); the
            eyebrow just needs to line up with it. */}
        <MonoCaps style={{ marginTop: 20, marginBottom: 2, paddingHorizontal: 22 }}>{t('pregnancy_logSomething_label')}</MonoCaps>
        <CycleTodaySummaryCard phase={info.phase as CyclePhase} />

        <View style={styles.cardWrap}>
          <CycleWallet />
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 120 },
  greetingWrap: { paddingHorizontal: 20, marginBottom: 12 },
  section: { paddingHorizontal: 20, marginTop: 24 },
  cardWrap: { paddingHorizontal: 20, marginTop: 12 },
})
