# grandma.app

**The parenting wisdom of a grandmother, available 24/7.**

A full-platform parenting companion covering the entire journey — **Pre-Pregnancy, Pregnancy, and Kids/Baby** — with AI-powered chat (Guru Grandma), camera scanning, 40-week pregnancy tracking, a social marketplace (Grandma's Garage), community channels, activity logging, food tracking, caregiver collaboration, secure document storage (Vault), and a premium subscription model.

Dark cosmic theme. Powered by Claude AI. Built with Expo + Supabase + RevenueCat.

---

## App Modes

The app adapts its entire UI based on the user's journey:

| Mode | Audience | Core Features |
|------|----------|---------------|
| **Pre-Pregnancy** | Want-to-be parents | Learning modules, preparation checklists, partner view, community |
| **Pregnancy** | Expecting parents | 40-week tracking, baby development, birth planning, milk control, partner dashboard |
| **Kids/Baby** | Parents with children | Pillar-based tracking, food calendar, nanny notes, AirTag location, activity logging |

Users can switch modes at any time via the Mode Switcher on the home screen.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Mobile | Expo SDK 54 + React Native 0.81 | Cross-platform iOS/Android app |
| Navigation | Expo Router v6 | File-based routing with 6 tabs + modals |
| Styling | StyleSheet + expo-linear-gradient + expo-blur | Dark cosmic theme with glassmorphism |
| Animations | react-native-reanimated | Grandma ball, transitions, effects |
| Backend | Supabase | Auth (email + Apple + Google), PostgreSQL, Edge Functions, Storage |
| AI | Claude Sonnet API | Guru Grandma chat + image analysis via Edge Functions |
| State | Zustand v5 (7 stores) | Client-side state management |
| Data Fetching | TanStack React Query v5 | Server state, caching, date-based queries |
| Payments | RevenueCat | Subscriptions, paywall, receipt validation |
| Language | TypeScript (strict) | End-to-end type safety with typed routes |

---

## Features

### Guru Grandma (AI Chat)
- Interactive AI advisor for ALL parenting topics: pre-pregnancy, pregnancy, birthing, education, nutrition, vaccines, emergencies
- Child/pregnancy context injected into every request (name, age/week, weight, allergies, medications)
- 9 knowledge pillar system prompts for specialized answers
- Chat history persisted to Supabase (last 50 messages per session)
- Strong "I'm not your doctor" disclaimer — advises consulting healthcare professionals
- Safety rules: no diagnosis, weight-based dosages only, always suggests pediatrician

### 3-Mode Home Screen
- **Pre-Pregnancy:** GrandmaBall + learning modules + preparation checklist + partner connection
- **Pregnancy:** Week display with moon phases + animated globe + baby size card + development insight + daily pulse (weight/mood/symptoms) + Grandma's Wisdom quotes + Moments of Care (wellness activities) + milk tracker
- **Kids/Baby:** GrandmaBall + 2x4 pillar grid with last activity + nanny updates feed + food dashboard + AirTag location card

### 40-Week Pregnancy Tracking
- Week-by-week baby size comparisons (poppy seed to pumpkin)
- Moon phase names for each week
- Development facts and mom tips per week
- Daily Pulse: weight tracking, mood (radiant/calm/tired/anxious/nauseous/energetic), symptom logging
- Grandma's Wisdom: rotating personalized quotes
- Moments of Care: Stardust Stretching, Deep Sleep Ritual

### Birth Planning
- 4 birth type explorer: Natural, C-section, Home Birth, Water Birth
- Pros/cons and what-to-expect for each type
- Hospital bag checklist (for mom, baby, and partner)

### Camera Scanning
- 4 scan types: `medicine`, `food`, `nutrition`, `general`
- Image compressed to under 1MB (1024px width, 0.7 quality) before sending
- Claude Vision API analyzes with child-specific context
- Scan history saved with structured JSON results
- Free tier: 3 scans per child, then paywall

### Agenda (Calendar + Food + Nanny Notes)
- Monthly calendar with activity dot indicators and month navigation
- 3 sub-tabs: Timeline, Food, Notes
- **Timeline:** Vertical chronological activity log with colored icons, timestamps, "logged by" attribution
- **Food Dashboard:** Meal tracking status (breakfast/lunch/dinner/snack), photo-based food logging with 5-star rating, AI-powered nutrition tips
- **Nanny Notes:** Bidirectional parent-to-nanny and nanny-to-parent notes with category pills (schedule, nutrition, medication, behavior, general)

### Vault (Baby Health Space)
- **Emergency Card:** Blood type, allergies, medical conditions, primary contact, pediatrician, "Broadcast to EMS" (native share sheet)
- **Vaccine Records:** Visual checklist with administered/pending states and dose tracking
- **Document Sections:** Exams, Hospital Records, Insurance — collapsible with file count, download, and upload
- **Document Upload:** Camera scan or file picker, stored in Supabase Storage
- **Recent Documents** list with file type/size/date

### Grandma's Garage (Social Marketplace)
- Social feed for trading, selling, or donating baby items
- Post types: Sell, Trade, Donate (free)
- Categories: Clothing, Toys, Gear, Furniture, Books, Other
- Listing cards with photos, type badge, price, condition, age range
- Social interactions: save/bookmark, comment, share
- Deal flow: Available > Interested > Pending > Completed
- Create listing form with type/category/condition pickers

### Community Channels
- Forum-style discussion spaces (inside Library tab)
- Channel browser with member count and category
- Thread-based discussions with pinned threads
- Reply system with real-time posting
- Topic categories: Birth stories, Breastfeeding support, Sleep training, Recipes, Local meetups, and more

### AirTag Location Tracking
- Connect Apple AirTag to track child's location
- Location card on Kids home screen
- 3-step setup modal with Bluetooth pairing guide
- Last known location with map placeholder

### 9 Knowledge Pillars
Each pillar has 3 tips + 4 suggestion chips that deep-link into a pillar-scoped chat:

| ID | Icon | Name | Description |
|----|------|------|-------------|
| `milk` | Baby Bottle | Breastfeeding | Formula, breastfeeding, bottles, transition milestones |
| `food` | Avocado | Feeding | Introducing solids, meal plans, age-appropriate textures |
| `nutrition` | DNA | Nutrition | Vitamins, minerals, supplementation guidance |
| `vaccines` | Syringe | Vaccines | CDC/WHO schedule, reactions, post-vaccine care |
| `clothes` | Baby | Layette | Clothing sizes, brand conversions, seasonal guides |
| `recipes` | Pot of Food | Recipes | Age-appropriate meals, allergen-safe cooking |
| `habits` | Herb | Habits & Natural Care | Evidence-backed home care, routines, when to see a doctor |
| `medicine` | Pill | Medicine | Weight-based dosages, safety, interactions |
| `milestones` | Star | Milestones | Developmental tracking, celebrating firsts |

### 3-Journey Onboarding (6 screens)
1. **Journey Selection** — "I want to be pregnant" / "I'm pregnant" / "I have kids"
2. **Parent Name** — "How shall I call you, dear?"
3. **Due Date / LMP** (pregnancy only) — Date picker with week calculator
4. **Baby Name** — Optional for pregnancy, required for kids
5. **Activity Tracking** — Select activities per journey (different lists for pre-preg/pregnancy/kids)
6. **Child Profile** — Birth date, weight, allergies + "Begin My Journey" CTA

### Authentication
- Email + password (sign in / sign up)
- Apple Sign-In (native iOS)
- Google Sign-In (OAuth)
- Dark cosmic themed auth screens

### Caregiver Invite System
- Invite nannies or family members by email
- 3 roles: `parent`, `nanny`, `family`
- Granular permissions: `view`, `log_activity`, `chat`
- Secure token-based invite flow
- Manage caregivers screen: view status, revoke access

### Pre-Pregnancy Content
- 6 learning modules: Fertility Basics, Nutrition Prep, Emotional Readiness, Financial Planning, Partner's Journey, Pre-Conception Health
- 10-item preparation checklist with progress tracking
- Partner invitation and shared view

### Milk Control
- Track breast (left/right), bottle, and pump sessions
- Quick-start buttons with session history
- Available in both Pregnancy and Kids modes

### Premium Subscription
| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | Chat with Grandma, browse all 9 pillars, 3 free scans |
| Premium | $9.99/mo or $69.99/yr | Unlimited scans, unlimited chat, vaccine reminders, priority responses |

- 7-day free trial on premium
- Managed by RevenueCat SDK
- Subscription status synced to Supabase via webhook

---

## Project Structure

```
grandma-app/
├── app/                                    # Expo Router screens (file-based routing)
│   ├── _layout.tsx                         # Root layout — auth guard, RevenueCat, child loading
│   ├── (auth)/                             # Authentication screens
│   │   ├── _layout.tsx                     # Auth stack layout
│   │   ├── welcome.tsx                     # "Welcome, Dear One." + social auth
│   │   ├── sign-in.tsx                     # Email/Apple/Google sign in
│   │   └── sign-up.tsx                     # Email/Apple/Google sign up
│   ├── onboarding/                         # Onboarding flow (6 screens)
│   │   ├── _layout.tsx                     # Onboarding stack
│   │   ├── journey.tsx                     # 3 journey cards (pre-preg/pregnancy/kids)
│   │   ├── parent-name.tsx                 # Parent's name input
│   │   ├── baby-name.tsx                   # Baby name (optional for pregnancy)
│   │   ├── due-date.tsx                    # Due date or LMP picker
│   │   ├── activities.tsx                  # Activity selection per journey
│   │   └── child-profile.tsx              # Child details + "Begin My Journey"
│   ├── (tabs)/                             # Main tab navigation (6 tabs)
│   │   ├── _layout.tsx                     # Tab bar: Home, Agenda, Library, Vault, Garage, Settings
│   │   ├── index.tsx                       # 3-mode home (pre-preg/pregnancy/kids)
│   │   ├── agenda.tsx                      # Calendar + timeline + food + nanny notes
│   │   ├── library.tsx                     # Guru Grandma chat + pillars + channels
│   │   ├── vault.tsx                       # Emergency card + documents + vaccines
│   │   ├── exchange.tsx                    # Grandma's Garage marketplace feed
│   │   └── settings.tsx                    # Profile + caregivers + scan history + sign out
│   ├── pillar/[id].tsx                     # Dynamic pillar detail (tips + suggestions)
│   ├── scan.tsx                            # Camera/photo scan (modal)
│   ├── paywall.tsx                         # Premium subscription (modal)
│   ├── birth-plan.tsx                      # Birth types + hospital bag checklist
│   ├── airtag-setup.tsx                    # AirTag connection setup (modal)
│   ├── child-picker.tsx                    # Switch between children (modal)
│   ├── invite-caregiver.tsx                # Invite nanny/family (modal)
│   ├── manage-caregivers.tsx               # List & revoke caregivers
│   ├── accept-invite.tsx                   # Accept caregiver invite
│   ├── channels/                           # Community forum screens
│   │   ├── index.tsx                       # Channel browser
│   │   ├── [id].tsx                        # Thread list per channel
│   │   └── thread/[id].tsx                 # Thread detail with replies
│   └── exchange/                           # Marketplace screens
│       ├── [id].tsx                        # Listing detail
│       └── create.tsx                      # Create new listing
│
├── components/                             # Reusable UI components
│   ├── ui/                                 # Foundation components
│   │   ├── GlassCard.tsx                   # Glassmorphism card (gradient + blur)
│   │   ├── GradientButton.tsx              # Primary/secondary/outline CTA button
│   │   ├── CosmicBackground.tsx            # Dark gradient background wrapper
│   │   ├── DatePickerField.tsx             # Dark themed date picker
│   │   └── ResultCard.tsx                  # Scan result bottom sheet
│   ├── auth/
│   │   └── SocialAuthButtons.tsx           # Apple + Google sign-in buttons
│   ├── home/                               # Home screen components
│   │   ├── GrandmaBall.tsx                 # Animated grandma silhouette sphere
│   │   ├── ModeSwitcher.tsx                # 3-mode toggle pill
│   │   ├── PillarGrid.tsx                  # 2x4 pillar card grid
│   │   ├── PregnancyWeekDisplay.tsx        # Week number + moon phase + globe
│   │   ├── BabySizeCard.tsx                # Days to go + baby size comparison
│   │   ├── DevelopmentInsight.tsx           # Weekly baby development facts
│   │   ├── DailyPulse.tsx                  # Weight, mood, symptom tracking
│   │   ├── GrandmaWisdom.tsx               # Rotating wisdom quote card
│   │   ├── MomentsOfCare.tsx               # Wellness activity cards
│   │   ├── MilkTracker.tsx                 # Breast/bottle/pump tracker
│   │   ├── NannyUpdatesFeed.tsx            # Caregiver activity feed
│   │   └── ActivityCard.tsx                # Activity tracking card
│   ├── pillar/
│   │   ├── PillarCard.tsx                  # Pillar card for grid
│   │   └── TipCard.tsx                     # Knowledge tip card
│   ├── agenda/                             # Agenda tab components
│   │   ├── CalendarView.tsx                # Monthly calendar with dot indicators
│   │   ├── ActivityTimeline.tsx            # Vertical chronological timeline
│   │   ├── FoodPhotoEntry.tsx              # Photo meal capture + star rating
│   │   ├── FoodDashboard.tsx               # Daily meal tracking status
│   │   └── NannyNotesPanel.tsx             # Bidirectional notes with categories
│   ├── vault/                              # Vault tab components
│   │   ├── EmergencyCard.tsx               # Medical profile + EMS broadcast
│   │   ├── DocumentSection.tsx             # Collapsible document category
│   │   ├── DocumentUpload.tsx              # Camera scan or file upload
│   │   └── VaccineRecord.tsx               # Vaccine checklist with doses
│   ├── exchange/
│   │   └── ListingCard.tsx                 # Marketplace listing card
│   ├── channels/
│   │   ├── ChannelCard.tsx                 # Channel preview card
│   │   └── ThreadCard.tsx                  # Thread preview card
│   ├── kids/
│   │   └── LocationCard.tsx                # AirTag location card
│   ├── prepreg/                            # Pre-pregnancy components
│   │   ├── LearningModule.tsx              # Course/lesson card
│   │   ├── ChecklistCard.tsx               # Preparation checklist with progress
│   │   └── PartnerView.tsx                 # Partner invitation card
│   └── pregnancy/                          # Pregnancy enhancement components
│       ├── BirthTypeCard.tsx               # Birth type explorer card
│       ├── MilkControl.tsx                 # Full milk tracking view
│       ├── PartnerDashboard.tsx            # Partner's tips per week
│       └── WeeklyInsight.tsx               # Detailed weekly deep dive
│
├── constants/
│   └── theme.ts                            # Design tokens (colors, gradients, spacing, typography)
│
├── lib/                                    # Core business logic
│   ├── supabase.ts                         # Supabase client with SecureStore auth
│   ├── claude.ts                           # callNana() — Guru Grandma chat API
│   ├── scan.ts                             # scanImage() — Claude Vision API
│   ├── pillars.ts                          # 9 pillar definitions
│   ├── revenue.ts                          # RevenueCat helpers
│   ├── auth-providers.ts                   # Apple/Google Sign-In helpers
│   ├── pregnancyData.ts                    # 40-week pregnancy data (size, facts, moon phases)
│   ├── prepregnancyData.ts                 # Learning modules + preparation checklist
│   ├── birthData.ts                        # Birth types + hospital bag checklist
│   ├── foodTracking.ts                     # Food log Supabase helpers
│   ├── vault.ts                            # Document storage + emergency card helpers
│   ├── exchange.ts                         # Marketplace CRUD helpers
│   ├── channels.ts                         # Forum CRUD helpers
│   └── airtag.ts                           # AirTag location helpers
│
├── store/                                  # Zustand v5 state stores (7 stores)
│   ├── useChildStore.ts                    # Children + active child + role/permissions
│   ├── useChatStore.ts                     # Chat messages
│   ├── useJourneyStore.ts                  # Onboarding state (3 modes, parent/baby name)
│   ├── useModeStore.ts                     # Pre-Pregnancy / Pregnancy / Kids mode toggle
│   ├── usePregnancyStore.ts                # Pregnancy tracking (week, weight, mood, symptoms)
│   ├── useFoodStore.ts                     # Food entries and ratings
│   ├── useVaultStore.ts                    # Documents + emergency card
│   ├── useExchangeStore.ts                 # Marketplace listings + saved IDs
│   └── useChannelsStore.ts                 # Channels + threads
│
├── types/
│   └── index.ts                            # TypeScript interfaces & types
│
├── supabase/
│   ├── functions/
│   │   ├── nana-chat/index.ts              # Guru Grandma chat (Claude Sonnet)
│   │   ├── scan-image/index.ts             # Vision analysis (Claude Vision)
│   │   ├── invite-caregiver/index.ts       # Caregiver invite token
│   │   ├── accept-invite/index.ts          # Accept invite + link user
│   │   └── revenuecat-webhook/index.ts     # Subscription status sync
│   └── migrations/                         # Database migration files
│
├── app.json                                # Expo config (Apple Sign-In, plugins)
├── babel.config.js                         # Babel + reanimated plugin
├── tailwind.config.js                      # Tailwind/NativeWind config
├── tsconfig.json                           # TypeScript strict + typed routes
└── package.json                            # Dependencies and scripts
```

---

## Design System

Dark cosmic theme defined in `constants/theme.ts`:

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#0A0E1A` | Deep cosmic navy — app background |
| Surface | `#141829` | Card backgrounds |
| Surface glass | `rgba(255,255,255,0.06)` | Glassmorphism cards |
| Accent | `#F5C754` | Golden — buttons, active states, highlights |
| Accent glow | `#FFD97D` | Glow effects |
| Text | `#FFFFFF` | Primary text |
| Text secondary | `rgba(255,255,255,0.6)` | Body text, descriptions |
| Text tertiary | `rgba(255,255,255,0.35)` | Labels, placeholders |
| Border | `rgba(255,255,255,0.08)` | Card borders, dividers |
| Success | `#4ADE80` | Positive states |
| Error | `#F87171` | Errors, allergies |
| Warning | `#FBBF24` | Warnings, pending states |
| Pillar colors | 9 unique pastels | Per-pillar accent on dark backgrounds |

---

## Architecture

### Authentication & Routing

```
App opens
  └─ _layout.tsx checks Supabase session
      ├─ No session → (auth)/welcome
      └─ Has session
          ├─ Load profile + children via child_caregivers
          ├─ Initialize RevenueCat
          ├─ No children → /onboarding/journey
          └─ Has children → /(tabs) with mode from useModeStore
```

### State Management (7 Zustand stores)

| Store | Purpose |
|-------|---------|
| `useChildStore` | Active child + role/permissions |
| `useChatStore` | Chat messages |
| `useJourneyStore` | Onboarding (3 modes, names, dates, activities) |
| `useModeStore` | Pre-Pregnancy / Pregnancy / Kids toggle |
| `usePregnancyStore` | Week, weight, mood, symptoms |
| `useFoodStore` | Food entries + ratings |
| `useVaultStore` | Documents + emergency card |
| `useExchangeStore` | Marketplace listings + saved |
| `useChannelsStore` | Channels + threads |

### Navigation (6 tabs)

| Tab | Screen | Content |
|-----|--------|---------|
| Home | `(tabs)/index` | 3-mode adaptive home screen |
| Agenda | `(tabs)/agenda` | Calendar + timeline + food + nanny notes |
| Library | `(tabs)/library` | Guru Grandma chat + pillars + channels |
| Vault | `(tabs)/vault` | Emergency card + documents + vaccines |
| Garage | `(tabs)/exchange` | Grandma's Garage marketplace |
| Settings | `(tabs)/settings` | Profile + caregivers + sign out |

---

## Screens Overview (28 screens)

| Screen | Route | Description |
|--------|-------|-------------|
| Welcome | `(auth)/welcome` | "Welcome, Dear One." + Apple/Google/email auth |
| Sign In | `(auth)/sign-in` | Dark theme, social auth + email |
| Sign Up | `(auth)/sign-up` | Dark theme, social auth + "Begin Your Journey" |
| Journey | `onboarding/journey` | 3 GlassCards: Pre-Pregnancy / Pregnancy / Kids |
| Parent Name | `onboarding/parent-name` | "How shall I call you, dear?" |
| Baby Name | `onboarding/baby-name` | Optional baby name |
| Due Date | `onboarding/due-date` | Due date or LMP with week calculator |
| Activities | `onboarding/activities` | Activity selection per journey |
| Child Profile | `onboarding/child-profile` | Child details + "Begin My Journey" |
| Home | `(tabs)/index` | 3-mode home with ModeSwitcher |
| Agenda | `(tabs)/agenda` | Calendar + Timeline / Food / Notes tabs |
| Library | `(tabs)/library` | Guru Grandma + pillars + channels |
| Vault | `(tabs)/vault` | Emergency card + documents + vaccines |
| Garage | `(tabs)/exchange` | Marketplace feed with filters |
| Settings | `(tabs)/settings` | Profile, caregivers, scan history |
| Pillar Detail | `pillar/[id]` | Tips + suggestion chips |
| Scan | `scan` | Camera/gallery + 4 scan types (modal) |
| Paywall | `paywall` | Premium subscription offer (modal) |
| Birth Plan | `birth-plan` | 4 birth types + hospital bag checklist |
| AirTag Setup | `airtag-setup` | 3-step AirTag connection (modal) |
| Child Picker | `child-picker` | Switch between children (modal) |
| Invite Caregiver | `invite-caregiver` | Send nanny/family invite (modal) |
| Manage Caregivers | `manage-caregivers` | List + revoke caregivers |
| Accept Invite | `accept-invite` | Accept caregiver invitation |
| Channel Browser | `channels/` | Discover and join channels |
| Channel Detail | `channels/[id]` | Thread list per channel |
| Thread Detail | `channels/thread/[id]` | Thread with replies |
| Listing Detail | `exchange/[id]` | Marketplace item detail |
| Create Listing | `exchange/create` | Post new item to Garage |

---

## Edge Functions

### `nana-chat` — Guru Grandma's Brain
- Covers: pre-pregnancy, pregnancy, birthing, education, nutrition, vaccines, emergencies
- Builds system prompt with child/pregnancy context + pillar-specific instructions
- Calls Claude Sonnet API (`claude-sonnet-4-20250514`)
- Strong "I'm not your doctor" disclaimer
- Supports all 9 pillar IDs including `habits` and `milestones`

### `scan-image` — Vision Analysis
- 4 scan types with child-specific analysis
- Claude Vision API with base64 image

### `invite-caregiver` / `accept-invite` — Caregiver System
- JWT-authenticated invite flow with token verification

### `revenuecat-webhook` — Subscription Sync
- RevenueCat webhook events to Supabase profiles

---

## Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Supabase CLI (`brew install supabase/tap/supabase`)
- Expo Go app or iOS Simulator / Android Emulator

### Setup

```bash
# 1. Clone and install
git clone https://github.com/grandma-coder/grandma-app.git
cd grandma-app
npm install

# 2. Environment variables
cp .env.example .env
# Fill in Supabase URL, anon key, Anthropic key, RevenueCat key

# 3. Link Supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# 4. Deploy Edge Functions
supabase functions deploy nana-chat --no-verify-jwt
supabase functions deploy scan-image --no-verify-jwt
supabase functions deploy invite-caregiver
supabase functions deploy accept-invite
supabase functions deploy revenuecat-webhook --no-verify-jwt

# 5. Start the app
npx expo start --clear
```

### Running
```bash
npx expo start --ios      # iOS Simulator
npx expo start --android  # Android Emulator
npx expo start --tunnel   # Real device (different network)
```

---

## Costs (MVP)

| Service | Monthly | Notes |
|---------|---------|-------|
| Supabase | Free | 500MB DB, 1GB storage |
| Claude API | ~$15 | ~1K messages/day |
| RevenueCat | Free | Until $2,500 MRR |
| Expo EAS | Free | 30 builds/month |
| **Total** | **~$17/mo** | **Break even: 2 subscribers** |

---

## Build Phases

- **Phase 1** (Foundation): Auth, onboarding, chat with Grandma
- **Phase 2** (Pillars): 8 knowledge pillars, tips, suggestion chips, chat persistence
- **Phase 3** (Camera Scan): Medicine/food scanning with Claude Vision
- **Phase 4** (Monetise): RevenueCat paywall, subscription gate, webhook
- **Phase 5** (Journey): Journey-based onboarding, activity cards, history tab
- **Phase 6** (Caregivers): Nanny/family invite system, permissions, multi-child
- **Phase 7** (Dark Redesign): Full 15-phase cosmic dark theme rebuild
  - Dark theme system + glassmorphism components
  - 3-journey onboarding (pre-pregnancy/pregnancy/kids)
  - 6-tab navigation (Home, Agenda, Library, Vault, Garage, Settings)
  - 3-mode home with 40-week pregnancy tracking
  - Guru Grandma (AI chat rebrand) + pillar browsing + channels
  - Agenda with calendar, food tracking, nanny notes
  - Vault with emergency card, documents, vaccine records
  - Grandma's Garage social marketplace
  - Community channels forum system
  - AirTag location tracking
  - Pre-pregnancy learning + birth planning
  - All screens dark themed

See [BLUEPRINT.md](BLUEPRINT.md) for the original step-by-step build guide.

---

Built with Expo + Supabase + Claude AI + RevenueCat
