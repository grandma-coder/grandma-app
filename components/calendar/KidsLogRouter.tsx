/**
 * KidsLogRouter — renders every kids LogSheet + form for a given date/child.
 * Shared by the Kids Calendar tab and the home "Log for today" card so both
 * drive the same 9 forms. Calendar passes editingLog/routinePrefill/onSkipRoutine;
 * home passes none (create-mode forms, today's date).
 */
import React from 'react'
import { LogSheet } from './LogSheet'
import { useTranslation } from '../../lib/i18n'
import {
  FeedingForm, SleepForm, WakeUpForm, HealthEventForm, KidsMoodForm,
  ActivityForm, MemoryForm, DiaperForm, type RoutinePrefill, type EditLog,
} from './KidsLogForms'
import { ExamForm } from '../exams/ExamForm'

export type KidsLogType = 'feeding' | 'sleep' | 'wake_up' | 'health' | 'mood' | 'memory' | 'activity' | 'diaper' | 'exam'

export interface KidsLogRouterProps {
  sheetType: KidsLogType | null
  date: string
  childId: string | null
  onClose: () => void
  onSaved: () => void
  editingLog?: EditLog | null
  routinePrefill?: RoutinePrefill | null
  onSkipRoutine?: (type: KidsLogType) => void
}

export function KidsLogRouter({
  sheetType, date, childId, onClose, onSaved, editingLog, routinePrefill, onSkipRoutine,
}: KidsLogRouterProps): React.ReactElement {
  const { t } = useTranslation()
  const prefill = routinePrefill ?? undefined
  const edit = editingLog ?? undefined
  const skip = (type: KidsLogType) =>
    routinePrefill?.routineId && onSkipRoutine ? () => onSkipRoutine(type) : undefined

  return (
    <>
      <LogSheet visible={sheetType === 'feeding'} title={edit ? t('kids_calendar_logSheet_editEntry') : (routinePrefill?.name ?? t('kids_calendar_logSheet_feeding'))} onClose={onClose}>
        <FeedingForm onSaved={onSaved} initialDate={date} prefill={prefill} editLog={edit} onSkip={skip('feeding')} />
      </LogSheet>
      <LogSheet visible={sheetType === 'sleep'} title={edit ? t('kids_calendar_logSheet_editEntry') : (routinePrefill?.name ?? t('kids_calendar_logSheet_sleep'))} onClose={onClose}>
        <SleepForm onSaved={onSaved} initialDate={date} prefill={prefill} editLog={edit} onSkip={skip('sleep')} />
      </LogSheet>
      <LogSheet visible={sheetType === 'wake_up'} title={routinePrefill?.name ?? t('kids_calendar_logSheet_wakeUp')} onClose={onClose}>
        <WakeUpForm onSaved={onSaved} prefill={prefill} onSkip={skip('wake_up')} />
      </LogSheet>
      <LogSheet visible={sheetType === 'health'} title={edit ? t('kids_calendar_logSheet_editEntry') : (routinePrefill?.name ?? t('kids_calendar_logSheet_health'))} onClose={onClose}>
        <HealthEventForm onSaved={onSaved} initialDate={date} prefill={prefill} editLog={edit} onSkip={skip('health')} />
      </LogSheet>
      <LogSheet visible={sheetType === 'mood'} title={edit ? t('kids_calendar_logSheet_editEntry') : (routinePrefill?.name ?? t('kids_calendar_logSheet_mood'))} onClose={onClose}>
        <KidsMoodForm onSaved={onSaved} initialDate={date} prefill={prefill} editLog={edit} onSkip={skip('mood')} />
      </LogSheet>
      <LogSheet visible={sheetType === 'activity'} title={edit ? t('kids_calendar_logSheet_editEntry') : (routinePrefill?.name ?? t('kids_calendar_logSheet_activity'))} onClose={onClose}>
        <ActivityForm onSaved={onSaved} initialDate={date} prefill={prefill} editLog={edit} onSkip={skip('activity')} />
      </LogSheet>
      <LogSheet visible={sheetType === 'memory'} title={t('kids_calendar_logSheet_memory')} onClose={onClose}>
        <MemoryForm onSaved={onSaved} initialDate={date} />
      </LogSheet>
      <LogSheet visible={sheetType === 'diaper'} title={edit ? t('kids_calendar_logSheet_editDiaper') : t('kids_calendar_logSheet_diaper')} onClose={onClose}>
        <DiaperForm onSaved={onSaved} initialDate={date} editLog={edit} />
      </LogSheet>
      <LogSheet visible={sheetType === 'exam'} title={t('kids_calendar_logSheet_exam')} onClose={onClose}>
        <ExamForm behavior="kids" childId={childId} date={date} onSaved={onSaved} />
      </LogSheet>
    </>
  )
}
