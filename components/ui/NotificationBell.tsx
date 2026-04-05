/**
 * NotificationBell — bell icon with unread badge count.
 * Tap to open notifications modal.
 */

import { View, Text, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Bell } from 'lucide-react-native'
import { useQuery } from '@tanstack/react-query'
import { useTheme, brand } from '../../constants/theme'
import { getUnreadCount } from '../../lib/notifications'

export function NotificationBell() {
  const { colors } = useTheme()

  const { data: count = 0 } = useQuery({
    queryKey: ['notification-count'],
    queryFn: getUnreadCount,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  })

  return (
    <Pressable
      onPress={() => router.push('/notifications')}
      style={styles.wrap}
      hitSlop={8}
    >
      <Bell size={22} color={colors.textSecondary} strokeWidth={2} />
      {count > 0 && (
        <View style={[styles.badge, { backgroundColor: brand.error }]}>
          <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
})
