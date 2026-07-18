/**
 * Circle read screen (community model: Option B) — anonymous topic feed.
 * FOUNDATION: read-only. Shows the circle's anonymous posts (from
 * circle_posts_public — handle, never a real name). Posting comes in a follow-up
 * (a disabled composer note marks where it lands).
 */

import { useState, useCallback } from 'react'
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useFocusEffect } from 'expo-router'
import { Heart, MessageCircle, ShieldCheck } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { Display, DisplayItalic } from '../../components/ui/Typography'
import { EmptyState } from '../../components/ui/EmptyState'
import { useIsDiffuse } from '../../components/ui/diffuse/DiffuseKit'
import { getCircle, getCirclePosts, type Circle, type CirclePost } from '../../lib/circles'

export default function CircleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { colors, font, stickers, radius } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()

  const [circle, setCircle] = useState<Circle | null>(null)
  const [posts, setPosts] = useState<CirclePost[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    if (!id) return
    setLoading(true)
    Promise.all([getCircle(id), getCirclePosts(id)])
      .then(([c, p]) => { setCircle(c); setPosts(p) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const ink = diffuse ? dt.colors.ink : colors.text
  const inkMuted = diffuse ? dt.colors.ink3 : colors.textMuted
  const line = diffuse ? dt.colors.line : colors.borderLight
  const cardBg = diffuse ? dt.colors.surface : colors.surface
  const cardBorder = diffuse ? dt.colors.line : colors.border
  const accent = diffuse ? dt.stickers.lilac : stickers.lilac

  function renderItem({ item }: { item: CirclePost }) {
    return (
      <View style={[styles.post, { backgroundColor: cardBg, borderColor: cardBorder, borderRadius: radius.lg }]}>
        <Text style={[styles.handle, { color: accent, fontFamily: diffuse ? diffuseFont.mono : font.bodySemiBold }]}>{item.handle}</Text>
        <Text style={[styles.content, { color: ink, fontFamily: diffuse ? diffuseFont.body : font.body }]}>{item.content}</Text>
        <View style={styles.postFooter}>
          <View style={styles.stat}>
            <Heart size={13} color={inkMuted} strokeWidth={1.8} />
            <Text style={[styles.statText, { color: inkMuted, fontFamily: diffuse ? diffuseFont.mono : font.body }]}>{item.reaction_count}</Text>
          </View>
          <View style={styles.stat}>
            <MessageCircle size={13} color={inkMuted} strokeWidth={1.8} />
            <Text style={[styles.statText, { color: inkMuted, fontFamily: diffuse ? diffuseFont.mono : font.body }]}>{item.reply_count}</Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
      <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}><ScreenHeader title="" /></View>

      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.head}>
            <Text style={styles.emoji}>{circle?.emoji ?? '💬'}</Text>
            <Display size={30} color={ink} align="center">{circle?.name ?? ''}</Display>
            {circle?.description ? (
              <DisplayItalic size={15} color={inkMuted} align="center" style={{ marginTop: 6 }}>
                {circle.description}
              </DisplayItalic>
            ) : null}
            <View style={[styles.anonPill, { backgroundColor: diffuse ? dt.stickers.lilacSoft : stickers.lilacSoft, borderRadius: radius.full }]}>
              <ShieldCheck size={13} color={accent} strokeWidth={2} />
              <Text style={[styles.anonText, { color: ink, fontFamily: diffuse ? diffuseFont.body : font.body }]}>{t('circles_anonPill')}</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}><ActivityIndicator color={inkMuted} /></View>
          ) : (
            <View style={styles.center}>
              <EmptyState
                icon={<MessageCircle size={40} color={inkMuted} strokeWidth={1.5} />}
                iconBg={diffuse ? dt.colors.surface : stickers.lilacSoft}
                title={t('circles_readEmptyTitle')}
                message={t('circles_readEmptyBody')}
              />
            </View>
          )
        }
      />

      {/* Posting foundation-note — composer lands here in a follow-up. */}
      <View style={[styles.composerNote, { backgroundColor: cardBg, borderTopColor: line, paddingBottom: insets.bottom + 12 }]}>
        <Text style={[styles.composerText, { color: inkMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
          {t('circles_postingSoon')}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerWrap: { paddingHorizontal: 16 },
  list: { paddingHorizontal: 20, gap: 10 },
  head: { alignItems: 'center', paddingTop: 4, paddingBottom: 16 },
  emoji: { fontSize: 40, marginBottom: 8 },
  anonPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, marginTop: 14 },
  anonText: { fontSize: 12 },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  post: { padding: 16, borderWidth: 1 },
  handle: { fontSize: 12, letterSpacing: 0.3, marginBottom: 6 },
  content: { fontSize: 15, lineHeight: 21 },
  postFooter: { flexDirection: 'row', gap: 16, marginTop: 12 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { fontSize: 12 },
  composerNote: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  composerText: { fontSize: 12, textAlign: 'center', lineHeight: 17 },
})
