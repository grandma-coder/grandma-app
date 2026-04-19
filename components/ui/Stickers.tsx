/**
 * Stickers — playful SVG shapes used as decorative accents
 * Used on headers, cards, onboarding screens.
 * All accept fill/stroke props so they theme with sticker palette.
 */

import Svg, {
  Circle,
  Path,
  Polygon,
  Ellipse,
  Rect,
} from 'react-native-svg'

interface StickerProps {
  size?: number
  fill?: string
  stroke?: string
}

// 1. Sunburst / star burst
export function Burst({
  size = 80,
  fill = '#F5D652',
  stroke = '#141313',
  points = 12,
  wobble = 0.22,
}: StickerProps & { points?: number; wobble?: number }) {
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
      <Polygon
        points={pts.join(' ')}
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// 2. Organic blob
const BLOB_PATHS = [
  'M40,5 C62,5 78,20 78,42 C78,64 62,78 42,78 C18,78 5,60 5,40 C5,18 22,5 40,5 Z',
  'M50,8 C72,12 80,30 75,52 C70,74 48,80 28,72 C8,64 2,40 12,22 C22,4 34,4 50,8 Z',
  'M42,6 C66,4 82,22 78,48 C76,68 58,80 36,74 C16,68 4,48 10,28 C14,14 26,8 42,6 Z',
]

export function Blob({
  size = 80,
  fill = '#F5D652',
  variant = 0,
  stroke = '#141313',
}: StickerProps & { variant?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 84 84">
      <Path
        d={BLOB_PATHS[variant % BLOB_PATHS.length]}
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
      />
    </Svg>
  )
}

// 3. Heart
export function Heart({ size = 80, fill = '#F2B2C7', stroke = '#141313' }: StickerProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M50,88 C20,68 8,50 8,32 C8,18 20,10 32,10 C40,10 46,14 50,22 C54,14 60,10 68,10 C80,10 92,18 92,32 C92,50 80,68 50,88 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
      />
    </Svg>
  )
}

// 4. Cross / plus (health motif)
export function Cross({ size = 80, fill = '#F5D652', stroke = '#141313' }: StickerProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M38,10 h24 a6,6 0 0 1 6,6 v22 h22 a6,6 0 0 1 6,6 v12 a6,6 0 0 1 -6,6 h-22 v22 a6,6 0 0 1 -6,6 h-24 a6,6 0 0 1 -6,-6 v-22 h-22 a6,6 0 0 1 -6,-6 v-12 a6,6 0 0 1 6,-6 h22 v-22 a6,6 0 0 1 6,-6 z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// 5. Squiggle wobble rectangle
export function Squishy({
  w = 120,
  h = 80,
  fill = '#F5D652',
  stroke = '#141313',
}: { w?: number; h?: number; fill?: string; stroke?: string }) {
  return (
    <Svg width={w} height={h} viewBox="0 0 120 80">
      <Path
        d="M10,14 Q60,4 110,12 Q118,40 112,68 Q60,78 8,66 Q2,40 10,14 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
      />
    </Svg>
  )
}

// 6. Dashed circle outline
export function CircleDashed({ size = 40, stroke = '#141313' }: { size?: number; stroke?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle
        cx="20"
        cy="20"
        r="18"
        fill="none"
        stroke={stroke}
        strokeWidth="1.3"
        strokeDasharray="2 2.5"
      />
    </Svg>
  )
}

// 7. Flower
export function Flower({
  size = 80,
  petal = '#F2B2C7',
  center = '#F5D652',
  stroke = '#141313',
}: { size?: number; petal?: string; center?: string; stroke?: string }) {
  const petals = Array.from({ length: 6 }, (_, i) => {
    const angle = (i / 6) * 360
    return (
      <Ellipse
        key={i}
        cx="50"
        cy="22"
        rx="12"
        ry="18"
        fill={petal}
        stroke={stroke}
        strokeWidth="1.3"
        transform={`rotate(${angle} 50 50)`}
      />
    )
  })
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {petals}
      <Circle cx="50" cy="50" r="10" fill={center} stroke={stroke} strokeWidth="1.3" />
    </Svg>
  )
}

// 8. Star (five-point)
export function Star({ size = 60, fill = '#F5D652', stroke = '#141313' }: StickerProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M50,8 L61,38 L94,40 L68,60 L78,92 L50,72 L22,92 L32,60 L6,40 L39,38 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// 9. Droplet
export function Drop({ size = 60, fill = '#9DC3E8', stroke = '#141313' }: StickerProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M50,8 C50,8 22,42 22,62 C22,80 36,94 50,94 C64,94 78,80 78,62 C78,42 50,8 50,8 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
      />
    </Svg>
  )
}

// 10. Moon
export function Moon({ size = 60, fill = '#C8B6E8', stroke = '#141313' }: StickerProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M68,14 C46,14 30,32 30,54 C30,74 46,88 66,88 C74,88 82,84 86,78 C74,78 62,68 58,54 C54,36 60,22 68,14 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
      />
    </Svg>
  )
}

// 11. Leaf
export function Leaf({ size = 60, fill = '#BDD48C', stroke = '#141313' }: StickerProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M12,88 C12,50 42,12 88,12 C88,58 58,88 12,88 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
      />
      <Path d="M20,82 Q50,54 84,18" stroke={stroke} strokeWidth="1.3" fill="none" />
    </Svg>
  )
}

// 12. Grandma logo eye — sunshine almond with heart iris
// Animated version is handled in GrandmaLogo.tsx
export function GrandmaEye({
  size = 80,
  body = '#F2B2C7',
  accent = '#EE4A3C',
  outline = '#141313',
}: { size?: number; body?: string; accent?: string; outline?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* Almond eye shape */}
      <Path
        d="M10,50 Q30,20 50,18 Q70,20 90,50 Q70,80 50,82 Q30,80 10,50 Z"
        fill={body}
        stroke={outline}
        strokeWidth="2"
      />
      {/* Heart iris */}
      <Path
        d="M50,62 C38,54 32,46 32,40 C32,35 36,31 40,31 C43,31 46,33 50,37 C54,33 57,31 60,31 C64,31 68,35 68,40 C68,46 62,54 50,62 Z"
        fill={accent}
      />
    </Svg>
  )
}
