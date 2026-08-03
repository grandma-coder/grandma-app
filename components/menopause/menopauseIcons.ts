/**
 * menopauseIcons — shared Character-blob mapping for the Menopause surfaces.
 *
 * Character blobs are the app's semantic icon system (never Lucide for
 * semantic icons — see the Lucide→Character migration). This maps symptom
 * groups + individual log types to a blob so the log forms and the agenda
 * timeline stay visually consistent.
 */

import type { CharacterName } from '../characters/Characters'
import {
  resolveMenopauseSymptomId,
  ALL_MENOPAUSE_SYMPTOMS,
  type MenopauseGroup,
} from '../../lib/menopauseSymptoms'

export const GROUP_META: Record<MenopauseGroup, { label: string; icon: CharacterName }> = {
  vasomotor: { label: 'Temperature', icon: 'temperature' },
  sleep: { label: 'Sleep & energy', icon: 'sleep' },
  mood: { label: 'Mind & mood', icon: 'mood' },
  physical: { label: 'Body', icon: 'activity' },
  genitourinary: { label: 'Intimate', icon: 'heart' },
}

export const GROUP_ORDER: MenopauseGroup[] = ['vasomotor', 'sleep', 'mood', 'physical', 'genitourinary']

// Per-group sticker-palette hue so the home reads with varied colour like the
// other behaviors (each signal its own tone) — brand Ember stays for structure
// (ring center, today, CTAs). Keys index the shared `stickers` palette, which is
// active in both variants; resolve via useTheme().stickers[key] (+ `${key}Soft`).
export type StickerHueKey = 'coral' | 'lilac' | 'yellow' | 'green' | 'pink' | 'blue'

export const GROUP_STICKER: Record<MenopauseGroup, StickerHueKey> = {
  vasomotor: 'coral', // heat / hot flashes
  sleep: 'lilac', // night / rest
  mood: 'yellow', // mind & mood
  physical: 'green', // body
  genitourinary: 'pink', // intimate
}

/** Sticker-hue key for any `menopause_logs.type` (symptom → its group hue; period
 *  → coral; note → blue). Pair with `${key}Soft` for the socket tint. */
export function symptomStickerKey(type: string): StickerHueKey {
  if (type === 'period') return 'coral'
  if (type === 'note') return 'blue'
  const id = resolveMenopauseSymptomId(type)
  const sym = id ? ALL_MENOPAUSE_SYMPTOMS.find((s) => s.id === id) : undefined
  return sym ? GROUP_STICKER[sym.group] : 'blue'
}

/** Blob for a symptom id — resolves to that symptom's group icon. */
export function symptomBlob(id: string): CharacterName {
  const symptom = ALL_MENOPAUSE_SYMPTOMS.find((s) => s.id === id)
  return symptom ? GROUP_META[symptom.group].icon : 'note'
}

/**
 * Blob for any `menopause_logs.type` value — the `period` event gets the
 * period blob, `note` gets the note blob, and every symptom resolves to its
 * group icon. Unknown types fall back to the note blob.
 */
export function logTypeBlob(type: string): CharacterName {
  if (type === 'period') return 'period'
  if (type === 'note') return 'note'
  const id = resolveMenopauseSymptomId(type)
  return id ? symptomBlob(id) : 'note'
}
