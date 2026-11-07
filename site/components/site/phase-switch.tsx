'use client'

import { useTranslations } from 'next-intl'
import { MODES } from '@/lib/modes'
import { Sticker } from '@/components/stickers/sticker'
import { useDemo } from '@/components/demo/demo'
import { MODES_ID, PHONE_ID } from './ids'
import s from './site.module.css'

/** Four sticker tabs above the phone; sticky under the top bar on phones. Labels come from the demo data. */
export function PhaseSwitch() {
  const t = useTranslations('v3.phases')
  const { state, dispatch, data } = useDemo()
  return (
    <div className={s.modes} id={MODES_ID} role="group" aria-label={t('aria')}>
      {MODES.map((m) => {
        const on = state.mode === m
        return (
          <button
            key={m} type="button" aria-pressed={on} aria-controls={PHONE_ID} className={on ? s.on : undefined}
            onClick={() => { dispatch({ type: 'setMode', mode: m }); dispatch({ type: 'tourDone', key: 'mode' }) }}
          >
            <Sticker name={data.phases[m].icon} className={s.ico} />{data.phases[m].name}
          </button>
        )
      })}
    </div>
  )
}
