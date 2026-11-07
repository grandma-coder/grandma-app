import { Sticker } from '@/components/stickers/sticker'
import type { StickerName } from '@/components/stickers/paths'
import type { CSSProperties } from 'react'
import styles from './demo.module.css'

/** A sticker sized by the demo's `.ico` rule; pass `extra` for a context class (e.g. `styles.fruit`). */
export function Ico({ name, cut, extra, style }: { name: StickerName; cut?: boolean; extra?: string; style?: CSSProperties }) {
  return <Sticker name={name} cut={cut} className={extra ? `${styles.ico} ${extra}` : styles.ico} style={style} />
}
