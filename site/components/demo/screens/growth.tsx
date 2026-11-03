'use client'

import type { GrowthKey } from '@/lib/demo'
import { GrowthChart } from '../charts/growth'
import { useDemo } from '../demo'
import { KidSwitch } from '../kid-switch'
import { currentKid } from '../kids'
import styles from '../demo.module.css'
import { Head, List, Row } from './parts'

const TABS: GrowthKey[] = ['weight', 'height', 'head']

export function Growth() {
  const { state, dispatch, data } = useDemo()
  const t = data.ui.screens.growth
  const kid = currentKid(state.kid)
  const g = data.growth[kid]
  const m = g[state.growthTab]
  const now = String(m.me[m.me.length - 1]).replace('.', data.ui.decimal)
  return (
    <>
      <Head title={t.title} icon={t.icon} />
      <KidSwitch all={false} />
      <div className={styles.sw} role="group">
        {TABS.map((k) => (
          <button key={k} type="button" className={`${styles.txt} ${state.growthTab === k ? styles.on : ''}`} aria-pressed={state.growthTab === k}
            onClick={() => dispatch({ type: 'setGrowthTab', tab: k })}>{t.tabs[k]}</button>
        ))}
      </div>
      <GrowthChart growth={g} tab={state.growthTab} title={t.chartTitles[state.growthTab]} curve={t.curve} />
      <div className={styles.tiles}>
        <div className={`${styles.tile} ${styles.card}`}><b>{now} {m.u}</b><span>{t.now}</span></div>
        <div className={`${styles.tile} ${styles.card}`}><b>{m.p}</b><span>{t.percentile}</span></div>
        <div className={`${styles.tile} ${styles.card}`}><b>{t.next[kid]}</b><span>{t.nextMeasure}</span></div>
      </div>
      <div className={styles.sec}><h4>{t.milestones}</h4></div>
      <List>{t.milestoneItems[kid].map((i) => <Row key={i.label} icon={i.icon} label={i.label} value={i.when} ok />)}</List>
    </>
  )
}
