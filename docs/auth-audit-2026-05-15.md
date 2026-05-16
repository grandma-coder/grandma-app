# Auth Audit — grandma.app — 2026-05-15

**Scope:** `app/(auth)/`, `lib/auth-providers.ts`, `lib/supabase.ts`, `app/_layout.tsx` route guards, sign-out paths across `(tabs)/settings.tsx` + `profile/account.tsx` + `profile/settings.tsx` + `context/DevPanelContext.tsx`, `app/accept-invite.tsx`, `supabase/functions/accept-invite/`.

---

## P0 — Broken / Security / Blocker

### P0-1 — Apple Sign-In nonce is cryptographically incorrect
**File:** `lib/auth-providers.ts:16-19, 35`

```ts
const rawNonce = await Crypto.digestStringAsync(
  Crypto.CryptoDigestAlgorithm.SHA256,
  Crypto.getRandomBytes(32).toString()   // → "[object Uint8Array]"-ish comma list, not random bytes
)
```

Two compounded bugs:
1. `Uint8Array.toString()` returns `"0,34,218,..."` — partial entropy, non-standard encoding.
2. Variable named `rawNonce` is already a SHA-256 digest, then re-hashed by Supabase. Apple's JWT verification of the nonce-hash binding will fail unless server-side verification is disabled (masking the bug).

**Fix:** generate true random hex nonce → hash it once → pass raw to Apple, hashed to Supabase `signInWithIdToken`.

### P0-2 — Google OAuth token extraction only parses `url.hash`, missing PKCE query params
**File:** `lib/auth-providers.ts:69-84`

Supabase JS v2 default is PKCE — auth code arrives in query params, not hash. Every Google sign-in falls through to `throw new Error('Google sign-in was cancelled or failed')` even on success. Also `setSession` with hand-extracted tokens bypasses PKCE verification (security regression).

**Fix:** `await supabase.auth.exchangeCodeForSession(result.url)` and let `onAuthStateChange` handle session install.

### P0-3 — `accept-invite.tsx` is reachable without an active session
**File:** `app/accept-invite.tsx:14-36`

No auth gate. Unauthenticated deep-link recipients tap "Accept" → edge function rejects with "Not authenticated" → generic alert. Should redirect to `/(auth)/sign-in?invite=<token>` on missing session and resume after auth.

### P0-4 — Non-null assertions on env vars
**File:** `lib/supabase.ts:11-12`

`process.env.EXPO_PUBLIC_SUPABASE_URL!` — missing var passes `undefined` to `createClient`; every call fails with confusing network errors. Replace with explicit guards + descriptive error.

### P0-5 — Sign-out does not clear React Query cache or reset Zustand stores
**Files:** `app/(tabs)/settings.tsx:122`, `app/profile/account.tsx:71`, `app/profile/settings.tsx:50`, `context/DevPanelContext.tsx`

None of the four sign-out paths call `queryClient.clear()` or reset persisted Zustand stores (mode, child, behavior, journey, vault, etc.). On a shared device, the next user sees the previous user's children, logs, and vault until queries refetch. Persisted stores hydrate the wrong user on next launch.

### P0-6 — SecureStore 2KB chunking adapter missing
**File:** `lib/supabase.ts` (`ExpoSecureStoreAdapter`)

Terminal already shows the `Value being stored in SecureStore is larger than 2048 bytes` warning. In a future SDK this will throw. Supabase JWT + refresh token routinely exceeds 2KB. Implement the chunked SecureStore adapter from Supabase Expo docs.

---

## P1 — UX / Correctness

### P1-1 — `signIn()` lacks `finally` block
**File:** `app/(auth)/sign-in.tsx:40-45` — network exception leaves `loading=true` forever, button permanently disabled.

### P1-2 — "Forgot password?" is a dead `Text` element
**File:** `app/(auth)/sign-in.tsx:183-186` — not a `Pressable`, no handler, no reset screen exists. `auth_forgotPassword` i18n key exists; flow was planned, never implemented.

### P1-3 — Race between `getSession()` async chain and `onAuthStateChange`
**File:** `app/_layout.tsx:130-247` — both fire in parallel; on slow networks the listener can flip `loading=false` before profile/children/behaviors finish loading, mis-routing returning users to onboarding.

### P1-4 — `onAuthStateChange` does not load profile/children/role on `SIGNED_IN`
**File:** `app/_layout.tsx:241-244` — only handles `!session`. OAuth returns trigger route guard before `hasChildren`/`userRole`/`enrolledBehaviors` are loaded; guard treats user as new, re-runs onboarding.

### P1-5 — `accept-invite.tsx` uses legacy neon `colors` import
**File:** `app/accept-invite.tsx:6` — `import { colors } from '../constants/theme'` (static), `borderRadius: 16` on card (should be `radius.lg=28`), `borderRadius: 20` on button (should be `radius.full=999`), wrong background hex, no dark-mode adaptation.

### P1-6 — Sign-up toast dismissed on navigate (1200ms < 2800ms `autoDismiss`)
**File:** `app/(auth)/sign-up.tsx:39-45`

### P1-7 — No client-side validation on sign-in/sign-up
**Files:** `sign-in.tsx:40`, `sign-up.tsx:33-47` — empty/malformed inputs round-trip to Supabase.

### P1-8 — `InputField` typed as `any`
**File:** `app/(auth)/sign-in.tsx:221-233` — violates strict mode.

### P1-9 — Multiple Supabase errors swallowed in `_layout.tsx`
**File:** `app/_layout.tsx:135-143, 146-151, 220` — profile / care-circle / behaviors `error` destructured but never checked; falls through to default mode.

### P1-10 — Three+ divergent sign-out implementations
Different scopes (`local` vs `global`), different loading handling, different navigation. Consolidate into one `lib/signOut.ts` helper.

---

## P2 — Polish

- **P2-1** Auth screens hardcoded English (`auth_forgotPassword` key exists in all 12 locales, unused).
- **P2-2** `welcome.tsx:87-101` uses inline hex `#F5D652`/`#F2B2C7` instead of `stickers.yellow`/`stickers.pink`.
- **P2-3** Sign-in / sign-up have `const bg = isDark ? colors.bg : '#F3ECD9'` — redundant + risks token drift.
- **P2-4** `InputField` uses `font.display` (Fraunces) for typed values — serif numerals look odd in email/password.
- **P2-5** `accept-invite.tsx` uses raw emoji 🎉👵 instead of sticker components.
- **P2-6** `accept-invite.tsx` has no `SafeAreaView` / `useSafeAreaInsets()` (hardcoded `paddingTop: 80`).
- **P2-7** Back buttons 38×38pt visual — below 44pt minimum (hitSlop compensates touch but not VoiceOver).
- **P2-8** No `accessibilityLabel` / `accessibilityState={{ busy: loading }}` on auth buttons.
- **P2-9** Invite-token type cast is misleading in `useLocalSearchParams<{ token: string }>` (real type is `string | string[] | undefined`).

---

## Prioritized Fix Plan

**Immediate (P0 — before next TestFlight):**
1. Fix Apple nonce (`lib/auth-providers.ts`).
2. Fix Google PKCE via `exchangeCodeForSession`.
3. Create `lib/signOut.ts` — single helper that calls `supabase.auth.signOut`, `queryClient.clear()`, resets all persisted Zustand stores, navigates to welcome.
4. Gate `accept-invite.tsx` on session; preserve token through sign-in.
5. Install chunked SecureStore adapter.
6. Replace env-var non-null assertions with explicit guards.

**Short-term (P1 — current sprint):**
7. Move profile + children + behaviors load into `onAuthStateChange` for `SIGNED_IN`; remove parallel `getSession` chain.
8. Add `try/finally` to `signIn`.
9. Implement password-reset flow (`app/(auth)/forgot-password.tsx` + `supabase.auth.resetPasswordForEmail`).
10. Client-side validation (non-empty, regex, min length).
11. Type `InputField` properly; fix sign-up navigation timing.

**Polish (P2):**
12. Restyle `accept-invite.tsx` (PaperCard, SafeArea, stickers, mode color).
13. Wire all auth strings to `lib/i18n/`.
14. Fix sticker token usage in `welcome.tsx`.
15. Back-button visual size 44pt; add `accessibilityLabel`s + busy state.

---

**Verdict: Needs major fixes.** OAuth correctness, sign-out cache leak, and invite gate are blockers.
