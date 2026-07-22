/**
 * QuickLogPickerGrid — the shared 2-column tile grid for the "What do you want
 * to track?" pickers (kids / pregnancy / cycle). One source of truth for tile
 * chrome + layout so all three pickers look identical and fit their full list on
 * one screen. Each picker supplies per-item icon + tint; this owns the rest.
 */
import React from 'react'
import { View, Pressable, Text, StyleSheet } from 'react-native'
import { Check } from 'lucide-react-native'
import { useTheme, radius } from '../../constants/theme'
import { Body } from '../ui/Typography'

export interface QuickLogGridItem {
  key: string
  label: string
  icon: React.ReactNode
  socketTint: string
  selected: boolean
  onToggle: () => void
}

export function QuickLogPickerGrid({ items }: { items: QuickLogGridItem[] }): React.ReactElement {
  const { colors } = useTheme()
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
