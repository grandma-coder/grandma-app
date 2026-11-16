import { createContext, useContext, type ReactNode } from 'react'

/**
 * Lightweight bridge so shared UI (LogSheet) can respect read-only mode without
 * importing the subscription/RevenueCat/Supabase chain. The real value comes from
 * WriteGuardProvider (mounted in the root layout); the default is "writable".
 */
export interface WriteGuard {
  readOnly: boolean
  renderNotice: (onClose: () => void) => ReactNode
}

export const WriteGuardContext = createContext<WriteGuard>({ readOnly: false, renderNotice: () => null })

export const useWriteGuard = (): WriteGuard => useContext(WriteGuardContext)
