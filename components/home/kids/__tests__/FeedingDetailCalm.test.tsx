import { render } from '@testing-library/react-native'
import { FeedingDetailCalm, type FeedingDetailCalmProps } from '../FeedingDetailCalm'

const base: FeedingDetailCalmProps = {
  feedingCount: 0, feedingBreast: 0, feedingBottle: 0, feedingMl: 0, avgMl: 0,
  feedingLeft: 0, feedingRight: 0, feedingBoth: 0,
  feedingTimes: [], feedingDurations: [], feedingDays: 0,
  caloriesTotal: 0, caloriesTarget: 0, categories: [], rangeDays: 7,
}
const r = (p: Partial<FeedingDetailCalmProps>) => render(<FeedingDetailCalm {...base} {...p} />)

describe('feeding detail — every case says something true and clear', () => {
  it('nothing logged → empty state, no zeros', () => {
    const v = r({})
    expect(v.getByTestId('feeding-empty')).toBeTruthy()
    expect(v.getByText('Nothing logged yet')).toBeTruthy()
    expect(v.queryByText(/MILK FEEDS/)).toBeNull()
  })

  it('breast only → no bottle stat, no split bar, says "only breastfeeding"', () => {
    const v = r({ feedingCount: 14, feedingBreast: 14, feedingLeft: 7, feedingRight: 7, feedingTimes: [6, 13], feedingDurations: [10, 20] })
    expect(v.getByTestId('feeding-hero').props.children).toBe(2)
    expect(v.queryByText('Bottle')).toBeNull()
    expect(v.queryByText('per bottle')).toBeNull()
    expect(v.getByText('Only breastfeeding in this period.')).toBeTruthy()
    expect(v.getByText('Left 50%')).toBeTruthy()
    expect(v.getByText('BREASTFEEDS · TIME OF DAY')).toBeTruthy()
  })

  it('bottle only → per-bottle ml is ml ÷ bottles, no breast-only sections', () => {
    const v = r({ feedingCount: 10, feedingBottle: 10, feedingMl: 1500, avgMl: 150 })
    expect(v.getByText('150 ml')).toBeTruthy()
    expect(v.getByText('Only bottle in this period.')).toBeTruthy()
    expect(v.queryByText('WHICH SIDE')).toBeNull()
    expect(v.queryByText('BREASTFEEDS · TIME OF DAY')).toBeNull()
    expect(v.queryByText('BREASTFEED LENGTH')).toBeNull()
  })

  it('mixed → split bar; per-bottle uses bottles, not all feeds (was 82 ml, really 165)', () => {
    const v = r({ feedingCount: 22, feedingBreast: 11, feedingBottle: 11, feedingMl: 1810, avgMl: 82, feedingBoth: 2, feedingLeft: 6, feedingRight: 3 })
    expect(v.getByText('165 ml')).toBeTruthy()
    expect(v.getByText('Breast 50%')).toBeTruthy()
    expect(v.getByText('2 feeds used both sides')).toBeTruthy()
  })

  it('solids only → per-day kcal + groups per day, no milk sections', () => {
    const v = r({ caloriesTotal: 7000, caloriesTarget: 8400, categories: [{ label: 'Fruit', cals: 700, color: '#0f0' }] })
    expect(v.getByTestId('solids-hero').props.children).toEqual(['1,000', ' kcal'])
    expect(v.getByText('of 1,200 a day')).toBeTruthy()
    expect(v.getByText('100 kcal')).toBeTruthy()
    expect(v.queryByText(/MILK FEEDS/)).toBeNull()
  })

  it('one-day range → counts, not "per day"', () => {
    const v = r({ rangeDays: 1, feedingCount: 5, feedingBreast: 5, feedingDurations: [12] })
    expect(v.getByText('MILK FEEDS')).toBeTruthy()
    expect(v.getByTestId('feeding-hero').props.children).toBe(5)
    expect(v.getByText('12 min on average')).toBeTruthy()
  })
})
