import { createContext, useContext } from 'react'
import { useThemeStore, type AppTheme } from '../../store/useThemeStore'
import { getColors, getGradients, type AppColors } from '../../constants/theme'

interface ThemeContextValue {
  theme: AppTheme
  isDark: boolean
  colors: AppColors
  gradients: ReturnType<typeof getGradients>
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  isDark: true,
  colors: getColors('dark'),
  gradients: getGradients('dark'),
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme)
  const value: ThemeContextValue = {
    theme,
    isDark: theme === 'dark',
    colors: getColors(theme),
    gradients: getGradients(theme),
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useAppTheme() {
  return useContext(ThemeContext)
}
