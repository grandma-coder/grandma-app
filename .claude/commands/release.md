# /release

Run the pre-release checklist for grandma.app before submitting to the App Store.

Ask the user: **Which release type?**
- `patch` — bug fixes only
- `minor` — new features
- `major` — breaking changes or major new feature set

Then work through each section below. Check each item by reading files or asking the user. Mark ✅ pass, ❌ fail, ⚠️ needs attention.

---

## 1. Code Quality
- [ ] No `console.log` / `console.error` in production screens (grep `app/` and `components/`)
- [ ] No `// TODO` or `// FIXME` in critical paths (auth, payments, AI chat, vault)
- [ ] No hardcoded test UUIDs or demo data in screens
- [ ] TypeScript compiles without errors (`npx tsc --noEmit`)

## 2. Supabase
- [ ] All pending migrations pushed (`supabase db push` or `supabase migration list`)
- [ ] All Edge Functions deployed:
  - `nana-chat`
  - `scan-image`
  - `generate-insights`
  - `invite-caregiver`
  - `accept-invite`
  - `revenuecat-webhook`
- [ ] `ANTHROPIC_API_KEY` is set as a Supabase secret (NOT in app code)
- [ ] RLS is enabled on any new tables added this release

## 3. Environment & Keys
- [ ] `.env` is in `.gitignore` (never committed)
- [ ] `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set
- [ ] `REVENUECAT_API_KEY` is configured
- [ ] No `service_role` key anywhere in app code (grep for it)

## 4. RevenueCat / Payments
- [ ] Products configured in RevenueCat dashboard
- [ ] Paywall screen tested on a real device (not simulator)
- [ ] Free tier limits enforced (3 scans max)
- [ ] Webhook endpoint active and subscription status syncing

## 5. Auth Flows
- [ ] Email sign-up → confirm email → sign in works end-to-end
- [ ] Apple Sign-In configured with correct Bundle ID
- [ ] Google OAuth redirect URI matches Expo config
- [ ] Caregiver invite flow tested (send → accept → access verified)

## 6. 3-Mode System
- [ ] All 3 modes load without errors (pre-pregnancy / pregnancy / kids)
- [ ] Mode switcher persists after app restart
- [ ] Onboarding completes for all 3 journey types
- [ ] Vault tab hidden in pre-pregnancy mode

## 7. App Store Assets (for new submissions)
- [ ] App icon: 1024×1024 PNG, no alpha channel
- [ ] Screenshots for iPhone 6.9" (required), 6.5", iPad 12.9" (if iPad supported)
- [ ] App description updated in `app.json` / EAS config
- [ ] Version number bumped in `app.json`
- [ ] Build number incremented

## 8. EAS Build
```bash
# Verify app.json version and buildNumber are updated, then:
eas build --platform ios --profile production
```
- [ ] Build completes without warnings
- [ ] TestFlight upload successful
- [ ] Internal testers sign off

## 9. Quick Smoke Test (do on device before submission)
- [ ] Open app fresh (no cached state) → onboarding works
- [ ] AI chat sends a message and Grandma responds
- [ ] Camera scan opens and processes an image
- [ ] Calendar shows activity dots
- [ ] Channels load (80+ channels visible)
- [ ] Garage feed loads with listings
- [ ] Notifications center opens

---

## Summary

After checking all items, output:

**Release Readiness: READY / NOT READY**

List all ❌ failures as blockers.
List all ⚠️ warnings as "fix before next release."

Suggest the EAS build command with the correct profile.
