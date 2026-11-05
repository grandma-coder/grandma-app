/**
 * Thread View — replies to a specific message in a channel.
 */

import { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Image,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Send,
  User,
  BadgeCheck,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand, stickers, font, useDiffuseTheme, diffuseFont, getDiffuseAccent, getModeColorSoft } from '../../../constants/theme'
import { useModeStore } from '../../../store/useModeStore'
import { useIsDiffuse, DiffuseArrow } from '../../../components/ui/diffuse/DiffuseKit'
import { DiffuseBloomIcon, DiffuseEmptyState } from '../../../components/ui/diffuse/DiffusePrimitives'
import { EmptyState } from '../../../components/ui/EmptyState'
import { InkBackButton } from '../../../components/ui/InkBackButton'
import { SiteSticker } from '../../../components/stickers/SiteSticker'
import {
  fetchThreadReplies,
  type ReplySort,
  sendMessage,
  toggleReaction,
  type ChannelPost,
} from '../../../lib/channelPosts'
import { supabase } from '../../../lib/supabase'
import { BrandedLoader } from '../../../components/ui/BrandedLoader'
import { useTranslation } from '../../../lib/i18n'
import { chatTime } from '../../../components/connections/communityLabels'

export default function ThreadView() {
  const { colors, radius } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const mode = useModeStore((s) => s.mode)
  const accent = diffuse ? getDiffuseAccent(mode, dt.isDark) : colors.primary
  const { t } = useTranslation()
  const tone = getModeColorSoft(mode)
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()

  const flatListRef = useRef<FlatList>(null)
  const [parentMsg, setParentMsg] = useState<ChannelPost | null>(null)
  const [replies, setReplies] = useState<ChannelPost[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sort, setSort] = useState<ReplySort>('newest')

  useEffect(() => {
    if (id) load(sort)
  }, [id, sort])

  async function load(sortBy: ReplySort = sort) {
    // Full-screen loader only for the first load — switching the sort pill
    // used to blank the whole thread and jump back to the top.
    if (!parentMsg) setLoading(true)
    try {
      // Fetch parent message (maybeSingle: a removed post is "not found", not an error)
      const { data: parent } = await supabase
        .from('channel_posts')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      setParentMsg((parent as ChannelPost | null) ?? null)

      // Fetch replies
      const replyData = await fetchThreadReplies(id!, sortBy)
      setReplies(replyData)
    } catch {} finally {
      setLoading(false)
    }
  }

  // Realtime for new replies
  useEffect(() => {
    if (!id) return
    const sub = supabase
      .channel(`thread-${id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'channel_posts',
        filter: `reply_to_id=eq.${id}`,
      }, (payload) => {
        const newReply = payload.new as ChannelPost
        setReplies((prev) => {
          if (prev.some((r) => r.id === newReply.id)) return prev
          return [...prev, newReply]
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [id])

  async function handleSend() {
    if (!text.trim() || !parentMsg) return
    setSending(true)
    try {
      const newReply = await sendMessage(parentMsg.channel_id, text.trim(), { replyToId: id! })
      // Optimistically add reply to list
      setReplies((prev) => {
        if (prev.some((r) => r.id === newReply.id)) return prev
        return [...prev, newReply]
      })
      setText('')
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200)
    } catch (e: any) {
      Alert.alert(t('channelScreen_sendFailed'), t('common_checkConnection'))
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
        <BrandedLoader />
      </View>
    )
  }

  // Removed post / stale link: no dead reply box under an empty thread.
  if (!parentMsg) {
    return (
      <View style={[s.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
        <View style={[s.header, { paddingTop: insets.top + 8, borderBottomWidth: 0, justifyContent: 'flex-start' }]}>
          {diffuse ? (
            <Pressable onPress={() => router.back()} style={s.headerBtn}>
              <ArrowLeft size={24} color={dt.colors.ink} strokeWidth={1.6} />
            </Pressable>
          ) : (
            <InkBackButton ink={colors.text} paper={colors.surface} style={{ marginBottom: 0 }} />
          )}
        </View>
        <View style={[s.center, { paddingHorizontal: 24 }]}>
          <EmptyState
            icon={diffuse ? <MessageCircle size={36} color={dt.colors.ink3} strokeWidth={1.5} /> : <SiteSticker name="cloud" size={48} cut />}
            iconBg={diffuse ? dt.colors.surface : tone}
            title={t('comm_postGoneTitle')}
            message={t('comm_postGoneBody')}
            ctaLabel={t('common_back')}
            onCtaPress={() => router.back()}
          />
        </View>
      </View>
    )
  }

  return (
    <View style={[s.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8, borderBottomColor: diffuse ? dt.colors.line : colors.border }]}>
        {diffuse ? (
          <Pressable onPress={() => router.back()} style={s.headerBtn}>
            <ArrowLeft size={24} color={dt.colors.ink} strokeWidth={1.6} />
          </Pressable>
        ) : (
          <InkBackButton ink={colors.text} paper={colors.surface} style={{ marginBottom: 0 }} />
        )}
        {!diffuse && <SiteSticker name="bubble" size={34} cut />}
        <Text style={[s.headerTitle, diffuse
          ? { color: dt.colors.ink, fontFamily: diffuseFont.display, fontWeight: '400' }
          : { color: colors.text, flex: 1, marginLeft: 10, fontWeight: '400', fontSize: 24, letterSpacing: 0.3, textTransform: 'uppercase' }]} numberOfLines={1}>{t('channelThread_header')}</Text>
        {diffuse && <View style={s.headerBtn} />}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={replies}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            parentMsg ? (
              <View style={[s.parentCard, diffuse
                ? { backgroundColor: dt.colors.surface, borderRadius: 20, borderLeftColor: accent, borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line, borderLeftWidth: 3 }
                : { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1.5, borderColor: colors.text, borderLeftWidth: 1.5, borderLeftColor: colors.text }]}>
                <View style={s.msgHeader}>
                  <View style={[s.avatar, diffuse
                    ? { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line2 }
                    : { backgroundColor: tone, borderWidth: 1.5, borderColor: colors.text }]}>
                    <User size={16} color={diffuse ? dt.colors.ink3 : colors.text} strokeWidth={1.5} />
                  </View>
                  <Text style={[s.authorName, diffuse
                    ? { color: dt.colors.ink, fontFamily: diffuseFont.bodySemiBold, fontWeight: '400' }
                    : { color: colors.text, fontFamily: font.bodyBold, fontWeight: '400' }]}>
                    {parentMsg.author_name ?? t('channelThread_memberFallback')}
                  </Text>
                  {parentMsg.author_is_expert && (
                    <BadgeCheck size={13} color={diffuse ? dt.stickers.blue : brand.primary} strokeWidth={2} />
                  )}
                  <Text style={[s.time, diffuse
                    ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono }
                    : { color: colors.textMuted, fontFamily: 'SpaceMono_400Regular', fontSize: 10, fontWeight: '400' }]}>
                    {formatTime(parentMsg.created_at)}
                  </Text>
                </View>
                <Text style={[s.msgContent, diffuse
                  ? { color: dt.colors.ink, fontFamily: diffuseFont.body }
                  : { color: colors.text, fontFamily: font.body }]}>{parentMsg.content}</Text>
                {parentMsg.photos?.length > 0 && (
                  <Image source={{ uri: parentMsg.photos[0] }} style={[s.photo, { borderRadius: radius.lg }]} />
                )}
                <Text style={[s.replyCountText, diffuse
                  ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1.2, textTransform: 'uppercase', fontSize: 10 }
                  : { color: colors.textMuted, fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: '400' }]}>
                  {replies.length === 1 ? t('channelThread_replyCountOne', { count: replies.length }) : t('channelThread_replyCountMany', { count: replies.length })}
                </Text>

                {/* Sort toggle (Phase 3) — only when there's more than one reply */}
                {replies.length > 1 && (
                  <View style={s.sortRow}>
                    {(['newest', 'top'] as ReplySort[]).map((opt) => {
                      const on = sort === opt
                      return (
                        <Pressable
                          key={opt}
                          onPress={() => setSort(opt)}
                          style={[
                            s.sortPill,
                            {
                              backgroundColor: on ? (diffuse ? dt.colors.ink : tone) : 'transparent',
                              borderColor: diffuse ? dt.colors.line : colors.text,
                            },
                            !diffuse && { borderWidth: 1.5 },
                          ]}
                        >
                          <Text style={[
                            s.sortPillText,
                            {
                              color: diffuse ? (on ? dt.colors.bg : dt.colors.ink3) : colors.text,
                              fontFamily: diffuse ? diffuseFont.mono : 'SpaceMono_400Regular',
                            },
                          ]}>
                            {opt === 'newest' ? t('channelThread_sortNewest') : t('channelThread_sortTop')}
                          </Text>
                        </Pressable>
                      )
                    })}
                  </View>
                )}
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={[s.replyRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: diffuse ? dt.colors.line : colors.border }]}>
              <View style={[s.avatar, diffuse
                ? { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line2 }
                : { backgroundColor: tone, borderWidth: 1.5, borderColor: colors.text }]}>
                <User size={14} color={diffuse ? dt.colors.ink3 : colors.text} strokeWidth={1.5} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.replyHeader}>
                  <Text style={[s.replyAuthor, diffuse
                    ? { color: dt.colors.ink, fontFamily: diffuseFont.bodySemiBold, fontWeight: '400' }
                    : { color: colors.text, fontFamily: font.bodyBold, fontWeight: '400' }]}>
                    {item.author_name ?? t('channelThread_memberFallback')}
                  </Text>
                  {item.author_is_expert && (
                    <BadgeCheck size={12} color={diffuse ? dt.stickers.blue : brand.primary} strokeWidth={2} />
                  )}
                  <Text style={[s.replyTime, diffuse
                    ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono }
                    : { color: colors.textMuted, fontFamily: 'SpaceMono_400Regular', fontSize: 10, fontWeight: '400' }]}>
                    {formatTime(item.created_at)}
                  </Text>
                </View>
                <Text style={[s.replyContent, diffuse
                  ? { color: dt.colors.ink, fontFamily: diffuseFont.body }
                  : { color: colors.text, fontFamily: font.body }]}>{item.content}</Text>
                {item.photos?.length > 0 && (
                  <Image source={{ uri: item.photos[0] }} style={[s.replyPhoto, { borderRadius: radius.md }]} />
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={
            diffuse ? (
              <DiffuseEmptyState
                icon={
                  <DiffuseBloomIcon color={accent} size={44} intensity={0.5}>
                    <MessageCircle size={22} color={dt.colors.ink3} strokeWidth={1.6} />
                  </DiffuseBloomIcon>
                }
                title={t('channelThread_emptyTitle')}
                message={t('channelThread_emptySubtitle')}
              />
            ) : (
              <EmptyState
                icon={<SiteSticker name="bubble" size={44} cut />}
                iconBg={tone}
                title={t('channelThread_emptyTitle')}
                message={t('channelThread_emptySubtitle')}
              />
            )
          }
        />

        {/* Reply input */}
        <View style={[s.inputBar, diffuse
          ? { paddingBottom: insets.bottom + 8, backgroundColor: dt.colors.bg, borderTopColor: dt.colors.line }
          : { paddingBottom: insets.bottom + 8, backgroundColor: colors.bg, borderTopColor: colors.border }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t('channelThread_replyPlaceholder')}
            placeholderTextColor={diffuse ? dt.colors.ink4 : colors.textMuted}
            style={[s.input, diffuse
              ? { color: dt.colors.ink, backgroundColor: dt.colors.surface, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line, fontFamily: diffuseFont.body }
              : { color: colors.text, backgroundColor: colors.surface, borderRadius: 22, borderWidth: 1.5, borderColor: colors.text, fontFamily: font.body, fontSize: 16 }]}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          {diffuse ? (
            <Pressable
              onPress={handleSend}
              disabled={!text.trim() || sending}
              hitSlop={6}
              style={[s.sendBtn, { opacity: text.trim() ? 1 : 0.3 }]}
            >
              <DiffuseArrow color={dt.colors.ink} size={22} />
            </Pressable>
          ) : (
            <Pressable
              onPress={handleSend}
              disabled={!text.trim() || sending}
              accessibilityRole="button"
              accessibilityLabel={t('channelScreen_sendA11y')}
              style={[s.sendBtn, { width: 38, height: 38, backgroundColor: colors.text, borderRadius: radius.full, opacity: text.trim() ? 1 : 0.3 }]}
            >
              <Send size={17} color={colors.bg} strokeWidth={2} />
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

const formatTime = chatTime

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sortRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  sortPill: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  sortPillText: { fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerBtn: { width: 40, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontFamily: font.display, fontWeight: '700', letterSpacing: -0.3 },

  list: { padding: 16, paddingBottom: 20 },

  // Parent message
  parentCard: { padding: 16, gap: 10, marginBottom: 20, borderLeftWidth: 3 },
  msgHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  authorName: { fontSize: 14, fontWeight: '700' },
  time: { fontSize: 11, fontWeight: '500' },
  msgContent: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  photo: { width: '100%', height: 200, resizeMode: 'cover', marginTop: 4 },
  replyCountText: { fontSize: 12, fontWeight: '600', marginTop: 4 },

  // Replies
  replyRow: { flexDirection: 'row', gap: 10, paddingVertical: 10 },
  replyHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  replyAuthor: { fontSize: 13, fontWeight: '700' },
  replyTime: { fontSize: 11, fontWeight: '500' },
  replyContent: { fontSize: 14, fontWeight: '400', lineHeight: 20, marginTop: 2 },
  replyPhoto: { width: 200, height: 150, resizeMode: 'cover', marginTop: 6 },
  emptyReplies: { paddingTop: 20, alignItems: 'center' },
  emptyText: { fontSize: 13, fontWeight: '500' },

  // Input
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1 },
  input: { flex: 1, paddingHorizontal: 16, height: 44, fontSize: 14, fontWeight: '500' },
  sendBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
})
