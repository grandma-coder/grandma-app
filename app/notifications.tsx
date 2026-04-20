/**
 * Notifications Inbox — cream-paper redesign.
 *
 * Functionality (filter, mark read, navigation, refresh, date grouping) is
 * unchanged. This file only restyles the screen to the design system tokens
 * (Fraunces / DM Sans / sticker palette / paper surfaces).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  SectionList,
  Pressable,
  StyleSheet,
  RefreshControl,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
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
  Moon,
  Shield,
  Activity,
  Clock,
  Zap,
} from 'lucide-react-native'
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type AppNotification,
} from '../lib/channelPosts'
import { runNotificationEngine } from '../lib/notificationEngine'
import { useTheme, getModeColor } from '../constants/theme'
import { useModeStore } from '../store/useModeStore'
import { useBehaviorStore } from '../store/useBehaviorStore'
import { useChildStore } from '../store/useChildStore'
import { BrandedLoader } from '../components/ui/BrandedLoader'
import { Display, MonoCaps } from '../components/ui/Typography'

// ─── Type → Visual Config ───────────────────────────────────────────────────

type StickerKey =
  | 'coral'
  | 'green'
  | 'peach'
  | 'yellow'
  | 'lilac'
  | 'blue'
  | 'pink'

type CategoryKey =
  | 'Wellness'
  | 'Routines'
  | 'Health'
  | 'Goals'
  | 'Insights'
  | 'Community'
  | 'Care Circle'
  | 'Other'

interface TypeConfig {
  Icon: React.ComponentType<{ size?: number; color?: string }>
  stickerKey: StickerKey
  category: CategoryKey
}

const TYPE_CONFIG: Record<string, TypeConfig> = {
  // Wellness
  wellness_drop:    { Icon: TrendingDown,   stickerKey: 'coral',  category: 'Wellness' },
  wellness_improve: { Icon: TrendingUp,     stickerKey: 'green',  category: 'Wellness' },
  missing_data:     { Icon: AlertTriangle,  stickerKey: 'peach',  category: 'Wellness' },
  // Routines
  routine_reminder: { Icon: CalendarClock,  stickerKey: 'lilac',  category: 'Routines' },
  routine_missed:   { Icon: Clock,          stickerKey: 'peach',  category: 'Routines' },
  // Health
  health_alert:     { Icon: Activity,       stickerKey: 'coral',  category: 'Health'   },
  vaccine_due:      { Icon: Shield,         stickerKey: 'blue',   category: 'Health'   },
  // Goals & streaks
  goal_achieved:    { Icon: Target,         stickerKey: 'green',  category: 'Goals'    },
  goal_missed:      { Icon: Target,         stickerKey: 'peach',  category: 'Goals'    },
  streak:           { Icon: Flame,          stickerKey: 'yellow', category: 'Goals'    },
  streak_broken:    { Icon: Flame,          stickerKey: 'coral',  category: 'Goals'    },
  // Insights
  insight:          { Icon: Sparkles,       stickerKey: 'lilac',  category: 'Insights' },
  milestone:        { Icon: Zap,            stickerKey: 'yellow', category: 'Insights' },
  daily_summary:    { Icon: FileBarChart,   stickerKey: 'blue',   category: 'Insights' },
  weekly_report:    { Icon: FileBarChart,   stickerKey: 'lilac',  category: 'Insights' },
  // Community
  mention:          { Icon: AtSign,         stickerKey: 'lilac',  category: 'Community' },
  reply:            { Icon: MessageCircle,  stickerKey: 'lilac',  category: 'Community' },
  like:             { Icon: Heart,          stickerKey: 'pink',   category: 'Community' },
  channel:          { Icon: Hash,           stickerKey: 'blue',   category: 'Community' },
  // Care circle
  care_circle_invite:   { Icon: Heart,      stickerKey: 'pink',   category: 'Care Circle' },
  care_circle_accepted: { Icon: Heart,      stickerKey: 'pink',   category: 'Care Circle' },
  // Other
  reminder:         { Icon: Bell,           stickerKey: 'yellow', category: 'Other'    },
}

const DEFAULT_CONFIG: TypeConfig = { Icon: Bell, stickerKey: 'lilac', category: 'Other' }

function getTypeConfig(type: string): TypeConfig {
  return TYPE_CONFIG[type] ?? DEFAULT_CONFIG
}

// ─── Navigation helper ──────────────────────────────────────────────────────

function navigateForNotification(item: AppNotification) {
  const data = item.data || {}

  // A notification about a child is always a kids-mode notification.
  // Switch journey mode + active child first so the destination screen
  // (Analytics, Calendar, etc.) renders the kids variant with the right
  // child selected — instead of the user's currently active behavior.
  if (data.childId) {
    const { children, setActiveChild } = useChildStore.getState()
    const target = children.find((c) => c.id === data.childId)
    if (target) setActiveChild(target)

    if (useModeStore.getState().mode !== 'kids') {
      useBehaviorStore.getState().switchTo('kids')
      useModeStore.getState().setMode('kids')
    }
  }

  switch (item.type) {
    case 'wellness_drop':
    case 'wellness_improve':
    case 'daily_summary':
    case 'weekly_report':
    case 'health_alert':
    case 'vaccine_due':
    case 'goal_achieved':
    case 'goal_missed':
      router.push('/(tabs)/vault')
      break
    case 'missing_data':
    case 'routine_missed':
    case 'routine_reminder':
      router.push('/(tabs)/agenda')
      break
    case 'streak':
    case 'streak_broken':
      router.push('/daily-rewards')
      break
    case 'insight':
    case 'milestone':
      router.push('/insights')
      break
    case 'mention':
    case 'reply':
    case 'like':
    case 'channel':
      if (data.channelId) router.push(`/channel/${data.channelId}` as any)
      break
    case 'care_circle_invite':
    case 'care_circle_accepted':
      router.push('/manage-caregivers')
      break
    case 'reminder':
      router.push('/(tabs)/agenda')
      break
    default:
      break
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

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

interface DateSection {
  title: string
  data: AppNotification[]
}

function groupByDate(notifications: AppNotification[]): DateSection[] {
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

// ─── Filter Tabs ────────────────────────────────────────────────────────────

const FILTER_TABS = ['All', 'Wellness', 'Health', 'Goals', 'Routines', 'Community', 'Insights'] as const
type FilterTab = typeof FILTER_TABS[number]

function matchesFilter(type: string, filter: FilterTab): boolean {
  if (filter === 'All') return true
  return getTypeConfig(type).category === filter
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const { colors, stickers, radius, isDark, font } = useTheme()
  const insets = useSafeAreaInsets()
  const mode = useModeStore((s) => s.mode)
  const accent = getModeColor(mode, isDark)

  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All')

  const load = useCallback(async () => {
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

  const filtered = useMemo(
    () => notifications.filter((n) => matchesFilter(n.type, activeFilter)),
    [notifications, activeFilter],
  )
  const sections = useMemo(() => groupByDate(filtered), [filtered])
  const hasUnread = notifications.some((n) => !n.is_read)
  const unreadCount = notifications.filter((n) => !n.is_read).length

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg }, styles.loading]}>
        <BrandedLoader />
      </View>
    )
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <View style={styles.topBarRow}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <View
              style={[
                styles.backBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <ArrowLeft size={18} color={colors.text} strokeWidth={2} />
            </View>
          </Pressable>

          <View style={styles.titleWrap}>
            <Display size={26}>Notifications</Display>
            {unreadCount > 0 && (
              <View style={[styles.titleCount, { backgroundColor: stickers.coral }]}>
                <Text style={[styles.titleCountText, { color: '#FFFEF8', fontFamily: font.bodySemiBold }]}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>

          {hasUnread ? (
            <Pressable onPress={handleMarkAllRead} hitSlop={8} style={styles.markAllBtn}>
              <CheckCheck size={16} color={colors.text} strokeWidth={2} />
              <Text style={[styles.markAllText, { color: colors.text, fontFamily: font.bodyMedium }]}>
                Mark all read
              </Text>
            </Pressable>
          ) : (
            <View style={styles.markAllPlaceholder} />
          )}
        </View>
      </View>

      {/* Filter pills */}
      <View style={styles.filterRow}>
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab
          const count = tab === 'All'
            ? notifications.length
            : notifications.filter((n) => matchesFilter(n.type, tab)).length

          if (tab !== 'All' && count === 0) return null

          return (
            <Pressable
              key={tab}
              onPress={() => setActiveFilter(tab)}
              hitSlop={6}
              style={[
                styles.filterChip,
                {
                  backgroundColor: colors.surface,
                  borderColor: isActive ? accent : colors.border,
                  borderWidth: isActive ? 1.5 : 1,
                  borderRadius: radius.full,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color: isActive ? colors.text : colors.textMuted,
                    fontFamily: isActive ? font.bodySemiBold : font.bodyMedium,
                  },
                ]}
              >
                {tab}
              </Text>
              {count > 0 && tab !== 'All' && (
                <View
                  style={[
                    styles.filterCount,
                    { backgroundColor: isDark ? 'rgba(245,237,220,0.12)' : 'rgba(20,19,19,0.10)' },
                  ]}
                >
                  <Text style={[styles.filterCountText, { color: colors.textSecondary, fontFamily: font.bodySemiBold }]}>
                    {count}
                  </Text>
                </View>
              )}
            </Pressable>
          )
        })}
      </View>

      {/* Notification list */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          sections.length === 0 ? styles.emptyContent : { paddingBottom: insets.bottom + 24 }
        }
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionHeader, { backgroundColor: colors.bg }]}>
            <MonoCaps size={11} color={colors.textMuted}>{section.title}</MonoCaps>
          </View>
        )}
        renderItem={({ item, index, section }) => {
          const cfg = getTypeConfig(item.type)
          const stickerColor = stickers[cfg.stickerKey]
          const isFirst = index === 0
          const isLast = index === section.data.length - 1

          return (
            <View style={styles.rowOuter}>
              <Pressable
                onPress={() => handleTap(item)}
                style={({ pressed }) => [
                  styles.rowInner,
                  {
                    backgroundColor: item.is_read ? colors.surface : colors.surfaceRaised,
                    borderColor: colors.border,
                    borderTopWidth: isFirst ? 1 : 0,
                    borderTopLeftRadius: isFirst ? radius.md : 0,
                    borderTopRightRadius: isFirst ? radius.md : 0,
                    borderBottomLeftRadius: isLast ? radius.md : 0,
                    borderBottomRightRadius: isLast ? radius.md : 0,
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: stickerColor + '24', borderColor: stickerColor + '44' },
                  ]}
                >
                  <cfg.Icon size={20} color={stickerColor} />
                </View>
                <View style={styles.rowContent}>
                  <View style={styles.rowTitleRow}>
                    <Text
                      style={[styles.rowTitle, { color: colors.text, fontFamily: font.bodySemiBold }]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    {!item.is_read && (
                      <View style={[styles.unreadDot, { backgroundColor: stickerColor }]} />
                    )}
                  </View>
                  {item.body ? (
                    <Text
                      style={[styles.rowBody, { color: colors.textMuted, fontFamily: font.body }]}
                      numberOfLines={2}
                    >
                      {item.body}
                    </Text>
                  ) : null}
                  <View style={styles.rowFooter}>
                    <Text style={[styles.rowTime, { color: colors.textFaint, fontFamily: font.body }]}>
                      {timeAgo(item.created_at)}
                    </Text>
                    <Text
                      style={[
                        styles.rowCategory,
                        { color: stickerColor, fontFamily: font.bodySemiBold },
                      ]}
                    >
                      {cfg.category.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </Pressable>

              {!isLast && (
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: colors.border },
                  ]}
                />
              )}
            </View>
          )
        }}
        ListEmptyComponent={() => (
          <View style={styles.emptyWrap}>
            <View
              style={[
                styles.emptyIconWrap,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Bell size={28} color={colors.textMuted} strokeWidth={1.6} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: font.bodySemiBold }]}>
              {activeFilter === 'All' ? 'No notifications yet' : `No ${activeFilter.toLowerCase()} notifications`}
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted, fontFamily: font.body }]}>
              {activeFilter === 'All'
                ? 'Grandma will notify you about wellness changes, routine reminders, health alerts, and more.'
                : 'Notifications in this category will appear here.'}
            </Text>
          </View>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accent}
          />
        }
        stickySectionHeadersEnabled
      />
    </View>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  loading: { alignItems: 'center', justifyContent: 'center' },

  // Top bar
  topBar: {
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleCount: {
    minWidth: 26,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCountText: { fontSize: 12 },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  markAllText: { fontSize: 13 },
  markAllPlaceholder: { width: 0, height: 0 },

  // Filter pills
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  filterChipText: { fontSize: 13 },
  filterCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountText: { fontSize: 11 },

  // Section headers
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
  },

  // Notification rows
  rowOuter: {
    paddingHorizontal: 16,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 0,
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
  rowTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTitle: { fontSize: 15, flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  rowBody: { fontSize: 14, marginTop: 3, lineHeight: 20 },
  rowFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  rowTime: { fontSize: 12 },
  rowCategory: { fontSize: 11, letterSpacing: 0.6 },
  divider: { height: 1, marginLeft: 14 + 42 + 12 },

  // Empty state
  emptyContent: { flex: 1 },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 80,
    gap: 10,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: { fontSize: 18, textAlign: 'center' },
  emptySubtext: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
})
