/**
 * useOnboardingComplete — shared completion handler for onboarding flows.
 *
 * Called at the final step of each behavior's onboarding.
 * If more flows are queued, navigates to transition screen.
 * If all done, navigates to home.
 */

import { useCallback } from 'react'
import { router } from 'expo-router'
import { useOnboardingStore } from '../store/useOnboardingStore'
import { useBehaviorStore } from '../store/useBehaviorStore'
import { useModeStore } from '../store/useModeStore'

export function useOnboardingComplete() {
  const completeCurrentFlow = useOnboardingStore((s) => s.completeCurrentFlow)
  const queue = useOnboardingStore((s) => s.queue)
  const switchTo = useBehaviorStore((s) => s.switchTo)
  const setMode = useModeStore((s) => s.setMode)

  const hasNext = queue.length > 1
  const nextBehavior = queue[1] ?? null

  const handleComplete = useCallback(() => {
    completeCurrentFlow()

    if (hasNext && nextBehavior) {
      // More flows in queue — show transition then start next
      router.push({
        pathname: '/onboarding/transition',
        params: { next: nextBehavior },
      } as any)
    } else {
      // All done — go to home with the first enrolled behavior active
      const first = useBehaviorStore.getState().enrolledBehaviors[0]
      if (first) {
        switchTo(first)
        setMode(first)
      }
      router.replace('/(tabs)' as any)
    }
  }, [completeCurrentFlow, hasNext, nextBehavior, switchTo, setMode])

  return { handleComplete, hasNext, nextBehavior }
}
