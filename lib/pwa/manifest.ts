import type { MetadataRoute } from 'next'

export const PWA_BG = '#F3F0E8'

/** Icon files served from `/icons/<file>` (drawn at build time from the eye sticker). `pad` = share of the canvas left empty around it. */
export const ICONS: Record<string, { size: number; pad: number }> = {
  'icon-192.png': { size: 192, pad: 0.1 },
  'icon-512.png': { size: 512, pad: 0.1 },
  'icon-maskable-512.png': { size: 512, pad: 0.22 },
  'apple-touch-icon.png': { size: 180, pad: 0.1 },
}

export function buildManifest(): MetadataRoute.Manifest {
  // '/' (not '/en'): the middleware redirects to the visitor's locale, so a PT install opens in PT
  const start = '/'
  return {
    id: start,
    name: 'grandma',
    short_name: 'grandma',
    start_url: start,
    scope: '/',
    display: 'standalone',
    background_color: PWA_BG,
    theme_color: PWA_BG,
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
