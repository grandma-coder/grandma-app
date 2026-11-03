# Site v3 (app demo + waitlist) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the rev-2 landing page with the approved v3 page: a working app demo in an iPhone frame, hand-drawn sticker language, one email field per screen, worldwide launch.

**Architecture:** Server-rendered Next.js page shell with client islands. The demo is a client component tree driven by one pure reducer over typed, per-locale seed data. Stickers are one SVG path table rendered by a `<Sticker>` component. Every email field posts to the existing `submitWaitlist` server action.

**Tech Stack:** Next.js 16 (app router, `proxy.ts`), React 19 (`useActionState`, `useReducer`), next-intl 4, Tailwind 4 (page chrome) + CSS modules (demo), zod 3, Vitest, Playwright (QA script only).

**Spec:** `docs/superpowers/specs/2026-10-30-site-v3-app-demo-design.md`. Design source: `docs/mockups/2026-10-30-app-site.html` (the mockup wins on markup, CSS, motion and demo content).

## Global Constraints

- Locales `en`, `pt`; every visible string comes from `messages/{en,pt}.json` or `lib/demo/data.{en,pt}.ts`; `npm run i18n:check` must pass.
- No "Brazil first" / country-order copy anywhere. Country is never shown to the visitor.
- DB mode keys stay `pre | preg | kids | meno`; `pre` is labelled "Ciclo" / "Cycle".
- Fonts: Hanken Grotesk (UI/body), Space Mono (data labels), Architects Daughter (hand-lettered caps headings, rebus, sticker labels). Load with `next/font/google`.
- Colours (from the mockup `:root` and `C`): bg `#F3F0E8`, paper `#FBF9F3`, app `#FBF6EA`, ink `#161513`, ink-2 `#4F4B43`, ink-3 `#8C877C`; stickers pink `#F4A6C9`, yellow `#F9C846`, blue `#8DB6F2`, orange `#F37A3B`, green `#1E8A6A`, red `#EC4B3C`, lilac `#B69CF2`, peach `#F7C9A6`, mint `#9ED8B0`, cream `#FFF8E6`.
- No gradient fields, no blur blobs (the pregnancy fruit/week UI and charts are flat).
- Visitor-typed text (chat, comments, log notes) is rendered as React text, never as HTML.
- `prefers-reduced-motion: reduce` disables animations and transitions.
- Commits: one per task, conventional type prefix; never push.

## Review Focus

1. 320 px wide phones: no horizontal overflow anywhere (rebus, phase switch, sticker sheet, footer, Explorar grid). Test pins it in Task 12.
2. The site's black bar must never overlap the phone's tab bar on iPhone SE / 13 / 14 Pro Max / Pixel 7 while scrolling. Test in Task 12.
3. Submitting any email field while another is mid-edit: all fields flip to joined; a failed submit keeps the typed email and shows the error under that field only. Test in Task 9.
4. Switching phase while a sheet is open closes the sheet and keeps logs per phase. Reducer test in Task 5.
5. Switching locale keeps the demo usable (seed data swaps; no stale PT strings on /en). Test in Task 4 (shape parity) and Task 12 (walk on /en).

---

### Task 1: Country goes global (site)

**Files:** Modify `lib/countries.ts`, `lib/countries.test.ts`, `lib/waitlist/schema.ts`, `lib/waitlist/schema.test.ts`, `lib/waitlist/types.ts`, `lib/waitlist/action.ts`, `lib/waitlist/submit.ts` (+ its test).

**Interfaces — Produces:** `type Country = string` (`'OTHER'` or `/^[A-Z]{2}$/`); `countryFromGeo(header: string | null | undefined): Country`; `waitlistSchema` without `country`; `submitWaitlist(prev, formData)` reads the header itself and passes the country to the RPC; `WaitlistResult` success no longer returns `country`.

- [ ] Tests first: `countryFromGeo('br') === 'BR'`, `('DE') === 'DE'`, `('xx1') === 'OTHER'`, `('') === 'OTHER'`, `(null) === 'OTHER'`; schema accepts a payload with no `country`; action passes `'FR'` when the header is `FR`.
- [ ] Implement; delete the locale fallback (`pt → BR`).
- [ ] `npm test && npm run typecheck`; commit `feat(waitlist): capture country from geo, any ISO code`.

### Task 2: Command center follows (repo `grandma-command-center`, branch `feat/waitlist-pillar`)

**Files:** `migrations/0018_waitlist.sql`, `db/schema/center.ts`, `lib/waitlist.ts`, `server/routers/waitlist.ts`, their tests, `app/(app)/waitlist/*` filter UI.

- [ ] Migration (not applied anywhere yet, edit in place): `country TEXT NOT NULL DEFAULT 'OTHER' CHECK (country = 'OTHER' OR country ~ '^[A-Z]{2}$')`; header comment: worldwide launch; RPC unchanged.
- [ ] Drop `WAITLIST_COUNTRIES`; filter schema `country: z.string().regex(/^([A-Z]{2}|OTHER)$/).optional()`; UI filter becomes a text/select of codes present in `stats.byCountry`.
- [ ] Tests updated; `pnpm test && pnpm typecheck`; commit `feat(waitlist): accept any ISO country`. Do not apply the migration (Igor applies it).

### Task 3: Fonts, tokens and the sticker library

**Files:** Modify `app/[locale]/layout.tsx`, `app/globals.css`. Create `components/stickers/paths.ts`, `components/stickers/sticker.tsx`, `components/stickers/filters.tsx`, `components/stickers/sticker.test.tsx`.

**Interfaces — Produces:** `type StickerName` (union of every key in the mockup `I` object, including `cal bars me baby2 owl corn rasp plum avocado banana eggplant jicama lettuce pumpkin crib bodysuit books camera globe otest leaf egg moon2`); `<Sticker name={StickerName} cut?: boolean className?: string style?: CSSProperties />` rendering `<svg viewBox="-6 -6 76 76" aria-hidden>` with `filter="url(#wob)"` (and `#cut` when `cut`); `<StickerFilters />` (the two `<filter>` defs, mounted once in the layout).

- [ ] Port the mockup `C`, `S` and `I` objects (`const C = {` … end of `I`) to `paths.ts` as JSX-free SVG markup strings; render them with `dangerouslySetInnerHTML` inside `<Sticker>` (static, trusted, no user input).
- [ ] Test: every `StickerName` renders an `<svg>` with non-empty markup.
- [ ] Layout: add Architects Daughter; mount `<StickerFilters />`; tokens from Global Constraints into `globals.css`; remove Diffuse field tokens.
- [ ] Commit `feat(site): hand-drawn sticker library and v3 tokens`.

### Task 4: Copy and demo seed data (EN + PT)

**Files:** Modify `messages/en.json`, `messages/pt.json`. Create `lib/demo/types.ts`, `lib/demo/data.pt.ts`, `lib/demo/data.en.ts`, `lib/demo/data.test.ts`.

**Interfaces — Produces:** `DemoData` type with `phases: Record<Mode, Phase>`, `kids`, `weeks`, `msgs`, `replies`, `village`, `growth`, `vax`, `optIcons`, `rangeVis`, `feats`, `cyc`; `Phase` exposes `hero(goal)`, `chips(goal)`, `quick(goal)`, `chans(goal)` for `pre` and plain values for others; `getDemoData(locale): DemoData`.

- [ ] Port PT seed data verbatim from the mockup (`KIDS`, `DATA`, `WEEKS`, `MSGS`, `REPLIES`, `VILA`, `GROWTH`, `VAX`, `FEAT_SCREENS` copy, `OPT_ICO`, `RANGE_VIS`, `FEATS`, `CYC`). Replace getters that read global `state` with functions taking `goal`.
- [ ] Write EN data with the same shape (natural English, not word-for-word; Lua/Kenji/Amara keep names; units metric; vaccine list keeps PNI labels in PT data and uses "CDC schedule" wording in EN).
- [ ] Messages: page copy (rebus tokens, sub, email field, note, hint, phase labels, section titles, sticker captions, waitlist, joined, install hint, tour lines, tab labels, aria labels). EN rebus: `Your life {flower} and your kids' {baby}, in one app {phone}.`; EN sub: `Cycle, pregnancy, kids and menopause. Just your cycle, or the whole family.`
- [ ] Test: EN and PT data have identical key structure and array lengths; parity test green.
- [ ] Commit `feat(site): v3 copy and demo seed data (en, pt)`.

### Task 5: Demo reducer

**Files:** Create `lib/demo/reducer.ts`, `lib/demo/reducer.test.ts`.

**Interfaces — Produces:** `initDemo(data: DemoData): DemoState`; `demoReducer(state, action)`; actions `setMode`, `setGoal`, `setKid`, `openScreen{screen, arg?}`, `back`, `openSheet{sheet}`, `closeSheet`, `log{chip, value, note?, kid?}`, `addMemory`, `addExam`, `toggleLike{post}`, `comment{post, text}`, `sendChat{channel, text}`, `receiveReply{channel}`, `setGrowthTab`, `setVillageFilter`, `setWeek`, `tourDone{key}`, `skipTour`, `joined`.

- [ ] Tests first for: setMode closes sheet and resets screen to home; log appends to that phase only, marks the chip, bumps `logs`, milestone log also prepends a memory; kid filter; goal switch clears `logged.pre`; tour advances only on the current key; `joined` ends the tour.
- [ ] Implement as a pure function (no DOM, no Date inside — pass `now` in the action).
- [ ] Commit `feat(demo): pure reducer for the app demo`.

### Task 6: Demo shell — device, home, tab bar, sheets

**Files:** Create `components/demo/demo.tsx` (client; `useReducer` + context), `device.tsx`, `tabs.tsx`, `home.tsx`, `size-card.tsx`, `kid-switch.tsx`, `sheet.tsx`, `log-sheet.tsx`, `toast.tsx`, `demo.module.css`.

- [ ] Port CSS from the mockup sections `/* ── the phone ── */` through `/* sheet inside the phone */` and `/* log sheets … */`, `/* kids: who is this about */`, `/* pregnancy: how big is the baby */` into `demo.module.css`.
- [ ] Home per phase (hero card, Cycle goal switch, Filhos duo cards + kid switch, pregnancy size card with week slider), chips, Today list, quick access, nudge after 2 logs.
- [ ] Sheets: register list, log sheet (mood faces, sticker tiles, range with growing/counting stickers and filled track, kick counter, optional note, who switch), shortcuts. Toast sticker on save.
- [ ] Tab bar with drawn edge stopping at the eye; active wavy underline.
- [ ] Commit `feat(demo): device, home, tab bar and log sheets`.

### Task 7: Demo screens — Agenda, Week, Profile

**Files:** Create `components/demo/screens/agenda.tsx`, `week.tsx`, `profile.tsx`, `components/demo/charts/{line.tsx,growth.tsx,wheel.tsx,beads.tsx,nights.tsx,plate.tsx,picto.tsx,heat.tsx,trend.tsx}`.

- [ ] Port `screen('agenda')`, `weekPre/Preg/Kids/Meno`, `lineChart`, `growthChart`, `arc`, cycle wheel (`CYC`, `phaseOf`, `wheelCenter`) as pure SVG/JSX components.
- [ ] Wheel: tapping a day updates the centre; today at 6 o'clock with dotted aura.
- [ ] Commit `feat(demo): agenda, week charts and profile`.

### Task 8: Demo feature screens

**Files:** Create `components/demo/screens/{vaccines,memories,care,village,community,chat,exams,exam,appointments,reminders,pediatric,growth,privacy}.tsx`.

- [ ] Port each from the mockup `FEAT_SCREENS` and `screen('chat' | 'exame')`, `newMemory`, `addExam`, composer handler.
- [ ] Chat: send appends as React text; simulated reply after 1.4 s (0 with reduced motion); typing indicator.
- [ ] Exams: add-exam sheet with scan animation, then opens the new exam.
- [ ] Commit `feat(demo): feature screens (community, village, exams, growth, memories…)`.

### Task 9: Page shell and quick-join

**Files:** Modify `app/[locale]/page.tsx`. Create `components/site/hero.tsx` (rebus), `phase-switch.tsx`, `quick-join.tsx`, `joined-context.tsx`, `sticker-sheet.tsx`, `waitlist-section.tsx`; modify `footer.tsx`, `nav.tsx`. Delete `components/site/{chapters,launch,faq,closing}.tsx`, `components/diffuse/*` no longer imported, `components/waitlist-form.tsx` if replaced.

**Interfaces — Consumes:** `submitWaitlist` (Task 1), demo context `mode` (Task 6).

- [ ] Rebus renders tokens from messages, each sticker glued to the preceding word (`white-space: nowrap`), pop-in stagger, boing on tap.
- [ ] `<QuickJoin variant="hero" | "section" | "pop" />`: `useActionState(submitWaitlist)`, hidden `mode` from the demo, `locale`; on success calls `joined()` in `JoinedContext`, every QuickJoin renders the joined pill; errors inline under that field only, typed email kept.
- [ ] Test (Vitest + Testing Library): two QuickJoins, submit one → both show joined; error case keeps the value.
- [ ] Sticker sheet (desktop tap also drives the phone), waitlist section with phase radios, footer wraps on small screens.
- [ ] Commit `feat(site): v3 page shell with quick-join everywhere`.

### Task 10: Phones — black bar, Explorar, list pop-up, scaling, PWA

**Files:** Create `components/site/mobile-bar.tsx`, `explore-panel.tsx`, `list-pop.tsx`, `use-phone-fit.ts`; `app/manifest.ts`; icons in `public/icons/` (192, 512, maskable, apple-touch 180) drawn from the eye sticker.

- [ ] Port `fitPhone` (`min(1, min(vw*.82, 340)/390, (vh-240)/800)`), `syncBar` (bar hidden while > 15% of the phone is visible, never while Explorar or the pop-up is open), Explorar grid (`minmax(0,1fr)`), list pop-up.
- [ ] Manifest: name, short_name `grandma`, `display: standalone`, `background_color`/`theme_color` `#F3F0E8`, icons; Apple meta in layout.
- [ ] Commit `feat(site): mobile bar, Explorar, phone fit and PWA manifest`.

### Task 11: Guided tour

**Files:** Create `components/site/tour.tsx`, `tour.module.css`.

- [ ] Port the coach (`STEPS`, `placeCoach`, `coachDone`, `endCoach`, "Testa o app ↓" pill) with a rAF loop that pauses when the tab is hidden; steps read from messages; ripple uses the inset animation; `.tour-hit` breathing class applied by ref.
- [ ] Steps advance from reducer `tourDone` dispatches; "pular" / skip and `joined` end it.
- [ ] Commit `feat(site): hand-drawn guided tour`.

### Task 12: QA script and cleanup

**Files:** Create `scripts/qa/walk.mjs`, `scripts/qa/devices.mjs`. Modify `app/[locale]/opengraph-image.tsx` (sticker style, no gradient). Remove unused media under `public/media/app/` only after Igor confirms (list them in the report instead of deleting).

- [ ] `walk.mjs` (Playwright, local `next start`): /pt and /en, iPhone 13 + 1440×900, full demo walk (each phase, each tab, each feature screen, log in every sheet type, chat send, comment, add exam, new memory, join) → zero page errors.
- [ ] `devices.mjs`: iPhone SE, 13, 14 Pro Max, Pixel 7 → `scrollWidth === innerWidth`; scroll every 40 px → no bar/phone overlap.
- [ ] `npm run build && npm test && npm run typecheck && npm run lint`.
- [ ] Commit `chore(site): v3 QA scripts and OG image`.
