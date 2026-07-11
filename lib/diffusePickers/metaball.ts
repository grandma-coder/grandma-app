// lib/diffusePickers/metaball.ts
//
// Label-position math for the Diffuse MetaballBloom multi-select cluster
// (cycle conditions, pregnancy feelings). Pure — no RN imports — so it can be
// unit-tested in isolation and reused by the presentational component.
//
// The reference layout is the `.bloomlbl` grid from docs/design/Onboarding.html:
// each label is placed by CSS `left`/`top` percentages over a soft bloom field.
// The two counts the onboarding flow actually uses are hand-tuned to match the
// reference exactly:
//   • 8 → cycle conditions (a rounded diamond)
//   • 9 → pregnancy feelings (a clean 3×3)
// Any other count falls back to an evenly balanced generated grid so the
// component never throws for unexpected option lists.

export interface MetaballPosition {
  /** CSS length like '34.4%' — horizontal center of the label. */
  left: string
  /** CSS length like '29.8%' — vertical center of the label. */
  top: string
}

// Exact reference grid for the 8 cycle conditions (docs/design/Onboarding.html
// `.bloomlbl` spans, in reading order). A rounded diamond: two rows of two, a
// wide middle row of three, and a single bottom apex.
const CONDITIONS_8: readonly MetaballPosition[] = [
  { left: '34.4%', top: '29.8%' },
  { left: '65.6%', top: '31%' },
  { left: '22.5%', top: '50%' },
  { left: '50%', top: '48.8%' },
  { left: '78.1%', top: '50%' },
  { left: '33.75%', top: '70.2%' },
  { left: '66.25%', top: '70.2%' },
  { left: '50%', top: '86.9%' },
]

// Exact reference grid for the 9 pregnancy feelings — a clean 3×3.
const FEELINGS_9: readonly MetaballPosition[] = [
  { left: '23.5%', top: '30%' },
  { left: '50%', top: '29.5%' },
  { left: '76.5%', top: '30%' },
  { left: '22.9%', top: '51.25%' },
  { left: '50%', top: '51.25%' },
  { left: '77%', top: '51.25%' },
  { left: '24.1%', top: '72.5%' },
  { left: '50%', top: '73%' },
  { left: '75.9%', top: '72.5%' },
]

const fmt = (n: number): string => `${Math.round(n * 100) / 100}%`

/**
 * Evenly balanced grid for counts other than the two hand-tuned references.
 * Lays labels out in near-square rows inset from the edges, so the cluster
 * always reads as a centered bloom field regardless of N.
 */
function generatedGrid(count: number): MetaballPosition[] {
  if (count <= 0) return []
  if (count === 1) return [{ left: '50%', top: '50%' }]

  const cols = Math.ceil(Math.sqrt(count))
  const rows = Math.ceil(count / cols)

  // Inset the grid from the edges so blooms don't clip the field.
  const insetX = 22
  const insetY = 26
  const spanX = 100 - insetX * 2
  const spanY = 100 - insetY * 2

  const out: MetaballPosition[] = []
  for (let i = 0; i < count; i++) {
    const r = Math.floor(i / cols)
    const c = i % cols
    // Center a short final row by counting how many items it holds.
    const itemsInRow = Math.min(cols, count - r * cols)
    const x = cols === 1 ? 50 : insetX + (spanX * (c + (cols - itemsInRow) / 2)) / (cols - 1)
    const y = rows === 1 ? 50 : insetY + (spanY * r) / (rows - 1)
    out.push({ left: fmt(x), top: fmt(y) })
  }
  return out
}

/**
 * Return label positions for a MetaballBloom cluster of `count` labels.
 * Returns exactly `count` entries, each a `%` left/top pair, with no duplicates.
 * The two onboarding counts (8 conditions, 9 feelings) match the HTML reference
 * grid; other counts use a balanced generated grid.
 */
export function metaballLabelPositions(count: number): MetaballPosition[] {
  if (count === 8) return CONDITIONS_8.map((p) => ({ ...p }))
  if (count === 9) return FEELINGS_9.map((p) => ({ ...p }))
  return generatedGrid(count)
}
