/**
 * grandma.app — Dual-Mode Design Token System
 *
 * Stack: React Native + Expo Router + TypeScript + NativeWind
 * State: Zustand v5. Data fetching: React Query. Backend: Supabase.
 *
 * RULE: Components NEVER hardcode hex values — always use semantic tokens.
 */

import { useColorScheme } from 'react-native'

// ─── BRAND COLORS (never change between modes) ─────────────────────────────

export const brand = {
  primary: '#7048B8',
  primaryLight: '#9B70D4',
  primaryDark: '#4A2880',
  primaryTint: '#EFE6FF',

  secondary: '#3B7DD8',
  secondaryTint: '#E3EDFF',

  accent: '#F59E0B',
  accentTint: '#FEF5E1',

  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',

  // Journey mode colors
  prePregnancy: '#FF8AD8',
  pregnancy: '#B983FF',
  kids: '#4D96FF',

  // Cycle phase colors
  phase: {
    menstrual: '#E8557A',
    follicular: '#D4A017',
    ovulation: '#3DAA6E',
    luteal: '#7048B8',
  },

  // Trimester colors
  trimester: {
    first: '#F9D77E',
    second: '#81C995',
    third: '#FFAB76',
  },
} as const

// ─── LIGHT MODE TOKENS ─────────────────────────────────────────────────────

export const lightTokens = {
  bg: '#FBF9FF',
  bgWarm: '#F5EEFF',

  surface: '#FFFFFF',
  surfaceRaised: '#F3EBF9',
  surfaceGlass: 'rgba(107,72,184,0.06)',

  border: '#E6DAFB',
  borderLight: '#F0E8FF',
  borderStrong: '#C4A8F0',

  text: '#1E1440',
  textSecondary: '#6B5A8A',
  textMuted: '#A393C0',
  textInverse: '#FFFFFF',

  primary: '#7048B8',
  primaryLight: '#9B70D4',
  primaryTint: '#EFE6FF',

  secondary: '#3B7DD8',
  secondaryTint: '#E3EDFF',

  accent: '#F59E0B',
  accentTint: '#FEF5E1',

  success: '#2E7D32',
  successTint: '#E8F5E9',
  warning: '#E65100',
  error: '#C62828',

  tabBg: '#FFFFFF',
  tabBorder: 'rgba(0,0,0,0.08)',
  tabActive: '#7048B8',
  tabInactive: '#A393C0',
} as const

// ─── DARK MODE TOKENS ──────────────────────────────────────────────────────

export const darkTokens = {
  bg: '#0E0B1A',
  bgWarm: '#140F28',

  surface: '#1A1430',
  surfaceRaised: '#231B42',
  surfaceGlass: 'rgba(255,255,255,0.06)',

  border: 'rgba(255,255,255,0.12)',
  borderLight: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.24)',

  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.35)',
  textInverse: '#1E1440',

  primary: '#A07FDC',
  primaryLight: '#C4A8F0',
  primaryTint: 'rgba(160,127,220,0.15)',

  secondary: '#6AABF7',
  secondaryTint: 'rgba(106,171,247,0.15)',

  accent: '#FBBF24',
  accentTint: 'rgba(251,191,36,0.15)',

  success: '#6EC96E',
  successTint: 'rgba(110,201,110,0.15)',
  warning: '#FFB347',
  error: '#FF7070',

  tabBg: '#0E0B1A',
  tabBorder: 'rgba(255,255,255,0.06)',
  tabActive: '#A07FDC',
  tabInactive: 'rgba(255,255,255,0.40)',
} as const

// ─── COLOR TOKEN TYPE ──────────────────────────────────────────────────────

// Structural type so light and dark tokens are interchangeable
export type ColorTokens = { [K in keyof typeof lightTokens]: string }

// ─── STATIC TOKENS (same in both modes) ────────────────────────────────────

export const radius = {
  sm: 12,
  md: 16,
  lg: 32,
  xl: 48,
  full: 999,
  // Legacy alias
  '2xl': 48,
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  // Legacy aliases (used by existing code)
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
} as const

export const fontSize = {
  xs: 11,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  display: 36,
  hero: 48,
} as const

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  black: '900' as const,
}

export const font = {
  display: 'CabinetGrotesk-Black',
  body: 'Satoshi-Variable',
} as const

// ─── useTheme() HOOK ───────────────────────────────────────────────────────

export function useTheme() {
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'
  const colors: ColorTokens = isDark ? darkTokens : lightTokens

  return {
    colors,
    brand,
    radius,
    spacing,
    fontSize,
    fontWeight,
    font,
    isDark,
  }
}

// ─── LEGACY EXPORTS ────────────────────────────────────────────────────────
// These keep existing components working while we migrate to useTheme().
// TODO: Remove once all components use useTheme() hook.

export const THEME_COLORS = {
  yellow: brand.accent,
  pink: brand.prePregnancy,
  orange: '#FF6B35',
  blue: brand.kids,
  green: '#A2FF86',
  purple: brand.pregnancy,
  dark: darkTokens.bg,
} as const

export const colors = {
  background: darkTokens.bg,
  surface: darkTokens.surface,
  surfaceLight: darkTokens.surfaceRaised,
  surfaceGlass: darkTokens.surfaceGlass,
  accent: darkTokens.primary,
  accentGlow: darkTokens.primary,
  accentMuted: darkTokens.primaryTint,
  accentDark: brand.primaryDark,
  neon: THEME_COLORS,
  text: darkTokens.text,
  textSecondary: darkTokens.textSecondary,
  textTertiary: darkTokens.textMuted,
  textOnAccent: darkTokens.textInverse,
  border: darkTokens.border,
  borderLight: darkTokens.borderLight,
  borderAccent: darkTokens.borderStrong,
  success: darkTokens.success,
  error: darkTokens.error,
  warning: darkTokens.warning,
  info: darkTokens.secondary,
  pillar: {
    milk: brand.kids,
    food: '#A2FF86',
    nutrition: brand.accent,
    vaccines: brand.prePregnancy,
    clothes: '#FF6B35',
    recipes: darkTokens.surface,
    habits: '#A2FF86',
    milestones: brand.pregnancy,
    medicine: brand.prePregnancy,
  },
  role: {
    parent: 'rgba(162, 255, 134, 0.15)',
    nanny: 'rgba(185, 131, 255, 0.15)',
    family: 'rgba(255, 107, 53, 0.15)',
  },
  tabBar: darkTokens.tabBg,
  tabBarInactive: darkTokens.tabInactive,
} as const

export type AppColors = {
  [K in keyof typeof colors]: (typeof colors)[K] extends Record<string, string>
    ? Record<string, string>
    : string
}

export function getColors(theme: 'dark' | 'light'): AppColors {
  // Legacy: returns the old-format colors object. Prefer useTheme() for new code.
  return colors as unknown as AppColors
}

export const gradients = {
  background: [darkTokens.bg, '#0A0714', '#08061A'] as const,
  card: [darkTokens.surface, darkTokens.bg] as const,
  cardHover: [darkTokens.surfaceRaised, darkTokens.surface] as const,
  accent: [brand.primary, brand.primaryDark] as const,
  accentSoft: ['rgba(112,72,184,0.15)', 'rgba(59,125,216,0.08)'] as const,
  glass: ['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.02)'] as const,
  pregnancy: [darkTokens.bg, '#0D0A20'] as const,
  insight: [brand.secondary, brand.prePregnancy, brand.pregnancy] as const,
} as const

export const lightGradients = {
  background: [lightTokens.bg, '#F5F0FF', '#EFE8FF'] as const,
  card: [lightTokens.surface, lightTokens.surfaceRaised] as const,
  cardHover: [lightTokens.surfaceRaised, '#ECE2F8'] as const,
  accent: [brand.primary, brand.primaryDark] as const,
  accentSoft: ['rgba(112,72,184,0.08)', 'rgba(59,125,216,0.04)'] as const,
  glass: ['rgba(107,72,184,0.04)', 'rgba(107,72,184,0.02)'] as const,
  pregnancy: [lightTokens.bg, '#F0E8FF'] as const,
  insight: [brand.secondary, brand.prePregnancy, brand.pregnancy] as const,
} as const

export function getGradients(theme: 'dark' | 'light') {
  return theme === 'light' ? lightGradients : gradients
}

// Legacy aliases
export const borderRadius = radius
export const typography = {
  hero: { fontSize: fontSize.hero, fontWeight: fontWeight.black, color: colors.text, letterSpacing: -1, textTransform: 'uppercase' as const },
  heading: { fontSize: fontSize.display, fontWeight: fontWeight.black, color: colors.text, letterSpacing: -0.8, textTransform: 'uppercase' as const },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.black, color: colors.text, letterSpacing: -0.3, textTransform: 'uppercase' as const },
  subtitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  body: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text, lineHeight: 24 },
  bodySecondary: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.textSecondary, lineHeight: 24 },
  caption: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textTertiary, letterSpacing: 2, textTransform: 'uppercase' as const },
  label: { fontSize: 10 as number, fontWeight: fontWeight.black, color: colors.textTertiary, letterSpacing: 3, textTransform: 'uppercase' as const },
} as const

export const shadows = {
  card: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 },
  glow: { shadowColor: brand.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 25, elevation: 12 },
  glowPink: { shadowColor: brand.prePregnancy, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  glowBlue: { shadowColor: brand.kids, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  glowGreen: { shadowColor: '#A2FF86', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  glowOrange: { shadowColor: '#FF6B35', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  subtle: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
} as const

export const fonts = font
export const inputStyles = {
  selectionColor: brand.secondary,
  placeholderTextColor: colors.textTertiary,
  field: {
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    height: 72,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
} as const
