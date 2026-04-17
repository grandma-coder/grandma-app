# Pregnancy Overhaul — Plan 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the data layer, lib files, seed data, and DB migration that all other pregnancy plans depend on.

**Architecture:** New lib files hold static content (affirmations, articles, appointments, insights). A seed utility populates `pregnancy_logs` with 14 days of realistic data. Eight new query hooks extend `lib/analyticsData.ts` following the existing pattern. A DB migration adds `birth_preferences` JSONB and `baby_position` to the schema.

**Tech Stack:** TypeScript · Supabase · React Query v5 (object syntax) · Expo

---

### Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/20260415000000_pregnancy_profile.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260415000000_pregnancy_profile.sql

-- Add birth preferences as JSONB to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS birth_preferences JSONB DEFAULT '{}';

-- Add baby position to children table (for pre-birth tracking)
ALTER TABLE children
  ADD COLUMN IF NOT EXISTS baby_position TEXT DEFAULT 'unknown'
  CHECK (baby_position IN ('cephalic','breech','transverse','unknown'));

-- Composite index for all pregnancy log queries (user + type + date)
CREATE INDEX IF NOT EXISTS idx_pregnancy_logs_user_type_date
  ON pregnancy_logs (user_id, type, date DESC);

-- Index for date-only queries on pregnancy_logs
CREATE INDEX IF NOT EXISTS idx_pregnancy_logs_user_date
  ON pregnancy_logs (user_id, date DESC);
```

- [ ] **Step 2: Apply migration**

```bash
cd /Users/igorcarvalhorodrigues/Projects/grandma-app
supabase db push
```

Expected: migration applies without error. If `pregnancy_logs` table doesn't have a `date` column, check the existing schema — it may be `created_at`. Adjust the index column name accordingly.

- [ ] **Step 3: Verify in Supabase Studio**

Open Supabase Studio → Table Editor → `profiles`. Confirm `birth_preferences` column exists. Open `children` table, confirm `baby_position` column exists.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260415000000_pregnancy_profile.sql
git commit -m "feat: add birth_preferences and baby_position columns + pregnancy_logs indexes"
```

---

### Task 2: `lib/pregnancyAffirmations.ts`

**Files:**
- Create: `lib/pregnancyAffirmations.ts`

- [ ] **Step 1: Create the file**

```typescript
// lib/pregnancyAffirmations.ts
// 42 daily affirmations — keyed by dayOfYear % 42

export const pregnancyAffirmations: string[] = [
  "Your body knows exactly what to do. Trust it completely.",
  "Every day you are growing a miracle. You are extraordinary.",
  "You are stronger than you know and braver than you feel.",
  "Your baby feels your love with every heartbeat.",
  "Rest is productive. Nourishing yourself nourishes your baby.",
  "You were made for this. Your instincts are wise.",
  "A short walk can do wonders for your mood and circulation.",
  "Your emotions are valid. Growing life is hard and beautiful work.",
  "You are not alone on this journey. You are held and supported.",
  "Every ache and change is your body doing its incredible work.",
  "The love you already feel for your baby is real and powerful.",
  "Your body has built a human from scratch. That is extraordinary.",
  "Be gentle with yourself today. You are doing enough.",
  "You are exactly where you are supposed to be right now.",
  "Your baby hears your voice and finds comfort in it.",
  "Fear is natural. Courage is feeling it and moving forward anyway.",
  "This pregnancy is uniquely yours — there is no comparison.",
  "You are preparing a safe world for someone who will love you unconditionally.",
  "Take a deep breath. You and your baby are okay.",
  "Your body is strong, capable, and designed for this.",
  "Every craving, every kick, every sleepless night is part of the story.",
  "You are becoming someone's whole world.",
  "Trust the process. Your body and your baby are in sync.",
  "The way you love your baby already says everything about who you are.",
  "Nourish yourself as lovingly as you nourish your baby.",
  "You don't need to be perfect — your baby just needs you.",
  "Growth happens slowly, then all at once. You are growing too.",
  "Your strength has always been there. Pregnancy is revealing it.",
  "Today, let yourself feel joy about what is coming.",
  "You are writing the first chapter of someone's lifelong story.",
  "Your intuition about your pregnancy matters. Listen to it.",
  "The discomfort is temporary. The love is forever.",
  "You are held in the hands of every woman who came before you.",
  "Your baby is already learning from your calmness and your courage.",
  "Something beautiful is happening inside you right now.",
  "You deserve support, rest, and kindness — especially from yourself.",
  "Every kick is your baby saying 'I'm here, I'm growing, I'm yours.'",
  "The uncertainty is hard. Your love through it is the constant.",
  "You are not just having a baby — you are becoming a mother.",
  "What a privilege it is, to be the first home your child ever knows.",
  "Today is a good day to be gentle with your body and your heart.",
  "You are doing the most important thing there is.",
]

export function getDailyAffirmation(): string {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - start.getTime()
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
  return pregnancyAffirmations[dayOfYear % pregnancyAffirmations.length]
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors on this file.

- [ ] **Step 3: Commit**

```bash
git add lib/pregnancyAffirmations.ts
git commit -m "feat: add 42 daily pregnancy affirmations"
```

---

### Task 3: `lib/pregnancyAppointments.ts`

**Files:**
- Create: `lib/pregnancyAppointments.ts`

- [ ] **Step 1: Create the file**

```typescript
// lib/pregnancyAppointments.ts
// Standard pregnancy appointment timeline — pre-seeded for all users

export interface StandardAppointment {
  id: string
  week: number
  name: string
  type: 'ultrasound' | 'blood_test' | 'checkup' | 'test'
  description: string
  prepNote: string
}

export const STANDARD_APPOINTMENTS: StandardAppointment[] = [
  {
    id: 'nt_scan',
    week: 12,
    name: 'NT Scan',
    type: 'ultrasound',
    description: 'Nuchal translucency ultrasound to screen for chromosomal conditions.',
    prepNote: 'Drink water beforehand for a full bladder. Bring your partner if you\'d like.',
  },
  {
    id: 'quad_screen',
    week: 16,
    name: 'Quad Screen',
    type: 'blood_test',
    description: 'Blood test screening for neural tube defects and chromosomal abnormalities.',
    prepNote: 'No special prep needed. Results take 1–2 weeks.',
  },
  {
    id: 'anatomy_scan',
    week: 20,
    name: 'Anatomy Scan',
    type: 'ultrasound',
    description: 'Detailed ultrasound to check all baby\'s organs and structures.',
    prepNote: 'This is the big one! You may find out the sex. Bring your partner.',
  },
  {
    id: 'glucose_test',
    week: 24,
    name: 'Glucose Test',
    type: 'test',
    description: '1-hour glucose challenge to screen for gestational diabetes.',
    prepNote: 'Fast for 8 hours beforehand. Drink the glucose solution within 5 minutes.',
  },
  {
    id: 'rh_factor',
    week: 28,
    name: 'Rh Factor',
    type: 'blood_test',
    description: 'Checks your Rh blood type. If Rh-negative, you\'ll get a RhoGAM shot.',
    prepNote: 'No special prep. Quick blood draw.',
  },
  {
    id: 'growth_check',
    week: 32,
    name: 'Growth Check',
    type: 'checkup',
    description: 'Checks baby\'s size, position, and amniotic fluid levels.',
    prepNote: 'Good time to discuss your birth plan with your provider.',
  },
  {
    id: 'group_b_strep',
    week: 36,
    name: 'Group B Strep Test',
    type: 'test',
    description: 'Swab to check for GBS bacteria. If positive, antibiotics given during labor.',
    prepNote: 'Quick and painless swab. Results in a few days.',
  },
  {
    id: 'prebirth_check',
    week: 38,
    name: 'Pre-birth Check',
    type: 'checkup',
    description: 'Final checkup before due date. Cervical check, baby position, final questions.',
    prepNote: 'Bring your hospital bag checklist. Ask about induction policies.',
  },
]

export function getAppointmentByWeek(week: number): StandardAppointment | undefined {
  return STANDARD_APPOINTMENTS.find(a => a.week === week)
}

export function getUpcomingAppointment(currentWeek: number): StandardAppointment | undefined {
  return STANDARD_APPOINTMENTS.find(a => a.week >= currentWeek)
}

export function getPastAppointments(currentWeek: number): StandardAppointment[] {
  return STANDARD_APPOINTMENTS.filter(a => a.week < currentWeek)
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add lib/pregnancyAppointments.ts
git commit -m "feat: add standard pregnancy appointment timeline (8 checkpoints)"
```

---

### Task 4: `lib/pregnancyInsights.ts`

**Files:**
- Create: `lib/pregnancyInsights.ts`

- [ ] **Step 1: Create the file**

```typescript
// lib/pregnancyInsights.ts
// Birth focus content keyed by week range, shown in Insights → Today tab

export interface BirthFocusCard {
  title: string
  subtitle: string
  bullets: Array<{ icon: string; text: string }>
  grandmaPrompt: string
}

export interface WeekRangeFocus {
  weekStart: number
  weekEnd: number
  focus: BirthFocusCard
}

export const WEEK_FOCUS: WeekRangeFocus[] = [
  {
    weekStart: 4,
    weekEnd: 12,
    focus: {
      title: 'First Trimester Essentials',
      subtitle: 'What to eat, what to avoid, how to feel better',
      bullets: [
        { icon: '💊', text: 'Folic acid (400–800mcg/day) is critical for neural tube development right now.' },
        { icon: '🚫', text: 'Avoid: raw fish/meat, deli meats, unpasteurized cheese, alcohol, high-mercury fish.' },
        { icon: '🤢', text: 'Morning sickness peaks weeks 6–10. Small frequent meals, ginger tea, and crackers help.' },
        { icon: '😴', text: 'Fatigue is real — your body is building a placenta. Rest without guilt.' },
      ],
      grandmaPrompt: 'What foods should I eat in the first trimester?',
    },
  },
  {
    weekStart: 13,
    weekEnd: 20,
    focus: {
      title: 'Second Trimester — The Sweet Spot',
      subtitle: 'Anatomy scan, feeling movement, nursery planning',
      bullets: [
        { icon: '🔊', text: 'Anatomy scan at week 18–20 checks all organs. You may learn the sex if you want.' },
        { icon: '👶', text: 'First movements (quickening) feel like flutters or bubbles — usually weeks 18–22.' },
        { icon: '🏠', text: 'Good time to plan the nursery, research pediatricians, and take a babymoon.' },
        { icon: '🧘', text: 'Energy is back — prenatal yoga, swimming, and walking are great now.' },
      ],
      grandmaPrompt: 'What should I expect at the anatomy scan?',
    },
  },
  {
    weekStart: 21,
    weekEnd: 27,
    focus: {
      title: 'Understanding Labor Signs',
      subtitle: 'Braxton Hicks, kick counting, glucose test prep',
      bullets: [
        { icon: '🌊', text: 'Braxton Hicks are irregular practice contractions — not painful, no pattern. Normal from week 20+.' },
        { icon: '💧', text: 'Water breaking can be a trickle or a gush. Either way, call your doctor immediately.' },
        { icon: '👶', text: 'Start kick counting at week 28 — 10 kicks in 2 hours is the goal, once a day.' },
        { icon: '🧪', text: 'Glucose test around week 24–28. Fast 8 hours beforehand.' },
      ],
      grandmaPrompt: 'How do I know if I\'m having real contractions?',
    },
  },
  {
    weekStart: 28,
    weekEnd: 34,
    focus: {
      title: 'Birth Prep Season',
      subtitle: 'Hospital bag, birth plan, pain management choices',
      bullets: [
        { icon: '🧳', text: 'Start packing your hospital bag — ID, birth plan, baby outfit, charger, snacks.' },
        { icon: '📋', text: 'Finalize your birth plan: location, pain relief, cord clamping, skin-to-skin preferences.' },
        { icon: '⏱️', text: '5-1-1 rule: go to hospital when contractions are every 5 min, lasting 1 min, for 1 hour.' },
        { icon: '💊', text: 'Epidural, gas & air, TENS, water birth — ask your OB which options are available.' },
      ],
      grandmaPrompt: 'What should I put in my hospital bag?',
    },
  },
  {
    weekStart: 35,
    weekEnd: 40,
    focus: {
      title: 'It\'s Almost Time',
      subtitle: 'Real labor signs, when to go, what happens at the hospital',
      bullets: [
        { icon: '🚨', text: 'Real labor: contractions are regular, increasing in intensity, and don\'t stop with movement.' },
        { icon: '⏱️', text: 'Use the contraction timer. Head to hospital at 5-1-1 (or sooner if waters break).' },
        { icon: '🏥', text: 'When you arrive: triage check, fetal monitoring, cervix check, IV placed if needed.' },
        { icon: '💪', text: 'You\'ve been preparing for this. Trust your body, your team, and your instincts.' },
      ],
      grandmaPrompt: 'How do I know when to go to the hospital?',
    },
  },
]

export function getBirthFocusForWeek(week: number): BirthFocusCard {
  const range = WEEK_FOCUS.find(r => week >= r.weekStart && week <= r.weekEnd)
  return range?.focus ?? WEEK_FOCUS[2].focus // default to week 21-27 content
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add lib/pregnancyInsights.ts
git commit -m "feat: add birth focus content by week range for Insights tab"
```

---

### Task 5: `lib/pregnancyReads.ts`

**Files:**
- Create: `lib/pregnancyReads.ts`

- [ ] **Step 1: Create the file**

```typescript
// lib/pregnancyReads.ts
// 20 curated articles for Insights → Reads tab

export type ReadCategory = 'birth_prep' | 'nutrition' | 'body' | 'mental_health' | 'partner' | 'postpartum'

export interface PregnancyRead {
  id: string
  title: string
  category: ReadCategory
  readMinutes: number
  weekRangeStart: number  // feature this article starting at this week
  weekRangeEnd: number
  teaser: string
  icon: string
}

export const PREGNANCY_READS: PregnancyRead[] = [
  {
    id: 'epidural_explained',
    title: 'What actually happens during an epidural',
    category: 'birth_prep',
    readMinutes: 8,
    weekRangeStart: 20,
    weekRangeEnd: 40,
    teaser: 'Everything you\'re afraid to ask — placement, timing, side effects, what you\'ll feel, and how long it lasts. Written with input from anesthesiologists.',
    icon: '🏥',
  },
  {
    id: 'back_pain_stretches',
    title: '5 prenatal stretches that ease back pain tonight',
    category: 'body',
    readMinutes: 5,
    weekRangeStart: 16,
    weekRangeEnd: 40,
    teaser: 'Quick floor routines targeting lower back and hip flexors. Safe for all trimesters — no equipment needed.',
    icon: '🧘',
  },
  {
    id: 'birth_anxiety',
    title: 'Birth anxiety is real — here\'s what helps',
    category: 'mental_health',
    readMinutes: 6,
    weekRangeStart: 24,
    weekRangeEnd: 40,
    teaser: 'Practical techniques from midwives, doulas, and perinatal psychologists. CBT exercises you can use right now.',
    icon: '🧠',
  },
  {
    id: 'golden_hour',
    title: 'The golden hour: your first 60 minutes after birth',
    category: 'postpartum',
    readMinutes: 4,
    weekRangeStart: 28,
    weekRangeEnd: 40,
    teaser: 'Skin-to-skin contact, colostrum, delayed cord clamping — why timing matters and how to advocate for it in the delivery room.',
    icon: '🤱',
  },
  {
    id: 'partner_delivery_room',
    title: 'How partners can actually help in the delivery room',
    category: 'partner',
    readMinutes: 7,
    weekRangeStart: 24,
    weekRangeEnd: 40,
    teaser: 'Practical role, what to say, what NOT to say, when to stay quiet. A guide partners actually need.',
    icon: '👨',
  },
  {
    id: 'iron_foods',
    title: 'Iron-rich foods that actually taste good in pregnancy',
    category: 'nutrition',
    readMinutes: 4,
    weekRangeStart: 4,
    weekRangeEnd: 40,
    teaser: 'Your blood volume doubles during pregnancy. Here are the tastiest ways to keep iron levels where they need to be.',
    icon: '🥗',
  },
  {
    id: 'hospital_bag',
    title: 'The definitive hospital bag checklist (for real)',
    category: 'birth_prep',
    readMinutes: 6,
    weekRangeStart: 28,
    weekRangeEnd: 40,
    teaser: 'Not the list that says "pack a robe" — the actual list from moms who just got back from the hospital.',
    icon: '🧳',
  },
  {
    id: 'sleep_positions',
    title: 'Why side sleeping matters (and how to actually do it)',
    category: 'body',
    readMinutes: 4,
    weekRangeStart: 16,
    weekRangeEnd: 40,
    teaser: 'Left-side sleeping improves blood flow to baby. Here\'s how to make it comfortable with pillows and positioning.',
    icon: '😴',
  },
  {
    id: 'birth_plan_writing',
    title: 'How to write a birth plan your doctor will actually read',
    category: 'birth_prep',
    readMinutes: 7,
    weekRangeStart: 24,
    weekRangeEnd: 36,
    teaser: 'One page. Three sections. Clear, flexible language. Here\'s the template that works with your care team, not against them.',
    icon: '📋',
  },
  {
    id: 'postpartum_recovery',
    title: 'What nobody tells you about the first week home',
    category: 'postpartum',
    readMinutes: 8,
    weekRangeStart: 32,
    weekRangeEnd: 40,
    teaser: 'Lochia, afterpains, night sweats, baby blues — an honest guide to the physical recovery that most books gloss over.',
    icon: '🌸',
  },
  {
    id: 'folic_acid',
    title: 'Folic acid: why it\'s the most important supplement in pregnancy',
    category: 'nutrition',
    readMinutes: 3,
    weekRangeStart: 4,
    weekRangeEnd: 14,
    teaser: 'Neural tube development happens before many women know they\'re pregnant. Here\'s what you need and why it matters so much.',
    icon: '💊',
  },
  {
    id: 'morning_sickness',
    title: '12 things that actually help with morning sickness',
    category: 'body',
    readMinutes: 5,
    weekRangeStart: 4,
    weekRangeEnd: 16,
    teaser: 'Not just ginger tea. Evidence-based strategies from OBs and moms who\'ve been through it.',
    icon: '🤢',
  },
  {
    id: 'partner_pregnancy',
    title: 'A guide for partners: what she actually needs right now',
    category: 'partner',
    readMinutes: 5,
    weekRangeStart: 4,
    weekRangeEnd: 40,
    teaser: 'Practical, week-by-week guidance on how to show up — from the first trimester through labor and beyond.',
    icon: '💜',
  },
  {
    id: 'kick_counting',
    title: 'Kick counting: why it matters and how to do it',
    category: 'body',
    readMinutes: 4,
    weekRangeStart: 26,
    weekRangeEnd: 40,
    teaser: 'The 10-kicks-in-2-hours guideline explained. When to worry, when not to, and what to do if something seems off.',
    icon: '👶',
  },
  {
    id: 'prenatal_yoga',
    title: 'Prenatal yoga poses that are safe for every trimester',
    category: 'body',
    readMinutes: 6,
    weekRangeStart: 8,
    weekRangeEnd: 40,
    teaser: 'Cat-cow, pigeon pose, child\'s pose — the moves that ease back pain, improve sleep, and prepare your body for birth.',
    icon: '🧘',
  },
  {
    id: 'gestational_diabetes',
    title: 'Gestational diabetes: what a positive result really means',
    category: 'nutrition',
    readMinutes: 6,
    weekRangeStart: 22,
    weekRangeEnd: 30,
    teaser: 'It\'s more common than you think and very manageable. Here\'s what happens after a positive glucose test.',
    icon: '🍎',
  },
  {
    id: 'baby_blues_ppd',
    title: 'Baby blues vs. postpartum depression — know the difference',
    category: 'mental_health',
    readMinutes: 5,
    weekRangeStart: 28,
    weekRangeEnd: 40,
    teaser: 'Mood dips in the first 2 weeks are normal. Beyond that, it\'s worth talking to your doctor. Here\'s what to watch for.',
    icon: '💙',
  },
  {
    id: 'breastfeeding_prep',
    title: 'Preparing to breastfeed before baby arrives',
    category: 'postpartum',
    readMinutes: 7,
    weekRangeStart: 28,
    weekRangeEnd: 40,
    teaser: 'Colostrum, latch technique, nipple care, pump choice — what to think about before the baby is in your arms.',
    icon: '🤱',
  },
  {
    id: 'nesting_instinct',
    title: 'The nesting instinct is real — here\'s how to channel it',
    category: 'body',
    readMinutes: 3,
    weekRangeStart: 28,
    weekRangeEnd: 38,
    teaser: 'Sudden urge to deep-clean and organize everything? That\'s nesting. Here\'s what your body is telling you.',
    icon: '🪺',
  },
  {
    id: 'water_birth',
    title: 'Water birth: what to expect and who it\'s right for',
    category: 'birth_prep',
    readMinutes: 6,
    weekRangeStart: 20,
    weekRangeEnd: 36,
    teaser: 'Hydrotherapy for pain relief, water immersion for birth — the evidence, the logistics, and the questions to ask your provider.',
    icon: '💧',
  },
]

export function getFeaturedReadForWeek(week: number): PregnancyRead {
  const eligible = PREGNANCY_READS.filter(
    r => week >= r.weekRangeStart && week <= r.weekRangeEnd
  )
  if (eligible.length === 0) return PREGNANCY_READS[0]
  // Rotate based on week number so it changes each week
  return eligible[week % eligible.length]
}

export function getReadsByCategory(category: ReadCategory): PregnancyRead[] {
  return PREGNANCY_READS.filter(r => r.category === category)
}

export function getReadsForWeek(week: number): PregnancyRead[] {
  return PREGNANCY_READS.filter(
    r => week >= r.weekRangeStart && week <= r.weekRangeEnd
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add lib/pregnancyReads.ts
git commit -m "feat: add 20 curated pregnancy articles for Reads tab"
```

---

### Task 6: `lib/pregnancySeeds.ts`

**Files:**
- Create: `lib/pregnancySeeds.ts`

- [ ] **Step 1: Create the file**

```typescript
// lib/pregnancySeeds.ts
// Populate pregnancy_logs with 14 days of realistic data
// Only runs if the user has zero existing logs (never overwrites real data)

import { supabase } from './supabase'

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

export async function seedPregnancyData(
  userId: string,
  weekNumber: number,
  _dueDate: string
): Promise<void> {
  // Check if user already has logs — never overwrite real data
  const { count } = await supabase
    .from('pregnancy_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (count && count > 0) return

  const logs: Array<{
    user_id: string
    date: string
    type: string
    value: string | null
    notes: string | null
  }> = []

  const moods = ['happy', 'radiant', 'okay', 'anxious', 'happy', 'radiant', 'tired',
                  'happy', 'happy', 'okay', 'radiant', 'happy', 'tired', 'happy']

  const weights = [63.2, 63.5, 63.8, 64.1, 64.2, 64.5, 64.8,
                   65.0, 65.1, 65.2, 65.3, 65.3, 65.4, 65.5]

  const waterCounts = ['6', '7', '5', '8', '6', '7', '8', '6', '7', '5', '6', '8', '7', '6']

  const symptomsByDay: Record<number, string[]> = {
    2: ['back pain', 'heartburn'],
    5: ['back pain'],
    8: ['fatigue', 'back pain'],
    11: ['swelling', 'heartburn'],
    13: ['back pain'],
  }

  for (let daysBack = 13; daysBack >= 0; daysBack--) {
    const date = daysAgo(daysBack)
    const idx = 13 - daysBack

    // Vitamins (daily)
    logs.push({ user_id: userId, date, type: 'vitamins', value: 'true', notes: null })

    // Mood (daily)
    logs.push({ user_id: userId, date, type: 'mood', value: moods[idx], notes: null })

    // Weight (every 2–3 days)
    if (idx % 2 === 0) {
      logs.push({ user_id: userId, date, type: 'weight', value: String(weights[idx]), notes: null })
    }

    // Water
    logs.push({ user_id: userId, date, type: 'water', value: waterCounts[idx], notes: null })

    // Sleep (most days)
    if (idx % 3 !== 0) {
      const hours = (6 + Math.floor(Math.random() * 3)).toFixed(1)
      logs.push({ user_id: userId, date, type: 'sleep', value: hours, notes: null })
    }

    // Exercise (every 3 days)
    if (idx % 3 === 0) {
      logs.push({ user_id: userId, date, type: 'exercise', value: '20', notes: 'prenatal yoga' })
    }

    // Symptoms on specific days
    if (symptomsByDay[daysBack]) {
      for (const symptom of symptomsByDay[daysBack]) {
        logs.push({ user_id: userId, date, type: 'symptom', value: symptom, notes: 'mild' })
      }
    }

    // Kick counts (every 2 days, only if week >= 28)
    if (weekNumber >= 28 && idx % 2 === 0) {
      const kicks = 8 + Math.floor(Math.random() * 8)
      logs.push({ user_id: userId, date, type: 'kick_count', value: String(kicks), notes: null })
    }
  }

  // Seed standard appointments
  const { STANDARD_APPOINTMENTS } = await import('./pregnancyAppointments')
  for (const appt of STANDARD_APPOINTMENTS) {
    if (appt.week < weekNumber) {
      // Mark as done (no result notes — user can add them)
      logs.push({
        user_id: userId,
        date: daysAgo((weekNumber - appt.week) * 7),
        type: 'appointment',
        value: appt.name,
        notes: JSON.stringify({ appointmentId: appt.id, status: 'done', result: 'normal' }),
      })
    }
  }

  // Insert in batches of 50
  for (let i = 0; i < logs.length; i += 50) {
    const batch = logs.slice(i, i + 50)
    const { error } = await supabase.from('pregnancy_logs').insert(batch)
    if (error) console.warn('Seed insert error:', error.message)
  }
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add lib/pregnancySeeds.ts
git commit -m "feat: add pregnancy seed data utility (14 days of routines + appointments)"
```

---

### Task 7: Extend `lib/analyticsData.ts` with pregnancy query hooks

**Files:**
- Modify: `lib/analyticsData.ts` (append to bottom of file)

- [ ] **Step 1: Add pregnancy types and query hooks to end of `lib/analyticsData.ts`**

Open [lib/analyticsData.ts](lib/analyticsData.ts) and append after all existing code:

```typescript
// ─── Pregnancy Analytics Types ────────────────────────────────────────────────

export interface PregnancyWeightEntry {
  date: string
  weight: number
}

export interface PregnancyMoodEntry {
  week: number
  mood: string
  count: number
}

export interface PregnancyKickSession {
  date: string
  kicks: number
}

export interface PregnancySymptomFreq {
  symptom: string
  count: number
}

export interface PregnancyWellbeingScore {
  sleep: number      // avg hours / 9 * 10
  mood: number       // positive moods / total * 10
  nutrition: number  // days with nutrition log / 7 * 10
  exercise: number   // days with exercise / 7 * 10
  hydration: number  // avg glasses / 8 * 10 (capped at 10)
  overall: number    // average of above
  delta: number      // change from previous week (percentage points)
}

export interface PregnancyNutritionMatrix {
  dates: string[]
  iron: boolean[]
  folic: boolean[]
  protein: boolean[]
  calcium: boolean[]
}

// ─── Pregnancy Query Hooks ────────────────────────────────────────────────────

export function usePregnancyWeightHistory(userId: string, limit = 10) {
  return useQuery({
    queryKey: ['pregnancy_weight', userId, limit],
    queryFn: async (): Promise<PregnancyWeightEntry[]> => {
      const { data, error } = await supabase
        .from('pregnancy_logs')
        .select('date, value')
        .eq('user_id', userId)
        .eq('type', 'weight')
        .order('date', { ascending: true })
        .limit(limit)
      if (error) throw error
      return (data ?? []).map(r => ({
        date: r.date,
        weight: parseFloat(r.value ?? '0'),
      })).filter(r => !isNaN(r.weight))
    },
    enabled: !!userId,
  })
}

export function usePregnancyMoodTrend(userId: string, weeks = 12) {
  return useQuery({
    queryKey: ['pregnancy_mood_trend', userId, weeks],
    queryFn: async () => {
      const since = new Date()
      since.setDate(since.getDate() - weeks * 7)
      const { data, error } = await supabase
        .from('pregnancy_logs')
        .select('date, value')
        .eq('user_id', userId)
        .eq('type', 'mood')
        .gte('date', since.toISOString().split('T')[0])
        .order('date', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    enabled: !!userId,
  })
}

export function usePregnancyKickSessions(userId: string, limit = 14) {
  return useQuery({
    queryKey: ['pregnancy_kicks', userId, limit],
    queryFn: async (): Promise<PregnancyKickSession[]> => {
      const { data, error } = await supabase
        .from('pregnancy_logs')
        .select('date, value')
        .eq('user_id', userId)
        .eq('type', 'kick_count')
        .order('date', { ascending: false })
        .limit(limit)
      if (error) throw error
      return (data ?? []).map(r => ({
        date: r.date,
        kicks: parseInt(r.value ?? '0', 10),
      })).reverse()
    },
    enabled: !!userId,
  })
}

export function usePregnancySymptomFrequency(userId: string) {
  return useQuery({
    queryKey: ['pregnancy_symptoms', userId],
    queryFn: async (): Promise<PregnancySymptomFreq[]> => {
      const { data, error } = await supabase
        .from('pregnancy_logs')
        .select('value')
        .eq('user_id', userId)
        .eq('type', 'symptom')
      if (error) throw error
      const counts: Record<string, number> = {}
      for (const row of data ?? []) {
        if (row.value) counts[row.value] = (counts[row.value] ?? 0) + 1
      }
      return Object.entries(counts)
        .map(([symptom, count]) => ({ symptom, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    },
    enabled: !!userId,
  })
}

export function usePregnancyWellbeingScore(userId: string) {
  return useQuery({
    queryKey: ['pregnancy_wellbeing', userId],
    queryFn: async (): Promise<PregnancyWellbeingScore> => {
      const since = new Date()
      since.setDate(since.getDate() - 7)
      const sinceStr = since.toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('pregnancy_logs')
        .select('date, type, value')
        .eq('user_id', userId)
        .gte('date', sinceStr)
      if (error) throw error

      const logs = data ?? []
      const sleepLogs = logs.filter(l => l.type === 'sleep')
      const moodLogs = logs.filter(l => l.type === 'mood')
      const nutritionLogs = logs.filter(l => l.type === 'nutrition')
      const exerciseLogs = logs.filter(l => l.type === 'exercise')
      const waterLogs = logs.filter(l => l.type === 'water')

      const positiveMoods = ['happy', 'radiant', 'energetic', 'okay']
      const avgSleepHours = sleepLogs.length > 0
        ? sleepLogs.reduce((s, l) => s + parseFloat(l.value ?? '0'), 0) / sleepLogs.length
        : 0
      const moodScore = moodLogs.length > 0
        ? (moodLogs.filter(l => positiveMoods.includes(l.value ?? '')).length / moodLogs.length) * 10
        : 0
      const nutritionScore = Math.min(10, (nutritionLogs.length / 7) * 10)
      const exerciseScore = Math.min(10, (exerciseLogs.length / 7) * 10 * 2) // 3 times/week = full score
      const avgWater = waterLogs.length > 0
        ? waterLogs.reduce((s, l) => s + parseInt(l.value ?? '0', 10), 0) / waterLogs.length
        : 0
      const hydrationScore = Math.min(10, (avgWater / 8) * 10)
      const sleepScore = Math.min(10, (avgSleepHours / 9) * 10)
      const overall = (sleepScore + moodScore + nutritionScore + exerciseScore + hydrationScore) / 5

      return {
        sleep: Math.round(sleepScore * 10) / 10,
        mood: Math.round(moodScore * 10) / 10,
        nutrition: Math.round(nutritionScore * 10) / 10,
        exercise: Math.round(exerciseScore * 10) / 10,
        hydration: Math.round(hydrationScore * 10) / 10,
        overall: Math.round(overall * 10),
        delta: 0, // TODO: compare to previous week in future iteration
      }
    },
    enabled: !!userId,
  })
}

export function usePregnancySleepHistory(userId: string, weeks = 4) {
  return useQuery({
    queryKey: ['pregnancy_sleep', userId, weeks],
    queryFn: async () => {
      const since = new Date()
      since.setDate(since.getDate() - weeks * 7)
      const { data, error } = await supabase
        .from('pregnancy_logs')
        .select('date, value')
        .eq('user_id', userId)
        .eq('type', 'sleep')
        .gte('date', since.toISOString().split('T')[0])
        .order('date', { ascending: true })
      if (error) throw error
      return (data ?? []).map(r => ({
        date: r.date,
        hours: parseFloat(r.value ?? '0'),
      }))
    },
    enabled: !!userId,
  })
}

export function usePregnancyHydrationHistory(userId: string, days = 7) {
  return useQuery({
    queryKey: ['pregnancy_hydration', userId, days],
    queryFn: async () => {
      const since = new Date()
      since.setDate(since.getDate() - days)
      const { data, error } = await supabase
        .from('pregnancy_logs')
        .select('date, value')
        .eq('user_id', userId)
        .eq('type', 'water')
        .gte('date', since.toISOString().split('T')[0])
        .order('date', { ascending: true })
      if (error) throw error
      return (data ?? []).map(r => ({
        date: r.date,
        glasses: parseInt(r.value ?? '0', 10),
      }))
    },
    enabled: !!userId,
  })
}

export function usePregnancyNutritionMatrix(userId: string, days = 7) {
  return useQuery({
    queryKey: ['pregnancy_nutrition', userId, days],
    queryFn: async (): Promise<PregnancyNutritionMatrix> => {
      const dates: string[] = []
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        dates.push(d.toISOString().split('T')[0])
      }

      const since = dates[0]
      const { data, error } = await supabase
        .from('pregnancy_logs')
        .select('date, notes')
        .eq('user_id', userId)
        .eq('type', 'nutrition')
        .gte('date', since)
      if (error) throw error

      const logsByDate = new Map<string, string[]>()
      for (const row of data ?? []) {
        const tags: string[] = JSON.parse(row.notes ?? '[]')
        logsByDate.set(row.date, tags)
      }

      return {
        dates,
        iron: dates.map(d => logsByDate.get(d)?.includes('iron') ?? false),
        folic: dates.map(d => logsByDate.get(d)?.includes('folic') ?? false),
        protein: dates.map(d => logsByDate.get(d)?.includes('protein') ?? false),
        calcium: dates.map(d => logsByDate.get(d)?.includes('calcium') ?? false),
      }
    },
    enabled: !!userId,
  })
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors. If you see issues with `useQuery` import — it's already imported at the top of the file; do not add a second import.

- [ ] **Step 3: Commit**

```bash
git add lib/analyticsData.ts
git commit -m "feat: add 8 pregnancy analytics query hooks to analyticsData"
```

---

### Task 8: Wire Seed Data into Pregnancy Onboarding

**Files:**
- Modify: `app/onboarding/pregnancy/index.tsx`

- [ ] **Step 1: Find the completion handler in `app/onboarding/pregnancy/index.tsx`**

Open [app/onboarding/pregnancy/index.tsx](app/onboarding/pregnancy/index.tsx) and find the function that runs after the final onboarding step saves to Supabase (look for where `behaviors` table insert happens and `setCurrentStep` moves to the completion screen).

- [ ] **Step 2: Add seed call after successful save**

After the behaviors insert and store updates, add:

```typescript
import { seedPregnancyData } from '../../../lib/pregnancySeeds'

// Inside the completion handler, after existing saves:
const { data: { user } } = await supabase.auth.getUser()
if (user && weekNumber) {
  seedPregnancyData(user.id, weekNumber, dueDate ?? '').catch(console.warn)
}
```

The seed runs in the background (no await on purpose — it shouldn't block onboarding completion).

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Manual test**

Run the app, go through pregnancy onboarding, complete it. Open Supabase Studio → `pregnancy_logs` table. Verify ~40–50 rows exist for that user.

- [ ] **Step 5: Commit**

```bash
git add app/onboarding/pregnancy/index.tsx
git commit -m "feat: seed pregnancy log data after onboarding completion"
```
