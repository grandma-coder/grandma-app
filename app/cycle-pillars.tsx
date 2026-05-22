/**
 * /cycle-pillars — index of all 6 pre-pregnancy pillars.
 *
 * Reached via the "See all" link on CyclePillarsGrid.
 * Each tile routes to /pillar/[id].
 */

import { View, ScrollView, Text, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../constants/theme'
import { prePregPillars } from '../lib/prePregPillars'
import { getPillarSticker } from '../lib/pillarStickerMap'
import { Display, Body } from '../components/ui/Typography'

const TINT_BY_INDEX = ['greenSoft', 'lilacSoft', 'peachSoft', 'blueSoft', 'yellowSoft', 'pinkSoft'] as const

export default function CyclePillarsIndex() {
  const insets = useSafeAreaInsets()
  const { colors, stickers, font, radius, isDark } = useTheme()
  const ink = isDark ? colors.text : '#141313'

  function tintFor(i: number): string {
    const key = TINT_BY_INDEX[i % TINT_BY_INDEX.length]
    return (stickers as any)[key]
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.back()}
          style={[styles.back, { backgroundColor: colors.surface, borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={22} color={ink} />
        </Pressable>

        <Display size={32} color={ink}>Cycle pillars</Display>
        <Text style={[styles.subtitle, { color: stickers.coral, fontFamily: font.italic }]}>
          six places to start your prep
        </Text>

        <View style={styles.grid}>
          {prePregPillars.map((p, i) => {
            const Sticker = getPillarSticker(p.id)
            return (
              <Pressable
                key={p.id}
                onPress={() => router.push(`/pillar/${p.id}` as any)}
                style={({ pressed }) => [
                  styles.tile,
                  { backgroundColor: tintFor(i), borderColor: colors.border, borderRadius: radius.lg },
                  pressed && { transform: [{ scale: 0.97 }], opacity: 0.95 },
                ]}
              >
                <View style={[styles.stickerChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {Sticker ? <Sticker size={28} /> : <Text style={{ fontSize: 24 }}>{p.icon}</Text>}
                </View>
                <Display size={18} color={ink}>{p.name}</Display>
                <Body size={12} color={colors.textMuted} numberOfLines={2}>
                  {p.description}
                </Body>
              </Pressable>
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, gap: 4 },
  back: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginBottom: 20,
  },
  subtitle: { fontSize: 16, lineHeight: 22, marginBottom: 24, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    width: '47.5%', padding: 14, borderWidth: 1,
    gap: 8, minHeight: 150, justifyContent: 'flex-start',
  },
  stickerChip: {
    width: 40, height: 40, borderRadius: 999, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
})
