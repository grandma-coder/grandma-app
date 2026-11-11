// RevenueCat followed the Supabase account only at launch: Purchases.configure() ran again on every
// sign-in and sign-out never told RevenueCat, so the next account on the phone (same app session)
// stayed attached to the previous user's RevenueCat customer — and their entitlements.
const mockPurchases = {
  configure: jest.fn(),
  logIn: jest.fn().mockResolvedValue({ customerInfo: {}, created: false }),
  logOut: jest.fn().mockResolvedValue({}),
  isAnonymous: jest.fn().mockResolvedValue(false),
}
jest.mock('react-native-purchases', () => ({ __esModule: true, default: mockPurchases }))

describe('RevenueCat session follows the account', () => {
  const OLD_ENV = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY = 'appl_test_key'
  })
  afterAll(() => {
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY = OLD_ENV
  })

  it('configures once, then logs the next account in instead of re-configuring', async () => {
    const { initRevenueCat } = require('../revenue')
    await initRevenueCat('user-a')
    await initRevenueCat('user-b')
    expect(mockPurchases.configure).toHaveBeenCalledTimes(1)
    expect(mockPurchases.logIn).toHaveBeenCalledWith('user-b')
  })

  it('logs out of RevenueCat on sign-out when an account is identified', async () => {
    const { initRevenueCat, logOutRevenueCat } = require('../revenue')
    await initRevenueCat('user-a')
    await logOutRevenueCat()
    expect(mockPurchases.logOut).toHaveBeenCalledTimes(1)
  })

  it('does nothing on sign-out when RevenueCat was never configured or is anonymous', async () => {
    const { initRevenueCat, logOutRevenueCat } = require('../revenue')
    await logOutRevenueCat()
    expect(mockPurchases.logOut).not.toHaveBeenCalled()
    await initRevenueCat('user-a')
    mockPurchases.isAnonymous.mockResolvedValueOnce(true)
    await logOutRevenueCat()
    expect(mockPurchases.logOut).not.toHaveBeenCalled()
  })
})
