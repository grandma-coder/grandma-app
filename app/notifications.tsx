/**
 * Notifications Inbox — cream-paper redesign, design-system aligned.
 *
 * All colors, fonts, radii, and shadows go through `useTheme()` / theme tokens.
 * Empty state uses the canonical <EmptyState>. Behavior chips use getModeColor
 * so dark mode auto-brightens.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  SectionList,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ArrowLeft, CheckCheck } from 'lucide-react-native'
import { Character, type CharacterName } from '../components/characters/Characters'
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type AppNotification,
} from '../lib/channelPosts'
import { runNotificationEngine } from '../lib/notificationEngine'
import { toDateStr } from '../lib/cycleLogic'
import { useTheme, getModeColor, radius, spacing, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../constants/theme'
import { useIsDiffuse } from '../components/ui/diffuse/DiffuseKit'
import { DiffuseBloomIcon, DiffuseEmptyState } from '../components/ui/diffuse/DiffusePrimitives'
import { useModeStore } from '../store/useModeStore'
import { useBehaviorStore, type Behavior } from '../store/useBehaviorStore'
import { useChildStore } from '../store/useChildStore'
import { BrandedLoader } from '../components/ui/BrandedLoader'
import { Display } from '../components/ui/Typography'
import { EmptyState } from '../components/ui/EmptyState'
import { MissingStickers } from '../components/stickers/MissingStickers'
import { useTranslation } from '../lib/i18n'

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
  | 'Pregnancy'
  | 'Other'

interface TypeConfig {
  character: CharacterName
  stickerKey: StickerKey
  category: CategoryKey
}

// Each notification type resolves to a Character-blob concept (the app-wide glyph
// family) — no Lucide icons here. Concepts are chosen to preserve meaning:
// wellness up/down → `activity` (a wellness-signal blob), goals/milestone → `star`
// (achievement), reports → `note`, community types → `community`.
const TYPE_CONFIG: Record<string, TypeConfig> = {
  // Wellness
  wellness_drop:    { character: 'activity',  stickerKey: 'coral',  category: 'Wellness' },
  wellness_improve: { character: 'activity',  stickerKey: 'green',  category: 'Wellness' },
  missing_data:     { character: 'warning',   stickerKey: 'peach',  category: 'Wellness' },
  // Routines
  routine_reminder: { character: 'clock',     stickerKey: 'lilac',  category: 'Routines' },
  routine_missed:   { character: 'clock',     stickerKey: 'peach',  category: 'Routines' },
  // Health
  health_alert:     { character: 'health',    stickerKey: 'coral',  category: 'Health'   },
  vaccine_due:      { character: 'vaccine',   stickerKey: 'blue',   category: 'Health'   },
  // Goals & streaks
  goal_achieved:    { character: 'star',      stickerKey: 'green',  category: 'Goals'    },
  goal_missed:      { character: 'star',      stickerKey: 'peach',  category: 'Goals'    },
  streak:           { character: 'streak',    stickerKey: 'yellow', category: 'Goals'    },
  streak_broken:    { character: 'streak',    stickerKey: 'coral',  category: 'Goals'    },
  // Insights
  insight:          { character: 'sparkle',   stickerKey: 'lilac',  category: 'Insights' },
  milestone:        { character: 'star',      stickerKey: 'yellow', category: 'Insights' },
  daily_summary:    { character: 'note',      stickerKey: 'blue',   category: 'Insights' },
  weekly_report:    { character: 'note',      stickerKey: 'lilac',  category: 'Insights' },
  // Community
  mention:          { character: 'community', stickerKey: 'lilac',  category: 'Community' },
  reply:            { character: 'community', stickerKey: 'lilac',  category: 'Community' },
  like:             { character: 'heart',     stickerKey: 'pink',   category: 'Community' },
  channel:          { character: 'community', stickerKey: 'blue',   category: 'Community' },
  // Care circle
  care_circle_invite:   { character: 'hug',   stickerKey: 'pink',   category: 'Care Circle' },
  care_circle_accepted: { character: 'heart', stickerKey: 'pink',   category: 'Care Circle' },
  // Pregnancy
  pregnancy_week:   { character: 'sparkle',   stickerKey: 'lilac',  category: 'Pregnancy' },
  appointment:      { character: 'clock',     stickerKey: 'lilac',  category: 'Pregnancy' },
  // Other
  reminder:         { character: 'bell',      stickerKey: 'yellow', category: 'Other'    },
}

const DEFAULT_CONFIG: TypeConfig = { character: 'bell', stickerKey: 'lilac', category: 'Other' }

function getTypeConfig(type: string): TypeConfig {
  return TYPE_CONFIG[type] ?? DEFAULT_CONFIG
}

// ─── Navigation helper ──────────────────────────────────────────────────────

function navigateForNotification(item: AppNotification) {
  const data = item.data || {}

  // Switch journey mode only if the user is actually enrolled in the target.
  // switchTo()/setMode() both silently no-op for an un-enrolled behavior
  // (see useBehaviorStore), which previously left the user in the wrong mode
  // while the routing below assumed the switch had landed (P2-86). We never
  // auto-enroll from a notification tap — that would fabricate a journey the
  // user never set up. If not enrolled, we leave the current mode and let the
  // mode-aware routing below pick a valid destination.
  const switchModeIfEnrolled = (target: 'kids' | 'pregnancy' | 'pre-pregnancy') => {
    const behaviorStore = useBehaviorStore.getState()
    const modeStore = useModeStore.getState()
    if (modeStore.mode === target) return
    if (!behaviorStore.isEnrolled(target)) return
    behaviorStore.switchTo(target)
    modeStore.setMode(target)
  }

  if (data.childId) {
    const { children, setActiveChild } = useChildStore.getState()
    const target = children.find((c) => c.id === data.childId)
    if (target) setActiveChild(target)

    switchModeIfEnrolled('kids')
  } else if (data.behavior === 'pregnancy') {
    switchModeIfEnrolled('pregnancy')
  } else if (data.behavior === 'pre-pregnancy') {
    switchModeIfEnrolled('pre-pregnancy')
  }

  // Pregnancy mode has no kid vault destinations (vaccines, growth, goals
  // tied to a child). Route those types to analytics or agenda instead.
  const currentMode = useModeStore.getState().mode
  const isPregnancy = currentMode === 'pregnancy'
  const isPrePregnancy = currentMode === 'pre-pregnancy'

  switch (item.type) {
    case 'wellness_drop':
    case 'wellness_improve':
    case 'daily_summary':
    case 'weekly_report':
    case 'health_alert':
      // In pregnancy / pre-pregnancy mode the vault has no analytics surface;
      // send the user to the dedicated insights screen instead.
      router.push(isPregnancy || isPrePregnancy ? '/insights' : '/(tabs)/vault')
      break
    case 'vaccine_due':
    case 'goal_achieved':
    case 'goal_missed':
      // Pregnancy + pre-pregnancy don't have vaccine / kid goal destinations.
      // Route to insights so the notification leads somewhere useful.
      router.push(isPregnancy || isPrePregnancy ? '/insights' : '/(tabs)/vault')
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
    case 'appointment':
      router.push('/(tabs)/agenda')
      break
    case 'pregnancy_week':
      // Week-milestone push → home so the week ring + today summary land in view.
      router.push('/(tabs)')
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
  const today = toDateStr(new Date())
  const yesterday = toDateStr(new Date(Date.now() - 86400000))

  const groups: Record<string, { label: string; date: string; items: AppNotification[] }> = {}
  for (const n of notifications) {
    // Local calendar date of the timestamp — `.split('T')[0]` would give the
    // UTC date and mis-group evening notifications against the local today/yesterday.
    const date = toDateStr(new Date(n.created_at))
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

const PREGNANCY_TYPES = new Set(['pregnancy_week', 'appointment'])
const PREGNANCY_DATA_KEYS = ['weekNumber', 'dueDate', 'trimester'] as const

function inferBehavior(n: AppNotification): Behavior | null {
  const tagged = n.data?.behavior
  if (tagged === 'pregnancy' || tagged === 'pre-pregnancy' || tagged === 'kids') {
    return tagged
  }
  if (n.data?.childId) return 'kids'
  if (PREGNANCY_TYPES.has(n.type)) return 'pregnancy'
  // Untagged but carries pregnancy-shaped data → treat as pregnancy.
  if (n.data && PREGNANCY_DATA_KEYS.some((k) => k in n.data!)) return 'pregnancy'
  if (COMMUNITY_TYPES.has(n.type)) return null
  return null
}

function matchesBehaviorFilter(n: AppNotification, filter: BehaviorFilter): boolean {
  if (filter === 'all') return true
  const b = inferBehavior(n)
  if (b === null) return true
  return b === filter
}

const BEHAVIOR_LABELS: Record<Behavior, string> = {
  'pre-pregnancy': 'Pre-Preg',
  pregnancy: 'Pregnancy',
  kids: 'Kids',
}

// Map Behavior → mode key used by getModeColor()
function behaviorToMode(b: Behavior): 'pre' | 'preg' | 'kids' {
  if (b === 'pre-pregnancy') return 'pre'
  if (b === 'pregnancy') return 'preg'
  return 'kids'
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const { colors, stickers, isDark, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const mode = useModeStore((s) => s.mode)
  const accent = diffuse ? getDiffuseAccent(mode, dt.isDark) : getModeColor(mode, isDark)
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

  const pageBg = diffuse ? dt.colors.bg : colors.bg

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: pageBg }, styles.loading]}>
        <BrandedLoader />
      </View>
    )
  }

  return (
    <View style={[styles.screen, { backgroundColor: pageBg }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8, borderBottomColor: diffuse ? dt.colors.line : colors.border }]}>
        <View style={styles.topBarRow}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <View
              style={[
                styles.backBtn,
                diffuse
                  ? { backgroundColor: 'transparent', borderColor: dt.colors.line2 }
                  : { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <ArrowLeft size={18} color={diffuse ? dt.colors.ink : colors.text} strokeWidth={diffuse ? 1.6 : 2} />
            </View>
          </Pressable>

          <View style={styles.titleWrap}>
            <Display size={26}>{t('notifications_title')}</Display>
            {unreadCount > 0 && (
              diffuse ? (
                <View style={[styles.titleCount, {
                  backgroundColor: 'transparent',
                  borderColor: dt.colors.line2,
                }]}>
                  <Text style={[styles.titleCountText, { color: dt.colors.ink, fontFamily: diffuseFont.monoBold }]}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              ) : (
                <View style={[styles.titleCount, {
                  backgroundColor: stickers.coral,
                  borderColor: isDark ? 'transparent' : colors.text,
                }]}>
                  <Text style={[styles.titleCountText, { color: colors.surface, fontFamily: font.bodySemiBold }]}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )
            )}
          </View>

          {hasUnread ? (
            <Pressable onPress={handleMarkAllRead} hitSlop={8} style={styles.markAllBtn}>
              <CheckCheck size={16} color={diffuse ? dt.colors.ink3 : colors.text} strokeWidth={diffuse ? 1.6 : 2} />
              <Text style={[
                styles.markAllText,
                diffuse
                  ? { color: dt.colors.ink, fontFamily: diffuseFont.mono, letterSpacing: 1.4, textTransform: 'uppercase', fontSize: 11 }
                  : { color: colors.text, fontFamily: font.bodyMedium },
              ]}>
                {t('notifications_markAllRead')}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.markAllPlaceholder} />
          )}
        </View>
      </View>

      {/* Behavior filter pills — only when enrolled in 2+ behaviors.
          Single-line horizontal scroll (never wraps) keeps the header short. */}
      {showBehaviorFilter && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={[styles.filterRow, styles.filterRowBehavior]}
        >
          {(['all', ...enrolledBehaviors] as BehaviorFilter[]).map((b) => {
            const isActive = activeBehavior === b
            const label = b === 'all' ? 'All' : BEHAVIOR_LABELS[b]
            const chipColor = b === 'all' ? accent : getModeColor(behaviorToMode(b), isDark)
            const count =
              b === 'all'
                ? notifications.length
                : notifications.filter((n) => matchesBehaviorFilter(n, b)).length

            const diffuseDotColor = b === 'all' ? accent : getDiffuseAccent(behaviorToMode(b), dt.isDark)

            return (
              <Pressable
                key={b}
                onPress={() => setActiveBehavior(b)}
                hitSlop={6}
                style={[
                  styles.filterChip,
                  diffuse
                    ? {
                        backgroundColor: isActive ? dt.colors.surface : 'transparent',
                        borderColor: isActive ? dt.colors.hairline : dt.colors.line,
                        borderWidth: 1,
                      }
                    : {
                        backgroundColor: isActive
                          ? (b === 'all' ? colors.text : chipColor + '26')
                          : colors.surface,
                        borderColor: isActive
                          ? (b === 'all' ? colors.text : (isDark ? chipColor : colors.text))
                          : colors.borderStrong,
                      },
                ]}
              >
                {b !== 'all' && (
                  <View style={[styles.behaviorDot, diffuse
                    ? { backgroundColor: diffuseDotColor, borderColor: 'transparent' }
                    : {
                        backgroundColor: chipColor,
                        borderColor: isDark ? 'transparent' : colors.text,
                      }]} />
                )}
                <Text
                  style={[
                    styles.filterChipText,
                    diffuse
                      ? {
                          color: isActive ? dt.colors.ink : dt.colors.ink3,
                          fontFamily: isActive ? diffuseFont.monoBold : diffuseFont.mono,
                          letterSpacing: 1,
                          textTransform: 'uppercase',
                          fontSize: 10,
                        }
                      : {
                          color: isActive
                            ? (b === 'all' ? colors.surface : (isDark ? chipColor : colors.text))
                            : colors.textMuted,
                          fontFamily: font.bodySemiBold,
                        },
                  ]}
                >
                  {label}
                </Text>
                {count > 0 && b !== 'all' && (
                  <Text style={[styles.filterCountText, diffuse
                    ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono }
                    : { color: isActive ? colors.text : colors.textMuted, fontFamily: font.bodyMedium }]}>
                    {count}
                  </Text>
                )}
              </Pressable>
            )
          })}
        </ScrollView>
      )}

      {/* Category filter pills — single-line horizontal scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
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
                diffuse
                  ? {
                      backgroundColor: isActive ? dt.colors.surface : 'transparent',
                      borderColor: isActive ? dt.colors.hairline : dt.colors.line,
                      borderWidth: 1,
                    }
                  : {
                      backgroundColor: isActive && tab === 'All' ? colors.text : colors.surface,
                      borderColor: isActive ? colors.text : colors.borderStrong,
                    },
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  diffuse
                    ? {
                        color: isActive ? dt.colors.ink : dt.colors.ink3,
                        fontFamily: isActive ? diffuseFont.monoBold : diffuseFont.mono,
                        letterSpacing: 1,
                        textTransform: 'uppercase',
                        fontSize: 10,
                      }
                    : {
                        color: isActive
                          ? (tab === 'All' ? colors.surface : colors.text)
                          : colors.textMuted,
                        fontFamily: font.bodySemiBold,
                      },
                ]}
              >
                {tab}
              </Text>
              {count > 0 && tab !== 'All' && (
                <Text style={[styles.filterCountText, diffuse
                  ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono }
                  : { color: isActive ? colors.text : colors.textMuted, fontFamily: font.bodyMedium }]}>
                  {count}
                </Text>
              )}
            </Pressable>
          )
        })}
      </ScrollView>

      {/* Notification list */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          sections.length === 0 ? styles.emptyContent : { paddingBottom: insets.bottom + spacing.lg }
        }
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionHeader, { backgroundColor: pageBg }]}>
            <Text style={[styles.sectionHeaderText, diffuse
              ? { fontFamily: diffuseFont.mono, color: dt.colors.ink3 }
              : {
                  fontFamily: font.bodySemiBold,
                  color: colors.textMuted,
                }]}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const cfg = getTypeConfig(item.type)
          const stickerColor = stickers[cfg.stickerKey]
          const stickerInk = isDark ? colors.borderLight : colors.text
          const cardBg = item.is_read
            ? colors.surface
            : (isDark ? colors.surfaceRaised : stickerColor + '14')
          const cardBorder = item.is_read
            ? colors.border
            : (isDark ? stickerColor + '40' : stickerColor + '70')

          if (diffuse) {
            // Per-concept sticker hue — the Character family's own colors, not a
            // flat accent wash — matching DiffuseLogIcon / DiffuseTimelineNode.
            const hue = dt.stickers[cfg.stickerKey]
            return (
              <View style={styles.rowOuter}>
                <Pressable
                  onPress={() => handleTap(item)}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      backgroundColor: dt.colors.surface,
                      borderColor: item.is_read ? dt.colors.line : dt.colors.line2,
                      borderWidth: 1,
                      shadowOpacity: 0,
                      elevation: 0,
                    },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  {/* Solid character glyphs sit clean — no bloom behind them. */}
                  <DiffuseBloomIcon color={hue} size={36} noBloom>
                    <Character name={cfg.character} size={24} color={hue} bg={dt.colors.surface} />
                  </DiffuseBloomIcon>
                  <View style={styles.rowContent}>
                    <View style={styles.rowTitleRow}>
                      <Text
                        style={[styles.rowTitle, {
                          color: dt.colors.ink,
                          fontFamily: diffuseFont.display,
                          letterSpacing: -0.3,
                        }]}
                        numberOfLines={2}
                      >
                        {item.title}
                      </Text>
                      {!item.is_read && (
                        <View style={[styles.unreadDot, { backgroundColor: accent, borderColor: 'transparent' }]} />
                      )}
                    </View>
                    {item.body ? (
                      <Text
                        style={[styles.rowBody, { color: dt.colors.ink3, fontFamily: diffuseFont.body }]}
                        numberOfLines={2}
                      >
                        {item.body}
                      </Text>
                    ) : null}
                    <Text style={[styles.rowMeta, { color: dt.colors.ink3, fontFamily: diffuseFont.mono }]}>
                      {timeAgo(item.created_at)} · {cfg.category}
                    </Text>
                  </View>
                </Pressable>
              </View>
            )
          }

          return (
            <View style={styles.rowOuter}>
              <Pressable
                onPress={() => handleTap(item)}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: cardBg,
                    borderColor: cardBorder,
                    shadowOpacity: isDark ? 0 : 0.04,
                  },
                  pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
                ]}
              >
                {/* Character-blob badge — soft sticker-tinted circle holding the blob */}
                <View
                  style={[styles.stickerBadge, {
                    backgroundColor: stickerColor + (isDark ? '2E' : '26'),
                    borderColor: stickerColor + (isDark ? '55' : '80'),
                  }]}
                >
                  <Character name={cfg.character} size={24} color={stickerColor} bg={cardBg} />
                </View>
                <View style={styles.rowContent}>
                  <View style={styles.rowTitleRow}>
                    <Text
                      style={[styles.rowTitle, {
                        color: colors.text,
                        fontFamily: font.display,
                      }]}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    {!item.is_read && (
                      <View style={[styles.unreadDot, {
                        backgroundColor: stickerColor,
                        borderColor: stickerInk,
                      }]} />
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
                      style={[styles.categoryChip, {
                        fontFamily: font.bodySemiBold,
                        color: isDark ? stickerColor : colors.text,
                        backgroundColor: stickerColor + (isDark ? '24' : '30'),
                        borderColor: stickerColor + (isDark ? '40' : '80'),
                      }]}
                    >
                      {cfg.category.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </Pressable>
            </View>
          )
        }}
        ListEmptyComponent={() =>
          diffuse ? (
            <DiffuseEmptyState
              icon={
                <DiffuseBloomIcon color={dt.stickers.yellow} size={44} noBloom>
                  <Character name="bell" size={34} color={dt.stickers.yellow} bg={dt.colors.bg} />
                </DiffuseBloomIcon>
              }
              title={activeFilter === 'All' ? 'No notifications yet' : `No ${activeFilter.toLowerCase()} notifications`}
              message={
                activeFilter === 'All'
                  ? 'Grandma will notify you about wellness changes, routine reminders, health alerts, and more.'
                  : 'Notifications in this category will appear here.'
              }
            />
          ) : (
            <EmptyState
              icon={<MissingStickers.NotificationsEmpty size={88} />}
              iconBg={colors.surface}
              title={activeFilter === 'All' ? 'No notifications yet' : `No ${activeFilter.toLowerCase()} notifications`}
              message={
                activeFilter === 'All'
                  ? 'Grandma will notify you about wellness changes, routine reminders, health alerts, and more.'
                  : 'Notifications in this category will appear here.'
              }
            />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accent}
            colors={[accent]}
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
    paddingBottom: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    minHeight: 44,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titleCount: {
    minWidth: 26,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: spacing.sm,
    borderWidth: 1.5,
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

  // Filter pills — slim single-line scroll rows
  filterScroll: { flexGrow: 0, flexShrink: 0 },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm - 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
  },
  filterRowBehavior: {
    paddingBottom: 0,
  },
  behaviorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderRadius: radius.full,
  },
  filterChipText: { fontSize: 12 },
  filterCountText: { fontSize: 10 },

  // Section headers
  sectionHeader: {
    paddingHorizontal: spacing.md + 4,
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.sm - 2,
  },
  sectionHeaderText: {
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },

  // Notification rows
  rowOuter: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm - 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + 2,
    padding: spacing.sm + 4,
    borderRadius: radius.md + 2,
    borderWidth: 1.5,
    shadowColor: '#141313',
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  stickerBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: { flex: 1 },
  rowTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  rowTitle: { fontSize: 14, flex: 1, lineHeight: 19, letterSpacing: -0.2 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    marginTop: 5,
  },
  rowBody: { fontSize: 13, marginTop: 3, lineHeight: 18 },
  rowFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm - 2,
    gap: spacing.sm,
  },
  rowTime: { fontSize: 12 },
  // Diffuse: single merged meta line — "13H AGO · ROUTINES"
  rowMeta: {
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: spacing.sm - 2,
  },
  categoryChip: {
    fontSize: 10,
    letterSpacing: 1.4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },

  // Empty state container
  emptyContent: { flex: 1 },
})
