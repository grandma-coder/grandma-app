# Phase 0 — Deploy & Test Runbook

**Status:** 7 of 8 Tier-0 fixes implemented + typechecking clean. This runbook covers deploying the backend pieces and testing everything on device before B3 (notifications).

**⚠️ Nothing here has been deployed.** The code is written; the migration + edge functions must be pushed to the live Supabase project, and the app tested against them.

---

## 1. Deploy backend (do these first — the client code depends on them)

### 1a. Migration
Adds `profiles.privacy_settings` (JSONB) + `account_deletion_requests` table.
```bash
supabase db push
```
Verify after: the migration `20260716120000_privacy_settings_and_deletion.sql` should apply cleanly (it's idempotent). If `supabase db push` shows it as pending, that's expected — it hasn't run yet.

### 1b. Edge functions
Both verify the caller's JWT, so deploy WITH jwt verification (the default — do **not** pass `--no-verify-jwt`):
```bash
supabase functions deploy delete-account
supabase functions deploy export-user-data
```
Both need `SUPABASE_SERVICE_ROLE_KEY` + `SUPABASE_URL` in the function env — these are standard Supabase-provided secrets, already present for the other functions (invite-caregiver etc.), so no new secret to set.

---

## 2. Test matrix (on device / simulator)

Run `npm start` and test each fix. Order matters — do the destructive one (delete) LAST on a throwaway account.

### B2 — Consent toggles persist  ✅ should now work
- Profile → Data & Privacy → toggle any switch (e.g. Analytics off, Marketing on).
- Kill + reopen the app → return to Data & Privacy → **toggles should retain their state.**
- (Before the fix they silently reset — they wrote an empty object.)
- New **Marketing Emails** row should appear in the AI & Analytics section, default OFF.

### B7 — Data export produces real JSON  ✅
- Data & Privacy → Export All Data → confirm.
- A share sheet should offer a real `grandma-data-export.json` file (not a text message).
- Open it: should be structured JSON with profile, children, logs, cycle/pregnancy data, etc.

### B4 — Units actually apply  ✅
- Settings → switch Weight to **lbs** and Temp to **°F**.
- Pregnancy mode → log Weight: the stepper should show **lb** with lb-scaled min/max; the saved value in the calendar readout should display in **lb**.
- Cycle mode → log Basal Temp: the number, unit label, and tick labels should show **°F**.
- Switch back to kg/°C → readouts convert (stored values are canonical metric, so nothing is lost).

### B5 — Name + DOB captured  ✅
- Fresh onboarding (new account or reset): after picking a journey, a **"What should we call you?"** step appears with name + optional DOB.
- Complete onboarding → Profile should greet you by name; `profiles.name` and `profiles.dob` should be populated in Supabase.
- (Before: name was never saved — `setParentName` was never called.)

### B8 — No duplicate language picker  ✅
- Profile → Personal: the standalone language picker should be **gone** (language lives only in Settings now).
- Settings → Language still works.

### B6 — Dead forum code gone  ✅
- Dev Panel → the "Channels list" entry should be gone.
- No crashes navigating community (the live chat channels are untouched).

### B1 — Real account deletion  ⚠️ TEST LAST, ON A THROWAWAY ACCOUNT
- Create a disposable test account with some data (a child, a couple logs).
- Profile → Account & Security → Delete Account → confirm.
- Expect: account deleted, signed out, returned to welcome.
- Verify in Supabase: the user's rows are gone across `profiles`, `children`, `child_logs`, `cycle_logs`, etc. (cascade), and an `account_deletion_requests` row exists with `status='completed'`.
- Also check the Settings screen's delete entry does the same (both wired to the real flow).

---

## 2b. On-device test findings (2026-07-16) — fixed
Testing surfaced two issues, both fixed:
- **Weight analytics still showed kg after switching to LBS.** `PregnancyAnalytics.tsx` (pillar summary, Weight Gain detail tiles, line chart, by-week list + tiered lozenges) and the cycle BBT displays (`CycleAnalytics.tsx` summary tile + `CycleDetailSheets.tsx` BBTDetail hero/coverline/chart) hardcoded kg/°C. Now all convert via `useUnitsStore` + `lib/units`. (The log forms + calendar readout were already wired; these were the display/analytics surfaces missed in the first B4 pass.)
- **Render crash: "two children with the same key `W20`."** `MiniCharts.tsx` `TieredLozenges` keyed rows by `rw.label`, which collides when two weight logs fall in the same pregnancy week. Now keyed by `label-index`. (Pre-existing bug, not introduced by Phase 0.)

Re-test after redeploying the app: switch to LBS/°F and confirm the Weight Gain detail + cycle BBT detail read in your units, and the by-week weight chart no longer crashes.

## 3. Known scope notes (not bugs)
- **Consent enforcement:** the toggles now *persist*, but making `share_with_caregivers`/`share_health_data`/`share_photos` actually gate caregiver reads is deferred to Phase 1 (needs a care-circle RLS pass). `analytics`/`ai_data_usage`/`marketing` are client-honorable now. This was the agreed split.
- **Water logging** stays in "glasses" (a count, not a convertible volume) — intentionally not unit-converted.
- **Kids weight/height** in profile forms still use kg/cm — B4 wired the audit-flagged sites (pregnancy weight, cycle BBT); kids profile units can follow if desired.

---

## 4. After testing passes
- Commit Phase 0 (the changes are a clean subset — see `PHASE_0_SCOPE.md` for the file list; note the repo also has unrelated in-flight design-diffuse edits from prior work, so stage deliberately).
- Then we scope **B3 (notifications)** — the last Tier-0 item, which needs `expo-notifications` + a native EAS rebuild + push-token infra.

---

## Files changed in Phase 0 (this work only)
**New:**
- `supabase/migrations/20260716120000_privacy_settings_and_deletion.sql`
- `supabase/functions/delete-account/index.ts`
- `supabase/functions/export-user-data/index.ts`
- `store/useUnitsStore.ts`, `lib/units.ts`
- `app/onboarding/about-you.tsx`

**Modified (Phase 0 subset):**
- `app/profile/privacy.tsx` (B2 consent + B7 export)
- `app/profile/account.tsx`, `app/profile/settings.tsx` (B1 delete + B4 unit toggles)
- `app/profile/personal.tsx` (B8 language dedupe)
- `app/dev-panel.tsx`, `lib/channels.ts` (B6 dead forum)
- `app/onboarding/journey.tsx` + `cycle/`, `pregnancy/`, `kids/` index.tsx (B5)
- `store/useJourneyStore.ts` (B5 parentDob)
- `components/calendar/PregnancyLogForms.tsx`, `PregnancyCalendar.tsx`, `CycleLogForms.tsx` (B4 wiring)
- `lib/i18n/keys.ts` + `en.ts` + 11 locale files (new keys)

> Other modified files in `git status` (e.g. `app/(tabs)/index.tsx`, `WalletCard.tsx`, analytics/*, home/*) are **pre-existing in-flight work from before this session**, not Phase 0.
