/**
 * bucketSeries — downsample a per-day series into a bounded number of columns.
 *
 * The kids bar charts (BrickColumns / HighlightBarChart) plot one column per day
 * in the selected window. On a 30 / 90 / 365-day range that's far too many columns
 * for the fixed chart width — the per-column width math underflows to zero/negative
 * and NOTHING renders (blank chart). Bucketing keeps the column count small enough
 * to draw a legible trend on any window.
 *
 * Values are averaged per bucket (mean), which reads correctly for both averages
 * (e.g. sleep hours/night) and counts (avg per day in the bucket). Short series
 * (<= maxCols) pass through untouched, so the weekly view is pixel-identical.
 */
export function bucketSeries(
  data: number[],
  labels: string[] | undefined,
  maxCols: number,
): { data: number[]; labels: string[] } {
  const n = data.length
  const safeLabels = labels ?? data.map(() => '')
  if (maxCols < 1 || n <= maxCols) {
    return { data: [...data], labels: [...safeLabels] }
  }
  const size = Math.ceil(n / maxCols)
  const outData: number[] = []
  const outLabels: string[] = []
  for (let start = 0; start < n; start += size) {
    const chunk = data.slice(start, start + size)
    const mean = chunk.reduce((a, b) => a + b, 0) / chunk.length
    outData.push(mean)
    // Label the bucket by its most-recent day (the right edge reads as "now").
    outLabels.push(safeLabels[Math.min(start + size - 1, n - 1)] ?? '')
  }
  return { data: outData, labels: outLabels }
}
