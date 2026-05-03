# grandma.app

**The parenting wisdom of a grandmother, available 24/7.**

A full-platform parenting companion that walks with families across the entire journey — **Pre-Pregnancy → Pregnancy → Kids** — powered by Claude AI ("Guru Grandma"), Expo + Supabase, and a cream-paper / sticker-collage design language.

---

## What's inside

- **AI chat** — Guru Grandma, a Claude Sonnet–powered assistant, mode- and pillar-aware
- **Camera scan** — 4 scan types (food, label, rash, growth) with child context, via Claude Vision
- **40-week pregnancy tracker** — week ring, baby development data, weight/symptom/kick logging, contraction timer, birth plan
- **Pre-pregnancy cycle tracking** — cycle ring, fertile window, hormone chart, period/ovulation/symptom logs
- **Kids dashboard** — sleep circle, mood, calories, growth leaps, vaccines, food calendar, AirTag location, nanny notes
- **Care circle** — partners, nannies, family, pediatricians with permission-based access
- **Vault** — encrypted document storage (ultrasounds, exams, vaccines, birth plan)
- **Community** — channels, threads, ratings, leaderboard, badges, daily rewards
- **Marketplace ("Grandma's Garage")** — sell / trade / donate baby items
- **Insights & analytics** — generated per pillar, per mode, per child
- **Notifications engine** — vaccines, appointments, milestones, reminders
- **Premium subscription** — unlimited scans + chat, insights, vaccine reminders (RevenueCat)

---

## The three journey modes

The entire UI — tabs, pillars, home dashboard, vault sections, AI context — is driven by `useModeStore`. Mode is persisted in AsyncStorage and switchable from the home screen.

|  | Pre-Pregnancy | Pregnancy | Kids |
|---|---|---|---|
| **Audience** | Trying-to-conceive | Expecting | Parents with children 0–5y |
| **Brand color** | Rose `#E58BB4` | Lavender `#B7A6E8` | Powder blue `#8BB8E8` |
| **Home** | Cycle ring + hormone chart + fertile window | Week ring + baby size + daily pulse + vitals | Sleep circle, mood, calories, growth leaps + pillar grid |
| **Planner** | Cycle / Checklist / Appointments | Timeline / Journey / Appointments | Timeline / Food / Notes |
| **Library** | 6 fertility pillars | 9 pregnancy pillars | 9 kids pillars |
| **Vault** | Hidden | Ultrasound, tests, birth plan | Exams, hospital, vaccines |

---

## Tech stack

| Layer | Technology | Notes |
|---|---|---|
| Mobile | Expo SDK 54 + React Native 0.81 | iOS + Android |
| Navigation | Expo Router v6 | File-based routing, typed routes |
| Styling | NativeWind 4 + StyleSheet | Static layout via NativeWind, dynamic via StyleSheet |
| State | Zustand v5 | **Named import** `import { create } from 'zustand'` |
| Data | TanStack React Query v5 | **Object syntax** `useQuery({ queryKey, queryFn })` |
| Backend | Supabase | Auth + PostgreSQL + Edge Functions + Storage |
| AI | Claude Sonnet `claude-sonnet-4-20250514` | Via Supabase Edge Functions only |
| Payments | RevenueCat (`react-native-purchases` v9) | Monthly + annual tiers |
| Animation | react-native-reanimated v4 | Pregnancy ring spin, sticker hero, transitions |
| Charts | Custom SVG (`components/charts/SvgCharts.tsx`) | Line + bar charts, no external chart deps |
| Language | TypeScript strict | All routes, stores, edge functions typed |

### Critical syntax reminders

```ts
// Zustand v5 — ALWAYS named import
import { create } from 'zustand'

// React Query v5 — ALWAYS object syntax
const { data } = useQuery({ queryKey: ['key', id], queryFn: () => fetch(id) })

// Expo Router — typed routes only
import { router } from 'expo-router'
router.push('/screen-name')         // ✅
// navigation.navigate('Screen')    // ❌ never
```

---

## Design system — cream paper · sticker collage

The 2026 redesign replaced the old neon-dark direction with a warm, editorial, sticker-on-paper aesthetic. Both light and dark themes use the same sticker palette; only the canvas tone flips.

**Source of truth:** [`constants/theme.ts`](constants/theme.ts)

### Typography

- **Fraunces** (`Fraunces_600SemiBold`) — display headings, numbers, titles. Editorial serif, slightly italic for accents.
- **DM Sans** (`DMSans_400Regular` / `500Medium` / `600SemiBold`) — body, labels, UI.

### Canvas

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | `#F3ECD9` (cream) | warm ink | Page background |
| `bgWarm` | `#EFE5CC` | — | Slightly deeper cream sections |
| `surface` | `#FFFEF8` (paper white) | dark surface | Card backgrounds |
| `surfaceRaised` | `#F7F0DF` | — | Nested cards |
| `border` | `rgba(20,19,19,0.08)` | — | Hairline dividers |

### Brand (mode) colors

| Mode | Light | Soft tint |
|---|---|---|
| Pre-Pregnancy (rose) | `#E58BB4` | `#F7CFDD` |
| Pregnancy (lavender) | `#B7A6E8` | `#E0D5F3` |
| Kids (powder blue) | `#8BB8E8` | `#D4E3F3` |

### Sticker palette

`yellow` `blue` `pink` `green` `lilac` `peach` `coral` — each with a `*Soft` companion. Used on log forms, vital cards, pillar tiles, achievement badges, and cycle/trimester accents.

### Shape & component patterns

- **Cards** → `borderRadius: 32`, paper white surface, hairline border, no shadow
- **Buttons** → `borderRadius: 999`, height `56–72`, paper-pill shape
- **Inputs** → `borderRadius: 36`, height `72`
- **Heart-eye logo** — the brand's character mark
- **12 stickers** — heart, star, flower, sparkle, squiggle, squishy, etc. (`components/ui/Stickers.tsx`)
- **Sticker stamps** — log type icons (sleep moon, water drop, weight, kicks, etc.) in `components/stickers/RewardStickers.tsx`

> Memory: the cream-paper sticker direction supersedes the prior neon-dark-purple system. Don't reach for raw `#FFFFFF`/`#000000` or neon hex values — always import tokens from `constants/theme.ts`.

---

## Project structure

```
app/                      Expo Router screens (file = route)
├── (auth)/               welcome, sign-in, sign-up
├── onboarding/           journey, parent-name, due-date, baby-name, activities, child-profile
├── (tabs)/               index (home), agenda, library, vault, exchange (garage), settings
├── profile/              account, kids, care-circle, badges, health-history,
│                         memories, pregnancy
├── channel/              index, [id], create, thread/[id]
├── garage/               [id], create, share, profile
├── pillar/[id]           Pillar detail
├── grandma-talk          Full AI chat screen
├── insights              Analytics + history tab
├── leaderboard           Community rankings
├── daily-rewards         Streaks + badges
├── notifications         Notification center
├── connections           Care circle
└── scan, paywall, birth-plan, airtag-setup, child-picker,
    invite-caregiver, manage-caregivers, accept-invite

components/
├── ui/                   GlassCard, PaperCard, PaperAlert, PillButton,
│                         GradientButton, CosmicBackground, ScreenHeader,
│                         Stickers, Typography, StepSlider, …
├── home/                 GrandmaBall, ModeSwitcher, PregnancyHome, KidsHome,
│                         PrePregHome, ActivityCard, …
│   └── pregnancy/        WeekCard, VitalsCarousel, AffirmationRevealCard,
│                         RemindersSection, AppointmentDetailModal
├── prepreg/              CyclePhaseRing, WeekStrip, HormoneChart, HealthDashboard
├── pregnancy/            PregnancyJourneyRing (calendar), BirthTypeCard,
│                         MilkControl, PartnerDashboard, WeeklyInsight
├── kids/                 LocationCard, SleepCircle, MoodAnalysis,
│                         CaloriesCard, GrowthLeaps
├── calendar/             PregnancyCalendar, PregnancyLogForms, KidsCalendar,
│                         KidsLogForms, CycleCalendar, LogSheet, LogTile,
│                         AppointmentDetailModal, AgendaWeekStrip
├── vault/                EmergencyCard, DocumentSection, DocumentUpload,
│                         VaccineRecord
├── exchange/             ListingCard
├── channels/             ChannelCard, ThreadCard
├── pillar/               PillarCard, TipCard
├── insights/             InsightCard, MetricsHighlight
├── stickers/             RewardStickers, BrandStickers
├── charts/               SvgCharts
└── auth/                 SocialAuthButtons

lib/
├── supabase.ts           Supabase client (ExpoSecureStoreAdapter)
├── claude.ts             callNana() → invokes nana-chat edge function
├── cycleLogic.ts         Menstrual cycle engine
├── modeConfig.ts         Per-mode tabs / pillars / vault sections
├── pillars.ts            Kids pillars (9)
├── pregnancyPillars.ts   Pregnancy pillars (9)
├── prePregPillars.ts     Pre-pregnancy pillars (6)
├── pregnancyData.ts      40-week baby development data
├── analyticsData.ts      Today/week metric hooks
├── insights.ts           Analytics engine
├── notificationEngine.ts Notification scheduling
├── leaderboard.ts        Points + rankings
├── badgeSync.ts          Achievement award logic
├── channels.ts           Community CRUD
├── channelPosts.ts       80+ seed posts
├── garage.ts             Marketplace helpers
├── auth-providers.ts     Apple / Google sign-in
├── moodFace.ts           Mood face variant + fill mapper
├── weekStats.ts          Length/weight per week
└── i18n/                 Translation system (~180/500 keys, in progress)

store/                    Zustand stores (see table below)

constants/
└── theme.ts              All design tokens (brand, stickers, light/dark, fonts, radius)

supabase/
├── functions/            Edge functions (Deno)
└── migrations/           Time-stamped SQL migrations
```

---

## Zustand stores

| Store | Persisted | Holds |
|---|---|---|
| `useModeStore` | ✅ | Active journey mode (pre-preg / pregnancy / kids) |
| `useThemeStore` | ✅ | Light/dark theme |
| `useChildStore` | — | Children array, active child, caregiver role/permissions |
| `useChatStore` | — | AI chat message history |
| `useJourneyStore` | ✅ | Onboarding data (parentName, dueDate, babyName, activities) |
| `useOnboardingStore` | — | General onboarding state |
| `useCycleOnboardingStore` | ✅ | Pre-pregnancy onboarding |
| `usePregnancyOnboardingStore` | ✅ | Pregnancy onboarding |
| `useKidsOnboardingStore` | ✅ | Kids onboarding |
| `usePregnancyStore` | — | Week, weight, mood, symptoms |
| `useFoodStore` | — | Food entries + ratings |
| `useVaultStore` | — | Documents, emergency card |
| `useExchangeStore` | — | Marketplace listings + saved |
| `useChannelsStore` | — | Channels, threads |
| `useBehaviorStore` | ✅ | Journey modes & behaviors per user |
| `useBadgeStore` | ✅ | Achievement badges |
| `useGoalsStore` | ✅ | User goals |
| `useNotificationsStore` | — | Notification state |

---

## Database

All tables enable RLS. Care-circle access uses the `care_circle` table + `permissions[]` array — never bypass RLS.

| Table | Purpose |
|---|---|
| `profiles` | User account, health data, blood type, allergies, conditions, language, journey_mode |
| `behaviors` | Journey mode per user (pre-preg / pregnancy / kids) |
| `children` | Child records (name, dob, allergies, blood_type, pediatrician) |
| `care_circle` | Caregivers (partner / nanny / family / doctor) + permissions + invite tokens |
| `child_logs` | Activity logs (feeding, sleep, diaper, mood, vaccine, medicine) |
| `cycle_logs` | Pre-pregnancy tracking (period, ovulation, symptom, basal_temp) |
| `pregnancy_logs` | Pregnancy tracking — `log_type` ∈ {symptom, weight, kick_count, contraction, mood, appointment, note, sleep, water, exercise, vitamins, kegel, nutrition} + value, severity, duration_seconds, notes |
| `channel_posts` | Community forum messages |
| `channel_ratings` | Votes on posts |
| `garage_listings` | Marketplace items (sell / trade / donate) |
| `insights` | Generated analytics (by pillar + date) |
| `badges` | Achievement system |
| `leaderboard` | Points + rankings |
| `notifications` | Push + in-app notifications |
| `vault_documents` | Medical records |
| `emergency_cards` | Blood type, allergies, emergency contacts |
| `vaccine_records` | Vaccination history |
| `exams` / `exam_photos` | Test results, photos with signed URLs |
| `affirmations` | Daily affirmation seed data |

### Migrations

Format: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`

```sql
CREATE TABLE IF NOT EXISTS …          -- always idempotent
ALTER TABLE … ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own X" ON X
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
NOTIFY pgrst, 'reload schema';
```

Indexes on `user_id`, `child_id`, `created_at`. Foreign keys use `ON DELETE CASCADE` for child-linked data.

Apply with `supabase db push`.

---

## Supabase Edge Functions

| Function | JWT | Purpose |
|---|---|---|
| `nana-chat` | no-verify | Guru Grandma AI — 3-mode context + 24 pillar prompts |
| `scan-image` | no-verify | Claude Vision — 4 scan types with child context |
| `generate-insights` | no-verify | Analytics generation per mode |
| `invite-caregiver` | required | Token-based caregiver invite |
| `accept-invite` | required | Token verification + user linking |
| `revenuecat-webhook` | no-verify | Subscription status sync |

Deploy: `supabase functions deploy <name> [--no-verify-jwt]`

The Anthropic API key is a Supabase secret — `supabase secrets set ANTHROPIC_API_KEY=…`. It is **never** present in the mobile bundle. The app never calls `api.anthropic.com` directly.

---

## Subscription model

| Tier | Price | Includes |
|---|---|---|
| Free | $0 | Chat, browse pillars, 3 scans / month |
| Premium | $9.99 / month or $69.99 / year | Unlimited scans + chat, insights, vaccine reminders |

Paywall: [`app/paywall.tsx`](app/paywall.tsx). RevenueCat init in `lib/revenue.ts`.

---

## Logging architecture

A single, slider-based log form is shared across home and calendar surfaces (one source of truth, consistent paper-sheet styling):

- **Source forms:** [`components/calendar/PregnancyLogForms.tsx`](components/calendar/PregnancyLogForms.tsx) — `SleepLogForm`, `WeightLogForm`, `WaterLogForm`, `ExerciseLogForm`, `VitaminsLogForm`, `KegelLogForm`, `KickCountForm`, `PregnancyMoodForm`, `PregnancySymptomsForm`, `AppointmentForm`, `NutritionLogForm`, `ContractionTimerLogForm`, …
- **Consumers:** Calendar (`PregnancyCalendar`), home vital cards (`VitalsCarousel`), home routines + reminders (`PregnancyHome`)
- **Save helper:** internal `savePregnancyLog(date, type, value, notes)` writes to `pregnancy_logs` and invalidates `['pregnancy-week-logs']` and `['pregnancy-today-logs']`
- **Display:** the calendar Journey ring's "LOGGED THIS WEEK" panel renders structured log entries (label · value · severity · duration · notes · day) per selected week

Equivalent forms exist for **Kids** (`KidsLogForms`) and **Pre-Pregnancy** (cycle/symptom logs).

---

## Setup

### Prerequisites
- Node 20+
- Expo CLI: `npm i -g expo`
- Supabase CLI: `brew install supabase/tap/supabase`
- An Apple / Google developer account for OAuth setup (optional in dev)

### Install & run

```bash
npm install
npx expo start
```

### Environment

```env
EXPO_PUBLIC_SUPABASE_URL=…
EXPO_PUBLIC_SUPABASE_ANON_KEY=…
REVENUECAT_API_KEY=…                # optional in dev
```

Supabase secrets (server side, **not** in app):

```bash
supabase secrets set ANTHROPIC_API_KEY=…
```

### Database

```bash
supabase db push                                     # apply migrations
supabase functions deploy nana-chat --no-verify-jwt  # per-function deploy
```

---

## Coding rules

- **Never call Claude directly from the app** — always via Supabase Edge Functions
- **Never mock the mode system** — read from `useModeStore`, don't hardcode mode checks
- **Never use raw hex inline** — import from `constants/theme.ts`
- **Mode-aware components** — check `useModeStore` for conditional rendering; don't create per-mode siblings unless the difference is large
- **One component per file** — PascalCase filename = component name
- **Compress images < 1MB** via `expo-image-manipulator` before any upload
- **Pillar data lives in `lib/`** — `pillars.ts`, `pregnancyPillars.ts`, `prePregPillars.ts`
- **Care circle access** must go through `care_circle` table; RLS enforces server-side, but filter client-side too for clarity
- **Realtime** only for chat messages and nanny notes — everything else polls
- **Migrations** always `CREATE TABLE IF NOT EXISTS`, always RLS, always `NOTIFY pgrst, 'reload schema'` after schema changes

See [`.claude/rules/code-style.md`](.claude/rules/code-style.md) and [`.claude/rules/supabase.md`](.claude/rules/supabase.md) for the full conventions.

---

## Status snapshot (2026-05-02)

- ✅ Three journey modes wired end-to-end (mode switcher, per-mode home, agenda, library, vault)
- ✅ Pregnancy: live week from due date, journey ring with structured weekly log readout, weekly milestone, profile editing, sticker hero
- ✅ Kids: nutrition ranking, breastfeeding insights, sticker log forms
- ✅ Cream-paper / sticker-collage redesign across light + dark
- ✅ Unified pregnancy log forms (slider-based, paper sheet) shared between calendar and home
- 🚧 i18n coverage — system built; ~180/500 keys done across 3 wired-up screens (7-wave plan)
- 🚧 Vault polish, marketplace listing flows, leaderboard rewards loop

---

## License

Proprietary. All rights reserved.
