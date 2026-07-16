# Flo Calendar — Visual Benchmark

## Screen 105 — Month View + Day Detail

**Purpose:** Display monthly calendar with period tracking and fertility indicators; tap day to reveal daily insights and logged symptoms.

**Text inventory:**
- Month/Year navigation: "March" (centered header)
- Cycle phase numbers: 1–7 (bright pink circled dates = period days)
- Fertility indicator: 8–9 (teal numbers = non-fertile)
- "TODAY" label (above current date 15, with gray fill + dotted outline)
- CTA button: "Edit period dates" (hot-pink pill button)
- Day detail header: "Mar 15 • Cycle day 15"
- Subheading: "Chances of getting pregnant"
- Symptom icons: weight (scale), steps, emoji (smiley), balloon, ovulation, "+" (add more)
- Insight card row: "BLOATING", "CRAMPS", "Keeping sperm inside your cervix" (teal bg, educational copy)

**UI structure:**
- Top: X close + Month/Year toggle pill buttons + "Today" link (top-right)
- Calendar grid: 7-column (S–S) with date numbers
- Date states: 1–7 hot-pink circles (period); 8–9 teal numbers (low fertility); 10+ gray (not logged); 14 dotted circle outline (current day before "Today" is tapped); 15 gray fill (current day / "Today")
- Tap day → bottom sheet slides up with detailed insights
- Symptom icon bar: grayscale for metrics (weight, steps), emoji for mood, stickers/symbols for tracked items, bright teal "+" button to add more
- Insight cards: 4-column horizontal scroll (some cut off), each with symptom icon + copy + educational context

**Flow & logic:**
- Calendar shows fixed-width number grid; weeks don't align to calendar rows — all dates visible at once
- Period days colored hot-pink with sequential numbers (day 1, 2, 3, etc. of current cycle)
- Non-period cycle days shown as plain text (no coloring unless logged / predicted fertile)
- "Today" highlighted with gray fill + dotted outline; tapping "Today" or a date reveals that day's detail sheet
- Fertility inference: teal color codes non-fertile window; hot-pink = period; prediction color TBD (not visible in this screen)
- Symptom logging inline: icons represent weight, steps, mood, ovulation, nutrition; tapping opens add/edit sheet
- Insights section: horizontal-scroll card row, each addressing one symptom with educational content + icon

---

## Screen 106 — Edit Period Dates (Multi-Month Scroll)

**Purpose:** Edit historical period dates across 2+ months in a single sheet; confirm logged period days with checkmarks.

**Text inventory:**
- Month labels: "February", "March", "April"
- Date numbers: 1–31 (per month)
- Checkmarks: displayed on 7 dates in February (1–5 checkmark-circled, hot-pink), 1–7 in March (hot-pink checkmark circles), 8–9 non-circled (gray), remaining dates (gray outline circles = not logged)
- Bottom actions: "Cancel" (left), "Save" (right, hot-pink text)

**UI structure:**
- Full-screen sheet overlaying calendar
- Months stacked vertically; scroll to navigate backward in time
- Each month is a 7-column grid with week-start Sunday
- Date states: hot-pink filled circle with checkmark = logged period day; gray outline circle = not logged; no circle = future date or not selectable
- Tap dates to toggle period status (add/remove from period)
- Bottom: Cancel/Save actions (fixed, always visible during scroll)

**Flow & logic:**
- User can edit multiple cycle start/end points in a single session
- Hot-pink checkmarks confirm logged days; gray outline circles are "not logged yet" (tap to add)
- Scroll backward to adjust older cycles or forward to correct recent cycles
- Each date is a toggle: tap → add to period (checkmark), tap again → remove (outline only)
- Save commits all changes at once; Cancel discards all edits

---

## Screen 107 — Edit Period Dates (Previous Months)

**Purpose:** Navigate backward through prior months to adjust historical period records.

**Text inventory:**
- Months: "February", "March"
- Dates: 28–31 (February), 1–31 (March), 1–6 (April, below)
- Checkmarks: February 1–5 (checkmark-pink), March 1–7 (checkmark-pink); other dates gray outline
- Actions: "Cancel", "Save"

**UI structure:**
- Same 7-column grid layout as 106
- Scroll position shows earlier months (late January → early April visible)
- Checkmark-pink pattern shows where periods were logged in past
- Gray outline for unlogged future dates; no data entry for dates beyond today

**Flow & logic:**
- Backward scroll reveals prior cycle history
- User can adjust old period records if data entry was wrong
- Checkmark state is binary: logged (pink checkmark) or not (gray outline)
- Same save/cancel model as 106

---

## Screen 108 — Edit Mode (Today Button Highlight)

**Purpose:** Same as 107 but highlighting "Today" link to reset position to current date in edit sheet.

**Text inventory:**
- Same as 107
- "Today" link (top-right, hot-pink)

**UI structure:**
- Identical grid layout to 106/107
- "Today" link allows quick jump back to current date during editing (prevents repeated scrolling)
- Checkmarks and gray outlines same as prior screens

**Flow & logic:**
- "Today" button is a convenience shortcut: tap → scroll to current month
- Useful if user has scrolled backward 3+ months and wants to return quickly

---

## Screen 109 — Prediction Banner + Forecast

**Purpose:** Communicate that cycle predictions are being recalculated based on newly logged period dates.

**Text inventory:**
- Banner (teal background): "Improving cycle predictions..." (sans-serif body text)
- Calendar state: same month/year as 105
- "Today" link visible
- Checkmark pattern visible: pink 1–5, 4–7 (period), 8 teal (high fertility), 9–10 teal (no coloring), 14 dotted outline (pre-today), 15 gray (today with dot)

**UI structure:**
- Teal banner at top of calendar (below "Month/Year" toggle, above date grid)
- Banner has left-right animated dashes (progress indicator)
- Banner text: white text on teal bg
- Calendar grid continues as normal below banner
- "Edit period dates" button visible mid-calendar

**Flow & logic:**
- Prediction banner appears immediately after user saves edit-period-dates sheet
- Animated dashes signal background processing (ML model recalculating cycle phase + fertility window)
- User can still view calendar while banner is active; banner is non-blocking
- Banner typically visible 1–3 seconds before disappearing (replaced with completion state in 111)

---

## Screen 110 — Prediction Recalc (Duplicate Banner State)

**Purpose:** Same state as 109; appears to be a duplicate frame or captured during banner animation cycle.

**Text inventory:**
- Same as 109
- Banner text: "Improving cycle predictions..."

**UI structure:**
- Identical to 109

**Flow & logic:**
- No functional difference from 109; captured at same moment or during banner loop

---

## Screen 111 — Prediction Complete (Success Toast)

**Purpose:** Confirm that cycle predictions have been recalculated successfully after period-date edits.

**Text inventory:**
- Success banner (teal background): "✓ Cycle predictions have been improved!" (checkmark icon + white text)
- Calendar continues to show same month/year
- All date states persist: pink period, teal/gray fertility, etc.

**UI structure:**
- Teal success banner (same width/position as prediction banner in 109)
- Checkmark icon + white text
- Banner auto-dismisses after 2–3 seconds (typical toast behavior)
- Calendar remains fully interactive during and after banner display

**Flow & logic:**
- Appears 1–2 seconds after "Improving predictions..." banner
- Signals ML recalculation complete; user's edits have been processed
- Toast is non-blocking and auto-dismisses; no action required
- User can continue viewing/editing calendar

---

## Screen 112 — Year View (12-Month Grid)

**Purpose:** High-level overview of entire year; each month shown as mini-grid; period/fertility dates color-coded at small scale.

**Text inventory:**
- Year header: "2024", "2025" (large, centered)
- Month names: "January", "February", "March", …, "December" (3 columns, 4 rows)
- Date numbers: 1–31 per month (small text, color-coded)
- Month state examples:
  - January: dates 1–2 hot-pink (period); 3–5 hot-pink; 6–13 mixed (gray + pink); 14–31 gray
  - February: dates 1–3 hot-pink; 4–29 mostly gray (logged but non-period)
  - March: 1–7 hot-pink; 8–9 teal (high fertility); 10+ gray
  - April–September: mixed hot-pink (period), teal (fertile), gray (other)
  - October–December: same color pattern

**UI structure:**
- Top: X close + Month/Year toggle (Year selected) + "Today" link
- 12 mini-grids (one per month), 3 columns × 4 rows
- Each mini-grid: month name + 7-column date layout (compressed)
- Date text is small; color density conveys cycle pattern at a glance
- Tap month → zoom back to month view (105)
- Scroll if needed (entire year fits on screen for most devices; may scroll on small phones)

**Flow & logic:**
- Year view is a macro-level dashboard; no detailed interaction except month tap
- Hot-pink density shows menstrual-cycle regularity over the year
- Teal spots show predicted fertile windows (if visible in small scale)
- Gray dates are non-period days with no logged symptoms or low-fertility predictions
- Color pattern across year can reveal cycle regularity: consistent 28–32-day spacing = healthy cycles
- Tap any month → zoom to month detail view; X closes year view and returns to prior month view

---

## Synthesis

### Calendar Visual Language
- **Hot-pink (period):** Current or logged menstrual days, numbered sequentially within cycle (1, 2, 3…)
- **Teal (fertile):** Predicted high-fertility window; numbered in cycle context (8, 9, etc.)
- **Gray (logged non-period):** Days with symptom logs but no period; plain text or gray outline (outline = unlogged future)
- **Dotted outline (pre-today):** Historical reference; distinguishes past from live-edit window
- **Gray fill (today):** Current date; combined with dot to mark "now"
- Symbol legend: weight scale, footsteps, smiley emoji, balloon (mood), ovulation, "+" button

### Edit Mode Interaction
- Tap day → toggles period status (add/remove checkmark)
- Multi-month scroll allows bulk edits in one session
- Save commits all changes; Cancel reverts
- "Today" button provides quick navigation during edits
- Checkmark-pink = logged; gray outline = not logged

### Prediction Visualization
- Prediction banner (non-blocking) signals ML recalculation in progress
- Success toast confirms completion; auto-dismisses
- Color-coded dates update after prediction refresh
- Teal numbers show fertile-window days; fertility strength inferred from color intensity (not label)

### Forecast Depth
- Visible predictions extend ~5–7 days ahead into next cycle (teal numbers visible in months beyond current date, e.g., day 8–9 of March visible in February grid)
- No explicit accuracy % or confidence label; color saturation implies strength
- Historical edit → immediate re-prediction (no latency message for old data)

### Top Patterns for grandma.app
1. **Checkmark pattern for logged days:** Visual distinction between logged-and-confirmed vs. unlogged-future is clear; reuse for pregnancy logs, vaccine records, appointments
2. **Color-coded cycle phases:** Hot-pink (current phase) + teal (fertile) + gray (other) is scannable; adopt for pre-preg cycle calendar
3. **Non-blocking prediction banner:** Toast-style success messaging doesn't interrupt UX; good for "recalculating insights" or "syncing data"
4. **Year-view macro dashboard:** 12-month grid at glance reveals patterns; useful for pregnancy "week cloud" or kids milestone timeline
5. **Day detail sheet from calendar tap:** Bottom sheet with symptom icons + insights is scalable; reuse for pregnancy logs (weight, mood, symptoms) and kids logs (food, mood, sleep)