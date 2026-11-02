// lib/grandmaNotes/kids.ts — the "note from grandma" for the Kids journey.
//
// Pure + rule-based. The note is about the selected child but addressed to the
// parent ("Dear Amara," … "Kenji slept…"). Which pillars come first reuses the
// neutral read from `buildInsightHighlights` (largest change, then the pillars
// the scores single out) — scores only ORDER the notes, they're never printed.
import type { AnalyticsData } from '../analyticsData'
import { buildInsightHighlights, type PillarKey } from '../kidsInsightHighlights'
import { fmt1, pickTop } from './shared'
import type { GrandmaLetter, NoteCandidate, NoteKey, Translate } from './types'
import type { SiteStickerName } from '../../components/stickers/SiteSticker'

export interface KidsNoteInput {
  analytics: AnalyticsData | null | undefined
  childName: string
  ageMonths: number
}

const STICKER: Record<PillarKey, SiteStickerName> = {
  sleep: 'moon', nutrition: 'bottle', mood: 'face3', activity: 'shoe', growth: 'ruler', health: 'thermo',
}

function ageSuggestion(ageMonths: number): NoteKey {
  if (ageMonths < 3) return 'gn_sug_kids_0'
  if (ageMonths < 6) return 'gn_sug_kids_3'
  if (ageMonths < 12) return 'gn_sug_kids_6'
  if (ageMonths < 24) return 'gn_sug_kids_12'
  if (ageMonths < 48) return 'gn_sug_kids_24'
  return 'gn_sug_kids_48'
}

const sum = (xs: number[] | undefined) => (xs ?? []).reduce((a, b) => a + b, 0)

export function buildKidsNote(input: KidsNoteInput, t: Translate): GrandmaLetter {
  const { analytics: a, childName: child, ageMonths } = input

  if (!a || !a.totalLogs) {
    return {
      intro: t('gn_intro_kids_start', { child }),
      notes: [{ id: 'start', sticker: 'pencil', title: t('gn_empty_title'), body: t('gn_empty_kids_body', { child }) }],
      suggestion: { text: t('gn_sug_kids_log', { child }) },
    }
  }

  // Ordering from the existing neutral read: trend pillar, then the pillar the
  // scores flag as lowest, then the highest. Each earns a bonus weight.
  const hl = buildInsightHighlights(a.scores, a, child, ageMonths, null, { neutral: true })
  const bonus: Partial<Record<PillarKey, number>> = {}
  if (hl.trend) bonus[hl.trend.pillar] = (bonus[hl.trend.pillar] ?? 0) + 3
  if (hl.concern) bonus[hl.concern.pillar] = (bonus[hl.concern.pillar] ?? 0) + 2
  if (hl.strength) bonus[hl.strength.pillar] = (bonus[hl.strength.pillar] ?? 0) + 1
  const trendOf = (k: PillarKey) => (hl.trend?.pillar === k ? hl.trend.direction : null)

  const c: NoteCandidate[] = []

  if (a.sleep?.hasData && a.sleep.avgHours > 0) {
    const dir = trendOf('sleep')
    const key: NoteKey = dir === 'improving' ? 'gn_kids_sleep_up_body' : dir === 'declining' ? 'gn_kids_sleep_down_body' : 'gn_kids_sleep_body'
    c.push({ id: 'sleep', area: 'sleep', sticker: STICKER.sleep, weight: 3 + (bonus.sleep ?? 0), title: t('gn_kids_sleep_title'), body: t(key, { child, hours: fmt1(a.sleep.avgHours) }) })
  }

  const n = a.nutrition
  if (n?.hasData) {
    const total = sum(n.mealFrequency)
    if (total > 0) {
      if (n.mode === 'milk') {
        c.push({ id: 'food', area: 'nutrition', sticker: 'bottle', weight: 2.5 + (bonus.nutrition ?? 0), title: t('gn_kids_feeds_title'), body: t(total === 1 ? 'gn_kids_feeds_body_one' : 'gn_kids_feeds_body_other', { count: total }) })
      } else {
        const good = sum(n.eatQuality?.good)
        const pct = Math.round((good / total) * 100)
        c.push({
          id: 'food', area: 'nutrition', sticker: 'banana', weight: 2.5 + (bonus.nutrition ?? 0), title: t('gn_kids_meals_title'),
          body: pct > 0
            ? t(total === 1 ? 'gn_kids_meals_pct_one' : 'gn_kids_meals_pct_other', { count: total, pct })
            : t(total === 1 ? 'gn_kids_meals_body_one' : 'gn_kids_meals_body_other', { count: total }),
        })
      }
    }
  }

  const moodTotal = (a.mood?.dominantMoods ?? []).reduce((x, m) => x + m.count, 0)
  if (a.mood?.hasData && moodTotal > 0) {
    c.push({ id: 'mood', area: 'mood', sticker: STICKER.mood, weight: 2 + (bonus.mood ?? 0), title: t('gn_kids_mood_title'), body: t(moodTotal === 1 ? 'gn_kids_mood_body_one' : 'gn_kids_mood_body_other', { child, count: moodTotal }) })
  }

  if (a.activity?.hasData && a.activity.activeDays > 0) {
    c.push({ id: 'activity', area: 'activity', sticker: STICKER.activity, weight: 2 + (bonus.activity ?? 0), title: t('gn_kids_active_title'), body: t('gn_kids_active_body', { child, days: a.activity.activeDays, total: a.activity.dailySessions.length || 7 }) })
  }

  const concerns = a.health?.concernEvents ?? 0
  if (concerns > 0) {
    c.push({ id: 'health', area: 'health', sticker: STICKER.health, weight: 9, title: t('gn_kids_health_title'), body: t(concerns === 1 ? 'gn_kids_health_body_one' : 'gn_kids_health_body_other', { count: concerns }) })
  }

  const g = a.growth
  if (g?.hasData) {
    const lastW = g.weights[g.weights.length - 1]
    const lastH = g.heights[g.heights.length - 1]
    if (lastW) c.push({ id: 'growth', area: 'growth', sticker: STICKER.growth, weight: 1.5 + (bonus.growth ?? 0), title: t('gn_kids_growth_title'), body: t('gn_kids_growth_weight_body', { kg: fmt1(lastW.value) }) })
    else if (lastH) c.push({ id: 'growth', area: 'growth', sticker: STICKER.growth, weight: 1.5 + (bonus.growth ?? 0), title: t('gn_kids_growth_title'), body: t('gn_kids_growth_height_body', { cm: fmt1(lastH.value) }) })
  }

  const diaperDays = (a.diaper?.dailyCounts ?? []).filter((x) => x > 0)
  if (diaperDays.length > 0) {
    c.push({ id: 'diaper', sticker: 'diaper', weight: 1.5, title: t('gn_kids_diaper_title'), body: t('gn_kids_diaper_body', { avg: fmt1(sum(diaperDays) / diaperDays.length) }) })
  }

  const notes = pickTop(c)
  if (notes.length === 0) {
    return {
      intro: t('gn_intro_kids_start', { child }),
      notes: [{ id: 'start', sticker: 'pencil', title: t('gn_empty_title'), body: t('gn_empty_kids_body', { child }) }],
      suggestion: { text: t('gn_sug_kids_log', { child }) },
    }
  }

  return {
    intro: notes.length >= 2 ? t('gn_intro_kids_noticed', { child }) : t('gn_intro_quiet'),
    notes,
    suggestion: { text: t(ageSuggestion(ageMonths), { child }) },
  }
}
