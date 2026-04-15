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
