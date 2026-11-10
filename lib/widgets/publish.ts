/**
 * Builds the widget snapshot and hands it to the widgets. Never throws into the caller:
 * a failure is reported to Sentry and the widgets keep their last snapshot.
 */
import { reportError } from '../sentry'
import { collectSnapshotInput } from './collect'
import { buildSnapshot, emptySnapshot } from './snapshot'
import { writeSnapshot } from './storage'
import { setQuickActionsFor } from './quickActions'
import { useWidgetAssetStore } from '../../store/useWidgetAssetStore'

const DEBOUNCE_MS = 1500
let timer: ReturnType<typeof setTimeout> | null = null

/** Publish soon; bursts (a save that invalidates several queries) collapse into one write. */
export function publishWidgets(_reason: string): void {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    void publishNow()
  }, DEBOUNCE_MS)
}

export async function publishNow(): Promise<void> {
  try {
    const input = await collectSnapshotInput()
    const snapshot = input ? buildSnapshot(input) : emptySnapshot(new Date())
    await writeSnapshot(JSON.stringify(snapshot))
    setQuickActionsFor(snapshot)
  } catch (e) {
    reportError(e, { area: 'widgets' })
  }
}

/** Sign-out: widgets show "Sign in to Grandma" and nothing from the account stays on the home screen. */
export async function clearWidgets(): Promise<void> {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  useWidgetAssetStore.getState().reset()
  try {
    const snapshot = emptySnapshot(new Date())
    await writeSnapshot(JSON.stringify(snapshot))
    setQuickActionsFor(snapshot)
  } catch (e) {
    reportError(e, { area: 'widgets' })
  }
}
