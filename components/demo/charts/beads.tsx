import { ChartCard, Stk } from './card'
import c from './charts.module.css'

/** One row per day, a sticker per `per` units; counts from the mockup, label letters from the caller. */
export function Beads({ title, sub, days, values, icon, per, testId }: {
  title: string; sub: string; days: string[]; values: number[]; icon: 'heart' | 'bottle'; per: number; testId?: string
}) {
  let k = 0
  return (
    <ChartCard title={title} sub={sub}>
      <div className={c.beads} data-testid={testId}>
        {values.map((n, i) => (
          <div key={i}>{days[i]}<p>{Array.from({ length: Math.round(n / per) }, () => <Stk key={k} name={icon} k={k++} testId="heart" />)}</p><b>{n}</b></div>
        ))}
      </div>
    </ChartCard>
  )
}

export const KICKS = [10, 14, 9, 12, 15, 11, 12]
