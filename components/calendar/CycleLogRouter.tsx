/**
 * CycleLogRouter — renders every cycle LogSheet + form for a given date.
 *
 * A single, shared switchboard: given the active `sheetType` (chosen via the
 * LogActivitySheet launcher) and a `date`, it shows the matching bottom-sheet
 * log form. Extracted so the Cycle HOME and the Calendar tab drive the exact
 * same 13 logging forms for any day (backfill a past day from either surface).
 */
import { useMemo } from 'react'
import { LogSheet } from './LogSheet'
import { getCycleInfo, type CyclePhase, type CycleConfig } from '../../lib/cycleLogic'
import { useTranslation } from '../../lib/i18n'
import type { LogType } from './LogActivitySheet'
import {
  PeriodStartForm, PeriodEndForm, SymptomsForm, MoodForm, BbtForm,
  IntimacyForm, PregnancyTestForm, SexDriveForm, ClotsForm, WeightForm,
  WaterForm, ActivityForm, LhForm, CmForm,
} from './CycleLogForms'
import { ExamForm } from '../exams/ExamForm'

interface Props {
  /** Which form is open (null = none). */
  sheetType: LogType | null
  /** The day being logged (YYYY-MM-DD). */
  date: string
  cycleConfig: CycleConfig
  onClose: () => void
  /** Fired when a form saves successfully. */
  onSaved: () => void
}

export function CycleLogRouter({ sheetType, date, cycleConfig, onClose, onSaved }: Props) {
  const { t } = useTranslation()
  const phase = useMemo(() => getCycleInfo(cycleConfig, date).phase as CyclePhase, [cycleConfig, date])

  return (
    <>
      <LogSheet visible={sheetType === 'period_start'} title={t('cycleCalendar_logSheet_periodStart')} onClose={onClose}>
        <PeriodStartForm date={date} phase={phase} onSaved={onSaved} />
      </LogSheet>
      <LogSheet visible={sheetType === 'period_end'} title={t('cycleCalendar_logSheet_periodEnd')} onClose={onClose}>
        <PeriodEndForm date={date} phase={phase} onSaved={onSaved} />
      </LogSheet>
      <LogSheet visible={sheetType === 'symptom'} title={t('cycleCalendar_logSheet_symptoms')} onClose={onClose}>
        <SymptomsForm date={date} phase={phase} onSaved={onSaved} />
      </LogSheet>
      <LogSheet visible={sheetType === 'mood'} title={t('cycleCalendar_logSheet_mood')} onClose={onClose}>
        <MoodForm date={date} phase={phase} onSaved={onSaved} />
      </LogSheet>
      <LogSheet visible={sheetType === 'basal_temp'} title={t('cycleCalendar_logSheet_temperature')} onClose={onClose}>
        <BbtForm date={date} phase={phase} onSaved={onSaved} />
      </LogSheet>
      <LogSheet visible={sheetType === 'lh'} title={t('cycleDash_lh')} onClose={onClose}>
        <LhForm date={date} phase={phase} onSaved={onSaved} />
      </LogSheet>
      <LogSheet visible={sheetType === 'cm'} title={t('cycleDash_cervicalMucus')} onClose={onClose}>
        <CmForm date={date} phase={phase} onSaved={onSaved} />
      </LogSheet>
      <LogSheet visible={sheetType === 'intercourse'} title={t('cycleCalendar_logSheet_intimacy')} onClose={onClose}>
        <IntimacyForm date={date} phase={phase} onSaved={onSaved} />
      </LogSheet>
      <LogSheet visible={sheetType === 'pregnancy_test'} title={t('cycleCalendar_logSheet_pregTest')} onClose={onClose}>
        <PregnancyTestForm date={date} phase={phase} onSaved={onSaved} />
      </LogSheet>
      <LogSheet visible={sheetType === 'sex_drive'} title={t('cycleCalendar_logSheet_sexDrive')} onClose={onClose}>
        <SexDriveForm date={date} phase={phase} onSaved={onSaved} />
      </LogSheet>
      <LogSheet visible={sheetType === 'clots'} title={t('cycleCalendar_logSheet_clots')} onClose={onClose}>
        <ClotsForm date={date} phase={phase} onSaved={onSaved} />
      </LogSheet>
      <LogSheet visible={sheetType === 'weight'} title={t('cycleCalendar_logSheet_weight')} onClose={onClose}>
        <WeightForm date={date} phase={phase} onSaved={onSaved} />
      </LogSheet>
      <LogSheet visible={sheetType === 'water'} title={t('cycleCalendar_logSheet_water')} onClose={onClose}>
        <WaterForm date={date} phase={phase} onSaved={onSaved} />
      </LogSheet>
      <LogSheet visible={sheetType === 'activity'} title={t('cycleCalendar_logSheet_activity')} onClose={onClose}>
        <ActivityForm date={date} phase={phase} onSaved={onSaved} />
      </LogSheet>
      <LogSheet visible={sheetType === 'exam'} title={t('cycleCalendar_logSheet_exam')} onClose={onClose}>
        <ExamForm behavior="pre-pregnancy" date={date} onSaved={onSaved} />
      </LogSheet>
    </>
  )
}
