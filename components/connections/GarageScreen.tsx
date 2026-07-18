/**
 * The Village — swipe-deck rework (cream-paper / sticker-collage)
 *
 * Replaces the old Instagram-style scroll feed with a dating-app-style card
 * deck: one listing at a time, swipe RIGHT to keep (saves it to "My Village"),
 * swipe LEFT to pass. Category filters stay pinned at the top. Built on
 * PanResponder + Animated (no gesture-handler dependency in this project).
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { X, Heart, RotateCcw, MessageCircle, Plus, Search, User, LayoutGrid, Layers } from 'lucide-react-native'
import { useTheme, shadows, getModeColor, useDiffuseTheme, getDiffuseAccent, diffuseFont } from '../../constants/theme'
import { useModeStore } from '../../store/useModeStore'
import { useSavedToast } from '../ui/SavedToast'
import { PillButton } from '../ui/PillButton'
import { BrandedLoader } from '../ui/BrandedLoader'
import { Character } from '../characters/Characters'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { DiffuseBloomIcon, DiffuseEmptyState } from '../ui/diffuse/DiffusePrimitives'
import {
  fetchFeed,
  toggleSave,
  type GaragePost,
} from '../../lib/garagePosts'
import { supabase } from '../../lib/supabase'
import { useTranslation } from '../../lib/i18n'

const SCREEN_W = Dimensions.get('window').width
const SCREEN_H = Dimensions.get('window').height
// Card gutter matches the screen margin (header + filter rail use 16) so every
// edge on the screen shares one consistent gutter.
const DECK_H_MARGIN = 16
const CARD_W = SCREEN_W - DECK_H_MARGIN * 2
// Cap card height so it always fits above the action bar on small screens.
const CARD_H = Math.min(SCREEN_H * 0.52, CARD_W * 1.28)
const SWIPE_THRESHOLD = SCREEN_W * 0.28

const FEED_FILTERS = ['For You', 'Clothing', 'Gear', 'Toys', 'Furniture', 'Books']

type ViewMode = 'deck' | 'gallery'

// 3-column gallery grid geometry — screen gutter + inter-tile gap shared with
// the deck's DECK_H_MARGIN so both views line up on the same left/right edge.
const GRID_GAP = 10
const GRID_TILE = (SCREEN_W - DECK_H_MARGIN * 2 - GRID_GAP * 2) / 3

export function GarageScreen() {
  const { colors, radius, stickers, font, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const mode = useModeStore((s) => s.mode)
  const accent = diffuse ? getDiffuseAccent(mode, dt.isDark) : getModeColor(mode, isDark)
  const toast = useSavedToast()

  const [posts, setPosts] = useState<GaragePost[]>([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [activeFilter, setActiveFilter] = useState('For You')
  const [viewMode, setViewMode] = useState<ViewMode>('deck')
  const lastSwipe = useRef<{ post: GaragePost; kept: boolean; saved: boolean } | null>(null)

  // ── Animated values for the top card ──────────────────────────────────────
  const pan = useRef(new Animated.ValueXY()).current
  // 0 → resting, drives overlay-stamp opacity + background-card scale.
  const swipeX = pan.x

  useEffect(() => {
    supabase.auth.getSession()
  }, [])

  const loadFeed = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const category = activeFilter === 'For You' ? undefined : activeFilter
      const data = await fetchFeed({ category })
      setPosts(data)
      setIndex(0)
      pan.setValue({ x: 0, y: 0 })
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [activeFilter, pan])

  // useFocusEffect fires on mount AND on every refocus, so it's the only loader
  // we need — a separate useEffect would double-fetch on open and reset the deck
  // to card 0 every time the screen regains focus mid-swipe.
  useFocusEffect(
    useCallback(() => {
      loadFeed()
    }, [loadFeed])
  )

  // ── Swipe resolution ──────────────────────────────────────────────────────
  // Refs let forceSwipe / panResponder read the latest posts+index without those
  // values being in their dependency arrays — otherwise the PanResponder would be
  // rebuilt on every swipe (new panHandlers mid-animation → stale-handler jank).
  const postsRef = useRef(posts)
  const indexRef = useRef(index)
  useEffect(() => {
    postsRef.current = posts
    indexRef.current = index
  }, [posts, index])

  const advance = useCallback(() => {
    pan.setValue({ x: 0, y: 0 })
    setIndex((i) => i + 1)
  }, [pan])

  const keep = useCallback(
    (post: GaragePost) => {
      // Only issue a save if the card isn't already saved — toggleSave is a real
      // toggle, so calling it on an already-saved post would UN-save it while we
      // tell the user "Kept". Record whether we actually saved so undo can revert.
      const didSave = !post.user_saved
      lastSwipe.current = { post, kept: true, saved: didSave }
      if (didSave) toggleSave(post.id).catch(() => {})
      toast.show({
        title: t('garage_screen_keep_title'),
        message: t('garage_screen_keep_body'),
        autoDismiss: 1600,
      })
    },
    [toast, t]
  )

  const pass = useCallback((post: GaragePost) => {
    lastSwipe.current = { post, kept: false, saved: false }
  }, [])

  const forceSwipe = useCallback(
    (dir: 'left' | 'right') => {
      const post = postsRef.current[indexRef.current]
      if (!post) return
      Animated.timing(pan, {
        toValue: { x: dir === 'right' ? SCREEN_W * 1.4 : -SCREEN_W * 1.4, y: 0 },
        duration: 260,
        useNativeDriver: false,
      }).start(() => {
        if (dir === 'right') keep(post)
        else pass(post)
        advance()
      })
    },
    [pan, keep, pass, advance]
  )

  const resetPosition = useCallback(() => {
    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      friction: 6,
      useNativeDriver: false,
    }).start()
  }, [pan])

  const undo = useCallback(() => {
    if (!lastSwipe.current || indexRef.current === 0) return
    const { post, saved } = lastSwipe.current
    // Only un-save if this swipe is the one that actually created the save.
    if (saved) toggleSave(post.id).catch(() => {})
    lastSwipe.current = null
    pan.setValue({ x: 0, y: 0 })
    setIndex((i) => Math.max(0, i - 1))
  }, [pan])

  // PanResponder lives in a ref-stable object but reads latest via closures.
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) =>
          Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderMove: (_e, g) => {
          pan.setValue({ x: g.dx, y: g.dy * 0.25 })
        },
        onPanResponderRelease: (_e, g) => {
          if (g.dx > SWIPE_THRESHOLD) forceSwipe('right')
          else if (g.dx < -SWIPE_THRESHOLD) forceSwipe('left')
          else resetPosition()
        },
        onPanResponderTerminate: () => resetPosition(),
      }),
    [pan, forceSwipe, resetPosition]
  )

  const rotate = swipeX.interpolate({
    inputRange: [-SCREEN_W / 2, 0, SCREEN_W / 2],
    outputRange: ['-9deg', '0deg', '9deg'],
    extrapolate: 'clamp',
  })
  const keepStampOpacity = swipeX.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })
  const passStampOpacity = swipeX.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })
  const nextCardScale = swipeX.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
    outputRange: [1, 0.94, 1],
    extrapolate: 'clamp',
  })

  const current = posts[index]
  const next = posts[index + 1]
  // Distinguish a genuinely empty feed (nothing was ever there) from a deck the
  // user swiped through — they need different copy.
  const deckEmpty = !loading && posts.length === 0
  const deckDone = !loading && (deckEmpty || index >= posts.length)

  return (
    <View style={[styles.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={[styles.headerTitle, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.display : font.display }]}>
            {t('garage_screen_header_title')}
          </Text>
          <Text style={[styles.headerSubtitle, { color: diffuse ? dt.colors.ink3 : colors.textMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
            {t('garage_screen_header_subtitle')}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <CircleBtn
            onPress={() => setViewMode((m) => (m === 'deck' ? 'gallery' : 'deck'))}
            tint={stickers.lilacSoft}
            radiusFull={radius.full}
            border={colors.border}
            accessibilityLabel={viewMode === 'deck' ? t('garage_screen_view_gallery') : t('garage_screen_view_deck')}
          >
            {viewMode === 'deck'
              ? <LayoutGrid size={18} color={diffuse ? dt.colors.ink : colors.text} strokeWidth={2.2} />
              : <Layers size={18} color={diffuse ? dt.colors.ink : colors.text} strokeWidth={2.2} />}
          </CircleBtn>
          <CircleBtn onPress={() => {}} tint={stickers.blueSoft} radiusFull={radius.full} border={colors.border}>
            <Search size={18} color={diffuse ? dt.colors.ink : colors.text} strokeWidth={2.4} />
          </CircleBtn>
          <CircleBtn
            onPress={() => router.push('/garage/profile' as any)}
            tint={stickers.pinkSoft}
            radiusFull={radius.full}
            border={colors.border}
            accessibilityLabel="My Village"
          >
            <Character name="heart" size={20} color={accent} bg={diffuse ? 'transparent' : stickers.pinkSoft} />
          </CircleBtn>
          <CircleBtn
            onPress={() => router.push('/garage/create' as any)}
            tint={stickers.yellowSoft}
            radiusFull={radius.full}
            border={colors.border}
            accessibilityLabel="Add a listing"
          >
            <Plus size={20} color={diffuse ? dt.colors.ink : colors.text} strokeWidth={2.6} />
          </CircleBtn>
        </View>
      </View>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <FeedFilters active={activeFilter} onSelect={setActiveFilter} />

      {/* ── Gallery grid ────────────────────────────────────────────────── */}
      {viewMode === 'gallery' ? (
        loading && posts.length === 0 ? (
          <View style={styles.deckArea}><BrandedLoader /></View>
        ) : loadError && posts.length === 0 ? (
          <View style={styles.deckArea}><DeckError accent={accent} onRetry={loadFeed} /></View>
        ) : (
          <GalleryGrid
            posts={posts}
            insetsBottom={insets.bottom}
            colors={colors}
            radius={radius}
            font={font}
            stickers={stickers}
            emptyText={t('garage_screen_gallery_empty')}
          />
        )
      ) : (
      <>
      {/* ── Deck ────────────────────────────────────────────────────────── */}
      <View style={styles.deckArea}>
        {loading && posts.length === 0 ? (
          <BrandedLoader />
        ) : loadError && posts.length === 0 ? (
          <DeckError accent={accent} onRetry={loadFeed} />
        ) : deckDone ? (
          <DeckDone accent={accent} onRefresh={loadFeed} empty={deckEmpty} />
        ) : (
          <View style={{ width: CARD_W, height: CARD_H }}>
            {/* Background (next) card */}
            {next && (
              <Animated.View
                style={[
                  styles.cardBase,
                  styles.cardBehind,
                  {
                    backgroundColor: diffuse ? dt.colors.surface : colors.surface,
                    borderColor: diffuse ? dt.colors.line : colors.border,
                    borderRadius: radius.lg,
                    transform: [{ scale: nextCardScale }],
                  },
                ]}
              >
                <SwipeCard post={next} colors={colors} radius={radius} font={font} />
              </Animated.View>
            )}

            {/* Top (active) card */}
            {current && (
              <Animated.View
                key={current.id}
                {...panResponder.panHandlers}
                style={[
                  styles.cardBase,
                  {
                    backgroundColor: diffuse ? dt.colors.surface : colors.surface,
                    borderColor: diffuse ? dt.colors.line : colors.border,
                    borderRadius: radius.lg,
                    transform: [
                      { translateX: pan.x },
                      { translateY: pan.y },
                      { rotate },
                    ],
                    ...(diffuse ? {} : shadows.cardPop),
                  },
                ]}
              >
                <SwipeCard post={current} colors={colors} radius={radius} font={font} />

                {/* KEEP stamp */}
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.stamp,
                    styles.stampKeep,
                    {
                      borderColor: diffuse ? dt.colors.success : stickers.green,
                      opacity: keepStampOpacity,
                      borderRadius: radius.sm,
                      backgroundColor: diffuse ? dt.colors.surface : colors.surface,
                    },
                  ]}
                >
                  <Text style={[styles.stampText, { color: diffuse ? dt.colors.success : stickers.greenInk, fontFamily: diffuse ? diffuseFont.monoBold : font.display }, diffuse && { fontSize: 20, letterSpacing: 2, textTransform: 'uppercase' }]}>
                    {t('garage_screen_stamp_keep')}
                  </Text>
                </Animated.View>

                {/* PASS stamp */}
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.stamp,
                    styles.stampPass,
                    {
                      borderColor: diffuse ? dt.colors.error : stickers.coral,
                      opacity: passStampOpacity,
                      borderRadius: radius.sm,
                      backgroundColor: diffuse ? dt.colors.surface : colors.surface,
                    },
                  ]}
                >
                  <Text style={[styles.stampText, { color: diffuse ? dt.colors.error : stickers.coralInk, fontFamily: diffuse ? diffuseFont.monoBold : font.display }, diffuse && { fontSize: 20, letterSpacing: 2, textTransform: 'uppercase' }]}>
                    {t('garage_screen_stamp_pass')}
                  </Text>
                </Animated.View>

                {/* Tap-to-open hint zone (details) */}
                <Pressable
                  style={styles.detailsTap}
                  onPress={() => router.push(`/garage/${current.id}` as any)}
                  accessibilityRole="button"
                  accessibilityLabel="View item details"
                />
              </Animated.View>
            )}
          </View>
        )}
      </View>

      {/* ── Action bar ──────────────────────────────────────────────────── */}
      {!deckDone && !loading && (
        <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]} key="deck-actionbar">
          <ActionButton
            label="Pass"
            tint={diffuse ? 'transparent' : colors.surface}
            border={diffuse ? dt.colors.line2 : colors.border}
            onPress={() => forceSwipe('left')}
            disabled={!current}
          >
            <X size={26} color={diffuse ? dt.colors.error : stickers.coral} strokeWidth={3} />
          </ActionButton>

          <ActionButton
            small
            label="Undo"
            tint={diffuse ? 'transparent' : colors.surface}
            border={diffuse ? dt.colors.line2 : colors.border}
            onPress={undo}
            disabled={index === 0 || !lastSwipe.current}
          >
            <RotateCcw size={18} color={diffuse ? dt.colors.ink3 : colors.textMuted} strokeWidth={2.5} />
          </ActionButton>

          <ActionButton
            small
            label="Details"
            tint={diffuse ? 'transparent' : colors.surface}
            border={diffuse ? dt.colors.line2 : colors.border}
            onPress={() => current && router.push(`/garage/${current.id}` as any)}
            disabled={!current}
          >
            <MessageCircle size={18} color={diffuse ? dt.colors.ink3 : colors.textMuted} strokeWidth={2.5} />
          </ActionButton>

          <ActionButton
            label="Keep"
            tint={diffuse ? 'transparent' : accent}
            border={accent}
            onPress={() => forceSwipe('right')}
            disabled={!current}
          >
            <Heart size={26} color={diffuse ? accent : colors.text} fill={diffuse ? 'none' : colors.text} strokeWidth={2} />
          </ActionButton>
        </View>
      )}
      </>
      )}
    </View>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function CircleBtn({
  children, onPress, tint, radiusFull, border, accessibilityLabel,
}: {
  children: React.ReactNode
  onPress: () => void
  tint: string
  radiusFull: number
  border: string
  accessibilityLabel?: string
}) {
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  return (
    <Pressable
      hitSlop={8}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.headerCircleBtn,
        diffuse
          ? { backgroundColor: 'transparent', borderRadius: radiusFull, borderColor: dt.colors.line2 }
          : { backgroundColor: tint, borderRadius: radiusFull, borderColor: border },
        pressed && { opacity: 0.85 },
      ]}
    >
      {children}
    </Pressable>
  )
}

// ─── Gallery grid (3-col, tap-to-open) ──────────────────────────────────────

function GalleryGrid({
  posts, insetsBottom, colors, radius, font, stickers, emptyText,
}: {
  posts: GaragePost[]
  insetsBottom: number
  colors: ReturnType<typeof useTheme>['colors']
  radius: ReturnType<typeof useTheme>['radius']
  font: ReturnType<typeof useTheme>['font']
  stickers: ReturnType<typeof useTheme>['stickers']
  emptyText: string
}) {
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()

  if (posts.length === 0) {
    return (
      <View style={styles.deckArea}>
        <View style={styles.galleryEmpty}>
          {diffuse ? (
            <DiffuseBloomIcon size={52} intensity={0.5}>
              <Character name="gift" size={30} bg={dt.colors.bg} />
            </DiffuseBloomIcon>
          ) : (
            <View style={[styles.doneIconBubble, { backgroundColor: stickers.yellowSoft }]}>
              <Character name="gift" size={40} bg={stickers.yellowSoft} />
            </View>
          )}
          <Text style={[styles.galleryEmptyText, { color: diffuse ? dt.colors.ink3 : colors.textMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
            {emptyText}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.gridContent, { paddingBottom: Math.max(insetsBottom, 16) + 24 }]}
    >
      <View style={styles.gridWrap}>
        {posts.map((post) => (
          <GalleryTile key={post.id} post={post} colors={colors} radius={radius} font={font} />
        ))}
      </View>
    </ScrollView>
  )
}

function GalleryTile({
  post, colors, radius, font,
}: {
  post: GaragePost
  colors: ReturnType<typeof useTheme>['colors']
  radius: ReturnType<typeof useTheme>['radius']
  font: ReturnType<typeof useTheme>['font']
}) {
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const cover = post.media[0]?.url
  return (
    <Pressable
      onPress={() => router.push(`/garage/${post.id}` as any)}
      style={({ pressed }) => [
        styles.gridTile,
        {
          backgroundColor: diffuse ? dt.colors.surface : colors.surface,
          borderColor: diffuse ? dt.colors.line : colors.border,
          borderRadius: radius.md,
        },
        pressed && { opacity: 0.72 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={post.caption?.split('\n')[0] ?? post.author_name ?? 'Listing'}
    >
      <View style={styles.gridImageWrap}>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.gridImage} />
        ) : (
          <View style={[styles.gridImage, styles.gridImageEmpty, { backgroundColor: diffuse ? dt.colors.surfaceRaised : colors.surfaceRaised }]}>
            <Character name="gift" size={28} bg={diffuse ? dt.colors.surfaceRaised : colors.surfaceRaised} />
          </View>
        )}
        {post.like_count > 0 && (
          <View style={styles.gridLikes}>
            <Heart size={10} color="#FFFFFF" fill="#FFFFFF" />
            <Text style={[styles.gridLikesText, { fontFamily: diffuse ? diffuseFont.monoBold : font.bodySemiBold }]}>{post.like_count}</Text>
          </View>
        )}
      </View>
      {post.caption ? (
        <Text
          numberOfLines={1}
          style={[styles.gridCaption, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.body : font.bodyMedium }]}
        >
          {post.caption.split('\n')[0]}
        </Text>
      ) : null}
    </Pressable>
  )
}

function SwipeCard({
  post, colors, radius, font,
}: {
  post: GaragePost
  colors: ReturnType<typeof useTheme>['colors']
  radius: ReturnType<typeof useTheme>['radius']
  font: ReturnType<typeof useTheme>['font']
}) {
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const cover = post.media[0]?.url
  return (
    <View style={[styles.cardInner, { borderRadius: radius.lg }]}>
      {cover ? (
        <Image source={{ uri: cover }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, styles.cardImageEmpty, { backgroundColor: diffuse ? dt.colors.surfaceRaised : colors.surfaceRaised }]}>
          {diffuse ? (
            <DiffuseBloomIcon size={56} intensity={0.5}>
              <Character name="gift" size={34} bg={dt.colors.surfaceRaised} />
            </DiffuseBloomIcon>
          ) : (
            <Character name="gift" size={56} bg={colors.surfaceRaised} />
          )}
        </View>
      )}

      {/* Category chip — top-left */}
      {post.category && (
        <View style={[styles.catChip, diffuse
          ? { backgroundColor: dt.colors.surface, borderColor: dt.colors.line2, borderRadius: radius.full }
          : { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.full }]}>
          <Text style={[styles.catChipText, diffuse
            ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, textTransform: 'uppercase', letterSpacing: 1.4 }
            : { color: colors.text, fontFamily: font.bodySemiBold }]}>
            {post.category}
          </Text>
        </View>
      )}

      {/* Bottom info bar over a scrim */}
      <View style={styles.cardFooter}>
        <View style={styles.cardScrim} />
        <View style={styles.cardFooterContent}>
          <View style={[styles.footerAvatar, { backgroundColor: diffuse ? dt.colors.surface : colors.surface }]}>
            <User size={16} color={diffuse ? dt.colors.ink3 : colors.textMuted} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={[styles.footerName, { fontFamily: diffuse ? diffuseFont.display : font.bodySemiBold }]}>
              {post.author_name ?? 'A neighbour'}
            </Text>
            {post.caption ? (
              <Text numberOfLines={1} style={[styles.footerCaption, { fontFamily: diffuse ? diffuseFont.body : font.body }]}>
                {post.caption.split('\n')[0]}
              </Text>
            ) : null}
          </View>
          {post.like_count > 0 && (
            <View style={styles.footerLikes}>
              <Heart size={13} color="#FFFFFF" fill="#FFFFFF" />
              <Text style={[styles.footerLikesText, { fontFamily: diffuse ? diffuseFont.monoBold : font.bodySemiBold }]}>{post.like_count}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  )
}

function ActionButton({
  children, onPress, tint, border, label, small, disabled,
}: {
  children: React.ReactNode
  onPress: () => void
  tint: string
  border: string
  label: string
  small?: boolean
  disabled?: boolean
}) {
  const diffuse = useIsDiffuse()
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        small ? styles.actionBtnSmall : styles.actionBtn,
        {
          backgroundColor: tint,
          borderColor: border,
          opacity: disabled ? 0.4 : pressed ? 0.82 : 1,
          transform: [{ scale: pressed && !disabled ? 0.92 : 1 }],
        },
        !small && !diffuse && shadows.subtle,
      ]}
    >
      {children}
    </Pressable>
  )
}

function FeedFilters({ active, onSelect }: { active: string; onSelect: (f: string) => void }) {
  const { colors, radius, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterScroll}
      contentContainerStyle={styles.filterBar}
    >
      {FEED_FILTERS.map((f) => {
        const isActive = active === f
        return (
          <Pressable
            key={f}
            onPress={() => onSelect(f)}
            style={[
              styles.filterChip,
              diffuse
                ? {
                    backgroundColor: isActive ? dt.colors.surface : 'transparent',
                    borderColor: isActive ? dt.colors.hairline : dt.colors.line,
                    borderRadius: radius.full,
                  }
                : {
                    backgroundColor: isActive ? colors.text : colors.surface,
                    borderColor: isActive ? colors.text : colors.border,
                    borderRadius: radius.full,
                  },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                diffuse
                  ? {
                      color: isActive ? dt.colors.ink : dt.colors.ink3,
                      fontFamily: isActive ? diffuseFont.monoBold : diffuseFont.mono,
                      textTransform: 'uppercase',
                      letterSpacing: 1.4,
                      fontSize: 11,
                    }
                  : {
                      color: isActive ? colors.bg : colors.textSecondary,
                      fontFamily: isActive ? font.bodySemiBold : font.bodyMedium,
                    },
              ]}
            >
              {f}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

function DeckDone({ accent, onRefresh, empty = false }: { accent: string; onRefresh: () => void; empty?: boolean }) {
  const { colors, font, stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const title = empty ? t('garage_screen_empty_title') : t('garage_screen_done_title')
  const body = empty ? t('garage_screen_empty_body') : t('garage_screen_done_body')
  const cta = empty ? t('garage_screen_cta_refresh_short') : t('garage_screen_cta_refresh')

  if (diffuse) {
    return (
      <DiffuseEmptyState
        icon={<DiffuseBloomIcon size={56} intensity={0.5}><Character name={empty ? 'gift' : 'community'} size={30} bg={dt.colors.bg} /></DiffuseBloomIcon>}
        title={title}
        message={body}
        ctaLabel={cta}
        onCta={onRefresh}
        style={styles.doneWrap}
      />
    )
  }

  return (
    <View style={styles.doneWrap}>
      <View style={[styles.doneIconBubble, { backgroundColor: empty ? stickers.yellowSoft : stickers.pinkSoft }]}>
        <Character name={empty ? 'gift' : 'community'} size={44} bg={empty ? stickers.yellowSoft : stickers.pinkSoft} />
      </View>
      <Text style={[styles.doneTitle, { color: colors.text, fontFamily: font.display }]}>
        {title}
      </Text>
      <Text style={[styles.doneBody, { color: colors.textMuted, fontFamily: font.body }]}>
        {body}
      </Text>
      <View style={styles.doneBtn}>
        <PillButton
          variant="accent"
          accentColor={accent}
          label={cta}
          onPress={onRefresh}
        />
      </View>
    </View>
  )
}

function DeckError({ accent, onRetry }: { accent: string; onRetry: () => void }) {
  const { colors, font, stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()

  if (diffuse) {
    return (
      <DiffuseEmptyState
        icon={<DiffuseBloomIcon size={56} intensity={0.5}><Character name="cloud" size={30} bg={dt.colors.bg} /></DiffuseBloomIcon>}
        title={t('garage_screen_error_title')}
        message={t('garage_screen_error_body')}
        ctaLabel="Try again"
        onCta={onRetry}
        style={styles.doneWrap}
      />
    )
  }

  return (
    <View style={styles.doneWrap}>
      <View style={[styles.doneIconBubble, { backgroundColor: stickers.blueSoft }]}>
        <Character name="cloud" size={42} bg={stickers.blueSoft} />
      </View>
      <Text style={[styles.doneTitle, { color: colors.text, fontFamily: font.display }]}>
        {t('garage_screen_error_title')}
      </Text>
      <Text style={[styles.doneBody, { color: colors.textMuted, fontFamily: font.body }]}>
        {t('garage_screen_error_body')}
      </Text>
      <View style={styles.doneBtn}>
        <PillButton variant="accent" accentColor={accent} label="Try again" onPress={onRetry} />
      </View>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 36, letterSpacing: -1, lineHeight: 40 },
  headerSubtitle: { fontSize: 14, marginTop: 4, lineHeight: 18 },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingTop: 4 },
  headerCircleBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  // The filter rail sits in a flex:1 column (sibling of deckArea). Without
  // flexGrow:0 + a fixed height, a horizontal ScrollView gets stretched to fill
  // the leftover column height and its chips (alignItems:stretch) balloon into
  // tall vertical bars. Pin the rail height so the pills stay pill-shaped.
  filterScroll: { flexGrow: 0, flexShrink: 0 },
  filterBar: { gap: 8, paddingHorizontal: 16, paddingTop: 2, paddingBottom: 12, alignItems: 'center' },
  filterChip: {
    height: 38,
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderWidth: 1,
  },
  filterText: { fontSize: 13 },

  // Deck — symmetric padding gives even breathing room above/below the card
  // instead of flex-centering (which floated the card with uneven slack).
  deckArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 22 },
  cardBase: {
    position: 'absolute',
    width: CARD_W,
    height: CARD_H,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardBehind: { top: 0 },
  cardInner: { flex: 1, overflow: 'hidden' },
  cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  cardImageEmpty: { alignItems: 'center', justifyContent: 'center' },

  catChip: {
    position: 'absolute',
    top: 14,
    left: 14,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  catChipText: { fontSize: 12, letterSpacing: 0.2 },

  // Footer + scrim sit ON the user's photo (arbitrary content), so fixed
  // white text / dark scrim are the correct legible choice here — theme tokens
  // would be unreadable over a bright or dark photo. (Media-overlay exception.)
  cardFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 96, justifyContent: 'flex-end' },
  cardScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20,19,19,0.42)' },
  cardFooterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  footerAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  footerName: { fontSize: 15, color: '#FFFFFF' },
  footerCaption: { fontSize: 12, color: 'rgba(255,255,255,0.82)', marginTop: 1 },
  footerLikes: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerLikesText: { fontSize: 13, color: '#FFFFFF' },

  // Stamps
  stamp: {
    position: 'absolute',
    top: 28,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderWidth: 3,
    // backgroundColor set inline (colors.surface) so the stamp flips per theme.
  },
  stampKeep: { left: 22, transform: [{ rotate: '-14deg' }] },
  stampPass: { right: 22, transform: [{ rotate: '14deg' }] },
  stampText: { fontSize: 26, letterSpacing: 1 },

  // Invisible tap zone covering the card center (above footer/stamps so a tap
  // without a drag opens details; the PanResponder still wins on horizontal drag).
  detailsTap: { position: 'absolute', top: 70, left: 20, right: 20, bottom: 110 },

  // Action bar
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingTop: 20,
    // paddingBottom is applied inline (safe-area aware) to clear the tab bar.
  },
  actionBtn: {
    width: 64,
    height: 64,
    borderRadius: 999, // radius.full — circular
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnSmall: {
    width: 46,
    height: 46,
    borderRadius: 999, // radius.full — circular
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Gallery grid (3-col)
  gridContent: { paddingHorizontal: DECK_H_MARGIN, paddingTop: 4 },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  gridTile: { width: GRID_TILE, borderWidth: 1, overflow: 'hidden' },
  gridImageWrap: { width: '100%', height: GRID_TILE, position: 'relative' },
  gridImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  gridImageEmpty: { alignItems: 'center', justifyContent: 'center' },
  gridLikes: {
    position: 'absolute', bottom: 6, right: 6,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(20,19,19,0.42)', borderRadius: 999,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  gridLikesText: { fontSize: 10, color: '#FFFFFF' },
  gridCaption: { fontSize: 11, lineHeight: 15, paddingHorizontal: 7, paddingVertical: 6 },
  galleryEmpty: { alignItems: 'center', gap: 12, paddingHorizontal: 40 },
  galleryEmptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // Done state
  doneWrap: { alignItems: 'center', paddingHorizontal: 40, gap: 10 },
  doneIconBubble: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  doneTitle: { fontSize: 24, letterSpacing: -0.5, textAlign: 'center' },
  doneBody: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  doneBtn: { marginTop: 16, alignSelf: 'stretch', paddingHorizontal: 8 },
})
