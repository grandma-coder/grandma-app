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
import { useBehaviorStore, type Behavior } from '../store/useBehaviorStore'
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
  } else if (data.behavior === 'pregnancy' && useModeStore.getState().mode !== 'pregnancy') {
    useBehaviorStore.getState().switchTo('pregnancy')
    useModeStore.getState().setMode('pregnancy')
  } else if (data.behavior === 'pre-pregnancy' && useModeStore.getState().mode !== 'pre-pregnancy') {
    useBehaviorStore.getState().switchTo('pre-pregnancy')
    useModeStore.getState().setMode('pre-pregnancy')
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

// ─── Behavior Filter ─────────────────────────────────────────────────────────

type BehaviorFilter = 'all' | Behavior

const COMMUNITY_TYPES = new Set(['mention', 'reply', 'like', 'channel', 'care_circle_invite', 'care_circle_accepted'])

function inferBehavior(n: AppNotification): Behavior | null {
  // Explicit tag from generator wins
  const tagged = n.data?.behavior
  if (tagged === 'pregnancy' || tagged === 'pre-pregnancy' || tagged === 'kids') {
    return tagged
  }
  if (n.data?.childId) return 'kids'
  if (COMMUNITY_TYPES.has(n.type)) return null
  return null
}

function matchesBehaviorFilter(n: AppNotification, filter: BehaviorFilter): boolean {
  if (filter === 'all') return true
  const b = inferBehavior(n)
  if (b === null) return true // community / untagged → visible in all
  return b === filter
}

const BEHAVIOR_LABELS: Record<Behavior, string> = {
  'pre-pregnancy': 'Pre-Preg',
  pregnancy: 'Pregnancy',
  kids: 'Kids',
}

const BEHAVIOR_COLORS: Record<Behavior, string> = {
  'pre-pregnancy': '#FF8AD8',
  pregnancy: '#B983FF',
  kids: '#4D96FF',
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const { colors, stickers, radius, isDark, font } = useTheme()
  const insets = useSafeAreaInsets()
  const mode = useModeStore((s) => s.mode)
  const accent = getModeColor(mode, isDark)
  const enrolledBehaviors = useBehaviorStore((s) => s.enrolledBehaviors)
  const showBehaviorFilter = enrolledBehaviors.length > 1

  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All')
  const [activeBehavior, setActiveBehavior] = useState<BehaviorFilter>('all')

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
    () =>
      notifications.filter(
        (n) =>
          matchesFilter(n.type, activeFilter) &&
          matchesBehaviorFilter(n, activeBehavior),
      ),
    [notifications, activeFilter, activeBehavior],
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
              <View style={[styles.titleCount, {
                backgroundColor: stickers.coral,
                borderWidth: 1.5,
                borderColor: isDark ? 'transparent' : '#141313',
              }]}>
                <Text style={[styles.titleCountText, { color: '#FFFEF8', fontFamily: 'DMSans_700Bold' }]}>
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

      {/* Behavior filter pills — only when enrolled in 2+ behaviors */}
      {showBehaviorFilter && (
        <View style={[styles.filterRow, styles.filterRowBehavior]}>
          {(['all', ...enrolledBehaviors] as BehaviorFilter[]).map((b) => {
            const isActive = activeBehavior === b
            const label = b === 'all' ? 'All' : BEHAVIOR_LABELS[b]
            const chipColor = b === 'all' ? accent : BEHAVIOR_COLORS[b]
            const count =
              b === 'all'
                ? notifications.length
                : notifications.filter((n) => matchesBehaviorFilter(n, b)).length

            return (
              <Pressable
                key={b}
                onPress={() => setActiveBehavior(b)}
                hitSlop={6}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive
                      ? (b === 'all' ? '#141313' : chipColor + '26')
                      : (isDark ? colors.surface : '#FFFEF8'),
                    borderColor: isActive
                      ? (b === 'all' ? '#141313' : (isDark ? chipColor : '#141313'))
                      : (isDark ? colors.border : 'rgba(20,19,19,0.18)'),
                    borderWidth: 1.5,
                    borderRadius: 999,
                  },
                ]}
              >
                {b !== 'all' && (
                  <View style={[styles.behaviorDot, { backgroundColor: BEHAVIOR_COLORS[b], borderWidth: 1, borderColor: isDark ? 'transparent' : '#141313' }]} />
                )}
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: isActive
                        ? (b === 'all' ? '#FFFEF8' : (isDark ? chipColor : '#141313'))
                        : (isDark ? colors.textMuted : 'rgba(20,19,19,0.6)'),
                      fontFamily: 'DMSans_700Bold',
                    },
                  ]}
                >
                  {label}
                </Text>
                {count > 0 && b !== 'all' && (
                  <View
                    style={[
                      styles.filterCount,
                      { backgroundColor: isActive ? '#141313' : (isDark ? 'rgba(245,237,220,0.12)' : 'rgba(20,19,19,0.10)') },
                    ]}
                  >
                    <Text style={[styles.filterCountText, { color: isActive ? '#FFFEF8' : (isDark ? colors.textSecondary : '#141313'), fontFamily: 'DMSans_700Bold' }]}>
                      {count}
                    </Text>
                  </View>
                )}
              </Pressable>
            )
          })}
        </View>
      )}

      {/* Category filter pills */}
      <View style={styles.filterRow}>
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab
          const count = tab === 'All'
            ? notifications.filter((n) => matchesBehaviorFilter(n, activeBehavior)).length
            : notifications.filter(
                (n) => matchesFilter(n.type, tab) && matchesBehaviorFilter(n, activeBehavior),
              ).length

          if (tab !== 'All' && count === 0) return null

          return (
            <Pressable
              key={tab}
              onPress={() => setActiveFilter(tab)}
              hitSlop={6}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isActive
                    ? (tab === 'All' ? '#141313' : (isDark ? colors.surface : '#FFFEF8'))
                    : (isDark ? colors.surface : '#FFFEF8'),
                  borderColor: isActive ? '#141313' : (isDark ? colors.border : 'rgba(20,19,19,0.18)'),
                  borderWidth: 1.5,
                  borderRadius: 999,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color: isActive
                      ? (tab === 'All' ? '#FFFEF8' : (isDark ? colors.text : '#141313'))
                      : (isDark ? colors.textMuted : 'rgba(20,19,19,0.6)'),
                    fontFamily: 'DMSans_700Bold',
                  },
                ]}
              >
                {tab}
              </Text>
              {count > 0 && tab !== 'All' && (
                <View
                  style={[
                    styles.filterCount,
                    { backgroundColor: isActive ? '#141313' : (isDark ? 'rgba(245,237,220,0.12)' : 'rgba(20,19,19,0.10)') },
                  ]}
                >
                  <Text style={[styles.filterCountText, { color: isActive ? '#FFFEF8' : (isDark ? colors.textSecondary : '#141313'), fontFamily: 'DMSans_700Bold' }]}>
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
            <Text style={{
              fontSize: 11,
              fontFamily: 'DMSans_700Bold',
              letterSpacing: 1.6,
              color: isDark ? colors.textMuted : 'rgba(20,19,19,0.5)',
              textTransform: 'uppercase',
            }}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const cfg = getTypeConfig(item.type)
          const stickerColor = stickers[cfg.stickerKey]
          const stickerInk = isDark ? 'rgba(255,255,255,0.18)' : '#141313'
          const cardBg = item.is_read
            ? (isDark ? colors.surface : '#FFFEF8')
            : (isDark ? colors.surfaceRaised : stickerColor + '14')
          const cardBorder = item.is_read
            ? (isDark ? colors.border : 'rgba(20,19,19,0.1)')
            : (isDark ? stickerColor + '40' : stickerColor + '70')

          return (
            <View style={styles.rowOuter}>
              <Pressable
                onPress={() => handleTap(item)}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: 14,
                    backgroundColor: cardBg,
                    borderRadius: 22,
                    borderWidth: 1.5,
                    borderColor: cardBorder,
                    shadowColor: '#141313',
                    shadowOpacity: isDark ? 0 : 0.04,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 2 },
                  },
                  pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
                ]}
              >
                {/* Sticker badge */}
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: stickerColor,
                    borderWidth: 1.5,
                    borderColor: stickerInk,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <cfg.Icon size={18} color={isDark ? '#FFFFFF' : '#141313'} />
                </View>
                <View style={styles.rowContent}>
                  <View style={styles.rowTitleRow}>
                    <Text
                      style={[styles.rowTitle, {
                        color: isDark ? colors.text : '#141313',
                        fontFamily: 'Fraunces_700Bold',
                        letterSpacing: -0.2,
                      }]}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    {!item.is_read && (
                      <View style={[styles.unreadDot, { backgroundColor: stickerColor, borderWidth: 1, borderColor: stickerInk }]} />
                    )}
                  </View>
                  {item.body ? (
                    <Text
                      style={[styles.rowBody, { color: isDark ? colors.textMuted : 'rgba(20,19,19,0.65)', fontFamily: font.body }]}
                      numberOfLines={2}
                    >
                      {item.body}
                    </Text>
                  ) : null}
                  <View style={styles.rowFooter}>
                    <Text style={[styles.rowTime, { color: isDark ? colors.textFaint : 'rgba(20,19,19,0.4)', fontFamily: font.body }]}>
                      {timeAgo(item.created_at)}
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        fontFamily: 'DMSans_700Bold',
                        letterSpacing: 1.4,
                        color: isDark ? stickerColor : '#141313',
                        backgroundColor: stickerColor + (isDark ? '24' : '30'),
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: stickerColor + (isDark ? '40' : '80'),
                      }}
                    >
                      {cfg.category.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </Pressable>
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
  filterRowBehavior: {
    paddingBottom: 4,
  },
  behaviorDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
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
    paddingBottom: 8,
  },
  rowContent: { flex: 1 },
  rowTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  rowTitle: { fontSize: 15, flex: 1, lineHeight: 20 },
  unreadDot: { width: 9, height: 9, borderRadius: 5, marginTop: 6 },
  rowBody: { fontSize: 14, marginTop: 4, lineHeight: 20 },
  rowFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 8,
  },
  rowTime: { fontSize: 12 },

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
