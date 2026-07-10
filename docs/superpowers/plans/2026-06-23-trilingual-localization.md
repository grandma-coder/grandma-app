# Full Trilingual Localization (pt-BR / en / es) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take grandma.app to ~100% UI coverage in Portuguese (BR), English, and Spanish, with long-form prose translated at runtime and cached — without swapping the existing i18n engine.

**Architecture:** Three layers. (1) Keep the existing `useTranslation` engine in `lib/i18n/`. (2) Extract ~1,200 hardcoded UI strings into static keys, then manage translations with **Tolgee Cloud (free tier)** — English source keys sync up, AI auto-translates pt-BR/es, the CLI pulls results back into the existing `*.ts` locale files. (3) For ~58k words of editorial prose in `lib/`, add a `translate-content` Supabase edge function that translates on first view and caches per `(content_key, locale)` in a new `content_translations` table.

**Tech Stack:** Expo SDK 54 / React Native 0.81 / React 19, TypeScript strict, Zustand v5, React Query v5, Supabase (Postgres + Deno edge functions), Claude (`claude-haiku-4-5-20251001` for translation), Tolgee CLI + Tolgee Cloud.

## Global Constraints

- Key convention: `area_camelCaseDescriptor` (existing style in `lib/i18n/keys.ts` — e.g. `home_goodMorning`). Mode-aware copy → one key per mode (`*_prepreg` / `*_pregnancy` / `*_kids`). Verbatim from spec.
- Every new key MUST be added to `lib/i18n/keys.ts` (the `TranslationKeys` interface) AND given an English value in `lib/i18n/en.ts`. TypeScript strict enforces parity across all 12 locale files.
- The 12 locale codes are fixed: `en, pt-BR, es, fr, de, it, ja, ko, zh, ar, hi, tr` (see `store/useLanguageStore.ts`). Only `en`, `pt-BR`, `es` are targeted for 100%; the other 9 receive AI fill as a side effect of Tolgee.
- Interpolation uses `{{var}}` in source strings; pass values as `t('key', { var })`. The engine has NO pluralization rules — handle plurals as separate keys or accept English-style for now.
- Migration files: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`, idempotent (`CREATE TABLE IF NOT EXISTS`), `ENABLE ROW LEVEL SECURITY`, end schema-changers with `NOTIFY pgrst, 'reload schema';`.
- `profiles.id` IS the auth user UUID — filter `.eq('id', userId)`, never `user_id`.
- Edge functions: never call Anthropic from the app; `ANTHROPIC_API_KEY` is a Supabase secret only. Handle CORS + OPTIONS.
- Never invent non-English translations by hand inside locale `.ts` files — Tolgee (AI + review) owns those. The `/i18n-extract` command leaves English placeholders in non-en files; Tolgee replaces them.
- User works on `main` — no worktrees/feature branches by default.
- Design system is non-negotiable: any UI touched must keep tokens from `constants/theme.ts` (no raw hex). Extraction is mechanical — never change behavior or styling.

---

## Phase A — Tooling foundation (Tolgee wiring)

### Task A1: Add a key-parity guard script

**Files:**
- Create: `scripts/i18n-check.ts`
- Modify: `package.json` (add `"i18n:check"` script)
- Test: `scripts/__tests__/i18n-check.test.ts`

**Interfaces:**
- Produces: `checkKeyParity(): { locale: string; missing: string[]; extra: string[] }[]` — compares each locale object's keys against `en`'s keys.

- [ ] **Step 1: Write the failing test**

```ts
// scripts/__tests__/i18n-check.test.ts
import { checkKeyParity } from '../i18n-check'

test('every locale has exactly the same keys as en', () => {
  const report = checkKeyParity()
  const broken = report.filter((r) => r.missing.length > 0 || r.extra.length > 0)
  expect(broken).toEqual([])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest scripts/__tests__/i18n-check.test.ts`
Expected: FAIL with "Cannot find module '../i18n-check'"

- [ ] **Step 3: Write minimal implementation**

```ts
// scripts/i18n-check.ts
import { en } from '../lib/i18n/en'
import { translations } from '../lib/i18n'

export function checkKeyParity() {
  const enKeys = Object.keys(en)
  return Object.entries(translations).map(([locale, obj]) => {
    const keys = Object.keys(obj)
    return {
      locale,
      missing: enKeys.filter((k) => !keys.includes(k)),
      extra: keys.filter((k) => !enKeys.includes(k)),
    }
  })
}

if (require.main === module) {
  const report = checkKeyParity()
  const broken = report.filter((r) => r.missing.length || r.extra.length)
  if (broken.length) {
    console.error('Key parity broken:', JSON.stringify(broken, null, 2))
    process.exit(1)
  }
  console.log('✓ All locales in parity with en')
}
```

- [ ] **Step 4: Add npm script**

In `package.json` scripts: `"i18n:check": "tsx scripts/i18n-check.ts"`

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest scripts/__tests__/i18n-check.test.ts`
Expected: PASS (TypeScript already enforces parity, so this should be green)

- [ ] **Step 6: Commit**

```bash
git add scripts/i18n-check.ts scripts/__tests__/i18n-check.test.ts package.json
git commit -m "chore(i18n): add key-parity guard script"
```

### Task A2: Add Tolgee CLI config + sync scripts

**Files:**
- Create: `.tolgeerc.json`
- Create: `scripts/i18n-export-en.ts` (flattens `en.ts` → `tolgee/en.json` for push)
- Create: `scripts/i18n-import.ts` (writes pulled `tolgee/<locale>.json` back into `lib/i18n/<locale>.ts`)
- Modify: `package.json` (add `i18n:push`, `i18n:pull`, `i18n:sync`)
- Create: `docs/i18n-tolgee.md` (setup + secret handling)

**Interfaces:**
- Consumes: `en` from `lib/i18n/en.ts`, `translations` from `lib/i18n`.
- Produces: round-trip between repo locale `.ts` files and Tolgee Cloud.

- [ ] **Step 1: Create the Tolgee config**

```json
// .tolgeerc.json
{
  "$schema": "https://docs.tolgee.io/cli-schema.json",
  "apiUrl": "https://app.tolgee.io",
  "projectId": "REPLACE_WITH_PROJECT_ID",
  "format": "JSON_FLAT",
  "push": { "files": [{ "path": "tolgee/en.json", "language": "en" }] },
  "pull": { "path": "tolgee/" }
}
```

- [ ] **Step 2: Write the en exporter**

```ts
// scripts/i18n-export-en.ts
import { writeFileSync, mkdirSync } from 'fs'
import { en } from '../lib/i18n/en'

mkdirSync('tolgee', { recursive: true })
writeFileSync('tolgee/en.json', JSON.stringify(en, null, 2))
console.log(`✓ Exported ${Object.keys(en).length} keys → tolgee/en.json`)
```

- [ ] **Step 3: Write the importer (pull → locale .ts)**

```ts
// scripts/i18n-import.ts
import { readFileSync, writeFileSync, existsSync } from 'fs'

const LOCALES = ['pt-BR', 'es', 'fr', 'de', 'it', 'ja', 'ko', 'zh', 'ar', 'hi', 'tr']
const constName: Record<string, string> = { 'pt-BR': 'ptBR', es: 'es', fr: 'fr', de: 'de', it: 'it', ja: 'ja', ko: 'ko', zh: 'zh', ar: 'ar', hi: 'hi', tr: 'tr' }

for (const locale of LOCALES) {
  const jsonPath = `tolgee/${locale}.json`
  if (!existsSync(jsonPath)) { console.warn(`skip ${locale} (no pull)`); continue }
  const data = JSON.parse(readFileSync(jsonPath, 'utf8')) as Record<string, string>
  const entries = Object.entries(data)
    .map(([k, v]) => `  ${/^[a-zA-Z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${JSON.stringify(v)},`)
    .join('\n')
  const body = `import type { TranslationKeys } from './keys'\n\nexport const ${constName[locale]}: TranslationKeys = {\n${entries}\n}\n`
  writeFileSync(`lib/i18n/${locale}.ts`, body)
  console.log(`✓ Wrote lib/i18n/${locale}.ts (${Object.keys(data).length} keys)`)
}
```

- [ ] **Step 4: Add npm scripts**

In `package.json` scripts:
```
"i18n:push": "tsx scripts/i18n-export-en.ts && tolgee push --api-key $TOLGEE_API_KEY",
"i18n:pull": "tolgee pull --api-key $TOLGEE_API_KEY && tsx scripts/i18n-import.ts && npm run i18n:check",
"i18n:sync": "npm run i18n:push && npm run i18n:pull"
```

- [ ] **Step 5: Document setup**

`docs/i18n-tolgee.md` must state: create a Tolgee Cloud project (free tier), set `projectId` in `.tolgeerc.json`, store `TOLGEE_API_KEY` as a shell env var (NOT committed), enable Tolgee's AI machine-translation for pt-BR + es, the dev workflow is `add key via /i18n-extract → npm run i18n:push → review/translate in Tolgee → npm run i18n:pull`. Only English source strings ever leave the repo — no user data.

- [ ] **Step 6: Verify export runs**

Run: `npx tsx scripts/i18n-export-en.ts`
Expected: `✓ Exported 562 keys → tolgee/en.json` (count may differ as keys grow)

- [ ] **Step 7: Commit**

```bash
git add .tolgeerc.json scripts/i18n-export-en.ts scripts/i18n-import.ts package.json docs/i18n-tolgee.md
git commit -m "chore(i18n): wire Tolgee CLI push/pull round-trip"
```

### Task A3: ESLint guard against hardcoded user-facing strings

**Files:**
- Create: `eslint.config.js` (flat config — there is currently NO ESLint setup in the repo)
- Modify: `package.json` (add `eslint` + `eslint-config-expo` + `eslint-plugin-i18next` devDeps, add `"lint"` and `"lint:i18n"` scripts)
- Create: `docs/i18n-tolgee.md` already exists from A2 — append a "Lint guard" section.

**Interfaces:**
- Produces: a lint command that FAILS on a hardcoded user-facing string in any file already migrated through Phase B, making it structurally impossible to merge new untranslated copy.

**Why this matters:** Tolgee/the runtime translate keys that exist; nothing forces a developer to *create* a key instead of hardcoding `<Text>Hello</Text>`. This rule is the missing guard. NOTE: the repo has ~1,200 un-wired strings today — turning the rule on globally would produce ~1,200 errors. Strategy: introduce the rule, but scope its `files` glob to **only the directories/files already migrated**, expanding the glob as Phase B tasks complete. By Task B7 it covers all of `app/` + `components/`.

- [ ] **Step 1: Install deps**

Run: `npm i -D eslint eslint-config-expo eslint-plugin-i18next`
Expected: installs without peer-dep errors (Expo SDK 54 ships an ESLint config).

- [ ] **Step 2: Create the flat config**

```js
// eslint.config.js
const expo = require('eslint-config-expo/flat')
const i18next = require('eslint-plugin-i18next')

module.exports = [
  ...expo,
  {
    // Expand this files list as each Phase B cluster is migrated.
    // Start with the FIRST migrated cluster so CI stays green during migration.
    files: ['components/home/KidsHome.tsx', 'components/analytics/KidsAnalytics.tsx'],
    plugins: { i18next },
    rules: {
      'i18next/no-literal-string': [
        'error',
        {
          mode: 'jsx-text-only',
          'should-validate-template': true,
          ignore: ['^[\\s\\d.,:#%/+\\-()]*$'], // numbers, punctuation, symbols only
          ignoreCallee: ['t', 'useTranslatedContent'],
        },
      ],
    },
  },
]
```

- [ ] **Step 3: Add npm scripts**

In `package.json` scripts:
```
"lint": "eslint .",
"lint:i18n": "eslint --rule '{\"i18next/no-literal-string\":\"error\"}' ."
```

- [ ] **Step 4: Verify the rule fires**

Temporarily add `<Text>NOT TRANSLATED</Text>` to `components/home/KidsHome.tsx`, then run `npm run lint`.
Expected: ESLint error on that line (`disallow literal string`). Remove the test string.

- [ ] **Step 5: Verify migrated files pass**

Run: `npm run lint`
Expected: PASS once `KidsHome.tsx` + `KidsAnalytics.tsx` are migrated (Task B1). If running A3 before B1, scope `files` to a single already-clean file or accept that this step is verified after B1.

- [ ] **Step 6: Commit**

```bash
git add eslint.config.js package.json package-lock.json docs/i18n-tolgee.md
git commit -m "chore(i18n): add eslint no-literal-string guard (scoped to migrated files)"
```

> **Per-cluster reminder for Phase B:** after each B-task migrates a cluster, ADD those files/dirs to the `files` glob in `eslint.config.js` and re-run `npm run lint` before committing. At Task B7, replace the explicit list with `files: ['app/**/*.tsx', 'components/**/*.tsx']` minus known exceptions (`dev-panel`, sticker/SVG/chart asset files) and confirm a clean global lint pass.

---

## Phase B — UI string extraction (Kids → Pre-preg → Shared)

> Each task below wires one cluster of files through `/i18n-extract`. The command is the mechanical workhorse: it adds keys to `keys.ts`, English values to `en.ts`, English placeholders to the other 11 locale files (so TS compiles), and replaces literals with `t(...)`. After each cluster, run the parity check + typecheck, then push to Tolgee so AI translation starts early.
>
> **Ordering rationale (from audit):** Kids is least covered (~215 strings in 5 files), pre-pregnancy second, pregnancy is mostly done. Shared/profile/auth is high-volume but lower-risk (reusable `common_*` keys cover much of it).

### Task B1: Extract Kids home + analytics (heaviest cluster)

**Files:**
- Modify: `components/home/KidsHome.tsx` (~85 strings + ~200-line growth-leaps narrative)
- Modify: `components/analytics/KidsAnalytics.tsx` (~55 strings)
- Modify: `lib/i18n/keys.ts`, `lib/i18n/en.ts`, and all 11 other locale files (placeholder fill)
- Test: parity via `npm run i18n:check`

**Interfaces:**
- Produces: `kids_home_*`, `kids_analytics_*` keys consumed nowhere else yet.

- [ ] **Step 1:** Run `/i18n-extract components/home/KidsHome.tsx` in **propose** mode. Review the key table. Confirm growth-leaps narrative strings get `kids_home_leap_*` keys (NOTE: these are borderline prose — if a string exceeds ~1 sentence, flag it for Phase C runtime translation instead of a static key, and leave it in `lib/growthLeaps.ts`). Apply.
- [ ] **Step 2:** Run `/i18n-extract components/analytics/KidsAnalytics.tsx` (propose → apply). Reuse `common_*` keys where they exist (don't duplicate `common_save`, etc.).
- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (0 errors — all new keys present in every locale file)

- [ ] **Step 4: Run parity check**

Run: `npm run i18n:check`
Expected: `✓ All locales in parity with en`

- [ ] **Step 5: Push to Tolgee so AI translation starts**

Run: `npm run i18n:push`
Expected: new keys appear in Tolgee project, queued for pt-BR/es machine translation.

- [ ] **Step 6: Commit**

```bash
git add lib/i18n components/home/KidsHome.tsx components/analytics/KidsAnalytics.tsx
git commit -m "feat(i18n): wire Kids home + analytics through t()"
```

### Task B2: Extract Kids calendar + log forms + agenda

**Files:**
- Modify: `components/calendar/KidsLogForms.tsx` (~35), `components/calendar/KidsCalendar.tsx` (~35), `components/agenda/NannyNotesPanel.tsx` (~8), `components/agenda/FoodDashboard.tsx` (~6), `components/home/NannyUpdatesFeed.tsx` (~4), `components/kids/KidsJourneyRing.tsx` (~5)
- Modify: locale files

- [ ] **Step 1:** Run `/i18n-extract` on each file above in turn (propose → apply). Pay attention to the ~25 `Alert.alert(...)` strings in `KidsLogForms.tsx` — these are user-facing and MUST be extracted (`kids_logForm_*`).
- [ ] **Step 2:** `npm run typecheck` → PASS
- [ ] **Step 3:** `npm run i18n:check` → parity OK
- [ ] **Step 4:** `npm run i18n:push`
- [ ] **Step 5: Commit**

```bash
git add lib/i18n components/calendar/KidsLogForms.tsx components/calendar/KidsCalendar.tsx components/agenda/NannyNotesPanel.tsx components/agenda/FoodDashboard.tsx components/home/NannyUpdatesFeed.tsx components/kids/KidsJourneyRing.tsx
git commit -m "feat(i18n): wire Kids calendar, log forms, and agenda"
```

### Task B3: Extract Kids screens (profile/care-circle/onboarding)

**Files:**
- Modify: `app/profile/care-circle.tsx` (~55), `app/profile/kids.tsx` (~40), `app/onboarding/kids/index.tsx` (~35), `app/profile/health-history.tsx` (~24), `app/airtag-setup.tsx` (~6), `app/child-picker.tsx` (~3), `app/invite-caregiver.tsx` (~15), `app/manage-caregivers.tsx` (~12)
- Modify: locale files

- [ ] **Step 1:** Run `/i18n-extract` per file. Watch for data arrays rendered as labels (`PERMISSION_LEVELS`, `ROLES`, `STEP_TITLES`, `ALLERGY_OPTIONS`, `CAREGIVER_ROLES`) — extract the array label strings too. Interpolated strings like `Remove {name}?` → `t('...', { name })`.
- [ ] **Step 2:** `npm run typecheck` → PASS
- [ ] **Step 3:** `npm run i18n:check` → parity OK
- [ ] **Step 4:** `npm run i18n:push`
- [ ] **Step 5: Commit**

```bash
git add lib/i18n app/profile/care-circle.tsx app/profile/kids.tsx app/onboarding/kids/index.tsx app/profile/health-history.tsx app/airtag-setup.tsx app/child-picker.tsx app/invite-caregiver.tsx app/manage-caregivers.tsx
git commit -m "feat(i18n): wire Kids profile, care-circle, and onboarding screens"
```

### Task B4: Extract Pre-pregnancy cluster

**Files:**
- Modify: `components/calendar/CycleLogForms.tsx` (~15), `components/calendar/CycleCalendar.tsx` (~8), `components/prepreg/HealthDashboard.tsx` (~8), `components/prepreg/DailyInsights.tsx` (~6), `components/prepreg/PartnerView.tsx` (~5), `components/prepreg/CyclePhaseRing.tsx` (~5), `components/prepreg/ChecklistCard.tsx` (~2), `components/agenda/CycleTracker.tsx` (~4), `components/agenda/PrePregChecklist.tsx` (~2), `components/analytics/CycleAnalytics.tsx` (~4), `components/home/cycle/FertilitySignalsCard.tsx` (~4), `components/home/cycle/CycleTodayDashboardModal.tsx` (~2), `components/home/cycle/MoodSymptomPickerSheet.tsx` (~1), `app/onboarding/cycle/index.tsx` (~30), `app/cycle-pillars.tsx` (~3)
- Modify: locale files

- [ ] **Step 1:** Run `/i18n-extract` per file (`cycle_*` / `prepreg_*` prefixes). `app/onboarding/cycle/index.tsx` has `CONDITION_OPTIONS` + TTC duration arrays — extract those labels.
- [ ] **Step 2:** `npm run typecheck` → PASS
- [ ] **Step 3:** `npm run i18n:check` → parity OK
- [ ] **Step 4:** `npm run i18n:push`
- [ ] **Step 5: Commit**

```bash
git add lib/i18n components/calendar/CycleLogForms.tsx components/calendar/CycleCalendar.tsx components/prepreg components/agenda/CycleTracker.tsx components/agenda/PrePregChecklist.tsx components/analytics/CycleAnalytics.tsx components/home/cycle app/onboarding/cycle/index.tsx app/cycle-pillars.tsx
git commit -m "feat(i18n): wire pre-pregnancy cycle screens and components"
```

### Task B5: Extract shared — auth + onboarding + paywall + tabs

**Files:**
- Modify: `app/(auth)/welcome.tsx` (~8), `sign-in.tsx` (~15), `sign-up.tsx` (~14), `forgot-password.tsx` (~10), `reset-password.tsx` (~10); `app/onboarding/journey.tsx` (~20), `app/onboarding/transition.tsx` (~9); `app/paywall.tsx` (~28); `app/(tabs)/index.tsx` (~4), `app/(tabs)/library.tsx` (~18)
- Modify: locale files

- [ ] **Step 1:** Run `/i18n-extract` per file. `journey.tsx` has a `JOURNEYS` array — extract labels. `library.tsx` has 3 mode branches for subtitle/community copy → one key per branch (`library_subtitle_prepreg|pregnancy|kids`). Reuse `common_*` aggressively for auth buttons.
- [ ] **Step 2:** `npm run typecheck` → PASS
- [ ] **Step 3:** `npm run i18n:check` → parity OK
- [ ] **Step 4:** `npm run i18n:push`
- [ ] **Step 5: Commit**

```bash
git add lib/i18n "app/(auth)" app/onboarding/journey.tsx app/onboarding/transition.tsx app/paywall.tsx "app/(tabs)/index.tsx" "app/(tabs)/library.tsx"
git commit -m "feat(i18n): wire auth, onboarding shell, paywall, and tabs"
```

### Task B6: Extract shared — profile + community + misc

**Files:**
- Modify: `app/profile/account.tsx` (~25), `app/profile/personal.tsx` (~20), `app/profile/emergency-insurance.tsx` (~40), `app/profile/memories.tsx` (~17), `app/profile/privacy.tsx` (~16), `app/profile/badges.tsx` (~4); `app/channel/[id].tsx` (~20), `app/channel/create.tsx` (~13), `app/channel/info/[id].tsx` (~26), `app/channel/thread/[id].tsx` (~4), `app/channels/*` (~13); `app/garage/create.tsx` (~16), `app/garage/profile.tsx` (~11), `app/garage/share.tsx` (~7), `app/garage/[id].tsx` (~5); `app/leaderboard.tsx` (~11), `app/daily-rewards.tsx` (~8), `app/scan.tsx` (~8), `app/accept-invite.tsx` (~12), `app/exams/*` (~19), `app/pillar/[id].tsx` (~3), `app/connections.tsx` (~2)
- Modify: locale files; also residual cleanup in `components/calendar/PregnancyCalendar.tsx` (Alert strings) and `components/analytics/PregnancyAnalytics.tsx` (`title=` props), `components/connections/ChannelsScreen.tsx` (~10), `components/vault/*` (~13), `components/insights/InsightsScreen.tsx` (~40 incl. `TYPE_CONFIG`/`CATEGORY_META` label maps), `components/exams/ExamForm.tsx` (~4)
- Modify: locale files

- [ ] **Step 1:** Run `/i18n-extract` per file. This is the long tail; split across multiple subagents if executing in parallel. `InsightsScreen.tsx` label maps → `insights_type_*` / `insights_category_*` keys.
- [ ] **Step 2:** `npm run typecheck` → PASS
- [ ] **Step 3:** `npm run i18n:check` → parity OK
- [ ] **Step 4:** `npm run i18n:push`
- [ ] **Step 5: Commit** (group logically, e.g. one commit for profile, one for community, one for misc)

```bash
git add lib/i18n app/profile app/channel app/channels app/garage app/leaderboard.tsx app/daily-rewards.tsx app/scan.tsx app/accept-invite.tsx app/exams app/pillar app/connections.tsx components/calendar/PregnancyCalendar.tsx components/analytics/PregnancyAnalytics.tsx components/connections/ChannelsScreen.tsx components/vault components/insights/InsightsScreen.tsx components/exams/ExamForm.tsx
git commit -m "feat(i18n): wire profile, community, vault, insights, and remaining screens"
```

### Task B7: Coverage audit gate

**Files:** none (verification only)

- [ ] **Step 0: Widen the ESLint guard to everything**

In `eslint.config.js`, replace the explicit `files` list with `files: ['app/**/*.tsx', 'components/**/*.tsx']` and an `ignores` for `app/dev-panel.tsx` + sticker/SVG/chart asset files. Run `npm run lint`.
Expected: PASS (0 `no-literal-string` errors). Any error is a real residual hardcoded string — fix it. This is the gate that makes the system self-sustaining going forward.

- [ ] **Step 1: Re-run the un-wired-Text scan**

Run:
```bash
for f in $(grep -rl "<Text" app components); do grep -q "useTranslation" "$f" || echo "$f"; done | grep -v -E "dev-panel|Stickers|charts/" | wc -l
```
Expected: near 0 (any remaining files should be string-free wrappers or SVG/asset files). Investigate any with real copy.

- [ ] **Step 2: Dispatch the i18n-auditor agent** on `app/` and `components/` again to confirm hardcoded-string count dropped to ~0 for user-facing files. Record the residual list.
- [ ] **Step 3:** Full `npm run typecheck` + `npm run i18n:check` → both green.
- [ ] **Step 4: Final push + pull**

Run: `npm run i18n:sync` (push remaining keys, pull all AI translations back). Then `npm run i18n:check` → parity OK.
- [ ] **Step 5: Commit translations**

```bash
git add lib/i18n
git commit -m "feat(i18n): pull pt-BR + es translations from Tolgee"
```

---

## Phase C — Long-form prose (runtime translation + cache)

### Task C1: content_translations cache table

**Files:**
- Create: `supabase/migrations/20260624090000_content_translations.sql`
- Test: manual SQL verification (documented below)

**Interfaces:**
- Produces: table `content_translations(content_key text, locale text, source_hash text, translated_text text, created_at)`, unique on `(content_key, locale)`.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260624090000_content_translations.sql
CREATE TABLE IF NOT EXISTS content_translations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key   text NOT NULL,
  locale        text NOT NULL,
  source_hash   text NOT NULL,
  translated_text text NOT NULL,
  created_at    timestamptz DEFAULT now(),
  UNIQUE (content_key, locale)
);

ALTER TABLE content_translations ENABLE ROW LEVEL SECURITY;

-- Shared, app-owned content (not user data): any authenticated user may read.
DROP POLICY IF EXISTS content_translations_read ON content_translations;
CREATE POLICY content_translations_read ON content_translations
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only the edge function (service role) writes — no client INSERT/UPDATE policy.

CREATE INDEX IF NOT EXISTS idx_content_translations_key_locale
  ON content_translations (content_key, locale);

NOTIFY pgrst, 'reload schema';
```

- [ ] **Step 2: Apply**

Run: `supabase db push`
Expected: migration applies cleanly.

- [ ] **Step 3: Verify table + RLS**

Run:
```bash
supabase db execute "SELECT tablename, rowsecurity FROM pg_tables WHERE tablename='content_translations';"
```
Expected: one row, `rowsecurity = t`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260624090000_content_translations.sql
git commit -m "feat(i18n): add content_translations cache table"
```

### Task C2: translate-content edge function

**Files:**
- Create: `supabase/functions/translate-content/index.ts`
- Test: local invoke (documented)

**Interfaces:**
- Consumes: `content_translations` table; `ANTHROPIC_API_KEY` secret.
- Produces: HTTP endpoint accepting `{ contentKey: string, sourceText: string, locale: string }` → `{ translatedText: string, cached: boolean }`. Returns `sourceText` unchanged when `locale === 'en'`.

- [ ] **Step 1: Write the function**

```ts
// supabase/functions/translate-content/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { contentKey, sourceText, locale } = await req.json()
    if (locale === 'en') {
      return Response.json({ translatedText: sourceText, cached: true }, { headers: cors })
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const hash = await sha256(sourceText)
    const { data: hit } = await supabase
      .from('content_translations')
      .select('translated_text, source_hash')
      .eq('content_key', contentKey).eq('locale', locale).maybeSingle()
    if (hit && hit.source_hash === hash) {
      return Response.json({ translatedText: hit.translated_text, cached: true }, { headers: cors })
    }
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system: `You are a professional translator for a parenting & health app. Translate the user's text into ${locale}. Preserve markdown, {{placeholders}}, and clinical accuracy. Do NOT translate institutional names (ACOG, NICE, WHO, CDC). Return ONLY the translation.`,
        messages: [{ role: 'user', content: sourceText }],
      }),
    })
    const json = await res.json()
    const translated = json?.content?.[0]?.text ?? sourceText
    await supabase.from('content_translations').upsert(
      { content_key: contentKey, locale, source_hash: hash, translated_text: translated },
      { onConflict: 'content_key,locale' },
    )
    return Response.json({ translatedText: translated, cached: false }, { headers: cors })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500, headers: cors })
  }
})
```

- [ ] **Step 2: Deploy**

Run: `supabase functions deploy translate-content --no-verify-jwt`
Expected: deploy succeeds.

- [ ] **Step 3: Smoke test**

Run:
```bash
curl -s -X POST "$EXPO_PUBLIC_SUPABASE_URL/functions/v1/translate-content" \
  -H "apikey: $EXPO_PUBLIC_SUPABASE_ANON_KEY" -H "content-type: application/json" \
  -d '{"contentKey":"test","sourceText":"Rest when you can.","locale":"pt-BR"}'
```
Expected: JSON with non-empty `translatedText` in Portuguese, `cached: false`. Re-run → `cached: true`.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/translate-content/index.ts
git commit -m "feat(i18n): translate-content edge function with hash-keyed cache"
```

### Task C3: useTranslatedContent hook + consumer wiring

**Files:**
- Create: `lib/useTranslatedContent.ts`
- Modify: one heaviest consumer first — `lib/birthGuide/` reader (the component that renders a birth-guide topic; locate via `grep -rl birthGuide components`)
- Test: `lib/__tests__/useTranslatedContent.test.ts`

**Interfaces:**
- Consumes: `translate-content` edge function; `useLanguageStore` for current locale.
- Produces: `useTranslatedContent(contentKey: string, sourceText: string): { text: string; loading: boolean }` — returns `sourceText` immediately for `en`; otherwise React Query-fetches the translation and shows source as fallback while loading.

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/useTranslatedContent.test.ts
import { renderHook, waitFor } from '@testing-library/react-native'
import { useTranslatedContent } from '../useTranslatedContent'

jest.mock('../../store/useLanguageStore', () => ({
  useLanguageStore: (sel: any) => sel({ language: 'en' }),
}))

test('returns source text immediately for en (no fetch)', () => {
  const { result } = renderHook(() => useTranslatedContent('k', 'Hello'))
  expect(result.current.text).toBe('Hello')
  expect(result.current.loading).toBe(false)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/useTranslatedContent.test.ts`
Expected: FAIL with "Cannot find module '../useTranslatedContent'"

- [ ] **Step 3: Implement the hook**

```ts
// lib/useTranslatedContent.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'
import { useLanguageStore } from '../store/useLanguageStore'

export function useTranslatedContent(contentKey: string, sourceText: string) {
  const language = useLanguageStore((s) => s.language)
  const enabled = language !== 'en' && !!sourceText
  const { data, isLoading } = useQuery({
    queryKey: ['content-translation', contentKey, language],
    enabled,
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('translate-content', {
        body: { contentKey, sourceText, locale: language },
      })
      if (error) throw error
      return (data as { translatedText: string }).translatedText
    },
  })
  if (language === 'en') return { text: sourceText, loading: false }
  return { text: data ?? sourceText, loading: enabled && isLoading }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/__tests__/useTranslatedContent.test.ts`
Expected: PASS

- [ ] **Step 5: Wire the birth-guide reader** to call `useTranslatedContent(`birthguide_${topicId}_${sectionIndex}`, section.content)` for each rendered section's body, rendering `text` and showing a subtle loader when `loading`. Do not translate institutional names or `sources`.

- [ ] **Step 6: Verify in-app** — switch language to pt-BR, open a birth-guide topic, confirm content renders translated (first open slower, second instant from cache). `npm run typecheck` → PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/useTranslatedContent.ts lib/__tests__/useTranslatedContent.test.ts <birth-guide-reader-file>
git commit -m "feat(i18n): useTranslatedContent hook + birth-guide runtime translation"
```

### Task C4: Wire remaining prose consumers

**Files:** (in descending volume order — one commit per consumer family)
- Pillar detail views (`components/pillar/*`, pillar screen) → `pillar_<id>_intro|tip<n>` keys, reads from `lib/pillars.ts` / `pregnancyPillars.ts` / `prePregPillars.ts`. Pillar grid **names/descriptions** stay static keys (short); only intro/tips/suggestions go runtime.
- Growth leaps detail (`KidsHome` leap modal) → `growthleap_<id>_*`, reads `lib/growthLeaps.ts`.
- Weekly content (`WeekDetailModal`, week cards) → `week_<n>_*`, reads `lib/weekContent.ts` / `weekDetailData.ts` / `prepGuide.ts`.
- Appointments detail (`AppointmentDetailModal`) → `appt_<id>_*`, reads `lib/pregnancyAppointments.ts`.
- Vaccine info (`VaccineRecord` / vaccine detail) → `vaccine_<id>_*`, reads `lib/vaccineInfo.ts`.

- [ ] **Step 1:** For each consumer, replace the raw English literal render with `useTranslatedContent(stableKey, sourceText)`. Use a STABLE `contentKey` (id-based, never the text) so cache survives source edits except when the hash changes (which correctly forces re-translation).
- [ ] **Step 2:** `npm run typecheck` → PASS after each.
- [ ] **Step 3:** Manual verify each in pt-BR + es.
- [ ] **Step 4: Commit** per consumer family.

### Task C5: Optional cache warming (defer unless needed)

**Files:** none (operational)

- [ ] **Step 1:** ONLY if first-open latency on heavy topics is unacceptable: write a one-off script that POSTs every `(contentKey, sourceText)` for pt-BR + es to `translate-content` to pre-populate the cache. `log()` how many were warmed. Skip otherwise (YAGNI) — on-demand + cache is the default.

---

## Phase D — Final verification

### Task D1: Trilingual smoke test + release notes

- [ ] **Step 1:** In-app, for each of `en`, `pt-BR`, `es`: walk the 3 modes' home → calendar → analytics → library → profile → one onboarding flow. Confirm no English leakage on user-facing screens (other than institutional names).
- [ ] **Step 2:** Run the i18n-auditor agent one final time; record residual count in the plan's completion note.
- [ ] **Step 3:** `npm run typecheck` + `npm run i18n:check` → green.
- [ ] **Step 4:** Update `lib/i18n/keys.ts` count + the project's i18n memory note with the final coverage numbers.
- [ ] **Step 5: Commit**

```bash
git commit -am "docs(i18n): record final trilingual coverage"
```

---

## Self-Review Notes

- **Spec coverage:** Layer 1 (engine) = kept, no task needed. Layer 2 (UI) = Phase A (tooling: parity guard A1, Tolgee A2, **ESLint guard A3**) + Phase B (extraction, Kids-first per audit, glob expands per cluster). Layer 3 (prose) = Phase C (table → edge fn → hook → consumers). Languages pt-BR/es to 100% via Tolgee AI + the prose hook. **Self-sustaining guarantee:** A3's `no-literal-string` rule (widened in B7 Step 0) makes new hardcoded strings un-mergeable, so all future features stay trilingual by construction. ✓
- **Placeholder scan:** All code steps contain real code; commands have expected output. The only intentional `REPLACE_WITH_PROJECT_ID` is a config value the user sets once in Tolgee (documented in Task A2 Step 5). ✓
- **Type consistency:** `useTranslatedContent(contentKey, sourceText) → { text, loading }` is consistent across C3/C4. `checkKeyParity()` consistent A1↔B. Tolgee scripts consume `en`/`translations` exports that already exist in `lib/i18n`. ✓
- **Decision deferred in brainstorm:** execution mechanics (subagent-driven vs. manual waves) — resolved at handoff below.
