/**
 * Badge & Rewards Store — tracks achievements, streaks, and daily rewards.
 *
 * Badges are earned by:
 *  - Logging streaks (3, 7, 14, 21, 30, 60, 100 days)
 *  - Pillar mastery (score >= 8 for 7 consecutive days)
 *  - Goal consistency (hit daily goals 5/7 days)
 *  - Milestones (first log, first photo, 100 logs, etc.)
 *  - Community (first channel post, 10 reactions, etc.)
 *  - Daily check-in rewards
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'

/** Format a Date to local YYYY-MM-DD (matches how calendar stores log dates). */
function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ─── Badge Definitions ────────────────────────────────────────────────────────

export interface BadgeDef {
  id: string
  name: string
  description: string
  icon: string        // emoji
  category: BadgeCategory
  color: string       // hex
  tier: 'bronze' | 'silver' | 'gold' | 'diamond'
}

export type BadgeCategory = 'streak' | 'nutrition' | 'sleep' | 'mood' | 'health' | 'growth' | 'community' | 'milestone' | 'daily'

export const BADGE_DEFS: BadgeDef[] = [
  // ═══ STREAK BADGES ═══
  { id: 'streak_3',   name: 'Getting Started',    description: '3-day logging streak',        icon: '🔥', category: 'streak', color: '#FF9800', tier: 'bronze' },
  { id: 'streak_7',   name: 'Week Warrior',        description: '7-day logging streak',        icon: '🔥', category: 'streak', color: '#FF9800', tier: 'bronze' },
  { id: 'streak_14',  name: 'Dedicated Parent',    description: '14-day logging streak',       icon: '🔥', category: 'streak', color: '#F59E0B', tier: 'silver' },
  { id: 'streak_21',  name: 'Three Week Champion',  description: '21-day logging streak',       icon: '🔥', category: 'streak', color: '#F59E0B', tier: 'silver' },
  { id: 'streak_30',  name: 'Monthly Master',       description: '30-day logging streak',       icon: '🏆', category: 'streak', color: '#F59E0B', tier: 'gold' },
  { id: 'streak_60',  name: 'Consistency King',     description: '60-day logging streak',       icon: '👑', category: 'streak', color: '#B983FF', tier: 'gold' },
  { id: 'streak_100', name: 'Legendary Logger',     description: '100-day logging streak',      icon: '💎', category: 'streak', color: '#4D96FF', tier: 'diamond' },

  // ═══ NUTRITION BADGES ═══
  { id: 'nutrition_first',   name: 'First Bite',        description: 'Logged first meal',             icon: '🥑', category: 'nutrition', color: '#A2FF86', tier: 'bronze' },
  { id: 'nutrition_variety', name: 'Food Explorer',      description: 'Logged 10 different foods',     icon: '🌈', category: 'nutrition', color: '#A2FF86', tier: 'silver' },
  { id: 'nutrition_master',  name: 'Nutrition Star',     description: 'Nutrition score >= 8 for 7 days', icon: '⭐', category: 'nutrition', color: '#A2FF86', tier: 'gold' },
  { id: 'nutrition_100',     name: 'Century Meals',      description: 'Logged 100 meals',              icon: '🍴', category: 'nutrition', color: '#A2FF86', tier: 'gold' },

  // ═══ SLEEP BADGES ═══
  { id: 'sleep_first',   name: 'Sleep Tracker',    description: 'Logged first sleep entry',          icon: '🌙', category: 'sleep', color: '#B983FF', tier: 'bronze' },
  { id: 'sleep_week',    name: 'Sleep Routine',    description: 'Logged sleep 7 days in a row',      icon: '😴', category: 'sleep', color: '#B983FF', tier: 'silver' },
  { id: 'sleep_master',  name: 'Dream Keeper',     description: 'Sleep score >= 8 for 7 days',       icon: '✨', category: 'sleep', color: '#B983FF', tier: 'gold' },

  // ═══ MOOD BADGES ═══
  { id: 'mood_first',    name: 'Mood Watcher',     description: 'Logged first mood entry',           icon: '😊', category: 'mood', color: '#FF8AD8', tier: 'bronze' },
  { id: 'mood_week',     name: 'Emotion Tracker',  description: 'Logged mood 7 days in a row',       icon: '🎭', category: 'mood', color: '#FF8AD8', tier: 'silver' },
  { id: 'mood_happy',    name: 'Happy Week',       description: 'Dominant mood was happy for 7 days', icon: '🌟', category: 'mood', color: '#FF8AD8', tier: 'gold' },

  // ═══ HEALTH BADGES ═══
  { id: 'health_vaccine',  name: 'Shield Up',        description: 'Logged first vaccine',        icon: '🛡', category: 'health', color: '#4D96FF', tier: 'bronze' },
  { id: 'health_all_vax',  name: 'Fully Protected',  description: 'All vaccines up to date',     icon: '💪', category: 'health', color: '#4D96FF', tier: 'gold' },
  { id: 'health_checkup',  name: 'Health Check',     description: 'Logged 5 health events',      icon: '🏥', category: 'health', color: '#4D96FF', tier: 'silver' },

  // ═══ DIAPER BADGES ═══
  { id: 'diaper_first',    name: 'Diaper Duty',       description: 'Logged first diaper change',      icon: '🧷', category: 'health', color: '#6AABF7', tier: 'bronze' },
  { id: 'diaper_week',     name: 'Diaper Tracker',    description: 'Logged diapers 7 days in a row',  icon: '🧷', category: 'health', color: '#6AABF7', tier: 'silver' },
  { id: 'diaper_100',      name: 'Diaper Champion',   description: 'Logged 100 diaper changes',       icon: '🏅', category: 'health', color: '#6AABF7', tier: 'gold' },

  // ═══ GROWTH BADGES ═══
  { id: 'growth_first',    name: 'Growing Up',       description: 'Logged first growth measurement', icon: '📏', category: 'growth', color: '#F59E0B', tier: 'bronze' },
  { id: 'growth_tracker',  name: 'Growth Tracker',   description: 'Logged 10 growth measurements',   icon: '📈', category: 'growth', color: '#F59E0B', tier: 'silver' },

  // ═══ COMMUNITY BADGES ═══
  { id: 'community_first',    name: 'Social Butterfly',  description: 'Posted first channel message',  icon: '💬', category: 'community', color: '#7048B8', tier: 'bronze' },
  { id: 'community_helpful',  name: 'Helpful Hand',      description: 'Got 10 reactions on posts',     icon: '❤', category: 'community', color: '#7048B8', tier: 'silver' },
  { id: 'community_leader',   name: 'Community Leader',  description: 'Created a channel',             icon: '🌟', category: 'community', color: '#7048B8', tier: 'gold' },

  // ═══ MILESTONE BADGES ═══
  { id: 'milestone_first_log',   name: 'First Steps',     description: 'Logged first activity ever',  icon: '👶', category: 'milestone', color: '#FF6B35', tier: 'bronze' },
  { id: 'milestone_first_photo', name: 'Memory Maker',    description: 'Added first photo',           icon: '📸', category: 'milestone', color: '#FF6B35', tier: 'bronze' },
  { id: 'milestone_100_logs',    name: 'Centurion',       description: 'Logged 100 activities',       icon: '💯', category: 'milestone', color: '#FF6B35', tier: 'silver' },
  { id: 'milestone_500_logs',    name: 'Grandma\'s Pride', description: 'Logged 500 activities',       icon: '🏅', category: 'milestone', color: '#FF6B35', tier: 'gold' },

  // ═══ DAILY REWARDS ═══
  { id: 'daily_checkin_7',   name: 'Week Regular',     description: 'Checked in 7 days',         icon: '📅', category: 'daily', color: '#A07FDC', tier: 'bronze' },
  { id: 'daily_checkin_30',  name: 'Monthly Devotion',  description: 'Checked in 30 days',        icon: '📅', category: 'daily', color: '#A07FDC', tier: 'silver' },
  { id: 'daily_checkin_100', name: 'Centurion Parent',  description: 'Checked in 100 days',       icon: '📅', category: 'daily', color: '#A07FDC', tier: 'gold' },
]

// ─── Daily Reward Tiers ───────────────────────────────────────────────────────

export interface DailyReward {
  day: number
  points: number
  badge?: string    // badge ID unlocked on this day
  label: string
}

export const DAILY_REWARDS: DailyReward[] = [
  { day: 1, points: 10, label: 'Welcome back!' },
  { day: 2, points: 15, label: 'Keep going!' },
  { day: 3, points: 20, badge: 'streak_3', label: '3-day streak!' },
  { day: 4, points: 20, label: 'Consistent!' },
  { day: 5, points: 25, label: 'Halfway there!' },
  { day: 6, points: 25, label: 'Almost a week!' },
  { day: 7, points: 50, badge: 'streak_7', label: 'Week complete!' },
]

// ─── Store ────────────────────────────────────────────────────────────────────

export interface EarnedBadge {
  badgeId: string
  earnedAt: string    // ISO date
  childId?: string    // which child triggered it (optional)
}

interface BadgeState {
  earnedBadges: EarnedBadge[]
  totalPoints: number
  currentStreak: number
  longestStreak: number
  lastCheckInDate: string | null  // YYYY-MM-DD
  totalCheckIns: number
  hydrated: boolean

  setHydrated: (h: boolean) => void
  earnBadge: (badgeId: string, childId?: string) => boolean  // returns true if newly earned
  hasBadge: (badgeId: string) => boolean
  checkIn: () => { points: number; newBadges: string[]; streak: number }
  addPoints: (amount: number) => void
  /** Overwrites streak + totalPoints from Supabase-derived values (single source of truth). */
  setSyncedStats: (s: { currentStreak: number; longestStreak: number; totalPoints: number; totalCheckIns: number }) => void
  getBadgesByCategory: (category: BadgeCategory) => EarnedBadge[]
  syncFromData: (data: {
    totalLogs: number
    streak: number
    foodCount: number
    uniqueFoods: number
    sleepDays: number
    moodDays: number
    diaperCount: number
    diaperDays: number
    vaccinesDone: number
    totalVaccines: number
    growthMeasurements: number
    hasPhotos: boolean
    channelPosts: number
    totalReactions: number
    createdChannels: number
    nutritionScore7Day: number
    sleepScore7Day: number
  }) => string[]  // returns newly earned badge IDs
}

// Demo badges to show visual states (remove when real data flows)
const DEMO_BADGES: EarnedBadge[] = [
  { badgeId: 'streak_3',         earnedAt: '2026-03-20T10:00:00Z' },
  { badgeId: 'streak_7',         earnedAt: '2026-03-24T10:00:00Z' },
  { badgeId: 'streak_14',        earnedAt: '2026-03-31T10:00:00Z' },
  { badgeId: 'streak_30',        earnedAt: '2026-04-10T10:00:00Z' },
  { badgeId: 'nutrition_first',  earnedAt: '2026-03-15T08:00:00Z' },
  { badgeId: 'nutrition_variety', earnedAt: '2026-04-01T12:00:00Z' },
  { badgeId: 'sleep_first',      earnedAt: '2026-03-15T20:00:00Z' },
  { badgeId: 'sleep_week',       earnedAt: '2026-03-22T20:00:00Z' },
  { badgeId: 'mood_first',       earnedAt: '2026-03-16T10:00:00Z' },
  { badgeId: 'health_vaccine',   earnedAt: '2026-03-18T14:00:00Z' },
  { badgeId: 'growth_first',     earnedAt: '2026-03-19T09:00:00Z' },
  { badgeId: 'milestone_first_log', earnedAt: '2026-03-15T07:00:00Z' },
  { badgeId: 'milestone_100_logs',  earnedAt: '2026-04-05T16:00:00Z' },
  { badgeId: 'community_first',  earnedAt: '2026-03-28T11:00:00Z' },
  { badgeId: 'daily_checkin_7',  earnedAt: '2026-03-22T07:00:00Z' },
]

export const useBadgeStore = create<BadgeState>()(
  persist(
    (set, get) => ({
      earnedBadges: DEMO_BADGES,
      totalPoints: 485,
      currentStreak: 30,
      longestStreak: 30,
      lastCheckInDate: localDateStr(new Date()),
      totalCheckIns: 42,
      hydrated: false,

      setHydrated: (h) => set({ hydrated: h }),

      hasBadge: (badgeId) => {
        return get().earnedBadges.some((b) => b.badgeId === badgeId)
      },

      earnBadge: (badgeId, childId) => {
        if (get().hasBadge(badgeId)) return false
        const badge: EarnedBadge = {
          badgeId,
          earnedAt: new Date().toISOString(),
          childId,
        }
        set((s) => ({
          earnedBadges: [...s.earnedBadges, badge],
        }))
        return true
      },

      checkIn: () => {
        const state = get()
        const today = localDateStr(new Date())

        // Already checked in today
        if (state.lastCheckInDate === today) {
          return { points: 0, newBadges: [], streak: state.currentStreak }
        }

        const yd = new Date(); yd.setDate(yd.getDate() - 1)
        const yesterday = localDateStr(yd)
        const isConsecutive = state.lastCheckInDate === yesterday
        const newStreak = isConsecutive ? state.currentStreak + 1 : 1
        const newTotal = state.totalCheckIns + 1

        // Determine daily reward
        const dayInCycle = ((newStreak - 1) % 7) + 1  // 1-7 repeating
        const reward = DAILY_REWARDS.find((r) => r.day === dayInCycle) || DAILY_REWARDS[0]
        const points = reward.points

        const newBadges: string[] = []

        // Award badge from daily reward
        if (reward.badge) {
          const earned = get().earnBadge(reward.badge)
          if (earned) newBadges.push(reward.badge)
        }

        // Check-in milestones
        if (newTotal === 7) { get().earnBadge('daily_checkin_7'); newBadges.push('daily_checkin_7') }
        if (newTotal === 30) { get().earnBadge('daily_checkin_30'); newBadges.push('daily_checkin_30') }
        if (newTotal === 100) { get().earnBadge('daily_checkin_100'); newBadges.push('daily_checkin_100') }

        // Streak milestones
        const streakBadges = [14, 21, 30, 60, 100]
        for (const s of streakBadges) {
          if (newStreak === s) {
            const id = `streak_${s}`
            const earned = get().earnBadge(id)
            if (earned) newBadges.push(id)
          }
        }

        set({
          currentStreak: newStreak,
          longestStreak: Math.max(state.longestStreak, newStreak),
          lastCheckInDate: today,
          totalCheckIns: newTotal,
          totalPoints: state.totalPoints + points,
        })

        return { points, newBadges, streak: newStreak }
      },

      addPoints: (amount) => {
        set((s) => ({ totalPoints: s.totalPoints + amount }))
      },

      setSyncedStats: ({ currentStreak, longestStreak, totalPoints, totalCheckIns }) => {
        set((s) => ({
          currentStreak,
          longestStreak: Math.max(s.longestStreak, longestStreak),
          totalPoints,
          totalCheckIns: Math.max(s.totalCheckIns, totalCheckIns),
        }))
      },

      getBadgesByCategory: (category) => {
        const earned = get().earnedBadges
        return earned.filter((e) => {
          const def = BADGE_DEFS.find((d) => d.id === e.badgeId)
          return def?.category === category
        })
      },

      syncFromData: (data) => {
        const newBadges: string[] = []
        const earn = (id: string) => {
          if (get().earnBadge(id)) newBadges.push(id)
        }

        // Milestones
        if (data.totalLogs >= 1) earn('milestone_first_log')
        if (data.totalLogs >= 100) earn('milestone_100_logs')
        if (data.totalLogs >= 500) earn('milestone_500_logs')
        if (data.hasPhotos) earn('milestone_first_photo')

        // Nutrition
        if (data.foodCount >= 1) earn('nutrition_first')
        if (data.uniqueFoods >= 10) earn('nutrition_variety')
        if (data.foodCount >= 100) earn('nutrition_100')
        if (data.nutritionScore7Day >= 8) earn('nutrition_master')

        // Sleep
        if (data.sleepDays >= 1) earn('sleep_first')
        if (data.sleepDays >= 7) earn('sleep_week')
        if (data.sleepScore7Day >= 8) earn('sleep_master')

        // Mood
        if (data.moodDays >= 1) earn('mood_first')
        if (data.moodDays >= 7) earn('mood_week')

        // Health
        if (data.vaccinesDone >= 1) earn('health_vaccine')
        if (data.vaccinesDone >= data.totalVaccines && data.totalVaccines > 0) earn('health_all_vax')

        // Diaper
        if (data.diaperCount >= 1) earn('diaper_first')
        if (data.diaperDays >= 7) earn('diaper_week')
        if (data.diaperCount >= 100) earn('diaper_100')

        // Growth
        if (data.growthMeasurements >= 1) earn('growth_first')
        if (data.growthMeasurements >= 10) earn('growth_tracker')

        // Community
        if (data.channelPosts >= 1) earn('community_first')
        if (data.totalReactions >= 10) earn('community_helpful')
        if (data.createdChannels >= 1) earn('community_leader')

        // Streaks
        const streakMap = [3, 7, 14, 21, 30, 60, 100]
        for (const s of streakMap) {
          if (data.streak >= s) earn(`streak_${s}`)
        }

        return newBadges
      },
    }),
    {
      name: 'grandma-badges',
      version: 2,
      migrate: (persisted: any, version: number) => {
        // Reset to demo data when migrating from v0/v1
        if (version < 2) {
          return {
            earnedBadges: DEMO_BADGES,
            totalPoints: 485,
            currentStreak: 30,
            longestStreak: 30,
            lastCheckInDate: localDateStr(new Date()),
            totalCheckIns: 42,
          }
        }
        return persisted as any
      },
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        earnedBadges: state.earnedBadges,
        totalPoints: state.totalPoints,
        currentStreak: state.currentStreak,
        longestStreak: state.longestStreak,
        lastCheckInDate: state.lastCheckInDate,
        totalCheckIns: state.totalCheckIns,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true)
      },
    },
  ),
)

// ─── Helper: Get badge definition ─────────────────────────────────────────────

export function getBadgeDef(id: string): BadgeDef | undefined {
  return BADGE_DEFS.find((d) => d.id === id)
}

export function getTierColor(tier: BadgeDef['tier']): string {
  switch (tier) {
    case 'bronze': return '#CD7F32'
    case 'silver': return '#C0C0C0'
    case 'gold': return '#FFD700'
    case 'diamond': return '#B9F2FF'
  }
}
