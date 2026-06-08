/**
 * useOnboardingComplete — shared completion handler for onboarding flows.
 *
 * Called at the final step of each behavior's onboarding.
 * If more flows are queued, navigates to transition screen.
 * If all done, navigates to home and flips the active mode to the
 * just-completed behavior.
 */

import { useCallback } from 'react'
import { router } from 'expo-router'
import { useOnboardingStore } from '../store/useOnboardingStore'
import { useBehaviorStore, Behavior } from '../store/useBehaviorStore'
import { useModeStore } from '../store/useModeStore'

export function useOnboardingComplete() {
  // Reactive values for the returned hook API (consumers reading hasNext/next).
  const queue = useOnboardingStore((s) => s.queue)
  const hasNext = queue.length > 1
  const nextBehavior = queue[1] ?? null

  const handleComplete = useCallback(
    (completedBehavior?: Behavior) => {
      // Mutate first, THEN read fresh state — the closure-captured `queue`
      // still holds the just-completed head, so deriving next-flow from it
      // would misroute or skip in a multi-behavior sequence.
      useOnboardingStore.getState().completeCurrentFlow()
      const freshNext = useOnboardingStore.getState().currentOnboarding

      if (freshNext) {
        router.push({
          pathname: '/onboarding/transition',
          params: { next: freshNext },
        } as any)
        return
      }

      // All done — flip mode to the behavior we just finished onboarding for.
      // Fall back to the first enrolled behavior.
      const enrolled = useBehaviorStore.getState().enrolledBehaviors
      const target: Behavior | null = completedBehavior ?? enrolled[0] ?? null
      if (target) {
        useBehaviorStore.getState().switchTo(target)
        // setModeUnsafe: enrollment is guaranteed by the flow's saveAndFinish,
        // and the guarded setMode would silently no-op if it hadn't landed yet.
        useModeStore.getState().setModeUnsafe(target)
      }
      router.replace('/(tabs)' as any)
    },
    []
  )

  return { handleComplete, hasNext, nextBehavior }
}
