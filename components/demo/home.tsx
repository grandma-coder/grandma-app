'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { fmt, forGoal } from '@/lib/demo'
import { Ico } from './sticker-ico'
import { useDemo } from './demo'
import { KidSwitch } from './kid-switch'
import { LogRow } from './log-row'
import { SizeCard } from './size-card'
import { KID_IDS } from './kids'
import styles from './demo.module.css'

const SOFT = { color: 'rgba(22,21,19,.6)' } as const

export function Home() {
  const { state, dispatch, data, onNudge } = useDemo()
  const { ui } = data
  const phase = data.phases[state.mode]
  const [today, setToday] = useState('')
  // formatted after mount: server and client may disagree on the date
  useEffect(() => {
    setToday(new Date().toLocaleDateString(ui.dateLocale, { weekday: 'long', day: 'numeric', month: 'short' }))
  }, [ui.dateLocale])

  const chips = forGoal(phase.chips, state.goal)
  const quick = forGoal(phase.quick, state.goal)
  const all = state.items[state.mode]
  // key by distance from the end: new rows are prepended, so existing rows keep their key and only the new one animates in
  const rows = all.map((item, i) => ({ item, key: all.length - i })).filter(({ item }) => state.mode !== 'kids' || state.kid === 'all' || item.kid === state.kid)

  return (
    <>
      <span className={styles.lbl} suppressHydrationWarning>{today}</span>
      <div className={styles.topRow}>
        <h3 className={styles.hHand}>{fmt(ui.home.hello, { name: ui.user })}</h3>
        <Ico name={phase.icon} />
      </div>
      {state.logs >= 2 && (
        <button type="button" className={`${styles.nudge} ${styles.show}`} onClick={onNudge}>
          <Ico name="star" />
          <span className={styles.nudgeTxt}><b>{ui.home.nudgeTitle}</b><span>{ui.home.nudgeSub}</span></span>
        </button>
      )}
      <Top />
      <div className={styles.sec}><h4>{ui.home.registerToday}</h4><span className={styles.lbl}>{ui.home.tapSign}</span></div>
      <div className={styles.chips}>
        {chips.map((c) => (
          <button key={c.id} type="button" className={`${styles.chip} ${state.logged[state.mode][c.id] ? styles.logged : ''}`}
            onClick={() => dispatch({ type: 'openSheet', sheet: { kind: 'log', chip: c.id } })}>
            <Ico name={c.icon} />{c.label}
          </button>
        ))}
      </div>
      <div className={styles.sec}><h4>{ui.home.today}</h4><span className={styles.lbl}>{fmt(ui.home.records, { n: rows.length })}</span></div>
      <ul className={styles.today} data-testid="today">
        {rows.map(({ item, key }) => <LogRow key={key} item={item} />)}
      </ul>
      <div className={styles.sec}><h4>{ui.home.quickAccess}</h4></div>
      <div className={styles.quick}>
        {quick.map((q) => {
          const s = ui.screens[q.screen]
          return (
            <button key={q.screen} type="button" className={`${styles.qa} ${styles.card}`} onClick={() => dispatch({ type: 'openScreen', screen: q.screen })}>
              <Ico name={s.icon} /><b>{s.title}</b><small>{q.sub}</small>
            </button>
          )
        })}
      </div>
    </>
  )
}

/** Phase-specific block under the greeting: hero, duo cards or the pregnancy size card. */
function Top() {
  const { state, dispatch, data } = useDemo()
  const { ui } = data
  const phase = data.phases[state.mode]

  if (state.mode === 'preg') return <PregTop />

  if (state.mode === 'kids' && phase.kidHero) {
    if (state.kid === 'all') {
      return (
        <>
          <KidSwitch />
          <div className={styles.duo}>
            {KID_IDS.map((id) => {
              const k = data.kids[id], h = phase.kidHero![id]
              return (
                <button key={id} type="button" className={`${styles.kidc} ${styles.card}`} style={{ '--kc': k.tone } as CSSProperties}
                  onClick={() => dispatch({ type: 'setKid', kid: id })}>
                  <span className={styles.nm}>{k.name}</span>
                  <small>{k.age}</small>
                  <span className={styles.n}>{h.n}</span>
                  <small>{h.em}</small>
                  <Ico name={k.icon} />
                  <span className={styles.r}>{h.row[1].label}<b>{h.row[1].value}</b></span>
                </button>
              )
            })}
          </div>
        </>
      )
    }
    const k = data.kids[state.kid], h = phase.kidHero[state.kid]
    return (
      <>
        <KidSwitch />
        <div className={`${styles.heroCard} ${styles.card}`} style={{ background: k.tone }}>
          <span className={styles.lbl} style={SOFT}>{k.name}, {k.age}</span>
          <div className={styles.n}>{h.n}<i>{h.em}</i></div>
          <div className={styles.row}>{h.row.map((r) => <span key={r.label}>{r.label}<b>{r.value}</b></span>)}</div>
          <Ico name={k.icon} />
        </div>
      </>
    )
  }

  const hero = phase.hero && forGoal(phase.hero, state.goal)
  return (
    <>
      {state.mode === 'pre' && <GoalSwitch />}
      {hero && (
        <div className={`${styles.heroCard} ${styles.card}`}>
          <span className={styles.lbl} style={SOFT}>{hero.label}</span>
          <div className={styles.n}>{hero.n}<i>{hero.em}</i></div>
          <div className={styles.row}>{hero.row.map((r) => <span key={r.label}>{r.label}<b>{r.value}</b></span>)}</div>
          <Ico name={hero.icon} />
        </div>
      )}
    </>
  )
}

function GoalSwitch() {
  const { state, dispatch, data } = useDemo()
  return (
    <div className={styles.sw}>
      {(['track', 'ttc'] as const).map((g) => (
        <button key={g} type="button" className={`${styles.txt} ${state.goal === g ? styles.on : ''}`} aria-pressed={state.goal === g}
          onClick={() => dispatch({ type: 'setGoal', goal: g })}>
          {g === 'track' ? data.ui.home.goalTrack : data.ui.home.goalTtc}
        </button>
      ))}
    </div>
  )
}

function PregTop() {
  const { state, data } = useDemo()
  const t = data.ui.home.pregTiles
  const kicksLabel = forGoal(data.phases.preg.chips, state.goal).find((c) => c.id === 'kicks')?.label
  const kicksLogged = state.items.preg.filter((x) => x.label === kicksLabel).length
  return (
    <>
      <SizeCard />
      <div className={styles.tiles}>
        <div className={`${styles.tile} ${styles.card}`}><b>{t.daysValue}</b><span>{t.daysLabel}</span></div>
        <div className={`${styles.tile} ${styles.card}`}><b>{12 + kicksLogged - 1}</b><span>{t.kicksLabel}</span></div>
        <div className={`${styles.tile} ${styles.card}`}><b>{t.visitValue}</b><span>{t.visitLabel}</span></div>
      </div>
    </>
  )
}
