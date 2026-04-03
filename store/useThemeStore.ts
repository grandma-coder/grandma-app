import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type AppTheme = 'dark' | 'light'

interface ThemeStore {
  theme: AppTheme
  hydrated: boolean
  setTheme: (theme: AppTheme) => void
  toggleTheme: () => void
  setHydrated: (hydrated: boolean) => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      hydrated: false,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: 'grandma-theme',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true)
      },
    }
  )
)
