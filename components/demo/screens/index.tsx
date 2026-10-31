'use client'

import type { ComponentType } from 'react'
import type { ScreenName } from '@/lib/demo/reducer'
import { Home } from '../home'
import { Agenda } from './agenda'
import { Week } from './week'
import { Profile } from './profile'
import { useDemo } from '../demo'
import styles from '../demo.module.css'

/**
 * Screen registry. Each entry renders the *inside* of a screen; `DemoScreen` supplies the scroll container
 * (`.scr`) and the enter animation. Tasks 7 and 8 add agenda, week, profile and the feature screens here.
 * A screen id with no entry renders nothing, but the tab bar keeps working.
 */
export const SCREENS: Partial<Record<ScreenName, ComponentType>> = {
  home: Home,
  agenda: Agenda,
  week: Week,
  profile: Profile,
}

export function DemoScreen() {
  const { state } = useDemo()
  const Screen = SCREENS[state.screen]
  if (!Screen) return null
  return (
    <div key={`${state.mode}-${state.screen}`} className={styles.scr} data-screen={state.screen}>
      <Screen />
    </div>
  )
}
