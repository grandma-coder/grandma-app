'use client'

import { Ico } from '../sticker-ico'
import { useDemo } from '../demo'
import styles from '../demo.module.css'
import f from './features.module.css'
import { Head, Note } from './parts'
import { Exams } from './exams'

function ExamView({ index }: { index: number }) {
  const { state, data } = useDemo()
  const t = data.ui.screens.exams
  const e = state.exams[state.mode][index]
  return (
    <>
      <Head title={e.title} small />
      <Note>{e.date} · {t.kept}</Note>
      <div className={f.scan}><Ico name="doc" cut /></div>
      <div className={`${f.read} ${styles.card}`}><small>{t.readBy}</small><p>{e.read}</p></div>
      <table className={f.vals}>
        <tbody>
          {e.vals.map((v) => (
            <tr key={v.name}>
              <td>{v.name}</td><td>{v.value}</td><td>{v.range}</td>
              <td><span className={`${f.flag} ${v.flag === 'ok' ? f.stOk : f.stWarn}`}>{v.flag === 'ok' ? t.normal : t.low}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={f.btnRow}>
        <button type="button">{t.share}</button>
        <button type="button" className={f.dk}>{t.original}</button>
      </div>
    </>
  )
}

/** Exam detail. An index outside the list (stale or typed by hand) falls back to the list. */
export function Exam() {
  const { state } = useDemo()
  const i = state.arg
  const ok = typeof i === 'number' && Number.isInteger(i) && i >= 0 && i < state.exams[state.mode].length
  return ok ? <ExamView index={i} /> : <Exams />
}
