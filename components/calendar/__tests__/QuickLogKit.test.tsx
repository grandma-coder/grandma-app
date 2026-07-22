import { render, fireEvent } from '@testing-library/react-native'
import { ChoiceStep, type ChoiceOption } from '../QuickLogKit'

const OPTS: ChoiceOption[] = [
  { id: 'pee', label: 'Pee', blob: 'diaper', color: '#9DC3E8' },
  { id: 'poop', label: 'Poop', blob: 'diaper', color: '#F5B896' },
  { id: 'both', label: 'Both', blob: 'diaper', color: '#BDD48C' },
]

describe('ChoiceStep', () => {
  it('single-select: pressing an option reports [id]', () => {
    const onChange = jest.fn()
    const { getByText } = render(<ChoiceStep options={OPTS} value={[]} onChange={onChange} />)
    fireEvent.press(getByText('Poop'))
    expect(onChange).toHaveBeenCalledWith(['poop'])
  })

  it('single-select: pressing a different option replaces the selection', () => {
    const onChange = jest.fn()
    const { getByText } = render(<ChoiceStep options={OPTS} value={['pee']} onChange={onChange} />)
    fireEvent.press(getByText('Both'))
    expect(onChange).toHaveBeenCalledWith(['both'])
  })

  it('multi-select: pressing toggles membership', () => {
    const onChange = jest.fn()
    const { getByText } = render(<ChoiceStep options={OPTS} value={['pee']} onChange={onChange} multi />)
    fireEvent.press(getByText('Poop'))
    expect(onChange).toHaveBeenCalledWith(['pee', 'poop'])
  })
})
