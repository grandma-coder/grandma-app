import React from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { useTheme } from '../../constants/theme'
import * as Stickers from '../ui/Stickers'

export type StickerName =
  | 'Burst'
  | 'Heart'
  | 'Drop'
  | 'Star'
  | 'Moon'
  | 'Leaf'
  | 'Flower'
  | 'Cross'

export interface BadgeEntry {
  color: string
  sticker: StickerName
  label: string
}

interface BadgesStripProps {
  badges: BadgeEntry[]
  total: number
  onSeeAll?: () => void
}

/**
 * Paper card with "BADGES" header + "All N →" link, followed by a
 * horizontal row of 58px circles each containing a sticker + day label.
 */
export function BadgesStrip({ badges, total, onSeeAll }: BadgesStripProps) {
  const { colors, radius } = useTheme()

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.lg,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.headerLabel, { color: colors.textMuted }]}>BADGES</Text>
        <Pressable onPress={onSeeAll} hitSlop={8}>
          <Text style={[styles.allLink, { color: colors.textMuted }]}>
            All {total} →
          </Text>
        </Pressable>
      </View>

      {badges.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View
            style={[
              styles.circle,
              { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
            ]}
          />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No badges yet
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {badges.map((b, i) => {
            const Sticker = Stickers[b.sticker] as React.ComponentType<{ size?: number; fill?: string }>
            return (
              <View key={i} style={styles.item}>
                <View
                  style={[
                    styles.circle,
                    {
                      backgroundColor: colors.surfaceRaised,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Sticker size={40} fill={b.color} />
                </View>
                <Text style={[styles.dayLabel, { color: colors.textMuted }]}>
                  {b.label}
                </Text>
              </View>
            )
          })}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 18,
    padding: 16,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  allLink: { fontSize: 11, fontWeight: '500' },
  scrollContent: { gap: 10, paddingRight: 10 },
  item: { alignItems: 'center' },
  circle: {
    width: 58,
    height: 58,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabel: { fontSize: 10, marginTop: 4 },
  emptyWrap: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 12 },
})
