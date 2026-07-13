/**
 * AgendaWeekStrip — horizontal week strip used by pregnancy + pre-pregnancy.
 *
 * Top row: "APRIL" small-caps on left, "Week N →" tappable on right.
 * Grid: 7 day cells with weekday label, date number, and colored dots.
 * Selected day = filled circle in mode color. Today (if not selected) = amber.
 */

import { useRef } from 'react'
import { View, Text, Pressable, StyleSheet, PanResponder } from 'react-native'
import Animated, { SlideInRight, SlideInLeft } from 'react-native-reanimated'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react-native'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { MonoCaps, Body } from '../ui/Typography'
import { toDateStr } from '../../lib/cycleLogic'

interface AgendaWeekStripProps {
  selectedDate: string
  onSelectDate: (date: string) => void
  /** Map of date → list of dot colors to render under that day */
  dotsByDate?: Record<string, string[]>
  /** Caption on the right, e.g. "Week 16" — tappable */
  weekLabel?: string
  onWeekTap?: () => void
  /** Mode color for the selected day circle */
  modeColor: string
}

const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const TODAY_AMBER = '#F9D77E'
const ST_INK = '#141313'
const ST_YELLOW = '#F5D652'

function getWeekDates(centerDate: string): { date: Date; dateStr: string }[] {
  const center = new Date(centerDate + 'T00:00:00')
  const dow = center.getDay()
  const out: { date: Date; dateStr: string }[] = []
  // Start from Monday (per mock): offset so Mon is first
  const offsetToMon = dow === 0 ? -6 : 1 - dow
  for (let i = 0; i < 7; i++) {
    const d = new Date(center)
    d.setDate(center.getDate() + offsetToMon + i)
    out.push({ date: d, dateStr: toDateStr(d) })
  }
  return out
}

export function AgendaWeekStrip({
  selectedDate,
  onSelectDate,
  dotsByDate,
  weekLabel,
  onWeekTap,
  modeColor,
}: AgendaWeekStripProps) {
  const { colors, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const ink = diffuse ? dt.colors.ink : (isDark ? colors.text : '#141313')
  const textMuted = diffuse ? dt.colors.ink3 : (isDark ? colors.textMuted : '#6E6763')
  const paper = diffuse ? dt.colors.surface : (isDark ? colors.surface : '#FFFEF8')
  const paperBorder = diffuse ? dt.colors.line : (isDark ? colors.border : 'rgba(20,19,19,0.08)')

  const todayStr = toDateStr(new Date())
  const days = getWeekDates(selectedDate)
  const weekKey = days[0].dateStr
  const prevWeekKeyRef = useRef(weekKey)
  const direction = weekKey > prevWeekKeyRef.current ? 1 : weekKey < prevWeekKeyRef.current ? -1 : 0
  prevWeekKeyRef.current = weekKey

  const latest = useRef({ selectedDate, onSelectDate })
  latest.current = { selectedDate, onSelectDate }

  const stepWeek = (delta: number) => {
    const next = new Date(selectedDate + 'T00:00:00')
    next.setDate(next.getDate() + delta)
    onSelectDate(toDateStr(next))
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_, g) => {
        const delta = g.dx <= -40 ? 7 : g.dx >= 40 ? -7 : 0
        if (!delta) return
        const next = new Date(latest.current.selectedDate + 'T00:00:00')
        next.setDate(next.getDate() + delta)
        latest.current.onSelectDate(toDateStr(next))
      },
    })
  ).current

  // Month label = month of the first day in strip
  const monthLabel = days[0].date
    .toLocaleDateString('en-US', { month: 'long' })
    .toUpperCase()

  return (
    <View
      {...panResponder.panHandlers}
      style={[
        styles.container,
        {
          backgroundColor: paper,
          borderColor: paperBorder,
        },
      ]}
    >
      <View style={styles.captionRow}>
        <View style={styles.captionLeft}>
          <MonoCaps size={11} color={textMuted}>
            {monthLabel}
          </MonoCaps>
          <Pressable
            onPress={() => stepWeek(-7)}
            hitSlop={10}
            style={[styles.arrowBtn, { borderColor: paperBorder }]}
            accessibilityLabel="Previous week"
          >
            <ChevronLeft size={14} color={ink} strokeWidth={2.2} />
          </Pressable>
          <Pressable
            onPress={() => stepWeek(7)}
            hitSlop={10}
            style={[styles.arrowBtn, { borderColor: paperBorder }]}
            accessibilityLabel="Next week"
          >
            <ChevronRight size={14} color={ink} strokeWidth={2.2} />
          </Pressable>
        </View>
        {weekLabel ? (
          <Pressable
            onPress={onWeekTap}
            disabled={!onWeekTap}
            hitSlop={8}
            style={styles.weekChip}
          >
            <Body size={13} color={ink} style={[styles.weekLabel, diffuse ? { fontFamily: diffuseFont.display } : null]}>
              {weekLabel}
            </Body>
            {onWeekTap ? <ArrowRight size={13} color={ink} strokeWidth={2.2} /> : null}
          </Pressable>
        ) : null}
      </View>

      <Animated.View
        key={weekKey}
        entering={direction >= 0 ? SlideInRight.duration(220) : SlideInLeft.duration(220)}
        style={styles.grid}
      >
        {days.map(({ date, dateStr }) => {
          const isSelected = dateStr === selectedDate
          const isToday = dateStr === todayStr && !isSelected
          const dots = dotsByDate?.[dateStr] ?? []
          const selectedFill = modeColor || ST_YELLOW
          // Selected-day text: dark ink on the bright cream fill; under Diffuse
          // the soft accent fill still reads with ink text.
          const labelColor = isSelected ? (diffuse ? dt.colors.ink : ST_INK) : textMuted
          const numColor = isSelected ? (diffuse ? dt.colors.ink : ST_INK) : ink

          // Diffuse: soft accent fill + hairline, no hard black border/drop-shadow.
          const selectedStyle = diffuse
            ? { backgroundColor: selectedFill + '33', borderWidth: 1, borderColor: selectedFill }
            : {
                backgroundColor: selectedFill,
                borderWidth: 1.5,
                borderColor: ST_INK,
                shadowColor: ST_INK,
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 1,
                shadowRadius: 0,
                elevation: 4,
              }
          const todayStyle = diffuse
            ? { borderWidth: 1, borderColor: dt.colors.line2 }
            : { backgroundColor: TODAY_AMBER, borderWidth: 1.5, borderColor: ST_INK }

          return (
            <Pressable
              key={dateStr}
              onPress={() => onSelectDate(dateStr)}
              style={styles.cell}
            >
              <Text style={[styles.weekday, { color: labelColor, fontFamily: diffuse ? diffuseFont.mono : (isSelected ? 'DMSans_700Bold' : 'DMSans_500Medium') }]}>
                {DAY_INITIALS[date.getDay()]}
              </Text>
              <View
                style={[
                  styles.bubble,
                  isSelected && selectedStyle,
                  isToday && todayStyle,
                ]}
              >
                <Text style={[styles.num, { color: numColor, fontFamily: diffuse ? diffuseFont.display : undefined }]}>
                  {date.getDate()}
                </Text>
              </View>
              <View style={styles.dotRow}>
                {dots.slice(0, 3).map((c, i) => (
                  <View key={i} style={[styles.dot, { backgroundColor: c }]} />
                ))}
              </View>
            </Pressable>
          )
        })}
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
  },
  captionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  captionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  arrowBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  weekLabel: {
    letterSpacing: -0.1,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  weekday: {
    fontSize: 11,
    fontWeight: '500',
  },
  bubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  num: {
    fontSize: 14,
    fontWeight: '600',
  },
  dotRow: {
    flexDirection: 'row',
    gap: 2,
    height: 5,
    alignItems: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
})
