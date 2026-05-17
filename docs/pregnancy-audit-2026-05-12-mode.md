# Pregnancy-Mode Consistency Audit — 2026-05-12

How well every surface adapts to `useModeStore` mode = `'pregnancy'`. Findings ranked high/med/low.

---

## Tab bar — `app/(tabs)/_layout.tsx`

- **HIGH** — `app/(tabs)/_layout.tsx:66` — Tab label `t('tab_calendar')` is hardcoded for the `agenda` tab regardless of mode. `getModeConfig(mode).tabs.agenda.label` is correct in `modeConfig.ts` but never read by the tab bar. Spec: pregnancy = "Agenda", pre-pregnancy = "Planner".
- **HIGH** — `app/(tabs)/_layout.tsx:384–389` — Tab icon sticker colors are fixed (`yellow`, `blue`, `green`, `lilac`). Active tab tint should drive from `getModeColor(mode, isDark)`. Currently identical across all three modes.
- **HIGH** — `app/(tabs)/_layout.tsx:444–454` — Active state visual is never mode-driven. Pregnancy / pre-pregnancy / kids look the same.
- **MED** — Vault tab label hardcoded `t('tab_analytics')` in `TAB_CFG`; pregnancy spec says "Documents". Never reads `getModeConfig(mode).tabs.vault.label`.

## Library tab — `app/(tabs)/library.tsx`

- **HIGH** — `app/(tabs)/library.tsx:165, 228–426` — Entire screen is the legacy neon-dark surface. Wraps in `CosmicBackground`. Uses `#FFFFFF` text, `THEME_COLORS.yellow`, `rgba(200,180,255,0.6)` subtitles, `rgba(255,255,255,0.05)` bubbles, `colors.neon.blue` selection. Imports `colors, THEME_COLORS, typography, spacing, borderRadius` from legacy exports. Visual regression on cream-paper for the entire pregnancy library.
- **HIGH** — `app/(tabs)/library.tsx:131–148` — Pillar chips read from `modeConfig.pillars` (correct), but the chip styling is `rgba(255,255,255,0.05)` background / `rgba(255,255,255,0.1)` border. Not mode-aware.
- **MED** — `app/(tabs)/library.tsx:125` — `GrandmaBall` renders with `THEME_COLORS.blue` → `THEME_COLORS.pink` gradient. No mode prop, no `useModeStore` read; always the same gradient regardless of journey.
- **LOW** — `app/(tabs)/library.tsx:176` — Subtitle hardcoded as inline 3-way ternary on `mode`; should be driven by `modeConfig.aiContextLabel`.

## GrandmaBall — `components/home/GrandmaBall.tsx`

- **HIGH** — `components/home/GrandmaBall.tsx:4, 56, 75` — Imports `colors` (legacy, dark-pinned). `colors.surfaceLight = darkTokens.surfaceRaised`, `colors.background = darkTokens.bg`. In cream-paper light mode renders with dark inner ring and near-black border. No `useModeStore` read; gradient never mode-driven.

## PregnancyUserReminders — `components/home/pregnancy/PregnancyUserReminders.tsx`

- **MED** — `components/home/pregnancy/PregnancyUserReminders.tsx:50` — Module-level `ACCENT = brand.pregnancy`. Pregnancy-only component so mode is implicit, but constant ignores dark mode (returns `#B7A6E8` light always; should be `#C4B5EF` in dark). Used at 12+ sites.

## Pregnancy calendar + log forms

- **MED** — `components/calendar/PregnancyCalendar.tsx:381, 472, 1097, 1223, 2231` — `brand.pregnancy` used directly. Should use `getModeColor('pregnancy', isDark)` or equivalent.
- **MED** — `components/calendar/PregnancyLogForms.tsx:151, 164, 261, 267, 272, 359` — Same pattern.

## AI chat context — `lib/grandmaChat.ts` + `supabase/functions/grandma-chat/index.ts`

- **HIGH** — `lib/grandmaChat.ts:64–78` — `ChatContext` interface has no `weekNumber` or `dueDate`. `GrandmaTalk.tsx` assembles context without them. `grandma-chat` therefore never receives the current pregnancy week, so its prompt always falls back to the branch without a week (`'The user is pregnant.'`). Grandma's week-specific advice is generic instead of personalised, even though `usePregnancyStore` has the due date.
- **MED** — `lib/grandmaChat.ts:70` — `nana-chat` fallback path hardcodes `weekNumber: null`.
- **MED** — `supabase/functions/grandma-chat/index.ts:73` — `sinceDate` for log retrieval uses `toISOString().split('T')[0]` (UTC). Evening logs west of UTC missed in the 7-day pregnancy window.

## Vault tab

- **LOW** — `app/(tabs)/vault.tsx:31` — `showFloatingExams = mode !== 'pregnancy'` is functionally correct (pregnancy uses PregnancyAnalytics' own handler), but vault tab label issue lives in tab layout.
- **MED** — `lib/modeConfig.ts:47` — `PRE_PREGNANCY_CONFIG.vault.visible = true`. CLAUDE.md states "Vault tab is hidden in pre-pregnancy mode." Never hidden in practice. Affects pregnancy users when they switch back.

## Onboarding transition

- **LOW** — `app/onboarding/transition.tsx:30` — `BEHAVIOR_CONTENT.pregnancy.color = brand.pregnancy`. Always the light-mode value. Use `getModeColor('pregnancy', isDark)`.

---

## Top 10 Priority List

1. **Library tab still neon-dark legacy UI** — full port to cream-paper tokens. `app/(tabs)/library.tsx` throughout.
2. **`grandma-chat` never receives pregnancy week** — `lib/grandmaChat.ts:ChatContext` needs `weekNumber`/`dueDate`; `GrandmaTalk.tsx` needs to read from `usePregnancyStore` and pass them; `grandma-chat/index.ts` needs to consume them.
3. **`GrandmaBall` uses dark-pinned legacy `colors` export** — wrong surface in light mode everywhere it's rendered. `components/home/GrandmaBall.tsx:4,56,75`.
4. **Tab bar labels hardcoded, not read from `modeConfig`** — pregnancy sees "Analytics" instead of "Documents". `app/(tabs)/_layout.tsx:384–389`.
5. **Vault tab not hidden in pre-pregnancy mode** — `modeConfig.ts:47` sets `vault.visible: true`.
6. **Tab active color never mode-driven** — all tab stickers use static palette; should use `getModeColor(mode)`. `app/(tabs)/_layout.tsx:444–454`.
7. **`brand.pregnancy` used without dark-mode correction** across `PregnancyCalendar`, `PregnancyLogForms`, `PregnancyUserReminders`. ~20 sites.
8. **`nana-chat` fallback always passes `weekNumber: null`** — `lib/grandmaChat.ts:70`.
9. **`grandma-chat` edge function uses UTC date for pregnancy log window** — `supabase/functions/grandma-chat/index.ts:73`.
10. **`app/(tabs)/library.tsx` agenda tab subtitle uses inline ternary not `modeConfig`** — driven from copy strings rather than centralized config.
