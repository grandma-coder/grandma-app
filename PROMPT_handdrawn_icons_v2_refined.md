# Prompt — hand-drawn icon/sticker set, refinement pass (v2, in-context)

Refines the 34-icon "sticker hand" set AND extends it to match the live reskin (warm serif + soft pastel washes). Icons must read on colored cards, in the tab bar, and as hero stickers.

---

```
Refine and extend the grandma.app hand-drawn "crafted" icon/sticker set from the previous contact sheet ("the sticker hand", 34 icons). Keep the blue-ink one-pen doodle character, but fix consistency and make every glyph work IN-CONTEXT in the live app (warm cream canvas, soft pastel stat cards, mono-uppercase labels, serif headings). Deliver optimized SVGs.

═══════════ 1) FIX THESE (from review) ═══════════
- Normalize OPTICAL WEIGHT and SIZE across all icons: same stroke width and same visual footprint in every tile. Currently daisy/blocks/buildings/sun-spiral read too dense; ultrasound-wave/leaf-sprig/tiny-foot/bee/footprints read too thin and float small. Even them out.
- Disambiguate look-alikes: cycle "flower" vs botanical "daisy" (make flower a single simple bloom, daisy the many-petaled one); "bud-sprout" vs "leaf-sprig" (distinct silhouettes).
- ovulation-dot: redraw as an egg/circle with a single center dot — REMOVE the rays (they read as a sun and clash with sun-spiral).
- Add gentle hand wobble to the too-geometric ones: calendar, blocks, buildings, milk-bottle (no ruler-straight lines).
- belly: clearer side-profile pregnant bump (currently reads like a balloon).
- growth-chart: make it a percentile curve or a measuring ruler, not a finance chart.
- check: give it the same slight corner overshoot as the rest (it's too clean).

═══════════ 2) COLOR / IN-CONTEXT RULES ═══════════
- Draw ALL line icons with stroke="currentColor" and NO hardcoded color, so they inherit context:
    · On cream paper / cards → ink (--c-fg / --c-fg-2).
    · On a colored stat-card wash (lavender/yellow/pink/green) → a DEEPER tint of that wash (via --c-fg-2 / darkened accent), so the icon stays legible on the tint — never pure bright blue on a pastel.
    · Alert/overdue states → --c-danger (red).
    · Active nav / accent → --accent.
- STICKERS (decorative, may use fixed 2-color fills, unlike the line icons): 
    · eye-logo (eye outline with a small heart pupil + short rays) — blue #2C66D6 line + red #E5443B heart.
    · starburst-plus (spiky hand-drawn burst with a + center) — coral/red fill #EE7B6D with #1E3FA8 outline + white plus. This is the center tab FAB.
    · heart-doodle — red #E5443B.
  Keep stickers clearly "hand-cut sticker" with the .sticker-shadow treatment; keep line icons flat.

═══════════ 3) TWO SIZE TIERS (draw for the smaller one) ═══════════
- UI tier — 24px target (card-corner icons, tab bar, inline, chevrons): simplify detail so it's crisp at 20–24px. Stroke ~1.75–2px at 24.
- Sticker/hero tier — 48–64px: richer detail, more wobble character.
Provide each glyph normalized to a 24×24 viewBox (UI) and note which also ship a 64×64 sticker variant.

═══════════ 4) FULL SET ═══════════
Keep all 34 existing (refined). ADD the functional UI/nav glyphs seen in the app, in the same hand:
  · Nav/tab: home, agenda (calendar), vault (shield), settings (person), chevron-right.
  · Card/status: flame (calories), bolt (activities), smiley (mood), moon (sleep — reuse), star (goals), bell (reminder), plus.
And the hero stickers from section 2 (eye-logo, starburst-plus, heart-doodle).

═══════════ 5) CONSISTENCY ═══════════
Every glyph looks drawn by the SAME hand, SAME pen: uniform normalized stroke, round linecap/linejoin, matching wobble/overshoot character, centered with equal padding, transparent background. No fills on line icons, no gradients, no baked shadows.

═══════════ 6) DELIVERABLES ═══════════
- Refined contact sheet (labels in Caveat, blue ink, on paper #F5EBD8), grouped: Cycle · Pregnancy · Kids · Botanical · UI/Nav · Stickers.
- An IN-CONTEXT preview board: the corner icons placed on the four pastel wash cards (lavender/yellow/pink/green), the nav row in a tab bar, and the three hero stickers — to prove legibility and tinting.
- Individual export-ready SVGs, kebab-case, currentColor strokes, 24×24 normalized (+ 64×64 for stickers).
- 100% original artwork; child-safe; cohesive with the warm cream aesthetic.
```

---

### Notes
- I flagged this because it matters: your reskin is the **warm serif** direction (Fraunces/Instrument + pastel washes), not the Geist/v4 dashboard — the icons are being tuned to *this*, which is the right call for the crafted look.
- The `currentColor` + "deeper tint of the wash" rule is the key to the corner icons reading well on the colored cards instead of vibrating as bright blue.
- Want me to run this now and generate the refined set + the in-context preview?
