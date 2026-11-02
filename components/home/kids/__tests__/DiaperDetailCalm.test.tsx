import { render } from '@testing-library/react-native'
import { DiaperDetailCalm, type DiaperDetailCalmProps } from '../DiaperDetailCalm'

const base: DiaperDetailCalmProps = { count: 0, pee: 0, poop: 0, mixed: 0, diaperByDay: {}, diaperColors: {}, rangeDays: 7 }
const r = (p: Partial<DiaperDetailCalmProps>) => render(<DiaperDetailCalm {...base} {...p} />)

describe('diaper detail — every case says something true and clear', () => {
  it('nothing logged → empty state', () => {
    const v = r({})
    expect(v.getByTestId('diaper-empty')).toBeTruthy()
    expect(v.getByText('No diapers yet')).toBeTruthy()
    expect(v.queryByTestId('diaper-hero')).toBeNull()
  })

  it('typical week → per-day hero, three stats with share, daily strip, colours', () => {
    const v = r({
      count: 28, pee: 14, poop: 7, mixed: 7, rangeDays: 7,
      diaperByDay: { '2026-10-26': { pee: 2, poop: 1, mixed: 1 }, '2026-10-27': { pee: 2, poop: 1, mixed: 1 }, '2026-10-28': { pee: 10, poop: 5, mixed: 5 } },
      diaperColors: { yellow: 4, green: 2, brown: 1 },
    })
    expect(v.getByTestId('diaper-hero').props.children).toBe(4)
    expect(v.getByText('28 diapers')).toBeTruthy()
    expect(v.getByText('DIAPERS · PER DAY')).toBeTruthy()
    expect(v.getByText('Pee · 50%')).toBeTruthy()
    expect(v.getByText('Poop · 25%')).toBeTruthy()
    expect(v.getByText('Mixed · 25%')).toBeTruthy()
    expect(v.getByTestId('diaper-strip')).toBeTruthy()
    expect(v.getByTestId('diaper-colors')).toBeTruthy()
    expect(v.getByText('Yellow')).toBeTruthy()
    expect(v.getByText('Stool Color · 7 logged')).toBeTruthy()
  })

  it('only pee → one stat, no poop/mixed, no strip, no colours', () => {
    const v = r({ count: 6, pee: 6, diaperByDay: { '2026-10-28': { pee: 6, poop: 0, mixed: 0 } } })
    expect(v.getByTestId('diaper-stat-pee')).toBeTruthy()
    expect(v.queryByTestId('diaper-stat-poop')).toBeNull()
    expect(v.queryByTestId('diaper-stat-mixed')).toBeNull()
    expect(v.getByText('Pee · 100%')).toBeTruthy()
    expect(v.queryByTestId('diaper-strip')).toBeNull()
    expect(v.queryByTestId('diaper-colors')).toBeNull()
  })

  it('one-day range → plain count, no "per day", no "n diapers" echo', () => {
    const v = r({ rangeDays: 1, count: 5, pee: 3, poop: 2 })
    expect(v.getByText('DIAPERS')).toBeTruthy()
    expect(v.getByTestId('diaper-hero').props.children).toBe(5)
    expect(v.queryByText(/per day/i)).toBeNull()
    expect(v.queryByText('5 diapers')).toBeNull()
  })

  it('a single diaper over several days reads "1 diaper"', () => {
    const v = r({ count: 1, pee: 1 })
    expect(v.getByText('1 diaper')).toBeTruthy()
    expect(v.getByTestId('diaper-hero').props.children).toBe(0.1)
  })

  it('long history → weekly buckets instead of 30 skinny bars', () => {
    const by: Record<string, { pee: number; poop: number; mixed: number }> = {}
    for (let d = 1; d <= 28; d++) by[`2026-10-${String(d).padStart(2, '0')}`] = { pee: 1, poop: 0, mixed: 0 }
    const v = r({ rangeDays: 28, count: 28, pee: 28, diaperByDay: by })
    expect(v.getByText('W1')).toBeTruthy()
    expect(v.getByText('W4')).toBeTruthy()
    expect(v.queryByText('W5')).toBeNull()
  })

  it('unknown colour still shows, capitalised', () => {
    const v = r({ count: 2, poop: 2, diaperColors: { teal: 2 } })
    expect(v.getByText('Teal')).toBeTruthy()
  })
})
