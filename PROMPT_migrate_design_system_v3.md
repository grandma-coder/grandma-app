# Handoff — migrate the whole app to design-system-v3

Goal: switch **every screen, popup, button, and component across all 3 journey modes** (pre-pregnancy / pregnancy / kids, light + dark) onto `design-system-v3.html`.

This doc is the flow to run inside **Claude Code in VS Code**. It gives you: the recommended strategy (with reasoning), a phased plan with checkpoints, and copy-paste prompts for each phase.

Source design: https://claude.ai/design/p/4aa7aaa8-28c1-4eb8-88f6-57ef97f27a08?file=design-system-v3.html
Import via the `claude_design` MCP (`https://api.anthropic.com/v1/design/mcp`, auth via `/design-login`).

---

## Decisions locked (Jul 2026)

- **Target = v3.** v4 exists in the same bundle but is out of scope; treat it as a future direction only.
- **Care (4th behavior) = scaffold tokens, defer UI.** Add care's field/accent/accent-soft tokens and let helpers accept `'care'`, but build **no** care screens, tabs, or `useModeStore`/`modeConfig` wiring yet.
- **Stickers = kept as the ICON SYSTEM.** Diffuse replaces the *surface* language (canvas, gradient fields, containerless buttons, hairline selection, mono/serif/sans type), **but the sticker set stays as the app's iconography throughout.** This means the sticker palette tokens (`stickers.*` / `stickersDark.*`) remain **active**, not "keep, unused" — every stamp/badge/pillar/log icon keeps rendering from them. Do not retire `components/stickers/*` or the sticker SVG assets.

## Design intent (the north-star)

This is not a literal 1:1 port of v3 — it's a design pass **toward** the v3 language. The goal for every screen: **cleaner, softer, more aesthetic, cooler.** Concretely that means: more whitespace and breathing room, calmer visual hierarchy, fewer competing elements per screen, gentler contrast and edges (hairlines over boxes, gradient fields over blocks), restrained motion, and a considered, premium feel.

Claude Code has **license to adjust, reskin, and remake** — reflow layouts, drop clutter, resize/retone, merge or split components, rethink spacing and hierarchy — wherever it makes a screen cleaner or more beautiful. v3 is the reference and the vocabulary, not a pixel spec.

Constraints on that license (so it stays coherent, not chaotic):

- Stay token-driven — everything comes from `constants/theme.ts` (diffuse set). No inventing loose hex.
- Keep component **props/APIs** stable so nothing downstream breaks.
- Keep **stickers as the icon system**.
- Preserve all functionality and data — this is visual, not behavioral.
- **Flag before restructuring:** if a change is structural (removing a feature's UI, changing navigation, altering a flow), call it out for review instead of just doing it.
- When judgment is needed, bias toward *less* — remove before adding.

## What Phase 0 found (why the strategy below changed)

The mapping table (saved alongside `docs/design/design-system-v3.html`) showed v3 "Diffuse" is a **language replacement, not a recolor** — most rows are "same shape = N". A pure token value-swap only covers the 1:1 rows (canvas/paper/ink/border, radius). Everything that gives Diffuse its character has **no current token home** and must be *added*: gradient fields (`--g1..g4` × modes) + `getModeField()`, blur scale, `--d-hairline`, `font.mono` (Space Mono) + type-role tokens, and three new families (Cormorant Garamond, Hanken Grotesk, Space Mono). v3 also leaves status colors and nav/tab tokens **undefined** — carry the current ones forward, do not map them to nothing.

## Recommended strategy: coexisting "diffuse" variant, built additively

v3 was authored as `data-theme="diffuse"` — additive and designed to *coexist* with the current system. Mirror that in the app instead of overwriting `theme.ts` in place:

1. **Introduce a `diffuse` theme variant alongside** the current cream-sticker theme (a new token set + a flag/toggle), rather than mutating existing values. Nothing that ships today breaks.
2. **Build it additively.** Port the 1:1 rows, then ADD the new token categories and helpers. Keep every existing export name and shape; only *add*, never rename/remove.
3. **Migrate behind the flag, mode by mode** (pregnancy → kids → pre-pregnancy), re-authoring primitives and screens for Diffuse. Keep stickers wired as icons throughout.
4. **Flip the default** to diffuse only once all three modes are complete and QA'd.

**Reweighting note:** because this is a language replacement, the bulk of the work is in **Phases 2–3 (re-authoring primitives + screens)**, not Phase 1. Buttons become containerless, selection becomes hairline, cards get gradient fields + grain, type becomes role-driven — these are behavior changes, not color swaps.

---

## The critical first artifact: a token mapping table

Before any code changes, have Claude Code produce a **mapping table** from the current `theme.ts` to v3 values. Everything downstream references this. Do not let it start editing `theme.ts` until the table exists and you've eyeballed it.

Columns: `token (export.path)` · `current value` · `v3 value` · `same shape? (y/n)` · `notes`.
Cover: `brand.*`, `stickers.*` / `stickersDark.*`, `lightTokens.*`, `darkTokens.*`, `radius`, `spacing`, `fontSize`, `font`, `shadows`, `getModeColor`/`getModeColorSoft`.

---

## Phases & checkpoints

| Phase | What | Checkpoint before moving on |
|---|---|---|
| 0 — Import | ✅ Done — v3 saved to `docs/design/design-system-v3.html`, mapping table produced | Table reviewed; decisions locked above |
| 1 — Foundation (additive) | Add a `diffuse` token set to `theme.ts` (new fields/blur/hairline/mono/type-roles + `getModeField()`, care scaffold), add a variant flag; update `DESIGN_SYSTEM.md`, `CLAUDE.md`, `.claude/rules/code-style.md`. Keep stickers active. Do not mutate existing values. | `npx tsc --noEmit` clean; app boots unchanged on the current theme; diffuse variant selectable |
| 2 — Primitives (re-author) | Build Diffuse versions of shared UI: containerless buttons, hairline selection, gradient-field cards + grain, role-driven type. Stickers stay as icons. | Every primitive renders correctly under the diffuse flag |
| 3 — Sweep (per mode) | Behind the flag, mode by mode (preg → kids → pre), re-author each screen + popup to Diffuse; keep sticker icons; kill legacy tokens (`GlassCard`, `shadows.glow*`, gradients-as-buttons) | Mode fully Diffuse under flag; grep clean (see Phase 4) |
| 4 — QA | Verify diffuse across all 3 modes × light + dark | No raw hex / legacy tokens; typecheck clean; screenshots reviewed |
| 5 — Cleanup | Flip diffuse to default, delete the old system (grep-gated), rewrite all docs + memory + skills to the new direction | Old system gone; grep-clean; docs/memory/skills describe Diffuse as canonical |

Commit at the end of each phase so you can roll back a phase without losing the others. (You work on `main` by default — a `design-v3-migration` branch is optional but sensible for a change this size.)

---

## Guardrails — do not let these slip (from `CLAUDE.md` + `DESIGN_SYSTEM.md`)

- Import from `constants/theme.ts` — never hardcode hex / radius / font / shadow. Raw hex is allowed **only** inside sticker/illustration SVG path files.
- Cards `radius.lg`; buttons/pills `radius.full`; inputs `radius.md`. Buttons are filled pills — use `PillButton` / `StickerButton`.
- Shadows only `shadows.card` / `cardPop` / `pop` / `subtle`. Never `shadows.glow*`.
- Mode color via `getModeColor(mode, isDark)` — never hardcode per mode.
- `GlassCard` is dead → `PaperCard`. `GradientButton` → pill buttons. `CosmicBackground` → plain `View` with `colors.bg`.
- Persisted-store screens must gate on `store.hydrated` before rendering data-derived UI.
- If a value isn't in `theme.ts`, stop and ask — don't invent one.

---

## Copy-paste prompts

### Phase 0 — import + mapping (paste into Claude Code)

```
We are migrating grandma.app onto design-system-v3.

1. Using the claude_design MCP (https://api.anthropic.com/v1/design/mcp, auth via /design-login),
   import this project and file:
   https://claude.ai/design/p/4aa7aaa8-28c1-4eb8-88f6-57ef97f27a08?file=design-system-v3.html
   Save the file to docs/design/design-system-v3.html as the canonical visual reference.

2. Read docs/design/design-system-v3.html, constants/theme.ts, DESIGN_SYSTEM.md, and
   .claude/rules/code-style.md.

3. Produce a TOKEN MAPPING TABLE (markdown) mapping the CURRENT theme.ts exports to the v3
   values. Columns: token (export.path) | current value | v3 value | same shape? (y/n) | notes.
   Cover brand.*, stickers.* / stickersDark.*, lightTokens.*, darkTokens.*, radius, spacing,
   fontSize, font, shadows, getModeColor / getModeColorSoft.
   Flag any v3 concept that has NO home in the current token set (new tokens to add), and any
   current token v3 drops (mark "keep, unused" — do NOT delete yet).

STOP after the table. Do not edit any code. I will review the table first.
```

### Phase 1 — foundation, ADDITIVE (paste after you approve the table)

```
Apply Phase 1 (foundation) of the design-system-v3 migration, using the approved mapping table
and docs/design/design-system-v3.html. This is ADDITIVE — do NOT mutate any existing token value
and do NOT rename/remove any export. The current theme must keep working unchanged.

1. In constants/theme.ts, ADD a "diffuse" token set alongside the existing tokens:
   - diffuse light + dark semantic tokens (paper/ink/line scale) per the 1:1 rows in the table.
   - NEW categories that have no current home: gradient-field tokens g1..g4 for each mode
     (pre/preg/kids + care), --d-hairline (light+dark), a blur scale (soft 40 / field 70 /
     glass 18), and grain overlay tokens.
   - font.mono (Space Mono) + type-role tokens (title=serif/Cormorant, read=sans/Hanken,
     data=mono/Space Mono, num-hero=serif). Register the 3 new families for @expo-google-fonts
     loading in app/_layout.tsx (do not remove the current families — stickers/icons and the
     legacy theme still use them).
   - Add getModeField(mode, isDark) -> [g1,g2,g3,g4] and let getModeColor/getModeColorSoft
     accept 'care'. Scaffold care tokens only — NO care screens/tabs/store wiring.
   - Carry current status colors (success/warning/error) and tab/nav tokens forward into the
     diffuse set — v3 leaves these undefined.
   - IMPORTANT: keep stickers.* / stickersDark.* ACTIVE — they remain the icon system under
     Diffuse. Do not mark them unused or remove them.

2. Add a variant flag/toggle so the app can render either the current theme or diffuse (e.g. a
   field on useThemeStore + a switch in dev-panel). Default stays the current theme for now.

3. Update DESIGN_SYSTEM.md, the design section of CLAUDE.md, and .claude/rules/code-style.md to
   document the diffuse variant, the stickers-as-icons decision, and the care-scaffold decision.

4. Run npx tsc --noEmit and fix any type errors you introduced.

Report what changed and confirm: the current theme is byte-for-byte unchanged, the build is
clean, and the diffuse variant is selectable. Do not touch feature/screen components yet.
```

### Phase 2 — primitives (paste after Phase 1 boots clean)

```
Phase 2 — re-author the shared UI primitives for the DIFFUSE variant, matching
docs/design/design-system-v3.html. Gate all Diffuse rendering behind the variant flag so the
current theme is untouched; keep every component's props/API identical.

DESIGN INTENT: cleaner, softer, more aesthetic, cooler. You have license to refine and remake,
not just recolor — improve spacing, hierarchy, and composition; drop clutter; bias toward less.
v3 is the reference vocabulary, not a pixel spec. Stay token-driven and keep sticker icons.
Files: components/ui/PaperCard, PillButton, StickerButton, inputs / FormRow / DatePickerField,
ScreenHeader, the tab bar (app/(tabs)/_layout), and the shared modal/sheet components
(SheetBits, StickerDateModal, PaperAlert, and calendar LogSheet).
Apply the Diffuse behaviors, not just colors:
- buttons become CONTAINERLESS (mono label + arrow, or gradient-glass) — no filled pills, no
  hard-offset shadow, under the flag.
- selection becomes hairline (outline ellipse / ring / dot), not filled sticker chips.
- cards use the gradient-field surface + grain overlay + --d-hairline.
- type is role-driven (title=Cormorant serif, read=Hanken sans, data=Space Mono).
- KEEP stickers as the icon set inside these primitives (badges, stamps, log icons).
Only use tokens from constants/theme.ts. Run npx tsc --noEmit after.
```

### Phase 3 — per-mode sweep (primitives-first; order: KIDS → pregnancy → pre-pregnancy)

> **Decided:** ~134 screens are bespoke (raw `View` + `useTheme()`), so extract a shared Diffuse
> primitive layer (`components/ui/diffuse/`: stat card, section header, date/segment pill, list
> row, circular metric) while migrating the **first** mode (Kids), then reuse it for the others.
> The first-mode prompt should do STEP A (extract primitives) + STEP B (migrate screens); later
> modes mostly reuse the primitives. Template below is the generic per-mode sweep.


```
Phase 3 sweep for the <MODE> journey mode, behind the diffuse variant flag. Go screen by screen
through the <MODE> surfaces (home, agenda/planner, library, vault/analytics, plus every
popup/modal/sheet and button).

DESIGN INTENT: make each screen cleaner, softer, more aesthetic, cooler. You have license to
reflow layouts, drop clutter, retone, and remake components where it improves the screen — not a
literal v3 port. Bias toward less. Preserve all functionality; flag structural/navigation changes
for review before making them.

For each file:
- replace any raw hex with the correct constants/theme.ts diffuse token (or getModeField/
  getModeColor for mode surfaces),
- re-author to Diffuse behavior: containerless buttons (no pills), hairline selection,
  gradient-field surfaces + grain, role-driven type,
- KEEP sticker icons as-is (they remain the icon system),
- remove legacy tokens (GlassCard, GradientButton, CosmicBackground, shadows.glow*, THEME_COLORS,
  Cabinet Grotesk / Satoshi fonts).
Show me a file-by-file diff summary. Run npx tsc --noEmit at the end.
```

### Phase 4 — verification (paste last)

```
Phase 4 verification for the design-system-v3 migration.
1. grep the app/ and components/ trees for violations and list every hit:
   - raw hex: #[0-9A-Fa-f]{3,8}  (exclude sticker/illustration SVG path files listed in
     DESIGN_SYSTEM.md §0)
   - legacy tokens: GlassCard, GradientButton, CosmicBackground, shadows.glow, THEME_COLORS
   - hardcoded font strings: 'Fraunces_, 'DMSans_ used directly instead of font.*
2. Fix any real violations.
3. Run npx tsc --noEmit and the lint config; report results.
4. Give me a manual QA checklist: each of the 3 modes × light + dark, listing the key screens
   and popups to eyeball, so I can walk it on device.
```

### Phase 5 — cleanup + canonicalize (paste LAST, after diffuse is the default and QA passed)

```
Apply Phase 5 (cleanup + canonicalize). Run this ONLY after diffuse is the default, all 3 modes
are complete, and Phase 4 QA passed. Work on a branch and grep-gate every deletion.

1. Make diffuse the only system:
   - Flip the default to diffuse and REMOVE the variant flag, the dev-panel toggle, and all
     coexistence branching so components render diffuse unconditionally.

2. Delete the old design system — but only what is truly unreferenced:
   - Before deleting any token/export/component/font, grep the whole repo (app/, components/,
     lib/, store/) for references. Delete only if there are zero hits.
   - Remove now-unused legacy tokens/exports from constants/theme.ts (old primary/secondary,
     phase/trimester/laborPhases if unused, radius.full if unused, shadows.glow*, old gradients,
     legacy aliases) and delete dead legacy components (CosmicBackground, GradientButton, etc.).
   - Remove the old font families (Fraunces / DM Sans / Instrument Serif) from the
     @expo-google-fonts loading in app/_layout.tsx ONLY if grep shows nothing references them.
   - DO NOT delete: stickers.* / stickersDark.* and components/stickers/* (still the icon system),
     the status colors, or the tab/nav tokens.
   - Run npx tsc --noEmit and a build after deletions; fix any fallout.

3. Update every doc to the new direction as canonical:
   - Rewrite DESIGN_SYSTEM.md so Diffuse IS the design system (not a variant): canvas/paper/ink,
     gradient fields + getModeField, hairline selection, containerless buttons, blur + grain,
     role-driven type (Cormorant / Hanken / Space Mono), stickers-as-icons, care scaffolded.
   - Update the design sections of CLAUDE.md and .claude/rules/code-style.md to match; remove all
     references to the old cream-sticker-collage surface language, filled pills, and old fonts.
   - Update the README.md design section and anything under docs/ and how-to/ describing the old UI.
   - Mark superseded prompt docs (PROMPT_design_system_v4.md, PROMPTS_rebuild_cycle_kids_v4.md,
     PROMPT_studio_type_system.md, DESIGN_AUDIT_cycle_kids.md, and this file): add a "superseded —
     Diffuse shipped" header, or move them to docs/design/archive/.

4. Update Claude's memory + skills:
   - Update any project memory files (CLAUDE.md working memory, memory/ directory) that describe
     the design system so they reflect the Diffuse direction.
   - Update any editable/project skills that reference design language or tokens. For read-only
     plugin skills you cannot edit, LIST them so I can update them in settings.

5. Final report: what was deleted, which docs/memory/skills changed, grep confirmation that no
   old-system references remain, and typecheck/build status.
```

---

## Notes on running it in VS Code

- Add the design MCP once: `claude mcp add` the `claude_design` server, then authenticate with `/design-login` before the Phase 0 prompt.
- Run phases as **separate turns** and let the build/typecheck pass between them — that's what keeps the app shippable at every checkpoint.
- If the design MCP import can't render the file (auth/JS), fall back to opening the v3 URL in the browser and letting Claude Code read it there; the rest of the flow is unchanged.
- Keep `docs/design/design-system-v3.html` in the repo as the reference Claude Code re-reads in Phases 2–3.
