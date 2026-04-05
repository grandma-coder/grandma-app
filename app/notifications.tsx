/**
 * E4 — Notifications Center
 *
 * Modal screen with filter tabs, grouped date sections,
 * swipe-to-dismiss, mark all read.
 */

import { useState, useCallback } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  StyleSheet,
  Animated,
} from 'react-native'
import { router } from 'expo-router'
import {
  X,
  Bell,
  BellOff,
  CheckCheck,
  Settings,
  Heart,
  Users,
  ShoppingBag,
  MessageSquare,
  Info,
  Calendar,
  Baby,
  Sparkles,
  Trash2,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTheme, brand } from '../constants/theme'
import {
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getCategory,
  type AppNotification,
  type NotificationType,
} from '../lib/notifications'

// ─── Type config ───────────────────────────────────────────────────────────

const TYPE_ICON: Record<string, typeof Heart> = {
  care_circle_invite: Users,
  care_circle_accepted: Users,
  child_log: Baby,
  reminder: Bell,
  milestone: Sparkles,
  cycle_prediction: Calendar,
  pregnancy_week: Calendar,
  appointment: Calendar,
  system: Info,
  chat: MessageSquare,
}

const TYPE_COLOR: Record<string, string> = {
  care_circle_invite: brand.secondary,
  care_circle_accepted: brand.success,
  child_log: brand.kids,
  reminder: brand.accent,
  milestone: brand.prePregnancy,
  cycle_prediction: brand.phase.menstrual,
  pregnancy_week: brand.pregnancy,
  appointment: brand.phase.ovulation,
  system: brand.phase.luteal,
  chat: brand.secondary,
}

const FILTERS = ['All', 'Health', 'Care Circle', 'Channels', 'System']

// ─── Date grouping ─────────────────────────────────────────────────────────

function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return 'This Week'
  return 'Earlier'
}

function groupNotifications(notifs: AppNotification[]): { label: string; items: AppNotification[] }[] {
  const groups: Record<string, AppNotification[]> = {}
  const order = ['Today', 'Yesterday', 'This Week', 'Earlier']

  for (const n of notifs) {
    const label = getDateGroup(n.created_at)
    if (!groups[label]) groups[label] = []
    groups[label].push(n)
  }

  return order
    .filter((label) => groups[label]?.length)
    .map((label) => ({ label, items: groups[label] }))
}

// ─── Navigation from notification ──────────────────────────────────────────

function navigateToNotification(n: AppNotification) {
  const screen = n.data?.screen
  if (screen) {
    router.push(screen as any)
  }
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()

  const [filter, setFilter] = useState('All')

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    staleTime: 30 * 1000,
  })

  const filtered = filter === 'All'
    ? notifications
    : notifications.filter((n) => getCategory(n.type) === filter)

  const grouped = groupNotifications(filtered)
  const unreadCount = notifications.filter((n) => !n.read).length

  async function handleMarkAllRead() {
    await markAllAsRead()
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  async function handleTap(n: AppNotification) {
    if (!n.read) {
      await markAsRead(n.id)
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
    navigateToNotification(n)
  }

  async function handleDelete(id: string) {
    await deleteNotification(id)
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <X size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <Pressable onPress={handleMarkAllRead} style={styles.headerBtn}>
              <CheckCheck size={20} color={colors.primary} />
            </Pressable>
          )}
          <Pressable onPress={() => router.push('/profile/notifications')} style={styles.headerBtn}>
            <Settings size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterBar}
      >
        {FILTERS.map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[
              styles.filterChip,
              {
                backgroundColor: filter === f ? colors.primaryTint : colors.surface,
                borderColor: filter === f ? colors.primary : colors.border,
                borderRadius: radius.full,
              },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                { color: filter === f ? colors.primary : colors.textSecondary },
              ]}
            >
              {f}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Notification list */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Empty state */}
        {filtered.length === 0 && (
          <View style={styles.emptyWrap}>
            <BellOff size={40} color={colors.textMuted} strokeWidth={1.5} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              All caught up!
            </Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              No notifications right now. We will let you know when something needs your attention.
            </Text>
          </View>
        )}

        {grouped.map((group) => (
          <View key={group.label} style={styles.group}>
            <Text style={[styles.groupLabel, { color: colors.textMuted }]}>
              {group.label}
            </Text>
            {group.items.map((n) => {
              const Icon = TYPE_ICON[n.type] ?? Info
              const color = TYPE_COLOR[n.type] ?? colors.textMuted

              return (
                <Pressable
                  key={n.id}
                  onPress={() => handleTap(n)}
                  onLongPress={() => {
                    Alert.alert('Delete', 'Remove this notification?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => handleDelete(n.id) },
                    ])
                  }}
                  style={({ pressed }) => [
                    styles.notifItem,
                    {
                      backgroundColor: n.read ? colors.surface : colors.primaryTint + '40',
                      borderRadius: radius.xl,
                    },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  {/* Icon */}
                  <View style={[styles.notifIcon, { backgroundColor: color + '15' }]}>
                    <Icon size={20} color={color} strokeWidth={2} />
                  </View>

                  {/* Content */}
                  <View style={styles.notifContent}>
                    <Text
                      style={[
                        styles.notifTitle,
                        { color: colors.text, fontWeight: n.read ? '500' : '700' },
                      ]}
                      numberOfLines={1}
                    >
                      {n.title}
                    </Text>
                    {n.body && (
                      <Text
                        style={[styles.notifBody, { color: colors.textSecondary }]}
                        numberOfLines={2}
                      >
                        {n.body}
                      </Text>
                    )}
                    <Text style={[styles.notifTime, { color: colors.textMuted }]}>
                      {formatTime(n.created_at)}
                    </Text>
                  </View>

                  {/* Unread dot */}
                  {!n.read && (
                    <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                  )}
                </Pressable>
              )
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHrs = Math.floor(diffMin / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerActions: { flexDirection: 'row', gap: 8 },

  // Filters
  filterBar: { gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  filterChip: { paddingVertical: 7, paddingHorizontal: 16, borderWidth: 1 },
  filterText: { fontSize: 13, fontWeight: '600' },

  // List
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },

  // Empty
  emptyWrap: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '800' },
  emptyBody: { fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 20, paddingHorizontal: 32 },

  // Groups
  group: { marginBottom: 16 },
  groupLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    paddingLeft: 4,
  },

  // Notification item
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifContent: { flex: 1, gap: 2 },
  notifTitle: { fontSize: 14 },
  notifBody: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  notifTime: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
})
