/**
 * Kids Home — Premium Data-Rich Dashboard
 *
 * Multi-ring progress hero (Sleep, Calories, Activity), date range picker,
 * past-7-days mini rings, detail modals for metric cards.
 * All real data from Supabase.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  View, Text, Pressable, ScrollView, StyleSheet, Dimensions, Image, Modal, TextInput, Platform,
  Animated, PanResponder,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import Svg, {
  Circle as SvgCircle, Defs, LinearGradient, Stop, Path, Line as SvgLine, Text as SvgText,
} from 'react-native-svg'
import Reanimated, {
  useSharedValue, useAnimatedProps, useAnimatedStyle,
  withDelay, withSpring, withTiming, withRepeat, Easing,
} from 'react-native-reanimated'
import {
  Moon, Smile, Utensils, Heart, Camera, ChevronRight, ChevronDown,
  Thermometer, MessageCircle, Plus, AlertCircle, Baby,
  Brain, Rocket, Check, Sparkles, Activity, X, TrendingUp,
  Zap, Droplets, Clock, Settings, Minus, Milk, Hand,
  Bell, Trash2, Syringe, Pill, Pencil, GripVertical, Flag, Trophy, Flame, Star,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTheme, brand } from '../../constants/theme'
import { useChildStore } from '../../store/useChildStore'
import { useJourneyStore } from '../../store/useJourneyStore'
import { useProfile } from '../../lib/useProfile'
import { HomeGreeting } from './HomeGreeting'
import { Heart as HeartSticker, Flower as FlowerSticker, Burst as BurstSticker, Star as StarSticker, Cross as CrossSticker, Moon as MoonSticker, Sparkle as SparkleSticker, Leaf as LeafSticker, Pill as PillSticker } from '../ui/Stickers'
import { StickerPalette } from '../stickers/BrandStickers'
import { Flame as FlameSticker } from '../stickers/RewardStickers'
import { stickerForEmoji } from '../../lib/emojiToSticker'

const DIAPER_STICKER_INK = '#141313'
import {
  NotifyAppointmentDue, NotifyRoutine, NotifyInsight, NotifyGoalAchieved,
  TipRead, LogWater, LogUltrasound,
  LogExercise, LogMilestone, LogNote, LogKicks,
} from '../stickers/RewardStickers'

// Drop-in replacement for the old <EmojiSticker> component that renders a sticker.
function EmojiSticker({ size = 20, children, style }: { size?: number; children: string | undefined; style?: any }) {
  const S = stickerForEmoji(children ?? '')
  return <View style={style}><S size={size} /></View>
}
import { MoodFace } from '../stickers/RewardStickers'
import { moodFaceVariant, moodFaceFill } from '../../lib/moodFace'
import { useGoalsStore, getSuggestedGoals, getFeedingStage, getNutritionLabel, getAgeMonths, type MetricGoals, type FeedingStage } from '../../store/useGoalsStore'
import { useBadgeStore } from '../../store/useBadgeStore'
import { supabase } from '../../lib/supabase'
import { estimateCalories } from '../../lib/foodCalories'
import { getVaccineInfo, type VaccineInfo } from '../../lib/vaccineInfo'
import type { ChildWithRole } from '../../types'
import { MoodBubbleCluster } from '../charts/SvgCharts'
import type { MoodBubbleItem } from '../charts/SvgCharts'

const SW = Dimensions.get('window').width
const AnimatedSvgCircle = Reanimated.createAnimatedComponent(SvgCircle)

// ─── Growth Leap Data ────────────────────────────────────────────────────────

const GROWTH_LEAPS = [
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

function getGrowthLeap(birthDate: string) {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  const now = new Date()
  const weekAge = Math.floor((now.getTime() - birth.getTime()) / (7 * 24 * 60 * 60 * 1000))

  let completedCount = 0

  for (let i = 0; i < GROWTH_LEAPS.length; i++) {
    const leap = GROWTH_LEAPS[i]
    const leapStart = leap.week - 2
    const leapEnd = leap.week + 1

    if (weekAge >= leapStart && weekAge <= leapEnd) {
      const offset = weekAge - leapStart
      const phaseIndex = offset <= 1 ? 0 : offset === 2 ? 1 : 2
      const progress = (weekAge - leapStart) / (leapEnd - leapStart)
      return { ...leap, status: 'active' as const, index: i, weekAge, progress, phaseIndex, completedCount }
    }
    if (weekAge < leapStart) {
      const weeksUntil = leapStart - weekAge
      return { ...leap, status: 'upcoming' as const, index: i, weekAge, weeksUntil, progress: 0, phaseIndex: -1, completedCount }
    }
    completedCount = i + 1
  }
  // Child has passed all leaps
  const lastLeap = GROWTH_LEAPS[GROWTH_LEAPS.length - 1]
  return { ...lastLeap, status: 'done' as const, index: GROWTH_LEAPS.length - 1, weekAge, progress: 1, phaseIndex: -1, completedCount: GROWTH_LEAPS.length }
}

// ─── Vaccine Schedules by Country ────────────────────────────────────────────

type VaccineEntry = { name: string; ages: string[]; monthRanges: [number, number][] }

const VACCINE_SCHEDULES: Record<string, VaccineEntry[]> = {
  // ── United States (CDC) ──────────────────────────────────────────────────
  US: [
    { name: 'Hepatitis B',  ages: ['Birth', '1-2 months', '6-18 months'],                          monthRanges: [[0,1],[1,2],[6,18]] },
    { name: 'DTaP',         ages: ['2 months', '4 months', '6 months', '15-18 months', '4-6 yrs'], monthRanges: [[2,2],[4,4],[6,6],[15,18],[48,72]] },
    { name: 'IPV',          ages: ['2 months', '4 months', '6-18 months', '4-6 yrs'],              monthRanges: [[2,2],[4,4],[6,18],[48,72]] },
    { name: 'MMR',          ages: ['12-15 months', '4-6 yrs'],                                     monthRanges: [[12,15],[48,72]] },
    { name: 'Varicella',    ages: ['12-15 months', '4-6 yrs'],                                     monthRanges: [[12,15],[48,72]] },
    { name: 'Hib',          ages: ['2 months', '4 months', '6 months', '12-15 months'],            monthRanges: [[2,2],[4,4],[6,6],[12,15]] },
    { name: 'PCV15',        ages: ['2 months', '4 months', '6 months', '12-15 months'],            monthRanges: [[2,2],[4,4],[6,6],[12,15]] },
    { name: 'Rotavirus',    ages: ['2 months', '4 months', '6 months'],                            monthRanges: [[2,2],[4,4],[6,6]] },
    { name: 'Influenza',    ages: ['6 months (yearly)'],                                           monthRanges: [[6,999]] },
    { name: 'Hepatitis A',  ages: ['12-23 months', '18-23 months'],                                monthRanges: [[12,23],[18,23]] },
  ],

  // ── Brazil (PNI — Programa Nacional de Imunizações) ──────────────────────
  BR: [
    { name: 'BCG',              ages: ['Birth'],                                                    monthRanges: [[0,1]] },
    { name: 'Hepatite B',       ages: ['Birth', '2 meses', '6 meses'],                             monthRanges: [[0,1],[2,2],[6,6]] },
    { name: 'Pentavalente',     ages: ['2 meses', '4 meses', '6 meses'],                           monthRanges: [[2,2],[4,4],[6,6]] },
    { name: 'VIP/VOP (Polio)',  ages: ['2 meses', '4 meses', '6 meses', '15 meses', '4 anos'],    monthRanges: [[2,2],[4,4],[6,6],[15,15],[48,48]] },
    { name: 'Rotavírus',        ages: ['2 meses', '4 meses'],                                      monthRanges: [[2,2],[4,4]] },
    { name: 'Pneumocócica 10',  ages: ['2 meses', '4 meses', '12 meses (reforço)'],               monthRanges: [[2,2],[4,4],[12,12]] },
    { name: 'Meningocócica C',  ages: ['3 meses', '5 meses', '12 meses (reforço)'],               monthRanges: [[3,3],[5,5],[12,12]] },
    { name: 'Febre Amarela',    ages: ['9 meses', '4 anos'],                                       monthRanges: [[9,9],[48,48]] },
    { name: 'Tríplice Viral',   ages: ['12 meses', '15 meses'],                                    monthRanges: [[12,12],[15,15]] },
    { name: 'Varicela',         ages: ['15 meses'],                                                monthRanges: [[15,15]] },
    { name: 'DTP (reforço)',    ages: ['15 meses', '4 anos'],                                      monthRanges: [[15,15],[48,48]] },
    { name: 'Hepatite A',       ages: ['15 meses'],                                                monthRanges: [[15,15]] },
    { name: 'Influenza',        ages: ['6 meses (anual)'],                                         monthRanges: [[6,999]] },
  ],

  // ── United Kingdom (NHS) ──────────────────────────────────────────────────
  GB: [
    { name: '6-in-1 (DTaP/IPV/Hib/HepB)', ages: ['8 weeks', '12 weeks', '16 weeks'],             monthRanges: [[2,2],[3,3],[4,4]] },
    { name: 'Rotavirus',        ages: ['8 weeks', '12 weeks'],                                     monthRanges: [[2,2],[3,3]] },
    { name: 'MenB',             ages: ['8 weeks', '16 weeks', '1 year'],                           monthRanges: [[2,2],[4,4],[12,12]] },
    { name: 'PCV (pneumo)',     ages: ['12 weeks', '1 year'],                                      monthRanges: [[3,3],[12,12]] },
    { name: 'Hib/MenC',        ages: ['1 year'],                                                   monthRanges: [[12,12]] },
    { name: 'MMR',              ages: ['1 year', '3 years 4 months'],                              monthRanges: [[12,12],[40,40]] },
    { name: '4-in-1 (DTaP/IPV)', ages: ['3 years 4 months'],                                      monthRanges: [[40,40]] },
    { name: 'Flu (nasal spray)',ages: ['2 years (annually)'],                                      monthRanges: [[24,999]] },
  ],

  // ── Australia (NHMRC) ─────────────────────────────────────────────────────
  AU: [
    { name: 'Hepatitis B',      ages: ['Birth', '2 months', '4 months', '6 months'],               monthRanges: [[0,1],[2,2],[4,4],[6,6]] },
    { name: 'DTaP/IPV/Hib',    ages: ['2 months', '4 months', '6 months'],                        monthRanges: [[2,2],[4,4],[6,6]] },
    { name: 'Rotavirus',        ages: ['2 months', '4 months', '6 months'],                        monthRanges: [[2,2],[4,4],[6,6]] },
    { name: 'PCV13',            ages: ['2 months', '4 months', '6 months', '12 months'],           monthRanges: [[2,2],[4,4],[6,6],[12,12]] },
    { name: 'MenACWY',          ages: ['12 months'],                                               monthRanges: [[12,12]] },
    { name: 'MMR',              ages: ['12 months', '18 months'],                                  monthRanges: [[12,12],[18,18]] },
    { name: 'Varicella',        ages: ['18 months'],                                               monthRanges: [[18,18]] },
    { name: 'Hib booster',      ages: ['18 months'],                                               monthRanges: [[18,18]] },
    { name: 'DTaP/IPV (booster)',ages: ['4 years'],                                                monthRanges: [[48,48]] },
    { name: 'Influenza',        ages: ['6 months (annually)'],                                     monthRanges: [[6,999]] },
  ],

  // ── Canada ────────────────────────────────────────────────────────────────
  CA: [
    { name: 'Hepatitis B',      ages: ['Birth', '2 months', '6 months'],                          monthRanges: [[0,1],[2,2],[6,6]] },
    { name: 'DTaP/IPV/Hib',    ages: ['2 months', '4 months', '6 months', '18 months'],           monthRanges: [[2,2],[4,4],[6,6],[18,18]] },
    { name: 'Rotavirus',        ages: ['2 months', '4 months'],                                    monthRanges: [[2,2],[4,4]] },
    { name: 'PCV13',            ages: ['2 months', '4 months', '12 months'],                       monthRanges: [[2,2],[4,4],[12,12]] },
    { name: 'MMR',              ages: ['12 months', '18 months'],                                  monthRanges: [[12,12],[18,18]] },
    { name: 'Varicella',        ages: ['12 months', '18 months'],                                  monthRanges: [[12,12],[18,18]] },
    { name: 'MenC',             ages: ['12 months'],                                               monthRanges: [[12,12]] },
    { name: 'DTaP/IPV (booster)',ages: ['4-6 years'],                                              monthRanges: [[48,72]] },
    { name: 'Influenza',        ages: ['6 months (annually)'],                                     monthRanges: [[6,999]] },
  ],

  // ── Portugal (DGS) ───────────────────────────────────────────────────────
  PT: [
    { name: 'BCG',              ages: ['Nascimento'],                                              monthRanges: [[0,1]] },
    { name: 'Hepatite B',       ages: ['Nascimento', '2 meses', '6 meses'],                       monthRanges: [[0,1],[2,2],[6,6]] },
    { name: 'Hexavalente',      ages: ['2 meses', '4 meses', '6 meses'],                          monthRanges: [[2,2],[4,4],[6,6]] },
    { name: 'PCV13',            ages: ['2 meses', '4 meses', '12 meses'],                         monthRanges: [[2,2],[4,4],[12,12]] },
    { name: 'MenC',             ages: ['3 meses', '12 meses'],                                    monthRanges: [[3,3],[12,12]] },
    { name: 'Rotavírus',        ages: ['2 meses', '3 meses', '4 meses'],                          monthRanges: [[2,2],[3,3],[4,4]] },
    { name: 'VASPR (MMR)',      ages: ['12 meses', '5 anos'],                                     monthRanges: [[12,12],[60,60]] },
    { name: 'Varicela',         ages: ['2 anos', '5 anos'],                                       monthRanges: [[24,24],[60,60]] },
    { name: 'Influenza',        ages: ['6 meses (anual)'],                                        monthRanges: [[6,999]] },
  ],

  // ── Germany (STIKO) ──────────────────────────────────────────────────────
  DE: [
    { name: 'Hepatitis B',      ages: ['Birth', '2 months', '4 months', '11 months'],             monthRanges: [[0,1],[2,2],[4,4],[11,11]] },
    { name: 'DTaP/IPV/Hib',    ages: ['2 months', '4 months', '11 months'],                      monthRanges: [[2,2],[4,4],[11,11]] },
    { name: 'Rotavirus',        ages: ['2 months', '3 months', '4 months'],                       monthRanges: [[2,2],[3,3],[4,4]] },
    { name: 'PCV13',            ages: ['2 months', '4 months', '11 months'],                      monthRanges: [[2,2],[4,4],[11,11]] },
    { name: 'MenC',             ages: ['12 months'],                                              monthRanges: [[12,12]] },
    { name: 'MMR',              ages: ['11 months', '15 months'],                                 monthRanges: [[11,11],[15,15]] },
    { name: 'Varizellen',       ages: ['11 months', '15 months'],                                 monthRanges: [[11,11],[15,15]] },
    { name: 'Influenza',        ages: ['6 months (annually)'],                                    monthRanges: [[6,999]] },
  ],

  // ── France (Calendrier vaccinal) ──────────────────────────────────────────
  FR: [
    { name: 'Hépatite B',       ages: ['2 mois', '4 mois', '11 mois'],                           monthRanges: [[2,2],[4,4],[11,11]] },
    { name: 'DTCaP-Hib (Hexa)',  ages: ['2 mois', '4 mois', '11 mois'],                          monthRanges: [[2,2],[4,4],[11,11]] },
    { name: 'Rotavirus',        ages: ['2 mois', '3 mois', '4 mois'],                            monthRanges: [[2,2],[3,3],[4,4]] },
    { name: 'Pneumocoque (PCV13)', ages: ['2 mois', '4 mois', '11 mois'],                        monthRanges: [[2,2],[4,4],[11,11]] },
    { name: 'Méningocoque C',   ages: ['5 mois', '12 mois'],                                     monthRanges: [[5,5],[12,12]] },
    { name: 'ROR (MMR)',        ages: ['12 mois', '16-18 mois'],                                  monthRanges: [[12,12],[16,18]] },
    { name: 'Influenza',        ages: ['6 mois (annuel)'],                                        monthRanges: [[6,999]] },
  ],

  // ── Mexico (CENSIA) ──────────────────────────────────────────────────────
  MX: [
    { name: 'BCG',              ages: ['Nacimiento'],                                             monthRanges: [[0,1]] },
    { name: 'Hepatitis B',      ages: ['Nacimiento', '2 meses', '6 meses'],                      monthRanges: [[0,1],[2,2],[6,6]] },
    { name: 'Pentavalente',     ages: ['2 meses', '4 meses', '6 meses', '18 meses'],             monthRanges: [[2,2],[4,4],[6,6],[18,18]] },
    { name: 'Rotavirus',        ages: ['2 meses', '4 meses'],                                    monthRanges: [[2,2],[4,4]] },
    { name: 'Neumocócica',      ages: ['2 meses', '4 meses', '12 meses'],                        monthRanges: [[2,2],[4,4],[12,12]] },
    { name: 'SRP (MMR)',        ages: ['12 meses', '6 años'],                                    monthRanges: [[12,12],[72,72]] },
    { name: 'Varicela',         ages: ['12 meses'],                                              monthRanges: [[12,12]] },
    { name: 'Influenza',        ages: ['6 meses (anual)'],                                       monthRanges: [[6,999]] },
  ],

  // ── Argentina (MSAL) ─────────────────────────────────────────────────────
  AR: [
    { name: 'BCG',              ages: ['Nacimiento'],                                             monthRanges: [[0,1]] },
    { name: 'Hepatitis B',      ages: ['Nacimiento', '2 meses', '6 meses'],                      monthRanges: [[0,1],[2,2],[6,6]] },
    { name: 'Pentavalente',     ages: ['2 meses', '4 meses', '6 meses'],                         monthRanges: [[2,2],[4,4],[6,6]] },
    { name: 'IPV (Polio)',      ages: ['2 meses', '4 meses', '6 meses', '18 meses'],             monthRanges: [[2,2],[4,4],[6,6],[18,18]] },
    { name: 'Rotavirus',        ages: ['2 meses', '4 meses'],                                    monthRanges: [[2,2],[4,4]] },
    { name: 'Neumocócica',      ages: ['2 meses', '4 meses', '12 meses'],                        monthRanges: [[2,2],[4,4],[12,12]] },
    { name: 'Meningocócica',    ages: ['3 meses', '5 meses', '15 meses'],                        monthRanges: [[3,3],[5,5],[15,15]] },
    { name: 'SRP (MMR)',        ages: ['12 meses', '18 meses'],                                  monthRanges: [[12,12],[18,18]] },
    { name: 'Varicela',         ages: ['15 meses'],                                              monthRanges: [[15,15]] },
    { name: 'Fiebre Amarilla',  ages: ['15 meses'],                                              monthRanges: [[15,15]] },
    { name: 'Influenza',        ages: ['6 meses (anual)'],                                       monthRanges: [[6,999]] },
  ],

  // ── India (UIP) ──────────────────────────────────────────────────────────
  IN: [
    { name: 'BCG',              ages: ['Birth'],                                                  monthRanges: [[0,1]] },
    { name: 'Oral Polio Vaccine', ages: ['Birth', '6 weeks', '10 weeks', '14 weeks'],            monthRanges: [[0,1],[1,1],[2,2],[3,3]] },
    { name: 'Hepatitis B',      ages: ['Birth', '6 weeks', '10 weeks', '14 weeks'],              monthRanges: [[0,1],[1,1],[2,2],[3,3]] },
    { name: 'DPT',              ages: ['6 weeks', '10 weeks', '14 weeks', '16-24 months', '5 yrs'], monthRanges: [[1,1],[2,2],[3,3],[16,24],[60,60]] },
    { name: 'Rotavirus',        ages: ['6 weeks', '10 weeks', '14 weeks'],                       monthRanges: [[1,1],[2,2],[3,3]] },
    { name: 'Pneumococcal (PCV)', ages: ['6 weeks', '14 weeks', '9 months'],                     monthRanges: [[1,1],[3,3],[9,9]] },
    { name: 'IPV',              ages: ['6 weeks', '14 weeks'],                                   monthRanges: [[1,1],[3,3]] },
    { name: 'Measles (MR)',     ages: ['9-12 months', '16-24 months'],                           monthRanges: [[9,12],[16,24]] },
    { name: 'Japanese Encephalitis', ages: ['9-12 months', '16-24 months'],                      monthRanges: [[9,12],[16,24]] },
    { name: 'Vitamin A',        ages: ['9 months (every 6mo)'],                                  monthRanges: [[9,999]] },
  ],
}

function getScheduleForCountry(countryCode: string): VaccineEntry[] {
  return VACCINE_SCHEDULES[countryCode] ?? VACCINE_SCHEDULES['US']
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatAge(bd: string): string {
  if (!bd) return ''
  const b = new Date(bd), n = new Date()
  const m = (n.getFullYear() - b.getFullYear()) * 12 + (n.getMonth() - b.getMonth())
  if (m < 1) return 'Newborn'
  if (m < 12) return `${m}mo`
  const y = Math.floor(m / 12), r = m % 12
  return r > 0 ? `${y}y ${r}mo` : `${y}y`
}

function getRecommendedSleep(bd: string, days: number): number {
  if (!bd) return 8 * days
  const m = (new Date().getFullYear() - new Date(bd).getFullYear()) * 12 + (new Date().getMonth() - new Date(bd).getMonth())
  if (m < 4) return 15 * days
  if (m < 12) return 13 * days
  if (m < 36) return 12 * days
  return 10.5 * days
}

function getRecommendedCalories(bd: string): number {
  if (!bd) return 1200
  const m = (new Date().getFullYear() - new Date(bd).getFullYear()) * 12 + (new Date().getMonth() - new Date(bd).getMonth())
  if (m < 6) return 600
  if (m < 12) return 800
  if (m < 24) return 1000
  return 1200
}

// CHILD_COLORS imported from shared component
import { CHILD_COLORS } from '../ui/ChildPills'

const MOOD_COLORS: Record<string, string> = {
  happy: '#FBBF24', calm: '#6EC96E', energetic: '#4D96FF', fussy: '#FF9800', cranky: '#FF7070',
}
const MOOD_LABELS: Record<string, string> = {
  happy: 'Happy', calm: 'Calm', energetic: 'Active', fussy: 'Fussy', cranky: 'Cranky',
}
const MOOD_EMOJI: Record<string, string> = {
  cranky: '😠', fussy: '😟', energetic: '😐', calm: '🙂', happy: '😊',
}

// Normalize a date value from Supabase to YYYY-MM-DD string
/** Format a Date to local YYYY-MM-DD (matches how calendar stores log dates). */
function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatTime12h(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':')
  const h = parseInt(hStr, 10)
  const m = mStr ?? '00'
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${m} ${ampm}`
}

function toDateStr(d: any): string {
  if (!d) return ''
  if (typeof d === 'string') {
    // Already YYYY-MM-DD or ISO string
    return d.substring(0, 10)
  }
  if (d instanceof Date) return localDateStr(d)
  return String(d).substring(0, 10)
}

// Ring colors for the 3 pillars
const PILLAR_COLORS = {
  sleep: '#9DC3E8',       // sticker blue
  nutrition: '#EE7B6D',   // sticker coral
  activity: '#BDD48C',    // sticker green
}

// ─── Date Range ─────────────────────────────────────────────────────────────

type DateRange = 'today' | 'yesterday' | '7days' | '30days' | 'custom'

const DATE_RANGE_OPTIONS: { key: DateRange; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7days', label: '7 Days' },
  { key: '30days', label: '30 Days' },
  { key: 'custom', label: 'Custom' },
]

function getDateRange(
  range: DateRange,
  custom?: { start: Date; end: Date },
): { startDate: string; endDate: string; days: number } {
  const today = new Date()

  switch (range) {
    case 'today':
      return { startDate: localDateStr(today), endDate: localDateStr(today), days: 1 }
    case 'yesterday': {
      const y = new Date(today)
      y.setDate(y.getDate() - 1)
      return { startDate: localDateStr(y), endDate: localDateStr(y), days: 1 }
    }
    case '7days': {
      const start = new Date(today)
      start.setDate(start.getDate() - 6)
      return { startDate: localDateStr(start), endDate: localDateStr(today), days: 7 }
    }
    case '30days': {
      const start = new Date(today)
      start.setDate(start.getDate() - 29)
      return { startDate: localDateStr(start), endDate: localDateStr(today), days: 30 }
    }
    case 'custom': {
      if (!custom) {
        // fallback to last 7 days if custom range not yet set
        const start = new Date(today)
        start.setDate(start.getDate() - 6)
        return { startDate: localDateStr(start), endDate: localDateStr(today), days: 7 }
      }
      const diffMs = custom.end.getTime() - custom.start.getTime()
      const days = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1)
      return { startDate: localDateStr(custom.start), endDate: localDateStr(custom.end), days }
    }
  }
}

function fmtShortDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function subtitleForRange(range: DateRange, childName: string, custom?: { start: Date; end: Date }): string {
  switch (range) {
    case 'today': return `${childName}'s Day`
    case 'yesterday': return `${childName}'s Yesterday`
    case '7days': return `${childName}'s Week`
    case '30days': return `${childName}'s Month`
    case 'custom':
      if (custom) return `${childName}: ${fmtShortDate(custom.start)} – ${fmtShortDate(custom.end)}`
      return `${childName}'s Week`
  }
}

// ─── Data Types ──────────────────────────────────────────────────────────────

type MiniRingMetric = 'sleep' | 'nutrition' | 'activity'

interface RangeData {
  sleepTotal: number
  sleepTarget: number
  // Nutrition — adapts by feeding stage
  caloriesTotal: number
  caloriesTarget: number
  feedingCount: number        // total breast/bottle feedings in range
  feedingCountTarget: number
  feedingMl: number           // total ml consumed in range
  feedingMlTarget: number
  activityCount: number
  activityTarget: number
  // Diaper tracking
  diaperCount: number
  diaperPee: number
  diaperPoop: number
  diaperMixed: number
  diaperByDay: Record<string, { pee: number; poop: number; mixed: number }>
  diaperColors: Record<string, number>
  moodCounts: Record<string, number>
  dominantMood: string
  healthTasks: { label: string; done: boolean }[]
  memories: { id: string; uri: string | null; label: string; date: string }[]
  // Per-day data for mini rings (last 7 days)
  dailySleep: number[]
  dailySleepTarget: number
  dailyNutrition: number[]    // cals for solids, feeding count for liquid/mixed
  dailyNutritionTarget: number
  dailyActivity: number[]
  dailyActivityTarget: number
  dayLabels: string[]
  // Detail data for modals
  moodByDay: Record<string, Record<string, number>>
  sleepQuality: string
  mealsToday: number
  calorieCategories: { label: string; cals: number; color: string }[]
  // Feeding detail (for liquid/mixed stage modal)
  feedingBreast: number
  feedingBottle: number
  avgFeedingMl: number
  activityBreakdown: Record<string, number>
  activityEntries: ActivityEntry[]
  activityActiveDays: number
  activityRangeDays: number
}

interface ActivityEntry {
  id: string
  type: string
  date: string
  startTime?: string
  endTime?: string
  name?: string
  notes?: string
}

interface Reminder {
  id: string
  text: string
  done: boolean
  dueDate?: string | null     // ISO date string YYYY-MM-DD
  dueTime?: string | null     // HH:MM (24h) — optional time component
  notifId?: string | null     // Supabase notification row id
  archivedAt?: string | null  // ISO timestamp when marked done
  childId?: string | null     // null = all kids
  flagged?: boolean           // priority flag
}

interface HealthRecord {
  id: string
  type: string
  value: string
  notes: string
  date: string
}

interface HealthHistoryData {
  vaccines: HealthRecord[]
  meds: HealthRecord[]
  growth: HealthRecord[]
  temps: HealthRecord[]
  milestones: HealthRecord[]
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function KidsHome() {
  const { colors, radius, isDark, font, stickers } = useTheme()
  const children = useChildStore((s) => s.children)
  const activeChild = useChildStore((s) => s.activeChild)
  const setActiveChild = useChildStore((s) => s.setActiveChild)
  const parentName = useJourneyStore((s) => s.parentName)
  const { data: profile } = useProfile()
  const profileName = profile?.name ?? null
  const getGoals = useGoalsStore((s) => s.getGoals)
  const syncGoals = useGoalsStore((s) => s.syncFromSupabase)
  const currentStreak = useBadgeStore((s) => s.currentStreak)
  const totalPoints = useBadgeStore((s) => s.totalPoints)
  const earnedBadges = useBadgeStore((s) => s.earnedBadges)
  const child = activeChild ?? children[0]

  const [dateRange, setDateRange] = useState<DateRange>('7days')
  const [customRange, setCustomRange] = useState<{ start: Date; end: Date } | undefined>(undefined)
  const [customPickerVisible, setCustomPickerVisible] = useState(false)
  const [customDraft, setCustomDraft] = useState<{ start: Date; end: Date }>({ start: new Date(), end: new Date() })
  const [customPickerActive, setCustomPickerActive] = useState<'start' | 'end'>('start')
  const [overflowKidsVisible, setOverflowKidsVisible] = useState(false)
  const [focusedRing, setFocusedRing] = useState<'sleep' | 'nutrition' | 'activity'>('sleep')
  const [miniRingMetric, setMiniRingMetric] = useState<MiniRingMetric>('sleep')
  const [moodModalVisible, setMoodModalVisible] = useState(false)
  const [sleepModalVisible, setSleepModalVisible] = useState(false)
  const [healthModalVisible, setHealthModalVisible] = useState(false)
  const [activityModalVisible, setActivityModalVisible] = useState(false)
  const [activitiesDetailVisible, setActivitiesDetailVisible] = useState(false)
  const [diaperModalVisible, setDiaperModalVisible] = useState(false)
  const [goalsModalVisible, setGoalsModalVisible] = useState(false)

  // Reminders
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [showReminderInput, setShowReminderInput] = useState(false)
  const [newReminderText, setNewReminderText] = useState('')
  const [newReminderDate, setNewReminderDate] = useState<Date | null>(null)
  const [newReminderTime, setNewReminderTime] = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [newReminderChildId, setNewReminderChildId] = useState<string | null>(null)
  const [remindersModalVisible, setRemindersModalVisible] = useState(false)

  // Health history
  const [healthHistory, setHealthHistory] = useState<HealthHistoryData>({
    vaccines: [], meds: [], growth: [], temps: [], milestones: [],
  })

  // Scheduled vaccine appointments: key = `${childId}:${vaccineKey}`, value = ISO date string
  const [scheduledVaccines, setScheduledVaccines] = useState<Record<string, string>>({})

  async function loadHealthHistory(childId: string) {
    const { data } = await supabase
      .from('child_logs')
      .select('id, type, value, notes, date')
      .eq('child_id', childId)
      .in('type', ['vaccine', 'medicine', 'temperature', 'growth', 'milestone'])
      .order('date', { ascending: false })
      .limit(50)
    if (!data) return
    const records: HealthRecord[] = (data as any[]).map((r) => ({
      id: r.id,
      type: r.type,
      value: typeof r.value === 'string' ? r.value : JSON.stringify(r.value ?? ''),
      notes: r.notes ?? '',
      date: String(r.date ?? '').substring(0, 10),
    }))
    setHealthHistory({
      vaccines: records.filter((r) => r.type === 'vaccine'),
      meds: records.filter((r) => r.type === 'medicine'),
      growth: records.filter((r) => r.type === 'growth'),
      temps: records.filter((r) => r.type === 'temperature'),
      milestones: records.filter((r) => r.type === 'milestone'),
    })
  }

  // Sync goals from Supabase on mount
  useEffect(() => {
    if (child) syncGoals(child.id)
  }, [child?.id])

  // Load reminders from AsyncStorage (seed realistic data once on first run)
  useEffect(() => {
    if (!child?.id || children.length === 0) return
    const SEED_FLAG = `grandma-reminders-seeded-v1-${child.id}`
    AsyncStorage.multiGet([`grandma-reminders-${child.id}`, SEED_FLAG]).then(([[, json], [, seeded]]) => {
      if (!seeded) {
        // Build one-time seed with realistic reminders for all kids
        const today = new Date()
        const days = (n: number) => {
          const d = new Date(today); d.setDate(d.getDate() + n)
          return localDateStr(d)
        }
        const perChild: { text: string; dueDate: string | null }[][] = [
          // First child (oldest)
          [
            { text: 'Schedule 2-year checkup with pediatrician', dueDate: days(3) },
            { text: 'Buy vitamin D drops', dueDate: days(1) },
            { text: 'Order new shoes — size 6', dueDate: days(7) },
            { text: 'Book speech therapy evaluation', dueDate: days(10) },
            { text: 'Renew health insurance plan', dueDate: days(18) },
          ],
          // Second child (infant ~3mo)
          [
            { text: '4-month vaccine appointment', dueDate: days(4) },
            { text: 'Buy more diapers (size 2)', dueDate: days(2) },
            { text: 'Follow up with lactation consultant', dueDate: days(6) },
            { text: 'Schedule tummy time log review', dueDate: null },
          ],
          // Third child (newborn)
          [
            { text: 'Register birth certificate at city hall', dueDate: days(10) },
            { text: 'Newborn hearing test follow-up', dueDate: days(2) },
            { text: 'Buy baby monitor', dueDate: days(3) },
            { text: 'First pediatrician visit', dueDate: days(1) },
          ],
        ]
        const seed: Reminder[] = []
        children.forEach((c, i) => {
          const items = perChild[i] ?? perChild[perChild.length - 1]
          items.forEach((item, j) => {
            seed.push({ id: `seed-${c.id}-${j}`, text: item.text, done: false, dueDate: item.dueDate, notifId: null, childId: c.id })
          })
        })
        setReminders(seed)
        AsyncStorage.setItem(`grandma-reminders-${child.id}`, JSON.stringify(seed))
        AsyncStorage.setItem(SEED_FLAG, '1')
      } else if (json) {
        try { setReminders(JSON.parse(json)) } catch {}
      }
    })
  }, [child?.id, children.length])

  // Load health history from Supabase
  useEffect(() => {
    if (child?.id) loadHealthHistory(child.id)
  }, [child?.id])

  // Load scheduled vaccines from AsyncStorage
  useEffect(() => {
    if (!child?.id) return
    AsyncStorage.getItem(`grandma-vaccine-scheduled-${child.id}`).then(json => {
      if (json) try { setScheduledVaccines(JSON.parse(json)) } catch {}
      else setScheduledVaccines({})
    })
  }, [child?.id])

  function setVaccineDate(childId: string, vaccineKey: string, date: string | null) {
    setScheduledVaccines(prev => {
      const next = { ...prev }
      if (date === null) {
        delete next[vaccineKey]
      } else {
        next[vaccineKey] = date
      }
      AsyncStorage.setItem(`grandma-vaccine-scheduled-${childId}`, JSON.stringify(next))
      return next
    })
  }

  async function markVaccineGiven(childId: string, vaccineName: string, date: string, vaccineKey: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.from('child_logs').insert({
      child_id: childId,
      user_id: session.user.id,
      date,
      type: 'vaccine',
      value: vaccineName,
      notes: 'Logged from home dashboard',
      logged_by: session.user.id,
    })
    // Remove from scheduled and reload history
    setVaccineDate(childId, vaccineKey, null)
    loadHealthHistory(childId)
  }

  function persistReminders(list: Reminder[]) {
    setReminders(list)
    if (child?.id) AsyncStorage.setItem(`grandma-reminders-${child.id}`, JSON.stringify(list))
  }

  async function addReminder() {
    if (!newReminderText.trim()) return
    const dueDate = newReminderDate ? localDateStr(newReminderDate) : null
    const dueTime = newReminderTime
      ? `${String(newReminderTime.getHours()).padStart(2, '0')}:${String(newReminderTime.getMinutes()).padStart(2, '0')}`
      : null
    let notifId: string | null = null

    // Insert a Supabase notification so it shows in the notifications feed
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const bodyParts: string[] = []
        if (dueDate) bodyParts.push(`Due ${dueDate}`)
        if (dueTime) bodyParts.push(`at ${formatTime12h(dueTime)}`)
        const { data } = await supabase.from('notifications').insert({
          user_id: session.user.id,
          type: 'reminder',
          title: newReminderText.trim(),
          body: bodyParts.length ? bodyParts.join(' ') : 'No due date',
          data: { childId: child?.id, dueDate, dueTime },
          is_read: false,
        }).select('id').single()
        notifId = data?.id ?? null
      }
    } catch {}

    const r: Reminder = { id: Date.now().toString(), text: newReminderText.trim(), done: false, dueDate, dueTime, notifId, childId: newReminderChildId }
    persistReminders([...reminders, r])
    setNewReminderText('')
    setNewReminderDate(null)
    setNewReminderTime(null)
    setNewReminderChildId(null)
    setShowDatePicker(false)
    setShowTimePicker(false)
    setShowReminderInput(false)
  }

  function toggleReminder(id: string) {
    const r = reminders.find(r => r.id === id)
    if (!r) return
    const nowDone = !r.done
    const updated = reminders.map(rem =>
      rem.id === id
        ? { ...rem, done: nowDone, archivedAt: nowDone ? new Date().toISOString() : null }
        : rem
    )
    persistReminders(updated)
    if (r.notifId) {
      supabase.from('notifications').update({ is_read: nowDone }).eq('id', r.notifId).then(() => {})
    }
  }

  function deleteReminder(id: string) {
    const r = reminders.find(r => r.id === id)
    if (r?.notifId) supabase.from('notifications').delete().eq('id', r.notifId).then(() => {})
    persistReminders(reminders.filter(r => r.id !== id))
  }

  function flagReminder(id: string) {
    persistReminders(reminders.map(r => r.id === id ? { ...r, flagged: !r.flagged } : r))
  }

  function editReminder(id: string, newText: string) {
    const updated = reminders.map(r => r.id === id ? { ...r, text: newText } : r)
    persistReminders(updated)
    const r = reminders.find(r => r.id === id)
    if (r?.notifId) {
      supabase.from('notifications').update({ title: newText }).eq('id', r.notifId).then(() => {})
    }
  }

  // Get goals (user-defined or age-suggested)
  const goals = child ? getGoals(child.id, child.birthDate) : getSuggestedGoals('')
  const feedingStage = child ? getFeedingStage(child.birthDate) : 'solids' as FeedingStage
  const nutritionLabel = getNutritionLabel(feedingStage)

  const [rangeData, setRangeData] = useState<RangeData>({
    sleepTotal: 0, sleepTarget: 0,
    caloriesTotal: 0, caloriesTarget: 0,
    feedingCount: 0, feedingCountTarget: 0,
    feedingMl: 0, feedingMlTarget: 0,
    activityCount: 0, activityTarget: 0,
    diaperCount: 0, diaperPee: 0, diaperPoop: 0, diaperMixed: 0, diaperByDay: {}, diaperColors: {},
    moodCounts: {}, dominantMood: '',
    healthTasks: [], memories: [],
    dailySleep: [0, 0, 0, 0, 0, 0, 0],
    dailySleepTarget: 12,
    dailyNutrition: [0, 0, 0, 0, 0, 0, 0],
    dailyNutritionTarget: 1000,
    dailyActivity: [0, 0, 0, 0, 0, 0, 0],
    dailyActivityTarget: 3,
    dayLabels: [],
    moodByDay: {},
    sleepQuality: 'No data',
    mealsToday: 0,
    calorieCategories: [],
    feedingBreast: 0,
    feedingBottle: 0,
    avgFeedingMl: 0,
    activityBreakdown: {},
    activityEntries: [],
    activityActiveDays: 0,
    activityRangeDays: 0,
  })

  useEffect(() => {
    if (child) loadRangeData(child, dateRange, customRange)
  }, [child?.id, dateRange, customRange])

  // Re-fetch when tab becomes active (e.g. after logging on Agenda)
  useFocusEffect(useCallback(() => {
    if (child) {
      loadRangeData(child, dateRange, customRange)
      loadHealthHistory(child.id)
      syncGoals(child.id)
    }
  }, [child?.id, dateRange, customRange]))

  async function loadRangeData(c: ChildWithRole, range: DateRange, custom?: { start: Date; end: Date }) {
    const { startDate, endDate, days } = getDateRange(range, custom)
    const g = getGoals(c.id, c.birthDate)
    const calTarget = g.calories
    const dailySleepTarget = g.sleep

    // Always load last 7 days for mini rings
    const miniStart = new Date()
    miniStart.setDate(miniStart.getDate() - 6)
    const miniStartStr = localDateStr(miniStart)

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const miniDates: string[] = []
    const miniLabels: string[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      miniDates.push(localDateStr(d))
      miniLabels.push(dayNames[d.getDay()])
    }

    // Fetch all logs from the broader range (max of range or 7 days for mini rings)
    const fetchStart = startDate < miniStartStr ? startDate : miniStartStr
    const { data } = await supabase
      .from('child_logs')
      .select('type, value, notes, photos, date, created_at')
      .eq('child_id', c.id)
      .gte('date', fetchStart)
      .order('created_at', { ascending: false })

    // Normalize all log dates to YYYY-MM-DD strings
    const logs = ((data ?? []) as any[]).map((l) => ({ ...l, date: toDateStr(l.date) }))
    const today = localDateStr(new Date())

    // Filter logs for the selected range
    const rangeLogs = logs.filter((l) => l.date >= startDate && l.date <= endDate)

    // ── Sleep ──
    let sleepTotal = 0
    let goodSleep = 0, totalSleepLogs = 0
    for (const log of rangeLogs.filter((l) => l.type === 'sleep')) {
      let val: any = log.value
      try { val = typeof val === 'string' ? JSON.parse(val) : val } catch {}
      const hours = typeof val === 'object' && val ? (parseFloat(val.duration) || 0) : 0
      sleepTotal += hours
      totalSleepLogs++
      const q = typeof val === 'object' && val ? (val.quality || '').toLowerCase() : ''
      if (q === 'great' || q === 'good') goodSleep++
    }
    const sleepQuality = totalSleepLogs === 0 ? 'No data' : goodSleep / totalSleepLogs >= 0.7 ? 'Great' : goodSleep / totalSleepLogs >= 0.4 ? 'Solid' : 'Restless'
    const sleepTarget = g.sleep * days

    // ── Mood ──
    const moodCounts: Record<string, number> = {}
    const moodByDay: Record<string, Record<string, number>> = {}
    for (const log of rangeLogs.filter((l) => l.type === 'mood')) {
      let mood = log.value
      try { mood = typeof mood === 'string' ? JSON.parse(mood) : mood } catch {}
      if (typeof mood === 'string') {
        const key = mood.toLowerCase()
        moodCounts[key] = (moodCounts[key] || 0) + 1
        if (!moodByDay[log.date]) moodByDay[log.date] = {}
        moodByDay[log.date][key] = (moodByDay[log.date][key] || 0) + 1
      }
    }
    const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''

    // ── Nutrition (feeding-stage aware) ──
    const stage = getFeedingStage(c.birthDate)
    const foodLogs = rangeLogs.filter((l) => l.type === 'food' || l.type === 'feeding')
    const catMap: Record<string, { cals: number; color: string }> = {}
    let totalCalories = 0
    let feedingCount = 0, feedingBreast = 0, feedingBottle = 0, feedingMlTotal = 0
    for (const log of foodLogs) {
      let parsed: any = null
      try { parsed = typeof log.value === 'string' ? JSON.parse(log.value) : log.value } catch {}

      // Count breast/bottle feedings
      if (log.type === 'feeding' && parsed && typeof parsed === 'object') {
        feedingCount++
        const ft = (parsed.feedType || '').toLowerCase()
        if (ft === 'breast') feedingBreast++
        else feedingBottle++
        feedingMlTotal += Number(parsed.amount) || 0
      }

      // Calorie tracking (for solids & mixed stages)
      if (parsed && typeof parsed === 'object' && parsed.estimatedCals) {
        const cals = Number(parsed.estimatedCals) || 0
        totalCalories += cals
        if (Array.isArray(parsed.matchedFoods)) {
          for (const food of parsed.matchedFoods) {
            const cat = guessFoodCategory(food)
            if (!catMap[cat]) catMap[cat] = { cals: 0, color: getCatColor(cat) }
            catMap[cat].cals += Math.round(cals / parsed.matchedFoods.length)
          }
        } else {
          const meal = parsed.meal || 'mixed'
          if (!catMap[meal]) catMap[meal] = { cals: 0, color: getCatColor(meal) }
          catMap[meal].cals += cals
        }
      } else if (log.type === 'food') {
        const desc = log.notes || (typeof log.value === 'string' ? log.value : '') || ''
        const est = estimateCalories(desc)
        totalCalories += est.totalCals
        for (const m of est.matches) {
          if (!catMap[m.category]) catMap[m.category] = { cals: 0, color: getCatColor(m.category) }
          catMap[m.category].cals += m.cals
        }
      }
    }
    const calorieCategories = Object.entries(catMap).map(([label, v]) => ({ label: label.charAt(0).toUpperCase() + label.slice(1), ...v })).sort((a, b) => b.cals - a.cals)
    const caloriesTarget = calTarget * days
    const feedingCountTarget = g.feedings * days
    const feedingMlTarget = g.feedingMl * days
    const avgFeedingMl = feedingCount > 0 ? Math.round(feedingMlTotal / feedingCount) : 0

    // ── Diaper ──
    const diaperLogs = rangeLogs.filter((l) => l.type === 'diaper')
    const diaperCount = diaperLogs.length
    let diaperPee = 0, diaperPoop = 0, diaperMixed = 0
    const diaperByDay: Record<string, { pee: number; poop: number; mixed: number }> = {}
    const diaperColors: Record<string, number> = {}
    for (const log of diaperLogs) {
      let parsed: any = null
      try { parsed = typeof log.value === 'string' ? JSON.parse(log.value) : log.value } catch {}
      const dt = parsed?.diaperType ?? ''
      if (dt === 'pee') diaperPee++
      else if (dt === 'poop') diaperPoop++
      else if (dt === 'mixed') diaperMixed++
      // Per-day breakdown
      if (!diaperByDay[log.date]) diaperByDay[log.date] = { pee: 0, poop: 0, mixed: 0 }
      if (dt === 'pee') diaperByDay[log.date].pee++
      else if (dt === 'poop') diaperByDay[log.date].poop++
      else if (dt === 'mixed') diaperByDay[log.date].mixed++
      // Color distribution (only for poop/mixed)
      if (parsed?.color && (dt === 'poop' || dt === 'mixed')) {
        const c = String(parsed.color)
        diaperColors[c] = (diaperColors[c] || 0) + 1
      }
    }

    // ── Activity (activity-form logs only: class, sport, swim, dance, music, art, playground, walk, therapy, playdate, other) ──
    const activityLogs = rangeLogs.filter((l) => l.type === 'activity')
    const activityCount = activityLogs.length
    const activityTarget = g.activity * days
    const activityBreakdown: Record<string, number> = {}
    const activityEntries: ActivityEntry[] = []
    for (const log of activityLogs) {
      let explicitType = 'other'
      let name: string | undefined
      let startTime: string | undefined
      let endTime: string | undefined
      try {
        const parsed = typeof log.value === 'string' ? JSON.parse(log.value) : log.value
        if (parsed?.activityType) explicitType = String(parsed.activityType)
        if (parsed?.name) name = String(parsed.name)
        if (parsed?.startTime) startTime = String(parsed.startTime)
        if (parsed?.endTime) endTime = String(parsed.endTime)
      } catch {}
      // Every log maps to exactly one pillar (movement/creative/learning/social/care/therapy).
      const pillar = getActivityPillar(explicitType, name)
      activityBreakdown[pillar] = (activityBreakdown[pillar] || 0) + 1
      activityEntries.push({
        id: (log as any).id ?? `${log.date}-${(log as any).created_at ?? ''}-${activityEntries.length}`,
        type: pillar,
        date: log.date,
        startTime, endTime, name,
        notes: log.notes || undefined,
      })
    }
    activityEntries.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date)
      return (b.startTime ?? '').localeCompare(a.startTime ?? '')
    })
    const activityActiveDays = new Set(activityLogs.map((l) => l.date)).size
    const activityRangeDays = days

    // ── Health tasks ──
    const healthTasks: { label: string; done: boolean }[] = []
    const hasVitamins = rangeLogs.some((l) => l.type === 'medicine' && (l.value || '').toString().toLowerCase().includes('vitamin'))
    const hasVaccine = rangeLogs.some((l) => l.type === 'vaccine')
    const hasWeight = rangeLogs.some((l) => l.type === 'growth')
    healthTasks.push({ label: 'Vitamins', done: hasVitamins })
    if (c.medications.length > 0) healthTasks.push({ label: c.medications[0], done: rangeLogs.some((l) => l.type === 'medicine' && l.date === today) })
    healthTasks.push({ label: 'Vaccine check', done: hasVaccine })
    healthTasks.push({ label: 'Growth log', done: hasWeight })

    // ── Memories ──
    const photoLogs = rangeLogs.filter((l) => l.photos && l.photos.length > 0).slice(0, 6)
    const memories = photoLogs.map((l) => ({
      id: l.created_at,
      uri: l.photos[0] ?? null,
      label: l.notes || l.type || 'Memory',
      date: new Date(l.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }))

    // ── Mini ring daily data (always last 7 days) ──
    const dailySleep = new Array(7).fill(0)
    const dailyNutrition = new Array(7).fill(0) // cals for solids, feeding count for liquid/mixed
    const dailyActivity = new Array(7).fill(0)

    for (const log of logs) {
      const dayIdx = miniDates.indexOf(log.date)
      if (dayIdx === -1) continue

      if (log.type === 'sleep') {
        let val: any = log.value
        try { val = typeof val === 'string' ? JSON.parse(val) : val } catch {}
        const hours = typeof val === 'object' && val ? (parseFloat(val.duration) || 0) : 0
        dailySleep[dayIdx] += hours
      }
      if (log.type === 'food' || log.type === 'feeding') {
        let parsedVal: any = null
        try { parsedVal = typeof log.value === 'string' ? JSON.parse(log.value) : log.value } catch {}

        if (stage === 'solids') {
          // Track calories
          if (parsedVal && typeof parsedVal === 'object' && parsedVal.estimatedCals) {
            dailyNutrition[dayIdx] += Number(parsedVal.estimatedCals) || 0
          } else {
            const desc = log.notes || (typeof log.value === 'string' ? log.value : '') || ''
            const est = estimateCalories(desc)
            dailyNutrition[dayIdx] += est.totalCals
          }
        } else {
          // Liquid/mixed: track feeding count
          if (log.type === 'feeding') dailyNutrition[dayIdx]++
        }
      }
      if (['mood', 'food', 'feeding', 'medicine', 'vaccine', 'growth', 'temperature', 'diaper'].includes(log.type)) {
        dailyActivity[dayIdx]++
      }
    }

    // Daily nutrition target depends on feeding stage
    const dailyNutritionTarget = stage === 'solids' ? g.calories : g.feedings

    setRangeData({
      sleepTotal: Math.round(sleepTotal * 10) / 10,
      sleepTarget: Math.round(sleepTarget * 10) / 10,
      caloriesTotal: Math.round(totalCalories),
      caloriesTarget: Math.round(caloriesTarget),
      feedingCount, feedingCountTarget, feedingMl: feedingMlTotal, feedingMlTarget,
      activityCount,
      activityTarget,
      diaperCount, diaperPee, diaperPoop, diaperMixed, diaperByDay, diaperColors,
      moodCounts, dominantMood,
      healthTasks, memories,
      dailySleep, dailySleepTarget: g.sleep,
      dailyNutrition, dailyNutritionTarget,
      dailyActivity, dailyActivityTarget: g.activity,
      dayLabels: miniLabels,
      moodByDay, sleepQuality,
      mealsToday: foodLogs.filter((l) => l.date === today).length,
      calorieCategories,
      feedingBreast, feedingBottle, avgFeedingMl, activityBreakdown, activityEntries,
      activityActiveDays, activityRangeDays,
    })
  }

  if (!child) return null

  const growthLeap = getGrowthLeap(child.birthDate)
  const firstName = (profileName || parentName)?.split(' ')[0] || ''

  // Ring progress values
  const sleepProgress = rangeData.sleepTarget > 0 ? Math.min(rangeData.sleepTotal / rangeData.sleepTarget, 1) : 0
  // Nutrition progress adapts to feeding stage
  const nutritionProgress = feedingStage === 'solids'
    ? (rangeData.caloriesTarget > 0 ? Math.min(rangeData.caloriesTotal / rangeData.caloriesTarget, 1) : 0)
    : (rangeData.feedingCountTarget > 0 ? Math.min(rangeData.feedingCount / rangeData.feedingCountTarget, 1) : 0)
  const activityProgress = rangeData.activityTarget > 0 ? Math.min(rangeData.activityCount / rangeData.activityTarget, 1) : 0

  // Nutrition center data adapts to feeding stage
  const nutritionCenter = feedingStage === 'solids'
    ? { value: rangeData.caloriesTotal > 0 ? rangeData.caloriesTotal.toLocaleString() : '—', unit: 'Calories', pct: Math.round(nutritionProgress * 100) }
    : { value: rangeData.feedingCount > 0 ? `${rangeData.feedingCount}` : '—', unit: feedingStage === 'liquid' ? 'Feedings' : 'Feeds + Meals', pct: Math.round(nutritionProgress * 100) }

  // Focused ring center data
  const centerData = {
    sleep: { value: rangeData.sleepTotal > 0 ? `${rangeData.sleepTotal.toFixed(1)}` : '—', unit: 'Hours Slept', pct: Math.round(sleepProgress * 100), icon: Moon, color: PILLAR_COLORS.sleep },
    nutrition: { value: nutritionCenter.value, unit: nutritionCenter.unit, pct: nutritionCenter.pct, icon: feedingStage === 'solids' ? Utensils : Droplets, color: PILLAR_COLORS.nutrition },
    activity: { value: rangeData.activityCount > 0 ? `${rangeData.activityCount}` : '—', unit: 'Activities', pct: Math.round(activityProgress * 100), icon: Zap, color: PILLAR_COLORS.activity },
  }
  const focused = centerData[focusedRing]

  return (
    <View style={s.root}>
      {/* ─── Header ──────────────────────────────────────────── */}
      <View style={s.header}>
        <HomeGreeting
          name={firstName}
          microLabel={subtitleForRange(dateRange, child.name, customRange)?.toUpperCase?.()}
        />
      </View>

      {/* ─── Child Selector ──────────────────────────────────── */}
      {children.length > 1 && (
        <View style={s.childPills}>
          {children.slice(0, 3).map((c, idx) => {
            const active = c.id === child.id
            const kidColor = CHILD_COLORS[idx % CHILD_COLORS.length]
            const ST_INK = '#141313'
            return (
              <Pressable key={c.id} onPress={() => setActiveChild(c)}
                style={({ pressed }) => [s.childPill, {
                  backgroundColor: active ? kidColor : kidColor + '2E',
                  borderRadius: radius.full,
                  borderWidth: active ? 1.5 : 1,
                  borderColor: active ? ST_INK : kidColor + '40',
                  shadowColor: ST_INK,
                  shadowOffset: { width: 0, height: active ? (pressed ? 1 : 3) : 0 },
                  shadowOpacity: active ? 1 : 0,
                  shadowRadius: 0,
                  elevation: active ? 4 : 0,
                  transform: [{ translateY: active && pressed ? 2 : 0 }],
                }]}
              >
                <Text style={[s.pillName, { fontFamily: active ? 'DMSans_700Bold' : 'DMSans_600SemiBold', color: active ? ST_INK : kidColor }]}>{c.name}</Text>
                <Text style={[s.pillAge, { color: active ? 'rgba(20,19,19,0.7)' : kidColor + 'AA' }]}>{formatAge(c.birthDate)}</Text>
              </Pressable>
            )
          })}
          {children.length > 3 && (
            <Pressable
              onPress={() => setOverflowKidsVisible(true)}
              style={[s.addChildBtn, { borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.05)' }]}
            >
              <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700' }}>+{children.length - 3}</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* ─── Overflow Kids Modal ──────────────────────────────── */}
      <Modal visible={overflowKidsVisible} transparent animationType="slide">
        <Pressable style={s.modalOverlay} onPress={() => setOverflowKidsVisible(false)}>
          <View style={[s.modalContent, { backgroundColor: colors.bg, borderRadius: radius.xl }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: colors.text }]}>All Kids</Text>
              <Pressable onPress={() => setOverflowKidsVisible(false)} style={[s.modalClose, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                <X size={18} color={colors.textMuted} strokeWidth={2} />
              </Pressable>
            </View>
            <View style={{ gap: 8 }}>
              {children.map((c, idx) => {
                const active = c.id === child.id
                const kidColor = CHILD_COLORS[idx % CHILD_COLORS.length]
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => { setActiveChild(c); setOverflowKidsVisible(false) }}
                    style={[s.childPill, {
                      backgroundColor: active ? kidColor : kidColor + '18',
                      borderRadius: radius.full,
                      borderWidth: 1,
                      borderColor: active ? kidColor : kidColor + '50',
                      alignSelf: 'flex-start',
                    }]}
                  >
                    <Text style={[s.pillName, { color: active ? '#FFF' : kidColor }]}>{c.name}</Text>
                    <Text style={[s.pillAge, { color: active ? 'rgba(255,255,255,0.7)' : kidColor + 'AA' }]}>{formatAge(c.birthDate)}</Text>
                  </Pressable>
                )
              })}
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* ─── Date Range Picker ────────────────────────────────── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dateRangeRow}>
        {DATE_RANGE_OPTIONS.map((opt) => {
          const active = dateRange === opt.key
          const ST_INK = '#141313'
          const ST_YELLOW = '#F5D652'
          return (
            <Pressable
              key={opt.key}
              onPress={() => {
                if (opt.key === 'custom') {
                  setCustomDraft({ start: customRange?.start ?? new Date(), end: customRange?.end ?? new Date() })
                  setCustomPickerActive('start')
                  setCustomPickerVisible(true)
                } else {
                  setDateRange(opt.key)
                }
              }}
              style={({ pressed }) => [s.dateRangePill, {
                backgroundColor: active ? ST_YELLOW : 'transparent',
                borderColor: active ? ST_INK : colors.border,
                borderWidth: active ? 1.5 : 1,
                borderRadius: radius.full,
                shadowColor: ST_INK,
                shadowOffset: { width: 0, height: active ? (pressed ? 1 : 3) : 0 },
                shadowOpacity: active ? 1 : 0,
                shadowRadius: 0,
                elevation: active ? 4 : 0,
                transform: [{ translateY: active && pressed ? 2 : 0 }],
              }]}
            >
              <Text style={[s.dateRangeText, { fontFamily: active ? 'DMSans_700Bold' : 'DMSans_600SemiBold', color: active ? ST_INK : colors.textMuted }]}>
                {opt.key === 'custom' && customRange
                  ? `${fmtShortDate(customRange.start)}–${fmtShortDate(customRange.end)}`
                  : opt.label}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>

      {/* ─── Custom Range Picker Modal ────────────────────────── */}
      <Modal visible={customPickerVisible} transparent animationType="slide">
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          onPress={() => setCustomPickerVisible(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: isDark ? colors.surface : '#FFFEF8',
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              borderTopWidth: 1.5,
              borderLeftWidth: 1.5,
              borderRightWidth: 1.5,
              borderColor: '#141313',
              paddingTop: 14,
              paddingHorizontal: 20,
              paddingBottom: 48,
              gap: 16,
              overflow: 'hidden',
            }}
          >
            {/* Sticker accent — top-right corner */}
            <View style={{ position: 'absolute', top: -8, right: 12, opacity: 0.6 }} pointerEvents="none">
              <StarSticker size={64} fill="#9DC3E8" stroke="#141313" />
            </View>

            {/* Drag handle */}
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#14131340', alignSelf: 'center', marginBottom: 4 }} />

            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: isDark ? colors.text : '#141313', fontSize: 24, letterSpacing: -0.5, fontFamily: 'Fraunces_600SemiBold' }}>Custom Range</Text>
              <Pressable
                onPress={() => setCustomPickerVisible(false)}
                style={({ pressed }) => ({
                  width: 36, height: 36, borderRadius: 18,
                  backgroundColor: isDark ? colors.surfaceRaised : '#F7F0DF',
                  borderWidth: 1.5, borderColor: '#141313',
                  alignItems: 'center', justifyContent: 'center',
                  shadowColor: '#141313',
                  shadowOffset: { width: 0, height: pressed ? 1 : 2 },
                  shadowOpacity: 1, shadowRadius: 0, elevation: 3,
                  transform: [{ translateY: pressed ? 1 : 0 }],
                })}
              >
                <X size={15} color="#141313" strokeWidth={2.5} />
              </Pressable>
            </View>

            {/* START / END chips */}
            {(() => {
              const ST_INK = '#141313'
              const ST_YELLOW = isDark ? '#F0CE4C' : '#F5D652'
              const ST_CREAM = isDark ? colors.surfaceRaised : '#F7F0DF'
              return (
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <Pressable
                    onPress={() => setCustomPickerActive('start')}
                    style={({ pressed }) => ({
                      flex: 1,
                      borderRadius: 18,
                      borderWidth: 1.5,
                      borderColor: ST_INK,
                      backgroundColor: customPickerActive === 'start' ? ST_YELLOW : ST_CREAM,
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      gap: 3,
                      shadowColor: ST_INK,
                      shadowOffset: { width: 0, height: customPickerActive === 'start' ? (pressed ? 1 : 3) : 0 },
                      shadowOpacity: customPickerActive === 'start' ? 1 : 0,
                      shadowRadius: 0, elevation: customPickerActive === 'start' ? 4 : 0,
                      transform: [{ translateY: customPickerActive === 'start' && pressed ? 2 : 0 }],
                    })}
                  >
                    <Text style={{ fontSize: 10, fontFamily: 'DMSans_700Bold', letterSpacing: 1.5, color: ST_INK, textTransform: 'uppercase' }}>
                      Start
                    </Text>
                    <Text style={{ fontSize: 18, fontFamily: 'Fraunces_600SemiBold', color: ST_INK, letterSpacing: -0.3 }}>
                      {fmtShortDate(customDraft.start)}
                    </Text>
                  </Pressable>

                  <Text style={{ fontSize: 18, fontFamily: 'Fraunces_600SemiBold', color: ST_INK }}>—</Text>

                  <Pressable
                    onPress={() => setCustomPickerActive('end')}
                    style={({ pressed }) => ({
                      flex: 1,
                      borderRadius: 18,
                      borderWidth: 1.5,
                      borderColor: ST_INK,
                      backgroundColor: customPickerActive === 'end' ? ST_YELLOW : ST_CREAM,
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      gap: 3,
                      shadowColor: ST_INK,
                      shadowOffset: { width: 0, height: customPickerActive === 'end' ? (pressed ? 1 : 3) : 0 },
                      shadowOpacity: customPickerActive === 'end' ? 1 : 0,
                      shadowRadius: 0, elevation: customPickerActive === 'end' ? 4 : 0,
                      transform: [{ translateY: customPickerActive === 'end' && pressed ? 2 : 0 }],
                    })}
                  >
                    <Text style={{ fontSize: 10, fontFamily: 'DMSans_700Bold', letterSpacing: 1.5, color: ST_INK, textTransform: 'uppercase' }}>
                      End
                    </Text>
                    <Text style={{ fontSize: 18, fontFamily: 'Fraunces_600SemiBold', color: ST_INK, letterSpacing: -0.3 }}>
                      {fmtShortDate(customDraft.end)}
                    </Text>
                  </Pressable>
                </View>
              )
            })()}

            {/* Date spinner */}
            <DateTimePicker
              key={customPickerActive}
              value={customPickerActive === 'start' ? customDraft.start : customDraft.end}
              mode="date"
              display="spinner"
              maximumDate={customPickerActive === 'start' ? customDraft.end : new Date()}
              minimumDate={customPickerActive === 'end' ? customDraft.start : undefined}
              textColor={isDark ? colors.text : '#141313'}
              accentColor="#141313"
              themeVariant={isDark ? 'dark' : 'light'}
              style={{ width: '100%' }}
              onChange={(_: DateTimePickerEvent, selected?: Date) => {
                if (!selected) return
                if (customPickerActive === 'start') {
                  setCustomDraft((prev) => ({ ...prev, start: selected > prev.end ? prev.end : selected }))
                } else {
                  setCustomDraft((prev) => ({ ...prev, end: selected }))
                }
              }}
            />

            {/* Apply button — sticker style */}
            <Pressable
              onPress={() => {
                setCustomRange({ start: customDraft.start, end: customDraft.end })
                setDateRange('custom')
                setCustomPickerVisible(false)
              }}
              style={({ pressed }) => ({
                height: 60,
                borderRadius: 999,
                backgroundColor: isDark ? '#F0CE4C' : '#F5D652',
                borderWidth: 2, borderColor: '#141313',
                alignItems: 'center', justifyContent: 'center',
                shadowColor: '#141313',
                shadowOffset: { width: 0, height: pressed ? 2 : 5 },
                shadowOpacity: 1, shadowRadius: 0, elevation: 6,
                transform: [{ translateY: pressed ? 3 : 0 }],
              })}
            >
              <Text style={{ color: '#141313', fontFamily: 'DMSans_700Bold', fontSize: 16, letterSpacing: 1, textTransform: 'uppercase' }}>Apply Range</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ─── Past 7 Days Mini Rings — sticker card ─────────────── */}
      <View
        style={[
          s.miniRingsCard,
          {
            backgroundColor: isDark ? colors.surface : '#FFFEF8',
            borderRadius: 22,
            borderColor: '#141313',
            borderWidth: 1.5,
            shadowColor: '#141313',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: isDark ? 0 : 0.08,
            shadowRadius: 6,
            elevation: 2,
          },
        ]}
      >
        <View style={s.miniRingsHeader}>
          <Text style={[s.miniRingsTitle, { color: isDark ? colors.text : '#141313', fontFamily: 'Fraunces_700Bold' }]}>Past 7 Days</Text>
          <View style={s.miniMetricPicker}>
            {(['sleep', 'nutrition', 'activity'] as MiniRingMetric[]).map((m) => {
              const on = miniRingMetric === m
              const fillSoft =
                m === 'sleep' ? '#CFE0F0' :
                m === 'nutrition' ? '#F9D8E2' :
                '#DDE7BB'
              return (
                <Pressable
                  key={m}
                  onPress={() => setMiniRingMetric(m)}
                  style={[s.miniMetricBtn, {
                    backgroundColor: on ? fillSoft : (isDark ? colors.surfaceRaised : '#FFFEF8'),
                    borderColor: '#141313',
                    borderWidth: 1.5,
                  }]}
                >
                  <View style={[s.miniMetricDot, { backgroundColor: PILLAR_COLORS[m], borderWidth: 1, borderColor: '#141313' }]} />
                  <Text style={[s.miniMetricLabel, { color: '#141313', fontFamily: on ? 'DMSans_700Bold' : 'DMSans_600SemiBold' }]}>
                    {m === 'sleep' ? 'Sleep' : m === 'nutrition' ? nutritionLabel : 'Activity'}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>
        <View style={s.miniRingsRow}>
          {rangeData.dayLabels.map((label, i) => {
            const dailyData = miniRingMetric === 'sleep' ? rangeData.dailySleep : miniRingMetric === 'nutrition' ? rangeData.dailyNutrition : rangeData.dailyActivity
            const target = miniRingMetric === 'sleep' ? rangeData.dailySleepTarget : miniRingMetric === 'nutrition' ? rangeData.dailyNutritionTarget : rangeData.dailyActivityTarget
            const progress = target > 0 ? Math.min(dailyData[i] / target, 1) : 0
            const isToday = i === rangeData.dayLabels.length - 1
            const color = PILLAR_COLORS[miniRingMetric]
            return (
              <MiniRing
                key={i}
                label={label}
                progress={progress}
                color={color}
                isToday={isToday}
                hasData={dailyData[i] > 0}
              />
            )
          })}
        </View>
      </View>

      {/* ─── Multi-Ring Wheel Hero (big concentric arcs) ─────── */}
      <MultiRingHero
        sleepProgress={sleepProgress}
        nutritionProgress={nutritionProgress}
        activityProgress={activityProgress}
        focused={focusedRing}
        onTapRing={setFocusedRing}
        centerData={focused}
      />

      {/* ─── Hero tiles: LAST SLEEP / MOOD / CALORIES / ACTIVITIES ─── */}
      <HeroTiles
        sleepTotal={rangeData.sleepTotal}
        sleepTarget={rangeData.sleepTarget}
        dominantMood={rangeData.dominantMood}
        moodCounts={rangeData.moodCounts}
        caloriesTotal={rangeData.caloriesTotal}
        caloriesTarget={rangeData.caloriesTarget}
        feedingCount={rangeData.feedingCount}
        feedingTarget={rangeData.feedingCountTarget}
        stage={feedingStage}
        activityCount={rangeData.activityCount}
        activityActiveDays={rangeData.activityActiveDays}
        activityRangeDays={rangeData.activityRangeDays}
        activityTopLabel={(() => {
          const entries = Object.entries(rangeData.activityBreakdown).filter(([, c]) => c > 0).sort(([, a], [, b]) => b - a)
          const top = entries[0]
          return top ? (ACTIVITY_TYPE_META[top[0]]?.label ?? top[0]) : undefined
        })()}
        activityTypesCount={Object.values(rangeData.activityBreakdown).filter((c) => c > 0).length}
        onPressSleep={() => { setFocusedRing('sleep'); setSleepModalVisible(true) }}
        onPressMood={() => setMoodModalVisible(true)}
        onPressCalories={() => setActivityModalVisible(true)}
        onPressActivity={() => setActivitiesDetailVisible(true)}
      />

      {/* (Ring legend / stats strip removed — hero tiles + detail modals cover this) */}

      {/* ─── Set Goals Button ─────────────────────────────────── */}
      <Pressable
        onPress={() => setGoalsModalVisible(true)}
        style={[s.setGoalsBtn, { backgroundColor: isDark ? '#1F2A3A' : brand.kidsSoft, borderColor: isDark ? colors.border : brand.kids + '40' }]}
      >
        <View style={[s.setGoalsBtnIcon, { backgroundColor: brand.kids + '28' }]}>
          <StarSticker size={18} fill={brand.kids} stroke={isDark ? '#A5C9F0' : '#3A6A9E'} />
        </View>
        <Text style={[s.setGoalsBtnText, { color: brand.kids }]}>Set Goals</Text>
        <Text style={[s.setGoalsBtnHint, { color: colors.textMuted }]}>Customize daily targets</Text>
        <ChevronRight size={14} color={brand.kids} strokeWidth={2} />
      </Pressable>

      {/* ─── Health + Diaper (Mood + Calories live in hero tiles now) ─── */}
      <View style={s.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ transform: [{ rotate: '-8deg' }] }}>
            <HeartSticker size={28} fill="#EE7B6D" />
          </View>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Health & Care</Text>
        </View>
        <Pressable onPress={() => router.push('/profile/health-history' as any)}>
          <Text style={[s.sectionLink, { color: colors.primary }]}>Insights</Text>
        </Pressable>
      </View>

      <Pressable onPress={() => setHealthModalVisible(true)}>
        <HealthCard reminders={reminders} healthHistory={healthHistory} child={child} />
      </Pressable>
      {rangeData.diaperCount > 0 && (
        <Pressable onPress={() => setDiaperModalVisible(true)} style={{ marginTop: 10 }}>
          <DiaperCard count={rangeData.diaperCount} pee={rangeData.diaperPee} poop={rangeData.diaperPoop} mixed={rangeData.diaperMixed} diaperByDay={rangeData.diaperByDay} startDate={getDateRange(dateRange, customRange).startDate} endDate={getDateRange(dateRange, customRange).endDate} />
        </Pressable>
      )}

      {/* ─── Growth Leap ──────────────────────────────────────── */}
      {growthLeap && <GrowthLeapCard leap={growthLeap} childName={child.name} />}

      {/* ─── Reminders ────────────────────────────────────────── */}
      <View style={s.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ transform: [{ rotate: '10deg' }] }}>
            <FlowerSticker size={28} petal="#C8B6E8" center="#F5D652" />
          </View>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Reminders</Text>
        </View>
        <Pressable
          onPress={() => { setShowReminderInput(!showReminderInput); setNewReminderText('') }}
          style={[s.addReminderBtn, { backgroundColor: brand.kids + '15', borderRadius: radius.full }]}
        >
          <Plus size={13} color={brand.kids} strokeWidth={2.5} />
          <Text style={[s.addReminderBtnText, { color: brand.kids }]}>Add</Text>
        </Pressable>
      </View>

      {showReminderInput && (
        <View style={[s.reminderInputCard, {
          backgroundColor: isDark ? colors.surface : '#FFFEF8',
          borderRadius: 28,
          borderColor: isDark ? colors.border : 'rgba(20,19,19,0.12)',
          shadowColor: '#141313',
          shadowOpacity: isDark ? 0 : 0.07,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 4 },
        }]}>
          {/* Sticker decoration — top-right corner */}
          <View style={{ position: 'absolute', top: -10, right: 14, transform: [{ rotate: '15deg' }] }} pointerEvents="none">
            <StarSticker size={36} fill={stickers.yellow} stroke="#141313" />
          </View>

          {/* Header row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            {/* Yellow bell sticker badge */}
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: stickers.yellow, borderWidth: 1.5, borderColor: '#141313', alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={13} color="#141313" strokeWidth={2.5} />
            </View>
            <Text style={{ fontSize: 16, fontFamily: 'Fraunces_600SemiBold', color: colors.text, letterSpacing: -0.3 }}>Add reminder</Text>
          </View>

          {/* Text input */}
          <TextInput
            style={[s.reminderInput, {
              color: colors.text,
              backgroundColor: isDark ? colors.surfaceRaised : 'rgba(20,19,19,0.04)',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: isDark ? colors.border : 'rgba(20,19,19,0.08)',
              paddingHorizontal: 14,
              paddingVertical: 11,
            }]}
            placeholder="e.g. Give vitamin D drops, call pediatrician..."
            placeholderTextColor={colors.textMuted}
            value={newReminderText}
            onChangeText={setNewReminderText}
            onSubmitEditing={addReminder}
            autoFocus
            returnKeyType="done"
            multiline={false}
          />

          {/* Actions row — Date + (optional Time) + Save */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Date pill */}
            <Pressable
              onPress={() => { setShowDatePicker(!showDatePicker); setShowTimePicker(false) }}
              style={[s.reminderDateBtn, {
                borderColor: newReminderDate ? brand.kids : (isDark ? colors.border : 'rgba(20,19,19,0.12)'),
                backgroundColor: newReminderDate
                  ? brand.kids + '18'
                  : (isDark ? colors.surfaceRaised : stickers.blue + '22'),
                borderRadius: radius.full,
                flex: 0,
              }]}
            >
              <Clock size={12} color={newReminderDate ? brand.kids : colors.textSecondary} strokeWidth={2} />
              <Text style={[s.reminderDateBtnText, {
                color: newReminderDate ? brand.kids : colors.textSecondary,
                fontFamily: 'DMSans_600SemiBold',
                flex: 0,
              }]}>
                {newReminderDate
                  ? newReminderDate.toLocaleDateString('en', { month: 'short', day: 'numeric' })
                  : 'Set date'}
              </Text>
              {newReminderDate && (
                <Pressable onPress={() => { setNewReminderDate(null); setNewReminderTime(null); setShowDatePicker(false); setShowTimePicker(false) }} hitSlop={8}>
                  <X size={10} color={brand.kids} strokeWidth={2.5} />
                </Pressable>
              )}
            </Pressable>

            {/* Time pill — only visible after date is chosen */}
            {newReminderDate && (
              <Pressable
                onPress={() => { setShowTimePicker(!showTimePicker); setShowDatePicker(false) }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 5,
                  paddingHorizontal: 12, paddingVertical: 7,
                  borderRadius: radius.full, borderWidth: 1,
                  borderColor: newReminderTime ? stickers.peach + 'CC' : (isDark ? colors.border : 'rgba(20,19,19,0.12)'),
                  backgroundColor: newReminderTime
                    ? stickers.peach + '30'
                    : (isDark ? colors.surfaceRaised : stickers.peach + '22'),
                }}
              >
                <Bell size={11} color={newReminderTime ? '#C06030' : colors.textSecondary} strokeWidth={2} />
                <Text style={{ fontSize: 11, fontFamily: 'DMSans_600SemiBold', color: newReminderTime ? '#C06030' : colors.textSecondary }}>
                  {newReminderTime
                    ? formatTime12h(`${String(newReminderTime.getHours()).padStart(2, '0')}:${String(newReminderTime.getMinutes()).padStart(2, '0')}`)
                    : 'Set time'}
                </Text>
                {newReminderTime && (
                  <Pressable onPress={() => { setNewReminderTime(null); setShowTimePicker(false) }} hitSlop={8}>
                    <X size={9} color="#C06030" strokeWidth={2.5} />
                  </Pressable>
                )}
              </Pressable>
            )}

            {/* Spacer so Save stays at end */}
            <View style={{ flex: 1 }} />

            {/* Save button */}
            <Pressable onPress={addReminder} style={[s.reminderSaveBtn, { backgroundColor: brand.kids, borderRadius: radius.full, borderWidth: 1.5, borderColor: isDark ? brand.kids : '#141313' }]}>
              <Text style={[s.reminderSaveBtnText, { fontFamily: 'DMSans_700Bold' }]}>Save</Text>
            </Pressable>
          </View>

          {/* Child tag picker */}
          {children.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
              <Pressable
                onPress={() => setNewReminderChildId(null)}
                style={[s.childTagChip, {
                  backgroundColor: newReminderChildId === null ? brand.kids + '22' : (isDark ? 'transparent' : 'rgba(20,19,19,0.04)'),
                  borderColor: newReminderChildId === null ? brand.kids : (isDark ? colors.border : 'rgba(20,19,19,0.12)'),
                  borderRadius: radius.full,
                }]}
              >
                <Text style={[s.childTagChipText, { color: newReminderChildId === null ? brand.kids : colors.textSecondary, fontFamily: 'DMSans_600SemiBold' }]}>All kids</Text>
              </Pressable>
              {children.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => setNewReminderChildId(c.id === newReminderChildId ? null : c.id)}
                  style={[s.childTagChip, {
                    backgroundColor: newReminderChildId === c.id ? brand.kids + '25' : (isDark ? 'transparent' : 'rgba(20,19,19,0.04)'),
                    borderColor: newReminderChildId === c.id ? brand.kids : (isDark ? colors.border : 'rgba(20,19,19,0.12)'),
                    borderRadius: radius.full,
                  }]}
                >
                  <Text style={[s.childTagChipText, { color: newReminderChildId === c.id ? brand.kids : colors.textSecondary, fontFamily: 'DMSans_600SemiBold' }]}>{c.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {/* Inline calendar picker */}
          {showDatePicker && (
            <View style={{
              borderRadius: 20,
              overflow: 'hidden',
              marginTop: 6,
              borderWidth: 1.5,
              borderColor: isDark ? colors.border : 'rgba(20,19,19,0.1)',
              backgroundColor: isDark ? colors.surfaceRaised : '#FFFFFF',
            }}>
              {/* Calendar header label */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 }}>
                <View style={{ transform: [{ rotate: '-10deg' }] }}>
                  <StarSticker size={18} fill={stickers.blue} stroke="#141313" />
                </View>
                <Text style={{ fontFamily: 'Fraunces_600SemiBold', fontSize: 14, color: colors.text, letterSpacing: -0.2 }}>Pick a date</Text>
              </View>
              <DateTimePicker
                value={newReminderDate ?? new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                minimumDate={new Date()}
                themeVariant={isDark ? 'dark' : 'light'}
                accentColor={brand.kids}
                onChange={(e: DateTimePickerEvent, date?: Date) => {
                  if (Platform.OS !== 'ios') setShowDatePicker(false)
                  if (date) setNewReminderDate(date)
                }}
              />
              {Platform.OS === 'ios' && (
                <Pressable
                  onPress={() => setShowDatePicker(false)}
                  style={{
                    alignItems: 'center',
                    paddingVertical: 12,
                    backgroundColor: isDark ? colors.surface : stickers.blue + '18',
                    borderTopWidth: 1,
                    borderTopColor: isDark ? colors.border : 'rgba(20,19,19,0.08)',
                  }}
                >
                  <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 14, color: brand.kids }}>Done — confirm date</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Time picker panel */}
          {showTimePicker && newReminderDate && (
            <View style={{
              borderRadius: 20,
              overflow: 'hidden',
              marginTop: 6,
              borderWidth: 1.5,
              borderColor: isDark ? colors.border : 'rgba(20,19,19,0.1)',
              backgroundColor: isDark ? colors.surfaceRaised : '#FFFFFF',
            }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: stickers.peach, borderWidth: 1.5, borderColor: '#141313', alignItems: 'center', justifyContent: 'center' }}>
                    <Bell size={10} color="#141313" strokeWidth={2.5} />
                  </View>
                  <Text style={{ fontFamily: 'Fraunces_600SemiBold', fontSize: 14, color: colors.text, letterSpacing: -0.2 }}>Set a time</Text>
                </View>
                {newReminderTime && (
                  <Pressable onPress={() => { setNewReminderTime(null) }} hitSlop={8}>
                    <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 11, color: colors.textMuted }}>Clear</Text>
                  </Pressable>
                )}
              </View>
              <DateTimePicker
                value={newReminderTime ?? (() => { const d = new Date(); d.setHours(9, 0, 0, 0); return d })()}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                themeVariant={isDark ? 'dark' : 'light'}
                accentColor={brand.kids}
                style={{ height: 140 }}
                onChange={(e: DateTimePickerEvent, date?: Date) => {
                  if (Platform.OS !== 'ios') setShowTimePicker(false)
                  if (date) setNewReminderTime(date)
                }}
              />
              {Platform.OS === 'ios' && (
                <Pressable
                  onPress={() => setShowTimePicker(false)}
                  style={{
                    alignItems: 'center',
                    paddingVertical: 12,
                    backgroundColor: isDark ? colors.surface : stickers.peach + '18',
                    borderTopWidth: 1,
                    borderTopColor: isDark ? colors.border : 'rgba(20,19,19,0.08)',
                  }}
                >
                  <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 14, color: '#C06030' }}>Done — confirm time</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      )}

      {(() => {
        const active = reminders.filter(r => !r.done)
        const archived = reminders.filter(r => r.done)
        const preview = active.slice(0, 4)
        const hasMore = active.length > 4
        if (reminders.length === 0) return (
          <View style={[s.remindersEmpty, { backgroundColor: colors.surface, borderRadius: 20, borderColor: colors.border }]}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(245,214,82,0.24)', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
              <Bell size={20} color="#EE7B6D" strokeWidth={2} />
            </View>
            <Text style={[s.remindersEmptyText, { color: colors.text, fontFamily: 'Fraunces_600SemiBold' }]}>No reminders yet</Text>
            <Text style={[s.remindersEmptyHint, { color: colors.textMuted }]}>Add notes, tasks or things to remember</Text>
          </View>
        )
        return (
          <View style={{ gap: 8 }}>
            {preview.map((r, i) => (
              <ReminderRow
                key={r.id}
                r={r}
                isLast={i === preview.length - 1 && !hasMore}
                onToggle={() => toggleReminder(r.id)}
                onDelete={() => deleteReminder(r.id)}
                onEdit={editReminder}
                colors={colors}
                allChildren={children}
              />
            ))}
            {hasMore && (
              <Pressable
                onPress={() => setRemindersModalVisible(true)}
                style={[s.reminderSeeAll]}
              >
                <Text style={[s.reminderSeeAllText, { color: brand.kids }]}>
                  +{active.length - 4} more
                </Text>
                <ChevronRight size={13} color={brand.kids} strokeWidth={2} />
              </Pressable>
            )}
          </View>
        )
      })()}

      <RemindersModal
        visible={remindersModalVisible}
        onClose={() => setRemindersModalVisible(false)}
        reminders={reminders}
        onToggle={toggleReminder}
        onDelete={deleteReminder}
        onEdit={editReminder}
        onFlag={flagReminder}
        onReorder={persistReminders}
        colors={colors}
        allChildren={children}
      />

      {/* ─── Ask Grandma (lavender soft + blue burst sticker) ──── */}
      <Pressable
        onPress={() => router.push('/grandma-talk' as any)}
        style={({ pressed }) => [s.grandmaCard, { opacity: pressed ? 0.92 : 1 }]}
      >
        {/* Blue burst sticker — pokes out of the card top-right */}
        <View style={s.grandmaBurst}>
          <BurstSticker size={92} fill="#9DC3E8" stroke="#141313" />
        </View>
        <View style={s.grandmaIconWrap}>
          <SparkleSticker size={26} fill="#F5D652" stroke="#141313" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.grandmaTitle}>Grandma knows best</Text>
          <Text style={s.grandmaDesc}>
            Sleep, feeding, milestones <Text style={s.grandmaDescItalic}>& more</Text>
          </Text>
        </View>
        <View style={s.grandmaArrow}>
          <ChevronRight size={16} color="#141313" strokeWidth={2.5} />
        </View>
      </Pressable>

      {/* ─── Rewards Card (paper cream) ──────────────────────── */}
      <Pressable
        onPress={() => router.push('/daily-rewards' as any)}
        style={({ pressed }) => [s.rewardsCard, { opacity: pressed ? 0.92 : 1 }]}
      >
        <View style={s.rewardsIconWrap}>
          <StarSticker size={26} fill="#F5D652" stroke="#141313" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.rewardsTitle}>Your Rewards</Text>
          <Text style={s.rewardsDesc}>
            Points, streaks <Text style={s.rewardsDescItalic}>& badges</Text>
          </Text>
        </View>
        <View style={s.rewardsStats}>
          <View style={s.rewardsStat}>
            <FlameSticker size={16} fill="#EE7B6D" stroke="#141313" />
            <Text style={[s.rewardsStatNum, { color: '#141313' }]}>{currentStreak}</Text>
          </View>
          <View style={s.rewardsStat}>
            <StarSticker size={16} fill="#F5D652" stroke="#141313" />
            <Text style={[s.rewardsStatNum, { color: '#141313' }]}>{totalPoints}</Text>
          </View>
          <View style={s.rewardsStat}>
            <Trophy size={14} color="#BDD48C" fill="#BDD48C" strokeWidth={2} />
            <Text style={[s.rewardsStatNum, { color: '#141313' }]}>{earnedBadges.length}</Text>
          </View>
        </View>
        <ChevronRight size={14} color={colors.textMuted} strokeWidth={2.5} />
      </Pressable>

      {/* ─── Detail Modals ───────────────────────────────────── */}
      {(() => {
        const { startDate: sd, endDate: ed } = getDateRange(dateRange, customRange)
        return (
          <>
            <DiaperDetailModal
              visible={diaperModalVisible}
              onClose={() => setDiaperModalVisible(false)}
              count={rangeData.diaperCount}
              pee={rangeData.diaperPee}
              poop={rangeData.diaperPoop}
              mixed={rangeData.diaperMixed}
              diaperByDay={rangeData.diaperByDay}
              diaperColors={rangeData.diaperColors}
              dateRange={dateRange}
              startDate={sd}
              endDate={ed}
              childName={child?.name}
              childColor={CHILD_COLORS[children.findIndex(c => c.id === child?.id) % CHILD_COLORS.length]}
            />
            <MoodDetailModal
            visible={moodModalVisible}
            onClose={() => setMoodModalVisible(false)}
            moodCounts={rangeData.moodCounts}
            dominantMood={rangeData.dominantMood}
            dateRange={dateRange}
            startDate={sd}
            endDate={ed}
            childName={child?.name}
            childColor={CHILD_COLORS[children.findIndex(c => c.id === child?.id) % CHILD_COLORS.length]}
          />
          </>
        )
      })()}
      <SleepDetailModal
        visible={sleepModalVisible}
        onClose={() => setSleepModalVisible(false)}
        sleepTotal={rangeData.sleepTotal}
        sleepTarget={rangeData.sleepTarget}
        sleepQuality={rangeData.sleepQuality}
        dailySleep={rangeData.dailySleep}
        dailySleepTarget={rangeData.dailySleepTarget}
        dayLabels={rangeData.dayLabels}
        childName={child?.name}
        childColor={CHILD_COLORS[children.findIndex(c => c.id === child?.id) % CHILD_COLORS.length]}
      />
      <HealthDetailModal
        visible={healthModalVisible}
        onClose={() => setHealthModalVisible(false)}
        sleepQuality={rangeData.sleepQuality}
        sleepTotal={rangeData.sleepTotal}
        sleepTarget={rangeData.sleepTarget}
        child={child}
        childColor={CHILD_COLORS[children.findIndex(c => c.id === child?.id) % CHILD_COLORS.length]}
        healthHistory={healthHistory}
        scheduledVaccines={scheduledVaccines}
        onSetVaccineDate={(key, date) => setVaccineDate(child.id, key, date)}
        onMarkVaccineGiven={(name, date, key) => markVaccineGiven(child.id, name, date, key)}
        activityCount={rangeData.activityCount}
        activityBreakdown={rangeData.activityBreakdown}
        feedingCount={rangeData.feedingCount}
        caloriesTotal={rangeData.caloriesTotal}
        feedingMl={rangeData.feedingMl}
        stage={feedingStage}
      />
      <ActivityDetailModal
        visible={activityModalVisible}
        onClose={() => setActivityModalVisible(false)}
        caloriesTotal={rangeData.caloriesTotal}
        caloriesTarget={rangeData.caloriesTarget}
        categories={rangeData.calorieCategories}
        stage={feedingStage}
        feedingCount={rangeData.feedingCount}
        feedingBreast={rangeData.feedingBreast}
        feedingBottle={rangeData.feedingBottle}
        feedingMl={rangeData.feedingMl}
        avgMl={rangeData.avgFeedingMl}
        childName={child?.name}
        childColor={CHILD_COLORS[children.findIndex(c => c.id === child?.id) % CHILD_COLORS.length]}
      />
      <ActivitiesDetailModal
        visible={activitiesDetailVisible}
        onClose={() => setActivitiesDetailVisible(false)}
        activityCount={rangeData.activityCount}
        activeDays={rangeData.activityActiveDays}
        rangeDays={rangeData.activityRangeDays}
        breakdown={rangeData.activityBreakdown}
        entries={rangeData.activityEntries}
        childName={child?.name}
        childColor={CHILD_COLORS[children.findIndex(c => c.id === child?.id) % CHILD_COLORS.length]}
      />
      {child && (
        <GoalSettingModal
          visible={goalsModalVisible}
          onClose={() => setGoalsModalVisible(false)}
          childId={child.id}
          childName={child.name}
          birthDate={child.birthDate}
          onSaved={() => loadRangeData(child, dateRange)}
        />
      )}
    </View>
  )
}

// ─── Multi-Ring Hero ────────────────────────────────────────────────────────

// ─── Hero Tiles (v1 redesign): LAST SLEEP / MOOD / CALORIES / LEAP ─────────

function HeroTiles({
  sleepTotal,
  sleepTarget,
  dominantMood,
  moodCounts,
  caloriesTotal,
  caloriesTarget,
  feedingCount,
  feedingTarget,
  stage,
  activityCount,
  activityActiveDays,
  activityRangeDays,
  activityTopLabel,
  activityTypesCount,
  onPressSleep,
  onPressMood,
  onPressCalories,
  onPressActivity,
}: {
  sleepTotal: number
  sleepTarget: number
  dominantMood: string
  moodCounts: Record<string, number>
  caloriesTotal: number
  caloriesTarget: number
  feedingCount: number
  feedingTarget: number
  stage: FeedingStage
  activityCount: number
  activityActiveDays: number
  activityRangeDays: number
  activityTopLabel?: string
  activityTypesCount: number
  onPressSleep?: () => void
  onPressMood?: () => void
  onPressCalories?: () => void
  onPressActivity?: () => void
}) {
  const { colors, isDark } = useTheme()
  const ink = isDark ? colors.text : '#141313'
  const ink3 = isDark ? colors.textMuted : '#6E6763'
  const lineColor = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const paper = isDark ? colors.surface : '#FFFEF8'

  // Sticker-palette soft bgs
  const blueSoft = isDark ? 'rgba(157,195,232,0.18)' : '#CFE0F0'
  const yellowSoft = isDark ? 'rgba(245,214,82,0.24)' : '#F5D652'
  const pinkSoft = isDark ? 'rgba(242,178,199,0.18)' : '#F9D8E2'
  const greenSoft = isDark ? 'rgba(189,212,140,0.18)' : '#DDE7BB'

  // Activity — engagement ratio (active days over range) is the meaningful metric
  const activityEngagement = activityRangeDays > 0 ? Math.min(activityActiveDays / activityRangeDays, 1) : 0
  const activityValueLabel = activityCount > 0 ? `${activityCount}` : '—'
  const activitySub = activityCount > 0
    ? (activityRangeDays > 0 ? `${activityActiveDays}/${activityRangeDays} active days` : `${activityActiveDays} active days`)
    : 'Log an activity'
  const activityMeta = activityCount > 0
    ? `${activityTypesCount} type${activityTypesCount !== 1 ? 's' : ''}${activityTopLabel ? ` · Top: ${activityTopLabel}` : ''}`
    : ''

  // Last sleep value: show total hours + minutes for the selected range
  const sleepHours = Math.floor(sleepTotal)
  const sleepMins = Math.round((sleepTotal - sleepHours) * 60)
  const sleepLabel = sleepTotal > 0 ? `${sleepHours}h ${String(sleepMins).padStart(2, '0')}` : '—'
  const sleepSub = sleepTarget > 0 ? `of ${Math.round(sleepTarget)}h target` : 'No goal set'

  // Mood — each bar reflects its count, colored by mood, dominant bar highlighted
  const moodKeys = ['happy', 'calm', 'energetic', 'fussy', 'cranky'] as const
  const moodValues = moodKeys.map((m) => moodCounts[m] || 0)
  const totalMoodLogs = moodValues.reduce((a, b) => a + b, 0)
  const maxMood = Math.max(...moodValues, 1)
  const hasMoods = totalMoodLogs > 0
  const moodDisplay = hasMoods && dominantMood ? (MOOD_LABELS[dominantMood] ?? 'Content') : 'No data'
  const moodEmoji = hasMoods && dominantMood ? (MOOD_EMOJI[dominantMood] ?? '🙂') : '—'

  // Calories / feedings
  const isLiquid = stage === 'liquid' || stage === 'mixed'
  const calValue = isLiquid
    ? (feedingCount > 0 ? `${feedingCount}` : '—')
    : (caloriesTotal > 0 ? caloriesTotal.toLocaleString() : '—')
  const calTarget = isLiquid ? feedingTarget : caloriesTarget
  const calPct = calTarget > 0 ? Math.min((isLiquid ? feedingCount : caloriesTotal) / calTarget, 1) : 0
  const calSub = calTarget > 0 ? `of ${calTarget.toLocaleString()} target` : (isLiquid ? 'Tap for details' : 'Set a target')

  // Empty/data flags so we render inviting copy instead of bare "—"
  const hasSleep = sleepTotal > 0
  const hasFeed = isLiquid ? feedingCount > 0 : caloriesTotal > 0
  const hasActivity = activityCount > 0
  const sleepNum = hasSleep ? `${sleepHours}` : ''
  const sleepMinStr = hasSleep && sleepMins > 0 ? ` ${String(sleepMins).padStart(2, '0')}` : ''

  return (
    <View style={{ gap: 10 }}>
      {/* Row 1: LAST SLEEP (1.3fr) + MOOD (1fr) */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable
          onPress={onPressSleep}
          style={({ pressed }) => [
            tileStyles.card,
            { backgroundColor: blueSoft, borderColor: lineColor, flex: 1.3, opacity: pressed ? 0.92 : 1 },
          ]}
        >
          <Text style={[tileStyles.metaLabel, { color: ink3 }]}>LAST SLEEP</Text>
          <View style={tileStyles.bodyRow}>
            <View style={[tileStyles.iconCircle, { backgroundColor: paper, borderColor: lineColor }]}>
              <MoonSticker size={32} fill="#9DC3E8" stroke={ink} />
            </View>
            <View style={{ flex: 1 }}>
              {hasSleep ? (
                <Text style={[tileStyles.heroNumber, { color: ink }]}>
                  {sleepNum}
                  <Text style={[tileStyles.heroUnit, { color: ink }]}>h</Text>
                  {sleepMinStr ? (
                    <Text style={[tileStyles.heroSecondary, { color: ink }]}>{sleepMinStr}</Text>
                  ) : null}
                </Text>
              ) : (
                <Text style={[tileStyles.emptyHero, { color: ink }]}>Tap to log</Text>
              )}
              <Text style={[tileStyles.subText, { color: ink3 }]}>{sleepSub}</Text>
            </View>
          </View>
        </Pressable>

        <Pressable
          onPress={onPressMood}
          style={({ pressed }) => [
            tileStyles.card,
            { backgroundColor: yellowSoft, borderColor: lineColor, flex: 1, padding: 14, opacity: pressed ? 0.92 : 1 },
          ]}
        >
          <Text style={[tileStyles.metaLabel, { color: '#3A3533' }]}>MOOD</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
            {hasMoods && dominantMood ? (
              <MoodFace size={28} variant={moodFaceVariant(dominantMood)} fill={moodFaceFill(dominantMood)} />
            ) : (
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: paper, borderWidth: 1, borderColor: lineColor }} />
            )}
            <Text
              style={[
                hasMoods ? tileStyles.moodLabelOn : tileStyles.moodLabelOff,
                { color: ink, flex: 1 },
              ]}
              numberOfLines={1}
            >
              {hasMoods ? moodDisplay : 'How are they?'}
            </Text>
          </View>
          {/* Mood bars — colored by each mood; dominant is full opacity */}
          <View style={{ flexDirection: 'row', gap: 3, marginTop: 10, alignItems: 'flex-end' }}>
            {moodValues.map((v, i) => {
              const key = moodKeys[i]
              const h = Math.max((v / maxMood) * 34, 4)
              const isDominant = hasMoods && key === dominantMood
              const baseColor = MOOD_COLORS[key] ?? '#6E6763'
              return (
                <View
                  key={key}
                  style={{
                    flex: 1,
                    height: h,
                    borderRadius: 4,
                    backgroundColor: baseColor,
                    opacity: !hasMoods ? 0.25 : isDominant ? 1 : v > 0 ? 0.55 : 0.2,
                  }}
                />
              )
            })}
          </View>
          <Text style={[tileStyles.metaSub, { color: ink3 }]}>
            {hasMoods ? `${totalMoodLogs} log${totalMoodLogs !== 1 ? 's' : ''}` : 'Tap to log'}
          </Text>
        </Pressable>
      </View>

      {/* Row 2: FEEDINGS / CALORIES (1fr) + ACTIVITIES (1.2fr) */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable
          onPress={onPressCalories}
          style={({ pressed }) => [
            tileStyles.card,
            { backgroundColor: pinkSoft, borderColor: lineColor, flex: 1, opacity: pressed ? 0.92 : 1 },
          ]}
        >
          <View style={tileStyles.headerRow}>
            <Text style={[tileStyles.metaLabel, { color: ink3 }]}>
              {isLiquid ? 'FEEDINGS' : 'CALORIES'}
            </Text>
            <View style={[tileStyles.miniSticker, { backgroundColor: paper, borderColor: lineColor }]}>
              <HeartSticker size={18} fill="#EE7B6D" stroke={ink} />
            </View>
          </View>
          {hasFeed ? (
            <Text style={[tileStyles.heroNumber, { color: ink, marginTop: 8 }]}>
              {calValue}
              {!isLiquid && (
                <Text style={[tileStyles.heroUnit, { color: ink }]}>kcal</Text>
              )}
            </Text>
          ) : (
            <Text style={[tileStyles.emptyHero, { color: ink, marginTop: 8 }]}>Tap to log</Text>
          )}
          <Text style={[tileStyles.subText, { color: ink3 }]}>{calSub}</Text>
          {/* Progress bar */}
          <View style={{ height: 6, borderRadius: 999, backgroundColor: 'rgba(238,123,109,0.18)', marginTop: 10, overflow: 'hidden' }}>
            <View style={{ width: `${Math.min(calPct, 1) * 100}%`, height: 6, borderRadius: 999, backgroundColor: '#EE7B6D' }} />
          </View>
        </Pressable>

        <Pressable
          onPress={onPressActivity}
          style={({ pressed }) => [
            tileStyles.card,
            { backgroundColor: greenSoft, borderColor: lineColor, flex: 1.2, opacity: pressed ? 0.92 : 1 },
          ]}
        >
          <Text style={[tileStyles.metaLabel, { color: ink3 }]}>ACTIVITIES</Text>
          <View style={tileStyles.bodyRow}>
            <ActivityPctRing pct={activityEngagement} size={56} color="#8BB356" trackColor="rgba(139,179,86,0.20)" />
            <View style={{ flex: 1 }}>
              {hasActivity ? (
                <Text style={[tileStyles.heroNumber, { color: ink }]}>
                  {activityValueLabel}
                  <Text style={[tileStyles.heroUnit, { color: ink }]}>logs</Text>
                </Text>
              ) : (
                <Text style={[tileStyles.emptyHero, { color: ink }]}>Tap to log</Text>
              )}
              <Text style={[tileStyles.subText, { color: ink3 }]} numberOfLines={1}>
                {activitySub}
              </Text>
            </View>
          </View>
          {activityMeta ? (
            <Text style={{ fontSize: 11, fontFamily: 'DMSans_500Medium', color: ink3, marginTop: 8, letterSpacing: 0.2 }} numberOfLines={1}>
              {activityMeta}
            </Text>
          ) : null}
        </Pressable>
      </View>
    </View>
  )
}

// Inline star sticker for the LEAP tile corner
function SvgStar() {
  return (
    <Svg width={70} height={70} viewBox="0 0 100 100">
      <Path
        d="M50,8 L61,38 L94,40 L68,60 L78,92 L50,72 L22,92 L32,60 L6,40 L39,38 Z"
        fill="#F5D652"
        stroke="#141313"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// ─── Hero tile shared styles (sticker-card aesthetic) ─────────────────────────
const tileStyles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  metaLabel: {
    fontSize: 10,
    fontFamily: 'DMSans_600SemiBold',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  metaSub: {
    fontSize: 10.5,
    fontFamily: 'DMSans_500Medium',
    marginTop: 6,
    letterSpacing: 0.3,
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  miniSticker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  heroNumber: {
    fontFamily: 'Fraunces_800ExtraBold',
    fontSize: 36,
    lineHeight: 38,
    letterSpacing: -1.4,
    fontWeight: '800',
  },
  heroUnit: {
    fontFamily: 'InstrumentSerif_400Regular_Italic',
    fontStyle: 'italic',
    fontSize: 18,
    fontWeight: '400',
    opacity: 0.55,
    letterSpacing: 0,
  },
  heroSecondary: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.6,
  },
  emptyHero: {
    fontFamily: 'InstrumentSerif_400Regular_Italic',
    fontStyle: 'italic',
    fontSize: 22,
    opacity: 0.55,
    letterSpacing: -0.2,
    lineHeight: 28,
  },
  moodLabelOn: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 22,
    letterSpacing: -0.5,
    fontWeight: '700',
  },
  moodLabelOff: {
    fontFamily: 'InstrumentSerif_400Regular_Italic',
    fontStyle: 'italic',
    fontSize: 18,
    opacity: 0.6,
    letterSpacing: -0.2,
  },
  subText: {
    fontSize: 11.5,
    fontFamily: 'DMSans_400Regular',
    marginTop: 3,
  },
})

// Small circular progress ring used inside the Activity hero tile
function ActivityPctRing({ pct, size, color, trackColor }: { pct: number; size: number; color: string; trackColor: string }) {
  const stroke = 5
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - Math.max(0, Math.min(pct, 1)))
  return (
    <Svg width={size} height={size}>
      <SvgCircle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
      <SvgCircle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={`${c}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        rotation={-90}
        origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  )
}

function MultiRingHero({ sleepProgress, nutritionProgress, activityProgress, focused, onTapRing, centerData }: {
  sleepProgress: number; nutritionProgress: number; activityProgress: number
  focused: 'sleep' | 'nutrition' | 'activity'
  onTapRing: (ring: 'sleep' | 'nutrition' | 'activity') => void
  centerData: { value: string; unit: string; pct: number; icon: typeof Moon; color: string }
}) {
  const { colors } = useTheme()
  const size = Math.min(SW - 140, 260)
  const center = size / 2

  // Ring geometry — tighter ring spacing to match compact reference
  const RING_R = [(size - 14) / 2, (size - 42) / 2, (size - 70) / 2]
  const RING_CIRC = RING_R.map((r) => 2 * Math.PI * r)

  // Animated shared values — one per ring (hooks rules: no loops)
  const rp0 = useSharedValue(0); const rp1 = useSharedValue(0); const rp2 = useSharedValue(0)
  const breathe = useSharedValue(0)
  const scoreOpacity = useSharedValue(0)

  // Animated props for each ring's strokeDashoffset
  const rap0 = useAnimatedProps(() => {
    const wobble = 1 + 0.015 * Math.sin(breathe.value + 0)
    return { strokeDashoffset: RING_CIRC[0] * (1 - rp0.value * wobble) }
  })
  const rap1 = useAnimatedProps(() => {
    const wobble = 1 + 0.015 * Math.sin(breathe.value + 1.2)
    return { strokeDashoffset: RING_CIRC[1] * (1 - rp1.value * wobble) }
  })
  const rap2 = useAnimatedProps(() => {
    const wobble = 1 + 0.015 * Math.sin(breathe.value + 2.4)
    return { strokeDashoffset: RING_CIRC[2] * (1 - rp2.value * wobble) }
  })
  const ringAnimProps = [rap0, rap1, rap2]

  const centerAnimStyle = useAnimatedStyle(() => ({
    opacity: scoreOpacity.value,
    transform: [{ scale: 0.9 + 0.1 * scoreOpacity.value }],
  }))

  useEffect(() => {
    const spring = { damping: 14, stiffness: 90, mass: 0.8 }
    rp0.value = 0; rp1.value = 0; rp2.value = 0
    scoreOpacity.value = 0
    rp0.value = withDelay(0,   withSpring(Math.min(sleepProgress, 1), spring))
    rp1.value = withDelay(150, withSpring(Math.min(nutritionProgress, 1), spring))
    rp2.value = withDelay(300, withSpring(Math.min(activityProgress, 1), spring))
    scoreOpacity.value = withDelay(400, withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) }))
    // Start breathing loop
    breathe.value = 0
    breathe.value = withDelay(800, withRepeat(
      withTiming(2 * Math.PI, { duration: 4000, easing: Easing.linear }),
      -1, false
    ))
  }, [sleepProgress, nutritionProgress, activityProgress])

  const ringKeys = ['sleep', 'nutrition', 'activity'] as const
  const gradIds  = ['sleepGrad', 'calGrad', 'actGrad']
  const Icon = centerData.icon

  return (
    <Pressable style={s.heroWrap} onPress={() => {
      const order: ('sleep' | 'nutrition' | 'activity')[] = ['sleep', 'nutrition', 'activity']
      const idx = order.indexOf(focused)
      onTapRing(order[(idx + 1) % 3])
    }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} style={{ position: 'absolute' }}>
          <Defs>
            <LinearGradient id="sleepGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={PILLAR_COLORS.sleep} />
              <Stop offset="1" stopColor={PILLAR_COLORS.sleep} />
            </LinearGradient>
            <LinearGradient id="calGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={PILLAR_COLORS.nutrition} />
              <Stop offset="1" stopColor={PILLAR_COLORS.nutrition} />
            </LinearGradient>
            <LinearGradient id="actGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={PILLAR_COLORS.activity} />
              <Stop offset="1" stopColor={PILLAR_COLORS.activity} />
            </LinearGradient>
          </Defs>
          {ringKeys.map((key, i) => {
            const isFocused = focused === key
            return [
              <SvgCircle
                key={key + '-bg'}
                cx={center} cy={center} r={RING_R[i]}
                stroke={colors.border}
                strokeWidth={5}
                fill="none"
              />,
              <AnimatedSvgCircle
                key={key + '-fg'}
                cx={center} cy={center} r={RING_R[i]}
                stroke={`url(#${gradIds[i]})`}
                strokeWidth={isFocused ? 6 : 5}
                fill="none"
                strokeDasharray={`${RING_CIRC[i]}`}
                strokeLinecap="round"
                rotation={-90}
                origin={`${center}, ${center}`}
                opacity={isFocused ? 1 : 0.88}
                animatedProps={ringAnimProps[i]}
              />,
            ]
          })}
        </Svg>

        <Reanimated.View style={[s.heroCenter, centerAnimStyle]}>
          <Icon size={16} color={centerData.color} strokeWidth={2} />
          <Text style={[s.heroNumber, { color: colors.text }]}>{centerData.value}</Text>
          <Text style={[s.heroUnit, { color: colors.textMuted }]}>{centerData.unit.toUpperCase()}</Text>
          {centerData.pct > 0 && (
            <View style={[s.heroBadge, { backgroundColor: centerData.pct >= 90 ? 'rgba(110,201,110,0.12)' : 'rgba(255,152,0,0.12)' }]}>
              <Text style={[s.heroBadgeText, { color: centerData.pct >= 90 ? brand.success : brand.warning }]}>
                {centerData.pct >= 100 ? 'On target' : `${centerData.pct}% of goal`}
              </Text>
            </View>
          )}
        </Reanimated.View>
      </View>
    </Pressable>
  )
}

// ─── Mini Ring ──────────────────────────────────────────────────────────────

function MiniRing({ label, progress, color, isToday, hasData }: {
  label: string; progress: number; color: string; isToday: boolean; hasData: boolean
}) {
  const { colors } = useTheme()
  const size = 40
  const strokeW = 3
  const r = (size - strokeW) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - progress)
  const pct = Math.round(progress * 100)

  return (
    <View style={s.miniRingCol}>
      <View style={[s.miniRingOuter, { width: size, height: size }, isToday && { borderWidth: 1.5, borderColor: color + '40', borderRadius: size / 2 }]}>
        <Svg width={size} height={size} style={{ position: 'absolute' }}>
          <SvgCircle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color + '15'} strokeWidth={strokeW} />
          {hasData && (
            <SvgCircle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeW}
              strokeDasharray={`${circumference}`} strokeDashoffset={offset}
              strokeLinecap="round" rotation="-90" origin={`${size / 2}, ${size / 2}`}
            />
          )}
        </Svg>
        {hasData ? (
          <Text style={{ fontSize: 10, fontFamily: 'DMSans_600SemiBold', color: isToday ? color : color + 'CC' }}>
            {pct >= 100 ? '✓' : `${pct}%`}
          </Text>
        ) : (
          <Text style={{ fontSize: 11, color: colors.textFaint, fontFamily: 'DMSans_500Medium' }}>—</Text>
        )}
      </View>
      <Text style={[s.miniRingLabel, { color: isToday ? color : colors.textMuted }]}>{label}</Text>
    </View>
  )
}

// ─── Mood Card ──────────────────────────────────────────────────────────────

function MoodCard({ moodCounts, dominantMood }: { moodCounts: Record<string, number>; dominantMood: string }) {
  const { colors, isDark } = useTheme()
  const moods = ['happy', 'calm', 'energetic', 'fussy', 'cranky']
  const maxCount = Math.max(...Object.values(moodCounts), 1)
  const hasMoods = Object.values(moodCounts).some((v) => v > 0)
  const dominantLabel = MOOD_LABELS[dominantMood] || 'No data'

  // Pastel-soft yellow tile (sticker palette)
  const tileBg = isDark ? 'rgba(245,214,82,0.16)' : '#FBEA9E'
  const tileBorder = isDark ? 'rgba(245,214,82,0.28)' : 'rgba(20,19,19,0.08)'
  const ink = isDark ? colors.text : '#141313'
  const ink3 = isDark ? colors.textMuted : '#6E6763'

  return (
    <View style={[s.metricCard, { backgroundColor: tileBg, borderColor: tileBorder }]}>
      <View style={s.metricHeader}>
        <View style={[s.metricHeaderIcon, { borderColor: '#F5D652', backgroundColor: 'rgba(245,214,82,0.35)', overflow: 'hidden' }]}>
          <MoodFace size={18} variant="happy" fill="#FBEA9E" />
        </View>
        <Text style={[s.metricLabel, { color: ink3 }]}>MOOD</Text>
        <ChevronRight size={12} color={ink3} strokeWidth={2} style={{ marginLeft: 'auto' }} />
      </View>
      {hasMoods ? (
        <>
          <View style={s.moodBars}>
            {moods.map((m) => {
              const count = moodCounts[m] || 0
              const height = Math.max((count / maxCount) * 50, 3)
              return (
                <View key={m} style={s.moodBarCol}>
                  <View style={[s.moodBar, { height, backgroundColor: MOOD_COLORS[m] || ink3, borderRadius: 4 }]} />
                </View>
              )
            })}
          </View>
          <Text style={[s.metricValue, { color: ink }]}>Mostly {dominantLabel}</Text>
          <Text style={[s.metricSmall, { color: ink3 }]}>Tap for details</Text>
        </>
      ) : (
        <>
          <View style={s.metricEmpty}>
            <MoodFace size={28} variant="okay" fill="#F5EDDC" />
          </View>
          <Text style={[s.metricValue, { color: ink }]}>No moods yet</Text>
          <Text style={[s.metricSmall, { color: ink3 }]}>Log a mood</Text>
        </>
      )}
    </View>
  )
}

// ─── Nutrition Card (adapts by feeding stage) ───────────────────────────────

function NutritionCard({ stage, caloriesTotal, caloriesTarget, feedingCount, feedingTarget, feedingMl, feedingBreast, feedingBottle, avgMl, meals }: {
  stage: FeedingStage
  caloriesTotal: number; caloriesTarget: number
  feedingCount: number; feedingTarget: number; feedingMl: number
  feedingBreast: number; feedingBottle: number; avgMl: number; meals: number
}) {
  const { colors, isDark } = useTheme()
  const ringSize = 60
  const ringR = 24
  const ringCircumference = 2 * Math.PI * ringR

  const isLiquid = stage === 'liquid' || stage === 'mixed'
  const current = isLiquid ? feedingCount : caloriesTotal
  const target = isLiquid ? feedingTarget : caloriesTarget
  const pct = target > 0 ? Math.min(current / target, 1) : 0
  const ringOffset = ringCircumference * (1 - pct)

  const Icon = isLiquid ? Droplets : Utensils
  const label = stage === 'liquid' ? 'FEEDINGS' : stage === 'mixed' ? 'NUTRITION' : 'CALORIES'

  // Pastel-soft pink tile
  const tileBg = isDark ? 'rgba(242,178,199,0.14)' : '#F9D8E2'
  const tileBorder = isDark ? 'rgba(242,178,199,0.28)' : 'rgba(20,19,19,0.08)'
  const coral = '#EE7B6D'
  const ink = isDark ? colors.text : '#141313'
  const ink3 = isDark ? colors.textMuted : '#6E6763'

  return (
    <View style={[s.metricCard, { backgroundColor: tileBg, borderColor: tileBorder }]}>
      <View style={s.metricHeader}>
        <Icon size={14} color={coral} strokeWidth={2} />
        <Text style={[s.metricLabel, { color: ink3 }]}>{label}</Text>
        <ChevronRight size={12} color={ink3} strokeWidth={2} style={{ marginLeft: 'auto' }} />
      </View>
      <View style={s.calorieRingWrap}>
        <Svg width={ringSize} height={ringSize}>
          <SvgCircle cx={ringSize / 2} cy={ringSize / 2} r={ringR} fill="none" stroke="rgba(238,123,109,0.18)" strokeWidth={5} />
          <SvgCircle cx={ringSize / 2} cy={ringSize / 2} r={ringR} fill="none" stroke={coral} strokeWidth={5}
            strokeDasharray={`${ringCircumference}`} strokeDashoffset={ringOffset}
            strokeLinecap="round" rotation="-90" origin={`${ringSize / 2}, ${ringSize / 2}`}
          />
        </Svg>
        <Text style={[s.calorieNumber, { color: ink }]}>
          {isLiquid ? (feedingCount > 0 ? `${feedingCount}` : '—') : (caloriesTotal > 0 ? caloriesTotal.toLocaleString() : '—')}
        </Text>
      </View>
      {isLiquid ? (
        <>
          <Text style={[s.metricValue, { color: coral }]}>
            {feedingCount > 0 ? `${feedingBreast} breast · ${feedingBottle} bottle` : 'No feeds yet'}
          </Text>
          <Text style={[s.metricSmall, { color: ink3 }]}>
            {feedingMl > 0 ? `${feedingMl}ml total · ${avgMl}ml avg` : 'Tap for details'}
          </Text>
        </>
      ) : (
        <>
          <Text style={[s.metricValue, { color: coral }]}>
            {caloriesTotal > 0 ? `${Math.round(pct * 100)}% of daily` : `${meals} meals`}
          </Text>
          <Text style={[s.metricSmall, { color: ink3 }]}>
            {feedingCount > 0 ? `+ ${feedingCount} bottles (${feedingMl}ml)` : 'Tap for breakdown'}
          </Text>
        </>
      )}
    </View>
  )
}

// ─── Health Card ────────────────────────────────────────────────────────────

function HealthCard({ reminders, healthHistory, child }: {
  reminders: Reminder[]
  healthHistory: HealthHistoryData
  child: ChildWithRole
}) {
  const { colors, isDark } = useTheme()
  const activeReminders = reminders.filter(r => !r.done).length
  const lastVaccine = healthHistory.vaccines[0]
  const { weight, height } = parseGrowthValue(healthHistory.growth)
  const growthSummary = [weight, height].filter(Boolean).join(' · ') || null
  const upcomingCount = getNextDueVaccines(child.birthDate ?? '', healthHistory.vaccines, child.countryCode ?? 'US').length
  const overdueCount = getNextDueVaccines(child.birthDate ?? '', healthHistory.vaccines, child.countryCode ?? 'US').filter(v => v.overdue).length

  const tileBg = isDark ? colors.surface : '#FFFEF8'
  const tileBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const green = '#BDD48C'
  const ink = isDark ? colors.text : '#141313'
  const ink3 = isDark ? colors.textMuted : '#6E6763'

  const nextVaccines = getNextDueVaccines(child.birthDate ?? '', healthHistory.vaccines, child.countryCode ?? 'US')
  const nextVaccine = nextVaccines[0]

  const statusBg = overdueCount > 0
    ? (isDark ? brand.error + '22' : brand.error + '15')
    : upcomingCount > 0
      ? (isDark ? '#3A2E00' : '#FFFAE0')
      : (isDark ? '#1A2810' : '#EEF7E4')
  const statusColor = overdueCount > 0 ? brand.error : upcomingCount > 0 ? (isDark ? '#F5D652' : '#6B5800') : (isDark ? '#BDD48C' : '#3A6020')
  const statusLabel = overdueCount > 0 ? `${overdueCount} overdue` : upcomingCount > 0 ? `${upcomingCount} due soon` : 'Up to date'

  return (
    <View style={[s.hcCard, { backgroundColor: tileBg, borderColor: tileBorder }]}>
      {/* Icon */}
      <View style={[s.hcIconWrap, { backgroundColor: isDark ? '#1A2810' : '#EEF7E4' }]}>
        <CrossSticker size={30} fill={green + 'BB'} stroke={green} />
      </View>

      {/* Content */}
      <View style={{ flex: 1, gap: 4 }}>
        {nextVaccine ? (
          <>
            <Text style={[s.hcEyebrow, { color: ink3 }]}>
              {overdueCount > 0 ? 'Overdue vaccine' : 'Next vaccine'}
            </Text>
            <Text style={[s.hcPrimary, { color: ink }]} numberOfLines={1}>
              {nextVaccine.name}{nextVaccine.doseLabel ? ` · ${nextVaccine.doseLabel}` : ''}
            </Text>
            <Text style={[s.hcSecondary, { color: overdueCount > 0 ? brand.error : ink3 }]}>
              {overdueCount > 0 ? 'Overdue · ' : 'Due: '}{nextVaccine.dueAge}
            </Text>
          </>
        ) : lastVaccine ? (
          <>
            <Text style={[s.hcEyebrow, { color: ink3 }]}>Last vaccine</Text>
            <Text style={[s.hcPrimary, { color: ink }]} numberOfLines={1}>
              {lastVaccine.value.split(/[,(]/)[0].trim()}
            </Text>
          </>
        ) : (
          <Text style={[s.hcPrimary, { color: ink3 }]}>No vaccines logged yet</Text>
        )}

        <View style={s.hcDetailRow}>
          {growthSummary && (
            <View style={s.hcDetailItem}>
              <TrendingUp size={12} color="#9DC3E8" strokeWidth={2} />
              <Text style={[s.hcDetail, { color: ink3 }]}>{growthSummary}</Text>
            </View>
          )}
          {activeReminders > 0 && (
            <View style={s.hcDetailItem}>
              <Bell size={12} color="#F5D652" strokeWidth={2} />
              <Text style={[s.hcDetail, { color: ink3 }]}>
                {activeReminders} reminder{activeReminders !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Status + chevron */}
      <View style={{ alignItems: 'flex-end', gap: 8 }}>
        <View style={[s.healthStatusPill, { backgroundColor: statusBg }]}>
          <Text style={[s.healthStatusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
        <ChevronRight size={14} color={ink3} strokeWidth={2} />
      </View>
    </View>
  )
}

// ─── Diaper Card (full-width, tappable) ────────────────────────────────────

const DIAPER_COLORS = { pee: '#9DC3E8', poop: '#F5B896', mixed: '#F5D652' } as const

function DiaperCard({ count, pee, poop, mixed, diaperByDay, startDate, endDate }: {
  count: number; pee: number; poop: number; mixed: number
  diaperByDay: Record<string, { pee: number; poop: number; mixed: number }>
  startDate: string; endDate: string
}) {
  const { colors, radius, isDark } = useTheme()
  const total = pee + poop + mixed
  const peeW  = total > 0 ? (pee  / total) * 100 : 0
  const poopW = total > 0 ? (poop / total) * 100 : 0
  const mixedW = total > 0 ? (mixed / total) * 100 : 0

  // Build last 7 (or range) day bars for mini sparkline
  const start = new Date(startDate + 'T00:00:00')
  const end   = new Date(endDate   + 'T00:00:00')
  const totalDays = Math.min(Math.round((end.getTime() - start.getTime()) / 86400000) + 1, 7)
  const sparkDays = Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(end)
    d.setDate(d.getDate() - (totalDays - 1 - i))
    return localDateStr(d)
  })
  const sparkMax = Math.max(...sparkDays.map(d => {
    const b = diaperByDay[d]
    return b ? b.pee + b.poop + b.mixed : 0
  }), 1)

  const stickerInk = isDark ? 'rgba(255,255,255,0.18)' : '#141313'
  const ink = isDark ? colors.text : '#141313'
  const ink3 = isDark ? colors.textMuted : 'rgba(20,19,19,0.5)'

  return (
    <View style={[s.diaperFullCard, {
      backgroundColor: isDark ? colors.surface : '#FFFEF8',
      borderColor: isDark ? colors.border : 'rgba(20,19,19,0.12)',
      borderWidth: 1.5,
      shadowColor: '#141313',
      shadowOpacity: isDark ? 0 : 0.05,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
    }]}>
      {/* Header */}
      <View style={s.diaperCardHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{
            width: 22, height: 22, borderRadius: 11,
            backgroundColor: DIAPER_COLORS.pee,
            borderWidth: 1, borderColor: stickerInk,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Baby size={11} color={isDark ? '#FFFFFF' : '#141313'} strokeWidth={2.5} />
          </View>
          <Text style={[s.diaperCardTitle, { color: ink3 }]}>DIAPERS</Text>
        </View>
        <ChevronRight size={14} color={ink3} strokeWidth={2} />
      </View>

      {/* Main row: big number + type chips */}
      <View style={s.diaperMainRow}>
        <Text style={[s.diaperBigCount, { color: ink }]}>{count}</Text>
        <View style={s.diaperChips}>
          {[
            { label: 'Pee', count: pee, color: DIAPER_COLORS.pee, emoji: '💧' },
            { label: 'Poop', count: poop, color: DIAPER_COLORS.poop, emoji: '💩' },
            { label: 'Mixed', count: mixed, color: DIAPER_COLORS.mixed, emoji: '🔄' },
          ].map(({ label, count: c, color, emoji }) => {
            const ChipSticker = stickerForEmoji(emoji)
            return (
              <View key={label} style={[s.diaperChip, {
                backgroundColor: isDark ? color + '14' : color + '26',
                borderColor: isDark ? color + '50' : stickerInk,
                borderWidth: 1.5,
              }]}>
                <View style={{
                  width: 22, height: 22, borderRadius: 11,
                  backgroundColor: isDark ? 'transparent' : '#FFFEF8',
                  borderWidth: isDark ? 0 : 1, borderColor: stickerInk,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <ChipSticker size={14} />
                </View>
                <Text style={[s.diaperChipLabel, { color: isDark ? color : '#141313' }]}>{label}</Text>
                <Text style={[s.diaperChipCount, { color: isDark ? color : '#141313' }]}>{c}</Text>
              </View>
            )
          })}
        </View>
      </View>

      {/* Proportion bar */}
      <View style={[s.diaperBar, {
        borderRadius: 999, marginTop: 12, height: 10,
        borderWidth: 1.5, borderColor: stickerInk,
        backgroundColor: isDark ? colors.surfaceGlass : 'rgba(20,19,19,0.04)',
        overflow: 'hidden',
      }]}>
        {peeW  > 0 && <View style={{ width: `${peeW}%`  as any, height: '100%', backgroundColor: DIAPER_COLORS.pee }} />}
        {poopW > 0 && <View style={{ width: `${poopW}%` as any, height: '100%', backgroundColor: DIAPER_COLORS.poop }} />}
        {mixedW > 0 && <View style={{ width: `${mixedW}%` as any, height: '100%', backgroundColor: DIAPER_COLORS.mixed }} />}
      </View>

      {/* Daily sparkline */}
      <View style={s.diaperSparkRow}>
        {sparkDays.map((d) => {
          const b = diaperByDay[d] ?? { pee: 0, poop: 0, mixed: 0 }
          const dayTotal = b.pee + b.poop + b.mixed
          const barH = dayTotal > 0 ? Math.max((dayTotal / sparkMax) * 32, 4) : 2
          const isToday = d === localDateStr(new Date())
          return (
            <View key={d} style={s.diaperSparkCol}>
              <View style={{ height: 32, justifyContent: 'flex-end' }}>
                <View style={{
                  width: 8, height: barH, borderRadius: 4,
                  backgroundColor: dayTotal > 0
                    ? (isToday ? DIAPER_COLORS.pee : DIAPER_COLORS.pee + 'CC')
                    : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(20,19,19,0.08)'),
                  borderWidth: dayTotal > 0 && !isDark ? 1 : 0,
                  borderColor: stickerInk,
                }} />
              </View>
              <Text style={[s.diaperSparkLabel, { color: isToday ? ink : ink3 }]}>
                {new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'narrow' })}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

// ─── Diaper Detail Modal ────────────────────────────────────────────────────

const DIAPER_COLOR_META: Record<string, { label: string; swatch: string }> = {
  yellow:  { label: 'Yellow',  swatch: '#FBBF24' },
  green:   { label: 'Green',   swatch: '#4ADE80' },
  brown:   { label: 'Brown',   swatch: '#A16207' },
  black:   { label: 'Black',   swatch: '#6B7280' },
  red:     { label: 'Red',     swatch: '#EF4444' },
  orange:  { label: 'Orange',  swatch: '#F97316' },
}

function DiaperDetailModal({ visible, onClose, count, pee, poop, mixed, diaperByDay, diaperColors, dateRange, startDate, endDate, childName, childColor }: {
  visible: boolean; onClose: () => void
  count: number; pee: number; poop: number; mixed: number
  diaperByDay: Record<string, { pee: number; poop: number; mixed: number }>
  diaperColors: Record<string, number>
  dateRange: DateRange; startDate: string; endDate: string
  childName?: string; childColor?: string
}) {
  const { colors, radius } = useTheme()
  const total = pee + poop + mixed

  // Build date buckets (same logic as MoodDetailModal)
  const chartDays = useMemo(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const start = new Date(startDate + 'T00:00:00')
    const end   = new Date(endDate   + 'T00:00:00')
    const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1

    if (totalDays <= 7) {
      return Array.from({ length: totalDays }, (_, i) => {
        const d = new Date(start)
        d.setDate(d.getDate() + i)
        const iso = localDateStr(d)
        return { label: dayNames[d.getDay()], dates: [iso] }
      })
    }
    // Weekly buckets
    const weeks: { label: string; dates: string[] }[] = []
    let wNum = 1
    let cursor = new Date(start)
    while (cursor <= end) {
      const bucket: string[] = []
      for (let d = 0; d < 7; d++) {
        if (cursor > end) break
        bucket.push(localDateStr(cursor))
        cursor.setDate(cursor.getDate() + 1)
      }
      weeks.push({ label: `W${wNum}`, dates: bucket })
      wNum++
    }
    return weeks
  }, [startDate, endDate])

  // Per-bucket totals
  const buckets = chartDays.map((b) => {
    let bPee = 0, bPoop = 0, bMixed = 0
    for (const d of b.dates) {
      const day = diaperByDay[d]
      if (day) { bPee += day.pee; bPoop += day.poop; bMixed += day.mixed }
    }
    return { label: b.label, pee: bPee, poop: bPoop, mixed: bMixed, total: bPee + bPoop + bMixed }
  })
  const bucketMax = Math.max(...buckets.map((b) => b.total), 1)

  const rangeLabel = dateRange === 'today' ? 'Today' : dateRange === 'yesterday' ? 'Yesterday' : dateRange === '7days' ? 'Past 7 Days' : dateRange === '30days' ? 'Past 30 Days' : `${startDate} – ${endDate}`
  const avgPerDay = (() => {
    const start = new Date(startDate + 'T00:00:00')
    const end   = new Date(endDate   + 'T00:00:00')
    const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
    return (count / days).toFixed(1)
  })()

  const colorEntries = Object.entries(diaperColors).sort((a, b) => b[1] - a[1])
  const poopTotal = poop + mixed

  const BAR_H = 100
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.modalOverlay}>
        <View style={[s.modalContent, { backgroundColor: colors.bg, borderRadius: radius.xl }]}>
          {/* Header */}
          <View style={s.modalHeader}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[s.modalTitle, { color: colors.text }]}>Diaper Tracker</Text>
              {childName && childColor && (
                <View style={{ backgroundColor: childColor + '25', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: childColor + '60' }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: childColor }}>{childName}</Text>
                </View>
              )}
            </View>
            <Pressable onPress={onClose} style={[s.modalClose, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
              <X size={18} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
          </View>
          <Text style={[s.modalSubtitle, { color: colors.textMuted }]}>
            {rangeLabel} — {count} diaper{count !== 1 ? 's' : ''} · avg {avgPerDay}/day
          </Text>

          {/* Type sticker cards — pastel fill, ink border, icon-in-circle on top */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            {[
              { label: 'Pee', count: pee, fill: StickerPalette.blueSoft, accent: StickerPalette.blue, Icon: Droplets, rotation: -3 },
              { label: 'Poop', count: poop, fill: StickerPalette.peachSoft, accent: StickerPalette.peach, Icon: BurstSticker as any, rotation: 2, isSticker: true, stickerFill: StickerPalette.peach },
              { label: 'Mixed', count: mixed, fill: StickerPalette.yellowSoft, accent: StickerPalette.yellow, Icon: Sparkles, rotation: -2 },
            ].map(({ label, count: c, fill, accent, Icon, rotation, isSticker, stickerFill }) => (
              <View
                key={label}
                style={{
                  flex: 1,
                  backgroundColor: fill,
                  borderRadius: 22,
                  borderWidth: 1.5,
                  borderColor: DIAPER_STICKER_INK,
                  paddingVertical: 14,
                  paddingHorizontal: 8,
                  alignItems: 'center',
                  shadowColor: DIAPER_STICKER_INK,
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.12,
                  shadowRadius: 6,
                  elevation: 3,
                  transform: [{ rotate: `${rotation}deg` }],
                }}
              >
                {/* Icon sticker disc */}
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: accent,
                    borderWidth: 1.5,
                    borderColor: DIAPER_STICKER_INK,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 8,
                  }}
                >
                  {isSticker
                    ? <BurstSticker size={22} fill={stickerFill ?? accent} />
                    : <Icon size={18} color={DIAPER_STICKER_INK} strokeWidth={2.2} />}
                </View>
                <Text style={{ color: DIAPER_STICKER_INK, fontSize: 22, fontFamily: 'Fraunces_700Bold', letterSpacing: -0.4 }}>{c}</Text>
                <Text style={{ color: DIAPER_STICKER_INK, fontSize: 10, fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>{label}</Text>
                <Text style={{ color: '#6E6763', fontSize: 11, fontFamily: 'InstrumentSerif_400Regular_Italic', fontStyle: 'italic', marginTop: 2 }}>
                  {total > 0 ? Math.round((c / total) * 100) : 0}%
                </Text>
              </View>
            ))}
          </View>

          {/* Proportion bar — ink-bordered sticker */}
          {total > 0 && (
            <View
              style={{
                height: 14,
                marginTop: 16,
                borderRadius: 7,
                borderWidth: 1.5,
                borderColor: DIAPER_STICKER_INK,
                overflow: 'hidden',
                flexDirection: 'row',
                backgroundColor: StickerPalette.cream,
              }}
            >
              {pee > 0   && <View style={{ width: `${(pee   / total) * 100}%` as any, backgroundColor: DIAPER_COLORS.pee }} />}
              {poop > 0  && <View style={{ width: `${(poop  / total) * 100}%` as any, backgroundColor: DIAPER_COLORS.poop }} />}
              {mixed > 0 && <View style={{ width: `${(mixed / total) * 100}%` as any, backgroundColor: DIAPER_COLORS.mixed }} />}
            </View>
          )}

          {/* Daily / weekly stacked bar chart — sticker bars */}
          <View style={{ marginTop: 22 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: 'DMSans_700Bold', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>Trend</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 4 }}>
              {buckets.map((b, i) => {
                const h = b.total > 0 ? Math.max((b.total / bucketMax) * BAR_H, 8) : 6
                const peeH   = b.total > 0 ? Math.round((b.pee   / b.total) * h) : 0
                const poopH  = b.total > 0 ? Math.round((b.poop  / b.total) * h) : 0
                const mixedH = Math.max(h - peeH - poopH, 0)
                const tilt = (i % 2 === 0 ? -1 : 1) * 1.5
                return (
                  <View key={i} style={{ flex: 1 }}>
                    <View style={{ height: BAR_H, flexDirection: 'column', justifyContent: 'flex-end' }}>
                      <View
                        style={{
                          height: h,
                          borderRadius: 8,
                          overflow: 'hidden',
                          borderWidth: b.total > 0 ? 1.5 : 1,
                          borderColor: b.total > 0 ? DIAPER_STICKER_INK : 'rgba(20,19,19,0.18)',
                          backgroundColor: b.total > 0 ? 'transparent' : StickerPalette.cream,
                          shadowColor: DIAPER_STICKER_INK,
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: b.total > 0 ? 0.14 : 0,
                          shadowRadius: 4,
                          elevation: b.total > 0 ? 2 : 0,
                          transform: [{ rotate: `${tilt}deg` }],
                        }}
                      >
                        {b.total > 0 && (
                          <>
                            {mixedH > 0 && <View style={{ height: mixedH, backgroundColor: DIAPER_COLORS.mixed }} />}
                            {poopH  > 0 && <View style={{ height: poopH,  backgroundColor: DIAPER_COLORS.poop }} />}
                            {peeH   > 0 && <View style={{ height: peeH,   backgroundColor: DIAPER_COLORS.pee }} />}
                          </>
                        )}
                      </View>
                    </View>
                    <Text style={{ color: colors.textMuted, fontSize: 10, fontFamily: 'InstrumentSerif_400Regular_Italic', fontStyle: 'italic', textAlign: 'center', marginTop: 6 }}>{b.label}</Text>
                  </View>
                )
              })}
            </View>
          </View>

          {/* Stool color — sticker-style swatch chips */}
          {colorEntries.length > 0 && (
            <View style={{ marginTop: 22 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: 'DMSans_700Bold', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Stool Color {poopTotal > 0 ? `· ${poopTotal} logged` : ''}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {colorEntries.map(([color, cnt]) => {
                  const meta = DIAPER_COLOR_META[color] ?? { label: color.charAt(0).toUpperCase() + color.slice(1), swatch: '#888' }
                  return (
                    <View
                      key={color}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: StickerPalette.paper,
                        borderRadius: 999,
                        borderWidth: 1.5,
                        borderColor: DIAPER_STICKER_INK,
                        paddingHorizontal: 12,
                        paddingVertical: 5,
                        shadowColor: DIAPER_STICKER_INK,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 3,
                        elevation: 1,
                      }}
                    >
                      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: meta.swatch, borderWidth: 1, borderColor: DIAPER_STICKER_INK }} />
                      <Text style={{ color: DIAPER_STICKER_INK, fontSize: 12, fontFamily: 'DMSans_600SemiBold' }}>{meta.label}</Text>
                      <Text style={{ color: '#6E6763', fontSize: 11, fontFamily: 'Fraunces_700Bold' }}>{cnt}</Text>
                    </View>
                  )
                })}
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  )
}

// ─── Mood Detail Modal ──────────────────────────────────────────────────────

function MoodDetailModal({ visible, onClose, moodCounts, dominantMood, dateRange, startDate, endDate, childName, childColor }: {
  visible: boolean; onClose: () => void
  moodCounts: Record<string, number>; dominantMood: string
  dateRange: DateRange
  startDate: string; endDate: string
  childName?: string; childColor?: string
}) {
  const { colors, radius } = useTheme()
  const moods = ['happy', 'calm', 'energetic', 'fussy', 'cranky']
  const totalMoods = Object.values(moodCounts).reduce((a, b) => a + b, 0)

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.modalOverlay}>
        <View style={[s.modalContent, { backgroundColor: colors.bg, borderRadius: radius.xl }]}>
          <View style={s.modalHeader}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[s.modalTitle, { color: colors.text }]}>Mood Trends</Text>
              {childName && childColor && (
                <View style={{ backgroundColor: childColor + '25', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: childColor + '60' }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: childColor }}>{childName}</Text>
                </View>
              )}
            </View>
            <Pressable onPress={onClose} style={[s.modalClose, { backgroundColor: colors.surfaceGlass }]}>
              <X size={18} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
          </View>
          <Text style={[s.modalSubtitle, { color: colors.textMuted }]}>
            {dateRange === 'today' ? 'Today' : dateRange === 'yesterday' ? 'Yesterday' : dateRange === '7days' ? 'Past 7 Days' : dateRange === '30days' ? 'Past 30 Days' : `${startDate} – ${endDate}`} — {totalMoods} mood{totalMoods !== 1 ? 's' : ''} logged
          </Text>

          {totalMoods > 0 ? (
            <>
              {/* Mood count chips */}
              <View style={[s.moodChipsRow, { marginTop: 14 }]}>
                {moods.filter(m => (moodCounts[m] || 0) > 0).map((m) => {
                  const count = moodCounts[m] || 0
                  const color = MOOD_COLORS[m]
                  return (
                    <View
                      key={m}
                      style={[s.moodChip, {
                        backgroundColor: color + '18',
                        borderColor: color + '60',
                        borderRadius: radius.full,
                      }]}
                    >
                      <MoodFace size={16} variant={moodFaceVariant(m)} fill={moodFaceFill(m)} />
                      <Text style={[s.moodChipLabel, { color }]}>{MOOD_LABELS[m]}</Text>
                      <Text style={[s.moodChipCount, { color }]}>{count}</Text>
                    </View>
                  )
                })}
              </View>

              {/* Mood bubble cluster */}
              <MoodBubbleCluster
                items={(Object.entries(moodCounts) as [string, number][])
                  .filter(([, c]) => c > 0)
                  .map(([mood, count]): MoodBubbleItem => ({ mood, count }))}
              />

              {/* Summary */}
              <View style={[s.modalSummary, {
                backgroundColor: (MOOD_COLORS[dominantMood] || brand.accent) + '12',
                borderRadius: radius.md,
                marginTop: 16,
              }]}>
                <MoodFace size={22} variant={moodFaceVariant(dominantMood)} fill={moodFaceFill(dominantMood)} />
                <Text style={[s.modalSummaryText, { color: colors.text }]}>
                  Mostly{' '}
                  <Text style={{ color: MOOD_COLORS[dominantMood] || brand.accent, fontWeight: '800' }}>
                    {MOOD_LABELS[dominantMood] || '—'}
                  </Text>{' '}
                  this period
                </Text>
              </View>
            </>
          ) : (
            <View style={s.modalEmpty}>
              <MoodFace size={44} variant="okay" fill="#F5EDDC" />
              <Text style={[s.modalEmptyText, { color: colors.textSecondary }]}>No moods logged yet</Text>
              <Text style={[s.modalEmptyHint, { color: colors.textMuted }]}>Log moods to see trends over time</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  )
}

// ─── Health Detail Modal ────────────────────────────────────────────────────

// Activity pillars — every logged activity maps to exactly one of these groups.
// No "Other" bucket by design: the pattern list is broad enough to catch anything,
// and `care` is the last-resort default for generic daily entries.
type ActivityPillarId = 'movement' | 'creative' | 'learning' | 'social' | 'care' | 'therapy'

const ACTIVITY_PILLARS: Record<ActivityPillarId, { label: string; color: string; types: string[]; patterns: RegExp[] }> = {
  movement: {
    label: 'Movement',
    color: '#BDD48C', // sticker green
    types: ['sport', 'swim', 'walk', 'playground', 'dance'],
    patterns: [
      /\b(soccer|football|basketball|tennis|baseball|karate|judo|gym|workout|run(ning)?|ski|cycling|bike|biking|skating|scooter)\b/,
      /\b(swim(ming)?|pool)\b/,
      /\b(walk|stroll(er)?|hike|hiking|outdoor)\b/,
      /\b(playground|park|slide|climb(ing)?)\b/,
      /\b(dance|ballet|tap|zumba)\b/,
      /\btummy\s?time\b/,
    ],
  },
  creative: {
    label: 'Creative',
    color: '#F5D652', // sticker yellow
    types: ['art', 'music'],
    patterns: [
      /\b(art|paint(ing)?|craft(s)?|draw(ing)?|clay|pottery|color(ing)?)\b/,
      /\b(music|piano|guitar|violin|drum|singing|choir|sing\s?along)\b/,
    ],
  },
  learning: {
    label: 'Learning',
    color: '#7A9BD0', // deep blue
    types: ['class', 'school', 'study', 'reading'],
    patterns: [
      /\b(school|kindergarten|preschool|daycare|nursery)\b/,
      /\b(homework|study|tutor(ing)?|lesson|class)\b/,
      /\b(reading|book|story\s?time)\b/,
    ],
  },
  social: {
    label: 'Social',
    color: '#E58BB4', // rose
    types: ['playdate'],
    patterns: [
      /\bplaydate\b/,
      /\b(party|playgroup|visit|friends|meetup|family\s?time|grandma|grandpa|cousin)\b/,
    ],
  },
  care: {
    label: 'Care',
    color: '#F5B896', // peach
    types: [],
    patterns: [
      /\bbath(\s?time)?\b/,
      /\bskin\s?to\s?skin\b/,
      /\bmassage\b/,
      /\bdiaper\b/,
      /\bnap\b/,
      /\b(cuddle|hug|rocking|lullaby)\b/,
    ],
  },
  therapy: {
    label: 'Therapy',
    color: '#B7A6E8', // lavender
    types: ['therapy'],
    patterns: [
      /\b(therapy|speech|occupational|physio|physical\s?therapy)\b/,
      /\b(checkup|doctor|pediatrician|dentist)\b/,
      /\b(ot|pt)\b/,
    ],
  },
}

// Backwards-compat meta lookup: modal code still does `ACTIVITY_TYPE_META[key]`.
// Bucket keys are now pillar ids.
const ACTIVITY_TYPE_META: Record<string, { label: string; color: string }> = Object.fromEntries(
  Object.entries(ACTIVITY_PILLARS).map(([id, p]) => [id, { label: p.label, color: p.color }])
)

function getActivityPillar(explicitType: string | undefined, name?: string): ActivityPillarId {
  // 1) Map from explicit activityType saved on the log.
  if (explicitType && explicitType !== 'other') {
    for (const [id, p] of Object.entries(ACTIVITY_PILLARS)) {
      if (p.types.includes(explicitType)) return id as ActivityPillarId
    }
  }
  // 2) Fall back to matching the free-text name against pillar keywords.
  const n = (name ?? '').toLowerCase().trim()
  if (n) {
    for (const [id, p] of Object.entries(ACTIVITY_PILLARS)) {
      if (p.patterns.some((rx) => rx.test(n))) return id as ActivityPillarId
    }
  }
  // 3) Last-resort default — generic parenting entries land in Care.
  return 'care'
}

function ActivityBreakdownModal({ visible, onClose, breakdown, total, colors, radius }: {
  visible: boolean; onClose: () => void
  breakdown: Record<string, number>; total: number
  colors: ReturnType<typeof useTheme>['colors']
  radius: ReturnType<typeof useTheme>['radius']
}) {
  const entries = Object.entries(breakdown)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', paddingHorizontal: 20 }} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: 20, gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 }}>Activity Breakdown</Text>
            <Pressable onPress={onClose} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} color={colors.textMuted} strokeWidth={2.5} />
            </Pressable>
          </View>
          {entries.length === 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>No activities logged in this period</Text>
          ) : entries.map(([type, count]) => {
            const meta = ACTIVITY_TYPE_META[type] ?? { label: type, color: colors.primary }
            const pct = total > 0 ? Math.round((count / total) * 100) : 0
            return (
              <View key={type}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: meta.color }} />
                  <Text style={{ flex: 1, color: colors.textSecondary, fontSize: 14, fontWeight: '600' }}>{meta.label}</Text>
                  <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>{count.toLocaleString()}</Text>
                  <Text style={{ color: meta.color, fontSize: 12, fontWeight: '700', minWidth: 38, textAlign: 'right' }}>{pct}%</Text>
                </View>
                <View style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <View style={{ width: `${pct}%`, height: 4, borderRadius: 2, backgroundColor: meta.color }} />
                </View>
              </View>
            )
          })}
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
            {total.toLocaleString()} total logged actions
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function VaccineInfoModal({ visible, onClose, vaccineName, doseLabel, info, accent }: {
  visible: boolean; onClose: () => void
  vaccineName: string; doseLabel: string
  info: VaccineInfo | null
  accent: string
}) {
  const { colors, isDark } = useTheme()
  const ink = colors.text
  const ink3 = colors.textMuted
  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = colors.border
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable style={s.modalOverlay} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[s.modalContent, { backgroundColor: colors.bg, maxHeight: '70%' }]}
        >
          {/* Drag handle */}
          <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 6 }}>
            <View style={{ width: 42, height: 4, borderRadius: 2, backgroundColor: paperBorder }} />
          </View>

          {/* Header */}
          <View style={[s.modalHeader, { gap: 10, alignItems: 'flex-start' }]}>
            <View style={{
              width: 56, height: 56, borderRadius: 18,
              backgroundColor: accent, borderWidth: 2, borderColor: '#141313',
              alignItems: 'center', justifyContent: 'center',
              shadowColor: '#141313', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 0,
              elevation: 4,
            }}>
              <CrossSticker size={32} fill="#FFFEF8" stroke="#141313" />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: ink, fontSize: 22, fontFamily: 'Fraunces_600SemiBold', letterSpacing: -0.4 }}>
                {vaccineName}
              </Text>
              {!!doseLabel && (
                <Text style={{ color: ink3, fontSize: 12, fontFamily: 'DMSans_500Medium', textTransform: 'uppercase', letterSpacing: 1.2 }}>
                  {doseLabel}
                </Text>
              )}
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <View style={[s.modalClose, { backgroundColor: paper, borderWidth: 1, borderColor: paperBorder }]}>
                <X size={16} color={ink} strokeWidth={2} />
              </View>
            </Pressable>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 24, paddingTop: 8, gap: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {info ? (
              <>
                <View>
                  <Text style={{ color: ink3, fontSize: 11, fontFamily: 'DMSans_600SemiBold', textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 6 }}>
                    What it protects against
                  </Text>
                  <Text style={{ color: ink, fontSize: 15, fontFamily: 'DMSans_500Medium', lineHeight: 22 }}>
                    {info.protects}
                  </Text>
                </View>
                <View>
                  <Text style={{ color: ink3, fontSize: 11, fontFamily: 'DMSans_600SemiBold', textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 6 }}>
                    Why it matters
                  </Text>
                  <Text style={{ color: ink, fontSize: 14, fontFamily: 'DMSans_400Regular', lineHeight: 22 }}>
                    {info.why}
                  </Text>
                </View>
                {info.sideEffects && (
                  <View style={{ backgroundColor: paper, borderWidth: 1, borderColor: paperBorder, borderRadius: 18, padding: 14, gap: 4 }}>
                    <Text style={{ color: ink3, fontSize: 11, fontFamily: 'DMSans_600SemiBold', textTransform: 'uppercase', letterSpacing: 1.4 }}>
                      Common side effects
                    </Text>
                    <Text style={{ color: ink, fontSize: 13, fontFamily: 'DMSans_400Regular', lineHeight: 20 }}>
                      {info.sideEffects}
                    </Text>
                  </View>
                )}
                <Text style={{ color: ink3, fontSize: 11, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', textAlign: 'center', marginTop: 8 }}>
                  Always check with your pediatrician for advice tailored to your child.
                </Text>
              </>
            ) : (
              <Text style={{ color: ink3, fontSize: 14, fontFamily: 'DMSans_400Regular', lineHeight: 22 }}>
                We don't have detailed info for this vaccine yet. Please ask your pediatrician about its purpose and timing.
              </Text>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function VaccineScheduleTree({ child, healthHistory, scheduledVaccines, onSetVaccineDate, onMarkVaccineGiven }: {
  child: ChildWithRole
  healthHistory: HealthHistoryData
  scheduledVaccines: Record<string, string>
  onSetVaccineDate: (key: string, date: string | null) => void
  onMarkVaccineGiven: (name: string, date: string, key: string) => Promise<void>
}) {
  const { colors, isDark } = useTheme()
  const milestones = useMemo(
    () => buildVaccineScheduleTree(child.birthDate ?? '', healthHistory.vaccines, child.countryCode ?? 'US'),
    [child.birthDate, healthHistory.vaccines, child.countryCode],
  )

  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(() => {
    const set = new Set<string>()
    for (const m of milestones) {
      if (m.milestoneStatus === 'partial') set.add(m.key)
    }
    return set
  })
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [pickerDate, setPickerDate] = useState(new Date())
  const [infoVaccine, setInfoVaccine] = useState<{ name: string; doseLabel: string; info: VaccineInfo | null; accent: string } | null>(null)

  const ink = colors.text
  const ink3 = colors.textMuted

  // Sticker palette (cream-paper design system) — bright fills + ink borders for the sticker-on-paper feel
  const ST_INK = '#141313'
  const ST_GREEN = isDark ? '#C5DA98' : '#BDD48C'
  const ST_GREEN_SOFT = isDark ? '#283016' : '#DDE7BB'
  const ST_YELLOW = isDark ? '#F0CE4C' : '#F5D652'
  const ST_YELLOW_SOFT = isDark ? '#3A3116' : '#FBEA9E'
  const ST_PEACH = isDark ? '#F7C09D' : '#F5B896'
  const ST_PEACH_SOFT = isDark ? '#3A2618' : '#F9D6C0'
  const ST_CREAM = isDark ? colors.surface : '#F7F0DF'
  const ST_LINE = isDark ? 'rgba(245,237,220,0.20)' : 'rgba(20,19,19,0.20)'

  const DONE_BG = ST_GREEN
  const DONE_BORDER = ST_INK
  const DONE_INK = ST_INK
  const PARTIAL_BG = ST_YELLOW
  const PARTIAL_BORDER = ST_INK
  const PARTIAL_INK = ST_INK
  const OVERDUE_BG = ST_PEACH
  const OVERDUE_BORDER = ST_INK
  const FUTURE_BG = ST_CREAM
  const FUTURE_BORDER = ST_LINE

  function toggleMilestone(key: string) {
    setExpandedMilestones((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (milestones.length === 0) {
    return (
      <Text style={{ color: ink3, fontSize: 13, marginBottom: 8 }}>
        No vaccine schedule available
      </Text>
    )
  }

  return (
    <View>
      {milestones.map((milestone, idx) => {
        const isExpanded = expandedMilestones.has(milestone.key)
        const isLast = idx === milestones.length - 1

        const isDoneMilestone = milestone.milestoneStatus === 'done'
        const isPartialMilestone = milestone.milestoneStatus === 'partial'

        const nodeBg = isDoneMilestone ? DONE_BG : isPartialMilestone ? PARTIAL_BG : FUTURE_BG
        const nodeBorder = isDoneMilestone ? DONE_BORDER : isPartialMilestone ? PARTIAL_BORDER : FUTURE_BORDER
        const nodeAccent = isDoneMilestone ? ST_GREEN : isPartialMilestone ? ST_YELLOW : ST_PEACH

        const doneCount = milestone.vaccines.filter((v) => v.status === 'done').length
        const totalCount = milestone.vaccines.length
        const badgeText = isDoneMilestone
          ? `${doneCount}/${totalCount} done`
          : isPartialMilestone
          ? `${doneCount}/${totalCount} · due soon`
          : `${totalCount} ahead`

        return (
          <View key={milestone.key} style={{ marginBottom: 4 }}>
            {/* Age milestone row — sticker-on-paper */}
            <Pressable
              onPress={() => toggleMilestone(milestone.key)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}
            >
              {/* Squishy sticker age node */}
              <View style={{
                width: 52, height: 44, borderRadius: 14,
                backgroundColor: nodeBg, borderWidth: 1.5, borderColor: nodeBorder,
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                shadowColor: ST_INK, shadowOffset: { width: 0, height: 3 },
                shadowOpacity: isDoneMilestone || isPartialMilestone ? 1 : 0,
                shadowRadius: 0, elevation: isDoneMilestone || isPartialMilestone ? 3 : 0,
              }}>
                <Text style={{
                  fontSize: 11, fontFamily: 'Fraunces_600SemiBold',
                  color: isDoneMilestone || isPartialMilestone ? ST_INK : ink3,
                  textAlign: 'center', lineHeight: 13, letterSpacing: -0.2,
                }}>
                  {milestone.label.replace(/^Months$/i, 'mo').replace(/\bMonths\b/g, 'mo').replace(/\bYears\b/g, 'yr')}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontFamily: 'Fraunces_600SemiBold', color: ink, letterSpacing: -0.3 }}>
                  {milestone.label}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  {isDoneMilestone && <Check size={10} color={ST_INK} strokeWidth={3} />}
                  <Text style={{
                    fontSize: 11, fontFamily: 'DMSans_600SemiBold',
                    color: isDoneMilestone || isPartialMilestone ? ST_INK : ink3,
                    textTransform: 'uppercase', letterSpacing: 0.8,
                  }}>
                    {badgeText}
                  </Text>
                </View>
              </View>
              <View style={{
                width: 24, height: 24, borderRadius: 12,
                backgroundColor: isExpanded ? nodeAccent : 'transparent',
                borderWidth: 1.5, borderColor: isExpanded ? ST_INK : ST_LINE,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 10, color: isExpanded ? ST_INK : ink3, fontFamily: 'DMSans_700Bold' }}>
                  {isExpanded ? '−' : '+'}
                </Text>
              </View>
            </Pressable>

            {/* Branch content */}
            {isExpanded ? (
              <View style={{
                borderLeftWidth: 2, borderLeftColor: nodeBorder,
                borderStyle: 'dashed',
                marginLeft: 25, marginBottom: isLast ? 0 : 4, paddingBottom: 4, paddingTop: 2,
              }}>
                {milestone.vaccines.map((vax) => {
                  const apptDate = scheduledVaccines[vax.scheduleKey] ?? null
                  const isPickerOpen = expandedKey === vax.scheduleKey
                  const fullName = vax.name + (vax.doseLabel ? ` · ${vax.doseLabel}` : '')

                  const stickerFill = vax.status === 'done' ? ST_GREEN
                    : vax.status === 'overdue' ? ST_PEACH
                    : vax.status === 'upcoming' ? ST_YELLOW
                    : ST_CREAM
                  const stickerStroke = vax.status === 'future' ? ST_LINE : ST_INK
                  const metaColor = vax.status === 'done' ? (isDark ? ST_GREEN : '#3A7A28')
                    : vax.status === 'overdue' ? (isDark ? ST_PEACH : '#8A3A00')
                    : vax.status === 'upcoming' ? (isDark ? ST_YELLOW : '#7A6100')
                    : ink3

                  return (
                    <View key={vax.scheduleKey}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, paddingLeft: 12, paddingRight: 4 }}>
                        {/* Cross sticker + name — tap to open info */}
                        <Pressable
                          onPress={() => setInfoVaccine({
                            name: vax.name,
                            doseLabel: vax.doseLabel,
                            info: getVaccineInfo(vax.name),
                            accent: stickerFill,
                          })}
                          style={({ pressed }) => ({
                            flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
                            opacity: pressed ? 0.65 : 1,
                          })}
                        >
                          {/* Cross sticker bullet */}
                          <View style={{
                            width: 22, height: 22, alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                            shadowColor: ST_INK,
                            shadowOffset: { width: 0, height: 1.5 },
                            shadowOpacity: vax.status === 'future' ? 0 : 0.5,
                            shadowRadius: 0, elevation: vax.status === 'future' ? 0 : 2,
                          }}>
                            <CrossSticker size={22} fill={stickerFill} stroke={stickerStroke} />
                            {vax.status === 'done' && (
                              <View style={{ position: 'absolute' }}>
                                <Check size={10} color={ST_INK} strokeWidth={3.5} />
                              </View>
                            )}
                          </View>
                          {/* Name */}
                          <Text style={{ flex: 1, fontSize: 13, fontFamily: 'DMSans_500Medium', color: ink }}>
                            {fullName}
                          </Text>
                        </Pressable>
                        {/* Meta / actions */}
                        {vax.status === 'done' ? (
                          <Text style={{ fontSize: 11, fontFamily: 'DMSans_500Medium', color: metaColor }}>
                            {vax.givenDate ? formatHealthDate(vax.givenDate) : ''}
                          </Text>
                        ) : vax.status === 'upcoming' || vax.status === 'overdue' ? (
                          apptDate ? (
                            <View style={{ gap: 4, alignItems: 'flex-end' }}>
                              <Pressable onPress={() => {
                                setExpandedKey(isPickerOpen ? null : vax.scheduleKey)
                                setPickerDate(new Date(apptDate + 'T12:00:00'))
                              }}>
                                <Text style={{ fontSize: 11, fontFamily: 'DMSans_600SemiBold', color: ST_INK }}>
                                  {formatHealthDate(apptDate)}
                                </Text>
                              </Pressable>
                              <Pressable
                                onPress={() => onMarkVaccineGiven(
                                  vax.name + (vax.doseLabel ? ` - ${vax.doseLabel}` : ''),
                                  apptDate,
                                  vax.scheduleKey,
                                )}
                                style={[s.hdVaxBtn, { backgroundColor: brand.success + '18', borderColor: brand.success + '50' }]}
                              >
                                <Check size={10} color={brand.success} strokeWidth={3} />
                                <Text style={[s.hdVaxBtnText, { color: brand.success }]}>Mark given</Text>
                              </Pressable>
                            </View>
                          ) : (
                            <Pressable
                              onPress={() => {
                                setExpandedKey(isPickerOpen ? null : vax.scheduleKey)
                                setPickerDate(new Date())
                              }}
                              style={[s.hdVaxBtn, { backgroundColor: colors.surface, borderColor: colors.borderStrong }]}
                            >
                              <Text style={[s.hdVaxBtnText, { color: colors.textSecondary }]}>Set date</Text>
                            </Pressable>
                          )
                        ) : (
                          <Text style={{ fontSize: 10, fontFamily: 'DMSans_400Regular', color: ink3 }}>
                            {vax.dueAge}
                          </Text>
                        )}
                      </View>

                      {/* Inline date picker — sticker-paper card */}
                      {isPickerOpen && (
                        <View style={{
                          marginTop: 6, marginBottom: 12, marginLeft: 10, marginRight: 4,
                          backgroundColor: isDark ? colors.surface : '#FFFEF8',
                          borderWidth: 1.5, borderColor: ST_INK,
                          borderRadius: 22, padding: 12,
                          shadowColor: ST_INK,
                          shadowOffset: { width: 0, height: 3 },
                          shadowOpacity: 1,
                          shadowRadius: 0,
                          elevation: 3,
                        }}>
                          <Text style={{
                            fontSize: 11, fontFamily: 'DMSans_600SemiBold',
                            color: ink3, textTransform: 'uppercase', letterSpacing: 1.4,
                            paddingHorizontal: 4, paddingBottom: 4,
                          }}>
                            Pick a date
                          </Text>
                          <DateTimePicker
                            value={pickerDate}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            minimumDate={new Date()}
                            themeVariant={isDark ? 'dark' : 'light'}
                            accentColor={ST_INK}
                            textColor={ST_INK}
                            onChange={(e: DateTimePickerEvent, d?: Date) => {
                              if (Platform.OS === 'android') setExpandedKey(null)
                              if (e.type === 'set' && d) {
                                setPickerDate(d)
                                const y = d.getFullYear()
                                const mo = String(d.getMonth() + 1).padStart(2, '0')
                                const day = String(d.getDate()).padStart(2, '0')
                                onSetVaccineDate(vax.scheduleKey, `${y}-${mo}-${day}`)
                                if (Platform.OS === 'android') setExpandedKey(null)
                              }
                              if (e.type === 'dismissed') setExpandedKey(null)
                            }}
                          />
                          {Platform.OS === 'ios' && (
                            <Pressable
                              onPress={() => setExpandedKey(null)}
                              style={({ pressed }) => ({
                                alignSelf: 'center',
                                marginTop: 6,
                                paddingHorizontal: 28,
                                height: 44,
                                borderRadius: 999,
                                borderWidth: 2,
                                borderColor: ST_INK,
                                backgroundColor: ST_YELLOW,
                                alignItems: 'center',
                                justifyContent: 'center',
                                shadowColor: ST_INK,
                                shadowOffset: { width: 0, height: pressed ? 1 : 3 },
                                shadowOpacity: 1,
                                shadowRadius: 0,
                                elevation: 4,
                                transform: [{ translateY: pressed ? 2 : 0 }],
                              })}
                            >
                              <Text style={{
                                fontSize: 14, fontFamily: 'DMSans_700Bold',
                                color: ST_INK, letterSpacing: -0.2,
                              }}>
                                Done
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      )}
                    </View>
                  )
                })}
              </View>
            ) : (
              /* Collapsed: dashed stub + one-line summary for done milestones */
              <View style={{
                borderLeftWidth: 2,
                borderLeftColor: isDoneMilestone ? ST_GREEN : ST_LINE,
                borderStyle: 'dashed',
                marginLeft: 25,
                marginBottom: isLast ? 0 : 4,
                paddingBottom: 6,
                minHeight: 14,
              }}>
                {isDoneMilestone && (
                  <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', color: ink3, paddingLeft: 12, paddingTop: 4 }} numberOfLines={1}>
                    {milestone.vaccines.map((v) => v.name.split(' ')[0]).join(' · ')}
                    {milestone.vaccines[0]?.givenDate ? ` · ${formatHealthDate(milestone.vaccines[0].givenDate)}` : ''}
                  </Text>
                )}
              </View>
            )}
          </View>
        )
      })}
      <VaccineInfoModal
        visible={infoVaccine !== null}
        onClose={() => setInfoVaccine(null)}
        vaccineName={infoVaccine?.name ?? ''}
        doseLabel={infoVaccine?.doseLabel ?? ''}
        info={infoVaccine?.info ?? null}
        accent={infoVaccine?.accent ?? ST_YELLOW}
      />
    </View>
  )
}

function SleepDetailModal({ visible, onClose, sleepTotal, sleepTarget, sleepQuality, dailySleep, dailySleepTarget, dayLabels, childName, childColor }: {
  visible: boolean; onClose: () => void
  sleepTotal: number; sleepTarget: number
  sleepQuality: string
  dailySleep: number[]
  dailySleepTarget: number
  dayLabels: string[]
  childName?: string
  childColor?: string
}) {
  const { colors, isDark } = useTheme()
  const ST_INK = '#141313'
  const ST_BLUE = isDark ? '#A5C9F0' : '#9DC3E8'
  const ST_BLUE_SOFT = isDark ? '#1F2A3A' : '#CFE0F0'
  const ST_YELLOW = isDark ? '#F0CE4C' : '#F5D652'
  const PAPER = isDark ? colors.surface : '#FFFEF8'
  const ink = isDark ? colors.text : ST_INK
  const ink3 = colors.textMuted
  const pct = sleepTarget > 0 ? Math.round((sleepTotal / sleepTarget) * 100) : 0
  const maxHrs = Math.max(dailySleepTarget, ...dailySleep, 1)
  const qualityCopy: Record<string, { tag: string; tagBg: string; blurb: string }> = {
    Great:    { tag: 'On a roll', tagBg: '#BDD48C', blurb: 'Most days are landing close to or above target. Sleep regulation is doing its quiet magic — keep the rhythm.' },
    Solid:    { tag: 'Solid base', tagBg: '#F5D652', blurb: 'Sleep is consistent enough to support growth and mood. A few short nights are normal at this age.' },
    Restless: { tag: 'A bit choppy', tagBg: '#F5B896', blurb: 'Several nights are running short. Watch for over-tiredness signs and try moving bedtime 15 minutes earlier for a few days.' },
    'No data':{ tag: 'Add a log', tagBg: '#E8E4DC', blurb: 'No sleep entries yet for this range. Logging even one sleep helps the rings fill in.' },
  }
  const q = qualityCopy[sleepQuality] ?? qualityCopy['No data']
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable style={s.modalOverlay} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()} style={[s.modalContent, { backgroundColor: colors.bg, maxHeight: '78%' }]}>
          <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 6 }}>
            <View style={{ width: 42, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>
          <View style={[s.modalHeader, { gap: 10, alignItems: 'flex-start' }]}>
            <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: ST_BLUE, borderWidth: 2, borderColor: ST_INK, alignItems: 'center', justifyContent: 'center', shadowColor: ST_INK, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 }}>
              <Moon size={28} color={ST_INK} strokeWidth={2} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: ink, fontSize: 22, fontFamily: 'Fraunces_600SemiBold', letterSpacing: -0.4 }}>Sleep</Text>
              {!!childName && childColor && (
                <View style={{ backgroundColor: childColor + '22', borderRadius: 999, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: childColor + '40' }}>
                  <Text style={{ fontSize: 11, fontFamily: 'DMSans_600SemiBold', color: childColor }}>{childName}</Text>
                </View>
              )}
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <View style={[s.modalClose, { backgroundColor: PAPER, borderWidth: 1, borderColor: colors.border }]}>
                <X size={16} color={ink} strokeWidth={2} />
              </View>
            </Pressable>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 8, paddingBottom: 24, gap: 16 }} showsVerticalScrollIndicator={false}>
            <View style={{ backgroundColor: ST_BLUE_SOFT, borderRadius: 22, borderWidth: 1.5, borderColor: ST_INK, padding: 18, gap: 6, shadowColor: ST_INK, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3 }}>
              <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: ink3, textTransform: 'uppercase', letterSpacing: 1.4 }}>Total this range</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <Text style={{ fontSize: 44, fontFamily: 'Fraunces_600SemiBold', color: ink, letterSpacing: -1.2, lineHeight: 48 }}>{sleepTotal > 0 ? sleepTotal.toFixed(1) : '—'}</Text>
                <Text style={{ fontSize: 16, fontFamily: 'DMSans_500Medium', color: ink3 }}>hours</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: q.tagBg, borderWidth: 1.2, borderColor: ST_INK }}>
                  <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: ST_INK, textTransform: 'uppercase', letterSpacing: 0.6 }}>{q.tag}</Text>
                </View>
                <Text style={{ fontSize: 12, fontFamily: 'DMSans_500Medium', color: ink3 }}>{pct}% of {sleepTarget.toFixed(0)}h target</Text>
              </View>
            </View>
            <View>
              <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: ink3, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 8, paddingLeft: 2 }}>By day</Text>
              <View style={{ backgroundColor: PAPER, borderRadius: 22, borderWidth: 1.5, borderColor: ST_INK, paddingHorizontal: 14, paddingVertical: 16, shadowColor: ST_INK, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 110, gap: 6 }}>
                  {dailySleep.map((hrs, i) => {
                    const ratio = Math.max(hrs / maxHrs, 0.02)
                    const hitTarget = hrs >= dailySleepTarget * 0.85
                    const barColor = hrs === 0 ? ST_BLUE_SOFT : (hitTarget ? ST_BLUE : ST_YELLOW)
                    return (
                      <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 10, fontFamily: 'DMSans_600SemiBold', color: ink, height: 12 }}>{hrs > 0 ? hrs.toFixed(1) : ''}</Text>
                        <View style={{ width: '100%', height: Math.max(ratio * 80, 4), backgroundColor: barColor, borderWidth: 1.5, borderColor: ST_INK, borderRadius: 8 }} />
                        <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', color: ink3, textTransform: 'uppercase', letterSpacing: 0.6 }}>{(dayLabels[i] ?? '').slice(0, 3)}</Text>
                      </View>
                    )
                  })}
                </View>
                {dailySleepTarget > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingLeft: 4 }}>
                    <View style={{ width: 12, height: 4, backgroundColor: ST_YELLOW, borderRadius: 2, borderWidth: 1, borderColor: ST_INK }} />
                    <Text style={{ fontSize: 10, fontFamily: 'DMSans_500Medium', color: ink3 }}>below target ({dailySleepTarget}h/day)</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={{ backgroundColor: PAPER, borderRadius: 22, borderWidth: 1.5, borderColor: ST_INK, padding: 16, gap: 6, shadowColor: ST_INK, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3 }}>
              <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: ink3, textTransform: 'uppercase', letterSpacing: 1.4 }}>Quality read · {sleepQuality}</Text>
              <Text style={{ fontSize: 14, fontFamily: 'DMSans_400Regular', color: ink, lineHeight: 22 }}>{q.blurb}</Text>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function HealthDetailModal({ visible, onClose, sleepQuality, sleepTotal, sleepTarget, child, childColor, healthHistory, scheduledVaccines, onSetVaccineDate, onMarkVaccineGiven, activityCount, activityBreakdown, feedingCount, caloriesTotal, feedingMl, stage }: {
  visible: boolean; onClose: () => void
  sleepQuality: string; sleepTotal: number; sleepTarget: number
  child: ChildWithRole; childColor?: string; healthHistory: HealthHistoryData
  scheduledVaccines: Record<string, string>
  onSetVaccineDate: (key: string, date: string | null) => void
  onMarkVaccineGiven: (name: string, date: string, key: string) => Promise<void>
  activityCount: number; activityBreakdown: Record<string, number>; feedingCount: number; caloriesTotal: number; feedingMl: number; stage: FeedingStage
}) {
  const { colors, radius, isDark } = useTheme()
  const { weight, height } = parseGrowthValue(healthHistory.growth)
  const [activityBreakdownVisible, setActivityBreakdownVisible] = useState(false)

  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.12)'
  const ink = isDark ? colors.text : '#141313'
  const ink3 = isDark ? colors.textMuted : 'rgba(20,19,19,0.5)'
  const stickerInk = isDark ? 'rgba(255,255,255,0.18)' : '#141313'

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable style={s.modalOverlay} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[s.modalContent, { backgroundColor: colors.bg }]}
        >
          {/* Drag handle */}
          <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 6 }}>
            <View style={{ width: 42, height: 4, borderRadius: 2, backgroundColor: paperBorder }} />
          </View>

          {/* Sheet header with Fraunces title + child chip + close */}
          <View style={[s.modalHeader, { gap: 10 }]}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ color: ink, fontSize: 22, fontFamily: 'Fraunces_600SemiBold', letterSpacing: -0.4 }}>
                Health Overview
              </Text>
              {childColor && (
                <View style={{ backgroundColor: childColor + '22', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: childColor + '40' }}>
                  <Text style={{ fontSize: 11, fontFamily: 'DMSans_600SemiBold', color: childColor }}>{child.name}</Text>
                </View>
              )}
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <View style={[s.modalClose, { backgroundColor: paper, borderWidth: 1, borderColor: paperBorder }]}>
                <X size={16} color={ink} strokeWidth={2} />
              </View>
            </Pressable>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
            nestedScrollEnabled
          >
            {/* Sleep summary banner — sticker style */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 14,
              backgroundColor: paper, borderColor: paperBorder, borderWidth: 1.5,
              borderRadius: 22, padding: 14, marginBottom: 16,
              shadowColor: '#141313', shadowOpacity: isDark ? 0 : 0.05,
              shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
              position: 'relative', overflow: 'hidden',
            }}>
              {/* Decorative star sticker top-right */}
              <View style={{ position: 'absolute', top: -6, right: -2, transform: [{ rotate: '18deg' }], opacity: 0.6 }} pointerEvents="none">
                <StarSticker size={36} fill="#F5D652" stroke={stickerInk} />
              </View>

              {/* Moon sticker badge */}
              <View style={{
                width: 52, height: 52, borderRadius: 26,
                backgroundColor: '#E8DFF7',
                borderWidth: 1.5, borderColor: stickerInk,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <MoonSticker size={32} fill="#C8B6E8" stroke={stickerInk} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.hdBannerLabel, { color: ink3 }]}>SLEEP QUALITY</Text>
                <Text style={[s.hdBannerValue, { color: ink }]}>{sleepQuality}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 0 }}>
                <Text style={{ fontSize: 22, fontFamily: 'Fraunces_700Bold', color: ink, letterSpacing: -0.4 }}>{sleepTotal.toFixed(1)}h</Text>
                <Text style={[s.hdBannerStatSub, { color: ink3 }]}>of {sleepTarget.toFixed(0)}h</Text>
              </View>
            </View>

            {/* Latest Growth */}
            {(weight || height) && (
              <>
                <View style={s.modalSectionRow}>
                  <View style={{ transform: [{ rotate: '-8deg' }] }}>
                    <LeafSticker size={22} fill="#BDD48C" stroke={stickerInk} />
                  </View>
                  <Text style={[s.modalSectionTitle, { color: ink, marginTop: 0, marginBottom: 0 }]}>Latest Growth</Text>
                </View>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                  backgroundColor: isDark ? '#1F2A3A' : '#EBF3FC',
                  borderColor: isDark ? colors.border : 'rgba(20,19,19,0.12)',
                  borderWidth: 1.5, borderRadius: 22, padding: 14, marginTop: 4,
                  shadowColor: '#141313', shadowOpacity: isDark ? 0 : 0.05,
                  shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
                }}>
                  <View style={{
                    width: 44, height: 44, borderRadius: 22,
                    backgroundColor: '#9DC3E8', borderWidth: 1.5, borderColor: stickerInk,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <TrendingUp size={18} color={isDark ? '#FFFFFF' : '#141313'} strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1, flexDirection: 'row', gap: 16 }}>
                    {weight && (
                      <View>
                        <Text style={[s.hdGrowthLabel, { color: ink3 }]}>WEIGHT</Text>
                        <Text style={[s.hdGrowthValue, { color: ink }]}>{weight}</Text>
                      </View>
                    )}
                    {height && (
                      <View>
                        <Text style={[s.hdGrowthLabel, { color: ink3 }]}>HEIGHT</Text>
                        <Text style={[s.hdGrowthValue, { color: ink }]}>{height}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[s.hdGrowthDate, { color: ink3 }]}>
                    {healthHistory.growth[0]?.date ? formatHealthDate(healthHistory.growth[0].date) : ''}
                  </Text>
                </View>
              </>
            )}

            {/* Activity Overview */}
            <View style={s.modalSectionRow}>
              <View style={{ transform: [{ rotate: '12deg' }] }}>
                <StarSticker size={22} fill="#F5D652" stroke={stickerInk} />
              </View>
              <Text style={[s.modalSectionTitle, { color: ink, marginTop: 0, marginBottom: 0 }]}>Activity Overview</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 4 }}>
              <Pressable
                onPress={() => setActivityBreakdownVisible(true)}
                style={{
                  flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
                  backgroundColor: isDark ? PILLAR_COLORS.activity + '14' : '#EDF5E2',
                  borderColor: isDark ? colors.border : 'rgba(20,19,19,0.12)',
                  borderWidth: 1.5, borderRadius: 22,
                  shadowColor: '#141313', shadowOpacity: isDark ? 0 : 0.05,
                  shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
                }}
              >
                <View style={{
                  width: 36, height: 36, borderRadius: 18,
                  backgroundColor: '#BDD48C', borderWidth: 1.5, borderColor: stickerInk,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Zap size={16} color={isDark ? '#FFFFFF' : '#141313'} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.modalStatLabel, { color: ink3 }]}>Activities</Text>
                  <Text style={[s.modalStatValue, { color: ink }]}>{activityCount.toLocaleString()}</Text>
                </View>
                <ChevronRight size={14} color={ink3} strokeWidth={2} />
              </Pressable>
              <View style={{
                flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
                backgroundColor: isDark ? PILLAR_COLORS.nutrition + '14' : '#FFEDE6',
                borderColor: isDark ? colors.border : 'rgba(20,19,19,0.12)',
                borderWidth: 1.5, borderRadius: 22,
                shadowColor: '#141313', shadowOpacity: isDark ? 0 : 0.05,
                shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
              }}>
                <View style={{
                  width: 36, height: 36, borderRadius: 18,
                  backgroundColor: '#F5B896', borderWidth: 1.5, borderColor: stickerInk,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {stage === 'liquid' || stage === 'mixed'
                    ? <Droplets size={16} color={isDark ? '#FFFFFF' : '#141313'} strokeWidth={2.2} />
                    : <Utensils size={16} color={isDark ? '#FFFFFF' : '#141313'} strokeWidth={2.2} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.modalStatLabel, { color: ink3 }]}>
                    {stage === 'liquid' ? 'Feedings' : stage === 'mixed' ? 'Feeds' : 'Calories'}
                  </Text>
                  <Text style={[s.modalStatValue, { color: ink }]}>
                    {stage === 'liquid' ? feedingCount.toLocaleString() : stage === 'mixed' ? feedingCount.toLocaleString() : (caloriesTotal > 0 ? caloriesTotal.toLocaleString() : '—')}
                  </Text>
                </View>
              </View>
            </View>
            {(stage === 'liquid' || stage === 'mixed') && feedingMl > 0 && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginTop: 8,
                backgroundColor: isDark ? PILLAR_COLORS.nutrition + '0C' : '#FFF6F0',
                borderColor: isDark ? colors.border : 'rgba(20,19,19,0.1)',
                borderWidth: 1, borderRadius: 16,
              }}>
                <Droplets size={14} color={PILLAR_COLORS.nutrition} strokeWidth={2.2} />
                <Text style={[s.modalStatLabel, { color: ink3, flex: 1 }]}>Total volume</Text>
                <Text style={{ fontSize: 14, fontFamily: 'Fraunces_600SemiBold', color: ink }}>{feedingMl.toLocaleString()}ml</Text>
              </View>
            )}

            {/* Allergies */}
            {child.allergies.length > 0 && (
              <>
                <View style={s.modalSectionRow}>
                  <View style={{ transform: [{ rotate: '-10deg' }] }}>
                    <HeartSticker size={22} fill="#F2B2C7" stroke={stickerInk} />
                  </View>
                  <Text style={[s.modalSectionTitle, { color: ink, marginTop: 0, marginBottom: 0 }]}>Allergies</Text>
                </View>
                <View style={[s.healthTagsRow, { marginTop: 4 }]}>
                  {child.allergies.map((a, i) => (
                    <View key={i} style={{
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1.5,
                      backgroundColor: isDark ? '#36222A' : '#FDEEF2',
                      borderColor: isDark ? '#F5BBCF40' : 'rgba(20,19,19,0.18)',
                    }}>
                      <View style={{
                        width: 16, height: 16, borderRadius: 8,
                        backgroundColor: '#F2B2C7', borderWidth: 1, borderColor: stickerInk,
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <AlertCircle size={9} color={isDark ? '#FFFFFF' : '#141313'} strokeWidth={2.5} />
                      </View>
                      <Text style={{ fontSize: 13, fontFamily: 'DMSans_700Bold', color: isDark ? '#F5BBCF' : '#141313' }}>{a}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Medications from child profile */}
            {child.medications.length > 0 && (
              <>
                <View style={s.modalSectionRow}>
                  <View style={{ transform: [{ rotate: '10deg' }] }}>
                    <PillSticker size={22} fill="#F5D652" stroke={stickerInk} />
                  </View>
                  <Text style={[s.modalSectionTitle, { color: ink, marginTop: 0, marginBottom: 0 }]}>Medications</Text>
                </View>
                {child.medications.map((m, i) => (
                  <View key={i} style={[s.modalTaskRow, { borderBottomColor: paperBorder }]}>
                    <Pill size={14} color={brand.secondary} strokeWidth={2} />
                    <Text style={[s.modalTaskLabel, { color: ink }]}>{m}</Text>
                    <Text style={[s.modalTaskStatus, { color: brand.secondary }]}>Active</Text>
                  </View>
                ))}
              </>
            )}

            {/* Vaccine Schedule */}
            <View style={s.modalSectionRow}>
              <View style={{ transform: [{ rotate: '-6deg' }] }}>
                <CrossSticker size={22} fill="#F5D652" stroke={stickerInk} />
              </View>
              <Text style={[s.modalSectionTitle, { color: ink, marginTop: 0, marginBottom: 0 }]}>Vaccine Schedule</Text>
            </View>
            <VaccineScheduleTree
              child={child}
              healthHistory={healthHistory}
              scheduledVaccines={scheduledVaccines}
              onSetVaccineDate={onSetVaccineDate}
              onMarkVaccineGiven={onMarkVaccineGiven}
            />

            {/* View Full History — ink-on-cream pill */}
            <Pressable
              onPress={() => { onClose(); router.push('/profile/health-history' as any) }}
              style={[s.hdHistoryBtn, {
                backgroundColor: isDark ? colors.surface : '#141313',
                borderWidth: 1.5,
                borderColor: isDark ? colors.border : '#141313',
              }]}
            >
              <SparkleSticker size={16} fill="#F5D652" stroke={isDark ? colors.border : '#FFFEF8'} />
              <Text style={[s.hdHistoryBtnText, { color: '#FFFEF8' }]}>View Full Health History</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
      <ActivityBreakdownModal
        visible={activityBreakdownVisible}
        onClose={() => setActivityBreakdownVisible(false)}
        breakdown={activityBreakdown}
        total={activityCount}
        colors={colors}
        radius={radius}
      />
    </Modal>
  )
}

// ─── Activity Detail Modal ──────────────────────────────────────────────────

function ActivityDetailModal({ visible, onClose, caloriesTotal, caloriesTarget, categories, stage, feedingCount, feedingBreast, feedingBottle, feedingMl, avgMl, childName, childColor }: {
  visible: boolean; onClose: () => void
  caloriesTotal: number; caloriesTarget: number
  categories: { label: string; cals: number; color: string }[]
  stage: FeedingStage; feedingCount: number; feedingBreast: number; feedingBottle: number; feedingMl: number; avgMl: number
  childName?: string; childColor?: string
}) {
  const { colors, radius } = useTheme()
  const isLiquid = stage === 'liquid' || stage === 'mixed'
  const pct = caloriesTarget > 0 ? Math.round((caloriesTotal / caloriesTarget) * 100) : 0

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.modalOverlay}>
        <View style={[s.modalContent, { backgroundColor: colors.bg, borderRadius: radius.xl }]}>
          <View style={s.modalHeader}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[s.modalTitle, { color: colors.text }]}>{stage === 'liquid' ? 'Feeding' : 'Nutrition'}</Text>
              {childName && childColor && (
                <View style={{ backgroundColor: childColor + '25', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: childColor + '60' }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: childColor }}>{childName}</Text>
                </View>
              )}
            </View>
            <Pressable onPress={onClose} style={[s.modalClose, { backgroundColor: StickerPalette.paper, borderWidth: 1.5, borderColor: DIAPER_STICKER_INK }]}>
              <X size={18} color={DIAPER_STICKER_INK} strokeWidth={2.2} />
            </Pressable>
          </View>

          {/* Feeding summary — always shown when there are feedings */}
          {(isLiquid || feedingCount > 0) && (
            <>
              {/* Top stat — coral sticker, with avg pill on the right */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 16,
                  borderRadius: 22,
                  borderWidth: 1.5,
                  borderColor: DIAPER_STICKER_INK,
                  backgroundColor: StickerPalette.peachSoft,
                  shadowColor: DIAPER_STICKER_INK,
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.1,
                  shadowRadius: 6,
                  elevation: 2,
                  marginBottom: 12,
                }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: StickerPalette.coral, borderWidth: 1.5, borderColor: DIAPER_STICKER_INK, alignItems: 'center', justifyContent: 'center' }}>
                  <Droplets size={18} color={DIAPER_STICKER_INK} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#6E6763', fontSize: 10, fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase' }}>Feedings</Text>
                  <Text style={{ color: DIAPER_STICKER_INK, fontSize: 22, fontFamily: 'Fraunces_700Bold', letterSpacing: -0.3, marginTop: 2 }}>
                    {feedingCount.toLocaleString()} total
                  </Text>
                </View>
                {avgMl > 0 && (
                  <Text style={{ color: DIAPER_STICKER_INK, fontSize: 12, fontFamily: 'InstrumentSerif_400Regular_Italic', fontStyle: 'italic' }}>
                    avg {avgMl.toLocaleString()}ml
                  </Text>
                )}
              </View>

              {/* 3-tile breakdown — sticker cards */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {[
                  { Icon: Baby, value: feedingBreast.toLocaleString(), label: 'Breast', fill: StickerPalette.pinkSoft, accent: StickerPalette.pink, tilt: -2 },
                  { Icon: Milk, value: feedingBottle.toLocaleString(), label: 'Bottle', fill: StickerPalette.blueSoft, accent: StickerPalette.blue, tilt: 2 },
                  { Icon: Droplets, value: feedingMl > 0 ? `${feedingMl.toLocaleString()}ml` : '—', label: 'Total Vol', fill: StickerPalette.peachSoft, accent: StickerPalette.peach, tilt: -1.5 },
                ].map((card, i) => (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      backgroundColor: card.fill,
                      borderRadius: 22,
                      borderWidth: 1.5,
                      borderColor: DIAPER_STICKER_INK,
                      paddingVertical: 14,
                      paddingHorizontal: 8,
                      alignItems: 'center',
                      shadowColor: DIAPER_STICKER_INK,
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.12,
                      shadowRadius: 6,
                      elevation: 2,
                      transform: [{ rotate: `${card.tilt}deg` }],
                    }}
                  >
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: card.accent, borderWidth: 1.5, borderColor: DIAPER_STICKER_INK, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                      <card.Icon size={16} color={DIAPER_STICKER_INK} strokeWidth={2.2} />
                    </View>
                    <Text style={{ color: DIAPER_STICKER_INK, fontSize: 18, fontFamily: 'Fraunces_700Bold', letterSpacing: -0.3 }} numberOfLines={1}>{card.value}</Text>
                    <Text style={{ color: DIAPER_STICKER_INK, fontSize: 9.5, fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>{card.label}</Text>
                  </View>
                ))}
              </View>

              {/* Breast vs Bottle proportion bar */}
              {(feedingBreast + feedingBottle) > 0 && (
                <View style={{ marginTop: 18 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ color: '#6E6763', fontSize: 11, fontFamily: 'DMSans_700Bold', letterSpacing: 0.8, textTransform: 'uppercase' }}>Breast vs Bottle</Text>
                    <Text style={{ color: DIAPER_STICKER_INK, fontSize: 11, fontFamily: 'InstrumentSerif_400Regular_Italic', fontStyle: 'italic' }}>
                      {Math.round((feedingBreast / (feedingBreast + feedingBottle)) * 100)}% breast
                    </Text>
                  </View>
                  <View
                    style={{
                      height: 14,
                      borderRadius: 7,
                      borderWidth: 1.5,
                      borderColor: DIAPER_STICKER_INK,
                      overflow: 'hidden',
                      flexDirection: 'row',
                      backgroundColor: StickerPalette.cream,
                    }}
                  >
                    {feedingBreast > 0 && (
                      <View style={{ width: `${(feedingBreast / (feedingBreast + feedingBottle)) * 100}%` as any, backgroundColor: StickerPalette.pink }} />
                    )}
                    {feedingBottle > 0 && (
                      <View style={{ width: `${(feedingBottle / (feedingBreast + feedingBottle)) * 100}%` as any, backgroundColor: StickerPalette.blue }} />
                    )}
                  </View>
                </View>
              )}

              {/* Insight pill — Grandma's read on the data */}
              {feedingCount > 0 && (() => {
                const breastPct = feedingBreast + feedingBottle > 0
                  ? Math.round((feedingBreast / (feedingBreast + feedingBottle)) * 100)
                  : 0
                const insight =
                  breastPct === 100 ? 'Exclusively breastfed — keep going, dear.' :
                  breastPct >= 75 ? 'Mostly breast, with some bottle support.' :
                  breastPct >= 25 ? 'Mixed feeding — best of both worlds.' :
                  breastPct > 0 ? 'Mostly bottle, with some breast.' :
                  feedingBottle > 0 ? 'Exclusively bottle-fed.' :
                  ''
                return insight ? (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 14,
                    paddingVertical: 9,
                    paddingHorizontal: 14,
                    borderRadius: 999,
                    borderWidth: 1.5,
                    borderColor: DIAPER_STICKER_INK,
                    backgroundColor: StickerPalette.yellowSoft,
                    alignSelf: 'flex-start',
                  }}>
                    <Sparkles size={13} color={DIAPER_STICKER_INK} strokeWidth={2.2} />
                    <Text style={{ color: DIAPER_STICKER_INK, fontSize: 13, fontFamily: 'InstrumentSerif_400Regular_Italic', fontStyle: 'italic' }}>
                      {insight}
                    </Text>
                  </View>
                ) : null
              })()}
            </>
          )}

          {/* Calorie summary — sticker style */}
          {(stage === 'solids' || (stage === 'mixed' && caloriesTotal > 0)) && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 16,
                borderRadius: 22,
                borderWidth: 1.5,
                borderColor: DIAPER_STICKER_INK,
                backgroundColor: StickerPalette.yellowSoft,
                marginTop: isLiquid ? 14 : 0,
                shadowColor: DIAPER_STICKER_INK,
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.1,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: StickerPalette.yellow, borderWidth: 1.5, borderColor: DIAPER_STICKER_INK, alignItems: 'center', justifyContent: 'center' }}>
                <Utensils size={18} color={DIAPER_STICKER_INK} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#6E6763', fontSize: 10, fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase' }}>{stage === 'mixed' ? 'Solids Calories' : 'Calories'}</Text>
                <Text style={{ color: DIAPER_STICKER_INK, fontSize: 22, fontFamily: 'Fraunces_700Bold', letterSpacing: -0.3, marginTop: 2 }}>
                  {caloriesTotal > 0 ? `${caloriesTotal.toLocaleString()} cal` : '—'}
                </Text>
              </View>
              {stage === 'solids' && (
                <Text style={{ color: DIAPER_STICKER_INK, fontSize: 12, fontFamily: 'InstrumentSerif_400Regular_Italic', fontStyle: 'italic' }}>
                  {pct}% of {caloriesTarget.toLocaleString()}
                </Text>
              )}
            </View>
          )}

          {/* Category breakdown — sticker chips */}
          {categories.length > 0 && (
            <View style={{ marginTop: 18 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: 'DMSans_700Bold', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>Breakdown by Category</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {categories.map((cat, i) => (
                  <View
                    key={i}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: StickerPalette.paper,
                      borderRadius: 999,
                      borderWidth: 1.5,
                      borderColor: DIAPER_STICKER_INK,
                      paddingHorizontal: 12,
                      paddingVertical: 5,
                      shadowColor: DIAPER_STICKER_INK,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 3,
                      elevation: 1,
                    }}
                  >
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: cat.color, borderWidth: 1, borderColor: DIAPER_STICKER_INK }} />
                    <Text style={{ color: DIAPER_STICKER_INK, fontSize: 12, fontFamily: 'DMSans_600SemiBold' }}>{cat.label}</Text>
                    <Text style={{ color: '#6E6763', fontSize: 11, fontFamily: 'Fraunces_700Bold' }}>{cat.cals.toLocaleString()} cal</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

        </View>
      </View>
    </Modal>
  )
}

// ─── Activities Detail Modal ────────────────────────────────────────────────

function ActivitiesDetailModal({ visible, onClose, activityCount, activeDays, rangeDays, breakdown, entries, childName, childColor }: {
  visible: boolean; onClose: () => void
  activityCount: number; activeDays: number; rangeDays: number
  breakdown: Record<string, number>
  entries: ActivityEntry[]
  childName?: string; childColor?: string
}) {
  const { colors, radius } = useTheme()
  const [expandedType, setExpandedType] = useState<string | null>(null)

  // Reset expansion each time modal opens
  useEffect(() => {
    if (!visible) setExpandedType(null)
  }, [visible])

  const avgPerActiveDay = activeDays > 0 ? Math.round((activityCount / activeDays) * 10) / 10 : 0
  const ranked = Object.entries(breakdown)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
  const topEntry = ranked[0]
  const topMeta = topEntry ? (ACTIVITY_TYPE_META[topEntry[0]] ?? { label: topEntry[0], color: PILLAR_COLORS.activity }) : null
  const topPct = topEntry && activityCount > 0 ? Math.round((topEntry[1] / activityCount) * 100) : 0
  const distinctTypes = ranked.length

  function formatEntryDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00')
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  function formatEntryTime(start?: string, end?: string): string {
    if (!start) return ''
    const toLabel = (t: string) => {
      const [hStr, mStr] = t.split(':')
      const h = Number(hStr), m = Number(mStr ?? 0)
      if (isNaN(h)) return t
      const ampm = h >= 12 ? 'PM' : 'AM'
      const hh = ((h + 11) % 12) + 1
      return `${hh}:${String(m).padStart(2, '0')} ${ampm}`
    }
    return end ? `${toLabel(start)} – ${toLabel(end)}` : toLabel(start)
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.modalOverlay}>
        <View style={[s.modalContent, { backgroundColor: colors.bg, borderRadius: radius.xl }]}>
          <View style={s.modalHeader}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[s.modalTitle, { color: colors.text }]}>Activities</Text>
              {childName && childColor && (
                <View style={{ backgroundColor: childColor + '25', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: childColor + '60' }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: childColor }}>{childName}</Text>
                </View>
              )}
            </View>
            <Pressable onPress={onClose} style={[s.modalClose, { backgroundColor: StickerPalette.paper, borderWidth: 1.5, borderColor: DIAPER_STICKER_INK }]}>
              <X size={18} color={DIAPER_STICKER_INK} strokeWidth={2.2} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Top stat card — sticker */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 16,
                borderRadius: 22,
                borderWidth: 1.5,
                borderColor: DIAPER_STICKER_INK,
                backgroundColor: StickerPalette.greenSoft,
                shadowColor: DIAPER_STICKER_INK,
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.1,
                shadowRadius: 6,
                elevation: 2,
                marginBottom: 14,
              }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: StickerPalette.green, borderWidth: 1.5, borderColor: DIAPER_STICKER_INK, alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={18} color={DIAPER_STICKER_INK} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#6E6763', fontSize: 10, fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase' }}>Activities</Text>
                <Text style={{ color: DIAPER_STICKER_INK, fontSize: 22, fontFamily: 'Fraunces_700Bold', letterSpacing: -0.3, marginTop: 2 }}>
                  {activityCount > 0 ? activityCount.toLocaleString() : '—'} total
                </Text>
              </View>
              {activeDays > 0 && rangeDays > 0 && (
                <Text style={{ color: DIAPER_STICKER_INK, fontSize: 12, fontFamily: 'InstrumentSerif_400Regular_Italic', fontStyle: 'italic' }}>
                  {activeDays}/{rangeDays} days
                </Text>
              )}
            </View>

            {/* 3-tile analytics — sticker cards */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
              {[
                { Icon: Clock, value: `${activeDays}${rangeDays > 0 ? `/${rangeDays}` : ''}`, label: 'Active Days', fill: StickerPalette.greenSoft, accent: StickerPalette.green, tilt: -2 },
                { Icon: TrendingUp, value: topMeta ? topMeta.label.split(' ')[0] : '—', label: 'Top', fill: StickerPalette.yellowSoft, accent: StickerPalette.yellow, tilt: 2 },
                { Icon: Sparkles, value: String(distinctTypes), label: 'Types', fill: StickerPalette.lilacSoft, accent: StickerPalette.lilac, tilt: -1.5 },
              ].map((card, i) => (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    backgroundColor: card.fill,
                    borderRadius: 22,
                    borderWidth: 1.5,
                    borderColor: DIAPER_STICKER_INK,
                    paddingVertical: 14,
                    paddingHorizontal: 8,
                    alignItems: 'center',
                    shadowColor: DIAPER_STICKER_INK,
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.12,
                    shadowRadius: 6,
                    elevation: 2,
                    transform: [{ rotate: `${card.tilt}deg` }],
                  }}
                >
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: card.accent, borderWidth: 1.5, borderColor: DIAPER_STICKER_INK, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                    <card.Icon size={16} color={DIAPER_STICKER_INK} strokeWidth={2.2} />
                  </View>
                  <Text style={{ color: DIAPER_STICKER_INK, fontSize: 18, fontFamily: 'Fraunces_700Bold', letterSpacing: -0.3 }} numberOfLines={1}>{card.value}</Text>
                  <Text style={{ color: DIAPER_STICKER_INK, fontSize: 9.5, fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>{card.label}</Text>
                </View>
              ))}
            </View>
            {activityCount > 0 && (
              <Text style={[s.feedingAvgText, { color: colors.textMuted }]}>
                {avgPerActiveDay} activities per active day
                {topMeta ? ` · ${topMeta.label} leads (${topPct}%)` : ''}
              </Text>
            )}

            {/* Ranking */}
            {ranked.length > 0 ? (
              <>
                <Text style={[s.modalSectionTitle, { color: colors.text }]}>Activity Ranking</Text>
                {ranked.map(([type, count]) => {
                  const meta = ACTIVITY_TYPE_META[type] ?? { label: type, color: PILLAR_COLORS.activity }
                  const typePct = activityCount > 0 ? Math.round((count / activityCount) * 100) : 0
                  const isOpen = expandedType === type
                  const typeEntries = entries.filter((e) => e.type === type)
                  return (
                    <View key={type} style={{ paddingVertical: 6 }}>
                      <Pressable
                        onPress={() => setExpandedType(isOpen ? null : type)}
                        style={{ paddingVertical: 4 }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <View style={[s.modalCatDot, { backgroundColor: meta.color }]} />
                          <Text style={[s.modalCatLabel, { color: colors.textSecondary }]}>{meta.label}</Text>
                          <Text style={[s.modalCatValue, { color: colors.text }]}>{count.toLocaleString()}</Text>
                          <Text style={{ color: meta.color, fontSize: 12, fontFamily: 'DMSans_600SemiBold', minWidth: 40, textAlign: 'right' }}>{typePct}%</Text>
                          <ChevronRight
                            size={14}
                            color={colors.textMuted}
                            strokeWidth={2}
                            style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }], marginLeft: 2 }}
                          />
                        </View>
                        <View style={{ height: 4, borderRadius: 2, backgroundColor: meta.color + '22', overflow: 'hidden' }}>
                          <View style={{ width: `${typePct}%`, height: 4, borderRadius: 2, backgroundColor: meta.color }} />
                        </View>
                      </Pressable>
                      {isOpen && (
                        <View style={{ marginTop: 10, marginLeft: 18, gap: 8, borderLeftWidth: 1, borderLeftColor: meta.color + '40', paddingLeft: 12 }}>
                          {typeEntries.length === 0 ? (
                            <Text style={{ color: colors.textMuted, fontSize: 12, fontFamily: 'DMSans_500Medium' }}>
                              No entries in this range
                            </Text>
                          ) : typeEntries.map((entry) => {
                            const timeLabel = formatEntryTime(entry.startTime, entry.endTime)
                            return (
                              <View key={entry.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: meta.color, marginTop: 6 }} />
                                <View style={{ flex: 1 }}>
                                  <Text style={{ color: colors.text, fontSize: 13, fontFamily: 'DMSans_600SemiBold' }}>
                                    {entry.name || meta.label}
                                  </Text>
                                  <Text style={{ color: colors.textMuted, fontSize: 11, fontFamily: 'DMSans_500Medium', marginTop: 1 }}>
                                    {formatEntryDate(entry.date)}{timeLabel ? ` · ${timeLabel}` : ''}
                                  </Text>
                                  {entry.notes ? (
                                    <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: 'DMSans_400Regular', marginTop: 3, fontStyle: 'italic' }} numberOfLines={2}>
                                      {entry.notes}
                                    </Text>
                                  ) : null}
                                </View>
                              </View>
                            )
                          })}
                        </View>
                      )}
                    </View>
                  )
                })}
              </>
            ) : (
              <View style={{ marginTop: 24, padding: 20, alignItems: 'center' }}>
                <Text style={{ color: colors.textMuted, fontSize: 14, fontFamily: 'DMSans_500Medium', textAlign: 'center' }}>
                  No activities logged in this period
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

// ─── Goal Setting Modal ─────────────────────────────────────────────────────

function GoalSettingModal({ visible, onClose, childId, childName, birthDate, onSaved }: {
  visible: boolean; onClose: () => void
  childId: string; childName: string; birthDate: string
  onSaved: () => void
}) {
  const { colors, radius, isDark } = useTheme()
  const store = useGoalsStore()
  const current = store.getGoals(childId, birthDate)
  const suggested = getSuggestedGoals(birthDate)

  const stage = getFeedingStage(birthDate)
  const months = getAgeMonths(birthDate)
  const isLiquid = stage === 'liquid' || stage === 'mixed'

  const [sleep, setSleep] = useState(String(current.sleep))
  const [calories, setCalories] = useState(String(current.calories))
  const [feedings, setFeedings] = useState(String(current.feedings))
  const [feedingMl, setFeedingMl] = useState(String(current.feedingMl))
  const [activity, setActivity] = useState(String(current.activity))
  // Reset inputs when modal opens
  useEffect(() => {
    if (visible) {
      const g = store.getGoals(childId, birthDate)
      setSleep(String(g.sleep))
      setCalories(String(g.calories))
      setFeedings(String(g.feedings))
      setFeedingMl(String(g.feedingMl))
      setActivity(String(g.activity))
    }
  }, [visible])

  const ageLabel = formatAge(birthDate)

  async function handleSave() {
    const newGoals: MetricGoals = {
      sleep: Math.max(1, Number(sleep) || suggested.sleep),
      calories: Math.max(0, Number(calories) || suggested.calories),
      feedings: Math.max(1, Number(feedings) || suggested.feedings),
      feedingMl: Math.max(0, Number(feedingMl) || suggested.feedingMl),
      activity: Math.max(1, Number(activity) || suggested.activity),
    }
    store.setAllGoals(childId, newGoals)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await store.saveToSupabase(childId, user.id)
    } catch {}
    onSaved()
    onClose()
  }

  function handleReset() {
    setSleep(String(suggested.sleep))
    setCalories(String(suggested.calories))
    setFeedings(String(suggested.feedings))
    setFeedingMl(String(suggested.feedingMl))
    setActivity(String(suggested.activity))
  }

  // ── Age-specific reasoning for each goal ──
  function sleepReason(): string {
    if (months < 4)  return `Newborns (0-3mo) need 14-17 hours of sleep per day including naps. ${suggested.sleep}h is the midpoint recommended by the CDC. Sleep is critical for brain development at this age.`
    if (months < 6)  return `At ${months} months, babies need 12-16 hours per day including 2-3 naps. ${suggested.sleep}h is the CDC midpoint. Regular nap schedules are forming now.`
    if (months < 12) return `Babies ${months} months old need 12-15 hours per day (CDC). This includes overnight sleep plus 2 naps. Most babies this age sleep 10-12h at night + 2-3h of naps.`
    if (months < 24) return `Toddlers 12-23 months need 11-14 hours per day (CDC). Most transition to 1 nap around 15-18 months. ${suggested.sleep}h accounts for ~11h overnight + 1-2h nap.`
    if (months < 36) return `At age 2, children need 11-14 hours per day (CDC). Most take one midday nap of 1-2 hours. Some children start dropping the nap near age 3.`
    return `Children ${Math.floor(months / 12)}y need 10-13 hours per day (CDC). Most have stopped napping by this age, so this is primarily nighttime sleep.`
  }

  function caloriesReason(): string {
    if (months < 6)  return `Under 6 months, all nutrition comes from breast milk or formula. Calorie tracking isn't needed — feeding count and volume are better indicators.`
    if (months < 12) return `At ${months} months, solids are being introduced but most calories (60-70%) still come from milk. ${suggested.calories} kcal from solids is typical for this stage.`
    if (months < 18) return `12-17 month olds need ~900-1000 kcal/day total (WHO). About 70% now comes from solid food. ${suggested.calories} kcal reflects the solid food portion.`
    if (months < 24) return `18-23 month olds need ~1000-1100 kcal/day (WHO). At this age solids are the primary nutrition source. Includes 3 meals + 1-2 snacks daily.`
    if (months < 36) return `2 year olds need ~1000-1400 kcal/day (AAP). ${suggested.calories} kcal is the midpoint. Balanced across 3 meals and 2 snacks with all food groups.`
    return `Children age ${Math.floor(months / 12)} need approximately ${suggested.calories} kcal/day (AAP/WHO), distributed across 3 meals and 1-2 snacks.`
  }

  function feedingsReason(): string {
    if (months < 1)  return `Newborns need to feed 8-12 times per day, roughly every 2-3 hours (AAP). Frequent feeding stimulates milk production and supports rapid growth in the first weeks.`
    if (months < 3)  return `At ${months} months, babies typically feed 7-9 times per day. Feeding frequency starts to decrease slightly as stomach capacity grows.`
    if (months < 6)  return `${months}-month-old babies usually feed 6-8 times per day. Some babies start to develop a more predictable feeding schedule by now.`
    if (months < 12) return `6-11 month babies typically have ${suggested.feedings}-${suggested.feedings + 1} milk feeds per day as solid meals are introduced. Milk remains the primary nutrition source but feeds gradually decrease.`
    if (months < 24) return `Toddlers 12-23mo benefit from ${suggested.feedings} milk feeds per day (~350-400ml total), typically morning and bedtime. Whole cow's milk can replace formula after 12 months.`
    if (months < 36) return `At age 2, ${suggested.feedings} milk servings per day (about 350ml) provides calcium and vitamin D. Can be cow's milk, plant-based alternatives, or continued breastfeeding.`
    return `Children age ${Math.floor(months / 12)} may still have ${suggested.feedings} cup(s) of milk daily for calcium. This is optional and can be replaced with other dairy sources.`
  }

  function feedingMlReason(): string {
    if (months < 1)  return `Newborns typically consume 60-90ml per feed, totaling ~500-700ml/day. Volume increases weekly as the stomach grows. Breast-fed amounts are estimated.`
    if (months < 3)  return `At ${months} months, babies consume about 120-150ml per feed, totaling ~700-800ml/day. Volume per feed increases as feeding frequency decreases.`
    if (months < 6)  return `${months}-month-old babies typically consume 150-180ml per feed, totaling 800-950ml/day. This is the peak milk intake period before solids begin.`
    if (months < 12) return `As solids increase, milk volume decreases to ~${suggested.feedingMl}ml/day. This ensures baby still gets essential nutrients from milk while exploring solid foods.`
    if (months < 36) return `~${suggested.feedingMl}ml of milk per day provides adequate calcium (500-700mg/day needed at this age) and vitamin D for bone development.`
    return `${suggested.feedingMl}ml of milk per day is a reasonable target for calcium intake. Equivalent to about ${Math.round(suggested.feedingMl / 250)} cup(s).`
  }

  function activityReason(): string {
    if (months < 6)  return `${suggested.activity} logged activities/day helps track your baby's routine. At this age, this means feeds, diaper changes, tummy time, and mood check-ins.`
    if (months < 12) return `${suggested.activity} activities/day covers feeds, meals, naps, playtime, and mood. Tracking helps identify patterns in your baby's routine and development.`
    if (months < 24) return `${suggested.activity} activities/day tracks meals, snacks, naps, outdoor play, and developmental activities. Regular logging helps spot patterns and share with caregivers.`
    return `${suggested.activity} activities/day helps maintain a complete picture of your child's day — meals, activities, milestones, and health. Consistency helps pediatrician visits too.`
  }

  type MetricRow = { key: string; label: string; unit: string; color: string; icon: typeof Moon; value: string; setValue: (v: string) => void; suggested: number; desc: string; step: number; reason: string }

  // Build metrics list based on feeding stage
  const metrics: MetricRow[] = [
    { key: 'sleep', label: 'Sleep', unit: 'hours/day', color: PILLAR_COLORS.sleep, icon: Moon, value: sleep, setValue: setSleep, suggested: suggested.sleep, desc: 'CDC recommended for age', step: 1, reason: sleepReason() },
  ]

  if (stage === 'liquid') {
    metrics.push(
      { key: 'feedings', label: 'Feedings', unit: 'feeds/day', color: PILLAR_COLORS.nutrition, icon: Droplets, value: feedings, setValue: setFeedings, suggested: suggested.feedings, desc: 'Breast & bottle feeds', step: 1, reason: feedingsReason() },
      { key: 'feedingMl', label: 'Volume', unit: 'ml/day', color: PILLAR_COLORS.nutrition, icon: Droplets, value: feedingMl, setValue: setFeedingMl, suggested: suggested.feedingMl, desc: 'Total milk/formula volume', step: 50, reason: feedingMlReason() },
    )
  } else {
    metrics.push(
      { key: 'calories', label: stage === 'mixed' ? 'Solids Cal' : 'Calories', unit: 'kcal/day', color: PILLAR_COLORS.nutrition, icon: Utensils, value: calories, setValue: setCalories, suggested: suggested.calories, desc: stage === 'mixed' ? 'From solid food (intro stage)' : 'Based on age & growth', step: 50, reason: caloriesReason() },
    )
    if (suggested.feedings > 0) {
      metrics.push(
        { key: 'feedings', label: 'Milk Feeds', unit: 'feeds/day', color: PILLAR_COLORS.nutrition, icon: Droplets, value: feedings, setValue: setFeedings, suggested: suggested.feedings, desc: 'Bottles & breastfeeds per day', step: 1, reason: feedingsReason() },
        { key: 'feedingMl', label: 'Milk Volume', unit: 'ml/day', color: PILLAR_COLORS.nutrition, icon: Droplets, value: feedingMl, setValue: setFeedingMl, suggested: suggested.feedingMl, desc: 'Daily milk/formula intake', step: 50, reason: feedingMlReason() },
      )
    }
  }

  metrics.push(
    { key: 'activity', label: 'Activities', unit: 'logs/day', color: PILLAR_COLORS.activity, icon: Zap, value: activity, setValue: setActivity, suggested: suggested.activity, desc: 'Total daily activities', step: 1, reason: activityReason() },
  )

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.modalOverlay}>
        <View style={[s.gsSheet, { backgroundColor: colors.bg }]}>

          {/* Drag handle */}
          <View style={[s.gsDragHandle, { backgroundColor: colors.borderStrong }]} />

          {/* Header */}
          <View style={s.gsHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[s.gsTitle, { color: colors.text }]}>Set Goals</Text>
              <Text style={[s.gsSubtitle, { color: colors.textMuted }]}>
                Daily targets for {childName} ({ageLabel}) · scale with your date range
              </Text>
            </View>
            <Pressable onPress={onClose} style={[s.gsCloseBtn, { backgroundColor: StickerPalette.paper, borderColor: DIAPER_STICKER_INK, borderWidth: 1.5 }]}>
              <X size={16} color={DIAPER_STICKER_INK} strokeWidth={2.2} />
            </Pressable>
          </View>

          {/* Age suggestion banner — sticker pill */}
          <View style={[s.gsAgeBanner, { backgroundColor: StickerPalette.blueSoft, borderWidth: 1.5, borderColor: DIAPER_STICKER_INK }]}>
            <Sparkles size={12} color={DIAPER_STICKER_INK} strokeWidth={2.2} />
            <Text style={[s.gsAgeBannerText, { color: DIAPER_STICKER_INK }]}>
              Suggested for age {ageLabel} · CDC / WHO guidelines
            </Text>
          </View>

          {/* Goal cards — sticker rows */}
          <ScrollView
            style={{ maxHeight: 360 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.gsCardList}
          >
            {metrics.map((m, idx) => {
              const Icon = m.icon
              const stickerFill =
                m.key === 'sleep' ? StickerPalette.blueSoft :
                m.key === 'feedings' || m.key === 'feedingMl' ? StickerPalette.pinkSoft :
                m.key === 'calories' ? StickerPalette.peachSoft :
                StickerPalette.greenSoft
              const tilt = (idx % 2 === 0 ? -0.6 : 0.6)
              return (
                <View
                  key={m.key}
                  style={[
                    s.gsCard,
                    {
                      backgroundColor: StickerPalette.paper,
                      borderColor: DIAPER_STICKER_INK,
                      borderWidth: 1.5,
                      shadowColor: DIAPER_STICKER_INK,
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.1,
                      shadowRadius: 6,
                      elevation: 2,
                      transform: [{ rotate: `${tilt}deg` }],
                    },
                  ]}
                >
                  <View
                    style={[
                      s.gsCardIcon,
                      { backgroundColor: stickerFill, borderWidth: 1.5, borderColor: DIAPER_STICKER_INK },
                    ]}
                  >
                    <Icon size={20} color={DIAPER_STICKER_INK} strokeWidth={2} />
                  </View>
                  <View style={s.gsCardInfo}>
                    <Text style={[s.gsCardLabel, { color: DIAPER_STICKER_INK }]}>{m.label}</Text>
                    <Text style={[s.gsCardDesc, { color: '#6E6763' }]}>{m.desc}</Text>
                  </View>
                  <View style={s.gsStepper}>
                    <Pressable
                      onPress={() => m.setValue(String(Math.max(0, (Number(m.value) || 0) - m.step)))}
                      style={[s.gsStepBtn, { backgroundColor: StickerPalette.cream, borderColor: DIAPER_STICKER_INK, borderWidth: 1.5 }]}
                      hitSlop={6}
                    >
                      <Minus size={13} color={DIAPER_STICKER_INK} strokeWidth={2.4} />
                    </Pressable>
                    <View style={s.gsStepValue}>
                      <Text style={[s.gsStepNum, { color: DIAPER_STICKER_INK, fontFamily: 'Fraunces_700Bold' }]}>{m.value || '0'}</Text>
                      <Text style={[s.gsStepUnit, { color: '#6E6763' }]}>
                        {m.unit.split('/')[0]}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => m.setValue(String((Number(m.value) || 0) + m.step))}
                      style={[s.gsStepBtn, { backgroundColor: StickerPalette.cream, borderColor: DIAPER_STICKER_INK, borderWidth: 1.5 }]}
                      hitSlop={6}
                    >
                      <Plus size={13} color={DIAPER_STICKER_INK} strokeWidth={2.4} />
                    </Pressable>
                  </View>
                </View>
              )
            })}
          </ScrollView>

          {/* Footer — sticker buttons */}
          <View style={s.gsFooter}>
            <Pressable
              onPress={handleReset}
              style={[
                s.gsUseSuggestedBtn,
                { borderColor: DIAPER_STICKER_INK, borderWidth: 1.5, backgroundColor: StickerPalette.paper },
              ]}
            >
              <Sparkles size={13} color={DIAPER_STICKER_INK} strokeWidth={2.2} />
              <Text style={[s.gsUseSuggestedText, { color: DIAPER_STICKER_INK }]}>Use Suggested</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              style={[
                s.gsSaveBtn,
                {
                  backgroundColor: StickerPalette.coral,
                  borderWidth: 1.5,
                  borderColor: DIAPER_STICKER_INK,
                  shadowColor: DIAPER_STICKER_INK,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 4,
                },
              ]}
            >
              <Text style={[s.gsSaveBtnText, { color: DIAPER_STICKER_INK }]}>Save Goals</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ─── Reminder Row (shared between home + modal) ──────────────────────────────

function ReminderRow({
  r, isLast, onToggle, onDelete, onEdit, onFlag, colors, allChildren, isDragging, dragHandleProps,
}: {
  r: Reminder; isLast: boolean; onToggle: () => void; onDelete: () => void; onEdit: (id: string, newText: string) => void; colors: any
  onFlag?: () => void; allChildren?: ChildWithRole[]; isDragging?: boolean; dragHandleProps?: object
}) {
  const { isDark, stickers } = useTheme()
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due = r.dueDate ? new Date(r.dueDate + 'T00:00:00') : null
  const diffDays = due ? Math.round((due.getTime() - today.getTime()) / 86400000) : null
  const isOverdue = !r.done && diffDays !== null && diffDays < 0
  const isDueToday = !r.done && diffDays === 0
  const isDueSoon = !r.done && diffDays !== null && diffDays > 0 && diffDays <= 3
  const dueDateColor = isOverdue ? brand.error : isDueToday ? '#C08000' : isDueSoon ? brand.warning : colors.textMuted
  const timeSuffix = r.dueTime ? ` · ${formatTime12h(r.dueTime)}` : ''
  const dueDateLabel = due
    ? isOverdue ? `${Math.abs(diffDays!)}d overdue${timeSuffix}`
    : isDueToday ? `Due today${timeSuffix}`
    : `Due ${due.toLocaleDateString('en', { month: 'short', day: 'numeric' })}${timeSuffix}`
    : null

  const taggedChild = allChildren && r.childId ? allChildren.find(c => c.id === r.childId) : null
  const taggedChildIdx = taggedChild && allChildren ? allChildren.findIndex(c => c.id === taggedChild.id) : -1
  const tagColor = taggedChildIdx >= 0 ? CHILD_COLORS[taggedChildIdx % CHILD_COLORS.length] : brand.kids

  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(r.text)

  function commitEdit() {
    const trimmed = editText.trim()
    if (trimmed && trimmed !== r.text) onEdit(r.id, trimmed)
    setEditing(false)
  }

  // Card tint by status
  const cardBg = r.done
    ? (isDark ? 'rgba(189,212,140,0.12)' : '#EDF5E2')
    : isOverdue
    ? (isDark ? 'rgba(238,123,109,0.10)' : '#FFF0ED')
    : r.flagged
    ? (isDark ? 'rgba(245,214,82,0.10)' : '#FFFBE6')
    : isDueToday
    ? (isDark ? 'rgba(245,214,82,0.08)' : '#FFFDE8')
    : isDragging
    ? (isDark ? brand.kids + '18' : brand.kidsSoft)
    : (isDark ? colors.surface : '#FFFEF8')

  const cardBorder = r.done
    ? (isDark ? 'rgba(189,212,140,0.28)' : 'rgba(189,212,140,0.65)')
    : isOverdue
    ? (isDark ? 'rgba(238,123,109,0.28)' : 'rgba(238,123,109,0.38)')
    : r.flagged || isDueToday
    ? (isDark ? 'rgba(245,214,82,0.28)' : 'rgba(245,214,82,0.65)')
    : isDragging
    ? (isDark ? brand.kids + '50' : brand.kids + '80')
    : (isDark ? colors.border : 'rgba(20,19,19,0.1)')

  // Icon badge color
  const badgeBg = r.done
    ? stickers.green
    : isOverdue
    ? '#EE7B6D'
    : r.flagged || isDueToday
    ? stickers.yellow
    : stickers.blue

  const badgeIconColor = (r.done || r.flagged || isDueToday) ? '#141313' : isOverdue ? '#FFFFFF' : '#141313'

  return (
    <View style={{
      backgroundColor: cardBg,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: cardBorder,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      shadowColor: '#141313',
      shadowOpacity: isDark ? 0 : 0.05,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
    }}>
      {/* Drag handle */}
      <View style={{ paddingTop: 10, opacity: 0.22 }} {...(dragHandleProps ?? {})}>
        <GripVertical size={13} color={colors.textMuted} strokeWidth={2} />
      </View>

      {/* Sticker badge — tappable checkbox */}
      <Pressable
        onPress={onToggle}
        style={{
          width: 36, height: 36, borderRadius: 18,
          backgroundColor: badgeBg,
          borderWidth: 1.5,
          borderColor: isDark ? 'rgba(255,255,255,0.18)' : '#141313',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {r.done
          ? <Check size={14} color={badgeIconColor} strokeWidth={3} />
          : isOverdue
          ? <Bell size={13} color={badgeIconColor} strokeWidth={2.5} />
          : (isDueToday || r.flagged)
          ? <Clock size={13} color={badgeIconColor} strokeWidth={2.5} />
          : <View style={{ width: 11, height: 11, borderRadius: 6, borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(20,19,19,0.35)' }} />
        }
      </Pressable>

      {/* Text + tags */}
      <View style={{ flex: 1, gap: 6, paddingTop: 2 }}>
        {editing ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TextInput
              style={{ fontSize: 15, fontFamily: 'Fraunces_600SemiBold', color: colors.text, flex: 1, borderBottomWidth: 1, borderBottomColor: brand.kids, paddingVertical: 2 }}
              value={editText}
              onChangeText={setEditText}
              onSubmitEditing={commitEdit}
              onBlur={commitEdit}
              autoFocus
              returnKeyType="done"
            />
            <Pressable onPress={commitEdit} hitSlop={8}>
              <Check size={14} color="#BDD48C" strokeWidth={2.5} />
            </Pressable>
            <Pressable onPress={() => { setEditText(r.text); setEditing(false) }} hitSlop={8}>
              <X size={14} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
          </View>
        ) : (
          <Text
            style={{
              fontSize: 15,
              fontFamily: r.done ? 'DMSans_400Regular' : 'Fraunces_600SemiBold',
              color: r.done ? colors.textMuted : (isDark ? colors.text : '#141313'),
              textDecorationLine: r.done ? 'line-through' : 'none',
              lineHeight: 21,
            }}
            numberOfLines={2}
          >{r.text}</Text>
        )}

        {/* Tags row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 }}>
          {taggedChild && (
            <View style={[
              s.reminderChildTag,
              {
                backgroundColor: isDark ? tagColor + '22' : tagColor + '30',
                borderColor: isDark ? tagColor + '60' : '#141313',
                borderWidth: 1.2,
                paddingHorizontal: 9,
                paddingVertical: 4,
              },
            ]}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tagColor, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.4)' : '#141313' }} />
              <Text style={[s.reminderChildTagText, { color: isDark ? tagColor : '#141313', fontFamily: 'DMSans_700Bold' }]}>{taggedChild.name}</Text>
            </View>
          )}
          {dueDateLabel && (() => {
            const dueBg = isOverdue
              ? (isDark ? brand.error + '22' : '#F5B896')
              : isDueToday
                ? (isDark ? '#F5D65222' : '#F5D652')
                : (isDark ? colors.surfaceRaised : '#FFFEF8')
            const dueBorder = isDark
              ? isOverdue ? brand.error + '60' : isDueToday ? '#F5D65270' : colors.border
              : '#141313'
            const dueInk = isDark
              ? dueDateColor
              : isOverdue ? '#7A1F12' : isDueToday ? '#5A4400' : '#141313'
            return (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                backgroundColor: dueBg,
                borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4,
                borderWidth: 1.2, borderColor: dueBorder,
              }}>
                <Clock size={9} color={dueInk} strokeWidth={2.5} />
                <Text style={[s.reminderDueText, { color: dueInk, fontFamily: 'DMSans_700Bold' }]}>{dueDateLabel}</Text>
              </View>
            )
          })()}
          {r.done && r.archivedAt && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              backgroundColor: isDark ? '#BDD48C22' : '#BDD48C',
              borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4,
              borderWidth: 1.2, borderColor: isDark ? '#BDD48C60' : '#141313',
            }}>
              <Check size={9} color={isDark ? '#BDD48C' : '#141313'} strokeWidth={2.5} />
              <Text style={[s.reminderDueText, { color: isDark ? '#BDD48C' : '#141313', fontFamily: 'DMSans_700Bold' }]}>
                Done {new Date(r.archivedAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Actions column */}
      <View style={{ alignItems: 'center', gap: 10, paddingTop: 4 }}>
        {!editing && !r.done && (
          <Pressable onPress={() => { setEditText(r.text); setEditing(true) }} hitSlop={12}>
            <Pencil size={13} color={colors.textFaint} strokeWidth={2} />
          </Pressable>
        )}
        {onFlag && (
          <Pressable onPress={onFlag} hitSlop={12}>
            <Flag size={13} color={r.flagged ? '#F5D652' : colors.textFaint} fill={r.flagged ? '#F5D652' : 'transparent'} strokeWidth={2} />
          </Pressable>
        )}
        <Pressable onPress={onDelete} hitSlop={12}>
          <Trash2 size={13} color={colors.textFaint} strokeWidth={2} />
        </Pressable>
      </View>
    </View>
  )
}


// ─── Draggable Reminder List ──────────────────────────────────────────────────

function DraggableReminderList({
  items, onReorder, onToggle, onDelete, onEdit, onFlag, colors, allChildren, radius, onDragStateChange,
}: {
  items: Reminder[]
  onReorder: (newItems: Reminder[]) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (id: string, newText: string) => void
  onFlag: (id: string) => void
  colors: any
  allChildren?: ChildWithRole[]
  radius: any
  onDragStateChange?: (isDragging: boolean) => void
}) {
  const localItemsRef = useRef<Reminder[]>(items)
  const [localItems, setLocalItems] = useState<Reminder[]>(items)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const startIdxRef = useRef(0)
  const currentIdxRef = useRef(0)
  const itemHeightRef = useRef(76)
  const panRespondersRef = useRef<Record<string, ReturnType<typeof PanResponder.create>>>({})

  useEffect(() => {
    localItemsRef.current = items
    setLocalItems(items)
    // Clear cached pan responders when items change from outside
    panRespondersRef.current = {}
  }, [items])

  function getOrCreatePanResponder(id: string) {
    if (!panRespondersRef.current[id]) {
      panRespondersRef.current[id] = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 3,
        onPanResponderGrant: () => {
          const idx = localItemsRef.current.findIndex((i: Reminder) => i.id === id)
          startIdxRef.current = idx
          currentIdxRef.current = idx
          setDraggingId(id)
          onDragStateChange?.(true)
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        },
        onPanResponderMove: (_, gs) => {
          const rawIdx = startIdxRef.current + Math.round(gs.dy / itemHeightRef.current)
          const newIdx = Math.max(0, Math.min(localItemsRef.current.length - 1, rawIdx))
          if (newIdx !== currentIdxRef.current) {
            const reordered = [...localItemsRef.current]
            const [moved] = reordered.splice(currentIdxRef.current, 1)
            reordered.splice(newIdx, 0, moved)
            currentIdxRef.current = newIdx
            localItemsRef.current = reordered
            setLocalItems([...reordered])
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          }
        },
        onPanResponderRelease: () => {
          setDraggingId(null)
          onDragStateChange?.(false)
          onReorder([...localItemsRef.current])
        },
        onPanResponderTerminate: () => {
          setDraggingId(null)
          onDragStateChange?.(false)
        },
      })
    }
    return panRespondersRef.current[id]
  }

  return (
    <View style={{ gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}>
      {localItems.map((r, i) => {
        const isDragging = draggingId === r.id
        const pr = getOrCreatePanResponder(r.id)
        return (
          <View
            key={r.id}
            onLayout={(e) => { itemHeightRef.current = e.nativeEvent.layout.height }}
          >
            <ReminderRow
              r={r}
              isLast={i === localItems.length - 1}
              onToggle={() => onToggle(r.id)}
              onDelete={() => onDelete(r.id)}
              onEdit={onEdit}
              onFlag={() => onFlag(r.id)}
              colors={colors}
              allChildren={allChildren}
              isDragging={isDragging}
              dragHandleProps={pr.panHandlers}
            />
          </View>
        )
      })}
    </View>
  )
}

// ─── Reminders Full-Screen Modal ─────────────────────────────────────────────

function RemindersModal({
  visible, onClose, reminders, onToggle, onDelete, onEdit, onFlag, onReorder, colors, allChildren,
}: {
  visible: boolean; onClose: () => void; reminders: Reminder[]
  onToggle: (id: string) => void; onDelete: (id: string) => void; onEdit: (id: string, newText: string) => void; colors: any
  onFlag: (id: string) => void; onReorder: (items: Reminder[]) => void
  allChildren?: ChildWithRole[]
}) {
  const { radius, isDark } = useTheme()
  const [tab, setTab] = useState<'active' | 'archived'>('active')
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)
  const [isDraggingReminder, setIsDraggingReminder] = useState(false)

  const filteredReminders = selectedChildId
    ? reminders.filter(r => r.childId === selectedChildId)
    : reminders

  const active = filteredReminders.filter(r => !r.done)
  const archived = filteredReminders.filter(r => r.done).sort((a, b) =>
    (b.archivedAt ?? '').localeCompare(a.archivedAt ?? '')
  )
  const total = filteredReminders.length
  const completedCount = archived.length
  const completionRate = total > 0 ? Math.round((completedCount / total) * 100) : 0

  // Completed this week
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
  const thisWeek = archived.filter(r => r.archivedAt && new Date(r.archivedAt) >= weekAgo).length

  // All children to show in filter (always visible when multiple kids)
  const childrenWithReminders = useMemo(() => {
    if (!allChildren || allChildren.length <= 1) return []
    return allChildren
  }, [allChildren])

  // Group archived by completion date (archivedAt date)
  const archivedByDate = useMemo(() => {
    const today = localDateStr(new Date())
    const yd = new Date(); yd.setDate(yd.getDate() - 1)
    const yesterday = localDateStr(yd)
    const groups: Record<string, { label: string; items: Reminder[] }> = {}
    for (const r of archived) {
      const date = r.archivedAt ? r.archivedAt.split('T')[0] : 'unknown'
      let label = date === today ? 'Today' : date === yesterday ? 'Yesterday'
        : date === 'unknown' ? 'Earlier'
        : new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
      if (!groups[date]) groups[date] = { label, items: [] }
      groups[date].items.push(r)
    }
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([, { label, items }]) => ({ label, items }))
  }, [archived])

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[s.reminderModalOverlay]}>
      <View style={[s.reminderModal, { backgroundColor: isDark ? colors.bg : '#FFFEF8' }]}>
        {/* Drag handle */}
        <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
          <View style={{ width: 42, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
        </View>

        {/* Header */}
        <View style={[s.reminderModalHeader, { borderBottomColor: 'transparent' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {/* Bell sticker accent */}
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5D652', borderWidth: 1.5, borderColor: '#141313', alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={16} color="#141313" strokeWidth={2} />
            </View>
            <Text style={[s.reminderModalTitle, { color: colors.text }]}>Reminders</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={12}>
            <View style={{ width: 34, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border }}>
              <X size={15} color={colors.textMuted} strokeWidth={2.5} />
            </View>
          </Pressable>
        </View>

        {/* Metric tiles — three sticker-colored cards */}
        <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 20, marginTop: 4, marginBottom: 4 }}>
          {/* Active */}
          <View style={{ flex: 1, backgroundColor: '#F5B896', borderRadius: 16, borderWidth: 1.5, borderColor: '#141313', paddingVertical: 12, alignItems: 'center', gap: 2 }}>
            <Text style={{ fontSize: 26, fontFamily: 'Fraunces_600SemiBold', color: '#141313', letterSpacing: -0.5 }}>{active.length}</Text>
            <Text style={{ fontSize: 9, fontFamily: 'DMSans_600SemiBold', color: '#141313', textTransform: 'uppercase', letterSpacing: 1.2, opacity: 0.7 }}>Active</Text>
          </View>
          {/* Done this week */}
          <View style={{ flex: 1, backgroundColor: '#BDD48C', borderRadius: 16, borderWidth: 1.5, borderColor: '#141313', paddingVertical: 12, alignItems: 'center', gap: 2 }}>
            <Text style={{ fontSize: 26, fontFamily: 'Fraunces_600SemiBold', color: '#141313', letterSpacing: -0.5 }}>{thisWeek}</Text>
            <Text style={{ fontSize: 9, fontFamily: 'DMSans_600SemiBold', color: '#141313', textTransform: 'uppercase', letterSpacing: 1.2, opacity: 0.7 }}>Done this week</Text>
          </View>
          {/* Completion */}
          <View style={{ flex: 1, backgroundColor: '#9DC3E8', borderRadius: 16, borderWidth: 1.5, borderColor: '#141313', paddingVertical: 12, alignItems: 'center', gap: 2 }}>
            <Text style={{ fontSize: 26, fontFamily: 'Fraunces_600SemiBold', color: '#141313', letterSpacing: -0.5 }}>{completionRate}%</Text>
            <Text style={{ fontSize: 9, fontFamily: 'DMSans_600SemiBold', color: '#141313', textTransform: 'uppercase', letterSpacing: 1.2, opacity: 0.7 }}>Completion</Text>
          </View>
        </View>

        {/* Kid filter pills — sticker-on-paper style */}
        {childrenWithReminders.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 }}
          >
            {/* All pill */}
            {(() => {
              const isAll = selectedChildId === null
              return (
                <Pressable
                  key="all"
                  onPress={() => setSelectedChildId(null)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    borderRadius: 999,
                    borderWidth: 1.5,
                    backgroundColor: isAll ? '#F5D652' : (isDark ? colors.surface : '#FFFEF8'),
                    borderColor: isDark ? (isAll ? '#F5D652' : colors.border) : '#141313',
                  }}
                >
                  {/* Mini stack of kid dots — visual cue that "All" includes every kid */}
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {childrenWithReminders.slice(0, 3).map((c, i) => {
                      const idx = (allChildren ?? []).findIndex(ch => ch.id === c.id)
                      const dotColor = CHILD_COLORS[idx % CHILD_COLORS.length]
                      return (
                        <View
                          key={c.id}
                          style={{
                            width: 10, height: 10, borderRadius: 5,
                            backgroundColor: dotColor,
                            borderWidth: 1, borderColor: '#141313',
                            marginLeft: i === 0 ? 0 : -4,
                          }}
                        />
                      )
                    })}
                  </View>
                  <Text style={{ fontSize: 13, fontFamily: 'DMSans_700Bold', letterSpacing: 0.2, color: isDark ? (isAll ? '#141313' : colors.text) : '#141313' }}>All</Text>
                </Pressable>
              )
            })()}
            {/* Per-child pills */}
            {childrenWithReminders.map((c) => {
              const idx = (allChildren ?? []).findIndex(ch => ch.id === c.id)
              const kidColor = CHILD_COLORS[idx % CHILD_COLORS.length]
              const isActive = selectedChildId === c.id
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setSelectedChildId(c.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: 999,
                    borderWidth: 1.5,
                    backgroundColor: isActive ? kidColor : (isDark ? colors.surface : '#FFFEF8'),
                    borderColor: isDark ? (isActive ? kidColor : colors.border) : '#141313',
                  }}
                >
                  <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: kidColor, borderWidth: 1, borderColor: '#141313' }} />
                  <Text style={{ fontSize: 13, fontFamily: 'DMSans_700Bold', letterSpacing: 0.2, color: isDark ? (isActive ? '#141313' : colors.text) : '#141313' }}>{c.name}</Text>
                </Pressable>
              )
            })}
          </ScrollView>
        )}

        {/* Tabs — segmented pill */}
        <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 }}>
          <View style={{
            flexDirection: 'row',
            backgroundColor: isDark ? colors.surface : '#FFFEF8',
            borderRadius: 999,
            borderWidth: 1.5,
            borderColor: isDark ? colors.border : 'rgba(20,19,19,0.12)',
            padding: 4,
            gap: 4,
          }}>
            {(['active', 'archived'] as const).map(t => {
              const isOn = tab === t
              return (
                <Pressable
                  key={t}
                  onPress={() => setTab(t)}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 10,
                    borderRadius: 999,
                    backgroundColor: isOn ? '#141313' : 'transparent',
                  }}
                >
                  <Text style={{
                    fontSize: 14,
                    fontFamily: isOn ? 'Fraunces_600SemiBold' : 'DMSans_600SemiBold',
                    color: isOn ? '#FFFEF8' : (isDark ? colors.textMuted : 'rgba(20,19,19,0.55)'),
                    letterSpacing: -0.1,
                  }}>
                    {t === 'active' ? `Active · ${active.length}` : `Archived · ${archived.length}`}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        {/* List */}
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} scrollEnabled={!isDraggingReminder}>
          {tab === 'active' ? (
            active.length === 0 ? (
              <View style={s.reminderModalEmpty}>
                <FlowerSticker size={48} petal="#BDD48C" center="#F5D652" stroke="#141313" />
                <Text style={[s.remindersEmptyText, { color: colors.textSecondary }]}>No active reminders</Text>
              </View>
            ) : (
              <View style={{ marginHorizontal: 16, marginTop: 16 }}>
                <DraggableReminderList
                  items={active}
                  onReorder={(reordered) => {
                    const archived = reminders.filter(r => r.done)
                    if (!selectedChildId) {
                      onReorder([...reordered, ...archived])
                    } else {
                      const otherActive = reminders.filter(r => !r.done && r.childId !== selectedChildId)
                      onReorder([...reordered, ...otherActive, ...archived])
                    }
                  }}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onFlag={onFlag}
                  colors={colors}
                  allChildren={allChildren}
                  radius={radius}
                  onDragStateChange={setIsDraggingReminder}
                />
              </View>
            )
          ) : archivedByDate.length === 0 ? (
            <View style={s.reminderModalEmpty}>
              <StarSticker size={48} fill="#F5D652" stroke="#141313" />
              <Text style={[s.remindersEmptyText, { color: colors.textSecondary }]}>Nothing archived yet</Text>
            </View>
          ) : (
            archivedByDate.map(({ label, items }) => (
              <View key={label} style={{ marginHorizontal: 16, marginTop: 16 }}>
                <Text style={{ fontSize: 10, fontFamily: 'DMSans_600SemiBold', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 }}>{label}</Text>
                <View style={{ gap: 8 }}>
                  {items.map((r, i) => (
                    <ReminderRow
                      key={r.id}
                      r={r}
                      isLast={i === items.length - 1}
                      onToggle={() => onToggle(r.id)}
                      onDelete={() => onDelete(r.id)}
                      onEdit={onEdit}
                      colors={colors}
                      allChildren={allChildren}
                    />
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
      </View>
    </Modal>
  )
}

// ─── Growth Leap Card ───────────────────────────────────────────────────────

function GrowthLeapCard({ leap, childName }: { leap: NonNullable<ReturnType<typeof getGrowthLeap>>; childName: string }) {
  const { colors, isDark } = useTheme()
  const [showDetail, setShowDetail] = useState(false)
  const isActive = leap.status === 'active'
  const isDone = leap.status === 'done'
  const leapColor = leap.color || brand.kids
  const phaseIndex = isActive ? (leap.phaseIndex ?? 0) : -1
  const currentPhaseName = phaseIndex >= 0 ? (leap.phases[phaseIndex]?.label ?? '') : ''

  const stickerInk = isDark ? 'rgba(255,255,255,0.18)' : '#141313'
  const ink = isDark ? colors.text : '#141313'
  const ink3 = isDark ? colors.textMuted : 'rgba(20,19,19,0.55)'

  // Sticker-green soft for "done", mode-color soft for active, paper otherwise
  const bg = isDone
    ? (isDark ? 'rgba(189,212,140,0.16)' : '#EDF5E2')
    : isActive
      ? (isDark ? leapColor + '18' : leapColor + '20')
      : (isDark ? colors.surface : '#FFFEF8')
  const border = isDone
    ? (isDark ? 'rgba(189,212,140,0.35)' : 'rgba(20,19,19,0.12)')
    : isActive
      ? (isDark ? leapColor + '40' : 'rgba(20,19,19,0.12)')
      : (isDark ? colors.border : 'rgba(20,19,19,0.12)')

  // Number badge (sticker style — full sticker color + ink border + white inner)
  const badgeFill = isDone ? '#BDD48C' : isActive ? leapColor : '#F5D652'

  return (
    <View>
      {/* ── Compact card ── */}
      <Pressable
        onPress={() => setShowDetail(true)}
        style={[s.leapCard, {
          backgroundColor: bg, borderColor: border, borderWidth: 1.5,
          shadowColor: '#141313',
          shadowOpacity: isDark ? 0 : 0.05,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
        }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {/* Sticker number badge */}
          <View style={{
            width: 44, height: 44, borderRadius: 22,
            backgroundColor: badgeFill,
            borderWidth: 1.5, borderColor: stickerInk,
            alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {isDone
              ? <Check size={18} color={isDark ? '#FFFFFF' : '#141313'} strokeWidth={3} />
              : <Text style={{ fontSize: 18, fontFamily: 'Fraunces_700Bold', color: isDark ? '#FFFFFF' : '#141313', letterSpacing: -0.4 }}>{leap.index + 1}</Text>
            }
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.leapTitle, { color: ink }]}>{isDone ? 'All Leaps Complete' : leap.name}</Text>
            <Text style={[s.leapDesc, { color: ink3 }]}>
              {isDone ? 'Your child has completed all 10 Wonder Weeks' : isActive && currentPhaseName ? `Phase: ${currentPhaseName}` : leap.desc}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <View style={{
              paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
              borderWidth: 1.5,
              backgroundColor: isActive
                ? (isDark ? leapColor + '22' : '#FFFEF8')
                : isDone
                  ? (isDark ? brand.success + '22' : '#FFFEF8')
                  : (isDark ? colors.surfaceGlass : '#FFFEF8'),
              borderColor: stickerInk,
            }}>
              <Text style={{
                fontSize: 10, fontFamily: 'DMSans_700Bold',
                textTransform: 'uppercase', letterSpacing: 0.8,
                color: isActive ? (isDark ? leapColor : '#141313') : isDone ? (isDark ? brand.success : '#141313') : (isDark ? colors.textMuted : '#141313'),
              }}>
                {isActive ? 'NOW' : isDone ? 'ALL DONE' : `In ${(leap as any).weeksUntil ?? '?'}w`}
              </Text>
            </View>
            <ChevronRight size={14} color={ink3} strokeWidth={2} />
          </View>
        </View>

        {/* 10-dot progress */}
        <View style={s.leapAllDots}>
          {GROWTH_LEAPS.map((_, i) => {
            const done = i < leap.completedCount
            const active = i === leap.index && isActive
            const upcoming = i === leap.index && !isActive && !isDone
            const dotBg = done ? '#BDD48C' : active ? leapColor : upcoming ? 'transparent' : (isDark ? colors.border : 'rgba(20,19,19,0.06)')
            return (
              <View
                key={i}
                style={[s.leapAllDot, {
                  backgroundColor: dotBg,
                  borderWidth: 1.5,
                  borderColor: done || active || upcoming ? stickerInk : (isDark ? colors.border : 'rgba(20,19,19,0.18)'),
                  width: 16, height: 16, borderRadius: 999,
                },
                  active && { transform: [{ scale: 1.25 }] },
                ]}
              >
                {done && <Check size={9} color={isDark ? '#FFFFFF' : '#141313'} strokeWidth={3} />}
              </View>
            )
          })}
        </View>
        <Text style={{
          fontSize: 11, fontFamily: 'DMSans_600SemiBold', textAlign: 'center',
          color: ink3, marginTop: 4,
        }}>
          {isDone ? `All ${GROWTH_LEAPS.length} leaps completed · Wk ${leap.weekAge}` : `${leap.completedCount}/${GROWTH_LEAPS.length} leaps completed · Wk ${leap.week}`}
        </Text>
      </Pressable>

      {/* ── Detail modal ── */}
      <GrowthLeapDetail
        visible={showDetail}
        onClose={() => setShowDetail(false)}
        leap={leap}
        childName={childName}
        isActive={isActive}
        phaseIndex={phaseIndex}
        leapColor={leapColor}
      />
    </View>
  )
}

// Emojis per leap (used as paper "stickers" in detail modals)
const LEAP_EMOJI = ['👁️', '🔁', '💫', '🎬', '🔗', '📚', '🔢', '🧩', '⚖️', '🌍']
const PHASE_EMOJI = ['🌧️', '🚀', '🌟']

function GrowthLeapDetail({ visible, onClose, leap, childName, isActive, phaseIndex, leapColor }: {
  visible: boolean
  onClose: () => void
  leap: NonNullable<ReturnType<typeof getGrowthLeap>>
  childName: string
  isActive: boolean
  phaseIndex: number
  leapColor: string
}) {
  const { colors, isDark } = useTheme()
  const [selectedLeapIdx, setSelectedLeapIdx] = useState<number | null>(null)
  const gl = GROWTH_LEAPS[leap.index]
  if (!gl) return null

  const isDone = leap.status === 'done'
  const phaseDone = [phaseIndex > 0, phaseIndex > 1, false]
  const phaseCurrent = [phaseIndex === 0, phaseIndex === 1, phaseIndex === 2]

  // Paper tokens
  const paperBg = isDark ? colors.bg : '#F3ECD9'
  const paper = isDark ? colors.surface : '#FFFEF8'
  const ink = isDark ? colors.text : '#141313'
  const ink2 = isDark ? colors.textSecondary : '#3A3533'
  const ink3 = isDark ? colors.textMuted : '#6E6763'
  const line = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const yellowSoft = isDark ? 'rgba(245,214,82,0.20)' : '#FBEA9E'
  const pinkSoft = isDark ? 'rgba(242,178,199,0.20)' : '#F9D8E2'
  const blueSoft = isDark ? 'rgba(157,195,232,0.20)' : '#CFE0F0'
  const greenSoft = isDark ? 'rgba(189,212,140,0.20)' : '#DDE7BB'
  const lilacSoft = isDark ? 'rgba(200,182,232,0.20)' : '#E3D8F2'

  // Hero badge
  const heroBadgeText = isActive ? 'IN PROGRESS' : isDone ? 'ALL DONE' : `IN ${(leap as any).weeksUntil ?? '?'}W`
  const heroBadgeBg = isActive ? yellowSoft : isDone ? greenSoft : blueSoft
  const heroBadgeInk = isDone ? '#4A6F1D' : isActive ? '#6B5500' : '#1F4C7A'

  const heroEmoji = isDone ? '🎉' : LEAP_EMOJI[leap.index] ?? '✨'

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: paperBg }}>
        {/* Header — paper with soft divider */}
        <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: line }}>
          <Pressable onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: paper, borderWidth: 1, borderColor: line, alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color={ink2} strokeWidth={2} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontFamily: 'Fraunces_600SemiBold', color: ink, letterSpacing: -0.2 }}>Growth Leaps</Text>
            <Text style={{ fontSize: 11, fontFamily: 'DMSans_500Medium', color: ink3, marginTop: 1 }}>{childName} · Week {leap.weekAge}</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 56 }}>
          {/* Hero card — paper with sticker emoji corner */}
          <View style={{ margin: 16, gap: 14 }}>
            <View style={{
              backgroundColor: isDone ? greenSoft : lilacSoft,
              borderRadius: 24, borderWidth: 1, borderColor: line,
              padding: 18, gap: 12, position: 'relative', overflow: 'hidden',
            }}>
              {/* sticker emoji */}
              <View style={{ position: 'absolute', right: -6, top: -8, transform: [{ rotate: '12deg' }] }}>
                <EmojiSticker size={72} style={{ opacity: 0.85 }}>{heroEmoji}</EmojiSticker>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 11, fontFamily: 'DMSans_600SemiBold', color: ink3, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                  Leap #{leap.index + 1}
                </Text>
                <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: heroBadgeBg, borderWidth: 1, borderColor: line }}>
                  <Text style={{ fontSize: 10, fontFamily: 'DMSans_600SemiBold', color: heroBadgeInk, letterSpacing: 0.8 }}>
                    {heroBadgeText}
                  </Text>
                </View>
              </View>

              <Text style={{ fontSize: 28, fontFamily: 'Fraunces_600SemiBold', color: ink, letterSpacing: -0.6, lineHeight: 32, maxWidth: '78%' }}>
                {isDone ? 'All Leaps Complete' : gl.name}
              </Text>
              <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: ink2, lineHeight: 19, maxWidth: '85%' }}>
                {isDone ? `${childName} has completed all 10 Wonder Weeks` : gl.desc}
              </Text>
            </View>

            {/* Age & Duration pastel tile row */}
            {!isDone && (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1, backgroundColor: pinkSoft, borderRadius: 20, borderWidth: 1, borderColor: line, padding: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <EmojiSticker size={14}>📅</EmojiSticker>
                    <Text style={{ fontSize: 10, fontFamily: 'DMSans_600SemiBold', color: ink3, textTransform: 'uppercase', letterSpacing: 1.2 }}>Typical Age</Text>
                  </View>
                  <Text style={{ fontSize: 18, fontFamily: 'Fraunces_600SemiBold', color: ink, marginTop: 4, letterSpacing: -0.3 }}>{gl.ageRange}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: blueSoft, borderRadius: 20, borderWidth: 1, borderColor: line, padding: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <EmojiSticker size={14}>⏱️</EmojiSticker>
                    <Text style={{ fontSize: 10, fontFamily: 'DMSans_600SemiBold', color: ink3, textTransform: 'uppercase', letterSpacing: 1.2 }}>Duration</Text>
                  </View>
                  <Text style={{ fontSize: 18, fontFamily: 'Fraunces_600SemiBold', color: ink, marginTop: 4, letterSpacing: -0.3 }}>{gl.duration}</Text>
                </View>
              </View>
            )}

            {/* Brain note — paper card with 🧠 sticker header */}
            {!isDone && (
              <View style={{ backgroundColor: paper, borderRadius: 22, borderWidth: 1, borderColor: line, padding: 16, gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ transform: [{ rotate: '-6deg' }] }}>
                    <EmojiSticker size={22}>🧠</EmojiSticker>
                  </View>
                  <Text style={{ fontSize: 13, fontFamily: 'Fraunces_600SemiBold', color: ink, letterSpacing: -0.2 }}>
                    What's happening in the brain
                  </Text>
                </View>
                <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: ink2, lineHeight: 20 }}>
                  {gl.brainNote}
                </Text>
              </View>
            )}

            {/* Phase checklist — sticker-emoji card row */}
            {!isDone && (
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <EmojiSticker size={20}>🌊</EmojiSticker>
                  <Text style={{ fontSize: 13, fontFamily: 'Fraunces_600SemiBold', color: ink, letterSpacing: -0.2 }}>The 3 Phases</Text>
                </View>
                {gl.phases.map((phase, pi) => {
                  const done = phaseDone[pi]
                  const current = phaseCurrent[pi] && isActive
                  const phaseBg = current ? yellowSoft : done ? greenSoft : paper
                  return (
                    <View key={pi} style={{
                      backgroundColor: phaseBg,
                      borderRadius: 18, borderWidth: 1, borderColor: line,
                      padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center',
                    }}>
                      <EmojiSticker size={28}>{done ? '✅' : PHASE_EMOJI[pi]}</EmojiSticker>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ fontSize: 14, fontFamily: 'Fraunces_600SemiBold', color: ink, letterSpacing: -0.2 }}>
                          {phase.label}{current ? '  · now' : ''}
                        </Text>
                        <Text style={{ fontSize: 12, fontFamily: 'DMSans_400Regular', color: ink3, lineHeight: 17 }}>
                          {phase.desc}
                        </Text>
                      </View>
                    </View>
                  )
                })}
              </View>
            )}

            {/* Signs — coral sticker chips */}
            {!isDone && (
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <EmojiSticker size={20}>👀</EmojiSticker>
                  <Text style={{ fontSize: 13, fontFamily: 'Fraunces_600SemiBold', color: ink, letterSpacing: -0.2 }}>
                    {isActive ? `Signs ${childName} may show` : 'Signs to expect'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {gl.signs.map((sign, i) => (
                    <View key={i} style={{
                      paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
                      backgroundColor: pinkSoft, borderWidth: 1, borderColor: line,
                    }}>
                      <Text style={{ fontSize: 12, fontFamily: 'DMSans_500Medium', color: ink2 }}>
                        {sign}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Skills — paper bullet card */}
            {!isDone && (
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <EmojiSticker size={20}>💪</EmojiSticker>
                  <Text style={{ fontSize: 13, fontFamily: 'Fraunces_600SemiBold', color: ink, letterSpacing: -0.2 }}>
                    {isActive ? 'Skills emerging now' : 'Skills that will emerge'}
                  </Text>
                </View>
                <View style={{ backgroundColor: paper, borderRadius: 22, borderWidth: 1, borderColor: line, padding: 16, gap: 10 }}>
                  {gl.skills.map((skill, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                      <EmojiSticker size={14} style={{ marginTop: 1 }}>✨</EmojiSticker>
                      <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: ink2, flex: 1, lineHeight: 19 }}>
                        {skill}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Activities — numbered pastel cards */}
            {!isDone && (
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <EmojiSticker size={20}>🎯</EmojiSticker>
                  <Text style={{ fontSize: 13, fontFamily: 'Fraunces_600SemiBold', color: ink, letterSpacing: -0.2 }}>
                    Activities to support this leap
                  </Text>
                </View>
                <View style={{ gap: 8 }}>
                  {gl.activities.map((act, i) => (
                    <View key={i} style={{
                      backgroundColor: paper, borderRadius: 20, borderWidth: 1, borderColor: line,
                      padding: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start',
                    }}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: greenSoft, borderWidth: 1, borderColor: line, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 12, fontFamily: 'Fraunces_600SemiBold', color: ink }}>{i + 1}</Text>
                      </View>
                      <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: ink2, flex: 1, lineHeight: 19 }}>{act}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Tip — yellow sticker card */}
            {!isDone && (
              <View style={{
                backgroundColor: yellowSoft, borderRadius: 22, borderWidth: 1, borderColor: line,
                padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center',
              }}>
                <EmojiSticker size={30}>💡</EmojiSticker>
                <Text style={{ fontSize: 13, fontFamily: 'DMSans_500Medium', color: ink, flex: 1, lineHeight: 19 }}>{gl.tip}</Text>
              </View>
            )}

            {/* Done celebration */}
            {isDone && (
              <View style={{
                backgroundColor: greenSoft, borderRadius: 22, borderWidth: 1, borderColor: line,
                padding: 18, flexDirection: 'row', gap: 12, alignItems: 'center',
              }}>
                <EmojiSticker size={34}>🎉</EmojiSticker>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontFamily: 'Fraunces_600SemiBold', color: ink, letterSpacing: -0.2 }}>
                    Way to go, {childName}!
                  </Text>
                  <Text style={{ fontSize: 12, fontFamily: 'DMSans_400Regular', color: ink3, marginTop: 2 }}>
                    All 10 Wonder Weeks leaps complete.
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* All leaps list — paper rows with emoji stickers */}
          <View style={{ marginHorizontal: 16, marginTop: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <EmojiSticker size={20}>📖</EmojiSticker>
            <Text style={{ fontSize: 15, fontFamily: 'Fraunces_600SemiBold', color: ink, letterSpacing: -0.2 }}>All 10 Leaps</Text>
          </View>
          <View style={{ marginHorizontal: 16, gap: 6 }}>
            {GROWTH_LEAPS.map((g, i) => {
              const done = i < leap.completedCount
              const active = i === leap.index && isActive
              const allDone = isDone
              const rowEmoji = LEAP_EMOJI[i] ?? '✨'
              const badge = (done || allDone) ? 'DONE' : active ? 'NOW' : `WK ${g.week}`
              const badgeBg = (done || allDone) ? greenSoft : active ? yellowSoft : blueSoft
              const badgeInk = (done || allDone) ? '#4A6F1D' : active ? '#6B5500' : '#1F4C7A'
              return (
                <Pressable
                  key={i}
                  onPress={() => setSelectedLeapIdx(i)}
                  style={{
                    backgroundColor: active ? yellowSoft : paper,
                    borderRadius: 18, borderWidth: 1, borderColor: line,
                    padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10,
                    opacity: !done && !active && !allDone ? 0.78 : 1,
                  }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? colors.surface : '#FFFEF8', borderWidth: 1, borderColor: line, alignItems: 'center', justifyContent: 'center' }}>
                    <EmojiSticker size={18}>{done || allDone ? '✅' : rowEmoji}</EmojiSticker>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontFamily: 'Fraunces_600SemiBold', color: ink, letterSpacing: -0.2 }}>{g.name}</Text>
                    <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', color: ink3, marginTop: 1 }} numberOfLines={1}>{g.desc}</Text>
                  </View>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: badgeBg, borderWidth: 1, borderColor: line }}>
                    <Text style={{ fontSize: 10, fontFamily: 'DMSans_600SemiBold', color: badgeInk, letterSpacing: 0.8 }}>{badge}</Text>
                  </View>
                </Pressable>
              )
            })}
          </View>
        </ScrollView>
      </View>

      {/* Leap focus sheet — opens when a row is tapped */}
      {selectedLeapIdx !== null && (
        <LeapFocusSheet
          leapIdx={selectedLeapIdx}
          currentLeap={leap}
          isCurrentActive={isActive}
          currentPhaseIndex={phaseIndex}
          childName={childName}
          onClose={() => setSelectedLeapIdx(null)}
        />
      )}
    </Modal>
  )
}

function LeapFocusSheet({ leapIdx, currentLeap, isCurrentActive, currentPhaseIndex, childName, onClose }: {
  leapIdx: number
  currentLeap: NonNullable<ReturnType<typeof getGrowthLeap>>
  isCurrentActive: boolean
  currentPhaseIndex: number
  childName: string
  onClose: () => void
}) {
  const { colors, isDark } = useTheme()
  const g = GROWTH_LEAPS[leapIdx]
  if (!g) return null

  const isThisActive = leapIdx === currentLeap.index && isCurrentActive
  const isThisDone = leapIdx < currentLeap.completedCount

  const phaseDone = isThisActive ? [(currentPhaseIndex > 0), (currentPhaseIndex > 1), false] : isThisDone ? [true, true, true] : [false, false, false]
  const phaseCurrent = isThisActive ? [(currentPhaseIndex === 0), (currentPhaseIndex === 1), (currentPhaseIndex === 2)] : [false, false, false]

  // Paper tokens
  const paperBg = isDark ? colors.bg : '#F3ECD9'
  const paper = isDark ? colors.surface : '#FFFEF8'
  const ink = isDark ? colors.text : '#141313'
  const ink2 = isDark ? colors.textSecondary : '#3A3533'
  const ink3 = isDark ? colors.textMuted : '#6E6763'
  const line = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const yellowSoft = isDark ? 'rgba(245,214,82,0.20)' : '#FBEA9E'
  const pinkSoft = isDark ? 'rgba(242,178,199,0.20)' : '#F9D8E2'
  const blueSoft = isDark ? 'rgba(157,195,232,0.20)' : '#CFE0F0'
  const greenSoft = isDark ? 'rgba(189,212,140,0.20)' : '#DDE7BB'
  const lilacSoft = isDark ? 'rgba(200,182,232,0.20)' : '#E3D8F2'

  const badgeText = isThisActive ? 'IN PROGRESS' : isThisDone ? 'DONE' : `WEEK ${g.week}`
  const badgeBg = isThisActive ? yellowSoft : isThisDone ? greenSoft : blueSoft
  const badgeInk = isThisDone ? '#4A6F1D' : isThisActive ? '#6B5500' : '#1F4C7A'

  const heroEmoji = LEAP_EMOJI[leapIdx] ?? '✨'

  return (
    <Modal visible animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: paperBg }}>
        {/* Header — paper */}
        <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: line }}>
          <Pressable onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: paper, borderWidth: 1, borderColor: line, alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color={ink2} strokeWidth={2} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, fontFamily: 'DMSans_600SemiBold', color: ink3, textTransform: 'uppercase', letterSpacing: 1.5 }}>
              Leap #{leapIdx + 1}
            </Text>
            <Text style={{ fontSize: 18, fontFamily: 'Fraunces_600SemiBold', color: ink, letterSpacing: -0.2 }}>{g.name}</Text>
          </View>
          <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: badgeBg, borderWidth: 1, borderColor: line }}>
            <Text style={{ fontSize: 10, fontFamily: 'DMSans_600SemiBold', color: badgeInk, letterSpacing: 0.8 }}>{badgeText}</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 56, gap: 14 }}>
          {/* Hero card — paper with sticker emoji */}
          <View style={{
            backgroundColor: isThisDone ? greenSoft : lilacSoft,
            borderRadius: 24, borderWidth: 1, borderColor: line,
            padding: 18, gap: 8, position: 'relative', overflow: 'hidden',
          }}>
            <View style={{ position: 'absolute', right: -4, top: -6, transform: [{ rotate: '12deg' }] }}>
              <EmojiSticker size={72} style={{ opacity: 0.85 }}>{heroEmoji}</EmojiSticker>
            </View>
            <Text style={{ fontSize: 22, fontFamily: 'Fraunces_600SemiBold', color: ink, letterSpacing: -0.4, lineHeight: 26, maxWidth: '78%' }}>
              {g.desc}
            </Text>
            <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: ink2, lineHeight: 20, marginTop: 4, maxWidth: '92%' }}>
              {g.brainNote}
            </Text>
          </View>

          {/* Age & Duration row */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, backgroundColor: pinkSoft, borderRadius: 20, borderWidth: 1, borderColor: line, padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <EmojiSticker size={14}>📅</EmojiSticker>
                <Text style={{ fontSize: 10, fontFamily: 'DMSans_600SemiBold', color: ink3, textTransform: 'uppercase', letterSpacing: 1.2 }}>Typical Age</Text>
              </View>
              <Text style={{ fontSize: 18, fontFamily: 'Fraunces_600SemiBold', color: ink, marginTop: 4, letterSpacing: -0.3 }}>{g.ageRange}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: blueSoft, borderRadius: 20, borderWidth: 1, borderColor: line, padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <EmojiSticker size={14}>⏱️</EmojiSticker>
                <Text style={{ fontSize: 10, fontFamily: 'DMSans_600SemiBold', color: ink3, textTransform: 'uppercase', letterSpacing: 1.2 }}>Duration</Text>
              </View>
              <Text style={{ fontSize: 18, fontFamily: 'Fraunces_600SemiBold', color: ink, marginTop: 4, letterSpacing: -0.3 }}>{g.duration}</Text>
            </View>
          </View>

          {/* Phases */}
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <EmojiSticker size={20}>🌊</EmojiSticker>
              <Text style={{ fontSize: 13, fontFamily: 'Fraunces_600SemiBold', color: ink, letterSpacing: -0.2 }}>The 3 Phases</Text>
            </View>
            {g.phases.map((phase, pi) => {
              const done = phaseDone[pi]
              const current = phaseCurrent[pi]
              const phaseBg = current ? yellowSoft : done ? greenSoft : paper
              return (
                <View key={pi} style={{
                  backgroundColor: phaseBg,
                  borderRadius: 18, borderWidth: 1, borderColor: line,
                  padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center',
                }}>
                  <EmojiSticker size={28}>{done ? '✅' : PHASE_EMOJI[pi]}</EmojiSticker>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontSize: 14, fontFamily: 'Fraunces_600SemiBold', color: ink, letterSpacing: -0.2 }}>
                      {phase.label}{current ? '  · happening now' : ''}
                    </Text>
                    <Text style={{ fontSize: 12, fontFamily: 'DMSans_400Regular', color: ink3, lineHeight: 17 }}>
                      {phase.desc}
                    </Text>
                  </View>
                </View>
              )
            })}
          </View>

          {/* Signs — pink chips */}
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <EmojiSticker size={20}>👀</EmojiSticker>
              <Text style={{ fontSize: 13, fontFamily: 'Fraunces_600SemiBold', color: ink, letterSpacing: -0.2 }}>
                {isThisActive ? `Signs ${childName} may show` : 'Signs to watch for'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {g.signs.map((sign, i) => (
                <View key={i} style={{
                  paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
                  backgroundColor: pinkSoft, borderWidth: 1, borderColor: line,
                }}>
                  <Text style={{ fontSize: 12, fontFamily: 'DMSans_500Medium', color: ink2 }}>
                    {sign}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Skills — paper bullet list */}
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <EmojiSticker size={20}>💪</EmojiSticker>
              <Text style={{ fontSize: 13, fontFamily: 'Fraunces_600SemiBold', color: ink, letterSpacing: -0.2 }}>
                {isThisDone ? 'Skills gained' : isThisActive ? 'Skills emerging now' : 'Skills that will emerge'}
              </Text>
            </View>
            <View style={{ backgroundColor: paper, borderRadius: 22, borderWidth: 1, borderColor: line, padding: 16, gap: 10 }}>
              {g.skills.map((skill, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <EmojiSticker size={14} style={{ marginTop: 1 }}>{isThisDone ? '✅' : '✨'}</EmojiSticker>
                  <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: ink2, flex: 1, lineHeight: 19 }}>
                    {skill}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Activities — numbered paper cards */}
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <EmojiSticker size={20}>🎯</EmojiSticker>
              <Text style={{ fontSize: 13, fontFamily: 'Fraunces_600SemiBold', color: ink, letterSpacing: -0.2 }}>
                Activities to support this leap
              </Text>
            </View>
            <View style={{ gap: 8 }}>
              {g.activities.map((act, i) => (
                <View key={i} style={{
                  backgroundColor: paper, borderRadius: 20, borderWidth: 1, borderColor: line,
                  padding: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start',
                }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: greenSoft, borderWidth: 1, borderColor: line, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 12, fontFamily: 'Fraunces_600SemiBold', color: ink }}>{i + 1}</Text>
                  </View>
                  <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: ink2, flex: 1, lineHeight: 20 }}>{act}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Tip — yellow sticker */}
          <View style={{
            backgroundColor: yellowSoft, borderRadius: 22, borderWidth: 1, borderColor: line,
            padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center',
          }}>
            <EmojiSticker size={30}>💡</EmojiSticker>
            <Text style={{ fontSize: 13, fontFamily: 'DMSans_500Medium', color: ink, flex: 1, lineHeight: 19 }}>{g.tip}</Text>
          </View>

          {/* Done celebration */}
          {isThisDone && (
            <View style={{
              backgroundColor: greenSoft, borderRadius: 22, borderWidth: 1, borderColor: line,
              padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center',
            }}>
              <EmojiSticker size={30}>🎉</EmojiSticker>
              <Text style={{ fontSize: 13, fontFamily: 'Fraunces_600SemiBold', color: ink, flex: 1, letterSpacing: -0.2 }}>
                {childName} has completed this leap!
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  )
}

// ─── Quick Button ───────────────────────────────────────────────────────────

function QuickBtn({ icon: Icon, label, color, onPress }: {
  icon: typeof Utensils; label: string; color: string; onPress?: () => void
}) {
  const { colors, radius } = useTheme()
  return (
    <Pressable onPress={onPress} style={s.quickBtn}>
      <View style={[s.quickBtnInner, { backgroundColor: color + '12', borderRadius: radius.md }]}>
        <Icon size={18} color={color} strokeWidth={2} />
      </View>
      <Text style={[s.quickLabel, { color: colors.textMuted }]}>{label}</Text>
    </Pressable>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function guessFoodCategory(food: string): string {
  const f = (food || '').toLowerCase()
  if (/banana|apple|papaya|blueberry|mango|strawberry|avocado|peach|pear|grape|orange|watermelon/.test(f)) return 'fruit'
  if (/carrot|broccoli|pumpkin|spinach|zucchini|peas|sweet potato|potato|tomato|corn|bean|lentil/.test(f)) return 'vegetable'
  if (/rice|pasta|oatmeal|toast|bread|cereal|pancake|cracker/.test(f)) return 'grain'
  if (/chicken|beef|fish|egg|meat|turkey|salmon|shrimp/.test(f)) return 'protein'
  if (/yogurt|cheese|milk|formula/.test(f)) return 'dairy'
  if (/juice|water/.test(f)) return 'drink'
  return 'mixed'
}

function parseGrowthValue(entries: HealthRecord[]): { weight: string | null; height: string | null } {
  let weight: string | null = null
  let height: string | null = null
  for (const e of entries) {
    const v = e.value || ''
    if (!weight) {
      const m = v.match(/weight[:\s]+([0-9.]+\s*kg)/i)
      if (m) weight = m[1]
    }
    if (!height) {
      const m = v.match(/height[:\s]+([0-9.]+\s*cm)/i)
      if (m) height = m[1]
    }
    if (weight && height) break
  }
  return { weight, height }
}

// ─── Vaccine Schedule Tree ────────────────────────────────────────────────────

interface MilestoneVaccineItem {
  name: string
  doseLabel: string   // "dose 2" or ""
  dueAge: string      // human label from schedule e.g. "4 months"
  status: 'done' | 'upcoming' | 'overdue' | 'future'
  givenDate?: string  // ISO date if done
  scheduleKey: string // unique key: "<name>-<doseIndex>"
}

interface AgeMilestone {
  key: string                 // stringified monthMin e.g. "0", "2", "4"
  label: string               // display label e.g. "Birth", "2 Months"
  monthMin: number
  vaccines: MilestoneVaccineItem[]
  milestoneStatus: 'done' | 'partial' | 'future'
}

function formatMilestoneLabel(monthMin: number, ageLabel: string): string {
  if (monthMin === 0) return 'Birth'
  return ageLabel.charAt(0).toUpperCase() + ageLabel.slice(1)
}

function buildVaccineScheduleTree(
  birthDate: string,
  givenVaccines: HealthRecord[],
  countryCode: string = 'US',
): AgeMilestone[] {
  if (!birthDate) return []
  const ageMonths = getAgeMonths(birthDate)
  const schedule = getScheduleForCountry(countryCode)
  const milestoneMap = new Map<number, AgeMilestone>()

  for (const v of schedule) {
    const firstWord = v.name.toLowerCase().split(' ')[0]
    const doseCount = givenVaccines.filter((g) =>
      g.value.toLowerCase().includes(firstWord)
    ).length

    for (let i = 0; i < v.monthRanges.length; i++) {
      const [monthMin, monthMax] = v.monthRanges[i]
      const ageLabel = v.ages[i]

      let status: MilestoneVaccineItem['status']
      if (i < doseCount) {
        status = 'done'
      } else if (ageMonths > monthMax + 1) {
        status = 'overdue'
      } else if (ageMonths >= monthMin - 2) {
        status = 'upcoming'
      } else {
        status = 'future'
      }

      let givenDate: string | undefined
      if (status === 'done') {
        const match = givenVaccines.filter((g) =>
          g.value.toLowerCase().includes(firstWord)
        )[i]
        givenDate = match?.date
      }

      if (!milestoneMap.has(monthMin)) {
        milestoneMap.set(monthMin, {
          key: String(monthMin),
          label: formatMilestoneLabel(monthMin, ageLabel),
          monthMin,
          vaccines: [],
          milestoneStatus: 'done',
        })
      }

      milestoneMap.get(monthMin)!.vaccines.push({
        name: v.name,
        doseLabel: v.monthRanges.length > 1 ? `dose ${i + 1}` : '',
        dueAge: ageLabel,
        status,
        givenDate,
        scheduleKey: `${v.name}-${i}`,
      })
    }
  }

  for (const milestone of milestoneMap.values()) {
    const hasOverdueOrUpcoming = milestone.vaccines.some(
      (v) => v.status === 'overdue' || v.status === 'upcoming',
    )
    const allDone = milestone.vaccines.every((v) => v.status === 'done')
    if (allDone) milestone.milestoneStatus = 'done'
    else if (hasOverdueOrUpcoming) milestone.milestoneStatus = 'partial'
    else milestone.milestoneStatus = 'future'
  }

  return Array.from(milestoneMap.values()).sort((a, b) => a.monthMin - b.monthMin)
}

function formatHealthDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return dateStr }
}

interface UpcomingVaccine {
  key: string         // unique: name + dose index
  name: string
  doseLabel: string   // e.g. "dose 2"
  dueAge: string      // e.g. "4 months"
  overdue: boolean
}

function getNextDueVaccines(birthDate: string, givenVaccines: HealthRecord[], countryCode: string = 'US'): UpcomingVaccine[] {
  if (!birthDate) return []
  const ageMonths = getAgeMonths(birthDate)
  const result: UpcomingVaccine[] = []
  const schedule = getScheduleForCountry(countryCode)

  for (const v of schedule) {
    // Count how many doses of this vaccine are already logged
    const doseCount = givenVaccines.filter((g) =>
      g.value.toLowerCase().includes(v.name.toLowerCase().split(' ')[0])
    ).length

    if (doseCount >= v.monthRanges.length) continue // all doses done

    const [minMo, maxMo] = v.monthRanges[doseCount]
    // Show if: child is within 2 months of becoming eligible, or overdue (up to 18 months)
    const isUpcoming = ageMonths >= minMo - 2 && ageMonths <= maxMo + 18
    if (!isUpcoming) continue

    result.push({
      key: `${v.name}-${doseCount}`,
      name: v.name,
      doseLabel: v.monthRanges.length > 1 ? `dose ${doseCount + 1}` : '',
      dueAge: v.ages[doseCount],
      overdue: ageMonths > maxMo + 1,
    })
    if (result.length >= 5) break
  }

  return result
}

function getCatColor(cat: string): string {
  const map: Record<string, string> = {
    fruit: '#4CAF50', vegetable: '#66BB6A', grain: '#FFA726',
    protein: '#EF5350', dairy: '#42A5F5', drink: '#26C6DA',
    snack: '#AB47BC', mixed: '#8D6E63',
  }
  return map[cat] || '#888'
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { gap: 16, paddingBottom: 24 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  greeting: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  subtitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 2 },

  // Child pills — soft tint inactive, colored bg active
  childPills: { flexDirection: 'row', gap: 8, paddingHorizontal: 2, marginBottom: 4, flexWrap: 'nowrap', alignItems: 'center' },
  childPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 16 },
  pillName: { fontSize: 14, fontFamily: 'DMSans_600SemiBold' },
  pillAge: { fontSize: 11, fontFamily: 'DMSans_500Medium', opacity: 0.75 },
  addChildBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  // Date range picker — text-only inactive, soft-accent pill active
  dateRangeRow: { flexDirection: 'row', gap: 6, marginBottom: 6, paddingLeft: 2, paddingRight: 16, paddingVertical: 8 },
  dateRangePill: { paddingVertical: 7, paddingHorizontal: 12, borderWidth: 1 },
  dateRangeText: { fontSize: 13, fontFamily: 'DMSans_600SemiBold' },

  // Past 7 days card — paper bg with Fraunces title + chip legend
  miniRingsCard: { padding: 14, borderWidth: 1, gap: 12, borderRadius: 20 },
  miniRingsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  miniRingsTitle: { fontSize: 15, fontFamily: 'Fraunces_600SemiBold', letterSpacing: -0.2 },
  miniMetricPicker: { flexDirection: 'row', gap: 6 },
  miniMetricBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999, borderWidth: 1 },
  miniMetricDot: { width: 8, height: 8, borderRadius: 4 },
  miniMetricLabel: { fontSize: 11, fontFamily: 'DMSans_600SemiBold' },
  miniRingsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  miniRingCol: { alignItems: 'center', gap: 6 },
  miniRingOuter: { alignItems: 'center', justifyContent: 'center' },
  miniRingLabel: { fontSize: 10, fontFamily: 'DMSans_600SemiBold', textTransform: 'uppercase', letterSpacing: 1.2 },

  // Hero — concentric rings + Fraunces number + mono-caps unit + orange-soft pill
  heroWrap: { alignItems: 'center', paddingVertical: 4 },
  heroCenter: { alignItems: 'center', gap: 2 },
  heroNumber: { fontSize: 38, letterSpacing: -1, fontFamily: 'Fraunces_600SemiBold' },
  heroUnit: { fontSize: 9, letterSpacing: 1.8, textTransform: 'uppercase', fontFamily: 'DMSans_600SemiBold' },
  heroBadge: { marginTop: 4, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  heroBadgeText: { fontSize: 10, fontFamily: 'DMSans_600SemiBold' },

  // Legend — paper stat tiles: dot + MONO-CAPS label / Fraunces value / small sub
  legendRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  legendItem: { flex: 1, gap: 2, paddingVertical: 12, paddingHorizontal: 12, borderWidth: 1 },
  legendDotRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 10, fontFamily: 'DMSans_600SemiBold', textTransform: 'uppercase', letterSpacing: 1.2 },
  legendValue: { fontSize: 22, letterSpacing: -0.4, marginTop: 2, fontFamily: 'Fraunces_600SemiBold' },
  legendTarget: { fontSize: 11, fontFamily: 'DMSans_400Regular', marginTop: 2 },

  // Section header
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sectionTitle: { fontSize: 22, fontFamily: 'Fraunces_600SemiBold', letterSpacing: -0.4 },
  sectionLink: { fontSize: 13, fontFamily: 'DMSans_600SemiBold' },

  // Metric cards — paper bg + mono-caps label + Fraunces value + ink-3 sub
  metricsRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  metricsRowItem: { flex: 1 },
  metricCard: { flex: 1, height: 182, padding: 14, borderWidth: 1, gap: 2, borderRadius: 18 },
  metricHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  metricHeaderIcon: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  metricLabel: { fontSize: 10, fontFamily: 'DMSans_600SemiBold', textTransform: 'uppercase', letterSpacing: 1.2 },
  metricValue: { fontSize: 15, fontFamily: 'Fraunces_600SemiBold', marginTop: 6, letterSpacing: -0.2 },
  metricSmall: { fontSize: 11, fontFamily: 'DMSans_400Regular', marginTop: 2 },
  metricEmpty: { height: 50, alignItems: 'center', justifyContent: 'center' },
  metricBigNumber: { fontSize: 28, textAlign: 'center', marginVertical: 4, fontFamily: 'Fraunces_600SemiBold', letterSpacing: -0.4 },

  // Diaper card
  diaperBar: { flexDirection: 'row', height: 6, width: '100%', overflow: 'hidden', marginTop: 4 },
  diaperLegend: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 6 },
  diaperLegendText: { fontSize: 10, fontWeight: '600' },
  // Full-width diaper card
  diaperFullCard: { padding: 16, borderWidth: 1, marginHorizontal: 0, borderRadius: 20 },
  diaperCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  diaperCardTitle: { fontSize: 10, fontFamily: 'DMSans_600SemiBold', textTransform: 'uppercase', letterSpacing: 1.2 },
  diaperBigCount: { fontSize: 40, letterSpacing: -1, lineHeight: 44, fontFamily: 'Fraunces_600SemiBold' },
  diaperMainRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  diaperChips: { flex: 1, flexDirection: 'row', gap: 6 },
  diaperChip: { flex: 1, flexDirection: 'column', alignItems: 'center', paddingVertical: 8, borderRadius: 14, borderWidth: 1, gap: 2 },
  diaperChipLabel: { fontSize: 10, fontFamily: 'DMSans_600SemiBold', textTransform: 'uppercase', letterSpacing: 1 },
  diaperChipCount: { fontSize: 16, fontFamily: 'Fraunces_600SemiBold', letterSpacing: -0.2 },
  diaperSparkRow: { flexDirection: 'row', gap: 2, marginTop: 10, alignItems: 'flex-end' },
  diaperSparkCol: { flex: 1, alignItems: 'center', gap: 3 },
  diaperSparkLabel: { fontSize: 10, fontFamily: 'DMSans_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.6 },

  // Mood bars
  moodBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 50, marginBottom: 4 },
  moodBarCol: { flex: 1, justifyContent: 'flex-end' },
  moodBar: { width: '100%' },

  // Calories ring
  calorieRingWrap: { alignItems: 'center', justifyContent: 'center', height: 60, marginBottom: 2 },
  calorieNumber: { position: 'absolute', fontSize: 11, fontWeight: '800' },

  // Health card (hc)
  hcCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderWidth: 1, borderRadius: 20 },
  hcIconWrap: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  hcEyebrow: { fontSize: 10, fontFamily: 'DMSans_600SemiBold', textTransform: 'uppercase', letterSpacing: 1.2 },
  hcPrimary: { fontSize: 15, fontFamily: 'DMSans_600SemiBold', lineHeight: 20 },
  hcSecondary: { fontSize: 12, fontFamily: 'DMSans_500Medium' },
  hcDetailRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 2 },
  hcDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hcDetail: { fontSize: 12, fontFamily: 'DMSans_400Regular' },
  healthStatusPill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  healthStatusText: { fontSize: 11, fontFamily: 'DMSans_600SemiBold' },
  // legacy health row (used by other parts)
  healthList: { gap: 6, marginBottom: 2 },
  healthRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  healthCheck: { width: 14, height: 14, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  healthLabel: { fontSize: 11, fontFamily: 'DMSans_500Medium', flex: 1 },

  // Quick actions
  quickRow: { flexDirection: 'row', justifyContent: 'space-between' },
  quickBtn: { alignItems: 'center', gap: 6 },
  quickBtnInner: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

  // Growth leap
  leapCard: { padding: 16, gap: 12, borderWidth: 1, borderRadius: 22 },
  leapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  leapNumCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexShrink: 0 },
  leapNumText: { fontSize: 17, fontFamily: 'Fraunces_600SemiBold', letterSpacing: -0.4 },
  leapTitle: { fontSize: 17, fontFamily: 'Fraunces_600SemiBold', letterSpacing: -0.3 },
  leapDesc: { fontSize: 12, fontFamily: 'DMSans_400Regular', marginTop: 2, lineHeight: 16 },
  leapBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  leapBadgeText: { fontSize: 10, fontFamily: 'DMSans_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.6 },
  leapAllDots: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  leapAllDot: { width: 12, height: 12, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  leapAllDotsLabel: { fontSize: 9, fontWeight: '600', textAlign: 'center', color: 'rgba(255,255,255,0.35)' },
  leapPhaseIcon: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  leapSectionLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  leapSignChip: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  leapSignText: { fontSize: 11, fontWeight: '600' },
  leapSkillRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  leapSkillDot: { width: 5, height: 5, borderRadius: 3, flexShrink: 0 },
  leapSkillText: { fontSize: 13, fontWeight: '500', flex: 1 },
  leapWeekLabel: { fontSize: 8, fontWeight: '700', textTransform: 'uppercase' },
  leapTip: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  leapTipIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  leapTipText: { flex: 1, fontSize: 12, fontWeight: '500', lineHeight: 17 },
  leapModalRow: { padding: 14, gap: 4, marginHorizontal: 16, marginTop: 8, borderRadius: 12, borderLeftWidth: 3 },
  leapModalNum: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  leapModalName: { fontSize: 14, fontWeight: '700' },
  leapModalDesc: { fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.35)' },

  // Memories
  memoriesScroll: { gap: 12, paddingRight: 20, paddingVertical: 4 },
  memoryCard: { width: SW * 0.55 },
  memoryImage: { aspectRatio: 4 / 3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  memoryImg: { width: '100%', height: '100%' },
  memoryBadge: { position: 'absolute', bottom: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 999 },
  memoryBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFF', maxWidth: 100 },
  memoryDate: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 6, marginLeft: 4 },
  memoryEmpty: { alignItems: 'center', padding: 24, gap: 8 },
  memoryEmptyText: { fontSize: 14, fontWeight: '600' },
  memoryEmptyHint: { fontSize: 11, fontWeight: '500' },

  // Reminders
  addReminderBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12 },
  addReminderBtnText: { fontSize: 12, fontWeight: '700' },
  reminderInputCard: { padding: 16, borderWidth: 1, gap: 10 },
  reminderInput: { fontSize: 14, fontFamily: 'DMSans_400Regular' },
  reminderInputActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reminderDateBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, flex: 1 },
  reminderDateBtnText: { fontSize: 11, fontWeight: '600', flex: 1 },
  reminderSaveBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  reminderSaveBtnText: { fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: '#FFF' },
  reminderDueText: { fontSize: 11, fontFamily: 'DMSans_600SemiBold' },
  reminderChildTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  reminderChildTagText: { fontSize: 11, fontFamily: 'DMSans_600SemiBold' },
  childTagChip: { paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  childTagChipText: { fontSize: 11, fontWeight: '600' },
  reminderSeeAll: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 11, paddingHorizontal: 16 },
  reminderSeeAllText: { fontSize: 12, fontWeight: '700' },
  remindersEmpty: { alignItems: 'center', padding: 24, gap: 6, borderWidth: 1 },
  remindersEmptyText: { fontSize: 14, fontWeight: '600' },
  remindersEmptyHint: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
  // Reminders modal — cream bottom sheet
  reminderModalOverlay: { flex: 1, backgroundColor: 'rgba(10,8,6,0.55)', justifyContent: 'flex-end' },
  reminderModal: { height: '90%', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  reminderModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 },
  reminderModalTitle: { fontSize: 24, fontFamily: 'Fraunces_600SemiBold', letterSpacing: -0.4 },
  reminderMetricStrip: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, marginTop: 16, borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  reminderMetricItem: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 2 },
  reminderMetricVal: { fontSize: 24, fontFamily: 'Fraunces_600SemiBold', letterSpacing: -0.4 },
  reminderMetricLabel: { fontSize: 10, fontFamily: 'DMSans_600SemiBold', textTransform: 'uppercase', letterSpacing: 1.2 },
  reminderMetricDivider: { width: 1, height: 40 },
  reminderTabs: { flexDirection: 'row', borderBottomWidth: 1, marginTop: 12 },
  reminderTab: { flex: 1, alignItems: 'center', paddingBottom: 10, paddingTop: 6 },
  reminderTabText: { fontSize: 13, fontFamily: 'DMSans_600SemiBold', letterSpacing: 0.1 },
  reminderTabLine: { height: 2.5, width: '50%', borderRadius: 2, marginTop: 8 },
  reminderModalEmpty: { alignItems: 'center', paddingVertical: 48, gap: 8 },

  // Grandma CTA — lavender soft bg with blue burst sticker + ink text
  grandmaCard: {
    flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14,
    overflow: 'hidden',
    backgroundColor: '#E0D5F3',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(20,19,19,0.10)',
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  grandmaBurst: {
    position: 'absolute',
    right: -22,
    top: -22,
    transform: [{ rotate: '14deg' }],
  },
  grandmaIconWrap: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFFEF8',
    borderWidth: 1,
    borderColor: 'rgba(20,19,19,0.10)',
  },
  grandmaArrow: {
    width: 32, height: 32, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFFEF8',
    borderWidth: 1,
    borderColor: 'rgba(20,19,19,0.10)',
  },
  grandmaTitle: { fontSize: 18, fontFamily: 'Fraunces_700Bold', fontWeight: '700', color: '#141313', letterSpacing: -0.4, lineHeight: 22 },
  grandmaDesc: { fontSize: 12.5, fontFamily: 'DMSans_400Regular', color: '#3A3533', marginTop: 3, lineHeight: 16 },
  grandmaDescItalic: { fontFamily: 'InstrumentSerif_400Regular_Italic', fontStyle: 'italic', fontSize: 13.5, color: '#3A3533' },

  // Rewards — paper cream card with ink text and sticker-color stats
  rewardsCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14,
    overflow: 'hidden',
    backgroundColor: '#FFFEF8',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(20,19,19,0.10)',
    marginTop: 10,
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  rewardsIconWrap: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FBEA9E',
    borderWidth: 1,
    borderColor: 'rgba(20,19,19,0.10)',
  },
  rewardsTitle: { fontSize: 17, fontFamily: 'Fraunces_700Bold', fontWeight: '700', color: '#141313', letterSpacing: -0.4, lineHeight: 21 },
  rewardsDesc: { fontSize: 12, fontFamily: 'DMSans_400Regular', color: '#6E6763', marginTop: 2, lineHeight: 15 },
  rewardsDescItalic: { fontFamily: 'InstrumentSerif_400Regular_Italic', fontStyle: 'italic', fontSize: 13, color: '#6E6763' },
  rewardsStats: { flexDirection: 'row', gap: 10, alignItems: 'center', marginRight: 4 },
  rewardsStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rewardsStatNum: {
    fontSize: 15,
    fontFamily: 'Fraunces_700Bold',
    fontWeight: '700',
    letterSpacing: -0.3,
  },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(10,8,6,0.55)', justifyContent: 'flex-end' },
  modalContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40, height: '92%', borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 22, fontFamily: 'Fraunces_600SemiBold', letterSpacing: -0.4 },
  modalClose: { width: 32, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  modalSubtitle: { fontSize: 12, fontWeight: '600', marginBottom: 20 },

  // Mood modal — line chart
  moodChartWrap: { padding: 8, overflow: 'hidden' },
  moodChipsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, paddingHorizontal: 2, paddingBottom: 2 },
  moodChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7, paddingHorizontal: 11, borderWidth: 1 },
  moodChipDot: { width: 7, height: 7, borderRadius: 4 },
  moodChipLabel: { fontSize: 12, fontWeight: '700' },
  moodChipCount: { fontSize: 11, fontWeight: '800' },

  modalSummary: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  modalSummaryText: { fontSize: 14, fontWeight: '600' },

  modalEmpty: { alignItems: 'center', padding: 32, gap: 8 },
  modalEmptyText: { fontSize: 15, fontWeight: '600' },
  modalEmptyHint: { fontSize: 12, fontWeight: '500', textAlign: 'center' },

  // Health/Activity modal
  modalStatCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginTop: 12, borderRadius: 16, borderWidth: 1 },
  modalStatLabel: { fontSize: 10, fontFamily: 'DMSans_600SemiBold', textTransform: 'uppercase', letterSpacing: 1.2 },
  modalStatValue: { fontSize: 18, fontFamily: 'Fraunces_600SemiBold', marginTop: 2, letterSpacing: -0.2 },
  modalStatExtra: { fontSize: 12, fontFamily: 'DMSans_600SemiBold' },
  modalSectionTitle: { fontSize: 17, fontFamily: 'Fraunces_700Bold', marginTop: 20, marginBottom: 10, letterSpacing: -0.3 },
  modalSectionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 22, marginBottom: 8 },

  modalTaskRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1 },
  modalTaskCheck: { width: 20, height: 20, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  modalTaskLabel: { flex: 1, fontSize: 14, fontFamily: 'DMSans_500Medium' },
  modalTaskStatus: { fontSize: 12, fontFamily: 'DMSans_600SemiBold' },

  modalCatRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  modalCatDot: { width: 10, height: 10, borderRadius: 5 },
  modalCatLabel: { flex: 1, fontSize: 13, fontWeight: '600' },
  modalCatValue: { fontSize: 13, fontWeight: '800' },

  // Feeding breakdown (modal)
  feedingBreakdownRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  feedingBreakdownCard: { flex: 1, alignItems: 'center', padding: 12, gap: 4 },
  feedingBreakdownValue: { fontSize: 18, fontWeight: '800' },
  feedingBreakdownLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  feedingAvgText: { fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: 8 },

  // Set Goals button
  setGoalsBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 18, borderWidth: 1, borderRadius: 999 },
  setGoalsBtnIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  setGoalsBtnText: { fontSize: 15, fontFamily: 'Fraunces_600SemiBold', letterSpacing: -0.2 },
  setGoalsBtnHint: { flex: 1, fontSize: 12, fontFamily: 'DMSans_400Regular', textAlign: 'right' },

  // Goal Setting Modal (gs = goal sheet)
  gsSheet: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36, borderTopLeftRadius: 36, borderTopRightRadius: 36 },
  gsDragHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  gsHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  gsTitle: { fontSize: 28, fontFamily: 'Fraunces_700Bold', letterSpacing: -0.6, lineHeight: 32 },
  gsSubtitle: { fontSize: 12, fontFamily: 'DMSans_400Regular', marginTop: 4, lineHeight: 17 },
  gsCloseBtn: { width: 34, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginTop: 2 },
  gsAgeBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, alignSelf: 'flex-start', marginBottom: 18 },
  gsAgeBannerText: { fontSize: 12, fontFamily: 'DMSans_500Medium' },
  gsCardList: { gap: 10, paddingBottom: 4 },
  gsCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 20, borderWidth: 1 },
  gsCardIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  gsCardInfo: { flex: 1 },
  gsCardLabel: { fontSize: 15, fontFamily: 'DMSans_600SemiBold' },
  gsCardDesc: { fontSize: 11, fontFamily: 'DMSans_400Regular', marginTop: 2 },
  gsStepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gsStepBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  gsStepValue: { alignItems: 'center', minWidth: 52 },
  gsStepNum: { fontSize: 22, fontFamily: 'Fraunces_700Bold', letterSpacing: -0.3, lineHeight: 26 },
  gsStepUnit: { fontSize: 9, fontFamily: 'DMSans_500Medium', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 1 },
  gsFooter: { marginTop: 20, gap: 10 },
  gsUseSuggestedBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 999, borderWidth: 1 },
  gsUseSuggestedText: { fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
  gsSaveBtn: { alignItems: 'center', paddingVertical: 17, borderRadius: 999 },
  gsSaveBtnText: { fontSize: 16, fontFamily: 'DMSans_700Bold', color: '#FFFFFF' },

  // Health tags (allergies)
  healthTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  healthTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 },
  healthTagText: { fontSize: 11, fontFamily: 'DMSans_600SemiBold' },

  // Health Detail Modal (hd = health detail)
  hdSleepBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 16 },
  hdSleepIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  hdBannerLabel: { fontSize: 10, fontFamily: 'DMSans_600SemiBold', letterSpacing: 1.2, textTransform: 'uppercase' },
  hdBannerValue: { fontSize: 20, fontFamily: 'Fraunces_700Bold', marginTop: 2, letterSpacing: -0.3 },
  hdBannerStat: { fontSize: 18, fontFamily: 'Fraunces_600SemiBold', letterSpacing: -0.3 },
  hdBannerStatSub: { fontSize: 11, fontFamily: 'DMSans_400Regular' },
  hdAllergyTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  hdAllergyText: { fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
  hdVaxIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  hdUrgencyBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999 },
  hdUrgencyText: { fontSize: 11, fontFamily: 'DMSans_600SemiBold' },
  hdApptText: { fontSize: 11, fontFamily: 'DMSans_600SemiBold' },
  hdVaxBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  hdVaxBtnText: { fontSize: 12, fontFamily: 'DMSans_600SemiBold' },
  hdChangeDateText: { fontSize: 11, fontFamily: 'DMSans_500Medium', textAlign: 'right' },
  hdGrowthCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, marginTop: 4 },
  hdGrowthIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  hdGrowthLabel: { fontSize: 9, fontFamily: 'DMSans_600SemiBold', letterSpacing: 1.2, textTransform: 'uppercase' },
  hdGrowthValue: { fontSize: 18, fontFamily: 'Fraunces_700Bold', letterSpacing: -0.3, marginTop: 2 },
  hdGrowthDate: { fontSize: 11, fontFamily: 'DMSans_500Medium' },
  hdHistoryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 999, marginTop: 20, marginBottom: 8 },
  hdHistoryBtnText: { fontSize: 15, fontFamily: 'DMSans_700Bold', color: '#FFFFFF' },

  // Vaccine schedule button (legacy — kept for date picker done button)
  vaccineScheduleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1 },
  vaccineScheduleBtnText: { fontSize: 11, fontFamily: 'DMSans_600SemiBold' },
})
