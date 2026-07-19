import { render } from '@testing-library/react-native'
import { EssentialsWalletCard } from '../EssentialsWalletCard'
import { useChildStore } from '../../../store/useChildStore'

// The card sources everything from the PHI-masked active child in the store.
// A caregiver with `emergency` sees populated fields; a masked (non-emergency)
// caregiver's child arrives with empty allergies + null pediatrician, so the
// card degrades to just the name — no PHI leak is representable.
function seedChild(overrides: Record<string, unknown> = {}) {
  useChildStore.setState({
    activeChild: {
      id: 'c1',
      parentId: 'u1',
      name: 'Rio',
      birthDate: '2022-01-01',
      weightKg: 12,
      heightCm: 80,
      sex: 'f',
      bloodType: 'O+',
      allergies: ['peanuts'],
      medications: [],
      conditions: [],
      dietaryRestrictions: [],
      preferredFoods: [],
      dislikedFoods: [],
      pediatrician: { name: 'Dr. Sofia', phone: '119', clinic: 'Clinic A' },
      notes: '',
      countryCode: 'BR',
      photoUrl: null,
      caregiverRole: 'nanny',
      permissions: { view: true, log_activity: false, chat: false },
      ...overrides,
    } as never,
  })
}

afterEach(() => {
  useChildStore.setState({ activeChild: null, children: [] })
})

describe('EssentialsWalletCard', () => {
  it('lite form shows allergies + pediatrician from the masked active child', () => {
    seedChild()
    const { queryByText } = render(<EssentialsWalletCard childId="c1" ownerUserId="u1" showFull={false} />)
    expect(queryByText(/peanuts/)).toBeTruthy()
    expect(queryByText(/Dr\. Sofia/)).toBeTruthy()
    // No insurance source exists any more — the row is gone entirely.
    expect(queryByText(/Unimed/)).toBeNull()
    // Full-only fields stay hidden in the lite form.
    expect(queryByText(/Blood type/)).toBeNull()
  })

  it('a masked child (empty allergies, null pediatrician) renders just the name — no PHI leaks', () => {
    // Simulates the RPC masking PHI for a non-emergency caregiver.
    seedChild({
      allergies: [],
      pediatrician: null,
      bloodType: '',
      conditions: [],
      medications: [],
    })
    const { queryByText } = render(<EssentialsWalletCard childId="c1" ownerUserId="u1" showFull={true} />)
    expect(queryByText(/RIO'S CARD/)).toBeTruthy()
    expect(queryByText(/peanuts/)).toBeNull()
    expect(queryByText(/Dr\. Sofia/)).toBeNull()
    expect(queryByText(/Blood type/)).toBeNull()
    expect(queryByText(/Unimed/)).toBeNull()
    expect(queryByText(/Ana/)).toBeNull()
  })
})
