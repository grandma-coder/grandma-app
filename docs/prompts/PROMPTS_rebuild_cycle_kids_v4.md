# Rebuild prompts — Cycle & Kids screens on design-system-v4

Two screen prompts. **Prepend the SHARED V4 CONTRACT to whichever screen prompt you run** (it carries the token rules both screens must obey). Each screen block adds its own layout/components.

---

## SHARED V4 CONTRACT (prepend to both)

```
Build this screen to match design-system-v4.html EXACTLY. It is a single self-contained HTML file. Non-negotiable token contract:

ROOT — set <html data-theme="diffuse" data-mode="..."> (pre for Cycle, kids for Kids) so mode tokens resolve. Load fonts in <head>:
  https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap
  @font-face for 'Safiro' (self-hosted woff2) with Geist fallback.

FONTS (never hardcode a family; use these roles):
  - Geist (--font-body) = everything: headings, body, labels, buttons.
  - Geist Mono (--font-mono) = IDs, timestamps, units, pill labels, eyebrows, deltas.
  - Safiro (--font-display) = HERO KPI NUMBERS ONLY (.t-kpi). Never headings or body.

TYPE SCALE — use these classes, do not invent sizes:
  .t-h1 40/700 · .t-h2 30/700 · .t-h3 22/700 · .t-h4 16/600 · .t-h5 12/600 UPPERCASE (section label, color --c-fg-3)
  .t-body 13/400 (DEFAULT for all copy) · .t-cap 12 (--c-fg-3) · .t-cap-s 11 (--c-fg-4)
  .t-eyebrow mono 11 UPPERCASE (--c-fg-3) · .t-mono 13 (Geist Mono) · .t-kpi Safiro 40/700 tabular-nums
  Deltas: .t-up (--c-success) for +, .t-dn (--c-danger) for −.

NUMBERS — 3 roles, strict:
  - Hero/feature value (the big stat that IS the content) → .t-kpi (Safiro), tabular-nums.
  - Metadata/inline number (units, times, counts, "DAY 14", dates in eyebrows) → .t-mono (Geist Mono).
  - In-flow reading numbers → Geist body (.t-body). Never put a big feature number in mono.

COLOR — warm brand + semantic (merge):
  - Canvas: --bg (page), --paper / --paper-2 (cards). Text: --c-fg / --c-fg-2/3/4.
  - Mode accent via --accent (auto from data-mode). Colorful washes via --g1..--g4 (auto from data-mode). Do NOT hardcode mode hexes.
  - Semantic only for state: --c-success (up/positive/good), --c-warn, --c-danger (down/negative/alert), --c-accent (neutral UI accent). Deltas green/red.

SPACING — 4px scale only: var(--space-1..12) for every padding/gap (16→--space-4, 24→--space-6, 8→--space-2, 12→--space-3). No arbitrary px.

RADIUS — cards var(--c-r-card) 16px; nested/controls --c-r-sm 6 / --c-r-md 10 / --c-r-lg 14 / --c-r-xl 20; pills/chips/buttons 999px (fully round). No stray radii.

SHADOWS — flat by default: 1px hairline border (--line) and NO shadow. Use var(--sh-card) only for genuine lift, var(--sh-pop) for popovers/modals. No raw rgba shadows, no glow.

ICONS — Lucide only, inherit currentColor. Sizes: 12 default / 14 / 16 emphasis / 18 header / 10-11 dense. strokeWidth 1.75 default (1.5 light, 2 bold). Tint with --c-fg-3 when quieter than label; semantic colors for status icons.

BUTTONS/PILLS — filled pills (999px) for primary CTAs in --accent; chips are 999px with hairline border, mono label (.t-mono / .t-eyebrow), selected state = filled/accent ring (never a heavy color block). Cards: --paper, --c-r-card, hairline border, --space-* padding.
```

---

## SCREEN A — Cycle (Pre-Pregnancy)

```
[PREPEND THE SHARED V4 CONTRACT ABOVE]

Screen: CYCLE home (Pre-Pregnancy). Root data-mode="pre" (accent #C25872 via --accent; washes --g1 #F0A99A / --g2 #F0B8C8 / --g3 #C9B7E6 / --g4 #F7DCC0 via var()). Rebuild these blocks, all on the v4 contract:

1) HEADER — greeting (.t-h2), date eyebrow (.t-eyebrow, mono). Optional mode switcher chip row (999px chips, mono labels).
2) CYCLE PHASE RING — circular ring showing current phase; the big cycle-day number in the center is a HERO number → .t-kpi (Safiro). Phase label under it in .t-h4; "of 28 days" in .t-mono. Ring stroke uses --accent; track uses --line.
3) FERTILE WINDOW STRIP — horizontal week strip; day numbers in .t-mono; fertile days highlighted with --accent / --accent-soft; today marked with an --accent dot. Card = --paper, --c-r-card, hairline.
4) HORMONE CHART — line/area graph. Axis + value labels in .t-mono (--c-fg-3). Series line in --accent; secondary series in --g3. Gridlines --line. Any peak value callout = .t-kpi if it's the focal number, else .t-mono.
5) SYMPTOM CHIPS — multi-select chips (Cramps, Headache, Fatigue, Bloating, Other +): 999px, hairline border, label in .t-mono/.t-eyebrow, selected = filled --accent-soft with --accent ring. "Other +" reveals a typed field (input --c-r-md).
6) CYCLE LENGTH STEPPER — outline ± buttons (round, hairline) with the big value in .t-kpi (Safiro) and "DAYS" beneath in .t-eyebrow (mono).
7) FERTILITY PILLARS GRID — 6 pillar tiles; each tile: Lucide icon (16px, --c-fg or wash tint), title .t-h4, caption .t-cap, --paper, --c-r-card, --space-4 padding, hairline.
8) Any stat cards (avg cycle, period length): label .t-h5, big value .t-kpi, unit/delta .t-mono (+ = .t-up green, − = .t-dn red).

All spacing from --space-*, all radii from --c-r-*, pills 999px, flat cards with hairline. Output the full HTML file.
```

---

## SCREEN B — Kids

```
[PREPEND THE SHARED V4 CONTRACT ABOVE]

Screen: KIDS home. Root data-mode="kids" (accent #4C79CE via --accent; washes --g1 #F4D888 / --g2 #A2D8B4 / --g3 #A6BCE6 / --g4 #F4B396 via var()). Rebuild these blocks on the v4 contract:

1) HEADER — greeting (.t-h2), date eyebrow (.t-eyebrow mono). CHILD CHIPS row: 999px chips with small avatar + name (.t-body) + age (.t-mono); active child = filled --accent-soft + --accent ring.
2) HERO TILES (Sleep / Feeding / Mood / etc.) — small cards; each: Lucide icon 16px tinted with a wash (--g1..--g4), label .t-h5 (section label), value .t-h4 or .t-mono (e.g. "Last nap 1h 20m" in mono). --paper, --c-r-card, hairline, --space-4.
3) SLEEP CIRCLE — ring showing hours slept; center hero number → .t-kpi (Safiro); "hrs" in .t-eyebrow. Ring in --accent.
4) MOOD — mood cluster/row; counts in .t-mono; mood accents from wash palette --g1..--g4 (not saturated). 
5) CALORIES / NUTRITION — big daily number → .t-kpi; target + delta in .t-mono (over = .t-dn, under/on-track = .t-up). Progress bar fill --accent, track --line.
6) GROWTH LEAPS — timeline/list; leap number in .t-mono; current leap highlighted with --accent.
7) KIDS PILLARS GRID — 9 pillar tiles; each: Lucide icon 16px, title .t-h4, caption .t-cap, --paper, --c-r-card, --space-4, hairline.
8) SEGMENTED CONTROL (e.g. GIRL / BOY / PREFER NOT or tab filters) — 999px pill group, mono labels (.t-eyebrow), selected = filled paper pill with hairline ring, unselected = --c-fg-3.

All numbers follow the 3-role rule (KPI=Safiro, metadata=Geist Mono, reading=Geist). Spacing --space-*, radii --c-r-*, pills 999px, flat hairline cards, Lucide icons only. Output the full HTML file.
```

---

### Reminder
- These build on v4's **diffuse** theme (the active default), so `data-mode` auto-resolves `--accent` and `--g1..--g4` — prefer `var(--accent)` / `var(--g1..g4)` over hardcoded hexes so future palette changes flow in.
- **Safiro** needs a licensed webfont; until then KPI numbers fall back to Geist Bold.
