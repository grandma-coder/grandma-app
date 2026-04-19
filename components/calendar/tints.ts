/**
 * Pastel tint palette for agenda activity cards + log tiles.
 *
 * Used by ActivityPillCard and LogTile across all 3 behaviors.
 * Each token pairs a soft fill (card bg) with a stronger color
 * (icon foreground / border tint).
 */

export interface Tint {
  fill: string
  fillDark: string
  ink: string
  inkDark: string
}

export const tints = {
  feeding: { fill: '#D9E6FF', fillDark: '#1E2A3D', ink: '#5A86C7', inkDark: '#A5C9F0' },
  sleep: { fill: '#E7DBFF', fillDark: '#2A2342', ink: '#7E5FBE', inkDark: '#C4B5EF' },
  activity: { fill: '#D9F0DC', fillDark: '#1F2E24', ink: '#4FA069', inkDark: '#8ECB9D' },
  mood: { fill: '#FFE5C2', fillDark: '#3A2E18', ink: '#C98A3A', inkDark: '#F2B870' },
  photo: { fill: '#FFD9DA', fillDark: '#3A2024', ink: '#C96F78', inkDark: '#F2A0A6' },
  medical: { fill: '#FFF4C2', fillDark: '#332C14', ink: '#A68B2A', inkDark: '#E8CB70' },
  health: { fill: '#FFD9DA', fillDark: '#3A2024', ink: '#C96F78', inkDark: '#F2A0A6' },
  diaper: { fill: '#DBEAFF', fillDark: '#1C2A3D', ink: '#6689BD', inkDark: '#A6C4EE' },
  memory: { fill: '#D9F0DC', fillDark: '#1F2E24', ink: '#4FA069', inkDark: '#8ECB9D' },
  wake: { fill: '#FFE5C2', fillDark: '#3A2E18', ink: '#E0A13A', inkDark: '#F2B870' },
  // pre-pregnancy / fertility
  period: { fill: '#FFD9DA', fillDark: '#3A2024', ink: '#C95E6A', inkDark: '#F2A0A6' },
  ovulation: { fill: '#FFF4C2', fillDark: '#332C14', ink: '#C98A3A', inkDark: '#E8CB70' },
  supplements: { fill: '#E7DBFF', fillDark: '#2A2342', ink: '#7E5FBE', inkDark: '#C4B5EF' },
  temperature: { fill: '#D9E6FF', fillDark: '#1E2A3D', ink: '#5A86C7', inkDark: '#A5C9F0' },
  intimacy: { fill: '#FFD9DA', fillDark: '#3A2024', ink: '#C96F78', inkDark: '#F2A0A6' },
  // pregnancy
  appointment: { fill: '#FFF4C2', fillDark: '#332C14', ink: '#A68B2A', inkDark: '#E8CB70' },
  symptom: { fill: '#FFD9DA', fillDark: '#3A2024', ink: '#C96F78', inkDark: '#F2A0A6' },
  kicks: { fill: '#FFD9DA', fillDark: '#3A2024', ink: '#C95E6A', inkDark: '#F2A0A6' },
  weight: { fill: '#D9E6FF', fillDark: '#1E2A3D', ink: '#5A86C7', inkDark: '#A5C9F0' },
  vitamins: { fill: '#E7DBFF', fillDark: '#2A2342', ink: '#7E5FBE', inkDark: '#C4B5EF' },
  water: { fill: '#D9E6FF', fillDark: '#1E2A3D', ink: '#5A86C7', inkDark: '#A5C9F0' },
  exercise: { fill: '#D9F0DC', fillDark: '#1F2E24', ink: '#4FA069', inkDark: '#8ECB9D' },
  nutrition: { fill: '#D9F0DC', fillDark: '#1F2E24', ink: '#4FA069', inkDark: '#8ECB9D' },
  nesting: { fill: '#FFF4C2', fillDark: '#332C14', ink: '#A68B2A', inkDark: '#E8CB70' },
  birthprep: { fill: '#E7DBFF', fillDark: '#2A2342', ink: '#7E5FBE', inkDark: '#C4B5EF' },
  kegel: { fill: '#E7DBFF', fillDark: '#2A2342', ink: '#7E5FBE', inkDark: '#C4B5EF' },
  contraction: { fill: '#FFD9DA', fillDark: '#3A2024', ink: '#C95E6A', inkDark: '#F2A0A6' },
  exam: { fill: '#FFF4C2', fillDark: '#332C14', ink: '#A68B2A', inkDark: '#E8CB70' },
  checklist: { fill: '#D9F0DC', fillDark: '#1F2E24', ink: '#4FA069', inkDark: '#8ECB9D' },
} as const

export type TintKey = keyof typeof tints

export function getTint(key: TintKey | string, isDark: boolean) {
  const t = (tints as Record<string, Tint>)[key] ?? tints.activity
  return { fill: isDark ? t.fillDark : t.fill, ink: isDark ? t.inkDark : t.ink }
}
