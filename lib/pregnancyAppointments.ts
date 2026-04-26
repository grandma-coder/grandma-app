// lib/pregnancyAppointments.ts
// Standard pregnancy appointment timeline — pre-seeded for all users.
// Aligned with ACOG-recommended prenatal care: 10 universal milestones from
// confirmation through pre-birth. Conditional items (3-hr GTT, amnio, NST,
// flu shot, COVID booster) are intentionally not in the curve to keep it
// focused — they surface contextually elsewhere.

export interface StandardAppointment {
  id: string
  week: number
  name: string
  type: 'ultrasound' | 'blood_test' | 'checkup' | 'test' | 'vaccine'
  description: string
  prepNote: string
  whatToExpect: string
  questions: string[]
}

export const STANDARD_APPOINTMENTS: StandardAppointment[] = [
  {
    id: 'first_visit',
    week: 8,
    name: 'First Visit',
    type: 'checkup',
    description:
      'Your initial OB visit. Confirms pregnancy, dates baby, and runs the full panel of baseline labs.',
    prepNote:
      'Bring family medical history and a list of medications. Plan for ~60 minutes — first visits are long.',
    whatToExpect:
      'Pregnancy confirmation, dating ultrasound, full prenatal labs (CBC, blood type & Rh, HIV, syphilis, hep B, rubella, urine), pap smear if due, and a long Q&A. You\'ll also be offered carrier screening and NIPT.',
    questions: [
      'What\'s my official due date?',
      'Should I do carrier screening and/or NIPT?',
      'Which prenatal vitamin do you recommend?',
      'What\'s the on-call coverage if you\'re not available?',
    ],
  },
  {
    id: 'nipt',
    week: 10,
    name: 'NIPT (cfDNA)',
    type: 'blood_test',
    description:
      'Non-invasive prenatal test — a blood draw that screens for chromosomal conditions and can reveal sex.',
    prepNote:
      'No fasting needed. Confirm coverage with your insurance — costs vary widely.',
    whatToExpect:
      'A simple blood draw. Results take 7–10 days. The report covers Down syndrome, trisomy 18, trisomy 13, and sex chromosomes. It is a screening test, not diagnostic.',
    questions: [
      'How accurate is the result for my age and history?',
      'Do you want to share the sex with us when it comes back?',
      'What\'s the next step if the screen is positive?',
      'Does this replace the need for the quad screen?',
    ],
  },
  {
    id: 'nt_scan',
    week: 12,
    name: 'NT Scan',
    type: 'ultrasound',
    description: 'Nuchal translucency ultrasound to screen for chromosomal conditions.',
    prepNote: "Drink water beforehand for a full bladder. Bring your partner if you'd like.",
    whatToExpect:
      "A 30-minute ultrasound. The technician measures the fluid behind baby's neck and checks early development. You may see baby move for the first time.",
    questions: [
      'What does the NT measurement mean for my pregnancy?',
      'How does this combine with my NIPT result?',
      'When should I schedule my next appointment?',
      'Are there foods or activities to avoid right now?',
    ],
  },
  {
    id: 'quad_screen',
    week: 16,
    name: 'Quad Screen',
    type: 'blood_test',
    description:
      'Blood test screening for neural tube defects and chromosomal abnormalities. Often skipped if NIPT was done.',
    prepNote: 'No special prep. Results take 1–2 weeks. Skip if NIPT covered your screening.',
    whatToExpect:
      "A simple blood draw — under 5 minutes. Combines four protein markers with your age and history into a single risk score.",
    questions: [
      'Do I still need this if my NIPT was normal?',
      'How will I receive the results?',
      'What happens if the screen is positive?',
      'Is my weight gain on track?',
    ],
  },
  {
    id: 'anatomy_scan',
    week: 20,
    name: 'Anatomy Scan',
    type: 'ultrasound',
    description: "Detailed ultrasound to check all baby's organs and structures.",
    prepNote: 'This is the big one. You may find out the sex. Bring your partner.',
    whatToExpect:
      'A 45–60 minute ultrasound. The sonographer measures every organ, the placenta, and amniotic fluid. Bring snacks — baby may need encouragement to move.',
    questions: [
      'Is the baby measuring on track?',
      'Where is the placenta — will it move?',
      'Do you want to share the sex with us?',
      'Are there any markers I should know about?',
    ],
  },
  {
    id: 'glucose_test',
    week: 24,
    name: 'Glucose Test',
    type: 'test',
    description: '1-hour glucose challenge to screen for gestational diabetes.',
    prepNote: 'Drink the glucose solution within 5 minutes when you arrive. Eat normally before — fasting is not required for the 1-hour.',
    whatToExpect:
      'Drink the glucola, wait one hour seated in the office, then a quick blood draw. Bring a book — feeling jittery or nauseous afterwards is normal. If positive, a 3-hour fasting test is scheduled.',
    questions: [
      'When will I know my result?',
      'What happens if I need the 3-hour test?',
      'Should I change anything in my diet now?',
      'Any other tests due this trimester?',
    ],
  },
  {
    id: 'visit_28',
    week: 28,
    name: '28-Week Visit',
    type: 'vaccine',
    description:
      'A combined visit: Tdap vaccine, Rh antibody screen + RhoGAM if Rh-negative, and the start of more frequent appointments.',
    prepNote:
      'Wear a sleeve that rolls up easily — you\'ll get the Tdap and possibly RhoGAM. Start formal kick counts after this visit.',
    whatToExpect:
      'Tdap booster (protects baby from whooping cough; given every pregnancy regardless of past vaccines). If you\'re Rh-negative, you\'ll also get the RhoGAM injection. Visits move from monthly to every 2 weeks after this point.',
    questions: [
      'Am I Rh-positive or negative — do I need RhoGAM today?',
      'Any side effects from Tdap I should watch for?',
      'When and how should I start kick counts?',
      'How often will visits be from now on?',
    ],
  },
  {
    id: 'growth_check',
    week: 32,
    name: 'Growth Check',
    type: 'checkup',
    description: "Checks baby's size, position, and amniotic fluid levels.",
    prepNote: 'Good time to discuss your birth plan with your provider.',
    whatToExpect:
      'A standard checkup with fundal-height measurement, fetal heartbeat, and possibly a growth ultrasound. Bring questions about your birth preferences.',
    questions: [
      'Is the baby head-down yet?',
      'Are my fluid levels normal?',
      'Can we go over my birth plan?',
      'When should I take a hospital tour?',
    ],
  },
  {
    id: 'group_b_strep',
    week: 36,
    name: 'Group B Strep Test',
    type: 'test',
    description: 'Swab to check for GBS bacteria. If positive, IV antibiotics are given during labor.',
    prepNote: 'Quick and painless swab. Results in a few days. Visits move to weekly after this.',
    whatToExpect:
      'A 30-second vaginal and rectal swab during your appointment. Painless. Results come back within a week — IV antibiotics during labor if positive.',
    questions: [
      'When will I get GBS results?',
      "What's the antibiotic plan if positive?",
      "How will we know I'm really in labor?",
      'When should I head to the hospital?',
    ],
  },
  {
    id: 'prebirth_check',
    week: 38,
    name: 'Pre-birth Check',
    type: 'checkup',
    description: 'Final checkup before due date. Cervical check, baby position, final questions.',
    prepNote: 'Bring your hospital bag checklist. Ask about induction policies.',
    whatToExpect:
      "A cervical check (optional), confirmation of baby's position, and a final Q&A. Weekly visits continue until labor — bring everything you're wondering about.",
    questions: [
      'Am I dilating or effacing yet?',
      "What's your induction policy if I go past 40 weeks?",
      "Who will deliver if you're not on call?",
      'When do I call the office vs. go straight to L&D?',
    ],
  },
]

export function getAppointmentByWeek(week: number): StandardAppointment | undefined {
  return STANDARD_APPOINTMENTS.find((a) => a.week === week)
}

export function getUpcomingAppointment(currentWeek: number): StandardAppointment | undefined {
  return STANDARD_APPOINTMENTS.find((a) => a.week >= currentWeek)
}

export function getPastAppointments(currentWeek: number): StandardAppointment[] {
  return STANDARD_APPOINTMENTS.filter((a) => a.week < currentWeek)
}
