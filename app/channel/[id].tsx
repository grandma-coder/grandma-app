/**
 * Channel Detail — posts feed with realtime, post composer, reactions.
 */

import { useState, useEffect, useCallback } from 'react'
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
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { router, useLocalSearchParams } from 'expo-router'
import {
  ArrowLeft,
  Hash,
  Users,
  Heart,
  MessageCircle,
  Plus,
  Send,
  Camera,
  Pin,
  X,
  User,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { getChannels, type Channel } from '../../lib/channels'
import {
  fetchPosts,
  createPost,
  toggleReaction,
  isChannelMember,
  joinChannel,
  leaveChannel,
  type ChannelPost,
} from '../../lib/channelPosts'
import { supabase } from '../../lib/supabase'
import { LogSheet } from '../../components/calendar/LogSheet'

export default function ChannelDetail() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()

  const [channel, setChannel] = useState<Channel | null>(null)
  const [posts, setPosts] = useState<ChannelPost[]>([])
  const [isMember, setIsMember] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showComposer, setShowComposer] = useState(false)

  useEffect(() => {
    if (id) load()
  }, [id])

  // Realtime subscription
  useEffect(() => {
    if (!id) return
    const subscription = supabase
      .channel(`posts-${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'channel_posts', filter: `channel_id=eq.${id}` },
        (payload) => {
          setPosts((prev) => [payload.new as ChannelPost, ...prev])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(subscription) }
  }, [id])

  async function load() {
    setLoading(true)
    try {
      const [allChannels, postData, member] = await Promise.all([
        getChannels(),
        fetchPosts(id!),
        isChannelMember(id!),
      ])
      setChannel(allChannels.find((c) => c.id === id) ?? null)
      setPosts(postData)
      setIsMember(member)
    } catch {} finally {
      setLoading(false)
    }
  }

  async function handleJoinLeave() {
    if (!id) return
    if (isMember) {
      await leaveChannel(id)
      setIsMember(false)
    } else {
      await joinChannel(id)
      setIsMember(true)
    }
  }

  async function handleReaction(postId: string) {
    const reacted = await toggleReaction(postId)
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, reaction_count: p.reaction_count + (reacted ? 1 : -1), user_reacted: reacted }
          : p
      )
    )
  }

  const pinnedPosts = posts.filter((p) => p.is_pinned)
  const regularPosts = posts.filter((p) => !p.is_pinned)

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Hash size={18} color={colors.primary} strokeWidth={2} />
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {channel?.name ?? 'Channel'}
          </Text>
        </View>
        <Pressable
          onPress={handleJoinLeave}
          style={[
            styles.joinLeaveBtn,
            {
              backgroundColor: isMember ? colors.surfaceRaised : colors.primary,
              borderRadius: radius.lg,
            },
          ]}
        >
          <Text style={[styles.joinLeaveText, { color: isMember ? colors.textSecondary : '#FFFFFF' }]}>
            {isMember ? 'Leave' : 'Join'}
          </Text>
        </Pressable>
      </View>

      {/* Channel info */}
      <View style={[styles.channelInfo, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.channelDesc, { color: colors.textSecondary }]}>
          {channel?.description ?? ''}
        </Text>
        <View style={styles.memberRow}>
          <Users size={14} color={colors.textMuted} strokeWidth={2} />
          <Text style={[styles.memberText, { color: colors.textMuted }]}>
            {channel?.memberCount ?? 0} members
          </Text>
        </View>
      </View>

      {/* Posts feed */}
      <FlatList
        data={[...pinnedPosts, ...regularPosts]}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.postsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyPosts}>
            <MessageCircle size={32} color={colors.textMuted} strokeWidth={1.5} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No posts yet. Start the conversation!
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <PostCard post={item} onReaction={() => handleReaction(item.id)} />
        )}
      />

      {/* New post FAB */}
      {isMember && (
        <Pressable
          onPress={() => setShowComposer(true)}
          style={({ pressed }) => [
            styles.fab,
            {
              backgroundColor: colors.primary,
              borderRadius: radius.full,
              bottom: insets.bottom + 20,
            },
            pressed && { transform: [{ scale: 0.95 }] },
          ]}
        >
          <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>
      )}

      {/* Post composer */}
      <PostComposer
        visible={showComposer}
        channelId={id!}
        onClose={() => setShowComposer(false)}
        onPosted={() => { setShowComposer(false); load() }}
      />
    </View>
  )
}

// ─── Post Card ─────────────────────────────────────────────────────────────

function PostCard({ post, onReaction }: { post: ChannelPost; onReaction: () => void }) {
  const { colors, radius } = useTheme()

  return (
    <View style={[styles.postCard, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
      {/* Pinned badge */}
      {post.is_pinned && (
        <View style={[styles.pinnedBadge, { backgroundColor: brand.accent + '15', borderRadius: radius.full }]}>
          <Pin size={10} color={brand.accent} strokeWidth={2} />
          <Text style={[styles.pinnedText, { color: brand.accent }]}>Pinned</Text>
        </View>
      )}

      {/* Author */}
      <View style={styles.postHeader}>
        <View style={[styles.postAvatar, { backgroundColor: colors.surfaceRaised }]}>
          <User size={16} color={colors.textMuted} strokeWidth={1.5} />
        </View>
        <View>
          <Text style={[styles.postAuthor, { color: colors.text }]}>
            {post.author_name ?? 'Community Member'}
          </Text>
          <Text style={[styles.postTime, { color: colors.textMuted }]}>
            {formatTime(post.created_at)}
          </Text>
        </View>
      </View>

      {/* Content */}
      <Text style={[styles.postContent, { color: colors.text }]}>{post.content}</Text>

      {/* Photos */}
      {post.photos.length > 0 && (
        <View style={styles.postPhotos}>
          {post.photos.map((uri, i) => (
            <Image key={i} source={{ uri }} style={[styles.postPhoto, { borderRadius: radius.lg }]} />
          ))}
        </View>
      )}

      {/* Reactions row */}
      <View style={[styles.reactionsRow, { borderTopColor: colors.borderLight }]}>
        <Pressable onPress={onReaction} style={styles.reactionBtn}>
          <Heart
            size={18}
            color={post.user_reacted ? brand.error : colors.textMuted}
            strokeWidth={2}
            fill={post.user_reacted ? brand.error : 'none'}
          />
          <Text style={[styles.reactionCount, { color: colors.textMuted }]}>
            {post.reaction_count || ''}
          </Text>
        </Pressable>
        <View style={styles.reactionBtn}>
          <MessageCircle size={18} color={colors.textMuted} strokeWidth={2} />
          <Text style={[styles.reactionCount, { color: colors.textMuted }]}>
            {post.comment_count || ''}
          </Text>
        </View>
      </View>
    </View>
  )
}

// ─── Post Composer ─────────────────────────────────────────────────────────

function PostComposer({
  visible,
  channelId,
  onClose,
  onPosted,
}: {
  visible: boolean
  channelId: string
  onClose: () => void
  onPosted: () => void
}) {
  const { colors, radius } = useTheme()
  const [content, setContent] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [posting, setPosting] = useState(false)

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 4,
    })
    if (!result.canceled) {
      setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 4))
    }
  }

  async function handlePost() {
    if (!content.trim()) return
    setPosting(true)
    try {
      await createPost(channelId, content, photos.length > 0 ? photos : undefined)
      setContent('')
      setPhotos([])
      onPosted()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setPosting(false)
    }
  }

  return (
    <LogSheet visible={visible} title="New Post" onClose={onClose}>
      <View style={composerStyles.form}>
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="Share something with the community..."
          placeholderTextColor={colors.textMuted}
          multiline
          style={[composerStyles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
        />
        {photos.length > 0 && (
          <View style={composerStyles.photoRow}>
            {photos.map((uri, i) => (
              <View key={i} style={{ position: 'relative' }}>
                <Image source={{ uri }} style={[composerStyles.photoThumb, { borderRadius: radius.lg }]} />
                <Pressable onPress={() => setPhotos((p) => p.filter((_, j) => j !== i))} style={composerStyles.removePhoto}>
                  <X size={10} color="#FFF" />
                </Pressable>
              </View>
            ))}
          </View>
        )}
        <View style={composerStyles.actions}>
          <Pressable onPress={pickPhoto} style={[composerStyles.photoBtn, { borderColor: colors.border, borderRadius: radius.lg }]}>
            <Camera size={20} color={colors.textSecondary} strokeWidth={2} />
          </Pressable>
          <Pressable
            onPress={handlePost}
            disabled={!content.trim() || posting}
            style={({ pressed }) => [
              composerStyles.postBtn,
              { backgroundColor: colors.primary, borderRadius: radius.lg, opacity: !content.trim() ? 0.4 : 1 },
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
          >
            {posting ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Send size={16} color="#FFF" strokeWidth={2} />
                <Text style={composerStyles.postBtnText}>Post</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </LogSheet>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m`
  const diffHrs = Math.floor(diffMin / 60)
  if (diffHrs < 24) return `${diffHrs}h`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerBtn: { padding: 4 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginLeft: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  joinLeaveBtn: { paddingVertical: 6, paddingHorizontal: 16 },
  joinLeaveText: { fontSize: 13, fontWeight: '700' },

  // Channel info
  channelInfo: { paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, gap: 6 },
  channelDesc: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  memberText: { fontSize: 12, fontWeight: '600' },

  // Posts
  postsList: { paddingHorizontal: 16, paddingVertical: 12, gap: 12, paddingBottom: 100 },
  emptyPosts: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, fontWeight: '500' },

  // Post card
  postCard: { padding: 16, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  pinnedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 2, paddingHorizontal: 8, marginBottom: 4 },
  pinnedText: { fontSize: 10, fontWeight: '700' },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  postAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  postAuthor: { fontSize: 14, fontWeight: '700' },
  postTime: { fontSize: 11, fontWeight: '500' },
  postContent: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  postPhotos: { flexDirection: 'row', gap: 8 },
  postPhoto: { width: 100, height: 100, resizeMode: 'cover' },
  reactionsRow: { flexDirection: 'row', gap: 20, paddingTop: 10, borderTopWidth: 1 },
  reactionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reactionCount: { fontSize: 13, fontWeight: '600' },

  // FAB
  fab: { position: 'absolute', right: 20, width: 56, height: 56, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
})

const composerStyles = StyleSheet.create({
  form: { gap: 12, paddingBottom: 8 },
  input: { borderWidth: 1, padding: 16, fontSize: 15, fontWeight: '500', minHeight: 100, textAlignVertical: 'top' },
  photoRow: { flexDirection: 'row', gap: 8 },
  photoThumb: { width: 64, height: 64 },
  removePhoto: { position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: '#F44336', alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  photoBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  postBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 24 },
  postBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
})
