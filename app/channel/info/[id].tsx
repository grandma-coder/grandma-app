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
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import {
  ArrowLeft,
  Hash,
  Users,
  Star,
  Crown,
  User,
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
  XCircle,
  Share2,
  Copy,
  Link,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../../constants/theme'
import { getChannels, type Channel } from '../../../lib/channels'
import {
  isChannelMember,
  joinChannel,
  leaveChannel,
  deleteMessage,
  getPendingRequests,
  approveRequest,
  denyRequest,
  type ChannelPost,
  type ChannelRequest,
} from '../../../lib/channelPosts'
import { supabase } from '../../../lib/supabase'

const SCREEN_W = Dimensions.get('window').width
const MEDIA_THUMB = (SCREEN_W - 48 - 8) / 4 // 4 columns

export default function ChannelInfoScreen() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()

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
          .from('profiles')
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

      // Messages for moderation + pending requests (owner only)
      if (userId === ch?.createdBy) {
        const { data: msgs } = await supabase
          .from('channel_posts')
          .select('*')
          .eq('channel_id', id)
          .order('created_at', { ascending: false })
          .limit(50)
        setMessages((msgs ?? []) as ChannelPost[])

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
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteChannel() {
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
  }

  async function handleDeleteMessage(msgId: string) {
    Alert.alert('Delete Message', 'Remove this message?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteMessage(msgId)
            setMessages((prev) => prev.filter((m) => m.id !== msgId))
          } catch {}
        },
      },
    ])
  }

  function handleLeave() {
    if (!id) return
    Alert.alert(
      'Leave Channel',
      `Are you sure you want to leave #${channel?.name ?? 'this channel'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveChannel(id)
              router.back()
            } catch {
              Alert.alert('Error', 'Failed to leave channel')
            }
          },
        },
      ]
    )
  }

  async function handleApproveRequest(req: ChannelRequest) {
    try {
      await approveRequest(req.id, req.channel_id, req.user_id)
      setPendingRequests((prev) => prev.filter((r) => r.id !== req.id))
      load()
      Alert.alert('Approved', `${req.user_name ?? 'User'} has been added to the channel.`)
    } catch (e: any) {
      Alert.alert('Error', e.message)
    }
  }

  async function handleDenyRequest(req: ChannelRequest) {
    Alert.alert(
      'Deny Request',
      `Deny ${req.user_name ?? 'this user'}'s request to join?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deny',
          style: 'destructive',
          onPress: async () => {
            try {
              await denyRequest(req.id)
              setPendingRequests((prev) => prev.filter((r) => r.id !== req.id))
            } catch (e: any) {
              Alert.alert('Error', e.message)
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
      Alert.alert('Private Channel', 'Only members can share this channel.')
      return
    }

    const channelUrl = `grandma-app://channel/${id}`
    const desc = channel.description ? `\n${channel.description}` : ''
    const privacy = channel.channelType === 'private' ? ' (Private)' : ''
    const shareMessage = `Join #${channel.name}${privacy} on grandma.app!${desc}\n\n${channelUrl}`

    Alert.alert('Share Channel', '', [
      {
        text: 'Copy Link',
        onPress: () => {
          import('expo-clipboard').then(({ setStringAsync }) => {
            setStringAsync(channelUrl)
            Alert.alert('Copied!', 'Channel link copied to clipboard.')
          })
        },
      },
      {
        text: 'Share...',
        onPress: () => {
          Share.share({
            message: shareMessage,
            title: `#${channel.name}`,
          })
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  if (!channel) {
    return (
      <View style={[s.center, { backgroundColor: colors.bg }]}>
        <Text style={{ color: colors.textMuted }}>Channel not found</Text>
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
        <Text style={[s.headerTitle, { color: colors.text }]}>Channel Info</Text>
        <View style={s.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Channel icon + name */}
        <View style={s.channelHeader}>
          <View style={[s.channelIcon, { backgroundColor: colors.primaryTint }]}>
            <Hash size={36} color={colors.primary} strokeWidth={2} />
          </View>

          {editing ? (
            <View style={s.editSection}>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                style={[s.editInput, { color: colors.text, borderColor: colors.border, borderRadius: radius.lg }]}
                placeholder="Channel name"
                placeholderTextColor={colors.textMuted}
              />
              <TextInput
                value={editDesc}
                onChangeText={setEditDesc}
                style={[s.editTextArea, { color: colors.text, borderColor: colors.border, borderRadius: radius.lg }]}
                placeholder="Description"
                placeholderTextColor={colors.textMuted}
                multiline
              />
              <View style={s.editActions}>
                <Pressable onPress={() => setEditing(false)} style={[s.editCancelBtn, { borderColor: colors.border, borderRadius: radius.lg }]}>
                  <X size={16} color={colors.textSecondary} />
                  <Text style={[s.editCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                </Pressable>
                <Pressable onPress={handleSaveEdit} disabled={saving} style={[s.editSaveBtn, { backgroundColor: colors.primary, borderRadius: radius.lg }]}>
                  {saving ? <ActivityIndicator color="#FFF" size="small" /> : (
                    <>
                      <Check size={16} color="#FFF" />
                      <Text style={s.editSaveText}>Save</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <Text style={[s.channelName, { color: colors.text }]}>{channel.name}</Text>
              {channel.description && (
                <Text style={[s.channelDesc, { color: colors.textSecondary }]}>{channel.description}</Text>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {channel.channelType === 'private' && (
                  <Lock size={12} color={colors.textMuted} strokeWidth={2} />
                )}
                <Text style={[s.channelCategory, { color: colors.textMuted }]}>
                  {channel.channelType === 'private' ? 'Private' : channel.category} channel
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Stats row */}
        <View style={[s.statsRow, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
          <View style={s.stat}>
            <Users size={18} color={colors.primary} strokeWidth={2} />
            <Text style={[s.statNumber, { color: colors.text }]}>{channel.memberCount}</Text>
            <Text style={[s.statLabel, { color: colors.textMuted }]}>Members</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: colors.borderLight }]} />
          <View style={s.stat}>
            <Star size={18} color={brand.accent} strokeWidth={2} fill={channel.avgRating > 0 ? brand.accent : 'none'} />
            <Text style={[s.statNumber, { color: colors.text }]}>{channel.avgRating > 0 ? channel.avgRating.toFixed(1) : '—'}</Text>
            <Text style={[s.statLabel, { color: colors.textMuted }]}>Rating</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: colors.borderLight }]} />
          <View style={s.stat}>
            <ImageIcon size={18} color={colors.primary} strokeWidth={2} />
            <Text style={[s.statNumber, { color: colors.text }]}>{sharedMedia.length}</Text>
            <Text style={[s.statLabel, { color: colors.textMuted }]}>Media</Text>
          </View>
        </View>

        {/* Share Channel — public: always, private: members only */}
        {(channel.channelType !== 'private' || isMember) && (
          <View style={s.section}>
            <Pressable
              onPress={handleShareChannel}
              style={[s.shareBtn, { backgroundColor: colors.primaryTint, borderRadius: radius.xl }]}
            >
              <Share2 size={18} color={colors.primary} strokeWidth={2} />
              <View style={{ flex: 1 }}>
                <Text style={[s.shareBtnText, { color: colors.primary }]}>Share Channel</Text>
                <Text style={[s.shareBtnSub, { color: colors.textMuted }]}>
                  {channel.channelType === 'private'
                    ? 'Invite link — only members can share'
                    : 'Send invite link via text, WhatsApp, etc.'}
                </Text>
              </View>
            </Pressable>
          </View>
        )}

        {/* Owner / Creator */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.textMuted }]}>CREATED BY</Text>
          <View style={[s.ownerCard, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            <View style={[s.ownerAvatar, { backgroundColor: colors.surfaceRaised }]}>
              <Crown size={18} color={brand.accent} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.ownerName, { color: colors.text }]}>
                {ownerName ?? 'Channel Creator'}
              </Text>
              <Text style={[s.ownerMeta, { color: colors.textMuted }]}>
                Created {new Date(channel.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
            </View>
            {isOwner && (
              <View style={[s.ownerBadge, { backgroundColor: brand.accent + '20', borderRadius: radius.full }]}>
                <Text style={[s.ownerBadgeText, { color: brand.accent }]}>You</Text>
              </View>
            )}
          </View>
        </View>

        {/* Members */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.textMuted }]}>
            MEMBERS ({members.length})
          </Text>
          {members.slice(0, 10).map((m) => (
            <View key={m.user_id} style={[s.memberRow, { borderBottomColor: colors.borderLight }]}>
              <View style={[s.memberAvatar, { backgroundColor: colors.surfaceRaised }]}>
                <User size={14} color={colors.textMuted} strokeWidth={1.5} />
              </View>
              <Text style={[s.memberName, { color: colors.text }]}>
                {m.name ?? 'Community Member'}
              </Text>
              {m.user_id === channel.createdBy && (
                <Crown size={14} color={brand.accent} strokeWidth={2} />
              )}
            </View>
          ))}
          {members.length > 10 && (
            <Text style={[s.showMore, { color: colors.primary }]}>
              +{members.length - 10} more members
            </Text>
          )}
        </View>

        {/* Shared Media */}
        {sharedMedia.length > 0 && (
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: colors.textMuted }]}>SHARED MEDIA</Text>
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
            <Text style={[s.sectionTitle, { color: colors.textMuted }]}>
              <Shield size={12} color={colors.textMuted} strokeWidth={2} /> ADMIN
            </Text>

            <Pressable
              onPress={() => setEditing(true)}
              style={[s.adminBtn, { backgroundColor: colors.surface, borderRadius: radius.xl }]}
            >
              <Edit3 size={18} color={colors.primary} strokeWidth={2} />
              <Text style={[s.adminBtnText, { color: colors.text }]}>Edit Channel Info</Text>
            </Pressable>

            {/* Pending join requests (private channels) */}
            {pendingRequests.length > 0 && (
              <View style={[s.requestsSection, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
                <View style={s.requestsHeader}>
                  <UserPlus size={16} color={brand.accent} strokeWidth={2} />
                  <Text style={[s.requestsTitle, { color: colors.text }]}>
                    Pending Requests ({pendingRequests.length})
                  </Text>
                </View>
                {pendingRequests.map((req) => (
                  <View key={req.id} style={[s.requestRow, { borderTopColor: colors.borderLight }]}>
                    <View style={[s.memberAvatar, { backgroundColor: colors.surfaceRaised }]}>
                      <User size={14} color={colors.textMuted} strokeWidth={1.5} />
                    </View>
                    <Text style={[s.memberName, { color: colors.text }]}>
                      {req.user_name ?? 'Community Member'}
                    </Text>
                    <Pressable
                      onPress={() => handleApproveRequest(req)}
                      style={[s.requestActionBtn, { backgroundColor: brand.success + '20' }]}
                    >
                      <Check size={16} color={brand.success} strokeWidth={2} />
                    </Pressable>
                    <Pressable
                      onPress={() => handleDenyRequest(req)}
                      style={[s.requestActionBtn, { backgroundColor: brand.error + '20' }]}
                    >
                      <XCircle size={16} color={brand.error} strokeWidth={2} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            <Pressable
              onPress={() => setShowMessages(!showMessages)}
              style={[s.adminBtn, { backgroundColor: colors.surface, borderRadius: radius.xl }]}
            >
              <Settings size={18} color={colors.primary} strokeWidth={2} />
              <Text style={[s.adminBtnText, { color: colors.text }]}>Manage Messages ({messages.length})</Text>
            </Pressable>

            {showMessages && messages.length > 0 && (
              <View style={[s.messagesList, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
                {messages.slice(0, 20).map((msg) => (
                  <View key={msg.id} style={[s.modMsgRow, { borderBottomColor: colors.borderLight }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.modMsgAuthor, { color: colors.text }]}>{msg.author_name ?? 'Member'}</Text>
                      <Text style={[s.modMsgContent, { color: colors.textSecondary }]} numberOfLines={2}>{msg.content}</Text>
                    </View>
                    <Pressable onPress={() => handleDeleteMessage(msg.id)} hitSlop={8}>
                      <Trash2 size={16} color={brand.error} strokeWidth={2} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            <Pressable
              onPress={handleDeleteChannel}
              style={[s.adminBtn, { backgroundColor: brand.error + '10', borderRadius: radius.xl }]}
            >
              <Trash2 size={18} color={brand.error} strokeWidth={2} />
              <Text style={[s.adminBtnText, { color: brand.error }]}>Delete Channel</Text>
            </Pressable>
          </View>
        )}

        {/* Leave channel */}
        {isMember && !isOwner && (
          <Pressable
            onPress={handleLeave}
            style={[s.leaveBtn, { backgroundColor: brand.error + '10', borderRadius: radius.xl }]}
          >
            <LogOut size={18} color={brand.error} strokeWidth={2} />
            <Text style={[s.leaveBtnText, { color: brand.error }]}>Leave Channel</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerBtn: { width: 40, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },

  scroll: { paddingBottom: 60 },

  // Channel header
  channelHeader: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20, gap: 10 },
  channelIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  channelName: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  channelDesc: { fontSize: 14, fontWeight: '400', textAlign: 'center', lineHeight: 20 },
  channelCategory: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },

  // Edit
  editSection: { width: '100%', gap: 12 },
  editInput: { borderWidth: 1, paddingHorizontal: 16, height: 48, fontSize: 15, fontWeight: '600' },
  editTextArea: { borderWidth: 1, padding: 16, fontSize: 14, fontWeight: '500', minHeight: 80, textAlignVertical: 'top' },
  editActions: { flexDirection: 'row', gap: 12 },
  editCancelBtn: { flex: 1, flexDirection: 'row', height: 44, alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1 },
  editCancelText: { fontSize: 14, fontWeight: '600' },
  editSaveBtn: { flex: 1, flexDirection: 'row', height: 44, alignItems: 'center', justifyContent: 'center', gap: 6 },
  editSaveText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

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
})
