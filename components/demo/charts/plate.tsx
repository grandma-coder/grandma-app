'use client'

import { ChartCard } from './card'
import { useDemo } from '../demo'
import c from './charts.module.css'

const r2 = (n: number) => Math.round(n * 100) / 100

/** Annular slice from angle a0 to a1 (degrees). */
export function arc(cx: number, cy: number, r1: number, r2_: number, a0: number, a1: number) {
  const p = (r: number, a: number) => [r2(cx + r * Math.cos((a * Math.PI) / 180)), r2(cy + r * Math.sin((a * Math.PI) / 180))]
  const [x1, y1] = p(r2_, a0), [x2, y2] = p(r2_, a1), [x3, y3] = p(r1, a1), [x4, y4] = p(r1, a0)
  return `M${x1} ${y1}A${r2_} ${r2_} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${r1} ${r1} 0 0 0 ${x4} ${y4}Z`
}

/** Plate split as a pie plus a protein meter. Percentages and labels are seed copy (data.ui.charts.plate). */
export function Plate() {
  const { data } = useDemo()
  const { ui } = data
  const ch = ui.charts
  let a = -90
  const slices = ch.plate.map((p) => {
    const a0 = a, a1 = a + p.pct * 3.6
    a = a1
    return <path key={p.label} d={arc(60, 60, 0.01, 54, a0 + 0.8, a1 - 0.8)} fill={p.tone} stroke="#161513" strokeWidth="1.8" />
  })
  const meter = parseInt(ch.proteinSub, 10)
  return (
    <ChartCard title={ch.plateTitle} sub={ch.plateSub}>
      <div className={c.plateW}>
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r="59" fill="#fff" stroke="#161513" strokeWidth="1.8" />
          <g filter="url(#wob)">{slices}</g>
        </svg>
        <ul>{ch.plate.map((p) => <li key={p.label}><i style={{ background: p.tone }} />{p.label}<b>{p.pct}%</b></li>)}</ul>
      </div>
      <h5 style={{ marginTop: 12 }}>{ch.proteinTitle}<span>{ch.proteinSub}</span></h5>
      <div className={c.meter}><i style={{ '--w': `${Number.isFinite(meter) ? meter : 86}%` } as React.CSSProperties} /></div>
      <p className={c.note}>{ch.proteinNote}</p>
    </ChartCard>
  )
}
