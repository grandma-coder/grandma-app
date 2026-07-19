import { render, fireEvent } from '@testing-library/react-native'
import { ShareCardsEditor } from '../ShareCardsEditor'

describe('ShareCardsEditor', () => {
  it('renders a toggle row per card for the behavior', () => {
    const { getByText } = render(
      <ShareCardsEditor behavior="kids" role="nanny"
        value={{ view: true, log_activity: true, chat: false }} onChange={() => {}} />,
    )
    expect(getByText(/Daily stats/)).toBeTruthy()
    expect(getByText(/Diaper tracker/)).toBeTruthy()
  })

  it('toggling a card writes _shared_cards for the behavior', () => {
    const onChange = jest.fn()
    const { getByText } = render(
      <ShareCardsEditor behavior="kids" role="nanny"
        value={{ view: true, log_activity: true, chat: false, _shared_cards: { kids: ['hero-tiles'] } }}
        onChange={onChange} />,
    )
    fireEvent.press(getByText(/Diaper tracker/))
    const next = onChange.mock.calls[0][0]
    expect(next._shared_cards.kids).toContain('diaper')
  })

  it('flags intimate cycle cards as sensitive', () => {
    const { getByText } = render(
      <ShareCardsEditor behavior="cycle" role="family"
        value={{ view: true, log_activity: false, chat: false }} onChange={() => {}} />,
    )
    expect(getByText(/sensitive/i)).toBeTruthy()
  })
})
