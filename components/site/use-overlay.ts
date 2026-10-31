'use client'

import { useEffect, useRef } from 'react'
import type { Panel } from './mobile-context'
import { EXPLORE_ID, POP_ID, TABBAR_ID } from './ids'

const SKIP = new Set(['SCRIPT', 'STYLE', 'LINK', 'NEXT-ROUTE-ANNOUNCER'])

/** Make everything except `keep` (and their ancestors) inert; returns the undo. */
function inertOutside(keep: Element[]): () => void {
  const path = new Set<Element>()
  for (const k of keep) for (let e: Element | null = k; e && e !== document.documentElement; e = e.parentElement) path.add(e)
  const parents = [document.body, ...[...path].filter((p) => !keep.includes(p))]
  const changed: Element[] = []
  for (const parent of parents) {
    for (const child of Array.from(parent.children)) {
      if (path.has(child) || SKIP.has(child.tagName) || child.hasAttribute('inert')) continue
      child.setAttribute('inert', '')
      changed.push(child)
    }
  }
  return () => changed.forEach((c) => c.removeAttribute('inert'))
}

/**
 * Modal behaviour for Explorar and the list pop-up: the rest of the page (except the black bar and the overlays)
 * is inert, focus moves in on open and returns to the tab that opened it, Escape closes.
 */
export function useOverlay(panel: Panel, close: () => void) {
  const prev = useRef<Panel>('none')

  useEffect(() => {
    if (panel === 'none') return
    const keep: Element[] = [TABBAR_ID, EXPLORE_ID, POP_ID].map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e)
    keep.push(...Array.from(document.querySelectorAll('[data-scrim]')))
    const undo = inertOutside(keep)
    document.getElementById(panel === 'explore' ? EXPLORE_ID : POP_ID)?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => { undo(); window.removeEventListener('keydown', onKey) }
  }, [panel, close])

  // closing: hand focus back to the tab that opened the overlay, unless the visitor already moved it to another control
  useEffect(() => {
    const was = prev.current
    prev.current = panel
    if (panel !== 'none' || was === 'none') return
    const a = document.activeElement
    const lost = !a || a === document.body || !!a.closest(`#${EXPLORE_ID}, #${POP_ID}, [inert]`)
    if (lost) document.querySelector<HTMLElement>(`#${TABBAR_ID} [data-tab="${was}"]`)?.focus({ preventScroll: true })
  }, [panel])
}
