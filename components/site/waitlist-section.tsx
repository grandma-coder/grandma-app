'use client'

import { useTranslations } from 'next-intl'
import { QuickJoin } from './quick-join'
import { TokenText } from './token-text'
import { WAITLIST_ID } from './ids'
import s from './site.module.css'

/** "Coming soon, worldwide": the full form (phase radios + email) and its joined state. */
export function WaitlistSection() {
  const t = useTranslations('v3.waitlist')
  return (
    <section className={s.wl} id={WAITLIST_ID}>
      <div className={s.wrap}>
        <h2 className={s.hand}><TokenText text={t('title')} /></h2>
        <QuickJoin variant="section" />
      </div>
    </section>
  )
}
