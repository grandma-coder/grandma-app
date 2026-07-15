/**
 * Tab Navigator — 5 tabs with elevated center Grandma button
 *
 * Layout: Home | Calendar | [Grandma] | Analytics | Profile
 * Center button opens radial arc menu with staggered spring animation.
 * Smooth fade transition when behavior switches via Profile.
 */

import { useState, useEffect, useRef, useCallback, ReactElement } from 'react'
import { View, Text, Pressable, Modal, Animated, StyleSheet, Dimensions } from 'react-native'
import { Tabs, router } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getUnreadCount } from '../../lib/notifications'
import { supabase } from '../../lib/supabase'
import {
  Home, Calendar, BarChart3, User, Sparkles, Plus,
  MessageCircle, Lightbulb, ShoppingBag, Users, Gift,
  LucideIcon,
} from 'lucide-react-native'
import Svg, { Path } from 'react-native-svg'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useModeStore } from '../../store/useModeStore'
import { useBehaviorStore } from '../../store/useBehaviorStore'
import { useJourneyStore } from '../../store/useJourneyStore'
import { useProfile } from '../../lib/useProfile'
import { getModeConfig } from '../../lib/modeConfig'
import { useTheme, brand, getModeColor, font, useDiffuseTheme, getDiffuseAccent, diffuseFont } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import { Burst, Blob, Flower, Squishy, Heart, Star, Drop, StickerPalette } from '../../components/stickers/BrandStickers'
import { useIsDiffuse, SoftBloom, DiffuseArrow } from '../../components/ui/diffuse/DiffuseKit'
import { DiffuseBloomIcon } from '../../components/ui/diffuse/DiffusePrimitives'
import { GrandmaLogo } from '../../components/ui/GrandmaLogo'

// ─── Collage Strip constants ───────────────────────────────────────────────
const STRIP_HEIGHT = 84
const STICKER_TAB_SIZE = 46
const CENTER_BURST_SIZE = 72
const STICKER_INK = '#141313'

const SCREEN_W = Dimensions.get('window').width
const SCREEN_H = Dimensions.get('window').height

// Swiss-grotesque prototype font (Helvetica-like) — Hanken Grotesk is already
// loaded in _layout's useFonts, so no install/rebuild needed.
const SWISS = 'HankenGrotesk_700Bold'
const SWISS_MED = 'HankenGrotesk_500Medium'

// ─── Grandma Central Menu — fan-open sticker overlay ───────────────────────
// Each action gets a distinct sticker shape from the brand vocabulary.
// On open: items stack at the + pivot, then fan out in a leque with
// staggered timing. Scrim adapts to light/dark (cream wash / ink wash).

type StickerRenderer = (props: { size: number }) => ReactElement
interface WheelItem {
  id: string
  labelKey: 'menu_grandmaTalk' | 'menu_insights' | 'menu_dailyRewards' | 'menu_garage' | 'menu_channels'
  subtitleKey: 'menu_insights_sub' | 'menu_dailyRewards_sub' | 'menu_grandmaTalk_sub' | 'menu_garage_sub' | 'menu_channels_sub'
  icon: LucideIcon
  route: string
  rotation: number // degrees of playful tilt
  sticker: StickerRenderer
  accent: string // Diffuse: bloom color behind the line icon (parallel to the sticker fill)
}

const WHEEL_ITEMS: WheelItem[] = [
  {
    id: 'insights',
    labelKey: 'menu_insights',
    subtitleKey: 'menu_insights_sub',
    icon: Sparkles,
    route: '/insights',
    rotation: -6,
    sticker: ({ size }) => <Burst size={size} fill={StickerPalette.yellow} points={12} />,
    accent: StickerPalette.yellow,
  },
  {
    id: 'rewards',
    labelKey: 'menu_dailyRewards',
    subtitleKey: 'menu_dailyRewards_sub',
    icon: Gift,
    route: '/daily-rewards',
    rotation: 4,
    sticker: ({ size }) => <Flower size={size} petal={StickerPalette.pink} center={StickerPalette.yellow} />,
    accent: StickerPalette.pink,
  },
  {
    id: 'chat',
    labelKey: 'menu_grandmaTalk',
    subtitleKey: 'menu_grandmaTalk_sub',
    icon: MessageCircle,
    route: '/grandma-talk',
    rotation: -8,
    sticker: ({ size }) => <Blob size={size} fill={StickerPalette.lilac} variant={1} />,
    accent: StickerPalette.lilac,
  },
  {
    id: 'garage',
    labelKey: 'menu_garage',
    subtitleKey: 'menu_garage_sub',
    icon: ShoppingBag,
    route: '/connections',
    rotation: 6,
    sticker: ({ size }) => <Squishy w={size * 1.15} h={size * 0.78} fill={StickerPalette.green} />,
    accent: StickerPalette.green,
  },
  {
    id: 'channels',
    labelKey: 'menu_channels',
    subtitleKey: 'menu_channels_sub',
    icon: Users,
    route: '/connections?tab=channels',
    rotation: -4,
    sticker: ({ size }) => <Blob size={size} fill={StickerPalette.peach} variant={2} />,
    accent: StickerPalette.peach,
  },
]

// Fan layout — items arc from lower-left (210°) to lower-right (330°),
// radiating upward from a pivot at the + button. Wider R lets the labels
// breathe under each sticker without colliding with the headline above.
const FAN_RADIUS = 168
const FAN_START_DEG = 210
const FAN_END_DEG = 330
const STICKER_SIZE = 84
const ICON_SIZE = 20

function CenterTabButton() {
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const { colors, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const mode = useModeStore((s) => s.mode)
  const accentColor = diffuse ? getDiffuseAccent(mode, dt.isDark) : getModeColor(mode, isDark)
  const { data: profile } = useProfile()
  const parentName = useJourneyStore((s) => s.parentName)
  // Prefer the saved profile name; fall back to the onboarding journey name,
  // then to the friendly default. Use only the first token so long names stay
  // on one line in the headline.
  const fullName = (profile?.name ?? parentName ?? '').trim()
  const userName = fullName.split(/\s+/)[0] || 'dear'
  const [open, setOpen] = useState(false)
  // Diffuse word-stack: which destination is focused (shows its subtitle + is
  // the target of GO). Defaults to the middle item.
  const [focusedIdx, setFocusedIdx] = useState(Math.floor(WHEEL_ITEMS.length / 2))

  // Animated values
  const overlayAnim = useRef(new Animated.Value(0)).current
  const spinAnim = useRef(new Animated.Value(0)).current
  const itemAnims = useRef(WHEEL_ITEMS.map(() => new Animated.Value(0))).current
  // Diffuse FAB press feedback — a slight squish on touch-down that springs back
  // on release, so the eye button feels tactile (the "little slight effect").
  const fabPress = useRef(new Animated.Value(1)).current

  const animateOpen = useCallback(() => {
    setOpen(true)
    setFocusedIdx(Math.floor(WHEEL_ITEMS.length / 2))
    Animated.timing(overlayAnim, { toValue: 1, duration: 260, useNativeDriver: true }).start()
    Animated.spring(spinAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start()
    // Fan (leque) open — stagger per item, spring out from pivot
    itemAnims.forEach((anim, i) => {
      Animated.spring(anim, {
        toValue: 1,
        friction: 6,
        tension: 70,
        delay: i * 60,
        useNativeDriver: true,
      }).start()
    })
  }, [overlayAnim, spinAnim, itemAnims])

  const animateClose = useCallback(() => {
    ;[...itemAnims].reverse().forEach((anim, i) => {
      Animated.timing(anim, { toValue: 0, duration: 140, delay: i * 25, useNativeDriver: true }).start()
    })
    Animated.spring(spinAnim, { toValue: 0, friction: 6, tension: 80, useNativeDriver: true }).start()
    Animated.timing(overlayAnim, { toValue: 0, duration: 220, delay: 80, useNativeDriver: true }).start(() => {
      setOpen(false)
    })
  }, [overlayAnim, spinAnim, itemAnims])

  function handleItem(route: string) {
    animateClose()
    setTimeout(() => router.push(route as any), 360)
  }

  // Shared rotation + scale on the + button itself
  const rotation = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '135deg'] })
  const pulse = spinAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.12, 1] })

  // Fan pivot sits at the approximate + button center.
  const pivotX = SCREEN_W / 2
  const pivotY = SCREEN_H - insets.bottom - 44 - 14

  // Theme-aware scrim — fully opaque paper/ink so the home screen never
  // bleeds through and competes with the menu's typography.
  const scrimColor = diffuse ? dt.colors.bg : (isDark ? '#0E0B08' : StickerPalette.cream)
  const inkColor = diffuse ? dt.colors.ink : (isDark ? '#F5EDDC' : '#141313')
  const ink3Color = diffuse ? dt.colors.ink3 : (isDark ? 'rgba(245,237,220,0.55)' : '#6E6763')

  return (
    <>
      {/* Tab bar button — Burst sticker, raised above the strip */}
      <View style={styles.centerWrapper}>
        <Pressable
          onPress={open ? animateClose : animateOpen}
          onPressIn={() =>
            Animated.spring(fabPress, { toValue: 0.9, friction: 6, tension: 220, useNativeDriver: true }).start()
          }
          onPressOut={() =>
            Animated.spring(fabPress, { toValue: 1, friction: 4, tension: 180, useNativeDriver: true }).start()
          }
          hitSlop={12}
        >
          {diffuse ? (
            // The center button IS the app icon — the heart-eye Grandma mark.
            // Its motion is wired to the menu: idle it blinks softly; while the
            // fan menu is open it does the heart "squeeze", so the button reads
            // as the living entry point that opened the menu (not a static +).
            // A contained accent bloom sits behind the eye and blooms brighter
            // as the menu opens (driven by spinAnim). fabPress adds the tactile
            // touch-down squish.
            <Animated.View
              style={[
                diffuseFab.node,
                {
                  backgroundColor: dt.colors.surface,
                  borderColor: dt.colors.line2,
                  transform: [{ scale: Animated.multiply(pulse, fabPress) }],
                },
              ]}
            >
              <View pointerEvents="none" style={diffuseFab.bloom}>
                <SoftBloom color={accentColor} opacity={dt.isDark ? 0.5 : 0.62} spread={0.55} radius="72%" />
              </View>
              {/* Bloom intensifier — a second accent wash that fades in only
                  while the menu is open, so opening the menu visibly lights up
                  the eye. */}
              <Animated.View pointerEvents="none" style={[diffuseFab.bloom, { opacity: spinAnim }]}>
                <SoftBloom color={accentColor} opacity={dt.isDark ? 0.55 : 0.5} spread={0.35} radius="55%" />
              </Animated.View>
              <GrandmaLogo
                size={42}
                mode="auto"
                motion={open ? 'squeeze' : 'blinkOnly'}
                stroke={5}
              />
            </Animated.View>
          ) : (
          <Animated.View
            style={[
              styles.centerBurstWrap,
              { shadowColor: STICKER_INK, transform: [{ rotate: rotation }, { scale: pulse }] },
            ]}
          >
            <Burst size={CENTER_BURST_SIZE} fill={StickerPalette.coral} stroke={STICKER_INK} points={11} wobble={0.26} />
            <View style={styles.centerSparkleAbs} pointerEvents="none">
              <Plus size={26} color={STICKER_INK} strokeWidth={3} />
            </View>
          </Animated.View>
          )}
        </Pressable>
      </View>

      {/* Modal: scrim + fan items */}
      <Modal visible={open} transparent animationType="none" statusBarTranslucent onRequestClose={animateClose}>
        {/* Cream/ink scrim — tap to dismiss */}
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: scrimColor, opacity: overlayAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={animateClose} />
        </Animated.View>

        {/* ── Diffuse: immersive word-stack menu ─────────────────────────────
            A big soft breathing mode-accent bloom + a vertical stack of the
            destinations as large serif words. The focused word shows its
            subtitle; tap a word to focus, tap the focused word (or GO) to go. */}
        {diffuse ? (
          <>
            {/* Aurora field — layered multi-hue blooms (pink · coral · peach ·
                blue · lilac) drifting across the canvas, blended over the mode
                accent. Each SoftBloom fades to transparent at its edge, so
                overlapping them yields a soft pastel-gradient wash rather than
                one flat mode tint. Opacities are lower in dark so it stays calm. */}
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: overlayAnim }]}>
              {/* Mode-accent anchor — keeps the menu feeling on-brand for the journey. */}
              <SoftBloom color={accentColor} cx="50%" cy="44%" opacity={dt.isDark ? 0.34 : 0.42} spread={0.4} radius="62%" />
              {/* Warm top-left pink → coral core, matching the reference aurora. */}
              <SoftBloom color={StickerPalette.pink} cx="26%" cy="30%" opacity={dt.isDark ? 0.3 : 0.5} spread={0.45} radius="60%" />
              <SoftBloom color={StickerPalette.coral} cx="42%" cy="58%" opacity={dt.isDark ? 0.26 : 0.4} spread={0.4} radius="52%" />
              <SoftBloom color={StickerPalette.peach} cx="34%" cy="72%" opacity={dt.isDark ? 0.24 : 0.36} spread={0.42} radius="48%" />
              {/* Cool sky-blue drift on the right edge for the pastel contrast. */}
              <SoftBloom color={StickerPalette.blue} cx="82%" cy="34%" opacity={dt.isDark ? 0.3 : 0.46} spread={0.42} radius="56%" />
              <SoftBloom color={StickerPalette.lilac} cx="74%" cy="70%" opacity={dt.isDark ? 0.24 : 0.34} spread={0.4} radius="50%" />
            </Animated.View>

            {/* Prompt — lowercase Swiss, accent name. */}
            <Animated.View pointerEvents="none" style={[styles.prompt, { top: insets.top + 72, opacity: overlayAnim }]}>
              <Text style={[styles.promptKicker, { color: ink3Color, fontFamily: SWISS_MED, letterSpacing: 1.6 }]}>menu</Text>
              <Text style={[styles.promptLine, { color: inkColor, fontFamily: SWISS, letterSpacing: -1, textTransform: 'lowercase' }]}>
                {t('tabFan_whereTo')}
                <Text style={{ color: accentColor }}>{`${userName}?`}</Text>
              </Text>
            </Animated.View>

            {/* Centered vertical word-stack. */}
            <View style={styles.wordStack} pointerEvents="box-none">
              {WHEEL_ITEMS.map((item, i) => {
                const focused = i === focusedIdx
                const anim = itemAnims[i]
                return (
                  <Animated.View
                    key={item.id}
                    style={{
                      opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0, focused ? 1 : 0.3] }),
                      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
                    }}
                  >
                    <Pressable
                      onPress={() => (focused ? handleItem(item.route) : setFocusedIdx(i))}
                      style={({ pressed }) => [styles.wordRow, { opacity: pressed ? 0.6 : 1 }]}
                    >
                      <Text style={[styles.word, { color: focused ? inkColor : ink3Color, fontFamily: SWISS, letterSpacing: -0.8 }]}>
                        {t(item.labelKey).toLowerCase()}
                      </Text>
                      {focused ? (
                        <Text style={[styles.wordSub, { color: ink3Color, fontFamily: SWISS_MED, letterSpacing: 1.4 }]} numberOfLines={1}>
                          {t(item.subtitleKey)}
                        </Text>
                      ) : null}
                    </Pressable>
                  </Animated.View>
                )
              })}
            </View>

            {/* GO CTA. */}
            <Animated.View style={[styles.goWrap, { bottom: insets.bottom + 40, opacity: overlayAnim }]}>
              <Pressable
                onPress={() => handleItem(WHEEL_ITEMS[focusedIdx].route)}
                style={({ pressed }) => [styles.goPill, { borderColor: dt.colors.line2, backgroundColor: dt.colors.surface, opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={[styles.goText, { color: dt.colors.ink, fontFamily: SWISS }]}>go</Text>
                <DiffuseArrow color={accentColor} size={18} />
              </Pressable>
            </Animated.View>
          </>
        ) : (
        <>

        {/* Decorative sticker confetti — sits above scrim, below tiles.
            Hidden under Diffuse (the calm variant has no collage confetti). */}
        {!diffuse && (<>
        <Animated.View
          pointerEvents="none"
          style={[styles.confetti, { top: 76, left: 26, transform: [{ rotate: '-18deg' }], opacity: overlayAnim }]}
        >
          <Star size={40} fill={StickerPalette.yellow} />
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[styles.confetti, { top: 120, right: 28, transform: [{ rotate: '14deg' }], opacity: overlayAnim }]}
        >
          <Heart size={32} fill={StickerPalette.coral} />
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[styles.confetti, { top: 200, left: 36, transform: [{ rotate: '8deg' }], opacity: overlayAnim }]}
        >
          <Drop size={28} fill={StickerPalette.blue} />
        </Animated.View>
        </>)}

        {/* Prompt — "where to, dear?" serif + italic accent.
            Sits well below the status bar in its own band so it never
            collides with the home greeting underneath. */}
        <Animated.View
          pointerEvents="none"
          style={[styles.prompt, { top: insets.top + 88, opacity: overlayAnim }]}
        >
          <Text style={[styles.promptKicker, { color: ink3Color }]}>{t('tabFan_kicker')}</Text>
          <Text style={[styles.promptLine, { color: inkColor }]}>
            {t('tabFan_whereTo')}
            <Text style={[styles.promptItalic, { color: accentColor }]}>{`${userName}?`}</Text>
          </Text>
          <View style={[styles.promptRule, { backgroundColor: ink3Color }]} />
          <Text style={[styles.promptCaps, { color: ink3Color }]}>{t('tabFan_pickCorner')}</Text>
        </Animated.View>

        {/* Fan items */}
        {WHEEL_ITEMS.map((item, i) => {
          const Icon = item.icon
          const anim = itemAnims[i]
          const total = WHEEL_ITEMS.length
          const t01 = total === 1 ? 0.5 : i / (total - 1)
          const deg = FAN_START_DEG + (FAN_END_DEG - FAN_START_DEG) * t01
          const rad = (deg * Math.PI) / 180
          const finalX = Math.cos(rad) * FAN_RADIUS
          const finalY = Math.sin(rad) * FAN_RADIUS

          // Items start stacked at pivot with scale 0.55 + no rotation, end at their fanned position.
          const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, finalX] })
          const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, finalY] })
          const itemScale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] })
          const itemOpacity = anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.6, 1] })
          const itemRotate = anim.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', `${item.rotation}deg`],
          })

          return (
            <Animated.View
              key={item.id}
              pointerEvents="box-none"
              style={[
                styles.fanItemWrap,
                {
                  left: pivotX,
                  top: pivotY,
                  opacity: itemOpacity,
                  transform: [
                    { translateX },
                    { translateY },
                    { translateX: -60 }, // center the 120-wide tile on the pivot
                    { translateY: -STICKER_SIZE / 2 - 18 },
                    { scale: itemScale },
                    { rotate: itemRotate },
                  ],
                },
              ]}
            >
              <Pressable
                onPress={() => handleItem(item.route)}
                style={({ pressed }) => [
                  styles.fanItem,
                  pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] },
                ]}
              >
                {/* Icon glyph — Diffuse: Lucide line icon over a soft bloom;
                    current: collage sticker with the icon stacked on top. */}
                {diffuse ? (
                  <View style={styles.stickerStack}>
                    <DiffuseBloomIcon color={item.accent} size={STICKER_SIZE * 0.72} intensity={0.55}>
                      <Icon size={ICON_SIZE + 2} color={dt.colors.ink3} strokeWidth={1.5} />
                    </DiffuseBloomIcon>
                  </View>
                ) : (
                  <View style={styles.stickerStack}>
                    <View style={StyleSheet.absoluteFill}>{item.sticker({ size: STICKER_SIZE })}</View>
                    <Icon size={ICON_SIZE} color="#141313" strokeWidth={2} />
                  </View>
                )}

                {/* Label — Diffuse: hairline chip + mono; current: paper chip. */}
                <View style={{ transform: [{ rotate: `${-item.rotation}deg` }], alignItems: 'center', marginTop: 8 }}>
                  <View style={[styles.labelPill, diffuse
                    ? { backgroundColor: 'transparent', borderColor: dt.colors.line2 }
                    : { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.labelText, diffuse
                      ? { color: dt.colors.ink, fontFamily: diffuseFont.mono, letterSpacing: 1, textTransform: 'uppercase', fontSize: 10 }
                      : { color: inkColor }]} numberOfLines={1}>
                      {t(item.labelKey)}
                    </Text>
                  </View>
                  <Text style={[styles.subtitle, diffuse
                    ? { color: dt.colors.ink3, fontFamily: diffuseFont.body }
                    : { color: ink3Color }]} numberOfLines={1}>
                    {t(item.subtitleKey)}
                  </Text>
                </View>
              </Pressable>
            </Animated.View>
          )
        })}
        </>
        )}
      </Modal>
    </>
  )
}

// ─── Collage Strip — torn-paper bottom bar with sticker tabs ──────────────

interface TabStickerCfg {
  icon: LucideIcon
  label: string
  color: string
}

function TornEdge({ width, color }: { width: number; color: string }) {
  // Wavy/zig-zag torn paper top edge — deterministic but irregular.
  const segs = 26
  const segW = width / segs
  const heights = [3, 7, 2, 5, 8, 4, 6, 3, 9, 5, 2, 6, 4, 8, 3, 5, 7, 2, 6, 4, 9, 3, 5, 8, 2, 6, 4]
  let d = `M0,${STRIP_HEIGHT} L0,10 `
  for (let i = 0; i <= segs; i++) {
    const x = (i * segW).toFixed(1)
    const y = heights[i % heights.length]
    d += `L${x},${y} `
  }
  d += `L${width},${STRIP_HEIGHT} Z`
  return (
    <Svg
      width={width}
      height={STRIP_HEIGHT}
      style={StyleSheet.absoluteFillObject}
      pointerEvents="none"
    >
      <Path d={d} fill={color} />
    </Svg>
  )
}

function useUnreadNotificationCount() {
  const queryClient = useQueryClient()

  const { data: count = 0 } = useQuery({
    queryKey: ['notification-count'],
    queryFn: getUnreadCount,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  })

  useEffect(() => {
    const channel = supabase
      .channel(`notification-count-tabbar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notification-count'] })
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  return count
}

function CollageStripTabBar(props: BottomTabBarProps) {
  const diffuse = useIsDiffuse()
  return diffuse ? <DiffuseStripTabBar {...props} /> : <CurrentStripTabBar {...props} />
}

function CurrentStripTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const { isDark } = useTheme()
  const { t } = useTranslation()
  const screenW = Dimensions.get('window').width
  const unreadNotifications = useUnreadNotificationCount()
  const mode = useModeStore((s) => s.mode)
  const modeConfig = getModeConfig(mode)

  // Tab labels come from modeConfig. Falls back to the i18n string if the
  // modeConfig label is missing.
  // The vault slot means different things per mode: pre-preg + pregnancy both
  // Every mode's "vault" slot now surfaces analytics/insights (kids included —
  // the tab renders KidsAnalytics, not a document vault), so it's the chart icon
  // across the board.
  const vaultIcon: LucideIcon = BarChart3

  const TAB_CFG: Record<string, TabStickerCfg> = {
    index:    { icon: Home,      label: modeConfig.tabs.index.label   || t('tab_home'),      color: StickerPalette.yellow },
    agenda:   { icon: Calendar,  label: modeConfig.tabs.agenda.label  || t('tab_calendar'),  color: StickerPalette.blue },
    vault:    { icon: vaultIcon, label: modeConfig.tabs.vault.label   || t('tab_analytics'), color: StickerPalette.green },
    settings: { icon: User,      label: modeConfig.tabs.settings.label || t('tab_profile'),  color: StickerPalette.lilac },
  }

  // Filter to visible routes — expo-router converts href:null into
  // tabBarItemStyle:{display:'none'} + tabBarButton:()=>null. Detect either.
  const visible = state.routes.filter((r) => {
    const opts = descriptors[r.key].options as any
    if (opts.tabBarButton && opts.tabBarItemStyle?.display === 'none') return false
    if (opts.href === null) return false
    return true
  })

  // Paper color — cream in light mode, parchment in dark
  const paperColor = isDark ? '#2C2820' : StickerPalette.cream
  const inkColor = isDark ? StickerPalette.cream : STICKER_INK
  const labelMutedColor = isDark ? 'rgba(245,237,220,0.6)' : '#6E6763'

  return (
    <View style={[stripStyles.wrap, { paddingBottom: insets.bottom, backgroundColor: paperColor }]}>
      <TornEdge width={screenW} color={paperColor} />
      <View style={[stripStyles.row, { backgroundColor: paperColor }]}>
        {visible.map((route) => {
          const isFocused = state.routes[state.index]?.key === route.key

          if (route.name === 'library') {
            return (
              <View key={route.key} style={stripStyles.cell}>
                <CenterTabButton />
              </View>
            )
          }

          const cfg = TAB_CFG[route.name]
          if (!cfg) return null
          const Icon = cfg.icon

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            })
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name as never)
            }
          }

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={stripStyles.cell}
              accessibilityRole="button"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={cfg.label}
            >
              <View
                style={[
                  stripStyles.tabSticker,
                  {
                    backgroundColor: cfg.color,
                    borderColor: STICKER_INK,
                    opacity: isFocused ? 1 : 0.92,
                    shadowOpacity: isFocused ? 0.18 : 0,
                  },
                ]}
              >
                <Icon size={20} color={STICKER_INK} strokeWidth={2} />
                {route.name === 'settings' && unreadNotifications > 0 && (
                  <View
                    style={[
                      stripStyles.unreadDot,
                      { backgroundColor: StickerPalette.coral, borderColor: STICKER_INK },
                    ]}
                  />
                )}
              </View>
              <Text
                style={[
                  stripStyles.tabLabel,
                  {
                    color: isFocused ? inkColor : labelMutedColor,
                    fontFamily: isFocused
                      ? 'Fraunces_700Bold'
                      : 'InstrumentSerif_400Regular_Italic',
                    fontStyle: isFocused ? 'normal' : 'italic',
                  },
                ]}
                numberOfLines={1}
              >
                {cfg.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

// ─── Diffuse nav — flat paper bar, top hairline, mono labels, mode-accent ───
// Clean and quiet: no torn edge, no sticker-tab collage. The sticker icon is
// kept (per the "stickers stay the icon set" rule) but rendered small and ink,
// with a mode-accent dot marking the active tab. The center library slot keeps
// its own CenterTabButton.

function DiffuseStripTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const { colors, isDark } = useDiffuseTheme()
  const { t } = useTranslation()
  const unreadNotifications = useUnreadNotificationCount()
  const mode = useModeStore((s) => s.mode)
  const modeConfig = getModeConfig(mode)
  const accent = getDiffuseAccent(mode, isDark)

  // All modes surface analytics in the vault slot → chart icon everywhere.
  const vaultIcon: LucideIcon = BarChart3

  const TAB_CFG: Record<string, TabStickerCfg> = {
    index:    { icon: Home,      label: modeConfig.tabs.index.label    || t('tab_home'),      color: StickerPalette.yellow },
    agenda:   { icon: Calendar,  label: modeConfig.tabs.agenda.label   || t('tab_calendar'),  color: StickerPalette.blue },
    vault:    { icon: vaultIcon, label: modeConfig.tabs.vault.label    || t('tab_analytics'), color: StickerPalette.green },
    settings: { icon: User,      label: modeConfig.tabs.settings.label || t('tab_profile'),   color: StickerPalette.lilac },
  }

  const visible = state.routes.filter((r) => {
    const opts = descriptors[r.key].options as any
    if (opts.tabBarButton && opts.tabBarItemStyle?.display === 'none') return false
    if (opts.href === null) return false
    return true
  })

  return (
    <View
      style={[
        diffuseNav.wrap,
        // Transparent — only the floating pill shows; the page shows through
        // around it.
        { paddingBottom: insets.bottom + 8, backgroundColor: 'transparent' },
      ]}
    >
      {/* Floating capsule bar — inset from the edges, hairline paper pill. The
          center FAB pops above the pill's top edge (raised via centerWrapper).
          Surface + shadow are theme-aware so the pill always separates from the
          page: in light it's bright paper on a warmer canvas; in dark it lifts
          to surfaceRaised (lighter than the canvas) since a drop shadow can't
          read against near-black. Border strengthens to the visible hairline. */}
      <View
        style={[
          diffuseNav.pill,
          {
            backgroundColor: isDark ? colors.surfaceRaised : colors.surface,
            borderColor: colors.line,
            shadowColor: isDark ? '#000000' : '#141313',
            shadowOpacity: isDark ? 0.5 : 0.14,
          },
        ]}
      >
        {visible.map((route) => {
          const isFocused = state.routes[state.index]?.key === route.key

          if (route.name === 'library') {
            return (
              <View key={route.key} style={diffuseNav.cell}>
                <CenterTabButton />
              </View>
            )
          }

          const cfg = TAB_CFG[route.name]
          if (!cfg) return null
          const Icon = cfg.icon

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name as never)
          }

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={diffuseNav.cell}
              accessibilityRole="button"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={cfg.label}
            >
              <View style={diffuseNav.iconWrap}>
                <Icon size={20} color={isFocused ? colors.ink : colors.ink3} strokeWidth={isFocused ? 2 : 1.5} />
                {route.name === 'settings' && unreadNotifications > 0 && (
                  <View style={[diffuseNav.unreadDot, { backgroundColor: accent }]} />
                )}
              </View>
              <Text
                style={[
                  diffuseNav.label,
                  { color: isFocused ? colors.ink : colors.ink3, fontFamily: diffuseFont.mono },
                ]}
                numberOfLines={1}
              >
                {cfg.label}
              </Text>
              {/* active marker — mode-accent dot */}
              <View style={[diffuseNav.activeDot, { backgroundColor: isFocused ? accent : 'transparent' }]} />
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const diffuseNav = StyleSheet.create({
  // Transparent outer container — only the floating pill is visible; the page
  // shows through around it (bg set inline).
  wrap: {
    paddingTop: 8,
  },
  // Floating capsule: paper surface, fully rounded, hairline border, soft lift.
  // shadowColor + shadowOpacity are set inline per-theme (a light-mode drop
  // shadow is invisible in dark, so dark relies on a raised surface + deeper
  // shadow instead).
  pill: {
    flexDirection: 'row',
    height: 66,
    marginHorizontal: 16,
    alignItems: 'center',
    paddingHorizontal: 6,
    borderRadius: 33,
    borderWidth: 1,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  row: {
    flexDirection: 'row',
    height: STRIP_HEIGHT,
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingTop: 8,
  },
  iconWrap: {
    width: 30,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 8.5,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  unreadDot: {
    position: 'absolute',
    top: -1,
    right: 0,
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
})

// ─── Tab Layout ────────────────────────────────────────────────────────────

export default function TabLayout() {
  const mode = useModeStore((s) => s.mode)
  const currentBehavior = useBehaviorStore((s) => s.currentBehavior)
  const config = getModeConfig(mode)

  // Fade transition on behavior switch
  const fadeAnim = useRef(new Animated.Value(1)).current
  const prevBehavior = useRef(currentBehavior)

  useEffect(() => {
    if (prevBehavior.current !== currentBehavior && prevBehavior.current !== null) {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 125, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 125, useNativeDriver: true }),
      ]).start()
    }
    prevBehavior.current = currentBehavior
  }, [currentBehavior])

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <CollageStripTabBar {...props} />}
      >
        <Tabs.Screen name="index" options={{ title: '' }} />
        <Tabs.Screen name="agenda" options={{ title: '' }} />
        <Tabs.Screen name="library" options={{ title: '' }} />
        <Tabs.Screen
          name="vault"
          options={{ title: '', href: config.tabs.vault.visible ? undefined : null }}
        />
        <Tabs.Screen name="settings" options={{ title: '' }} />
      </Tabs>
    </Animated.View>
  )
}

// Diffuse center FAB — calm circular node (paper + hairline) with a soft
// mode-accent bloom behind it, replacing the collage Burst sticker.
const diffuseFab = StyleSheet.create({
  // The glow lives INSIDE the button: overflow:hidden + borderRadius clip the
  // child bloom to the circle so it reads as a soft-filled node, not a halo.
  node: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Bloom fills the node; its radial falloff fades from a tinted center to the
  // paper surface at the rim (clipped by the node's rounded overflow).
  bloom: {
    ...StyleSheet.absoluteFillObject,
  },
})

const styles = StyleSheet.create({
  centerWrapper: {
    position: 'relative',
    top: -22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBurstWrap: {
    width: CENTER_BURST_SIZE,
    height: CENTER_BURST_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 10,
  },
  centerSparkleAbs: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confetti: {
    position: 'absolute',
  },
  prompt: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  promptKicker: {
    fontFamily: font.bodyMedium,
    fontSize: 11,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    marginBottom: 10,
    opacity: 0.7,
  },
  promptLine: {
    fontFamily: font.display,
    fontSize: 34,
    letterSpacing: -0.6,
    lineHeight: 38,
    textAlign: 'center',
  },
  promptItalic: {
    fontFamily: font.italic,
    fontStyle: 'italic',
  },
  // ── Diffuse word-stack menu ──
  wordStack: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  wordRow: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  word: {
    fontSize: 38,
    letterSpacing: -0.6,
    lineHeight: 44,
    textAlign: 'center',
  },
  wordSub: {
    fontSize: 10.5,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginTop: 6,
  },
  goWrap: {
    position: 'absolute',
    right: 24,
    alignItems: 'flex-end',
  },
  goPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 999,
    borderWidth: 1,
  },
  goText: {
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  promptRule: {
    width: 36,
    height: 1,
    marginTop: 16,
    opacity: 0.45,
  },
  promptCaps: {
    marginTop: 12,
    fontFamily: font.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  fanItemWrap: {
    position: 'absolute',
    width: 120,
    alignItems: 'center',
  },
  fanItem: {
    width: 120,
    alignItems: 'center',
  },
  stickerStack: {
    width: STICKER_SIZE,
    height: STICKER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    shadowColor: STICKER_INK,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  labelText: {
    fontFamily: font.bodySemiBold,
    fontSize: 12,
    letterSpacing: 0.1,
  },
  subtitle: {
    marginTop: 4,
    fontFamily: font.italic,
    fontStyle: 'italic',
    fontSize: 11,
    textAlign: 'center',
    maxWidth: 110,
    opacity: 0.72,
  },
})

// Swiss-grotesque menu prototype styles — Braun/Vignelli-flavored: corner
// index + asterisk, low left-aligned lowercase bold word list.
const swiss = StyleSheet.create({
  corner: {
    position: 'absolute',
  },
  cornerNum: {
    fontSize: 34,
    letterSpacing: -1,
  },
  cornerStar: {
    fontSize: 30,
    lineHeight: 30,
  },
  stack: {
    position: 'absolute',
    left: 24,
    right: 24,
  },
  row: {
    paddingVertical: 1,
  },
  backRow: {
    paddingVertical: 1,
    marginTop: 28,
  },
  word: {
    fontSize: 34,
    letterSpacing: -0.8,
    lineHeight: 40,
  },
})

const stripStyles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  row: {
    height: STRIP_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingTop: 6,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  tabSticker: {
    width: STICKER_TAB_SIZE,
    height: STICKER_TAB_SIZE,
    borderRadius: STICKER_TAB_SIZE / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: STICKER_INK,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  tabLabel: {
    marginTop: 4,
    fontSize: 11,
    letterSpacing: 0.1,
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
  },
})
