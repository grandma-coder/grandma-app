# Birth Guide — Design Spec

**Date:** 2026-04-24
**Status:** Approved

---

## Overview

A comprehensive Birth Guide accessible from the pregnancy home screen. The guide covers all major birth types (natural, C-section, home, water) plus supporting topics (labor stages, warning signs, hospital bag, pain relief, positions, partner guide, recovery). Content is presented in a three-level hierarchy: home banner → topic landing → accordion detail.

---

## 1. Entry Point — Compact Banner Card

**Location:** Pregnancy home screen (`components/home/PregnancyHome.tsx`), inserted as a named section below the Quick Log Strip (or between VitalsCarousel and RemindersSection).

**Appearance:**
- Cream `#FFFEF8` background, 1px lavender border (`#C4B5FD`), border-radius 16px
- Left: emoji tile (🌿) in a soft lavender `#F0EBFF` rounded square (40×40, radius 12)
- Center: title "Birth Guide" (DM Sans SemiBold, 15px, `#141313`) + subtitle "Natural · C-Section · Home · Water" (DM Sans Regular, 12px, `#888`)
- Right: chevron `›` in lavender
- Box shadow: `3px 3px 0px #C4B5FD` (sticker offset shadow, matches design system)
- Press feedback: opacity 0.8

**Behavior:** Tapping opens `BirthGuideModal` as a React Native `Modal` with `animationType="slide"` and `transparent={true}`.

---

## 2. Guide Landing — Bottom Sheet Modal

**Component:** `components/pregnancy/BirthGuideModal.tsx`

**Shell:**
- Handle bar (36×4px, `rgba(20,19,19,0.2)`, centered, margin-top 12)
- Header: "Birth Guide 🌿" (Fraunces SemiBold, 22px) + subtitle "What do you want to explore?" (DM Sans, 13px, muted)
- ScrollView with padding 16px horizontal
- Close button: `×` top-right, 44×44 tap target

### Section 1 — Birth Types (2×2 grid)

Four tappable cards in a 2-column grid with `gap: 12`. Each card:
- Rounded rect (radius 16), colored background + border
- Emoji icon (24px) + title (DM Sans SemiBold, 13px, `#141313`) + subtitle (DM Sans, 11px, muted)
- Press opens `BirthDetailModal` with the corresponding birth type

| Key | Emoji | Title | Subtitle | Background | Border |
|-----|-------|-------|----------|------------|--------|
| `natural` | 🌿 | Natural Birth | Breathing, positions, stages | `#E8F8E8` | `#B7E5B7` |
| `csection` | 🏥 | C-Section | Surgery, recovery, VBAC | `#F0EBFF` | `#C4B5FD` |
| `home` | 🏡 | Home Birth | Midwife, safety, planning | `#E8F0FF` | `#B7C8F5` |
| `water` | 🌊 | Water Birth | Pool, pain relief, logistics | `#FFF0F5` | `#F5B7CC` |

### Section 2 — Also in This Guide (list rows)

Section label "ALSO IN THIS GUIDE" (DM Sans Bold, 11px, lavender, uppercase, letter-spacing 0.8). Seven tappable rows, each:
- Background `#FFFEF8`, border `#E8E0CC`, radius 12, padding 14×16
- Left: emoji (20px) in a 36×36 soft-colored tile
- Center: title (DM Sans SemiBold, 14px) + subtitle (DM Sans, 12px, muted)
- Right: chevron `›`

| Key | Emoji | Title | Subtitle |
|-----|-------|-------|----------|
| `labor-stages` | ⏱️ | Labor Stages | Early → Active → Transition → Pushing |
| `warning-signs` | 🚨 | Warning Signs | When to call your provider |
| `hospital-bag` | 🧳 | Hospital Bag Checklist | For mom, baby & partner |
| `pain-relief` | 💊 | Pain Relief Options | Epidural, TENS, breathing & more |
| `positions` | 🤸 | Birth Positions | Upright, squatting, hands & knees |
| `partner-guide` | 👐 | Birth Partner Guide | What your support person needs to know |
| `recovery` | 🌙 | Recovery & Postpartum | First 24h, healing, emotional changes |

Each row press opens `BirthDetailModal` with the corresponding topic key.

---

## 3. Detail Screen — `BirthDetailModal`

**Component:** `components/pregnancy/BirthDetailModal.tsx`

**Props:**
```ts
interface BirthDetailModalProps {
  visible: boolean;
  onClose: () => void;
  topicKey: BirthTopicKey;
}

type BirthTopicKey =
  | 'natural' | 'csection' | 'home' | 'water'
  | 'labor-stages' | 'warning-signs' | 'hospital-bag'
  | 'pain-relief' | 'positions' | 'partner-guide' | 'recovery';
```

**Hero colors per topic key:**

| Key | heroColor | heroBorder |
|-----|-----------|------------|
| `natural` | `#E8F8E8` | `#B7E5B7` |
| `csection` | `#F0EBFF` | `#C4B5FD` |
| `home` | `#E8F0FF` | `#B7C8F5` |
| `water` | `#FFF0F5` | `#F5B7CC` |
| `labor-stages` | `#FEF9E8` | `#F5E0A0` |
| `warning-signs` | `#FFF0F0` | `#F5B7B7` |
| `hospital-bag` | `#E8F8F8` | `#B7E5E5` |
| `pain-relief` | `#F0F8FF` | `#B7D8F5` |
| `positions` | `#F5F0FF` | `#CDB7F5` |
| `partner-guide` | `#FFF5E8` | `#F5D0B7` |
| `recovery` | `#F0F0FF` | `#C4C4F5` |

**Shell:**
- Handle bar + close button (same as landing modal)
- **Color-coded hero section** (use `heroColor`/`heroBorder` from table above):
  - Full-width rounded rect (radius 20) with `heroColor` background, `heroBorder` border
  - Emoji (32px) + title (Fraunces SemiBold, 20px) + subtitle (DM Sans, 13px, muted)
- ScrollView below hero with accordion sections
- **"Ask Grandma" CTA** pinned at bottom: lavender background tile, "💬 Ask Grandma anything →" (DM Sans SemiBold, 14px, `#7048B8`), taps to `grandma-talk` screen with topic pre-filled as context

**Accordion behavior:**
- Single-expand: tapping an item opens it and collapses the previously open one
- Open state: background `#F4F0FF`, border `#C4B5FD`, content area slides in below title row
- Closed state: `#FFFEF8` background, `#E8E0CC` border
- Numbered circle left of title (1, 2, 3…) colored to match topic

---

## 4. Content Data — `lib/birthGuideData.ts`

All content lives in a single typed data file. Structure:

```ts
interface BirthTopic {
  key: BirthTopicKey;
  emoji: string;
  title: string;
  subtitle: string;
  heroColor: string;   // background hex
  heroBorder: string;  // border hex
  sections: BirthSection[];
}

interface BirthSection {
  title: string;
  content: string;           // main paragraph
  bullets?: string[];        // optional bullet list
  subsections?: { title: string; content: string }[]; // for deeply nested topics
}
```

### Content per topic

**Natural Birth** (6 sections)
1. What is natural birth? — definition, philosophy, who it's for
2. Labor stages — Early (0–6cm), Active (6–10cm), Transition, Pushing, Golden hour; timing + what to expect at each
3. Pain relief without medication — breathing techniques, movement, water/heat, TENS machine, hypnobirthing, doula support
4. Birth positions — upright standing, squatting, hands & knees, side-lying, birthing ball; when to use each
5. Pros & considerations — faster recovery, immediate skin-to-skin, no side effects vs. intense pain, may need emergency C-section
6. Recovery — first hour, perineum care, lochia, breastfeeding initiation

**C-Section** (6 sections)
1. What is a C-section? — planned vs. emergency, when it's recommended
2. What happens in the OR — prep, spinal/epidural, procedure timeline, who is in the room
3. Recovery timeline — day 1–3 (hospital), week 1–2 (home), week 4–6 (return to activity)
4. VBAC (Vaginal Birth After C-Section) — candidacy, risks, benefits, questions to ask your provider
5. Pros & considerations — predictable timing, no perineal tearing vs. longer recovery, scar, infection risk
6. Emotional support — processing an unplanned C-section, partner's role, bonding after surgery

**Home Birth** (6 sections)
1. What is home birth? — definition, statistics, who it's suitable for
2. Is it right for you? — low-risk criteria, contraindications, questions for your midwife
3. Choosing a midwife — credentials (CNM vs. CPM), what to ask, backup hospital plan
4. Safety & emergency plan — transfer protocol, equipment on hand, signs that require transfer
5. What to prepare at home — birth pool, supplies list, room setup, partner briefing
6. Pros & considerations — familiar environment, full autonomy vs. no epidural access, transfer risk

**Water Birth** (6 sections)
1. What is water birth? — definition, how warm water helps, history
2. How it works — laboring in water vs. delivering in water, pool vs. tub
3. Pain relief benefits — buoyancy, relaxation, reduced perineal tearing
4. Who can & can't — low-risk criteria, contraindications (GBS, meconium, multiples)
5. Setting up the pool — rental vs. purchase, water temperature (37°C), hygiene
6. Pros & considerations — natural pain relief, gentle entry for baby vs. infection risk, limited availability

**Labor Stages** (6 sections)
1. Overview — the full arc from first contraction to placenta delivery
2. Early labor — 0–6cm, duration 6–12h, what to do, when to call
3. Active labor — 6–10cm, contractions 3–5 min, go to hospital
4. Transition — most intense phase, 8–10cm, duration 15–60 min
5. Pushing — urge to push, positions, coached vs. spontaneous pushing
6. Golden hour — delayed cord clamping, skin-to-skin, placenta delivery, first feed

**Warning Signs** (5 sections)
1. Overview — the importance of trusting your instincts
2. Before labor — water breaks before week 37, heavy bleeding, no fetal movement >2h (week 28+)
3. During labor — fever >38°C, abnormal fetal heart rate, cord prolapse
4. After birth — heavy postpartum bleeding (soaking >1 pad/hr), signs of infection, postpartum preeclampsia
5. Emergency contacts — when to call provider vs. go directly to hospital vs. call emergency services

**Hospital Bag** (5 sections — reuses existing `birthData.ts` data)
1. For mom — clothing, toiletries, comfort items, snacks, documents
2. For baby — first outfit, blanket, car seat, feeding supplies
3. For partner — change of clothes, charger, snacks, camera
4. Documents to bring — ID, insurance, birth plan, hospital forms
5. What NOT to pack — valuables, too many clothes, items hospital provides

**Pain Relief Options** (6 sections)
1. Overview — the spectrum from non-medical to medical
2. Epidural — how it works, timing, side effects, combined spinal-epidural
3. Nitrous oxide — laughing gas, availability, pros/cons
4. TENS machine — how it works, when to start, renting one
5. Water & heat — shower, bath, warm compress, how to use
6. Breathing & hypnobirthing — techniques, apps, practicing before labor

**Birth Positions** (6 sections)
1. Why position matters — pelvis opening, gravity, reducing tearing
2. Upright & walking — gravity benefits, when to walk, partner support
3. Squatting — widens pelvis, birthing bar, supported squat
4. Hands & knees — relieves back labor, optimal fetal positioning
5. Side-lying — rest position, partner leg support
6. Birthing ball — rocking, bouncing, hip circles, how to use

**Birth Partner Guide** (6 sections)
1. Your role — advocate, presence, practical support
2. During early labor at home — timing contractions, comfort measures, when to call
3. At the hospital — communicating with staff, birth plan, staying calm
4. During pushing — encouragement, leg support, breathing with her
5. What to say & what to avoid — specific phrases, how to respond to "I can't do this"
6. After birth — skin-to-skin if mom can't, cord cutting, supporting breastfeeding, self-care

**Recovery & Postpartum** (6 sections)
1. First 24 hours — what happens in hospital, monitoring, first feed
2. Bleeding & lochia — what's normal, how long, warning signs
3. Perineum & stitches — care after vaginal birth, sitz baths, healing timeline
4. C-section recovery — wound care, mobility restrictions, scar massage
5. Emotional changes — baby blues vs. postpartum depression, when to seek help
6. When to call your doctor — fever, wound changes, heavy bleeding, severe mood changes

---

## 5. Navigation & State

- `BirthGuideModal` and `BirthDetailModal` are both React Native `Modal` components (not new routes), keeping the existing modal pattern used throughout `PregnancyHome`
- `selectedTopic: BirthTopicKey | null` state in `BirthGuideModal` controls whether the detail modal is open
- The hospital bag section reads from existing `birthData.ts` — no duplicate content
- "Ask Grandma" CTA closes both modals and navigates to `grandma-talk` with a pre-filled message: `"Tell me more about [topic title]"`

---

## 6. Files to Create / Modify

| Action | File |
|--------|------|
| Create | `lib/birthGuideData.ts` — all topic content |
| Create | `components/pregnancy/BirthGuideModal.tsx` — landing sheet |
| Create | `components/pregnancy/BirthDetailModal.tsx` — accordion detail |
| Modify | `components/home/PregnancyHome.tsx` — add compact banner + modal state |
| Remove | `components/home/pregnancy/BirthGuidePreview.tsx` — replaced by the new entry point |

> `BirthGuidePreview` is the current inline collapsible preview on the home screen. It is replaced by the compact banner, which opens the full modal experience.

---

## 7. Out of Scope

- No new Supabase tables or edge functions — content is fully local
- No personalization based on user's birth plan selection (future)
- No video content (future)
- Light mode is supported via theme tokens (no separate design needed)
