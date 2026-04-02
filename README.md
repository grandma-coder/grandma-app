# grandma.app

**The parenting wisdom of a grandmother, available 24/7.**

An AI-powered parenting guide that gives personalized, warm advice about your child — feeding, medicines, vaccines, recipes, and more. Built with a multi-step onboarding journey, 8 specialized knowledge pillars, AI-powered chat and camera scanning, a caregiver invite system, activity logging, and a premium subscription model.

Powered by Claude AI, built with Expo + Supabase + RevenueCat.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Mobile | Expo SDK 54 + React Native 0.81 | Cross-platform iOS/Android app |
| Navigation | Expo Router v6 | File-based routing with tabs + modals |
| Styling | StyleSheet (primary) + NativeWind v4 | Native styles with Tailwind config |
| Backend | Supabase | Auth, PostgreSQL, Edge Functions, Storage |
| AI | Claude Sonnet API | Chat responses + image analysis via Edge Functions |
| State | Zustand v5 | Client-side state management (3 stores) |
| Data Fetching | TanStack React Query v5 | Server state, caching, date-based queries |
| Payments | RevenueCat | Subscriptions, paywall, receipt validation |
| Language | TypeScript (strict) | End-to-end type safety with typed routes |

---

## Features

### AI Chat with Grandma
- Personalized conversations powered by Claude Sonnet
- Child context (name, age, weight, allergies, medications) injected into every request
- Pillar-specific system prompts for specialized answers
- Chat history persisted to Supabase (last 50 messages loaded per session)
- Safety rules: no diagnosis, weight-based dosages only, always suggests pediatrician

### Camera Scanning
- Scan medicine boxes, food labels, nutrition facts, or general items
- 4 scan types: `medicine`, `food`, `nutrition`, `general`
- Image compressed to under 1MB (1024px width, 0.7 quality) before sending
- Claude Vision API analyzes the image with child-specific context
- Scan history saved with structured JSON results
- Free tier: 3 scans per child, then paywall

### Journey-Based Onboarding (4 screens)
1. **Journey Selection** — Choose: "I'm pregnant" / "I have a newborn" / "I have a toddler"
2. **Due Date / LMP** — Enter due date or last menstrual period (calculates pregnancy week)
3. **Activity Tracking** — Select activities to track, customized per journey:
   - Pregnancy: symptoms, appointments, mood, weight, nutrition, supplements
   - Newborn/Toddler: feeding, sleep, diaper, mood, growth, medicine, vaccines, milestones
4. **Child Profile** — Enter child name, birth date, weight, height, allergies

### 8 Knowledge Pillars
Each pillar has 3 tips + 4 suggestion chips that deep-link into a pillar-scoped chat:

| ID | Icon | Name | Color | Description |
|----|------|------|-------|-------------|
| `milk` | Baby Bottle | Breastfeeding | Pink | Formula, breastfeeding, bottles, transition milestones |
| `food` | Avocado | Feeding | Green | Introducing solids, meal plans, age-appropriate textures |
| `nutrition` | DNA | Nutrition | Yellow | Vitamins, minerals, supplementation guidance |
| `vaccines` | Syringe | Vaccines | Blue | CDC/WHO schedule, reactions, post-vaccine care |
| `clothes` | Baby | Layette | Purple | Clothing sizes, brand conversions, seasonal guides |
| `recipes` | Pot of Food | Recipes | Orange | Age-appropriate meals, allergen-safe cooking |
| `natural` | Herb | Natural Care | Teal | Evidence-backed home care, when to see a doctor |
| `medicine` | Pill | Medicine | Red | Weight-based dosages, safety, interactions |

### Caregiver Invite System
- Invite nannies or family members by email
- 3 roles: `parent`, `nanny`, `family`
- Granular permissions per caregiver: `view`, `log_activity`, `chat`
- Secure token-based invite flow (generate token, share link, accept)
- Manage caregivers screen: view status, revoke access
- Invite statuses: `pending`, `accepted`, `revoked`

### Activity Logging & History
- Log activities: feeding, sleep, diaper, mood, growth, medicine, vaccines, milestones
- History tab with 7-day week strip date picker
- Filter activity logs by selected date
- Data fetched with React Query for caching and background refresh

### Premium Subscription
| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | Chat with Grandma, browse all 8 pillars, 3 free scans |
| Premium | $9.99/mo or $69.99/yr | Unlimited scans, unlimited chat, vaccine reminders, priority responses |

- 7-day free trial on premium
- Managed by RevenueCat SDK
- Subscription status synced to Supabase via webhook

---

## Project Structure

```
grandma-app/
├── app/                                # Expo Router screens (file-based routing)
│   ├── _layout.tsx                     # Root layout — auth guard, RevenueCat init, child loading
│   ├── (auth)/                         # Authentication screens
│   │   ├── _layout.tsx                 # Auth stack layout
│   │   ├── welcome.tsx                 # Landing screen with sign in/up buttons
│   │   ├── sign-in.tsx                 # Email + password sign in
│   │   └── sign-up.tsx                 # Email + password registration
│   ├── onboarding/                     # Onboarding flow (4 screens)
│   │   ├── _layout.tsx                 # Onboarding stack layout
│   │   ├── journey.tsx                 # Select journey (pregnancy/newborn/toddler)
│   │   ├── due-date.tsx                # Due date or LMP picker
│   │   ├── activities.tsx              # Select activities to track
│   │   └── child-profile.tsx           # Child name, birth date, weight, allergies
│   ├── (tabs)/                         # Main tab navigation (4 tabs)
│   │   ├── _layout.tsx                 # Tab bar config (Home, History, Ask Grandma, Profile)
│   │   ├── index.tsx                   # Home — CTA buttons + pillar grid
│   │   ├── history.tsx                 # Activity log with week strip date picker
│   │   ├── chat.tsx                    # Chat with Grandma (AI conversation)
│   │   └── profile.tsx                 # Child profile + scan history + sign out
│   ├── pillar/
│   │   └── [id].tsx                    # Dynamic pillar detail (tips + suggestion chips)
│   ├── scan.tsx                        # Camera/photo scan modal
│   ├── paywall.tsx                     # Premium subscription paywall modal
│   ├── child-picker.tsx                # Switch between child profiles modal
│   ├── invite-caregiver.tsx            # Invite nanny/family by email modal
│   ├── manage-caregivers.tsx           # List & revoke caregivers
│   └── accept-invite.tsx               # Accept caregiver invite
│
├── components/                         # Reusable UI components
│   ├── home/
│   │   └── ActivityCard.tsx            # Activity tracking card (title, icon, color, last entry)
│   ├── pillar/
│   │   ├── PillarCard.tsx              # Pillar card for home grid
│   │   └── TipCard.tsx                 # Knowledge tip card (label + text)
│   └── ui/
│       ├── DatePickerField.tsx         # Date picker with label and formatting
│       └── ResultCard.tsx              # Scan result bottom sheet
│
├── lib/                                # Core business logic
│   ├── supabase.ts                     # Supabase client with SecureStore auth persistence
│   ├── claude.ts                       # callNana() — sends messages + child context to Edge Function
│   ├── scan.ts                         # scanImage() — sends base64 image to Edge Function
│   ├── pillars.ts                      # 8 pillar definitions (id, name, icon, color, tips, suggestions)
│   └── revenue.ts                      # RevenueCat helpers (init, purchase, restore, checkPremium)
│
├── store/                              # Zustand v5 state stores
│   ├── useChildStore.ts                # Children list + active child (with role & permissions)
│   ├── useChatStore.ts                 # Chat messages array
│   └── useJourneyStore.ts             # Onboarding journey state (journey, dates, activities)
│
├── types/
│   └── index.ts                        # TypeScript interfaces & types
│
├── supabase/
│   ├── functions/
│   │   ├── nana-chat/index.ts          # Claude chat proxy Edge Function
│   │   ├── scan-image/index.ts         # Claude vision proxy Edge Function
│   │   ├── invite-caregiver/index.ts   # Generate caregiver invite token
│   │   ├── accept-invite/index.ts      # Accept invite + link user to child
│   │   └── revenuecat-webhook/index.ts # Subscription status sync webhook
│   └── migrations/                     # Database migration files
│
├── .env                                # Secret environment variables (not committed)
├── .env.example                        # Template for .env
├── BLUEPRINT.md                        # Full build blueprint
├── app.json                            # Expo config (iOS/Android bundle IDs, plugins)
├── babel.config.js                     # Babel config (babel-preset-expo)
├── tailwind.config.js                  # Tailwind/NativeWind config
├── tsconfig.json                       # TypeScript strict config + typed routes
└── package.json                        # Dependencies and scripts
```

---

## Architecture

### Authentication & Routing Flow

```
App opens
  └─ _layout.tsx checks Supabase session
      ├─ No session → (auth)/sign-in
      └─ Has session
          ├─ Load profile from profiles table
          ├─ Load children via child_caregivers (accepted) → children join
          ├─ Fallback: load own children directly (pre-migration compat)
          ├─ Initialize RevenueCat with user ID
          ├─ No children → /onboarding/journey
          └─ Has children → /(tabs)
```

On sign out, all Zustand stores are cleared and the user returns to Sign In.

### State Management

| Store | Purpose | Key State |
|-------|---------|-----------|
| `useChildStore` | Active child context | `children[]`, `activeChild`, role & permissions |
| `useChatStore` | Chat conversation | `messages[]`, add/clear actions |
| `useJourneyStore` | Onboarding flow | journey type, dates, week number, tracked activities |

### Data Flow: Chat

```
User types message
  → Save to useChatStore + Supabase (chat_messages)
  → callNana({ messages, child, pillarId })
    → Supabase Edge Function (nana-chat)
      → Claude Sonnet API (with system prompt + child context)
    → Response saved to store + Supabase
  → UI updates with assistant reply
```

### Data Flow: Scan

```
User takes/picks photo
  → Image compressed (1024px, 0.7 quality)
  → scanImage({ imageBase64, mediaType, scanType, child })
    → Supabase Edge Function (scan-image)
      → Claude Vision API (with scan-type question + child context)
    → Result displayed in ResultCard bottom sheet
  → Saved to scan_history table
```

---

## Database Schema

Six tables in Supabase with Row Level Security:

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

### `child_caregivers`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| child_id | uuid (FK) | References children.id |
| user_id | uuid (FK) | References profiles.id (null until accepted) |
| email | text | Invitee's email |
| role | text | `parent`, `nanny`, or `family` |
| status | text | `pending`, `accepted`, or `revoked` |
| permissions | jsonb | `{ view, log_activity, chat }` booleans |
| invite_token | text | Unique token for invite link |
| invited_by | uuid (FK) | References profiles.id |
| created_at | timestamptz | Auto-generated |
| accepted_at | timestamptz | When invite was accepted |

### `activity_logs`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| child_id | uuid (FK) | References children.id |
| activity_type | text | feeding, sleep, diaper, mood, growth, etc. |
| value | text | Activity value/measurement |
| notes | text | Optional notes |
| created_at | timestamptz | Auto-generated |

---

## Edge Functions

### `nana-chat` — Grandma's Brain
- **Receives:** `{ messages[], childContext, pillarId }`
- Builds a system prompt with child profile (name, age in months, weight, allergies, medications) + pillar-specific instructions
- Calls Claude Sonnet API (`claude-sonnet-4-20250514`), returns the reply
- Safety rules: no diagnosis, weight-based dosages only, always suggest pediatrician
- Runs on Deno with CORS headers

### `scan-image` — Vision Analysis
- **Receives:** `{ imageBase64, mediaType, scanType, childContext }`
- Sends image to Claude Vision API with scan-type-specific analysis question
- Returns structured analysis of medicine boxes, food labels, nutrition facts, etc.
- Child context included in system prompt for personalized safety checks

### `invite-caregiver` — Caregiver Invitations
- **Receives:** `{ childId, email, role }`
- **Auth:** requires JWT (must be parent of child)
- Creates entry in `child_caregivers` with auto-generated invite token
- Handles duplicate invites and revoked status re-activation
- Returns `{ inviteToken }` for sharing

### `accept-invite` — Accept Invitation
- **Receives:** `{ token }`
- **Auth:** requires JWT
- Verifies token exists, email matches, not already accepted/revoked
- Updates `child_caregivers` with `user_id`, `status=accepted`, `accepted_at`
- Creates profile if user doesn't have one yet
- Returns `{ success, childName, childId }`

### `revenuecat-webhook` — Subscription Sync
- Receives RevenueCat webhook events (purchase, renewal, cancellation)
- Updates `profiles.subscription_status` accordingly
- Uses Supabase service role key (server-side only, no JWT)

---

## TypeScript Types

```ts
// Core entities
interface Child { id, parentId, name, birthDate, weightKg, heightCm, allergies[], medications[], countryCode }
interface Message { id, childId, pillarId?, role: 'user' | 'assistant', content, createdAt }
interface Pillar { id: PillarId, name, icon, description, color, tips[], suggestions[] }

// Caregiver system
type CaregiverRole = 'parent' | 'nanny' | 'family'
type InviteStatus = 'pending' | 'accepted' | 'revoked'
interface CaregiverPermissions { view: boolean, log_activity: boolean, chat: boolean }
interface ChildCaregiver { id, childId, userId?, email, role, status, permissions, inviteToken?, invitedBy, createdAt, acceptedAt? }
interface ChildWithRole extends Child { caregiverRole, permissions }

// Pillar IDs
type PillarId = 'milk' | 'food' | 'nutrition' | 'vaccines' | 'clothes' | 'recipes' | 'natural' | 'medicine'
```

---

## Design System

| Token | Value | Usage |
|-------|-------|-------|
| Primary green | `#7BAE8E` | Buttons, selected states, active tab |
| Background | `#FAF8F4` | App background, tab bar |
| Dark text | `#1A1A2E` | Headings, body text |
| Gray text | `#888888` | Secondary text, placeholders |
| Border | `#E8E4DC` | Dividers, card borders |
| Pillar colors | 8 unique pastels | Pink, green, yellow, blue, purple, orange, teal, red |

---

## Screens Overview

| Screen | Route | Description |
|--------|-------|-------------|
| Welcome | `(auth)/welcome` | Landing page with sign in/up buttons |
| Sign In | `(auth)/sign-in` | Email + password authentication |
| Sign Up | `(auth)/sign-up` | New account registration |
| Journey | `onboarding/journey` | Select pregnancy/newborn/toddler |
| Due Date | `onboarding/due-date` | Pregnancy due date or LMP picker |
| Activities | `onboarding/activities` | Choose activities to track |
| Child Profile | `onboarding/child-profile` | Enter child details |
| Home | `(tabs)/index` | CTA buttons + 8 pillar cards |
| History | `(tabs)/history` | Activity log with date picker |
| Chat | `(tabs)/chat` | AI conversation with Grandma |
| Profile | `(tabs)/profile` | Child info + scan history + settings |
| Pillar Detail | `pillar/[id]` | Tips + suggestion chips |
| Scan | `scan` | Camera/gallery + scan type picker (modal) |
| Paywall | `paywall` | Premium subscription offer (modal) |
| Child Picker | `child-picker` | Switch between children (modal) |
| Invite Caregiver | `invite-caregiver` | Send nanny/family invite (modal) |
| Manage Caregivers | `manage-caregivers` | List + revoke caregivers |
| Accept Invite | `accept-invite` | Accept caregiver invitation |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Supabase CLI (`brew install supabase/tap/supabase`)
- Expo Go app on your phone (or iOS Simulator / Android Emulator)

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
supabase functions deploy invite-caregiver
supabase functions deploy accept-invite
supabase functions deploy revenuecat-webhook --no-verify-jwt

# 6. Start the app
npx expo start
```

Scan the QR code with Expo Go on your phone, or press `i` for iOS Simulator.

### Running on Simulator
```bash
npx expo start --ios      # iOS Simulator
npx expo start --android  # Android Emulator
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
| `npx expo start --clear` | Start with cleared Metro cache |
| `npx expo start --tunnel` | Start with ngrok tunnel (cross-network) |
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
- **Phase 3** (Camera Scan): Medicine/food scanning with Claude Vision
- **Phase 4** (Monetise): RevenueCat paywall, subscription gate, webhook
- **Phase 5** (Journey): Journey-based onboarding, activity cards, history tab, date picker
- **Phase 6** (Caregivers): Nanny/family invite system, permissions, multi-child support

See [BLUEPRINT.md](BLUEPRINT.md) for the full step-by-step build guide.

---

Built with Expo + Supabase + Claude AI + RevenueCat
