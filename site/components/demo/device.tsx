'use client'

import type { CSSProperties } from 'react'
import { useDemo } from './demo'
import { DemoScreen } from './screens'
import { Sheets } from './sheet'
import { TabBar } from './tabs'
import { Toast } from './toast'
import styles from './demo.module.css'

/**
 * The phone: a fixed 390x800 frame (bezel, island, status bar). A parent may scale it with a CSS transform;
 * no viewport logic lives here.
 */
export function DemoDevice({ className }: { className?: string }) {
  const { state, data, toast, cheer } = useDemo()
  const phase = data.phases[state.mode]

  return (
    <div className={`${styles.device} ${className ?? ''}`}>
      <div className={styles.island} aria-hidden="true" />
      <div className={styles.app} style={{ '--mc': phase.tone, '--ma': phase.accent } as CSSProperties}>
        <div className={styles.status} aria-hidden="true"><span>9:41</span><span>●●● ▮</span></div>
        <DemoScreen />
        <TabBar />
        <Sheets onCheer={(t) => cheer(t.icon, t.text)} />
        <Toast toast={toast} />
      </div>
    </div>
  )
}
