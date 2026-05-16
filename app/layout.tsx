import type { Metadata } from 'next'
import { Fraunces, DM_Sans, Instrument_Serif } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  variable: '--font-instrument-serif',
  display: 'swap',
  weight: ['400'],
  style: ['italic'],
})

export const metadata: Metadata = {
  title: 'Grandma · A calmer companion for pre-pregnancy, pregnancy, and kids',
  description: 'Grandma is a parenting companion app powered by AI — guiding you through trying-to-conceive, pregnancy, and raising kids 0–5y. Currently in early access. Join the waitlist.',
  generator: 'v0.app',
  openGraph: {
    title: 'Grandma · Wisdom for every stage of becoming a parent',
    description: 'From trying, to pregnant, to raising little ones. The calm parenting companion.',
    type: 'website',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
  },
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-[#F3ECD9]">
      <body
        className={`${fraunces.variable} ${dmSans.variable} ${instrumentSerif.variable} antialiased`}
        style={{
          fontFamily: 'var(--font-dm-sans), var(--font-body)',
        }}
      >
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
