# Flo for Partners — Benchmark Analysis (Screenshots 204-224, 280)

## Overview
Flo for Partners is a dedicated partner experience enabling couples to share cycle insights, education, and engagement content. Partners get a read-only, curated view of the user's cycle data; the primary user controls what is shared and can revoke access anytime.

---

## Screen Breakdown (First 10)

### Screen #204 — Flo for Partners onboarding cover
- **Purpose:** Hero screen introducing the partner feature with value proposition
- **Text inventory:** 
  - Headline: "Flo for Partners"
  - Tagline: "Supercharge your sex lives"
  - Intro: "Share your cycle insights with your partner!"
  - Three key benefits:
    - "He'll know when your sex drive might be high"
    - "You'll feel supported through your cycle lows"
    - "We'll explain your cycle in a way he understands"
  - Section heading: "What your partner sees"
- **UI structure:** Hero with lavender background, large gradient "Flo for Partners" title, benefit checklist (checkmark icons), preview card of partner view, pink "Link your partner" CTA button, tab bar with Partner tab highlighted
- **Flow & logic:** Entry point for onboarding; introduces shared data philosophy and partner experience; sets expectations

### Screen #205 — Partner view preview (detailed)
- **Purpose:** Show the partner interface with data displayed
- **Text inventory:**
  - "Discover top insights about her • Today"
  - Insight cards: "Your partner's cycle day" (with value "1"), "Their possible symptoms" (with emoji/mood icons), "Chance of getting pregnant" (with value "Low")
  - Card title: "Period"
  - Card value: "Day 1"
  - Button: "Explore cycle day"
  - Disclaimer: "NOTE: Predictions are not a substitute for birth control"
  - Section: "Recommended" with description "Based on your partner's current cycle"
  - Illustration cards below (mood/intimacy related)
- **UI structure:** Nested preview of partner's home screen; colorful card chips at top (blue, yellow, pink), pink card showing period day with CTA, recommended content section below, tab bar at bottom
- **Flow & logic:** Shows exactly what partner will see after pairing—emphasis on cycle day + symptom predictions + intimacy/mood context; intentional disclaimer about birth control

### Screen #206 — Social proof section
- **Purpose:** Build trust and motivation via usage statistics
- **Text inventory:**
  - Headline (large pink): "Nearly 9.5 million users say Flo helps improve their sex life*"
  - Footnote: "*Extrapolated estimate based on 27% of 2,500 Flo users surveyed (2022). Assumed to reflect users within the same demographics for the past year."
  - Section heading: "Get him clued up on you"
  - Preview card showing "Period Day 1" + "Explore cycle day" button, and adjacent cards for "Think you know the female anatomy? QUIZ" and education content
- **UI structure:** Large pink headline, small gray methodological note, carousel of educational/engagement content cards (quiz, poll, educational illustrations)
- **Flow & logic:** Social proof + introduction to engagement mechanics (quizzes, polls); nudges toward education

### Screen #207 — Educational engagement carousel
- **Purpose:** Highlight interactive content partners can access
- **Text inventory:**
  - Section heading: "Discover top insights about her"
  - Engagement card titles: "Think you know the female anatomy? QUIZ", "What do you think about sex? POLL"
  - Additional card hinted at edge: education content
  - Section heading: "Fun ways to share knowledge"
  - Description: "Insights, quizzes and polls – to learn a little more each day."
  - Section: "Your questions answered"
- **UI structure:** Horizontal carousel of engagement tiles (dark background with bright text, quiz icon, poll icon); descriptive text below; FAQ section begins at bottom
- **Flow & logic:** Emphasizes gamification and daily education; positions quizzes/polls as bonding mechanism

### Screen #208 — FAQ section (collapsed)
- **Purpose:** Deliver common questions around setup, data sharing, privacy
- **Text inventory:**
  - "Your questions answered"
  - Expandable FAQs:
    1. "What is Flo for Partners?"
    2. "How do I set up Flo for Partners?"
    3. "What data will be shared with my partner?"
    4. "Can my partner edit my data, or see my symptoms and personal notes?"
    5. "Can I stop sharing at any time?"
    6. "Can all couples use Flo for Partners?"
    7. "Can I use Flo for Partners with Anonymous Mode?"
- **UI structure:** Stack of collapsed accordion items, each with chevron to expand; light gray background
- **Flow & logic:** Proactively addresses privacy/control concerns; reassures user of data security and revocation

### Screen #209 — FAQ first item expanded
- **Purpose:** Define Flo for Partners
- **Text inventory:**
  - Question: "What is Flo for Partners?"
  - Answer: "Flo for Partners is a new feature available to all users of our mobile app. You can share your Flo experience with your partner, whether you're pregnant, trying to conceive or tracking your periods."
  - Below: remaining collapsed FAQs
- **UI structure:** Single expanded accordion; full text answer visible; collapsed items below
- **Flow & logic:** Clear, concise definition covering all three journey modes (pregnancy, TTC, period tracking)

### Screen #210 — FAQ: "Here's how to invite your partner"
- **Purpose:** Show step-by-step invite/pairing flow
- **Text inventory:**
  - Section heading: "Here's how to invite your partner:"
  - Step 1: "INVITE — You need to invite your partner to Flo and generate a pairing code."
  - Step 2: "PAIR — Your partner will download the Flo app and then use the code to pair your profiles."
  - Step 3: "SHARE — Once the invite and pairing is done, you'll be sharing Flo with your partner."
- **UI structure:** Three-step icon + text layout (envelope icon, phone with Flo icon, two phones sharing); illustrative icons for each step
- **Flow & logic:** Summarizes the end-to-end invite→pair→share flow in plain language; builds mental model before user starts

### Screen #211 — Pairing code generation screen (loading)
- **Purpose:** Generate and present pairing code
- **Text inventory:**
  - Headline: "Flo for Partners"
  - Subheading: "Share your pairing code"
  - Copy text: "Your partner will receive a link to download the Flo app. He'll then use the code to pair your profiles."
  - Loading spinner with note: "Stay on this page till your code is generated."
  - Button: "Send pairing code" (disabled/soft pink during loading)
  - Privacy note: "Your personal data is important. Only share it with a trusted, responsible partner."
- **UI structure:** Center-aligned content, loading spinner, disabled CTA, privacy disclaimer at bottom
- **Flow & logic:** Manages expectation during async code generation; emphasizes trust/privacy conscious messaging

### Screen #212 — Pairing code generated
- **Purpose:** Display generated code and share options
- **Text inventory:**
  - Headline: "Flo for Partners"
  - Subheading: "Share your pairing code"
  - Code: "VZMMFW" (large monospace text in light gray box)
  - Button: "Send pairing code" (now pink/enabled)
  - Privacy note: "Your personal data is important. Only share it with a trusted, responsible partner."
  - Below: "Cancel invite" link
  - Implicit share target: "Join me on Flo for Partners to supercharge our sex life and connect..."
- **UI structure:** Code in large display box, active pink button, secondary cancel link, privacy messaging
- **Flow & logic:** Code is copyable/shareable via system sheet; CTA drives partner onboarding; cancellation path visible

### Screen #213 — Share sheet with partner contact options
- **Purpose:** System-native share UI for distributing pairing code
- **Text inventory:**
  - Share header: "Join me on Flo for Partners to supercharge our sex life and connect..."
  - Share targets: AirDrop, Messages, Mail, Notes, Reminders (truncated)
  - Actions: Copy, New Quick Note, Save to Files, Edit Actions...
- **UI structure:** iOS share sheet with icon grid of native apps, secondary actions below
- **Flow & logic:** Leverages OS-native share paradigm; message pre-written; partner receives app download link + code context

---

## Checkpoint 1 Complete ✓

**Screens covered:** 204–213 (first 10)
**Key findings so far:**
- Invite flow: generate code → share via system sheet → partner downloads → pairs via code
- Data shown partner: cycle day, symptom predictions, pregnancy chance, curated insights + educational content
- Control/privacy messaging prominent throughout (expandable FAQs, trust disclaimers)
- Engagement strategy: quizzes, polls, daily facts to educate partners
- No indication yet of partner's post-pairing experience, permission model, or premium gating

**Next:** Screens 214–224 + 280 (remaining 12 screens)

---

## Screen Breakdown (Screens 214–224, 280)

### Screen #214 — Waiting for partner to pair
- **Purpose:** Hold state while partner enters pairing code
- **Text inventory:**
  - Heading: "Waiting for him to pair"
  - Status steps (green = done, gray = waiting):
    1. "You've invited your partner" (checked, green)
    2. "He'll use this code to pair your profiles" (unchecked, gray)
    3. "Then you can both use Flo for Partners" (unchecked, gray)
  - Code displayed: "VZMMFW"
  - Fallback action: "Lost the code? You can send it again anytime." → "Resend the code"
  - Secondary action: "Cancel invite"
- **UI structure:** Illustrative header animation (envelope/pairing metaphor), step-by-step checklist with colored lock icons, code display box, secondary actions
- **Flow & logic:** Polls for partner acceptance; allows resend/cancel; transparent about waiting state

### Screen #215 — Primary user control message (post-pairing)
- **Purpose:** Reassure user of control after pairing begins
- **Text inventory:**
  - Headline: "You're always in control"
  - Description: "Your partner can only access the below data and can't log or edit anything. Also you can stop sharing anytime, right here."
  - Button: "Stop sharing" (soft purple/gray pill)
  - Section heading: "What your partner can see"
  - Description: "He can view your cycle data and get tailored content and notifications."
  - Partner preview card: "Period Day 1" with "Explore cycle day"
- **UI structure:** Hero message + control button, preview of partner interface below
- **Flow & logic:** Frontloads user empowerment; CTA to revoke access is prominent

### Screen #216 — Partner data access detail (continued)
- **Purpose:** Itemize what partner sees
- **Text inventory:**
  - Section heading: "What your partner can see"
  - Subheading: "Your daily cycles"
  - Description: "A view-only version of your current cycle day and cycle phase predictions."
  - Preview card: "Period Day 1" + "Explore cycle day" button
  - Insight carousel teaser: "Discover top insights about her • Today" (quiz, poll, true/false cards visible at bottom)
- **UI structure:** Nested partner preview, section descriptions, engagement card carousel preview
- **Flow & logic:** Granular transparency of shared data; shows educational/engagement surfaces

### Screen #217 — Partner data: Engagement content
- **Purpose:** Detail educational assets partner can access
- **Text inventory:**
  - Section heading: "Discover top insights about her • Today"
  - Engagement cards: "Think you know the female anatomy? QUIZ", "What do you think about sex? POLL", "True or false: Pregnancy hormones" (hinted)
  - Section heading: "Fun ways to share knowledge"
  - Description: "Insights, quizzes and polls – to learn a little more about menstrual health each day."
  - Below: Video carousel previews
- **UI structure:** Engagement card carousel (dark background, bright large text), video tile carousel ("Skills for a happy relationship", "Birth control explained", "Menstrual cycle in 60 seconds")
- **Flow & logic:** Emphasizes gamified learning; video content education arm

### Screen #218 — Partner data: Video and expert content
- **Purpose:** Show curated video + article content
- **Text inventory:**
  - Video carousel (continued from previous): "Skills for a happy relationship" (Video), "Birth control explained" (Video), "Menstrual cycle in 60 seconds" (Video)
  - Section heading: "Expert-led content"
  - Description: "Articles and videos on key topics – with info that's always verified by experts."
  - Notification example: "Your partner's period is due soon — Explore ways to offer support during the PMS phase 👉"
  - Section heading: "Notifications at key moments"
  - Description: "He'll be notified when your cycle phase changes."
- **UI structure:** Video tile carousel, expert content description, notification bell icon in circle, example notification card
- **Flow & logic:** Rounds out data+education+notification model; shows partner's engagement pathways

### Screen #219 — Support contact (post-pairing)
- **Purpose:** Provide help pathway
- **Text inventory:**
  - Section heading: "Notifications at key moments"
  - Description: "He'll be notified when your cycle phase changes."
  - FAQ text: "Still got a question? Our customer support team are ready to help."
  - Button: "Contact customer support"
- **UI structure:** Text-heavy info section, teal button
- **Flow & logic:** Terminal help contact; reassurance + support availability

### Screen #220 — Stop sharing modal (part 1)
- **Purpose:** Confirm revocation with impact explanation
- **Text inventory:**
  - Modal heading: "What will happen when I stop sharing?"
  - Subheading: "If you paid:"
  - Impact: "Your partner won't see your data." (red X icon)
  - Subscription note: "Your Flo subscription will automatically renew - unless you decide to cancel it."
  - Subheading: "If your partner paid:"
  - Impact 1: "Your partner won't see your data." (red X icon)
  - Impact 2: "You'll lose access to Flo for Partners and all premium features." (red X icon)
  - Subscription note: "Your partner's Flo subscription will automatically renew - unless he decides to cancel it."
  - Footer: "Got a question? Maybe we can help" → "Contact customer support"
  - Buttons: "Continue" (soft gray) | "I want to keep sharing my data"
- **UI structure:** Modal with red X impact icons, conditional messaging based on payer, soft CTA to continue or back out
- **Flow & logic:** Transparent about subscription impacts; differentiates user vs. partner payer; allows retreat

### Screen #221 — Stop sharing modal (part 2)
- **Purpose:** Repeat revocation impacts with support link
- **Text inventory:** Same as 220, with "Contact customer support" link visible (not button)
- **UI structure:** Identical to 220 but footer has link instead of button
- **Flow & logic:** Possibly mobile layout variant or accessibility state

### Screen #222 — Stop sharing confirmation question
- **Purpose:** Final step before revocation
- **Text inventory:**
  - Modal heading: "What next for your partner?"
  - Description: "He'll no longer get:"
  - Impact 1: "Access to your data." (red X icon)
  - Impact 2: "Flo for Partners content." (red X icon)
  - Reassurance: "You can reactivate Flo for Partners anytime - just start the sharing process again."
  - Buttons: "Yes, stop sharing" (pink/strong) | "I want to keep sharing my data"
- **UI structure:** Clear final confirmation with strong/soft button pair
- **Flow & logic:** Clear, unambiguous final gate before data revocation

### Screen #223 — Cancellation processing
- **Purpose:** Wait state during revocation
- **Text inventory:**
  - Modal heading: "Cancelling his access to your data"
  - Loading spinner
- **UI structure:** Minimal, centered loading state
- **Flow & logic:** Async operation feedback

### Screen #224 — Revocation success
- **Purpose:** Confirm data access removed
- **Text inventory:**
  - Modal heading: "You've stopped sharing"
  - Description: "He can no longer see your data. You can share it again anytime."
  - Button: "Got it" (pink/strong)
- **UI structure:** Success state, centered with friendly message
- **Flow & logic:** Clear closure; reactivation pathway mentioned

### Screen #280 — Partner feature at-a-glance (repeat of 204)
- **Purpose:** Bookend feature overview
- **Text inventory:** Identical to screen 204
- **UI structure:** Identical to screen 204
- **Flow & logic:** Feature hero positioned in flow; possibly reachable from settings/help

---

## Synthesis

### Full Partner-Sharing Flow Map
1. **Entry:** User opens Partner tab or invites partner from home
2. **Education:** Hero screen teaches value prop (better sex, support, education)
3. **Setup:** Generate pairing code → share via system sheet with pre-written message
4. **Pairing:** Partner downloads app → enters code → profiles link
5. **Confirmation:** User sees "waiting for pairing" state; can resend code or cancel
6. **Post-pairing:** Partner gets dedicated Partner tab with user's cycle day, predictions, quizzes/polls, videos, expert articles
7. **Control:** User can revoke anytime via "Stop sharing" (modal confirms impact on subscription + access)
8. **Reactivation:** User can re-invite partner and repeat flow

### Data Sharing Model
**Partner can see (read-only, no edit):**
- Current cycle day (phase + day number)
- Symptom predictions (mood, physical symptoms)
- Pregnancy chance prediction
- Cycle phase changes (notifications)
- Curated educational content: quizzes, polls, videos, expert articles
- Notification when cycle phase changes or period due

**Partner cannot see:**
- Personal notes or symptoms logged by user
- Health history or allergies
- Private data outside cycle context
- Any data if sharing revoked

**Gating:**
- Partners on free tier: can view cycle + content
- Partners on paid tier: lose access to Flo for Partners + premium features if user revokes
- Users on paid tier: maintain subscription if revocation happens

### Partner Engagement & Education Strategy
- **Quizzes:** Anatomy-focused, frame as bonding game ("Think you know the female anatomy?")
- **Polls:** "What do you think about sex?" — gauges partner opinions
- **Videos:** 60-sec explainers (birth control, menstrual cycle, relationship skills)
- **Articles:** Expert-verified content on menstrual health + intimacy
- **Notifications:** Proactive "her period due soon" prompts suggest support actions (PMS care tips)
- **Tone:** Playful, non-clinical, couple-centric ("supercharge your sex lives")

### Permission & Privacy Control Surface
- **User always in control:** "You're always in control" hero message post-pairing
- **One-tap revocation:** "Stop sharing" button on main post-pairing screen
- **Impact transparency:** Modal explicitly shows subscription impacts for both payer scenarios
- **Reactivation:** Easy re-entry pathway ("you can share again anytime")
- **Data boundaries:** FAQs emphasize partner can't edit or see symptoms/notes
- **Trust framing:** "Only share with a trusted, responsible partner" disclaimer repeated

### Top Patterns for grandma.app Care-Circle

| Pattern | Flo Approach | Grandma Adaptation |
|---------|--------------|-------------------|
| **Invite flow** | System sheet → pairing code → full access | Could use same: generate invite token, share SMS/email link, pair via code |
| **Data gating** | Role-based (payer vs non-payer affects what's lost) | Role-based: caregiver vs parent → different data visibility (feeds, growth, health vs. all) |
| **Control surface** | One "Stop sharing" button in main UI | Permissions model: toggle data types per caregiver (can see growth? feeds? health?) |
| **Revocation flow** | Modal explains cascading impacts | Could differentiate: caregiver downgrade vs. full remove; what data is purged vs. archived |
| **Education** | Quizzes/polls to engage partners | For caregivers: onboarding tips on how to use shared data (meal planning, sleep cues, etc.) |
| **Transparency** | FAQs upfront on privacy + "what partner sees" | Add care-circle FAQ to Settings → care-circle with same depth (permissions, revocation, data types) |
| **Notifications** | Proactive nudges ("her period due soon") | Proactive nudges for caregivers: "growth leap upcoming", "sleep regression", activity suggestions |
| **Reactivation** | Easy re-invite path | Allow re-pairing without re-invite; toggle permissions on/off |

### Key Differences from grandma.app's Care-Circle Design

1. **Flo is binary:** Partner has access or doesn't. Grandma could be **granular:** each caregiver role gets explicit data checklist (can see feeds? growth? health data? notifications?).
2. **Flo embeds education:** Quizzes/polls for partner. Grandma could add: **onboarding per caregiver type** (nanny gets meal + sleep tips; grandparent gets developmental milestone guides).
3. **Flo's revocation is harsh:** Losing Flo for Partners + premium. Grandma could **soften:** caregiver downgrade (still see child name + photo, but not health details).
4. **Flo uses code pairing:** Lightweight, works for romantic pairs. Grandma should keep this for **immediacy**, but could add **email verification** (grandparents may not have iOS).
5. **Flo's UX is couple-centric tone:** "Supercharge your sex lives." Grandma's tone is **multi-role:** nanny vs. grandparent vs. doctor have different motivations and content.

---

## Summary (150 words)

**Invite/pairing:** Flo generates a shareable code, sends via system sheet with pre-written message. Partner downloads app, enters code, profiles link instantly. User sees "waiting" state; can resend or cancel.

**What partners see vs. don't:** Partners see cycle day + phase, symptom predictions, pregnancy chance, notifications on phase change, + curated quizzes/polls/videos/expert articles. They cannot see personal notes, health history, or edit anything.

**Engagement/education:** Quizzes ("Know female anatomy?"), polls ("Thoughts on sex?"), 60-sec videos (birth control, cycles), expert articles. Notifications like "period due soon" with support suggestions.

**Biggest difference from grandma.app care-circle:** Flo is binary (on/off). Grandma should offer **granular permission toggles** (each caregiver role sees specific data sets). Flo's harsh revocation (loses premium) suggests Grandma **soften** downgrades instead of full remove. Flo's tone is couple-centric; Grandma's must handle **nanny, grandparent, doctor—different personas, different onboarding**.


