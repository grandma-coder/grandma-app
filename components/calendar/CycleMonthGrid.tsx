/**
 * CycleMonthGrid — month calendar for the agenda → cycle tab.
 *
 * Mirrors the home wheel's visual language: each day cell is tinted by its
 * cycle phase, shows a small phase sticker, and renders tiny colored dots
 * for whatever was logged that day. Today gets a sparkle aura.
 *
 * Tap a day → calls onSelectDate. Selected day gets a phase-accent ring.
 */
import { useMemo } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useTheme } from '../../constants/theme'
import { supabase } from '../../lib/supabase'
import { getCycleInfo, toDateStr, type CycleConfig, type CyclePhase } from '../../lib/cycleLogic'
import { DaySticker } from '../home/cycle/dayStickers'

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

  // Fetch logs for the visible range
  const { data: logs = [] } = useQuery({
    queryKey: ['cycleLogs', 'monthGrid', monthStart, monthEnd],
    queryFn: async (): Promise<{ date: string; type: string }[]> => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return []
      const { data, error } = await supabase
        .from('cycle_logs')
        .select('date, type')
        .eq('user_id', session.user.id)
        .gte('date', monthStart)
        .lte('date', monthEnd)
      if (error) throw error
      return (data ?? []) as { date: string; type: string }[]
    },
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

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Pressable onPress={onPrevMonth} style={styles.navBtn} hitSlop={8}>
          <Text style={[styles.navText, { color: ink, fontFamily: font.bodyBold }]}>‹</Text>
        </Pressable>
        <Text style={[styles.monthLabel, { color: ink, fontFamily: font.display }]}>
          {monthLabel}
        </Text>
        <Pressable onPress={onNextMonth} style={styles.navBtn} hitSlop={8}>
          <Text style={[styles.navText, { color: ink, fontFamily: font.bodyBold }]}>›</Text>
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
})
