/**
 * F1 — Connections Home
 *
 * Top tab bar: Garage | Channels
 * Accessible from Grandma Wheel and tab bar.
 */

import { useState, useEffect } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { ArrowLeft, Bell } from 'lucide-react-native'
import { getUnreadNotificationCount } from '../lib/channelPosts'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../constants/theme'
import { GarageTab } from '../components/connections/GarageTab'
import { ChannelsTab } from '../components/connections/ChannelsTab'

export default function ConnectionsScreen() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const [tab, setTab] = useState<'garage' | 'channels'>('garage')
  const [notifCount, setNotifCount] = useState(0)

  useEffect(() => {
    getUnreadNotificationCount().then(setNotifCount).catch(() => {})
  }, [])

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Connections</Text>
        <Pressable onPress={() => router.push('/notifications' as any)} style={styles.headerBtn}>
          <Bell size={22} color={colors.text} strokeWidth={2} />
          {notifCount > 0 && (
            <View style={[styles.notifBadge, { backgroundColor: brand.error }]}>
              <Text style={styles.notifBadgeText}>{notifCount > 9 ? '9+' : notifCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Tab bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg, marginHorizontal: 20 }]}>
        <Pressable
          onPress={() => setTab('garage')}
          style={[
            styles.tabBtn,
            {
              backgroundColor: tab === 'garage' ? colors.primary : 'transparent',
              borderRadius: radius.md,
            },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              { color: tab === 'garage' ? '#FFFFFF' : colors.textSecondary },
            ]}
          >
            Garage
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('channels')}
          style={[
            styles.tabBtn,
            {
              backgroundColor: tab === 'channels' ? colors.primary : 'transparent',
              borderRadius: radius.md,
            },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              { color: tab === 'channels' ? '#FFFFFF' : colors.textSecondary },
            ]}
          >
            Channels
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      {tab === 'garage' ? <GarageTab /> : <ChannelsTab />}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerBtn: { width: 40, alignItems: 'center', position: 'relative' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  notifBadge: { position: 'absolute', top: -4, right: 2, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  notifBadgeText: { fontSize: 9, fontWeight: '800', color: '#FFFFFF' },
  tabBar: { flexDirection: 'row', padding: 4, marginBottom: 12 },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  tabText: { fontSize: 14, fontWeight: '700' },
})
