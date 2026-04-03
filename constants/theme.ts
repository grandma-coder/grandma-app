/**
 * grandma.app — Neon Design System
 * React Native Components Export Guide
 *
 * Fonts: Cabinet Grotesk (display/headings), Satoshi (body), JetBrains Mono (mono/labels)
 * Load via expo-font — see lib/fonts.ts
 */

// ─── NEON COLOR PALETTE ─────────────────────────────────────────────────────

export const THEME_COLORS = {
  yellow: '#F4FD50',
  pink: '#FF8AD8',
  orange: '#FF6B35',
  blue: '#4D96FF',
  green: '#A2FF86',
  purple: '#B983FF',
  dark: '#0A0A0A',
} as const

// ─── DARK COLORS (default) ──────────────────────────────────────────────────

export const darkColors = {
  background: '#1A1030',
  surface: '#241845',
  surfaceLight: '#2D2055',
  surfaceGlass: 'rgba(255, 255, 255, 0.05)',
  accent: THEME_COLORS.yellow,
  accentGlow: THEME_COLORS.yellow,
  accentMuted: 'rgba(244, 253, 80, 0.10)',
  accentDark: '#D4DD30',
  neon: THEME_COLORS,
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.50)',
  textTertiary: 'rgba(255, 255, 255, 0.30)',
  textOnAccent: '#0A0A0A',
  border: 'rgba(255, 255, 255, 0.10)',
  borderLight: 'rgba(255, 255, 255, 0.15)',
  borderAccent: 'rgba(244, 253, 80, 0.30)',
  success: THEME_COLORS.green,
  error: THEME_COLORS.orange,
  warning: THEME_COLORS.yellow,
  info: THEME_COLORS.blue,
  pillar: {
    milk: THEME_COLORS.blue,
    food: THEME_COLORS.green,
    nutrition: THEME_COLORS.yellow,
    vaccines: THEME_COLORS.pink,
    clothes: THEME_COLORS.orange,
    recipes: '#241845',
    habits: THEME_COLORS.green,
    milestones: THEME_COLORS.purple,
    medicine: THEME_COLORS.pink,
  },
  role: {
    parent: 'rgba(162, 255, 134, 0.15)',
    nanny: 'rgba(185, 131, 255, 0.15)',
    family: 'rgba(255, 107, 53, 0.15)',
  },
  // Tab bar
  tabBar: '#1A1030',
  tabBarInactive: 'rgba(255,255,255,0.20)',
} as const

// ─── LIGHT COLORS ───────────────────────────────────────────────────────────

export const lightColors = {
  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceLight: '#E8E8ED',
  surfaceGlass: 'rgba(0, 0, 0, 0.05)',
  accent: '#C8A800',
  accentGlow: '#C8A800',
  accentMuted: 'rgba(180, 150, 0, 0.12)',
  accentDark: '#9A8200',
  neon: THEME_COLORS,
  text: '#111111',
  textSecondary: '#555555',
  textTertiary: '#888888',
  textOnAccent: '#111111',
  border: 'rgba(0, 0, 0, 0.12)',
  borderLight: 'rgba(0, 0, 0, 0.18)',
  borderAccent: 'rgba(180, 150, 0, 0.35)',
  success: '#1A8A1A',
  error: '#CC3311',
  warning: '#B89400',
  info: '#2A6ACB',
  pillar: {
    milk: '#D6E8FF',
    food: '#D6FFD0',
    nutrition: '#FFF9CC',
    vaccines: '#FFD6F0',
    clothes: '#FFD6C4',
    recipes: '#E8E8ED',
    habits: '#D6FFD0',
    milestones: '#E8D6FF',
    medicine: '#FFD6F0',
  },
  role: {
    parent: 'rgba(26, 138, 26, 0.15)',
    nanny: 'rgba(120, 60, 200, 0.15)',
    family: 'rgba(204, 51, 17, 0.15)',
  },
  tabBar: '#FFFFFF',
  tabBarInactive: 'rgba(0,0,0,0.35)',
} as const

// Use a structural type so dark and light palettes are compatible
export type AppColors = {
  [K in keyof typeof darkColors]: K extends 'pillar' | 'role' | 'neon'
    ? Record<string, string>
    : string
}

export function getColors(theme: 'dark' | 'light'): AppColors {
  return (theme === 'light' ? lightColors : darkColors) as unknown as AppColors
}

// ─── Default export (dark) — used by files that haven't migrated to context ─
export const colors = darkColors

// ─── GRADIENTS ──────────────────────────────────────────────────────────────

export const gradients = {
  background: ['#1A1030', '#150D28', '#100A20'] as const,
  card: ['#241845', '#1A1030'] as const,
  cardHover: ['#2D2055', '#241845'] as const,
  accent: [THEME_COLORS.yellow, THEME_COLORS.orange] as const,
  accentSoft: ['rgba(244, 253, 80, 0.15)', 'rgba(255, 107, 53, 0.08)'] as const,
  glass: ['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.02)'] as const,
  pregnancy: ['#1A1030', '#1A0D30'] as const,
  insight: [THEME_COLORS.blue, THEME_COLORS.pink, THEME_COLORS.green] as const,
} as const

export const lightGradients = {
  background: ['#F5F5F7', '#EDEDF0', '#E8E8EB'] as const,
  card: ['#FFFFFF', '#F8F8FA'] as const,
  cardHover: ['#F0F0F2', '#E8E8EB'] as const,
  accent: ['#E8C800', '#D4A800'] as const,
  accentSoft: ['rgba(232, 200, 0, 0.10)', 'rgba(217, 69, 32, 0.05)'] as const,
  glass: ['rgba(0, 0, 0, 0.02)', 'rgba(0, 0, 0, 0.01)'] as const,
  pregnancy: ['#F5F5F7', '#F0F0FA'] as const,
  insight: [THEME_COLORS.blue, THEME_COLORS.pink, THEME_COLORS.green] as const,
} as const

export function getGradients(theme: 'dark' | 'light') {
  return theme === 'light' ? lightGradients : gradients
}

// ─── SPACING ────────────────────────────────────────────────────────────────

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
} as const

// ─── BORDER RADIUS ──────────────────────────────────────────────────────────

export const borderRadius = {
  sm: 12,
  md: 20,
  lg: 32,
  xl: 40,
  '2xl': 48,
  full: 999,   // Pill shape — matches guide (borderRadius: 999)
} as const

// ─── FONT FAMILIES ──────────────────────────────────────────────────────────
// These require font files in assets/fonts/ loaded via expo-font.
// Fallback to system font if not loaded.

export const fonts = {
  display: 'CabinetGrotesk-Extrabold',  // Headings, titles, CTAs
  displayBold: 'CabinetGrotesk-Bold',
  body: 'Satoshi-Medium',               // Body text
  bodyBold: 'Satoshi-Bold',
  mono: 'JetBrainsMono-Medium',         // Labels, timestamps, technical
} as const

// ─── TYPOGRAPHY ─────────────────────────────────────────────────────────────

export const typography = {
  hero: {
    fontSize: 48,
    fontWeight: '900' as const,
    color: colors.text,
    letterSpacing: -1,
    textTransform: 'uppercase' as const,
  },
  heading: {
    fontSize: 36,
    fontWeight: '900' as const,
    color: colors.text,
    letterSpacing: -0.8,
    textTransform: 'uppercase' as const,
  },
  title: {
    fontSize: 24,
    fontWeight: '900' as const,
    color: colors.text,
    letterSpacing: -0.3,
    textTransform: 'uppercase' as const,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: colors.text,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  body: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: colors.text,
    lineHeight: 24,
  },
  bodySecondary: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  caption: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: colors.textTertiary,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
  label: {
    fontSize: 10,
    fontWeight: '900' as const,
    color: colors.textTertiary,
    letterSpacing: 3,
    textTransform: 'uppercase' as const,
  },
} as const

// ─── SHADOWS ────────────────────────────────────────────────────────────────

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  glow: {
    shadowColor: THEME_COLORS.yellow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 25,
    elevation: 12,
  },
  glowPink: {
    shadowColor: THEME_COLORS.pink,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  glowBlue: {
    shadowColor: THEME_COLORS.blue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  glowGreen: {
    shadowColor: THEME_COLORS.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  glowOrange: {
    shadowColor: THEME_COLORS.orange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
} as const

// ─── INPUT STYLES ───────────────────────────────────────────────────────────
// Shared input styles matching the design guide

export const inputStyles = {
  selectionColor: THEME_COLORS.blue,
  placeholderTextColor: colors.textTertiary,
  field: {
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: 24,
    height: 72,
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text,
  },
} as const
