'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Sticker } from '@/components/stickers/sticker'
import type { StickerName } from '@/components/stickers/paths'
import { useDemo } from '@/components/demo/demo'
import { useMobileUi } from './mobile-context'
import { useBarAway } from './use-phone-fit'
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

  useEffect(() => {
    if (panel === 'none') return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panel, close])

  const go = (tab: Tab) => {
    if (tab === 'list') return openList()
    close()
    if (tab === 'memories') dispatch({ type: 'openScreen', screen: 'memories' })
    else dispatch({ type: 'openScreen', screen: 'home' })
    if (tab === 'log') setTimeout(() => dispatch({ type: 'openSheet', sheet: { kind: 'register' } }), prefersReducedMotion() ? 0 : 250)
    showPhone()
  }
  const tab = (k: Tab) => (
    <button type="button" onClick={() => go(k)}>
      <Sticker name={ICON[k]} className={m.ico} />{t(k)}
    </button>
  )

  return (
    <>
      <nav id={TABBAR_ID} aria-label={t('barAria')} className={m.tabbar} data-away={away}>
        {tab('home')}
        {tab('log')}
        <button
          type="button" className={`${m.mid} ${panel === 'explore' ? m.on : ''}`}
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
