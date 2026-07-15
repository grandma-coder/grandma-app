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

import Svg, { Path, Circle, Ellipse } from 'react-native-svg'

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
  | 'soothe' | 'hug' | 'community' | 'note' | 'photo' | 'bell' | 'clock'
  // birth-guide topics
  | 'cloud' | 'key' | 'lungs' | 'warning'
  // rewards & achievements
  | 'trophy' | 'medal' | 'badge' | 'gift' | 'reward'
  // development / growth-leap topics
  | 'brain' | 'phase' | 'observe' | 'celebrate' | 'tip'

// Mood expressions — one `mood` blob, a `face` prop varies the expression.
// Kids: happy·calm·energetic·fussy·cranky. Pregnancy adds excited·anxious·nauseous.
// Pass to <Character name="mood" face="fussy" /> (or via moodFace helpers).
export type MoodExpression =
  | 'happy' | 'calm' | 'energetic' | 'fussy' | 'cranky'
  | 'excited' | 'anxious' | 'nauseous'

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
  clock: '#8E72C9',
  cloud: '#7FA8D8', key: '#C9A02C', lungs: '#D98CA6', warning: '#D86A4F',
  trophy: '#C9A02C', medal: '#C79A5B', badge: '#D87CA0', gift: '#EE7B6D', reward: '#F5D652',
}

// Blob silhouette (48×48) per concept, ported from the approved set.
const D: Record<CharacterName, string> = {
  nutrition: 'M24 44c-9 0-16-6-16-15 0-7 5-12 11-13-2-4-1-9 3-11 1-1 2 0 2 1 0 2-1 4 0 6 2-3 5-4 8-3 1 0 1 2 0 2-3 1-5 3-5 6 6 1 13 6 13 14 0 9-7 13-16 13Z',
  sleep: 'M32 4C18 4 8 13 8 25s10 21 24 20c2 0 2-2 0-3-8-3-14-9-14-18S24 9 32 6c2-1 2-2 0-2Z',
  mood: 'M24 6a18 18 0 1 1 0 36 18 18 0 0 1 0-36Z',
  health: 'M19 8c0-2 2-4 5-4s5 2 5 4v6h6c2 0 4 2 4 5s-2 5-4 5h-6v6c0 2-2 4-5 4s-5-2-5-4v-6H8c-2 0-4-2-4-5s2-5 4-5h11V8Z',
  growth: 'M21 44v-13c-5 0-10-3-10-9 0-1 1-2 2-2 5 0 9 3 10 7 0-3 0-6 1-9 1 3 1 6 1 9 1-4 5-7 10-7 1 0 2 1 2 2 0 6-5 9-10 9v13h-8Z',
  activity: 'M24 3c1 0 2 1 2 3 1 4 2 6 5 5 3-2 5 0 4 3-1 3-1 5 2 6 3 1 3 4 0 5-3 1-3 3-2 6 1 3-1 5-4 3-3-1-4 1-5 5 0 2-1 3-2 3s-2-1-2-3c-1-4-2-6-5-5-3 2-5 0-4-3 1-3 1-5-2-6-3-1-3-4 0-5 3-1 3-3 2-6-1-3 1-5 4-3 3 1 4-1 5-5 0-2 1-3 2-3Z',
  water: 'M24 4c-2 6-14 16-14 26 0 8 6 14 14 14s14-6 14-14C38 20 26 10 24 4Z',
  calories: 'M24 4c-1 6-8 9-8 18 0 3 1 5 3 7-1-4 1-7 4-9-1 5 3 7 3 12 0 3-2 6-6 6 6 3 15-1 15-11 0-11-9-16-11-23Z',
  temperature: 'M24 6c-4 0-7 3-7 7v13c-3 2-5 5-5 9 0 7 5 11 12 11s12-4 12-11c0-4-2-7-5-9V13c0-4-3-7-7-7Z',
  feeding: 'M7 23h34a1 1 0 0 1 1 1c0 8-6 14-13 15v2a2 2 0 0 1-4 0v-1c-9-1-15-7-15-15a1 1 0 0 1 1-1ZM31 8c1 0 2 1 2 2l-1 11a1 1 0 0 1-2 0l-1-11c0-1 1-2 2-2Z',
  milk: 'M20 5h8a1 1 0 0 1 0 4h-1l1 3c3 1 5 4 5 8v14c0 3-2 5-9 5s-9-2-9-5V24c0-4 2-7 5-8l1-3h-1a1 1 0 0 1 0-4Z',
  diaper: 'M9 13h30a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2c-3 3-4 8-4 12 0 3-2 5-11 5s-11-2-11-5c0-4-1-9-4-12a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2Z',
  potty: 'M11 20h26v2a10 10 0 0 1-4 8l1 5a1 1 0 0 1-1 1H15a1 1 0 0 1-1-1l1-5a10 10 0 0 1-4-8v-2ZM8 15h32a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1ZM37 21c3 0 3 5 0 5Z',
  bath: 'M7 24h34v3a11 11 0 0 1-11 11H18A11 11 0 0 1 7 27v-3ZM13 24V14a3 3 0 0 1 6 0v10Z',
  baby: 'M24 8a15 15 0 1 0 0 30 15 15 0 0 0 0-30ZM24 8c0-3 4-4 6-2 1 2-1 4-3 4',
  medicine: 'M13 13a9 9 0 0 1 13 0l9 9a9 9 0 0 1-13 13l-9-9a9 9 0 0 1 0-13Z',
  vaccine: 'M16 5h16v4h-4v4h2v14h-2v3l-4 6-4-6v-3h-2V13h2V9h-4V5Z',
  heartbeat: 'M24 43C11 34 6 26 6 18 6 11 11 7 16 7c4 0 7 3 8 6 1-3 4-6 8-6 5 0 10 4 10 11 0 8-5 16-18 25Z',
  checkup: 'M24 42C11 33 6 25 6 17 6 10 11 6 16 6c4 0 7 3 8 6 1-3 4-6 8-6 5 0 10 4 10 11 0 8-5 16-18 25Z',
  exam: 'M20 6h8v10l7 15a3 3 0 0 1-3 4H16a3 3 0 0 1-3-4l7-15V6Z',
  period: 'M24 4c-3 8-16 18-16 28 0 8 7 12 16 12s16-4 16-12C40 22 27 12 24 4Z',
  ovulation: 'M24 6c11 0 18 7 18 18s-7 18-18 18S6 35 6 24 13 6 24 6Z',
  kick: 'M16 28c-4-1-7-5-7-11 0-6 4-10 9-10s8 4 8 10c0 5-2 9-5 10-2 1-3 3-3 5s-1 4-4 4-4-2-4-4 1-3 3-4c1 0 1 0 1 0ZM30 12a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM36 15a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM38 22a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z',
  contraction: 'M24 8c9 0 16 7 16 16s-7 16-16 16S8 33 8 24 15 8 24 8Z',
  ultrasound: 'M8 10h32a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H27l2 5h-10l2-5H8a2 2 0 0 1-2-2V12a2 2 0 0 1 2-2Z',
  star: 'M24 4c1 0 2 1 3 3l3 7c1 1 2 2 3 2l8 1c3 0 4 3 2 5l-6 5c-1 1-1 2-1 3l2 8c1 3-2 4-4 3l-7-4c-1-1-2-1-3 0l-7 4c-2 1-5 0-4-3l2-8c0-1 0-2-1-3l-6-5c-2-2-1-5 2-5l8-1c1 0 2-1 3-2l3-7c1-2 2-3 3-3Z',
  sparkle: 'M24 3c1 0 2 1 2 3 1 4 2 6 5 5 3-2 5 0 4 3-1 3-1 5 2 6 3 1 3 4 0 5-3 1-3 3-2 6 1 3-1 5-4 3-3-1-4 1-5 5 0 2-1 3-2 3s-2-1-2-3c-1-4-2-6-5-5-3 2-5 0-4-3 1-3 1-5-2-6-3-1-3-4 0-5 3-1 3-3 2-6-1-3 1-5 4-3 3 1 4-1 5-5 0-2 1-3 2-3Z',
  sun: 'M24 12a12 12 0 1 1 0 24 12 12 0 0 1 0-24ZM24 3v4M24 41v4M8.5 8.5l3 3M36.5 36.5l3 3M3 24h4M41 24h4M8.5 39.5l3-3M36.5 11.5l3-3',
  night: 'M30 6C17 6 8 15 8 26s9 18 21 17c2 0 2-2 0-3-7-2-12-8-12-16s5-13 12-15c2-1 2-3 0-3ZM37 8l1.5 3.5L42 13l-3.5 1.5L37 18l-1.5-3.5L32 13l3.5-1.5Z',
  heart: 'M24 43C11 34 6 26 6 18 6 11 11 7 16 7c4 0 7 3 8 6 1-3 4-6 8-6 5 0 10 4 10 11 0 8-5 16-18 25Z',
  streak: 'M24 5c-1 6-7 9-7 16 0 3 1 5 3 7-1-4 1-6 3-8-1 5 3 6 3 10 0 3-2 5-5 5 5 2 12-1 12-10 0-9-8-13-9-20-1 0-2 0-3 0ZM14 38h20l-2 5H16Z',
  crown: 'M6 34l4-20 8 8 6-12 6 12 8-8 4 20c0 2-1 3-4 3H10c-3 0-4-1-4-3Z',
  gem: 'M16 6h16l8 10-16 22L8 16Z',
  soothe: 'M24 40C13 32 8 26 8 19c0-5 4-8 8-8 3 0 6 2 8 5 2-3 5-5 8-5 4 0 8 3 8 8 0 7-5 13-16 21Z',
  hug: 'M24 8a10 10 0 1 1 0 20 10 10 0 0 1 0-20ZM10 40c0-7 5-12 10-13M38 40c0-7-5-12-10-13',
  community: 'M18 12a7 7 0 1 1 0 14 7 7 0 0 1 0-14ZM32 14a6 6 0 1 1 0 12 6 6 0 0 1 0-12ZM6 40c0-7 5-12 12-12s12 5 12 12ZM32 28c6 0 10 4 10 12H30',
  note: 'M12 6h16l8 8v28H12Z',
  photo: 'M8 14h6l3-4h14l3 4h6v24H8Z',
  bell: 'M24 6c-7 0-11 5-11 12 0 8-4 10-4 12h30c0-2-4-4-4-12 0-7-4-12-11-12ZM20 34a4 4 0 0 0 8 0',
  clock: 'M24 6a18 18 0 1 1 0 36 18 18 0 0 1 0-36Z',
  cloud: 'M14 34a8 8 0 0 1-1-16 10 10 0 0 1 19-2 7 7 0 0 1 2 18Z',
  key: 'M17 6a11 11 0 1 0 8 18l10 10 4-4-3-3 3-3-4-4-3 3-3-3a11 11 0 0 0-9-14ZM16 13a4.5 4.5 0 1 1 0 7 4.5 4.5 0 0 1 0-7Z',
  lungs: 'M23 6h2v10c0 2 2 3 4 3 4 0 6 3 6 9v8c0 3-2 5-5 5s-5-2-5-5V19h-2v17c0 3-2 5-5 5s-5-2-5-5v-8c0-6 2-9 6-9 2 0 4-1 4-3V6Z',
  warning: 'M21 6a4 4 0 0 1 6 0l16 30a4 4 0 0 1-3 6H8a4 4 0 0 1-3-6Z',
  // rewards & achievements. Body only in D (hue fill); cut-out details (check,
  // ribbon, star) live in FACE and render in the paper/bg colour, matching the
  // rest of the family. Trophy handles are baked into its D as subpaths.
  trophy: 'M14 8h20v6c0 6-3 11-8 12v4h5v4H17v-4h5v-4c-5-1-8-6-8-12V8ZM14 10c-4 0-6 2-6 5s2 6 6 7l1-3c-3-1-4-2-4-4s1-2 3-2ZM34 10c4 0 6 2 6 5s-2 6-6 7l-1-3c3-1 4-2 4-4s-1-2-3-2Z',
  medal: 'M24 42a12 12 0 1 1 0-24 12 12 0 0 1 0 24ZM18 6l6 12-4 2-6-12ZM30 6l-6 12 4 2 6-12Z',
  badge: 'M24 6l4 3 5-1 1 5 4 3-2 5 2 5-4 3-1 5-5-1-4 3-4-3-5 1-1-5-4-3 2-5-2-5 4-3 1-5 5 1Z',
  gift: 'M9 20h30v18a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2V20ZM7 14h34a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1ZM24 14c-3-6-9-4-9 0 0 2 4 3 9 0Zm0 0c3-6 9-4 9 0 0 2-4 3-9 0Z',
  reward: 'M8 18a10 10 0 0 1 10-10h12a10 10 0 0 1 10 10v12a10 10 0 0 1-10 10H18A10 10 0 0 1 8 30V18Z',
  // development / growth-leap topics. brain = two lobes; phase = 3 rising steps;
  // observe = eye (iris cut-out in FACE); celebrate = star-burst; tip = bulb.
  brain: 'M18 10c-4 0-7 3-7 7 0 1 0 2 1 3-2 1-3 3-3 6 0 4 3 7 7 7 1 2 3 3 5 3V10c-2 0-4 1-6 1ZM30 10c4 0 7 3 7 7 0 1 0 2-1 3 2 1 3 3 3 6 0 4-3 7-7 7-1 2-3 3-5 3V10c2 0 4 1 6 1Z',
  phase: 'M8 34a4 4 0 0 1 4-4 4 4 0 0 1 4 4v4H8ZM20 26a4 4 0 0 1 4-4 4 4 0 0 1 4 4v12h-8ZM32 16a4 4 0 0 1 4-4 4 4 0 0 1 4 4v22h-8Z',
  observe: 'M4 24c6-11 34-11 40 0-6 11-34 11-40 0Z',
  celebrate: 'M24 5l3.5 8.5 8.5-4.5-4.5 8.5 8.5 3.5-8.5 3.5 4.5 8.5-8.5-4.5-3.5 8.5-3.5-8.5-8.5 4.5 4.5-8.5-8.5-3.5 8.5-3.5-4.5-8.5 8.5 4.5Z',
  tip: 'M24 6c-7 0-12 5-12 12 0 5 3 8 5 10 1 1 1 2 1 3h12c0-1 0-2 1-3 2-2 5-5 5-10 0-7-5-12-12-12ZM19 34h10v3a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-3Z',
}

// Face per concept. Eyes ONLY on creatures/subjects; object glyphs are faceless
// ('none'). Some creatures use an expression; some concepts use a "cut-out"
// detail rendered in the surface/paper colour (pulse, target, wave, blip, lens,
// or the community's four eyes).
type FaceKind = 'dots' | 'sleepy' | 'smile' | 'pulse' | 'wave' | 'target' | 'blip' | 'lens' | 'quad' | 'check' | 'hands' | 'warn' | 'none'
  // reward cut-outs (rendered in the paper/bg colour)
  | 'sealCheck' | 'medalCheck' | 'ribbon' | 'starCut'
const FACE: Record<CharacterName, { kind: FaceKind; e: [number, number, number, number] }> = {
  // subjects / creatures → eyes
  nutrition: { kind: 'dots', e: [19, 30, 29, 30] },
  sleep: { kind: 'sleepy', e: [17, 21, 25, 23] },
  mood: { kind: 'smile', e: [16, 22, 26, 22] },
  health: { kind: 'dots', e: [20, 25, 28, 25] },
  growth: { kind: 'dots', e: [21, 39, 25, 39] },
  activity: { kind: 'dots', e: [21, 22, 27, 22] },
  water: { kind: 'dots', e: [20, 28, 28, 28] },
  calories: { kind: 'dots', e: [21, 26, 27, 26] },
  baby: { kind: 'dots', e: [19, 24, 29, 24] },
  star: { kind: 'dots', e: [21, 24, 27, 24] },
  sparkle: { kind: 'smile', e: [21, 22, 27, 22] },
  sun: { kind: 'smile', e: [19, 23, 25, 23] },
  night: { kind: 'dots', e: [18, 20, 26, 23] },
  heart: { kind: 'smile', e: [18, 19, 28, 19] },
  hug: { kind: 'smile', e: [20, 16, 28, 16] },
  community: { kind: 'quad', e: [0, 0, 0, 0] },
  cloud: { kind: 'dots', e: [19, 27, 27, 27] },
  key: { kind: 'none', e: [0, 0, 0, 0] },
  lungs: { kind: 'none', e: [0, 0, 0, 0] },
  warning: { kind: 'warn', e: [0, 0, 0, 0] },
  // concept "face-as-content" cut-outs
  heartbeat: { kind: 'pulse', e: [0, 0, 0, 0] },
  ovulation: { kind: 'target', e: [0, 0, 0, 0] },
  contraction: { kind: 'wave', e: [0, 0, 0, 0] },
  ultrasound: { kind: 'blip', e: [0, 0, 0, 0] },
  photo: { kind: 'lens', e: [0, 0, 0, 0] },
  // objects → faceless
  temperature: { kind: 'none', e: [0, 0, 0, 0] },
  feeding: { kind: 'none', e: [0, 0, 0, 0] },
  milk: { kind: 'none', e: [0, 0, 0, 0] },
  diaper: { kind: 'none', e: [0, 0, 0, 0] },
  potty: { kind: 'none', e: [0, 0, 0, 0] },
  bath: { kind: 'none', e: [0, 0, 0, 0] },
  medicine: { kind: 'none', e: [0, 0, 0, 0] },
  vaccine: { kind: 'none', e: [0, 0, 0, 0] },
  checkup: { kind: 'check', e: [0, 0, 0, 0] },
  exam: { kind: 'none', e: [0, 0, 0, 0] },
  period: { kind: 'none', e: [0, 0, 0, 0] },
  kick: { kind: 'none', e: [0, 0, 0, 0] },
  streak: { kind: 'none', e: [0, 0, 0, 0] },
  crown: { kind: 'none', e: [0, 0, 0, 0] },
  gem: { kind: 'none', e: [0, 0, 0, 0] },
  soothe: { kind: 'none', e: [0, 0, 0, 0] },
  note: { kind: 'none', e: [0, 0, 0, 0] },
  bell: { kind: 'none', e: [0, 0, 0, 0] },
  clock: { kind: 'hands', e: [0, 0, 0, 0] },
  // rewards & achievements
  trophy: { kind: 'none', e: [0, 0, 0, 0] },
  medal: { kind: 'medalCheck', e: [0, 0, 0, 0] },
  badge: { kind: 'sealCheck', e: [0, 0, 0, 0] },
  gift: { kind: 'ribbon', e: [0, 0, 0, 0] },
  reward: { kind: 'starCut', e: [0, 0, 0, 0] },
}

// Mood expression face recipes — drawn on the `mood` blob. Each returns the
// eyes+mouth markup for a mood; `eye` is the ink colour. Distinct enough to read
// at 24px (see the blob gallery). Used when <Character name="mood" face=... />.
const MOOD_FACE: Record<MoodExpression, (eye: string) => React.ReactNode> = {
  happy: (e) => (<><Circle cx={17} cy={21} r={2.3} fill={e} /><Circle cx={31} cy={21} r={2.3} fill={e} /><Path d="M17 28q7 7 14 0" stroke={e} strokeWidth={2} fill="none" strokeLinecap="round" /></>),
  calm: (e) => (<><Path d="M15 22q2.4 2 4.6 0" stroke={e} strokeWidth={1.7} fill="none" strokeLinecap="round" /><Path d="M28 22q2.4 2 4.6 0" stroke={e} strokeWidth={1.7} fill="none" strokeLinecap="round" /><Path d="M19 29q5 3 10 0" stroke={e} strokeWidth={1.8} fill="none" strokeLinecap="round" /></>),
  energetic: (e) => (<><Circle cx={17} cy={21} r={2.8} fill={e} /><Circle cx={31} cy={21} r={2.8} fill={e} /><Ellipse cx={24} cy={30} rx={4} ry={4.5} fill={e} /></>),
  fussy: (e) => (<><Path d="M15 22q2 2.4 4 0" stroke={e} strokeWidth={1.7} fill="none" strokeLinecap="round" /><Path d="M29 22q2 2.4 4 0" stroke={e} strokeWidth={1.7} fill="none" strokeLinecap="round" /><Path d="M18 32q2-3 3 0 1.5 2.4 3 0 1-3 3 0" stroke={e} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" /></>),
  cranky: (e) => (<><Circle cx={17} cy={24} r={2.2} fill={e} /><Circle cx={31} cy={24} r={2.2} fill={e} /><Path d="M13 19l7 3M35 19l-7 3" stroke={e} strokeWidth={2.1} fill="none" strokeLinecap="round" /><Path d="M18 34q6-5 12 0" stroke={e} strokeWidth={2.1} fill="none" strokeLinecap="round" /></>),
  excited: (e) => (<><Circle cx={17} cy={21} r={2.6} fill={e} /><Circle cx={31} cy={21} r={2.6} fill={e} /><Path d="M16 28q8 8 16 0" stroke={e} strokeWidth={2.1} fill="none" strokeLinecap="round" /></>),
  anxious: (e) => (<><Circle cx={17} cy={22} r={2} fill={e} /><Circle cx={31} cy={22} r={2} fill={e} /><Path d="M17 31l3-2 4 2 4-2 3 2" stroke={e} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" /></>),
  nauseous: (e) => (<><Path d="M15 21q2 -2 4 0 2 2 4 0" stroke={e} strokeWidth={1.6} fill="none" strokeLinecap="round" /><Path d="M27 21q2 -2 4 0" stroke={e} strokeWidth={1.6} fill="none" strokeLinecap="round" /><Path d="M18 30q3 3 6 0 3 -3 6 0" stroke={e} strokeWidth={1.8} fill="none" strokeLinecap="round" /></>),
}

interface Props {
  name: CharacterName
  size?: number
  /** Blob fill; defaults to the concept's hue. */
  color?: string
  /** Dot/expression colour; a warm near-black that reads on every hue. */
  eye?: string
  /** Surface/paper colour for "cut-out" details (pulse, target, wave, lens).
   *  Defaults to the Diffuse light paper; pass dt.colors.bg to match dark. */
  bg?: string
  /** Mood expression — only honoured when `name="mood"`. Overrides the default
   *  smile with a specific expression (happy/fussy/cranky/…). */
  face?: MoodExpression
}

export function Character({ name, size = 24, color, eye = '#1A1916', bg = '#F4F1E8', face }: Props) {
  const fill = color ?? HUE[name]
  const f = FACE[name]
  const [a, b, c, d] = f.e
  // Mood blob with an explicit expression → draw that face instead of the
  // default smile.
  if (name === 'mood' && face) {
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Path d={D.mood} fill={fill} />
        {MOOD_FACE[face](eye)}
      </Svg>
    )
  }
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
      {f.kind === 'quad' && (
        <>
          <Circle cx={15} cy={18} r={1.5} fill={eye} />
          <Circle cx={21} cy={18} r={1.5} fill={eye} />
          <Circle cx={30} cy={20} r={1.4} fill={eye} />
          <Circle cx={35} cy={20} r={1.4} fill={eye} />
        </>
      )}
      {/* cut-out details rendered in the paper colour */}
      {f.kind === 'pulse' && (
        <Path d="M13 22h5l2-5 3 10 2-5h8" stroke={bg} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {f.kind === 'wave' && (
        <Path d="M12 24q6-9 12 0 6-9 12 0" stroke={bg} strokeWidth={2.2} fill="none" strokeLinecap="round" />
      )}
      {f.kind === 'target' && (
        <>
          <Circle cx={24} cy={24} r={6} fill="none" stroke={bg} strokeWidth={2.2} />
          <Circle cx={24} cy={24} r={2} fill={bg} />
        </>
      )}
      {f.kind === 'lens' && (
        <Circle cx={24} cy={26} r={7} fill="none" stroke={bg} strokeWidth={2.4} />
      )}
      {f.kind === 'blip' && (
        <Path d="M24 27c-4-3-6-5-6-8 0-2 1.5-3.5 3.5-3.5 1.2 0 2 .6 2.5 1.5.5-.9 1.3-1.5 2.5-1.5 2 0 3.5 1.5 3.5 3.5 0 3-2 5-6 8Z" fill={bg} />
      )}
      {f.kind === 'check' && (
        <Path d="M17 20l4 4 8-8" stroke={bg} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {f.kind === 'hands' && (
        <Path d="M24 14v10l7 4" stroke={bg} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {f.kind === 'warn' && (
        <>
          <Path d="M24 19v9" stroke={bg} strokeWidth={3} fill="none" strokeLinecap="round" />
          <Circle cx={24} cy={35} r={2} fill={bg} />
        </>
      )}
      {/* medal — check on the medal disc (disc centre is at 24,30) */}
      {f.kind === 'medalCheck' && (
        <Path d="M20 30l3 3 6-6" stroke={bg} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {/* badge — seal ring + check */}
      {f.kind === 'sealCheck' && (
        <>
          <Circle cx={24} cy={24} r={6} fill="none" stroke={bg} strokeWidth={2.2} />
          <Path d="M21 24l2 2 4-4" stroke={bg} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {/* gift — vertical ribbon down the box */}
      {f.kind === 'ribbon' && (
        <Path d="M24 14v26" stroke={bg} strokeWidth={4} fill="none" strokeLinecap="butt" />
      )}
      {/* reward — star cut-out in the rounded tile */}
      {f.kind === 'starCut' && (
        <Path d="M24 14l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" fill={bg} />
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
