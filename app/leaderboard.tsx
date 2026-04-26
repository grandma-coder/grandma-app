/**
 * Leaderboard — cream-paper sticker-collage redesign.
 *
 * Tabs: All | Moms | Caregivers | Partners
 * Top 3 podium + ranked list + pinned "you" row.
 * Tap a row → paper profile sheet with sticker accents.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  Modal,
  RefreshControl,
  Image,
  ScrollView,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  User,
  X,
  MessageCircle,
  Heart,
  Calendar,
  Hash,
} from 'lucide-react-native'
import { useTheme } from '../constants/theme'
import { supabase } from '../lib/supabase'
import { AvatarView, isIconAvatar } from '../components/ui/AvatarPicker'
import { BrandedLoader } from '../components/ui/BrandedLoader'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { Display, MonoCaps, Body } from '../components/ui/Typography'
import {
  Star as StarSticker,
  Burst as BurstSticker,
  Heart as HeartSticker,
  Flower as FlowerSticker,
  Moon as MoonSticker,
} from '../components/ui/Stickers'

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

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'moms', label: 'Moms' },
  { key: 'caregivers', label: 'Caregivers' },
  { key: 'partners', label: 'Partners' },
]

// ─── Data Fetching ────────────────────────────────────────────────────────────

async function fetchFullLeaderboard(): Promise<LeaderEntry[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, photo_url, user_role')
    .not('name', 'is', null)

  if (!profiles || profiles.length === 0) return []

  const { data: caregiverLinks } = await supabase
    .from('child_caregivers')
    .select('user_id, role')
    .eq('status', 'accepted')

  const caregiverRoleMap = new Map<string, string>()
  for (const link of caregiverLinks ?? []) {
    if (!caregiverRoleMap.has(link.user_id) || link.role !== 'parent') {
      caregiverRoleMap.set(link.user_id, link.role)
    }
  }

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

  const { data: channelPosts } = await supabase
    .from('channel_posts')
    .select('author_id, reaction_count, reply_count')
    .is('reply_to_id', null)

  const channelByUser = new Map<string, { posts: number; reactions: number }>()
  for (const p of channelPosts ?? []) {
    const cur = channelByUser.get(p.author_id) || { posts: 0, reactions: 0 }
    cur.posts++
    cur.reactions += p.reaction_count || 0
    channelByUser.set(p.author_id, cur)
  }

  const { data: memberships } = await supabase
    .from('channel_members')
    .select('user_id')

  const membershipCount = new Map<string, number>()
  for (const m of memberships ?? []) {
    membershipCount.set(m.user_id, (membershipCount.get(m.user_id) || 0) + 1)
  }

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

// ─── Podium — sticker accents per rank ──────────────────────────────────────

function rankSticker(rank: number, size: number, fill: string) {
  if (rank === 1) return <StarSticker size={size} fill={fill} />
  if (rank === 2) return <BurstSticker size={size} fill={fill} points={8} />
  return <FlowerSticker size={size} petal={fill} />
}

// ─── Floating Sticker — ambient animated decoration ─────────────────────────

type FloatVariant = 'bob' | 'sway' | 'spin' | 'pulse'

function FloatingSticker({
  children, top, left, right, bottom, size = 48, variant = 'bob', delay = 0, duration = 3200, opacity = 0.5,
}: {
  children: React.ReactNode
  top?: number
  left?: number
  right?: number
  bottom?: number
  size?: number
  variant?: FloatVariant
  delay?: number
  duration?: number
  opacity?: number
}) {
  const progress = useSharedValue(0)

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      ),
    )
  }, [progress, duration, delay])

  const style = useAnimatedStyle(() => {
    const p = progress.value
    switch (variant) {
      case 'bob':
        return {
          transform: [
            { translateY: interpolate(p, [0, 1], [-6, 6]) },
            { rotate: `${interpolate(p, [0, 1], [-4, 4])}deg` },
          ],
        }
      case 'sway':
        return {
          transform: [
            { translateX: interpolate(p, [0, 1], [-8, 8]) },
            { rotate: `${interpolate(p, [0, 1], [-6, 6])}deg` },
          ],
        }
      case 'spin':
        return {
          transform: [
            { rotate: `${interpolate(p, [0, 1], [-12, 12])}deg` },
            { scale: interpolate(p, [0, 1], [0.92, 1.06]) },
          ],
        }
      case 'pulse':
        return {
          transform: [{ scale: interpolate(p, [0, 1], [0.9, 1.1]) }],
        }
    }
  })

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top,
          left,
          right,
          bottom,
          width: size,
          height: size,
          opacity,
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  )
}

// ─── Scene Stickers — ambient background constellation ──────────────────────

function SceneStickers() {
  const { stickers } = useTheme()
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <FloatingSticker top={120} right={24} size={42} variant="bob" delay={0} duration={3400} opacity={0.55}>
        <StarSticker size={42} fill={stickers.yellow} />
      </FloatingSticker>
      <FloatingSticker top={220} left={18} size={52} variant="sway" delay={400} duration={4200} opacity={0.45}>
        <HeartSticker size={52} fill={stickers.coral} />
      </FloatingSticker>
      <FloatingSticker top={360} right={60} size={48} variant="spin" delay={800} duration={3800} opacity={0.5}>
        <BurstSticker size={48} fill={stickers.lilac} points={10} />
      </FloatingSticker>
      <FloatingSticker top={500} left={40} size={46} variant="bob" delay={200} duration={3000} opacity={0.5}>
        <FlowerSticker size={46} petal={stickers.peach} />
      </FloatingSticker>
      <FloatingSticker top={640} right={30} size={40} variant="sway" delay={600} duration={3600} opacity={0.4}>
        <MoonSticker size={40} fill={stickers.blue} />
      </FloatingSticker>
      <FloatingSticker bottom={120} left={60} size={56} variant="spin" delay={1000} duration={4600} opacity={0.35}>
        <StarSticker size={56} fill={stickers.green} />
      </FloatingSticker>
      <FloatingSticker bottom={240} right={40} size={44} variant="pulse" delay={300} duration={2800} opacity={0.45}>
        <HeartSticker size={44} fill={stickers.pink} />
      </FloatingSticker>
    </View>
  )
}

// ─── Animated rank-pill Star (gentle continuous pulse + wobble) ─────────────

function AnimatedStarIcon({ size, fill }: { size: number; fill: string }) {
  const progress = useSharedValue(0)
  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    )
  }, [progress])
  const style = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(progress.value, [0, 1], [0.88, 1.12]) },
      { rotate: `${interpolate(progress.value, [0, 1], [-8, 8])}deg` },
    ],
  }))
  return (
    <Animated.View style={style}>
      <StarSticker size={size} fill={fill} />
    </Animated.View>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function LeaderboardScreen() {
  const { colors, radius, stickers, font, isDark } = useTheme()
  const insets = useSafeAreaInsets()

  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const ink = isDark ? colors.text : '#141313'

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
  const ranked = filtered.map((e, i) => ({ ...e, rank: i + 1 }))
  const myEntry = entries.find((e) => e.user_id === myUserId)
  const myRankedEntry = ranked.find((e) => e.user_id === myUserId)

  const podium = ranked.slice(0, 3)
  const rest = ranked.slice(3)

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }, styles.center]}>
        <BrandedLoader />
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Ambient sticker constellation — lives behind everything */}
      <SceneStickers />

      {/* Header */}
      <View style={[styles.headerWrap, { paddingTop: insets.top }]}>
        <ScreenHeader
          title="Leaderboard"
          right={
            myEntry ? (
              <View
                style={[
                  styles.rankPill,
                  {
                    backgroundColor: stickers.yellowSoft,
                    borderColor: paperBorder,
                  },
                ]}
              >
                <AnimatedStarIcon size={14} fill={stickers.yellow} />
                <Text style={[styles.rankPillText, { color: ink, fontFamily: font.display }]}>
                  #{myEntry.rank}
                </Text>
              </View>
            ) : undefined
          }
        />
      </View>

      {/* Tabs — paper pills (horizontal scroll so long labels don't clip) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key
          const count = filterByTab(entries, tab.key).length
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[
                styles.tabPill,
                {
                  backgroundColor: isActive ? ink : paper,
                  borderColor: isActive ? ink : paperBorder,
                  borderRadius: radius.full,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabPillText,
                  {
                    color: isActive ? (isDark ? colors.bg : '#FFFEF8') : colors.textSecondary,
                    fontFamily: font.bodySemiBold,
                  },
                ]}
              >
                {tab.label}
              </Text>
              <Text
                style={[
                  styles.tabPillCount,
                  {
                    color: isActive ? (isDark ? colors.bg : '#FFFEF8') : colors.textMuted,
                    fontFamily: font.body,
                  },
                ]}
              >
                {count}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>

      <FlatList
        data={rest}
        keyExtractor={(item) => item.user_id}
        renderItem={({ item }) => (
          <LeaderRow
            entry={item}
            isMe={item.user_id === myUserId}
            onPress={() => setSelectedUser(item)}
          />
        )}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 24,
          gap: 10,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ink} />
        }
        ListHeaderComponent={
          <View style={{ gap: 14, paddingBottom: 10 }}>
            {/* Podium — only when there are 3+ */}
            {podium.length >= 3 ? (
              <Podium entries={podium} myUserId={myUserId} onPress={setSelectedUser} />
            ) : podium.length > 0 ? (
              <View style={{ gap: 10 }}>
                {podium.map((e) => (
                  <LeaderRow
                    key={e.user_id}
                    entry={e}
                    isMe={e.user_id === myUserId}
                    onPress={() => setSelectedUser(e)}
                  />
                ))}
              </View>
            ) : null}

            {/* "You" pinned card — shown if user exists and isn't already in podium */}
            {myRankedEntry && podium.length >= 3 && myRankedEntry.rank > 3 && (
              <YouCard entry={myRankedEntry} onPress={() => setSelectedUser(myRankedEntry)} />
            )}
          </View>
        }
        ListEmptyComponent={
          podium.length === 0 ? (
            <EmptyState />
          ) : null
        }
        ListFooterComponent={
          ranked.length === 1 && ranked[0].user_id === myUserId ? (
            <View style={{ paddingTop: 14 }}>
              <SoloCheer />
            </View>
          ) : null
        }
      />

      {/* Profile sheet */}
      <Modal
        visible={!!selectedUser}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedUser(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedUser(null)}>
          <Pressable
            style={[
              styles.profileSheet,
              {
                backgroundColor: paper,
                borderRadius: radius.xl,
                borderColor: paperBorder,
                paddingBottom: insets.bottom + 24,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedUser && <ProfileSheet entry={selectedUser} onClose={() => setSelectedUser(null)} />}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

// ─── Podium ──────────────────────────────────────────────────────────────────

function Podium({
  entries, myUserId, onPress,
}: {
  entries: LeaderEntry[]
  myUserId: string | null
  onPress: (e: LeaderEntry) => void
}) {
  const { colors, stickers, font, radius, isDark } = useTheme()
  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const ink = isDark ? colors.text : '#141313'

  // Reorder for visual: [2, 1, 3]
  const order = [entries[1], entries[0], entries[2]].filter(Boolean)

  const stickerFills = {
    1: stickers.yellow,
    2: stickers.lilac,
    3: stickers.peach,
  } as const

  return (
    <View style={styles.podiumRow}>
      {order.map((entry) => {
        const rank = entry.rank as 1 | 2 | 3
        const isCenter = rank === 1
        const fill = stickerFills[rank]
        const isMe = entry.user_id === myUserId

        return (
          <Pressable
            key={entry.user_id}
            onPress={() => onPress(entry)}
            style={({ pressed }) => [
              styles.podiumCard,
              {
                backgroundColor: paper,
                borderColor: paperBorder,
                borderRadius: radius.lg,
                transform: [{ translateY: isCenter ? -8 : 0 }],
              },
              pressed && { opacity: 0.9 },
            ]}
          >
            <View style={[styles.podiumStickerWrap, { backgroundColor: fill + (isDark ? '33' : '44') }]}>
              {rankSticker(rank, isCenter ? 36 : 30, fill)}
            </View>

            <AvatarView
              value={entry.photo_url}
              size={isCenter ? 56 : 48}
              accent={fill + (isDark ? '22' : '33')}
              initial={(entry.name || '?').trim().charAt(0).toUpperCase()}
              textColor={ink}
              borderColor="rgba(20,19,19,0.12)"
              borderWidth={1.5}
            />

            <Text
              style={[styles.podiumName, { color: ink, fontFamily: font.bodySemiBold }]}
              numberOfLines={1}
            >
              {isMe ? 'You' : entry.name.split(' ')[0]}
            </Text>

            <View style={styles.podiumPtsRow}>
              <Text style={[styles.podiumPts, { color: ink, fontFamily: font.display }]}>
                {entry.total_points}
              </Text>
              <Text style={[styles.podiumPtsLabel, { color: colors.textMuted, fontFamily: font.body }]}>
                pts
              </Text>
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}

// ─── Leader Row — paper card ─────────────────────────────────────────────────

function LeaderRow({
  entry, isMe, onPress,
}: {
  entry: LeaderEntry
  isMe: boolean
  onPress: () => void
}) {
  const { colors, stickers, font, radius, isDark } = useTheme()
  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const ink = isDark ? colors.text : '#141313'

  const meTint = isDark ? stickers.pinkSoft : stickers.pinkSoft
  const meBorder = stickers.coral

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: isMe ? meTint : paper,
          borderColor: isMe ? meBorder : paperBorder,
          borderRadius: radius.lg,
        },
        pressed && { opacity: 0.9 },
      ]}
    >
      <View style={styles.rowRank}>
        <Text style={[styles.rowRankText, { color: colors.textMuted, fontFamily: font.display }]}>
          {entry.rank}
        </Text>
      </View>

      <AvatarView
        value={entry.photo_url}
        size={40}
        accent={isMe ? stickers.pink : stickers.yellowSoft}
        initial={(entry.name || '?').trim().charAt(0).toUpperCase()}
        textColor={ink}
        borderColor={isMe ? stickers.coral : 'rgba(20,19,19,0.12)'}
        borderWidth={1.5}
      />

      <View style={styles.rowInfo}>
        <Text
          style={[styles.rowName, { color: ink, fontFamily: font.bodySemiBold }]}
          numberOfLines={1}
        >
          {isMe ? `${entry.name} (You)` : entry.name}
        </Text>
        <View style={styles.rowStats}>
          {entry.child_logs > 0 && (
            <StatChip icon={<Calendar size={10} color={colors.textMuted} strokeWidth={2} />} value={entry.child_logs} />
          )}
          {entry.garage_posts + entry.channel_posts > 0 && (
            <StatChip icon={<MessageCircle size={10} color={colors.textMuted} strokeWidth={2} />} value={entry.garage_posts + entry.channel_posts} />
          )}
          {entry.garage_likes + entry.channel_reactions > 0 && (
            <StatChip icon={<Heart size={10} color={colors.textMuted} strokeWidth={2} />} value={entry.garage_likes + entry.channel_reactions} />
          )}
          {entry.channels_joined > 0 && (
            <StatChip icon={<Hash size={10} color={colors.textMuted} strokeWidth={2} />} value={entry.channels_joined} />
          )}
        </View>
      </View>

      <View style={styles.rowPts}>
        <Text style={[styles.rowPtsValue, { color: ink, fontFamily: font.display }]}>
          {entry.total_points}
        </Text>
        <Text style={[styles.rowPtsLabel, { color: colors.textMuted, fontFamily: font.body }]}>
          pts
        </Text>
      </View>
    </Pressable>
  )
}

function StatChip({ icon, value }: { icon: React.ReactNode; value: number }) {
  const { colors, font } = useTheme()
  return (
    <View style={styles.statChip}>
      {icon}
      <Text style={[styles.statChipText, { color: colors.textMuted, fontFamily: font.body }]}>
        {value}
      </Text>
    </View>
  )
}

// ─── Solo Cheer — shown when the user is the only one ranked ────────────────

function SoloCheer() {
  const { colors, stickers, font, radius, isDark } = useTheme()
  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const ink = isDark ? colors.text : '#141313'

  return (
    <View
      style={[
        styles.soloWrap,
        { backgroundColor: paper, borderColor: paperBorder, borderRadius: radius.lg },
      ]}
    >
      <View style={styles.soloStickerRow} pointerEvents="none">
        <View style={{ transform: [{ rotate: '-12deg' }] }}>
          <FlowerSticker size={42} petal={stickers.peach} />
        </View>
        <View style={{ transform: [{ rotate: '6deg' }], marginTop: -8 }}>
          <StarSticker size={56} fill={stickers.yellow} />
        </View>
        <View style={{ transform: [{ rotate: '14deg' }] }}>
          <HeartSticker size={40} fill={stickers.pink} />
        </View>
      </View>

      <Display size={20} align="center" color={ink}>
        Alone at the top
      </Display>
      <Text style={[styles.soloItalic, { color: colors.textSecondary, fontFamily: font.italic }]}>
        Invite caregivers and post in channels — friendly competition makes the climb sweeter.
      </Text>
    </View>
  )
}

// ─── You Card — pinned if user outside top 3 ─────────────────────────────────

function YouCard({ entry, onPress }: { entry: LeaderEntry; onPress: () => void }) {
  const { colors, stickers, font, radius, isDark } = useTheme()
  const ink = isDark ? colors.text : '#141313'

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.youCard,
        {
          backgroundColor: stickers.pinkSoft,
          borderColor: stickers.coral,
          borderRadius: radius.lg,
        },
        pressed && { opacity: 0.92 },
      ]}
    >
      <View style={styles.youStickerBg} pointerEvents="none">
        <HeartSticker size={110} fill={stickers.coral} />
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <MonoCaps color={colors.textMuted}>Your spot</MonoCaps>
        <Text style={[styles.youName, { color: ink, fontFamily: font.display }]}>
          {entry.name.split(' ')[0]}, you're #{entry.rank}
        </Text>
        <Text style={[styles.youSub, { color: colors.textSecondary, fontFamily: font.italic }]}>
          {entry.total_points} points this season
        </Text>
      </View>
    </Pressable>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState() {
  const { colors, stickers, font } = useTheme()
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyStickerWrap}>
        <MoonSticker size={96} fill={stickers.lilac} />
      </View>
      <Display size={22} align="center" color={colors.text}>
        Just you here, champ
      </Display>
      <Text style={[styles.emptyItalic, { color: colors.textSecondary, fontFamily: font.italic }]}>
        Invite caregivers and post in channels to climb the board.
      </Text>
    </View>
  )
}

// ─── Profile Sheet ───────────────────────────────────────────────────────────

function ProfileSheet({ entry, onClose }: { entry: LeaderEntry; onClose: () => void }) {
  const { colors, stickers, font, radius, isDark } = useTheme()
  const ink = isDark ? colors.text : '#141313'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'

  const rankFill =
    entry.rank === 1 ? stickers.yellow :
    entry.rank === 2 ? stickers.lilac :
    entry.rank === 3 ? stickers.peach :
    stickers.blue

  const roleLabel =
    entry.caregiver_role === 'nanny' ? 'Caregiver' :
    entry.caregiver_role === 'family' ? 'Family Member' :
    'Parent'

  return (
    <>
      <Pressable onPress={onClose} style={styles.profileClose} hitSlop={12}>
        <X size={20} color={colors.textMuted} />
      </Pressable>

      <View style={styles.profileStickerBg} pointerEvents="none">
        {rankSticker(entry.rank, 150, rankFill)}
      </View>

      <View style={styles.profileAvatarWrap}>
        <AvatarView
          value={entry.photo_url}
          size={84}
          accent={rankFill + (isDark ? '33' : '44')}
          initial={(entry.name || '?').trim().charAt(0).toUpperCase()}
          textColor={ink}
          borderColor={paperBorder}
          borderWidth={2}
        />
        <View
          style={[
            styles.profileRankBadge,
            {
              backgroundColor: rankFill,
              borderColor: paperBorder,
            },
          ]}
        >
          <Text style={[styles.profileRankText, { color: ink, fontFamily: font.display }]}>
            #{entry.rank}
          </Text>
        </View>
      </View>

      <Display size={26} align="center" color={ink}>
        {entry.name}
      </Display>
      <Text style={[styles.profileRole, { color: colors.textSecondary, fontFamily: font.italic }]}>
        {roleLabel}
      </Text>

      <View
        style={[
          styles.profilePointsPill,
          {
            backgroundColor: stickers.yellowSoft,
            borderColor: paperBorder,
            borderRadius: radius.full,
          },
        ]}
      >
        <StarSticker size={18} fill={stickers.yellow} />
        <Text style={[styles.profilePointsText, { color: ink, fontFamily: font.display }]}>
          {entry.total_points}
        </Text>
        <Text style={[styles.profilePointsLabel, { color: colors.textSecondary, fontFamily: font.body }]}>
          points
        </Text>
      </View>

      <View style={styles.profileStatsGrid}>
        <ProfileStat
          label="Child Logs"
          value={entry.child_logs}
          sticker={<FlowerSticker size={28} petal={stickers.peach} />}
          tint={isDark ? stickers.peachSoft : stickers.peachSoft}
        />
        <ProfileStat
          label="Posts"
          value={entry.garage_posts + entry.channel_posts}
          sticker={<BurstSticker size={28} fill={stickers.blue} points={8} />}
          tint={isDark ? stickers.blueSoft : stickers.blueSoft}
        />
        <ProfileStat
          label="Reactions"
          value={entry.garage_likes + entry.channel_reactions}
          sticker={<HeartSticker size={28} fill={stickers.coral} />}
          tint={isDark ? stickers.pinkSoft : stickers.pinkSoft}
        />
        <ProfileStat
          label="Channels"
          value={entry.channels_joined}
          sticker={<StarSticker size={28} fill={stickers.lilac} />}
          tint={isDark ? stickers.lilacSoft : stickers.lilacSoft}
        />
      </View>
    </>
  )
}

function ProfileStat({
  label, value, sticker, tint,
}: {
  label: string
  value: number
  sticker: React.ReactNode
  tint: string
}) {
  const { colors, font, radius, isDark } = useTheme()
  const ink = isDark ? colors.text : '#141313'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'

  return (
    <View
      style={[
        styles.profileStat,
        {
          backgroundColor: tint,
          borderColor: paperBorder,
          borderRadius: radius.lg,
        },
      ]}
    >
      <View style={styles.profileStatSticker}>{sticker}</View>
      <Text style={[styles.profileStatValue, { color: ink, fontFamily: font.display }]}>
        {value}
      </Text>
      <Text style={[styles.profileStatLabel, { color: colors.textSecondary, fontFamily: font.bodySemiBold }]}>
        {label.toUpperCase()}
      </Text>
    </View>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },

  headerWrap: { paddingHorizontal: 16, paddingBottom: 8 },

  rankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  rankPillText: { fontSize: 14, letterSpacing: -0.3 },

  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    alignItems: 'center',
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  tabPillText: { fontSize: 13 },
  tabPillCount: { fontSize: 12, opacity: 0.85 },

  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingTop: 6,
  },
  podiumCard: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    gap: 8,
    borderWidth: 1,
  },
  podiumStickerWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  podiumName: {
    fontSize: 14,
    textAlign: 'center',
  },
  podiumPtsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  podiumPts: { fontSize: 22, letterSpacing: -0.5 },
  podiumPtsLabel: { fontSize: 11 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    borderWidth: 1,
  },
  rowRank: { width: 28, alignItems: 'center' },
  rowRankText: { fontSize: 18, letterSpacing: -0.3 },
  rowAvatar: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  rowInfo: { flex: 1, gap: 4 },
  rowName: { fontSize: 15 },
  rowStats: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statChipText: { fontSize: 11 },
  rowPts: { alignItems: 'center', gap: 0 },
  rowPtsValue: { fontSize: 20, letterSpacing: -0.5 },
  rowPtsLabel: { fontSize: 10 },

  youCard: {
    padding: 18,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  youStickerBg: {
    position: 'absolute',
    right: -14,
    bottom: -18,
    opacity: 0.85,
  },
  youName: { fontSize: 22, lineHeight: 26 },
  youSub: { fontSize: 14, lineHeight: 20 },

  soloWrap: {
    marginTop: 4,
    paddingVertical: 22,
    paddingHorizontal: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  soloStickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 4,
  },
  soloItalic: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },

  emptyWrap: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyStickerWrap: { marginBottom: 6 },
  emptyItalic: { fontSize: 15, textAlign: 'center', lineHeight: 22 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20,19,19,0.5)',
    justifyContent: 'flex-end',
  },
  profileSheet: {
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 22,
    paddingTop: 26,
    borderWidth: 1,
    gap: 8,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  profileStickerBg: {
    position: 'absolute',
    right: -32,
    top: -30,
    opacity: 0.18,
  },
  profileClose: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 10,
  },
  profileAvatarWrap: { alignItems: 'center', marginTop: 4 },
  profileAvatar: { width: 84, height: 84, borderRadius: 42, overflow: 'hidden' },
  profileRankBadge: {
    minWidth: 40,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -14,
    borderWidth: 1,
  },
  profileRankText: { fontSize: 13, letterSpacing: -0.2 },
  profileRole: { fontSize: 15, marginTop: -4 },

  profilePointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderWidth: 1,
    marginTop: 6,
  },
  profilePointsText: { fontSize: 22, letterSpacing: -0.3 },
  profilePointsLabel: { fontSize: 13 },

  profileStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
    width: '100%',
    justifyContent: 'center',
  },
  profileStat: {
    width: '47%',
    padding: 14,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
  },
  profileStatSticker: { marginBottom: 2 },
  profileStatValue: { fontSize: 24, letterSpacing: -0.5 },
  profileStatLabel: { fontSize: 10, letterSpacing: 1.5 },
})
