/**
 * LogMonthGrid — the standard month calendar for the pregnancy + kids agenda.
 *
 * A mode-agnostic wrapper around the shared DiffuseDotCalendar. Each in-month
 * day renders up to `MAX_ICONS` tiny Character blobs (deduped by log type) plus
 * a "+N" overflow chip when the day has more distinct types. Tap a day →
 * onSelectDate; the parent shows that day's full log list below.
 *
 * Diffuse-only (Diffuse is the default variant). The cream-paper path keeps the
 * compact week strip, so this component assumes the Diffuse theme.
 */
import { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../../constants/theme'
import { DiffuseDotCalendar } from '../ui/diffuse/DiffusePrimitives'
import { Character } from '../characters/Characters'
import { DIFFUSE_LOG_CHARACTER, diffuseLogHue } from './DiffuseLogTimeline'
import { toDateStr } from '../../lib/cycleLogic'

const MAX_ICONS = 3

interface Props {
  /** YYYY-MM-DD selected day. */
  selectedDate: string
  /** Month/year being viewed. month is 0-11. */
  visibleMonth: { year: number; month: number }
  onSelectDate: (date: string) => void
  onPrevMonth: () => void
  onNextMonth: () => void
  /** date (YYYY-MM-DD) → the distinct log types logged that day, in priority
   *  order (first = most important). Dedupe upstream. */
  logsByDate: Map<string, string[]>
  /** 'kids' | 'pregnancy' — drives the accent. */
  mode: 'kids' | 'preg'
}

export function LogMonthGrid({
  selectedDate, visibleMonth, onSelectDate, onPrevMonth, onNextMonth, logsByDate, mode,
}: Props) {
  const { colors, isDark } = useDiffuseTheme()
  const accent = getDiffuseAccent(mode, isDark)

  const selDate = useMemo(() => new Date(selectedDate + 'T00:00:00'), [selectedDate])
  const monthDate = useMemo(() => new Date(visibleMonth.year, visibleMonth.month, 1), [visibleMonth.year, visibleMonth.month])

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <DiffuseDotCalendar
        value={selDate}
        month={monthDate}
        accent={accent}
        onChange={(d) => onSelectDate(toDateStr(d))}
        onMonthChange={(first) => {
          // fire prev/next based on direction vs the current visible month
          if (first.getFullYear() < visibleMonth.year || (first.getFullYear() === visibleMonth.year && first.getMonth() < visibleMonth.month)) {
            onPrevMonth()
          } else {
            onNextMonth()
          }
        }}
        dayMarker={(date) => {
          const types = logsByDate.get(toDateStr(date))
          if (!types || types.length === 0) return null
          const shown = types.slice(0, MAX_ICONS)
          const overflow = types.length - shown.length
          return (
            <View style={styles.markerRow}>
              {shown.map((type, i) => {
                const char = DIFFUSE_LOG_CHARACTER[type]
                if (!char) return <View key={i} style={[styles.fallbackDot, { backgroundColor: diffuseLogHue(type) }]} />
                return <Character key={i} name={char} size={9} color={diffuseLogHue(type)} />
              })}
              {overflow > 0 ? (
                <Text style={[styles.overflow, { color: colors.ink3, fontFamily: diffuseFont.mono }]}>+{overflow}</Text>
              ) : null}
            </View>
          )
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 10,
  },
  markerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1.5,
  },
  fallbackDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  overflow: {
    fontSize: 8,
    letterSpacing: 0.2,
    marginLeft: 1,
  },
})
