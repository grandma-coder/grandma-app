'use client'

import type { StickerName } from '@/components/stickers/paths'
import { Ico } from './sticker-ico'
import styles from './demo.module.css'

export interface ToastState { icon: StickerName; text: string; n: number }

/** "Logged!" sticker that pops over the phone. Remounted per `n` so the animation replays. */
export function Toast({ toast }: { toast: ToastState | null }) {
  if (!toast) return <div className={styles.toast} aria-live="polite" />
  return (
    <div key={toast.n} className={`${styles.toast} ${styles.go}`} aria-live="polite">
      <Ico name={toast.icon} cut />
      <p className={styles.hand}>{toast.text}</p>
    </div>
  )
}
