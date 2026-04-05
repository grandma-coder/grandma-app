/**
 * ThemeProvider — wraps app with theme context
 *
 * For new components: use useTheme() from constants/theme.ts directly.
 * This provider exists for legacy components using useAppTheme().
 * Both work — useTheme() is preferred for new code.
 */

import { createContext, useContext } from 'react'
import { useThemeStore, type AppTheme } from '../../store/useThemeStore'
import {
  lightTokens,
  darkTokens,
  getGradients,
  type ColorTokens,
} from '../../constants/theme'

// Legacy AppColors type for backward compat
export type AppColors = {
  background: string
  surface: string
  surfaceLight: string
  surfaceGlass: string
  accent: string
  accentGlow: string
  accentMuted: string
  accentDark: string
  neon: Record<string, string>
  text: string
  textSecondary: string
  textTertiary: string
  textOnAccent: string
  border: string
  borderLight: string
  borderAccent: string
  success: string
  error: string
  warning: string
  info: string
  pillar: Record<string, string>
  role: Record<string, string>
  tabBar: string
  tabBarInactive: string
}

function tokensToLegacy(t: ColorTokens): AppColors {
  return {
    background: t.bg,
    surface: t.surface,
    surfaceLight: t.surfaceRaised,
    surfaceGlass: t.surfaceGlass,
    accent: t.primary,
    accentGlow: t.primary,
    accentMuted: t.primaryTint,
    accentDark: t.primary,
    neon: {},
    text: t.text,
    textSecondary: t.textSecondary,
    textTertiary: t.textMuted,
    textOnAccent: t.textInverse,
    border: t.border,
    borderLight: t.borderLight,
    borderAccent: t.borderStrong,
    success: t.success,
    error: t.error,
    warning: t.warning,
    info: t.secondary,
    pillar: {},
    role: {},
    tabBar: t.tabBg,
    tabBarInactive: t.tabInactive,
  }
}

interface ThemeContextValue {
  theme: AppTheme
  isDark: boolean
  colors: AppColors
  gradients: ReturnType<typeof getGradients>
}

const defaultCtx: ThemeContextValue = {
  theme: 'dark',
  isDark: true,
  colors: tokensToLegacy(darkTokens),
  gradients: getGradients('dark'),
}

const ThemeContext = createContext<ThemeContextValue>(defaultCtx)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme)
  const isDark = theme === 'dark'
  const tokens = isDark ? darkTokens : lightTokens

  const value: ThemeContextValue = {
    theme,
    isDark,
    colors: tokensToLegacy(tokens),
    gradients: getGradients(theme),
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

/** Legacy hook — prefer useTheme() from constants/theme.ts for new components */
export function useAppTheme() {
  return useContext(ThemeContext)
}
