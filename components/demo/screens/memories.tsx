'use client'

import type { CSSProperties } from 'react'
import { Ico } from '../sticker-ico'
import { useDemo } from '../demo'
import { KidSwitch } from '../kid-switch'
import styles from '../demo.module.css'
import f from './features.module.css'
import { Head, Note } from './parts'

export function Memories() {
  const { state, dispatch, data, cheer } = useDemo()
  const t = data.ui.screens.memories
  const kids = state.mode === 'kids'
  const mine = state.mems[state.mode].filter((m) => !kids || state.kid === 'all' || m.kid === state.kid)
  return (
    <>
      <Head title={t.title} icon={t.icon} />
      {kids && <KidSwitch />}
      <Note>{t.note}</Note>
      <button type="button" className={f.newmem} onClick={() => { dispatch({ type: 'addMemory' }); cheer('pola', t.saved) }}>
        <Ico name="pola" />{t.newMemory}
      </button>
      <div className={f.tl}>
        {mine.map((m, n) => (
          <div key={`${mine.length - n}`} data-memory="" className={f.tlIt} style={{ '--c': m.tone } as CSSProperties}>
            {(n === 0 || mine[n - 1].year !== m.year) && <div className={f.tlY}>{m.year}</div>}
            <span className={f.when}>{m.month} {m.year}</span>
            <div className={`${f.tlCard} ${styles.card}`}>
              <div className={f.ph} style={{ '--c': m.tone, '--r': `${n % 2 ? 3 : -3}deg` } as CSSProperties}><Ico name={m.icon} /></div>
              <div><b>{m.title}</b><span>{m.sub}</span></div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
