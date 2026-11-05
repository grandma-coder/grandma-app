/**
 * CycleDayDetail — read panel + "log" CTA for a selected date.
 *
 * Used under the agenda calendar. Shows:
 *   • phase line + day-of-cycle (marked as an estimate when it is one) + fertility tag
 *   • "Logged this day" list of cycle_logs entries (one row per type, in the user's language)
 *   • site look: tap a row → Edit (re-open its form) / Remove (confirm, then delete that day's
 *     entries of that type)
 *   • the log pill (hidden on future days — logs describe what happened)
 *
 * The host owns selection state, the Log Activity sheet and the per-type form sheets.
 */
import { QuietPill } from '../profile/SiteSettingsKit'
import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTheme, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../../constants/theme'
import { useIsDiffuse, DiffuseArrow } from '../ui/diffuse/DiffuseKit'
import { DiffuseTimelineRow } from './DiffuseLogTimeline'
import { SiteSticker, type SiteStickerName } from '../stickers/SiteSticker'
import { Skeleton } from '../ui/Skeleton'
import { useConfirmDialog } from '../ui/useConfirm'
import { useTranslation } from '../../lib/i18n'
import { supabase } from '../../lib/supabase'
import { getCycleInfo, getPhaseLabel, type CycleConfig, type CycleCalendarDay } from '../../lib/cycleLogic'
import { isFutureDate } from '../../lib/futureDate'
import { appIntlLocale } from '../../lib/cycleLogForms'
import { useUnitsStore } from '../../store/useUnitsStore'
import { formatTemp, formatWeight } from '../../lib/units'
import { translations, type TranslationKey } from '../../lib/i18n'
import { CYCLE_LOG_STICKER, CYCLE_MOOD_STICKER } from '../../lib/logStickers'
import { resolveSymptomId, symptomLabel } from '../../lib/cycleSymptoms'
import type { LogType } from './LogActivitySheet'

/** Stored `cycle_logs.type` → the form that edits it (the sheet id differs for cervical mucus). */
const FORM_FOR_TYPE: Record<string, LogType | undefined> = {
  period_start: 'period_start', period_end: 'period_end', symptom: 'symptom', mood: 'mood',
  basal_temp: 'basal_temp', intercourse: 'intercourse', pregnancy_test: 'pregnancy_test',
  sex_drive: 'sex_drive', clots: 'clots', weight: 'weight', water: 'water', activity: 'activity',
  lh: 'lh', cervical_mucus: 'cm', cm: 'cm',
}
/** Diffuse keeps its original tappable set. */
export type CycleLogFormType = LogType
const DIFFUSE_OPENABLE = new Set<string>(['period_start', 'period_end', 'symptom', 'mood', 'basal_temp', 'intercourse'])

interface Props {
  /** Diffuse: the repeating-pattern config it has always used. */
  cycleConfig: CycleConfig
  /** Site look: the day read from the logged cycles (getCycleCalendarDay). */
  day?: CycleCalendarDay
  /** Site look: the cycle history is still loading → no phase line yet. */
  dayLoading?: boolean
  date: string
  onAddLog: () => void
  /** Tap a logged row → re-open that type's log form (edit/re-log). */
  onOpenLog?: (type: CycleLogFormType) => void
}

type Row = { type: string; value: string | null; notes: string | null }

const LOG_LABEL_KEY: Record<string, TranslationKey | undefined> = {
  period_start: 'cycleCalendar_logEntry_periodStart',
  period_end: 'cycleCalendar_logEntry_periodEnd',
  basal_temp: 'cycleCalendar_logEntry_temperature',
  lh: 'cycleCalendar_logEntry_lh',
  cervical_mucus: 'cycleCalendar_logEntry_cm',
  cm: 'cycleCalendar_logEntry_cm',
  intercourse: 'cycleCalendar_logEntry_intimacy',
  symptom: 'cycleCalendar_logEntry_symptoms',
  mood: 'cycleCalendar_logEntry_mood',
  pregnancy_test: 'cycleCalendar_logEntry_pregTest',
  sex_drive: 'cycleCalendar_logEntry_sexDrive',
  clots: 'cycleCalendar_logEntry_clots',
  weight: 'cycleCalendar_logEntry_weight',
  water: 'cycleCalendar_logEntry_water',
  activity: 'cycleCalendar_logEntry_activity',
  exam: 'cycleCalendar_logEntry_exam',
  ovulation: 'cycleLogForm_ovulationTitle',
  opk_scan: 'cycleCalendar_logEntry_lh',
}

/** Stored values that have a translated label under `${prefix}${value}`. */
const VALUE_KEY_PREFIX: Record<string, string | undefined> = {
  period_start: 'cycleLogForm_flow_',
  lh: 'cycleLogForm_lh_',
  cervical_mucus: 'cycleLogForm_cm_',
  cm: 'cycleLogForm_cm_',
  mood: 'cycleLogForm_mood_',
  pregnancy_test: 'cycleLogForm_pregTest_',
  intercourse: 'cycleLogForm_',
  sex_drive: 'cycleLogForm_sexDrive_',
  clots: 'cycleLogForm_clots_',
  activity: 'cycleLogForm_activity_',
}

function formatLongDate(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString(appIntlLocale(), {
    weekday: 'long', month: 'short', day: 'numeric',
  })
}

export function CycleDayDetail({ cycleConfig, day, dayLoading, date, onAddLog, onOpenLog }: Props) {
  const { colors, font, stickers, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const diffuseAccent = getDiffuseAccent('pre-pregnancy', dt.isDark)
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { confirm, confirmDialog } = useConfirmDialog()
  const ink = isDark ? colors.text : '#141313'

  const [userId, setUserId] = useState<string | undefined>()
  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) =>
      setUserId(session?.user.id),
    )
  }, [])

  const { data: rowsData, isLoading: rowsLoading, isError: rowsError, refetch } = useQuery({
    queryKey: ['cycleLogs', 'dayDetail', userId, date],
    queryFn: async (): Promise<Row[]> => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('cycle_logs')
        .select('type, value, notes')
        .eq('user_id', userId)
        .eq('date', date)
      if (error) throw error
      return (data ?? []) as Row[]
    },
    enabled: !!userId,
  })
  const rows = rowsData ?? []
  // No "nothing logged" flash before the first answer (session lookup + fetch).
  const rowsPending = !rowsData && (rowsLoading || !userId)

  // Site look: the row whose Edit / Remove actions are open (reset when the day changes).
  // Keyed by date, so switching days closes it without an effect.
  const [openRowKey, setOpenRowKey] = useState<string | null>(null)
  const openRow = openRowKey?.startsWith(`${date}|`) ? openRowKey.slice(date.length + 1) : null
  const setOpenRow = (type: string | null) => setOpenRowKey(type ? `${date}|${type}` : null)

  const tempUnit = useUnitsStore((u) => u.tempUnit)
  const weightUnit = useUnitsStore((u) => u.weightUnit)
  // Diffuse keeps the repeating-pattern info; the site look reads `day`.
  const info = getCycleInfo(cycleConfig, date)

  // Group rows by type — show one entry per type even if multiple values exist
  // (e.g. multiple symptom rows aggregate into "Symptoms: cramps, fatigue").
  const grouped = useMemo(() => {
    const byType = new Map<string, string[]>()
    for (const r of rows) {
      const arr = byType.get(r.type) ?? []
      if (r.value) arr.push(r.value)
      byType.set(r.type, arr)
    }
    return Array.from(byType.entries()).map(([type, values]) => ({
      type,
      values,
      // Always a translated label — an unknown legacy type gets the generic "log" label, never a raw key.
      label: t(LOG_LABEL_KEY[type] ?? 'cycleDayDetail_addLog').replace(/^\+\s*/, ''),
      summary: values.flatMap((v) => displayValues(type, v)).filter(Boolean).join(', ') || '✓',
    }))
  }, [rows, t, tempUnit, weightUnit]) // eslint-disable-line react-hooks/exhaustive-deps

  function displayValues(type: string, raw: string): string[] {
    const n = parseFloat(raw.replace(',', '.'))
    // Onboarding stored the period duration ('5') in the first period start's value — not a flow.
    if (type === 'period_start' && /^\d+$/.test(raw)) return []
    if (type === 'basal_temp' && Number.isFinite(n)) return [formatTemp(n, tempUnit)]
    if (type === 'weight' && Number.isFinite(n)) return [formatWeight(n, weightUnit)]
    if (type === 'water' && Number.isFinite(n)) return [`${n} ${t('cycleLogForm_water_glasses')}`]
    if (type === 'symptom') {
      // Stored as ids ('back-pain'), sometimes comma-joined; free-text "Other" stays as typed.
      return raw.split(',').map((part) => part.trim()).filter(Boolean).map((part) => {
        const id = resolveSymptomId(part)
        return id ? symptomLabel(id) : part
      })
    }
    const prefix = VALUE_KEY_PREFIX[type]
    if (prefix) {
      const key = `${prefix}${raw}` as TranslationKey
      if (key in translations.en) return [t(key)]
    }
    return [raw]
  }

  function stickerFor(g: { type: string; values: string[] }): SiteStickerName {
    if (g.type === 'mood' && g.values[0] && CYCLE_MOOD_STICKER[g.values[0]]) return CYCLE_MOOD_STICKER[g.values[0]]
    return CYCLE_LOG_STICKER[g.type] ?? 'pencil'
  }

  async function removeType(type: string, label: string) {
    const ok = await confirm({
      title: t('cycleDayDetail_deleteTitle'),
      message: t('cycleDayDetail_deleteBody', { label, date: formatLongDate(date) }),
      confirmLabel: t('common_remove'),
      cancelLabel: t('common_cancel'),
      danger: true,
    })
    if (!ok || !userId) return
    const { error } = await supabase
      .from('cycle_logs')
      .delete()
      .eq('user_id', userId)
      .eq('date', date)
      .eq('type', type)
    if (error) {
      await confirm({ title: t('common_error'), message: t('common_checkConnection'), cancelLabel: null })
      return
    }
    setOpenRow(null)
    // Every cycle surface (history → predictions, calendar marks, home ring) reads under 'cycleLogs'.
    await qc.invalidateQueries({ queryKey: ['cycleLogs'] })
  }

  // ─── Site look: phase line ────────────────────────────────────────────────
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  let siteSubline: string | null = null
  let siteLate: string | null = null
  if (!diffuse && day && !dayLoading) {
    if (day.phase && day.cycleDay) siteSubline = t('cycleDayDetail_phaseDay', { phase: getPhaseLabel(day.phase), day: day.cycleDay })
    else if (day.cycleDay) siteSubline = t('cycleDayDetail_day', { day: day.cycleDay })
    if (siteSubline && day.predicted) siteSubline += ` · ${t('cycleCalendar_estimate')}`
    if (day.daysLate > 0 && date === todayStr) {
      siteLate = day.daysLate === 1 ? t('cycleHome_late_titleOne') : t('cycleHome_late_title', { count: day.daysLate })
    }
  }
  const siteFertility = !diffuse && day && !dayLoading && day.phase ? day.conceptionProbability : 'none'

  if (!diffuse) {
    return (
      <View style={styles.wrapBare}>
        <View style={styles.headRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: ink, fontFamily: font.display, fontSize: 20, textTransform: 'uppercase', letterSpacing: 0.3 }]}>
              {formatLongDate(date)}
            </Text>
            {dayLoading ? (
              <Skeleton width={150} height={10} radius={5} style={{ marginTop: 8 }} />
            ) : siteSubline ? (
              <Text style={[styles.subline, styles.mono, { color: colors.textMuted, marginTop: 4 }]}>
                {siteSubline}
              </Text>
            ) : null}
            {siteLate ? (
              <Text style={[styles.lateLine, { color: colors.textSecondary, fontFamily: font.body }]}>{siteLate}</Text>
            ) : null}
          </View>
          {siteFertility !== 'none' ? (
            <View style={[styles.fertPill, { backgroundColor: stickers.greenSoft, borderColor: colors.text, borderWidth: 1.5 }]}>
              <Text style={[styles.fertPillText, { color: colors.text, fontFamily: font.bodyBold }]}>
                {t(`cycle_fertility_${siteFertility}`).toUpperCase()}
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={[styles.sectionLabel, styles.mono, { color: colors.textMuted }]}>
          {t('cycleDayDetail_loggedThisDay')}
        </Text>

        {rowsPending ? (
          <View style={{ gap: 12, paddingVertical: 6 }}>
            {[0, 1].map((i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Skeleton width={28} height={28} radius={14} />
                <Skeleton width={i === 0 ? '55%' : '40%'} height={12} radius={6} />
              </View>
            ))}
          </View>
        ) : rowsError && rows.length === 0 ? (
          <View style={{ alignItems: 'center', gap: 10, paddingVertical: 12 }}>
            <Text style={[styles.empty, { color: colors.textSecondary, fontFamily: font.body, textAlign: 'center' }]}>
              {t('common_couldntLoad')}
            </Text>
            <QuietPill label={t('common_retry')} onPress={() => { void refetch() }} />
          </View>
        ) : grouped.length > 0 ? (
          <View>
            {grouped.map((g, i) => {
              const form = FORM_FOR_TYPE[g.type]
              const open = openRow === g.type
              return (
                <View
                  key={g.type}
                  style={i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border } : null}
                >
                  <Pressable
                    onPress={() => setOpenRow(open ? null : g.type)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                    accessibilityLabel={`${g.label}: ${g.summary}`}
                    style={({ pressed }) => [styles.siteRow, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    <SiteSticker name={stickerFor(g)} size={28} />
                    <Text style={[styles.logLabel, { color: ink, fontFamily: font.bodyBold, flexShrink: 1 }]} numberOfLines={1}>
                      {g.label}
                    </Text>
                    <Text
                      style={[styles.logValue, { color: colors.textSecondary, fontFamily: font.body, textAlign: 'right' }]}
                      numberOfLines={2}
                    >
                      {g.summary}
                    </Text>
                  </Pressable>
                  {open ? (
                    <View style={styles.rowActions}>
                      {form && onOpenLog ? (
                        <RowAction label={t('common_edit')} onPress={() => { setOpenRow(null); onOpenLog(form) }} />
                      ) : null}
                      <RowAction label={t('common_remove')} danger onPress={() => { void removeType(g.type, g.label) }} />
                    </View>
                  ) : null}
                </View>
              )
            })}
          </View>
        ) : (
          <View style={{ alignItems: 'center', gap: 8, paddingVertical: 14 }}>
            <SiteSticker name="cal" size={44} />
            <Text style={[styles.empty, { color: colors.textSecondary, fontFamily: font.body, textAlign: 'center' }]}>
              {t('cycleDayDetail_emptyDay')}
            </Text>
          </View>
        )}

        {!isFutureDate(date) && (
          <QuietPill label={t('cycleDayDetail_addLog').replace(/^\+\s*/, '')} sticker="pencil" onPress={onAddLog} style={{ marginTop: 6, alignSelf: 'center' }} />
        )}
        {confirmDialog}
      </View>
    )
  }

  // ─── Diffuse (unchanged) ──────────────────────────────────────────────────
  return (
    <View style={styles.wrapBare}>
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: dt.colors.ink, fontFamily: diffuseFont.display }]}>
            {formatLongDate(date)}
          </Text>
          <Text style={[styles.subline, { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1, textTransform: 'uppercase', fontSize: 10 }]}>
            {t('cycleDayDetail_phaseDay', { phase: info.phaseLabel, day: info.cycleDay })}
          </Text>
        </View>
        {info.conceptionProbability !== 'none' ? (
          <View style={[styles.fertPillD, { borderColor: dt.colors.hairline }]}>
            <Text style={[styles.fertPillText, { color: dt.colors.ink, fontFamily: diffuseFont.mono }]}>
              {t(`cycle_fertility_${info.conceptionProbability}`).toUpperCase()}
            </Text>
          </View>
        ) : null}
      </View>

      <Text style={[styles.sectionLabel, { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 2 }]}>
        {t('cycleDayDetail_loggedThisDay')}
      </Text>
      {grouped.length > 0 ? (
        // Kids-style choice timeline (spine + node + serif title), rendered
        // in COMPACT mode so this day summary stays delicate, not huge.
        <View style={styles.timeline}>
          {grouped.map((g, i) => (
            <DiffuseTimelineRow
              key={g.type}
              type={g.type}
              title={g.label}
              accent={g.summary !== '✓' ? g.summary : undefined}
              logged
              compact
              first={i === 0}
              last={i === grouped.length - 1}
              onPress={onOpenLog && DIFFUSE_OPENABLE.has(g.type)
                ? () => onOpenLog(g.type as CycleLogFormType)
                : undefined}
            />
          ))}
        </View>
      ) : (
        <Text style={[styles.empty, { color: dt.colors.ink3, fontFamily: diffuseFont.body }]}>
          {t('cycleDayDetail_emptyDay')}
        </Text>
      )}

      <Pressable onPress={onAddLog} style={[styles.addBtnD, { borderTopColor: dt.colors.line2 }]}>
        <Text style={[styles.addBtnTextD, { color: dt.colors.ink, fontFamily: diffuseFont.monoBold }]}>
          {t('cycleDayDetail_addLog')}
        </Text>
        <DiffuseArrow color={diffuseAccent} size={16} />
      </Pressable>
    </View>
  )
}

/** Small ink-outlined action pill under an opened row (Edit / Remove). */
function RowAction({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  const { colors, font, stickers } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.rowAction,
        { borderColor: colors.text, backgroundColor: danger ? stickers.coral + '22' : colors.surface, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: colors.text }}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  // Diffuse: no card — the header + spine timeline + action sit bare on the
  // canvas (matches the pregnancy agenda timeline). Only vertical rhythm kept.
  wrapBare: {
    gap: 12,
  },
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  title: { fontSize: 18, letterSpacing: -0.2 },
  subline: { fontSize: 12, marginTop: 2 },
  fertPill: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, borderWidth: 1,
  },
  fertPillD: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1,
  },
  fertPillText: { fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase' },
  sectionLabel: { fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 },
  logList: { gap: 8 },
  timeline: { marginTop: 2 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  siteRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  logDot: { width: 8, height: 8, borderRadius: 999 },
  logLabel: { fontSize: 14 },
  logValue: { fontSize: 13, flex: 1 },
  mono: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase' },
  lateLine: { fontSize: 13, marginTop: 6 },
  rowActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingBottom: 10, paddingLeft: 40 },
  rowAction: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1.5 },
  empty: { fontSize: 13 },
  addBtn: {
    marginTop: 4,
    paddingVertical: 13,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    shadowColor: '#141313', shadowOpacity: 1, shadowRadius: 0,
    shadowOffset: { width: 2, height: 2 }, elevation: 2,
  },
  addBtnText: { fontSize: 15, letterSpacing: 0.2 },
  // Diffuse containerless action
  addBtnD: {
    marginTop: 4,
    paddingTop: 16,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addBtnTextD: { fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' },
})
