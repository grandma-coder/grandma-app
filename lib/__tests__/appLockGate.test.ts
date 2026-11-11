import { appLockTransition } from '../appLockGate'

/** Feed a sequence of AppState changes; return whether the app re-locked on the final one. */
function run(states: string[]): boolean[] {
  let backgrounded = false
  return states.map((s) => {
    const r = appLockTransition(backgrounded, s as never)
    backgrounded = r.backgrounded
    return r.lock
  })
}

describe('app lock gate', () => {
  it('locks when coming back after the app really went to the background', () => {
    expect(run(['inactive', 'background', 'active'])).toEqual([false, false, true])
    expect(run(['background', 'inactive', 'active'])).toEqual([false, false, true])
  })
  it('does not lock after only "inactive" (permission alert, purchase sheet, Control Center)', () => {
    expect(run(['inactive', 'active'])).toEqual([false, false])
  })
  it('locks once per trip to the background', () => {
    expect(run(['background', 'active', 'inactive', 'active'])).toEqual([false, true, false, false])
  })
})
