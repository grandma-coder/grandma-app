/**
 * Profile tab — cream-paper redesign (Wave 1).
 *
 * Hero (sticker accents + initial avatar + mode subtitle) →
 * BadgesStrip → MyJourneyPillGrid → stat rows → Sign out.
 *
 * Source: docs/Claude design studio/src/more-screens.jsx:5-86
 */

import { useCallback, useRef, useState } from 'react'
import {
  View,
  ScrollView,
  Pressable,
  Text,
  Alert,
  StyleSheet,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Settings as SettingsIcon, LogOut } from 'lucide-react-native'
import { NotificationBell } from '../../components/ui/NotificationBell'
import { useTheme, brand, getModeColor } from '../../constants/theme'
import { useModeStore } from '../../store/useModeStore'
import { useBehaviorStore } from '../../store/useBehaviorStore'
import { useChildStore } from '../../store/useChildStore'
import { useBadgeStore, BADGE_DEFS } from '../../store/useBadgeStore'
import { supabase } from '../../lib/supabase'
import { useTranslation } from '../../lib/i18n'
import { useDevPanel } from '../../context/DevPanelContext'
import { getSubtitleFor } from '../../lib/profileStatus'
import { ProfileHero, type KidPill } from '../../components/profile/ProfileHero'
import { BadgesStrip, type BadgeEntry } from '../../components/profile/BadgesStrip'
import { MyJourneyPillGrid } from '../../components/profile/MyJourneyPillGrid'
import { StatRow } from '../../components/ui/StatRow'
import { childColor } from '../../components/ui/ChildPills'
import { AnimatedSticker } from '../../components/ui/AnimatedSticker'

export default function ProfileScreen() {
  const { colors, radius, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()

  const mode = useModeStore((s) => s.mode)
  const currentBehavior = useBehaviorStore((s) => s.currentBehavior)
  const children = useChildStore((s) => s.children)
  const setActiveChild = useChildStore((s) => s.setActiveChild)
  const earnedBadges = useBadgeStore((s) => s.earnedBadges)

  const [userName, setUserName] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null)
  const [joinedYear, setJoinedYear] = useState<number | null>(null)
  const [careCircleCount, setCareCircleCount] = useState<number>(0)

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
    }, [])
  )

  async function loadProfile() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setUserEmail(session.user.email ?? null)

    const [{ data: profile }, { count }] = await Promise.all([
      supabase
        .from('profiles')
        .select('name, photo_url, created_at')
        .eq('id', session.user.id)
        .single(),
      supabase
        .from('care_circle')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.user.id),
    ])

    if (profile?.name) setUserName(profile.name)
    setUserPhotoUrl(profile?.photo_url ?? null)
    if (profile?.created_at) setJoinedYear(new Date(profile.created_at).getFullYear())
    setCareCircleCount(count ?? 0)
  }

  async function handleSignOut() {
    Alert.alert(t('profile_signOut'), t('profile_signOutConfirm'), [
      { text: t('common_cancel'), style: 'cancel' },
      {
        text: t('profile_signOut'),
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut()
          router.replace('/(auth)/welcome')
        },
      },
    ])
  }

  // ─── Derived values ───────────────────────────────────────────────────────
  const nameParts = (userName ?? '').trim().split(/\s+/).filter(Boolean)
  const firstName = nameParts[0] ?? 'Hi'
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined
  const initial = (firstName[0] ?? 'I').toUpperCase()

  const behaviorForSubtitle = currentBehavior ?? 'kids'
  const subtitle = userEmail ? getSubtitleFor(behaviorForSubtitle) : ''

  const accent = getModeColor(mode, isDark)

  // Badges: 5 most recently earned, each mapped to its real definition
  const recentBadges: BadgeEntry[] = earnedBadges
    .slice()
    .sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime())
    .slice(0, 5)
    .map((eb) => {
      const def = BADGE_DEFS.find((d) => d.id === eb.badgeId)
      return {
        badgeId: eb.badgeId,
        label: def?.name ?? eb.badgeId,
      }
    })

  const hasChildren = children.length > 0
  const hasEmergency = false // Wave 2 wires real emergency status

  const kidPills: KidPill[] = children.map((c, i) => ({
    id: c.id,
    name: c.name,
    color: childColor(i),
  }))

  function handleKidPillPress(id: string) {
    const child = children.find((c) => c.id === id)
    if (child) setActiveChild(child)
    router.push('/profile/kids')
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar — bell + settings gear (root of tab, no back) */}
        <View style={styles.topBar}>
          <NotificationBell />
          <Pressable
            onPress={() => router.push('/profile/settings')}
            style={[
              styles.gearBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            hitSlop={8}
          >
            <SettingsIcon size={16} color={colors.text} strokeWidth={2} />
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

        {/* Badges */}
        <BadgesStrip
          badges={recentBadges}
          total={earnedBadges.length}
          onSeeAll={() => router.push('/profile/badges')}
        />

        {/* Journey switcher */}
        <MyJourneyPillGrid />

        {/* Menu */}
        <View
          style={[
            styles.menuCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.lg,
            },
          ]}
        >
          <StatRow
            icon={<AnimatedSticker type="Heart" size={18} fill="#F2B2C7" />}
            label={t('profile_careCircle')}
            value={careCircleCount === 1 ? '1 person' : `${careCircleCount} people`}
            onPress={() => router.push('/profile/care-circle')}
          />
          {hasChildren && (
            <StatRow
              icon={<AnimatedSticker type="Flower" size={18} petal="#9DC3E8" center="#F5D652" />}
              label="Kids Profile"
              value={children.length === 1 ? '1 child' : `${children.length} children`}
              onPress={() => router.push('/profile/kids')}
            />
          )}
          {hasChildren && (
            <StatRow
              icon={<AnimatedSticker type="Star" size={18} fill="#F5D652" />}
              label={t('profile_memories')}
              value="—"
              onPress={() => router.push('/profile/memories')}
            />
          )}
          {hasChildren && (
            <StatRow
              icon={<AnimatedSticker type="Leaf" size={18} fill="#BDD48C" />}
              label={t('profile_healthHistory')}
              value={joinedYear ? `Since ${joinedYear}` : '—'}
              onPress={() => router.push('/profile/health-history')}
            />
          )}
          <StatRow
            icon={<AnimatedSticker type="Cross" size={18} fill="#EE7B6D" />}
            label={t('profile_emergencyInsurance')}
            value={hasEmergency ? 'Ready' : 'Not set'}
            onPress={() => router.push('/profile/emergency-insurance')}
          />
          <StatRow
            icon={<AnimatedSticker type="Drop" size={18} fill="#F5D652" />}
            label={t('profile_notifications')}
            onPress={() => router.push('/profile/notifications')}
          />
          <StatRow
            icon={<AnimatedSticker type="Moon" size={18} fill="#C8B6E8" />}
            label={t('profile_accountSecurity')}
            onPress={() => router.push('/profile/account')}
          />
          <StatRow
            icon={<AnimatedSticker type="Leaf" size={18} fill="#BDD48C" />}
            label={t('profile_dataPrivacy')}
            onPress={() => router.push('/profile/privacy')}
          />
          <StatRow
            icon={<AnimatedSticker type="Burst" size={18} fill="#C8B6E8" />}
            label={t('profile_subscription')}
            value="Upgrade"
            onPress={() => router.push('/paywall')}
            isLast
          />
        </View>

        {/* Sign out */}
        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [
            styles.signOutBtn,
            { backgroundColor: colors.surface, borderRadius: radius.lg },
            pressed && { opacity: 0.7 },
          ]}
        >
          <LogOut size={18} color={brand.error} strokeWidth={2} />
          <Text style={[styles.signOutText, { color: brand.error }]}>
            {t('profile_signOut')}
          </Text>
        </Pressable>

        <Pressable onPress={handleVersionPress} hitSlop={8}>
          <Text style={[styles.version, { color: colors.textMuted }]}>
            {t('profile_version')}
          </Text>
        </Pressable>
      </ScrollView>
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
