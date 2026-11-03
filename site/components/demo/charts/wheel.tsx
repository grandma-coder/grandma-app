'use client'

import { useState } from 'react'
import { fmt, type CycPhase } from '@/lib/demo'
import { Ico } from '../sticker-ico'
import { useDemo } from '../demo'
import { ChartCard } from './card'
import c from './charts.module.css'

const TODAY = 14
const R = 104
export const phaseOf = (d: number): CycPhase => (d <= 5 ? 'per' : d <= 12 ? 'fol' : d <= 15 ? 'ovu' : 'lut')
const r2 = (n: number) => Math.round(n * 100) / 100

/** 28-day cycle wheel: one sticker per day, today at 6 o'clock with a dotted aura, tap a day to read it in the centre. */
export function CycleWheel() {
  const { data } = useDemo()
  const { cyc, ui } = data
  const [sel, setSel] = useState(TODAY)
  const now = cyc[phaseOf(sel)]
  return (
    <ChartCard title={ui.charts.cycleTitle} sub={ui.charts.tapDay}>
      <div className={c.wheel}>
        {Array.from({ length: 28 }, (_, i) => {
          const d = i + 1, a = ((90 + ((d - TODAY) * 360) / 28) * Math.PI) / 180
          const cls = `${c.wd} ${d === TODAY ? c.today : ''} ${d === sel ? c.sel : ''}`
          return (
            <button key={d} type="button" className={cls} aria-label={`${fmt(ui.cycle.dayAria, { d })}, ${cyc[phaseOf(d)].name}`} aria-current={d === TODAY ? 'date' : undefined} aria-pressed={d === sel}
              style={{ left: r2(128 + R * Math.cos(a)), top: r2(128 + R * Math.sin(a)), '--k': i } as React.CSSProperties}
              onClick={() => setSel(d)}>
              <Ico name={cyc[phaseOf(d)].icon} />
            </button>
          )
        })}
        <div className={c.wc} data-testid="wheel-centre" aria-live="polite">
          <small>{ui.cycle.day}</small><b>{sel}</b><i>{now.name}</i>
          <span>{sel === TODAY ? ui.cycle.todayPrefix : ''}{now.what}</span>
        </div>
      </div>
      <div className={`${c.legend} ${c.stkL}`}>
        {(Object.keys(cyc) as CycPhase[]).map((k) => <span key={k}><Ico name={cyc[k].icon} />{cyc[k].name}</span>)}
      </div>
    </ChartCard>
  )
}
