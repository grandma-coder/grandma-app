import { computePMSStats, type CycleLogRow, type CycleHistory } from '../cycleAnalytics'

// ─── Fixtures ───────────────────────────────────────────────────────────────
// 3 closed 28-day cycles (period Jan 1, Jan 29, Feb 26) so every symptom log
// below lands inside a known, closed cycle. lengthDays 28 everywhere.
const history: CycleHistory = {
  cycles: [
    { startDate: '2026-01-01', endDate: '2026-01-28', lengthDays: 28 },
    { startDate: '2026-01-29', endDate: '2026-02-25', lengthDays: 28 },
    { startDate: '2026-02-26', endDate: null, lengthDays: null }, // open cycle
  ],
  avg: 28,
  min: 28,
  max: 28,
}

function symptomLog(id: string, date: string, value: string): CycleLogRow {
  return {
    id,
    user_id: 'u1',
    date,
    type: 'symptom',
    value,
    notes: null,
    created_at: `${date}T00:00:00Z`,
  }
}

describe('computePMSStats — phase tagging', () => {
  it('tags a symptom on cycle day 25 of a 28-day cycle as luteal', () => {
    // cycle 1 starts 2026-01-01. day 25 → 2026-01-25 (25 = daysBetween + 1 → daysBetween = 24)
    const logs = [symptomLog('1', '2026-01-25', 'bloating')]
    const stats = computePMSStats(logs, history)
    const bloating = stats.topSymptoms.find((s) => s.name === 'bloating')
    expect(bloating).toBeDefined()
    expect(bloating!.phaseCounts.luteal).toBe(1)
    expect(bloating!.dominantPhase).toBe('luteal')
  })

  it('tags a symptom on cycle day 2 as menstruation', () => {
    const logs = [symptomLog('1', '2026-01-02', 'cramps')]
    const stats = computePMSStats(logs, history)
    const cramps = stats.topSymptoms.find((s) => s.name === 'cramps')
    expect(cramps!.phaseCounts.menstruation).toBe(1)
    expect(cramps!.dominantPhase).toBe('menstruation')
  })

  it('tags a symptom on cycle day 13 of 28 (ovulationDay=14) per the exact boundary rule', () => {
    // ovulationDay = 28 - 14 = 14. Boundary: cycleDay <= ovulationDay + 1 (15) AND
    // NOT < ovulationDay - 1 (13). 13 is NOT < 13, so it falls through to the
    // ovulation branch (cycleDay <= ovulationDay + 1 → 13 <= 15 → true).
    const logs = [symptomLog('1', '2026-01-13', 'headache')]
    const stats = computePMSStats(logs, history)
    const headache = stats.topSymptoms.find((s) => s.name === 'headache')
    expect(headache!.phaseCounts.ovulation).toBe(1)
    expect(headache!.dominantPhase).toBe('ovulation')
  })

  it('tags a symptom on cycle day 12 of 28 as follicular (one day before the ovulation boundary)', () => {
    const logs = [symptomLog('1', '2026-01-12', 'headache')]
    const stats = computePMSStats(logs, history)
    const headache = stats.topSymptoms.find((s) => s.name === 'headache')
    expect(headache!.phaseCounts.follicular).toBe(1)
    expect(headache!.dominantPhase).toBe('follicular')
  })

  it('dominantPhase picks the phase with the most occurrences', () => {
    const logs = [
      symptomLog('1', '2026-01-25', 'bloating'), // cycle 1, luteal
      symptomLog('2', '2026-02-22', 'bloating'), // cycle 2 day 25, luteal
      symptomLog('3', '2026-01-02', 'bloating'), // cycle 1, menstruation
    ]
    const stats = computePMSStats(logs, history)
    const bloating = stats.topSymptoms.find((s) => s.name === 'bloating')
    expect(bloating!.count).toBe(3)
    expect(bloating!.phaseCounts.luteal).toBe(2)
    expect(bloating!.phaseCounts.menstruation).toBe(1)
    expect(bloating!.dominantPhase).toBe('luteal')
  })

  it('computes overallDominantPhase across all symptom occurrences', () => {
    const logs = [
      symptomLog('1', '2026-01-25', 'bloating'), // luteal
      symptomLog('2', '2026-02-22', 'cramps'),   // luteal
      symptomLog('3', '2026-01-02', 'fatigue'),  // menstruation
    ]
    const stats = computePMSStats(logs, history)
    expect(stats.overallDominantPhase).toBe('luteal')
  })

  it('computes a non-null avgDaysBeforePeriod when luteal occurrences exist', () => {
    // cycle 1 (28 days) day 25 → daysBeforePeriod = 28 - 25 + 1 = 4
    const logs = [symptomLog('1', '2026-01-25', 'bloating')]
    const stats = computePMSStats(logs, history)
    expect(stats.avgDaysBeforePeriod).not.toBeNull()
    expect(stats.avgDaysBeforePeriod!.min).toBeLessThanOrEqual(stats.avgDaysBeforePeriod!.max)
    expect(stats.avgDaysBeforePeriod!.max).toBeLessThanOrEqual(28)
    expect(stats.avgDaysBeforePeriod!.min).toBeGreaterThanOrEqual(1)
  })

  it('returns null avgDaysBeforePeriod when there are no luteal occurrences', () => {
    const logs = [symptomLog('1', '2026-01-02', 'cramps')] // menstruation only
    const stats = computePMSStats(logs, history)
    expect(stats.avgDaysBeforePeriod).toBeNull()
  })

  it('still exposes name + count unchanged (back-compat)', () => {
    const logs = [
      symptomLog('1', '2026-01-25', 'bloating, cramps'),
      symptomLog('2', '2026-01-26', 'bloating'),
    ]
    const stats = computePMSStats(logs, history)
    const bloating = stats.topSymptoms.find((s) => s.name === 'bloating')
    const cramps = stats.topSymptoms.find((s) => s.name === 'cramps')
    expect(bloating!.count).toBe(2)
    expect(cramps!.count).toBe(1)
    expect(typeof bloating!.name).toBe('string')
  })

  it('skips phase tagging for a symptom log that falls outside any known cycle, but still counts it', () => {
    // Before the earliest cycle start (2026-01-01) — untaggable.
    const logs = [symptomLog('1', '2025-12-15', 'nausea')]
    const stats = computePMSStats(logs, history)
    const nausea = stats.topSymptoms.find((s) => s.name === 'nausea')
    expect(nausea!.count).toBe(1)
    expect(nausea!.dominantPhase).toBeNull()
    expect(nausea!.phaseCounts).toEqual({ menstruation: 0, follicular: 0, ovulation: 0, luteal: 0 })
  })

  it('tags a symptom log within the open (current) cycle using its start date', () => {
    // Open cycle starts 2026-02-26, no avg fallback needed since history.avg = 28.
    // day 3 → menstruation.
    const logs = [symptomLog('1', '2026-02-28', 'cramps')]
    const stats = computePMSStats(logs, history)
    const cramps = stats.topSymptoms.find((s) => s.name === 'cramps')
    expect(cramps!.phaseCounts.menstruation).toBe(1)
  })
})
