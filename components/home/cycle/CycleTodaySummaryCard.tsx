/**
 * CycleTodaySummaryCard — "today at a glance" for the Cycle home.
 *
 * Mirrors PregnancyHome's TodaySummaryCard pattern: chips are read-only
 * previews of today's cycle_logs and tapping anywhere on the card opens
 * the full CycleTodayDashboardModal with high-level metrics. Chips only
 * ever reflect rows the user logged from the UI — nothing is fabricated.
 * The ring/phase/fertile-window is derived in code from the onboarding
 * period date (see CycleHome + getCycleInfo), so an empty log day is a
 * valid, honest state.
 */
import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { ChevronRight, SlidersHorizontal } from 'lucide-react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../../constants/theme'
import { useIsDiffuse } from '../../ui/diffuse/DiffuseKit'
import { QuietPill } from '../../ui/QuietPill'
import { Character } from '../../characters/Characters'
import { moodExpression, moodBlobFill } from '../../../lib/moodFace'
import { supabase } from '../../../lib/supabase'
import { toDateStr, type CyclePhase } from '../../../lib/cycleLogic'
import { Display } from '../../ui/Typography'
import { Drop, Heart, Smiley, Sad, Sleepy } from '../../ui/Stickers'
import { SymptomSticker } from '../../calendar/symptomStickers'
import { CycleTodayDashboardModal } from './CycleTodayDashboardModal'
import type { SymptomId } from '../../../lib/cycleSymptoms'
import { useTranslation } from '../../../lib/i18n'
import { LogSheet } from '../../calendar/LogSheet'
import {
  MoodForm, SymptomsForm, BbtForm, LhForm, CmForm, IntimacyForm, PeriodStartForm,
} from '../../calendar/CycleLogForms'
import { useCycleQuickLogStore } from '../../../store/useCycleQuickLogStore'
import { DEFAULT_CYCLE_QUICK_LOG_KEYS } from '../../../lib/cycleQuickLogs'
import { CycleQuickLogPicker } from './CycleQuickLogPicker'
import { CycleLogConfirm } from './CycleLogConfirm'

/** Chip key → the cycle_logs sheet it opens. */
type CycleSheetType =
  | 'mood' | 'symptom' | 'basal_temp' | 'lh' | 'cm' | 'intercourse' | 'period_start'

interface Props {
  phase: CyclePhase
  /** Embedded inside the Cycle wallet card: skip the outer PaperCard chrome. */
  bare?: boolean
  /**
   * The day being logged (YYYY-MM-DD). Defaults to today. When the user scrubs
   * the ring / taps a strip date, the home passes that date here so every log
   * sheet writes to the selected day — the tap-a-date-to-log flow.
   */
  date?: string
  /**
   * Reports whether a log sheet (or the confirm overlay) is currently open, so
   * the host can freeze the ring's auto-return-to-today while the user logs.
   */
  onLoggingActiveChange?: (active: boolean) => void
  /** Fired after the post-log confirm animation finishes, so the host can glide
   *  the ring back to today (closing the pick-past-day → log → done loop). */
  onLogConfirmed?: () => void
}

type Row = { type: string; value: string | null }

const MOOD_META: Record<string, { Sticker: typeof Sad; fill: string; label: string }> = {
  low:   { Sticker: Sad,    fill: '#EE7B6D', label: 'Low' },
  down:  { Sticker: Sad,    fill: '#9DC3E8', label: 'Down' },
  okay:  { Sticker: Sleepy, fill: '#C8B6E8', label: 'Okay' },
  good:  { Sticker: Smiley, fill: '#F5D652', label: 'Good' },
  great: { Sticker: Smiley, fill: '#BDD48C', label: 'Great' },
}

const CM_LABEL: Record<string, string> = {
  dry: 'Dry', sticky: 'Sticky', creamy: 'Creamy', watery: 'Watery', eggwhite: 'Eggwhite',
}

const LH_LABEL: Record<string, string> = {
  negative: 'Neg', faint: 'Faint', positive: 'Pos', peak: 'Peak',
}

export function CycleTodaySummaryCard({ phase, bare = false, date, onLoggingActiveChange, onLogConfirmed }: Props) {
  const { colors, font, stickers, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const qc = useQueryClient()
  const ink = isDark ? colors.text : '#141313'

  const [userId, setUserId] = useState<string | undefined>()
  const [open, setOpen] = useState(false)
  // Which signal's log sheet is open (tap a chip to log it, like pregnancy).
  const [sheetType, setSheetType] = useState<CycleSheetType | null>(null)
  // Post-log confirmation overlay ("Updating your cycle… → Cycle updated").
  const [confirmVisible, setConfirmVisible] = useState(false)
  // Customization: which chips the user has chosen (persisted). Falls back to
  // the default set until the store rehydrates. `bare` (wallet-embedded) keeps
  // the full fixed set; only the standalone card is user-customizable.
  const [pickerOpen, setPickerOpen] = useState(false)
  const enabledKeys = useCycleQuickLogStore((s) => s.enabledKeys)
  const quickHydrated = useCycleQuickLogStore((s) => s.hydrated)
  const activeKeys = !bare && quickHydrated ? enabledKeys : DEFAULT_CYCLE_QUICK_LOG_KEYS
  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) =>
      setUserId(session?.user.id),
    )
  }, [])

  // Tell the host when we're actively logging (a sheet or the confirm overlay is
  // up) so it can freeze the ring's auto-return-to-today mid-log.
  useEffect(() => {
    onLoggingActiveChange?.(sheetType !== null || confirmVisible)
  }, [sheetType, confirmVisible, onLoggingActiveChange])

  const todayStr = toDateStr(new Date())
  // The day we read/write. Defaults to today; the home passes the ring/strip
  // selected date so chips log for that specific day (tap-a-date-to-log).
  const logDate = date ?? todayStr
  const isToday = logDate === todayStr

  // A chip's log form succeeded: close the sheet, refresh the queries (so the
  // home + chips reflect the new row), then play the confirm overlay. Recalc is
  // just the query invalidation; the overlay covers it and auto-dismisses.
  const onLogSaved = () => {
    setSheetType(null)
    void qc.invalidateQueries({ queryKey: ['cycleLogs'] })
    setConfirmVisible(true)
  }
  // Sheet dismissed without saving (backdrop / close X): no confirm animation.
  const closeSheet = () => {
    setSheetType(null)
    void qc.invalidateQueries({ queryKey: ['cycleLogs'] })
  }

  const { data: rows = [] } = useQuery({
    queryKey: ['cycleLogs', 'today-summary', userId, logDate],
    queryFn: async (): Promise<Row[]> => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('cycle_logs')
        .select('type, value')
        .eq('user_id', userId)
        .eq('date', logDate)
      if (error) throw error
      return (data ?? []) as Row[]
    },
    enabled: !!userId,
  })

  // No auto-seeding. cycle_logs holds ONLY what the user logs from the UI.
  // The ring/phase/fertile-window is derived from the onboarding period date
  // via getCycleInfo (see CycleHome), so a fresh account with no logs is a
  // correct, honest empty state — not something to backfill with fake data.

  const moodValue = rows.find((r) => r.type === 'mood')?.value ?? null
  const bbtValue = rows.find((r) => r.type === 'basal_temp')?.value ?? null
  const lhValue = rows.find((r) => r.type === 'lh')?.value ?? null
  const cmValue = rows.find((r) => r.type === 'cervical_mucus')?.value ?? null
  const intimacy = rows.find((r) => r.type === 'intercourse')?.value ?? null
  const periodStart = rows.find((r) => r.type === 'period_start')?.value ?? null
  const symptoms = useMemo(
    () => rows.filter((r) => r.type === 'symptom').map((r) => r.value).filter((v): v is string => !!v),
    [rows],
  )

  const moodMeta = moodValue ? MOOD_META[moodValue] : null
  const topSymptom = symptoms[0] as SymptomId | undefined

  const chips: { key: string; sheet: CycleSheetType; icon: React.ReactNode; label: string; done: boolean }[] = [
    {
      key: 'mood',
      sheet: 'mood',
      icon: diffuse
        ? <Character name="mood" size={24} face={moodExpression(moodValue)} color={moodValue ? moodBlobFill(moodValue) : stickers.yellow} />
        : (moodMeta
            ? <moodMeta.Sticker size={22} fill={moodMeta.fill} />
            : <Smiley size={22} fill={stickers.yellowSoft} />),
      label: moodMeta?.label ?? '+',
      done: !!moodMeta,
    },
    {
      key: 'symptoms',
      sheet: 'symptom',
      icon: diffuse
        ? <Character name="activity" size={24} color={stickers.pink} />
        : (topSymptom
            ? <SymptomSticker id={topSymptom} size={18} />
            : <Heart size={22} fill={stickers.pinkSoft} />),
      label: symptoms.length > 0 ? `${symptoms.length}` : '+',
      done: symptoms.length > 0,
    },
    {
      key: 'bbt',
      sheet: 'basal_temp',
      icon: diffuse ? <Character name="temperature" size={24} color={stickers.blue} /> : <Drop size={22} fill={stickers.blue} />,
      label: bbtValue ? `${bbtValue}°` : '+',
      done: !!bbtValue,
    },
    {
      key: 'lh',
      sheet: 'lh',
      icon: diffuse ? <Character name="water" size={24} color={stickers.yellow} /> : <Drop size={22} fill={stickers.yellow} />,
      label: lhValue ? (LH_LABEL[lhValue] ?? lhValue) : '+',
      done: !!lhValue,
    },
    {
      key: 'cm',
      sheet: 'cm',
      icon: diffuse ? <Character name="water" size={24} color={stickers.green} /> : <Drop size={22} fill={stickers.green} />,
      label: cmValue ? (CM_LABEL[cmValue] ?? cmValue) : '+',
      done: !!cmValue,
    },
    {
      key: 'intimacy',
      sheet: 'intercourse',
      icon: diffuse ? <Character name="heart" size={24} color={intimacy ? stickers.pink : stickers.pinkSoft} /> : <Heart size={22} fill={intimacy ? stickers.pink : stickers.pinkSoft} />,
      label: intimacy ? '✓' : '+',
      done: !!intimacy,
    },
    {
      key: 'period_start',
      sheet: 'period_start',
      icon: diffuse ? <Character name="period" size={24} color={periodStart ? stickers.coral : stickers.pinkSoft} /> : <Drop size={22} fill={periodStart ? stickers.coral : stickers.pinkSoft} />,
      label: periodStart ? (periodStart === 'light' ? 'Lt' : periodStart === 'medium' ? 'Md' : periodStart === 'heavy' ? 'Hv' : '✓') : '+',
      done: !!periodStart,
    },
  ]

  // The chips actually shown, filtered + ordered by the user's enabled keys
  // (standalone card) or the default set (wallet-embedded `bare`). An unknown
  // key is skipped; an enabled key with no matching chip is dropped.
  const chipByKey = new Map(chips.map((c) => [c.key, c]))
  const visibleChips = activeKeys
    .map((k) => chipByKey.get(k))
    .filter((c): c is (typeof chips)[number] => !!c)

  const completed =
    (moodMeta ? 1 : 0) +
    (bbtValue ? 1 : 0) +
    (lhValue ? 1 : 0) +
    (cmValue ? 1 : 0) +
    (symptoms.length > 0 ? 1 : 0)
  const totalTrackable = 5

  // Title reads as an explicit call to log for the chosen day — "Log for today"
  // when it's today, otherwise "Log for Thu, Jul 24". This is the primary,
  // obvious logging entry point (replaces the vague "Today at a glance").
  const logTitle = isToday
    ? t('cycleLog_todayTitle')
    : t('cycleLog_dateTitle', {
        date: new Date(logDate + 'T12:00:00').toLocaleDateString('en-US', {
          weekday: 'short', month: 'short', day: 'numeric',
        }),
      })

  const summaryHint =
    completed === totalTrackable
      ? t('cycleLog_hint')
      : completed >= 1
        ? `${completed} of ${totalTrackable} logged · ${t('cycleLog_hint')}`
        : t('cycleLog_hint')

  const sheetTitle: Record<CycleSheetType, string> = {
    mood: t('cycleCalendar_logSheet_mood'),
    symptom: t('cycleCalendar_logSheet_symptoms'),
    basal_temp: t('cycleCalendar_logSheet_temperature'),
    lh: t('cycleDash_lh'),
    cm: t('cycleDash_cervicalMucus'),
    intercourse: t('cycleCalendar_logSheet_intimacy'),
    period_start: t('cycleCalendar_logSheet_periodStart'),
  }

  // ── Variant-resolved tokens (matches pregnancy TodaySummaryCard) ──
  const titleColor = diffuse ? dt.colors.ink : ink
  const hintColor = diffuse ? dt.colors.ink3 : colors.textMuted
  const hintFont = diffuse ? diffuseFont.italic : font.italic
  const chevronColor = diffuse ? dt.colors.ink3 : colors.textMuted
  const neutralBg = diffuse ? dt.colors.surfaceRaised : colors.surfaceGlass
  const trackColor = diffuse ? dt.colors.line : colors.border
  const labelFont = diffuse ? diffuseFont.mono : font.bodySemiBold

  // Containerless, horizontal-chip layout — identical grammar to the pregnancy
  // TodaySummaryCard (no gray card block / no vertical rows). The card sits on
  // the page canvas; only a completed signal tints soft green.
  const inner = (
    <>
      {/* Header — plain title + hint; Edit (chip picker) on the right, exactly
          like pregnancy. Standalone card only; wallet-embedded shows a chevron. */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          {diffuse ? (
            <Text style={{ fontFamily: diffuseFont.display, fontSize: 22, letterSpacing: -0.3, color: titleColor }}>
              {logTitle}
            </Text>
          ) : (
            <Display size={22} color={ink}>{logTitle}</Display>
          )}
          <Text style={{ marginTop: 3, fontFamily: hintFont, fontSize: 12, color: hintColor, ...(diffuse ? { letterSpacing: 1, textTransform: 'uppercase' as const, fontSize: 10 } : null) }}>
            {summaryHint}
          </Text>
        </View>
        {!bare ? (
          <>
            <QuietPill
              label={t('cycleDash_seeResults')}
              onPress={() => setOpen(true)}
              accessibilityLabel={t('cycleDash_seeResults')}
            />
            <QuietPill
              leading={<SlidersHorizontal size={16} color={chevronColor} strokeWidth={2} />}
              onPress={() => setPickerOpen(true)}
              accessibilityLabel={t('common_edit')}
            />
          </>
        ) : (
          <ChevronRight size={20} color={chevronColor} strokeWidth={diffuse ? 1.6 : 2} />
        )}
      </View>

      {/* Tappable signal pills — neutral hairline; only a completed signal
          tints soft green (no mode-accent). */}
      <View style={styles.chipsRow}>
        {visibleChips.map((c) => {
          const bg = c.done ? stickers.greenSoft : neutralBg
          const border = c.done ? stickers.green : (diffuse ? dt.colors.line : colors.border)
          const textColor = c.done ? stickers.greenInk : titleColor
          return (
            <Pressable
              key={c.key}
              onPress={() => setSheetType(c.sheet)}
              style={({ pressed }) => [
                styles.chip,
                { backgroundColor: bg, borderColor: border, borderRadius: diffuse ? 12 : 999, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <View style={styles.chipIcon}>{c.icon}</View>
              <Text
                numberOfLines={1}
                style={[styles.chipLabel, { color: textColor, fontFamily: labelFont, textTransform: diffuse ? 'uppercase' : 'none', letterSpacing: diffuse ? 0.5 : 0 }]}
              >
                {c.label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* Subtle progress bar — completion over the tracked signals. */}
      <View style={[styles.progressTrack, { backgroundColor: trackColor }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${(completed / totalTrackable) * 100}%`,
              backgroundColor: completed === totalTrackable ? stickers.green : (diffuse ? dt.colors.ink3 : colors.textMuted),
            },
          ]}
        />
      </View>

      {/* (See results moved to the header row; no footer band — it left dead
          space between this card and the Daily Message below. Matches the
          pregnancy card.) */}
    </>
  )

  return (
    <View style={bare ? undefined : styles.wrap}>
      {/* Containerless in both variants — sits on the page canvas directly,
          flush with the section eyebrow (matches pregnancy). */}
      {bare ? inner : <View>{inner}</View>}

      {userId && (
        <CycleTodayDashboardModal
          visible={open}
          onClose={() => setOpen(false)}
          phase={phase}
          userId={userId}
        />
      )}

      {/* Tap-to-log sheets — one per signal, like PregnancyHome. All write to
          `logDate` (today by default, or the ring/strip-selected day), and a
          successful save triggers the confirm overlay via onLogSaved. */}
      <LogSheet visible={sheetType === 'mood'} title={sheetTitle.mood} onClose={closeSheet}>
        <MoodForm date={logDate} phase={phase} onSaved={onLogSaved} />
      </LogSheet>
      <LogSheet visible={sheetType === 'symptom'} title={sheetTitle.symptom} onClose={closeSheet}>
        <SymptomsForm date={logDate} phase={phase} onSaved={onLogSaved} />
      </LogSheet>
      <LogSheet visible={sheetType === 'basal_temp'} title={sheetTitle.basal_temp} onClose={closeSheet}>
        <BbtForm date={logDate} phase={phase} onSaved={onLogSaved} />
      </LogSheet>
      <LogSheet visible={sheetType === 'lh'} title={sheetTitle.lh} onClose={closeSheet}>
        <LhForm date={logDate} phase={phase} onSaved={onLogSaved} />
      </LogSheet>
      <LogSheet visible={sheetType === 'cm'} title={sheetTitle.cm} onClose={closeSheet}>
        <CmForm date={logDate} phase={phase} onSaved={onLogSaved} />
      </LogSheet>
      <LogSheet visible={sheetType === 'intercourse'} title={sheetTitle.intercourse} onClose={closeSheet}>
        <IntimacyForm date={logDate} phase={phase} onSaved={onLogSaved} />
      </LogSheet>
      <LogSheet visible={sheetType === 'period_start'} title={sheetTitle.period_start} onClose={closeSheet}>
        <PeriodStartForm date={logDate} phase={phase} onSaved={onLogSaved} />
      </LogSheet>

      {/* Post-log "updating your cycle → updated" confirmation. When it finishes
          we tell the host, which glides the ring back to today. */}
      <CycleLogConfirm
        visible={confirmVisible}
        phase={phase}
        onDone={() => {
          setConfirmVisible(false)
          onLogConfirmed?.()
        }}
      />

      {/* Customize which chips show (standalone card only) */}
      {!bare && (
        <CycleQuickLogPicker visible={pickerOpen} onClose={() => setPickerOpen(false)} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  // Matches pregnancy TodaySummaryCard: containerless, horizontal chips, footer.
  wrap: { paddingHorizontal: 20, marginTop: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 0,
  },
  chipIcon: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  chipLabel: { fontSize: 12, maxWidth: 70 },
  progressTrack: { height: 4, borderRadius: 2, marginTop: 14, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
})
