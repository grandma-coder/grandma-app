'use client'

import type { ComponentType } from 'react'
import type { ScreenName } from '@/lib/demo/reducer'
import { Home } from '../home'
import { Agenda } from './agenda'
import { Week } from './week'
import { Profile } from './profile'
import { Vaccines } from './vaccines'
import { Memories } from './memories'
import { Care } from './care'
import { Village } from './village'
import { Community } from './community'
import { Chat } from './chat'
import { Exams } from './exams'
import { Exam } from './exam'
import { Appointments } from './appointments'
import { Reminders } from './reminders'
import { Pediatric } from './pediatric'
import { Growth } from './growth'
import { Privacy } from './privacy'
import { useDemo } from '../demo'
import styles from '../demo.module.css'

/**
 * Screen registry. Each entry renders the *inside* of a screen; `DemoScreen` supplies the scroll container
 * (`.scr`) and the enter animation. Every screen the phone can open is registered here.
 * A screen id with no entry renders nothing, but the tab bar keeps working.
 */
export const SCREENS: Partial<Record<ScreenName, ComponentType>> = {
  home: Home,
  agenda: Agenda,
  week: Week,
  profile: Profile,
  vaccines: Vaccines,
  memories: Memories,
  care: Care,
  village: Village,
  community: Community,
  chat: Chat,
  exams: Exams,
  exam: Exam,
  appointments: Appointments,
  reminders: Reminders,
  pediatric: Pediatric,
  growth: Growth,
  privacy: Privacy,
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
