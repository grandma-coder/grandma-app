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
import { useIsDiffuse, useScrollBottomInset } from '../ui/diffuse/DiffuseKit'
import { getCycleInfo, getDaysLate, periodLengthFor, toDateStr, type CycleConfig, type CyclePhase } from '../../lib/cycleLogic'
import type { CaregiverView } from '../../lib/caregiverPermissions'
import { useCycleHistory } from '../../lib/cycleAnalytics'
import { useCycleReminderSync } from '../../lib/cycleReminders'
import { useJourneyStore } from '../../store/useJourneyStore'
import { useChildStore } from '../../store/useChildStore'
import { EssentialsWalletCard } from './EssentialsWalletCard'
import { useCycleSettingsStore } from '../../store/useCycleSettingsStore'
import { useProfile } from '../../lib/useProfile'
import { HomeGreeting } from './HomeGreeting'
import { HomeJourneySwitcher } from './HomeJourneySwitcher'
import { CycleJourneyRingFull } from './cycle/CycleJourneyRingFull'
import { CycleTodaySummaryCard } from './cycle/CycleTodaySummaryCard'
import { CycleWallet } from './cycle/CycleWallet'
import { DailyMessageCard } from './pregnancy/DailyMessageCard'
import { CycleLogConfirm } from './cycle/CycleLogConfirm'
import { LogSheet } from '../calendar/LogSheet'
import { CycleMonthGrid } from '../calendar/CycleMonthGrid'
import { LogActivitySheet, type LogType } from '../calendar/LogActivitySheet'
import { FirstPeriodCard } from './cycle/FirstPeriodCard'
import { isFutureDate } from '../../lib/futureDate'
import { LatePeriodCard } from './cycle/LatePeriodCard'
import { CycleLogRouter } from '../calendar/CycleLogRouter'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation, t as translate } from '../../lib/i18n'
import { appIntlLocale } from '../../lib/cycleLogForms'
import { Skeleton, SkeletonRing } from '../ui/Skeleton'
import { FadeIn } from '../ui/Motion'

import { useConsumeWidgetIntent } from '../../store/useWidgetIntentStore'
function getMicroLabel(): string {
  const d = new Date()
  const loc = appIntlLocale()
  const day = d.toLocaleDateString(loc, { weekday: 'long' })
  const date = d.toLocaleDateString(loc, { month: 'short', day: 'numeric' })
  return translate('cyc_home_micro', { day: day.toUpperCase(), date: date.toUpperCase() })
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
  const { t, language } = useTranslation()
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
  const { data: history, isLoading: historyLoading } = useCycleHistory()
  // Local "period may start soon" reminder — owner only, never for a caregiver.
  useCycleReminderSync({ disabled: !!caregiverView })
  // First load only (no cached history yet): the ring/strip/day card would be
  // built from a provisional "today − 10 days" config and then jump to the real
  // day. Light look shows their skeleton instead; refetches keep the content.
  const ringSkeleton = !diffuse && historyLoading && !history
  // No period logged yet: ask for the real date instead of drawing an invented cycle.
  const noPeriodYet = !diffuse && !!history && history.cycles.length === 0
  // Date-based label only changes day-to-day; memo it so it isn't rebuilt on
  // every render (string formatting via toLocaleDateString twice per call).
  const microLabel = useMemo(() => getMicroLabel(), [language])

  // User cycle settings override the measured average + hardcoded defaults.
  const cycleSettings = useCycleSettingsStore()
  const cycleConfig: CycleConfig = (() => {
    const latest = history?.cycles[history.cycles.length - 1]
    // Declared cycle length wins; else the measured average; else 28.
    const cycleLength = cycleSettings.cycleLength ?? history?.avg ?? 28
    const periodLength = cycleSettings.periodLength
    const lutealPhase = cycleSettings.lutealPhase
    if (latest) {
      // A logged period end for this cycle wins over the setting — the calendar already shows it.
      return { lastPeriodStart: latest.startDate, cycleLength, periodLength: periodLengthFor(latest, periodLength), lutealPhase }
    }
    // Light look with no period logged: no anchor, so phases/predictions stay empty (the ring is
    // replaced by FirstPeriodCard). Diffuse keeps its old 10-days-ago placeholder untouched.
    if (noPeriodYet) return { lastPeriodStart: '', cycleLength, periodLength, lutealPhase }
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
  useConsumeWidgetIntent('cycle', (t) => setLogSheetType(t as LogType))
  const [logConfirmVisible, setLogConfirmVisible] = useState(false)

  const handleDatePress = useCallback((date: string) => {
    setSelectedDate(date)
    // Future days can be viewed but not logged (a future period start would enter the history).
    if (!isFutureDate(date)) setLauncherOpen(true)
  }, [])

  const handleLogSaved = useCallback(() => {
    setLogSheetType(null)
    void qc.invalidateQueries({ queryKey: ['cycleLogs'] })
    setLogConfirmVisible(true)
  }, [qc])

  // Stable callback so the ring's emit effect doesn't re-run every render.
  // This only lifts the scrubbed day up to the log card — it must NOT freeze
  // auto-return. (The log flow itself freezes it via launcherOpen / logSheetType
  // / logConfirmVisible below.) A previous `dateLocked` latch here fired on every
  // scrub, which permanently froze the wheel off-today and killed the
  // idle-return-to-today behavior.
  const handleRingDate = useCallback((d: string) => {
    setSelectedDate(d)
  }, [])

  // Phase for the *selected* day (not just today), so the log card + forms use
  // the correct phase-aware copy/colors for the day being logged.
  const selectedInfo = getCycleInfo(cycleConfig, selectedDate)
  // Light look: once the expected start has passed with no new period, the ring would wrap into an
  // invented new cycle — show how late it is instead. Needs a real logged start (not a placeholder).
  const daysLate = !diffuse && history && history.cycles.length > 0 ? getDaysLate(cycleConfig, todayStr) : 0

  function handleMonthPick(date: string) {
    // Drive the ring only. It snaps to the picked day and then emits the real
    // date back via onSelectedDateChange → setSelectedDate. Setting selectedDate
    // directly here would race (and lose to) that emit, so we don't. A fresh
    // object-free string won't re-fire the ring effect if the same day is picked
    // twice, so nudge it via a keyed wrapper.
    setMonthPick(date)
    setMonthOpen(false)
  }

  // NOTE: we intentionally do NOT blank the whole screen while `history` is
  // pending. `useCycleHistory()` is a Supabase round-trip (~1–2s); withholding
  // the entire home behind it left the user staring at an empty cream screen on
  // every cold open. Every consumer below reads the fallback-safe `cycleConfig`
  // (declared length → measured avg → 28) and `selectedInfo` derived from it —
  // none dereference `history` directly — so the home renders instantly with
  // sensible defaults. The one exception is the ring block itself: in the light
  // look its first load shows CycleRingSkeleton (see `ringSkeleton`) so a fake
  // "Day 11" never jumps to the real day. No blank, no crash.

  const dailyBlock = (
    <>
        {/* Daily Message — women's-general daily-question → collectible card.
            Same mode-agnostic component the pregnancy home uses; it reads the
            active mode and pulls from the pre-pregnancy question/card bank. */}
        {show('daily_message') && (
        <View style={styles.section}>
          <DailyMessageCard />
        </View>
        )}
    </>
  )
  const walletBlock = (
    <>
        {walletHasVisibleCard && (
        <View style={styles.cardWrap}>
          {/* Wallet heading — a display-font title (same across all 3 homes) so
              the card stack reads as a proper "Quick access" section. */}
          {diffuse ? (
            <Text style={{ marginBottom: 12, fontFamily: diffuseFont.display, fontSize: 22, letterSpacing: -0.3, color: dt.colors.ink }}>
              {t('home_wallet_label')}
            </Text>
          ) : null /* light: CycleWallet draws its own heading row + tile grid */}
          <CycleWallet visibleCardIds={caregiverView?.visible ?? null} />
        </View>
        )}
    </>
  )

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
          <HomeGreeting name={displayName} microLabel={microLabel} trailing={<HomeJourneySwitcher />} />
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
        {show('journey_ring') && ringSkeleton && <CycleRingSkeleton />}
        {show('journey_ring') && noPeriodYet && !readOnly && (
          <FirstPeriodCard onLog={(date) => { setSelectedDate(date); setLogSheetType('period_start') }} />
        )}
        {show('journey_ring') && !ringSkeleton && !noPeriodYet && daysLate > 0 && (
          <LatePeriodCard
            daysLate={daysLate}
            onLogPeriod={readOnly ? undefined : () => { setSelectedDate(todayStr); setLogSheetType('period_start') }}
            onLogTest={readOnly ? undefined : () => { setSelectedDate(todayStr); setLogSheetType('pregnancy_test') }}
          />
        )}
        {show('journey_ring') && !ringSkeleton && !noPeriodYet && !(daysLate > 0) && (
        <FadeIn>
        <CycleJourneyRingFull
          cycleConfig={cycleConfig}
          onSelectedDateChange={handleRingDate}
          selectDate={monthPick}
          onOpenMonth={() => setMonthOpen(true)}
          onDatePress={readOnly ? undefined : handleDatePress}
          freezeAutoReturn={monthOpen || cardLogging || launcherOpen || logSheetType !== null || logConfirmVisible}
        />
        </FadeIn>
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

        {/* Light: ring → log dock → quick-access tiles → quiet daily card. Diffuse keeps its order. */}
        {diffuse ? <>{dailyBlock}{walletBlock}</> : <>{walletBlock}{dailyBlock}</>}
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
              date: new Date(selectedDate + 'T12:00:00').toLocaleDateString(appIntlLocale(), { weekday: 'short', month: 'short', day: 'numeric' }),
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

/** Ring + legend row + 7-day strip + day card, shaped like CycleJourneyRingFull. */
function CycleRingSkeleton() {
  return (
    <View style={styles.skelWrap}>
      <View style={styles.skelRingBox}>
        <SkeletonRing size={232} />
      </View>
      <View style={styles.skelLegendRow}>
        <View style={styles.skelLegend}>
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} width={56} height={14} radius={7} />)}
        </View>
        <Skeleton width={78} height={30} radius={15} />
      </View>
      <View style={styles.skelStrip}>
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} height={54} radius={14} width={undefined} style={{ flex: 1 }} />
        ))}
      </View>
      <View style={styles.skelPanel}>
        <View style={styles.skelStatusRow}>
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton height={26} width="70%" radius={8} />
            <Skeleton height={10} width="45%" radius={5} />
          </View>
          <Skeleton width={72} height={24} radius={12} />
        </View>
        <View style={styles.skelStats}>
          {[0, 1].map((i) => (
            <View key={i} style={{ flex: 1, gap: 8 }}>
              <Skeleton height={10} width="60%" radius={5} />
              <Skeleton height={32} width="45%" radius={8} />
            </View>
          ))}
        </View>
      </View>
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
  skelWrap: { width: '100%' },
  skelRingBox: { height: 260, alignItems: 'center', justifyContent: 'center' },
  skelLegendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 20, gap: 10 },
  skelLegend: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  skelStrip: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, marginTop: 10, marginBottom: 4 },
  skelPanel: { paddingHorizontal: 24, paddingTop: 12, gap: 18 },
  skelStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  skelStats: { flexDirection: 'row', gap: 24 },
})
