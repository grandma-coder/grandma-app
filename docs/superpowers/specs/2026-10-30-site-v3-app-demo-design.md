# grandma.app site v3: the app you can try, then the waitlist

Date: 2026-10-30 · Status: draft for Igor's review · Supersedes the visual system, page structure, copy and country rules of `2026-10-30-site-waitlist-diffuse-i18n-design.md` (rev 2). The waitlist write path, i18n routing, legal pages and the command-center pillar from rev 2 stay.

Design source of truth: `docs/mockups/2026-10-30-app-site.html` (approved by Igor, 2026-10-30). Where this spec and the mockup disagree on markup, styling, motion or demo content, the mockup wins; where they disagree on behaviour or data, this spec wins.

## 1. Goal

One page whose only job is to collect waitlist emails, by letting visitors use a working copy of the app first. Mobile first. Worldwide launch.

### Success criteria

1. A visitor on a phone sees the promise, the email field and the top of the working app on the first screen.
2. Every tap in the demo answers visibly (a sticker, a sheet, a new screen) within 300 ms, with no network call.
3. Any email field on the page submits through the existing `submitWaitlist` server action and flips every email field to the joined state.
4. EN and PT are complete; the parity test passes.
5. No horizontal scroll at 320 px; the site's black bar never covers the phone's own tab bar (iPhone SE, iPhone 13, iPhone 14 Pro Max, Pixel 7).
6. `prefers-reduced-motion` removes all non-essential motion.

### Out of scope

Real accounts, saving demo data, a real chat backend, buying or selling in the Village, the app's own redesign.

## 2. Decisions taken with Igor (2026-10-30)

| Decision | Detail |
|---|---|
| Launch | Worldwide at once. No "Brazil first" copy anywhere. |
| Country | Captured silently from `x-vercel-ip-country` as ISO 3166-1 alpha-2, `OTHER` when unknown. Never shown in the form. Used for stats only. |
| Pre-pregnancy phase | Label "Ciclo" / "Cycle". Inside it, a goal switch: "Só acompanhar / Just tracking" (default) or "Quero engravidar / Trying to conceive". DB key stays `pre`. |
| Visual language | Hand-drawn stickers in the Kika Macfarlane line: thick wobbly ink outline, flat bright fills, die-cut white edge; hand-lettered caps headings; no gradient fields. |
| Hero | Rebus headline with stickers inline: "Sua vida ✿ e a dos seus filhos ☺, num app só ▯." / "Your life ✿ and your kids' ☺, in one app ▯." |
| Email field | One per screen: under the hero text (desktop and mobile). No duplicate in the header. The waitlist section and the "Lista" pop-up are the only other entry points. |
| Demo | A working app inside a real iPhone shape, driven by a phase switch above it, its own tab bar, and (on phones) the site's black bar. Seeded data for all four phases; two kids in "Filhos". |
| Guidance | A five-step hand-drawn tour (sticky note, arrow, pulsing halo, breathing target) with "skip". |
| Village | Shows prices, likes, comments and a buy / want button, as Igor asked. The app today only supports pass-on and swap; the demo marks nothing as purchasable for real. |

## 3. Page structure

1. **Top bar**: mark + "grandma", PT / EN switch. Sticky.
2. **Hero** (desktop: two columns; phone: stacked)
   - Rebus `h1` (Architects Daughter, caps), stickers pop in one by one and boing on tap.
   - Sub: "Ciclo, gravidez, filhos e menopausa. Pode ser só o seu ciclo, ou a família inteira." / "Cycle, pregnancy, kids and menopause. Just your cycle, or the whole family."
   - Email field ("Entrar na lista" / "Join the list") + note "Um email quando for a sua vez. Nada além disso."
   - Desktop only: "Testa aqui ✎ troca a fase e mexe à vontade →".
   - Phase switch (4 sticker tabs) above the phone; sticky under the top bar on phones.
   - The phone: 390 × 800 device, scaled to fit on phones between the phase switch and the black bar.
3. **"O que mora aqui dentro"**: sticker sheet of 12 features; tapping peels a sticker and shows its caption (desktop also drives the phone).
4. **Waitlist**: "Em breve, no mundo todo 🌍. Guarda seu lugar ♡" + full form (phase radios + email) + joined state with "add to home screen" hint.
5. **Footer**: privacy, terms, support email.
6. **Phones only**: black bottom bar (Início · Registrar · Explorar · Memórias · Lista), auto-hidden while the phone is on screen; Explorar panel (12 stickers + join button); waitlist pop-up.

## 4. The demo app

All demo behaviour runs client-side from typed seed data; nothing persists across reloads.

- **Phases**: `pre` (Cycle, with goal switch), `preg`, `kids` (Kenji 2 y, Lua 5 mo, with kid switch), `meno`.
- **Screens**: Home, Agenda, Semana/Week, Perfil/Profile, and feature screens: Vaccines, Memories (timeline + new memory), Care circle, Village (feed with like / comment / buy-want / filters), Community (channels → chat with send + simulated reply), Exams (list → detail with "grandma read it for you", values table; add-exam scan flow), Appointments, Reminders, Pediatrician report, Growth (WHO-style bands, weight / height / head, per kid), Privacy.
- **Log sheets**: sticker header; options as sticker tiles; ranges with growing / counting stickers; optional note; "who" switch in Filhos; saving adds to Today, marks the chip, shows a "Registrado!" sticker, and milestone logs also enter Memories.
- **Week charts**: Cycle wheel (one sticker per day: drop, leaf, egg, moon; today at 6 o'clock; tap a day), BBT line with coverline, mood faces; kick hearts, weight-gain band, fruit trail; nights timeline (per kid), plate pie + protein meter, feed pictogram; hot-flash heat grid + flame trend.
- **Pregnancy size**: fruit card with the app's own table (`grandma-app/lib/pregnancyData.ts`: weeks 8–40, raspberry → pumpkin, length, weight) and a week slider.
- **Tab bar**: paper strip, drawn top edge that stops at the centre eye button, sticker tabs, wavy underline on the active one.

User-typed text (chat, comments, notes) is HTML-escaped before it reaches the DOM.

## 5. Architecture

- Next.js 16 app router, React 19, next-intl 4 (`/en`, `/pt`), Tailwind 4 for page chrome; the demo's component CSS lives in a CSS module per area, ported from the mockup.
- `components/stickers/`: one SVG path table (ported verbatim from the mockup's `I` object), a `<Sticker name cut? />` component, and the two SVG filters (`wob`, `cut`) mounted once in the layout.
- `lib/demo/`: `types.ts`, `data.en.ts`, `data.pt.ts` (same shape, test-enforced), `reducer.ts` (pure, unit-tested: mode, goal, kid, items, logged, memories, exams, chats, village, growth tab, week slider, screen, sheet).
- `components/demo/`: device frame + app shell, tab bar, home, sheets, screens, charts (pure SVG components).
- `components/site/`: hero, phase switch, sticker sheet, waitlist section, footer, mobile bar, Explorar panel, list pop-up, tour.
- Waitlist: every email field is a `<QuickJoin>` posting to the existing `submitWaitlist` action with `mode` from the demo state; a `JoinedContext` flips all fields after success.
- PWA: `app/manifest.ts` (name, icons 192/512/maskable, `display: standalone`, theme `#F3F0E8`), Apple meta, no service worker.

## 6. Data changes

- `lib/countries.ts`: `Country = string` matching `/^[A-Z]{2}$/` or `'OTHER'`; `countryFromGeo(header)` returns the header's code when valid, else `'OTHER'`. The form posts no country; the action fills it from the header.
- `lib/waitlist/schema.ts`: drop `country` from the visitor-facing schema; the action adds it.
- Command center `migrations/0018_waitlist.sql` (not yet applied): `CHECK (country = 'OTHER' OR country ~ '^[A-Z]{2}$')`; header comment no longer says Brazil first. `db/schema/center.ts` drops `WAITLIST_COUNTRIES`; the list filter takes any 2-letter code; stats `byCountry` unchanged.

## 7. Error handling

Rev 2 rules stay (same success response for new and existing emails, rate limit, lazy server deps). New: the quick-join field shows the error inline under itself (`email_invalid`, `rate_limited`, generic) and keeps the typed email.

## 8. Testing

- Unit: reducer transitions, seed-data shape parity EN/PT, `countryFromGeo`, schema, escape helper.
- i18n parity test covers the new keys.
- Browser checks (Playwright script in `scripts/qa/`): full demo walk on iPhone 13 and desktop with zero page errors; no horizontal overflow and no bar/phone overlap on the four devices; joined state syncs across fields.

## 9. Needs from Igor

1. Review the EN copy (rebus and tour lines are new).
2. Apply command-center migration `0018` (after the country change) and run `scripts/verify-waitlist.mjs`.
3. Vercel env vars from rev 2.
4. App icons for the manifest (or approve using the sticker eye).
