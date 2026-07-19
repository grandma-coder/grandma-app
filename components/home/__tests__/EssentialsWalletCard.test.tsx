import { render } from '@testing-library/react-native'
import { EssentialsWalletCard } from '../EssentialsWalletCard'

jest.mock('../../../lib/childEssentials', () => ({
  useChildEssentials: () => ({
    data: {
      childName: 'Rio', photoUrl: null, allergies: ['peanuts'],
      pediatricianName: 'Dr. Sofia', pediatricianPhone: '119',
      emergencyContactName: 'Ana', emergencyContactPhone: '11999',
      insuranceProvider: 'Unimed', insuranceMemberId: 'X1', insurancePhone: '0800',
    },
    isLoading: false,
  }),
}))

describe('EssentialsWalletCard', () => {
  it('lite form shows allergies + pediatrician but hides insurance', () => {
    const { queryByText } = render(<EssentialsWalletCard childId="c1" ownerUserId="u1" showFull={false} />)
    expect(queryByText(/peanuts/)).toBeTruthy()
    expect(queryByText(/Dr\. Sofia/)).toBeTruthy()
    expect(queryByText(/Unimed/)).toBeNull()
  })

  it('full form additionally shows emergency contact + insurance', () => {
    const { queryByText } = render(<EssentialsWalletCard childId="c1" ownerUserId="u1" showFull={true} />)
    expect(queryByText(/Ana/)).toBeTruthy()
    expect(queryByText(/Unimed/)).toBeTruthy()
  })
})
