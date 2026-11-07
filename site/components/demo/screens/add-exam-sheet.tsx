'use client'

import { useEffect, useRef, useState } from 'react'
import { Ico } from '../sticker-ico'
import { useDemo } from '../demo'
import styles from '../demo.module.css'
import f from './features.module.css'
import { Note, reducedMotion } from './parts'

const SCAN_MS = 1600

/** Body of the add-exam sheet (the shell supplies the header). Scan animation, then the new exam opens. */
export function AddExamSheet() {
  const { state, dispatch, data, cheer } = useDemo()
  const t = data.ui.screens.exams
  const [reading, setReading] = useState(false)
  // the sheet body stays mounted while it slides out; a scan the visitor dismissed must not open an exam
  const open = useRef(true)
  useEffect(() => { open.current = state.sheet.kind === 'addExam' }, [state.sheet.kind])
  useEffect(() => {
    if (!reading) return
    const id = setTimeout(() => {
      if (!open.current) return
      dispatch({ type: 'addExam' })
      cheer('doc', t.done)
    }, reducedMotion() ? 0 : SCAN_MS)
    return () => clearTimeout(id)
  }, [reading, dispatch, cheer, t.done])

  return (
    <>
      <Note>{t.addNote}</Note>
      <div className={`${f.scan} ${reading ? f.go : ''}`}><Ico name={reading ? 'doc' : 'camera'} cut /></div>
      <button type="button" className={styles.save} disabled={reading} onClick={() => setReading(true)}>{reading ? t.reading : t.takePhoto}</button>
    </>
  )
}
