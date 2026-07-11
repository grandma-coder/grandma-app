import { useState } from 'react'
import { View, Text, Pressable, StyleSheet, FlatList, Modal } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { X, ChevronLeft } from 'lucide-react-native'
import { useTheme } from '../constants/theme'
import { useDailyMessage, type DailyMessageRow } from '../lib/dailyMessage/useDailyMessage'
import { getCardById } from '../lib/dailyMessage'
import type { DailyCard } from '../lib/dailyMessage'

interface CollectionItem {
  row: DailyMessageRow
  card: DailyCard
}

export default function MyCardsScreen() {
  const insets = useSafeAreaInsets()
  const { colors, stickers, font, radius } = useTheme()
  const { collection } = useDailyMessage()
  const [openId, setOpenId] = useState<string | null>(null)

  const cards: CollectionItem[] = collection.reduce<CollectionItem[]>((acc, row) => {
    const card = getCardById(row.card_id)
    if (card) acc.push({ row, card })
    return acc
  }, [])

  const open = openId ? getCardById(openId) ?? null : null

  const styles = StyleSheet.create({
    fill: { flex: 1, backgroundColor: colors.bg },
    back: { paddingHorizontal: 16 },
    title: { fontFamily: font.display, fontSize: 30, color: stickers.charcoal, paddingHorizontal: 16, marginTop: 4 },
    tile: { borderRadius: radius.md, padding: 14, minHeight: 150, justifyContent: 'center' },
    tileText: { fontFamily: font.display, fontSize: 15, lineHeight: 20, color: stickers.charcoal },
    tileDate: { fontFamily: font.bodyMedium, fontSize: 11, color: stickers.charcoal, opacity: 0.5, marginTop: 6 },
    empty: { fontFamily: font.body, fontSize: 15, color: stickers.charcoal, textAlign: 'center', marginTop: 60, opacity: 0.6 },
    overlay: { flex: 1, backgroundColor: 'rgba(20,19,19,0.55)', justifyContent: 'center', padding: 24 },
    big: { borderRadius: radius.lg, padding: 28, minHeight: 300, justifyContent: 'center' },
    close: { position: 'absolute', top: 16, right: 16, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    bigText: { fontFamily: font.display, fontSize: 26, lineHeight: 32, color: stickers.charcoal },
  })

  return (
    <View style={[styles.fill, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={() => router.back()} style={styles.back} hitSlop={10}>
        <ChevronLeft size={24} color={stickers.charcoal} />
      </Pressable>
      <Text style={styles.title}>My Cards</Text>
      <FlatList
        data={cards}
        keyExtractor={(x) => x.row.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ gap: 12, padding: 16 }}
        renderItem={({ item }) => (
          <Pressable style={{ flex: 1 }} onPress={() => setOpenId(item.card.id)}>
            <View style={[styles.tile, { backgroundColor: stickers[item.card.color] }]}>
              <Text style={styles.tileText} numberOfLines={5}>{item.card.text}</Text>
            </View>
            <Text style={styles.tileDate}>{item.row.date}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Your drawn cards will collect here.</Text>}
      />
      <Modal visible={!!open} transparent animationType="fade" onRequestClose={() => setOpenId(null)}>
        <View style={styles.overlay}>
          <View style={[styles.big, { backgroundColor: open ? stickers[open.color] : stickers.yellow }]}>
            <Pressable onPress={() => setOpenId(null)} style={styles.close} hitSlop={12}>
              <X size={22} color={stickers.charcoal} />
            </Pressable>
            <Text style={styles.bigText}>{open?.text}</Text>
          </View>
        </View>
      </Modal>
    </View>
  )
}
