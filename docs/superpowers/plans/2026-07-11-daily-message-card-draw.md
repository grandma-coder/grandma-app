# Daily Message Card Draw — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the passive pregnancy "Daily Affirmation" with an interactive daily ritual — tap → answer one multiple-choice question → draw a tag-matched card in a bold swipeable stacked deck → save it to a per-user collection.

**Architecture:** Two curated content banks (questions, cards) under `lib/dailyMessage/`, joined by a shared tag vocabulary and a pure `matchCard` function. A deterministic per-day question pick. A tiny `daily_messages` Supabase table stores only ids (content stays in the app banks). Home entry card → full-screen draw modal (question → reveal → swipe deck) → collection grid. Pregnancy-only; banks are mode-aware for later.

**Tech Stack:** Expo SDK 54, React Native 0.81, React 19, TypeScript strict, Zustand v5, TanStack React Query v5, react-native-reanimated v4, react-native-svg, Supabase, Jest (`jest-expo`).

## Global Constraints

- Design system is non-negotiable — but the daily-message card is an intentional **bold color-block "moment" surface** (per approved spec): bright sticker-color background + heavy sans, distinct from the rest of the app. Card background colors come ONLY from the sticker palette keys: `yellow | blue | pink | green | lilac | peach | coral | charcoal`. No raw hex outside SVG assets.
- Import tokens from `constants/theme.ts` (`stickers`, `getModeColor`, `radius`, `font`) — never hardcode hex/radius/font/shadow. Shadows only `shadows.card/cardPop/pop/subtle`.
- Zustand v5 named import `import { create } from 'zustand'`. React Query v5 object syntax `useQuery({ queryKey, queryFn })`.
- Expo Router navigation `router.push()` — never `navigation.navigate()`.
- TypeScript strict — no `any`, no implicit returns.
- `profiles.id` IS the auth user UUID. For a per-user table filter `.eq('user_id', userId)` (this new table DOES have a `user_id` column).
- Local dates: `toDateStr(new Date())` from `lib/cycleLogic.ts` — never `toISOString().split('T')[0]`.
- Migrations: `supabase/migrations/YYYYMMDDHHMMSS_*.sql`, idempotent (`CREATE TABLE IF NOT EXISTS`), `ENABLE ROW LEVEL SECURITY`, owner policy `USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`, index `user_id`/`created_at`, end with `NOTIFY pgrst, 'reload schema';`.
- `JourneyMode = 'pre-pregnancy' | 'pregnancy' | 'kids'` from `types/index.ts`.
- Tests live in `lib/dailyMessage/__tests__/*.test.ts`, run with `npx jest <path>`.
- Commit after every task with the trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Work on `main` (no worktree/branch).

## File Structure

| File | Responsibility |
|---|---|
| `lib/dailyMessage/tags.ts` | Tag vocabulary (typed union) + `DailyTag` |
| `lib/dailyMessage/types.ts` | `DailyQuestion`, `DailyCard` interfaces |
| `lib/dailyMessage/cards.pregnancy.ts` | Card bank (starter ~40) |
| `lib/dailyMessage/questions.pregnancy.ts` | Question bank (starter ~20) |
| `lib/dailyMessage/matcher.ts` | `matchCard()` — pure |
| `lib/dailyMessage/pickDailyQuestion.ts` | `pickDailyQuestion()` — deterministic |
| `lib/dailyMessage/index.ts` | Barrel: `getQuestionById`, `getCardById`, bank accessors |
| `lib/dailyMessage/useDailyMessage.ts` | React Query hook: today's row, answer mutation, collection |
| `components/home/pregnancy/DailyMessageCard.tsx` | Home entry (both states) |
| `components/home/pregnancy/DailyMessageDeck.tsx` | Swipeable stacked-deck primitive |
| `components/home/pregnancy/DailyMessageModal.tsx` | Full-screen draw flow |
| `app/my-cards.tsx` | Collection grid route |
| `supabase/migrations/20260711120000_daily_messages.sql` | Table + RLS |

---

### Task 1: Tag vocabulary + content types

**Files:**
- Create: `lib/dailyMessage/tags.ts`
- Create: `lib/dailyMessage/types.ts`
- Test: `lib/dailyMessage/__tests__/tags.test.ts`

**Interfaces:**
- Produces: `DAILY_TAGS: readonly DailyTag[]`, `type DailyTag`, `interface DailyQuestion`, `interface DailyCard`, `type StickerColorKey`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/dailyMessage/__tests__/tags.test.ts
import { DAILY_TAGS } from '../tags'

describe('DAILY_TAGS', () => {
  it('has the 15 vocabulary tags and no duplicates', () => {
    expect(DAILY_TAGS).toContain('reassurance')
    expect(DAILY_TAGS.length).toBe(15)
    expect(new Set(DAILY_TAGS).size).toBe(DAILY_TAGS.length)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/dailyMessage/__tests__/tags.test.ts`
Expected: FAIL — cannot find module `../tags`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/dailyMessage/tags.ts
export const DAILY_TAGS = [
  'body', 'emotion', 'fear', 'joy', 'tired', 'overwhelmed', 'reassurance',
  'calm', 'partner', 'connection', 'strength', 'gratitude', 'birth',
  'identity', 'wonder',
] as const

export type DailyTag = typeof DAILY_TAGS[number]
```

```ts
// lib/dailyMessage/types.ts
import type { JourneyMode } from '../../types'
import type { DailyTag } from './tags'

// Bold sticker-palette background colors for cards.
export type StickerColorKey =
  | 'yellow' | 'blue' | 'pink' | 'green' | 'lilac' | 'peach' | 'coral' | 'charcoal'

export interface DailyQuestion {
  id: string
  mode: JourneyMode
  prompt: string
  options: { label: string; tags: DailyTag[] }[]
}

export interface DailyCard {
  id: string
  mode: JourneyMode
  text: string
  tags: DailyTag[]
  color: StickerColorKey
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/dailyMessage/__tests__/tags.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/dailyMessage/tags.ts lib/dailyMessage/types.ts lib/dailyMessage/__tests__/tags.test.ts
git commit -m "feat(daily-message): tag vocabulary + content types

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Starter content banks + barrel accessors

**Files:**
- Create: `lib/dailyMessage/cards.pregnancy.ts`
- Create: `lib/dailyMessage/questions.pregnancy.ts`
- Create: `lib/dailyMessage/index.ts`
- Test: `lib/dailyMessage/__tests__/banks.test.ts`

**Interfaces:**
- Consumes: `DailyQuestion`, `DailyCard` (Task 1).
- Produces: `PREGNANCY_CARDS: DailyCard[]`, `PREGNANCY_QUESTIONS: DailyQuestion[]`, and from `index.ts`: `getQuestionsForMode(mode)`, `getCardsForMode(mode)`, `getQuestionById(id)`, `getCardById(id)`.

> **Scope note:** This task seeds the **starter set (~20 questions, ~40 cards)** to prove the loop. The remaining questions/cards are added later to these same two files with no code change. Do NOT block this task on writing all 200/300.

- [ ] **Step 1: Write the failing test**

```ts
// lib/dailyMessage/__tests__/banks.test.ts
import { DAILY_TAGS } from '../tags'
import { PREGNANCY_QUESTIONS, PREGNANCY_CARDS } from '../questions.pregnancy'  // re-exported below
import { getQuestionById, getCardById, getCardsForMode } from '../index'

describe('content banks', () => {
  it('has a starter set of questions and cards', () => {
    expect(PREGNANCY_QUESTIONS.length).toBeGreaterThanOrEqual(20)
    expect(PREGNANCY_CARDS.length).toBeGreaterThanOrEqual(40)
  })
  it('every question option tag is in the vocabulary', () => {
    for (const q of PREGNANCY_QUESTIONS)
      for (const o of q.options)
        for (const t of o.tags)
          expect(DAILY_TAGS).toContain(t)
  })
  it('every card tag is in the vocabulary and ids are unique', () => {
    const ids = new Set<string>()
    for (const c of PREGNANCY_CARDS) {
      expect(ids.has(c.id)).toBe(false); ids.add(c.id)
      for (const t of c.tags) expect(DAILY_TAGS).toContain(t)
    }
  })
  it('lookups resolve by id', () => {
    expect(getQuestionById(PREGNANCY_QUESTIONS[0].id)?.id).toBe(PREGNANCY_QUESTIONS[0].id)
    expect(getCardById(PREGNANCY_CARDS[0].id)?.id).toBe(PREGNANCY_CARDS[0].id)
    expect(getCardsForMode('pregnancy').length).toBe(PREGNANCY_CARDS.length)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/dailyMessage/__tests__/banks.test.ts`
Expected: FAIL — cannot find modules.

- [ ] **Step 3: Write minimal implementation**

Create `lib/dailyMessage/cards.pregnancy.ts` with **at least 40** `DailyCard` objects. Each `id` `c_001`…, unique, `mode: 'pregnancy'`, tags from the vocabulary, `color` a sticker key. Vary colors and cover every tag at least twice. Example rows (write ~40 in this real, warm pregnancy voice):

```ts
import type { DailyCard } from './types'

export const PREGNANCY_CARDS: DailyCard[] = [
  { id: 'c_001', mode: 'pregnancy', color: 'coral', tags: ['body', 'reassurance', 'strength'],
    text: "Your body is doing something extraordinary and invisible. Ache is just the sound of it working." },
  { id: 'c_002', mode: 'pregnancy', color: 'yellow', tags: ['joy', 'wonder'],
    text: "Somewhere under your heart, a whole new person is practicing being alive today." },
  { id: 'c_003', mode: 'pregnancy', color: 'lilac', tags: ['fear', 'reassurance', 'calm'],
    text: "You don't have to feel ready. Readiness arrives in the doing, not before it." },
  { id: 'c_004', mode: 'pregnancy', color: 'blue', tags: ['tired', 'reassurance'],
    text: "Rest is not falling behind. Rest is part of the work your body is already doing." },
  { id: 'c_005', mode: 'pregnancy', color: 'pink', tags: ['overwhelmed', 'calm'],
    text: "You can only carry one moment at a time. Set the rest down; it will wait." },
  // …write ~35 more covering: emotion, partner, connection, gratitude, birth, identity, wonder, fear, joy…
]
```

Create `lib/dailyMessage/questions.pregnancy.ts` with **at least 20** `DailyQuestion` objects (`q_001`…), each 3–5 options with vocabulary tags. Re-export cards so the test's single import works:

```ts
import type { DailyQuestion } from './types'
export { PREGNANCY_CARDS } from './cards.pregnancy'

export const PREGNANCY_QUESTIONS: DailyQuestion[] = [
  { id: 'q_001', mode: 'pregnancy',
    prompt: "How's your body treating you today?",
    options: [
      { label: 'Achy',      tags: ['body', 'reassurance'] },
      { label: 'Energized', tags: ['body', 'joy'] },
      { label: 'Exhausted', tags: ['tired', 'reassurance'] },
      { label: 'Numb',      tags: ['emotion', 'overwhelmed'] },
    ] },
  { id: 'q_002', mode: 'pregnancy',
    prompt: "What's loudest in your head right now?",
    options: [
      { label: 'Worry',      tags: ['fear', 'reassurance'] },
      { label: 'Excitement', tags: ['joy', 'wonder'] },
      { label: 'To-do lists',tags: ['overwhelmed', 'calm'] },
      { label: 'Nothing',    tags: ['calm'] },
    ] },
  // …write ~18 more covering partner, connection, gratitude, birth, identity…
]
```

Create the barrel:

```ts
// lib/dailyMessage/index.ts
import type { JourneyMode } from '../../types'
import type { DailyQuestion, DailyCard } from './types'
import { PREGNANCY_QUESTIONS } from './questions.pregnancy'
import { PREGNANCY_CARDS } from './cards.pregnancy'

const QUESTIONS_BY_MODE: Record<JourneyMode, DailyQuestion[]> = {
  'pre-pregnancy': [], pregnancy: PREGNANCY_QUESTIONS, kids: [],
}
const CARDS_BY_MODE: Record<JourneyMode, DailyCard[]> = {
  'pre-pregnancy': [], pregnancy: PREGNANCY_CARDS, kids: [],
}

export const getQuestionsForMode = (m: JourneyMode) => QUESTIONS_BY_MODE[m]
export const getCardsForMode = (m: JourneyMode) => CARDS_BY_MODE[m]
export const getQuestionById = (id: string) =>
  [...PREGNANCY_QUESTIONS].find((q) => q.id === id)
export const getCardById = (id: string) =>
  [...PREGNANCY_CARDS].find((c) => c.id === id)

export * from './types'
export * from './tags'
export { matchCard } from './matcher'
export { pickDailyQuestion } from './pickDailyQuestion'
```

> Note: the `matcher`/`pickDailyQuestion` re-exports reference files created in Tasks 3–4. If running strictly in order, add those two `export` lines at the end of Task 4 instead. Keeping them here documents the final barrel; remove-and-re-add is acceptable.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/dailyMessage/__tests__/banks.test.ts`
Expected: PASS. (If the barrel's matcher/pick re-exports break the build now, comment those two lines until Tasks 3–4.)

- [ ] **Step 5: Commit**

```bash
git add lib/dailyMessage/cards.pregnancy.ts lib/dailyMessage/questions.pregnancy.ts lib/dailyMessage/index.ts lib/dailyMessage/__tests__/banks.test.ts
git commit -m "feat(daily-message): starter question + card banks with barrel

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: `matchCard` matcher

**Files:**
- Create: `lib/dailyMessage/matcher.ts`
- Test: `lib/dailyMessage/__tests__/matcher.test.ts`

**Interfaces:**
- Consumes: `DailyCard`, `DailyTag` (Task 1); `getCardsForMode` (Task 2).
- Produces: `matchCard(optionTags: DailyTag[], mode: JourneyMode, opts?: { exclude?: string[]; rng?: () => number }): DailyCard`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/dailyMessage/__tests__/matcher.test.ts
import { matchCard } from '../matcher'
import type { DailyCard } from '../types'

// Deterministic rng: always pick index 0 of the top tier.
const first = () => 0

describe('matchCard', () => {
  it('returns a card sharing the most tags', () => {
    const c = matchCard(['tired', 'reassurance'], 'pregnancy', { rng: first })
    expect(c.tags).toEqual(expect.arrayContaining(['reassurance']))
  })
  it('falls back to a same-mode card when no tag overlaps', () => {
    const c = matchCard([], 'pregnancy', { rng: first })
    expect(c.mode).toBe('pregnancy')
    expect(c).toBeTruthy()
  })
  it('never returns an excluded card when alternatives exist', () => {
    const a = matchCard(['reassurance'], 'pregnancy', { rng: first })
    const b = matchCard(['reassurance'], 'pregnancy', { exclude: [a.id], rng: first })
    expect(b.id).not.toBe(a.id)
  })
  it('never returns null', () => {
    expect(matchCard(['wonder'], 'pregnancy', { rng: first })).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/dailyMessage/__tests__/matcher.test.ts`
Expected: FAIL — cannot find `../matcher`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/dailyMessage/matcher.ts
import type { JourneyMode } from '../../types'
import type { DailyCard, DailyTag } from './types'
import { getCardsForMode } from './index'

interface MatchOpts { exclude?: string[]; rng?: () => number }

// Match an answer's tags to a card: score by tag overlap, pick randomly within
// the highest-scoring tier. Falls back to any same-mode card so it never blanks.
export function matchCard(optionTags: DailyTag[], mode: JourneyMode, opts: MatchOpts = {}): DailyCard {
  const rng = opts.rng ?? Math.random
  const exclude = new Set(opts.exclude ?? [])
  const pool = getCardsForMode(mode).filter((c) => !exclude.has(c.id))
  const candidates = pool.length ? pool : getCardsForMode(mode) // exclude-everything guard

  const wanted = new Set(optionTags)
  const scored = candidates.map((c) => ({
    card: c,
    score: c.tags.reduce((n, t) => (wanted.has(t) ? n + 1 : n), 0),
  }))
  const top = Math.max(0, ...scored.map((s) => s.score))
  const tier = top > 0 ? scored.filter((s) => s.score === top) : scored
  return tier[Math.floor(rng() * tier.length)].card
}
```

> **Circular-import note:** `matcher.ts` imports `getCardsForMode` from `./index`, and `./index` re-exports `matchCard`. This is fine in Metro/TS (function bodies run lazily), but if a load-order error appears, import from `./cards.pregnancy` directly via a small `getCardsForMode` local instead. Verify by running the test.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/dailyMessage/__tests__/matcher.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/dailyMessage/matcher.ts lib/dailyMessage/__tests__/matcher.test.ts
git commit -m "feat(daily-message): tag-overlap card matcher with fallback

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Deterministic daily question pick

**Files:**
- Create: `lib/dailyMessage/pickDailyQuestion.ts`
- Modify: `lib/dailyMessage/index.ts` (ensure `matchCard` + `pickDailyQuestion` re-exports are present/uncommented)
- Test: `lib/dailyMessage/__tests__/pickDailyQuestion.test.ts`

**Interfaces:**
- Consumes: `DailyQuestion` (Task 1); `getQuestionsForMode` (Task 2).
- Produces: `pickDailyQuestion(date: string, userId: string, mode: JourneyMode): DailyQuestion`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/dailyMessage/__tests__/pickDailyQuestion.test.ts
import { pickDailyQuestion } from '../pickDailyQuestion'

describe('pickDailyQuestion', () => {
  it('is deterministic for the same date + user', () => {
    const a = pickDailyQuestion('2026-07-11', 'user-1', 'pregnancy')
    const b = pickDailyQuestion('2026-07-11', 'user-1', 'pregnancy')
    expect(a.id).toBe(b.id)
  })
  it('varies across days', () => {
    const days = ['2026-07-11','2026-07-12','2026-07-13','2026-07-14','2026-07-15']
      .map((d) => pickDailyQuestion(d, 'user-1', 'pregnancy').id)
    expect(new Set(days).size).toBeGreaterThan(1)
  })
  it('always returns a pregnancy question', () => {
    expect(pickDailyQuestion('2026-07-11', 'user-1', 'pregnancy').mode).toBe('pregnancy')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/dailyMessage/__tests__/pickDailyQuestion.test.ts`
Expected: FAIL — cannot find `../pickDailyQuestion`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/dailyMessage/pickDailyQuestion.ts
import type { JourneyMode } from '../../types'
import type { DailyQuestion } from './types'
import { getQuestionsForMode } from './index'

// Stable string hash (djb2) → non-negative int.
function hash(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

// Deterministic per (date, user): same input → same question; rotates by day.
export function pickDailyQuestion(date: string, userId: string, mode: JourneyMode): DailyQuestion {
  const bank = getQuestionsForMode(mode)
  const idx = hash(`${date}:${userId}`) % bank.length
  return bank[idx]
}
```

Ensure `lib/dailyMessage/index.ts` ends with (uncommented):

```ts
export { matchCard } from './matcher'
export { pickDailyQuestion } from './pickDailyQuestion'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/dailyMessage/__tests__/pickDailyQuestion.test.ts && npx jest lib/dailyMessage`
Expected: PASS (all daily-message tests green).

- [ ] **Step 5: Commit**

```bash
git add lib/dailyMessage/pickDailyQuestion.ts lib/dailyMessage/index.ts lib/dailyMessage/__tests__/pickDailyQuestion.test.ts
git commit -m "feat(daily-message): deterministic daily question pick

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: `daily_messages` migration

**Files:**
- Create: `supabase/migrations/20260711120000_daily_messages.sql`

**Interfaces:**
- Produces: table `daily_messages (id, user_id, date, question_id, option_index, card_id, created_at)`, RLS owner policy, `unique(user_id, date)`.

- [ ] **Step 1: Write the migration**

```sql
-- Daily Message: one drawn card per user per day.
-- Stores only ids; card/question CONTENT lives in the app banks.
CREATE TABLE IF NOT EXISTS daily_messages (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date         DATE        NOT NULL,
  question_id  TEXT        NOT NULL,
  option_index INT         NOT NULL,
  card_id      TEXT        NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, date)
);

ALTER TABLE daily_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_messages_owner" ON daily_messages
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS daily_messages_user_id_idx    ON daily_messages (user_id);
CREATE INDEX IF NOT EXISTS daily_messages_created_at_idx ON daily_messages (created_at);

NOTIFY pgrst, 'reload schema';
```

- [ ] **Step 2: Verify SQL is well-formed**

Run: `grep -c "ENABLE ROW LEVEL SECURITY" supabase/migrations/20260711120000_daily_messages.sql`
Expected: `1`. Visually confirm the owner policy, unique constraint, and `NOTIFY` line are present.

- [ ] **Step 3: Commit** (do NOT push to remote DB here — apply happens later with `supabase db push`)

```bash
git add supabase/migrations/20260711120000_daily_messages.sql
git commit -m "feat(daily-message): daily_messages table + RLS migration

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: `useDailyMessage` React Query hook

**Files:**
- Create: `lib/dailyMessage/useDailyMessage.ts`
- Test: `lib/dailyMessage/__tests__/useDailyMessage.test.ts` (logic-only unit test of the answer→card selection helper; the hook itself is verified manually)

**Interfaces:**
- Consumes: `pickDailyQuestion`, `matchCard`, `getQuestionById`, `getCardById` (Tasks 2–4); `supabase` from `lib/supabase`; `toDateStr` from `lib/cycleLogic`; `useModeStore`.
- Produces:
  - `resolveAnswer(question: DailyQuestion, optionIndex: number, exclude?: string[]): DailyCard` (pure helper, exported for test)
  - `useDailyMessage()` → `{ todayQuestion, todayEntry, todayCard, isAnswered, collection, answer, isSaving }` where `answer(optionIndex: number) => Promise<DailyCard>`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/dailyMessage/__tests__/useDailyMessage.test.ts
import { resolveAnswer } from '../useDailyMessage'
import { PREGNANCY_QUESTIONS } from '../questions.pregnancy'

describe('resolveAnswer', () => {
  it('returns a card matching the chosen option', () => {
    const q = PREGNANCY_QUESTIONS[0]
    const card = resolveAnswer(q, 0, [])
    expect(card).toBeTruthy()
    expect(card.mode).toBe('pregnancy')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/dailyMessage/__tests__/useDailyMessage.test.ts`
Expected: FAIL — cannot find `../useDailyMessage`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/dailyMessage/useDailyMessage.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { toDateStr } from '../cycleLogic'
import { useModeStore } from '../../store/useModeStore'
import { pickDailyQuestion } from './pickDailyQuestion'
import { matchCard } from './matcher'
import { getCardById } from './index'
import type { DailyCard, DailyQuestion } from './types'

export interface DailyMessageRow {
  id: string; user_id: string; date: string
  question_id: string; option_index: number; card_id: string; created_at: string
}

// Pure: given a question + chosen option, produce the matched card.
export function resolveAnswer(question: DailyQuestion, optionIndex: number, exclude: string[] = []): DailyCard {
  const opt = question.options[optionIndex]
  return matchCard(opt.tags, question.mode, { exclude })
}

const KEY = ['daily-message']

export function useDailyMessage() {
  const mode = useModeStore((s) => s.mode)
  const qc = useQueryClient()
  const today = toDateStr(new Date())

  const entryQ = useQuery({
    queryKey: [...KEY, 'today', today],
    queryFn: async (): Promise<DailyMessageRow | null> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      const { data, error } = await supabase
        .from('daily_messages').select('*')
        .eq('user_id', user.id).eq('date', today).limit(1)
      if (error) throw error
      return data?.[0] ?? null
    },
  })

  const collectionQ = useQuery({
    queryKey: [...KEY, 'collection'],
    queryFn: async (): Promise<DailyMessageRow[]> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      const { data, error } = await supabase
        .from('daily_messages').select('*')
        .eq('user_id', user.id).order('date', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  const { data: { user } = { user: null } } = { data: { user: null } } // placeholder; user fetched in mutation

  const todayQuestion: DailyQuestion | null = (() => {
    // userId only needed for stable rotation; fall back to 'anon' before auth resolves.
    return pickDailyQuestion(today, entryQ.data?.user_id ?? 'anon', mode)
  })()

  const todayCard: DailyCard | null =
    entryQ.data ? getCardById(entryQ.data.card_id) ?? null : null

  const answerM = useMutation({
    mutationFn: async (optionIndex: number): Promise<DailyCard> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')
      const question = pickDailyQuestion(today, user.id, mode)
      const card = resolveAnswer(question, optionIndex)
      const { error } = await supabase.from('daily_messages').upsert(
        { user_id: user.id, date: today, question_id: question.id, option_index: optionIndex, card_id: card.id },
        { onConflict: 'user_id,date' },
      )
      if (error) throw error
      return card
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...KEY, 'today', today] })
      qc.invalidateQueries({ queryKey: [...KEY, 'collection'] })
    },
  })

  return {
    todayQuestion,
    todayEntry: entryQ.data ?? null,
    todayCard,
    isAnswered: !!entryQ.data,
    collection: collectionQ.data ?? [],
    answer: (optionIndex: number) => answerM.mutateAsync(optionIndex),
    isSaving: answerM.isPending,
  }
}
```

> The `const { data: { user } … }` placeholder line above is dead scaffolding — **delete it** when implementing; `todayQuestion` uses `entryQ.data?.user_id ?? 'anon'`, and the mutation fetches the real user. Keep the rotation stable by preferring the row's `user_id` once loaded.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/dailyMessage/__tests__/useDailyMessage.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck + commit**

Run: `npx tsc --noEmit 2>&1 | grep dailyMessage || echo clean`
Expected: `clean`.

```bash
git add lib/dailyMessage/useDailyMessage.ts lib/dailyMessage/__tests__/useDailyMessage.test.ts
git commit -m "feat(daily-message): useDailyMessage hook + resolveAnswer helper

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: `DailyMessageDeck` swipeable stacked-deck primitive

**Files:**
- Create: `components/home/pregnancy/DailyMessageDeck.tsx`

**Interfaces:**
- Consumes: `DailyCard` (Task 1); `stickers` from `constants/theme`; `Animated` + `PanResponder` from `react-native` (both already available — **`react-native-gesture-handler` is NOT installed**, so we use the built-in `Animated`/`PanResponder`, no new native dep, no EAS rebuild).
- Produces: `DailyMessageDeck({ cards, onTopSwiped }: { cards: DailyCard[]; onTopSwiped?: (card: DailyCard) => void })` — renders `cards` as an offset stack; the top card is horizontally swipeable; on swipe-away it advances and calls `onTopSwiped`.

- [ ] **Step 1: Confirm no gesture-handler dependency is needed**

Run: `node -e "require('./package.json').dependencies['react-native-gesture-handler'] ? console.log('present') : console.log('absent — using RN Animated/PanResponder')"`
Expected: `absent — using RN Animated/PanResponder`. (If it ever becomes present, the built-in approach below still works — do not add the dep.)

- [ ] **Step 2: Write the component (RN Animated + PanResponder — no new dep)**

```tsx
// components/home/pregnancy/DailyMessageDeck.tsx
import { useRef, useState } from 'react'
import { View, Text, StyleSheet, useWindowDimensions, Animated, PanResponder } from 'react-native'
import { stickers, radius, font } from '../../../constants/theme'
import type { DailyCard } from '../../../lib/dailyMessage/types'

interface Props {
  cards: DailyCard[]
  onTopSwiped?: (card: DailyCard) => void
}

// Bold color-block deck: top card swipes horizontally to reveal the peek cards
// stacked behind it (offset + scaled down). Message text is heavy sans on the
// card's sticker color. Uses RN's built-in Animated + PanResponder (no
// react-native-gesture-handler dependency).
export function DailyMessageDeck({ cards, onTopSwiped }: Props) {
  const { width } = useWindowDimensions()
  const [index, setIndex] = useState(0)
  const pan = useRef(new Animated.ValueXY()).current

  const advance = (card: DailyCard) => {
    onTopSwiped?.(card)
    setIndex((i) => Math.min(i + 1, cards.length - 1))
    pan.setValue({ x: 0, y: 0 })
  }

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8,
      onPanResponderMove: Animated.event([null, { dx: pan.x }], { useNativeDriver: false }),
      onPanResponderRelease: (_, g) => {
        const hasNext = index < cards.length - 1
        if (Math.abs(g.dx) > width * 0.3 && hasNext) {
          Animated.timing(pan, {
            toValue: { x: Math.sign(g.dx) * width, y: 0 },
            duration: 200,
            useNativeDriver: false,
          }).start(() => advance(cards[index]))
        } else {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start()
        }
      },
    }),
  ).current

  const rotate = pan.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: ['-8deg', '0deg', '8deg'],
  })

  const visible = cards.slice(index, index + 3)
  return (
    <View style={styles.wrap}>
      {visible
        .map((card, i) => ({ card, i }))
        .reverse() // render back-to-front so the top card sits above
        .map(({ card, i }) => {
          const isTop = i === 0
          const body = (
            <View style={[styles.card, { backgroundColor: stickers[card.color] }]}>
              <View style={styles.dot} />
              <Text style={styles.cardText}>{card.text}</Text>
            </View>
          )
          if (!isTop) {
            return (
              <View key={card.id} style={[styles.abs, { top: i * 10, transform: [{ scale: 1 - i * 0.05 }], zIndex: 10 - i }]}>
                {body}
              </View>
            )
          }
          return (
            <Animated.View
              key={card.id}
              {...responder.panHandlers}
              style={[styles.abs, { zIndex: 20, transform: [{ translateX: pan.x }, { rotate }] }]}
            >
              {body}
            </Animated.View>
          )
        })}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { height: 420, alignItems: 'center', justifyContent: 'flex-start' },
  abs: { position: 'absolute', width: '86%', alignSelf: 'center' },
  card: { minHeight: 380, borderRadius: radius.lg, padding: 28, justifyContent: 'flex-start', gap: 20 },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: stickers.charcoal },
  cardText: { fontFamily: font.display, fontSize: 26, lineHeight: 32, color: stickers.charcoal },
})
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep DailyMessageDeck || echo clean`
Expected: `clean`.

- [ ] **Step 4: Commit**

```bash
git add components/home/pregnancy/DailyMessageDeck.tsx
git commit -m "feat(daily-message): swipeable stacked-deck primitive

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: `DailyMessageModal` draw flow

**Files:**
- Create: `components/home/pregnancy/DailyMessageModal.tsx`

**Interfaces:**
- Consumes: `useDailyMessage`, `resolveAnswer`, `matchCard`, `getCardById` (Task 6/3/2); `DailyMessageDeck` (Task 7); `AffirmationShareModal` (existing: `{ visible, phrase, mode, onClose }`); `stickers`, `font`, `radius`.
- Produces: `DailyMessageModal({ visible, onClose }: { visible: boolean; onClose: () => void })` — full-screen `Modal` with two phases: `question` and `reveal`.

- [ ] **Step 1: Write the component**

```tsx
// components/home/pregnancy/DailyMessageModal.tsx
import { useEffect, useState } from 'react'
import { Modal, View, Text, Pressable, StyleSheet, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { X } from 'lucide-react-native'
import { stickers, font, radius } from '../../../constants/theme'
import { useDailyMessage } from '../../../lib/dailyMessage/useDailyMessage'
import { matchCard } from '../../../lib/dailyMessage/matcher'
import { DailyMessageDeck } from './DailyMessageDeck'
import { AffirmationShareModal } from './AffirmationShareModal'
import type { DailyCard } from '../../../lib/dailyMessage/types'

interface Props { visible: boolean; onClose: () => void }

export function DailyMessageModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets()
  const { todayQuestion, todayCard, isAnswered, answer, isSaving } = useDailyMessage()
  const [phase, setPhase] = useState<'question' | 'reveal'>('question')
  const [deck, setDeck] = useState<DailyCard[]>([])
  const [shareCard, setShareCard] = useState<DailyCard | null>(null)

  // If already answered when opened, jump straight to the saved card.
  useEffect(() => {
    if (!visible) { setPhase('question'); setDeck([]); return }
    if (isAnswered && todayCard) { buildDeck(todayCard); setPhase('reveal') }
  }, [visible, isAnswered, todayCard])

  function buildDeck(top: DailyCard) {
    // top card + 2 decorative peek cards from the same tags, excluding the top.
    const p1 = matchCard(top.tags, top.mode, { exclude: [top.id] })
    const p2 = matchCard(top.tags, top.mode, { exclude: [top.id, p1.id] })
    setDeck([top, p1, p2])
  }

  async function pick(optionIndex: number) {
    const card = await answer(optionIndex)
    buildDeck(card)
    setPhase('reveal')
  }

  if (!todayQuestion) return null
  const accent = stickers.lilac

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.fill, { backgroundColor: phase === 'question' ? accent : stickers.charcoal, paddingTop: insets.top + 12 }]}>
        <Pressable onPress={onClose} style={styles.close} hitSlop={12}>
          <X size={22} color={stickers.charcoal} strokeWidth={2.2} />
        </Pressable>

        {phase === 'question' ? (
          <ScrollView contentContainerStyle={styles.qBody}>
            <Text style={styles.qEyebrow}>DAILY MESSAGE</Text>
            <Text style={styles.qPrompt}>{todayQuestion.prompt}</Text>
            <View style={{ gap: 12, marginTop: 24 }}>
              {todayQuestion.options.map((o, i) => (
                <Pressable key={o.label} disabled={isSaving} onPress={() => pick(i)} style={styles.option}>
                  <Text style={styles.optionText}>{o.label}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        ) : (
          <View style={{ flex: 1, paddingTop: 24 }}>
            <DailyMessageDeck cards={deck} />
            <View style={styles.actions}>
              <Pressable onPress={() => setShareCard(deck[0])} style={styles.action}>
                <Text style={styles.actionText}>Share</Text>
              </Pressable>
              <Pressable onPress={onClose} style={styles.action}>
                <Text style={styles.actionText}>Done</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      <AffirmationShareModal
        visible={!!shareCard}
        phrase={shareCard?.text ?? ''}
        mode="pregnancy"
        onClose={() => setShareCard(null)}
      />
    </Modal>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1, paddingHorizontal: 24 },
  close: { alignSelf: 'flex-end', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  qBody: { paddingTop: 16, paddingBottom: 40 },
  qEyebrow: { fontFamily: font.bodySemiBold, fontSize: 11, letterSpacing: 2, color: stickers.charcoal, opacity: 0.7 },
  qPrompt: { fontFamily: font.display, fontSize: 30, lineHeight: 36, color: stickers.charcoal, marginTop: 10 },
  option: { backgroundColor: 'rgba(42,38,36,0.08)', borderRadius: radius.md, paddingVertical: 18, paddingHorizontal: 20 },
  optionText: { fontFamily: font.bodySemiBold, fontSize: 17, color: stickers.charcoal },
  actions: { flexDirection: 'row', gap: 16, justifyContent: 'center', paddingVertical: 20 },
  action: { paddingVertical: 12, paddingHorizontal: 28, borderRadius: radius.full, backgroundColor: stickers.yellow },
  actionText: { fontFamily: font.bodySemiBold, fontSize: 15, color: stickers.charcoal },
})
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep DailyMessageModal || echo clean`
Expected: `clean`. (Confirm `AffirmationShareModal` accepts `phrase`/`mode`; adjust the prop name if the real signature differs.)

- [ ] **Step 3: Commit**

```bash
git add components/home/pregnancy/DailyMessageModal.tsx
git commit -m "feat(daily-message): full-screen draw flow (question + reveal deck)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: `DailyMessageCard` home entry + swap into PregnancyHome

**Files:**
- Create: `components/home/pregnancy/DailyMessageCard.tsx`
- Modify: `components/home/PregnancyHome.tsx` (~line 328–330: replace `<AffirmationRevealCard />` with `<DailyMessageCard />`; remove the now-unused import at line 55)

**Interfaces:**
- Consumes: `useDailyMessage` (Task 6); `DailyMessageModal` (Task 8); `getCardById`; `stickers`, `font`, `radius`; `router` from `expo-router`.
- Produces: `DailyMessageCard()` — the home surface with both states, opens the modal, links to `/my-cards`.

- [ ] **Step 1: Write the component**

```tsx
// components/home/pregnancy/DailyMessageCard.tsx
import { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { PaperCard } from '../../ui/PaperCard'
import { stickers, font, radius } from '../../../constants/theme'
import { useDailyMessage } from '../../../lib/dailyMessage/useDailyMessage'
import { DailyMessageModal } from './DailyMessageModal'

export function DailyMessageCard() {
  const { todayQuestion, todayCard, isAnswered, collection } = useDailyMessage()
  const [open, setOpen] = useState(false)
  if (!todayQuestion) return null

  return (
    <>
      <Pressable onPress={() => setOpen(true)}>
        <PaperCard>
          <Text style={styles.eyebrow}>
            DAILY MESSAGE{isAnswered ? ` · ${collection.length} CARDS` : ''}
          </Text>
          {isAnswered && todayCard ? (
            <View style={[styles.mini, { backgroundColor: stickers[todayCard.color] }]}>
              <Text style={styles.miniText} numberOfLines={3}>{todayCard.text}</Text>
            </View>
          ) : (
            <>
              <Text style={styles.prompt}>{todayQuestion.prompt}</Text>
              <View style={styles.cta}><Text style={styles.ctaText}>Answer →</Text></View>
            </>
          )}
          {isAnswered ? (
            <Pressable onPress={() => router.push('/my-cards')} hitSlop={8}>
              <Text style={styles.link}>View all cards</Text>
            </Pressable>
          ) : null}
        </PaperCard>
      </Pressable>
      <DailyMessageModal visible={open} onClose={() => setOpen(false)} />
    </>
  )
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: font.bodySemiBold, fontSize: 11, letterSpacing: 2, color: stickers.charcoal, opacity: 0.6 },
  prompt: { fontFamily: font.display, fontSize: 22, lineHeight: 28, marginTop: 8 },
  cta: { alignSelf: 'flex-start', marginTop: 16, backgroundColor: stickers.lilac, borderRadius: radius.full, paddingVertical: 12, paddingHorizontal: 22 },
  ctaText: { fontFamily: font.bodySemiBold, fontSize: 15, color: stickers.charcoal },
  mini: { marginTop: 10, borderRadius: radius.md, padding: 16 },
  miniText: { fontFamily: font.display, fontSize: 17, lineHeight: 22, color: stickers.charcoal },
  link: { fontFamily: font.bodyMedium, fontSize: 13, color: stickers.charcoal, opacity: 0.6, marginTop: 12 },
})
```

- [ ] **Step 2: Swap into PregnancyHome**

In `components/home/PregnancyHome.tsx`: change the `AffirmationRevealCard` import (line ~55) to `import { DailyMessageCard } from './pregnancy/DailyMessageCard'`, and replace the JSX at line ~330 (`<AffirmationRevealCard />`) with `<DailyMessageCard />`. Leave `AffirmationRevealCard.tsx` on disk (unused).

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "PregnancyHome|DailyMessageCard" || echo clean`
Expected: `clean`.

- [ ] **Step 4: Commit**

```bash
git add components/home/pregnancy/DailyMessageCard.tsx components/home/PregnancyHome.tsx
git commit -m "feat(daily-message): home entry card + swap into PregnancyHome

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 10: `/my-cards` collection route

**Files:**
- Create: `app/my-cards.tsx`

**Interfaces:**
- Consumes: `useDailyMessage` (collection) (Task 6); `getCardById`; `stickers`, `font`, `radius`; `ScreenHeader` (existing ui); `DailyMessageDeck` or a simple full-screen card for reopen.
- Produces: route `/my-cards` — grid of past cards (newest first), tap → full-screen card.

- [ ] **Step 1: Write the route**

```tsx
// app/my-cards.tsx
import { useState } from 'react'
import { View, Text, Pressable, StyleSheet, FlatList, Modal } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { X, ChevronLeft } from 'lucide-react-native'
import { stickers, font, radius } from '../constants/theme'
import { useDailyMessage } from '../lib/dailyMessage/useDailyMessage'
import { getCardById } from '../lib/dailyMessage'

export default function MyCardsScreen() {
  const insets = useSafeAreaInsets()
  const { collection } = useDailyMessage()
  const [openId, setOpenId] = useState<string | null>(null)
  const cards = collection.map((r) => ({ row: r, card: getCardById(r.card_id) })).filter((x) => x.card)
  const open = openId ? getCardById(openId) : null

  return (
    <View style={[styles.fill, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={() => router.back()} style={styles.back} hitSlop={10}>
        <ChevronLeft size={24} color={stickers.charcoal} />
      </Pressable>
      <Text style={styles.title}>My Cards</Text>
      <FlatList
        data={cards}
        keyExtractor={(x) => x.row.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ gap: 12, padding: 16 }}
        renderItem={({ item }) => (
          <Pressable style={{ flex: 1 }} onPress={() => setOpenId(item.card!.id)}>
            <View style={[styles.tile, { backgroundColor: stickers[item.card!.color] }]}>
              <Text style={styles.tileText} numberOfLines={5}>{item.card!.text}</Text>
            </View>
            <Text style={styles.tileDate}>{item.row.date}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Your drawn cards will collect here.</Text>}
      />
      <Modal visible={!!open} transparent animationType="fade" onRequestClose={() => setOpenId(null)}>
        <View style={styles.overlay}>
          <View style={[styles.big, { backgroundColor: open ? stickers[open.color] : stickers.yellow }]}>
            <Pressable onPress={() => setOpenId(null)} style={styles.close} hitSlop={12}>
              <X size={22} color={stickers.charcoal} />
            </Pressable>
            <Text style={styles.bigText}>{open?.text}</Text>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#F3ECD9' },
  back: { paddingHorizontal: 16 },
  title: { fontFamily: font.display, fontSize: 30, paddingHorizontal: 16, marginTop: 4 },
  tile: { borderRadius: radius.md, padding: 14, minHeight: 150, justifyContent: 'center' },
  tileText: { fontFamily: font.display, fontSize: 15, lineHeight: 20, color: stickers.charcoal },
  tileDate: { fontFamily: font.bodyMedium, fontSize: 11, color: stickers.charcoal, opacity: 0.5, marginTop: 6 },
  empty: { fontFamily: font.body, fontSize: 15, textAlign: 'center', marginTop: 60, opacity: 0.6 },
  overlay: { flex: 1, backgroundColor: 'rgba(20,19,19,0.55)', justifyContent: 'center', padding: 24 },
  big: { borderRadius: radius.lg, padding: 28, minHeight: 300, justifyContent: 'center' },
  close: { position: 'absolute', top: 16, right: 16, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  bigText: { fontFamily: font.display, fontSize: 26, lineHeight: 32, color: stickers.charcoal },
})
```

> The `#F3ECD9` here is the canvas `bg` token value — replace with `useTheme().colors.bg` in implementation to honor light/dark (the plan shows the literal only for clarity). Use the theme hook.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep my-cards || echo clean`
Expected: `clean`.

- [ ] **Step 3: Commit**

```bash
git add app/my-cards.tsx
git commit -m "feat(daily-message): my-cards collection route

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 11: Apply migration, full typecheck, manual QA

**Files:** none (integration)

- [ ] **Step 1: Apply the migration**

Run: `supabase db push`
Expected: `daily_messages` migration applied. (If the user prefers to review first, stop and report — do not force.)

- [ ] **Step 2: Full test + typecheck**

Run: `npx jest lib/dailyMessage && npx tsc --noEmit 2>&1 | grep -v "lib/i18n" | grep -E "error TS" | head`
Expected: all daily-message tests pass; no new tsc errors outside i18n.

- [ ] **Step 3: Manual QA on the simulator (pregnancy mode)**

Verify: home shows the un-answered Daily Message card → tap → question screen (bold color) → pick an option → reveal deck animates in → swipe the top card to peek → Share opens the share modal → Done closes → home now shows the answered mini + "N CARDS" → re-tap reopens the same saved card → "View all cards" opens `/my-cards` grid → tap a tile reopens it full-screen → kill & relaunch app: today's card persists (loaded from Supabase).

- [ ] **Step 4: Commit any QA fixes**

```bash
git add -A
git commit -m "fix(daily-message): QA adjustments

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:** tag vocabulary (T1) ✓ · question bank (T2) ✓ · card bank (T2) ✓ · tag-overlap matcher + never-blank fallback + exclude (T3) ✓ · deterministic daily question (T4) ✓ · `daily_messages` table RLS + unique (T5) ✓ · one-per-day + collection query + answer mutation (T6) ✓ · swipeable stacked deck (T7) ✓ · bold color-block question + reveal + share reuse (T8) ✓ · home entry both states + swap out AffirmationRevealCard (T9) ✓ · collection grid + reopen (T10) ✓ · migration apply + persistence QA (T11) ✓ · starter-set scope flagged (T2) ✓ · legacy files untouched (T9) ✓.

**Placeholder scan:** two intentional dead-scaffolding lines are explicitly called out with "delete it" instructions (T6 user line; T10 `#F3ECD9` → theme). No TODO/TBD left as instructions.

**Type consistency:** `DailyTag`, `DailyQuestion`, `DailyCard`, `StickerColorKey` defined in T1 and used verbatim after. `matchCard(optionTags, mode, { exclude, rng })` signature identical in T3 definition and T6/T8 consumers. `resolveAnswer(question, optionIndex, exclude?)` consistent T6→T8. `pickDailyQuestion(date, userId, mode)` consistent T4→T6. `useDailyMessage()` return shape (`todayQuestion/todayCard/isAnswered/collection/answer/isSaving`) consistent T6→T8/T9/T10.
