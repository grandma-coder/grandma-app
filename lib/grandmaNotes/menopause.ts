// lib/grandmaNotes/menopause.ts — the weekly "note from grandma" for Menopause.
//
// Pure + rule-based. Reuses the same stats MenopauseAnalytics shows
// (`computeSymptomStats`, `computeVasomotorFrequency`) over this week and last
// week. Self-care suggestions only — never a therapy or treatment.
import { computeSymptomStats, computeVasomotorFrequency, type MenopauseLogRow } from '../menopauseAnalytics'
import type { MenopauseSymptomId } from '../menopauseSymptoms'
import { TRIGGER_LABEL_KEY, TRIGGER_STICKER, countMenopauseTriggers } from '../menopauseTriggers'
import { inRange, pickTop, weekWindows } from './shared'
import type { GrandmaLetter, NoteCandidate, NoteKey, Translate } from './types'
import type { SiteStickerName } from '../../components/stickers/SiteSticker'

export interface MenopauseNoteInput {
  rows: MenopauseLogRow[]
  /** Months since the last period (from the store), if known. */
  monthsSincePeriod?: number | null
  /** Site sticker for a symptom id (the page's `menoSticker`). Default 'pencil'. */
  stickerFor?: (id: string) => SiteStickerName
  today?: Date
}

const SYMPTOM_KEY: Record<MenopauseSymptomId, NoteKey> = {
  hot_flash: 'gn_meno_sym_hot_flash',
  night_sweat: 'gn_meno_sym_night_sweat',
  sleep: 'gn_meno_sym_sleep',
  fatigue: 'gn_meno_sym_fatigue',
  low_mood: 'gn_meno_sym_low_mood',
  anxiety: 'gn_meno_sym_anxiety',
  brain_fog: 'gn_meno_sym_brain_fog',
  joint_pain: 'gn_meno_sym_joint_pain',
  headache: 'gn_meno_sym_headache',
  palpitations: 'gn_meno_sym_palpitations',
  weight: 'gn_meno_sym_weight',
  vaginal_dryness: 'gn_meno_sym_vaginal_dryness',
  libido: 'gn_meno_sym_libido',
}

/** ISO-ish week number so the general self-care tip rotates weekly. */
function weekIndex(d: Date): number {
  return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / (7 * 86400000))
}

export function buildMenopauseNote(input: MenopauseNoteInput, t: Translate): GrandmaLetter {
  const today = input.today ?? new Date()
  const w = weekWindows(today)
  const stickerFor = input.stickerFor ?? (() => 'pencil' as SiteStickerName)
  const thisRows = input.rows.filter((r) => inRange(r.date, w.thisFrom, w.thisTo))
  const prevRows = input.rows.filter((r) => inRange(r.date, w.prevFrom, w.prevTo))

  const vasoNow = computeVasomotorFrequency(thisRows).reduce((a, d) => a + d.count, 0)
  const vasoPrev = computeVasomotorFrequency(prevRows).reduce((a, d) => a + d.count, 0)
  const statsNow = computeSymptomStats(thisRows)
  const statsPrev = computeSymptomStats(prevRows)

  const c: NoteCandidate[] = []

  // Hot flashes + night sweats — this week vs last.
  if (vasoNow > 0 || vasoPrev > 0) {
    const title = t('gn_meno_vaso_title')
    let body: string
    let weight = 4
    if (vasoNow === 0) { body = t('gn_meno_vaso_none_body', { prev: vasoPrev }); weight = 4.5 }
    else if (vasoPrev === 0) body = t('gn_meno_vaso_body', { count: vasoNow })
    else if (vasoNow < vasoPrev * 0.85) { body = t('gn_meno_vaso_fewer_body', { count: vasoNow, prev: vasoPrev }); weight = 5.5 }
    else if (vasoNow > vasoPrev * 1.15) { body = t('gn_meno_vaso_more_body', { count: vasoNow, prev: vasoPrev }); weight = 5.5 }
    else body = t('gn_meno_vaso_same_body', { count: vasoNow })
    c.push({ id: 'vaso', sticker: 'flame', weight, title, body })
  }

  // The symptom logged most this week (other than the vasomotor pair above).
  const top = statsNow.find((s) => s.id !== 'hot_flash' && s.id !== 'night_sweat' && s.count >= 2)
  if (top) {
    const name = SYMPTOM_KEY[top.id as MenopauseSymptomId] ? t(SYMPTOM_KEY[top.id as MenopauseSymptomId]) : top.id
    const prevCount = statsPrev.find((s) => s.id === top.id)?.count ?? 0
    c.push({
      id: `sym-${top.id}`, sticker: stickerFor(top.id), weight: 3.5 + (prevCount > 0 && top.count !== prevCount ? 1 : 0),
      title: t('gn_meno_top_title', { symptom: name }),
      body: prevCount > 0
        ? t('gn_meno_top_prev_body', { count: top.count, prev: prevCount })
        : t('gn_meno_top_body', { count: top.count }),
    })
  }

  // What she noted before a hot flash / night sweat — a plain count, never advice.
  // Needs ≥3 tagged flash/sweat logs this week and one trigger noted at least twice
  // ("other" never names a pattern). Sits below a week-over-week flash change.
  const trig = countMenopauseTriggers(thisRows)
  const topTrig = trig.counts[0]
  if (trig.tagged >= 3 && topTrig && topTrig.count >= 2) {
    c.push({
      id: `trigger-${topTrig.id}`, sticker: TRIGGER_STICKER[topTrig.id],
      weight: 3 + Math.min(topTrig.count, 6) * 0.25,
      title: t('gn_meno_trigger_title'),
      body: t('gn_meno_trigger_body', { trigger: t(TRIGGER_LABEL_KEY[topTrig.id]), count: topTrig.count }),
    })
  }

  // Days you checked in.
  const daysNow = new Set(thisRows.map((r) => r.date)).size
  if (daysNow > 0) {
    c.push({ id: 'days', sticker: 'cal', weight: daysNow >= 7 ? 5 : 2, title: t(daysNow >= 7 ? 'gn_streak_title' : 'gn_meno_days_title'), body: daysNow >= 7 ? t('gn_streak_body') : t('gn_meno_days_body', { days: daysNow }) })
  }

  // Months since the last period — a gentle anchor, lowest priority.
  if (input.monthsSincePeriod != null && input.monthsSincePeriod >= 0) {
    const m = input.monthsSincePeriod
    c.push({ id: 'months', sticker: 'moon2', weight: 1, title: t('gn_meno_months_title'), body: t(m === 1 ? 'gn_meno_months_body_one' : 'gn_meno_months_body_other', { count: m }) })
  }

  if (thisRows.length === 0 && prevRows.length === 0) {
    return {
      intro: t('gn_intro_start'),
      notes: [{ id: 'start', sticker: 'pencil', title: t('gn_empty_title'), body: t('gn_meno_empty_body') }],
      suggestion: { text: t('gn_sug_meno_log') },
    }
  }

  // Self-care suggestion: answer what showed up, else rotate weekly.
  const sleepish = statsNow.some((s) => (s.id === 'sleep' || s.id === 'night_sweat') && s.count >= 2)
  const ROTATE: NoteKey[] = ['gn_sug_meno_diary', 'gn_sug_meno_walk', 'gn_sug_meno_sleep', 'gn_sug_meno_layers']
  const sugKey: NoteKey = vasoNow >= 3
    ? 'gn_sug_meno_layers'
    : sleepish
      ? 'gn_sug_meno_sleep'
      : ROTATE[weekIndex(today) % ROTATE.length]

  const notes = pickTop(c)
  return {
    intro: thisRows.length > 0 && notes.length >= 2 ? t('gn_intro_noticed') : t('gn_intro_quiet'),
    notes,
    suggestion: { text: t(sugKey) },
  }
}
