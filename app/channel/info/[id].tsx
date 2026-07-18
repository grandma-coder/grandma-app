/**
 * Channel Info — details, owner, members, shared media, admin controls.
 */

import { useState, useEffect } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  FlatList,
  Alert,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Dimensions,
  Share,
  Modal,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import {
  ArrowLeft,
  Users,
  Star,
  Crown,
  Image as ImageIcon,
  Settings,
  Trash2,
  LogOut,
  Edit3,
  Check,
  X,
  Shield,
  Lock,
  UserPlus,
  ArrowRightLeft,
  XCircle,
  Share2,
  Copy,
  Link,
  MessageSquare,
  ChartBar,
  Zap,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand, getModeColor, font, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../../../constants/theme'
import { useModeStore } from '../../../store/useModeStore'
import { useIsDiffuse } from '../../../components/ui/diffuse/DiffuseKit'
import { DiffuseBloomIcon } from '../../../components/ui/diffuse/DiffusePrimitives'
import { useSavedToast } from '../../../components/ui/SavedToast'
import { channelSticker, channelBlob } from '../../../lib/channelSticker'
import { Character } from '../../../components/characters/Characters'
import { getChannels, type Channel } from '../../../lib/channels'
import {
  isChannelMember,
  joinChannel,
  leaveChannel,
  deleteMessage,
  getPendingRequests,
  approveRequest,
  denyRequest,
  transferChannelOwnership,
  getChannelMetrics,
  type ChannelPost,
  type ChannelRequest,
  type ChannelMetrics,
} from '../../../lib/channelPosts'
import { supabase } from '../../../lib/supabase'
import { BrandedLoader } from '../../../components/ui/BrandedLoader'
import { useTranslation } from '../../../lib/i18n'

const SCREEN_W = Dimensions.get('window').width
const MEDIA_THUMB = (SCREEN_W - 48 - 8) / 4 // 4 columns

export default function ChannelInfoScreen() {
  const { colors, radius, isDark, font, stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const mode = useModeStore((s) => s.mode)
  const accent = diffuse ? getDiffuseAccent(mode, dt.isDark) : getModeColor(mode, isDark)
  const insets = useSafeAreaInsets()
  const toast = useSavedToast()
  const { id } = useLocalSearchParams<{ id: string }>()

  // Delete confirm modal state
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [channel, setChannel] = useState<Channel | null>(null)
  const [loading, setLoading] = useState(true)
  const [isMember, setIsMember] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Members
  const [members, setMembers] = useState<{ user_id: string; name: string | null; joined_at: string }[]>([])
  const [ownerName, setOwnerName] = useState<string | null>(null)

  // Media shared in channel
  const [sharedMedia, setSharedMedia] = useState<string[]>([])

  // Edit mode (for owner)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [saving, setSaving] = useState(false)

  // Messages for admin moderation
  const [messages, setMessages] = useState<ChannelPost[]>([])
  const [showMessages, setShowMessages] = useState(false)

  // Pending join requests (owner of private channel)
  const [pendingRequests, setPendingRequests] = useState<ChannelRequest[]>([])

  // Channel metrics (owner only)
  const [metrics, setMetrics] = useState<ChannelMetrics | null>(null)

  useEffect(() => {
    if (id) load()
  }, [id])

  async function load() {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user.id
      setCurrentUserId(userId ?? null)

      // Channel info
      const allChannels = await getChannels()
      const ch = allChannels.find((c) => c.id === id)
      setChannel(ch ?? null)
      if (ch) {
        setEditName(ch.name)
        setEditDesc(ch.description ?? '')
        setIsOwner(userId === ch.createdBy)
      }

      // Membership
      const member = await isChannelMember(id!)
      setIsMember(member)

      // Members list with names
      const { data: memberRows } = await supabase
        .from('channel_members')
        .select('user_id, created_at')
        .eq('channel_id', id)
        .order('created_at', { ascending: true })

      if (memberRows && memberRows.length > 0) {
        const userIds = memberRows.map((m: any) => m.user_id)
        const { data: profiles } = await supabase
          .from('profiles_public')
          .select('user_id, name')
          .in('user_id', userIds)

        const nameMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p.name]))
        setMembers(memberRows.map((m: any) => ({
          user_id: m.user_id,
          name: nameMap.get(m.user_id) ?? null,
          joined_at: m.created_at,
        })))

        // Owner name
        if (ch?.createdBy) {
          const ownerProfile = (profiles ?? []).find((p: any) => p.user_id === ch.createdBy)
          setOwnerName(ownerProfile?.name ?? null)
        }
      }

      // Shared media (photos from messages)
      const { data: posts } = await supabase
        .from('channel_posts')
        .select('photos')
        .eq('channel_id', id)
        .not('photos', 'eq', '{}')
        .order('created_at', { ascending: false })
        .limit(50)

      const allPhotos: string[] = []
      for (const p of (posts ?? [])) {
        if (p.photos && Array.isArray(p.photos)) {
          allPhotos.push(...p.photos)
        }
      }
      setSharedMedia(allPhotos.slice(0, 20))

      // Messages for moderation + pending requests + metrics (owner only)
      if (userId === ch?.createdBy) {
        const [{ data: msgs }, channelMetrics] = await Promise.all([
          supabase
            .from('channel_posts')
            .select('*')
            .eq('channel_id', id)
            .order('created_at', { ascending: false })
            .limit(50),
          getChannelMetrics(id!),
        ])
        setMessages((msgs ?? []) as ChannelPost[])
        setMetrics(channelMetrics)

        // Load pending requests for private channels
        if (ch?.channelType === 'private') {
          const reqs = await getPendingRequests(id!)
          setPendingRequests(reqs)
        }
      }
    } catch {} finally {
      setLoading(false)
    }
  }

  async function handleSaveEdit() {
    if (!id || !editName.trim()) return
    setSaving(true)
    try {
      await supabase.from('channels').update({
        name: editName.trim(),
        description: editDesc.trim() || null,
      }).eq('id', id)
      setEditing(false)
      load()
    } catch (e: any) {
      Alert.alert(t('common_error'), e.message)
    } finally {
      setSaving(false)
    }
  }

  function handleDeleteChannel() {
    setShowDelete(true)
  }

  async function confirmDeleteChannel() {
    setDeleting(true)
    try {
      await supabase.from('channels').delete().eq('id', id)
      setShowDelete(false)
      router.replace('/connections' as any)
    } catch (e: any) {
      Alert.alert(t('common_error'), e.message)
    } finally {
      setDeleting(false)
    }
  }

  async function handleDeleteMessage(msgId: string) {
    Alert.alert(t('channelInfo_deleteMessageTitle'), t('channelInfo_removeMessageBody'), [
      { text: t('common_cancel'), style: 'cancel' },
      {
        text: t('common_delete'), style: 'destructive',
        onPress: async () => {
          if (!currentUserId) return
          try {
            await deleteMessage(msgId, currentUserId)
            setMessages((prev) => prev.filter((m) => m.id !== msgId))
          } catch {}
        },
      },
    ])
  }

  function handleLeave() {
    if (!id) return
    if (isOwner) {
      Alert.alert(
        t('channelInfo_hostAlertTitle'),
        t('channelInfo_hostAlertBody'),
        [{ text: t('common_ok') }]
      )
      return
    }
    Alert.alert(
      t('channelInfo_leaveChannelTitle'),
      t('channelInfo_leaveChannelConfirm', { channel: channel?.name ?? t('channelInfo_thisChannel') }),
      [
        { text: t('common_cancel'), style: 'cancel' },
        {
          text: t('channelInfo_leave'),
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveChannel(id)
              router.back()
            } catch {
              Alert.alert(t('common_error'), t('channelInfo_leaveFailed'))
            }
          },
        },
      ]
    )
  }

  function handleTransferOwnership() {
    if (!id) return
    const others = members.filter((m) => m.user_id !== currentUserId)
    if (others.length === 0) {
      Alert.alert(t('channelInfo_noMembersTitle'), t('channelInfo_noMembersBody'))
      return
    }
    const buttons = others.slice(0, 8).map((m) => ({
      text: m.name ?? t('channelInfo_memberFallback'),
      onPress: () => {
        Alert.alert(
          t('channelInfo_confirmTransferTitle'),
          t('channelInfo_confirmTransferBody', { channel: channel?.name ?? '', member: m.name ?? t('channelInfo_thisMember') }),
          [
            { text: t('common_cancel'), style: 'cancel' as const },
            {
              text: t('channelInfo_transferBtn'),
              onPress: async () => {
                try {
                  await transferChannelOwnership(id, m.user_id)
                  toast.show({ title: t('channelInfo_doneTitle'), message: t('channelInfo_transferredMsg', { member: m.name ?? t('channelInfo_theNewHost') }) })
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
    Alert.alert(t('channelInfo_transferOwnership'), t('channelInfo_selectNewHost'), buttons as any)
  }

  async function handleApproveRequest(req: ChannelRequest) {
    try {
      await approveRequest(req.id, req.channel_id, req.user_id)
      setPendingRequests((prev) => prev.filter((r) => r.id !== req.id))
      load()
      Alert.alert(t('channelInfo_approvedTitle'), t('channelInfo_approvedBody', { user: req.user_name ?? t('channelInfo_userFallback') }))
    } catch (e: any) {
      Alert.alert(t('common_error'), e.message)
    }
  }

  async function handleDenyRequest(req: ChannelRequest) {
    Alert.alert(
      t('channelInfo_denyRequestTitle'),
      t('channelInfo_denyRequestBody', { user: req.user_name ?? t('channelInfo_thisUser') }),
      [
        { text: t('common_cancel'), style: 'cancel' },
        {
          text: t('channelInfo_denyBtn'),
          style: 'destructive',
          onPress: async () => {
            try {
              await denyRequest(req.id)
              setPendingRequests((prev) => prev.filter((r) => r.id !== req.id))
            } catch (e: any) {
              Alert.alert(t('common_error'), e.message)
            }
          },
        },
      ]
    )
  }

  function handleShareChannel() {
    if (!id || !channel) return

    // Private: only members can share
    if (channel.channelType === 'private' && !isMember) {
      Alert.alert(t('channelInfo_privateChannelTitle'), t('channelInfo_privateChannelShareBody'))
      return
    }

    const channelUrl = `grandma-app://channel/${id}`
    const desc = channel.description ? `\n${channel.description}` : ''
    const privacy = channel.channelType === 'private' ? ` ${t('channelInfo_privateSuffix')}` : ''
    const shareMessage = `${t('channelInfo_shareMessage', { channel: channel.name, privacy })}${desc}\n\n${channelUrl}`

    Alert.alert(t('channelInfo_shareChannelTitle'), '', [
      {
        text: t('channelInfo_copyLink'),
        onPress: () => {
          import('expo-clipboard').then(({ setStringAsync }) => {
            setStringAsync(channelUrl)
            toast.show({ title: t('channelInfo_copiedTitle'), message: t('channelInfo_linkCopiedMsg') })
          })
        },
      },
      {
        text: t('channelInfo_shareEllipsis'),
        onPress: () => {
          Share.share({
            message: shareMessage,
            title: `#${channel.name}`,
          })
        },
      },
      { text: t('common_cancel'), style: 'cancel' },
    ])
  }

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
        <BrandedLoader />
      </View>
    )
  }

  if (!channel) {
    return (
      <View style={[s.center, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
        <Text style={diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.body } : { color: colors.textMuted }}>{t('channelInfo_channelNotFound')}</Text>
      </View>
    )
  }

  return (
    <View style={[s.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8, borderBottomColor: diffuse ? dt.colors.line : colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={({ pressed }) => [s.headerBtn, pressed && { opacity: 0.7 }]}>
          <ArrowLeft size={24} color={diffuse ? dt.colors.ink : colors.text} strokeWidth={diffuse ? 1.6 : 2} />
        </Pressable>
        <Text style={[s.headerTitle, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.display } : { color: colors.text, fontFamily: font.display }]}>{t('channelInfo_header')}</Text>
        <View style={s.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Channel icon + name */}
        <View style={s.channelHeader}>
          {(() => {
            const sticker = channelSticker(channel.id, isDark, channel.avatarUrl)
            const blob = channelBlob(channel.name, channel.category)
            const iconBg = diffuse ? dt.colors.surface : sticker.tint
            return (
              <View style={[s.channelIcon, diffuse
                ? { backgroundColor: dt.colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line2 }
                : { backgroundColor: sticker.tint }]}>
                <Character name={blob} size={52} bg={iconBg} />
              </View>
            )
          })()}

          {editing ? (
            <View style={s.editSection}>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                style={[s.editInput, diffuse
                  ? { color: dt.colors.ink, borderColor: dt.colors.line, borderRadius: 20, backgroundColor: dt.colors.surface, fontFamily: diffuseFont.body }
                  : { color: colors.text, borderColor: colors.border, borderRadius: radius.lg }]}
                placeholder={t('channelInfo_namePlaceholder')}
                placeholderTextColor={diffuse ? dt.colors.ink4 : colors.textMuted}
              />
              <TextInput
                value={editDesc}
                onChangeText={setEditDesc}
                style={[s.editTextArea, diffuse
                  ? { color: dt.colors.ink, borderColor: dt.colors.line, borderRadius: 20, backgroundColor: dt.colors.surface, fontFamily: diffuseFont.body }
                  : { color: colors.text, borderColor: colors.border, borderRadius: radius.lg }]}
                placeholder={t('channelInfo_descriptionPlaceholder')}
                placeholderTextColor={diffuse ? dt.colors.ink4 : colors.textMuted}
                multiline
              />
              <View style={s.editActions}>
                <Pressable onPress={() => setEditing(false)} style={({ pressed }) => [s.editCancelBtn, diffuse ? { borderColor: dt.colors.line2, borderRadius: 999 } : { borderColor: colors.border, borderRadius: radius.full }, pressed && { opacity: 0.7 }]}>
                  <X size={16} color={diffuse ? dt.colors.ink3 : colors.textSecondary} strokeWidth={diffuse ? 1.6 : 2} />
                  <Text style={[s.editCancelText, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1, textTransform: 'uppercase', fontSize: 12 } : { color: colors.textSecondary, fontFamily: font.bodySemiBold }]}>{t('channelInfo_editCancel')}</Text>
                </Pressable>
                <Pressable onPress={handleSaveEdit} disabled={saving} style={({ pressed }) => [s.editSaveBtn, diffuse ? { backgroundColor: 'transparent', borderRadius: 999, borderWidth: 1, borderColor: dt.colors.line2 } : { backgroundColor: accent, borderRadius: radius.full }, pressed && { opacity: 0.85 }]}>
                  {saving ? <ActivityIndicator color={diffuse ? dt.colors.ink : colors.textInverse} size="small" /> : (
                    <>
                      <Check size={16} color={diffuse ? dt.colors.ink : colors.textInverse} strokeWidth={diffuse ? 1.6 : 2} />
                      <Text style={[s.editSaveText, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.monoBold, letterSpacing: 1, textTransform: 'uppercase', fontSize: 12 } : { color: colors.textInverse, fontFamily: font.bodyBold }]}>{t('channelInfo_editSave')}</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <Text style={[s.channelName, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.display } : { color: colors.text, fontFamily: font.display }]}>{channel.name}</Text>
              {channel.description && (
                <Text style={[s.channelDesc, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.body } : { color: colors.textSecondary, fontFamily: font.body }]}>{channel.description}</Text>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {channel.channelType === 'private' && (
                  <Lock size={12} color={diffuse ? dt.colors.ink3 : colors.textMuted} strokeWidth={2} />
                )}
                <Text style={[s.channelCategory, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1 } : { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
                  {t('channelInfo_typeChannel', { type: channel.channelType === 'private' ? t('channelInfo_privateLabel') : (channel.category ?? '') })}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Stats row */}
        <View style={[s.statsRow, diffuse
          ? { backgroundColor: dt.colors.surface, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line }
          : { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
          <View style={s.stat}>
            <Users size={18} color={diffuse ? dt.colors.ink3 : colors.primary} strokeWidth={diffuse ? 1.6 : 2} />
            <Text style={[s.statNumber, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.display, fontWeight: '400' } : { color: colors.text, fontFamily: font.display }]}>{channel.memberCount}</Text>
            <Text style={[s.statLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1, textTransform: 'uppercase' } : { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>{t('channelInfo_statMembers')}</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: diffuse ? dt.colors.line : colors.borderLight }]} />
          <View style={s.stat}>
            <Star size={18} color={diffuse ? dt.colors.ink3 : stickers.yellow} strokeWidth={diffuse ? 1.6 : 2} fill={!diffuse && channel.avgRating > 0 ? stickers.yellow : 'none'} />
            <Text style={[s.statNumber, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.display, fontWeight: '400' } : { color: colors.text, fontFamily: font.display }]}>{channel.avgRating > 0 ? channel.avgRating.toFixed(1) : '—'}</Text>
            <Text style={[s.statLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1, textTransform: 'uppercase' } : { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>{t('channelInfo_statRating')}</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: diffuse ? dt.colors.line : colors.borderLight }]} />
          <View style={s.stat}>
            <ImageIcon size={18} color={diffuse ? dt.colors.ink3 : colors.primary} strokeWidth={diffuse ? 1.6 : 2} />
            <Text style={[s.statNumber, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.display, fontWeight: '400' } : { color: colors.text, fontFamily: font.display }]}>{sharedMedia.length}</Text>
            <Text style={[s.statLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1, textTransform: 'uppercase' } : { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>{t('channelInfo_statMedia')}</Text>
          </View>
        </View>

        {/* Share Channel — public: always, private: members only */}
        {(channel.channelType !== 'private' || isMember) && (
          <View style={s.section}>
            <Pressable
              onPress={handleShareChannel}
              style={({ pressed }) => [
                s.shareBtn,
                diffuse
                  ? { backgroundColor: dt.colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line, borderRadius: 20 }
                  : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.full },
                pressed && { opacity: 0.85 },
              ]}
            >
              {diffuse ? (
                <DiffuseBloomIcon color={accent} size={38} intensity={0.5}>
                  <Share2 size={18} color={dt.colors.ink3} strokeWidth={1.6} />
                </DiffuseBloomIcon>
              ) : (
                <Share2 size={18} color={colors.text} strokeWidth={2} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={[s.shareBtnText, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.bodySemiBold } : { color: colors.text, fontFamily: font.bodyBold }]}>{t('channelInfo_shareChannel')}</Text>
                <Text style={[s.shareBtnSub, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 0.5 } : { color: colors.textMuted, fontFamily: font.bodyMedium }]}>
                  {channel.channelType === 'private'
                    ? t('channelInfo_shareSubPrivate')
                    : t('channelInfo_shareSubPublic')}
                </Text>
              </View>
            </Pressable>
          </View>
        )}

        {/* Owner / Creator */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1.4 } : { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>{t('channelInfo_sectionCreatedBy')}</Text>
          <View style={[s.ownerCard, diffuse
            ? { backgroundColor: dt.colors.surface, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line }
            : { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            {/* Owner's sticker identity with a gold crown badge marking the host. */}
            {(() => {
              const os = channelSticker(channel.createdBy ?? 'owner', isDark)
              const OwnerSticker = os.Component
              return (
                <View style={[s.ownerAvatar, diffuse
                  ? { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line2 }
                  : { backgroundColor: os.tint }]}>
                  <OwnerSticker size={20} fill={os.fill} />
                  <View style={[s.ownerCrownBadge, { backgroundColor: diffuse ? dt.colors.bg : colors.surface }]}>
                    <Crown size={11} color={brand.accent} strokeWidth={2} fill={brand.accent} />
                  </View>
                </View>
              )
            })()}
            <View style={{ flex: 1 }}>
              <Text style={[s.ownerName, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.bodySemiBold } : { color: colors.text, fontFamily: font.bodyBold }]}>
                {ownerName ?? t('channelInfo_ownerFallback')}
              </Text>
              <Text style={[s.ownerMeta, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 0.5 } : { color: colors.textMuted, fontFamily: font.bodyMedium }]}>
                {t('channelInfo_createdDate', { date: new Date(channel.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) })}
              </Text>
            </View>
            {isOwner && (
              <View style={[s.ownerBadge, diffuse
                ? { backgroundColor: 'transparent', borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line2 }
                : { backgroundColor: brand.accent + '20', borderRadius: radius.full }]}>
                <Text style={[s.ownerBadgeText, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1 } : { color: brand.accent, fontFamily: font.bodySemiBold }]}>{t('channelInfo_youBadge')}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Members */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1.4 } : { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
            {t('channelInfo_sectionMembers')} ({members.length})
          </Text>
          {members.slice(0, 10).map((m) => {
            const ms = channelSticker(m.user_id, isDark)
            const MemberSticker = ms.Component
            return (
              <View key={m.user_id} style={[s.memberRow, { borderBottomColor: diffuse ? dt.colors.line : colors.borderLight }]}>
                <View style={[s.memberAvatar, diffuse
                  ? { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line2 }
                  : { backgroundColor: ms.tint }]}>
                  <MemberSticker size={16} fill={ms.fill} />
                </View>
                <Text style={[s.memberName, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.body } : { color: colors.text, fontFamily: font.bodySemiBold }]}>
                  {m.name ?? t('channelInfo_memberFallback')}
                </Text>
                {m.user_id === channel.createdBy && (
                  <Crown size={14} color={brand.accent} strokeWidth={2} fill={brand.accent} />
                )}
              </View>
            )
          })}
          {members.length > 10 && (
            <Text style={[s.showMore, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 0.5 } : { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
              {t('channelInfo_moreMembers', { n: members.length - 10 })}
            </Text>
          )}
        </View>

        {/* Shared Media */}
        {sharedMedia.length > 0 && (
          <View style={s.section}>
            <Text style={[s.sectionTitle, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1.4 } : { color: colors.textMuted }]}>{t('channelInfo_sectionMedia')}</Text>
            <View style={s.mediaGrid}>
              {sharedMedia.map((uri, i) => (
                <Image key={i} source={{ uri }} style={[s.mediaThumb, { borderRadius: radius.sm }]} />
              ))}
            </View>
          </View>
        )}

        {/* Admin Section (owner only) */}
        {isOwner && (
          <View style={s.section}>
            <Text style={[s.sectionTitle, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1.4 } : { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
              <Shield size={12} color={diffuse ? dt.colors.ink3 : colors.textMuted} strokeWidth={2} /> {t('channelInfo_sectionAdmin')}
            </Text>

            {/* Channel Metrics Dashboard */}
            {metrics && (
              <View style={[s.metricsCard, diffuse
                ? { backgroundColor: dt.colors.surface, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line }
                : { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
                <View style={s.metricsHeader}>
                  <ChartBar size={16} color={diffuse ? dt.colors.ink3 : colors.primary} strokeWidth={diffuse ? 1.6 : 2} />
                  <Text style={[s.metricsTitle, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.display, fontSize: 18 } : { color: colors.text, fontFamily: font.bodyBold }]}>{t('channelInfo_metricsTitle')}</Text>
                </View>
                <View style={s.metricsGrid}>
                  <View style={[s.metricItem, diffuse ? { backgroundColor: 'transparent', borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line } : { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg }]}>
                    <Users size={16} color={diffuse ? dt.colors.ink3 : colors.primary} strokeWidth={diffuse ? 1.6 : 2} />
                    <Text style={[s.metricValue, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.display, fontWeight: '400' } : { color: colors.text, fontFamily: font.display }]}>{metrics.totalMembers}</Text>
                    <Text style={[s.metricLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono } : { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>{t('channelInfo_metricMembers')}</Text>
                  </View>
                  <View style={[s.metricItem, diffuse ? { backgroundColor: 'transparent', borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line } : { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg }]}>
                    <MessageSquare size={16} color={diffuse ? dt.colors.ink3 : colors.secondary} strokeWidth={diffuse ? 1.6 : 2} />
                    <Text style={[s.metricValue, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.display, fontWeight: '400' } : { color: colors.text, fontFamily: font.display }]}>{metrics.totalMessages}</Text>
                    <Text style={[s.metricLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono } : { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>{t('channelInfo_metricMessages')}</Text>
                  </View>
                  <View style={[s.metricItem, diffuse ? { backgroundColor: 'transparent', borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line } : { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg }]}>
                    <ImageIcon size={16} color={diffuse ? dt.colors.ink3 : colors.primary} strokeWidth={diffuse ? 1.6 : 2} />
                    <Text style={[s.metricValue, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.display, fontWeight: '400' } : { color: colors.text, fontFamily: font.display }]}>{metrics.totalMedia}</Text>
                    <Text style={[s.metricLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono } : { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>{t('channelInfo_metricMedia')}</Text>
                  </View>
                  <View style={[s.metricItem, diffuse ? { backgroundColor: 'transparent', borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line } : { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg }]}>
                    <Zap size={16} color={diffuse ? dt.colors.ink3 : colors.success} strokeWidth={diffuse ? 1.6 : 2} />
                    <Text style={[s.metricValue, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.display, fontWeight: '400' } : { color: colors.text, fontFamily: font.display }]}>{metrics.activeToday}</Text>
                    <Text style={[s.metricLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono } : { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>{t('channelInfo_metricActiveToday')}</Text>
                  </View>
                </View>
                <View style={[s.metricsFooter, { borderTopColor: diffuse ? dt.colors.line : colors.borderLight }]}>
                  <View style={s.metricsFooterItem}>
                    <Text style={[s.metricsFooterValue, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.display, fontWeight: '400' } : { color: colors.primary, fontFamily: font.display }]}>{metrics.messagesToday}</Text>
                    <Text style={[s.metricsFooterLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 0.5 } : { color: colors.textMuted, fontFamily: font.bodyMedium }]}>{t('channelInfo_msgsToday')}</Text>
                  </View>
                  <View style={[s.metricsFooterDivider, { backgroundColor: diffuse ? dt.colors.line : colors.borderLight }]} />
                  <View style={s.metricsFooterItem}>
                    <Text style={[s.metricsFooterValue, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.display, fontWeight: '400' } : { color: colors.primary, fontFamily: font.display }]}>{metrics.messagesThisWeek}</Text>
                    <Text style={[s.metricsFooterLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 0.5 } : { color: colors.textMuted, fontFamily: font.bodyMedium }]}>{t('channelInfo_thisWeek')}</Text>
                  </View>
                </View>
              </View>
            )}

            <Pressable
              onPress={() => setEditing(true)}
              style={[s.adminBtn, diffuse
                ? { backgroundColor: dt.colors.surface, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line }
                : { backgroundColor: colors.surface, borderRadius: radius.xl }]}
            >
              <Edit3 size={18} color={diffuse ? dt.colors.ink3 : colors.primary} strokeWidth={diffuse ? 1.6 : 2} />
              <Text style={[s.adminBtnText, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.body } : { color: colors.text, fontFamily: font.bodySemiBold }]}>{t('channelInfo_editInfo')}</Text>
            </Pressable>

            <Pressable
              onPress={handleTransferOwnership}
              style={[s.adminBtn, diffuse
                ? { backgroundColor: dt.colors.surface, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line }
                : { backgroundColor: colors.surface, borderRadius: radius.xl }]}
            >
              <ArrowRightLeft size={18} color={diffuse ? dt.colors.ink3 : colors.primary} strokeWidth={diffuse ? 1.6 : 2} />
              <Text style={[s.adminBtnText, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.body } : { color: colors.text, fontFamily: font.bodySemiBold }]}>{t('channelInfo_transferOwnership')}</Text>
            </Pressable>

            {/* Pending join requests (private channels) */}
            {pendingRequests.length > 0 && (
              <View style={[s.requestsSection, diffuse
                ? { backgroundColor: dt.colors.surface, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line }
                : { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
                <View style={s.requestsHeader}>
                  <UserPlus size={16} color={diffuse ? dt.colors.ink3 : colors.primary} strokeWidth={diffuse ? 1.6 : 2} />
                  <Text style={[s.requestsTitle, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.display, fontSize: 16 } : { color: colors.text, fontFamily: font.bodyBold }]}>
                    {t('channelInfo_pendingRequests')} ({pendingRequests.length})
                  </Text>
                </View>
                {pendingRequests.map((req) => {
                  const rs = channelSticker(req.user_id, isDark)
                  const ReqSticker = rs.Component
                  return (
                  <View key={req.id} style={[s.requestRow, { borderTopColor: diffuse ? dt.colors.line : colors.borderLight }]}>
                    <View style={[s.memberAvatar, diffuse
                      ? { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line2 }
                      : { backgroundColor: rs.tint }]}>
                      <ReqSticker size={16} fill={rs.fill} />
                    </View>
                    <Text style={[s.memberName, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.body } : { color: colors.text, fontFamily: font.bodySemiBold }]}>
                      {req.user_name ?? t('channelInfo_memberFallback')}
                    </Text>
                    <Pressable
                      onPress={() => handleApproveRequest(req)}
                      style={[s.requestActionBtn, diffuse
                        ? { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line2 }
                        : { backgroundColor: colors.successTint }]}
                    >
                      <Check size={16} color={diffuse ? dt.colors.ink : colors.success} strokeWidth={diffuse ? 1.6 : 2} />
                    </Pressable>
                    <Pressable
                      onPress={() => handleDenyRequest(req)}
                      style={[s.requestActionBtn, diffuse
                        ? { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line2 }
                        : { backgroundColor: stickers.coralInk + '22' }]}
                    >
                      <XCircle size={16} color={diffuse ? dt.colors.ink3 : stickers.coral} strokeWidth={diffuse ? 1.6 : 2} />
                    </Pressable>
                  </View>
                  )
                })}
              </View>
            )}

            <Pressable
              onPress={() => setShowMessages(!showMessages)}
              style={[s.adminBtn, diffuse
                ? { backgroundColor: dt.colors.surface, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line }
                : { backgroundColor: colors.surface, borderRadius: radius.xl }]}
            >
              <Settings size={18} color={diffuse ? dt.colors.ink3 : colors.primary} strokeWidth={diffuse ? 1.6 : 2} />
              <Text style={[s.adminBtnText, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.body } : { color: colors.text, fontFamily: font.bodySemiBold }]}>{t('channelInfo_manageMessages')} ({messages.length})</Text>
            </Pressable>

            {showMessages && messages.length > 0 && (
              <View style={[s.messagesList, diffuse
                ? { backgroundColor: dt.colors.surface, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line }
                : { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
                {messages.slice(0, 20).map((msg) => (
                  <View key={msg.id} style={[s.modMsgRow, { borderBottomColor: diffuse ? dt.colors.line : colors.borderLight }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.modMsgAuthor, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.bodySemiBold } : { color: colors.text, fontFamily: font.bodyBold }]}>{msg.author_name ?? t('channelInfo_memberFallback')}</Text>
                      <Text style={[s.modMsgContent, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.body } : { color: colors.textSecondary, fontFamily: font.body }]} numberOfLines={2}>{msg.content}</Text>
                    </View>
                    <Pressable onPress={() => handleDeleteMessage(msg.id)} hitSlop={8}>
                      <Trash2 size={16} color={diffuse ? dt.colors.ink3 : stickers.coral} strokeWidth={diffuse ? 1.6 : 2} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            <Pressable
              onPress={handleDeleteChannel}
              style={[s.adminBtn, diffuse
                ? { backgroundColor: 'transparent', borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line2 }
                : { backgroundColor: stickers.coralInk + '14', borderRadius: radius.xl }]}
            >
              <Trash2 size={18} color={diffuse ? dt.colors.error : stickers.coral} strokeWidth={diffuse ? 1.6 : 2} />
              <Text style={[s.adminBtnText, diffuse ? { color: dt.colors.error, fontFamily: diffuseFont.monoBold, letterSpacing: 1, textTransform: 'uppercase', fontSize: 13 } : { color: stickers.coral, fontFamily: font.bodyBold }]}>{t('channelInfo_deleteChannel')}</Text>
            </Pressable>
          </View>
        )}

        {/* Leave channel */}
        {isMember && !isOwner && (
          <Pressable
            onPress={handleLeave}
            style={[s.leaveBtn, diffuse
              ? { backgroundColor: 'transparent', borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line2 }
              : { backgroundColor: stickers.coralInk + '14', borderRadius: radius.xl }]}
          >
            <LogOut size={18} color={diffuse ? dt.colors.error : stickers.coral} strokeWidth={diffuse ? 1.6 : 2} />
            <Text style={[s.leaveBtnText, diffuse ? { color: dt.colors.error, fontFamily: diffuseFont.monoBold, letterSpacing: 1, textTransform: 'uppercase', fontSize: 13 } : { color: stickers.coral, fontFamily: font.bodyBold }]}>{t('channelInfo_leaveChannel')}</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Delete confirm sheet */}
      <DeleteChannelSheet
        visible={showDelete}
        channelName={channel?.name ?? t('channelInfo_thisChannel')}
        deleting={deleting}
        onCancel={() => setShowDelete(false)}
        onConfirm={confirmDeleteChannel}
      />
    </View>
  )
}

// ─── Delete channel confirm sheet ────────────────────────────────────────

function DeleteChannelSheet({
  visible,
  channelName,
  deleting,
  onCancel,
  onConfirm,
}: {
  visible: boolean
  channelName: string
  deleting: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const { colors, radius, font, stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={s.deleteOverlay} onPress={onCancel}>
        <Pressable
          style={[s.deleteSheet, diffuse
            ? { backgroundColor: dt.colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line }
            : { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[s.deleteHandle, { backgroundColor: diffuse ? dt.colors.line2 : colors.textMuted + '55' }]} />

          {diffuse ? (
            <DiffuseBloomIcon color={dt.colors.error} size={64} intensity={0.5}>
              <Trash2 size={26} color={dt.colors.error} strokeWidth={1.6} />
            </DiffuseBloomIcon>
          ) : (
            <View style={[s.deleteIcon, { backgroundColor: stickers.coralInk + '1A' }]}>
              <Trash2 size={26} color={stickers.coral} strokeWidth={2} />
            </View>
          )}
          <Text style={[s.deleteTitle, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.display } : { color: colors.text, fontFamily: font.display }]}>{t('channelInfo_deleteTitle')}</Text>
          <Text style={[s.deleteBody, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.body } : { color: colors.textSecondary, fontFamily: font.body }]}>
            {t('channelInfo_deleteBodyBefore')}
            <Text style={diffuse ? { fontFamily: diffuseFont.bodySemiBold, color: dt.colors.ink } : { fontFamily: font.bodyBold, color: colors.text }}>#{channelName}</Text>
            {t('channelInfo_deleteBodyAfter')}
          </Text>

          <Pressable
            onPress={onConfirm}
            disabled={deleting}
            style={({ pressed }) => [
              s.deleteConfirmBtn,
              diffuse
                ? { backgroundColor: 'transparent', borderRadius: 999, borderWidth: 1, borderColor: dt.colors.error }
                : { backgroundColor: brand.error, borderRadius: radius.full },
              pressed && { opacity: 0.85 },
              deleting && { opacity: 0.6 },
            ]}
          >
            {deleting ? (
              <ActivityIndicator color={diffuse ? dt.colors.error : '#FFFFFF'} size="small" />
            ) : (
              <Text style={[s.deleteConfirmText, diffuse ? { color: dt.colors.error, fontFamily: diffuseFont.monoBold, letterSpacing: 1.4, textTransform: 'uppercase' } : { fontFamily: font.bodyBold }]}>{t('channelInfo_deleteForever')}</Text>
            )}
          </Pressable>

          <Pressable onPress={onCancel} style={s.deleteCancel}>
            <Text style={[s.deleteCancelText, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1, textTransform: 'uppercase' } : { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>{t('channelInfo_keepChannel')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerBtn: { width: 40, alignItems: 'center' },
  headerTitle: { fontSize: 20, letterSpacing: -0.3 },

  scroll: { paddingBottom: 60 },

  // Channel header
  channelHeader: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20, gap: 10 },
  channelIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  channelName: { fontSize: 28, letterSpacing: -0.5, textAlign: 'center' },
  channelDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  channelCategory: { fontSize: 12, textTransform: 'capitalize' },

  // Edit
  editSection: { width: '100%', gap: 12 },
  editInput: { borderWidth: 1, paddingHorizontal: 16, height: 48, fontSize: 15, fontWeight: '600' },
  editTextArea: { borderWidth: 1, padding: 16, fontSize: 14, fontWeight: '500', minHeight: 80, textAlignVertical: 'top' },
  editActions: { flexDirection: 'row', gap: 12 },
  editCancelBtn: { flex: 1, flexDirection: 'row', height: 44, alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1 },
  editCancelText: { fontSize: 14, fontWeight: '600' },
  editSaveBtn: { flex: 1, flexDirection: 'row', height: 44, alignItems: 'center', justifyContent: 'center', gap: 6 },
  editSaveText: { fontSize: 14, fontWeight: '800' },

  // Stats
  statsRow: { flexDirection: 'row', marginHorizontal: 20, padding: 16 },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statNumber: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '600' },
  statDivider: { width: 1, height: '80%', alignSelf: 'center' },

  // Sections
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },

  // Owner card
  ownerCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  ownerAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  ownerCrownBadge: { position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  ownerName: { fontSize: 15, fontWeight: '700' },
  ownerMeta: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  ownerBadge: { paddingVertical: 3, paddingHorizontal: 10 },
  ownerBadgeText: { fontSize: 11, fontWeight: '700' },

  // Members
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  memberAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  memberName: { flex: 1, fontSize: 14, fontWeight: '600' },
  showMore: { fontSize: 13, fontWeight: '600', marginTop: 8 },

  // Media
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  mediaThumb: { width: MEDIA_THUMB, height: MEDIA_THUMB, resizeMode: 'cover' },

  // Admin
  adminBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, marginBottom: 8 },
  adminBtnText: { fontSize: 15, fontWeight: '600' },
  messagesList: { padding: 12, marginBottom: 8 },
  modMsgRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  modMsgAuthor: { fontSize: 13, fontWeight: '700' },
  modMsgContent: { fontSize: 12, fontWeight: '400', marginTop: 2 },

  // Leave
  leaveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 20, marginTop: 32, paddingVertical: 16 },
  leaveBtnText: { fontSize: 15, fontWeight: '700' },

  // Metrics
  metricsCard: { padding: 16, marginBottom: 12, gap: 12 },
  metricsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metricsTitle: { fontSize: 15, fontWeight: '700' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricItem: { width: '47%' as any, padding: 14, alignItems: 'center', gap: 6 },
  metricValue: { fontSize: 22, fontWeight: '800' },
  metricLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  metricsFooter: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 12 },
  metricsFooterItem: { flex: 1, alignItems: 'center', gap: 2 },
  metricsFooterValue: { fontSize: 18, fontWeight: '800' },
  metricsFooterLabel: { fontSize: 11, fontWeight: '500' },
  metricsFooterDivider: { width: 1, height: '100%' },

  // Share
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  shareBtnText: { fontSize: 15, fontWeight: '700' },
  shareBtnSub: { fontSize: 11, fontWeight: '500', marginTop: 2 },

  // Pending requests
  requestsSection: { padding: 16, marginBottom: 8 },
  requestsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  requestsTitle: { fontSize: 14, fontWeight: '700' },
  requestRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10, borderTopWidth: 1 },
  requestActionBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  // Delete confirm sheet
  deleteOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  deleteSheet: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 34, alignItems: 'center' },
  deleteHandle: { width: 44, height: 4, borderRadius: 2, marginBottom: 14 },
  deleteIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  deleteTitle: { fontSize: 22, fontFamily: font.display, letterSpacing: -0.4, textAlign: 'center' },
  deleteBody: { fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 20, marginTop: 8, marginBottom: 20, paddingHorizontal: 8 },
  deleteConfirmBtn: { width: '100%', paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  deleteConfirmText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  deleteCancel: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  deleteCancelText: { fontSize: 14, fontWeight: '600' },
})
