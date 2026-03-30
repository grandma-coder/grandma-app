# grandma.app

**The parenting wisdom of a grandmother, available 24/7.**

An AI-powered parenting guide that gives personalized, warm advice about your child — feeding, medicines, vaccines, recipes, and more. Powered by Claude AI, built with Expo + Supabase.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Mobile | Expo + React Native | Cross-platform iOS/Android app |
| Navigation | Expo Router v3 | File-based routing with tabs + modals |
| Styling | NativeWind v4 + StyleSheet | Tailwind-inspired + native styles |
| Backend | Supabase | Auth, PostgreSQL database, Edge Functions, Storage |
| AI | Claude API (Sonnet) | Chat responses + image analysis via Edge Functions |
| State | Zustand v5 | Client-side state management |
| Payments | RevenueCat | Subscriptions, paywall, receipt validation |
| Language | TypeScript | End-to-end type safety |

---

## Project Structure

```
grandma-app/
├── app/                          # Expo Router screens (file-based routing)
│   ├── _layout.tsx               # Root layout — auth guard, RevenueCat init
│   ├── onboarding.tsx            # Child profile creation form
│   ├── scan.tsx                  # Camera/photo scan screen (modal)
│   ├── paywall.tsx               # Premium subscription paywall (modal)
│   ├── (auth)/                   # Authentication screens
│   │   ├── _layout.tsx           # Auth stack layout
│   │   ├── welcome.tsx           # Welcome/landing screen
│   │   ├── sign-in.tsx           # Email + password sign in
│   │   └── sign-up.tsx           # Email + password registration
│   ├── (tabs)/                   # Main tab navigation
│   │   ├── _layout.tsx           # Tab bar config (Home, Chat, Profile)
│   │   ├── index.tsx             # Home — pillar grid + scan button
│   │   ├── chat.tsx              # Chat with Grandma (AI conversation)
│   │   └── profile.tsx           # Child profile + scan history + sign out
│   └── pillar/
│       └── [id].tsx              # Dynamic pillar detail (tips + suggestions)
│
├── components/                   # Reusable UI components
│   ├── pillar/
│   │   ├── PillarCard.tsx        # Pillar card for home grid
│   │   └── TipCard.tsx           # Knowledge tip card
│   ├── chat/                     # (Future: chat-specific components)
│   └── ui/
│       └── ResultCard.tsx        # Scan result bottom sheet
│
├── lib/                          # Core business logic
│   ├── supabase.ts               # Supabase client with SecureStore auth
│   ├── claude.ts                 # callNana() — chat AI helper
│   ├── scan.ts                   # scanImage() — vision AI helper
│   ├── pillars.ts                # All 8 pillar definitions (tips, suggestions)
│   └── revenue.ts                # RevenueCat helpers (purchase, restore, check)
│
├── store/                        # Zustand state stores
│   ├── useChildStore.ts          # Active child profile state
│   └── useChatStore.ts           # Chat messages state
│
├── types/
│   └── index.ts                  # TypeScript interfaces (Child, Message, Pillar)
│
├── supabase/
│   ├── functions/
│   │   ├── nana-chat/            # Edge Function — Claude chat proxy
│   │   │   └── index.ts          # Receives messages + child context, returns reply
│   │   ├── scan-image/           # Edge Function — Claude vision proxy
│   │   │   └── index.ts          # Receives base64 image, returns analysis
│   │   └── revenuecat-webhook/   # Edge Function — subscription sync
│   │       └── index.ts          # RevenueCat webhook → updates profiles table
│   └── migrations/               # Database migration files
│
├── .env                          # Secret environment variables (never committed)
├── .env.example                  # Template for .env (safe to commit)
├── BLUEPRINT.md                  # Full build blueprint from PDF
├── app.json                      # Expo app configuration
├── babel.config.js               # Babel config with NativeWind plugin
├── tailwind.config.js            # Tailwind/NativeWind configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Dependencies and scripts
```

---

## Database Schema

Four tables in Supabase with Row Level Security:

### `profiles`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | References auth.users |
| email | text | User's email |
| subscription_status | text | `free` or `premium` |
| country_code | text | Default: `US` |
| created_at | timestamptz | Auto-generated |

### `children`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| parent_id | uuid (FK) | References profiles.id |
| name | text | Child's name |
| birth_date | date | Date of birth |
| weight_kg | numeric | Weight in kilograms |
| height_cm | numeric | Height in centimeters |
| allergies | text[] | List of allergies |
| medications | text[] | Current medications |
| country_code | text | Default: `US` |

### `chat_messages`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| child_id | uuid (FK) | References children.id |
| pillar_id | text | Which pillar context (nullable) |
| role | text | `user` or `assistant` |
| content | text | Message text |
| created_at | timestamptz | Auto-generated |

### `scan_history`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| child_id | uuid (FK) | References children.id |
| scan_type | text | `medicine`, `food`, `nutrition`, `general` |
| image_url | text | Local image URI |
| result_json | jsonb | Grandma's analysis |
| created_at | timestamptz | Auto-generated |

---

## The 8 Knowledge Pillars

| ID | Name | Description |
|----|------|-------------|
| `milk` | Breastfeeding | Formula, breastfeeding, bottles, transition milestones |
| `food` | Feeding | Introducing solids, meal plans, age-appropriate textures |
| `nutrition` | Nutrition | Vitamins, minerals, supplementation guidance |
| `vaccines` | Vaccines | CDC/WHO schedule, reactions, post-vaccine care |
| `clothes` | Layette | Clothing sizes, brand conversions, seasonal guides |
| `recipes` | Recipes | Age-appropriate meals, allergen-safe cooking |
| `natural` | Natural Remedies | Evidence-backed home care, when to see a doctor |
| `medicine` | Medicine | Weight-based dosages, safety, interactions |

Each pillar provides context to Claude via the Edge Function's system prompt, so Grandma gives specialized answers per topic.

---

## Edge Functions

### `nana-chat` — Grandma's Brain
- Receives: `messages[]`, `childContext`, `pillarId`
- Builds a system prompt with child profile + pillar-specific instructions
- Calls Claude Sonnet API, returns the reply
- Safety rules: no diagnosis, weight-based dosages only, always suggest pediatrician

### `scan-image` — Vision Analysis
- Receives: `imageBase64`, `mediaType`, `scanType`, `childContext`
- Sends image to Claude's vision API with analysis instructions
- Returns structured analysis of medicine boxes, food labels, etc.

### `revenuecat-webhook` — Subscription Sync
- Receives: RevenueCat webhook events
- Updates `profiles.subscription_status` on purchase/renewal/cancellation
- Uses Supabase service role key (server-side only)

---

## Authentication Flow

```
App opens
  └─ Check Supabase session
      ├─ No session → Sign In screen
      └─ Has session
          ├─ No children → Onboarding (create child profile)
          └─ Has children → Home (tabs)
```

On sign out, Zustand store is cleared and user returns to Sign In.

---

## Subscription Model

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | Chat with Grandma, browse all 8 pillars, 3 free scans |
| Premium | $9.99/mo or $69.99/yr | Unlimited scans, unlimited chat, vaccine reminders, priority responses |

- 7-day free trial on premium
- Managed by RevenueCat
- Subscription status synced to Supabase via webhook

---

## Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Supabase CLI (`brew install supabase/tap/supabase`)
- Expo Go app on your phone

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/grandma-coder/grandma-app.git
cd grandma-app

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env
# Fill in your real values (see .env.example for instructions)

# 4. Link Supabase project
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# 5. Deploy Edge Functions
supabase functions deploy nana-chat --no-verify-jwt
supabase functions deploy scan-image --no-verify-jwt
supabase functions deploy revenuecat-webhook --no-verify-jwt

# 6. Start the app
npx expo start
```

Scan the QR code with Expo Go on your phone.

### Running on Simulator
```bash
npx expo start --ios    # iOS Simulator
npx expo start --android # Android Emulator
```

### Running on Real Device (different network)
```bash
npx expo start --tunnel
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo dev server |
| `npx expo start --clear` | Start with cleared cache |
| `npx expo start --tunnel` | Start with ngrok tunnel |
| `supabase functions deploy <name>` | Deploy an Edge Function |
| `supabase secrets set KEY=value` | Set Edge Function secret |
| `eas build --platform ios` | Build for iOS (TestFlight) |

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
- **Phase 2** (Pillars): All 8 knowledge pillars, tips, suggestion chips, chat persistence
- **Phase 3** (Camera Scan): Medicine/food scanning with Claude vision
- **Phase 4** (Monetise): RevenueCat paywall, subscription gate, webhook

See [BLUEPRINT.md](BLUEPRINT.md) for the full step-by-step build guide.

---

Built with Expo + Supabase + Claude API + RevenueCat
