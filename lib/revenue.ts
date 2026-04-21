import Purchases, { PurchasesPackage, CustomerInfo } from 'react-native-purchases'

const API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY!

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
  Purchases.configure({
    apiKey: API_KEY,
    appUserID: userId ?? undefined,
  })
}

export async function getOfferings(): Promise<PurchasesPackage[]> {
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
  const { customerInfo } = await Purchases.purchasePackage(pkg)
  return customerInfo
}

export async function restorePurchases(): Promise<CustomerInfo> {
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
  const customerInfo = await Purchases.getCustomerInfo()
  return detectTier(customerInfo) !== 'free'
}

export async function getCurrentTier(): Promise<SubscriptionTier> {
  const customerInfo = await Purchases.getCustomerInfo()
  return detectTier(customerInfo)
}
