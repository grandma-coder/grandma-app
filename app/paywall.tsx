import { useEffect, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { PurchasesPackage } from 'react-native-purchases'
import { getOfferings, purchasePackage, restorePurchases } from '../lib/revenue'
import { supabase } from '../lib/supabase'

const FEATURES = [
  { icon: 'scan-outline', text: 'Unlimited medicine & food scans' },
  { icon: 'chatbubble-ellipses-outline', text: 'Unlimited Grandma conversations' },
  { icon: 'notifications-outline', text: 'Vaccine reminders' },
  { icon: 'star-outline', text: 'Priority responses' },
]

export default function Paywall() {
  const [packages, setPackages] = useState<PurchasesPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    getOfferings()
      .then(pkgs => {
        setPackages(pkgs)
        // Default select annual if available
        const annualIdx = pkgs.findIndex(p => p.packageType === 'ANNUAL')
        if (annualIdx >= 0) setSelectedIndex(annualIdx)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handlePurchase() {
    if (packages.length === 0) return
    setPurchasing(true)
    try {
      const customerInfo = await purchasePackage(packages[selectedIndex])
      if (customerInfo.entitlements.active['premium']) {
        // Update Supabase profile
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase
            .from('profiles')
            .update({ subscription_status: 'premium' })
            .eq('id', user.id)
        }
        Alert.alert('Welcome to Premium!', 'You now have full access to all features.', [
          { text: 'OK', onPress: () => router.back() },
        ])
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert('Error', e.message)
      }
    } finally {
      setPurchasing(false)
    }
  }

  async function handleRestore() {
    setPurchasing(true)
    try {
      const customerInfo = await restorePurchases()
      if (customerInfo.entitlements.active['premium']) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase
            .from('profiles')
            .update({ subscription_status: 'premium' })
            .eq('id', user.id)
        }
        Alert.alert('Restored!', 'Your premium access is back.', [
          { text: 'OK', onPress: () => router.back() },
        ])
      } else {
        Alert.alert('No purchases found', 'We couldn\'t find an active subscription.')
      }
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setPurchasing(false)
    }
  }

  return (
    <View style={styles.container}>
      {/* Close button */}
      <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
        <Ionicons name="close" size={24} color="#888" />
      </TouchableOpacity>

      {/* Header */}
      <Text style={styles.emoji}>👵</Text>
      <Text style={styles.title}>Unlock Grandma Premium</Text>
      <Text style={styles.subtitle}>7-day free trial, cancel anytime</Text>

      {/* Features */}
      <View style={styles.features}>
        {FEATURES.map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <Ionicons name={f.icon as any} size={20} color="#7BAE8E" />
            <Text style={styles.featureText}>{f.text}</Text>
          </View>
        ))}
      </View>

      {/* Pricing cards */}
      {loading ? (
        <ActivityIndicator size="large" color="#7BAE8E" style={{ marginTop: 24 }} />
      ) : packages.length > 0 ? (
        <View style={styles.packages}>
          {packages.map((pkg, idx) => {
            const isSelected = idx === selectedIndex
            const isAnnual = pkg.packageType === 'ANNUAL'
            return (
              <TouchableOpacity
                key={pkg.identifier}
                onPress={() => setSelectedIndex(idx)}
                style={[styles.packageCard, isSelected && styles.packageCardSelected]}
              >
                {isAnnual && <Text style={styles.saveBadge}>BEST VALUE</Text>}
                <Text style={[styles.packageTitle, isSelected && styles.packageTitleSelected]}>
                  {isAnnual ? 'Annual' : 'Monthly'}
                </Text>
                <Text style={[styles.packagePrice, isSelected && styles.packagePriceSelected]}>
                  {pkg.product.priceString}
                </Text>
                <Text style={styles.packagePeriod}>
                  {isAnnual ? '/year' : '/month'}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      ) : (
        <View style={styles.packages}>
          {/* Fallback when no offerings available (sandbox/test) */}
          <View style={[styles.packageCard, styles.packageCardSelected]}>
            <Text style={styles.saveBadge}>BEST VALUE</Text>
            <Text style={[styles.packageTitle, styles.packageTitleSelected]}>Annual</Text>
            <Text style={[styles.packagePrice, styles.packagePriceSelected]}>$69.99</Text>
            <Text style={styles.packagePeriod}>/year</Text>
          </View>
          <View style={styles.packageCard}>
            <Text style={styles.packageTitle}>Monthly</Text>
            <Text style={styles.packagePrice}>$9.99</Text>
            <Text style={styles.packagePeriod}>/month</Text>
          </View>
        </View>
      )}

      {/* CTA */}
      <TouchableOpacity
        onPress={handlePurchase}
        disabled={purchasing || packages.length === 0}
        style={[styles.ctaButton, (purchasing || packages.length === 0) && { opacity: 0.6 }]}
      >
        {purchasing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.ctaText}>Start free trial</Text>
        )}
      </TouchableOpacity>

      {/* Restore */}
      <TouchableOpacity onPress={handleRestore} disabled={purchasing} style={styles.restoreButton}>
        <Text style={styles.restoreText}>Restore purchases</Text>
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        Payment will be charged to your App Store account. Subscription auto-renews unless cancelled 24 hours before the end of the current period.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F4',
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  closeButton: {
    position: 'absolute',
    top: 56,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  emoji: { fontSize: 48, textAlign: 'center', marginBottom: 12 },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    marginBottom: 28,
  },
  features: { gap: 14, marginBottom: 28 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureText: { fontSize: 15, color: '#1A1A2E' },

  packages: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  packageCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E8E4DC',
  },
  packageCardSelected: {
    borderColor: '#7BAE8E',
    backgroundColor: '#F0F8F3',
  },
  saveBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    backgroundColor: '#7BAE8E',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  packageTitle: { fontSize: 14, fontWeight: '600', color: '#888', marginBottom: 4 },
  packageTitleSelected: { color: '#1A1A2E' },
  packagePrice: { fontSize: 24, fontWeight: '800', color: '#888' },
  packagePriceSelected: { color: '#1A1A2E' },
  packagePeriod: { fontSize: 12, color: '#aaa', marginTop: 2 },

  ctaButton: {
    backgroundColor: '#7BAE8E',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  restoreButton: { alignItems: 'center', paddingVertical: 8 },
  restoreText: { color: '#7BAE8E', fontSize: 14 },

  disclaimer: {
    fontSize: 11,
    color: '#aaa',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
  },
})
