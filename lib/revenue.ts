import Purchases, { PurchasesPackage, CustomerInfo } from 'react-native-purchases'
import { Platform } from 'react-native'

const API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY!

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

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg)
  return customerInfo
}

export async function restorePurchases(): Promise<CustomerInfo> {
  return await Purchases.restorePurchases()
}

export async function checkPremium(): Promise<boolean> {
  const customerInfo = await Purchases.getCustomerInfo()
  return customerInfo.entitlements.active['premium'] !== undefined
}
