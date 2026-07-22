import { render, fireEvent } from '@testing-library/react-native'
import { Text } from 'react-native'
import { QuickLogPickerGrid, type QuickLogGridItem } from '../QuickLogPickerGrid'

function makeItems(overrides: Partial<QuickLogGridItem>[] = []): QuickLogGridItem[] {
  const base: QuickLogGridItem[] = [
    { key: 'a', label: 'Mood', icon: <Text>IA</Text>, socketTint: '#eee', selected: true, onToggle: () => {} },
    { key: 'b', label: 'Water', icon: <Text>IB</Text>, socketTint: '#eee', selected: false, onToggle: () => {} },
  ]
  return base.map((it, i) => ({ ...it, ...(overrides[i] ?? {}) }))
}

describe('QuickLogPickerGrid', () => {
  it('renders a tile per item (label + icon)', () => {
    const { queryByText } = render(<QuickLogPickerGrid items={makeItems()} />)
    expect(queryByText('Mood')).toBeTruthy()
    expect(queryByText('Water')).toBeTruthy()
    expect(queryByText('IA')).toBeTruthy()
  })

  it('fires onToggle when a tile is pressed', () => {
    const onToggle = jest.fn()
    const items = makeItems([{ onToggle }])
    const { getByText } = render(<QuickLogPickerGrid items={items} />)
    fireEvent.press(getByText('Mood'))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('renders all items for a long list (15)', () => {
    const many: QuickLogGridItem[] = Array.from({ length: 15 }, (_, i) => ({
      key: `k${i}`, label: `Item ${i}`, icon: <Text>{`I${i}`}</Text>,
      socketTint: '#eee', selected: i % 2 === 0, onToggle: () => {},
    }))
    const { queryByText } = render(<QuickLogPickerGrid items={many} />)
    expect(queryByText('Item 0')).toBeTruthy()
    expect(queryByText('Item 14')).toBeTruthy()
  })
})
