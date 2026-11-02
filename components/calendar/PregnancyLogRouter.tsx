/**
 * PregnancyLogRouter — renders the matching pregnancy log form for a given
 * `type` + `date`. Extracted from PregnancyCalendar so the Calendar tab and the
 * home "Log for today" card drive the exact same 15 forms.
 */
import { PREGNANCY_LOG_STICKER_MAP } from '../../lib/logStickers'
import React from 'react'
import {
  PregnancyMoodForm, WeightLogForm, PregnancySymptomsForm, AppointmentForm,
  ExamResultForm, KickCountForm, SleepLogForm, ExerciseLogForm, KegelLogForm,
  WaterLogForm, VitaminsLogForm, NestingTaskForm, BirthPrepTaskForm,
  ContractionTimerLogForm,
} from './PregnancyLogForms'
import { PregnancyMealForm } from './PregnancyMealForm'
import type { SiteStickerName } from '../stickers/SiteSticker'

export type PregnancyLogType =
  | 'mood' | 'weight' | 'symptom' | 'appointment' | 'exam_result' | 'kick_count'
  | 'sleep' | 'exercise' | 'nutrition' | 'kegel' | 'water' | 'vitamins'
  | 'nesting' | 'birth_prep' | 'contraction'

/**
 * Site look: the sticker each pregnancy log form wants beside its `LogSheet` title
 * (`<LogSheet sticker={PREGNANCY_LOG_STICKER[type]} …>`). The forms no longer draw
 * their own header chip in the light look, so the sheet title carries the sticker.
 */
export const PREGNANCY_LOG_STICKER: Record<PregnancyLogType, SiteStickerName> = PREGNANCY_LOG_STICKER_MAP as Record<PregnancyLogType, SiteStickerName>

export function PregnancyLogRouter({
  type, date, onSaved,
}: {
  type: PregnancyLogType
  date: string
  onSaved: () => void
}): React.ReactElement | null {
  if (type === 'mood')        return <PregnancyMoodForm date={date} onSaved={onSaved} />
  if (type === 'weight')      return <WeightLogForm date={date} onSaved={onSaved} />
  if (type === 'symptom')     return <PregnancySymptomsForm date={date} onSaved={onSaved} />
  if (type === 'appointment') return <AppointmentForm date={date} onSaved={onSaved} />
  if (type === 'exam_result') return <ExamResultForm date={date} onSaved={onSaved} />
  if (type === 'kick_count')  return <KickCountForm date={date} onSaved={onSaved} />
  if (type === 'sleep')       return <SleepLogForm date={date} onSaved={onSaved} />
  if (type === 'exercise')    return <ExerciseLogForm date={date} onSaved={onSaved} />
  if (type === 'nutrition')   return <PregnancyMealForm date={date} onSaved={onSaved} />
  if (type === 'kegel')       return <KegelLogForm date={date} onSaved={onSaved} />
  if (type === 'water')       return <WaterLogForm date={date} onSaved={onSaved} />
  if (type === 'vitamins')    return <VitaminsLogForm date={date} onSaved={onSaved} />
  if (type === 'nesting')     return <NestingTaskForm date={date} onSaved={onSaved} />
  if (type === 'birth_prep')  return <BirthPrepTaskForm date={date} onSaved={onSaved} />
  if (type === 'contraction') return <ContractionTimerLogForm date={date} onSaved={onSaved} />
  return null
}
