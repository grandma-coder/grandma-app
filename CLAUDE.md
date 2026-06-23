# grandma.app — Claude Context

Parenting companion app covering **Pre-Pregnancy → Pregnancy → Kids**. The entire UI adapts based on the user's active journey mode. Powered by Claude AI (Guru Grandma), Expo + Supabase + RevenueCat. **Cream-paper / sticker-collage** design system (light + dark), editorial serif + sans typography.

> The 2026 redesign replaced the old neon-dark-purple direction. Both light and dark themes share the same sticker palette; only the canvas tone flips.

---

## ⚠️ Design system is non-negotiable

**Before writing or editing ANY UI code, read [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) and verify the §5 pre-write checklist.** Quick version:

- Import from `constants/theme.ts` — never hardcode hex / radius / font / shadow
- Cards: `radius.lg` (28). Buttons/pills: `radius.full` (999). Inputs: `radius.md` (20–24)
- Shadows: only `shadows.card` / `cardPop` / `pop` / `subtle`. **Never** `shadows.glow*` (legacy neon)
- Mode color: `getModeColor(mode, isDark)` — never hardcode per mode
- Use `useTheme()` for colors / `brand` for fixed brand / `stickers` for palette / `font` for font families
- Buttons are pills, filled (no outline-only). Use `PillButton` / `StickerButton`
- `GlassCard` was deleted (legacy neon system) — use `PaperCard` everywhere
- Raw hex is allowed only inside sticker/illustration SVG path files (these *are* the assets)

If a value isn't in `theme.ts`, stop and ask — don't invent one.

---

## Tech Stack

| Layer | Tech | Critical Notes |
|-------|------|---------------|
| Mobile | Expo SDK 54 + React Native 0.81 + React 19 | iOS + Android |
| Navigation | Expo Router v6 | File-based routing — screen = file, typed routes |
| Styling | NativeWind 4 + TailwindCSS 4 + StyleSheet | StyleSheet for dynamic styles, NativeWind for static layout |
| State | Zustand v5 | Named import: `import { create } from 'zustand'` (NOT default) |
| Data | TanStack React Query v5 | `useQuery({ queryKey, queryFn })` object syntax, NOT positional |
| Backend | Supabase | Auth + PostgreSQL + Edge Functions (Deno) + Storage |
| AI | Claude Sonnet `claude-sonnet-4-5` (vision) / Haiku `claude-haiku-4-5-20251001` (fast text) | Via Supabase Edge Functions only, never called directly from app |
| Payments | RevenueCat (`react-native-purchases` v9) | Monthly + annual tiers |
| Animation | react-native-reanimated v4 | Ring spin, sticker hero, transitions |
| Charts | Custom SVG (`components/charts/`) | `SvgCharts` exports `MoodBubbleCluster`, `MoodStickerStrip`, `VaccineScheduleTree`, line/bar — plus `FullScreenChart`, `GalleryCharts` |
| i18n | Local in `lib/i18n/` | 12 languages + English, driven by `useLanguageStore` |
| Language | TypeScript strict | All routes, stores, edge functions typed |

### Critical Syntax
```ts
// Zustand v5 — ALWAYS named import
import { create } from 'zustand'

// React Query v5 — ALWAYS object syntax
const { data } = useQuery({ queryKey: ['key', id], queryFn: () => fetch(id) })

// Expo Router typed routes
import { router } from 'expo-router'
router.push('/screen-name')         // ✅
// navigation.navigate('Screen')    // ❌ never
```

---

## 3 Journey Modes

The app's entire UI is driven by `useModeStore`. Every screen, tab label, pillar set, vault section, and AI prompt context adapts to the active mode.

|  | Pre-Pregnancy | Pregnancy | Kids |
|--|--|--|--|
| **Brand color** | Rose `#E58BB4` | Lavender `#B7A6E8` | Powder blue `#8BB8E8` |
| **Audience** | Trying-to-conceive | Expecting | Parents 0–5y |
| **Home** | Cycle phase ring + hormone chart + fertile window | Week ring + baby size + TodaySummaryCard + Affirmations + Reminders + Appointments | Sleep circle, mood, calories, growth leaps + pillar grid |
| **Planner** | Cycle / Checklist / Appointments | Timeline / Journey / Appointments | Timeline / Food / Notes |
| **Library** | 6 fertility pillars | 9 pregnancy pillars | 9 kids pillars |
| **Vault** | Repurposed as **Analytics** — the vault tab slot surfaces cycle/fertility insights (`CycleAnalytics`), not documents (no medical vault for pre-preg) | Ultrasound, tests, birth plan | Exams, hospital, vaccines |

Mode is persisted via AsyncStorage. Users switch via `ModeSwitcher` on the home screen.

---

## Design Tokens — `constants/theme.ts`

### Canvas (light is default)

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | `#F3ECD9` cream | warm ink | Page background |
| `bgWarm` | `#EFE5CC` | — | Slightly deeper cream sections |
| `surface` | `#FFFEF8` paper white | dark surface | Card backgrounds |
| `surfaceRaised` | `#F7F0DF` | — | Nested cards |
| `border` | `rgba(20,19,19,0.08)` | — | Hairline dividers |

### Brand & mode palette
```
primary:        #7048B8     // Purple — primary buttons, active states
primaryLight:   #9B70D4

prePregnancy:   #E58BB4     // Rose — cycle, period
pregnancy:      #B7A6E8     // Lavender — milestones, week ring
kids:           #8BB8E8     // Powder blue — vaccines, dashboard
```

### Sticker palette (used on log forms, vital cards, pillar tiles, badges)
```
yellow  #F5D652     blue    #9DC3E8     pink   #F2B2C7
green   #BDD48C     lilac   #C8B6E8     peach  #F5B896
coral   #EE7B6D     charcoal #2A2624
```
Each has a `*Soft` companion for tinted backgrounds.

### Component patterns
```
Card        → borderRadius 32, paper-white surface, hairline border, NO shadow
Button      → borderRadius 999, height 56–72, paper-pill shape
Input       → borderRadius 36, height 72
Tab Bar     → height 84 (pb 34 safe area), mode color active
Sticker     → 12 brand stickers in components/ui/Stickers.tsx
Log stamps  → sleep moon, water drop, weight, kicks, … in components/stickers/RewardStickers.tsx
```

### Typography
- **Fraunces** (`Fraunces_600SemiBold`) — display headings, numbers, titles. Editorial serif, italic for accents.
- **DM Sans** (`DMSans_400Regular` / `500Medium` / `600SemiBold`) — body, labels, all UI text.

> Don't reach for raw `#FFFFFF` / `#000000` or neon hex values. Always import from `constants/theme.ts`.

---

## File Structure

```
app/                  Expo Router screens (file = route)
├── (auth)/           welcome, sign-in, sign-up
├── (tabs)/           index (home), agenda, library, vault, exchange (garage), settings
├── onboarding/       journey, parent-name, due-date, baby-name, activities, child-profile,
│                     transition, cycle/, kids/, pregnancy/ (per-mode flows)
├── profile/          account, personal, kids, care-circle, badges, health-history, memories,
│                     pregnancy, emergency-insurance, notifications, privacy, settings
├── channel/          [id], create, thread/[id], info/[id]
├── channels/         index, [id], thread/ (top-level channels list)
├── garage/           [id], create, share, profile
├── exchange/         [id], create
├── exams/            index, [id]
├── pillar/[id]       Pillar detail
├── grandma-talk.tsx  Full AI chat screen
├── insights.tsx      Analytics + history
├── leaderboard.tsx, daily-rewards.tsx, notifications.tsx, connections.tsx
├── dev-panel.tsx     Internal dev tools
└── scan, paywall, birth-plan, airtag-setup, child-picker,
    invite-caregiver, manage-caregivers, accept-invite

components/
├── ui/               PaperCard, PaperAlert, PillButton, StickerButton,
│                     StickerDateModal, CosmicBackground, ScreenHeader, Stickers, AnimatedSticker,
│                     Typography, StepSlider, SoftStatCard, StatRow, FormRow, ChildPills,
│                     AvatarPicker, BrandedLoader, DatePickerField, GrandmaLogo, NotificationBell,
│                     PaperCard, ResultCard, SavedToast, ScribbleUnderline, SheetBits,
│                     ThemeProvider, DevModeBanner
├── home/             GrandmaBall, ModeSwitcher, HomeGreeting, PregnancyHome, KidsHome,
│                     CycleHome, PillarGrid, ActivityCard, DailyPulse, BabySizeCard,
│                     DevelopmentInsight, GrandmaWisdom, MomentsOfCare, MilkTracker,
│                     NannyUpdatesFeed, PregnancyWeekDisplay
│   ├── cycle/        YourCycleCard, HormonesCard, FertileWindowStrip, CyclePillarsGrid,
│                     CycleHomeDetailSheets, WisdomCard
│   └── pregnancy/    WeekCard, WeekRuler, WeekDetailModal, TodaySummaryCard, TodayDashboardModal,
│                     AffirmationRevealCard, AffirmationShareModal, RemindersSection,
│                     PregnancyUserReminders, AppointmentDetailModal, WeightTrendCard,
│                     AnimatedFruit, babyIllustrations, stickerIcons, affirmationTemplates,
│                     weekMotion
├── prepreg/          CyclePhaseRing, WeekStrip, HormoneChart, HealthDashboard, DailyInsights,
│                     ChecklistCard, LearningModule, PartnerView
├── pregnancy/        PregnancyJourneyRing, BirthGuideModal, BirthDetailModal, BirthTypeCard,
│                     MilkControl, PartnerDashboard, WeeklyInsight
├── kids/             KidsJourneyRing, LocationCard
│                     (mood/sleep/calories/growth-leaps live inside KidsHome + KidsAnalytics)
├── agenda/           ActivityTimeline, AppointmentList, CalendarView, ContractionTimer,
│                     CycleTracker, FoodDashboard, FoodPhotoEntry, KickCounter, NannyNotesPanel,
│                     PrePregChecklist, SymptomLogger
├── calendar/         PregnancyCalendar, PregnancyLogForms, SimplePregnancyLogForm,
│                     PregnancyMealForm, KidsCalendar, KidsLogForms, CycleCalendar,
│                     LogForms, LogFormSticker, LogSheet, LogTile, logStickers, tints,
│                     AppointmentDetailModal, AgendaWeekStrip, AgendaHeader, ActivityPillCard,
│                     SegmentedTabs, SectionHeader
├── charts/           SvgCharts (exports MoodBubbleCluster, MoodStickerStrip, VaccineScheduleTree,
│                     line/bar), FullScreenChart, GalleryCharts
├── analytics/        CycleAnalytics, KidsAnalytics, PregnancyAnalytics, CycleDetailSheets
│   └── shared/       AnalyticsHeader, AnalyticsTitle, BigChartCard, CustomRangeModal,
│                     HealthScoreRing, MiniCharts, MiniStatTile, PeriodSelector
├── vault/            EmergencyCard, DocumentSection, DocumentUpload, VaccineRecord
├── exams/            ExamForm
├── exchange/         ListingCard
├── channels/         ChannelCard, ThreadCard
├── connections/      ChannelsScreen, ChannelsTab, GarageScreen, GarageTab
├── chat/             GrandmaTalk (full chat screen body)
├── pillar/           PillarCard, TipCard
├── insights/         InsightsScreen
├── profile/          ProfileHero, BadgesStrip, MyJourneyPillGrid
├── stickers/         BrandStickers, RewardStickers, BadgeIcon, LineIcons
├── onboarding/       OnboardingStep
└── auth/             SocialAuthButtons

lib/
├── supabase.ts            Supabase client (ExpoSecureStoreAdapter)
├── queryClient.ts         React Query client
├── claude.ts              callNana() → invokes nana-chat
├── grandmaChat.ts         Chat session helpers
├── modeConfig.ts          Per-mode tabs / pillars / vault sections
├── pillars.ts             Kids pillars (9)
├── pregnancyPillars.ts    Pregnancy pillars (9)
├── prePregPillars.ts      Pre-pregnancy pillars (6)
├── pillarStickerMap.ts    Pillar → sticker mapping
├── pregnancyData.ts       40-week baby development data
├── pregnancyWeeks.ts      Week math + due-date derivation
├── pregnancyInsights.ts   Per-week insights
├── pregnancyAffirmations.ts  Daily affirmations
├── pregnancyAppointments.ts  Appointment schedule
├── pregnancyReads.ts      Weekly content
├── pregnancySeeds.ts      Seed data
├── cycleLogic.ts          Menstrual cycle engine (phases, fertility)
├── cycleAnalytics.ts      Cycle stats
├── prepregnancyData.ts    Pre-preg content
├── growthLeaps.ts         Kids leap data
├── vaccineInfo.ts         Vaccine catalog
├── birthData.ts           Birth plan content
├── birthGuide/            Birth guide module (collapsed-by-default UI data)
├── birthGuideData.ts      Birth guide step data
├── prepGuide.ts           Pre-pregnancy guide content
├── weekStats.ts           Length/weight per week
├── weekContent.ts         Weekly content blocks
├── weekDetailData.ts      Weekly detail-modal data
├── analyticsData.ts       Today/week metric hooks
├── photoSafety.ts         Photo content safety checks
├── notifications.ts       Notification CRUD helpers
├── foodTracking.ts        Kids food logging
├── foodAi.ts              Food scan AI helpers
├── foodCalories.ts        Calorie estimation
├── moodFace.ts            Mood face variant + fill mapper
├── notificationEngine.ts  Notification scheduling
├── insights.ts            Analytics engine
├── leaderboard.ts         Points + rankings
├── badgeSync.ts           Achievement award logic
├── channels.ts            Community CRUD
├── channelPosts.ts        80+ channel seed posts
├── channelSticker.ts      Channel sticker mapping
├── garage.ts              Marketplace helpers
├── garagePosts.ts         Marketplace seeds
├── exchange.ts            Exchange helpers
├── airtag.ts              AirTag location
├── revenue.ts             RevenueCat init
├── auth-providers.ts      Apple / Google sign-in
├── scan.ts                Camera scan helpers
├── vault.ts               Vault CRUD
├── examData.ts            Exam content
├── emergencyInsurance.ts  Insurance card data
├── emojiToSticker.tsx     Emoji → sticker JSX
├── devSeed.ts             Dev-only seeding
├── profileStatus.ts       Profile completeness
├── useProfile.ts          Profile hook
└── i18n/                  Translation system (en + 11 languages)

store/                Zustand stores (see table below)
constants/theme.ts    All design tokens (brand, stickers, light/dark, fonts, radius)
supabase/
├── functions/        Edge functions (Deno)
└── migrations/       Timestamped SQL (~45 migrations, format YYYYMMDDHHMMSS_*.sql)
```

---

## Zustand Stores — `store/`

| Store | Persisted | What it holds |
|-------|-----------|---------------|
| `useModeStore` | ✅ | Active journey mode (pre-preg / pregnancy / kids) |
| `useThemeStore` | ✅ | Light/dark theme |
| `useLanguageStore` | ✅ | Active language (12 + en) |
| `useChildStore` | — | Children array, active child, caregiver role/permissions |
| `useChatStore` | — | AI chat message history |
| `useGrandmaHistoryStore` | — | Past chat sessions |
| `useJourneyStore` | ✅ | Onboarding data (parentName, dueDate, babyName, activities) |
| `useOnboardingStore` | ✅ | Multi-behavior onboarding queue (persisted so it survives an app kill mid-queue) |
| `useCycleOnboardingStore` | — | Pre-pregnancy onboarding (ephemeral — saved to Supabase + cleared on finish) |
| `usePregnancyOnboardingStore` | — | Pregnancy onboarding (ephemeral — saved + cleared on finish) |
| `useKidsOnboardingStore` | — | Kids onboarding (ephemeral — saved + cleared on finish) |
| `usePregnancyStore` | — | Week, weight, mood, symptoms |
| `useFoodStore` | — | Food entries + ratings |
| `useVaultStore` | — | Documents + emergency card |
| `useEmergencyInsuranceStore` | — | Insurance card (intentionally not persisted — always fetched fresh from Supabase) |
| `useExchangeStore` | — | Marketplace listings + saved |
| `useChannelsStore` | — | Channels + threads |
| `useBehaviorStore` | ✅ | Journey modes & behaviors per user |
| `useBadgeStore` | ✅ | Achievement badges |
| `useGoalsStore` | ✅ | User goals |
| `useDevStore` | — | Dev-only flags |

> 21 stores total. There is **no** `useNotificationsStore` — notifications use `lib/notifications.ts` + React Query directly.

---

## Supabase Edge Functions — `supabase/functions/`

| Function | JWT | Purpose |
|----------|-----|---------|
| `nana-chat` | no-verify | Guru Grandma AI — 3-mode context + 24 pillar prompts |
| `grandma-chat` | no-verify | Newer chat surface (sessions + history) |
| `food-ai` | no-verify | Food photo → nutrition + ranking (Claude Vision) |
| `scan-image` | no-verify | Claude Vision — 4 scan types with child context |
| `generate-insights` | no-verify | Analytics generation per mode |
| `invite-caregiver` | required | Token-based caregiver invite |
| `accept-invite` | required | Token verification + user linking |
| `revenuecat-webhook` | no-verify | Subscription status sync |

Deploy: `supabase functions deploy <name> [--no-verify-jwt]`

The Anthropic API key is a Supabase secret: `supabase secrets set ANTHROPIC_API_KEY=…`. It is **never** in the mobile bundle.

---

## Database — Key Tables

All tables enable RLS. Care-circle access uses `care_circle` + `permissions[]` — never bypass RLS.

```
profiles          — user account, health data, blood_type, allergies, conditions,
                    language, journey_mode
behaviors         — journey mode per user
children          — child records (name, dob, allergies, blood_type, pediatrician)
care_circle       — caregivers + permissions + invite tokens
child_logs        — feeding / sleep / diaper / mood / vaccine / medicine
cycle_logs        — period / ovulation / symptom / basal_temp
pregnancy_logs    — log_type ∈ {symptom, weight, kick_count, contraction, mood,
                    appointment, note, sleep, water, exercise, vitamins, kegel,
                    nutrition} + value, severity, duration_seconds, notes
channel_posts     — community forum messages
channel_ratings   — post votes
garage_listings   — marketplace items (sell / trade / donate)
insights          — generated analytics (by pillar + date)
badges            — achievement system
leaderboard       — points + rankings
notifications     — push + in-app
vault_documents   — medical records
emergency_cards   — blood type, allergies, emergency contacts
vaccine_records   — vaccination history
exams / exam_photos — test results + signed-URL photos
affirmations      — daily affirmation seed data
```

> **Important:** `profiles.id` **is** the auth user UUID. Filter `.eq('id', userId)` — there is no `user_id` column on `profiles`.

### Migration conventions
- File format: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
- Always idempotent: `CREATE TABLE IF NOT EXISTS …`
- Always: `ALTER TABLE … ENABLE ROW LEVEL SECURITY;`
- Owner policy: `USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`
- Indexes on `user_id`, `child_id`, `created_at`
- Foreign keys: `ON DELETE CASCADE` for child-linked data
- End schema-changing migrations with `NOTIFY pgrst, 'reload schema';`

Apply: `supabase db push`

---

## Logging Architecture

A single slider-based log form is shared across home and calendar surfaces (one source of truth, paper-sheet styling):

- **Source forms:** `components/calendar/PregnancyLogForms.tsx` — `SleepLogForm`, `WeightLogForm`, `WaterLogForm`, `ExerciseLogForm`, `VitaminsLogForm`, `KegelLogForm`, `KickCountForm`, `PregnancyMoodForm`, `PregnancySymptomsForm`, `AppointmentForm`, `NutritionLogForm`, `ContractionTimerLogForm`
- **Consumers:** Calendar (`PregnancyCalendar`), home today summary (`TodaySummaryCard`), home routines + reminders (`PregnancyHome`)
- **Save helper:** internal `savePregnancyLog(date, type, value, notes)` writes to `pregnancy_logs` and invalidates `['pregnancy-week-logs']` and `['pregnancy-today-logs']`
- **Display:** the calendar Journey ring's "LOGGED THIS WEEK" panel renders structured log entries per selected week

Equivalent forms exist for **Kids** (`KidsLogForms`) and **Pre-Pregnancy** (cycle/symptom logs).

> Use `toDateStr(new Date())` for `log_date`. `toISOString().split('T')[0]` returns UTC and breaks evening logs west of UTC.

---

## Key Coding Rules

- **Never call Claude API directly from the app** — always via Supabase Edge Functions
- **Never mock the mode system** — read from `useModeStore`, don't hardcode mode checks
- **Never use raw hex inline** — import tokens from `constants/theme.ts`. See `DESIGN_SYSTEM.md` for the full ruleset. The only exception is SVG path strings in sticker/illustration files.
- **Light theme is default** — cream paper canvas, paper-white cards, hairline borders, no neon glow shadows (only `shadows.card`/`cardPop`/`pop`/`subtle` are allowed)
- **Buttons are pills** — `radius.full` (999), filled, no outline-only. Use `PillButton` / `StickerButton`. Cards use `radius.lg` (28); inputs `radius.md` (20)
- **Expo Router navigation** — `router.push()` / `router.replace()`, never `navigation.navigate()`
- **Zustand v5 named import** — `import { create } from 'zustand'`
- **React Query v5 object syntax** — `useQuery({ queryKey: [...], queryFn: ... })`
- **TypeScript strict** — no `any`, no implicit returns on non-void functions
- **Mode-aware components** — branch on `useModeStore`; don't create per-mode siblings unless the difference is large
- **Pillar data lives in `lib/`** — `pillars.ts`, `pregnancyPillars.ts`, `prePregPillars.ts`
- **Compress images < 1MB** via `expo-image-manipulator` before any upload
- **`profiles.id` = auth user UUID** — filter `.eq('id', userId)`, not `.eq('user_id', …)`
- **Local dates for log_date** — use `toDateStr(new Date())`, not `toISOString().split('T')[0]`
- **Realtime** only for chat messages + nanny notes — everything else polls
- **User works on `main`** — don't create worktrees / feature branches by default

See [`.claude/rules/code-style.md`](.claude/rules/code-style.md) and [`.claude/rules/supabase.md`](.claude/rules/supabase.md) for full conventions.

---

## Subscription Model

| Tier | Price | Includes |
|------|-------|----------|
| Free | $0 | Chat, browse pillars, 3 scans / month |
| Premium | $9.99/mo or $69.99/yr | Unlimited scans + chat, insights, vaccine reminders |

Paywall triggered at `app/paywall.tsx`. RevenueCat initialized in `lib/revenue.ts`.

---

## Environment Variables

```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
REVENUECAT_API_KEY              # optional in dev
ANTHROPIC_API_KEY               # Supabase secret only — NEVER in app bundle
```

---

## Recent Evolution (since April 2026)

- **Cream-paper / sticker-collage redesign** shipped across light + dark; supersedes neon-dark-purple
- **Pregnancy:** live week from due date, journey ring with structured weekly log readout, unified Today summary card, user reminders, birth guide collapsed-by-default, mood bubble chart, sticker hero, profile editing
- **Kids:** nutrition ranking, breastfeeding insights, sticker log forms, mood bubble cluster (replaced line chart), sleep detail modal, custom range modal
- **Health/Vaccines:** vaccine branch tree (replaced BlockTower), vaccine date picker as sticker card, info modal
- **Analytics:** interactive charts, polished detail modals, MoodBubbleCluster replacing MoodDistribution
- **Agenda:** restyled segmented tabs, week strip, child selectors, date range pills in sticker style
- **Chat:** restyled Past Conversations panel; added `grandma-chat` edge function alongside `nana-chat`
- **Food:** `food-ai` edge function for photo → nutrition ranking
- **i18n:** 12 languages + English wired via `useLanguageStore`; ~180/500 keys translated (7-wave plan)
