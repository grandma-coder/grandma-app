/**
 * Profile tab — cream-paper redesign (Wave 1).
 *
 * Hero (sticker accents + initial avatar + mode subtitle) →
 * BadgesStrip → MyJourneyPillGrid → stat rows → Sign out.
 *
 * Source: docs/Claude design studio/src/more-screens.jsx:5-86
 */

import { FeedbackSheet } from '../../components/profile/FeedbackSheet'
import { useCallback, useMemo, useRef, useState } from 'react'
import {
  View,
  ScrollView,
  Pressable,
  Text,
  StyleSheet,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Settings as SettingsIcon, LogOut } from 'lucide-react-native'
import { NotificationBell } from '../../components/ui/NotificationBell'
import { useTheme, brand, getModeColor, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useIsDiffuse, useScrollBottomInset } from '../../components/ui/diffuse/DiffuseKit'
import { DiffuseListRow } from '../../components/ui/diffuse/DiffusePrimitives'
import { useModeStore } from '../../store/useModeStore'
import { useBehaviorStore } from '../../store/useBehaviorStore'
import { useChildStore } from '../../store/useChildStore'
import { useJourneyStore } from '../../store/useJourneyStore'
import { useBadgeStore, BADGE_DEFS, badgeName } from '../../store/useBadgeStore'
import { usePregnancyStore } from '../../store/usePregnancyStore'
import { useMenopauseStore } from '../../store/useMenopauseStore'
import { getCurrentWeekFromDueDate } from '../../lib/pregnancyData'
import { supabase } from '../../lib/supabase'
import { signOut } from '../../lib/signOut'
import { checkPremium } from '../../lib/revenue'
import { useTranslation } from '../../lib/i18n'
import Constants from 'expo-constants'
import { useCycleHistory } from '../../lib/cycleAnalytics'
import { getCycleInfo, getDaysLate, toDateStr } from '../../lib/cycleLogic'
import { useCycleSettingsStore } from '../../store/useCycleSettingsStore'
import { useDevPanel } from '../../context/DevPanelContext'
import { getSubtitleFor } from '../../lib/profileStatus'
import { ProfileHero, type KidPill } from '../../components/profile/ProfileHero'
import { BadgesStrip, type BadgeEntry } from '../../components/profile/BadgesStrip'
import { MyJourneyPillGrid } from '../../components/profile/MyJourneyPillGrid'
import { SiteRow, QuietPill } from '../../components/profile/SiteSettingsKit'
import { childColor } from '../../components/ui/ChildPills'
import { SiteSticker } from '../../components/stickers/SiteSticker'
import { Character } from '../../components/characters/Characters'
import { MemoriesSheet } from '../../components/home/MemoriesSheet'
import { PaperAlert } from '../../components/ui/PaperAlert'
import { usePaywallEnabled, useDailyRewardsEnabled } from '../../store/useFeatureFlags'

function intlLocaleFor(language: string): string {
  return language === 'en' ? 'en-US' : language
}

export default function ProfileScreen() {
  const { colors, radius, isDark, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const insets = useSafeAreaInsets()
  const bottomInset = useScrollBottomInset()
  const { t, language } = useTranslation()

  const mode = useModeStore((s) => s.mode)
  const currentBehavior = useBehaviorStore((s) => s.currentBehavior)
  const children = useChildStore((s) => s.children)
  const setActiveChild = useChildStore((s) => s.setActiveChild)
  const earnedBadges = useBadgeStore((s) => s.earnedBadges)
  const storedPregnancyWeek = usePregnancyStore((s) => s.weekNumber)
  const pregnancyDueDate = usePregnancyStore((s) => s.dueDate)
  const pregnancyWeek = pregnancyDueDate
    ? getCurrentWeekFromDueDate(pregnancyDueDate)
    : storedPregnancyWeek

  const [userName, setUserName] = useState<string | null>(null)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const parentName = useJourneyStore((s) => s.parentName)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null)
  const [joinedYear, setJoinedYear] = useState<number | null>(null)
  const [careCircleCount, setCareCircleCount] = useState<number>(0)
  // Emergency card status: any saved emergency contact or insurance plan = ready.
  const [hasEmergency, setHasEmergency] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const paywallOn = usePaywallEnabled()
  const rewardsOn = useDailyRewardsEnabled()
  const [showMemories, setShowMemories] = useState(false)
  const [signOutConfirm, setSignOutConfirm] = useState(false)

  // Dev-panel 5-tap trigger on the version text (bottom of screen)
  const { openDevPanel } = useDevPanel()
  const tapCount = useRef(0)
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleVersionPress() {
    if (!__DEV__ && process.env.EXPO_PUBLIC_ENABLE_DEV_PANEL !== 'true') return
    tapCount.current += 1
    if (tapTimer.current) clearTimeout(tapTimer.current)
    tapTimer.current = setTimeout(() => { tapCount.current = 0 }, 1500)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (tapCount.current === 5) {
      tapCount.current = 0
      if (tapTimer.current) clearTimeout(tapTimer.current)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      openDevPanel()
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadProfile()
      checkPremium().then(setIsPremium).catch(() => {})
    }, [])
  )

  async function loadProfile() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setUserEmail(session.user.email ?? null)

    const [{ data: profile }, { data: caregiverRows }, { count: contactCount }, { count: planCount }] = await Promise.all([
      supabase
        .from('profiles')
        .select('name, photo_url, created_at')
        .eq('id', session.user.id)
        .single(),
      // Same source as the Care Circle screen: people this user invited
      // (one row per child they can see → count distinct people).
      supabase
        .from('child_caregivers')
        .select('email')
        .eq('invited_by', session.user.id)
        .neq('status', 'revoked'),
      supabase
        .from('emergency_contacts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.user.id),
      supabase
        .from('insurance_plans')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.user.id),
    ])

    if (profile?.name) setUserName(profile.name)
    setUserPhotoUrl(profile?.photo_url ?? null)
    if (profile?.created_at) setJoinedYear(new Date(profile.created_at).getFullYear())
    const selfEmail = session.user.email?.toLowerCase()
    const people = new Set(
      ((caregiverRows ?? []) as { email: string | null }[])
        .map((r) => r.email?.toLowerCase())
        .filter((e): e is string => !!e && e !== selfEmail),
    )
    setCareCircleCount(people.size)
    setHasEmergency((contactCount ?? 0) + (planCount ?? 0) > 0)
  }

  function handleSignOut() {
    setSignOutConfirm(true)
  }

  // ─── Derived values ───────────────────────────────────────────────────────
  const nameParts = (userName || parentName || '').trim().split(/\s+/).filter(Boolean)
  // No name saved yet: show no name rather than an English placeholder; the
  // avatar falls back to the email's first letter.
  const firstName = nameParts[0] ?? ''
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined
  const initial = (firstName[0] ?? userEmail?.[0] ?? '·').toUpperCase()

  // Cycle subtitle from the real cycle — same config the Home ring uses
  // (declared settings win over the measured average). No period yet = no day.
  const { data: cycleHistory } = useCycleHistory()
  const declaredCycleLength = useCycleSettingsStore((s) => s.cycleLength)
  const periodLength = useCycleSettingsStore((s) => s.periodLength)
  const lutealPhase = useCycleSettingsStore((s) => s.lutealPhase)
  const cycleToday = useMemo(() => {
    if (currentBehavior !== 'pre-pregnancy') return null
    const latest = cycleHistory?.cycles[cycleHistory.cycles.length - 1]
    if (!latest) return null
    const cycleLength = declaredCycleLength ?? cycleHistory?.avg ?? 28
    const cfg = { lastPeriodStart: latest.startDate, cycleLength, periodLength, lutealPhase }
    const today = toDateStr(new Date())
    // Past the expected start: Home shows "N days late", so don't wrap into an invented new cycle here.
    const daysLate = getDaysLate(cfg, today)
    return { ...getCycleInfo(cfg, today), daysLate }
    // language: phaseLabel is localized at compute time
  }, [currentBehavior, cycleHistory, declaredCycleLength, periodLength, lutealPhase, language])

  const behaviorForSubtitle = currentBehavior ?? 'kids'
  const cycleLateLabel = cycleToday && cycleToday.daysLate > 0
    ? (cycleToday.daysLate === 1 ? t('profile_sub_cycleLateOne') : t('profile_sub_cycleLate', { count: cycleToday.daysLate }))
    : null
  const subtitle = !userEmail ? '' : cycleLateLabel ?? getSubtitleFor(behaviorForSubtitle, cycleToday)

  const accent = getModeColor(mode, isDark)

  // Badges: 5 most recently earned, each mapped to its real definition
  const recentBadges: BadgeEntry[] = earnedBadges
    .slice()
    .sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime())
    .slice(0, 5)
    .map((eb) => {
      return {
        badgeId: eb.badgeId,
        label: badgeName(eb.badgeId, t),
      }
    })

  const hasChildren = children.length > 0

  // Behavior-aware gating — each journey only sees the menu items relevant
  // to it (e.g. a pregnant user shouldn't see Kids Profile or per-child
  // health history; a trying user shouldn't see kids-anything either).
  const isKidsBehavior = currentBehavior === 'kids'
  const isPregnancyBehavior = currentBehavior === 'pregnancy'
  const isPrePregBehavior = currentBehavior === 'pre-pregnancy'
  const isMenopauseBehavior = currentBehavior === 'menopause'
  const showKidsItems = isKidsBehavior && hasChildren

  // Memories are available in every behavior (kids per-child, pregnancy + cycle
  // per-user). The row opens the behavior-scoped inline MemoriesSheet. Kids
  // needs a child to scope photos to, so it still requires hasChildren.
  const memoriesBehavior: 'kids' | 'pregnancy' | 'cycle' =
    isKidsBehavior ? 'kids' : isPregnancyBehavior ? 'pregnancy' : 'cycle'
  const showMemoriesRow = isKidsBehavior ? hasChildren : true

  // Hide the per-child sticker pills in the hero unless the user is
  // actually in the kids journey — a pregnant user seeing kid pills
  // when they're tracking their pregnancy is just noise.
  const kidPills: KidPill[] = isKidsBehavior
    ? children.map((c, i) => ({
        id: c.id,
        name: c.name,
        color: childColor(i),
      }))
    : []

  // Pregnancy summary value (e.g. "Week 24" or "Due Aug 12")
  const pregnancySummary = (() => {
    if (pregnancyWeek != null) return t('app_settings_weekN', { n: pregnancyWeek })
    if (pregnancyDueDate) {
      const d = new Date(pregnancyDueDate + 'T12:00:00')
      return t('app_settings_dueDate', { date: d.toLocaleDateString(intlLocaleFor(language), { month: 'short', day: 'numeric' }) })
    }
    return t('app_settings_setUp')
  })()

  const menopauseStage = useMenopauseStore((s) => s.stage)
  const menopauseStageLabel = menopauseStage
    ? t(menopauseStage === 'peri' ? 'report_meno_stage_peri' : menopauseStage === 'meno' ? 'meno_ob_stage_meno_label' : 'report_meno_stage_post')
    : t('meno_set_rowNotSet')

  function handleKidPillPress(id: string) {
    const child = children.find((c) => c.id === id)
    if (child) setActiveChild(child)
    router.push('/profile/kids')
  }

  return (
    <View style={[styles.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 8, paddingBottom: bottomInset },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar — bell + settings gear (root of tab, no back) */}
        <View style={styles.topBar}>
          <NotificationBell />
          <Pressable
            onPress={() => router.push('/profile/settings')}
            accessibilityRole="button"
            accessibilityLabel={t('a11y_openSettings')}
            style={[
              styles.gearBtn,
              diffuse
                ? { backgroundColor: 'transparent', borderColor: dt.colors.hairline }
                : { backgroundColor: colors.surface, borderColor: colors.text, borderWidth: 2, width: 34, height: 34 },
            ]}
            hitSlop={8}
          >
            <SettingsIcon
              size={16}
              color={diffuse ? dt.colors.ink : colors.text}
              strokeWidth={diffuse ? 1.6 : 2}
            />
          </Pressable>
        </View>

        {/* Hero */}
        <ProfileHero
          initial={initial}
          firstName={firstName}
          lastName={lastName}
          subtitle={subtitle}
          accentColor={accent}
          photoUrl={userPhotoUrl}
          onAvatarPress={() => router.push('/profile/personal')}
          kidPills={kidPills}
          onKidPillPress={handleKidPillPress}
        />

        {/* Badges — part of Daily Rewards, hidden while that flag is off */}
        {rewardsOn && (
          <BadgesStrip
            badges={recentBadges}
            total={earnedBadges.length}
            onSeeAll={() => router.push('/profile/badges')}
          />
        )}

        {/* Journey switcher */}
        <MyJourneyPillGrid />

        {/* Menu */}
        <View
          style={[
            styles.menuCard,
            diffuse
              ? {
                  backgroundColor: dt.colors.surface,
                  borderColor: dt.colors.line,
                  borderRadius: radius.lg,
                  paddingHorizontal: 16,
                }
              : { borderWidth: 0, paddingHorizontal: 8 },
          ]}
        >
          {diffuse ? (
            <>
              <DiffuseListRow
                icon={<Character name="community" size={18} />}
                title={t('profile_careCircle')}
                value={careCircleCount === 1 ? '1 person' : `${careCircleCount} people`}
                onPress={() => router.push('/profile/care-circle')}
              />

              {isPregnancyBehavior && (
                <DiffuseListRow
                  icon={<Character name="heartbeat" size={18} />}
                  title="Pregnancy"
                  value={pregnancySummary}
                  onPress={() => router.push('/profile/pregnancy')}
                />
              )}

              {isPrePregBehavior && (
                <DiffuseListRow
                  icon={<Character name="period" size={18} />}
                  title="Cycle"
                  value="Tracking"
                  onPress={() => router.push('/(tabs)')}
                />
              )}
              {isPrePregBehavior && (
                <DiffuseListRow
                  icon={<Character name="calendar" size={18} />}
                  title={t('cycleSettings_rowTitle')}
                  showArrow
                  onPress={() => router.push('/profile/cycle-settings')}
                />
              )}

              {showKidsItems && (
                <DiffuseListRow
                  icon={<Character name="baby" size={18} />}
                  title="Kids Profile"
                  value={children.length === 1 ? '1 child' : `${children.length} children`}
                  onPress={() => router.push('/profile/kids')}
                />
              )}
              {showMemoriesRow && (
                <DiffuseListRow
                  icon={<Character name="photo" size={18} />}
                  title={t('profile_memories')}
                  value="—"
                  onPress={() => setShowMemories(true)}
                />
              )}
              {showKidsItems && (
                <DiffuseListRow
                  icon={<Character name="health" size={18} />}
                  title={t('profile_healthHistory')}
                  value={joinedYear ? `Since ${joinedYear}` : '—'}
                  onPress={() => router.push('/profile/health-history')}
                />
              )}
              <DiffuseListRow
                icon={<Character name="warning" size={18} />}
                title={t('profile_emergencyInsurance')}
                value={hasEmergency ? 'Ready' : 'Not set'}
                onPress={() => router.push('/profile/emergency-insurance')}
              />
              <DiffuseListRow
                icon={<Character name="bell" size={18} />}
                title={t('profile_notifications')}
                showArrow
                onPress={() => router.push('/profile/notifications')}
              />
              <DiffuseListRow
                icon={<Character name="key" size={18} />}
                title={t('profile_accountSecurity')}
                showArrow
                onPress={() => router.push('/profile/account')}
              />
              <DiffuseListRow
                icon={<Character name="note" size={18} />}
                title={t('profile_dataPrivacy')}
                showArrow
                onPress={() => router.push('/profile/privacy')}
              />
              {paywallOn && (
                <DiffuseListRow
                  icon={<Character name="gem" size={18} />}
                  title={t('profile_subscription')}
                  value={isPremium ? 'Premium' : 'Upgrade'}
                  onPress={() => router.push('/paywall')}
                />
              )}
              <DiffuseListRow
                icon={<Character name="tip" size={18} />}
                title={t('profile_help')}
                showArrow
                onPress={() => router.push('/profile/help')}
              />
              <DiffuseListRow
                icon={<Character name="star" size={18} />}
                title={t('profile_about')}
                showArrow
                onPress={() => router.push('/profile/about')}
                last
              />
            </>
          ) : (
            <>
              {/* The care circle shares children's care (invites are per child), so
                  with no children and nobody invited it would be an empty dead end. */}
              {(hasChildren || careCircleCount > 0) && (
                <SiteRow
                  sticker="love"
                  label={t('profile_careCircle')}
                  value={careCircleCount === 1 ? t('app_settings_onePerson') : t('app_settings_nPeople', { n: careCircleCount })}
                  onPress={() => router.push('/profile/care-circle')}
                />
              )}

              {/* Pregnancy-only row — surfaces current week / due date */}
              {isPregnancyBehavior && (
                <SiteRow
                  sticker="heart"
                  label={t('mode_pregnancy')}
                  value={pregnancySummary}
                  onPress={() => router.push('/profile/pregnancy')}
                />
              )}

              {/* Pre-pregnancy-only row — the cycle's own settings (lengths,
                  phases, period reminder). The old "Cycle · Tracking" row only
                  bounced back to Home, so it's folded into this one. */}
              {isPrePregBehavior && (
                <SiteRow
                  sticker="flower"
                  label={t('cycleSettings_rowTitle')}
                  value={cycleLateLabel ?? (cycleToday ? t('cycleAnalytics_dayNumber', { currentDay: cycleToday.cycleDay }) : undefined)}
                  onPress={() => router.push('/profile/cycle-settings')}
                />
              )}

              {/* Menopause-only row — stage + last period, editable */}
              {isMenopauseBehavior && (
                <SiteRow
                  sticker="flame"
                  label={t('app_journey_menopause')}
                  value={menopauseStageLabel}
                  onPress={() => router.push('/profile/menopause')}
                />
              )}

              {/* Kids-only rows — hidden in pregnancy / pre-pregnancy modes */}
              {showKidsItems && (
                <SiteRow
                  sticker="baby"
                  label={t('app_settings_kidsProfile')}
                  value={children.length === 1 ? t('app_settings_oneChild') : t('app_settings_nChildren', { n: children.length })}
                  onPress={() => router.push('/profile/kids')}
                />
              )}
              {showMemoriesRow && (
                <SiteRow
                  sticker="camera"
                  label={t('profile_memories')}
                  onPress={() => setShowMemories(true)}
                />
              )}
              {showKidsItems && (
                <SiteRow
                  sticker="thermo"
                  label={t('profile_healthHistory')}
                  value={joinedYear ? t('app_settings_sinceYear', { year: joinedYear }) : '—'}
                  onPress={() => router.push('/profile/health-history')}
                />
              )}
              <SiteRow
                sticker="phone"
                label={t('profile_emergencyInsurance')}
                value={hasEmergency ? t('app_settings_ready') : t('app_settings_notSet')}
                onPress={() => router.push('/profile/emergency-insurance')}
              />
              <SiteRow
                sticker="bell"
                label={t('profile_notifications')}
                onPress={() => router.push('/profile/notifications')}
              />
              <SiteRow
                sticker="lock"
                label={t('profile_accountSecurity')}
                onPress={() => router.push('/profile/account')}
              />
              <SiteRow
                sticker="shield"
                label={t('profile_dataPrivacy')}
                onPress={() => router.push('/profile/privacy')}
              />
              {paywallOn && (
                <SiteRow
                  sticker="star"
                  label={t('profile_subscription')}
                  value={isPremium ? t('app_settings_premium') : t('app_settings_upgrade')}
                  onPress={() => router.push('/paywall')}
                />
              )}
              <SiteRow
                sticker="books"
                label={t('profile_help')}
                onPress={() => router.push('/profile/help')}
              />
              <SiteRow
                sticker="bubble"
                label={t('feedback_row')}
                onPress={() => setFeedbackOpen(true)}
              />
              <SiteRow
                sticker="doc"
                label={t('profile_about')}
                onPress={() => router.push('/profile/about')}
                last
              />
            </>
          )}
        </View>

        {/* Sign out */}
        {!diffuse && (
          <QuietPill label={t('profile_signOut')} onPress={handleSignOut} style={{ marginHorizontal: 20, marginTop: 16 }} />
        )}
        {diffuse && <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [
            styles.signOutBtn,
            diffuse
              ? {
                  backgroundColor: 'transparent',
                  borderRadius: radius.full,
                  borderWidth: 1,
                  borderColor: dt.colors.line2,
                }
              : { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1.5, borderColor: colors.text },
            pressed && { opacity: 0.7 },
          ]}
        >
          <LogOut size={18} color={diffuse ? dt.colors.error : brand.error} strokeWidth={diffuse ? 1.6 : 2} />
          <Text
            style={[
              styles.signOutText,
              diffuse
                ? { color: dt.colors.error, fontFamily: diffuseFont.mono, letterSpacing: 1.4, textTransform: 'uppercase', fontSize: 13 }
                : { color: brand.error, fontFamily: font.bodyBold },
            ]}
          >
            {t('profile_signOut')}
          </Text>
        </Pressable>}

        <Pressable onPress={handleVersionPress} hitSlop={8}>
          <Text
            style={[
              styles.version,
              diffuse
                ? { color: dt.colors.ink4, fontFamily: diffuseFont.mono, letterSpacing: 1.4, textTransform: 'uppercase' }
                : { color: colors.textMuted },
            ]}
          >
            {Constants.expoConfig?.version ? `grandma.app v${Constants.expoConfig.version}` : t('profile_version')}
          </Text>
        </Pressable>
      </ScrollView>

      <MemoriesSheet
        behavior={memoriesBehavior}
        visible={showMemories}
        onClose={() => setShowMemories(false)}
      />
      {/* Paper band under the status bar so scrolled rows never run beneath the clock. */}
      {!diffuse && (
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: colors.bg }} />
      )}
      <FeedbackSheet visible={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <PaperAlert
        visible={signOutConfirm}
        title={t('profile_signOut')}
        message={t('profile_signOutConfirm')}
        buttons={[
          { label: t('common_cancel'), variant: 'secondary' },
          { label: t('profile_signOut'), variant: 'danger', onPress: () => { void signOut() } },
        ]}
        onRequestClose={() => setSignOutConfirm(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 40 },

  topBar: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  gearBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  menuCard: {
    marginHorizontal: 20,
    marginTop: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },

  signOutBtn: {
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  signOutText: { fontSize: 15, fontWeight: '700' },

  version: { textAlign: 'center', fontSize: 12, fontWeight: '500', marginTop: 16 },
})
