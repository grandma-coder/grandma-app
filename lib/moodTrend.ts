export interface MoodStripDatum {
  date: string
  value: string | null
}

export function cycleMoodToStrip(
  rows: { date: string; mood: string | null }[],
): MoodStripDatum[] {
  return rows.map((r) => ({ date: r.date, value: r.mood }))
}

export function pregMoodToStrip(
  rows: { log_date: string; value: string | null }[],
): MoodStripDatum[] {
  return rows.map((r) => ({ date: r.log_date, value: r.value }))
}
