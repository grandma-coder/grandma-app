import { useLanguageStore } from '../store/useLanguageStore'

/** BCP-47 locale for Intl/toLocale*String, from the current app language. Non-hook; reads at call time. */
export function dateLoc(): string {
  const l = useLanguageStore.getState().language
  return l === 'en' ? 'en-US' : l
}

/** A number in the app language ("7,5" in pt-BR/es), no thousands separator. */
export function numLoc(n: number, maxFrac: number, minFrac = 0): string {
  return n.toLocaleString(dateLoc(), { maximumFractionDigits: maxFrac, minimumFractionDigits: minFrac, useGrouping: false })
}

/** Short weekday name (0 = Sunday) in the app language. */
export function weekdayShort(i: number): string {
  return new Date(2021, 7, 1 + i).toLocaleDateString(dateLoc(), { weekday: 'short' })
}
