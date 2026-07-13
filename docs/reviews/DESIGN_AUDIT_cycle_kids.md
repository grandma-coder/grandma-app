# Design-System Audit — Cycle & Kids screens

**Target standard: `design-system-v3.html` "diffuse" theme** (the theme v3 sets as default via `<html data-theme="diffuse">`).

Diffuse redefines the tokens as: fonts = Cormorant Garamond (`--d-display`) + Hanken Grotesk (`--d-sans`) + Space Mono (`--d-mono`); ink = `#1A1916`; canvas = `#F4F1E8` page / `#FBFAF5` cards; mode colors inherit the base (pre-pregnancy rose `#E58BB4`, kids powder blue `#8BB8E8`); card radius `--d-r-lg` = 28; pills 999.

## What's already correct ✅

- **Fonts** — both screens use `--d-display` / `--d-sans` / `--d-mono`, which is exactly the diffuse trio. No font changes needed.
- **Text ink** — `#1A1916` matches diffuse's `--d-ink`. Correct.

## What's misaligned ❌

| Area | Cycle.html | KidsHome.html | Diffuse target |
|---|---|---|---|
| **Mode color** | purple `#A98BDD` / `#8A4FD0` + olive `#7E9A4C` | crayon `#2C66D6`, `#37C06A`, `#F2C12D`, `#F26A2A`, `#F2649E` | **NEW soft washes + accents** (see Mode colors section) — the screens use the *old, pre-update* saturated values |
| **Canvas** | `#F3EEE2` / `#FCF5EA` | `#F3EEE2` / `#FCF5EA` | `#F4F1E8` page, `#FBFAF5` cards, `#F7F4EC` nested |
| **Pills** | `99px` ×21, `999px` ×0 | `99px` ×20, `999px` ×0 | `999px` |
| **Card radii** | mix of 13/15/18/20/22/24/30/34 | mix of 12/13/18/20/22/24 | 28 (`--d-r-lg`), inputs 20 (`--d-r-md`), chips 14 (`--d-r-sm`) |
| **Shadows** | 9 raw rgba, 0 tokens | 7 raw rgba, 0 tokens | `var(--sh-card)` / `var(--sh-pop)` |
| **Buttons** | 8 `background:none` interactive | 2 `background:none` interactive | primary CTAs = filled pills |

### Detail

**1. Mode colors (the big one — palette was just desaturated).** The updated design system replaced its saturated per-mode washes with soft pastels. The screens still use the **old, pre-update** values, so they need remapping to the NEW diffuse per-mode tokens. Best practice: put `data-mode="pre"` (Cycle) / `data-mode="kids"` (KidsHome) on the root and reference `var(--g1..--g4)` and `var(--accent)` so future palette changes flow automatically. Explicit values:

**Cycle → `data-mode="pre"`** — accent `#C25872` (soft `#F6DCE4`), gradient wash g1 `#F0A99A` / g2 `#F0B8C8` / g3 `#C9B7E6` / g4 `#F7DCC0`. Remap:
- purples `#A98BDD` / `#B6A0DD` / `#9A7FD0` / `#C8B7E6` / `#8A4FD0` → `#C9B7E6` (g3)
- pink `#ED88A6` → `#F0B8C8` (g2)
- coral `#F2654E` / `#E8806E` → `#F0A99A` (g1)
- peach `#F4C9A0` → `#F7DCC0` (g4)
- accent `#C46A8E` / `#C6486A` → `#C25872`
- off-palette olive `#7E9A4C` / `#A7C07A` → soft sticker green `#BDD48C` (or drop)

**Kids → `data-mode="kids"`** — accent `#4C79CE` (soft `#CBDCF7`), gradient wash g1 `#F4D888` / g2 `#A2D8B4` / g3 `#A6BCE6` / g4 `#F4B396`. Remap:
- yellows `#F2C12D` / `#F6D06A` / `#F2A21C` / `#D9A213` → `#F4D888` (g1)
- greens `#37C06A` / `#7AD79A` / `#2E9E57` / `#39AE82` → `#A2D8B4` (g2)
- blues `#2C66D6` / `#5FA0E6` / `#3F8AD0` / `#3B7BC9` → `#A6BCE6` (g3), primary UI accent → `#4C79CE`
- oranges `#F26A2A` / `#E85C1E` / `#C24B33` → `#F4B396` (g4)
- pinks `#F2649E` / `#F6B8D0` / `#E0567F` → soft pink `#F2AEC6`
- herotile icon tints: `#2C66D6` → `#8FB0E0`, `#37C06A` → `#9BCBB0`

**2. Canvas.** Both use `#F3EEE2`/`#FCF5EA`, which is close to but not the diffuse values. Snap to `#F4F1E8` (page/`--bg`), `#FBFAF5` (cards/`--paper`), `#F7F4EC` (nested/`--paper-2`).

**3. Pills.** Replace every `99px` with `999px` (fully-round is the v3 convention — used 18× in v3, `99px` only 3×).

**4. Card radii.** Standardize: cards `28` (`--d-r-lg`), inputs `20` (`--d-r-md`), small chips `14` (`--d-r-sm`).

**5. Shadows.** Delete raw rgba shadows. Cards default to a 1px hairline border (`--line`) with no shadow; add `var(--sh-card)` only for real lift, `var(--sh-pop)` for popovers/modals. (Diffuse's soft radial-glow blobs are part of the theme — keep those; this only targets card drop-shadows.)

**6. Buttons.** Primary CTAs must be filled pills (radius `999`, filled with the mode color), not outline-only.

## Numbers — v3 rule + one bug

v3 uses **three** number treatments by role (and its spec text contradicts itself, which is what invites mistakes):

| Role | Font | Where |
|---|---|---|
| Hero / feature value | Cormorant serif (`--d-display`), weight 300, large | stepper `28`, cycle day, week, weight, big stats |
| Metadata / label number | Space Mono (`--d-mono`), small, uppercase, letter-spaced | `CYCLE DAY 14 · 09:41`, units, counts |
| Picker / wheel value | Hanken sans (`--d-sans`), weight 600 | date wheel `13 Mar 2026` (inherits body sans) |

**Spec contradiction to tighten in the design system:** the type panel says *"Mono · Labels, metadata, numbers"* while §20 says *"numbers are the light serif."* Reword to: mono = *labels, metadata & inline numbers*; serif = *hero/feature numbers*.

**Bug found:** in `Cycle.html`, `.statc .sv` (stat-card value) renders a **30px number in Space Mono** — a feature number wrongly set in typewriter mono. Should be the light serif. KidsHome has no equivalent issue.

---

# Fix prompts (copy-paste) — targeting v3 diffuse

> Fonts and ink are intentionally left alone (already diffuse-correct). These fix only the six misaligned areas.

## MASTER — Cycle screen

```
Refactor Cycle.html to fully match the design-system-v3 "diffuse" theme. KEEP the existing fonts (Cormorant Garamond --d-display, Hanken Grotesk --d-sans, Space Mono --d-mono) and the #1A1916 text ink — those are already diffuse-correct. Change ONLY the following:

MODE COLOR — this is the Pre-Pregnancy screen and the design system palette was just DESATURATED to soft pastels; the file still uses the old saturated values. Set data-mode="pre" on the root container. Accent = #C25872 (soft #F6DCE4). Gradient/wash colors on colorful cards use g1 #F0A99A / g2 #F0B8C8 / g3 #C9B7E6 / g4 #F7DCC0. Remap every old color: purples #A98BDD/#B6A0DD/#9A7FD0/#C8B7E6/#8A4FD0 → #C9B7E6; pink #ED88A6 → #F0B8C8; coral #F2654E/#E8806E → #F0A99A; peach #F4C9A0 → #F7DCC0; accents #C46A8E/#C6486A → #C25872; off-palette olive #7E9A4C/#A7C07A → soft green #BDD48C (or remove). Prefer referencing var(--accent) and var(--g1..--g4) over hardcoded hexes.

CANVAS — replace #F3EEE2/#FCF5EA with the diffuse values: page #F4F1E8, cards #FBFAF5, nested surfaces #F7F4EC.

PILLS — replace every border-radius:99px with 999px.

CARD RADII — standardize: cards 28 (--d-r-lg), inputs 20 (--d-r-md), small chips 14 (--d-r-sm).

SHADOWS — delete all raw rgba box-shadows. Cards use a 1px hairline border (--line rgba(20,19,19,0.08)) and no shadow; add var(--sh-card) only where real lift is intended. Keep the diffuse soft radial-glow blob effects.

BUTTONS — primary CTAs are filled pills (radius 999, filled with the rose mode color), never outline-only.

Keep layout, content, fonts, and the diffuse aesthetic identical; change only the tokens above. Output the full corrected file.
```

## MASTER — Kids screen

```
Refactor KidsHome.html to fully match the design-system-v3 "diffuse" theme. KEEP the existing fonts (Cormorant Garamond --d-display, Hanken Grotesk --d-sans, Space Mono --d-mono) and #1A1916 text ink — already diffuse-correct. Change ONLY:

MODE COLOR — this is the Kids screen and the design system palette was just DESATURATED to soft pastels; the file still uses the old saturated crayon values. Set data-mode="kids" on the root container. Accent = #4C79CE (soft #CBDCF7). Gradient/wash colors use g1 #F4D888 / g2 #A2D8B4 / g3 #A6BCE6 / g4 #F4B396. Remap every old crayon color: yellows #F2C12D/#F6D06A/#F2A21C/#D9A213 → #F4D888; greens #37C06A/#7AD79A/#2E9E57/#39AE82 → #A2D8B4; blues #2C66D6/#5FA0E6/#3F8AD0/#3B7BC9 → #A6BCE6 (primary UI accent → #4C79CE); oranges #F26A2A/#E85C1E/#C24B33 → #F4B396; pinks #F2649E/#F6B8D0/#E0567F → #F2AEC6. Herotile icon tints: #2C66D6 → #8FB0E0, #37C06A → #9BCBB0. Prefer referencing var(--accent) and var(--g1..--g4) over hardcoded hexes.

CANVAS — replace #F3EEE2/#FCF5EA with diffuse: page #F4F1E8, cards #FBFAF5, nested #F7F4EC.

PILLS — replace every border-radius:99px with 999px.

CARD RADII — cards 28 (--d-r-lg), inputs 20 (--d-r-md), chips 14 (--d-r-sm).

SHADOWS — delete all raw rgba box-shadows. Cards = 1px hairline border (--line) + no shadow; var(--sh-card) only for real lift. Keep diffuse glow blobs.

BUTTONS — primary CTAs are filled pills (999, powder-blue fill), no outline-only.

Keep layout, content, fonts, and diffuse aesthetic identical; change only the tokens above. Output the full corrected file.
```

## MODULAR prompts (either screen)

**Mode colors only** (updated to the DESATURATED palette)
```
The design system palette was desaturated to soft pastels; these screens still use the old saturated values. Remap to the new diffuse per-mode tokens. Set data-mode on the root and prefer var(--accent)/var(--g1..--g4) over hardcoded hexes.

CYCLE (data-mode="pre") — accent #C25872 (soft #F6DCE4); washes g1 #F0A99A / g2 #F0B8C8 / g3 #C9B7E6 / g4 #F7DCC0. Map: #A98BDD/#B6A0DD/#9A7FD0/#C8B7E6/#8A4FD0 → #C9B7E6; #ED88A6 → #F0B8C8; #F2654E/#E8806E → #F0A99A; #F4C9A0 → #F7DCC0; #C46A8E/#C6486A → #C25872; olive #7E9A4C/#A7C07A → #BDD48C.

KIDS (data-mode="kids") — accent #4C79CE (soft #CBDCF7); washes g1 #F4D888 / g2 #A2D8B4 / g3 #A6BCE6 / g4 #F4B396. Map: #F2C12D/#F6D06A/#F2A21C → #F4D888; #37C06A/#7AD79A/#2E9E57 → #A2D8B4; #2C66D6/#5FA0E6/#3F8AD0 → #A6BCE6 (primary → #4C79CE); #F26A2A/#E85C1E/#C24B33 → #F4B396; #F2649E/#F6B8D0/#E0567F → #F2AEC6; herotile #2C66D6 → #8FB0E0, #37C06A → #9BCBB0.

Do not touch fonts or text ink.
```

**Canvas only**
```
Replace canvas colors with diffuse values: page/background #F4F1E8, card surfaces #FBFAF5, nested surfaces #F7F4EC, deep sections #EDE9DD. Leave text ink at #1A1916 (already correct).
```

**Pills & radii only**
```
Replace every border-radius:99px with 999px. Standardize card radius to 28 (--d-r-lg), inputs to 20 (--d-r-md), small chips to 14 (--d-r-sm). Primary CTAs are filled pills (999, mode-color fill), not outline-only.
```

**Numbers only**
```
Fix number typography to the v3 3-role rule. Hero/feature numbers (big stat values, cycle day, week, weight, stepper values) → Cormorant serif (--d-display), weight 300. Metadata/inline numbers (units, times, counts, eyebrow labels like "CYCLE DAY 14") → Space Mono (--d-mono), small. Picker/wheel values → Hanken sans (--d-sans), weight 600. Specifically in Cycle.html, change .statc .sv from font-family:var(--d-mono) to var(--d-display) so stat-card values render in the light serif, not typewriter mono.
```

**Shadows only**
```
Delete all raw rgba box-shadows. Cards rely on a 1px hairline border (--line) with no shadow; use var(--sh-card) for genuine lift and var(--sh-pop) for popovers/modals. Keep the diffuse soft radial-glow blob effects — only remove hard drop-shadows on cards.
```
