import { normalizeEssentials } from '../childEssentials'

describe('normalizeEssentials', () => {
  it('maps child + contact + insurance rows into the flat essentials shape', () => {
    const out = normalizeEssentials(
      { name: 'Rio', photo_url: null, allergies: ['peanuts'], pediatrician: { name: 'Dr. Sofia', phone: '119' } },
      { name: 'Ana', phone: '11999' },
      { provider_name: 'Unimed', member_id: 'X1', phone: '0800' },
    )
    expect(out).toEqual({
      childName: 'Rio',
      photoUrl: null,
      allergies: ['peanuts'],
      pediatricianName: 'Dr. Sofia',
      pediatricianPhone: '119',
      emergencyContactName: 'Ana',
      emergencyContactPhone: '11999',
      insuranceProvider: 'Unimed',
      insuranceMemberId: 'X1',
      insurancePhone: '0800',
    })
  })

  it('tolerates missing contact/insurance/pediatrician (nulls, no throw)', () => {
    const out = normalizeEssentials({ name: 'Rio', photo_url: null, allergies: null, pediatrician: null }, null, null)
    expect(out.pediatricianName).toBeNull()
    expect(out.emergencyContactName).toBeNull()
    expect(out.insuranceProvider).toBeNull()
    expect(out.allergies).toEqual([])
  })
})
