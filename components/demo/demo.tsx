'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type Dispatch, type ReactNode } from 'react'
import type { StickerName } from '@/components/stickers/paths'
import type { ToastState } from './toast'
import { useLocale } from 'next-intl'
import type { Locale } from '@/i18n/routing'
import { forGoal, getDemoData, type Chip, type DemoData } from '@/lib/demo'
import { demoReducer, initDemo, type DemoAction, type DemoState } from '@/lib/demo/reducer'

export interface DemoContextValue {
  state: DemoState
  dispatch: Dispatch<DemoAction>
  data: DemoData
  /** called when the visitor taps the "save your spot" nudge inside the phone */
  onNudge?: () => void
  /** the sticker toast shown by `DemoDevice` */
  toast: ToastState | null
  /** pop the sticker toast over the phone */
  cheer: (icon: StickerName, text: string) => void
}

const TOAST_MS = 1500
const DemoContext = createContext<DemoContextValue | null>(null)

/** One provider for hero, phase switch, phone, mobile bar and tour. Remounted per locale so seed data never goes stale. */
export function DemoProvider({ children, onNudge }: { children: ReactNode; onNudge?: () => void }) {
  const locale: Locale = useLocale() === 'pt' ? 'pt' : 'en'
  return <DemoInner key={locale} locale={locale} onNudge={onNudge}>{children}</DemoInner>
}

function DemoInner({ locale, onNudge, children }: { locale: Locale; onNudge?: () => void; children: ReactNode }) {
  const data = useMemo(() => getDemoData(locale), [locale])
  const [state, dispatch] = useReducer(demoReducer, data, initDemo)
  const [toast, setToast] = useState<ToastState | null>(null)
  const cheer = useCallback((icon: StickerName, text: string) => setToast((t) => ({ icon, text, n: (t?.n ?? 0) + 1 })), [])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), TOAST_MS)
    return () => clearTimeout(t)
  }, [toast])
  const value = useMemo(() => ({ state, dispatch, data, onNudge, toast, cheer }), [state, data, onNudge, toast, cheer])
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
}

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext)
  if (!ctx) throw new Error('useDemo must be used inside <DemoProvider>')
  return ctx
}

/** The current phase's log chips, resolved for the cycle goal. */
export function useChips(): Chip[] {
  const { state, data } = useDemo()
  return forGoal(data.phases[state.mode].chips, state.goal)
}
