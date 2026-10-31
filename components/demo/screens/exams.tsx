'use client'

import { Ico } from '../sticker-ico'
import { useDemo } from '../demo'
import styles from '../demo.module.css'
import f from './features.module.css'
import { Head, List, Note } from './parts'

export function Exams() {
  const { state, dispatch, data } = useDemo()
  const t = data.ui.screens.exams
  return (
    <>
      <Head title={t.title} icon={t.icon} />
      <Note>{t.note}</Note>
      <List>
        {state.exams[state.mode].map((e, n) => (
          <li key={`${state.exams[state.mode].length - n}`}>
            <button type="button" className={`${f.exam} ${styles.card}`} onClick={() => dispatch({ type: 'openScreen', screen: 'exam', arg: n })}>
              <Ico name="doc" />
              <div><b>{e.title}</b><small>{e.date}</small></div>
              <span className={`${f.st} ${e.status === 'ok' ? f.stOk : f.stWarn}`}>{e.status === 'ok' ? t.normal : t.attention}</span>
            </button>
          </li>
        ))}
        <li>
          <button type="button" className={`${f.exam} ${f.add} ${styles.card}`} onClick={() => dispatch({ type: 'openSheet', sheet: { kind: 'addExam' } })}>
            <Ico name="camera" />{t.add}
          </button>
        </li>
      </List>
    </>
  )
}
