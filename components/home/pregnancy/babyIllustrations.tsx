/**
 * BabyIllustration — per-week fruit/vegetable SVG.
 *
 * Each case returns the SVG children (inside a shared <Svg viewBox="0 0 200 200">)
 * for the given week. Ported 1:1 from pregnancy-weeks.html (wk-1 … wk-42).
 */

import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg'

const INK = '#141313'

interface Props {
  week: number
  size: number
  /** Render the character overlay (eyes, smile, blush, arms, legs). Defaults true. */
  character?: boolean
}

export function BabyIllustration({ week, size, character = true }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      {weekSvg(week)}
      {character ? characterOverlay(size) : null}
    </Svg>
  )
}

/**
 * Character overlay — scales features by the rendered SVG size.
 * Mirrors the IIFE at the bottom of pregnancy-weeks.html.
 *   tiny  (≤80px)  → just eyes
 *   small (81–140) → eyes + smile
 *   mid   (141–220) → full face + arms
 *   big   (221+)    → full face + arms + legs
 */
function characterOverlay(size: number) {
  const tier: 'tiny' | 'small' | 'mid' | 'big' =
    size <= 80 ? 'tiny' : size <= 140 ? 'small' : size <= 220 ? 'mid' : 'big'

  const cx = 100
  const cy = { tiny: 100, small: 105, mid: 108, big: 112 }[tier]
  const eyeSpread = { tiny: 7, small: 12, mid: 15, big: 19 }[tier]
  const eyeR = { tiny: 2.6, small: 4, mid: 5, big: 6 }[tier]
  const eyeY = cy - { tiny: 2, small: 4, mid: 6, big: 9 }[tier]

  const showSmile = tier !== 'tiny'
  const showHighlight = tier !== 'tiny'
  const showBlush = tier === 'mid' || tier === 'big'
  const showArms = tier === 'mid' || tier === 'big'
  const showLegs = tier === 'big'

  const hr = eyeR * 0.38

  // Smile geometry
  const smileY =
    tier === 'small' ? eyeY + 7 : tier === 'mid' ? eyeY + 11 : eyeY + 15
  const smileW = tier === 'small' ? 6 : tier === 'mid' ? 10 : 14
  const smileD = tier === 'small' ? 2.5 : tier === 'mid' ? 4.5 : 6

  // Blush
  const blushY = eyeY + 4
  const blushSpread = eyeSpread + (tier === 'mid' ? 11 : 14)
  const blushR = tier === 'mid' ? 4.5 : 6

  // Arms
  const armY = cy + (tier === 'mid' ? 18 : 22)
  const armReach = tier === 'mid' ? 42 : 56
  const handR = tier === 'mid' ? 4.5 : 5.5
  const armSw = tier === 'mid' ? 3 : 3.5

  // Legs
  const legTopY = cy + 52
  const legSpread = 22
  const footY = legTopY + 20
  const legSw = 3.5

  return (
    <G>
      {/* Eyes */}
      <Circle cx={cx - eyeSpread} cy={eyeY} r={eyeR} fill={INK} />
      <Circle cx={cx + eyeSpread} cy={eyeY} r={eyeR} fill={INK} />

      {/* Eye highlights */}
      {showHighlight && (
        <>
          <Circle cx={cx - eyeSpread - hr * 0.7} cy={eyeY - hr * 0.7} r={hr} fill="#FFFEF8" />
          <Circle cx={cx + eyeSpread - hr * 0.7} cy={eyeY - hr * 0.7} r={hr} fill="#FFFEF8" />
        </>
      )}

      {/* Smile */}
      {showSmile && (
        <Path
          d={`M ${cx - smileW} ${smileY} Q ${cx} ${smileY + smileD} ${cx + smileW} ${smileY}`}
          stroke={INK}
          strokeWidth={tier === 'big' ? 3 : 2.5}
          fill="none"
          strokeLinecap="round"
        />
      )}

      {/* Blush cheeks */}
      {showBlush && (
        <>
          <Ellipse
            cx={cx - blushSpread}
            cy={blushY}
            rx={blushR}
            ry={blushR * 0.75}
            fill="#F29082"
            opacity={0.6}
          />
          <Ellipse
            cx={cx + blushSpread}
            cy={blushY}
            rx={blushR}
            ry={blushR * 0.75}
            fill="#F29082"
            opacity={0.6}
          />
        </>
      )}

      {/* Arms */}
      {showArms && (
        <>
          <Path
            d={`M ${cx - armReach + 6} ${armY} Q ${cx - armReach - 6} ${armY - 10} ${cx - armReach - 14} ${armY - 22}`}
            stroke={INK}
            strokeWidth={armSw}
            fill="none"
            strokeLinecap="round"
          />
          <Circle
            cx={cx - armReach - 14}
            cy={armY - 22}
            r={handR}
            fill="#FFFEF8"
            stroke={INK}
            strokeWidth={armSw - 0.5}
          />
          <Path
            d={`M ${cx + armReach - 6} ${armY} Q ${cx + armReach + 8} ${armY + 10} ${cx + armReach + 16} ${armY + 20}`}
            stroke={INK}
            strokeWidth={armSw}
            fill="none"
            strokeLinecap="round"
          />
          <Circle
            cx={cx + armReach + 16}
            cy={armY + 20}
            r={handR}
            fill="#FFFEF8"
            stroke={INK}
            strokeWidth={armSw - 0.5}
          />
        </>
      )}

      {/* Legs */}
      {showLegs && (
        <>
          <Path
            d={`M ${cx - legSpread} ${legTopY} Q ${cx - legSpread - 5} ${legTopY + 14} ${cx - legSpread - 8} ${footY}`}
            stroke={INK}
            strokeWidth={legSw}
            fill="none"
            strokeLinecap="round"
          />
          <Ellipse cx={cx - legSpread - 12} cy={footY + 2} rx={8} ry={4} fill={INK} />
          <Path
            d={`M ${cx + legSpread} ${legTopY} Q ${cx + legSpread + 5} ${legTopY + 14} ${cx + legSpread + 8} ${footY}`}
            stroke={INK}
            strokeWidth={legSw}
            fill="none"
            strokeLinecap="round"
          />
          <Ellipse cx={cx + legSpread + 12} cy={footY + 2} rx={8} ry={4} fill={INK} />
        </>
      )}
    </G>
  )
}

function weekSvg(week: number) {
  switch (week) {
    case 1:
      return (
        <>
          <Ellipse cx={100} cy={100} rx={28} ry={22} fill="#E8D4A8" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Circle cx={88} cy={92} r={5} fill="#FFFEF8" opacity={0.65} />
        </>
      )
    case 2:
      return (
        <>
          <Circle cx={100} cy={100} r={34} fill="#2A2624" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Circle cx={86} cy={86} r={10} fill="#FFFEF8" opacity={0.7} />
        </>
      )
    case 3:
      return (
        <>
          <Circle cx={100} cy={100} r={40} fill="#F5B896" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Circle cx={85} cy={85} r={12} fill="#FFFEF8" opacity={0.8} />
        </>
      )
    case 4:
      return (
        <>
          <Ellipse cx={100} cy={100} rx={52} ry={34} fill="#F5E6B8" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Path d="M48 100 Q100 88 152 100" stroke={INK} strokeWidth={3} fill="none" />
          <Circle cx={78} cy={90} r={8} fill="#FFFEF8" opacity={0.55} />
        </>
      )
    case 5:
      return (
        <>
          <Path d="M100 38 Q150 100 100 162 Q50 100 100 38 Z" fill="#6B4423" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Ellipse cx={86} cy={84} rx={10} ry={18} fill="#FFFEF8" opacity={0.4} />
        </>
      )
    case 6:
      return (
        <>
          <Ellipse cx={100} cy={112} rx={56} ry={44} fill="#BDD48C" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Path d="M48 112 Q100 100 152 112" stroke={INK} strokeWidth={3} fill="none" opacity={0.5} />
          <Path d="M70 62 Q92 74 96 96" stroke={INK} strokeWidth={4} fill="none" strokeLinecap="round" />
          <Ellipse cx={70} cy={58} rx={10} ry={6} fill="#9FB87A" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        </>
      )
    case 7:
      return (
        <>
          <Circle cx={100} cy={112} r={60} fill="#7B9DD4" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Path d="M82 56 L92 40 L100 52 L108 40 L118 56" stroke={INK} strokeWidth={4} fill="none" strokeLinecap="round" />
          <Ellipse cx={76} cy={90} rx={12} ry={18} fill="#FFFEF8" opacity={0.45} />
        </>
      )
    case 8:
      return (
        <>
          <Circle cx={72} cy={112} r={28} fill="#D44B74" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <Circle cx={128} cy={112} r={28} fill="#D44B74" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <Circle cx={100} cy={82} r={28} fill="#D44B74" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <Circle cx={116} cy={134} r={24} fill="#D44B74" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <Circle cx={84} cy={134} r={24} fill="#D44B74" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <Path d="M96 52 L100 32 L104 52" stroke={INK} strokeWidth={4} fill="none" strokeLinecap="round" />
        </>
      )
    case 9:
      return (
        <>
          <Circle cx={100} cy={122} r={56} fill="#D94A3E" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Path d="M100 72 Q96 46 120 30" stroke="#6B4423" strokeWidth={5} fill="none" strokeLinecap="round" />
          <Path d="M120 30 Q142 24 146 46" fill="#9FB87A" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <Ellipse cx={80} cy={104} rx={12} ry={18} fill="#FFFEF8" opacity={0.45} />
        </>
      )
    case 10:
      return (
        <>
          <Path d="M54 84 Q100 44 146 84 Q158 138 100 172 Q42 138 54 84 Z" fill="#E65A6A" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Path d="M78 62 L100 40 L122 62 L100 68 Z" fill="#9FB87A" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <Circle cx={82} cy={104} r={3} fill={INK} />
          <Circle cx={108} cy={96} r={3} fill={INK} />
          <Circle cx={96} cy={124} r={3} fill={INK} />
          <Circle cx={118} cy={120} r={3} fill={INK} />
          <Circle cx={72} cy={128} r={3} fill={INK} />
        </>
      )
    case 11:
      return (
        <>
          <Circle cx={100} cy={106} r={58} fill="#A9CE3E" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Ellipse cx={82} cy={84} rx={12} ry={20} fill="#FFFEF8" opacity={0.4} />
          <Path d="M100 46 L100 32" stroke={INK} strokeWidth={4} strokeLinecap="round" />
          <Path d="M100 32 L114 20" stroke="#7FA02B" strokeWidth={4} strokeLinecap="round" />
          <Ellipse cx={118} cy={22} rx={10} ry={5} fill="#7FA02B" stroke={INK} strokeWidth={3} strokeLinejoin="round" transform="rotate(-30 118 22)" />
        </>
      )
    case 12:
      return (
        <>
          <Ellipse cx={100} cy={108} rx={56} ry={60} fill="#7E3F88" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Path d="M74 64 Q100 78 126 64" stroke={INK} strokeWidth={2.5} fill="none" opacity={0.5} />
          <Ellipse cx={82} cy={88} rx={10} ry={18} fill="#FFFEF8" opacity={0.35} />
          <Path d="M100 46 L100 28" stroke="#4A2152" strokeWidth={4} strokeLinecap="round" />
          <Path d="M100 28 Q116 24 122 36" fill="#9FB87A" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        </>
      )
    case 13:
      return (
        <>
          <Path d="M54 114 Q42 60 100 48 Q158 60 146 114 Q146 164 100 172 Q54 164 54 114 Z" fill="#F5B896" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Ellipse cx={78} cy={96} rx={12} ry={18} fill="#FFFEF8" opacity={0.4} />
          <Circle cx={112} cy={112} r={7} fill="#E65A6A" opacity={0.45} />
          <Circle cx={86} cy={132} r={5} fill="#E65A6A" opacity={0.45} />
          <Path d="M100 46 L100 28" stroke="#6B4423" strokeWidth={4} strokeLinecap="round" />
          <Ellipse cx={94} cy={24} rx={12} ry={5} fill="#9FB87A" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        </>
      )
    case 14:
      return (
        <>
          <Ellipse cx={100} cy={106} rx={48} ry={66} fill="#F0CE4C" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Path d="M100 40 Q112 32 118 44" stroke={INK} strokeWidth={3} fill="none" />
          <Ellipse cx={100} cy={172} rx={7} ry={5} fill={INK} opacity={0.6} />
          <Ellipse cx={84} cy={88} rx={10} ry={20} fill="#FFFEF8" opacity={0.4} />
        </>
      )
    case 15:
      return (
        <>
          <Path d="M50 86 Q52 48 96 54 Q104 42 112 54 Q148 48 150 94 Q146 148 104 162 Q56 148 50 86 Z" fill="#D94A3E" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Path d="M100 52 L100 32" stroke="#6B4423" strokeWidth={4} strokeLinecap="round" />
          <Path d="M100 32 Q120 22 132 34" fill="#9FB87A" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <Ellipse cx={78} cy={90} rx={12} ry={22} fill="#FFFEF8" opacity={0.45} />
        </>
      )
    case 16:
      return (
        <>
          <Path d="M100 32 Q148 38 156 96 Q156 146 100 170 Q44 146 44 96 Q52 38 100 32 Z" fill="#9FB87A" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Circle cx={100} cy={128} r={22} fill="#6B4423" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <Circle cx={92} cy={120} r={5} fill="#9F7A4B" opacity={0.6} />
          <Ellipse cx={72} cy={84} rx={10} ry={20} fill="#FFFEF8" opacity={0.35} />
          <Path d="M100 30 L106 16" stroke={INK} strokeWidth={4} strokeLinecap="round" />
        </>
      )
    case 17:
      return (
        <>
          <Path d="M100 34 Q140 40 148 112 Q144 160 100 172 Q56 160 52 112 Q60 40 100 34 Z" fill="#BDD48C" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Path d="M100 32 L100 16" stroke="#6B4423" strokeWidth={4} strokeLinecap="round" />
          <Ellipse cx={128} cy={16} rx={16} ry={6} fill="#7FA02B" stroke={INK} strokeWidth={3} strokeLinejoin="round" transform="rotate(20 128 16)" />
          <Ellipse cx={80} cy={94} rx={12} ry={22} fill="#FFFEF8" opacity={0.4} />
        </>
      )
    case 18:
      return (
        <>
          <Path d="M54 50 Q100 38 146 50 Q168 108 144 162 Q120 172 100 162 Q80 172 56 162 Q32 108 54 50 Z" fill="#D94A3E" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Path d="M100 44 L92 28 L108 32 L100 20" stroke="#4A8B2A" strokeWidth={4} fill="none" strokeLinecap="round" />
          <Ellipse cx={72} cy={100} rx={10} ry={24} fill="#FFFEF8" opacity={0.4} />
          <Path d="M86 50 Q100 54 114 50" stroke={INK} strokeWidth={2} fill="none" opacity={0.3} />
        </>
      )
    case 19:
      return (
        <>
          <Path d="M56 80 Q52 34 104 30 Q150 38 148 100 Q154 146 112 162 Q58 154 56 80 Z" fill="#F09930" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Path d="M104 32 L114 14" stroke="#6B4423" strokeWidth={4} strokeLinecap="round" />
          <Path d="M114 14 Q130 10 134 22" fill="#9FB87A" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <Ellipse cx={82} cy={86} rx={10} ry={22} fill="#F5D652" opacity={0.5} />
        </>
      )
    case 20:
      return (
        <>
          <Path d="M24 62 Q34 42 58 52 Q112 64 158 132 Q166 156 140 158 Q86 144 40 80 Q18 72 24 62 Z" fill="#F0CE4C" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Path d="M38 72 Q68 72 98 90 Q132 114 152 144" stroke={INK} strokeWidth={2} fill="none" opacity={0.3} />
          <Path d="M22 58 L12 46" stroke="#6B4423" strokeWidth={5} strokeLinecap="round" />
          <Ellipse cx={20} cy={52} rx={7} ry={4} fill="#3A2818" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        </>
      )
    case 21:
      return (
        <>
          <Path d="M80 36 Q100 30 120 36 L130 170 Q100 184 70 170 Z" fill="#F09930" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Path d="M80 50 L120 50 M78 76 L122 76 M78 102 L122 102 M78 128 L122 128 M78 154 L122 154" stroke={INK} strokeWidth={2} opacity={0.3} />
          <Path d="M100 30 L86 2 L94 22 L100 0 L106 22 L114 2 Z" fill="#7FA02B" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        </>
      )
    case 22:
      return (
        <>
          <Ellipse cx={100} cy={110} rx={64} ry={66} fill="#F09930" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Path d="M36 108 Q36 36 100 38 Q164 36 164 108 Q138 114 100 112 Q62 114 36 108 Z" fill="#E65A6A" stroke={INK} strokeWidth={3} strokeLinejoin="round" opacity={0.85} />
          <Circle cx={72} cy={82} r={4} fill={INK} />
          <Circle cx={90} cy={76} r={4} fill={INK} />
          <Circle cx={110} cy={78} r={4} fill={INK} />
          <Circle cx={124} cy={90} r={4} fill={INK} />
          <Circle cx={80} cy={98} r={4} fill={INK} />
          <Circle cx={108} cy={96} r={4} fill={INK} />
          <Path d="M100 36 L100 18" stroke="#4A2818" strokeWidth={4} strokeLinecap="round" />
        </>
      )
    case 23:
      return (
        <>
          <Circle cx={100} cy={108} r={64} fill="#F5B28A" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Path d="M42 108 L158 108 M100 44 L100 172 M62 58 L138 158 M62 158 L138 58" stroke="#D94A3E" strokeWidth={2} opacity={0.45} />
          <Circle cx={100} cy={108} r={12} fill="#D94A3E" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <Ellipse cx={70} cy={76} rx={10} ry={18} fill="#FFFEF8" opacity={0.4} />
        </>
      )
    case 24:
      return (
        <>
          <Path d="M74 56 Q52 86 58 158 Q70 162 80 130 Q82 94 84 66 Z" fill="#9FB87A" stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
          <Path d="M72 72 Q66 116 74 150" stroke="#6E8A44" strokeWidth={1.8} fill="none" opacity={0.55} strokeLinecap="round" />
          <Path d="M126 56 Q148 86 142 158 Q130 162 120 130 Q118 94 116 66 Z" fill="#9FB87A" stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
          <Path d="M128 72 Q134 116 126 150" stroke="#6E8A44" strokeWidth={1.8} fill="none" opacity={0.55} strokeLinecap="round" />
          <Ellipse cx={100} cy={112} rx={26} ry={58} fill="#F5D652" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <G fill="#E8B830" opacity={0.78}>
            <Circle cx={88} cy={70} r={3} />
            <Circle cx={96} cy={66} r={3} />
            <Circle cx={104} cy={66} r={3} />
            <Circle cx={112} cy={70} r={3} />
            <Circle cx={84} cy={82} r={3} />
            <Circle cx={92} cy={80} r={3} />
            <Circle cx={108} cy={80} r={3} />
            <Circle cx={116} cy={82} r={3} />
            <Circle cx={82} cy={94} r={3} />
            <Circle cx={118} cy={94} r={3} />
            <Circle cx={82} cy={142} r={3} />
            <Circle cx={92} cy={146} r={3} />
            <Circle cx={108} cy={146} r={3} />
            <Circle cx={118} cy={142} r={3} />
            <Circle cx={84} cy={156} r={3} />
            <Circle cx={100} cy={160} r={3} />
            <Circle cx={116} cy={156} r={3} />
          </G>
          <Path d="M92 56 Q88 42 82 30" stroke="#E8B04E" strokeWidth={2.2} fill="none" strokeLinecap="round" />
          <Path d="M100 54 Q100 38 98 24" stroke="#E8B04E" strokeWidth={2.2} fill="none" strokeLinecap="round" />
          <Path d="M108 56 Q112 42 118 30" stroke="#E8B04E" strokeWidth={2.2} fill="none" strokeLinecap="round" />
        </>
      )
    case 25:
      return (
        <>
          <Path d="M56 98 Q52 156 100 166 Q148 156 144 98 Q132 48 100 50 Q68 48 56 98 Z" fill="#C8A1C8" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Path d="M56 98 Q100 88 144 98" stroke={INK} strokeWidth={2} fill="none" opacity={0.3} />
          <Path d="M100 46 Q92 26 102 16 Q112 26 104 46" fill="#7FA02B" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <Ellipse cx={78} cy={108} rx={10} ry={18} fill="#FFFEF8" opacity={0.35} />
        </>
      )
    case 26:
      return (
        <>
          <Circle cx={100} cy={108} r={68} fill="#BDD48C" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Path d="M100 40 Q72 66 60 112 Q76 164 100 172" stroke={INK} strokeWidth={3} fill="none" opacity={0.4} />
          <Path d="M100 40 Q130 66 142 114 Q132 164 100 172" stroke={INK} strokeWidth={3} fill="none" opacity={0.4} />
          <Path d="M32 104 Q100 92 168 104" stroke={INK} strokeWidth={2} fill="none" opacity={0.3} />
          <Path d="M100 108 Q74 84 100 40 Q126 84 100 108 Z" fill="#A0C068" opacity={0.5} />
        </>
      )
    case 27:
      return (
        <>
          <Circle cx={62} cy={92} r={26} fill="#FFFEF8" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <Circle cx={100} cy={70} r={28} fill="#FFFEF8" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <Circle cx={138} cy={92} r={26} fill="#FFFEF8" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <Circle cx={78} cy={128} r={24} fill="#FFFEF8" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <Circle cx={122} cy={128} r={24} fill="#FFFEF8" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <Circle cx={100} cy={104} r={26} fill="#FFFEF8" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <Path d="M34 136 Q100 152 166 136 L162 172 L38 172 Z" fill="#9FB87A" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        </>
      )
    case 28:
      return (
        <>
          <Path d="M100 30 Q160 36 152 112 Q142 168 100 174 Q58 168 48 112 Q40 36 100 30 Z" fill="#6B4788" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Path d="M94 30 L92 10 L82 4" stroke="#4A8B2A" strokeWidth={5} fill="none" strokeLinecap="round" />
          <Path d="M102 32 L118 12" stroke="#4A8B2A" strokeWidth={5} strokeLinecap="round" />
          <Ellipse cx={72} cy={80} rx={10} ry={26} fill="#FFFEF8" opacity={0.3} />
        </>
      )
    case 29:
      return (
        <>
          <Path d="M86 28 Q114 24 116 50 L128 158 Q100 186 72 158 L76 74 Q76 36 86 28 Z" fill="#D4A04A" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Path d="M94 26 L96 8" stroke="#4A2818" strokeWidth={5} strokeLinecap="round" />
          <Path d="M78 80 Q98 84 120 80" stroke={INK} strokeWidth={2} fill="none" opacity={0.35} />
          <Ellipse cx={84} cy={100} rx={8} ry={22} fill="#FFFEF8" opacity={0.3} />
        </>
      )
    case 30:
      return (
        <>
          <Circle cx={100} cy={110} r={68} fill="#A9CE3E" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Path d="M74 54 Q100 40 126 54" stroke={INK} strokeWidth={3} fill="none" opacity={0.5} />
          <Path d="M48 82 Q100 68 152 82" stroke={INK} strokeWidth={3} fill="none" opacity={0.4} />
          <Path d="M42 114 Q100 98 158 114" stroke={INK} strokeWidth={3} fill="none" opacity={0.35} />
          <Path d="M48 144 Q100 130 152 144" stroke={INK} strokeWidth={3} fill="none" opacity={0.3} />
          <Ellipse cx={80} cy={88} rx={12} ry={20} fill="#FFFEF8" opacity={0.35} />
        </>
      )
    case 31:
      return (
        <>
          <Circle cx={100} cy={106} r={62} fill="#6B4423" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Path d="M38 106 Q100 142 162 106" stroke="#3A2818" strokeWidth={3} fill="none" opacity={0.5} />
          <Circle cx={80} cy={90} r={6} fill={INK} />
          <Circle cx={120} cy={90} r={6} fill={INK} />
          <Ellipse cx={100} cy={114} rx={9} ry={6} fill={INK} />
          <Path d="M100 46 Q96 24 108 16 Q118 26 112 46" fill="#4A8B2A" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        </>
      )
    case 32:
      return (
        <>
          <Circle cx={100} cy={110} r={64} fill="#E8D9B8" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Path d="M100 50 Q70 84 70 130" stroke={INK} strokeWidth={2} fill="none" opacity={0.3} />
          <Path d="M100 50 Q130 84 130 130" stroke={INK} strokeWidth={2} fill="none" opacity={0.3} />
          <Ellipse cx={80} cy={86} rx={10} ry={18} fill="#FFFEF8" opacity={0.5} />
          <Path d="M96 48 L100 22 L110 20" stroke="#4A2818" strokeWidth={4} fill="none" strokeLinecap="round" />
        </>
      )
    case 33:
      return (
        <>
          <Ellipse cx={100} cy={122} rx={54} ry={58} fill="#F5C24A" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Path d="M58 92 L142 92 M52 122 L148 122 M58 152 L142 152" stroke="#B88828" strokeWidth={2.5} />
          <Path d="M60 104 L140 138 M60 138 L140 104" stroke="#B88828" strokeWidth={2.5} />
          <Path d="M84 66 L74 32 L92 56 L86 24 L100 52 L108 22 L112 56 L128 32 L118 66 Z" fill="#4A8B2A" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        </>
      )
    case 34:
      return (
        <>
          <Circle cx={100} cy={108} r={66} fill="#F0B060" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Path d="M38 108 Q100 82 162 108 M42 128 Q100 110 158 128 M52 82 Q100 60 148 82 Q100 156 52 138" stroke={INK} strokeWidth={2} fill="none" opacity={0.4} />
          <Path d="M96 46 L92 28 M100 46 L108 28" stroke="#4A2818" strokeWidth={4} strokeLinecap="round" />
        </>
      )
    case 35:
      return (
        <>
          <Circle cx={100} cy={108} r={68} fill="#D8E6B0" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Circle cx={78} cy={84} r={12} fill="#FFFEF8" opacity={0.55} />
          <Circle cx={90} cy={104} r={6} fill="#B88828" opacity={0.25} />
          <Circle cx={120} cy={92} r={6} fill="#B88828" opacity={0.25} />
          <Circle cx={112} cy={128} r={6} fill="#B88828" opacity={0.25} />
          <Circle cx={82} cy={132} r={4} fill="#B88828" opacity={0.25} />
          <Path d="M100 42 L106 22" stroke="#4A2818" strokeWidth={4} strokeLinecap="round" />
        </>
      )
    case 36:
      return (
        <>
          <Path d="M100 20 L106 48 L124 32 L118 58 L148 60 L122 78 L148 102 L118 102 L124 128 L106 110 L100 140 L94 110 L76 128 L82 102 L52 102 L78 78 L52 60 L82 58 L76 32 L94 48 Z" fill="#7FA02B" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Ellipse cx={100} cy={166} rx={28} ry={10} fill="#9FB87A" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        </>
      )
    case 37:
      return (
        <>
          <Path d="M82 16 L88 174" stroke="#E65A6A" strokeWidth={8} strokeLinecap="round" />
          <Path d="M118 16 L112 174" stroke="#F5D652" strokeWidth={8} strokeLinecap="round" />
          <Path d="M100 14 L100 176" stroke="#D94A3E" strokeWidth={8} strokeLinecap="round" />
          <Path d="M82 34 Q54 70 66 110 L82 50 Z" fill="#BDD48C" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <Path d="M118 34 Q146 70 134 110 L118 50 Z" fill="#9FB87A" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <Path d="M100 34 Q72 80 90 124 L100 50 Z" fill="#7FA02B" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        </>
      )
    case 38:
      return (
        <>
          <Ellipse cx={100} cy={158} rx={30} ry={18} fill="#FFFEF8" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Rect x={80} y={84} width={40} height={80} fill="#FFFEF8" stroke={INK} strokeWidth={4} strokeLinejoin="round" rx={5} />
          <Path d="M80 84 Q62 42 74 14 Q86 8 94 22" fill="#A9CE3E" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <Path d="M120 84 Q138 42 126 14 Q114 8 106 22" fill="#7FA02B" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <Path d="M100 84 Q100 38 106 14" fill="#BDD48C" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        </>
      )
    case 39:
      return (
        <>
          <Path d="M28 114 Q28 60 100 50 Q172 60 172 114 Q172 170 100 180 Q28 170 28 114 Z" fill="#4A8B2A" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Path d="M42 112 Q100 92 158 112 Q160 162 100 172 Q40 162 42 112 Z" fill="#E65A6A" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <Circle cx={78} cy={126} r={4} fill={INK} />
          <Circle cx={100} cy={116} r={4} fill={INK} />
          <Circle cx={122} cy={126} r={4} fill={INK} />
          <Circle cx={90} cy={142} r={4} fill={INK} />
          <Circle cx={112} cy={142} r={4} fill={INK} />
          <Path d="M42 96 L50 80 M158 96 L150 80" stroke={INK} strokeWidth={2.5} opacity={0.4} />
        </>
      )
    case 40:
      return (
        <>
          <Path d="M24 112 Q24 56 100 52 Q176 56 176 112 Q176 172 100 180 Q24 172 24 112 Z" fill="#F09930" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Path d="M58 62 Q70 152 58 172 M100 50 Q100 152 100 180 M142 62 Q130 152 142 172" stroke="#C06818" strokeWidth={4} fill="none" />
          <Path d="M94 50 L94 28 L108 22 Q114 30 106 50" fill="#4A8B2A" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <Ellipse cx={100} cy={176} rx={42} ry={8} fill={INK} opacity={0.12} />
        </>
      )
    case 41:
      return (
        <>
          <Ellipse cx={100} cy={112} rx={78} ry={68} fill="#8FB04E" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Circle cx={58} cy={80} r={5} fill="#5E7E28" stroke={INK} strokeWidth={1.5} />
          <Circle cx={88} cy={62} r={5} fill="#5E7E28" stroke={INK} strokeWidth={1.5} />
          <Circle cx={118} cy={68} r={5} fill="#5E7E28" stroke={INK} strokeWidth={1.5} />
          <Circle cx={148} cy={88} r={5} fill="#5E7E28" stroke={INK} strokeWidth={1.5} />
          <Circle cx={48} cy={110} r={5} fill="#5E7E28" stroke={INK} strokeWidth={1.5} />
          <Circle cx={78} cy={100} r={5} fill="#5E7E28" stroke={INK} strokeWidth={1.5} />
          <Circle cx={108} cy={108} r={5} fill="#5E7E28" stroke={INK} strokeWidth={1.5} />
          <Circle cx={138} cy={118} r={5} fill="#5E7E28" stroke={INK} strokeWidth={1.5} />
          <Circle cx={158} cy={128} r={5} fill="#5E7E28" stroke={INK} strokeWidth={1.5} />
          <Circle cx={60} cy={140} r={5} fill="#5E7E28" stroke={INK} strokeWidth={1.5} />
          <Circle cx={96} cy={150} r={5} fill="#5E7E28" stroke={INK} strokeWidth={1.5} />
          <Circle cx={128} cy={148} r={5} fill="#5E7E28" stroke={INK} strokeWidth={1.5} />
          <Circle cx={90} cy={130} r={5} fill="#5E7E28" stroke={INK} strokeWidth={1.5} />
          <Circle cx={126} cy={95} r={5} fill="#5E7E28" stroke={INK} strokeWidth={1.5} />
          <Path d="M100 44 L100 28" stroke="#6B4423" strokeWidth={5} strokeLinecap="round" />
          <Ellipse cx={100} cy={178} rx={52} ry={7} fill={INK} opacity={0.18} />
        </>
      )
    case 42:
      return (
        <>
          <Ellipse cx={100} cy={114} rx={80} ry={64} fill="#D6E4A3" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Path d="M42 102 Q62 88 82 94" stroke="#A8BF68" strokeWidth={3} fill="none" strokeLinecap="round" />
          <Path d="M102 72 Q122 80 138 74" stroke="#A8BF68" strokeWidth={3} fill="none" strokeLinecap="round" />
          <Path d="M156 106 Q172 114 166 132" stroke="#A8BF68" strokeWidth={3} fill="none" strokeLinecap="round" />
          <Path d="M56 142 Q76 156 100 148" stroke="#A8BF68" strokeWidth={3} fill="none" strokeLinecap="round" />
          <Path d="M112 156 Q132 162 150 154" stroke="#A8BF68" strokeWidth={3} fill="none" strokeLinecap="round" />
          <Path d="M66 118 Q92 108 116 118" stroke="#A8BF68" strokeWidth={3} fill="none" strokeLinecap="round" />
          <Ellipse cx={78} cy={90} rx={16} ry={22} fill="#FFFEF8" opacity={0.55} />
          <Path d="M100 52 L106 36" stroke="#6B4423" strokeWidth={4} strokeLinecap="round" />
          <Ellipse cx={110} cy={34} rx={7} ry={3.5} fill="#9FB87A" stroke={INK} strokeWidth={2.5} transform="rotate(-15 110 34)" />
          <Ellipse cx={100} cy={180} rx={58} ry={7} fill={INK} opacity={0.14} />
        </>
      )
    default:
      // Fallback for weeks 41-42 or out of range — pumpkin
      return (
        <>
          <Path d="M24 112 Q24 56 100 52 Q176 56 176 112 Q176 172 100 180 Q24 172 24 112 Z" fill="#F09930" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Path d="M58 62 Q70 152 58 172 M100 50 Q100 152 100 180 M142 62 Q130 152 142 172" stroke="#C06818" strokeWidth={4} fill="none" />
          <Path d="M94 50 L94 28 L108 22 Q114 30 106 50" fill="#4A8B2A" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        </>
      )
  }
}
