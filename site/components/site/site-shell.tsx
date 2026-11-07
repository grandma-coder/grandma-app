'use client'

import type { ReactNode } from 'react'
import { DemoProvider } from '@/components/demo/demo'
import { JoinedProvider } from './joined-context'
import { MobileProvider, useMobileUi } from './mobile-context'
import { WAITLIST_ID } from './ids'

/** Scroll to the waitlist section (the in-phone "just a taste" nudge; later also the mobile bar). */
export function scrollToWaitlist() {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  document.getElementById(WAITLIST_ID)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}

/**
 * The one demo state for the page: hero (QuickJoin reads `mode`), phase switch, phone, sticker sheet and
 * waitlist all sit inside it (the mobile bar goes inside it from the page, Task 11's tour too).
 */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <MobileProvider>
      <Demo>{children}</Demo>
    </MobileProvider>
  )
}

/** The in-phone nudge also closes whatever phone overlay is open before it scrolls to the waitlist. */
function Demo({ children }: { children: ReactNode }) {
  const { close } = useMobileUi()
  return (
    <DemoProvider onNudge={() => { close(); scrollToWaitlist() }}>
      <JoinedProvider>{children}</JoinedProvider>
    </DemoProvider>
  )
}
