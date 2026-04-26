import { useEffect, useMemo, useState } from 'react'
import {
  View,
  Pressable,
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
import { PaperAlert, PaperAlertButton } from '../components/ui/PaperAlert'
import { Heart, Star, Sparkle, Cross, Sun, Flower } from '../components/ui/Stickers'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

// Fallback prices if RevenueCat hasn't loaded yet
const FALLBACK_PRICE: Record<PaywallTier, Record<BillingPeriod, string>> = {
  premium_solo: { monthly: '$9.99', annual: '$69.99' },
  premium_family: { monthly: '$14.99', annual: '$99.99' },
}

type FeatureSticker = 'heart' | 'cross' | 'sparkle' | 'star' | 'sun'

const TIER_COPY: Record<PaywallTier, {
  title: string
  seats: string
  features: Array<{ sticker: FeatureSticker; text: string }>
  highlight: string
}> = {
  premium_solo: {
    title: 'Solo',
    seats: 'You + 1 caregiver',
    features: [
      { sticker: 'heart', text: 'You + 1 caregiver (partner or nanny)' },
      { sticker: 'cross', text: 'Unlimited medicine & food scans' },
      { sticker: 'sparkle', text: 'Unlimited Grandma conversations' },
      { sticker: 'star', text: 'Vaccine reminders' },
      { sticker: 'sun', text: 'Priority responses' },
    ],
    highlight: 'Best for single parents or first-time setup',
  },
  premium_family: {
    title: 'Family',
    seats: 'You + up to 4 caregivers',
    features: [
      { sticker: 'heart', text: 'Up to 5 accounts with full access' },
      { sticker: 'cross', text: 'Unlimited scans for every caregiver' },
      { sticker: 'sparkle', text: 'Shared Grandma conversations' },
      { sticker: 'star', text: 'Synced vaccine reminders' },
      { sticker: 'sun', text: 'Priority responses & early features' },
    ],
    highlight: 'Co-parent, grandparents, and nannies — all on one plan',
  },
}

function FeatureStickerIcon({ kind, size = 32 }: { kind: FeatureSticker; size?: number }) {
  const { stickers, colors } = useTheme()
  const stroke = colors.text
  switch (kind) {
    case 'heart':
      return <Heart size={size} fill={stickers.pink} stroke={stroke} />
    case 'cross':
      return <Cross size={size} fill={stickers.coral} stroke={stroke} />
    case 'sparkle':
      return <Sparkle size={size} fill={stickers.yellow} stroke={stroke} />
    case 'star':
      return <Star size={size} fill={stickers.lilac} stroke={stroke} />
    case 'sun':
      return <Sun size={size} fill={stickers.yellow} stroke={stroke} />
  }
}

export default function Paywall() {
  const { colors, font, brand, stickers, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ tier?: string }>()
  const paper = colors.surface
  const paperBorder = colors.border
  const ink = colors.text
  const inkText = colors.textInverse
  const accentBg = isDark ? colors.accentSoft : brand.pregnancySoft
  const accentBorder = brand.pregnancy
  const coral = stickers.coral

  const [tieredPackages, setTieredPackages] = useState<TieredPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)
  const [selectedTier, setSelectedTier] = useState<PaywallTier>(
    params.tier === 'premium_family' ? 'premium_family' : 'premium_solo'
  )
  const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriod | null>('annual')
  const [alert, setAlert] = useState<{
    title: string
    message?: string
    italic?: string
    buttons?: PaperAlertButton[]
  } | null>(null)

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

  const trialLine = useMemo(() => {
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
      setAlert({
        title: 'Unavailable',
        italic: 'one moment, dear',
        message: 'This plan is not available yet. Please try again shortly.',
      })
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
        setAlert({
          title: 'Welcome to Premium',
          italic: 'grandma sees you, dear',
          message: 'You now have full access.',
          buttons: [{ label: 'OK', variant: 'primary', onPress: () => router.back() }],
        })
      }
    } catch (e: any) {
      if (!e.userCancelled) setAlert({ title: 'Something went wrong', message: e.message })
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
        setAlert({
          title: 'Restored',
          italic: 'welcome back, dear',
          message: 'Your premium access is back.',
          buttons: [{ label: 'OK', variant: 'primary', onPress: () => router.back() }],
        })
      } else {
        setAlert({
          title: 'No purchases found',
          italic: 'nothing to restore yet',
          message: "We couldn't find an active subscription on this account.",
        })
      }
    } catch (e: any) {
      setAlert({ title: 'Something went wrong', message: e.message })
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
        style={[
          styles.closeButton,
          {
            backgroundColor: paper,
            borderColor: colors.borderStrong,
            borderWidth: 1.5,
            top: insets.top + 12,
          },
        ]}
      >
        <Ionicons name="close" size={20} color={colors.text} />
      </Pressable>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.heroBlock}>
          {/* Floating decorative stickers */}
          <View style={[styles.floatSticker, { top: 4, left: 28, transform: [{ rotate: '-14deg' }], opacity: 0.55 }]} pointerEvents="none">
            <Sparkle size={28} fill={stickers.yellow} stroke={ink} />
          </View>
          <View style={[styles.floatSticker, { top: 0, right: 24, transform: [{ rotate: '12deg' }], opacity: 0.6 }]} pointerEvents="none">
            <Star size={32} fill={stickers.lilac} stroke={ink} />
          </View>
          <View style={[styles.floatSticker, { bottom: 12, left: 18, transform: [{ rotate: '-8deg' }], opacity: 0.55 }]} pointerEvents="none">
            <Heart size={26} fill={stickers.pink} stroke={ink} />
          </View>

          <GrandmaLogo
            size={110}
            mode="auto"
            motion={selectedTier === 'premium_family' ? 'sparkle' : 'default'}
          />
          <Display
            size={38}
            align="center"
            color={ink}
            style={{ marginTop: 18, fontFamily: font.display, letterSpacing: -0.5, lineHeight: 42 }}
          >
            Unlock Grandma Premium
          </Display>
          <Body
            size={18}
            align="center"
            color={coral}
            style={{ marginTop: 8, fontFamily: font.italic, fontStyle: 'italic' }}
          >
            more love, more eyes, more you
          </Body>
          <Body
            size={12}
            align="center"
            color={colors.textMuted}
            style={{ marginTop: 8, paddingHorizontal: 12, fontFamily: font.body }}
          >
            {trialLine}
          </Body>
        </View>

        {/* Tier toggle */}
        <View style={[styles.tierToggle, { backgroundColor: paper, borderColor: paperBorder }]}>
          {(['premium_solo', 'premium_family'] as const).map((tier) => {
            const isActive = selectedTier === tier
            const isSolo = tier === 'premium_solo'
            return (
              <Pressable
                key={tier}
                onPress={() => {
                  setSelectedTier(tier)
                  setSelectedPeriod('annual')
                }}
                style={[
                  styles.tierToggleItem,
                  isActive && { backgroundColor: accentBg },
                ]}
              >
                <View style={styles.tierToggleHeader}>
                  {isSolo ? (
                    <Heart size={18} fill={stickers.pink} stroke={ink} />
                  ) : (
                    <Flower size={18} petal={stickers.lilac} center={stickers.yellow} stroke={ink} />
                  )}
                  <Body
                    size={18}
                    color={isActive ? ink : colors.textSecondary}
                    style={{ fontFamily: font.display, letterSpacing: -0.2 }}
                  >
                    {TIER_COPY[tier].title}
                  </Body>
                </View>
                <Body
                  size={11}
                  color={isActive ? colors.textSecondary : colors.textMuted}
                  style={{ marginTop: 2, fontFamily: font.body }}
                >
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
              <View style={styles.featureSticker}>
                <FeatureStickerIcon kind={f.sticker} size={32} />
              </View>
              <Body size={16} color={ink} style={{ flex: 1, fontFamily: font.body, lineHeight: 22 }}>
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
                      backgroundColor: paper,
                      borderColor: isSelected ? accentBorder : paperBorder,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                >
                  {isAnnual && (
                    <>
                      <View
                        style={[
                          styles.saveBadge,
                          { backgroundColor: ink, transform: [{ rotate: '-2deg' }] },
                        ]}
                      >
                        <Body
                          size={10}
                          color={inkText}
                          style={{
                            fontFamily: font.display,
                            letterSpacing: 1.5,
                          }}
                        >
                          BEST VALUE
                        </Body>
                      </View>
                      <View
                        style={[
                          styles.cornerSticker,
                          { transform: [{ rotate: '8deg' }] },
                        ]}
                        pointerEvents="none"
                      >
                        <Star size={26} fill={stickers.yellow} stroke={ink} />
                      </View>
                    </>
                  )}
                  <Body
                    size={13}
                    color={isSelected ? ink : colors.textSecondary}
                    style={{ fontFamily: font.bodyMedium, marginBottom: 6, letterSpacing: 0.4 }}
                  >
                    {isAnnual ? 'Annual' : 'Monthly'}
                  </Body>
                  <Display
                    size={38}
                    align="center"
                    color={ink}
                    style={{ fontFamily: font.display, letterSpacing: -0.5, lineHeight: 42 }}
                  >
                    {price}
                  </Display>
                  <Body
                    size={14}
                    color={colors.textMuted}
                    style={{ marginTop: 2, fontFamily: font.body }}
                  >
                    {isAnnual ? '/year' : '/month'}
                  </Body>
                </Pressable>
              )
            })}
          </View>
        )}

        <PillButton
          label={ctaLabel}
          variant="accent"
          accentColor={brand.pregnancy}
          height={64}
          onPress={handlePurchase}
          disabled={ctaDisabled}
          leading={<Sparkle size={22} fill={stickers.yellow} stroke={ink} />}
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
      <PaperAlert
        visible={alert !== null}
        title={alert?.title ?? ''}
        italic={alert?.italic}
        message={alert?.message}
        buttons={alert?.buttons}
        onRequestClose={() => setAlert(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  closeButton: {
    position: 'absolute',
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  heroBlock: { alignItems: 'center', marginTop: 12, marginBottom: 22, position: 'relative' },
  floatSticker: { position: 'absolute', zIndex: 1 },

  tierToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 999,
    padding: 4,
    marginBottom: 22,
    gap: 4,
  },
  tierToggleItem: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tierToggleHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  features: { gap: 16, marginBottom: 24 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureSticker: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  packages: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  packageCard: {
    flex: 1,
    borderRadius: 24,
    padding: 18,
    alignItems: 'center',
    minHeight: 156,
    justifyContent: 'center',
    position: 'relative',
  },
  saveBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 10,
    overflow: 'hidden',
  },
  cornerSticker: {
    position: 'absolute',
    top: -10,
    right: -8,
    zIndex: 2,
  },
  restoreButton: { alignItems: 'center', paddingVertical: 12 },
})
