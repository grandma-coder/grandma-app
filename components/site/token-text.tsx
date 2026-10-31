'use client'

import type { CSSProperties, MouseEvent, ReactNode } from 'react'
import { Sticker } from '@/components/stickers/sticker'
import { PATHS, type StickerName } from '@/components/stickers/paths'
import s from './site.module.css'

/** `word [sticker]` plus optional trailing punctuation, as written in the v3 messages. */
const TOKEN = /(\S+) \[(\w+)\]([.,]?)/g
const isSticker = (n: string): n is StickerName => Object.hasOwn(PATHS, n)

function boing(e: MouseEvent<HTMLSpanElement>) {
  const el = e.currentTarget
  el.classList.remove(s.boing)
  void el.getBoundingClientRect()
  el.classList.add(s.boing)
}

/**
 * Renders copy with inline stickers, each glued to the word before it (`white-space: nowrap`) so a
 * sticker never starts a line on its own. `rebus` adds the hero's staggered pop-in and boing on tap.
 */
export function TokenText({ text, rebus = false }: { text: string; rebus?: boolean }) {
  const out: ReactNode[] = []
  let last = 0
  let k = 0
  for (const m of text.matchAll(TOKEN)) {
    const [all, word, name, punct] = m
    if (m.index > last) out.push(text.slice(last, m.index))
    last = m.index + all.length
    if (!isSticker(name)) { out.push(all); continue }
    const i = k++
    out.push(
      <span key={i} style={{ whiteSpace: 'nowrap' }}>
        {word}{' '}
        {rebus ? (
          <span className={s.reb} style={{ '--i': i } as CSSProperties} onClick={boing} aria-hidden="true">
            <Sticker name={name} className={s.ico} />
          </span>
        ) : (
          <Sticker name={name} className={s.ico} />
        )}
        {punct}
      </span>,
    )
  }
  if (last < text.length) out.push(text.slice(last))
  return <>{out}</>
}
