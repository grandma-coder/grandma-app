# grandma.app

**The parenting wisdom of a grandmother, available 24/7.**

A full-platform parenting companion covering the entire journey — **Pre-Pregnancy, Pregnancy, and Kids/Baby** — with AI-powered chat (Guru Grandma), camera scanning, 40-week pregnancy tracking, a social marketplace (Grandma's Garage), community channels, activity logging, food tracking, caregiver collaboration, secure document storage (Vault), and a premium subscription model.

Dark neon theme. Powered by Claude AI. Built with Expo + Supabase + RevenueCat.

---

## App Modes

The app adapts its entire UI based on the user's journey:

| Mode | Audience | Core Features |
|------|----------|---------------|
| **Pre-Pregnancy** | Want-to-be parents | Learning modules, preparation checklists, partner view, community |
| **Pregnancy** | Expecting parents | 40-week tracking, baby development, birth planning, milk control, partner dashboard |
| **Kids/Baby** | Parents with children | Pillar-based tracking, food calendar, nanny notes, AirTag location, activity logging |

Users can switch modes at any time via the Mode Switcher pill on the home screen.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Mobile | Expo SDK 54 + React Native 0.81 | Cross-platform iOS/Android app |
| Navigation | Expo Router v6 | File-based routing with 6 tabs + modals |
| Styling | StyleSheet + expo-linear-gradient + expo-blur | Dark neon theme with glassmorphism |
| Animations | react-native-reanimated | Grandma ball, floating effects, transitions |
| Backend | Supabase | Auth (email + Apple + Google), PostgreSQL, Edge Functions, Storage |
| AI | Claude Sonnet API | Guru Grandma chat + image analysis via Edge Functions |
| State | Zustand v5 (9 stores) | Client-side state management |
| Data Fetching | TanStack React Query v5 | Server state, caching, date-based queries |
| Payments | RevenueCat | Subscriptions, paywall, receipt validation |
| Language | TypeScript (strict) | End-to-end type safety with typed routes |

---

## Design System

Dark neon aesthetic defined in `constants/theme.ts`:

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#0A0E1A` | Deep cosmic navy — app background |
| Surface | `#141829` | Card backgrounds |
| Surface glass | `rgba(255,255,255,0.06)` | Glassmorphism cards |
| Accent (golden) | `#F5C754` | Primary accent — buttons, active states, highlights |
| Accent glow | `#FFD97D` | Glow effects |
| Text | `#FFFFFF` | Primary text |
| Text secondary | `rgba(255,255,255,0.6)` | Body text, descriptions |
| Text tertiary | `rgba(255,255,255,0.35)` | Labels, placeholders, inactive |
| Border | `rgba(255,255,255,0.08)` | Card borders, dividers |
| Success | `#4ADE80` | Positive states, connected |
| Error | `#F87171` | Errors, allergies, sign out |
| Warning | `#FBBF24` | Warnings, pending states |

### Neon Accent Palette (for pillar cards, badges, and category highlights)

| Color | Hex | Usage |
|-------|-----|-------|
| Neon Yellow | `#F4FD50` | Primary CTA, active tab indicator |
| Neon Pink | `#FF8AD8` | Breastfeeding, fertility, exams |
| Neon Orange | `#FF6B35` | Recipes, insurance, sign-out |
| Neon Blue | `#4D96FF` | Vaccines, hospital, partner, emergency card |
| Neon Green | `#A2FF86` | Feeding, getting started, success |
| Neon Purple | `#B983FF` | Layette, milestones |

### Typography (Target)

| Weight | Font | Usage |
|--------|------|-------|
| Display (Black/900) | Cabinet Grotesk | Headings, titles, CTAs — uppercase, tight tracking |
| Body (400-700) | Satoshi | Body text, descriptions, labels |
| Mono (500) | JetBrains Mono | Labels, timestamps, technical text — uppercase tracking |

### Design Tokens

| Token | Value |
|-------|-------|
| Border radius (buttons) | 32-40px (full rounded) |
| Border radius (cards) | 24-40px (super rounded) |
| Border radius (inputs) | 40px (pill-shaped) |
| Spacing baseline | 8px |
| Active press scale | `0.95` |
| Hover scale | `1.02-1.05` |
| Shadow (glow) | `0 0 25px color/0.5` |
| Card height (grid) | ~200px (aspect driven) |

### Reusable Components

| Component | File | Description |
|-----------|------|-------------|
| `GlassCard` | `components/ui/GlassCard.tsx` | Glassmorphism card with gradient border (default/accent/elevated variants) |
| `GradientButton` | `components/ui/GradientButton.tsx` | Primary CTA with gradient fill + glow shadow (primary/secondary/outline) |
| `CosmicBackground` | `components/ui/CosmicBackground.tsx` | Full-screen dark gradient (default/pregnancy variants) |
| `DatePickerField` | `components/ui/DatePickerField.tsx` | Dark themed date picker with label |
| `ResultCard` | `components/ui/ResultCard.tsx` | Scan result bottom sheet overlay |

---

## Features

### Guru Grandma (AI Chat)
- Interactive AI advisor powered by Claude Sonnet for ALL parenting topics
- Covers: pre-pregnancy, pregnancy, birthing, education, nutrition, vaccines, emergencies
- Child/pregnancy context injected into every request
- 9 knowledge pillar system prompts for specialized answers
- Chat history persisted to Supabase (last 50 messages per session)
- "I'm not your doctor" disclaimer — recommends consulting healthcare professionals
- Chat interface with neon yellow user bubbles, dark AI bubbles with glow effects

### 3-Mode Home Screen
- **Pre-Pregnancy:** Floating GrandmaBall + "Let's prepare for your journey, dear." + learning modules (Fertility & Preparation, Partner Connection) + community highlights
- **Pregnancy:** Week display with moon phase name + animated globe + baby size card (days to go + fruit comparison) + Development Insight with "Record a lullaby" action + Daily Pulse (weight/mood/symptoms) + Grandma's Wisdom quotes + Moments of Care (Stardust Stretching, Deep Sleep Ritual) + milk tracker
- **Kids/Baby:** GrandmaBall + "How can I help you today, dear?" + 2x4 neon pillar card grid with last activity + nanny updates feed + food dashboard + AirTag location card

### 40-Week Pregnancy Tracking
- Week-by-week baby size comparisons (poppy seed to pumpkin)
- Moon phase names for each week (The New Moon Phase, The Harvest Moon Phase, The Full Birth Moon)
- Development facts and mom tips per week
- Daily Pulse: weight, mood (radiant/calm/tired/anxious/nauseous/energetic), symptom logging
- Grandma's Wisdom: rotating personalized quotes
- Moments of Care: wellness activities with cosmic theme

### Birth Planning
- 4 birth type explorer: Natural, C-section, Home Birth, Water Birth
- Pros/cons and what-to-expect for each type
- Hospital bag checklist (for mom, baby, and partner)

### Camera Scanning
- 4 scan types: `medicine`, `food`, `nutrition`, `general`
- Image compressed to under 1MB before sending
- Claude Vision API analyzes with child-specific context
- Dark themed scan UI with neon type chips
- Free tier: 3 scans per child, then paywall

### Agenda (Calendar + Food + Nanny Notes)
- Monthly calendar with neon yellow selected date, activity dot indicators
- 3 sub-tabs: Timeline | Food | Notes (pill-shaped active state)
- **Timeline:** Vertical chronological activity log with colored dots and timestamps
- **Food Dashboard:** Meal tracking (breakfast/lunch/dinner/snack), photo-based food logging with 5-star rating, AI-powered nutrition tips
- **Nanny Notes:** Bidirectional parent-to-nanny and nanny-to-parent notes with category pills (schedule, nutrition, medication, behavior, general)

### Vault (Baby Health Space)
- **Emergency Card:** Blue gradient card with shield icon, blood type, allergies, primary contact, "Broadcast to EMS" button
- **Vaccine Records:** Visual checklist with checkmarks/pending dots
- **Document Sections:** Exams (pink), Hospital Records (green), Insurance (orange) — collapsible with file count, colored category icons
- **Document Upload:** Cloud upload area with scan/upload buttons + "Add Record" CTA
- **Recent Documents** list

### Grandma's Garage (Social Marketplace)
- Social feed for trading, selling, or donating baby items
- Post types: Sell, Trade, Donate (free) with colored badges
- Categories: Clothing, Toys, Gear, Furniture, Books, Other
- Listing cards with photos, save/comment/share actions
- Filter pills: All | Sell | Trade | Free
- Create listing form with type/category/condition pickers
- Empty state with floating placeholder cards

### Community Channels (Inside Library Tab)
- Forum-style discussion spaces
- Channel browser with member count and category
- Thread-based discussions with pinned threads
- Reply system with compose bar

### AirTag Location Tracking
- Connect Apple AirTag to track child's location
- Location card on Kids home screen (connected/disconnected states)
- 3-step setup modal with numbered steps

### 9 Knowledge Pillars

| ID | Icon | Name | Neon Color | Description |
|----|------|------|------------|-------------|
| `milk` | Baby | Breastfeeding | Blue `#4D96FF` | Formula, breastfeeding, bottles, transitions |
| `food` | Apple | Feeding | Green `#A2FF86` | Introducing solids, meal plans, textures |
| `nutrition` | Leaf | Nutrition | Yellow `#F4FD50` | Vitamins, minerals, supplementation |
| `vaccines` | Syringe | Vaccines | Pink `#FF8AD8` | CDC/WHO schedule, reactions, post-vaccine |
| `clothes` | Shirt | Layette | Orange `#FF6B35` | Clothing sizes, brand conversions, seasonal |
| `recipes` | Utensils | Recipes | Dark card | Age-appropriate meals, allergen-safe cooking |
| `habits` | Herb | Habits & Natural Care | Teal | Evidence-backed home care, routines |
| `medicine` | Pill | Medicine | Red | Weight-based dosages, safety, interactions |
| `milestones` | Star | Milestones | Cyan `#67E8F9` | Developmental tracking, celebrating firsts |

### 3-Journey Onboarding (6 screens)
1. **Journey Selection** — 3 large cards: "I want to be pregnant" / "I'm pregnant" / "I have kids"
2. **Parent Name** — "How shall I call you, dear?" with pill-shaped input
3. **Due Date / LMP** (pregnancy only) — Toggle chips + date picker + week preview
4. **Baby Name** — Optional for pregnancy, required for kids
5. **Activity Tracking** — Multi-select cards per journey type
6. **Child Profile** — Details + "Begin My Journey" CTA + terms/privacy

### Authentication
- Email + password (sign in / sign up)
- Apple Sign-In (native iOS)
- Google Sign-In (OAuth)
- Dark themed with neon accents

### Caregiver Invite System
- Invite nannies or family by email with role selector (Nanny/Family)
- Neon yellow "Send Invite" CTA
- Granular permissions: `view`, `log_activity`, `chat`
- Secure token-based invite flow
- Manage caregivers: view status, revoke access

### Pre-Pregnancy Content
- 6 learning modules: Fertility Basics, Nutrition Prep, Emotional Readiness, Financial Planning, Partner's Journey, Pre-Conception Health
- 10-item preparation checklist with progress bar
- Partner invitation card

### Milk Control
- Track breast (left/right), bottle, and pump sessions
- Quick-start grid buttons
- Session history with duration and amount

### Premium Subscription
| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | Chat with Grandma, browse all 9 pillars, 3 free scans |
| Premium | $9.99/mo or $69.99/yr | Unlimited scans, unlimited chat, vaccine reminders, priority responses |

---

## Navigation (6 Tabs)

| Tab | Icon | Screen | Content |
|-----|------|--------|---------|
| Home | `home` | `(tabs)/index` | 3-mode adaptive home with ModeSwitcher |
| Agenda | `calendar` | `(tabs)/agenda` | Calendar + timeline + food + nanny notes |
| Library | `book-open` | `(tabs)/library` | Guru Grandma chat + pillars + channels |
| Vault | `shield` | `(tabs)/vault` | Emergency card + documents + vaccines |
| Garage | `tag` | `(tabs)/exchange` | Grandma's Garage marketplace |
| Settings | `settings` | `(tabs)/settings` | Profile + caregivers + sign out |

Tab bar: Dark background (`#141414`), neon yellow active state, rounded pill shape (40px border radius).

---

## Screens Overview (28 screens)

| Screen | Route | Description |
|--------|-------|-------------|
| Welcome | `(auth)/welcome` | "Welcome, Dear One." + Apple/Google/email auth |
| Sign In | `(auth)/sign-in` | Social auth + email/password |
| Sign Up | `(auth)/sign-up` | Social auth + "Begin Your Journey" |
| Journey | `onboarding/journey` | 3 journey cards |
| Parent Name | `onboarding/parent-name` | Name input |
| Baby Name | `onboarding/baby-name` | Optional baby name |
| Due Date | `onboarding/due-date` | Due date/LMP with week calc |
| Activities | `onboarding/activities` | Activity selection per journey |
| Child Profile | `onboarding/child-profile` | Child details + CTA |
| Home | `(tabs)/index` | 3-mode home with ModeSwitcher |
| Agenda | `(tabs)/agenda` | Calendar + Timeline/Food/Notes tabs |
| Library | `(tabs)/library` | Guru Grandma + pillars + channels |
| Vault | `(tabs)/vault` | Emergency card + documents + vaccines |
| Garage | `(tabs)/exchange` | Marketplace feed with filters |
| Settings | `(tabs)/settings` | Profile, caregivers, scan history |
| Pillar Detail | `pillar/[id]` | Tips + suggestion chips |
| Scan | `scan` | Camera/gallery + 4 scan types (modal) |
| Paywall | `paywall` | Premium subscription (modal) |
| Birth Plan | `birth-plan` | 4 birth types + hospital bag |
| AirTag Setup | `airtag-setup` | 3-step AirTag connection (modal) |
| Child Picker | `child-picker` | Switch children (modal) |
| Invite Caregiver | `invite-caregiver` | Send invite (modal) |
| Manage Caregivers | `manage-caregivers` | List + revoke |
| Accept Invite | `accept-invite` | Accept invitation |
| Channel Browser | `channels/` | Discover channels |
| Channel Detail | `channels/[id]` | Thread list |
| Thread Detail | `channels/thread/[id]` | Thread + replies |
| Listing Detail | `exchange/[id]` | Item detail |
| Create Listing | `exchange/create` | Post new item |

---

## Project Structure

```
grandma-app/
├── app/                                    # Expo Router (file-based routing)
│   ├── _layout.tsx                         # Root — auth guard, RevenueCat, routing
│   ├── (auth)/                             # Auth: welcome, sign-in, sign-up
│   ├── onboarding/                         # 6 onboarding screens
│   ├── (tabs)/                             # 6-tab navigation
│   │   ├── index.tsx                       # 3-mode home
│   │   ├── agenda.tsx                      # Calendar + food + nanny notes
│   │   ├── library.tsx                     # Guru Grandma + pillars + channels
│   │   ├── vault.tsx                       # Emergency card + documents
│   │   ├── exchange.tsx                    # Grandma's Garage
│   │   └── settings.tsx                    # Profile + sign out
│   ├── pillar/[id].tsx                     # Pillar detail
│   ├── scan.tsx, paywall.tsx               # Modals
│   ├── birth-plan.tsx, airtag-setup.tsx    # Feature screens
│   ├── channels/                           # Forum: browser, detail, thread
│   └── exchange/                           # Marketplace: detail, create
│
├── components/                             # Reusable components
│   ├── ui/                                 # GlassCard, GradientButton, CosmicBackground, DatePickerField, ResultCard
│   ├── auth/                               # SocialAuthButtons
│   ├── home/                               # GrandmaBall, ModeSwitcher, PillarGrid, PregnancyWeekDisplay, BabySizeCard, DevelopmentInsight, DailyPulse, GrandmaWisdom, MomentsOfCare, MilkTracker, NannyUpdatesFeed, ActivityCard
│   ├── agenda/                             # CalendarView, ActivityTimeline, FoodPhotoEntry, FoodDashboard, NannyNotesPanel
│   ├── vault/                              # EmergencyCard, DocumentSection, DocumentUpload, VaccineRecord
│   ├── exchange/                           # ListingCard
│   ├── channels/                           # ChannelCard, ThreadCard
│   ├── kids/                               # LocationCard
│   ├── pillar/                             # PillarCard, TipCard
│   ├── prepreg/                            # LearningModule, ChecklistCard, PartnerView
│   └── pregnancy/                          # BirthTypeCard, MilkControl, PartnerDashboard, WeeklyInsight
│
├── constants/theme.ts                      # Design tokens
├── lib/                                    # Business logic (14 files)
├── store/                                  # Zustand stores (9 stores)
├── types/index.ts                          # TypeScript interfaces
└── supabase/functions/                     # 5 Edge Functions
```

---

## State Management (9 Zustand Stores)

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

---

## Edge Functions

| Function | Purpose |
|----------|---------|
| `nana-chat` | Guru Grandma AI chat (Claude Sonnet) — 3-mode context, 9 pillar prompts |
| `scan-image` | Vision analysis (Claude Vision) — 4 scan types with child context |
| `invite-caregiver` | JWT-authenticated caregiver invite with token generation |
| `accept-invite` | Token verification + user linking |
| `revenuecat-webhook` | Subscription status sync from RevenueCat |

---

## Getting Started

```bash
# Clone and install
git clone https://github.com/grandma-coder/grandma-app.git
cd grandma-app && npm install

# Environment
cp .env.example .env  # Fill in Supabase, Anthropic, RevenueCat keys

# Supabase
supabase login && supabase link --project-ref YOUR_REF
supabase functions deploy nana-chat --no-verify-jwt
supabase functions deploy scan-image --no-verify-jwt
supabase functions deploy invite-caregiver
supabase functions deploy accept-invite
supabase functions deploy revenuecat-webhook --no-verify-jwt

# Run
npx expo start --clear
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

Built with Expo + Supabase + Claude AI + RevenueCat
