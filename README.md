# grandma.app

**The parenting wisdom of a grandmother, available 24/7.**

A full-platform parenting companion covering the entire journey — **Pre-Pregnancy, Pregnancy, and Kids/Baby** — with AI-powered chat (Guru Grandma), camera scanning, 40-week pregnancy tracking, a social marketplace (Grandma's Garage), community channels, activity logging, food tracking, caregiver collaboration, secure document storage (Vault), leaderboard, badges, daily rewards, notifications engine, and a premium subscription model.

Dark neon theme. Powered by Claude AI. Built with Expo + Supabase + RevenueCat.

---

## App Modes

The app adapts its entire UI based on the user's journey:

| Mode | Audience | Core Features |
|------|----------|---------------|
| **Pre-Pregnancy** | Want-to-be parents | Cycle ring tracker, hormone chart, fertile window, preparation checklists, partner view, community |
| **Pregnancy** | Expecting parents | 40-week tracking, baby development, symptom logging, kick counter, contraction timer, birth planning, milk control, partner dashboard |
| **Kids/Baby** | Parents with children | Premium home with sleep circle, mood analysis, calories, growth leaps, pillar-based tracking, food calendar, nanny notes, AirTag location, activity logging |

Users can switch modes at any time via the Mode Switcher pill on the home screen.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Mobile | Expo SDK 54 + React Native 0.81 | Cross-platform iOS/Android app |
| Navigation | Expo Router v6 | File-based routing with 6 tabs + modals |
| Styling | NativeWind 4 + TailwindCSS 4 + StyleSheet | Dark neon theme with glassmorphism |
| Animations | react-native-reanimated | Grandma ball, floating effects, transitions |
| Backend | Supabase | Auth (email + Apple + Google), PostgreSQL, Edge Functions, Storage |
| AI | Claude Sonnet API | Guru Grandma chat + image analysis via Edge Functions |
| State | Zustand v5 (18 stores) | Client-side state management |
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

### Neon Accent Palette (pillar cards, badges, and category highlights)

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
| Shadow (glow) | `0 0 25px color/0.5` |

### Reusable Components

| Component | File | Description |
|-----------|------|-------------|
| `GlassCard` | `components/ui/GlassCard.tsx` | Glassmorphism card with gradient border (default/accent/elevated variants) |
| `GradientButton` | `components/ui/GradientButton.tsx` | Primary CTA with gradient fill + glow shadow |
| `CosmicBackground` | `components/ui/CosmicBackground.tsx` | Full-screen dark gradient |
| `DatePickerField` | `components/ui/DatePickerField.tsx` | Dark themed date picker with label |
| `ResultCard` | `components/ui/ResultCard.tsx` | Scan result bottom sheet overlay |

---

## Features

### Guru Grandma (AI Chat)
- Interactive AI advisor powered by Claude Sonnet for ALL parenting topics
- Covers: pre-pregnancy, pregnancy, birthing, education, nutrition, vaccines, emergencies
- Child/pregnancy context injected into every request
- 9 knowledge pillar system prompts for specialized answers per mode
- Chat history persisted to Supabase (last 50 messages per session)
- "I'm not your doctor" disclaimer — recommends consulting healthcare professionals
- Chat interface with neon yellow user bubbles, dark AI bubbles with glow effects

### 3-Mode Home Screen
- **Pre-Pregnancy:** Menstrual cycle ring with phase colors (period/follicular/ovulation/luteal) + hormone rhythm chart + fertile window predictions + preparation checklists
- **Pregnancy:** Week display with moon phase name + animated globe + baby size card (days to go + fruit comparison) + Development Insight with "Record a lullaby" action + Daily Pulse (weight/mood/symptoms) + Grandma's Wisdom quotes + Moments of Care + milk tracker
- **Kids/Baby:** Premium home dashboard with sleep circle, mood analysis, calories tracking, growth leaps + GrandmaBall + 2x4 neon pillar card grid with last activity + nanny updates feed + food dashboard + AirTag location card

### 40-Week Pregnancy Tracking
- Week-by-week baby size comparisons (poppy seed to pumpkin)
- Moon phase names for each week
- Development facts and mom tips per week
- Daily Pulse: weight, mood (radiant/calm/tired/anxious/nauseous/energetic), symptom logging
- Kick counter (week 28+) with daily goal tracking
- Contraction timer (week 36+) with 5-1-1 rule alert
- Grandma's Wisdom: rotating personalized quotes

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
- 3 sub-tabs per mode: Timeline | Food | Notes (pill-shaped active state)
- **Timeline:** Vertical chronological activity log with colored dots and timestamps
- **Food Dashboard:** Meal tracking (breakfast/lunch/dinner/snack), photo-based food logging with 5-star rating, AI-powered nutrition tips
- **Nanny Notes:** Bidirectional parent-to-nanny and nanny-to-parent notes with category pills (schedule, nutrition, medication, behavior, general)

### Insights & Analytics
- Mode-specific health insights generated by Edge Function
- Metrics highlights with trend indicators
- History tab for tracking progress over time
- Restore/refresh insights capability
- Charts and visualizations per pillar

### Leaderboard & Gamification
- Community leaderboard with points and rankings
- Achievement badge system for milestones and consistent tracking
- Daily rewards engine — streaks, bonus points, and motivational feedback
- Badge gallery with locked/unlocked states

### Notifications Engine
- In-app notification center with read/unread states
- Push notification support for key events (vaccine reminders, kick goals, daily log streaks)
- Mode-specific notification types
- Notification history with badge counts

### Vault (Baby Health Space)
- **Emergency Card:** Blue gradient card with shield icon, blood type, allergies, primary contact, "Broadcast to EMS" button
- **Vaccine Records:** Visual checklist with checkmarks/pending dots
- **Document Sections:** Exams (pink), Hospital Records (green), Insurance (orange) — collapsible with file count
- **Document Upload:** Cloud upload area with scan/upload buttons + "Add Record" CTA

### Community Channels
- 80+ channels with seed data covering all parenting topics
- Channel ratings and voting system
- Forum-style discussion with thread-based replies
- Info screen per channel with member count and category
- Channel notifications opt-in

### Grandma's Garage (Social Marketplace)
- Social feed for trading, selling, or donating baby items
- Post types: Sell, Trade, Donate (free) with colored badges
- Categories: Clothing, Toys, Gear, Furniture, Books, Other
- Listing cards with photos, save/comment/share actions
- Filter pills: All | Sell | Trade | Free
- Create listing form with type/category/condition pickers
- Seller profile pages

### AirTag Location Tracking
- Connect Apple AirTag to track child's location
- Location card on Kids home screen (connected/disconnected states)
- 3-step setup modal with numbered steps

### 9 Knowledge Pillars (per mode)

**Kids Mode:**

| ID | Name | Neon Color | Description |
|----|------|------------|-------------|
| `milk` | Breastfeeding | Blue `#4D96FF` | Formula, breastfeeding, bottles, transitions |
| `food` | Feeding | Green `#A2FF86` | Introducing solids, meal plans, textures |
| `nutrition` | Nutrition | Yellow `#F4FD50` | Vitamins, minerals, supplementation |
| `vaccines` | Vaccines | Pink `#FF8AD8` | CDC/WHO schedule, reactions, post-vaccine |
| `clothes` | Layette | Orange `#FF6B35` | Clothing sizes, brand conversions, seasonal |
| `recipes` | Recipes | Dark card | Age-appropriate meals, allergen-safe cooking |
| `habits` | Habits & Natural Care | Teal | Evidence-backed home care, routines |
| `medicine` | Medicine | Red | Weight-based dosages, safety, interactions |
| `milestones` | Milestones | Cyan `#67E8F9` | Developmental tracking, celebrating firsts |

**Pregnancy Mode:** Week-by-week, Symptoms Relief, Birth Planning, Breastfeeding Prep, Nutrition, Mental Health, Partner, Hospital Bag, Postpartum

**Pre-Pregnancy Mode:** Fertility Basics, Nutrition Prep, Emotional Readiness, Financial Planning, Partner's Journey, Pre-Conception Health

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
- Invite nannies or family by email with role selector (Partner/Nanny/Family/Doctor)
- Granular permissions: `view`, `log_activity`, `chat`
- Secure token-based invite flow
- Manage caregivers: view status, revoke access

### Pre-Pregnancy Content
- 28-day cycle ring with animated phase visualization
- Hormone rhythm chart (estrogen, progesterone, LH curves)
- Fertile window predictions with day-by-day guidance
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
| Free | $0 | Chat with Grandma, browse all pillars, 3 free scans |
| Premium | $9.99/mo or $69.99/yr | Unlimited scans, unlimited chat, vaccine reminders, priority responses, insights |

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

## Screens Overview (40+ screens)

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
| Grandma Talk | `grandma-talk` | Full-screen AI chat |
| Pillar Detail | `pillar/[id]` | Tips + suggestion chips |
| Insights | `insights` | Analytics highlights + history tab |
| Leaderboard | `leaderboard` | Community rankings + points |
| Daily Rewards | `daily-rewards` | Streak rewards + badge display |
| Notifications | `notifications` | Notification center |
| Connections | `connections` | Care circle member view |
| Scan | `scan` | Camera/gallery + 4 scan types (modal) |
| Paywall | `paywall` | Premium subscription (modal) |
| Birth Plan | `birth-plan` | 4 birth types + hospital bag |
| AirTag Setup | `airtag-setup` | 3-step AirTag connection (modal) |
| Child Picker | `child-picker` | Switch children (modal) |
| Invite Caregiver | `invite-caregiver` | Send invite (modal) |
| Manage Caregivers | `manage-caregivers` | List + revoke |
| Accept Invite | `accept-invite` | Accept invitation |
| Channel Browser | `channel/` | Discover channels (80+) |
| Channel Detail | `channel/[id]` | Thread list + channel info |
| Channel Thread | `channel/thread/[id]` | Thread + replies |
| Create Channel | `channel/create` | Create new channel |
| Listing Detail | `garage/[id]` | Item detail |
| Create Listing | `garage/create` | Post new item |
| Garage Profile | `garage/profile` | Seller profile |
| Profile - Account | `profile/account` | Account settings |
| Profile - Kids | `profile/kids` | Children management |
| Profile - Care Circle | `profile/care-circle` | Caregiver management |
| Profile - Badges | `profile/badges` | Achievement gallery |

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
│   ├── profile/                            # Profile sub-pages (account, kids, care-circle, badges, health-history, memories)
│   ├── channel/                            # Channels: browser, [id], create, thread/[id]
│   ├── garage/                             # Marketplace: [id], create, share, profile
│   ├── pillar/[id].tsx                     # Pillar detail
│   ├── grandma-talk.tsx                    # Full-screen AI chat
│   ├── insights.tsx                        # Analytics + history tab
│   ├── leaderboard.tsx                     # Community leaderboard
│   ├── daily-rewards.tsx                   # Rewards + badges
│   ├── notifications.tsx                   # Notification center
│   ├── connections.tsx                     # Care circle
│   ├── scan.tsx, paywall.tsx               # Modals
│   ├── birth-plan.tsx, airtag-setup.tsx    # Feature screens
│   ├── child-picker.tsx                    # Switch children
│   ├── invite-caregiver.tsx                # Send invite
│   ├── manage-caregivers.tsx               # Caregiver list
│   └── accept-invite.tsx                   # Accept invitation
│
├── components/                             # Reusable components
│   ├── ui/                                 # GlassCard, GradientButton, CosmicBackground, DatePickerField, ResultCard
│   ├── auth/                               # SocialAuthButtons
│   ├── home/                               # GrandmaBall, ModeSwitcher, PillarGrid, PregnancyWeekDisplay, BabySizeCard, DevelopmentInsight, DailyPulse, GrandmaWisdom, MomentsOfCare, MilkTracker, NannyUpdatesFeed, ActivityCard, CycleRing, HormoneChart
│   ├── agenda/                             # CalendarView, ActivityTimeline, FoodPhotoEntry, FoodDashboard, NannyNotesPanel
│   ├── vault/                              # EmergencyCard, DocumentSection, DocumentUpload, VaccineRecord
│   ├── exchange/                           # ListingCard
│   ├── channels/                           # ChannelCard, ThreadCard
│   ├── kids/                               # LocationCard, SleepCircle, MoodAnalysis, CaloriesCard, GrowthLeaps
│   ├── pillar/                             # PillarCard, TipCard
│   ├── prepreg/                            # LearningModule, ChecklistCard, PartnerView, CyclePhaseRing
│   ├── pregnancy/                          # BirthTypeCard, MilkControl, PartnerDashboard, WeeklyInsight
│   ├── analytics/                          # Analytics/charting components
│   ├── insights/                           # InsightCard, MetricsHighlight
│   ├── charts/                             # SVG charts (hormone, cycle)
│   ├── connections/                        # CareCircle UI
│   └── onboarding/                         # Onboarding step components
│
├── constants/theme.ts                      # Design tokens
├── lib/                                    # Business logic (30+ files)
│   ├── supabase.ts                         # Supabase client
│   ├── claude.ts, grandmaChat.ts           # AI chat helpers
│   ├── pillars.ts, pregnancyPillars.ts, prePregPillars.ts  # Pillar data
│   ├── pregnancyData.ts, pregnancyWeeks.ts # 40-week data
│   ├── cycleLogic.ts                       # Menstrual cycle engine
│   ├── notificationEngine.ts               # Notification system
│   ├── insights.ts, analyticsData.ts       # Analytics engine
│   ├── leaderboard.ts, badgeSync.ts        # Gamification
│   ├── channels.ts, channelPosts.ts        # Community (80+ channels)
│   ├── exchange.ts, garage.ts, garagePosts.ts  # Marketplace
│   ├── vault.ts, foodTracking.ts           # Health data
│   ├── auth-providers.ts                   # Apple/Google sign-in
│   └── revenue.ts                          # RevenueCat init
├── store/                                  # Zustand stores (18 stores)
├── types/index.ts                          # TypeScript interfaces
└── supabase/
    ├── functions/                          # 6+ Edge Functions (Deno)
    └── migrations/                         # 30+ SQL migrations
```

---

## State Management (18 Zustand Stores)

| Store | Purpose |
|-------|---------|
| `useChildStore` | Active child + role/permissions |
| `useChatStore` | Chat messages |
| `useJourneyStore` | Onboarding (3 modes, names, dates, activities) |
| `useModeStore` | Pre-Pregnancy / Pregnancy / Kids toggle |
| `useThemeStore` | Dark/light theme |
| `usePregnancyStore` | Week, weight, mood, symptoms |
| `useFoodStore` | Food entries + ratings |
| `useVaultStore` | Documents + emergency card |
| `useExchangeStore` | Marketplace listings + saved |
| `useChannelsStore` | Channels + threads |
| `useBadgeStore` | Achievement badges |
| `useGoalsStore` | User goals |
| `useBehaviorStore` | Journey modes & behaviors |
| `useOnboardingStore` | General onboarding state |
| `useCycleOnboardingStore` | Pre-pregnancy onboarding |
| `usePregnancyOnboardingStore` | Pregnancy onboarding |
| `useKidsOnboardingStore` | Kids onboarding |
| `useNotificationsStore` | Notification state |

---

## Edge Functions

| Function | Purpose |
|----------|---------|
| `nana-chat` | Guru Grandma AI chat (Claude Sonnet) — 3-mode context, pillar prompts |
| `scan-image` | Vision analysis (Claude Vision) — 4 scan types with child context |
| `generate-insights` | Analytics generation — mode-specific health insights |
| `invite-caregiver` | JWT-authenticated caregiver invite with token generation |
| `accept-invite` | Token verification + user linking |
| `revenuecat-webhook` | Subscription status sync from RevenueCat |

---

## Database Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| `profiles` | User account, health data, preferences |
| `behaviors` | Journey modes (cycle/pregnancy/kids) |
| `children` | Child records with health data |
| `cycle_logs` | Pre-pregnancy cycle tracking |
| `pregnancy_logs` | Symptom/weight/kick/contraction logs |
| `child_logs` | Activity logs (feeding/sleep/diaper/mood/vaccine/medicine) |
| `care_circle` | Caregiver management with granular permissions |
| `channel_posts` | Community forum messages |
| `channel_ratings` | Post ratings & votes |
| `garage_listings` | Marketplace items for sale/trade |
| `insights` | Generated analytics by pillar and date |
| `child_routines` | Daily routines & schedules |
| `child_goals` | Growth & developmental goals |
| `child_health_data` | Weight, height, vaccines, allergies |
| `badges` | Achievement system |
| `leaderboard` | Points & community rankings |
| `notifications` | Push & in-app notifications |
| `vault_documents` | Medical records (pregnancy/kids) |
| `emergency_cards` | Blood type, allergies, emergency contacts |
| `vaccine_records` | Vaccination history |

All tables have RLS (Row Level Security). Care circle members access granted children based on their permission set.

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
supabase functions deploy generate-insights --no-verify-jwt
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
