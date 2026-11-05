import { pregnancyLogSummary, pregnancyLogDisplay, type PregSummaryDeps } from '../pregnancyLogSummary'

const dict: Record<string, string> = {
  kp_u_hours: 'horas', kp_u_hour: 'hora', kp_u_min: 'min', kp_u_sec: 's', kp_u_sets: 'séries', kp_u_set: 'série',
  preg_unit_kicks_one: 'chute', preg_unit_kicks_other: 'chutes',
  preg_unit_glasses_one: 'copo', preg_unit_glasses_other: 'copos',
  preg_sum_vitaminsTaken: 'Tomadas', preg_sum_vitaminsNotTaken: 'Não tomadas',
}
const labels: Record<string, string> = { 'Back pain': 'Dor nas costas', Nausea: 'Enjoo', Yoga: 'Ioga', Iron: 'Ferro' }
const deps = (weightUnit: 'kg' | 'lb' = 'kg'): PregSummaryDeps => ({
  t: (k) => dict[k] ?? k,
  weightUnit,
  moodLabel: (id) => ({ happy: 'Feliz', anxious: 'Ansiosa' } as Record<string, string>)[id],
  optionLabel: (id) => labels[id] ?? id,
})
const S = (log_type: string, value: string | null, notes: string | null = null, w: 'kg' | 'lb' = 'kg') =>
  pregnancyLogSummary({ log_type, value, notes }, deps(w))

describe('pregnancyLogSummary', () => {
  it('localizes counts with plurals', () => {
    expect(S('kick_count', '3')).toBe('3 chutes')
    expect(S('kick_count', '1')).toBe('1 chute')
    expect(S('water', '6')).toBe('6 copos')
    expect(S('kegel', '1')).toBe('1 série')
  })
  it('weight honours the unit and shows it', () => {
    expect(S('weight', '70.00')).toBe('70.0 kg')
    expect(S('weight', '70.00', null, 'lb')).toBe('154.3 lb')
  })
  it('maps ids to labels, never English ids', () => {
    expect(S('mood', 'happy')).toBe('Feliz')
    expect(S('mood', '{"mood":"anxious"}')).toBe('Ansiosa')
    expect(S('mood', 'unknownid')).toBe('')
    expect(S('symptom', 'Back pain, Nausea')).toBe('Dor nas costas, Enjoo')
    expect(S('nutrition', 'Iron')).toBe('Ferro')
    expect(S('exercise', '30', '{"type":"Yoga"}')).toBe('Ioga · 30 min')
    expect(S('vitamins', '1')).toBe('Tomadas')
    expect(S('vitamins', '0')).toBe('Não tomadas')
  })
  it('never leaks raw JSON', () => {
    expect(S('exam_result', '{"foo":{"a":1}}')).not.toContain('{')
    expect(S('nesting', '1', '{"title":"Nursery","category":"x"}')).toBe('Nursery')
  })
  it('exposes metric + unit for the popup', () => {
    expect(pregnancyLogDisplay({ log_type: 'sleep', value: '7.5' }, deps())).toMatchObject({ metric: '7.5', unit: 'horas', isText: false })
  })
})
