'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { Sticker } from '@/components/stickers/sticker'
import type { StickerName } from '@/components/stickers/paths'
import { useDemo } from '@/components/demo/demo'
import s from './site.module.css'

export interface JoinedValue {
  /** true once any email field on the page has joined the list */
  isJoined: boolean
  /** flip every field to joined, end the tour, and throw a sticker burst from `origin` (viewport px) */
  joined: (origin?: { x: number; y: number }) => void
}

const JoinedContext = createContext<JoinedValue | null>(null)

const BURST: StickerName[] = ['flower', 'heart', 'star', 'baby', 'moon', 'shoe', 'flame', 'pola', 'eye', 'globe']
const BURST_MS = 1700
type Burst = { id: number; x: number; y: number }

const reducedMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Must sit inside <DemoProvider>: joining also ends the demo tour (reducer `joined`). */
export function JoinedProvider({ children }: { children: ReactNode }) {
  const { dispatch } = useDemo()
  const [isJoined, setJoined] = useState(false)
  const [bursts, setBursts] = useState<Burst[]>([])

  const joined = useCallback((origin?: { x: number; y: number }) => {
    setJoined(true)
    dispatch({ type: 'joined' })
    if (origin && !reducedMotion()) setBursts((b) => [...b, { id: Date.now() + Math.random(), ...origin }])
  }, [dispatch])

  useEffect(() => {
    if (!bursts.length) return
    const t = setTimeout(() => setBursts((b) => b.slice(1)), BURST_MS)
    return () => clearTimeout(t)
  }, [bursts])

  const value = useMemo(() => ({ isJoined, joined }), [isJoined, joined])
  return (
    <JoinedContext.Provider value={value}>
      {children}
      {bursts.map((b) => BURST.map((n, j) => {
        const a = (j / BURST.length) * Math.PI * 2
        const style = {
          left: b.x - 28, top: b.y - 28,
          '--x': `${Math.cos(a) * 180}px`, '--y': `${Math.sin(a) * 160 - 60}px`, '--rr': `${(j % 2 ? 1 : -1) * 120}deg`,
        } as CSSProperties
        return <div key={`${b.id}-${n}`} className={s.burst} style={style} aria-hidden="true" data-burst><Sticker name={n} cut className={s.ico} /></div>
      }))}
    </JoinedContext.Provider>
  )
}

export function useJoined(): JoinedValue {
  const ctx = useContext(JoinedContext)
  if (!ctx) throw new Error('useJoined must be used inside <JoinedProvider>')
  return ctx
}
