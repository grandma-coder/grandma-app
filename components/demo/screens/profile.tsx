'use client'

import type { StickerName } from '@/components/stickers/paths'
import { Ico } from '../sticker-ico'
import { useDemo } from '../demo'
import { KID_IDS } from '../kids'
import styles from '../demo.module.css'
import s from './screens.module.css'

export function Profile() {
  const { state, dispatch, data } = useDemo()
  const { ui } = data
  const care = ui.screens.care.circle
  const kids = state.mode === 'kids'
  const people: [StickerName, string][] = [['heart', care.partner], ['eye', care.grandma], ['bottle', care.sitter], ['me', care.you]]
  return (
    <>
      <div className={styles.topRow}><h3 className={styles.hHand}>{ui.profile.title}</h3></div>
      <div className={`${s.me} ${styles.card}`}>
        <Ico name="me" />
        <div><b>{ui.user}</b><span>{data.phases[state.mode].name}{kids ? ui.profile.kidsSuffix : ''}</span></div>
      </div>
      {kids && (
        <>
          <div className={styles.sec}><h4>{ui.profile.kids}</h4><span className={styles.lbl}>{KID_IDS.length}</span></div>
          <div className={s.circle}>
            {KID_IDS.map((id) => <span key={id}><Ico name={data.kids[id].icon} cut />{data.kids[id].name} · {data.kids[id].age}</span>)}
            <span><Ico name="heart" cut />{ui.profile.add}</span>
          </div>
        </>
      )}
      <div className={styles.sec}><h4>{ui.profile.network}</h4><span className={styles.lbl}>{ui.profile.people}</span></div>
      <div className={s.circle}>{people.map(([icon, label]) => <span key={label}><Ico name={icon} cut />{label}</span>)}</div>
      <div className={s.list}>
        {ui.profile.items.map((it) => (
          <button key={it.screen} type="button" className={`${s.item} ${styles.card}`} onClick={() => dispatch({ type: 'openScreen', screen: it.screen })}>
            <Ico name={it.icon} />{it.title}<span aria-hidden="true">›</span>
          </button>
        ))}
      </div>
    </>
  )
}
