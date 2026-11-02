/**
 * AgendaCalendar — the one calendar frame for every journey's agenda (site look).
 *
 * A calm Week | Month toggle sits above one card. The card always has the same
 * outline, month label, arrow buttons, Space Mono weekday row, day cells, today
 * ring and selected marker; only the per-day decoration changes per journey:
 *   - cycle: phase tint (`dayTint`) + ovulation egg / log dot
 *   - menopause: the day's symptom sticker
 *   - pregnancy / kids: log dots
 * Week shows one row (the old AgendaWeekStrip look); Month shows the whole month
 * with the same cells. The arrows (and a horizontal swipe) step one week or one
 * month. The view choice is shared + persisted (useAgendaViewStore).
 *
 * Diffuse never renders this — each calendar keeps its own Diffuse primitives.
 */
import { useMemo, useState, type ReactNode } from 'react'
import { View, Text, Pressable, StyleSheet, PanResponder } from 'react-native'
import Animated, { SlideInRight, SlideInLeft } from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import { useAgendaViewStore, type AgendaView } from '../../store/useAgendaViewStore'
import { Skeleton } from '../ui/Skeleton'
import { agendaPeriodKey, dayStr, monthGridDates, parseDay, shiftAgendaDate, weekDates } from './agendaDates'

const MONO = 'SpaceMono_400Regular'
const FALLBACK_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

interface AgendaCalendarProps {
  selectedDate: string
  onSelectDate: (date: string) => void
  /** Journey soft tone — fills the selected day and the active toggle half. */
  tone: string
  /** Optional soft background for a day (cycle phase tint). */
  dayTint?: (date: string) => string | undefined
  /** Small mark under the day number (dots, sticker, egg). */
  renderDayDecoration?: (date: string) => ReactNode
  /** First load with no data yet → skeleton days instead of empty ones. */
  loading?: boolean
  /** Quiet eyebrow on the left of the toggle row, e.g. "Week 16". */
  caption?: string
  /** Rendered inside the card under the grid (cycle legend). */
  footer?: ReactNode
}

function safeDate(d: Date, lang: string, opts: Intl.DateTimeFormatOptions): string {
  try {
    return d.toLocaleDateString(lang, opts)
  } catch {
    return d.toLocaleDateString('en-US', opts)
  }
}

export function AgendaCalendar({
  selectedDate,
  onSelectDate,
  tone,
  dayTint,
  renderDayDecoration,
  loading = false,
  caption,
  footer,
}: AgendaCalendarProps) {
  const { colors, font } = useTheme()
  const { t, language } = useTranslation()
  const view = useAgendaViewStore((s) => s.view)
  const setView = useAgendaViewStore((s) => s.setView)

  const todayStr = dayStr(new Date())
  const cells = useMemo(
    () => (view === 'week'
      ? weekDates(selectedDate).map((date) => ({ date, inMonth: true }))
      : monthGridDates(selectedDate)),
    [view, selectedDate],
  )

  // Slide direction follows the period we moved to (previous-render state pattern).
  const periodKey = `${view}:${agendaPeriodKey(selectedDate, view)}`
  const [slide, setSlide] = useState({ key: periodKey, dir: 0 })
  if (slide.key !== periodKey) setSlide({ key: periodKey, dir: periodKey > slide.key ? 1 : -1 })
  const direction = slide.dir

  const step = (dir: 1 | -1) => onSelectDate(shiftAgendaDate(selectedDate, view, dir))
  // Horizontal swipe steps one period too. Rebuilt when the period inputs change
  // (only between gestures — the day changes on release).
  const panResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_, g) => {
        if (g.dx <= -40) onSelectDate(shiftAgendaDate(selectedDate, view, 1))
        else if (g.dx >= 40) onSelectDate(shiftAgendaDate(selectedDate, view, -1))
      },
    }),
    [onSelectDate, selectedDate, view],
  )

  const monthLabel = safeDate(parseDay(selectedDate), language, { month: 'long', year: 'numeric' })
  const initials = useMemo(() => FALLBACK_INITIALS.map((fallback, i) => {
    // 2024-01-01 is a Monday.
    const s = safeDate(new Date(2024, 0, 1 + i, 12), language, { weekday: 'narrow' })
    return s && s.length <= 2 ? s : fallback
  }), [language])

  const periodWord = view === 'week' ? 'week' : 'month'
  const rows = cells.length / 7

  return (
    <View>
      {/* Toggle row — same place in every journey */}
      <View style={styles.toggleRow}>
        <Text numberOfLines={1} style={[styles.caption, { color: colors.textMuted }]}>
          {caption ?? ''}
        </Text>
        <ViewToggle
          value={view}
          onChange={setView}
          tone={tone}
          labels={{ week: t('kids_calendar_viewWeek'), month: t('kids_calendar_viewMonth') }}
        />
      </View>

      <View
        {...panResponder.panHandlers}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.text, shadowColor: colors.text }]}
      >
        <View style={styles.head}>
          <Text
            numberOfLines={1}
            style={[styles.month, { color: colors.text, fontFamily: font.display }]}
          >
            {monthLabel}
          </Text>
          <View style={styles.arrows}>
            <ArrowBtn dir={-1} onPress={() => step(-1)} label={`Previous ${periodWord}`} />
            <ArrowBtn dir={1} onPress={() => step(1)} label={`Next ${periodWord}`} />
          </View>
        </View>

        <View style={styles.dowRow}>
          {initials.map((d, i) => (
            <Text key={i} style={[styles.dow, { color: colors.textMuted }]}>{d}</Text>
          ))}
        </View>

        {loading ? (
          <View style={styles.grid}>
            {Array.from({ length: rows * 7 }, (_, i) => (
              <View key={i} style={styles.cell}>
                <Skeleton width={30} height={30} radius={15} style={{ marginTop: 2 }} />
              </View>
            ))}
          </View>
        ) : (
          <Animated.View
            key={periodKey}
            entering={direction >= 0 ? SlideInRight.duration(220) : SlideInLeft.duration(220)}
            style={styles.grid}
          >
            {cells.map(({ date, inMonth }) => {
              const isSelected = date === selectedDate
              const isToday = date === todayStr
              const tint = inMonth ? dayTint?.(date) : undefined
              return (
                <Pressable
                  key={date}
                  onPress={() => onSelectDate(date)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={safeDate(parseDay(date), language, { weekday: 'long', month: 'long', day: 'numeric' })}
                  style={[styles.cell, { opacity: inMonth ? 1 : 0.3 }]}
                >
                  <View
                    style={[
                      styles.bubble,
                      tint ? { backgroundColor: tint } : null,
                      isSelected && { backgroundColor: tone, borderWidth: 1.5, borderColor: colors.text },
                      isToday && { borderWidth: 2, borderColor: colors.text },
                      isToday && !isSelected && !tint && { backgroundColor: colors.surface },
                    ]}
                  >
                    <Text
                      style={[
                        styles.num,
                        { color: colors.text, fontFamily: isSelected || isToday ? font.bodyBold : font.bodyMedium },
                      ]}
                    >
                      {parseDay(date).getDate()}
                    </Text>
                  </View>
                  <View style={styles.deco}>
                    {inMonth && renderDayDecoration ? renderDayDecoration(date) : null}
                  </View>
                </Pressable>
              )
            })}
          </Animated.View>
        )}

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </View>
  )
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

function ArrowBtn({ dir, onPress, label }: { dir: 1 | -1; onPress: () => void; label: string }) {
  const { colors } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.arrowBtn,
        { borderColor: colors.text, backgroundColor: colors.surface, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Ionicons name={dir < 0 ? 'chevron-back' : 'chevron-forward'} size={15} color={colors.text} />
    </Pressable>
  )
}

/** Compact Week | Month switch — the agenda segmented style, smaller. */
function ViewToggle({
  value,
  onChange,
  tone,
  labels,
}: {
  value: AgendaView
  onChange: (v: AgendaView) => void
  tone: string
  labels: Record<AgendaView, string>
}) {
  const { colors, font } = useTheme()
  return (
    <View style={[styles.toggle, { borderColor: colors.text, backgroundColor: colors.surface }]}>
      {(['week', 'month'] as const).map((k) => {
        const active = value === k
        return (
          <Pressable
            key={k}
            onPress={() => onChange(k)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            hitSlop={4}
            style={[
              styles.toggleSeg,
              active && { backgroundColor: tone, borderWidth: 1.5, borderColor: colors.text },
            ]}
          >
            <Text
              numberOfLines={1}
              style={{ fontFamily: active ? font.bodyBold : font.bodyMedium, fontSize: 12, color: colors.text }}
            >
              {labels[k]}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

/** One small round mark under a day number. */
export function AgendaDot({ color, outline }: { color: string; outline?: string }) {
  return <View style={[styles.dot, { backgroundColor: color }, outline ? { borderWidth: 0.5, borderColor: outline } : null]} />
}

/** Up to `max` dots in a row — the pregnancy / kids decoration. */
export function AgendaDots({ colors: dotColors, max = 3 }: { colors: string[]; max?: number }) {
  if (dotColors.length === 0) return null
  return (
    <View style={styles.dotRow}>
      {dotColors.slice(0, max).map((c, i) => <AgendaDot key={i} color={c} />)}
    </View>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

export const AGENDA_CELL_HEIGHT = 52

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  caption: {
    flexShrink: 1,
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  toggle: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderRadius: 999,
    padding: 2,
  },
  toggleSeg: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    // Room for the bold (selected) label so it never truncates to "Mon…".
    minWidth: 68,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderWidth: 1.5,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 0,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  month: {
    flexShrink: 1,
    fontSize: 18,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  arrows: {
    flexDirection: 'row',
    gap: 8,
  },
  arrowBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dowRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dow: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    height: AGENDA_CELL_HEIGHT,
    alignItems: 'center',
    paddingTop: 2,
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
  },
  deco: {
    height: 12,
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotRow: {
    flexDirection: 'row',
    gap: 2,
    alignItems: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  footer: {
    marginTop: 8,
  },
})
