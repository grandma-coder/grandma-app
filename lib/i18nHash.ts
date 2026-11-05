/**
 * FNV-1a 32-bit hash of a string, as 8 hex chars. Shared by the translation sync
 * scripts (manifest) and the app (bundled-translation freshness), so it must stay
 * dependency-free — no Node crypto in app code.
 */
export function fnv1a(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}
