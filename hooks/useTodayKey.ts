/**
 * Today's local date ('YYYY-MM-DD') that changes at midnight while the app stays open, and is
 * re-read whenever the app returns to the foreground. Components that compute "today" inside a
 * useMemo add this to the deps — otherwise the ring/strip kept yesterday as today after midnight.
 */
import { useEffect, useState } from 'react'
import { AppState } from 'react-native'
import { toDateStr } from '../lib/cycleLogic'

/** Milliseconds from `now` to the next local midnight (calendar-based, so DST days are right). */
export function msUntilNextLocalMidnight(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return next.getTime() - now.getTime()
}

export function useTodayKey(): string {
  const [today, setToday] = useState(() => toDateStr(new Date()))
  useEffect(() => {
    const refresh = () => setToday(toDateStr(new Date()))
    let timer: ReturnType<typeof setTimeout>
    const arm = () => {
      // +1s so the timer lands safely on the new day.
      timer = setTimeout(() => { refresh(); arm() }, msUntilNextLocalMidnight(new Date()) + 1000)
    }
    arm()
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') return
      refresh()
      // Timers don't run while suspended — re-arm from the real clock.
      clearTimeout(timer)
      arm()
    })
    return () => { clearTimeout(timer); sub.remove() }
  }, [])
  return today
}
