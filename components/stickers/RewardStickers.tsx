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
