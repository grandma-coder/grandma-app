import { buildExamInsights, type Exam, type ExamExtracted } from '../examData'

/** Minimal Exam factory — only the fields buildExamInsights reads matter. */
function exam(partial: Partial<Exam> & { id: string; examDate: string }): Exam {
  return {
    userId: 'u1',
    childId: null,
    behavior: 'kids',
    title: 'Exam',
    result: null,
    notes: null,
    photos: [],
    extracted: null,
    provider: null,
    createdAt: '',
    updatedAt: '',
    ...partial,
  }
}

function extracted(partial: Partial<ExamExtracted>): ExamExtracted {
  return {
    title: null, result: null, examDate: null, provider: null,
    referenceRange: null, flagged: [], notes: null, ...partial,
  }
}

const TODAY = '2026-07-14'

describe('buildExamInsights', () => {
  test('empty set → zeros and null dates', () => {
    const r = buildExamInsights([], TODAY)
    expect(r.total).toBe(0)
    expect(r.flaggedExams).toBe(0)
    expect(r.thisYear).toBe(0)
    expect(r.providerCount).toBe(0)
    expect(r.latestDate).toBeNull()
    expect(r.earliestDate).toBeNull()
    expect(r.daysSinceLatest).toBeNull()
    expect(r.flags).toEqual([])
    expect(r.months).toEqual([])
  })

  test('counts total / flagged / this-year and distinct providers', () => {
    const r = buildExamInsights([
      exam({ id: 'a', examDate: '2026-06-12', provider: 'Dr. Lima', extracted: extracted({ flagged: [] }) }),
      exam({ id: 'b', examDate: '2026-05-13', provider: 'Dr. Cohen', extracted: extracted({ flagged: ['IgE elevated for peanut'] }) }),
      exam({ id: 'c', examDate: '2025-12-24', provider: 'Dr. Lima', extracted: extracted({ flagged: ['Vitamin D insufficient'] }) }),
    ], TODAY)
    expect(r.total).toBe(3)
    expect(r.flaggedExams).toBe(2)
    expect(r.thisYear).toBe(2) // 2026-06 and 2026-05
    expect(r.providerCount).toBe(2) // Lima, Cohen (case/space-normalized)
  })

  test('flags are aggregated newest-exam-first with exam refs', () => {
    const r = buildExamInsights([
      exam({ id: 'old', examDate: '2025-12-24', extracted: extracted({ flagged: ['low D'] }) }),
      exam({ id: 'new', examDate: '2026-05-13', title: 'Allergy panel', extracted: extracted({ flagged: ['peanut', 'egg'] }) }),
    ], TODAY)
    expect(r.flags.map((f) => f.examId)).toEqual(['new', 'new', 'old'])
    expect(r.flags[0]).toMatchObject({ examId: 'new', examTitle: 'Allergy panel', finding: 'peanut' })
  })

  test('month buckets are contiguous earliest→latest with gaps filled', () => {
    const r = buildExamInsights([
      exam({ id: 'a', examDate: '2026-03-14' }),
      exam({ id: 'b', examDate: '2026-06-12' }),
    ], TODAY)
    expect(r.months.map((m) => m.key)).toEqual(['2026-03', '2026-04', '2026-05', '2026-06'])
    expect(r.months.map((m) => m.count)).toEqual([1, 0, 0, 1])
    expect(r.months[0].label).toBe('Mar')
  })

  test('daysSinceLatest measured from the most recent exam', () => {
    const r = buildExamInsights([exam({ id: 'a', examDate: '2026-07-04' })], TODAY)
    expect(r.daysSinceLatest).toBe(10)
  })
})
