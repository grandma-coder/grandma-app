import { PATHS } from '@/components/stickers/paths'

/** The eye sticker's drawing box, with room for its rays. */
export const EYE_VIEWBOX = '-6 -6 76 76'

/** The eye sticker as a standalone SVG. `bg` fills the whole box (the favicon sits on the paper colour like the .ico and PWA icons). */
export function eyeSvg({ size, bg }: { size?: number; bg?: string } = {}): string {
  const dims = size ? ` width="${size}" height="${size}"` : ''
  const fill = bg ? `<rect x="-6" y="-6" width="76" height="76" fill="${bg}"/>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg"${dims} viewBox="${EYE_VIEWBOX}">${fill}${PATHS.eye}</svg>`
}
