import { resolveSymptomId } from '../cycleSymptoms'

describe('resolveSymptomId', () => {
  it('resolves raw ids (what SymptomsForm saves)', () => {
    expect(resolveSymptomId('cravings')).toBe('cravings')
    expect(resolveSymptomId('back-pain')).toBe('back-pain')
    expect(resolveSymptomId('tender-breasts')).toBe('tender-breasts')
  })

  it('resolves canonical labels (symptomLabel output)', () => {
    expect(resolveSymptomId('Cramps')).toBe('cramps')
    expect(resolveSymptomId('Back pain')).toBe('back-pain')
    expect(resolveSymptomId('Tender')).toBe('tender-breasts')
  })

  it('resolves legacy/seed display labels (devSeed values)', () => {
    // devSeed writes 'Bloating' / 'Breast tenderness' which match neither id nor canonical label
    expect(resolveSymptomId('Bloating')).toBe('bloated')
    expect(resolveSymptomId('Breast tenderness')).toBe('tender-breasts')
    expect(resolveSymptomId('Headache')).toBe('headache')
    expect(resolveSymptomId('Cravings')).toBe('cravings')
    expect(resolveSymptomId('Fatigue')).toBe('fatigue')
  })

  it('is tolerant of case / spaces / hyphens', () => {
    expect(resolveSymptomId('BACK PAIN')).toBe('back-pain')
    expect(resolveSymptomId('backpain')).toBe('back-pain')
    expect(resolveSymptomId('low mood')).toBe('low-mood')
  })

  it('returns null for a genuine free-text Other symptom', () => {
    expect(resolveSymptomId('dizziness')).toBeNull()
    expect(resolveSymptomId('random custom thing')).toBeNull()
    expect(resolveSymptomId('')).toBeNull()
  })
})
