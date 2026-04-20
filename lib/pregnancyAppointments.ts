// lib/pregnancyAppointments.ts
// Standard pregnancy appointment timeline — pre-seeded for all users

export interface StandardAppointment {
  id: string
  week: number
  name: string
  type: 'ultrasound' | 'blood_test' | 'checkup' | 'test'
  description: string
  prepNote: string
  whatToExpect: string
  questions: string[]
}

export const STANDARD_APPOINTMENTS: StandardAppointment[] = [
  {
    id: 'nt_scan',
    week: 12,
    name: 'NT Scan',
    type: 'ultrasound',
    description: 'Nuchal translucency ultrasound to screen for chromosomal conditions.',
    prepNote: 'Drink water beforehand for a full bladder. Bring your partner if you\'d like.',
    whatToExpect:
      'A 30-minute ultrasound. The technician measures the fluid behind baby\'s neck and checks early development. You may see baby move for the first time.',
    questions: [
      'What does the NT measurement mean for my pregnancy?',
      'Should I do additional screening (NIPT, CVS)?',
      'When should I schedule my next appointment?',
      'Are there foods or activities to avoid right now?',
    ],
  },
  {
    id: 'quad_screen',
    week: 16,
    name: 'Quad Screen',
    type: 'blood_test',
    description: 'Blood test screening for neural tube defects and chromosomal abnormalities.',
    prepNote: 'No special prep needed. Results take 1–2 weeks.',
    whatToExpect:
      'A simple blood draw — under 5 minutes. You\'ll get a risk-screening report combining four protein markers with your age and history.',
    questions: [
      'How will I receive the results?',
      'What happens if the screen is positive?',
      'Do I also need a glucose test or anatomy scan now?',
      'Is my weight gain on track?',
    ],
  },
  {
    id: 'anatomy_scan',
    week: 20,
    name: 'Anatomy Scan',
    type: 'ultrasound',
    description: 'Detailed ultrasound to check all baby\'s organs and structures.',
    prepNote: 'This is the big one! You may find out the sex. Bring your partner.',
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
    prepNote: 'Fast for 8 hours beforehand. Drink the glucose solution within 5 minutes.',
    whatToExpect:
      'Drink the glucola, wait one hour seated in the office, then a quick blood draw. Bring a book — feeling jittery or nauseous afterwards is normal.',
    questions: [
      'When will I know my result?',
      'What happens if I need the 3-hour test?',
      'Should I change anything in my diet now?',
      'Any other tests due this trimester?',
    ],
  },
  {
    id: 'rh_factor',
    week: 28,
    name: 'Rh Factor',
    type: 'blood_test',
    description: 'Checks your Rh blood type. If Rh-negative, you\'ll get a RhoGAM shot.',
    prepNote: 'No special prep. Quick blood draw.',
    whatToExpect:
      'A blood draw and possibly the RhoGAM injection in the same visit if you\'re Rh-negative. A repeat dose is given after birth if needed.',
    questions: [
      'Am I Rh-positive or negative?',
      'Do I need the RhoGAM shot today?',
      'When do kick counts officially start?',
      'How often will appointments be from now on?',
    ],
  },
  {
    id: 'growth_check',
    week: 32,
    name: 'Growth Check',
    type: 'checkup',
    description: 'Checks baby\'s size, position, and amniotic fluid levels.',
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
    description: 'Swab to check for GBS bacteria. If positive, antibiotics given during labor.',
    prepNote: 'Quick and painless swab. Results in a few days.',
    whatToExpect:
      'A 30-second vaginal and rectal swab during your appointment. Painless. Results come back within a week — IV antibiotics during labor if positive.',
    questions: [
      'When will I get GBS results?',
      'What\'s the antibiotic plan if positive?',
      'How will we know I\'m really in labor?',
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
      'A cervical check (optional), confirmation of baby\'s position, and a final Q&A. Weekly visits continue until labor — bring everything you\'re wondering about.',
    questions: [
      'Am I dilating or effacing yet?',
      'What\'s your induction policy if I go past 40 weeks?',
      'Who will deliver if you\'re not on call?',
      'When do I call the office vs. go straight to L&D?',
    ],
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
