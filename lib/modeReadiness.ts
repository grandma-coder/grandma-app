/**
 * Mode readiness — has this journey been through its onboarding?
 *
 * A journey must never open on an empty home: if the active mode is missing the
 * data its onboarding collects, Home sends the user into that onboarding instead.
 *
 *   kids       → at least one child (own or caregiving)
 *   pregnancy  → a due date
 *   menopause  → a stage
 *   cycle      → always ready (every cycle onboarding step is optional, and the
 *                home works on defaults), so there's nothing to require
 */

import { useChildStore } from '../store/useChildStore'
import { usePregnancyStore } from '../store/usePregnancyStore'
import { useMenopauseStore } from '../store/useMenopauseStore'
import { useBehaviorStore, type Behavior } from '../store/useBehaviorStore'

export const ONBOARDING_ROUTE: Record<Behavior, string> = {
  'pre-pregnancy': '/onboarding/cycle',
  pregnancy: '/onboarding/pregnancy',
  kids: '/onboarding/kids',
  menopause: '/onboarding/menopause',
}

export function isModeReady(mode: Behavior): boolean {
  switch (mode) {
    case 'kids':
      return useChildStore.getState().children.length > 0
    case 'pregnancy':
      return !!usePregnancyStore.getState().dueDate
    case 'menopause':
      return !!useMenopauseStore.getState().stage
    default:
      return true
  }
}

/** Reactive version for Home. `null` while the stores it reads are still hydrating. */
export function useModeReady(mode: Behavior): boolean | null {
  const children = useChildStore((s) => s.children.length)
  const dueDate = usePregnancyStore((s) => s.dueDate)
  const pregHydrated = usePregnancyStore((s) => s.hydrated)
  const stage = useMenopauseStore((s) => s.stage)
  const menoHydrated = useMenopauseStore((s) => s.hydrated)
  switch (mode) {
    case 'kids':
      return children > 0
    case 'pregnancy':
      return pregHydrated ? !!dueDate : null
    case 'menopause':
      return menoHydrated ? !!stage : null
    default:
      return true
  }
}

/** Another enrolled journey that's ready to land on (used to leave a required onboarding). */
export function otherReadyMode(current: Behavior): Behavior | null {
  const enrolled = useBehaviorStore.getState().enrolledBehaviors
  return enrolled.find((b) => b !== current && isModeReady(b)) ?? null
}
