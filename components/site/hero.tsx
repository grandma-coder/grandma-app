'use client'

import { useRef } from 'react'
import { useTranslations } from 'next-intl'
import { DemoDevice } from '@/components/demo/device'
import { PhaseSwitch } from './phase-switch'
import { QuickJoin } from './quick-join'
import { TokenText } from './token-text'
import { usePhoneFit } from './use-phone-fit'
import { MODES_ID, PHONE_ID } from './ids'
import s from './site.module.css'

/** Rebus headline, sub, the hero email field and, beside it, the phase switch over the working phone. */
export function Hero() {
  const t = useTranslations('v3.hero')
  const slot = useRef<HTMLDivElement>(null)
  usePhoneFit(slot)
  return (
    <section className={s.hero}>
      <div className={`${s.wrap} ${s.heroGrid}`}>
        <div>
          <h1 className={`${s.rebus} ${s.hand}`}><TokenText text={t('rebus')} rebus /></h1>
          <p className={s.sub}>{t('sub')}</p>
          <QuickJoin variant="hero" />
          <a className={`${s.tryHint} ${s.hand}`} href={`#${MODES_ID}`}><TokenText text={t('tryDesktop')} /></a>
        </div>
        <div className={s.phoneCol}>
          <PhaseSwitch />
          {/* usePhoneFit sets --s (scale of the 390x800 device) on this slot */}
          <div ref={slot} className={s.phoneSlot} id={PHONE_ID} role="region" aria-label={t('phoneAria')}>
            <DemoDevice />
          </div>
        </div>
      </div>
    </section>
  )
}
