/**
 * Pure layout math for OrbitPicker — a 4-option single-select picker rendered as
 * a dashed ellipse ring with dot-nodes at its corners (trying-duration, birth-place,
 * care-provider, etc.)
 *
 * No RN imports — positions are plain percentage strings consumed by the caller
 * as `left`/`top` style values inside a `position: relative` container.
 */
export interface OrbitPos {
  left: string
  top: string
}

/**
 * The 4 reference corner positions, matching the `.orbnode` layout in the design
 * spec (100x100 percentage-positioned ellipse frame):
 *   top-left     → left 27%, top 22%
 *   top-right    → left 73%, top 22%
 *   bottom-left  → left 27%, top 78%
 *   bottom-right → left 73%, top 78%
 */
const FOUR_NODE_POSITIONS: OrbitPos[] = [
  { left: '27%', top: '22%' },
  { left: '73%', top: '22%' },
  { left: '27%', top: '78%' },
  { left: '73%', top: '78%' },
]

/**
 * Returns one { left, top } percentage position per option, laid out around the
 * dashed orbit ellipse.
 *
 * Only `count === 4` is currently specified by the design (the reference corners
 * above). Any other count falls back to reusing the same 4 corners in order
 * (wrapping if `count > 4`, truncating if `count < 4`) so callers never crash —
 * but 4 is the only supported/validated layout today.
 */
export function orbitNodePositions(count: number): OrbitPos[] {
  if (count === 4) {
    return [...FOUR_NODE_POSITIONS]
  }

  return Array.from({ length: count }, (_, i) => FOUR_NODE_POSITIONS[i % FOUR_NODE_POSITIONS.length])
}
