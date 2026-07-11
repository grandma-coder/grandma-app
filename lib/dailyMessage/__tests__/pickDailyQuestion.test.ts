import { pickDailyQuestion } from '../pickDailyQuestion'

describe('pickDailyQuestion', () => {
  it('is deterministic for the same date + user', () => {
    const a = pickDailyQuestion('2026-07-11', 'user-1', 'pregnancy')
    const b = pickDailyQuestion('2026-07-11', 'user-1', 'pregnancy')
    expect(a.id).toBe(b.id)
  })
  it('varies across days', () => {
    const days = ['2026-07-11','2026-07-12','2026-07-13','2026-07-14','2026-07-15']
      .map((d) => pickDailyQuestion(d, 'user-1', 'pregnancy').id)
    expect(new Set(days).size).toBeGreaterThan(1)
  })
  it('always returns a pregnancy question', () => {
    expect(pickDailyQuestion('2026-07-11', 'user-1', 'pregnancy').mode).toBe('pregnancy')
  })
})
