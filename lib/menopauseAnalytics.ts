import { useQuery } from '@tanstack/react-query'
import { supabase, fetchAllRows } from './supabase'
import { resolveMenopauseSymptomId } from './menopauseSymptoms'

export interface MenopauseLogRow { date: string; type: string; value: string | null; severity: number | null; notes?: string | null }
export interface SymptomStat { id: string; count: number; avgSeverity: number }

const VASOMOTOR = new Set(['hot_flash', 'night_sweat'])

/** Count + average severity per symptom id, excluding non-symptom events (period/note). */
export function computeSymptomStats(rows: MenopauseLogRow[]): SymptomStat[] {
  const acc = new Map<string, { count: number; sev: number }>()
  for (const r of rows) {
    const id = resolveMenopauseSymptomId(r.type)
    if (!id) continue // skip period/note/unknown
    const cur = acc.get(id) ?? { count: 0, sev: 0 }
    cur.count += 1
    cur.sev += r.severity ?? 0
    acc.set(id, cur)
  }
  return [...acc.entries()]
    .map(([id, v]) => ({ id, count: v.count, avgSeverity: v.count ? v.sev / v.count : 0 }))
    .sort((a, b) => b.count - a.count)
}

/** Per-day count of vasomotor events (hot flashes + night sweats). */
export function computeVasomotorFrequency(rows: MenopauseLogRow[]): { date: string; count: number }[] {
  const byDay = new Map<string, number>()
  for (const r of rows) {
    if (!VASOMOTOR.has(r.type)) continue
    byDay.set(r.date, (byDay.get(r.date) ?? 0) + 1)
  }
  return [...byDay.entries()].map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date))
}

export function useMenopauseLogs() {
  return useQuery({
    queryKey: ['menopause-logs'],
    queryFn: async (): Promise<MenopauseLogRow[]> => {
      const { data: s } = await supabase.auth.getSession()
      const userId = s.session?.user.id
      if (!userId) return []
      // Paged: a single select stops at 1000 rows, and oldest-first that dropped the newest logs.
      return fetchAllRows<MenopauseLogRow>(() =>
        supabase
          .from('menopause_logs')
          .select('date, type, value, severity, notes')
          .eq('user_id', userId)
          .order('date', { ascending: true })
          .order('id', { ascending: true }),
      )
    },
  })
}
