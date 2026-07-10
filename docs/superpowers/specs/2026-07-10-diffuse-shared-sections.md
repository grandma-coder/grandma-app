# Diffuse migration — shared / common sections

**Date:** 2026-07-10
**Scope:** Migrate all mode-agnostic ("common") surfaces onto the Diffuse (v4) design language, flag-gated behind `useThemeStore().variant === 'diffuse'`. Additive, default OFF. Current cream-paper theme unchanged byte-for-byte.
**Directive:** User asked to plan + execute end-to-end without check-ins; review at the end.

## Rules (unchanged from prior Diffuse work)

- Branch with `const diffuse = useIsDiffuse(); const dt = useDiffuseTheme()`. Inline `diffuse ? {…} : {…}` for small deltas; `if (diffuse) return …` for structural.
- Diffuse tokens only: `dt.colors.{ink,ink2,ink3,ink4,line,line2,hairline,bg,surface}`, `diffuseFont.{display,italic,body,mono,monoBold}`, `getModeField(mode,isDark)`, `getDiffuseAccent(mode,isDark)`.
- Primitives: `SoftBloom`, `DiffuseBloomIcon`, `DiffuseSheet`, `DiffuseListRow`, `DiffuseEmptyState`, `DiffuseArrow`, `DiffuseSectionHeader`, `DiffuseSegmentPill`, `DiffuseFieldSurface`.
- Icons: Lucide line icons over soft blooms (stickers stay as the icon system where semantically right, per project rules — but no big decorative sticker heroes / spiky bursts under Diffuse).
- Geometry: hairline over hard-bordered cards; containerless buttons (mono label + arrow); hairline selection (no filled pills).
- Type roles: serif titles + hero numbers, sans reading body, mono labels/data/units.
- Do NOT touch: `constants/theme.ts` (read-only, tokens DONE), the two `diffuse/` primitive files (read + reuse; add a NEW shared primitive only if genuinely needed and note it), Kids/Cycle/Pregnancy mode-owned files (already migrated), pre-existing uncommitted WIP (lib/i18n/*, airtag). Work on `main`, per-file commits with explicit `git add -- <file>`, tsc-clean (`npx tsc --noEmit | grep -v lib/i18n` → 0) after each.

## Current state (grounded scan)

Already fully branched (no work): `PaperCard`, `PillButton`, `StickerButton`, `ScreenHeader`, `PaperAlert`, `HomeGreeting`, and the tab-bar **strip** (`DiffuseStripTabBar` in `app/(tabs)/_layout.tsx`).

Still cream under Diffuse — the work list:

### Tier 1 — chrome + primitives (highest leverage, on every screen)
1. `app/(tabs)/_layout.tsx` — center **FAB** (`Burst` coral sticker + Plus) and the **quick-add fan menu** (sticker tiles + confetti). The tab strip already branches; only the FAB + fan don't.
2. `components/ui/NotificationBell.tsx`
3. `components/ui/SavedToast.tsx`
4. `components/ui/BrandedLoader.tsx`
5. `components/ui/EmptyState.tsx` (shared, non-Diffuse variant used across screens)

### Tier 2 — profile chrome (renders on the shared profile/home surfaces)
6. `components/home/ModeSwitcher.tsx`
7. `components/profile/ProfileHero.tsx`
8. `components/profile/BadgesStrip.tsx`
9. `components/profile/MyJourneyPillGrid.tsx`

### Tier 3 — shared cross-mode screens (small/medium)
10. `app/(tabs)/settings.tsx`
11. `app/profile/account.tsx`
12. `app/profile/badges.tsx`
13. `app/profile/notifications.tsx`

### Tier 4 — large shared standalone screens
14. `components/chat/GrandmaTalk.tsx` (chat)
15. `app/daily-rewards.tsx`
16. `app/leaderboard.tsx`
17. `app/paywall.tsx`
18. `app/profile/care-circle.tsx` (largest; care-circle is cross-mode)

## Approach

Execute Tier 1 → 4 in order. Small/high-leverage first so the app *feels* Diffuse everywhere fast, then the big screens. tsc-clean + commit per file. Screenshot-verify a representative sample at the end (needs Diffuse ON), then hand the full diff to the user.

**FAB treatment (the one design decision worth stating):** under Diffuse the spiky coral `Burst` becomes a calm circular node — `dt.colors.surface` fill, hairline `dt.colors.line2` border, a soft `SoftBloom` in the active mode accent behind it, and the `Plus` in `dt.colors.ink`. The quick-add fan tiles become hairline chips with Lucide line icons over blooms (no sticker confetti). This kills the single most-visible cream element on every Diffuse screen.

## Non-goals

- No behavior/logic changes; visual variant only.
- No changes to the current (cream) rendering.
- No new tokens; if a shared primitive is genuinely missing, add it to `DiffusePrimitives.tsx` and note it in the final summary.
