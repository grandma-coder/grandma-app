import { useEffect, useMemo, useState } from 'react'
import {
  View,
  Pressable,
  Alert,
  StyleSheet,
  ScrollView,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import {
  getTieredPackages,
  purchasePackage,
  restorePurchases,
  detectTier,
  TieredPackage,
  PaywallTier,
  BillingPeriod,
} from '../lib/revenue'
import { supabase } from '../lib/supabase'
import { useTheme } from '../constants/theme'
import { Display, Body } from '../components/ui/Typography'
import { PillButton } from '../components/ui/PillButton'
import { GrandmaLogo } from '../components/ui/GrandmaLogo'
import { BrandedLoader } from '../components/ui/BrandedLoader'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

// Fallback prices if RevenueCat hasn't loaded yet
const FALLBACK_PRICE: Record<PaywallTier, Record<BillingPeriod, string>> = {
  premium_solo: { monthly: '$9.99', annual: '$69.99' },
  premium_family: { monthly: '$14.99', annual: '$99.99' },
}

const TIER_COPY: Record<PaywallTier, {
  title: string
  seats: string
  features: Array<{ icon: keyof typeof Ionicons.glyphMap; text: string }>
  highlight: string
}> = {
  premium_solo: {
    title: 'Solo',
    seats: 'You + 1 caregiver',
    features: [
      { icon: 'people-outline', text: 'You + 1 caregiver (partner or nanny)' },
      { icon: 'scan-outline', text: 'Unlimited medicine & food scans' },
      { icon: 'chatbubble-ellipses-outline', text: 'Unlimited Grandma conversations' },
      { icon: 'notifications-outline', text: 'Vaccine reminders' },
      { icon: 'star-outline', text: 'Priority responses' },
    ],
    highlight: 'Best for single parents or first-time setup',
  },
  premium_family: {
    title: 'Family',
    seats: 'You + up to 4 caregivers',
    features: [
      { icon: 'people-outline', text: 'Up to 5 accounts with full access' },
      { icon: 'scan-outline', text: 'Unlimited scans for every caregiver' },
      { icon: 'chatbubble-ellipses-outline', text: 'Shared Grandma conversations' },
      { icon: 'notifications-outline', text: 'Synced vaccine reminders' },
      { icon: 'star-outline', text: 'Priority responses & early features' },
    ],
    highlight: 'Co-parent, grandparents, and nannies — all on one plan',
  },
}

export default function Paywall() {
  const { colors, font, stickers, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ tier?: string }>()
  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const ink = isDark ? colors.text : '#141313'
  const inkText = isDark ? colors.bg : '#F3ECD9'
  const accentText = isDark ? stickers.lilac : '#3A2A6E'
  const accentTint = isDark ? '24' : '32'

  const [tieredPackages, setTieredPackages] = useState<TieredPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)
  const [selectedTier, setSelectedTier] = useState<PaywallTier>(
    params.tier === 'premium_family' ? 'premium_family' : 'premium_solo'
  )
  const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriod | null>(null)

  useEffect(() => {
    getTieredPackages()
      .then(setTieredPackages)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const priceFor = (tier: PaywallTier, period: BillingPeriod): string => {
    const match = tieredPackages.find((p) => p.tier === tier && p.period === period)
    return match?.package.product.priceString ?? FALLBACK_PRICE[tier][period]
  }

  const tierCopy = TIER_COPY[selectedTier]

  const subtitle = useMemo(() => {
    if (selectedPeriod === null) return `Choose a plan — ${tierCopy.seats.toLowerCase()}`
    const price = priceFor(selectedTier, selectedPeriod)
    const suffix = selectedPeriod === 'annual' ? '/year' : '/month'
    return `7-day free trial, then ${price}${suffix}`
  }, [selectedPeriod, selectedTier, tieredPackages])

  const ctaLabel = useMemo(() => {
    if (purchasing) return '…'
    if (selectedPeriod === null) return 'Select a plan'
    const price = priceFor(selectedTier, selectedPeriod)
    const suffix = selectedPeriod === 'annual' ? '/year' : '/month'
    return `Start free trial · ${price}${suffix}`
  }, [purchasing, selectedPeriod, selectedTier, tieredPackages])

  const ctaDisabled = purchasing || selectedPeriod === null

  async function handlePurchase() {
    if (selectedPeriod === null) return
    const match = tieredPackages.find(
      (p) => p.tier === selectedTier && p.period === selectedPeriod
    )
    if (!match) {
      Alert.alert('Unavailable', 'This plan is not available yet. Please try again shortly.')
      return
    }
    setPurchasing(true)
    try {
      const customerInfo = await purchasePackage(match.package)
      const tier = detectTier(customerInfo)
      if (tier !== 'free') {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase
            .from('profiles')
            .update({ subscription_tier: tier, subscription_status: 'premium' })
            .eq('id', user.id)
        }
        Alert.alert('Welcome to Premium!', 'You now have full access.', [
          { text: 'OK', onPress: () => router.back() },
        ])
      }
    } catch (e: any) {
      if (!e.userCancelled) Alert.alert('Error', e.message)
    } finally {
      setPurchasing(false)
    }
  }

  async function handleRestore() {
    setPurchasing(true)
    try {
      const customerInfo = await restorePurchases()
      const tier = detectTier(customerInfo)
      if (tier !== 'free') {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase
            .from('profiles')
            .update({ subscription_tier: tier, subscription_status: 'premium' })
            .eq('id', user.id)
        }
        Alert.alert('Restored!', 'Your premium access is back.', [
          { text: 'OK', onPress: () => router.back() },
        ])
      } else {
        Alert.alert('No purchases found', "We couldn't find an active subscription.")
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

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.heroBlock}>
          <GrandmaLogo
            size={88}
            mode="auto"
            motion={selectedTier === 'premium_family' ? 'sparkle' : 'default'}
          />
          <Display size={28} align="center" color={colors.text} style={{ marginTop: 14 }}>
            Unlock Grandma Premium
          </Display>
          <Body size={14} align="center" color={colors.textSecondary} style={{ marginTop: 6, paddingHorizontal: 12 }}>
            {subtitle}
          </Body>
        </View>

        {/* Tier toggle */}
        <View style={[styles.tierToggle, { backgroundColor: paper, borderColor: paperBorder }]}>
          {(['premium_solo', 'premium_family'] as const).map((tier) => {
            const isActive = selectedTier === tier
            return (
              <Pressable
                key={tier}
                onPress={() => {
                  setSelectedTier(tier)
                  setSelectedPeriod(null)
                }}
                style={[
                  styles.tierToggleItem,
                  isActive && { backgroundColor: stickers.lilac + accentTint, borderColor: accentText },
                ]}
              >
                <Body
                  size={14}
                  color={isActive ? accentText : colors.textSecondary}
                  style={{ fontFamily: font.bodySemiBold }}
                >
                  {TIER_COPY[tier].title}
                </Body>
                <Body size={11} color={isActive ? accentText : colors.textMuted} style={{ marginTop: 2 }}>
                  {TIER_COPY[tier].seats}
                </Body>
              </Pressable>
            )
          })}
        </View>

        {/* Tier features */}
        <View style={styles.features}>
          {tierCopy.features.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: stickers.lilac + (isDark ? '28' : '32') }]}>
                <Ionicons name={f.icon} size={18} color={accentText} />
              </View>
              <Body size={15} color={colors.text} style={{ flex: 1, fontFamily: font.bodyMedium }}>
                {f.text}
              </Body>
            </View>
          ))}
        </View>

        {/* Period cards */}
        {loading ? (
          <View style={{ marginTop: 8, marginBottom: 16 }}>
            <BrandedLoader logoSize={72} />
          </View>
        ) : (
          <View style={styles.packages}>
            {(['annual', 'monthly'] as const).map((period) => {
              const isSelected = selectedPeriod === period
              const isAnnual = period === 'annual'
              const price = priceFor(selectedTier, period)
              return (
                <Pressable
                  key={period}
                  onPress={() => setSelectedPeriod(period)}
                  style={[
                    styles.packageCard,
                    {
                      backgroundColor: isSelected ? stickers.lilac + accentTint : paper,
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
                    {price}
                  </Display>
                  <Body size={12} color={colors.textMuted} style={{ marginTop: 2 }}>
                    {isAnnual ? '/year' : '/month'}
                  </Body>
                </Pressable>
              )
            })}
          </View>
        )}

        <PillButton
          label={ctaLabel}
          variant={selectedPeriod === 'annual' ? 'accent' : 'ink'}
          accentColor={stickers.lilac}
          onPress={handlePurchase}
          disabled={ctaDisabled}
        />

        <Pressable onPress={handleRestore} disabled={purchasing} style={styles.restoreButton} hitSlop={8}>
          <Body size={14} color={colors.text} style={{ fontFamily: font.bodyMedium, textDecorationLine: 'underline' }}>
            Restore purchases
          </Body>
        </Pressable>

        <Body size={11} align="center" color={colors.textMuted} style={{ marginTop: 16, lineHeight: 16, paddingHorizontal: 12 }}>
          Payment will be charged to your App Store account. Subscription auto-renews unless cancelled 24 hours before the end of the current period.
        </Body>
      </ScrollView>
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
  heroBlock: { alignItems: 'center', marginTop: 12, marginBottom: 20 },

  tierToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 999,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  tierToggleItem: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },

  features: { gap: 14, marginBottom: 22 },
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
