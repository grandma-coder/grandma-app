import { useState } from 'react'
import { View, Text, Pressable, StyleSheet, FlatList, Modal } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { X, ChevronLeft } from 'lucide-react-native'
import { useTheme } from '../constants/theme'
import { useDailyMessage, type DailyMessageRow } from '../lib/dailyMessage/useDailyMessage'
import { getCardById } from '../lib/dailyMessage'
import { cardTint, cardHairline } from '../lib/dailyMessage/cardTint'
import type { DailyCard } from '../lib/dailyMessage'

interface CollectionItem {
  row: DailyMessageRow
  card: DailyCard
}

// "2026-07-11" → "Jul 11". Keeps the mono-caps date warm and short.
function fmtDate(iso: string): string {
  const [, m, d] = iso.split('-')
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  const mi = Number(m) - 1
  if (mi < 0 || mi > 11) return iso
  return `${months[mi]} ${Number(d)}`
}

export default function MyCardsScreen() {
  const insets = useSafeAreaInsets()
  const { colors, font, radius } = useTheme()
  const { collection } = useDailyMessage()
  const [openId, setOpenId] = useState<string | null>(null)

  const cards: CollectionItem[] = collection.reduce<CollectionItem[]>((acc, row) => {
    const card = getCardById(row.card_id)
    if (card) acc.push({ row, card })
    return acc
  }, [])

  const open = openId ? getCardById(openId) ?? null : null
  const openTint = open ? cardTint(open.color) : null

  const styles = StyleSheet.create({
    fill: { flex: 1, backgroundColor: colors.bg },
    header: { paddingHorizontal: 20 },
    back: { width: 40, height: 40, justifyContent: 'center', marginLeft: -8 },
    eyebrow: { fontFamily: font.bodyMedium, fontSize: 10.5, letterSpacing: 2, textTransform: 'uppercase', color: colors.textMuted, marginTop: 2 },
    title: { fontFamily: font.display, fontSize: 34, color: colors.text, marginTop: 2 },
    // Soft tint wash + hairline colored edge + Fraunces serif (home display face).
    tile: { flex: 1, borderRadius: radius.lg, borderWidth: 1, padding: 16, minHeight: 156, justifyContent: 'space-between' },
    tileText: { fontFamily: font.display, fontSize: 16, lineHeight: 22 },
    tileDate: { fontFamily: font.bodyMedium, fontSize: 9.5, letterSpacing: 1.5, marginTop: 12 },
    empty: { fontFamily: font.italic, fontSize: 18, color: colors.textMuted, textAlign: 'center', marginTop: 80 },
    overlay: { flex: 1, backgroundColor: colors.bg + 'F2', justifyContent: 'center', paddingHorizontal: 24 },
    big: { borderRadius: radius.lg, borderWidth: 1, padding: 30, minHeight: 260, justifyContent: 'center' },
    bigText: { fontFamily: font.display, fontSize: 26, lineHeight: 34 },
    bigDate: { fontFamily: font.bodyMedium, fontSize: 10, letterSpacing: 1.5, marginTop: 20 },
    close: { position: 'absolute', top: 14, right: 14, width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  })

  return (
    <View style={[styles.fill, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={10}>
          <ChevronLeft size={26} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Text style={styles.eyebrow}>DAILY MESSAGE</Text>
        <Text style={styles.title}>My Cards</Text>
      </View>

      <FlatList
        data={cards}
        keyExtractor={(x) => x.row.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ gap: 12, padding: 20 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const tint = cardTint(item.card.color)
          return (
            <Pressable style={{ flex: 1 }} onPress={() => setOpenId(item.card.id)}>
              <View style={[styles.tile, { backgroundColor: tint.soft, borderColor: cardHairline(item.card.color) }]}>
                <Text style={[styles.tileText, { color: tint.ink }]} numberOfLines={5}>{item.card.text}</Text>
                <Text style={[styles.tileDate, { color: tint.ink, opacity: 0.7 }]}>{fmtDate(item.row.date)}</Text>
              </View>
            </Pressable>
          )
        }}
        ListEmptyComponent={<Text style={styles.empty}>Your drawn cards will collect here.</Text>}
      />

      <Modal visible={!!open} transparent animationType="fade" onRequestClose={() => setOpenId(null)}>
        <View style={styles.overlay}>
          <View style={[styles.big, { backgroundColor: openTint?.soft ?? colors.surface, borderColor: open ? cardHairline(open.color) : colors.border }]}>
            <Pressable onPress={() => setOpenId(null)} style={[styles.close, { borderColor: (openTint?.ink ?? colors.text) + '33' }]} hitSlop={12}>
              <X size={20} color={openTint?.ink ?? colors.text} strokeWidth={2} />
            </Pressable>
            <Text style={[styles.bigText, { color: openTint?.ink ?? colors.text }]}>{open?.text}</Text>
            {open ? (
              <Text style={[styles.bigDate, { color: openTint?.ink ?? colors.textMuted, opacity: 0.6 }]}>
                {fmtDate(collection.find((r) => r.card_id === open.id)?.date ?? '')}
              </Text>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  )
}
