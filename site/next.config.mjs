import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: false },
  images: { unoptimized: true },
  // iOS fetches this to bind www.thegrandma.app/accept-invite links to the app (Universal Links).
  async headers() {
    return [{ source: '/.well-known/apple-app-site-association', headers: [{ key: 'Content-Type', value: 'application/json' }] }]
  },
}

export default withNextIntl(nextConfig)
