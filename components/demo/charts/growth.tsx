import type { Growth, GrowthKey } from '@/lib/demo'
import { ChartCard } from './card'
import c from './charts.module.css'

const INK = '#161513'
const W = 300, H = 170
const r2 = (n: number) => Math.round(n * 100) / 100

/** WHO percentile band (p3-p97), dashed median and the child's own line. Used by the growth screen. */
export function GrowthChart({ growth, tab, title, curve }: { growth: Growth; tab: GrowthKey; title: string; curve: string }) {
  const m = growth[tab], n = growth.xs.length
  const all = [...m.p3, ...m.p97, ...m.me]
  const min = Math.min(...all), max = Math.max(...all)
  const X = (i: number) => r2(26 + (i * (W - 36)) / (n - 1))
  const Y = (v: number) => r2(H - 18 - ((v - min) / (max - min)) * (H - 30))
  const line = (arr: number[]) => arr.map((v, i) => `${X(i)},${Y(v)}`).join(' ')
  const band = `${line(m.p97)} ${m.p3.map((v, i) => `${X(i)},${Y(v)}`).reverse().join(' ')}`
  return (
    <ChartCard title={`${title} (${m.u})`} sub={curve}>
      <svg className={c.gsvg} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <polygon points={band} style={{ fill: 'var(--mc)' }} opacity=".55" />
        <polyline points={line(m.p50)} fill="none" stroke="#8C877C" strokeWidth="1.5" strokeDasharray="5 4" />
        <text x={X(n - 1) + 2} y={Y(m.p97[n - 1]) - 3} textAnchor="end" className={c.svgText} style={{ fontSize: 8 }}>p97</text>
        <text x={X(n - 1) + 2} y={Y(m.p3[n - 1]) + 11} textAnchor="end" className={c.svgText} style={{ fontSize: 8 }}>p3</text>
        <g filter="url(#wob)">
          <path d={`M20 ${H - 12}H${W - 4}`} stroke={INK} strokeWidth="2" fill="none" />
          <polyline points={line(m.me)} fill="none" stroke={INK} strokeWidth="2.8" strokeLinejoin="round" />
          {m.me.map((v, i) => <circle key={i} cx={X(i)} cy={Y(v)} r={i === n - 1 ? 7 : 4.5} style={{ fill: i === n - 1 ? 'var(--ma)' : '#fff' }} stroke={INK} strokeWidth="2" />)}
        </g>
        {growth.xl.map((t, i) => <text key={i} x={X(i)} y={H + 4} textAnchor="middle" className={c.svgText}>{t}</text>)}
      </svg>
    </ChartCard>
  )
}
