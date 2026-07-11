import type { JourneyMode } from '../../types'
import type { DailyTag } from './tags'

// Bold sticker-palette background colors for cards.
export type StickerColorKey =
  | 'yellow' | 'blue' | 'pink' | 'green' | 'lilac' | 'peach' | 'coral' | 'charcoal'

export interface DailyQuestion {
  id: string
  mode: JourneyMode
  prompt: string
  options: { label: string; tags: DailyTag[] }[]
}

export interface DailyCard {
  id: string
  mode: JourneyMode
  text: string
  tags: DailyTag[]
  color: StickerColorKey
}
