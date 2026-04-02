/**
 * grandma.app — Dark Neon Theme
 * Follows the HTML mockup design system.
 * Fonts target: Cabinet Grotesk (display), Satoshi (body), JetBrains Mono (mono)
 */

export const colors = {
  // Core backgrounds
  background: '#0A0A0A',
  surface: '#141414',
  surfaceLight: '#1A1A1A',
  surfaceGlass: 'rgba(255, 255, 255, 0.05)',

  // Primary accent — Neon Yellow
  accent: '#F4FD50',
  accentGlow: '#F4FD50',
  accentMuted: 'rgba(244, 253, 80, 0.10)',
  accentDark: '#D4DD30',

  // Neon palette
  neon: {
    yellow: '#F4FD50',
    pink: '#FF8AD8',
    orange: '#FF6B35',
    blue: '#4D96FF',
    green: '#A2FF86',
    purple: '#B983FF',
  },

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
  success: '#A2FF86',
  error: '#FF6B35',
  warning: '#F4FD50',
  info: '#4D96FF',

  // Pillar neon colors (used as full card backgrounds in Kids grid)
  pillar: {
    milk: '#4D96FF',
    food: '#A2FF86',
    nutrition: '#F4FD50',
    vaccines: '#FF8AD8',
    clothes: '#FF6B35',
    recipes: '#141414',
    habits: '#A2FF86',
    milestones: '#B983FF',
    medicine: '#FF8AD8',
  },

  // Role colors
  role: {
    parent: 'rgba(162, 255, 134, 0.15)',
    nanny: 'rgba(185, 131, 255, 0.15)',
    family: 'rgba(255, 107, 53, 0.15)',
  },
} as const

export const gradients = {
  background: ['#0A0A0A', '#0A0A0A', '#111111'] as const,
  card: ['#1A1A1A', '#111111'] as const,
  cardHover: ['#222222', '#141414'] as const,
  accent: ['#F4FD50', '#FF6B35'] as const,
  accentSoft: ['rgba(244, 253, 80, 0.15)', 'rgba(255, 107, 53, 0.08)'] as const,
  glass: ['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.02)'] as const,
  pregnancy: ['#0A0A0A', '#0D0D1A'] as const,
  insight: ['#4D96FF', '#FF8AD8', '#A2FF86'] as const,
} as const

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

export const borderRadius = {
  sm: 12,
  md: 20,
  lg: 32,
  xl: 40,
  '2xl': 48,
  full: 9999,
} as const

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

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  glow: {
    shadowColor: '#F4FD50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  glowPink: {
    shadowColor: '#FF8AD8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  glowBlue: {
    shadowColor: '#4D96FF',
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
