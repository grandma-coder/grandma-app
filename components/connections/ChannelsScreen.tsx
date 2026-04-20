/**
 * F3 — Channels Discovery Screen
 *
 * Discovery header, suggested channels, trending, my channels, search.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import {
  Search,
  Users,
  TrendingUp,
  Plus,
  Star,
} from 'lucide-react-native'
import { useTheme, brand } from '../../constants/theme'
import { BrandedLoader } from '../ui/BrandedLoader'
import { getChannels, type Channel } from '../../lib/channels'
import { getMyChannelIds, getMyFavoriteChannelIds } from '../../lib/channelPosts'
import { useModeStore } from '../../store/useModeStore'
import { useChannelsStore } from '../../store/useChannelsStore'
import { channelSticker } from '../../lib/channelSticker'

// Cream accent shared with Garage feed — paper-aesthetic CTA
const CREAM = '#F5EFE3'
const INK = '#1A1430'

// ─── Behavior-based suggestions ────────────────────────────────────────────

const BEHAVIOR_TAGS: Record<string, string[]> = {
  'pre-pregnancy': ['fertility', 'ttc', 'cycle', 'wellness'],
  pregnancy: ['pregnancy', 'expecting', 'birth', 'prenatal'],
  kids: ['parenting', 'feeding', 'sleep', 'milestones'],
}

// ─── Main Component ────────────────────────────────────────────────────────

export function ChannelsScreen() {
  const { colors, radius } = useTheme()
  const mode = useModeStore((s) => s.mode)

  const [channels, setChannels] = useState<Channel[]>([])
  const [myIds, setMyIds] = useState<string[]>([])
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const unreadCounts = useChannelsStore((s) => s.unreadCounts)
  const fetchUnreadCounts = useChannelsStore((s) => s.fetchUnreadCounts)

  useEffect(() => {
    load()
  }, [])

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      load()
    }, [])
  )

  async function load() {
    setLoading(true)
    try {
      const [all, ids, favIds] = await Promise.all([
        getChannels(),
        getMyChannelIds(),
        getMyFavoriteChannelIds(),
      ])
      setChannels(all)
      setMyIds(ids)
      setFavoriteIds(favIds)
      fetchUnreadCounts()
    } catch {} finally {
      setLoading(false)
    }
  }

  const myChannels = channels.filter((c) => myIds.includes(c.id))
  const favoriteChannels = channels.filter((c) => favoriteIds.includes(c.id))
  const trending = channels.slice(0, 5)
  const suggested = channels.filter((c) => {
    const tags = BEHAVIOR_TAGS[mode] ?? []
    return tags.some((t) =>
      c.name.toLowerCase().includes(t) || (c.description ?? '').toLowerCase().includes(t)
    )
  }).slice(0, 5)

  const searchResults = search
    ? channels.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.description ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : null

  if (loading) {
    return (
      <View style={styles.center}>
        <BrandedLoader />
      </View>
    )
  }

  return (
    <View style={{ flex: 1 }}>
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Text style={[styles.heading, { color: colors.text }]}>
        Find your community
      </Text>

      {/* Auto-scrolling banner carousel */}
      {!search && suggested.length > 0 && (
        <BannerCarousel channels={suggested} myIds={myIds} />
      )}

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
        <Search size={18} color={colors.textMuted} strokeWidth={2} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search channels..."
          placeholderTextColor={colors.textMuted}
          style={[styles.searchInput, { color: colors.text }]}
        />
      </View>

      {/* Search results */}
      {searchResults ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>RESULTS</Text>
          {searchResults.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No channels found</Text>
          ) : (
            searchResults.map((c) => (
              <ChannelCard key={c.id} channel={c} joined={myIds.includes(c.id)} />
            ))
          )}
        </View>
      ) : (
        <>
          {/* Suggested */}
          {suggested.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>SUGGESTED FOR YOU</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                {suggested.map((c) => (
                  <ChannelCardCompact key={c.id} channel={c} joined={myIds.includes(c.id)} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Trending */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <TrendingUp size={16} color={brand.accent} strokeWidth={2} />
              <Text style={[styles.sectionTitle, { color: colors.textMuted, marginBottom: 0 }]}>TRENDING</Text>
            </View>
            {trending.map((c) => (
              <ChannelCard key={c.id} channel={c} joined={myIds.includes(c.id)} unread={unreadCounts[c.id]} />
            ))}
          </View>

          {/* Favorites */}
          {favoriteChannels.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Star size={16} color={brand.accent} strokeWidth={2} fill={brand.accent} />
                <Text style={[styles.sectionTitle, { color: colors.textMuted, marginBottom: 0 }]}>FAVORITES</Text>
              </View>
              {favoriteChannels.map((c) => (
                <ChannelCard key={c.id} channel={c} joined={myIds.includes(c.id)} unread={unreadCounts[c.id]} />
              ))}
            </View>
          )}

          {/* My channels */}
          {myChannels.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted, marginBottom: 0 }]}>MY CHANNELS</Text>
              </View>
              {myChannels.map((c) => (
                <ChannelCard key={c.id} channel={c} joined unread={unreadCounts[c.id]} />
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>

    {/* Create Channel FAB — cream on dark, matches Garage FAB */}
    <Pressable
      onPress={() => router.push('/channel/create' as any)}
      style={({ pressed }) => [
        styles.fab,
        { backgroundColor: CREAM, borderRadius: radius.full, shadowColor: CREAM },
        pressed && { transform: [{ scale: 0.93 }] },
      ]}
    >
      <Plus size={26} color={INK} strokeWidth={2.5} />
    </Pressable>
    </View>
  )
}

// ─── Auto-scrolling Banner Carousel ────────────────────────────────────────

const BANNER_W = Dimensions.get('window').width - 40 // padding 20 each side

function BannerCarousel({ channels, myIds }: { channels: Channel[]; myIds: string[] }) {
  const { colors, radius, isDark } = useTheme()
  const scrollRef = useRef<ScrollView>(null)
  const indexRef = useRef(0)

  useEffect(() => {
    const timer = setInterval(() => {
      indexRef.current = (indexRef.current + 1) % channels.length
      scrollRef.current?.scrollTo({ x: indexRef.current * (BANNER_W + 12), animated: true })
    }, 3000)
    return () => clearInterval(timer)
  }, [channels.length])

  return (
    <View style={styles.bannerContainer}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled={false}
        decelerationRate="fast"
        snapToInterval={BANNER_W + 12}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12 }}
      >
        {channels.map((c) => {
          const joined = myIds.includes(c.id)
          const sticker = channelSticker(c.id, isDark, c.avatarUrl)
          const StickerIcon = sticker.Component
          return (
            <Pressable
              key={c.id}
              onPress={() => router.push(`/channel/${c.id}` as any)}
              style={[styles.banner, { width: BANNER_W, backgroundColor: sticker.tint, borderRadius: radius.xl }]}
            >
              <View style={[styles.bannerIcon, { backgroundColor: sticker.fill + '38' }]}>
                <StickerIcon size={34} fill={sticker.fill} />
              </View>
              <View style={styles.bannerContent}>
                <Text style={[styles.bannerName, { color: colors.text }]} numberOfLines={1}>
                  {c.name}
                </Text>
                <Text style={[styles.bannerDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                  {c.description ?? 'Join the conversation'}
                </Text>
                <View style={styles.bannerMeta}>
                  <Text style={[styles.bannerMembers, { color: colors.textMuted }]}>
                    {c.memberCount} members
                  </Text>
                  {c.avgRating > 0 && (
                    <View style={styles.bannerRating}>
                      <Star size={12} color={brand.accent} strokeWidth={2} fill={brand.accent} />
                      <Text style={[styles.bannerRatingText, { color: brand.accent }]}>
                        {c.avgRating.toFixed(1)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              {!joined && (
                <View style={[styles.bannerJoin, { backgroundColor: CREAM, borderRadius: radius.full }]}>
                  <Text style={[styles.bannerJoinText, { color: INK }]}>Join</Text>
                </View>
              )}
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

// ─── Star Rating Display ──────────────────────────────────────────────────

function StarRating({ rating, count }: { rating: number; count: number }) {
  if (count === 0) return null
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={10}
          color={brand.accent}
          strokeWidth={2}
          fill={i <= Math.round(rating) ? brand.accent : 'none'}
        />
      ))}
      <Text style={[styles.ratingText, { color: brand.accent }]}>{rating.toFixed(1)}</Text>
    </View>
  )
}

// ─── Channel Card (full) ───────────────────────────────────────────────────

function ChannelCard({ channel, joined, unread }: { channel: Channel; joined: boolean; unread?: number }) {
  const { colors, radius, isDark } = useTheme()
  const sticker = channelSticker(channel.id, isDark, channel.avatarUrl)
  const StickerIcon = sticker.Component

  return (
    <Pressable
      onPress={() => router.push(`/channel/${channel.id}` as any)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderRadius: radius.xl },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={[styles.cardIcon, { backgroundColor: sticker.tint }]}>
        <StickerIcon size={26} fill={sticker.fill} />
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
          {channel.name}
        </Text>
        <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={1}>
          {channel.description ?? 'Join the conversation'}
        </Text>
      </View>
      <View style={styles.cardRight}>
        {(unread ?? 0) > 0 ? (
          <View style={[styles.unreadBadge, { backgroundColor: CREAM }]}>
            <Text style={[styles.unreadText, { color: INK }]}>{unread! > 99 ? '99+' : unread}</Text>
          </View>
        ) : (
          <View style={styles.memberRow}>
            <Users size={12} color={colors.textMuted} strokeWidth={2} />
            <Text style={[styles.memberCount, { color: colors.textMuted }]}>
              {channel.memberCount}
            </Text>
          </View>
        )}
        <StarRating rating={channel.avgRating} count={channel.ratingCount} />
        {joined && (
          <View style={[styles.joinedBadge, { backgroundColor: brand.success + '20', borderRadius: radius.full }]}>
            <Text style={[styles.joinedText, { color: brand.success }]}>Joined</Text>
          </View>
        )}
      </View>
    </Pressable>
  )
}

// ─── Channel Card (compact, for horizontal scroll) ─────────────────────────

function ChannelCardCompact({ channel, joined }: { channel: Channel; joined: boolean }) {
  const { colors, radius, isDark } = useTheme()
  const sticker = channelSticker(channel.id, isDark, channel.avatarUrl)
  const StickerIcon = sticker.Component

  return (
    <Pressable
      onPress={() => router.push(`/channel/${channel.id}` as any)}
      style={({ pressed }) => [
        styles.compactCard,
        { backgroundColor: colors.surface, borderRadius: radius.xl },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={[styles.compactIcon, { backgroundColor: sticker.tint }]}>
        <StickerIcon size={30} fill={sticker.fill} />
      </View>
      <Text style={[styles.compactName, { color: colors.text }]} numberOfLines={1}>
        {channel.name}
      </Text>
      <Text style={[styles.compactMembers, { color: colors.textMuted }]}>
        {channel.memberCount} members
      </Text>
      {!joined && (
        <View style={[styles.joinBtn, { backgroundColor: CREAM, borderRadius: radius.full }]}>
          <Text style={[styles.joinBtnText, { color: INK }]}>Join</Text>
        </View>
      )}
    </Pressable>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  heading: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3, marginBottom: 16, fontFamily: 'Fraunces_600SemiBold' },

  // Banner carousel
  bannerContainer: { marginBottom: 16 },
  banner: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  bannerIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  bannerContent: { flex: 1, gap: 4 },
  bannerName: { fontSize: 16, fontWeight: '700' },
  bannerDesc: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
  bannerMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 2 },
  bannerMembers: { fontSize: 11, fontWeight: '600' },
  bannerRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  bannerRatingText: { fontSize: 11, fontWeight: '700' },
  bannerJoin: { paddingVertical: 8, paddingHorizontal: 18 },
  bannerJoinText: { fontSize: 13, fontWeight: '800' },

  // Star rating
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText: { fontSize: 10, fontWeight: '700', marginLeft: 2 },

  // Search
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, height: 48, borderWidth: 1, marginBottom: 20 },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500' },

  // Sections
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  emptyText: { fontSize: 14, fontWeight: '500' },

  // Horizontal list
  horizontalList: { gap: 12 },

  // Card
  card: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardContent: { flex: 1, gap: 2 },
  cardName: { fontSize: 15, fontWeight: '700' },
  cardDesc: { fontSize: 13, fontWeight: '400' },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  memberCount: { fontSize: 12, fontWeight: '600' },
  joinedBadge: { paddingVertical: 2, paddingHorizontal: 8 },
  joinedText: { fontSize: 10, fontWeight: '700' },

  // Unread badge
  unreadBadge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  unreadText: { fontSize: 11, fontWeight: '800' },

  // FAB
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8 },

  // Compact
  compactCard: { width: 150, padding: 16, alignItems: 'center', gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  compactIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  compactName: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  compactMembers: { fontSize: 12, fontWeight: '500' },
  joinBtn: { paddingVertical: 7, paddingHorizontal: 22, marginTop: 4 },
  joinBtnText: { fontSize: 13, fontWeight: '800' },
})
