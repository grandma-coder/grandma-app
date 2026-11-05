# Automatic translation sync — design

Date: 2026-11-05 · Owner: Igor · Status: draft for approval

## Goal

English is the only text anyone writes. Every new or changed English string or content block is
translated automatically into the active launch languages (pt-BR, es) before it ships, and the
build fails if anything visible is missing a translation. No more manual translation passes.

## Scope (v1)

| Content set | English source | Locale files | Today |
|---|---|---|---|
| UI strings | `lib/i18n/en.ts` | `lib/i18n/<lang>.ts` | complete in 12 |
| Cycle pillars | `lib/pillarContent` English via `pillarContentKeys` | `lib/pillarContent/<lang>.ts` | complete in 12 |
| Pregnancy content | `lib/pregnancyContent/english.ts` | `lib/pregnancyContent/<lang>.ts` | complete in 12 |
| **Birth guide** (new set) | `lib/birthGuide/*.ts` flattened by a new `lib/birthGuideContent/english.ts` | `lib/birthGuideContent/<lang>.ts` | **English only** |

Daily-message content (nested shape) stays as is in v1; it is complete and changes rarely.
Active languages = `SUPPORTED_LANGUAGES` minus `en` (today pt-BR, es). Hidden V2 languages are
not synced; re-enabling one later is "add it to the picker, run sync".

## How it works

1. **Registry** — `scripts/i18n/sets.ts` lists each content set: `name`, `english(): Record<string,string>`
   (flat key → English text), `localePath(lang)`, the exported const name, and a header comment.
2. **Manifest** — `i18n-manifest.json` (committed) stores, per set and language, the hash of the
   English text each key was last translated from. A key needs work when it's missing in the
   locale file or its English hash changed.
3. **`npm run i18n:sync`** — for each active language: collect keys needing work, translate them in
   batches with the Anthropic API (prompt: warm grandmother voice, feminine address where the
   language marks it, keep `{{params}}` and numbers/units exact, medical facts faithful, no
   added content), write them into the locale file (existing keys keep their order, new ones are
   appended), update the manifest. Keys removed from English are removed from the locales.
   Reads `ANTHROPIC_API_KEY` from the environment or `.env`; never logs it.
4. **`npm run i18n:check`** (no network) — fails if any active-language key is missing, its hash is
   stale, a `{{param}}` set differs from English, or the value equals the English text (beyond a
   short allowlist like "OK"). Runs in Jest via a test so CI and local `npm test` both catch it.
5. **CI** — `.github/workflows/i18n-sync.yml` on pull requests: runs `i18n:sync` with the
   `ANTHROPIC_API_KEY` repository secret and commits the translations back to the PR branch, so a
   PR arrives at review already translated. The existing CI job runs `i18n:check` through tests.
   Without the secret, sync is skipped and the check still fails loudly.

## Birth guide wiring

`BirthDetailModal` reads the bundled translation first (`bundledBirthGuideText(key, lang)`), and
uses the runtime translator only for a language that isn't bundled. Topic title, subtitle and the
disclaimer get keys too. The runtime edge function stays as a fallback; fixing/deploying it is out
of scope here (needs Igor's OK for deploy and prod writes).

## Out of scope

Admin (Command Center) content edits auto-translating on save; daily-message set; Tolgee (its
unused scaffold — `.tolgeerc.json`, `i18n:push/pull` — is removed); V2 languages.

## Testing

Unit tests for the manifest diff (missing / stale / removed keys), placeholder parity and the file
writer (round-trip keeps existing order). The coverage test fails on a deliberately stale fixture.
First real run translates the birth guide into pt-BR and es; spot-check a few sections in the app.

## What Igor does

Put `ANTHROPIC_API_KEY` in the local `.env` (already used by older scripts) and add it as a GitHub
repository secret. Nothing else.
