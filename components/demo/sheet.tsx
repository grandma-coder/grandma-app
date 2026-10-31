'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Sheet as SheetState } from '@/lib/demo/reducer'
import { fmt } from '@/lib/demo'
import { Ico } from './sticker-ico'
import { useChips, useDemo } from './demo'
import { LogSheet } from './log-sheet'
import { AddExamSheet } from './screens/add-exam-sheet'
import type { ToastState } from './toast'
import styles from './demo.module.css'

export function SheetHead({ title }: { title: string }) {
  const { dispatch, data } = useDemo()
  return (
    <div className={styles.shTop}>
      <h5>{title}</h5>
      <button type="button" className={styles.x} aria-label={data.ui.close} onClick={() => dispatch({ type: 'closeSheet' })}>✕</button>
    </div>
  )
}

function RegisterSheet() {
  const { dispatch, data } = useDemo()
  const chips = useChips()
  return (
    <>
      <SheetHead title={data.ui.register.title} />
      <div className={styles.opts}>
        {chips.map((c) => (
          <button key={c.id} type="button" className={styles.opt} onClick={() => dispatch({ type: 'openSheet', sheet: { kind: 'log', chip: c.id } })}>
            <Ico name={c.icon} />{c.label}
          </button>
        ))}
      </div>
    </>
  )
}

function ShortcutsSheet() {
  const { dispatch, data } = useDemo()
  return (
    <>
      <SheetHead title={data.ui.shortcuts.title} />
      <div className={styles.shortcuts}>
        {data.ui.shortcuts.items.map((it) => (
          <button key={it.screen} type="button" onClick={() => dispatch({ type: 'openScreen', screen: it.screen })}>
            <Ico name={it.icon} cut />{it.title}
          </button>
        ))}
      </div>
    </>
  )
}

/** Scrim plus bottom sheet. The last opened sheet stays rendered while sliding out. */
export function Sheets({ onCheer }: { onCheer: (t: Omit<ToastState, 'n'>) => void }) {
  const { state, dispatch, data } = useDemo()
  const chips = useChips()
  const open = state.sheet.kind !== 'none'
  // a fresh `n` per opening remounts the content, so a reopened log sheet never keeps the last pick
  const [view, setView] = useState<{ sheet: SheetState; n: number }>({ sheet: state.sheet, n: 0 })
  if (open && state.sheet !== view.sheet) setView({ sheet: state.sheet, n: view.n + 1 })
  const dialogRef = useRef<HTMLDivElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const wasOpen = useRef(false)
  // preventScroll: the sheet is still translated below the screen when focused, and a plain focus()
  // scrolls to it — the page in Chrome, the overflow:hidden phone in Safari (content stuck shifted up).
  useEffect(() => {
    if (open && !wasOpen.current) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      dialogRef.current?.focus({ preventScroll: true })
    } else if (!open && wasOpen.current) {
      if (opener.current?.isConnected) opener.current.focus({ preventScroll: true })
      opener.current = null
    }
    wasOpen.current = open
  }, [open])
  const shown = open ? state.sheet : view.sheet

  let title = ''
  let body: ReactNode = null
  if (shown.kind === 'register') { title = data.ui.register.title; body = <RegisterSheet /> }
  else if (shown.kind === 'shortcuts') { title = data.ui.shortcuts.title; body = <ShortcutsSheet /> }
  else if (shown.kind === 'addExam') {
    title = data.ui.screens.exams.add
    body = <><SheetHead title={title} /><AddExamSheet /></>
  } else if (shown.kind === 'log') {
    title = fmt(data.ui.log.title, { label: chips.find((c) => c.id === shown.chip)?.label.toLowerCase() ?? '' })
    body = <LogSheet chipId={shown.chip} onCheer={onCheer} />
  }

  return (
    <>
      <div aria-hidden="true" className={`${styles.scrim} ${open ? styles.on : ''}`} onClick={() => dispatch({ type: 'closeSheet' })} />
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-label={title} aria-hidden={!open} inert={!open} className={`${styles.sheet} ${open ? styles.on : ''}`}
        onKeyDown={(e) => { if (e.key === 'Escape') dispatch({ type: 'closeSheet' }) }}>
        <div className={styles.grab} />
        <div key={view.n}>{body}</div>
      </div>
    </>
  )
}
