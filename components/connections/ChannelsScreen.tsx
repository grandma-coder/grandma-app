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
import { useTheme, shadows, getModeColor } from '../../constants/theme'
import { BrandedLoader } from '../ui/BrandedLoader'
import { getChannels, type Channel } from '../../lib/channels'
import { getMyChannelIds, getMyFavoriteChannelIds } from '../../lib/channelPosts'
import { useModeStore } from '../../store/useModeStore'
import { useChannelsStore } from '../../store/useChannelsStore'
import { channelSticker } from '../../lib/channelSticker'
import { Star as StarSticker } from '../ui/Stickers'
import { useTranslation } from '../../lib/i18n'

// ─── Member count copy ──────────────────────────────────────────────────────
// Soften low/zero counts so seeded + brand-new channels don't read as empty.
function memberLabel(n: number): string {
  if (n <= 0) return '✨ Be the first'
  if (n < 5) return `New · ${n} here`
  return `${n} members`
}

// ─── Behavior-based suggestions ────────────────────────────────────────────

const BEHAVIOR_TAGS: Record<string, string[]> = {
  'pre-pregnancy': ['fertility', 'ttc', 'cycle', 'wellness'],
  pregnancy: ['pregnancy', 'expecting', 'birth', 'prenatal'],
  kids: ['parenting', 'feeding', 'sleep', 'milestones'],
}

// ─── Main Component ────────────────────────────────────────────────────────

export function ChannelsScreen() {
  const { colors, radius, font, stickers, isDark } = useTheme()
  const mode = useModeStore((s) => s.mode)
  const accent = getModeColor(mode, isDark)
  const { t } = useTranslation()

  const [channels, setChannels] = useState<Channel[]>([])
  const [myIds, setMyIds] = useState<string[]>([])
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const unreadCounts = useChannelsStore((s) => s.unreadCounts)
  const fetchUnreadCounts = useChannelsStore((s) => s.fetchUnreadCounts)

  const load = useCallback(async () => {
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
  }, [fetchUnreadCounts])

  // useFocusEffect fires on mount too (screen is focused on mount), so a
  // separate mount useEffect would double-load. This single hook covers both.
  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  const myChannels = channels.filter((c) => myIds.includes(c.id))
  const favoriteChannels = channels.filter((c) => favoriteIds.includes(c.id))
  const trending = channels.slice(0, 5)
  const suggested = channels.filter((c) => {
    const tags = BEHAVIOR_TAGS[mode] ?? []
    const name = c.name.toLowerCase()
    const desc = (c.description ?? '').toLowerCase()
    return tags.some((t) => {
      // Word-boundary match so "pregnancy" doesn't match "pre-pregnancy"
      // (Pre-Pregnancy Trying channel was polluting the pregnancy segment).
      const re = new RegExp(`(?<![a-z-])${t}(?![a-z])`)
      return re.test(name) || re.test(desc)
    })
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
      {/* Header — editorial serif, matches The Village */}
      <View style={styles.header}>
        <Text style={[styles.heading, { color: colors.text, fontFamily: font.display }]}>
          {t('channelsDiscover_heading')}
        </Text>
        <Text style={[styles.subheading, { color: colors.textMuted, fontFamily: font.body }]}>
          {t('channelsDiscover_subheading')}
        </Text>
      </View>

      {/* Auto-scrolling banner carousel */}
      {!search && suggested.length > 0 && (
        <BannerCarousel channels={suggested} myIds={myIds} accent={accent} />
      )}

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}>
        <Search size={18} color={colors.textMuted} strokeWidth={2} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t('channelsDiscover_searchPlaceholder')}
          placeholderTextColor={colors.textMuted}
          style={[styles.searchInput, { color: colors.text }]}
        />
      </View>

      {/* Search results */}
      {searchResults ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>{t('channelsDiscover_results')}</Text>
          {searchResults.length === 0 ? (
            <EmptyState
              title={t('channelsDiscover_noChannels')}
              body={t('channelsDiscover_noChannelsBody')}
            />
          ) : (
            searchResults.map((c) => (
              <ChannelCard key={c.id} channel={c} joined={myIds.includes(c.id)} accent={accent} />
            ))
          )}
        </View>
      ) : (
        <>
          {/* Suggested */}
          {suggested.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>{t('channelsDiscover_suggestedForYou')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                {suggested.map((c) => (
                  <ChannelCardCompact key={c.id} channel={c} joined={myIds.includes(c.id)} accent={accent} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Trending */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <TrendingUp size={16} color={accent} strokeWidth={2.4} />
              <Text style={[styles.sectionTitle, { color: colors.textMuted, marginBottom: 0, fontFamily: font.bodySemiBold }]}>{t('channelsDiscover_trending')}</Text>
            </View>
            {trending.map((c) => (
              <ChannelCard key={c.id} channel={c} joined={myIds.includes(c.id)} unread={unreadCounts[c.id]} accent={accent} />
            ))}
          </View>

          {/* Favorites */}
          {favoriteChannels.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <StarSticker size={16} fill={stickers.yellow} />
                <Text style={[styles.sectionTitle, { color: colors.textMuted, marginBottom: 0, fontFamily: font.bodySemiBold }]}>{t('channelsDiscover_favorites')}</Text>
              </View>
              {favoriteChannels.map((c) => (
                <ChannelCard key={c.id} channel={c} joined={myIds.includes(c.id)} unread={unreadCounts[c.id]} accent={accent} />
              ))}
            </View>
          )}

          {/* My channels */}
          {myChannels.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted, marginBottom: 0, fontFamily: font.bodySemiBold }]}>{t('channelsDiscover_myChannels')}</Text>
              </View>
              {myChannels.map((c) => (
                <ChannelCard key={c.id} channel={c} joined unread={unreadCounts[c.id]} accent={accent} />
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>

    {/* Create Channel FAB — mode-color filled, matches app primary actions */}
    <Pressable
      onPress={() => router.push('/channel/create' as any)}
      style={({ pressed }) => [
        styles.fab,
        { backgroundColor: accent, borderRadius: radius.full, ...shadows.cardPop },
        pressed && { transform: [{ scale: 0.93 }] },
      ]}
    >
      <Plus size={26} color={colors.textInverse} strokeWidth={2.6} />
    </Pressable>
    </View>
  )
}

// ─── Auto-scrolling Banner Carousel ────────────────────────────────────────

const BANNER_W = Dimensions.get('window').width - 40 // padding 20 each side

function BannerCarousel({ channels, myIds, accent }: { channels: Channel[]; myIds: string[]; accent: string }) {
  const { colors, radius, isDark, stickers, font } = useTheme()
  const { t } = useTranslation()
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
              style={[styles.banner, { width: BANNER_W, backgroundColor: sticker.tint, borderRadius: radius.lg }]}
            >
              <View style={[styles.bannerIcon, { backgroundColor: sticker.fill + '38' }]}>
                <StickerIcon size={34} fill={sticker.fill} />
              </View>
              <View style={styles.bannerContent}>
                <Text style={[styles.bannerName, { color: colors.text, fontFamily: font.bodyBold }]} numberOfLines={1}>
                  {c.name}
                </Text>
                <Text style={[styles.bannerDesc, { color: colors.textSecondary, fontFamily: font.body }]} numberOfLines={2}>
                  {c.description ?? t('channelsDiscover_joinConversation')}
                </Text>
                <View style={styles.bannerMeta}>
                  <Text style={[styles.bannerMembers, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
                    {memberLabel(c.memberCount)}
                  </Text>
                  {c.avgRating > 0 && (
                    <View style={styles.bannerRating}>
                      <StarSticker size={12} fill={stickers.yellow} />
                      <Text style={[styles.bannerRatingText, { color: colors.textSecondary, fontFamily: font.bodySemiBold }]}>
                        {c.avgRating.toFixed(1)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              {!joined && (
                <View style={[styles.bannerJoin, { backgroundColor: accent, borderRadius: radius.full }]}>
                  <Text style={[styles.bannerJoinText, { color: colors.textInverse, fontFamily: font.bodyBold }]}>{t('channelsDiscover_joinBtn')}</Text>
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
  const { colors, stickers, font } = useTheme()
  if (count === 0) return null
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={10}
          color={stickers.yellow}
          strokeWidth={2}
          fill={i <= Math.round(rating) ? stickers.yellow : 'none'}
        />
      ))}
      <Text style={[styles.ratingText, { color: colors.textSecondary, fontFamily: font.bodySemiBold }]}>{rating.toFixed(1)}</Text>
    </View>
  )
}

// ─── Empty State ────────────────────────────────────────────────────────────

function EmptyState({ title, body }: { title: string; body: string }) {
  const { colors, font, stickers } = useTheme()
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyStickers}>
        <StarSticker size={34} fill={stickers.yellow} />
        <StarSticker size={26} fill={stickers.pink} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: font.display }]}>{title}</Text>
      <Text style={[styles.emptyBody, { color: colors.textMuted, fontFamily: font.body }]}>{body}</Text>
    </View>
  )
}

// ─── Channel Card (full) ───────────────────────────────────────────────────

function ChannelCard({ channel, joined, unread, accent }: { channel: Channel; joined: boolean; unread?: number; accent: string }) {
  const { colors, radius, isDark, stickers, font } = useTheme()
  const { t } = useTranslation()
  const sticker = channelSticker(channel.id, isDark, channel.avatarUrl)
  const StickerIcon = sticker.Component

  return (
    <Pressable
      onPress={() => router.push(`/channel/${channel.id}` as any)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={[styles.cardIcon, { backgroundColor: sticker.tint }]}>
        <StickerIcon size={26} fill={sticker.fill} />
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.cardName, { color: colors.text, fontFamily: font.bodyBold }]} numberOfLines={1}>
          {channel.name}
        </Text>
        <Text style={[styles.cardDesc, { color: colors.textSecondary, fontFamily: font.body }]} numberOfLines={1}>
          {channel.description ?? t('channelsDiscover_joinConversation')}
        </Text>
      </View>
      <View style={styles.cardRight}>
        {(unread ?? 0) > 0 ? (
          <View style={[styles.unreadBadge, { backgroundColor: accent }]}>
            <Text style={[styles.unreadText, { color: colors.textInverse, fontFamily: font.bodyBold }]}>{unread! > 99 ? '99+' : unread}</Text>
          </View>
        ) : (
          <View style={styles.memberRow}>
            <Users size={12} color={colors.textMuted} strokeWidth={2} />
            <Text style={[styles.memberCount, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
              {channel.memberCount > 0 ? channel.memberCount : 'New'}
            </Text>
          </View>
        )}
        <StarRating rating={channel.avgRating} count={channel.ratingCount} />
        {joined && (
          <View style={[styles.joinedBadge, { backgroundColor: stickers.greenSoft, borderRadius: radius.full }]}>
            <Text style={[styles.joinedText, { color: stickers.greenInk, fontFamily: font.bodyBold }]}>{t('channelsDiscover_joinedBadge')}</Text>
          </View>
        )}
      </View>
    </Pressable>
  )
}

// ─── Channel Card (compact, for horizontal scroll) ─────────────────────────

function ChannelCardCompact({ channel, joined, accent }: { channel: Channel; joined: boolean; accent: string }) {
  const { colors, radius, isDark, stickers, font } = useTheme()
  const { t } = useTranslation()
  const sticker = channelSticker(channel.id, isDark, channel.avatarUrl)
  const StickerIcon = sticker.Component

  return (
    <Pressable
      onPress={() => router.push(`/channel/${channel.id}` as any)}
      style={({ pressed }) => [
        styles.compactCard,
        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={[styles.compactIcon, { backgroundColor: sticker.tint }]}>
        <StickerIcon size={30} fill={sticker.fill} />
      </View>
      <Text style={[styles.compactName, { color: colors.text, fontFamily: font.bodyBold }]} numberOfLines={1}>
        {channel.name}
      </Text>
      <Text style={[styles.compactMembers, { color: colors.textMuted, fontFamily: font.bodySemiBold }]} numberOfLines={1}>
        {memberLabel(channel.memberCount)}
      </Text>
      {joined ? (
        <View style={[styles.joinedBadge, { backgroundColor: stickers.greenSoft, borderRadius: radius.full, marginTop: 4 }]}>
          <Text style={[styles.joinedText, { color: stickers.greenInk, fontFamily: font.bodyBold }]}>{t('channelsDiscover_joinedBadge')}</Text>
        </View>
      ) : (
        <View style={[styles.joinBtn, { backgroundColor: accent, borderRadius: radius.full }]}>
          <Text style={[styles.joinBtnText, { color: colors.textInverse, fontFamily: font.bodyBold }]}>{t('channelsDiscover_joinBtn')}</Text>
        </View>
      )}
    </Pressable>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { marginBottom: 18 },
  heading: { fontSize: 36, letterSpacing: -1, lineHeight: 40 },
  subheading: { fontSize: 14, marginTop: 6, lineHeight: 18 },

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
  sectionTitle: { fontSize: 12, letterSpacing: 1, marginBottom: 12 },

  // Empty state
  emptyWrap: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 24, gap: 8 },
  emptyStickers: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  emptyTitle: { fontSize: 20, letterSpacing: -0.4, textAlign: 'center' },
  emptyBody: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // Horizontal list
  horizontalList: { gap: 12 },

  // Card
  card: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, marginBottom: 8, borderWidth: 1, ...shadows.subtle },
  cardIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardContent: { flex: 1, gap: 2 },
  cardName: { fontSize: 15 },
  cardDesc: { fontSize: 13 },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  memberCount: { fontSize: 12 },
  joinedBadge: { paddingVertical: 2, paddingHorizontal: 8 },
  joinedText: { fontSize: 10 },

  // Unread badge
  unreadBadge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  unreadText: { fontSize: 11 },

  // FAB
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },

  // Compact
  compactCard: { width: 150, padding: 16, alignItems: 'center', gap: 8, borderWidth: 1, ...shadows.subtle },
  compactIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  compactName: { fontSize: 14, textAlign: 'center' },
  compactMembers: { fontSize: 12 },
  joinBtn: { paddingVertical: 7, paddingHorizontal: 22, marginTop: 4 },
  joinBtnText: { fontSize: 13 },
})
