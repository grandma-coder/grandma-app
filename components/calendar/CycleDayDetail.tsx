/**
 * CycleDayDetail — read panel + "+" CTA for a selected date.
 *
 * Used under CycleMonthGrid. Shows:
 *   • phase line + day-of-cycle + conception probability tag
 *   • "Logged this day" list of cycle_logs entries (one row per type)
 *   • sticker "+" button that opens the host's Log Activity sheet
 *
 * Rendering only — the host owns selection state, the Log Activity sheet,
 * and the per-type form sheets. We call onAddLog() when the user taps "+".
 */
import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useTheme, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../../constants/theme'
import { useIsDiffuse, DiffuseArrow } from '../ui/diffuse/DiffuseKit'
import { DiffuseTimelineRow } from './DiffuseLogTimeline'
import { useTranslation } from '../../lib/i18n'
import { supabase } from '../../lib/supabase'
import { getCycleInfo, type CycleConfig, type CyclePhase } from '../../lib/cycleLogic'

/** Cycle log types that have an editable form sheet (so a logged row of that
 *  type can be tapped to re-open its form). lh / cervical_mucus / ovulation
 *  have no form, so those rows stay non-tappable. */
export type CycleLogFormType = 'period_start' | 'period_end' | 'symptom' | 'mood' | 'basal_temp' | 'intercourse'
const OPENABLE_TYPES = new Set<string>(['period_start', 'period_end', 'symptom', 'mood', 'basal_temp', 'intercourse'])

interface Props {
  cycleConfig: CycleConfig
  date: string
  onAddLog: () => void
  /** Tap a logged row → re-open that type's log form (edit/re-log). */
  onOpenLog?: (type: CycleLogFormType) => void
}

type Row = { type: string; value: string | null; notes: string | null }

const LOG_LABEL: Record<string, string> = {
  period_start:   'Period start',
  period_end:     'Period end',
  basal_temp:     'BBT',
  lh:             'LH test',
  cervical_mucus: 'Cervical mucus',
  intercourse:    'Intimacy',
  symptom:        'Symptom',
  mood:           'Mood',
  ovulation:      'Ovulation',
}

const LOG_DOT: Record<string, string> = {
  period_start:   '#EE7B6D',
  period_end:     '#EE7B6D',
  basal_temp:     '#9DC3E8',
  lh:             '#F5D652',
  cervical_mucus: '#BDD48C',
  intercourse:    '#F2B2C7',
  symptom:        '#F5B896',
  mood:           '#C8B6E8',
  ovulation:      '#EE7B6D',
}

function phaseAccent(phase: CyclePhase, s: ReturnType<typeof useTheme>['stickers']): string {
  switch (phase) {
    case 'menstruation': return s.coral
    case 'follicular':   return s.green
    case 'ovulation':    return s.peach
    case 'luteal':       return s.lilac
  }
}

function formatLongDate(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  })
}

export function CycleDayDetail({ cycleConfig, date, onAddLog, onOpenLog }: Props) {
  const { colors, font, stickers, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const diffuseAccent = getDiffuseAccent('pre-pregnancy', dt.isDark)
  const { t } = useTranslation()
  const ink = isDark ? colors.text : '#141313'

  const [userId, setUserId] = useState<string | undefined>()
  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) =>
      setUserId(session?.user.id),
    )
  }, [])

  const { data: rows = [] } = useQuery({
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

  const info = getCycleInfo(cycleConfig, date)
  const phase = info.phase as CyclePhase
  const accent = phaseAccent(phase, stickers)

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
      label: LOG_LABEL[type] ?? type,
      summary: values.length > 0 ? values.join(', ') : '✓',
      color: LOG_DOT[type] ?? '#888',
    }))
  }, [rows])

  return (
    <View style={diffuse
      ? styles.wrapBare
      : [styles.wrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: diffuse ? dt.colors.ink : ink, fontFamily: diffuse ? diffuseFont.display : font.display }]}>
            {formatLongDate(date)}
          </Text>
          <Text style={[styles.subline, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1, textTransform: 'uppercase', fontSize: 10 } : { color: colors.textMuted, fontFamily: font.bodyMedium }]}>
            {t('cycleDayDetail_phaseDay', { phase: info.phaseLabel, day: info.cycleDay })}
          </Text>
        </View>
        {info.conceptionProbability !== 'none' ? (
          diffuse ? (
            <View style={[styles.fertPillD, { borderColor: dt.colors.hairline }]}>
              <Text style={[styles.fertPillText, { color: dt.colors.ink, fontFamily: diffuseFont.mono }]}>
                {info.conceptionProbability.toUpperCase()}
              </Text>
            </View>
          ) : (
            <View style={[styles.fertPill, { backgroundColor: accent + '22', borderColor: accent }]}>
              <Text style={[styles.fertPillText, { color: accent, fontFamily: font.bodySemiBold }]}>
                {info.conceptionProbability.toUpperCase()}
              </Text>
            </View>
          )
        ) : null}
      </View>

      <Text style={[styles.sectionLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 2 } : { color: colors.textFaint, fontFamily: font.bodySemiBold }]}>
        {t('cycleDayDetail_loggedThisDay')}
      </Text>
      {grouped.length > 0 ? (
        diffuse ? (
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
                onPress={onOpenLog && OPENABLE_TYPES.has(g.type)
                  ? () => onOpenLog(g.type as CycleLogFormType)
                  : undefined}
              />
            ))}
          </View>
        ) : (
        <View style={styles.logList}>
          {grouped.map((g) => (
            <View key={g.type} style={styles.logRow}>
              <View style={[styles.logDot, { backgroundColor: g.color }]} />
              <Text style={[styles.logLabel, { color: ink, fontFamily: font.bodySemiBold }]}>
                {g.label}
              </Text>
              <Text
                style={[styles.logValue, { color: colors.textSecondary, fontFamily: font.body }]}
                numberOfLines={1}
              >
                {g.summary}
              </Text>
            </View>
          ))}
        </View>
        )
      ) : (
        <Text style={[styles.empty, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.body } : { color: colors.textFaint, fontFamily: font.body }]}>
          {t('cycleDayDetail_emptyDay')}
        </Text>
      )}

      {diffuse ? (
        <Pressable onPress={onAddLog} style={[styles.addBtnD, { borderTopColor: dt.colors.line2 }]}>
          <Text style={[styles.addBtnTextD, { color: dt.colors.ink, fontFamily: diffuseFont.monoBold }]}>
            {t('cycleDayDetail_addLog')}
          </Text>
          <DiffuseArrow color={diffuseAccent} size={16} />
        </Pressable>
      ) : (
        <Pressable
          onPress={onAddLog}
          style={[styles.addBtn, { backgroundColor: accent, borderColor: '#141313' }]}
        >
          <Text style={[styles.addBtnText, { color: '#FFFEF8', fontFamily: font.bodySemiBold }]}>
            {t('cycleDayDetail_addLog')}
          </Text>
        </Pressable>
      )}
    </View>
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
  logDot: { width: 8, height: 8, borderRadius: 999 },
  logLabel: { fontSize: 13 },
  logValue: { fontSize: 13, flex: 1 },
  empty: { fontSize: 12, fontStyle: 'italic' },
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
