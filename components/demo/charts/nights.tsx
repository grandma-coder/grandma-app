import type { CSSProperties } from 'react'
import type { KidId } from '@/lib/demo'
import { ChartCard } from './card'
import { useDemo } from '../demo'
import c from './charts.module.css'

// [bedtime, wake-up] in decimal hours; the axis runs 18h → 8h (14h span)
const KENJI = [[19.5, 6.5], [20, 6.75], [19.75, 7], [19.5, 6.25], [20.25, 6.5], [19.5, 7.25], [20, 6.5]]
const LUA = [[19, 6], [19.25, 5.5], [18.75, 6.25], [19, 5.75], [19.5, 6], [19, 6.5], [19.25, 6]]
const START = 18, SPAN = 14
const pos = (t: number) => ((t - START + 24) % 24) / SPAN * 100

/** Sleep bars per night; Lua's bars are naps-height, as in the mockup. `show` is which children to draw. */
export function Nights({ days, show }: { days: string[]; show: KidId[] }) {
  const { data } = useDemo()
  const { ui, kids } = data
  const bar = (n: number[], id: KidId, nap: boolean) => (
    <i className={nap ? c.nap : undefined} style={{ '--a': `${pos(n[0])}%`, '--w': `${pos(n[1]) - pos(n[0])}%`, '--c': kids[id].tone } as CSSProperties} />
  )
  return (
    <ChartCard title={ui.charts.nightsTitle} sub={ui.charts.nightsSub}>
      <div className={c.nights}>
        {KENJI.map((n, i) => (
          <div key={i} style={{ display: 'contents' }}>
            {show.includes('kenji') && <div className={c.night} data-night="kenji">{days[i]}<div className={c.tr}>{bar(n, 'kenji', false)}</div></div>}
            {show.includes('lua') && <div className={c.night} data-night="lua"><span /><div className={c.tr}>{bar(LUA[i], 'lua', true)}</div></div>}
          </div>
        ))}
      </div>
      <div className={c.axis}>{ui.charts.nightsAxis.map((t) => <span key={t}>{t}</span>)}</div>
      <div className={c.legend}>
        {show.includes('kenji') && <span><i style={{ background: kids.kenji.tone }} />{ui.charts.kenjiLegend}</span>}
        {show.includes('lua') && <span><i style={{ background: kids.lua.tone }} />{ui.charts.luaLegend}</span>}
      </div>
    </ChartCard>
  )
}
