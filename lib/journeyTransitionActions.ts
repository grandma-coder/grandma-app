/**
 * Journey transitions — the side effects (Supabase, stores, alerts, routing).
 * Pure rules live in lib/journeyTransitions.ts.
 *
 * Ending a journey = its `behaviors` row is marked `active = false` (the row and every
 * log stay — nothing is deleted), the journey is unenrolled on this device
 * (useBehaviorStore.unenroll, the same removal the journey list uses), and its
 * on-device alerts are cancelled. Boot ignores inactive rows, so an ended journey
 * doesn't come back on a fresh install; onboarding the journey again upserts it
 * back to active.
 */

import { router } from 'expo-router'
import { supabase } from './supabase'
import { queryClient } from './queryClient'
import { createChild, deleteCreatedChild } from './createChild'
import { cancelJourneyAlerts } from './reminderNotifications'
import { dueDateFromLmp } from './pregnancyData'
import { toDateStr } from './cycleLogic'
import { lmpFromPeriodStarts } from './journeyTransitions'
import { useBehaviorStore, PRE_PREG_DB_TYPE, type Behavior } from '../store/useBehaviorStore'
import { useModeStore } from '../store/useModeStore'
import { useChildStore } from '../store/useChildStore'
import { useOnboardingStore } from '../store/useOnboardingStore'
import { useCycleOnboardingStore } from '../store/useCycleOnboardingStore'
import { usePregnancyOnboardingStore } from '../store/usePregnancyOnboardingStore'
import { useJourneyTransitionStore } from '../store/useJourneyTransitionStore'
import type { ChildWithRole } from '../types'

function dbType(b: Behavior): string {
  return b === 'pre-pregnancy' ? PRE_PREG_DB_TYPE : b
}

async function requireSession() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  return session
}

/** Server half of ending a journey: keep the row, mark it inactive. Throws on failure. */
async function markJourneyInactive(userId: string, behavior: Behavior): Promise<void> {
  const { error } = await supabase
    .from('behaviors')
    .update({ active: false })
    .eq('user_id', userId)
    .eq('type', dbType(behavior))
  if (error) throw error
}

/** Device half of ending a journey: unenroll, keep mode/switcher in step, cancel its alerts. */
function endJourneyLocally(behavior: Behavior): void {
  const beh = useBehaviorStore.getState()
  beh.unenroll(behavior)
  const next = useBehaviorStore.getState().currentBehavior
  if (useModeStore.getState().mode === behavior && next) useModeStore.getState().setModeUnsafe(next)
  void cancelJourneyAlerts(behavior)
}

/** End a journey (logs kept). Throws — and changes nothing locally — if the server write fails. */
export async function endJourney(behavior: Behavior): Promise<void> {
  const session = await requireSession()
  await markJourneyInactive(session.user.id, behavior)
  endJourneyLocally(behavior)
}

// ─── Flow 1: baby arrived (pregnancy → kids) ────────────────────────────────

export interface BabyArrivedInput {
  /** YYYY-MM-DD, already validated against birthDateBounds. */
  birthDate: string
  /** Already resolved (resolveBabyName) — never empty. */
  name: string
  sex: 'male' | 'female' | 'other' | ''
}

/**
 * Server phase: create the child, make Kids an active journey, end Pregnancy. If any step fails
 * the earlier ones are undone and this throws with nothing changed (server or device).
 *
 * Resolves to `commit` — the device phase (can't fail): stores flip to Kids with the baby as the
 * active child, pregnancy alerts are cancelled, Home opens on Kids with a short celebration. The
 * caller runs it once its sheet has closed (afterSheets), so the pregnancy screen that hosts the
 * sheet doesn't unmount under a presented Modal.
 */
export async function saveBabyArrived(input: BabyArrivedInput): Promise<() => ChildWithRole> {
  const session = await requireSession()
  const userId = session.user.id

  const { data: rows, error: readErr } = await supabase
    .from('behaviors')
    .select('type, active')
    .eq('user_id', userId)
  if (readErr) throw readErr
  const kidsRow = (rows ?? []).find((r: { type: string }) => r.type === 'kids') as { active: boolean | null } | undefined
  const kidsNeedsWrite = !kidsRow || kidsRow.active === false

  // Same write path as Profile → Kids → Add child (child + parent caregiver link, rolled back together).
  const child = await createChild(session, { name: input.name, birthDate: input.birthDate, sex: input.sex || null })

  try {
    if (kidsNeedsWrite) {
      const { error } = await supabase
        .from('behaviors')
        .upsert({ user_id: userId, type: 'kids', active: true }, { onConflict: 'user_id,type' })
      if (error) throw error
    }
    await markJourneyInactive(userId, 'pregnancy')
  } catch (e) {
    // Undo in reverse so a retry starts from the same server state.
    if (kidsNeedsWrite) {
      if (!kidsRow) await supabase.from('behaviors').delete().eq('user_id', userId).eq('type', 'kids')
      else await supabase.from('behaviors').update({ active: false }).eq('user_id', userId).eq('type', 'kids')
    }
    await deleteCreatedChild(child.id)
    throw e
  }

  return () => commitBabyArrived(child)
}

function commitBabyArrived(child: ChildWithRole): ChildWithRole {
  const kids = useChildStore.getState()
  kids.setChildren([...kids.children.filter((c) => c.id !== child.id), child])
  useChildStore.getState().setActiveChild(child)

  const beh = useBehaviorStore.getState()
  beh.enroll('kids')
  beh.switchTo('kids')
  useModeStore.getState().setModeUnsafe('kids')
  endJourneyLocally('pregnancy')

  void queryClient.invalidateQueries()

  useJourneyTransitionStore.getState().setCelebrateBaby({ name: child.name })
  router.navigate('/(tabs)')
  return child
}

// ─── Flow 2: positive test (cycle → pregnancy) ──────────────────────────────

/** Latest logged period start on or before the test day — the LMP to prefill. */
async function fetchLmpForTest(userId: string, testDate: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('cycle_logs')
    .select('date')
    .eq('user_id', userId)
    .eq('type', 'period_start')
    .lte('date', testDate)
    .order('date', { ascending: false })
    .limit(5)
  if (error) return null
  return lmpFromPeriodStarts((data ?? []).map((r: { date: string }) => r.date), testDate)
}

/**
 * Start the pregnancy onboarding from a positive test. The LMP goes through the same store the
 * onboarding's due-date step already reads (useCycleOnboardingStore.lastPeriodDate → LMP + 280).
 * After the onboarding finishes, the host asks whether to keep cycle tracking.
 */
export async function startPregnancyFromTest(testDate: string): Promise<void> {
  let lmp: string | null = null
  try {
    const session = await requireSession()
    lmp = await fetchLmpForTest(session.user.id, testDate)
  } catch {
    lmp = null
  }
  // A period start whose due date already passed can't be this pregnancy's LMP.
  const due = lmp ? dueDateFromLmp(lmp) : ''
  const usable = !!due && due >= toDateStr(new Date())

  usePregnancyOnboardingStore.getState().clearAll()
  useCycleOnboardingStore.getState().setLastPeriodDate(usable ? lmp : null)
  useOnboardingStore.getState().buildQueue(['pregnancy'])
  useJourneyTransitionStore.getState().setAskKeepCycle(true)
  router.push('/onboarding/pregnancy')
}
