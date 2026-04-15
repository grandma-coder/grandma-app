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
