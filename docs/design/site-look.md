# Site look (Nov 2026) — the app restyled to match grandma.app

The cream/sticker design (`variant: 'current'` in code) is restyled to the marketing site's look and is the
default again. Diffuse is off (Dev Panel only). Reference: the phone demo on https://v0-grandma.vercel.app.

## Already done in the foundation (don't redo)
- `constants/theme.ts`: `font.display` / `font.italic` = Architects Daughter (hand-lettered, single weight);
  `font.body*` = Hanken Grotesk; `font.displayBold` = Hanken 700 (big numbers). Light tokens: `bg #FBF6EA`,
  `surface #FFFFFF`, `text #161513` (ink), `textSecondary #4F4B43`, `textMuted #8C877C`, `textFaint #B3AC9C`.
  `primary` is ink. Journey tones via `getModeColorSoft(mode)` (fills) and `getModeAccent(mode)` (strong marks).
- `components/stickers/SiteSticker.tsx`: the site's 56 stickers as PNG. `<SiteSticker name="heart" size={32} cut />`.
- Tab bar, `PaperCard`, `PillButton`, `QuietPill`.

## The rules (light mode; leave dark-mode values alone unless trivially symmetric)
| Element | Site look |
|---|---|
| Card | white `colors.surface`, **1.5px ink border** (`colors.text`), radius 18, hard shadow `{ shadowColor: colors.text, shadowOffset: {width:0,height:2}, shadowOpacity: 0.1, shadowRadius: 0 }` |
| Hero/feature card | fill = `getModeColorSoft(mode)` (pastel tone), same ink border |
| Chip / small pill | white, 1.5px ink border, radius 999, label Hanken 700 13px ink, optional 24px sticker before the label. Selected/logged: fill = journey tone (`getModeColorSoft`) |
| Segmented / toggle on | ink fill, white label |
| Primary button | `PillButton variant="ink"` (ink pill, white bold label) |
| Section title | `font.display`, `textTransform: 'uppercase'`, ~17–20px, ink, `letterSpacing: 0.2` (never negative — the hand face is already tight) |
| Screen/hero title | `font.display` uppercase, 26–32px |
| Eyebrow / meta label | Space Mono (`'SpaceMono_400Regular'`), 10–11px, uppercase, letterSpacing 1.4, `colors.textMuted` |
| Body | Hanken (`font.body`), 14–16px, `colors.textSecondary` for secondary copy |
| Text field | white, 1.5px ink border, radius 14, Hanken 16px (≥16 so iOS doesn't zoom); notes: dashed border |
| Sheet | `colors.bg` background, 2.5px ink top border, radius 26 top corners, grabber ink 25% opacity |
| Close (✕) button | 34px circle, 2px ink border, white |
| Selected tile | tone fill, rotate -1.5deg, scale 1.04, ink check badge top-right |
| Big numbers | `font.displayBold` (Hanken 700) |
| Icons | Prefer `SiteSticker` where one matches (house, cal, bars, me, eye, flower, heart, baby, baby2, moon, moon2, star, drop, bottle, diaper, zz, thermo, brain, syringe, ruler, shoe, flame, bell, lock, pencil, doc, books, camera, globe, bubble, cloud, crib, bodysuit, stroller, backpack, phone, pola, house, owl, leaf, egg, otest, corn, rasp, plum, avocado, banana, eggplant, jicama, lettuce, pumpkin, us, br, face1–face4 moods). Otherwise keep the existing icon. |

## Constraints
- Edit only the **non-diffuse** branch (`if (diffuse) … else …` / `diffuse ? … : …`). Never change Diffuse code paths.
- No logic, data, navigation or copy changes — styling only.
- No raw hex in components except where the file already does it; prefer tokens (`colors.*`, `getModeColorSoft`, `getModeAccent`).
- Keep layouts that work; don't restructure screens. Keep text from overflowing — Architects Daughter is wider than
  Fraunces: if a title is in a tight row, reduce its size a little rather than letting it wrap badly.
- `npx tsc --noEmit` must pass.
