import { Fragment } from 'react'
import { ChartCard } from './card'
import c from './charts.module.css'

const INK = '#161513'
const W = 300
const dot = (hi: boolean) => ({ fill: hi ? 'var(--ma)' : 'var(--mc)' })
const r2 = (n: number) => Math.round(n * 100) / 100

/** Basal-temperature style line: ink polyline, soft dots, last (and `mark`) dot in the accent. `cover` draws a dashed baseline. */
export function LineChart({ vals, labels, title, sub, cover, coverLabel, mark, markLabel }: {
  vals: number[]; labels: string[]; title: string; sub: string
  cover?: number; coverLabel?: string; mark?: number; markLabel?: string
}) {
  const h = 120
  const all = cover != null ? [...vals, cover] : vals
  const min = Math.min(...all), max = Math.max(...all), pad = (max - min) * 0.25 || 1
  const Y = (v: number) => r2(h - 14 - ((v - min + pad) / (max - min + 2 * pad)) * (h - 28))
  const pts = vals.map((v, i): [number, number] => [r2(12 + (i * (W - 24)) / (vals.length - 1)), Y(v)])
  return (
    <ChartCard title={title} sub={sub}>
      <svg className={c.lineSvg} viewBox={`0 0 ${W} ${h}`} aria-hidden="true">
        {cover != null && (
          <>
            <path d={`M6 ${Y(cover)}H${W - 6}`} stroke="#1E8A6A" strokeWidth="1.5" strokeDasharray="5 4" fill="none" />
            <text x={W - 6} y={Y(cover) - 5} textAnchor="end" className={c.svgText} style={{ fontSize: 8, fill: '#1E8A6A' }}>{coverLabel}</text>
          </>
        )}
        <g filter="url(#wob)">
          <path d={`M6 ${h - 6}H${W - 6}`} stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none" />
          <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
          {pts.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i === mark ? 8 : 4.5} style={dot(i === mark || i === pts.length - 1)} stroke={INK} strokeWidth="2" />
          ))}
        </g>
        {mark != null && <text x={pts[mark][0]} y={pts[mark][1] - 13} textAnchor="middle" className={c.svgHand}>{markLabel}</text>}
        {pts.map(([x], i) => <text key={i} x={x} y={h + 12} textAnchor="middle" className={c.svgText}>{labels[i]}</text>)}
      </svg>
    </ChartCard>
  )
}

/** Weight gain against a recommended band (pregnancy). Numbers are the mockup's, the labels come from `labels`. */
const WKS = [8, 12, 16, 20, 24]
const LO = [0, 0.5, 1.5, 3, 4.5], HI = [1.5, 2.5, 4, 6, 8], ME = [0.8, 1.6, 3, 4.6, 6.2]
export function WeightBand({ title, sub, weekLabel }: { title: string; sub: string; weekLabel: (w: number) => string }) {
  const h = 130
  const X = (i: number) => r2(24 + (i * (W - 34)) / 4)
  const Y = (v: number) => r2(h - 16 - (v / 9) * (h - 26))
  const band = [...HI.map((v, i) => `${X(i)},${Y(v)}`), ...LO.map((v, i) => `${X(i)},${Y(v)}`).reverse()].join(' ')
  return (
    <ChartCard title={title} sub={sub}>
      <svg className={c.lineSvg} viewBox={`0 0 ${W} ${h}`} aria-hidden="true">
        <polygon points={band} style={{ fill: 'var(--mc)' }} opacity=".6" />
        <g filter="url(#wob)">
          <path d={`M16 ${h - 10}H${W - 4}`} stroke={INK} strokeWidth="2" fill="none" />
          <polyline points={ME.map((v, i) => `${X(i)},${Y(v)}`).join(' ')} fill="none" stroke={INK} strokeWidth="2.6" />
          {ME.map((v, i) => <circle key={i} cx={X(i)} cy={Y(v)} r={i === 4 ? 7 : 4.5} style={{ fill: i === 4 ? 'var(--ma)' : '#fff' }} stroke={INK} strokeWidth="2" />)}
        </g>
        {WKS.map((t, i) => <Fragment key={t}><text x={X(i)} y={h + 6} textAnchor="middle" className={c.svgText}>{weekLabel(t)}</text></Fragment>)}
      </svg>
    </ChartCard>
  )
}
