'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { StickerName } from '@/components/stickers/paths'
import { Ico } from '../sticker-ico'
import { useDemo } from '../demo'
import styles from '../demo.module.css'
import f from './features.module.css'

/** True when the visitor asked for reduced motion; timers then fire at 0 ms. */
export const reducedMotion = (): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Screen header: round back button, handwritten title, sticker on the right. */
export function Head({ title, icon, small, onBack }: { title: string; icon?: StickerName; small?: boolean; onBack?: () => void }) {
  const { dispatch, data } = useDemo()
  return (
    <div className={styles.topRow}>
      <button type="button" className={styles.back} aria-label={data.ui.back} onClick={onBack ?? (() => dispatch({ type: 'back' }))}>‹</button>
      <h3 className={`${styles.hHand} ${small ? f.small : ''}`}>{title}</h3>
      {icon && <Ico name={icon} />}
    </div>
  )
}

export const Note = ({ children }: { children: ReactNode }) => <p className={styles.note}>{children}</p>

/** One row of a read-only list: sticker, label, right-hand value (`ok` adds a check). */
export function Row({ icon, label, value, ok }: { icon: StickerName; label: string; value: string; ok?: boolean }) {
  return (
    <li className={`${f.item} ${styles.card}`}>
      <Ico name={icon} />{label}
      <span className={ok ? f.ok : undefined}>{ok ? '✓ ' : ''}{value}</span>
    </li>
  )
}

export const List = ({ children }: { children: ReactNode }) => <ul className={f.list}>{children}</ul>

/** A flag that switches on for `ms` and then off again; the timer dies with the component. */
export function useFlash(ms = 1800): [boolean, () => void] {
  const [on, setOn] = useState(false)
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(t.current), [])
  return [on, () => { setOn(true); clearTimeout(t.current); t.current = setTimeout(() => setOn(false), ms) }]
}
