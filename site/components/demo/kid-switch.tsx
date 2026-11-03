'use client'

import { Ico } from './sticker-ico'
import { useDemo } from './demo'
import { KID_IDS, type KidFilter } from './kids'
import styles from './demo.module.css'

/** "Who is this about" switch. `all=false` is for screens that need exactly one child (falls back to the first). */
export function KidSwitch({ all = true }: { all?: boolean }) {
  const { state, dispatch, data } = useDemo()
  const current = state.kid === 'all' && !all ? KID_IDS[0] : state.kid
  const pick = (kid: KidFilter) => dispatch({ type: 'setKid', kid })
  return (
    <div className={styles.sw} role="group">
      {all && (
        <button type="button" className={`${styles.txt} ${current === 'all' ? styles.on : ''}`} aria-pressed={current === 'all'} onClick={() => pick('all')}>
          {data.ui.all}
        </button>
      )}
      {KID_IDS.map((id) => (
        <button key={id} type="button" className={current === id ? styles.on : ''} aria-pressed={current === id} onClick={() => pick(id)}>
          <Ico name={data.kids[id].icon} />
          {data.kids[id].name}
        </button>
      ))}
    </div>
  )
}
