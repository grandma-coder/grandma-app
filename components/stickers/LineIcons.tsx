/**
 * LineIcons — thin-stroke utility icons that mirror the domain motifs
 * from the app (Kick, Contraction, Pregnant, Milk, Crib, Rattle, etc.)
 * that Lucide doesn't cover.
 *
 * Ported 1:1 from `docs/.../src/stickers.jsx` — the `Icon` object.
 *
 * Conventions:
 *  - viewBox is always 24x24
 *  - accept `{ size, color }`; color defaults to currentColor-equivalent (ink)
 *  - strokeWidth 1.8 for outline, 2.2 for symbolic marks
 */
import Svg, { Path, Circle as SvgCircle, Rect, Line } from 'react-native-svg'

const INK = '#141313'

interface IconProps {
  size?: number
  color?: string
}

// ─── Pregnancy / motherhood ──────────────────────────────────────────────

export function KickIcon({ size = 22, color = INK }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 18c2-4 5-6 9-6s6 2 7 5"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <SvgCircle cx="14" cy="7" r="2.5" stroke={color} strokeWidth="1.8" fill="none" />
      <Path d="M9 20l-2-2 3-2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

export function ContractionIcon({ size = 22, color = INK }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 12c2-2 3-2 4 0s2 2 3-1 2-3 3 0 2 4 3 1 2-3 3-1 2 2 2 1"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  )
}

export function PregnantIcon({ size = 22, color = INK }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <SvgCircle cx="12" cy="5" r="2" stroke={color} strokeWidth="1.8" fill="none" />
      <Path
        d="M10 8c-1 1-1 4-1 6 0 3-1 4-1 6M13 8c3 0 5 3 5 6a4 4 0 0 1-4 4h-2M13 8c-1 1-1 2-1 3"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export function UterusIcon({ size = 22, color = INK }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 4c0 8-3 6-3 11a5 5 0 0 0 10 0c0 3 2 5 5 5M4 4h6M14 4h6"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export function UltrasoundIcon({ size = 22, color = INK }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 13c1-5 5-8 10-8M3 13c1 3 3 5 7 5M7 10a4 4 0 0 1 7 2M13 18l3 3 5-5"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// ─── Infant care ─────────────────────────────────────────────────────────

export function MilkIcon({ size = 22, color = INK }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 3h8l-1 4 2 3v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-9l2-3z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M7 13h10" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  )
}

export function BottleIcon({ size = 22, color = INK }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="8" y="8" width="8" height="13" rx="3" stroke={color} strokeWidth="1.8" fill="none" />
      <Path
        d="M9 3h6v3H9zM10 6l4 2M8 14h8"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export function CribIcon({ size = 22, color = INK }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 6v14M21 6v14M3 12h18M7 6v14M11 6v14M15 6v14M19 6v14M2 6h20"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export function RattleIcon({ size = 22, color = INK }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <SvgCircle cx="8" cy="8" r="4" stroke={color} strokeWidth="1.8" fill="none" />
      <Path
        d="M11 11l7 7M16 16l4 4M17 15l4 4"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export function StrollerIcon({ size = 22, color = INK }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 4l3 10h11M7 14a5 5 0 0 0 10 0c0-3-2-5-5-5h-5"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <SvgCircle cx="8" cy="19" r="2" stroke={color} strokeWidth="1.8" fill="none" />
      <SvgCircle cx="17" cy="19" r="2" stroke={color} strokeWidth="1.8" fill="none" />
    </Svg>
  )
}

export function TeddyIcon({ size = 22, color = INK }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <SvgCircle cx="12" cy="12" r="6" stroke={color} strokeWidth="1.8" fill="none" />
      <SvgCircle cx="7" cy="7" r="2" stroke={color} strokeWidth="1.8" fill="none" />
      <SvgCircle cx="17" cy="7" r="2" stroke={color} strokeWidth="1.8" fill="none" />
      <SvgCircle cx="10" cy="11" r="0.7" fill={color} />
      <SvgCircle cx="14" cy="11" r="0.7" fill={color} />
      <Path d="M10 14c1 1 3 1 4 0" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  )
}

// ─── Warmth / wellness ───────────────────────────────────────────────────

export function SootheIcon({ size = 22, color = INK }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <SvgCircle cx="12" cy="10" r="4" stroke={color} strokeWidth="1.8" fill="none" />
      <Path
        d="M12 14v2c-3 0-5 2-5 5M12 14v2c3 0 5 2 5 5"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export function HandHeartIcon({ size = 22, color = INK }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 12l6 6 11-11a3 3 0 0 0-4-4l-2 2-2-2a3 3 0 0 0-4 4z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M3 18v3h5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

export function HugsIcon({ size = 22, color = INK }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <SvgCircle cx="8" cy="8" r="3" stroke={color} strokeWidth="1.8" fill="none" />
      <SvgCircle cx="16" cy="8" r="3" stroke={color} strokeWidth="1.8" fill="none" />
      <Path
        d="M3 20c0-4 3-6 5-6M21 20c0-4-3-6-5-6M9 14c2 2 4 2 6 0"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export function NestIcon({ size = 22, color = INK }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 15c3-5 15-5 18 0M4 15c1 3 7 5 8 5s7-2 8-5"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <SvgCircle cx="10" cy="14" r="1.2" fill={color} />
      <SvgCircle cx="14" cy="14.5" r="1.2" fill={color} />
    </Svg>
  )
}

// ─── Activity ────────────────────────────────────────────────────────────

export function YogaIcon({ size = 22, color = INK }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <SvgCircle cx="12" cy="5" r="2" stroke={color} strokeWidth="1.8" fill="none" />
      <Path
        d="M6 20c0-3 6-3 6-7 0 4 6 4 6 7M9 13l-3 3M15 13l3 3"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export function FootprintIcon({ size = 22, color = INK }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 13c-2-1-3-3-3-6s1-4 3-4 3 2 3 5-1 5-3 5zM8 14c-3 0-4 2-4 4s1 3 4 3 4-2 4-4-1-3-4-3z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <SvgCircle cx="17" cy="10" r="2" stroke={color} strokeWidth="1.8" fill="none" />
      <SvgCircle cx="20" cy="7" r="1" fill={color} />
    </Svg>
  )
}

// ─── Shapes that don't exist in Lucide ───────────────────────────────────

export function WaterDropIcon({ size = 22, color = INK }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3s-7 8-7 13a7 7 0 0 0 14 0c0-5-7-13-7-13z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M9 15a3 3 0 0 0 3 3" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  )
}

export function SleepIcon({ size = 22, color = INK }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 14a8 8 0 1 1-10-10 6 6 0 0 0 10 10z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M14 4h4l-4 4h4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

export function WeightIcon({ size = 22, color = INK }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="8" width="18" height="10" rx="3" stroke={color} strokeWidth="1.8" fill="none" />
      <Path
        d="M8 8V6a4 4 0 0 1 8 0v2M8 12h8"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export function StethoscopeIcon({ size = 22, color = INK }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 3v7a5 5 0 0 0 10 0V3M5 3h2M13 3h2"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <SvgCircle cx="18" cy="14" r="2.5" stroke={color} strokeWidth="1.8" fill="none" />
      <Path
        d="M10 15v2a5 5 0 0 0 5 5 3 3 0 0 0 3-3v-2.5"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}
