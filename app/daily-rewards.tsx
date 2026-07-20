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
import {
  ChevronRight,
  Check,
  X,
  Lock,
  Info,
  Flame as FlameLine,
  Sparkles as SparklesLine,
  Gift as GiftLine,
  Utensils as UtensilsLine,
  Moon as MoonLine,
  Smile as SmileLine,
  HeartPulse as HeartPulseLine,
  TrendingUp as TrendingUpLine,
  Users as UsersLine,
  Award as AwardLine,
  Trophy as TrophyLine,
  type LucideIcon,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { toDateStr } from '../lib/cycleLogic'
import {
  useTheme,
  stickers as stickerPalette,
  getModeColor,
  getModeColorSoft,
  radius,
  useDiffuseTheme,
  diffuseFont,
  getDiffuseAccent,
} from '../constants/theme'
import {
  useIsDiffuse,
  SoftBloom,
  DiffuseArrow,
} from '../components/ui/diffuse/DiffuseKit'
import {
  DiffuseBloomIcon,
} from '../components/ui/diffuse/DiffusePrimitives'
import { Character, type CharacterName } from '../components/characters/Characters'
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
import { usePregnancyStore } from '../store/usePregnancyStore'
import { weekForDate } from '../lib/pregnancyWeeks'
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
import { useTranslation } from '../lib/i18n'

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEK_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const

// Category config: paper-palette sticker colors + sticker component per category.
// `Line` is the Diffuse-branch counterpart — a Lucide line glyph rendered over
// a soft accent bloom (the sticker stays the cream-branch icon system).
const CATEGORY_CONFIG: {
  key: BadgeCategory
  label: string
  color: keyof typeof stickerPalette       // sticker palette key (light)
  soft: keyof typeof stickerPalette        // its soft companion
  Sticker: (p: { size?: number; fill?: string }) => React.ReactElement
  Line: LucideIcon
  char: CharacterName                       // Diffuse: the Character-blob concept
}[] = [
  { key: 'streak',    label: 'Streaks',    color: 'coral',  soft: 'pinkSoft',   Sticker: Flame,       Line: FlameLine, char: 'streak' },
  { key: 'nutrition', label: 'Nutrition',  color: 'green',  soft: 'greenSoft',  Sticker: LogNutrition, Line: UtensilsLine, char: 'nutrition' },
  { key: 'sleep',     label: 'Sleep',      color: 'lilac',  soft: 'lilacSoft',  Sticker: LogSleep,     Line: MoonLine, char: 'sleep' },
  { key: 'mood',      label: 'Mood',       color: 'pink',   soft: 'pinkSoft',   Sticker: (p) => <MoodFace {...p} variant="happy" />, Line: SmileLine, char: 'mood' },
  { key: 'health',    label: 'Health',     color: 'blue',   soft: 'blueSoft',   Sticker: LogAppointment, Line: HeartPulseLine, char: 'heartbeat' },
  { key: 'growth',    label: 'Growth',     color: 'yellow', soft: 'yellowSoft', Sticker: (p) => <StarSticker {...p} />, Line: TrendingUpLine, char: 'growth' },
  { key: 'community', label: 'Community',  color: 'lilac',  soft: 'lilacSoft',  Sticker: CircleDots,   Line: UsersLine, char: 'community' },
  { key: 'milestone', label: 'Milestones', color: 'peach',  soft: 'peachSoft',  Sticker: DayBadge,     Line: AwardLine, char: 'badge' },
  { key: 'daily',     label: 'Daily',      color: 'yellow', soft: 'yellowSoft', Sticker: QuestRibbon,  Line: GiftLine, char: 'reward' },
]

// Map category key → i18n translation key for category labels.
const CAT_LABEL_KEY: Record<BadgeCategory, any> = {
  streak:    'dailyRewards_catStreaks',
  nutrition: 'dailyRewards_catNutrition',
  sleep:     'dailyRewards_catSleep',
  mood:      'dailyRewards_catMood',
  health:    'dailyRewards_catHealth',
  growth:    'dailyRewards_catGrowth',
  community: 'dailyRewards_catCommunity',
  milestone: 'dailyRewards_catMilestones',
  daily:     'dailyRewards_catDaily',
  pregnancy: 'dailyRewards_catHealth',
}

// Mode-specific daily quest copy. Pregnancy quest is week-aware so the
// copy escalates with the trimester (water early → kicks mid → birth prep
// late). Returns a single string given the live mode + (optional) week.
function questCopyForMode(mode: string, week: number | null): string {
  if (mode === 'pre-pregnancy') return 'Log your cervical mucus & BBT'
  if (mode === 'kids') return 'Track 3 feedings & bedtime'
  if (mode === 'pregnancy') {
    if (week == null) return 'Drink 8 glasses of water'
    if (week < 13) return 'Drink water + log a symptom'
    if (week < 28) return 'Log weight + a quick mood check'
    if (week < 36) return 'Count 10 kicks in one hour'
    return 'Pack the hospital bag · prep for birth'
  }
  return ''
}

// Points breakdown shown in the info modal — mapped to sticker palette.
const POINTS_ROWS: { rowKey: string; pts: string; color: keyof typeof stickerPalette }[] = [
  { rowKey: 'dailyRewards_rowGaragePost',       pts: '+5',     color: 'green' },
  { rowKey: 'dailyRewards_rowChannelMsg',        pts: '+3',     color: 'blue' },
  { rowKey: 'dailyRewards_rowReactionReceived',  pts: '+1',     color: 'pink' },
  { rowKey: 'dailyRewards_rowCommentReceived',   pts: '+2',     color: 'lilac' },
  { rowKey: 'dailyRewards_rowChannelJoined',     pts: '+2',     color: 'lilac' },
  { rowKey: 'dailyRewards_rowChildLog',          pts: '+1',     color: 'yellow' },
  { rowKey: 'dailyRewards_rowStreakDay',          pts: '+3',     color: 'coral' },
  { rowKey: 'dailyRewards_rowDailyCheckin',      pts: '+10-50', color: 'peach' },
]

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DailyRewardsScreen() {
  const { colors, font, isDark, stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const insets = useSafeAreaInsets()
  const mode = useModeStore((s) => s.mode)

  const accent = diffuse ? getDiffuseAccent(mode, dt.isDark) : getModeColor(mode, isDark)
  const accentSoft = diffuse ? dt.colors.surface : getModeColorSoft(mode, isDark)
  const ink = diffuse ? dt.colors.ink : colors.text
  const ink3 = diffuse ? dt.colors.ink3 : colors.textMuted
  const paper = diffuse ? dt.colors.surface : colors.surface
  const paperRaised = diffuse ? dt.colors.surfaceRaised : colors.surfaceRaised
  const line = diffuse ? dt.colors.line : colors.border
  const bg = diffuse ? dt.colors.bg : colors.bg

  const checkIn = useBadgeStore((s) => s.checkIn)
  const currentStreak = useBadgeStore((s) => s.currentStreak)
  const longestStreak = useBadgeStore((s) => s.longestStreak)
  const totalPoints = useBadgeStore((s) => s.totalPoints)
  const totalCheckIns = useBadgeStore((s) => s.totalCheckIns)
  const lastCheckInDate = useBadgeStore((s) => s.lastCheckInDate)
  const earnedBadges = useBadgeStore((s) => s.earnedBadges)

  const { t } = useTranslation()
  const { data: leaderboard } = useLeaderboard(10)
  const [myUserId, setMyUserId] = useState<string | null>(null)

  useEffect(() => {
    syncBadgesFromSupabase().catch(() => {})
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setMyUserId(session.user.id)
    })
  }, [])

  const today = toDateStr(new Date())
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
  const pregnancyDueDate = usePregnancyStore.getState().dueDate
  const pregnancyStoredWeek = usePregnancyStore.getState().weekNumber
  const liveWeek = pregnancyDueDate
    ? weekForDate(pregnancyDueDate, toDateStr(new Date()))
    : pregnancyStoredWeek
  const questCopy = questCopyForMode(mode, liveWeek) || todaysReward.label

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
                diffuse
                  ? { backgroundColor: 'transparent', borderColor: dt.colors.hairline }
                  : { backgroundColor: paper, borderColor: line },
              ]}
            >
              {diffuse ? (
                <Character name="star" size={13} color={accent} />
              ) : (
                <StarSticker size={14} fill={stickers.yellow} />
              )}
              <Text
                style={[
                  styles.pointsPillText,
                  diffuse
                    ? { color: ink, fontFamily: diffuseFont.monoBold, letterSpacing: 0.5 }
                    : { color: ink, fontFamily: font.bodySemiBold },
                ]}
              >
                {totalPoints}
              </Text>
            </View>
          }
        />

        {/* ─── Hero: streak title + dashed circle ─── */}
        <View style={styles.hero}>
          {/* Decorative sticker bursts — cream only. Diffuse hides confetti. */}
          {!diffuse && (
            <>
              <View style={[styles.heroStickerLeft]} pointerEvents="none">
                <StarSticker size={40} fill={stickers.yellow} />
              </View>
              <View style={[styles.heroStickerRight]} pointerEvents="none">
                <Burst size={44} fill={stickers.pink} points={10} />
              </View>
            </>
          )}

          <View style={styles.heroTitleRow}>
            <Display size={32} color={ink}>
              {t('dailyRewards_n_day', { n: currentStreak })}
            </Display>
            <DisplayItalic size={32} color={diffuse ? accent : stickers.coral} style={{ marginLeft: 8 }}>
              {t('dailyRewards_streak_label')}
            </DisplayItalic>
          </View>
          <Body size={14} color={ink3} align="center" style={{ marginTop: 2 }}>
            {t('dailyRewards_grandmaProud')}
          </Body>

          {/* Streak circle — dashed ink ring (cream) / hairline ring + soft
              accent bloom (diffuse). */}
          <View style={styles.streakCircleWrap}>
            {diffuse ? (
              <View
                style={[
                  styles.streakCircle,
                  styles.streakCircleDiffuse,
                  { backgroundColor: dt.colors.surface, borderColor: accent },
                ]}
              >
                <SoftBloom color={accent} opacity={dt.isDark ? 0.3 : 0.4} spread={0.5} radius="55%" />
                <Display size={56} color={ink} style={{ lineHeight: 58 }}>
                  {currentStreak}
                </Display>
              </View>
            ) : (
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
            )}
          </View>
        </View>

        {/* ─── Stat row (longest / total / badges) ─── */}
        <PaperCard padding={14} radius={24}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Display size={22} color={ink}>
                {longestStreak}
              </Display>
              <MonoCaps size={10} color={ink3}>{t('dailyRewards_statLongest')}</MonoCaps>
            </View>
            <View style={[styles.statDivider, { backgroundColor: line }]} />
            <View style={styles.statItem}>
              <Display size={22} color={ink}>
                {totalCheckIns}
              </Display>
              <MonoCaps size={10} color={ink3}>{t('dailyRewards_statTotalDays')}</MonoCaps>
            </View>
            <View style={[styles.statDivider, { backgroundColor: line }]} />
            <View style={styles.statItem}>
              <Display size={22} color={ink}>
                {earnedCount}
              </Display>
              <MonoCaps size={10} color={ink3}>{t('dailyRewards_statBadges')}</MonoCaps>
            </View>
          </View>
        </PaperCard>

        {/* ─── Claim button ─── */}
        {diffuse ? (
          <Pressable
            onPress={handleCheckIn}
            disabled={alreadyCheckedIn}
            style={({ pressed }) => [
              styles.claimBtn,
              {
                backgroundColor: 'transparent',
                borderColor: alreadyCheckedIn ? dt.colors.line : dt.colors.hairline,
              },
              pressed && !alreadyCheckedIn && { opacity: 0.6 },
            ]}
          >
            {alreadyCheckedIn ? (
              <>
                <Check size={16} color={ink3} strokeWidth={1.8} />
                <Text style={[styles.claimBtnTextDiffuse, { color: ink3, fontFamily: diffuseFont.mono }]}>
                  {t('dailyRewards_checkedIn')}
                </Text>
              </>
            ) : (
              <>
                <Character name="sparkle" size={22} color={accent} />
                <Text style={[styles.claimBtnTextDiffuse, { color: ink, fontFamily: diffuseFont.monoBold }]}>
                  {t('dailyRewards_claimReward')}
                </Text>
                <DiffuseArrow color={accent} size={16} />
              </>
            )}
          </Pressable>
        ) : (
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
                  {t('dailyRewards_checkedIn')}
                </Text>
              </>
            ) : (
              <>
                <Sparkle size={22} fill={stickers.yellow} />
                <Text style={[styles.claimBtnText, { color: ink, fontFamily: font.bodySemiBold }]}>
                  {t('dailyRewards_claimReward')}
                </Text>
              </>
            )}
          </Pressable>
        )}

        {/* ─── Reward reveal (after claim) ─── */}
        {showReward && rewardResult && (
          <PaperCard tint={accentSoft} radius={24} padding={16} borderColor={line}>
            <View style={styles.revealHeader}>
              {diffuse ? (
                <DiffuseBloomIcon color={accent} size={28} intensity={0.5}>
                  <Character name="sparkle" size={22} color={accent} />
                </DiffuseBloomIcon>
              ) : (
                <Sparkle size={22} fill={stickers.yellow} />
              )}
              <Display size={20} color={ink} style={{ marginLeft: 8 }}>
                {t('dailyRewards_pointsReveal', { n: rewardResult.points })}
              </Display>
            </View>
            <Body size={14} color={ink3} style={{ marginTop: 4 }}>
              {DAILY_REWARDS.find((r) => r.day === ((rewardResult.streak - 1) % 7) + 1)?.label ??
                t('dailyRewards_greatJob')}
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
                        diffuse
                          ? { backgroundColor: 'transparent', borderColor: dt.colors.line2 }
                          : { backgroundColor: paper, borderColor: line },
                      ]}
                    >
                      <BadgeIcon badgeId={id} size={20} />
                      <Text
                        style={[
                          styles.revealBadgeName,
                          diffuse
                            ? { color: ink, fontFamily: diffuseFont.body }
                            : { color: ink, fontFamily: font.bodyMedium },
                        ]}
                      >
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
            <MonoCaps size={11} color={ink3}>{t('dailyRewards_thisWeek')}</MonoCaps>
            <Body size={12} color={ink3}>
              {t('dailyRewards_weekProgress', { n: doneThisWeek })}
            </Body>
          </View>
          <View style={styles.weekGrid}>
            {WEEK_LETTERS.map((letter, i) => {
              const dayIdx = i + 1
              const isDone = dayIdx <= doneThisWeek
              const isToday = dayIdx === dayInCycle && !alreadyCheckedIn

              // Diffuse: hairline day tiles — done = accent ring + soft bloom,
              // today = strong hairline ring, locked = faint hairline.
              const tileBg = diffuse
                ? 'transparent'
                : isDone
                  ? accent
                  : isToday
                    ? paper
                    : paperRaised
              const tileBorder = diffuse
                ? isDone
                  ? accent
                  : isToday
                    ? dt.colors.hairline
                    : dt.colors.line
                : isToday
                  ? ink
                  : line
              const tileBorderWidth = diffuse ? 1 : isToday ? 1.5 : 1

              return (
                <View key={`${letter}-${i}`} style={styles.weekDay}>
                  <View
                    style={[
                      styles.weekTile,
                      {
                        backgroundColor: tileBg,
                        borderColor: tileBorder,
                        borderWidth: tileBorderWidth,
                        overflow: 'hidden',
                      },
                    ]}
                  >
                    {diffuse && isDone ? (
                      <SoftBloom color={accent} opacity={dt.isDark ? 0.32 : 0.42} spread={0.5} radius="55%" />
                    ) : null}
                    {isDone ? (
                      <Check size={18} color={diffuse ? accent : ink} strokeWidth={diffuse ? 1.8 : 2.5} />
                    ) : isToday ? (
                      diffuse ? (
                        <Character name="star" size={22} color={accent} />
                      ) : (
                        <StarSticker size={20} fill={accent} />
                      )
                    ) : (
                      <Lock size={12} color={diffuse ? dt.colors.ink4 : ink3} strokeWidth={2} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.weekLetter,
                      diffuse
                        ? { color: isToday ? ink : ink3, fontFamily: diffuseFont.mono }
                        : { color: isToday ? ink : ink3, fontFamily: font.bodyMedium },
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
            diffuse
              ? { backgroundColor: dt.colors.surface, borderColor: dt.colors.line }
              : { backgroundColor: accentSoft, borderColor: line },
          ]}
        >
          {/* Decorative flower hero — cream only. Diffuse uses a soft corner
              bloom + a small line glyph over bloom instead. */}
          {diffuse ? (
            <>
              <SoftBloom color={accent} cx="88%" cy="80%" opacity={dt.isDark ? 0.28 : 0.38} spread={0.5} />
              <View style={styles.questGlyph} pointerEvents="none">
                <DiffuseBloomIcon color={accent} size={40} intensity={0.5}>
                  <Character name="reward" size={28} color={accent} />
                </DiffuseBloomIcon>
              </View>
            </>
          ) : (
            <View style={styles.questFlower} pointerEvents="none">
              <Flower size={120} petal={accent} center={stickers.yellow} />
            </View>
          )}
          <MonoCaps size={11} color={ink3}>{t('dailyRewards_todaysQuest')}</MonoCaps>
          <Display size={22} color={ink} style={{ marginTop: 4, maxWidth: 220, lineHeight: 26 }}>
            {questCopy}
          </Display>
          <View style={styles.questPills}>
            <View
              style={[
                styles.questPill,
                diffuse
                  ? { backgroundColor: 'transparent', borderColor: dt.colors.line2 }
                  : { backgroundColor: paper, borderColor: line },
              ]}
            >
              <Text
                style={[
                  styles.questPillText,
                  diffuse
                    ? { color: ink, fontFamily: diffuseFont.mono, letterSpacing: 0.5 }
                    : { color: ink, fontFamily: font.bodyMedium },
                ]}
              >
                {t('dailyRewards_quest_points', { n: todaysReward.points })}
              </Text>
            </View>
            {todaysReward.badge && (
              <View
                style={[
                  styles.questPill,
                  diffuse
                    ? { backgroundColor: 'transparent', borderColor: dt.colors.line2 }
                    : { backgroundColor: paper, borderColor: line },
                ]}
              >
                <Text
                  style={[
                    styles.questPillText,
                    diffuse
                      ? { color: ink, fontFamily: diffuseFont.mono, letterSpacing: 0.5 }
                      : { color: ink, fontFamily: font.bodyMedium },
                  ]}
                >
                  {t('dailyRewards_unlock_badge')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ─── Badge Collection ─── */}
        <PaperCard padding={16} radius={24}>
          <View style={styles.badgeHeader}>
            {diffuse ? (
              <DiffuseBloomIcon color={accent} size={32} intensity={0.5}>
                <Character name="badge" size={24} color={accent} />
              </DiffuseBloomIcon>
            ) : (
              <View style={[styles.badgeHeaderIcon, { backgroundColor: stickers.yellowSoft, borderColor: line }]}>
                <StarSticker size={18} fill={stickers.yellow} />
              </View>
            )}
            <Text
              style={[
                styles.badgeHeaderTitle,
                diffuse
                  ? { color: ink, fontFamily: diffuseFont.display, letterSpacing: -0.3 }
                  : { color: ink, fontFamily: font.display },
              ]}
            >
              {t('dailyRewards_badgeCollection')}
            </Text>
            <Text
              style={[
                styles.badgeHeaderCount,
                diffuse
                  ? { color: ink3, fontFamily: diffuseFont.monoBold, letterSpacing: 0.5 }
                  : { color: ink3, fontFamily: font.bodyMedium },
              ]}
            >
              {earnedCount}/{totalBadges}
            </Text>
          </View>

          <View style={[styles.progressBarTrack, { backgroundColor: diffuse ? dt.colors.line : paperRaised }]}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progressPct}%`, backgroundColor: diffuse ? accent : stickers.yellow },
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
                      diffuse
                        ? { backgroundColor: dt.colors.surface, borderColor: dt.colors.line }
                        : { backgroundColor: tint, borderColor: line },
                    ]}
                  >
                    <View style={styles.badgeIconWrap}>
                      <BadgeIcon badgeId={earned.badgeId} size={40} />
                    </View>
                    <Text
                      style={[
                        styles.badgeName,
                        diffuse
                          ? { color: ink, fontFamily: diffuseFont.bodySemiBold }
                          : { color: ink, fontFamily: font.bodySemiBold },
                      ]}
                      numberOfLines={1}
                    >
                      {def.name}
                    </Text>
                    <Text
                      style={[
                        styles.badgeTier,
                        diffuse
                          ? { color: ink3, fontFamily: diffuseFont.mono }
                          : { color: getTierColor(def.tier), fontFamily: font.bodySemiBold },
                      ]}
                    >
                      {def.tier}
                    </Text>
                  </View>
                )
              })}
            </View>
          )}

          {diffuse ? (
            <Pressable
              onPress={() => router.push('/profile/badges' as any)}
              style={({ pressed }) => [
                styles.viewAllBtnDiffuse,
                { borderTopColor: dt.colors.line2 },
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text style={[styles.viewAllTextDiffuse, { color: ink, fontFamily: diffuseFont.mono }]}>
                {t('dailyRewards_viewAllBadges')}
              </Text>
              <DiffuseArrow color={ink3} size={16} />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => router.push('/profile/badges' as any)}
              style={({ pressed }) => [
                styles.viewAllBtn,
                { borderColor: line, backgroundColor: paperRaised },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.viewAllText, { color: ink, fontFamily: font.bodyMedium }]}>
                {t('dailyRewards_viewAllBadges')}
              </Text>
              <ChevronRight size={16} color={ink3} />
            </Pressable>
          )}
        </PaperCard>

        {/* ─── Categories ─── */}
        <View style={styles.categoriesSection}>
          <MonoCaps size={11} color={ink3} style={{ marginLeft: 4 }}>
            {t('dailyRewards_categories')}
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
                    diffuse
                      ? { backgroundColor: dt.colors.surface, borderColor: dt.colors.line }
                      : { backgroundColor: soft, borderColor: line },
                    pressed && { opacity: diffuse ? 0.7 : 0.85, transform: diffuse ? undefined : [{ scale: 0.98 }] },
                  ]}
                >
                  <View style={styles.categoryCardTop}>
                    <View style={styles.categorySticker}>
                      {diffuse ? (
                        <DiffuseBloomIcon color={accent} size={38} intensity={0.5}>
                          <Character name={cat.char} size={26} color={color} />
                        </DiffuseBloomIcon>
                      ) : (
                        <cat.Sticker size={38} fill={color} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.categoryLabel,
                          diffuse
                            ? { color: ink, fontFamily: diffuseFont.bodySemiBold }
                            : { color: ink, fontFamily: font.bodySemiBold },
                        ]}
                      >
                        {t(CAT_LABEL_KEY[cat.key])}
                      </Text>
                      <Text
                        style={[
                          styles.categoryCount,
                          diffuse
                            ? { color: ink3, fontFamily: diffuseFont.mono, letterSpacing: 0.5 }
                            : { color: ink3, fontFamily: font.body },
                        ]}
                      >
                        {earned}/{catBadges.length}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.categoryBar, { backgroundColor: diffuse ? dt.colors.line : paper }]}>
                    <View
                      style={[
                        styles.categoryBarFill,
                        { width: `${pct}%`, backgroundColor: diffuse ? accent : color },
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
            diffuse
              ? { backgroundColor: dt.colors.surface, borderColor: dt.colors.line }
              : { backgroundColor: paper, borderColor: line },
            pressed && { opacity: diffuse ? 0.7 : 0.9, transform: diffuse ? undefined : [{ scale: 0.98 }] },
          ]}
        >
          {diffuse ? (
            <DiffuseBloomIcon color={accent} size={44} intensity={0.5}>
              <Character name="trophy" size={28} color={accent} />
            </DiffuseBloomIcon>
          ) : (
            <View style={[styles.leaderIcon, { backgroundColor: stickers.yellowSoft, borderColor: line }]}>
              <StarSticker size={22} fill={stickers.yellow} />
            </View>
          )}
          <View style={styles.leaderText}>
            <Text
              style={[
                styles.leaderTitle,
                diffuse
                  ? { color: ink, fontFamily: diffuseFont.display, letterSpacing: -0.2 }
                  : { color: ink, fontFamily: font.display },
              ]}
            >
              {t('dailyRewards_communityLeaderboard')}
            </Text>
            <Text
              style={[
                styles.leaderSub,
                diffuse
                  ? { color: ink3, fontFamily: diffuseFont.body }
                  : { color: ink3, fontFamily: font.body },
              ]}
            >
              {leaderboard && myUserId
                ? t('dailyRewards_rankDesc', {
                    rank: String(leaderboard.find((e) => e.user_id === myUserId)?.rank ?? '—'),
                    n: String(leaderboard.find((e) => e.user_id === myUserId)?.total_points ?? 0),
                  })
                : t('dailyRewards_competeDesc')}
            </Text>
          </View>
          {diffuse ? <DiffuseArrow color={ink3} size={18} /> : <ChevronRight size={20} color={ink3} />}
        </Pressable>

        {/* ─── How points work ─── */}
        <Pressable
          onPress={() => setShowPointsInfo(true)}
          style={({ pressed }) => [
            styles.howBtn,
            diffuse
              ? { borderColor: dt.colors.line2, backgroundColor: 'transparent' }
              : { borderColor: line, backgroundColor: paper },
            pressed && { opacity: diffuse ? 0.6 : 0.8 },
          ]}
        >
          <Info size={14} color={ink3} strokeWidth={2} />
          <Text
            style={[
              styles.howBtnText,
              diffuse
                ? { color: ink3, fontFamily: diffuseFont.mono, letterSpacing: 1, textTransform: 'uppercase' }
                : { color: ink3, fontFamily: font.bodyMedium },
            ]}
          >
            {t('dailyRewards_howPointsWork')}
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
            style={[
              styles.modalCard,
              diffuse
                ? { backgroundColor: dt.colors.bg, borderColor: dt.colors.line }
                : { backgroundColor: paper, borderColor: line },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalTitle,
                  diffuse
                    ? { color: ink, fontFamily: diffuseFont.display, letterSpacing: -0.3 }
                    : { color: ink, fontFamily: font.display },
                ]}
              >
                {t('dailyRewards_howPointsWork')}
              </Text>
              <Pressable
                onPress={() => setShowPointsInfo(false)}
                hitSlop={12}
                style={[
                  styles.modalCloseBtn,
                  diffuse
                    ? { borderColor: dt.colors.hairline, backgroundColor: 'transparent' }
                    : { borderColor: line, backgroundColor: paperRaised },
                ]}
              >
                <X size={16} color={ink} />
              </Pressable>
            </View>
            <Text
              style={[
                styles.modalSubtitle,
                diffuse
                  ? { color: ink3, fontFamily: diffuseFont.italic, opacity: 1 }
                  : { color: ink, fontFamily: font.italic },
              ]}
            >
              {t('dailyRewards_howPointsBody')}
            </Text>
            <View style={{ gap: 8, marginTop: 12 }}>
              {POINTS_ROWS.map((item) => {
                const dotColor = stickers[item.color]
                return (
                  <View
                    key={item.rowKey}
                    style={[
                      styles.modalRow,
                      diffuse
                        ? { backgroundColor: 'transparent', borderColor: dt.colors.line }
                        : { backgroundColor: paperRaised, borderColor: line },
                    ]}
                  >
                    <View
                      style={[
                        styles.modalDot,
                        diffuse
                          ? { backgroundColor: accent }
                          : {
                              backgroundColor: dotColor,
                              borderWidth: 1.2,
                              borderColor: 'rgba(20,19,19,0.35)',
                            },
                      ]}
                    />
                    <Text
                      style={[
                        styles.modalLabel,
                        diffuse
                          ? { color: ink, fontFamily: diffuseFont.body }
                          : { color: ink, fontFamily: font.bodySemiBold },
                      ]}
                    >
                      {t(item.rowKey as any)}
                    </Text>
                    <Text
                      style={[
                        styles.modalPts,
                        diffuse
                          ? { color: ink, fontFamily: diffuseFont.monoBold, fontWeight: '400', letterSpacing: 0 }
                          : { color: ink, fontFamily: font.display },
                      ]}
                    >
                      {item.pts}
                    </Text>
                  </View>
                )
              })}
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
              diffuse
                ? { backgroundColor: dt.colors.bg, borderColor: dt.colors.line }
                : { backgroundColor: paper, borderColor: line },
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
                      {diffuse ? (
                        <DiffuseBloomIcon color={accent} size={44} intensity={0.5}>
                          <Character name={cat.char} size={28} color={color} />
                        </DiffuseBloomIcon>
                      ) : (
                        <View style={[styles.catModalSticker, { backgroundColor: soft, borderColor: line }]}>
                          <cat.Sticker size={28} fill={color} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.catModalTitle,
                            diffuse
                              ? { color: ink, fontFamily: diffuseFont.display, letterSpacing: -0.3 }
                              : { color: ink, fontFamily: font.display },
                          ]}
                        >
                          {cat.label}
                        </Text>
                        <Text
                          style={[
                            styles.catModalCount,
                            diffuse
                              ? { color: ink3, fontFamily: diffuseFont.mono, letterSpacing: 0.5 }
                              : { color: ink3, fontFamily: font.body },
                          ]}
                        >
                          {t('dailyRewards_earnedOf', { n: String(earnedList.length), total: String(catBadges.length) })}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => setSelectedCategory(null)}
                        hitSlop={12}
                        style={[
                          styles.modalCloseBtn,
                          diffuse
                            ? { borderColor: dt.colors.hairline, backgroundColor: 'transparent' }
                            : { borderColor: line, backgroundColor: paperRaised },
                        ]}
                      >
                        <X size={16} color={ink} />
                      </Pressable>
                    </View>

                    <View style={[styles.catModalBar, { backgroundColor: diffuse ? dt.colors.line : paperRaised }]}>
                      <View
                        style={[
                          styles.catModalBarFill,
                          { width: `${pct}%`, backgroundColor: diffuse ? accent : color },
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
                          <MonoCaps size={10} color={diffuse ? accent : color} style={{ marginBottom: 6 }}>
                            {t('dailyRewards_achieved')}
                          </MonoCaps>
                          {earnedList.map((def) => {
                            const earned = earnedBadges.find((e) => e.badgeId === def.id)
                            return (
                              <BadgeRow
                                key={def.id}
                                def={def}
                                earnedDate={earned?.earnedAt}
                                bg={diffuse ? dt.colors.surface : soft}
                                border={line}
                                ink={ink}
                                ink3={ink3}
                                fontBody={diffuse ? diffuseFont.body : font.body}
                                fontMed={diffuse ? diffuseFont.mono : font.bodyMedium}
                                fontSemi={diffuse ? diffuseFont.bodySemiBold : font.bodySemiBold}
                                locked={false}
                                diffuse={diffuse}
                                accent={accent}
                              />
                            )
                          })}
                        </View>
                      )}

                      {lockedList.length > 0 && (
                        <View style={styles.catSection}>
                          <MonoCaps size={10} color={ink3} style={{ marginBottom: 6 }}>
                            {t('dailyRewards_toUnlock')}
                          </MonoCaps>
                          {lockedList.map((def) => (
                            <BadgeRow
                              key={def.id}
                              def={def}
                              bg={diffuse ? 'transparent' : paperRaised}
                              border={line}
                              ink={ink3}
                              ink3={ink3}
                              fontBody={diffuse ? diffuseFont.body : font.body}
                              fontMed={diffuse ? diffuseFont.mono : font.bodyMedium}
                              fontSemi={diffuse ? diffuseFont.bodySemiBold : font.bodySemiBold}
                              locked
                              diffuse={diffuse}
                              accent={accent}
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
  diffuse?: boolean
  accent?: string
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
  diffuse,
  accent,
}: BadgeRowProps) {
  // Diffuse: tier reads in the mode accent (earned) / ink-3 (locked) instead of
  // the raw tier-color palette; lock chip stays a hairline circle.
  const tierColor = diffuse
    ? locked
      ? ink3
      : accent ?? ink
    : locked
      ? ink3
      : getTierColor(def.tier)
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
          style={[styles.catBadgeTier, { color: tierColor, fontFamily: fontSemi }]}
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
  // Diffuse: solid thin hairline ring (no dashed neon), clipped for the bloom
  streakCircleDiffuse: {
    borderWidth: 1.5,
    borderStyle: 'solid',
    overflow: 'hidden',
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
  claimBtnTextDiffuse: { fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase' },

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
  questGlyph: { position: 'absolute', right: 16, bottom: 16 },
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
    borderRadius: radius.md,
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
  // Diffuse: containerless "view all" — top hairline rule, mono label + arrow
  viewAllBtnDiffuse: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 1,
  },
  viewAllTextDiffuse: { fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase' },

  // Categories
  categoriesSection: { gap: 10 },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryCard: {
    width: '48.5%',
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderRadius: radius.md,
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
    borderRadius: radius.lg,
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
  modalSubtitle: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 4,
    opacity: 0.7,
    lineHeight: 19,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  modalDot: { width: 12, height: 12, borderRadius: 6 },
  modalLabel: { fontSize: 14.5, flex: 1, letterSpacing: -0.2 },
  modalPts: { fontSize: 17, letterSpacing: -0.4, fontWeight: '700' },

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
    borderRadius: radius.md,
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
