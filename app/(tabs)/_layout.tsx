/**
 * Tab Navigator — 5 tabs with elevated center Grandma button
 *
 * Layout: Home | Calendar | [Grandma] | Analytics | Profile
 * Center button is visually elevated (larger, primary color, rounded).
 * Tab visibility + labels adapt per journey mode.
 */

import { View, Pressable, StyleSheet } from 'react-native'
import { Tabs, router } from 'expo-router'
import { Home, Calendar, BarChart3, User, Sparkles } from 'lucide-react-native'
import { useModeStore } from '../../store/useModeStore'
import { getModeConfig } from '../../lib/modeConfig'
import { useTheme, brand } from '../../constants/theme'

function CenterTabButton() {
  const { colors, radius } = useTheme()

  return (
    <View style={styles.centerWrapper}>
      <Pressable
        onPress={() => router.push('/grandma-talk')}
        style={({ pressed }) => [
          styles.centerButton,
          { backgroundColor: brand.primary },
          pressed && { transform: [{ scale: 0.92 }] },
        ]}
      >
        <Sparkles size={28} color="#FFFFFF" strokeWidth={2.5} />
      </Pressable>
    </View>
  )
}

export default function TabLayout() {
  const mode = useModeStore((s) => s.mode)
  const config = getModeConfig(mode)
  const { colors, fontSize, fontWeight } = useTheme()

  return (
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
          href: null, // Hidden from tab bar — accessible via navigation
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
})
