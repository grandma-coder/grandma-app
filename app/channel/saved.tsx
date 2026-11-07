/**
 * Saved posts (Phase 3). A list of the posts the user has bookmarked across
 * channels, newest-saved first. Tapping a post opens it (its thread). Unsave from
 * here too. Reached from the Channels list header.
 */

import { useState, useCallback } from 'react'
import { View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Bookmark } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, useDiffuseTheme, diffuseFont, brand } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { InkBackButton } from '../../components/ui/InkBackButton'
import { SiteSticker } from '../../components/stickers/SiteSticker'
import { Display, DisplayItalic } from '../../components/ui/Typography'
import { EmptyState } from '../../components/ui/EmptyState'
import { useIsDiffuse } from '../../components/ui/diffuse/DiffuseKit'
import { getSavedPosts, unsavePost, type ChannelPost } from '../../lib/channelPosts'

export default function SavedPostsScreen() {
  const { colors, font, stickers, radius } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()

  const [posts, setPosts] = useState<ChannelPost[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    getSavedPosts()
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoading(false))
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleUnsave(postId: string) {
    setPosts((prev) => prev.filter((p) => p.id !== postId)) // optimistic
    try { await unsavePost(postId) } catch { load() }
  }

  const ink = diffuse ? dt.colors.ink : colors.text
  const inkMuted = diffuse ? dt.colors.ink3 : colors.textMuted
  const cardBg = diffuse ? dt.colors.surface : colors.surface
  const cardBorder = diffuse ? dt.colors.line : colors.border
  const accent = diffuse ? dt.colors.ink : brand.primary

  function renderItem({ item }: { item: ChannelPost }) {
    return (
      <Pressable
        // Open the post itself (its thread), not the top of a long channel
        // where the saved message may be hundreds of rows up.
        onPress={() => router.push(`/channel/thread/${item.id}` as any)}
        style={({ pressed }) => [
          styles.card,
          diffuse
            ? { backgroundColor: cardBg, borderColor: cardBorder, borderRadius: radius.lg }
            : { backgroundColor: 'transparent', borderColor: colors.border, borderWidth: 0, borderBottomWidth: StyleSheet.hairlineWidth, borderRadius: 0, paddingHorizontal: 0 },
          pressed && { opacity: 0.7 },
        ]}
      >
        <View style={styles.cardHead}>
          <Text style={[styles.author, { color: ink, fontFamily: diffuse ? diffuseFont.bodySemiBold : font.bodySemiBold }]}>
            {item.author_name ?? t('channelScreen_someoneFallback')}
          </Text>
          <Pressable onPress={() => handleUnsave(item.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('garage_profile_unsave')}>
            <Bookmark size={16} color={diffuse ? accent : colors.text} strokeWidth={2} fill={diffuse ? accent : colors.text} />
          </Pressable>
        </View>
        <Text
          style={[styles.content, { color: inkMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}
          numberOfLines={4}
        >
          {item.content}
        </Text>
      </Pressable>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
      {diffuse ? (
        <>
          <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}><ScreenHeader title="" /></View>
          <View style={styles.titleBlock}>
            <Display size={32} color={ink}>{t('savedPosts_title')}</Display>
            <DisplayItalic size={17} color={dt.colors.ink} style={{ marginTop: 6 }}>
              {t('savedPosts_subtitle')}
            </DisplayItalic>
          </View>
        </>
      ) : (
        <>
          <View style={[styles.headerWrap, styles.siteHeader, { paddingTop: insets.top + 8 }]}>
            <InkBackButton ink={colors.text} paper={colors.surface} style={{ marginBottom: 0 }} />
            <SiteSticker name="pola" size={34} cut />
            <Text style={[styles.siteTitle, { color: colors.text, fontFamily: font.display }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('savedPosts_title')}</Text>
          </View>
          <Text style={[styles.siteSub, { color: colors.textSecondary, fontFamily: font.body }]}>{t('savedPosts_subtitle')}</Text>
        </>
      )}

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={inkMuted} /></View>
      ) : posts.length === 0 ? (
        <View style={styles.center}>
          <EmptyState
            icon={diffuse ? <Bookmark size={40} color={inkMuted} strokeWidth={1.5} /> : <SiteSticker name="pola" size={44} cut />}
            iconBg={diffuse ? dt.colors.surface : stickers.yellowSoft}
            title={t('savedPosts_emptyTitle')}
            message={t('savedPosts_emptyBody')}
          />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerWrap: { paddingHorizontal: 16 },
  siteHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  siteTitle: { flex: 1, fontSize: 26, textTransform: 'uppercase', letterSpacing: 0.3 },
  siteSub: { fontSize: 14, lineHeight: 20, paddingHorizontal: 24, marginTop: 10, marginBottom: 8 },
  titleBlock: { marginTop: 4, marginBottom: 8, paddingHorizontal: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  list: { paddingHorizontal: 20, paddingTop: 8, gap: 12 },
  card: { padding: 16, borderWidth: 1 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  author: { fontSize: 14 },
  content: { fontSize: 14, lineHeight: 20 },
})
