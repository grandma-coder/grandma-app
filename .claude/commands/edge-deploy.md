# /edge-deploy

Deploy a Supabase edge function with the correct JWT flag for grandma.app.

## Inputs

Ask the user:
1. **Which function?** Show a numbered list of subdirs in `supabase/functions/` and let them pick.
2. **Confirm** the JWT setting matches the table below before deploying.

## JWT verification matrix (memorize)

| Function | `--no-verify-jwt`? | Why |
|----------|---------------------|-----|
| `nana-chat` | yes | Called from app, no JWT needed (uses anon key only) |
| `scan-image` | yes | Same as nana-chat |
| `generate-insights` | yes | Internal cron + app calls |
| `revenuecat-webhook` | yes | RevenueCat servers can't send a JWT |
| `invite-caregiver` | no | Requires authenticated caller |
| `accept-invite` | no | Requires authenticated caller |

If the user adds a new function, ASK which category it falls into. Default to `no-verify-jwt: no` (safer) and require justification to flip.

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
