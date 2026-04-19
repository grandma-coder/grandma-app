# grandma.app — Claude Design Brief (Comprehensive)

## What This Is

**grandma.app** is a mobile parenting companion app for iOS/Android built with React Native + Expo. It covers the full parenting journey across 3 distinct modes: **Pre-Pregnancy → Pregnancy → Kids**. The entire UI adapts per mode — colors, content, navigation labels, and features all change.

The app is powered by an AI called **Guru Grandma** — a warm, wise grandmother persona who guides users through every stage. AI chat is a core feature available across all modes.

---

## Platform

- **Mobile only** — iOS primary, Android secondary
- **Base screen:** iPhone 14 (390×844pt). Safe area insets top ~59pt, bottom ~34pt
- **Navigation:** Bottom tab bar (5 tabs) + stack navigation for secondary screens
- **Fonts:** Cabinet Grotesk Black (display/headings) + Satoshi Variable (body/UI)
- **Theme:** Dark with neon accents. Mode color infuses the full experience when active.

---

## The 3 Journey Modes

The entire app adapts based on the user's active mode. Color, content, and features all shift.

### Mode 1 — Pre-Pregnancy (Pink `#FF8AD8`)
For women trying to conceive. Cycle tracking, hormone charts, fertile window visualization, ovulation prediction, symptom logging, fertility education.

**Home shows:** Cycle phase ring · hormone chart · fertile window strip · daily health insights · Grandma wisdom · pillar grid (6 pillars)  
**Agenda tabs:** Cycle Tracker / Checklist / Appointments  
**Library:** 6 fertility pillars — Nutrition, Hormones, Mental Health, Fitness, Sleep, Supplements  
**Vault:** Hidden

### Mode 2 — Pregnancy (Purple `#B983FF`)
For pregnant women. Week-by-week tracking, baby size comparisons, symptom logging, kick counter, contraction timer, birth plan, partner dashboard.

**Home shows:** Week hero carousel · baby size card · daily development insight · vitals carousel (weight/mood/symptoms) · affirmation reveal card · reminders · pillar grid (9 pillars)  
**Agenda tabs:** Timeline / Symptoms / Kicks  
**Library:** 9 pregnancy pillars — Nutrition, Mental Health, Birth Prep, Fitness, Sleep, Partner, Medical, Layette, Breastfeeding  
**Vault:** Ultrasound photos, test results, birth plan

### Mode 3 — Kids (Blue `#4D96FF`)
For parents of babies/toddlers. Sleep tracking, feeding logs, mood analysis, growth leaps, vaccine records, caregiver management, nanny updates.

**Home shows:** Sleep circle · mood analysis · calories tracker · growth leaps card · location card (AirTag) · caregiver activity feed · milk tracker · pillar grid (9 pillars)  
**Agenda tabs:** Timeline / Food / Notes  
**Library:** 9 kids pillars — Feeding, Sleep, Development, Health, Safety, Play, Routines, Care Circle, Memories  
**Vault:** Medical records, vaccines, emergency card, hospital documents

---

## Design Tokens — `constants/theme.ts`

### Dark Theme (default)
```
bg:            #0E0B1A     deep dark with purple tint
bgWarm:        #140F28     slightly warmer dark
surface:       #1A1430     card backgrounds
surfaceRaised: #231B42     elevated/nested cards
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
primary:       #7048B8  →  #A07FDC (dark mode)   purple — primary buttons, active states
primaryLight:  #9B70D4  →  #C4A8F0 (dark mode)
secondary:     #3B7DD8  →  #6AABF7 (dark mode)   blue — secondary actions
accent:        #F59E0B  →  #FBBF24 (dark mode)   amber — highlights

prePregnancy:  #FF8AD8   pink
pregnancy:     #B983FF   purple
kids:          #4D96FF   blue

green:         #A2FF86   ovulation, success, feeding
orange:        #FF6B35   recipes, insurance, sign-out
```

### Component Patterns
```
Glass Card:      bg rgba(255,255,255,0.06) · border 1px rgba(255,255,255,0.12) · radius 32px · pad 20-24px
Primary Button:  gradient #7048B8→#4A2880 · height 56-72px · radius 999px · white text 18px w700 · glow shadow
Input Field:     bg rgba(255,255,255,0.04) · height 72px · radius 36px · pad 0 28px · border rgba(255,255,255,0.12)
Tab Bar:         height 84px · pb 34px · active #A07FDC · inactive rgba(255,255,255,0.40) · labels 10px w700 uppercase
```

---

## AUTH FLOW

### Screen 1 — Welcome (`app/(auth)/welcome.tsx`)

**Purpose:** First impression. Full-screen animated landing with OAuth sign-in options.

**Layout:**
- Full-screen animated gradient background (CosmicBackground — floating purple/pink orbs)
- Animated GRANDMA wordmark fades in with spring scale animation
- Tagline below wordmark
- Two CTA buttons stacked vertically at bottom:
  - **Apple Sign In** (primary, visible only on iOS)
  - **Google Sign In** (primary)
- Terms of Service + Privacy Policy links at very bottom (10px muted text)

**Logic:**
- Calls `signInWithApple()` or `signInWithGoogle()` from `lib/auth-providers.ts`
- Each button has independent loading state
- Errors surface as native alerts (except user cancellation — silently ignored)
- On success: auth state change fires automatically → route guard in `_layout.tsx` navigates to onboarding or `/(tabs)` based on whether user has completed onboarding

**No email/password here.** Email auth is on sign-up/sign-in screens linked from a secondary path.

---

### Screen 2 — Sign Up (`app/(auth)/sign-up.tsx`)

**Purpose:** Email/password account creation, alternative to OAuth.

**Layout:**
- CosmicBackground
- Back button top-left (ArrowLeft icon)
- "Create account" heading
- SocialAuthButtons component (Apple + Google, same as welcome)
- "— or sign up with email —" divider
- Email text input (keyboard type: email-address)
- Password text input (secureTextEntry, min 6 chars)
- "Create account" primary button
- "Already have an account? Sign in" link → `/sign-in`

**Logic:**
- On submit: calls `supabase.auth.signUp({ email, password })`
- On success: shows alert "Check your email to confirm your account" → routes to `/sign-in`
- Keyboard avoidance enabled

---

### Screen 3 — Sign In (`app/(auth)/sign-in.tsx`)

**Purpose:** Login for returning email/password users.

**Layout:**
- CosmicBackground
- Back button top-left
- "Welcome back" heading
- SocialAuthButtons (Apple + Google)
- "— or sign in with email —" divider
- Email input
- Password input (secure)
- "Sign in" primary button
- "New here? Create an account" link → `/sign-up`

**Logic:**
- On submit: calls `supabase.auth.signInWithPassword({ email, password })`
- On success: auth state change triggers route guard automatically (no explicit push)
- Errors show as inline alerts

---

## ONBOARDING FLOW

The onboarding is a multi-step branched flow. Users land here after first sign-in. Route guard in the root layout detects if onboarding is complete; if not, it pushes to `/onboarding/journey`.

Flow uses `useOnboardingStore` to maintain a queue of steps and `useBehaviorStore` to track enrolled journeys.

---

### Onboarding Screen 1 — Journey Picker (`app/onboarding/journey.tsx`)

**Purpose:** Choose which life stage(s) to track. This is step one of onboarding AND the entry point when adding a new journey later.

**Question asked:** *"Which journey are you on?"*

**Layout:**
- Heading + warm subtext from Grandma
- Three large journey cards, each showing:
  - Icon (Moon for Pre-Pregnancy · Heart for Pregnancy · Star for Kids)
  - Title
  - Short subtitle
  - On selection: border tint + background tint + checkmark badge
- In **add-mode** (when triggered from profile later): already-enrolled journeys show an "Active" badge and are dimmed/non-interactive
- "Continue" CTA appears at bottom after at least one selection
- Empty state if all 3 are already active: *"You have all three journeys active, dear"*

**Input:** Multi-select (first time) or single-select (add mode)

**Logic:**
- Calls `enroll()` for each selected behavior in `useBehaviorStore`
- Builds an onboarding queue via `useOnboardingStore.buildQueue()`
- Priority order in queue: pregnancy first, then pre-pregnancy, then kids
- Sets `useModeStore.mode` to first selected behavior
- Routes to first behavior's onboarding start:
  - Pre-Pregnancy → `/onboarding/cycle`
  - Pregnancy → `/onboarding/pregnancy`
  - Kids → `/onboarding/kids`
  - If multiple selected: goes to first, then transition screen handles next

---

### Onboarding Screen 2 — Parent Name (`app/onboarding/parent-name.tsx`)

**Purpose:** Personalize the Grandma experience by collecting how Grandma should address the user.

**Question asked:** *"How shall I call you, dear?"*

**Layout:**
- Warm illustration or icon
- Heading + Grandma subtext
- Single text input: "Your name"
- "Continue" primary button
- "Skip for now" secondary link

**Input:** Free text, single field

**Logic:**
- Saves to `useJourneyStore.setParentName(name)`
- On continue:
  - If mode is 'pregnancy' → `/onboarding/due-date`
  - Else → `/onboarding/baby-name`
- Skip navigates to same destination without saving

---

### Onboarding Screen 3 — Due Date (`app/onboarding/due-date.tsx`)
*(Pregnancy mode only)*

**Purpose:** Establish the pregnancy timeline. This drives week-by-week tracking across the entire app.

**Question asked:** *"When is your due date?"*

**Layout:**
- Toggle at top: "I know my due date" ↔ "I know my last period (LMP)"
- DatePickerField component (modal date picker)
- Live preview below picker: *"Week 24 of 40"* (auto-calculated from date entered)
- "Continue" CTA

**Inputs:**
- Toggle: Due Date mode vs LMP mode
- Date picker: calendar modal

**Logic:**
- Due date mode: takes date directly, back-calculates current week
- LMP mode: adds 280 days to get due date, calculates current week
- Week number stored in `useJourneyStore` (dueDate, lmpDate, weekNumber)
- On continue → `/onboarding/baby-name`

---

### Onboarding Screen 4 — Baby Name (`app/onboarding/baby-name.tsx`)

**Purpose:** Collect the baby's name for personalized messaging throughout the app.

**Question asked:**
- Pregnancy mode: *"Have you chosen a name?"*
- Kids mode: *"What's your little one's name?"*

**Layout:**
- Heading + warm Grandma subtext
- Text input for baby/child name
- Pregnancy mode: "We haven't decided yet" skip option visible
- "Continue" CTA

**Input:** Free text

**Logic:**
- Saves to `useJourneyStore.setBabyName(name)`
- On continue → `/onboarding/activities`

---

### Onboarding Screen 5 — Activities (`app/onboarding/activities.tsx`)

**Purpose:** Select which health activities/metrics to track. Personalizes the agenda and logging experience.

**Question asked:** *"What would you like to track?"*

**Layout:**
- Heading + Grandma subtext
- Scrollable list of activity chips, each with:
  - Emoji icon in circle
  - Activity title
  - Short subtitle
  - Checkbox on right (pre-checked = default)
- Selected count shown at bottom: *"5 selected"*
- "Let's go" CTA (disabled at 0 selections)

**Activities per mode:**

Pre-Pregnancy:
- 🥑 Nutrition — Track meals and nutrients
- 🌡️ Fertility — Monitor ovulation and cycle
- 📅 Appointments — Manage medical visits
- 😊 Mood — Track emotional health
- 💪 Fitness — Log exercise and movement
- 📚 Learning — Access fertility education

Pregnancy:
- 🤒 Symptoms — Log pregnancy symptoms
- 📅 Appointments — Track prenatal visits
- 😊 Mood — Track emotional wellbeing
- ⚖️ Weight — Monitor weight changes
- 🥗 Nutrition — Track meals and cravings
- 💊 Supplements — Log vitamins and supplements

Kids:
- 🍼 Feeding — Breast, bottle, and solids
- 😴 Sleep — Track sleep patterns
- 🚼 Diaper — Log diaper changes
- 😊 Mood — Track baby's temperament
- 📏 Growth — Monitor height and weight
- 💊 Medicine — Track medications
- 💉 Vaccines — Vaccination records
- 🎯 Milestones — Developmental milestones

**Logic:**
- Saves selections to `useJourneyStore`
- On "Let's go" → `/onboarding/child-profile`

---

### Onboarding Screen 6 — Child Profile (`app/onboarding/child-profile.tsx`)

**Purpose:** Final general onboarding step. Collect child details and create the database records (child + caregiver link).

**Question asked:** *"Tell me about your little one"*

**Layout:**
- Heading + subtext
- Form fields:
  - Child name (required for Kids, optional for Pregnancy)
  - Birth date (Kids mode only — DatePickerField)
  - Weight in kg (Kids mode only)
  - Known allergies (comma-separated text input)
- Terms of Serenity + Privacy Policy checkbox/acknowledgment
- "Let's begin" primary CTA

**Inputs:**
- Text (name)
- DatePickerField (DOB — kids only)
- Number input (weight — kids only)
- Text area (allergies)

**Logic:**
- On submit:
  1. Upserts `profiles` record in Supabase
  2. Inserts record to `children` table
  3. Creates `child_caregivers` entry: role='parent', status='accepted', permissions=full
  4. Calls `useChildStore.setChildren()` with new child data
- On success → `/(tabs)` (home screen)
- This is the exit point of the main onboarding; mode-specific onboarding runs as an additional flow

---

### Onboarding Transition Screen (`app/onboarding/transition.tsx`)

**Purpose:** Warm, encouraging interstitial between multi-behavior onboarding steps. Appears when user enrolled in multiple journeys and is about to enter the next behavior's specific onboarding.

**Layout:**
- Large icon with animated glow (color-coded to upcoming behavior)
- Heading tailored to next behavior
- Supportive Grandma subtext
- Auto-advancing progress bar (fills over 8 seconds)
- "Let's go, dear" primary CTA
- "Skip for now" secondary link

**Logic:**
- Auto-advances after 8 seconds
- "Let's go" → routes to next behavior's onboarding route immediately
- "Skip" → removes current from queue, checks for next behavior, or routes to `/(tabs)` if queue empty

---

### Pre-Pregnancy Onboarding — Cycle Setup (`app/onboarding/cycle/index.tsx`)

**Purpose:** Detailed cycle tracking setup. 5–8 steps depending on whether user is actively TTC (trying to conceive).

#### Step 1 — Last Period Date
**Question:** *"When did your last period start?"*  
**Input:** DatePickerField  
**Logic:** Seeds cycle start date for predictions

#### Step 2 — Cycle Length
**Question:** *"How long is your average cycle?"*  
**Input:** Number input (days), default 28  
**Helper text:** "Day 1 is the first day of your period"

#### Step 3 — Period Duration
**Question:** *"How long does your period usually last?"*  
**Input:** Number input (days), default 5

#### Step 4 — Conditions & Symptoms
**Question:** *"Do you experience any of these?"*  
**Input:** Multi-select chips:
- PMS / Mood swings
- Cramps
- Bloating
- Irregular cycles
- PCOS
- Endometriosis
- Thyroid issues
- None of the above

#### Step 5 — Temperature Unit
**Question:** *"What temperature unit do you prefer?"*  
**Input:** Toggle — °C / °F  
**Context:** For basal body temperature tracking

#### Steps 6–8 — TTC Extensions (shown only if applicable)
**Step 6 — How Long Trying:**  
**Question:** *"How long have you been trying to conceive?"*  
**Input:** Single-select: Less than 3 months / 3–6 months / 6–12 months / Over 1 year

**Step 7 — Temperature Tracking:**  
**Question:** *"Are you tracking your basal body temperature?"*  
**Input:** Toggle Yes/No + thermometer type selector if Yes

**Step 8 — Supplements:**  
**Question:** *"Are you taking any of these supplements?"*  
**Input:** Multi-select: Folic Acid / Iron / Prenatal vitamins / Vitamin D / CoQ10 / None

#### Final Step — Completion
- Celebratory animation
- Summary of cycle predictions
- Route to `/(tabs)` or next onboarding in queue

**Data saved:** To Supabase `cycle_logs` with JSON metadata (cycle length, period duration, conditions, temp unit, TTC settings)

---

### Pregnancy Onboarding (`app/onboarding/pregnancy/index.tsx`)

**Purpose:** Comprehensive pregnancy profile setup. 7–8 steps covering health, preferences, and support network.

#### Step 1 — Due Date Confirmation
**Question:** *"When is your baby due?"*  
**Input:** DatePickerField  
**Live preview:** *"Week X of 40"*  
**Note:** Duplicates the due-date screen only if user skipped it earlier

#### Step 2 — First Pregnancy
**Question:** *"Is this your first pregnancy?"*  
**Input:** Single-select: Yes, first time / No, I've been here before  
**Logic:** Unlocks extra tips for first-timers in content

#### Step 3 — Current Mood
**Question:** *"How are you feeling right now?"*  
**Input:** 6-emoji selector grid:
- 😊 Great!
- 😐 Okay
- 😔 Tired
- 😰 Anxious
- 🤒 Not well
- 🌀 Mixed feelings

#### Step 4 — Birth Location Preference
**Question:** *"Where are you planning to give birth?"*  
**Input:** Single-select cards:
- 🏥 Hospital
- 🏡 Birth center
- 🏠 Home birth
- 🤷 Undecided

#### Step 5 — Care Provider Type
**Question:** *"Who is your main care provider?"*  
**Input:** Single-select:
- OB-GYN
- Midwife
- Family doctor
- Haven't chosen yet

#### Step 6 — Health Conditions & Allergies
**Question:** *"Any health conditions or allergies Grandma should know about?"*  
**Input:** Text area with placeholder examples (gestational diabetes, hypertension, latex allergy…)

#### Step 7 — Partner Support
**Question:** *"Is someone supporting you through this journey?"*  
**Input:**
- Toggle: Yes / No / Prefer not to say
- If Yes: Partner name text input + optional phone number
**Logic:** Partner info is pre-filled into care circle invite

#### Final Step — Completion
- Warm celebratory screen with week milestone
- "Your pregnancy journey begins" message
- Route to `/(tabs)` or next onboarding in queue

**Data saved:** To Supabase `behaviors`, `pregnancy_logs`, `profiles`

---

### Kids Onboarding (`app/onboarding/kids/index.tsx`)

**Purpose:** Multi-child setup with rich per-child health profiles and optional caregiver details.

#### Step 1 — How Many Children
**Question:** *"How many little ones are you caring for?"*  
**Input:** Large increment/decrement buttons with a big number display (1–10)

#### Steps 2–7 (repeated per child) — Per-Child Profile
For each child the user specified, show a labeled sub-flow: *"Child 1 of 3"*

**Sub-step A — Name**  
**Question:** *"What's their name?"*  
**Input:** Text field

**Sub-step B — Date of Birth**  
**Question:** *"When were they born?"*  
**Input:** DatePickerField  
**Live display:** Auto-calculates age: *"3 months old"*

**Sub-step C — Country**  
**Question:** *"Where are you based?"*  
**Input:** Country picker/selector  
**Logic:** Used for vaccine schedule localization

**Sub-step D — Photo** *(optional)*  
**Question:** *"Got a photo?"*  
**Input:** Camera or gallery picker (expo-image-picker)  
**Logic:** Compresses to <1MB via expo-image-manipulator, uploads to Supabase Storage  
**Skip option visible**

**Sub-step E — Allergies**  
**Question:** *"Any known allergies?"*  
**Input:** Multi-select chips from common list + free-text add  
Common options: Milk / Eggs / Peanuts / Tree nuts / Wheat / Soy / Fish / Shellfish / None

**Sub-step F — Conditions**  
**Question:** *"Any medical conditions or special needs?"*  
**Input:** Text area (optional)

#### Step (after all children) — Partner Details
**Question:** *"Tell me about your support partner"*  
**Input:**
- Partner name (text)
- Relationship (select: Partner / Co-parent / Grandparent / Other)
- Optional: Phone number

#### Final Step — Caregiver Contacts
**Question:** *"Any other caregivers? (nanny, family, etc.)"*  
**Input:**
- Optional toggle
- If yes: opens caregiver name + email fields
**Logic:** Creates pending invite automatically

#### Completion Screen
- Summary of all children added
- "Welcome to Grandma's circle" message
- Route to `/(tabs)`

**Data saved:** Inserts all children to `children` table · creates `child_caregivers` records for each · optional photo upload to storage

---

## HOME SCREEN (`app/(tabs)/index.tsx`)

The home screen is a single file that renders entirely different content based on `useModeStore.mode`.

**Shared elements (all modes):**
- `NotificationBell` component fixed top-right with unread badge count
- Safe area insets applied at top and bottom

**Empty state (no mode selected):**
- Sparkles icon in primaryTint circle
- Heading: *"Your journey starts here, dear"*
- Subtext: *"Choose your path — whether you are trying to conceive, expecting, or raising little ones. Grandma is here for it all."*
- CTA button: *"Choose Your Journey"* → `/onboarding/journey`

---

### Home — Pre-Pregnancy Mode
Renders `<CycleHome />` component.

**Content blocks (top to bottom):**

1. **Mode Header** — Pink `#FF8AD8` accent, "Cycle Tracking" label, current cycle day badge
2. **Cycle Phase Ring** — Circular visualization showing current day in cycle, phase name (Menstrual / Follicular / Ovulatory / Luteal), fertile window highlighted, ovulation day marker
3. **Hormone Chart** — Line chart of estrogen + progesterone curves across full cycle, today highlighted with vertical line
4. **Fertile Window Strip** — Week strip showing fertile days highlighted in green `#A2FF86`, ovulation peak marked
5. **Daily Health Insights** — 2–3 personalized insight cards generated by AI based on cycle phase
6. **Grandma Wisdom Card** — Glass card with a daily Grandma quote/tip relevant to cycle phase
7. **Pillar Grid** — 6 fertility pillar cards:
   - Nutrition (#A2FF86 green)
   - Hormones (#FF8AD8 pink)
   - Mental Health (#B983FF purple)
   - Fitness (#4D96FF blue)
   - Sleep (#FBBF24 amber)
   - Supplements (#FF6B35 orange)

---

### Home — Pregnancy Mode
Renders `<PregnancyHome topInset={insets.top} />` — full-width special layout (no standard scroll container, uses its own structure for the hero carousel).

**Content blocks (top to bottom):**

1. **Hero Carousel** — Full-width swipeable cards:
   - Current week display: *"Week 24"* in large Cabinet Grotesk
   - Baby development milestone summary
   - Navigation dots below
2. **Baby Size Card** — Illustration + size comparison: *"Your baby is the size of a corn"* with weight/length stats
3. **Daily Development Insight** — AI-generated paragraph about what's happening with baby and body this week
4. **Vitals Carousel** — Horizontally scrollable metric cards:
   - Weight (with trend arrow)
   - Mood (emoji + label)
   - Last symptom logged
5. **Affirmation Reveal Card** — Tappable card: *"Tap to reveal today's affirmation"* → flips to show Grandma affirmation
6. **Reminders Section** — Upcoming appointments, vitamin reminders, kick count reminder
7. **Pillar Grid** — 9 pregnancy pillar cards:
   - Nutrition · Mental Health · Birth Prep · Fitness · Sleep · Partner · Medical · Layette · Breastfeeding

---

### Home — Kids Mode
Renders `<KidsHome />` component.

**Content blocks (top to bottom):**

1. **Child Selector** — Horizontal pill selector at top if multiple children added; shows child photo + first name
2. **Daily Pulse** — Summary card: today's feeding count, sleep hours, diaper changes, mood score — all in one glanceable tile
3. **Sleep Circle** — Circular progress ring showing last sleep duration vs average; color-coded (green = on track, amber = below average)
4. **Mood Analysis** — Today's mood summary from AI: *"Emma seemed calm this morning, slightly fussy after lunch"*
5. **Calories Card** — Feeding/calorie summary for breastfed or formula-fed babies (ml or kcal)
6. **Growth Leaps Card** — Current Wonder Weeks leap or developmental stage; progress bar showing leap progress
7. **Location Card** *(if AirTag linked)* — Last seen location of child's AirTag + timestamp
8. **Moments of Care** — Photo strip of recent memories/moments logged by caregivers
9. **Milk Tracker** — Quick-log card for breastfeeding sessions (left/right side, duration)
10. **Nanny Updates Feed** — Chronological activity feed from all caregivers (feeding, sleep, diaper, notes) with caregiver avatar badge
11. **Pillar Grid** — 9 kids pillar cards:
    - Feeding · Sleep · Development · Health · Safety · Play · Routines · Care Circle · Memories

---

## AGENDA SCREEN (`app/(tabs)/agenda.tsx`)

The agenda is a mode-aware planner and activity logger. Each mode renders a completely different component via a switch on `useModeStore.mode`.

---

### Agenda — Pre-Pregnancy Mode
Renders `<CycleCalendar />`

**Tabs within:** Cycle Tracker / Checklist / Appointments

**Cycle Tracker tab:**
- Monthly calendar grid at top with colored dots on logged days (period = pink, ovulation = green, fertile = lighter green)
- Below calendar: day-view log list for selected date
- Log types that appear:
  - Period start / end (flow level: light/medium/heavy)
  - Ovulation test result (positive/negative/peak)
  - Intercourse logged
  - Basal body temperature reading
  - Symptoms (PMS, cramps, bloating, breast tenderness, etc.) each with severity
  - Mood entry
  - Cervical mucus observation
- "+" FAB (floating action button) → opens `LogSheet` modal with type selector

**LogSheet — Cycle:**
- Type selector at top (tabs: Period · BBT · Ovulation · Symptoms · Mood · Intercourse)
- Each type shows relevant inputs:
  - Period: flow selector (1–5 drops), start/end toggle
  - BBT: number input in °C or °F
  - Ovulation: LH test result picker
  - Symptoms: multi-select chip grid with severity slider
  - Mood: emoji grid (6 options)
- Date/time selector (defaults to now)
- "Save" button

**Checklist tab:**
- Pre-built fertility checklist organized by category:
  - Before your cycle: folic acid, prenatal vitamins
  - Fertile window: track BBT, watch for cervical mucus signs
  - Ovulation: LH test, intercourse timing
  - Luteal phase: progesterone support, stress management
- Each item tappable to mark done (green checkmark)
- Progress bar at top: *"8 of 14 complete"*

**Appointments tab:**
- Upcoming appointments list (from `child_logs` type='appointment' or manual entries)
- Each card: date, time, doctor name, appointment type, location
- "Add appointment" button → form modal

---

### Agenda — Pregnancy Mode
Renders `<PregnancyCalendar />`

**Tabs within:** Timeline / Symptoms / Kicks

**Timeline tab:**
- Week-based timeline view (weeks 1–40 as vertical scroll)
- Current week highlighted with purple border + "This week" badge
- Each week card shows:
  - Week number
  - Baby development milestone (1-liner)
  - Logged events for that week (appointments, symptoms, weight)
- Tap week → expands to full week detail

**Symptoms tab:**
- Date selector at top
- Symptom chip grid (40+ pregnancy symptoms):
  - Nausea · Vomiting · Fatigue · Heartburn · Back pain · Swelling · Headache · Constipation · Mood swings · Round ligament pain · Shortness of breath · Insomnia · Braxton Hicks · etc.
- Each chip: tap to log, shows severity slider (1–5) after tap
- Previously logged symptoms shown highlighted
- Weight entry field at bottom of this tab

**Kicks tab:**
- Large illustrated counter display
- "Tap when baby kicks" — full-area tappable surface (or large button)
- Live count display with timestamp of last kick
- Session timer (start/stop)
- Goal indicator: "10 kicks in 2 hours" — fills progress bar
- History list of recent sessions below

**Contraction Timer** (accessible from Kicks tab via button):
- "Contraction Started" / "Contraction Ended" toggle button
- Live timer during contraction
- After each: adds to session list showing duration + interval since last
- Summary: *"Average 45 seconds · Every 7 minutes"*
- Alert when pattern warrants calling provider (< 5 min apart, > 1 min long)

---

### Agenda — Kids Mode
Renders `<KidsCalendar />`

**Tabs within:** Timeline / Food / Notes

**Timeline tab:**
- Day view (default: today)
- Date strip at top to swipe between days
- Child pill selector if multiple children
- Chronological activity log for selected child + day:
  - Each entry shows: icon, type label, detail (e.g., *"Breastfed · Left side · 15 min"*), timestamp, logger avatar (you or caregiver name)
- Log types rendered with distinct icons:
  - 🍼 Feeding (breastfed / bottle / solids + amount/duration)
  - 😴 Sleep (start/end time, duration, quality)
  - 🚼 Diaper (wet / dirty / both + notes)
  - 😊 Mood (1–5 emoji scale + optional note)
  - 🌡️ Temperature (reading + unit)
  - 💊 Medicine (name, dose, time)
  - 💉 Vaccine (name, date, batch number)
  - 📏 Growth (weight, height, head circumference)
  - 📸 Memory (photo + caption)
  - 🎯 Milestone (description)
  - 📝 Note (free text)
- "+" FAB → `LogSheet` modal

**LogSheet — Kids:**
- Scrollable type selector row at top
- Dynamic form per type:
  - Feeding: toggle breast/bottle/solids → breast: L/R side, duration; bottle: ml amount, formula type; solids: food description, amount
  - Sleep: start/end time pickers, quality selector
  - Diaper: type chips, consistency notes
  - Medicine: name autocomplete from child's medications list, dose, unit
  - Temperature: number input, unit toggle
  - Milestone: text area, milestone category selector
- Child selector at top if multiple children
- Date/time defaulting to now, editable
- "Save log" button → inserts to `child_logs` in Supabase

**Food tab:**
- Photo-based food logging
- Camera button at top → opens camera or gallery
- AI analyzes photo → returns:
  - Food items detected
  - Estimated calories/nutrients
  - Age-appropriateness for child
  - Potential allergen flags (highlighted in amber/red)
- Manual entry fallback: text field + meal type selector
- Today's food log grid below (photos + labels)
- Daily nutrition summary bar

**Notes tab:**
- Nanny/caregiver notes panel
- Filter chips at top: All / You / [Caregiver names]
- Each note card: text content, author avatar + name, child name tag, timestamp
- Long-press to edit/delete own notes
- "Write a note" input at bottom (sticky) → posts immediately

---

## CARE CIRCLE FLOW

### Screen 1 — Care Circle Hub (`app/profile/care-circle.tsx`)

**Purpose:** Central management for all people in the child's care network.

**Layout:**
- Header: "Care Circle" title + "Add member" button (top-right, + icon)
- Two tabs: **Members** / **Activity**

**Members Tab:**

List of all invited caregivers grouped/sorted by status (Accepted first, Pending below).

Each member card shows:
- Avatar (photo if available, or User icon in tinted circle)
- Full name + email
- Role badge (Partner / Nanny / Family / Doctor / etc.) — color coded
- Status indicator:
  - ✓ green — Accepted
  - 🕐 amber — Pending
  - ⏸ muted — Paused
- Children they can access: small chips with baby icon + child first name
- Permission summary mini-badges:
  - 👁 View
  - 📝 Log activity
  - 💬 Chat (Grandma access)
  - ✏️ Edit child profile
  - 🚨 Emergency access
- Action buttons on card: Edit (pencil) · Pause/Activate (toggle) · Remove (trash)
- Pending cards show: "Resend Invite" button

Tapping "Add member" → opens **AddMemberSheet** (4-step bottom sheet, see below)

**Activity Tab:**

Chronological feed of all caregiver-logged activities for all children, last 30 days.

Filter row at top:
- Child filter: chips (All + each child name)
- Caregiver filter: chips (All + "You" + each caregiver name)

Each activity entry:
- Icon for log type
- Smart-formatted description: *"Breastfed Left side · 15 min · 2:30 PM"*
- Logger badge: small avatar + name (*"You"* or caregiver name)
- Child name tag
- Relative timestamp (*"2 hours ago"*)
- Grouped by date header (*"Today" / "Yesterday" / "Apr 14"*)

---

### AddMemberSheet — 4-Step Bottom Sheet

Opened from "Add member" button in Care Circle hub.

**Step 1 — Who are they?**
- Photo picker (optional — camera or gallery)
- Name text input (required)
- Role multi-select chips:
  - 👫 Partner
  - 👩‍🍼 Nanny
  - 👴 Family
  - 👩‍⚕️ Doctor
  - 🧑‍🤝‍🧑 Friend
  - Other
- "Next" button

**Step 2 — Which children can they see?**
- List of all children with toggle per child
- Subtext under each: *"They'll be able to see Emma's profile and logs"*
- "Select all" shortcut
- "Next" button

**Step 3 — What can they do?**
- Permission level selector (radio cards):
  - **View Only** — Can see logs and profile, no editing
  - **Contributor** — Can view, log activities, and chat with Grandma
  - **Full Contributor** — All above + edit child profile + emergency access
- Permission details expand on tap
- "Next" button

**Step 4 — Send Invite**
- Summary of who was invited + permissions
- Send method selector:
  - 📧 Email → opens `mailto:` with invite link pre-filled in body
  - 💬 SMS → opens SMS app with country code selector + phone field
  - 🔗 Share Link → native iOS/Android share sheet with invite link
- Logic:
  - Generates unique invite token
  - Creates pending `child_caregivers` record in Supabase with token + permissions JSONB
  - Invite link: `grandma-app://accept-invite?token=[token]`
- "Done" closes sheet

---

### EditMemberSheet

Opened from Edit button on a member card.

**Contents:**
- Photo re-upload (same picker as AddMemberSheet Step 1)
- Name edit field
- Role selector (same chips)
- Permission level selector (same radio cards as Step 3)
- "Save changes" CTA → updates `child_caregivers` record

---

### Screen 2 — Manage Caregivers (`app/manage-caregivers.tsx`)

**Purpose:** Lighter-weight caregiver list, accessed from child settings (profile → kids → child card → caregivers).

**Layout:**
- Header: *"Caregivers for [Child Name]"*
- "Invite a caregiver" button at top → `/invite-caregiver`
- FlatList of caregivers:
  - Email
  - Role badge
  - Status badge (Accepted / Pending)
  - "Revoke" button (shows confirmation alert before action)
- Empty state: *"No caregivers yet. Invite someone to join [Child Name]'s care circle."*

**Revoke logic:** Alert confirmation → updates status to 'revoked' in Supabase

---

### Screen 3 — Invite Caregiver (`app/invite-caregiver.tsx`)

**Purpose:** Streamlined single-step invite form.

**Layout:**
- Header: "Invite a caregiver"
- Role selector (same 6 roles)
- Child selector (which child to grant access to)
- Send method: Email / SMS / Share Link
- "Send invite" CTA

**Logic:** Same token generation and `child_caregivers` record creation as AddMemberSheet Step 4.

---

### Screen 4 — Accept Invite (`app/accept-invite.tsx`)

**Purpose:** Deep-link destination. Shown to a caregiver when they tap the invite link.

**URL:** `grandma-app://accept-invite?token=[invite_token]`

**Layout:**
- 👵 emoji header
- Heading: *"You've been invited!"*
- Subtext: *"[Inviter name] is adding you to [child name]'s care circle"*
- Permissions summary card:
  - 👁 View profile and activity logs
  - 📝 Log activities (if contributor or above)
  - 💬 Chat with Grandma (if contributor or above)
- "Accept invite" primary button
- "Decline" secondary text link

**Logic:**
- On "Accept": calls `supabase.functions.invoke('accept-invite', { body: { token } })`
- Edge function verifies token, links authenticated user to `child_caregivers` record, updates status to 'accepted'
- Success state overlay:
  - ✅ icon
  - *"You're in! You now have access to [childName]'s profile."*
  - "Go to Home" button → `/(tabs)`
- Error state: *"This invite has expired or already been used."*

---

## LIBRARY SCREEN (`app/(tabs)/library.tsx`)

**Purpose:** Educational pillar content organized by mode.

**Layout:**
- Mode-aware heading (*"Fertility Library"* / *"Pregnancy Library"* / *"Parenting Library"*)
- Search bar at top
- Pillar grid (2-column grid of PillarCards)
- Each pillar card:
  - Neon accent color background on icon
  - Pillar icon
  - Title
  - Short description
  - Arrow indicator

Tapping a pillar → `/pillar/[id]`

**Pillar Detail Screen (`app/pillar/[id].tsx`):**
- Full-width header: pillar color gradient, icon, title
- Scrollable article content:
  - Intro paragraph
  - 3–5 tip cards (GlassCard with neon accent)
  - Action items (checklist format)
  - "Ask Grandma" shortcut button (opens Grandma Talk chat pre-seeded with pillar context)
- Back button to Library

---

## VAULT SCREEN (`app/(tabs)/vault.tsx`)

Hidden in Pre-Pregnancy mode. Visible in Pregnancy and Kids modes.

**Purpose:** Secure medical document hub.

**Layout:**
- Mode-aware sections:

**Pregnancy:**
- Ultrasound photos (gallery grid with upload button)
- Test results (document list with date + type)
- Birth plan (structured form export as PDF)
- Emergency card

**Kids:**
- Emergency card (blood type, allergies, emergency contacts, pediatrician)
- Vaccine records (chronological list with next-due reminders)
- Medical documents (scan + upload)
- Hospital documents

**Document Upload screen:**
- Camera or gallery picker
- Document type selector (dropdown)
- Date picker
- Notes field
- Upload to Supabase Storage (signed URLs for private access)

**Emergency Card:**
- Blood type selector
- Known allergies (multi-select + free text)
- Emergency contact 1 + 2 (name, phone, relationship)
- Pediatrician name + phone
- Insurance info
- Download/share as PDF option

**Vaccine Record:**
- Chronological vaccine list
- Each entry: vaccine name, date given, brand/batch number, next due date
- Color-coded by status: ✅ Done / 🕐 Due Soon / ❗ Overdue
- Add vaccine button → form modal

---

## EXCHANGE / GARAGE SCREEN (`app/(tabs)/exchange.tsx`)

**Purpose:** Peer-to-peer marketplace for baby gear (no payment processing).

**Layout:**
- Category filter strip (All / Clothes / Furniture / Toys / Gear / Books)
- Listing grid (2 columns):
  - Photo
  - Title + condition badge
  - Type badge: SELL / TRADE / DONATE
  - Price (or "Free" for donate)
  - Distance (if location shared)
- "List an item" FAB

**Listing Detail (`app/garage/[id].tsx`):**
- Photo carousel (swipeable)
- Title, condition, type, price
- Description
- Seller avatar + name + rating
- "Contact seller" button → in-app message or WhatsApp handoff
- "Save" heart icon

**Create Listing (`app/garage/create.tsx`):**
- Photo picker (up to 5 photos)
- Title field
- Category selector
- Condition selector (New / Like New / Good / Fair)
- Listing type (Sell / Trade / Donate)
- Price field (hidden for Donate)
- Description textarea
- Location (auto-filled or manual)
- "List it" CTA

---

## GRANDMA TALK (`app/grandma-talk.tsx`)

**Purpose:** Full-screen AI chat with Guru Grandma.

**Layout:**
- Sticky header: "Grandma" title + mode color accent
- MessageBubble list (scroll from bottom):
  - User messages: right-aligned, primary color bubble
  - Grandma messages: left-aligned, surface glass bubble + small avatar
- Typing indicator: animated 3-dot ellipsis when Grandma is responding
- Suggested prompts strip at bottom (scrollable chips, mode-specific suggestions):
  - Pre-Preg: *"When am I most fertile?"* · *"How can I improve egg quality?"* · *"What supplements should I take?"*
  - Pregnancy: *"Is this normal at week 24?"* · *"What's baby doing this week?"* · *"Help me with birth prep"*
  - Kids: *"My baby won't sleep — help!"* · *"When do I introduce solids?"* · *"Is this rash normal?"*
- Text input at bottom (sticky, keyboard-avoiding)
- Send button (disabled when empty)

**Logic:**
- Calls `supabase.functions.invoke('nana-chat', { body: { messages, mode, childContext, userContext } })`
- Streams response via Supabase Edge Function which calls Claude Sonnet
- Context injected: user name, mode, child name/age, recent logs, current cycle week / pregnancy week / child's leap
- Persona: warm, wise grandmother — never clinical, never cold

---

## SETTINGS / PROFILE SCREEN (`app/(tabs)/settings.tsx`)

**Purpose:** App entry point for all personal and app settings.

**Layout:**
- Header: user avatar (photo or User icon in primaryTint circle), user name, user email
- 5-tap easter egg on behavior badges in header → Dev Panel (debug/dev tools)
- Four grouped sections:

**Personal:**
- My Profile → `/profile/personal` (name, location, language, health notes, allergies)
- Pregnancy Profile / Cycle Profile / Kids Profile (mode-specific) → mode-specific profile route

**Care & Family:**
- Care Circle → `/profile/care-circle`
- Emergency & Insurance → `/profile/emergency-insurance`
- Badge Wallet → `/profile/badges`
- Memories → `/profile/memories` (Kids mode only)
- Health History → `/profile/health-history` (Kids mode only)

**App Settings:**
- Notifications → `/profile/notifications`
- Units & Display → `/profile/settings` (kg/lbs, cm/in, °C/°F, language)

**Account:**
- Subscription → `/paywall`
- Account Security → `/profile/account` (change password, linked accounts, delete account)
- Data Privacy → `/profile/privacy`

**Bottom:** Sign Out button → confirmation alert → `supabase.auth.signOut()` → `/welcome`

---

### Personal Info (`app/profile/personal.tsx`)

**Inputs:**
- Name (text)
- Location (real-time autocomplete via OpenStreetMap Nominatim API)
- Language (dropdown, 30+ languages)
- Health notes (textarea — placeholder: chronic conditions, medications, relevant background)
- Allergies (autocomplete chips — 20+ common allergies pre-loaded)

Saves to Supabase `profiles` table.

---

### Pregnancy Profile (`app/profile/pregnancy.tsx`)

Ten sections organized vertically:

1. **Hero** — Avatar + name + week number + trimester + days remaining
2. **Pregnancy Info Grid** — Due date · Current week · Pre-pregnancy weight · Current weight · Height · Blood type (all tappable to edit inline)
3. **Birth Preferences** — Birth location · Pain management approach · Desired atmosphere · Cord cutting preference · Feeding plan · Breastfeeding goal · Duration goal · Supplies checklist
4. **Birth Team** — Link to Care Circle
5. **Health Flags** — Conditions, allergies (editable textarea)
6. **Baby Info** — Baby name · Sex · Last ultrasound week · Baby position (Cephalic/Breech/Transverse/Unknown)
7. **Emergency Contacts** — Link to Emergency Card
8. **Postpartum Prep Checklist** — 6 items: meal prep · support person arranged · postpartum supplies · PPD education · 6-week checkup booked · vitamins
9. **Breastfeeding Plan** — Feeding intention selector · Supplies checklist
10. **Nesting Checklist** — Nursery · crib/bassinet · car seat · monitor · outlet covers · laundry done

---

### Kids Profile (`app/profile/kids.tsx`)

- Per-child card list
- Each card shows photo, name, auto-calculated age
- Tap Edit → modal with full form:
  - Name · Sex · Blood type · Birth date
  - Allergies (multi-select from COMMON_CHILD_ALLERGIES)
  - Medications (multi-select)
  - Dietary restrictions · Preferred/disliked foods
  - Conditions (textarea) · Pediatrician name · Notes
  - Delete child button (shows confirmation alert, revokes all caregivers)
- "Add another child" button at bottom → new child form

---

## INSIGHTS SCREEN (`app/insights.tsx`)

**Purpose:** AI-generated analytics and educational content. Three tabs.

**Tabs:**

**Today** — AI-generated daily briefing:
- Pre-Preg: cycle phase summary, fertile window status, hormone insights
- Pregnancy: week summary, baby development update, tip of the day
- Kids: yesterday's sleep/feeding summary, today's recommended activities

**Birth Guide** (Pregnancy only) — Week-by-week birth preparation content:
- What to pack
- What to expect at this stage
- Partner checklist

**Reads** — Curated article cards per pillar:
- Card shows: pillar color, title, read time, summary
- Tap → full article view

---

## PAYWALL SCREEN (`app/paywall.tsx`)

**Purpose:** Premium subscription upsell.

**Layout:**
- 👵 emoji at top
- Heading: *"Unlock Grandma Premium"*
- Subtext: *"7-day free trial · cancel anytime"*
- Feature list (4 items with checkmark icons):
  - Unlimited medicine & food scans
  - Unlimited Grandma conversations
  - Vaccine reminders
  - Priority responses
- Two pricing cards (radio select):
  - Monthly: $9.99/month
  - Annual: $69.99/year — "BEST VALUE" badge, shows equivalent monthly price
- "Start free trial" primary CTA
- "Restore Purchases" text link below

**Logic:**
- Uses RevenueCat (`lib/revenue.ts`) for in-app purchase
- On successful purchase: updates Supabase `profiles.subscription_status = 'premium'`
- Dismiss via back button

---

## SCAN SCREEN (`app/scan.tsx`)

**Purpose:** Camera-based AI analysis for food, products, medications, and documents.

**Layout:**
- Full-screen camera view
- Mode selector strip at top (4 types):
  - 🍎 Food Label — nutritional analysis, allergen detection
  - 🧴 Product Safety — ingredient safety for baby/pregnancy
  - 💊 Medication — drug interactions, pregnancy/breastfeeding safety
  - 📄 Document — OCR capture for vault upload
- Capture button at bottom
- Flash toggle + gallery picker icons

**Result Screen:**
- Photo thumbnail
- AI analysis in structured card:
  - Summary paragraph
  - Key findings (color-coded: green safe / amber caution / red warning)
  - Grandma recommendation at bottom
- "Save to Vault" button (for documents)
- "Ask Grandma about this" button → opens Grandma Talk pre-seeded with scan context

**Logic:**
- Image compressed to <1MB via expo-image-manipulator
- Uploaded to `scan-images` bucket in Supabase Storage
- Calls `supabase.functions.invoke('scan-image', { body: { imageUrl, scanType, childContext } })`
- Edge function calls Claude Vision with context
- Premium feature: free users get 3 scans total

---

## SPECIAL SCREENS

### Daily Rewards (`app/daily-rewards.tsx`)
- Streak counter (current streak + longest streak)
- Daily check-in button (disabled if already checked in today)
- Badge unlock animation on milestone streaks (7 / 30 / 90 / 365 days)
- Points earned today
- Challenges list (log 3 activities, chat with Grandma, read a pillar)

### Leaderboard (`app/leaderboard.tsx`)
- User's own rank card at top (highlighted)
- Ranked list of community members with points
- Tabs: Weekly / All Time
- Points earned from: logging, chatting, reading, streaks, community contributions

### Notifications Center (`app/notifications.tsx`)
- Chronological list of all past notifications
- Grouped by date
- Each notification: icon, title, body, timestamp
- Tap → navigates to relevant screen
- "Mark all as read" button

### Child Picker (`app/child-picker.tsx`)
- Full-screen modal/sheet
- Grid of child cards (photo + name + age)
- Tap to set as active child in `useChildStore`
- "Add a child" option at bottom

### AirTag Setup (`app/airtag-setup.tsx`)
- Step-by-step guide (4 steps with illustrations):
  1. Buy an AirTag from Apple
  2. Attach it to child's backpack/item
  3. Name it after your child in Find My
  4. Share access with grandma.app
- Link to Apple's Find My documentation
- "Done" closes screen

### Connections (`app/connections.tsx`)
- Two sub-tabs: Garage / Channels
- Header with notification bell (unread badge)
- Garage tab: shared memories + marketplace access
- Channels tab: community forum list

---

## COMMUNITY SCREENS

### Channels Index (`app/channel/index.tsx`)
- List of topic channels (e.g., "First Trimester", "Breastfeeding", "Toddler Sleep")
- Each channel card: name, description, member count, last activity
- Mode-filtered (shows relevant channels for active mode)
- "Create channel" button at top-right

### Channel Detail (`app/channel/[id].tsx`)
- Thread list within a channel
- Each thread: title, preview, author, reply count, last activity time
- Reply → `/channel/thread/[id]`

### Thread (`app/channel/thread/[id].tsx`)
- Full conversation thread
- Message bubbles: author avatar, name, content, timestamp
- Reply input at bottom
- Like/upvote on messages

### Create Channel (`app/channel/create.tsx`)
- Name field
- Description textarea
- Category selector
- "Create" CTA

---

## CORE NAVIGATION STRUCTURE

```
Bottom Tab Bar (always visible after auth + onboarding):
  Home · Agenda · Library · Exchange · Settings

Stack screens (push on top of tabs):
  /pillar/[id]           Pillar detail
  /grandma-talk          AI chat
  /scan                  Camera scanner
  /insights              Analytics
  /leaderboard           Community rankings
  /daily-rewards         Streaks + badges
  /notifications         Notification center
  /paywall               Premium upgrade
  /profile/personal      Personal info
  /profile/care-circle   Caregiver management
  /profile/kids          Children management
  /profile/pregnancy     Pregnancy profile
  /profile/account       Account security
  /profile/badges        Badge wallet
  /profile/memories      Photo memories
  /profile/health-history Medical history
  /profile/notifications Notification preferences
  /profile/settings      Units & display
  /profile/privacy       Data privacy
  /profile/emergency-insurance Emergency card
  /garage/[id]           Listing detail
  /garage/create         Create listing
  /garage/profile        My listings
  /channel/index         Channels list
  /channel/[id]          Channel threads
  /channel/thread/[id]   Full thread
  /channel/create        Create channel
  /connections           Community hub
  /invite-caregiver      Send invite
  /manage-caregivers     Manage per-child
  /accept-invite         Deep-link destination
  /child-picker          Child selector modal
  /airtag-setup          AirTag guide
  /birth-plan            Birth plan builder

Auth flow (replaces tabs when unauthenticated):
  /(auth)/welcome
  /(auth)/sign-up
  /(auth)/sign-in

Onboarding flow (replaces tabs after first sign-in):
  /onboarding/journey
  /onboarding/parent-name
  /onboarding/due-date         (pregnancy only)
  /onboarding/baby-name
  /onboarding/activities
  /onboarding/child-profile
  /onboarding/transition
  /onboarding/cycle            (pre-pregnancy specific — multi-step)
  /onboarding/pregnancy        (pregnancy specific — multi-step)
  /onboarding/kids             (kids specific — multi-step)
```

---

## DATA ARCHITECTURE

**Auth state guard:** Root `_layout.tsx` checks `supabase.auth.getUser()` on mount. Routes to `/(auth)/welcome` if unauthenticated. After sign-in, checks if onboarding is complete; if not, routes to `/onboarding/journey`.

**Users** have one active mode at a time (`useModeStore.mode`), but can be enrolled in multiple behaviors simultaneously (`useBehaviorStore.enrolledBehaviors`). Switching mode from profile updates both.

**Children** — multiple children supported. `useChildStore.activeChild` tracks which child context is active. Child selector pill appears on relevant screens.

**Care Circle** — up to 10 caregivers per child. Role-based permission system stored as JSONB. Invite via token-based deep link. Caregivers see child data scoped to their permissions.

**AI (Guru Grandma)** — called exclusively via Supabase Edge Function `nana-chat`. Context includes: user name, active mode, current week (pregnancy) or cycle day (pre-preg) or child age (kids), recent logs, enrolled activities. Persona: warm, wise grandmother — never clinical.

**Community** — anonymous channels. Points awarded for logging, chatting, reading, contributing. Badges awarded at milestone thresholds.

**Marketplace** — peer-to-peer. No payment processing in-app. Contact via in-app message or share handoff.

**Subscriptions:**
- Free: chat, browse pillars, 3 scans
- Premium ($9.99/mo or $69.99/yr): unlimited scans + chat, insights, vaccine reminders

---

## ZUSTAND STORES

| Store | Purpose |
|-------|---------|
| `useModeStore` | Active journey mode — persisted |
| `useBehaviorStore` | Enrolled behaviors, toggle, enroll, switch |
| `useChildStore` | Children array + active child + caregiver role/permissions |
| `useChatStore` | AI chat message history |
| `useJourneyStore` | Onboarding data (parentName, dueDate, babyName, activities) |
| `useOnboardingStore` | Onboarding queue, current step, build/skip |
| `useCycleOnboardingStore` | Cycle setup preferences |
| `usePregnancyOnboardingStore` | Pregnancy setup details |
| `useKidsOnboardingStore` | Kids setup — dynamic child count + per-child data |
| `usePregnancyStore` | Live pregnancy data from Supabase |
| `useFoodStore` | Food log entries |
| `useVaultStore` | Documents + emergency card |
| `useExchangeStore` | Marketplace listings |
| `useChannelsStore` | Community channels + threads |
| `useBadgeStore` | Achievement badges |
| `useGoalsStore` | User goals |
| `useNotificationsStore` | Notification state |

---

## SUPABASE EDGE FUNCTIONS

| Function | JWT Required | Purpose |
|----------|-------------|---------|
| `nana-chat` | no-verify | Guru Grandma AI — 3-mode context + 24 pillar prompts |
| `scan-image` | no-verify | Claude Vision — 4 scan types with child context |
| `generate-insights` | no-verify | Analytics generation per mode |
| `invite-caregiver` | required | Token-based caregiver invite generation |
| `accept-invite` | required | Token verification + user linking to child |
| `revenuecat-webhook` | no-verify | Subscription status sync |

---

## BRAND ESSENCE

The app is called Grandma. It should feel **warm, wise, trustworthy, and a little magical.** Not clinical. Not tech-bro. Not sterile.

Think: the warm glow of a phone screen at 3am while breastfeeding. The calm of tracking your cycle with a cup of tea. A grandmother who has seen it all, worries for you in the best way, and always knows what to say.

**Mode colors are load-bearing.** Pink for Pre-Pregnancy, Purple for Pregnancy, Blue for Kids. The entire emotional register of the app shifts with mode.
