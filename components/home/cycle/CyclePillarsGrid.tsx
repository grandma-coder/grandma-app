/**
 * CyclePillarsGrid — 2×2 grid of 4 pre-preg pillars with branded stickers,
 * tappable → /pillar/[id].
 */

import { View, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useTheme } from '../../../constants/theme'
import { Display, Body } from '../../ui/Typography'
import { Leaf, Flower, Moon, Heart } from '../../ui/Stickers'
import { ChevronRight } from 'lucide-react-native'

interface PillarTile {
  id: string              // routes to /pillar/[id]
  title: string
  subtitle: string
  sticker: 'leaf' | 'flower' | 'moon' | 'heart'
  tint: 'green' | 'lilac' | 'blue' | 'peach'
}

const TILES: PillarTile[] = [
  { id: 'nutrition-prep',      title: 'Nutrition',  subtitle: '6 articles',      sticker: 'leaf',   tint: 'green'  },
  { id: 'fertility',           title: 'Hormones',   subtitle: 'Fresh',           sticker: 'flower', tint: 'lilac'  },
  { id: 'health-checkups',     title: 'Sleep',      subtitle: '7.5h avg',        sticker: 'moon',   tint: 'blue'   },
  { id: 'emotional-readiness', title: 'Mental',     subtitle: 'Check-in',        sticker: 'heart',  tint: 'peach'  },
]

export function CyclePillarsGrid() {
  const { colors, stickers, isDark } = useTheme()
  const ink = isDark ? colors.text : '#141313'

  function tintBg(tint: PillarTile['tint']): string {
    switch (tint) {
      case 'green':  return stickers.greenSoft
      case 'lilac':  return stickers.lilacSoft
      case 'blue':   return stickers.blueSoft
      case 'peach':  return stickers.peachSoft
    }
  }

  function renderSticker(s: PillarTile['sticker']) {
    switch (s) {
      case 'leaf':   return <Leaf size={22} fill={stickers.green} />
      case 'flower': return <Flower size={22} petal={stickers.pink} center={stickers.yellow} />
      case 'moon':   return <Moon size={22} fill={stickers.lilac} />
      case 'heart':  return <Heart size={22} fill={stickers.pink} />
    }
  }

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Display size={24} color={ink}>Pillars</Display>
        <Pressable onPress={() => router.push('/library' as any)} hitSlop={8}>
          <View style={styles.seeAllRow}>
            <Body size={12} color={colors.textMuted}>See all</Body>
            <ChevronRight size={14} color={colors.textMuted} strokeWidth={2} />
          </View>
        </Pressable>
      </View>
      <View style={styles.grid}>
        {TILES.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => router.push(`/pillar/${t.id}` as any)}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: tintBg(t.tint), borderColor: colors.border },
              pressed && { transform: [{ scale: 0.97 }], opacity: 0.95 },
            ]}
          >
            <View style={[styles.stickerChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {renderSticker(t.sticker)}
            </View>
            <View style={styles.textCol}>
              <Display size={18} color={ink}>{t.title}</Display>
              <Body size={12} color={colors.textMuted}>{t.subtitle}</Body>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  seeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '47.5%',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    gap: 14,
    minHeight: 130,
    justifyContent: 'space-between',
  },
  stickerChip: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  textCol: {
    gap: 2,
  },
})
