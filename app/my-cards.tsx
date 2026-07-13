import { useState } from 'react'
import { View, Text, Pressable, StyleSheet, FlatList, Modal } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { X, ChevronLeft } from 'lucide-react-native'
import { useTheme, shadows, useDiffuseTheme, diffuseFont } from '../constants/theme'
import { useIsDiffuse } from '../components/ui/diffuse/DiffuseKit'
import { Display, MonoCaps } from '../components/ui/Typography'
import { CardSticker } from '../components/home/pregnancy/CardSticker'
import { useDailyMessage, type DailyMessageRow } from '../lib/dailyMessage/useDailyMessage'
import { getCardById } from '../lib/dailyMessage'
import type { DailyCard } from '../lib/dailyMessage'

interface CollectionItem {
  row: DailyMessageRow
  card: DailyCard
}

// "2026-07-11" → "JUL 11". Warm, short mono-caps date.
function fmtDate(iso: string): string {
  const [, m, d] = iso.split('-')
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  const mi = Number(m) - 1
  if (mi < 0 || mi > 11) return iso
  return `${months[mi]} ${Number(d)}`
}

export default function MyCardsScreen() {
  const insets = useSafeAreaInsets()
  const theme = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { radius } = theme
  // Under Diffuse, source the surface palette + serif from the v3 tokens; the
  // component's styles read `colors`/`font` below, so we swap the source here.
  const colors = diffuse
    ? { ...theme.colors, bg: dt.colors.bg, surface: dt.colors.surface, border: dt.colors.line, text: dt.colors.ink, textMuted: dt.colors.ink3, textFaint: dt.colors.ink4 }
    : theme.colors
  const font = diffuse
    ? { ...theme.font, display: diffuseFont.display, italic: diffuseFont.italic }
    : theme.font
  const { collection } = useDailyMessage()
  const [openId, setOpenId] = useState<string | null>(null)

  const cards: CollectionItem[] = collection.reduce<CollectionItem[]>((acc, row) => {
    const card = getCardById(row.card_id)
    if (card) acc.push({ row, card })
    return acc
  }, [])

  const open = openId ? getCardById(openId) ?? null : null
  const openDate = open ? collection.find((r) => r.card_id === open.id)?.date ?? '' : ''

  const styles = StyleSheet.create({
    fill: { flex: 1, backgroundColor: colors.bg },
    header: { paddingHorizontal: 20 },
    back: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    title: { letterSpacing: -0.5, marginTop: 8 },
    // Paper surface + hairline + subtle shadow + small sticker accent + ink serif.
    tile: { flex: 1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 16, minHeight: 168, justifyContent: 'space-between', ...shadows.card },
    tileText: { lineHeight: 22, letterSpacing: -0.2, marginTop: 12 },
    tileDate: { marginTop: 10 },
    empty: { fontFamily: font.italic, fontSize: 18, color: colors.textMuted, textAlign: 'center', marginTop: 80 },
    overlay: { flex: 1, backgroundColor: colors.bg + 'F2', justifyContent: 'center', paddingHorizontal: 24 },
    big: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 28, minHeight: 260, justifyContent: 'flex-start', gap: 22, ...shadows.cardPop },
    bigText: { lineHeight: 33, letterSpacing: -0.3 },
    close: { position: 'absolute', top: 14, right: 14, width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  })

  return (
    <View style={[styles.fill, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={10}>
          <ChevronLeft size={22} color={colors.text} strokeWidth={2} />
        </Pressable>
        <MonoCaps color={colors.textMuted}>DAILY MESSAGE</MonoCaps>
        <Display size={28} style={styles.title}>My Cards</Display>
      </View>

      <FlatList
        data={cards}
        keyExtractor={(x) => x.row.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ gap: 12, padding: 20 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable style={{ flex: 1 }} onPress={() => setOpenId(item.card.id)}>
            <View style={styles.tile}>
              <CardSticker color={item.card.color} size={38} />
              <Display size={16} style={styles.tileText} numberOfLines={4}>{item.card.text}</Display>
              <View style={styles.tileDate}>
                <MonoCaps color={colors.textFaint} size={9}>{fmtDate(item.row.date)}</MonoCaps>
              </View>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Your drawn cards will collect here.</Text>}
      />

      <Modal visible={!!open} transparent animationType="fade" onRequestClose={() => setOpenId(null)}>
        <View style={styles.overlay}>
          <View style={styles.big}>
            <Pressable onPress={() => setOpenId(null)} style={styles.close} hitSlop={12}>
              <X size={18} color={colors.text} strokeWidth={2} />
            </Pressable>
            {open ? <CardSticker color={open.color} size={48} /> : null}
            <Display size={25} style={styles.bigText}>{open?.text}</Display>
            {open ? <MonoCaps color={colors.textFaint} size={9}>{fmtDate(openDate)}</MonoCaps> : null}
          </View>
        </View>
      </Modal>
    </View>
  )
}
