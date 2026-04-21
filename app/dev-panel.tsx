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
import { seedCycleData, seedKidsData, seedPregnancyData, wipeAllDemoData } from '../lib/devSeed'
import { useModeStore } from '../store/useModeStore'
import { useJourneyStore } from '../store/useJourneyStore'
import { MonoCaps, Body } from '../components/ui/Typography'
import type { JourneyMode } from '../types'

// ─── Route lists ──────────────────────────────────────────────────────────

const AUTH_FLOWS: Array<[string, string]> = [
  ['Welcome', '/(auth)/welcome'],
  ['Sign in', '/(auth)/sign-in'],
  ['Sign up', '/(auth)/sign-up'],
]

const ONBOARDING_FLOWS: Array<[string, string]> = [
  ['Journey picker', '/onboarding/journey'],
  ['Pre-pregnancy onboarding', '/onboarding/cycle'],
  ['Pregnancy onboarding', '/onboarding/pregnancy'],
  ['Kids onboarding', '/onboarding/kids'],
  ['Activities onboarding', '/onboarding/activities'],
  ['Parent name', '/onboarding/parent-name'],
  ['Due date', '/onboarding/due-date'],
  ['Baby name', '/onboarding/baby-name'],
  ['Child profile', '/onboarding/child-profile'],
  ['Transition', '/onboarding/transition'],
]

const SCREENS: Array<[string, string]> = [
  ['Paywall', '/paywall'],
  ['Daily rewards', '/daily-rewards'],
  ['Leaderboard', '/leaderboard'],
  ['Notifications', '/notifications'],
  ['Grandma talk', '/grandma-talk'],
  ['Insights', '/insights'],
  ['Scan', '/scan'],
  ['Birth plan', '/birth-plan'],
  ['Airtag setup', '/airtag-setup'],
  ['Invite caregiver', '/invite-caregiver'],
  ['Manage caregivers', '/manage-caregivers'],
  ['Connections', '/connections'],
  ['Child picker', '/child-picker'],
]

export default function DevPanel() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const mode = useModeStore((s) => s.mode)
  const setMode = useModeStore((s) => s.setMode)
  const clearJourney = useJourneyStore((s) => s.clearAll)

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
            queryClient.clear()
            await supabase.auth.signOut()
            router.replace('/' as Parameters<typeof router.replace>[0])
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

        {/* Seeds */}
        <Section title="SEED DATA">
          <ActionRow label="Seed cycle data"     sub="6 cycles, ~200 logs"       onPress={handleSeedCycle}     busy={busy} />
          <ActionRow label="Seed kids data"      sub="1 child, 30d logs"         onPress={handleSeedKids}      busy={busy} />
          <ActionRow label="Seed pregnancy data" sub="60d of logs"               onPress={handleSeedPregnancy} busy={busy} />
          <ActionRow label="Wipe all demo data"  sub="Destructive"               onPress={handleWipeAll}       busy={busy} destructive />
        </Section>

        {/* Auth flows */}
        <Section title="AUTH FLOWS">
          {AUTH_FLOWS.map(([label, route]) => (
            <ActionRow
              key={route}
              label={label}
              onPress={() => router.push(route as any)}
              busy={busy}
            />
          ))}
        </Section>

        {/* Sign out */}
        <Section title="SIGN OUT">
          <ActionRow label="Sign out" sub="Clears session + cache" onPress={handleSignOut} busy={busy} destructive />
        </Section>

        {/* Onboarding flows */}
        <Section title="ONBOARDING FLOWS">
          {ONBOARDING_FLOWS.map(([label, route]) => (
            <ActionRow
              key={route}
              label={label}
              onPress={() => router.push(route as any)}
              busy={busy}
            />
          ))}
          <ActionRow label="Reset onboarding state" sub="Clears Zustand + AsyncStorage" onPress={handleResetOnboarding} busy={busy} />
        </Section>

        {/* Screens */}
        <Section title="SCREENS">
          {SCREENS.map(([label, route]) => (
            <ActionRow
              key={route}
              label={label}
              onPress={() => router.push(route as any)}
              busy={busy}
            />
          ))}
        </Section>

        {/* Cache */}
        <Section title="CACHE">
          <ActionRow label="Clear React Query cache" onPress={handleClearQueryCache} busy={busy} />
          <ActionRow label="Clear AsyncStorage"      onPress={handleClearAsyncStorage} busy={busy} destructive />
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
