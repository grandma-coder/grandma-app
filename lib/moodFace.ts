/**
 * Map any mood key in the app (kids / pregnancy / cycle) onto a MoodFace sticker
 * variant + fill color. Single source of truth so UI stays consistent.
 */
import type { MoodVariant } from '../components/stickers/RewardStickers'

export const MOOD_FACE_COLORS: Record<string, string> = {
  // Kids
  happy: '#FBEA9E',
  calm: '#BFE0C0',
  energetic: '#C5DBF3',
  fussy: '#FFD8B0',
  cranky: '#F7B8B8',
  // Cycle / generic
  great: '#FBEA9E',
  good: '#FBEA9E',
  okay: '#F5EDDC',
  low: '#C8D4E8',
  // Pregnancy extras
  excited: '#FBEA9E',
  anxious: '#FFD8B0',
  sad: '#C8D4E8',
}

export function moodFaceVariant(mood: string | null | undefined): MoodVariant {
  if (!mood) return 'okay'
  switch (mood) {
    case 'happy':
    case 'calm':
    case 'fussy':
    case 'cranky':
    case 'energetic':
    case 'great':
    case 'good':
    case 'okay':
    case 'low':
      return mood
    case 'excited':
      return 'great'
    case 'anxious':
      return 'fussy'
    case 'sad':
      return 'low'
    default:
      return 'okay'
  }
}

export function moodFaceFill(mood: string | null | undefined): string {
  if (!mood) return MOOD_FACE_COLORS.okay
  return MOOD_FACE_COLORS[mood] ?? MOOD_FACE_COLORS.okay
}
