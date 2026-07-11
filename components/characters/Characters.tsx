/**
 * Characters — the app-wide "character-blob" glyph family.
 *
 * One family of friendly organic blob creatures (flat hue fill + dot eyes, a few
 * with a tiny expression). Each CONCEPT collapses many legacy stickers/icons —
 * e.g. `sleep` covers Moon / Sleepy / LogSleep / LogNap. Rendered via a single
 * <Character name=... /> with an optional colour override; a resolver maps
 * legacy sticker/icon names → a concept so call sites migrate cleanly.
 *
 * ILLUSTRATION ASSET FILE — raw hex in SVG path/eye/face strings is allowed per
 * DESIGN_SYSTEM.md §0. Consumers pass a `color` (the hue) or accept the default.
 */

import Svg, { Path, Circle } from 'react-native-svg'

export type CharacterName =
  // pillars & metrics
  | 'nutrition' | 'sleep' | 'mood' | 'health' | 'growth' | 'activity'
  | 'water' | 'calories' | 'temperature'
  // feeding & infant care
  | 'feeding' | 'milk' | 'diaper' | 'potty' | 'bath' | 'baby'
  // health & medical
  | 'medicine' | 'vaccine' | 'heartbeat' | 'checkup' | 'exam'
  // cycle & pregnancy
  | 'period' | 'ovulation' | 'kick' | 'contraction' | 'ultrasound'
  // symbolic & affective
  | 'star' | 'sparkle' | 'sun' | 'night' | 'heart' | 'streak' | 'crown' | 'gem'
  // wellness · relationship · misc
  | 'soothe' | 'hug' | 'community' | 'note' | 'photo' | 'bell'

// Default hue per concept (deepened sticker palette). Overridable via `color`.
const HUE: Record<CharacterName, string> = {
  nutrition: '#7A9D4A', sleep: '#8E72C9', mood: '#D87CA0', health: '#5F8FC1',
  growth: '#C9A02C', activity: '#D86A4F', water: '#5F8FC1', calories: '#D86A4F', temperature: '#D87CA0',
  feeding: '#7A9D4A', milk: '#7FA8D8', diaper: '#7FA8D8', potty: '#E08A5A', bath: '#7FA8D8', baby: '#D98CA6',
  medicine: '#D86A4F', vaccine: '#5F8FC1', heartbeat: '#D86A4F', checkup: '#5F8FC1', exam: '#8E72C9',
  period: '#D86A4F', ovulation: '#E08A5A', kick: '#D87CA0', contraction: '#D86A4F', ultrasound: '#8E72C9',
  star: '#C9A02C', sparkle: '#C9A02C', sun: '#C9A02C', night: '#8E72C9', heart: '#D98CA6',
  streak: '#D86A4F', crown: '#C9A02C', gem: '#7FA8D8',
  soothe: '#8E72C9', hug: '#D98CA6', community: '#7A9D4A', note: '#E08A5A', photo: '#7FA8D8', bell: '#C9A02C',
}

// Blob silhouette (48×48) per concept, ported from the approved set.
const D: Record<CharacterName, string> = {
  nutrition: 'M24 44c-9 0-16-6-16-15 0-7 5-12 11-13-2-4-1-9 3-11 1-1 2 0 2 1 0 2-1 4 0 6 2-3 5-4 8-3 1 0 1 2 0 2-3 1-5 3-5 6 6 1 13 6 13 14 0 9-7 13-16 13Z',
  sleep: 'M32 4C18 4 8 13 8 25s10 21 24 20c2 0 2-2 0-3-8-3-14-9-14-18S24 9 32 6c2-1 2-2 0-2Z',
  mood: 'M24 43C11 34 6 26 6 18 6 11 11 7 16 7c4 0 7 3 8 6 1-3 4-6 8-6 5 0 10 4 10 11 0 8-5 16-18 25Z',
  health: 'M19 8c0-2 2-4 5-4s5 2 5 4v6h6c2 0 4 2 4 5s-2 5-4 5h-6v6c0 2-2 4-5 4s-5-2-5-4v-6H8c-2 0-4-2-4-5s2-5 4-5h11V8Z',
  growth: 'M24 4c1 0 2 1 3 3l3 7c1 1 2 2 3 2l8 1c3 0 4 3 2 5l-6 5c-1 1-1 2-1 3l2 8c1 3-2 4-4 3l-7-4c-1-1-2-1-3 0l-7 4c-2 1-5 0-4-3l2-8c0-1 0-2-1-3l-6-5c-2-2-1-5 2-5l8-1c1 0 2-1 3-2l3-7c1-2 2-3 3-3Z',
  activity: 'M24 3c1 0 2 1 2 3 1 4 2 6 5 5 3-2 5 0 4 3-1 3-1 5 2 6 3 1 3 4 0 5-3 1-3 3-2 6 1 3-1 5-4 3-3-1-4 1-5 5 0 2-1 3-2 3s-2-1-2-3c-1-4-2-6-5-5-3 2-5 0-4-3 1-3 1-5-2-6-3-1-3-4 0-5 3-1 3-3 2-6-1-3 1-5 4-3 3 1 4-1 5-5 0-2 1-3 2-3Z',
  water: 'M24 4c-2 6-14 16-14 26 0 8 6 14 14 14s14-6 14-14C38 20 26 10 24 4Z',
  calories: 'M24 4c-1 6-8 9-8 18 0 3 1 5 3 7-1-4 1-7 4-9-1 5 3 7 3 12 0 3-2 6-6 6 6 3 15-1 15-11 0-11-9-16-11-23Z',
  temperature: 'M24 6c-4 0-7 3-7 7v13c-3 2-5 5-5 9 0 7 5 11 12 11s12-4 12-11c0-4-2-7-5-9V13c0-4-3-7-7-7Z',
  feeding: 'M24 6c8 0 14 4 14 12 0 4-2 7-2 11 0 6-5 9-12 9s-12-3-12-9c0-4-2-7-2-11 0-8 6-12 14-12Z',
  milk: 'M18 4h12l-1 6c4 2 6 6 6 11v13c0 4-3 6-11 6s-11-2-11-6V21c0-5 2-9 6-11l-1-6Z',
  diaper: 'M8 16h32c0 12-6 22-16 22S8 28 8 16Z',
  potty: 'M12 18h24v6a10 10 0 0 1-20 0v-6ZM10 14h28v4H10Z',
  bath: 'M8 24h32v4a10 10 0 0 1-10 10H18A10 10 0 0 1 8 28v-4ZM14 24V12a4 4 0 0 1 8 0',
  baby: 'M24 6c9 0 15 6 15 15 0 6-3 11-8 14-2 1-4 2-7 2s-5-1-7-2c-5-3-8-8-8-14C9 12 15 6 24 6Z',
  medicine: 'M14 10a10 10 0 0 1 14 0l10 10a10 10 0 0 1-14 14L14 24a10 10 0 0 1 0-14Z',
  vaccine: 'M28 6l14 14-4 4-3-3-14 14-6 2-3-3 2-6L28 8l-3-3 3-2ZM10 34l4 4',
  heartbeat: 'M24 43C11 34 6 26 6 18 6 11 11 7 16 7c4 0 7 3 8 6 1-3 4-6 8-6 5 0 10 4 10 11 0 8-5 16-18 25Z',
  checkup: 'M20 6h8v6h6v8h-6v6h-8v-6h-6v-8h6V6Z',
  exam: 'M18 6h12v9l6 12c1 3-1 6-4 6H16c-3 0-5-3-4-6l6-12V6Z',
  period: 'M24 4c-3 8-16 18-16 28 0 8 7 12 16 12s16-4 16-12C40 22 27 12 24 4Z',
  ovulation: 'M24 6c11 0 18 7 18 18s-7 18-18 18S6 35 6 24 13 6 24 6Z',
  kick: 'M14 30c2-8 8-12 15-12 5 0 9 3 9 7 0 3-2 5-6 6l-6 2c-2 1-3 3-3 5 0 1-1 2-2 2-3 0-4-4-4-8 0-1 0-2 0-3l-3 3c-1 1-3 0-3-2 0-2 2-4 6-5Z',
  contraction: 'M24 8c9 0 16 7 16 16s-7 16-16 16S8 33 8 24 15 8 24 8Z',
  ultrasound: 'M10 24a14 14 0 0 1 28 0c0 4-3 6-3 9 0 3-4 5-11 5s-11-2-11-5c0-3-3-5-3-9Z',
  star: 'M24 4c1 0 2 1 3 3l3 7c1 1 2 2 3 2l8 1c3 0 4 3 2 5l-6 5c-1 1-1 2-1 3l2 8c1 3-2 4-4 3l-7-4c-1-1-2-1-3 0l-7 4c-2 1-5 0-4-3l2-8c0-1 0-2-1-3l-6-5c-2-2-1-5 2-5l8-1c1 0 2-1 3-2l3-7c1-2 2-3 3-3Z',
  sparkle: 'M24 3c1 0 2 1 2 3 1 4 2 6 5 5 3-2 5 0 4 3-1 3-1 5 2 6 3 1 3 4 0 5-3 1-3 3-2 6 1 3-1 5-4 3-3-1-4 1-5 5 0 2-1 3-2 3s-2-1-2-3c-1-4-2-6-5-5-3 2-5 0-4-3 1-3 1-5-2-6-3-1-3-4 0-5 3-1 3-3 2-6-1-3 1-5 4-3 3 1 4-1 5-5 0-2 1-3 2-3Z',
  sun: 'M24 12a12 12 0 1 1 0 24 12 12 0 0 1 0-24ZM24 3v4M24 41v4M8.5 8.5l3 3M36.5 36.5l3 3M3 24h4M41 24h4M8.5 39.5l3-3M36.5 11.5l3-3',
  night: 'M32 4C18 4 8 13 8 25s10 21 24 20c2 0 2-2 0-3-8-3-14-9-14-18S24 9 32 6c2-1 2-2 0-2Z',
  heart: 'M24 43C11 34 6 26 6 18 6 11 11 7 16 7c4 0 7 3 8 6 1-3 4-6 8-6 5 0 10 4 10 11 0 8-5 16-18 25Z',
  streak: 'M24 4c-1 7-9 10-9 19 0 7 5 12 12 12s12-5 12-13c0-4-2-6-4-9 0 3-1 5-3 6 1-6-4-10-4-16-1 1-3 1-4 1Z',
  crown: 'M6 34l4-20 8 8 6-12 6 12 8-8 4 20c0 3-2 4-8 4H14c-6 0-8-1-8-4Z',
  gem: 'M16 6h16l8 10-16 22L8 16 16 6Z',
  soothe: 'M24 10c6-6 18-4 18 6 0 6-6 12-18 20C12 28 6 22 6 16c0-10 12-12 18-6Z',
  hug: 'M12 20a8 8 0 0 1 16 0M20 20a8 8 0 0 1 16 0M8 26c0 8 7 14 16 14s16-6 16-14',
  community: 'M16 18a6 6 0 1 1 12 0M28 20a6 6 0 1 1 10 4M10 22a6 6 0 1 1 10-4M8 36c0-6 5-9 10-9M40 36c0-6-5-9-10-9M18 38c0-6 3-10 6-10s6 4 6 10',
  note: 'M12 8h20l6 6v26H12V8Z',
  photo: 'M8 14h6l3-4h14l3 4h6v24H8V14Z',
  bell: 'M24 6c-7 0-11 5-11 12 0 8-4 10-4 12h30c0-2-4-4-4-12 0-7-4-12-11-12ZM20 34a4 4 0 0 0 8 0',
}

// Eye/face type per concept. 'dots' default; a few get expression or a
// "face-as-content" line (heartbeat pulse, contraction wave).
type FaceKind = 'dots' | 'sleepy' | 'smile' | 'pulse' | 'wave' | 'target' | 'ring' | 'none'
const FACE: Record<CharacterName, { kind: FaceKind; e: [number, number, number, number] }> = {
  nutrition: { kind: 'dots', e: [19, 30, 29, 30] },
  sleep: { kind: 'sleepy', e: [17, 21, 25, 23] },
  mood: { kind: 'dots', e: [18, 19, 30, 19] },
  health: { kind: 'dots', e: [20, 25, 28, 25] },
  growth: { kind: 'dots', e: [21, 24, 27, 24] },
  activity: { kind: 'dots', e: [21, 22, 27, 22] },
  water: { kind: 'dots', e: [20, 28, 28, 28] },
  calories: { kind: 'dots', e: [21, 26, 27, 26] },
  temperature: { kind: 'dots', e: [20, 30, 28, 30] },
  feeding: { kind: 'dots', e: [20, 24, 28, 24] },
  milk: { kind: 'dots', e: [20, 26, 28, 26] },
  diaper: { kind: 'dots', e: [20, 25, 28, 25] },
  potty: { kind: 'dots', e: [20, 24, 28, 24] },
  bath: { kind: 'dots', e: [20, 29, 28, 29] },
  baby: { kind: 'dots', e: [19, 22, 29, 22] },
  medicine: { kind: 'dots', e: [19, 22, 29, 26] },
  vaccine: { kind: 'dots', e: [16, 30, 22, 30] },
  heartbeat: { kind: 'pulse', e: [0, 0, 0, 0] },
  checkup: { kind: 'smile', e: [17, 26, 25, 26] },
  exam: { kind: 'dots', e: [20, 28, 28, 28] },
  period: { kind: 'dots', e: [20, 30, 28, 30] },
  ovulation: { kind: 'target', e: [0, 0, 0, 0] },
  kick: { kind: 'dots', e: [24, 26, 31, 24] },
  contraction: { kind: 'wave', e: [0, 0, 0, 0] },
  ultrasound: { kind: 'dots', e: [19, 22, 29, 22] },
  star: { kind: 'dots', e: [21, 24, 27, 24] },
  sparkle: { kind: 'smile', e: [21, 22, 27, 22] },
  sun: { kind: 'smile', e: [19, 23, 25, 23] },
  night: { kind: 'dots', e: [18, 20, 26, 23] },
  heart: { kind: 'smile', e: [18, 19, 28, 19] },
  streak: { kind: 'dots', e: [22, 26, 28, 26] },
  crown: { kind: 'dots', e: [20, 26, 28, 26] },
  gem: { kind: 'dots', e: [20, 20, 28, 20] },
  soothe: { kind: 'dots', e: [18, 18, 30, 18] },
  hug: { kind: 'smile', e: [19, 24, 25, 24] },
  community: { kind: 'none', e: [0, 0, 0, 0] },
  note: { kind: 'dots', e: [20, 24, 28, 24] },
  photo: { kind: 'ring', e: [0, 0, 0, 0] },
  bell: { kind: 'dots', e: [20, 20, 28, 20] },
}

interface Props {
  name: CharacterName
  size?: number
  /** Blob fill; defaults to the concept's hue. */
  color?: string
  /** Dot/expression colour; a warm near-black that reads on every hue. */
  eye?: string
}

export function Character({ name, size = 24, color, eye = '#1A1916' }: Props) {
  const fill = color ?? HUE[name]
  const f = FACE[name]
  const [a, b, c, d] = f.e
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path d={D[name]} fill={fill} />
      {f.kind === 'dots' && (
        <>
          <Circle cx={a} cy={b} r={2.2} fill={eye} />
          <Circle cx={c} cy={d} r={2.2} fill={eye} />
        </>
      )}
      {f.kind === 'sleepy' && (
        <>
          <Path d={`M${a} ${b}q2.4 2.3 4.6 0`} stroke={eye} strokeWidth={1.7} fill="none" strokeLinecap="round" />
          <Path d={`M${c} ${d}q2.4 2.3 4.6 0`} stroke={eye} strokeWidth={1.7} fill="none" strokeLinecap="round" />
        </>
      )}
      {f.kind === 'smile' && (
        <>
          <Path d={`M${a} ${b}q2.4 2.6 4.8 0`} stroke={eye} strokeWidth={1.8} fill="none" strokeLinecap="round" />
          <Path d={`M${c} ${d}q2.4 2.6 4.8 0`} stroke={eye} strokeWidth={1.8} fill="none" strokeLinecap="round" />
        </>
      )}
      {f.kind === 'pulse' && (
        <Path d="M14 21h5l2-4 3 8 2-4h8" stroke={eye} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {f.kind === 'wave' && (
        <Path d="M14 24q5-8 10 0 5-8 10 0" stroke={eye} strokeWidth={1.8} fill="none" strokeLinecap="round" />
      )}
      {f.kind === 'target' && (
        <>
          <Circle cx={24} cy={24} r={5} fill="none" stroke={eye} strokeWidth={1.8} />
          <Circle cx={24} cy={24} r={1.6} fill={eye} />
        </>
      )}
      {f.kind === 'ring' && (
        <Circle cx={24} cy={26} r={7} fill="none" stroke={eye} strokeWidth={1.8} />
      )}
    </Svg>
  )
}

// ─── Concept resolver ───────────────────────────────────────────────────────
// Maps legacy sticker / lucide names (and log-type keys) → a Character concept,
// so call sites can migrate by name without hand-picking a blob each time.
const ALIAS: Record<string, CharacterName> = {
  // log / metric types
  Moon: 'sleep', Sleepy: 'sleep', LogSleep: 'sleep', LogNap: 'sleep', sleep: 'sleep',
  Smile: 'mood', MoodFace: 'mood', LogMood: 'mood', mood: 'mood',
  Utensils: 'nutrition', Apple: 'nutrition', Carrot: 'nutrition', LogNutrition: 'nutrition', LogFood: 'nutrition', nutrition: 'nutrition',
  Zap: 'activity', Bolt: 'activity', Activity: 'activity', LogExercise: 'activity', activity: 'activity',
  Cross: 'health', Stethoscope: 'checkup', Shield: 'health', health: 'health',
  TrendingUp: 'growth', Scale: 'growth', Ruler: 'growth', LogGrowth: 'growth', LogWeight: 'growth', growth: 'growth',
  Droplet: 'water', Drop: 'water', LogWater: 'water', water: 'water', Flame: 'calories', calories: 'calories',
  Thermometer: 'temperature', LogTemperature: 'temperature', LogFever: 'temperature', temperature: 'temperature',
  // feeding / care
  Milk: 'milk', Bottle: 'milk', LogFeeding: 'feeding', LogMilk: 'milk', feeding: 'feeding', milk: 'milk',
  Baby: 'baby', LogDiaper: 'diaper', Diaper: 'diaper', diaper: 'diaper', LogBath: 'bath', LogPotty: 'potty',
  // medical
  Pill: 'medicine', LogMedicine: 'medicine', medicine: 'medicine',
  Syringe: 'vaccine', LogVaccine: 'vaccine', VaccineShield: 'vaccine', vaccine: 'vaccine',
  HeartPulse: 'heartbeat', LogHeartbeat: 'heartbeat', FlaskConical: 'exam', LogExamResult: 'exam', LogUltrasound: 'ultrasound',
  // cycle / pregnancy
  LogPeriodStart: 'period', LogPeriodEnd: 'period', LogOvulation: 'ovulation', LogKicks: 'kick', KickIcon: 'kick',
  LogContraction: 'contraction', period: 'period', ovulation: 'ovulation', kick: 'kick',
  // symbolic
  Star: 'star', Sparkle: 'sparkle', Sparkles: 'sparkle', Sun: 'sun', Heart: 'heart',
  StreakChip: 'streak', Crown: 'crown', Diamond: 'gem', Gem: 'gem',
  // wellness / misc
  HandHeart: 'soothe', Hugs: 'hug', Users: 'community', LogNote: 'note', FileText: 'note',
  Camera: 'photo', LogPhoto: 'photo', Bell: 'bell',
}

/** Resolve a legacy name / concept string to a CharacterName, or null if none. */
export function resolveCharacter(name: string): CharacterName | null {
  if (name in ALIAS) return ALIAS[name]
  if (name in HUE) return name as CharacterName
  return null
}
