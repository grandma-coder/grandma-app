/**
 * Daily Rewards Screen — check in, earn points, view streak, unlock badges.
 *
 * Accessible from the center wheel menu.
 */

import { useState, useEffect } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native'
import { router } from 'expo-router'
import {
  ArrowLeft,
  Flame,
  Gift,
  Trophy,
  Star,
  ChevronRight,
  Sparkles,
  Check,
  Crown,
  Medal,
  User,
  TrendingUp,
  Info,
  X,
  Lock,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../constants/theme'
import {
  useBadgeStore,
  DAILY_REWARDS,
  BADGE_DEFS,
  getBadgeDef,
  getTierColor,
  type BadgeCategory,
} from '../store/useBadgeStore'
import { useLeaderboard, type LeaderboardEntry } from '../lib/leaderboard'
import { syncBadgesFromSupabase } from '../lib/badgeSync'
import { supabase } from '../lib/supabase'

const SCREEN_W = Dimensions.get('window').width

const CATEGORY_CONFIG: { key: BadgeCategory; label: string; color: string }[] = [
  { key: 'streak',    label: 'Streaks',    color: '#F59E0B' },
  { key: 'nutrition',  label: 'Nutrition',  color: '#A2FF86' },
  { key: 'sleep',      label: 'Sleep',      color: '#B983FF' },
  { key: 'mood',       label: 'Mood',       color: '#FF8AD8' },
  { key: 'health',     label: 'Health',     color: '#4D96FF' },
  { key: 'growth',     label: 'Growth',     color: '#F59E0B' },
  { key: 'community',  label: 'Community',  color: '#7048B8' },
  { key: 'milestone',  label: 'Milestones', color: '#FF6B35' },
  { key: 'daily',      label: 'Daily',      color: '#A07FDC' },
]

export default function DailyRewardsScreen() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()

  const checkIn = useBadgeStore((s) => s.checkIn)
  const currentStreak = useBadgeStore((s) => s.currentStreak)
  const longestStreak = useBadgeStore((s) => s.longestStreak)
  const totalPoints = useBadgeStore((s) => s.totalPoints)
  const totalCheckIns = useBadgeStore((s) => s.totalCheckIns)
  const lastCheckInDate = useBadgeStore((s) => s.lastCheckInDate)
  const earnedBadges = useBadgeStore((s) => s.earnedBadges)

  // Leaderboard
  const { data: leaderboard, isLoading: leaderboardLoading } = useLeaderboard(10)
  const [myUserId, setMyUserId] = useState<string | null>(null)

  // Sync badges from real data on mount
  useEffect(() => {
    syncBadgesFromSupabase().catch(() => {})
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setMyUserId(session.user.id)
    })
  }, [])

  const today = new Date().toISOString().split('T')[0]
  const alreadyCheckedIn = lastCheckInDate === today

  const [showReward, setShowReward] = useState(false)
  const [rewardResult, setRewardResult] = useState<{ points: number; newBadges: string[]; streak: number } | null>(null)
  const [showPointsInfo, setShowPointsInfo] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<BadgeCategory | null>(null)

  function handleCheckIn() {
    if (alreadyCheckedIn) return
    const result = checkIn()
    setRewardResult(result)
    setShowReward(true)
  }

  // Current day in cycle (1-7)
  const dayInCycle = alreadyCheckedIn
    ? ((currentStreak - 1) % 7) + 1
    : (currentStreak % 7) + 1

  // Recent badges (last 6 earned)
  const recentBadges = [...earnedBadges]
    .sort((a, b) => b.earnedAt.localeCompare(a.earnedAt))
    .slice(0, 6)

  const totalBadges = BADGE_DEFS.length
  const earnedCount = earnedBadges.length
  const progressPct = Math.round((earnedCount / totalBadges) * 100)

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <ArrowLeft size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Daily Rewards</Text>
          <View style={styles.pointsBadge}>
            <Star size={14} color="#FFD700" fill="#FFD700" />
            <Text style={[styles.pointsText, { color: '#FFD700' }]}>{totalPoints}</Text>
          </View>
        </View>

        {/* Streak Circle */}
        <View style={styles.streakSection}>
          <View style={[styles.streakCircle, { borderColor: '#F59E0B' + '30' }]}>
            <Flame size={36} color="#F59E0B" strokeWidth={2} />
            <Text style={[styles.streakNumber, { color: colors.text }]}>{currentStreak}</Text>
            <Text style={[styles.streakLabel, { color: colors.textMuted }]}>day streak</Text>
          </View>

          <View style={styles.streakStats}>
            <View style={styles.streakStatItem}>
              <Text style={[styles.streakStatValue, { color: colors.text }]}>{longestStreak}</Text>
              <Text style={[styles.streakStatLabel, { color: colors.textMuted }]}>Longest</Text>
            </View>
            <View style={[styles.streakStatDivider, { backgroundColor: colors.border }]} />
            <View style={styles.streakStatItem}>
              <Text style={[styles.streakStatValue, { color: colors.text }]}>{totalCheckIns}</Text>
              <Text style={[styles.streakStatLabel, { color: colors.textMuted }]}>Total days</Text>
            </View>
            <View style={[styles.streakStatDivider, { backgroundColor: colors.border }]} />
            <View style={styles.streakStatItem}>
              <Text style={[styles.streakStatValue, { color: colors.text }]}>{earnedCount}</Text>
              <Text style={[styles.streakStatLabel, { color: colors.textMuted }]}>Badges</Text>
            </View>
          </View>
        </View>

        {/* Daily Check-in Button */}
        <Pressable
          onPress={handleCheckIn}
          disabled={alreadyCheckedIn}
          style={({ pressed }) => [
            styles.checkInButton,
            {
              backgroundColor: alreadyCheckedIn ? colors.surface : brand.primary,
              borderRadius: radius.full,
              borderWidth: alreadyCheckedIn ? 1 : 0,
              borderColor: colors.border,
            },
            pressed && !alreadyCheckedIn && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          ]}
        >
          {alreadyCheckedIn ? (
            <>
              <Check size={20} color={brand.success} strokeWidth={2.5} />
              <Text style={[styles.checkInText, { color: brand.success }]}>Checked in today!</Text>
            </>
          ) : (
            <>
              <Gift size={20} color="#FFFFFF" strokeWidth={2} />
              <Text style={[styles.checkInText, { color: '#FFFFFF' }]}>Claim Daily Reward</Text>
            </>
          )}
        </Pressable>

        {/* Reward Result */}
        {showReward && rewardResult && (
          <View style={[styles.rewardCard, { backgroundColor: brand.primary + '15', borderRadius: radius.xl, borderColor: brand.primary + '30' }]}>
            <View style={styles.rewardHeader}>
              <Sparkles size={18} color={brand.primary} />
              <Text style={[styles.rewardTitle, { color: brand.primary }]}>
                +{rewardResult.points} points earned!
              </Text>
            </View>
            <Text style={[styles.rewardBody, { color: colors.textSecondary }]}>
              {DAILY_REWARDS.find((r) => r.day === ((rewardResult.streak - 1) % 7) + 1)?.label || 'Great job!'}
            </Text>
            {rewardResult.newBadges.length > 0 && (
              <View style={styles.newBadgesRow}>
                {rewardResult.newBadges.map((id) => {
                  const def = getBadgeDef(id)
                  if (!def) return null
                  return (
                    <View key={id} style={[styles.newBadgeChip, { backgroundColor: def.color + '20', borderColor: def.color + '40', borderRadius: radius.full }]}>
                      <Text style={styles.newBadgeIcon}>{def.icon}</Text>
                      <Text style={[styles.newBadgeName, { color: def.color }]}>{def.name}</Text>
                    </View>
                  )
                })}
              </View>
            )}
          </View>
        )}

        {/* Weekly Progress */}
        <View style={[styles.weekCard, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
          <Text style={[styles.weekTitle, { color: colors.text }]}>WEEKLY PROGRESS</Text>
          <View style={styles.weekDays}>
            {DAILY_REWARDS.map((reward, i) => {
              const completed = i < dayInCycle
              const isToday = i + 1 === dayInCycle
              const hasBadge = !!reward.badge
              return (
                <View key={i} style={styles.dayItem}>
                  <View style={[
                    styles.dayCircle,
                    {
                      backgroundColor: completed ? (hasBadge ? '#FFD700' + '20' : brand.primary + '20') : colors.surfaceRaised,
                      borderColor: isToday && !alreadyCheckedIn ? brand.primary : completed ? (hasBadge ? '#FFD700' + '40' : brand.primary + '40') : colors.border,
                    },
                  ]}>
                    {completed ? (
                      <Check size={14} color={hasBadge ? '#FFD700' : brand.primary} strokeWidth={3} />
                    ) : hasBadge ? (
                      <Gift size={14} color={colors.textMuted} strokeWidth={2} />
                    ) : (
                      <Text style={[styles.dayNumber, { color: colors.textMuted }]}>{reward.points}</Text>
                    )}
                  </View>
                  <Text style={[styles.dayLabel, { color: isToday ? colors.text : colors.textMuted }]}>
                    Day {i + 1}
                  </Text>
                </View>
              )
            })}
          </View>
        </View>

        {/* Badge Collection Progress */}
        <View style={[styles.progressCard, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
          <View style={styles.progressHeader}>
            <Trophy size={18} color="#FFD700" strokeWidth={2} />
            <Text style={[styles.progressTitle, { color: colors.text }]}>Badge Collection</Text>
            <Text style={[styles.progressCount, { color: colors.textMuted }]}>{earnedCount}/{totalBadges}</Text>
          </View>

          <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceRaised, borderRadius: radius.full }]}>
            <View style={[styles.progressBarFill, { width: `${progressPct}%`, backgroundColor: '#FFD700', borderRadius: radius.full }]} />
          </View>

          {/* Recent Badges */}
          {recentBadges.length > 0 && (
            <View style={styles.recentGrid}>
              {recentBadges.map((earned) => {
                const def = getBadgeDef(earned.badgeId)
                if (!def) return null
                return (
                  <View key={earned.badgeId} style={[styles.badgeItem, { backgroundColor: def.color + '10', borderColor: def.color + '20', borderRadius: radius.xl }]}>
                    <Text style={styles.badgeIcon}>{def.icon}</Text>
                    <Text style={[styles.badgeName, { color: colors.text }]} numberOfLines={1}>{def.name}</Text>
                    <Text style={[styles.badgeTier, { color: getTierColor(def.tier) }]}>{def.tier}</Text>
                  </View>
                )
              })}
            </View>
          )}

          {/* View All Button */}
          <Pressable
            onPress={() => router.push('/profile/badges' as any)}
            style={({ pressed }) => [
              styles.viewAllBtn,
              { borderColor: colors.border, borderRadius: radius.full },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={[styles.viewAllText, { color: colors.text }]}>View all badges</Text>
            <ChevronRight size={16} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Badge Categories */}
        <View style={styles.categoriesSection}>
          <Text style={[styles.categoriesTitle, { color: colors.text }]}>CATEGORIES</Text>
          <View style={styles.categoriesGrid}>
            {CATEGORY_CONFIG.map((cat) => {
              const catBadges = BADGE_DEFS.filter((d) => d.category === cat.key)
              const earned = catBadges.filter((d) => earnedBadges.some((e) => e.badgeId === d.id)).length
              return (
                <Pressable
                  key={cat.key}
                  onPress={() => setSelectedCategory(cat.key)}
                  style={({ pressed }) => [
                    styles.categoryCard,
                    { backgroundColor: cat.color + '10', borderColor: cat.color + '20', borderRadius: radius.xl },
                    pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                  ]}
                >
                  <Text style={[styles.categoryLabel, { color: cat.color }]}>{cat.label}</Text>
                  <Text style={[styles.categoryCount, { color: colors.textSecondary }]}>{earned}/{catBadges.length}</Text>
                  <View style={[styles.categoryBar, { backgroundColor: cat.color + '15', borderRadius: radius.full }]}>
                    <View style={[styles.categoryBarFill, {
                      width: `${catBadges.length > 0 ? (earned / catBadges.length) * 100 : 0}%`,
                      backgroundColor: cat.color,
                      borderRadius: radius.full,
                    }]} />
                  </View>
                </Pressable>
              )
            })}
          </View>
        </View>

        {/* ═══ LEADERBOARD CARD ═══ */}
        <Pressable
          onPress={() => router.push('/leaderboard' as any)}
          style={({ pressed }) => [
            styles.leaderCard,
            {
              backgroundColor: colors.surface,
              borderRadius: radius.xl,
              borderWidth: 1,
              borderColor: '#FFD700' + '25',
            },
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          ]}
        >
          <View style={styles.leaderCardLeft}>
            <View style={[styles.leaderCardIcon, { backgroundColor: '#FFD700' + '15' }]}>
              <Crown size={22} color="#FFD700" strokeWidth={2} />
            </View>
            <View style={styles.leaderCardText}>
              <Text style={[styles.leaderCardTitle, { color: colors.text }]}>Community Leaderboard</Text>
              <Text style={[styles.leaderCardSub, { color: colors.textMuted }]}>
                {leaderboard && myUserId
                  ? `You're #${leaderboard.find((e) => e.user_id === myUserId)?.rank ?? '—'} with ${leaderboard.find((e) => e.user_id === myUserId)?.total_points ?? 0} pts`
                  : 'Compete with moms, caregivers & partners'
                }
              </Text>
            </View>
          </View>
          <ChevronRight size={20} color={colors.textMuted} />
        </Pressable>

        {/* How Points Work — small info button */}
        <Pressable
          onPress={() => setShowPointsInfo(true)}
          style={({ pressed }) => [
            styles.pointsInfoBtn,
            { borderColor: colors.border, borderRadius: radius.full },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Info size={14} color={colors.textMuted} strokeWidth={2} />
          <Text style={[styles.pointsInfoText, { color: colors.textMuted }]}>How points work</Text>
        </Pressable>
      </ScrollView>

      {/* Points Info Modal */}
      <Modal visible={showPointsInfo} transparent animationType="fade" onRequestClose={() => setShowPointsInfo(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowPointsInfo(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>How points work</Text>
              <Pressable onPress={() => setShowPointsInfo(false)} hitSlop={12}>
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>
            {[
              { label: 'Garage post', pts: '+5', color: '#A2FF86' },
              { label: 'Channel message', pts: '+3', color: '#4D96FF' },
              { label: 'Reaction received', pts: '+1', color: '#FF8AD8' },
              { label: 'Comment received', pts: '+2', color: '#B983FF' },
              { label: 'Channel joined', pts: '+2', color: '#7048B8' },
              { label: 'Child log entry', pts: '+1', color: '#F59E0B' },
              { label: 'Streak day (max 60)', pts: '+3', color: '#FF6B35' },
              { label: 'Daily check-in', pts: '+10-50', color: '#A07FDC' },
            ].map((item) => (
              <View key={item.label} style={styles.modalRow}>
                <View style={[styles.modalDot, { backgroundColor: item.color }]} />
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                <Text style={[styles.modalPts, { color: item.color }]}>{item.pts}</Text>
              </View>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Category Detail Modal */}
      <Modal visible={!!selectedCategory} transparent animationType="fade" onRequestClose={() => setSelectedCategory(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedCategory(null)}>
          <Pressable style={[styles.catModal, { backgroundColor: colors.surface, borderRadius: radius.xl }]} onPress={(e) => e.stopPropagation()}>
            {selectedCategory && (() => {
              const catConfig = CATEGORY_CONFIG.find((c) => c.key === selectedCategory)!
              const catBadges = BADGE_DEFS.filter((d) => d.category === selectedCategory)
              const earnedIds = new Set(earnedBadges.map((e) => e.badgeId))
              const earnedList = catBadges.filter((d) => earnedIds.has(d.id))
              const lockedList = catBadges.filter((d) => !earnedIds.has(d.id))

              return (
                <>
                  <View style={styles.catModalHeader}>
                    <View style={[styles.catModalDot, { backgroundColor: catConfig.color }]} />
                    <Text style={[styles.catModalTitle, { color: colors.text }]}>{catConfig.label}</Text>
                    <Text style={[styles.catModalCount, { color: colors.textMuted }]}>{earnedList.length}/{catBadges.length}</Text>
                    <Pressable onPress={() => setSelectedCategory(null)} hitSlop={12} style={{ marginLeft: 'auto' }}>
                      <X size={20} color={colors.textMuted} />
                    </Pressable>
                  </View>

                  {/* Progress bar */}
                  <View style={[styles.catModalBar, { backgroundColor: catConfig.color + '15', borderRadius: radius.full }]}>
                    <View style={[styles.catModalBarFill, {
                      width: `${catBadges.length > 0 ? (earnedList.length / catBadges.length) * 100 : 0}%`,
                      backgroundColor: catConfig.color,
                      borderRadius: radius.full,
                    }]} />
                  </View>

                  <ScrollView showsVerticalScrollIndicator={true} bounces={true}>
                    {/* Earned */}
                    {earnedList.length > 0 && (
                      <View style={styles.catModalSection}>
                        <Text style={[styles.catModalSectionLabel, { color: catConfig.color }]}>ACHIEVED</Text>
                        {earnedList.map((def) => {
                          const earned = earnedBadges.find((e) => e.badgeId === def.id)
                          return (
                            <View key={def.id} style={[styles.catBadgeRow, { backgroundColor: catConfig.color + '08', borderColor: catConfig.color + '20', borderRadius: radius.lg }]}>
                              <Text style={[styles.catBadgeEmoji, { fontFamily: 'System' }]}>{def.icon}</Text>
                              <View style={styles.catBadgeInfo}>
                                <Text style={[styles.catBadgeName, { color: colors.text }]}>{def.name}</Text>
                                <Text style={[styles.catBadgeDesc, { color: colors.textSecondary }]}>{def.description}</Text>
                              </View>
                              <View style={styles.catBadgeRight}>
                                <Text style={[styles.catBadgeTier, { color: getTierColor(def.tier) }]}>{def.tier}</Text>
                                {earned && (
                                  <Text style={[styles.catBadgeDate, { color: colors.textMuted }]}>
                                    {new Date(earned.earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </Text>
                                )}
                              </View>
                            </View>
                          )
                        })}
                      </View>
                    )}

                    {/* Locked */}
                    {lockedList.length > 0 && (
                      <View style={styles.catModalSection}>
                        <Text style={[styles.catModalSectionLabel, { color: colors.textMuted }]}>TO UNLOCK</Text>
                        {lockedList.map((def) => (
                          <View key={def.id} style={[styles.catBadgeRow, { backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderRadius: radius.lg }]}>
                            <View style={[styles.catBadgeLock, { backgroundColor: colors.surface }]}>
                              <Lock size={12} color={colors.textMuted} strokeWidth={2} />
                            </View>
                            <View style={styles.catBadgeInfo}>
                              <Text style={[styles.catBadgeName, { color: colors.textMuted }]}>{def.name}</Text>
                              <Text style={[styles.catBadgeDesc, { color: colors.textMuted }]}>{def.description}</Text>
                            </View>
                            <Text style={[styles.catBadgeTier, { color: colors.textMuted }]}>{def.tier}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </ScrollView>
                </>
              )
            })()}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 16 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 22, fontWeight: '800', flex: 1, marginLeft: 12 },
  pointsBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#FFD700' + '15', borderRadius: 999 },
  pointsText: { fontSize: 14, fontWeight: '800' },

  // Streak
  streakSection: { alignItems: 'center', gap: 16 },
  streakCircle: {
    width: 140, height: 140, borderRadius: 70,
    borderWidth: 3, alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  streakNumber: { fontSize: 36, fontWeight: '900', marginTop: 4 },
  streakLabel: { fontSize: 12, fontWeight: '600' },
  streakStats: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  streakStatItem: { alignItems: 'center', paddingHorizontal: 20, gap: 2 },
  streakStatValue: { fontSize: 20, fontWeight: '900' },
  streakStatLabel: { fontSize: 11, fontWeight: '600' },
  streakStatDivider: { width: 1, height: 28 },

  // Check-in button
  checkInButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16,
  },
  checkInText: { fontSize: 16, fontWeight: '800' },

  // Reward card
  rewardCard: { padding: 16, gap: 8, borderWidth: 1 },
  rewardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rewardTitle: { fontSize: 16, fontWeight: '800' },
  rewardBody: { fontSize: 14, fontWeight: '500' },
  newBadgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  newBadgeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1 },
  newBadgeIcon: { fontSize: 16, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif' },
  newBadgeName: { fontSize: 13, fontWeight: '700' },

  // Week progress
  weekCard: { padding: 16, gap: 14 },
  weekTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  weekDays: { flexDirection: 'row', justifyContent: 'space-between' },
  dayItem: { alignItems: 'center', gap: 6 },
  dayCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  dayNumber: { fontSize: 11, fontWeight: '700' },
  dayLabel: { fontSize: 10, fontWeight: '600' },

  // Badge progress
  progressCard: { padding: 16, gap: 14 },
  progressHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressTitle: { fontSize: 16, fontWeight: '800', flex: 1 },
  progressCount: { fontSize: 13, fontWeight: '700' },
  progressBarBg: { height: 8, overflow: 'hidden' },
  progressBarFill: { height: '100%' },
  recentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgeItem: { padding: 10, alignItems: 'center', gap: 4, borderWidth: 1, width: '31%' },
  badgeIcon: { fontSize: 24, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif' },
  badgeName: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  badgeTier: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderWidth: 1 },
  viewAllText: { fontSize: 14, fontWeight: '700' },

  // Categories
  categoriesSection: { gap: 10 },
  categoriesTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryCard: { width: '48%', padding: 12, gap: 6, borderWidth: 1 },
  categoryLabel: { fontSize: 13, fontWeight: '800' },
  categoryCount: { fontSize: 11, fontWeight: '600' },
  categoryBar: { height: 4, overflow: 'hidden' },
  categoryBarFill: { height: '100%' },

  // Leaderboard card
  leaderCard: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  leaderCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  leaderCardIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  leaderCardText: { flex: 1, gap: 2 },
  leaderCardTitle: { fontSize: 16, fontWeight: '800' },
  leaderCardSub: { fontSize: 13, fontWeight: '500' },

  // Points info button
  pointsInfoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderWidth: 1 },
  pointsInfoText: { fontSize: 13, fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  modalContent: { width: '100%', padding: 20, gap: 12 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalDot: { width: 8, height: 8, borderRadius: 4 },
  modalLabel: { fontSize: 14, fontWeight: '500', flex: 1 },
  modalPts: { fontSize: 14, fontWeight: '800' },

  // Category detail modal
  catModal: { width: '100%', padding: 20, gap: 12, maxHeight: '80%' },
  catModalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catModalDot: { width: 10, height: 10, borderRadius: 5 },
  catModalTitle: { fontSize: 18, fontWeight: '800' },
  catModalCount: { fontSize: 14, fontWeight: '600' },
  catModalBar: { height: 6, overflow: 'hidden' },
  catModalBarFill: { height: '100%' },
  catModalSection: { gap: 8, marginTop: 12 },
  catModalSectionLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  catBadgeRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10, borderWidth: 1 },
  catBadgeEmoji: { fontSize: 22 },
  catBadgeLock: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  catBadgeInfo: { flex: 1, gap: 2 },
  catBadgeName: { fontSize: 14, fontWeight: '700' },
  catBadgeDesc: { fontSize: 12, fontWeight: '500' },
  catBadgeRight: { alignItems: 'flex-end', gap: 2 },
  catBadgeTier: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  catBadgeDate: { fontSize: 10, fontWeight: '500' },
})
