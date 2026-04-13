# grandma.app — Claude Context

Parenting companion app covering **Pre-Pregnancy → Pregnancy → Kids**. The entire UI adapts based on the user's active journey mode. Powered by Claude AI (Guru Grandma), Expo + Supabase + RevenueCat. Dark neon theme.

---

## Tech Stack

| Layer | Tech | Critical Notes |
|-------|------|---------------|
| Mobile | Expo SDK 54 + React Native 0.81 | |
| Navigation | Expo Router v6 | File-based routing — screen = file |
| Styling | NativeWind 4 + TailwindCSS 4 + StyleSheet | Use StyleSheet for dynamic styles, NativeWind for static |
| State | Zustand v5 | Named export: `import { create } from 'zustand'` NOT default import |
| Data | TanStack React Query v5 | `useQuery({ queryKey, queryFn })` object syntax, NOT positional args |
| Backend | Supabase | Auth + PostgreSQL + Edge Functions + Storage |
| AI | Claude Sonnet `claude-sonnet-4-20250514` | Via Supabase Edge Functions only, never called directly from app |
| Payments | RevenueCat | `react-native-purchases` v9 |
| Language | TypeScript strict | All routes are typed |

### Critical Syntax
```ts
// Zustand v5 — ALWAYS named import
import { create } from 'zustand'

// React Query v5 — ALWAYS object syntax
const { data } = useQuery({ queryKey: ['key'], queryFn: fetchFn })

// Expo Router typed routes
import { router } from 'expo-router'
router.push('/screen-name')
```

---

## 3 Journey Modes

The app's entire UI is driven by `useModeStore`. Every screen, tab label, pillar set, and content block adapts to the active mode.

| | Pre-Pregnancy | Pregnancy | Kids |
|--|--|--|--|
| Color | Pink `#FF8AD8` | Purple `#B983FF` | Blue `#4D96FF` |
| Home | Cycle ring + hormone chart + fertile window | Week display + baby size + daily pulse | Premium dashboard: sleep circle, mood, calories, growth leaps + pillar grid |
| Planner | Cycle / Checklist / Appointments | Timeline / Symptoms / Kicks | Timeline / Food / Notes |
| Library | 6 fertility pillars | 9 pregnancy pillars | 9 kids pillars |
| Vault | Hidden | Ultrasound, tests, birth plan | Exams, hospital, vaccines |

Mode is persisted via AsyncStorage. Users switch via ModeSwitcher pill on home screen.

---

## Design Tokens — `constants/theme.ts`

### Dark Theme (default)
```
bg:            #0E0B1A     // deep dark with purple tint
bgWarm:        #140F28     // slightly warmer dark background
surface:       #1A1430     // card backgrounds
surfaceRaised: #231B42     // elevated/nested cards
surfaceGlass:  rgba(255,255,255,0.06)
text:          #FFFFFF
textSecondary: rgba(255,255,255,0.65)
textMuted:     rgba(255,255,255,0.35)
border:        rgba(255,255,255,0.12)
borderLight:   rgba(255,255,255,0.06)
tabBar:        #0E0B1A
```

### Brand & Accent Palette
```
primary:       #7048B8  →  #A07FDC (dark mode lightened)  // Purple — primary buttons, active states
primaryLight:  #9B70D4  →  #C4A8F0 (dark mode)
secondary:     #3B7DD8  →  #6AABF7 (dark mode)           // Blue — secondary actions
accent:        #F59E0B  →  #FBBF24 (dark mode)           // Amber — secondary highlights (NOT primary CTA)

// Journey mode colors
prePregnancy:  #FF8AD8   // Pink — cycle, period, breastfeeding
pregnancy:     #B983FF   // Purple — milestones, layette
kids:          #4D96FF   // Blue — vaccines, hydration, info

// Neon palette (used for pillar cards and special elements)
green:         #A2FF86   // Ovulation, success, feeding
orange:        #FF6B35   // Recipes, insurance, sign-out
```

### Component Patterns
```
// Glass Card
bg: rgba(255,255,255,0.06)
border: 1px rgba(255,255,255,0.12)
borderRadius: 32px
padding: 20-24px

// Primary Button (purple)
bg: #7048B8 (gradient to #4A2880)
height: 56-72px
borderRadius: 999px
text: #FFFFFF, 18px, weight 700
shadow: #7048B8 opacity 0.4 radius 25

// Glass Input
bg: rgba(255,255,255,0.04)
height: 72px
borderRadius: 36px
padding: 0 28px

// Tab Bar
height: 84px (pb: 34px safe area)
active: #A07FDC (purple)
inactive: rgba(255,255,255,0.40)
labels: 10px weight 700 uppercase

// Child Selector Pills
bg: rgba(255,255,255,0.06)
activeBg: mode color with opacity
borderRadius: 999px
border: 1px rgba(255,255,255,0.12)
```

### Typography (fonts in use)
- **Cabinet Grotesk** (`CabinetGrotesk-Black`) — Display headings, titles (uppercase, tight tracking)
- **Satoshi** (`Satoshi-Variable`) — Body text, descriptions, all UI labels

---

## File Structure

```
app/
├── (auth)/          welcome, sign-in, sign-up
├── onboarding/      journey, parent-name, due-date, baby-name, activities, child-profile
├── (tabs)/          index(home), agenda, library, vault, exchange(garage), settings
├── profile/         account, kids, care-circle, badges, health-history, memories
├── channel/         index, [id], create, thread/[id]
├── garage/          [id], create, share, profile
├── pillar/[id]      Pillar detail
├── grandma-talk     Full AI chat screen
├── insights         Analytics + history tab
├── leaderboard      Community rankings
├── daily-rewards    Streaks + badges
├── notifications    Notification center
├── connections      Care circle
├── scan, paywall, birth-plan, airtag-setup, child-picker
├── invite-caregiver, manage-caregivers, accept-invite

components/
├── ui/              GlassCard, GradientButton, CosmicBackground, DatePickerField, ResultCard
├── home/            GrandmaBall, ModeSwitcher, PillarGrid, CyclePhaseRing, HormoneChart,
│                    PregnancyWeekDisplay, BabySizeCard, DevelopmentInsight, DailyPulse,
│                    GrandmaWisdom, MomentsOfCare, MilkTracker, NannyUpdatesFeed, ActivityCard
├── prepreg/         CyclePhaseRing, WeekStrip, HormoneChart, HealthDashboard, DailyInsights
├── agenda/          CalendarView, ActivityTimeline, FoodDashboard, NannyNotesPanel,
│                    CycleTracker, SymptomLogger, KickCounter, ContractionTimer
├── kids/            LocationCard, SleepCircle, MoodAnalysis, CaloriesCard, GrowthLeaps
├── pregnancy/       BirthTypeCard, MilkControl, PartnerDashboard, WeeklyInsight
├── vault/           EmergencyCard, DocumentSection, DocumentUpload, VaccineRecord
├── exchange/        ListingCard
├── channels/        ChannelCard, ThreadCard
├── pillar/          PillarCard, TipCard
├── insights/        InsightCard, MetricsHighlight
└── auth/            SocialAuthButtons

lib/
├── supabase.ts          Supabase client (ExpoSecureStoreAdapter for tokens)
├── claude.ts            callNana() → invokes edge function
├── cycleLogic.ts        Menstrual cycle engine (phases, fertility, predictions)
├── modeConfig.ts        Per-mode config (tabs, pillars, vault sections, filters)
├── pillars.ts           Kids pillars (9)
├── pregnancyPillars.ts  Pregnancy pillars (9)
├── prePregPillars.ts    Pre-pregnancy pillars (6)
├── pregnancyData.ts     40-week baby development data
├── notificationEngine.ts Notification system
├── insights.ts          Analytics engine
├── leaderboard.ts       Points + rankings
├── badgeSync.ts         Badge award logic
├── channels.ts          Community CRUD
├── channelPosts.ts      80+ channel seed data
├── garage.ts            Marketplace helpers
└── auth-providers.ts    Apple/Google sign-in
```

---

## Zustand Stores — `store/`

| Store | What it holds |
|-------|--------------|
| `useModeStore` | Active journey mode (pre-preg / pregnancy / kids) — persisted |
| `useThemeStore` | Dark/light theme — persisted |
| `useChildStore` | Children array + active child + caregiver role/permissions |
| `useChatStore` | AI chat message history |
| `useJourneyStore` | Onboarding data (parentName, dueDate, babyName, activities) |
| `useOnboardingStore` | General onboarding state |
| `useCycleOnboardingStore` | Pre-pregnancy onboarding |
| `usePregnancyOnboardingStore` | Pregnancy onboarding |
| `useKidsOnboardingStore` | Kids onboarding |
| `usePregnancyStore` | Week, weight, mood, symptoms |
| `useFoodStore` | Food entries + ratings |
| `useVaultStore` | Documents + emergency card |
| `useExchangeStore` | Marketplace listings + saved |
| `useChannelsStore` | Channels + threads |
| `useBehaviorStore` | Journey modes & behaviors |
| `useBadgeStore` | Achievement badges |
| `useGoalsStore` | User goals |
| `useNotificationsStore` | Notification state |

---

## Supabase Edge Functions — `supabase/functions/`

| Function | JWT | Purpose |
|----------|-----|---------|
| `nana-chat` | no-verify | Guru Grandma AI — 3-mode context + 24 pillar prompts |
| `scan-image` | no-verify | Claude Vision — 4 scan types with child context |
| `generate-insights` | no-verify | Analytics generation per mode |
| `invite-caregiver` | required | Token-based caregiver invite |
| `accept-invite` | required | Token verification + user linking |
| `revenuecat-webhook` | no-verify | Subscription status sync |

Deploy all: `supabase functions deploy <name> [--no-verify-jwt]`

---

## Database — Key Tables

```
profiles          — user account + health data
behaviors         — journey mode per user (pre-preg/pregnancy/kids)
children          — child records (name, dob, allergies, blood type, pediatrician)
care_circle       — caregivers (partner/nanny/family/doctor) + permissions + invite tokens
child_logs        — activity logs (feeding/sleep/diaper/mood/vaccine/medicine)
cycle_logs        — pre-pregnancy tracking (period/ovulation/symptom/basal_temp)
pregnancy_logs    — pregnancy tracking (symptom/weight/kick/contraction)
channel_posts     — community forum messages
channel_ratings   — votes on posts
garage_listings   — marketplace items (sell/trade/donate)
insights          — generated analytics (by pillar + date)
badges            — achievement system
leaderboard       — points + rankings
notifications     — push + in-app notifications
vault_documents   — medical records
emergency_cards   — blood type, allergies, emergency contacts
vaccine_records   — vaccination history
```

All tables have RLS. Care circle members access children based on `permissions[]` array.

---

## Key Coding Rules

- **Never call Claude API directly from the app** — always via Supabase Edge Functions
- **Never mock the mode system** — use `useModeStore` everywhere, don't hardcode mode checks
- **Dark theme is default** — always use tokens from `constants/theme.ts`, never raw hex values inline
- **Expo Router navigation** — use `router.push()` / `router.replace()`, never `navigation.navigate()`
- **Zustand v5 named import** — `import { create } from 'zustand'`
- **React Query v5 object syntax** — `useQuery({ queryKey: [...], queryFn: ... })`
- **TypeScript strict** — no `any`, no implicit returns on non-void functions
- **Components are mode-aware** — check `useModeStore` for conditional rendering, don't create separate components per mode unless the difference is large
- **Pillar data lives in lib/** — `pillars.ts` (kids), `pregnancyPillars.ts`, `prePregPillars.ts`
- **Images go through expo-image-manipulator** before any upload (compress to <1MB)

---

## Subscription Model

| Tier | Price | Gate |
|------|-------|------|
| Free | $0 | Chat, browse pillars, 3 scans |
| Premium | $9.99/mo or $69.99/yr | Unlimited scans + chat, insights, vaccine reminders |

Paywall triggered at `app/paywall.tsx`. RevenueCat initialized in `lib/revenue.ts`.

---

## Environment Variables

```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
ANTHROPIC_API_KEY          (Supabase secret, not in app)
REVENUECAT_API_KEY
```
