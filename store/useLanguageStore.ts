import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Localization from 'expo-localization'

export type AppLanguage =
  | 'en'
  | 'pt-BR'
  | 'es'
  | 'fr'
  | 'de'
  | 'it'
  | 'ja'
  | 'ko'
  | 'zh'
  | 'ar'
  | 'hi'
  | 'tr'

export interface LanguageOption {
  code: AppLanguage
  name: string
  nativeName: string
  flag: string
  rtl?: boolean
}

// Languages the app is FULLY translated into — the only ones offered in the
// picker and used by device auto-detect. The AppLanguage type + engine still
// support all 12 (locale files remain in lib/i18n/), so re-enabling any of the
// nine below is just moving it back into this array once Tolgee has filled it.
export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)', flag: '🇧🇷' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
]

// Wired in the engine but not yet fully translated — hidden from the picker.
// Promote an entry into SUPPORTED_LANGUAGES when its locale file is complete.
export const UPCOMING_LANGUAGES: LanguageOption[] = [
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '中文 (简体)', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', rtl: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
]

function getDeviceLanguage(): AppLanguage {
  try {
    const locale = Localization.getLocales()?.[0]?.languageTag ?? 'en'
    const normalized = locale.replace('_', '-')

    // Check exact match first (e.g. pt-BR)
    const exact = SUPPORTED_LANGUAGES.find((l) => normalized.startsWith(l.code))
    if (exact) return exact.code

    // Check base language (e.g. "pt" → "pt-BR", "zh" → "zh")
    const base = normalized.split('-')[0]
    const partial = SUPPORTED_LANGUAGES.find((l) => l.code.startsWith(base))
    if (partial) return partial.code

    return 'en'
  } catch {
    return 'en'
  }
}

interface LanguageStore {
  language: AppLanguage
  hydrated: boolean
  setLanguage: (language: AppLanguage) => void
  setHydrated: (hydrated: boolean) => void
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      language: getDeviceLanguage(),
      hydrated: false,
      setLanguage: (language) => set({ language }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: 'grandma-language',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ language: state.language }),
      // See useBehaviorStore for the rationale — must flip hydrated
      // even when there's nothing persisted to rehydrate from.
      onRehydrateStorage: () => (state) => {
        // A user who picked a language that's since been removed from the
        // picker (one of the not-yet-translated nine) should fall back to
        // English rather than stay stuck on a half-translated locale.
        if (state && !SUPPORTED_LANGUAGES.some((l) => l.code === state.language)) {
          state.language = 'en'
        }
        useLanguageStore.setState({ hydrated: true })
      },
    }
  )
)
