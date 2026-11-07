/** Command center languages. Portuguese is the default; the choice lives in a cookie, not in the URL. */
export const LOCALES = ["pt", "en"] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = "pt"
export const LOCALE_COOKIE = "NEXT_LOCALE"
export const isLocale = (v: string | undefined): v is Locale => !!v && (LOCALES as readonly string[]).includes(v)
/** BCP-47 tag for <html lang> and Intl formatting. */
export const htmlLang = (l: Locale) => (l === "pt" ? "pt-BR" : "en")
