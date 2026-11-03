import type { CSSProperties } from 'react'
import { PATHS, type StickerName } from './paths'

type Props = { name: StickerName; cut?: boolean; className?: string; style?: CSSProperties }

export function Sticker({ name, cut, className, style }: Props) {
  const inner = `<g filter="url(#wob)">${PATHS[name]}</g>`
  return (
    <svg className={className} style={style} viewBox="-6 -6 76 76" aria-hidden="true" focusable="false">
      {/* PATHS are static, trusted SVG strings; no user input ever reaches this. */}
      <g filter={cut ? 'url(#cut)' : undefined} dangerouslySetInnerHTML={{ __html: inner }} />
    </svg>
  )
}
