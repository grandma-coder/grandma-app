import { render } from '@testing-library/react-native'
import { ActivitiesDetailCalm, type ActivitiesDetailCalmProps } from '../ActivitiesDetailCalm'

const base: ActivitiesDetailCalmProps = { activityCount: 0, activeDays: 0, rangeDays: 7, breakdown: {}, entries: [] }
const r = (p: Partial<ActivitiesDetailCalmProps>) => render(<ActivitiesDetailCalm {...base} {...p} />)
const e = (n: number, type = 'movement', date = `2026-10-${String(10 + n).padStart(2, '0')}`) => ({ id: `e${n}`, type, date, name: `Thing ${n}`, startTime: '09:30', endTime: '10:00' })

describe('activities detail — every case says something true and clear', () => {
  it('nothing logged → empty state', () => {
    const v = r({})
    expect(v.getByTestId('activities-empty')).toBeTruthy()
    expect(v.getByText('No activities yet')).toBeTruthy()
    expect(v.queryByTestId('activities-hero')).toBeNull()
  })

  it('typical week → count, days active with dots, pillar rows with share, recent list', () => {
    const v = r({
      activityCount: 10, activeDays: 4,
      breakdown: { movement: 5, creative: 3, learning: 2 },
      entries: [e(1), e(2, 'creative'), e(3, 'learning')],
    })
    expect(v.getByTestId('activities-hero').props.children).toBe(10)
    expect(v.getByText('4 of 7 days active')).toBeTruthy()
    expect(v.getByTestId('activities-dots').props.children).toHaveLength(7)
    expect(v.getByText('2.5 activities per active day')).toBeTruthy()
    expect(v.getByTestId('pillar-movement')).toBeTruthy()
    expect(v.getByText('Movement')).toBeTruthy()
    expect(v.getByText(/50%/)).toBeTruthy()
    expect(v.getByText('Thing 3')).toBeTruthy()
    expect(v.getByText('RECENT')).toBeTruthy()
  })

  it('rows are sorted by count, biggest first', () => {
    const v = r({ activityCount: 6, activeDays: 2, breakdown: { care: 1, therapy: 5 } })
    const txt = JSON.stringify(v.toJSON())
    expect(txt.indexOf('Therapy')).toBeLessThan(txt.indexOf('Care'))
  })

  it('single pillar → one row at 100%', () => {
    const v = r({ activityCount: 3, activeDays: 3, breakdown: { social: 3 } })
    expect(v.getByTestId('pillar-social')).toBeTruthy()
    expect(v.queryByTestId('pillar-movement')).toBeNull()
    expect(v.getByText(/100%/)).toBeTruthy()
  })

  it('one-day range → just the count, no days line or dots', () => {
    const v = r({ rangeDays: 1, activityCount: 2, activeDays: 1, breakdown: { movement: 2 }, entries: [e(1)] })
    expect(v.getByTestId('activities-hero').props.children).toBe(2)
    expect(v.queryByText(/days active/)).toBeNull()
    expect(v.queryByTestId('activities-dots')).toBeNull()
  })

  it('long range → no dot strip, still the days line', () => {
    const v = r({ rangeDays: 30, activityCount: 20, activeDays: 12, breakdown: { movement: 20 } })
    expect(v.getByText('12 of 30 days active')).toBeTruthy()
    expect(v.queryByTestId('activities-dots')).toBeNull()
  })

  it('recent list is capped at 5, newest first, and falls back to the pillar name', () => {
    const entries = [1, 2, 3, 4, 5, 6, 7].map((n) => e(n))
    entries.push({ id: 'x', type: 'care', date: '2026-10-30' } as any)
    const v = r({ activityCount: 8, activeDays: 8, breakdown: { movement: 7, care: 1 }, entries })
    expect(v.queryByText('Thing 1')).toBeNull()
    expect(v.queryByText('Thing 3')).toBeNull()
    expect(v.getByText('Thing 7')).toBeTruthy()
    expect(v.getAllByText('Care').length).toBeGreaterThan(1) // row label + nameless entry
  })

  it('unknown pillar id → shown as Social, never crashes', () => {
    const v = r({ activityCount: 1, activeDays: 1, breakdown: { mystery: 1 } })
    expect(v.getByText('Social')).toBeTruthy()
  })
})
