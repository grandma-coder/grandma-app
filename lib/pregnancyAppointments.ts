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
