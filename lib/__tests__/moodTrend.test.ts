import { cycleMoodToStrip, pregMoodToStrip } from '../moodTrend'

describe('moodTrend mappers', () => {
  it('cycleMoodToStrip renames mood→value, keeps date', () => {
    expect(cycleMoodToStrip([{ date: '2026-07-01', mood: 'good' }]))
      .toEqual([{ date: '2026-07-01', value: 'good' }])
  })
  it('cycleMoodToStrip passes null mood through', () => {
    expect(cycleMoodToStrip([{ date: '2026-07-02', mood: null }]))
      .toEqual([{ date: '2026-07-02', value: null }])
  })
  it('pregMoodToStrip renames log_date→date', () => {
    expect(pregMoodToStrip([{ log_date: '2026-07-03', value: 'okay' }]))
      .toEqual([{ date: '2026-07-03', value: 'okay' }])
  })
  it('both return empty array for empty input', () => {
    expect(cycleMoodToStrip([])).toEqual([])
    expect(pregMoodToStrip([])).toEqual([])
  })
})
