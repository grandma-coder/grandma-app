# i18n — Tolgee CLI Round-Trip

This document describes how to set up and use the Tolgee Cloud integration for translating grandma.app into 11 languages.

---

## 1. Create a Tolgee Cloud Project

1. Go to [app.tolgee.io](https://app.tolgee.io) and sign in (free tier covers this project).
2. Create a new project — name it `grandma-app` (or any name you prefer).
3. Note the **numeric project ID** from the URL: `https://app.tolgee.io/projects/<ID>/...`
4. Open `.tolgeerc.json` at the repo root and replace `REPLACE_WITH_PROJECT_ID` with your numeric ID.

```json
{
  "projectId": 12345
}
```

> Never commit a real API key. The project ID is not a secret and is safe to commit.

---

## 2. Store the API Key

Generate a Personal Access Token from your Tolgee account settings, then export it in your shell (or add to your shell profile — **never commit it**):

```sh
export TOLGEE_API_KEY=tgpak_your_token_here
```

The `npm run i18n:push` and `npm run i18n:pull` commands pass `$TOLGEE_API_KEY` to the Tolgee CLI at runtime.

---

## 3. Enable AI Machine Translation

Inside your Tolgee project:

1. Go to **Project settings → Machine translation**.
2. Enable **Tolgee Translator (AI)** for the following languages as a starting point:
   - `pt-BR` (Brazilian Portuguese)
   - `es` (Spanish)
3. You can also enable it for the remaining 9 locales (`fr`, `de`, `it`, `ja`, `ko`, `zh`, `ar`, `hi`, `tr`) — AI suggestions appear inline in the Tolgee editor for translator review.

---

## 4. Dev Workflow

The standard loop for adding or updating translation keys:

```
1. Add the key via /i18n-extract  (wires it into the app + lib/i18n/en.ts)
2. npm run i18n:push              (export en.json → push source strings to Tolgee)
3. Review / translate in Tolgee   (use AI suggestions, edit, mark as reviewed)
4. npm run i18n:pull              (pull translated JSON → overwrite lib/i18n/<code>.ts files)
```

### Available scripts

| Script | What it does |
|---|---|
| `npm run i18n:push` | Runs `scripts/i18n-export-en.ts` (writes `tolgee/en.json`) then calls `tolgee push` |
| `npm run i18n:pull` | Calls `tolgee pull` (writes `tolgee/<locale>.json`) then `scripts/i18n-import.ts` then `i18n:check` |
| `npm run i18n:sync` | `i18n:push` followed by `i18n:pull` in one step |
| `npm run i18n:check` | Parity check — verifies locale files have expected keys vs English source |

> `npm run i18n:import` is invoked automatically by `i18n:pull` — you do not need to call it manually. Similarly, the parity check (`i18n:check`) runs automatically at the end of every `i18n:pull`.

---

## 5. What Leaves the Repo

**Only English source strings** are pushed to Tolgee Cloud. These are UI copy — button labels, headings, placeholder text. No user data, health records, or personally identifiable information ever leave the device or the repo's locale files.

The `tolgee/` directory is gitignored (it holds generated JSON build artifacts). Only `lib/i18n/*.ts` files are committed.

---

## 6. File Map

```
.tolgeerc.json                  — Tolgee CLI config (commit; no secrets)
scripts/i18n-export-en.ts       — Generates tolgee/en.json from lib/i18n/en.ts
scripts/i18n-import.ts          — Reads tolgee/<locale>.json → overwrites lib/i18n/<code>.ts
tolgee/                         — Generated artifacts (gitignored)
lib/i18n/en.ts                  — English source of truth (TranslationKeys)
lib/i18n/<code>.ts              — Translated locale files (committed)
```

---

## 7. Adding a New Locale

1. Add the locale code to the `LOCALES` array in `scripts/i18n-import.ts`.
2. Add its camelCase const name to the `constName` map.
3. Create the language in your Tolgee project.
4. Run `npm run i18n:sync`.
5. Wire the new locale into `lib/i18n/index.ts` and `useLanguageStore`.
