/**
 * Daily Rewards — check in, earn points, view streak, unlock badges.
 *
 * Cream-paper sticker-collage design (Apr 2026). Mode-aware: pre=rose,
 * preg=lavender, kids=powder-blue, using accent/accent-soft tokens.
 */

import { useState, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
} from 'react-native'
import { router } from 'expo-router'
import { ChevronRight, Check, X, Lock, Info } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  useTheme,
  stickers as stickerPalette,
  getModeColor,
  getModeColorSoft,
} from '../constants/theme'
import { Display, DisplayItalic, Body, MonoCaps } from '../components/ui/Typography'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { PaperCard } from '../components/ui/PaperCard'
import {
  Star as StarSticker,
  Burst,
  Flower,
  Sparkle,
} from '../components/ui/Stickers'
import {
  Flame,
  QuestRibbon,
  DayBadge,
  CircleDots,
  MoodFace,
  LogAppointment,
  LogNutrition,
  LogSleep,
} from '../components/stickers/RewardStickers'
import { BadgeIcon } from '../components/stickers/BadgeIcon'
import { useModeStore } from '../store/useModeStore'
import {
  useBadgeStore,
  DAILY_REWARDS,
  BADGE_DEFS,
  getBadgeDef,
  getTierColor,
  type BadgeCategory,
  type BadgeDef,
} from '../store/useBadgeStore'
import { useLeaderboard } from '../lib/leaderboard'
import { syncBadgesFromSupabase } from '../lib/badgeSync'
import { supabase } from '../lib/supabase'

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEK_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const

// Category config: paper-palette sticker colors + sticker component per category.
const CATEGORY_CONFIG: {
  key: BadgeCategory
  label: string
  color: keyof typeof stickerPalette       // sticker palette key (light)
  soft: keyof typeof stickerPalette        // its soft companion
  Sticker: (p: { size?: number; fill?: string }) => React.ReactElement
}[] = [
  { key: 'streak',    label: 'Streaks',    color: 'coral',  soft: 'pinkSoft',   Sticker: Flame },
  { key: 'nutrition', label: 'Nutrition',  color: 'green',  soft: 'greenSoft',  Sticker: LogNutrition },
  { key: 'sleep',     label: 'Sleep',      color: 'lilac',  soft: 'lilacSoft',  Sticker: LogSleep },
  { key: 'mood',      label: 'Mood',       color: 'pink',   soft: 'pinkSoft',   Sticker: (p) => <MoodFace {...p} variant="happy" /> },
  { key: 'health',    label: 'Health',     color: 'blue',   soft: 'blueSoft',   Sticker: LogAppointment },
  { key: 'growth',    label: 'Growth',     color: 'yellow', soft: 'yellowSoft', Sticker: (p) => <StarSticker {...p} /> },
  { key: 'community', label: 'Community',  color: 'lilac',  soft: 'lilacSoft',  Sticker: CircleDots },
  { key: 'milestone', label: 'Milestones', color: 'peach',  soft: 'peachSoft',  Sticker: DayBadge },
  { key: 'daily',     label: 'Daily',      color: 'yellow', soft: 'yellowSoft', Sticker: QuestRibbon },
]

// Mode-specific daily quest copy (falls back to reward label for unknown modes).
const MODE_QUEST_COPY: Record<string, string> = {
  pre: 'Log your cervical mucus & BBT',
  'pre-pregnancy': 'Log your cervical mucus & BBT',
  preg: 'Drink 8 glasses of water',
  pregnancy: 'Drink 8 glasses of water',
  kids: 'Track 3 feedings & bedtime',
}

// Points breakdown shown in the info modal — mapped to sticker palette.
const POINTS_ROWS: { label: string; pts: string; color: keyof typeof stickerPalette }[] = [
  { label: 'Garage post',           pts: '+5',     color: 'green' },
  { label: 'Channel message',       pts: '+3',     color: 'blue' },
  { label: 'Reaction received',     pts: '+1',     color: 'pink' },
  { label: 'Comment received',      pts: '+2',     color: 'lilac' },
  { label: 'Channel joined',        pts: '+2',     color: 'lilac' },
  { label: 'Child log entry',       pts: '+1',     color: 'yellow' },
  { label: 'Streak day (max 60)',   pts: '+3',     color: 'coral' },
  { label: 'Daily check-in',        pts: '+10-50', color: 'peach' },
]

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DailyRewardsScreen() {
  const { colors, font, isDark, stickers } = useTheme()
  const insets = useSafeAreaInsets()
  const mode = useModeStore((s) => s.mode)

  const accent = getModeColor(mode, isDark)
  const accentSoft = getModeColorSoft(mode, isDark)
  const ink = isDark ? colors.text : '#141313'
  const ink3 = isDark ? colors.textMuted : '#6E6763'
  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperRaised = isDark ? colors.surfaceRaised : '#F7F0DF'
  const line = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const bg = isDark ? colors.bg : '#F3ECD9'

  const checkIn = useBadgeStore((s) => s.checkIn)
  const currentStreak = useBadgeStore((s) => s.currentStreak)
  const longestStreak = useBadgeStore((s) => s.longestStreak)
  const totalPoints = useBadgeStore((s) => s.totalPoints)
  const totalCheckIns = useBadgeStore((s) => s.totalCheckIns)
  const lastCheckInDate = useBadgeStore((s) => s.lastCheckInDate)
  const earnedBadges = useBadgeStore((s) => s.earnedBadges)

  const { data: leaderboard } = useLeaderboard(10)
  const [myUserId, setMyUserId] = useState<string | null>(null)

  useEffect(() => {
    syncBadgesFromSupabase().catch(() => {})
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setMyUserId(session.user.id)
    })
  }, [])

  const today = new Date().toISOString().split('T')[0]
  const alreadyCheckedIn = lastCheckInDate === today

  const [showReward, setShowReward] = useState(false)
  const [rewardResult, setRewardResult] = useState<{
    points: number
    newBadges: string[]
    streak: number
  } | null>(null)
  const [showPointsInfo, setShowPointsInfo] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<BadgeCategory | null>(null)

  function handleCheckIn() {
    if (alreadyCheckedIn) return
    const result = checkIn()
    setRewardResult(result)
    setShowReward(true)
  }

  // Day 1-7 within the current week's cycle
  const dayInCycle = alreadyCheckedIn
    ? ((currentStreak - 1) % 7) + 1
    : (currentStreak % 7) + 1

  const doneThisWeek = alreadyCheckedIn ? dayInCycle : dayInCycle - 1

  const recentBadges = useMemo(
    () =>
      [...earnedBadges]
        .sort((a, b) => b.earnedAt.localeCompare(a.earnedAt))
        .slice(0, 6),
    [earnedBadges],
  )

  const totalBadges = BADGE_DEFS.length
  const earnedCount = earnedBadges.length
  const progressPct = totalBadges > 0 ? Math.round((earnedCount / totalBadges) * 100) : 0

  const todaysReward = DAILY_REWARDS.find((r) => r.day === dayInCycle) ?? DAILY_REWARDS[0]
  const questCopy = MODE_QUEST_COPY[mode] ?? todaysReward.label

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Header ─── */}
        <ScreenHeader
          title="Daily rewards"
          right={
            <View
              style={[
                styles.pointsPill,
                { backgroundColor: paper, borderColor: line },
              ]}
            >
              <StarSticker size={14} fill={stickers.yellow} />
              <Text style={[styles.pointsPillText, { color: ink, fontFamily: font.bodySemiBold }]}>
                {totalPoints}
              </Text>
            </View>
          }
        />

        {/* ─── Hero: streak title + dashed circle ─── */}
        <View style={styles.hero}>
          <View style={[styles.heroStickerLeft]} pointerEvents="none">
            <StarSticker size={40} fill={stickers.yellow} />
          </View>
          <View style={[styles.heroStickerRight]} pointerEvents="none">
            <Burst size={44} fill={stickers.pink} points={10} />
          </View>

          <View style={styles.heroTitleRow}>
            <Display size={32} color={ink}>
              {currentStreak} day
            </Display>
            <DisplayItalic size={32} color={stickers.coral} style={{ marginLeft: 8 }}>
              streak
            </DisplayItalic>
          </View>
          <Body size={14} color={ink3} align="center" style={{ marginTop: 2 }}>
            Grandma is proud of you, dear.
          </Body>

          {/* Dashed streak circle */}
          <View style={styles.streakCircleWrap}>
            <View
              style={[
                styles.streakCircle,
                { backgroundColor: accentSoft, borderColor: ink },
              ]}
            >
              <Display size={56} color={ink} style={{ lineHeight: 58 }}>
                {currentStreak}
              </Display>
            </View>
          </View>
        </View>

        {/* ─── Stat row (longest / total / badges) ─── */}
        <PaperCard padding={14} radius={24}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Display size={22} color={ink}>
                {longestStreak}
              </Display>
              <MonoCaps size={10} color={ink3}>Longest</MonoCaps>
            </View>
            <View style={[styles.statDivider, { backgroundColor: line }]} />
            <View style={styles.statItem}>
              <Display size={22} color={ink}>
                {totalCheckIns}
              </Display>
              <MonoCaps size={10} color={ink3}>Total days</MonoCaps>
            </View>
            <View style={[styles.statDivider, { backgroundColor: line }]} />
            <View style={styles.statItem}>
              <Display size={22} color={ink}>
                {earnedCount}
              </Display>
              <MonoCaps size={10} color={ink3}>Badges</MonoCaps>
            </View>
          </View>
        </PaperCard>

        {/* ─── Claim button ─── */}
        <Pressable
          onPress={handleCheckIn}
          disabled={alreadyCheckedIn}
          style={({ pressed }) => [
            styles.claimBtn,
            {
              backgroundColor: alreadyCheckedIn ? paper : accent,
              borderColor: alreadyCheckedIn ? line : accent,
            },
            pressed && !alreadyCheckedIn && { opacity: 0.92, transform: [{ scale: 0.98 }] },
          ]}
        >
          {alreadyCheckedIn ? (
            <>
              <Check size={18} color={ink} strokeWidth={2.5} />
              <Text style={[styles.claimBtnText, { color: ink, fontFamily: font.bodySemiBold }]}>
                Checked in today
              </Text>
            </>
          ) : (
            <>
              <Sparkle size={22} fill={stickers.yellow} />
              <Text style={[styles.claimBtnText, { color: ink, fontFamily: font.bodySemiBold }]}>
                Claim daily reward
              </Text>
            </>
          )}
        </Pressable>

        {/* ─── Reward reveal (after claim) ─── */}
        {showReward && rewardResult && (
          <PaperCard tint={accentSoft} radius={24} padding={16} borderColor={line}>
            <View style={styles.revealHeader}>
              <Sparkle size={22} fill={stickers.yellow} />
              <Display size={20} color={ink} style={{ marginLeft: 8 }}>
                +{rewardResult.points} points
              </Display>
            </View>
            <Body size={14} color={ink3} style={{ marginTop: 4 }}>
              {DAILY_REWARDS.find((r) => r.day === ((rewardResult.streak - 1) % 7) + 1)?.label ??
                'Great job!'}
            </Body>
            {rewardResult.newBadges.length > 0 && (
              <View style={styles.revealBadges}>
                {rewardResult.newBadges.map((id) => {
                  const def = getBadgeDef(id)
                  if (!def) return null
                  return (
                    <View
                      key={id}
                      style={[
                        styles.revealBadgeChip,
                        { backgroundColor: paper, borderColor: line },
                      ]}
                    >
                      <BadgeIcon badgeId={id} size={20} />
                      <Text style={[styles.revealBadgeName, { color: ink, fontFamily: font.bodyMedium }]}>
                        {def.name}
                      </Text>
                    </View>
                  )
                })}
              </View>
            )}
          </PaperCard>
        )}

        {/* ─── Weekly grid ─── */}
        <PaperCard padding={16} radius={24}>
          <View style={styles.weekHeader}>
            <MonoCaps size={11} color={ink3}>This week</MonoCaps>
            <Body size={12} color={ink3}>
              {doneThisWeek} / 7 complete
            </Body>
          </View>
          <View style={styles.weekGrid}>
            {WEEK_LETTERS.map((letter, i) => {
              const dayIdx = i + 1
              const isDone = dayIdx <= doneThisWeek
              const isToday = dayIdx === dayInCycle && !alreadyCheckedIn
              const tileBg = isDone ? accent : isToday ? paper : paperRaised
              const tileBorder = isToday ? ink : line
              const tileBorderWidth = isToday ? 1.5 : 1

              return (
                <View key={`${letter}-${i}`} style={styles.weekDay}>
                  <View
                    style={[
                      styles.weekTile,
                      {
                        backgroundColor: tileBg,
                        borderColor: tileBorder,
                        borderWidth: tileBorderWidth,
                      },
                    ]}
                  >
                    {isDone ? (
                      <Check size={18} color={ink} strokeWidth={2.5} />
                    ) : isToday ? (
                      <StarSticker size={20} fill={accent} />
                    ) : (
                      <Lock size={12} color={ink3} strokeWidth={2} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.weekLetter,
                      { color: isToday ? ink : ink3, fontFamily: font.bodyMedium },
                    ]}
                  >
                    {letter}
                  </Text>
                </View>
              )
            })}
          </View>
        </PaperCard>

        {/* ─── Today's Quest ─── */}
        <View
          style={[
            styles.questCard,
            { backgroundColor: accentSoft, borderColor: line },
          ]}
        >
          <View style={styles.questFlower} pointerEvents="none">
            <Flower size={120} petal={accent} center={stickers.yellow} />
          </View>
          <MonoCaps size={11} color={ink3}>Today's quest</MonoCaps>
          <Display size={22} color={ink} style={{ marginTop: 4, maxWidth: 220, lineHeight: 26 }}>
            {questCopy}
          </Display>
          <View style={styles.questPills}>
            <View style={[styles.questPill, { backgroundColor: paper, borderColor: line }]}>
              <Text style={[styles.questPillText, { color: ink, fontFamily: font.bodyMedium }]}>
                +{todaysReward.points} pts
              </Text>
            </View>
            {todaysReward.badge && (
              <View style={[styles.questPill, { backgroundColor: paper, borderColor: line }]}>
                <Text style={[styles.questPillText, { color: ink, fontFamily: font.bodyMedium }]}>
                  unlock badge
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ─── Badge Collection ─── */}
        <PaperCard padding={16} radius={24}>
          <View style={styles.badgeHeader}>
            <View style={[styles.badgeHeaderIcon, { backgroundColor: stickers.yellowSoft, borderColor: line }]}>
              <StarSticker size={18} fill={stickers.yellow} />
            </View>
            <Text style={[styles.badgeHeaderTitle, { color: ink, fontFamily: font.display }]}>
              Badge Collection
            </Text>
            <Text style={[styles.badgeHeaderCount, { color: ink3, fontFamily: font.bodyMedium }]}>
              {earnedCount}/{totalBadges}
            </Text>
          </View>

          <View style={[styles.progressBarTrack, { backgroundColor: paperRaised }]}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progressPct}%`, backgroundColor: stickers.yellow },
              ]}
            />
          </View>

          {recentBadges.length > 0 && (
            <View style={styles.recentGrid}>
              {recentBadges.map((earned) => {
                const def = getBadgeDef(earned.badgeId)
                if (!def) return null
                const cat = CATEGORY_CONFIG.find((c) => c.key === def.category)
                const tint = cat ? stickers[cat.soft] : paperRaised
                return (
                  <View
                    key={earned.badgeId}
                    style={[
                      styles.badgeItem,
                      { backgroundColor: tint, borderColor: line },
                    ]}
                  >
                    <View style={styles.badgeIconWrap}>
                      <BadgeIcon badgeId={earned.badgeId} size={40} />
                    </View>
                    <Text
                      style={[styles.badgeName, { color: ink, fontFamily: font.bodySemiBold }]}
                      numberOfLines={1}
                    >
                      {def.name}
                    </Text>
                    <Text
                      style={[styles.badgeTier, { color: getTierColor(def.tier), fontFamily: font.bodySemiBold }]}
                    >
                      {def.tier}
                    </Text>
                  </View>
                )
              })}
            </View>
          )}

          <Pressable
            onPress={() => router.push('/profile/badges' as any)}
            style={({ pressed }) => [
              styles.viewAllBtn,
              { borderColor: line, backgroundColor: paperRaised },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={[styles.viewAllText, { color: ink, fontFamily: font.bodyMedium }]}>
              View all badges
            </Text>
            <ChevronRight size={16} color={ink3} />
          </Pressable>
        </PaperCard>

        {/* ─── Categories ─── */}
        <View style={styles.categoriesSection}>
          <MonoCaps size={11} color={ink3} style={{ marginLeft: 4 }}>
            Categories
          </MonoCaps>
          <View style={styles.categoriesGrid}>
            {CATEGORY_CONFIG.map((cat) => {
              const catBadges = BADGE_DEFS.filter((d) => d.category === cat.key)
              const earned = catBadges.filter((d) =>
                earnedBadges.some((e) => e.badgeId === d.id),
              ).length
              const pct = catBadges.length > 0 ? (earned / catBadges.length) * 100 : 0
              const color = stickers[cat.color]
              const soft = stickers[cat.soft]

              return (
                <Pressable
                  key={cat.key}
                  onPress={() => setSelectedCategory(cat.key)}
                  style={({ pressed }) => [
                    styles.categoryCard,
                    {
                      backgroundColor: soft,
                      borderColor: line,
                    },
                    pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                  ]}
                >
                  <View style={styles.categoryCardTop}>
                    <View style={styles.categorySticker}>
                      <cat.Sticker size={38} fill={color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.categoryLabel, { color: ink, fontFamily: font.bodySemiBold }]}
                      >
                        {cat.label}
                      </Text>
                      <Text
                        style={[styles.categoryCount, { color: ink3, fontFamily: font.body }]}
                      >
                        {earned}/{catBadges.length}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.categoryBar, { backgroundColor: paper }]}>
                    <View
                      style={[
                        styles.categoryBarFill,
                        { width: `${pct}%`, backgroundColor: color },
                      ]}
                    />
                  </View>
                </Pressable>
              )
            })}
          </View>
        </View>

        {/* ─── Leaderboard card ─── */}
        <Pressable
          onPress={() => router.push('/leaderboard' as any)}
          style={({ pressed }) => [
            styles.leaderCard,
            {
              backgroundColor: paper,
              borderColor: line,
            },
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          ]}
        >
          <View style={[styles.leaderIcon, { backgroundColor: stickers.yellowSoft, borderColor: line }]}>
            <StarSticker size={22} fill={stickers.yellow} />
          </View>
          <View style={styles.leaderText}>
            <Text style={[styles.leaderTitle, { color: ink, fontFamily: font.display }]}>
              Community Leaderboard
            </Text>
            <Text style={[styles.leaderSub, { color: ink3, fontFamily: font.body }]}>
              {leaderboard && myUserId
                ? `You're #${
                    leaderboard.find((e) => e.user_id === myUserId)?.rank ?? '—'
                  } with ${
                    leaderboard.find((e) => e.user_id === myUserId)?.total_points ?? 0
                  } pts`
                : 'Compete with moms, caregivers & partners'}
            </Text>
          </View>
          <ChevronRight size={20} color={ink3} />
        </Pressable>

        {/* ─── How points work ─── */}
        <Pressable
          onPress={() => setShowPointsInfo(true)}
          style={({ pressed }) => [
            styles.howBtn,
            { borderColor: line, backgroundColor: paper },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Info size={14} color={ink3} strokeWidth={2} />
          <Text style={[styles.howBtnText, { color: ink3, fontFamily: font.bodyMedium }]}>
            How points work
          </Text>
        </Pressable>
      </ScrollView>

      {/* ─── Points Info modal ─── */}
      <Modal
        visible={showPointsInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPointsInfo(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowPointsInfo(false)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: paper, borderColor: line }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: ink, fontFamily: font.display }]}>
                How points work
              </Text>
              <Pressable
                onPress={() => setShowPointsInfo(false)}
                hitSlop={12}
                style={[styles.modalCloseBtn, { borderColor: line, backgroundColor: paperRaised }]}
              >
                <X size={16} color={ink} />
              </Pressable>
            </View>
            <View style={{ gap: 8, marginTop: 8 }}>
              {POINTS_ROWS.map((item) => (
                <View
                  key={item.label}
                  style={[styles.modalRow, { backgroundColor: paperRaised, borderColor: line }]}
                >
                  <View style={[styles.modalDot, { backgroundColor: stickers[item.color] }]} />
                  <Text style={[styles.modalLabel, { color: ink, fontFamily: font.body }]}>
                    {item.label}
                  </Text>
                  <Text
                    style={[styles.modalPts, { color: stickers[item.color], fontFamily: font.bodySemiBold }]}
                  >
                    {item.pts}
                  </Text>
                </View>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ─── Category Detail modal ─── */}
      <Modal
        visible={!!selectedCategory}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedCategory(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedCategory(null)}>
          <Pressable
            style={[
              styles.modalCard,
              styles.catModalCard,
              { backgroundColor: paper, borderColor: line },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedCategory &&
              (() => {
                const cat = CATEGORY_CONFIG.find((c) => c.key === selectedCategory)!
                const catBadges = BADGE_DEFS.filter((d) => d.category === selectedCategory)
                const earnedIds = new Set(earnedBadges.map((e) => e.badgeId))
                const earnedList = catBadges.filter((d) => earnedIds.has(d.id))
                const lockedList = catBadges.filter((d) => !earnedIds.has(d.id))
                const color = stickers[cat.color]
                const soft = stickers[cat.soft]
                const pct = catBadges.length > 0 ? (earnedList.length / catBadges.length) * 100 : 0

                return (
                  <>
                    <View style={styles.catModalHeader}>
                      <View style={[styles.catModalSticker, { backgroundColor: soft, borderColor: line }]}>
                        <cat.Sticker size={28} fill={color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.catModalTitle, { color: ink, fontFamily: font.display }]}>
                          {cat.label}
                        </Text>
                        <Text style={[styles.catModalCount, { color: ink3, fontFamily: font.body }]}>
                          {earnedList.length}/{catBadges.length} earned
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => setSelectedCategory(null)}
                        hitSlop={12}
                        style={[styles.modalCloseBtn, { borderColor: line, backgroundColor: paperRaised }]}
                      >
                        <X size={16} color={ink} />
                      </Pressable>
                    </View>

                    <View style={[styles.catModalBar, { backgroundColor: paperRaised }]}>
                      <View
                        style={[
                          styles.catModalBarFill,
                          { width: `${pct}%`, backgroundColor: color },
                        ]}
                      />
                    </View>

                    <ScrollView
                      style={{ marginTop: 12 }}
                      contentContainerStyle={{ paddingBottom: 12 }}
                      showsVerticalScrollIndicator={false}
                    >
                      {earnedList.length > 0 && (
                        <View style={styles.catSection}>
                          <MonoCaps size={10} color={color} style={{ marginBottom: 6 }}>
                            Achieved
                          </MonoCaps>
                          {earnedList.map((def) => {
                            const earned = earnedBadges.find((e) => e.badgeId === def.id)
                            return (
                              <BadgeRow
                                key={def.id}
                                def={def}
                                earnedDate={earned?.earnedAt}
                                bg={soft}
                                border={line}
                                ink={ink}
                                ink3={ink3}
                                fontBody={font.body}
                                fontMed={font.bodyMedium}
                                fontSemi={font.bodySemiBold}
                                locked={false}
                              />
                            )
                          })}
                        </View>
                      )}

                      {lockedList.length > 0 && (
                        <View style={styles.catSection}>
                          <MonoCaps size={10} color={ink3} style={{ marginBottom: 6 }}>
                            To unlock
                          </MonoCaps>
                          {lockedList.map((def) => (
                            <BadgeRow
                              key={def.id}
                              def={def}
                              bg={paperRaised}
                              border={line}
                              ink={ink3}
                              ink3={ink3}
                              fontBody={font.body}
                              fontMed={font.bodyMedium}
                              fontSemi={font.bodySemiBold}
                              locked
                            />
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

// ─── BadgeRow (category modal list item) ─────────────────────────────────────

interface BadgeRowProps {
  def: BadgeDef
  earnedDate?: string
  bg: string
  border: string
  ink: string
  ink3: string
  fontBody: string
  fontMed: string
  fontSemi: string
  locked: boolean
}

function BadgeRow({
  def,
  earnedDate,
  bg,
  border,
  ink,
  ink3,
  fontBody,
  fontMed,
  fontSemi,
  locked,
}: BadgeRowProps) {
  return (
    <View style={[styles.catBadgeRow, { backgroundColor: bg, borderColor: border }]}>
      {locked ? (
        <View style={[styles.catBadgeLock, { backgroundColor: bg, borderColor: border }]}>
          <Lock size={14} color={ink3} strokeWidth={2} />
        </View>
      ) : (
        <View style={styles.catBadgeStickerWrap}>
          <BadgeIcon badgeId={def.id} size={32} />
        </View>
      )}
      <View style={styles.catBadgeInfo}>
        <Text style={[styles.catBadgeName, { color: ink, fontFamily: fontSemi }]} numberOfLines={1}>
          {def.name}
        </Text>
        <Text
          style={[styles.catBadgeDesc, { color: ink3, fontFamily: fontBody }]}
          numberOfLines={2}
        >
          {def.description}
        </Text>
      </View>
      <View style={styles.catBadgeRight}>
        <Text
          style={[styles.catBadgeTier, { color: locked ? ink3 : getTierColor(def.tier), fontFamily: fontSemi }]}
        >
          {def.tier}
        </Text>
        {earnedDate && (
          <Text style={[styles.catBadgeDate, { color: ink3, fontFamily: fontMed }]}>
            {new Date(earnedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        )}
      </View>
    </View>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 16 },

  // Header
  pointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  pointsPillText: { fontSize: 13 },

  // Hero
  hero: {
    alignItems: 'center',
    marginTop: 14,
    position: 'relative',
    paddingHorizontal: 12,
  },
  heroStickerLeft: {
    position: 'absolute',
    left: 16,
    top: 0,
    transform: [{ rotate: '-12deg' }],
    zIndex: 1,
  },
  heroStickerRight: {
    position: 'absolute',
    right: 14,
    top: 38,
    transform: [{ rotate: '14deg' }],
    zIndex: 1,
  },
  heroTitleRow: { flexDirection: 'row', alignItems: 'baseline' },
  streakCircleWrap: { marginTop: 20 },
  streakCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stats
  statRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, height: 30 },

  // Claim button
  claimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 999,
    borderWidth: 1,
  },
  claimBtnText: { fontSize: 16, letterSpacing: -0.1 },

  // Reward reveal
  revealHeader: { flexDirection: 'row', alignItems: 'center' },
  revealBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  revealBadgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  revealBadgeName: { fontSize: 13 },

  // Weekly grid
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  weekGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: { alignItems: 'center', gap: 6, flex: 1 },
  weekTile: {
    width: 38,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekLetter: { fontSize: 11, letterSpacing: 0.5 },

  // Today's quest
  questCard: {
    padding: 20,
    borderRadius: 28,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 140,
  },
  questFlower: { position: 'absolute', right: -24, bottom: -30, opacity: 0.95 },
  questPills: { flexDirection: 'row', gap: 8, marginTop: 14 },
  questPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  questPillText: { fontSize: 12 },

  // Badge collection
  badgeHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  badgeHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  badgeHeaderTitle: { fontSize: 18, flex: 1, letterSpacing: -0.3 },
  badgeHeaderCount: { fontSize: 13 },
  progressBarTrack: { height: 6, borderRadius: 999, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 999 },
  recentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  badgeItem: {
    width: '31.5%',
    padding: 10,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 16,
  },
  badgeIconWrap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  badgeName: { fontSize: 11, textAlign: 'center' },
  badgeTier: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  viewAllText: { fontSize: 14 },

  // Categories
  categoriesSection: { gap: 10 },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryCard: {
    width: '48.5%',
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderRadius: 22,
  },
  categoryCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  categorySticker: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  categoryLabel: { fontSize: 14, letterSpacing: -0.1 },
  categoryCount: { fontSize: 11, marginTop: 1 },
  categoryBar: { height: 4, borderRadius: 999, overflow: 'hidden' },
  categoryBarFill: { height: '100%', borderRadius: 999 },

  // Leaderboard
  leaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
  },
  leaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  leaderText: { flex: 1, gap: 2 },
  leaderTitle: { fontSize: 16, letterSpacing: -0.2 },
  leaderSub: { fontSize: 13 },

  // How points work
  howBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  howBtnText: { fontSize: 13 },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20,19,19,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    padding: 20,
    borderRadius: 28,
    borderWidth: 1,
    gap: 4,
  },
  catModalCard: { maxHeight: '85%', paddingBottom: 16 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalTitle: { fontSize: 20, letterSpacing: -0.3 },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  modalDot: { width: 10, height: 10, borderRadius: 5 },
  modalLabel: { fontSize: 14, flex: 1 },
  modalPts: { fontSize: 14 },

  // Category modal
  catModalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  catModalSticker: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  catModalTitle: { fontSize: 20, letterSpacing: -0.3 },
  catModalCount: { fontSize: 13, marginTop: 1 },
  catModalBar: { height: 6, borderRadius: 999, overflow: 'hidden' },
  catModalBarFill: { height: '100%', borderRadius: 999 },
  catSection: { marginTop: 6, gap: 6 },
  catBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
  },
  catBadgeStickerWrap: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  catBadgeLock: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  catBadgeInfo: { flex: 1, gap: 2 },
  catBadgeName: { fontSize: 13 },
  catBadgeDesc: { fontSize: 11, lineHeight: 14 },
  catBadgeRight: { alignItems: 'flex-end', gap: 2 },
  catBadgeTier: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 },
  catBadgeDate: { fontSize: 10 },
})
