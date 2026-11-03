/**
 * Lets a screen ask the root layout to re-run its user-data load (profile, behaviors, children)
 * without a sign-in event — e.g. after accepting a caregiver invite, when the new child would
 * otherwise only appear after an app restart. The root layout registers the loader.
 */
let reloader: (() => Promise<void>) | null = null

export function registerUserDataReloader(fn: (() => Promise<void>) | null): void {
  reloader = fn
}

export async function reloadUserData(): Promise<void> {
  await reloader?.()
}
