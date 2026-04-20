/**
 * Channel Chat — real-time messaging interface with threads, mentions, reactions.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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
  Share,
  Modal,
  Animated,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import {
  ArrowLeft,
  Users,
  Heart,
  MessageCircle,
  Send,
  Camera,
  Pin,
  X,
  User,
  Reply,
  AtSign,
  Star,
  Trash2,
  LogIn,
  LogOut,
  Lock,
  Share2,
  Link,
  Copy,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { channelSticker } from '../../lib/channelSticker'

// Cream paper-aesthetic CTA shared with Garage & Channels
const CREAM = '#F5EFE3'
const INK = '#1A1430'
import { getChannels, type Channel } from '../../lib/channels'
import {
  sendMessage,
  fetchMessages,
  toggleReaction,
  isChannelMember,
  joinChannel,
  leaveChannel,
  markChannelRead,
  searchChannelMembers,
  rateChannel,
  getMyRating,
  deleteMessage,
  favoriteChannel,
  unfavoriteChannel,
  getMyFavoriteChannelIds,
  notifyMentions,
  requestToJoinChannel,
  getMyRequestStatus,
  transferChannelOwnership,
  getChannelMembers,
  type ChannelPost,
  type ChannelRequest,
} from '../../lib/channelPosts'
import { supabase } from '../../lib/supabase'
import { checkPhotoSafety } from '../../lib/photoSafety'
import { BrandedLoader } from '../../components/ui/BrandedLoader'

// ─── Main Component ───────────────────────────────────────────────────────

export default function ChannelChat() {
  const { colors, radius, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()

  const flatListRef = useRef<FlatList<ChannelPost>>(null)
  const inputRef = useRef<TextInput>(null)

  const [channel, setChannel] = useState<Channel | null>(null)
  const [messages, setMessages] = useState<ChannelPost[]>([])
  const [isMember, setIsMember] = useState(false)
  const [loading, setLoading] = useState(true)

  // Input state
  const [text, setText] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [sending, setSending] = useState(false)

  // Reply state
  const [replyTo, setReplyTo] = useState<ChannelPost | null>(null)

  // Mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionResults, setMentionResults] = useState<{ id: string; name: string }[]>([])
  const [mentionIds, setMentionIds] = useState<string[]>([])

  // Favorite state
  const [isFavorited, setIsFavorited] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Rating state
  const [showRating, setShowRating] = useState(false)
  const [myRating, setMyRating] = useState(0)
  const [myReview, setMyReview] = useState('')
  const [savingRating, setSavingRating] = useState(false)

  // Share sheet state
  const [showShare, setShowShare] = useState(false)

  // Leave confirm state
  const [showLeave, setShowLeave] = useState(false)
  const [leaving, setLeaving] = useState(false)

  // Owner state
  const [isOwner, setIsOwner] = useState(false)

  // Private channel request state
  const [myRequest, setMyRequest] = useState<ChannelRequest | null>(null)

  // ─── Data loading ─────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [allChannels, msgData, member] = await Promise.all([
        getChannels(),
        fetchMessages(id),
        isChannelMember(id),
      ])
      setChannel(allChannels.find((c) => c.id === id) ?? null)
      setMessages(msgData)
      setIsMember(member)

      // Load current user, favorite state, and rating
      const { data: { session: sess } } = await supabase.auth.getSession()
      if (sess) {
        setCurrentUserId(sess.user.id)
        const ch = allChannels.find((c) => c.id === id)
        setIsOwner(sess.user.id === ch?.createdBy)
      }
      const favIds = await getMyFavoriteChannelIds()
      setIsFavorited(favIds.includes(id))

      const existing = await getMyRating(id)
      if (existing) {
        setMyRating(existing.rating)
        setMyReview(existing.review ?? '')
      }

      // Check private channel request status
      const ch = allChannels.find((c) => c.id === id)
      if (ch?.channelType === 'private' && !member) {
        const req = await getMyRequestStatus(id)
        setMyRequest(req)
      } else {
        setMyRequest(null)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) load()
  }, [id, load])

  // Mark as read on mount
  useEffect(() => {
    if (id) markChannelRead(id)
  }, [id])

  // Refresh reply counts when coming back from thread screen
  useFocusEffect(
    useCallback(() => {
      if (!id || loading) return
      // Re-fetch messages to get fresh reply_count from DB triggers
      fetchMessages(id).then((fresh) => {
        setMessages((prev) => {
          // Merge: update reply_count from fresh data, keep optimistic additions
          const freshMap = new Map(fresh.map((m) => [m.id, m]))
          const merged = prev.map((m) => {
            const f = freshMap.get(m.id)
            return f ? { ...m, reply_count: f.reply_count } : m
          })
          // Add any new messages not in prev
          for (const f of fresh) {
            if (!merged.some((m) => m.id === f.id)) merged.push(f)
          }
          return merged
        })
      }).catch(() => {})
    }, [id, loading])
  )

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true })
      }, 100)
    }
  }, [messages.length])

  // ─── Realtime subscription ────────────────────────────────────────────

  useEffect(() => {
    if (!id) return
    const subscription = supabase
      .channel(`chat-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'channel_posts',
          filter: `channel_id=eq.${id}`,
        },
        (payload) => {
          const newMsg = payload.new as ChannelPost
          // Only add top-level messages (not thread replies) and avoid duplicates
          if (!newMsg.reply_to_id) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
            })
          }
          // If the new message is a reply, increment reply_count on parent immediately
          if (newMsg.reply_to_id) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === newMsg.reply_to_id
                  ? { ...m, reply_count: (m.reply_count ?? 0) + 1 }
                  : m
              )
            )
          }
          // Re-mark as read
          markChannelRead(id)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'channel_posts',
          filter: `channel_id=eq.${id}`,
        },
        (payload) => {
          // Catch trigger-based reply_count updates from the DB
          const updated = payload.new as ChannelPost
          if (updated.reply_to_id === null) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === updated.id
                  ? { ...m, reply_count: updated.reply_count ?? m.reply_count }
                  : m
              )
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [id])

  // ─── Mention search ───────────────────────────────────────────────────

  useEffect(() => {
    if (mentionQuery === null || !id) {
      setMentionResults([])
      return
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const results = await searchChannelMembers(id, mentionQuery)
        if (!cancelled) setMentionResults(results)
      } catch {
        if (!cancelled) setMentionResults([])
      }
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [mentionQuery, id])

  // ─── Text change handler (detect @mentions) ──────────────────────────

  function handleTextChange(value: string) {
    setText(value)

    // Detect @mention trigger
    const lastAt = value.lastIndexOf('@')
    if (lastAt >= 0) {
      const afterAt = value.slice(lastAt + 1)
      // Only trigger if there's no space after the @ (user is still typing the name)
      if (!afterAt.includes(' ') && afterAt.length <= 30) {
        setMentionQuery(afterAt)
        return
      }
    }
    setMentionQuery(null)
  }

  function insertMention(member: { id: string; name: string }) {
    const lastAt = text.lastIndexOf('@')
    if (lastAt >= 0) {
      const before = text.slice(0, lastAt)
      setText(`${before}@${member.name} `)
      setMentionIds((prev) => [...prev, member.id])
    }
    setMentionQuery(null)
    setMentionResults([])
    inputRef.current?.focus()
  }

  // ─── Send message ─────────────────────────────────────────────────────

  async function handleSend() {
    const content = text.trim()
    if (!content || !id) return
    setSending(true)
    try {
      // Inline reply sends as a top-level message with context reference
      // (only "Reply in Thread" creates actual thread replies via the thread screen)
      const newMsg = await sendMessage(id, content, {
        photos: photos.length > 0 ? photos : undefined,
        mentions: mentionIds.length > 0 ? mentionIds : undefined,
      })

      // Attach reply-to info for display (not stored in DB, just local display)
      if (replyTo) {
        newMsg.reply_to_content = replyTo.content
        newMsg.reply_to_author = replyTo.author_name ?? 'someone'
      }

      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev
        return [...prev, newMsg]
      })

      // Notify mentioned users
      if (mentionIds.length > 0 && channel) {
        notifyMentions(id, channel.name, content, mentionIds).catch(() => {})
      }

      setText('')
      setPhotos([])
      setReplyTo(null)
      setMentionIds([])
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  // ─── Photo picker ─────────────────────────────────────────────────────

  async function pickPhoto() {
    // Safety check before first photo upload
    const safe = await checkPhotoSafety()
    if (!safe) return

    try {
      const result = await ImagePicker.launchImageLibraryAsync({})
      if (!result.canceled && result.assets?.[0]) {
        setPhotos((prev) => [...prev, result.assets[0].uri].slice(0, 4))
        return
      }
      if (result.canceled) return
    } catch {
      // Fallback to DocumentPicker on iOS PHPicker failure
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['image/*'],
          multiple: true,
          copyToCacheDirectory: true,
        })
        if (!result.canceled && result.assets?.length > 0) {
          setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 4))
        }
      } catch {
        Alert.alert('Error', 'Could not load photo.')
      }
    }
  }

  // ─── Reactions ────────────────────────────────────────────────────────

  async function handleReaction(postId: string) {
    const reacted = await toggleReaction(postId)
    setMessages((prev) =>
      prev.map((m) =>
        m.id === postId
          ? {
              ...m,
              reaction_count: m.reaction_count + (reacted ? 1 : -1),
              user_reacted: reacted,
            }
          : m
      )
    )
  }

  // ─── Join/Leave ───────────────────────────────────────────────────────

  async function handleTransferOwnership() {
    if (!id) return
    const members = await getChannelMembers(id)
    const others = members.filter((m) => m.user_id !== currentUserId)
    if (others.length === 0) {
      Alert.alert('No Members', 'There are no other members to transfer ownership to. You can delete the channel instead.')
      return
    }
    const buttons = others.slice(0, 8).map((m) => ({
      text: m.name ?? 'Member',
      onPress: () => {
        Alert.alert(
          'Confirm Transfer',
          `Transfer ownership of #${channel?.name} to ${m.name ?? 'this member'}? This cannot be undone.`,
          [
            { text: 'Cancel', style: 'cancel' as const },
            {
              text: 'Transfer',
              onPress: async () => {
                try {
                  await transferChannelOwnership(id, m.user_id)
                  setIsOwner(false)
                  Alert.alert('Done', `Ownership transferred to ${m.name ?? 'the new host'}.`)
                  load()
                } catch (e: any) {
                  Alert.alert('Error', e.message)
                }
              },
            },
          ]
        )
      },
    }))
    buttons.push({ text: 'Cancel', onPress: () => {} })
    Alert.alert('Transfer Ownership', 'Select the new channel host:', buttons as any)
  }

  function handleJoinLeave() {
    if (!id) return

    if (isMember && isOwner) {
      // Creator cannot leave — offer delete or transfer
      Alert.alert(
        'You are the host',
        'As the channel creator, you cannot leave. You can transfer ownership to another member or delete the channel.',
        [
          { text: 'Transfer Ownership', onPress: handleTransferOwnership },
          {
            text: 'Delete Channel',
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                'Delete Channel',
                'This will permanently delete this channel and all its messages. This cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete Forever',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await supabase.from('channels').delete().eq('id', id)
                        router.replace('/connections' as any)
                      } catch (e: any) {
                        Alert.alert('Error', e.message)
                      }
                    },
                  },
                ]
              )
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      )
      return
    }

    if (isMember) {
      // Non-owner: confirm leave via custom modal
      setShowLeave(true)
    } else if (channel?.channelType === 'private') {
      // Private channel: request to join
      if (myRequest?.status === 'pending') {
        Alert.alert('Request Pending', 'Your request to join is awaiting approval from the channel host.')
        return
      }
      Alert.alert(
        'Request to Join',
        `This is a private channel. Send a request to the host to join #${channel.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Send Request',
            onPress: async () => {
              try {
                await requestToJoinChannel(id)
                const req = await getMyRequestStatus(id)
                setMyRequest(req)
                Alert.alert('Request Sent', 'The channel host will review your request.')
              } catch (e: any) {
                Alert.alert('Error', e.message)
              }
            },
          },
        ]
      )
    } else {
      // Public channel: confirm join
      Alert.alert(
        'Join Channel',
        `Join #${channel?.name ?? 'this channel'}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Join',
            onPress: async () => {
              try {
                await joinChannel(id)
                setIsMember(true)
                load()
              } catch {
                Alert.alert('Error', 'Failed to join channel')
              }
            },
          },
        ]
      )
    }
  }

  async function handleFavoriteToggle() {
    if (!id) return
    if (isFavorited) {
      setIsFavorited(false)
      await unfavoriteChannel(id).catch(() => setIsFavorited(true))
    } else {
      setIsFavorited(true)
      await favoriteChannel(id).catch(() => setIsFavorited(false))
    }
  }

  function handleShareChannel() {
    if (!id || !channel) return

    // Private channels: only members can share
    if (channel.channelType === 'private' && !isMember) {
      Alert.alert('Private Channel', 'Only members can share this channel.')
      return
    }

    setShowShare(true)
  }

  async function handleCopyLink() {
    if (!id) return
    const channelUrl = `grandma-app://channel/${id}`
    const { setStringAsync } = await import('expo-clipboard')
    await setStringAsync(channelUrl)
    setShowShare(false)
    Alert.alert('Copied!', 'Channel link copied to clipboard.')
  }

  async function confirmLeave() {
    if (!id) return
    setLeaving(true)
    try {
      await leaveChannel(id)
      setIsMember(false)
      setShowLeave(false)
      load()
    } catch {
      Alert.alert('Error', 'Failed to leave channel')
    } finally {
      setLeaving(false)
    }
  }

  async function handleShareExternal() {
    if (!id || !channel) return
    const channelUrl = `grandma-app://channel/${id}`
    const desc = channel.description ? `\n${channel.description}` : ''
    const privacy = channel.channelType === 'private' ? ' (Private)' : ''
    const shareMessage = `Join #${channel.name}${privacy} on grandma.app!${desc}\n\n${channelUrl}`
    setShowShare(false)
    await Share.share({ message: shareMessage, title: `#${channel.name}` })
  }

  function handleDeleteMessage(msgId: string, authorId: string) {
    if (authorId !== currentUserId) return
    Alert.alert('Delete Message', 'Remove this message?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setMessages((prev) => prev.filter((m) => m.id !== msgId))
          await deleteMessage(msgId).catch(() => load())
        },
      },
    ])
  }

  async function handleSubmitRating() {
    if (!id || myRating === 0) return
    setSavingRating(true)
    try {
      await rateChannel(id, myRating, myReview || undefined)
      setShowRating(false)
      Alert.alert('Thanks!', 'Your rating has been submitted.')
      load() // Refresh to get updated avg
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSavingRating(false)
    }
  }

  // ─── Pinned messages ──────────────────────────────────────────────────

  const pinnedMessage = useMemo(
    () => messages.find((m) => m.is_pinned),
    [messages]
  )

  // ─── Loading state ────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <BrandedLoader />
      </View>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 8, borderBottomColor: colors.border },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBtn}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Pressable
          onPress={() => router.push(`/channel/info/${id}` as any)}
          style={styles.headerCenter}
        >
          {channel?.channelType === 'private' ? (
            <Lock size={16} color={colors.textMuted} strokeWidth={2} />
          ) : channel ? (
            (() => {
              const s = channelSticker(channel.id, isDark, channel.avatarUrl)
              const Icon = s.Component
              return (
                <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={22} fill={s.fill} />
                </View>
              )
            })()
          ) : null}
          <Text
            style={[styles.headerTitle, { color: colors.text }]}
            numberOfLines={1}
          >
            {channel?.name ?? 'Channel'}
          </Text>
          <Text style={[styles.memberCount, { color: colors.textMuted }]}>
            {channel?.memberCount ?? 0}
          </Text>
          <Users size={12} color={colors.textMuted} strokeWidth={2} />
        </Pressable>
        <View style={styles.headerActions}>
        {/* Share — public: always, private: members only */}
        {(channel?.channelType !== 'private' || isMember) && (
          <Pressable onPress={handleShareChannel} hitSlop={8} style={styles.headerIconBtn}>
            <Share2 size={18} color={colors.textMuted} strokeWidth={2} />
          </Pressable>
        )}
        <Pressable onPress={handleFavoriteToggle} hitSlop={8} style={styles.headerIconBtn}>
          <Star
            size={18}
            color={isFavorited ? brand.accent : colors.textMuted}
            strokeWidth={2}
            fill={isFavorited ? brand.accent : 'none'}
          />
        </Pressable>
        <Pressable
          onPress={handleJoinLeave}
          style={[
            styles.joinLeaveBtn,
            {
              backgroundColor: isMember ? 'transparent' : CREAM,
              borderWidth: isMember ? 1 : 0,
              borderColor: isMember ? CREAM + '55' : 'transparent',
              borderRadius: radius.full,
            },
          ]}
        >
          <Text
            style={[
              styles.joinLeaveText,
              { color: isMember ? CREAM : INK },
            ]}
          >
            {isMember && isOwner
              ? 'Host'
              : isMember
              ? 'Leave'
              : channel?.channelType === 'private' && myRequest?.status === 'pending'
              ? 'Requested'
              : channel?.channelType === 'private'
              ? 'Request'
              : 'Join'}
          </Text>
        </Pressable>
        </View>
      </View>

      {/* Channel info bar with rating */}
      {channel && isMember && (
        <Pressable
          onPress={() => setShowRating(true)}
          style={[styles.rateBar, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}
        >
          <View style={styles.rateBarLeft}>
            {channel.avgRating > 0 ? (
              <>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    size={14}
                    color={brand.accent}
                    strokeWidth={2}
                    fill={i <= Math.round(channel.avgRating) ? brand.accent : 'none'}
                  />
                ))}
                <Text style={[styles.rateBarScore, { color: brand.accent }]}>{channel.avgRating.toFixed(1)}</Text>
                <Text style={[styles.rateBarCount, { color: colors.textMuted }]}>({channel.ratingCount})</Text>
              </>
            ) : (
              <Text style={[styles.rateBarPrompt, { color: colors.textMuted }]}>No ratings yet</Text>
            )}
          </View>
          <Text style={[styles.rateBarAction, { color: CREAM }]}>
            {myRating > 0 ? 'Edit Rating' : 'Rate Channel'}
          </Text>
        </Pressable>
      )}

      {/* Pinned message banner */}
      {pinnedMessage && (
        <Pressable
          style={[
            styles.pinnedBanner,
            { backgroundColor: colors.primaryTint, borderBottomColor: colors.border },
          ]}
        >
          <Pin size={14} color={colors.primary} strokeWidth={2} />
          <Text
            style={[styles.pinnedBannerText, { color: colors.text }]}
            numberOfLines={1}
          >
            <Text style={{ fontWeight: '700' }}>
              {pinnedMessage.author_name ?? 'Someone'}
            </Text>
            {': '}
            {pinnedMessage.content}
          </Text>
        </Pressable>
      )}

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={[
            styles.messagesList,
            { paddingBottom: 8 },
          ]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: false })
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MessageCircle size={40} color={colors.textMuted} strokeWidth={1.5} />
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                No messages yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                Start the conversation!
              </Text>
            </View>
          }
          renderItem={({ item }) =>
            item.message_type === 'system_join' || item.message_type === 'system_leave' ? (
              <SystemMessage message={item} />
            ) : (
              <MessageBubble
                message={item}
                onReaction={() => handleReaction(item.id)}
                onLongPress={() => {
                  Alert.alert('Message', '', [
                    { text: 'Reply in Thread', onPress: () => router.push(`/channel/thread/${item.id}` as any) },
                    { text: 'Reply', onPress: () => { setReplyTo(item); inputRef.current?.focus() } },
                    ...(item.author_id === currentUserId ? [
                      { text: 'Delete', style: 'destructive' as const, onPress: () => handleDeleteMessage(item.id, item.author_id) },
                    ] : []),
                    { text: 'Cancel', style: 'cancel' as const },
                  ])
                }}
                onThreadPress={() => router.push(`/channel/thread/${item.id}` as any)}
              />
            )
          }
        />

        {/* Mention autocomplete overlay */}
        {mentionResults.length > 0 && (
          <View
            style={[
              styles.mentionOverlay,
              {
                backgroundColor: colors.surfaceRaised,
                borderColor: colors.border,
                borderRadius: radius.md,
              },
            ]}
          >
            {mentionResults.map((member) => (
              <Pressable
                key={member.id}
                onPress={() => insertMention(member)}
                style={({ pressed }) => [
                  styles.mentionItem,
                  { borderBottomColor: colors.borderLight },
                  pressed && { backgroundColor: colors.surface },
                ]}
              >
                <AtSign size={14} color={colors.primary} strokeWidth={2} />
                <Text style={[styles.mentionName, { color: colors.text }]}>
                  {member.name}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Photo previews */}
        {photos.length > 0 && (
          <View
            style={[
              styles.photoPreviewRow,
              { backgroundColor: colors.surface, borderTopColor: colors.borderLight },
            ]}
          >
            {photos.map((uri, i) => (
              <View key={i} style={styles.photoPreviewWrap}>
                <Image
                  source={{ uri }}
                  style={[styles.photoPreview, { borderRadius: radius.sm }]}
                />
                <Pressable
                  onPress={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                  style={styles.photoRemoveBtn}
                >
                  <X size={10} color="#FFF" />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Reply-to bar */}
        {replyTo && (
          <View
            style={[
              styles.replyBar,
              { backgroundColor: colors.surface, borderTopColor: colors.borderLight },
            ]}
          >
            <Reply size={14} color={colors.primary} strokeWidth={2} />
            <Text
              style={[styles.replyBarText, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              Replying to{' '}
              <Text style={{ color: colors.text, fontWeight: '700' }}>
                {replyTo.author_name ?? 'someone'}
              </Text>
            </Text>
            <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
              <X size={16} color={colors.textMuted} />
            </Pressable>
          </View>
        )}

        {/* Input bar */}
        {isMember ? (
          <View
            style={[
              styles.inputBar,
              {
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
                paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
              },
            ]}
          >
            <Pressable onPress={pickPhoto} hitSlop={4} style={styles.inputIconBtn}>
              <Camera size={22} color={colors.textSecondary} strokeWidth={2} />
            </Pressable>
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={handleTextChange}
              placeholder="Message..."
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={2000}
              style={[
                styles.textInput,
                {
                  color: colors.text,
                  backgroundColor: colors.surfaceRaised,
                  borderRadius: radius.lg,
                  borderColor: colors.borderLight,
                },
              ]}
            />
            <Pressable
              onPress={handleSend}
              disabled={(!text.trim() && photos.length === 0) || sending}
              hitSlop={4}
              style={({ pressed }) => [
                styles.sendBtn,
                {
                  backgroundColor:
                    text.trim() || photos.length > 0 ? CREAM : colors.surfaceRaised,
                  borderRadius: radius.full,
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              {sending ? (
                <ActivityIndicator color={INK} size="small" />
              ) : (
                <Send
                  size={18}
                  color={text.trim() || photos.length > 0 ? INK : colors.textMuted}
                  strokeWidth={2}
                />
              )}
            </Pressable>
          </View>
        ) : (
          <View
            style={[
              styles.joinPrompt,
              {
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
                paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
              },
            ]}
          >
            <Text style={[styles.joinPromptText, { color: colors.textSecondary }]}>
              Join this channel to send messages
            </Text>
            <Pressable
              onPress={handleJoinLeave}
              style={[styles.joinPromptBtn, { backgroundColor: CREAM, borderRadius: radius.full }]}
            >
              <Text style={[styles.joinPromptBtnText, { color: INK }]}>Join Channel</Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Rating overlay */}
      {showRating && (
        <View style={styles.ratingOverlay}>
          <View style={[styles.ratingCard, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            {/* Sticker accent — channel's own sticker */}
            {channel && (() => {
              const s = channelSticker(channel.id, isDark, channel.avatarUrl)
              const Icon = s.Component
              return (
                <View style={[styles.ratingStickerBubble, { backgroundColor: s.tint }]}>
                  <Icon size={34} fill={s.fill} />
                </View>
              )
            })()}

            <Text style={[styles.ratingTitle, { color: colors.text }]}>
              How was #{channel?.name}?
            </Text>
            <Text style={[styles.ratingSubtitle, { color: colors.textMuted }]}>
              Help others discover great channels
            </Text>

            {/* Star selector */}
            <AnimatedStarRow value={myRating} onChange={setMyRating} />

            {/* Review text */}
            <TextInput
              value={myReview}
              onChangeText={setMyReview}
              placeholder="Write a review (optional)..."
              placeholderTextColor={colors.textMuted}
              multiline
              style={[styles.ratingInput, { color: colors.text, backgroundColor: colors.surfaceRaised, borderRadius: radius.lg }]}
            />

            {/* Buttons */}
            <View style={styles.ratingButtons}>
              <Pressable
                onPress={() => setShowRating(false)}
                style={[styles.ratingCancelBtn, { borderColor: colors.border, borderRadius: radius.lg }]}
              >
                <Text style={[styles.ratingCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmitRating}
                disabled={myRating === 0 || savingRating}
                style={[styles.ratingSubmitBtn, { backgroundColor: CREAM, borderRadius: radius.full, opacity: myRating === 0 ? 0.4 : 1 }]}
              >
                {savingRating ? (
                  <ActivityIndicator color={INK} size="small" />
                ) : (
                  <Text style={[styles.ratingSubmitText, { color: INK }]}>Submit</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Share sheet */}
      <ShareChannelSheet
        visible={showShare}
        onClose={() => setShowShare(false)}
        onCopy={handleCopyLink}
        onShare={handleShareExternal}
      />

      {/* Leave confirm sheet */}
      <LeaveChannelSheet
        visible={showLeave}
        channelName={channel?.name ?? 'this channel'}
        leaving={leaving}
        onCancel={() => setShowLeave(false)}
        onConfirm={confirmLeave}
      />
    </View>
  )
}

// ─── Animated star selector ──────────────────────────────────────────────

function AnimatedStarRow({
  value,
  onChange,
}: {
  value: number
  onChange: (n: number) => void
}) {
  const anims = useRef([1, 2, 3, 4, 5].map(() => new Animated.Value(1))).current

  function tap(i: number) {
    onChange(i)
    Animated.sequence([
      Animated.spring(anims[i - 1], { toValue: 1.35, friction: 4, tension: 220, useNativeDriver: true }),
      Animated.spring(anims[i - 1], { toValue: 1, friction: 3, tension: 160, useNativeDriver: true }),
    ]).start()
  }

  return (
    <View style={styles.ratingStars}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable key={i} onPress={() => tap(i)} hitSlop={8}>
          <Animated.View style={{ transform: [{ scale: anims[i - 1] }] }}>
            <Star
              size={40}
              color={brand.accent}
              strokeWidth={2}
              fill={i <= value ? brand.accent : 'none'}
            />
          </Animated.View>
        </Pressable>
      ))}
    </View>
  )
}

// ─── Share channel bottom sheet ───────────────────────────────────────────

function ShareChannelSheet({
  visible,
  onClose,
  onCopy,
  onShare,
}: {
  visible: boolean
  onClose: () => void
  onCopy: () => void
  onShare: () => void
}) {
  const { colors, radius } = useTheme()

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.shareOverlay} onPress={onClose}>
        <Pressable
          style={[styles.shareSheet, { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.shareHandle, { backgroundColor: colors.textMuted + '55' }]} />
          <Text style={[styles.shareTitle, { color: colors.text }]}>Share Channel</Text>

          <Pressable
            onPress={onCopy}
            style={({ pressed }) => [
              styles.shareAction,
              { borderColor: CREAM + '55', borderRadius: radius.full },
              pressed && { opacity: 0.75 },
            ]}
          >
            <Copy size={18} color={CREAM} strokeWidth={2} />
            <Text style={[styles.shareActionText, { color: CREAM }]}>Copy Link</Text>
          </Pressable>

          <Pressable
            onPress={onShare}
            style={({ pressed }) => [
              styles.shareActionFilled,
              { backgroundColor: CREAM, borderRadius: radius.full },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Share2 size={18} color={INK} strokeWidth={2.5} />
            <Text style={[styles.shareActionTextFilled, { color: INK }]}>Share…</Text>
          </Pressable>

          <Pressable onPress={onClose} style={styles.shareCancel}>
            <Text style={[styles.shareCancelText, { color: colors.textMuted }]}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// ─── Leave channel confirm sheet ──────────────────────────────────────────

function LeaveChannelSheet({
  visible,
  channelName,
  leaving,
  onCancel,
  onConfirm,
}: {
  visible: boolean
  channelName: string
  leaving: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const { colors, radius } = useTheme()

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.shareOverlay} onPress={onCancel}>
        <Pressable
          style={[styles.shareSheet, { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.shareHandle, { backgroundColor: colors.textMuted + '55' }]} />
          <Text style={[styles.shareTitle, { color: colors.text }]}>Leave channel?</Text>
          <Text style={[styles.leaveBody, { color: colors.textSecondary }]}>
            You'll stop receiving updates from{' '}
            <Text style={{ fontWeight: '800', color: colors.text }}>#{channelName}</Text>
            . You can rejoin any time.
          </Text>

          <Pressable
            onPress={onConfirm}
            disabled={leaving}
            style={({ pressed }) => [
              styles.leaveConfirmBtn,
              { backgroundColor: brand.error, borderRadius: radius.full },
              pressed && { opacity: 0.85 },
              leaving && { opacity: 0.6 },
            ]}
          >
            {leaving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.leaveConfirmText}>Leave Channel</Text>
            )}
          </Pressable>

          <Pressable onPress={onCancel} style={styles.shareCancel}>
            <Text style={[styles.shareCancelText, { color: colors.textMuted }]}>Stay</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// ─── Message Bubble ─────────────────────────────────────────────────────

// ─── System Message (join/leave) ──────────────────────────────────────────

function SystemMessage({ message }: { message: ChannelPost }) {
  const { colors } = useTheme()
  const isJoin = message.message_type === 'system_join'

  return (
    <View style={styles.systemMsg}>
      <View style={[styles.systemMsgDot, { backgroundColor: isJoin ? brand.success + '30' : brand.error + '30' }]}>
        {isJoin ? (
          <LogIn size={12} color={brand.success} strokeWidth={2} />
        ) : (
          <LogOut size={12} color={brand.error} strokeWidth={2} />
        )}
      </View>
      <Text style={[styles.systemMsgText, { color: colors.textMuted }]}>
        {message.content}
      </Text>
      <Text style={[styles.systemMsgTime, { color: colors.textMuted }]}>
        {formatTime(message.created_at)}
      </Text>
    </View>
  )
}

// ─── Message Bubble ──────────────────────────────────────────────────────

function MessageBubble({
  message,
  onReaction,
  onLongPress,
  onThreadPress,
}: {
  message: ChannelPost
  onReaction: () => void
  onLongPress: () => void
  onThreadPress: () => void
}) {
  const { colors, radius } = useTheme()

  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={400}
      style={({ pressed }) => [
        styles.bubble,
        pressed && { backgroundColor: colors.surfaceRaised },
      ]}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: colors.surfaceRaised }]}>
        <User size={18} color={colors.textMuted} strokeWidth={1.5} />
      </View>

      <View style={styles.bubbleContent}>
        {/* Inline reply reference */}
        {message.reply_to_content && (
          <View style={[styles.inlineReplyRef, { backgroundColor: colors.surfaceRaised, borderLeftColor: colors.primary }]}>
            <Text style={[styles.inlineReplyAuthor, { color: colors.primary }]}>
              {message.reply_to_author ?? 'someone'}
            </Text>
            <Text style={[styles.inlineReplyText, { color: colors.textSecondary }]} numberOfLines={1}>
              {message.reply_to_content}
            </Text>
          </View>
        )}

        {/* Author + timestamp row */}
        <View style={styles.bubbleHeader}>
          <Text style={[styles.authorName, { color: colors.text }]}>
            {message.author_name ?? 'Community Member'}
          </Text>
          <Text style={[styles.timestamp, { color: colors.textMuted }]}>
            {formatTime(message.created_at)}
          </Text>
        </View>

        {/* Pinned indicator */}
        {message.is_pinned && (
          <View style={[styles.pinnedTag, { backgroundColor: brand.accent + '15' }]}>
            <Pin size={10} color={brand.accent} strokeWidth={2} />
            <Text style={[styles.pinnedTagText, { color: brand.accent }]}>Pinned</Text>
          </View>
        )}

        {/* Message content — handles shared posts, @mentions, plain text + photos */}
        <MessageContent content={message.content} photos={message.photos} />

        {/* Bottom row: reactions + replies */}
        <View style={styles.bubbleFooter}>
          {/* Reaction */}
          <Pressable onPress={onReaction} hitSlop={6} style={styles.reactionBtn}>
            <Heart
              size={14}
              color={message.user_reacted ? brand.error : colors.textMuted}
              strokeWidth={2}
              fill={message.user_reacted ? brand.error : 'none'}
            />
            {message.reaction_count > 0 && (
              <Text
                style={[
                  styles.reactionCount,
                  {
                    color: message.user_reacted ? brand.error : colors.textMuted,
                  },
                ]}
              >
                {message.reaction_count}
              </Text>
            )}
          </Pressable>

          {/* Reply count — tap to open thread */}
          {message.reply_count > 0 && (
            <Pressable onPress={onThreadPress} style={styles.replyLink}>
              <MessageCircle size={14} color={colors.primary} strokeWidth={2} />
              <Text style={[styles.replyLinkText, { color: colors.primary }]}>
                {message.reply_count} {message.reply_count === 1 ? 'reply' : 'replies'} — View thread
              </Text>
            </Pressable>
          )}

          {/* Thread CTA for messages with no replies yet */}
          {(message.reply_count ?? 0) === 0 && (
            <Pressable onPress={onThreadPress} style={styles.replyLink}>
              <MessageCircle size={12} color={colors.textMuted} strokeWidth={1.5} />
              <Text style={[styles.replyLinkText, { color: colors.textMuted, fontSize: 11 }]}>
                Reply in thread
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────

// ─── Message Content with share link detection ──────────────────────────

function MessageContent({ content, photos }: { content: string; photos?: string[] }) {
  const { colors, radius } = useTheme()

  // Check for [garage:ID] share tag
  const garageMatch = content.match(/\[garage:([a-f0-9-]+)\]/)

  if (garageMatch) {
    const garageId = garageMatch[1]
    // Extract user note (before 📢) and post info
    const cleanText = content.replace(/\[garage:[a-f0-9-]+\]/, '').trim()
    const noteMatch = cleanText.match(/^(.*?)(?:\n\n)?📢/s)
    const userNote = noteMatch?.[1]?.trim()
    // Extract quoted caption
    const quoteMatch = cleanText.match(/"([^"]+)"/)
    const quotedCaption = quoteMatch?.[1]
    // Extract author
    const authorMatch = cleanText.match(/—\s*(.+)$/)
    const sharedAuthor = authorMatch?.[1]?.trim()
    const coverPhoto = photos?.[0]

    return (
      <View style={{ gap: 8 }}>
        {/* User's personal note */}
        {userNote && (
          <Text style={[styles.messageText, { color: colors.text }]}>{userNote}</Text>
        )}

        {/* Shared post card */}
        <Pressable
          onPress={() => router.push(`/garage/${garageId}` as any)}
          style={[styles.shareCard, { backgroundColor: colors.surface, borderRadius: radius.lg, borderColor: colors.border }]}
        >
          {coverPhoto && (
            <Image source={{ uri: coverPhoto }} style={[styles.shareCardImage, { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg }]} />
          )}
          <View style={styles.shareCardBody}>
            <Text style={[styles.shareCardLabel, { color: colors.primary }]}>
              Shared from Garage
            </Text>
            {quotedCaption && (
              <Text style={[styles.shareCardCaption, { color: colors.text }]} numberOfLines={2}>
                {quotedCaption}
              </Text>
            )}
            {sharedAuthor && (
              <Text style={[styles.shareCardAuthor, { color: colors.textMuted }]}>
                by {sharedAuthor}
              </Text>
            )}
            <Text style={[styles.shareCardCta, { color: colors.primary }]}>
              Tap to view →
            </Text>
          </View>
        </Pressable>
      </View>
    )
  }

  // Regular message — render with @mention highlighting + photos
  const parts = content.split(/(@\S+)/g)
  const hasMentions = parts.some((p) => p.startsWith('@'))

  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.messageText, { color: colors.text }]}>
        {hasMentions
          ? parts.map((part, i) =>
              part.startsWith('@') ? (
                <Text key={i} style={{ color: colors.primary, fontWeight: '600' }}>{part}</Text>
              ) : (
                <Text key={i}>{part}</Text>
              )
            )
          : content}
      </Text>
      {photos && photos.length > 0 && (
        <View style={styles.messagePhotos}>
          {photos.map((uri, i) => (
            <Image key={i} source={{ uri }} style={[styles.messagePhoto, { borderRadius: radius.sm }]} />
          ))}
        </View>
      )}
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

// ─── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // System messages
  systemMsg: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  systemMsgDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  systemMsgText: {
    fontSize: 12,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  systemMsgTime: {
    fontSize: 10,
    fontWeight: '400',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerBtn: { padding: 4 },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginLeft: 8,
    marginRight: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', flexShrink: 1, fontFamily: 'Fraunces_600SemiBold', letterSpacing: -0.3 },
  memberCount: { fontSize: 12, fontWeight: '600', marginLeft: 2 },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerIconBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinLeaveBtn: { paddingVertical: 6, paddingHorizontal: 14, marginLeft: 2 },
  joinLeaveText: { fontSize: 13, fontWeight: '700' },

  // Shared post card
  shareCard: { borderWidth: 1, overflow: 'hidden', marginTop: 6 },
  shareCardImage: { width: '100%', height: 160, resizeMode: 'cover' },
  shareCardBody: { padding: 12, gap: 4 },
  shareCardLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  shareCardCaption: { fontSize: 14, fontWeight: '600' },
  shareCardAuthor: { fontSize: 12, fontWeight: '500' },
  shareCardCta: { fontSize: 13, fontWeight: '700', marginTop: 4 },

  // Rate bar
  rateBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  rateBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rateBarScore: { fontSize: 13, fontWeight: '700', marginLeft: 4 },
  rateBarCount: { fontSize: 11, fontWeight: '500' },
  rateBarPrompt: { fontSize: 13, fontWeight: '500' },
  rateBarAction: { fontSize: 13, fontWeight: '700' },

  // Rating overlay
  ratingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  ratingCard: { width: 320, padding: 28, gap: 14, alignItems: 'center' },
  ratingStickerBubble: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  ratingTitle: { fontSize: 22, fontFamily: 'Fraunces_600SemiBold', letterSpacing: -0.4, textAlign: 'center' },
  ratingSubtitle: { fontSize: 13, fontWeight: '500', textAlign: 'center' },
  ratingStars: { flexDirection: 'row', gap: 10, marginTop: 4 },

  // Share sheet
  shareOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  shareSheet: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 34 },
  shareHandle: { width: 44, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  shareTitle: { fontSize: 22, fontFamily: 'Fraunces_600SemiBold', letterSpacing: -0.4, textAlign: 'center', marginBottom: 18 },
  shareAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 15, borderWidth: 1, marginBottom: 12 },
  shareActionText: { fontSize: 15, fontWeight: '700' },
  shareActionFilled: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 15 },
  shareActionTextFilled: { fontSize: 15, fontWeight: '800' },
  shareCancel: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  shareCancelText: { fontSize: 14, fontWeight: '600' },

  // Leave confirm
  leaveBody: { fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 20, marginBottom: 18, paddingHorizontal: 8 },
  leaveConfirmBtn: { paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  leaveConfirmText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  ratingInput: { width: '100%', padding: 14, fontSize: 14, fontWeight: '500', minHeight: 80, textAlignVertical: 'top' },
  ratingButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  ratingCancelBtn: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  ratingCancelText: { fontSize: 14, fontWeight: '600' },
  ratingSubmitBtn: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  ratingSubmitText: { fontSize: 14, fontWeight: '800' },

  // Pinned banner
  pinnedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  pinnedBannerText: { fontSize: 13, fontWeight: '400', flex: 1 },

  // Messages list
  messagesList: { paddingHorizontal: 12, paddingTop: 8 },

  // Empty state
  emptyContainer: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptySubtitle: { fontSize: 14, fontWeight: '400' },

  // Message bubble
  bubble: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingVertical: 6,
    gap: 10,
    borderRadius: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  bubbleContent: { flex: 1, gap: 2 },
  inlineReplyRef: { paddingHorizontal: 10, paddingVertical: 6, borderLeftWidth: 3, borderRadius: 4, marginBottom: 4 },
  inlineReplyAuthor: { fontSize: 11, fontWeight: '700' },
  inlineReplyText: { fontSize: 12, fontWeight: '400', marginTop: 1 },
  bubbleHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  authorName: { fontSize: 13, fontWeight: '700' },
  timestamp: { fontSize: 11, fontWeight: '400' },
  pinnedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 999,
    marginTop: 2,
  },
  pinnedTagText: { fontSize: 10, fontWeight: '700' },
  messageText: { fontSize: 14, fontWeight: '400', lineHeight: 20, marginTop: 2 },
  messagePhotos: { flexDirection: 'row', gap: 6, marginTop: 6 },
  messagePhoto: { width: 160, height: 120, resizeMode: 'cover' },
  bubbleFooter: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 },
  reactionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2 },
  reactionCount: { fontSize: 12, fontWeight: '600' },
  replyLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  replyLinkText: { fontSize: 12, fontWeight: '600' },

  // Mention overlay
  mentionOverlay: {
    position: 'absolute',
    bottom: '100%',
    left: 12,
    right: 12,
    marginBottom: 4,
    borderWidth: 1,
    maxHeight: 200,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  mentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  mentionName: { fontSize: 14, fontWeight: '600' },

  // Photo previews
  photoPreviewRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  photoPreviewWrap: { position: 'relative' },
  photoPreview: { width: 56, height: 56 },
  photoRemoveBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F44336',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Reply bar
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  replyBarText: { fontSize: 13, fontWeight: '500', flex: 1 },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  inputIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    maxHeight: 100,
    minHeight: 40,
    borderWidth: 1,
  },
  sendBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Join prompt
  joinPrompt: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  joinPromptText: { fontSize: 14, fontWeight: '500' },
  joinPromptBtn: { paddingVertical: 11, paddingHorizontal: 30 },
  joinPromptBtnText: { fontSize: 14, fontWeight: '800' },
})
