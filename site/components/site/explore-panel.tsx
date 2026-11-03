'use client'

import { useTranslations } from 'next-intl'
import { Sticker } from '@/components/stickers/sticker'
import { useDemo } from '@/components/demo/demo'
import { useMobileUi } from './mobile-context'
import { useRunFeat } from './sticker-sheet'
import { showPhone } from './phone-nav'
import { EXPLORE_ID } from './ids'
import m from './mobile.module.css'
import s from './site.module.css'

/** The eye's panel: every feature sticker; a tap runs it on the phone and scrolls the phone into view. */
export function ExplorePanel() {
  const t = useTranslations('v3.explore')
  const { data } = useDemo()
  const { panel, openList, close } = useMobileUi()
  const runFeat = useRunFeat()
  const open = panel === 'explore'
  return (
    <div
      id={EXPLORE_ID} role="dialog" aria-modal="true" tabIndex={-1} aria-labelledby={`${EXPLORE_ID}-title`} aria-hidden={!open} inert={!open}
      className={`${m.xp} ${open ? m.on : ''}`}
    >
      <h3 id={`${EXPLORE_ID}-title`} className={s.hand}>{t('title')}</h3>
      <p>{t('hint')}</p>
      <div className={m.xpGrid}>
        {data.feats.map((f, n) => (
          <button key={f.title} type="button" data-feat={n} onClick={() => { close(); runFeat(n); showPhone() }}>
            <Sticker name={f.icon} cut className={m.xpIco} />{f.title}
          </button>
        ))}
      </div>
      <button type="button" className={m.xpJoin} onClick={openList}>{t('join')}</button>
    </div>
  )
}
