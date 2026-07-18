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
  Alert,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import {
  Search,
  Users,
  TrendingUp,
  Plus,
  Star,
  Bookmark,
} from 'lucide-react-native'
import { useTheme, shadows, getModeColor, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../../constants/theme'
import { useIsDiffuse, SoftBloom } from '../ui/diffuse/DiffuseKit'
import { DiffuseEmptyState, DiffuseBloomIcon } from '../ui/diffuse/DiffusePrimitives'
import { BrandedLoader } from '../ui/BrandedLoader'
import { getChannels, type Channel } from '../../lib/channels'
import { getMyChannelIds, getMyFavoriteChannelIds, getMutedChannelIds, muteChannel, unmuteChannel } from '../../lib/channelPosts'
import { useModeStore } from '../../store/useModeStore'
import { useChannelsStore } from '../../store/useChannelsStore'
import { channelSticker, channelBlob } from '../../lib/channelSticker'
import { Star as StarSticker } from '../ui/Stickers'
import { Character } from '../characters/Characters'
import { useTranslation } from '../../lib/i18n'

// ─── Member count copy ──────────────────────────────────────────────────────
// Soften low/zero counts so seeded + brand-new channels don't read as empty.
function memberLabel(n: number, t: (k: any, p?: any) => string): string {
  if (n <= 0) return t('channelsDiscover_beFirst')
  if (n < 5) return t('channelsDiscover_membersNew', { count: n })
  return t('channelsDiscover_members', { count: n })
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
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const mode = useModeStore((s) => s.mode)
  const accent = diffuse ? getDiffuseAccent(mode, dt.isDark) : getModeColor(mode, isDark)
  const { t } = useTranslation()

  const [channels, setChannels] = useState<Channel[]>([])
  const [myIds, setMyIds] = useState<string[]>([])
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [mutedIds, setMutedIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const unreadCounts = useChannelsStore((s) => s.unreadCounts)
  const fetchUnreadCounts = useChannelsStore((s) => s.fetchUnreadCounts)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [all, ids, favIds, mutes] = await Promise.all([
        getChannels(),
        getMyChannelIds(),
        getMyFavoriteChannelIds(),
        getMutedChannelIds(),
      ])
      setChannels(all)
      setMyIds(ids)
      setFavoriteIds(favIds)
      setMutedIds(mutes)
      fetchUnreadCounts()
    } catch {} finally {
      setLoading(false)
    }
  }, [fetchUnreadCounts])

  async function handleMute(channelId: string) {
    setMutedIds((prev) => [...prev, channelId]) // optimistic — drops from discovery
    try { await muteChannel(channelId) } catch { load() }
  }
  async function handleUnmute(channelId: string) {
    setMutedIds((prev) => prev.filter((id) => id !== channelId))
    try { await unmuteChannel(channelId) } catch { load() }
  }

  // useFocusEffect fires on mount too (screen is focused on mount), so a
  // separate mount useEffect would double-load. This single hook covers both.
  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  // Muted channels drop out of DISCOVERY (suggested/trending) but stay reachable
  // via My channels / Favorites (a user can still open a channel they muted).
  const isMuted = (id: string) => mutedIds.includes(id)
  const discoverable = channels.filter((c) => !isMuted(c.id))
  const myChannels = channels.filter((c) => myIds.includes(c.id))
  const favoriteChannels = channels.filter((c) => favoriteIds.includes(c.id))
  const trending = discoverable.slice(0, 5)
  const suggested = discoverable.filter((c) => {
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
        <View style={styles.headerRow}>
          <Text style={[styles.heading, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.display : font.display }]}>
            {t('channelsDiscover_heading')}
          </Text>
          <Pressable
            onPress={() => router.push('/channel/saved' as any)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.savedBtn,
              { backgroundColor: diffuse ? 'transparent' : colors.surface, borderColor: diffuse ? dt.colors.line : colors.border },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Bookmark size={18} color={diffuse ? dt.colors.ink3 : colors.text} strokeWidth={2} />
          </Pressable>
        </View>
        <Text style={[styles.subheading, { color: diffuse ? dt.colors.ink3 : colors.textMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
          {t('channelsDiscover_subheading')}
        </Text>
      </View>

      {/* Auto-scrolling banner carousel */}
      {!search && suggested.length > 0 && (
        <BannerCarousel channels={suggested} myIds={myIds} accent={accent} />
      )}

      {/* Search */}
      <View style={[styles.searchBar, diffuse
        ? { backgroundColor: dt.colors.surface, borderColor: dt.colors.line, borderRadius: radius.md }
        : { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}>
        <Search size={18} color={diffuse ? dt.colors.ink3 : colors.textMuted} strokeWidth={2} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t('channelsDiscover_searchPlaceholder')}
          placeholderTextColor={diffuse ? dt.colors.ink4 : colors.textMuted}
          style={[styles.searchInput, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.body } : { color: colors.text }]}
        />
      </View>

      {/* Search results */}
      {searchResults ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, sectionTitleStyle(diffuse, dt, colors, font)]}>{t('channelsDiscover_results')}</Text>
          {searchResults.length === 0 ? (
            <EmptyState
              title={t('channelsDiscover_noChannels')}
              body={t('channelsDiscover_noChannelsBody')}
            />
          ) : (
            searchResults.map((c) => (
              <ChannelCard key={c.id} channel={c} joined={myIds.includes(c.id)} accent={accent} muted={isMuted(c.id)} onToggleMute={(id, m) => (m ? handleMute(id) : handleUnmute(id))} />
            ))
          )}
        </View>
      ) : (
        <>
          {/* Suggested */}
          {suggested.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, sectionTitleStyle(diffuse, dt, colors, font)]}>{t('channelsDiscover_suggestedForYou')}</Text>
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
              <TrendingUp size={16} color={diffuse ? dt.colors.ink3 : accent} strokeWidth={2.4} />
              <Text style={[styles.sectionTitle, { marginBottom: 0 }, sectionTitleStyle(diffuse, dt, colors, font)]}>{t('channelsDiscover_trending')}</Text>
            </View>
            {trending.map((c) => (
              <ChannelCard key={c.id} channel={c} joined={myIds.includes(c.id)} unread={unreadCounts[c.id]} accent={accent} muted={isMuted(c.id)} onToggleMute={(id, m) => (m ? handleMute(id) : handleUnmute(id))} />
            ))}
          </View>

          {/* Favorites */}
          {favoriteChannels.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <StarSticker size={16} fill={stickers.yellow} />
                <Text style={[styles.sectionTitle, { marginBottom: 0 }, sectionTitleStyle(diffuse, dt, colors, font)]}>{t('channelsDiscover_favorites')}</Text>
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
                <Text style={[styles.sectionTitle, { marginBottom: 0 }, sectionTitleStyle(diffuse, dt, colors, font)]}>{t('channelsDiscover_myChannels')}</Text>
              </View>
              {myChannels.map((c) => (
                <ChannelCard key={c.id} channel={c} joined unread={unreadCounts[c.id]} accent={accent} />
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>

    {/* Create Channel FAB — mode-color filled (current); calm hairline node (diffuse) */}
    <Pressable
      onPress={() => router.push('/channel/create' as any)}
      style={({ pressed }) => [
        styles.fab,
        diffuse
          ? { backgroundColor: dt.colors.surface, borderRadius: radius.full, borderWidth: 1, borderColor: dt.colors.hairline }
          : { backgroundColor: accent, borderRadius: radius.full, ...shadows.cardPop },
        pressed && { transform: [{ scale: 0.93 }] },
      ]}
    >
      <Plus size={26} color={diffuse ? dt.colors.ink : colors.textInverse} strokeWidth={diffuse ? 1.8 : 2.6} />
    </Pressable>
    </View>
  )
}

// Section eyebrow: mono caps under diffuse, sans-semibold on the cream branch.
function sectionTitleStyle(
  diffuse: boolean,
  dt: ReturnType<typeof useDiffuseTheme>,
  colors: ReturnType<typeof useTheme>['colors'],
  font: ReturnType<typeof useTheme>['font'],
) {
  return diffuse
    ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, textTransform: 'uppercase' as const, letterSpacing: 1.6 }
    : { color: colors.textMuted, fontFamily: font.bodySemiBold }
}

// ─── Auto-scrolling Banner Carousel ────────────────────────────────────────

const BANNER_W = Dimensions.get('window').width - 40 // padding 20 each side

function BannerCarousel({ channels, myIds, accent }: { channels: Channel[]; myIds: string[]; accent: string }) {
  const { colors, radius, isDark, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
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
          const blob = channelBlob(c.name, c.category)
          return (
            <Pressable
              key={c.id}
              onPress={() => router.push(`/channel/${c.id}` as any)}
              style={[styles.banner, diffuse
                ? { width: BANNER_W, backgroundColor: dt.colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: dt.colors.line, overflow: 'hidden' }
                : { width: BANNER_W, backgroundColor: sticker.tint, borderRadius: radius.lg }]}
            >
              {diffuse && <SoftBloom color={sticker.fill} cx="90%" cy="20%" opacity={dt.isDark ? 0.22 : 0.3} spread={0.5} />}
              {diffuse ? (
                <View style={[styles.bannerIcon, { borderWidth: 1, borderColor: dt.colors.line2 }]}>
                  <DiffuseBloomIcon color={sticker.fill} size={40} intensity={0.45}>
                    <Character name={blob} size={30} bg={dt.colors.surface} />
                  </DiffuseBloomIcon>
                </View>
              ) : (
                <View style={[styles.bannerIcon, { backgroundColor: sticker.tint }]}>
                  <Character name={blob} size={34} bg={sticker.tint} />
                </View>
              )}
              <View style={styles.bannerContent}>
                <Text style={[styles.bannerName, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.display : font.bodyBold }]} numberOfLines={1}>
                  {c.name}
                </Text>
                <Text style={[styles.bannerDesc, { color: diffuse ? dt.colors.ink3 : colors.textSecondary, fontFamily: diffuse ? diffuseFont.body : font.body }]} numberOfLines={2}>
                  {c.description ?? t('channelsDiscover_joinConversation')}
                </Text>
                <View style={styles.bannerMeta}>
                  <Text style={[styles.bannerMembers, diffuse
                    ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, textTransform: 'uppercase', letterSpacing: 1 }
                    : { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
                    {memberLabel(c.memberCount, t)}
                  </Text>
                  {c.avgRating > 0 && (
                    <View style={styles.bannerRating}>
                      <StarSticker size={12} fill={stickers.yellow} />
                      <Text style={[styles.bannerRatingText, diffuse
                        ? { color: dt.colors.ink2, fontFamily: diffuseFont.monoBold }
                        : { color: colors.textSecondary, fontFamily: font.bodySemiBold }]}>
                        {c.avgRating.toFixed(1)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              {!joined && (
                <View style={[styles.bannerJoin, diffuse
                  ? { backgroundColor: 'transparent', borderRadius: radius.full, borderWidth: 1, borderColor: dt.colors.line2 }
                  : { backgroundColor: accent, borderRadius: radius.full }]}>
                  <Text style={[styles.bannerJoinText, diffuse
                    ? { color: dt.colors.ink, fontFamily: diffuseFont.monoBold, textTransform: 'uppercase', letterSpacing: 1 }
                    : { color: colors.textInverse, fontFamily: font.bodyBold }]}>{t('channelsDiscover_joinBtn')}</Text>
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
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
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
      <Text style={[styles.ratingText, diffuse
        ? { color: dt.colors.ink2, fontFamily: diffuseFont.monoBold }
        : { color: colors.textSecondary, fontFamily: font.bodySemiBold }]}>{rating.toFixed(1)}</Text>
    </View>
  )
}

// ─── Empty State ────────────────────────────────────────────────────────────

function EmptyState({ title, body }: { title: string; body: string }) {
  const { colors, font, stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  if (diffuse) {
    return (
      <DiffuseEmptyState
        icon={<DiffuseBloomIcon size={40}><Search size={26} color={dt.colors.ink3} strokeWidth={1.6} /></DiffuseBloomIcon>}
        title={title}
        message={body}
      />
    )
  }
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

function ChannelCard({ channel, joined, unread, accent, muted, onToggleMute }: { channel: Channel; joined: boolean; unread?: number; accent: string; muted?: boolean; onToggleMute?: (id: string, muted: boolean) => void }) {
  const { colors, radius, isDark, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const sticker = channelSticker(channel.id, isDark, channel.avatarUrl)
  const blob = channelBlob(channel.name, channel.category)

  return (
    <Pressable
      onPress={() => router.push(`/channel/${channel.id}` as any)}
      onLongPress={onToggleMute ? () => {
        Alert.alert(
          channel.name,
          undefined,
          [
            { text: muted ? t('channels_unmute') : t('channels_mute'), onPress: () => onToggleMute(channel.id, !muted) },
            { text: t('common_cancel'), style: 'cancel' as const },
          ]
        )
      } : undefined}
      style={({ pressed }) => [
        styles.card,
        diffuse
          ? { backgroundColor: dt.colors.surface, borderColor: dt.colors.line, borderRadius: radius.lg, shadowOpacity: 0, elevation: 0 }
          : { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg },
        pressed && { opacity: diffuse ? 0.6 : 0.85 },
      ]}
    >
      {diffuse ? (
        <View style={[styles.cardIcon, { backgroundColor: 'transparent', borderWidth: 1, borderColor: dt.colors.line2 }]}>
          <DiffuseBloomIcon color={sticker.fill} size={32} intensity={0.45}>
            <Character name={blob} size={24} bg={dt.colors.surface} />
          </DiffuseBloomIcon>
        </View>
      ) : (
        <View style={[styles.cardIcon, { backgroundColor: sticker.tint }]}>
          <Character name={blob} size={26} bg={sticker.tint} />
        </View>
      )}
      <View style={styles.cardContent}>
        <Text style={[styles.cardName, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.bodySemiBold : font.bodyBold }]} numberOfLines={1}>
          {channel.name}
        </Text>
        <Text style={[styles.cardDesc, { color: diffuse ? dt.colors.ink3 : colors.textSecondary, fontFamily: diffuse ? diffuseFont.body : font.body }]} numberOfLines={1}>
          {channel.description ?? t('channelsDiscover_joinConversation')}
        </Text>
      </View>
      <View style={styles.cardRight}>
        {(unread ?? 0) > 0 ? (
          diffuse ? (
            <View style={styles.unreadDotRow}>
              <View style={[styles.unreadDot, { backgroundColor: accent }]} />
              <Text style={[styles.unreadText, { color: dt.colors.ink, fontFamily: diffuseFont.monoBold }]}>{unread! > 99 ? '99+' : unread}</Text>
            </View>
          ) : (
            <View style={[styles.unreadBadge, { backgroundColor: accent }]}>
              <Text style={[styles.unreadText, { color: colors.textInverse, fontFamily: font.bodyBold }]}>{unread! > 99 ? '99+' : unread}</Text>
            </View>
          )
        ) : (
          <View style={styles.memberRow}>
            <Users size={12} color={diffuse ? dt.colors.ink3 : colors.textMuted} strokeWidth={2} />
            <Text style={[styles.memberCount, diffuse
              ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono }
              : { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
              {channel.memberCount > 0 ? channel.memberCount : t('channelsDiscover_new')}
            </Text>
          </View>
        )}
        <StarRating rating={channel.avgRating} count={channel.ratingCount} />
        {joined && (
          diffuse ? (
            <View style={[styles.joinedBadge, { backgroundColor: 'transparent', borderRadius: radius.full, borderWidth: 1, borderColor: dt.colors.line2 }]}>
              <Text style={[styles.joinedText, { color: dt.colors.ink3, fontFamily: diffuseFont.mono, textTransform: 'uppercase', letterSpacing: 0.8 }]}>{t('channelsDiscover_joinedBadge')}</Text>
            </View>
          ) : (
            <View style={[styles.joinedBadge, { backgroundColor: stickers.greenSoft, borderRadius: radius.full }]}>
              <Text style={[styles.joinedText, { color: stickers.greenInk, fontFamily: font.bodyBold }]}>{t('channelsDiscover_joinedBadge')}</Text>
            </View>
          )
        )}
      </View>
    </Pressable>
  )
}

// ─── Channel Card (compact, for horizontal scroll) ─────────────────────────

function ChannelCardCompact({ channel, joined, accent }: { channel: Channel; joined: boolean; accent: string }) {
  const { colors, radius, isDark, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const sticker = channelSticker(channel.id, isDark, channel.avatarUrl)
  const blob = channelBlob(channel.name, channel.category)

  return (
    <Pressable
      onPress={() => router.push(`/channel/${channel.id}` as any)}
      style={({ pressed }) => [
        styles.compactCard,
        diffuse
          ? { backgroundColor: dt.colors.surface, borderColor: dt.colors.line, borderRadius: radius.lg, shadowOpacity: 0, elevation: 0 }
          : { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg },
        pressed && { opacity: diffuse ? 0.6 : 0.85 },
      ]}
    >
      {diffuse ? (
        <View style={[styles.compactIcon, { backgroundColor: 'transparent', borderWidth: 1, borderColor: dt.colors.line2 }]}>
          <DiffuseBloomIcon color={sticker.fill} size={34} intensity={0.45}>
            <Character name={blob} size={26} bg={dt.colors.surface} />
          </DiffuseBloomIcon>
        </View>
      ) : (
        <View style={[styles.compactIcon, { backgroundColor: sticker.tint }]}>
          <Character name={blob} size={30} bg={sticker.tint} />
        </View>
      )}
      <Text style={[styles.compactName, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.bodySemiBold : font.bodyBold }]} numberOfLines={1}>
        {channel.name}
      </Text>
      {/* For an empty channel the JOIN button below already carries the CTA, so
          instead of repeating "Be the first" on every suggested card we show the
          short "New" tag (same idiom as the full ChannelCard). */}
      <Text style={[styles.compactMembers, diffuse
        ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, textTransform: 'uppercase', letterSpacing: 0.8 }
        : { color: colors.textMuted, fontFamily: font.bodySemiBold }]} numberOfLines={1}>
        {channel.memberCount > 0 ? memberLabel(channel.memberCount, t) : t('channelsDiscover_new')}
      </Text>
      {joined ? (
        diffuse ? (
          <View style={[styles.joinedBadge, { backgroundColor: 'transparent', borderRadius: radius.full, marginTop: 4, borderWidth: 1, borderColor: dt.colors.line2 }]}>
            <Text style={[styles.joinedText, { color: dt.colors.ink3, fontFamily: diffuseFont.mono, textTransform: 'uppercase', letterSpacing: 0.8 }]}>{t('channelsDiscover_joinedBadge')}</Text>
          </View>
        ) : (
          <View style={[styles.joinedBadge, { backgroundColor: stickers.greenSoft, borderRadius: radius.full, marginTop: 4 }]}>
            <Text style={[styles.joinedText, { color: stickers.greenInk, fontFamily: font.bodyBold }]}>{t('channelsDiscover_joinedBadge')}</Text>
          </View>
        )
      ) : (
        diffuse ? (
          <View style={[styles.joinBtn, { backgroundColor: 'transparent', borderRadius: radius.full, borderWidth: 1, borderColor: dt.colors.line2 }]}>
            <Text style={[styles.joinBtnText, { color: dt.colors.ink, fontFamily: diffuseFont.monoBold, textTransform: 'uppercase', letterSpacing: 1 }]}>{t('channelsDiscover_joinBtn')}</Text>
          </View>
        ) : (
          <View style={[styles.joinBtn, { backgroundColor: accent, borderRadius: radius.full }]}>
            <Text style={[styles.joinBtnText, { color: colors.textInverse, fontFamily: font.bodyBold }]}>{t('channelsDiscover_joinBtn')}</Text>
          </View>
        )
      )}
    </Pressable>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  scroll: { paddingHorizontal: 20, paddingBottom: 96 }, // clears the absolute + FAB (bottom 24 + 56 tall)
  header: { marginBottom: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { fontSize: 36, letterSpacing: -1, lineHeight: 40, flex: 1 },
  savedBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
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
  // Unread indicator (diffuse) — accent dot + mono count, no filled pill
  unreadDotRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  unreadDot: { width: 7, height: 7, borderRadius: 4 },

  // FAB
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },

  // Compact
  compactCard: { width: 150, paddingVertical: 16, paddingHorizontal: 16, alignItems: 'center', gap: 8, borderWidth: 1, ...shadows.subtle },
  compactIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  compactName: { fontSize: 14, textAlign: 'center' },
  compactMembers: { fontSize: 11 },
  joinBtn: { paddingVertical: 7, paddingHorizontal: 22, marginTop: 4 },
  joinBtnText: { fontSize: 13 },
})
