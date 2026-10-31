'use client'

import { useEffect, useRef, useState } from 'react'
import { Ico } from '../sticker-ico'
import { useDemo } from '../demo'
import type { ToastState } from '../toast'
import styles from '../demo.module.css'
import f from './features.module.css'
import { Note, reducedMotion } from './parts'

const SCAN_MS = 1600

/** Body of the add-exam sheet (the shell supplies the header). Scan animation, then the new exam opens. */
export function AddExamSheet({ onCheer }: { onCheer: (t: Omit<ToastState, 'n'>) => void }) {
  const { state, dispatch, data } = useDemo()
  const t = data.ui.screens.exams
  const [reading, setReading] = useState(false)
  // the sheet body stays mounted while it slides out; a scan the visitor dismissed must not open an exam
  const open = useRef(true)
  open.current = state.sheet.kind === 'addExam'
  const cheer = useRef(onCheer)
  cheer.current = onCheer
  useEffect(() => {
    if (!reading) return
    const id = setTimeout(() => {
      if (!open.current) return
      dispatch({ type: 'addExam' })
      cheer.current({ icon: 'doc', text: t.done })
    }, reducedMotion() ? 0 : SCAN_MS)
    return () => clearTimeout(id)
  }, [reading, dispatch, t.done])

  return (
    <>
      <Note>{t.addNote}</Note>
      <div className={`${f.scan} ${reading ? f.go : ''}`}><Ico name={reading ? 'doc' : 'camera'} cut /></div>
      <button type="button" className={styles.save} disabled={reading} onClick={() => setReading(true)}>{reading ? t.reading : t.takePhoto}</button>
    </>
  )
}
