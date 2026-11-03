/** Strips accents and case so "usuarios" finds "Usuários". */
export const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()

/**
 * How well a query matches a label for the ⌘K palette: 0 = no match. An empty query matches
 * everything equally; a word start beats a match inside a word; every query word must appear.
 */
export function matchScore(query: string, text: string): number {
  const words = fold(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return 1
  const hay = fold(text)
  let score = 0
  for (const w of words) {
    const at = hay.indexOf(w)
    if (at < 0) return 0
    score += at === 0 ? 3 : /[\s/·-]/.test(hay[at - 1]) ? 2 : 1
  }
  return score
}
