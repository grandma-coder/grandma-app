import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useModeStore } from '../../store/useModeStore'
import { getModeConfig } from '../../lib/modeConfig'
import { useAppTheme } from '../../components/ui/ThemeProvider'

export default function TabLayout() {
  const mode = useModeStore((s) => s.mode)
  const config = getModeConfig(mode)
  const { colors } = useAppTheme()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 90,
          paddingBottom: 30,
          paddingTop: 10,
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '900',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: config.tabs.index.label,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={config.tabs.index.icon as any} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: config.tabs.agenda.label,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={config.tabs.agenda.icon as any} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: config.tabs.library.label,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={config.tabs.library.icon as any} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          title: config.tabs.vault.label,
          href: config.tabs.vault.visible ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={config.tabs.vault.icon as any} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="exchange"
        options={{
          title: config.tabs.exchange.label,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={config.tabs.exchange.icon as any} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: config.tabs.settings.label,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={config.tabs.settings.icon as any} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
