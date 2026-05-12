# /pillar-add

Add a new pillar end-to-end across the 3-mode system.

## Inputs

Ask the user:
1. **Which mode?** `pre-pregnancy` | `pregnancy` | `kids`
2. **Pillar id** — kebab-case, unique within the mode (e.g. `mental-load`, `gut-health`)
3. **Display name** — short, Title Case ("Mental Load")
4. **Emoji / icon hint** — pillar cards use lucide icons + an accent color
5. **One-paragraph description** — used in the pillar detail screen and the Grandma system prompt

## Files to touch

| Mode | Pillar list file | Pillar count before adding |
|------|------------------|----------------------------|
| pre-pregnancy | `lib/prePregPillars.ts` | 6 |
| pregnancy | `lib/pregnancyPillars.ts` | 9 |
| kids | `lib/pillars.ts` | 9 |

Inspect the file first — the existing pillar shape is the source of truth. Match it exactly (id, name, description, icon, color, etc).

## Steps

1. **Read the target pillar file.** Find the existing `Pillar` interface or array type. Match the new entry's shape exactly — do NOT invent fields.
2. **Add the new pillar entry** at the end of the array. Preserve formatting and trailing-comma style.
3. **Update the nana-chat edge function** at `supabase/functions/nana-chat/index.ts`:
   - Find the pillar-specific system-prompt block (search for the existing pillar id strings).
   - Add a new branch for the new pillar id with a 3-5 sentence Grandma-voice system prompt tailored to the pillar topic.
   - Keep the same length, tone, and "Grandma" persona as adjacent pillars.
4. **i18n keys** — add to `lib/i18n/keys.ts` and `lib/i18n/en.ts`:
   - `pillar_<id>_name`
   - `pillar_<id>_description`
   - Add English placeholders to all other locale files (`pt-BR`, `es`, `fr`, `de`, `it`, `ja`, `ko`, `zh`, `ar`, `hi`, `tr`)
5. **Verify no hardcoded pillar list elsewhere** — grep for any of the existing pillar ids in the target mode. If you find a hardcoded list outside `lib/`, flag it (don't fix it — that's a refactor).

## Constraints

- Never touch the other two pillar files unless the user asks.
- Never hardcode hex colors — use tokens from `constants/theme.ts`.
- Never deploy the edge function automatically — print the deploy command at the end and let the user run it. Recommended: `supabase functions deploy nana-chat --no-verify-jwt`.

## Output

After applying:
- Files changed (with line count)
- The exact deploy command the user should run
- A reminder that the i18n placeholders need real translations for the next wave

## Edge cases

- **Pillar already exists**: stop and tell the user. Don't create a duplicate.
- **Mode-specific naming conventions**: pre-preg uses cycle/fertility terms, pregnancy uses week/baby terms, kids uses child/age terms. Match the surrounding pillar vocabulary.
- **Icon collision**: if the chosen lucide icon is already used by another pillar in the same mode, suggest 2 alternatives and ask which to use.
