/**
 * Post Detail — Full post view with comments section (Instagram-style).
 */

import { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Alert,
  Share,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  User,
  MoreHorizontal,
  Play,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import {
  fetchPost,
  fetchComments,
  addComment,
  toggleLike,
  toggleSave,
  searchUsers,
  type GaragePost,
  type GarageComment,
  type MediaItem,
} from '../../lib/garagePosts'

const SCREEN_W = Dimensions.get('window').width

export default function PostDetail() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()

  const [post, setPost] = useState<GaragePost | null>(null)
  const [comments, setComments] = useState<GarageComment[]>([])
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [sending, setSending] = useState(false)
  const [mediaIndex, setMediaIndex] = useState(0)
  const likeScale = useRef(new Animated.Value(1)).current

  // @mention state
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionResults, setMentionResults] = useState<{ id: string; name: string }[]>([])
  const [showMentions, setShowMentions] = useState(false)

  useEffect(() => {
    if (id) load()
  }, [id])

  async function load() {
    setLoading(true)
    try {
      const [postData, commentsData] = await Promise.all([
        fetchPost(id!),
        fetchComments(id!),
      ])
      setPost(postData)
      setComments(commentsData)
    } catch {} finally {
      setLoading(false)
    }
  }

  async function handleLike() {
    if (!post) return
    setPost({
      ...post,
      user_liked: !post.user_liked,
      like_count: post.like_count + (post.user_liked ? -1 : 1),
    })
    Animated.sequence([
      Animated.spring(likeScale, { toValue: 1.3, useNativeDriver: true, speed: 50 }),
      Animated.spring(likeScale, { toValue: 1, useNativeDriver: true, speed: 30 }),
    ]).start()
    try {
      await toggleLike(id!)
    } catch {
      // Revert
      setPost((prev) =>
        prev ? { ...prev, user_liked: !prev.user_liked, like_count: prev.like_count + (prev.user_liked ? -1 : 1) } : prev
      )
    }
  }

  async function handleSave() {
    if (!post) return
    setPost({ ...post, user_saved: !post.user_saved })
    try {
      await toggleSave(id!)
    } catch {
      setPost((prev) => (prev ? { ...prev, user_saved: !prev.user_saved } : prev))
    }
  }

  function handleShare() {
    if (!post) return
    const postUrl = `grandma://garage/${post.id}`
    const caption = post.caption?.split('\n')[0] ?? 'Check out this post'

    Alert.alert('Share', '', [
      {
        text: 'Share to Channel',
        onPress: () => router.push({ pathname: '/garage/share', params: { postId: post.id, caption } } as any),
      },
      {
        text: 'Copy Link',
        onPress: () => {
          import('expo-clipboard').then(({ setStringAsync }) => {
            setStringAsync(postUrl)
            Alert.alert('Copied!', 'Link copied to clipboard')
          })
        },
      },
      {
        text: 'Share External...',
        onPress: () => {
          Share.share({ message: `${caption}\n\n${postUrl}` })
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  async function handleComment() {
    if (!commentText.trim() || sending) return
    setSending(true)
    try {
      const newComment = await addComment(id!, commentText.trim())
      setComments((prev) => [...prev, newComment])
      setPost((prev) => prev ? { ...prev, comment_count: prev.comment_count + 1 } : prev)
      setCommentText('')
      setShowMentions(false)
    } catch {} finally {
      setSending(false)
    }
  }

  function handleCommentTextChange(text: string) {
    setCommentText(text)

    // Detect @mention trigger
    const lastAtIndex = text.lastIndexOf('@')
    if (lastAtIndex >= 0) {
      const afterAt = text.slice(lastAtIndex + 1)
      // Only search if there's no space after @ (still typing the mention)
      if (!afterAt.includes(' ') && afterAt.length >= 1) {
        setMentionQuery(afterAt)
        setShowMentions(true)
        searchUsers(afterAt).then(setMentionResults).catch(() => {})
        return
      }
    }
    setShowMentions(false)
  }

  function insertMention(name: string) {
    const lastAtIndex = commentText.lastIndexOf('@')
    if (lastAtIndex >= 0) {
      const before = commentText.slice(0, lastAtIndex)
      setCommentText(`${before}@${name} `)
    }
    setShowMentions(false)
    setMentionResults([])
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  if (!post) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Post not found</Text>
      </View>
    )
  }

  const hasMultipleMedia = post.media.length > 1

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Post</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Post Author */}
        <View style={styles.postHeader}>
          <View style={styles.authorRow}>
            <View style={[styles.avatar, { backgroundColor: colors.surfaceRaised }]}>
              <User size={18} color={colors.textMuted} strokeWidth={1.5} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.authorName, { color: colors.text }]}>
                {post.author_name ?? 'Community Member'}
              </Text>
              {post.category && (
                <Text style={[styles.categoryText, { color: colors.textMuted }]}>{post.category}</Text>
              )}
            </View>
          </View>
          <Pressable hitSlop={12}>
            <MoreHorizontal size={20} color={colors.textMuted} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Media */}
        {post.media.length > 0 && (
          <View>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                setMediaIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))
              }}
            >
              {post.media.map((item, i) => (
                <View key={i} style={styles.mediaContainer}>
                  <Image source={{ uri: item.url }} style={styles.mediaContent} />
                  {item.type === 'video' && (
                    <View style={styles.videoOverlay}>
                      <Play size={36} color="#FFFFFF" fill="#FFFFFF" />
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
            {hasMultipleMedia && (
              <View style={styles.dotsRow}>
                {post.media.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      { backgroundColor: i === mediaIndex ? colors.primary : colors.textMuted + '40' },
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsRow}>
          <View style={styles.actionsLeft}>
            <Pressable onPress={handleLike} hitSlop={8}>
              <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                <Heart
                  size={26}
                  color={post.user_liked ? brand.error : colors.text}
                  strokeWidth={2}
                  fill={post.user_liked ? brand.error : 'none'}
                />
              </Animated.View>
            </Pressable>
            <Pressable hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MessageCircle size={26} color={colors.text} strokeWidth={2} />
              {post.comment_count > 0 && (
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{post.comment_count}</Text>
              )}
            </Pressable>
            <Pressable hitSlop={8} onPress={handleShare}>
              <Send size={24} color={colors.text} strokeWidth={2} />
            </Pressable>
          </View>
          <Pressable onPress={handleSave} hitSlop={8}>
            <Bookmark
              size={26}
              color={post.user_saved ? colors.primary : colors.text}
              strokeWidth={2}
              fill={post.user_saved ? colors.primary : 'none'}
            />
          </Pressable>
        </View>

        {/* Like count */}
        {post.like_count > 0 && (
          <Text style={[styles.likeCount, { color: colors.text }]}>
            {post.like_count.toLocaleString()} {post.like_count === 1 ? 'like' : 'likes'}
          </Text>
        )}

        {/* Caption */}
        {post.caption && (
          <View style={styles.captionSection}>
            <Text style={[styles.captionText, { color: colors.text }]}>
              <Text style={styles.captionAuthor}>{post.author_name ?? 'Community Member'} </Text>
              {post.caption}
            </Text>
          </View>
        )}

        {/* Timestamp */}
        <Text style={[styles.timestamp, { color: colors.textMuted }]}>
          {new Date(post.created_at).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </Text>

        {/* Comments divider */}
        <View style={[styles.commentsDivider, { borderTopColor: colors.borderLight }]}>
          <Text style={[styles.commentsHeader, { color: colors.text }]}>
            Comments {comments.length > 0 ? `(${comments.length})` : ''}
          </Text>
        </View>

        {/* Comments list */}
        {comments.length === 0 ? (
          <View style={styles.noComments}>
            <Text style={[styles.noCommentsText, { color: colors.textMuted }]}>
              No comments yet. Start the conversation!
            </Text>
          </View>
        ) : (
          comments.map((comment) => (
            <View key={comment.id} style={styles.commentRow}>
              <View style={[styles.commentAvatar, { backgroundColor: colors.surfaceRaised }]}>
                <User size={14} color={colors.textMuted} strokeWidth={1.5} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.commentContent, { color: colors.text }]}>
                  <Text style={styles.commentAuthor}>
                    {comment.author_name ?? 'Member'}{' '}
                  </Text>
                  <CommentText text={comment.content} />
                </Text>
                <Text style={[styles.commentTime, { color: colors.textMuted }]}>
                  {formatTimeAgo(comment.created_at)}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* @mention suggestions */}
      {showMentions && mentionResults.length > 0 && (
        <View style={[styles.mentionList, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          {mentionResults.map((user) => (
            <Pressable
              key={user.id}
              onPress={() => insertMention(user.name)}
              style={[styles.mentionItem, { borderBottomColor: colors.borderLight }]}
            >
              <View style={[styles.mentionAvatar, { backgroundColor: colors.surfaceRaised }]}>
                <User size={12} color={colors.textMuted} strokeWidth={1.5} />
              </View>
              <Text style={[styles.mentionName, { color: colors.text }]}>
                {user.name}
              </Text>
              <Text style={[styles.mentionHandle, { color: colors.textMuted }]}>
                @{user.name.toLowerCase().replace(/\s+/g, '')}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Comment input bar */}
      <View
        style={[
          styles.commentBar,
          {
            paddingBottom: insets.bottom + 8,
            backgroundColor: colors.bg,
            borderTopColor: colors.border,
          },
        ]}
      >
        <View style={[styles.commentAvatar, { backgroundColor: colors.surfaceRaised }]}>
          <User size={14} color={colors.textMuted} strokeWidth={1.5} />
        </View>
        <TextInput
          value={commentText}
          onChangeText={handleCommentTextChange}
          placeholder="Add a comment... use @ to tag"
          placeholderTextColor={colors.textMuted}
          style={[styles.commentInput, { color: colors.text }]}
          returnKeyType="send"
          onSubmitEditing={handleComment}
        />
        {commentText.trim().length > 0 && (
          <Pressable onPress={handleComment} disabled={sending}>
            <Text style={[styles.postCommentBtn, { color: colors.primary, opacity: sending ? 0.4 : 1 }]}>
              Post
            </Text>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}

// ─── Comment Text with @mention highlighting ─────────────────────────────

function CommentText({ text }: { text: string }) {
  const { colors } = useTheme()

  // Split by @mentions — pattern: @word (letters, no spaces)
  const parts = text.split(/(@\S+)/g)

  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('@') ? (
          <Text key={i} style={{ color: colors.primary, fontWeight: '600' }}>
            {part}
          </Text>
        ) : (
          <Text key={i}>{part}</Text>
        )
      )}
    </>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatTimeAgo(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000)

  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m`
  const diffHrs = Math.floor(diffMin / 60)
  if (diffHrs < 24) return `${diffHrs}h`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays < 7) return `${diffDays}d`
  return `${Math.floor(diffDays / 7)}w`
}

// ─── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 16, fontWeight: '500' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerBtn: { width: 40, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },

  // Post header
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  authorName: { fontSize: 14, fontWeight: '700' },
  categoryText: { fontSize: 11, fontWeight: '500', marginTop: 1 },

  // Media
  mediaContainer: { width: SCREEN_W, height: SCREEN_W, position: 'relative' },
  mediaContent: { width: '100%', height: '100%', resizeMode: 'cover' },
  videoOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.2)' },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3 },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  actionsLeft: { flexDirection: 'row', alignItems: 'center', gap: 18 },

  likeCount: { fontSize: 14, fontWeight: '700', paddingHorizontal: 16, marginTop: 4 },

  // Caption
  captionSection: { paddingHorizontal: 16, marginTop: 6 },
  captionText: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  captionAuthor: { fontWeight: '700' },

  // Timestamp
  timestamp: { fontSize: 11, fontWeight: '400', paddingHorizontal: 16, marginTop: 8 },

  // Comments
  commentsDivider: { borderTopWidth: 1, marginTop: 16, paddingTop: 16, marginHorizontal: 16 },
  commentsHeader: { fontSize: 15, fontWeight: '700' },
  noComments: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 20 },
  noCommentsText: { fontSize: 13, fontWeight: '500' },

  commentRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 8 },
  commentAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  commentContent: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  commentAuthor: { fontWeight: '700' },
  commentTime: { fontSize: 11, fontWeight: '500', marginTop: 4 },

  // @mention suggestions
  mentionList: { borderTopWidth: 1, maxHeight: 180 },
  mentionItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1 },
  mentionAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  mentionName: { fontSize: 14, fontWeight: '600' },
  mentionHandle: { fontSize: 12, fontWeight: '500' },

  // Comment input bar
  commentBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  commentInput: { flex: 1, fontSize: 14, fontWeight: '500', paddingVertical: 8 },
  postCommentBtn: { fontSize: 14, fontWeight: '700' },
})
