import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type AppNotification,
} from '../lib/channelPosts'
import { useTheme, brand } from '../constants/theme'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import {
  ArrowLeft,
  Bell,
  Heart,
  AtSign,
  MessageCircle,
  Hash,
  CheckCheck,
} from 'lucide-react-native'

// ─── Helpers ──────────────────────────────────────────────────────────────

function getTypeIcon(type: string, primaryColor: string) {
  const size = 20
  switch (type) {
    case 'mention':
      return <AtSign size={size} color={primaryColor} />
    case 'reply':
      return <MessageCircle size={size} color={primaryColor} />
    case 'like':
      return <Heart size={size} color={brand.error} />
    case 'channel':
      return <Hash size={size} color={primaryColor} />
    default:
      return <Bell size={size} color={primaryColor} />
  }
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

// ─── Main Component ───────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const { colors, radius, spacing, fontSize, fontWeight } = useTheme()
  const insets = useSafeAreaInsets()

  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    const data = await fetchNotifications()
    setNotifications(data)
  }, [])

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  const handleMarkAllRead = useCallback(async () => {
    await markAllNotificationsRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }, [])

  const handleTap = useCallback(async (item: AppNotification) => {
    if (!item.is_read) {
      await markNotificationRead(item.id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)),
      )
    }
    if (item.data?.channelId) {
      router.push(`/community/${item.data.channelId}`)
    }
  }, [])

  const hasUnread = notifications.some((n) => !n.is_read)

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: insets.top + spacing.sm,
      paddingBottom: spacing.md,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.bg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    headerTitle: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    markAllBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    markAllText: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      color: colors.primary,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
    },
    rowUnread: {
      backgroundColor: colors.primaryTint,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: radius.xl,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowContent: {
      flex: 1,
    },
    rowTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    rowTitle: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
      color: colors.text,
      flex: 1,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    rowBody: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      marginTop: 2,
    },
    rowTime: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      marginTop: 4,
    },
    separator: {
      height: 1,
      backgroundColor: colors.border,
      marginLeft: spacing.md + 40 + spacing.sm,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: 80,
    },
    emptyIcon: {
      marginBottom: spacing.md,
      opacity: 0.4,
    },
    emptyText: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.medium,
      color: colors.textMuted,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  })

  const renderItem = useCallback(
    ({ item }: { item: AppNotification }) => (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleTap(item)}
        style={[styles.row, !item.is_read && styles.rowUnread]}
      >
        <View style={styles.iconWrap}>
          {getTypeIcon(item.type, colors.primary)}
        </View>
        <View style={styles.rowContent}>
          <View style={styles.rowTitleRow}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {!item.is_read && <View style={styles.unreadDot} />}
          </View>
          {item.body ? (
            <Text style={styles.rowBody} numberOfLines={2}>
              {item.body}
            </Text>
          ) : null}
          <Text style={styles.rowTime}>{timeAgo(item.created_at)}</Text>
        </View>
      </TouchableOpacity>
    ),
    [colors, handleTap],
  )

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Bell size={48} color={colors.textMuted} style={styles.emptyIcon} />
        <Text style={styles.emptyText}>No notifications yet</Text>
      </View>
    ),
    [colors],
  )

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        {hasUnread && (
          <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
            <CheckCheck size={16} color={colors.primary} />
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={
          notifications.length === 0
            ? { flex: 1 }
            : { paddingBottom: insets.bottom }
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      />
    </View>
  )
}
