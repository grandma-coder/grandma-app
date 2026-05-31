/**
 * Deterministic per-phase content rotation keyed to cycle day.
 *
 * Same cycleDay → same result (no flicker when the app is reopened the same
 * day). Pure functions — no Math.random() / Date.now() — so they are testable
 * and safe under the workflow harness.
 */

/** Normalize a 1-based cycle day into a valid array index for `len` items. */
function indexFor(len: number, cycleDay: number): number {
  // cycleDay is 1-based; day 1 → index 0. The double-modulo guards negative /
  // zero days and handles wraparound when cycleDay exceeds the pool length.
  return (((cycleDay - 1) % len) + len) % len
}

/** Pick today's single item from a phase pool. Undefined if the pool is empty. */
export function pickForCycleDay<T>(pool: T[], cycleDay: number): T | undefined {
  if (pool.length === 0) return undefined
  return pool[indexFor(pool.length, cycleDay)]
}

/**
 * Pick a deterministic, contiguous slice of `count` items starting at today's
 * index, wrapping around the pool. Never returns more than the pool holds and
 * never repeats an item within a single slice.
 */
export function sliceForCycleDay<T>(pool: T[], cycleDay: number, count: number): T[] {
  if (pool.length === 0 || count <= 0) return []
  const n = Math.min(count, pool.length)
  const start = indexFor(pool.length, cycleDay)
  const out: T[] = []
  for (let i = 0; i < n; i++) {
    out.push(pool[(start + i) % pool.length])
  }
  return out
}
