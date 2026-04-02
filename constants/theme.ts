/**
 * grandma.app — Dark Cosmic Theme
 * Central design tokens used across the entire app.
 */

export const colors = {
  // Core backgrounds
  background: '#0A0E1A',
  surface: '#141829',
  surfaceLight: '#1A1F3A',
  surfaceGlass: 'rgba(255, 255, 255, 0.06)',

  // Accent
  accent: '#F5C754',
  accentGlow: '#FFD97D',
  accentMuted: 'rgba(245, 199, 84, 0.15)',
  accentDark: '#C99A2E',

  // Text
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  textTertiary: 'rgba(255, 255, 255, 0.35)',
  textOnAccent: '#0A0E1A',

  // Borders
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.12)',
  borderAccent: 'rgba(245, 199, 84, 0.3)',

  // Status
  success: '#4ADE80',
  error: '#F87171',
  warning: '#FBBF24',
  info: '#60A5FA',

  // Pillar colors (muted for dark theme)
  pillar: {
    milk: '#F9A8D4',
    food: '#86EFAC',
    nutrition: '#FDE68A',
    vaccines: '#93C5FD',
    clothes: '#C4B5FD',
    recipes: '#FDBA74',
    habits: '#6EE7B7',
    milestones: '#67E8F9',
    medicine: '#FCA5A5',
  },

  // Role colors
  role: {
    parent: 'rgba(74, 222, 128, 0.15)',
    nanny: 'rgba(196, 181, 253, 0.15)',
    family: 'rgba(253, 186, 116, 0.15)',
  },
} as const

export const gradients = {
  background: ['#0A0E1A', '#0D1224', '#111833'] as const,
  card: ['#1A1F3A', '#0D1117'] as const,
  cardHover: ['#222847', '#141829'] as const,
  accent: ['#F5C754', '#FF8A5C'] as const,
  accentSoft: ['rgba(245, 199, 84, 0.2)', 'rgba(255, 138, 92, 0.1)'] as const,
  glass: ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)'] as const,
  pregnancy: ['#1A1040', '#0A0E1A'] as const,
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
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const

export const typography = {
  hero: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: colors.text,
    letterSpacing: -0.5,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: colors.text,
    letterSpacing: -0.3,
  },
  title: {
    fontSize: 22,
    fontWeight: '600' as const,
    color: colors.text,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: colors.text,
    lineHeight: 24,
  },
  bodySecondary: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  caption: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.textTertiary,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
} as const

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  glow: {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
} as const
