/**
 * useMenoPalette — resolved token palette for the Menopause behavior surfaces
 * (log forms + agenda timeline). Dual-variant, tokens only.
 *
 * Cream reads from useTheme(); Diffuse from useDiffuseTheme() — never a mix.
 * Mode color is the ember `meno` token via getModeColor('menopause') (current)
 * / getDiffuseAccent('menopause') (Diffuse). Mirrors the identical helper in
 * app/onboarding/menopause/index.tsx (U6) so every menopause surface reads the
 * same ember treatment.
 *
 * STICKER_SHADOW is the canonical hard-offset sticker shadow — CURRENT variant
 * only (Diffuse stays shadowless per the design brief). Geometry lives here;
 * shadowColor is injected per-call from the resolved palette ink.
 */

import {
  useTheme,
  useDiffuseTheme,
  getModeColor,
  getModeColorSoft,
  getDiffuseAccent,
  getDiffuseAccentSoft,
  diffuseFont,
} from '../../constants/theme'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'

export const STICKER_SHADOW = {
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 3,
} as const

export interface MenoPalette {
  diffuse: boolean
  radius: { md: number; lg: number; xl: number; full: number }
  accent: string
  accentSoft: string
  bg: string
  surface: string
  surfaceRaised: string
  border: string
  text: string
  textSecondary: string
  textMuted: string
  fontDisplay: string
  fontBody: string
  fontBodyMedium: string
  fontBodySemiBold: string
}

export function useMenoPalette(): MenoPalette {
  const { colors, radius, font, isDark } = useTheme()
  const dt = useDiffuseTheme()
  const diffuse = useIsDiffuse()

  if (diffuse) {
    return {
      diffuse: true,
      // Diffuse must never borrow current-system radius — use dt.radius so the
      // whole palette stays inside one token set (no current+Diffuse mixing).
      radius: { md: dt.radius.md, lg: dt.radius.lg, xl: dt.radius.xl, full: dt.radius.xl },
      accent: getDiffuseAccent('menopause', dt.isDark),
      accentSoft: getDiffuseAccentSoft('menopause', dt.isDark),
      bg: dt.colors.bg,
      surface: dt.colors.surface,
      surfaceRaised: dt.colors.surface,
      border: dt.colors.line,
      text: dt.colors.ink,
      textSecondary: dt.colors.ink2,
      textMuted: dt.colors.ink3,
      fontDisplay: diffuseFont.display,
      fontBody: diffuseFont.body,
      fontBodyMedium: diffuseFont.bodyMedium,
      fontBodySemiBold: diffuseFont.bodySemiBold,
    }
  }
  return {
    diffuse: false,
    radius: { md: radius.md, lg: radius.lg, xl: radius.xl, full: radius.full },
    accent: getModeColor('menopause', isDark),
    accentSoft: getModeColorSoft('menopause', isDark),
    bg: colors.bg,
    surface: colors.surface,
    surfaceRaised: colors.surfaceRaised,
    border: colors.border,
    text: colors.text,
    textSecondary: colors.textSecondary,
    textMuted: colors.textMuted,
    fontDisplay: font.display,
    fontBody: font.body,
    fontBodyMedium: font.bodyMedium,
    fontBodySemiBold: font.bodySemiBold,
  }
}
