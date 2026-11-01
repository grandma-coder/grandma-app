import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type AppTheme = 'dark' | 'light'

// Which visual language the app renders in.
//   'current' — cream paper + stickers, restyled in Nov 2026 to match grandma.app
//               (hand-lettered display, Hanken, ink outlines). DEFAULT.
//   'diffuse' — design-system-v3 "Diffuse". Off; still reachable via
//               Dev Panel → DESIGN VARIANT. See constants/theme.ts → useDiffuseTheme().
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
      theme: 'light',
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
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ theme: state.theme, variant: state.variant }),
      // History: v0 → v1 moved everyone to Diffuse. v1 → v2 (below) moves everyone to the
      // restyled 'current' look on the light canvas. Choices made after that persist at v2.
      migrate: (persisted, version) => {
        const s = (persisted ?? {}) as Partial<ThemeStore>
        // v1 → v2: the site-look redesign ships as the default on the light canvas — flip everyone once
        // (variant was never user-facing; theme can be switched back in Settings and persists at v2).
        if (version < 2) return { ...s, variant: 'current' as ThemeVariant, theme: 'light' as AppTheme }
        return s
      },
      // See useBehaviorStore for the rationale — must flip hydrated
      // even when there's nothing persisted to rehydrate from.
      onRehydrateStorage: () => () => {
        useThemeStore.setState({ hydrated: true })
      },
    }
  )
)
