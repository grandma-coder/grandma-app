import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { ImageResponse } from 'next/og'
import { getTranslations } from 'next-intl/server'
import { PATHS, type StickerName } from '@/components/stickers/paths'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// `alt` must be a static export: generateImageMetadata (the per-locale route) breaks static generation here
// (`headers()` inside generateStaticParams), so the alt is the brand name; the image text itself is localised.
export const alt = 'grandma'

const PAPER = '#F3F0E8'
const INK = '#161513'

/** A sticker as an SVG data URI (satori has no innerHTML). The viewBox leaves room for the 3.2 stroke. */
function sticker(name: StickerName): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="-3 -3 70 70">${PATHS[name]}</svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

type Item = { words: string[]; icon?: StickerName; after?: string }

/**
 * "Your life [flower] and ..." -> items. A sticker keeps the word before it and the punctuation after it
 * in one nowrap group, like the site, so a wrap never strands a comma or a full stop.
 */
function items(line: string): Item[] {
  const out: Item[] = []
  for (const part of line.split(/(\[[a-z0-9]+\])/)) {
    const m = /^\[([a-z0-9]+)\]$/.exec(part)
    if (m && m[1] in PATHS) {
      const prev = out.at(-1)?.icon ? undefined : out.pop()
      const head = prev?.words.slice(0, -1) ?? []
      if (head.length) out.push({ words: head })
      out.push({ words: prev?.words.slice(-1) ?? [], icon: m[1] as StickerName })
    } else {
      const last = out.at(-1)
      let rest = part
      if (last?.icon) {
        const p = /^[.,;:!?]+/.exec(rest)
        if (p) { last.after = p[0]; rest = rest.slice(p[0].length) }
      }
      const words = rest.split(/\s+/).filter(Boolean)
      if (words.length) out.push({ words })
    }
  }
  return out
}

/** The site's hand font (SIL OFL, assets/fonts) read from disk: no network at build. Falls back to the default sans. */
async function handFont(): Promise<Buffer | null> {
  try {
    return await readFile(fileURLToPath(new URL('../../assets/fonts/ArchitectsDaughter-Regular.ttf', import.meta.url)))
  } catch {
    return null
  }
}

const CORNERS: { icon: StickerName; style: Record<string, string | number> }[] = [
  { icon: 'moon', style: { left: 56, top: 48, transform: 'rotate(-12deg)' } },
  { icon: 'heart', style: { right: 64, top: 56, transform: 'rotate(9deg)' } },
  { icon: 'flame', style: { right: 72, bottom: 52, transform: 'rotate(-8deg)' } },
  { icon: 'star', style: { left: 80, bottom: 56, transform: 'rotate(14deg)' } },
]

export default async function OG({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const h = await getTranslations({ locale, namespace: 'v3.hero' })
  const font = await handFont()
  const family = font ? 'Hand' : 'sans-serif'
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', alignItems: 'center', justifyContent: 'center', background: PAPER, color: INK, fontFamily: family }}>
        {CORNERS.map((c) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={c.icon} src={sticker(c.icon)} width={96} height={96} alt="" style={{ position: 'absolute', ...c.style }} />
        ))}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 980 }}>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 40, marginBottom: 36 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sticker('eye')} width={56} height={56} alt="" style={{ marginRight: 14 }} />
            grandma
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', fontSize: 80, lineHeight: 1.2 }}>
            {items(h('rebus')).map((it, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                {it.words.map((w, k) => <span key={k} style={{ marginRight: 18 }}>{w}</span>)}
                {it.icon && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sticker(it.icon)} width={96} height={96} alt="" style={{ margin: '0 4px', transform: `rotate(${i % 2 ? 7 : -6}deg)` }} />
                )}
                {it.icon && <span style={{ marginRight: 18 }}>{it.after ?? ''}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: font ? [{ name: 'Hand', data: font.buffer.slice(font.byteOffset, font.byteOffset + font.byteLength) as ArrayBuffer, weight: 400, style: 'normal' }] : undefined },
  )
}
