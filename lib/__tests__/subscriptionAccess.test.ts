import { resolveAccess, type AccessInputs } from '../subscriptionAccess'

const base: AccessInputs = {
  paywallOn: true,
  isCaregiverAccount: false,
  caregiverCovered: null,
  rcActive: null,
  rcEverSubscribed: null,
  profileTier: 'free',
  profileHadBilling: false,
}

describe('resolveAccess', () => {
  it('is open for everyone while the paywall flag is off', () => {
    expect(resolveAccess({ ...base, paywallOn: false })).toBe('open')
    expect(resolveAccess({ ...base, paywallOn: false, isCaregiverAccount: true, caregiverCovered: false })).toBe('open')
  })

  it('never-subscribed parent sees the paywall', () => {
    expect(resolveAccess(base)).toBe('none')
    expect(resolveAccess({ ...base, rcActive: false, rcEverSubscribed: false })).toBe('none')
  })

  it('trial or paid entitlement in RevenueCat is active, even before the webhook lands', () => {
    expect(resolveAccess({ ...base, rcActive: true, rcEverSubscribed: true })).toBe('active')
  })

  it('premium tier written by the webhook is active when RevenueCat is unavailable', () => {
    expect(resolveAccess({ ...base, profileTier: 'premium_solo' })).toBe('active')
    expect(resolveAccess({ ...base, profileTier: 'premium_family' })).toBe('active')
  })

  it('lapsed trial or subscription is read-only (expired), never a hard lock', () => {
    expect(resolveAccess({ ...base, rcActive: false, rcEverSubscribed: true })).toBe('expired')
    expect(resolveAccess({ ...base, profileHadBilling: true })).toBe('expired')
  })

  it('caregivers are covered by the payer and never see the paywall', () => {
    expect(resolveAccess({ ...base, isCaregiverAccount: true, caregiverCovered: true })).toBe('active')
    expect(resolveAccess({ ...base, isCaregiverAccount: true, caregiverCovered: false })).toBe('expired')
    // unknown (RPC failed): don't lock a caregiver out on a network blip
    expect(resolveAccess({ ...base, isCaregiverAccount: true, caregiverCovered: null })).toBe('active')
  })
})
