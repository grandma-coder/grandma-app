/**
 * weekStats — per-week clinical length (cm) and weight (g).
 * Matches the weekStats object in pregnancy-weeks.html.
 */

export interface WeekStat {
  cm: number
  g: number | null
}

export const weekStats: Record<number, WeekStat> = {
  1: { cm: 0.05, g: null },
  2: { cm: 0.05, g: null },
  3: { cm: 0.1, g: null },
  4: { cm: 0.2, g: null },
  5: { cm: 0.3, g: null },
  6: { cm: 0.6, g: null },
  7: { cm: 1.0, g: null },
  8: { cm: 1.6, g: 1 },
  9: { cm: 2.3, g: 2 },
  10: { cm: 3.1, g: 4 },
  11: { cm: 4.1, g: 7 },
  12: { cm: 5.4, g: 14 },
  13: { cm: 7.4, g: 23 },
  14: { cm: 8.7, g: 43 },
  15: { cm: 10.1, g: 70 },
  16: { cm: 11.6, g: 100 },
  17: { cm: 13.0, g: 140 },
  18: { cm: 14.2, g: 190 },
  19: { cm: 15.3, g: 240 },
  20: { cm: 16.4, g: 300 },
  21: { cm: 26.7, g: 360 },
  22: { cm: 27.8, g: 430 },
  23: { cm: 28.9, g: 501 },
  24: { cm: 30.0, g: 600 },
  25: { cm: 34.6, g: 660 },
  26: { cm: 35.6, g: 760 },
  27: { cm: 36.6, g: 875 },
  28: { cm: 37.6, g: 1005 },
  29: { cm: 38.6, g: 1153 },
  30: { cm: 39.9, g: 1319 },
  31: { cm: 41.1, g: 1502 },
  32: { cm: 42.4, g: 1702 },
  33: { cm: 43.7, g: 1918 },
  34: { cm: 45.0, g: 2146 },
  35: { cm: 46.2, g: 2383 },
  36: { cm: 47.4, g: 2622 },
  37: { cm: 48.6, g: 2859 },
  38: { cm: 49.8, g: 3083 },
  39: { cm: 50.7, g: 3288 },
  40: { cm: 51.2, g: 3462 },
  41: { cm: 51.5, g: 3600 },
  42: { cm: 51.7, g: 3685 },
}

export function getWeekStat(week: number): WeekStat {
  const w = Math.max(1, Math.min(42, week))
  return weekStats[w] ?? { cm: 0, g: null }
}

export function formatWeight(g: number | null): string {
  if (g == null) return '<1g'
  if (g < 1000) return `${g}g`
  const kg = g / 1000
  return `${kg.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}kg`
}

export function formatLength(cm: number): string {
  if (cm < 1) return `${cm}cm`
  return `${cm}cm`
}
