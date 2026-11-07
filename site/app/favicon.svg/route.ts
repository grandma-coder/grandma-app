import { eyeSvg } from '@/lib/pwa/eye-svg'
import { PWA_BG } from '@/lib/pwa/manifest'

export const dynamic = 'force-static'

/** Tab icon for browsers that take SVG: the same eye on paper as /favicon.ico and the PWA icons, crisp at any size. */
export function GET() {
  return new Response(eyeSvg({ bg: PWA_BG }), { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' } })
}
