// English source for the bundled birth-guide translations. Flattens every visible text
// field of the bundled topics (lib/birthGuide/*) into stable, position-based keys:
//   bg_<topic>_title|subtitle|disclaimer
//   bg_<topic>_s<i>_title|content · bg_<topic>_s<i>_b<j>
//   bg_<topic>_s<i>_sub<k>_title|content · bg_<topic>_s<i>_sub<k>_b<j>
//   bg_<topic>_s<i>_callout_title|text
// Source names/URLs are not translated.
import type { BirthTopic } from '../birthGuideData'
import { NATURAL_TOPIC } from '../birthGuide/natural'
import { CSECTION_TOPIC } from '../birthGuide/csection'
import { HOME_TOPIC } from '../birthGuide/home'
import { WATER_TOPIC } from '../birthGuide/water'
import { LABOR_STAGES_TOPIC } from '../birthGuide/labor-stages'
import { WARNING_SIGNS_TOPIC } from '../birthGuide/warning-signs'
import { HOSPITAL_BAG_TOPIC } from '../birthGuide/hospital-bag'
import { PAIN_RELIEF_TOPIC } from '../birthGuide/pain-relief'
import { POSITIONS_TOPIC } from '../birthGuide/positions'
import { PARTNER_GUIDE_TOPIC } from '../birthGuide/partner-guide'
import { RECOVERY_TOPIC } from '../birthGuide/recovery'

// Same topics as lib/birthGuideData.ts BUNDLED_BIRTH_TOPICS, imported directly so the sync
// scripts don't pull in the remote (Supabase / React Native) module.
const BUNDLED: BirthTopic[] = [
  NATURAL_TOPIC, CSECTION_TOPIC, HOME_TOPIC, WATER_TOPIC, LABOR_STAGES_TOPIC, WARNING_SIGNS_TOPIC,
  HOSPITAL_BAG_TOPIC, PAIN_RELIEF_TOPIC, POSITIONS_TOPIC, PARTNER_GUIDE_TOPIC, RECOVERY_TOPIC,
]

export function birthTopicEntries(topic: BirthTopic): Record<string, string> {
  const out: Record<string, string> = {}
  const t = `bg_${topic.key}`
  out[`${t}_title`] = topic.title
  if (topic.subtitle) out[`${t}_subtitle`] = topic.subtitle
  if (topic.disclaimer) out[`${t}_disclaimer`] = topic.disclaimer
  topic.sections.forEach((s, i) => {
    const sk = `${t}_s${i}`
    out[`${sk}_title`] = s.title
    out[`${sk}_content`] = s.content
    s.bullets?.forEach((b, j) => { out[`${sk}_b${j}`] = b })
    s.subsections?.forEach((sub, k) => {
      out[`${sk}_sub${k}_title`] = sub.title
      out[`${sk}_sub${k}_content`] = sub.content
      sub.bullets?.forEach((b, j) => { out[`${sk}_sub${k}_b${j}`] = b })
    })
    if (s.callout) {
      if (s.callout.title) out[`${sk}_callout_title`] = s.callout.title
      out[`${sk}_callout_text`] = s.callout.text
    }
  })
  for (const [k, v] of Object.entries(out)) if (!v) delete out[k]
  return out
}

export function birthGuideEnglish(): Record<string, string> {
  return Object.assign({}, ...BUNDLED.map(birthTopicEntries))
}
