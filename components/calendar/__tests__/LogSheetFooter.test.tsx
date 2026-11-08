import { useState } from 'react'
import { Pressable, Text } from 'react-native'
import { render, fireEvent } from '@testing-library/react-native'
import { LogSheet, SheetFooterAction } from '../LogSheet'

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))
jest.mock('../../ui/SheetModal', () => ({
  SheetModal: ({ visible, children }: { visible: boolean; children: (dragZone: object) => React.ReactNode }) => (visible ? <>{children({})}</> : null),
}))

function Wizard() {
  const [step, setStep] = useState(1)
  return (
    <LogSheet visible title="Wizard" onClose={() => {}}>
      {step === 1 && (
        <SheetFooterAction>
          <Pressable onPress={() => setStep(2)}><Text>NEXT_1</Text></Pressable>
        </SheetFooterAction>
      )}
      {step === 2 && (
        <SheetFooterAction>
          <Text>NEXT_2</Text>
        </SheetFooterAction>
      )}
    </LogSheet>
  )
}

describe('SheetFooterAction', () => {
  it('keeps the next step footer when the step changes', () => {
    const { getByText, queryByText } = render(<Wizard />)
    fireEvent.press(getByText('NEXT_1'))
    expect(queryByText('NEXT_1')).toBeNull()
    expect(getByText('NEXT_2')).toBeTruthy()
  })
})
