/**
 * BrandStickers — SVG shape library ported from the redesign handoff.
 *
 * These are the playful cream-paper stickers used as backgrounds, accents,
 * and tile shapes across the app. Each sticker accepts `size`, `fill`, and
 * `stroke` so it themes naturally.
 *
 * This file currently exposes the 8 shapes needed by the Central Menu
 * Overlay and home-screen decorations. The full library (~50 shapes) from
 * `docs/.../src/stickers.jsx` will be ported in a later pass as we wire
 * them into additional surfaces.
 */
import Svg, { Path, Polygon, Circle as SvgCircle, Ellipse, G } from 'react-native-svg'

const INK = '#141313'

interface BaseProps {
  size?: number
  fill?: string
  stroke?: string
}

// ── 1. Burst — sunburst star, good for "Insights" / attention ──────────────
export function Burst({
  size = 80,
  fill = '#F5D652',
  stroke = INK,
  points = 12,
  wobble = 0.22,
}: BaseProps & { points?: number; wobble?: number }) {
  const cx = size / 2
  const cy = size / 2
  const r1 = size * 0.48
  const r2 = size * (0.48 - wobble)
  const pts: string[] = []
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? r1 : r2
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2
    pts.push(`${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`)
  }
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Polygon points={pts.join(' ')} fill={fill} stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
  )
}

// ── 2. Blob — organic squircle in three variants ───────────────────────────
export function Blob({
  size = 80,
  fill = '#F5D652',
  stroke = INK,
  variant = 0,
}: BaseProps & { variant?: 0 | 1 | 2 }) {
  const paths = [
    'M40,5 C62,5 78,20 78,42 C78,64 62,78 42,78 C18,78 5,60 5,40 C5,18 22,5 40,5 Z',
    'M50,8 C72,12 80,30 75,52 C70,74 48,80 28,72 C8,64 2,40 12,22 C22,4 34,4 50,8 Z',
    'M42,6 C66,4 82,22 78,48 C76,68 58,80 36,74 C16,68 4,48 10,28 C14,14 26,8 42,6 Z',
  ]
  return (
    <Svg width={size} height={size} viewBox="0 0 84 84">
      <Path d={paths[variant % paths.length]} fill={fill} stroke={stroke} strokeWidth={1.5} />
    </Svg>
  )
}

// ── 3. Heart ────────────────────────────────────────────────────────────────
export function Heart({ size = 80, fill = '#F2B2C7', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M50,88 C20,68 8,50 8,32 C8,18 20,10 32,10 C40,10 46,14 50,22 C54,14 60,10 68,10 C80,10 92,18 92,32 C92,50 80,68 50,88 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
      />
    </Svg>
  )
}

// ── 4. Squishy — wobble rectangle, rotatable ───────────────────────────────
export function Squishy({
  w = 120,
  h = 80,
  fill = '#F5D652',
  stroke = INK,
}: {
  w?: number
  h?: number
  fill?: string
  stroke?: string
}) {
  return (
    <Svg width={w} height={h} viewBox="0 0 120 80">
      <Path
        d="M10,14 Q60,4 110,12 Q118,40 112,68 Q60,78 8,66 Q2,40 10,14 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
      />
    </Svg>
  )
}

// ── 5. Flower — 6 petals around a center disc ──────────────────────────────
export function Flower({
  size = 80,
  petal = '#F2B2C7',
  center = '#F5D652',
  stroke = INK,
}: {
  size?: number
  petal?: string
  center?: string
  stroke?: string
}) {
  const petals = []
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * 360
    petals.push(
      <Ellipse
        key={i}
        cx={50}
        cy={22}
        rx={12}
        ry={18}
        fill={petal}
        stroke={stroke}
        strokeWidth={1.3}
        transform={`rotate(${a} 50 50)`}
      />
    )
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <G>{petals}</G>
      <SvgCircle cx={50} cy={50} r={10} fill={center} stroke={stroke} strokeWidth={1.3} />
    </Svg>
  )
}

// ── 6. Star — 5-pointed ────────────────────────────────────────────────────
export function Star({ size = 60, fill = '#F5D652', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M50,8 L61,38 L94,40 L68,60 L78,92 L50,72 L22,92 L32,60 L6,40 L39,38 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// ── 7. Drop — water droplet ────────────────────────────────────────────────
export function Drop({ size = 60, fill = '#9DC3E8', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M50,8 C50,8 22,42 22,62 C22,80 36,94 50,94 C64,94 78,80 78,62 C78,42 50,8 50,8 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
      />
    </Svg>
  )
}

// ── 8. Moon — crescent ─────────────────────────────────────────────────────
export function Moon({ size = 60, fill = '#C8B6E8', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M68,14 C46,14 30,32 30,54 C30,74 46,88 66,88 C74,88 82,84 86,78 C74,78 62,68 58,54 C54,36 60,22 68,14 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
      />
    </Svg>
  )
}

// Sticker palette — matches `docs/.../src/tokens.css` CSS vars (1:1).
export const StickerPalette = {
  yellow: '#F5D652',
  yellowSoft: '#FBEA9E',
  blue: '#9DC3E8',
  blueSoft: '#CFE0F0',
  pink: '#F2B2C7',
  pinkSoft: '#F9D8E2',
  green: '#BDD48C',
  greenSoft: '#DDE7BB',
  lilac: '#C8B6E8',
  lilacSoft: '#E3D8F2',
  peach: '#F5B896',
  peachSoft: '#F9D6C0',
  coral: '#EE7B6D',
  ink: INK,
  cream: '#F3ECD9',
  paper: '#FFFEF8',
}
