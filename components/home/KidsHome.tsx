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
  Zap, Droplets, Clock, Settings, Target, Minus, Milk, Hand, Info,
  Bell, Trash2, Syringe, Pill, Pencil, GripVertical, Flag, Trophy, Flame, Star,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTheme, brand } from '../../constants/theme'
import { useChildStore } from '../../store/useChildStore'
import { useJourneyStore } from '../../store/useJourneyStore'
import { HomeGreeting } from './HomeGreeting'
import { useGoalsStore, getSuggestedGoals, getFeedingStage, getNutritionLabel, getAgeMonths, type MetricGoals, type FeedingStage } from '../../store/useGoalsStore'
import { useBadgeStore } from '../../store/useBadgeStore'
import { supabase } from '../../lib/supabase'
import { estimateCalories } from '../../lib/foodCalories'
import type { ChildWithRole } from '../../types'

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
const MOOD_SCORE: Record<string, number> = {
  cranky: 1, fussy: 2, energetic: 3, calm: 4, happy: 5,
}
const MOOD_EMOJI: Record<string, string> = {
  cranky: '😠', fussy: '😟', energetic: '😐', calm: '🙂', happy: '😊',
}

// Normalize a date value from Supabase to YYYY-MM-DD string
/** Format a Date to local YYYY-MM-DD (matches how calendar stores log dates). */
function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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
}

interface Reminder {
  id: string
  text: string
  done: boolean
  dueDate?: string | null     // ISO date string YYYY-MM-DD
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
  const { colors, radius } = useTheme()
  const children = useChildStore((s) => s.children)
  const activeChild = useChildStore((s) => s.activeChild)
  const setActiveChild = useChildStore((s) => s.setActiveChild)
  const parentName = useJourneyStore((s) => s.parentName)
  const [profileName, setProfileName] = useState<string | null>(null)
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
  const [healthModalVisible, setHealthModalVisible] = useState(false)
  const [activityModalVisible, setActivityModalVisible] = useState(false)
  const [diaperModalVisible, setDiaperModalVisible] = useState(false)
  const [goalsModalVisible, setGoalsModalVisible] = useState(false)

  // Reminders
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [showReminderInput, setShowReminderInput] = useState(false)
  const [newReminderText, setNewReminderText] = useState('')
  const [newReminderDate, setNewReminderDate] = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
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

  // Load profile name from Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      supabase.from('profiles').select('name').eq('id', session.user.id).single().then(({ data }) => {
        if (data?.name) setProfileName(data.name)
      })
    })
  }, [])

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
    let notifId: string | null = null

    // Insert a Supabase notification so it shows in the notifications feed
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data } = await supabase.from('notifications').insert({
          user_id: session.user.id,
          type: 'reminder',
          title: newReminderText.trim(),
          body: dueDate ? `Due ${dueDate}` : 'No due date',
          data: { childId: child?.id, dueDate },
          is_read: false,
        }).select('id').single()
        notifId = data?.id ?? null
      }
    } catch {}

    const r: Reminder = { id: Date.now().toString(), text: newReminderText.trim(), done: false, dueDate, notifId, childId: newReminderChildId }
    persistReminders([...reminders, r])
    setNewReminderText('')
    setNewReminderDate(null)
    setNewReminderChildId(null)
    setShowDatePicker(false)
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

    // ── Activity (mood logs + feeding + any other logged actions) ──
    const activityLogs = rangeLogs.filter((l) => ['mood', 'food', 'feeding', 'medicine', 'vaccine', 'growth', 'temperature', 'diaper'].includes(l.type))
    const activityCount = activityLogs.length
    const activityTarget = g.activity * days
    const activityBreakdown: Record<string, number> = {}
    for (const log of activityLogs) {
      activityBreakdown[log.type] = (activityBreakdown[log.type] || 0) + 1
    }

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
      feedingBreast, feedingBottle, avgFeedingMl, activityBreakdown,
    })
  }

  if (!child) return null

  const growthLeap = getGrowthLeap(child.birthDate)
  const firstName = parentName?.split(' ')[0] || profileName?.split(' ')[0] || 'Mom'

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
            return (
              <Pressable key={c.id} onPress={() => setActiveChild(c)}
                style={[s.childPill, {
                  backgroundColor: kidColor + (active ? 'FF' : '2E'),
                  borderRadius: radius.full,
                  borderWidth: 1,
                  borderColor: active ? kidColor : kidColor + '40',
                }]}
              >
                <Text style={[s.pillName, { color: active ? '#141313' : kidColor }]}>{c.name}</Text>
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
              style={[s.dateRangePill, {
                backgroundColor: active ? colors.primaryTint : 'transparent',
                borderColor: active ? colors.primary : colors.border,
                borderRadius: radius.full,
              }]}
            >
              <Text style={[s.dateRangeText, { color: active ? colors.primary : colors.textMuted }]}>
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
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
          onPress={() => setCustomPickerVisible(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.lg,
              borderTopRightRadius: radius.lg,
              paddingTop: 20,
              paddingHorizontal: 20,
              paddingBottom: 48,
              gap: 16,
            }}
          >
            {/* Drag handle */}
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 4 }} />

            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.3 }}>Custom Range</Text>
              <Pressable
                onPress={() => setCustomPickerVisible(false)}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} color={colors.textMuted} strokeWidth={2.5} />
              </Pressable>
            </View>

            {/* START / END chips */}
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Pressable
                onPress={() => setCustomPickerActive('start')}
                style={{
                  flex: 1,
                  borderRadius: radius.md,
                  borderWidth: 1.5,
                  borderColor: customPickerActive === 'start' ? colors.primary : colors.border,
                  backgroundColor: customPickerActive === 'start' ? colors.primaryTint : colors.surfaceGlass,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  gap: 3,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: customPickerActive === 'start' ? colors.primary : colors.textMuted }}>
                  START
                </Text>
                <Text style={{ fontSize: 17, fontWeight: '700', color: customPickerActive === 'start' ? colors.text : colors.textSecondary }}>
                  {fmtShortDate(customDraft.start)}
                </Text>
              </Pressable>

              <View style={{ width: 20, height: 1, backgroundColor: colors.border }} />

              <Pressable
                onPress={() => setCustomPickerActive('end')}
                style={{
                  flex: 1,
                  borderRadius: radius.md,
                  borderWidth: 1.5,
                  borderColor: customPickerActive === 'end' ? colors.primary : colors.border,
                  backgroundColor: customPickerActive === 'end' ? colors.primaryTint : colors.surfaceGlass,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  gap: 3,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: customPickerActive === 'end' ? colors.primary : colors.textMuted }}>
                  END
                </Text>
                <Text style={{ fontSize: 17, fontWeight: '700', color: customPickerActive === 'end' ? colors.text : colors.textSecondary }}>
                  {fmtShortDate(customDraft.end)}
                </Text>
              </Pressable>
            </View>

            {/* Spinner */}
            <DateTimePicker
              key={customPickerActive}
              value={customPickerActive === 'start' ? customDraft.start : customDraft.end}
              mode="date"
              display="spinner"
              maximumDate={customPickerActive === 'start' ? customDraft.end : new Date()}
              minimumDate={customPickerActive === 'end' ? customDraft.start : undefined}
              textColor={colors.text}
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

            {/* Apply button */}
            <Pressable
              onPress={() => {
                setCustomRange({ start: customDraft.start, end: customDraft.end })
                setDateRange('custom')
                setCustomPickerVisible(false)
              }}
              style={{
                height: 60,
                borderRadius: radius.full,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.4,
                shadowRadius: 16,
              }}
            >
              <Text style={{ color: colors.textInverse, fontWeight: '800', fontSize: 16, letterSpacing: 0.2 }}>Apply Range</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ─── Past 7 Days Mini Rings ──────────────────────────── */}
      <View style={[s.miniRingsCard, { backgroundColor: colors.surface, borderRadius: radius.lg, borderColor: colors.borderLight }]}>
        <View style={s.miniRingsHeader}>
          <Text style={[s.miniRingsTitle, { color: colors.textSecondary }]}>Past 7 Days</Text>
          <View style={s.miniMetricPicker}>
            {(['sleep', 'nutrition', 'activity'] as MiniRingMetric[]).map((m) => {
              const on = miniRingMetric === m
              return (
                <Pressable
                  key={m}
                  onPress={() => setMiniRingMetric(m)}
                  style={[s.miniMetricBtn, {
                    backgroundColor: on ? PILLAR_COLORS[m] + '22' : 'transparent',
                    borderColor: on ? 'transparent' : colors.border,
                  }]}
                >
                  <View style={[s.miniMetricDot, { backgroundColor: PILLAR_COLORS[m] }]} />
                  <Text style={[s.miniMetricLabel, { color: on ? colors.text : colors.textMuted }]}>
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

      {/* ─── Hero tiles (v1 redesign): LAST SLEEP / MOOD / CALORIES / LEAP ─── */}
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
        leap={growthLeap}
        onPressSleep={() => { setFocusedRing('sleep'); setHealthModalVisible(true) }}
        onPressMood={() => setMoodModalVisible(true)}
        onPressCalories={() => setActivityModalVisible(true)}
      />

      {/* (Ring legend / stats strip removed — hero tiles + detail modals cover this) */}

      {/* ─── Set Goals Button ─────────────────────────────────── */}
      <Pressable
        onPress={() => setGoalsModalVisible(true)}
        style={[s.setGoalsBtn, { backgroundColor: colors.primaryTint, borderColor: colors.primary + '40' }]}
      >
        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary + '22', alignItems: 'center', justifyContent: 'center' }}>
          <Target size={14} color={colors.primary} strokeWidth={2} />
        </View>
        <Text style={[s.setGoalsBtnText, { color: colors.primary }]}>Set Goals</Text>
        <Text style={[s.setGoalsBtnHint, { color: colors.textMuted }]}>Customize daily targets</Text>
        <ChevronRight size={14} color={colors.textMuted} strokeWidth={2} />
      </Pressable>

      {/* ─── Health + Diaper (Mood + Calories live in hero tiles now) ─── */}
      <View style={s.sectionHeader}>
        <Text style={[s.sectionTitle, { color: colors.text }]}>Health & Care</Text>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Bell size={15} color={colors.primary} strokeWidth={2} />
          <Text style={[s.sectionTitle, { color: colors.text }]}>Reminders</Text>
        </View>
        <Pressable
          onPress={() => { setShowReminderInput(!showReminderInput); setNewReminderText('') }}
          style={[s.addReminderBtn, { backgroundColor: colors.primary + '15', borderRadius: radius.full }]}
        >
          <Plus size={13} color={colors.primary} strokeWidth={2.5} />
          <Text style={[s.addReminderBtnText, { color: colors.primary }]}>Add</Text>
        </Pressable>
      </View>

      {showReminderInput && (
        <View style={[s.reminderInputCard, { backgroundColor: colors.surface, borderRadius: radius.md, borderColor: colors.borderLight }]}>
          <TextInput
            style={[s.reminderInput, { color: colors.text }]}
            placeholder="e.g. Give vitamin D drops, call pediatrician..."
            placeholderTextColor={colors.textMuted}
            value={newReminderText}
            onChangeText={setNewReminderText}
            onSubmitEditing={addReminder}
            autoFocus
            returnKeyType="done"
          />
          <View style={s.reminderInputActions}>
            <Pressable
              onPress={() => setShowDatePicker(!showDatePicker)}
              style={[s.reminderDateBtn, { borderColor: newReminderDate ? colors.primary : colors.border, backgroundColor: newReminderDate ? colors.primary + '15' : 'transparent', borderRadius: radius.sm }]}
            >
              <Clock size={12} color={newReminderDate ? colors.primary : colors.textMuted} strokeWidth={2} />
              <Text style={[s.reminderDateBtnText, { color: newReminderDate ? colors.primary : colors.textMuted }]}>
                {newReminderDate ? newReminderDate.toLocaleDateString('en', { month: 'short', day: 'numeric' }) : 'Set date'}
              </Text>
              {newReminderDate && (
                <Pressable onPress={() => { setNewReminderDate(null); setShowDatePicker(false) }} hitSlop={8}>
                  <X size={10} color={colors.primary} strokeWidth={2.5} />
                </Pressable>
              )}
            </Pressable>
            <Pressable onPress={addReminder} style={[s.reminderSaveBtn, { backgroundColor: colors.primary, borderRadius: radius.sm }]}>
              <Text style={s.reminderSaveBtnText}>Save</Text>
            </Pressable>
          </View>
          {/* Child tag picker */}
          {children.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
              <Pressable
                onPress={() => setNewReminderChildId(null)}
                style={[s.childTagChip, {
                  backgroundColor: newReminderChildId === null ? colors.primary + '25' : 'transparent',
                  borderColor: newReminderChildId === null ? colors.primary : colors.border,
                  borderRadius: radius.full,
                }]}
              >
                <Text style={[s.childTagChipText, { color: newReminderChildId === null ? colors.primary : colors.textMuted }]}>All kids</Text>
              </Pressable>
              {children.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => setNewReminderChildId(c.id === newReminderChildId ? null : c.id)}
                  style={[s.childTagChip, {
                    backgroundColor: newReminderChildId === c.id ? brand.kids + '25' : 'transparent',
                    borderColor: newReminderChildId === c.id ? brand.kids : colors.border,
                    borderRadius: radius.full,
                  }]}
                >
                  <Text style={[s.childTagChipText, { color: newReminderChildId === c.id ? brand.kids : colors.textMuted }]}>{c.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {showDatePicker && (
            <DateTimePicker
              value={newReminderDate ?? new Date()}
              mode="date"
              display="spinner"
              minimumDate={new Date()}
              themeVariant="dark"
              textColor="#FFFFFF"
              style={{ height: 120, marginTop: -8 }}
              onChange={(e: DateTimePickerEvent, date?: Date) => {
                if (Platform.OS !== 'ios') setShowDatePicker(false)
                if (date) setNewReminderDate(date)
              }}
            />
          )}
        </View>
      )}

      {(() => {
        const active = reminders.filter(r => !r.done)
        const archived = reminders.filter(r => r.done)
        const preview = active.slice(0, 4)
        const hasMore = active.length > 4
        if (reminders.length === 0) return (
          <View style={[s.remindersEmpty, { backgroundColor: colors.surface, borderRadius: radius.lg, borderColor: colors.borderLight }]}>
            <Bell size={20} color={colors.textMuted} strokeWidth={1.5} />
            <Text style={[s.remindersEmptyText, { color: colors.textSecondary }]}>No reminders yet</Text>
            <Text style={[s.remindersEmptyHint, { color: colors.textMuted }]}>Add notes, tasks or things to remember</Text>
          </View>
        )
        return (
          <View style={[s.remindersCard, { backgroundColor: colors.surface, borderRadius: radius.lg, borderColor: colors.borderLight }]}>
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
                style={[s.reminderSeeAll, { borderTopWidth: preview.length > 0 ? 1 : 0, borderTopColor: colors.border }]}
              >
                <Text style={[s.reminderSeeAllText, { color: colors.primary }]}>
                  +{active.length - 4} more
                </Text>
                <ChevronRight size={13} color={colors.primary} strokeWidth={2} />
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

      {/* ─── Ask Grandma (lavender soft with sparkle) ─────────── */}
      <Pressable
        onPress={() => router.push('/grandma-talk' as any)}
        style={({ pressed }) => [
          s.grandmaCard,
          { opacity: pressed ? 0.92 : 1 },
        ]}
      >
        <View style={s.grandmaBlob} />
        <View style={s.grandmaIconWrap}>
          <Sparkles size={22} color="#7048B8" strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.grandmaTitle}>Grandma knows best</Text>
          <Text style={s.grandmaDesc}>Sleep, feeding, milestones & more</Text>
        </View>
        <View style={s.grandmaArrow}>
          <ChevronRight size={16} color="#141313" strokeWidth={2.5} />
        </View>
      </Pressable>

      {/* ─── Rewards Card ────────────────────────────────────── */}
      <Pressable
        onPress={() => router.push('/daily-rewards' as any)}
        style={({ pressed }) => [s.rewardsCard, { opacity: pressed ? 0.92 : 1 }]}
      >
        <View style={s.rewardsBlob} />
        <View style={[s.rewardsIconWrap, { backgroundColor: 'rgba(251,191,36,0.18)' }]}>
          <Trophy size={20} color="#FBBF24" strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.rewardsTitle}>Your Rewards</Text>
          <Text style={s.rewardsDesc}>Points, streaks & badges</Text>
        </View>
        <View style={s.rewardsStats}>
          <View style={s.rewardsStat}>
            <Flame size={12} color="#FB923C" strokeWidth={2} />
            <Text style={[s.rewardsStatNum, { color: '#FB923C' }]}>{currentStreak}</Text>
          </View>
          <View style={s.rewardsStat}>
            <Star size={12} color="#FBBF24" strokeWidth={2} />
            <Text style={[s.rewardsStatNum, { color: '#FBBF24' }]}>{totalPoints}</Text>
          </View>
          <View style={s.rewardsStat}>
            <Trophy size={12} color="#A2FF86" strokeWidth={2} />
            <Text style={[s.rewardsStatNum, { color: '#A2FF86' }]}>{earnedBadges.length}</Text>
          </View>
        </View>
        <View style={[s.rewardsArrow, { backgroundColor: 'rgba(251,191,36,0.15)' }]}>
          <ChevronRight size={16} color="#FBBF24" strokeWidth={2.5} />
        </View>
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
            moodByDay={rangeData.moodByDay}
            dateRange={dateRange}
            startDate={sd}
            endDate={ed}
            childName={child?.name}
            childColor={CHILD_COLORS[children.findIndex(c => c.id === child?.id) % CHILD_COLORS.length]}
          />
          </>
        )
      })()}
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
  leap,
  onPressSleep,
  onPressMood,
  onPressCalories,
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
  leap: ReturnType<typeof getGrowthLeap>
  onPressSleep?: () => void
  onPressMood?: () => void
  onPressCalories?: () => void
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

  // Last sleep value: show total hours + minutes for the selected range
  const sleepHours = Math.floor(sleepTotal)
  const sleepMins = Math.round((sleepTotal - sleepHours) * 60)
  const sleepLabel = sleepTotal > 0 ? `${sleepHours}h ${String(sleepMins).padStart(2, '0')}` : '—'
  const sleepSub = sleepTarget > 0 ? `of ${Math.round(sleepTarget)}h target` : 'No goal set'

  // Mood
  const moodDisplay = dominantMood ? (MOOD_LABELS[dominantMood] ?? 'Content') : 'No data'
  const moodValues = ['happy', 'calm', 'energetic', 'fussy', 'cranky'].map((m) => moodCounts[m] || 0)
  const maxMood = Math.max(...moodValues, 1)

  // Calories / feedings
  const isLiquid = stage === 'liquid' || stage === 'mixed'
  const calValue = isLiquid
    ? (feedingCount > 0 ? `${feedingCount}` : '—')
    : (caloriesTotal > 0 ? caloriesTotal.toLocaleString() : '—')
  const calTarget = isLiquid ? feedingTarget : caloriesTarget
  const calPct = calTarget > 0 ? Math.min((isLiquid ? feedingCount : caloriesTotal) / calTarget, 1) : 0
  const calSub = calTarget > 0 ? `of ${calTarget.toLocaleString()} target` : (isLiquid ? 'Tap for details' : 'Set a target')

  return (
    <View style={{ gap: 10 }}>
      {/* Row 1: LAST SLEEP (1.3fr) + MOOD (1fr) */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable
          onPress={onPressSleep}
          style={{
            flex: 1.3, padding: 16, borderRadius: 28, borderWidth: 1,
            backgroundColor: blueSoft, borderColor: lineColor, overflow: 'hidden',
          }}
        >
          <Text style={{ fontSize: 10, fontFamily: 'DMSans_600SemiBold', color: ink3, letterSpacing: 1.2, textTransform: 'uppercase' }}>
            LAST SLEEP
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 6 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: paper, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: lineColor }}>
              <Moon size={22} color="#9DC3E8" strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 28, fontFamily: 'Fraunces_600SemiBold', color: ink, letterSpacing: -0.6, lineHeight: 30 }}>
                {sleepLabel}
              </Text>
              <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', color: ink3, marginTop: 2 }}>
                {sleepSub}
              </Text>
            </View>
          </View>
        </Pressable>

        <Pressable
          onPress={onPressMood}
          style={{
            flex: 1, padding: 14, borderRadius: 28, borderWidth: 1,
            backgroundColor: yellowSoft, borderColor: lineColor, overflow: 'hidden',
          }}
        >
          <Text style={{ fontSize: 10, fontFamily: 'DMSans_600SemiBold', color: '#3A3533', letterSpacing: 1.2, textTransform: 'uppercase' }}>
            MOOD
          </Text>
          <Text style={{ fontSize: 24, fontFamily: 'Fraunces_600SemiBold', color: ink, marginTop: 6, letterSpacing: -0.4 }}>
            {moodDisplay}
          </Text>
          {/* Mood bars */}
          <View style={{ flexDirection: 'row', gap: 3, marginTop: 10, alignItems: 'flex-end' }}>
            {moodValues.map((v, i) => {
              const h = Math.max((v / maxMood) * 34, 4)
              return (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: h,
                    borderRadius: 4,
                    backgroundColor: i === moodValues.length - 1 ? ink : '#F5B896',
                  }}
                />
              )
            })}
          </View>
        </Pressable>
      </View>

      {/* Row 2: CALORIES (1fr) + LEAP (1.2fr) */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable
          onPress={onPressCalories}
          style={{
            flex: 1, padding: 16, borderRadius: 28, borderWidth: 1,
            backgroundColor: pinkSoft, borderColor: lineColor,
          }}
        >
          <Text style={{ fontSize: 10, fontFamily: 'DMSans_600SemiBold', color: ink3, letterSpacing: 1.2, textTransform: 'uppercase' }}>
            {isLiquid ? 'FEEDINGS' : 'CALORIES'}
          </Text>
          <Text style={{ fontSize: 30, fontFamily: 'Fraunces_600SemiBold', color: ink, marginTop: 6, letterSpacing: -0.8, lineHeight: 32 }}>
            {calValue}
          </Text>
          <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', color: ink3, marginTop: 2 }}>
            {calSub}
          </Text>
          {/* Progress bar */}
          <View style={{ height: 6, borderRadius: 999, backgroundColor: 'rgba(238,123,109,0.18)', marginTop: 10, overflow: 'hidden' }}>
            <View style={{ width: `${Math.min(calPct, 1) * 100}%`, height: 6, borderRadius: 999, backgroundColor: '#EE7B6D' }} />
          </View>
        </Pressable>

        <View
          style={{
            flex: 1.2, padding: 14, borderRadius: 28, borderWidth: 1,
            backgroundColor: paper, borderColor: lineColor, overflow: 'hidden',
            position: 'relative',
          }}
        >
          <Text style={{ fontSize: 10, fontFamily: 'DMSans_600SemiBold', color: ink3, letterSpacing: 1.2, textTransform: 'uppercase' }}>
            LEAP
          </Text>
          <Text style={{ fontSize: 20, fontFamily: 'Fraunces_600SemiBold', color: ink, marginTop: 6, letterSpacing: -0.3, lineHeight: 22 }} numberOfLines={1}>
            {leap?.name ?? 'Watching'}
          </Text>
          <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', color: ink3, marginTop: 2 }}>
            {leap
              ? leap.status === 'active'
                ? `Leap ${leap.index + 1} · active`
                : leap.status === 'done'
                ? 'All leaps complete'
                : `Leap ${leap.index + 1} · upcoming`
              : 'Tracking growth'}
          </Text>
          <View style={{ position: 'absolute', right: -10, bottom: -10 }}>
            <SvgStar />
          </View>
        </View>
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

function MultiRingHero({ sleepProgress, nutritionProgress, activityProgress, focused, onTapRing, centerData }: {
  sleepProgress: number; nutritionProgress: number; activityProgress: number
  focused: 'sleep' | 'nutrition' | 'activity'
  onTapRing: (ring: 'sleep' | 'nutrition' | 'activity') => void
  centerData: { value: string; unit: string; pct: number; icon: typeof Moon; color: string }
}) {
  const { colors } = useTheme()
  const size = SW - 80
  const center = size / 2

  // Ring geometry
  const RING_R = [(size - 20) / 2, (size - 60) / 2, (size - 100) / 2]
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
                strokeWidth={6}
                fill="none"
              />,
              <AnimatedSvgCircle
                key={key + '-fg'}
                cx={center} cy={center} r={RING_R[i]}
                stroke={`url(#${gradIds[i]})`}
                strokeWidth={isFocused ? 7 : 6}
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
          <Icon size={20} color={centerData.color} strokeWidth={2} />
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
        <View style={[s.metricHeaderIcon, { borderColor: '#F5D652', backgroundColor: 'rgba(245,214,82,0.35)' }]}>
          <Smile size={12} color="#141313" strokeWidth={2} />
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
            <Smile size={20} color={ink3} strokeWidth={1.5} />
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

  return (
    <View style={[s.metricCard, { backgroundColor: tileBg, borderColor: tileBorder }]}>
      <View style={s.metricHeader}>
        <Heart size={14} color={green} strokeWidth={2} />
        <Text style={[s.metricLabel, { color: ink3 }]}>HEALTH</Text>
        <ChevronRight size={12} color={ink3} strokeWidth={2} style={{ marginLeft: 'auto' }} />
      </View>
      <View style={s.healthList}>
        {lastVaccine ? (
          <View style={s.healthRow}>
            <Syringe size={9} color={green} strokeWidth={2} />
            <Text style={[s.healthLabel, { color: ink3 }]} numberOfLines={1}>
              {lastVaccine.value.split(/[,(]/)[0].trim()}
            </Text>
          </View>
        ) : (
          <View style={s.healthRow}>
            <Syringe size={9} color={ink3} strokeWidth={2} />
            <Text style={[s.healthLabel, { color: ink3 }]} numberOfLines={1}>No vaccines</Text>
          </View>
        )}
        {growthSummary ? (
          <View style={s.healthRow}>
            <TrendingUp size={9} color="#9DC3E8" strokeWidth={2} />
            <Text style={[s.healthLabel, { color: ink3 }]} numberOfLines={1}>{growthSummary}</Text>
          </View>
        ) : null}
        {activeReminders > 0 && (
          <View style={s.healthRow}>
            <Bell size={10} color="#F5D652" strokeWidth={2} />
            <Text style={[s.healthLabel, { color: ink }]} numberOfLines={1}>{activeReminders} reminder{activeReminders !== 1 ? 's' : ''}</Text>
          </View>
        )}
      </View>
      {overdueCount > 0 ? (
        <Text style={[s.metricValue, { color: brand.error }]}>{overdueCount} overdue</Text>
      ) : upcomingCount > 0 ? (
        <Text style={[s.metricValue, { color: '#F5D652' }]}>{upcomingCount} due soon</Text>
      ) : (
        <Text style={[s.metricValue, { color: green }]}>Up to date</Text>
      )}
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
  const { colors, radius } = useTheme()
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

  return (
    <View style={[s.diaperFullCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Header */}
      <View style={s.diaperCardHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: DIAPER_COLORS.pee + '22', alignItems: 'center', justifyContent: 'center' }}>
            <Baby size={12} color={DIAPER_COLORS.pee} strokeWidth={2} />
          </View>
          <Text style={[s.diaperCardTitle, { color: colors.textMuted }]}>DIAPERS</Text>
        </View>
        <ChevronRight size={14} color={colors.textMuted} strokeWidth={2} />
      </View>

      {/* Main row: big number + type chips */}
      <View style={s.diaperMainRow}>
        <Text style={[s.diaperBigCount, { color: colors.text }]}>{count}</Text>
        <View style={s.diaperChips}>
          {[
            { label: 'Pee', count: pee, color: DIAPER_COLORS.pee, emoji: '💧' },
            { label: 'Poop', count: poop, color: DIAPER_COLORS.poop, emoji: '💩' },
            { label: 'Mixed', count: mixed, color: DIAPER_COLORS.mixed, emoji: '🔄' },
          ].map(({ label, count: c, color, emoji }) => (
            <View key={label} style={[s.diaperChip, { backgroundColor: color + '18', borderColor: color + '50' }]}>
              <Text style={{ fontSize: 12 }}>{emoji}</Text>
              <Text style={[s.diaperChipLabel, { color }]}>{label}</Text>
              <Text style={[s.diaperChipCount, { color }]}>{c}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Proportion bar */}
      <View style={[s.diaperBar, { borderRadius: 4, marginTop: 10 }]}>
        {peeW  > 0 && <View style={{ width: `${peeW}%`  as any, height: 8, backgroundColor: DIAPER_COLORS.pee,   borderTopLeftRadius: 4, borderBottomLeftRadius: 4 }} />}
        {poopW > 0 && <View style={{ width: `${poopW}%` as any, height: 8, backgroundColor: DIAPER_COLORS.poop }} />}
        {mixedW > 0 && <View style={{ width: `${mixedW}%` as any, height: 8, backgroundColor: DIAPER_COLORS.mixed, borderTopRightRadius: 4, borderBottomRightRadius: 4 }} />}
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
                  width: 6, height: barH, borderRadius: 3,
                  backgroundColor: dayTotal > 0
                    ? (isToday ? DIAPER_COLORS.pee : DIAPER_COLORS.pee + 'AA')
                    : 'rgba(255,255,255,0.08)',
                }} />
              </View>
              <Text style={[s.diaperSparkLabel, { color: isToday ? colors.text : colors.textMuted }]}>
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

          {/* Type chips */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            {[
              { label: 'Pee', count: pee, color: DIAPER_COLORS.pee, emoji: '💧' },
              { label: 'Poop', count: poop, color: DIAPER_COLORS.poop, emoji: '💩' },
              { label: 'Mixed', count: mixed, color: DIAPER_COLORS.mixed, emoji: '🔄' },
            ].map(({ label, count: c, color, emoji }) => (
              <View key={label} style={{ flex: 1, backgroundColor: color + '15', borderRadius: radius.md, borderWidth: 1, borderColor: color + '40', padding: 10, alignItems: 'center', gap: 2 }}>
                <Text style={{ fontSize: 20 }}>{emoji}</Text>
                <Text style={{ color, fontSize: 18, fontWeight: '800' }}>{c}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 10 }}>{total > 0 ? Math.round((c / total) * 100) : 0}%</Text>
              </View>
            ))}
          </View>

          {/* Proportion bar */}
          <View style={[s.diaperBar, { height: 10, borderRadius: 5, marginTop: 14 }]}>
            {pee > 0  && <View style={{ width: `${(pee  / total) * 100}%` as any, height: 10, backgroundColor: DIAPER_COLORS.pee,   borderTopLeftRadius: 5, borderBottomLeftRadius: 5 }} />}
            {poop > 0 && <View style={{ width: `${(poop / total) * 100}%` as any, height: 10, backgroundColor: DIAPER_COLORS.poop }} />}
            {mixed > 0 && <View style={{ width: `${(mixed / total) * 100}%` as any, height: 10, backgroundColor: DIAPER_COLORS.mixed, borderTopRightRadius: 5, borderBottomRightRadius: 5 }} />}
          </View>

          {/* Daily / weekly bar chart */}
          <View style={{ marginTop: 20 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Trend</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
              {buckets.map((b, i) => {
                const h = b.total > 0 ? Math.max((b.total / bucketMax) * BAR_H, 6) : 3
                const peeH   = b.total > 0 ? Math.round((b.pee   / b.total) * h) : 0
                const poopH  = b.total > 0 ? Math.round((b.poop  / b.total) * h) : 0
                const mixedH = Math.max(h - peeH - poopH, 0)
                return (
                  <View key={i} style={{ flex: 1 }}>
                    {/* Stacked bar — grows upward via column-reverse */}
                    <View style={{ height: BAR_H, flexDirection: 'column', justifyContent: 'flex-end' }}>
                      <View style={{ height: h, borderRadius: 4, overflow: 'hidden', marginHorizontal: 2 }}>
                        {b.total > 0 ? (
                          <>
                            {mixedH > 0 && <View style={{ height: mixedH, backgroundColor: DIAPER_COLORS.mixed }} />}
                            {poopH  > 0 && <View style={{ height: poopH,  backgroundColor: DIAPER_COLORS.poop }} />}
                            {peeH   > 0 && <View style={{ height: peeH,   backgroundColor: DIAPER_COLORS.pee }} />}
                          </>
                        ) : (
                          <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.07)' }} />
                        )}
                      </View>
                    </View>
                    <Text style={{ color: colors.textMuted, fontSize: 8, fontWeight: '700', textAlign: 'center', marginTop: 4 }}>{b.label}</Text>
                  </View>
                )
              })}
            </View>
          </View>

          {/* Color distribution (poop/mixed only) */}
          {colorEntries.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Stool Color {poopTotal > 0 ? `· ${poopTotal} logged` : ''}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {colorEntries.map(([color, cnt]) => {
                  const meta = DIAPER_COLOR_META[color] ?? { label: color.charAt(0).toUpperCase() + color.slice(1), swatch: '#888' }
                  return (
                    <View key={color} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 5 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: meta.swatch }} />
                      <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>{meta.label}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 11 }}>{cnt}</Text>
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

function MoodDetailModal({ visible, onClose, moodCounts, dominantMood, moodByDay, dateRange, startDate, endDate, childName, childColor }: {
  visible: boolean; onClose: () => void
  moodCounts: Record<string, number>; dominantMood: string
  moodByDay: Record<string, Record<string, number>>; dateRange: DateRange
  startDate: string; endDate: string
  childName?: string; childColor?: string
}) {
  const { colors, radius } = useTheme()
  const moods = ['happy', 'calm', 'energetic', 'fussy', 'cranky']
  const totalMoods = Object.values(moodCounts).reduce((a, b) => a + b, 0)

  // Build chart buckets from the actual date range.
  // ≤ 7 days → one bucket per day; > 7 days → aggregate into weekly buckets.
  const { chartDays } = useMemo(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const start = new Date(startDate + 'T00:00:00')
    const end   = new Date(endDate   + 'T00:00:00')
    const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1

    if (totalDays <= 7) {
      // Individual days
      const days: { date: string; label: string; dates: string[] }[] = []
      for (let i = 0; i < totalDays; i++) {
        const d = new Date(start)
        d.setDate(d.getDate() + i)
        const iso = localDateStr(d)
        days.push({ date: iso, label: dayNames[d.getDay()], dates: [iso] })
      }
      return { chartDays: days }
    }

    // Weekly buckets: group dates into weeks of up to 7 days each
    const weeks: { date: string; label: string; dates: string[] }[] = []
    let weekNum = 1
    let cursor = new Date(start)
    while (cursor <= end) {
      const bucketDates: string[] = []
      for (let d = 0; d < 7; d++) {
        if (cursor > end) break
        bucketDates.push(localDateStr(cursor))
        cursor.setDate(cursor.getDate() + 1)
      }
      weeks.push({ date: bucketDates[0], label: `W${weekNum}`, dates: bucketDates })
      weekNum++
    }
    return { chartDays: weeks }
  }, [startDate, endDate])

  // Chart dimensions
  const chartW = SW - 96
  const chartH = 180
  const padL = 16, padR = 16, padT = 28, padB = 28
  const innerW = chartW - padL - padR
  const innerH = chartH - padT - padB

  // Dominant mood per bucket (highest count across all dates in the bucket wins)
  const dominantPerDay = chartDays.map((day, i) => {
    const dayData: Record<string, number> = {}
    for (const d of day.dates) {
      const dayMoods = moodByDay[d] || {}
      for (const [mood, count] of Object.entries(dayMoods)) {
        dayData[mood] = (dayData[mood] || 0) + count
      }
    }
    let dominant: string | null = null
    let maxCount = 0
    for (const [mood, count] of Object.entries(dayData)) {
      if (count > maxCount) { maxCount = count; dominant = mood }
    }
    if (!dominant) return null
    const score = MOOD_SCORE[dominant] || 3
    const x = chartDays.length > 1 ? padL + (i / (chartDays.length - 1)) * innerW : padL + innerW / 2
    const y = padT + innerH - ((score - 1) / 4) * innerH
    return { x, y, score, mood: dominant, emoji: MOOD_EMOJI[dominant] || '😐', color: MOOD_COLORS[dominant] || '#888' }
  })

  const activePts = dominantPerDay.filter(Boolean) as NonNullable<typeof dominantPerDay[0]>[]

  function smoothPath(pts: { x: number; y: number }[]): string {
    if (pts.length < 2) return ''
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1], curr = pts[i]
      const cp1x = (prev.x + (curr.x - prev.x) * 0.4).toFixed(1)
      const cp2x = (curr.x - (curr.x - prev.x) * 0.4).toFixed(1)
      d += ` C ${cp1x} ${prev.y.toFixed(1)}, ${cp2x} ${curr.y.toFixed(1)}, ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`
    }
    return d
  }

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
            <Pressable onPress={onClose} style={[s.modalClose, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
              <X size={18} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
          </View>
          <Text style={[s.modalSubtitle, { color: colors.textMuted }]}>
            {dateRange === 'today' ? 'Today' : dateRange === 'yesterday' ? 'Yesterday' : dateRange === '7days' ? 'Past 7 Days' : dateRange === '30days' ? 'Past 30 Days' : `${startDate} – ${endDate}`} — {totalMoods} mood{totalMoods !== 1 ? 's' : ''} logged
          </Text>

          {totalMoods > 0 ? (
            <>
              {/* Emoji mood chart */}
              <View style={[s.moodChartWrap, { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: radius.md }]}>
                <Svg width={chartW} height={chartH}>
                  {/* 5-level grid lines */}
                  {[1, 2, 3, 4, 5].map((level) => {
                    const y = padT + innerH - ((level - 1) / 4) * innerH
                    return (
                      <SvgLine
                        key={level}
                        x1={padL} y1={y} x2={padL + innerW} y2={y}
                        stroke="rgba(255,255,255,0.06)" strokeWidth={1}
                      />
                    )
                  })}

                  {/* Smooth line connecting active days */}
                  {activePts.length >= 2 && (
                    <Path
                      d={smoothPath(activePts)}
                      stroke="rgba(255,255,255,0.20)"
                      strokeWidth={2}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Emoji nodes */}
                  {dominantPerDay.flatMap((pt, i) => {
                    if (!pt) return []
                    return [
                      <SvgCircle key={`bg-${i}`} cx={pt.x} cy={pt.y} r={15} fill={pt.color + '28'} />,
                      <SvgCircle key={`ring-${i}`} cx={pt.x} cy={pt.y} r={15} fill="none" stroke={pt.color} strokeWidth={1.5} />,
                      <SvgText key={`emoji-${i}`} x={pt.x} y={pt.y + 6} textAnchor="middle" fontSize={15}>{pt.emoji}</SvgText>,
                    ]
                  })}

                  {/* Day/week labels */}
                  {chartDays.map((day, i) => (
                    <SvgText
                      key={day.date}
                      x={chartDays.length > 1 ? padL + (i / (chartDays.length - 1)) * innerW : padL + innerW / 2}
                      y={chartH - 8}
                      textAnchor="middle"
                      fontSize={8} fontWeight="700"
                      fill="rgba(255,255,255,0.30)"
                    >
                      {day.label}
                    </SvgText>
                  ))}
                </Svg>
              </View>

              {/* Mood count chips */}
              <ScrollView
                horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.moodChipsRow}
                style={{ marginTop: 14 }}
              >
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
                      <Text style={{ fontSize: 13 }}>{MOOD_EMOJI[m]}</Text>
                      <Text style={[s.moodChipLabel, { color }]}>{MOOD_LABELS[m]}</Text>
                      <Text style={[s.moodChipCount, { color }]}>{count}</Text>
                    </View>
                  )
                })}
              </ScrollView>

              {/* Summary */}
              <View style={[s.modalSummary, {
                backgroundColor: (MOOD_COLORS[dominantMood] || brand.accent) + '12',
                borderRadius: radius.md,
                marginTop: 16,
              }]}>
                <Smile size={18} color={MOOD_COLORS[dominantMood] || brand.accent} strokeWidth={2} />
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
              <Smile size={32} color={colors.textMuted} strokeWidth={1.5} />
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

const ACTIVITY_TYPE_META: Record<string, { label: string; color: string }> = {
  mood:        { label: 'Mood Logs',    color: '#B983FF' },
  food:        { label: 'Food Logs',    color: '#A2FF86' },
  feeding:     { label: 'Feedings',     color: '#4D96FF' },
  medicine:    { label: 'Medicine',     color: '#FF8AD8' },
  vaccine:     { label: 'Vaccines',     color: '#67E8F9' },
  growth:      { label: 'Growth',       color: '#FBBF24' },
  temperature: { label: 'Temperature',  color: '#FF6B35' },
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

function HealthDetailModal({ visible, onClose, sleepQuality, sleepTotal, sleepTarget, child, childColor, healthHistory, scheduledVaccines, onSetVaccineDate, onMarkVaccineGiven, activityCount, activityBreakdown, feedingCount, caloriesTotal, feedingMl, stage }: {
  visible: boolean; onClose: () => void
  sleepQuality: string; sleepTotal: number; sleepTarget: number
  child: ChildWithRole; childColor?: string; healthHistory: HealthHistoryData
  scheduledVaccines: Record<string, string>
  onSetVaccineDate: (key: string, date: string | null) => void
  onMarkVaccineGiven: (name: string, date: string, key: string) => Promise<void>
  activityCount: number; activityBreakdown: Record<string, number>; feedingCount: number; caloriesTotal: number; feedingMl: number; stage: FeedingStage
}) {
  const { colors, radius } = useTheme()
  const { weight, height } = parseGrowthValue(healthHistory.growth)
  const upcomingVaccines = getNextDueVaccines(child.birthDate ?? '', healthHistory.vaccines, child.countryCode ?? 'US')
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [pickerDate, setPickerDate] = useState(new Date())
  const [activityBreakdownVisible, setActivityBreakdownVisible] = useState(false)

  const paper = colors.surface
  const paperBorder = colors.border
  const ink = colors.text
  const ink3 = colors.textMuted

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
            {/* Sleep summary banner — sticker-blue soft */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              backgroundColor: 'rgba(157,195,232,0.18)', borderColor: 'rgba(157,195,232,0.35)',
              borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 14,
            }}>
              <Moon size={20} color="#9DC3E8" strokeWidth={2} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontFamily: 'DMSans_600SemiBold', color: ink3, letterSpacing: 1.2, textTransform: 'uppercase' }}>
                  Sleep Quality
                </Text>
                <Text style={{ fontSize: 18, fontFamily: 'Fraunces_600SemiBold', color: ink, marginTop: 2 }}>
                  {sleepQuality}
                </Text>
              </View>
              <Text style={{ fontSize: 12, fontFamily: 'DMSans_600SemiBold', color: '#9DC3E8' }}>
                {sleepTotal.toFixed(1)}h / {sleepTarget.toFixed(0)}h
              </Text>
            </View>

            {/* Allergies */}
            {child.allergies.length > 0 && (
              <>
                <Text style={[s.modalSectionTitle, { color: colors.text }]}>Allergies</Text>
                <View style={s.healthTagsRow}>
                  {child.allergies.map((a, i) => (
                    <View key={i} style={[s.healthTag, { backgroundColor: brand.error + '15', borderRadius: radius.sm }]}>
                      <AlertCircle size={10} color={brand.error} strokeWidth={2} />
                      <Text style={[s.healthTagText, { color: brand.error }]}>{a}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Medications from child profile */}
            {child.medications.length > 0 && (
              <>
                <Text style={[s.modalSectionTitle, { color: colors.text }]}>Medications</Text>
                {child.medications.map((m, i) => (
                  <View key={i} style={[s.modalTaskRow, { borderBottomColor: colors.border }]}>
                    <Pill size={14} color={brand.secondary} strokeWidth={2} />
                    <Text style={[s.modalTaskLabel, { color: colors.text }]}>{m}</Text>
                    <Text style={[s.modalTaskStatus, { color: brand.secondary }]}>Active</Text>
                  </View>
                ))}
              </>
            )}

            {/* Recent Vaccines */}
            <Text style={[s.modalSectionTitle, { color: colors.text }]}>Recent Vaccines</Text>
            {healthHistory.vaccines.length > 0 ? healthHistory.vaccines.slice(0, 4).map((v, i) => (
              <View key={i} style={[s.modalTaskRow, { borderBottomColor: colors.border }]}>
                <View style={[s.modalTaskCheck, { backgroundColor: brand.success, borderWidth: 0 }]}>
                  <Check size={10} color="#FFF" strokeWidth={3} />
                </View>
                <Text style={[s.modalTaskLabel, { color: colors.text }]}>{v.value.split(/[,(]/)[0].trim()}</Text>
                <Text style={[s.modalTaskStatus, { color: colors.textMuted }]}>{formatHealthDate(v.date)}</Text>
              </View>
            )) : (
              <Text style={[s.modalTaskStatus, { color: colors.textMuted, marginBottom: 8 }]}>No vaccines logged yet</Text>
            )}

            {/* Upcoming Vaccines */}
            {upcomingVaccines.length > 0 && (
              <>
                <Text style={[s.modalSectionTitle, { color: colors.text }]}>Upcoming Vaccines</Text>
                {upcomingVaccines.map((uv) => {
                  const apptDate = scheduledVaccines[uv.key] ?? null
                  const isExpanded = expandedKey === uv.key
                  const fullName = uv.name + (uv.doseLabel ? ` · ${uv.doseLabel}` : '')
                  return (
                    <View key={uv.key} style={[{ borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                      {/* Main row */}
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, gap: 10 }}>
                        <Syringe size={14} color={uv.overdue ? brand.error : brand.accent} strokeWidth={2} style={{ marginTop: 2 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={[s.modalTaskLabel, { color: colors.text }]}>{fullName}</Text>
                          <Text style={[s.modalTaskStatus, { color: uv.overdue ? brand.error : colors.textMuted, marginTop: 2 }]}>
                            {uv.overdue ? 'Overdue · ' : 'Due: '}{uv.dueAge}
                          </Text>
                          {apptDate && (
                            <Text style={[s.modalTaskStatus, { color: brand.success, marginTop: 2 }]}>
                              📅 Appt: {formatHealthDate(apptDate)}
                            </Text>
                          )}
                        </View>
                        {apptDate ? (
                          <View style={{ gap: 6, alignItems: 'flex-end' }}>
                            <Pressable
                              onPress={() => onMarkVaccineGiven(uv.name + (uv.doseLabel ? ` - ${uv.doseLabel}` : ''), apptDate, uv.key)}
                              style={[s.vaccineScheduleBtn, { backgroundColor: brand.success + '20', borderColor: brand.success }]}
                            >
                              <Check size={10} color={brand.success} strokeWidth={3} />
                              <Text style={[s.vaccineScheduleBtnText, { color: brand.success }]}>Mark given</Text>
                            </Pressable>
                            <Pressable onPress={() => { setExpandedKey(isExpanded ? null : uv.key); setPickerDate(new Date(apptDate + 'T12:00:00')) }}>
                              <Text style={[s.vaccineScheduleBtnText, { color: colors.textMuted }]}>Change date</Text>
                            </Pressable>
                          </View>
                        ) : (
                          <Pressable
                            onPress={() => { setExpandedKey(isExpanded ? null : uv.key); setPickerDate(new Date()) }}
                            style={[s.vaccineScheduleBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                          >
                            <Text style={[s.vaccineScheduleBtnText, { color: colors.textMuted }]}>Set date</Text>
                          </Pressable>
                        )}
                      </View>

                      {/* Inline date picker */}
                      {isExpanded && (
                        <View style={{ paddingBottom: 12 }}>
                          <DateTimePicker
                            value={pickerDate}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            minimumDate={new Date()}
                            themeVariant="dark"
                            onChange={(e: DateTimePickerEvent, d?: Date) => {
                              if (Platform.OS === 'android') setExpandedKey(null)
                              if (e.type === 'set' && d) {
                                setPickerDate(d)
                                const y = d.getFullYear()
                                const m = String(d.getMonth() + 1).padStart(2, '0')
                                const day = String(d.getDate()).padStart(2, '0')
                                onSetVaccineDate(uv.key, `${y}-${m}-${day}`)
                                if (Platform.OS === 'android') setExpandedKey(null)
                              }
                              if (e.type === 'dismissed') setExpandedKey(null)
                            }}
                          />
                          {Platform.OS === 'ios' && (
                            <Pressable
                              onPress={() => setExpandedKey(null)}
                              style={[s.vaccineScheduleBtn, { alignSelf: 'center', marginTop: 4, backgroundColor: brand.primary + '20', borderColor: brand.primary }]}
                            >
                              <Text style={[s.vaccineScheduleBtnText, { color: brand.primary }]}>Done</Text>
                            </Pressable>
                          )}
                        </View>
                      )}
                    </View>
                  )
                })}
              </>
            )}

            {/* Latest Growth */}
            {(weight || height) && (
              <>
                <Text style={[s.modalSectionTitle, { color: colors.text }]}>Latest Growth</Text>
                <View style={[s.modalStatCard, { backgroundColor: brand.kids + '10', borderRadius: radius.md }]}>
                  <TrendingUp size={18} color={brand.kids} strokeWidth={2} />
                  <View style={{ flex: 1 }}>
                    {weight && <Text style={[s.modalStatValue, { color: colors.text }]}>{weight}</Text>}
                    {height && <Text style={[s.modalStatLabel, { color: colors.textMuted, marginTop: weight ? 2 : 0 }]}>{height}</Text>}
                  </View>
                  <Text style={[s.modalStatExtra, { color: colors.textMuted }]}>
                    {healthHistory.growth[0]?.date ? formatHealthDate(healthHistory.growth[0].date) : ''}
                  </Text>
                </View>
              </>
            )}

            {/* Activity Overview */}
            <Text style={[s.modalSectionTitle, { color: colors.text }]}>Activity Overview</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
              <Pressable
                onPress={() => setActivityBreakdownVisible(true)}
                style={[s.modalStatCard, { flex: 1, backgroundColor: PILLAR_COLORS.activity + '10', borderRadius: radius.md }]}
              >
                <Zap size={16} color={PILLAR_COLORS.activity} strokeWidth={2} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.modalStatLabel, { color: colors.textMuted }]}>Activities</Text>
                  <Text style={[s.modalStatValue, { color: colors.text }]}>{activityCount.toLocaleString()}</Text>
                </View>
                <ChevronRight size={14} color={colors.textMuted} strokeWidth={2} />
              </Pressable>
              <View style={[s.modalStatCard, { flex: 1, backgroundColor: PILLAR_COLORS.nutrition + '10', borderRadius: radius.md }]}>
                {stage === 'liquid' || stage === 'mixed'
                  ? <Droplets size={16} color={PILLAR_COLORS.nutrition} strokeWidth={2} />
                  : <Utensils size={16} color={PILLAR_COLORS.nutrition} strokeWidth={2} />}
                <View style={{ flex: 1 }}>
                  <Text style={[s.modalStatLabel, { color: colors.textMuted }]}>
                    {stage === 'liquid' ? 'Feedings' : stage === 'mixed' ? 'Feeds' : 'Calories'}
                  </Text>
                  <Text style={[s.modalStatValue, { color: colors.text }]}>
                    {stage === 'liquid' ? feedingCount.toLocaleString() : stage === 'mixed' ? feedingCount.toLocaleString() : (caloriesTotal > 0 ? caloriesTotal.toLocaleString() : '—')}
                  </Text>
                </View>
              </View>
            </View>
            {(stage === 'liquid' || stage === 'mixed') && feedingMl > 0 && (
              <View style={[s.modalStatCard, { backgroundColor: PILLAR_COLORS.nutrition + '08', borderRadius: radius.md }]}>
                <Droplets size={14} color={PILLAR_COLORS.nutrition} strokeWidth={2} />
                <Text style={[s.modalStatLabel, { color: colors.textMuted }]}>Total volume</Text>
                <Text style={[s.modalStatExtra, { color: PILLAR_COLORS.nutrition }]}>{feedingMl.toLocaleString()}ml</Text>
              </View>
            )}

            {/* View Full History */}
            <Pressable
              onPress={() => { onClose(); router.push('/profile/health-history' as any) }}
              style={[s.healthHistoryBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}
            >
              <Heart size={14} color={colors.primary} strokeWidth={2} />
              <Text style={[s.healthHistoryBtnText, { color: colors.primary }]}>View Full Health History</Text>
              <ChevronRight size={14} color={colors.primary} strokeWidth={2} />
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
            <Pressable onPress={onClose} style={[s.modalClose, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
              <X size={18} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
          </View>

          {/* Feeding summary — always shown when there are feedings */}
          {(isLiquid || feedingCount > 0) && (
            <>
              <View style={[s.modalStatCard, { backgroundColor: PILLAR_COLORS.nutrition + '10', borderRadius: radius.md }]}>
                <Droplets size={18} color={PILLAR_COLORS.nutrition} strokeWidth={2} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.modalStatLabel, { color: colors.textMuted }]}>Feedings</Text>
                  <Text style={[s.modalStatValue, { color: colors.text }]}>{feedingCount.toLocaleString()} total</Text>
                </View>
              </View>
              <View style={s.feedingBreakdownRow}>
                <View style={[s.feedingBreakdownCard, { backgroundColor: 'rgba(255,183,197,0.08)', borderRadius: radius.md }]}>
                  <Baby size={20} color="#FFB7C5" strokeWidth={1.8} />
                  <Text style={[s.feedingBreakdownValue, { color: colors.text }]}>{feedingBreast.toLocaleString()}</Text>
                  <Text style={[s.feedingBreakdownLabel, { color: colors.textMuted }]}>Breast</Text>
                </View>
                <View style={[s.feedingBreakdownCard, { backgroundColor: 'rgba(77,150,255,0.08)', borderRadius: radius.md }]}>
                  <Milk size={20} color={brand.kids} strokeWidth={1.8} />
                  <Text style={[s.feedingBreakdownValue, { color: colors.text }]}>{feedingBottle.toLocaleString()}</Text>
                  <Text style={[s.feedingBreakdownLabel, { color: colors.textMuted }]}>Bottle</Text>
                </View>
                <View style={[s.feedingBreakdownCard, { backgroundColor: PILLAR_COLORS.nutrition + '08', borderRadius: radius.md }]}>
                  <Droplets size={20} color={PILLAR_COLORS.nutrition} strokeWidth={1.8} />
                  <Text style={[s.feedingBreakdownValue, { color: colors.text }]}>{feedingMl > 0 ? `${feedingMl.toLocaleString()}ml` : '—'}</Text>
                  <Text style={[s.feedingBreakdownLabel, { color: colors.textMuted }]}>Total Vol</Text>
                </View>
              </View>
              {avgMl > 0 && (
                <Text style={[s.feedingAvgText, { color: colors.textMuted }]}>Average {avgMl.toLocaleString()}ml per feeding</Text>
              )}
            </>
          )}

          {/* Calorie summary (solids or mixed stage) */}
          {(stage === 'solids' || (stage === 'mixed' && caloriesTotal > 0)) && (
            <View style={[s.modalStatCard, { backgroundColor: PILLAR_COLORS.nutrition + '10', borderRadius: radius.md, marginTop: isLiquid ? 12 : 0 }]}>
              <Utensils size={18} color={PILLAR_COLORS.nutrition} strokeWidth={2} />
              <View style={{ flex: 1 }}>
                <Text style={[s.modalStatLabel, { color: colors.textMuted }]}>{stage === 'mixed' ? 'Solids Calories' : 'Calories'}</Text>
                <Text style={[s.modalStatValue, { color: colors.text }]}>{caloriesTotal > 0 ? caloriesTotal.toLocaleString() : '—'} cal</Text>
              </View>
              {stage === 'solids' && <Text style={[s.modalStatExtra, { color: pct >= 90 ? brand.success : PILLAR_COLORS.nutrition }]}>{pct}% of {caloriesTarget.toLocaleString()}</Text>}
            </View>
          )}

          {/* Category breakdown */}
          {categories.length > 0 && (
            <>
              <Text style={[s.modalSectionTitle, { color: colors.text }]}>Breakdown by Category</Text>
              {categories.map((cat, i) => (
                <View key={i} style={s.modalCatRow}>
                  <View style={[s.modalCatDot, { backgroundColor: cat.color }]} />
                  <Text style={[s.modalCatLabel, { color: colors.textSecondary }]}>{cat.label}</Text>
                  <Text style={[s.modalCatValue, { color: colors.text }]}>{cat.cals.toLocaleString()} cal</Text>
                </View>
              ))}
            </>
          )}

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
  const { colors, radius } = useTheme()
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
  const [expandedInfo, setExpandedInfo] = useState<string | null>(null)

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
        <View style={[s.modalContent, { backgroundColor: colors.bg, borderRadius: radius.xl }]}>
          <View style={s.modalHeader}>
            <Text style={[s.modalTitle, { color: colors.text }]}>Set Goals</Text>
            <Pressable onPress={onClose} style={[s.modalClose, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
              <X size={18} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
          </View>
          <Text style={[s.modalSubtitle, { color: colors.textMuted }]}>
            Daily targets for {childName} ({ageLabel}). Goals are per day — they scale automatically with your selected date range.
          </Text>

          {/* Age suggestion banner */}
          <View style={[s.goalSuggestBanner, { backgroundColor: brand.kids + '10', borderRadius: radius.md }]}>
            <Sparkles size={14} color={brand.kids} strokeWidth={2} />
            <Text style={[s.goalSuggestText, { color: colors.textSecondary }]}>
              Suggested goals are based on {childName}'s age ({ageLabel}) using CDC/WHO guidelines
            </Text>
          </View>

          {/* Goal inputs */}
          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
          {metrics.map((m) => {
            const Icon = m.icon
            const isExpanded = expandedInfo === m.key
            return (
              <View key={m.key}>
                <View style={[s.goalRow, { borderBottomColor: isExpanded ? 'transparent' : colors.border }]}>
                  <View style={[s.goalIconWrap, { backgroundColor: m.color + '15' }]}>
                    <Icon size={16} color={m.color} strokeWidth={2} />
                  </View>
                  <View style={s.goalInfo}>
                    <View style={s.goalLabelRow}>
                      <Text style={[s.goalLabel, { color: colors.text }]}>{m.label}</Text>
                      <Pressable
                        onPress={() => setExpandedInfo(isExpanded ? null : m.key)}
                        hitSlop={8}
                      >
                        <Info size={13} color={isExpanded ? brand.kids : colors.textMuted} strokeWidth={2} />
                      </Pressable>
                    </View>
                    <Text style={[s.goalDesc, { color: colors.textMuted }]}>{m.desc}</Text>
                  </View>
                  <View style={s.goalInputWrap}>
                    <Pressable onPress={() => {
                      const n = Math.max(0, (Number(m.value) || 0) - m.step)
                      m.setValue(String(n))
                    }} style={[s.goalStepBtn, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                      <Minus size={12} color={colors.textMuted} strokeWidth={2} />
                    </Pressable>
                    <TextInput
                      style={[s.goalInput, { color: m.color, borderColor: colors.border }]}
                      value={m.value}
                      onChangeText={m.setValue}
                      keyboardType="numeric"
                      selectTextOnFocus
                    />
                    <Pressable onPress={() => {
                      const n = (Number(m.value) || 0) + m.step
                      m.setValue(String(n))
                    }} style={[s.goalStepBtn, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                      <Plus size={12} color={colors.textMuted} strokeWidth={2} />
                    </Pressable>
                  </View>
                  <Text style={[s.goalUnit, { color: colors.textMuted }]}>{m.unit}</Text>
                </View>
                {isExpanded && (
                  <View style={[s.goalReasonCard, { backgroundColor: brand.kids + '08', borderColor: brand.kids + '20', borderBottomColor: colors.border }]}>
                    <View style={s.goalReasonHeader}>
                      <Sparkles size={12} color={brand.kids} strokeWidth={2} />
                      <Text style={[s.goalReasonTitle, { color: brand.kids }]}>
                        Why {m.suggested} {m.unit.split('/')[0]}?
                      </Text>
                    </View>
                    <Text style={[s.goalReasonText, { color: colors.textSecondary }]}>{m.reason}</Text>
                    <Text style={[s.goalReasonSource, { color: colors.textMuted }]}>Source: CDC, WHO, AAP guidelines</Text>
                  </View>
                )}
              </View>
            )
          })}
          </ScrollView>

          {/* Suggested vs current comparison */}
          <View style={s.goalCompareRow}>
            <Pressable onPress={handleReset} style={[s.goalResetBtn, { borderColor: colors.border }]}>
              <Sparkles size={12} color={brand.kids} strokeWidth={2} />
              <Text style={[s.goalResetText, { color: brand.kids }]}>Use Suggested</Text>
            </Pressable>
          </View>

          {/* Save button */}
          <Pressable onPress={handleSave} style={[s.goalSaveBtn, { backgroundColor: colors.primary, borderRadius: radius.md }]}>
            <Text style={s.goalSaveText}>Save Goals</Text>
          </Pressable>
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
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due = r.dueDate ? new Date(r.dueDate + 'T00:00:00') : null
  const diffDays = due ? Math.round((due.getTime() - today.getTime()) / 86400000) : null
  const isOverdue = !r.done && diffDays !== null && diffDays < 0
  const isDueToday = !r.done && diffDays === 0
  const isDueSoon = !r.done && diffDays !== null && diffDays > 0 && diffDays <= 3
  const dueDateColor = isOverdue ? brand.error : isDueToday ? brand.accent : isDueSoon ? brand.warning : colors.textMuted
  const dueDateLabel = due
    ? isOverdue ? `${Math.abs(diffDays!)}d overdue`
    : isDueToday ? 'Due today'
    : `Due ${due.toLocaleDateString('en', { month: 'short', day: 'numeric' })}`
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

  return (
    <View style={[
      s.reminderRow,
      !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
      r.flagged && { borderLeftWidth: 3, borderLeftColor: brand.accent },
      isDragging && { backgroundColor: 'rgba(112,72,184,0.12)', elevation: 8, shadowColor: '#7048B8', shadowOpacity: 0.3, shadowRadius: 8 },
    ]}>
      {/* Drag handle */}
      <View style={{ paddingRight: 4, justifyContent: 'center', opacity: 0.4 }} {...(dragHandleProps ?? {})}>
        <GripVertical size={15} color={colors.textMuted} strokeWidth={2} />
      </View>
      <Pressable
        onPress={onToggle}
        style={[s.reminderCheck, {
          backgroundColor: r.done ? brand.success : 'transparent',
          borderWidth: r.done ? 0 : 1.5,
          borderColor: isOverdue ? brand.error : colors.border,
        }]}
      >
        {r.done && <Check size={9} color="#FFF" strokeWidth={3} />}
      </Pressable>
      <View style={{ flex: 1, gap: 3 }}>
        {editing ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TextInput
              style={[s.reminderText, { color: colors.text, flex: 1, borderBottomWidth: 1, borderBottomColor: colors.primary, paddingVertical: 2 }]}
              value={editText}
              onChangeText={setEditText}
              onSubmitEditing={commitEdit}
              onBlur={commitEdit}
              autoFocus
              returnKeyType="done"
            />
            <Pressable onPress={commitEdit} hitSlop={8}>
              <Check size={14} color={brand.success} strokeWidth={2.5} />
            </Pressable>
            <Pressable onPress={() => { setEditText(r.text); setEditing(false) }} hitSlop={8}>
              <X size={14} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
          </View>
        ) : (
          <Text
            style={[s.reminderText, { color: r.done ? colors.textMuted : colors.text, textDecorationLine: r.done ? 'line-through' : 'none' }]}
            numberOfLines={2}
          >{r.text}</Text>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          {taggedChild && (
            <View style={[s.reminderChildTag, { backgroundColor: tagColor + '20', borderColor: tagColor + '50' }]}>
              <Baby size={9} color={tagColor} strokeWidth={2} />
              <Text style={[s.reminderChildTagText, { color: tagColor }]}>{taggedChild.name}</Text>
            </View>
          )}
          {dueDateLabel && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Clock size={10} color={dueDateColor} strokeWidth={2} />
              <Text style={[s.reminderDueText, { color: dueDateColor }]}>{dueDateLabel}</Text>
            </View>
          )}
          {r.done && r.archivedAt && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Check size={10} color={brand.success} strokeWidth={2.5} />
              <Text style={[s.reminderDueText, { color: brand.success }]}>
                Done {new Date(r.archivedAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
              </Text>
            </View>
          )}
        </View>
      </View>
      {!editing && !r.done && (
        <Pressable onPress={() => { setEditText(r.text); setEditing(true) }} hitSlop={12} style={{ marginRight: 8 }}>
          <Pencil size={12} color={colors.textMuted} strokeWidth={2} />
        </Pressable>
      )}
      {onFlag && (
        <Pressable onPress={onFlag} hitSlop={12} style={{ marginRight: 8 }}>
          <Flag size={13} color={r.flagged ? brand.accent : colors.textMuted} fill={r.flagged ? brand.accent : 'transparent'} strokeWidth={2} />
        </Pressable>
      )}
      <Pressable onPress={onDelete} hitSlop={12}>
        <Trash2 size={13} color={colors.textMuted} strokeWidth={2} />
      </Pressable>
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
    <View style={[s.remindersCard, { backgroundColor: colors.surface, borderColor: colors.borderLight, borderRadius: radius.lg }]}>
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
  const { radius } = useTheme()
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
      <View style={[s.reminderModal, { backgroundColor: colors.bg }]}>
        {/* Drag handle */}
        <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
          <View style={{ width: 42, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
        </View>
        {/* Header */}
        <View style={[s.reminderModalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[s.reminderModalTitle, { color: colors.text }]}>Reminders</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <View style={{ width: 34, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
              <X size={16} color={colors.text} strokeWidth={2} />
            </View>
          </Pressable>
        </View>

        {/* Completion metric strip */}
        <View style={[s.reminderMetricStrip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.reminderMetricItem}>
            <Text style={[s.reminderMetricVal, { color: colors.text }]}>{active.length}</Text>
            <Text style={[s.reminderMetricLabel, { color: colors.textMuted }]}>Active</Text>
          </View>
          <View style={[s.reminderMetricDivider, { backgroundColor: colors.border }]} />
          <View style={s.reminderMetricItem}>
            <Text style={[s.reminderMetricVal, { color: '#BDD48C' }]}>{thisWeek}</Text>
            <Text style={[s.reminderMetricLabel, { color: colors.textMuted }]}>Done this week</Text>
          </View>
          <View style={[s.reminderMetricDivider, { backgroundColor: colors.border }]} />
          <View style={s.reminderMetricItem}>
            <Text style={[s.reminderMetricVal, { color: '#9DC3E8' }]}>{completionRate}%</Text>
            <Text style={[s.reminderMetricLabel, { color: colors.textMuted }]}>Completion</Text>
          </View>
        </View>

        {/* Kid filter pills */}
        {childrenWithReminders.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 }}
          >
            {/* All pill */}
            {(() => {
              const isActive = selectedChildId === null
              return (
                <Pressable
                  key="all"
                  onPress={() => setSelectedChildId(null)}
                  style={{
                    alignSelf: 'flex-start',
                    paddingVertical: 7,
                    paddingHorizontal: 16,
                    borderRadius: radius.full,
                    borderWidth: 1,
                    backgroundColor: isActive ? colors.primary : colors.primaryTint,
                    borderColor: colors.primary + '50',
                  }}
                >
                  <Text style={{ fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: isActive ? '#FFF' : colors.primary }}>All</Text>
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
                    alignSelf: 'flex-start',
                    paddingVertical: 7,
                    paddingHorizontal: 16,
                    borderRadius: radius.full,
                    borderWidth: 1,
                    backgroundColor: isActive ? kidColor : kidColor + '2E',
                    borderColor: isActive ? kidColor : kidColor + '50',
                  }}
                >
                  <Text style={{ fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: isActive ? '#141313' : kidColor }}>{c.name}</Text>
                </Pressable>
              )
            })}
          </ScrollView>
        )}

        {/* Tabs */}
        <View style={[s.reminderTabs, { borderBottomColor: colors.border }]}>
          {(['active', 'archived'] as const).map(t => (
            <Pressable key={t} onPress={() => setTab(t)} style={s.reminderTab}>
              <Text style={[s.reminderTabText, {
                color: tab === t ? colors.primary : colors.textMuted,
                fontWeight: tab === t ? '700' : '500',
              }]}>
                {t === 'active' ? `Active (${active.length})` : `Archived (${archived.length})`}
              </Text>
              {tab === t && <View style={[s.reminderTabLine, { backgroundColor: colors.primary }]} />}
            </Pressable>
          ))}
        </View>

        {/* List */}
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} scrollEnabled={!isDraggingReminder}>
          {tab === 'active' ? (
            active.length === 0 ? (
              <View style={s.reminderModalEmpty}>
                <Bell size={28} color={colors.textMuted} strokeWidth={1.5} />
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
              <Check size={28} color={colors.textMuted} strokeWidth={1.5} />
              <Text style={[s.remindersEmptyText, { color: colors.textSecondary }]}>Nothing archived yet</Text>
            </View>
          ) : (
            archivedByDate.map(({ label, items }) => (
              <View key={label} style={{ marginHorizontal: 16, marginTop: 16 }}>
                <Text style={{ fontSize: 10, fontFamily: 'DMSans_600SemiBold', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 }}>{label}</Text>
                <View style={[s.remindersCard, { backgroundColor: colors.surface, borderColor: colors.borderLight, borderRadius: radius.lg }]}>
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

  // Sticker-green soft for "done", mode-color soft for active, paper otherwise
  const bg = isDone
    ? (isDark ? 'rgba(189,212,140,0.16)' : '#DDE7BB')
    : isActive
      ? leapColor + '18'
      : (isDark ? colors.surface : '#FFFEF8')
  const border = isDone
    ? (isDark ? 'rgba(189,212,140,0.35)' : 'rgba(189,212,140,0.6)')
    : isActive
      ? leapColor + '40'
      : (isDark ? colors.border : 'rgba(20,19,19,0.08)')

  return (
    <View>
      {/* ── Compact card ── */}
      <Pressable
        onPress={() => setShowDetail(true)}
        style={[s.leapCard, { backgroundColor: bg, borderColor: border }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={[s.leapNumCircle, { backgroundColor: isDone ? brand.success + '20' : leapColor + '20', borderColor: isDone ? brand.success + '50' : leapColor + '50' }]}>
            {isDone
              ? <Check size={14} color={brand.success} strokeWidth={3} />
              : <Text style={[s.leapNumText, { color: leapColor }]}>{leap.index + 1}</Text>
            }
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.leapTitle, { color: colors.text }]}>{isDone ? 'All Leaps Complete' : leap.name}</Text>
            <Text style={[s.leapDesc, { color: colors.textMuted }]}>
              {isDone ? 'Your child has completed all 10 Wonder Weeks' : isActive && currentPhaseName ? `Phase: ${currentPhaseName}` : leap.desc}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <View style={[s.leapBadge, { backgroundColor: isActive ? leapColor + '22' : isDone ? brand.success + '22' : colors.surfaceGlass, borderColor: isActive ? leapColor + '60' : isDone ? brand.success + '60' : colors.border }]}>
              <Text style={[s.leapBadgeText, { color: isActive ? leapColor : isDone ? brand.success : colors.textMuted }]}>
                {isActive ? 'NOW' : isDone ? 'ALL DONE' : `In ${(leap as any).weeksUntil ?? '?'}w`}
              </Text>
            </View>
            <ChevronRight size={14} color={colors.textMuted} strokeWidth={2} />
          </View>
        </View>

        {/* 10-dot progress */}
        <View style={s.leapAllDots}>
          {GROWTH_LEAPS.map((_, i) => {
            const done = i < leap.completedCount
            const active = i === leap.index && isActive
            const upcoming = i === leap.index && !isActive && !isDone
            const dotBg = done ? brand.success : active ? leapColor : upcoming ? 'transparent' : colors.border
            return (
              <View
                key={i}
                style={[s.leapAllDot, { backgroundColor: dotBg },
                  active && { transform: [{ scale: 1.3 }] },
                  upcoming && { borderWidth: 1.5, borderColor: leapColor },
                ]}
              >
                {done && <Check size={7} color="#000" strokeWidth={3} />}
              </View>
            )
          })}
        </View>
        <Text style={[s.leapAllDotsLabel, { color: colors.textMuted }]}>
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

function GrowthLeapDetail({ visible, onClose, leap, childName, isActive, phaseIndex, leapColor }: {
  visible: boolean
  onClose: () => void
  leap: NonNullable<ReturnType<typeof getGrowthLeap>>
  childName: string
  isActive: boolean
  phaseIndex: number
  leapColor: string
}) {
  const { colors, radius } = useTheme()
  const [selectedLeapIdx, setSelectedLeapIdx] = useState<number | null>(null)
  const gl = GROWTH_LEAPS[leap.index]
  if (!gl) return null

  const isDone = leap.status === 'done'
  const phaseDone = [phaseIndex > 0, phaseIndex > 1, false]
  const phaseCurrent = [phaseIndex === 0, phaseIndex === 1, phaseIndex === 2]

  const heroBadgeText = isActive ? 'IN PROGRESS' : isDone ? 'ALL DONE' : `In ${(leap as any).weeksUntil ?? '?'}w`
  const heroBadgeColor = isActive ? leapColor : isDone ? brand.success : colors.textMuted
  const heroBadgeBg = isActive ? leapColor + '22' : isDone ? brand.success + '22' : colors.surfaceGlass
  const heroBadgeBorder = isActive ? leapColor + '60' : isDone ? brand.success + '60' : colors.border

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {/* Header */}
        <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Pressable onPress={onClose} style={[s.modalClose, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
            <X size={18} color={colors.textMuted} strokeWidth={2} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Growth Leaps</Text>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>{childName} · Week {leap.weekAge}</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
          {/* Current leap hero */}
          <View style={{ margin: 16, gap: 16 }}>
            <View style={{ backgroundColor: leapColor + '12', borderRadius: radius.lg, borderWidth: 1, borderColor: leapColor + '30', padding: 18, gap: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: leapColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>Leap #{leap.index + 1}</Text>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>{isDone ? 'All Leaps Complete' : gl.name}</Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>{isDone ? `${childName} has completed all 10 Wonder Weeks` : gl.desc}</Text>
                </View>
                <View style={[s.leapBadge, { backgroundColor: heroBadgeBg, borderColor: heroBadgeBorder }]}>
                  <Text style={[s.leapBadgeText, { color: heroBadgeColor }]}>{heroBadgeText}</Text>
                </View>
              </View>

              {/* Age & duration row */}
              {!isDone && (
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1, backgroundColor: colors.surfaceGlass, borderRadius: radius.sm, padding: 10, gap: 2 }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Typical Age</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{gl.ageRange}</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: colors.surfaceGlass, borderRadius: radius.sm, padding: 10, gap: 2 }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Duration</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{gl.duration}</Text>
                  </View>
                </View>
              )}

              {/* Brain note */}
              {!isDone && (
                <View style={{ gap: 6 }}>
                  <Text style={[s.leapSectionLabel, { color: colors.textMuted }]}>What's happening in the brain</Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 20 }}>{gl.brainNote}</Text>
                </View>
              )}

              {/* Phase checklist */}
              {!isDone && (
                <View style={{ gap: 10 }}>
                  <Text style={[s.leapSectionLabel, { color: colors.textMuted }]}>The 3 Phases</Text>
                  {gl.phases.map((phase, pi) => {
                    const done = phaseDone[pi]
                    const current = phaseCurrent[pi] && isActive
                    return (
                      <View key={pi} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                        <View style={[s.leapPhaseIcon, {
                          marginTop: 2,
                          backgroundColor: done ? brand.success + '25' : current ? leapColor + '25' : colors.surfaceGlass,
                          borderWidth: current ? 1.5 : 0,
                          borderColor: leapColor,
                        }]}>
                          {done
                            ? <Check size={10} color={brand.success} strokeWidth={3} />
                            : <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: current ? leapColor : colors.border }} />
                          }
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: done ? brand.success : current ? leapColor : colors.textMuted }}>
                            {phase.label}{current ? '  ← now' : ''}
                          </Text>
                          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2, lineHeight: 18 }}>{phase.desc}</Text>
                        </View>
                      </View>
                    )
                  })}
                </View>
              )}
            </View>

            {/* Signs */}
            {!isDone && (
              <View style={{ gap: 8 }}>
                <Text style={[s.leapSectionLabel, { color: colors.textMuted }]}>
                  {isActive ? `Signs ${childName} may show` : 'Signs to expect'}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {gl.signs.map((sign, i) => (
                    <View key={i} style={[s.leapSignChip, { backgroundColor: leapColor + '12', borderColor: leapColor + '35' }]}>
                      <Text style={[s.leapSignText, { color: leapColor }]}>{sign}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Skills */}
            {!isDone && (
              <View style={{ gap: 8 }}>
                <Text style={[s.leapSectionLabel, { color: colors.textMuted }]}>
                  {isActive ? 'Skills emerging now' : 'Skills that will emerge'}
                </Text>
                <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, gap: 10, borderWidth: 1, borderColor: colors.borderLight }}>
                  {gl.skills.map((skill, i) => (
                    <View key={i} style={s.leapSkillRow}>
                      <View style={[s.leapSkillDot, { backgroundColor: leapColor }]} />
                      <Text style={[s.leapSkillText, { color: colors.textSecondary }]}>{skill}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Activities */}
            {!isDone && (
              <View style={{ gap: 8 }}>
                <Text style={[s.leapSectionLabel, { color: colors.textMuted }]}>Activities to support this leap</Text>
                <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, gap: 10, borderWidth: 1, borderColor: colors.borderLight }}>
                  {gl.activities.map((act, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: leapColor + '20', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: leapColor }}>{i + 1}</Text>
                      </View>
                      <Text style={{ fontSize: 13, color: colors.textSecondary, flex: 1, lineHeight: 19 }}>{act}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Tip */}
            {!isDone && (
              <View style={[s.leapTip, { backgroundColor: brand.warning + '10', borderColor: brand.warning + '25' }]}>
                <View style={[s.leapTipIcon, { backgroundColor: brand.warning + '18' }]}>
                  <Sparkles size={14} color={brand.warning} strokeWidth={2} />
                </View>
                <Text style={[s.leapTipText, { color: colors.textSecondary }]}>{gl.tip}</Text>
              </View>
            )}
          </View>

          {/* All leaps list */}
          <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 16, marginBottom: 16 }} />
          <Text style={[s.leapSectionLabel, { color: colors.textMuted, paddingHorizontal: 20, marginBottom: 8 }]}>All 10 Leaps</Text>
          {GROWTH_LEAPS.map((g, i) => {
            const done = i < leap.completedCount
            const active = i === leap.index && isActive
            const upcoming = i === leap.index && !isActive && !isDone
            const allDone = isDone
            const gc = g.color || brand.kids
            return (
              <Pressable
                key={i}
                onPress={() => setSelectedLeapIdx(i)}
                style={[s.leapModalRow, {
                  backgroundColor: active ? gc + '10' : done ? 'rgba(255,255,255,0.02)' : 'transparent',
                  borderLeftColor: done || allDone ? brand.success : active ? gc : upcoming ? gc + '55' : colors.border,
                  opacity: !done && !active && !upcoming && !allDone ? 0.5 : 1,
                }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[s.leapModalNum, { backgroundColor: done || allDone ? brand.success : active ? gc : colors.border }]}>
                    {done || allDone
                      ? <Check size={9} color="#000" strokeWidth={3} />
                      : <Text style={{ fontSize: 8, fontWeight: '900', color: active ? '#fff' : colors.textMuted }}>{i + 1}</Text>
                    }
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.leapModalName, { color: done || allDone ? colors.textSecondary : active ? colors.text : colors.textMuted }]}>{g.name}</Text>
                    <Text style={s.leapModalDesc}>{g.desc}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 3 }}>
                    {(done || allDone) && <View style={[s.leapBadge, { backgroundColor: brand.success + '18', borderColor: brand.success + '35' }]}><Text style={[s.leapBadgeText, { color: brand.success }]}>DONE</Text></View>}
                    {active && <View style={[s.leapBadge, { backgroundColor: gc + '22', borderColor: gc + '50' }]}><Text style={[s.leapBadgeText, { color: gc }]}>NOW</Text></View>}
                    {!done && !active && !allDone && <Text style={[s.leapWeekLabel, { color: colors.textMuted }]}>Wk {g.week}</Text>}
                    <ChevronRight size={12} color={colors.textMuted} strokeWidth={2} />
                  </View>
                </View>
              </Pressable>
            )
          })}
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
  const { colors, radius } = useTheme()
  const g = GROWTH_LEAPS[leapIdx]
  if (!g) return null

  const gc = g.color || brand.kids
  const isThisActive = leapIdx === currentLeap.index && isCurrentActive
  const isThisDone = leapIdx < currentLeap.completedCount
  const isThisUpcoming = !isThisActive && !isThisDone

  const phaseDone = isThisActive ? [(currentPhaseIndex > 0), (currentPhaseIndex > 1), false] : isThisDone ? [true, true, true] : [false, false, false]
  const phaseCurrent = isThisActive ? [(currentPhaseIndex === 0), (currentPhaseIndex === 1), (currentPhaseIndex === 2)] : [false, false, false]

  const badgeText = isThisActive ? 'IN PROGRESS' : isThisDone ? 'DONE' : `Week ${g.week}`
  const badgeColor = isThisActive ? gc : isThisDone ? brand.success : colors.textMuted
  const badgeBg = isThisActive ? gc + '22' : isThisDone ? brand.success + '22' : colors.surfaceGlass
  const badgeBorder = isThisActive ? gc + '60' : isThisDone ? brand.success + '60' : colors.border

  return (
    <Modal visible animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {/* Header */}
        <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Pressable onPress={onClose} style={[s.modalClose, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
            <X size={18} color={colors.textMuted} strokeWidth={2} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: gc, textTransform: 'uppercase', letterSpacing: 0.5 }}>Leap #{leapIdx + 1}</Text>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{g.name}</Text>
          </View>
          <View style={[s.leapBadge, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
            <Text style={[s.leapBadgeText, { color: badgeColor }]}>{badgeText}</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 56, gap: 16 }}>
          {/* Age & duration */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, backgroundColor: gc + '12', borderRadius: radius.md, padding: 12, gap: 3, borderWidth: 1, borderColor: gc + '25' }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: gc, textTransform: 'uppercase', letterSpacing: 0.5 }}>Typical Age</Text>
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>{g.ageRange}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: gc + '12', borderRadius: radius.md, padding: 12, gap: 3, borderWidth: 1, borderColor: gc + '25' }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: gc, textTransform: 'uppercase', letterSpacing: 0.5 }}>Duration</Text>
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>{g.duration}</Text>
            </View>
          </View>

          {/* Description */}
          <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: 16, gap: 8, borderWidth: 1, borderColor: colors.borderLight }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{g.desc}</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 20 }}>{g.brainNote}</Text>
          </View>

          {/* Phases */}
          <View style={{ gap: 10 }}>
            <Text style={[s.leapSectionLabel, { color: colors.textMuted }]}>The 3 Phases</Text>
            {g.phases.map((phase, pi) => {
              const done = phaseDone[pi]
              const current = phaseCurrent[pi]
              return (
                <View key={pi} style={{ backgroundColor: done ? brand.success + '08' : current ? gc + '10' : colors.surface, borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: done ? brand.success + '25' : current ? gc + '35' : colors.borderLight, flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: done ? brand.success + '25' : current ? gc + '25' : colors.surfaceGlass, alignItems: 'center', justifyContent: 'center', marginTop: 1, borderWidth: current ? 1.5 : 0, borderColor: gc }}>
                    {done
                      ? <Check size={11} color={brand.success} strokeWidth={3} />
                      : <Text style={{ fontSize: 9, fontWeight: '900', color: current ? gc : colors.textMuted }}>{pi + 1}</Text>
                    }
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: done ? brand.success : current ? gc : colors.text }}>
                      {phase.label}{current ? '  · happening now' : ''}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 18 }}>{phase.desc}</Text>
                  </View>
                </View>
              )
            })}
          </View>

          {/* Signs */}
          <View style={{ gap: 8 }}>
            <Text style={[s.leapSectionLabel, { color: colors.textMuted }]}>
              {isThisActive ? `Signs ${childName} may show` : 'Signs to watch for'}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {g.signs.map((sign, i) => (
                <View key={i} style={[s.leapSignChip, { backgroundColor: gc + '12', borderColor: gc + '35' }]}>
                  <Text style={[s.leapSignText, { color: gc }]}>{sign}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Skills */}
          <View style={{ gap: 8 }}>
            <Text style={[s.leapSectionLabel, { color: colors.textMuted }]}>
              {isThisDone ? 'Skills gained' : isThisActive ? 'Skills emerging now' : 'Skills that will emerge'}
            </Text>
            <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, gap: 10, borderWidth: 1, borderColor: colors.borderLight }}>
              {g.skills.map((skill, i) => (
                <View key={i} style={s.leapSkillRow}>
                  <View style={[s.leapSkillDot, { backgroundColor: isThisDone ? brand.success : gc }]} />
                  <Text style={[s.leapSkillText, { color: colors.textSecondary }]}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Activities */}
          <View style={{ gap: 8 }}>
            <Text style={[s.leapSectionLabel, { color: colors.textMuted }]}>Activities to support this leap</Text>
            <View style={{ gap: 8 }}>
              {g.activities.map((act, i) => (
                <View key={i} style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start', borderWidth: 1, borderColor: colors.borderLight }}>
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: gc + '20', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 11, fontWeight: '900', color: gc }}>{i + 1}</Text>
                  </View>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, flex: 1, lineHeight: 20 }}>{act}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Tip */}
          <View style={[s.leapTip, { backgroundColor: brand.warning + '10', borderColor: brand.warning + '25' }]}>
            <View style={[s.leapTipIcon, { backgroundColor: brand.warning + '18' }]}>
              <Sparkles size={14} color={brand.warning} strokeWidth={2} />
            </View>
            <Text style={[s.leapTipText, { color: colors.textSecondary }]}>{g.tip}</Text>
          </View>

          {/* Status footer for done leaps */}
          {isThisDone && (
            <View style={{ backgroundColor: brand.success + '10', borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: brand.success + '25', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: brand.success + '25', alignItems: 'center', justifyContent: 'center' }}>
                <Check size={14} color={brand.success} strokeWidth={3} />
              </View>
              <Text style={{ fontSize: 13, color: brand.success, flex: 1, fontWeight: '600' }}>
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
  miniMetricBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999, borderWidth: 1 },
  miniMetricDot: { width: 6, height: 6, borderRadius: 3 },
  miniMetricLabel: { fontSize: 11, fontFamily: 'DMSans_600SemiBold' },
  miniRingsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  miniRingCol: { alignItems: 'center', gap: 6 },
  miniRingOuter: { alignItems: 'center', justifyContent: 'center' },
  miniRingLabel: { fontSize: 10, fontFamily: 'DMSans_600SemiBold', textTransform: 'uppercase', letterSpacing: 1.2 },

  // Hero — concentric rings + Fraunces number + mono-caps unit + orange-soft pill
  heroWrap: { alignItems: 'center', paddingVertical: 8 },
  heroCenter: { alignItems: 'center', gap: 4 },
  heroNumber: { fontSize: 44, letterSpacing: -1.2, fontFamily: 'Fraunces_600SemiBold' },
  heroUnit: { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'DMSans_600SemiBold' },
  heroBadge: { marginTop: 6, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  heroBadgeText: { fontSize: 11, fontFamily: 'DMSans_600SemiBold' },

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

  // Health
  healthList: { gap: 6, marginBottom: 2 },
  healthRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  healthCheck: { width: 14, height: 14, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  healthLabel: { fontSize: 10, fontWeight: '500', flex: 1 },

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
  reminderInputCard: { padding: 12, borderWidth: 1, gap: 8 },
  reminderInput: { fontSize: 14, fontWeight: '500' },
  reminderInputActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reminderDateBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, flex: 1 },
  reminderDateBtnText: { fontSize: 11, fontWeight: '600', flex: 1 },
  reminderSaveBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  reminderSaveBtnText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  remindersCard: { borderWidth: 1, overflow: 'hidden' },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
  reminderCheck: { width: 18, height: 18, borderRadius: 5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  reminderText: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  reminderDueText: { fontSize: 10, fontWeight: '600' },
  reminderChildTag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 20, borderWidth: 1 },
  reminderChildTagText: { fontSize: 10, fontWeight: '700' },
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
  reminderModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 10, paddingBottom: 14, borderBottomWidth: 1 },
  reminderModalTitle: { fontSize: 24, fontFamily: 'Fraunces_600SemiBold', letterSpacing: -0.4 },
  reminderMetricStrip: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, marginTop: 16, borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  reminderMetricItem: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 2 },
  reminderMetricVal: { fontSize: 24, fontFamily: 'Fraunces_600SemiBold', letterSpacing: -0.4 },
  reminderMetricLabel: { fontSize: 10, fontFamily: 'DMSans_600SemiBold', textTransform: 'uppercase', letterSpacing: 1.2 },
  reminderMetricDivider: { width: 1, height: 40 },
  reminderTabs: { flexDirection: 'row', borderBottomWidth: 1, marginTop: 16 },
  reminderTab: { flex: 1, alignItems: 'center', paddingBottom: 12, paddingTop: 4 },
  reminderTabText: { fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
  reminderTabLine: { height: 2, width: '60%', borderRadius: 2, marginTop: 8 },
  reminderModalEmpty: { alignItems: 'center', paddingVertical: 48, gap: 8 },

  // Grandma CTA — lavender soft bg with ink text and sparkle sticker
  grandmaCard: {
    flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14,
    overflow: 'hidden',
    backgroundColor: '#E0D5F3',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(183,166,232,0.5)',
  },
  grandmaBlob: {
    position: 'absolute', right: -24, top: -24,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(183,166,232,0.28)',
  },
  grandmaIconWrap: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFFEF8',
    borderWidth: 1,
    borderColor: 'rgba(20,19,19,0.08)',
  },
  grandmaArrow: {
    width: 30, height: 30, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFFEF8',
    borderWidth: 1,
    borderColor: 'rgba(20,19,19,0.08)',
  },
  grandmaTitle: { fontSize: 18, fontFamily: 'Fraunces_600SemiBold', color: '#141313', letterSpacing: -0.3 },
  grandmaDesc: { fontSize: 12, fontFamily: 'DMSans_400Regular', color: '#3A3533', marginTop: 2 },

  // Rewards — dark ink card with yellow stars
  rewardsCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
    overflow: 'hidden',
    backgroundColor: '#141313',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(245,214,82,0.22)',
  },
  rewardsBlob: {
    position: 'absolute', right: -20, top: -20,
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(245,214,82,0.08)',
  },
  rewardsIconWrap: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(245,214,82,0.18)',
  },
  rewardsArrow: { width: 28, height: 28, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  rewardsTitle: { fontSize: 15, fontFamily: 'Fraunces_600SemiBold', color: '#F5EDDC', letterSpacing: -0.2 },
  rewardsDesc: { fontSize: 11, fontFamily: 'DMSans_400Regular', color: 'rgba(245,237,220,0.6)', marginTop: 2 },
  rewardsStats: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  rewardsStat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rewardsStatNum: { fontSize: 13, fontFamily: 'DMSans_600SemiBold' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(10,8,6,0.55)', justifyContent: 'flex-end' },
  modalContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40, height: '92%', borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 22, fontFamily: 'Fraunces_600SemiBold', letterSpacing: -0.4 },
  modalClose: { width: 32, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  modalSubtitle: { fontSize: 12, fontWeight: '600', marginBottom: 20 },

  // Mood modal — line chart
  moodChartWrap: { padding: 8, overflow: 'hidden' },
  moodChipsRow: { gap: 6, paddingHorizontal: 2, paddingBottom: 2 },
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
  modalSectionTitle: { fontSize: 16, fontFamily: 'Fraunces_600SemiBold', marginTop: 20, marginBottom: 10, letterSpacing: -0.2 },

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
  setGoalsBtnText: { fontSize: 14, fontFamily: 'DMSans_600SemiBold' },
  setGoalsBtnHint: { flex: 1, fontSize: 12, fontFamily: 'DMSans_400Regular', textAlign: 'right' },

  // Goal Setting Modal
  goalSuggestBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, marginBottom: 16 },
  goalSuggestText: { flex: 1, fontSize: 11, fontWeight: '500', lineHeight: 16 },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 16, borderBottomWidth: 1 },
  goalIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  goalInfo: { flex: 1 },
  goalLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  goalLabel: { fontSize: 14, fontWeight: '700' },
  goalDesc: { fontSize: 10, fontWeight: '500', marginTop: 2 },
  goalInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  goalStepBtn: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  goalInput: { width: 56, height: 36, borderWidth: 1, borderRadius: 8, textAlign: 'center', fontSize: 16, fontWeight: '800' },
  goalUnit: { fontSize: 9, fontWeight: '600', width: 48 },
  goalReasonCard: { marginHorizontal: 4, marginBottom: 4, padding: 12, borderRadius: 12, borderWidth: 1, borderBottomWidth: 1, gap: 6 },
  goalReasonHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  goalReasonTitle: { fontSize: 12, fontWeight: '800' },
  goalReasonText: { fontSize: 12, fontWeight: '500', lineHeight: 18 },
  goalReasonSource: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  goalCompareRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  goalResetBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1, borderRadius: 999 },
  goalResetText: { fontSize: 12, fontWeight: '700' },
  goalSaveBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 16 },
  goalSaveText: { fontSize: 15, fontWeight: '700', color: '#FFF' },

  // Health tags (allergies)
  healthTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  healthTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 },
  healthTagText: { fontSize: 11, fontFamily: 'DMSans_600SemiBold' },

  // View Full History button
  healthHistoryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderWidth: 1, marginTop: 20, marginBottom: 8 },
  healthHistoryBtnText: { flex: 1, fontSize: 13, fontWeight: '700' },

  // Vaccine schedule button
  vaccineScheduleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1 },
  vaccineScheduleBtnText: { fontSize: 11, fontWeight: '700' },
})
