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
import { DaySticker } from '../home/cycle/dayStickers'
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

const LOG_DOT_COLOR: Record<string, string> = {
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

function phaseTint(phase: CyclePhase, s: ReturnType<typeof useTheme>['stickers']): string {
  switch (phase) {
    case 'menstruation': return s.pinkSoft
    case 'follicular':   return s.greenSoft
    case 'ovulation':    return s.peachSoft
    case 'luteal':       return s.lilacSoft
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

export function CycleMonthGrid({
  cycleConfig, selectedDate, visibleMonth, onSelectDate, onPrevMonth, onNextMonth,
}: Props) {
  const { colors, font, stickers, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const ink = isDark ? colors.text : '#141313'

  const today = toDateStr(new Date())

  const [userId, setUserId] = useState<string | undefined>()
  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) =>
      setUserId(session?.user.id),
    )
  }, [])

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

  // Fetch logs for the visible range
  const { data: logs = [] } = useQuery({
    queryKey: ['cycleLogs', 'monthGrid', userId, monthStart, monthEnd],
    queryFn: async (): Promise<{ date: string; type: string }[]> => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('cycle_logs')
        .select('date, type')
        .eq('user_id', userId)
        .gte('date', monthStart)
        .lte('date', monthEnd)
      if (error) throw error
      return (data ?? []) as { date: string; type: string }[]
    },
    enabled: !!userId,
  })

  const logsByDate = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const l of logs) {
      const set = map.get(l.date) ?? new Set<string>()
      set.add(l.type)
      map.set(l.date, set)
    }
    return map
  }, [logs])

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

    // Per-phase bloom intensity — ovulation is the peak, period strong, the
    // long follicular/luteal stretches sit back so they don't overwhelm.
    const phaseIntensity: Record<CyclePhase, number> = {
      menstruation: 0.85,
      follicular: 0.4,
      ovulation: 1,
      luteal: 0.45,
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
            return <CyclePhaseGlyph phase={phase} color={phaseAccent(phase, stickers)} size={11} />
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
              <CyclePhaseGlyph phase={phase} color={phaseAccent(phase, stickers)} size={12} />
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
    <View style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Pressable onPress={onPrevMonth} style={styles.navBtn} hitSlop={8}>
          <Text style={[styles.navText, { color: ink, fontFamily: font.bodyBold }]}>{t('common_chevronPrev')}</Text>
        </Pressable>
        <Text style={[styles.monthLabel, { color: ink, fontFamily: font.display }]}>
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
            style={[styles.dow, { color: colors.textFaint, fontFamily: font.bodySemiBold }]}
          >
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((c) => {
          const info = getCycleInfo(cycleConfig, c.date)
          const phase = info.phase as CyclePhase
          const accent = phaseAccent(phase, stickers)
          const tint = phaseTint(phase, stickers)
          const isToday = c.date === today
          const isSelected = c.date === selectedDate
          const dayLogs = logsByDate.get(c.date) ?? new Set()

          return (
            <Pressable
              key={c.date}
              onPress={() => onSelectDate(c.date)}
              style={[
                styles.cell,
                {
                  backgroundColor: c.inMonth ? tint : 'transparent',
                  opacity: c.inMonth ? 1 : 0.35,
                  borderColor: isSelected ? '#141313' : 'transparent',
                  borderWidth: isSelected ? 1.5 : 0,
                },
              ]}
            >
              <Text
                style={[
                  styles.dayNum,
                  {
                    color: c.inMonth ? ink : colors.textFaint,
                    fontFamily: font.bodySemiBold,
                  },
                ]}
              >
                {c.day}
              </Text>

              {c.inMonth ? (
                <View style={styles.stickerSlot}>
                  <DaySticker phase={phase} size={14} bg={accent} />
                </View>
              ) : null}

              {c.inMonth && dayLogs.size > 0 ? (
                <View style={styles.dotsRow}>
                  {[...dayLogs].slice(0, 3).map((type) => (
                    <View
                      key={type}
                      style={[
                        styles.logDot,
                        { backgroundColor: LOG_DOT_COLOR[type] ?? '#888' },
                      ]}
                    />
                  ))}
                </View>
              ) : null}

              {isToday ? (
                <View
                  style={[
                    styles.todayRing,
                    { borderColor: accent },
                  ]}
                  pointerEvents="none"
                />
              ) : null}
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const CELL_SIZE = 44

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
  monthLabel: { fontSize: 17 },
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
    justifyContent: 'flex-start',
    paddingTop: 4,
    borderRadius: 10,
    position: 'relative',
  },
  dayNum: { fontSize: 11, lineHeight: 13 },
  stickerSlot: { marginTop: 2 },
  dotsRow: {
    flexDirection: 'row',
    gap: 2,
    position: 'absolute',
    bottom: 3,
  },
  logDot: { width: 4, height: 4, borderRadius: 999 },
  todayRing: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },

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
