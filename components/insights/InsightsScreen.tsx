/**
 * Insights Screen — Parent Companion
 *
 * Today:   Daily brief, weekly progress, AI insights, motivation
 * Reads:   Curated age-appropriate articles for parents
 * History: Past AI-generated insights (archived)
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import {
  View, Text, Pressable, ScrollView, RefreshControl,
  ActivityIndicator, StyleSheet, Modal,
} from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import {
  ArrowLeft, Sparkles, Clock, Brain, Heart, Zap,
  Lightbulb, TrendingUp, CalendarClock, X, MessageCircle,
  RefreshCw, AlertTriangle, ChevronRight, BookOpen, RotateCcw,
  Moon, Apple, Shield, Flame, BarChart3, Activity, Coffee,
  MessageSquare, Sun,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTheme, brand, stickers as stickerPalette, getModeColor, getModeColorSoft } from '../../constants/theme'
import { stickerForEmoji } from '../../lib/emojiToSticker'
import { GrandmaLogo } from '../ui/GrandmaLogo'
import { NotifyHealthAlert, TalkMaster } from '../stickers/RewardStickers'
import { useModeStore } from '../../store/useModeStore'
import { useChildStore } from '../../store/useChildStore'
import { useJourneyStore } from '../../store/useJourneyStore'
import {
  fetchInsights, fetchArchivedInsights, generateInsights,
  archiveInsight, restoreInsight, archiveStaleInsights,
  fetchBehaviorMetrics,
  type Insight, type InsightType, type BehaviorMetrics,
} from '../../lib/insights'
import { usePregnancyStore } from '../../store/usePregnancyStore'
import { getWeekData, getCurrentWeekFromDueDate } from '../../lib/pregnancyData'
import { getDailyAffirmation } from '../../lib/pregnancyAffirmations'
import { getBirthFocusForWeek } from '../../lib/pregnancyInsights'
import type { BirthFocusCard } from '../../lib/pregnancyInsights'
import { getUpcomingAppointment } from '../../lib/pregnancyAppointments'
import { getFeaturedReadForWeek, getReadsByCategory } from '../../lib/pregnancyReads'
import type { PregnancyRead } from '../../lib/pregnancyReads'

// ─── AI Insight Type Config ───────────────────────────────────────────────

const TYPE_CONFIG: Record<InsightType, {
  icon: typeof Lightbulb
  color: string
  gradient: readonly [string, string]
  label: string
  detailIcon: typeof Brain
  tip: string
}> = {
  pattern: {
    icon: Lightbulb, color: stickerPalette.yellowInk,
    gradient: [stickerPalette.yellowSoft, stickerPalette.yellowSoft + '00'],
    label: 'Pattern', detailIcon: Brain,
    tip: 'Patterns become clearer with consistent logging over time.',
  },
  trend: {
    icon: TrendingUp, color: stickerPalette.greenInk,
    gradient: [stickerPalette.greenSoft, stickerPalette.greenSoft + '00'],
    label: 'Trend', detailIcon: Zap,
    tip: 'Trends are calculated from your recent 30-day activity window.',
  },
  upcoming: {
    icon: CalendarClock, color: stickerPalette.blueInk,
    gradient: [stickerPalette.blueSoft, stickerPalette.blueSoft + '00'],
    label: 'Upcoming', detailIcon: CalendarClock,
    tip: 'Predictions improve as we learn more about your unique rhythms.',
  },
  nudge: {
    icon: Sparkles, color: stickerPalette.pinkInk,
    gradient: [stickerPalette.pinkSoft, stickerPalette.pinkSoft + '00'],
    label: 'Nudge', detailIcon: Heart,
    tip: 'Small daily habits make the biggest difference over time.',
  },
}

// ─── Static Article Content ───────────────────────────────────────────────

type ArticleCategory = 'sleep' | 'feeding' | 'development' | 'behavior' | 'health' | 'you'

interface Article {
  id: string
  title: string
  summary: string
  content: string[]
  category: ArticleCategory
  readMinutes: number
  ageMin: number
  ageMax: number
}

const CATEGORY_META: Record<ArticleCategory, { label: string; icon: typeof Moon; color: string }> = {
  sleep:       { label: 'Sleep',       icon: Moon,    color: stickerPalette.lilacInk },
  feeding:     { label: 'Feeding',     icon: Apple,   color: stickerPalette.greenInk },
  development: { label: 'Development', icon: Brain,   color: stickerPalette.blueInk },
  behavior:    { label: 'Behavior',    icon: Heart,   color: stickerPalette.pinkInk },
  health:      { label: 'Health',      icon: Shield,  color: stickerPalette.yellowInk },
  you:         { label: 'For You',     icon: Coffee,  color: stickerPalette.coralInk },
}

const ARTICLES: Article[] = [
  {
    id: 'a1',
    title: "Why Your Baby's Sleep Looks Nothing Like Yours",
    summary: "Babies have shorter sleep cycles and spend more time in light sleep — by design.",
    content: [
      "Adult sleep cycles run about 90 minutes, but newborn cycles are only 45–50 minutes long. This means your baby naturally surfaces from deep sleep more frequently, and that's completely normal. Their brains are doing enormous work during light sleep, forming connections at a rate that will never happen again.",
      "Night waking isn't a failure — it's biology. Babies are born expecting closeness because it kept their ancestors safe. Responsiveness to night waking builds the secure attachment that actually makes children more independent later, not less.",
      "Adjust your expectations and your own sleep schedule where you can. Nap when they nap. Night shifts between partners help immensely. This stage is finite, even when it doesn't feel like it.",
    ],
    category: 'sleep', readMinutes: 3, ageMin: 0, ageMax: 18,
  },
  {
    id: 'a2',
    title: "Sleep Regressions: What They Are & How to Survive",
    summary: "The 4, 8, 12 and 18-month regressions are real — here's what's happening and why.",
    content: [
      "Sleep regressions happen when developmental leaps temporarily disrupt established sleep patterns. Your baby's brain is so busy growing that sleep becomes harder to settle into. The most significant regressions happen around 4 months, 8 months, 12 months, and 18 months.",
      "The 4-month regression is the most permanent: your baby's sleep architecture shifts from newborn patterns to more adult-like cycles. This is actually a sign of maturity. The others tend to resolve within 2–6 weeks as the developmental leap completes.",
      "Survival mode: lean into connection, be flexible with your routine, add an extra feed if needed. This is not the time to force new sleep habits. Consistency before and after the regression matters much more than what you do during it.",
    ],
    category: 'sleep', readMinutes: 4, ageMin: 3, ageMax: 24,
  },
  {
    id: 'a3',
    title: "Reading Hunger Cues: Beyond the Clock",
    summary: "Early hunger signs are easy to miss. Catching them means calmer, easier feeds.",
    content: [
      "Crying is a late hunger cue — by the time your baby is crying, they're already stressed, which makes feeding harder. Early cues include rooting (turning head side to side), sucking on hands, and turning towards sounds. Mid cues include fussing, stretching, and lip-smacking.",
      "Feeding on demand — responding to cues rather than watching the clock — supports better milk supply, healthier weight gain, and a more relaxed feeding relationship. Babies are remarkably good at self-regulating intake when we follow their lead.",
      "Over time you'll develop an intuitive read of your specific baby's signals. Keep a log for a week and you'll start to see patterns that are personal and predictable — much more useful than generic schedules.",
    ],
    category: 'feeding', readMinutes: 3, ageMin: 0, ageMax: 12,
  },
  {
    id: 'a4',
    title: "Introducing Solids Without the Stress",
    summary: "Signs of readiness matter more than the calendar. Here's how to start confidently.",
    content: [
      "Most babies show readiness for solids between 4–6 months. The key signs: sitting with minimal support, showing interest in food, loss of the tongue-thrust reflex, and good head control. The calendar is secondary.",
      "Whether you choose purées, baby-led weaning, or a combination, the goal at first is exploration — not nutrition. Breast milk or formula remains primary nutrition until around 12 months. Think of early solids as sensory development disguised as mealtime.",
      "Offer new foods in the morning so you can watch for reactions. Start with single-ingredient foods. Expect mess, rejection, and gagging (which is different from choking). Babies typically need 10–15 exposures to a new food before accepting it — persistence genuinely pays off.",
    ],
    category: 'feeding', readMinutes: 4, ageMin: 4, ageMax: 12,
  },
  {
    id: 'a5',
    title: "The Picky Eater Playbook",
    summary: "Division of responsibility and repeated exposure are the two tools that actually work.",
    content: [
      "Ellyn Satter's Division of Responsibility is the most research-backed framework for feeding toddlers: parents decide what, when, and where food is offered; children decide whether and how much to eat. Removing pressure from the table reduces food battles dramatically.",
      "Texture aversion and food neophobia peak between 18 months and 4 years. This is evolutionary — toddlers exploring the world needed to be cautious about unfamiliar things. It's not defiance. Repeated neutral exposure (no pressure, just presence on the plate) is what consistently works.",
      "Serve one accepted food alongside new foods, eat together as often as possible, involve children in food prep, and avoid preparing separate 'kid meals.' Keep offering. The goal is a relaxed mealtime, not a clean plate.",
    ],
    category: 'feeding', readMinutes: 4, ageMin: 12, ageMax: 999,
  },
  {
    id: 'a6',
    title: "Tummy Time: Small Minutes, Big Gains",
    summary: "Just 15–20 minutes a day builds the strength babies need to roll, sit, and crawl.",
    content: [
      "Tummy time strengthens the neck, shoulders, and core muscles essential for every gross motor milestone that follows. With safe sleep campaigns recommending back sleeping, babies need dedicated awake tummy time to build muscles they won't develop on their back.",
      "Start from day one, even just 2–3 minutes at a time. Many newborns hate it at first, and that's okay. Get down on the floor with your baby, use a rolled towel under the chest, or try tummy time on your chest while you recline.",
      "By 3–4 months, aim for 20–30 minutes spread across the day. Babies who get adequate tummy time typically roll earlier, sit earlier, and have better overall coordination. Think of it as the daily workout their development requires.",
    ],
    category: 'development', readMinutes: 3, ageMin: 0, ageMax: 6,
  },
  {
    id: 'a7',
    title: "Language Explosion: Nurturing Early Speech",
    summary: "You are your baby's most important language teacher. Here's what research shows works.",
    content: [
      "Babies are born ready to absorb language. From birth, they prefer the sound of their caregivers' voices and are already mapping the phonemes of their native language. The quality of early language input has lifelong effects on vocabulary, reading ability, and cognitive development.",
      "The most powerful thing you can do is 'serve and return' — respond to your baby's sounds, expressions, and gestures with language and attention. Narrate your day. Name everything. Ask questions even before they can answer. Sing songs. Read books. Background TV does not count — language input needs to be directed at the child.",
      "By 12 months, most babies have 1–3 words. By 18 months, 10–20. By 24 months, at least 50 words and starting to combine them. These are benchmarks, not deadlines. If you're concerned, early intervention is highly effective and worth pursuing early.",
    ],
    category: 'development', readMinutes: 4, ageMin: 0, ageMax: 36,
  },
  {
    id: 'a8',
    title: "Big Feelings in Little Bodies",
    summary: "Understanding tantrums as communication changes everything about how to respond.",
    content: [
      "The prefrontal cortex — responsible for emotional regulation — isn't fully developed until the mid-20s. Toddlers aren't choosing to lose control; they literally cannot regulate big emotions yet. What looks like defiance is usually overwhelm or a need they can't express.",
      "During a tantrum, connection before correction works. Get down to their level, name what you see ('You're really upset we have to leave'), and offer physical comfort if they'll accept it. Problem-solving comes later, once the nervous system is calm.",
      "Prevention matters: look for HALT — Hungry, Angry, Lonely, Tired. Most meltdowns happen when one of these is present. Predictable routines, warnings before transitions, and adequate sleep dramatically reduce frequency.",
    ],
    category: 'behavior', readMinutes: 4, ageMin: 12, ageMax: 60,
  },
  {
    id: 'a9',
    title: "The Magic of Routines for Young Children",
    summary: "Predictability isn't rigidity — it's the foundation of a secure, calm childhood.",
    content: [
      "Children thrive with predictability because it reduces anxiety about what comes next. When a child knows that bath comes before story which comes before sleep, they can relax into each part rather than resisting it. Routines also offload decision-making from overtired parents.",
      "A good routine doesn't need to be timed to the minute. The key is sequence, not schedule. Even two or three consistent anchors in a day (morning routine, naptime rhythm, bedtime sequence) can significantly reduce friction and improve cooperation.",
      "Involve children in the routine by giving them small choices within it: 'Do you want the dinosaur pajamas or the star ones?' Ownership increases buy-in. A simple visual routine posted on the wall works beautifully for toddlers — they love being able to 'read' what's coming.",
    ],
    category: 'behavior', readMinutes: 3, ageMin: 0, ageMax: 72,
  },
  {
    id: 'a10',
    title: "Fever Facts: When to Worry, When to Wait",
    summary: "Most fevers are doing exactly what they should. Here's how to read the signs.",
    content: [
      "Fever is not an illness — it's the immune system doing its job. A temperature up to 104°F (40°C) in an otherwise healthy child over 3 months is generally not dangerous in itself. What matters most is how the child looks and acts, not just the number.",
      "Call your doctor immediately for: any fever in a baby under 3 months, fever over 104°F, fever lasting more than 5 days, a child who looks very unwell, has difficulty breathing, a rash, or won't stop crying. If you're worried, call. That instinct is always worth a call.",
      "You don't need to treat every fever with medication. If your child is comfortable, playing, and drinking fluids, watchful waiting is appropriate. Dress them lightly, offer fluids frequently, and monitor. If they're uncomfortable, age- and weight-appropriate ibuprofen or acetaminophen can help.",
    ],
    category: 'health', readMinutes: 4, ageMin: 0, ageMax: 999,
  },
  {
    id: 'a11',
    title: "The Power of Outdoor Play",
    summary: "Fresh air and unstructured outdoor time benefit every system in your child's body.",
    content: [
      "Research consistently shows that outdoor play improves attention, reduces anxiety, supports better sleep, and boosts physical development. Natural light helps regulate circadian rhythms. Varied terrain challenges gross motor skills in ways that flat indoor spaces simply cannot.",
      "You don't need organized activities or equipment. A patch of grass, some sticks, and puddles are enough. Nature-deficit disorder is real — children who spend less time outdoors show higher rates of myopia, vitamin D deficiency, and attention difficulties.",
      "Even 60 minutes of outdoor time daily makes a measurable difference. Morning sunshine after breakfast, outdoor play before dinner, and evening walks all count. Dress for the weather and go — there's no such thing as bad weather, only inappropriate clothing.",
    ],
    category: 'health', readMinutes: 3, ageMin: 0, ageMax: 999,
  },
  {
    id: 'a12',
    title: "Raising Emotionally Intelligent Kids",
    summary: "EQ matters more than IQ for lifelong wellbeing. Here's how to nurture it early.",
    content: [
      "Emotional intelligence — the ability to identify, understand, and manage emotions — is one of the strongest predictors of life satisfaction, relationship quality, and professional success. It's teachable, and the window between 0–5 years is the most critical for its development.",
      "Emotion coaching starts with naming feelings: 'You look frustrated.' 'Are you feeling sad that we said goodbye?' This builds a child's emotional vocabulary, which research shows directly reduces the intensity of outbursts. You can't regulate what you can't name.",
      "Model it yourself. Normalize a full range of emotions in your household. Saying 'I'm feeling really tired and a bit grumpy right now' teaches children that emotions are information, not problems. A parent who can name their own feelings is the most powerful emotional intelligence teacher a child can have.",
    ],
    category: 'development', readMinutes: 4, ageMin: 0, ageMax: 999,
  },
  {
    id: 'a13',
    title: "You Can't Pour From an Empty Cup",
    summary: "Parental burnout is real, common, and recoverable. Here's how to recognize it.",
    content: [
      "Parental burnout is characterized by emotional exhaustion in your role as a parent, emotional distance from your child, and a sense of no longer being the parent you want to be. Research suggests it affects 5–8% of parents, with many more experiencing components of it.",
      "The biggest risk factors are perfectionism, isolation, and absence of respite. If you haven't had a real break in months, if you feel like you're performing parenting rather than living it, if you've lost pleasure in your child's company — these are signals worth taking seriously.",
      "Recovery starts with small, consistent respite. Even 20 minutes a day that is fully your own. Reconnect with a friend. Ask for help explicitly — people rarely offer but most will help when asked. If you're struggling, talking to a therapist is not weakness; it's the most responsible thing you can do for your family.",
    ],
    category: 'you', readMinutes: 5, ageMin: 0, ageMax: 999,
  },
  {
    id: 'a14',
    title: "Releasing the Perfect Parent Myth",
    summary: "Good enough parenting is what research actually shows children need.",
    content: [
      "Donald Winnicott coined the term 'good enough mother' in 1953 — and it has stood up to decades of research. Children don't need perfect parents; they need attuned, responsive parents who repair when they get it wrong. The repair is part of what builds secure attachment.",
      "Parenting guilt is at epidemic levels, amplified by social media, comparison culture, and conflicting expert advice. But guilt that doesn't lead to change is just suffering. Ask yourself: is this pointing to something I can genuinely do differently, or is it the impossible standard talking?",
      "Children are resilient and forgiving. They need presence more than perfection. They need to see you mess up and make amends — that models the behavior you hope they'll have. You are enough. The love you bring matters more than any parenting technique.",
    ],
    category: 'you', readMinutes: 4, ageMin: 0, ageMax: 999,
  },
  {
    id: 'a15',
    title: "The Importance of Unstructured Play",
    summary: "Free play builds creativity, resilience, and executive function better than any activity.",
    content: [
      "Play is the primary mode through which children learn. Not structured activities, not educational apps, not organized sports — but free, child-directed play. It's how children process experiences, develop imagination, practice social skills, and build executive function.",
      "Executive function — including working memory, cognitive flexibility, and inhibitory control — is developed significantly through pretend play. When children assign roles, maintain narratives, and problem-solve mid-play, they're doing deep cognitive work that translates directly to academic success.",
      "Resist the urge to over-schedule. Boredom is productive — it drives creativity and self-motivation. Aim for at least 1–2 hours of unstructured play daily. The less you direct it, the more value it has. Your job is to provide the space and safety; let them handle the rest.",
    ],
    category: 'development', readMinutes: 3, ageMin: 6, ageMax: 999,
  },
]

// ─── Daily Tips by Age ────────────────────────────────────────────────────

const DAILY_TIPS: { ageMin: number; ageMax: number; tips: string[] }[] = [
  {
    ageMin: 0, ageMax: 3,
    tips: [
      "Skin-to-skin for even 20 minutes today regulates your newborn's temperature, heart rate, and cortisol levels.",
      "Talk while doing everyday tasks — your baby is absorbing your voice, rhythm, and language patterns right now.",
      "Newborns focus best 8–12 inches away. Hold them close so they can really see your face.",
      "Try 2–3 minutes of tummy time today, even on your chest. Every minute builds neck strength.",
      "White noise mimics the womb environment. A fan or simple app can help settle sleep.",
      "Swaddling, sucking, side-lying, swinging, and shushing — the '5 S's' — can calm most newborns.",
      "Your stress affects your baby's stress hormones. A short calming ritual before feeds helps you both.",
      "Your baby recognizes your smell. Wearing them close is soothing and builds attachment.",
      "Newborns feed 8–12 times per day — this is normal and supports milk supply.",
      "The witching hour (5–8pm fussiness) is almost universal. You're not doing anything wrong.",
    ],
  },
  {
    ageMin: 3, ageMax: 6,
    tips: [
      "Your baby is starting to smile socially — exaggerate your expressions and give them time to respond.",
      "Narrate your day out loud. 'Now I'm putting on your sock. One sock. Two socks!' — it all goes in.",
      "Tummy time should be building to 20–30 minutes a day. Break it into short sessions throughout the day.",
      "Sing the same songs repeatedly — familiarity builds trust and language, not boredom.",
      "Try high-contrast black-and-white books. Your baby's vision is rapidly improving this month.",
      "Babble back to your baby when they babble. This serve-and-return is foundational language development.",
      "Rolling may start soon. Keep your baby on low surfaces during unsupported moments.",
      "The 4-month sleep shift is tough but normal. Flexibility and connection are your best tools now.",
      "Your baby is learning object permanence — peek-a-boo is more than fun. It's a cognitive workout.",
      "Offer a rattle or soft toy within reach and watch that hand-eye coordination develop.",
    ],
  },
  {
    ageMin: 6, ageMax: 12,
    tips: [
      "If you're starting solids, offer a new food today — and expect rejection. That's part of the process.",
      "Your baby is learning cause and effect. Dropping things on the floor is science, not misbehavior.",
      "Separation anxiety peaks 8–10 months. Consistent goodbye rituals help more than sneaking out.",
      "Read together every day if you can. Even 10 minutes of shared book time has lasting language benefits.",
      "Finger foods develop pincer grasp. Soft pieces of banana, avocado, or cooked vegetables are a great start.",
      "Your baby understands 'no' now, but can't reliably comply. Redirecting is more effective than repeating.",
      "Stranger anxiety is a sign of healthy attachment, not something to fix. Warm introductions help.",
      "Floor time is crucial. Babies who spend most waking time in bouncers can miss motor milestones.",
      "Imitation is ramping up. Clap, wave, make sounds — your baby is watching and practicing constantly.",
      "Offer a sippy cup with water at mealtimes — fine motor and oral motor development in one.",
    ],
  },
  {
    ageMin: 12, ageMax: 24,
    tips: [
      "Offer two small choices instead of open questions — 'banana or crackers?' reduces toddler resistance.",
      "When you name your toddler's feelings, you're building their emotional vocabulary for life.",
      "Toddlers need 11–14 hours of sleep. Overtired toddlers have harder bedtimes, not easier ones.",
      "Get outside today if you can. Even 20 minutes of outdoor time improves mood and sleep for toddlers.",
      "Let your toddler 'help' with simple tasks. They're slower, but the independence it builds is worth it.",
      "Reading the same book 15 times is not boring to a toddler — it's mastery, and they're proud of it.",
      "Toddlers often eat well at one meal and nothing at another. Across a week, nutrition usually balances.",
      "Physical play — rolling, tumbling, rough-housing — actually builds emotional regulation skills.",
      "Water play is calming and sensory-rich. A bin of water and some cups is a 30-minute activity.",
      "Tantrums are communication. Ask yourself: what need is underneath this?",
    ],
  },
  {
    ageMin: 24, ageMax: 48,
    tips: [
      "Pretend play is exploding now. Get on the floor and let your child direct the story.",
      "Ask open questions at day's end: 'What was something funny today?' instead of 'How was your day?'",
      "Preschoolers who are read to for 20 minutes daily arrive at school knowing far more words.",
      "Let your child dress themselves, even when it takes forever. The pride is worth every minute.",
      "Give warnings before transitions: '5 more minutes, then bath time.' It reduces resistance significantly.",
      "Three-year-olds need 3 meals and 2 snacks. Predictable mealtimes reduce grazing and battles.",
      "Limit screen time to 1 hour of high-quality programming. Watch together and talk about what you see.",
      "Sleep at this age: 10–13 hours including any nap. Dropping the nap doesn't mean less rest is needed.",
      "Your child's friendships are becoming more complex. Narrate social dynamics gently rather than intervening fast.",
      "Toilet training readiness is physical AND emotional. Pressure before readiness often delays it.",
    ],
  },
  {
    ageMin: 48, ageMax: 999,
    tips: [
      "Ask one specific question from their day — 'Who did you play with at recess?' beats 'How was school?'",
      "Children this age need to experience consequences to build judgment. Let small mistakes happen.",
      "Reading aloud to children, even after they can read themselves, builds vocabulary and connection.",
      "Physical activity for 60 minutes a day supports attention, mood, and sleep in school-age children.",
      "Practice problem-solving out loud: 'Hmm, what should we do about this?' models thinking, not just answers.",
      "Children need to be bored. Boredom drives creativity and self-motivation more than any enrichment activity.",
      "Connection before correction: when you need to address behavior, start from a place of warmth.",
      "Encourage your child's interests even when they're not yours. Enthusiasm about their passions builds confidence.",
      "Let your child fail at something small today. Resilience is built through managed adversity.",
      "Have one screen-free meal together this week. Table conversations are irreplaceable for connection.",
    ],
  },
]

const MOTIVATION_QUOTES = [
  { text: "You don't have to be a perfect parent. You just have to be a present one.", author: "Anonymous" },
  { text: "The days are long, but the years are short. You're doing better than you think.", author: "Gretchen Rubin" },
  { text: "Children need love, especially when they do not deserve it.", author: "Harold Hulbert" },
  { text: "You are the expert on your child. Trust yourself.", author: "Anonymous" },
  { text: "Behind every great kid is a parent who had no idea what they were doing.", author: "Anonymous" },
  { text: "Your presence is the present. All the rest is wrapping paper.", author: "Anonymous" },
  { text: "Good enough parenting — not perfect parenting — is what children actually need.", author: "D.W. Winnicott" },
  { text: "You can't pour from an empty cup. Taking care of yourself is necessary, not selfish.", author: "Anonymous" },
  { text: "Children are not things to be molded, but people to be unfolded.", author: "Jess Lair" },
  { text: "What a child doesn't receive, they can seldom give.", author: "P.D. James" },
  { text: "It's not about having the perfect parenting moment. It's about showing up.", author: "Anonymous" },
  { text: "Repair matters more than perfection. Every rupture you mend teaches your child resilience.", author: "Anonymous" },
]

// ─── Helpers ──────────────────────────────────────────────────────────────

function getAgeMonths(birthDate: string): number {
  const birth = new Date(birthDate)
  const now = new Date()
  return Math.max(0, (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth()))
}

function getDailyTip(ageMonths: number): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  )
  const group = DAILY_TIPS.find(g => ageMonths >= g.ageMin && ageMonths < g.ageMax)
    ?? DAILY_TIPS[DAILY_TIPS.length - 1]
  return group.tips[dayOfYear % group.tips.length]
}

function getMotivationQuote(): typeof MOTIVATION_QUOTES[0] {
  const weekOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (86400000 * 7)
  )
  return MOTIVATION_QUOTES[weekOfYear % MOTIVATION_QUOTES.length]
}

function formatLogType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function groupByDate(insights: Insight[]): { label: string; items: Insight[] }[] {
  const groups: Record<string, Insight[]> = {}
  for (const ins of insights) {
    const d = new Date(ins.created_at)
    const key = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    if (!groups[key]) groups[key] = []
    groups[key].push(ins)
  }
  return Object.entries(groups).map(([label, items]) => ({ label, items }))
}

function buildWeekNarrative(metrics: BehaviorMetrics, childName: string): string {
  const parts: string[] = []
  const topType = metrics.topTypes[0]
  if (topType) {
    parts.push(`${childName}'s top logged activity is ${formatLogType(topType.type)} with ${topType.count} entries this month.`)
  }
  if (metrics.logStreak >= 3) {
    parts.push(`You're on a ${metrics.logStreak}-day logging streak — keep it going!`)
  } else if (metrics.logStreak > 0) {
    parts.push(`You've logged ${metrics.logStreak} day${metrics.logStreak > 1 ? 's' : ''} in a row.`)
  }
  const recentTotal = metrics.recentActivity.reduce((s, d) => s + d.count, 0)
  if (recentTotal > 0) {
    parts.push(`${recentTotal} total entries in the last 7 days.`)
  }
  if (parts.length === 0) {
    return `Start logging ${childName}'s daily activities and you'll see personalized weekly progress here.`
  }
  return parts.join(' ')
}

type Tab = 'today' | 'reads' | 'history'

// ─── Sticker-on-paper helpers ─────────────────────────────────────────────

const STICKER_INK = '#141313'

function mixWithWhite(hex: string, whiteAmount: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const mr = Math.round(r + (255 - r) * whiteAmount)
  const mg = Math.round(g + (255 - g) * whiteAmount)
  const mb = Math.round(b + (255 - b) * whiteAmount)
  return `rgb(${mr}, ${mg}, ${mb})`
}

const stickerShadow = {
  shadowColor: STICKER_INK,
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 4,
} as const

const stickerShadowSm = {
  shadowColor: STICKER_INK,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 3,
} as const

const stickerShadowLg = {
  shadowColor: STICKER_INK,
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 6,
} as const

// ─── Pregnancy Insights Content ────────────────────────────────────────────

type PregnancyTab = 'today' | 'birth_guide' | 'reads'

interface CollapsibleCardProps {
  id: string
  title: string
  emoji: string
  color: string
  defaultOpen?: boolean
  children: React.ReactNode
  expandedMap: Record<string, boolean>
  onToggle: (id: string) => void
}

function CollapsibleCard({
  id, title, emoji, color, defaultOpen = false,
  children, expandedMap, onToggle,
}: CollapsibleCardProps) {
  const { colors, isDark } = useTheme()
  const isOpen = expandedMap[id] ?? defaultOpen
  const Sticker = stickerForEmoji(emoji)

  return (
    <View style={[ci.card, { backgroundColor: colors.surface }]}>
      <Pressable onPress={() => onToggle(id)} style={ci.cardHeader}>
        <View style={[ci.cardStickerWrap, { backgroundColor: color + '28' }]}>
          <Sticker size={26} />
        </View>
        <Text style={[ci.cardTitle, { color: colors.text, flex: 1 }]}>{title}</Text>
        <View style={[ci.cardChevronPill, { backgroundColor: colors.surfaceRaised }]}>
          <Text style={[ci.cardChevron, { color: STICKER_INK + 'A0' }]}>{isOpen ? '▲' : '▼'}</Text>
        </View>
      </Pressable>
      {isOpen && (
        <View style={[ci.cardBody, { borderTopColor: STICKER_INK + '12' }]}>
          {children}
          <Pressable
            onPress={() => router.push('/grandma-talk')}
            style={({ pressed }) => [
              ci.askCta,
              {
                borderColor: STICKER_INK,
                backgroundColor: mixWithWhite(color, 0.78),
                transform: [{ translateY: pressed ? 1 : 0 }],
              },
            ]}
          >
            <TalkMaster size={16} />
            <Text style={[ci.askCtaText, { color: STICKER_INK }]}>
              Ask Grandma about {title.toLowerCase()}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

// Static data hoisted outside component to avoid re-creation on every render
const BIRTH_STAGES: Array<{ id: string; emoji: string; color: string; title: string; content: string[] }> = [
  {
    id: 'early_labor', emoji: '🌅', color: brand.laborPhases.early, title: 'Early signs & latent labor',
    content: [
      'Cervix dilates from 0–6cm. Contractions are irregular and mild (5–30 min apart).',
      'Stay home: rest, eat lightly, time contractions, keep busy.',
      'Partner role: emotional support, back massage, prepare the hospital bag.',
      'Most first labors: latent phase lasts 6–12 hours. Stay patient.',
    ],
  },
  {
    id: 'active_labor', emoji: '🌊', color: brand.laborPhases.active, title: 'Active labor',
    content: [
      'Cervix 6–10cm. Contractions every 3–5 min, lasting 60–90 sec, very intense.',
      '5-1-1 rule: contractions every 5 min, lasting 1 min, for 1 hour → go to hospital.',
      'Pain relief options: epidural, gas and air, water, hypnobirthing, movement.',
      'Partner role: breathing cues, position changes, advocate with staff.',
    ],
  },
  {
    id: 'transition', emoji: '💫', color: brand.laborPhases.transition, title: 'Transition & pushing',
    content: [
      'Fully dilated (10cm). The hardest but shortest phase — usually 15–60 min.',
      'Contractions are 2–3 min apart. Intense pressure, shaking, nausea are normal.',
      'Pushing techniques: directed pushing vs. breathing down. Ask your midwife.',
      'You can do this. Every contraction brings your baby closer.',
    ],
  },
  {
    id: 'birth', emoji: '👶', color: brand.laborPhases.birth, title: 'Birth & golden hour',
    content: [
      "Skin-to-skin immediately: regulates baby's temperature, heart rate, and breathing.",
      'Delayed cord clamping (1–3 min): transfers 80–100mL of blood = important for iron.',
      'First breastfeed in the golden hour: colostrum is liquid gold.',
      'Placenta delivery: 5–30 min after birth. Active or physiological management.',
    ],
  },
  {
    id: 'postpartum', emoji: '🌸', color: brand.laborPhases.postpartum, title: 'Recovery & postpartum',
    content: [
      'Lochia (postpartum bleeding): red 3–4 days, pink/brown 2 weeks, creamy to week 6.',
      'Baby blues: days 3–5 as hormones crash. Normal. Postpartum depression: more than 2 weeks → seek help.',
      '6-week checkup: uterus, stitches, mental health screen, contraception.',
      'Rest, nourishment, and connection are the only priorities right now.',
    ],
  },
]

const WARNING_SIGNS = [
  'Water breaks before week 37',
  'Heavy or unusual bleeding',
  'Baby not moving for 2+ hours (week 28+)',
  'Severe headache + vision changes',
  'Fever above 38°C (100.4°F)',
]

function PregnancyInsightsContent() {
  const { colors, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const storedWeek = usePregnancyStore((s) => s.weekNumber)
  const dueDate = usePregnancyStore((s) => s.dueDate)
  const weekNumber = dueDate ? getCurrentWeekFromDueDate(dueDate) : (storedWeek ?? 1)
  const parentName = useJourneyStore((s) => s.parentName) ?? 'Mama'

  const [pTab, setPTab] = useState<PregnancyTab>('today')
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({
    birthFocus: true,
  })

  function toggleCard(id: string) {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const weekData = getWeekData(weekNumber)
  const affirmation = getDailyAffirmation()
  const birthFocus: BirthFocusCard = getBirthFocusForWeek(weekNumber)
  const upcomingAppt = getUpcomingAppointment(weekNumber)
  const featuredRead = getFeaturedReadForWeek(weekNumber)
  const allReads: PregnancyRead[] = [
    ...getReadsByCategory('birth_prep'),
    ...getReadsByCategory('nutrition'),
    ...getReadsByCategory('mental_health'),
  ]

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const renderToday = () => (
    <>
      <View style={[ci.greetingCard, { backgroundColor: colors.accentSoft }]}>
        <Text style={[ci.greetingDate, { color: colors.textMuted }]}>{today}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[ci.greetingName, { color: STICKER_INK }]}>Good morning, {parentName}</Text>
        </View>
        <Text style={[ci.greetingWeek, { color: colors.accent }]}>Week {weekNumber} · {weekData.babySize}</Text>
      </View>

      <CollapsibleCard
        id="weekTip" emoji="💡" color={stickerPalette.yellow} title={`Week ${weekNumber} tip`}
        expandedMap={expandedCards} onToggle={toggleCard}
      >
        <Text style={[ci.bodyText, { color: colors.textSecondary }]}>{weekData.momTip}</Text>
      </CollapsibleCard>

      <CollapsibleCard
        id="birthFocus" emoji="💜" color={brand.pregnancy}
        title={birthFocus.title} defaultOpen expandedMap={expandedCards} onToggle={toggleCard}
      >
        <Text style={[ci.bodyText, { color: colors.textSecondary }]}>{birthFocus.subtitle}</Text>
        {birthFocus.bullets.map((b, i) => {
          const BulletSticker = stickerForEmoji(b.icon)
          return (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 2 }}>
              <View style={{ marginTop: 2 }}><BulletSticker size={18} /></View>
              <Text style={[ci.bulletText, { color: colors.textSecondary, flex: 1 }]}>{b.text}</Text>
            </View>
          )
        })}
      </CollapsibleCard>

      <CollapsibleCard
        id="affirmation" emoji="✨" color={brand.prePregnancy} title="Today's affirmation"
        expandedMap={expandedCards} onToggle={toggleCard}
      >
        <Text style={[ci.affirmationText, { color: colors.text }]}>"{affirmation}"</Text>
      </CollapsibleCard>

      {upcomingAppt && (
        <CollapsibleCard
          id="appointment" emoji="📅" color={stickerPalette.yellow} title={`Next: ${upcomingAppt.name}`}
          expandedMap={expandedCards} onToggle={toggleCard}
        >
          <Text style={[ci.bodyText, { color: colors.textSecondary }]}>
            {upcomingAppt.prepNote}
          </Text>
        </CollapsibleCard>
      )}
    </>
  )

  const renderBirthGuide = () => (
    <>
      <View style={[ci.warningCard, { backgroundColor: stickerPalette.peachSoft }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <NotifyHealthAlert size={22} />
          <Text style={[ci.warningTitle, { color: STICKER_INK }]}>Call your provider or go to hospital if:</Text>
        </View>
        {WARNING_SIGNS.map((sign, i) => (
          <Text key={i} style={[ci.warningItem, { color: STICKER_INK + 'C8' }]}>• {sign}</Text>
        ))}
      </View>

      {BIRTH_STAGES.map((stage) => (
        <CollapsibleCard
          key={stage.id}
          id={stage.id}
          emoji={stage.emoji}
          color={stage.color}
          title={stage.title}
          expandedMap={expandedCards}
          onToggle={toggleCard}
        >
          {stage.content.map((line, i) => (
            <Text key={i} style={[ci.bulletText, { color: colors.textSecondary }]}>• {line}</Text>
          ))}
        </CollapsibleCard>
      ))}
    </>
  )

  const renderReads = () => (
    <>
      {featuredRead && (
        <View style={[ci.featuredCard, { backgroundColor: stickerPalette.yellowSoft }]}>
          <Text style={[ci.featuredBadge, { color: STICKER_INK }]}>FEATURED THIS WEEK</Text>
          <Text style={[ci.featuredTitle, { color: STICKER_INK }]}>{featuredRead.title}</Text>
          <Text style={[ci.featuredSummary, { color: STICKER_INK + 'C8' }]}>{featuredRead.teaser}</Text>
          <Text style={[ci.featuredMins, { color: STICKER_INK + 'A0' }]}>{featuredRead.readMinutes} min read</Text>
        </View>
      )}
      {allReads.map((read) => (
        <CollapsibleCard
          key={read.id}
          id={`read_${read.id}`}
          emoji={read.category === 'birth_prep' ? '🏥' : read.category === 'nutrition' ? '🥗' : read.category === 'mental_health' ? '🧠' : '📖'}
          color={read.category === 'birth_prep' ? stickerPalette.yellow : read.category === 'nutrition' ? stickerPalette.green : brand.pregnancy}
          title={read.title}
          expandedMap={expandedCards}
          onToggle={toggleCard}
        >
          <Text style={[ci.bodyText, { color: colors.textSecondary }]}>{read.teaser}</Text>
          <Text style={[ci.readMins, { color: colors.textMuted }]}>{read.readMinutes} min read</Text>
        </CollapsibleCard>
      ))}
    </>
  )

  return (
    <View style={[ci.root, { backgroundColor: colors.bg }]}>
      <View style={[ci.topRow, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [
            ci.topBackBtn,
            {
              backgroundColor: colors.surface,
              borderColor: STICKER_INK,
              transform: [{ translateY: pressed ? 1 : 0 }],
              ...stickerShadowSm,
            },
          ]}
        >
          <ArrowLeft size={20} color={colors.text} strokeWidth={2.5} />
        </Pressable>
      </View>
      <View style={ci.tabBar}>
        {(['today', 'birth_guide', 'reads'] as PregnancyTab[]).map((t) => {
          const active = pTab === t
          const label = t === 'today' ? 'Today' : t === 'birth_guide' ? 'Birth Guide' : 'Reads'
          return (
            <Pressable
              key={t}
              onPress={() => setPTab(t)}
              style={({ pressed }) => [
                ci.tabPill,
                {
                  backgroundColor: active ? colors.accentSoft : (colors.surface),
                  borderColor: active ? STICKER_INK : colors.borderStrong,
                  transform: [{ translateY: active && pressed ? 2 : 0 }],
                  ...(active ? stickerShadowSm : { shadowOpacity: 0, elevation: 0 }),
                },
              ]}
            >
              <Text style={[ci.tabLabel, { color: active ? STICKER_INK : colors.textMuted }]}>
                {label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      <ScrollView
        contentContainerStyle={[ci.scroll, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {pTab === 'today' && renderToday()}
        {pTab === 'birth_guide' && renderBirthGuide()}
        {pTab === 'reads' && renderReads()}
      </ScrollView>

      <Pressable
        onPress={() => router.push('/grandma-talk')}
        style={({ pressed }) => [
          ci.askBar,
          { backgroundColor: colors.accent, bottom: insets.bottom + 8, transform: [{ translateY: pressed ? 2 : 0 }] },
        ]}
      >
        <TalkMaster size={28} />
        <Text style={[ci.askBarText, { color: STICKER_INK }]}>Ask Grandma anything</Text>
        <ChevronRight size={18} color={STICKER_INK} strokeWidth={2.5} />
      </Pressable>
    </View>
  )
}

// ─── Pregnancy Insights Styles ────────────────────────────────────────────────

const ci = StyleSheet.create({
  root: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  topBackBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  tabBar: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 8 },
  tabPill: { flex: 1, paddingVertical: 11, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 999, borderWidth: 1.5 },
  tabLabel: { fontSize: 12, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', letterSpacing: 0.6 },
  scroll: { padding: 16, gap: 0 },

  greetingCard: { borderRadius: 26, padding: 22, marginBottom: 14, borderWidth: 1.5, borderColor: STICKER_INK + '18', ...stickerShadow },
  greetingDate: { fontSize: 11, fontFamily: 'DMSans_600SemiBold', textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 6 },
  greetingName: { fontSize: 24, fontFamily: 'Fraunces_600SemiBold', marginBottom: 6, letterSpacing: -0.5, lineHeight: 28 },
  greetingWeek: { fontSize: 14, fontFamily: 'DMSans_700Bold' },

  card: { borderRadius: 22, marginBottom: 12, borderWidth: 1.5, borderColor: STICKER_INK + '18', overflow: 'hidden', ...stickerShadowSm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  cardStickerWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: STICKER_INK + '22' },
  cardTitle: { fontSize: 16, fontFamily: 'Fraunces_600SemiBold', letterSpacing: -0.2 },
  cardChevronPill: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardChevron: { fontSize: 11, fontFamily: 'DMSans_700Bold' },
  cardBody: { padding: 16, paddingTop: 14, borderTopWidth: 1, gap: 10 },

  bodyText: { fontSize: 14, fontFamily: 'DMSans_500Medium', lineHeight: 21 },
  bulletText: { fontSize: 13, fontFamily: 'DMSans_500Medium', lineHeight: 20, paddingLeft: 4 },
  affirmationText: { fontSize: 17, fontFamily: 'InstrumentSerif_400Regular_Italic', lineHeight: 24 },

  askCta: { marginTop: 8, paddingVertical: 11, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1.5, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, ...stickerShadowSm },
  askCtaText: { fontSize: 13, fontFamily: 'DMSans_700Bold' },

  warningCard: { borderRadius: 22, padding: 18, marginBottom: 14, borderWidth: 1.5, borderColor: STICKER_INK + '22', ...stickerShadowSm },
  warningTitle: { fontSize: 14, fontFamily: 'DMSans_700Bold', marginBottom: 10 },
  warningItem: { fontSize: 13, fontFamily: 'DMSans_500Medium', lineHeight: 20 },

  featuredCard: { borderRadius: 26, padding: 22, marginBottom: 14, borderWidth: 1.5, borderColor: STICKER_INK + '22', ...stickerShadow },
  featuredBadge: { fontSize: 10, fontFamily: 'DMSans_700Bold', letterSpacing: 1.6, marginBottom: 10, textTransform: 'uppercase' },
  featuredTitle: { fontSize: 19, fontFamily: 'Fraunces_600SemiBold', marginBottom: 8, letterSpacing: -0.4, lineHeight: 24 },
  featuredSummary: { fontSize: 14, fontFamily: 'DMSans_500Medium', lineHeight: 21 },
  featuredMins: { fontSize: 12, fontFamily: 'DMSans_600SemiBold', marginTop: 8 },
  readMins: { fontSize: 11, fontFamily: 'DMSans_600SemiBold', marginTop: 6 },

  askBar: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingVertical: 16, paddingHorizontal: 22, gap: 12, borderWidth: 1.5, borderColor: STICKER_INK, ...stickerShadow },
  askBarText: { flex: 1, fontSize: 16, fontFamily: 'DMSans_700Bold' },
})

// ─── Main Screen ──────────────────────────────────────────────────────────

export function InsightsScreen() {
  const { colors, radius, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const mode = useModeStore((s) => s.mode)
  const queryClient = useQueryClient()
  const activeChild = useChildStore((s) => s.activeChild)
  const children = useChildStore((s) => s.children)
  const parentName = useJourneyStore((s) => s.parentName)

  const child = activeChild ?? children[0]
  const childName = child?.name ?? 'your child'
  const ageMonths = child?.birthDate ? getAgeMonths(child.birthDate) : 12

  const [tab, setTab] = useState<Tab>('today')
  const [refreshing, setRefreshing] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null)
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [articleCategory, setArticleCategory] = useState<ArticleCategory | 'all'>('all')

  const { data: insights = [], isLoading } = useQuery({
    queryKey: ['insights', mode],
    queryFn: () => fetchInsights(mode),
    staleTime: 5 * 60 * 1000,
  })

  const { data: archivedInsights = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['insights-history', mode],
    queryFn: () => fetchArchivedInsights(mode),
    staleTime: 5 * 60 * 1000,
    enabled: tab === 'history',
  })

  const { data: metrics } = useQuery({
    queryKey: ['behavior-metrics', mode],
    queryFn: () => fetchBehaviorMetrics(mode),
    staleTime: 10 * 60 * 1000,
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    setGenerating(true)
    setError(null)
    try {
      await archiveStaleInsights()
      await generateInsights(mode)
      await queryClient.refetchQueries({ queryKey: ['insights', mode] })
      queryClient.invalidateQueries({ queryKey: ['behavior-metrics', mode] })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setRefreshing(false)
      setGenerating(false)
    }
  }, [mode, queryClient])

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      await generateInsights(mode)
      await queryClient.refetchQueries({ queryKey: ['insights', mode] })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong'
      setError(msg)
      console.warn('[insights] generate failed:', msg)
      // Allow retry on next mount/effect cycle
      didAutoGenerate.current = false
    } finally {
      setGenerating(false)
    }
  }

  // ─── Auto-generate when user has data but only starter nudges ──────────
  const STARTER_TITLES = new Set([
    "Log your little one's day",
    'Development insights await',
    'Every detail helps',
    'Start logging your cycle',
    'Better predictions ahead',
    'Log symptoms too',
    'Start your pregnancy journal',
    'Milestones are coming',
    'Track your appointments',
  ])

  const didAutoGenerate = useRef(false)

  useEffect(() => {
    if (didAutoGenerate.current) return
    if (isLoading || generating) return
    if (!metrics || metrics.totalLogs === 0) return

    // All current insights are starter nudges — user has data but AI hasn't run
    const allStarter = insights.length > 0 && insights.every((i) => STARTER_TITLES.has(i.title))
    // Or no insights at all despite having data
    const noInsights = insights.length === 0

    if (allStarter || noInsights) {
      didAutoGenerate.current = true
      handleGenerate()
    }
  }, [insights, metrics, isLoading, generating])

  async function handleArchive(id: string) {
    await archiveInsight(id)
    queryClient.invalidateQueries({ queryKey: ['insights', mode] })
    queryClient.invalidateQueries({ queryKey: ['insights-history', mode] })
    if (selectedInsight?.id === id) setSelectedInsight(null)
  }

  async function handleRestore(id: string) {
    await restoreInsight(id)
    queryClient.invalidateQueries({ queryKey: ['insights', mode] })
    queryClient.invalidateQueries({ queryKey: ['insights-history', mode] })
  }

  function handleAskGrandma(insight: Insight) {
    setSelectedInsight(null)
    router.push({
      pathname: '/(tabs)/library',
      params: { insightContext: `${insight.title}: ${insight.body}` },
    })
  }

  const grouped = useMemo(() => {
    return insights.reduce<Record<InsightType, Insight[]>>(
      (acc, ins) => {
        const type = ins.type as InsightType
        if (!acc[type]) acc[type] = []
        acc[type].push(ins)
        return acc
      },
      { pattern: [], trend: [], upcoming: [], nudge: [] }
    )
  }, [insights])

  const historyGroups = useMemo(() => groupByDate(archivedInsights), [archivedInsights])

  const filteredArticles = useMemo(() => {
    return ARTICLES.filter(a => {
      const categoryMatch = articleCategory === 'all' || a.category === articleCategory
      const ageMatch = ageMonths >= a.ageMin && ageMonths <= a.ageMax
      return categoryMatch && ageMatch
    })
  }, [articleCategory, ageMonths])

  const typeOrder: InsightType[] = ['upcoming', 'trend', 'pattern', 'nudge']
  const dailyTip = getDailyTip(ageMonths)
  const quote = getMotivationQuote()

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const greeting = parentName ? `Hello, ${parentName}` : 'Hello, Parent'

  if (mode === 'pregnancy') return <PregnancyInsightsContent />

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Header */}
        <View style={s.headerRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [
              s.backBtn,
              {
                backgroundColor: colors.surface,
                borderColor: STICKER_INK,
                transform: [{ translateY: pressed ? 1 : 0 }],
                ...stickerShadowSm,
              },
            ]}
          >
            <ArrowLeft size={20} color={colors.text} strokeWidth={2.5} />
          </Pressable>
        </View>
        <Text style={[s.heading, { color: colors.text }]}>Insights</Text>
        <Text style={[s.subtitle, { color: colors.textSecondary }]}>
          Your daily companion for {childName}'s journey
        </Text>

        {/* Tab Row — sticker pills */}
        <View style={s.tabRow}>
          {(['today', 'reads', 'history'] as Tab[]).map((t) => {
            const active = tab === t
            const label = t === 'today' ? 'Today' : t === 'reads' ? 'Reads' : 'History'
            const Icon = t === 'today' ? Sun : t === 'reads' ? BookOpen : Clock
            const modeKey = mode === 'pre-pregnancy' ? 'pre' : 'kids'
            const modeAccent = getModeColor(modeKey, isDark)
            const modeAccentSoft = getModeColorSoft(modeKey, isDark)
            return (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                style={({ pressed }) => [
                  s.tabPill,
                  {
                    backgroundColor: active ? modeAccentSoft : (colors.surface),
                    borderColor: active ? STICKER_INK : colors.borderStrong,
                    transform: [{ translateY: active && pressed ? 2 : 0 }],
                    ...(active ? stickerShadowSm : { shadowOpacity: 0, elevation: 0 }),
                  },
                ]}
              >
                <Icon size={13} color={active ? modeAccent : colors.textMuted} strokeWidth={2.5} />
                <Text style={[s.tabText, { color: active ? STICKER_INK : colors.textMuted }]}>
                  {label}
                </Text>
                {t === 'today' && insights.length > 0 && (
                  <View style={[s.tabBadge, { backgroundColor: active ? modeAccent : colors.surfaceRaised, borderColor: active ? STICKER_INK : colors.border }]}>
                    <Text style={[s.tabBadgeText, { color: active ? STICKER_INK : colors.textMuted }]}>
                      {insights.length}
                    </Text>
                  </View>
                )}
              </Pressable>
            )
          })}
        </View>

        {/* ─── TODAY TAB ───────────────────────────────────────────── */}
        {tab === 'today' && (
          <>
            {/* Daily Brief */}
            <View
              style={[s.dailyCard, { backgroundColor: colors.accentSoft }]}
            >
              <View style={s.dailyTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.dailyGreeting, { color: colors.textMuted }]}>{today}</Text>
                  <Text style={[s.dailyName, { color: STICKER_INK }]}>{greeting}</Text>
                </View>
                <View style={[s.sunIcon, { backgroundColor: stickerPalette.yellow }]}>
                  <Sun size={22} color={STICKER_INK} strokeWidth={2.5} />
                </View>
              </View>
              <View style={[s.tipBox, { backgroundColor: colors.surface, borderColor: STICKER_INK + '18' }]}>
                <View style={s.tipBoxHeader}>
                  <Sparkles size={12} color={colors.accent} strokeWidth={2.5} />
                  <Text style={[s.tipBoxLabel, { color: colors.accent }]}>Today's tip</Text>
                  {child?.birthDate && (
                    <View style={[s.agePill, { backgroundColor: stickerPalette.yellowSoft }]}>
                      <Text style={[s.agePillText, { color: STICKER_INK }]}>
                        {ageMonths < 12 ? `${ageMonths}mo` : `${Math.floor(ageMonths / 12)}y`}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[s.tipBoxText, { color: colors.text }]}>{dailyTip}</Text>
              </View>
            </View>

            {/* Week at a Glance */}
            {metrics && metrics.totalLogs > 0 && (
              <View style={[s.weekCard, { backgroundColor: colors.surface }]}>
                <View style={s.weekHeader}>
                  <View style={[s.weekIconWrap, { backgroundColor: stickerPalette.blueSoft }]}>
                    <BarChart3 size={15} color={STICKER_INK} strokeWidth={2.5} />
                  </View>
                  <Text style={[s.weekTitle, { color: colors.text }]}>This Week</Text>
                  {metrics.logStreak > 0 && (
                    <View style={[s.streakBadge, { backgroundColor: stickerPalette.peachSoft }]}>
                      <Flame size={11} color={stickerPalette.peachInk} strokeWidth={2.5} />
                      <Text style={[s.streakText, { color: stickerPalette.peachInk }]}>{metrics.logStreak}d</Text>
                    </View>
                  )}
                </View>
                <Text style={[s.weekNarrative, { color: colors.textSecondary }]}>
                  {buildWeekNarrative(metrics, childName)}
                </Text>
                {/* Mini bars — sticker blocks */}
                <View style={s.miniBars}>
                  {metrics.recentActivity.map((day, i) => {
                    const maxAct = Math.max(...metrics.recentActivity.map(d => d.count), 1)
                    const h = day.count > 0 ? Math.max((day.count / maxAct) * 36, 8) : 4
                    const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
                    const barColor = day.count > 0 ? stickerPalette.lilac : (colors.surfaceRaised)
                    return (
                      <View key={day.date} style={s.miniBarCol}>
                        <View style={[s.miniBar, { height: h, backgroundColor: barColor, borderRadius: 6, borderColor: day.count > 0 ? STICKER_INK + '40' : 'transparent' }]} />
                        <Text style={[s.miniBarLabel, { color: colors.textMuted }]}>{labels[i % 7]}</Text>
                      </View>
                    )
                  })}
                </View>
                {metrics.topTypes.length > 0 && (
                  <View style={s.topTypesRow}>
                    {metrics.topTypes.slice(0, 4).map(t => {
                      const palette = [stickerPalette.yellowSoft, stickerPalette.greenSoft, stickerPalette.pinkSoft, stickerPalette.peachSoft]
                      return (
                        <View key={t.type} style={[s.topTypeChip, { backgroundColor: palette[metrics.topTypes.indexOf(t) % palette.length] }]}>
                          <Text style={[s.topTypeText, { color: STICKER_INK }]}>{formatLogType(t.type)}</Text>
                          <Text style={[s.topTypeCount, { color: STICKER_INK }]}>{t.count}</Text>
                        </View>
                      )
                    })}
                  </View>
                )}
              </View>
            )}

            {/* Generating banner */}
            {generating && (
              <View
                style={[s.generatingBanner, { backgroundColor: colors.accentSoft }]}
              >
                <View style={[s.generatingDot, { backgroundColor: colors.surface }]}>
                  <GrandmaLogo size={42} mode="auto" motion="sparkle" animate />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.generatingTitle, { color: STICKER_INK }]}>Grandma is thinking…</Text>
                  <Text style={[s.generatingSubtext, { color: colors.textMuted }]}>Analyzing your recent data</Text>
                </View>
              </View>
            )}

            {/* Error */}
            {error && !generating && (
              <View style={s.errorBanner}>
                <AlertTriangle size={16} color={brand.error} strokeWidth={2.5} />
                <Text style={[s.errorText, { color: brand.error }]}>{error}</Text>
                <Pressable onPress={handleGenerate} hitSlop={8} style={s.errorRetryBtn}>
                  <RefreshCw size={13} color={brand.error} strokeWidth={2.5} />
                  <Text style={s.errorRetryText}>Retry</Text>
                </Pressable>
              </View>
            )}

            {/* AI Insights section */}
            {isLoading && !generating && (
              <View style={s.loadingWrap}>
                <ActivityIndicator color={colors.accent} />
              </View>
            )}

            {!isLoading && !generating && insights.length === 0 && (
              <View style={[s.noInsightsCard, { backgroundColor: colors.surface }]}>
                <Sparkles size={26} color={colors.textMuted} strokeWidth={1.5} />
                <Text style={[s.noInsightsTitle, { color: colors.text }]}>No AI insights yet</Text>
                <Text style={[s.noInsightsBody, { color: colors.textMuted }]}>
                  Log a few days of data and generate your first personalized insights.
                </Text>
                <Pressable onPress={handleGenerate} style={({ pressed }) => [{ transform: [{ translateY: pressed ? 2 : 0 }] }]}>
                  <View style={[s.generateBtn, { backgroundColor: stickerPalette.yellow }]}>
                    <Sparkles size={15} color={STICKER_INK} strokeWidth={2.5} />
                    <Text style={s.generateBtnText}>Generate insights</Text>
                  </View>
                </Pressable>
              </View>
            )}

            {insights.length > 0 && (
              <View style={s.insightSection}>
                <View style={s.sectionHeader}>
                  <View style={[s.sectionLabelPill, { backgroundColor: colors.accentSoft }]}>
                    <Sparkles size={12} color={colors.accent} strokeWidth={2.5} />
                    <Text style={[s.sectionLabel, { color: colors.accent }]}>Grandma's Insights</Text>
                  </View>
                  <View style={[s.sectionLine, { backgroundColor: STICKER_INK + '15' }]} />
                  <Pressable onPress={handleGenerate} hitSlop={8} style={[s.regenBtn, { backgroundColor: colors.surface }]}>
                    <RefreshCw size={13} color={colors.accent} strokeWidth={2.5} />
                  </Pressable>
                </View>
                {(() => {
                  let cardIndex = 0
                  return typeOrder.map((type) => {
                    const items = grouped[type]
                    if (!items || items.length === 0) return null
                    const config = TYPE_CONFIG[type]
                    return items.map((ins) => {
                      const idx = cardIndex++
                      return (
                        <InsightCard
                          key={ins.id}
                          insight={ins}
                          config={config}
                          index={idx}
                          onTap={() => setSelectedInsight(ins)}
                          onArchive={() => handleArchive(ins.id)}
                        />
                      )
                    })
                  })
                })()}
              </View>
            )}

            {/* Motivation */}
            <View
              style={[s.quoteCard, { backgroundColor: stickerPalette.yellowSoft }]}
            >
              <View style={[s.quoteIconWrap, { backgroundColor: stickerPalette.yellow }]}>
                <MessageSquare size={18} color={STICKER_INK} strokeWidth={2.5} />
              </View>
              <Text style={[s.quoteText, { color: STICKER_INK }]}>"{quote.text}"</Text>
              <Text style={[s.quoteAuthor, { color: colors.textMuted }]}>— {quote.author}</Text>
            </View>

            {/* Ask Grandma CTA — sticker hero button */}
            <Pressable
              onPress={() => router.push('/grandma-talk' as any)}
              style={({ pressed }) => [{ transform: [{ translateY: pressed ? 2 : 0 }] }]}
            >
              <View style={[s.grandmaCta, { backgroundColor: colors.accent }]}>
                <MessageCircle size={18} color={STICKER_INK} strokeWidth={2.5} />
                <Text style={s.grandmaCtaText}>Ask Grandma anything</Text>
                <ChevronRight size={18} color={STICKER_INK} strokeWidth={2.5} />
              </View>
            </Pressable>
          </>
        )}

        {/* ─── READS TAB ───────────────────────────────────────────── */}
        {tab === 'reads' && (
          <>
            <Text style={[s.readsIntro, { color: colors.textSecondary }]}>
              Curated articles for parents{child?.birthDate ? `, filtered for ${ageMonths < 12 ? `${ageMonths}-month-old` : `${Math.floor(ageMonths / 12)}-year-old`} ${childName}` : ''}.
            </Text>

            {/* Category filter — sticker pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.categoryScroll} contentContainerStyle={s.categoryContent}>
              <Pressable
                onPress={() => setArticleCategory('all')}
                style={({ pressed }) => [
                  s.categoryPill,
                  {
                    backgroundColor: articleCategory === 'all' ? colors.accent : (colors.surface),
                    borderColor: articleCategory === 'all' ? STICKER_INK : colors.borderStrong,
                    transform: [{ translateY: articleCategory === 'all' && pressed ? 2 : 0 }],
                    ...(articleCategory === 'all' ? stickerShadowSm : { shadowOpacity: 0, elevation: 0 }),
                  },
                ]}
              >
                <Text style={[s.categoryPillText, { color: articleCategory === 'all' ? STICKER_INK : colors.textSecondary }]}>All</Text>
              </Pressable>
              {(Object.keys(CATEGORY_META) as ArticleCategory[]).map((cat) => {
                const meta = CATEGORY_META[cat]
                const active = articleCategory === cat
                return (
                  <Pressable
                    key={cat}
                    onPress={() => setArticleCategory(cat)}
                    style={({ pressed }) => [
                      s.categoryPill,
                      {
                        backgroundColor: active ? meta.color + '35' : (colors.surface),
                        borderColor: active ? STICKER_INK : colors.borderStrong,
                        transform: [{ translateY: active && pressed ? 2 : 0 }],
                        ...(active ? stickerShadowSm : { shadowOpacity: 0, elevation: 0 }),
                      },
                    ]}
                  >
                    <Text style={[s.categoryPillText, { color: active ? STICKER_INK : colors.textSecondary }]}>{meta.label}</Text>
                  </Pressable>
                )
              })}
            </ScrollView>

            {filteredArticles.length === 0 && (
              <View style={[s.noArticlesWrap, { backgroundColor: colors.surface }]}>
                <BookOpen size={24} color={colors.textMuted} strokeWidth={1.5} />
                <Text style={[s.noArticlesText, { color: colors.textMuted }]}>
                  No articles match this filter for {childName}'s age. Try "All".
                </Text>
              </View>
            )}

            {filteredArticles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                onTap={() => setSelectedArticle(article)}
              />
            ))}
          </>
        )}

        {/* ─── HISTORY TAB ─────────────────────────────────────────── */}
        {tab === 'history' && (
          <>
            {isLoadingHistory && (
              <View style={s.loadingWrap}>
                <ActivityIndicator color={colors.accent} />
              </View>
            )}
            {!isLoadingHistory && archivedInsights.length === 0 && (
              <View style={[s.historyEmpty, { backgroundColor: colors.surface }]}>
                <Clock size={26} color={colors.textMuted} strokeWidth={1.5} />
                <Text style={[s.historyEmptyTitle, { color: colors.text }]}>No past insights</Text>
                <Text style={[s.historyEmptyBody, { color: colors.textMuted }]}>
                  Dismissed and expired insights will appear here.
                </Text>
              </View>
            )}
            {historyGroups.map((group) => (
              <View key={group.label} style={s.historyGroup}>
                <Text style={[s.historyDateLabel, { color: colors.textMuted }]}>{group.label}</Text>
                {group.items.map((ins) => {
                  const config = TYPE_CONFIG[ins.type as InsightType] ?? TYPE_CONFIG.nudge
                  return (
                    <HistoryCard
                      key={ins.id}
                      insight={ins}
                      config={config}
                      onTap={() => setSelectedInsight(ins)}
                      onRestore={() => handleRestore(ins.id)}
                    />
                  )
                })}
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {selectedInsight && (
        <InsightDetailModal
          insight={selectedInsight}
          isArchived={selectedInsight.archived}
          onClose={() => setSelectedInsight(null)}
          onAskGrandma={() => handleAskGrandma(selectedInsight)}
          onArchive={() => handleArchive(selectedInsight.id)}
          onRestore={() => { handleRestore(selectedInsight.id); setSelectedInsight(null) }}
        />
      )}

      {selectedArticle && (
        <ArticleDetailModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
          onAskGrandma={() => {
            setSelectedArticle(null)
            router.push('/grandma-talk' as any)
          }}
        />
      )}
    </View>
  )
}

// ─── Article Card ─────────────────────────────────────────────────────────

function ArticleCard({ article, onTap }: { article: Article; onTap: () => void }) {
  const { colors, isDark } = useTheme()
  const meta = CATEGORY_META[article.category]
  const Icon = meta.icon

  return (
    <Pressable
      onPress={onTap}
      style={({ pressed }) => [
        { marginBottom: 14, transform: [{ translateY: pressed ? 2 : 0 }] },
      ]}
    >
      <View style={[s.articleCard, { backgroundColor: colors.surface }]}>
        <View style={[s.articleColorBar, { backgroundColor: meta.color }]} />
        <View style={s.articleContent}>
          <View style={s.articleMeta}>
            <View style={[s.articleCatBadge, { backgroundColor: meta.color + '28' }]}>
              <Icon size={10} color={STICKER_INK} strokeWidth={2.5} />
              <Text style={[s.articleCatText, { color: STICKER_INK }]}>{meta.label}</Text>
            </View>
            <Text style={[s.articleReadTime, { color: colors.textMuted }]}>{article.readMinutes} min read</Text>
          </View>
          <Text style={[s.articleTitle, { color: colors.text }]}>{article.title}</Text>
          <Text style={[s.articleSummary, { color: colors.textSecondary }]} numberOfLines={2}>{article.summary}</Text>
        </View>
      </View>
    </Pressable>
  )
}

// ─── Article Detail Modal ─────────────────────────────────────────────────

function ArticleDetailModal({
  article,
  onClose,
  onAskGrandma,
}: {
  article: Article
  onClose: () => void
  onAskGrandma: () => void
}) {
  const { colors, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const meta = CATEGORY_META[article.category]
  const Icon = meta.icon

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.modalOverlay}>
        <Pressable style={s.modalBackdrop} onPress={onClose} />
        <View style={s.modalSheet}>
          <View
            style={[s.modalContent, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 24 }]}
          >
            <View style={s.modalHandle}>
              <View style={[s.handleBar, { backgroundColor: STICKER_INK + '40' }]} />
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={({ pressed }) => [
                s.modalClose,
                {
                  backgroundColor: colors.surfaceRaised,
                  borderColor: STICKER_INK + '24',
                  transform: [{ translateY: pressed ? 1 : 0 }],
                  ...stickerShadowSm,
                },
              ]}
            >
              <X size={16} color={colors.textMuted} strokeWidth={2.5} />
            </Pressable>
            <View style={s.modalHeader}>
              <View style={[s.modalIconWrap, { backgroundColor: meta.color + '30', borderColor: STICKER_INK }]}>
                <Icon size={22} color={STICKER_INK} strokeWidth={2.5} />
              </View>
              <View style={[s.articleCatBadge, { backgroundColor: meta.color + '28' }]}>
                <Text style={[s.articleCatText, { color: STICKER_INK }]}>{meta.label}</Text>
              </View>
              <Text style={[s.articleReadTime, { color: colors.textMuted }]}>{article.readMinutes} min read</Text>
            </View>
            <Text style={[s.modalTitle, { color: colors.text }]}>{article.title}</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
              {article.content.map((para, i) => (
                <Text key={i} style={[s.articleParagraph, { color: colors.textSecondary }]}>{para}</Text>
              ))}
            </ScrollView>
            <View style={[s.modalDivider, { backgroundColor: STICKER_INK + '15', marginVertical: 20 }]} />
            <Pressable onPress={onAskGrandma} style={({ pressed }) => [{ transform: [{ translateY: pressed ? 2 : 0 }] }]}>
              <View style={[s.askBtn, { backgroundColor: colors.accent }]}>
                <MessageCircle size={18} color={STICKER_INK} strokeWidth={2.5} />
                <Text style={s.askBtnText}>Ask Grandma about this</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ─── Insight Card ─────────────────────────────────────────────────────────

function InsightCard({
  insight, config, index = 0, onTap, onArchive,
}: {
  insight: Insight
  config: (typeof TYPE_CONFIG)[InsightType]
  index?: number
  onTap: () => void
  onArchive: () => void
}) {
  const { colors, isDark } = useTheme()
  const Icon = config.icon
  const tilt = index % 2 === 0 ? '-0.6deg' : '0.6deg'
  const paper = colors.surface

  return (
    <Pressable
      onPress={onTap}
      style={({ pressed }) => [
        { marginBottom: 14, transform: [{ rotate: tilt }, { translateY: pressed ? 2 : 0 }] },
      ]}
    >
      <View style={[s.card, { backgroundColor: config.gradient[0], borderColor: STICKER_INK, ...stickerShadow }]}>
        <View style={[s.cardRail, { backgroundColor: config.color, borderRightColor: STICKER_INK }]} />
        <View style={s.cardInner}>
          <View style={s.cardTop}>
            <View style={[s.typeBadge, { backgroundColor: paper, borderColor: STICKER_INK }]}>
              <Icon size={12} color={config.color} strokeWidth={2.75} />
              <Text style={[s.typeBadgeText, { color: STICKER_INK }]}>{config.label}</Text>
            </View>
            <Pressable
              onPress={(e) => { e.stopPropagation?.(); onArchive() }}
              hitSlop={12}
              style={({ pressed }) => [
                s.cardCloseBtn,
                {
                  backgroundColor: paper,
                  borderColor: STICKER_INK,
                  transform: [{ translateY: pressed ? 1 : 0 }],
                  ...stickerShadowSm,
                },
              ]}
            >
              <X size={14} color={STICKER_INK} strokeWidth={2.75} />
            </Pressable>
          </View>
          <Text style={[s.cardTitle, { color: STICKER_INK }]} numberOfLines={2}>{insight.title}</Text>
          <Text style={[s.cardBody, { color: STICKER_INK + 'CC' }]} numberOfLines={3}>{insight.body}</Text>
          <View style={[s.cardFooter, { borderTopColor: STICKER_INK + '14' }]}>
            <View style={[s.modeBadge, { backgroundColor: paper, borderColor: STICKER_INK + '30' }]}>
              <Text style={[s.modeText, { color: STICKER_INK }]}>{insight.behavior}</Text>
            </View>
            <View style={[s.tapHint, { backgroundColor: paper, borderColor: STICKER_INK + '24' }]}>
              <Text style={[s.tapHintText, { color: STICKER_INK }]}>Tap for details</Text>
              <ChevronRight size={12} color={STICKER_INK} strokeWidth={2.75} />
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  )
}

// ─── History Card ─────────────────────────────────────────────────────────

function HistoryCard({
  insight, config, onTap, onRestore,
}: {
  insight: Insight
  config: (typeof TYPE_CONFIG)[InsightType]
  onTap: () => void
  onRestore: () => void
}) {
  const { colors, isDark } = useTheme()
  const Icon = config.icon

  return (
    <Pressable
      onPress={onTap}
      style={({ pressed }) => [
        { marginBottom: 10, transform: [{ translateY: pressed ? 2 : 0 }] },
      ]}
    >
      <View style={[s.historyCard, { backgroundColor: colors.surface }]}>
        <View style={[s.historyIconWrap, { backgroundColor: config.gradient[0] }]}>
          <Icon size={16} color={STICKER_INK} strokeWidth={2.5} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[s.historyTitle, { color: colors.text }]} numberOfLines={1}>{insight.title}</Text>
          <Text style={[s.historyBody, { color: colors.textMuted }]} numberOfLines={1}>{insight.body}</Text>
        </View>
        <Pressable onPress={(e) => { e.stopPropagation?.(); onRestore() }} hitSlop={10}
          style={[s.restoreBtn, { backgroundColor: colors.accentSoft }]}>
          <RotateCcw size={14} color={colors.accent} strokeWidth={2.5} />
        </Pressable>
      </View>
    </Pressable>
  )
}

// ─── Insight Detail Modal ─────────────────────────────────────────────────

function InsightDetailModal({
  insight, isArchived, onClose, onAskGrandma, onArchive, onRestore,
}: {
  insight: Insight
  isArchived: boolean
  onClose: () => void
  onAskGrandma: () => void
  onArchive: () => void
  onRestore: () => void
}) {
  const { colors, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const config = TYPE_CONFIG[insight.type as InsightType] ?? TYPE_CONFIG.nudge
  const Icon = config.icon
  const DetailIcon = config.detailIcon

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.modalOverlay}>
        <Pressable style={s.modalBackdrop} onPress={onClose} />
        <View style={s.modalSheet}>
          <View
            style={[s.modalContent, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 24 }]}
          >
            <View style={s.modalHandle}>
              <View style={[s.handleBar, { backgroundColor: STICKER_INK + '40' }]} />
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={({ pressed }) => [
                s.modalClose,
                {
                  backgroundColor: colors.surfaceRaised,
                  borderColor: STICKER_INK + '24',
                  transform: [{ translateY: pressed ? 1 : 0 }],
                  ...stickerShadowSm,
                },
              ]}
            >
              <X size={16} color={colors.textMuted} strokeWidth={2.5} />
            </Pressable>
            <View style={s.modalHeader}>
              <View
                style={[s.modalIconWrap, { backgroundColor: config.gradient[0], borderColor: STICKER_INK }]}
              >
                <Icon size={22} color={STICKER_INK} strokeWidth={2.75} />
              </View>
              <View style={[s.modalTypeBadge, { backgroundColor: config.gradient[0], borderColor: STICKER_INK }]}>
                <Text style={[s.modalTypeText, { color: STICKER_INK }]}>{config.label}</Text>
              </View>
              {isArchived && (
                <View style={s.modalMetaPill}>
                  <Text style={[s.modalMetaPillText, { color: colors.textMuted }]}>Archived</Text>
                </View>
              )}
            </View>
            <Text style={[s.modalTitle, { color: colors.text }]}>{insight.title}</Text>
            <Text style={[s.modalBody, { color: colors.textSecondary }]}>{insight.body}</Text>
            <View style={[s.modalDivider, { backgroundColor: STICKER_INK + '15' }]} />
            <View style={[s.tipCard, { backgroundColor: config.gradient[0], borderColor: STICKER_INK }]}>
              <View style={[s.tipIconDisc, { backgroundColor: colors.surface, borderColor: STICKER_INK }]}>
                <DetailIcon size={16} color={config.color} strokeWidth={2.75} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.tipLabel, { color: STICKER_INK }]}>Grandma's Tip</Text>
                <Text style={[s.tipText, { color: STICKER_INK + 'CC' }]}>{config.tip}</Text>
              </View>
            </View>
            <View style={s.modalMeta}>
              <View style={[s.modalMetaPill, { borderColor: STICKER_INK + '24' }]}>
                <Text style={[s.modalMetaPillText, { color: STICKER_INK }]}>Mode: {insight.behavior}</Text>
              </View>
              <Text style={s.modalDateText}>
                {new Date(insight.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            </View>
            <View style={s.modalActions}>
              <Pressable onPress={onAskGrandma} style={({ pressed }) => [{ flex: 1, transform: [{ translateY: pressed ? 2 : 0 }] }]}>
                <View style={[s.askBtn, { backgroundColor: colors.accent }]}>
                  <MessageCircle size={18} color={STICKER_INK} strokeWidth={2.5} />
                  <Text style={s.askBtnText}>Ask Grandma</Text>
                </View>
              </Pressable>
              {isArchived ? (
                <Pressable onPress={onRestore}
                  style={({ pressed }) => [
                    s.secondaryBtn,
                    { backgroundColor: colors.surfaceRaised, transform: [{ translateY: pressed ? 1 : 0 }] },
                  ]}
                >
                  <RotateCcw size={18} color={colors.accent} strokeWidth={2.5} />
                </Pressable>
              ) : (
                <Pressable onPress={onArchive}
                  style={({ pressed }) => [
                    s.secondaryBtn,
                    { backgroundColor: colors.surfaceRaised, transform: [{ translateY: pressed ? 1 : 0 }] },
                  ]}
                >
                  <X size={18} color={colors.textMuted} strokeWidth={2.5} />
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ─── Compact (used on home screens) ──────────────────────────────────────

export function InsightCardCompact({ insight }: { insight: Insight }) {
  const { colors, radius } = useTheme()
  const config = TYPE_CONFIG[insight.type as InsightType] ?? TYPE_CONFIG.nudge
  const Icon = config.icon

  return (
    <LinearGradient
      colors={config.gradient as unknown as [string, string]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[s.compactCard, { borderRadius: radius.md, borderWidth: 1, borderColor: config.color + '15' }]}
    >
      <View style={[s.compactTag, { backgroundColor: config.color + '20' }]}>
        <Icon size={10} color={config.color} strokeWidth={2.5} />
        <Text style={[s.compactTagText, { color: config.color }]}>{config.label}</Text>
      </View>
      <Text style={[s.compactTitle, { color: colors.text }]} numberOfLines={2}>{insight.title}</Text>
      <Text style={[s.compactBody, { color: colors.textMuted }]} numberOfLines={2}>{insight.body}</Text>
    </LinearGradient>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: STICKER_INK + '20' },
  heading: { fontSize: 38, fontFamily: 'Fraunces_600SemiBold', letterSpacing: -1.2, marginBottom: 6, lineHeight: 42 },
  subtitle: { fontSize: 14, fontFamily: 'DMSans_500Medium', lineHeight: 20, marginBottom: 22 },

  // Tabs — sticker pills (no outer container)
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 22 },
  tabPill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, paddingHorizontal: 8, borderRadius: 999, borderWidth: 1.5 },
  tabText: { fontSize: 13, fontFamily: 'DMSans_600SemiBold', letterSpacing: 0.1 },
  tabBadge: { minWidth: 20, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  tabBadgeText: { fontSize: 10, fontFamily: 'DMSans_700Bold' },

  // Daily Brief — sticker paper (mode-tinted)
  dailyCard: { padding: 22, marginBottom: 14, borderWidth: 1.5, borderColor: STICKER_INK + '18', borderRadius: 26, ...stickerShadow },
  dailyTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 },
  dailyGreeting: { fontSize: 11, fontFamily: 'DMSans_600SemiBold', textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 4 },
  dailyName: { fontSize: 26, fontFamily: 'Fraunces_600SemiBold', letterSpacing: -0.6, lineHeight: 30 },
  sunIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: STICKER_INK, transform: [{ rotate: '-8deg' }], ...stickerShadowSm },
  tipBox: { borderRadius: 18, borderWidth: 1, padding: 16 },
  tipBoxHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  tipBoxLabel: { fontSize: 10, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', letterSpacing: 1.4, flex: 1 },
  agePill: { paddingHorizontal: 9, paddingVertical: 2, borderRadius: 999, borderWidth: 1, borderColor: STICKER_INK + '30' },
  agePillText: { fontSize: 10, fontFamily: 'DMSans_700Bold' },
  tipBoxText: { fontSize: 14, fontFamily: 'DMSans_500Medium', lineHeight: 22 },

  // Week Card — sticker paper
  weekCard: { padding: 18, marginBottom: 16, borderWidth: 1.5, borderColor: STICKER_INK + '18', borderRadius: 24, ...stickerShadow },
  weekHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  weekIconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: STICKER_INK + '20' },
  weekTitle: { fontSize: 18, fontFamily: 'Fraunces_600SemiBold', flex: 1, letterSpacing: -0.3 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderColor: stickerPalette.peach + '60' },
  streakText: { fontSize: 11, fontFamily: 'DMSans_700Bold' },
  weekNarrative: { fontSize: 13, fontFamily: 'DMSans_500Medium', lineHeight: 20, marginBottom: 16 },
  miniBars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 4, marginBottom: 14, paddingHorizontal: 4 },
  miniBarCol: { flex: 1, alignItems: 'center', gap: 5 },
  miniBar: { width: '100%', borderWidth: 1, borderColor: STICKER_INK + '30' },
  miniBarLabel: { fontSize: 10, fontFamily: 'DMSans_600SemiBold', letterSpacing: 0.4 },
  topTypesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  topTypeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 11, borderRadius: 999, borderWidth: 1, borderColor: STICKER_INK + '20' },
  topTypeText: { fontSize: 11, fontFamily: 'DMSans_600SemiBold' },
  topTypeCount: { fontSize: 11, fontFamily: 'DMSans_700Bold' },

  // Generating / error — sticker banners
  generatingBanner: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, marginBottom: 16, borderWidth: 1.5, borderColor: STICKER_INK + '18', borderRadius: 22, ...stickerShadowSm },
  generatingDot: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: STICKER_INK + '24', overflow: 'hidden' },
  generatingTitle: { fontSize: 14, fontFamily: 'DMSans_700Bold' },
  generatingSubtext: { fontSize: 12, fontFamily: 'DMSans_500Medium', marginTop: 1 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, marginBottom: 16, backgroundColor: stickerPalette.peachSoft, borderWidth: 1.5, borderColor: brand.error, borderRadius: 18, ...stickerShadowSm },
  errorText: { fontSize: 13, fontFamily: 'DMSans_500Medium', flex: 1 },
  errorRetryBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: brand.error },
  errorRetryText: { fontSize: 11, fontFamily: 'DMSans_700Bold', color: brand.error },
  loadingWrap: { paddingVertical: 40, alignItems: 'center' },

  // AI Insights section
  insightSection: { marginBottom: 22 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionLabelPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: STICKER_INK + '20' },
  sectionIconWrap: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { fontSize: 11, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', letterSpacing: 1.4 },
  sectionLine: { flex: 1, height: 1 },
  regenBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: STICKER_INK + '20' },
  noInsightsCard: { alignItems: 'center', padding: 30, gap: 12, borderWidth: 1.5, borderColor: STICKER_INK + '18', marginBottom: 16, borderRadius: 24, ...stickerShadowSm },
  noInsightsTitle: { fontSize: 18, fontFamily: 'Fraunces_600SemiBold', letterSpacing: -0.3 },
  noInsightsBody: { fontSize: 13, fontFamily: 'DMSans_500Medium', textAlign: 'center', lineHeight: 20 },
  generateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 13, paddingHorizontal: 24, marginTop: 6, borderWidth: 1.5, borderColor: STICKER_INK, borderRadius: 999, ...stickerShadowSm },
  generateBtnText: { fontSize: 14, fontFamily: 'DMSans_700Bold', color: STICKER_INK },

  // Insight card — sticker paper with accent rail
  card: { overflow: 'hidden', borderRadius: 24, borderWidth: 2 },
  cardRail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 10, borderRightWidth: 2 },
  cardInner: { padding: 18, paddingLeft: 24 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1.5 },
  typeBadgeText: { fontSize: 10, fontFamily: 'DMSans_700Bold', letterSpacing: 1.2, textTransform: 'uppercase' },
  cardCloseBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  cardTitle: { fontSize: 18, fontFamily: 'Fraunces_600SemiBold', marginBottom: 8, letterSpacing: -0.4, lineHeight: 24 },
  cardBody: { fontSize: 13, fontFamily: 'DMSans_500Medium', lineHeight: 20, marginBottom: 14 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1 },
  modeBadge: { paddingVertical: 4, paddingHorizontal: 11, borderRadius: 999, borderWidth: 1 },
  modeText: { fontSize: 10, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', letterSpacing: 1.2 },
  tapHint: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1 },
  tapHintText: { fontSize: 11, fontFamily: 'DMSans_600SemiBold' },

  // Quote — yellow sticker paper
  quoteCard: { padding: 22, marginBottom: 16, borderWidth: 1.5, borderColor: STICKER_INK + '18', alignItems: 'flex-start', gap: 12, borderRadius: 26, ...stickerShadow },
  quoteIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: STICKER_INK, transform: [{ rotate: '-6deg' }] },
  quoteText: { fontSize: 16, fontFamily: 'InstrumentSerif_400Regular_Italic', lineHeight: 24 },
  quoteAuthor: { fontSize: 12, fontFamily: 'DMSans_600SemiBold' },

  // Grandma CTA — hero sticker button
  grandmaCta: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 18, paddingHorizontal: 22, marginBottom: 8, borderWidth: 1.5, borderColor: STICKER_INK, borderRadius: 999, ...stickerShadow },
  grandmaCtaText: { flex: 1, fontSize: 16, fontFamily: 'DMSans_700Bold', color: STICKER_INK },

  // Reads tab
  readsIntro: { fontSize: 13, fontFamily: 'DMSans_500Medium', lineHeight: 19, marginBottom: 14 },
  categoryScroll: { marginBottom: 18 },
  categoryContent: { gap: 8, paddingVertical: 2 },
  categoryPill: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1.5 },
  categoryPillText: { fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
  noArticlesWrap: { alignItems: 'center', padding: 32, gap: 10, borderWidth: 1.5, borderColor: STICKER_INK + '18', borderRadius: 22, ...stickerShadowSm },
  noArticlesText: { fontSize: 13, fontFamily: 'DMSans_500Medium', textAlign: 'center', lineHeight: 20 },

  // Article card — sticker paper
  articleCard: { flexDirection: 'row', overflow: 'hidden', borderWidth: 1.5, borderColor: STICKER_INK + '18', borderRadius: 22, ...stickerShadow },
  articleColorBar: { width: 6 },
  articleContent: { flex: 1, padding: 16, gap: 6 },
  articleMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  articleCatBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999, borderWidth: 1, borderColor: STICKER_INK + '24' },
  articleCatText: { fontSize: 10, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', letterSpacing: 1 },
  articleReadTime: { fontSize: 11, fontFamily: 'DMSans_500Medium' },
  articleTitle: { fontSize: 17, fontFamily: 'Fraunces_600SemiBold', letterSpacing: -0.3, lineHeight: 22 },
  articleSummary: { fontSize: 13, fontFamily: 'DMSans_500Medium', lineHeight: 19 },
  articleParagraph: { fontSize: 14, fontFamily: 'DMSans_400Regular', lineHeight: 22, marginBottom: 14 },

  // History
  historyEmpty: { alignItems: 'center', padding: 32, gap: 10, borderWidth: 1.5, borderColor: STICKER_INK + '18', borderRadius: 22, ...stickerShadowSm },
  historyEmptyTitle: { fontSize: 18, fontFamily: 'Fraunces_600SemiBold', letterSpacing: -0.3 },
  historyEmptyBody: { fontSize: 13, fontFamily: 'DMSans_500Medium', textAlign: 'center' },
  historyGroup: { marginBottom: 22 },
  historyDateLabel: { fontSize: 11, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', letterSpacing: 1.6, marginBottom: 12, marginLeft: 4 },
  historyCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1.5, borderColor: STICKER_INK + '18', borderRadius: 20, ...stickerShadowSm },
  historyIconWrap: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: STICKER_INK + '20' },
  historyTitle: { fontSize: 14, fontFamily: 'DMSans_700Bold' },
  historyBody: { fontSize: 12, fontFamily: 'DMSans_500Medium' },
  restoreBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: STICKER_INK + '20' },

  // Modal (shared) — sticker paper sheet
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  modalSheet: { maxHeight: '88%' },
  modalContent: { padding: 24, paddingTop: 12, borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  modalHandle: { alignItems: 'center', paddingVertical: 8 },
  handleBar: { width: 44, height: 4, borderRadius: 2 },
  modalClose: { position: 'absolute', top: 16, right: 20, zIndex: 10, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 22 },
  modalIconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2, transform: [{ rotate: '-4deg' }], ...stickerShadowSm },
  modalTypeBadge: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5 },
  modalTypeText: { fontSize: 11, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', letterSpacing: 1.4 },
  modalMetaPill: { paddingVertical: 5, paddingHorizontal: 11, borderRadius: 999, borderWidth: 1, backgroundColor: 'rgba(20,19,19,0.04)' },
  modalMetaPillText: { fontSize: 11, fontFamily: 'DMSans_700Bold' },
  modalDateText: { fontSize: 16, fontFamily: 'InstrumentSerif_400Regular_Italic', color: STICKER_INK + 'A0' },
  modalTitle: { fontSize: 26, fontFamily: 'Fraunces_600SemiBold', letterSpacing: -0.7, marginBottom: 12, lineHeight: 30 },
  modalBody: { fontSize: 15, fontFamily: 'DMSans_500Medium', lineHeight: 24, marginBottom: 22 },
  modalDivider: { height: 1, marginBottom: 22 },
  tipCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, paddingRight: 18, borderRadius: 22, borderWidth: 2, marginBottom: 22, ...stickerShadowSm },
  tipIconDisc: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, transform: [{ rotate: '6deg' }] },
  tipLabel: { fontSize: 13, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  tipText: { fontSize: 14, fontFamily: 'DMSans_500Medium', lineHeight: 21 },
  modalMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  modalActions: { flexDirection: 'row', gap: 12 },
  askBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 999, borderWidth: 1.5, borderColor: STICKER_INK, ...stickerShadow },
  askBtnText: { fontSize: 16, fontFamily: 'DMSans_700Bold', color: STICKER_INK },
  secondaryBtn: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: STICKER_INK + '24', ...stickerShadowSm },

  // Compact
  compactCard: { flex: 1, padding: 14, gap: 6 },
  compactTag: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 10 },
  compactTagText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  compactTitle: { fontSize: 13, fontWeight: '700', lineHeight: 17 },
  compactBody: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
})
