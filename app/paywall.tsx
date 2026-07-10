import { useEffect, useMemo, useState } from 'react'
import {
  View,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { X, Check, Heart as HeartIcon, Sparkles, Star as StarIcon, Flower as FlowerIcon } from 'lucide-react-native'
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
import { useTheme, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../constants/theme'
import { useIsDiffuse, SoftBloom } from '../components/ui/diffuse/DiffuseKit'
import { DiffuseBloomIcon } from '../components/ui/diffuse/DiffusePrimitives'
import { useModeStore } from '../store/useModeStore'
import { Display, Body } from '../components/ui/Typography'
import { PillButton } from '../components/ui/PillButton'
import { GrandmaLogo } from '../components/ui/GrandmaLogo'
import { BrandedLoader } from '../components/ui/BrandedLoader'
import { PaperAlert, PaperAlertButton } from '../components/ui/PaperAlert'
import { Heart, Star, Sparkle, Cross, Sun, Flower } from '../components/ui/Stickers'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from '../lib/i18n'

// Fallback prices if RevenueCat hasn't loaded yet
const FALLBACK_PRICE: Record<PaywallTier, Record<BillingPeriod, string>> = {
  premium_solo: { monthly: '$9.99', annual: '$69.99' },
  premium_family: { monthly: '$14.99', annual: '$99.99' },
}

type FeatureSticker = 'heart' | 'cross' | 'sparkle' | 'star' | 'sun'

interface TierCopyEntry {
  title: string
  seats: string
  features: Array<{ sticker: FeatureSticker; text: string }>
  highlight: string
}

function FeatureStickerIcon({ kind, size = 32 }: { kind: FeatureSticker; size?: number }) {
  const { stickers, colors } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const mode = useModeStore((s) => s.mode)

  if (diffuse) {
    // Diffuse checklist: a thin Lucide Check glyph in the mode accent over a
    // soft bloom (the line-icon "included" mark), replacing the filled sticker.
    const accent = getDiffuseAccent(mode, dt.isDark)
    return (
      <DiffuseBloomIcon color={accent} size={size} intensity={0.45}>
        <Check size={Math.round(size * 0.56)} color={accent} strokeWidth={2} />
      </DiffuseBloomIcon>
    )
  }

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
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const mode = useModeStore((s) => s.mode)
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ tier?: string }>()
  const dAccent = getDiffuseAccent(mode, dt.isDark)
  const paper = diffuse ? dt.colors.surface : colors.surface
  const paperBorder = diffuse ? dt.colors.line : colors.border
  const ink = diffuse ? dt.colors.ink : colors.text
  const inkText = diffuse ? dt.colors.bg : colors.textInverse
  // Diffuse: emphasis on the recommended plan is a subtle accent bloom + hairline,
  // NOT a saturated fill — so the "active" background stays paper.
  const accentBg = diffuse ? dt.colors.surface : (isDark ? colors.accentSoft : brand.pregnancySoft)
  const accentBorder = diffuse ? dt.colors.hairline : brand.pregnancy
  const coral = diffuse ? dAccent : stickers.coral

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

  const TIER_COPY: Record<PaywallTier, TierCopyEntry> = {
    premium_solo: {
      title: t('paywall_tierSolo'),
      seats: t('paywall_tierSoloSeats'),
      features: [
        { sticker: 'heart', text: t('paywall_featureSoloCaregiver') },
        { sticker: 'cross', text: t('paywall_featureUnlimitedScansDetail') },
        { sticker: 'sparkle', text: t('paywall_featureUnlimitedChat') },
        { sticker: 'star', text: t('paywall_featureVaccineReminders') },
        { sticker: 'sun', text: t('paywall_featurePriorityResponses') },
      ],
      highlight: t('paywall_soloHighlight'),
    },
    premium_family: {
      title: t('paywall_tierFamily'),
      seats: t('paywall_tierFamilySeats'),
      features: [
        { sticker: 'heart', text: t('paywall_featureFamilyAccounts') },
        { sticker: 'cross', text: t('paywall_featureFamilyScans') },
        { sticker: 'sparkle', text: t('paywall_featureSharedChat') },
        { sticker: 'star', text: t('paywall_featureSyncedVaccines') },
        { sticker: 'sun', text: t('paywall_featurePriorityEarly') },
      ],
      highlight: t('paywall_familyHighlight'),
    },
  }

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
    if (selectedPeriod === null) return t('paywall_selectPlan')
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
        title: t('paywall_unavailableTitle'),
        italic: t('paywall_unavailableItalic'),
        message: t('paywall_unavailableMsg'),
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
          title: t('paywall_welcomePremiumTitle'),
          italic: t('paywall_welcomePremiumItalic'),
          message: t('paywall_welcomePremiumMsg'),
          buttons: [{ label: 'OK', variant: 'primary', onPress: () => router.back() }],
        })
      }
    } catch (e: any) {
      if (!e.userCancelled) setAlert({ title: t('paywall_errorTitle'), message: e.message })
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
          title: t('paywall_restoredTitle'),
          italic: t('paywall_restoredItalic'),
          message: t('paywall_restoredMsg'),
          buttons: [{ label: 'OK', variant: 'primary', onPress: () => router.back() }],
        })
      } else {
        setAlert({
          title: t('paywall_noPurchasesTitle'),
          italic: t('paywall_noPurchasesItalic'),
          message: t('paywall_noPurchasesMsg'),
        })
      }
    } catch (e: any) {
      setAlert({ title: t('paywall_errorTitle'), message: e.message })
    } finally {
      setPurchasing(false)
    }
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: diffuse ? dt.colors.bg : colors.bg, paddingTop: insets.top + 28, paddingBottom: insets.bottom + 16 },
      ]}
    >
      <Pressable
        onPress={() => router.back()}
        hitSlop={10}
        style={[
          styles.closeButton,
          {
            backgroundColor: diffuse ? 'transparent' : paper,
            borderColor: diffuse ? dt.colors.line2 : colors.borderStrong,
            borderWidth: diffuse ? 1 : 1.5,
            top: insets.top + 12,
          },
        ]}
      >
        {diffuse ? (
          <X size={18} color={dt.colors.ink} strokeWidth={1.75} />
        ) : (
          <Ionicons name="close" size={20} color={colors.text} />
        )}
      </Pressable>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.heroBlock}>
          {/* Floating decorative accents */}
          {diffuse ? (
            <>
              <View style={[styles.floatSticker, { top: 4, left: 28, opacity: 0.7 }]} pointerEvents="none">
                <DiffuseBloomIcon color={dAccent} size={30} intensity={0.4}>
                  <Sparkles size={17} color={dt.colors.ink3} strokeWidth={1.6} />
                </DiffuseBloomIcon>
              </View>
              <View style={[styles.floatSticker, { top: 0, right: 24, opacity: 0.7 }]} pointerEvents="none">
                <DiffuseBloomIcon color={dAccent} size={34} intensity={0.4}>
                  <StarIcon size={19} color={dt.colors.ink3} strokeWidth={1.6} />
                </DiffuseBloomIcon>
              </View>
              <View style={[styles.floatSticker, { bottom: 12, left: 18, opacity: 0.7 }]} pointerEvents="none">
                <DiffuseBloomIcon color={dAccent} size={28} intensity={0.4}>
                  <HeartIcon size={16} color={dt.colors.ink3} strokeWidth={1.6} />
                </DiffuseBloomIcon>
              </View>
            </>
          ) : (
            <>
              <View style={[styles.floatSticker, { top: 4, left: 28, transform: [{ rotate: '-14deg' }], opacity: 0.55 }]} pointerEvents="none">
                <Sparkle size={28} fill={stickers.yellow} stroke={ink} />
              </View>
              <View style={[styles.floatSticker, { top: 0, right: 24, transform: [{ rotate: '12deg' }], opacity: 0.6 }]} pointerEvents="none">
                <Star size={32} fill={stickers.lilac} stroke={ink} />
              </View>
              <View style={[styles.floatSticker, { bottom: 12, left: 18, transform: [{ rotate: '-8deg' }], opacity: 0.55 }]} pointerEvents="none">
                <Heart size={26} fill={stickers.pink} stroke={ink} />
              </View>
            </>
          )}

          <GrandmaLogo
            size={110}
            mode="auto"
            motion={selectedTier === 'premium_family' ? 'sparkle' : 'default'}
          />
          <Display
            size={38}
            align="center"
            color={ink}
            style={{ marginTop: 18, fontFamily: diffuse ? diffuseFont.display : font.display, letterSpacing: -0.5, lineHeight: 42 }}
          >
            {t('paywall_unlockTitle')}
          </Display>
          <Body
            size={18}
            align="center"
            color={coral}
            style={{ marginTop: 8, fontFamily: diffuse ? diffuseFont.italic : font.italic, fontStyle: 'italic' }}
          >
            {t('paywall_heroTagline')}
          </Body>
          <Body
            size={12}
            align="center"
            color={diffuse ? dt.colors.ink3 : colors.textMuted}
            style={{ marginTop: 8, paddingHorizontal: 12, fontFamily: diffuse ? diffuseFont.mono : font.body, letterSpacing: diffuse ? 0.5 : undefined }}
          >
            {trialLine}
          </Body>
        </View>

        {/* Tier toggle */}
        <View
          style={[
            styles.tierToggle,
            {
              backgroundColor: diffuse ? 'transparent' : paper,
              borderColor: diffuse ? dt.colors.line : paperBorder,
            },
          ]}
        >
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
                  diffuse
                    ? {
                        overflow: 'hidden',
                        borderColor: isActive ? dt.colors.hairline : 'transparent',
                        backgroundColor: isActive ? dt.colors.surface : 'transparent',
                      }
                    : isActive && { backgroundColor: accentBg },
                ]}
              >
                {diffuse && isActive ? (
                  <SoftBloom color={dAccent} cx="50%" cy="40%" opacity={dt.isDark ? 0.24 : 0.3} spread={0.5} radius="70%" />
                ) : null}
                <View style={styles.tierToggleHeader}>
                  {diffuse ? (
                    isSolo ? (
                      <HeartIcon size={16} color={isActive ? dAccent : dt.colors.ink3} strokeWidth={1.7} />
                    ) : (
                      <FlowerIcon size={16} color={isActive ? dAccent : dt.colors.ink3} strokeWidth={1.7} />
                    )
                  ) : isSolo ? (
                    <Heart size={18} fill={stickers.pink} stroke={ink} />
                  ) : (
                    <Flower size={18} petal={stickers.lilac} center={stickers.yellow} stroke={ink} />
                  )}
                  <Body
                    size={18}
                    color={diffuse ? (isActive ? dt.colors.ink : dt.colors.ink3) : (isActive ? ink : colors.textSecondary)}
                    style={{ fontFamily: diffuse ? diffuseFont.display : font.display, letterSpacing: -0.2 }}
                  >
                    {TIER_COPY[tier].title}
                  </Body>
                </View>
                <Body
                  size={11}
                  color={diffuse ? (isActive ? dt.colors.ink3 : dt.colors.ink4) : (isActive ? colors.textSecondary : colors.textMuted)}
                  style={{ marginTop: 2, fontFamily: diffuse ? diffuseFont.mono : font.body, letterSpacing: diffuse ? 0.4 : undefined }}
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
              <Body size={16} color={ink} style={{ flex: 1, fontFamily: diffuse ? diffuseFont.body : font.body, lineHeight: 22 }}>
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
                    diffuse
                      ? {
                          backgroundColor: dt.colors.surface,
                          borderColor: isSelected ? dt.colors.hairline : dt.colors.line,
                          borderWidth: isSelected ? 1.5 : 1,
                          overflow: 'hidden',
                        }
                      : {
                          backgroundColor: paper,
                          borderColor: isSelected ? accentBorder : paperBorder,
                          borderWidth: isSelected ? 2 : 1,
                        },
                  ]}
                >
                  {/* Diffuse: selected → subtle accent bloom, not a saturated fill */}
                  {diffuse && isSelected ? (
                    <SoftBloom color={dAccent} cx="50%" cy="22%" opacity={dt.isDark ? 0.22 : 0.28} spread={0.55} radius="75%" />
                  ) : null}
                  {isAnnual && (
                    diffuse ? (
                      <>
                        <View style={[styles.saveBadge, { borderWidth: 1, borderColor: dt.colors.line2, backgroundColor: 'transparent' }]}>
                          <Body
                            size={9}
                            color={dt.colors.ink3}
                            style={{ fontFamily: diffuseFont.mono, letterSpacing: 1.5 }}
                          >
                            {t('paywall_bestValue')}
                          </Body>
                        </View>
                        <View style={styles.cornerBloom} pointerEvents="none">
                          <DiffuseBloomIcon color={dAccent} size={26} intensity={0.4}>
                            <StarIcon size={14} color={dt.colors.ink3} strokeWidth={1.6} />
                          </DiffuseBloomIcon>
                        </View>
                      </>
                    ) : (
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
                            {t('paywall_bestValue')}
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
                    )
                  )}
                  <Body
                    size={13}
                    color={diffuse ? (isSelected ? dt.colors.ink2 : dt.colors.ink3) : (isSelected ? ink : colors.textSecondary)}
                    style={{ fontFamily: diffuse ? diffuseFont.mono : font.bodyMedium, marginBottom: 6, letterSpacing: diffuse ? 1 : 0.4 }}
                  >
                    {isAnnual ? t('paywall_annual') : t('paywall_monthly')}
                  </Body>
                  <Display
                    size={38}
                    align="center"
                    color={ink}
                    style={{ fontFamily: diffuse ? diffuseFont.display : font.display, letterSpacing: -0.5, lineHeight: 42 }}
                  >
                    {price}
                  </Display>
                  <Body
                    size={14}
                    color={diffuse ? dt.colors.ink3 : colors.textMuted}
                    style={{ marginTop: 2, fontFamily: diffuse ? diffuseFont.mono : font.body, letterSpacing: diffuse ? 0.5 : undefined }}
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
          <Body
            size={diffuse ? 12 : 14}
            color={diffuse ? dt.colors.ink3 : colors.text}
            style={{
              fontFamily: diffuse ? diffuseFont.mono : font.bodyMedium,
              textDecorationLine: diffuse ? 'none' : 'underline',
              letterSpacing: diffuse ? 1.2 : undefined,
              textTransform: diffuse ? 'uppercase' : undefined,
            }}
          >
            {t('paywall_restorePurchases')}
          </Body>
        </Pressable>

        <Body
          size={11}
          align="center"
          color={diffuse ? dt.colors.ink4 : colors.textMuted}
          style={{ marginTop: 16, lineHeight: 16, paddingHorizontal: 12, fontFamily: diffuse ? diffuseFont.body : undefined }}
        >
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
  // Diffuse: corner accent stays inside the card (card uses overflow:hidden)
  cornerBloom: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
  },
  restoreButton: { alignItems: 'center', paddingVertical: 12 },
})
