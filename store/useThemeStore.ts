import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type AppTheme = 'dark' | 'light'

// Which visual language the app renders in.
//   'diffuse' — design-system-v3 "Diffuse" (DEFAULT as of the v3 ship).
//               See constants/theme.ts → useDiffuseTheme().
//   'current' — legacy cream-paper / sticker-collage. Still fully supported and
//               reachable via Dev Panel → DESIGN VARIANT, but no longer default.
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
      variant: 'diffuse',
      hydrated: false,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
      setVariant: (variant) => set({ variant }),
      toggleVariant: () => set({ variant: get().variant === 'current' ? 'diffuse' : 'current' }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: 'grandma-theme',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ theme: state.theme, variant: state.variant }),
      // v0 → v1: Diffuse became the default visual language. Existing installs
      // have `variant: 'current'` persisted from before it shipped; since there
      // was never a user-facing variant toggle (dev-panel only), no user chose
      // 'current' deliberately — so flip everyone to 'diffuse' once. Team
      // members can switch back in the Dev Panel; that choice persists at v1
      // and won't be re-migrated.
      migrate: (persisted, version) => {
        const s = (persisted ?? {}) as Partial<ThemeStore>
        if (version < 1) return { ...s, variant: 'diffuse' as ThemeVariant }
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
