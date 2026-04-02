export interface LearningModule {
  id: string
  title: string
  description: string
  icon: string
  lessons: number
  category: 'fertility' | 'nutrition' | 'emotional' | 'financial' | 'partner'
}

export interface ChecklistItem {
  id: string
  title: string
  description: string
  category: string
  completed?: boolean
}

export const learningModules: LearningModule[] = [
  {
    id: 'fertility-basics',
    title: 'Fertility Basics',
    description: 'Understanding your cycle, ovulation windows, and how to maximize your chances.',
    icon: '🌸',
    lessons: 5,
    category: 'fertility',
  },
  {
    id: 'nutrition-prep',
    title: 'Nutrition Preparation',
    description: 'Prenatal vitamins, folic acid, diet adjustments, and foods to embrace or avoid.',
    icon: '🥗',
    lessons: 4,
    category: 'nutrition',
  },
  {
    id: 'emotional-readiness',
    title: 'Emotional Readiness',
    description: 'Preparing mentally and emotionally for parenthood. Managing expectations and fears.',
    icon: '🧘',
    lessons: 3,
    category: 'emotional',
  },
  {
    id: 'financial-planning',
    title: 'Financial Planning',
    description: 'Budgeting for a baby, insurance, parental leave, and building a safety net.',
    icon: '💰',
    lessons: 4,
    category: 'financial',
  },
  {
    id: 'partner-journey',
    title: 'Partner\'s Journey',
    description: 'How partners can prepare together, support each other, and build a parenting team.',
    icon: '💑',
    lessons: 3,
    category: 'partner',
  },
  {
    id: 'health-checkups',
    title: 'Pre-Conception Health',
    description: 'Doctor visits, genetic screening, vaccinations, and health optimizations before conceiving.',
    icon: '🏥',
    lessons: 4,
    category: 'fertility',
  },
]

export const preparationChecklist: ChecklistItem[] = [
  { id: 'prenatal-vitamins', title: 'Start prenatal vitamins', description: 'Begin folic acid at least 1 month before trying to conceive', category: 'health' },
  { id: 'doctor-visit', title: 'Schedule pre-conception checkup', description: 'Full health screening with your OB/GYN', category: 'health' },
  { id: 'dental-check', title: 'Dental checkup', description: 'Gum disease is linked to preterm birth — get checked early', category: 'health' },
  { id: 'vaccines', title: 'Update vaccinations', description: 'Ensure MMR, Tdap, and flu vaccines are current', category: 'health' },
  { id: 'track-cycle', title: 'Track your cycle', description: 'Know your ovulation window for at least 2-3 months', category: 'fertility' },
  { id: 'cut-alcohol', title: 'Reduce alcohol & caffeine', description: 'Start tapering now — zero alcohol when trying', category: 'lifestyle' },
  { id: 'exercise', title: 'Establish exercise routine', description: '30 min/day of moderate exercise improves fertility', category: 'lifestyle' },
  { id: 'finances', title: 'Review finances & insurance', description: 'Check maternity coverage, start a baby fund', category: 'planning' },
  { id: 'partner-talk', title: 'Have the partner conversation', description: 'Align on parenting values, roles, and expectations', category: 'planning' },
  { id: 'stress', title: 'Address stress sources', description: 'High cortisol affects fertility — find your calm', category: 'lifestyle' },
]
