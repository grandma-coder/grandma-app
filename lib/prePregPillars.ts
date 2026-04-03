import type { Pillar } from '../types'

export const prePregPillars: Pillar[] = [
  {
    id: 'fertility',
    name: 'Fertility Basics',
    icon: '🌸',
    description: 'Cycle tracking, ovulation, conception tips, and understanding your fertile window.',
    color: '#F9A8D4',
    tips: [
      { label: 'Know your cycle', text: 'Track your period to identify your fertile window — typically days 10-16 of a 28-day cycle. Ovulation is when conception can happen.' },
      { label: 'Ovulation signs', text: 'Watch for egg-white cervical mucus, mild pelvic cramps, and a slight temperature rise. These signal ovulation.' },
      { label: 'Timing', text: 'The best chance of conception is 1-2 days before ovulation. Sperm can survive up to 5 days inside the body.' },
    ],
    suggestions: [
      'How do I track my ovulation?',
      'What is the best time to conceive?',
      'How long does it typically take to get pregnant?',
      'What are signs that I\'m ovulating?',
    ],
  },
  {
    id: 'nutrition-prep',
    name: 'Nutrition Prep',
    icon: '🥑',
    description: 'Prenatal vitamins, folic acid, diet optimization, and preparing your body.',
    color: '#86EFAC',
    tips: [
      { label: 'Start folic acid now', text: 'Take 400mcg of folic acid daily at least 1-3 months before conceiving. It prevents neural tube defects.' },
      { label: 'Prenatal vitamins', text: 'Start a prenatal vitamin with folic acid, iron, calcium, and DHA before conception — not after.' },
      { label: 'Clean up your diet', text: 'Reduce processed foods, increase fruits/vegetables, whole grains, and lean proteins. Limit caffeine to 200mg/day.' },
    ],
    suggestions: [
      'When should I start taking prenatal vitamins?',
      'What foods boost fertility?',
      'Should I change my diet before trying to conceive?',
      'How much folic acid do I need?',
    ],
  },
  {
    id: 'emotional-readiness',
    name: 'Emotional Readiness',
    icon: '💛',
    description: 'Managing expectations, anxiety, and preparing emotionally for parenthood.',
    color: '#FDE68A',
    tips: [
      { label: 'It\'s a journey', text: 'Getting pregnant can take time. The average healthy couple takes 6-12 months. Be patient with yourself and your body.' },
      { label: 'Talk about it', text: 'Discuss fears, expectations, and parenting values with your partner. Alignment now prevents conflict later.' },
      { label: 'Manage stress', text: 'High stress can affect fertility. Practice meditation, exercise, and set boundaries around the trying-to-conceive process.' },
    ],
    suggestions: [
      'How do I deal with the stress of trying to conceive?',
      'Is it normal to feel anxious about getting pregnant?',
      'How do I stay positive during the TTC journey?',
      'What conversations should we have before trying?',
    ],
  },
  {
    id: 'financial-planning',
    name: 'Financial Planning',
    icon: '💰',
    description: 'Budgeting for baby, insurance coverage, and planning ahead financially.',
    color: '#FDBA74',
    tips: [
      { label: 'Insurance review', text: 'Check your health insurance for maternity coverage, deductibles, and pediatrician networks before conceiving.' },
      { label: 'Baby budget', text: 'The first year costs $12,000-$15,000 on average. Start saving now for diapers, formula, childcare, and gear.' },
      { label: 'Emergency fund', text: 'Aim for 3-6 months of expenses saved. Pregnancy can bring unexpected costs and potential time off work.' },
    ],
    suggestions: [
      'How much does having a baby cost?',
      'What should I budget for in the first year?',
      'How do I check my maternity insurance coverage?',
      'When should I start a college savings fund?',
    ],
  },
  {
    id: 'partner-journey',
    name: 'Partner Journey',
    icon: '💑',
    description: 'Preparing together, shared health checks, and building a strong foundation.',
    color: '#C4B5FD',
    tips: [
      { label: 'Both get checked', text: 'Both partners should have a pre-conception checkup. Male fertility accounts for ~40% of conception issues.' },
      { label: 'Lifestyle together', text: 'Both partners should quit smoking, limit alcohol, and improve diet. Sperm health takes 3 months to improve.' },
      { label: 'Communication', text: 'Discuss parenting styles, division of responsibilities, and support systems before pregnancy begins.' },
    ],
    suggestions: [
      'Should my partner also see a doctor before trying?',
      'How can my partner improve fertility?',
      'What lifestyle changes should we make together?',
      'How do we prepare our relationship for a baby?',
    ],
  },
  {
    id: 'health-checkups',
    name: 'Health Checkups',
    icon: '🩺',
    description: 'Pre-conception tests, genetic screening, and getting your body ready.',
    color: '#93C5FD',
    tips: [
      { label: 'Pre-conception visit', text: 'See your OB/GYN for a full checkup. Discuss medications, chronic conditions, and vaccination status (rubella, chickenpox).' },
      { label: 'Genetic screening', text: 'Carrier screening can identify if you or your partner carry genes for conditions like cystic fibrosis or sickle cell.' },
      { label: 'Dental check', text: 'Get dental work done before pregnancy. Pregnancy hormones can worsen gum disease, and some procedures are restricted.' },
    ],
    suggestions: [
      'What tests should I get before trying to conceive?',
      'Should we do genetic testing?',
      'What medications should I stop before pregnancy?',
      'Do I need any vaccinations before getting pregnant?',
    ],
  },
]
