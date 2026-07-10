# v2 Design System — Handoff Contract

**Date:** 2026-06-27
**Purpose:** Define the exact structure and completeness bar the Claude-Design v2 spec must meet so the handoff to implementation is **lossless** — no missing token, font, icon, card, or per-behavior override.

This is **not** the v2 design itself (that's authored in Claude Design). This is the *contract* for what that doc must contain, plus the prompt to generate it.

---

## Why this shape

The current codebase is ~80% token-aligned: one source of truth (`constants/theme.ts`), `useTheme()` everywhere, `getModeColor(mode, isDark)` as the per-mode hook, 28/29 shared primitives already read tokens. So the efficient migration is **token-layer-first**: re-skin the tokens + shared primitives once and screens inherit v2 for free.

For that to work one-pass, the spec must be expressed as **shared base + per-behavior override** — exactly how the code resolves. The implementation contract is:

- A shared foundation (DM Sans body, spacing, radius, blob, elevation, motion base).
- Three behaviors — **Cycle** (tracking), **Pregnancy** (expecting), **Raising** (kids) — each declaring **only what it overrides**: display font, accent palette, date/numeral font, motion profile, surface treatment, doodle stroke behavior.
- A single resolver `getBehaviorTheme(behavior, isDark)` returns the merged personality object; components read it instead of scattered `mode ===` checks.

Every value the spec omits becomes a guess at implementation time. The checklist below is the anti-omission gate.

---

## Required document structure

The v2 spec doc must contain these sections, in this order. Each token must appear as **name + value + which behaviors use it** (shared vs. override).

### 00 · Behaviors Overview
- The three behaviors named with their identity tagline (e.g., Cycle = clinical/precise/calm; Pregnancy = warm serif+mono; Raising = playful/handcraft).
- One sentence each on personality intent.
- A statement of what is **shared across all three** (the "connective tissue" — e.g., DM Sans body, spacing scale, blob radius language).

### 01 · Foundations — Shared
Document once, used by all behaviors. Each as **token name → value**:
- **Color foundations:** canvas/bg, bgWarm, surface, surfaceRaised, surfaceGlass, border, borderStrong, text, textSecondary, textMuted, textInverse — for **both light and dark**.
- **Body typography:** family (DM Sans weights loaded), the body/label/caption sizes + line-heights, letter-spacing.
- **Spacing scale:** every step with px value.
- **Radius / blob:** every radius token (card, button/pill, input, full) + any "blob" organic-shape definition with its params.
- **Elevation / shadow:** every shadow preset (name → offset/opacity/radius/elevation). Note explicitly which are allowed (no legacy glow).
- **Motion base:** shared spring/timing configs (duration, easing) used app-wide.

### 02 · Foundations — Per-Behavior Overrides
For **each** behavior (Cycle, Pregnancy, Raising), a table listing **only the values that differ from shared**:
- **Display font:** family + weights + the sizes/line-heights/letter-spacing for display headings and numerals. (e.g., Cycle = Space Mono; Pregnancy = Fraunces; Raising = Caveat/Patrick Hand.)
- **Date/numeral font:** if different from display (e.g., Pregnancy dates = Space Mono).
- **Accent palette:** every accent color with name + hex, light **and** dark variant. Include the count shown in the doc (Cycle 4 phases, Pregnancy plum+cream warm set, Raising 6 crayon hues). Each must map to a semantic role (primary accent, soft tint, ink/on-accent text).
- **Surface treatment:** any per-behavior surface tint or card-fill difference.
- **Motion profile:** the behavior's motion personality (e.g., Raising bouncier, Cycle calm) expressed as named config deltas from the motion base.
- **Doodle/icon stroke rule:** how icons take color in this behavior (e.g., "stroke takes the crayon color of wherever it sits").

> Every override must state its value. "Warmer" is not implementable; "accent = #7048B8 light / #C4B5EF dark" is.

### 03 · Doodle Icon Set
- The **full icon inventory** — every icon name (the doc shows heart, star, sun, cloud, rain, moon, flower, sparkle, smiley, sprout, bolt, music, house, gift, paw, rainbow, cherry, bell, check, zzz, umbrella, mug, arrow, bow, drop, leaf, bubbles…). List **all** of them so none is dropped.
- The **stroke contract:** single-stroke, one consistent line weight, stroke inherits the behavior's accent color. State the stroke width + cap/join.
- The intended **canvas/size** and how size scales.
- Note which existing stickers in `components/stickers/` and `components/ui/Stickers.tsx` are **replaced**, **kept**, or **restyled** by this set (so nothing is orphaned).

### 04 · Components (each documented per-behavior where it differs)
For **every** component type below, document: anatomy, the tokens it consumes, states (default/pressed/active/disabled), and the per-behavior delta (what retints/re-fonts). Mirror the depth of the original `design-system.jsx` (Foundations → Buttons → Inputs → Cards → Charts → Badges → Nav → Type → Icons).

Required component coverage (the anti-omission list):
- **Buttons:** pill/primary, sticker button, secondary/paper, text/link button. States + per-behavior fill/font.
- **Inputs:** text field, date picker, slider/step slider, segmented toggle.
- **Cards:** base paper card, raised/nested card, stat card, the per-behavior "hero" card (Cycle day card, Pregnancy week card, Raising mood/naps card).
- **Charts:** the data-viz styling per behavior (Cycle phase bar, Pregnancy week progress, Raising mood faces), colors + stroke.
- **Badges / pills:** stage chip, status pill, count badge.
- **Nav:** tab bar (active color per behavior), screen header.
- **Progress:** the progress bar/ring styling per behavior.
- **Typography specimens:** every text role rendered (display, display-italic, numeral, body, label, mono-caps) per behavior so the font mapping is unambiguous.

### 05 · Voice (optional but valued)
- Microcopy tone per behavior (Cycle clinical, Pregnancy tender, Raising playful) with 2–3 example strings each. Affects nothing in tokens but guides component copy.

---

## Completeness checklist (the anti-omission gate)

Before handing the spec to implementation, every box must be checkable:

**Tokens**
- [ ] Every shared foundation token has a name + light value + dark value.
- [ ] Every per-behavior override has a name + value (light + dark), for all three behaviors.
- [ ] No color appears as prose only ("warm plum") without a hex.
- [ ] Every accent maps to a semantic role (accent / soft / ink-on-accent).

**Type**
- [ ] Every font family used is named with exact weights, and flagged whether it's **already loaded** in `app/_layout.tsx` or **new** (new fonts = a load step).
- [ ] Every text role (display, numeral, date, body, label, caption, mono-caps) has a family + size + line-height + letter-spacing, per behavior where it differs.

**Icons**
- [ ] Full icon inventory listed by name (no "…etc").
- [ ] Stroke contract stated (width, cap/join, color-inheritance rule).
- [ ] Mapping of each existing sticker/icon → keep / restyle / replace.

**Components**
- [ ] Every component in the §04 list is documented with states + per-behavior delta.
- [ ] Each per-behavior "hero" card is specified (Cycle / Pregnancy / Raising).
- [ ] Charts styling specified per behavior.

**Resolver**
- [ ] The spec is expressed as shared base + overrides (not three standalone copies), so it maps to `getBehaviorTheme(behavior, isDark)`.
- [ ] Behavior keys named consistently (Cycle / Pregnancy / Raising) and mapped to the code's mode keys (`pre` / `preg` / `kids`).

**Coverage sanity**
- [ ] Cross-checked against the current app surface: home hero, calendar, insights, log forms, tab bar, library, vault — each has the tokens/components it needs in v2.

---

## What I (implementation) will do with a spec that passes the checklist

1. **Foundation pre-work** (can start before the spec lands): extract scattered foundation hex into tokens, kill inline `fontFamily` strings, consolidate `getModeColor` duplication. De-risks the migration.
2. **theme.ts v2:** add shared foundation + per-behavior override objects; implement `getBehaviorTheme(behavior, isDark)`.
3. **Fonts:** load any new families in `app/_layout.tsx`.
4. **Re-skin the 28 shared primitives** to read the resolver. Most screens inherit v2 here.
5. **Doodle icon set:** implement the new icon components, map old→new.
6. **Per-behavior hero components** (the ~29 behavior-specific files) take their behavior's overrides.
7. **Sweep + verify:** scan for remaining raw hex, typecheck, visual pass per behavior.

If the spec passes the checklist, steps 2–6 are mechanical and one-pass. If it doesn't, each gap becomes a round-trip back to Claude Design — which is exactly what this contract prevents.

---

## Naming bridge (spec ↔ code)

| Spec (Claude Design) | Code (`useModeStore` / theme) |
|---|---|
| Cycle / Tracking | `pre` (pre-pregnancy) |
| Pregnancy / Expecting | `preg` |
| Raising | `kids` |

State this mapping in the spec so there's no ambiguity at wire-up.
