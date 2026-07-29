---
title: "Behavior-first onboarding must upsert the profiles row, not update it"
date: 2026-07-29
category: database-issues
track: bug
problem_type: database_issue
component: "onboarding / profiles"
resolution_type: code-fix
symptoms: "A user who starts a brand-new behavior (e.g. Menopause) as their first journey finishes onboarding but none of their answers persist — profiles columns stay null and the home screen boots empty."
root_cause: "Onboarding finish handlers wrote with supabase.from('profiles').update(...).eq('id', userId). For a user whose profiles row does not exist yet, update matches 0 rows and returns success with no error — a silent no-op. The row is only guaranteed to exist for users who came through the original cycle/pregnancy/kids flows."
tags: [supabase, profiles, upsert, onConflict, onboarding, silent-no-op, menopause]
related: []
---

## Problem

When a user's **first** journey is a newly added behavior (Menopause, in the E1 run — but this
applies to any future behavior added the same way), the onboarding finish handler saved the
user's answers to `profiles` with `.update()`. Nothing persisted. No error surfaced.

## Symptoms

- Onboarding completes normally (no error toast, navigation proceeds).
- `profiles.menopause_stage` / `last_period_date` (and any other onboarding-written columns)
  remain `null`.
- Home screen boots in an empty/default state as if onboarding never ran.
- Only reproduces for users whose `profiles` row did not already exist — i.e. users who never
  went through an older cycle/pregnancy/kids onboarding first. Existing users are unaffected,
  which is why it slips past manual testing on a seeded account.

## What Didn't Work

- Assuming the `profiles` row always exists because "auth created the user." Auth creates the
  **auth user**; the `profiles` row is only inserted by whichever flow first writes it. A
  behavior-first user has an auth user but no `profiles` row yet.

## Solution

Use `upsert` keyed on the primary key, not `update`. Remember `profiles.id` **is** the auth
user UUID (there is no `user_id` column).

```ts
// ❌ before — 0-row silent no-op for a brand-new user
const { error } = await supabase
  .from('profiles')
  .update({ menopause_stage: stage, last_period_date: lastPeriod })
  .eq('id', userId)

// ✅ after — creates the row if missing, updates it if present
const { error } = await supabase
  .from('profiles')
  .upsert({ id: userId, menopause_stage: stage, last_period_date: lastPeriod }, { onConflict: 'id' })
```

In the menopause E1 run this was a **P0** in the onboarding finish handler
(`app/onboarding/menopause/index.tsx`, fixed in `a4535c2`) and the **same bug class recurred**
as a **P1** in the period-log form's profiles write (`components/menopause/MenopauseLogForms.tsx`,
fixed in `f6d29ce`).

## Why This Works

`upsert(..., { onConflict: 'id' })` inserts a new row when none matches the primary key and
updates in place when one does — so it is correct for both the behavior-first user (no row yet)
and the returning user (row exists). `.update()` only ever touches existing rows and reports
success on a 0-row match, so the failure is invisible.

## Prevention

- **Any onboarding/first-write path to `profiles` must `upsert(onConflict: 'id')`**, never
  `.update()`. Treat a `profiles` `.update()` in an onboarding finish handler as a red flag in
  review.
- When adding a new behavior, its onboarding finish handler must not assume a pre-existing
  `profiles` row. Route every behavior's finish through the same shared completion contract so
  the upsert is written once, not re-implemented per behavior.
- A 0-row `.update()` returning `{ error: null }` is a silent success — do not treat "no error"
  as "row written" for updates on rows that may not exist yet.
- See the recurring-failure pattern `P-001` in
  `docs/superpowers/plans/orchestration-patterns.md`.
