'use client'

import type { StickerName } from '@/components/stickers/paths'
import type { ScreenName } from '@/lib/demo/reducer'
import { Ico } from './sticker-ico'
import { useDemo } from './demo'
import styles from './demo.module.css'

type TabId = 'home' | 'agenda' | 'shortcuts' | 'week' | 'profile'
const TABS: { id: TabId; icon: StickerName }[] = [
  { id: 'home', icon: 'house' },
  { id: 'agenda', icon: 'cal' },
  { id: 'shortcuts', icon: 'eye' },
  { id: 'week', icon: 'bars' },
  { id: 'profile', icon: 'me' },
]
const TAB_SCREEN: Partial<Record<TabId, ScreenName>> = { home: 'home', agenda: 'agenda', week: 'week', profile: 'profile' }

/** Paper strip with a drawn edge that stops at the centre "eye" button. Week and shortcuts feed the tour. */
export function TabBar() {
  const { state, dispatch, data } = useDemo()
  const press = (id: TabId) => {
    const screen = TAB_SCREEN[id]
    if (screen) dispatch({ type: 'openScreen', screen })
    else dispatch({ type: 'openSheet', sheet: { kind: 'shortcuts' } })
    if (id === 'week') dispatch({ type: 'tourDone', key: 'week' })
    if (id === 'shortcuts') dispatch({ type: 'tourDone', key: 'shortcuts' })
  }
  return (
    <nav className={styles.tabs}>
      {TABS.map(({ id, icon }) => {
        const on = TAB_SCREEN[id] === state.screen
        const label = data.ui.tabs[id]
        return id === 'shortcuts' ? (
          <button key={id} type="button" data-tour="shortcuts" className={styles.eye} aria-label={label} onClick={() => press(id)}><Ico name={icon} cut /></button>
        ) : (
          <button key={id} type="button" data-tour={id === 'week' ? 'week' : undefined} className={on ? styles.on : ''} aria-current={on ? 'page' : undefined} onClick={() => press(id)}>
            <Ico name={icon} />{label}
          </button>
        )
      })}
    </nav>
  )
}
