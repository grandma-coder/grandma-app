import { render } from '@testing-library/react-native'
import { SleepDetailCalm, type SleepDetailCalmProps } from '../SleepDetailCalm'

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const base: SleepDetailCalmProps = {
  sleepTotal: 0, sleepTarget: 0, dailySleepTarget: 10, sleepQuality: 'No data',
  dailySleep: [0, 0, 0, 0, 0, 0, 0], dayLabels: days, rangeDays: 7,
}
const r = (p: Partial<SleepDetailCalmProps>) => render(<SleepDetailCalm {...base} {...p} />)

describe('sleep detail — every case says something true and clear', () => {
  it('nothing logged → empty state, no zero hero', () => {
    const v = r({})
    expect(v.getByTestId('sleep-empty')).toBeTruthy()
    expect(v.getByText('No sleep yet')).toBeTruthy()
    expect(v.queryByTestId('sleep-hero')).toBeNull()
  })

  it('typical week → average per night, factual rating line (no grade), chart with target label', () => {
    const v = r({ sleepTotal: 70, sleepTarget: 70, sleepQuality: 'Solid', sleepRestful: 5, sleepRated: 7, dailySleep: [10, 9, 11, 10, 8, 10, 12] })
    expect(v.getByTestId('sleep-hero').props.children).toBe('10.0h')
    expect(v.getByText('of 10h a night')).toBeTruthy()
    expect(v.getByText('70h in total · 7 nights')).toBeTruthy()
    expect(v.getByText('Rated great or good on 5 of 7 logged sleeps.')).toBeTruthy()
    expect(v.queryByText(/support growth|pediatrician/)).toBeNull()
    expect(v.getByText('Past 7 days')).toBeTruthy()
    expect(v.getByText(/target 10h/)).toBeTruthy()
    expect(v.getByText('Mon')).toBeTruthy()
  })

  it('one-day range → last night, hero is the total, no "in total" line', () => {
    const v = r({ rangeDays: 1, sleepTotal: 9.5, sleepTarget: 10, sleepQuality: 'Great', dailySleep: [0, 0, 0, 0, 0, 0, 9.5] })
    expect(v.getByText('LAST NIGHT')).toBeTruthy()
    expect(v.getByTestId('sleep-hero').props.children).toBe('9.5h')
    expect(v.queryByText(/in total/)).toBeNull()
    expect(v.getByText('of 10h a night')).toBeTruthy()
  })

  it('a 63h entry → bar stays capped but the label tells the true number', () => {
    const v = r({ sleepTotal: 126, dailySleep: [10, 63, 10, 10, 10, 10, 10] })
    expect(v.getByText('63')).toBeTruthy()
    const bars = v.getByTestId('sleep-target-line')
    expect(bars).toBeTruthy()
    // scale never goes past 24h, so 10h bars are never squashed below 10/24 of the chart height
    expect(JSON.stringify(v.toJSON())).toContain('"height":30')
  })

  it('no per-night target → no target line, no legend', () => {
    const v = r({ sleepTotal: 70, dailySleepTarget: 0, sleepQuality: 'Solid', dailySleep: [10, 10, 10, 10, 10, 10, 10] })
    expect(v.queryByTestId('sleep-target-line')).toBeNull()
    expect(v.queryByText('came up short')).toBeNull()
    expect(v.queryByText(/^of /)).toBeNull()
  })

  it('range wider than the chart → says the bars are the latest 7 days', () => {
    const v = r({ rangeDays: 30, sleepTotal: 300, sleepQuality: 'Great', dailySleep: [10, 10, 10, 10, 10, 10, 10] })
    expect(v.getByText('SLEEP · AVG / NIGHT')).toBeTruthy()
    expect(v.getByTestId('sleep-hero').props.children).toBe('10.0h')
    expect(v.getByText(/Bars show the most recent 7 days/)).toBeTruthy()
  })

  it('unknown quality → no blurb line', () => {
    const v = r({ sleepTotal: 10, rangeDays: 1, sleepQuality: 'No data', dailySleep: [0, 0, 0, 0, 0, 0, 10] })
    expect(v.queryByTestId('sleep-quality')).toBeNull()
  })
})
