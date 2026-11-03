import { useLanguageStore } from '../store/useLanguageStore'

/** BCP-47 locale for Intl/toLocale*String, from the current app language. Non-hook; reads at call time. */
export function dateLoc(): string {
  const l = useLanguageStore.getState().language
  return l === 'en' ? 'en-US' : l
}

/** Short weekday name (0 = Sunday) in the app language. */
export function weekdayShort(i: number): string {
  return new Date(2021, 7, 1 + i).toLocaleDateString(dateLoc(), { weekday: 'short' })
}
