# Flo Health Report & Cycle Analysis — Screens 261–271

## Overview
Flo's Health Report system provides exportable, doctor-friendly cycle analytics accessible from the main analysis hub. The feature includes both automated PDF generation and deep-dive interactive analysis views for 4 distinct analysis categories.

---

## Screen #261 — Pregnancy Week Content (Context only)
- **Purpose:** Weekly educational content about pregnancy milestone/development
- **Text inventory:** "Your baby is ready to be born" (heading), 42-week readiness explanation, vernix caseosa and lanugo protective layers, postterm birth skin notes, References section
- **UI structure:** Long-form article text with collapsible References dropdown, save bookmark icon
- **Flow & logic:** Contextual education tied to pregnancy week; powered by Mobbin content curation

---

## Screen #262 — Report Preview (PDF Intro)
- **Purpose:** PDF export preview modal showing Health Report document cover page
- **Text inventory:** "Report preview" (modal title), "HEALTH REPORT" (red title/logo), "made by Flo", www.flo.health, "COVERAGE: February 1, 2024 - March 28, 2024", "EXPORTED: March 15, 2024", "The cycle report made by Flo is based on at least the last 6 cycles you logged in the app. To get more accurate cycle predictions and more reliable Health Insights, please log more information about your health condition.", "Cycle and period length" (section), "AVERAGE CYCLE LENGTH: 28 days", "AVERAGE PERIOD LENGTH: 7 days", "CURRENT CYCLE: Mar 1 - Mar 28" (visual timeline with phase indicators in teal), "Feb 1 - Feb 29" (previous cycle), "Page 1" (page indicator)
- **UI structure:** PDF document preview with two-page spread; header with logo + Flo branding, cycle data tables, visual cycle timelines (period phase in red/coral, cycle phase in teal gradient)
- **Flow & logic:** Parameterized by coverage dates and exported date; pulls last 6 logged cycles; shows current + 1 previous cycle for comparison

---

## Screen #263 — Report Preview (Page 2 – Symptom Patterns)
- **Purpose:** PDF page 2 showing "Your average cycle with commonly logged events" and top symptom distribution
- **Text inventory:** "HEALTH REPORT" (header), "made by Flo", www.flo.health, "Your average cycle with commonly logged events", disclaimer text, "The number of times the event was logged on a specific day during the last 6 cycles", "TOP 5 MOST LOGGED SYMPTOMS", "MOOD", visual cycle timeline at bottom
- **UI structure:** Cycle visualization with symptom dot plot overlaid (purple dots for Cramps, Bloating; orange dots for Mood) positioned on cycle days; symptom intensity shown as dot density
- **Flow & logic:** Aggregates symptom frequency across last 6 cycles; displays symptom timing pattern relative to cycle phase

---

## Screen #264 — PDF Share Sheet
- **Purpose:** Native iOS share menu triggered by "Send or print" button
- **Text inventory:** PDF document name "flo_cycles_report", file size "558 KB", sharing options: AirDrop, Messages, Mail, Notes, and additional apps via scroll
- **UI structure:** iOS native share sheet overlay; actions below (Copy, Markup, Print, New Quick Note, Add Tags)
- **Flow & logic:** Converts PDF preview into shareable asset; native OS routing to email, messaging, cloud storage, or print

---

## Screen #265 — Analysis Hub (Navigation Menu)
- **Purpose:** Top-level menu for selecting what cycle data to analyze
- **Text inventory:** "What would you like to analyze?" (heading), menu options: "Cycle length" (with cycle icon), "Period length & intensity" (drop icon), "Patterns of your body" (dots icon), "Graphs of events" (line graph icon), "Report for a doctor" (button in teal)
- **UI structure:** Vertical menu with icon + label per option; "Report for a doctor" isolated below as call-to-action
- **Flow & logic:** Hub screen; routes to 4 interactive analysis views or triggers PDF generation for medical export

---

## Screen #266 — Analysis: Cycle Length
- **Purpose:** Interactive view of cycle length metrics and trends
- **Text inventory:** "Cycle length" (header), "Your average cycle length: 29 days" (metric), "AVERAGE" (label), "CURRENT CYCLE: Mar 1 - Mar 28" (label), "15 days" (current progress), "Feb 1 - Feb 29" (previous cycle), "29 days" (previous cycle length), "Add previous periods" (cyan link)
- **UI structure:** Metric card showing average; horizontal progress bars for current and previous cycles with duration labels; coral/red bar for period, teal bar for follicular/luteal phase
- **Flow & logic:** Displays 2 cycles for comparison; progress bar shows how far along current cycle is; affordance to add historical data for longer-term pattern detection

---

## Screen #267 — Analysis: Period Length & Intensity
- **Purpose:** Period duration and bleeding intensity comparison across cycles
- **Text inventory:** "Period length & intensity" (header), "Your average period length: 8 days" (metric), "Mar 1 - Mar 7" (current), "7 days" (duration), "Feb 1 - Feb 8" (previous), "8 days" (duration), "Add previous periods" (cyan link)
- **UI structure:** Dual bars per cycle showing period length; first bar 100% full (heavy bleeding), second bar with gap in middle and separate marker dot (heavy + light bleeding pattern within same period); color gradient indicates intensity
- **Flow & logic:** Visually distinguishes continuous bleeding from broken/spotting patterns; adds richness beyond simple duration metric

---

## Screen #268 — Analysis: Patterns of Your Body (Symptom Summary)
- **Purpose:** Quick card showing most common symptom and its cycle timing
- **Text inventory:** "Patterns of your body" (header), "You regularly logged Headache on day 3 of your cycle." (insight), cycle timeline with headache symptom dots overlaid, "See all cycles" (link)
- **UI structure:** Large card with text insight + cycle visualization; symptom indicated by large purple dot and smaller surrounding dots; faded cycle phase bar
- **Flow & logic:** AI-summarized pattern from logging history; single most common symptom highlighted; tappable to drill into full symptom history across all cycles

---

## Screen #269 — Analysis: Patterns of Your Body (Symptom Timeline)
- **Purpose:** Detailed multi-cycle view of symptom occurrence and timing patterns
- **Text inventory:** "Patterns of your body" (header), "You regularly logged headache on day 1-5 of your cycle." (refined insight), "PATTERN" (label), cycle date ranges (Current: Mar 1 - Mar 30, Feb 1 - Feb 29, Jan 1 - Jan 31, Dec 1-31 2023, Nov 1-30 2023), cycle timelines with headache dots per cycle
- **UI structure:** Stacked cycle view (5 cycles visible); each row is a cycle with date range label, phase bar (red period, teal cycle), symptom dot pattern overlaid; left margin shows symptom histogram for days 1-5 as purple-tinted background
- **Flow & logic:** Aggregates symptom occurrence across 5+ cycles; highlights frequency via left margin histogram; enables pattern confidence assessment

---

## Screen #270 — Settings: Cycle & Ovulation (Part 1)
- **Purpose:** Configuration for cycle prediction algorithm and ovulation display settings
- **Text inventory:** "Cycle and ovulation" (header), "Cycle length" with "Select" (control), "Period length" with "Select" (control), "The app makes predictions based on the cycle and period length settings. However, if you regularly log your period in the app, predictions will be based on the logged data.", "Chances of getting pregnant" (toggle, enabled in teal), "If you turn off this parameter, only the ovulation day will be displayed.", "Luteal phase" with "Select" (control), "The luteal phase is the time between ovulation and the beginning of your period. If you know the length of your luteal phase, log it for more accurate ovulation predictions.", "Display cycle sequence" (toggle, disabled)
- **UI structure:** Settings rows with select dropdowns and toggle switches; explanatory gray text below each control; toggle states shown (on = teal, off = gray)
- **Flow & logic:** Allows customization of prediction inputs; explains when predictions are data-driven vs. model-based; toggles for ovulation probability display

---

## Screen #271 — Settings: Cycle & Ovulation (Part 2)
- **Purpose:** Display of cycle sequence numbers on calendar with example visualization
- **Text inventory:** Same as #270 plus "The cycle sequence (day 1, 2, 3, etc.) will be displayed right above the calendar dates." (explanation), cycle day pills (3, 4, 5 in coral/red, 6-7 in dotted outline, 8-9 in teal outline) numbered 1-11, with header numbers and legend colors
- **UI structure:** Continuation of settings below toggle; shows calendar preview with numbered cycle day pills overlaid on dates
- **Flow & logic:** Visual preview of what cycle sequence labels look like when enabled; helps user understand the feature before enabling

---

## Synthesis

### Health Report Architecture
Flo's Health Report combines **two parallel systems**: (1) **Exportable PDF** — parameterized multi-page document covering cycle/period metrics, symptom patterns, and cycle timeline, generated on-demand with coverage date range + exported date; (2) **Interactive Analysis Hub** — four deep-dive views (cycle length, period intensity, symptom patterns, graphs of events) accessible before or after PDF generation. The PDF pulls last 6 cycles minimum for pattern reliability. Both are doctor-friendly: dated, sourced, data-driven.

### Data Visualization Approach
- **Cycle timelines** use color-coded bars: **red/coral for period (menstrual phase), teal for cycle phase (follicular + ovulatory + luteal)**. Period length shown as bar fill; cycle position as progress indicator.
- **Symptom patterns** use **dot plots overlaid on cycle timelines**, with dot density/color indicating frequency. Left-margin **histogram** in Analysis view aggregates symptom frequency across days 1-5 (or selected window).
- **Metric cards** display **averages + single-cycle comparison** for quick assessment and trend detection.

### Export/Sharing Mechanics
PDF export is **native iOS share sheet**—supports email, Messages, Notes, AirDrop, or print. File size ~550KB. Parameterization includes coverage date range, export date, and last 6 cycles. "Report for a doctor" button positioned as primary CTA in Analysis hub, signaling medical framing.

### Insights Generation
Patterns detected via **aggregation across minimum 6 cycles**. Example: "You regularly logged headache on day 1-5 of your cycle" — derived from frequency histogram across cycles. Symptom clustering and timing inference. Toggles for ovulation probability display customize what insights surface.

### Top Patterns for grandma.app
1. **Parameterized, medical-framed exports** — pregnancy/kids analytics should be 2-page PDFs with coverage dates, export dates, doctor disclaimers
2. **Color-coded phase bars** (period red, follicular/luteal teal) — instantly communicate cycle state vs. calendar date
3. **Multi-cycle comparison view** — stack 3-5 cycles side-by-side to show patterns; left-margin histogram for frequency. Powerful for symptom/mood trends.
4. **Dot overlays on timelines** — symptom/event density shown as dot plots on phase bars; scales better than line graphs for categorical events
5. **Interactive PDF preview before send** — native share sheet + preview modal builds user confidence in data accuracy before export
6. **Settings control + visual preview** — cycle customization (length, luteal phase) + example visualization prevents user confusion
