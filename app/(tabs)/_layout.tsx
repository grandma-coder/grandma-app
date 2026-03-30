import { Tabs } from 'expo-router'
import { Text } from 'react-native'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#FAF8F4', borderTopColor: '#E8E4DC' },
        tabBarActiveTintColor: '#7BAE8E',
        tabBarInactiveTintColor: '#aaa',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⌂</Text> }}
      />
      <Tabs.Screen
        name="chat"
        options={{ title: 'Ask Grandma', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>💬</Text> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👶</Text> }}
      />
    </Tabs>
  )
}