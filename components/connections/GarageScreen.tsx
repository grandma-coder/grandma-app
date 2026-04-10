/**
 * F2 — Garage Feed (Instagram-style)
 *
 * Vertical scroll feed with full-width media posts,
 * like/comment/share/save actions, and post composer via FAB.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  Pressable,
  FlatList,
  Image,
  ScrollView,
  Alert,
  Share,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Animated,
  RefreshControl,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  Plus,
  Camera,
  User,
  MoreHorizontal,
  Play,
} from 'lucide-react-native'
import { useTheme, brand } from '../../constants/theme'
import {
  fetchFeed,
  toggleLike,
  toggleSave,
  deletePost,
  type GaragePost,
  type MediaItem,
} from '../../lib/garagePosts'
import { supabase } from '../../lib/supabase'

const SCREEN_W = Dimensions.get('window').width
const MEDIA_HEIGHT = SCREEN_W * 1.1 // Slightly taller than square, like IG

// ─── Feed Categories ──────────────────────────────────────────────────────

const FEED_FILTERS = ['For You', 'Clothing', 'Gear', 'Toys', 'Furniture', 'Books']

// ─── Main Component ───────────────────────────────────────────────────────

export function GarageScreen() {
  const { colors, radius, spacing } = useTheme()

  const [posts, setPosts] = useState<GaragePost[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeFilter, setActiveFilter] = useState('For You')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUserId(data.session?.user.id ?? null)
    })
  }, [])

  // Reload feed on filter change
  useEffect(() => {
    loadFeed()
  }, [activeFilter])

  // Reload feed when screen comes into focus (e.g. after creating a post)
  useFocusEffect(
    useCallback(() => {
      loadFeed()
    }, [activeFilter])
  )

  async function loadFeed() {
    setLoading(true)
    try {
      const category = activeFilter === 'For You' ? undefined : activeFilter
      const data = await fetchFeed({ category })
      setPosts(data)
    } catch {} finally {
      setLoading(false)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    try {
      const category = activeFilter === 'For You' ? undefined : activeFilter
      const data = await fetchFeed({ category })
      setPosts(data)
    } catch {} finally {
      setRefreshing(false)
    }
  }

  async function handleLike(postId: string) {
    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              user_liked: !p.user_liked,
              like_count: p.like_count + (p.user_liked ? -1 : 1),
            }
          : p
      )
    )
    try {
      await toggleLike(postId)
    } catch {
      // Revert on error
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                user_liked: !p.user_liked,
                like_count: p.like_count + (p.user_liked ? -1 : 1),
              }
            : p
        )
      )
    }
  }

  async function handleSave(postId: string) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, user_saved: !p.user_saved } : p
      )
    )
    try {
      await toggleSave(postId)
    } catch {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, user_saved: !p.user_saved } : p
        )
      )
    }
  }

  function handleDelete(postId: string) {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setPosts((prev) => prev.filter((p) => p.id !== postId))
          try {
            await deletePost(postId)
          } catch {
            loadFeed() // reload if delete failed
          }
        },
      },
    ])
  }

  function handleShare(post: GaragePost) {
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
          Share.share({
            message: `${caption}\n\n${postUrl}`,
          })
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  return (
    <View style={styles.root}>
      {/* Feed */}
      {loading && posts.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <View>
              <FeedFilters
                active={activeFilter}
                onSelect={setActiveFilter}
              />
              {/* My Garage profile button */}
              <Pressable
                onPress={() => router.push('/garage/profile' as any)}
                style={[styles.profileBtn, { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg }]}
              >
                <User size={16} color={colors.primary} strokeWidth={2} />
                <Text style={[styles.profileBtnText, { color: colors.primary }]}>My Garage</Text>
              </Pressable>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.primaryTint }]}>
                <Camera size={32} color={colors.primary} strokeWidth={1.5} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No posts yet
              </Text>
              <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
                Be the first to share something with the community!
              </Text>
              <Pressable
                onPress={() => router.push('/garage/create' as any)}
                style={[styles.emptyBtn, { backgroundColor: colors.primary, borderRadius: radius.lg }]}
              >
                <Text style={styles.emptyBtnText}>Create Post</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <FeedPost
              post={item}
              isOwner={currentUserId === item.author_id}
              onLike={() => handleLike(item.id)}
              onSave={() => handleSave(item.id)}
              onComment={() => router.push(`/garage/${item.id}` as any)}
              onDelete={() => handleDelete(item.id)}
              onShare={() => handleShare(item)}
            />
          )}
        />
      )}

      {/* FAB */}
      <Pressable
        onPress={() => router.push('/garage/create' as any)}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: colors.primary, borderRadius: radius.full },
          pressed && { transform: [{ scale: 0.93 }] },
        ]}
      >
        <Plus size={26} color="#FFFFFF" strokeWidth={2.5} />
      </Pressable>
    </View>
  )
}

// ─── Feed Filters (horizontal chips) ──────────────────────────────────────

function FeedFilters({ active, onSelect }: { active: string; onSelect: (f: string) => void }) {
  const { colors, radius } = useTheme()

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterBar}
    >
      {FEED_FILTERS.map((f) => {
        const isActive = active === f
        return (
          <Pressable
            key={f}
            onPress={() => onSelect(f)}
            style={[
              styles.filterChip,
              {
                backgroundColor: isActive ? colors.primary : colors.surface,
                borderColor: isActive ? colors.primary : colors.border,
                borderRadius: radius.full,
              },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                { color: isActive ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              {f}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

// ─── Feed Post Card (Instagram-style) ─────────────────────────────────────

function FeedPost({
  post,
  isOwner,
  onLike,
  onSave,
  onComment,
  onDelete,
  onShare,
}: {
  post: GaragePost
  isOwner: boolean
  onLike: () => void
  onSave: () => void
  onComment: () => void
  onDelete: () => void
  onShare: () => void
}) {
  const { colors, radius } = useTheme()
  const [mediaIndex, setMediaIndex] = useState(0)
  const [captionExpanded, setCaptionExpanded] = useState(false)
  const likeScale = useRef(new Animated.Value(1)).current

  function animateLike() {
    onLike()
    Animated.sequence([
      Animated.spring(likeScale, { toValue: 1.3, useNativeDriver: true, speed: 50 }),
      Animated.spring(likeScale, { toValue: 1, useNativeDriver: true, speed: 30 }),
    ]).start()
  }

  const hasMultipleMedia = post.media.length > 1
  const captionShort = post.caption && post.caption.length > 120

  return (
    <View style={[styles.postCard, { borderBottomColor: colors.borderLight }]}>
      {/* Header: Author */}
      <View style={styles.postHeader}>
        <Pressable style={styles.postAuthorRow}>
          <View style={[styles.avatar, { backgroundColor: colors.surfaceRaised }]}>
            <User size={18} color={colors.textMuted} strokeWidth={1.5} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.authorName, { color: colors.text }]}>
              {post.author_name ?? 'Community Member'}
            </Text>
            {post.category && (
              <Text style={[styles.categoryLabel, { color: colors.textMuted }]}>
                {post.category}
              </Text>
            )}
          </View>
        </Pressable>
        <Pressable
          hitSlop={12}
          onPress={() => {
            if (isOwner) {
              Alert.alert('Post Options', '', [
                { text: 'Delete Post', style: 'destructive', onPress: onDelete },
                { text: 'Cancel', style: 'cancel' },
              ])
            } else {
              Alert.alert('Post Options', '', [
                { text: 'Report', onPress: () => {} },
                { text: 'Cancel', style: 'cancel' },
              ])
            }
          }}
        >
          <MoreHorizontal size={20} color={colors.textMuted} strokeWidth={2} />
        </Pressable>
      </View>

      {/* Media Carousel */}
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
              <MediaCard key={i} item={item} />
            ))}
          </ScrollView>

          {/* Pagination dots */}
          {hasMultipleMedia && (
            <View style={styles.dotsRow}>
              {post.media.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        i === mediaIndex ? colors.primary : colors.textMuted + '40',
                    },
                  ]}
                />
              ))}
            </View>
          )}

          {/* Media counter badge */}
          {hasMultipleMedia && (
            <View style={[styles.mediaBadge, { backgroundColor: colors.bg + 'CC', borderRadius: radius.sm }]}>
              <Text style={[styles.mediaBadgeText, { color: colors.text }]}>
                {mediaIndex + 1}/{post.media.length}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Actions Row */}
      <View style={styles.actionsRow}>
        <View style={styles.actionsLeft}>
          {/* Like */}
          <Pressable onPress={animateLike} hitSlop={8}>
            <Animated.View style={{ transform: [{ scale: likeScale }] }}>
              <Heart
                size={24}
                color={post.user_liked ? brand.error : colors.text}
                strokeWidth={2}
                fill={post.user_liked ? brand.error : 'none'}
              />
            </Animated.View>
          </Pressable>

          {/* Comment */}
          <Pressable onPress={onComment} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <MessageCircle size={24} color={colors.text} strokeWidth={2} />
            {post.comment_count > 0 && (
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{post.comment_count}</Text>
            )}
          </Pressable>

          {/* Share */}
          <Pressable onPress={onShare} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Send size={22} color={colors.text} strokeWidth={2} />
            {post.share_count > 0 && (
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{post.share_count}</Text>
            )}
          </Pressable>
        </View>

        {/* Save / Bookmark */}
        <Pressable onPress={onSave} hitSlop={8}>
          <Bookmark
            size={24}
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
        <View style={styles.captionRow}>
          <Text style={[styles.captionText, { color: colors.text }]} numberOfLines={captionExpanded ? undefined : 2}>
            <Text style={styles.captionAuthor}>{post.author_name ?? 'Community Member'} </Text>
            {post.caption}
          </Text>
          {captionShort && !captionExpanded && (
            <Pressable onPress={() => setCaptionExpanded(true)}>
              <Text style={[styles.moreText, { color: colors.textMuted }]}>more</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Comments preview */}
      {post.comment_count > 0 && (
        <Pressable onPress={onComment}>
          <Text style={[styles.viewComments, { color: colors.textMuted }]}>
            View {post.comment_count === 1 ? '1 comment' : `all ${post.comment_count} comments`}
          </Text>
        </Pressable>
      )}

      {/* Timestamp */}
      <Text style={[styles.timestamp, { color: colors.textMuted }]}>
        {formatTimeAgo(post.created_at)}
      </Text>
    </View>
  )
}

// ─── Media Card (photo or video) ──────────────────────────────────────────

function MediaCard({ item }: { item: MediaItem }) {
  const { colors } = useTheme()

  return (
    <View style={styles.mediaContainer}>
      <Image source={{ uri: item.url }} style={styles.mediaImage} />
      {item.type === 'video' && (
        <View style={styles.videoPlayOverlay}>
          <Play size={32} color="#FFFFFF" fill="#FFFFFF" />
        </View>
      )}
    </View>
  )
}


// ─── Helpers ──────────────────────────────────────────────────────────────

function formatTimeAgo(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000)

  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHrs = Math.floor(diffMin / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Filters
  filterBar: { gap: 8, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16 },
  filterChip: { paddingVertical: 8, paddingHorizontal: 18, borderWidth: 1 },
  filterText: { fontSize: 13, fontWeight: '600' },

  // My Garage button
  profileBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginLeft: 16, marginBottom: 12, paddingVertical: 8, paddingHorizontal: 14 },
  profileBtnText: { fontSize: 13, fontWeight: '700' },

  // Empty state
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40, gap: 12 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontWeight: '800' },
  emptyBody: { fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 20 },
  emptyBtn: { marginTop: 12, paddingVertical: 12, paddingHorizontal: 32 },
  emptyBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  // Post card
  postCard: { borderBottomWidth: 1, paddingBottom: 16, marginBottom: 8 },

  // Post header
  postHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  postAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  authorName: { fontSize: 14, fontWeight: '700' },
  categoryLabel: { fontSize: 11, fontWeight: '500', marginTop: 1 },

  // Media
  mediaContainer: { width: SCREEN_W, height: MEDIA_HEIGHT },
  mediaImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  mediaBadge: { position: 'absolute', top: 12, right: 12, paddingVertical: 3, paddingHorizontal: 8 },
  mediaBadgeText: { fontSize: 12, fontWeight: '700' },
  videoPlayOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.2)' },

  // Actions
  actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  actionsLeft: { flexDirection: 'row', alignItems: 'center', gap: 18 },

  // Like count
  likeCount: { fontSize: 14, fontWeight: '700', paddingHorizontal: 16, marginTop: 4 },

  // Caption
  captionRow: { paddingHorizontal: 16, marginTop: 4 },
  captionText: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  captionAuthor: { fontWeight: '700' },
  moreText: { fontSize: 14, fontWeight: '400', marginTop: 1 },

  // Comments link
  viewComments: { fontSize: 13, fontWeight: '500', paddingHorizontal: 16, marginTop: 4 },

  // Timestamp
  timestamp: { fontSize: 11, fontWeight: '400', paddingHorizontal: 16, marginTop: 4 },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
})

