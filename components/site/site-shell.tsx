'use client'

import type { ReactNode } from 'react'
import { DemoProvider } from '@/components/demo/demo'
import { JoinedProvider } from './joined-context'
import { WAITLIST_ID } from './ids'

/** Scroll to the waitlist section (the in-phone "just a taste" nudge; later also the mobile bar). */
export function scrollToWaitlist() {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  document.getElementById(WAITLIST_ID)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}

/**
 * The one demo state for the page: hero (QuickJoin reads `mode`), phase switch, phone, sticker sheet and
 * waitlist all sit inside it (Task 10's mobile bar and Task 11's tour go here too).
 */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <DemoProvider onNudge={scrollToWaitlist}>
      <JoinedProvider>{children}</JoinedProvider>
    </DemoProvider>
  )
}
