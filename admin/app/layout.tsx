import { ClerkProvider } from "@clerk/nextjs"
import { ptBR } from "@clerk/localizations"
import { NextIntlClientProvider } from "next-intl"
import { getLocale, getMessages } from "next-intl/server"
import { htmlLang, type Locale } from "@/i18n/config"
import { Providers } from "@/components/Providers"
import type { Metadata } from "next"
import { Inter, Space_Grotesk } from "next/font/google"
import "./globals.css"

// Fonts mirror the mother dashboard: Inter (body/--font-sans) + Space Grotesk
// (display/--font-display). Exposed as CSS vars consumed in globals.css.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" })
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk", display: "swap" })

export const metadata: Metadata = {
  title: "grandma command center",
  description: "Internal admin console for grandma.app",
  robots: { index: false, follow: false },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = (await getLocale()) as Locale
  const messages = await getMessages()
  return (
    <html
      lang={htmlLang(locale)}
      data-theme="light"
      data-skin="central"
      suppressHydrationWarning
      className={`${inter.variable} ${spaceGrotesk.variable} h-full`}
    >
      <body className="min-h-full">
        <ClerkProvider localization={locale === "pt" ? ptBR : undefined}>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <Providers>{children}</Providers>
          </NextIntlClientProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}
