/**
 * Channel Chat — real-time messaging interface with threads, mentions, reactions.
 */

import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react'
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
  Bookmark,
  BadgeCheck,
  BarChart3,
  MessageCircle,
  Send,
  Camera,
  Pin,
  X,
  Reply,
  AtSign,
  Star,
  LogIn,
  LogOut,
  Lock,
  Share2,
  Link,
  Copy,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand, stickers, shadows, getModeColor, getModeColorSoft, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../../constants/theme'
import { useModeStore } from '../../store/useModeStore'
import { useIsDiffuse, DiffuseArrow } from '../../components/ui/diffuse/DiffuseKit'
import { DiffuseBloomIcon, DiffuseEmptyState } from '../../components/ui/diffuse/DiffusePrimitives'
import { EmptyState } from '../../components/ui/EmptyState'
import { ReactionPicker } from '../../components/channels/ReactionPicker'
import { PollCard } from '../../components/channels/PollCard'
import { PollComposer } from '../../components/channels/PollComposer'
import { useSavedToast } from '../../components/ui/SavedToast'
import { channelSticker, channelBlob } from '../../lib/channelSticker'
import { Character } from '../../components/characters/Characters'
import { getChannels, type Channel } from '../../lib/channels'
import {
  sendMessage,
  fetchMessages,
  toggleReaction,
  setReaction,
  type ReactionType,
  savePost,
  unsavePost,
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
import { reportContent, blockUser, REPORT_REASONS, type ReportReason } from '../../lib/communitySafety'
import { checkPhotoSafety } from '../../lib/photoSafety'
import { BrandedLoader } from '../../components/ui/BrandedLoader'
import { useTranslation } from '../../lib/i18n'

// Emoji per reaction type — for the footer indicator when a non-heart reaction
// is chosen (the picker itself owns the full set).
const REACTION_EMOJI: Record<ReactionType, string> = {
  heart: '❤️', like: '👍', celebrate: '🎉', support: '🤗',
}

// ─── Main Component ───────────────────────────────────────────────────────

export default function ChannelChat() {
  const { colors, radius, isDark, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const mode = useModeStore((s) => s.mode)
  const accent = diffuse ? getDiffuseAccent(mode, dt.isDark) : getModeColor(mode, isDark)
  const insets = useSafeAreaInsets()
  const toast = useSavedToast()
  const { id } = useLocalSearchParams<{ id: string }>()

  const flatListRef = useRef<FlatList<ChannelPost>>(null)
  const inputRef = useRef<TextInput>(null)

  const [channel, setChannel] = useState<Channel | null>(null)
  const [messages, setMessages] = useState<ChannelPost[]>([])
  const [isMember, setIsMember] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

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
    setLoadError(false)
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
      setLoadError(true)
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
  // Skip the focus-refresh on the very first focus (the initial load() already
  // fetched everything); only refresh on RE-focus, e.g. returning from a thread.
  const initialFocusDone = useRef(false)
  useFocusEffect(
    useCallback(() => {
      if (!id) return
      if (!initialFocusDone.current) {
        initialFocusDone.current = true
        return
      }
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
    }, [id])
  )

  // Auto-scroll to bottom when messages change. Capture + clear the timer so a
  // fast unmount (back-nav within 100ms) doesn't fire on a dead component.
  useEffect(() => {
    if (messages.length === 0) return
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true })
    }, 100)
    return () => clearTimeout(timer)
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
          // Note: do NOT optimistically increment reply_count here. The DB
          // trigger fires an authoritative UPDATE on the parent immediately
          // after a reply INSERT, handled below. Realtime events are not
          // order-guaranteed, so incrementing here could double-count.
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
      setMentionIds((prev) => [...new Set([...prev, member.id])])
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
        newMsg.reply_to_author = replyTo.author_name ?? t('channelScreen_someoneLower')
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
      Alert.alert(t('common_error'), e.message ?? t('channelScreen_sendFailed'))
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
        Alert.alert(t('common_error'), t('channelScreen_photoLoadFailed'))
      }
    }
  }

  // ─── Reactions ────────────────────────────────────────────────────────

  // Stable across renders (functional setState, no `messages` dep) so memoized
  // MessageBubble rows don't re-render on every reaction elsewhere in the list.
  const handleReaction = useCallback(async (postId: string) => {
    // Optimistic toggle (clamp at 0 so a double-tap race can't render -1).
    const apply = (toggle: boolean) =>
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== postId) return m
          const react = toggle ? !m.user_reacted : m.user_reacted
          const delta = toggle ? (m.user_reacted ? -1 : 1) : 0
          return { ...m, user_reacted: react, reaction_count: Math.max(0, m.reaction_count + delta) }
        })
      )

    apply(true)
    try {
      await toggleReaction(postId)
    } catch {
      apply(true) // toggle back to revert
    }
  }, [])

  // Bookmark toggle (Phase 3) — optimistic, reverts on failure.
  const handleSave = useCallback(async (postId: string) => {
    let willSave = false
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== postId) return m
        willSave = !m.saved
        return { ...m, saved: !m.saved }
      })
    )
    try {
      if (willSave) await savePost(postId)
      else await unsavePost(postId)
    } catch {
      // revert
      setMessages((prev) => prev.map((m) => (m.id === postId ? { ...m, saved: !m.saved } : m)))
    }
  }, [])

  // Reaction picker (Phase 3) — the post whose 4-emoji picker is open.
  const [reactionPickerPost, setReactionPickerPost] = useState<ChannelPost | null>(null)
  const [showPollComposer, setShowPollComposer] = useState(false)

  // The reply / thread / delete / report / block action sheet (was the old
  // long-press target; now reached via the picker's "More" entry).
  const showMessageActions = useCallback((item: ChannelPost) => {
    Alert.alert(t('channelScreen_messageActionsTitle'), '', [
      { text: t('channelScreen_replyInThread'), onPress: () => router.push(`/channel/thread/${item.id}` as any) },
      { text: t('channelScreen_replyingTo'), onPress: () => { setReplyTo(item); inputRef.current?.focus() } },
      ...(item.author_id === currentUserId ? [
        { text: t('common_delete'), style: 'destructive' as const, onPress: () => handleDeleteMessage(item.id, item.author_id) },
      ] : [
        { text: t('safety_report'), onPress: () => handleReportMessage(item.id, item.author_id) },
        { text: t('safety_block'), style: 'destructive' as const, onPress: () => handleBlockUser(item.author_id, item.author_name) },
      ]),
      { text: t('common_cancel'), style: 'cancel' as const },
    ])
  }, [t, currentUserId])

  const handleSetReaction = useCallback(async (postId: string, type: ReactionType) => {
    // Optimistic — compute prev/next inside the updater to avoid a stale closure.
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== postId) return m
        const prevType = m.my_reaction ?? null
        const nextType = prevType === type ? null : type
        const delta = (prevType === null ? 0 : -1) + (nextType === null ? 0 : 1)
        return { ...m, my_reaction: nextType, user_reacted: nextType !== null, reaction_count: Math.max(0, m.reaction_count + delta) }
      })
    )
    setReactionPickerPost(null)
    try {
      await setReaction(postId, type)
    } catch {
      load() // resync on failure
    }
  }, [load])

  // ─── Join/Leave ───────────────────────────────────────────────────────

  async function handleTransferOwnership() {
    if (!id) return
    const members = await getChannelMembers(id)
    const others = members.filter((m) => m.user_id !== currentUserId)
    if (others.length === 0) {
      Alert.alert(t('channelScreen_noMembersTitle'), t('channelScreen_noMembersBodyDelete'))
      return
    }
    const buttons = others.slice(0, 8).map((m) => ({
      text: m.name ?? t('channelScreen_memberFallback'),
      onPress: () => {
        Alert.alert(
          t('channelScreen_confirmTransferTitle'),
          t('channelScreen_confirmTransferBody', { channel: channel?.name ?? '', member: m.name ?? t('channelScreen_thisMember') }),
          [
            { text: t('common_cancel'), style: 'cancel' as const },
            {
              text: t('channelScreen_transferBtn'),
              onPress: async () => {
                try {
                  await transferChannelOwnership(id, m.user_id)
                  setIsOwner(false)
                  toast.show({ title: t('channelScreen_doneTitle'), message: t('channelScreen_transferredMsg', { member: m.name ?? t('channelScreen_theNewHost') }) })
                  load()
                } catch (e: any) {
                  Alert.alert(t('common_error'), e.message)
                }
              },
            },
          ]
        )
      },
    }))
    buttons.push({ text: t('common_cancel'), onPress: () => {} })
    Alert.alert(t('channelScreen_transferOwnershipTitle'), t('channelScreen_transferOwnershipBody'), buttons as any)
  }

  function handleJoinLeave() {
    if (!id) return

    if (isMember && isOwner) {
      // Creator cannot leave — offer delete or transfer
      Alert.alert(
        t('channelScreen_hostAlertTitle'),
        t('channelScreen_hostAlertBody'),
        [
          { text: t('channelScreen_transferOwnershipTitle'), onPress: handleTransferOwnership },
          {
            text: t('channelScreen_deleteChannelBtn'),
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                t('channelScreen_deleteChannelBtn'),
                t('channelScreen_deleteChannelBody'),
                [
                  { text: t('common_cancel'), style: 'cancel' },
                  {
                    text: t('channelScreen_deleteForever'),
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await supabase.from('channels').delete().eq('id', id)
                        router.replace('/community?tab=channels' as any)
                      } catch (e: any) {
                        Alert.alert(t('common_error'), e.message)
                      }
                    },
                  },
                ]
              )
            },
          },
          { text: t('common_cancel'), style: 'cancel' },
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
        Alert.alert(t('channelScreen_requestPendingTitle'), t('channelScreen_requestPendingBody'))
        return
      }
      Alert.alert(
        t('channelScreen_requestToJoinTitle'),
        t('channelScreen_requestToJoinBody', { channel: channel.name }),
        [
          { text: t('common_cancel'), style: 'cancel' },
          {
            text: t('channelScreen_sendRequestBtn'),
            onPress: async () => {
              try {
                await requestToJoinChannel(id)
                const req = await getMyRequestStatus(id)
                setMyRequest(req)
                Alert.alert(t('channelScreen_requestSentTitle'), t('channelScreen_requestSentBody'))
              } catch (e: any) {
                Alert.alert(t('common_error'), e.message)
              }
            },
          },
        ]
      )
    } else {
      // Public channel: confirm join
      Alert.alert(
        t('channelScreen_joinChannelTitle'),
        t('channelScreen_joinChannelBody', { channel: channel?.name ?? t('channelScreen_thisChannel') }),
        [
          { text: t('common_cancel'), style: 'cancel' },
          {
            text: t('channelScreen_join'),
            onPress: async () => {
              try {
                await joinChannel(id)
                setIsMember(true)
                load()
              } catch {
                Alert.alert(t('common_error'), t('channelScreen_joinFailed'))
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
      Alert.alert(t('channelScreen_privateChannelTitle'), t('channelScreen_privateChannelShareBody'))
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
    toast.show({ title: t('channelScreen_copiedTitle'), message: t('channelScreen_linkCopiedMsg') })
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
      Alert.alert(t('common_error'), t('channelScreen_leaveFailed'))
    } finally {
      setLeaving(false)
    }
  }

  async function handleShareExternal() {
    if (!id || !channel) return
    const channelUrl = `grandma-app://channel/${id}`
    const desc = channel.description ? `\n${channel.description}` : ''
    const privacy = channel.channelType === 'private' ? ` ${t('channelScreen_privateSuffix')}` : ''
    const shareMessage = `${t('channelScreen_shareMessage', { channel: channel.name, privacy })}${desc}\n\n${channelUrl}`
    setShowShare(false)
    await Share.share({ message: shareMessage, title: `#${channel.name}` })
  }

  function handleDeleteMessage(msgId: string, authorId: string) {
    if (authorId !== currentUserId) return
    Alert.alert(t('channelScreen_deleteMessageTitle'), t('channelScreen_removeMessageBody'), [
      { text: t('common_cancel'), style: 'cancel' },
      {
        text: t('common_delete'), style: 'destructive',
        onPress: async () => {
          setMessages((prev) => prev.filter((m) => m.id !== msgId))
          await deleteMessage(msgId, authorId).catch(() => load())
        },
      },
    ])
  }

  // ─── Community safety: report + block (WS3) ────────────────────────────────
  function handleReportMessage(msgId: string, authorId: string) {
    Alert.alert(
      t('safety_reportTitle'),
      t('safety_reportBody'),
      [
        ...REPORT_REASONS.map((reason: ReportReason) => ({
          text: t(`safety_reason_${reason}` as any),
          onPress: async () => {
            try {
              await reportContent({ contentType: 'channel_post', contentId: msgId, authorId, reason })
              toast.show({ title: t('safety_reportedTitle'), message: t('safety_reportedBody') })
            } catch (e: any) {
              Alert.alert(t('common_error'), e.message ?? '')
            }
          },
        })),
        { text: t('common_cancel'), style: 'cancel' as const },
      ]
    )
  }

  function handleBlockUser(authorId: string, authorName?: string) {
    Alert.alert(
      t('safety_blockTitle'),
      t('safety_blockBody', { name: authorName ?? t('channelScreen_someoneLower') }),
      [
        { text: t('common_cancel'), style: 'cancel' },
        {
          text: t('safety_blockConfirm'), style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(authorId)
              toast.show({ title: t('safety_blockedTitle'), message: t('safety_blockedBody') })
              load() // RLS now hides their messages — refetch
            } catch (e: any) {
              Alert.alert(t('common_error'), e.message ?? '')
            }
          },
        },
      ]
    )
  }

  async function handleSubmitRating() {
    if (!id || myRating === 0) return
    setSavingRating(true)
    try {
      await rateChannel(id, myRating, myReview || undefined)
      setShowRating(false)
      toast.show({ title: t('channelScreen_thanksTitle'), message: t('channelScreen_ratingSubmittedMsg') })
      load() // Refresh to get updated avg
    } catch (e: any) {
      Alert.alert(t('common_error'), e.message)
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
      <View style={[styles.center, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
        <BrandedLoader />
      </View>
    )
  }

  // ─── Error state ──────────────────────────────────────────────────────
  // A failed load used to leave a permanently blank screen. Offer a retry.

  if (loadError) {
    return (
      <View style={[styles.center, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
        {diffuse ? (
          <DiffuseEmptyState
            icon={
              <DiffuseBloomIcon color={dt.colors.error} size={44} intensity={0.5}>
                <Star size={22} color={dt.colors.ink3} strokeWidth={1.6} />
              </DiffuseBloomIcon>
            }
            title={t('channelScreen_errorTitle')}
            message={t('channelScreen_errorSubtitle')}
            ctaLabel={t('channelScreen_tryAgain')}
            onCta={load}
          />
        ) : (
          <EmptyState
            icon={<Star size={36} color={stickers.coral} strokeWidth={1.5} />}
            iconBg={stickers.coralInk + '22'}
            title={t('channelScreen_errorTitle')}
            message={t('channelScreen_errorSubtitle')}
            ctaLabel={t('channelScreen_tryAgain')}
            onCtaPress={load}
          />
        )}
      </View>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 8, borderBottomColor: diffuse ? dt.colors.line : colors.border },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBtn}>
          <ArrowLeft size={24} color={diffuse ? dt.colors.ink : colors.text} strokeWidth={diffuse ? 1.6 : 2} />
        </Pressable>
        <Pressable
          onPress={() => router.push(`/channel/info/${id}` as any)}
          style={styles.headerCenter}
        >
          {channel?.channelType === 'private' ? (
            <Lock size={16} color={diffuse ? dt.colors.ink3 : colors.textMuted} strokeWidth={2} />
          ) : channel ? (
            (() => {
              const blob = channelBlob(channel.name, channel.category)
              return (
                <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
                  <Character name={blob} size={22} bg={diffuse ? dt.colors.bg : colors.bg} />
                </View>
              )
            })()
          ) : null}
          <Text
            style={[styles.headerTitle, diffuse
              ? { color: dt.colors.ink, fontFamily: diffuseFont.display }
              : { color: colors.text, fontFamily: font.display }]}
            numberOfLines={1}
          >
            {channel?.name ?? t('channelScreen_nameFallback')}
          </Text>
          <Text style={[styles.memberCount, diffuse
            ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono }
            : { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
            {channel?.memberCount ?? 0}
          </Text>
          <Users size={12} color={diffuse ? dt.colors.ink3 : colors.textMuted} strokeWidth={2} />
        </Pressable>
        <View style={styles.headerActions}>
        {/* Share — public: always, private: members only */}
        {(channel?.channelType !== 'private' || isMember) && (
          <Pressable onPress={handleShareChannel} hitSlop={8} style={styles.headerIconBtn}>
            <Share2 size={18} color={diffuse ? dt.colors.ink3 : colors.textMuted} strokeWidth={diffuse ? 1.6 : 2} />
          </Pressable>
        )}
        <Pressable onPress={handleFavoriteToggle} hitSlop={8} style={styles.headerIconBtn}>
          <Star
            size={18}
            color={isFavorited ? (diffuse ? dt.colors.ink : stickers.yellow) : (diffuse ? dt.colors.ink3 : colors.textMuted)}
            strokeWidth={diffuse ? 1.6 : 2}
            fill={isFavorited ? (diffuse ? dt.colors.ink : stickers.yellow) : 'none'}
          />
        </Pressable>
        <Pressable
          onPress={handleJoinLeave}
          style={[
            styles.joinLeaveBtn,
            diffuse
              ? {
                  backgroundColor: 'transparent',
                  borderWidth: 1,
                  borderColor: dt.colors.line2,
                  borderRadius: 999,
                }
              : {
                  backgroundColor: isMember ? 'transparent' : accent,
                  borderWidth: isMember ? 1 : 0,
                  borderColor: isMember ? colors.borderStrong : 'transparent',
                  borderRadius: radius.full,
                },
          ]}
        >
          <Text
            style={[
              styles.joinLeaveText,
              diffuse
                ? { color: dt.colors.ink, fontFamily: diffuseFont.monoBold, letterSpacing: 1, textTransform: 'uppercase', fontSize: 11 }
                : { color: isMember ? colors.textSecondary : colors.textInverse, fontFamily: font.bodyBold },
            ]}
          >
            {isMember && isOwner
              ? t('channelScreen_host')
              : isMember
              ? t('channelScreen_leave')
              : channel?.channelType === 'private' && myRequest?.status === 'pending'
              ? t('channelScreen_requested')
              : channel?.channelType === 'private'
              ? t('channelScreen_request')
              : t('channelScreen_join')}
          </Text>
        </Pressable>
        </View>
      </View>

      {/* Channel info bar with rating */}
      {channel && isMember && (
        <Pressable
          onPress={() => setShowRating(true)}
          style={[styles.rateBar, diffuse
            ? { backgroundColor: dt.colors.surface, borderBottomColor: dt.colors.line }
            : { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}
        >
          <View style={styles.rateBarLeft}>
            {channel.avgRating > 0 ? (
              <>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    size={14}
                    color={diffuse ? dt.colors.ink3 : stickers.yellow}
                    strokeWidth={diffuse ? 1.6 : 2}
                    fill={i <= Math.round(channel.avgRating) ? (diffuse ? dt.colors.ink3 : stickers.yellow) : 'none'}
                  />
                ))}
                <Text style={[styles.rateBarScore, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.monoBold } : { color: colors.textSecondary, fontFamily: font.bodySemiBold }]}>{channel.avgRating.toFixed(1)}</Text>
                <Text style={[styles.rateBarCount, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono } : { color: colors.textMuted }]}>({channel.ratingCount})</Text>
              </>
            ) : (
              <Text style={[styles.rateBarPrompt, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 0.5 } : { color: colors.textMuted }]}>{t('channelScreen_noRatingsYet')}</Text>
            )}
          </View>
          <Text style={[styles.rateBarAction, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.monoBold, letterSpacing: 1, textTransform: 'uppercase', fontSize: 11 } : { color: accent, fontFamily: font.bodyBold }]}>
            {myRating > 0 ? t('channelScreen_editRating') : t('channelScreen_rateChannel')}
          </Text>
        </Pressable>
      )}

      {/* Pinned message banner — tinted with the channel's mode accent so it
          stays cohesive with the rest of the screen instead of brand purple. */}
      {pinnedMessage && (
        <Pressable
          style={[
            styles.pinnedBanner,
            diffuse
              ? { backgroundColor: dt.colors.surface, borderBottomColor: dt.colors.line }
              : { backgroundColor: getModeColorSoft(mode, isDark), borderBottomColor: colors.border },
          ]}
        >
          <Pin size={14} color={diffuse ? dt.colors.ink3 : accent} strokeWidth={diffuse ? 1.6 : 2} />
          <Text
            style={[styles.pinnedBannerText, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.body } : { color: colors.text }]}
            numberOfLines={1}
          >
            <Text style={diffuse ? { fontFamily: diffuseFont.bodySemiBold } : { fontFamily: font.bodyBold }}>
              {pinnedMessage.author_name ?? t('channelScreen_someoneFallback')}
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
            (() => {
              // Empty state wears the channel's own blob identity + tint, and
              // the copy adapts to whether you've joined yet.
              const s = channel
                ? channelSticker(channel.id, isDark, channel.avatarUrl)
                : null
              const blob = channel ? channelBlob(channel.name, channel.category) : null
              const emptyTitle = isMember ? t('channelScreen_emptyTitle') : t('channelScreen_emptySubtitle')
              const emptyMsg = isMember
                ? t('channelScreen_emptyMemberMsg')
                : t('channelScreen_emptyJoinMsg', { channel: channel?.name ? `#${channel.name}` : t('channelScreen_thisChannel') })
              if (diffuse) {
                return (
                  <DiffuseEmptyState
                    icon={
                      <DiffuseBloomIcon color={accent} size={44} intensity={0.5}>
                        {blob ? <Character name={blob} size={26} bg={dt.colors.surface} /> : <MessageCircle size={22} color={dt.colors.ink3} strokeWidth={1.6} />}
                      </DiffuseBloomIcon>
                    }
                    title={emptyTitle}
                    message={emptyMsg}
                  />
                )
              }
              return (
                <EmptyState
                  icon={blob ? <Character name={blob} size={40} bg={s?.tint ?? stickers.lilacSoft} /> : undefined}
                  iconBg={s?.tint ?? stickers.lilacSoft}
                  title={emptyTitle}
                  message={emptyMsg}
                />
              )
            })()
          }
          renderItem={({ item }) =>
            item.message_type === 'system_join' || item.message_type === 'system_leave' ? (
              <SystemMessage message={item} />
            ) : (
              <View>
                <MessageBubble
                  message={item}
                  onReaction={() => handleReaction(item.id)}
                  onSave={() => handleSave(item.id)}
                  onLongPress={() => setReactionPickerPost(item)}
                  onThreadPress={() => router.push(`/channel/thread/${item.id}` as any)}
                />
                {/* Poll (Phase 3) — poll-messages are prefixed 📊; PollCard
                    self-loads and renders null if there's no poll row. */}
                {item.content.startsWith('📊') && (
                  <View style={{ paddingHorizontal: 16, paddingLeft: 52 }}>
                    <PollCard postId={item.id} />
                  </View>
                )}
              </View>
            )
          }
        />

        {/* Mention autocomplete overlay */}
        {mentionResults.length > 0 && (
          <View
            style={[
              styles.mentionOverlay,
              diffuse
                ? { backgroundColor: dt.colors.surface, borderColor: dt.colors.line, borderRadius: 20, shadowOpacity: 0, elevation: 0 }
                : { backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderRadius: radius.md },
            ]}
          >
            {mentionResults.map((member) => (
              <Pressable
                key={member.id}
                onPress={() => insertMention(member)}
                style={({ pressed }) => [
                  styles.mentionItem,
                  { borderBottomColor: diffuse ? dt.colors.line : colors.borderLight },
                  pressed && { backgroundColor: diffuse ? dt.colors.surfaceRaised : colors.surface },
                ]}
              >
                <AtSign size={14} color={diffuse ? dt.colors.ink3 : colors.primary} strokeWidth={diffuse ? 1.6 : 2} />
                <Text style={[styles.mentionName, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.body } : { color: colors.text }]}>
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
              diffuse
                ? { backgroundColor: dt.colors.surface, borderTopColor: dt.colors.line }
                : { backgroundColor: colors.surface, borderTopColor: colors.borderLight },
            ]}
          >
            {photos.map((uri, i) => (
              <View key={uri} style={styles.photoPreviewWrap}>
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
              diffuse
                ? { backgroundColor: dt.colors.surface, borderTopColor: dt.colors.line }
                : { backgroundColor: colors.surface, borderTopColor: colors.borderLight },
            ]}
          >
            <Reply size={14} color={diffuse ? dt.colors.ink3 : colors.primary} strokeWidth={diffuse ? 1.6 : 2} />
            <Text
              style={[styles.replyBarText, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.body } : { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {t('channelScreen_replyingTo')}{' '}
              <Text style={diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.bodySemiBold } : { color: colors.text, fontFamily: font.bodyBold }}>
                {replyTo.author_name ?? t('channelScreen_someoneLower')}
              </Text>
            </Text>
            <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
              <X size={16} color={diffuse ? dt.colors.ink3 : colors.textMuted} />
            </Pressable>
          </View>
        )}

        {/* Input bar */}
        {isMember ? (
          <View
            style={[
              styles.inputBar,
              diffuse
                ? {
                    backgroundColor: dt.colors.bg,
                    borderTopColor: dt.colors.line,
                    paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
                  }
                : {
                    backgroundColor: colors.surface,
                    borderTopColor: colors.border,
                    paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
                  },
            ]}
          >
            <Pressable onPress={pickPhoto} hitSlop={4} style={styles.inputIconBtn}>
              <Camera size={22} color={diffuse ? dt.colors.ink3 : colors.textSecondary} strokeWidth={diffuse ? 1.6 : 2} />
            </Pressable>
            <Pressable onPress={() => setShowPollComposer(true)} hitSlop={4} style={styles.inputIconBtn}>
              <BarChart3 size={22} color={diffuse ? dt.colors.ink3 : colors.textSecondary} strokeWidth={diffuse ? 1.6 : 2} />
            </Pressable>
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={handleTextChange}
              placeholder={t('channelScreen_messagePlaceholder')}
              placeholderTextColor={diffuse ? dt.colors.ink4 : colors.textMuted}
              multiline
              maxLength={2000}
              style={[
                styles.textInput,
                diffuse
                  ? {
                      color: dt.colors.ink,
                      backgroundColor: dt.colors.surface,
                      borderRadius: 20,
                      borderColor: dt.colors.line,
                      fontFamily: diffuseFont.body,
                    }
                  : {
                      color: colors.text,
                      backgroundColor: colors.surfaceRaised,
                      borderRadius: radius.lg,
                      borderColor: colors.borderLight,
                    },
              ]}
            />
            {diffuse ? (
              <Pressable
                onPress={handleSend}
                disabled={(!text.trim() && photos.length === 0) || sending}
                hitSlop={4}
                style={({ pressed }) => [
                  styles.sendBtn,
                  { opacity: (text.trim() || photos.length > 0) ? (pressed ? 0.6 : 1) : 0.3 },
                ]}
              >
                {sending ? (
                  <ActivityIndicator color={dt.colors.ink} size="small" />
                ) : (
                  <DiffuseArrow color={dt.colors.ink} size={22} />
                )}
              </Pressable>
            ) : (
              <Pressable
                onPress={handleSend}
                disabled={(!text.trim() && photos.length === 0) || sending}
                hitSlop={4}
                style={({ pressed }) => [
                  styles.sendBtn,
                  {
                    backgroundColor:
                      text.trim() || photos.length > 0 ? accent : colors.surfaceRaised,
                    borderRadius: radius.full,
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                {sending ? (
                  <ActivityIndicator color={colors.textInverse} size="small" />
                ) : (
                  <Send
                    size={18}
                    color={text.trim() || photos.length > 0 ? colors.textInverse : colors.textMuted}
                    strokeWidth={2}
                  />
                )}
              </Pressable>
            )}
          </View>
        ) : (
          <View
            style={[
              styles.joinPrompt,
              diffuse
                ? {
                    backgroundColor: dt.colors.bg,
                    borderTopColor: dt.colors.line,
                    paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
                  }
                : {
                    backgroundColor: colors.surface,
                    borderTopColor: colors.border,
                    paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
                  },
            ]}
          >
            <Text style={[styles.joinPromptText, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.body } : { color: colors.textSecondary, fontFamily: font.body }]}>
              {t('channelScreen_joinPromptText')}
            </Text>
            <Pressable
              onPress={handleJoinLeave}
              style={[styles.joinPromptBtn, diffuse
                ? { backgroundColor: 'transparent', borderRadius: 999, borderWidth: 1, borderColor: dt.colors.line2, flexDirection: 'row', gap: 8, alignItems: 'center' }
                : { backgroundColor: accent, borderRadius: radius.full }]}
            >
              <Text style={[styles.joinPromptBtnText, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.monoBold, letterSpacing: 1.4, textTransform: 'uppercase' } : { color: colors.textInverse, fontFamily: font.bodyBold }]}>{t('channelScreen_joinPromptBtn')}</Text>
              {diffuse && <DiffuseArrow color={dt.colors.ink} size={16} />}
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Reaction picker (Phase 3) — long-press a message → 4 reactions + More */}
      <ReactionPicker
        visible={reactionPickerPost !== null}
        current={reactionPickerPost?.my_reaction}
        onPick={(type) => reactionPickerPost && handleSetReaction(reactionPickerPost.id, type)}
        onMore={() => {
          const post = reactionPickerPost
          setReactionPickerPost(null)
          if (post) showMessageActions(post)
        }}
        onClose={() => setReactionPickerPost(null)}
      />

      {/* Poll composer (Phase 3) */}
      <PollComposer
        visible={showPollComposer}
        channelId={id as string}
        onClose={() => setShowPollComposer(false)}
        onCreated={() => load()}
      />

      {/* Rating overlay */}
      {showRating && (
        <View style={styles.ratingOverlay}>
          <View style={[styles.ratingCard, diffuse
            ? { backgroundColor: dt.colors.bg, borderRadius: 28, borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line }
            : { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            {/* Sticker accent — channel's own sticker */}
            {channel && (() => {
              const s = channelSticker(channel.id, isDark, channel.avatarUrl)
              const blob = channelBlob(channel.name, channel.category)
              return (
                <View style={[styles.ratingStickerBubble, diffuse
                  ? { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line2 }
                  : { backgroundColor: s.tint }]}>
                  <Character name={blob} size={34} bg={diffuse ? dt.colors.bg : s.tint} />
                </View>
              )
            })()}

            <Text style={[styles.ratingTitle, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.display } : { color: colors.text, fontFamily: font.display }]}>
              {t('channelScreen_ratingHeading', { channel: channel?.name ?? '' })}
            </Text>
            <Text style={[styles.ratingSubtitle, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.body } : { color: colors.textMuted, fontFamily: font.body }]}>
              {t('channelScreen_ratingModalTitle')}
            </Text>

            {/* Star selector */}
            <AnimatedStarRow value={myRating} onChange={setMyRating} starColor={diffuse ? dt.colors.ink : stickers.yellow} />

            {/* Review text */}
            <TextInput
              value={myReview}
              onChangeText={setMyReview}
              placeholder={t('channelScreen_reviewPlaceholder')}
              placeholderTextColor={diffuse ? dt.colors.ink4 : colors.textMuted}
              multiline
              style={[styles.ratingInput, diffuse
                ? { color: dt.colors.ink, backgroundColor: dt.colors.surface, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line, fontFamily: diffuseFont.body }
                : { color: colors.text, backgroundColor: colors.surfaceRaised, borderRadius: radius.lg }]}
            />

            {/* Buttons */}
            <View style={styles.ratingButtons}>
              <Pressable
                onPress={() => setShowRating(false)}
                style={[styles.ratingCancelBtn, diffuse ? { borderColor: dt.colors.line2, borderRadius: 999 } : { borderColor: colors.border, borderRadius: radius.lg }]}
              >
                <Text style={[styles.ratingCancelText, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1, textTransform: 'uppercase', fontSize: 12 } : { color: colors.textSecondary }]}>{t('channelScreen_ratingCancel')}</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmitRating}
                disabled={myRating === 0 || savingRating}
                style={[styles.ratingSubmitBtn, diffuse
                  ? { backgroundColor: 'transparent', borderRadius: 999, borderWidth: 1, borderColor: dt.colors.line2, opacity: myRating === 0 ? 0.4 : 1 }
                  : { backgroundColor: accent, borderRadius: radius.full, opacity: myRating === 0 ? 0.4 : 1 }]}
              >
                {savingRating ? (
                  <ActivityIndicator color={diffuse ? dt.colors.ink : colors.textInverse} size="small" />
                ) : (
                  <Text style={[styles.ratingSubmitText, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.monoBold, letterSpacing: 1, textTransform: 'uppercase', fontSize: 12 } : { color: colors.textInverse, fontFamily: font.bodyBold }]}>{t('channelScreen_ratingSubmit')}</Text>
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
        channelName={channel?.name ?? t('channelScreen_thisChannel')}
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
  starColor,
}: {
  value: number
  onChange: (n: number) => void
  starColor: string
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
              color={starColor}
              strokeWidth={2}
              fill={i <= value ? starColor : 'none'}
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
  const { colors, radius, isDark, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const mode = useModeStore((s) => s.mode)
  const accent = diffuse ? getDiffuseAccent(mode, dt.isDark) : getModeColor(mode, isDark)

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.shareOverlay} onPress={onClose}>
        <Pressable
          style={[styles.shareSheet, diffuse
            ? { backgroundColor: dt.colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line }
            : { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.shareHandle, { backgroundColor: diffuse ? dt.colors.line2 : colors.textMuted + '55' }]} />
          <Text style={[styles.shareTitle, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.display } : { color: colors.text, fontFamily: font.display }]}>{t('channelScreen_shareTitle')}</Text>

          <Pressable
            onPress={onCopy}
            style={({ pressed }) => [
              styles.shareAction,
              diffuse ? { borderColor: dt.colors.line2, borderRadius: 999 } : { borderColor: colors.borderStrong, borderRadius: radius.full },
              pressed && { opacity: 0.75 },
            ]}
          >
            <Copy size={18} color={diffuse ? dt.colors.ink : colors.text} strokeWidth={diffuse ? 1.6 : 2} />
            <Text style={[styles.shareActionText, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.monoBold, letterSpacing: 1, textTransform: 'uppercase', fontSize: 13 } : { color: colors.text, fontFamily: font.bodyBold }]}>{t('channelScreen_copyLink')}</Text>
          </Pressable>

          <Pressable
            onPress={onShare}
            style={({ pressed }) => [
              styles.shareActionFilled,
              diffuse ? { backgroundColor: 'transparent', borderRadius: 999, borderWidth: 1, borderColor: dt.colors.line2 } : { backgroundColor: accent, borderRadius: radius.full },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Share2 size={18} color={diffuse ? dt.colors.ink : colors.textInverse} strokeWidth={diffuse ? 1.6 : 2.5} />
            <Text style={[styles.shareActionTextFilled, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.monoBold, letterSpacing: 1.4, textTransform: 'uppercase', fontSize: 13 } : { color: colors.textInverse, fontFamily: font.bodyBold }]}>{t('channelScreen_shareAction')}</Text>
          </Pressable>

          <Pressable onPress={onClose} style={styles.shareCancel}>
            <Text style={[styles.shareCancelText, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1, textTransform: 'uppercase' } : { color: colors.textMuted }]}>{t('channelScreen_ratingCancel')}</Text>
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
  const { colors, radius, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.shareOverlay} onPress={onCancel}>
        <Pressable
          style={[styles.shareSheet, diffuse
            ? { backgroundColor: dt.colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line }
            : { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.shareHandle, { backgroundColor: diffuse ? dt.colors.line2 : colors.textMuted + '55' }]} />
          <Text style={[styles.shareTitle, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.display } : { color: colors.text, fontFamily: font.display }]}>{t('channelScreen_leaveTitle')}</Text>
          <Text style={[styles.leaveBody, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.body } : { color: colors.textSecondary, fontFamily: font.body }]}>
            {t('channelScreen_leaveBodyPrefix')}
            <Text style={diffuse ? { fontFamily: diffuseFont.bodySemiBold, color: dt.colors.ink } : { fontFamily: font.bodyBold, color: colors.text }}>#{channelName}</Text>
            {t('channelScreen_leaveBodySuffix')}
          </Text>

          <Pressable
            onPress={onConfirm}
            disabled={leaving}
            style={({ pressed }) => [
              styles.leaveConfirmBtn,
              diffuse ? { backgroundColor: 'transparent', borderRadius: 999, borderWidth: 1, borderColor: dt.colors.error } : { backgroundColor: brand.error, borderRadius: radius.full },
              pressed && { opacity: 0.85 },
              leaving && { opacity: 0.6 },
            ]}
          >
            {leaving ? (
              <ActivityIndicator color={diffuse ? dt.colors.error : '#FFFFFF'} size="small" />
            ) : (
              <Text style={[styles.leaveConfirmText, diffuse && { color: dt.colors.error, fontFamily: diffuseFont.monoBold, letterSpacing: 1.4, textTransform: 'uppercase' }]}>{t('channelScreen_leaveBtn')}</Text>
            )}
          </Pressable>

          <Pressable onPress={onCancel} style={styles.shareCancel}>
            <Text style={[styles.shareCancelText, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1, textTransform: 'uppercase' } : { color: colors.textMuted }]}>{t('channelScreen_stayBtn')}</Text>
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
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const isJoin = message.message_type === 'system_join'

  return (
    <View style={styles.systemMsg}>
      <View style={[styles.systemMsgDot, diffuse
        ? { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line2 }
        : { backgroundColor: isJoin ? brand.success + '30' : brand.error + '30' }]}>
        {isJoin ? (
          <LogIn size={12} color={diffuse ? dt.colors.ink3 : brand.success} strokeWidth={diffuse ? 1.6 : 2} />
        ) : (
          <LogOut size={12} color={diffuse ? dt.colors.ink3 : brand.error} strokeWidth={diffuse ? 1.6 : 2} />
        )}
      </View>
      <Text style={[styles.systemMsgText, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, fontStyle: 'normal', letterSpacing: 0.5 } : { color: colors.textMuted }]}>
        {message.content}
      </Text>
      <Text style={[styles.systemMsgTime, diffuse ? { color: dt.colors.ink4, fontFamily: diffuseFont.mono } : { color: colors.textMuted }]}>
        {formatTime(message.created_at)}
      </Text>
    </View>
  )
}

// ─── Message Bubble ──────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: ChannelPost
  onReaction: () => void
  onLongPress: () => void
  onThreadPress: () => void
  onSave: () => void
}

// Memoized so an incoming message / reaction elsewhere in the list doesn't
// re-render every other bubble. The comparator only re-renders when a field
// this row actually displays changes (the parent passes fresh inline handlers
// each render, so a default shallow compare would never hit).
function MessageBubbleBase({
  message,
  onReaction,
  onLongPress,
  onThreadPress,
  onSave,
}: MessageBubbleProps) {
  const { colors, radius, isDark, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()

  // Per-author sticker identity — deterministic from author id/name, so each
  // person reads as a consistent sticker instead of a generic gray avatar.
  const authorKey = message.author_id ?? message.author_name ?? 'member'
  const s = channelSticker(authorKey, isDark)
  const AvatarSticker = s.Component

  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={400}
      style={({ pressed }) => [
        styles.bubble,
        pressed && { backgroundColor: diffuse ? dt.colors.surface : colors.surfaceRaised },
      ]}
    >
      {/* Avatar — author's sticker (hairline frame under diffuse) */}
      <View style={[styles.avatar, diffuse
        ? { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line2 }
        : { backgroundColor: s.tint }]}>
        <AvatarSticker size={20} fill={s.fill} />
      </View>

      <View style={styles.bubbleContent}>
        {/* Inline reply reference */}
        {message.reply_to_content && (
          <View style={[styles.inlineReplyRef, diffuse
            ? { backgroundColor: 'transparent', borderLeftColor: dt.colors.line2, borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line, borderLeftWidth: 3, borderRadius: 12 }
            : { backgroundColor: colors.surfaceRaised, borderLeftColor: colors.primary }]}>
            <Text style={[styles.inlineReplyAuthor, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.bodySemiBold } : { color: colors.primary, fontFamily: font.bodyBold }]}>
              {message.reply_to_author ?? t('channelScreen_someoneLower')}
            </Text>
            <Text style={[styles.inlineReplyText, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.body } : { color: colors.textSecondary, fontFamily: font.body }]} numberOfLines={1}>
              {message.reply_to_content}
            </Text>
          </View>
        )}

        {/* Author + timestamp row */}
        <View style={styles.bubbleHeader}>
          <Text style={[styles.authorName, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.bodySemiBold } : { color: colors.text, fontFamily: font.bodyBold }]}>
            {message.author_name ?? t('channelScreen_memberFallback')}
          </Text>
          {/* Verified-expert badge (Phase 3) */}
          {message.author_is_expert && (
            <View style={styles.expertBadge}>
              <BadgeCheck size={13} color={diffuse ? dt.stickers.blue : brand.primary} strokeWidth={2} fill="none" />
              {message.author_expert_title ? (
                <Text style={[styles.expertTitle, { color: diffuse ? dt.stickers.blue : brand.primary, fontFamily: diffuse ? diffuseFont.mono : font.bodyMedium }]}>
                  {message.author_expert_title}
                </Text>
              ) : null}
            </View>
          )}
          <Text style={[styles.timestamp, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono } : { color: colors.textMuted, fontFamily: font.body }]}>
            {formatTime(message.created_at)}
          </Text>
        </View>

        {/* Pinned indicator */}
        {message.is_pinned && (
          <View style={[styles.pinnedTag, diffuse
            ? { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line2 }
            : { backgroundColor: brand.accent + '15' }]}>
            <Pin size={10} color={diffuse ? dt.colors.ink3 : brand.accent} strokeWidth={diffuse ? 1.6 : 2} />
            <Text style={[styles.pinnedTagText, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1 } : { color: brand.accent }]}>{t('channelScreen_pinned')}</Text>
          </View>
        )}

        {/* Message content — handles shared posts, @mentions, plain text + photos */}
        <MessageContent content={message.content} photos={message.photos} />

        {/* Bottom row: reactions + replies */}
        <View style={styles.bubbleFooter}>
          {/* Reaction — tap = quick heart, long-press (bubble) = picker.
              Shows the chosen emoji when a non-heart reaction is set. */}
          <Pressable onPress={onReaction} onLongPress={onLongPress} hitSlop={6} style={styles.reactionBtn}>
            {message.my_reaction && message.my_reaction !== 'heart' ? (
              <Text style={{ fontSize: 14 }}>{REACTION_EMOJI[message.my_reaction]}</Text>
            ) : (
              <Heart
                size={14}
                color={message.user_reacted ? (diffuse ? dt.colors.ink : brand.error) : (diffuse ? dt.colors.ink3 : colors.textMuted)}
                strokeWidth={diffuse ? 1.6 : 2}
                fill={message.user_reacted ? (diffuse ? dt.colors.ink : brand.error) : 'none'}
              />
            )}
            {message.reaction_count > 0 && (
              <Text
                style={[
                  styles.reactionCount,
                  diffuse
                    ? { color: message.user_reacted ? dt.colors.ink : dt.colors.ink3, fontFamily: diffuseFont.mono }
                    : { color: message.user_reacted ? brand.error : colors.textMuted },
                ]}
              >
                {message.reaction_count}
              </Text>
            )}
          </Pressable>

          {/* Bookmark (Phase 3) */}
          {message.message_type === 'user' && (
            <Pressable onPress={onSave} hitSlop={6} style={styles.reactionBtn}>
              <Bookmark
                size={14}
                color={message.saved ? (diffuse ? dt.colors.ink : brand.primary) : (diffuse ? dt.colors.ink3 : colors.textMuted)}
                strokeWidth={diffuse ? 1.6 : 2}
                fill={message.saved ? (diffuse ? dt.colors.ink : brand.primary) : 'none'}
              />
            </Pressable>
          )}

          {/* Reply count — tap to open thread */}
          {message.reply_count > 0 && (
            <Pressable onPress={onThreadPress} style={styles.replyLink}>
              <MessageCircle size={14} color={diffuse ? dt.colors.ink3 : colors.primary} strokeWidth={diffuse ? 1.6 : 2} />
              <Text style={[styles.replyLinkText, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 0.5, textTransform: 'uppercase', fontSize: 10 } : { color: colors.primary }]}>
                {`${message.reply_count === 1 ? t('channelScreen_replyCountOne', { count: message.reply_count }) : t('channelScreen_replyCountMany', { count: message.reply_count })} — ${t('channelScreen_viewThread')}`}
              </Text>
            </Pressable>
          )}

          {/* Thread CTA for messages with no replies yet */}
          {(message.reply_count ?? 0) === 0 && (
            <Pressable onPress={onThreadPress} style={styles.replyLink}>
              <MessageCircle size={12} color={diffuse ? dt.colors.ink4 : colors.textMuted} strokeWidth={1.5} />
              <Text style={[styles.replyLinkText, diffuse ? { color: dt.colors.ink4, fontFamily: diffuseFont.mono, letterSpacing: 0.5, textTransform: 'uppercase', fontSize: 10 } : { color: colors.textMuted, fontSize: 11 }]}>
                {t('channelScreen_replyInThread')}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  )
}

const MessageBubble = memo(MessageBubbleBase, (a, b) => {
  const m = a.message, n = b.message
  return (
    m.id === n.id &&
    m.content === n.content &&
    m.author_name === n.author_name &&
    m.author_is_expert === n.author_is_expert &&
    m.reaction_count === n.reaction_count &&
    m.user_reacted === n.user_reacted &&
    m.my_reaction === n.my_reaction &&
    m.saved === n.saved &&
    m.reply_count === n.reply_count &&
    m.is_pinned === n.is_pinned
  )
})

// ─── Helpers ────────────────────────────────────────────────────────────

// ─── Message Content with share link detection ──────────────────────────

function MessageContent({ content, photos }: { content: string; photos?: string[] }) {
  const { colors, radius, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()

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
          <Text style={[styles.messageText, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.body } : { color: colors.text }]}>{userNote}</Text>
        )}

        {/* Shared post card */}
        <Pressable
          onPress={() => router.push(`/garage/${garageId}` as any)}
          style={[styles.shareCard, diffuse
            ? { backgroundColor: dt.colors.surface, borderRadius: 20, borderColor: dt.colors.line }
            : { backgroundColor: colors.surface, borderRadius: radius.lg, borderColor: colors.border }]}
        >
          {coverPhoto && (
            <Image source={{ uri: coverPhoto }} style={[styles.shareCardImage, { borderTopLeftRadius: diffuse ? 20 : radius.lg, borderTopRightRadius: diffuse ? 20 : radius.lg }]} />
          )}
          <View style={styles.shareCardBody}>
            <Text style={[styles.shareCardLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1.2 } : { color: colors.primary }]}>
              {t('channelScreen_sharedFromGarage')}
            </Text>
            {quotedCaption && (
              <Text style={[styles.shareCardCaption, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.bodySemiBold } : { color: colors.text }]} numberOfLines={2}>
                {quotedCaption}
              </Text>
            )}
            {sharedAuthor && (
              <Text style={[styles.shareCardAuthor, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono } : { color: colors.textMuted }]}>
                {t('channelScreen_byAuthor', { author: sharedAuthor })}
              </Text>
            )}
            <Text style={[styles.shareCardCta, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.monoBold, letterSpacing: 1, textTransform: 'uppercase', fontSize: 11 } : { color: colors.primary }]}>
              {t('channelScreen_tapToView')}
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
      <Text style={[styles.messageText, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.body } : { color: colors.text, fontFamily: font.body }]}>
        {hasMentions
          ? parts.map((part, i) =>
              part.startsWith('@') ? (
                <Text key={i} style={diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.bodySemiBold } : { color: colors.primary, fontFamily: font.bodySemiBold }}>{part}</Text>
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
  headerTitle: { fontSize: 20, flexShrink: 1, letterSpacing: -0.3 },
  memberCount: { fontSize: 12, marginLeft: 2 },
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
  ratingTitle: { fontSize: 22, letterSpacing: -0.4, textAlign: 'center' },
  ratingSubtitle: { fontSize: 13, fontWeight: '500', textAlign: 'center' },
  ratingStars: { flexDirection: 'row', gap: 10, marginTop: 4 },

  // Share sheet
  shareOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  shareSheet: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 34 },
  shareHandle: { width: 44, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  shareTitle: { fontSize: 22, letterSpacing: -0.4, textAlign: 'center', marginBottom: 18 },
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
  bubbleHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  authorName: { fontSize: 13, fontWeight: '700' },
  expertBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  expertTitle: { fontSize: 10, letterSpacing: 0.3 },
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
    ...shadows.cardPop,
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
    backgroundColor: brand.error,
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
