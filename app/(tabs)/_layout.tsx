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
import { getModeConfig } from '../../lib/modeConfig'
import { useTheme, brand, getModeColor } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import { Burst, Blob, Flower, Squishy, Heart, Star, Drop, StickerPalette } from '../../components/stickers/BrandStickers'

// ─── Collage Strip constants ───────────────────────────────────────────────
const STRIP_HEIGHT = 84
const STICKER_TAB_SIZE = 46
const CENTER_BURST_SIZE = 72
const STICKER_INK = '#141313'

const SCREEN_W = Dimensions.get('window').width
const SCREEN_H = Dimensions.get('window').height

// ─── Grandma Central Menu — fan-open sticker overlay ───────────────────────
// Each action gets a distinct sticker shape from the brand vocabulary.
// On open: items stack at the + pivot, then fan out in a leque with
// staggered timing. Scrim adapts to light/dark (cream wash / ink wash).

type StickerRenderer = (props: { size: number }) => ReactElement
interface WheelItem {
  id: string
  labelKey: 'menu_grandmaTalk' | 'menu_insights' | 'menu_dailyRewards' | 'menu_garage' | 'menu_channels'
  subtitle: string
  icon: LucideIcon
  route: string
  rotation: number // degrees of playful tilt
  sticker: StickerRenderer
}

const WHEEL_ITEMS: WheelItem[] = [
  {
    id: 'insights',
    labelKey: 'menu_insights',
    subtitle: 'what grandma sees',
    icon: Sparkles,
    route: '/insights',
    rotation: -6,
    sticker: ({ size }) => <Burst size={size} fill={StickerPalette.yellow} points={12} />,
  },
  {
    id: 'rewards',
    labelKey: 'menu_dailyRewards',
    subtitle: 'little gifts',
    icon: Gift,
    route: '/daily-rewards',
    rotation: 4,
    sticker: ({ size }) => <Flower size={size} petal={StickerPalette.pink} center={StickerPalette.yellow} />,
  },
  {
    id: 'chat',
    labelKey: 'menu_grandmaTalk',
    subtitle: 'voice · live',
    icon: MessageCircle,
    route: '/grandma-talk',
    rotation: -8,
    sticker: ({ size }) => <Blob size={size} fill={StickerPalette.lilac} variant={1} />,
  },
  {
    id: 'garage',
    labelKey: 'menu_garage',
    subtitle: 'pass it on',
    icon: ShoppingBag,
    route: '/connections',
    rotation: 6,
    sticker: ({ size }) => <Squishy w={size * 1.15} h={size * 0.78} fill={StickerPalette.green} />,
  },
  {
    id: 'channels',
    labelKey: 'menu_channels',
    subtitle: 'find your people',
    icon: Users,
    route: '/connections?tab=channels',
    rotation: -4,
    sticker: ({ size }) => <Blob size={size} fill={StickerPalette.peach} variant={2} />,
  },
]

// Fan layout — items arc from lower-left (208°) to lower-right (332°),
// radiating upward from a pivot at the + button. Smaller R = tighter fan.
const FAN_RADIUS = 148
const FAN_START_DEG = 208
const FAN_END_DEG = 332
const STICKER_SIZE = 88
const ICON_SIZE = 20

function CenterTabButton() {
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const { colors, isDark } = useTheme()
  const mode = useModeStore((s) => s.mode)
  const accentColor = getModeColor(mode)
  const [open, setOpen] = useState(false)

  // Animated values
  const overlayAnim = useRef(new Animated.Value(0)).current
  const spinAnim = useRef(new Animated.Value(0)).current
  const itemAnims = useRef(WHEEL_ITEMS.map(() => new Animated.Value(0))).current

  const animateOpen = useCallback(() => {
    setOpen(true)
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

  // Theme-aware scrim — cream wash in light mode, warm ink in dark
  const scrimColor = isDark ? 'rgba(12,10,8,0.88)' : 'rgba(243,236,217,0.92)'
  const inkColor = isDark ? '#F5EDDC' : '#141313'
  const ink3Color = isDark ? 'rgba(245,237,220,0.55)' : '#6E6763'

  return (
    <>
      {/* Tab bar button — Burst sticker, raised above the strip */}
      <View style={styles.centerWrapper}>
        <Pressable onPress={open ? animateClose : animateOpen} hitSlop={12}>
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
        </Pressable>
      </View>

      {/* Modal: scrim + fan items */}
      <Modal visible={open} transparent animationType="none" statusBarTranslucent onRequestClose={animateClose}>
        {/* Cream/ink scrim — tap to dismiss */}
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: scrimColor, opacity: overlayAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={animateClose} />
        </Animated.View>

        {/* Decorative sticker confetti — sits above scrim, below tiles */}
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

        {/* Prompt — "where to, dear?" serif + italic accent */}
        <Animated.View
          pointerEvents="none"
          style={[styles.prompt, { top: insets.top + 56, opacity: overlayAnim }]}
        >
          <Text style={[styles.promptLine, { color: inkColor }]}>
            where to,{' '}
            <Text style={[styles.promptItalic, { color: accentColor }]}>dear?</Text>
          </Text>
          <Text style={[styles.promptCaps, { color: ink3Color }]}>pick a corner</Text>
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
                {/* Sticker + icon stacked */}
                <View style={styles.stickerStack}>
                  <View style={StyleSheet.absoluteFill}>{item.sticker({ size: STICKER_SIZE })}</View>
                  <Icon size={ICON_SIZE} color="#141313" strokeWidth={2} />
                </View>

                {/* Label pill — paper chip, counter-rotated so text reads flat */}
                <View style={{ transform: [{ rotate: `${-item.rotation}deg` }], alignItems: 'center', marginTop: 8 }}>
                  <View style={[styles.labelPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.labelText, { color: inkColor }]} numberOfLines={1}>
                      {t(item.labelKey)}
                    </Text>
                  </View>
                  <Text style={[styles.subtitle, { color: ink3Color }]} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                </View>
              </Pressable>
            </Animated.View>
          )
        })}
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

function CollageStripTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const { isDark } = useTheme()
  const { t } = useTranslation()
  const screenW = Dimensions.get('window').width

  const TAB_CFG: Record<string, TabStickerCfg> = {
    index:    { icon: Home,      label: t('tab_home'),      color: StickerPalette.yellow },
    agenda:   { icon: Calendar,  label: t('tab_calendar'),  color: StickerPalette.blue },
    vault:    { icon: BarChart3, label: t('tab_analytics'), color: StickerPalette.green },
    settings: { icon: User,      label: t('tab_profile'),   color: StickerPalette.lilac },
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
        <Tabs.Screen name="exchange" options={{ title: '', href: null }} />
        <Tabs.Screen name="settings" options={{ title: '' }} />
      </Tabs>
    </Animated.View>
  )
}

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
  },
  promptLine: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 24,
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  promptItalic: {
    fontFamily: 'InstrumentSerif_400Regular_Italic',
    fontStyle: 'italic',
  },
  promptCaps: {
    marginTop: 8,
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    letterSpacing: 1.6,
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
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  labelText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11.5,
  },
  subtitle: {
    marginTop: 3,
    fontFamily: 'InstrumentSerif_400Regular_Italic',
    fontStyle: 'italic',
    fontSize: 10.5,
    textAlign: 'center',
    maxWidth: 104,
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
})
