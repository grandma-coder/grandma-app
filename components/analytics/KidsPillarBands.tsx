/**
 * KidsPillarBands — the pillar breakdown as editorial color-banded rows.
 *
 * Diffuse-only. The 6 pillars as soft-tint bands, SORTED lowest-score-first
 * (what needs attention on top; no-data last). Each row: a single-stroke
 * LineIcon in the pillar hue · pillar name (serif) · a one-line human takeaway
 * (from the existing Grandma tips) · a big bold number. The top row is the
 * "focus" — larger. Tapping a row drills into that pillar's detail.
 *
 * Presentational: takes plain items + onPillarPress; reads only Diffuse tokens.
 * Rendered inside a `useIsDiffuse()` branch by the caller.
 */

import { ReactNode } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useDiffuseTheme, diffuseFont } from '../../constants/theme'
import type { PillarScore } from '../../lib/analyticsData'

export interface PillarBandItem {
  key: string
  label: string
  color: string          // deep pillar hue (icon + accents)
  softColor: string      // *Soft band background
  score: PillarScore | undefined
  takeaway?: string      // short human line under the name
  icon: (size: number, color: string) => ReactNode
}

interface Props {
  items: PillarBandItem[]
  onPillarPress: (key: string) => void
}

// Sort: has-data ascending by score (worst first), then no-data pillars last.
function sortLowestFirst(items: PillarBandItem[]): PillarBandItem[] {
  return [...items].sort((a, b) => {
    const av = a.score?.hasData ? a.score.value : Infinity
    const bv = b.score?.hasData ? b.score.value : Infinity
    return av - bv
  })
}

// Diffuse wants a whisper of the pillar hue, not a saturated block. Render the
// soft tint at low alpha over the paper canvas so bands read muted + editorial.
// The *Soft tokens are 6-digit hex → append an alpha byte.
const BAND_ALPHA = '3A' // ~23%
function mute(hex: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex + BAND_ALPHA : hex
}

export function KidsPillarBands({ items, onPillarPress }: Props) {
  const { colors } = useDiffuseTheme()
  const sorted = sortLowestFirst(items)

  return (
    <View style={[styles.wrap, { borderColor: colors.line, backgroundColor: colors.surface }]}>
      {sorted.map((item, i) => {
        const has = !!item.score?.hasData
        const focus = i === 0 // top row = needs-attention focus
        const ink = colors.ink
        return (
          <Pressable
            key={item.key}
            onPress={() => onPillarPress(item.key)}
            style={({ pressed }) => [
              styles.band,
              focus && styles.bandFocus,
              { backgroundColor: mute(item.softColor), opacity: pressed ? 0.85 : 1 },
              i > 0 && { borderTopWidth: 1, borderTopColor: colors.line },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${item.label}${has ? `, ${item.score!.value.toFixed(1)} out of 10` : ', no data'}. ${item.takeaway ?? ''}`}
          >
            <View style={styles.icon}>{item.icon(focus ? 24 : 22, item.color)}</View>
            <View style={styles.mid}>
              <Text style={[styles.name, focus && styles.nameFocus, { color: ink }]} numberOfLines={1}>
                {item.label}
              </Text>
              {item.takeaway ? (
                <Text style={[styles.takeaway, { color: colors.ink2 }]} numberOfLines={1}>
                  {item.takeaway}
                </Text>
              ) : null}
            </View>
            <Text style={[styles.value, focus && styles.valueFocus, { color: has ? ink : colors.ink3 }]}>
              {has ? item.score!.value.toFixed(1) : '—'}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  band: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  bandFocus: {
    paddingVertical: 18,
  },
  icon: { width: 24, alignItems: 'center', justifyContent: 'center' },
  mid: { flex: 1 },
  name: {
    fontFamily: diffuseFont.display,
    fontSize: 19,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  nameFocus: { fontSize: 22 },
  takeaway: {
    fontFamily: diffuseFont.body,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
  },
  value: {
    fontFamily: diffuseFont.bodyBold,
    fontSize: 32,
    letterSpacing: -1.2,
  },
  valueFocus: { fontSize: 40 },
})
