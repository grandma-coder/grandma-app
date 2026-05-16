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
  const completeCurrentFlow = useOnboardingStore((s) => s.completeCurrentFlow)
  const queue = useOnboardingStore((s) => s.queue)
  const switchTo = useBehaviorStore((s) => s.switchTo)
  const setMode = useModeStore((s) => s.setMode)

  const hasNext = queue.length > 1
  const nextBehavior = queue[1] ?? null

  const handleComplete = useCallback(
    (completedBehavior?: Behavior) => {
      completeCurrentFlow()

      if (hasNext && nextBehavior) {
        router.push({
          pathname: '/onboarding/transition',
          params: { next: nextBehavior },
        } as any)
        return
      }

      // All done — flip mode to the behavior we just finished onboarding for.
      // Fall back to the first enrolled behavior, then to the queue head.
      const enrolled = useBehaviorStore.getState().enrolledBehaviors
      const target: Behavior | null =
        completedBehavior ?? enrolled[0] ?? queue[0] ?? null
      if (target) {
        switchTo(target)
        setMode(target)
      }
      router.replace('/(tabs)' as any)
    },
    [completeCurrentFlow, hasNext, nextBehavior, queue, switchTo, setMode]
  )

  return { handleComplete, hasNext, nextBehavior }
}
