import { cookies } from "next/headers"
import { getRequestConfig } from "next-intl/server"
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "./config"
import { pt } from "@/messages/pt"
import { en } from "@/messages/en"

export default getRequestConfig(async () => {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value
  const locale = isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE
  return { locale, messages: locale === "pt" ? pt : en, timeZone: "America/Sao_Paulo" }
})
