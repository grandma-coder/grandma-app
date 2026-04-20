import { useEffect, useState } from 'react'
import {
  View,
  Pressable,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { PurchasesPackage } from 'react-native-purchases'
import { getOfferings, purchasePackage, restorePurchases } from '../lib/revenue'
import { supabase } from '../lib/supabase'
import { useTheme } from '../constants/theme'
import { Display, MonoCaps, Body } from '../components/ui/Typography'
import { PillButton } from '../components/ui/PillButton'
import { GrandmaEye } from '../components/ui/Stickers'
import { BrandedLoader } from '../components/ui/BrandedLoader'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const FEATURES = [
  { icon: 'scan-outline' as const, text: 'Unlimited medicine & food scans' },
  { icon: 'chatbubble-ellipses-outline' as const, text: 'Unlimited Grandma conversations' },
  { icon: 'notifications-outline' as const, text: 'Vaccine reminders' },
  { icon: 'star-outline' as const, text: 'Priority responses' },
]

export default function Paywall() {
  const { colors, font, stickers, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const ink = isDark ? colors.text : '#141313'
  const inkText = isDark ? colors.bg : '#F3ECD9'
  const accent = stickers.lilac
  const accentText = isDark ? stickers.lilac : '#3A2A6E'

  const [packages, setPackages] = useState<PurchasesPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    getOfferings()
      .then((pkgs) => {
        setPackages(pkgs)
        const annualIdx = pkgs.findIndex((p) => p.packageType === 'ANNUAL')
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
    <View
      style={[
        styles.container,
        { backgroundColor: colors.bg, paddingTop: insets.top + 28, paddingBottom: insets.bottom + 16 },
      ]}
    >
      <Pressable
        onPress={() => router.back()}
        hitSlop={10}
        style={[styles.closeButton, { backgroundColor: paper, borderColor: paperBorder, top: insets.top + 12 }]}
      >
        <Ionicons name="close" size={20} color={colors.text} />
      </Pressable>

      <View style={styles.heroBlock}>
        <GrandmaEye size={88} body={stickers.yellow} accent={stickers.coral} outline={ink} />
        <Display size={28} align="center" color={colors.text} style={{ marginTop: 14 }}>
          Unlock Grandma Premium
        </Display>
        <Body size={14} align="center" color={colors.textSecondary} style={{ marginTop: 6 }}>
          7-day free trial, cancel anytime
        </Body>
      </View>

      <View style={styles.features}>
        {FEATURES.map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: accent + (isDark ? '28' : '32') }]}>
              <Ionicons name={f.icon} size={18} color={accentText} />
            </View>
            <Body size={15} color={colors.text} style={{ flex: 1, fontFamily: font.bodyMedium }}>
              {f.text}
            </Body>
          </View>
        ))}
      </View>

      {loading ? (
        <View style={{ marginTop: 24 }}>
          <BrandedLoader logoSize={72} />
        </View>
      ) : packages.length > 0 ? (
        <View style={styles.packages}>
          {packages.map((pkg, idx) => {
            const isSelected = idx === selectedIndex
            const isAnnual = pkg.packageType === 'ANNUAL'
            return (
              <Pressable
                key={pkg.identifier}
                onPress={() => setSelectedIndex(idx)}
                style={[
                  styles.packageCard,
                  {
                    backgroundColor: isSelected ? accent + (isDark ? '24' : '32') : paper,
                    borderColor: isSelected ? accentText : paperBorder,
                  },
                ]}
              >
                {isAnnual && (
                  <View style={[styles.saveBadge, { backgroundColor: ink }]}>
                    <Body size={10} color={inkText} style={{ fontFamily: font.bodySemiBold, letterSpacing: 1 }}>
                      BEST VALUE
                    </Body>
                  </View>
                )}
                <Body size={14} color={isSelected ? accentText : colors.textSecondary} style={{ fontFamily: font.bodyMedium, marginBottom: 4 }}>
                  {isAnnual ? 'Annual' : 'Monthly'}
                </Body>
                <Display size={26} align="center" color={isSelected ? colors.text : colors.textSecondary}>
                  {pkg.product.priceString}
                </Display>
                <Body size={12} color={colors.textMuted} style={{ marginTop: 2 }}>
                  {isAnnual ? '/year' : '/month'}
                </Body>
              </Pressable>
            )
          })}
        </View>
      ) : (
        <View style={styles.packages}>
          <View
            style={[
              styles.packageCard,
              { backgroundColor: accent + (isDark ? '24' : '32'), borderColor: accentText },
            ]}
          >
            <View style={[styles.saveBadge, { backgroundColor: ink }]}>
              <Body size={10} color={inkText} style={{ fontFamily: font.bodySemiBold, letterSpacing: 1 }}>
                BEST VALUE
              </Body>
            </View>
            <Body size={14} color={accentText} style={{ fontFamily: font.bodyMedium, marginBottom: 4 }}>
              Annual
            </Body>
            <Display size={26} align="center" color={colors.text}>$69.99</Display>
            <Body size={12} color={colors.textMuted} style={{ marginTop: 2 }}>
              /year
            </Body>
          </View>
          <View style={[styles.packageCard, { backgroundColor: paper, borderColor: paperBorder }]}>
            <Body size={14} color={colors.textSecondary} style={{ fontFamily: font.bodyMedium, marginBottom: 4 }}>
              Monthly
            </Body>
            <Display size={26} align="center" color={colors.textSecondary}>$9.99</Display>
            <Body size={12} color={colors.textMuted} style={{ marginTop: 2 }}>
              /month
            </Body>
          </View>
        </View>
      )}

      <PillButton
        label={purchasing ? '…' : 'Start free trial'}
        variant="ink"
        onPress={handlePurchase}
        disabled={purchasing || packages.length === 0}
      />

      <Pressable onPress={handleRestore} disabled={purchasing} style={styles.restoreButton} hitSlop={8}>
        <Body size={14} color={colors.text} style={{ fontFamily: font.bodyMedium, textDecorationLine: 'underline' }}>
          Restore purchases
        </Body>
      </Pressable>

      <Body size={11} align="center" color={colors.textMuted} style={{ marginTop: 16, lineHeight: 16, paddingHorizontal: 12 }}>
        Payment will be charged to your App Store account. Subscription auto-renews unless cancelled 24 hours before the end of the current period.
      </Body>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  closeButton: {
    position: 'absolute',
    right: 20,
    width: 38,
    height: 38,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 1,
  },
  heroBlock: { alignItems: 'center', marginTop: 32, marginBottom: 24 },
  features: { gap: 14, marginBottom: 26 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  packages: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  packageCard: {
    flex: 1,
    borderRadius: 24,
    padding: 18,
    alignItems: 'center',
    borderWidth: 2,
    minHeight: 132,
    justifyContent: 'center',
  },
  saveBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 10,
    overflow: 'hidden',
  },

  restoreButton: { alignItems: 'center', paddingVertical: 12 },
})
