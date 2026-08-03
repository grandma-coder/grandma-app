import { Text } from 'react-native'
import { render } from '@testing-library/react-native'
import { KidsPillarBands, type PillarBandItem } from '../KidsPillarBands'
import type { PillarScore } from '../../../lib/analyticsData'

// Task 11: rows whose pillar score has thin backing data (confidence < 0.4)
// should read as provisional — a "low data" marker appended to the takeaway
// plus a dimmed number — instead of a bold, authoritative score.
// Presentational component — no store/provider setup needed,
// `useDiffuseTheme()` reads straight from useThemeStore (zustand) + useColorScheme.
function makeScore(overrides: Partial<PillarScore>): PillarScore {
  return { value: 7, label: 'good', trend: 0, hasData: true, confidence: 1, ...overrides }
}

const icon = () => <Text>icon</Text>

describe('KidsPillarBands', () => {
  it('shows a low data marker + dims the number for a low-confidence row, not a high-confidence one', () => {
    const items: PillarBandItem[] = [
      {
        key: 'sleep',
        label: 'Sleep',
        color: '#000',
        softColor: '#EEEEEE',
        score: makeScore({ value: 4, confidence: 0.2 }),
        takeaway: 'A bit restless lately',
        icon,
      },
      {
        key: 'nutrition',
        label: 'Nutrition',
        color: '#000',
        softColor: '#EEEEEE',
        score: makeScore({ value: 8, confidence: 0.9 }),
        takeaway: 'Eating well',
        icon,
      },
    ]

    const { getByText, queryByText } = render(
      <KidsPillarBands items={items} onPillarPress={() => {}} />
    )

    expect(getByText(/low data/)).toBeTruthy()
    expect(getByText('Eating well')).toBeTruthy()
    expect(queryByText(/Eating well.*low data/)).toBeNull()
  })

  // Health is a REFERENCE row (no `/10` grade — vaccines-on-record + concern
  // flags instead). It must never win the worst-first sort even when its own
  // score would otherwise put it on top, and it must show `statusText`
  // instead of a numeric value.
  it('pins a reference row last regardless of score, showing statusText instead of a number', () => {
    const items: PillarBandItem[] = [
      {
        key: 'health',
        label: 'Health',
        color: '#000',
        softColor: '#EEEEEE',
        // Highest score in the list — would sort FIRST under plain
        // worst-first ordering if the `reference` pin didn't override it.
        score: makeScore({ value: 9, confidence: 1 }),
        reference: true,
        statusText: 'All clear',
        icon,
      },
      {
        key: 'sleep',
        label: 'Sleep',
        color: '#000',
        softColor: '#EEEEEE',
        score: makeScore({ value: 3, confidence: 1 }),
        takeaway: 'Needs attention',
        icon,
      },
    ]

    const { getByText, queryByText, getAllByRole } = render(
      <KidsPillarBands items={items} onPillarPress={() => {}} />
    )

    expect(getByText('All clear')).toBeTruthy()
    expect(queryByText('9.0')).toBeNull()

    // Sleep (the only scored row) is the top/focus row despite being added
    // second — Health's higher score must not displace it from the top.
    const rows = getAllByRole('button')
    expect(rows[0].props.accessibilityLabel).toMatch(/^Sleep/)
    expect(rows[1].props.accessibilityLabel).toMatch(/^Health/)
  })
})
