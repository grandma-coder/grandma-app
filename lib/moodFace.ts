/**
 * Map any mood key in the app (kids / pregnancy / cycle) onto a MoodFace sticker
 * variant + fill color. Single source of truth so UI stays consistent.
 */
import type { MoodVariant } from '../components/stickers/RewardStickers'
import type { MoodExpression } from '../components/characters/Characters'

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

// Deeper sticker hues for the mood BLOB (the pale MOOD_FACE_COLORS suit the
// small legacy MoodFace but wash out as a solid blob fill). Keyed by expression.
const MOOD_BLOB_COLORS: Record<MoodExpression, string> = {
  happy: '#BDD48C', calm: '#9DC3E8', energetic: '#F5D652', fussy: '#F5B896',
  cranky: '#EE7B6D', excited: '#F5D652', anxious: '#C8B6E8', nauseous: '#BDD48C',
}

// Blob fill for a mood key — resolves through moodExpression so any mood maps to
// a deeper, legible blob hue.
export function moodBlobFill(mood: string | null | undefined): string {
  return MOOD_BLOB_COLORS[moodExpression(mood)]
}

// Character-blob mood expression for any mood key. Used by the Diffuse surfaces
// that render <Character name="mood" face={moodExpression(mood)} …/> — the blob
// equivalent of moodFaceVariant. Unknown / neutral moods fall back to `calm`.
export function moodExpression(mood: string | null | undefined): MoodExpression {
  if (!mood) return 'calm'
  switch (mood) {
    case 'happy':
    case 'calm':
    case 'energetic':
    case 'fussy':
    case 'cranky':
    case 'excited':
    case 'anxious':
    case 'nauseous':
      return mood
    // neutral / positive generics → the closest expression
    case 'great':
    case 'good':
      return 'happy'
    case 'okay':
      return 'calm'
    case 'low':
    case 'sad':
      return 'fussy'
    default:
      return 'calm'
  }
}
