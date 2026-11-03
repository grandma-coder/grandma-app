jest.mock('../supabase', () => ({ supabase: {} }))
import { buildMoodData, isFeverTemperature, type ChildLog } from '../analyticsData'

const log = (value: string): ChildLog => ({
  id: value, child_id: 'c', date: '2026-11-02', type: 'mood', value, notes: null, photos: [], created_at: '',
})

describe('buildMoodData', () => {
  it('reads the mood inside routine-tagged JSON instead of keying on the JSON string', () => {
    const data = buildMoodData(
      [log('happy'), log('"happy"'), log(JSON.stringify({ mood: 'happy', routineId: 'r1', routineName: 'Breakfast' }))],
      ['2026-11-02'], ['Mon'],
    )
    expect(data.dominantMoods).toEqual([{ mood: 'happy', count: 3 }])
    expect(data.dailyCounts.happy).toEqual([3])
  })

  it('skips JSON without a mood', () => {
    const data = buildMoodData([log(JSON.stringify({ routineId: 'r1' }))], ['2026-11-02'], ['Mon'])
    expect(data.dominantMoods).toEqual([])
  })
})

describe('isFeverTemperature', () => {
  it('reads °C and °F readings', () => {
    expect(isFeverTemperature('38.2')).toBe(true)
    expect(isFeverTemperature('37.4')).toBe(false)
    expect(isFeverTemperature('99.1')).toBe(false) // °F, ~37.3°C
    expect(isFeverTemperature('101.2')).toBe(true) // °F, ~38.4°C
    expect(isFeverTemperature('38,5')).toBe(true)
    expect(isFeverTemperature(null)).toBe(false)
  })
})
