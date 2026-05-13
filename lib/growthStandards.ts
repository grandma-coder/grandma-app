/**
 * WHO + CDC growth standard percentile bands.
 *
 * Each entry is { ageMonths, p3, p15, p50, p85, p97 } — the 3rd, 15th, 50th,
 * 85th, and 97th percentile values at that age. Linear interpolation between
 * the nearest two age points gives a reasonable estimate at any age.
 *
 * Sources:
 *   - WHO Child Growth Standards (0–24 months): https://www.who.int/childgrowth/standards
 *   - CDC 2–20 years: https://www.cdc.gov/growthcharts/
 *
 * The data is intentionally abbreviated (monthly through 24mo, yearly from
 * 2y+) — these charts are decision-support, not clinical-grade dosing.
 */

export type Sex = 'male' | 'female'
export type Metric = 'weight' | 'height'

export interface Band {
  ageMonths: number
  p3: number
  p15: number
  p50: number
  p85: number
  p97: number
}

// ─── WHO Weight-for-age, boys (kg), 0–24mo ────────────────────────────────────
const WEIGHT_BOYS_0_24: Band[] = [
  { ageMonths: 0,  p3: 2.5, p15: 2.9, p50: 3.3, p85: 3.9, p97: 4.4 },
  { ageMonths: 1,  p3: 3.4, p15: 3.9, p50: 4.5, p85: 5.1, p97: 5.8 },
  { ageMonths: 2,  p3: 4.4, p15: 4.9, p50: 5.6, p85: 6.3, p97: 7.1 },
  { ageMonths: 3,  p3: 5.1, p15: 5.7, p50: 6.4, p85: 7.2, p97: 8.0 },
  { ageMonths: 4,  p3: 5.6, p15: 6.2, p50: 7.0, p85: 7.8, p97: 8.7 },
  { ageMonths: 6,  p3: 6.4, p15: 7.1, p50: 7.9, p85: 8.8, p97: 9.8 },
  { ageMonths: 9,  p3: 7.1, p15: 7.9, p50: 8.9, p85: 9.9, p97: 11.0 },
  { ageMonths: 12, p3: 7.7, p15: 8.6, p50: 9.6, p85: 10.8, p97: 12.0 },
  { ageMonths: 15, p3: 8.3, p15: 9.2, p50: 10.3, p85: 11.5, p97: 12.8 },
  { ageMonths: 18, p3: 8.8, p15: 9.8, p50: 10.9, p85: 12.2, p97: 13.7 },
  { ageMonths: 21, p3: 9.2, p15: 10.3, p50: 11.5, p85: 12.9, p97: 14.5 },
  { ageMonths: 24, p3: 9.7, p15: 10.8, p50: 12.2, p85: 13.6, p97: 15.3 },
]

// ─── WHO Weight-for-age, girls (kg), 0–24mo ───────────────────────────────────
const WEIGHT_GIRLS_0_24: Band[] = [
  { ageMonths: 0,  p3: 2.4, p15: 2.8, p50: 3.2, p85: 3.7, p97: 4.2 },
  { ageMonths: 1,  p3: 3.2, p15: 3.6, p50: 4.2, p85: 4.8, p97: 5.5 },
  { ageMonths: 2,  p3: 4.0, p15: 4.5, p50: 5.1, p85: 5.9, p97: 6.6 },
  { ageMonths: 3,  p3: 4.6, p15: 5.2, p50: 5.8, p85: 6.6, p97: 7.5 },
  { ageMonths: 4,  p3: 5.1, p15: 5.7, p50: 6.4, p85: 7.3, p97: 8.2 },
  { ageMonths: 6,  p3: 5.8, p15: 6.5, p50: 7.3, p85: 8.3, p97: 9.3 },
  { ageMonths: 9,  p3: 6.6, p15: 7.3, p50: 8.2, p85: 9.3, p97: 10.5 },
  { ageMonths: 12, p3: 7.0, p15: 7.9, p50: 8.9, p85: 10.1, p97: 11.5 },
  { ageMonths: 15, p3: 7.6, p15: 8.5, p50: 9.6, p85: 10.9, p97: 12.4 },
  { ageMonths: 18, p3: 8.1, p15: 9.1, p50: 10.2, p85: 11.6, p97: 13.2 },
  { ageMonths: 21, p3: 8.6, p15: 9.6, p50: 10.9, p85: 12.4, p97: 14.0 },
  { ageMonths: 24, p3: 9.0, p15: 10.2, p50: 11.5, p85: 13.0, p97: 14.8 },
]

// ─── WHO Length/Height-for-age, boys (cm), 0–24mo ─────────────────────────────
const HEIGHT_BOYS_0_24: Band[] = [
  { ageMonths: 0,  p3: 46.3, p15: 47.9, p50: 49.9, p85: 51.8, p97: 53.4 },
  { ageMonths: 1,  p3: 51.1, p15: 52.7, p50: 54.7, p85: 56.7, p97: 58.4 },
  { ageMonths: 2,  p3: 54.7, p15: 56.4, p50: 58.4, p85: 60.4, p97: 62.2 },
  { ageMonths: 3,  p3: 57.6, p15: 59.3, p50: 61.4, p85: 63.5, p97: 65.3 },
  { ageMonths: 4,  p3: 60.0, p15: 61.7, p50: 63.9, p85: 66.0, p97: 67.8 },
  { ageMonths: 6,  p3: 63.6, p15: 65.5, p50: 67.6, p85: 69.8, p97: 71.6 },
  { ageMonths: 9,  p3: 67.7, p15: 69.7, p50: 72.0, p85: 74.2, p97: 76.2 },
  { ageMonths: 12, p3: 71.0, p15: 73.1, p50: 75.7, p85: 78.1, p97: 80.2 },
  { ageMonths: 15, p3: 73.9, p15: 76.1, p50: 78.9, p85: 81.5, p97: 83.7 },
  { ageMonths: 18, p3: 76.5, p15: 78.9, p50: 81.7, p85: 84.5, p97: 86.8 },
  { ageMonths: 21, p3: 79.0, p15: 81.5, p50: 84.4, p85: 87.4, p97: 89.8 },
  { ageMonths: 24, p3: 81.4, p15: 83.9, p50: 87.1, p85: 90.2, p97: 92.9 },
]

// ─── WHO Length/Height-for-age, girls (cm), 0–24mo ────────────────────────────
const HEIGHT_GIRLS_0_24: Band[] = [
  { ageMonths: 0,  p3: 45.6, p15: 47.2, p50: 49.1, p85: 51.0, p97: 52.7 },
  { ageMonths: 1,  p3: 50.0, p15: 51.6, p50: 53.7, p85: 55.6, p97: 57.4 },
  { ageMonths: 2,  p3: 53.2, p15: 54.9, p50: 57.1, p85: 59.2, p97: 61.1 },
  { ageMonths: 3,  p3: 55.8, p15: 57.6, p50: 59.8, p85: 62.0, p97: 64.0 },
  { ageMonths: 4,  p3: 58.0, p15: 59.8, p50: 62.1, p85: 64.3, p97: 66.4 },
  { ageMonths: 6,  p3: 61.2, p15: 63.0, p50: 65.7, p85: 68.0, p97: 70.0 },
  { ageMonths: 9,  p3: 65.3, p15: 67.3, p50: 70.1, p85: 72.6, p97: 74.7 },
  { ageMonths: 12, p3: 68.9, p15: 71.0, p50: 74.0, p85: 76.6, p97: 78.9 },
  { ageMonths: 15, p3: 72.0, p15: 74.1, p50: 77.5, p85: 80.2, p97: 82.5 },
  { ageMonths: 18, p3: 74.9, p15: 77.1, p50: 80.7, p85: 83.6, p97: 86.0 },
  { ageMonths: 21, p3: 77.5, p15: 79.8, p50: 83.7, p85: 86.7, p97: 89.3 },
  { ageMonths: 24, p3: 80.0, p15: 82.5, p50: 86.4, p85: 89.6, p97: 92.3 },
]

// ─── CDC Weight-for-age, boys (kg), 2–20y ─────────────────────────────────────
const WEIGHT_BOYS_2_20: Band[] = [
  { ageMonths: 24,  p3: 10.0, p15: 10.9, p50: 12.5, p85: 14.0, p97: 15.5 },
  { ageMonths: 36,  p3: 12.1, p15: 13.3, p50: 14.8, p85: 16.5, p97: 18.3 },
  { ageMonths: 48,  p3: 13.8, p15: 15.2, p50: 16.7, p85: 18.5, p97: 20.6 },
  { ageMonths: 60,  p3: 15.5, p15: 17.0, p50: 18.5, p85: 20.7, p97: 23.0 },
  { ageMonths: 72,  p3: 17.0, p15: 18.7, p50: 20.5, p85: 23.0, p97: 25.8 },
  { ageMonths: 84,  p3: 18.7, p15: 20.4, p50: 22.6, p85: 25.5, p97: 28.8 },
  { ageMonths: 96,  p3: 20.4, p15: 22.2, p50: 24.9, p85: 28.5, p97: 32.5 },
  { ageMonths: 108, p3: 22.2, p15: 24.4, p50: 27.7, p85: 32.0, p97: 37.0 },
  { ageMonths: 120, p3: 24.2, p15: 26.8, p50: 30.7, p85: 36.0, p97: 42.3 },
  { ageMonths: 144, p3: 28.8, p15: 32.5, p50: 38.0, p85: 45.4, p97: 54.5 },
  { ageMonths: 168, p3: 36.0, p15: 41.5, p50: 49.0, p85: 58.0, p97: 68.0 },
  { ageMonths: 192, p3: 47.0, p15: 53.0, p50: 60.0, p85: 70.0, p97: 80.0 },
  { ageMonths: 216, p3: 53.5, p15: 60.0, p50: 67.0, p85: 78.0, p97: 89.0 },
  { ageMonths: 240, p3: 55.5, p15: 62.0, p50: 70.5, p85: 82.0, p97: 94.5 },
]

const WEIGHT_GIRLS_2_20: Band[] = [
  { ageMonths: 24,  p3: 9.5, p15: 10.4, p50: 11.8, p85: 13.4, p97: 15.0 },
  { ageMonths: 36,  p3: 11.5, p15: 12.7, p50: 14.2, p85: 16.0, p97: 18.0 },
  { ageMonths: 48,  p3: 13.0, p15: 14.4, p50: 16.0, p85: 18.2, p97: 20.5 },
  { ageMonths: 60,  p3: 14.5, p15: 16.0, p50: 17.9, p85: 20.5, p97: 23.5 },
  { ageMonths: 72,  p3: 16.0, p15: 17.7, p50: 20.0, p85: 23.0, p97: 26.7 },
  { ageMonths: 84,  p3: 17.7, p15: 19.6, p50: 22.4, p85: 26.0, p97: 30.5 },
  { ageMonths: 96,  p3: 19.5, p15: 21.7, p50: 25.0, p85: 29.5, p97: 35.0 },
  { ageMonths: 108, p3: 21.5, p15: 24.0, p50: 28.0, p85: 33.5, p97: 40.0 },
  { ageMonths: 120, p3: 23.5, p15: 26.5, p50: 31.5, p85: 38.0, p97: 45.5 },
  { ageMonths: 144, p3: 29.0, p15: 33.0, p50: 39.0, p85: 47.0, p97: 56.5 },
  { ageMonths: 168, p3: 37.5, p15: 42.0, p50: 49.5, p85: 57.0, p97: 67.0 },
  { ageMonths: 192, p3: 43.5, p15: 48.0, p50: 55.0, p85: 64.0, p97: 75.0 },
  { ageMonths: 216, p3: 45.5, p15: 50.0, p50: 57.5, p85: 67.5, p97: 79.0 },
  { ageMonths: 240, p3: 46.0, p15: 51.0, p50: 58.5, p85: 69.0, p97: 81.0 },
]

const HEIGHT_BOYS_2_20: Band[] = [
  { ageMonths: 24,  p3: 82.5, p15: 84.5, p50: 87.8, p85: 91.0, p97: 93.5 },
  { ageMonths: 36,  p3: 89.5, p15: 92.0, p50: 96.0, p85: 100.0, p97: 103.0 },
  { ageMonths: 48,  p3: 96.0, p15: 98.5, p50: 103.0, p85: 107.5, p97: 110.7 },
  { ageMonths: 60,  p3: 101.5, p15: 104.5, p50: 109.5, p85: 114.5, p97: 118.0 },
  { ageMonths: 72,  p3: 107.0, p15: 110.0, p50: 116.0, p85: 121.5, p97: 125.5 },
  { ageMonths: 84,  p3: 112.0, p15: 116.0, p50: 122.0, p85: 128.0, p97: 132.5 },
  { ageMonths: 96,  p3: 117.0, p15: 121.0, p50: 128.0, p85: 134.0, p97: 138.5 },
  { ageMonths: 108, p3: 122.0, p15: 126.0, p50: 133.0, p85: 140.0, p97: 145.0 },
  { ageMonths: 120, p3: 126.0, p15: 131.0, p50: 138.5, p85: 146.0, p97: 151.5 },
  { ageMonths: 144, p3: 135.0, p15: 141.0, p50: 150.0, p85: 159.0, p97: 165.5 },
  { ageMonths: 168, p3: 148.0, p15: 156.0, p50: 165.0, p85: 174.0, p97: 180.5 },
  { ageMonths: 192, p3: 161.0, p15: 168.0, p50: 175.0, p85: 182.0, p97: 187.5 },
  { ageMonths: 216, p3: 164.5, p15: 171.0, p50: 177.5, p85: 184.0, p97: 189.5 },
  { ageMonths: 240, p3: 165.0, p15: 171.5, p50: 178.0, p85: 184.5, p97: 190.0 },
]

const HEIGHT_GIRLS_2_20: Band[] = [
  { ageMonths: 24,  p3: 81.0, p15: 83.0, p50: 86.5, p85: 90.0, p97: 92.7 },
  { ageMonths: 36,  p3: 88.0, p15: 90.5, p50: 95.0, p85: 99.0, p97: 102.0 },
  { ageMonths: 48,  p3: 94.5, p15: 97.5, p50: 102.0, p85: 106.5, p97: 110.0 },
  { ageMonths: 60,  p3: 100.0, p15: 103.5, p50: 108.5, p85: 114.0, p97: 117.5 },
  { ageMonths: 72,  p3: 105.5, p15: 109.0, p50: 115.0, p85: 121.0, p97: 124.5 },
  { ageMonths: 84,  p3: 111.0, p15: 115.0, p50: 121.0, p85: 127.5, p97: 132.0 },
  { ageMonths: 96,  p3: 116.0, p15: 120.0, p50: 127.0, p85: 134.0, p97: 138.5 },
  { ageMonths: 108, p3: 121.0, p15: 125.5, p50: 132.5, p85: 140.0, p97: 145.5 },
  { ageMonths: 120, p3: 126.0, p15: 131.0, p50: 138.5, p85: 146.5, p97: 152.5 },
  { ageMonths: 144, p3: 138.0, p15: 144.0, p50: 152.0, p85: 159.0, p97: 164.0 },
  { ageMonths: 168, p3: 148.0, p15: 153.5, p50: 159.5, p85: 165.5, p97: 170.0 },
  { ageMonths: 192, p3: 150.5, p15: 156.0, p50: 162.0, p85: 168.0, p97: 172.0 },
  { ageMonths: 216, p3: 151.0, p15: 156.5, p50: 162.5, p85: 168.5, p97: 172.5 },
  { ageMonths: 240, p3: 151.0, p15: 156.5, p50: 163.0, p85: 169.0, p97: 173.0 },
]

const TABLES: Record<Metric, Record<Sex, Band[]>> = {
  weight: {
    male: [...WEIGHT_BOYS_0_24, ...WEIGHT_BOYS_2_20.filter((b) => b.ageMonths > 24)],
    female: [...WEIGHT_GIRLS_0_24, ...WEIGHT_GIRLS_2_20.filter((b) => b.ageMonths > 24)],
  },
  height: {
    male: [...HEIGHT_BOYS_0_24, ...HEIGHT_BOYS_2_20.filter((b) => b.ageMonths > 24)],
    female: [...HEIGHT_GIRLS_0_24, ...HEIGHT_GIRLS_2_20.filter((b) => b.ageMonths > 24)],
  },
}

/**
 * Linearly interpolate the percentile band at the requested age in months.
 * Returns null if the age is outside the table's range (< 0 or > 240 months).
 */
export function bandAt(metric: Metric, sex: Sex, ageMonths: number): Band | null {
  const table = TABLES[metric][sex]
  if (!table.length || ageMonths < table[0].ageMonths || ageMonths > table[table.length - 1].ageMonths) {
    return null
  }
  // Find the two surrounding rows.
  let lo = table[0]
  let hi = table[table.length - 1]
  for (let i = 0; i < table.length - 1; i++) {
    if (ageMonths >= table[i].ageMonths && ageMonths <= table[i + 1].ageMonths) {
      lo = table[i]
      hi = table[i + 1]
      break
    }
  }
  if (lo.ageMonths === hi.ageMonths) return lo
  const t = (ageMonths - lo.ageMonths) / (hi.ageMonths - lo.ageMonths)
  const lerp = (a: number, b: number) => a + (b - a) * t
  return {
    ageMonths,
    p3: lerp(lo.p3, hi.p3),
    p15: lerp(lo.p15, hi.p15),
    p50: lerp(lo.p50, hi.p50),
    p85: lerp(lo.p85, hi.p85),
    p97: lerp(lo.p97, hi.p97),
  }
}

/**
 * Estimate the percentile of a measurement against the reference bands.
 * Uses piecewise linear interpolation between the 5 standard percentile
 * lines (P3, P15, P50, P85, P97). Below P3 or above P97 clamp to 1 / 99.
 *
 * Not a clinical-grade calculation — for decision-support display only.
 */
export function estimatePercentile(metric: Metric, sex: Sex, ageMonths: number, value: number): number | null {
  const band = bandAt(metric, sex, ageMonths)
  if (!band) return null
  if (value <= band.p3) return value < band.p3 ? 1 : 3
  if (value >= band.p97) return value > band.p97 ? 99 : 97
  // Find which pair the value falls between.
  const points: Array<[number, number]> = [
    [band.p3, 3],
    [band.p15, 15],
    [band.p50, 50],
    [band.p85, 85],
    [band.p97, 97],
  ]
  for (let i = 0; i < points.length - 1; i++) {
    const [v0, p0] = points[i]
    const [v1, p1] = points[i + 1]
    if (value >= v0 && value <= v1) {
      const t = (value - v0) / (v1 - v0)
      return Math.round(p0 + (p1 - p0) * t)
    }
  }
  return null
}

/** Bands span used to compute the chart y-axis range. */
export function rangeFor(metric: Metric, sex: Sex, fromMonths: number, toMonths: number): { min: number; max: number } | null {
  let min = Infinity
  let max = -Infinity
  for (let m = fromMonths; m <= toMonths; m += Math.max(1, Math.round((toMonths - fromMonths) / 12))) {
    const b = bandAt(metric, sex, m)
    if (!b) continue
    if (b.p3 < min) min = b.p3
    if (b.p97 > max) max = b.p97
  }
  return Number.isFinite(min) && Number.isFinite(max) ? { min, max } : null
}

/** Generate sampled bands for chart rendering. */
export function sampleBands(metric: Metric, sex: Sex, fromMonths: number, toMonths: number, samples = 24): Band[] {
  const out: Band[] = []
  const step = (toMonths - fromMonths) / Math.max(1, samples - 1)
  for (let i = 0; i < samples; i++) {
    const m = fromMonths + step * i
    const b = bandAt(metric, sex, m)
    if (b) out.push(b)
  }
  return out
}
