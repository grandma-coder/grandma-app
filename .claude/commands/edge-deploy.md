# /edge-deploy

Deploy a Supabase edge function with the correct JWT flag for grandma.app.

## Inputs

Ask the user:
1. **Which function?** Show a numbered list of subdirs in `supabase/functions/` and let them pick.
2. **Confirm** the JWT setting matches the table below before deploying.

## JWT verification matrix (memorize)

> **`--no-verify-jwt` disables only the GATEWAY check — it does NOT mean "no auth."**
> Every `yes` function below (except the webhook) still verifies the caller's JWT
> *in code* (`supabase.auth.getUser(token)`, 401 on failure). The flag just lets us
> return a clean 401 ourselves instead of a gateway 401. Deploying one of these
> WITHOUT the internal check makes it an open Anthropic relay — that was the
> `translate-content` bug (fixed 2026-07-14).

| Function | `--no-verify-jwt`? | Auth model |
|----------|---------------------|-----|
| `nana-chat` | yes | Verifies JWT in code (`getUser`), 401 on failure |
| `grandma-chat` | yes | Verifies JWT in code |
| `scan-image` | yes | Verifies JWT in code + free-tier scan cap |
| `food-ai` | yes | Verifies JWT in code |
| `generate-insights` | yes | Verifies JWT in code (app + internal cron) |
| `translate-content` | yes | Verifies JWT in code (added 2026-07-14) |
| `revenuecat-webhook` | yes | No JWT — validates a shared webhook secret (constant-time) instead |
| `invite-caregiver` | no | Gateway-verified authenticated caller |
| `accept-invite` | no | Gateway-verified authenticated caller |

If the user adds a new function, ASK which category it falls into. Default to `no-verify-jwt: no` (safer). To flip to `yes`, the function MUST do its own `getUser(token)` check (or validate a secret, like the webhook) — never ship a `yes` function that does no auth at all.

## Steps

1. Confirm the user is in the project root (`/Users/igorcarvalhorodrigues/Projects/grandma-app`).
2. Verify the function directory exists: `supabase/functions/<name>/index.ts`.
3. Show the exact command you're about to run, then run it:
   ```
   supabase functions deploy <name> [--no-verify-jwt]
   ```
4. After deploy, tail the function logs for ~10 seconds to surface immediate startup errors:
   ```
   supabase functions logs <name> --tail
   ```
   (Optional — only if the user asks. Don't block on this.)

## Pre-deploy checks

- The function file exists.
- `ANTHROPIC_API_KEY` (if the function calls Claude) is set as a Supabase secret. Check via `supabase secrets list` — don't print the value.
- The function imports are syntactically valid (no obvious typos in `import` lines).

## Constraints

- NEVER deploy multiple functions in one invocation — one at a time.
- NEVER pass `--legacy-bundle` unless the user explicitly asks.
- NEVER deploy from a branch that isn't `main` without flagging it to the user first.
- If the user invokes this skill but says "deploy all", refuse and ask which one to start with.

## Output

- Function name + deploy duration
- The exact command that ran
- One-line reminder: "Test the function from the app before assuming success — `supabase functions deploy` succeeds even when the code has runtime errors."
