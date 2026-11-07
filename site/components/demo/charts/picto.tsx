import { ChartCard, Stk } from './card'
import c from './charts.module.css'

const FEEDS = [7, 8, 6, 7, 8, 7, 5]

/** One bottle per feed, per day. */
export function Feeds({ title, sub, days }: { title: string; sub: string; days: string[] }) {
  return (
    <ChartCard title={title} sub={sub} alt={`${title}, ${sub}: ${days.map((d, i) => `${d} ${FEEDS[i]}`).join(', ')}`}>
      <div className={c.picto}>
        {FEEDS.map((n, i) => <div key={i}>{days[i]}<p>{Array.from({ length: n }, (_, j) => <Stk key={j} name="bottle" />)}</p><b>{n}</b></div>)}
      </div>
    </ChartCard>
  )
}
