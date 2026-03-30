# grandma.app — Complete Build Blueprint v2.0

**Step-by-step · Copy-paste ready · Updated April 2026**

---

## What Changed in v2.0

- Fixed package versions, added v5 syntax corrections for Zustand and React Query
- Includes Lovable website section and full design platform guide with Figma

---

## Updated Package Versions (March 2026)

| Package | Version | Notes |
|---|---|---|
| expo | 55.0.9 | Updated |
| expo-router | 55.0.8 | Updated |
| react-native | 0.84.1 | Updated |
| @supabase/supabase-js | 2.100.1 | Updated |
| nativewind | 4.2.3 | Same |
| zustand | 5.0.12 | Updated |
| @tanstack/react-query | 5.95.2 | Updated |
| react-native-purchases | 9.15.0 | Updated |
| create-expo-app | 3.5.3 | Same |

---

## Critical Syntax — Zustand v5

```ts
// CORRECT
import { create } from 'zustand'

// WRONG — old v4
import create from 'zustand' // default import no longer works
```

## Critical Syntax — React Query v5

```ts
// CORRECT
const { data } = useQuery({ queryKey: ['child', id], queryFn: () => fetch(id) })

// WRONG — v4 positional args
const { data } = useQuery(['child', id], () => fetch(id))
```

## Claude Model String

```
model: "claude-sonnet-4-20250514"
```

---

## Section 1 — Accounts & Tools

### Accounts

- github.com
- supabase.com
- console.anthropic.com
- expo.dev
- revenuecat.com
- resend.com
- posthog.com
- lovable.dev

### Tools

- **Homebrew** — macOS package manager
- **Node.js 18+** — runtime
- **Expo CLI** — React Native toolchain
- **EAS CLI** — Expo Application Services (builds + submissions)
- **Supabase CLI** — local dev, migrations, function deploys
- **VS Code** with extensions:
  - Prettier
  - ESLint
  - Tailwind IntelliSense
  - Expo Tools
  - Error Lens

---

## Section 2 — Project Setup

### Create the App

```bash
npx create-expo-app@latest grandma-app --template blank-typescript
```

### Install Dependencies

- expo-router
- @supabase/supabase-js
- zustand@5
- @tanstack/react-query@5
- nativewind@4

### Configure NativeWind

- `tailwind.config.js` — content paths pointing to app/ and components/
- `babel.config.js` — add NativeWind babel plugin

### Git & Environment

- Create GitHub repo and push
- `.env` file with:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Folder Structure

```
app/
  (auth)/
    welcome.tsx
    sign-in.tsx
    sign-up.tsx
  (tabs)/
    _layout.tsx
    index.tsx
    chat.tsx
    profile.tsx
  pillar/
    [id].tsx
  onboarding.tsx
  _layout.tsx

components/
  chat/
  pillar/
  ui/

lib/
  supabase.ts
  claude.ts
  pillars.ts

store/
  useChildStore.ts
  useChatStore.ts

hooks/
  useSession.ts

types/
  index.ts

supabase/
  functions/
    nana-chat/
```

---

## Section 3 — Supabase Setup

### Initial Setup

1. Create a Supabase project
2. Copy the project URL and anon key into `.env`
3. Create `lib/supabase.ts` with `ExpoSecureStoreAdapter` for token persistence

### Database Schema

Tables:

- **profiles** — user profile data
- **children** — child records linked to a parent
- **chat_messages** — conversation history
- **scan_history** — camera scan results

### Row Level Security

- Enable RLS on all tables
- Policies ensure users can only read/write their own data

### Auth

- Enable email auth
- Enable Google OAuth

### TypeScript Types

```ts
interface Child {
  id: string
  parentId: string
  name: string
  birthDate: string
  weightKg: number
  heightCm: number
  allergies: string[]
  medications: string[]
  countryCode: string
}

interface Message {
  id: string
  childId: string
  pillarId: PillarId
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

type PillarId =
  | 'milk'
  | 'food'
  | 'nutrition'
  | 'vaccines'
  | 'clothes'
  | 'recipes'
  | 'natural'
  | 'medicine'

interface Pillar {
  id: PillarId
  name: string
  icon: string
  description: string
  color: string
  tips: string[]
  suggestions: string[]
}

interface ScanResult {
  id: string
  childId: string
  scanType: string
  imageUrl: string
  resultJson: object
  createdAt: string
}
```

---

## Section 4 — Edge Function (Nana's Brain)

### Setup

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase secrets set ANTHROPIC_API_KEY=<your-key>
```

### nana-chat Edge Function

- Receives: `messages`, `childContext`, `pillarId`
- Builds a system prompt with child-specific context
- Calls the Claude API with the assembled messages
- Returns the assistant response

### System Prompt Core

> "You are Grandma — warm, wise, knowledgeable parenting guide"

### Pillar-Specific Notes

The system prompt is augmented with guidance tailored to the active pillar:

- **medicine** — dosage awareness, always recommend consulting a pediatrician
- **vaccines** — evidence-based schedules, address common concerns
- **food** — age-appropriate introduction, allergen awareness
- **natural** — safe home remedies, clear boundaries on when to see a doctor
- **milk** — breastfeeding support, formula guidance, weaning
- **clothes** — sizing by age/weight, seasonal dressing, safe sleepwear
- **nutrition** — macro/micro needs by age, picky eater strategies
- **recipes** — age-appropriate meals, allergy-safe substitutions

### Deploy

```bash
supabase functions deploy nana-chat --no-verify-jwt
```

### Client Helper

- `lib/claude.ts` — `callNana()` function that invokes the edge function from the app

---

## Section 5 — Build Phases

### Phase 1: Foundation (Weeks 1-2)

- Start Expo dev server, verify on Expo Go
- Implement `lib/supabase.ts` and `lib/claude.ts`
- Root layout with auth guard (redirect unauthenticated users)
- Sign-up, sign-in, and onboarding screens
- Zustand child store
- Tab layout with bottom navigation
- Chat screen wired to the edge function

**Milestone:** Ask Grandma a question on your phone and get a response.

### Phase 2: All 8 Pillars (Weeks 3-4)

- `lib/pillars.ts` — define all 8 pillars with tips, icons, colors, suggestions
- Home screen with a pillar grid
- `PillarCard` and `TipCard` components
- Pillar detail screen (`app/pillar/[id].tsx`) with tips and suggestion chips
- Profile screen with child info
- Chat history persistence in Supabase

### Phase 3: Camera Scan (Weeks 5-6)

- Install: `expo-camera`, `expo-image-picker`, `expo-image-manipulator`
- Create a Supabase Storage bucket (`scan-images`)
- `scan-image` Edge Function — accepts an image, returns analysis
- Camera view with pillar selector (e.g., scan a food label under the nutrition pillar)
- Image compression before upload
- `ResultCard` component to display scan results
- Persist results in `scan_history`

### Phase 4: Monetise + Launch (Weeks 7-8)

- RevenueCat integration:
  - Monthly: **$9.99/mo**
  - Annual: **$69.99/yr**
- Paywall screen shown to free users after limit
- Subscription gate middleware
- `revenuecat-webhook` Edge Function to sync subscription status
- PostHog analytics for key events
- EAS build for iOS
- TestFlight distribution
- App Store submission

---

## Section 6 — Design (Figma)

### Setup

- Figma free tier covers the MVP
- Dev Mode MCP connects Figma designs directly to Claude for code generation

### File Structure

1. **Brand Foundation** — colors, typography, spacing, iconography
2. **Component Library** — buttons, cards, inputs, chips, nav bars
3. **App Screens** — every screen in the app, organized by flow
4. **App Store Assets** — screenshots, feature graphics, icon

### Brand Colors

| Name | Hex | Usage |
|---|---|---|
| Cream | `#FAF8F4` | Background |
| Sage | `#7BAE8E` | Primary / accents |
| Navy | `#1A1A2E` | Text / dark elements |

### Typography

- **Headings** — Serif font (warm, trustworthy feel)
- **Body** — DM Sans (clean, modern readability)

---

## Section 7 — Landing Page (Lovable)

### Stack

- **Lovable** — AI website builder
- **GitHub** — source control
- **Vercel** — hosting and deployment
- **Tally.so** — waitlist form
- **Resend** — welcome emails

### Page Sections

1. Navigation bar
2. Hero with headline and CTA
3. Problem statement (parenting info overload)
4. How it works (3-step explainer)
5. Features grid (8 pillars)
6. Camera highlight section
7. Trust signals (evidence-based, pediatrician-reviewed)
8. Final CTA
9. Footer

### Workflow

1. Generate the site in Lovable using a detailed prompt
2. Export to GitHub
3. Deploy on Vercel
4. Embed a Tally.so waitlist form
5. Connect Resend to send welcome emails on signup

---

## Section 8 — Vibe Coding Workflow

### The Loop

1. **Pick a file** — one file at a time
2. **Give Claude context** — paste the current file + relevant types/stores
3. **Paste the code** Claude gives you into your editor
4. **Test** — run in Expo Go, check for errors
5. **Fix** — if something breaks, share the error with Claude
6. **Commit** — `git add` + `git commit` after each working file

### Prompt Templates

- **New screen:** "Create [screen name]. It should [behavior]. Use these types: [paste types]. Use this store: [paste store]."
- **Error fixing:** "I'm getting this error: [paste error]. Here is the file: [paste file]. Fix it."
- **Zustand store:** "Create a Zustand v5 store for [domain]. It should manage [state]. Actions: [list actions]."
- **Figma Dev Mode:** "Here is the Figma design for [screen]. Convert it to a React Native component using NativeWind."

---

## Section 9 — Costs

### MVP Monthly Cost

| Item | Cost |
|---|---|
| Claude API | ~$15/mo |
| Domain | ~$2/mo |
| Supabase | Free tier |
| Expo / EAS | Free tier |
| RevenueCat | Free tier |
| PostHog | Free tier |
| Vercel | Free tier |
| Resend | Free tier |
| **Total** | **~$17/mo** |

### Break Even

2 subscribers at $9.99/mo covers the MVP cost.

---

## Section 10 — Day 1 Action List

Complete in 3-4 hours. End result: a working app on your phone.

1. Create GitHub account (if needed)
2. Create Supabase project
3. Create Anthropic console account and get API key
4. Create Expo account
5. Install Homebrew, Node.js, Expo CLI, EAS CLI, Supabase CLI
6. Set up VS Code with recommended extensions
7. Scaffold the Expo app with `create-expo-app`
8. Install all dependencies
9. Configure NativeWind
10. Create `.env` with Supabase credentials
11. Set up the folder structure
12. Implement `lib/supabase.ts`
13. Create the database tables and RLS policies in Supabase
14. Deploy the `nana-chat` Edge Function
15. Implement `lib/claude.ts`
16. Build the auth flow (welcome, sign-in, sign-up)
17. Wire up the chat screen and test on your phone

**You should now be able to open the app on Expo Go, sign in, and ask Grandma a question.**
