/**
 * Dev Panel — hidden debug tools. Opened via 5-tap on the profile name.
 * Everything here is __DEV__-only behaviour; the route itself is compiled
 * in every build but unreachable without the gesture.
 */

import { useState, useEffect } from 'react'
import { View, ScrollView, Pressable, Alert, StyleSheet, ActivityIndicator } from 'react-native'
import { router, Stack } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../constants/theme'
import { supabase } from '../lib/supabase'
import { signOut } from '../lib/signOut'
import { seedCycleData, seedKidsData, seedPregnancyData, seedExamData, seedAllData, wipeAllDemoData, repairBehaviorsFromData, backfillCaregiverLinks } from '../lib/devSeed'
import { useModeStore } from '../store/useModeStore'
import { useThemeStore } from '../store/useThemeStore'
import { useBehaviorStore, type Behavior } from '../store/useBehaviorStore'
import { useChildStore } from '../store/useChildStore'
import { useJourneyStore } from '../store/useJourneyStore'
import { useDevStore } from '../store/useDevStore'
import { pillars } from '../lib/pillars'
import { pregnancyPillars } from '../lib/pregnancyPillars'
import { prePregPillars } from '../lib/prePregPillars'
import { MonoCaps, Body } from '../components/ui/Typography'
import type { JourneyMode } from '../types'

// ─── Route lists ──────────────────────────────────────────────────────────

const AUTH_FLOWS: Array<[string, string]> = [
  ['Welcome', '/(auth)/welcome'],
  ['Sign in', '/(auth)/sign-in'],
  ['Sign up', '/(auth)/sign-up'],
  ['Forgot password', '/(auth)/forgot-password'],
]

const ONBOARDING_FLOWS: Array<[string, string]> = [
  ['Journey picker', '/onboarding/journey'],
  ['Journey picker (add mode)', '/onboarding/journey?addMode=true'],
  ['Pre-pregnancy onboarding', '/onboarding/cycle'],
  ['Pregnancy onboarding', '/onboarding/pregnancy'],
  ['Kids onboarding', '/onboarding/kids'],
  ['Transition', '/onboarding/transition'],
]

const COMMON_SCREENS: Array<[string, string]> = [
  ['Paywall', '/paywall'],
  ['Daily rewards', '/daily-rewards'],
  ['Leaderboard', '/leaderboard'],
  ['Notifications', '/notifications'],
  ['Grandma talk', '/grandma-talk'],
  ['Insights', '/insights'],
  ['Scan', '/scan'],
]

const PROFILE_SCREENS: Array<[string, string]> = [
  ['Profile · Account', '/profile/account'],
  ['Profile · Personal', '/profile/personal'],
  ['Profile · Kids', '/profile/kids'],
  ['Profile · Health history', '/profile/health-history'],
  ['Profile · Memories', '/profile/memories'],
  ['Profile · Care circle', '/profile/care-circle'],
  ['Profile · Badges', '/profile/badges'],
  ['Profile · Emergency insurance', '/profile/emergency-insurance'],
  ['Profile · Notifications', '/profile/notifications'],
  ['Profile · Privacy', '/profile/privacy'],
  ['Profile · Pregnancy', '/profile/pregnancy'],
  ['Profile · Settings', '/profile/settings'],
]

// ⚠ LEGACY — both still ship the old neon-yellow design. Listed so you
// can find them, but they're on the design-refresh backlog.
const CAREGIVER_SCREENS: Array<[string, string]> = [
  ['Invite caregiver  ⚠ legacy design', '/invite-caregiver'],
  ['Manage caregivers  ⚠ legacy design', '/manage-caregivers'],
]

// ⚠ The /connections shell is current design but the Garage tab inside
// it still renders GarageScreen.tsx (Pastel neon palette). On backlog.
const COMMUNITY_SCREENS: Array<[string, string]> = [
  ['Connections (Channels + Garage)', '/connections'],
  ['Channels list', '/channels'],
  ['Channel · create', '/channel/create'],
  ['Garage · profile  ⚠ legacy design', '/garage/profile'],
  ['Garage · create  ⚠ legacy design', '/garage/create'],
  ['Garage · share  ⚠ legacy design', '/garage/share'],
]

const PREGNANCY_ONLY: Array<[string, string]> = [
  ['Birth plan', '/birth-plan'],
]

// Pushing `/(tabs)/*` directly via router.push escapes the tab navigator
// and renders the screen as a generic stack page (no tab bar, broken
// header). Use the tab bar instead. We keep just a "go home" jump that
// lands you in the tabs context — then switch tabs from there.
const MODE_AWARE_TABS: Array<[string, string]> = [
  ['Home (in tabs context)', '/(tabs)'],
]

const PILLARS_BY_MODE: Record<JourneyMode, Array<{ id: string; name: string }>> = {
  'pre-pregnancy': prePregPillars.map((p) => ({ id: p.id, name: p.name })),
  pregnancy: pregnancyPillars.map((p) => ({ id: p.id, name: p.name })),
  kids: pillars.map((p) => ({ id: p.id, name: p.name })),
}

export default function DevPanel() {
  // Production guard — the dev panel must never be reachable in a release
  // build, even if a curious tester finds the hidden gesture. Local dev
  // (expo start) keeps full access because __DEV__ is true there.
  if (!__DEV__) {
    router.replace('/(tabs)')
    return null
  }

  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const mode = useModeStore((s) => s.mode)
  const setMode = useModeStore((s) => s.setModeUnsafe)
  const variant = useThemeStore((s) => s.variant)
  const setVariant = useThemeStore((s) => s.setVariant)
  const enrolled = useBehaviorStore((s) => s.enrolledBehaviors)
  const enroll = useBehaviorStore((s) => s.enroll)
  const unenroll = useBehaviorStore((s) => s.unenroll)
  const children = useChildStore((s) => s.children)
  const activeChild = useChildStore((s) => s.activeChild)
  const setActiveChild = useChildStore((s) => s.setActiveChild)
  const clearJourney = useJourneyStore((s) => s.clearAll)
  const enterDevMode = useDevStore((s) => s.enter)

  const [userInfo, setUserInfo] = useState<{ email: string; id: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setUserInfo({
          email: data.session.user.email ?? '(no email)',
          id: data.session.user.id,
        })
      }
    })
  }, [])

  async function run(label: string, fn: () => Promise<string | void>) {
    setBusy(label)
    try {
      const result = await fn()
      Alert.alert(label, result ?? 'Done')
    } catch (e: unknown) {
      console.error(`[dev-panel] ${label} failed`, e)
      const message =
        e instanceof Error
          ? e.message
          : typeof e === 'object' && e !== null && 'message' in e
          ? String((e as { message: unknown }).message)
          : String(e)
      Alert.alert(`${label} failed`, message)
    } finally {
      setBusy(null)
    }
  }

  async function handleSeedCycle() {
    await run('Seed cycle data', async () => {
      const { inserted } = await seedCycleData()
      await queryClient.invalidateQueries({ queryKey: ['cycleLogs'] })
      return `Inserted ${inserted} cycle logs`
    })
  }

  async function handleSeedKids() {
    await run('Seed kids data', async () => {
      const { inserted } = await seedKidsData()
      await queryClient.invalidateQueries({ queryKey: ['childLogs'] })
      return `Inserted ${inserted} child logs`
    })
  }

  async function handleSeedPregnancy() {
    await run('Seed pregnancy data', async () => {
      const { inserted } = await seedPregnancyData()
      await queryClient.invalidateQueries({ queryKey: ['pregnancyLogs'] })
      return `Inserted ${inserted} pregnancy logs`
    })
  }

  async function handleSeedExams() {
    await run('Seed exam data', async () => {
      const { inserted } = await seedExamData()
      await queryClient.invalidateQueries({ queryKey: ['exams'] })
      return `Inserted ${inserted} exams`
    })
  }

  async function handleSeedAll() {
    await run('Seed everything', async () => {
      const r = await seedAllData()
      await queryClient.invalidateQueries()
      return `cycle ${r.cycle} · preg ${r.pregnancy} · kids ${r.kids} (${r.kidsCount} child${r.kidsCount === 1 ? '' : 'ren'}) · exams ${r.exams}`
    })
  }

  async function handleRepairBehaviors() {
    await run('Repair behaviors', async () => {
      const { enrolled } = await repairBehaviorsFromData()
      return enrolled.length > 0
        ? `Enrolled: ${enrolled.join(', ')}`
        : 'No data found to infer behaviors'
    })
  }

  async function handleBackfillCaregivers() {
    await run('Backfill caregiver links', async () => {
      const { scanned, inserted, alreadyOk } = await backfillCaregiverLinks()
      await queryClient.invalidateQueries()
      if (scanned === 0) return 'No children found for this account.'
      if (inserted === 0) return `All ${scanned} children already linked. Nothing to do.`
      return `Inserted ${inserted} caregiver row${inserted === 1 ? '' : 's'} (${alreadyOk} already OK). Reload to refresh the boot path.`
    })
  }

  async function handleWipeAll() {
    Alert.alert(
      'Wipe all demo data?',
      'Deletes all cycle, pregnancy, and child logs for this account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Wipe',
          style: 'destructive',
          onPress: () => run('Wipe all', async () => {
            await wipeAllDemoData()
            queryClient.clear()
            return 'All demo data wiped'
          }),
        },
      ]
    )
  }

  async function handleResetOnboarding() {
    clearJourney()
    await AsyncStorage.multiRemove([
      'onboarding-storage',
      'cycle-onboarding-storage',
      'pregnancy-onboarding-storage',
      'kids-onboarding-storage',
      'journey-storage',
    ])
    Alert.alert('Reset', 'Onboarding state cleared. Restart the app to re-run onboarding.')
  }

  async function handleSignOut() {
    Alert.alert(
      'Sign out?',
      'You will need to sign in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            await signOut()
          },
        },
      ]
    )
  }

  function handleClearQueryCache() {
    queryClient.clear()
    Alert.alert('Cache', 'React Query cache cleared.')
  }

  async function handleClearAsyncStorage() {
    await AsyncStorage.clear()
    Alert.alert('Cache', 'AsyncStorage cleared. Restart the app.')
  }

  function navTo(route: string) {
    enterDevMode()
    router.push(route as any)
  }

  const modePillars = PILLARS_BY_MODE[mode] ?? []

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Dev Panel',
          headerStyle: { backgroundColor: colors.bg },
          headerTitleStyle: { color: colors.text },
          headerTintColor: colors.text,
        }}
      />
      <ScrollView
        style={[styles.root, { backgroundColor: colors.bg }]}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* User */}
        <Section title="USER">
          {userInfo ? (
            <>
              <KVRow label="Email" value={userInfo.email} />
              <KVRow label="User ID" value={userInfo.id} />
            </>
          ) : (
            <Body size={13} color={colors.textMuted}>Not signed in</Body>
          )}
        </Section>

        {/* Mode */}
        <Section title="MODE">
          <Body size={12} color={colors.textMuted}>Current: {mode}</Body>
          <View style={styles.row}>
            <ModeButton current={mode} target="pre-pregnancy" label="Pre-Preg" onPress={setMode} />
            <ModeButton current={mode} target="pregnancy"     label="Preg"     onPress={setMode} />
            <ModeButton current={mode} target="kids"          label="Kids"     onPress={setMode} />
          </View>
        </Section>

        {/* Design variant (v3 Diffuse migration toggle) */}
        <Section title="DESIGN VARIANT">
          <Body size={11} color={colors.textMuted}>
            Switch between the current cream-paper system and the v3 "Diffuse" language. Default stays current; screens opt in during migration.
          </Body>
          <View style={styles.row}>
            {(['current', 'diffuse'] as const).map((v) => {
              const active = variant === v
              return (
                <Pressable
                  key={v}
                  onPress={() => setVariant(v)}
                  style={({ pressed }) => [
                    styles.actionRow,
                    { flex: 1, borderColor: active ? colors.primary : colors.borderLight, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Body size={14} color={active ? colors.primary : colors.text} style={{ fontWeight: '600', flex: 1 }}>
                    {v === 'current' ? 'Current' : 'Diffuse (v3)'}
                  </Body>
                  {active && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                </Pressable>
              )
            })}
          </View>
        </Section>

        {/* Enrollment */}
        <Section title="ENROLLMENT">
          <Body size={11} color={colors.textMuted}>
            Toggle which behaviors are unlocked. Unenrolled modes show locked in the ModeSwitcher.
          </Body>
          {(['pre-pregnancy', 'pregnancy', 'kids'] as Behavior[]).map((b) => {
            const isEnrolled = enrolled.includes(b)
            return (
              <Pressable
                key={b}
                onPress={() => (isEnrolled ? unenroll(b) : enroll(b))}
                style={({ pressed }) => [
                  styles.actionRow,
                  { borderColor: colors.borderLight, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Body size={14} color={colors.text} style={{ fontWeight: '600', flex: 1 }}>{b}</Body>
                <Body size={12} color={isEnrolled ? colors.primary : colors.textMuted}>
                  {isEnrolled ? '✓ enrolled' : 'locked'}
                </Body>
              </Pressable>
            )
          })}
        </Section>

        {/* Active child */}
        <Section title="ACTIVE CHILD">
          {children.length === 0 ? (
            <Body size={12} color={colors.textMuted}>No children loaded.</Body>
          ) : (
            <>
              <Body size={11} color={colors.textMuted}>
                {activeChild ? `Active: ${activeChild.name}` : 'No active child'}
              </Body>
              {children.map((c) => {
                const isActive = activeChild?.id === c.id
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setActiveChild(c)}
                    style={({ pressed }) => [
                      styles.actionRow,
                      { borderColor: colors.borderLight, opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Body size={14} color={colors.text} style={{ fontWeight: '600', flex: 1 }}>
                      {c.name}
                    </Body>
                    <Body size={11} color={colors.textMuted}>
                      {c.birthDate ? `dob ${c.birthDate}` : ''}
                    </Body>
                    {isActive && (
                      <Ionicons name="checkmark" size={16} color={colors.primary} style={{ marginLeft: 8 }} />
                    )}
                  </Pressable>
                )
              })}
            </>
          )}
        </Section>

        {/* Seeds */}
        <Section title="SEED DATA">
          <ActionRow label="Seed everything"     sub="All behaviors + every child, through today" onPress={handleSeedAll}      busy={busy} />
          <ActionRow label="Seed cycle data"     sub="6 cycles up to today, ~200 logs"  onPress={handleSeedCycle}     busy={busy} />
          <ActionRow label="Seed kids data"      sub="90d logs through today, all children"  onPress={handleSeedKids}      busy={busy} />
          <ActionRow label="Seed pregnancy data" sub="90d of logs through today"        onPress={handleSeedPregnancy} busy={busy} />
          <ActionRow label="Seed exam data"      sub="14 exams across all behaviors" onPress={handleSeedExams}     busy={busy} />
          <ActionRow label="Repair behaviors from data" sub="Re-enroll based on children / logs" onPress={handleRepairBehaviors} busy={busy} />
          <ActionRow label="Backfill caregiver links" sub="Link your account to your own children in child_caregivers (fixes legacy accounts)" onPress={handleBackfillCaregivers} busy={busy} />
          <ActionRow label="Wipe all demo data"  sub="Destructive"               onPress={handleWipeAll}       busy={busy} destructive />
        </Section>

        {/* Auth flows */}
        <Section title="AUTH FLOWS">
          {AUTH_FLOWS.map(([label, route]) => (
            <ActionRow key={route} label={label} onPress={() => navTo(route)} busy={busy} />
          ))}
        </Section>

        {/* Onboarding flows */}
        <Section title="ONBOARDING FLOWS">
          {ONBOARDING_FLOWS.map(([label, route]) => (
            <ActionRow key={route} label={label} onPress={() => navTo(route)} busy={busy} />
          ))}
          <ActionRow label="Reset onboarding state" sub="Clears Zustand + AsyncStorage" onPress={handleResetOnboarding} busy={busy} />
        </Section>

        {/* Mode-aware tabs */}
        <Section title={`TABS · CURRENT MODE: ${mode.toUpperCase()}`}>
          <Body size={11} color={colors.textMuted}>
            Jumps into the tabs navigator. Then use the tab bar to switch between
            Home / Agenda / Vault / Settings — these adapt to the current mode.
            (The center burst opens the Grandma menu; the old Library chat screen
            was removed in favor of grandma-talk.)
          </Body>
          {MODE_AWARE_TABS.map(([label, route]) => (
            <ActionRow key={route} label={label} onPress={() => navTo(route)} busy={busy} />
          ))}
        </Section>

        {/* Pillars */}
        <Section title={`PILLARS · ${mode.toUpperCase()} (${modePillars.length})`}>
          <Body size={11} color={colors.textMuted}>
            ⚠ /pillar/[id] still uses the legacy cosmic palette — on the design-refresh backlog.
          </Body>
          {modePillars.length === 0 ? (
            <Body size={12} color={colors.textMuted}>No pillars for this mode.</Body>
          ) : (
            modePillars.map((p) => (
              <ActionRow
                key={p.id}
                label={p.name}
                sub={p.id}
                onPress={() => navTo(`/pillar/${p.id}`)}
                busy={busy}
              />
            ))
          )}
        </Section>

        {/* Common screens */}
        <Section title="COMMON SCREENS">
          {COMMON_SCREENS.map(([label, route]) => (
            <ActionRow key={route} label={label} onPress={() => navTo(route)} busy={busy} />
          ))}
        </Section>

        {/* Profile screens */}
        <Section title="PROFILE SCREENS">
          {PROFILE_SCREENS.map(([label, route]) => (
            <ActionRow key={route} label={label} onPress={() => navTo(route)} busy={busy} />
          ))}
        </Section>

        {/* Caregiver screens */}
        <Section title="CAREGIVER SCREENS">
          <Body size={11} color={colors.textMuted}>
            Both screens still use the legacy neon design — pending refresh.
          </Body>
          {CAREGIVER_SCREENS.map(([label, route]) => (
            <ActionRow key={route} label={label} onPress={() => navTo(route)} busy={busy} />
          ))}
        </Section>

        {/* Community / Garage */}
        <Section title="COMMUNITY · CHANNELS · GARAGE">
          {COMMUNITY_SCREENS.map(([label, route]) => (
            <ActionRow key={route} label={label} onPress={() => navTo(route)} busy={busy} />
          ))}
        </Section>

        {/* Mode-specific */}
        <Section title="PREGNANCY-ONLY">
          {PREGNANCY_ONLY.map(([label, route]) => (
            <ActionRow key={route} label={label} onPress={() => navTo(route)} busy={busy} />
          ))}
        </Section>

        {/* Cache */}
        <Section title="CACHE">
          <ActionRow label="Clear React Query cache" onPress={handleClearQueryCache} busy={busy} />
          <ActionRow label="Clear AsyncStorage"      onPress={handleClearAsyncStorage} busy={busy} destructive />
        </Section>

        {/* Sign out */}
        <Section title="SIGN OUT">
          <ActionRow label="Sign out" sub="Clears session + cache" onPress={handleSignOut} busy={busy} destructive />
        </Section>
      </ScrollView>
    </>
  )
}

// ─── Subcomponents ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme()
  return (
    <View style={styles.section}>
      <MonoCaps size={10} color={colors.textMuted}>{title}</MonoCaps>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  )
}

function KVRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme()
  return (
    <View style={styles.kvRow}>
      <Body size={12} color={colors.textMuted}>{label}</Body>
      <Body size={12} color={colors.text} style={{ flex: 1, textAlign: 'right' }} numberOfLines={1}>{value}</Body>
    </View>
  )
}

interface ActionRowProps {
  label: string
  sub?: string
  onPress: () => void
  busy: string | null
  destructive?: boolean
}

function ActionRow({ label, sub, onPress, busy, destructive }: ActionRowProps) {
  const { colors } = useTheme()
  const isBusy = busy === label
  return (
    <Pressable
      onPress={onPress}
      disabled={!!busy}
      style={({ pressed }) => [
        styles.actionRow,
        { borderColor: colors.borderLight, opacity: busy && !isBusy ? 0.4 : 1 },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Body size={14} color={destructive ? '#D4593A' : colors.text} style={{ fontWeight: '600' }}>{label}</Body>
        {sub ? <Body size={11} color={colors.textMuted}>{sub}</Body> : null}
      </View>
      {isBusy
        ? <ActivityIndicator size="small" color={colors.primary} />
        : <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
    </Pressable>
  )
}

interface ModeButtonProps {
  current: JourneyMode
  target: JourneyMode
  label: string
  onPress: (m: JourneyMode) => void
}

function ModeButton({ current, target, label, onPress }: ModeButtonProps) {
  const { colors } = useTheme()
  const active = current === target
  return (
    <Pressable
      onPress={() => onPress(target)}
      style={[
        styles.modeBtn,
        {
          backgroundColor: active ? colors.primary : colors.surface,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
    >
      <Body size={12} color={active ? '#FFFFFF' : colors.text} style={{ fontWeight: '600' }}>{label}</Body>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20, gap: 20 },
  section: { gap: 8 },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  row: { flexDirection: 'row', gap: 8 },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  modeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
})
