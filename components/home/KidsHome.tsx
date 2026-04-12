/**
 * Kids Home — Premium Data-Rich Dashboard
 *
 * Multi-ring progress hero (Sleep, Calories, Activity), date range picker,
 * past-7-days mini rings, detail modals for metric cards.
 * All real data from Supabase.
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  View, Text, Pressable, ScrollView, StyleSheet, Dimensions, Image, Modal, TextInput, Platform,
} from 'react-native'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import Svg, {
  Circle as SvgCircle, Defs, LinearGradient, Stop, Path, Line as SvgLine, Text as SvgText,
} from 'react-native-svg'
import {
  Moon, Smile, Utensils, Heart, Camera, ChevronRight, ChevronDown,
  Thermometer, MessageCircle, Plus, AlertCircle, Baby,
  Brain, Rocket, Check, Sparkles, Activity, X, TrendingUp,
  Zap, Droplets, Clock, Settings, Target, Minus, Milk, Hand, Info,
  Bell, Trash2, Syringe, Pill,
} from 'lucide-react-native'
import { useTheme, brand } from '../../constants/theme'
import { useChildStore } from '../../store/useChildStore'
import { useJourneyStore } from '../../store/useJourneyStore'
import { useGoalsStore, getSuggestedGoals, getFeedingStage, getNutritionLabel, getAgeMonths, type MetricGoals, type FeedingStage } from '../../store/useGoalsStore'
import { supabase } from '../../lib/supabase'
import { estimateCalories } from '../../lib/foodCalories'
import type { ChildWithRole } from '../../types'

const SW = Dimensions.get('window').width

// ─── Growth Leap Data ────────────────────────────────────────────────────────

const GROWTH_LEAPS = [
  { week: 5, name: 'Changing Sensations', desc: 'Awareness of senses' },
  { week: 8, name: 'Patterns', desc: 'Recognizing simple patterns' },
  { week: 12, name: 'Smooth Transitions', desc: 'Smoother movements' },
  { week: 19, name: 'Events', desc: 'Understanding sequences' },
  { week: 26, name: 'Relationships', desc: 'Connecting cause & effect' },
  { week: 37, name: 'Categories', desc: 'Grouping things together' },
  { week: 46, name: 'Sequences', desc: 'Following step-by-step' },
  { week: 55, name: 'Programs', desc: 'Understanding rules & principles' },
  { week: 64, name: 'Principles', desc: 'Flexible thinking & planning' },
  { week: 75, name: 'Systems', desc: 'Complex systems understanding' },
]

function getGrowthLeap(birthDate: string) {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  const now = new Date()
  const weekAge = Math.floor((now.getTime() - birth.getTime()) / (7 * 24 * 60 * 60 * 1000))

  for (let i = 0; i < GROWTH_LEAPS.length; i++) {
    const leap = GROWTH_LEAPS[i]
    const leapStart = leap.week - 2
    const leapEnd = leap.week + 1

    if (weekAge >= leapStart && weekAge <= leapEnd) {
      return { ...leap, status: 'active' as const, index: i, weekAge, progress: (weekAge - leapStart) / (leapEnd - leapStart) }
    }
    if (weekAge < leapStart) {
      const weeksUntil = leapStart - weekAge
      return { ...leap, status: 'upcoming' as const, index: i, weekAge, weeksUntil, progress: 0 }
    }
  }
  return null
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

const CHILD_COLORS = [brand.kids, brand.prePregnancy, brand.accent, brand.phase.ovulation, brand.pregnancy, brand.secondary]

const MOOD_COLORS: Record<string, string> = {
  happy: '#FBBF24', calm: '#6EC96E', energetic: '#4D96FF', fussy: '#FF9800', cranky: '#FF7070',
}
const MOOD_LABELS: Record<string, string> = {
  happy: 'Happy', calm: 'Calm', energetic: 'Active', fussy: 'Fussy', cranky: 'Cranky',
}

// Normalize a date value from Supabase to YYYY-MM-DD string
function toDateStr(d: any): string {
  if (!d) return ''
  if (typeof d === 'string') {
    // Already YYYY-MM-DD or ISO string
    return d.substring(0, 10)
  }
  if (d instanceof Date) return d.toISOString().split('T')[0]
  return String(d).substring(0, 10)
}

// Ring colors for the 3 pillars
const PILLAR_COLORS = {
  sleep: '#4D96FF',
  nutrition: '#FF6B6B',
  activity: '#6EC96E',
}

// ─── Date Range ─────────────────────────────────────────────────────────────

type DateRange = 'today' | 'yesterday' | '7days' | '30days'

const DATE_RANGE_OPTIONS: { key: DateRange; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7days', label: '7 Days' },
  { key: '30days', label: '30 Days' },
]

function getDateRange(range: DateRange): { startDate: string; endDate: string; days: number } {
  const today = new Date()
  const fmt = (d: Date) => d.toISOString().split('T')[0]

  switch (range) {
    case 'today':
      return { startDate: fmt(today), endDate: fmt(today), days: 1 }
    case 'yesterday': {
      const y = new Date(today)
      y.setDate(y.getDate() - 1)
      return { startDate: fmt(y), endDate: fmt(y), days: 1 }
    }
    case '7days': {
      const start = new Date(today)
      start.setDate(start.getDate() - 6)
      return { startDate: fmt(start), endDate: fmt(today), days: 7 }
    }
    case '30days': {
      const start = new Date(today)
      start.setDate(start.getDate() - 29)
      return { startDate: fmt(start), endDate: fmt(today), days: 30 }
    }
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
}

interface Reminder {
  id: string
  text: string
  done: boolean
  dueDate?: string | null     // ISO date string YYYY-MM-DD
  notifId?: string | null     // Supabase notification row id
  archivedAt?: string | null  // ISO timestamp when marked done
  childId?: string | null     // null = all kids
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
  const getGoals = useGoalsStore((s) => s.getGoals)
  const syncGoals = useGoalsStore((s) => s.syncFromSupabase)
  const child = activeChild ?? children[0]

  const [dateRange, setDateRange] = useState<DateRange>('7days')
  const [focusedRing, setFocusedRing] = useState<'sleep' | 'nutrition' | 'activity'>('sleep')
  const [miniRingMetric, setMiniRingMetric] = useState<MiniRingMetric>('sleep')
  const [moodModalVisible, setMoodModalVisible] = useState(false)
  const [healthModalVisible, setHealthModalVisible] = useState(false)
  const [activityModalVisible, setActivityModalVisible] = useState(false)
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

  // Load reminders from AsyncStorage
  useEffect(() => {
    if (!child?.id) return
    AsyncStorage.getItem(`grandma-reminders-${child.id}`).then(json => {
      if (json) try { setReminders(JSON.parse(json)) } catch {}
    })
  }, [child?.id])

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
    const dueDate = newReminderDate ? newReminderDate.toISOString().substring(0, 10) : null
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
  })

  useEffect(() => {
    if (child) loadRangeData(child, dateRange)
  }, [child?.id, dateRange])

  async function loadRangeData(c: ChildWithRole, range: DateRange) {
    const { startDate, endDate, days } = getDateRange(range)
    const g = getGoals(c.id, c.birthDate)
    const calTarget = g.calories
    const dailySleepTarget = g.sleep

    // Always load last 7 days for mini rings
    const miniStart = new Date()
    miniStart.setDate(miniStart.getDate() - 6)
    const miniStartStr = miniStart.toISOString().split('T')[0]

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const miniDates: string[] = []
    const miniLabels: string[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      miniDates.push(d.toISOString().split('T')[0])
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
    const today = new Date().toISOString().split('T')[0]

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

    // ── Activity (mood logs + feeding + any other logged actions) ──
    const activityLogs = rangeLogs.filter((l) => ['mood', 'food', 'feeding', 'medicine', 'vaccine', 'growth', 'temperature'].includes(l.type))
    const activityCount = activityLogs.length
    const activityTarget = g.activity * days

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
      if (['mood', 'food', 'feeding', 'medicine', 'vaccine', 'growth', 'temperature'].includes(log.type)) {
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
      moodCounts, dominantMood,
      healthTasks, memories,
      dailySleep, dailySleepTarget: g.sleep,
      dailyNutrition, dailyNutritionTarget,
      dailyActivity, dailyActivityTarget: g.activity,
      dayLabels: miniLabels,
      moodByDay, sleepQuality,
      mealsToday: foodLogs.filter((l) => l.date === today).length,
      calorieCategories,
      feedingBreast, feedingBottle, avgFeedingMl,
    })
  }

  if (!child) return null

  const growthLeap = getGrowthLeap(child.birthDate)
  const firstName = parentName?.split(' ')[0] || 'Mom'

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
        <View>
          <Text style={[s.greeting, { color: colors.text }]}>Hi, {firstName}</Text>
          <Text style={[s.subtitle, { color: colors.textMuted }]}>{child.name}'s Day</Text>
        </View>
      </View>

      {/* ─── Child Selector ──────────────────────────────────── */}
      {children.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.childPills}>
          {children.map((c, idx) => {
            const active = c.id === child.id
            const kidColor = CHILD_COLORS[idx % CHILD_COLORS.length]
            return (
              <Pressable key={c.id} onPress={() => setActiveChild(c)}
                style={[s.childPill, {
                  backgroundColor: active ? kidColor : kidColor + '18',
                  borderRadius: radius.full,
                  borderWidth: 1,
                  borderColor: active ? kidColor : kidColor + '50',
                }]}
              >
                <Text style={[s.pillName, { color: active ? '#FFF' : kidColor }]}>{c.name}</Text>
                <Text style={[s.pillAge, { color: active ? 'rgba(255,255,255,0.7)' : kidColor + 'AA' }]}>{formatAge(c.birthDate)}</Text>
              </Pressable>
            )
          })}
          <Pressable style={[s.addChildBtn, { borderColor: colors.border }]}>
            <Plus size={14} color={colors.textMuted} strokeWidth={2} />
          </Pressable>
        </ScrollView>
      )}

      {/* ─── Date Range Picker ────────────────────────────────── */}
      <View style={s.dateRangeRow}>
        {DATE_RANGE_OPTIONS.map((opt) => {
          const active = dateRange === opt.key
          return (
            <Pressable
              key={opt.key}
              onPress={() => setDateRange(opt.key)}
              style={[s.dateRangePill, {
                backgroundColor: active ? colors.primary : 'rgba(255,255,255,0.05)',
                borderRadius: radius.full,
              }]}
            >
              <Text style={[s.dateRangeText, { color: active ? '#FFF' : colors.textMuted }]}>{opt.label}</Text>
            </Pressable>
          )
        })}
      </View>

      {/* ─── Past 7 Days Mini Rings ──────────────────────────── */}
      <View style={[s.miniRingsCard, { backgroundColor: colors.surface, borderRadius: radius.lg, borderColor: colors.borderLight }]}>
        <View style={s.miniRingsHeader}>
          <Text style={[s.miniRingsTitle, { color: colors.textSecondary }]}>Past 7 Days</Text>
          <View style={s.miniMetricPicker}>
            {(['sleep', 'nutrition', 'activity'] as MiniRingMetric[]).map((m) => (
              <Pressable
                key={m}
                onPress={() => setMiniRingMetric(m)}
                style={[s.miniMetricBtn, {
                  backgroundColor: miniRingMetric === m ? PILLAR_COLORS[m] + '20' : 'transparent',
                  borderRadius: 8,
                }]}
              >
                <View style={[s.miniMetricDot, { backgroundColor: PILLAR_COLORS[m] }]} />
                <Text style={[s.miniMetricLabel, { color: miniRingMetric === m ? '#FFF' : colors.textMuted }]}>
                  {m === 'sleep' ? 'Sleep' : m === 'nutrition' ? nutritionLabel : 'Activity'}
                </Text>
              </Pressable>
            ))}
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

      {/* ─── Hero: Multi-Ring Progress ────────────────────────── */}
      <MultiRingHero
        sleepProgress={sleepProgress}
        nutritionProgress={nutritionProgress}
        activityProgress={activityProgress}
        focused={focusedRing}
        onTapRing={setFocusedRing}
        centerData={focused}
      />

      {/* ─── Ring Legend ──────────────────────────────────────── */}
      {(() => {
        const { days } = getDateRange(dateRange)
        const rangeLabel = days === 1 ? 'today' : `${days}d`
        const sleepGoalScaled = Math.round(goals.sleep * days * 10) / 10
        const calGoalScaled = goals.calories * days
        const feedGoalScaled = goals.feedings * days
        const actGoalScaled = goals.activity * days
        return (
          <View style={s.legendRow}>
            {([
              { key: 'sleep' as const, label: 'Sleep', value: rangeData.sleepTotal > 0 ? `${rangeData.sleepTotal.toFixed(1)}h` : '—', target: days === 1 ? `Goal: ${goals.sleep}h` : `${goals.sleep}h/day · ${sleepGoalScaled}h ${rangeLabel}` },
              { key: 'nutrition' as const, label: nutritionLabel, value: feedingStage === 'solids' ? (rangeData.caloriesTotal > 0 ? rangeData.caloriesTotal.toLocaleString() : '—') : (rangeData.feedingCount > 0 ? `${rangeData.feedingCount}` : '—'), target: feedingStage === 'solids' ? (days === 1 ? `Goal: ${goals.calories.toLocaleString()}` : `${goals.calories.toLocaleString()}/day · ${calGoalScaled.toLocaleString()} ${rangeLabel}`) : (days === 1 ? `Goal: ${goals.feedings}` : `${goals.feedings}/day · ${feedGoalScaled} ${rangeLabel}`) },
              { key: 'activity' as const, label: 'Activity', value: rangeData.activityCount > 0 ? `${rangeData.activityCount}` : '—', target: days === 1 ? `Goal: ${goals.activity}` : `${goals.activity}/day · ${actGoalScaled} ${rangeLabel}` },
            ]).map((item) => (
              <Pressable
                key={item.key}
                onPress={() => setFocusedRing(item.key)}
                style={[s.legendItem, focusedRing === item.key && { backgroundColor: PILLAR_COLORS[item.key] + '12' }, { borderRadius: radius.md }]}
              >
                <View style={[s.legendDot, { backgroundColor: PILLAR_COLORS[item.key] }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.legendLabel, { color: colors.textMuted }]}>{item.label}</Text>
                  <Text style={[s.legendValue, { color: focusedRing === item.key ? PILLAR_COLORS[item.key] : colors.text }]}>{item.value}</Text>
                  <Text style={[s.legendTarget, { color: colors.textMuted }]} numberOfLines={1}>{item.target}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )
      })()}

      {/* ─── Set Goals Button ─────────────────────────────────── */}
      <Pressable
        onPress={() => setGoalsModalVisible(true)}
        style={[s.setGoalsBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight, borderRadius: radius.md }]}
      >
        <Target size={14} color={colors.primary} strokeWidth={2} />
        <Text style={[s.setGoalsBtnText, { color: colors.primary }]}>Set Goals</Text>
        <Text style={[s.setGoalsBtnHint, { color: colors.textMuted }]}>Customize daily targets</Text>
        <ChevronRight size={14} color={colors.textMuted} strokeWidth={2} />
      </Pressable>

      {/* ─── Metric Cards ────────────────────────────────────── */}
      <View style={s.sectionHeader}>
        <Text style={[s.sectionTitle, { color: colors.text }]}>Daily Metrics</Text>
        <Pressable onPress={() => router.push('/profile/health-history' as any)}>
          <Text style={[s.sectionLink, { color: colors.primary }]}>Insights</Text>
        </Pressable>
      </View>

      <View style={s.metricsRow}>
        <Pressable style={s.metricsRowItem} onPress={() => setMoodModalVisible(true)}>
          <MoodCard moodCounts={rangeData.moodCounts} dominantMood={rangeData.dominantMood} />
        </Pressable>
        <Pressable style={s.metricsRowItem} onPress={() => setActivityModalVisible(true)}>
          <NutritionCard
            stage={feedingStage}
            caloriesTotal={rangeData.caloriesTotal}
            caloriesTarget={rangeData.caloriesTarget}
            feedingCount={rangeData.feedingCount}
            feedingTarget={rangeData.feedingCountTarget}
            feedingMl={rangeData.feedingMl}
            feedingBreast={rangeData.feedingBreast}
            feedingBottle={rangeData.feedingBottle}
            avgMl={rangeData.avgFeedingMl}
            meals={rangeData.mealsToday}
          />
        </Pressable>
        <Pressable style={s.metricsRowItem} onPress={() => setHealthModalVisible(true)}>
          <HealthCard reminders={reminders} healthHistory={healthHistory} child={child} />
        </Pressable>
      </View>

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
        const preview = active.slice(0, 3)
        const hasMore = active.length > 3
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
                  +{active.length - 3} more
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
        colors={colors}
        allChildren={children}
      />

      {/* ─── Ask Grandma ─────────────────────────────────────── */}
      <Pressable
        onPress={() => router.push('/grandma-talk' as any)}
        style={({ pressed }) => [
          s.grandmaCard,
          { borderRadius: radius.lg, opacity: pressed ? 0.92 : 1 },
        ]}
      >
        {/* decorative glow blob */}
        <View style={s.grandmaBlob} />
        <View style={[s.grandmaIconWrap, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
          <Sparkles size={22} color="#FFF" strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.grandmaTitle}>Grandma knows best</Text>
          <Text style={s.grandmaDesc}>Sleep, feeding, milestones & more</Text>
        </View>
        <View style={[s.grandmaArrow, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <ChevronRight size={16} color="#FFF" strokeWidth={2.5} />
        </View>
      </Pressable>

      {/* ─── Detail Modals ───────────────────────────────────── */}
      <MoodDetailModal
        visible={moodModalVisible}
        onClose={() => setMoodModalVisible(false)}
        moodCounts={rangeData.moodCounts}
        dominantMood={rangeData.dominantMood}
        moodByDay={rangeData.moodByDay}
        dateRange={dateRange}
        childName={child?.name}
        childColor={CHILD_COLORS[children.findIndex(c => c.id === child?.id) % CHILD_COLORS.length]}
      />
      <HealthDetailModal
        visible={healthModalVisible}
        onClose={() => setHealthModalVisible(false)}
        reminders={reminders}
        onToggleReminder={toggleReminder}
        sleepQuality={rangeData.sleepQuality}
        sleepTotal={rangeData.sleepTotal}
        sleepTarget={rangeData.sleepTarget}
        child={child}
        childColor={CHILD_COLORS[children.findIndex(c => c.id === child?.id) % CHILD_COLORS.length]}
        healthHistory={healthHistory}
        scheduledVaccines={scheduledVaccines}
        onSetVaccineDate={(key, date) => setVaccineDate(child.id, key, date)}
        onMarkVaccineGiven={(name, date, key) => markVaccineGiven(child.id, name, date, key)}
      />
      <ActivityDetailModal
        visible={activityModalVisible}
        onClose={() => setActivityModalVisible(false)}
        caloriesTotal={rangeData.caloriesTotal}
        caloriesTarget={rangeData.caloriesTarget}
        categories={rangeData.calorieCategories}
        meals={rangeData.mealsToday}
        activityCount={rangeData.activityCount}
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

function MultiRingHero({ sleepProgress, nutritionProgress, activityProgress, focused, onTapRing, centerData }: {
  sleepProgress: number; nutritionProgress: number; activityProgress: number
  focused: 'sleep' | 'nutrition' | 'activity'
  onTapRing: (ring: 'sleep' | 'nutrition' | 'activity') => void
  centerData: { value: string; unit: string; pct: number; icon: typeof Moon; color: string }
}) {
  const { colors } = useTheme()
  const size = SW - 80
  const center = size / 2

  // Three concentric rings - outer to inner
  const rings = [
    { key: 'sleep' as const, progress: sleepProgress, color: PILLAR_COLORS.sleep, r: (size - 20) / 2, strokeW: 14 },
    { key: 'nutrition' as const, progress: nutritionProgress, color: PILLAR_COLORS.nutrition, r: (size - 60) / 2, strokeW: 14 },
    { key: 'activity' as const, progress: activityProgress, color: PILLAR_COLORS.activity, r: (size - 100) / 2, strokeW: 14 },
  ]

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
              <Stop offset="1" stopColor="#2D7AFF" />
            </LinearGradient>
            <LinearGradient id="calGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={PILLAR_COLORS.nutrition} />
              <Stop offset="1" stopColor="#FF4444" />
            </LinearGradient>
            <LinearGradient id="actGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={PILLAR_COLORS.activity} />
              <Stop offset="1" stopColor="#3DAA6E" />
            </LinearGradient>
          </Defs>
          {rings.map((ring) => {
            const circumference = 2 * Math.PI * ring.r
            const offset = circumference * (1 - ring.progress)
            const gradId = ring.key === 'sleep' ? 'sleepGrad' : ring.key === 'nutrition' ? 'calGrad' : 'actGrad'
            const isFocused = focused === ring.key
            return [
              <SvgCircle
                key={ring.key + '-bg'}
                cx={center} cy={center} r={ring.r}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth={ring.strokeW}
                fill="none"
              />,
              <SvgCircle
                key={ring.key + '-fg'}
                cx={center} cy={center} r={ring.r}
                stroke={`url(#${gradId})`}
                strokeWidth={isFocused ? ring.strokeW + 2 : ring.strokeW}
                fill="none"
                strokeDasharray={`${circumference}`}
                strokeDashoffset={offset}
                strokeLinecap="round"
                rotation="-90"
                origin={`${center}, ${center}`}
                opacity={isFocused ? 1 : 0.6}
              />,
            ]
          })}
        </Svg>

        <View style={s.heroCenter}>
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
        </View>
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
          <Text style={{ fontSize: 8, fontWeight: '800', color: isToday ? color : color + 'CC' }}>
            {pct >= 100 ? '✓' : `${pct}%`}
          </Text>
        ) : (
          <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', fontWeight: '700' }}>—</Text>
        )}
      </View>
      <Text style={[s.miniRingLabel, { color: isToday ? color : colors.textMuted }]}>{label}</Text>
    </View>
  )
}

// ─── Mood Card ──────────────────────────────────────────────────────────────

function MoodCard({ moodCounts, dominantMood }: { moodCounts: Record<string, number>; dominantMood: string }) {
  const { colors, radius } = useTheme()
  const moods = ['happy', 'calm', 'energetic', 'fussy', 'cranky']
  const maxCount = Math.max(...Object.values(moodCounts), 1)
  const hasMoods = Object.values(moodCounts).some((v) => v > 0)
  const dominantLabel = MOOD_LABELS[dominantMood] || 'No data'

  return (
    <View style={[s.metricCard, { backgroundColor: colors.surface, borderRadius: radius.lg, borderColor: colors.borderLight }]}>
      <View style={s.metricHeader}>
        <Smile size={14} color={brand.accent} strokeWidth={2} />
        <Text style={[s.metricLabel, { color: colors.textSecondary }]}>Mood</Text>
        <ChevronRight size={12} color={colors.textMuted} strokeWidth={2} style={{ marginLeft: 'auto' }} />
      </View>
      {hasMoods ? (
        <>
          <View style={s.moodBars}>
            {moods.map((m) => {
              const count = moodCounts[m] || 0
              const height = Math.max((count / maxCount) * 50, 3)
              return (
                <View key={m} style={s.moodBarCol}>
                  <View style={[s.moodBar, { height, backgroundColor: MOOD_COLORS[m] || colors.textMuted, borderRadius: 4 }]} />
                </View>
              )
            })}
          </View>
          <Text style={[s.metricValue, { color: colors.text }]}>Mostly {dominantLabel}</Text>
          <Text style={[s.metricSmall, { color: colors.textMuted }]}>Tap for details</Text>
        </>
      ) : (
        <>
          <View style={s.metricEmpty}>
            <Smile size={20} color={colors.textMuted} strokeWidth={1.5} />
          </View>
          <Text style={[s.metricValue, { color: colors.textSecondary }]}>No moods yet</Text>
          <Text style={[s.metricSmall, { color: colors.textMuted }]}>Log a mood</Text>
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
  const { colors, radius } = useTheme()
  const ringSize = 56
  const ringR = 22
  const ringCircumference = 2 * Math.PI * ringR

  // For liquid/mixed: track feedings count; for solids: track calories
  const isLiquid = stage === 'liquid' || stage === 'mixed'
  const current = isLiquid ? feedingCount : caloriesTotal
  const target = isLiquid ? feedingTarget : caloriesTarget
  const pct = target > 0 ? Math.min(current / target, 1) : 0
  const ringOffset = ringCircumference * (1 - pct)

  const Icon = isLiquid ? Droplets : Utensils
  const label = stage === 'liquid' ? 'Feedings' : stage === 'mixed' ? 'Nutrition' : 'Calories'

  return (
    <View style={[s.metricCard, { backgroundColor: colors.surface, borderRadius: radius.lg, borderColor: colors.borderLight }]}>
      <View style={s.metricHeader}>
        <Icon size={14} color={PILLAR_COLORS.nutrition} strokeWidth={2} />
        <Text style={[s.metricLabel, { color: colors.textSecondary }]}>{label}</Text>
        <ChevronRight size={12} color={colors.textMuted} strokeWidth={2} style={{ marginLeft: 'auto' }} />
      </View>
      <View style={s.calorieRingWrap}>
        <Svg width={ringSize} height={ringSize}>
          <SvgCircle cx={ringSize / 2} cy={ringSize / 2} r={ringR} fill="none" stroke={PILLAR_COLORS.nutrition + '18'} strokeWidth={5} />
          <SvgCircle cx={ringSize / 2} cy={ringSize / 2} r={ringR} fill="none" stroke={PILLAR_COLORS.nutrition} strokeWidth={5}
            strokeDasharray={`${ringCircumference}`} strokeDashoffset={ringOffset}
            strokeLinecap="round" rotation="-90" origin={`${ringSize / 2}, ${ringSize / 2}`}
          />
        </Svg>
        <Text style={[s.calorieNumber, { color: colors.text }]}>
          {isLiquid ? (feedingCount > 0 ? `${feedingCount}` : '—') : (caloriesTotal > 0 ? caloriesTotal.toLocaleString() : '—')}
        </Text>
      </View>
      {isLiquid ? (
        <>
          <Text style={[s.metricValue, { color: colors.text }]}>
            {feedingCount > 0 ? `${feedingBreast} breast · ${feedingBottle} bottle` : 'No feeds yet'}
          </Text>
          <Text style={[s.metricSmall, { color: colors.textMuted }]}>
            {feedingMl > 0 ? `${feedingMl}ml total · ${avgMl}ml avg` : 'Tap for details'}
          </Text>
        </>
      ) : (
        <>
          <Text style={[s.metricValue, { color: colors.text }]}>
            {caloriesTotal > 0 ? `${Math.round(pct * 100)}% of daily` : `${meals} meals`}
          </Text>
          <Text style={[s.metricSmall, { color: colors.textMuted }]}>
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
  const { colors, radius } = useTheme()
  const activeReminders = reminders.filter(r => !r.done).length
  const lastVaccine = healthHistory.vaccines[0]
  const { weight, height } = parseGrowthValue(healthHistory.growth)
  const growthSummary = [weight, height].filter(Boolean).join(' · ') || null
  const upcomingCount = getNextDueVaccines(child.birthDate ?? '', healthHistory.vaccines, child.countryCode ?? 'US').length
  const overdueCount = getNextDueVaccines(child.birthDate ?? '', healthHistory.vaccines, child.countryCode ?? 'US').filter(v => v.overdue).length

  return (
    <View style={[s.metricCard, { backgroundColor: colors.surface, borderRadius: radius.lg, borderColor: colors.borderLight }]}>
      <View style={s.metricHeader}>
        <Heart size={14} color={brand.success} strokeWidth={2} />
        <Text style={[s.metricLabel, { color: colors.textSecondary }]}>Health</Text>
        <ChevronRight size={12} color={colors.textMuted} strokeWidth={2} style={{ marginLeft: 'auto' }} />
      </View>
      <View style={s.healthList}>
        {lastVaccine ? (
          <View style={s.healthRow}>
            <Syringe size={9} color={brand.success} strokeWidth={2} />
            <Text style={[s.healthLabel, { color: colors.textSecondary }]} numberOfLines={1}>
              {lastVaccine.value.split(/[,(]/)[0].trim()}
            </Text>
          </View>
        ) : (
          <View style={s.healthRow}>
            <Syringe size={9} color={colors.textMuted} strokeWidth={2} />
            <Text style={[s.healthLabel, { color: colors.textMuted }]} numberOfLines={1}>No vaccines</Text>
          </View>
        )}
        {growthSummary ? (
          <View style={s.healthRow}>
            <TrendingUp size={9} color={brand.kids} strokeWidth={2} />
            <Text style={[s.healthLabel, { color: colors.textSecondary }]} numberOfLines={1}>{growthSummary}</Text>
          </View>
        ) : null}
        {activeReminders > 0 && (
          <View style={s.healthRow}>
            <Bell size={10} color={brand.warning} strokeWidth={2} />
            <Text style={[s.healthLabel, { color: brand.warning }]} numberOfLines={1}>{activeReminders} reminder{activeReminders !== 1 ? 's' : ''}</Text>
          </View>
        )}
      </View>
      {overdueCount > 0 ? (
        <Text style={[s.metricValue, { color: brand.error }]}>{overdueCount} overdue</Text>
      ) : upcomingCount > 0 ? (
        <Text style={[s.metricValue, { color: brand.accent }]}>{upcomingCount} due soon</Text>
      ) : (
        <Text style={[s.metricValue, { color: brand.success }]}>Up to date</Text>
      )}
    </View>
  )
}

// ─── Mood Detail Modal ──────────────────────────────────────────────────────

function MoodDetailModal({ visible, onClose, moodCounts, dominantMood, moodByDay, dateRange, childName, childColor }: {
  visible: boolean; onClose: () => void
  moodCounts: Record<string, number>; dominantMood: string
  moodByDay: Record<string, Record<string, number>>; dateRange: DateRange
  childName?: string; childColor?: string
}) {
  const { colors, radius } = useTheme()
  const moods = ['happy', 'calm', 'energetic', 'fussy', 'cranky']
  const totalMoods = Object.values(moodCounts).reduce((a, b) => a + b, 0)
  const [focusedMood, setFocusedMood] = useState<string | null>(null)

  // Always chart the last 7 days
  const chartDays = useMemo(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      return { date: d.toISOString().split('T')[0], label: dayNames[d.getDay()] }
    })
  }, [visible])

  // Chart dimensions
  const chartW = SW - 96
  const chartH = 130
  const padL = 4, padR = 4, padT = 12, padB = 24
  const innerW = chartW - padL - padR
  const innerH = chartH - padT - padB

  const maxCount = Math.max(
    1,
    ...chartDays.flatMap(d => moods.map(m => moodByDay[d.date]?.[m] || 0))
  )

  const moodLines = moods.map(mood => ({
    mood,
    color: MOOD_COLORS[mood] || '#888',
    points: chartDays.map((day, i) => {
      const count = moodByDay[day.date]?.[mood] || 0
      const x = padL + (i / (chartDays.length - 1)) * innerW
      const y = padT + innerH - (count / maxCount) * innerH
      return { x, y, count }
    }),
  }))

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
            Past 7 Days — {totalMoods} mood{totalMoods !== 1 ? 's' : ''} logged
          </Text>

          {totalMoods > 0 ? (
            <>
              {/* Line chart */}
              <View style={[s.moodChartWrap, { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: radius.md }]}>
                <Svg width={chartW} height={chartH}>
                  {/* Subtle grid */}
                  {[0, 0.5, 1].map((t) => (
                    <SvgLine
                      key={t}
                      x1={padL} y1={padT + innerH * (1 - t)}
                      x2={padL + innerW} y2={padT + innerH * (1 - t)}
                      stroke="rgba(255,255,255,0.06)" strokeWidth={1}
                    />
                  ))}

                  {/* Mood lines */}
                  {moodLines.map(({ mood, color, points }) => {
                    const active = focusedMood === null || focusedMood === mood
                    return (
                      <Path
                        key={mood}
                        d={smoothPath(points)}
                        stroke={color}
                        strokeWidth={focusedMood === mood ? 3 : 2}
                        fill="none"
                        opacity={active ? 1 : 0.12}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )
                  })}

                  {/* Data dots */}
                  {moodLines.map(({ mood, color, points }) => {
                    const active = focusedMood === null || focusedMood === mood
                    return points.map((p, i) =>
                      p.count > 0 ? (
                        <SvgCircle
                          key={mood + i}
                          cx={p.x} cy={p.y}
                          r={focusedMood === mood ? 4.5 : 3}
                          fill={color}
                          opacity={active ? 1 : 0.1}
                        />
                      ) : null
                    )
                  })}

                  {/* Count labels on focused mood dots */}
                  {focusedMood && moodLines.find(l => l.mood === focusedMood)?.points.map((p, i) =>
                    p.count > 0 ? (
                      <SvgText
                        key={'lbl' + i}
                        x={p.x} y={p.y - 8}
                        textAnchor="middle"
                        fontSize={9} fontWeight="800"
                        fill={MOOD_COLORS[focusedMood] || '#fff'}
                        opacity={0.9}
                      >
                        {p.count}
                      </SvgText>
                    ) : null
                  )}

                  {/* Day labels */}
                  {chartDays.map((day, i) => (
                    <SvgText
                      key={day.date}
                      x={padL + (i / (chartDays.length - 1)) * innerW}
                      y={chartH - 6}
                      textAnchor="middle"
                      fontSize={8} fontWeight="700"
                      fill="rgba(255,255,255,0.3)"
                    >
                      {day.label}
                    </SvgText>
                  ))}
                </Svg>
              </View>

              {/* Mood filter chips */}
              <ScrollView
                horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.moodChipsRow}
                style={{ marginTop: 14 }}
              >
                {moods.map((m) => {
                  const count = moodCounts[m] || 0
                  const selected = focusedMood === m
                  const color = MOOD_COLORS[m]
                  return (
                    <Pressable
                      key={m}
                      onPress={() => setFocusedMood(selected ? null : m)}
                      style={[s.moodChip, {
                        backgroundColor: selected ? color + '20' : 'rgba(255,255,255,0.05)',
                        borderColor: selected ? color + '80' : 'transparent',
                        borderRadius: radius.full,
                      }]}
                    >
                      <View style={[s.moodChipDot, { backgroundColor: color }]} />
                      <Text style={[s.moodChipLabel, { color: selected ? color : colors.textSecondary }]}>
                        {MOOD_LABELS[m]}
                      </Text>
                      <Text style={[s.moodChipCount, { color: selected ? color : colors.textMuted }]}>
                        {count}
                      </Text>
                    </Pressable>
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

function HealthDetailModal({ visible, onClose, reminders, onToggleReminder, sleepQuality, sleepTotal, sleepTarget, child, childColor, healthHistory, scheduledVaccines, onSetVaccineDate, onMarkVaccineGiven }: {
  visible: boolean; onClose: () => void
  reminders: Reminder[]; onToggleReminder: (id: string) => void
  sleepQuality: string; sleepTotal: number; sleepTarget: number
  child: ChildWithRole; childColor?: string; healthHistory: HealthHistoryData
  scheduledVaccines: Record<string, string>
  onSetVaccineDate: (key: string, date: string | null) => void
  onMarkVaccineGiven: (name: string, date: string, key: string) => Promise<void>
}) {
  const { colors, radius } = useTheme()
  const activeReminders = reminders.filter(r => !r.done)
  const { weight, height } = parseGrowthValue(healthHistory.growth)
  const upcomingVaccines = getNextDueVaccines(child.birthDate ?? '', healthHistory.vaccines, child.countryCode ?? 'US')
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [pickerDate, setPickerDate] = useState(new Date())

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.modalOverlay}>
        <View style={[s.modalContent, { backgroundColor: colors.bg, borderRadius: radius.xl }]}>
          <View style={s.modalHeader}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[s.modalTitle, { color: colors.text }]}>Health Overview</Text>
              {childColor && (
                <View style={{ backgroundColor: childColor + '25', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: childColor + '60' }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: childColor }}>{child.name}</Text>
                </View>
              )}
            </View>
            <Pressable onPress={onClose} style={[s.modalClose, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
              <X size={18} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Sleep summary */}
            <View style={[s.modalStatCard, { backgroundColor: PILLAR_COLORS.sleep + '10', borderRadius: radius.md }]}>
              <Moon size={18} color={PILLAR_COLORS.sleep} strokeWidth={2} />
              <View style={{ flex: 1 }}>
                <Text style={[s.modalStatLabel, { color: colors.textMuted }]}>Sleep Quality</Text>
                <Text style={[s.modalStatValue, { color: colors.text }]}>{sleepQuality}</Text>
              </View>
              <Text style={[s.modalStatExtra, { color: PILLAR_COLORS.sleep }]}>{sleepTotal.toFixed(1)}h / {sleepTarget.toFixed(0)}h</Text>
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

            {/* Active reminders */}
            {activeReminders.length > 0 && (
              <>
                <Text style={[s.modalSectionTitle, { color: colors.text }]}>Active Reminders ({activeReminders.length})</Text>
                {activeReminders.map((r) => (
                  <View key={r.id} style={[s.modalTaskRow, { borderBottomColor: colors.border }]}>
                    <Pressable
                      onPress={() => onToggleReminder(r.id)}
                      style={[s.modalTaskCheck, {
                        backgroundColor: 'transparent',
                        borderWidth: 1.5,
                        borderColor: brand.warning,
                      }]}
                    />
                    <View style={{ marginRight: 2 }}><Bell size={12} color={brand.warning} strokeWidth={2} /></View>
                    <Text style={[s.modalTaskLabel, { color: colors.text }]} numberOfLines={2}>{r.text}</Text>
                  </View>
                ))}
              </>
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
        </View>
      </View>
    </Modal>
  )
}

// ─── Activity Detail Modal ──────────────────────────────────────────────────

function ActivityDetailModal({ visible, onClose, caloriesTotal, caloriesTarget, categories, meals, activityCount, stage, feedingCount, feedingBreast, feedingBottle, feedingMl, avgMl, childName, childColor }: {
  visible: boolean; onClose: () => void
  caloriesTotal: number; caloriesTarget: number
  categories: { label: string; cals: number; color: string }[]
  meals: number; activityCount: number
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
              <Text style={[s.modalTitle, { color: colors.text }]}>{stage === 'liquid' ? 'Feeding & Activity' : 'Nutrition & Activity'}</Text>
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
                  <Text style={[s.modalStatValue, { color: colors.text }]}>{feedingCount} total</Text>
                </View>
              </View>
              <View style={s.feedingBreakdownRow}>
                <View style={[s.feedingBreakdownCard, { backgroundColor: 'rgba(255,183,197,0.08)', borderRadius: radius.md }]}>
                  <Baby size={20} color="#FFB7C5" strokeWidth={1.8} />
                  <Text style={[s.feedingBreakdownValue, { color: colors.text }]}>{feedingBreast}</Text>
                  <Text style={[s.feedingBreakdownLabel, { color: colors.textMuted }]}>Breast</Text>
                </View>
                <View style={[s.feedingBreakdownCard, { backgroundColor: 'rgba(77,150,255,0.08)', borderRadius: radius.md }]}>
                  <Milk size={20} color={brand.kids} strokeWidth={1.8} />
                  <Text style={[s.feedingBreakdownValue, { color: colors.text }]}>{feedingBottle}</Text>
                  <Text style={[s.feedingBreakdownLabel, { color: colors.textMuted }]}>Bottle</Text>
                </View>
                <View style={[s.feedingBreakdownCard, { backgroundColor: PILLAR_COLORS.nutrition + '08', borderRadius: radius.md }]}>
                  <Droplets size={20} color={PILLAR_COLORS.nutrition} strokeWidth={1.8} />
                  <Text style={[s.feedingBreakdownValue, { color: colors.text }]}>{feedingMl > 0 ? `${feedingMl}ml` : '—'}</Text>
                  <Text style={[s.feedingBreakdownLabel, { color: colors.textMuted }]}>Total Vol</Text>
                </View>
              </View>
              {avgMl > 0 && (
                <Text style={[s.feedingAvgText, { color: colors.textMuted }]}>Average {avgMl}ml per feeding</Text>
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
              {stage === 'solids' && <Text style={[s.modalStatExtra, { color: pct >= 90 ? brand.success : PILLAR_COLORS.nutrition }]}>{pct}% of {caloriesTarget}</Text>}
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
                  <Text style={[s.modalCatValue, { color: colors.text }]}>{cat.cals} cal</Text>
                </View>
              ))}
            </>
          )}

          {/* Activity summary */}
          <View style={[s.modalStatCard, { backgroundColor: PILLAR_COLORS.activity + '10', borderRadius: radius.md, marginTop: 16 }]}>
            <Zap size={18} color={PILLAR_COLORS.activity} strokeWidth={2} />
            <View style={{ flex: 1 }}>
              <Text style={[s.modalStatLabel, { color: colors.textMuted }]}>Activities Logged</Text>
              <Text style={[s.modalStatValue, { color: colors.text }]}>{activityCount} activities</Text>
            </View>
            <Text style={[s.modalStatExtra, { color: colors.textMuted }]}>{meals} meals</Text>
          </View>
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
  r, isLast, onToggle, onDelete, colors, allChildren,
}: {
  r: Reminder; isLast: boolean; onToggle: () => void; onDelete: () => void; colors: any
  allChildren?: ChildWithRole[]
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

  return (
    <View style={[s.reminderRow, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
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
        <Text
          style={[s.reminderText, { color: r.done ? colors.textMuted : colors.text, textDecorationLine: r.done ? 'line-through' : 'none' }]}
          numberOfLines={2}
        >{r.text}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          {taggedChild && (
            <View style={[s.reminderChildTag, { backgroundColor: brand.kids + '20', borderColor: brand.kids + '50' }]}>
              <Baby size={9} color={brand.kids} strokeWidth={2} />
              <Text style={[s.reminderChildTagText, { color: brand.kids }]}>{taggedChild.name}</Text>
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
      <Pressable onPress={onDelete} hitSlop={12}>
        <Trash2 size={13} color={colors.textMuted} strokeWidth={2} />
      </Pressable>
    </View>
  )
}

// ─── Reminders Full-Screen Modal ─────────────────────────────────────────────

function RemindersModal({
  visible, onClose, reminders, onToggle, onDelete, colors, allChildren,
}: {
  visible: boolean; onClose: () => void; reminders: Reminder[]
  onToggle: (id: string) => void; onDelete: (id: string) => void; colors: any
  allChildren?: ChildWithRole[]
}) {
  const { radius } = useTheme()
  const [tab, setTab] = useState<'active' | 'archived'>('active')
  const active = reminders.filter(r => !r.done)
  const archived = reminders.filter(r => r.done).sort((a, b) =>
    (b.archivedAt ?? '').localeCompare(a.archivedAt ?? '')
  )
  const total = reminders.length
  const completedCount = archived.length
  const completionRate = total > 0 ? Math.round((completedCount / total) * 100) : 0

  // Completed this week
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
  const thisWeek = archived.filter(r => r.archivedAt && new Date(r.archivedAt) >= weekAgo).length

  const list = tab === 'active' ? active : archived

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[s.reminderModalOverlay]}>
      <View style={[s.reminderModal, { backgroundColor: '#0E0B1A' }]}>
        {/* Drag handle */}
        <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' }} />
        </View>
        {/* Header */}
        <View style={[s.reminderModalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[s.reminderModalTitle]}>Reminders</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <X size={20} color={colors.textSecondary} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Completion metric strip */}
        <View style={[s.reminderMetricStrip, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <View style={s.reminderMetricItem}>
            <Text style={[s.reminderMetricVal, { color: colors.text }]}>{active.length}</Text>
            <Text style={[s.reminderMetricLabel, { color: colors.textMuted }]}>Active</Text>
          </View>
          <View style={[s.reminderMetricDivider, { backgroundColor: colors.border }]} />
          <View style={s.reminderMetricItem}>
            <Text style={[s.reminderMetricVal, { color: brand.success }]}>{thisWeek}</Text>
            <Text style={[s.reminderMetricLabel, { color: colors.textMuted }]}>Done this week</Text>
          </View>
          <View style={[s.reminderMetricDivider, { backgroundColor: colors.border }]} />
          <View style={s.reminderMetricItem}>
            <Text style={[s.reminderMetricVal, { color: brand.kids }]}>{completionRate}%</Text>
            <Text style={[s.reminderMetricLabel, { color: colors.textMuted }]}>Completion</Text>
          </View>
        </View>

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
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {list.length === 0 ? (
            <View style={s.reminderModalEmpty}>
              <Bell size={28} color={colors.textMuted} strokeWidth={1.5} />
              <Text style={[s.remindersEmptyText, { color: colors.textSecondary }]}>
                {tab === 'active' ? 'No active reminders' : 'Nothing archived yet'}
              </Text>
            </View>
          ) : (
            <View style={[s.remindersCard, { backgroundColor: '#1A1530', borderColor: colors.borderLight, marginHorizontal: 16, marginTop: 16, borderRadius: radius.lg }]}>
              {list.map((r, i) => (
                <ReminderRow
                  key={r.id}
                  r={r}
                  isLast={i === list.length - 1}
                  onToggle={() => onToggle(r.id)}
                  onDelete={() => onDelete(r.id)}
                  colors={colors}
                  allChildren={allChildren}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </View>
      </View>
    </Modal>
  )
}

// ─── Growth Leap Card ───────────────────────────────────────────────────────

function GrowthLeapCard({ leap, childName }: { leap: NonNullable<ReturnType<typeof getGrowthLeap>>; childName: string }) {
  const { colors, radius } = useTheme()
  const isActive = leap.status === 'active'

  return (
    <View style={[s.leapCard, { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg, borderColor: colors.borderLight }]}>
      <View style={s.leapHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[s.leapTitle, { color: colors.text }]}>Growth Leap #{leap.index + 1}</Text>
          <Text style={[s.leapDesc, { color: colors.textMuted }]}>{leap.name}</Text>
        </View>
        <View style={[s.leapBadge, { backgroundColor: isActive ? brand.primary + '20' : brand.kids + '15' }]}>
          <Text style={[s.leapBadgeText, { color: isActive ? colors.primary : brand.kids }]}>
            {isActive ? 'In Progress' : `In ${leap.weeksUntil}w`}
          </Text>
        </View>
      </View>

      <View style={s.leapTimeline}>
        <View style={[s.leapTrack, { backgroundColor: colors.border }]} />
        <View style={[s.leapTrackFill, { backgroundColor: brand.kids, width: isActive ? `${Math.round(leap.progress * 100)}%` as any : '0%' as any }]} />
        <View style={s.leapDots}>
          <View style={[s.leapDot, { backgroundColor: brand.kids }]} />
          <View style={{ alignItems: 'center' }}>
            <View style={[s.leapDot, { backgroundColor: isActive ? brand.primary : colors.border }]} />
            <Text style={[s.leapWeekLabel, { color: colors.textMuted }]}>Week {leap.week}</Text>
          </View>
          <View style={[s.leapDot, { backgroundColor: colors.border }]} />
        </View>
      </View>

      {isActive && (
        <View style={[s.leapTip, { backgroundColor: 'rgba(255,152,0,0.08)' }]}>
          <View style={[s.leapTipIcon, { backgroundColor: 'rgba(255,152,0,0.12)' }]}>
            <AlertCircle size={16} color={brand.warning} strokeWidth={2} />
          </View>
          <Text style={[s.leapTipText, { color: colors.textSecondary }]}>
            {childName} might be more fussy than usual. Extra comfort and patience helps.
          </Text>
        </View>
      )}
    </View>
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

  // Child pills
  childPills: { gap: 8, paddingHorizontal: 2, marginBottom: 4 },
  childPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 16 },
  pillName: { fontSize: 14, fontWeight: '700' },
  pillAge: { fontSize: 10, fontWeight: '500' },
  addChildBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },

  // Date range picker
  dateRangeRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  dateRangePill: { paddingVertical: 6, paddingHorizontal: 14 },
  dateRangeText: { fontSize: 12, fontWeight: '700' },

  // Mini rings
  miniRingsCard: { padding: 14, borderWidth: 1, gap: 10 },
  miniRingsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  miniRingsTitle: { fontSize: 12, fontWeight: '700' },
  miniMetricPicker: { flexDirection: 'row', gap: 4 },
  miniMetricBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8 },
  miniMetricDot: { width: 6, height: 6, borderRadius: 3 },
  miniMetricLabel: { fontSize: 10, fontWeight: '700' },
  miniRingsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  miniRingCol: { alignItems: 'center', gap: 4 },
  miniRingOuter: { alignItems: 'center', justifyContent: 'center' },
  miniRingLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },

  // Hero
  heroWrap: { alignItems: 'center', paddingVertical: 4 },
  heroCenter: { alignItems: 'center', gap: 2 },
  heroNumber: { fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  heroUnit: { fontSize: 9, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  heroBadge: { marginTop: 6, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  heroBadgeText: { fontSize: 10, fontWeight: '700' },

  // Legend
  legendRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  legendItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  legendValue: { fontSize: 14, fontWeight: '800', marginTop: 1 },
  legendTarget: { fontSize: 9, fontWeight: '600', marginTop: 1 },

  // Section header
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  sectionTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  sectionLink: { fontSize: 12, fontWeight: '700' },

  // Metric cards
  metricsRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  metricsRowItem: { flex: 1 },
  metricCard: { flex: 1, height: 170, padding: 12, borderWidth: 1, gap: 2 },
  metricHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  metricLabel: { fontSize: 11, fontWeight: '700' },
  metricValue: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  metricSmall: { fontSize: 10, fontWeight: '500' },
  metricEmpty: { height: 50, alignItems: 'center', justifyContent: 'center' },

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
  leapCard: { padding: 20, gap: 12, borderWidth: 1 },
  leapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  leapTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  leapDesc: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  leapBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  leapBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: -0.3 },
  leapTimeline: { height: 30, justifyContent: 'center', marginHorizontal: 8, marginTop: 4 },
  leapTrack: { position: 'absolute', left: 0, right: 0, height: 2, borderRadius: 1 },
  leapTrackFill: { position: 'absolute', left: 0, height: 2, borderRadius: 1 },
  leapDots: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  leapDot: { width: 10, height: 10, borderRadius: 5 },
  leapWeekLabel: { fontSize: 8, fontWeight: '700', marginTop: 4, textTransform: 'uppercase' },
  leapTip: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16 },
  leapTipIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  leapTipText: { flex: 1, fontSize: 11, fontWeight: '500', lineHeight: 16 },

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
  // Reminders modal
  reminderModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  reminderModal: { height: '90%', borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  reminderModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14, borderBottomWidth: 1 },
  reminderModalTitle: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  reminderMetricStrip: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 14, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  reminderMetricItem: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 2 },
  reminderMetricVal: { fontSize: 18, fontWeight: '800' },
  reminderMetricLabel: { fontSize: 10, fontWeight: '600' },
  reminderMetricDivider: { width: 1, height: 36 },
  reminderTabs: { flexDirection: 'row', borderBottomWidth: 1, marginTop: 14 },
  reminderTab: { flex: 1, alignItems: 'center', paddingBottom: 12, paddingTop: 4 },
  reminderTabText: { fontSize: 13 },
  reminderTabLine: { height: 2, width: '60%', borderRadius: 2, marginTop: 8 },
  reminderModalEmpty: { alignItems: 'center', paddingVertical: 48, gap: 8 },

  // Grandma
  grandmaCard: {
    flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14,
    overflow: 'hidden',
    backgroundColor: '#7048B8',
    shadowColor: '#7048B8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  grandmaBlob: {
    position: 'absolute', right: -20, top: -20,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  grandmaIconWrap: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  grandmaArrow: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  grandmaTitle: { fontSize: 16, fontWeight: '800', color: '#FFF', letterSpacing: -0.2 },
  grandmaDesc: { fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { padding: 24, paddingBottom: 40, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  modalClose: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
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
  modalStatCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginTop: 12 },
  modalStatLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  modalStatValue: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  modalStatExtra: { fontSize: 11, fontWeight: '700' },
  modalSectionTitle: { fontSize: 14, fontWeight: '700', marginTop: 20, marginBottom: 8 },

  modalTaskRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1 },
  modalTaskCheck: { width: 20, height: 20, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  modalTaskLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  modalTaskStatus: { fontSize: 11, fontWeight: '700' },

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
  setGoalsBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderWidth: 1 },
  setGoalsBtnText: { fontSize: 13, fontWeight: '700' },
  setGoalsBtnHint: { flex: 1, fontSize: 11, fontWeight: '500', textAlign: 'right' },

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
  healthTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8 },
  healthTagText: { fontSize: 11, fontWeight: '700' },

  // View Full History button
  healthHistoryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderWidth: 1, marginTop: 20, marginBottom: 8 },
  healthHistoryBtnText: { flex: 1, fontSize: 13, fontWeight: '700' },

  // Vaccine schedule button
  vaccineScheduleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1 },
  vaccineScheduleBtnText: { fontSize: 11, fontWeight: '700' },
})
