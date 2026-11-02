/**
 * Circle screen (community model: Option B) — anonymous topic feed + composer.
 * Shows the circle's anonymous posts (from circle_posts_public — handle, never a
 * real name) and lets the user post anonymously. On first post a per-circle
 * "Anonymous <Animal>" handle is minted (ensureHandle) so a user's posts link to
 * each other within the circle but never to their real identity.
 */

import { useState, useCallback } from 'react'
import { View, Text, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useFocusEffect, router } from 'expo-router'
import { Heart, MessageCircle, ShieldCheck, Send } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, useDiffuseTheme, diffuseFont, getModeColorSoft } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { InkBackButton } from '../../components/ui/InkBackButton'
import { SiteSticker } from '../../components/stickers/SiteSticker'
import { Display, DisplayItalic } from '../../components/ui/Typography'
import { EmptyState } from '../../components/ui/EmptyState'
import { useIsDiffuse } from '../../components/ui/diffuse/DiffuseKit'
import { Character } from '../../components/characters/Characters'
import { circleBlob } from '../../lib/circleBlob'
import { getCircle, getCirclePosts, createCirclePost, toggleReaction, type Circle, type CirclePost } from '../../lib/circles'

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
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(() => {
    if (!id) return
    setLoading(true)
    Promise.all([getCircle(id), getCirclePosts(id)])
      .then(([c, p]) => { setCircle(c); setPosts(p) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const handleSend = useCallback(async () => {
    const text = draft.trim()
    if (!id || !text || sending) return
    setSending(true)
    try {
      await createCirclePost(id, text)
      setDraft('')
      const fresh = await getCirclePosts(id)
      setPosts(fresh)
    } catch {
      // keep the draft so the user doesn't lose their text
    } finally {
      setSending(false)
    }
  }, [id, draft, sending])

  const handleReact = useCallback((post: CirclePost) => {
    const wasReacted = post.has_reacted
    // Optimistic flip.
    setPosts((prev) => prev.map((p) =>
      p.id === post.id
        ? { ...p, has_reacted: !wasReacted, reaction_count: Math.max(0, p.reaction_count + (wasReacted ? -1 : 1)) }
        : p))
    toggleReaction(post.id, wasReacted).catch(() => {
      // Revert on failure.
      setPosts((prev) => prev.map((p) =>
        p.id === post.id
          ? { ...p, has_reacted: wasReacted, reaction_count: Math.max(0, p.reaction_count + (wasReacted ? 1 : -1)) }
          : p))
    })
  }, [])

  const ink = diffuse ? dt.colors.ink : colors.text
  const inkMuted = diffuse ? dt.colors.ink3 : colors.textMuted
  const line = diffuse ? dt.colors.line : colors.borderLight
  const cardBg = diffuse ? dt.colors.surface : colors.surface
  const cardBorder = diffuse ? dt.colors.line : colors.border
  const accent = diffuse ? dt.stickers.lilac : stickers.lilac
  const onAccent = diffuse ? dt.colors.surface : colors.surface // paper-white foreground on a filled accent pill

  function renderItem({ item }: { item: CirclePost }) {
    const statFont = diffuse ? diffuseFont.mono : font.body
    return (
      <Pressable
        onPress={() => router.push(`/circle/thread/${item.id}`)}
        style={({ pressed }) => [
          styles.post,
          diffuse
            ? { backgroundColor: cardBg, borderColor: cardBorder, borderRadius: radius.lg }
            : { backgroundColor: 'transparent', borderColor: colors.border, borderWidth: 0, borderBottomWidth: StyleSheet.hairlineWidth, borderRadius: 0, paddingHorizontal: 0 },
          pressed && { opacity: 0.7 },
        ]}
      >
        <Text style={[styles.handle, { color: diffuse ? accent : colors.textMuted, fontFamily: diffuse ? diffuseFont.mono : 'SpaceMono_400Regular' }, !diffuse && { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.4 }]}>{item.handle}</Text>
        <Text style={[styles.content, { color: ink, fontFamily: diffuse ? diffuseFont.body : font.body }]}>{item.content}</Text>
        <View style={styles.postFooter}>
          <Pressable
            onPress={() => handleReact(item)}
            hitSlop={8}
            style={[styles.stat, !diffuse && { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1.5, borderColor: item.has_reacted ? colors.text : 'transparent', backgroundColor: item.has_reacted ? getModeColorSoft('kids') : 'transparent' }]}
          >
            <Heart
              size={14}
              color={diffuse ? (item.has_reacted ? accent : inkMuted) : colors.text}
              fill={item.has_reacted ? (diffuse ? accent : colors.text) : 'transparent'}
              strokeWidth={1.8}
            />
            <Text style={[styles.statText, { color: diffuse ? (item.has_reacted ? accent : inkMuted) : colors.text, fontFamily: diffuse ? statFont : 'SpaceMono_400Regular' }]}>{item.reaction_count}</Text>
          </Pressable>
          <View style={styles.stat}>
            <MessageCircle size={14} color={diffuse ? inkMuted : colors.text} strokeWidth={1.8} />
            <Text style={[styles.statText, { color: diffuse ? inkMuted : colors.text, fontFamily: diffuse ? statFont : 'SpaceMono_400Regular' }]}>{item.reply_count}</Text>
          </View>
        </View>
      </Pressable>
    )
  }

  const canSend = draft.trim().length > 0 && !sending

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : insets.top}
    >
      {diffuse ? (
        <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}><ScreenHeader title="" /></View>
      ) : (
        <View style={[styles.headerWrap, styles.siteHeader, { paddingTop: insets.top + 8 }]}>
          <InkBackButton ink={colors.text} paper={colors.surface} style={{ marginBottom: 0 }} />
          <SiteSticker name="bubble" size={34} cut />
          <Text style={[styles.siteTitle, { color: colors.text, fontFamily: font.display }]} numberOfLines={1}>{circle?.name ?? ''}</Text>
        </View>
      )}

      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.head}>
            {diffuse && (
            <View style={[styles.headIcon, { backgroundColor: diffuse ? dt.stickers.lilacSoft : stickers.lilacSoft }]}>
              {/* bg = the bubble fill so blob cut-out details blend into the socket */}
              <Character name={circleBlob(circle?.name ?? '')} size={44} bg={diffuse ? dt.stickers.lilacSoft : stickers.lilacSoft} />
            </View>
            )}
            {diffuse && <Display size={30} color={ink} align="center">{circle?.name ?? ''}</Display>}
            {circle?.description ? (
              diffuse ? (
                <DisplayItalic size={15} color={inkMuted} align="center" style={{ marginTop: 6 }}>
                  {circle.description}
                </DisplayItalic>
              ) : (
                <Text style={{ color: colors.textSecondary, fontFamily: font.body, fontSize: 14, lineHeight: 20, textAlign: 'center' }}>{circle.description}</Text>
              )
            ) : null}
            <View style={[styles.anonPill, { backgroundColor: diffuse ? dt.stickers.lilacSoft : getModeColorSoft('preg'), borderRadius: radius.full }, !diffuse && { borderWidth: 1.5, borderColor: colors.text }]}>
              {diffuse ? <ShieldCheck size={13} color={accent} strokeWidth={2} /> : <SiteSticker name="lock" size={16} cut />}
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
                iconBg={diffuse ? dt.colors.surface : colors.surface}
                title={t('circles_readEmptyTitle')}
                message={t('circles_readEmptyBody')}
              />
            </View>
          )
        }
      />

      {/* Anonymous composer */}
      <View style={[styles.composer, { backgroundColor: cardBg, borderTopColor: line, paddingBottom: insets.bottom + 10 }]}>
        <View style={styles.composerRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t('circles_composerPlaceholder')}
            placeholderTextColor={inkMuted}
            multiline
            style={[
              styles.input,
              {
                color: ink,
                backgroundColor: diffuse ? dt.colors.bg : colors.surface,
                borderColor: diffuse ? cardBorder : colors.text,
                borderRadius: diffuse ? radius.md : 22,
                borderWidth: diffuse ? 1 : 1.5,
                fontFamily: diffuse ? diffuseFont.body : font.body,
              },
            ]}
          />
          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            style={[styles.send, diffuse ? { backgroundColor: canSend ? accent : dt.colors.line, borderRadius: radius.full } : { width: 40, height: 40, backgroundColor: canSend ? colors.text : colors.borderLight, borderRadius: radius.full }]}
          >
            {sending
              ? <ActivityIndicator size="small" color={diffuse ? onAccent : colors.bg} />
              : <Send size={17} color={canSend ? (diffuse ? onAccent : colors.bg) : inkMuted} strokeWidth={2} />}
          </Pressable>
        </View>
        <Text style={[styles.composerHint, { color: inkMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
          {t('circles_composerHint')}
        </Text>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerWrap: { paddingHorizontal: 16 },
  siteHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  siteTitle: { flex: 1, fontSize: 26, textTransform: 'uppercase', letterSpacing: 0.3 },
  list: { paddingHorizontal: 20, gap: 10 },
  head: { alignItems: 'center', paddingTop: 4, paddingBottom: 16 },
  headIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  anonPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, marginTop: 14 },
  anonText: { fontSize: 12 },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  post: { padding: 16, borderWidth: 1 },
  handle: { fontSize: 12, letterSpacing: 0.3, marginBottom: 6 },
  content: { fontSize: 15, lineHeight: 21 },
  postFooter: { flexDirection: 'row', gap: 16, marginTop: 12 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { fontSize: 12 },
  composer: { paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1, gap: 6 },
  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderWidth: 1, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 11, fontSize: 15, lineHeight: 20 },
  send: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  composerHint: { fontSize: 11, textAlign: 'center', paddingHorizontal: 8 },
})
