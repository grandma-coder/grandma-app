'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { forGoal, type Chan } from '@/lib/demo'
import { Ico } from '../sticker-ico'
import { useDemo } from '../demo'
import f from './features.module.css'
import { Head, Note, reducedMotion } from './parts'
import { Community } from './community'

const REPLY_MS = 1400

function ChatView({ chan }: { chan: Chan }) {
  const { state, dispatch, data } = useDemo()
  const t = data.ui.screens.community
  const list = state.chats[chan.id] ?? []
  const typing = state.typing === chan.id
  const [text, setText] = useState('')
  const root = useRef<HTMLDivElement>(null)

  // The simulated reply is a timer owned by this view: it dies on unmount (back, mode switch) and restarts on every send.
  useEffect(() => {
    if (!typing) return
    const id = setTimeout(() => dispatch({ type: 'receiveReply', channel: chan.id }), reducedMotion() ? 0 : REPLY_MS)
    return () => clearTimeout(id)
  }, [typing, list.length, chan.id, dispatch])

  useEffect(() => {
    const scroller = root.current?.closest<HTMLElement>('[data-screen]')
    if (scroller) scroller.scrollTop = scroller.scrollHeight
  }, [list.length, typing])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    dispatch({ type: 'sendChat', channel: chan.id, text })
    setText('')
  }

  return (
    <div ref={root} className={f.chatPage}>
      <Head title={chan.title} icon={chan.icon} small />
      <Note>{chan.kind === 'anon' ? t.noteAnon : t.noteOpen}</Note>
      <div className={f.chat}>
        {list.map((m, i) => (
          <div key={i} className={`${f.msg} ${m.me ? f.me : ''}`}>
            {!m.me && <Ico name={m.icon} />}
            <div className={f.bub}>
              <b>{m.who}</b>{m.text}
              {!m.me && (
                <><br /><button type="button" className={`${f.re} ${m.mine ? f.on : ''}`} aria-label={`${t.likeMsgAria} ${m.likes}`} aria-pressed={!!m.mine} onClick={() => dispatch({ type: 'likeMsg', channel: chan.id, index: i })}>♡ {m.likes}</button></>
              )}
            </div>
          </div>
        ))}
        {typing && <p className={f.typing} role="status">{t.typing}</p>}
      </div>
      <form className={f.composer} onSubmit={submit}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={t.composerPlaceholder} aria-label={t.composerAria} />
        <button type="submit">{data.ui.send}</button>
      </form>
    </div>
  )
}

/** Chat screen. An unknown channel (stale id after a phase switch) falls back to the channel list. */
export function Chat() {
  const { state, data } = useDemo()
  const chan = typeof state.arg === 'string' ? forGoal(data.phases[state.mode].chans, state.goal).find((c) => c.id === state.arg) : undefined
  return chan ? <ChatView key={chan.id} chan={chan} /> : <Community />
}
