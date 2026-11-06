import { useEffect, useRef, useState } from 'react'
import { beginClosing, whenNoneClosing } from './modalQueue'

/** Time iOS needs to finish dismissing a native-animated RN Modal (fade/slide). */
export const NATIVE_DISMISS_MS = 350

/**
 * For raw RN `<Modal visible={...}>` that doesn't go through SheetModal/CenterModal.
 * Pass the wanted visibility, give the Modal the returned value. It waits for any sheet that is
 * still closing before presenting, and registers itself as "closing" while its own native
 * dismissal runs so the next sheet waits for it too.
 */
export function useQueuedModal(wanted: boolean): boolean {
  const [shown, setShown] = useState(false)
  const was = useRef(false)
  useEffect(() => {
    if (wanted) {
      was.current = true
      return whenNoneClosing(() => setShown(true))
    }
    setShown(false)
    if (was.current) {
      was.current = false
      const end = beginClosing()
      const t = setTimeout(end, NATIVE_DISMISS_MS)
      return () => { clearTimeout(t); end() }
    }
  }, [wanted])
  return shown
}
