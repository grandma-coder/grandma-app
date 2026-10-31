'use client'

import { useState, type CSSProperties, type FormEvent } from 'react'
import type { VillageFilter } from '@/lib/demo/reducer'
import { Ico } from '../sticker-ico'
import { useDemo } from '../demo'
import styles from '../demo.module.css'
import f from './features.module.css'
import { Head, useFlash } from './parts'

const FILTERS: VillageFilter[] = ['all', 'sell', 'swap', 'free']

function Post({ n }: { n: number }) {
  const { state, dispatch, data } = useDemo()
  const t = data.ui.screens.village
  const p = data.village[n]
  const st = state.posts[n]
  const [text, setText] = useState('')
  const [sent, flash] = useFlash()
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    dispatch({ type: 'comment', post: n, text })
    setText('')
  }
  return (
    <article className={`${f.post} ${styles.card}`}>
      <div className={f.who}>
        <Ico name={p.who.icon} />
        <div><b>{p.who.name}</b>{p.who.place}</div>
      </div>
      <div className={f.vph} style={{ '--c': p.tone, '--r': `${p.rot}deg` } as CSSProperties}>
        <span className={f.badge} style={{ '--b': p.badge } as CSSProperties}>{t.kinds[p.kind]}</span>
        <Ico name={p.icon} cut />
      </div>
      <div className={f.bd}>
        <h6>{p.title}<span className={f.price}>{p.price}</span></h6>
        <div className={f.acts}>
          <button type="button" className={`${f.like} ${st.liked ? f.on : ''}`} aria-pressed={st.liked} aria-label={`${t.likeAria} ${st.likes}`} onClick={() => dispatch({ type: 'toggleLike', post: n })}>
            <Ico name="heart" /><span>{st.likes}</span>
          </button>
          <button type="button" aria-expanded={st.open} aria-label={`${t.commentsAria} ${st.comments.length}`} onClick={() => dispatch({ type: 'toggleComments', post: n })}>
            <Ico name="bubble" />{st.comments.length}
          </button>
          <button type="button" className={f.want} aria-live="polite" onClick={flash}>
            {sent ? (p.kind === 'sell' ? t.requestSent : t.messageSent) : p.kind === 'sell' ? t.buy : t.want}
          </button>
        </div>
        {st.open && (
          <div className={f.cmts}>
            {st.comments.map((c, i) => <p key={i}><b>{c.name}</b> {c.text}</p>)}
            <form className={f.cmtIn} onSubmit={submit}>
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder={t.commentPlaceholder} aria-label={t.commentAria} />
              <button type="submit">{t.send}</button>
            </form>
          </div>
        )}
      </div>
    </article>
  )
}

export function Village() {
  const { state, dispatch, data } = useDemo()
  const t = data.ui.screens.village
  const label = (k: VillageFilter) => t.filters[k]
  return (
    <>
      <Head title={t.title} icon={t.icon} />
      <div className={styles.sw} role="group">
        {FILTERS.map((k) => (
          <button key={k} type="button" className={`${styles.txt} ${state.villageFilter === k ? styles.on : ''}`} aria-pressed={state.villageFilter === k}
            onClick={() => dispatch({ type: 'setVillageFilter', filter: k })}>{label(k)}</button>
        ))}
      </div>
      {data.village.map((p, n) => (state.villageFilter === 'all' || p.kind === state.villageFilter ? <Post key={n} n={n} /> : null))}
    </>
  )
}
