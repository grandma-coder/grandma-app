# Grandma.app — Marketing Website Build Spec

> **How to use this:** Paste this entire file into Lovable, v0, Bolt, Cursor, Replit Agent, or any AI website builder. Tell the tool: *"Build this website exactly. Do not deviate. If something is unclear, ask. Do not invent design choices."*

---

## ⛔ HARD RULES — READ BEFORE WRITING ANY CODE

These rules are absolute. **If you break any of these, the build is wrong.**

1. **No generic SaaS landing page layouts.** This is NOT a typical startup site. No 3-column "feature grid with gradient icons", no hero with a phone mockup floating at -10deg with a purple gradient blob behind it. The aesthetic is **cream paper with hand-placed stickers**, like a beautifully designed parenting journal.
2. **No gradients on backgrounds.** Page background is one flat color: `#F3ECD9` (cream paper). Do not add radial gradients, mesh gradients, or any animated background gradient.
3. **No glassmorphism, no blur backgrounds, no neumorphism, no neon glow shadows.** All shadows are either soft + faint OR hard-offset + opaque. Nothing else.
4. **No stock photography.** No pregnant bellies, no babies, no hands holding tests, no "diverse group of parents smiling at a laptop." If you cannot illustrate a section with SVG stickers + typography alone, leave it as text.
5. **Only use the exact colors listed in §1.** Do not invent new shades. Do not "interpret" the palette. Do not add accent colors that aren't in the token list.
6. **Only use the fonts listed in §1.** Fraunces (serif display), DM Sans (sans body), Instrument Serif Italic (accent). No other fonts. Do not substitute system-ui or Inter.
7. **No emoji in copy.** Replace every emoji with an inline SVG sticker in the palette colors.
8. **No "Get started for free!!!" energy.** All copy uses the editorial voice in §3. No exclamation marks. No corporate verbs like "leverage" or "unlock."
9. **Pure black `#000000` and pure white `#FFFFFF` are BANNED.** Always use `#141313` (ink) and `#FFFEF8` (paper).
10. **Border radius values are limited to these six numbers: `12px`, `20px`, `28px`, `36px`, `48px`, `999px`.** Cards = 28. Buttons = 999. Inputs = 20. Modals = 36. Sticker sockets = half their width. Nothing else.
11. **All buttons are filled pills with hard-offset shadows.** No outline-only buttons. No flat buttons. No buttons with soft drop shadows.
12. **Implement the section structure in §4 in the exact order given.** Do not omit, reorder, or merge sections. Do not invent new sections.
13. **Use semantic HTML.** `<header>`, `<nav>`, `<main>`, `<section>` with aria-labels, `<footer>`. Each section has a meaningful ID.
14. **If you don't have an SVG for a sticker, generate one inline.** Don't fall back to an emoji, an icon library, or a placeholder rectangle.
15. **Do not add features I didn't ask for.** No newsletter popup. No live chat widget. No cookie banner (handle that separately). No "scroll to top" arrow. No back-to-top button.

If you'd break any of these rules to fix a layout problem, stop and ask first.

---

## 1. DESIGN TOKENS (drop this CSS block in `:root` verbatim)

```css
:root {
  /* ── Canvas ─────────────────────────────────────── */
  --bg: #F3ECD9;
  --bg-warm: #EFE5CC;
  --surface: #FFFEF8;
  --surface-raised: #F7F0DF;

  /* ── Borders (hairline ink on cream) ────────────── */
  --border: rgba(20, 19, 19, 0.08);
  --border-light: rgba(20, 19, 19, 0.05);
  --border-strong: rgba(20, 19, 19, 0.14);

  /* ── Text (ink on cream — NEVER pure black) ─────── */
  --ink: #141313;
  --ink-secondary: #3A3533;
  --ink-muted: #6E6763;
  --ink-faint: #A69E93;

  /* ── Brand ──────────────────────────────────────── */
  --primary: #7048B8;            /* purple — primary CTA */
  --primary-light: #9B70D4;
  --primary-dark: #4A2880;
  --secondary: #3B7DD8;

  /* ── Journey modes (3 stages of the app) ────────── */
  --rose: #E58BB4;               /* Pre-Pregnancy */
  --rose-soft: #F7CFDD;
  --lavender: #B7A6E8;           /* Pregnancy */
  --lavender-soft: #E0D5F3;
  --blue-powder: #8BB8E8;        /* Kids */
  --blue-powder-soft: #D4E3F3;

  /* ── Sticker palette (accent decorations) ───────── */
  --sticker-yellow: #F5D652;     --sticker-yellow-soft: #FBEA9E;
  --sticker-blue:   #9DC3E8;     --sticker-blue-soft:   #CFE0F0;
  --sticker-pink:   #F2B2C7;     --sticker-pink-soft:   #F9D8E2;
  --sticker-green:  #BDD48C;     --sticker-green-soft:  #DDE7BB;
  --sticker-lilac:  #C8B6E8;     --sticker-lilac-soft:  #E3D8F2;
  --sticker-peach:  #F5B896;     --sticker-peach-soft:  #F9D6C0;
  --sticker-coral:  #EE7B6D;
  --sticker-charcoal: #2A2624;

  /* ── Radius (these are the ONLY allowed values) ──── */
  --r-sm: 12px;
  --r-md: 20px;     /* inputs */
  --r-lg: 28px;     /* cards (default) */
  --r-xl: 36px;     /* modals, large sheets */
  --r-xxl: 48px;
  --r-full: 999px;  /* buttons, pills */

  /* ── Spacing (8pt scale) ────────────────────────── */
  --s-1: 4px;
  --s-2: 8px;
  --s-3: 16px;
  --s-4: 24px;
  --s-5: 32px;
  --s-6: 48px;
  --s-7: 64px;
  --s-8: 96px;
  --s-9: 128px;

  /* ── Shadows (only these four exist) ────────────── */
  --shadow-card: 0 8px 24px rgba(20, 19, 19, 0.08);
  --shadow-card-hover: 0 14px 32px rgba(20, 19, 19, 0.12);
  --shadow-stamp: 0 3px 0 var(--ink);          /* button rest */
  --shadow-stamp-press: 0 1px 0 var(--ink);    /* button pressed */

  /* ── Fonts ──────────────────────────────────────── */
  --font-display: 'Fraunces', Georgia, serif;
  --font-italic: 'Instrument Serif', Georgia, serif;
  --font-body: 'DM Sans', system-ui, sans-serif;

  /* ── Easing (use these curves by name) ──────────── */
  --ease-paper: cubic-bezier(0.32, 0.72, 0, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-ink: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-letter: cubic-bezier(0.16, 1, 0.3, 1);
}

* { box-sizing: border-box; }

html { scroll-behavior: smooth; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 17px;
  line-height: 1.6;
  font-weight: 400;
  -webkit-font-smoothing: antialiased;
}

::selection { background: var(--lavender-soft); color: var(--ink); }
```

**Font imports (Google Fonts — add to `<head>`):**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=DM+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@1&display=swap" rel="stylesheet">
```

---

## 2. TYPOGRAPHY (locked scale — do not deviate)

| Element | Font | Size desktop / mobile | Weight | Letter-spacing | Line-height |
|---|---|---|---|---|---|
| Hero display | Fraunces | 88px / 44px | 600 | -0.02em | 1.02 |
| Section title (H2) | Fraunces | 56px / 36px | 600 | -0.015em | 1.05 |
| Card title (H3) | Fraunces | 28px / 24px | 600 | -0.01em | 1.15 |
| Italic accent inline | Instrument Serif italic | match parent | 400 | -0.01em | inherit |
| Eyebrow / all-caps label | DM Sans | 11px / 11px | 600 | 0.12em uppercase | 1 |
| Body large | DM Sans | 19px / 17px | 400 | normal | 1.6 |
| Body | DM Sans | 17px / 16px | 400 | normal | 1.6 |
| Body small | DM Sans | 14px / 14px | 400 | normal | 1.5 |
| Button label | DM Sans | 16px | 600 | -0.005em | 1 |
| Pill/chip label | DM Sans | 12px | 600 | 0.05em uppercase | 1 |

**Mandatory typographic patterns:**
- Hero headline and section titles MUST mix Fraunces upright + Instrument Serif italic. Example: `Wisdom for every <em>stage</em> of becoming a parent.` (`<em>` is styled as Instrument Serif italic).
- Eyebrows always appear ABOVE titles, in muted ink (`--ink-faint`), uppercase, tracked.
- Italic standalone sentences (in section dividers, captions, microcopy) use Instrument Serif Italic, never Fraunces italic.

---

## 3. VOICE & COPY RULES

The brand is **Grandma** — an AI-powered companion that guides users through **Pre-Pregnancy → Pregnancy → Kids 0–5y**. Powered by Claude AI under the hood, branded as "Guru Grandma."

**Voice = warm, knowing, slightly dry. Editorial, not corporate. The wise grandmother voice.**

- Short sentences. Long sentences. Mix.
- No exclamation marks. None.
- No "Welcome to Grandma!" No "Get started today!"
- Use italic accents in headlines for the editorial flavor (e.g., *every stage*, *the moment*).
- Specific over generic. Not "Track your sleep" — instead "Naps, night wakes, regressions. Tracked with one tap."
- Use the word "love" once. Use "darling" zero times.
- Never say "AI-powered" in marketing copy. Say "Built on Claude" once in the AI section. The rest of the time it's just "Grandma."
- All copy below is final. Use it verbatim unless explicitly told to change it.

---

## 4. PAGE STRUCTURE — BUILD IN THIS EXACT ORDER

Implement these pages:
- `/` (landing — 9 sections detailed below)
- `/pricing`
- `/privacy`
- `/terms`

### 4.0 Global nav (sticky, top of every page)

**Initial state (at top of page):**
- Full-width, transparent background, padding `24px 48px`.
- Left: wordmark "Grandma" in Fraunces 600 28px, with an inline lavender heart sticker (16×16) immediately after the "a".
- Center (desktop ≥ 1024px): horizontal nav links — `Features` · `The Three Stages` · `Meet Grandma` · `Pricing`. DM Sans 15px 500, ink color, no underlines, 32px gap.
- Right: primary pill button "Join the waitlist" (see button spec in §5).
- Mobile (< 1024px): replace center links with a 44×44 paper-pill hamburger button on the right of the wordmark. CTA pill stays.

**Scrolled state (after 80px scroll):**
- Nav contracts to a floating pill: `max-width: 1100px`, `margin: 16px auto`, `padding: 12px 24px`, `background: var(--bg)`, `border-radius: 999px`, `box-shadow: 0 8px 24px rgba(20,19,19,0.08)`, hairline border.
- Wordmark shrinks from 28px → 22px.
- Animate the transition over 380ms with `var(--ease-paper)`.

### 4.1 SECTION — Hero

**Container:** Full viewport-height minus nav. Max-width inner: `1280px`. Padding: `120px 48px 80px` desktop, `80px 24px 64px` mobile.

**Layout:** Two columns 1.2fr / 1fr on desktop. Stacked on mobile (text first, visual second).

**Left column (text):**
1. Eyebrow: `EARLY ACCESS · INVITES ROLLING OUT WEEKLY`
2. Headline (H1, hero display size): `Wisdom for every <em>stage</em> of becoming a parent.`
3. Subhead (body large, max-width 540px, color `--ink-secondary`): `From trying-to-conceive, through every week of pregnancy, into the wild years of raising little ones — Grandma is the calm, knowing companion who remembers everything, judges nothing, and answers at 3am.`
4. Inline waitlist form (see component spec in §5.4):
   - Single row on desktop: email input + "Join the waitlist" pill button
   - Stacked on mobile
5. Below form, muted body small: `We'll send one email when your invite is ready. No spam, on Grandma's honor.`

**Right column (visual):**
Build a **sticker collage** — DO NOT use a phone mockup, do not use a hero image. Instead:
- A paper-white card (radius 28, shadow-card) representing an abstract "app screen" — show only:
  - A lavender circular ring (200×200, stroke 14px, lavender `--lavender`) with the text "WEEK 24" in Fraunces 36px centered inside, and below the ring "lemon size" in italic
  - Below the ring, a chat bubble in lavender-soft `--lavender-soft` with the text "you're doing beautifully today"
- Around this card, place 6–8 SVG stickers absolutely positioned, each rotated `-18°` to `+16°` randomly:
  - rose heart (top-left), yellow sun (top-right), blue moon (middle-right), green leaf (bottom-left), peach sparkle (bottom-right), pink baby-footprint (left of card), lilac flower (right of card)
- Each sticker is 40–72px sized, has a 2px charcoal `#2A2624` outline, and a small offset shadow `0 2px 0 rgba(20,19,19,0.06), 0 6px 10px rgba(20,19,19,0.08)`.

**Below the entire hero, full-width strip (cream `--bg-warm`, 64px tall, centered text):**
`Built by parents. Powered by Claude. Trusted by 3,200+ families on the waitlist.`
(Render "3,200+" in Fraunces 600 to emphasize it.)

### 4.2 SECTION — The Three Stages

**This is the most important section. Do not phone it in.**

**Container:** Padding `128px 48px` desktop / `80px 24px` mobile. Max-width inner: `1280px`.

**Header block:**
- Eyebrow: `THE THREE STAGES`
- H2: `One companion. Three versions of <em>you</em>.`
- Subhead (max-width 640px, centered, `--ink-secondary`): `Grandma's entire app reshapes itself to where you are in your journey. Same wisdom, different chapter.`

**Three cards, side by side on desktop (CSS grid `grid-template-columns: 1fr 1fr 1fr`, gap 24px), stacked on mobile.**

Each card structure:
- Outer card: padding 32px, radius 28px, shadow-card, hairline border
- Card 1 background: `--rose-soft` · Card 2: `--lavender-soft` · Card 3: `--blue-powder-soft`
- Inside the card at the top: a 48×48 sticker (rose heart / lavender moon / blue cloud)
- Below sticker: small uppercase pill (12px, tracked, ink) sitting in a sticker-soft chip — text `PRE-PREGNANCY` / `PREGNANCY` / `KIDS 0–5y` colored with the mode color
- Then H3 in Fraunces:
  - Card 1: `Trying <em>for one</em>.`
  - Card 2: `Expecting <em>for two</em>.`
  - Card 3: `Raising <em>little ones</em>.`
- Body paragraph (16px, `--ink-secondary`, max-width within card):
  - Card 1: `Cycle tracking with hormone curves, fertile windows that actually make sense, and 6 fertility pillars to help you arrive at pregnancy prepared and informed.`
  - Card 2: `Week-by-week journey ring, baby size in fruit (and feelings), affirmations that don't make you cringe, and a birth plan that actually fits in your bag.`
  - Card 3: `Sleep, mood, calories, growth leaps, vaccines — all tracked with one tap and a sticker, never a spreadsheet. From newborn to 5 years old.`
- Hairline divider (margin 24px 0)
- Mini bullet list (no list-style dots — instead use small filled circles in the mode color, 6px):
  - Card 1: "Cycle ring + phase predictions" / "Hormone & fertility insights" / "Preconception checklist"
  - Card 2: "40-week journey ring" / "Today summary + affirmations" / "Birth guide & appointments"
  - Card 3: "Sleep + mood circles" / "Vaccine schedule tree" / "Nanny notes & care circle"

**Below the three cards, centered, max-width 720px, Instrument Serif Italic 24px, color `--ink-secondary`, padding-top 64px:**
`You switch stages with one tap. Grandma remembers where you've been.`

### 4.3 SECTION — Meet Guru Grandma

**Container:** Padding `128px 48px` desktop / `80px 24px` mobile. Background: `--bg-warm` (slight color shift to break the page). Max-width: `1280px`.

**Two columns 1fr / 1fr desktop, stacked mobile.**

**Left column:**
1. Eyebrow: `POWERED BY CLAUDE`
2. H2: `Meet <em>Guru Grandma</em>.`
3. Body paragraphs (max-width 520px):
   - `Grandma is built on top of Claude, Anthropic's AI assistant — but she's been retrained on the questions parents actually ask at 2am. She knows the difference between colostrum and transitional milk, between Braxton-Hicks and the real thing, between a tantrum and a sensory meltdown.`
   - `She'll never tell you what to do. She'll tell you what your options are, what the science says, what your grandmother would have done, and let you decide.`
4. Below paragraphs, three small reassurance pills (paper-white pills with hairline border, 12px 18px padding, radius 999, 12px gap between, each with a small SVG icon left of text):
   - Lock sticker (lilac) + `Private by default`
   - Page sticker (yellow) + `Cites her sources`
   - Globe sticker (green) + `Speaks 12 languages`

**Right column — chat preview card:**

Build a paper-white card, radius 28, shadow-card, rotated -2deg, max-width 440px.

Structure:
- Header row (padding 16px 20px, hairline border-bottom): 32×32 lavender circle "avatar" with a tiny crown sticker, beside it "Guru Grandma" in Fraunces 16px 600, beside that a tiny green `--sticker-green` dot
- Chat body (padding 20px, gap 12px between bubbles, max-height with overflow):
  - **Bubble 1 (user, right-aligned):** dark ink bg `var(--ink)`, paper text `var(--surface)`, radius 20px 20px 4px 20px, padding 12px 16px, max-width 280px. Text: `Is it normal for a 14-month-old to wake up 4 times a night again?`
  - **Bubble 2 (Grandma, left-aligned):** lavender-soft bg `var(--lavender-soft)`, ink text, radius 20px 20px 20px 4px, padding 12px 16px, max-width 320px. Text: `Oh love, yes — this is almost certainly the 14-month sleep regression. It's tied to a developmental leap. Usually 2–6 weeks. Want the 3 things that actually help, or the 3 things every blog tells you that don't?` A tiny lavender heart sticker peeks from the bottom-right corner of this bubble (positioned absolute, rotated +12deg).
  - **Bubble 3 (user, right-aligned):** Same style as bubble 1. Text: `Both, please.`
  - **Typing indicator bubble (left-aligned):** lavender-soft bg, three small lavender circles (8×8) with a `bounce` keyframe animation, 160ms stagger between dots.
- Card footer (padding 12px 20px, hairline border-top): muted body small `Powered by Claude · Sonnet 4`

### 4.4 SECTION — The 9 Pillars

**Container:** Padding `128px 48px` desktop / `80px 24px` mobile. Max-width: `1280px`. Background: `--bg`.

**Header block:**
- Eyebrow: `WHAT'S INSIDE`
- H2: `Twenty-four pillars of parenting. <em>Quietly</em> organized.`
- Subhead (max-width 680px, `--ink-secondary`): `Every pillar is built on real medical guidance, real lived experience, and real bedtime fatigue. Pick a stage and Grandma will only show you what matters now.`

**Grid:** CSS grid, `grid-template-columns: repeat(3, 1fr)` desktop, `repeat(2, 1fr)` tablet, `1fr` mobile. Gap: 20px. Padding-top: 64px.

**Each tile:**
- Paper-white card, radius 28, shadow-card, hairline border, padding 28px, min-height 220px
- Top-left: 48×48 sticker socket (background = matching sticker-soft, radius 24) with an inline SVG icon inside
- Below socket, 20px gap: H3 (Fraunces 22px 600)
- Below title, 8px gap: body small (`--ink-muted`, 15px)
- At the bottom of the card, three mini chips showing which stages the pillar appears in (small uppercase pills with mode-color dots): `PRE` / `PREG` / `KIDS`

**The 9 tiles (build these exactly):**

| # | Sticker color | Icon | Title | Body | Stages |
|---|---|---|---|---|---|
| 1 | rose | heart | Cycle & Fertility | Hormone curves, fertile windows, ovulation insights. | PRE |
| 2 | lavender | week-ring | Pregnancy Journey | Week-by-week, baby size in fruit, affirmations, birth plan. | PREG |
| 3 | blue | moon | Sleep | Naps, night wakes, regressions. Tracked with one tap. | KIDS |
| 4 | green | leaf | Feeding & Food | Breast, bottle, solids. Calories, allergens, photo logging. | PREG · KIDS |
| 5 | pink | cross | Vaccines | A schedule tree that doesn't feel like a calendar from 1998. | KIDS |
| 6 | peach | sparkle | Growth & Leaps | Wonder weeks, milestones, gentle percentile nudges. | KIDS |
| 7 | yellow | sun | Mood & Wellbeing | Yours and theirs. Bubble charts that actually mean something. | PRE · PREG · KIDS |
| 8 | lilac | two-hearts | Care Circle | Nannies, grandparents, partners. Permissions you control. | PREG · KIDS |
| 9 | blue | paper-page | Medical Vault | Ultrasounds, exams, vaccine records. One tap, one tag. | PREG · KIDS |

### 4.5 SECTION — Trust strip

**Container:** Full-width, background `--bg-warm`, padding `64px 48px`. No card.

**Content:** Centered horizontal flex with three clusters, gap 64px between, separated by 1px ink hairline dividers (height 32px). On mobile, stack vertically with horizontal dividers between.

Each cluster: small SVG sticker (32px) on the left, two lines of text on the right (label uppercase tracked muted 11px + body 15px ink).

1. **Lock sticker (lilac):** label `PRIVACY` / body `Your data lives in Supabase. End-to-end encrypted. Yours to export anytime.`
2. **Shield sticker (green):** label `COMPLIANCE` / body `HIPAA-aware. GDPR-friendly. Built by parents, not surveillance capitalists.`
3. **Heart sticker (rose):** label `TRUST` / body `Not a substitute for your doctor. A second opinion who's always awake.`

### 4.6 SECTION — Testimonials

**Container:** Padding `128px 48px` desktop / `80px 24px` mobile. Max-width: `1280px`.

**Header:**
- Eyebrow: `BETA TESTERS · NAMES CHANGED`
- H2: `What early families <em>actually</em> say.`

**Three cards side-by-side desktop, stacked mobile. Gap 24px.**

Each card:
- Paper-white, radius 28, shadow-card, padding 32px, hairline border
- Slight rest rotation: Card 1 `-1deg`, Card 2 `+2deg`, Card 3 `-2deg`
- Top-right corner: a small sticker (yellow star, green sparkle, pink heart respectively) rotated +12deg, absolutely positioned -8px from top and right
- Italic Instrument Serif quote (20px, ink): the text below
- Below quote: 16px gap, then row with 36×36 sticker-colored circle (containing initials in Fraunces 14px 600) + name + role (DM Sans 13px uppercase tracked muted)

Quotes:
1. `I used to have eight apps for this. Now I have Grandma. My phone is calmer. So am I.` — **MAYA · expecting baby #2**
2. `The 3am question machine. She doesn't make me feel stupid for asking the same thing twice.` — **LÉA · first-time mom, Paris**
3. `As a dad who joined the care circle, I finally know what's going on without nagging.` — **SAM · partner, Lisbon**

### 4.7 SECTION — Waitlist (the closer)

**Container:** Padding `128px 48px` desktop / `80px 24px` mobile. Max-width: `880px` (narrower than other sections for focus). Background: full-bleed `--lavender-soft` at 40% opacity over `--bg`.

**Inside, one large card:**
- Paper-white, radius 36, shadow-card, padding 64px desktop / 32px mobile
- Surrounded by 6–8 SVG stickers absolutely positioned outside the card, rotated randomly, scattered

**Card content:**
1. Eyebrow centered: `JOIN THE WAITLIST`
2. H2 centered: `We'll send your invite the <em>moment</em> it's your turn.`
3. Body (centered, max-width 540px, `--ink-secondary`): `We're rolling out invites slowly — Grandma takes her time to make sure each family feels seen. Drop your email and we'll let you know when you're up.`
4. Form (stacked, max-width 480px, centered, padding-top 32px):
   - Name input (optional, placeholder "Your name") — radius 20, padding 16px 20px, hairline border, surface bg
   - Email input (required, placeholder "you@your-life.com") — same styling
   - Segmented control "I am..." with three pill buttons: `Trying` / `Expecting` / `Raising`. Inactive: paper-white, hairline border, ink text. Active: filled with matching mode color (rose/lavender/blue-powder), ink text. Single active at a time. Animate with a sliding indicator that morphs between positions over 320ms `--ease-paper`.
   - Checkbox: `Also notify me about the iOS and Android launch.` — custom checkbox, paper-white with hairline border, when checked shows a small ink checkmark
   - Submit button (full width, height 64): `Save my seat` — primary pill (purple)
5. Below button, Instrument Serif Italic centered (`--ink-muted`, 16px): `Pinky promise: no marketing emails. Only your invite, and a single hello.`

### 4.8 SECTION — FAQ

**Container:** Padding `128px 48px` desktop / `80px 24px` mobile. Max-width: `760px`.

**Header:**
- Eyebrow: `THE OBVIOUS QUESTIONS`
- H2: `Things you're <em>probably</em> wondering.`

**Accordion list — NO BOXES, just hairline `--border` dividers between items. Each row:**
- Padding 24px 0
- Question row: Fraunces 22px 600 on the left + a 32×32 paper-pill button on the right with a `+` (rotates to `×` when open, 280ms `--ease-paper`)
- Answer (hidden by default): DM Sans 16px line-height 1.7, `--ink-secondary`, max-width 680px, padding-top 16px

**Questions and answers (use verbatim):**

1. **When does the app launch?**
   `We're rolling out invites weekly through summer 2026, with the iOS App Store launch later this year. Android follows shortly after. Your spot on the waitlist holds your invite — we go in the order people signed up, and we never skip ahead.`

2. **Is it really powered by AI? Can I trust it?**
   `Grandma is built on Claude, Anthropic's AI assistant. We've designed her to never diagnose, never prescribe, and to always tell you when she's uncertain. She cites medical sources when she gives clinical answers, and she defers to your doctor or midwife on anything that matters. Think of her as the well-read friend who's awake at 3am.`

3. **Is my health data private?**
   `Yes. Your data lives in Supabase, encrypted in transit and at rest. We never sell it, never use it to train models, and never share it with third parties. You can export everything or delete your account at any time, with one tap.`

4. **What does it cost?**
   `Free forever for tracking, the chat (with limits), and browsing all pillars. Premium is $9.99/month or $69.99/year and unlocks unlimited scans, personalized insights, vaccine reminders, and the care circle. See the <a href="/pricing">pricing page</a> for the full breakdown.`

5. **Does my partner or nanny get access too?**
   `Yes — the care circle lets you invite up to 5 caregivers per child with granular permissions. Your nanny can log naps without seeing your medical records. Your partner can see everything. Your mother-in-law sees only what you let her see.`

6. **What if I'm not pregnant yet — or no longer have a baby — is it still for me?**
   `Pre-pregnancy mode is built for the trying-to-conceive journey, with cycle and fertility tracking. Pregnancy mode walks you through 40 weeks. Kids mode goes from newborn to 5 years. You can switch between modes at any time, and Grandma keeps your history. After 5y, we'll let you know what comes next.`

### 4.9 SECTION — Final hero strip

**Container:** Full-bleed `--bg-warm`, padding `96px 48px`, centered text. Sits just above the footer.

**Content:**
1. Eyebrow: `READY WHEN YOU ARE`
2. H2 (italic Instrument Serif 56px, `--ink`): `Take your time. We'll be here.`
3. Below, a single lilac heart sticker (32px), centered.

### 4.10 Footer

**Container:** Background `--bg-warm`, padding `64px 48px 32px`, hairline border-top.

**Top row:** 4-column grid desktop, single column mobile.

**Column 1 — Brand:**
- Wordmark "Grandma" Fraunces 24px 600 with inline lavender heart sticker
- Below: body small `--ink-muted`: `Made with care for new and growing families.`
- Below: row of 4 paper-pill social buttons (40×40, radius 999, hairline border, ink icon centered) — Instagram / TikTok / X / LinkedIn

**Column 2 — Product:**
- All-caps label `PRODUCT`
- Links: Features · Pricing · Waitlist · Roadmap

**Column 3 — Stages:**
- All-caps label `STAGES`
- Links: Pre-Pregnancy · Pregnancy · Kids 0–5y

**Column 4 — Company:**
- All-caps label `COMPANY`
- Links: About · Privacy · Terms · Contact

**Bottom strip (padding-top 32px, hairline border-top, flex space-between):**
- Left: body small `--ink-faint` `© 2026 grandma.app. Not a substitute for medical advice.` (with tiny lilac heart sticker before the copyright)
- Right: body small `--ink-faint` `Made with love in Lisbon · Berlin · Tokyo`

---

## 5. COMPONENT SPECS (build these exactly)

### 5.1 Primary pill button

```html
<button class="btn-primary">Join the waitlist</button>
```

```css
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 28px;
  min-height: 56px;
  background: var(--primary);
  color: var(--surface);
  font-family: var(--font-body);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.005em;
  border: 1.5px solid var(--ink);
  border-radius: var(--r-full);
  box-shadow: var(--shadow-stamp);
  cursor: pointer;
  transition: transform 120ms var(--ease-ink), box-shadow 120ms var(--ease-ink), background 200ms var(--ease-ink);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 0 var(--ink);
  background: var(--primary-light);
}

.btn-primary:active {
  transform: translateY(2px);
  box-shadow: var(--shadow-stamp-press);
}
```

### 5.2 Secondary pill button (paper variant)

Same as above but `background: var(--surface)`, `color: var(--ink)`, hover `background: var(--surface-raised)`.

### 5.3 Card (paper)

```css
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  padding: 32px;
  box-shadow: var(--shadow-card);
  transition: transform 280ms var(--ease-paper), box-shadow 280ms var(--ease-paper);
}
.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-card-hover);
}
```

### 5.4 Input field

```css
.input {
  width: 100%;
  padding: 16px 20px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  font-family: var(--font-body);
  font-size: 16px;
  color: var(--ink);
  transition: border-color 200ms var(--ease-ink), box-shadow 200ms var(--ease-ink);
}
.input::placeholder { color: var(--ink-faint); }
.input:focus {
  outline: none;
  border-color: var(--primary);
  border-width: 1.5px;
  box-shadow: 0 0 0 4px rgba(112, 72, 184, 0.12);
}
```

### 5.5 Eyebrow label

```css
.eyebrow {
  display: inline-block;
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-faint);
  margin-bottom: 16px;
}
```

### 5.6 Mode chip / pill label

```css
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-full);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.chip-rose { background: var(--rose-soft); color: var(--ink); }
.chip-lavender { background: var(--lavender-soft); color: var(--ink); }
.chip-blue { background: var(--blue-powder-soft); color: var(--ink); }
```

### 5.7 SVG sticker template

Every sticker is a flat SVG with these properties:
- viewBox `0 0 64 64`
- Fill: one of the sticker palette colors
- Stroke: `var(--sticker-charcoal)`, stroke-width 2.5, stroke-linejoin round
- Wrapped in a container with `transform: rotate(<random -18 to +16>deg)` and `filter: drop-shadow(0 2px 0 rgba(20,19,19,0.06)) drop-shadow(0 6px 10px rgba(20,19,19,0.08))`

**Required sticker SVGs to build inline:**
- Heart, Star, Sparkle, Sun, Moon, Cloud, Drop, Leaf, Flower, Cross (medical), Pill, Pacifier, Baby-bottle, Baby-footprint, Heart-with-DNA-swirl, Two-hearts, Crown, Lock, Shield, Page, Globe, Paper-plane, Sonogram-swirl

If a sticker isn't obvious, build a simple iconic SVG yourself. Do NOT fall back to emoji or icon libraries.

---

## 6. MOTION SPEC (must implement at least these — degrade gracefully)

**Required animations (use GSAP + ScrollTrigger, or Framer Motion, or vanilla IntersectionObserver):**

1. **Hero headline:** words cascade in (not letters). Each word starts `opacity:0, translateY:28px, filter: blur(8px)`. Stagger 60ms, duration 720ms, easing `--ease-letter`. Italic word arrives last with `+3deg rotation` settling to `0deg` via `--ease-spring`.
2. **Hero stickers:** drop in from above with randomized 100–600ms delays. Start `translateY:-120px, translateX:±40px, rotate:±35deg, scale:0.6, opacity:0`. Settle to rest over 900ms `--ease-spring`. After landing, each sticker has a continuous `±1.5deg` rotation oscillation on a 4–7s loop, each out of phase.
3. **Section reveals:** when a section enters viewport (`threshold: 0.15`), headline fades up 12px over 480ms `--ease-paper`. Body and visual children fade up with 100ms stagger after.
4. **Three Stages cards (desktop ≥ 1024px):** make this a **pinned horizontal scroll** using ScrollTrigger. The section pins for ~3× viewport height of scroll. As user scrolls, the cards translate horizontally. Currently-focused card scales to 1.0; others scale to 0.88 and shift ±60px outward. Section background bleeds to the mode-soft color of the active card (crossfade 800ms `--ease-paper`).
5. **Three Stages cards (mobile):** vertical scroll-snap with the same fade/scale per card.
6. **Chat bubbles:** stream in one by one when the AI section enters view. Each bubble: `opacity:0, translateY:20px` → `1, 0` over 380ms `--ease-paper`. Between bubbles 2 and 3, show the typing dots animation for 1200ms. Re-trigger on re-entry.
7. **Pillar grid tiles:** 2D distance-based stagger from grid center. Each tile fades up + scales `0.96 → 1` over 420ms `--ease-paper`. Max delay 400ms.
8. **Pillar tile hover (desktop):** magnetic — tile translates toward cursor up to 8px on both axes when within 60px. Inner sticker spins +8deg over 360ms `--ease-spring` and settles.
9. **Buttons:** built into the CSS in §5.1 — hover lift, press depress, magnetic pull toward cursor when within 40px (use JS).
10. **Cards:** hover lift built into §5.3.
11. **Testimonial cards:** rest rotation `(-1deg, +2deg, -2deg)`. On hover, straighten to `0deg` and lift `translateY(-6px)` over 280ms `--ease-paper`. Sticker accent rotates `+12deg`.
12. **Waitlist segmented control:** sliding active indicator morphs between positions over 320ms `--ease-paper`.
13. **Waitlist submit success:** button label crossfades to a check sticker, then 5–8 small celebration stickers burst from button center on randomized arcs over 1800ms, falling with gravity.
14. **Nav scroll morph:** described in §4.0 — transparent → floating pill after 80px scroll, 380ms `--ease-paper`.
15. **Page-level scroll progress:** thin 2px lavender (`--sticker-lilac`) line at the top, fills L→R based on `window.scrollY / documentHeight`.
16. **Sticker parallax:** all decorative stickers translate at 0.65×, 0.85×, 1.0×, or 1.15× scroll speed depending on assigned depth layer. Disable on touch devices.
17. **FAQ accordion:** plus rotates to × over 280ms `--ease-paper`. Answer height animates from 0 to auto using `grid-template-rows: 0fr → 1fr` trick (don't animate `height`).
18. **Smooth scroll:** use Lenis (or equivalent) site-wide with lerp 0.08–0.10. Disable on prefers-reduced-motion.

**Reduced motion fallback:** when `prefers-reduced-motion: reduce`, disable parallax, sticker drift, pinned horizontal scroll (fall back to vertical), magnetic hover, kinetic typography (fade-in only), success bursts, page transitions. Keep simple opacity fades at 200ms.

---

## 7. RESPONSIVE BREAKPOINTS

```
Mobile:    < 768px   (single column, larger touch targets, stacked sections)
Tablet:    768–1023  (2-column grids, condensed nav)
Desktop:   1024–1439 (full layout)
Wide:      ≥ 1440px  (max-content-width 1280px stays the same, more side margin)
```

**Mobile-specific rules:**
- Hero text sizes from the typography table (right column).
- Section padding drops to `80px 24px`.
- Nav collapses to wordmark + hamburger + CTA.
- Three-stage cards stack vertically with scroll-snap.
- Pillar grid drops to 1 column.
- Testimonial cards stack.
- Footer columns stack.
- All horizontal flex layouts become vertical.

---

## 8. PRICING PAGE (`/pricing`)

Same global nav + footer.

**Page header (centered, padding-top 128px):**
- Eyebrow: `SIMPLE PRICING`
- H1: `Choose the <em>care</em> that fits.`
- Subhead: `Start free. Upgrade only when Grandma earns it. Cancel any time, no hard feelings.`

**Two cards side-by-side (desktop), max-width 880px combined, gap 24px. Each card radius 28, paper, hairline border, padding 40px, min-height 580px.**

### Card 1 — Free
- Top: blue paper-plane sticker (48px)
- Label: `Free` (Fraunces 24px 600)
- Price block: `$0` Fraunces 72px 700, beside it muted body: `/ forever`
- Italic tagline (Instrument Serif): `For dipping a toe in.`
- Hairline divider
- Feature list (6 items, each with a small green check sticker + body):
  - `Unlimited Guru Grandma chat (with context limits)`
  - `Browse all 24 pillars`
  - `3 photo scans per month`
  - `Cycle, pregnancy, or kids tracking — full features`
  - `1 child profile`
  - `Light + dark mode, 12 languages`
- Footer CTA: paper-variant pill button `Start free` (full width)

### Card 2 — Premium (highlighted)
- Background: `var(--lavender-soft)`
- Top-right absolute corner: a coral `--sticker-coral` pill rotated `-8deg` with text `MOST CHOSEN` (uppercase, white text, padding 6px 14px, radius 999)
- Top: lavender heart-with-crown sticker (48px)
- Label: `Premium` (Fraunces 24px 600)
- Price block: `$9.99` Fraunces 72px 700, beside it muted body: `/ month`
- Below price, small body: `or $69.99 / year — saves you 41%`
- Italic tagline (Instrument Serif): `For the long haul.`
- Hairline divider
- Feature list:
  - `Everything in Free`
  - `Unlimited photo scans (food, ultrasound, rashes, labels)`
  - `Personalized insights generated weekly`
  - `Vaccine, milestone, and appointment reminders`
  - `Care circle (up to 5 caregivers)`
  - `Up to 5 child profiles`
  - `Priority support from a real human`
- Footer CTA: primary pill button `Start 7-day free trial` (full width)

**Below the cards (padding-top 96px):** A small comparison reassurance line centered, muted: `Both plans include light + dark mode, 12 languages, and offline mode.`

**Below that, a mini-FAQ (3 items, same accordion style as landing FAQ):**
1. `Can I switch plans?` / `Anytime, from inside the app. We prorate the difference.`
2. `What about refunds?` / `If you're not feeling it in the first 14 days of a paid plan, write to us and we'll refund the full amount, no questions.`
3. `Do you offer family or gift plans?` / `Gift cards are coming. Family plans are on the roadmap for late 2026.`

---

## 9. PRIVACY (`/privacy`) AND TERMS (`/terms`)

Long-form pages. Use:
- Max content width: 720px, centered
- Body: 17px, line-height 1.7, ink
- H2: Fraunces 28px, with the section number as a small lilac sticker badge in the left margin (absolute position)
- Italic Instrument Serif intro paragraph
- Top of page: uppercase tracked muted label `LAST UPDATED · MAY 15, 2026`

Generate plausible boilerplate that explicitly mentions:
- **Privacy:** Supabase encrypted storage · Anthropic / Claude API processing · RevenueCat payment data · health data handling under GDPR + HIPAA-aware · child data (no profiling of minors, no advertising IDs from minors) · data export at `/account/export` · account deletion at `/account/delete` · contact privacy@grandma.app
- **Terms:** age restriction (13+ to use, parent/guardian responsible for child data) · medical disclaimer (NOT a substitute for professional medical advice — large, prominent) · subscription and refund terms · acceptable use · IP ownership · governing law (Portugal) · contact terms@grandma.app

---

## 10. SEO + METADATA (add to every page `<head>`)

```html
<title>Grandma · A calmer companion for pre-pregnancy, pregnancy, and kids</title>
<meta name="description" content="Grandma is a parenting companion app powered by AI — guiding you through trying-to-conceive, pregnancy, and raising kids 0–5y. Currently in early access. Join the waitlist.">
<meta property="og:title" content="Grandma · Wisdom for every stage of becoming a parent">
<meta property="og:description" content="From trying, to pregnant, to raising little ones. The calm parenting companion.">
<meta property="og:image" content="/og-image.png">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
```

**OG image (`/og-image.png`):** cream `#F3ECD9` background, the wordmark "Grandma" in Fraunces 600 centered, a row of 3 stickers below (rose heart, lavender moon, powder-blue cloud), and italic line `Wisdom for every stage.`

**Favicon:** a single 32×32 lilac heart sticker on cream.

---

## 11. ACCESSIBILITY (non-negotiable)

- All interactive elements reachable via keyboard. `:focus-visible` ring: 2px solid `var(--primary)` with 2px offset.
- Color contrast AA minimum, AAA where possible. Run all body/ink combos through a contrast checker.
- All decorative stickers `aria-hidden="true"`.
- Every form input has a visible `<label>`, not placeholder-only.
- Skip-to-content link at the top of `<body>` (visually hidden until focused).
- `prefers-reduced-motion` respected as detailed in §6.
- Heading hierarchy: one `<h1>` per page, then `<h2>` per section, `<h3>` per card. Never skip levels.
- All buttons that contain only icons have `aria-label`.
- Form submit success/error messages use `role="status"` or `role="alert"` appropriately.

---

## 12. WHAT NOT TO DO (anti-examples)

When you're tempted to do any of these, **stop and re-read §0**:

- ❌ Adding a gradient mesh background "to make it pop"
- ❌ Using a phone mockup with a fake screenshot
- ❌ Adding a "Trusted by" logo strip with grayscale company logos
- ❌ Using emoji like 🌟 ✨ 💜 anywhere in copy
- ❌ Adding a "How it works in 3 steps" section
- ❌ Putting numbers like "1,000+" with animated counters all over the page
- ❌ Adding a chatbot widget in the bottom-right corner
- ❌ Using a generic icon library (Feather, Heroicons, Lucide) for the stickers — build SVGs
- ❌ Substituting Inter or system-ui for DM Sans
- ❌ Making buttons rectangular with 8px radius
- ❌ Adding a "Featured in TechCrunch" badge
- ❌ Using a dark gradient hero with white text
- ❌ Floating a "Talk to founder" Calendly bubble
- ❌ Wrapping content in a 1200px container with `box-shadow` everywhere
- ❌ Using `position: sticky` to pin a CTA bar at the bottom of the screen
- ❌ Adding a video hero with autoplay

If the AI tool produces any of the above, the response is wrong. Regenerate.

---

## 13. ACCEPTANCE CRITERIA

Before considering the build complete, verify:

- [ ] Page background is `#F3ECD9` everywhere, no exceptions
- [ ] All headings are Fraunces with italic accents from Instrument Serif
- [ ] All buttons are pill-shaped with hard-offset shadows that depress on press
- [ ] No emoji anywhere in copy
- [ ] No stock photos anywhere
- [ ] Three stages section uses cards in soft rose / lavender / blue-powder
- [ ] Chat preview card is paper-white, rotated -2deg, contains 3 bubbles + typing dots
- [ ] Pillar grid has exactly 9 tiles in 3 columns with sticker icons
- [ ] Waitlist form has segmented "Trying / Expecting / Raising" control
- [ ] Nav morphs to a floating pill after 80px scroll
- [ ] FAQ uses hairline dividers, not boxes
- [ ] Footer has 4 columns + bottom strip
- [ ] All required animations from §6 are implemented (or have reduced-motion fallbacks)
- [ ] Mobile is fully responsive at every breakpoint
- [ ] Pricing page has 2 cards (free + premium highlighted with coral "MOST CHOSEN" badge)
- [ ] Privacy + Terms pages exist with proper boilerplate
- [ ] All copy from this spec is used verbatim
- [ ] Lighthouse scores: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95

**If any item above is missing, the build is not done. Do not declare done.**
