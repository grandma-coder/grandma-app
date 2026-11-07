'use client'

import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Sticker } from '@/components/stickers/sticker'
import type { StickerName } from '@/components/stickers/paths'
import { useDemo } from '@/components/demo/demo'
import { useMobileUi } from './mobile-context'
import { useBarAway } from './use-phone-fit'
import { useOverlay } from './use-overlay'
import { prefersReducedMotion, showPhone } from './phone-nav'
import { ExplorePanel } from './explore-panel'
import { ListPop } from './list-pop'
import { TABBAR_ID } from './ids'
import m from './mobile.module.css'

type Tab = 'home' | 'log' | 'memories' | 'list'
const ICON: Record<Tab, StickerName> = { home: 'house', log: 'pencil', memories: 'pola', list: 'heart' }

/** Phones: the black bar (Home, Log, Explore, Memories, List) that drives the phone, plus Explorar and the list pop-up. */
export function MobileBar() {
  const t = useTranslations('v3.mobile')
  const { dispatch } = useDemo()
  const { panel, openExplore, openList, close } = useMobileUi()
  const away = useBarAway(panel !== 'none')

  useOverlay(panel, close)
  const logTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(logTimer.current), [])

  const go = (tab: Tab) => {
    clearTimeout(logTimer.current)
    if (tab === 'list') return openList()
    close()
    if (tab === 'memories') dispatch({ type: 'openScreen', screen: 'memories' })
    else dispatch({ type: 'openScreen', screen: 'home' })
    if (tab === 'log') logTimer.current = setTimeout(() => dispatch({ type: 'openSheet', sheet: { kind: 'register' } }), prefersReducedMotion() ? 0 : 250)
    showPhone()
  }
  const tab = (k: Tab) => (
    <button type="button" data-tab={k} onClick={() => go(k)}>
      <Sticker name={ICON[k]} className={m.ico} />{t(k)}
    </button>
  )

  return (
    <>
      <nav id={TABBAR_ID} aria-label={t('barAria')} className={m.tabbar} data-away={away} aria-hidden={away || undefined} inert={away}>
        {tab('home')}
        {tab('log')}
        <button
          type="button" data-tab="explore" className={`${m.mid} ${panel === 'explore' ? m.on : ''}`}
          aria-expanded={panel === 'explore'} onClick={() => (panel === 'explore' ? close() : openExplore())}
        >
          <i><Sticker name="eye" className={m.ico} /></i>{t('explore')}
        </button>
        {tab('memories')}
        {tab('list')}
      </nav>
      <div className={`${m.pscrim} ${panel !== 'none' ? m.on : ''}`} data-scrim aria-hidden="true" onClick={close} />
      <ExplorePanel />
      <ListPop />
    </>
  )
}
