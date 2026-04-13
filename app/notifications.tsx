import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  SectionList,
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
import { runNotificationEngine } from '../lib/notificationEngine'
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
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CalendarClock,
  Target,
  Flame,
  Sparkles,
  FileBarChart,
  Utensils,
  Moon,
  Smile,
  Shield,
  Activity,
  Clock,
  Zap,
} from 'lucide-react-native'

// ─── Type → Visual Config ────────────────────────────────────────────────────

interface TypeConfig {
  icon: React.ReactNode
  color: string
  category: string
}

function getTypeConfig(type: string, size: number = 20): TypeConfig {
  switch (type) {
    // Wellness
    case 'wellness_drop':
      return { icon: <TrendingDown size={size} color="#FF7070" />, color: '#FF7070', category: 'Wellness' }
    case 'wellness_improve':
      return { icon: <TrendingUp size={size} color="#A2FF86" />, color: '#A2FF86', category: 'Wellness' }
    case 'missing_data':
      return { icon: <AlertTriangle size={size} color="#FF9800" />, color: '#FF9800', category: 'Wellness' }

    // Routines
    case 'routine_reminder':
      return { icon: <CalendarClock size={size} color="#B983FF" />, color: '#B983FF', category: 'Routines' }
    case 'routine_missed':
      return { icon: <Clock size={size} color="#FFB347" />, color: '#FFB347', category: 'Routines' }

    // Health
    case 'health_alert':
      return { icon: <Activity size={size} color="#FF7070" />, color: '#FF7070', category: 'Health' }
    case 'vaccine_due':
      return { icon: <Shield size={size} color="#4D96FF" />, color: '#4D96FF', category: 'Health' }

    // Goals & Streaks
    case 'goal_achieved':
      return { icon: <Target size={size} color="#A2FF86" />, color: '#A2FF86', category: 'Goals' }
    case 'goal_missed':
      return { icon: <Target size={size} color="#FF9800" />, color: '#FF9800', category: 'Goals' }
    case 'streak':
      return { icon: <Flame size={size} color="#F59E0B" />, color: '#F59E0B', category: 'Goals' }
    case 'streak_broken':
      return { icon: <Flame size={size} color="#FF7070" />, color: '#FF7070', category: 'Goals' }

    // Insights & Summaries
    case 'insight':
      return { icon: <Sparkles size={size} color="#B983FF" />, color: '#B983FF', category: 'Insights' }
    case 'milestone':
      return { icon: <Zap size={size} color="#F59E0B" />, color: '#F59E0B', category: 'Insights' }
    case 'daily_summary':
      return { icon: <FileBarChart size={size} color="#4D96FF" />, color: '#4D96FF', category: 'Insights' }
    case 'weekly_report':
      return { icon: <FileBarChart size={size} color="#A07FDC" />, color: '#A07FDC', category: 'Insights' }

    // Community
    case 'mention':
      return { icon: <AtSign size={size} color="#7048B8" />, color: '#7048B8', category: 'Community' }
    case 'reply':
      return { icon: <MessageCircle size={size} color="#7048B8" />, color: '#7048B8', category: 'Community' }
    case 'like':
      return { icon: <Heart size={size} color="#FF8AD8" />, color: '#FF8AD8', category: 'Community' }
    case 'channel':
      return { icon: <Hash size={size} color="#4D96FF" />, color: '#4D96FF', category: 'Community' }

    // Care Circle
    case 'care_circle_invite':
    case 'care_circle_accepted':
      return { icon: <Heart size={size} color="#FF8AD8" />, color: '#FF8AD8', category: 'Care Circle' }

    // Reminder
    case 'reminder':
      return { icon: <Bell size={size} color="#F59E0B" />, color: '#F59E0B', category: 'Other' }

    default:
      return { icon: <Bell size={size} color="#A07FDC" />, color: '#A07FDC', category: 'Other' }
  }
}

// ─── Navigation helper ───────────────────────────────────────────────────────

function navigateForNotification(item: AppNotification) {
  const data = item.data || {}
  switch (item.type) {
    case 'wellness_drop':
    case 'wellness_improve':
    case 'daily_summary':
    case 'weekly_report':
      // Navigate to analytics tab
      router.push('/(tabs)/vault')
      break
    case 'missing_data':
    case 'routine_missed':
    case 'routine_reminder':
      // Navigate to calendar/agenda
      router.push('/(tabs)/agenda')
      break
    case 'health_alert':
    case 'vaccine_due':
    case 'goal_achieved':
    case 'goal_missed':
      router.push('/(tabs)/vault')
      break
    case 'streak':
    case 'streak_broken':
      router.push('/(tabs)/vault')
      break
    case 'insight':
    case 'milestone':
      router.push('/insights')
      break
    case 'mention':
    case 'reply':
    case 'like':
    case 'channel':
      if (data.channelId) {
        router.push(`/channel/${data.channelId}` as any)
      }
      break
    case 'reminder':
      // Navigate to home tab where the reminders section lives
      router.replace('/(tabs)')
      break
    default:
      break
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function groupByDate(notifications: AppNotification[]): { title: string; data: AppNotification[] }[] {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  const groups: Record<string, { label: string; date: string; items: AppNotification[] }> = {}
  for (const n of notifications) {
    const date = n.created_at.split('T')[0]
    let label: string
    if (date === today) label = 'Today'
    else if (date === yesterday) label = 'Yesterday'
    else label = new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

    if (!groups[date]) groups[date] = { label, date, items: [] }
    groups[date].items.push(n)
  }

  return Object.values(groups)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(({ label, items }) => ({ title: label, data: items }))
}

// ─── Filter Tabs ─────────────────────────────────────────────────────────────

const FILTER_TABS = ['All', 'Wellness', 'Health', 'Goals', 'Routines', 'Community', 'Insights'] as const
type FilterTab = typeof FILTER_TABS[number]

function matchesFilter(type: string, filter: FilterTab): boolean {
  if (filter === 'All') return true
  const config = getTypeConfig(type)
  return config.category === filter
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const { colors, radius, spacing, fontSize, fontWeight } = useTheme()
  const insets = useSafeAreaInsets()

  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All')

  const load = useCallback(async () => {
    // Run engine to generate any pending notifications first
    await runNotificationEngine()
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
    navigateForNotification(item)
  }, [])

  const filtered = notifications.filter((n) => matchesFilter(n.type, activeFilter))
  const sections = groupByDate(filtered)
  const hasUnread = notifications.some((n) => !n.is_read)
  const unreadCount = notifications.filter((n) => !n.is_read).length

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={[styles.headerBadge, { backgroundColor: brand.error }]}>
              <Text style={styles.headerBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </View>
        {hasUnread && (
          <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
            <CheckCheck size={16} color={colors.primary} />
            <Text style={[styles.markAllText, { color: colors.primary }]}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filterRow, { borderBottomColor: colors.border }]}>
        <View style={styles.filterScroll}>
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab
            const count = tab === 'All'
              ? notifications.length
              : notifications.filter((n) => matchesFilter(n.type, tab)).length

            if (tab !== 'All' && count === 0) return null

            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveFilter(tab)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive ? colors.primary + '20' : 'transparent',
                    borderColor: isActive ? colors.primary : colors.border,
                    borderRadius: radius.full,
                  },
                ]}
              >
                <Text style={[
                  styles.filterChipText,
                  { color: isActive ? colors.primary : colors.textSecondary },
                ]}>
                  {tab}
                </Text>
                {count > 0 && tab !== 'All' && (
                  <View style={[styles.filterCount, { backgroundColor: isActive ? colors.primary : colors.textMuted }]}>
                    <Text style={styles.filterCountText}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      {/* Notification List */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionHeader, { backgroundColor: colors.bg }]}>
            <Text style={[styles.sectionHeaderText, { color: colors.textMuted }]}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const config = getTypeConfig(item.type)
          return (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleTap(item)}
              style={[
                styles.row,
                !item.is_read && { backgroundColor: colors.primaryTint },
              ]}
            >
              <View style={[styles.iconWrap, { backgroundColor: config.color + '15', borderColor: config.color + '25' }]}>
                {config.icon}
              </View>
              <View style={styles.rowContent}>
                <View style={styles.rowTitleRow}>
                  <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {!item.is_read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
                </View>
                {item.body ? (
                  <Text style={[styles.rowBody, { color: colors.textSecondary }]} numberOfLines={2}>
                    {item.body}
                  </Text>
                ) : null}
                <View style={styles.rowFooter}>
                  <Text style={[styles.rowTime, { color: colors.textMuted }]}>{timeAgo(item.created_at)}</Text>
                  <Text style={[styles.rowCategory, { color: config.color }]}>{config.category}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )
        }}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.surface }]}>
              <Bell size={32} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {activeFilter === 'All' ? 'No notifications yet' : `No ${activeFilter.toLowerCase()} notifications`}
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
              {activeFilter === 'All'
                ? 'Grandma will notify you about wellness changes, routine reminders, health alerts, and more.'
                : `Notifications in this category will appear here.`
              }
            </Text>
          </View>
        )}
        contentContainerStyle={
          sections.length === 0
            ? { flex: 1 }
            : { paddingBottom: insets.bottom + 20 }
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        stickySectionHeadersEnabled
      />
    </View>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  headerBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  headerBadgeText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  markAllText: { fontSize: 14, fontWeight: '500' },

  // Filter tabs
  filterRow: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  filterScroll: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 13, fontWeight: '600' },
  filterCount: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterCountText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF' },

  // Section headers
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionHeaderText: { fontSize: 13, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },

  // Notification row
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  rowContent: { flex: 1 },
  rowTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  rowBody: { fontSize: 14, fontWeight: '500', marginTop: 3, lineHeight: 20 },
  rowFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  rowTime: { fontSize: 12, fontWeight: '500' },
  rowCategory: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  separator: { height: 1, marginLeft: 70 },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 80,
    gap: 12,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  emptySubtext: { fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 20 },
})
