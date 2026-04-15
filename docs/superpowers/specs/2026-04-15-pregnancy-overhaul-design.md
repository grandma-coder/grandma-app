# Pregnancy Mode Overhaul — Design Spec
**Date:** 2026-04-15  
**Status:** Approved  
**Scope:** Home · Calendar · Analytics · Profile · Insights

---

## Overview

A comprehensive upgrade of the pregnancy mode across all 5 screens. The goal is to make the pregnancy experience feel like a true command center — combining the emotional, visual appeal of baby-centric apps with real data tracking and actionable guidance. All mock data is replaced with real `pregnancy_logs` entries from Supabase.

---

## 1. Home Screen (`components/home/PregnancyHome.tsx`)

### Design
Combines **Approach A** (vitals grid) and **Approach C** (contextual smart cards) with a cute animated baby hero inspired by visual pregnancy apps.

### Sections (top to bottom, scrollable)

#### 1.1 Baby Hero — Swipeable Carousel
- Gradient background (`#2A1050 → #5C2FA8`)
- Animated blob with fruit/veggie emoji for current week (e.g. 🌽 corn cob at week 24)
- Week counter: `"24 weeks, 3 days"` with trimester badge
- Baby size description: `"Your baby is the size of a corn cob · 112 days left"`
- Progress bar across 40 weeks with T1/T2/T3 labels
- **Swipeable left/right** to explore other weeks — pulls data from `pregnancyData.ts` (weeks 1–40), shows size, length, weight, and development note per week
- Current week is highlighted; swiping reveals past and future weeks

#### 1.2 Quick Log Strip
- Horizontal scroll of today's daily routines
- Green chip = done today (e.g. `✓ Vitamins`, `✓ Water 6/8`)
- Purple chip = urgent/overdue (e.g. `+ Kicks`)
- White chip = pending (e.g. `+ Mood`, `+ Symptoms`, `+ Weight`)
- Tapping a chip opens the matching log form inline (no navigation)
- Data source: query `pregnancy_logs` for `date = today` to determine status of each routine

#### 1.3 Vitals Grid (2×2)
Four tiles pulled from real `pregnancy_logs` data:
| Tile | Data source | Detail |
|------|-------------|--------|
| ⚖️ Weight | `type='weight'` latest entry | Shows current weight + total gain since start |
| 👶 Kicks | `type='kick_count'` today | Shows last session count; highlights if no session today |
| 💧 Water | `type='water'` today | Shows glasses count vs goal (8) with progress bar |
| 😊 Mood | `type='mood'` today | Shows today's mood emoji + time logged |

Each tile has a mini progress bar where applicable.

#### 1.4 Mood Picker (inline)
- 5 mood options displayed as emoji row: 😍 Radiant · 😊 Happy · 😐 Okay · 😰 Anxious · 🤢 Nauseous
- Active mood highlighted in purple
- Tapping any mood writes a `pregnancy_logs` entry (`type='mood'`) immediately
- No modal, no navigation — inline update

#### 1.5 Contextual Cards (smart, condition-based)
Up to 3 cards shown based on current state. Priority order:
1. **Kick count overdue** (green) — if no kick session logged today and week ≥ 28
2. **Upcoming appointment** (amber) — if appointment within 14 days, shows prep note
3. **Baby development this week** (purple) — always shown, pulls from `pregnancyWeeks.ts`
4. **Symptom pattern** — if same symptom logged 3+ days this week

Each card is tappable and navigates to the relevant screen/action.

#### 1.6 Weight Mini-Chart
- 6-entry sparkline with recommended gain range shaded
- Data from `pregnancy_logs` where `type='weight'`, ordered by date desc, limit 6
- Tapping navigates to Analytics → Overview

#### 1.7 Grandma CTA
- Single card linking to `grandma-talk` screen
- Static, always present

#### 1.8 Today's Affirmation
- Rotating daily text, keyed to `dayOfYear % affirmations.length`
- Stored in a new `lib/pregnancyAffirmations.ts` array (40+ entries)

#### 1.9 Daily Tip
- Pulled from `pregnancyData.ts` — the `momTip` field for current week

### Data Sources
- `usePregnancyStore` — weekNumber, dueDate
- `pregnancy_logs` Supabase table — all vitals, routines, mood
- `pregnancyWeeks.ts` — baby size, development per week
- `pregnancyData.ts` — mom tips per week
- New `lib/pregnancyAffirmations.ts` — daily affirmations

---

## 2. Calendar (`components/calendar/PregnancyCalendar.tsx`)

### Design
4-tab view system matching the kids calendar pattern. Daily routines tracked as a "to log today" strip. Event logs as timeline entries.

### 2.1 Views (tab bar at top)

#### Month View
- Calendar grid, days colored by trimester (T1: green tint, T2: purple tint, T3: orange tint)
- Colored dots per day showing log types: purple = mood/symptoms, green = routines done, yellow = appointment
- Today highlighted with purple background
- Tap any day → shows day detail panel at bottom with:
  - List of logged entries for that day
  - Today's routine checklist (done/pending status)
  - `+ Log something` button → opens log type picker

#### Week Timeline
- 7-day strip at top (Mon–Sun), selected day highlighted
- "Still to log today" purple strip below strip showing pending routines as chips
- Color-coded timeline feed for selected day:
  - Purple dot = mood/symptom
  - Green dot = routine (vitamins, water, kicks, weight)
  - Yellow dot = appointment
  - Orange dot = symptom flagged
- `+ Log for today` FAB at bottom

#### Journey View (weeks 4–40)
- Scrollable list of all 40 weeks
- Past weeks: show baby size emoji + logged entry summary (e.g. `😊 mood ×5`, `👶 kicks ×4`)
- Current week: highlighted with purple left border + `current week` badge
- Future weeks: faded/dimmed
- Each row: week number circle, emoji, baby name/size, development note, log summary

#### Appointments View
- Vertical timeline of standard pregnancy checkpoints (pre-seeded in `lib/pregnancyAppointments.ts`)
- Standard checkpoints: NT Scan (W12), Quad Screen (W16), Anatomy Scan (W20), Glucose Test (W24), Rh Factor (W28), Growth Check (W32), Group B Strep (W36), Pre-birth Check (W38)
- Status: done (green ✓ + result note), next (amber + prep note), upcoming (faded)
- Tap done appointment → add/edit results
- `+ Add appointment / exam` FAB

### 2.2 Daily Routines (10 types)
Tracked every day. Show as chips in Month and Week views.

| Routine | Icon | Log type in DB |
|---------|------|----------------|
| Prenatal vitamins | 💊 | `vitamins` |
| Water intake | 💧 | `water` (value = glasses) |
| Weight check | ⚖️ | `weight` (value = kg) |
| Kick count session | 👶 | `kick_count` |
| Mood check-in | 😊 | `mood` |
| Symptoms log | 🤒 | `symptom` |
| Sleep quality | 😴 | `sleep` (value = hours, quality 1–10) |
| Prenatal exercise | 🧘 | `exercise` (value = minutes) |
| Nutrition / meals | 🥗 | `nutrition` |
| Kegel exercises | 💪 | `kegel` |

All saved to `pregnancy_logs(user_id, date, type, value, notes)`.

### 2.3 Event Logs (7 types, one-time)

| Log | Icon | DB type | When |
|-----|------|---------|------|
| Appointment | 📅 | `appointment` | All trimesters |
| Exam Result | 🧪 | `exam_result` | All trimesters |
| Ultrasound Note | 🔊 | `ultrasound` | T1–T2 |
| Contraction Timer | ⏱️ | `contraction` | T3 (week 28+) |
| Medicine / Vaccine | 💉 | `medicine` | All trimesters |
| Milestone | 🌟 | `milestone` | All trimesters |
| Birth Prep Task | 🏥 | `birth_prep` | T3 (week 28+) |
| Nesting Task | 🪺 | `nesting` | T2–T3 |

### 2.4 Log Forms
Extend existing `PregnancyLogForms.tsx` with new forms:
- `SleepLogForm` — hours slider + quality rating (1–10)
- `ExerciseLogForm` — type picker (yoga/walk/swim/other) + minutes
- `NutritionLogForm` — meal tags (iron/folic/protein/calcium) + notes
- `KegelLogForm` — sets completed (simple counter)
- `WaterLogForm` — glasses counter (tap + or -)
- `VitaminsLogForm` — simple toggle (taken/not taken)
- `ContractionTimerLogForm` — uses existing `ContractionTimer` component
- `NestingTaskForm` — title + category + done toggle
- `BirthPrepTaskForm` — title + category + due week + done toggle

### 2.5 Seed Data
New file `lib/pregnancySeeds.ts`:
- 14 days of mock `pregnancy_logs` covering all 10 routine types
- Standard appointment timeline (8 checkpoints)
- Sample exam results (NT scan: normal, anatomy scan: perfect)
- Function: `seedPregnancyData(userId, weekNumber, dueDate)` — inserts if no existing logs

---

## 3. Analytics (`components/analytics/PregnancyAnalytics.tsx`)

### Design
3-tab layout: Overview · Birth Prep · Wellbeing. All charts connect to real `pregnancy_logs` data via Supabase queries. Existing mock data arrays removed.

### 3.1 Overview Tab
- **Progress arc** — week X of 40, trimester badges (T1 ✓ done, T2 active, T3 future)
- **AI insight cards** (2 horizontal) — generated from log patterns (e.g. "Weight gain on track", "Nausea decreased 80% since T1")
- **Weight Tracking chart** — line chart with recommended range band; data from `pregnancy_logs` where `type='weight'`; expandable to full modal
- **Mood Trend** — area chart across last 12 weeks; data from `pregnancy_logs` where `type='mood'`
- **Kick Sessions bar chart** — shows last 14 sessions; data from `pregnancy_logs` where `type='kick_count'`; only shown week ≥ 28
- **Symptom Frequency** — horizontal bar chart, top 5 symptoms by count; data from `pregnancy_logs` where `type='symptom'`

### 3.2 Birth Prep Tab
- **Birth Plan progress** — circular progress showing N of 10 decisions made; links to `birth-plan.tsx`
- **Hospital Bag tracker** — linear progress (items packed / total); data from `pregnancy_logs` where `type='birth_prep'` and `notes` contains category `'hospital_bag'`
- **Contraction Timer history** — stats (total sessions, avg duration, avg interval); data from `pregnancy_logs` where `type='contraction'`; shown only week ≥ 28, placeholder shown before
- **Prenatal Classes checklist** — editable list of classes (childbirth, breastfeeding, CPR, hospital tour)

### 3.3 Wellbeing Tab
- **Overall wellbeing score** — average of 5 dimensions (sleep, mood, nutrition, exercise, hydration) as percentage with week-over-week delta
- **Sleep quality chart** — 4-week trend line; data from `pregnancy_logs` where `type='sleep'`
- **Nutrition tracker** — weekly grid showing iron/folic/protein/calcium coverage per day
- **Hydration bars** — last 7 days bar chart; data from `pregnancy_logs` where `type='water'`

### Data layer
New helper `lib/analyticsData.ts` (extend existing file):
```ts
// New pregnancy-specific queries
getPregnancyWeightHistory(userId, limit)
getPregnancyMoodTrend(userId, weeks)
getPregnancyKickSessions(userId, limit)
getPregnancySymptomFrequency(userId)
getPregnancyWellbeingScore(userId)
getPregnancySleepHistory(userId, weeks)
getPregnancyHydrationHistory(userId, days)
getPregnancyNutritionMatrix(userId, days)
```

---

## 4. Profile (`app/profile/` — new screen or extend existing)

### Design
A dedicated pregnancy profile card accessible from the Profile tab. Organized into scrollable sections.

### 4.1 Hero
- Avatar with 🤰 emoji, name, week, trimester, days to go
- Pills: birth location, doctor name

### 4.2 Pregnancy Info (editable grid)
Fields: due date, current week, first pregnancy (y/n), blood type, pre-pregnancy weight, weight gained, height, BMI.  
Data source: `profiles` table + `usePregnancyStore`.

### 4.3 Birth Preferences (editable)
Fields: birth location, pain management preference, atmosphere (music/quiet/etc), cord cutting preference, feeding plan.  
Data source: new `birth_preferences` column in `profiles` (JSONB).

### 4.4 Birth Team
List of: OB-GYN, hospital/birth center, partner, doula (optional).  
Each entry has: name, role, contact info.  
Data source: extends `care_circle` table with pregnancy-specific roles.

### 4.5 Health Flags
- Pregnancy conditions/allergies (e.g. iron deficiency, gestational reflux, penicillin allergy)
- Reads from `profiles.health_notes`
- Shown as color-coded tags (orange = alert, grey = note)

### 4.6 Baby Info
Fields: baby name, sex (or "not revealed"), last scan week, current position (cephalic/breech/transverse).  
Data source: `children` table (pre-birth child record) + profiles.

### 4.7 Emergency Contacts
Partner + doctor emergency line.  
Data source: `care_circle` + `profiles`.

### 4.8 Postpartum Prep (new section)
Checklist of recovery tasks:
- Meal prep frozen meals
- Postpartum support person confirmed
- Breastfeeding supplies ready
- Read about baby blues vs PPD
- 6-week checkup scheduled
- Postpartum vitamin plan

Data source: `pregnancy_logs` where `type='birth_prep'` with a `postpartum` category flag.

### 4.9 Breastfeeding Plan
Fields: feeding intention, duration goal, lactation consultant booked, pump ordered.  
Data source: `profiles.birth_preferences` JSONB.

### 4.10 Nesting Checklist
Standard items (nursery, crib, car seat, monitor, outlet covers) + custom additions.  
Data source: `pregnancy_logs` where `type='nesting'`.

---

## 5. Insights (`components/insights/InsightsScreen.tsx` — pregnancy-specific logic)

### Design
3 tabs: **Today · Birth Guide · Reads**. All cards use an **expand/collapse pattern** — collapsed by default for a clean screen, tap to reveal full detail. Each expanded card includes an inline "Ask Grandma about X" CTA.

### 5.1 Today Tab

Cards (all collapsible except AI insight and warning):
1. **Week tip** (collapsible) — `momTip` from `pregnancyData.ts` for current week
2. **Birth focus this week** (collapsible, open by default) — keyed content per week, e.g. week 24 = "Understanding Labor Signs", week 32 = "Hospital Bag Essentials", week 36 = "Signs of Labor"
3. **AI insight from logs** (flat, always visible) — generated from last 7 days of `pregnancy_logs` data
4. **Daily affirmation** (collapsible) — rotating daily from `lib/pregnancyAffirmations.ts`
5. **Next appointment** (collapsible) — shows upcoming appointment with prep instructions

**Ask Grandma bar** pinned at bottom of every tab.

### Birth focus cards by week range:
| Weeks | Focus topic |
|-------|-------------|
| 4–12 | First trimester basics, what to eat, what to avoid |
| 13–20 | Anatomy scan prep, gender reveal, nursery planning |
| 21–27 | Understanding labor signs, kick counting, glucose test prep |
| 28–34 | Hospital bag, birth plan, contraction timer, pain management |
| 35–40 | Labor signs for real, 5-1-1 rule, when to go to hospital |

### 5.2 Birth Guide Tab

5 collapsible stage cards + always-visible warning card:

| Card | Icon | Color | Content when expanded |
|------|------|-------|-----------------------|
| Early signs & latent labor | 🌅 | Green | Cervix 0–6cm, timing, stay home advice, partner role |
| Active labor | 🌊 | Purple | 6–10cm, 5-1-1 rule, when to go, pain relief options |
| Transition & pushing | 💫 | Amber | 10cm, hardest/shortest, pushing techniques |
| Birth & golden hour | 👶 | Blue | Skin-to-skin, cord clamping, colostrum, placenta |
| Recovery & postpartum | 🌸 | Pink | Lochia, baby blues vs PPD, 6-week checkup |

Warning card (always visible, never collapsible):
- Water breaks before week 37
- Heavy/unusual bleeding
- Baby not moving for 2+ hours
- Severe headache + vision changes

Each expanded card has: 3–4 bullet points + colored context tags + "Ask Grandma about X" CTA.

### 5.3 Reads Tab

Category pills: For you · Birth prep · Nutrition · Body · Mental health · Partner

Article list — each article is a collapsible card:
- Collapsed: icon + category label + title + read time
- Expanded: short teaser paragraph + "Read full article" button

Featured article at top (open by default) — selected based on current week.

Article content stored in `lib/pregnancyReads.ts` (new file):
- 20+ articles across 6 categories
- Each article: `{ id, title, category, readMinutes, weekRange, teaser, body }`
- `weekRange` controls which week the article is featured

---

## 6. Seed Data (`lib/pregnancySeeds.ts`)

New utility file to populate the DB with realistic data for demo/testing:

```ts
export async function seedPregnancyData(userId: string, weekNumber: number, dueDate: string)
```

Seeds:
- 14 days of daily routines (vitamins, water, mood, weight, kicks, symptoms, sleep, exercise)
- 3 weeks of mood entries (varied: happy/anxious/tired/radiant pattern)
- 6 weight entries spanning 6 weeks (gradual increase within recommended range)
- 5 kick count sessions (week 24+)
- Standard appointment timeline (8 pre-seeded checkpoints)
- 2 exam results (NT scan + anatomy scan as "normal")
- 3 symptom entries (back pain × 2, heartburn × 1)

---

## 7. Database Changes

### New column: `profiles.birth_preferences` (JSONB)
```json
{
  "birthLocation": "hospital",
  "painManagement": "epidural_ok",
  "atmosphere": ["music", "dim_lights"],
  "cordClamping": "partner_cuts",
  "feedingPlan": "breastfeed",
  "breastfeedingGoal": "6_months",
  "lactationConsultant": "booked_week_36",
  "pumpBrand": "Medela"
}
```

### New migration: `supabase/migrations/20260415000000_pregnancy_profile.sql`
- Add `birth_preferences JSONB` to `profiles`
- Add `baby_position TEXT` to `children` (cephalic/breech/transverse/unknown)
- Add index on `pregnancy_logs(user_id, type, date)`

---

## 8. Implementation Notes

- **No new navigation screens** — profile section added to existing `app/profile/` directory as `app/profile/pregnancy.tsx`
- **Swipeable baby hero** — use `FlatList` horizontal with `pagingEnabled` or a `ScrollView` with snap, not a new dependency
- **Expand/collapse** in Insights — local `useState` per card, no global state needed
- **All charts** remain in `components/charts/SvgCharts.tsx` — add new pregnancy-specific chart functions there
- **Birth focus by week** — simple lookup object in `lib/pregnancyInsights.ts` keyed by week range
- **Seed function** — only runs if `pregnancy_logs` count for user is 0 (never overwrites real data)
- **pregnancyData.ts** currently has weeks 1–40 but `pregnancyWeeks.ts` only has weeks 4–40 — consolidate to one source of truth (`pregnancyData.ts`), deprecate `pregnancyWeeks.ts`

---

## Files to Create
| File | Purpose |
|------|---------|
| `lib/pregnancyAffirmations.ts` | 40+ daily affirmations array |
| `lib/pregnancyReads.ts` | 20+ articles for Reads tab |
| `lib/pregnancyInsights.ts` | Birth focus content by week range |
| `lib/pregnancySeeds.ts` | Seed data utility |
| `lib/pregnancyAppointments.ts` | 8 standard pregnancy checkpoints pre-seeded |
| `app/profile/pregnancy.tsx` | Dedicated pregnancy profile screen |
| `supabase/migrations/20260415000000_pregnancy_profile.sql` | DB migration |

## Files to Modify
| File | What changes |
|------|-------------|
| `components/home/PregnancyHome.tsx` | Full redesign per spec section 1 |
| `components/calendar/PregnancyCalendar.tsx` | 4-view tab system per spec section 2 |
| `components/calendar/PregnancyLogForms.tsx` | Add 9 new log form components |
| `components/analytics/PregnancyAnalytics.tsx` | 3-tab layout, real data queries |
| `components/insights/InsightsScreen.tsx` | Pregnancy-specific tabs + expand/collapse |
| `lib/analyticsData.ts` | Add 8 new pregnancy query helpers |
| `store/usePregnancyStore.ts` | Add fields for birth preferences |
