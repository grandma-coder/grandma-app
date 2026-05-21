# TestFlight + Dev Client Migration — Design Spec

**Date:** 2026-05-21
**Owner:** Igor (vibe coder — needs hand-holding, not assumptions)
**Goal:** Move grandma.app off Expo Go + ngrok onto (1) a custom **dev client** for daily iteration and (2) **TestFlight** for beta distribution.

---

## Why we're doing this

Today the app runs in **Expo Go** with **ngrok** tunneling Metro to your phone. This setup has three breaking problems:

1. **Native modules don't work in Expo Go.** `react-native-purchases` (RevenueCat) and `expo-apple-authentication` both need a real native build. They'll silently no-op or crash in Expo Go.
2. **ngrok is fragile** — tunnels drop, URLs rotate, free-tier rate limits hit. LAN-connected dev client is faster and stable.
3. **You can't ship from Expo Go.** TestFlight requires a real signed `.ipa` file, which only EAS Build (or local Xcode) can produce.

The fix is one-time setup pain in exchange for: working IAP, working Apple Sign-In, no ngrok, and the ability to send builds to beta testers.

---

## Two outcomes, one pipeline

We'll set up **EAS** (Expo Application Services) once, then use it for both tracks. EAS is Expo's hosted build service — you run a command, it builds your app on their servers, you get a download link.

| Track | What you get | When you use it |
|---|---|---|
| **A. Dev client** | A custom version of Expo Go that lives on your iPhone with your app's native code baked in. Runs your local Metro server over Wi-Fi. | Every day, replaces `expo start` + ngrok |
| **B. TestFlight** | A real App Store-signed build, distributable to up to 100 internal testers + 10,000 external testers via Apple's TestFlight app. | When you want stakeholders or beta users to try it |

We'll build Track A first (smaller, faster feedback). Once that works end-to-end, we build Track B.

---

## What's already in place

From inspecting the repo:

- ✅ Bundle ID set: `com.grandmacoder.grandmaapp` (in `app.json`)
- ✅ Apple Developer account active (you confirmed)
- ✅ Apple Sign-In plugin configured in `app.json`
- ✅ RevenueCat SDK installed (`react-native-purchases@9.15.0`)
- ✅ Expo SDK 54 + New Architecture enabled
- ❌ No `eas.json` yet
- ❌ No `expo-dev-client` package yet
- ❌ Nothing configured on App Store Connect or RevenueCat dashboards yet
- ❌ Secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `REVENUECAT_API_KEY`) are local in `.env` — fine for now, EAS reads them at build time

---

## Phase-by-phase plan

Each phase has a clear end-state. Don't move on until the end-state is checked.

### Phase 1 — Install EAS and link the project (one-time, ~15 min)

**What you'll do:**

1. Install the CLI globally: `npm install -g eas-cli`
2. Log in: `eas login` (uses your existing Expo account)
3. From the repo root: `eas init` — this creates an EAS project in your Expo account and writes a `projectId` into `app.json` under `extra.eas.projectId`
4. Install the dev client package: `npx expo install expo-dev-client`
5. We (the assistant) write `eas.json` with three profiles: `development`, `preview`, `production`

**End state:** `eas.json` exists, `app.json` has a `projectId`, `expo-dev-client` is in `package.json`. `eas whoami` returns your username.

### Phase 2 — Apple-side setup (mostly clicking in App Store Connect, ~45 min)

You'll do all of this in a browser at `appstoreconnect.apple.com` and `developer.apple.com`. The assistant will give you a click-by-click checklist.

**2a. Register the App ID**
- developer.apple.com → Identifiers → "+" → App IDs → App
- Bundle ID: `com.grandmacoder.grandmaapp` (must match `app.json` exactly)
- Capabilities to enable: **Sign in with Apple**, **In-App Purchase**
  - (Push Notifications, Associated Domains — leave off for now, add later if needed)

**2b. Create the App Store Connect record**
- App Store Connect → My Apps → "+" → New App
- Platform: iOS, Name: "grandma.app" (or whatever consumer name you want), Primary language, Bundle ID: pick the one you just registered, SKU: `grandma-app-ios`
- This creates the slot where TestFlight builds will land.

**2c. Create the two IAP products**
- App Store Connect → your app → Monetization → In-App Purchases → "+"
- Product 1: Auto-Renewable Subscription, Product ID `grandma_premium_monthly`, price $9.99/mo
- Product 2: Auto-Renewable Subscription, Product ID `grandma_premium_annual`, price $69.99/yr
- Both go in the same Subscription Group (e.g. "Grandma Premium")
- Fill in display name + description (required for "Ready to Submit")

**2d. Create a sandbox tester**
- App Store Connect → Users and Access → Sandbox → Testers → "+"
- Use a brand new email (not your real Apple ID). This is who you'll log in as on your phone to test paid IAP without real money.

**End state:** Bundle ID registered with the right capabilities, app record exists, two IAPs created, one sandbox tester exists.

### Phase 3 — RevenueCat dashboard (~20 min)

1. revenuecat.com → Projects → "+" → New project "grandma-app"
2. Add iOS app → paste bundle ID `com.grandmacoder.grandmaapp`
3. App Store Connect → Users and Access → Integrations → App Store Connect API → generate an API key (Vendor #, Issuer ID, Key ID, .p8 file) → paste all four into RevenueCat
4. App Store Connect → your app → App Information → grab the **Shared Secret** → paste into RevenueCat
5. In RevenueCat → Products → import the two products you created in 2c
6. RevenueCat → Entitlements → create "premium" → attach both products
7. RevenueCat → Offerings → create "default" → add both products as packages (monthly + annual)
8. RevenueCat → API keys → copy the **public iOS SDK key** (starts with `appl_…`)
9. Update `.env`: `REVENUECAT_API_KEY=appl_…` (also add to EAS env in Phase 5)

**End state:** RevenueCat dashboard knows about both products, has an offering "default" with monthly + annual, and you have an iOS SDK key.

### Phase 4 — First dev client build (Track A, ~25 min)

1. From the repo: `eas build --profile development --platform ios`
2. EAS will ask the first time: "Set up credentials?" → say **yes, generate** (this is where EAS-managed signing kicks in — it creates a distribution cert + provisioning profile inside your Apple account on your behalf, no manual download)
3. Wait ~15 min for the build (free tier has a queue; can be longer at peak times)
4. When done, EAS gives you a URL. Open it in **Safari on your iPhone** (not Chrome — must be Safari for ad-hoc installs)
5. Tap "Install" → iOS Settings → General → VPN & Device Management → trust the developer profile
6. On your Mac: `npx expo start --dev-client`
7. Open the new "grandma-app" icon on your phone (not Expo Go anymore — it's gone). It should auto-detect Metro on your LAN and load your local code.

**Smoke tests** (do all three before declaring victory):
- [ ] Apple Sign-In opens the native Apple sheet and completes
- [ ] Paywall screen shows the real RevenueCat offering with $9.99 / $69.99 prices (signed in as sandbox tester)
- [ ] A Supabase-backed screen (e.g. home) loads data

**End state:** You can iterate on the app without ngrok. Save and edit a file → Metro reloads on your phone over Wi-Fi.

### Phase 5 — Move secrets to EAS (~10 min)

Right now `.env` is read at runtime via `EXPO_PUBLIC_*`. That works for dev client (it bundles `.env` into the build) but for clean separation we'll register secrets with EAS too:

```
eas env:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://...supabase.co" --visibility plaintext --environment production
eas env:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJ..." --visibility sensitive --environment production
eas env:create --scope project --name REVENUECAT_API_KEY --value "appl_..." --visibility sensitive --environment production
```

(Repeat with `--environment development` and `--environment preview` if values differ; usually they don't for this app.)

**End state:** `eas env:list` shows all three for all three environments.

### Phase 6 — First TestFlight build (Track B, ~30 min build + 15–60 min Apple processing)

1. Bump version in `app.json`: `"version": "1.0.0"` stays for the first build; `buildNumber` will be auto-managed by EAS (configured in `eas.json` with `"autoIncrement": true`)
2. `eas build --profile production --platform ios`
3. When the build finishes: `eas submit --profile production --platform ios`
4. EAS uploads the `.ipa` to App Store Connect
5. App Store Connect → your app → TestFlight tab → wait for "Processing" to clear (~15–30 min) and the Export Compliance question to appear
6. Answer Export Compliance: "Does your app use encryption?" → Yes, "Only standard encryption (HTTPS)?" → Yes, "Exempt?" → Yes. (Save this answer for future builds.)
7. Add yourself as an internal tester: TestFlight → Internal Testing → create a group → add your Apple ID
8. Install the TestFlight app on your iPhone → log in → see your build → install

**End state:** Your app is in TestFlight, installable on any device signed in to a tester's Apple ID.

### Phase 7 — Documentation + nice-to-haves (~15 min)

The assistant will:

1. Add npm scripts to `package.json`:
   ```json
   "build:dev": "eas build --profile development --platform ios",
   "build:prod": "eas build --profile production --platform ios",
   "submit:ios": "eas submit --profile production --platform ios",
   "start:dev": "expo start --dev-client"
   ```
2. Update README: replace ngrok-era dev instructions with the dev-client flow
3. Note the version-bump checklist (which dovetails with your existing `/release` skill)

---

## `eas.json` shape (what we'll write)

```json
{
  "cli": { "version": ">= 14.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": false }
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": false }
    },
    "production": {
      "autoIncrement": true,
      "ios": { "simulator": false }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "<your apple id email>",
        "ascAppId": "<numeric ID from App Store Connect>",
        "appleTeamId": "<your team ID from developer.apple.com>"
      }
    }
  }
}
```

We fill in the `submit.production.ios` values during Phase 2 once App Store Connect has assigned them.

---

## Risks & gotchas

| Risk | Mitigation |
|---|---|
| First EAS build fails on New Architecture (`newArchEnabled: true`) | Both `react-native-purchases@9` and `react-native-reanimated@4` officially support New Arch on RN 0.81. If anything explodes we add `expo-build-properties` to pin iOS deployment target ≥ 15.1. |
| RevenueCat shows empty offerings on first run | 99% of the time this is sandbox-account-not-signed-in-on-device. Phase 4 smoke test covers it. |
| TestFlight build stuck in "Processing" for hours | Normal on first upload (Apple does an extra malware scan for new apps). Just wait. If >12 hours, check the email from Apple — usually a missing privacy declaration. |
| External (non-team) testers blocked | External testing requires a one-time TestFlight Beta App Review (~24h). Internal testing (your team only) skips review. We'll only do external when you have actual outside testers lined up. |
| You hit free-tier EAS build queue | Builds run when a slot opens; usually <30 min wait. Paid plan ($19/mo) gives priority queue. Not needed yet. |
| `expo-apple-authentication` capability not enabled before first build | Phase 2a covers this — must be done before Phase 4. |

---

## What this spec does NOT cover

- Push notifications setup (separate spec when you're ready)
- Android / Play Store (iOS first, Android later — same pattern)
- App Store production submission (TestFlight only — full release is a separate decision)
- CI/CD auto-builds on git push (manual `eas build` for now is fine)
- Over-the-air (OTA) updates via `eas update` (deferred; not needed until you have real users)

---

## Definition of done

The migration is done when:

1. ✅ You can run `npm run start:dev`, scan/connect from your iPhone's installed dev client, and see live reload work without ngrok
2. ✅ Apple Sign-In + RevenueCat paywall both work end-to-end in the dev client
3. ✅ A production build is installable via TestFlight on your iPhone
4. ✅ README reflects the new flow

---

## Next step after this spec

Move to `writing-plans` to break each phase into concrete, ordered tasks with verification steps — formatted so a vibe coder can follow them top-to-bottom without guessing.
