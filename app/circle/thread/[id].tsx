/**
 * Circle thread screen — a single anonymous post with its replies + a reply
 * composer. Same anonymity model as the circle feed: everything is read from
 * circle_posts_public (handle, never a real name), and replying mints the
 * per-circle "Anonymous <Animal>" handle on first use via createCirclePost.
 */

import { useState, useCallback } from 'react'
import { View, Text, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useFocusEffect } from 'expo-router'
import { Heart, MessageCircle, Send } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../../constants/theme'
import { useTranslation } from '../../../lib/i18n'
import { ScreenHeader } from '../../../components/ui/ScreenHeader'
import { EmptyState } from '../../../components/ui/EmptyState'
import { useIsDiffuse } from '../../../components/ui/diffuse/DiffuseKit'
import { getCirclePost, getCircleReplies, createCirclePost, toggleReaction, type CirclePost } from '../../../lib/circles'

export default function CircleThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { colors, font, stickers, radius } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()

  const [parent, setParent] = useState<CirclePost | null>(null)
  const [replies, setReplies] = useState<CirclePost[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(() => {
    if (!id) return
    setLoading(true)
    Promise.all([getCirclePost(id), getCircleReplies(id)])
      .then(([p, r]) => { setParent(p); setReplies(r) })
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
  const onAccent = diffuse ? dt.colors.surface : colors.surface

  const handleSend = useCallback(async () => {
    const text = draft.trim()
    if (!id || !parent || !text || sending) return
    setSending(true)
    try {
      await createCirclePost(parent.circle_id, text, id)
      setDraft('')
      const fresh = await getCircleReplies(id)
      setReplies(fresh)
    } catch {
      // keep the draft on failure
    } finally {
      setSending(false)
    }
  }, [id, parent, draft, sending])

  const handleReact = useCallback((post: CirclePost, isParent: boolean) => {
    const wasReacted = post.has_reacted
    const flip = (p: CirclePost): CirclePost => ({
      ...p,
      has_reacted: !wasReacted,
      reaction_count: Math.max(0, p.reaction_count + (wasReacted ? -1 : 1)),
    })
    const unflip = (p: CirclePost): CirclePost => ({
      ...p,
      has_reacted: wasReacted,
      reaction_count: Math.max(0, p.reaction_count + (wasReacted ? 1 : -1)),
    })
    if (isParent) setParent((prev) => (prev ? flip(prev) : prev))
    else setReplies((prev) => prev.map((p) => (p.id === post.id ? flip(p) : p)))

    toggleReaction(post.id, wasReacted).catch(() => {
      if (isParent) setParent((prev) => (prev ? unflip(prev) : prev))
      else setReplies((prev) => prev.map((p) => (p.id === post.id ? unflip(p) : p)))
    })
  }, [])

  const canSend = draft.trim().length > 0 && !sending
  const statFont = diffuse ? diffuseFont.mono : font.body

  function reactionRow(post: CirclePost, isParent: boolean, showReplies: boolean) {
    return (
      <View style={styles.postFooter}>
        <Pressable onPress={() => handleReact(post, isParent)} hitSlop={8} style={styles.stat}>
          <Heart
            size={14}
            color={post.has_reacted ? accent : inkMuted}
            fill={post.has_reacted ? accent : 'transparent'}
            strokeWidth={1.8}
          />
          <Text style={[styles.statText, { color: post.has_reacted ? accent : inkMuted, fontFamily: statFont }]}>{post.reaction_count}</Text>
        </Pressable>
        {showReplies ? (
          <View style={styles.stat}>
            <MessageCircle size={14} color={inkMuted} strokeWidth={1.8} />
            <Text style={[styles.statText, { color: inkMuted, fontFamily: statFont }]}>{post.reply_count}</Text>
          </View>
        ) : null}
      </View>
    )
  }

  function renderReply({ item }: { item: CirclePost }) {
    return (
      <View style={[styles.reply, { borderLeftColor: cardBorder }]}>
        <Text style={[styles.handle, { color: accent, fontFamily: diffuse ? diffuseFont.mono : font.bodySemiBold }]}>{item.handle}</Text>
        <Text style={[styles.content, { color: ink, fontFamily: diffuse ? diffuseFont.body : font.body }]}>{item.content}</Text>
        {reactionRow(item, false, false)}
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : insets.top}
    >
      <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
        <ScreenHeader title={t('circles_threadTitle')} />
      </View>

      <FlatList
        data={replies}
        keyExtractor={(p) => p.id}
        renderItem={renderReply}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          loading && !parent ? (
            <View style={styles.center}><ActivityIndicator color={inkMuted} /></View>
          ) : parent ? (
            <View style={[styles.parent, { backgroundColor: cardBg, borderColor: cardBorder, borderRadius: radius.lg }]}>
              <Text style={[styles.handle, { color: accent, fontFamily: diffuse ? diffuseFont.mono : font.bodySemiBold }]}>{parent.handle}</Text>
              <Text style={[styles.parentContent, { color: ink, fontFamily: diffuse ? diffuseFont.body : font.body }]}>{parent.content}</Text>
              {reactionRow(parent, true, true)}
            </View>
          ) : null
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.center}>
              <EmptyState
                icon={<MessageCircle size={36} color={inkMuted} strokeWidth={1.5} />}
                iconBg={diffuse ? dt.colors.surface : stickers.lilacSoft}
                title={t('circles_threadEmptyTitle')}
                message={t('circles_threadEmptyBody')}
              />
            </View>
          )
        }
      />

      {/* Reply composer */}
      <View style={[styles.composer, { backgroundColor: cardBg, borderTopColor: line, paddingBottom: insets.bottom + 10 }]}>
        <View style={styles.composerRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t('circles_replyPlaceholder')}
            placeholderTextColor={inkMuted}
            multiline
            style={[
              styles.input,
              {
                color: ink,
                backgroundColor: diffuse ? dt.colors.bg : colors.bgWarm,
                borderColor: cardBorder,
                borderRadius: radius.md,
                fontFamily: diffuse ? diffuseFont.body : font.body,
              },
            ]}
          />
          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            style={[styles.send, { backgroundColor: canSend ? accent : (diffuse ? dt.colors.line : colors.borderLight), borderRadius: radius.full }]}
          >
            {sending
              ? <ActivityIndicator size="small" color={onAccent} />
              : <Send size={17} color={canSend ? onAccent : inkMuted} strokeWidth={2} />}
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
  list: { paddingHorizontal: 20, gap: 10 },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  parent: { padding: 16, borderWidth: 1, marginBottom: 8 },
  parentContent: { fontSize: 16, lineHeight: 23 },
  reply: { paddingLeft: 14, paddingVertical: 8, borderLeftWidth: 2 },
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
