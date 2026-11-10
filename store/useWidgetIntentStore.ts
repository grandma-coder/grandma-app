/**
 * A log sheet a home-screen widget / icon shortcut asked for. Set by
 * app/log/[journey]/[type].tsx; the matching journey home opens the sheet.
 * Not persisted — a cold start re-delivers the link.
 */
import { useEffect, useRef } from 'react'
import { create } from 'zustand'
import type { WidgetJourney } from '../lib/widgets/deepLinks'

interface Pending { id: number; journey: WidgetJourney; type: string }

interface WidgetIntentState {
  pending: Pending | null
  set: (p: { journey: WidgetJourney; type: string }) => void
  /** Returns the pending log type for `journey` and clears it; null if none (or another journey's). */
  take: (journey: WidgetJourney) => string | null
  /** Clears the request `id` once it has been delivered. */
  clear: (id: number) => void
}

let nextId = 1

export const useWidgetIntentStore = create<WidgetIntentState>()((set, get) => ({
  pending: null,
  set: (p) => set({ pending: { ...p, id: nextId++ } }),
  take: (journey) => {
    const p = get().pending
    if (!p || p.journey !== journey) return null
    set({ pending: null })
    return p.type
  },
  clear: (id) => {
    if (get().pending?.id === id) set({ pending: null })
  },
}))

/** How long a request stays up so every mounted copy of the home sees it. */
const DELIVERY_MS = 1500

/**
 * Opens `journey`'s sheet when a widget link for it arrives. The navigator can keep more than one
 * home mounted for a moment, so every mounted copy opens it (each at most once per request) and the
 * request is cleared after a short delivery window instead of by whichever copy saw it first.
 */
export function useConsumeWidgetIntent(journey: WidgetJourney, open: (type: string) => void): void {
  const pending = useWidgetIntentStore((s) => s.pending)
  const handled = useRef<number | null>(null)
  useEffect(() => {
    if (!pending || pending.journey !== journey || handled.current === pending.id) return
    handled.current = pending.id
    open(pending.type)
    const id = pending.id
    const timer = setTimeout(() => useWidgetIntentStore.getState().clear(id), DELIVERY_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, journey])
}
