# Flo Onboarding Flow — Benchmark Analysis (45 screens)

## Screens 0–9

### Screen 000 — Splash/Logo
- **Purpose:** Brand reveal and app initialization.
- **Text inventory:** "Flo" (app name), "curated by Mobbin" (credit line).
- **UI structure:** Full-bleed pink (#E58BB4) background, centered white leaf logo, horizontal progress bar at bottom.
- **Flow & logic:** Entry point. Persists ~2 sec, auto-advances to Screen 001.

### Screen 001 — Intro / Hero
- **Purpose:** Warm welcome and establish tone.
- **Text inventory:** "Hello, I'm Flo" (centered heading).
- **UI structure:** Pale/white background with scattered illustration stickers (flowers, watering cans, dandelions in pink/peach/lavender palette). Centered welcome text. Progress bar.
- **Flow & logic:** Establishes friendly, botanical design language. Single swipe/tap advances.

### Screen 002 — Credibility Signal
- **Purpose:** Build trust via medical authority.
- **Text inventory:** "#1 female OB-GYN-recommended app for period and cycle tracking" | "Based on a survey of 225 US OB-GYNs who recommend apps for period and cycle tracking, DRG, 2021" (citation).
- **UI structure:** Same botanical sticker landscape. Bold headline + gray source citation. Progress bar.
- **Flow & logic:** Social proof + medical framing. Persuasion signal: credibility via OB-GYN authority. Single advance.

### Screen 003 — Privacy / Consent 1
- **Purpose:** Data privacy assertion and consent gathering (2-part form).
- **Text inventory:** "Your body. Your data" | "Your health data will never be shared with any company but Flo, and you can delete it at any time." | Checkbox 1: "I agree to processing of my personal health data for providing me Flo app functions. See more in Privacy Policy." | Checkbox 2: "I agree to the Privacy Policy and Terms Accept all" | Button: "Next".
- **UI structure:** Shield graphic with gears + pink accent. Two unchecked checkboxes with linked policy text (pink hyperlinks). Pink pill button. Progress bar.
- **Flow & logic:** Legal requirement gate. Persuasion: privacy reassurance (ownership frame: "Your data"). Checkboxes can be tapped individually; "Accept all" bulk-accepts both (not shown as button but as link/action).

### Screen 004 — Privacy / Consent 2 (Completed)
- **Purpose:** Same privacy screen, both consents checked.
- **Text inventory:** Same as Screen 003, but both checkboxes now show pink checkmarks.
- **UI structure:** Identical layout. Two checked boxes (pink check icon). Pink "Next" button active.
- **Flow & logic:** State change from Screen 003 — visual feedback that both consents are satisfied. "Next" button now active/enabled.

### Screen 005 — Name Collection
- **Purpose:** Personalization via user name.
- **Text inventory:** "Let's get to know each other!" | "What would you like Flo to call you?" | Text input: "[cursor]" | Button: "Continue".
- **UI structure:** Minimalist white/gray background. Large black heading + gray subheading. Single text input field with pill-rounded border, gray placeholder bg. Pink pill button. "Skip" link (gray) in top-right.
- **Flow & logic:** Early personalization moment. Skip option available. Name stored to greet user throughout app. Psychological tactic: relationship-building via direct address.

### Screen 006 — Name Collection (Filled)
- **Purpose:** Name input confirmation state.
- **Text inventory:** Input field now contains "jane" (example user entry). Rest unchanged.
- **UI structure:** Same layout. Input shows typed text "jane". Keyboard visible (iOS default QWERTY). Pink "Continue" button ready.
- **Flow & logic:** Confirmation state. User has entered name. Button enabled and tappable to proceed.

### Screen 007 — Personalization Confirm
- **Purpose:** Acknowledge user name and begin profile build-out.
- **Text inventory:** "Nice to meet you, jane!" (using collected name).
- **UI structure:** White background. Large black heading. Centered pink Flo logo (same leaf from splash). Progress bar.
- **Flow & logic:** Micro-confirmation step. Reinforces personalization (uses name from Screen 005). Brief celebration moment. Auto-advances or single tap.

### Screen 008 — Self-vs-Partner Branch
- **Purpose:** Determine app access model (solo or partner-linked).
- **Text inventory:** "Are you using Flo for yourself?" | Button 1: "Yes" | Button 2: "No, I have a partner code".
- **UI structure:** White background. Bold black heading. Two large pill-shaped button options (gray background). Progress bar.
- **Flow & logic:** Binary branching gate. Determines downstream onboarding path (partner sync optional). Sets expectation: app is individual-first, partner integration is opt-in. Paths diverge after this choice.

### Screen 009 — Birth Year Picker
- **Purpose:** Demographic collection + age-based content customization.
- **Text inventory:** "Log your year of birth to make the predictions better" | Picker shows: "2000, 2001, 2002 [Select], 2003, 2004, 2005…".
- **UI structure:** White background. Black heading. Scrollable year picker with native iOS UX (center "Select" highlighted). Gray placeholder text for hidden years. Progress bar.
- **Flow & logic:** Uses localized picker UI. Frames data collection as personalization ("better predictions"). Birth year used for age-gated content, fertility data calibration, feature recommendations. Implicit: predictive algorithm needs age data.

### Screen 010 — Birth Year Picker (Confirmed)
- **Purpose:** User selects birth year from picker; confirmation state.
- **Text inventory:** Same as Screen 009, but year "1995" is now highlighted in gray center picker.
- **UI structure:** Identical picker. Pink "Next" button at bottom.
- **Flow & logic:** Picker state after user selection. Year 1995 shows as selected (center row emphasis). Advances to next demographic question.

### Screen 011 — Pregnancy Status Branch
- **Purpose:** Determine user's current pregnancy status; major flow branching gate.
- **Text inventory:** "Are you pregnant?" | Option 1: "No, but I want to be" | Option 2: "No, I'm here to better understand my body" | Option 3: "Yes, I am" | Link: "Log in" (gray, bottom).
- **UI structure:** White background. Bold black heading. Three large pink pill buttons (full-width). "Log in" link at bottom (gray text).
- **Flow & logic:** Critical branching. Determines app content mode (TTC, cycle-tracking, pregnancy). Each path leads to different pillar set and data model. Note: "Log in" link for existing users.

### Screen 012 — Social Proof & Content Preview
- **Purpose:** Establish authority + preview feature value (assumes "TTC" or cycle-tracking branch).
- **Text inventory:** "You're in the right place!" | "Flo's tracked over 2.2 billion cycles" | Four illustrated cards: "How my cycle impacts sex", "What do my PMS symptoms mean?", "Period could start today", "Dive into my cycle day 12".
- **UI structure:** White background. Gray subheading + bold heading. Four tile cards (2x2 grid) with illustrations + titles. Pink "Next" button.
- **Flow & logic:** Social proof (2.2B cycles = scale/credibility). Content preview cards show feature scope (sex, symptoms, tracking, deep dives). Persuasion: abundance of content + cycle science framing.

### Screen 013 — Motivation Selector (Multi-choice)
- **Purpose:** Identify user's primary motivation for tracking; multi-select (allows multiple reasons).
- **Text inventory:** "Why are you tracking your cycle?" | "Choose as many as you like." | Options: "To know when my period is coming" | "To know if my cycle or symptoms are normal" | "To improve my sex life" | "To understand my risk of getting pregnant" | "Something else" | All options have unchecked radio buttons.
- **UI structure:** White background. Black heading + gray subheading. Five gray pill-shaped option buttons with radio buttons (right-aligned). "Skip" link (gray, top-right). Progress bar showing ~1/3 completion.
- **Flow & logic:** Multi-select allows self-reported motivations. Data powers personalization (content recommendations, feature prominence). Skip option = optional completion.

### Screen 014 — Motivation Selector (Selections Visible)
- **Purpose:** Confirmation state; first two options selected, with inline explanation copy.
- **Text inventory:** First two options now highlighted pink with white checkmarks. Inline copy appears below each selected option: "Got it! We'll give you accurate period predictions so you're always prepared." (option 1) | "We'll help you analyze and manage your cycle and symptoms so you stay happy and healthy." (option 2) | Unselected options remain gray. Pink "Next" button.
- **UI structure:** Selected options in pink (filled). Unselected remain gray. Inline confirmatory text under selections. Progress bar continues.
- **Flow & logic:** Interactive confirmation + personalization messaging. Shows Flo's promise aligned to selected motivations (relevance + reciprocity). Encourages multi-select without forcing all.

### Screen 015 — Onboarding Benefit Preview
- **Purpose:** Set expectations + summarize app value proposition.
- **Text inventory:** "Become an expert on you" | Three pink-checkmarked benefits: "Get accurate period predictions and symptom insights" | "Easily track your period, view future cycles and understand your fertile days" | "Plan ahead with tips on mood, discharge, cramps and more" | Mini calendar showing "Period in 3 days, Low chance of getting pregnant" | Pink "Next" button. Back arrow (navigation).
- **UI structure:** Light pink background. Calendar mini-view at top. Three checked benefits (gray text). Bold heading.
- **Flow & logic:** Value prop summary before feature tour. Shows concrete output (period prediction, "3 days"). Loading moment — transitions user from profiling to content.

### Screen 016 — Social Proof (User Testimonials)
- **Purpose:** Establish credibility via user testimonials + ratings.
- **Text inventory:** Testimonial 1 (pink bubble, "Hymmyo"): "THE MOST ACCURATE EVER! I can't believe how accurate this app is!! It almost knows to the minute honestly." | Testimonial 2 (pink bubble, "stargirl michaela"): "I understand my body so much more now thanks to Flo, truly a game changer!" | Central stat: "3.5M+ ⭐⭐⭐⭐⭐ 5 star ratings" (with wheat/laurel illustrations). | Testimonial 3 (pink, "kcdb513"): "I find this app extremely helpful, it actually helped me realize that a lot of my symptoms were irregular." | Testimonial 4 (light pink, "hehehjskz"): "Amazing app! I know where I am with my cycle, its like magic!" | Pink "Next" button.
- **UI structure:** Light beige/cream background. User testimonials in staggered pink/white bubbles with avatar circles (initials). Star ratings emphasized. Progress bar.
- **Flow & logic:** Social proof via user reviews + ratings (3.5M 5-stars = extremely credible). Testimonials mention specific benefits (accuracy, self-understanding, anomaly detection). Persuasion: authority + consensus + emotional validation ("game changer," "magic").

### Screen 017 — Feature Tour / App Scope Preview
- **Purpose:** Show breadth of features beyond basic tracking.
- **Text inventory:** "Flo is so much more than a period tracker" | "We'll help you improve everything from your symptoms to your sex life." | Preview of "My daily insights" tab showing: "Log your symptoms" (+ icon), "Let's talk backache" (card), "Spotting vs. period vs. bleeding" (card). Visible tab icons at bottom.
- **UI structure:** Cream background. Large black heading + gray subheading. UI mockup showing app tab structure (Today, Insights tabs visible, greyed out). Pink "Next" button.
- **Flow & logic:** Expands scope expectation (not just period tracking). Hints at symptom logging, educational content, personalized insights. Sets up next feature tour or onboarding completion.

### Screen 018 — Help Scope / Use Cases (Multi-select)
- **Purpose:** Identify specific health concerns / use cases; another multi-select for segmentation.
- **Text inventory:** "What can we help you do?" | "Choose as many as you'd like." | Six option tiles (2x3 grid) with illustrations: "Sync my sex life with my cycle" (pink heart icon) | "Make masturbation work for me" (purple/orange icon) | "Spot signs of PCOS or Endometriosis" (uterus icon, blue) | "Decode my discharge" (green underwear icon) | "Manage symptoms and moods" (blue bottle icon) | "Learn how to orgasm" (brown skin illustration). | "Skip" link (top-right). Progress bar.
- **Flow & logic:** Multi-select of health concerns. Highly segmented. Data feeds personalization engine (content recommendations, feature prioritization, funnel targeting). Includes sexual health + medical conditions side-by-side (normalizes both).

### Screen 019 — Help Scope (Selections Shown)
- **Purpose:** Confirmation state; three options selected and highlighted.
- **Text inventory:** Same layout, but three tiles now have pink borders/highlights: "Sync my sex life with my cycle", "Spot signs of PCOS or Endometriosis", "Manage symptoms and moods". Unselected tiles remain white/unbordered. Pink "Next" button. "Skip" link and progress bar.
- **Flow & logic:** Visual feedback on selections. Confirms user's health/feature priorities. Inline highlighting makes selections easy to verify. Continues toward onboarding completion.

---

## Checkpoint 2 Summary (Screens 10–19)

**Flow shape:** Birth year → Pregnancy status branch (critical fork) → motivation for tracking (multi-select) → value prop preview → social proof testimonials → feature scope preview → specific use cases (multi-select).

**Data collected (10–19):** Birth year (confirmed), pregnancy/TTC status, motivation(s) for tracking (3–5 reasons), specific health concerns/use cases (3 selected from 6).

**Persuasion mechanics:**
- Scale credibility (2.2B cycles, 3.5M 5-star ratings) at Screens 012, 016
- Personalized benefit messaging (matched to selected motivations) at Screen 014
- Emotional testimonials (accuracy, self-understanding, "game changer") at Screen 016
- Medical/sexual health normalization (PCOS, discharge, orgasm) at Screen 018–019
- Progressive commitment (multi-selects encourage deeper engagement)

**Top patterns emerging:**
1. Multi-select checkpoints (motivations, use cases) drive segmentation data early
2. Inline confirmation messaging (explaining Flo's promise per selection)
3. Testimonial + rating density (credibility overload before paywall)
4. Breadth signaling (sex life, PCOS, mood, symptom decoding all equal priority)

---

## Screens 20–29

### Screen 020 — Motivation Confirmation / Benefit Reiteration
- **Purpose:** Confirm motivations selected and show personalized benefit messaging.
- **Text inventory:** Illustration (woman holding Flo app, empowered pose). "Got it! We'll help you:" | Two checked benefits: "Know what to look for and get support for reproductive health conditions" | "Get support for your feelings and stop your symptoms in their tracks" | Pink "Next" button. Back arrow.
- **UI structure:** Cream/white background. Illustration at top. Two pink-checkmarked benefits (gray body text). Progress bar.
- **Flow & logic:** Recaps selected motivations in Flo's voice. Reinforces value prop tied to user's stated goals (personalization). Creates implied contract.

### Screen 021 — Emotion/Attitude Toward Period (Single-select, Emoji-driven)
- **Purpose:** Sentiment profiling (emotional relationship to menstruation).
- **Text inventory:** "How do you feel about your period, Jane?" | Five options with emoji: "It's a love-hate relationship 😏" | "Embarrassed 😭" | "Hate it 🤬" | "I want to understand it better 🤔" (selected, pink background) + subtext "89% of Flo users say Flo has helped them feel more informed and educated about their cycle health.*" | "We've become friends 😊" | "Skip" link. Pink "Next" button.
- **UI structure:** White background. Emoji-driven buttons (some gray, one selected in pink with inline stat). Gray subtext under selection.
- **Flow & logic:** Emotional micro-segmentation. Data personalization: content tone/framing per sentiment. Social proof stat (89%) reinforces selected option. Shows that understanding is a common goal + Flo delivers on it.

### Screen 022 — Period Tracking / Prediction Setup
- **Purpose:** Introduce tracking + predict cycle.
- **Text inventory:** "Log your periods to get accurate predictions" | Calendar showing "NEXT PERIOD 25" (marked). "90% of users say Flo accurately predicts the start of their period." | Button: "Add period dates" (pink). "NOTE: This is sample data" (gray). Back arrow.
- **UI structure:** Calendar mockup (light background, pink accent on "25", sample data watermark). Bold heading + gray stat below. Pink CTA button.
- **Flow & logic:** Credibility + call-to-action for data entry. 90% stat justifies why logging matters (accuracy). "Sample data" disclaimer keeps user expectations clear.

### Screen 023 — Period Entry Flow (Calendar Picker, Initial State)
- **Purpose:** User taps "Add period dates" → calendar interface.
- **Text inventory:** Coral/salmon header: "Tap on the day when your last period started." | Calendar grid (March + April visible, today = March 13). "I don't remember" option (radio button).
- **UI structure:** Coral-top header bar. Calendar with date circles (selectable). "I don't remember" fallback. No button visible yet.
- **Flow & logic:** Guided data entry. "I don't remember" escape hatch (removes pressure). Defaults to recent months for ease of recall.

### Screen 024 — Period Entry Flow (Auto-fill + Adjust)
- **Purpose:** After user selects start date, system auto-fills estimated period duration; user adjusts if needed.
- **Text inventory:** Coral header: "Dates are auto-filled. Tap them to adjust." | Calendar shows March 1–7 marked with pink checkmarks (auto-filled 7-day period). "I don't remember" option. Teal "Next" button.
- **UI structure:** Same calendar. Dates 1–7 highlighted in pink with checkmarks (auto-filled). Teal "Next" button (indicating progress to next step).
- **Flow & logic:** Reduces friction (auto-fills standard 5–7 day flow) but allows customization. Shows confidence (pre-fills intelligently). Teal button = new color signal (moving to next phase).

### Screen 025 — Historical Period Logging (Multi-month)
- **Purpose:** Collect prior cycle history for algorithm accuracy.
- **Text inventory:** Coral header: "Tap on the dates of previous periods for even better predictions." | Calendar shows February + March. February 8–12 marked with pink checkmarks, March 1–2 already marked from previous screen. Teal "Next" button.
- **UI structure:** Multi-month calendar. Pink checkmarks for logged periods. Coral header (same as Screen 023–024 phase). Teal "Next" button.
- **Flow & logic:** Optional but encouraged. More history = better algorithm. Positions logging as "investment in accuracy." No pressure (optional, not required).

### Screen 026 — Loading State / Processing
- **Purpose:** Calculate predictions based on logged periods.
- **Text inventory:** "Great! The more you log, the more accurate Flo's predictions get." | Illustration: magnifying glass + calendar sketch (hand-drawn style, teal). Teal "Next" button.
- **UI structure:** Minimalist white background. Large hand-drawn illustration (teal ink, sketchy). Centered black heading. Teal button.
- **Flow & logic:** Psychological pause (processing cycle algorithm). Reinforces value of logging. Illustration style shifts from botanical to hand-drawn (more intimate, personal science). Implicit: "we're analyzing your cycle now."

### Screen 027 — Prediction Results / Notification Pitch
- **Purpose:** Show first prediction output + pitch notification opt-in.
- **Text inventory:** Prediction card: "FILO" (logo) | "now" | "Your period might start today 🩸" | "Log your symptoms for expert tips on how to feel better 👇" | Main heading: "Your next period will start around March 29" | Gray subtext: "Want a heads up before your period starts? Tap 'Allow' on the next screen to get reminders." | Pink "Next" button.
- **UI structure:** Prediction card showing notification-style UI (Flo branding, emoji, call-to-action). Heading + subtext below. Pink button.
- **Flow & logic:** Concrete output delivered (prediction = tangible value). Notification pitch teases future value. Directs user to permissions flow. Sets expectation for next screen (notifications dialog).

### Screen 028 — iOS System Notification Permission Dialog
- **Purpose:** Request push notification permission (OS-level).
- **Text inventory:** iOS system modal: '"Flo" Would Like to Send You Notifications' | "Notifications may include alerts, sounds, and icon badges. These can be configured in Settings." | Buttons: "Don't Allow" (blue link) | "Allow" (blue link). | Below modal: "Choose it!" (hint text).
- **UI structure:** Translucent gray overlay. White iOS modal card (centered). Two-button layout. Hint text below.
- **Flow & logic:** System permission gate. Note: "Don't Allow" is presented as equal option (user retains choice), but hint ("Choose it!") nudges toward allow. Flow can proceed either way; allow unlocks notifications.

### Screen 029 — Onboarding Completion / Confirmation
- **Purpose:** Mark onboarding complete; show prediction summary + final CTA.
- **Text inventory:** This screen not fully visible in sample — appears to be final confirmation or app-entry screen. (Screen count notes 29 shown, likely transitions to home/main app.)
- **UI structure:** (Inferred from context) Likely shows prediction output or main app entry point.
- **Flow & logic:** (Inferred) Final milestone; user enters main app experience.

---

## Checkpoint 3 Summary (Screens 20–29)

**Flow shape:** Motivation confirmation → emotion profiling (single-select) → period entry (calendar picker with auto-fill + historical logging option) → loading/processing → prediction output → notification permission → onboarding completion.

**Data collected (20–29):** Sentiment/attitude toward period, last period start date, estimated duration (auto-filled, user-adjustable), historical period dates (optional), notification permission.

**Persuasion mechanics:**
- Emotional micro-segmentation (emoji-driven sentiment) at Screen 021
- Accuracy stats (90%, 89%) linked to logging behavior at Screens 022, 021
- Auto-fill + personalization (reduces friction) at Screen 024
- Prediction output as reward/proof-of-value at Screen 027
- Notification pitch pre-permission (sets expectation) at Screen 027
- Permission nudge ("Choose it!" hint) at Screen 028

**Top patterns emerging:**
1. Data collection tied to immediate output (logging → prediction shown quickly)
2. Emoji-driven sentiment questions (casual, non-clinical tone)
3. Auto-fill + optional customization (smart defaults reduce friction)
4. Stats matched to specific behaviors (accuracy improves with history)
5. Prediction as milestone/reward before final permission request

---

## Screens 30–39

### Screen 030 — Discharge Education
- **Purpose:** Educational content (discharge tracking as fertility indicator).
- **Text inventory:** Cycle wheel illustration (discharge types labeled: Sticky, Creamy, Egg white, labeled "Fertile days"). "Decode your discharge" | "When you log your discharge, Flo will help you learn how it's connected to your cycle and know what to do if something's not right." | Pink "Next" button. Back arrow.
- **UI structure:** Illustration-first education. Cycle wheel with labeled discharge types (color-coded rings). Body text + CTA button.
- **Flow & logic:** Normalizes discharge tracking. Educational value prop (understanding > anxiety). Sets expectation for symptom logging that follows.

### Screen 031 — Cycle Analysis Results
- **Purpose:** Show computed cycle metrics + interpret as normal/irregular.
- **Text inventory:** Three rows: "Previous cycle length: 31 days" + green checkmark "NORMAL" | "Previous period length: 5 days" + green checkmark "NORMAL" | "Cycle length variation: 26–37 days" + yellow warning icon "IRREGULAR" | "NOTE: This is sample data" (gray). | Heading: "Get to know your cycle patterns and what's normal for you" | "83% of users say Flo taught them what is, and isn't, a normal cycle." | Pink "Next" button.
- **UI structure:** Data table showing 3 metrics, color-coded status (green checkmark = normal, yellow warning = irregular). Stat below. Gray disclaimer.
- **Flow & logic:** Translates logging data into insights. Normalizes "irregular" (most users are). 83% stat reinforces that understanding normality is valuable. Medical authority (pattern analysis).

### Screen 032 — Symptom Logging (Today)
- **Purpose:** Collect current symptoms; multi-select icon grid.
- **Text inventory:** Gray subtext: "Your cycle can impact how you feel." | "Jane, how do you feel today?" | "Select your symptoms" | Six symptom options (icons + labels): Cramps, Fatigue, Bloating, Tender breasts, Backache, None of these | Pink "Apply the symptoms" button. "Skip" link (top-right). Progress bar.
- **UI structure:** Light pink background. Six icon-driven symptom options (2x3 grid, pill-shaped buttons). "None of these" has a strikethrough icon. Pink CTA button below.
- **Flow & logic:** Multi-select symptom picker. Icons + casual language (non-medical). "None of these" exit hatch (optionality). Symptom data feeds future predictions (next screen).

### Screen 033 — Future Symptom Prediction
- **Purpose:** Show AI-predicted symptoms for tomorrow based on cycle.
- **Text inventory:** "How you might feel tomorrow" | Blurred/placeholder text: "Based on recent past experiences with the same cycle phase, Flo suggests..." | "Tomorrow's symptoms" + three emoji faces (placeholder, no text). | Heading: "Always be ready for what's coming" | "When you log your symptoms, Flo helps you spot patterns so you can plan life around how you may feel next week — or even next cycle." | Pink "Next" button.
- **UI structure:** Light background with blurred preview text (teases logic but doesn't fully expose). Three emoji-face icons (placeholder for predicted symptoms). Educational subtext.
- **Flow & logic:** AI-driven prediction (future symptoms based on patterns). Data = increasingly useful app. Frames prediction as planning tool ("plan life around").

### Screen 034 — Height Collection
- **Purpose:** Demographic collection for BMI/health context.
- **Text inventory:** "How tall are you?" | Input field showing "5 ft 6 in" (example). Multi-column picker visible below (feet, inches, cm). "Skip" link. Pink "Next" button.
- **UI structure:** Large input display. Scrollable picker below showing feet (3–7), inches (4–8), cm options. Minimal layout.
- **Flow & logic:** Optional height collection (skip available). Used for health context (BMI, medication guidance). Natural progression after weight.

### Screen 035 — Weight Collection
- **Purpose:** Demographic collection for health tracking context.
- **Text inventory:** "How much do you weigh?" | Input field showing "131.6 lb" (example). Multi-column picker below (129–133 lb, unit toggle to kg). "Skip" link. Pink "Next" button.
- **UI structure:** Large input display. Scrollable picker (numeric values + unit selector). Minimal layout.
- **Flow & logic:** Weight + height used for health insights (BMI, wellness recommendations). Both skippable, no pressure. Positioned late in flow (after cycle data).

### Screen 036 — Health Holism / Integration
- **Purpose:** Summarize cycle + health integration; show breadth of tracking.
- **Text inventory:** Illustration (Flo logo at center, surrounded by icons: heart, weight, scale, fire/energy, moon, feather/breathing, running, weight). "Your cycle and health data in one place" | Three checked benefits: "Optimize fitness around your cycle with step, weight, and activity tracking" | "See how your cycle impacts stress, sleep, energy, and more" | "Improve your work and sex life by understanding your body's needs" | Pink "Next" button. Back arrow.
- **UI structure:** Circular icon arrangement around central Flo logo (holistic framing). Three checked benefit statements (gray text).
- **Flow & logic:** Positioning Flo as health hub (not just period tracker). Integration metaphor (all data connected). Subtle premium hint (activity tracking, sleep insights).

### Screen 037 — Health Kit Permission (iOS System)
- **Purpose:** Request Health app permissions (detailed, granular).
- **Text inventory:** iOS modal. Header: "Health Access" | Buttons: "Don't Allow" (blue link, left) | "Allow" (blue link, right) | Icon: red heart. | "Health" | "Flo" would like to access and update your Health data." | "Turn Off All" link (blue). | Two sections: "ALLOW 'FLO' TO WRITE" + toggles (green, all enabled) for: Basal Body Temperature, Sleep, Water, Weight | Explanation: "App Explanation: Access to this data will enable the app to make more accurate cycle predictions." | "ALLOW 'FLO' TO READ" + toggles for: Active Energy, Basal Body Temperature.
- **UI structure:** iOS system sheet. Granular toggle switches for each data type (most enabled by default, teal toggles). "Turn Off All" quick-disable option. Explanatory text.
- **Flow & logic:** Granular permissions (not all-or-nothing). Pre-enabled defaults (friction reduction). Explanation tied to value (accuracy). User maintains control (Turn Off All, individual toggles).

### Screen 038 — Personalization Loading State
- **Purpose:** Processing/calculating personalized profile.
- **Text inventory:** Content cards teasing personalized features (illustrated): "What Counts as a Late Period?", "Discharge: What to Look Out For", "What to do after unprotected sex". | Heading: "Get daily personalised insights on your cycle" | Loading progress circle: "13%" | "Personalizing your experience..." (gray).
- **UI structure:** Light background. Three illustrated content card tiles (previewed). Centered large loading circle (percentage + text). Illustrative cards preview personalization value.
- **Flow & logic:** Processing moment (psychology of building profile). Teases content (personalization is visible). Progress indicator (13%) shows processing. Positions personalization as active, ongoing benefit.

### Screen 039 — Privacy/Certification (Loading State 2)
- **Purpose:** Final loading state; highlight security credentials.
- **Text inventory:** Large pink shield badge (Flo logo, gold ribbon): "ISO 27001 CERTIFIED" | Heading: "Know your data and privacy is our No.1 priority" | Loading progress circle: "100%" (filled, pink) | "Personalizing your experience..."
- **UI structure:** Full-screen white background. Large certification badge (pink + gold). Progress circle now full (100%, pink fill).
- **Flow & logic:** Security reassurance as final milestone. ISO 27001 (data protection cert) = trust signal. 100% fill creates sense of completion. Privacy repositioned as top priority (late placement = afterthought framing offset by language).

---

## Checkpoint 4 Summary (Screens 30–39)

**Flow shape:** Discharge education → cycle analysis (normal/irregular metrics) → symptom logging (today) → symptom prediction (tomorrow) → physical demographics (height, weight) → health holism summary → Health Kit permissions → personalization loading (13%) → privacy/security loading (100%).

**Data collected (30–39):** Discharge type (optional), today's symptoms (multi-select), height, weight (both optional), Health Kit permissions (write: BBT, sleep, water, weight; read: active energy, BBT).

**Persuasion mechanics:**
- Normalization of "irregular" cycles at Screen 031 (83% stat)
- AI-driven future prediction (symptom forecasting) at Screen 033
- Health integration framing (breadth + depth) at Screen 036
- Granular permissions (control + transparency) at Screen 037
- Certification badge (ISO 27001) + "100% complete" loading at Screen 039 (security trust)
- Teased personalization (illustrated cards, 13% loading) at Screen 038

**Top patterns emerging:**
1. Granular data collection (one metric per screen, multi-select for related items)
2. AI-driven predictions positioned as planning tools (symptom forecasting)
3. Loading states as psychological milestones (13% personalization, 100% privacy)
4. Certification badges + "No. 1 priority" language (security reassurance late in flow)
5. Health integration breadth (fitness, sleep, stress, sex life all equal priority)

---

## Screens 40–43 + 239

### Screen 040 — Before/After Value Comparison
- **Purpose:** Final value summary; contrast life without vs. with Flo.
- **Text inventory:** Heading: "When you Flo, you know" | Left column (gray, "Without Flo"): Minus icons + "Wondering when your period is coming" | "Not sure if your cycle symptoms are normal" | "Worried about late periods or pregnancy" | "Unsure how your cycle impacts your life" | Illustration (woman in blue, thoughtful pose). | Right column (pink, "With Flo"): Checkmarks + "Prepared for your period" | "Aware of what's normal for you" | "Mindful of how your chance of pregnancy changes through your cycle" | "Having great sex and sleeping better!" | Sparkle decorations. | Pink "Let's do this!" button.
- **UI structure:** Two-column comparison (left gray/neutral, right pink/positive). Illustrations of woman. Checklist styling (minus vs. checkmark). CTA button.
- **Flow & logic:** Last persuasion moment. Recaps all benefits (period prep, normality, pregnancy mindfulness, sex/sleep). Emotional contrast (uncertain → confident). Button text ("Let's do this!") is commitment language.

### Screen 041 — Commitment Moment (Text + Ritual)
- **Purpose:** User makes commitment; ritual gesture (tap-and-hold) to finalize.
- **Text inventory:** "I, Jane, will use Flo to improve my relationship with my period, know my body better and be ready for anything." | Large pink circle (Flo logo, leaf icon inside) with glow effect. | Smaller text: "Tap and hold on the Flo logo to commit."
- **UI structure:** Minimalist white background. Large pink circular logo (center). Commitment statement (first-person, using user's name). Instruction text (pink, below).
- **Flow & logic:** Personalized commitment statement (using name from Screen 005). Ritual interaction (tap-and-hold) = ceremonial finalization. Converts abstract benefits into personal vow.

### Screen 042 — Holding Animation (In-progress)
- **Purpose:** Visual feedback during tap-and-hold gesture.
- **Text inventory:** "I, Jane, will use Flo to..." (partially visible, fading). Large pink circle fills as user holds. Text: "Keep holding!"
- **UI structure:** Pink circle animates from outline to filled as finger holds. Text prompt encourages continued hold. Expanding concentric circles (visual feedback).
- **Flow & logic:** Real-time feedback (user is progressing). Gamification element (filling circle = commitment meter). Psychological commitment device (gesture + wait = deeper encoding).

### Screen 043 — Completion / Welcome
- **Purpose:** Onboarding complete; user enters app.
- **Text inventory:** Full-screen pink background. "Welcome to Flo!" | Centered Flo leaf logo (white). Full progress bar (complete).
- **UI structure:** Full-bleed brand color (pink). Centered logo. No buttons (transition to main app).
- **Flow & logic:** Celebration moment. Transition to home screen. Progress bar filled = all steps complete. Brand immersion (full pink screen).

### Screen 239 — Alternative Branch / Late Onboarding
- **Purpose:** Appears to be re-entry/refresh (name prompt; possibly multi-behavior path).
- **Text inventory:** Gray "Skip" link (top-right). "Let's get to know each other!" | "What would you like Flo to call you?" | Text input field (empty, placeholder visible). Pink "Continue" button.
- **UI structure:** Minimalist white background. Input field + CTA. Skip option.
- **Flow & logic:** Duplicate of Screen 005 (name entry). May be reachable via different branch (e.g., "No, I have a partner code" → separate onboarding path → rejoins main flow at name collection). Or: late entry point for users returning to complete profile.

---

## Synthesis — Full Onboarding Analysis (45 screens)

### Flow Map

```
[0] Splash
  ↓
[1–2] Intro + Credibility (OB-GYN authority)
  ↓
[3–5] Privacy Consent + Name Collection
  ↓
[8] BRANCH: Self vs. Partner
  ├─ Self branch (primary, screens 9–43)
  │  ├─ [9–10] Demographics (birth year, confirmed)
  │  ├─ [11] BRANCH: Pregnancy Status (TTC / Cycle / Pregnant)
  │  │  └─ TTC/Cycle branch (primary)
  │  │     ├─ [12–19] Motivation + Use Cases (multi-select, social proof)
  │  │     ├─ [20–27] Cycle Entry (prediction, logging, notification pitch)
  │  │     ├─ [28–29] Permissions (notifications)
  │  │     ├─ [30–36] Health Tracking (discharge, symptoms, demographics, Health Kit intro)
  │  │     ├─ [37–39] Permissions + Loading (Health Kit, personalization, privacy)
  │  │     ├─ [40–42] Commitment Ritual
  │  │     └─ [43] Welcome
  │  └─ [239] Name entry (possible re-entry)
  └─ Partner branch (unshown, likely diverges at Screen 8)
```

### Complete Data Collected

1. **Legal/Consent:** Privacy agreement, Terms of Use
2. **Identity:** Name, age/birth year
3. **Behavioral:** Self-use confirmation, pregnancy/TTC status
4. **Motivations:** Reason for tracking (multi-select, 5 options)
5. **Health Concerns:** Specific use cases (multi-select, 6 options: sex/cycle, masturbation, PCOS, discharge, mood, orgasm)
6. **Emotional:** Sentiment toward period (emoji-driven, 5 options)
7. **Cycle Data:** Last period start date, period duration (auto-filled), historical period dates (optional)
8. **Symptoms:** Today's symptoms (multi-select, 6 options), optionally forecasted tomorrow
9. **Biometric:** Height, weight (optional)
10. **Device Permissions:** Push notifications (OS-level), Health Kit (read/write permissions for 6+ data types)

### Persuasion & Engagement Mechanics

| Mechanic | Screens | Purpose |
|----------|---------|---------|
| **Social Proof** | 2, 12, 16, 22, 31 | OB-GYN endorsement, user count (2.2B cycles), ratings (3.5M 5-stars), user testimonials, accuracy stats (90%, 89%, 83%) |
| **Personalization** | 5–7, 14, 21, 33 | Name-based address, sentiment-matched benefits, AI predictions |
| **Medical Framing** | 2, 3, 30–31, 36–37 | Privacy/data security, cycle analysis, health integration, ISO certification |
| **Micro-commits** | 5, 8, 13, 18, 23–24, 41–42 | Progressive data entry, multi-select momentum, ritual gesture (tap-and-hold) |
| **Reduced Friction** | 6, 24, 28, 34–35 | Auto-fill, skip options, smart defaults, granular permissions (not all-or-nothing) |
| **Gamification** | 22–24, 38–42 | Progress bar, loading % (13%, 100%), calendar interaction, holding animation |
| **Value Proof** | 12, 15–17, 27, 31, 36, 40 | Feature previews, prediction output, cycle metrics, health integration demo |
| **Emotional Connection** | 1–2, 21, 27, 40–42 | Botanical stickers, emoji sentiment, commitment vow, celebration finish |
| **Trust/Security** | 3–4, 37, 39 | Privacy assertions, consent transparency, ISO 27001 badge |

### Top 5 Patterns Worth Stealing for grandma.app

1. **Progressive Profiling with Inline Confirmation** — Each data point (motivation, health concern, symptom) has inline confirmation messaging that explains Flo's specific promise tied to that choice. This creates immediate relevance without overwhelming the user. *Apply to grandma:* Show how each pillar/behavior selection will shape the user's personalized experience.

2. **Multi-Select Checkpoints as Segmentation Gates** — Rather than binary choices, Flo uses multi-select (motivations, use cases, symptoms) early and often. This yields granular segmentation data while reducing pressure (user feels heard across multiple dimensions). *Apply to grandma:* Offer multi-select health concerns or pillar affinities early (e.g., "What areas would help you most? Select 3+" for home card prioritization).

3. **AI-Driven Predictions as Motivation** — Flo positions symptom predictions, cycle forecasts, and normality assessments as immediate outputs of logging. This transforms data entry from a chore into a curiosity driver ("what will Flo predict for me?"). *Apply to grandma:* Position cycle insights, pregnancy milestones, and kid development leaps as predictions/surprises revealed through logging.

4. **Granular Permissions with Control Signals** — Instead of blanket "Allow/Don't Allow," Flo breaks Health Kit into read/write, per-data-type toggles with defaults enabled. Users feel in control while most opt-in. The explanation ("make more accurate cycle predictions") ties permission to value. *Apply to grandma:* Offer granular notification/reminder controls (by pillar, by time of day) with clear value justifications.

5. **Loading States as Psychological Milestones** — Flo uses two loading screens (13% personalization, 100% privacy/data) as transition moments. They're not rushed; they tease value (illustrated content previews, progress indicator) while reinforcing credibility (ISO badge). *Apply to grandma:* Use loading states after first log to show "Building your cycle profile" or "Personalizing your insights" rather than generic spinners; reinforce that data is being put to work.

---

## Flow Observations

- **Linear + branching:** Branching happens at Screen 8 (self vs. partner) and again at Screen 11 (pregnancy status). After that, flow is largely linear for the TTC/cycle branch shown here.
- **Data density:** ~15–20 distinct data points collected across 43 screens ≈ 1 data point per 2–3 screens. Few screens ask multiple unrelated questions; most bundle related items (e.g., symptoms multi-select together, permissions grouped by category).
- **Permissions late:** All system permissions (notifications, Health Kit) come at Screens 28, 37. By then, user has invested 20+ screens + commitment statements. High trust by the time permissioning is asked.
- **Commitment ritual unusual:** Screens 41–42 (tap-and-hold gesture) are uncommon in mobile onboarding. Creates memorable, tactile moment that may increase app return (habit formation).
- **Skips available but strategically placed:** "Skip" links appear at Screens 5, 13, 18, 32, 34–35, 239. Early skips (name, motivations) are low-friction. Later skips (height, weight) are optional. Few mandatory screens.



**Flow shape:** Linear branching at Screen 008 (self vs. partner). Screens 0–7 are intro/consent/personalization. Screens 8–9 begin demographic collection.

**Data collected (0–9):** Name, legal consents (2), self-use confirmation, birth year.

**Persuasion mechanics:** 
- Credibility (OB-GYN authority) at Screen 002
- Privacy ownership framing ("Your data") at Screen 003–004
- Personalization (direct address by name) at Screens 005–007
- Predictive algorithm justification (age improves predictions) at Screen 009

**Top patterns emerging:** 
1. Progressive profiling (one data point per screen, rarely two)
2. Consent bundling (privacy + T&Cs together, with "accept all" shortcut)
3. Personalization early (name by Screen 005, used by Screen 007)