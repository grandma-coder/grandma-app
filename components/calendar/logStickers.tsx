/**
 * logStickers — maps log types across all 3 behaviors to RewardSticker JSX.
 *
 * Used inside LogTile (Log Activity sheet) and ActivityPillCard to render the
 * full-detail neo-pastel stickers from `components/stickers/RewardStickers`.
 *
 * Every surfaced log type on the calendar / log sheet uses a sticker from this
 * function — no emoji fallback.
 */

import { ReactNode } from 'react'
import { View } from 'react-native'
import {
  // Pregnancy logs
  LogSymptom, LogVitamins, LogWater, LogSleep, LogExercise, LogKicks,
  LogWeight, LogAppointment, LogExamResult, LogNutrition, LogKegel,
  LogNesting, LogBirthPrep, LogContraction, LogHeartbeat, LogUltrasound,
  // Pre-preg logs
  LogTemperature, LogIntimacy, LogPeriodStart, LogPeriodEnd, LogOvulation,
  LogCervicalFluid,
  // Kids logs
  LogDiaper, LogFeeding, LogFood, LogMedicine, LogGrowth, LogMilestone,
  LogNote, LogVaccine, LogFever, LogBath, LogNap, LogPotty, LogTooth, LogMood,
} from '../stickers/RewardStickers'

function StickerBox({ size, children }: { size: number; children: ReactNode }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </View>
  )
}

export function logSticker(type: string, size: number, _isDark: boolean): ReactNode {
  switch (type) {
    // ─── pre-pregnancy / cycle ────────────────────────────────────
    case 'basal_temp':
    case 'temperature':    return <StickerBox size={size}><LogTemperature size={size} /></StickerBox>
    case 'symptom':        return <StickerBox size={size}><LogSymptom size={size} /></StickerBox>
    case 'mood':           return <StickerBox size={size}><LogMood size={size} /></StickerBox>
    case 'intercourse':
    case 'intimacy':       return <StickerBox size={size}><LogIntimacy size={size} /></StickerBox>
    case 'period_start':   return <StickerBox size={size}><LogPeriodStart size={size} /></StickerBox>
    case 'period_end':     return <StickerBox size={size}><LogPeriodEnd size={size} /></StickerBox>
    case 'ovulation':      return <StickerBox size={size}><LogOvulation size={size} /></StickerBox>
    case 'cervical_fluid': return <StickerBox size={size}><LogCervicalFluid size={size} /></StickerBox>

    // ─── kids ─────────────────────────────────────────────────────
    case 'feeding':
    case 'milk':           return <StickerBox size={size}><LogFeeding size={size} /></StickerBox>
    case 'food':
    case 'solid':          return <StickerBox size={size}><LogFood size={size} /></StickerBox>
    case 'sleep':          return <StickerBox size={size}><LogSleep size={size} /></StickerBox>
    case 'nap':            return <StickerBox size={size}><LogNap size={size} /></StickerBox>
    case 'wake_up':        return <StickerBox size={size}><LogMood size={size} /></StickerBox>
    case 'diaper':         return <StickerBox size={size}><LogDiaper size={size} /></StickerBox>
    case 'health':
    case 'medicine':       return <StickerBox size={size}><LogMedicine size={size} /></StickerBox>
    case 'vaccine':        return <StickerBox size={size}><LogVaccine size={size} /></StickerBox>
    case 'fever':
    case 'temp':           return <StickerBox size={size}><LogFever size={size} /></StickerBox>
    case 'bath':           return <StickerBox size={size}><LogBath size={size} /></StickerBox>
    case 'potty':          return <StickerBox size={size}><LogPotty size={size} /></StickerBox>
    case 'tooth':          return <StickerBox size={size}><LogTooth size={size} /></StickerBox>
    case 'growth':         return <StickerBox size={size}><LogGrowth size={size} /></StickerBox>
    case 'milestone':      return <StickerBox size={size}><LogMilestone size={size} /></StickerBox>
    case 'note':
    case 'memory':         return <StickerBox size={size}><LogNote size={size} /></StickerBox>
    case 'activity':       return <StickerBox size={size}><LogExercise size={size} /></StickerBox>

    // ─── pregnancy ────────────────────────────────────────────────
    case 'vitamins':       return <StickerBox size={size}><LogVitamins size={size} /></StickerBox>
    case 'water':          return <StickerBox size={size}><LogWater size={size} /></StickerBox>
    case 'exercise':       return <StickerBox size={size}><LogExercise size={size} /></StickerBox>
    case 'kick_count':     return <StickerBox size={size}><LogKicks size={size} /></StickerBox>
    case 'weight':         return <StickerBox size={size}><LogWeight size={size} /></StickerBox>
    case 'appointment':    return <StickerBox size={size}><LogAppointment size={size} /></StickerBox>
    case 'exam_result':
    case 'exam':           return <StickerBox size={size}><LogExamResult size={size} /></StickerBox>
    case 'nutrition':      return <StickerBox size={size}><LogNutrition size={size} /></StickerBox>
    case 'kegel':          return <StickerBox size={size}><LogKegel size={size} /></StickerBox>
    case 'nesting':        return <StickerBox size={size}><LogNesting size={size} /></StickerBox>
    case 'birth_prep':     return <StickerBox size={size}><LogBirthPrep size={size} /></StickerBox>
    case 'contraction':    return <StickerBox size={size}><LogContraction size={size} /></StickerBox>
    case 'heartbeat':      return <StickerBox size={size}><LogHeartbeat size={size} /></StickerBox>
    case 'ultrasound':     return <StickerBox size={size}><LogUltrasound size={size} /></StickerBox>

    // ─── fallback ─────────────────────────────────────────────────
    default:               return <StickerBox size={size}><LogNote size={size} /></StickerBox>
  }
}
