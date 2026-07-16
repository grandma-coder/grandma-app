# Flo Auth Flow — Screenshot Analysis

## Screen 053 — Welcome Hero / Auth Entry Point
- **Purpose:** Initial auth entry screen establishing brand + value proposition.
- **Text inventory:** 
  - "#1 women's health app*"
  - "Take control of your health"
  - "90% of users say Flo accurately predicts the start of their period."
  - "Based on a 2021 survey of 2k Flo users"
  - Button labels: "Continue with Apple", "Continue with Google", "Continue with email"
  - Footer: "Flo" logo + "curated by Mobbin"
- **UI structure:** Hero section with large pink "#1" badge + hero image/illustration (pink + peach botanical motifs). Three stacked CTA buttons below: Apple (black pill), Google (light pill), Email (light pill). Social auth-first positioning.
- **Flow & logic:** 
  - Social-first auth (Apple, Google) above email — frictionless credential reuse
  - No anonymous mode offered
  - Email is third option — fallback for users without Apple/Google
  - No account-optional flow; all paths require registration

## Screen 054 — Email Sign-Up Form
- **Purpose:** Email-based account creation with inline password validation.
- **Text inventory:**
  - Tab: "Sign up" (active, underlined) | "Log in"
  - Field labels: "Email", "Password"
  - Password requirement text: "Your password must be at least 8 characters, including a lowercase letter, an uppercase letter, and a number."
  - Button: "Sign up" (disabled state shown in light teal)
- **UI structure:** Two-tab form (Sign up / Log in tabs). Email + password text fields. Password has visibility toggle (eye icon). On-screen keyboard shown. Button disabled until form valid.
- **Flow & logic:** 
  - Password complexity enforced client-side with help text
  - Tab-based form consolidation — sign up and login share same surface
  - No email verification mention at this stage

## Screen 055 — Email Entry / Password Hidden
- **Purpose:** Form fill progression after email entry.
- **Text inventory:**
  - Email field (pre-filled): "jdoe.mobbin1@gmail.com"
  - Password field (empty, focus visible via blue underline)
  - Eye icon for visibility toggle (visible)
  - "Sign up" button (enabled, teal pill)
- **UI structure:** Two-field form. Email persists with eye icon on password field. Focus state on password field (blue underline). Large sign-up button below.
- **Flow & logic:** 
  - Email + password dual-field form continues
  - Button enabled after valid email entry (password can be filled next)
  - Minimal validation messaging at this stage

## Screen 303 — Post-Auth Journey Question Modal
- **Purpose:** Establish user intent during onboarding (journey mode selection).
- **Text inventory:**
  - Modal title: "Are you pregnant?"
  - Option 1 (maroon/burgundy button): "No, but I want to be"
  - Option 2 (maroon/burgundy button, text cut off): "No, I'm here to better understand my body"
  - Background modal: "Sign in and restore data" (visible beneath)
- **UI structure:** Full-screen modal with journey-mode choice buttons (two maroon/burgundy pill buttons, fully padded). Background shows prior sign-in modal layered behind.
- **Flow & logic:** 
  - Immediate post-auth journey-mode branching (pre-pregnancy vs. understanding body)
  - Modal-driven UX — blocks progression until mode selected
  - Maroon color signals critical branching decision
  - Third option likely: "Yes, I'm pregnant" (not visible in frame)

## Screen 304 — Login Flow / Data Restoration Modal
- **Purpose:** Sign-in surface offering credential recovery and data sync.
- **Text inventory:**
  - Modal title: "Sign in and restore data"
  - Subtitle: "If you have login information, please click here to proceed."
  - Button labels: "Continue with Apple", "Continue with Google", "Continue with email"
  - "Forgot your password?" link (teal)
  - Footer: "Flo" logo
- **UI structure:** Modal overlay. Three social auth options stacked (Apple black, Google light, Email light). Email sign-in path offered. Password recovery link prominent.
- **Flow & logic:** 
  - Second entry point for returning users (during journey-mode selection flow)
  - Data restoration messaging — accounts sync across devices
  - Social auth repeated (consistency with initial entry)
  - Password recovery available (teal link)

## Screen 305 — Email Sign-In Form
- **Purpose:** Dedicated email login screen for credential entry.
- **Text inventory:**
  - Page title (implied): Login flow
  - Field labels: "Email" (pre-filled), "Password" (empty)
  - Link: "Forgot your password?" (teal)
  - Button: "Log in" (teal pill)
  - Back arrow (navigation)
- **UI structure:** Two-field form (email + password). Email pre-filled from prior screen. Eye icon on password field. "Forgot your password?" link below password field. "Log in" button below link.
- **Flow & logic:** 
  - Continuous form from 303 → 304 → 305 journey
  - Email persists across screens
  - Password recovery available inline
  - No "Don't have an account?" link visible (assumed modal flow controls branching)

## Screen 306 — Loading / Session Establishment
- **Purpose:** Async operation — logging in, verifying, syncing data.
- **Text inventory:**
  - Loading text: "Logging in to your account..."
- **UI structure:** Full-screen spinner (circular animated loader). Centered text. Minimal visual footprint during async wait.
- **Flow & logic:** 
  - Session establishment + data sync in progress
  - No cancel option visible — user waits for completion
  - Likely 3–5 second operation before onboarding resumes

---

## Synthesis

### Auth Flow Map
1. **Entry:** Hero screen (053) → Social-first, email fallback
2. **Sign-Up Branch:** Email/password form (054–055) → Journey mode question (303)
3. **Sign-In Branch:** Data restoration modal (304) → Email login (305) → Loading (306)
4. **Post-Auth:** Journey mode selection controls next screens (pre-preg vs. preg vs. understanding body)

### Auth Methods Offered
- **Social:** Apple (black priority), Google (secondary)
- **Email:** Primary fallback; password complexity enforced (8+ chars, mixed case + number)
- **Anonymous:** None offered — account required
- **Passwordless:** Not visible; password recovery available

### Privacy & Anonymity Strategy
- **No anonymous mode:** All users must create account (reduces privacy anonymity, increases retention)
- **Data restoration messaging:** Explicit on sign-in modal — accounts sync across devices (privacy transparency: "your data goes with you")
- **No explicit privacy/ToS copy visible** in these 7 screens (likely deferred to sign-up completion or footer link)

### Account-Optional vs. Required
- **Account required:** All flows terminate at account creation or login; no guest/anonymous mode
- **Single account incentive:** "Data restoration" messaging encourages account persistence

### Top Patterns Worth Stealing for grandma.app
1. **Social-first positioning:** Apple (black priority CTA) above email — frictionless for iOS users; copy button order in existing code
2. **Inline password rules:** Real-time validation with helper text (8+, mixed case, number) — use instead of post-submit error
3. **Tab consolidation:** Single form surface for sign-up + login (toggle between) — reduces screen count
4. **Journey branching post-auth:** Immediate "what's your use case?" question (pregnant / trying / health-aware) — mirrors grandma.app's 3-mode system; ask *before* onboarding
5. **Data restoration framing:** "Your data syncs" messaging — addresses privacy concern ("where does my info go?") for women's health users
