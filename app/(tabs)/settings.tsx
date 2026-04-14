/**
 * E2 — Profile Tab Screen
 *
 * User header + section cards navigating to sub-screens.
 * Sign out at bottom.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, Pressable, ScrollView, Alert, StyleSheet } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import * as Haptics from 'expo-haptics'
import {
  User,
  Heart,
  Users,
  Image,
  ClipboardList,
  Bell,
  Settings,
  Shield,
  CreditCard,
  Lock,
  ChevronRight,
  LogOut,
  Moon,
  Baby,
  Sparkles,
  Trophy,
  Phone,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { useModeStore } from '../../store/useModeStore'
import { useBehaviorStore } from '../../store/useBehaviorStore'
import { useChildStore } from '../../store/useChildStore'
import { supabase } from '../../lib/supabase'
import { MyJourneys } from '../../components/profile/MyJourneys'
import { useDevPanel } from '../../context/DevPanelContext'
import { useTranslation } from '../../lib/i18n'

// ─── Section config ────────────────────────────────────────────────────────

interface SectionItem {
  id: string
  label: string
  icon: typeof User
  color: string
  route?: string
  onPress?: () => void
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const mode = useModeStore((s) => s.mode)
  const behaviors = useBehaviorStore((s) => s.enrolledBehaviors)
  const children = useChildStore((s) => s.children)

  const { t } = useTranslation()
  const [userName, setUserName] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // Dev panel 5-tap trigger
  const { openDevPanel } = useDevPanel()
  const tapCount = useRef(0)
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleBadgePress() {
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', session.user.id)
      .single()

    if (profile?.name) setUserName(profile.name)
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

  const behaviorLabel =
    mode === 'pre-pregnancy' ? t('mode_cycleTracking')
    : mode === 'pregnancy' ? t('mode_pregnancy')
    : t('mode_kids')

  const behaviorColor =
    mode === 'pre-pregnancy' ? brand.prePregnancy
    : mode === 'pregnancy' ? brand.pregnancy
    : brand.kids

  // Build sections
  const sections: SectionItem[][] = [
    // Personal
    [
      { id: 'personal', label: t('profile_myProfile'), icon: User, color: colors.primary, route: '/profile/personal' },
      { id: 'behavior', label: `${behaviorLabel} ${t('profile_title')}`, icon: mode === 'pre-pregnancy' ? Moon : mode === 'pregnancy' ? Baby : Sparkles, color: behaviorColor, route: mode === 'kids' ? '/profile/kids' : '/profile/personal' },
    ],
    // Care & Family
    [
      { id: 'care-circle', label: t('profile_careCircle'), icon: Users, color: brand.secondary, route: '/profile/care-circle' },
      { id: 'emergency', label: t('profile_emergencyInsurance'), icon: Phone, color: '#FF6B35', route: '/profile/emergency-insurance' },
      { id: 'badges', label: t('profile_badgeWallet'), icon: Trophy, color: '#FFD700', route: '/profile/badges' },
      ...(mode === 'kids' && children.length > 0 ? [
        { id: 'memories', label: t('profile_memories'), icon: Image, color: brand.accent, route: '/profile/memories' },
        { id: 'health-history', label: t('profile_healthHistory'), icon: ClipboardList, color: brand.phase.ovulation, route: '/profile/health-history' },
      ] : []),
    ],
    // App settings
    [
      { id: 'notifications', label: t('profile_notifications'), icon: Bell, color: brand.accent, route: '/profile/notifications' },
      { id: 'settings', label: t('profile_unitsDisplay'), icon: Settings, color: colors.textSecondary, route: '/profile/settings' },
    ],
    // Account
    [
      { id: 'subscription', label: t('profile_subscription'), icon: CreditCard, color: brand.phase.ovulation, route: '/paywall' },
      { id: 'account', label: t('profile_accountSecurity'), icon: Lock, color: brand.error, route: '/profile/account' },
      { id: 'privacy', label: t('profile_dataPrivacy'), icon: Shield, color: brand.success, route: '/profile/privacy' },
    ],
  ]

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. User Header */}
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: colors.primaryTint }]}>
            <User size={32} color={colors.primary} strokeWidth={1.5} />
          </View>
          <Text style={[styles.userName, { color: colors.text }]}>
            {userName ?? t('home_greeting')}
          </Text>
          {userEmail && (
            <Text style={[styles.userEmail, { color: colors.textMuted }]}>
              {userEmail}
            </Text>
          )}
          <Pressable
            onPress={handleBadgePress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.badgeRow}
          >
            {behaviors.length > 0
              ? behaviors.map((b) => {
                  const c = b === 'pre-pregnancy' ? brand.prePregnancy : b === 'pregnancy' ? brand.pregnancy : brand.kids
                  return (
                    <View key={b} style={[styles.badge, { backgroundColor: c + '20', borderColor: c + '40', borderWidth: 1, borderRadius: radius.full }]}>
                      <Text style={[styles.badgeText, { color: c }]}>
                        {b === 'pre-pregnancy' ? t('mode_cycleTracking') : b === 'pregnancy' ? t('mode_pregnancy') : t('mode_kids')}
                      </Text>
                    </View>
                  )
                })
              : (
                <View style={[styles.badge, { backgroundColor: behaviorColor + '20', borderColor: behaviorColor + '40', borderWidth: 1, borderRadius: radius.full }]}>
                  <Text style={[styles.badgeText, { color: behaviorColor }]}>{behaviorLabel}</Text>
                </View>
              )
            }
          </Pressable>
        </View>

        {/* My Journeys */}
        <MyJourneys />

        {/* 2. Section Cards */}
        {sections.map((group, gi) => (
          <View
            key={gi}
            style={[styles.sectionGroup, { backgroundColor: colors.surface, borderRadius: radius.xl }]}
          >
            {group.map((item, ii) => {
              const Icon = item.icon
              return (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    if (item.onPress) item.onPress()
                    else if (item.route) router.push(item.route as any)
                  }}
                  style={({ pressed }) => [
                    styles.sectionItem,
                    ii < group.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <View style={[styles.sectionIcon, { backgroundColor: item.color + '15' }]}>
                    <Icon size={18} color={item.color} strokeWidth={2} />
                  </View>
                  <Text style={[styles.sectionLabel, { color: colors.text }]}>{item.label}</Text>
                  <ChevronRight size={18} color={colors.textMuted} />
                </Pressable>
              )
            })}
          </View>
        ))}

        {/* 3. Sign Out */}
        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [
            styles.signOutBtn,
            { backgroundColor: colors.surface, borderRadius: radius.xl },
            pressed && { opacity: 0.7 },
          ]}
        >
          <LogOut size={18} color={brand.error} strokeWidth={2} />
          <Text style={[styles.signOutText, { color: brand.error }]}>{t('profile_signOut')}</Text>
        </Pressable>

        <Text style={[styles.version, { color: colors.textMuted }]}>
          {t('profile_version')}
        </Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },

  // Header
  header: { alignItems: 'center', marginBottom: 24, gap: 6 },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  userName: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  userEmail: { fontSize: 13, fontWeight: '500' },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  badge: { paddingVertical: 4, paddingHorizontal: 12 },
  badgeText: { fontSize: 12, fontWeight: '700' },

  // Sections
  sectionGroup: {
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  sectionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { flex: 1, fontSize: 15, fontWeight: '600' },

  // Sign out
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  signOutText: { fontSize: 15, fontWeight: '700' },
  version: { textAlign: 'center', fontSize: 12, fontWeight: '500', marginTop: 16 },
})
