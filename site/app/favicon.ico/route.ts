import { eyeIcon } from '@/lib/pwa/icon-image'
import { pngToIco } from '@/lib/pwa/ico'

export const dynamic = 'force-static'

/** Browsers ask for /favicon.ico on their own; answer with the eye (an ICO that wraps a 48px PNG). */
export async function GET() {
  const png = Buffer.from(await eyeIcon(48, 0.04).arrayBuffer())
  return new Response(new Uint8Array(pngToIco(png, 48)), { headers: { 'Content-Type': 'image/x-icon', 'Cache-Control': 'public, max-age=86400' } })
}
