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
})
