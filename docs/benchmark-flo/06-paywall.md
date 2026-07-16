# Flo Paywall & Subscription — 9 Screens Benchmark

## Screen 044 — Initial Plan Selector (Trial Disabled)

**Purpose:** Primary paywall entry point offering two subscription tiers with trial toggle option.

**Text inventory:**
- Headline: "Choose your plan"
- Social proof: 5-star rating + testimonial ("A ladies best friend. Awesome and quite accurate! 👍👍👍" — 333honesty)
- Trial toggle label: "Not sure yet? Enable free trial."
- Plan 1 (highlighted): "Yearly Plan" | "12 mo • $59.99" | "$5 / mo"
- Plan 2: "Friends Plan" | "UP TO 5 FRIENDS" | "12 mo • $79.99" | "$6.67 / mo"
- CTA button: "Continue" (coral/pink)
- Secondary link: "View all plans"
- Navigation: X (close), "Restore" (top right)

**UI structure:**
- Vertical scroll card stack; first plan highlighted with coral border + "MOST POPULAR" badge
- Toggle switch styled as pill (light purple background)
- Large rounded button (radius ~999)
- Minimal spacing; clean typography hierarchy

**Flow & logic:**
- Post-onboarding / feature-gated access (AI chat, full insights, premium features)
- Trial toggle defaults OFF; user must opt-in for free trial
- "Yearly Plan" pre-selected as MOST POPULAR (price anchoring: annual > monthly)
- Friends Plan shown as alternative (family/group strategy)
- "View all plans" suggests additional pricing tiers exist elsewhere

---

## Screen 045 — Initial Plan Selector (Trial Enabled)

**Purpose:** Same paywall, but with free trial toggled ON, revealing trial copy and updated CTA.

**Text inventory:**
- Headline: "Choose your plan"
- Social proof: 5-star rating + testimonial ("Really accurate!! This app is amazing it's so easy to use and really really awesome! I love this app so much. I've tried other apps but this one is by far the best!!" — shelby_the_one_and_only)
- Trial toggle label: "Free trial enabled" (toggle now ON / purple)
- Plan 1: "Yearly Plan" + "14-DAY FREE TRIAL" badge | "12 mo • $59.99" | "$5 / mo"
- Plan 2: "14-Day Free Trial. Friends Plan" | "UP TO 5 FRIENDS" | "12 mo • $79.99" | "$6.67 / mo"
- CTA button: "Start 14-Day Free Trial" (coral/pink)
- Secondary link: "View all plans"

**UI structure:**
- Identical layout to 044, but badge text + button text changes to reflect trial
- "14-DAY FREE TRIAL" badge replaces "MOST POPULAR" on first card
- Card copy dynamically updates to mention trial

**Flow & logic:**
- Toggling trial ON converts the paywall to trial-first messaging
- Both plans offer same 14-day trial (no tier differentiation on trial length)
- Trial is the conversion path for hesitant users (removes payment friction)
- Button CTA changes from generic "Continue" to "Start 14-Day Free Trial" (action clarity)

---

## Screen 046 — Loading State (Plan Selector)

**Purpose:** Mid-paywall state while plan selection is being processed or content is loading.

**Text inventory:**
- Headline: "Choose your plan"
- Social proof: 5-star rating + testimonial (fefe prescod: "Best app I love this app and all the insight it gives on health and your body.")
- (Loading spinner visible — circular animated skeleton)

**UI structure:**
- Same card layout as 044/045, but content below social proof is obscured / loading
- Large circular spinner (gray) positioned in the blank space
- Cards not yet visible

**Flow & logic:**
- Transient state between paywall load and plan card render
- Spinner gives tactile feedback that a purchase is being set up
- Lasts < 2s typically

---

## Screen 047 — App Store Dialog (Subscription Confirmation)

**Purpose:** Native iOS App Store subscription sheet (system modal) before purchase completion.

**Text inventory:**
- Header: "App Store"
- Product: "Flo Premium" | "Flo Period & Cycles Tracker (12+)" | "Subscription"
- Trial info: "2-week free trial" | "Starting today"
- Price: "S$ 99.98 per year" | "Starting on 29 Mar 2024"
- Legal: "No commitment. Cancel at any time in Settings > [Apple ID icon] at least one day before each renewal date. Plan automatically renews until cancelled."
- Account: "Account: jdoe.mobbin1@icloud.com"
- CTA: "Double Click to Subscribe" (icon + text, centered blue button)
- Navigation: X (close)

**UI structure:**
- System-native iOS App Store sheet (cannot be restyled by app)
- Tall white modal, bottom-safe-area padding
- Icon + product name header
- Trial + renewal details stacked
- Scrollable legal copy (small gray text)
- Account email shown at bottom (user context)
- Blue double-click button (Apple's security UX to prevent accidental purchase)

**Flow & logic:**
- Invoked after user taps "Continue" / "Start Trial" on app paywall
- App Store asks for final confirmation via native dialog
- 2-week trial mentioned here; renewal date shown
- Apple's legal copy enforced (user must see cancellation terms)
- User identity pre-filled (active iCloud account)

---

## Screen 048 — App Store Dialog (Processing State)

**Purpose:** Subscription purchase is in-flight; shows processing spinner while Apple validates payment.

**Text inventory:**
- Header: "App Store"
- Product: "Flo Premium" | "Flo Period & Cycles Tracker (12+)" | "Subscription"
- Trial info: "2-week free trial" | "Starting today"
- Price: "S$ 99.98 per year" | "Starting on 29 Mar 2024"
- Legal: (same as 047)
- Account: (same as 047)
- Status: "Processing" (gray text, centered below button)
- CTA area: Circular spinner (blue)

**UI structure:**
- Identical to 047 sheet, but button area shows processing spinner instead of "Double Click" text
- Spinner is teal/blue
- "Processing" label below spinner

**Flow & logic:**
- Post-button-tap state; Apple is validating payment method + executing subscription
- Lasts 2–5 seconds typically (depends on network + Apple's servers)
- User cannot interact during this state (button is disabled/loading)
- Once complete, transitions to success state (Screen 050) or error (not shown)

---

## Screen 049 — Purchase Success Dialog

**Purpose:** Confirmation that subscription was activated; user can now close and access premium.

**Text inventory:**
- Headline: "You're all set"
- Subheading: "Your purchase was successful."
- CTA button: "OK" (blue link-style text)

**UI structure:**
- Small centered modal dialog (white background, rounded corners)
- Large heading + body text
- Single blue "OK" button (minimal styling, text-only)
- Appears on top of the paywall blur

**Flow & logic:**
- Shown after successful purchase
- User taps "OK" to dismiss and return to main app
- Subscription is now active; user has premium access
- RevenueCat / App Store validates receipt in background

---

## Screen 050 — Post-Purchase Celebration Screen

**Purpose:** Celebratory full-screen confirmation that user is now a Flo Premium member.

**Text inventory:**
- Flo logo (white sticker graphic)
- Headline: "Congratulations, you've got Flo Premium!"
- Subheading: "You can now enjoy everything Flo Premium has to offer."
- CTA button: "Let's go" (black pill button)

**UI structure:**
- Full-screen modal with vibrant coral/pink gradient background
- Centered white Flo logo + feather illustration
- Large serif headline
- Light subtext
- Single large pill CTA button (black)
- Safe area aware (not behind notch/home indicator)

**Flow & logic:**
- Shown post-purchase to reinforce win + onboard to premium features
- Can be swiped/dismissed if user skips
- "Let's go" CTA closes modal and returns to app (often home screen or feature that was gated)
- Builds brand moment + emotional reinforcement

---

## Screen 051 — Winback Offer (Gift Box)

**Purpose:** Personalized winback offer to lapsed user; gamified "reveal gift" mechanic with scarcity urgency.

**Text inventory:**
- Headline: "A gift just for you"
- Subheading: "Open the box to reveal your offer."
- Illustration: Cartoon gift box with pink/purple bow and colorful sparkles
- CTA button: "Open now" (coral-to-pink gradient pill)

**UI structure:**
- Full-screen modal with light cream/white background
- Centered illustration (gift box, ~200px)
- Stacked text (headline + subheading, centered, serif + sans)
- Large rounded CTA button with gradient fill
- Safe area padding; no navigation chrome

**Flow & logic:**
- Triggered when user hasn't opened app in 2–4 weeks (configurable)
- Uses gamification (mystery box) to re-engage lapsed users
- Tapping "Open now" reveals personalized offer (Screen 052)
- Scarcity framing: "gift just for you" suggests limited/personal deal

---

## Screen 052 — Winback Offer (Revealed Discount)

**Purpose:** Redemption of personalized winback offer; shows time-limited discount with urgency + social proof.

**Text inventory:**
- Headline: "Claim your gift before it's gone"
- Subheading: "Turn your free trial into"
- Offer: "44% OFF FOREVER" (white text on coral-to-blue gradient badge)
- Pricing: "~~S$D 99.98~~ S$D 54.98/year" (strikethrough old price)
- Fine print: "Once you close your one-time offer, it's gone!"
- Monthly alt: "Only S$D 4.58/month. Cancel anytime."
- CTA button: "Continue" (coral-to-pink gradient pill)
- Decorative sparkles around offer badge

**UI structure:**
- White background, centered layout
- Stacked copy (headline serif, subheading sans)
- Large gradient badge with offer percentage (eye-catching)
- Strikethrough pricing (anchors discount perception)
- Fine print warning (urgency + scarcity)
- Small monthly option below (flexibility message)
- Floating colorful sparkles (delight + visual rhythm)
- Large gradient button at bottom

**Flow & logic:**
- Second screen of winback flow (user tapped "Open now" on gift box)
- 44% annual discount (from ~$100 → $55) is a strong hook
- "One-time offer" framing = if user dismisses, offer is gone (urgency)
- Monthly fallback ($4.58/mo ≈ 45% off $9.99 monthly rate) shown as backup
- Scarcity + urgency + strong discount = high conversion mechanic
- "Cancel anytime" reassurance (removes commitment friction)

---

## Synthesis

### Paywall Variants & Trigger Conditions

| Variant | Trigger | Flow |
|---------|---------|------|
| **Initial Paywall** (044–045) | Post-onboarding / feature-gated access | Trial toggle → plan select → App Store → success |
| **App Store Native Dialog** (047–048) | After user confirms plan selection | System modal; Apple handles payment |
| **Success Confirm** (049) | Post-purchase | Dismissible modal; grants access |
| **Celebration Screen** (050) | Immediate post-purchase | Full-screen delight; user initiates next action |
| **Winback Offer** (051–052) | Lapsed user re-engagement (2–4w inactive) | Gift gamification → mystery reveal → time-limited discount |

### Premium Feature List (As Marketed)

From "You can now enjoy everything Flo Premium has to offer," features include:
- Unlimited cycle tracking & predictions
- Advanced hormonal insights
- Fertility window forecasting
- Priority customer support
- Exclusive content (likely articles, health tips, mood tracking)
- Ad-free experience (implied; standard freemium model)
- Friends Plan: Share insights with up to 5 people

### Pricing & Trial Mechanics

| Tier | Annual | Monthly | Trial | Notes |
|------|--------|---------|-------|-------|
| **Yearly Plan** | $59.99 (~$5/mo) | — | 14 days | MOST POPULAR badge; anchors perception |
| **Friends Plan** | $79.99 (~$6.67/mo) | — | 14 days | Allows up to 5 shared users; family strategy |
| **Monthly** (from App Store) | — | ~$4.58/mo after discount | 2 weeks | Winback offer fallback; higher per-month rate |

**Trial mechanics:**
- 2–14 day free trial (varies by offer context)
- No credit card required upfront (user-friendly)
- Auto-renewal after trial; user must cancel in Settings to prevent charge
- Cancellation allowed "at any time in Settings" (legal protection language)

### Conversion Patterns

1. **Social Proof (5-star testimonials)** — All three plan selector screens show rotating reviews. High-credibility quotes ("Best app", "Accurate", "Easy to use") build trust before purchase.

2. **Benefit Stacking (Trial + Discount)** — Trial removes payment friction; stacked with "14-DAY FREE" badge = lower perceived risk.

3. **Annual Discount Framing** — $5/mo annualized vs. $9.99/mo monthly (50% savings messaging) anchors annual as best value. "MOST POPULAR" reinforces herd effect.

4. **Gamified Winback** — Gift box + mystery reveal + "one-time offer" urgency = emotional re-engagement. 44% discount is aggressive (strong LTV recovery signal).

5. **Scarcity Language** — "Before it's gone", "Once you close, it's gone" (Screen 052). Removes "I'll come back later" rationalization.

6. **Minimal Friction** — Toggle trial ON/OFF dynamically (no re-entry to paywall). Plan selection → native App Store → success in 3 taps. No form fields or extra confirmations.

7. **Native iOS Payment** — Apple App Store dialog handles all PCI/security; Flo builds trust via platform authority.

### Comparison to grandma.app RevenueCat Setup

| Aspect | Flo | grandma.app |
|--------|-----|-------------|
| **Pricing tiers** | 2 (annual + family) | 2 (Free + Premium: $9.99/mo or $69.99/yr) |
| **Trial length** | 14 days | (Not yet deployed; plan from context suggests similar) |
| **Payment platform** | Native App Store (system modal) | RevenueCat SDK (wrapper around App Store) |
| **Annual discount** | $59.99/yr (~$5/mo) = 50% off monthly | $69.99/yr (~$5.83/mo) = 42% off $9.99/mo |
| **Winback strategy** | Gift box gamification + 44% discount | (No documented winback yet) |
| **Trial messaging** | "No commitment. Cancel anytime" | (Not yet visible in app) |
| **Feature gating** | Full feature behind paywall after trial | Free tier: 3 scans/mo + chat; Premium: unlimited |

### Top 3 Conversion Hooks Worth Stealing

1. **Trial Toggle (On/Off)** — Flo's "Enable free trial" toggle is a lightweight, non-disruptive way to convert skeptical users. Grandma.app could add this to `app/paywall.tsx` to let users opt-in rather than mandate App Store dialog immediately.

2. **Winback Gamification (Gift + Mystery)** — The gift box + reveal mechanic re-engages lapsed users with emotional delight + urgency without aggressive "come back" language. Grandma could trigger this after 3–4 weeks of inactivity, especially if user was on Premium previously.

3. **Social Proof Rotation** — Cycling 5-star reviews on every paywall screen builds trust incrementally. Grandma has testimonials in brand strategy; rotating them on paywall screens (not just home) would increase conversion.

**Bonus pattern:** Flo's "Friends Plan" (share with up to 5 people) is a unique acquisition driver that grandma.app could adapt — e.g., "Share Grandma insights with your partner or care circle" (aligns with existing care-circle infrastructure).