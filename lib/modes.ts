/** The app's four live behaviors and their Diffuse fields (grandma-app constants/theme.ts `diffuseFields`). */
export const MODES = ['pre', 'preg', 'kids', 'meno'] as const
export type Mode = (typeof MODES)[number]
export const isMode = (v: unknown): v is Mode => typeof v === 'string' && (MODES as readonly string[]).includes(v)
