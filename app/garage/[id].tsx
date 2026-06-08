/**
 * Post Detail — full post view with comments, restyled to the cream-paper /
 * sticker-collage system. Action row uses soft-tinted sticker chips (Heart on
 * pink, comment on blue, send on yellow, save on lilac); typography is Fraunces
 * display + DM Sans body. All like/save/comment/@mention/share logic unchanged.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
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
  Animated,
  Alert,
  Share,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { MessageCircle, Send, Bookmark, User, MoreHorizontal, Play } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, getModeColor } from '../../constants/theme'
import { useModeStore } from '../../store/useModeStore'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { useSavedToast } from '../../components/ui/SavedToast'
import { BrandedLoader } from '../../components/ui/BrandedLoader'
import { Heart as HeartSticker } from '../../components/stickers/BrandStickers'
import {
  fetchPost,
  fetchComments,
  addComment,
  toggleLike,
  toggleSave,
  searchUsers,
  type GaragePost,
  type GarageComment,
} from '../../lib/garagePosts'

const SCREEN_W = Dimensions.get('window').width

export default function PostDetail() {
  const { colors, radius, stickers, font, isDark } = useTheme()
  const mode = useModeStore((s) => s.mode)
  const accent = getModeColor(mode, isDark)
  const insets = useSafeAreaInsets()
  const toast = useSavedToast()
  const { id } = useLocalSearchParams<{ id: string }>()
  const ink = isDark ? colors.text : '#141313'

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

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [postData, commentsData] = await Promise.all([
        fetchPost(id),
        fetchComments(id),
      ])
      setPost(postData)
      setComments(commentsData)
    } catch {} finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function handleLike() {
    if (!post || !id) return
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
      await toggleLike(id)
    } catch {
      // Revert
      setPost((prev) =>
        prev ? { ...prev, user_liked: !prev.user_liked, like_count: prev.like_count + (prev.user_liked ? -1 : 1) } : prev
      )
    }
  }

  async function handleSave() {
    if (!post || !id) return
    setPost({ ...post, user_saved: !post.user_saved })
    try {
      await toggleSave(id)
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
            toast.show({ title: 'Copied!', message: 'Link copied to clipboard.' })
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
    if (!commentText.trim() || sending || !id) return
    setSending(true)
    try {
      const newComment = await addComment(id, commentText.trim())
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
        <BrandedLoader />
      </View>
    )
  }

  if (!post) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary, fontFamily: font.bodyMedium }]}>
          Post not found
        </Text>
      </View>
    )
  }

  const hasMultipleMedia = post.media.length > 1
  const canSend = commentText.trim().length > 0

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
        <ScreenHeader title="Post" onBack={() => router.back()} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Post Author */}
        <View style={styles.postHeader}>
          <View style={styles.authorRow}>
            <View style={[styles.avatar, { backgroundColor: stickers.pinkSoft, borderColor: colors.border, borderRadius: radius.full }]}>
              <User size={18} color={ink} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.authorName, { color: colors.text, fontFamily: font.display }]}>
                {post.author_name ?? 'Community Member'}
              </Text>
              {post.category && (
                <Text style={[styles.categoryText, { color: colors.textMuted, fontFamily: font.bodyMedium }]}>
                  {post.category}
                </Text>
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
                      { backgroundColor: i === mediaIndex ? ink : colors.textMuted + '40' },
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Actions — soft-tinted sticker chips */}
        <View style={styles.actionsRow}>
          <View style={styles.actionsLeft}>
            <ActionChip
              tint={stickers.pinkSoft}
              active={post.user_liked}
              activeTint={stickers.peachSoft}
              border={colors.border}
              radiusFull={radius.full}
              onPress={handleLike}
              accessibilityLabel={post.user_liked ? 'Unlike' : 'Like'}
            >
              <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                <HeartSticker size={22} fill={post.user_liked ? stickers.coral : stickers.pink} />
              </Animated.View>
            </ActionChip>

            <ActionChip
              tint={stickers.blueSoft}
              border={colors.border}
              radiusFull={radius.full}
              onPress={() => {}}
              accessibilityLabel="Comments"
            >
              <MessageCircle size={20} color={stickers.blueInk} strokeWidth={2.4} />
            </ActionChip>

            <ActionChip
              tint={stickers.yellowSoft}
              border={colors.border}
              radiusFull={radius.full}
              onPress={handleShare}
              accessibilityLabel="Share"
            >
              <Send size={19} color={stickers.yellowInk} strokeWidth={2.4} />
            </ActionChip>
          </View>

          <ActionChip
            tint={post.user_saved ? stickers.lilac : stickers.lilacSoft}
            border={colors.border}
            radiusFull={radius.full}
            onPress={handleSave}
            accessibilityLabel={post.user_saved ? 'Saved' : 'Save'}
          >
            <Bookmark
              size={20}
              color={stickers.lilacInk}
              strokeWidth={2.4}
              fill={post.user_saved ? stickers.lilacInk : 'none'}
            />
          </ActionChip>
        </View>

        {/* Like count */}
        {post.like_count > 0 && (
          <Text style={[styles.likeCount, { color: colors.text, fontFamily: font.bodySemiBold }]}>
            {post.like_count.toLocaleString()} {post.like_count === 1 ? 'like' : 'likes'}
          </Text>
        )}

        {/* Caption — body subtitle under the title */}
        {post.caption && (
          <View style={styles.captionSection}>
            <Text style={[styles.captionText, { color: colors.textSecondary, fontFamily: font.body }]}>
              {post.caption}
            </Text>
          </View>
        )}

        {/* Timestamp — italic accent */}
        <Text style={[styles.timestamp, { color: accent, fontFamily: font.italic }]}>
          {new Date(post.created_at).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </Text>

        {/* Comments divider */}
        <View style={[styles.commentsDivider, { borderTopColor: colors.border }]}>
          <Text style={[styles.commentsHeader, { color: colors.text, fontFamily: font.display }]}>
            Comments{comments.length > 0 ? ` (${comments.length})` : ''}
          </Text>
        </View>

        {/* Comments list */}
        {comments.length === 0 ? (
          <View style={styles.noComments}>
            <Text style={[styles.noCommentsText, { color: colors.textMuted, fontFamily: font.bodyMedium }]}>
              No comments yet. Start the conversation!
            </Text>
          </View>
        ) : (
          comments.map((comment) => (
            <View key={comment.id} style={styles.commentRow}>
              <View style={[styles.commentAvatar, { backgroundColor: stickers.blueSoft, borderColor: colors.border, borderRadius: radius.full }]}>
                <User size={14} color={ink} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.commentContent, { color: colors.text, fontFamily: font.body }]}>
                  <Text style={[styles.commentAuthor, { fontFamily: font.bodySemiBold }]}>
                    {comment.author_name ?? 'Member'}{' '}
                  </Text>
                  <CommentText text={comment.content} />
                </Text>
                <Text style={[styles.commentTime, { color: colors.textMuted, fontFamily: font.bodyMedium }]}>
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
              style={[styles.mentionItem, { borderBottomColor: colors.border }]}
            >
              <View style={[styles.mentionAvatar, { backgroundColor: stickers.pinkSoft, borderColor: colors.border, borderRadius: radius.full }]}>
                <User size={12} color={ink} strokeWidth={2} />
              </View>
              <Text style={[styles.mentionName, { color: colors.text, fontFamily: font.bodySemiBold }]}>
                {user.name}
              </Text>
              <Text style={[styles.mentionHandle, { color: colors.textMuted, fontFamily: font.bodyMedium }]}>
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
        <View style={[styles.commentAvatar, { backgroundColor: stickers.pinkSoft, borderColor: colors.border, borderRadius: radius.full }]}>
          <User size={14} color={ink} strokeWidth={2} />
        </View>
        <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}>
          <TextInput
            value={commentText}
            onChangeText={handleCommentTextChange}
            placeholder="Add a comment… use @ to tag"
            placeholderTextColor={colors.textMuted}
            style={[styles.commentInput, { color: colors.text, fontFamily: font.body }]}
            returnKeyType="send"
            onSubmitEditing={handleComment}
          />
        </View>
        <Pressable
          onPress={handleComment}
          disabled={!canSend || sending}
          accessibilityRole="button"
          accessibilityLabel="Post comment"
          style={({ pressed }) => [
            styles.sendBtn,
            {
              backgroundColor: canSend ? stickers.yellow : colors.surfaceRaised,
              borderColor: canSend ? ink : colors.border,
              borderRadius: radius.full,
              opacity: sending ? 0.5 : pressed ? 0.85 : 1,
            },
          ]}
        >
          <Send size={18} color={canSend ? ink : colors.textMuted} strokeWidth={2.4} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

// ─── Action chip — soft-tinted circular button ──────────────────────────────

function ActionChip({
  children, onPress, tint, activeTint, active, border, radiusFull, accessibilityLabel,
}: {
  children: React.ReactNode
  onPress: () => void
  tint: string
  activeTint?: string
  active?: boolean
  border: string
  radiusFull: number
  accessibilityLabel?: string
}) {
  return (
    <Pressable
      hitSlop={6}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.actionChip,
        {
          backgroundColor: active && activeTint ? activeTint : tint,
          borderColor: border,
          borderRadius: radiusFull,
        },
        pressed && { opacity: 0.82, transform: [{ scale: 0.94 }] },
      ]}
    >
      {children}
    </Pressable>
  )
}

// ─── Comment Text with @mention highlighting ─────────────────────────────

function CommentText({ text }: { text: string }) {
  const { colors, font } = useTheme()

  // Split by @mentions — pattern: @word (letters, no spaces)
  const parts = text.split(/(@\S+)/g)

  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('@') ? (
          <Text key={i} style={{ color: colors.primary, fontFamily: font.bodySemiBold }}>
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
  errorText: { fontSize: 16 },

  // Post header
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar: { width: 38, height: 38, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  authorName: { fontSize: 18, letterSpacing: -0.3 },
  categoryText: { fontSize: 12, marginTop: 1 },

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
    paddingTop: 16,
    paddingBottom: 8,
  },
  actionsLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actionChip: {
    width: 44,
    height: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  likeCount: { fontSize: 14, paddingHorizontal: 16, marginTop: 4 },

  // Caption — body subtitle under the title
  captionSection: { paddingHorizontal: 16, marginTop: 6 },
  captionText: { fontSize: 15, lineHeight: 21 },

  // Timestamp — italic accent subtitle
  timestamp: { fontSize: 16, paddingHorizontal: 16, marginTop: 6 },

  // Comments
  commentsDivider: { borderTopWidth: 1, marginTop: 16, paddingTop: 16, marginHorizontal: 16 },
  commentsHeader: { fontSize: 24, letterSpacing: -0.5 },
  noComments: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 20 },
  noCommentsText: { fontSize: 13 },

  commentRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 8 },
  commentAvatar: { width: 30, height: 30, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  commentContent: { fontSize: 13, lineHeight: 18 },
  commentAuthor: {},
  commentTime: { fontSize: 11, marginTop: 4 },

  // @mention suggestions
  mentionList: { borderTopWidth: 1, maxHeight: 180 },
  mentionItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1 },
  mentionAvatar: { width: 28, height: 28, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  mentionName: { fontSize: 14 },
  mentionHandle: { fontSize: 12 },

  // Comment input bar
  commentBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  inputWrap: { flex: 1, borderWidth: 1, paddingHorizontal: 14, justifyContent: 'center' },
  commentInput: { fontSize: 14, paddingVertical: 10 },
  sendBtn: { width: 40, height: 40, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
})
