/**
 * Reads everything the widget snapshot needs: the stores plus small Supabase queries
 * for the enrolled journeys. Returns null when signed out.
 */
import { supabase } from '../supabase'
import { queryClient } from '../queryClient'
import { toDateStr } from '../cycleLogic'
import { computeCycleHistory } from '../cycleAnalytics'
import { buildReminderCycleConfig } from '../cycleReminders'
import { isMinor } from '../ageRules'
import { useBehaviorStore } from '../../store/useBehaviorStore'
import { useModeStore } from '../../store/useModeStore'
import { useChildStore } from '../../store/useChildStore'
import { useCycleSettingsStore } from '../../store/useCycleSettingsStore'
import { usePregnancyStore } from '../../store/usePregnancyStore'
import { useMenopauseStore } from '../../store/useMenopauseStore'
import { useJourneyStore } from '../../store/useJourneyStore'
import { useWidgetAssetStore } from '../../store/useWidgetAssetStore'
import type { HealthRecord } from '../vaccineSchedule'
import type { KidLog, SnapshotInput } from './snapshot'

const daysAgo = (now: Date, n: number) => toDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() - n, 12))

export async function collectSnapshotInput(now: Date = new Date()): Promise<SnapshotInput | null> {
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user.id
  if (!userId) return null

  const enrolled = useBehaviorStore.getState().enrolledBehaviors
  const { mode } = useModeStore.getState()
  const { children, activeChild } = useChildStore.getState()
  const profile = queryClient.getQueryData<{ dob?: string | null }>(['profile', userId])
  const today = toDateStr(now)
  const input: SnapshotInput = {
    now,
    isMinor: isMinor(profile?.dob ?? useJourneyStore.getState().parentDob, now),
    enrolled,
    activeMode: mode,
    activeChildId: activeChild?.id ?? null,
  }

  const jobs: Promise<void>[] = []

  if (enrolled.includes('pre-pregnancy')) {
    jobs.push((async () => {
      const { data, error } = await supabase
        .from('cycle_logs')
        .select('id, user_id, date, type, value, notes, created_at')
        .eq('user_id', userId)
        .gte('date', daysAgo(now, 200))
        .order('date', { ascending: true })
      if (error) throw error
      const rows = data ?? []
      const config = buildReminderCycleConfig(computeCycleHistory(rows as never), useCycleSettingsStore.getState()) ?? null
      input.cycle = { config, logs: rows.filter((r) => r.date >= daysAgo(now, 7)).map((r) => ({ date: r.date, type: r.type, value: r.value })) }
    })())
  }

  if (enrolled.includes('pregnancy')) {
    jobs.push((async () => {
      const { data, error } = await supabase
        .from('pregnancy_logs')
        .select('log_type, value, created_at')
        .eq('user_id', userId)
        .eq('log_date', today)
        .order('created_at', { ascending: true })
      if (error) throw error
      const todayLogs: Record<string, { value: string | null }> = {}
      let kicks = 0
      for (const r of data ?? []) {
        if (r.log_type === 'kick_count') kicks += Number(r.value) || 0
        else todayLogs[r.log_type] = { value: r.value } // latest row wins (water is a running total)
      }
      if (kicks) todayLogs.kick_count = { value: String(kicks) }
      const asset = useWidgetAssetStore.getState()
      input.pregnancy = { dueDate: usePregnancyStore.getState().dueDate, todayLogs, fruitPng: asset.fruitPng ?? undefined }
    })())
  }

  if (enrolled.includes('kids') && children.length > 0) {
    jobs.push((async () => {
      const ids = children.map((c) => c.id)
      const [recent, vaccines] = await Promise.all([
        supabase.from('child_logs').select('child_id, date, type, value, created_at').in('child_id', ids).gte('date', daysAgo(now, 7)),
        supabase.from('child_logs').select('id, child_id, date, type, value, notes').in('child_id', ids).eq('type', 'vaccine'),
      ])
      if (recent.error) throw recent.error
      if (vaccines.error) throw vaccines.error
      const logs: Record<string, KidLog[]> = {}
      for (const r of recent.data ?? []) (logs[r.child_id] ??= []).push(r)
      const given: Record<string, HealthRecord[]> = {}
      for (const r of vaccines.data ?? []) (given[r.child_id] ??= []).push(toHealthRecord(r))
      input.kids = {
        children: children.map((c) => ({ id: c.id, name: c.name, birthDate: c.birthDate, countryCode: c.countryCode ?? undefined })),
        logs,
        given,
      }
    })())
  }

  if (enrolled.includes('menopause')) {
    jobs.push((async () => {
      const { data, error } = await supabase
        .from('menopause_logs')
        .select('date, type, value, severity')
        .eq('user_id', userId)
        .gte('date', daysAgo(now, 60))
      if (error) throw error
      const m = useMenopauseStore.getState()
      input.menopause = { stage: m.stage, lastPeriodDate: m.lastPeriodDate, logs: data ?? [] }
    })())
  }

  await Promise.all(jobs)
  return input
}

/** Same mapping as KidsHome's health history. */
function toHealthRecord(r: { id: string; type: string; value: unknown; notes: string | null; date: string | null }): HealthRecord {
  return {
    id: r.id,
    type: r.type,
    value: typeof r.value === 'string' ? r.value : JSON.stringify(r.value ?? ''),
    notes: r.notes ?? '',
    date: String(r.date ?? '').substring(0, 10),
  }
}
