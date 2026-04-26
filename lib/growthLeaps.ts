/**
 * Growth Leaps (Wonder Weeks) — shared data + age helper.
 *
 * 10 mental leaps from week 5 to week 75 post-birth. Each leap has
 * brain-development context, three phases (stormy / peak / emerging),
 * observable signs, emerging skills, parent-led activities, and a tip.
 */

export interface GrowthLeapPhase {
  label: string
  desc: string
}

export interface GrowthLeap {
  week: number
  name: string
  desc: string
  ageRange: string
  duration: string
  brainNote: string
  color: string
  phases: GrowthLeapPhase[]
  signs: string[]
  skills: string[]
  activities: string[]
  tip: string
}

export const GROWTH_LEAPS: GrowthLeap[] = [
  {
    week: 5, name: 'Changing Sensations', desc: 'Baby discovers a richer world of senses',
    ageRange: '4–5 weeks', duration: '1–2 weeks',
    brainNote: 'The nervous system undergoes a first major reorganization. Your baby\'s brain is suddenly receiving far more detailed signals from the senses — sharper sights, richer sounds, new body feelings. It\'s overwhelming and wonderful at the same time.',
    color: '#B983FF',
    phases: [
      { label: 'Stormy', desc: 'More crying, clinginess, disrupted sleep. Baby is overwhelmed by the new flood of sensory information.' },
      { label: 'Peak Leap', desc: 'The brain is intensely processing new sensory input. Fussiness may peak before calming.' },
      { label: 'Emerging', desc: 'New sensory awareness blossoms — you\'ll notice longer alert periods and more deliberate looking.' },
    ],
    signs: ['More crying than usual', 'Wants to feed constantly', 'Harder to settle', 'Prefers closeness', 'Startles more easily', 'Dislikes being undressed'],
    skills: ['Reacts to light & sound', 'Smoother gaze tracking', 'Early social smile', 'More alert periods', 'Turns toward your voice', 'Notices high-contrast patterns'],
    activities: ['Hold baby facing outward to explore the room', 'Show high-contrast black & white cards', 'Narrate everything you do out loud', 'Gentle baby massage during calm moments'],
    tip: 'Skin-to-skin contact is powerful right now. Babywearing and gentle rocking ease the stormy phase.',
  },
  {
    week: 8, name: 'Patterns', desc: 'Recognizing simple repeating patterns in the world',
    ageRange: '7–8 weeks', duration: '1–2 weeks',
    brainNote: 'Your baby\'s brain starts detecting repeating patterns in sound, movement, and visual input. This is the foundation for all future learning — understanding that the world is predictable and has structure.',
    color: '#4D96FF',
    phases: [
      { label: 'Stormy', desc: 'Night waking, cluster feeding, and fussiness spike as the brain works overtime to catalog patterns.' },
      { label: 'Peak Leap', desc: 'Baby is actively building neural pathways for pattern recognition. Intense brain work.' },
      { label: 'Emerging', desc: 'Baby recognizes familiar faces, voices, and daily routines with obvious pleasure.' },
    ],
    signs: ['Night waking increases', 'Cluster feeding', 'Wants to be held more', 'Quieter during feeds', 'Stares at complex shapes', 'Calms to familiar sounds'],
    skills: ['Recognizes your face & voice', 'Tracks moving objects', 'Coos & vocalizes', 'Reacts to routines', 'Distinguishes happy vs. sad tones', 'Brief social smiling'],
    activities: ['Sing the same lullaby at bedtime every night', 'Repeat simple rhymes with rhythm', 'Show a mobile with slowly moving parts', 'Create a consistent feeding ritual'],
    tip: 'Consistent routines help — baby is learning to predict sequences. Sing the same songs, do the same bedtime steps.',
  },
  {
    week: 12, name: 'Smooth Transitions', desc: 'Movements and muscle control become more fluid',
    ageRange: '11–12 weeks', duration: '1–2 weeks',
    brainNote: 'Motor neurons are rapidly myelinating, enabling smoother, more coordinated movements. Your baby transitions from jerky reflexes to intentional, fluid motion — a massive upgrade in physical self-awareness.',
    color: '#A2FF86',
    phases: [
      { label: 'Stormy', desc: 'Sleep disruption, demanding behavior, and increased feeding as energy is redirected to motor development.' },
      { label: 'Peak Leap', desc: 'Motor pathways are rapidly reorganizing. Baby may seem restless or frustrated by new physical sensations.' },
      { label: 'Emerging', desc: 'Smoother movements, social smiling, and first real laughs appear as new motor control clicks into place.' },
    ],
    signs: ['Sleep regression', 'Increased fussiness', 'More feeding', 'Wants visual stimulation', 'Dislikes being still', 'Practices movements repetitively'],
    skills: ['Steady head control', 'Hands to midline', 'First real laughs', 'Grasps objects briefly', 'Kicks legs rhythmically', 'Brings hands to mouth intentionally'],
    activities: ['Daily tummy time in 3–5 min sessions', 'Let baby bat at hanging toys', 'Supported sitting with back support', 'Move baby\'s arms & legs in bicycle motion'],
    tip: 'Daily tummy time (3–5 min sessions) supports the motor milestones emerging in this leap.',
  },
  {
    week: 19, name: 'Events', desc: 'Understanding that actions happen in sequences',
    ageRange: '14–19 weeks', duration: '3–6 weeks',
    brainNote: 'Baby\'s brain starts to perceive the world as a series of events rather than a static blur. Actions have beginnings, middles, and ends. This is the birth of cause-and-effect thinking — and why everything suddenly seems so fascinating.',
    color: '#FBBF24',
    phases: [
      { label: 'Stormy', desc: 'Clingy, cries when put down, sleep disrupted. Baby is mentally exhausted from processing complex event chains.' },
      { label: 'Peak Leap', desc: 'Brain is actively linking actions into cause-and-effect chains. Intense cognitive work happening.' },
      { label: 'Emerging', desc: 'Intentional reaching appears, along with early object permanence — baby looks for dropped items.' },
    ],
    signs: ['Separation anxiety spike', 'Very clingy', 'Crying when toy falls', 'Resists naps', 'Demands interaction', 'Frustrated when routine breaks'],
    skills: ['Reaches & grabs intentionally', 'Shakes & bangs toys', 'Recognizes games', 'Understands "up" & "down"', 'Follows moving objects with eyes', 'Laughs at surprises'],
    activities: ['Peek-a-boo and hide-and-seek games', 'Rolling a ball back and forth', 'Simple cause-effect toys (press = sound)', 'Narrate daily routines step-by-step'],
    tip: 'Play simple cause-and-effect games like peek-a-boo — baby is learning that events have predictable outcomes.',
  },
  {
    week: 26, name: 'Relationships', desc: 'Grasping how things and people relate to each other',
    ageRange: '22–26 weeks', duration: '4–5 weeks',
    brainNote: 'Baby\'s brain builds its first relational maps — understanding that objects and people exist in relation to one another. Distance, closeness, inside/outside, near/far all become meaningful. This triggers object permanence and separation anxiety simultaneously.',
    color: '#FF8AD8',
    phases: [
      { label: 'Stormy', desc: 'Stranger anxiety and clinginess peak. Baby now understands "you can leave" — which is terrifying.' },
      { label: 'Peak Leap', desc: 'Brain is building relational frameworks at full speed. This is one of the most intense leaps emotionally.' },
      { label: 'Emerging', desc: 'Object permanence solidifies, imitation begins, and spatial awareness (in/out, up/down) appears.' },
    ],
    signs: ['Stranger anxiety peaks', 'Cries when you leave room', 'Wakes at night more', 'Clingy during day', 'Reaches for familiar people', 'Rejects unfamiliar faces'],
    skills: ['Object permanence (looks for hidden toys)', 'Imitates gestures', 'Understands "no"', 'Pivots when sitting', 'Drops items intentionally to watch fall', 'Explores spatial relationships'],
    activities: ['Hide toys under a cloth and let baby find them', 'Stack/nest cups together', 'Consistent goodbye ritual — never sneak out', 'Let baby explore containers (in & out)'],
    tip: 'Play hide-and-seek with toys to reinforce object permanence. Consistent goodbyes (don\'t sneak out) reduce separation anxiety.',
  },
  {
    week: 37, name: 'Categories', desc: 'Grouping the world into mental categories',
    ageRange: '33–37 weeks', duration: '4–5 weeks',
    brainNote: 'The brain begins organizing the world into abstract groups — animals, foods, people, colors. This mental filing system is the foundation for language and logic. First words often appear during or just after this leap.',
    color: '#FF6B35',
    phases: [
      { label: 'Stormy', desc: 'Demanding behavior, picky eating, night waking as the brain reorganizes around categorical thinking.' },
      { label: 'Peak Leap', desc: 'Brain is actively sorting experiences into groups. Baby may seem more selective and opinionated.' },
      { label: 'Emerging', desc: 'Baby sorts objects by type, points to body parts, and may say first recognizable words.' },
    ],
    signs: ['Picky eating resumes', 'More demanding', 'Clingy with primary caregiver', 'Short naps', 'Points at things of interest', 'Examines objects closely'],
    skills: ['Groups similar objects', 'Points to body parts', 'Says first words', 'Waves bye-bye', 'Distinguishes people from objects', 'Claps hands together'],
    activities: ['Sort toys by color or shape together', 'Read picture books and name each image', 'Point to body parts ("where\'s your nose?")', 'Group foods by type at meal time'],
    tip: 'Name everything — "big ball, small ball". Sorting games and books with clear categories accelerate this leap.',
  },
  {
    week: 46, name: 'Sequences', desc: 'Following multi-step actions toward a goal',
    ageRange: '41–46 weeks', duration: '4–6 weeks',
    brainNote: 'Baby\'s brain learns to chain actions together into purposeful sequences — a monumental shift. Planning, goal-directed behavior, and early problem-solving emerge. This is why everything suddenly needs to be done in order.',
    color: '#67E8F9',
    phases: [
      { label: 'Stormy', desc: 'Frustration tantrums and whining increase as baby knows what they want to accomplish but can\'t always do it.' },
      { label: 'Peak Leap', desc: 'Brain is chaining multi-step sequences together. Baby is mentally exhausted from planning.' },
      { label: 'Emerging', desc: 'Stacking blocks, putting things in containers, and early pretend play all emerge.' },
    ],
    signs: ['Frustration & tantrums', 'Whines more', 'Very clingy', 'Resists bedtime', 'Insists on doing things themselves', 'Upset when sequence interrupted'],
    skills: ['Stacks 2–3 blocks', 'Puts things in containers', 'Pretend play begins', 'Follows 1-step commands', 'Pulls to stand', 'Cruises along furniture'],
    activities: ['Stack and knock down blocks together', 'Shape sorter toys', 'Simple 2-step instructions ("get the ball, bring it here")', 'Pretend feeding stuffed animals'],
    tip: 'Model sequences out loud: "First we put on shoes, then we go outside." Step-by-step narration builds understanding.',
  },
  {
    week: 55, name: 'Programs', desc: 'Understanding flexible programs — different ways to reach a goal',
    ageRange: '49–55 weeks', duration: '4–6 weeks',
    brainNote: 'Baby discovers that goals can be achieved in multiple ways — there isn\'t just one path. This "flexible programming" unlocks creative problem-solving and imagination. It also triggers strong opinions, because baby now knows what they want and can envision alternatives.',
    color: '#A2FF86',
    phases: [
      { label: 'Stormy', desc: 'Strong opinions, meltdowns, and sleep regression as toddler grapples with the concept of alternatives.' },
      { label: 'Peak Leap', desc: 'Brain is discovering flexible problem-solving pathways. Toddler is mentally overwhelmed but driven.' },
      { label: 'Emerging', desc: 'Problem-solving, rich pretend play scenarios, and a vocabulary surge all emerge.' },
    ],
    signs: ['Big emotions & meltdowns', 'Testing limits constantly', 'Picky sleep routine', 'Clingy at drop-off', 'Experiments with different approaches', 'Refuses help with tasks'],
    skills: ['Stacks 4–6 blocks', 'Pretend scenarios (feeding dolls)', 'Vocabulary surge', 'Completes simple puzzles', 'Uses spoon with some success', 'Understands "mine"'],
    activities: ['Simple puzzles (3–4 pieces)', 'Offer 2 ways to do same task and let them choose', 'Water play — pour, fill, dump', 'Pretend kitchen with pots and spoons'],
    tip: 'Give limited choices ("red cup or blue cup?") — baby needs to feel agency while brain builds flexible thinking.',
  },
  {
    week: 64, name: 'Principles', desc: 'Grasping invisible rules that govern the world',
    ageRange: '59–64 weeks', duration: '5–6 weeks',
    brainNote: 'Toddler\'s brain starts internalizing abstract principles — rules that can\'t be seen but govern behavior. Fairness, sharing, and cause-and-consequence become real. This is why "no" becomes a favorite word — toddler is actively testing which principles apply.',
    color: '#FBBF24',
    phases: [
      { label: 'Stormy', desc: 'Rule-testing and boundary-pushing intensify. Toddler must test every principle to map how the world works.' },
      { label: 'Peak Leap', desc: 'Brain is internalizing principles and social rules at full speed. Emotional regulation is strained.' },
      { label: 'Emerging', desc: 'Fairness concept emerges, empathy appears, and toddler starts negotiating.' },
    ],
    signs: ['Rule-testing behavior', 'Says "no" frequently', 'Emotional intensity', 'Sleep resistance', 'Insists on "my turn"', 'Cries when things are unfair'],
    skills: ['Understands fairness', 'Shows empathy', 'Sentences of 2–3 words', 'Sorts by color/shape', 'Follows 2-step instructions', 'Helps with simple tasks'],
    activities: ['Simple board games with turn-taking', 'Explain rules calmly and consistently', 'Read books about emotions and fairness', 'Involve in household chores (sweeping, wiping)'],
    tip: 'Be consistent with rules — toddler is actively mapping which principles apply in which contexts.',
  },
  {
    week: 75, name: 'Systems', desc: 'Understanding complex systems with interacting parts',
    ageRange: '70–75 weeks', duration: '4–6 weeks',
    brainNote: 'The final Wonder Week leap — toddler\'s brain now models complex systems: family dynamics, nature, society, cause-and-effect chains with many links. This is the foundation of adult thinking. The questions become deep, the roleplay becomes rich, and independence flourishes.',
    color: '#4D96FF',
    phases: [
      { label: 'Stormy', desc: 'Defiance and strong-willed behavior peak. Toddler is asserting their new understanding of how systems work.' },
      { label: 'Peak Leap', desc: 'Brain is modeling complex systems — family, seasons, routines, social hierarchies.' },
      { label: 'Emerging', desc: 'Rich roleplay, deep questions, extended independent play, and growing self-regulation appear.' },
    ],
    signs: ['Defiance spikes', 'Tests every boundary', 'Very emotional', 'Sleep disruption', 'Prefers specific people', 'Narrates own actions'],
    skills: ['Complex roleplay', 'Asks "why" constantly', 'Understands your system/routine', 'Extended independent play', 'Shows concern for others', '3+ word sentences'],
    activities: ['Elaborate pretend play (house, shop, hospital)', 'Answer "why" questions with real explanations', 'Explore nature — plants, animals, weather', 'Age-appropriate board games with strategy'],
    tip: 'Engage the curiosity — answer "why" questions with real explanations. Big questions deserve real answers at this stage.',
  },
]

export type GrowthLeapStatus = 'past' | 'current' | 'future'

/** A leap is "current" within ±1 week of its peak (window: week-2 to week+1). */
export function leapStatusForWeek(weekAge: number, leapWeek: number): GrowthLeapStatus {
  if (weekAge >= leapWeek - 2 && weekAge <= leapWeek + 1) return 'current'
  if (weekAge > leapWeek + 1) return 'past'
  return 'future'
}

export interface ActiveGrowthLeap {
  leap: GrowthLeap
  index: number
  weekAge: number
  /** 'active' = currently in the leap window. 'upcoming' = next future leap. 'done' = past final leap. */
  status: 'active' | 'upcoming' | 'done'
  /** 0..1 progress through the current leap window (active only) */
  progress: number
  /** -1 if not active; otherwise 0/1/2 = stormy/peak/emerging */
  phaseIndex: number
  /** Weeks until the next leap starts (upcoming only) */
  weeksUntil?: number
  /** How many leaps have already finished */
  completedCount: number
}

/** Returns the leap currently happening, the next upcoming leap, or 'done' if past the last. */
export function getActiveGrowthLeap(birthDateISO: string): ActiveGrowthLeap | null {
  if (!birthDateISO) return null
  const birth = new Date(birthDateISO)
  if (isNaN(birth.getTime())) return null
  const now = new Date()
  const weekAge = Math.max(0, Math.floor((now.getTime() - birth.getTime()) / (7 * 24 * 60 * 60 * 1000)))

  let completedCount = 0
  for (let i = 0; i < GROWTH_LEAPS.length; i++) {
    const leap = GROWTH_LEAPS[i]
    const start = leap.week - 2
    const end = leap.week + 1

    if (weekAge >= start && weekAge <= end) {
      const offset = weekAge - start
      const phaseIndex = offset <= 1 ? 0 : offset === 2 ? 1 : 2
      const progress = (weekAge - start) / (end - start)
      return { leap, index: i, weekAge, status: 'active', progress, phaseIndex, completedCount }
    }
    if (weekAge < start) {
      return { leap, index: i, weekAge, status: 'upcoming', progress: 0, phaseIndex: -1, weeksUntil: start - weekAge, completedCount }
    }
    completedCount = i + 1
  }
  // Past the last leap
  return {
    leap: GROWTH_LEAPS[GROWTH_LEAPS.length - 1],
    index: GROWTH_LEAPS.length - 1,
    weekAge,
    status: 'done',
    progress: 1,
    phaseIndex: -1,
    completedCount: GROWTH_LEAPS.length,
  }
}

/** Compute child's age in weeks from birth date. */
export function weekAgeFromBirth(birthDateISO: string): number {
  if (!birthDateISO) return 0
  const birth = new Date(birthDateISO)
  if (isNaN(birth.getTime())) return 0
  const now = new Date()
  return Math.max(0, Math.floor((now.getTime() - birth.getTime()) / (7 * 24 * 60 * 60 * 1000)))
}
