import { deriveExamInsights } from '../examData'
import type { Exam } from '../examData'

function exam(id: string, flagged: string[] = []): Exam {
  return {
    id, userId: 'u', childId: 'c', behavior: 'kids', title: `Exam ${id}`,
    result: null, notes: null, examDate: `2026-07-${id.padStart(2, '0')}`, photos: [],
    extracted: flagged.length ? { title: null, result: null, examDate: null, provider: null, referenceRange: null, flagged, notes: null } : null,
    provider: null, createdAt: '', updatedAt: '',
  }
}

describe('deriveExamInsights', () => {
  it('takes the first N as recent (input is already date-desc)', () => {
    const out = deriveExamInsights([exam('05'), exam('04'), exam('03'), exam('02')], 3)
    expect(out.recent.map((e) => e.id)).toEqual(['05', '04', '03'])
  })

  it('collects only exams with flagged findings', () => {
    const out = deriveExamInsights([exam('05', ['High WBC']), exam('04'), exam('03', ['Low iron'])])
    expect(out.flagged.map((e) => e.id)).toEqual(['05', '03'])
  })

  it('handles empty input without throwing', () => {
    const out = deriveExamInsights([])
    expect(out).toEqual({ recent: [], flagged: [] })
  })
})
