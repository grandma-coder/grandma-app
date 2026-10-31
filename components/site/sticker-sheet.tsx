'use client'

import { useCallback, useState, type CSSProperties } from 'react'
import { useTranslations } from 'next-intl'
import type { FeatScreenKey } from '@/lib/demo'
import { Sticker } from '@/components/stickers/sticker'
import { useDemo } from '@/components/demo/demo'
import { TokenText } from './token-text'
import s from './site.module.css'

/** Screens that only exist for kids: tapping them from another phase switches to Filhos first. */
const KIDS_SCREENS: FeatScreenKey[] = ['vaccines', 'pediatric', 'growth']
const TILT = [-6, 4, -3, 7, -5, 3]
const FIRST = 4

/** Drive the phone to feature `n` of `data.feats` (also used by the Explorar panel, Task 10). */
export function useRunFeat() {
  const { state, dispatch, data } = useDemo()
  return useCallback((n: number) => {
    const a = data.feats[n].action
    if ('mode' in a) return dispatch({ type: 'setMode', mode: a.mode })
    if (KIDS_SCREENS.includes(a.screen) && state.mode !== 'kids') dispatch({ type: 'setMode', mode: 'kids' })
    dispatch({ type: 'openScreen', screen: a.screen })
  }, [data, dispatch, state.mode])
}

const isDesktop = () => typeof window.matchMedia !== 'function' || !window.matchMedia('(max-width: 900px)').matches

/** "What lives in here": 12 stickers; a tap peels one and shows its caption (and, on desktop, opens it on the phone). */
export function StickerSheet() {
  const t = useTranslations('v3.features')
  const { data } = useDemo()
  const runFeat = useRunFeat()
  const [on, setOn] = useState(FIRST)
  const f = data.feats[on]
  return (
    <section className={s.feat}>
      <div className={s.wrap}>
        <h2 className={s.hand}><TokenText text={t('title')} /></h2>
        <div className={s.sheetPaper}>
          <div className={s.stkGrid}>
            {data.feats.map((x, n) => (
              <button
                key={x.title} type="button" aria-pressed={n === on}
                className={`${s.stk} ${n === on ? s.on : ''}`} style={{ '--r': `${TILT[n % TILT.length]}deg` } as CSSProperties}
                onClick={() => { setOn(n); if (isDesktop()) runFeat(n) }}
              >
                <Sticker name={x.icon} cut className={s.ico} /><span>{x.title}</span>
              </button>
            ))}
          </div>
          <div className={s.stkCap} aria-live="polite">
            <Sticker name={f.icon} className={s.ico} />
            <div><b>{f.title}</b><p>{f.desc}</p></div>
          </div>
        </div>
      </div>
    </section>
  )
}
