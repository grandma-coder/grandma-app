# Daily Message — interactive card draw

**Date:** 2026-07-11
**Status:** Approved (brainstorm) — pending implementation plan
**Scope:** Pregnancy mode only (banks are mode-aware so pre-preg/kids can be added later)

## Summary

Replace the passive "Daily Affirmation" quote on the pregnancy home with an
interactive daily ritual:

1. User taps a button on the home card.
2. A full-screen modal asks **one multiple-choice question** (from a ~200-item
   bank).
3. The chosen answer's **tags** are matched against a **card bank** (~300 items);
   a matched card animates in as the top of a **swipeable stacked deck** in the
   bold color-block style of the reference image.
4. The card is **saved** to a growing per-user **collection** the user can
   revisit.

One question per day, one official card per day. Re-opening shows the same saved
card. A new question appears the next day.

## Non-goals

- Not building pre-pregnancy or kids versions this round (content banks are
  mode-tagged so they can be added later with no code change).
- Not AI-generated cards — curated library only (card type leaves room for an AI
  source later, but that is out of scope here).
- Not removing the legacy `affirmations` table / `pregnancyAffirmations.ts` /
  `AffirmationRevealCard.tsx` / `affirmationTemplates.tsx` — they stay on disk,
  unused, for a later cleanup once the new flow is validated. No destructive
  removal in this work.
- Not authoring the full 200 questions + 300 cards in this implementation — see
  "Content authoring" below. We seed a **starter set** to prove the loop; the
  banks fill in incrementally as pure data.

## Content model

Two curated banks live under `lib/dailyMessage/`, both **mode-aware** (a `mode`
field; only `'pregnancy'` is populated now).

### Tag vocabulary — `lib/dailyMessage/tags.ts`

A single, typed source of truth (~15 tags) that both banks draw from, so answers
and cards stay aligned:

```
body, emotion, fear, joy, tired, overwhelmed, reassurance, calm,
partner, connection, strength, gratitude, birth, identity, wonder
```

Exported as a `DailyTag` union type. Adding a tag is a one-line change here;
banks reference tags by this type so a typo is a compile error.

### Question bank — `lib/dailyMessage/questions.pregnancy.ts`

~200 questions. Each:

```ts
interface DailyQuestion {
  id: string            // 'q_042'
  mode: JourneyMode     // 'pregnancy'
  prompt: string
  options: {            // 3–5 options
    label: string
    tags: DailyTag[]
  }[]
}
```

Example:

```ts
{
  id: 'q_042', mode: 'pregnancy',
  prompt: "How's your body treating you today?",
  options: [
    { label: 'Achy',      tags: ['body', 'reassurance'] },
    { label: 'Energized', tags: ['body', 'joy'] },
    { label: 'Exhausted', tags: ['tired', 'reassurance'] },
    { label: 'Numb',      tags: ['emotion', 'overwhelmed'] },
  ],
}
```

### Card bank — `lib/dailyMessage/cards.pregnancy.ts`

~300 cards. Each:

```ts
interface DailyCard {
  id: string            // 'c_118'
  mode: JourneyMode
  text: string
  tags: DailyTag[]
  color: StickerColorKey // sticker palette key: 'yellow' | 'coral' | 'pink' | 'blue' | …
}
```

Example:

```ts
{
  id: 'c_118', mode: 'pregnancy', color: 'coral',
  tags: ['body', 'reassurance', 'strength'],
  text: "Your body is doing something extraordinary and invisible. Ache is just the sound of it working.",
}
```

## Matching — `lib/dailyMessage/matcher.ts`

Pure, unit-testable function:

```ts
matchCard(optionTags: DailyTag[], mode: JourneyMode, exclude?: string[]): DailyCard
```

Algorithm:

1. Filter cards to `mode` and not in `exclude`.
2. Score each card by number of overlapping tags with `optionTags`.
3. Take the highest-scoring tier (score > 0); pick one **at random** within it.
4. **Fallback:** if no card has any overlap, return a random same-mode card.
   Never returns null / never a blank card.

`exclude` lets the reveal deck's peek cards differ from the top card, and lets
the daily draw avoid immediately repeating recently-shown cards (optional
enhancement, not required for v1).

## Daily question selection — `lib/dailyMessage/pickDailyQuestion.ts`

Deterministic: `pickDailyQuestion(date: string, userId: string, mode)` hashes
`(date + userId)` to an index into the mode's question bank, so the day's
question is **stable across re-opens** and rotates without repeats until the bank
cycles. Mirrors the dedup approach used by the existing
`20260509120000_affirmations_dedup_rpc.sql` migration (kept client-side here
since the banks are local).

## Data — `supabase/migrations/<ts>_daily_messages.sql`

```
daily_messages
  id           uuid pk default gen_random_uuid()
  user_id      uuid not null            -- auth.uid()
  date         date not null            -- local date string (toDateStr)
  question_id  text not null
  option_index int  not null
  card_id      text not null
  created_at   timestamptz default now()
  unique (user_id, date)
```

- RLS enabled; owner policy `USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`.
- Indexes on `user_id`, `created_at`.
- `NOTIFY pgrst, 'reload schema';` at end.
- Only the `card_id` / `question_id` are stored — **card and question content
  stay in the app banks**, so history and collection render by id lookup. This
  keeps the DB tiny and lets us edit copy without a data migration.

## Surfaces

### 1. Home entry — `DailyMessageCard.tsx` (replaces `AffirmationRevealCard`)

Two states:

- **Not answered today:** `DAILY MESSAGE` mono label + today's question prompt +
  a bold sticker-color **"Answer →"** button.
- **Answered today:** a mini of today's drawn card + `· N cards` count (→
  collection) + "tap to reopen" (reopens the saved card, no re-draw).

### 2. Draw modal — `DailyMessageModal.tsx` (full-screen)

Bold color-block style matching the reference image (bright sticker-color
background, heavy black sans). Three steps:

1. **Question:** heavy sans prompt + multiple-choice options as tappable rows.
   One tap → advance.
2. **Reveal:** matched card animates in as the **top of a stacked deck**; 2–3
   sticker-colored cards peek behind it (offset edges).
3. **Swipe:** swipe the top card to peek the cards behind (decorative
   adjacent-mood cards drawn via `matchCard(..., exclude: [topCardId])`). The
   **first** card is the official saved daily card. `Save / Done` + `Share`
   actions close the modal.

### 3. Collection — `MyCardsScreen.tsx` (or `app/my-cards.tsx`)

Grid of past color cards, newest first, rendered from the bank by stored
`card_id`. Tap → reopen a card full-screen.

## Component architecture

| File | Purpose |
|---|---|
| `lib/dailyMessage/tags.ts` | ~15-tag vocabulary (typed union) |
| `lib/dailyMessage/questions.pregnancy.ts` | question bank |
| `lib/dailyMessage/cards.pregnancy.ts` | card bank |
| `lib/dailyMessage/matcher.ts` | `matchCard` — pure, unit-tested |
| `lib/dailyMessage/pickDailyQuestion.ts` | deterministic daily question |
| `lib/dailyMessage/useDailyMessage.ts` | React Query: today's row, answer mutation, collection query |
| `components/home/pregnancy/DailyMessageCard.tsx` | home entry (both states) |
| `components/home/pregnancy/DailyMessageModal.tsx` | full-screen draw flow |
| `components/home/pregnancy/DailyMessageDeck.tsx` | swipeable stacked-deck primitive (reanimated) |
| `components/home/pregnancy/MyCardsScreen.tsx` | collection grid |
| `supabase/migrations/<ts>_daily_messages.sql` | table + RLS + unique(user_id,date) |

**Reuse:** existing `AffirmationShareModal` becomes the share surface (minor
adapt). Sticker palette + `getModeColor` for card colors. Reanimated (already in
the stack) for the swipe. Local dates via `toDateStr(new Date())` for `date`.

## Testing

- `matcher.ts` — unit: exact overlap, partial overlap, zero overlap (fallback),
  `exclude` respected, never returns null.
- `pickDailyQuestion.ts` — unit: deterministic (same input → same id), rotation
  covers the bank.
- Manual: home both states; draw flow; swipe deck; save; re-open same card;
  collection grid; **offline** (banks are local so the draw works offline — only
  the save/history write needs network; show today's card optimistically and let
  React Query retry the write).

## Content authoring (explicit scope flag)

The full ~200 questions + ~300 cards is a large writing task and is **data, not
code**. This implementation delivers:

- The **schema, tag vocabulary, matcher, and daily-pick** (all code).
- A **starter set: ~20 questions + ~40 cards** to prove the loop end-to-end.

The remaining questions/cards are added incrementally to the same two data files
with **no code change**. Do not treat "all 500 written" as part of this
implementation.

## Migration / removal

`AffirmationRevealCard` is removed from `PregnancyHome`'s render tree and
replaced by `DailyMessageCard`. The legacy files
(`AffirmationRevealCard.tsx`, `affirmationTemplates.tsx`,
`lib/pregnancyAffirmations.ts`, the `affirmations` table) remain untouched and
unused until a later cleanup pass — no destructive change in this work.
