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

// ─── COLORS ─────────────────────────────────────────────────────────────────

export const colors = {
  // Core backgrounds
  background: '#0A0A0A',
  surface: '#141414',
  surfaceLight: '#1A1A1A',
  surfaceGlass: 'rgba(255, 255, 255, 0.05)',

  // Primary accent — Neon Yellow
  accent: THEME_COLORS.yellow,
  accentGlow: THEME_COLORS.yellow,
  accentMuted: 'rgba(244, 253, 80, 0.10)',
  accentDark: '#D4DD30',

  // Neon palette (shortcut)
  neon: THEME_COLORS,

  // Text
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.50)',
  textTertiary: 'rgba(255, 255, 255, 0.30)',
  textOnAccent: '#0A0A0A',

  // Borders
  border: 'rgba(255, 255, 255, 0.10)',
  borderLight: 'rgba(255, 255, 255, 0.15)',
  borderAccent: 'rgba(244, 253, 80, 0.30)',

  // Status
  success: THEME_COLORS.green,
  error: THEME_COLORS.orange,
  warning: THEME_COLORS.yellow,
  info: THEME_COLORS.blue,

  // Pillar neon colors (full card backgrounds in Kids grid)
  pillar: {
    milk: THEME_COLORS.blue,
    food: THEME_COLORS.green,
    nutrition: THEME_COLORS.yellow,
    vaccines: THEME_COLORS.pink,
    clothes: THEME_COLORS.orange,
    recipes: '#141414',
    habits: THEME_COLORS.green,
    milestones: THEME_COLORS.purple,
    medicine: THEME_COLORS.pink,
  },

  // Role colors
  role: {
    parent: 'rgba(162, 255, 134, 0.15)',
    nanny: 'rgba(185, 131, 255, 0.15)',
    family: 'rgba(255, 107, 53, 0.15)',
  },
} as const

// ─── GRADIENTS ──────────────────────────────────────────────────────────────

export const gradients = {
  background: ['#0A0A0A', '#0A0A0A', '#111111'] as const,
  card: ['#1A1A1A', '#111111'] as const,
  cardHover: ['#222222', '#141414'] as const,
  accent: [THEME_COLORS.yellow, THEME_COLORS.orange] as const,
  accentSoft: ['rgba(244, 253, 80, 0.15)', 'rgba(255, 107, 53, 0.08)'] as const,
  glass: ['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.02)'] as const,
  pregnancy: ['#0A0A0A', '#0D0D1A'] as const,
  insight: [THEME_COLORS.blue, THEME_COLORS.pink, THEME_COLORS.green] as const,
} as const

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
