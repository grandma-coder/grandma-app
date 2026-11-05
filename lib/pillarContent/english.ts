// English source for the bundled cycle-pillar translations, keyed exactly as the pillar
// screen asks for them (lib/pillarCopy.ts pillarContentKeys). Used by the translation
// sync (scripts/i18n) and the pillar content test.
import { prePregPillars } from '../prePregPillars'
import { pillarContentKeys } from '../pillarCopy'

export function pillarContentEnglish(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const p of prePregPillars) {
    if (p.intro) out[pillarContentKeys.intro(p.id)] = p.intro
    for (const tip of p.tips) {
      out[pillarContentKeys.tipLabel(p.id, tip.label)] = tip.label
      out[pillarContentKeys.tipBody(p.id, tip.label)] = tip.text
    }
    p.suggestions.forEach((q, i) => { out[pillarContentKeys.suggestion(p.id, i)] = q })
  }
  return out
}
