'use client'

import { useState } from 'react'
import { fmt, type ChipId, type KidId, type OptKey } from '@/lib/demo'
import type { StickerName } from '@/components/stickers/paths'
import { Ico } from './sticker-ico'
import { useChips, useDemo } from './demo'
import { currentKid, KID_IDS } from './kids'
import type { ToastState } from './toast'
import styles from './demo.module.css'

type Cfg = { min: number; max: number; step: number; v: number; unit: string }

function RangeVis({ chip, v, cfg }: { chip: ChipId; v: number; cfg: Cfg }) {
  const { data } = useDemo()
  const vis = data.rangeVis[chip]
  if (!vis) return null
  if (vis.how === 'count') {
    const n = Math.round(v)
    return <>{Array.from({ length: n }, (_, k) => <Ico key={k} name={vis.icon} extra={k === n - 1 ? styles.in : undefined} />)}</>
  }
  const z = Math.round(34 + ((v - cfg.min) / (cfg.max - cfg.min)) * 46)
  return <Ico name={vis.icon} style={{ ['--z' as string]: `${z}px` }} />
}

/** One sheet for every chip: mood faces, sticker tiles, a range with a growing sticker, or a kick counter. */
export function LogSheet({ chipId, onCheer }: { chipId: ChipId; onCheer: (t: Omit<ToastState, 'n'>) => void }) {
  const { state, dispatch, data } = useDemo()
  const { ui } = data
  const chip = useChips().find((c) => c.id === chipId)
  const cfg = chip?.cfg
  const [face, setFace] = useState(2)
  const [pick, setPick] = useState(0)
  const [range, setRange] = useState(cfg?.t === 'range' ? cfg.v : 0)
  const [kicks, setKicks] = useState(0)
  const [who, setWho] = useState<KidId>(currentKid(state.kid))
  const [note, setNote] = useState('')
  if (!chip || !cfg) return null

  const num = (n: number) => String(n).replace('.', ui.decimal)
  const read = (): string => {
    switch (cfg.t) {
      case 'mood': return ui.log.faces[face].label
      case 'pick': return cfg.options[pick].label.toLowerCase()
      case 'range': return num(range) + cfg.unit
      case 'kick': return `${kicks} ${ui.log.kicks}`
    }
  }
  const save = () => {
    const memory = cfg.t === 'pick' && cfg.memory
    const now = new Date().toLocaleTimeString(ui.dateLocale, { hour: '2-digit', minute: '2-digit' })
    dispatch({ type: 'log', chip: chipId, value: read(), note, kid: state.mode === 'kids' ? who : undefined, now })
    dispatch({ type: 'tourDone', key: 'log' })
    onCheer(memory ? { icon: 'star', text: ui.log.milestoneSaved } : { icon: chip.icon, text: ui.log.saved })
  }

  return (
    <>
      <div className={styles.shTop}>
        <div className={styles.shT}><Ico name={chip.icon} cut /><h5>{fmt(ui.log.title, { label: chip.label.toLowerCase() })}</h5></div>
        <button type="button" className={styles.x} aria-label={ui.close} onClick={() => dispatch({ type: 'closeSheet' })}>✕</button>
      </div>
      {state.mode === 'kids' && (
        <div className={styles.sw} role="group">
          {KID_IDS.map((id) => (
            <button key={id} type="button" className={who === id ? styles.on : ''} aria-pressed={who === id} onClick={() => setWho(id)}>
              <Ico name={data.kids[id].icon} />{data.kids[id].name}
            </button>
          ))}
        </div>
      )}

      {cfg.t === 'mood' && (
        <>
          <p className={styles.note}>{ui.log.howAreYou}</p>
          <div className={styles.faces}>
            {ui.log.faces.map((f, j) => (
              <button key={f.label} type="button" className={j === face ? styles.on : ''} aria-pressed={j === face} onClick={() => setFace(j)}>
                <Ico name={f.icon} />{f.label}
              </button>
            ))}
          </div>
        </>
      )}

      {cfg.t === 'pick' && (
        <div className={styles.tiles2}>
          {cfg.options.map((o, j) => {
            const icons: StickerName[] = data.optIcons[`${chip.id}:${o.id}` as OptKey] ?? [chip.icon]
            return (
              <button key={o.id} type="button" className={`${styles.tile2} ${j === pick ? styles.on : ''}`} aria-pressed={j === pick} onClick={() => setPick(j)}>
                <span className={styles.icos}>{icons.map((n, k) => <Ico key={k} name={n} />)}</span>
                {o.label}
              </button>
            )
          })}
        </div>
      )}

      {cfg.t === 'range' && (
        <>
          <div className={styles.rngVis}><RangeVis chip={chipId} v={range} cfg={cfg} /></div>
          <div className={`${styles.bigNum} ${styles.sm}`}><span>{num(range)}</span><small>{cfg.unit.trim().toUpperCase()}</small></div>
          <input type="range" className={styles.rg} min={cfg.min} max={cfg.max} step={cfg.step} value={range} aria-label={chip.label}
            style={{ ['--p' as string]: `${(((range - cfg.min) / (cfg.max - cfg.min)) * 100).toFixed(1)}%` }}
            onChange={(e) => setRange(Number(e.target.value))} />
          <div className={styles.rgEnds}><span>{num(cfg.min)}</span><span>{num(cfg.max)}</span></div>
        </>
      )}

      {cfg.t === 'kick' && (
        <>
          <p className={styles.note}>{ui.log.kickHint}</p>
          <button type="button" className={styles.kick} aria-label={ui.log.kicks} onClick={() => setKicks((k) => k + 1)}><Ico name="heart" /></button>
          <div className={styles.kickN}><span>{kicks}</span><small>{ui.log.kicks}</small></div>
        </>
      )}

      <textarea className={styles.noteIn} rows={2} placeholder={ui.log.notePlaceholder} aria-label={ui.log.notePlaceholder} value={note} onChange={(e) => setNote(e.target.value)} />
      <button type="button" className={styles.save} onClick={save}>{ui.save}</button>
    </>
  )
}
