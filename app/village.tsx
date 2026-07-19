/**
 * The Village — standalone marketplace screen.
 *
 * Split out of the old /connections shell (which bundled Village + Channels +
 * Circles behind a top tab bar). The central menu now routes here directly, so
 * this is just the Village: a slim nav bar (back + notifications) over
 * GarageScreen, which owns its own "The Village." title + view toggle.
 */

import { useState, useCallback } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand, useDiffuseTheme, diffuseFont } from '../constants/theme'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { useIsDiffuse } from '../components/ui/diffuse/DiffuseKit'
import { GarageScreen } from '../components/connections/GarageScreen'
import { getUnreadNotificationCount } from '../lib/channelPosts'

export default function VillageScreen() {
  const { colors } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const insets = useSafeAreaInsets()
  const [notifCount, setNotifCount] = useState(0)

  useFocusEffect(
    useCallback(() => {
      getUnreadNotificationCount().then(setNotifCount).catch(() => {})
    }, [])
  )

  return (
    <View style={[styles.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
        <ScreenHeader
          right={
            <Pressable onPress={() => router.push('/notifications' as any)} hitSlop={8}>
              <View style={[styles.bellBtn, diffuse
                ? { backgroundColor: 'transparent', borderColor: dt.colors.line2 }
                : { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="notifications-outline" size={18} color={diffuse ? dt.colors.ink : colors.text} />
                {notifCount > 0 && (
                  <View style={[styles.notifBadge, { backgroundColor: diffuse ? dt.colors.error : brand.error }]}>
                    <Text style={[styles.notifBadgeText, { color: diffuse ? dt.colors.surface : colors.textInverse, fontFamily: diffuse ? diffuseFont.monoBold : undefined }]}>{notifCount > 9 ? '9+' : notifCount}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          }
        />
      </View>
      <GarageScreen />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bellBtn: {
    width: 34, height: 34, borderRadius: 999, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  notifBadge: {
    position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16,
    borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  notifBadgeText: { fontSize: 9, fontWeight: '800' },
})
