'use client'

import type { CSSProperties } from 'react'
import type { KidId, LogItem } from '@/lib/demo'
import { Ico } from '../sticker-ico'
import { useDemo } from '../demo'
import { KidSwitch } from '../kid-switch'
import { KID_IDS } from '../kids'
import styles from '../demo.module.css'
import s from './screens.module.css'

const cls = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ')

function KidTag({ id }: { id: KidId | null }) {
  const { data } = useDemo()
  if (!id) return null
  return <span className={styles.tag} style={{ '--tc': data.kids[id].tone } as CSSProperties}>{data.kids[id].name}</span>
}

function LogRow({ item }: { item: LogItem }) {
  return (
    <li className={cls(styles.log, styles.card)}>
      <Ico name={item.icon} />
      <div><b>{item.label}<KidTag id={item.kid} /></b><span>{item.value}</span></div>
      <time>{item.time}</time>
    </li>
  )
}

export function Agenda() {
  const { state, data } = useDemo()
  const { ui, demoDate: dd } = data
  const phase = data.phases[state.mode]
  const c = phase.cal
  const kids = state.mode === 'kids'
  // everything derives from the fixed demo date (UTC), so server and client render the same month
  const first = new Date(Date.UTC(dd.year, dd.month - 1, 1))
  const monthLabel = first.toLocaleDateString(ui.dateLocale, { month: 'long', year: 'numeric', timeZone: 'UTC' })
  const blanks = first.getUTCDay()
  const total = new Date(Date.UTC(dd.year, dd.month, 0)).getUTCDate()
  const mine = (k: KidId | null) => !kids || state.kid === 'all' || !k || k === state.kid
  const events = phase.events.filter((e) => mine(e.kid))
  const items = state.items[state.mode].filter((x) => mine(x.kid))

  return (
    <>
      <div className={styles.topRow}><h3 className={styles.hHand}>{ui.agenda.title}</h3><Ico name="cal" /></div>
      {kids && <KidSwitch />}
      <div className={cls(s.month, styles.card)}>
        <div className={s.mh}><span>{monthLabel}</span><span className={styles.lbl}>{phase.name}</span></div>
        <div className={s.g} data-testid="month">
          {ui.weekdays.sundayFirst.map((w, i) => <small key={i}>{w}</small>)}
          {Array.from({ length: blanks }, (_, i) => <span key={`b${i}`} data-blank="" />)}
          {Array.from({ length: total }, (_, i) => i + 1).map((d) => {
            const per = c.per.includes(d), fer = c.fer.includes(d), ev = c.ev.includes(d), today = d === dd.day
            return (
              <span key={d} data-day={d} data-per={per ? '' : undefined} data-fer={fer ? '' : undefined} data-ev={ev ? '' : undefined} data-today={today ? '' : undefined}
                className={cls(today && s.today, per && s.per, fer && s.fer, ev && s.ev, c.dots.includes(d) && s.dot)}>
                {d}
                {c.star === d && <Ico name="star" />}
                {c.kd && (
                  <b className={s.kd}>
                    {KID_IDS.filter((id) => c.kd![id].includes(d) && (state.kid === 'all' || state.kid === id)).map((id) => (
                      <i key={id} data-kid-dot={id} style={{ background: data.kids[id].dot }} />
                    ))}
                  </b>
                )}
              </span>
            )
          })}
        </div>
        <div className={s.legend}>
          {c.legend.map((l) => (
            <span key={l.label}><i style={{ background: l.color, ...(l.ring ? { borderColor: l.ring, borderWidth: 2 } : {}) }} />{l.label}</span>
          ))}
        </div>
      </div>
      <div className={styles.sec}><h4>{ui.agenda.next}</h4><span className={styles.lbl}>{ui.agenda.shared}</span></div>
      <ul className={s.events}>
        {events.map((e, i) => (
          <li key={i} className={cls(s.evRow, styles.card)}>
            <Ico name={e.icon} />
            <div><b>{e.title}<KidTag id={e.kid} /></b><span>{e.sub}</span></div>
            <em>{e.when}</em>
          </li>
        ))}
      </ul>
      <div className={styles.sec}><h4>{ui.agenda.today}</h4></div>
      <ul className={styles.today}>{items.map((x, i) => <LogRow key={`${items.length - i}`} item={x} />)}</ul>
    </>
  )
}
