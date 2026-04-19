/**
 * Connections (Apr 2026 redesign) — Garage / Channels tabs
 *
 * Cream canvas, ScreenHeader with bell, paper pill tab bar with ink-filled active.
 */

import { useState, useCallback } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { getUnreadNotificationCount } from '../lib/channelPosts'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../constants/theme'
import { GarageTab } from '../components/connections/GarageTab'
import { ChannelsTab } from '../components/connections/ChannelsTab'
import { ScreenHeader } from '../components/ui/ScreenHeader'

export default function ConnectionsScreen() {
  const { colors, font, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ tab?: string }>()
  const [tab, setTab] = useState<'garage' | 'channels'>(
    params.tab === 'channels' ? 'channels' : 'garage'
  )
  const [notifCount, setNotifCount] = useState(0)

  const bg = isDark ? colors.bg : '#F3ECD9'
  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const ink = isDark ? colors.text : '#141313'
  const ink3 = isDark ? colors.textMuted : '#6E6763'

  useFocusEffect(
    useCallback(() => {
      getUnreadNotificationCount().then(setNotifCount).catch(() => {})
    }, [])
  )

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
        <ScreenHeader
          title="Connections"
          right={
            <Pressable onPress={() => router.push('/notifications' as any)} hitSlop={8}>
              <View style={[styles.bellBtn, { backgroundColor: paper, borderColor: paperBorder }]}>
                <Ionicons name="notifications-outline" size={18} color={ink} />
                {notifCount > 0 && (
                  <View style={[styles.notifBadge, { backgroundColor: brand.error }]}>
                    <Text style={styles.notifBadgeText}>{notifCount > 9 ? '9+' : notifCount}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          }
        />
      </View>

      {/* Segmented pill tab bar */}
      <View style={[styles.tabBar, { backgroundColor: paper, borderColor: paperBorder }]}>
        {(['garage', 'channels'] as const).map((t) => {
          const active = tab === t
          return (
            <Pressable key={t} onPress={() => setTab(t)} style={styles.tabBtnWrap}>
              <View
                style={[
                  styles.tabBtn,
                  { backgroundColor: active ? ink : 'transparent' },
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    { fontFamily: font.bodyMedium, color: active ? bg : ink3 },
                  ]}
                >
                  {t === 'garage' ? 'Garage' : 'Channels'}
                </Text>
              </View>
            </Pressable>
          )
        })}
      </View>

      {tab === 'garage' ? <GarageTab /> : <ChannelsTab />}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  bellBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: { fontSize: 9, fontWeight: '800', color: '#FFFFFF' },

  tabBar: {
    flexDirection: 'row',
    padding: 4,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  tabBtnWrap: { flex: 1 },
  tabBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 999,
  },
  tabText: { fontSize: 14, letterSpacing: 0.1 },
})
