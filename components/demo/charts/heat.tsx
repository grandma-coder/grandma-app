import type { CSSProperties } from 'react'
import { ChartCard, Stk } from './card'
import c from './charts.module.css'

// rows are time-of-day slots, columns Monday → Sunday; value = how many hot flashes
const GRID = [[0, 2, 0, 3, 0, 0, 1], [1, 0, 0, 0, 2, 0, 0], [0, 3, 0, 0, 0, 2, 0], [2, 0, 1, 0, 0, 0, 0]]

export function Heat({ title, sub, note, slots, days }: { title: string; sub: string; note: string; slots: string[]; days: string[] }) {
  return (
    <ChartCard title={title} sub={sub}>
      <div className={c.heat} data-testid="heat">
        <span />
        {days.map((d, i) => <span key={i} className={c.d}>{d}</span>)}
        {GRID.map((row, i) => (
          <div key={i} style={{ display: 'contents' }}>
            <span>{slots[i]}</span>
            {row.map((v, j) => (
              <div key={j} className={c.c} style={{ '--z': `${10 + v * 5}px` } as CSSProperties}>{v ? <Stk name="flame" testId="flame" /> : null}</div>
            ))}
          </div>
        ))}
      </div>
      <p className={c.note}>{note}</p>
    </ChartCard>
  )
}
