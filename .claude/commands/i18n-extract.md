# /i18n-extract

Extract hardcoded user-facing strings from a screen or component and wire them through grandma.app's i18n system.

## Inputs

Ask the user for:
1. The file to process (e.g. `components/home/KidsHome.tsx`). If they invoked the skill from an open file, use that.
2. Whether to **just propose** the changes (dry-run, show a diff) or **apply** them directly. Default: propose first.

## i18n System (verbatim)

- Translation hook: `import { useTranslation } from '@/lib/i18n'`
- Usage in component: `const { t } = useTranslation()` then `t('key_name')`
- Interpolation: `t('time_minutesAgo', { count: 5 })` with `{{count}}` in the source string
- Key registry: `lib/i18n/keys.ts` — the `TranslationKeys` type. Adding a key here is what makes it type-safe.
- Source-of-truth translations: `lib/i18n/en.ts` — every new key must be added here.
- Other locales (`pt-BR`, `es`, `fr`, `de`, `it`, `ja`, `ko`, `zh`, `ar`, `hi`, `tr`) — leave the English string in those files temporarily; the translation wave will fill them in later. Note in the final summary which locale files need follow-up translation.

## Naming Convention

Keys are snake_case, prefixed by feature area:
- `home_*` — home screen
- `tab_*` — tab labels
- `pillar_*` — pillar cards
- `chat_*` — Grandma chat
- `time_*` — relative time strings
- `cta_*` — buttons / calls to action
- `error_*` — error messages
- `empty_*` — empty states

If the file has a clear feature (e.g. `KidsHome.tsx`), use that prefix (`kids_home_*`).

## What to Extract

✅ Extract:
- All visible UI text in `<Text>`, button labels, placeholders, accessibility labels
- Error messages shown to the user
- Empty-state copy
- Dates/numbers that include words (e.g. "5 min ago" → use interpolation)

❌ Do NOT extract:
- Console logs / dev errors / thrown error messages (developer-facing)
- Style values, icon names, route paths
- Translation keys themselves (no infinite recursion)
- Single emojis or punctuation
- Strings that are already wrapped in `t(...)`

## Process

1. Read the target file.
2. Identify every extractable string and propose a key for it (follow naming convention).
3. Check `lib/i18n/keys.ts` — skip keys that already exist; reuse them.
4. Show the user a table:

   | Line | Original string | Proposed key |
   |------|----------------|--------------|
   | 42 | "Today's mood" | `kids_home_todays_mood` |

5. If the user confirmed "apply", or after they approve the table:
   - Add the new keys to `lib/i18n/keys.ts` (in the `TranslationKeys` type)
   - Add the English values to `lib/i18n/en.ts`
   - Add placeholder English values to all other locale files so TS doesn't break
   - Replace strings in the source file with `t('key_name')`
   - Add `const { t } = useTranslation()` import + hook call if not already present
6. Run `tsc --noEmit` (if quick) or at minimum eyeball that the imports and key types line up.

## Output

After applying:
- Count of strings extracted
- Count of new keys added to `keys.ts`
- List of locale files that now need real translations (i.e. all except `en.ts`)
- One-line reminder that this contributes to the 7-wave i18n plan tracked in memory

## Edge Cases

- **Interpolated strings**: `\`${count} kicks logged\`` → `t('pregnancy_kicks_logged', { count })` with English value `"{{count}} kicks logged"`.
- **Pluralization**: if you see `count === 1 ? 'kick' : 'kicks'`, extract as a single key with both forms handled in the value, or two keys (`*_singular`, `*_plural`). Note the limitation — the current i18n engine doesn't have built-in pluralization rules per locale.
- **Mode-aware copy**: if a string varies by `useModeStore`, extract one key per mode (e.g. `home_greeting_prepreg`, `home_greeting_pregnancy`, `home_greeting_kids`) rather than one key with branching.
- **Already partially translated**: don't re-extract `t(...)` calls; just process the remaining literals.

## Constraints

- Never change behavior — extraction is mechanical. If you spot a bug, mention it but don't fix it here.
- Never invent translations for non-English locales. The translation wave handles that.
- Keep diffs minimal — don't reformat surrounding code.
