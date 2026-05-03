// lib/birthGuideData.ts
export type BirthTopicKey =
  | 'natural'
  | 'csection'
  | 'home'
  | 'water'
  | 'labor-stages'
  | 'warning-signs'
  | 'hospital-bag'
  | 'pain-relief'
  | 'positions'
  | 'partner-guide'
  | 'recovery'

export interface BirthSubsection {
  title: string
  content: string
  bullets?: string[]
}

export interface BirthCallout {
  variant: 'provider' | 'urgent' | 'tip'
  title?: string
  text: string
}

export interface BirthSection {
  title: string
  content: string
  bullets?: string[]
  subsections?: BirthSubsection[]
  callout?: BirthCallout
}

export interface BirthSource {
  label: string
  org: string
  url: string
}

export interface BirthTopic {
  key: BirthTopicKey
  emoji: string
  title: string
  subtitle: string
  heroColor: string
  heroBorder: string
  sections: BirthSection[]
  disclaimer?: string
  sources?: BirthSource[]
}

import { NATURAL_TOPIC } from './birthGuide/natural'
import { CSECTION_TOPIC } from './birthGuide/csection'
import { HOME_TOPIC } from './birthGuide/home'
import { WATER_TOPIC } from './birthGuide/water'
import { LABOR_STAGES_TOPIC } from './birthGuide/labor-stages'
import { WARNING_SIGNS_TOPIC } from './birthGuide/warning-signs'
import { HOSPITAL_BAG_TOPIC } from './birthGuide/hospital-bag'
import { PAIN_RELIEF_TOPIC } from './birthGuide/pain-relief'
import { POSITIONS_TOPIC } from './birthGuide/positions'
import { PARTNER_GUIDE_TOPIC } from './birthGuide/partner-guide'
import { RECOVERY_TOPIC } from './birthGuide/recovery'

export const BIRTH_TOPICS: BirthTopic[] = [
  NATURAL_TOPIC,
  CSECTION_TOPIC,
  HOME_TOPIC,
  WATER_TOPIC,
  LABOR_STAGES_TOPIC,
  WARNING_SIGNS_TOPIC,
  HOSPITAL_BAG_TOPIC,
  PAIN_RELIEF_TOPIC,
  POSITIONS_TOPIC,
  PARTNER_GUIDE_TOPIC,
  RECOVERY_TOPIC,
]

export function getBirthTopic(key: BirthTopicKey): BirthTopic {
  const topic = BIRTH_TOPICS.find((t) => t.key === key)
  if (!topic) throw new Error(`Birth topic "${key}" not found`)
  return topic
}
