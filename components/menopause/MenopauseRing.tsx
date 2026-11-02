/**
 * MenopauseRing — the menopause home "wheel", the flat-time analogue of cycle's
 * CycleJourneyRingFull. 28 day-nodes sit on a hairline ring; a day you logged
 * carries its symptom blob (Ember), a day with nothing shows a soft green check
 * ("all clear"), today is ringed. The stage + months-since-last-period counter
 * lives in the center. Purely visual for E1 (logging happens via the Quick-log
 * chips). Dual-variant, tokens-only via the shared MenoPalette + sticker palette.
 */
import { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Character } from '../characters/Characters'
import { diffuseFont, useTheme } from '../../constants/theme'
import { logTypeBlob, symptomStickerKey } from './menopauseIcons'
import { SiteSticker } from '../stickers/SiteSticker'
import { menoSticker } from './MenopauseLogSheet'
import type { MenopauseLogRow } from '../../lib/menopauseAnalytics'
import type { MenoPalette } from './menoPalette'

const DAYS = 28
const SIZE = 280
const NODE = 24
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
  // Sticker palette is shared across both variants (stickers stay active under
  // Diffuse) — used only for the soft "all clear" check tone.
  const { stickers, colors, font } = useTheme()
  const checkColor = stickers.greenInk
  const sticker = stickers as Record<string, string>

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
      {!pal.diffuse ? (
      <View style={styles.center} pointerEvents="none">
        <Text style={{ fontSize: 10, letterSpacing: 1.4, textAlign: 'center', color: colors.textMuted, fontFamily: 'SpaceMono_400Regular' }} numberOfLines={1}>
          {stageLabel.toUpperCase()}
        </Text>
        <Text style={{ fontSize: 64, lineHeight: 70, color: colors.text, fontFamily: font.displayBold }}>
          {months === null ? '—' : months}
        </Text>
        <Text style={[styles.caption, { color: colors.textSecondary, fontFamily: font.body }]} numberOfLines={2}>
          {monthsCaption}
        </Text>
      </View>
      ) : (
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
      )}

      {/* Day nodes. */}
      {nodes.map((n) => {
        const logged = n.logs.length > 0
        const blob = logged ? logTypeBlob(n.logs[0].type) : null
        const key = logged ? symptomStickerKey(n.logs[0].type) : null
        const hue = key ? sticker[key] : pal.accent
        const hueSoft = key ? sticker[`${key}Soft`] : pal.accentSoft
        const hueInk = key ? sticker[`${key}Ink`] : pal.accent
        if (!pal.diffuse) {
          // Site look: quiet ink-outlined dots; a logged day carries its sticker on a soft tone.
          return (
            <View
              key={n.key}
              style={[
                styles.node,
                { left: n.x, top: n.y },
                logged
                  ? { backgroundColor: hueSoft, borderColor: colors.text, borderWidth: 1.5 }
                  : { backgroundColor: colors.surface, borderColor: colors.textFaint, borderWidth: 1 },
                n.isToday ? { borderWidth: 2, borderColor: colors.text } : null,
              ]}
            >
              {logged ? (
                <SiteSticker name={menoSticker(n.logs[0].type)} size={16} />
              ) : n.isToday ? (
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.text }} />
              ) : null}
            </View>
          )
        }
        return (
          <View
            key={n.key}
            style={[
              styles.node,
              { left: n.x, top: n.y },
              logged
                ? { backgroundColor: hueSoft, borderColor: hue }
                : { backgroundColor: pal.surface, borderColor: pal.border },
              n.isToday ? { borderWidth: 2, borderColor: pal.accent } : null,
            ]}
          >
            {logged && blob ? (
              <Character name={blob} size={14} color={hueInk} bg={hueSoft} />
            ) : (
              <Ionicons name="checkmark" size={12} color={n.isToday ? pal.accent : checkColor} />
            )}
          </View>
        )
      })}
    </View>
  )
}

const CENTER_BOX = 176

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
  stage: { fontSize: 10.5, letterSpacing: 1, textAlign: 'center' },
  number: { fontSize: 48, lineHeight: 52, letterSpacing: -1 },
  caption: { fontSize: 12, lineHeight: 16, textAlign: 'center', maxWidth: 138 },
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
