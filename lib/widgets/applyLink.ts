import { useBehaviorStore } from '../../store/useBehaviorStore'
import { useModeStore } from '../../store/useModeStore'
import { useChildStore } from '../../store/useChildStore'
import { useWidgetIntentStore } from '../../store/useWidgetIntentStore'
import { hasCapability } from '../caregiverPermissions'
import type { ParsedLink } from './deepLinks'

/**
 * Apply a widget / shortcut link: switch to its journey (and child) and leave the log
 * type for that home to open. 'home' = the journey isn't enrolled any more; nothing changed.
 *
 * No log sheet opens when the link's child is gone (deleted, or caregiver access removed) —
 * the sheet would save onto whichever child happens to be active — nor for a caregiver child
 * the owner didn't give log permission (the home is read-only for them; the save would fail).
 */
export function applyWidgetLink(p: ParsedLink): 'home' | 'journey' {
  const { enrolledBehaviors, switchTo } = useBehaviorStore.getState()
  if (!enrolledBehaviors.includes(p.mode)) return 'home'
  useModeStore.getState().setMode(p.mode)
  switchTo(p.mode)
  let canOpenSheet = true
  if (p.childId) {
    const { children, setActiveChild } = useChildStore.getState()
    const child = children.find((c) => c.id === p.childId)
    if (child) setActiveChild(child)
    else canOpenSheet = false
  }
  if (p.mode === 'kids') {
    const target = useChildStore.getState().activeChild
    if (target?.caregiverRole && target.caregiverRole !== 'parent' && !hasCapability(target, 'log_activity')) {
      canOpenSheet = false
    }
  }
  if (p.type && canOpenSheet) useWidgetIntentStore.getState().set({ journey: p.journey, type: p.type })
  return 'journey'
}
