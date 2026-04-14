/**
 * Tab Navigator — 5 tabs with elevated center Grandma button
 *
 * Layout: Home | Calendar | [Grandma] | Analytics | Profile
 * Center button opens radial arc menu with staggered spring animation.
 * Smooth fade transition when behavior switches via Profile.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, Pressable, Modal, Animated, StyleSheet, Dimensions } from 'react-native'
import { Tabs, router } from 'expo-router'
import {
  Home, Calendar, BarChart3, User, Sparkles,
  MessageCircle, Lightbulb, ShoppingBag, Users, Gift, X,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useModeStore } from '../../store/useModeStore'
import { useBehaviorStore } from '../../store/useBehaviorStore'
import { getModeConfig } from '../../lib/modeConfig'
import { useTheme, brand } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'

const SCREEN_W = Dimensions.get('window').width
const SCREEN_H = Dimensions.get('window').height

// ─── Grandma Radial Menu ──────────────────────────────────────────────────

const WHEEL_ITEMS = [
  { id: 'chat', labelKey: 'menu_grandmaTalk' as const, icon: MessageCircle, color: brand.primary, route: '/grandma-talk' },
  { id: 'insights', labelKey: 'menu_insights' as const, icon: Lightbulb, color: brand.accent, route: '/insights' },
  { id: 'rewards', labelKey: 'menu_dailyRewards' as const, icon: Gift, color: '#FFD700', route: '/daily-rewards' },
  { id: 'garage', labelKey: 'menu_garage' as const, icon: ShoppingBag, color: brand.kids, route: '/connections' },
  { id: 'channels', labelKey: 'menu_channels' as const, icon: Users, color: brand.secondary, route: '/connections?tab=channels' },
]

const ARC_RADIUS = 125
const ARC_START = Math.PI * 0.12
const ARC_END = Math.PI * 0.88
const ITEM_SIZE = 56

function CenterTabButton() {
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  // Animated values
  const overlayAnim = useRef(new Animated.Value(0)).current
  const spinAnim = useRef(new Animated.Value(0)).current
  const itemAnims = useRef(WHEEL_ITEMS.map(() => new Animated.Value(0))).current

  const animateOpen = useCallback(() => {
    setOpen(true)
    Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start()
    Animated.spring(spinAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start()
    itemAnims.forEach((anim, i) => {
      Animated.spring(anim, { toValue: 1, friction: 5, tension: 60, delay: i * 50, useNativeDriver: true }).start()
    })
  }, [overlayAnim, spinAnim, itemAnims])

  const animateClose = useCallback(() => {
    ;[...itemAnims].reverse().forEach((anim, i) => {
      Animated.timing(anim, { toValue: 0, duration: 120, delay: i * 25, useNativeDriver: true }).start()
    })
    Animated.spring(spinAnim, { toValue: 0, friction: 6, tension: 80, useNativeDriver: true }).start()
    Animated.timing(overlayAnim, { toValue: 0, duration: 200, delay: 80, useNativeDriver: true }).start(() => {
      setOpen(false)
    })
  }, [overlayAnim, spinAnim, itemAnims])

  function handleItem(route: string) {
    animateClose()
    setTimeout(() => router.push(route as any), 350)
  }

  // Shared rotation + scale (used on both tab button AND floating close)
  const rotation = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '135deg'] })
  const pulse = spinAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.12, 1] })

  // Arc anchor = approximate screen position of center button
  const anchorX = SCREEN_W / 2
  const anchorY = SCREEN_H - insets.bottom - 44 - 14

  return (
    <>
      {/* Tab bar button — always visible, animates rotation */}
      <View style={styles.centerWrapper}>
        <Pressable onPress={open ? animateClose : animateOpen}>
          <Animated.View
            style={[
              styles.centerButtonInner,
              { backgroundColor: brand.primary, transform: [{ rotate: rotation }, { scale: pulse }] },
            ]}
          >
            <Sparkles size={28} color="#FFFFFF" strokeWidth={2.5} />
          </Animated.View>
        </Pressable>
      </View>

      {/* Modal: overlay + arc items (no duplicate button inside) */}
      <Modal visible={open} transparent animationType="none" statusBarTranslucent onRequestClose={animateClose}>
        {/* Dark overlay — tap to dismiss */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, { opacity: overlayAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={animateClose} />
        </Animated.View>

        {/* Arc items */}
        {WHEEL_ITEMS.map((item, i) => {
          const Icon = item.icon
          const anim = itemAnims[i]

          const totalItems = WHEEL_ITEMS.length
          const angle = ARC_START + (ARC_END - ARC_START) * (i / (totalItems - 1))
          const targetX = anchorX + ARC_RADIUS * Math.cos(Math.PI - angle) - ITEM_SIZE / 2
          const targetY = anchorY - ARC_RADIUS * Math.sin(angle) - ITEM_SIZE / 2

          const translateX = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [anchorX - ITEM_SIZE / 2 - targetX, 0],
          })
          const translateY = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [anchorY - ITEM_SIZE / 2 - targetY, 0],
          })
          const scale = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.7, 1] })
          const itemOpacity = anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.5, 1] })

          return (
            <Animated.View
              key={item.id}
              pointerEvents="box-none"
              style={[
                styles.arcItemWrap,
                {
                  left: targetX,
                  top: targetY,
                  opacity: itemOpacity,
                  transform: [{ translateX }, { translateY }, { scale }],
                },
              ]}
            >
              <Pressable
                onPress={() => handleItem(item.route)}
                style={({ pressed }) => [
                  styles.arcItem,
                  { backgroundColor: item.color + '20', borderColor: item.color + '40' },
                  pressed && { transform: [{ scale: 0.88 }], backgroundColor: item.color + '40' },
                ]}
              >
                <Icon size={24} color={item.color} strokeWidth={2} />
              </Pressable>
              <Animated.Text
                style={[styles.arcLabel, { color: '#FFFFFF', opacity: itemOpacity }]}
                numberOfLines={2}
              >
                {t(item.labelKey)}
              </Animated.Text>
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
  const { colors } = useTheme()
  const { t } = useTranslation()

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
          tabBarActiveTintColor: colors.tabActive,
          tabBarInactiveTintColor: colors.tabInactive,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 0.3,
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
    shadowColor: brand.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  overlay: {
    backgroundColor: 'rgba(10, 8, 20, 0.80)',
  },
  arcItemWrap: {
    position: 'absolute',
    width: ITEM_SIZE,
    alignItems: 'center',
    gap: 6,
  },
  arcItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: ITEM_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  arcLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 13,
  },
})
