import { pickDailyQuestion } from '../pickDailyQuestion'
import { getQuestionsForMode } from '../index'

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
  it('throws a descriptive error for modes with an empty question bank', () => {
    expect(() => pickDailyQuestion('2026-07-11', 'user-1', 'kids')).toThrow(
      'pickDailyQuestion: no questions for mode "kids"'
    )
  })
})

describe('pickDailyQuestion rotation', () => {
  const days = (start: string, n: number) => {
    const [y, m, d] = start.split('-').map(Number)
    return Array.from({ length: n }, (_, i) => {
      const dt = new Date(Date.UTC(y, m - 1, d + i))
      return dt.toISOString().slice(0, 10)
    })
  }

  it.each(['pregnancy', 'pre-pregnancy'] as const)('%s: never repeats until the whole bank has been seen', (mode) => {
    const first = pickDailyQuestion('2026-01-01', 'user-1', mode)
    const n = getQuestionsForMode(mode).length
    const ids = days('2026-01-01', n).map((d) => pickDailyQuestion(d, 'user-1', mode).id)
    expect(new Set(ids).size).toBe(n)
    expect(ids[0]).toBe(first.id)
  })

  it('different users get different orders', () => {
    const a = days('2026-03-01', 7).map((d) => pickDailyQuestion(d, 'user-a', 'pregnancy').id)
    const b = days('2026-03-01', 7).map((d) => pickDailyQuestion(d, 'user-b', 'pregnancy').id)
    expect(a).not.toEqual(b)
  })

  it('depends only on the local date string, not the device timezone', () => {
    const before = process.env.TZ
    const ids: string[] = []
    for (const tz of ['UTC', 'America/Sao_Paulo', 'Asia/Tokyo', 'Pacific/Kiritimati']) {
      process.env.TZ = tz
      ids.push(pickDailyQuestion('2026-11-04', 'user-1', 'pre-pregnancy').id)
    }
    process.env.TZ = before
    expect(new Set(ids).size).toBe(1)
  })

  it('returns the canonical (English-bank) question for every language', () => {
    for (const lang of ['en', 'pt-BR', 'ja'] as const) {
      const q = pickDailyQuestion('2026-11-04', 'user-1', 'pregnancy', lang)
      expect(getQuestionsForMode('pregnancy').some((b) => b.id === q.id)).toBe(true)
    }
  })
})
