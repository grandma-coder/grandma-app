/**
 * Readable text for a kids health-type log (note / health / temperature / vaccine / medicine).
 *
 * Values are stored in several shapes over time: plain strings ("37.2", "MMR"), JSON objects
 * with `value` / `name`, and free-form health events `{ eventType, text | description }`.
 * Rendering `log.value` directly leaked raw JSON into the UI — always go through here.
 */
export interface HealthLogText {
  /** Short kind, e.g. "Doctor visit", "Injury" — null when the type label should be used. */
  kind: string | null
  /** The main readable text, e.g. "Routine visit, all good", "37.2", "MMR". */
  text: string | null
}

const INTERNAL_KEYS = new Set(['routineId', 'routineName', 'routineType', 'childId', 'id', 'eventType'])

export function healthLogText(value: string | null | undefined, notes?: string | null): HealthLogText {
  const raw = (value ?? '').trim()
  const fallbackNotes = typeof notes === 'string' && notes.trim() ? notes.trim() : null
  if (!raw) return { kind: null, text: fallbackNotes }
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return { kind: null, text: raw } }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    const s = String(parsed).trim()
    return { kind: null, text: s || fallbackNotes }
  }
  const rec = parsed as Record<string, unknown>
  const str = (k: string) => (typeof rec[k] === 'string' && (rec[k] as string).trim() ? (rec[k] as string).trim() : null)
  const kind = str('eventType')
  const main = str('text') ?? str('description') ?? str('value') ?? str('name')
    ?? (typeof rec.value === 'number' ? String(rec.value) : null)
  if (main) return { kind, text: main === kind ? null : main }
  // Unknown object shape: readable leftovers only, never keys or internal ids.
  const rest = Object.entries(rec)
    .filter(([k, v]) => !INTERNAL_KEYS.has(k) && (typeof v === 'string' || typeof v === 'number') && String(v).trim())
    .map(([, v]) => String(v))
  return { kind, text: rest.join(' · ') || fallbackNotes }
}
