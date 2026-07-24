import { render, fireEvent } from '@testing-library/react-native'
import { ScanSourceButtons } from '../ScanSourceButtons'

// Character renders an SVG glyph; stub it so the test focuses on behavior.
jest.mock('../../characters/Characters', () => ({ Character: () => null }))

describe('ScanSourceButtons', () => {
  it('calls onPick("camera") when Take photo is pressed', () => {
    const onPick = jest.fn()
    const { getByText } = render(
      <ScanSourceButtons variant="current" accent="#B7A6E8" onPick={onPick} />,
    )
    fireEvent.press(getByText(/Take photo/i))
    expect(onPick).toHaveBeenCalledWith('camera')
  })

  it('calls onPick("library") when Gallery is pressed', () => {
    const onPick = jest.fn()
    const { getByText } = render(
      <ScanSourceButtons variant="current" accent="#B7A6E8" onPick={onPick} />,
    )
    fireEvent.press(getByText(/Gallery/i))
    expect(onPick).toHaveBeenCalledWith('library')
  })

  it('hides the source buttons and shows the reading label while scanning', () => {
    const onPick = jest.fn()
    const { queryByText, getByText } = render(
      <ScanSourceButtons variant="current" accent="#B7A6E8" scanning onPick={onPick} />,
    )
    expect(queryByText(/Take photo/i)).toBeNull()
    expect(getByText(/Reading the plate/i)).toBeTruthy()
  })

  it('renders the diffuse variant without crashing', () => {
    const { getByText } = render(
      <ScanSourceButtons variant="diffuse" accent="#B7A6E8" onPick={() => {}} />,
    )
    expect(getByText(/Take photo/i)).toBeTruthy()
  })
})
