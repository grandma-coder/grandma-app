import Purchases, { PurchasesPackage, CustomerInfo } from 'react-native-purchases'

const API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? ''
/**
 * RevenueCat ships only with a production iOS public key (starts with `appl_`)
 * or Android (`goog_`). If the bundle was built with a test/sandbox key
 * (`test_…`), the SDK force-quits the app on launch in non-development builds.
 * We treat the test key as "RevenueCat disabled" so TestFlight builds can ship
 * without a paywall while we wire the real production key.
 */
const IS_VALID_KEY = API_KEY.startsWith('appl_') || API_KEY.startsWith('goog_')

export type SubscriptionTier = 'free' | 'premium_solo' | 'premium_family'
export type BillingPeriod = 'monthly' | 'annual'
export type PaywallTier = Exclude<SubscriptionTier, 'free'>

export const TIER_SEAT_LIMIT: Record<SubscriptionTier, number> = {
  free: 0,
  premium_solo: 1,
  premium_family: 4,
}

export const ENTITLEMENT_IDS: Record<PaywallTier, string> = {
  premium_solo: 'premium_solo',
  premium_family: 'premium_family',
}

// Product IDs must match the ones configured in RevenueCat
export const PRODUCT_IDS: Record<PaywallTier, Record<BillingPeriod, string>> = {
  premium_solo: {
    monthly: 'premium_solo_monthly',
    annual: 'premium_solo_annual',
  },
  premium_family: {
    monthly: 'premium_family_monthly',
    annual: 'premium_family_annual',
  },
}

export interface TieredPackage {
  package: PurchasesPackage
  tier: PaywallTier
  period: BillingPeriod
}

export async function initRevenueCat(userId?: string) {
  if (!IS_VALID_KEY) {
    // No prod key in this build — leave RevenueCat unconfigured. Paywall
    // surfaces will short-circuit; checkPremium() returns false.
    if (__DEV__) console.warn('[revenue] RevenueCat disabled: no production API key in EXPO_PUBLIC_REVENUECAT_API_KEY')
    return
  }
  Purchases.configure({
    apiKey: API_KEY,
    appUserID: userId ?? undefined,
  })
}

export async function getOfferings(): Promise<PurchasesPackage[]> {
  if (!IS_VALID_KEY) return []
  const offerings = await Purchases.getOfferings()
  if (!offerings.current) return []
  return offerings.current.availablePackages
}

export async function getTieredPackages(): Promise<TieredPackage[]> {
  const pkgs = await getOfferings()
  const result: TieredPackage[] = []
  for (const pkg of pkgs) {
    const id = pkg.product.identifier
    for (const tier of ['premium_solo', 'premium_family'] as const) {
      for (const period of ['monthly', 'annual'] as const) {
        if (PRODUCT_IDS[tier][period] === id) {
          result.push({ package: pkg, tier, period })
        }
      }
    }
  }
  return result
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  if (!IS_VALID_KEY) throw new Error('Purchases are not available in this build.')
  const { customerInfo } = await Purchases.purchasePackage(pkg)
  return customerInfo
}

export async function restorePurchases(): Promise<CustomerInfo> {
  if (!IS_VALID_KEY) throw new Error('Purchases are not available in this build.')
  return await Purchases.restorePurchases()
}

export function detectTier(customerInfo: CustomerInfo): SubscriptionTier {
  if (customerInfo.entitlements.active[ENTITLEMENT_IDS.premium_family]) return 'premium_family'
  if (customerInfo.entitlements.active[ENTITLEMENT_IDS.premium_solo]) return 'premium_solo'
  // Legacy single-entitlement support
  if (customerInfo.entitlements.active['premium']) return 'premium_solo'
  return 'free'
}

export async function checkPremium(): Promise<boolean> {
  if (!IS_VALID_KEY) return false
  const customerInfo = await Purchases.getCustomerInfo()
  return detectTier(customerInfo) !== 'free'
}

export async function getCurrentTier(): Promise<SubscriptionTier> {
  if (!IS_VALID_KEY) return 'free'
  const customerInfo = await Purchases.getCustomerInfo()
  return detectTier(customerInfo)
}
