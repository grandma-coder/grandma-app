import { useBehaviorStore, type Behavior as Journey } from '../store/useBehaviorStore'
import { useModeStore } from '../store/useModeStore'

/**
 * Boot/sign-in: restore the enrolled journeys from the server when the device has none,
 * coerce the active mode into one the user is enrolled in, and point the journey switcher
 * (useBehaviorStore.currentBehavior) at that same mode. The two stores default
 * independently (mode → 'kids', currentBehavior → first server row), so without the last
 * step home and switcher could name different journeys.
 */
export function restoreJourneys(serverTypes: Journey[]): void {
  const behavior = useBehaviorStore.getState()
  if (behavior.enrolledBehaviors.length === 0 && serverTypes.length > 0) {
    behavior.setBehaviors(serverTypes)
  }
  const enrolled = useBehaviorStore.getState().enrolledBehaviors
  if (enrolled.length === 0) return
  const mode = useModeStore.getState().mode
  if (!enrolled.includes(mode as Journey)) {
    // setModeUnsafe: the guard in setMode would race the just-set enrollment.
    useModeStore.getState().setModeUnsafe(enrolled[0] as never)
  }
  const finalMode = useModeStore.getState().mode as Journey
  if (useBehaviorStore.getState().currentBehavior !== finalMode) {
    useBehaviorStore.getState().switchTo(finalMode)
  }
}
