/**
 * Leaderboard — cream-paper sticker-collage redesign.
 *
 * Tabs: All | Moms | Caregivers | Partners
 * Top 3 podium + ranked list + pinned "you" row.
 * Tap a row → paper profile sheet with sticker accents.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
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
import { toDateStr } from '../lib/cycleLogic'
import {
  User,
  X,
  MessageCircle,
  Heart,
  Calendar,
  Hash,
  Trophy,
  Crown,
  Medal,
  Award,
  Sparkles,
} from 'lucide-react-native'
import { useTheme, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../constants/theme'
import { useIsDiffuse, SoftBloom } from '../components/ui/diffuse/DiffuseKit'
import {
  DiffuseEmptyState,
  DiffuseBloomIcon,
} from '../components/ui/diffuse/DiffusePrimitives'
import { useModeStore } from '../store/useModeStore'
import { useTranslation } from '../lib/i18n'
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
import { MissingStickers } from '../components/stickers/MissingStickers'

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

// Leaderboard fetch bounds. The leaderboard is a discovery surface, not a
// system of record — capping is fine and prevents O(users) growth as the
// user base scales.
const PROFILE_CAP = 500       // top profiles surfaced in the leaderboard
const AGGREGATE_ROW_CAP = 5000 // upper bound for each per-table aggregation

async function fetchFullLeaderboard(): Promise<LeaderEntry[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  const { data: profiles } = await supabase
    .from('profiles_public')
    .select('id, name, photo_url, user_role')
    .not('name', 'is', null)
    .limit(PROFILE_CAP)

  if (!profiles || profiles.length === 0) return []

  // 5 aggregations are independent — fire in parallel rather than serially.
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const [
    { data: caregiverLinks },
    { data: garagePosts },
    { data: channelPosts },
    { data: memberships },
    { data: logs },
  ] = await Promise.all([
    supabase
      .from('child_caregivers')
      .select('user_id, role')
      .eq('status', 'accepted')
      .limit(AGGREGATE_ROW_CAP),
    supabase
      .from('garage_posts')
      .select('author_id, like_count, comment_count')
      .limit(AGGREGATE_ROW_CAP),
    // Channel engagement: count BOTH top-level posts and replies. The
    // previous .is('reply_to_id', null) filter excluded replies entirely
    // from the aggregate — repliers contributed zero posts and zero
    // reactions to the leaderboard regardless of how active they were.
    supabase
      .from('channel_posts')
      .select('author_id, reaction_count, reply_count, reply_to_id')
      .limit(AGGREGATE_ROW_CAP),
    supabase
      .from('channel_members')
      .select('user_id')
      .limit(AGGREGATE_ROW_CAP),
    supabase
      .from('child_logs')
      .select('user_id')
      .gte('date', toDateStr(ninetyDaysAgo))
      .limit(AGGREGATE_ROW_CAP),
  ])

  // A user can hold multiple caregiver roles (e.g. parent of their own
  // child AND a nanny in another family). For leaderboard bucketing we
  // surface the strongest identity. Precedence is deterministic so the
  // displayed role doesn't shift based on the row order returned by
  // Supabase. (Lower index = higher priority.)
  const ROLE_PRIORITY = ['parent', 'partner', 'family', 'nanny'] as const
  const rolePriority = (r: string) => {
    const idx = ROLE_PRIORITY.indexOf(r as typeof ROLE_PRIORITY[number])
    return idx === -1 ? ROLE_PRIORITY.length : idx
  }
  const caregiverRoleMap = new Map<string, string>()
  for (const link of caregiverLinks ?? []) {
    const current = caregiverRoleMap.get(link.user_id)
    if (!current || rolePriority(link.role) < rolePriority(current)) {
      caregiverRoleMap.set(link.user_id, link.role)
    }
  }

  const garageByUser = new Map<string, { posts: number; likes: number }>()
  for (const p of garagePosts ?? []) {
    const cur = garageByUser.get(p.author_id) || { posts: 0, likes: 0 }
    cur.posts++
    cur.likes += p.like_count || 0
    garageByUser.set(p.author_id, cur)
  }

  // Split top-level posts from replies. Both contribute to the displayed
  // `channel.posts` count, but points score them differently below so a
  // user who writes thoughtful new threads is still weighted higher than
  // one who only replies.
  const channelByUser = new Map<string, { posts: number; replies: number; reactions: number }>()
  for (const p of channelPosts ?? []) {
    const cur = channelByUser.get(p.author_id) || { posts: 0, replies: 0, reactions: 0 }
    if (p.reply_to_id) cur.replies++
    else cur.posts++
    cur.reactions += p.reaction_count || 0
    channelByUser.set(p.author_id, cur)
  }

  const membershipCount = new Map<string, number>()
  for (const m of memberships ?? []) {
    membershipCount.set(m.user_id, (membershipCount.get(m.user_id) || 0) + 1)
  }

  const logCount = new Map<string, number>()
  for (const l of logs ?? []) {
    logCount.set(l.user_id, (logCount.get(l.user_id) || 0) + 1)
  }

  const entries: LeaderEntry[] = profiles.map((p: any) => {
    const garage = garageByUser.get(p.id) || { posts: 0, likes: 0 }
    const channel = channelByUser.get(p.id) || { posts: 0, replies: 0, reactions: 0 }
    const cj = membershipCount.get(p.id) || 0
    const cl = logCount.get(p.id) || 0

    const points =
      garage.posts * 5 +
      garage.likes * 1 +
      channel.posts * 3 +
      channel.replies * 1 +     // replies count for engagement, but less than authoring
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
      // Surface both top-level posts and replies in the display so the
      // chip reflects total channel activity, not just thread starters.
      channel_posts: channel.posts + channel.replies,
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
  // Moms = anyone whose primary identity is "parent": user_role==='parent'
  // AND either has a 'parent' caregiver_role OR has no caregiver record
  // (a solo parent who hasn't been added to anyone's care_circle is still
  // a parent — the previous filter excluded them entirely).
  if (tab === 'moms') return entries.filter((e) =>
    e.user_role === 'parent' && (e.caregiver_role === 'parent' || e.caregiver_role === null)
  )
  if (tab === 'caregivers') return entries.filter((e) => e.caregiver_role === 'nanny' || e.caregiver_role === 'family')
  if (tab === 'partners') return entries.filter((e) => e.user_role === 'partner' || e.caregiver_role === 'family')
  return entries
}

// ─── Podium — sticker accents per rank ──────────────────────────────────────

function rankSticker(rank: number, size: number, fill: string) {
  if (rank === 1) return <MissingStickers.LeaderboardRank1 size={size} />
  if (rank === 2) return <MissingStickers.LeaderboardRank2 size={size} />
  if (rank === 3) return <MissingStickers.LeaderboardRank3 size={size} />
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
  const diffuse = useIsDiffuse()
  // Diffuse suppresses the big decorative sticker constellation — the language
  // is restrained hairline + soft blooms, not floating sticker heroes.
  if (diffuse) return null
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
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const mode = useModeStore((s) => s.mode)
  const accent = diffuse ? getDiffuseAccent(mode, dt.isDark) : stickers.yellow
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()

  const bg = diffuse ? dt.colors.bg : colors.bg
  const paper = diffuse ? dt.colors.surface : colors.surface
  const paperBorder = diffuse ? dt.colors.line : colors.border
  const ink = diffuse ? dt.colors.ink : colors.text

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
  // Per-tab counts for the pill badges — was recomputing filterByTab once per
  // tab on every render (5+ passes over `entries`). Memo on `entries`.
  const tabCounts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.key, filterByTab(entries, t.key).length])) as Record<TabKey, number>,
    [entries],
  )
  const myEntry = entries.find((e) => e.user_id === myUserId)
  const myRankedEntry = ranked.find((e) => e.user_id === myUserId)

  const podium = ranked.slice(0, 3)
  const rest = ranked.slice(3)

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: bg }, styles.center]}>
        <BrandedLoader />
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      {/* Ambient sticker constellation — lives behind everything */}
      <SceneStickers />

      {/* Header */}
      <View style={[styles.headerWrap, { paddingTop: insets.top }]}>
        <ScreenHeader
          title="Leaderboard"
          right={
            myEntry ? (
              diffuse ? (
                <View
                  style={[
                    styles.rankPill,
                    {
                      backgroundColor: 'transparent',
                      borderColor: dt.colors.hairline,
                    },
                  ]}
                >
                  <Trophy size={13} color={dt.colors.ink3} strokeWidth={1.8} />
                  <Text style={[styles.rankPillText, { color: ink, fontFamily: diffuseFont.monoBold }]}>
                    #{myEntry.rank}
                  </Text>
                </View>
              ) : (
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
              )
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
          const count = tabCounts[tab.key]
          const tabLabel = tab.key === 'all' ? t('leaderboard_tabAll') : tab.key === 'moms' ? t('leaderboard_tabMoms') : tab.key === 'caregivers' ? t('leaderboard_tabCaregivers') : t('leaderboard_tabPartners')
          if (diffuse) {
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={({ pressed }) => [
                  styles.tabPill,
                  {
                    backgroundColor: isActive ? dt.colors.surface : 'transparent',
                    borderColor: isActive ? dt.colors.hairline : dt.colors.line,
                    borderRadius: 999,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabPillText,
                    {
                      color: isActive ? dt.colors.ink : dt.colors.ink3,
                      fontFamily: isActive ? diffuseFont.monoBold : diffuseFont.mono,
                      letterSpacing: 1,
                      textTransform: 'uppercase',
                    },
                  ]}
                >
                  {tabLabel}
                </Text>
                <Text
                  style={[
                    styles.tabPillCount,
                    {
                      color: isActive ? dt.colors.ink2 : dt.colors.ink4,
                      fontFamily: diffuseFont.mono,
                    },
                  ]}
                >
                  {count}
                </Text>
              </Pressable>
            )
          }
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
                    color: isActive ? colors.textInverse : colors.textSecondary,
                    fontFamily: font.bodySemiBold,
                  },
                ]}
              >
                {tabLabel}
              </Text>
              <Text
                style={[
                  styles.tabPillCount,
                  {
                    color: isActive ? colors.textInverse : colors.textMuted,
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
                borderRadius: diffuse ? 28 : radius.xl,
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
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const mode = useModeStore((s) => s.mode)
  const { t } = useTranslation()
  const paper = diffuse ? dt.colors.surface : colors.surface
  const paperBorder = diffuse ? dt.colors.line : colors.border
  const ink = diffuse ? dt.colors.ink : colors.text

  // Reorder for visual: [2, 1, 3]
  const order = [entries[1], entries[0], entries[2]].filter(Boolean)

  const stickerFills = {
    1: stickers.yellow,
    2: stickers.lilac,
    3: stickers.peach,
  } as const

  // Diffuse: line-icon-over-bloom per rank (crown / medal / award), keyed to
  // the mode accent bloom instead of filled sticker sockets.
  const rankBloomIcon = (rank: 1 | 2 | 3, size: number) => {
    const acc = getDiffuseAccent(mode, dt.isDark)
    const Glyph = rank === 1 ? Crown : rank === 2 ? Medal : Award
    return (
      <DiffuseBloomIcon color={acc} size={size} intensity={0.5}>
        <Glyph size={size * 0.62} color={dt.colors.ink2} strokeWidth={1.7} />
      </DiffuseBloomIcon>
    )
  }

  return (
    <View style={styles.podiumRow}>
      {order.map((entry) => {
        const rank = entry.rank as 1 | 2 | 3
        const isCenter = rank === 1
        const fill = stickerFills[rank]
        const isMe = entry.user_id === myUserId

        if (diffuse) {
          return (
            <Pressable
              key={entry.user_id}
              onPress={() => onPress(entry)}
              style={({ pressed }) => [
                styles.podiumCard,
                {
                  backgroundColor: paper,
                  borderColor: paperBorder,
                  borderRadius: 28,
                  transform: [{ translateY: isCenter ? -8 : 0 }],
                },
                pressed && { opacity: 0.9 },
              ]}
            >
              {rankBloomIcon(rank, isCenter ? 52 : 44)}

              <AvatarView
                value={entry.photo_url}
                size={isCenter ? 56 : 48}
                accent="transparent"
                initial={(entry.name || '?').trim().charAt(0).toUpperCase()}
                textColor={ink}
                borderColor={dt.colors.line2}
                borderWidth={1}
              />

              <Text
                style={[styles.podiumName, { color: ink, fontFamily: diffuseFont.body }]}
                numberOfLines={1}
              >
                {isMe ? t('leaderboard_you') : entry.name.split(' ')[0]}
              </Text>

              <View style={styles.podiumPtsRow}>
                <Text style={[styles.podiumPts, { color: ink, fontFamily: diffuseFont.display }]}>
                  {entry.total_points}
                </Text>
                <Text style={[styles.podiumPtsLabel, { color: dt.colors.ink3, fontFamily: diffuseFont.mono, textTransform: 'uppercase', letterSpacing: 1 }]}>
                  {t('leaderboard_pts')}
                </Text>
              </View>
            </Pressable>
          )
        }

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
              borderColor={colors.borderStrong}
              borderWidth={1.5}
            />

            <Text
              style={[styles.podiumName, { color: ink, fontFamily: font.bodySemiBold }]}
              numberOfLines={1}
            >
              {isMe ? t('leaderboard_you') : entry.name.split(' ')[0]}
            </Text>

            <View style={styles.podiumPtsRow}>
              <Text style={[styles.podiumPts, { color: ink, fontFamily: font.display }]}>
                {entry.total_points}
              </Text>
              <Text style={[styles.podiumPtsLabel, { color: colors.textMuted, fontFamily: font.body }]}>
                {t('leaderboard_pts')}
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
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const mode = useModeStore((s) => s.mode)
  const { t } = useTranslation()
  const paper = colors.surface
  const paperBorder = colors.border
  const ink = diffuse ? dt.colors.ink : colors.text

  const meTint = isDark ? stickers.pinkSoft : stickers.pinkSoft
  const meBorder = stickers.coral

  if (diffuse) {
    const acc = getDiffuseAccent(mode, dt.isDark)
    const statParts: { icon: React.ReactNode; value: number }[] = []
    if (entry.child_logs > 0) statParts.push({ icon: <Calendar size={9} color={dt.colors.ink3} strokeWidth={1.8} />, value: entry.child_logs })
    if (entry.garage_posts + entry.channel_posts > 0) statParts.push({ icon: <MessageCircle size={9} color={dt.colors.ink3} strokeWidth={1.8} />, value: entry.garage_posts + entry.channel_posts })
    if (entry.garage_likes + entry.channel_reactions > 0) statParts.push({ icon: <Heart size={9} color={dt.colors.ink3} strokeWidth={1.8} />, value: entry.garage_likes + entry.channel_reactions })
    if (entry.channels_joined > 0) statParts.push({ icon: <Hash size={9} color={dt.colors.ink3} strokeWidth={1.8} />, value: entry.channels_joined })

    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.diffuseRow,
          {
            borderColor: isMe ? dt.colors.hairline : dt.colors.line,
            backgroundColor: dt.colors.surface,
          },
          pressed && { opacity: 0.6 },
        ]}
      >
        {/* Current-user emphasis: a soft accent bloom, not a saturated pill. */}
        {isMe ? <SoftBloom color={acc} cx="8%" cy="50%" opacity={dt.isDark ? 0.22 : 0.18} spread={0.4} radius="70%" /> : null}

        <View style={styles.rowRank}>
          <Text style={[styles.diffuseRowRankText, { color: dt.colors.ink3, fontFamily: diffuseFont.mono }]}>
            {entry.rank}
          </Text>
        </View>

        <AvatarView
          value={entry.photo_url}
          size={40}
          accent="transparent"
          initial={(entry.name || '?').trim().charAt(0).toUpperCase()}
          textColor={ink}
          borderColor={isMe ? dt.colors.hairline : dt.colors.line2}
          borderWidth={1}
        />

        <View style={styles.rowInfo}>
          <Text
            style={[styles.rowName, { color: ink, fontFamily: diffuseFont.bodyMedium }]}
            numberOfLines={1}
          >
            {isMe ? t('leaderboard_youSuffix', { name: entry.name }) : entry.name}
          </Text>
          {statParts.length > 0 && (
            <View style={styles.rowStats}>
              {statParts.map((s, i) => (
                <View key={i} style={styles.statChip}>
                  {s.icon}
                  <Text style={[styles.diffuseStatChipText, { color: dt.colors.ink3, fontFamily: diffuseFont.mono }]}>
                    {s.value}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.rowPts}>
          <Text style={[styles.diffuseRowPtsValue, { color: ink, fontFamily: diffuseFont.monoBold }]}>
            {entry.total_points}
          </Text>
          <Text style={[styles.diffuseRowPtsLabel, { color: dt.colors.ink4, fontFamily: diffuseFont.mono, textTransform: 'uppercase', letterSpacing: 1 }]}>
            {t('leaderboard_pts')}
          </Text>
        </View>
      </Pressable>
    )
  }

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
        borderColor={isMe ? stickers.coral : colors.borderStrong}
        borderWidth={1.5}
      />

      <View style={styles.rowInfo}>
        <Text
          style={[styles.rowName, { color: ink, fontFamily: font.bodySemiBold }]}
          numberOfLines={1}
        >
          {isMe ? t('leaderboard_youSuffix', { name: entry.name }) : entry.name}
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
          {t('leaderboard_pts')}
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
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const mode = useModeStore((s) => s.mode)
  const { t } = useTranslation()
  const paper = diffuse ? dt.colors.surface : colors.surface
  const paperBorder = diffuse ? dt.colors.line : colors.border
  const ink = diffuse ? dt.colors.ink : colors.text

  if (diffuse) {
    const acc = getDiffuseAccent(mode, dt.isDark)
    return (
      <View
        style={[
          styles.soloWrap,
          { backgroundColor: paper, borderColor: paperBorder, borderRadius: 28 },
        ]}
      >
        <View style={{ marginBottom: 6 }} pointerEvents="none">
          <DiffuseBloomIcon color={acc} size={64} intensity={0.5}>
            <Sparkles size={30} color={dt.colors.ink2} strokeWidth={1.6} />
          </DiffuseBloomIcon>
        </View>

        <Display size={20} align="center" color={ink}>
          {t('leaderboard_aloneTop')}
        </Display>
        <Text style={[styles.soloItalic, { color: dt.colors.ink3, fontFamily: diffuseFont.italic }]}>
          {t('leaderboard_aloneTopBody')}
        </Text>
      </View>
    )
  }

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
        {t('leaderboard_aloneTop')}
      </Display>
      <Text style={[styles.soloItalic, { color: colors.textSecondary, fontFamily: font.italic }]}>
        {t('leaderboard_aloneTopBody')}
      </Text>
    </View>
  )
}

// ─── You Card — pinned if user outside top 3 ─────────────────────────────────

function YouCard({ entry, onPress }: { entry: LeaderEntry; onPress: () => void }) {
  const { colors, stickers, font, radius, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const mode = useModeStore((s) => s.mode)
  const { t } = useTranslation()
  const ink = diffuse ? dt.colors.ink : colors.text

  if (diffuse) {
    const acc = getDiffuseAccent(mode, dt.isDark)
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.youCard,
          {
            backgroundColor: dt.colors.surface,
            borderColor: dt.colors.hairline,
            borderRadius: 28,
          },
          pressed && { opacity: 0.92 },
        ]}
      >
        {/* Subtle accent bloom instead of the filled coral wash + heart sticker. */}
        <SoftBloom color={acc} cx="88%" cy="70%" opacity={dt.isDark ? 0.26 : 0.2} spread={0.5} radius="70%" />

        <View style={{ flex: 1, gap: 4 }}>
          <MonoCaps color={dt.colors.ink3}>{t('leaderboard_yourSpot')}</MonoCaps>
          <Text style={[styles.youName, { color: ink, fontFamily: diffuseFont.display }]}>
            {t('leaderboard_rankHero', { name: entry.name.split(' ')[0], rank: entry.rank })}
          </Text>
          <Text style={[styles.youSub, { color: dt.colors.ink3, fontFamily: diffuseFont.italic }]}>
            {t('leaderboard_pointsSeason', { n: entry.total_points })}
          </Text>
        </View>
      </Pressable>
    )
  }

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
        <MonoCaps color={colors.textMuted}>{t('leaderboard_yourSpot')}</MonoCaps>
        <Text style={[styles.youName, { color: ink, fontFamily: font.display }]}>
          {t('leaderboard_rankHero', { name: entry.name.split(' ')[0], rank: entry.rank })}
        </Text>
        <Text style={[styles.youSub, { color: colors.textSecondary, fontFamily: font.italic }]}>
          {t('leaderboard_pointsSeason', { n: entry.total_points })}
        </Text>
      </View>
    </Pressable>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState() {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const mode = useModeStore((s) => s.mode)
  const { t } = useTranslation()

  if (diffuse) {
    return (
      <DiffuseEmptyState
        icon={<Trophy size={30} color={dt.colors.ink2} strokeWidth={1.6} />}
        title={t('leaderboard_justYou')}
        message={t('leaderboard_justYouBody')}
      />
    )
  }

  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyStickerWrap}>
        <MoonSticker size={96} fill={stickers.lilac} />
      </View>
      <Display size={22} align="center" color={colors.text}>
        {t('leaderboard_justYou')}
      </Display>
      <Text style={[styles.emptyItalic, { color: colors.textSecondary, fontFamily: font.italic }]}>
        {t('leaderboard_justYouBody')}
      </Text>
    </View>
  )
}

// ─── Profile Sheet ───────────────────────────────────────────────────────────

function ProfileSheet({ entry, onClose }: { entry: LeaderEntry; onClose: () => void }) {
  const { colors, stickers, font, radius, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const mode = useModeStore((s) => s.mode)
  const { t } = useTranslation()
  const ink = diffuse ? dt.colors.ink : colors.text
  const paperBorder = diffuse ? dt.colors.line : colors.border

  const rankFill =
    entry.rank === 1 ? stickers.yellow :
    entry.rank === 2 ? stickers.lilac :
    entry.rank === 3 ? stickers.peach :
    stickers.blue

  const roleLabel =
    entry.caregiver_role === 'nanny' ? t('leaderboard_roleCaregiver') :
    entry.caregiver_role === 'family' ? t('leaderboard_roleFamilyMember') :
    t('leaderboard_roleParent')

  if (diffuse) {
    const acc = getDiffuseAccent(mode, dt.isDark)
    const RankGlyph = entry.rank === 1 ? Crown : entry.rank === 2 ? Medal : entry.rank === 3 ? Award : Trophy
    return (
      <>
        <Pressable onPress={onClose} style={[styles.diffuseProfileClose, { borderColor: dt.colors.hairline }]} hitSlop={12}>
          <X size={18} color={dt.colors.ink} />
        </Pressable>

        {/* Soft accent bloom in place of the giant translucent rank sticker. */}
        <View style={styles.profileStickerBg} pointerEvents="none">
          <SoftBloom color={acc} cx="70%" cy="30%" opacity={dt.isDark ? 0.2 : 0.16} spread={0.5} radius="60%" />
        </View>

        <View style={styles.profileAvatarWrap}>
          <AvatarView
            value={entry.photo_url}
            size={84}
            accent="transparent"
            initial={(entry.name || '?').trim().charAt(0).toUpperCase()}
            textColor={ink}
            borderColor={dt.colors.line2}
            borderWidth={1}
          />
          <View
            style={[
              styles.profileRankBadge,
              {
                backgroundColor: dt.colors.surface,
                borderColor: dt.colors.hairline,
              },
            ]}
          >
            <Text style={[styles.diffuseProfileRankText, { color: ink, fontFamily: diffuseFont.monoBold }]}>
              #{entry.rank}
            </Text>
          </View>
        </View>

        <Display size={26} align="center" color={ink}>
          {entry.name}
        </Display>
        <Text style={[styles.profileRole, { color: dt.colors.ink3, fontFamily: diffuseFont.italic }]}>
          {roleLabel}
        </Text>

        <View
          style={[
            styles.profilePointsPill,
            {
              backgroundColor: 'transparent',
              borderColor: dt.colors.hairline,
              borderRadius: 999,
            },
          ]}
        >
          <Trophy size={15} color={dt.colors.ink3} strokeWidth={1.8} />
          <Text style={[styles.diffuseProfilePointsText, { color: ink, fontFamily: diffuseFont.monoBold }]}>
            {entry.total_points}
          </Text>
          <Text style={[styles.profilePointsLabel, { color: dt.colors.ink3, fontFamily: diffuseFont.mono, textTransform: 'uppercase', letterSpacing: 1 }]}>
            {t('leaderboard_statPoints')}
          </Text>
        </View>

        <View style={styles.profileStatsGrid}>
          <ProfileStat
            label={t('leaderboard_statChildLogs')}
            value={entry.child_logs}
            sticker={<DiffuseBloomIcon color={acc} size={30} intensity={0.45}><Calendar size={17} color={dt.colors.ink2} strokeWidth={1.7} /></DiffuseBloomIcon>}
            tint="transparent"
          />
          <ProfileStat
            label={t('leaderboard_statPosts')}
            value={entry.garage_posts + entry.channel_posts}
            sticker={<DiffuseBloomIcon color={acc} size={30} intensity={0.45}><MessageCircle size={17} color={dt.colors.ink2} strokeWidth={1.7} /></DiffuseBloomIcon>}
            tint="transparent"
          />
          <ProfileStat
            label={t('leaderboard_statReactions')}
            value={entry.garage_likes + entry.channel_reactions}
            sticker={<DiffuseBloomIcon color={acc} size={30} intensity={0.45}><Heart size={17} color={dt.colors.ink2} strokeWidth={1.7} /></DiffuseBloomIcon>}
            tint="transparent"
          />
          <ProfileStat
            label={t('leaderboard_statChannels')}
            value={entry.channels_joined}
            sticker={<DiffuseBloomIcon color={acc} size={30} intensity={0.45}><Hash size={17} color={dt.colors.ink2} strokeWidth={1.7} /></DiffuseBloomIcon>}
            tint="transparent"
          />
        </View>
      </>
    )
  }

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
          {t('leaderboard_statPoints')}
        </Text>
      </View>

      <View style={styles.profileStatsGrid}>
        <ProfileStat
          label={t('leaderboard_statChildLogs')}
          value={entry.child_logs}
          sticker={<FlowerSticker size={28} petal={stickers.peach} />}
          tint={isDark ? stickers.peachSoft : stickers.peachSoft}
        />
        <ProfileStat
          label={t('leaderboard_statPosts')}
          value={entry.garage_posts + entry.channel_posts}
          sticker={<BurstSticker size={28} fill={stickers.blue} points={8} />}
          tint={isDark ? stickers.blueSoft : stickers.blueSoft}
        />
        <ProfileStat
          label={t('leaderboard_statReactions')}
          value={entry.garage_likes + entry.channel_reactions}
          sticker={<HeartSticker size={28} fill={stickers.coral} />}
          tint={isDark ? stickers.pinkSoft : stickers.pinkSoft}
        />
        <ProfileStat
          label={t('leaderboard_statChannels')}
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
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const ink = diffuse ? dt.colors.ink : colors.text
  const paperBorder = diffuse ? dt.colors.line : colors.border

  if (diffuse) {
    return (
      <View
        style={[
          styles.profileStat,
          {
            backgroundColor: dt.colors.surface,
            borderColor: paperBorder,
            borderRadius: 20,
          },
        ]}
      >
        <View style={styles.profileStatSticker}>{sticker}</View>
        <Text style={[styles.profileStatValue, { color: ink, fontFamily: diffuseFont.display }]}>
          {value}
        </Text>
        <Text style={[styles.profileStatLabel, { color: dt.colors.ink3, fontFamily: diffuseFont.mono }]}>
          {label.toUpperCase()}
        </Text>
      </View>
    )
  }

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

  // Diffuse-only row treatment: hairline-bordered rows, mono rank/points.
  diffuseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  diffuseRowRankText: { fontSize: 15, letterSpacing: 0.5 },
  diffuseStatChipText: { fontSize: 10, letterSpacing: 0.5 },
  diffuseRowPtsValue: { fontSize: 17, letterSpacing: 0.3 },
  diffuseRowPtsLabel: { fontSize: 8, marginTop: 1 },

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
  diffuseProfileClose: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  diffuseProfileRankText: { fontSize: 11, letterSpacing: 0.3 },
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
  diffuseProfilePointsText: { fontSize: 18, letterSpacing: 0.3 },
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
