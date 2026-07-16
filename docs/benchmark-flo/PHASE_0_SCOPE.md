# Phase 0 — Fix Broken/Misleading Features (Execution Scope)

**Goal:** Every Tier-0 item from `SUPERSET_GAP_AUDIT.md` either **works** or is **removed**. No new features ship until the app stops making privacy/account/notification promises the code breaks.

**Estimate:** ~1.5 weeks (1 engineer). The GDPR triad (B1+B2+B7) is the critical path; the rest are cheap correctness fixes that can land in parallel.

**Verified against code + migrations 2026-07-16.** Every file path and line reference below was read directly.

**Conventions confirmed (follow these):**
- Migrations: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`, latest is `20260714120000`. Use `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`; wrap policies in `DO $$ BEGIN CREATE POLICY … EXCEPTION WHEN duplicate_object THEN NULL; END $$;`; end schema changes with `NOTIFY pgrst, 'reload schema';`.
- `profiles.id` **is** the auth UUID — filter `.eq('id', userId)`.
- Edge functions in `supabase/functions/`; deploy `supabase functions deploy <name> --no-verify-jwt` (or `required` for auth'd ones). ANTHROPIC key etc. are Supabase secrets.
- `profiles` **already has**: `name`, `dob`, `language`, `due_date`, `health_notes`, `allergies`, `blood_type`, `photo_url`, `location`, `journey_mode`, `user_role`, emergency/insurance cols. **Missing: `privacy_settings`.**
- `notifications` table exists (in-app feed). `expo-secure-store` installed. **Not installed:** `expo-notifications`, `expo-local-authentication`, `expo-print`.

---

## Critical path: the GDPR triad (B1 + B2 + B7)

These three share one migration and are legally the most urgent. Do them together.

### Migration (shared) — `..._privacy_and_deletion.sql`
```sql
-- profiles.privacy_settings (B2)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS privacy_settings JSONB NOT NULL DEFAULT '{
    "share_with_caregivers": true,
    "share_health_data": true,
    "share_photos": true,
    "ai_data_usage": true,
    "analytics": true,
    "marketing": false
  }'::jsonb;

-- account deletion request audit trail (B1) — actual delete runs in edge fn
CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  requested_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
  completed_at timestamptz
);
ALTER TABLE account_deletion_requests ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "own deletion requests" ON account_deletion_requests
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

NOTIFY pgrst, 'reload schema';
```

---

### B1 — Real account deletion 🔴
**Current:** `app/profile/account.tsx:84-99` — nested `Alert` → "contact support." No deletion. Same stub at `app/profile/settings.tsx:75`.

**Build:**
1. **Edge function `delete-account`** (`--no-verify-jwt=false`, needs the user JWT). Steps:
   - Verify caller JWT → get `user.id`.
   - Insert `account_deletion_requests` row (status pending).
   - Delete user-owned rows across all tables. **Because most FKs cascade from `auth.users`, the cleanest path is `supabase.auth.admin.deleteUser(userId)`** (service-role key) — that cascades `profiles`, `behaviors`, `children`→`child_logs`, `cycle_logs`, `pregnancy_logs`, `channel_*`, `notifications`, etc. via existing `ON DELETE CASCADE`.
   - Verify no orphans for tables keyed by `user_id` without cascade (audit each; add cascade in the migration if any are missing).
   - Delete storage objects: `profile-avatars/{userId}`, `child-photos/*` for the user's children (do this **before** the auth delete, since you need the child IDs).
   - Mark request `completed`.
2. **Client** (`account.tsx` `handleDeleteAccount`): replace the inner "contact support" alert with:
   - Real warning modal (mirror Flo: "This will delete your account and all data… can't be undone"), require typed confirmation or a second explicit tap.
   - Call `supabase.functions.invoke('delete-account')` → on success `signOut('global')` + route to `(auth)/welcome`.
   - Show a processing state while it runs.
3. Remove the duplicate stub in `settings.tsx:75` (point it at the same flow or drop it — see Settings-IA note in B-cleanup).

**Effort:** 1.5–2 days. **Risk:** getting the cascade complete — audit every table with a `user_id`/`parent_id`/`author_id` column.

---

### B2 — Persisted consent toggles 🔴
**Current:** `app/profile/privacy.tsx:95-108` — `updateSetting` calls `.update({})` (empty). Column didn't exist. `loadSettings` (line 72) already reads `data.privacy_settings` defensively — so once the column exists, load works with no change.

**Build:**
1. Migration above adds `privacy_settings` (with the 5 existing keys + `marketing`).
2. Fix `updateSetting` (line 103-106) to actually write:
   ```ts
   await supabase.from('profiles')
     .update({ privacy_settings: updated })
     .eq('id', session.user.id)
   ```
   (drop the `as any` + empty object + silent catch; handle error with a toast.)
3. Add the **`marketing`** toggle row to the "AI & Analytics" (or a new "Communications") section — `PrivacySettings` interface line 36 + `DEFAULT_SETTINGS` line 44 + a `ToggleRow`. Default OFF (Flo pattern).
4. **Wire the toggles to actually mean something** (the important part — otherwise it's still theater):
   - `analytics: false` → gate any analytics/telemetry calls.
   - `ai_data_usage: false` → pass a flag to `nana-chat`/`generate-insights` so we don't retain/train on their data (at minimum, document + honor).
   - `share_with_caregivers: false` / `share_health_data` / `share_photos` → enforce in care-circle read paths (RLS or query filters). **This is the real work** — the toggles must change what caregivers can read. Scope this carefully; may spill into Phase 1's care-circle work. For Phase 0, minimum bar: **persist + honor the client-side ones** (analytics, marketing, ai) and file the caregiver-enforcement as a tracked follow-up if it's large.

**Effort:** 0.5 day for persist + marketing; +1–2 days if we enforce caregiver-sharing now. **Recommend:** persist all in Phase 0; enforce caregiver toggles in Phase 1 (Data & Privacy spine) where care-circle RLS is already on the table.

---

### B7 — Real data export 🔴
**Current:** `app/profile/privacy.tsx:112-156` — builds a text summary (counts + names) → `Share.share`. Not portable data.

**Build:**
1. **Edge function `export-user-data`** (auth'd): gather ALL the user's rows (profiles, behaviors, children, all `*_logs`, cycle/pregnancy logs, channel posts, notifications, care_circle, vault, exams, badges) into a structured JSON. Return either:
   - inline JSON (simplest), or
   - upload to a private `exports/{userId}/{timestamp}.json` bucket + return a signed URL (better for large accounts).
2. **Client:** replace `handleExportData` body — call the function, then write the JSON to a file (`expo-file-system`) and share it via `expo-sharing` (already a dep) as a real `.json` file, not a message string.
3. Keep it honest: label it "Export my data (JSON)". The existing "clear" actions (logs/chat/memories/health) already work — leave them.

**Effort:** 1–1.5 days.

---

## Parallel track: cheap correctness fixes

### B3 — Notifications that actually deliver 🔴 (biggest single item)
**Current:** `app/profile/notifications.tsx` — 7 toggles → AsyncStorage key `grandma:notification_prefs:v1` read nowhere. `expo-notifications` **not installed**. `lib/notificationEngine.ts` only writes DB rows (in-app feed). **No OS notification ever fires.**

**Build (this is a mini-project, ~4–5 days):**
1. `npx expo install expo-notifications` (+ config plugin in `app.json`, APNs/FCM setup — this needs a native rebuild via EAS, per the Daily Flow rules).
2. Push-token registration on login → store token on `profiles` (new `push_token text` column) or a `push_tokens` table (multi-device).
3. Local scheduling for the reminder categories that are time-based (daily log reminder, appointment, cycle prediction) via `scheduleNotificationAsync`.
4. **Honor the prefs:** the 7 toggles must gate what schedules/sends. Map toggle → engine category (`lib/notifications.ts` `getCategory`).
5. Reconcile the 7 user-facing toggles with the ~26 engine types (add grouping so the toggles actually cover the engine output).
6. (Time pickers per category are a Phase 1/6.1 enhancement — Phase 0 bar is: **delivery works + toggles are honored.**)

**Decision flag:** B3 needs a native rebuild + push infra. If that's too heavy for the 1.5wk window, the honest Phase-0 fallback is to **hide the toggles** (or label them "coming soon") rather than ship decorative ones — but real delivery is the goal. Recommend keeping B3 in Phase 0 but as the item most likely to slip to early Phase 1.

**Effort:** 4–5 days (largest). **Risk:** native rebuild, push certs.

---

### B4 — Real unit system (kg/lbs, °C/°F) 🔴
**Current:** `app/profile/settings.tsx:46-47` — local `useState`, not persisted. Weight hardcoded kg (`PregnancyCalendar.tsx:1320`), BBT hardcoded °C (`CycleLogForms.tsx:675`).

**Build:**
1. New `store/useUnitsStore.ts` (Zustand + persist, `hydrated` flag per our store convention): `{ weightUnit: 'kg'|'lb', tempUnit: 'c'|'f', volumeUnit: 'ml'|'floz' }`.
2. `settings.tsx` toggles read/write the store (replace the `useState`).
3. Conversion helpers in `lib/units.ts` (kg↔lb, c↔f, ml↔floz — display + input).
4. Consume in: pregnancy weight form/`PregnancyCalendar`, cycle BBT form (`CycleLogForms.tsx:675`), water forms, kids weight/height, analytics axis labels. **Store canonical units in DB (metric); convert only at display/input.**

**Effort:** 1.5–2 days (touches several forms).

---

### B5 — Name capture in onboarding 🔴
**Current:** `useJourneyStore.setParentName` never called; `saveAndFinish` writes `profiles.name = parentName ?? null` → always null.

**Build:** Two options — (a) add a name step to onboarding (the `.superdesign/parent-name.html` mockup exists but no route), or (b) if we don't want a step, capture name at sign-up. Simplest correct fix: **add a lightweight name field** to the first onboarding step (`journey.tsx`) or the pregnancy/kids flows, call `setParentName`, so the existing save path works. Also: `dob` column exists but onboarding never sets it — add an age/DOB capture here too (feeds §3 prediction calibration; pairs naturally with the name step).

**Effort:** 0.5–1 day.

---

### B6 — Delete dead forum code 🔴
**Current:** `app/channels/*` (index, [id], thread/[id]) + `components/channels/ChannelCard.tsx`, `ThreadCard.tsx` query `channel_threads`/`thread_replies` — tables that exist in **no** migration. Reachable only from dev panel (`app/dev-panel.tsx:84`).

**Build:** Delete `app/channels/` and `components/channels/`. Remove the dev-panel entry (`dev-panel.tsx:84`). **Keep** `lib/channels.ts` — the live chat path uses its `getChannels()`/`Channel` type (verify with grep before deleting anything from it; only remove the `Thread`/`Reply` forum types if unused).

**Effort:** 0.5 day. **Risk:** low — verify no live import of the deleted screens first (`grep -r "app/channels\|components/channels"`).

---

### B8 — Dedupe language lists 🔴
**Current:** Settings uses `useLanguageStore` (13 langs, drives i18n). `app/profile/personal.tsx` writes a *separate* 29-entry list to `profiles.language` that nothing reads.

**Build:** Remove the 29-entry picker from `personal.tsx`. If we want profile-level language display, have it read/write `useLanguageStore` (single source of truth). `profiles.language` column can stay (harmless) but shouldn't be a second editor.

**Effort:** 0.5 day.

---

## Suggested sequencing (1 engineer, ~1.5 wk)

**Day 1:** Ship the shared privacy migration. B2 (persist consent + marketing toggle). B8 (language dedupe). B6 (delete dead forum). — *fast trust wins + cleanup.*
**Day 2–3:** B1 (delete-account edge fn + client + cascade audit). B7 (export edge fn + real file share). — *the GDPR triad done.*
**Day 3–4:** B4 (unit system store + helpers + wire forms). B5 (name/DOB capture in onboarding). — *correctness.*
**Day 5–8:** B3 (expo-notifications: install, native rebuild, token reg, scheduling, honor prefs). — *largest; may bleed into early Phase 1.*

**Definition of done for Phase 0:** open Settings → every toggle/action either works and persists, or is gone. No screen tells the user something happened that didn't. `SUPERSET_GAP_AUDIT.md` Tier 0 table is all green.

---

## Follow-ups this surfaces (not Phase 0, tracked)
- Caregiver-sharing **enforcement** for B2 toggles → Phase 1 (needs care-circle RLS pass).
- Per-notification **time pickers** → Phase 1/§6.1.
- `dob`-based **prediction calibration** → Phase 2 onboarding work.
- Settings IA consolidation (two settings surfaces) → Phase 1/§6.5.
