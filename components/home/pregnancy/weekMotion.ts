/**
 * weekMotion — per-week animation class.
 *
 * Each week has a signature motion in pregnancy-weeks.html (`.wk-1`…`.wk-42`).
 * We map each week to one of a small set of reusable motion types.
 */

export type WeekMotion =
  | 'bounce'   // scale 0.85 ↔ 1.18
  | 'sway'     // rotate ±12°
  | 'drift'    // translateY + slight rotate
  | 'spin'     // 0° → 360° linear
  | 'squish'   // scaleX ↔ scaleY (jelly)
  | 'pulse'    // opacity + scale pulse
  | 'shake'    // translateX wiggle
  | 'wave'     // circular drift (for banana/cantaloupe drifts)
  | 'float'    // gentle vertical bob (default)

// Assignment per week — chosen to roughly match the HTML animation character.
// Where the HTML uses an exotic combo (hue-rotate, etc.), we fall back to a
// close-enough simple motion.
const MOTION_BY_WEEK: Record<number, WeekMotion> = {
  1: 'bounce',   // bounce scale 0.8↔1.25
  2: 'drift',    // translateY + rotate
  3: 'pulse',    // opacity pulse
  4: 'sway',     // rotate -14↔14
  5: 'spin',     // rotate 0↔360 with scale
  6: 'squish',   // vertical squish
  7: 'drift',    // rotate + translateY
  8: 'bounce',   // heartbeat-like
  9: 'float',    // translateY with scaleY
  10: 'wave',    // circular drift
  11: 'bounce',  // bounce + rotate
  12: 'shake',   // horizontal wiggle
  13: 'sway',    // rotate wide swing
  14: 'spin',
  15: 'bounce',
  16: 'squish',  // horizontal squish
  17: 'drift',
  18: 'spin',
  19: 'bounce',
  20: 'sway',
  21: 'float',
  22: 'float',   // bounce-settle (papaya)
  23: 'shake',   // quick rotate-scale
  24: 'pulse',   // hue/scale (approximated as pulse)
  25: 'bounce',
  26: 'sway',    // rotate -22 wide swing
  27: 'spin',    // cauliflower florets rotate
  28: 'squish',  // eggplant vertical stretch
  29: 'bounce',
  30: 'sway',
  31: 'spin',
  32: 'sway',
  33: 'sway',
  34: 'spin',
  35: 'wave',
  36: 'drift',
  37: 'sway',
  38: 'shake',
  39: 'bounce',
  40: 'spin',
  41: 'squish',
  42: 'sway',
}

export function getWeekMotion(week: number): WeekMotion {
  return MOTION_BY_WEEK[week] ?? 'float'
}
