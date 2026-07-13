# Rich shared Reminders — tags, notes, checklist, filter, wallet preview

**Date:** 2026-07-13
**Status:** Approved (brainstorm) — pending implementation plan
**Scope:** The shared `UserReminders` (mode-agnostic; used by pregnancy + cycle + kids via `context`). All behaviors inherit the change.

## Summary

Evolve reminders from a flat text+due list into a richer, more useful surface:

- **Tags** — free-form labels per reminder; a filter-chip row at the top of the sheet filters the list.
- **Notes** — free text per reminder.
- **Checklist** — sub-items (add / check / remove) inside a reminder.
- **Priority** — low / med / high (alongside the existing flag).
- **Wallet preview** — the home wallet's Reminders card shows the next 1–2 upcoming reminders inline (title · due), tap → full sheet.
- **Shape** — the reminders sheet reads as a real reminders surface (add row → filter chips → compact rows → tap-to-detail), not a raw add-row.

Everything lives in the single shared `UserReminders`, so pregnancy, cycle, and kids get it automatically ("reflected in all places").

## Non-goals

- No Supabase / cross-device sync — stays local AsyncStorage per `user + context` (existing key `grandma-reminders-${context}-${userId}`).
- No rigid buckets — grouping is via free tags, not one-bucket-per-reminder.
- No fixed tag taxonomy — tags are whatever the user types; the filter reflects their own used tags.
- Not touching the notifications mirror behavior (reminders still mirror to the `notifications` table as today; new fields are app-local only).

## Data model (shared, local, back-compat)

Extend the reminder type. All new fields OPTIONAL so existing stored reminders parse unchanged (missing → `undefined`).

```ts
// lib/reminders.ts
export interface ChecklistItem { id: string; text: string; done: boolean }

export interface Reminder {
  id: string
  text: string
  dueDate?: string | null
  dueTime?: string | null
  flagged?: boolean
  done?: boolean
  // NEW (all optional):
  tags?: string[]
  notes?: string
  checklist?: ChecklistItem[]
  priority?: 'low' | 'med' | 'high'
}
```

- Storage shape unchanged (same key, JSON array); we just serialize extra fields.
- Tags are per-context, derived from used tags (running set) — no global taxonomy.

## Shared helpers — `lib/reminders.ts`

Pure functions, extracted so the component AND the wallets read one source:

- `loadReminders(userId, context): Promise<Reminder[]>` — read + JSON-parse from the context storage key; returns `[]` when none/no user.
- `saveReminders(userId, context, list): Promise<void>` — serialize + persist.
- `upcomingReminders(list, n): Reminder[]` — not-done reminders sorted by (has due date asc, then flagged first, then created/id order), limited to `n`. Pure.
- `allTags(list): string[]` — unique tag list in first-seen order.
- `storageKey(userId, context): string | null` — the existing `grandma-reminders-${context}-${userId}` (null if no user).

## Reminders sheet UI (`UserReminders`, inside the LogSheet pop-up)

Top → bottom:

1. **Add row** — the existing "Add reminder" (bell + label + `+`) at the top; tap expands the inline composer. Composer gains: **tags input** (type to add / pick existing), the existing date/time chips, a small **notes** field, and a **priority** toggle. Checklist items are added in the detail view, not the quick composer (keeps add fast).
2. **Filter chips** — horizontal scroll of `allTags` with an `All` default; tap filters the list. Only rendered when ≥1 tag exists. Neutral hairline chips (selected = ink hairline) — NOT the mode/behavior color.
3. **Reminder rows** (compact, horizontal actions): checkbox · title · due chip · its tag chips · edit/flag/trash. A reminder with a checklist shows a small `▢ 2/5` progress hint.
4. **Tap a reminder → detail** — expands to: notes (editable), checklist (add/check/remove sub-items), tags, due, priority. Cream-paper style, hairline rows, `PillButton` save. This is where richer editing lives so the list stays scannable.

## Wallet preview

- `WeekWallet` (pregnancy) and `CycleWallet` (cycle) read `upcomingReminders(list, 2)` via `lib/reminders.ts` and render the next 1–2 inline in the Reminders wallet card (title · due), tap → opens the full reminders sheet.
- Empty → falls back to the current "Add reminder" label.
- This is the only wallet change; the shared component owns the rest.

## Files

| File | Change |
|---|---|
| `lib/reminders.ts` | **New.** Types (`Reminder`, `ChecklistItem`) + helpers (`loadReminders`, `saveReminders`, `upcomingReminders`, `allTags`, `storageKey`). |
| `lib/__tests__/reminders.test.ts` | **New.** Unit tests. |
| `components/home/UserReminders.tsx` | Extend model + composer (tags/notes/priority), filter chips, reminder detail (notes + checklist + tags). Consume `lib/reminders.ts`. Keep the compact row + horizontal actions. |
| `components/home/pregnancy/WeekWallet.tsx` | Reminders card previews next 1–2. |
| `components/home/cycle/CycleWallet.tsx` | Same preview treatment. |
| `lib/i18n/keys.ts` + 12 locale files | New keys (tags placeholder, add-tag, notes, checklist, priority low/med/high, item count). English placeheld. |

## Testing

- **Unit (`reminders.test.ts`):**
  - `upcomingReminders`: sorts by due date asc, flagged-first tiebreak, limits to `n`, excludes done.
  - `allTags`: dedupes, preserves first-seen order, `[]` when none.
  - Back-compat: parsing an old reminder (no tags/notes/checklist/priority) yields a valid `Reminder` with those fields `undefined` (no crash).
- **Manual:** add reminder with tags + notes + checklist; filter by a tag; check a checklist item → `2/5` hint updates; wallet shows next 1–2; switch to **cycle** mode → same behavior; kill/relaunch → persists; pre-existing reminders still render + are editable.

## Design-system notes

- Tag chips + filter chips: neutral hairline (selected = ink hairline / soft neutral fill). The mode/behavior color is reserved for small accents only, not tag fills.
- Reminder rows stay the compact horizontal-action layout already shipped.
- Sheet uses the shared `LogSheet` shell (correct cream in both variants).
