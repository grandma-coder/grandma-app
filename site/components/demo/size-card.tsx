'use client'

import { fmt } from '@/lib/demo'
import { Ico } from './sticker-ico'
import { useDemo } from './demo'
import styles from './demo.module.css'

const SOFT = { color: 'rgba(22,21,19,.6)' } as const
const HERE_WEEK = 24

/** Pregnancy: how big is the baby, with a week slider. */
export function SizeCard() {
  const { state, dispatch, data } = useDemo()
  const { weeks, ui } = data
  const i = state.week
  const w = weeks[i]
  const here = w.week === HERE_WEEK
  const fact = here ? ui.size.factHere : fmt(w.week < HERE_WEEK ? ui.size.weeksAgo : ui.size.weeksAhead, { n: Math.abs(HERE_WEEK - w.week) })
  return (
    <div className={`${styles.size} ${styles.card}`}>
      <span className={styles.lbl} style={SOFT}>{here ? ui.size.here : fmt(ui.size.week, { w: w.week })}</span>
      <Ico key={i} name={w.icon} extra={`${styles.fruit} ${styles.bump}`} />
      <h5>{fmt(ui.size.sizeOf, { name: w.name })}</h5>
      <div className={styles.meas}>
        <span>{ui.size.length}<b>{w.len}</b></span>
        <span>{ui.size.weight}<b>{w.wt}</b></span>
      </div>
      <p className={styles.fact}>{fact}</p>
      <input type="range" min={0} max={weeks.length - 1} step={1} value={i} aria-label={ui.size.sliderAria}
        onChange={(e) => dispatch({ type: 'setWeek', week: Number(e.target.value) })} />
      <div className={styles.wk}>{weeks.map((x) => <span key={x.week}>{x.week}</span>)}</div>
    </div>
  )
}
