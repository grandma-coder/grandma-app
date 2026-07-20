import { render, fireEvent } from '@testing-library/react-native'
import { Text } from 'react-native'
import { QuietPill } from '../QuietPill'

describe('QuietPill', () => {
  it('renders the label when provided', () => {
    const { queryByText } = render(
      <QuietPill label="See results" onPress={() => {}} accessibilityLabel="See results" />,
    )
    expect(queryByText('See results')).toBeTruthy()
  })

  it('renders icon-only (no label text) when label is omitted', () => {
    const { queryByText, getByLabelText } = render(
      <QuietPill
        leading={<Text>ICON</Text>}
        onPress={() => {}}
        accessibilityLabel="Edit"
      />,
    )
    // The glyph form shows the leading node but no pill text.
    expect(queryByText('ICON')).toBeTruthy()
    expect(getByLabelText('Edit')).toBeTruthy()
  })

  it('fires onPress when tapped', () => {
    const onPress = jest.fn()
    const { getByLabelText } = render(
      <QuietPill label="Answer" onPress={onPress} accessibilityLabel="Answer" />,
    )
    fireEvent.press(getByLabelText('Answer'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
