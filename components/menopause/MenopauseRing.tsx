/**
 * MenopauseRing — the menopause home "wheel", the flat-time analogue of cycle's
 * CycleJourneyRingFull. 28 day-nodes sit on a hairline ring; a day you logged
 * carries its symptom blob (Ember), a day with nothing shows a soft check ("all
 * clear"), today is ringed. The stage + months-since-last-period counter lives in
 * the center. Purely visual for E1 (logging happens via the Quick-log chips).
 *
 * Dual-variant, tokens-only via the shared MenoPalette.
 */
import { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Character } from '../characters/Characters'
import { diffuseFont } from '../../constants/theme'
import { logTypeBlob } from './menopauseIcons'
import type { MenopauseLogRow } from '../../lib/menopauseAnalytics'
import type { MenoPalette } from './menoPalette'

const DAYS = 28
const SIZE = 320
const NODE = 30
const R = SIZE / 2 - NODE / 2 - 6 // node-center radius

function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function MenopauseRing({
  rows,
  pal,
  stageLabel,
  months,
  monthsCaption,
}: {
  rows: MenopauseLogRow[]
  pal: MenoPalette
  stageLabel: string
  months: number | null
  monthsCaption: string
}) {
  const nodes = useMemo(() => {
    const byDate = new Map<string, MenopauseLogRow[]>()
    for (const r of rows) {
      const a = byDate.get(r.date) ?? []
      a.push(r)
      byDate.set(r.date, a)
    }
    const today = new Date()
    const todayStr = localDateStr(today)
    const c = SIZE / 2
    const out: { key: string; x: number; y: number; isToday: boolean; logs: MenopauseLogRow[] }[] = []
    for (let i = 0; i < DAYS; i++) {
      // Today at 12 o'clock; older days proceed clockwise back in time.
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const key = localDateStr(d)
      const angle = (-90 + (i * 360) / DAYS) * (Math.PI / 180)
      out.push({
        key,
        x: c + R * Math.cos(angle) - NODE / 2,
        y: c + R * Math.sin(angle) - NODE / 2,
        isToday: key === todayStr,
        logs: byDate.get(key) ?? [],
      })
    }
    return out
  }, [rows])

  return (
    <View style={styles.wrap}>
      {/* Hairline guide ring the nodes are threaded on. */}
      <View style={[styles.guide, { borderColor: pal.border }]} />

      {/* Center counter — stage + months-since-last-period. */}
      <View style={styles.center} pointerEvents="none">
        <Text
          style={[
            styles.stage,
            { color: pal.accent, fontFamily: pal.diffuse ? diffuseFont.mono : pal.fontBodySemiBold },
          ]}
          numberOfLines={1}
        >
          {stageLabel.toUpperCase()}
        </Text>
        <Text style={[styles.number, { color: pal.text, fontFamily: pal.fontDisplay }]}>
          {months === null ? '—' : months}
        </Text>
        <Text style={[styles.caption, { color: pal.textMuted, fontFamily: pal.fontBody }]} numberOfLines={2}>
          {monthsCaption}
        </Text>
      </View>

      {/* Day nodes. */}
      {nodes.map((n) => {
        const logged = n.logs.length > 0
        const blob = logged ? logTypeBlob(n.logs[0].type) : null
        return (
          <View
            key={n.key}
            style={[
              styles.node,
              { left: n.x, top: n.y },
              logged
                ? { backgroundColor: pal.accentSoft, borderColor: pal.accent }
                : { backgroundColor: pal.surface, borderColor: pal.border },
              n.isToday ? { borderWidth: 2, borderColor: pal.accent } : null,
            ]}
          >
            {logged && blob ? (
              <Character name={blob} size={16} color={pal.accent} bg={pal.accentSoft} />
            ) : (
              <Ionicons name="checkmark" size={13} color={n.isToday ? pal.accent : pal.textMuted} />
            )}
          </View>
        )
      })}
    </View>
  )
}

const CENTER_BOX = 200

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE, alignSelf: 'center' },
  guide: {
    position: 'absolute',
    width: 2 * R,
    height: 2 * R,
    left: SIZE / 2 - R,
    top: SIZE / 2 - R,
    borderRadius: R,
    borderWidth: 1,
  },
  center: {
    position: 'absolute',
    width: CENTER_BOX,
    height: CENTER_BOX,
    left: (SIZE - CENTER_BOX) / 2,
    top: (SIZE - CENTER_BOX) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  stage: { fontSize: 11, letterSpacing: 1, textAlign: 'center' },
  number: { fontSize: 60, lineHeight: 64, letterSpacing: -1 },
  caption: { fontSize: 12.5, lineHeight: 17, textAlign: 'center', maxWidth: 150 },
  node: {
    position: 'absolute',
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
