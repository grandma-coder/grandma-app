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
  Line,
  G,
} from 'react-native-svg'

const INK = '#141313'

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

// ═══════════════════════════════════════════════════════════════════════════
// Expanded sticker set — ported 1:1 from docs/.../src/stickers.jsx
// ═══════════════════════════════════════════════════════════════════════════

// 13. Squiggle
export function Squiggle({ w = 120, h = 24, stroke = INK }: { w?: number; h?: number; stroke?: string }) {
  return (
    <Svg width={w} height={h} viewBox="0 0 120 24">
      <Path
        d="M4,12 Q16,2 28,12 T52,12 T76,12 T100,12 T116,12"
        stroke={stroke}
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  )
}

// 14. Sun — disc + 8 rays
export function Sun({ size = 70, fill = '#F5D652', stroke = INK }: StickerProps) {
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2
    const x1 = 50 + Math.cos(a) * 30
    const y1 = 50 + Math.sin(a) * 30
    const x2 = 50 + Math.cos(a) * 44
    const y2 = 50 + Math.sin(a) * 44
    return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
  })
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="22" fill={fill} stroke={stroke} strokeWidth="1.5" />
      {rays}
    </Svg>
  )
}

// 15. Cloud
export function Cloud({ size = 80, fill = '#C8D4E8', stroke = INK }: StickerProps) {
  return (
    <Svg width={size} height={size * 0.65} viewBox="0 0 120 80">
      <Path
        d="M20,60 C8,60 8,42 22,40 C22,22 48,18 52,36 C60,22 88,24 88,42 C104,42 106,60 92,62 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
      />
    </Svg>
  )
}

// 16. Rainbow
export function Rainbow({ size = 80 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.6} viewBox="0 0 100 60">
      <Path d="M8,58 A42,42 0 0 1 92,58" fill="none" stroke="#EE4A3C" strokeWidth="6" />
      <Path d="M14,58 A36,36 0 0 1 86,58" fill="none" stroke="#F5D652" strokeWidth="6" />
      <Path d="M20,58 A30,30 0 0 1 80,58" fill="none" stroke="#BDD48C" strokeWidth="6" />
      <Path d="M26,58 A24,24 0 0 1 74,58" fill="none" stroke="#9DC3E8" strokeWidth="6" />
      <Path d="M32,58 A18,18 0 0 1 68,58" fill="none" stroke="#C8B6E8" strokeWidth="6" />
    </Svg>
  )
}

// 17. Lightning bolt
export function Bolt({ size = 60, fill = '#F5D652', stroke = INK }: StickerProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M54,8 L22,54 L44,54 L38,92 L78,38 L54,38 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// 18. Footprint
export function Foot({ size = 60, fill = '#F2B2C7', stroke = INK }: StickerProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M30,80 C20,70 20,48 34,40 C48,32 60,44 58,62 C56,78 44,90 30,80 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
      />
      <Circle cx="52" cy="28" r="6" fill={fill} stroke={stroke} strokeWidth="1.3" />
      <Circle cx="66" cy="24" r="5" fill={fill} stroke={stroke} strokeWidth="1.3" />
      <Circle cx="78" cy="30" r="4.5" fill={fill} stroke={stroke} strokeWidth="1.3" />
      <Circle cx="85" cy="42" r="4" fill={fill} stroke={stroke} strokeWidth="1.3" />
    </Svg>
  )
}

// 19. Pacifier
export function Pacifier({ size = 70, fill = '#F2B2C7', stroke = INK }: StickerProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx="50" cy="54" r="24" fill={fill} stroke={stroke} strokeWidth="1.5" />
      <Ellipse cx="50" cy="28" rx="10" ry="8" fill="#F5D652" stroke={stroke} strokeWidth="1.5" />
      <Circle cx="50" cy="54" r="10" fill="#F5EDDC" stroke={stroke} strokeWidth="1.3" />
    </Svg>
  )
}

// 20. Bottle
export function Bottle({ size = 70, fill = '#9DC3E8', stroke = INK }: StickerProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x="34" y="28" width="32" height="56" rx="10" fill={fill} stroke={stroke} strokeWidth="1.5" />
      <Rect x="38" y="14" width="24" height="16" rx="4" fill="#F5D652" stroke={stroke} strokeWidth="1.5" />
      <Line x1="38" y1="48" x2="62" y2="48" stroke={stroke} strokeWidth="1.2" strokeDasharray="2 3" />
      <Line x1="38" y1="60" x2="62" y2="60" stroke={stroke} strokeWidth="1.2" strokeDasharray="2 3" />
    </Svg>
  )
}

// 21. Onesie
export function Onesie({ size = 80, fill = '#C8B6E8', stroke = INK }: StickerProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M30,16 h40 l8,14 l-12,8 v42 a6,6 0 0 1 -6,6 h-20 a6,6 0 0 1 -6,-6 v-42 l-12,-8 z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <Circle cx="42" cy="20" r="2" fill={stroke} />
      <Circle cx="58" cy="20" r="2" fill={stroke} />
    </Svg>
  )
}

// 22. Teddy bear face
export function Bear({ size = 74, fill = '#E5C39A', stroke = INK }: StickerProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx="26" cy="26" r="12" fill={fill} stroke={stroke} strokeWidth="1.5" />
      <Circle cx="74" cy="26" r="12" fill={fill} stroke={stroke} strokeWidth="1.5" />
      <Circle cx="50" cy="54" r="32" fill={fill} stroke={stroke} strokeWidth="1.5" />
      <Circle cx="40" cy="50" r="2.4" fill={stroke} />
      <Circle cx="60" cy="50" r="2.4" fill={stroke} />
      <Ellipse cx="50" cy="62" rx="5" ry="4" fill={stroke} />
      <Path d="M44,70 Q50,74 56,70" stroke={stroke} strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </Svg>
  )
}

// 23. Stroller
export function Stroller({ size = 80, fill = '#F2B2C7', stroke = INK }: StickerProps) {
  return (
    <Svg width={size} height={size * 0.8} viewBox="0 0 100 80">
      <Path
        d="M14,12 l14,40 h48 M28,52 a22,22 0 0 0 44,0 c0-14-10-22-22-22 h-18"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <Circle cx="32" cy="66" r="8" fill={stroke} />
      <Circle cx="68" cy="66" r="8" fill={stroke} />
      <Circle cx="32" cy="66" r="3" fill="#F5EDDC" />
      <Circle cx="68" cy="66" r="3" fill="#F5EDDC" />
    </Svg>
  )
}

// 24. Smiley
export function Smiley({ size = 66, fill = '#F5D652', stroke = INK }: StickerProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="42" fill={fill} stroke={stroke} strokeWidth="1.5" />
      <Circle cx="38" cy="42" r="3" fill={stroke} />
      <Circle cx="62" cy="42" r="3" fill={stroke} />
      <Path d="M34,60 Q50,74 66,60" stroke={stroke} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </Svg>
  )
}

// 25. Sad face
export function Sad({ size = 66, fill = '#9DC3E8', stroke = INK }: StickerProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="42" fill={fill} stroke={stroke} strokeWidth="1.5" />
      <Circle cx="38" cy="44" r="3" fill={stroke} />
      <Circle cx="62" cy="44" r="3" fill={stroke} />
      <Path d="M34,68 Q50,56 66,68" stroke={stroke} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </Svg>
  )
}

// 26. Sleepy face
export function Sleepy({ size = 66, fill = '#C8B6E8', stroke = INK }: StickerProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="42" fill={fill} stroke={stroke} strokeWidth="1.5" />
      <Path d="M30,44 Q38,38 46,44 M54,44 Q62,38 70,44" stroke={stroke} strokeWidth="2" fill="none" strokeLinecap="round" />
      <Path d="M36,64 Q50,60 64,64" stroke={stroke} strokeWidth="2" fill="none" strokeLinecap="round" />
    </Svg>
  )
}

// 27. Apple
export function Apple({ size = 64, fill = '#EE4A3C', stroke = INK }: StickerProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M50,26 C42,18 24,22 22,44 C20,68 38,88 50,88 C62,88 80,68 78,44 C76,22 58,18 50,26 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
      />
      <Path d="M50,26 C50,14 56,8 64,8" stroke={stroke} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <Path d="M56,30 Q66,24 72,32" fill="#BDD48C" stroke={stroke} strokeWidth="1.4" />
    </Svg>
  )
}

// 28. Carrot
export function Carrot({ size = 60, fill = '#EE7B6D', stroke = INK }: StickerProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M30,86 L68,36 L82,48 L40,90 Z" fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
      <Path d="M64,32 C68,22 76,18 82,20 C84,26 80,34 70,38 Z" fill="#BDD48C" stroke={stroke} strokeWidth="1.5" />
      <Path d="M74,24 C80,18 88,18 94,22 C92,30 84,34 76,32 Z" fill="#BDD48C" stroke={stroke} strokeWidth="1.5" />
    </Svg>
  )
}

// 29. Cupcake
export function Cupcake({ size = 70, fill = '#F2B2C7', stroke = INK }: StickerProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M22,56 L30,88 h40 l8,-32 z" fill="#F5EDDC" stroke={stroke} strokeWidth="1.5" />
      <Path d="M20,58 C20,38 40,30 50,30 C60,30 80,38 80,58 Z" fill={fill} stroke={stroke} strokeWidth="1.5" />
      <Circle cx="50" cy="24" r="4" fill="#EE4A3C" stroke={stroke} strokeWidth="1.3" />
    </Svg>
  )
}

// 30. Ice cream
export function IceCream({ size = 64, fill = '#F2B2C7', stroke = INK }: StickerProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M34,50 L50,94 L66,50 Z" fill="#E5C39A" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
      <Circle cx="42" cy="44" r="14" fill={fill} stroke={stroke} strokeWidth="1.5" />
      <Circle cx="58" cy="44" r="14" fill="#BDD48C" stroke={stroke} strokeWidth="1.5" />
      <Circle cx="50" cy="30" r="13" fill="#F5D652" stroke={stroke} strokeWidth="1.5" />
    </Svg>
  )
}

// 31. Cake slice
export function Cake({ size = 72, fill = '#F2B2C7', stroke = INK }: StickerProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M20,62 h60 v22 h-60 z" fill="#F5EDDC" stroke={stroke} strokeWidth="1.5" />
      <Path d="M20,62 Q50,50 80,62 Q50,74 20,62 Z" fill={fill} stroke={stroke} strokeWidth="1.5" />
      <Rect x="46" y="30" width="8" height="20" fill="#9DC3E8" stroke={stroke} strokeWidth="1.3" />
      <Path d="M50,22 Q54,16 50,10 Q46,16 50,22 Z" fill="#F5D652" stroke={stroke} strokeWidth="1.3" />
    </Svg>
  )
}

// 32. Gift box
export function Gift({ size = 68, fill = '#EE4A3C', stroke = INK }: StickerProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x="14" y="38" width="72" height="48" fill={fill} stroke={stroke} strokeWidth="1.5" />
      <Rect x="10" y="26" width="80" height="16" fill="#F5D652" stroke={stroke} strokeWidth="1.5" />
      <Rect x="44" y="26" width="12" height="60" fill="#C8B6E8" stroke={stroke} strokeWidth="1.5" />
      <Path
        d="M50,26 C40,14 20,18 30,26 C22,22 38,28 50,26 Z M50,26 C60,14 80,18 70,26 C78,22 62,28 50,26 Z"
        fill="#C8B6E8"
        stroke={stroke}
        strokeWidth="1.5"
      />
    </Svg>
  )
}

// 33. Balloon
export function Balloon({ size = 60, fill = '#EE4A3C', stroke = INK }: StickerProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Ellipse cx="50" cy="38" rx="26" ry="30" fill={fill} stroke={stroke} strokeWidth="1.5" />
      <Path d="M46,68 L54,68 L50,74 Z" fill={fill} stroke={stroke} strokeWidth="1.3" />
      <Path d="M50,74 Q46,84 54,90 Q46,96 50,100" stroke={stroke} strokeWidth="1.3" fill="none" />
    </Svg>
  )
}

// 34. Cherry
export function Cherry({ size = 66, fill = '#EE4A3C', stroke = INK }: StickerProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx="34" cy="72" r="16" fill={fill} stroke={stroke} strokeWidth="1.5" />
      <Circle cx="68" cy="72" r="16" fill={fill} stroke={stroke} strokeWidth="1.5" />
      <Path
        d="M34,58 C40,30 60,18 82,16 M68,58 C70,32 78,22 82,16"
        stroke={stroke}
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
      <Path d="M82,16 Q92,10 94,20" fill="#BDD48C" stroke={stroke} strokeWidth="1.3" />
    </Svg>
  )
}

// 35. Mushroom
export function Mushroom({ size = 64, fill = '#EE4A3C', stroke = INK }: StickerProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M16,52 C16,28 36,14 52,14 C70,14 86,32 86,52 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
      />
      <Circle cx="34" cy="38" r="5" fill="#F5EDDC" stroke={stroke} strokeWidth="1.3" />
      <Circle cx="58" cy="30" r="4" fill="#F5EDDC" stroke={stroke} strokeWidth="1.3" />
      <Circle cx="68" cy="46" r="3.5" fill="#F5EDDC" stroke={stroke} strokeWidth="1.3" />
      <Path
        d="M36,52 h30 v24 a8,8 0 0 1 -8,8 h-14 a8,8 0 0 1 -8,-8 z"
        fill="#F5EDDC"
        stroke={stroke}
        strokeWidth="1.5"
      />
    </Svg>
  )
}

// 36. Butterfly
export function Butterfly({ size = 70, fill = '#C8B6E8', stroke = INK }: StickerProps) {
  return (
    <Svg width={size} height={size * 0.8} viewBox="0 0 100 80">
      <Path d="M50,40 C32,14 8,20 8,40 C8,56 32,60 50,46 Z" fill={fill} stroke={stroke} strokeWidth="1.5" />
      <Path d="M50,40 C68,14 92,20 92,40 C92,56 68,60 50,46 Z" fill={fill} stroke={stroke} strokeWidth="1.5" />
      <Ellipse cx="50" cy="44" rx="3" ry="22" fill={stroke} />
      <Path d="M50,22 L46,14 M50,22 L54,14" stroke={stroke} strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </Svg>
  )
}

// 37. Bee
export function Bee({ size = 66, fill = '#F5D652', stroke = INK }: StickerProps) {
  return (
    <Svg width={size} height={size * 0.85} viewBox="0 0 100 85">
      <Ellipse cx="50" cy="48" rx="28" ry="22" fill={fill} stroke={stroke} strokeWidth="1.5" />
      <Path d="M42,28 L44,68 M54,28 L56,68" stroke={stroke} strokeWidth="4" fill="none" />
      <Ellipse cx="32" cy="30" rx="14" ry="8" fill="#F5EDDC" stroke={stroke} strokeWidth="1.3" transform="rotate(-20 32 30)" />
      <Ellipse cx="68" cy="30" rx="14" ry="8" fill="#F5EDDC" stroke={stroke} strokeWidth="1.3" transform="rotate(20 68 30)" />
      <Circle cx="76" cy="46" r="2.2" fill={stroke} />
    </Svg>
  )
}

// 38. Fish
export function Fish({ size = 70, fill = '#9DC3E8', stroke = INK }: StickerProps) {
  return (
    <Svg width={size} height={size * 0.7} viewBox="0 0 100 70">
      <Path d="M10,36 C20,16 56,16 70,36 C56,56 20,56 10,36 Z" fill={fill} stroke={stroke} strokeWidth="1.5" />
      <Path d="M70,36 L92,18 L86,36 L92,56 Z" fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
      <Circle cx="26" cy="32" r="3" fill={stroke} />
    </Svg>
  )
}

// 39. Whale
export function Whale({ size = 76, fill = '#9DC3E8', stroke = INK }: StickerProps) {
  return (
    <Svg width={size} height={size * 0.7} viewBox="0 0 100 70">
      <Path
        d="M10,44 C10,28 30,20 50,22 C70,24 88,32 88,46 C88,58 68,62 50,60 C30,58 10,60 10,44 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
      />
      <Circle cx="30" cy="40" r="2.4" fill={stroke} />
      <Path d="M70,22 Q74,10 82,12 M74,22 Q80,14 88,16" stroke={stroke} strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </Svg>
  )
}

// 40. Ghost
export function Ghost({ size = 66, fill = '#F5EDDC', stroke = INK }: StickerProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M20,46 C20,22 80,22 80,46 L80,88 L72,82 L64,88 L56,82 L50,88 L44,82 L36,88 L28,82 L20,88 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <Circle cx="40" cy="50" r="4" fill={stroke} />
      <Circle cx="60" cy="50" r="4" fill={stroke} />
      <Ellipse cx="50" cy="64" rx="5" ry="4" fill={stroke} />
    </Svg>
  )
}

// 41. Eye
export function Eye({ size = 66, stroke = INK }: StickerProps) {
  return (
    <Svg width={size} height={size * 0.7} viewBox="0 0 100 70">
      <Path d="M6,36 C20,12 80,12 94,36 C80,60 20,60 6,36 Z" fill="#F5EDDC" stroke={stroke} strokeWidth="1.5" />
      <Circle cx="50" cy="36" r="16" fill="#9DC3E8" stroke={stroke} strokeWidth="1.5" />
      <Circle cx="50" cy="36" r="6" fill={stroke} />
      <Circle cx="54" cy="32" r="2" fill="#F5EDDC" />
    </Svg>
  )
}

// 42. Key
export function Key({ size = 70, fill = '#F5D652', stroke = INK }: StickerProps) {
  return (
    <Svg width={size} height={size * 0.5} viewBox="0 0 100 50">
      <Circle cx="24" cy="25" r="14" fill={fill} stroke={stroke} strokeWidth="1.5" />
      <Circle cx="24" cy="25" r="4" fill="#F5EDDC" stroke={stroke} strokeWidth="1.3" />
      <Path
        d="M38,25 h52 v8 h-8 v6 h-6 v-6 h-8 v8 h-6 v-8 h-24 z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// 43. Paper plane
export function Plane({ size = 70, fill = '#9DC3E8', stroke = INK }: StickerProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M10,50 L90,12 L70,90 L48,62 Z" fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
      <Path d="M48,62 L90,12" stroke={stroke} strokeWidth="1.3" fill="none" />
    </Svg>
  )
}

// 44. Sparkle / twinkle
export function Sparkle({ size = 56, fill = '#F5D652', stroke = INK }: StickerProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M50,8 C52,36 64,48 92,50 C64,52 52,64 50,92 C48,64 36,52 8,50 C36,48 48,36 50,8 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// 45. Lips
export function Lips({ size = 66, fill = '#EE4A3C', stroke = INK }: StickerProps) {
  return (
    <Svg width={size} height={size * 0.55} viewBox="0 0 100 55">
      <Path
        d="M10,22 Q28,2 50,22 Q72,2 90,22 Q72,50 50,36 Q28,50 10,22 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <Path d="M10,22 Q50,34 90,22" stroke={stroke} strokeWidth="1.4" fill="none" />
    </Svg>
  )
}

// 46. Diamond
export function Diamond({ size = 60, fill = '#9DC3E8', stroke = INK }: StickerProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M50,8 L86,38 L50,92 L14,38 Z" fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
      <Path
        d="M14,38 h72 M36,38 L50,8 L64,38 M36,38 L50,92 M64,38 L50,92"
        stroke={stroke}
        strokeWidth="1.3"
        fill="none"
      />
    </Svg>
  )
}

// 47. Gem (hex)
export function Gem({ size = 60, fill = '#C8B6E8', stroke = INK }: StickerProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M30,10 h40 l24,40 l-44,44 l-44,-44 z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <Path
        d="M6,50 h88 M30,10 L50,50 L70,10 M50,50 L50,94"
        stroke={stroke}
        strokeWidth="1.3"
        fill="none"
      />
    </Svg>
  )
}

// 48. Crown
export function Crown({ size = 72, fill = '#F5D652', stroke = INK }: StickerProps) {
  return (
    <Svg width={size} height={size * 0.75} viewBox="0 0 100 75">
      <Path
        d="M8,24 L28,48 L50,16 L72,48 L92,24 L86,68 L14,68 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <Circle cx="28" cy="48" r="3" fill="#EE4A3C" stroke={stroke} strokeWidth="1.2" />
      <Circle cx="50" cy="16" r="3" fill="#EE4A3C" stroke={stroke} strokeWidth="1.2" />
      <Circle cx="72" cy="48" r="3" fill="#EE4A3C" stroke={stroke} strokeWidth="1.2" />
    </Svg>
  )
}

// 49. Clock face
export function ClockFace({ size = 66, fill = '#F5EDDC', stroke = INK }: StickerProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="42" fill={fill} stroke={stroke} strokeWidth="1.5" />
      <Path
        d="M50,50 L50,24 M50,50 L70,60"
        stroke={stroke}
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx="50" cy="50" r="3" fill={stroke} />
      <Circle cx="50" cy="14" r="1.6" fill={stroke} />
      <Circle cx="86" cy="50" r="1.6" fill={stroke} />
      <Circle cx="50" cy="86" r="1.6" fill={stroke} />
      <Circle cx="14" cy="50" r="1.6" fill={stroke} />
    </Svg>
  )
}

// 50. Waving hand
export function Wave({ size = 66, fill = '#E5C39A', stroke = INK }: StickerProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M30,82 C14,68 10,50 24,36 L38,22 C42,18 48,22 46,28 L38,40 L46,32 C50,26 58,30 54,38 L46,50 L58,36 C62,30 70,34 66,42 L58,54 L68,44 C72,40 78,44 74,52 L62,72 C56,82 42,92 30,82 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// 51. Lungs (breath)
export function Lungs({ size = 72, fill = '#F2B2C7', stroke = INK }: StickerProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M50,16 L50,60" stroke={stroke} strokeWidth="2" fill="none" />
      <Path
        d="M50,30 C40,30 22,40 22,62 C22,78 32,86 42,84 C50,82 48,70 48,58 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
      />
      <Path
        d="M50,30 C60,30 78,40 78,62 C78,78 68,86 58,84 C50,82 52,70 52,58 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
      />
    </Svg>
  )
}

// 52. Pill capsule
export function Pill({ size = 64, fill = '#F5D652', stroke = INK }: StickerProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <G transform="rotate(-35 50 50)">
        <Rect x="14" y="36" width="72" height="28" rx="14" fill={fill} stroke={stroke} strokeWidth="1.5" />
        <Rect x="14" y="36" width="36" height="28" rx="14" fill="#EE4A3C" stroke={stroke} strokeWidth="1.5" />
        <Line x1="50" y1="36" x2="50" y2="64" stroke={stroke} strokeWidth="1.5" />
      </G>
    </Svg>
  )
}
