/**
 * StickerIcon — 40x40 hand-drawn sticker icons.
 *
 * Ported 1:1 from the `icons` object in pregnancy-weeks.html.
 * Used by WeekDetailModal's WHAT TO PREPARE cards.
 */

import Svg, { Path, Circle, Line, Rect, Ellipse } from 'react-native-svg'

const INK = '#141313'

export type StickerIconName =
  | 'leaf' | 'drop' | 'pill' | 'apple' | 'mug' | 'stethoscope' | 'scan'
  | 'test' | 'syringe' | 'calendar' | 'moon' | 'yoga' | 'walk' | 'heart'
  | 'crib' | 'bottle' | 'teddy' | 'car' | 'bag' | 'book' | 'pencil'
  | 'clipboard' | 'phone' | 'bulb' | 'home' | 'briefcase' | 'star'
  | 'flower' | 'hourglass' | 'bath' | 'dumbbell' | 'checklist' | 'gift'
  | 'handshake' | 'candle' | 'map' | 'nosmoke' | 'tooth' | 'shoe'
  | 'music' | 'steak' | 'basket' | 'family' | 'microbe' | 'baby'
  | 'plate' | 'siren' | 'couch' | 'sparkle' | 'wine'

interface Props {
  name: StickerIconName
  size?: number
}

export function StickerIcon({ name, size = 36 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {iconContent(name)}
    </Svg>
  )
}

function iconContent(name: StickerIconName) {
  switch (name) {
    case 'leaf': return (
      <>
        <Path d="M6 30 Q10 6 34 10 Q30 34 6 30 Z" fill="#BDD48C" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        <Path d="M10 26 L30 14" stroke={INK} strokeWidth={1.8} strokeLinecap="round" />
        <Path d="M14 24 L20 20 M20 22 L26 18" stroke={INK} strokeWidth={1.4} opacity={0.6} strokeLinecap="round" />
      </>
    )
    case 'drop': return (
      <>
        <Path d="M20 4 Q8 20 12 28 Q20 36 28 28 Q32 20 20 4 Z" fill="#9DC3E8" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        <Ellipse cx={16} cy={22} rx={2.5} ry={4} fill="#FFFEF8" opacity={0.7} />
      </>
    )
    case 'pill': return (
      <>
        <Rect x={4} y={13} width={32} height={14} rx={7} fill="#F2B2C7" stroke={INK} strokeWidth={2.2} />
        <Line x1={20} y1={13} x2={20} y2={27} stroke={INK} strokeWidth={2.2} />
        <Circle cx={12} cy={20} r={1.5} fill={INK} opacity={0.3} />
        <Circle cx={16} cy={20} r={1.5} fill={INK} opacity={0.3} />
      </>
    )
    case 'apple': return (
      <>
        <Path d="M10 18 Q10 10 18 12 Q20 10 22 12 Q30 10 30 18 Q32 30 22 34 Q20 33 18 34 Q8 30 10 18 Z" fill="#EE7B6D" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        <Path d="M20 12 L22 4" stroke="#6B4423" strokeWidth={2.2} strokeLinecap="round" />
        <Path d="M22 8 Q26 6 28 10" fill="#BDD48C" stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
      </>
    )
    case 'mug': return (
      <>
        <Path d="M8 12 L28 12 L26 32 Q26 34 24 34 L12 34 Q10 34 10 32 Z" fill="#F5B896" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        <Path d="M28 16 Q34 16 34 22 Q34 28 28 28" fill="none" stroke={INK} strokeWidth={2.2} />
        <Path d="M14 8 Q15 4 17 6 M20 8 Q21 4 23 6" stroke={INK} strokeWidth={1.8} fill="none" strokeLinecap="round" />
      </>
    )
    case 'stethoscope': return (
      <>
        <Path d="M10 4 L10 18 Q10 26 18 26 L18 32" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
        <Path d="M30 4 L30 18 Q30 26 22 26 L22 32" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
        <Circle cx={20} cy={34} r={4} fill="#EE7B6D" stroke={INK} strokeWidth={2} />
        <Circle cx={10} cy={4} r={2} fill={INK} />
        <Circle cx={30} cy={4} r={2} fill={INK} />
      </>
    )
    case 'scan': return (
      <>
        <Rect x={4} y={10} width={32} height={22} rx={3} fill="#C8B6E8" stroke={INK} strokeWidth={2.2} />
        <Path d="M10 22 Q16 14 22 22 Q27 28 30 20" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" />
        <Circle cx={30} cy={15} r={1.8} fill={INK} />
        <Path d="M8 10 L10 6 L14 6 M32 10 L30 6 L26 6" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" />
      </>
    )
    case 'test': return (
      <>
        <Path d="M14 4 L14 28 Q14 34 20 34 Q26 34 26 28 L26 4" fill="#BDD48C" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        <Line x1={11} y1={4} x2={29} y2={4} stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
        <Path d="M14 22 L26 22" stroke={INK} strokeWidth={1.8} />
        <Circle cx={18} cy={28} r={1.2} fill={INK} opacity={0.6} />
        <Circle cx={22} cy={26} r={1.2} fill={INK} opacity={0.6} />
      </>
    )
    case 'syringe': return (
      <>
        <Rect x={8} y={14} width={22} height={10} rx={1} fill="#9DC3E8" stroke={INK} strokeWidth={2.2} />
        <Rect x={4} y={16} width={4} height={6} fill={INK} />
        <Line x1={30} y1={19} x2={38} y2={19} stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
        <Line x1={14} y1={14} x2={14} y2={24} stroke={INK} strokeWidth={1.5} opacity={0.5} />
        <Line x1={20} y1={14} x2={20} y2={24} stroke={INK} strokeWidth={1.5} opacity={0.5} />
      </>
    )
    case 'calendar': return (
      <>
        <Rect x={5} y={9} width={30} height={26} rx={3} fill="#FFFEF8" stroke={INK} strokeWidth={2.2} />
        <Path d="M5 16 L35 16" stroke={INK} strokeWidth={2.2} />
        <Line x1={12} y1={5} x2={12} y2={12} stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
        <Line x1={28} y1={5} x2={28} y2={12} stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
        <Circle cx={20} cy={25} r={4} fill="#EE7B6D" stroke={INK} strokeWidth={2} />
      </>
    )
    case 'moon': return (
      <>
        <Path d="M28 6 Q12 10 12 22 Q12 34 26 36 Q14 28 18 16 Q22 10 28 6 Z" fill="#C8B6E8" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        <Circle cx={22} cy={24} r={1.2} fill={INK} opacity={0.5} />
        <Circle cx={20} cy={30} r={1} fill={INK} opacity={0.5} />
      </>
    )
    case 'yoga': return (
      <>
        <Circle cx={20} cy={8} r={4} fill="#F5B896" stroke={INK} strokeWidth={2.2} />
        <Path d="M20 12 L20 22 M4 28 L20 22 L36 28 M20 22 L12 34 M20 22 L28 34" fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
      </>
    )
    case 'walk': return (
      <>
        <Circle cx={24} cy={7} r={3.5} fill="#F5B896" stroke={INK} strokeWidth={2.2} />
        <Path d="M24 11 L18 22 L8 26 M18 22 L26 28 L22 36 M8 26 L14 30" fill="none" stroke={INK} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      </>
    )
    case 'heart': return (
      <Path d="M20 32 Q8 22 6 14 Q6 8 13 8 Q18 8 20 13 Q22 8 27 8 Q34 8 34 14 Q32 22 20 32 Z" fill="#EE7B6D" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
    )
    case 'crib': return (
      <>
        <Rect x={4} y={14} width={32} height={20} rx={2} fill="#C8B6E8" stroke={INK} strokeWidth={2.2} />
        <Line x1={10} y1={14} x2={10} y2={34} stroke={INK} strokeWidth={1.8} />
        <Line x1={20} y1={14} x2={20} y2={34} stroke={INK} strokeWidth={1.8} />
        <Line x1={30} y1={14} x2={30} y2={34} stroke={INK} strokeWidth={1.8} />
        <Path d="M4 14 Q20 4 36 14" fill="none" stroke={INK} strokeWidth={2.2} />
      </>
    )
    case 'bottle': return (
      <>
        <Rect x={13} y={4} width={14} height={5} rx={1.5} fill={INK} />
        <Path d="M11 9 L29 9 L27 34 Q27 36 25 36 L15 36 Q13 36 13 34 Z" fill="#F9D8E2" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        <Line x1={14} y1={18} x2={26} y2={18} stroke={INK} strokeWidth={1.3} opacity={0.5} />
        <Line x1={14} y1={24} x2={26} y2={24} stroke={INK} strokeWidth={1.3} opacity={0.5} />
      </>
    )
    case 'teddy': return (
      <>
        <Circle cx={20} cy={24} r={11} fill="#D4A574" stroke={INK} strokeWidth={2.2} />
        <Circle cx={11} cy={13} r={4.5} fill="#D4A574" stroke={INK} strokeWidth={2.2} />
        <Circle cx={29} cy={13} r={4.5} fill="#D4A574" stroke={INK} strokeWidth={2.2} />
        <Circle cx={11} cy={13} r={1.6} fill={INK} opacity={0.5} />
        <Circle cx={29} cy={13} r={1.6} fill={INK} opacity={0.5} />
        <Circle cx={16} cy={21} r={1.5} fill={INK} />
        <Circle cx={24} cy={21} r={1.5} fill={INK} />
        <Ellipse cx={20} cy={26} rx={2.5} ry={1.8} fill={INK} />
      </>
    )
    case 'car': return (
      <>
        <Path d="M3 22 L8 14 Q10 12 12 12 L28 12 Q30 12 32 14 L37 22 L37 28 L3 28 Z" fill="#9DC3E8" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        <Circle cx={12} cy={28} r={3.5} fill={INK} />
        <Circle cx={28} cy={28} r={3.5} fill={INK} />
        <Path d="M11 16 L17 16 L17 22 L8 22 Z" fill="#FFFEF8" opacity={0.7} stroke={INK} strokeWidth={1.5} />
        <Path d="M23 16 L29 16 L32 22 L23 22 Z" fill="#FFFEF8" opacity={0.7} stroke={INK} strokeWidth={1.5} />
      </>
    )
    case 'bag': return (
      <>
        <Path d="M13 9 Q13 3 20 3 Q27 3 27 9" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
        <Rect x={5} y={9} width={30} height={27} rx={3} fill="#EE7B6D" stroke={INK} strokeWidth={2.2} />
        <Circle cx={15} cy={20} r={1.5} fill={INK} />
        <Circle cx={25} cy={20} r={1.5} fill={INK} />
        <Path d="M15 26 Q20 30 25 26" fill="none" stroke={INK} strokeWidth={1.8} strokeLinecap="round" />
      </>
    )
    case 'book': return (
      <>
        <Path d="M4 9 L20 11 L36 9 L36 32 L20 34 L4 32 Z" fill="#F5D652" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        <Line x1={20} y1={11} x2={20} y2={34} stroke={INK} strokeWidth={2} />
        <Line x1={8} y1={17} x2={16} y2={17.5} stroke={INK} strokeWidth={1.3} opacity={0.5} />
        <Line x1={8} y1={22} x2={16} y2={22.5} stroke={INK} strokeWidth={1.3} opacity={0.5} />
        <Line x1={24} y1={17.5} x2={32} y2={17} stroke={INK} strokeWidth={1.3} opacity={0.5} />
        <Line x1={24} y1={22.5} x2={32} y2={22} stroke={INK} strokeWidth={1.3} opacity={0.5} />
      </>
    )
    case 'pencil': return (
      <>
        <Path d="M6 32 L26 12 L32 18 L12 38 Z" fill="#F5D652" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        <Path d="M6 32 L12 38 L4 36 Z" fill={INK} />
        <Path d="M24 14 L30 20" stroke={INK} strokeWidth={1.8} />
        <Path d="M28 10 L34 16" stroke="#F2B2C7" strokeWidth={4} strokeLinecap="round" />
        <Path d="M28 10 L34 16" stroke={INK} strokeWidth={2.2} strokeLinecap="round" fill="none" />
      </>
    )
    case 'clipboard': return (
      <>
        <Rect x={7} y={7} width={26} height={30} rx={2} fill="#C8B6E8" stroke={INK} strokeWidth={2.2} />
        <Rect x={13} y={3} width={14} height={8} rx={1.5} fill={INK} />
        <Path d="M11 17 L15 21 L19 15" fill="none" stroke="#BDD48C" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        <Line x1={21} y1={17} x2={29} y2={17} stroke={INK} strokeWidth={1.5} strokeLinecap="round" />
        <Path d="M11 27 L15 31 L19 25" fill="none" stroke="#BDD48C" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        <Line x1={21} y1={27} x2={29} y2={27} stroke={INK} strokeWidth={1.5} strokeLinecap="round" />
      </>
    )
    case 'phone': return (
      <>
        <Rect x={10} y={3} width={20} height={34} rx={4} fill="#BDD48C" stroke={INK} strokeWidth={2.2} />
        <Rect x={13} y={9} width={14} height={20} fill="#FFFEF8" opacity={0.4} />
        <Line x1={17} y1={33} x2={23} y2={33} stroke={INK} strokeWidth={2} strokeLinecap="round" />
        <Circle cx={20} cy={6} r={0.8} fill={INK} />
      </>
    )
    case 'bulb': return (
      <>
        <Path d="M20 4 Q10 6 10 16 Q10 22 16 26 L16 30 Q16 32 18 32 L22 32 Q24 32 24 30 L24 26 Q30 22 30 16 Q30 6 20 4 Z" fill="#F5D652" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        <Line x1={16} y1={34} x2={24} y2={34} stroke={INK} strokeWidth={2} strokeLinecap="round" />
        <Line x1={17} y1={37} x2={23} y2={37} stroke={INK} strokeWidth={2} strokeLinecap="round" />
        <Path d="M16 20 L20 14 L24 20" fill="none" stroke={INK} strokeWidth={1.5} opacity={0.4} />
      </>
    )
    case 'home': return (
      <>
        <Path d="M4 20 L20 6 L36 20 L36 34 Q36 36 34 36 L6 36 Q4 36 4 34 Z" fill="#F5B896" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        <Rect x={16} y={22} width={8} height={14} fill={INK} />
        <Rect x={24} y={14} width={4} height={6} fill={INK} />
      </>
    )
    case 'briefcase': return (
      <>
        <Rect x={13} y={6} width={14} height={6} rx={1.5} fill={INK} />
        <Rect x={3} y={12} width={34} height={22} rx={2.5} fill="#9DC3E8" stroke={INK} strokeWidth={2.2} />
        <Line x1={3} y1={22} x2={37} y2={22} stroke={INK} strokeWidth={1.8} />
        <Rect x={17} y={20} width={6} height={4} rx={1} fill={INK} />
      </>
    )
    case 'star': return (
      <Path d="M20 3 L24.5 15 L37 16 L27.5 24 L30 36.5 L20 30 L10 36.5 L12.5 24 L3 16 L15.5 15 Z" fill="#F5D652" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
    )
    case 'flower': return (
      <>
        <Circle cx={20} cy={11} r={5} fill="#F2B2C7" stroke={INK} strokeWidth={2} />
        <Circle cx={29} cy={20} r={5} fill="#F2B2C7" stroke={INK} strokeWidth={2} />
        <Circle cx={20} cy={29} r={5} fill="#F2B2C7" stroke={INK} strokeWidth={2} />
        <Circle cx={11} cy={20} r={5} fill="#F2B2C7" stroke={INK} strokeWidth={2} />
        <Circle cx={20} cy={20} r={4.5} fill="#F5D652" stroke={INK} strokeWidth={2} />
      </>
    )
    case 'hourglass': return (
      <>
        <Path d="M10 5 L30 5 L22 18 L30 31 L10 31 L18 18 Z" fill="#F5B896" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        <Line x1={7} y1={5} x2={33} y2={5} stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
        <Line x1={7} y1={31} x2={33} y2={31} stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
        <Line x1={19} y1={22} x2={21} y2={27} stroke="#D4A574" strokeWidth={2} strokeLinecap="round" />
      </>
    )
    case 'bath': return (
      <>
        <Path d="M4 20 L36 20 L34 30 Q34 32 32 32 L8 32 Q6 32 6 30 Z" fill="#9DC3E8" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        <Line x1={10} y1={20} x2={10} y2={10} stroke={INK} strokeWidth={2.2} />
        <Circle cx={10} cy={8} r={2.5} fill={INK} />
        <Path d="M14 15 Q15 12 17 13 M20 15 Q21 12 23 13 M26 15 Q27 12 29 13" stroke="#9DC3E8" strokeWidth={1.8} fill="none" strokeLinecap="round" />
      </>
    )
    case 'dumbbell': return (
      <>
        <Rect x={14} y={18} width={12} height={4} fill={INK} />
        <Rect x={5} y={11} width={6} height={18} rx={1.5} fill="#C8B6E8" stroke={INK} strokeWidth={2.2} />
        <Rect x={29} y={11} width={6} height={18} rx={1.5} fill="#C8B6E8" stroke={INK} strokeWidth={2.2} />
      </>
    )
    case 'checklist': return (
      <>
        <Rect x={5} y={5} width={30} height={30} rx={2.5} fill="#FFFEF8" stroke={INK} strokeWidth={2.2} />
        <Path d="M9 14 L12 17 L18 11" fill="none" stroke="#BDD48C" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        <Line x1={22} y1={14} x2={31} y2={14} stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
        <Path d="M9 24 L12 27 L18 21" fill="none" stroke="#BDD48C" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        <Line x1={22} y1={24} x2={31} y2={24} stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
      </>
    )
    case 'gift': return (
      <>
        <Rect x={5} y={14} width={30} height={22} rx={2} fill="#F2B2C7" stroke={INK} strokeWidth={2.2} />
        <Rect x={3} y={9} width={34} height={9} fill="#EE7B6D" stroke={INK} strokeWidth={2.2} />
        <Line x1={20} y1={9} x2={20} y2={36} stroke={INK} strokeWidth={2.2} />
        <Path d="M13 9 Q7 3 13 3 Q20 3 20 9 Q20 3 27 3 Q33 3 27 9" fill="none" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
      </>
    )
    case 'handshake': return (
      <>
        <Path d="M4 18 L14 14 L20 18 L14 22 L4 22 Z" fill="#F5B896" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        <Path d="M36 18 L26 14 L20 18 L26 22 L36 22 Z" fill="#F5B896" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        <Line x1={14} y1={18} x2={26} y2={18} stroke={INK} strokeWidth={2.2} />
        <Path d="M6 22 L10 27 M34 22 L30 27" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
      </>
    )
    case 'candle': return (
      <>
        <Rect x={13} y={16} width={14} height={20} rx={1.5} fill="#F9D8E2" stroke={INK} strokeWidth={2.2} />
        <Line x1={13} y1={22} x2={27} y2={22} stroke={INK} strokeWidth={1} opacity={0.4} />
        <Path d="M20 16 L20 10" stroke={INK} strokeWidth={2} strokeLinecap="round" />
        <Path d="M18 10 Q16 6 20 4 Q24 6 22 10 Q22 12 20 12 Q18 12 18 10 Z" fill="#F5D652" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      </>
    )
    case 'map': return (
      <>
        <Path d="M5 8 L15 12 L25 8 L35 12 L35 32 L25 28 L15 32 L5 28 Z" fill="#BDD48C" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        <Line x1={15} y1={12} x2={15} y2={32} stroke={INK} strokeWidth={1.8} opacity={0.5} />
        <Line x1={25} y1={8} x2={25} y2={28} stroke={INK} strokeWidth={1.8} opacity={0.5} />
        <Circle cx={20} cy={18} r={3} fill="#EE7B6D" stroke={INK} strokeWidth={1.8} />
        <Circle cx={20} cy={18} r={0.8} fill="#FFFEF8" />
      </>
    )
    case 'nosmoke': return (
      <>
        <Circle cx={20} cy={20} r={14} fill="none" stroke="#D94A3E" strokeWidth={3.5} />
        <Line x1={10} y1={30} x2={30} y2={10} stroke="#D94A3E" strokeWidth={3.5} strokeLinecap="round" />
        <Rect x={12} y={18} width={16} height={4} rx={1} fill="#2A2624" stroke={INK} strokeWidth={1.5} />
      </>
    )
    case 'tooth': return (
      <>
        <Path d="M10 10 Q10 4 16 4 Q20 6 24 4 Q30 4 30 10 Q30 22 26 30 Q24 34 22 32 Q20 26 20 22 Q20 26 18 32 Q16 34 14 30 Q10 22 10 10 Z" fill="#FFFEF8" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        <Path d="M15 11 Q17 10 19 11" stroke={INK} strokeWidth={1.2} fill="none" opacity={0.5} />
      </>
    )
    case 'shoe': return (
      <>
        <Path d="M4 22 L4 30 Q4 32 7 32 L33 32 Q38 32 36 28 L30 20 Q26 16 20 16 Q14 14 10 14 Q5 12 4 16 Z" fill="#F2B2C7" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        <Line x1={14} y1={18} x2={14} y2={24} stroke={INK} strokeWidth={1.3} opacity={0.4} />
        <Line x1={20} y1={18} x2={20} y2={26} stroke={INK} strokeWidth={1.3} opacity={0.4} />
      </>
    )
    case 'music': return (
      <>
        <Circle cx={10} cy={30} r={4.5} fill="#C8B6E8" stroke={INK} strokeWidth={2.2} />
        <Circle cx={30} cy={26} r={4.5} fill="#C8B6E8" stroke={INK} strokeWidth={2.2} />
        <Path d="M14.5 30 L14.5 8 L34.5 5 L34.5 26" fill="none" stroke={INK} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        <Line x1={14.5} y1={14} x2={34.5} y2={11} stroke={INK} strokeWidth={2} strokeLinecap="round" />
      </>
    )
    case 'steak': return (
      <>
        <Path d="M8 12 Q4 18 7 22 Q4 28 11 32 Q20 36 28 30 Q34 24 32 16 Q28 8 20 10 Q13 8 8 12 Z" fill="#D94A3E" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        <Path d="M12 18 Q20 16 26 22 Q24 26 16 25 Q12 22 12 18 Z" fill="#EE7B6D" opacity={0.7} />
        <Circle cx={14} cy={20} r={1.5} fill="#FFFEF8" opacity={0.5} />
      </>
    )
    case 'basket': return (
      <>
        <Path d="M7 13 L33 13 L30 33 Q30 35 28 35 L12 35 Q10 35 10 33 Z" fill="#D4A574" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        <Line x1={13} y1={13} x2={14} y2={35} stroke={INK} strokeWidth={1.5} opacity={0.5} />
        <Line x1={20} y1={13} x2={20} y2={35} stroke={INK} strokeWidth={1.5} opacity={0.5} />
        <Line x1={27} y1={13} x2={26} y2={35} stroke={INK} strokeWidth={1.5} opacity={0.5} />
        <Path d="M10 13 Q20 2 30 13" fill="none" stroke={INK} strokeWidth={2.2} />
      </>
    )
    case 'family': return (
      <>
        <Circle cx={11} cy={11} r={4.5} fill="#F5B896" stroke={INK} strokeWidth={2.2} />
        <Circle cx={29} cy={11} r={4.5} fill="#F5B896" stroke={INK} strokeWidth={2.2} />
        <Path d="M5 30 Q5 20 14 22 M26 22 Q35 20 35 30" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
        <Circle cx={20} cy={24} r={3.5} fill="#F2B2C7" stroke={INK} strokeWidth={2} />
        <Path d="M15 34 Q15 28 20 28 Q25 28 25 34" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" />
      </>
    )
    case 'microbe': return (
      <>
        <Ellipse cx={20} cy={20} rx={13} ry={11} fill="#BDD48C" stroke={INK} strokeWidth={2.2} />
        <Line x1={2} y1={15} x2={7} y2={17} stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
        <Line x1={2} y1={25} x2={7} y2={23} stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
        <Line x1={38} y1={15} x2={33} y2={17} stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
        <Line x1={38} y1={25} x2={33} y2={23} stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
        <Circle cx={16} cy={17} r={1.6} fill={INK} />
        <Circle cx={24} cy={20} r={1.6} fill={INK} />
        <Circle cx={18} cy={24} r={1.6} fill={INK} />
      </>
    )
    case 'baby': return (
      <>
        <Circle cx={20} cy={22} r={12} fill="#F9D8E2" stroke={INK} strokeWidth={2.2} />
        <Path d="M9 20 Q5 12 12 10 Q14 14 15 18" fill="#F9D8E2" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        <Path d="M31 20 Q35 12 28 10 Q26 14 25 18" fill="#F9D8E2" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        <Circle cx={16} cy={22} r={1.6} fill={INK} />
        <Circle cx={24} cy={22} r={1.6} fill={INK} />
        <Path d="M16 27 Q20 30 24 27" fill="none" stroke={INK} strokeWidth={1.8} strokeLinecap="round" />
        <Circle cx={13} cy={24} r={2} fill="#F29082" opacity={0.5} />
        <Circle cx={27} cy={24} r={2} fill="#F29082" opacity={0.5} />
      </>
    )
    case 'plate': return (
      <>
        <Circle cx={20} cy={20} r={15} fill="#FFFEF8" stroke={INK} strokeWidth={2.2} />
        <Circle cx={20} cy={20} r={11} fill="none" stroke={INK} strokeWidth={1.5} opacity={0.4} />
        <Circle cx={15} cy={18} r={2.5} fill="#BDD48C" stroke={INK} strokeWidth={1.5} />
        <Circle cx={23} cy={15} r={2.5} fill="#EE7B6D" stroke={INK} strokeWidth={1.5} />
        <Circle cx={24} cy={24} r={2.5} fill="#F5D652" stroke={INK} strokeWidth={1.5} />
      </>
    )
    case 'siren': return (
      <>
        <Rect x={5} y={26} width={30} height={6} rx={1} fill={INK} />
        <Ellipse cx={20} cy={22} rx={13} ry={10} fill="#EE7B6D" stroke={INK} strokeWidth={2.2} />
        <Circle cx={20} cy={20} r={4.5} fill="#FFFEF8" stroke={INK} strokeWidth={1.5} />
        <Path d="M20 3 L20 8 M6 8 L10 12 M34 8 L30 12" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
      </>
    )
    case 'couch': return (
      <>
        <Path d="M3 22 L3 30 L37 30 L37 22 Q37 17 32 17 L30 17 L30 12 Q30 8 25 8 L15 8 Q10 8 10 12 L10 17 L8 17 Q3 17 3 22 Z" fill="#C8B6E8" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        <Line x1={20} y1={8} x2={20} y2={30} stroke={INK} strokeWidth={1.5} opacity={0.3} />
      </>
    )
    case 'sparkle': return (
      <>
        <Path d="M20 2 L23 17 L37 20 L23 23 L20 38 L17 23 L3 20 L17 17 Z" fill="#F5D652" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        <Circle cx={33} cy={8} r={2} fill="#F2B2C7" stroke={INK} strokeWidth={1.5} />
        <Circle cx={8} cy={33} r={1.5} fill="#9DC3E8" stroke={INK} strokeWidth={1.2} />
      </>
    )
    case 'wine': return (
      <>
        <Path d="M12 6 L28 6 Q28 18 22 22 L22 30 L28 32 L12 32 L18 30 L18 22 Q12 18 12 6 Z" fill="#F9D8E2" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        <Line x1={6} y1={32} x2={34} y2={32} stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
        <Circle cx={20} cy={20} r={14} fill="none" stroke="#D94A3E" strokeWidth={2.8} />
        <Line x1={10} y1={30} x2={30} y2={10} stroke="#D94A3E" strokeWidth={2.8} strokeLinecap="round" />
      </>
    )
    default: return null
  }
}
