/**
 * Circle thread screen — a single anonymous post with its replies + a reply
 * composer. Same anonymity model as the circle feed: everything is read from
 * circle_posts_public (handle, never a real name), and replying mints the
 * per-circle "Anonymous <Animal>" handle on first use via createCirclePost.
 */

import { useState, useCallback } from 'react'
import { View, Text, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useFocusEffect, router } from 'expo-router'
import { Heart, MessageCircle, Send } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, useDiffuseTheme, diffuseFont, getModeColorSoft } from '../../../constants/theme'
import { useTranslation } from '../../../lib/i18n'
import { useModeStore } from '../../../store/useModeStore'
import { anonHandleLabel, circleDisplayName, circleDisplayDesc } from '../../../components/connections/communityLabels'
import { ScreenHeader } from '../../../components/ui/ScreenHeader'
import { InkBackButton } from '../../../components/ui/InkBackButton'
import { SiteSticker } from '../../../components/stickers/SiteSticker'
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
  const [sendError, setSendError] = useState(false)
  const mode = useModeStore((s) => s.mode)

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
    setSendError(false)
    try {
      await createCirclePost(parent.circle_id, text, id)
      setDraft('')
      const fresh = await getCircleReplies(id)
      setReplies(fresh)
    } catch {
      setSendError(true)
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
        <Pressable onPress={() => handleReact(post, isParent)} hitSlop={8} style={[styles.stat, !diffuse && { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1.5, borderColor: post.has_reacted ? colors.text : 'transparent', backgroundColor: post.has_reacted ? getModeColorSoft(mode) : 'transparent' }]}>
          <Heart
            size={14}
            color={diffuse ? (post.has_reacted ? accent : inkMuted) : colors.text}
            fill={post.has_reacted ? (diffuse ? accent : colors.text) : 'transparent'}
            strokeWidth={1.8}
          />
          <Text style={[styles.statText, { color: diffuse ? (post.has_reacted ? accent : inkMuted) : colors.text, fontFamily: diffuse ? statFont : 'SpaceMono_400Regular' }]}>{post.reaction_count}</Text>
        </Pressable>
        {showReplies ? (
          <View style={styles.stat}>
            <MessageCircle size={14} color={diffuse ? inkMuted : colors.text} strokeWidth={1.8} />
            <Text style={[styles.statText, { color: diffuse ? inkMuted : colors.text, fontFamily: diffuse ? statFont : 'SpaceMono_400Regular' }]}>{post.reply_count}</Text>
          </View>
        ) : null}
      </View>
    )
  }

  function renderReply({ item }: { item: CirclePost }) {
    return (
      <View style={[styles.reply, { borderLeftColor: diffuse ? cardBorder : colors.text }]}>
        <Text style={[styles.handle, { color: diffuse ? accent : colors.textMuted, fontFamily: diffuse ? diffuseFont.mono : 'SpaceMono_400Regular' }, !diffuse && { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.4 }]}>{anonHandleLabel(item.handle)}</Text>
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
      {diffuse ? (
        <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
          <ScreenHeader title={t('circles_threadTitle')} />
        </View>
      ) : (
        <View style={[styles.headerWrap, styles.siteHeader, { paddingTop: insets.top + 8 }]}>
          <InkBackButton ink={colors.text} paper={colors.surface} style={{ marginBottom: 0 }} />
          <SiteSticker name="bubble" size={34} cut />
          <Text style={[styles.siteTitle, { color: colors.text, fontFamily: font.display }]} numberOfLines={1}>{t('circles_threadTitle')}</Text>
        </View>
      )}

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
            <View style={[styles.parent, diffuse ? { backgroundColor: cardBg, borderColor: cardBorder, borderRadius: radius.lg } : { backgroundColor: colors.surface, borderColor: colors.text, borderWidth: 1.5, borderRadius: 18 }]}>
              <Text style={[styles.handle, { color: diffuse ? accent : colors.textMuted, fontFamily: diffuse ? diffuseFont.mono : 'SpaceMono_400Regular' }, !diffuse && { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.4 }]}>{anonHandleLabel(parent.handle)}</Text>
              <Text style={[styles.parentContent, { color: ink, fontFamily: diffuse ? diffuseFont.body : font.body }]}>{parent.content}</Text>
              {reactionRow(parent, true, true)}
            </View>
          ) : null
        }
        ListEmptyComponent={
          loading ? null : !parent ? (
            // The post was removed (moderation) or the link is stale — say so
            // instead of offering a reply box that can't send anywhere.
            <View style={styles.center}>
              <EmptyState
                icon={diffuse ? <MessageCircle size={36} color={inkMuted} strokeWidth={1.5} /> : <SiteSticker name="cloud" size={44} cut />}
                iconBg={diffuse ? dt.colors.surface : colors.surface}
                title={t('comm_postGoneTitle')}
                message={t('comm_postGoneBody')}
                ctaLabel={t('common_back')}
                onCtaPress={() => router.back()}
              />
            </View>
          ) : (
            <View style={styles.center}>
              <EmptyState
                icon={diffuse ? <MessageCircle size={36} color={inkMuted} strokeWidth={1.5} /> : <SiteSticker name="bubble" size={44} cut />}
                iconBg={diffuse ? dt.colors.surface : stickers.lilacSoft}
                title={t('circles_threadEmptyTitle')}
                message={t('circles_threadEmptyBody')}
              />
            </View>
          )
        }
      />

      {/* Reply composer — only when there's a post to reply to */}
      {(loading || parent) && (
      <View style={[styles.composer, { backgroundColor: cardBg, borderTopColor: line, paddingBottom: insets.bottom + 10 }]}>
        <View style={styles.composerRow}>
          <TextInput
            value={draft}
            onChangeText={(v) => { setDraft(v); if (sendError) setSendError(false) }}
            placeholder={t('circles_replyPlaceholder')}
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
            accessibilityRole="button"
            accessibilityLabel={t('channelScreen_sendA11y')}
            style={[styles.send, diffuse ? { backgroundColor: canSend ? accent : dt.colors.line, borderRadius: radius.full } : { width: 40, height: 40, backgroundColor: canSend ? colors.text : colors.borderLight, borderRadius: radius.full }]}
          >
            {sending
              ? <ActivityIndicator size="small" color={diffuse ? onAccent : colors.bg} />
              : <Send size={17} color={canSend ? (diffuse ? onAccent : colors.bg) : inkMuted} strokeWidth={2} />}
          </Pressable>
        </View>
        <Text
          style={[styles.composerHint, { color: sendError ? ink : inkMuted, fontFamily: diffuse ? diffuseFont.body : (sendError ? font.bodySemiBold : font.body) }]}
          accessibilityLiveRegion={sendError ? 'polite' : 'none'}
        >
          {sendError ? t('circles_sendFailed') : t('circles_composerHint')}
        </Text>
      </View>
      )}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerWrap: { paddingHorizontal: 16 },
  siteHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  siteTitle: { flex: 1, fontSize: 26, textTransform: 'uppercase', letterSpacing: 0.3 },
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
