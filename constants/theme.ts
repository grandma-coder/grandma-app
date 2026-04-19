/**
 * grandma.app — Design Token System
 *
 * Stack: React Native + Expo Router + TypeScript + NativeWind
 * State: Zustand v5. Data fetching: React Query. Backend: Supabase.
 *
 * RULE: Components NEVER hardcode hex values — always use semantic tokens.
 *
 * Design language (Apr 2026 redesign):
 *   Light default — cream paper canvas, editorial serif display, sticker accents
 *   Dark  — warm ink on dark parchment, same stickers
 */

import { useColorScheme } from 'react-native'
import { useThemeStore } from '../store/useThemeStore'

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

  // Journey mode colors — softer pastels (2026 redesign)
  prePregnancy: '#E58BB4',   // rose
  pregnancy: '#B7A6E8',      // lavender
  kids: '#8BB8E8',           // powder blue

  // Journey mode soft tints
  prePregnancySoft: '#F7CFDD',
  pregnancySoft: '#E0D5F3',
  kidsSoft: '#D4E3F3',

  // Legacy mode colors kept for any components not yet migrated
  prePregnancyLegacy: '#FF8AD8',
  pregnancyLegacy: '#B983FF',
  kidsLegacy: '#4D96FF',

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

// ─── STICKER PALETTE (always available, used as accents) ────────────────────

export const stickers = {
  yellow: '#F5D652',
  yellowSoft: '#FBEA9E',
  blue: '#9DC3E8',
  blueSoft: '#CFE0F0',
  pink: '#F2B2C7',
  pinkSoft: '#F9D8E2',
  green: '#BDD48C',
  greenSoft: '#DDE7BB',
  lilac: '#C8B6E8',
  lilacSoft: '#E3D8F2',
  peach: '#F5B896',
  peachSoft: '#F9D6C0',
  coral: '#EE7B6D',
  charcoal: '#2A2624',
} as const

// Dark mode sticker overrides (slightly brighter)
export const stickersDark = {
  yellow: '#F0CE4C',
  yellowSoft: '#3A3116',
  blue: '#A5C8EC',
  blueSoft: '#1C2A3A',
  pink: '#F5BBCF',
  pinkSoft: '#36222A',
  green: '#C5DA98',
  greenSoft: '#283016',
  lilac: '#D0BFEC',
  lilacSoft: '#2A2340',
  peach: '#F7C09D',
  peachSoft: '#3A2618',
  coral: '#F29082',
  charcoal: '#F5EDDC',
} as const

// ─── LIGHT MODE TOKENS — cream paper canvas ─────────────────────────────────

export const lightTokens = {
  // Canvas
  bg: '#F3ECD9',             // cream
  bgWarm: '#EFE5CC',         // slightly deeper cream
  surface: '#FFFEF8',        // card paper white
  surfaceRaised: '#F7F0DF',  // nested cards
  surfaceGlass: 'rgba(20,19,19,0.04)',

  // Borders
  border: 'rgba(20,19,19,0.08)',
  borderLight: 'rgba(20,19,19,0.05)',
  borderStrong: 'rgba(20,19,19,0.14)',

  // Text — near-black ink on cream
  text: '#141313',
  textSecondary: '#3A3533',
  textMuted: '#6E6763',
  textFaint: '#A69E93',
  textInverse: '#F5EDDC',

  // Interactive
  primary: '#7048B8',
  primaryLight: '#9B70D4',
  primaryTint: '#EFE6FF',

  secondary: '#3B7DD8',
  secondaryTint: '#E3EDFF',

  accent: brand.pregnancy,   // mode-driven — lavender default
  accentSoft: brand.pregnancySoft,

  success: '#2E7D32',
  successTint: '#E8F5E9',
  warning: '#E65100',
  error: '#C62828',

  // Tab bar
  tabBg: 'rgba(20,19,19,0.96)',
  tabBorder: 'rgba(20,19,19,0.06)',
  tabActive: brand.pregnancy,
  tabInactive: 'rgba(245,237,220,0.55)',
} as const

// ─── DARK MODE TOKENS — warm ink on parchment ──────────────────────────────

export const darkTokens = {
  // Canvas
  bg: '#1A1713',             // warm dark
  bgWarm: '#13110E',         // deeper warm dark
  surface: '#232019',        // card parchment
  surfaceRaised: '#2C2820',  // elevated cards
  surfaceGlass: 'rgba(245,237,220,0.06)',

  // Borders
  border: 'rgba(245,237,220,0.08)',
  borderLight: 'rgba(245,237,220,0.05)',
  borderStrong: 'rgba(245,237,220,0.14)',

  // Text — cream on dark
  text: '#F5EDDC',
  textSecondary: '#D6CCB5',
  textMuted: '#9E9684',
  textFaint: '#6E6757',
  textInverse: '#141313',

  // Interactive
  primary: '#C4B5EF',        // lavender brightened for dark
  primaryLight: '#D8CCFA',
  primaryTint: 'rgba(196,181,239,0.15)',

  secondary: '#A5C9F0',
  secondaryTint: 'rgba(165,201,240,0.15)',

  accent: '#C4B5EF',
  accentSoft: '#2D2842',

  success: '#6EC96E',
  successTint: 'rgba(110,201,110,0.15)',
  warning: '#FFB347',
  error: '#FF7070',

  // Tab bar
  tabBg: 'rgba(26,23,19,0.96)',
  tabBorder: 'rgba(245,237,220,0.06)',
  tabActive: '#C4B5EF',
  tabInactive: 'rgba(245,237,220,0.45)',
} as const

// ─── COLOR TOKEN TYPE ──────────────────────────────────────────────────────

export type ColorTokens = { [K in keyof typeof lightTokens]: string }

// ─── STATIC TOKENS (same in both modes) ────────────────────────────────────

export const radius = {
  sm: 12,
  md: 20,
  lg: 28,
  xl: 36,
  xxl: 48,
  full: 999,
  // Legacy aliases
  '2xl': 48,
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  // Legacy aliases
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

// 2026 redesign fonts
export const font = {
  display: 'Fraunces_600SemiBold',         // serif editorial display
  italic: 'InstrumentSerif_400Regular_Italic', // italic accent
  body: 'DMSans_400Regular',               // UI body
  bodyMedium: 'DMSans_500Medium',          // medium weight UI
  bodySemiBold: 'DMSans_600SemiBold',      // semibold UI labels
  // Legacy — kept for screens not yet migrated
  displayLegacy: 'CabinetGrotesk-Black',
  bodyLegacy: 'Satoshi-Variable',
} as const

// ─── useTheme() HOOK ───────────────────────────────────────────────────────

export function useTheme() {
  const systemScheme = useColorScheme()
  const storeTheme = useThemeStore((s) => s.theme)
  const hydrated = useThemeStore((s) => s.hydrated)

  const isDark = hydrated ? storeTheme === 'dark' : systemScheme === 'dark'
  const colors: ColorTokens = isDark ? darkTokens : lightTokens
  const st = isDark ? stickersDark : stickers

  return {
    colors,
    brand,
    stickers: st,
    radius,
    spacing,
    fontSize,
    fontWeight,
    font,
    isDark,
  }
}

// ─── MODE COLOR HELPERS ────────────────────────────────────────────────────

export function getModeColor(mode: 'pre' | 'preg' | 'kids' | string, isDark = false): string {
  if (mode === 'pre' || mode === 'pre-pregnancy') return isDark ? '#EFA2C2' : brand.prePregnancy
  if (mode === 'preg' || mode === 'pregnancy') return isDark ? '#C4B5EF' : brand.pregnancy
  if (mode === 'kids') return isDark ? '#A5C9F0' : brand.kids
  return isDark ? '#C4B5EF' : brand.pregnancy
}

export function getModeColorSoft(mode: 'pre' | 'preg' | 'kids' | string, isDark = false): string {
  if (mode === 'pre' || mode === 'pre-pregnancy') return isDark ? '#3A2730' : brand.prePregnancySoft
  if (mode === 'preg' || mode === 'pregnancy') return isDark ? '#2D2842' : brand.pregnancySoft
  if (mode === 'kids') return isDark ? '#1F2A3A' : brand.kidsSoft
  return isDark ? '#2D2842' : brand.pregnancySoft
}

// ─── LEGACY EXPORTS ────────────────────────────────────────────────────────
// Kept for existing components. Prefer useTheme() for new code.

export const THEME_COLORS = {
  yellow: stickers.yellow,
  pink: brand.prePregnancy,
  orange: stickers.coral,
  blue: brand.kids,
  green: stickers.green,
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
    milk: brand.kidsLegacy,
    food: '#A2FF86',
    nutrition: '#F59E0B',
    vaccines: brand.prePregnancyLegacy,
    clothes: '#FF6B35',
    recipes: darkTokens.surface,
    habits: '#A2FF86',
    milestones: brand.pregnancyLegacy,
    medicine: brand.prePregnancyLegacy,
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
  return colors as unknown as AppColors
}

export const gradients = {
  background: [darkTokens.bg, '#13110E', '#0D0B08'] as const,
  card: [darkTokens.surface, darkTokens.bg] as const,
  cardHover: [darkTokens.surfaceRaised, darkTokens.surface] as const,
  accent: [brand.primary, brand.primaryDark] as const,
  accentSoft: ['rgba(112,72,184,0.15)', 'rgba(59,125,216,0.08)'] as const,
  glass: ['rgba(245, 237, 220, 0.06)', 'rgba(245, 237, 220, 0.02)'] as const,
  pregnancy: [darkTokens.bg, '#1A1520'] as const,
  insight: [darkTokens.secondary, brand.prePregnancy, brand.pregnancy] as const,
} as const

export const lightGradients = {
  background: [lightTokens.bg, '#EFE5CC', '#E8DFC2'] as const,
  card: [lightTokens.surface, lightTokens.surfaceRaised] as const,
  cardHover: [lightTokens.surfaceRaised, '#ECE2C8'] as const,
  accent: [brand.primary, brand.primaryDark] as const,
  accentSoft: ['rgba(183,166,232,0.15)', 'rgba(139,184,232,0.08)'] as const,
  glass: ['rgba(20,19,19,0.04)', 'rgba(20,19,19,0.02)'] as const,
  pregnancy: [lightTokens.bg, '#F0E8FF'] as const,
  insight: [brand.secondary, brand.prePregnancy, brand.pregnancy] as const,
} as const

export function getGradients(theme: 'dark' | 'light') {
  return theme === 'light' ? lightGradients : gradients
}

// Legacy aliases
export const borderRadius = radius
export const typography = {
  hero: { fontSize: fontSize.hero, fontFamily: font.display, color: colors.text, letterSpacing: -1 },
  heading: { fontSize: fontSize.display, fontFamily: font.display, color: colors.text, letterSpacing: -0.8 },
  title: { fontSize: fontSize.xl, fontFamily: font.display, color: colors.text, letterSpacing: -0.3 },
  subtitle: { fontSize: fontSize.lg, fontFamily: font.bodySemiBold, color: colors.text },
  body: { fontSize: fontSize.md, fontFamily: font.body, color: colors.text, lineHeight: 24 },
  bodySecondary: { fontSize: fontSize.md, fontFamily: font.body, color: colors.textSecondary, lineHeight: 24 },
  caption: { fontSize: fontSize.xs, fontFamily: font.bodySemiBold, color: colors.textTertiary, letterSpacing: 2, textTransform: 'uppercase' as const },
  label: { fontSize: 10 as number, fontFamily: font.bodySemiBold, color: colors.textTertiary, letterSpacing: 3, textTransform: 'uppercase' as const },
} as const

export const shadows = {
  card: { shadowColor: '#141313', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 0, elevation: 2,
          // second shadow via iOS only
  },
  cardPop: { shadowColor: '#141313', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 10 },
  pop: { shadowColor: '#141313', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.22, shadowRadius: 36, elevation: 14 },
  // Legacy glow shadows
  glow: { shadowColor: brand.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 25, elevation: 12 },
  glowPink: { shadowColor: brand.prePregnancy, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  glowBlue: { shadowColor: brand.kids, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  subtle: { shadowColor: '#141313', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 6 },
} as const

export const fonts = font
export const inputStyles = {
  selectionColor: brand.secondary,
  placeholderTextColor: lightTokens.textMuted,
  field: {
    backgroundColor: lightTokens.surface,
    borderWidth: 1,
    borderColor: lightTokens.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 64,
    fontSize: fontSize.md,
    fontFamily: font.bodyMedium,
    color: lightTokens.text,
  },
} as const
