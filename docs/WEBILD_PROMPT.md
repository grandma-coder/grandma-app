# Webild Prompt — grandma.app Marketing Website

> Paste the entire **"PROMPT TO WEBILD"** block below into Webild. Everything above it is reference for you.

---

## Quick context (don't paste — for your own review)

- **Goal:** Landing page + Pricing page + Privacy/Terms sub-pages.
- **Primary CTA:** Join early-access waitlist (email capture).
- **Secondary CTA:** "Get notified when we launch on iOS / Android" (same form, optional platform checkbox).
- **Voice:** Warm + editorial — like a wise grandma writing you a letter, not like a SaaS landing page.
- **Visual:** Cream paper canvas, editorial serif headings (Fraunces), sticker accents, hairline borders, no neon glow. Light theme is the default; offer a dark toggle if Webild supports it.

---

## PROMPT TO WEBILD

Build a warm, editorial marketing website for **Grandma** — an AI-powered parenting companion mobile app that guides users through three life stages: **Pre-Pregnancy, Pregnancy, and Kids (0–5y).** The brand voice is "Guru Grandma" — a wise, calm, slightly mischievous grandmother who happens to be powered by Claude AI. The site is currently a **waitlist landing** because the app is in early access. The whole site should feel like a beautifully laid-out magazine spread or a sticker-collaged journal — not a typical tech startup site.

### 1. Brand identity

- **Product name:** Grandma (also written as `grandma.app`)
- **Tagline options to choose from (pick whichever fits best, or remix):**
  - "Wisdom for every stage of becoming a parent."
  - "A calmer way to parent. From trying, to pregnant, to raising little ones."
  - "Like having Grandma in your pocket — except she knows what 2026 pediatricians say."
- **Mission line for hero subhead:** "From pre-pregnancy to preschool, Grandma is the calm, knowing companion who remembers everything, judges nothing, and answers at 3am."
- **Personality:** Warm, knowing, editorial, gently witty, never preachy or clinical. Think *Apartamento × The Cut × a grandmother's handwritten recipe card*.

### 2. Design system (use these tokens exactly)

This is **non-negotiable**. The mobile app uses a "cream-paper / sticker-collage" design language and the website must match. Treat raw hex as the only acceptable way to specify colors — do not invent shades.

#### Colors

**Canvas (light mode, default):**
- Page background: `#F3ECD9` (cream paper)
- Deeper section background: `#EFE5CC`
- Card background: `#FFFEF8` (paper white)
- Nested/raised card: `#F7F0DF`
- Hairline border: `rgba(20,19,19,0.08)` — barely visible, like pencil
- Stronger border (focused/emphasized): `rgba(20,19,19,0.14)`
- Primary text (ink): `#141313`
- Secondary text: `#3A3533`
- Muted text: `#6E6763`
- Faint text (placeholder/decorative): `#A69E93`

**Brand:**
- Primary action / accent: `#7048B8` (purple)
- Primary light: `#9B70D4`
- Secondary: `#3B7DD8` (blue)

**Three journey-mode colors** (each gets its own section/card tint):
- **Pre-Pregnancy** → rose `#E58BB4` (soft bg `#F7CFDD`)
- **Pregnancy** → lavender `#B7A6E8` (soft bg `#E0D5F3`)
- **Kids** → powder blue `#8BB8E8` (soft bg `#D4E3F3`)

**Sticker accent palette** (use sparingly as little decorative stickers/badges; each has a "soft" version for tinted backgrounds):
- Yellow `#F5D652` / soft `#FBEA9E`
- Blue `#9DC3E8` / soft `#CFE0F0`
- Pink `#F2B2C7` / soft `#F9D8E2`
- Green `#BDD48C` / soft `#DDE7BB`
- Lilac `#C8B6E8` / soft `#E3D8F2`
- Peach `#F5B896` / soft `#F9D6C0`
- Coral `#EE7B6D` (use very sparingly — for highlights only)

**Dark mode (optional toggle in nav):**
- Background: `#1A1713` (warm dark ink)
- Card: `#232019`
- Text: `#F5EDDC`
- Stickers slightly brightened. Keep the same sticker palette.

#### Typography

- **Display / headings:** Fraunces, weight 600 (or 700 for hero). Editorial serif. Letter-spacing `-0.8` on large display, `-0.4` on titles.
- **Italic accent (for poetic emphasis inside headings):** Instrument Serif Italic, weight 400.
- **Body / UI:** DM Sans 400 / 500 / 600 / 700. Tight, geometric, calm.
- **All-caps labels & eyebrows:** DM Sans 500, uppercase, 10–11px, letter-spacing `1.2`. Color: muted (`#A69E93` on cream).

**Font scale:**
- Hero display: 64–88px Fraunces 700 on desktop, 40–48px on mobile
- Section title: 36–48px Fraunces 600
- Card title: 22–28px Fraunces 600
- Body: 16–17px DM Sans, line-height 1.6
- Small label: 10–11px DM Sans uppercase tracked

**Typography rules:**
- Mix Fraunces upright + Instrument Serif italic in the same headline for editorial flavor. Example: "Wisdom for every *stage* of becoming a parent." — where *stage* is italic.
- Body text never goes below 14px.
- Never use pure black `#000` or pure white `#FFF` — always `#141313` ink and `#FFFEF8` paper.

#### Shape & radius

- Cards: **28px** border-radius (large pillowy)
- Buttons: **999px** (full pill)
- Inputs / form fields: **20px**
- Modals / big sheets: **36px**
- Sticker "sockets" (icon containers): half the width (e.g., 40×40 → radius 20)

#### Shadows

- **Card shadow** (soft, paper-on-paper):
  `box-shadow: 0 8px 24px rgba(20,19,19,0.08);`
- **Sticker-on-paper button shadow** (hard offset, no blur — the signature "stamp" effect):
  `box-shadow: 0 3px 0 #141313;` (or use the button's border color)
  On hover/press: `box-shadow: 0 1px 0 #141313; transform: translateY(2px);`
- **Forbidden:** Any neon glow shadow, colored blur, or generic Material-style elevation. Shadows are either soft + faint, or hard-offset + opaque. Nothing in between.

#### Decorative stickers / illustrations

Scatter small SVG-style stickers across the page — like a journal collage. Suggested motifs:
- Heart, star, sparkle, sun, moon, crescent, drop, leaf, flower bud, baby bottle, pacifier, footprint, sonogram swirl, hand-drawn cloud, ribbon, dotted spiral.
- Each sticker should be filled with one of the sticker palette colors, with a 2px charcoal `#2A2624` outline, and rotated `-18°` to `+16°` for that hand-placed feel.
- Add tiny hard drop shadow: `0 2px 0 rgba(20,19,19,0.06), 0 6px 10px rgba(20,19,19,0.08)`.
- Use stickers as **decoration only** — they should feel like embellishments tucked into corners, in margins, peeking out from behind cards. Never as the primary focal point of a section.

### 3. Site structure

**Pages:**
1. `/` — Landing (long scroll, sections detailed below)
2. `/pricing` — Pricing page (Free + Premium tiers)
3. `/privacy` — Privacy policy (placeholder content)
4. `/terms` — Terms of service (placeholder content)

**Global nav (sticky top, cream background with subtle hairline border at bottom on scroll):**
- Left: Grandma wordmark in Fraunces 600 (24px), with a tiny lilac heart sticker `#C8B6E8` floating beside it
- Center (desktop only): `Features` · `The Three Stages` · `Meet Grandma` · `Pricing`
- Right: A pill button "Join the waitlist" — purple `#7048B8` fill, paper-white text `#FFFEF8`, pill radius 999px, hard-offset shadow.
- Mobile: collapse center links into a hamburger that opens a cream paper sheet (radius 28).

**Global footer:**
- Cream `#EFE5CC` background
- 4 columns on desktop, stacked on mobile:
  1. Brand: wordmark + "Made with care for new and growing families." + 4 social icons (Instagram, TikTok, X, LinkedIn) as small paper-pill buttons
  2. Product: Features, Pricing, Waitlist, Roadmap
  3. Stages: Pre-Pregnancy, Pregnancy, Kids 0–5y
  4. Company: About, Privacy, Terms, Contact
- Bottom strip: small text "© 2026 grandma.app. Not a substitute for medical advice." with a lilac heart sticker beside the copyright.

### 4. Landing page sections (in order, top to bottom)

#### Section 1 — Hero
- **Eyebrow** (uppercase tracked, muted): "EARLY ACCESS · INVITES ROLLING OUT WEEKLY"
- **Display headline** (Fraunces, mixed upright + italic, 64–88px desktop):
  > "Wisdom for every *stage*  of becoming a parent."
- **Subhead** (DM Sans 18px, max-width 540px, muted text `#3A3533`):
  > "From trying-to-conceive, through every week of pregnancy, into the wild years of raising little ones — Grandma is the calm, knowing companion who remembers everything, judges nothing, and answers at 3am."
- **Inline waitlist form** (paper-white card, radius 28, soft shadow):
  - Email input (20px radius, cream `#F7F0DF` fill, hairline border, `#141313` ink text, placeholder "you@your-life.com")
  - Primary CTA button to the right: "Join the waitlist" (purple `#7048B8`, pill, hard-offset shadow)
  - Tiny muted text below: "We'll send one email when your invite is ready. No spam, on Grandma's honor."
- **Right side / behind hero (desktop):** A loose collage of 5–7 stickers (heart, star, sonogram swirl, baby footprint, lavender flower, blue moon, peach sun) scattered with rotation. Add one larger illustrated "phone mockup" placeholder card showing the app's home screen with a lavender lavender week ring and a "Guru Grandma is typing…" chat bubble.
- **Social proof strip below hero** (very subtle, single line):
  > "Built by parents. Powered by Claude. Trusted by **3,200+** families on the waitlist."

#### Section 2 — The Three Stages (the core differentiator)

This is the most important section. Three horizontally-arranged cards on desktop (stacked vertically on mobile), each tinted in its mode color soft. Each card has a 28px radius, paper-white inner content area, soft shadow, and one large illustrated sticker hero.

- **Section eyebrow:** "THE THREE STAGES"
- **Section title (Fraunces 48px):** "One companion. Three versions of you."
- **Section subhead:** "Grandma's entire app reshapes itself to where you are in your journey. Same wisdom, different chapter."

**Card 1 — Pre-Pregnancy** (soft rose `#F7CFDD` outer card)
- Sticker: a tiny rose heart with a DNA swirl
- Title: "Trying"
- Italic accent under title: *for one*
- Body: "Cycle tracking with hormone curves, fertile windows that actually make sense, and 6 fertility pillars to help you arrive at pregnancy prepared and informed."
- Feature mini-list (3 items with small dot bullets):
  - Cycle ring + phase predictions
  - Hormone & fertility insights
  - Preconception checklist
- Tiny "Pre-Pregnancy" pill label at the top in rose `#E58BB4`

**Card 2 — Pregnancy** (soft lavender `#E0D5F3` outer card)
- Sticker: a lavender moon with a baby silhouette
- Title: "Expecting"
- Italic accent: *for two*
- Body: "Week-by-week journey ring, baby size in fruit (and feelings), affirmations that don't make you cringe, and a birth plan that actually fits in your bag."
- Feature mini-list:
  - 40-week journey ring
  - Today summary + affirmations
  - Birth guide & appointments
- Tiny "Pregnancy" pill label in lavender `#B7A6E8`

**Card 3 — Kids** (soft powder blue `#D4E3F3` outer card)
- Sticker: a powder-blue cloud with a tiny footprint
- Title: "Raising"
- Italic accent: *little ones*
- Body: "Sleep, mood, calories, growth leaps, vaccines — all tracked with one tap and a sticker, never a spreadsheet. From newborn to 5 years old."
- Feature mini-list:
  - Sleep + mood circles
  - Vaccine schedule tree
  - Nanny notes & care circle
- Tiny "Kids 0–5y" pill label in powder blue `#8BB8E8`

Below the three cards, a single line in italic Instrument Serif: *"You switch stages with one tap. Grandma remembers where you've been."*

#### Section 3 — Meet Guru Grandma (the AI)

A two-column layout (text left, "chat preview" right on desktop; stacked on mobile).

- **Eyebrow:** "POWERED BY CLAUDE"
- **Title (Fraunces 40px):** "Meet *Guru Grandma*."
- **Body paragraphs (DM Sans 17px, max-width 520px):**
  > "Grandma is built on top of Claude, Anthropic's AI assistant — but she's been retrained on the questions parents actually ask at 2am. She knows the difference between *colostrum* and *transitional milk*, between *Braxton-Hicks* and *the real thing*, between a tantrum and a sensory meltdown."
  >
  > "She'll never tell you what to do. She'll tell you what your options are, what the science says, what your grandmother would have done, and let you decide."
- **3 small reassurance pills below:**
  - "🔒 Private by default" (use a lock sticker, no emoji — replace with SVG)
  - "📋 Cites her sources" (with a paper-page sticker)
  - "🌍 Speaks 12 languages" (with a globe sticker)
  - *Replace all emoji above with actual sticker SVGs in the matching palette colors.*

**Right column — chat preview card** (paper-white, radius 28, soft shadow):
- Header: tiny round avatar (lavender Grandma silhouette) + "Guru Grandma" + status dot in green `#BDD48C`
- 3 chat bubbles, alternating:
  - **You** (ink `#141313` bubble, pill-ish radius, right-aligned): "Is it normal for a 14-month-old to wake up 4 times a night again?"
  - **Grandma** (lavender soft `#E0D5F3` bubble, left-aligned, with a lavender heart sticker peeking from the corner): "Oh love, yes — this is almost certainly the 14-month sleep regression talking. It's tied to a developmental leap. Usually 2–6 weeks. Want the 3 things that actually help, or the 3 things every blog tells you that don't?"
  - **You** (right-aligned): "Both, please."
- A typing indicator at the bottom (three small lilac dots animating)
- The whole chat card sits slightly rotated `-2°` like it was placed by hand.

#### Section 4 — Pillars / Features grid

A grid of **9 feature tiles** (3 columns on desktop, 2 on tablet, 1 on mobile). Each tile is a paper-white card, radius 28, soft shadow, with a top-left sticker socket (40×40 paper-pill in a sticker-soft tint) holding an icon.

- **Eyebrow:** "WHAT'S INSIDE"
- **Title (Fraunces 40px):** "Twenty-four pillars of parenting. *Quietly* organized."
- **Subhead:** "Every pillar is built on real medical guidance, real lived experience, and real bedtime fatigue. Pick a stage and Grandma will only show you what matters now."

**The 9 tiles (use these exact titles + 1-line descriptions):**

1. **Cycle & Fertility** (rose sticker / heart icon) — "Hormone curves, fertile windows, ovulation insights."
2. **Pregnancy Journey** (lavender sticker / week-ring icon) — "Week-by-week, baby size in fruit, affirmations, birth plan."
3. **Sleep** (blue sticker / moon icon) — "Naps, night wakes, regressions. Tracked with one tap."
4. **Feeding & Food** (green sticker / leaf icon) — "Breast, bottle, solids. Calories, allergens, photo logging."
5. **Vaccines** (pink sticker / cross icon) — "A schedule tree that doesn't feel like a calendar from 1998."
6. **Growth & Leaps** (peach sticker / sparkle icon) — "Wonder weeks, milestones, percentile gentle nudges."
7. **Mood & Wellbeing** (yellow sticker / sun icon) — "Yours and theirs. Bubble charts that actually mean something."
8. **Care Circle** (lilac sticker / two-hearts icon) — "Nannies, grandparents, partners. Permissions you control."
9. **Medical Vault** (blue sticker / paper icon) — "Ultrasounds, exams, vaccine records. One tap, one tag."

Each tile: 24px padding, 16px gap between sticker + title, body text 14px muted `#6E6763`, optional small "Pre · Preg · Kids" mini-pills at the bottom showing which stages the pillar appears in.

#### Section 5 — Trust strip

A single horizontal strip with a cream `#EFE5CC` background, 80–120px tall, no card. Three small clusters separated by hairline vertical dividers (desktop) or stacked (mobile):

- **Cluster 1 (sticker: lock):** "Your data lives in Supabase. End-to-end encrypted. Yours to export anytime."
- **Cluster 2 (sticker: shield):** "HIPAA-aware. GDPR-friendly. Built by parents, not surveillance capitalists."
- **Cluster 3 (sticker: heart):** "Not a substitute for your doctor. A second opinion who's always awake."

#### Section 6 — Three small testimonials (placeholder for now)

A row of three small testimonial cards, paper-white, radius 28, slight rotation `(-1°, +2°, -2°)` for that scrapbook feel. Each card has:
- A tiny circular avatar (use placeholder portraits or initials in a sticker-color circle)
- A sticker accent in the top-right corner (yellow star, green sparkle, pink heart)
- 2–3 sentence quote in Fraunces italic 18px
- Name + role line in DM Sans 13px uppercase tracked

Use these as **placeholder quotes** (mark them clearly as "Beta testers · names changed"):

1. *"I used to have eight apps for this. Now I have Grandma. My phone is calmer. So am I."* — **Maya, expecting baby #2**
2. *"The 3am question machine. She doesn't make me feel stupid for asking the same thing twice."* — **Léa, first-time mom, Paris**
3. *"As a dad who joined the care circle, I finally know what's going on without nagging."* — **Sam, partner, Lisbon**

#### Section 7 — Waitlist (the closer)

A large centered card, radius 36, lavender soft `#E0D5F3` background, paper-white inner block, 5–7 scattered stickers around it.

- **Eyebrow:** "JOIN THE WAITLIST"
- **Title (Fraunces 52px, mixed upright + italic):** "We'll send your invite the *moment* it's your turn."
- **Body:** "We're rolling out invites slowly — Grandma takes her time to make sure each family feels seen. Drop your email and we'll let you know when you're up."
- **Form fields (stacked, large):**
  - Name (optional, 20px radius input)
  - Email (required, 20px radius input)
  - Stage you're in (segmented pill control — three options: "Trying", "Expecting", "Raising"). Active state uses the matching mode color.
  - Optional checkbox: "Also notify me about the iOS and Android launch."
- **CTA button (full width or 320px wide):** "Save my seat" — purple `#7048B8`, pill, hard-offset shadow, white ink.
- **Below button** (italic Instrument Serif, muted): *"Pinky promise: no marketing emails. Only your invite, and a single hello."*

#### Section 8 — FAQ (small, 4–6 items)

A simple stacked accordion list, no boxes — just hairline dividers between items. Each row:
- Question in Fraunces 22px (no chevron, just a small `+` that rotates to `×` on open)
- Answer in DM Sans 16px, line-height 1.7, muted ink `#3A3533`, max-width 680px

**Questions to include:**
1. "When does the app launch?"
2. "Is it really powered by AI? Can I trust it?"
3. "Is my health data private?"
4. "What does it cost?"
5. "Does my partner / nanny / mother get access too?"
6. "What if I'm not pregnant yet — or no longer have a baby — is it still for me?"

Write friendly, on-brand answers for each. Mix in occasional italic Instrument Serif lines for warmth.

#### Section 9 — Final footer hero strip

A full-bleed strip just above the footer. Cream `#EFE5CC` background, centered content:
- Tiny eyebrow: "READY WHEN YOU ARE"
- Big italic Fraunces line (40px+): *"Take your time. We'll be here."*
- A single small lilac heart sticker beneath it.

Then the global footer described in Section 3.

---

### 5. Pricing page (`/pricing`)

Same nav + footer as landing. Two pricing cards side-by-side on desktop, stacked on mobile. Both cards radius 28, paper-white, soft shadow.

**Page header:**
- Eyebrow: "SIMPLE PRICING"
- Title (Fraunces 56px): "Choose the *care* that fits."
- Subhead: "Start free. Upgrade only when Grandma earns it. Cancel any time, no hard feelings."

**Card 1 — Free**
- Top sticker: blue paper plane
- Plan name: "Free"
- Price: "$0" (Fraunces 72px) + muted "/ forever"
- Tagline italic: *"For dipping a toe in."*
- Feature checklist (small green check stickers):
  - Unlimited Guru Grandma chat (limited context)
  - Browse all 24 pillars
  - 3 photo scans per month
  - Cycle, pregnancy, or kids tracking — full features
  - 1 child profile
- CTA button: "Start free" — paper variant (cream fill, ink border, ink text)

**Card 2 — Premium** (highlighted with a soft lavender `#E0D5F3` tint, a "MOST CHOSEN" sticker badge in coral `#EE7B6D` rotated -8° in the top-right)
- Top sticker: lavender heart with a small crown
- Plan name: "Premium"
- Price: "$9.99" (Fraunces 72px) + muted "/ month" — with a smaller line below: "or $69.99 / year — saves you 41%"
- Tagline italic: *"For the long haul."*
- Feature checklist:
  - Everything in Free
  - Unlimited photo scans (food, ultrasound, rashes, labels)
  - Personalized insights generated weekly
  - Vaccine, milestone, and appointment reminders
  - Care circle (up to 5 caregivers)
  - Up to 5 child profiles
  - Priority support from a real human
- CTA button: "Start 7-day free trial" — purple `#7048B8` fill, pill, hard-offset shadow

**Below the two cards:**
- A small comparison reassurance line: "Both plans include light + dark mode, 12 languages, and offline mode."
- A short FAQ block (3 items): "Can I switch plans?", "What about refunds?", "Do you offer family or gift plans?"

---

### 6. Privacy (`/privacy`) and Terms (`/terms`)

Standard long-form pages. Use these specs:

- Max content width: 720px, centered
- Body: DM Sans 16px, line-height 1.7, ink `#141313`
- Section headings: Fraunces 28px, with the section number as a small lilac sticker badge in the left margin
- Italic Instrument Serif for the page intro paragraph
- Last-updated date at the top in MonoCaps style: "LAST UPDATED · MAY 15, 2026"
- Use placeholder boilerplate but make sure it mentions: Supabase storage, Anthropic / Claude API, RevenueCat for payments, health data handling, GDPR / California rights, child data (no profiling of minors), data export & deletion routes.

---

### 7. Microinteractions & motion (this is a hero feature — make it sing)

The whole site should feel **alive but never frantic** — like a paper journal where the stickers gently breathe, headlines flow into view, and every interaction has weight. Think *Apple product page × Studio Lumio × Linear's editorial pages*, executed with a paper-craft aesthetic. Use GSAP + ScrollTrigger (or Framer Motion / Lenis if Webild supports), and Lenis-style smooth scroll throughout.

**Global easing curves (use these by name everywhere):**
- `paperEase`: `cubic-bezier(0.32, 0.72, 0, 1)` — the signature "settle onto paper" curve. Use for 80% of all entrances.
- `springSoft`: `cubic-bezier(0.34, 1.56, 0.64, 1)` — gentle overshoot. Use for stickers and chip pops.
- `inkPress`: `cubic-bezier(0.4, 0, 0.2, 1)` — sharp + grounded. Use for button presses.
- `slowLetter`: `cubic-bezier(0.16, 1, 0.3, 1)` — for kinetic typography reveals.

**Global timing scale:** `120ms` (micro) · `220ms` (default) · `380ms` (entrance) · `640ms` (hero) · `1200ms` (cinematic).

#### 7.1 Smooth scroll + scroll-driven everything

- Implement **Lenis smooth scroll** (or Webild's equivalent) site-wide with a lerp of `0.08–0.10`. Disable on touch devices that prefer native momentum.
- All section animations are **scroll-driven** (not time-driven on load). Each section scrubs through its reveal as it enters the viewport so users can scroll back and forth and watch motion play in reverse.
- Add a thin progress indicator: a 2px lavender `#C8B6E8` line at the very top of the page that fills left → right based on scroll position.

#### 7.2 Hero — kinetic typography on first paint

- The display headline `"Wisdom for every stage of becoming a parent."` enters **word by word, not letter by letter** (letters feel try-hard; words feel editorial):
  - Each word starts at `opacity 0, translateY(28px), filter: blur(8px)`
  - Cascades in with `60ms` stagger, `720ms` duration, `slowLetter` easing
  - The italic word *stage* arrives last with a slight `+3°` rotation that settles to `0°` (springSoft)
- The subhead fades up `12px` over `480ms`, starting `300ms` after the headline begins.
- The waitlist form card slides up `40px` and scales from `0.96 → 1` over `640ms paperEase`, starting `500ms` in.
- The decorative stickers behind the hero **drop in like they were tossed onto the page**:
  - Each sticker starts at `translateY(-120px) translateX(±40px) rotate(±35°) scale(0.6) opacity 0`
  - Settles to its rest position over `900ms springSoft`, with **randomized 100–600ms delays** per sticker so they don't arrive in sync
  - Final rest position has a subtle continuous `±1.5°` rotation oscillation on a 4–7s loop (each sticker out of phase)
- The "phone mockup" placeholder card has a soft **3D tilt-on-mouse-move** (max `±8°` on X/Y axis, eased with `120ms paperEase`). When the cursor leaves, it returns to neutral over `400ms`.

#### 7.3 Scroll-triggered sticker physics

Across the entire site, stickers have a **parallax depth model**. Assign each sticker one of 4 layers:
- Layer 1 (foreground): scrolls at `1.15×` page speed
- Layer 2: `1.00×` (normal)
- Layer 3: `0.85×`
- Layer 4 (background): `0.65×`

Add a **subtle rotation drift** tied to scroll velocity — fast scrolling tilts every sticker by up to `±6°` from its rest, then they settle back to rest over `600ms paperEase` when scrolling slows. This makes the page feel like a physical journal being flipped through.

On `prefers-reduced-motion`, disable parallax and rotation drift but keep fade-ins.

#### 7.4 Section 2 — The Three Stages (sticky, horizontal pinned scroll)

This section is the centerpiece. Make it a **pinned horizontal scroll experience** on desktop:

- When the section enters the viewport, it **pins** to the screen.
- As the user continues scrolling vertically, the three stage cards slide horizontally across the viewport — Pre-Pregnancy → Pregnancy → Kids — with each card spending roughly one viewport-height of scroll in focus.
- The currently-focused card scales to `1.0`, while the other two scale to `0.88` and shift `±60px` away. Use `paperEase 480ms`.
- The card's mode-color soft tint **bleeds outward into the section background** — when Pre-Pregnancy is centered, the section bg becomes `#F7CFDD` at 30% opacity; when Pregnancy is centered, `#E0D5F3`; for Kids, `#D4E3F3`. Crossfade over `800ms`.
- The italic accent line ("for one", "for two", "little ones") **types itself in** when the card focuses — `Instrument Serif`, 40ms per character, `slowLetter` easing.
- The feature mini-list checks in one by one with a `120ms` stagger, each item starting at `opacity 0, translateX(-8px)`.
- The mode pill label at the top of each card has a soft **continuous breathing pulse**: `scale 1 ↔ 1.03` on a 3s loop while focused.
- On mobile (< 768px), fall back to vertical scroll-snap with the same fade/scale per card.
- After all three cards have played, the section unpins and the italic line *"You switch stages with one tap. Grandma remembers where you've been."* fades up `12px` over `560ms`.

#### 7.5 Section 3 — Meet Guru Grandma (the chat magic)

- The chat preview card enters with a soft `-2°` tilt and `translateY(40px)` settle (`paperEase 640ms`).
- Chat bubbles **stream in sequentially** when the section enters the viewport:
  1. First bubble (You): slides up from the bottom edge of the chat card, `opacity 0 → 1, translateY(20px) → 0` over `380ms paperEase`. Then waits 600ms.
  2. **Typing dots appear in a lavender soft bubble** and animate for `1200ms` — three dots, each pulsing `scale 1 → 1.3 → 1`, staggered `160ms`.
  3. The typing bubble morphs into the Grandma reply: dots fade out (`180ms`), reply text fades in **word-by-word** with `40ms` stagger (`slowLetter`, `360ms` per word).
  4. The lavender heart sticker on the Grandma bubble bounces in last with `springSoft` overshoot.
  5. Then the second "You" bubble appears the same way.
- If the user scrolls past and back, the sequence **replays**. (Use IntersectionObserver with re-trigger on entry.)
- Idle state: the typing dots at the bottom of the card continue to animate on a 2.8s loop as long as the section is in view — gives the page a subtle pulse.

#### 7.6 Section 4 — Pillars grid (magnetic + crossfade)

- Tiles fade up and stagger in with a **2D grid stagger** (not row-by-row): use distance from the cursor entry point as the stagger anchor, `40ms` per tile, `420ms paperEase`, max delay `400ms`. So tiles appear to ripple outward from wherever the user's eye landed first.
- **Magnetic hover on each tile (desktop):** when the cursor enters within `60px` of the tile, the tile gently translates toward the cursor by up to `8px` on both axes (eased `120ms paperEase`). On exit, returns to rest. The sticker socket inside the tile lags behind by `60ms` for a charming "the icon is following along" feel.
- On hover, the sticker icon inside the socket **spins `+8°`** then settles to `0°` on a `springSoft 360ms` curve.
- The mini "Pre · Preg · Kids" pills at the bottom of each tile pop in one at a time with `springSoft`, `100ms` stagger.

#### 7.7 Section 5 — Trust strip (numbers count up)

If any cluster shows a number, **count it up from 0 → final** over `1400ms` with `paperEase` when the strip enters view. (Even if there are no live numbers right now, set this up so it's ready for "3,200 families on the waitlist" → "5,000+" updates.)

#### 7.8 Section 6 — Testimonials (scrapbook hover)

- Each testimonial card sits at a slight rest rotation (`-1°`, `+2°`, `-2°`).
- On hover, the card **straightens to `0°`** and lifts `translateY(-6px)` with shadow expansion, over `280ms paperEase`. The sticker accent in the corner rotates `+12°` over the same duration.
- The italic quote text gets a subtle **highlight sweep**: a thin lavender underline animates from left to right under the quote over `600ms` (`slowLetter`), then fades.

#### 7.9 Section 7 — Waitlist closer (the wow moment)

- As the user enters this section, the surrounding scattered stickers **converge inward** toward the card by `60–120px` each, with `1200ms paperEase` — like they're being drawn to the form.
- The italic *moment* word in the headline has a **continuous slow shimmer**: a soft lavender → cream gradient sweeps left to right across the word every 5s.
- Form input focus: the field's border smoothly thickens from `1px` to `1.5px` and shifts color from hairline `rgba(20,19,19,0.08)` to purple `#7048B8` over `220ms inkPress`. A tiny lavender heart sticker pops in to the right of the label (`springSoft 260ms`).
- The segmented "Trying / Expecting / Raising" control uses a **floating active pill** that morphs across the three positions when toggled — the pill itself slides with `paperEase 320ms` and the active text color crossfades over the same duration. (No instant snap.)
- On submit success, the CTA button **transforms into a sticker stamp**: the pill scales briefly to `1.08`, the text crossfades to a small green check sticker, and 5–8 tiny celebration stickers (yellow stars, lilac hearts, peach sparkles) burst outward from the button center on randomized arcs, falling with gravity over `1800ms`. Sound off by default.

#### 7.10 Buttons — the "stamp" interaction model

Every pill button shares the same press model:
- **Idle:** `translateY(0)`, hard-offset shadow `0 3px 0 #141313`
- **Hover (desktop):** `translateY(-1px)`, shadow grows to `0 4px 0 #141313`. Cursor-magnetic: button shifts up to `4px` toward cursor when within `40px` radius (`inkPress 140ms`).
- **Pressed:** `translateY(2px)`, shadow collapses to `0 1px 0 #141313`. `100ms inkPress`. Add a **haptic-like flash**: the button background brightens by 8% for 80ms then returns.
- **Loading:** the label crossfades to three pulsing dots over `200ms`, dots cycle on a 1.2s loop.
- **Success state:** label crossfades to a checkmark sticker that bounces in with `springSoft`.

#### 7.11 Cards — paper lift

- **Idle:** rest shadow `0 8px 24px rgba(20,19,19,0.08)`
- **Hover:** `translateY(-4px)`, shadow grows to `0 14px 32px rgba(20,19,19,0.12)`, transition `paperEase 280ms`.
- Cards never tilt on hover (unlike testimonials which intentionally do). Cards lift cleanly, like the page is being held up by a finger underneath.

#### 7.12 Nav bar — scroll-aware morphing

- At the top of the page: nav bg is **transparent**, only the wordmark + CTA are visible.
- After 80px of scroll, the nav **transforms** into a floating paper pill: cream `#F3ECD9` background with `0 8px 24px rgba(20,19,19,0.08)` shadow, max-width contracts to `1100px`, sides round to `radius 999`, sits `16px` from top with horizontal margin. Animate over `380ms paperEase`.
- The wordmark beside the logo slightly resizes (24 → 20px) during the morph for that "compacted into a sticker pill" feel.

#### 7.13 Cursor (subtle, opt-in)

- Default cursor stays. Do **not** replace it.
- However: add a `12px` lavender `#C8B6E8` **soft glow halo** that follows the cursor with `220ms paperEase` lag — only visible over interactive elements (buttons, links, form inputs). On non-interactive areas, the halo is invisible. This gives "the page is reactive" without being a custom-cursor gimmick.
- Disable on touch devices.

#### 7.14 Page transitions

- Between routes, do a **paper-lift transition**:
  1. Current page fades to `opacity 0.4` and scales to `0.98` over `220ms paperEase`
  2. A thin lavender `#C8B6E8` horizontal line sweeps across the screen from left → right over `360ms slowLetter`
  3. New page fades up from `opacity 0, translateY(16px)` over `420ms paperEase`
- Keep total transition under `700ms`.
- Avoid full-screen overlays or color flashes.

#### 7.15 Loading states

- If anything loads (form submit, route fetch), use a **single calm spinner**: a lavender circle that morphs through a heart → moon → cloud → star shape on a 1.6s loop. Custom SVG morph (use Lottie or SVG path morphing). This is the brand's signature loader.

#### 7.16 Reduced motion

- Honor `prefers-reduced-motion: reduce` everywhere.
- When reduced: disable parallax, sticker drift, kinetic typography (just fade-in instead), pinned horizontal scroll (use vertical stack), magnetic hover, cursor halo, success bursts, page-transition sweeps.
- Keep simple opacity fades only, at `200ms` duration.

#### 7.17 Performance budget

- Target **60fps** on all motion. If a desktop machine can't hold it, drop the cursor halo and parallax first.
- All animations transform/opacity only — never animate `width`, `height`, `top`, `left`, `box-shadow` blur radius, or filters that force repaint (except the initial blur in kinetic type, which is short).
- Use `will-change` sparingly and remove it after the animation completes.
- Lazy-load below-fold sticker SVGs.

---

### 8. Hard rules (do not violate)

- ❌ **No neon colors, no gradients across the page background, no glassmorphism, no glow shadows.** This is a paper aesthetic.
- ❌ **No stock photography of pregnant bellies, babies, or hands holding tests.** Use only the sticker/illustration system. If a photo is required, use a soft, editorial, color-graded photograph with a paper-textured overlay — never glossy stock.
- ❌ **No "Get started for free now!!!" energy.** All copy should feel like a wise grandmother wrote it.
- ❌ **No emojis in copy.** Replace every emoji with a designed sticker SVG in the palette colors.
- ❌ **No pure black `#000` or pure white `#FFF`.** Always `#141313` ink and `#FFFEF8` paper.
- ❌ **No medical claims, no "your AI doctor", no "diagnose your symptoms".** Grandma supports — she does not prescribe.
- ✅ **Yes:** Editorial whitespace. Italic accents. Hand-placed stickers. Hairline borders. Pill buttons with hard-offset shadows. The feeling of a slow, well-made magazine.

---

### 9. SEO + metadata

- **Site title:** "Grandma · A calmer companion for pre-pregnancy, pregnancy, and kids"
- **Meta description:** "Grandma is a parenting companion app powered by AI — guiding you through trying-to-conceive, pregnancy, and raising kids 0–5y. Currently in early access. Join the waitlist."
- **OG image:** A cream paper canvas with the Grandma wordmark in Fraunces 600, a row of 3 stickers (rose heart, lavender moon, powder-blue cloud), and italic line *"Wisdom for every stage."*
- **Favicon:** A small lilac heart sticker on cream.

---

### 10. Accessibility

- Min body text 16px.
- Contrast ratio AAA where possible. Ink on cream passes easily; double-check sticker colors with light text.
- All sticker decorations must be `aria-hidden="true"`.
- Every form input has a visible label (not placeholder-only).
- Focus rings: 2px solid `#7048B8` purple with 2px offset on every focusable element.
- Skip-to-content link at top.
- Respects `prefers-reduced-motion` — disable parallax, sticker wobble, and stream-in animations when set.

---

**Final note to Webild:** When in doubt, lean into editorial calm and away from SaaS energy. The site should feel like opening a beautifully designed parenting journal — not signing up for a productivity tool. Every section should feel like it was *placed*, not generated. Less is more, but the *less* should be exquisite.

