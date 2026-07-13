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
import { ChevronRight, Pencil } from 'lucide-react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTheme, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../../../constants/theme'
import { useIsDiffuse } from '../../ui/diffuse/DiffuseKit'
import { Character, type CharacterName } from '../../characters/Characters'
import { supabase } from '../../../lib/supabase'
import { toDateStr, type CyclePhase } from '../../../lib/cycleLogic'
import { seedCycleData } from '../../../lib/devSeed'
import { PaperCard } from '../../ui/PaperCard'
import { Display, Body } from '../../ui/Typography'
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
  const diffuseAccent = getDiffuseAccent('pre-pregnancy', dt.isDark)
  const { t } = useTranslation()
  const qc = useQueryClient()
  const ink = isDark ? colors.text : '#141313'
  const paper = isDark ? colors.surface : '#FFFEF8'

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
      icon: moodMeta
        ? <moodMeta.Sticker size={22} fill={moodMeta.fill} />
        : <Smiley size={22} fill={stickers.yellowSoft} />,
      label: moodMeta?.label ?? '+',
      done: !!moodMeta,
    },
    {
      key: 'symptoms',
      sheet: 'symptom',
      icon: topSymptom
        ? <SymptomSticker id={topSymptom} size={18} />
        : <Heart size={22} fill={stickers.pinkSoft} />,
      label: symptoms.length > 0 ? `${symptoms.length}` : '+',
      done: symptoms.length > 0,
    },
    {
      key: 'bbt',
      sheet: 'basal_temp',
      icon: <Drop size={22} fill={stickers.blue} />,
      label: bbtValue ? `${bbtValue}°` : '+',
      done: !!bbtValue,
    },
    {
      key: 'lh',
      sheet: 'lh',
      icon: <Drop size={22} fill={stickers.yellow} />,
      label: lhValue ? (LH_LABEL[lhValue] ?? lhValue) : '+',
      done: !!lhValue,
    },
    {
      key: 'cm',
      sheet: 'cm',
      icon: <Drop size={22} fill={stickers.green} />,
      label: cmValue ? (CM_LABEL[cmValue] ?? cmValue) : '+',
      done: !!cmValue,
    },
    {
      key: 'intimacy',
      sheet: 'intercourse',
      icon: <Heart size={22} fill={intimacy ? stickers.pink : stickers.pinkSoft} />,
      label: intimacy ? '✓' : '+',
      done: !!intimacy,
    },
    {
      key: 'period_start',
      sheet: 'period_start',
      icon: <Drop size={22} fill={periodStart ? stickers.coral : stickers.pinkSoft} />,
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

  const phaseAccent = phaseColor(phase, stickers)

  // Diffuse: the 3 primary signals as v4 `.srow` rows (bloom line-icon + read
  // label + mono value). The full 7-chip set stays in the current path.
  const diffuseRows: { key: string; char: CharacterName; color: string; label: string; value: string }[] = [
    { key: 'mood', char: 'mood', color: stickers.yellow, label: t('cycleDash_mood' as any), value: moodMeta?.label ?? '—' },
    { key: 'symptoms', char: 'health', color: stickers.green, label: t('cycleDash_symptoms' as any), value: symptoms.length > 0 ? String(symptoms.length) : '—' },
    { key: 'bbt', char: 'temperature', color: stickers.blue, label: t('cycleDash_bbt' as any), value: bbtValue ? `${bbtValue}°` : '—' },
    { key: 'lh', char: 'ovulation', color: stickers.peach, label: t('cycleDash_lh' as any), value: lhValue ? (LH_LABEL[lhValue] ?? lhValue) : '—' },
    { key: 'cm', char: 'water', color: stickers.lilac, label: t('cycleDash_cm' as any), value: cmValue ? (CM_LABEL[cmValue] ?? cmValue) : '—' },
    { key: 'intimacy', char: 'heart', color: stickers.pink, label: t('cycleDash_intimacy' as any), value: intimacy ? '✓' : '—' },
  ]

  const sheetTitle: Record<CycleSheetType, string> = {
    mood: t('cycleCalendar_logSheet_mood'),
    symptom: t('cycleCalendar_logSheet_symptoms'),
    basal_temp: t('cycleCalendar_logSheet_temperature'),
    lh: t('cycleDash_lh'),
    cm: t('cycleDash_cervicalMucus'),
    intercourse: t('cycleCalendar_logSheet_intimacy'),
    period_start: t('cycleCalendar_logSheet_periodStart'),
  }

  // Diffuse rows follow the same enabled-keys filter + order as the chips.
  const rowByKey = new Map(diffuseRows.map((r) => [r.key, r]))
  const visibleRows = activeKeys
    .map((k) => rowByKey.get(k))
    .filter((r): r is (typeof diffuseRows)[number] => !!r)

  const inner = (
    <>
      {/* Header — tap the chevron to open the full dashboard; Edit opens the
          chip picker (standalone card only). */}
      <View style={styles.headerRow}>
        <Pressable onPress={() => setOpen(true)} style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.7 : 1 }]}>
          <Display size={22} color={diffuse ? dt.colors.ink : ink}>{t('cycleDash_today')}</Display>
          <Body size={12} color={diffuse ? dt.colors.ink3 : colors.textMuted} style={{ marginTop: 2, fontFamily: diffuse ? diffuseFont.mono : font.italic, ...(diffuse ? { letterSpacing: 1, textTransform: 'uppercase' as const, fontSize: 10 } : null) }}>
            {summaryHint}
          </Body>
        </Pressable>
        {!bare ? (
          <Pressable
            onPress={() => setPickerOpen(true)}
            hitSlop={10}
            style={({ pressed }) => [styles.editBtn, { borderColor: diffuse ? dt.colors.line2 : colors.border, opacity: pressed ? 0.6 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel={t('common_edit')}
          >
            <Pencil size={12} color={diffuse ? dt.colors.ink3 : colors.textMuted} strokeWidth={2} />
            <Text style={{ fontSize: 11, color: diffuse ? dt.colors.ink3 : colors.textMuted, fontFamily: diffuse ? diffuseFont.mono : font.bodySemiBold, letterSpacing: diffuse ? 0.5 : 0 }}>
              {t('common_edit')}
            </Text>
          </Pressable>
        ) : (
          <ChevronRight size={20} color={diffuse ? dt.colors.ink3 : colors.textMuted} strokeWidth={diffuse ? 1.6 : 2} />
        )}
      </View>

      {diffuse ? (
        <View style={styles.srows}>
          {visibleRows.map((r, i) => (
            <Pressable
              key={r.key}
              onPress={() => setSheetType(r.key as CycleSheetType)}
              style={({ pressed }) => [
                styles.srow,
                { borderBottomColor: dt.colors.line, borderBottomWidth: i === visibleRows.length - 1 ? 0 : StyleSheet.hairlineWidth, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Character name={r.char} size={26} color={r.color} />
              <Text style={[styles.srowLabel, { color: dt.colors.ink, fontFamily: diffuseFont.body }]} numberOfLines={1}>
                {r.label}
              </Text>
              <Text style={[styles.srowValue, { color: r.value === '—' ? dt.colors.ink4 : dt.colors.ink, fontFamily: diffuseFont.monoBold }]} numberOfLines={1}>
                {r.value}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.chipsRow}>
          {visibleChips.map((c) => (
            <Pressable
              key={c.key}
              onPress={() => setSheetType(c.sheet)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: c.done ? stickers.greenSoft : 'rgba(20,19,19,0.04)',
                  borderWidth: c.done ? 1 : 0,
                  borderColor: c.done ? stickers.green : 'transparent',
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View style={styles.chipIcon}>{c.icon}</View>
              <Text
                numberOfLines={1}
                style={[styles.chipLabel, { color: c.done ? stickers.greenInk : ink, fontFamily: font.bodySemiBold }]}
              >
                {c.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={[styles.progressTrack, { backgroundColor: diffuse ? dt.colors.line : (isDark ? colors.border : 'rgba(20,19,19,0.06)') }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${(completed / totalTrackable) * 100}%`,
              backgroundColor: diffuse ? (completed === totalTrackable ? dt.colors.ink3 : diffuseAccent) : (completed === totalTrackable ? stickers.green : phaseAccent),
            },
          ]}
        />
      </View>
    </>
  )

  return (
    <View style={bare ? undefined : styles.wrap}>
      {bare ? (
        inner
      ) : (
        <PaperCard tint={diffuse ? undefined : paper} radius={24} padding={18}>
          {inner}
        </PaperCard>
      )}

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

function phaseColor(phase: CyclePhase, s: ReturnType<typeof useTheme>['stickers']): string {
  switch (phase) {
    case 'menstruation': return s.coral
    case 'follicular':   return s.green
    case 'ovulation':    return s.peach
    case 'luteal':       return s.lilac
  }
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20, marginTop: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999, borderWidth: 1,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(20,19,19,0.04)',
    minWidth: 0,
  },
  chipIcon: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  chipLabel: { fontSize: 12, maxWidth: 70 },
  progressTrack: { height: 4, borderRadius: 2, marginTop: 14, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  // Diffuse summary rows (`.srow`)
  srows: { marginTop: 4 },
  srow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  srowLabel: { flex: 1, fontSize: 14 },
  srowValue: { fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase' },
})
