'use client'

import { useTranslations } from 'next-intl'
import { QuickJoin } from './quick-join'
import { useMobileUi } from './mobile-context'
import { POP_ID } from './ids'
import m from './mobile.module.css'

/** The black bar's "List" pop-up: the same quick-join as everywhere, in a bottom sheet above the bar. Modal behaviour lives in `useOverlay`. */
export function ListPop() {
  const t = useTranslations('v3.pop')
  const { panel, close } = useMobileUi()
  const open = panel === 'list'
  return (
    <div
      id={POP_ID} role="dialog" aria-modal="true" aria-labelledby={`${POP_ID}-title`} aria-hidden={!open} inert={!open} tabIndex={-1}
      className={`${m.pop} ${open ? m.on : ''}`}
    >
      <div className={m.grab} />
      <div className={m.shTop}>
        <h5 id={`${POP_ID}-title`}>{t('title')}</h5>
        <button type="button" className={m.x} aria-label={t('close')} onClick={close}>✕</button>
      </div>
      <QuickJoin variant="pop" />
    </div>
  )
}
