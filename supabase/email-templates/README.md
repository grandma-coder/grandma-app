# grandma.app — Auth email templates

Branded HTML for the emails Supabase Auth sends. Paste each file's contents into
**Supabase Dashboard → Authentication → Email Templates**, matching the file to
the template of the same name.

| File | Supabase template | When it sends |
|------|-------------------|---------------|
| `confirm-signup.html` | **Confirm signup** | New user signs up with email → confirm their address |
| `magic-link.html` | **Magic Link** | Passwordless sign-in link |
| `invite.html` | **Invite user** | You invite someone from Supabase → Auth → Users → Invite |

## How to apply

1. Supabase Dashboard → your project → **Authentication → Email Templates**.
2. Pick a template from the dropdown (e.g. "Confirm signup").
3. Replace the **Message body** with the matching file's full HTML.
4. Set the **Subject** (suggested subjects are in each file's top comment).
5. **Save**. Send yourself a test (sign up a throwaway address) to preview.

## Template variables (Go templates — leave these exactly as-is)

- `{{ .ConfirmationURL }}` — the action link (confirm / magic-link / accept-invite). **Required** in each.
- `{{ .Token }}` / `{{ .TokenHash }}` — the OTP code (optional, if you want a code-based flow).
- `{{ .SiteURL }}` — your configured site URL.
- `{{ .Email }}` — the recipient's email.

## Design

Cream-paper look matching the app: bg `#F3ECD9`, card `#FFFEF8`, primary
`#7048B8`, warm serif-ish headings via web-safe Georgia (email clients don't load
Fraunces reliably), DM-Sans-like fallback to Helvetica/Arial for body. Inline
styles only (email clients strip `<style>` blocks and don't support external CSS).
No images beyond an optional hosted logo URL — see the `LOGO_URL` note in each file.
