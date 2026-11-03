import { useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet, FlatList } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { X, ChevronLeft } from 'lucide-react-native'
import { useTheme, shadows, useDiffuseTheme, diffuseFont } from '../constants/theme'
import { useIsDiffuse } from '../components/ui/diffuse/DiffuseKit'
import { Display, MonoCaps } from '../components/ui/Typography'
import { InkBackButton } from '../components/ui/InkBackButton'
import { SiteSticker } from '../components/stickers/SiteSticker'
import { CardSticker } from '../components/home/pregnancy/CardSticker'
import { useDailyMessage, type DailyMessageRow } from '../lib/dailyMessage/useDailyMessage'
import { useTranslation } from '../lib/i18n'
import { dateLoc } from '../lib/kpLocale'
import { getCardById } from '../lib/dailyMessage'
import type { DailyCard } from '../lib/dailyMessage'
import { CenterModal } from '../components/ui/CenterModal'

interface CollectionItem {
  row: DailyMessageRow
  card: DailyCard
}

// "2026-07-11" → "JUL 11". Warm, short mono-caps date.
function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  const mi = Number(m) - 1
  if (mi < 0 || mi > 11) return iso
  return new Date(Number(y), mi, Number(d)).toLocaleDateString(dateLoc(), { month: 'short', day: 'numeric' }).toUpperCase()
}

export default function MyCardsScreen() {
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
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
  // Keep the last opened card so its content survives the exit animation.
  const lastShown = useRef<{ card: NonNullable<typeof open>; date: string } | null>(null)
  if (open) lastShown.current = { card: open, date: openDate }
  const shown = lastShown.current

  const styles = StyleSheet.create({
    fill: { flex: 1, backgroundColor: colors.bg },
    header: { paddingHorizontal: 20 },
    back: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    title: { letterSpacing: -0.5, marginTop: 8 },
    // Paper surface + hairline + subtle shadow + small sticker accent + ink serif.
    tile: { flex: 1, borderRadius: radius.lg, borderWidth: diffuse ? 1 : 1.5, borderColor: diffuse ? colors.border : colors.text, backgroundColor: colors.surface, padding: 16, minHeight: 168, justifyContent: 'space-between', ...shadows.card },
    tileText: { lineHeight: 22, letterSpacing: -0.2, marginTop: 12 },
    tileDate: { marginTop: 10 },
    empty: { fontFamily: font.italic, fontSize: 18, color: colors.textMuted, textAlign: 'center', marginTop: 80 },
    overlay: { flex: 1, backgroundColor: colors.bg + 'F2', justifyContent: 'center', paddingHorizontal: 24 },
    big: { borderRadius: radius.lg, borderWidth: diffuse ? 1 : 1.5, borderColor: diffuse ? colors.border : colors.text, backgroundColor: colors.surface, padding: 28, minHeight: 260, justifyContent: 'flex-start', gap: 22, ...shadows.cardPop },
    bigText: { lineHeight: 33, letterSpacing: -0.3 },
    close: { position: 'absolute', top: 14, right: 14, width: 38, height: 38, borderRadius: 19, borderWidth: diffuse ? 1 : 1.5, borderColor: diffuse ? colors.border : colors.text, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  })

  return (
    <View style={[styles.fill, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        {diffuse ? (
          <>
            <Pressable onPress={() => router.back()} style={styles.back} hitSlop={10}>
              <ChevronLeft size={22} color={colors.text} strokeWidth={2} />
            </Pressable>
            <MonoCaps color={colors.textMuted}>{t('sw1_daily_eyebrow')}</MonoCaps>
            <Display size={28} style={styles.title}>{t('sw3_cards_title')}</Display>
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <InkBackButton ink={colors.text} paper={colors.surface} style={{ marginBottom: 0 }} />
              <SiteSticker name="star" size={30} cut />
              <Display size={26} style={{ textTransform: 'uppercase', letterSpacing: 0.3 }}>{t('sw3_cards_title')}</Display>
            </View>
            <MonoCaps color={colors.textMuted} style={{ marginTop: 14 }}>{t('sw1_daily_eyebrow')}</MonoCaps>
          </>
        )}
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
              <CardSticker color={item.card.color} size={38} mode={item.card.mode} />
              <Display size={16} style={styles.tileText} numberOfLines={4}>{item.card.text}</Display>
              <View style={styles.tileDate}>
                <MonoCaps color={colors.textFaint} size={9}>{fmtDate(item.row.date)}</MonoCaps>
              </View>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{t('sw3_cards_empty')}</Text>}
      />

      <CenterModal visible={!!open} onClose={() => setOpenId(null)} backdropColor={colors.bg + 'F2'} dismissOnBackdrop={false} avoidKeyboard={false} containerStyle={{ alignItems: 'stretch' }}>
          <View style={styles.big}>
            <Pressable onPress={() => setOpenId(null)} style={styles.close} hitSlop={12}>
              <X size={18} color={colors.text} strokeWidth={2} />
            </Pressable>
            {shown ? <CardSticker color={shown.card.color} size={48} mode={shown.card.mode} /> : null}
            <Display size={25} style={styles.bigText}>{shown?.card.text}</Display>
            {shown ? <MonoCaps color={colors.textFaint} size={9}>{fmtDate(shown.date)}</MonoCaps> : null}
          </View>
      </CenterModal>
    </View>
  )
}
