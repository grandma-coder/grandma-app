'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

/** Which phone-only overlay is open: Explorar (the eye), the list pop-up, or none. */
export type Panel = 'none' | 'explore' | 'list'

export interface MobileUi {
  panel: Panel
  openExplore: () => void
  openList: () => void
  close: () => void
}

const MobileContext = createContext<MobileUi | null>(null)

export function MobileProvider({ children }: { children: ReactNode }) {
  const [panel, setPanel] = useState<Panel>('none')
  const openExplore = useCallback(() => setPanel('explore'), [])
  const openList = useCallback(() => setPanel('list'), [])
  const close = useCallback(() => setPanel('none'), [])
  const value = useMemo(() => ({ panel, openExplore, openList, close }), [panel, openExplore, openList, close])
  return <MobileContext.Provider value={value}>{children}</MobileContext.Provider>
}

export function useMobileUi(): MobileUi {
  const ctx = useContext(MobileContext)
  if (!ctx) throw new Error('useMobileUi must be used inside <SiteShell>')
  return ctx
}
