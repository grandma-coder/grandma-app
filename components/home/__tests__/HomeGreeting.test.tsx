import { render } from '@testing-library/react-native'
import { Text } from 'react-native'
import { HomeGreeting } from '../HomeGreeting'

describe('HomeGreeting', () => {
  it('renders the greeting name', () => {
    const { queryByText } = render(<HomeGreeting name="Ada" showLogo={false} />)
    expect(queryByText('Ada')).toBeTruthy()
  })

  it('renders a trailing slot when provided', () => {
    const { queryByText } = render(
      <HomeGreeting name="Ada" showLogo={false} trailing={<Text>TRAIL</Text>} />
    )
    expect(queryByText('TRAIL')).toBeTruthy()
  })
})
