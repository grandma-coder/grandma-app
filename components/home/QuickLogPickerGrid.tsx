/**
 * QuickLogPickerGrid — the shared 2-column tile grid for the "What do you want
 * to track?" pickers (kids / pregnancy / cycle). One source of truth for tile
 * chrome + layout so all three pickers look identical and fit their full list on
 * one screen. Each picker supplies per-item icon + tint; this owns the rest.
 */
import React from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { Check } from 'lucide-react-native'
import { useTheme, radius, stickers } from '../../constants/theme'
import { Body } from '../ui/Typography'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'

export interface QuickLogGridItem {
  key: string
  label: string
  icon: React.ReactNode
  socketTint: string
  selected: boolean
  onToggle: () => void
}

export function QuickLogPickerGrid({ items }: { items: QuickLogGridItem[] }): React.ReactElement {
  const { colors, font, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  if (!diffuse) {
    // Site look: card-less sticker tiles. Selected = soft tone disc behind the
    // sticker + ink tick; label stays ink.
    return (
      <View style={styles.siteGrid}>
        {items.map((it) => {
          const tone = it.socketTint && it.socketTint !== 'transparent' ? it.socketTint : (isDark ? colors.surfaceRaised : stickers.yellowSoft)
          return (
            <Pressable
              key={it.key}
              onPress={it.onToggle}
              accessibilityRole="button"
              accessibilityState={{ selected: it.selected }}
              accessibilityLabel={it.label}
              style={({ pressed }) => [styles.siteTile, { opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={[styles.siteDisc, it.selected && { backgroundColor: tone, borderWidth: 1.5, borderColor: colors.text }]}>
                {it.icon}
                {it.selected ? (
                  <View style={[styles.siteTick, { backgroundColor: colors.surface, borderColor: colors.text }]}>
                    <Check size={11} color={colors.text} strokeWidth={3} />
                  </View>
                ) : null}
              </View>
              <Body size={13} color={colors.text} numberOfLines={2} style={[styles.siteLabel, { fontFamily: it.selected ? font.bodyBold : font.bodyMedium }]}>{it.label}</Body>
            </Pressable>
          )
        })}
      </View>
    )
  }
  return (
    <View style={styles.grid}>
      {items.map((it) => (
        <Pressable
          key={it.key}
          onPress={it.onToggle}
          accessibilityRole="button"
          accessibilityState={{ selected: it.selected }}
          accessibilityLabel={it.label}
          style={({ pressed }) => [
            styles.tile,
            { backgroundColor: colors.surface, borderColor: it.selected ? colors.text : colors.border, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <View style={[styles.socket, { backgroundColor: it.socketTint }]}>{it.icon}</View>
          <Body size={14} color={colors.text} numberOfLines={1} style={styles.label}>{it.label}</Body>
          <View style={[styles.badge, { borderColor: it.selected ? colors.text : colors.border, backgroundColor: it.selected ? colors.text : 'transparent' }]}>
            {it.selected ? <Check size={12} color={colors.bg} strokeWidth={3} /> : null}
          </View>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  siteGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  siteTile: { width: '33.333%', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  siteDisc: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  siteTick: { position: 'absolute', top: -2, right: -2, width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  siteLabel: { textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  socket: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  label: { flex: 1, minWidth: 0 },
  badge: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
})
