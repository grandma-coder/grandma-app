import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type AppTheme = 'dark' | 'light'

// Which visual language the app renders in.
//   'current' — cream-paper / sticker-collage (default, ships today)
//   'diffuse' — design-system-v3 "Diffuse" (opt-in; being migrated screen by
//               screen). See constants/theme.ts → useDiffuseTheme().
export type ThemeVariant = 'current' | 'diffuse'

interface ThemeStore {
  theme: AppTheme
  variant: ThemeVariant
  hydrated: boolean
  setTheme: (theme: AppTheme) => void
  toggleTheme: () => void
  setVariant: (variant: ThemeVariant) => void
  toggleVariant: () => void
  setHydrated: (hydrated: boolean) => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      variant: 'current',
      hydrated: false,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
      setVariant: (variant) => set({ variant }),
      toggleVariant: () => set({ variant: get().variant === 'current' ? 'diffuse' : 'current' }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: 'grandma-theme',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ theme: state.theme, variant: state.variant }),
      // See useBehaviorStore for the rationale — must flip hydrated
      // even when there's nothing persisted to rehydrate from.
      onRehydrateStorage: () => () => {
        useThemeStore.setState({ hydrated: true })
      },
    }
  )
)
