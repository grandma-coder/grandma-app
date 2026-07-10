/**
 * Pre-pregnancy checklist content.
 *
 * Two curated item sets keyed by the user's intent (captured at cycle
 * onboarding as `tryingToConceive`, persisted in the first period_start row's
 * notes JSON — see useCycleIntent in cycleAnalytics.ts):
 *
 *   - ttc  ("Conception prep")  — preconception steps for someone trying.
 *   - cycle ("Cycle health")    — wellness / cycle-awareness for someone
 *                                 tracking but not trying to conceive.
 *
 * Items are static content; completion state is per-user and lives in the
 * `cycle_checklist` Supabase table (see useCycleChecklist). `category` maps to
 * the color set already defined in components/agenda/PrePregChecklist.tsx
 * (health / fertility / lifestyle / financial / emotional).
 */

export type ChecklistIntent = 'ttc' | 'cycle'

export interface ChecklistItemDef {
  id: string
  title: string
  description: string
  category: 'health' | 'fertility' | 'lifestyle' | 'financial' | 'emotional'
}

const TTC_ITEMS: ChecklistItemDef[] = [
  {
    id: 'ttc_prenatal',
    title: 'Start a prenatal vitamin',
    description: 'Begin folic acid (400–800 mcg/day) at least 1 month before trying — it lowers neural-tube-defect risk.',
    category: 'health',
  },
  {
    id: 'ttc_preconception_visit',
    title: 'Book a preconception checkup',
    description: 'See your doctor to review history, medications, and any conditions before conceiving.',
    category: 'health',
  },
  {
    id: 'ttc_track_ovulation',
    title: 'Track your ovulation',
    description: 'Use BBT, LH tests, or cervical mucus to identify your fertile window and time intimacy.',
    category: 'fertility',
  },
  {
    id: 'ttc_cut_alcohol_smoking',
    title: 'Cut alcohol & smoking',
    description: 'Both reduce fertility and harm early pregnancy. Stopping now gives the best start.',
    category: 'lifestyle',
  },
  {
    id: 'ttc_healthy_weight',
    title: 'Aim for a healthy weight',
    description: 'Being in a healthy BMI range supports regular ovulation and a healthier pregnancy.',
    category: 'lifestyle',
  },
  {
    id: 'ttc_dental',
    title: 'Get a dental checkup',
    description: 'Gum health is linked to pregnancy outcomes — easier to treat before you conceive.',
    category: 'health',
  },
  {
    id: 'ttc_review_insurance',
    title: 'Review maternity coverage',
    description: 'Understand what your insurance covers for prenatal care and delivery ahead of time.',
    category: 'financial',
  },
  {
    id: 'ttc_stress_care',
    title: 'Build a stress-care routine',
    description: 'Sleep, gentle movement, and stress reduction support hormone balance and wellbeing.',
    category: 'emotional',
  },
]

const CYCLE_ITEMS: ChecklistItemDef[] = [
  {
    id: 'cyc_track_three_cycles',
    title: 'Track 3 full cycles',
    description: 'Logging period start/end across a few cycles reveals your personal length and regularity.',
    category: 'health',
  },
  {
    id: 'cyc_symptom_patterns',
    title: 'Note your symptom patterns',
    description: 'Logging cramps, mood, and energy by phase helps you understand your own rhythm.',
    category: 'health',
  },
  {
    id: 'cyc_learn_fertility_signs',
    title: 'Learn fertility-awareness signs',
    description: 'Knowing your fertile window (mucus, temperature) helps whether you want to conceive or avoid it.',
    category: 'fertility',
  },
  {
    id: 'cyc_iron_vitd',
    title: 'Check iron & vitamin D',
    description: 'Ask your doctor about levels — low iron or vitamin D can affect cycle health and energy.',
    category: 'health',
  },
  {
    id: 'cyc_well_woman',
    title: 'Schedule a well-woman exam',
    description: 'An annual screening (Pap, pelvic exam) keeps your reproductive health on track.',
    category: 'health',
  },
  {
    id: 'cyc_sleep_routine',
    title: 'Protect your sleep',
    description: 'Consistent sleep stabilizes the hormones that drive a regular, comfortable cycle.',
    category: 'lifestyle',
  },
  {
    id: 'cyc_stress_care',
    title: 'Build a stress-care routine',
    description: 'Chronic stress can disrupt ovulation and cycle length — small daily habits add up.',
    category: 'emotional',
  },
]

/** Returns the static checklist item definitions for the given intent. */
export function getChecklistItems(intent: ChecklistIntent): ChecklistItemDef[] {
  return intent === 'ttc' ? TTC_ITEMS : CYCLE_ITEMS
}

/** Title shown above the checklist, by intent. */
export function getChecklistTitle(intent: ChecklistIntent): string {
  return intent === 'ttc' ? 'Conception prep' : 'Cycle health'
}
