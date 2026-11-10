import { useBehaviorStore } from '../../store/useBehaviorStore'
import { useModeStore } from '../../store/useModeStore'
import { useChildStore } from '../../store/useChildStore'
import { useWidgetIntentStore } from '../../store/useWidgetIntentStore'
import type { ParsedLink } from './deepLinks'

/**
 * Apply a widget / shortcut link: switch to its journey (and child) and leave the log
 * type for that home to open. 'home' = the journey isn't enrolled any more; nothing changed.
 */
export function applyWidgetLink(p: ParsedLink): 'home' | 'journey' {
  const { enrolledBehaviors, switchTo } = useBehaviorStore.getState()
  if (!enrolledBehaviors.includes(p.mode)) return 'home'
  useModeStore.getState().setMode(p.mode)
  switchTo(p.mode)
  if (p.childId) {
    const { children, setActiveChild } = useChildStore.getState()
    const child = children.find((c) => c.id === p.childId)
    if (child) setActiveChild(child)
  }
  if (p.type) useWidgetIntentStore.getState().set({ journey: p.journey, type: p.type })
  return 'journey'
}
