/**
 * MenopauseDayStrip — a horizontal "last 14 days" band for the Menopause home.
 *
 * The menopause behavior isn't cyclical, so the cycle phase-ring doesn't map.
 * This is the flat equivalent of cycle's date strip: a scrollable row of days
 * where a day you logged shows its symptom blob (accent), and an empty day shows
 * a muted dot — an at-a-glance "when did I have symptoms" visual. Today is ringed.
 * Purely visual for E1 (logging happens via the Quick-log chips below); tap-to-
 * backfill a past day is a later add.
 *
 * Dual-variant, tokens-only via the shared MenoPalette.
 */
import { useEffect, useMemo, useRef } from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { Character } from '../characters/Characters'
import { diffuseFont } from '../../constants/theme'
import { logTypeBlob } from './menopauseIcons'
import type { MenopauseLogRow } from '../../lib/menopauseAnalytics'
import type { MenoPalette } from './menoPalette'

const DAYS = 14

function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function MenopauseDayStrip({ rows, pal }: { rows: MenopauseLogRow[]; pal: MenoPalette }) {
  const scrollRef = useRef<ScrollView>(null)

  const days = useMemo(() => {
    const byDate = new Map<string, MenopauseLogRow[]>()
    for (const r of rows) {
      const arr = byDate.get(r.date) ?? []
      arr.push(r)
      byDate.set(r.date, arr)
    }
    const today = new Date()
    const todayStr = localDateStr(today)
    const out: { key: string; label: string; dayNum: string; isToday: boolean; logs: MenopauseLogRow[] }[] = []
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const key = localDateStr(d)
      out.push({
        key,
        label: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
        dayNum: String(d.getDate()),
        isToday: key === todayStr,
        logs: byDate.get(key) ?? [],
      })
    }
    return out
  }, [rows])

  // Land on today (right edge) once laid out, and again whenever new logs arrive.
  useEffect(() => {
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 60)
    return () => clearTimeout(id)
  }, [days.length])

  const weekdayFont = pal.diffuse ? diffuseFont.mono : pal.fontBodyMedium

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {days.map((day) => {
        const logged = day.logs.length > 0
        const topBlob = logged ? logTypeBlob(day.logs[0].type) : null
        return (
          <View key={day.key} style={styles.cell}>
            <Text style={[styles.weekday, { color: day.isToday ? pal.accent : pal.textMuted, fontFamily: weekdayFont }]}>
              {day.label}
            </Text>
            <View
              style={[
                styles.dot,
                logged
                  ? { backgroundColor: pal.accentSoft, borderColor: pal.accent }
                  : { backgroundColor: pal.surface, borderColor: pal.border },
                day.isToday ? { borderWidth: 2, borderColor: pal.accent } : null,
              ]}
            >
              {logged && topBlob ? (
                <Character name={topBlob} size={18} color={pal.accent} bg={pal.accentSoft} />
              ) : (
                <View style={[styles.emptyPip, { backgroundColor: pal.border }]} />
              )}
              {logged && day.logs.length > 1 ? (
                <View style={[styles.countBadge, { backgroundColor: pal.accent, borderColor: pal.bg }]}>
                  <Text style={[styles.countText, { color: pal.bg, fontFamily: weekdayFont }]}>{day.logs.length}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.dayNum, { color: day.isToday ? pal.text : pal.textMuted, fontFamily: pal.fontDisplay }]}>
              {day.dayNum}
            </Text>
          </View>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 4, paddingRight: 4 },
  cell: { alignItems: 'center', gap: 6, width: 40 },
  weekday: { fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' },
  dot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPip: { width: 5, height: 5, borderRadius: 2.5 },
  countBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  countText: { fontSize: 9, fontWeight: '700' },
  dayNum: { fontSize: 13, letterSpacing: -0.2 },
})
