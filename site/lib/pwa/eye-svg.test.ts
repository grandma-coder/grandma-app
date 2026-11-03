import { describe, expect, it } from 'vitest'
import { PATHS } from '@/components/stickers/paths'
import { eyeSvg, EYE_VIEWBOX } from './eye-svg'
import { PWA_BG } from './manifest'

describe('eyeSvg', () => {
  it('draws the eye sticker in a standalone svg', () => {
    const svg = eyeSvg()
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true)
    expect(svg).toContain(`viewBox="${EYE_VIEWBOX}"`)
    expect(svg).toContain(PATHS.eye)
    expect(svg).not.toContain('<rect')
    expect(svg.slice(0, svg.indexOf('>'))).not.toContain(' width=')
  })
  it('sizes it and puts it on the paper background when asked (favicon = same eye as the .ico / PWA icons)', () => {
    const svg = eyeSvg({ size: 48, bg: PWA_BG })
    expect(svg).toContain('width="48" height="48"')
    expect(svg).toContain(`fill="${PWA_BG}"`)
    expect(svg.indexOf('<rect')).toBeLessThan(svg.indexOf(PATHS.eye))
  })
})
