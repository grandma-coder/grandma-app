'use client'

import { useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
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
 * A hero sticker that pops in (and boings on tap). WebKit can keep the filtered SVG rasterized at the animation's tiny
 * start scale long after it ends (blurry stickers on iOS / the Instagram in-app browser), so each finished animation
 * remounts the SVG and it repaints at full size.
 */
function Rebus({ name, i }: { name: StickerName; i: number }) {
  const [paint, setPaint] = useState(0)
  return (
    <span className={s.reb} style={{ '--i': i } as CSSProperties} onClick={boing} onAnimationEnd={() => setPaint((n) => n + 1)} aria-hidden="true">
      <Sticker key={paint} name={name} className={s.ico} />
    </span>
  )
}

/**
 * Renders copy with inline stickers, each glued to the word before it (`white-space: nowrap`) so a
 * sticker never starts a line on its own. The gap before a sticker is a margin, not a space character,
 * so the text (and the accessible name) reads "life, …" with no stray space before punctuation. `rebus` adds the hero's staggered pop-in and boing on tap.
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
        {word}
        {rebus ? (
          <Rebus name={name} i={i} />
        ) : (
          <Sticker name={name} className={`${s.ico} ${s.tok}`} />
        )}
        {punct}
      </span>,
    )
  }
  if (last < text.length) out.push(text.slice(last))
  return <>{out}</>
}
