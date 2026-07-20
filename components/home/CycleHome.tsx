/**
 * CycleHome — pre-pregnancy home (full-ring 2026 redesign).
 *
 *   1. HomeGreeting
 *   2. CycleJourneyRingFull        (full-size phase-sticker ring + day panel)
 *   3. DailyMessageCard            (daily-question → collectible card, women's-general)
 *   4. CycleTodaySummaryCard       (standalone customizable quick-log)
 *   5. CycleWallet                 (mood & symptoms, pillars grid)
 */

import { useCallback, useMemo, useState } from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { Display } from '../ui/Typography'
import { useIsDiffuse, useScrollBottomInset } from '../ui/diffuse/DiffuseKit'
import { getCycleInfo, toDateStr, type CycleConfig, type CyclePhase } from '../../lib/cycleLogic'
import type { CaregiverView } from '../../lib/caregiverPermissions'
import { useCycleHistory } from '../../lib/cycleAnalytics'
import { useJourneyStore } from '../../store/useJourneyStore'
import { useChildStore } from '../../store/useChildStore'
import { EssentialsWalletCard } from './EssentialsWalletCard'
import { useCycleSettingsStore } from '../../store/useCycleSettingsStore'
import { useProfile } from '../../lib/useProfile'
import { HomeGreeting } from './HomeGreeting'
import { CycleJourneyRingFull } from './cycle/CycleJourneyRingFull'
import { CycleTodaySummaryCard } from './cycle/CycleTodaySummaryCard'
import { CycleWallet } from './cycle/CycleWallet'
import { DailyMessageCard } from './pregnancy/DailyMessageCard'
import { CycleLogConfirm } from './cycle/CycleLogConfirm'
import { LogSheet } from '../calendar/LogSheet'
import { CycleMonthGrid } from '../calendar/CycleMonthGrid'
import { LogActivitySheet, type LogType } from '../calendar/LogActivitySheet'
import { CycleLogRouter } from '../calendar/CycleLogRouter'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from '../../lib/i18n'

function getMicroLabel(): string {
  const d = new Date()
  const day = d.toLocaleDateString('en-US', { weekday: 'long' })
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${day.toUpperCase()} · ${date.toUpperCase()} · CYCLE`
}

interface CycleHomeProps {
  /** Non-null when a caregiver (not the owner) is viewing — filters cards, keeps
      the ring/today log entry points inert without log_activity, pins essentials.
      Cycle's intimate `today_summary` is off by default for caregiver roles. */
  caregiverView?: CaregiverView | null
}

export function CycleHome({ caregiverView }: CycleHomeProps = {}) {
  const { colors } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const bg = diffuse ? dt.colors.bg : colors.bg
  const insets = useSafeAreaInsets()
  const bottomInset = useScrollBottomInset(insets.bottom + 120)
  const { t } = useTranslation()
  // Only read for the pinned essentials card's childId (caregiver path).
  const activeChild = useChildStore((s) => s.activeChild)
  // Owner (caregiverView null) sees every card; a caregiver sees only the shared
  // cards. `readOnly` makes log entry points inert without log_activity.
  const show = (id: string) => !caregiverView || caregiverView.visible.has(id)
  const readOnly = !!caregiverView && !caregiverView.canLog
  // The wallet holds these cards (essentials is pinned separately). Hide the
  // whole wallet block for a caregiver whose share includes none of them.
  const WALLET_CARD_IDS = ['reminders', 'pillars', 'exams', 'ask_grandma', 'rewards']
  const walletHasVisibleCard = !caregiverView || WALLET_CARD_IDS.some((id) => caregiverView.visible.has(id))
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

  // The day the user is logging for. The ring/date-strip drives this (tap a
  // date or scrub the wheel → selectedDate updates); the quick-log card below
  // the strip logs for whatever day is selected (tap-a-date-to-log). Defaults
  // to today until the ring reports its first selection.
  const todayStr = toDateStr(new Date())
  const [selectedDate, setSelectedDate] = useState(todayStr)

  // Month picker sheet (the fuller-calendar affordance). `monthPick` is fed to
  // the ring as `selectDate` so choosing a day jumps the wheel to it.
  const [monthOpen, setMonthOpen] = useState(false)
  const [monthPick, setMonthPick] = useState<string | null>(null)
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  // The card reports when one of its log sheets is open, so we can freeze the
  // ring's auto-return-to-today while the user is mid-log.
  const [cardLogging, setCardLogging] = useState(false)
  const qc = useQueryClient()

  // Tap-a-date-to-log: tapping a strip date opens the SAME log launcher the
  // Calendar tab uses (LogActivitySheet), so a woman can backfill any past day
  // from home. Pick a signal → CycleLogRouter opens that form for the tapped
  // date → save → confirm overlay → glide back to today.
  const [launcherOpen, setLauncherOpen] = useState(false)
  const [logSheetType, setLogSheetType] = useState<LogType | null>(null)
  const [logConfirmVisible, setLogConfirmVisible] = useState(false)

  const handleDatePress = useCallback((date: string) => {
    setSelectedDate(date)
    setDateLocked(date !== todayStr)
    setLauncherOpen(true)
  }, [todayStr])

  const handleLogSaved = useCallback(() => {
    setLogSheetType(null)
    void qc.invalidateQueries({ queryKey: ['cycleLogs'] })
    setLogConfirmVisible(true)
  }, [qc])

  // Stable callback so the ring's emit effect doesn't re-run every render. Also
  // latches "a non-today day is selected" so auto-return doesn't yank a
  // deliberately-picked day back to today mid-log (the log-a-past-day case).
  // Clears automatically when the selection returns to today.
  const [dateLocked, setDateLocked] = useState(false)
  const handleRingDate = useCallback((d: string) => {
    setSelectedDate(d)
    setDateLocked(d !== todayStr)
  }, [todayStr])

  // Phase for the *selected* day (not just today), so the log card + forms use
  // the correct phase-aware copy/colors for the day being logged.
  const selectedInfo = getCycleInfo(cycleConfig, selectedDate)

  function handleMonthPick(date: string) {
    // Drive the ring only. It snaps to the picked day and then emits the real
    // date back via onSelectedDateChange → setSelectedDate. Setting selectedDate
    // directly here would race (and lose to) that emit, so we don't. A fresh
    // object-free string won't re-fire the ring effect if the same day is picked
    // twice, so nudge it via a keyed wrapper.
    setMonthPick(date)
    setMonthOpen(false)
  }

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

        {/* Essentials — pinned above the ring for a caregiver. */}
        {caregiverView && caregiverView.visible.has('essentials') && activeChild?.id && (
          <View style={styles.section}>
            <EssentialsWalletCard
              childId={activeChild.id}
              ownerUserId={caregiverView.ownerUserId}
              showFull={caregiverView.showFullEssentials}
              pinned
            />
          </View>
        )}

        {/* Ring + date strip. onSelectedDateChange lifts the scrubbed/tapped day
            up so the quick-log card right below logs for that same day. The month
            pill under the strip opens the full-month picker; auto-return-to-today
            is frozen while the month sheet or a card log sheet is open. For a
            view-only caregiver the ring stays scrub-only — tap-a-date-to-log is
            disabled (onDatePress omitted). */}
        {show('journey_ring') && (
        <CycleJourneyRingFull
          cycleConfig={cycleConfig}
          onSelectedDateChange={handleRingDate}
          selectDate={monthPick}
          onOpenMonth={() => setMonthOpen(true)}
          onDatePress={readOnly ? undefined : handleDatePress}
          freezeAutoReturn={monthOpen || cardLogging || dateLocked || launcherOpen || logSheetType !== null || logConfirmVisible}
        />
        )}

        {/* Quick-log card — sits DIRECTLY under the strip so tap-a-date → log is
            the obvious primary flow. `date` = the ring/strip-selected day; its
            title reads "Log for today" / "Log for Thu, Jul 24" and each signal
            chip opens a log sheet for that day, then plays the confirm overlay.
            Intimate signals (BBT · LH · intercourse) — hidden from caregivers by
            default (today_summary is off in the role default share). */}
        {show('today_summary') && (
        <CycleTodaySummaryCard
          phase={selectedInfo.phase as CyclePhase}
          date={selectedDate}
          onLoggingActiveChange={setCardLogging}
          onLogConfirmed={() => setMonthPick(todayStr)}
        />
        )}

        {/* Daily Message — women's-general daily-question → collectible card.
            Same mode-agnostic component the pregnancy home uses; it reads the
            active mode and pulls from the pre-pregnancy question/card bank. */}
        {show('daily_message') && (
        <View style={styles.section}>
          <DailyMessageCard />
        </View>
        )}

        {walletHasVisibleCard && (
        <View style={styles.cardWrap}>
          {/* Wallet heading — a display-font title (same across all 3 homes) so
              the card stack reads as a proper "Quick access" section. */}
          {diffuse ? (
            <Text style={{ marginBottom: 12, fontFamily: diffuseFont.display, fontSize: 22, letterSpacing: -0.3, color: dt.colors.ink }}>
              {t('home_wallet_label')}
            </Text>
          ) : (
            <Display size={22} style={{ marginBottom: 12 }}>{t('home_wallet_label')}</Display>
          )}
          <CycleWallet visibleCardIds={caregiverView?.visible ?? null} />
        </View>
        )}
      </ScrollView>

      {/* Full-month picker — the lightweight "fuller calendar" affordance. Tap a
          day → the ring jumps to it and the log card targets it; the always-on
          surface stays the minimal ring + strip. */}
      <LogSheet visible={monthOpen} title={t('cycleLog_pickDay')} onClose={() => setMonthOpen(false)}>
        <CycleMonthGrid
          cycleConfig={cycleConfig}
          selectedDate={selectedDate}
          visibleMonth={visibleMonth}
          onSelectDate={handleMonthPick}
          onPrevMonth={() => setVisibleMonth((m) => m.month === 0 ? { year: m.year - 1, month: 11 } : { year: m.year, month: m.month - 1 })}
          onNextMonth={() => setVisibleMonth((m) => m.month === 11 ? { year: m.year + 1, month: 0 } : { year: m.year, month: m.month + 1 })}
        />
      </LogSheet>

      {/* Tap-a-date-to-log — the SAME launcher + forms the Calendar tab uses,
          targeting the tapped day. Select a signal → its form opens for that
          date → save → confirm overlay → ring glides back to today. */}
      <LogActivitySheet
        open={launcherOpen}
        onClose={() => setLauncherOpen(false)}
        onSelect={(type) => setLogSheetType(type)}
        title={selectedDate === todayStr
          ? t('cycleLog_todayTitle')
          : t('cycleLog_dateTitle', {
              date: new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            })}
      />
      <CycleLogRouter
        sheetType={logSheetType}
        date={selectedDate}
        cycleConfig={cycleConfig}
        onClose={() => setLogSheetType(null)}
        onSaved={handleLogSaved}
      />
      <CycleLogConfirm
        visible={logConfirmVisible}
        phase={selectedInfo.phase as CyclePhase}
        onDone={() => { setLogConfirmVisible(false); setMonthPick(todayStr) }}
      />
    </View>
  )
}

// One consistent vertical rhythm between every stacked section on the home, so
// ring → log card → daily message → wallet all breathe the same amount.
const SECTION_GAP = 16

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 120 },
  greetingWrap: { paddingHorizontal: 20, marginBottom: SECTION_GAP },
  section: { paddingHorizontal: 20, marginTop: SECTION_GAP },
  cardWrap: { paddingHorizontal: 20, marginTop: SECTION_GAP },
})
