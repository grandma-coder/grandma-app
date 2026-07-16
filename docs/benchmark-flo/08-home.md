# Flo App — Home & Today Screens (Checkpoint 1: Screens 056–065)

## Screen 056 — Loading State
- **Purpose:** Initial data sync, showing app is active and persisting user data
- **Text inventory:** "Saving your details..." (center loading message)
- **UI structure:** Large circular loading ring (gray stroke, minimal), soft background gradient (pink-blue-white fade), status indicator
- **Flow & logic:** Sync state before home displays; no user action required

## Screen 057 — Home Header + Today Summary + Quick Logging
- **Purpose:** Home landing with cycle countdown, fertile window insight, and CTA logging menu
- **Text inventory:** 
  - Header: "March 15" with day-of-week calendar strip (S-M-T-W-T-S layout)
  - Cycle headline: "Period in 14 days"
  - Insight: "High chance of getting pregnant"
  - CTA: "Log period"
  - Tooltip: "Log how you feel each day and spot connections with your cycle."
  - Quick log cards (partially visible): "Log your symptoms", "Symptoms to expect" (yellow), "Ovulation is Likely Over" (Health Assistant badge, pink)
  - Section: "In your mid-cycle"
  - Tab bar: Today (active), Insights, Secret Chats, Messages, Partner
- **UI structure:** 
  - Header: Avatar + date banner + calendar strip (7-day carousel, today circled, next day marked)
  - Cycle countdown card (teal gradient bg, large black number "14")
  - Log pill button (teal outline, centered)
  - Horizontal scrolling card carousel (sticker-style cards with icons + text)
  - Bottom nav: 5-tab bar with icons + labels
- **Flow & logic:** 
  - Day 14 of cycle = approaching fertile window
  - "High chance" triggers based on cycle math
  - Quick log menu surfaces symptom logging + predictive health alerts (Ovulation Likely, yellow badge)
  - Multiple entry points to log (pill button, card menu)
  - Cards highlight phase-specific guidance ("Symptoms to expect", "Ovulation is Likely Over")

## Screen 058 — Daily Insights Carousel (Bloating, Cramps, Symptoms)
- **Purpose:** Phase-specific symptom spotlights and personalized health tips
- **Text inventory:**
  - Section: "My daily insights · Today"
  - Card titles: "BLOATING" (pink badge), "CRAMPS" (pink badge), symptom card (yellow, partially visible)
  - Card descriptions: "Which foods should you avoid?" | "3 reasons for cramps" | (clipped)
  - Health phase label: "In your mid-cycle"
- **UI structure:**
  - Sticker emoji row at top (3 small face circles: happy, neutral, sad — mood tracking preview)
  - Horizontal scrolling cards (pink/white/yellow borders, icon + icon badge + CTA question text)
  - Each card is tappable detail sheet entry point
- **Flow & logic:**
  - Daily insights refresh based on cycle phase
  - Personalized symptom cards surface common patterns (e.g., "Which foods should you avoid?" during bloating phase)
  - Icon badges (pink circles with symbols) make cards scannable
  - Scroll reveals more phase-specific insights

## Screen 059 — Daily Insights Expanded (CRAMPS, Symptoms, Yeast, Calm)
- **Purpose:** Additional phase-specific insights (symptom progression, health conditions, wellness)
- **Text inventory:**
  - Card titles: "CRAMPS" (pink), "Symptoms to expect" (yellow, with orange ? icon), "Ovulation is Likely Over" (pink Health Assistant badge), "CALM" (orange, partially visible)
  - All cards contain icons + question marks or CTA text
- **UI structure:**
  - Same carousel as 058, scrolled further right
  - Yellow card with large orange ? icon signals "learn more" pattern
  - Color-coded phases: pink (period-related), yellow (mid-cycle education), blue (health)
- **Flow & logic:**
  - Carousel scrolls infinitely; cards can be tapped to expand into detail sheets
  - Orange badges signal "Health Assistant" premium content or AI-powered insights
  - Multiple symptom cards show Flo clusters same-day symptoms (not sequential)

## Screen 060 — Daily Insights: Health Conditions (PMS, Pregnancy Paranoia, Yeast)
- **Purpose:** Normalized health condition spotlights with icon storytelling
- **Text inventory:**
  - Card titles: "PMS or pregnancy?" | "Coping with pregnancy paranoia" | "Yeast infections every month"
  - Card note: "Normal or Not?" (blue card)
  - All cards are illustrated with simplified graphics
- **UI structure:**
  - Illustrative cards (rich illustrations: chocolate+fries, thermometer, yeast microscope)
  - Borders: pink/purple/blue based on phase/topic
  - Each card is a detail sheet entry
- **Flow & logic:**
  - "PMS or pregnancy?" normalizes confusion during luteal/late cycle
  - "Coping with pregnancy paranoia" = symptom anxiety reframing (common during fertile window)
  - Health cards introduce educational content alongside tracking

## Screen 061 — Content Section: "In your mid-cycle" + Rich Article Cards
- **Purpose:** Curated health & wellness content feed personalized by cycle phase
- **Text inventory:**
  - Section: "In your mid-cycle"
  - Search bar: "Search articles, videos and more"
  - Featured article: "Orgasms and pleasure"
    - Subtopics: "Master masturbation" | "Spice up partner sex" | "Multiple orgasms made easy"
    - CTA: "Turn up the heat" (white button on brown card)
  - Article cards below:
    - "Why you don't need special cleaning prod..." (6 min read)
    - "Does the pullout method really work?" (7 min read)
    - Clipped: "6 e... co..." (4 r[ead])
  - Footer: "See more"
- **UI structure:**
  - Rich hero card (brown/rust bg, photo of couple, white text overlay + white button)
  - Grid of 3 article cards (preview images, black title text, read time)
  - Illustrative hero card to draw engagement
  - Clean grid layout for article discovery
- **Flow & logic:**
  - Phase-specific content: "Orgasms and pleasure" peaks during fertile window (high libido)
  - Rich illustrations on hero cards drive engagement (not abstract icons)
  - Read-time badges set expectations
  - "See more" pagination for endless article feed

## Screen 062 — Symptom Checker (PCOS Self-Assessment)
- **Purpose:** AI-powered / expert health assessment tool (premium gating visible)
- **Text inventory:**
  - Title: "Symptom Checker"
  - CTA: "See all >"
  - Alert: "Up to 70% of people with polycystic ovary syndrome (PCOS) don't know for sure that they have it"
  - Description: "Hormonal imbalances can sometimes point to reproductive health conditions like PCOS. Check which symptoms need your attention in 5 minutes, not 2 years — the time it can take to get a diagnosis."
  - Tool name: "PCOS self-assessment"
  - Duration: "Typically 5 min"
  - CTA: "Check your symptoms" (bright pink button)
  - Disclaimer: "NOTE: Flo is not a diagnostic tool"
  - Section: "My cycles"
  - Stat: "Previous cycle length: 29 days" with green checkmark + "NORMAL"
- **UI structure:**
  - Symptom Checker card with warning icon (orange triangle)
  - PCOS tool card (light tan/beige bg, icon, time estimate)
  - Section below: cycle stats row (29 days, NORMAL indicator)
- **Flow & logic:**
  - Premium/educational tool (5-min assessment vs. years of confusion narrative)
  - Expert content (medical disclaimer included)
  - Personalization: tool appears when cycle data suggests investigation needed
  - Single-tool showcase (not carousel) for high-intent content

## Screen 063 — Cycle Stats (Previous Length, Period Length, Health Assistant)
- **Purpose:** Cycle analytics summary + personalized health insights
- **Text inventory:**
  - Stats: "Previous cycle length: 29 days" [NORMAL checkmark] | "Previous period length: 8 days" [ABNORMAL warning icon]
  - Health Assistant message: "jane, your personal report is here (updated every cycle)! Check it out and get in tune with your body ✅"
  - CTA: "See in detail" (bright pink button)
  - Disclaimer: "NOTE: Flo is not a diagnostic tool"
  - Section: "Cycle history"
  - Timeline: "Current cycle: 15 days, Started Mar 1"
  - Visual: Cycle timeline as colored dot row (red=period, pink=fertile, blue=ovulation)
  - Previous: "29 days, Feb 1 – Feb 29"
- **UI structure:**
  - Stat rows (label + value + badge/indicator)
  - Health Assistant card (pink bg, pink circular icon, text)
  - Button centered
  - Timeline section with colored dot visualization + date range
- **Flow & logic:**
  - Abnormal flags surface (8-day period = potential concern)
  - Health Assistant = personalized AI summary (premium feature)
  - Cycle comparison: current vs. previous cycles
  - 15 days into current = approaching ovulation window

## Screen 064 — Cycle History + Symptom Pattern: Bloating
- **Purpose:** Historical cycle visualization + pattern detection (symptom occurrence across cycles)
- **Text inventory:**
  - Section: "Cycle history"
  - Current cycle: "15 days, Started Mar 1" | Dot timeline (colored)
  - Previous: "29 days, Feb 1 – Feb 29" | Dot timeline
  - CTA: "+ Log previous cycles"
  - Section: "My symptom patterns"
  - CTA: "See all"
  - Pattern card: "Bloating" (with purple symptom icon)
  - Pattern insight: "You logged bloating during your fertile window, just like 24% of Flo users. Log more symptoms to see your patterns and medical comments."
  - Timeline comparison (2 cycles shown):
    - "Mar 1, Current" with dot timeline (ovulation marker = pink circle with magenta dot)
    - "Feb 1, 29 days" with dot timeline
  - Legend: pink=Period, light blue=Fertile days, dark blue=Ovulation
- **UI structure:**
  - Cycle timeline cards (date label, count, dot strip)
  - Symptom pattern card (symptom icon + title + insight text + comparative legend)
  - Legend (inline color key)
  - Dots show phase progression (visual habit-forming)
- **Flow & logic:**
  - Symptom patterns surface when user logs during specific phase
  - Comparative stats ("24% of Flo users") normalize and contextualize
  - Timeline visualization makes cycle length visual
  - Pattern insights are one-off cards (not full list initially)

## Screen 065 — Symptom Pattern: Cramps (with Doctor Comment CTA)
- **Purpose:** Detailed symptom pattern with expert contextual guidance
- **Text inventory:**
  - Previous cycle shown: "29 days, Feb 1 – Feb 29" with dot timeline
  - "+ Log previous cycles" CTA
  - Section: "My symptom patterns"
  - Pattern card: "Cramps" (with brown symptom icon)
  - Pattern insight: "You logged cramps during your fertile window, just like 23% of Flo users. Log more symptoms to see your patterns and medical comments."
  - Timeline comparison (2 cycles):
    - "Mar 1, Current" with dot timeline (ovulation marker = brown icon)
    - "Feb 1, 29 days" with dot timeline
  - Legend: Period (pink), Fertile days (light blue), Ovulation (dark blue)
  - CTA: "See doctor's comment" (light gray button)
  - Pagination: "2 of 3" (shows 3 symptom patterns total)
- **UI structure:**
  - Same layout as 064 but for different symptom (cramps)
  - Doctor comment button = premium/expert feature
  - Pagination indicates multiple symptoms in carousel
- **Flow & logic:**
  - Pattern cards auto-scroll with pagination (like a carousel of patterns)
  - Doctor comments = premium feature (expert medical contextualization)
  - Symptom icons color-match phase (brown = ovulation-related cramps)
  - Comparative stat with other users drives engagement ("23% of Flo users")

---

## Checkpoint 1 Summary

**Screens 056–065 show:**
- **Home landing anatomy:** Calendar strip + cycle countdown + phase-specific quick log cards → Today Summary → Insights carousel → Content feed (articles, tools, health assessments) → Analytics (cycle stats, symptom patterns)
- **Cycle state shown:** Day 14 of ~29-day cycle = approaching fertile window (high fertility likelihood)
- **Daily engagement mechanics:**
  - Symptom logging tied to phase (different questions each day)
  - Phase-specific article carousel ("In your mid-cycle" content clusters)
  - Personalized health alerts (PCOS checker, ovulation insight)
  - Daily insights that highlight 4–5 relevant symptoms/education per phase
- **Premium gating:** Health Assistant badges, Symptom Checker tools, doctor comments (expert layer above base tracking)
- **Personalization:** Comparative stats ("24% of Flo users"), normalized language ("PMS or pregnancy?"), pattern detection across multiple cycles

**Ready for Checkpoint 2 (Screens 066–075).**

---

# Checkpoint 2: Screens 066–072

## Screen 066 — Symptom Pattern Carousel Pagination (3 of 3: Tracking CTA)
- **Purpose:** End of symptom pattern carousel + upsell to deeper tracking
- **Text inventory:**
  - Section: "My symptom patterns"
  - Illustration: Woman with clipboard pointing at symptom timeline grid
  - Headline: "Track your symptoms to:"
  - Benefits (pink checkmarks):
    - "Map them across several cycles."
    - "Spot if there's a pattern."
    - "Get info from health experts."
  - CTA: "+ Log symptoms" (pink button)
  - Pagination: "3 of 3"
- **UI structure:**
  - Illustrative card (woman figure, symptom grid visualization with question marks)
  - Benefit checklist (checkmarks + text)
  - Call-to-action button with plus icon
  - Carousel pagination shows this is final card
- **Flow & logic:**
  - Symptom patterns carousel (3 cards) ends with educational pitch
  - Encourages logging to unlock pattern detection
  - Visual metaphor (symptom grid) teaches what patterns look like

## Screen 067 — Period Phase Home (Day 1, Future Window, Low Fertility)
- **Purpose:** Home screen repositioned for period phase (day 1 of next cycle)
- **Text inventory:**
  - Header: "March" (date stripped) | Calendar: S-M-TODAY-W-T-F-S (March 17–23)
  - Cycle headline: "Period in 11 days"
  - Insight: "Low chances of getting pregnant"
  - CTA: "Log period" (pink pill button)
  - Insights section: "My daily insights · Today"
  - Card titles (visible): "Log your symptoms" | "BACKACHE" (pink badge) | "Symptoms to expect" (purple, with happy emoji) | clipped card
  - Section: "Later in your cycle"
- **UI structure:**
  - Calendar strip (same 7-day carousel, TODAY marked)
  - Cycle countdown card (white bg on pink gradient, large "11 days" number)
  - Quick log menu carousel (same as 057 but different phase-specific cards)
  - Section header changes to "Later in your cycle" (not "In your mid-cycle")
- **Flow & logic:**
  - Shown later in cycle (day 17–23 window) when period is 11 days away
  - Low fertility = different messaging ("Low chances" vs. "High chance")
  - "Later in your cycle" signals luteal/PMS phase approaching
  - Cards reflect period/luteal content (BACKACHE, general wellness)

## Screen 068 — Multi-Month Calendar Picker (Log Period Dialog)
- **Purpose:** Modal calendar for user to select/edit period dates across multiple months
- **Text inventory:**
  - Header: Day-of-week strip (S-M-T-W-T-F-S)
  - March: Full calendar grid with:
    - Checked dates (red circles, 1–8)
    - Current date (9, gray circle)
    - Empty dates (gray circles, 10–16)
    - Future/predicted dates (pink circles with checkmarks, 20–23)
    - Dashed predicted dots (24–30)
  - April: Partial grid (1–13 visible)
  - Footer: "Cancel" (pink text, left) | "Save" (pink text, right)
- **UI structure:**
  - Full-screen modal with minimal chrome
  - Calendar grid (interactive, dates are tappable circles)
  - Color coding: red=logged, gray=empty/future, pink checkmark=predicted/logged
  - Two buttons bottom center (text-only, no pill styling)
- **Flow & logic:**
  - User can tap dates to mark/unmark period logs
  - Multi-month view allows retroactive logging (important for catch-up)
  - Predictions (dashed dots) show cycle algorithm's forecast
  - Save commits changes and returns to home

## Screen 069 — Prediction Update Loading (Fertile Window Recomputed)
- **Purpose:** Real-time prediction recalculation after period data edit
- **Text inventory:**
  - Header: Calendar strip (March 17–23, today marked as 19)
  - Fertile window indicator: 20–23 shown as dotted circles (predictions)
  - Loading message: "Updating predictions..." (white text on large pink circle)
  - Small accent circles on circle perimeter (loader animation)
  - Insights section (grayed out, faint): "My daily insights · Today"
  - Card placeholders (skeleton state)
- **UI structure:**
  - Full-screen loading overlay (large pink circle with white text + orbiting accent dots)
  - Calendar header unchanged (user data just updated)
  - Content below dimmed/skeleton
- **Flow & logic:**
  - When user logs period, system recalculates fertile window & predictions
  - Loading state shows transparent system work (builds trust)
  - No blocking modal—user can see impact on calendar

## Screen 070 — Prediction Update Complete (Fertile Window Confirmed)
- **Purpose:** Confirmation that predictions are now accurate with fertile window highlighted
- **Text inventory:**
  - Header: Calendar (March 17–23, today=19)
  - Fertile window dates: 20–23 now with red/pink checkmarks (confirmed/logged)
  - Status message: "Predictions updated!" (white checkmark + white text on pink circle)
  - Insights section: "My daily insights · Today"
  - Card titles: "Log your symptoms" | "BACKACHE" (pink, "4 things that may help") | "Foods May Relieve Period Pain" (brown, with illustration)
  - Section: "During your period"
- **UI structure:**
  - Cycle countdown card (large pink circle, centered, success state)
  - Checkmark icon signals completion
  - Updated calendar shows fertile window as red dotted circles (20–23)
  - Insights carousel refreshed with period-specific content
- **Flow & logic:**
  - Success confirmation shows updated cycle data
  - Card content changes based on new phase ("During your period" not "In your mid-cycle")
  - Predictions update cycle math across home immediately

## Screen 071 — Period Phase Content (Day 1 Detail)
- **Purpose:** Detailed messaging for period day 1 with phase-specific content
- **Text inventory:**
  - Header: Calendar (March 17–23, today=19)
  - Cycle card (large pink circle):
    - Phase label: "Period:"
    - Big number: "Day 1"
    - Teaser: "What's important today? Learn more >" (right arrow)
    - CTA: "Edit period dates" (white pill button)
  - Insights section: "My daily insights · Today"
  - Card titles: "Log your symptoms" | "BACKACHE" (pink, "4 things that may help") | "Foods May Relieve Period Pain" (brown)
  - Section: "During your period"
- **UI structure:**
  - Same layout as 070, but cycle card shows expanded detail
  - "Day 1" is prominently sized
  - "Learn more" link suggests expandable content
  - Period-specific articles in insights carousel
- **Flow & logic:**
  - Period day 1 is special (often heaviest flow day)
  - Content pivots to period-specific self-care ("What's important today?")
  - Edit button allows correction if period dates were estimated
  - Phase section label reinforces where user is in cycle

## Screen 072 — Mid-Cycle Home (Different Date, High Fertility)
- **Purpose:** Home screen repositioned for mid-cycle phase (day 18, 13 days to period)
- **Text inventory:**
  - Header: "March 18" | Calendar: S-TODAY-T-W-T-F-S (March 17–23)
  - Cycle headline: "Period in 13 days"
  - Insight: "High chance of getting pregnant"
  - CTA: "Log period" (teal pill button, matching phase color)
  - Insights section: "My daily insights · Today"
  - Card titles: "Log your symptoms" | "Symptoms to expect" (teal, heart icon) | "Does the pullout method work?" (blue, sperm illustration) | clipped card
  - Section: "In your mid-cycle"
- **UI structure:**
  - Calendar strip repositioned (today now=18)
  - Cycle countdown card (teal gradient, same layout as 057)
  - Quick log carousel with different phase-specific cards
  - Section header: "In your mid-cycle" (signals fertile phase content)
  - Pill button color matches phase (teal, not pink)
- **Flow & logic:**
  - Day 18 of ~31-day cycle = fertile window (high probability)
  - 13 days to period = predictive countdown
  - Content shifts to fertility/sexuality ("Pullout method", "Symptoms to expect")
  - UI color (teal) reinforces phase (not period phase's pink)

---

## Checkpoint 2 Summary

**Screens 066–072 show:**
- **Cycle phase switching:** Home layout is stable, but phase label + card content + CTA button color adapts to cycle phase
- **Three phases demonstrated:** 
  1. Late cycle (approaching period): "Low chances of getting pregnant", "Later in your cycle" content
  2. Period (day 1): "Period: Day 1", "What's important today?", "During your period" section
  3. Mid-cycle (day 18, high fertility): "High chance of getting pregnant", "In your mid-cycle" content, teal phase color
- **Prediction engine:** Calendar picker allows multi-month period logging → system recalculates fertile window → predictions update immediately on home (seen via loading state 069 → confirmation 070)
- **Dynamic content:** Card carousel changes with phase (same slot, different cards). Phase-specific articles surface per cycle stage.
- **Phase colors:** Pink=period, teal=fertile/mid-cycle (color-coded UI adaptation)

**Ready for Checkpoint 3 (Screens 086–089, 187–188, 276, 307–309).**

---

# Checkpoint 3: Screens 086–089, 187–188, 276, 307–309

## Screen 086 — Prediction Update Loading (Teal Phase)
- **Purpose:** Prediction recalculation for mid-cycle phase (shows phase-color-coded loading)
- **Text inventory:**
  - Header: "March 18" | Calendar: TODAY marked as 18
  - Status: "Updating predictions..." (white text on large teal circle)
  - Loading animation: Spinning star icon + orbiting accent circles
  - Insights section (dimmed): "My daily insights · Today"
  - Card placeholders (faded)
- **UI structure:**
  - Phase-specific loading circle (teal, matches fertile window phase)
  - Same orbiting animation as pink loading (066)
  - Content below skeleton state
- **Flow & logic:**
  - Same prediction update flow as screen 069, but color-coded teal
  - System recalculates predictions after period log edit
  - Phase color in loader reinforces context

## Screen 087 — Prediction Update Complete (Teal, New Content)
- **Purpose:** Confirmation with updated fertile window and phase-specific insights
- **Text inventory:**
  - Header: "March 18" | Calendar: 17–23, today=18
  - Status: "Predictions updated!" (white checkmark + text on teal circle)
  - Insights: "My daily insights · Today"
  - Card titles: "Log your symptoms" | "BACKACHE" (pink, "3 common causes") | "Symptoms to expect" (teal, heart icon) | clipped card
  - Section: "In your mid-cycle"
- **UI structure:**
  - Success circle with checkmark (teal)
  - Updated insights carousel reflects fertile phase content
  - Phase section label ("In your mid-cycle") matches new phase
- **Flow & logic:**
  - Predictions recalculated after period edit
  - Cards now show mid-cycle content (not late-cycle)
  - Teal color scheme confirms phase shift

## Screen 088 — Mid-Cycle Home (High Fertility Teaser)
- **Purpose:** Home with expanded fertility messaging and phase-phase transition
- **Text inventory:**
  - Header: "March 18" | Calendar: 17–23, today=18
  - Cycle countdown: "Period in 13 days"
  - Fertility insight: "Your fertility is high today. Learn more >" (with right arrow)
  - CTA: "Log period" (teal pill button)
  - Insights: "My daily insights · Today"
  - Cards: "Log your symptoms" | "BACKACHE" | "Symptoms to expect" | clipped
  - Section: "In your mid-cycle"
- **UI structure:**
  - Cycle card message changes from forecast to real-time ("Your fertility is high today")
  - "Learn more" link = tappable expansion
  - All UI teal-coded (fertile window phase)
- **Flow & logic:**
  - Day 18 of cycle = high fertility confirmed by data
  - "Your fertility is high **today**" (not "chances of getting pregnant")
  - "Learn more" teases expandable content (e.g., fertility tips)

## Screen 089 — Today Panel (Detailed Logging Modal)
- **Purpose:** Full-screen daily logging summary with editable trackers
- **Text inventory:**
  - Header: "Today, Cycle day 18" (center) with left/right arrows (date navigator)
  - Search: "Search" (search bar)
  - Tracker groups:
    - **Water:** "16 / 72 fl. oz." (progress counter + dec/inc buttons)
    - **Settings link:** "Reminders and Settings" (right arrow)
    - **Weight:** "131.3 lbs." (with trash icon + edit pencil)
    - **View chart** link (right arrow)
    - **Basal temperature:** "97.52 °F" (with trash icon + edit pencil)
    - **View chart** link (right arrow)
    - **Notes:** (icon + editable)
- **UI structure:**
  - Full-screen sheet (minimal header with navigator arrows)
  - Tracker rows (icon + title + big number + action buttons)
  - Edit/delete icons per tracker (trash + pencil pattern)
  - "View chart" links surface analytics for multi-day metrics
- **Flow & logic:**
  - Accessed from "Today" tab in home nav bar
  - Consolidates all daily logging in one view (not card carousel)
  - Users can edit, delete, or add data for any metric
  - Chart links pivot to analytics (data visualization)

## Screen 187 — Home Repeated (Fertile Phase Variant)
- **Purpose:** Duplicate screen showing consistency across sessions
- **Text inventory:** (Same as 057)
  - Cycle: "Period in 14 days"
  - Insight: "High chance of getting pregnant"
  - Cards: BLOATING, CRAMPS, yellow card (clipped)
  - Section: "In your mid-cycle"
- **UI structure:** (Identical to 057 — same teal phase, same card layout)
- **Flow & logic:**
  - Repeated observation confirms home screen is stable across user sessions
  - Same fertile window phase = same content, same colors

## Screen 188 — Health Assistant Modal (Cramps Contextual Help)
- **Purpose:** AI-powered contextual guidance overlay triggered by logged symptom
- **Text inventory:**
  - Header: "Flo Health Assistant" (banner title)
  - Close button: "X" (gray circle, top right)
  - Character illustration: Smiling face with red notification dot
  - Symptom trigger: "You logged cramps"
  - AI message: "Let's get to the bottom of your cramps. Tell me, how painful are they? 👆" (with pointing finger emoji)
  - Actions: "I can cope" (pink button) | "Intense" (pink button)
- **UI structure:**
  - Modal card (white bg, rounded corners)
  - Character avatar (illustrative face icon)
  - Chat-like message format (AI-generated tone)
  - Two-option quick-response buttons
- **Flow & logic:**
  - Triggered when user logs cramps symptom
  - AI (Flo Health Assistant) asks follow-up for severity assessment
  - Buttons lead to further contextual guidance (pain management strategies)
  - Personalizes experience via symptom detection

## Screen 276 — Dark Theme Variant (Same Home Content)
- **Purpose:** Dark mode equivalent of home screen (shows design system robustness)
- **Text inventory:** (Same as 057)
  - Cycle: "Period in 14 days"
  - Insight: "High chance of getting pregnant"
  - Cards: BLOATING, CRAMPS, clipped yellow card
  - Section: "In your mid-cycle"
- **UI structure:**
  - Same layout, inverted colors (dark background, light text)
  - Teal cycle card on dark bg (still readable)
  - Cards use dark-adapted colors
- **Flow & logic:**
  - Dark theme available for low-light use
  - Same content, phase-aware, fully functional
  - Demonstrates CSS/theme system scalability

## Screen 307 — Health Tracking Data Display (Weight + Steps)
- **Purpose:** Home with logged health metrics displayed (weight + step count visible)
- **Text inventory:**
  - Header: "March" with notification badge (red "1") on bell icon
  - Calendar: 10–16 with today=15
  - Cycle: "Period in 14 days" | "High chance of getting pregnant"
  - Health metrics (below cycle card): "131.6 lbs." (weight icon) | "49 steps" (footstep icon)
  - Insights: "My daily insights · Today"
  - Cards: BLOATING, CRAMPS, "Keg" (clipped)
  - Section: "In your mid-cycle"
- **UI structure:**
  - Cycle card larger than usual (more visual prominence)
  - Health metrics displayed as icon + number badges below cycle card
  - Notification badge on bell icon (unread push/reminder alert)
  - Insights carousel unchanged
- **Flow & logic:**
  - User has logged weight (131.6 lbs) and step count (49) today
  - These metrics appear as quick-glance stats near cycle card
  - Notification badge suggests health reminders or alerts active
  - Health tracking integrated into home summary

## Screen 308 — Prediction Update Complete (with Tracked Metrics)
- **Purpose:** Success state after logging, showing updated predictions + health metrics persisted
- **Text inventory:**
  - Header: "March" with notification badge
  - Calendar: 10–16, today=15
  - Status: "Predictions updated!" (checkmark on teal circle)
  - Health metrics: "131.6 lbs." | "49 steps"
  - Insights: "My daily insights · Today"
  - Cards: BLOATING, CRAMPS, clipped
  - Section: "In your mid-cycle"
- **UI structure:**
  - Large teal circle (success state) overlays cycle card area
  - Health metrics visible below (not obscured by loading)
  - Same insights carousel as 307
- **Flow & logic:**
  - After editing period/predictions, health data (weight, steps) persists
  - Successful update confirmed via large checkmark circle
  - User sees all their logged data intact post-update

## Screen 309 — Prediction Complete (Finalized Cycle Card)
- **Purpose:** Final state after prediction update, showing clean cycle card with settled forecast
- **Text inventory:**
  - Header: "March" with notification badge
  - Calendar: 10–16, today=15
  - Cycle card:
    - Label: "Period in"
    - Big number: "14 days"
    - Subtitle: "Chances of getting pregnant" (no qualitative adjective, just metric)
  - Health metrics: "131.6 lbs." | "49 steps"
  - Insights: "My daily insights · Today"
  - Cards: BLOATING, CRAMPS, clipped
  - Section: "In your mid-cycle"
- **UI structure:**
  - Large teal cycle card (settled, final state)
  - Health metrics below (persisted from 307–308)
  - Insights carousel unchanged
- **Flow & logic:**
  - After loading + confirmation, cycle countdown is stable
  - No loading state, no animation—final settled state
  - User can now interact with cards, log symptoms, or navigate to other tabs

---

## Checkpoint 3 Summary

**Screens 086–089:**
- Teal-colored prediction loading/confirmation cycle (matches fertile phase)
- Detailed "Today" logging panel shows full daily trackers (water, weight, temp, notes)
- Health Assistant modal demonstrates contextual AI guidance (symptom-triggered)

**Screens 187–188:**
- 187: Repeated home screen (validates consistency)
- 188: Chat-style modal for cramps severity assessment (onboarding for symptom context)

**Screens 276, 307–309:**
- 276: Dark theme equivalent (design system robustness)
- 307–309: Health metrics (weight + steps) integrated into home summary, shown across prediction update cycle (load → confirm → settle)

**Key patterns:**
- **Phase coloring:** Teal for fertile window, pink for period/late cycle
- **Health metrics on home:** Weight + steps appear as summary badges
- **Loading → Confirmation → Settlement:** Three-state UX for data updates
- **Contextual AI:** Health Assistant triggered by symptom logging with chat-like interaction
- **Dark theme:** Full design system parity

---

## Final Synthesis: Flo Home & Today UX

**Home Screen Anatomy (stable across all 27 screens):**
1. Header: Date + calendar strip (7-day carousel, today marked)
2. Cycle countdown card (large, phase-colored circle, predictive headline + insight text + CTA button)
3. Health metrics (optional: weight + step badges when logged)
4. "My daily insights · Today" carousel (4–5 phase-specific cards with icons, questions, articles)
5. Phase section ("In your mid-cycle", "During your period", "Later in your cycle")
6. Search bar for articles/content
7. Tab bar (Today, Insights, Secret Chats, Messages, Partner)

**Cycle States Covered:**
- Pre-period (11–14 days away, low fertility): Late-cycle content, "Low chances" messaging, period-prep cards
- Period (Day 1): "Period: Day 1" detail, "During your period" section, pain relief articles
- Fertile window (13–14 days to period): "High chance of getting pregnant", "Your fertility is high today" teaser, fertility content
- Mid-cycle (day 18): High fertility confirmed, sexuality/wellness content

**Daily Engagement Mechanics:**
- **Phase-based content refresh:** Same 5 card slots, different questions/articles per phase
- **Predictive AI:** System recalculates fertile window after period logging (visible loading → confirmation)
- **Health tracking integration:** Weight, steps, temperature logged from Today panel; summary badges on home
- **Contextual Health Assistant:** Modal pops after symptom logging (e.g., cramps → severity question)
- **Multi-cycle patterns:** Symptom patterns detected across 2–3 cycles, surface as insights

**Premium Gating:**
- Health Assistant badges (AI-powered contextual advice)
- Doctor comments (expert medical notes)
- Advanced charts (multi-cycle visualizations)
- Symptom Checker tools (PCOS assessment, 5-min AI evaluation)

**Top UX Wins vs. grandma.app:**
1. **Unified phase color system:** Teal (fertile), pink (period) extends across entire UI—super scannable
2. **Large predictive headline:** Big "14 days" number + "High chance" makes fertility status glanceable
3. **Daily insights carousel:** 4–5 phase-specific cards on home avoid sub-navigation—discovery inline
4. **Multi-tracker Today panel:** One modal with water, weight, temp, notes—not scattered across tabs
5. **Health Assistant modal:** Symptom-triggered AI guidance (not generic education)—highly contextual
6. **Prediction update UX:** Loading → Confirmation → Settlement shows system work transparently
7. **Card icon badges:** Symbol + color badges (pink circles for period, icons for symptoms) = instant visual comprehension
8. **Dark theme parity:** Full design system flexibility across light/dark without compromises