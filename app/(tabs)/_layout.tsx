/**
 * Tab Navigator — 5 tabs with elevated center Grandma button
 *
 * Layout: Home | Calendar | [Grandma] | Analytics | Profile
 * Center button opens wheel menu.
 * Smooth fade transition when behavior switches via Profile.
 */

import { useState, useEffect, useRef } from 'react'
import { View, Text, Pressable, Modal, Animated, StyleSheet } from 'react-native'
import { Tabs, router } from 'expo-router'
import {
  Home, Calendar, BarChart3, User, Sparkles,
  MessageCircle, Lightbulb, ShoppingBag, Users, X, Gift,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useModeStore } from '../../store/useModeStore'
import { useBehaviorStore } from '../../store/useBehaviorStore'
import { getModeConfig } from '../../lib/modeConfig'
import { useTheme, brand } from '../../constants/theme'

// ─── Grandma Wheel Menu ────────────────────────────────────────────────────

const WHEEL_ITEMS = [
  { id: 'chat', label: 'Grandma Talk', icon: MessageCircle, color: brand.primary, route: '/grandma-talk' },
  { id: 'insights', label: 'Insights', icon: Lightbulb, color: brand.accent, route: '/insights' },
  { id: 'rewards', label: 'Daily Rewards', icon: Gift, color: '#FFD700', route: '/daily-rewards' },
  { id: 'garage', label: 'Garage', icon: ShoppingBag, color: brand.kids, route: '/connections' },
  { id: 'channels', label: 'Channels', icon: Users, color: brand.secondary, route: '/connections?tab=channels' },
]

function CenterTabButton() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const [open, setOpen] = useState(false)

  function handleItem(route: string) {
    setOpen(false)
    setTimeout(() => router.push(route as any), 150)
  }

  return (
    <>
      <View style={styles.centerWrapper}>
        <Pressable
          onPress={() => setOpen(true)}
          style={({ pressed }) => [
            styles.centerButton,
            { backgroundColor: brand.primary },
            pressed && { transform: [{ scale: 0.92 }] },
          ]}
        >
          <Sparkles size={28} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.wheelOverlay} onPress={() => setOpen(false)}>
          <View style={[styles.wheelMenu, { backgroundColor: colors.surface, borderRadius: radius.xl, bottom: 100 + insets.bottom }]}>
            <Pressable onPress={() => setOpen(false)} style={[styles.wheelClose, { backgroundColor: colors.surfaceRaised }]}>
              <X size={20} color={colors.textMuted} />
            </Pressable>
            <View style={styles.wheelGrid}>
              {WHEEL_ITEMS.map((item) => {
                const Icon = item.icon
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => handleItem(item.route)}
                    style={({ pressed }) => [
                      styles.wheelItem,
                      pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
                    ]}
                  >
                    <View style={[styles.wheelIcon, { backgroundColor: item.color + '15' }]}>
                      <Icon size={22} color={item.color} strokeWidth={2} />
                    </View>
                    <Text style={[styles.wheelLabel, { color: colors.text }]}>{item.label}</Text>
                  </Pressable>
                )
              })}
            </View>
          </View>
        </Pressable>
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
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Home size={size} color={color} strokeWidth={2} />
            ),
          }}
        />
        <Tabs.Screen
          name="agenda"
          options={{
            title: config.tabs.agenda.label,
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
            title: 'Analytics',
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
            title: 'Profile',
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
  centerButton: {
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
  wheelOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  wheelMenu: {
    position: 'absolute',
    width: 280,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  wheelClose: {
    alignSelf: 'center',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  wheelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  wheelItem: {
    width: '30%',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  wheelIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
})
