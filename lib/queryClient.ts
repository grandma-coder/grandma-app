import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient()

/**
 * Invalidate every query that reads from `pregnancy_logs`. Call this after
 * any insert / update / delete on the table so all consumers (home,
 * calendar, journey ring, analytics dashboards) refetch.
 *
 * Matches both the dash-cased home/calendar keys (`pregnancy-today-logs`,
 * `pregnancy-week-logs`, `pregnancy-month-logs`, `pregnancy-calendar-logs`)
 * and the underscore-cased analytics keys (`pregnancy_weight`,
 * `pregnancy_mood_trend`, etc.) by predicate prefix.
 */
export function invalidatePregnancyLogQueries(): Promise<void> {
  return queryClient.invalidateQueries({
    predicate: (q) => {
      const k = q.queryKey[0]
      return typeof k === 'string' && (k.startsWith('pregnancy-') || k.startsWith('pregnancy_'))
    },
  })
}

/** Same idea for kids — `child_logs` table powers many analytics keys. */
export function invalidateKidsLogQueries(): Promise<void> {
  return queryClient.invalidateQueries({
    predicate: (q) => {
      const k = q.queryKey[0]
      return typeof k === 'string' && (k.startsWith('kids-') || k.startsWith('kids_') || k.startsWith('child-') || k.startsWith('child_'))
    },
  })
}

/** Same for cycle / pre-pregnancy logs. */
export function invalidateCycleLogQueries(): Promise<void> {
  return queryClient.invalidateQueries({
    predicate: (q) => {
      const k = q.queryKey[0]
      return typeof k === 'string' && (k.startsWith('cycle-') || k.startsWith('cycle_') || k.startsWith('prepreg-') || k.startsWith('prepreg_'))
    },
  })
}
