/**
 * RewardStickers — badge/sticker designs for every reward category in the app.
 *
 * Ported 1:1 from `docs/.../src/reward-stickers.jsx`. All components accept
 * `{ size, fill, stroke }` and render at any pixel size via viewBox.
 *
 * Categories:
 *   1. Streak       — Flame, StreakChip
 *   2. Weekly       — WeekWheel, WeekBar
 *   3. Quest        — QuestRibbon, PointsCoin
 *   4. Milestone    — DayBadge, DayLocked
 *   5. Mode         — ModeTrying, ModePregnant, ModeParent
 *   6. CareCircle   — CircleLinked, CircleDots
 *   7. Garage       — GiftBox, GarageTag
 *   8. Pre-preg     — CycleComplete, FertileHit
 *   9. Pregnancy    — Trimester, WeekMarker, FirstKick
 *  10. Kids firsts  — FirstTooth, FirstWord, FirstStep, SleepThrough
 *  11. System       — Premium, VaultSecured, TalkMaster, EmergencyReady
 *  12. Legendary    — Legendary (day-100 / anniversary treatment)
 *  13. Mood faces   — MoodFace (9 variants: happy/calm/fussy/cranky/energetic + great/good/okay/low)
 *  14. Preg logs    — LogSymptom/Vitamins/Water/Sleep/Exercise/Kicks/Weight/Appointment/ExamResult/Nutrition/Kegel/Nesting/BirthPrep/Contraction
 *  15. Cycle logs   — LogTemperature/Intimacy/PeriodStart/PeriodEnd
 */
import React from 'react'
import Svg, {
  Path,
  Polygon,
  Circle as SvgCircle,
  Line,
  Rect,
  Ellipse,
  G,
  Text as SvgText,
} from 'react-native-svg'

const INK = '#141313'
const PAPER = '#FFFEF8'

// Fonts loaded in app/_layout.tsx — use these exact names for SvgText.
const FONT_DISPLAY = 'Fraunces_600SemiBold'
const FONT_BODY = 'DMSans_500Medium'

interface BaseProps {
  size?: number
  fill?: string
  stroke?: string
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. STREAK
// ═══════════════════════════════════════════════════════════════════════════

export function Flame({ size = 80, fill = '#EE7B6D', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M50,6 C52,20 70,30 72,52 C74,78 56,92 50,92 C44,92 26,78 28,52 C30,36 40,36 38,22 C44,28 50,22 50,6 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path
        d="M50,42 C52,52 62,58 62,70 C62,82 54,86 50,86 C46,86 38,82 38,70 C38,60 46,58 48,50 C50,54 50,48 50,42 Z"
        fill="#F5D652"
        stroke={stroke}
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export function StreakChip({
  size = 80,
  days = 14,
  fill = '#EE7B6D',
  stroke = INK,
}: BaseProps & { days?: number }) {
  return (
    <Svg width={size * 1.6} height={size} viewBox="0 0 160 100">
      <Rect x={4} y={18} width={152} height={66} rx={33} fill={PAPER} stroke={stroke} strokeWidth={1.5} />
      <SvgCircle cx={36} cy={51} r={26} fill={fill} stroke={stroke} strokeWidth={1.5} />
      <Path
        d="M36,32 C37,40 47,46 48,60 C49,74 40,80 36,80 C32,80 23,74 24,60 C25,50 31,50 30,42 C34,46 36,42 36,32 Z"
        fill="#F5D652"
        stroke={stroke}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      <SvgText x={98} y={62} textAnchor="middle" fontFamily={FONT_DISPLAY} fontSize={30} fill={stroke}>
        {String(days)}
      </SvgText>
    </Svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. WEEKLY
// ═══════════════════════════════════════════════════════════════════════════

export function WeekWheel({
  size = 80,
  done = 5,
  today = 5,
  fill = '#BDD48C',
  stroke = INK,
}: BaseProps & { done?: number; today?: number }) {
  const cx = 50
  const cy = 50
  const r = 40
  const wedges = []
  for (let i = 0; i < 7; i++) {
    const a1 = (i / 7) * Math.PI * 2 - Math.PI / 2
    const a2 = ((i + 1) / 7) * Math.PI * 2 - Math.PI / 2
    const x1 = cx + Math.cos(a1) * r
    const y1 = cy + Math.sin(a1) * r
    const x2 = cx + Math.cos(a2) * r
    const y2 = cy + Math.sin(a2) * r
    const d = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 0 1 ${x2},${y2} Z`
    const f = i === today - 1 ? '#F5D652' : i < done ? fill : PAPER
    wedges.push(<Path key={i} d={d} fill={f} stroke={stroke} strokeWidth={1.4} />)
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {wedges}
      <SvgCircle cx={cx} cy={cy} r={10} fill={PAPER} stroke={stroke} strokeWidth={1.4} />
    </Svg>
  )
}

export function WeekBar({
  size = 80,
  done = 3,
  today = 4,
  stroke = INK,
}: {
  size?: number
  done?: number
  today?: number
  stroke?: string
}) {
  const tiles: React.ReactElement[] = []
  for (let i = 0; i < 7; i++) {
    const x = 4 + i * 20
    const isDone = i < done
    const isToday = i === today - 1
    const f = isDone ? '#BDD48C' : isToday ? INK : PAPER
    tiles.push(<Rect key={`r${i}`} x={x} y={30} width={16} height={40} rx={5} fill={f} stroke={stroke} strokeWidth={1.3} />)
    if (isDone) {
      tiles.push(
        <Path
          key={`c${i}`}
          d={`M${x + 4},50 l3,3 l6,-6`}
          fill="none"
          stroke={INK}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )
    }
    if (isToday) {
      tiles.push(<SvgCircle key={`t${i}`} cx={x + 8} cy={50} r={3} fill="#F5D652" />)
    }
  }
  return (
    <Svg width={size * 1.6} height={size} viewBox="0 0 148 100">
      {tiles}
    </Svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. QUEST
// ═══════════════════════════════════════════════════════════════════════════

export function QuestRibbon({ size = 80, fill = '#F5D652', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M16,18 L84,18 L84,72 L72,84 L60,72 L48,84 L36,72 L24,84 L16,72 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path
        d="M32,44 l10,10 l22,-22"
        fill="none"
        stroke={stroke}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export function PointsCoin({
  size = 80,
  points = 5,
  fill = '#F2B2C7',
  stroke = INK,
}: BaseProps & { points?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <SvgCircle cx={50} cy={50} r={34} fill="none" stroke={stroke} strokeWidth={1} strokeDasharray="2 3" />
      <SvgText x={50} y={62} textAnchor="middle" fontFamily={FONT_DISPLAY} fontSize={34} fill={stroke}>
        {`+${points}`}
      </SvgText>
    </Svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. MILESTONE
// ═══════════════════════════════════════════════════════════════════════════

export function DayBadge({
  size = 80,
  day = 7,
  fill = '#9DC3E8',
  stroke = INK,
}: BaseProps & { day?: number }) {
  const scallops = []
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2
    const x = 50 + Math.cos(a) * 44
    const y = 50 + Math.sin(a) * 44
    scallops.push(<SvgCircle key={i} cx={x} cy={y} r={5} fill={fill} stroke={stroke} strokeWidth={1.3} />)
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <G>{scallops}</G>
      <SvgCircle cx={50} cy={50} r={36} fill={PAPER} stroke={stroke} strokeWidth={1.5} />
      <SvgText x={50} y={46} textAnchor="middle" fontFamily={FONT_BODY} fontSize={9} letterSpacing={1.5} fill="#6E6763">
        DAY
      </SvgText>
      <SvgText x={50} y={70} textAnchor="middle" fontFamily={FONT_DISPLAY} fontSize={30} fill={stroke}>
        {String(day)}
      </SvgText>
    </Svg>
  )
}

export function DayLocked({ size = 80, stroke = INK }: { size?: number; stroke?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={40} fill="#EFE5CC" stroke={stroke} strokeWidth={1.4} strokeDasharray="3 3" />
      <Rect x={38} y={44} width={24} height={22} rx={4} fill={PAPER} stroke={stroke} strokeWidth={1.5} />
      <Path d="M42,44 v-6 a8,8 0 0 1 16,0 v6" fill="none" stroke={stroke} strokeWidth={1.5} />
      <SvgCircle cx={50} cy={55} r={2.5} fill={stroke} />
    </Svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. MODE (journey)
// ═══════════════════════════════════════════════════════════════════════════

export function ModeTrying({ size = 80, fill = '#F2B2C7', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <SvgCircle cx={50} cy={50} r={32} fill="none" stroke={stroke} strokeWidth={1.2} strokeDasharray="2 3" />
      <Path
        d="M50,28 C50,28 36,48 36,60 C36,70 42,78 50,78 C58,78 64,70 64,60 C64,48 50,28 50,28 Z"
        fill={PAPER}
        stroke={stroke}
        strokeWidth={1.5}
      />
      <Path d="M56,70 a4,4 0 0 1 -8,0 a4,4 0 0 1 8,0 Z" fill="#EE7B6D" />
    </Svg>
  )
}

export function ModePregnant({ size = 80, fill = '#C8B6E8', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <Path
        d="M40,22 C46,22 50,26 50,32 C50,36 48,38 46,40 L46,46 C56,46 66,54 66,66 C66,76 58,82 50,82 C42,82 34,78 34,66 C34,50 42,44 42,40 C40,38 38,36 38,32 C38,26 34,22 40,22 Z"
        fill={PAPER}
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <SvgCircle cx={50} cy={66} r={3} fill="#EE7B6D" />
    </Svg>
  )
}

export function ModeParent({ size = 80, fill = '#9DC3E8', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <SvgCircle cx={42} cy={38} r={8} fill={PAPER} stroke={stroke} strokeWidth={1.4} />
      <Path
        d="M30,80 C30,60 36,52 42,52 C48,52 54,60 54,80 Z"
        fill={PAPER}
        stroke={stroke}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <SvgCircle cx={62} cy={54} r={6} fill="#F5D652" stroke={stroke} strokeWidth={1.3} />
      <Path d="M54,66 C56,60 68,60 70,66 C70,70 66,72 62,72 C58,72 54,70 54,66 Z" fill="#F5D652" stroke={stroke} strokeWidth={1.3} />
    </Svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. CARE CIRCLE
// ═══════════════════════════════════════════════════════════════════════════

export function CircleLinked({ size = 80, fill = '#F2B2C7', stroke = INK }: BaseProps) {
  return (
    <Svg width={size * 1.2} height={size} viewBox="0 0 120 100">
      <Path
        d="M40,78 C18,62 10,48 10,32 C10,20 20,14 30,14 C36,14 40,17 42,22 C44,17 48,14 54,14 C64,14 74,20 74,32 C74,48 62,62 40,78 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.6}
      />
      <Path
        d="M80,86 C58,70 50,56 50,40 C50,28 60,22 70,22 C76,22 80,25 82,30 C84,25 88,22 94,22 C104,22 114,28 114,40 C114,56 102,70 80,86 Z"
        fill="#C8B6E8"
        stroke={stroke}
        strokeWidth={1.6}
      />
    </Svg>
  )
}

export function CircleDots({ size = 80, stroke = INK }: { size?: number; stroke?: string }) {
  const colors = ['#F2B2C7', '#F5D652', '#9DC3E8', '#BDD48C', '#C8B6E8']
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={40} fill="none" stroke={stroke} strokeWidth={1.4} strokeDasharray="2 4" />
      {[0, 72, 144, 216, 288].map((a, i) => {
        const rad = ((a - 90) * Math.PI) / 180
        const x = 50 + Math.cos(rad) * 32
        const y = 50 + Math.sin(rad) * 32
        return <SvgCircle key={i} cx={x} cy={y} r={8} fill={colors[i]} stroke={stroke} strokeWidth={1.3} />
      })}
      <SvgCircle cx={50} cy={50} r={10} fill={PAPER} stroke={stroke} strokeWidth={1.4} />
      <Path
        d="M46,50 l3,3 l6,-6"
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. GARAGE
// ═══════════════════════════════════════════════════════════════════════════

export function GiftBox({ size = 80, fill = '#BDD48C', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x={14} y={42} width={72} height={44} rx={4} fill={fill} stroke={stroke} strokeWidth={1.6} />
      <Rect x={10} y={30} width={80} height={16} rx={3} fill="#F5D652" stroke={stroke} strokeWidth={1.6} />
      <Rect x={44} y={30} width={12} height={56} fill="#EE7B6D" stroke={stroke} strokeWidth={1.4} />
      <Path
        d="M50,30 C42,18 30,16 28,22 C26,28 38,30 50,30 C62,30 74,28 72,22 C70,16 58,18 50,30 Z"
        fill="#EE7B6D"
        stroke={stroke}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export function GarageTag({ size = 80, fill = '#9DC3E8', stroke = INK }: BaseProps) {
  return (
    <Svg width={size * 1.2} height={size} viewBox="0 0 120 100">
      <Path
        d="M10,50 L50,10 L112,10 L112,90 L50,90 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <SvgCircle cx={66} cy={28} r={6} fill={PAPER} stroke={stroke} strokeWidth={1.4} />
      <SvgText x={88} y={58} textAnchor="middle" fontFamily={FONT_DISPLAY} fontStyle="italic" fontSize={22} fill={stroke}>
        pass
      </SvgText>
      <SvgText x={88} y={74} textAnchor="middle" fontFamily={FONT_DISPLAY} fontStyle="italic" fontSize={16} fill={stroke}>
        it on
      </SvgText>
    </Svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. PRE-PREGNANCY (Trying) specific
// ═══════════════════════════════════════════════════════════════════════════

export function CycleComplete({ size = 80, fill = '#F2B2C7', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill={PAPER} stroke={stroke} strokeWidth={1.8} />
      <SvgCircle
        cx={50}
        cy={50}
        r={42}
        fill="none"
        stroke={fill}
        strokeWidth={8}
        strokeDasharray="260 264"
        transform="rotate(-90 50 50)"
      />
      <Path
        d="M50,34 C50,34 38,48 38,58 C38,66 44,72 50,72 C56,72 62,66 62,58 C62,48 50,34 50,34 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
      />
    </Svg>
  )
}

export function FertileHit({ size = 80, fill = '#F5D652', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <SvgCircle cx={50} cy={50} r={28} fill={PAPER} stroke={stroke} strokeWidth={1.4} />
      <SvgCircle cx={50} cy={50} r={14} fill="#EE7B6D" stroke={stroke} strokeWidth={1.4} />
      <Line x1={50} y1={8} x2={50} y2={20} stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      <Line x1={50} y1={80} x2={50} y2={92} stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      <Line x1={8} y1={50} x2={20} y2={50} stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      <Line x1={80} y1={50} x2={92} y2={50} stroke={stroke} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 9. PREGNANCY specific
// ═══════════════════════════════════════════════════════════════════════════

export function Trimester({
  size = 80,
  n = 1,
  fill = '#C8B6E8',
  stroke = INK,
}: BaseProps & { n?: 1 | 2 | 3 }) {
  const dots = []
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const x = 50 + Math.cos(a) * 44
    const y = 50 + Math.sin(a) * 44
    dots.push(<SvgCircle key={i} cx={x} cy={y} r={6} fill={fill} stroke={stroke} strokeWidth={1.3} />)
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <G>{dots}</G>
      <SvgCircle cx={50} cy={50} r={34} fill={PAPER} stroke={stroke} strokeWidth={1.5} />
      <SvgText x={50} y={44} textAnchor="middle" fontFamily={FONT_BODY} fontSize={8} letterSpacing={1.5} fill="#6E6763">
        TRIMESTER
      </SvgText>
      <SvgText x={50} y={70} textAnchor="middle" fontFamily={FONT_DISPLAY} fontSize={28} fill={stroke}>
        {(['I', 'II', 'III'] as const)[n - 1] ?? String(n)}
      </SvgText>
    </Svg>
  )
}

export function WeekMarker({
  size = 80,
  week = 12,
  fill = '#F2B2C7',
  stroke = INK,
}: BaseProps & { week?: number }) {
  return (
    <Svg width={size * 0.92} height={size} viewBox="0 0 92 100">
      <Path
        d="M46,4 C72,4 86,30 86,58 C86,82 70,96 46,96 C22,96 6,82 6,58 C6,30 20,4 46,4 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.8}
      />
      <SvgText x={46} y={46} textAnchor="middle" fontFamily={FONT_BODY} fontSize={9} letterSpacing={1.5} fill="#3A3533">
        WEEK
      </SvgText>
      <SvgText x={46} y={78} textAnchor="middle" fontFamily={FONT_DISPLAY} fontSize={34} fill={stroke}>
        {String(week)}
      </SvgText>
    </Svg>
  )
}

export function FirstKick({ size = 80, fill = '#F5D652', stroke = INK }: BaseProps) {
  const pts: string[] = []
  for (let i = 0; i < 20; i++) {
    const r = i % 2 === 0 ? 46 : 36
    const a = (i / 20) * Math.PI * 2 - Math.PI / 2
    pts.push(`${50 + Math.cos(a) * r},${50 + Math.sin(a) * r}`)
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Polygon points={pts.join(' ')} fill={fill} stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" />
      <Path
        d="M36,68 C28,60 30,44 40,38 C50,32 58,42 56,58 C54,70 44,76 36,68 Z"
        fill="#F2B2C7"
        stroke={stroke}
        strokeWidth={1.4}
      />
      <SvgCircle cx={56} cy={32} r={4} fill="#F2B2C7" stroke={stroke} strokeWidth={1.2} />
      <SvgCircle cx={64} cy={30} r={3.5} fill="#F2B2C7" stroke={stroke} strokeWidth={1.2} />
      <SvgCircle cx={70} cy={34} r={3} fill="#F2B2C7" stroke={stroke} strokeWidth={1.2} />
      <SvgCircle cx={74} cy={42} r={2.5} fill="#F2B2C7" stroke={stroke} strokeWidth={1.2} />
    </Svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 10. KIDS firsts
// ═══════════════════════════════════════════════════════════════════════════

export function FirstTooth({ size = 80, fill = PAPER, stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill="#9DC3E8" stroke={stroke} strokeWidth={1.8} />
      <Path
        d="M32,34 C32,26 42,22 50,22 C58,22 68,26 68,34 C68,46 64,50 62,60 C60,70 58,78 54,78 C50,78 50,66 48,66 C46,66 46,80 42,80 C38,80 36,70 34,60 C32,50 32,46 32,34 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path d="M40,38 C44,36 48,36 52,38" fill="none" stroke={stroke} strokeWidth={1.2} strokeLinecap="round" />
    </Svg>
  )
}

export function FirstWord({ size = 80, fill = '#F2B2C7', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M14,20 L78,20 A10,10 0 0 1 88,30 L88,60 A10,10 0 0 1 78,70 L40,70 L28,82 L30,70 L24,70 A10,10 0 0 1 14,60 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path
        d="M50,58 C38,50 32,42 32,34 C32,28 36,24 42,24 C46,24 49,26 51,30 C53,26 56,24 60,24 C66,24 70,28 70,34 C70,42 64,50 50,58 Z"
        fill="#EE7B6D"
        stroke={stroke}
        strokeWidth={1.4}
      />
    </Svg>
  )
}

export function FirstStep({ size = 80, fill = '#BDD48C', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <Path d="M28,62 C24,58 24,50 30,48 C36,46 40,52 38,58 C37,62 32,65 28,62 Z" fill={PAPER} stroke={stroke} strokeWidth={1.3} />
      <SvgCircle cx={34} cy={42} r={2.2} fill={PAPER} stroke={stroke} strokeWidth={1} />
      <SvgCircle cx={39} cy={38} r={2} fill={PAPER} stroke={stroke} strokeWidth={1} />
      <Path d="M58,52 C54,48 54,40 60,38 C66,36 70,42 68,48 C67,52 62,55 58,52 Z" fill={PAPER} stroke={stroke} strokeWidth={1.3} />
      <SvgCircle cx={64} cy={32} r={2.2} fill={PAPER} stroke={stroke} strokeWidth={1} />
      <SvgCircle cx={69} cy={28} r={2} fill={PAPER} stroke={stroke} strokeWidth={1} />
      <Path d="M44,82 C40,78 40,70 46,68 C52,66 56,72 54,78 C53,82 48,85 44,82 Z" fill={PAPER} stroke={stroke} strokeWidth={1.3} />
    </Svg>
  )
}

export function SleepThrough({ size = 80, fill = '#C8B6E8', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill={PAPER} stroke={stroke} strokeWidth={1.8} />
      <Path
        d="M62,24 C44,24 30,38 30,54 C30,72 44,84 60,84 C68,84 76,80 80,74 C68,74 56,64 54,50 C52,36 58,30 64,24 C63,24 63,24 62,24 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.6}
      />
      <SvgText x={72} y={36} fontFamily={FONT_DISPLAY} fontSize={18} fill={stroke}>
        z
      </SvgText>
      <SvgText x={80} y={26} fontFamily={FONT_DISPLAY} fontSize={14} fill={stroke}>
        z
      </SvgText>
    </Svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 11. SYSTEM / cross-mode unlocks
// ═══════════════════════════════════════════════════════════════════════════

export function Premium({ size = 80, fill = '#F5D652', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <Path
        d="M22,56 L30,36 L42,48 L50,30 L58,48 L70,36 L78,56 L78,68 L22,68 Z"
        fill={PAPER}
        stroke={stroke}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <SvgCircle cx={30} cy={36} r={3} fill="#EE7B6D" stroke={stroke} strokeWidth={1} />
      <SvgCircle cx={50} cy={30} r={3.5} fill="#EE7B6D" stroke={stroke} strokeWidth={1} />
      <SvgCircle cx={70} cy={36} r={3} fill="#EE7B6D" stroke={stroke} strokeWidth={1} />
    </Svg>
  )
}

export function VaultSecured({ size = 80, fill = '#9DC3E8', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M50,8 C62,14 78,14 88,12 C88,40 82,72 50,92 C18,72 12,40 12,12 C22,14 38,14 50,8 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <SvgCircle cx={50} cy={42} r={10} fill={PAPER} stroke={stroke} strokeWidth={1.6} />
      <SvgCircle cx={50} cy={42} r={3.5} fill={stroke} />
      <Rect x={47} y={46} width={6} height={18} fill={PAPER} stroke={stroke} strokeWidth={1.4} />
      <Rect x={47} y={56} width={10} height={3} fill={stroke} />
    </Svg>
  )
}

export function TalkMaster({ size = 80, fill = '#EE7B6D', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M14,26 L78,26 A10,10 0 0 1 88,36 L88,64 A10,10 0 0 1 78,74 L42,74 L28,86 L32,74 L24,74 A10,10 0 0 1 14,64 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path
        d="M40,52 C34,46 34,38 40,38 C44,38 42,42 42,44 C42,42 40,38 44,38 C50,38 50,46 44,52 C42,54 42,54 40,52 Z"
        fill="#F5D652"
        stroke={stroke}
        strokeWidth={1.2}
      />
      <Path
        d="M60,52 C54,46 54,38 60,38 C64,38 62,42 62,44 C62,42 60,38 64,38 C70,38 70,46 64,52 C62,54 62,54 60,52 Z"
        fill="#F5D652"
        stroke={stroke}
        strokeWidth={1.2}
      />
    </Svg>
  )
}

export function EmergencyReady({ size = 80, fill = '#EE7B6D', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M50,8 C62,14 78,14 88,12 C88,40 82,72 50,92 C18,72 12,40 12,12 C22,14 38,14 50,8 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path
        d="M42,30 h16 v12 h12 v16 h-12 v12 h-16 v-12 h-12 v-16 h12 z"
        fill={PAPER}
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 12. LEGENDARY tier (day-100 / anniversary)
// ═══════════════════════════════════════════════════════════════════════════

export function Legendary({
  size = 100,
  fill = '#F5D652',
  accent = '#EE7B6D',
  stroke = INK,
  day = 100,
}: {
  size?: number
  fill?: string
  accent?: string
  stroke?: string
  day?: number
}) {
  const pts: string[] = []
  for (let i = 0; i < 32; i++) {
    const r = i % 2 === 0 ? 48 : 36
    const a = (i / 32) * Math.PI * 2 - Math.PI / 2
    pts.push(`${50 + Math.cos(a) * r},${50 + Math.sin(a) * r}`)
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Polygon points={pts.join(' ')} fill={fill} stroke={stroke} strokeWidth={1.6} strokeLinejoin="round" />
      <SvgCircle cx={50} cy={50} r={28} fill={PAPER} stroke={stroke} strokeWidth={1.6} />
      <SvgCircle cx={50} cy={50} r={22} fill="none" stroke={accent} strokeWidth={1.2} strokeDasharray="2 3" />
      <SvgText x={50} y={44} textAnchor="middle" fontFamily={FONT_BODY} fontSize={7} letterSpacing={1.5} fill="#6E6763">
        DAY
      </SvgText>
      <SvgText x={50} y={66} textAnchor="middle" fontFamily={FONT_DISPLAY} fontSize={22} fill={stroke}>
        {String(day)}
      </SvgText>
    </Svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 13. MOOD faces — 9 variants (kids + pre mood pickers)
// ═══════════════════════════════════════════════════════════════════════════

export type MoodVariant =
  | 'happy'
  | 'calm'
  | 'fussy'
  | 'cranky'
  | 'energetic'
  | 'great'
  | 'good'
  | 'okay'
  | 'low'

export function MoodFace({
  size = 60,
  variant = 'happy',
  fill = '#FBEA9E',
  stroke = INK,
}: {
  size?: number
  variant?: MoodVariant
  fill?: string
  stroke?: string
}) {
  const eyes: Record<MoodVariant, React.ReactElement> = {
    happy: (
      <G>
        <Path d="M34,42 Q38,36 42,42" fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
        <Path d="M58,42 Q62,36 66,42" fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      </G>
    ),
    calm: (
      <G>
        <SvgCircle cx={38} cy={42} r={2} fill={stroke} />
        <SvgCircle cx={62} cy={42} r={2} fill={stroke} />
      </G>
    ),
    fussy: (
      <G>
        <Path d="M34,42 L42,42" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
        <Path d="M58,42 L66,42" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      </G>
    ),
    cranky: (
      <G>
        <Path d="M34,40 L42,44" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
        <Path d="M58,44 L66,40" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      </G>
    ),
    energetic: (
      <G>
        <SvgCircle cx={38} cy={40} r={3} fill={stroke} />
        <SvgCircle cx={62} cy={40} r={3} fill={stroke} />
        <Path d="M20,22 L24,28 M80,22 L76,28 M16,34 L22,36 M84,34 L78,36" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      </G>
    ),
    great: (
      <G>
        <Path d="M32,42 Q38,34 44,42" fill="none" stroke={stroke} strokeWidth={2.2} strokeLinecap="round" />
        <Path d="M56,42 Q62,34 68,42" fill="none" stroke={stroke} strokeWidth={2.2} strokeLinecap="round" />
      </G>
    ),
    good: (
      <G>
        <SvgCircle cx={38} cy={42} r={2.5} fill={stroke} />
        <SvgCircle cx={62} cy={42} r={2.5} fill={stroke} />
      </G>
    ),
    okay: (
      <G>
        <SvgCircle cx={38} cy={42} r={2} fill={stroke} />
        <SvgCircle cx={62} cy={42} r={2} fill={stroke} />
      </G>
    ),
    low: (
      <G>
        <SvgCircle cx={38} cy={44} r={2} fill={stroke} />
        <SvgCircle cx={62} cy={44} r={2} fill={stroke} />
      </G>
    ),
  }
  const mouths: Record<MoodVariant, React.ReactElement> = {
    happy: <Path d="M36,62 Q50,74 64,62" fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" />,
    calm: <Path d="M40,64 Q50,68 60,64" fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" />,
    fussy: <Path d="M40,66 L60,66" stroke={stroke} strokeWidth={2} strokeLinecap="round" />,
    cranky: <Path d="M38,68 Q50,58 62,68" fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" />,
    energetic: <Path d="M38,60 Q50,72 62,60 Q50,70 38,60 Z" fill={stroke} />,
    great: <Path d="M34,58 Q50,76 66,58" fill="none" stroke={stroke} strokeWidth={2.2} strokeLinecap="round" />,
    good: <Path d="M38,62 Q50,70 62,62" fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" />,
    okay: <Path d="M40,64 L60,64" stroke={stroke} strokeWidth={2} strokeLinecap="round" />,
    low: <Path d="M38,68 Q50,60 62,68" fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" />,
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill={fill} stroke={stroke} strokeWidth={1.8} />
      {eyes[variant]}
      {mouths[variant]}
    </Svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 14. PREGNANCY LOG tiles
// ═══════════════════════════════════════════════════════════════════════════

export function LogSymptom({ size = 60, fill = '#F5D652', stroke = INK }: BaseProps) {
  const pts: string[] = []
  for (let i = 0; i < 16; i++) {
    const r = i % 2 === 0 ? 38 : 26
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2
    pts.push(`${50 + Math.cos(a) * r},${50 + Math.sin(a) * r}`)
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Polygon points={pts.join(' ')} fill={fill} stroke={stroke} strokeWidth={1.6} strokeLinejoin="round" />
    </Svg>
  )
}

export function LogVitamins({ size = 60, fill = '#BDD48C', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M18,82 C6,50 40,16 72,30 C84,62 50,94 18,82 Z" fill={fill} stroke={stroke} strokeWidth={1.6} />
      <Path d="M28,74 Q50,48 72,30" stroke={stroke} strokeWidth={1.4} fill="none" />
    </Svg>
  )
}

export function LogWater({ size = 60, fill = '#9DC3E8', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M50,12 C50,12 22,46 22,66 C22,82 36,94 50,94 C64,94 78,82 78,66 C78,46 50,12 50,12 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.8}
      />
      <Path d="M38,58 Q44,72 58,72" stroke={PAPER} strokeWidth={2.5} fill="none" strokeLinecap="round" />
    </Svg>
  )
}

export function LogSleep({ size = 60, fill = '#C8B6E8', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M68,14 C46,14 30,32 30,54 C30,74 46,88 66,88 C74,88 82,84 86,78 C74,78 62,68 58,54 C54,36 60,22 68,14 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.8}
      />
    </Svg>
  )
}

export function LogExercise({ size = 60, fill = '#BDD48C', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M50,10 L60,38 L90,42 L66,60 L74,92 L50,72 L26,92 L34,60 L10,42 L40,38 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export function LogKicks({ size = 60, fill = '#F2B2C7', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M50,88 C20,68 8,50 8,32 C8,18 20,10 32,10 C40,10 46,14 50,22 C54,14 60,10 68,10 C80,10 92,18 92,32 C92,50 80,68 50,88 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.8}
      />
    </Svg>
  )
}

export function LogWeight({ size = 60, fill = '#F5B896', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x={14} y={36} width={72} height={40} rx={10} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <Path d="M50,36 L50,48" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      <Path d="M30,58 Q50,50 70,58" stroke={stroke} strokeWidth={1.4} fill="none" />
    </Svg>
  )
}

export function LogAppointment({ size = 60, fill = '#F5D652', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M38,10 h24 a6,6 0 0 1 6,6 v22 h22 a6,6 0 0 1 6,6 v12 a6,6 0 0 1 -6,6 h-22 v22 a6,6 0 0 1 -6,6 h-24 a6,6 0 0 1 -6,-6 v-22 h-22 a6,6 0 0 1 -6,-6 v-12 a6,6 0 0 1 6,-6 h22 v-22 a6,6 0 0 1 6,-6 z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export function LogExamResult({ size = 60, fill = '#C8B6E8', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x={20} y={14} width={60} height={76} rx={8} fill={PAPER} stroke={stroke} strokeWidth={1.8} />
      <G transform="translate(-2,4) scale(0.65)">
        <Path
          d="M42,28 h20 a6,6 0 0 1 6,6 v14 h14 a6,6 0 0 1 6,6 v8 a6,6 0 0 1 -6,6 h-14 v14 a6,6 0 0 1 -6,6 h-20 a6,6 0 0 1 -6,-6 v-14 h-14 a6,6 0 0 1 -6,-6 v-8 a6,6 0 0 1 6,-6 h14 v-14 a6,6 0 0 1 6,-6 z"
          fill={fill}
          stroke={stroke}
          strokeWidth={2}
        />
      </G>
      <Line x1={30} y1={78} x2={70} y2={78} stroke={stroke} strokeWidth={1.4} strokeLinecap="round" />
    </Svg>
  )
}

export function LogNutrition({ size = 60, fill = '#BDD48C', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M12,88 C12,50 42,12 88,12 C88,58 58,88 12,88 Z" fill={fill} stroke={stroke} strokeWidth={1.8} />
      <Path d="M20,82 Q50,54 84,18" stroke={stroke} strokeWidth={1.5} fill="none" />
    </Svg>
  )
}

export function LogKegel({ size = 60, fill = '#C8B6E8', stroke = INK }: BaseProps) {
  const pts: string[] = []
  for (let i = 0; i < 12; i++) {
    const r = i % 2 === 0 ? 40 : 28
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2
    pts.push(`${50 + Math.cos(a) * r},${50 + Math.sin(a) * r}`)
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Polygon points={pts.join(' ')} fill={fill} stroke={stroke} strokeWidth={1.6} strokeLinejoin="round" />
    </Svg>
  )
}

export function LogNesting({ size = 60, fill = '#F5B896', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Ellipse cx={50} cy={60} rx={40} ry={26} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <Ellipse cx={50} cy={54} rx={16} ry={11} fill={PAPER} stroke={stroke} strokeWidth={1.5} />
      <Path d="M20,60 Q30,54 40,60 M60,60 Q70,54 80,60" stroke={stroke} strokeWidth={1.3} fill="none" />
    </Svg>
  )
}

export function LogBirthPrep({ size = 60, fill = '#C8B6E8', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M50,8 L61,38 L94,40 L68,60 L78,92 L50,72 L22,92 L32,60 L6,40 L39,38 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export function LogContraction({ size = 60, fill = '#EE7B6D', stroke = INK }: BaseProps) {
  const pts: string[] = []
  for (let i = 0; i < 24; i++) {
    const r = i % 2 === 0 ? 42 : 22
    const a = (i / 24) * Math.PI * 2 - Math.PI / 2
    pts.push(`${50 + Math.cos(a) * r},${50 + Math.sin(a) * r}`)
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Polygon points={pts.join(' ')} fill={fill} stroke={stroke} strokeWidth={1.6} strokeLinejoin="round" />
    </Svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 15. PRE-PREGNANCY / CYCLE LOG tiles
// ═══════════════════════════════════════════════════════════════════════════

export function LogTemperature({ size = 60, fill = '#9DC3E8', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M50,12 C50,12 22,46 22,66 C22,82 36,94 50,94 C64,94 78,82 78,66 C78,46 50,12 50,12 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.8}
      />
    </Svg>
  )
}

export function LogIntimacy({ size = 60, fill = '#F2B2C7', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M50,88 C20,68 8,50 8,32 C8,18 20,10 32,10 C40,10 46,14 50,22 C54,14 60,10 68,10 C80,10 92,18 92,32 C92,50 80,68 50,88 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.8}
      />
    </Svg>
  )
}

export function LogPeriodStart({ size = 60, fill = '#EE7B6D', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M50,12 C50,12 22,46 22,66 C22,82 36,94 50,94 C64,94 78,82 78,66 C78,46 50,12 50,12 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.8}
      />
    </Svg>
  )
}

export function LogPeriodEnd({ size = 60, stroke = '#EE7B6D' }: { size?: number; stroke?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M50,12 C50,12 22,46 22,66 C22,82 36,94 50,94 C64,94 78,82 78,66 C78,46 50,12 50,12 Z"
        fill="none"
        stroke={stroke}
        strokeWidth={1.8}
        strokeDasharray="3 3"
      />
    </Svg>
  )
}

export function LogOvulation({ size = 60, fill = '#F5D652', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <SvgCircle cx={50} cy={50} r={28} fill={PAPER} stroke={stroke} strokeWidth={1.4} />
      <SvgCircle cx={50} cy={50} r={12} fill="#EE7B6D" stroke={stroke} strokeWidth={1.3} />
    </Svg>
  )
}

export function LogCervicalFluid({ size = 60, fill = '#CFE0F0', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Ellipse cx={50} cy={58} rx={32} ry={22} fill={fill} stroke={stroke} strokeWidth={1.7} />
      <Ellipse cx={42} cy={52} rx={6} ry={4} fill={PAPER} stroke={stroke} strokeWidth={1.2} />
    </Svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 16. KIDS LOG TILES
// ═══════════════════════════════════════════════════════════════════════════

export function LogDiaper({ size = 60, fill = '#F5B896', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M14,36 L86,36 L78,72 C72,82 62,86 50,86 C38,86 28,82 22,72 Z" fill={fill} stroke={stroke} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M28,36 Q50,48 72,36" stroke={stroke} strokeWidth={1.4} fill="none" />
      <SvgCircle cx={34} cy={54} r={3} fill={PAPER} stroke={stroke} strokeWidth={1.2} />
      <SvgCircle cx={66} cy={54} r={3} fill={PAPER} stroke={stroke} strokeWidth={1.2} />
    </Svg>
  )
}

export function LogFeeding({ size = 60, fill = '#F9D6C0', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x={32} y={10} width={36} height={12} rx={4} fill="#EE7B6D" stroke={stroke} strokeWidth={1.5} />
      <Path d="M34,22 L36,30 L40,30 L40,82 C40,88 44,92 50,92 C56,92 60,88 60,82 L60,30 L64,30 L66,22 Z" fill={fill} stroke={stroke} strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M40,58 L60,58" stroke={stroke} strokeWidth={1.3} />
      <Path d="M40,46 L60,46" stroke={stroke} strokeWidth={1.3} />
    </Svg>
  )
}

export function LogFood({ size = 60, fill = '#BDD48C', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Ellipse cx={50} cy={62} rx={38} ry={18} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <Ellipse cx={50} cy={58} rx={30} ry={12} fill={PAPER} stroke={stroke} strokeWidth={1.4} />
      <Path d="M50,58 L64,24" stroke={stroke} strokeWidth={3} strokeLinecap="round" />
      <Ellipse cx={68} cy={20} rx={6} ry={8} fill="#F5D652" stroke={stroke} strokeWidth={1.4} />
    </Svg>
  )
}

export function LogMedicine({ size = 60, fill = '#C8B6E8', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x={18} y={30} width={64} height={40} rx={20} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <Rect x={48} y={30} width={4} height={40} fill={stroke} />
      <Rect x={18} y={30} width={32} height={40} rx={20} fill="#F5B896" stroke={stroke} strokeWidth={1.8} />
    </Svg>
  )
}

export function LogGrowth({ size = 60, fill = '#9DC3E8', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x={20} y={12} width={18} height={76} rx={3} fill={fill} stroke={stroke} strokeWidth={1.6} />
      {[22, 34, 46, 58, 70].map((y, i) => (
        <Line key={i} x1={20} y1={y} x2={i % 2 === 0 ? 34 : 30} y2={y} stroke={stroke} strokeWidth={1.3} />
      ))}
      <SvgCircle cx={64} cy={34} r={10} fill="#F5D652" stroke={stroke} strokeWidth={1.5} />
      <Path d="M54,56 C54,46 58,42 64,42 C70,42 74,46 74,56 L74,82 L54,82 Z" fill="#F5D652" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
  )
}

export function LogMilestone({ size = 60, fill = '#F5D652', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M50,8 L60,36 L90,40 L68,60 L76,90 L50,74 L24,90 L32,60 L10,40 L40,36 Z" fill={fill} stroke={stroke} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  )
}

export function LogNote({ size = 60, fill = '#FBEA9E', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M22,12 L68,12 L82,26 L82,88 L22,88 Z" fill={fill} stroke={stroke} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M68,12 L68,26 L82,26" fill="none" stroke={stroke} strokeWidth={1.6} />
      <Path d="M32,46 L72,46 M32,58 L72,58 M32,70 L58,70" stroke={stroke} strokeWidth={1.4} strokeLinecap="round" />
    </Svg>
  )
}

export function LogVaccine({ size = 60, fill = '#9DC3E8', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M20,72 L28,80 L36,72 L28,64 Z" fill={PAPER} stroke={stroke} strokeWidth={1.5} />
      <Rect x={32} y={42} width={36} height={16} rx={3} transform="rotate(45 50 50)" fill={fill} stroke={stroke} strokeWidth={1.8} />
      <Rect x={62} y={22} width={16} height={10} rx={2} transform="rotate(45 70 28)" fill="#F5D652" stroke={stroke} strokeWidth={1.5} />
      <Line x1={34} y1={60} x2={38} y2={56} stroke={stroke} strokeWidth={1.5} />
      <Line x1={40} y1={54} x2={44} y2={50} stroke={stroke} strokeWidth={1.5} />
    </Svg>
  )
}

export function LogFever({ size = 60, fill = '#EE7B6D', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x={42} y={12} width={16} height={54} rx={8} fill={PAPER} stroke={stroke} strokeWidth={1.7} />
      <SvgCircle cx={50} cy={76} r={14} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <Rect x={46} y={22} width={8} height={46} rx={4} fill={fill} />
      <Line x1={60} y1={22} x2={64} y2={22} stroke={stroke} strokeWidth={1.3} />
      <Line x1={60} y1={32} x2={64} y2={32} stroke={stroke} strokeWidth={1.3} />
      <Line x1={60} y1={42} x2={64} y2={42} stroke={stroke} strokeWidth={1.3} />
      <Line x1={60} y1={52} x2={64} y2={52} stroke={stroke} strokeWidth={1.3} />
    </Svg>
  )
}

export function LogBath({ size = 60, fill = '#CFE0F0', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M14,48 L86,48 L82,72 C80,80 74,84 68,84 L32,84 C26,84 20,80 18,72 Z" fill={fill} stroke={stroke} strokeWidth={1.8} strokeLinejoin="round" />
      <SvgCircle cx={40} cy={30} r={5} fill={PAPER} stroke={stroke} strokeWidth={1.3} />
      <SvgCircle cx={54} cy={26} r={4} fill={PAPER} stroke={stroke} strokeWidth={1.3} />
      <SvgCircle cx={62} cy={36} r={3} fill={PAPER} stroke={stroke} strokeWidth={1.3} />
    </Svg>
  )
}

export function LogNap({ size = 60, fill = '#C8B6E8', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M14,60 L86,60 C86,76 74,88 50,88 C26,88 14,76 14,60 Z" fill={fill} stroke={stroke} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M14,60 L86,60" stroke={stroke} strokeWidth={1.8} />
      <SvgText x={66} y={42} fontFamily={FONT_DISPLAY} fontSize={18} fill={stroke}>z</SvgText>
      <SvgText x={76} y={32} fontFamily={FONT_DISPLAY} fontSize={13} fill={stroke}>z</SvgText>
    </Svg>
  )
}

export function LogPotty({ size = 60, fill = '#F5D652', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Ellipse cx={50} cy={44} rx={30} ry={10} fill={PAPER} stroke={stroke} strokeWidth={1.7} />
      <Path d="M20,44 L26,82 C26,86 30,88 34,88 L66,88 C70,88 74,86 74,82 L80,44 Z" fill={fill} stroke={stroke} strokeWidth={1.7} strokeLinejoin="round" />
    </Svg>
  )
}

export function LogTooth({ size = 60, fill = PAPER, stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M32,24 C32,16 42,12 50,12 C58,12 68,16 68,24 C68,36 64,42 62,52 C60,64 58,78 54,78 C50,78 50,64 48,64 C46,64 46,80 42,80 C38,80 36,64 34,52 C32,42 32,36 32,24 Z" fill={fill} stroke={stroke} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  )
}

export function LogMood({ size = 60, fill = '#FBEA9E', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={38} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <SvgCircle cx={40} cy={44} r={3} fill={stroke} />
      <SvgCircle cx={60} cy={44} r={3} fill={stroke} />
      <Path d="M38,62 Q50,72 62,62" fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 17. PREGNANCY EXTRA LOG TILES
// ═══════════════════════════════════════════════════════════════════════════

export function LogHeartbeat({ size = 60, fill = '#F2B2C7', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M50,88 C20,68 8,50 8,32 C8,18 20,10 32,10 C40,10 46,14 50,22 C54,14 60,10 68,10 C80,10 92,18 92,32 C92,50 80,68 50,88 Z" fill={fill} stroke={stroke} strokeWidth={1.8} />
      <Path d="M18,48 L30,48 L36,36 L42,60 L48,42 L54,54 L62,48 L82,48" fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

export function LogUltrasound({ size = 60, fill = '#9DC3E8', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <Path d="M50,24 C60,24 66,34 66,44 C66,52 62,58 58,62 C66,62 70,68 70,74 L30,74 C30,68 34,62 42,62 C38,58 34,52 34,44 C34,34 40,24 50,24 Z" fill={PAPER} stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 18. KIDS FIRSTS (EXTENDED)
// ═══════════════════════════════════════════════════════════════════════════

export function FirstRoll({ size = 80, fill = '#BDD48C', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <Path d="M24,58 C24,42 38,32 54,36 C70,40 78,54 72,68 C66,80 48,82 36,74 C28,68 24,64 24,58 Z" fill={PAPER} stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" />
      <SvgCircle cx={44} cy={52} r={2.2} fill={stroke} />
      <Path d="M40,60 Q46,64 52,60" fill="none" stroke={stroke} strokeWidth={1.3} strokeLinecap="round" />
    </Svg>
  )
}

export function FirstCrawl({ size = 80, fill = '#F5B896', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <SvgCircle cx={34} cy={44} r={10} fill={PAPER} stroke={stroke} strokeWidth={1.5} />
      <Path d="M44,50 L72,50 L74,66 L56,66 L58,74 L66,74" fill={PAPER} stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" />
      <SvgCircle cx={30} cy={42} r={1.5} fill={stroke} />
    </Svg>
  )
}

export function FirstSmile({ size = 80, fill = '#F5D652', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <Path d="M34,42 Q38,36 42,42" fill="none" stroke={stroke} strokeWidth={2.2} strokeLinecap="round" />
      <Path d="M58,42 Q62,36 66,42" fill="none" stroke={stroke} strokeWidth={2.2} strokeLinecap="round" />
      <Path d="M32,60 Q50,78 68,60" fill={PAPER} stroke={stroke} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M42,64 L58,64" stroke={stroke} strokeWidth={1.3} />
    </Svg>
  )
}

export function FirstSolidFood({ size = 80, fill = '#BDD48C', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <Ellipse cx={50} cy={60} rx={26} ry={10} fill={PAPER} stroke={stroke} strokeWidth={1.5} />
      <Ellipse cx={44} cy={58} rx={4} ry={3} fill="#F5B896" stroke={stroke} strokeWidth={1.1} />
      <Ellipse cx={54} cy={58} rx={4} ry={3} fill="#EE7B6D" stroke={stroke} strokeWidth={1.1} />
      <Path d="M50,56 L66,28" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      <Ellipse cx={68} cy={26} rx={4} ry={6} fill="#F5D652" stroke={stroke} strokeWidth={1.3} />
    </Svg>
  )
}

export function FirstHaircut({ size = 80, fill = '#F2B2C7', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <SvgCircle cx={36} cy={60} r={8} fill={PAPER} stroke={stroke} strokeWidth={1.4} />
      <SvgCircle cx={52} cy={60} r={8} fill={PAPER} stroke={stroke} strokeWidth={1.4} />
      <Path d="M42,60 L74,32" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M58,60 L74,36" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  )
}

export function FirstPotty({ size = 80, fill = '#F5D652', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <Ellipse cx={50} cy={42} rx={22} ry={7} fill={PAPER} stroke={stroke} strokeWidth={1.5} />
      <Path d="M28,42 L32,72 C32,76 36,78 40,78 L60,78 C64,78 68,76 68,72 L72,42 Z" fill={PAPER} stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="M44,58 L48,62 L58,52" fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 19. HEALTH / VACCINE / CHECKUP BADGES
// ═══════════════════════════════════════════════════════════════════════════

export function VaccineShield({ size = 80, fill = '#9DC3E8', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M50,8 C62,14 78,14 88,12 C88,40 82,72 50,92 C18,72 12,40 12,12 C22,14 38,14 50,8 Z" fill={fill} stroke={stroke} strokeWidth={1.8} strokeLinejoin="round" />
      <Rect x={32} y={40} width={28} height={14} rx={3} transform="rotate(-30 46 48)" fill={PAPER} stroke={stroke} strokeWidth={1.6} />
      <Rect x={56} y={28} width={10} height={8} rx={2} transform="rotate(-30 60 32)" fill="#F5D652" stroke={stroke} strokeWidth={1.4} />
    </Svg>
  )
}

export function VaccineComplete({ size = 80, fill = '#BDD48C', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M50,8 C62,14 78,14 88,12 C88,40 82,72 50,92 C18,72 12,40 12,12 C22,14 38,14 50,8 Z" fill={fill} stroke={stroke} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M32,50 l12,12 l24,-24" fill="none" stroke={stroke} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

export function HealthCheckup({ size = 80, fill = '#EE7B6D', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <SvgCircle cx={40} cy={36} r={6} fill={PAPER} stroke={stroke} strokeWidth={1.4} />
      <Path d="M40,42 L40,60 C40,68 48,72 54,72 C60,72 68,68 68,60 L68,48" fill="none" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" />
      <SvgCircle cx={68} cy={46} r={4} fill={PAPER} stroke={stroke} strokeWidth={1.4} />
    </Svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 20. DIAPER & GROWTH BADGES
// ═══════════════════════════════════════════════════════════════════════════

export function DiaperFirst({ size = 80, fill = '#F5B896', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill="#FBEA9E" stroke={stroke} strokeWidth={1.8} />
      <Path d="M20,38 L80,38 L72,68 C68,76 60,80 50,80 C40,80 32,76 28,68 Z" fill={fill} stroke={stroke} strokeWidth={1.7} strokeLinejoin="round" />
      <Path d="M30,38 Q50,48 70,38" stroke={stroke} strokeWidth={1.3} fill="none" />
      <SvgText x={50} y={22} textAnchor="middle" fontFamily={FONT_BODY} fontSize={8} fill="#6E6763">FIRST</SvgText>
    </Svg>
  )
}

export function Diaper100({ size = 80, fill = '#F5B896', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {Array.from({ length: 16 }).map((_, i) => {
        const a = (i / 16) * Math.PI * 2
        const x = 50 + Math.cos(a) * 44
        const y = 50 + Math.sin(a) * 44
        return <SvgCircle key={i} cx={x} cy={y} r={5} fill={fill} stroke={stroke} strokeWidth={1.3} />
      })}
      <SvgCircle cx={50} cy={50} r={36} fill={PAPER} stroke={stroke} strokeWidth={1.5} />
      <SvgText x={50} y={46} textAnchor="middle" fontFamily={FONT_BODY} fontSize={8} fill="#6E6763">DIAPERS</SvgText>
      <SvgText x={50} y={72} textAnchor="middle" fontFamily={FONT_DISPLAY} fontSize={26} fill={stroke}>100</SvgText>
    </Svg>
  )
}

export function GrowthFirst({ size = 80, fill = '#9DC3E8', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill="#FBEA9E" stroke={stroke} strokeWidth={1.8} />
      <Rect x={28} y={18} width={14} height={64} rx={3} fill={fill} stroke={stroke} strokeWidth={1.6} />
      {[26, 38, 50, 62, 74].map((y, i) => (
        <Line key={i} x1={28} y1={y} x2={i % 2 === 0 ? 40 : 36} y2={y} stroke={stroke} strokeWidth={1.3} />
      ))}
      <Path d="M56,74 L56,56 C56,48 62,44 68,44 C74,44 80,48 80,56 L80,74 Z" fill="#F5D652" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" />
      <SvgCircle cx={68} cy={36} r={7} fill="#F5D652" stroke={stroke} strokeWidth={1.4} />
    </Svg>
  )
}

export function GrowthTracker({ size = 80, fill = '#9DC3E8', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <Path d="M20,72 L36,58 L46,66 L60,44 L80,28" fill="none" stroke={PAPER} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <SvgCircle cx={36} cy={58} r={3.5} fill={PAPER} stroke={stroke} strokeWidth={1.3} />
      <SvgCircle cx={46} cy={66} r={3.5} fill={PAPER} stroke={stroke} strokeWidth={1.3} />
      <SvgCircle cx={60} cy={44} r={3.5} fill={PAPER} stroke={stroke} strokeWidth={1.3} />
      <SvgCircle cx={80} cy={28} r={4.5} fill="#F5D652" stroke={stroke} strokeWidth={1.4} />
    </Svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 21. COMMUNITY / CHANNELS
// ═══════════════════════════════════════════════════════════════════════════

export function FirstPost({ size = 80, fill = '#C8B6E8', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M14,24 L78,24 A10,10 0 0 1 88,34 L88,62 A10,10 0 0 1 78,72 L42,72 L28,84 L32,72 L24,72 A10,10 0 0 1 14,62 Z" fill={fill} stroke={stroke} strokeWidth={1.8} strokeLinejoin="round" />
      <SvgText x={50} y={56} textAnchor="middle" fontFamily={FONT_DISPLAY} fontStyle="italic" fontSize={22} fill={stroke}>1st</SvgText>
    </Svg>
  )
}

export function FirstThread({ size = 80, fill = '#9DC3E8', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <Path d="M22,34 L62,34" stroke={PAPER} strokeWidth={3} strokeLinecap="round" />
      <Path d="M22,48 L70,48" stroke={PAPER} strokeWidth={3} strokeLinecap="round" />
      <Path d="M22,62 L56,62" stroke={PAPER} strokeWidth={3} strokeLinecap="round" />
      <SvgCircle cx={72} cy={66} r={8} fill="#F5D652" stroke={stroke} strokeWidth={1.4} />
    </Svg>
  )
}

export function FirstReaction({ size = 80, fill = '#F2B2C7', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill="#FBEA9E" stroke={stroke} strokeWidth={1.8} />
      <Path d="M50,82 C26,66 16,52 16,36 C16,26 24,20 32,20 C38,20 44,23 50,30 C56,23 62,20 68,20 C76,20 84,26 84,36 C84,52 74,66 50,82 Z" fill={fill} stroke={stroke} strokeWidth={1.8} />
      <Path d="M46,40 C42,40 40,44 42,48" fill="none" stroke={PAPER} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  )
}

export function CommunityHelpful({ size = 80, fill = '#BDD48C', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <Path d="M30,54 L30,76 L42,76 L42,54 Z" fill={PAPER} stroke={stroke} strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M42,54 L54,38 C58,34 64,38 60,46 L56,56 L72,56 C76,56 78,60 76,64 L72,76 L42,76 Z" fill="#F5D652" stroke={stroke} strokeWidth={1.6} strokeLinejoin="round" />
    </Svg>
  )
}

export function CommunityLeader({ size = 80, fill = '#F5D652', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <Path d="M22,56 L30,36 L42,48 L50,30 L58,48 L70,36 L78,56 L78,68 L22,68 Z" fill={PAPER} stroke={stroke} strokeWidth={1.6} strokeLinejoin="round" />
      <SvgCircle cx={30} cy={36} r={2.5} fill="#EE7B6D" stroke={stroke} strokeWidth={1} />
      <SvgCircle cx={50} cy={30} r={3} fill="#EE7B6D" stroke={stroke} strokeWidth={1} />
      <SvgCircle cx={70} cy={36} r={2.5} fill="#EE7B6D" stroke={stroke} strokeWidth={1} />
    </Svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 22. MEMORY / PROFILE
// ═══════════════════════════════════════════════════════════════════════════

export function FirstPhoto({ size = 80, fill = '#F2B2C7', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x={20} y={20} width={60} height={66} rx={4} fill={PAPER} stroke={stroke} strokeWidth={1.8} transform="rotate(-6 50 50)" />
      <Rect x={26} y={26} width={48} height={44} fill={fill} stroke={stroke} strokeWidth={1.4} transform="rotate(-6 50 50)" />
      <SvgCircle cx={36} cy={42} r={5} fill="#F5D652" stroke={stroke} strokeWidth={1.2} transform="rotate(-6 50 50)" />
      <Path d="M28,66 L46,52 L62,62 L70,56" fill="none" stroke={stroke} strokeWidth={1.6} strokeLinejoin="round" transform="rotate(-6 50 50)" />
    </Svg>
  )
}

export function MemoryMaker({ size = 80, fill = '#C8B6E8', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x={20} y={30} width={56} height={58} rx={3} fill={PAPER} stroke={stroke} strokeWidth={1.6} transform="rotate(-10 50 60)" />
      <Rect x={26} y={22} width={56} height={58} rx={3} fill="#FBEA9E" stroke={stroke} strokeWidth={1.6} />
      <Rect x={32} y={16} width={56} height={58} rx={3} fill={fill} stroke={stroke} strokeWidth={1.8} transform="rotate(6 60 46)" />
      <SvgCircle cx={56} cy={40} r={4} fill="#F5D652" stroke={stroke} strokeWidth={1.2} transform="rotate(6 60 46)" />
    </Svg>
  )
}

export function ProfileComplete({ size = 80, fill = '#BDD48C', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <SvgCircle cx={50} cy={40} r={12} fill={PAPER} stroke={stroke} strokeWidth={1.6} />
      <Path d="M26,82 C26,64 38,58 50,58 C62,58 74,64 74,82 Z" fill={PAPER} stroke={stroke} strokeWidth={1.6} strokeLinejoin="round" />
      <SvgCircle cx={76} cy={30} r={14} fill="#F5D652" stroke={stroke} strokeWidth={1.6} />
      <Path d="M70,30 l4,4 l8,-8" fill="none" stroke={stroke} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

export function ChildAdded({ size = 80, fill = '#9DC3E8', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <SvgCircle cx={50} cy={42} r={14} fill={PAPER} stroke={stroke} strokeWidth={1.6} />
      <Path d="M28,80 C28,66 38,60 50,60 C62,60 72,66 72,80 Z" fill={PAPER} stroke={stroke} strokeWidth={1.6} strokeLinejoin="round" />
      <SvgCircle cx={44} cy={42} r={1.8} fill={stroke} />
      <SvgCircle cx={56} cy={42} r={1.8} fill={stroke} />
      <Path d="M46,48 Q50,52 54,48" fill="none" stroke={stroke} strokeWidth={1.3} strokeLinecap="round" />
    </Svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 23. GARAGE
// ═══════════════════════════════════════════════════════════════════════════

export function FirstListing({ size = 80, fill = '#F5D652', stroke = INK }: BaseProps) {
  return (
    <Svg width={size * 1.2} height={size} viewBox="0 0 120 100">
      <Path d="M10,50 L50,10 L112,10 L112,90 L50,90 Z" fill={fill} stroke={stroke} strokeWidth={1.6} strokeLinejoin="round" />
      <SvgCircle cx={66} cy={28} r={6} fill={PAPER} stroke={stroke} strokeWidth={1.4} />
      <SvgText x={88} y={58} textAnchor="middle" fontFamily={FONT_DISPLAY} fontStyle="italic" fontSize={22} fill={stroke}>first</SvgText>
      <SvgText x={88} y={76} textAnchor="middle" fontFamily={FONT_DISPLAY} fontStyle="italic" fontSize={16} fill={stroke}>listing</SvgText>
    </Svg>
  )
}

export function FirstGift({ size = 80, fill = '#F2B2C7', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x={14} y={42} width={72} height={44} rx={4} fill={fill} stroke={stroke} strokeWidth={1.6} />
      <Rect x={10} y={30} width={80} height={16} rx={3} fill="#F5D652" stroke={stroke} strokeWidth={1.6} />
      <Rect x={44} y={30} width={12} height={56} fill="#EE7B6D" stroke={stroke} strokeWidth={1.4} />
      <Path d="M50,30 C42,18 30,16 28,22 C26,28 38,30 50,30 C62,30 74,28 72,22 C70,16 58,18 50,30 Z" fill="#EE7B6D" stroke={stroke} strokeWidth={1.4} strokeLinejoin="round" />
      <SvgText x={74} y={60} fontFamily={FONT_DISPLAY} fontStyle="italic" fontSize={14} fill={stroke}>1</SvgText>
    </Svg>
  )
}

export function FirstTrade({ size = 80, fill = '#BDD48C', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <Path d="M22,40 L66,40 L60,32 M78,60 L34,60 L40,68" fill="none" stroke={PAPER} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 24. CENTURION / PROGRESS TIERS
// ═══════════════════════════════════════════════════════════════════════════

export function FirstLog({ size = 80, fill = '#F5D652', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M50,8 L60,36 L90,40 L68,60 L76,90 L50,74 L24,90 L32,60 L10,40 L40,36 Z" fill={fill} stroke={stroke} strokeWidth={1.8} strokeLinejoin="round" />
      <SvgText x={50} y={60} textAnchor="middle" fontFamily={FONT_DISPLAY} fontStyle="italic" fontSize={18} fill={stroke}>1st</SvgText>
    </Svg>
  )
}

export function Century100({ size = 80, fill = '#C8B6E8', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {Array.from({ length: 20 }).map((_, i) => {
        const a = (i / 20) * Math.PI * 2
        const x = 50 + Math.cos(a) * 44
        const y = 50 + Math.sin(a) * 44
        return <SvgCircle key={i} cx={x} cy={y} r={4} fill={fill} stroke={stroke} strokeWidth={1.2} />
      })}
      <SvgCircle cx={50} cy={50} r={36} fill={PAPER} stroke={stroke} strokeWidth={1.5} />
      <SvgText x={50} y={44} textAnchor="middle" fontFamily={FONT_BODY} fontSize={7} fill="#6E6763">LOGS</SvgText>
      <SvgText x={50} y={70} textAnchor="middle" fontFamily={FONT_DISPLAY} fontSize={26} fill={stroke}>100</SvgText>
    </Svg>
  )
}

export function GrandmaPride({ size = 80, fill = '#F5D652', stroke = INK }: BaseProps) {
  const pts: string[] = []
  for (let i = 0; i < 32; i++) {
    const r = i % 2 === 0 ? 46 : 36
    const a = (i / 32) * Math.PI * 2 - Math.PI / 2
    pts.push(`${50 + Math.cos(a) * r},${50 + Math.sin(a) * r}`)
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Polygon points={pts.join(' ')} fill={fill} stroke={stroke} strokeWidth={1.6} strokeLinejoin="round" />
      <SvgCircle cx={50} cy={50} r={28} fill={PAPER} stroke={stroke} strokeWidth={1.5} />
      <SvgText x={50} y={44} textAnchor="middle" fontFamily={FONT_BODY} fontSize={7} fill="#6E6763">PRIDE</SvgText>
      <SvgText x={50} y={68} textAnchor="middle" fontFamily={FONT_DISPLAY} fontSize={22} fill={stroke}>500</SvgText>
    </Svg>
  )
}

export function DailyCheckin({ size = 80, days = 7, fill = '#BDD48C', stroke = INK }: BaseProps & { days?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x={14} y={22} width={72} height={64} rx={6} fill={PAPER} stroke={stroke} strokeWidth={1.8} />
      <Rect x={14} y={22} width={72} height={16} rx={6} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <Rect x={22} y={14} width={6} height={16} rx={2} fill={stroke} />
      <Rect x={72} y={14} width={6} height={16} rx={2} fill={stroke} />
      <SvgText x={50} y={68} textAnchor="middle" fontFamily={FONT_DISPLAY} fontSize={26} fill={stroke}>{days}</SvgText>
      <SvgText x={50} y={80} textAnchor="middle" fontFamily={FONT_BODY} fontSize={7} fill="#6E6763">CHECK-INS</SvgText>
    </Svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 25. NOTIFICATION ICONS
// ═══════════════════════════════════════════════════════════════════════════

export function NotifyInsight({ size = 60, fill = '#F5D652', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M50,14 L56,36 L78,36 L60,50 L66,72 L50,58 L34,72 L40,50 L22,36 L44,36 Z" fill={fill} stroke={stroke} strokeWidth={1.8} strokeLinejoin="round" />
      <SvgCircle cx={22} cy={22} r={4} fill="#C8B6E8" stroke={stroke} strokeWidth={1.3} />
      <SvgCircle cx={82} cy={78} r={3} fill="#C8B6E8" stroke={stroke} strokeWidth={1.3} />
      <SvgCircle cx={80} cy={24} r={3} fill="#F2B2C7" stroke={stroke} strokeWidth={1.2} />
    </Svg>
  )
}

export function NotifyWellnessUp({ size = 60, fill = '#BDD48C', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <Path d="M24,62 L42,46 L54,54 L76,30" fill="none" stroke={PAPER} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M66,30 L76,30 L76,40" fill="none" stroke={PAPER} strokeWidth={3} strokeLinecap="round" />
    </Svg>
  )
}

export function NotifyWellnessDown({ size = 60, fill = '#F5B896', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <Path d="M24,38 L42,54 L54,46 L76,70" fill="none" stroke={PAPER} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M66,70 L76,70 L76,60" fill="none" stroke={PAPER} strokeWidth={3} strokeLinecap="round" />
    </Svg>
  )
}

export function NotifyStreakBroken({ size = 60, fill = '#A69E93', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M50,6 C52,20 70,30 72,52 C74,78 56,92 50,92 C44,92 26,78 28,52 C30,36 40,36 38,22 C44,28 50,22 50,6 Z" fill={fill} stroke={stroke} strokeWidth={1.8} strokeLinejoin="round" strokeDasharray="4 3" />
      <Path d="M42,36 L58,62" stroke={PAPER} strokeWidth={3} strokeLinecap="round" />
      <Path d="M58,40 L42,66" stroke={PAPER} strokeWidth={3} strokeLinecap="round" />
    </Svg>
  )
}

export function NotifyMissingData({ size = 60, fill = '#EFE5CC', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x={16} y={20} width={68} height={60} rx={6} fill={fill} stroke={stroke} strokeWidth={1.8} strokeDasharray="4 3" />
      <SvgCircle cx={40} cy={50} r={3} fill={stroke} />
      <SvgCircle cx={50} cy={50} r={3} fill={stroke} />
      <SvgCircle cx={60} cy={50} r={3} fill={stroke} />
    </Svg>
  )
}

export function NotifyGoalAchieved({ size = 60, fill = '#F5D652', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M22,14 L22,88" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M22,16 L74,22 L66,36 L74,50 L22,44 Z" fill={fill} stroke={stroke} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M30,28 l6,6 l12,-12" fill="none" stroke={stroke} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

export function NotifyVaccineDue({ size = 60, fill = '#9DC3E8', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x={32} y={42} width={36} height={16} rx={3} transform="rotate(45 50 50)" fill={fill} stroke={stroke} strokeWidth={1.8} />
      <Rect x={62} y={22} width={16} height={10} rx={2} transform="rotate(45 70 28)" fill="#F5D652" stroke={stroke} strokeWidth={1.5} />
      <SvgCircle cx={76} cy={72} r={14} fill="#EE7B6D" stroke={stroke} strokeWidth={1.6} />
      <Path d="M72,66 L72,72 L76,72" stroke={PAPER} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  )
}

export function NotifyAppointmentDue({ size = 60, fill = '#C8B6E8', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x={14} y={22} width={72} height={60} rx={6} fill={PAPER} stroke={stroke} strokeWidth={1.8} />
      <Rect x={14} y={22} width={72} height={14} rx={6} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <Rect x={22} y={14} width={6} height={14} rx={2} fill={stroke} />
      <Rect x={72} y={14} width={6} height={14} rx={2} fill={stroke} />
      <SvgCircle cx={70} cy={66} r={10} fill="#F5D652" stroke={stroke} strokeWidth={1.5} />
      <Path d="M66,60 L66,66 L72,66" stroke={stroke} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  )
}

export function NotifyRoutine({ size = 60, fill = '#F2B2C7', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={52} r={36} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <SvgCircle cx={50} cy={52} r={28} fill={PAPER} stroke={stroke} strokeWidth={1.4} />
      <Path d="M50,34 L50,52 L62,58" stroke={stroke} strokeWidth={2.2} strokeLinecap="round" />
      <Path d="M28,18 L22,14 M72,18 L78,14" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  )
}

export function NotifyHealthAlert({ size = 60, fill = '#EE7B6D', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M50,10 L88,80 L12,80 Z" fill={fill} stroke={stroke} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M50,36 L50,56" stroke={PAPER} strokeWidth={4} strokeLinecap="round" />
      <SvgCircle cx={50} cy={68} r={3} fill={PAPER} />
    </Svg>
  )
}

export function NotifyDailySummary({ size = 60, fill = '#F5D652', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={22} fill={fill} stroke={stroke} strokeWidth={1.8} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a, i) => {
        const rad = (a * Math.PI) / 180
        const x1 = 50 + Math.cos(rad) * 28
        const y1 = 50 + Math.sin(rad) * 28
        const x2 = 50 + Math.cos(rad) * 40
        const y2 = 50 + Math.sin(rad) * 40
        return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      })}
    </Svg>
  )
}

export function NotifyWeeklyReport({ size = 60, fill = '#C8B6E8', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x={14} y={20} width={72} height={64} rx={6} fill={PAPER} stroke={stroke} strokeWidth={1.8} />
      <Rect x={24} y={52} width={8} height={22} fill={fill} stroke={stroke} strokeWidth={1.3} />
      <Rect x={36} y={44} width={8} height={30} fill="#F5D652" stroke={stroke} strokeWidth={1.3} />
      <Rect x={48} y={36} width={8} height={38} fill="#BDD48C" stroke={stroke} strokeWidth={1.3} />
      <Rect x={60} y={48} width={8} height={26} fill="#F2B2C7" stroke={stroke} strokeWidth={1.3} />
      <Rect x={72} y={32} width={8} height={42} fill={fill} stroke={stroke} strokeWidth={1.3} />
    </Svg>
  )
}

export function NotifyMention({ size = 60, fill = '#9DC3E8', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={36} fill="none" stroke={stroke} strokeWidth={1.8} />
      <SvgCircle cx={50} cy={50} r={12} fill={fill} stroke={stroke} strokeWidth={1.6} />
      <Path d="M62,50 L62,62 C62,68 70,68 70,58 C70,42 62,36 50,36 C36,36 28,46 28,58 C28,72 40,80 54,76" fill="none" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  )
}

export function NotifyLike({ size = 60, fill = '#F2B2C7', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M50,88 C20,68 8,50 8,32 C8,18 20,10 32,10 C40,10 46,14 50,22 C54,14 60,10 68,10 C80,10 92,18 92,32 C92,50 80,68 50,88 Z" fill={fill} stroke={stroke} strokeWidth={1.8} />
    </Svg>
  )
}

export function NotifyReply({ size = 60, fill = '#BDD48C', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M14,24 L78,24 A10,10 0 0 1 88,34 L88,56 A10,10 0 0 1 78,66 L42,66 L28,78 L32,66 L24,66 A10,10 0 0 1 14,56 Z" fill={fill} stroke={stroke} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M40,42 L30,46 L40,50" fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M30,46 L56,46 A10,10 0 0 1 66,56 L66,58" fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 26. LEADERBOARD / RANK
// ═══════════════════════════════════════════════════════════════════════════

export function RankGold({ size = 80, fill = '#F5D652', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={54} r={28} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <SvgCircle cx={50} cy={54} r={20} fill="#FBEA9E" stroke={stroke} strokeWidth={1.3} />
      <SvgText x={50} y={62} textAnchor="middle" fontFamily={FONT_DISPLAY} fontSize={22} fill={stroke}>1</SvgText>
      <Path d="M22,20 L40,48 M78,20 L60,48" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      <Path d="M22,20 L38,14 M78,20 L62,14" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  )
}

export function RankSilver({ size = 80, fill = '#CFE0F0', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={54} r={28} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <SvgCircle cx={50} cy={54} r={20} fill={PAPER} stroke={stroke} strokeWidth={1.3} />
      <SvgText x={50} y={62} textAnchor="middle" fontFamily={FONT_DISPLAY} fontSize={22} fill={stroke}>2</SvgText>
      <Path d="M22,20 L40,48 M78,20 L60,48" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  )
}

export function RankBronze({ size = 80, fill = '#F5B896', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={54} r={28} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <SvgCircle cx={50} cy={54} r={20} fill="#F9D6C0" stroke={stroke} strokeWidth={1.3} />
      <SvgText x={50} y={62} textAnchor="middle" fontFamily={FONT_DISPLAY} fontSize={22} fill={stroke}>3</SvgText>
      <Path d="M22,20 L40,48 M78,20 L60,48" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 27. BADGE TIER FRAMES
// ═══════════════════════════════════════════════════════════════════════════

export function TierFrame({ size = 80, tier = 'bronze', stroke = INK }: { size?: number; tier?: 'bronze' | 'silver' | 'gold' | 'diamond'; stroke?: string }) {
  const map: Record<string, string> = {
    bronze: '#F5B896',
    silver: '#CFE0F0',
    gold: '#F5D652',
    diamond: '#C8B6E8',
  }
  const fill = map[tier] ?? map.bronze
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {Array.from({ length: 16 }).map((_, i) => {
        const a = (i / 16) * Math.PI * 2
        const x = 50 + Math.cos(a) * 44
        const y = 50 + Math.sin(a) * 44
        return <SvgCircle key={i} cx={x} cy={y} r={5} fill={fill} stroke={stroke} strokeWidth={1.3} />
      })}
      <SvgCircle cx={50} cy={50} r={36} fill={PAPER} stroke={stroke} strokeWidth={1.5} />
      <SvgText x={50} y={46} textAnchor="middle" fontFamily={FONT_BODY} fontSize={8} fill="#6E6763">{tier.toUpperCase()}</SvgText>
      <SvgText x={50} y={70} textAnchor="middle" fontFamily={FONT_DISPLAY} fontStyle="italic" fontSize={22} fill={stroke}>★</SvgText>
    </Svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 28. CARE CIRCLE ROLES
// ═══════════════════════════════════════════════════════════════════════════

export function RolePartner({ size = 80, fill = '#F2B2C7', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill="#FBEA9E" stroke={stroke} strokeWidth={1.8} />
      <Path d="M36,64 C22,52 14,42 14,30 C14,22 22,18 30,18 C34,18 38,20 40,24 C42,20 46,18 50,18 C58,18 66,22 66,30 C66,42 58,52 44,64 Z" fill={fill} stroke={stroke} strokeWidth={1.6} />
      <Path d="M60,76 C50,68 44,60 44,52 C44,46 50,42 56,42 C60,42 62,44 64,48 C66,44 68,42 72,42 C78,42 84,46 84,52 C84,60 76,68 66,76 Z" fill="#C8B6E8" stroke={stroke} strokeWidth={1.6} />
    </Svg>
  )
}

export function RoleNanny({ size = 80, fill = '#BDD48C', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <SvgCircle cx={42} cy={36} r={9} fill={PAPER} stroke={stroke} strokeWidth={1.5} />
      <Path d="M26,82 C26,62 34,54 42,54 C50,54 56,62 56,82 Z" fill={PAPER} stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" />
      <SvgCircle cx={66} cy={56} r={7} fill="#F5D652" stroke={stroke} strokeWidth={1.3} />
      <Path d="M56,70 C58,62 74,62 76,70 C76,76 70,78 66,78 C62,78 56,76 56,70 Z" fill="#F5D652" stroke={stroke} strokeWidth={1.3} />
    </Svg>
  )
}

export function RoleFamily({ size = 80, fill = '#F5B896', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <SvgCircle cx={30} cy={34} r={8} fill={PAPER} stroke={stroke} strokeWidth={1.4} />
      <SvgCircle cx={70} cy={34} r={8} fill={PAPER} stroke={stroke} strokeWidth={1.4} />
      <SvgCircle cx={50} cy={60} r={6} fill="#F5D652" stroke={stroke} strokeWidth={1.3} />
      <Path d="M18,78 C18,62 22,56 30,56 C38,56 42,62 42,78 Z" fill={PAPER} stroke={stroke} strokeWidth={1.4} strokeLinejoin="round" />
      <Path d="M58,78 C58,62 62,56 70,56 C78,56 82,62 82,78 Z" fill={PAPER} stroke={stroke} strokeWidth={1.4} strokeLinejoin="round" />
      <Path d="M42,84 C42,72 46,68 50,68 C54,68 58,72 58,84 Z" fill="#F5D652" stroke={stroke} strokeWidth={1.3} strokeLinejoin="round" />
    </Svg>
  )
}

export function RoleDoctor({ size = 80, fill = '#9DC3E8', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <SvgCircle cx={36} cy={30} r={5} fill={PAPER} stroke={stroke} strokeWidth={1.4} />
      <SvgCircle cx={64} cy={30} r={5} fill={PAPER} stroke={stroke} strokeWidth={1.4} />
      <Path d="M36,35 L36,54 C36,64 44,68 50,68 C56,68 64,64 64,54 L64,35" fill="none" stroke={PAPER} strokeWidth={2} strokeLinecap="round" />
      <SvgCircle cx={50} cy={72} r={6} fill="#EE7B6D" stroke={stroke} strokeWidth={1.4} />
    </Svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 29. SYSTEM UNLOCKS
// ═══════════════════════════════════════════════════════════════════════════

export function ScanComplete({ size = 80, fill = '#F5D652', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x={14} y={26} width={72} height={56} rx={10} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <Path d="M34,26 L40,16 L60,16 L66,26" fill={fill} stroke={stroke} strokeWidth={1.8} strokeLinejoin="round" />
      <SvgCircle cx={50} cy={54} r={14} fill={PAPER} stroke={stroke} strokeWidth={1.6} />
      <SvgCircle cx={50} cy={54} r={7} fill={stroke} />
      <Line x1={22} y1={54} x2={36} y2={54} stroke={PAPER} strokeWidth={2} strokeDasharray="2 2" />
    </Svg>
  )
}

export function BirthPlanReady({ size = 80, fill = '#C8B6E8', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M22,12 L68,12 L82,26 L82,88 L22,88 Z" fill={PAPER} stroke={stroke} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M68,12 L68,26 L82,26" fill="none" stroke={stroke} strokeWidth={1.6} />
      <Path d="M32,40 L72,40 M32,52 L72,52 M32,64 L58,64" stroke={stroke} strokeWidth={1.4} strokeLinecap="round" />
      <SvgCircle cx={66} cy={76} r={10} fill={fill} stroke={stroke} strokeWidth={1.6} />
      <Path d="M62,76 l3,4 l8,-8" fill="none" stroke={stroke} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

export function AirTagLinked({ size = 80, fill = '#9DC3E8', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <SvgCircle cx={50} cy={50} r={30} fill="none" stroke={PAPER} strokeWidth={2.5} strokeDasharray="3 4" />
      <Path d="M50,22 L58,50 L50,46 L42,50 Z" fill={PAPER} stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" />
      <SvgCircle cx={50} cy={50} r={5} fill="#EE7B6D" stroke={stroke} strokeWidth={1.4} />
    </Svg>
  )
}

export function PaywallUnlock({ size = 80, fill = '#F5D652', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <Rect x={36} y={48} width={28} height={22} rx={3} fill={PAPER} stroke={stroke} strokeWidth={1.6} />
      <Path d="M40,48 v-6 a10,10 0 0 1 20,0 v2 M44,42 v-4" fill="none" stroke={stroke} strokeWidth={1.6} strokeLinecap="round" />
      <SvgCircle cx={50} cy={58} r={3} fill={stroke} />
    </Svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 30. JOURNEY STICKERS
// ═══════════════════════════════════════════════════════════════════════════

export function JourneyStart({ size = 80, fill = '#BDD48C', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <Path d="M30,80 L30,20" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M30,24 L70,28 L62,40 L70,54 L30,50 Z" fill="#F5D652" stroke={stroke} strokeWidth={1.7} strokeLinejoin="round" />
    </Svg>
  )
}

export function AllThreeJourneys({ size = 100, stroke = INK }: { size?: number; stroke?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={38} cy={46} r={26} fill="#F2B2C7" stroke={stroke} strokeWidth={1.8} opacity={0.95} />
      <SvgCircle cx={62} cy={46} r={26} fill="#C8B6E8" stroke={stroke} strokeWidth={1.8} opacity={0.95} />
      <SvgCircle cx={50} cy={66} r={26} fill="#9DC3E8" stroke={stroke} strokeWidth={1.8} opacity={0.95} />
      <SvgCircle cx={50} cy={52} r={8} fill="#F5D652" stroke={stroke} strokeWidth={1.5} />
    </Svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 31. PILLAR ICONS — 24 pillars (6 pre + 9 pregnancy + 9 kids)
// ═══════════════════════════════════════════════════════════════════════════

// ---- PRE-PREGNANCY PILLARS (6) ----
export function PillarFertility({ size = 60, fill = '#F2B2C7', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={38} fill={fill} stroke={stroke} strokeWidth={1.7} />
      <Path d="M50,22 C40,28 32,38 32,50 C32,62 40,72 50,78 C60,72 68,62 68,50 C68,38 60,28 50,22 Z" fill={PAPER} stroke={stroke} strokeWidth={1.4} />
    </Svg>
  )
}

export function PillarNutritionPrep({ size = 60, fill = '#BDD48C', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={38} fill={fill} stroke={stroke} strokeWidth={1.7} />
      <Path d="M50,20 C40,28 38,38 42,50 C38,56 38,66 46,74 C54,82 64,78 70,68 C76,56 72,40 60,28 C56,24 52,20 50,20 Z" fill={PAPER} stroke={stroke} strokeWidth={1.4} />
    </Svg>
  )
}

export function PillarEmotionalReadiness({ size = 60, fill = '#FBEA9E', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={38} fill={fill} stroke={stroke} strokeWidth={1.7} />
      <Path d="M50,76 C30,60 22,48 22,38 C22,30 28,24 36,24 C40,24 44,26 50,32 C56,26 60,24 64,24 C72,24 78,30 78,38 C78,48 70,60 50,76 Z" fill={PAPER} stroke={stroke} strokeWidth={1.4} />
    </Svg>
  )
}

export function PillarFinancial({ size = 60, fill = '#9DC3E8', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={38} fill={fill} stroke={stroke} strokeWidth={1.7} />
      <SvgCircle cx={50} cy={50} r={22} fill={PAPER} stroke={stroke} strokeWidth={1.4} />
      <SvgText x={50} y={60} textAnchor="middle" fontFamily={FONT_DISPLAY} fontSize={22} fill={stroke}>$</SvgText>
    </Svg>
  )
}

export function PillarPartnerJourney({ size = 60, fill = '#F5B896', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={38} fill={fill} stroke={stroke} strokeWidth={1.7} />
      <SvgCircle cx={40} cy={42} r={7} fill={PAPER} stroke={stroke} strokeWidth={1.3} />
      <SvgCircle cx={60} cy={42} r={7} fill={PAPER} stroke={stroke} strokeWidth={1.3} />
      <Path d="M30,72 C30,60 34,56 40,56 C46,56 50,60 50,72 Z M50,72 C50,60 54,56 60,56 C66,56 70,60 70,72 Z" fill={PAPER} stroke={stroke} strokeWidth={1.3} strokeLinejoin="round" />
    </Svg>
  )
}

export function PillarHealthCheckups({ size = 60, fill = '#EE7B6D', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={38} fill={fill} stroke={stroke} strokeWidth={1.7} />
      <Path d="M42,30 h16 v12 h12 v16 h-12 v12 h-16 v-12 h-12 v-16 h12 z" fill={PAPER} stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
  )
}

// ---- PREGNANCY PILLARS (9) ----
export function PillarWeekByWeek({ size = 60, fill = '#C8B6E8', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={38} fill={fill} stroke={stroke} strokeWidth={1.7} />
      <Rect x={28} y={34} width={44} height={36} rx={4} fill={PAPER} stroke={stroke} strokeWidth={1.4} />
      <Rect x={28} y={34} width={44} height={10} rx={4} fill={fill} stroke={stroke} strokeWidth={1.4} />
      <SvgText x={50} y={66} textAnchor="middle" fontFamily={FONT_DISPLAY} fontSize={15} fill={stroke}>24</SvgText>
    </Svg>
  )
}

export function PillarSymptoms({ size = 60, fill = '#F5B896', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={38} fill={fill} stroke={stroke} strokeWidth={1.7} />
      <Rect x={36} y={40} width={28} height={8} rx={4} fill={PAPER} stroke={stroke} strokeWidth={1.3} />
      <Rect x={46} y={30} width={8} height={28} rx={4} fill={PAPER} stroke={stroke} strokeWidth={1.3} />
    </Svg>
  )
}

export function PillarBirthPlanning({ size = 60, fill = '#F2B2C7', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={38} fill={fill} stroke={stroke} strokeWidth={1.7} />
      <Path d="M32,66 L32,30 L68,30 L68,66 M32,48 L68,48" fill="none" stroke={PAPER} strokeWidth={2} strokeLinecap="round" />
      <Rect x={44} y={54} width={12} height={14} fill={PAPER} stroke={stroke} strokeWidth={1.3} />
    </Svg>
  )
}

export function PillarBreastfeedingPrep({ size = 60, fill = '#FBEA9E', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={38} fill={fill} stroke={stroke} strokeWidth={1.7} />
      <Ellipse cx={42} cy={50} rx={12} ry={16} fill={PAPER} stroke={stroke} strokeWidth={1.4} />
      <Ellipse cx={58} cy={50} rx={12} ry={16} fill={PAPER} stroke={stroke} strokeWidth={1.4} />
      <SvgCircle cx={42} cy={52} r={3} fill={stroke} />
      <SvgCircle cx={58} cy={52} r={3} fill={stroke} />
    </Svg>
  )
}

export function PillarBabyGear({ size = 60, fill = '#9DC3E8', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={38} fill={fill} stroke={stroke} strokeWidth={1.7} />
      <Rect x={28} y={44} width={44} height={24} rx={12} fill={PAPER} stroke={stroke} strokeWidth={1.5} />
      <SvgCircle cx={36} cy={72} r={4} fill={stroke} />
      <SvgCircle cx={64} cy={72} r={4} fill={stroke} />
      <Path d="M30,44 Q40,28 50,34" fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  )
}

export function PillarPartnerSupport({ size = 60, fill = '#BDD48C', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={38} fill={fill} stroke={stroke} strokeWidth={1.7} />
      <SvgCircle cx={38} cy={40} r={7} fill={PAPER} stroke={stroke} strokeWidth={1.3} />
      <SvgCircle cx={58} cy={40} r={7} fill={PAPER} stroke={stroke} strokeWidth={1.3} />
      <Path d="M48,68 C38,58 32,50 32,42 C32,36 36,32 42,32 C46,32 48,34 48,38 C48,34 50,32 54,32 C60,32 64,36 64,42 C64,50 58,58 48,68 Z" fill="#F2B2C7" stroke={stroke} strokeWidth={1.3} />
    </Svg>
  )
}

export function PillarPostpartumPrep({ size = 60, fill = '#F9D8E2', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={38} fill={fill} stroke={stroke} strokeWidth={1.7} />
      <SvgCircle cx={42} cy={42} r={10} fill={PAPER} stroke={stroke} strokeWidth={1.4} />
      <Path d="M30,72 C30,58 36,54 42,54 C48,54 54,58 54,72 Z" fill={PAPER} stroke={stroke} strokeWidth={1.4} strokeLinejoin="round" />
      <SvgCircle cx={66} cy={52} r={6} fill="#F5D652" stroke={stroke} strokeWidth={1.3} />
      <Path d="M56,64 C58,58 72,58 74,64 C74,68 70,70 66,70 C62,70 56,68 56,64 Z" fill="#F5D652" stroke={stroke} strokeWidth={1.3} />
    </Svg>
  )
}

export function PillarPregNutrition({ size = 60, fill = '#DDE7BB', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={38} fill={fill} stroke={stroke} strokeWidth={1.7} />
      <Path d="M26,64 C26,46 38,32 54,32 C64,32 74,38 74,50 C74,62 62,76 46,76 C34,76 26,72 26,64 Z" fill={PAPER} stroke={stroke} strokeWidth={1.4} />
    </Svg>
  )
}

export function PillarEmotionalWellness({ size = 60, fill = '#E3D8F2', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={38} fill={fill} stroke={stroke} strokeWidth={1.7} />
      <SvgCircle cx={50} cy={48} r={16} fill={PAPER} stroke={stroke} strokeWidth={1.4} />
      <Path d="M42,48 Q50,58 58,48" fill="none" stroke={stroke} strokeWidth={1.6} strokeLinecap="round" />
      <SvgCircle cx={44} cy={44} r={1.8} fill={stroke} />
      <SvgCircle cx={56} cy={44} r={1.8} fill={stroke} />
    </Svg>
  )
}

// ---- KIDS PILLARS (9) ----
export function PillarBreastfeeding({ size = 60, fill = '#F2B2C7', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={38} fill={fill} stroke={stroke} strokeWidth={1.7} />
      <Rect x={42} y={26} width={16} height={10} rx={3} fill={PAPER} stroke={stroke} strokeWidth={1.3} />
      <Path d="M42,36 L38,44 L38,72 C38,76 42,78 46,78 L54,78 C58,78 62,76 62,72 L62,44 L58,36 Z" fill={PAPER} stroke={stroke} strokeWidth={1.4} strokeLinejoin="round" />
      <Path d="M38,56 L62,56" stroke={stroke} strokeWidth={1.3} />
    </Svg>
  )
}

export function PillarFeeding({ size = 60, fill = '#BDD48C', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={38} fill={fill} stroke={stroke} strokeWidth={1.7} />
      <Ellipse cx={50} cy={56} rx={24} ry={10} fill={PAPER} stroke={stroke} strokeWidth={1.4} />
      <Path d="M50,56 L62,30" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      <Ellipse cx={64} cy={28} rx={4} ry={6} fill="#F5D652" stroke={stroke} strokeWidth={1.3} />
    </Svg>
  )
}

export function PillarKidsNutrition({ size = 60, fill = '#FBEA9E', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={38} fill={fill} stroke={stroke} strokeWidth={1.7} />
      <SvgCircle cx={42} cy={46} r={10} fill="#EE7B6D" stroke={stroke} strokeWidth={1.3} />
      <SvgCircle cx={58} cy={56} r={10} fill="#BDD48C" stroke={stroke} strokeWidth={1.3} />
      <Ellipse cx={50} cy={34} rx={5} ry={3} fill="#F5D652" stroke={stroke} strokeWidth={1.2} />
    </Svg>
  )
}

export function PillarVaccines({ size = 60, fill = '#9DC3E8', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={38} fill={fill} stroke={stroke} strokeWidth={1.7} />
      <Rect x={36} y={44} width={30} height={12} rx={3} transform="rotate(45 50 50)" fill={PAPER} stroke={stroke} strokeWidth={1.4} />
      <Rect x={62} y={26} width={12} height={8} rx={2} transform="rotate(45 68 30)" fill="#F5D652" stroke={stroke} strokeWidth={1.3} />
    </Svg>
  )
}

export function PillarLayette({ size = 60, fill = '#C8B6E8', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={38} fill={fill} stroke={stroke} strokeWidth={1.7} />
      <Path d="M34,36 L40,30 L60,30 L66,36 L66,70 C66,74 62,76 58,76 L42,76 C38,76 34,74 34,70 Z" fill={PAPER} stroke={stroke} strokeWidth={1.4} strokeLinejoin="round" />
      <Path d="M40,30 L44,38 L50,34 L56,38 L60,30" fill="none" stroke={stroke} strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

export function PillarRecipes({ size = 60, fill = '#F5B896', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={38} fill={fill} stroke={stroke} strokeWidth={1.7} />
      <Path d="M28,36 C28,28 38,24 50,24 C62,24 72,28 72,36 L72,66 C72,74 62,78 50,78 C38,78 28,74 28,66 Z" fill={PAPER} stroke={stroke} strokeWidth={1.4} />
      <Path d="M28,36 C28,44 38,48 50,48 C62,48 72,44 72,36" fill="none" stroke={stroke} strokeWidth={1.3} />
    </Svg>
  )
}

export function PillarNaturalCare({ size = 60, fill = '#BDD48C', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={38} fill={fill} stroke={stroke} strokeWidth={1.7} />
      <Path d="M50,26 C40,40 30,50 30,62 C30,72 40,76 50,76 C60,76 70,72 70,62 C70,50 60,40 50,26 Z" fill={PAPER} stroke={stroke} strokeWidth={1.4} />
      <Path d="M50,40 L50,72" stroke={stroke} strokeWidth={1.4} />
      <Path d="M44,52 L50,56 L56,52" fill="none" stroke={stroke} strokeWidth={1.3} />
    </Svg>
  )
}

export function PillarMedicine({ size = 60, fill = '#EE7B6D', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={38} fill={fill} stroke={stroke} strokeWidth={1.7} />
      <Rect x={26} y={42} width={48} height={18} rx={9} fill={PAPER} stroke={stroke} strokeWidth={1.4} />
      <Rect x={48} y={42} width={4} height={18} fill={stroke} />
    </Svg>
  )
}

export function PillarMilestones({ size = 60, fill = '#F5D652', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={38} fill={fill} stroke={stroke} strokeWidth={1.7} />
      <Path d="M50,24 L56,42 L74,44 L60,56 L64,74 L50,64 L36,74 L40,56 L26,44 L44,42 Z" fill={PAPER} stroke={stroke} strokeWidth={1.4} strokeLinejoin="round" />
    </Svg>
  )
}

// ---- PILLAR STATUS ----
export function PillarOpen({ size = 60, fill = '#FBEA9E', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M14,24 L50,30 L50,86 L14,80 Z" fill={fill} stroke={stroke} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M86,24 L50,30 L50,86 L86,80 Z" fill={PAPER} stroke={stroke} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M22,40 L42,44 M22,52 L42,56 M22,64 L42,68" stroke={stroke} strokeWidth={1.3} />
      <Path d="M58,40 L78,38 M58,52 L78,50 M58,64 L78,62" stroke={stroke} strokeWidth={1.3} />
    </Svg>
  )
}

export function PillarComplete({ size = 60, fill = '#F5D652', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M38,82 L62,82 L62,72 C72,70 80,62 80,50 L80,34 L72,34 L72,22 L28,22 L28,34 L20,34 L20,50 C20,62 28,70 38,72 Z" fill={fill} stroke={stroke} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M20,34 L14,34 L14,44 C14,48 16,50 20,50 M80,34 L86,34 L86,44 C86,48 84,50 80,50" fill="none" stroke={stroke} strokeWidth={1.8} />
      <Path d="M40,42 l6,6 l14,-14" fill="none" stroke={PAPER} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

export function TipRead({ size = 60, fill = '#C8B6E8', stroke = INK }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M30,14 L70,14 L70,86 L50,74 L30,86 Z" fill={fill} stroke={stroke} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M40,32 L60,32 M40,44 L60,44 M40,56 L54,56" stroke={PAPER} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  )
}

export function PillarMaster({ size = 80, fill = '#F5D652', stroke = INK }: BaseProps) {
  const stars: React.ReactNode[] = []
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 - Math.PI / 2
    const x = 50 + Math.cos(a) * 30
    const y = 50 + Math.sin(a) * 30
    stars.push(
      <Path
        key={i}
        d={`M${x},${y - 6} L${x + 1.8},${y - 2} L${x + 6},${y - 1.5} L${x + 2.5},${y + 1.5} L${x + 3.5},${y + 5.5} L${x},${y + 3} L${x - 3.5},${y + 5.5} L${x - 2.5},${y + 1.5} L${x - 6},${y - 1.5} L${x - 1.8},${y - 2} Z`}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
    )
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <SvgCircle cx={50} cy={50} r={42} fill="#FBEA9E" stroke={stroke} strokeWidth={1.8} />
      <SvgCircle cx={50} cy={50} r={18} fill={PAPER} stroke={stroke} strokeWidth={1.4} />
      <SvgText x={50} y={56} textAnchor="middle" fontFamily={FONT_DISPLAY} fontStyle="italic" fontSize={16} fill={stroke}>★</SvgText>
      {stars}
    </Svg>
  )
}
