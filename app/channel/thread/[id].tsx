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
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import {
  ArrowLeft,
  Heart,
  Send,
  User,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../../constants/theme'
import {
  fetchThreadReplies,
  sendMessage,
  toggleReaction,
  type ChannelPost,
} from '../../../lib/channelPosts'
import { supabase } from '../../../lib/supabase'

export default function ThreadView() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()

  const flatListRef = useRef<FlatList>(null)
  const [parentMsg, setParentMsg] = useState<ChannelPost | null>(null)
  const [replies, setReplies] = useState<ChannelPost[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (id) load()
  }, [id])

  async function load() {
    setLoading(true)
    try {
      // Fetch parent message
      const { data: parent } = await supabase
        .from('channel_posts')
        .select('*')
        .eq('id', id)
        .single()
      if (parent) setParentMsg(parent as ChannelPost)

      // Fetch replies
      const replyData = await fetchThreadReplies(id!)
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
      await sendMessage(parentMsg.channel_id, text.trim(), { replyToId: id! })
      setText('')
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200)
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={s.headerBtn}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>Thread</Text>
        <View style={s.headerBtn} />
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
              <View style={[s.parentCard, { backgroundColor: colors.surface, borderRadius: radius.xl, borderLeftColor: colors.primary }]}>
                <View style={s.msgHeader}>
                  <View style={[s.avatar, { backgroundColor: colors.surfaceRaised }]}>
                    <User size={16} color={colors.textMuted} strokeWidth={1.5} />
                  </View>
                  <Text style={[s.authorName, { color: colors.text }]}>
                    {parentMsg.author_name ?? 'Member'}
                  </Text>
                  <Text style={[s.time, { color: colors.textMuted }]}>
                    {formatTime(parentMsg.created_at)}
                  </Text>
                </View>
                <Text style={[s.msgContent, { color: colors.text }]}>{parentMsg.content}</Text>
                {parentMsg.photos?.length > 0 && (
                  <Image source={{ uri: parentMsg.photos[0] }} style={[s.photo, { borderRadius: radius.lg }]} />
                )}
                <Text style={[s.replyCountText, { color: colors.textMuted }]}>
                  {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={s.replyRow}>
              <View style={[s.avatar, { backgroundColor: colors.surfaceRaised }]}>
                <User size={14} color={colors.textMuted} strokeWidth={1.5} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.replyHeader}>
                  <Text style={[s.replyAuthor, { color: colors.text }]}>
                    {item.author_name ?? 'Member'}
                  </Text>
                  <Text style={[s.replyTime, { color: colors.textMuted }]}>
                    {formatTime(item.created_at)}
                  </Text>
                </View>
                <Text style={[s.replyContent, { color: colors.text }]}>{item.content}</Text>
                {item.photos?.length > 0 && (
                  <Image source={{ uri: item.photos[0] }} style={[s.replyPhoto, { borderRadius: radius.md }]} />
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={s.emptyReplies}>
              <Text style={[s.emptyText, { color: colors.textMuted }]}>
                No replies yet. Be the first!
              </Text>
            </View>
          }
        />

        {/* Reply input */}
        <View style={[s.inputBar, { paddingBottom: insets.bottom + 8, backgroundColor: colors.bg, borderTopColor: colors.border }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Reply..."
            placeholderTextColor={colors.textMuted}
            style={[s.input, { color: colors.text, backgroundColor: colors.surface, borderRadius: radius.full }]}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <Pressable
            onPress={handleSend}
            disabled={!text.trim() || sending}
            style={[s.sendBtn, { backgroundColor: colors.primary, borderRadius: radius.full, opacity: text.trim() ? 1 : 0.3 }]}
          >
            <Send size={18} color="#FFF" strokeWidth={2} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diffMin < 1) return 'now'
  if (diffMin < 60) return `${diffMin}m`
  const diffHrs = Math.floor(diffMin / 60)
  if (diffHrs < 24) return `${diffHrs}h`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerBtn: { width: 40, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },

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
  input: { flex: 1, paddingHorizontal: 16, height: 42, fontSize: 14, fontWeight: '500' },
  sendBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
})
