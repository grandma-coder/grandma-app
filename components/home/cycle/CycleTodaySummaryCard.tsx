/**
 * CycleTodaySummaryCard — "today at a glance" for the Cycle home.
 *
 * Mirrors PregnancyHome's TodaySummaryCard pattern: chips are read-only
 * previews of today's cycle_logs and tapping anywhere on the card opens
 * the full CycleTodayDashboardModal with high-level metrics. If the user
 * has zero cycle_logs rows in total, we seed realistic sample data once
 * so the card has something to show.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { ChevronRight, SlidersHorizontal } from 'lucide-react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../../constants/theme'
import { useIsDiffuse } from '../../ui/diffuse/DiffuseKit'
import { Character } from '../../characters/Characters'
import { moodExpression, moodBlobFill } from '../../../lib/moodFace'
import { supabase } from '../../../lib/supabase'
import { toDateStr, type CyclePhase } from '../../../lib/cycleLogic'
import { seedCycleData } from '../../../lib/devSeed'
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

/** Chip key → the cycle_logs sheet it opens. */
type CycleSheetType =
  | 'mood' | 'symptom' | 'basal_temp' | 'lh' | 'cm' | 'intercourse' | 'period_start'

interface Props {
  phase: CyclePhase
  /** Embedded inside the Cycle wallet card: skip the outer PaperCard chrome. */
  bare?: boolean
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

export function CycleTodaySummaryCard({ phase, bare = false }: Props) {
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
  // Customization: which chips the user has chosen (persisted). Falls back to
  // the default set until the store rehydrates. `bare` (wallet-embedded) keeps
  // the full fixed set; only the standalone card is user-customizable.
  const [pickerOpen, setPickerOpen] = useState(false)
  const enabledKeys = useCycleQuickLogStore((s) => s.enabledKeys)
  const quickHydrated = useCycleQuickLogStore((s) => s.hydrated)
  const activeKeys = !bare && quickHydrated ? enabledKeys : DEFAULT_CYCLE_QUICK_LOG_KEYS
  const closeSheet = () => {
    setSheetType(null)
    void qc.invalidateQueries({ queryKey: ['cycleLogs'] })
  }
  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) =>
      setUserId(session?.user.id),
    )
  }, [])

  const today = toDateStr(new Date())

  const { data: rows = [] } = useQuery({
    queryKey: ['cycleLogs', 'today-summary', userId, today],
    queryFn: async (): Promise<Row[]> => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('cycle_logs')
        .select('type, value')
        .eq('user_id', userId)
        .eq('date', today)
      if (error) throw error
      return (data ?? []) as Row[]
    },
    enabled: !!userId,
  })

  // Auto-seed sample data the very first time (user has never logged anything).
  // Runs at most once per session — re-guarded by a ref so a refetch can't trigger it again.
  const seededRef = useRef(false)
  useEffect(() => {
    if (!userId || seededRef.current) return
    // Flip the ref BEFORE any await so a remount during the async window
    // (tab switch, etc.) can't re-enter and double-seed. The DB count
    // check still gates the actual seedCycleData() call.
    seededRef.current = true
    void (async () => {
      const { count, error } = await supabase
        .from('cycle_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
      if (error || count === null || count > 0) return
      try {
        await seedCycleData()
        await qc.invalidateQueries({ queryKey: ['cycleLogs'] })
      } catch {
        // Silent — seeding is best-effort UI sugar.
      }
    })()
  }, [userId, qc])

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

  const summaryHint =
    completed === totalTrackable
      ? 'all signals logged today'
      : completed >= 3
        ? `${completed} of ${totalTrackable} signals logged`
        : completed >= 1
          ? `${totalTrackable - completed} signals left for today`
          : 'tap to see today’s signals'

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
              {t('cycleDash_today')}
            </Text>
          ) : (
            <Display size={22} color={ink}>{t('cycleDash_today')}</Display>
          )}
          <Text style={{ marginTop: 3, fontFamily: hintFont, fontSize: 12, color: hintColor, ...(diffuse ? { letterSpacing: 1, textTransform: 'uppercase' as const, fontSize: 10 } : null) }}>
            {summaryHint}
          </Text>
        </View>
        {!bare ? (
          <Pressable onPress={() => setPickerOpen(true)} hitSlop={10} style={({ pressed }) => [styles.editBtn, { opacity: pressed ? 0.6 : 1 }]} accessibilityRole="button" accessibilityLabel={t('common_edit')}>
            <SlidersHorizontal size={15} color={chevronColor} strokeWidth={2} />
            <Text style={{ fontFamily: labelFont, fontSize: 12, color: chevronColor, textTransform: diffuse ? 'uppercase' : 'none', letterSpacing: diffuse ? 0.8 : 0 }}>
              {t('common_edit')}
            </Text>
          </Pressable>
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

      {/* Footer — a single "see results" pill (matches the pregnancy card:
          no label, no chevron, plain paper pill). */}
      <View style={[styles.footer, { borderTopColor: trackColor }]}>
        <Pressable
          onPress={() => setOpen(true)}
          style={({ pressed }) => [styles.resultsPill, { borderColor: diffuse ? dt.colors.line2 : colors.border, backgroundColor: diffuse ? dt.colors.surface : colors.surface, opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={{ fontFamily: diffuse ? diffuseFont.bodySemiBold : font.bodySemiBold, fontSize: 13, letterSpacing: -0.1, color: titleColor }}>
            {t('cycleDash_seeResults')}
          </Text>
        </Pressable>
      </View>
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

      {/* Tap-to-log sheets — one per signal, like PregnancyHome */}
      <LogSheet visible={sheetType === 'mood'} title={sheetTitle.mood} onClose={closeSheet}>
        <MoodForm date={today} phase={phase} onSaved={closeSheet} />
      </LogSheet>
      <LogSheet visible={sheetType === 'symptom'} title={sheetTitle.symptom} onClose={closeSheet}>
        <SymptomsForm date={today} phase={phase} onSaved={closeSheet} />
      </LogSheet>
      <LogSheet visible={sheetType === 'basal_temp'} title={sheetTitle.basal_temp} onClose={closeSheet}>
        <BbtForm date={today} phase={phase} onSaved={closeSheet} />
      </LogSheet>
      <LogSheet visible={sheetType === 'lh'} title={sheetTitle.lh} onClose={closeSheet}>
        <LhForm date={today} phase={phase} onSaved={closeSheet} />
      </LogSheet>
      <LogSheet visible={sheetType === 'cm'} title={sheetTitle.cm} onClose={closeSheet}>
        <CmForm date={today} phase={phase} onSaved={closeSheet} />
      </LogSheet>
      <LogSheet visible={sheetType === 'intercourse'} title={sheetTitle.intercourse} onClose={closeSheet}>
        <IntimacyForm date={today} phase={phase} onSaved={closeSheet} />
      </LogSheet>
      <LogSheet visible={sheetType === 'period_start'} title={sheetTitle.period_start} onClose={closeSheet}>
        <PeriodStartForm date={today} phase={phase} onSaved={closeSheet} />
      </LogSheet>

      {/* Customize which chips show (standalone card only) */}
      {!bare && (
        <CycleQuickLogPicker visible={pickerOpen} onClose={() => setPickerOpen(false)} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  // Matches pregnancy TodaySummaryCard: containerless, horizontal chips, footer.
  wrap: { paddingHorizontal: 20, marginTop: 12 },
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
  footer: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  resultsPill: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 16 },
})
