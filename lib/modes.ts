/** The app's four live behaviors and their Diffuse fields (grandma-app constants/theme.ts `diffuseFields`). */
export const MODES = ['pre', 'preg', 'kids', 'meno'] as const
export type Mode = (typeof MODES)[number]
export const isMode = (v: unknown): v is Mode => typeof v === 'string' && (MODES as readonly string[]).includes(v)

export interface Field { g1: string; g2: string; g3: string; g4: string; accent: string; accentSoft: string }

export const FIELDS: Record<Mode, Field> = {
  pre: { g1: '#F0A99A', g2: '#F0B8C8', g3: '#C9B7E6', g4: '#F7DCC0', accent: '#C25872', accentSoft: '#F6DCE4' },
  preg: { g1: '#F8C9A6', g2: '#F2AEC6', g3: '#BDA4E2', g4: '#F8E1B2', accent: '#8F5FC6', accentSoft: '#E7D8F5' },
  kids: { g1: '#F4D888', g2: '#A2D8B4', g3: '#A6BCE6', g4: '#F4B396', accent: '#4C79CE', accentSoft: '#CBDCF7' },
  meno: { g1: '#F5C89A', g2: '#F0B27A', g3: '#E8975A', g4: '#F7DCC0', accent: '#C2703A', accentSoft: '#F7E3D2' },
}

export const fieldStops = (m: Mode): [string, string, string, string] => [FIELDS[m].g1, FIELDS[m].g2, FIELDS[m].g3, FIELDS[m].g4]
