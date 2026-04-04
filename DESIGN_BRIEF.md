# grandma.app — Design Brief for Screen Generation

> Feed this document to a design tool to generate a complete, cohesive design system for grandma.app — a cosmic-themed parenting app covering pre-pregnancy, pregnancy, and kids.

---

## Brand

**App name:** grandma.app
**Personality:** A warm, wise grandmother who guides women through every phase — trying to conceive, expecting, and raising kids. She never judges. She speaks with love. She calls you "dear."
**AI character:** Guru Grandma — conversational AI advisor. Not a doctor.
**Aesthetic:** Cosmic, mystical, premium. Dark space background with neon accents. Stars, moon phases, aurora glows. Think Stardust period tracker meets premium parenting app.
**Platform:** iOS (iPhone), React Native / Expo

---

## Visual Direction

**Background:** Deep cosmic purple `#1A1030` with subtle scattered white star particles
**Card style:** Frosted glass — `rgba(255,255,255,0.05)` bg, `rgba(255,255,255,0.10)` border, large rounded corners (32-48px), optional backdrop blur
**Primary action:** Neon yellow `#F4FD50` pill buttons with glow shadow
**Accent colors:** Pink `#FF8AD8`, Green `#A2FF86`, Purple `#B983FF`, Orange `#FF6B35`, Blue `#4D96FF`
**Typography:** Bold condensed headings (Black weight, uppercase, tight tracking), light body text (white at 50-80% opacity)
**Corners:** Very rounded — 32px for cards, 48px for profile cards, 999px (full pill) for buttons/inputs
**Inputs:** 72px tall pill shape, glass background, 1px border
**Icons:** Outline style (Lucide/Ionicons), 20-24px
**Tab bar:** Fixed bottom, 5 items, `#1A1030` bg, yellow active tint, 10px uppercase labels

---

## The 3 Modes

The app has 3 completely different experiences based on the user's life stage. Each mode changes the home screen, planner/agenda tabs, library pillars, vault visibility, and profile card.

### MODE 1: Pre-Pregnancy (Trying to Conceive)
**Audience:** Women preparing to get pregnant
**Accent:** Pink `#FF8AD8`
**Profile badge:** "TRYING TO CONCEIVE"
**Key features:** Cycle tracking (28-day ring), fertile window predictions, pre-conception checklist, hydration/health tracking, fertility education
**Visible tabs:** Home, Planner, Library, Garage, Settings (Vault hidden)

### MODE 2: Pregnancy (Expecting)
**Audience:** Pregnant women
**Accent:** Purple `#B983FF`
**Profile badge:** "WEEK {X}"
**Key features:** Week-by-week baby development, symptom logging, kick counter (28+ weeks), contraction timer (36+ weeks), birth planning, ultrasound vault
**Visible tabs:** Home, Calendar, Library, Documents, Garage, Settings

### MODE 3: Kids (Baby Born)
**Audience:** Parents with babies/children
**Accent:** Blue `#4D96FF`
**Profile badge:** Age display ("8M OLD")
**Key features:** Activity logging (feeding, sleep, diaper), food photo tracking with AI, nanny notes, vaccine records, milestone tracking, emergency card
**Visible tabs:** Home, Agenda, Library, Vault, Garage, Settings

---

## Screens to Design

### AUTH FLOW (3 screens, all modes)

**Screen 1: Welcome / Splash**
- Full cosmic background with scattered star particles
- Center: Cosmic ring logo — 28 small colored circles arranged in a ring (pink, yellow, green, purple representing cycle phases), moon icon in center
- Below ring: "grandma.app" brand name
- Large title: "Welcome, Dear One." (serif or bold grotesk, 44px)
- Subtitle: "Let Grandma guide you through every step of your journey..." (16px, 60% opacity)
- CTA: Pink-to-purple gradient pill button "Begin Your Journey" with glow
- Link: "Already a member? Sign in"
- Footer: Terms & Privacy links (tiny, 30% opacity)

**Screen 2: Sign Up**
- Title: "Begin Your Journey." (36px bold)
- Subtitle: "Create your account and meet Grandma"
- Social auth row: Apple (black pill) + Google (white pill) side by side
- Divider: "— or sign up with email —"
- Email input: 72px glass pill
- Password input: 72px glass pill
- Yellow CTA: "Create Account" with neon glow
- Link: "Already have an account? Sign in"
- Terms footer

**Screen 3: Sign In**
- Title: "Welcome back, Dear."
- Subtitle: "Sign in to continue your journey"
- Same layout as sign up but with "Sign In" CTA
- Link: "New here? Create account"

---

### ONBOARDING FLOW (5 screens)

**Screen 4: Journey Selection**
- Title: "Are you expecting or is your little one already here?" (centered, 28px)
- 3 large glass cards stacked vertically:
  - Card 1: Pink icon circle + "I want to be pregnant" + subtitle + chevron right
  - Card 2: Purple icon circle + "I'm pregnant" + subtitle + chevron
  - Card 3: Blue icon circle + "I have kids" + subtitle + chevron
- Footer: "The Basics — We'll collect a few details next."

**Screen 5: Parent Name**
- Back arrow (glass circle)
- Title: "How shall I call you, dear?" (34px)
- Subtitle: "Grandma likes to know who she's talking to"
- Label: "PARENT'S NAME" (tiny uppercase, wide tracking)
- Glass pill input (72px)
- Yellow "Continue" CTA at bottom with glow
- "Skip for now" link

**Screen 6: Activity Selection**
- Back arrow
- Title: "What would you like to track?" (32px)
- Subtitle: "Pick the ones that matter most"
- Scrollable list of activity cards (mode-specific):
  - Each card: Glass bg, rounded-20, emoji in circle + label + subtitle + green checkbox
  - Pre-preg activities: Fertility, Nutrition, Appointments, Mood, Fitness, Learning
  - Pregnancy activities: Symptoms, Appointments, Mood, Weight, Nutrition, Supplements
  - Kids activities: Feeding, Sleep, Diaper, Mood, Growth, Medicine, Vaccines, Milestones
- Bottom: "X selected" counter + yellow "Let's go" CTA

**Screen 7: Due Date (pregnancy only)**
- Title: "When is your little one arriving?"
- Toggle: "Due Date" / "Last Period"
- Date picker (cosmic styled)
- Week preview card showing calculated week number
- Continue/Skip buttons

**Screen 8: Child Profile (final step)**
- Title: "Almost there, dear."
- Conditional fields based on mode:
  - Kids: Name, birth date, weight, allergies
  - Pregnancy: Optional name, allergies only
  - Pre-preg: Allergies only
- "Begin My Journey" CTA
- Terms footer

---

### HOME TAB — 3 VARIANTS

**Screen 9: Pre-Pregnancy Home**
- Header row: "COSMIC CYCLE" pink label (10px tracking) + "Good morning, {name}" (24px) + profile glass circle button (40px)
- Moon Phase Ring: 210px diameter, 28 small circles arranged in ring. Colors: pink (days 1-5 period), yellow (days 6-12 follicular), green (days 13-16 ovulation), purple (days 17-28 luteal). Today dot is larger with white ring glow. Center: "PERIOD IN" label (10px), "14 days" large countdown (48px), pink "Add Period" pill button
- Horizontal Week Strip: scrollable SUN-SAT, each cell 48px wide, today = green filled circle (36px), other days = white text
- Hormone Rhythm Chart: Glass card (rounded-32, p-24). Header: pulse icon (purple) + "Hormone Rhythm". SVG wave chart with gradient stroke (pink→yellow→green→purple), dashed progesterone line, green marker dot for today. Phase pills below: FOLLICULAR | OVULATION | LUTEAL (active one has colored bg + border)
- Daily Decode: Glass card with purple glow blur in corner. "YOUR DAILY DECODE" label + "Cycle Day X of 28" in yellow. Phase description text (16px, 80% opacity). Footer: overlapping icon circles (pink sparkles + purple moon) + "EXPLORE INSIGHTS" pink link with arrow

**Screen 10: Pregnancy Home**
- Greeting + mode context
- Pregnancy Week Display: Large gradient globe/sphere (blue→pink→green ring), "Week 24" display, moon phase label
- Baby Size Card: Days to go countdown, fruit/vegetable size comparison ("Your baby is the size of a corn")
- Development Insight: Gradient card with weekly development facts, "Record a lullaby" action
- Daily Pulse: Mood/weight/symptom quick-log cards

**Screen 11: Kids Home**
- Grandma Ball: Animated cosmic orb (blue→pink gradient ring, green sparkle badge), tappable for AI chat
- Quote: "How can I help you today, dear?" (32px centered)
- Subtitle: "Grandma AI is watching over your little one's rhythms and needs."
- Pillar Grid: 2-column grid, each pillar has unique neon bg color (blue=milk, green=food, yellow=nutrition, pink=vaccines, orange=clothes, etc.), icon + name + last activity time

---

### PLANNER/AGENDA TAB — 3 VARIANTS

**Screen 12: Pre-Pregnancy Planner**
- Header: "PLANNER" (40px bold) + subtitle "Your conception preparation" + calendar icon box
- Calendar: Month view with colored dots per day (red=period, green=fertile, yellow=ovulation)
- View mode switcher: DAY | WEEK | MONTH pills
- 3 Sub-tabs: Cycle (active yellow) | Checklist | Appointments
- Cycle tab: Full CyclePhaseRing, quick log buttons (Period Started, Period Ended, Ovulation Sign, Symptom, Basal Temp, Intercourse), symptom + cervical mucus chips, phase tips, nutrition recommendations
- Checklist tab: Progress bar (X% complete, X of 10 tasks), 10 glass cards with checkbox + title + description + category badge (Health=pink, Fertility=green, Lifestyle=blue, Financial=yellow). Items: Start Folic Acid, Prenatal Vitamins, Pre-Conception Checkup, Dental Checkup, Track Cycle, Partner Health Check, Quit Smoking, Exercise, Insurance Review, Baby Fund
- Appointments tab: Add Appointment button (dashed yellow border), appointment cards with type badges, doctor name, date. Types: Checkup, Bloodwork, Ultrasound, Glucose Test, Fertility, Specialist

**Screen 13: Pregnancy Calendar**
- Header: "CALENDAR" + subtitle "Week {X} tracking"
- Calendar with appointment dots
- Sub-tabs: Timeline | Symptoms | Kick Counter
- Timeline: Day view with appointments, symptoms, weight entries
- Symptoms: 10 tappable grid (Nausea, Fatigue, Back Pain, Cravings, Mood Swings, Swelling, Headache, Heartburn, Insomnia, Braxton Hicks) with severity selector (Mild/Moderate/Strong)
- Kick Counter (week 28+): Large pink TAP circle button (140px), kick count + timer display, "10 kicks in 2 hours" goal, session history cards. Info card about when to contact healthcare provider
- Contraction Timer (week 36+): Large timer display (64px), start/stop button (yellow→orange), stats row (total, avg duration, avg interval), 5-1-1 rule alert banner (orange bg), session history

**Screen 14: Kids Agenda**
- Header: "AGENDA" + subtitle "{child name}'s daily log"
- Calendar with activity dots (colored per activity type)
- Sub-tabs: Timeline | Food | Notes
- Timeline: Chronological activity entries (feeding, sleep, diaper, etc.)
- Food: Meal type grid (Breakfast/Lunch/Dinner/Snack), expandable action card (Photo+AI/Gallery/Manual), AI analysis tags on logged entries
- Notes: Add Note button (dashed yellow border), note cards with topic dot + label + time + content + author. Compose modal: topic selector chips (Food/Vaccine/Activity/Health/Reminder/General), text area, Cancel/Add Note buttons

---

### LIBRARY TAB (all modes, content adapts)

**Screen 15: Library / Guru Grandma**
- Header: "Guru" (24px, light weight) + "Grandma" (40px, bold, italic, yellow #F4FD50) + subtitle (purple-200/60, uppercase, wide tracking) + sparkle icon box (48px, rounded-16, glass bg, yellow sparkle icon)
- Empty state: Cosmic Orb (gradient blue→pink ball, dashed spinning border ring, green sparkle badge), "Guru Grandma" title, disclaimer text (purple-100/70)
- Knowledge Pillars section: label (11px, white/40, uppercase, tracking), flex-wrap glass pill chips (px-5 py-2.5, rounded-full) with emoji + name. Content changes per mode
- Community Channels: Glass card with dashed border, "Village Chat" title, "Coming Soon" badge (bg-white/10, rounded-lg, tiny uppercase)
- Chat UI (when messages exist): User bubbles (yellow bg, right-aligned, glow shadow) + Grandma bubbles (glass bg, left-aligned, border)
- Input bar: Glass pill container (rounded-2xl), text input, yellow 40x40 send button (rounded-xl) with arrow-up icon

---

### VAULT/DOCUMENTS TAB (pregnancy + kids only)

**Screen 16: Pregnancy Documents**
- Header: "PREGNANCY RECORDS" label + "Documents" title
- Emergency card: Pink bg, rounded-48, mother's blood type, OB/GYN name/phone, hospital, emergency contacts
- Sections: Ultrasound Images (pink icon), Test Results (green icon), Birth Plan (purple icon), Insurance (orange icon). Each section: glass card, expandable, file count badge
- Upload area: Yellow circle icon (64px), "Secure New Document" title, Scan + Upload buttons, "Add Record" CTA

**Screen 17: Kids Vault**
- Header: "SECURE ARCHIVES" label + "Vault" title
- Emergency card: Blue bg, rounded-48, child blood type, allergies, pediatrician, contacts
- Vaccine Records section
- Sections: Exams (pink), Hospital (green), Insurance (orange), Vaccines (blue)
- Same upload area

---

### GARAGE/MARKETPLACE TAB (all modes)

**Screen 18: Garage**
- Header: "MARKETPLACE" label (yellow/60, tracking) + "Grandma's" (30px white) + "Garage" (30px yellow) + yellow add button (48px circle, shadow)
- Filter pills: Horizontal scroll, active = yellow bg + dark text, inactive = glass bg + white text. Categories vary per mode
- Empty state: Two floating rotated solid-color cards (pink #FF71D2 at -6deg + cyan #4ADEDE at +6deg, overlapping, with icon circles + placeholder bars inside). "No listings yet" title (24px). Subtitle. Gradient CTA "Post Your First Item" (yellow→orange, rounded-16)
- With listings: Vertical FlatList of listing cards (photo, title, price, category badge, save heart)

---

### SETTINGS TAB (all modes, adapts)

**Screen 19: Settings**
- Header: "ACCOUNT" label (10px, purple-300/60, tracking) + "SETTINGS" (48px, black weight, tracking -2)
- Profile card (adapts per mode):
  - Pre-preg: Pink `#FF8AD8` bg, rounded-48, pink glow shadow. 96px avatar circle (white/20 bg, border-2 white/30), sparkle emoji. "Your Journey" name (30px). "TRYING TO CONCEIVE" badge (bg-white/20, rounded-full, 10px tracking)
  - Pregnancy: Purple `#B983FF` bg, same layout, pregnant emoji, "WEEK {X}" badge
  - Kids: Blue `#4D96FF` bg, baby emoji, age badge
- Admin mode (hidden, tap heading 5x): Orange label + mode switcher pills
- Manage Caregivers card (kids only): Glass card, pink people icon, chevron
- Appearance section: "APPEARANCE" label (purple-300/40). Glass card (rounded-32), moon/sun icon in 48px purple/yellow box, "Dark Mode"/"Light Mode" title (18px bold), description (14px, purple-300/60), toggle switch (purple #6D28D9 track)
- Scan History: "SCAN HISTORY" label. Glass card (rounded-32, p-40), dashed 64px camera circle (purple-300/20 border), "No scans yet" (18px bold), subtitle (14px, purple-300/40)
- Sign Out: Border-2 orange-500/50 rounded-full pill, logout icon + "SIGN OUT ACCOUNT" (12px, tracking-widest, orange-400)

---

## Screen Count Summary

| Category | Screens |
|----------|---------|
| Auth | 3 (Welcome, Sign Up, Sign In) |
| Onboarding | 5 (Journey, Parent Name, Activities, Due Date, Child Profile) |
| Home variants | 3 (Pre-Preg, Pregnancy, Kids) |
| Planner variants | 3 (Pre-Preg with 3 sub-tabs, Pregnancy with 3 sub-tabs, Kids with 3 sub-tabs) |
| Library | 1 (adapts content per mode) |
| Vault variants | 2 (Pregnancy, Kids) |
| Garage | 1 (filters adapt per mode) |
| Settings | 1 (profile adapts per mode) |
| Special | 10 (Scan, Paywall, Caregivers, Invite, Accept, Child Picker, AirTag, Birth Plan, Pillar Detail, Channels) |
| **Total** | **29 unique screens** |

---

## Design Generation Order (recommended)

1. **Auth flow** (Welcome → Sign Up → Sign In) — establishes brand, cosmic feel
2. **Onboarding** (Journey → Name → Activities → Profile) — establishes card/input patterns
3. **Pre-Pregnancy Home** — most complex, establishes cycle ring, charts, glass cards
4. **Planner sub-tabs** (Cycle, Checklist, Appointments) — extends pre-preg patterns
5. **Pregnancy Home + Calendar** — week display, kick counter, contraction timer
6. **Kids Home + Agenda** — pillar grid, food dashboard, nanny notes
7. **Library** — chat UI, pillar chips, cosmic orb
8. **Vault** — emergency card, document sections
9. **Garage** — marketplace cards, floating empty state
10. **Settings** — profile cards, theme toggle
11. **Special screens** — scan, paywall, caregivers, birth plan, etc.
