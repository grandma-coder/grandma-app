# Flo Logging & Tracking Taxonomy — Screens 073–085 (First 13)

## Screen #073 — Today Summary (Mood Quick-Pick)
- **Purpose:** Quick mood emoji selection at top of daily log summary screen.
- **Text inventory:** "Today", "Cycle day 18", "Search", "What are you feeling today?", "Categories", "Edit"
- **Mood emoji options:** Creamy, Calm, Cravings, Fatigue
- **UI structure:** Horizontal scrolling mood emoji grid (4 visible); expandable Categories section below with "Edit" toggle
- **Flow & logic:** Quick mood entry on landing; feeds sentiment tracking; categorized logging below

## Screen #074 — Mood Applied (Selection State)
- **Purpose:** Shows "Calm" emoji selected with checkmark; "Apply" button activates logging.
- **Text inventory:** Same as 073, plus "Apply" button
- **UI structure:** Selected mood gets orange ring + white checkmark overlay; pink Apply CTA appears
- **Flow & logic:** Selection confirmation before batch-apply entire day's logs

## Screen #075 — Symptoms & Discharge Categories
- **Purpose:** Browse symptom and vaginal discharge logging options.
- **Text inventory:** "Symptoms" section: "Everything is fine", "Tender breasts", "Acne", "Fatigue", "Insomnia", "Cramps", "Headache", "Backache", "Cravings", "Abdominal pain", "Vaginal itching", "Vaginal dryness"
- **Vaginal discharge options:** "No discharge", "Creamy", "Watery", "Sticky", "Egg white", "Spotting", "Gray"
- **UI structure:** Two grouped sections (Symptoms + Vaginal Discharge); pink pill-shaped chips with icon + label; one chip (Backache) has ring + checkmark showing selected state
- **Flow & logic:** Multi-select chip grid; one-tap logging; symptoms feed fertility insights; discharge is ovulation predictor

## Screen #076 — Activity & Pill Logging
- **Purpose:** Log exercise, oral contraceptive (OC) adherence, water, and non-OC pills.
- **Text inventory:** "Gym", "Aerobics & dancing", "Swimming", "Team sports", "Running", "Cycling", "Walking"
- **OC section:** "Oral contraceptives (OC)", "Taken on time" (selected/blue ring), "Yesterday's pill", "Set up reminders"
- **Other pills:** "Other pills (non-OC)", "Log other pills you take a day", "Add pill" (+ button), "Set up reminders"
- **Water section:** "Water" (blue cup icon), increment/decrement buttons, "72 fl. oz." unit display
- **UI structure:** Green activity chips; blue OC pill with ring toggle; water counter with ± buttons; expandable reminder sections
- **Flow & logic:** Activity feeds burn/stress metrics; OC adherence tracks missed pills (risk); water counter increments daily

## Screen #077 — Water Counter & Weight/Basal Temperature Entry Points
- **Purpose:** Shows water intake (8/72 fl oz) and reveals Weight + Basal Temperature entry placeholders.
- **Text inventory:** "Water", "8 / 72 fl. oz.", "Reminders and Settings", "Weight", "Log your weight", "View chart", "Basal temperature", "Log your temperature", "Apply"
- **UI structure:** Water counter at top (± buttons); Weight card (icon, value, delete/edit icons); Basal temperature card below; "View chart" links; "Apply" CTA
- **Flow & logic:** Counter state persists; entry cards show placeholder text prompting data input; chart access inline

## Screen #078 — Weight Entry Modal (Picker)
- **Purpose:** Numeric spinner for weight entry (130–134 lbs visible, selected 132).
- **Text inventory:** "Log your weight", values "130", "131", "132", "133", "134", units "lbs.", "kg", "Done"
- **UI structure:** Vertical scrolling numeric picker with unit toggle (lbs/kg); pink Done button
- **Flow & logic:** Standard iOS-style picker UX; dual-unit support; confirms with Done

## Screen #079 — Today Summary Post-Apply (All Logs Captured)
- **Purpose:** Dashboard showing all entered logs after Apply: water (16/72 fl oz), weight (131.3 lbs), basal temp (97.52°F), notes placeholder.
- **Text inventory:** Same as 077, plus notes entry: "Add notes, any extra symptoms, or how you've been feeling."
- **UI structure:** Cards stacked vertically; each log card has delete (trash) and edit (pencil) icons; "View chart" links expand; notes placeholder at bottom
- **Flow & logic:** Read-after-write confirmation; all data visible at a glance; edit/delete per log; notes capture free text

## Screen #080 — Basal Temperature Entry Modal (Picker)
- **Purpose:** Numeric spinner for basal temperature (35–42 °C/°F visible, selected 36°C / 40°F).
- **Text inventory:** "Log basal temperature", "35", "36", "37", "38", "39", "40", "41", "42", "°C", "°F", "Done"
- **UI structure:** Dual-column numeric picker with Celsius/Fahrenheit toggle
- **Flow & logic:** Dual-unit picker; precise ovulation tracking; confirms with Done

## Screen #081 — Today Summary with Logged Notes
- **Purpose:** Final state: all logs displayed including freeform notes ("a little bit bloated").
- **Text inventory:** Same as 079; notes show: "a little bit bloated"
- **UI structure:** Same card layout; notes now show user text instead of placeholder
- **Flow & logic:** Notes saved inline; entire log captured for daily reference

## Screen #082 — Today Summary (Detailed View, Ready for Apply)
- **Purpose:** Consolidated view of all log fields before final save.
- **Text inventory:** All previous texts; Note placeholder: "Add notes, any extra symptoms, or how you've been feeling."
- **UI structure:** Weight, basal temp, notes cards visible; edit/delete icons ready; Apply button prominent
- **Flow & logic:** Pre-submit review; final data validation before save

## Screen #083 — Notes Entry Modal (Text Input)
- **Purpose:** Full-screen text editor for freeform notes with keyboard.
- **Text inventory:** "My notes", "Add notes, any extra symptoms, or how you've been feeling.", "Clear" (top right), "Done" (pink CTA), keyboard with emoji picker
- **UI structure:** Large text area; placeholder hint; iOS keyboard with standard layout; emoji/mic buttons
- **Flow & logic:** Free-text capture; placeholder helps users understand what to log; emoji support for quick entry

## Screen #084 — Notes Modal with Text (In-Progress)
- **Purpose:** Notes editor showing user input "a little bit bloated" mid-edit.
- **Text inventory:** Same as 083; user text: "a little bit bloated"
- **UI structure:** Text visible in editor; keyboard still visible for editing
- **Flow & logic:** Real-time input capture; can clear or continue editing

## Screen #085 — Today Summary with All Data Saved
- **Purpose:** Final rendered state of daily log: mood (implied from context), sex drive, symptoms, activities, water, weight, basal temp, and notes all captured.
- **Text inventory:** "Today", "Cycle day 18", "Reminders and Settings", "Weight 131.3 lbs", "View chart", "Basal temperature 97.52 °F", "View chart", "Notes a little bit bloated", "Apply"
- **UI structure:** Stacked cards with icons (weight, basal temp, notes); each card has edit/delete; prominent Apply CTA
- **Flow & logic:** Master log view; single Apply batches all data to Supabase; Apply finalizes the day's entry

---

## Screen #090 — Water Intake Settings (Modal)
- **Purpose:** Configure daily water intake goal + reminder settings.
- **Text inventory:** "Water intake settings", "Save", "Normal water intake", "72 fl. oz.", "An average person drinks about 64 fl. oz. of water a day.", "Container volume", "8 fl. oz.", "REMINDERS", "Drink water", "Off"
- **UI structure:** Section headers; editable value fields (72 fl oz, 8 fl oz); toggle switch (Off); "Save" CTA
- **Flow & logic:** Settings persist across sessions; personalized daily goal; container size auto-calculates reminder frequency

## Screen #091 — Drink Water Reminder (Toggle OFF)
- **Purpose:** Reminder toggle switch in OFF state.
- **Text inventory:** "Drink water", toggle label
- **UI structure:** Large toggle switch, OFF position (gray)
- **Flow & logic:** Reminders can be disabled per log type

## Screen #092 — Drink Water Reminder (Toggle ON, Picker Visible)
- **Purpose:** When toggled ON, reveals time range and interval picker.
- **Text inventory:** "Drink water", "Start time", "9:00 AM", "End time", "6:00 PM", "Interval", "3 h", "Reminders to drink water will be shown within the chosen interval.", "Text", "It's time to drink water and log the..."
- **UI structure:** Toggle ON (teal); time pickers (start/end); interval selector; descriptive text; text customization row
- **Flow & logic:** Nested reveal UX; interval-based reminders within time window; custom notification text

## Screen #093 — End Time Picker (Time Spinner)
- **Purpose:** Time picker modal for reminder end time (shows 6–9 with 7:00 PM selected).
- **Text inventory:** "5", "6", "7", "8", "9", "58", "59", "00", "01", "02", "AM", "PM"
- **UI structure:** Standard iOS-style multi-column time picker (hours, minutes, period)
- **Flow & logic:** Dual-column numeric + period picker; confirms selection via implicit tap

## Screen #094 — Reminder Configuration Saved
- **Purpose:** Returns to settings after time selection with "3 h" interval confirmed and reminder state ON.
- **Text inventory:** Same as 092
- **UI structure:** Time pickers dismissed; interval now shows "3 h"
- **Flow & logic:** Modal closes on selection; data persists to parent view

## Screen #095 — Water Intake Settings Saved (Reminder ON)
- **Purpose:** Final state of settings modal showing reminder enabled for 9:00 AM – 7:00 PM.
- **Text inventory:** "Water intake settings", "Save", "Normal water intake", "72 fl. oz.", "Container volume", "8 fl. oz.", "REMINDERS", "Drink water", "On", "9:00 AM - 7:00 PM"
- **UI structure:** Same as 090, but reminder now shows "On" + time range
- **Flow & logic:** Settings ready to save; clear confirmation of reminder schedule

## Screen #096 — Weight Trend Chart (Daily Log)
- **Purpose:** Monthly weight chart (February–March) with logged entry (131.3 lbs on March 18) and target line.
- **Text inventory:** "March 18", "FEBRUARY", "MARCH", "Target", dates "25", "27", "29", "2", "4"... "18", "20"; y-axis: "171", "149", "127", "105", "83", "61", "39", "17"
- **UI structure:** Line chart with gridlines, month labels, target dotted line, current weight highlighted in blue box (131.3), date range picker at bottom
- **Flow & logic:** Visual weight trend over time; target baseline; date navigation; integrated into log summary

## Screen #097 — BBT and Ovulation Chart (Cycle Visualization)
- **Purpose:** Basal body temperature chart for Feb 29 – Mar 29 cycle showing ovulation detection.
- **Text inventory:** "BBT and ovulation", "Chosen cycle", "Feb 29 — Mar 29", "MARCH", y-axis "99", "98.6", "98.2", "97.8", "97.4", "97", "96.6", "96.2"; x-axis dates; bottom legend: "Disch.", "Sex", "Ovul.", "Pregn."
- **UI structure:** Line chart with twin peaks (ovulation spike); date range selector; overlay legend for cycle events; teal highlighted date
- **Flow & logic:** Ovulation detection via temperature drop + rise; links to cycle predictions; discharge/sex/pregnancy data overlay

---

## Summary (Checkpoint 2: Screens 14–23 of 32 [090–097])

### New Patterns in Settings & Charts
- **Time/Interval Configuration** — Modal pickers for start/end times + interval selection; reminder text customization
- **Persistent Settings** — Daily hydration goals, container size, reminder windows stored per user
- **Inline Chart Drilldowns** — "View chart" links open modal charts with date range navigation
- **Cycle Event Overlay** — BBT chart shows discharge/sex/ovulation/pregnancy events as legend items

### Reminder Architecture
- Toggle on/off per log type (water, pills, etc.)
- Time window constraints (start–end, with interval)
- Custom notification text per reminder type
- Settings persist across sessions

---

## Screen #113 — Calendar Month View with Daily Insights (Mar 3 expanded)
- **Purpose:** Monthly calendar showing logged days (pink circles) with cycle context and daily insights drilldown.
- **Text inventory:** "Month", "Year", "March", cycle days "1"–"30", "TODAY", "Edit period dates", "Mar 3 • Cycle day 3", "Symptoms and activities", "My daily insights", "Symptoms to expect", "Cycle day", "Chance of getting pregnant"
- **UI structure:** Month/Year toggle; calendar grid with logged dates marked (pink circles); selected day card below shows logged icons (period, mood, activity) + insight cards (pink/purple/yellow with text/icons)
- **Flow & logic:** Logged day indicators; insights auto-generated per cycle phase; tap to expand daily log details; "Edit period dates" to correct cycle dates

## Screen #114 — Daily Log for Cycle Day 3 (Period + Sex + Symptoms)
- **Purpose:** Full daily log entry with menstrual flow category, sex/sex drive options, and partial symptoms visible.
- **Text inventory:** "Mar 03, Sun", "Cycle day 3", "Search", "Categories", "Edit", "Menstrual flow" (Light, Medium, Heavy, Blood clots), "Sex and sex drive" options (all 10), "Mood" (cut off at bottom)
- **UI structure:** Day header with navigation arrows; Categories section with Edit toggle; chip grids for each category (pink/salmon colors); one (Medium) has ring + checkmark
- **Flow & logic:** Same chip-select UX as screen 073; scrollable categories; multi-select within section

## Screen #115 — Edit Categories Modal (Initial State)
- **Purpose:** Category management interface showing suggested categories toggle and category list.
- **Text inventory:** "Edit categories", "Add, remove and rearrange categories yourself, or let your app personalize things based on your cycle phases and logged symptoms.", "Suggested categories" (toggle, ON), list: "Sex and sex drive", "Mood", "Symptoms", "Vaginal discharge", "Digestion and stool", "Pregnancy test", "Ovulation test", "Other", "Physical activity", "Oral contraceptives (OC)", "Other pills (non-OC)", "Water"
- **UI structure:** Section header with descriptive text; toggle switch; vertically scrolling list of category names
- **Flow & logic:** Suggested categories auto-populate; users can toggle AI suggestions on/off; manual add/remove via menu

## Screen #116 — Edit Categories (Scroll to Full List)
- **Purpose:** Complete category list visible after scrolling (shows additional categories: Weight, Basal temperature, Notes).
- **Text inventory:** Same as 115, plus "Weight", "Basal temperature", "Notes"
- **UI structure:** Continued scrollable list
- **Flow & logic:** Full taxonomy revealed; shows 15+ loggable categories

## Screen #117 — Edit Categories (Remove Mode Enabled)
- **Purpose:** Categories now show red minus icons and drag handles; toggle is OFF (suggested categories disabled).
- **Text inventory:** Same as 115; toggle now OFF
- **UI structure:** Red minus circle on each category; three-line drag handles (≡) on right; white card background for each row
- **Flow & logic:** Remove/reorder mode activated; minus deletes category from log form; drag to reorder in daily log

## Screen #118 — Category Reorder in Progress
- **Purpose:** "Sex and sex drive" category is highlighted (elevated) during drag.
- **Text inventory:** Same category list
- **UI structure:** One row (Sex and sex drive) has white background with shadow, indicating active drag state
- **Flow & logic:** Drag-to-reorder UX; visual feedback on active drag target

## Screen #119 — Category Reordering (Full View)
- **Purpose:** Another view of reorder state showing different category highlighted.
- **Text inventory:** Same list
- **UI structure:** Same as 118 with visual drag-state feedback
- **Flow & logic:** Reorder persists across log sessions

## Screen #120 — Delete Confirmation (Red Delete Button Visible)
- **Purpose:** When category is swiped or long-pressed, a red "Delete" button appears.
- **Text inventory:** "Delete" button (red) on "Pregnancy test" category
- **UI structure:** Category row reveals red delete button on right
- **Flow & logic:** Delete confirmation pattern; single tap to remove category from app

## Screen #121 — Category List After Deletion (Pregnancy Test Removed)
- **Purpose:** Pregnancy test category is no longer in the list.
- **Text inventory:** All previous categories except "Pregnancy test"
- **UI structure:** Category removed from list; weight now visible at bottom
- **Flow & logic:** Categories dynamically update; removed categories won't appear in daily log forms

## Screen #122 — Mood Category Expanded (Full Mood Options)
- **Purpose:** Shows menstrual flow + extended mood emoji grid (16+ mood states).
- **Text inventory:** "Mar 03, Sun", "Cycle day 3", "Menstrual flow" (Light, Medium, Heavy, Blood clots), "Mood", emoji moods: "Calm", "Happy", "Energetic", "Frisky", "Mood swings", "Irritated", "Sad", "Anxious", "Depressed", "Feeling guilty", "Obsessive thoughts", "Low energy", "Apathetic", "Confused", "Very self-critical"
- **UI structure:** Mood chip grid (16+) in orange emoji faces with labels; all unselected; "Calm" has ring + checkmark in one view (not shown in 122)
- **Flow & logic:** Expanded mood taxonomy vs. 4-option quick-pick at top of screen; users can drill down for nuance

## Screen #123 — Daily Log Scrolled to Sex + Symptoms (Next Day)
- **Purpose:** Cycle day 4 log showing sex/sex drive options (all 10+) and symptoms visible (Headache selected with ring + checkmark).
- **Text inventory:** "Mar 03, Sun", "Cycle day 4", "Sex and sex drive" (all options), "Symptoms" (Everything is fine, Cramps, Tender breasts, Headache [selected], Acne, Backache, Fatigue, Cravings, Insomnia, Abdominal pain visible)
- **UI structure:** Same chip layout; Headache has ring + checkmark selection state
- **Flow & logic:** Multi-select symptom logging; selection persists across scrolls; chips stacked vertically in groups

---

## FULL SYNTHESIS — All 32 Screens (Screens 073–085, 090–097, 113–123)

### Complete Loggable Categories
1. **Mood** (16+ emoji states) — Calm, Happy, Energetic, Frisky, Mood swings, Irritated, Sad, Anxious, Depressed, Feeling guilty, Obsessive thoughts, Low energy, Apathetic, Confused, Very self-critical + 4 initial quick-pick (Creamy, Calm, Cravings, Fatigue)
2. **Menstrual Flow** — Light, Medium, Heavy, Blood clots
3. **Sex & Sex Drive** (10 options) — Didn't have sex, Protected sex, Unprotected sex, Oral sex, Anal sex, Masturbation, Sensual touch, Sex toys, Orgasm, High/Neutral/Low sex drive
4. **Symptoms** (12+) — Everything is fine, Cramps, Tender breasts, Headache, Backache, Acne, Fatigue, Insomnia, Cravings, Abdominal pain, Vaginal itching, Vaginal dryness
5. **Vaginal Discharge** (7 types) — No discharge, Creamy, Watery, Sticky, Egg white, Spotting, Gray
6. **Digestion & Stool** — (suggested category, no specific options shown)
7. **Pregnancy Test** — (suggested category)
8. **Ovulation Test** — (suggested category)
9. **Other** — (custom text entries)
10. **Physical Activity** (7 types) — Gym, Aerobics & dancing, Swimming, Team sports, Running, Cycling, Walking
11. **Oral Contraceptives (OC)** — Taken on time, Yesterday's pill
12. **Other Pills (non-OC)** — User-added pill names
13. **Water** — Incremental counter (unit: fl oz); daily goal (72 fl oz); container size (8 fl oz); reminder window (9 AM–7 PM, 3-hour interval)
14. **Weight** — Numeric entry (lbs/kg); chart visualization
15. **Basal Temperature** — Numeric entry (°C/°F); chart visualization; ovulation detection
16. **Notes** — Freeform text ("Add notes, any extra symptoms, or how you've been feeling")

### Top 3 UX Patterns (Ranked by Impact)
1. **Chip-Grid Multi-Select** — Pink/salmon pill-shaped chips with icons + labels. One-tap selection; selected state = ring + checkmark overlay. Large 56–72px touch targets. Groups (Sex, Symptoms, Mood) stack vertically or scroll horizontally. Scales from 4 (quick-pick) to 16+ (full mood list).

2. **Batch Apply Pattern** — Single pink "Apply" button collects entire day's logs (mood, menstrual flow, sex, symptoms, discharge, water, weight, basal temp, notes, pills, OC adherence). Users fill modals → return to main form → tap Apply once. Confirms all data simultaneously.

3. **Modal Picker + Nested Reveal** — Time/weight/temperature pickers use iOS-style vertical spinners. Reminder config: toggle OFF → toggle ON reveals time pickers + interval. Weight picker: dual-unit toggle (lbs ↔ kg). All pickers dismiss on selection or explicit Done button.

### Settings & Persistence
- **Reminder Configuration** — Per-log-type toggle (on/off). Time window (start–end). Interval (e.g., 3 hours). Custom text ("It's time to drink water..."). Settings stored across sessions.
- **Daily Goal & Container Size** — Water: 72 fl oz daily goal; 8 fl oz container (auto-calculates reminder frequency). User-configurable.
- **Category Customization** — Add/remove/reorder categories. "Suggested categories" toggle enables AI-driven suggestions (cycle-phase-based). Removed categories hide from daily log form.

### Chart & Insight Integration
- **Inline Chart Drilldowns** — "View chart" links open full-screen modal charts. Weight: line chart (Feb–Mar), target baseline, current value highlighted. BBT: temperature line with ovulation spike detection, overlay legend (Discharge, Sex, Ovulation, Pregnancy events).
- **Daily Insights** — Cycle-day-based cards auto-generated. "Symptoms to expect", "Cycle day [N]", "Chance of getting pregnant [High/Low]". Shown on calendar + daily log detail card.
- **Calendar Integration** — Month view with logged-day indicators (pink circles). Tap date → daily summary card with icons + insights. Forward/back navigation.

### Engagement & Gamification
- **Streak Indicator** — Logged days marked on calendar (implied via pink circles).
- **Quick-Pick Fast Path** — Mood emoji quick-pick at top (4 options) vs. full mood grid (16+) for deeper expression.
- **Progress Visualization** — Weight trend chart, BBT pattern detection (ovulation), cycle phase predictions.

### Top Gaps vs. Grandma.app
1. **No mood emoji variants** — Grandma has character blobs; Flo has flat emoji. Grandma's diffuse mode uses Character fills.
2. **No discharge/sex logging** — Pregnancy mode doesn't track these (designed for post-conception). Pre-preg cycle mode in Grandma could integrate Flo's discharge + sex logging.
3. **Limited biometric options** — Flo tracks water, weight, basal temp. Grandma's pregnancy mode needs: nutrition, sleep, exercise, vitamins, medication (kegel, contractions). Kids mode: feeding, diaper, growth metrics.
4. **Batch Apply vs. Per-Field Save** — Flo batches all logs into one Apply. Grandma could adopt this pattern for faster entry vs. individual sheet saves.
5. **No activity/exercise logging** — Flo logs 7 exercise types. Grandma's pregnancy + kids modes lack this (hidden vs. not valued in early design).
6. **Calendar integration is secondary** — Flo's calendar is first-class (month view, drill-down). Grandma's calendar is primarily in Agenda tab, not home.

### Biggest Wins to Steal
1. **Chip-based multi-select at scale** — Use sticker icons (not emoji) for symptom/activity/mood logging. One-tap, ring+checkmark confirmation.
2. **Dual-unit numeric pickers** — Weight (lbs/kg), temperature (°C/°F), water (fl oz/ml). Improves global usability.
3. **Time-windowed reminders** — Grandma's pill reminders (OC adherence) + water could use Flo's start–end–interval model vs. flat daily toggle.
4. **Category customization** — Users should hide/reorder logs they don't need. Reduces cognitive load on home screen.
5. **Batch Apply** — Replace per-sheet saves with single daily Apply button. Faster, clearer UX for daily log review.
6. **Chart overlay legends** — Pregnancy mode: show sex + symptoms on weight/mood charts to reveal correlations (e.g., weight spike post-ovulation, mood shift post-symptom).

### Logging Complexity Score (Flo)
- **Free tier**: mood, menstrual flow, symptoms, discharge, notes
- **Premium**: all 16 categories + unlimited charts + insights
- **Grandma target** (by mode):
  - **Pre-Preg**: cycle day, menstrual flow, symptoms, discharge, sex, basal temp, notes (similar scope to Flo free)
  - **Pregnancy**: symptoms, mood, weight, biometrics, appointments, notes, pills/vitamins (simpler; no sex tracking)
  - **Kids**: food/feeding, sleep, mood, growth, vaccines, medicines, notes (different domain; no cycle data)