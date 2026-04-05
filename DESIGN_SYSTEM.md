# grandma.app — Design System & Technical Reference

> **Tech Stack:** React Native + Expo Router + TypeScript + NativeWind. State: Zustand v5. Data fetching: React Query. Backend: Supabase. Auth: Supabase Auth. Payments: RevenueCat. Analytics: PostHog. File location: `app/(tabs)/` for tab screens, `components/` for shared components.

---

## Project Structure

```
app/
├── (auth)/                    # Auth screens (not logged in)
│   ├── _layout.tsx
│   ├── welcome.tsx            # Splash / landing
│   ├── sign-in.tsx            # Email + social sign in
│   └── sign-up.tsx            # Email + social sign up
│
├── onboarding/                # First-time user setup
│   ├── _layout.tsx
│   ├── journey.tsx            # Pick mode: pre-preg / pregnancy / kids
│   ├── parent-name.tsx        # "How shall I call you?"
│   ├── due-date.tsx           # Pregnancy only: due date / LMP
│   ├── baby-name.tsx          # Optional baby name
│   ├── activities.tsx         # Pick tracking activities (mode-specific)
│   └── child-profile.tsx      # Final: allergies, birth date, begin journey
│
├── (tabs)/                    # Main app (logged in)
│   ├── _layout.tsx            # Tab navigator (dynamic per mode)
│   ├── index.tsx              # HOME — 3 variants (pre-preg / pregnancy / kids)
│   ├── agenda.tsx             # PLANNER/CALENDAR/AGENDA — 3 variants
│   ├── library.tsx            # LIBRARY — Guru Grandma AI chat + pillars
│   ├── vault.tsx              # VAULT/DOCUMENTS — pregnancy + kids only
│   ├── exchange.tsx           # GARAGE — marketplace
│   └── settings.tsx           # SETTINGS — profile, theme, admin
│
├── pillar/[id].tsx            # Pillar detail screen
├── scan.tsx                   # Camera scan (medicine/food)
├── paywall.tsx                # Subscription gate
├── manage-caregivers.tsx      # Caregiver list
├── invite-caregiver.tsx       # Send invite
├── accept-invite.tsx          # Accept invite flow
├── child-picker.tsx           # Switch active child
├── airtag-setup.tsx           # Location tracking setup
├── birth-plan.tsx             # Birth type explorer
├── channels/                  # Community forums
│   ├── index.tsx
│   ├── [id].tsx
│   └── thread/[id].tsx
├── exchange/                  # Marketplace detail screens
│   ├── [id].tsx
│   └── create.tsx
└── _layout.tsx                # Root layout (auth guard, ThemeProvider, QueryClient)

components/
├── ui/                        # Shared design system components
│   ├── CosmicBackground.tsx   # Gradient bg with theme support
│   ├── GlassCard.tsx          # Frosted glass card
│   ├── GradientButton.tsx     # Gradient CTA button
│   ├── ThemeProvider.tsx       # Dark/light theme context
│   ├── DatePickerField.tsx    # Date input
│   └── ResultCard.tsx         # Scan result display
│
├── home/                      # Home tab components
│   ├── ModeSwitcher.tsx       # Pre-Preg/Pregnancy/Kids toggle (admin)
│   ├── GrandmaBall.tsx        # Cosmic AI orb (kids home)
│   ├── PillarGrid.tsx         # 2-column pillar grid (kids)
│   ├── PregnancyWeekDisplay.tsx
│   ├── BabySizeCard.tsx
│   ├── DevelopmentInsight.tsx
│   ├── DailyPulse.tsx
│   ├── GrandmaWisdom.tsx
│   ├── MomentsOfCare.tsx
│   ├── MilkTracker.tsx
│   ├── NannyUpdatesFeed.tsx
│   └── ActivityCard.tsx
│
├── prepreg/                   # Pre-pregnancy specific
│   ├── CyclePhaseRing.tsx     # 28-dot moon phase ring
│   ├── WeekStrip.tsx          # Horizontal week calendar
│   ├── HormoneChart.tsx       # SVG hormone wave chart
│   ├── HealthDashboard.tsx    # Hydration, sleep, supplements
│   ├── DailyInsights.tsx      # Phase-specific insight cards
│   ├── ChecklistCard.tsx
│   ├── LearningModule.tsx
│   └── PartnerView.tsx
│
├── agenda/                    # Planner/Agenda components
│   ├── CalendarView.tsx       # Month/week/day calendar
│   ├── ActivityTimeline.tsx   # Chronological entries (kids)
│   ├── FoodDashboard.tsx      # Meal tracking (kids)
│   ├── NannyNotesPanel.tsx    # Bidirectional notes (kids)
│   ├── CycleTracker.tsx       # Full cycle view (pre-preg)
│   ├── PrePregChecklist.tsx   # 10-item checklist (pre-preg)
│   ├── AppointmentList.tsx    # Doctor visits (pre-preg + pregnancy)
│   ├── SymptomLogger.tsx      # Symptom grid (pregnancy)
│   ├── KickCounter.tsx        # Kick tracker (pregnancy 28+)
│   └── ContractionTimer.tsx   # Contraction tracker (pregnancy 36+)
│
├── pregnancy/                 # Pregnancy specific
│   ├── BirthTypeCard.tsx
│   ├── MilkControl.tsx
│   ├── PartnerDashboard.tsx
│   └── WeeklyInsight.tsx
│
├── kids/
│   └── LocationCard.tsx       # AirTag location
│
├── vault/
│   ├── EmergencyCard.tsx
│   ├── DocumentSection.tsx
│   ├── DocumentUpload.tsx
│   └── VaccineRecord.tsx
│
├── exchange/
│   └── ListingCard.tsx
│
├── channels/
│   ├── ChannelCard.tsx
│   └── ThreadCard.tsx
│
├── pillar/
│   ├── PillarCard.tsx
│   └── TipCard.tsx
│
└── auth/
    └── SocialAuthButtons.tsx

store/                          # Zustand v5 state management
├── useModeStore.ts             # Journey mode (persisted AsyncStorage)
├── useThemeStore.ts            # Dark/light theme (persisted)
├── useJourneyStore.ts          # Onboarding data (dueDate, parentName, etc.)
├── useChildStore.ts            # Children + active child
├── useChatStore.ts             # AI chat messages
├── usePregnancyStore.ts        # Pregnancy-specific state
├── useExchangeStore.ts         # Marketplace listings
├── useFoodStore.ts             # Food entries
├── useVaultStore.ts            # Documents + emergency card
└── useChannelsStore.ts         # Community channels

lib/                            # Business logic + data
├── supabase.ts                 # Supabase client
├── claude.ts                   # AI chat (callNana → edge function)
├── cycleLogic.ts               # Menstrual cycle engine (phases, fertility, predictions)
├── modeConfig.ts               # Per-mode config registry (tabs, pillars, vault, filters)
├── pillars.ts                  # Kids pillars (9)
├── pregnancyPillars.ts         # Pregnancy pillars (9)
├── prePregPillars.ts           # Pre-pregnancy pillars (6)
├── pregnancyData.ts            # 40-week baby development data
├── prepregnancyData.ts         # Pre-conception learning modules + checklist
├── auth-providers.ts           # Apple/Google sign-in helpers
├── revenue.ts                  # RevenueCat init
├── vault.ts                    # Document CRUD
├── exchange.ts                 # Marketplace CRUD
├── channels.ts                 # Forum CRUD
└── foodTracking.ts             # Food log helpers

constants/
└── theme.ts                    # Design tokens (colors, spacing, typography, shadows)

types/
└── index.ts                    # TypeScript types (JourneyMode, Pillar, Child, etc.)

supabase/
├── functions/
│   └── nana-chat/index.ts      # Guru Grandma AI edge function (Deno)
└── migrations/
    ├── 20260330_child_caregivers.sql
    └── 20260403_mode_awareness.sql
```

---

## 3 Journey Modes

| | Pre-Pregnancy | Pregnancy | Kids |
|---|---|---|---|
| **Audience** | Trying to conceive | Expecting | Parents with baby/child |
| **Profile color** | Pink `#FF8AD8` | Purple `#B983FF` | Blue `#4D96FF` |
| **Profile badge** | "TRYING TO CONCEIVE" | "WEEK {X}" | Age ("8M OLD") |
| **Tab: Home** | Cycle ring, hormone chart, daily decode | Week display, baby size, development | Grandma Ball, pillar grid |
| **Tab: Planner** | Cycle / Checklist / Appointments | Timeline / Symptoms / Kicks | Timeline / Food / Notes |
| **Tab: Library** | 6 fertility pillars | 9 pregnancy pillars | 9 kids pillars |
| **Tab: Vault** | Hidden | Documents (ultrasound, tests, birth plan) | Vault (exams, hospital, vaccines) |
| **Tab: Garage** | Maternity Wear, Prenatal, Books | + Nursery Setup, Baby Gear | Clothing, Toys, Gear, Furniture |
| **Tab: Settings** | Pink profile, no caregivers | Purple profile, due date | Blue profile, caregivers |

---

## Color Tokens

### Dark Theme (Primary)
```
background:    #1A1030     // cosmic deep purple
surface:       #241845     // card backgrounds
surfaceGlass:  rgba(255,255,255,0.05)  // frosted glass
text:          #FFFFFF
textSecondary: rgba(255,255,255,0.50)
textTertiary:  rgba(255,255,255,0.30)
border:        rgba(255,255,255,0.10)
tabBar:        #1A1030
```

### Neon Accent Palette
```
yellow:  #F4FD50  // Primary CTA, active tab, highlights
pink:    #FF8AD8  // Period, pre-preg, sparkles
green:   #A2FF86  // Ovulation, success, checkboxes
purple:  #B983FF  // Luteal, dark mode, cosmic
orange:  #FF6B35  // Sign out, warnings
blue:    #4D96FF  // Kids mode, hydration, info
```

### Light Theme
```
background:    #F2F2F7
surface:       #FFFFFF
text:          #111111
textSecondary: #555555
textTertiary:  #888888
border:        rgba(0,0,0,0.12)
```

---

## Component Patterns

### Glass Card
```
bg: rgba(255,255,255,0.05)
border: 1px solid rgba(255,255,255,0.10)
borderRadius: 32px
padding: 20-24px
```

### Primary CTA
```
bg: #F4FD50
height: 56-72px
borderRadius: 999 (pill)
text: #1A1030, 18px, weight 800
shadow: #F4FD50, opacity 0.3, radius 25
```

### Glass Input
```
bg: rgba(255,255,255,0.04)
border: 1px solid rgba(255,255,255,0.10)
height: 72px
borderRadius: 36px
padding: 0 28px
text: #FFF 16px weight 600
placeholder: rgba(255,255,255,0.25)
```

### Tab Bar
```
bg: #1A1030
borderTop: 1px solid rgba(255,255,255,0.05)
height: 84px (pb: 34px safe area)
activeColor: #F4FD50
inactiveColor: rgba(255,255,255,0.40)
labels: 10px, weight 700, uppercase
```

---

## Supabase Tables

| Table | Mode | Purpose |
|-------|------|---------|
| `profiles` | All | User profile + `journey_mode` column |
| `children` | All | Child records |
| `child_caregivers` | Kids | Caregiver roles, permissions, invite status |
| `activity_logs` | Kids | Daily activity entries (feeding, sleep, etc.) |
| `chat_messages` | All | AI conversation history |
| `scan_history` | All | Medicine/food scan records |
| `nanny_notes` | Kids | Bidirectional parent ↔ caregiver notes |
| `cycle_logs` | Pre-Preg | Period, ovulation, symptom, basal temp logs |
| `pregnancy_logs` | Pregnancy | Symptom, weight, kick count, contraction logs |
| `appointments` | Pre-Preg + Pregnancy | Doctor visits with type + mode |
| `checklist_progress` | Pre-Preg | Pre-conception checklist completion |
| `vault_documents` | Pregnancy + Kids | Medical document storage |
| `emergency_cards` | Pregnancy + Kids | Emergency medical profile |
| `vaccine_records` | Kids | Vaccination history |
| `exchange_listings` | All | Marketplace listings |
| `exchange_comments` | All | Listing comments |
| `exchange_saves` | All | Saved/bookmarked listings |

---

## AI System

**Edge Function:** `supabase/functions/nana-chat/index.ts` (Deno)
**Model:** Claude Sonnet via Anthropic API
**Character:** Guru Grandma — warm, wise, never diagnoses
**Mode-aware:** System prompt adapts per mode (pre-preg fertility focus, pregnancy week-specific, kids child context)
**Pillar-aware:** 24 pillar-specific guidance notes
**Safety:** Never invents dosages, always recommends consulting healthcare professional
