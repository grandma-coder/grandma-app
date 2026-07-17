/**
 * Saved posts (Phase 3). A list of the posts the user has bookmarked across
 * channels, newest-saved first. Tapping a post opens its channel. Unsave from
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
        onPress={() => router.push(`/channel/${item.channel_id}` as any)}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: cardBg, borderColor: cardBorder, borderRadius: radius.lg },
          pressed && { opacity: 0.7 },
        ]}
      >
        <View style={styles.cardHead}>
          <Text style={[styles.author, { color: ink, fontFamily: diffuse ? diffuseFont.bodySemiBold : font.bodySemiBold }]}>
            {item.author_name ?? t('channelScreen_someoneFallback')}
          </Text>
          <Pressable onPress={() => handleUnsave(item.id)} hitSlop={8}>
            <Bookmark size={16} color={accent} strokeWidth={2} fill={accent} />
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
      <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}><ScreenHeader title="" /></View>

      <View style={styles.titleBlock}>
        <Display size={32} color={ink}>{t('savedPosts_title')}</Display>
        <DisplayItalic size={17} color={diffuse ? dt.colors.ink : stickers.coral} style={{ marginTop: 6 }}>
          {t('savedPosts_subtitle')}
        </DisplayItalic>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={inkMuted} /></View>
      ) : posts.length === 0 ? (
        <View style={styles.center}>
          <EmptyState
            icon={<Bookmark size={40} color={inkMuted} strokeWidth={1.5} />}
            iconBg={diffuse ? dt.colors.surface : stickers.lilacSoft}
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
  titleBlock: { marginTop: 4, marginBottom: 8, paddingHorizontal: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  list: { paddingHorizontal: 20, paddingTop: 8, gap: 12 },
  card: { padding: 16, borderWidth: 1 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  author: { fontSize: 14 },
  content: { fontSize: 14, lineHeight: 20 },
})
