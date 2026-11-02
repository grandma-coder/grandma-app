# Site-look restyle — brief for agents

Worktree: `/Users/igorcarvalhorodrigues/Projects/grandma-app-sitelook`. Work only there. No git commands, no Metro/simulator.
Edit ONLY the files listed in your task. Do NOT edit `lib/i18n/*` (other agents run in parallel) — reuse existing keys; if a new string is unavoidable, use an English literal like the file already does.
Every Diffuse path (`if (diffuse)`, `diffuse ? … : …`, `useIsDiffuse()` branches) stays exactly as is — change only the light (non-diffuse) rendering. No logic, data, save or navigation changes. Keep `useGrandmaChatEnabled()` / `useDailyRewardsEnabled()` gating untouched.

Read `docs/design/site-look.md` first.

## The user's rules (strict)
- Calm and clear, never overwhelming. One hero number + quiet rows + hairline dividers beats stacks of coloured boxes.
- Clean ink outlines (`colors.text`, 1.5px). NO hand-wobble (`HandDrawnPill` wobble is opt-in, leave it off) except signature buttons that already have it. NO tilted cards.
- When a sticker/icon carries an item, it needs no card around it (card-less sticker + label).
- Ink text everywhere. Never tone-coloured text on a tone fill. No solid blue/grey/purple filled buttons with white text.
- Selected state = soft tone fill (`getModeColorSoft(mode)` / `stickers.*Soft`) + ink outline + ink label (+ optional tick).
- Type: titles `font.display` UPPERCASE letterSpacing ~0.3; eyebrows Space Mono (`'SpaceMono_400Regular'`) 10px uppercase letterSpacing 1.4 muted; body Hanken (`font.body*`); big numbers `font.displayBold`.
- Icons: Site stickers (`components/stickers/SiteSticker.tsx`, `<SiteSticker name size cut? />`) instead of Lucide/emoji/old Character/BrandStickers where one clearly fits. Names: avocado baby baby2 backpack banana bars bell bodysuit books bottle br brain bubble cal camera cloud corn crib diaper doc drop egg eggplant eye face1(sad) face2(neutral) face3(smile) face4(grin) flame flower globe heart house jicama leaf lettuce lock me moon moon2 otest owl pencil phone plum poop pee pola pumpkin rasp ruler shoe star stroller syringe thermo zz. NEVER `us` (it's a US flag). Keep chevrons / × as icons.
- iOS can't draw dashed borders — remove `borderStyle: 'dashed'`.
- Dates: no spinner wheels for dates. One-tap day strip (see `DateChip` light branch in `components/calendar/KidsLogForms.tsx`) or `DateTimePicker display="inline"` month calendar. Time pickers may keep the wheel.
- Charts: light and legible, ink axis text, soft-tone bars with ink outline, true values in labels, cap absurd outliers visually but print the real number. Say whether a number is a total or a per-day / per-week average.

## Reusable pieces (import, don't modify)
- `components/ui/SiteChoice.tsx` — `SiteChoice` (pill, `compact`, `tick`, `sticker`, `sub`, `align`, `wobble`), `SiteStepper`.
- `components/calendar/QuickLogKit.tsx` — `StickerChoice` (card-less sticker option), `ChoiceStep`, `MoreSection`.
- `components/calendar/LogSheet.tsx` — `LogSheet` (has `sticker` prop for the title) and `SheetFooterAction` (wrap a form's save so it's pinned in the sheet footer, always visible).
- `components/ui/AuthDock.tsx` — `EyeAction` (+ `ACTION_TONES`): the save disc, e.g. `<EyeAction label={…} onPress ink={colors.text} loading disabled sticker="pencil" fill={ACTION_TONES.yellow} size={64} />`.
- `components/ui/DetailSheetHeader.tsx` — sticker disc + uppercase title + child/tag + hand close.
- `components/ui/InkBackButton.tsx` — back / close (`icon="close"`).
- `components/ui/LogDock.tsx` — tab-bar-style sticker launchers. `components/ui/StickerTileGrid.tsx` — shortcut tile grid.
- `components/ui/Motion.tsx` — `FadeUp` (stagger), `StickerEnter`, `useIdleSway`.
- `components/ui/HandDrawn.tsx` — `HandDrawnPill`/`HandDrawnBox` (clean outline by default).
- Kids references already done: `components/home/kids/KidsHeroTiles.tsx`, `components/home/kids/FeedingDetailCalm.tsx`, `components/home/KidsWallet.tsx` (light branch → StickerTileGrid), `components/home/kids/KidsTodaySummaryCard.tsx` (light → LogDock).

## Done when
`npx tsc --noEmit` shows no errors in your files (ignore errors in files other agents are editing) and `npx jest --silent` passes. Report: short bullets per file/section + anything left undone.

## Loading (always visible)
- While data is loading, never show provisional or empty data ("—", "Not enough data yet", "Tap to log", a fake cycle day) and never "Loading…" text.
- Use `components/ui/Skeleton.tsx`: `Skeleton`, `SkeletonLines`, `SkeletonBars`, `SkeletonRing`, `SkeletonRow`, `SkeletonPage`. Shape the skeleton like the content that's coming.
- Only on FIRST load (no cached data yet): `isLoading && !data`. Background refetches keep showing the current data.
- Empty state is different from loading: once loaded with no data, show the existing empty state.

## Fonts
- Titles: `font.display` (Architects Daughter) uppercase. Body/labels: Hanken (`font.body*`). Eyebrows: `'SpaceMono_400Regular'`. Big numbers: `font.displayBold`.
- Never leave a text style without a fontFamily; `lib/fontDefaults.ts` backs up StyleSheet styles but inline styles must set it.

## Parallel agents and i18n (when told to use a handoff file)
- Do NOT edit `lib/i18n/*`. Use `t('your_key')` in code and write every new key to your handoff JSON file
  (path given in your task) as `{ "your_key": { "en": "...", "pt-BR": "...", "es": "...", "fr": "...", "de": "...", "it": "...", "ja": "...", "ko": "...", "zh": "...", "ar": "...", "hi": "...", "tr": "..." } }` with real translations and identical `{{params}}`.
- `tsc` will fail on unknown keys until the controller merges them — that's expected; report it, everything else must typecheck.
- Wording rules from `docs/compliance/2026-11-02-regras-saude.md` apply: no diagnosis, no grades/scores, no "normal", no treatment advice, no contraception claims.
