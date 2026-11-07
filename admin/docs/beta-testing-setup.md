# Beta testing — how to invite testers to the grandma app

There are three layers to a beta invite. The command center only owns the third
(tracking). The store owns distribution; Supabase owns the signup email.

```
1. Distribute the build   →  TestFlight (iOS) / Play Console (Android)   ← the store does this
2. They sign up in-app    →  Supabase Auth (branded email you control)   ← supabase/email-templates/
3. Track + grant premium  →  Command Center → Beta testers               ← the /beta tool
```

---

## 1. iOS — TestFlight (App Store Connect)

For a handful of testers, use **Internal Testing** — no Apple review, instant.

1. Make sure a build is uploaded: `npm run eas:build:preview:ios` (from the app
   repo — this is the "Internal TestFlight preview" script), or `eas:submit:ios`
   for the latest.
2. Go to **App Store Connect → your app → TestFlight**.
3. Left sidebar → **Internal Testing** → **＋** to create a group (e.g. "First
   testers"). Internal testing allows up to **100** people who are on your team.
   - Need people outside your team? Use **External Testing** (up to 10,000) —
     that requires a one-time **Beta App Review** (usually <24h).
4. **Add testers by email.** Apple sends them a TestFlight invite email.
5. Fill in **Test Information** (this is where *your* words go into the flow):
   - **What to Test** — e.g. "Try onboarding for your journey (trying to
     conceive / pregnancy / kids), log a few things, and tell us what felt off."
   - **Beta App Description**, feedback email, marketing URL.
6. Tester flow: they install the **TestFlight app** from the App Store, tap your
   invite link, install grandma, open it, and sign up.

> Apple's invite email shell is Apple-branded — you can't fully restyle it, but
> your app name, icon, and the "What to Test" note are what the tester reads.

---

## 2. Android — Play Console

Use **Internal testing** for a small group — fastest track.

1. Upload an Android build (`eas build -p android` / your Android submit script).
2. **Play Console → your app → Testing → Internal testing**.
3. **Create email list** → add your testers' emails → save.
4. **Create a release**, attach the build, roll it out to the internal track.
5. Copy the **opt-in URL** and share it (or Google emails list members). Testers
   tap it, accept, and install grandma from Play.
6. Add test instructions + a feedback channel under the track's settings.

---

## 3. Supabase — brand the signup email (the one you control)

When a tester opens the app and signs up, **Supabase** sends the confirmation /
magic-link email. This is the fully brandable one.

1. **Supabase Dashboard → Authentication → Email Templates.**
2. For each template (**Confirm signup**, **Magic Link**, **Invite user**),
   paste the matching HTML from `grandma-app/supabase/email-templates/`:
   - `confirm-signup.html` → Confirm signup
   - `magic-link.html` → Magic Link
   - `invite.html` → Invite user
3. Set the **Subject** (suggested subjects are in each file's top comment).
4. **Save**, then sign up a throwaway address to preview it.

> Optional: host the grandma logo somewhere public and drop its URL into the
> `{{LOGO_URL}}` slot in each template to show the mark above the wordmark.

### Alternative: invite straight from Supabase (skips the store for web/dev)
Supabase → **Authentication → Users → Invite user** sends the `invite.html`
email with a set-password link. Good for quick internal testing, but note this
creates an *auth account*, not app-store access — they still need the build from
TestFlight/Play to use the mobile app.

---

## 4. Track them in the Command Center

1. **Command Center → Beta testers** (`/beta`, admin only).
2. **Add a tester** — email + name + platform + note. This records who you
   invited; it does not send anything (the store does that).
3. When they sign up in-app, their row flips to **signed up** (matched by email
   against `auth.users`), showing their tier and last-active.
4. Click **Grant premium** to comp them `premium_solo` so they can test paid
   features — or open their full profile with **view →**.

---

## Quick reference — who sends which email

| Email | Sent by | Customizable? |
|-------|---------|---------------|
| "You're invited to TestFlight" | Apple | Test notes only (Apple shell) |
| "Join the Android test" | Google | Instructions only (Google shell) |
| "Confirm your email" / magic link | **Supabase** | **Fully — see supabase/email-templates/** |
| Supabase "Invite user" | **Supabase** | **Fully — invite.html** |
