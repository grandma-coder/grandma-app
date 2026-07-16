# Flo Pregnancy Mode — Screens 240–249

## Checkpoint 1: Onboarding & Mode Activation (Screens 240–249)

### Screen 240 — Mode Switch Confirmation
- **Purpose:** Confirm user intent to switch from pre-pregnancy to Get Pregnant / Pregnancy Mode.
- **Text inventory:** 
  - "You're going to switch to Get Pregnant Mode"
  - "Health Insights, Health Assistant, and Secret Chats will be customized to help you leverage fertile days."
  - "Do you want to continue?" (No / Yes)
- **UI structure:** Full-screen modal, centered text, dual-action buttons (cyan/pink).
- **Flow & logic:** Mode transition gate — allows explicit user confirmation before mode activation.

### Screen 241 — Conception Timeline Question
- **Purpose:** Establish baseline data for mode personalization.
- **Text inventory:**
  - "How long have you been actively trying to conceive?"
  - Options: Just getting started, 1–7 months (with skip option)
- **UI structure:** Option list (white cards, tap-to-select), progress bar top.
- **Flow & logic:** Multi-step onboarding questionnaire; skip allowed.

### Screen 242 — Conception Timeline with Education
- **Purpose:** Present selected option with supporting educational content.
- **Text inventory:**
  - Selected: "Just getting started" (pink highlight, 9%)
  - "Approximately 84% of couples who have unprotected sex on a regular basis (2–3 times per week) conceive within a year of trying. Flo is here to help you optimize your chances of conception with cycle predictions and useful tips."
  - Next button (pink)
- **UI structure:** Pink card highlights selected option with fertility education.
- **Flow & logic:** Affirmation + education for user's choice; advances to next question.

### Screen 243 — Baby Development Tracking Preference
- **Purpose:** Determine preferred granularity for pregnancy tracking.
- **Text inventory:**
  - "How were you planning to track your future baby's development?"
  - Selected: "Week by week" (pink, 51%)
  - "Each week marks some important milestones in the development of a fetus. Once you become pregnant, you can switch to tracking pregnancy and receive helpful tips about your body and your baby's development week by week."
  - Options: Week by week, Month by month, Trimester by trimester
- **UI structure:** Pink education card, option list below.
- **Flow & logic:** Preference-driven; week-by-week is majority choice (51%).

### Screen 244 — Pre-Pregnancy Home (Settings + Goal Selector)
- **Purpose:** Show pre-pregnancy home, settings panel, and mode goal options.
- **Text inventory:**
  - Calendar: March, day 20 (TODAY)
  - "Time for a pregnancy test in 13 days / Unless your period starts in 10 days"
  - "Log period" button (pink)
  - "My daily insights · Today" section with cards:
    - "Log your symptoms" (teal +)
    - "Symptoms to expect" (blue card with emoji)
    - "Become an expert on hormones" (dark card, QUIZ in lime)
  - Settings: email, "Flo Premium" badge, "My goal:" tabs (Track cycle, Get pregnant [active], Track pregnancy)
  - Menu items: Report for a doctor, Graphs & reports, Cycle and ovulation, Settings, Access code, Reminders
- **UI structure:** Hamburger settings panel (dark overlay); goal pill selector above; calendar + countdown ring; insight cards below.
- **Flow & logic:** Settings gate for goal switching; premium upsell visible; daily tasks organized by category.

### Screen 245 — Settings Modal with Account Info
- **Purpose:** Account settings, goal selection, navigation to sub-sections.
- **Text inventory:**
  - "Settings" (header)
  - Email: jdoe.mobbin1@gmail.com
  - "Edit info" link
  - "Flo Premium" (pink button)
  - "My goal:" pills (Track cycle [pink/active], Get pregnant, Track pregnancy [greyed])
  - Menu: Report for a doctor, Graphs & reports, Cycle and ovulation, Settings, Access code, Reminders
- **UI structure:** Dark card header with avatar + account info; pink pill tabs; list menu below.
- **Flow & logic:** Goal switching via pills; premium gating; access to all sub-sections.

### Screen 246 — Welcome Illustration (Pregnancy Onboarding)
- **Purpose:** Welcome user to pregnancy mode with illustrative emotional framing.
- **Text inventory:**
  - Illustration: pregnant woman with natural, warm-tone art style
  - "Welcome to your journey to becoming a parent!"
  - "Follow week-by-week physical and emotional changes you'll experience and explore your baby's growth and development."
  - Next button (pink)
- **UI structure:** Full-screen illustration, centered copy, centered CTA.
- **Flow & logic:** Emotional welcome screen; establishes pregnancy-specific tone.

### Screen 247 — Baby Illustration + Week Calculation
- **Purpose:** Display fetal development and confirm pregnancy week.
- **Text inventory:**
  - Illustration: fetus in hands (illustration style)
  - "Looks like you are 3 weeks pregnant"
  - "Flo uses gestational age — the number of completed weeks that have gone by since the first day of your last period."
  - "Change pregnancy week" button (white)
  - "Activate Pregnancy Mode" button (pink)
- **UI structure:** Centered illustration, bolded week number in pink, explanatory text, dual CTA.
- **Flow & logic:** Final confirmation before mode activation; allows week adjustment.

### Screen 248 — Week Picker (Scrollable Selection)
- **Purpose:** Allow user to manually adjust pregnancy week.
- **Text inventory:**
  - "Select your pregnancy week"
  - "Get timely updates about you and your baby."
  - Weeks: 1, 2 (pink "Select" label visible), 3
- **UI structure:** Scroll picker (large type), pink highlight band on selection.
- **Flow & logic:** Snap-to-select interaction; user can fine-tune based on ultrasound or LMP.

### Screen 249 — Week Picker (Week 2 Selected)
- **Purpose:** Confirm week selection before activation.
- **Text inventory:**
  - "Select your pregnancy week"
  - Weeks: 1, 2 (pink), 3
  - "Activate Pregnancy Mode" button (pink, bottom)
- **UI structure:** Scroll picker with week 2 highlighted in pink.
- **Flow & logic:** CTA ready to finalize mode activation once week is selected.

---

## Observations from Checkpoint 1

- **Mode entry is gated and educational**: Flo requires explicit confirmation + brief onboarding questions before mode activation
- **Fertility baseline data captured early**: Conception timeline + baby tracking preference set expectations and personalization
- **Pre-pregnancy home visible before switch**: User sees goal selector + settings before transitioning to pregnancy mode
- **Gestational age explained**: Flo educates on LMP-based week calculation (not conception date)
- **Week picker is interactive**: Users can fine-tune their pregnancy week at activation, not locked to their responses
- **Pink/rose tone**: Brand color consistent across buttons, highlights, and active states
- **Illustration-driven onboarding**: Warm, natural art style for emotional connection (not clinical)

---

## Checkpoint 2: Personalization & Home (Screens 250–259)

### Screen 250 — Custom Program Invitation
- **Purpose:** Introduce pregnancy personalization questionnaire.
- **Text inventory:**
  - Illustration: pregnancy tracking assets (chart, test, bottle, ultrasound, pillow)
  - "Let's create your custom program"
  - "Tell us more about yourself to get the best experience. It takes less than a minute."
  - "Personalize Flo for me" button (pink)
- **UI structure:** Centered illustration, headline, copy, CTA.
- **Flow & logic:** Bridges mode activation to personalization; skip not offered (mandatory flow).

### Screen 251 — Stress Frequency Question
- **Purpose:** Assess maternal stress for program customization.
- **Text inventory:**
  - "How often do you feel stressed?"
  - Options: Rarely, Several times a month, Several times a week, Almost every day (all tappable)
  - Progress bar; skip allowed
- **UI structure:** Option cards (white, tap-highlight).
- **Flow & logic:** Baseline health data for program recommendations.

### Screen 252 — Diet Preference Question
- **Purpose:** Gather nutritional guidance preferences.
- **Text inventory:**
  - "What's your diet like?"
  - Options: No restrictions, Vegetarian, Vegan, Other
  - Back arrow + skip available
- **UI structure:** Option cards, back navigation.
- **Flow & logic:** Non-mandatory; supports nutrition content filtering.

### Screen 253 — Loading Progress (29%)
- **Purpose:** Progress indicator during personalization processing.
- **Text inventory:**
  - "Creating your personal program...." (ellipsis animation)
  - Large pink progress ring (29% fill)
- **UI structure:** Full-screen progress indicator, minimal copy.
- **Flow & logic:** Loading state before results; provides visual feedback.

### Screen 254 — First Pregnancy Check
- **Purpose:** Determine if this is user's first pregnancy (impacts content tone).
- **Text inventory:**
  - Progress ring at 30%
  - Modal overlay: "Is this your first pregnancy?" (No / Yes)
- **UI structure:** Modal on top of loading ring; dual-action buttons.
- **Flow & logic:** Interrupts loading to ask experience level; affects pillar content.

### Screen 255 — Loading Complete (100%)
- **Purpose:** Finalize personalization.
- **Text inventory:**
  - Progress ring fully filled (100%, all pink)
  - "Creating your personal program...."
- **UI structure:** Full pink ring confirms completion.
- **Flow & logic:** Visual reward before next screen.

### Screen 256 — Program Summary
- **Purpose:** Display personalized program pillars.
- **Text inventory:**
  - "Your personal pregnancy program"
  - Icons + text pairs:
    - "See how your baby and body develop" (emoji: smiley face)
    - "Know your do's and don'ts" (emoji: checkmark)
    - "Get healthy nutrition tips" (emoji: salad bowl)
    - "Learn how to stay active" (emoji: running person)
    - "Practice meditation to reduce stress" (emoji: meditating person)
    - "Join the supportive community of first-time parents" (emoji: family)
  - Next button (pink)
- **UI structure:** Icon + copy pairs, vertical list.
- **Flow & logic:** Confirms program scope; leads to pregnancy home.

### Screen 257 — Pregnancy Home (Week Ring + Insights)
- **Purpose:** Main pregnancy home dashboard.
- **Text inventory:**
  - Calendar: March, day 20 (TODAY), "Monthly calendar is here" (teal tooltip)
  - Week ring: "2 weeks" with fetal illustration + "Details" button
  - Step count: 32 steps
  - "My daily insights" section with cards:
    - "Log your symptoms" (teal +)
    - "Your baby's growth diary" (pink card, fetal illustration)
    - "The First Weeks of Pregnancy" (pink card)
  - Bottom tabs: Today (active), Insights (grey), Secret Chats, Partner
- **UI structure:** Calendar + large week ring (hero), insight cards horizontal-scrolling below.
- **Flow & logic:** Week is central hero; tap "Details" for deep content; daily tasks available.

### Screen 258 — Week Details Modal (Week 2)
- **Purpose:** Full-screen week detail view with scrollable fetal development.
- **Text inventory:**
  - "2 weeks" (header)
  - Close (X) button
  - Fetal illustration (week 2, early embryonic stage)
  - Week tabs: 2 weeks (active, white), 3 weeks, 4 weeks, 5 weeks (scrollable horizontal)
  - "What happens at 2 weeks"
  - "Reviewed By Dr. Nazaneen Homaifar, Obstetrician and gynecologist, Lifova Health System"
- **UI structure:** Full-screen modal, fetal image hero, week tabs below, doctor attribution.
- **Flow & logic:** Tap week tab to jump; scroll content below tabs.

### Screen 259 — Week 42 Details (Late Pregnancy)
- **Purpose:** Show term pregnancy detail screen (comparison to early weeks).
- **Text inventory:**
  - "42 weeks" (header)
  - Close (X) button
  - Large fetal illustration (full-term baby, mature stage)
  - Week tabs: [earlier weeks]... 40 weeks, 41 weeks, 42 weeks (active, white)
  - "What happens at 42 weeks"
  - "Reviewed By Dr. Charlsie Celestine, Obstetrician and gynecologist, New Jersey, US. 10+ years in [specialty]"
- **UI structure:** Same as screen 258; fetal illustration reflects week 42 (post-term).
- **Flow & logic:** Demonstrates continuous content across all 40+ weeks; different doctor per week.

---

## Observations from Checkpoint 2

- **Personalization is lightweight but decisive**: Stress, diet, first-pregnancy status gathered in <30 seconds; used to shape program.
- **Program pillars stated upfront**: 6 personalized benefits listed after onboarding, setting expectations for home experience.
- **Week ring is the hero**: Central visual on pregnancy home; tapping opens modal with full fetal development + educational content.
- **Week tabs enable quick navigation**: User can jump between weeks without returning to home; seamless exploration.
- **Doctor attribution adds authority**: Each week content credited to specific OB; builds credibility + expertise signal.
- **Fetal illustrations evolve with week**: Visual progression from embryo (week 2) to full term (week 42) reinforces development narrative.
- **Home tabs**: Today (logging), Insights (analytics), Secret Chats (community), Partner (co-parenting).
- **Stress + diet gate later features**: Meditation/nutrition content triggered by those answers.

---

## Checkpoint 3: Week Content Deep-Dive (Screen 260)

### Screen 260 — Week 42 Content (Scrollable Detail)
- **Purpose:** Full week content showing fetal size comparison + birth readiness messaging.
- **Text inventory:**
  - Header: "What happens at 42 weeks"
  - Doctor: "Dr. Charlsie Celestine, Obstetrician and gynecologist, New Jersey, US, 10+ years in obstetrics and gynecology"
  - Fetal illustration + watermelon size comparison
  - "How big is a baby at 42 weeks?"
    - "Length (crown to heel): 52 cm or 20.5 in"
    - "Weight: 3.8 kg or 8.3 lb"
    - "Size: Equivalent to a watermelon"
  - "All measurements are approximate and vary within the normal range."
  - "Your baby is ready to be born"
  - "At 42 weeks, you'll likely feel very ready for your baby to arrive, and your baby is ready to be born. Throughout your 3rd trimester, your baby's organs and systems have developed and matured, and they've been [scrollable content below]"
- **UI structure:** Doctor avatar + full bio; fetal + fruit illustration (side-by-side); scrollable content below.
- **Flow & logic:** Educates on milestones + readiness; fruit comparison provides intuitive sizing; scrollable for more detail.

---

## Synthesis — Flo Pregnancy Mode Patterns

### Pregnancy Home Structure
- **Week ring hero**: Large circular visual displaying current week + fetal illustration; tap for full detail modal
- **Calendar integration**: Quick date access; shows upcoming milestones (e.g., "pregnancy test in 13 days")
- **Daily insights cards**: Horizontal-scrolling cards for logging (symptoms, mood) + content (growth diary, articles)
- **Bottom tab navigation**: Today (active/logging), Insights (analytics), Secret Chats (community), Partner (co-parenting)

### Weekly Engagement Mechanics
- **Week tabs within modal**: Horizontal scroll through all 40+ weeks; each week has unique fetal illustration + medical content
- **Doctor-attributed content**: Every week credited to specific OB; builds expertise credibility
- **Size comparisons**: Fruit/object analogies (watermelon, apple, etc.) make growth tangible
- **Bio progression**: Copy shifts from "embryo developing" (early) to "ready to be born" (late pregnancy)

### Mode Entry Flow (Standout vs. Grandma.app)
| Dimension | Flo | Grandma.app (Current) |
|---|---|---|
| **Mode gate** | Explicit confirmation modal + 3-question onboarding | Automatic on due-date entry |
| **Personalization** | Stress, diet, first-pregnancy status (async loading, 29%→100%) | Minimal (activity types only) |
| **Pre-home intro** | 2 illustrated welcome screens + program pillar summary | Onboarding flow, then home |
| **Week calculation** | LMP-based gestational age; user can adjust at activation | Automatic from due-date |
| **Pregnancy loss** | Not visible in these screens; likely in settings/help |  Unhandled |

### Key Patterns Worth Stealing
1. **Lazy-load personalization**: Gather data async with progress ring; feels snappy, not form-heavy
2. **Fruit size metaphors**: Week 42 = watermelon; intuitive, shareable (partner engagement)
3. **Doctor authority stacking**: Every week has a credited OB; signals medical rigor without clinical tone
4. **Tab-based week navigation**: Smooth exploration without returning to home; encourages pregnancy curiosity
5. **"Today" card logging**: Central log-your-symptoms CTA on home; drives daily engagement
6. **Modal-based detail depth**: Home stays minimal; tap week ring for rich content (no page bloat)
7. **Partner tab**: Co-parenting surface suggests shared pregnancy experience (grandma.app doesn't have this)
