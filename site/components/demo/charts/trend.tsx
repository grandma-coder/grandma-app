import { ChartCard, Stk } from './card'
import { fmt } from '@/lib/demo'
import c from './charts.module.css'

const WEEKLY = [9, 8, 7, 6, 5, 3]

export function Trend({ title, sub, weekLabel }: { title: string; sub: string; weekLabel: string }) {
  let k = 0
  return (
    <ChartCard title={title} sub={sub} alt={`${title}, ${sub}: ${WEEKLY.map((n, i) => `${fmt(weekLabel, { n: i + 1 })} ${n}`).join(', ')}`}>
      <div className={c.trend} data-testid="trend">
        {WEEKLY.map((n, i) => (
          <div key={i}>{fmt(weekLabel, { n: i + 1 })}{Array.from({ length: n }, () => <Stk key={k} name="flame" k={k++} testId="flame" />)}<b>{n}</b></div>
        ))}
      </div>
    </ChartCard>
  )
}
