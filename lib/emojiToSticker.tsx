/**
 * emojiToSticker — maps a raw emoji string to a RewardSticker component.
 *
 * Used to migrate legacy emoji-driven UI (CollapsibleCard, data fields with
 * `icon: '💊'`) to the sticker design system without touching every data file.
 * Pass an emoji, get a sticker component back.
 *
 * Fallback: `LogNote` (generic paper note).
 */

import type { ComponentType } from 'react'
import {
  LogVitamins, LogWater, LogMood, LogSymptom, LogWeight, LogSleep,
  LogExercise, LogKicks, LogNutrition, LogKegel, LogBirthPrep,
  LogContraction, LogHeartbeat, LogUltrasound, LogNesting, LogAppointment,
  LogExamResult, LogTemperature, LogIntimacy, LogPeriodStart, LogPeriodEnd,
  LogOvulation, LogCervicalFluid, LogDiaper, LogFeeding, LogFood, LogMedicine,
  LogGrowth, LogMilestone, LogNote, LogVaccine, LogFever, LogBath, LogNap,
  LogPotty, LogTooth,
  TipRead, NotifyInsight, NotifyHealthAlert, NotifyGoalAchieved,
  NotifyAppointmentDue, NotifyVaccineDue, NotifyStreakBroken,
  NotifyWellnessUp, NotifyWellnessDown, NotifyDailySummary, NotifyWeeklyReport,
  NotifyMention, NotifyLike, NotifyReply, NotifyRoutine,
  HealthCheckup, VaccineShield, VaccineComplete,
  MoodFace, FirstKick, FirstTooth, FirstWord, FirstStep, FirstSmile,
  FirstRoll, FirstCrawl, FirstSolidFood, FirstHaircut, FirstPotty,
  SleepThrough, FertileHit, CycleComplete, PillarPostpartumPrep,
  GiftBox, GarageTag, FirstListing, FirstGift, FirstTrade, FirstPost,
  FirstThread, FirstReaction, CommunityHelpful, CommunityLeader,
  FirstPhoto, MemoryMaker, ProfileComplete, ChildAdded,
  CircleLinked, CircleDots, RolePartner, RoleNanny, RoleFamily, RoleDoctor,
  QuestRibbon, PointsCoin, DayBadge, DayLocked, Premium, VaultSecured,
  TalkMaster, EmergencyReady, Legendary, ScanComplete, BirthPlanReady,
  AirTagLinked, PaywallUnlock, JourneyStart, AllThreeJourneys,
  ModeTrying, ModePregnant, ModeParent, Trimester, WeekMarker, Flame,
  WeekWheel, WeekBar, PillarMaster, PillarOpen, PillarComplete,
  PillarWeekByWeek, PillarBreastfeeding, PillarFeeding, PillarVaccines,
  PillarRecipes, PillarBabyGear, PillarMilestones, PillarMedicine,
  GrowthFirst, GrowthTracker, DiaperFirst, Diaper100, DailyCheckin,
} from '../components/stickers/RewardStickers'

type StickerComponent = ComponentType<{ size?: number; fill?: string; stroke?: string }>

const MAP: Record<string, StickerComponent> = {
  // Pregnancy
  '💊': LogVitamins,
  '💧': LogWater,
  '🌊': LogWater,
  '😊': LogMood,
  '🙂': LogMood,
  '😃': LogMood,
  '😁': LogMood,
  '😄': LogMood,
  '🤒': LogSymptom,
  '🤕': LogSymptom,
  '🤢': LogSymptom,
  '🤮': LogSymptom,
  '⚖️': LogWeight,
  '⚖': LogWeight,
  '😴': LogSleep,
  '💤': LogSleep,
  '🧘': LogExercise,
  '🧘‍♀️': LogExercise,
  '🧘‍♂️': LogExercise,
  '🏃': LogExercise,
  '🏃‍♀️': LogExercise,
  '🏃‍♂️': LogExercise,
  '💪': LogKegel,
  '👶': LogKicks,
  '🥗': LogNutrition,
  '🍎': LogNutrition,
  '🍏': LogNutrition,
  '🥑': LogNutrition,
  '🥦': LogNutrition,
  '🥕': LogNutrition,
  '🍽️': LogNutrition,
  '🍳': LogNutrition,
  '🍞': LogNutrition,
  '🥬': LogNutrition,
  '🪺': LogNesting,
  '🏠': LogNesting,
  '🏡': LogNesting,
  '🫀': LogHeartbeat,
  '💓': LogHeartbeat,
  '💗': LogHeartbeat,
  '💕': LogHeartbeat,

  // Appointments / medical
  '📅': LogAppointment,
  '📆': LogAppointment,
  '🗓️': LogAppointment,
  '📋': LogExamResult,
  '📄': LogExamResult,
  '📃': LogExamResult,
  '📝': LogExamResult,
  '🏥': HealthCheckup,
  '🩺': HealthCheckup,
  '💉': VaccineShield,
  '🧪': LogExamResult,

  // Pre-preg cycle
  '🌡️': LogTemperature,
  '🌡': LogTemperature,
  '❤️': LogIntimacy,
  '❤': LogIntimacy,
  '💖': LogIntimacy,

  // Kids
  '🍼': LogFeeding,
  '🥛': LogFeeding,
  '🛁': LogBath,
  '🚽': LogPotty,
  '🦷': LogTooth,
  '📏': LogGrowth,
  '📐': LogGrowth,
  '🎖️': LogMilestone,
  '⭐': LogMilestone,
  '🌟': LogMilestone,
  '💫': LogMilestone,
  '🎉': NotifyGoalAchieved,
  '🎊': NotifyGoalAchieved,
  '✅': NotifyGoalAchieved,
  '✔️': NotifyGoalAchieved,
  '☑️': NotifyGoalAchieved,

  // Notifications / alerts
  '⚠️': NotifyHealthAlert,
  '⚠': NotifyHealthAlert,
  '🚨': NotifyHealthAlert,
  '❗': NotifyHealthAlert,
  '❓': NotifyInsight,
  '💡': TipRead,
  '🔔': NotifyRoutine,
  '📈': NotifyWellnessUp,
  '📉': NotifyWellnessDown,
  '📊': NotifyWeeklyReport,
  '🧠': NotifyInsight,
  '✨': NotifyInsight,
  '🎯': NotifyGoalAchieved,
  '🔥': Flame,

  // Mood face variants
  '😢': MoodFace,
  '😭': MoodFace,
  '😞': MoodFace,
  '😟': MoodFace,
  '😐': MoodFace,
  '😌': MoodFace,
  '😍': MoodFace,
  '🥰': MoodFace,
  '🤩': MoodFace,
  '😰': MoodFace,
  '😠': MoodFace,
  '☹️': MoodFace,

  // Birth stages
  '🌅': LogBirthPrep,
  '🌄': LogBirthPrep,
  '🌸': PillarPostpartumPrep,
  '🌷': PillarPostpartumPrep,
  '🌹': PillarPostpartumPrep,

  // Community / care circle / profile
  '👥': CircleLinked,
  '👪': RoleFamily,
  '👨‍👩‍👧': RoleFamily,
  '👨‍👩‍👦': RoleFamily,
  '🫂': CircleLinked,
  '👩': RolePartner,
  '👨': RolePartner,
  '👵': TalkMaster,
  '👴': TalkMaster,
  '🧒': ChildAdded,
  '📸': FirstPhoto,
  '📷': FirstPhoto,
  '💬': NotifyReply,
  '📢': NotifyInsight,
  '@': NotifyMention,

  // Rewards / streaks
  '🏅': NotifyGoalAchieved,
  '🥇': NotifyGoalAchieved,
  '🥈': NotifyGoalAchieved,
  '🥉': NotifyGoalAchieved,
  '🎁': GiftBox,
  '🏷️': GarageTag,
  '👑': Premium,
  '🔒': DayLocked,
  '🔓': PaywallUnlock,
  '🛡️': VaccineShield,

  // Travel / journey
  '✈️': JourneyStart,
  '🚀': JourneyStart,
  '🧳': LogNesting,

  // Other common
  '📖': TipRead,
  '📚': TipRead,
  '👀': LogUltrasound,
  '🔊': TipRead,
  '🧬': LogExamResult,
  '🚫': NotifyHealthAlert,
}

function stripVariationSelectors(s: string): string {
  return s.replace(/\uFE0F/g, '').replace(/\u200D/g, '').trim()
}

/**
 * Get the RewardSticker component for an emoji string.
 * Returns `LogNote` fallback if no mapping exists.
 */
export function stickerForEmoji(emoji: string | undefined | null): StickerComponent {
  if (!emoji) return LogNote
  const direct = MAP[emoji]
  if (direct) return direct
  const stripped = stripVariationSelectors(emoji)
  return MAP[stripped] ?? LogNote
}
