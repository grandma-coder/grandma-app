import type { CSSProperties, ReactNode } from 'react'
import type { StickerName } from '@/components/stickers/paths'
import { Ico } from '../sticker-ico'
import demo from '../demo.module.css'
import c from './charts.module.css'

/** Chart frame: title left, small mono sub-label right. */
export function ChartCard({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <div className={`${demo.card} ${c.chart}`}>
      <h5>{title}{sub != null && <span>{sub}</span>}</h5>
      {children}
    </div>
  )
}

/** A sticker with an animation index (`--k`) and an optional test id. `display: contents` keeps layout identical to a bare sticker. */
export function Stk({ name, k, testId, cut }: { name: StickerName; k?: number; testId?: string; cut?: boolean }) {
  const style = { display: 'contents', ...(k != null ? { '--k': k } : {}) } as CSSProperties
  return <span data-testid={testId} style={style}><Ico name={name} cut={cut} /></span>
}

/** Stickers with a caption underneath, used by the mood week and the pregnancy trail. */
export function FacesRow({ items }: { items: { icon: StickerName; label: string }[] }) {
  return (
    <div className={c.facesRow}>
      {items.map((x, i) => <span key={i}><Ico name={x.icon} />{x.label}</span>)}
    </div>
  )
}
