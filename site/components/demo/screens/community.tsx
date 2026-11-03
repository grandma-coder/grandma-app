'use client'

import type { CSSProperties } from 'react'
import { forGoal } from '@/lib/demo'
import { Ico } from '../sticker-ico'
import { useDemo } from '../demo'
import styles from '../demo.module.css'
import f from './features.module.css'
import { Head, List, Note } from './parts'

export function Community() {
  const { state, dispatch, data } = useDemo()
  const t = data.ui.screens.community
  const chans = forGoal(data.phases[state.mode].chans, state.goal)
  return (
    <>
      <Head title={t.title} icon={t.icon} />
      <Note>{t.note}</Note>
      <List>
        {chans.map((c) => {
          const first = data.msgs[c.id]?.[0]?.text ?? ''
          return (
            <li key={c.id}>
              <button type="button" className={`${f.chan} ${styles.card}`} onClick={() => dispatch({ type: 'openScreen', screen: 'chat', arg: c.id })}>
                <Ico name={c.icon} />
                <div><b>{c.title}</b><small>{first.length > 34 ? `${first.slice(0, 34)}…` : first}</small></div>
                <em style={{ '--tc': c.tone } as CSSProperties}>{t.kinds[c.kind]}</em>
              </button>
            </li>
          )
        })}
      </List>
    </>
  )
}
