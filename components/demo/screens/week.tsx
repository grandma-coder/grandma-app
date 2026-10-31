'use client'

import { Ico } from '../sticker-ico'
import { useDemo } from '../demo'
import { KidSwitch } from '../kid-switch'
import { CycleWheel } from '../charts/wheel'
import { LineChart, WeightBand } from '../charts/line'
import { Beads, KICKS } from '../charts/beads'
import { ChartCard, FacesRow } from '../charts/card'
import { Nights } from '../charts/nights'
import { Plate } from '../charts/plate'
import { Feeds } from '../charts/picto'
import { Heat } from '../charts/heat'
import { Trend } from '../charts/trend'
import { fmt, type KidId } from '@/lib/demo'
import styles from '../demo.module.css'
import c from '../charts/charts.module.css'

const BBT = [36.3, 36.4, 36.3, 36.5, 36.4, 36.4, 36.3, 36.4, 36.6, 36.7]
const BBT_DAYS = ['5', '6', '7', '8', '9', '10', '11', '12', '13', '14']
const MOODS = ['face3', 'face4', 'face3', 'face2', 'face3', 'face4', 'face4'] as const

export function Week() {
  const { state, data } = useDemo()
  const { ui } = data
  const phase = { pre: <WeekPre />, preg: <WeekPreg />, kids: <WeekKids />, meno: <WeekMeno /> }[state.mode]
  return (
    <>
      <div className={styles.topRow}><h3 className={styles.hHand}>{ui.week.title}</h3><Ico name="bars" /></div>
      {phase}
    </>
  )
}

const useDays = () => useDemo().data.ui.weekdays.mondayFirst

function Tiles({ items }: { items: { value: string; label: string }[] }) {
  return (
    <div className={styles.tiles}>
      {items.map((t) => <div key={t.label} className={`${styles.tile} ${styles.card}`}><b>{t.value}</b><span>{t.label}</span></div>)}
    </div>
  )
}

function WeekPre() {
  const { data } = useDemo()
  const ch = data.ui.charts, days = useDays()
  return (
    <>
      <CycleWheel />
      <LineChart vals={BBT} labels={BBT_DAYS} title={ch.bbtTitle} sub={ch.bbtSub} cover={36.45} coverLabel={ch.baseline} mark={9} markLabel={ch.ovulation} />
      <ChartCard title={ch.moodTitle} sub={ch.moodSub} alt={`${ch.moodTitle}: ${MOODS.map((f, i) => `${days[i]} ${data.ui.log.faces.find((x) => x.icon === f)?.label}`).join(', ')}`}>
        <FacesRow items={MOODS.map((icon, i) => ({ icon, label: days[i] }))} />
      </ChartCard>
    </>
  )
}

function WeekPreg() {
  const { data } = useDemo()
  const ch = data.ui.charts, days = useDays()
  const t = ch.pregTiles
  return (
    <>
      <Beads title={ch.kicksTitle} sub={ch.kicksSub} days={days} values={KICKS} icon="heart" per={2} testId="kicks" />
      <WeightBand title={ch.weightTitle} sub={ch.weightSub} weekLabel={(w) => fmt(ch.weekAbbr, { w })} />
      <ChartCard title={ch.trailTitle} sub={ch.trailSub} alt={`${ch.trailTitle}, ${ch.trailSub}: ${data.weeks.slice(0, 5).map((w) => `${w.week} ${w.name}`).join(', ')}`}>
        <FacesRow items={data.weeks.slice(0, 5).map((w) => ({ icon: w.icon, label: String(w.week) }))} />
      </ChartCard>
      <Tiles items={[{ value: t.gainValue, label: t.gainLabel }, { value: t.visitsValue, label: t.visitsLabel }, { value: t.sleepValue, label: t.sleepLabel }]} />
    </>
  )
}

function WeekKids() {
  const { state, dispatch, data } = useDemo()
  const ch = data.ui.charts, days = useDays()
  const show: KidId[] = state.kid === 'all' ? ['kenji', 'lua'] : [state.kid]
  return (
    <>
      <KidSwitch />
      <Nights days={days} show={show} />
      {show.includes('kenji') && <Plate />}
      {show.includes('lua') && <Feeds title={ch.feedsTitle} sub={ch.feedsSub} days={days} />}
      <button type="button" className={c.seeGrowth} onClick={() => dispatch({ type: 'openScreen', screen: 'growth' })}>
        <Ico name="ruler" />{ch.seeGrowth}
      </button>
    </>
  )
}

function WeekMeno() {
  const { data } = useDemo()
  const ch = data.ui.charts, days = useDays()
  const t = ch.menoTiles
  return (
    <>
      <Heat title={ch.heatTitle} sub={ch.heatSub} note={ch.heatNote} slots={ch.heatSlots} days={days} />
      <Trend title={ch.trendTitle} sub={ch.trendSub} weekLabel={ch.trendWeek} />
      <Tiles items={[{ value: t.sleepValue, label: t.sleepLabel }, { value: t.fogValue, label: t.fogLabel }, { value: t.dropValue, label: t.dropLabel }]} />
    </>
  )
}
