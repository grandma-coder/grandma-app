# Diffuse Auth + Onboarding — Design Spec

**Date:** 2026-07-10
**Status:** Approved (design), pending implementation plan
**Reference (source of truth):** [`docs/design/Onboarding.html`](../../design/Onboarding.html) (+ `docs/design/onboarding-tokens-v3.css`)

---

## 1. Goal

Bring the entire **auth + onboarding** flow onto the **Diffuse (v4)** design variant, matching the `Onboarding.html` reference **frame-by-frame**. This is the same additive, flag-gated migration we've done for every behavior surface (Kids home/agenda/analytics, Cycle home/analytics) — extended to the pre-app screens.

Success = with Dev Panel → DESIGN VARIANT set to **Diffuse**, every auth and onboarding screen renders in the v4 language looking like its `Onboarding.html` frame; set to **Current**, every screen renders the existing cream-paper design byte-for-byte unchanged.

## 2. Hard constraints

1. **One flag drives everything.** Auth + onboarding read the *same* `useIsDiffuse()` (`useThemeStore().variant === 'diffuse'`, set in Dev Panel) that every behavior surface uses. No separate toggle. The flag is mode-independent, so it works on pre-login/pre-mode screens.
2. **Additive / flag-gated.** Each screen gets an `if (diffuse) return <Diffuse/>` branch (or `diffuse ? … : …` at the wrapper). The current cream-paper path stays intact in the else branch — no behavioral change when the flag is off.
3. **No data/flow logic changes.** Every screen keeps its exact current state, validation, Supabase writes, auth calls, and navigation. Only the render path is added. Diffuse pickers feed the *same* values the current inputs do.
4. **Match look, not invent flow.** Where the HTML shows a step/field the live RN screen doesn't have (or vice-versa), keep the RN screen's actual data/steps and apply the HTML's visual treatment per input type. Divergences are flagged in the plan, never resolved by inventing data.
5. **Maximum fidelity.** Reproduce each picker as close to the reference as RN allows — including real gesture physics (arc-spin dial) and an SVG metaball approximation. No simplified stand-ins.
6. **Reference pinned in-repo.** Build against `docs/design/Onboarding.html`, not the Downloads copy.
7. **Cross-session hygiene.** `git restore --staged .` before each commit; stage only explicit paths; never `git add -A`. Some cycle files are owned by a parallel session — do not touch `lib/cycle*.ts` or other session WIP.

## 3. Aura mode (per-screen, explicit)

Auth/onboarding run before a journey mode exists, so the aura palette is passed **explicitly per screen**, not read from `useModeStore`:
- **Auth screens** → `pre` (cycle) palette, per the HTML (`data-mode="pre"`).
- **Journey picker** → all four behavior blooms (cycle/preg/kids/care).
- **Cycle onboarding** → `pre`; **Pregnancy** → `preg`; **Kids** → `kids`.

Field palettes come from the existing `getModeField()` / diffuse field tokens.

## 4. Architecture

```
Variant flag (Dev Panel) ── useIsDiffuse() ──┬─ auth screens (6)
                                             ├─ OnboardingStep wrapper (flag-branched)
                                             └─ onboarding screens (journey + 3 flows)
                                                        │
                        shared foundation ──────────────┤
                        (AuraField, containerless CTA/OAuth, shell)
                                                        │
                        per-screen primitives ──────────┘
                        (DotCalendar, BloomChips, SegmentedBloom, ChoiceTimeline,
                         AvatarBloomGrid, BlobPicker, PoleField, OrbitPicker,
                         MetaballBloom, ArcDial, bare fields)
```

## 5. Build approach — tiny foundation, then screen-by-screen vs HTML

**Phase 0 — shared foundation (build + verify first, used by every screen):**
- `AuraField` — soft grainy per-screen gradient background. RN build: `<View>` + N `SoftBloom`s at the corners the frame's `--aura` specifies + `DiffuseGrain`. Props: `blooms: {color, cx, cy, opacity}[]`, `grain?`, `dark?`. Each screen supplies its exact recipe read from its HTML frame.
- Containerless actions (`DiffuseKit`/new `DiffuseActions.tsx`):
  - `DiffuseSolidCTA` — `.solid`: mono uppercase label + arrow on a top hairline, no fill.
  - `DiffuseOAuthRow` — `.pillbtn.oauth`: mono row on a bottom hairline + leading brand glyph.
  - `DiffuseTextLink` — `.txtlink`: centered muted mono ("SKIP FOR NOW").
- Shell: flag-branch `OnboardingStep` → Diffuse shell = `AuraField` bg + `.ob-head` (hairline circular back + mono step label "CYCLE · 03 / 08") + progress hairline bar + serif question (`diffuseFont.displayLight` + italic accent) + `DiffuseSolidCTA` pinned bottom. No sticker slot. Matching inline shell for the auth screens.

**Then, screen-by-screen in HTML order**, each matched to its exact frame; extract each picker the first time a screen needs it, then reuse.

## 6. Primitive inventory (extracted per-screen, then reused)

Straightforward (SVG/layout):
- **`DotCalendar`** — `.dotcal` dot grid; selected = accent ring + `SoftBloom`, period days = accent dot. *(extend existing `DiffuseDotCalendar` from Kids)*. → last-period, due-date, birthday.
- **`BloomChips`** — `.chips` hairline mono pills; `.on` = firm border + inner highlight; "Other +" reveal → bare input; single/multi, "None" exclusive. → period-length, supplements, conditions, allergies, country-popular.
- **`SegmentedBloom`** — `.seg` hairline mono segmented. → regular?, temp-unit.
- **`ChoiceTimeline`** — `.choice` connector line + ring/icon nodes, selected wrapped in outline-ellipse. → add-caregiver.
- **`AvatarBloomGrid`** — `.avgrid`/`.av` 4-col bloom circles + thin glyph, selected = ink ring. → kids avatar.
- **Bare fields** — `.field`/`.authfield` underline input + `.field-lab` mono label + `.divider`. → all name/email/password.

Answer-graphs (SVG blooms + tap-select):
- **`BlobPicker`** — `.blobpick` free bloom circles, mono kicker + serif-italic name, selected scales/brightens. → journey picker.
- **`PoleField`** — `.polefield` two blooms + connecting line, binary. → temp-tracking?, first-pregnancy?.
- **`OrbitPicker`** — `.orbit` dashed ellipse ring + 4 dot-nodes. → trying-duration, birth-place, care-provider.
- **`MetaballBloom`** — `.bloom` multi-select metaball cluster; RN build = SVG `<FeGaussianBlur>` + `<FeColorMatrix>` goo approximation, overlaid labels, dot-marker toggle. **First plan task must verify the installed `react-native-svg` version supports these filter primitives on iOS + Android**; if not, fall back to overlapping `SoftBloom` discs (same clustered-bloom feel, no hard goo edge). → cycle conditions, pregnancy feelings.

Hardest (gesture physics):
- **`ArcDial`** — `.arcpick` arc-scroll number dial: numbers on a circular path (trig), `PanResponder` drag→index, snap on release, center = big serif value + mono unit. Same mechanic as existing journey rings. → cycle-length, kid-count.

Auth-specific:
- **`DiffuseOAuthRow`** (above) + animated grandma eye-logo (reuse existing `GrandmaLogo`, restyled) on welcome / all-set.

Total: ~11 primitives + shell.

## 7. Screen inventory (~26)

**Auth (6)** — `app/(auth)/`: welcome, sign-in, sign-up, forgot-password, reset-password (+ welcome variant). Same `signInWithApple`/`signInWithGoogle`/Supabase calls; only chrome changes.

**Journey (2)** — `app/onboarding/journey.tsx`: blob-picker (Cycle/Pregnancy/Kids/Circle) + "all set" screen. Same mode/behavior selection writes.

**Cycle (8)** — `app/onboarding/cycle/index.tsx`: last-period (DotCalendar) · cycle-length (ArcDial) + regular? (SegmentedBloom) · period-length (BloomChips) · conditions (MetaballBloom) · temp-unit (SegmentedBloom) · trying-duration (OrbitPicker) · temp-tracking? (PoleField) · supplements (BloomChips). Same `useCycleOnboardingStore` → Supabase.

**Pregnancy (7)** — `app/onboarding/pregnancy/index.tsx`: due-date (DotCalendar) · first-pregnancy? (PoleField) · feeling (MetaballBloom) · birth-place (OrbitPicker) · care-provider (OrbitPicker) · conditions (BloomChips) · add-partner (bloom avatar + field + invite). Same `usePregnancyOnboardingStore`.

**Kids (9)** — `app/onboarding/kids/index.tsx`: how-many (ArcDial) · child-name (field) · birthday (DotCalendar) · country (search + BloomChips) · avatar (AvatarBloomGrid) · allergies (BloomChips) · conditions (BloomChips) · add-partner · add-caregiver (ChoiceTimeline). Same `useKidsOnboardingStore`; multi-child loop preserved.

> The actual live step counts/fields per screen must be re-read from the current RN files during the plan; the counts above mirror the HTML. Where they differ, the RN flow wins (constraint #4).

## 8. Files touched

- **New:** `components/ui/diffuse/AuraField.tsx`, `DiffuseActions.tsx` (or additions to `DiffuseKit.tsx`), and the ~11 primitive components (some may live in `DiffusePrimitives.tsx`).
- **Edited (additive diffuse branches only):** `components/onboarding/OnboardingStep.tsx`; `app/(auth)/*.tsx` (6); `app/onboarding/journey.tsx`, `app/onboarding/cycle/index.tsx`, `app/onboarding/pregnancy/index.tsx`, `app/onboarding/kids/index.tsx`.
- **Reference (committed):** `docs/design/Onboarding.html`, `docs/design/onboarding-tokens-v3.css`.
- **Reuse:** existing `SoftBloom`, `DiffuseGrain`, `DiffuseDotCalendar`, `GrandmaLogo`, `useDiffuseTheme`, `diffuseFont`, `getDiffuseAccent`, `getModeField`.

## 9. Testing / verification

- `npx tsc --noEmit` clean of non-i18n errors after every screen.
- Per screen: visual match against its `Onboarding.html` frame (simulator when free) — current cream-paper path unchanged (flag off), Diffuse path matches the frame (flag on).
- Flag round-trip: toggling Dev Panel variant swaps the whole flow with no residual cream-paper leaks under Diffuse and no Diffuse leaks under Current.
- No new i18n keys unless a screen genuinely needs one; reuse existing keys/strings.

## 10. Out of scope

- Behavior/home/analytics surfaces (already migrated).
- Any change to auth logic, Supabase schema, onboarding data model, or navigation graph.
- The `care` (Caregiver) onboarding flow beyond the journey-picker option (Caregiver mode is scaffold-only per project rules) — the picker shows the Circle bloom, but no caregiver step-flow is built.
