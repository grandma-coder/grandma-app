/**
 * CycleMonthGrid — month calendar for the agenda → cycle tab.
 *
 * Mirrors the home wheel's visual language: each day cell is tinted by its
 * cycle phase, shows a small phase sticker, and renders tiny colored dots
 * for whatever was logged that day. Today gets a sparkle aura.
 *
 * Tap a day → calls onSelectDate. Selected day gets a phase-accent ring.
 */
import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useTheme, useDiffuseTheme, getDiffuseAccent, diffuseFont } from '../../constants/theme'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { DiffuseDotCalendar } from '../ui/diffuse/DiffusePrimitives'
import { supabase } from '../../lib/supabase'
import { getCycleInfo, toDateStr, type CycleConfig, type CyclePhase } from '../../lib/cycleLogic'
import { SiteSticker } from '../stickers/SiteSticker'
import { CyclePhaseGlyph, CYCLE_PHASE_ORDER } from './CyclePhaseGlyph'
import { useTranslation } from '../../lib/i18n'

interface Props {
  cycleConfig: CycleConfig
  /** YYYY-MM-DD selected date. */
  selectedDate: string
  /** Month/year being viewed (defaults derive from selectedDate). */
  visibleMonth: { year: number; month: number /* 0-11 */ }
  onSelectDate: (date: string) => void
  onPrevMonth: () => void
  onNextMonth: () => void
}

function phaseAccent(phase: CyclePhase, s: ReturnType<typeof useTheme>['stickers']): string {
  switch (phase) {
    case 'menstruation': return s.coral
    case 'follicular':   return s.green
    case 'ovulation':    return s.peach
    case 'luteal':       return s.lilac
  }
}

// Legend labels reuse the existing cycle-ring phase-label i18n keys.
const PHASE_LEGEND_KEY: Record<CyclePhase, 'cycleRing_label_menstruation' | 'cycleRing_label_follicular' | 'cycleRing_label_ovulation' | 'cycleRing_label_luteal'> = {
  menstruation: 'cycleRing_label_menstruation',
  follicular:   'cycleRing_label_follicular',
  ovulation:    'cycleRing_label_ovulation',
  luteal:       'cycleRing_label_luteal',
}

function startOfMonthGrid(year: number, month: number): Date {
  const first = new Date(year, month, 1)
  // Week starts Monday — JS: Sun=0, so shift to Mon=0
  const dow = (first.getDay() + 6) % 7
  return new Date(year, month, 1 - dow)
}

/**
 * Site-look look of one cycle day: soft coral for period, soft green for the
 * fertile window (lighter when predicted), plus the ovulation flag (egg).
 * Shared by this grid and the agenda calendar.
 */
export function cycleSiteDay(
  cycleConfig: CycleConfig,
  date: string,
  today: string,
  s: ReturnType<typeof useTheme>['stickers'],
): { tint?: string; isOvulation: boolean } {
  const info = getCycleInfo(cycleConfig, date)
  const isPeriod = (info.phase as CyclePhase) === 'menstruation'
  const isOvulation = !isPeriod && info.cycleDay === info.ovulationDay
  const isFertile = !isPeriod && info.isFertile
  const isPredicted = date > today
  const tint = isPeriod ? s.coral + (isPredicted ? '22' : '44')
    : isFertile || isOvulation ? s.green + (isPredicted ? '33' : '66')
    : undefined
  return { tint, isOvulation }
}

/** Site-look legend: period swatch · fertile swatch · ovulation egg. */
export function CycleSiteLegend() {
  const { colors, stickers } = useTheme()
  const { t } = useTranslation()
  return (
    <View style={styles.siteLegend}>
      <View style={styles.legendItem}>
        <View style={[styles.legendSwatch, { backgroundColor: stickers.coral + '44' }]} />
        <Text style={[styles.siteLegendLabel, { color: colors.textMuted }]}>{t(PHASE_LEGEND_KEY.menstruation)}</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendSwatch, { backgroundColor: stickers.green + '66' }]} />
        <Text style={[styles.siteLegendLabel, { color: colors.textMuted }]}>{t('cycleOnboarding_predict_fertile')}</Text>
      </View>
      <View style={styles.legendItem}>
        <SiteSticker name="egg" size={13} />
        <Text style={[styles.siteLegendLabel, { color: colors.textMuted }]}>{t(PHASE_LEGEND_KEY.ovulation)}</Text>
      </View>
    </View>
  )
}

/**
 * Which cycle-log types were logged on each day in [start, end] — feeds the
 * "logged" dot on the month grid and on the shared agenda calendar.
 */
export function useCycleLogDates(start: string, end: string) {
  const [userId, setUserId] = useState<string | undefined>()
  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) =>
      setUserId(session?.user.id),
    )
  }, [])

  const { data: logs, isLoading } = useQuery({
    queryKey: ['cycleLogs', 'monthGrid', userId, start, end],
    queryFn: async (): Promise<{ date: string; type: string }[]> => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('cycle_logs')
        .select('date, type')
        .eq('user_id', userId)
        .gte('date', start)
        .lte('date', end)
      if (error) throw error
      return (data ?? []) as { date: string; type: string }[]
    },
    enabled: !!userId,
  })

  const logsByDate = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const l of logs ?? []) {
      const set = map.get(l.date) ?? new Set<string>()
      set.add(l.type)
      map.set(l.date, set)
    }
    return map
  }, [logs])

  return { logsByDate, isLoading: isLoading && !logs }
}

export function CycleMonthGrid({
  cycleConfig, selectedDate, visibleMonth, onSelectDate, onPrevMonth, onNextMonth,
}: Props) {
  const { colors, font, stickers, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const ink = isDark ? colors.text : '#141313'

  const today = toDateStr(new Date())

  // Build the 6×7 grid of dates
  const cells = useMemo(() => {
    const start = startOfMonthGrid(visibleMonth.year, visibleMonth.month)
    const arr: { date: string; day: number; inMonth: boolean }[] = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      arr.push({
        date: toDateStr(d),
        day: d.getDate(),
        inMonth: d.getMonth() === visibleMonth.month,
      })
    }
    return arr
  }, [visibleMonth.year, visibleMonth.month])

  // Month range for log fetch
  const monthStart = cells[0].date
  const monthEnd = cells[cells.length - 1].date
  const { logsByDate } = useCycleLogDates(monthStart, monthEnd)

  const monthLabel = new Date(visibleMonth.year, visibleMonth.month, 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // Days-of-month in menstruation phase → accent period dots on the dot grid.
  const periodDays = useMemo(() => {
    const out: number[] = []
    const daysInMonth = new Date(visibleMonth.year, visibleMonth.month + 1, 0).getDate()
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = toDateStr(new Date(visibleMonth.year, visibleMonth.month, d))
      if ((getCycleInfo(cycleConfig, dateStr).phase as CyclePhase) === 'menstruation') out.push(d)
    }
    return out
  }, [cycleConfig, visibleMonth.year, visibleMonth.month])

  if (diffuse) {
    // v4 `.dotcal`, enriched: each in-month day carries a soft phase-band bloom
    // (color = phase, intensity peaks at ovulation) + a tiny colored phase glyph
    // so the whole cycle arc reads at a glance. Selected day = accent ring +
    // bloom. Its own month nav drives the parent's visibleMonth so log-fetch +
    // day-detail stay in sync.
    const selDate = new Date(selectedDate + 'T00:00:00')
    const monthDate = new Date(visibleMonth.year, visibleMonth.month, 1)

    // Per-phase bloom intensity (0..1) — kept low overall so the wash reads as
    // a whisper of color. Ovulation is the relative peak; the long
    // follicular/luteal stretches sit furthest back.
    const phaseIntensity: Record<CyclePhase, number> = {
      menstruation: 0.7,
      follicular: 0.3,
      ovulation: 1,
      luteal: 0.32,
    }

    return (
      <View style={[styles.wrap, { backgroundColor: dt.colors.surface, borderColor: dt.colors.line }]}>
        <DiffuseDotCalendar
          value={selDate}
          month={monthDate}
          periodDays={periodDays}
          accent={getDiffuseAccent('pre-pregnancy', dt.isDark)}
          dayField={(date) => {
            const phase = getCycleInfo(cycleConfig, toDateStr(date)).phase as CyclePhase
            return { color: phaseAccent(phase, stickers), intensity: phaseIntensity[phase] }
          }}
          dayMarker={(date) => {
            const phase = getCycleInfo(cycleConfig, toDateStr(date)).phase as CyclePhase
            return <CyclePhaseGlyph phase={phase} color={phaseAccent(phase, stickers)} size={11} diffuse bg={dt.colors.surface} />
          }}
          onMonthChange={(d) => {
            // Keep the parent's visibleMonth (→ log fetch + period-day derivation) in sync.
            if (d < monthDate) onPrevMonth()
            else if (d > monthDate) onNextMonth()
          }}
          onChange={(d) => onSelectDate(toDateStr(d))}
        />

        {/* Delicate phase legend — colored glyph + mono-caps label. */}
        <View style={styles.legendRow}>
          {CYCLE_PHASE_ORDER.map((phase) => (
            <View key={phase} style={styles.legendItem}>
              <CyclePhaseGlyph phase={phase} color={phaseAccent(phase, stickers)} size={12} diffuse bg={dt.colors.surface} />
              <Text style={[styles.legendLabel, { color: dt.colors.ink3, fontFamily: diffuseFont.mono }]}>
                {t(PHASE_LEGEND_KEY[phase])}
              </Text>
            </View>
          ))}
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.wrap, styles.siteWrap, { backgroundColor: colors.surface, borderColor: colors.text }]}>
      <View style={styles.header}>
        <Pressable onPress={onPrevMonth} style={styles.navBtn} hitSlop={8}>
          <Text style={[styles.navText, { color: ink, fontFamily: font.bodyBold }]}>{t('common_chevronPrev')}</Text>
        </Pressable>
        <Text style={[styles.monthLabel, { color: ink, fontFamily: font.display, textTransform: 'uppercase', letterSpacing: 0.2 }]}>
          {monthLabel}
        </Text>
        <Pressable onPress={onNextMonth} style={styles.navBtn} hitSlop={8}>
          <Text style={[styles.navText, { color: ink, fontFamily: font.bodyBold }]}>{t('common_chevronNext')}</Text>
        </Pressable>
      </View>

      <View style={styles.dowRow}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <Text
            key={i}
            style={[styles.dow, { color: colors.textMuted, fontFamily: 'SpaceMono_400Regular' }]}
          >
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((c) => {
          const day = cycleSiteDay(cycleConfig, c.date, today, stickers)
          const isOvulation = day.isOvulation
          const isToday = c.date === today
          const isSelected = c.date === selectedDate
          const hasLogs = (logsByDate.get(c.date)?.size ?? 0) > 0
          const fill = !c.inMonth ? 'transparent' : (day.tint ?? 'transparent')

          return (
            <Pressable
              key={c.date}
              onPress={() => onSelectDate(c.date)}
              style={[styles.cell, { opacity: c.inMonth ? 1 : 0.3 }]}
            >
              <View
                style={[
                  styles.dayRing,
                  { borderColor: isToday ? colors.text : 'transparent' },
                ]}
              >
                <View
                  style={[
                    styles.dayDisc,
                    { backgroundColor: isSelected ? colors.text : fill },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNum,
                      {
                        color: isSelected ? colors.surface : colors.text,
                        fontFamily: isToday || isSelected ? font.bodyBold : font.bodyMedium,
                      },
                    ]}
                  >
                    {c.day}
                  </Text>
                </View>
                {c.inMonth && isOvulation ? (
                  <View style={styles.eggMark} pointerEvents="none">
                    <SiteSticker name="egg" size={13} />
                  </View>
                ) : null}
              </View>
              {c.inMonth && hasLogs ? <View style={[styles.logDot, { backgroundColor: colors.text }]} /> : null}
            </Pressable>
          )
        })}
      </View>

      <CycleSiteLegend />
    </View>
  )
}

const CELL_SIZE = 46

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  navBtn: {
    width: 32, height: 32, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
  },
  navText: { fontSize: 22, lineHeight: 24 },
  monthLabel: { fontSize: 19 },
  siteWrap: {
    borderRadius: 18,
    borderWidth: 1.5,
    shadowColor: '#161513',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 0,
  },
  dowRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  dow: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayRing: {
    width: 38, height: 38, borderRadius: 19, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  dayDisc: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  dayNum: { fontSize: 14, lineHeight: 18 },
  eggMark: { position: 'absolute', top: -5, right: -5 },
  logDot: { position: 'absolute', bottom: 0, width: 4, height: 4, borderRadius: 999 },
  siteLegend: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
    columnGap: 16, rowGap: 6, marginTop: 10,
  },
  legendSwatch: { width: 12, height: 12, borderRadius: 6 },
  siteLegendLabel: { fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: 'SpaceMono_400Regular' },

  // Diffuse phase legend
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingHorizontal: 2,
    rowGap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendLabel: {
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
})
