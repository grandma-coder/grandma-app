/**
 * NotificationBell — paper-circle button with shake on new notifications.
 *
 * Renders a 38px paper-style round button (matches the gearBtn aesthetic) with
 * a Bell icon and a coral count badge. Shakes briefly each time the unread
 * count increases (a new notification arrived), driven by the existing React
 * Query + Supabase realtime subscription.
 */

import { useEffect, useId, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  AccessibilityInfo,
} from 'react-native'
import { router } from 'expo-router'
import { Bell } from 'lucide-react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTheme } from '../../constants/theme'
import { getUnreadCount } from '../../lib/notifications'
import { supabase } from '../../lib/supabase'

export function NotificationBell() {
  const { colors, stickers, font } = useTheme()
  const queryClient = useQueryClient()
  const channelId = useId()
  const rotate = useRef(new Animated.Value(0)).current
  const prevCount = useRef<number | null>(null)
  const [reduceMotion, setReduceMotion] = useState(false)

  const { data: count = 0 } = useQuery({
    queryKey: ['notification-count'],
    queryFn: getUnreadCount,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  })

  // Real-time: refetch count when notifications table changes.
  useEffect(() => {
    const channel = supabase
      .channel(`notification-bell-${channelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notification-count'] })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient, channelId])

  // Reduce-motion preference
  useEffect(() => {
    let mounted = true
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled)
    })
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) =>
      setReduceMotion(enabled),
    )
    return () => {
      mounted = false
      sub.remove()
    }
  }, [])

  // Shake on count increase. Skip the first observed count (initial load).
  useEffect(() => {
    if (prevCount.current === null) {
      prevCount.current = count
      return
    }
    if (count > prevCount.current && !reduceMotion) {
      rotate.setValue(0)
      Animated.sequence([
        Animated.timing(rotate, { toValue: 1, duration: 70, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: -1, duration: 90, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 0.7, duration: 80, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: -0.7, duration: 80, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 0.4, duration: 80, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: -0.4, duration: 80, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 0, duration: 100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start()
    }
    prevCount.current = count
  }, [count, reduceMotion, rotate])

  const rotateInterp = rotate.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-15deg', '15deg'],
  })

  return (
    <Pressable
      onPress={() => router.push('/notifications')}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
    >
      <Animated.View
        style={[
          styles.btn,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            transform: [{ rotate: rotateInterp }],
          },
        ]}
      >
        <Bell size={18} color={colors.text} strokeWidth={2} />
        {count > 0 && (
          <View style={[styles.badge, { backgroundColor: stickers.coral, borderColor: colors.surface }]}>
            <Text
              style={[
                styles.badgeText,
                { fontFamily: font.bodySemiBold, color: '#FFFEF8' },
              ]}
            >
              {count > 99 ? '99+' : count}
            </Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  btn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
  },
})
