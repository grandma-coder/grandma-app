/**
 * Leaderboard Screen — full community rankings with role tabs.
 *
 * Tabs: All | Moms | Caregivers | Partners
 * Tap user → profile popup modal
 */

import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  RefreshControl,
  Image,
} from 'react-native'
import { router } from 'expo-router'
import {
  ArrowLeft,
  Crown,
  Medal,
  User,
  X,
  Trophy,
  MessageCircle,
  Heart,
  Calendar,
  Flame,
  Hash,
  Info,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../constants/theme'
import { supabase } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeaderEntry {
  user_id: string
  name: string
  photo_url: string | null
  user_role: string
  caregiver_role: string | null
  garage_posts: number
  garage_likes: number
  channel_posts: number
  channel_reactions: number
  channels_joined: number
  child_logs: number
  total_points: number
  rank: number
}

type TabKey = 'all' | 'moms' | 'caregivers' | 'partners'

const TABS: { key: TabKey; label: string; color: string }[] = [
  { key: 'all', label: 'All', color: '#FFD700' },
  { key: 'moms', label: 'Moms', color: '#FF8AD8' },
  { key: 'caregivers', label: 'Caregivers', color: '#4D96FF' },
  { key: 'partners', label: 'Partners', color: '#B983FF' },
]

// ─── Data Fetching ────────────────────────────────────────────────────────────

async function fetchFullLeaderboard(): Promise<LeaderEntry[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  // Get all profiles with roles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, photo_url, user_role')
    .not('name', 'is', null)

  if (!profiles || profiles.length === 0) return []

  // Get caregiver roles
  const { data: caregiverLinks } = await supabase
    .from('child_caregivers')
    .select('user_id, role')
    .eq('status', 'accepted')

  const caregiverRoleMap = new Map<string, string>()
  for (const link of caregiverLinks ?? []) {
    // Keep the most specific role
    if (!caregiverRoleMap.has(link.user_id) || link.role !== 'parent') {
      caregiverRoleMap.set(link.user_id, link.role)
    }
  }

  // Get garage stats
  const { data: garagePosts } = await supabase
    .from('garage_posts')
    .select('author_id, like_count, comment_count')

  const garageByUser = new Map<string, { posts: number; likes: number }>()
  for (const p of garagePosts ?? []) {
    const cur = garageByUser.get(p.author_id) || { posts: 0, likes: 0 }
    cur.posts++
    cur.likes += p.like_count || 0
    garageByUser.set(p.author_id, cur)
  }

  // Get channel stats
  const { data: channelPosts } = await supabase
    .from('channel_posts')
    .select('author_id, reaction_count, reply_count')
    .is('reply_to_id', null) // only top-level

  const channelByUser = new Map<string, { posts: number; reactions: number }>()
  for (const p of channelPosts ?? []) {
    const cur = channelByUser.get(p.author_id) || { posts: 0, reactions: 0 }
    cur.posts++
    cur.reactions += p.reaction_count || 0
    channelByUser.set(p.author_id, cur)
  }

  // Get channel membership counts
  const { data: memberships } = await supabase
    .from('channel_members')
    .select('user_id')

  const membershipCount = new Map<string, number>()
  for (const m of memberships ?? []) {
    membershipCount.set(m.user_id, (membershipCount.get(m.user_id) || 0) + 1)
  }

  // Get child log counts (last 90 days)
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const { data: logs } = await supabase
    .from('child_logs')
    .select('user_id')
    .gte('date', ninetyDaysAgo.toISOString().split('T')[0])

  const logCount = new Map<string, number>()
  for (const l of logs ?? []) {
    logCount.set(l.user_id, (logCount.get(l.user_id) || 0) + 1)
  }

  // Build entries
  const entries: LeaderEntry[] = profiles.map((p: any) => {
    const garage = garageByUser.get(p.id) || { posts: 0, likes: 0 }
    const channel = channelByUser.get(p.id) || { posts: 0, reactions: 0 }
    const cj = membershipCount.get(p.id) || 0
    const cl = logCount.get(p.id) || 0

    const points =
      garage.posts * 5 +
      garage.likes * 1 +
      channel.posts * 3 +
      channel.reactions * 1 +
      cj * 2 +
      cl * 1

    return {
      user_id: p.id,
      name: p.name || 'Anonymous',
      photo_url: p.photo_url,
      user_role: p.user_role || 'parent',
      caregiver_role: caregiverRoleMap.get(p.id) || null,
      garage_posts: garage.posts,
      garage_likes: garage.likes,
      channel_posts: channel.posts,
      channel_reactions: channel.reactions,
      channels_joined: cj,
      child_logs: cl,
      total_points: points,
      rank: 0,
    }
  })

  // Sort and assign ranks
  entries.sort((a, b) => b.total_points - a.total_points)
  entries.forEach((e, i) => { e.rank = i + 1 })

  return entries
}

function filterByTab(entries: LeaderEntry[], tab: TabKey): LeaderEntry[] {
  if (tab === 'all') return entries
  if (tab === 'moms') return entries.filter((e) => e.user_role === 'parent' && e.caregiver_role === 'parent')
  if (tab === 'caregivers') return entries.filter((e) => e.caregiver_role === 'nanny' || e.caregiver_role === 'family')
  if (tab === 'partners') return entries.filter((e) => e.user_role === 'partner' || e.caregiver_role === 'family')
  return entries
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function LeaderboardScreen() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()

  const [entries, setEntries] = useState<LeaderEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [selectedUser, setSelectedUser] = useState<LeaderEntry | null>(null)
  const [myUserId, setMyUserId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const data = await fetchFullLeaderboard()
    setEntries(data)
  }, [])

  useEffect(() => {
    load().finally(() => setLoading(false))
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setMyUserId(session.user.id)
    })
  }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  const filtered = filterByTab(entries, activeTab)
  // Re-rank within the filtered set
  const ranked = filtered.map((e, i) => ({ ...e, rank: i + 1 }))

  const myEntry = entries.find((e) => e.user_id === myUserId)

  const renderItem = useCallback(({ item, index }: { item: LeaderEntry; index: number }) => {
    const isMe = item.user_id === myUserId
    const rankColor = index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : colors.textMuted
    const tabColor = TABS.find((t) => t.key === activeTab)?.color || '#FFD700'

    return (
      <Pressable
        onPress={() => setSelectedUser(item)}
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: isMe ? brand.primary + '10' : colors.surface,
            borderColor: isMe ? brand.primary + '25' : colors.border,
            borderRadius: radius.xl,
          },
          pressed && { opacity: 0.85 },
        ]}
      >
        {/* Rank */}
        <View style={styles.rankWrap}>
          {index < 3 ? (
            <View style={[styles.rankMedal, { backgroundColor: rankColor + '20' }]}>
              {index === 0 ? <Crown size={16} color={rankColor} strokeWidth={2.5} /> :
               <Medal size={16} color={rankColor} strokeWidth={2} />}
            </View>
          ) : (
            <Text style={[styles.rankNum, { color: colors.textMuted }]}>#{item.rank}</Text>
          )}
        </View>

        {/* Avatar */}
        {item.photo_url ? (
          <Image source={{ uri: item.photo_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: isMe ? brand.primary + '20' : colors.surfaceRaised }]}>
            <User size={16} color={isMe ? brand.primary : colors.textMuted} strokeWidth={2} />
          </View>
        )}

        {/* Info */}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: isMe ? brand.primary : colors.text }]} numberOfLines={1}>
              {isMe ? `${item.name} (You)` : item.name}
            </Text>
          </View>
          <View style={styles.statsRow}>
            {item.child_logs > 0 && (
              <View style={styles.statChip}>
                <Calendar size={10} color={colors.textMuted} />
                <Text style={[styles.statText, { color: colors.textMuted }]}>{item.child_logs}</Text>
              </View>
            )}
            {item.garage_posts + item.channel_posts > 0 && (
              <View style={styles.statChip}>
                <MessageCircle size={10} color={colors.textMuted} />
                <Text style={[styles.statText, { color: colors.textMuted }]}>{item.garage_posts + item.channel_posts}</Text>
              </View>
            )}
            {item.garage_likes + item.channel_reactions > 0 && (
              <View style={styles.statChip}>
                <Heart size={10} color={colors.textMuted} />
                <Text style={[styles.statText, { color: colors.textMuted }]}>{item.garage_likes + item.channel_reactions}</Text>
              </View>
            )}
            {item.channels_joined > 0 && (
              <View style={styles.statChip}>
                <Hash size={10} color={colors.textMuted} />
                <Text style={[styles.statText, { color: colors.textMuted }]}>{item.channels_joined}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Points */}
        <View style={styles.ptsWrap}>
          <Text style={[styles.ptsValue, { color: index < 3 ? rankColor : tabColor }]}>{item.total_points}</Text>
          <Text style={[styles.ptsLabel, { color: colors.textMuted }]}>pts</Text>
        </View>
      </Pressable>
    )
  }, [myUserId, colors, radius, activeTab])

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <ArrowLeft size={24} color={colors.text} />
          </Pressable>
          <Crown size={22} color="#FFD700" strokeWidth={2} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Leaderboard</Text>
        </View>
        {myEntry && (
          <View style={[styles.myRankPill, { backgroundColor: '#FFD700' + '15' }]}>
            <Text style={[styles.myRankText, { color: '#FFD700' }]}>#{myEntry.rank}</Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key
          const count = filterByTab(entries, tab.key).length
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[
                styles.tab,
                isActive && { borderBottomWidth: 2, borderBottomColor: tab.color },
              ]}
            >
              <Text style={[styles.tabText, { color: isActive ? tab.color : colors.textMuted }]}>
                {tab.label}
              </Text>
              <Text style={[styles.tabCount, { color: isActive ? tab.color : colors.textMuted }]}>
                {count}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* Top 3 Podium */}
      {ranked.length >= 3 && (
        <View style={styles.podium}>
          {[1, 0, 2].map((idx) => {
            const entry = ranked[idx]
            if (!entry) return null
            const isCenter = idx === 0
            const podiumColor = idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : '#CD7F32'
            return (
              <Pressable
                key={entry.user_id}
                onPress={() => setSelectedUser(entry)}
                style={[styles.podiumItem, isCenter && styles.podiumCenter]}
              >
                <View style={[styles.podiumAvatar, { borderColor: podiumColor, width: isCenter ? 56 : 44, height: isCenter ? 56 : 44, borderRadius: isCenter ? 28 : 22 }]}>
                  {entry.photo_url ? (
                    <Image source={{ uri: entry.photo_url }} style={{ width: '100%', height: '100%', borderRadius: isCenter ? 28 : 22 }} />
                  ) : (
                    <User size={isCenter ? 22 : 18} color={podiumColor} strokeWidth={2} />
                  )}
                </View>
                <View style={[styles.podiumRank, { backgroundColor: podiumColor }]}>
                  <Text style={styles.podiumRankText}>{entry.rank}</Text>
                </View>
                <Text style={[styles.podiumName, { color: colors.text }]} numberOfLines={1}>
                  {entry.user_id === myUserId ? 'You' : entry.name.split(' ')[0]}
                </Text>
                <Text style={[styles.podiumPts, { color: podiumColor }]}>{entry.total_points} pts</Text>
              </Pressable>
            )
          })}
        </View>
      )}

      {/* List (from #4 onward, or all if <3) */}
      <FlatList
        data={ranked.length >= 3 ? ranked.slice(3) : ranked}
        keyExtractor={(item) => item.user_id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 20, gap: 8 }}
        ListEmptyComponent={() => (
          <View style={styles.emptyWrap}>
            <Trophy size={32} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No one here yet. Be the first!</Text>
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      />

      {/* User Profile Popup */}
      <Modal visible={!!selectedUser} transparent animationType="fade" onRequestClose={() => setSelectedUser(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedUser(null)}>
          <View style={[styles.profileModal, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            {selectedUser && (
              <>
                <Pressable onPress={() => setSelectedUser(null)} style={styles.profileClose} hitSlop={12}>
                  <X size={20} color={colors.textMuted} />
                </Pressable>

                {/* Avatar */}
                <View style={styles.profileAvatarWrap}>
                  {selectedUser.photo_url ? (
                    <Image source={{ uri: selectedUser.photo_url }} style={styles.profileAvatar} />
                  ) : (
                    <View style={[styles.profileAvatar, { backgroundColor: colors.surfaceRaised }]}>
                      <User size={32} color={colors.textMuted} strokeWidth={1.5} />
                    </View>
                  )}
                  <View style={[styles.profileRankBadge, { backgroundColor: selectedUser.rank <= 3 ? (selectedUser.rank === 1 ? '#FFD700' : selectedUser.rank === 2 ? '#C0C0C0' : '#CD7F32') : brand.primary }]}>
                    <Text style={styles.profileRankText}>#{selectedUser.rank}</Text>
                  </View>
                </View>

                {/* Name & Role */}
                <Text style={[styles.profileName, { color: colors.text }]}>{selectedUser.name}</Text>
                <Text style={[styles.profileRole, { color: colors.textMuted }]}>
                  {selectedUser.caregiver_role === 'nanny' ? 'Caregiver' :
                   selectedUser.caregiver_role === 'family' ? 'Family Member' :
                   'Parent'}
                </Text>

                {/* Points */}
                <View style={[styles.profilePointsPill, { backgroundColor: '#FFD700' + '15' }]}>
                  <Trophy size={16} color="#FFD700" strokeWidth={2} />
                  <Text style={[styles.profilePointsText, { color: '#FFD700' }]}>{selectedUser.total_points} points</Text>
                </View>

                {/* Stats Grid */}
                <View style={styles.profileStatsGrid}>
                  <ProfileStat label="Child Logs" value={selectedUser.child_logs} icon={<Calendar size={14} color="#F59E0B" />} color="#F59E0B" />
                  <ProfileStat label="Posts" value={selectedUser.garage_posts + selectedUser.channel_posts} icon={<MessageCircle size={14} color="#4D96FF" />} color="#4D96FF" />
                  <ProfileStat label="Reactions" value={selectedUser.garage_likes + selectedUser.channel_reactions} icon={<Heart size={14} color="#FF8AD8" />} color="#FF8AD8" />
                  <ProfileStat label="Channels" value={selectedUser.channels_joined} icon={<Hash size={14} color="#B983FF" />} color="#B983FF" />
                </View>
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ProfileStat({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  const { colors, radius } = useTheme()
  return (
    <View style={[styles.profileStat, { backgroundColor: color + '10', borderRadius: radius.lg }]}>
      {icon}
      <Text style={[styles.profileStatValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.profileStatLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  myRankPill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  myRankText: { fontSize: 14, fontWeight: '900' },

  // Tabs
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 2 },
  tabText: { fontSize: 13, fontWeight: '700' },
  tabCount: { fontSize: 11, fontWeight: '600' },

  // Podium
  podium: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', paddingVertical: 20, paddingHorizontal: 16, gap: 12 },
  podiumItem: { alignItems: 'center', gap: 6, width: 80 },
  podiumCenter: { marginBottom: 12 },
  podiumAvatar: { borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  podiumRank: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: -12 },
  podiumRankText: { fontSize: 11, fontWeight: '900', color: '#FFFFFF' },
  podiumName: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  podiumPts: { fontSize: 12, fontWeight: '800' },

  // List row
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10, borderWidth: 1 },
  rankWrap: { width: 32, alignItems: 'center' },
  rankMedal: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rankNum: { fontSize: 14, fontWeight: '800' },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  info: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 15, fontWeight: '700', flex: 1 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statText: { fontSize: 11, fontWeight: '600' },
  ptsWrap: { alignItems: 'center', gap: 1 },
  ptsValue: { fontSize: 18, fontWeight: '900' },
  ptsLabel: { fontSize: 10, fontWeight: '600' },

  // Empty
  emptyWrap: { alignItems: 'center', gap: 10, paddingVertical: 40 },
  emptyText: { fontSize: 15, fontWeight: '600' },

  // Modal overlay
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },

  // Profile modal
  profileModal: { width: '100%', padding: 24, alignItems: 'center', gap: 12 },
  profileClose: { position: 'absolute', top: 16, right: 16 },
  profileAvatarWrap: { alignItems: 'center', marginTop: 8 },
  profileAvatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  profileRankBadge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: -14 },
  profileRankText: { fontSize: 11, fontWeight: '900', color: '#FFFFFF' },
  profileName: { fontSize: 20, fontWeight: '900', marginTop: 4 },
  profileRole: { fontSize: 14, fontWeight: '600', textTransform: 'capitalize' },
  profilePointsPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, marginTop: 4 },
  profilePointsText: { fontSize: 16, fontWeight: '800' },
  profileStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, width: '100%' },
  profileStat: { width: '47%', padding: 12, alignItems: 'center', gap: 4 },
  profileStatValue: { fontSize: 20, fontWeight: '900' },
  profileStatLabel: { fontSize: 11, fontWeight: '600' },
})
