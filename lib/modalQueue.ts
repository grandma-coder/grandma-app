/**
 * iOS refuses to present a Modal while another one is still on screen. A bottom sheet that
 * closes and immediately hands off to the next sheet (picker → log form) has its Modal still
 * presented for the ~220ms close animation, so the next sheet's Modal silently failed to show —
 * and on device could leave an invisible layer swallowing every touch.
 *
 * Sheets register while they're closing; a sheet about to open waits until none are, with a
 * safety timeout so nothing can ever wait forever.
 */
/** Gap between one sheet's Modal leaving and the next presenting. */
export const DISMISS_GAP_MS = 60

let closing = 0
const waiters = new Set<() => void>()

function flush() {
  if (closing > 0) return
  for (const w of [...waiters]) w()
}

/** Call when a sheet starts its close animation; call the returned function once it's gone. */
export function beginClosing(): () => void {
  closing++
  let ended = false
  return () => {
    if (ended) return
    ended = true
    closing = Math.max(0, closing - 1)
    // Let the closed Modal's native dismissal commit before the next one presents.
    setTimeout(flush, DISMISS_GAP_MS)
  }
}

/** Run `open` as soon as no sheet is closing (or after `timeoutMs`). Returns a cancel function. */
export function whenNoneClosing(open: () => void, timeoutMs = 700): () => void {
  let done = false
  const run = () => {
    if (done) return
    done = true
    waiters.delete(run)
    clearTimeout(timer)
    open()
  }
  const timer = setTimeout(run, timeoutMs)
  // Check on the next tick: the sheet handing off to us usually starts closing in the same
  // render (onClose + onSelect together), and its effect may run after ours.
  const tick = setTimeout(() => { if (closing === 0) run(); else waiters.add(run) }, 0)
  return () => { done = true; waiters.delete(run); clearTimeout(timer); clearTimeout(tick) }
}
