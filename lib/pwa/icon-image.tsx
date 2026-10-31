import { ImageResponse } from 'next/og'
import { PATHS } from '@/components/stickers/paths'
import { PWA_BG } from './manifest'

/** The eye sticker on the paper background, `pad` = share of the canvas left empty around it. */
export function eyeIcon(size: number, pad: number): ImageResponse {
  const art = Math.round(size * (1 - pad * 2))
  // satori has no innerHTML: hand it the eye as an SVG data URI
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${art}" height="${art}" viewBox="-6 -6 76 76">${PATHS.eye}</svg>`
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: PWA_BG }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={art} height={art} alt="" />
      </div>
    ),
    { width: size, height: size },
  )
}
