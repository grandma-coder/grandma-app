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
  Home, Calendar, BarChart3, User, Sparkles,
  MessageCircle, Lightbulb, ShoppingBag, Users, Gift,
  LucideIcon,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useModeStore } from '../../store/useModeStore'
import { useBehaviorStore } from '../../store/useBehaviorStore'
import { getModeConfig } from '../../lib/modeConfig'
import { useTheme, brand, getModeColor } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import { Burst, Blob, Flower, Squishy, Heart, Star, Drop, StickerPalette } from '../../components/stickers/BrandStickers'

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
      {/* Tab bar button — always visible, animates rotation */}
      <View style={styles.centerWrapper}>
        <Pressable onPress={open ? animateClose : animateOpen}>
          <Animated.View
            style={[
              styles.centerButtonInner,
              { backgroundColor: accentColor, shadowColor: accentColor, transform: [{ rotate: rotation }, { scale: pulse }] },
            ]}
          >
            <Sparkles size={28} color="#FFFFFF" strokeWidth={2.5} />
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

// ─── Tab Layout ────────────────────────────────────────────────────────────

export default function TabLayout() {
  const mode = useModeStore((s) => s.mode)
  const currentBehavior = useBehaviorStore((s) => s.currentBehavior)
  const config = getModeConfig(mode)
  const { colors, isDark } = useTheme()
  const { t } = useTranslation()
  const activeTint = getModeColor(mode, isDark)

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
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.tabBg,
            borderTopColor: colors.tabBorder,
            borderTopWidth: 1,
            height: 88,
            paddingBottom: 34,
            paddingTop: 8,
          },
          tabBarActiveTintColor: activeTint,
          tabBarInactiveTintColor: colors.tabInactive,
          tabBarLabelStyle: {
            fontSize: 9,
            fontFamily: 'DMSans_600SemiBold',
            letterSpacing: 0.8,
            textTransform: 'uppercase',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('tab_home'),
            tabBarIcon: ({ color, size }) => (
              <Home size={size} color={color} strokeWidth={2} />
            ),
          }}
        />
        <Tabs.Screen
          name="agenda"
          options={{
            title: t('tab_calendar'),
            tabBarIcon: ({ color, size }) => (
              <Calendar size={size} color={color} strokeWidth={2} />
            ),
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: '',
            tabBarButton: () => <CenterTabButton />,
          }}
        />
        <Tabs.Screen
          name="vault"
          options={{
            title: t('tab_analytics'),
            href: config.tabs.vault.visible ? undefined : null,
            tabBarIcon: ({ color, size }) => (
              <BarChart3 size={size} color={color} strokeWidth={2} />
            ),
          }}
        />
        <Tabs.Screen
          name="exchange"
          options={{
            title: config.tabs.exchange.label,
            href: null,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: t('tab_profile'),
            tabBarIcon: ({ color, size }) => (
              <User size={size} color={color} strokeWidth={2} />
            ),
          }}
        />
      </Tabs>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  centerWrapper: {
    position: 'relative',
    top: -16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
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
