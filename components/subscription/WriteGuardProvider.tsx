import { useMemo, type ReactNode } from 'react'
import { WriteGuardContext } from '../../lib/writeGuard'
import { useIsReadOnly } from '../../lib/useSubscriptionAccess'
import { ReadOnlyNotice } from './ReadOnlyNotice'

/** Supplies read-only mode (lapsed trial/subscription) to write sheets. Needs QueryClientProvider above. */
export function WriteGuardProvider({ children }: { children: ReactNode }) {
  const readOnly = useIsReadOnly()
  const value = useMemo(
    () => ({ readOnly, renderNotice: (onClose: () => void) => <ReadOnlyNotice onClose={onClose} /> }),
    [readOnly],
  )
  return <WriteGuardContext.Provider value={value}>{children}</WriteGuardContext.Provider>
}
