import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, FlatList, Alert, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { ArrowLeft, Users, ArrowUpCircle, UserPlus, User, X, Heart as HeartLine } from 'lucide-react-native'
import { supabase } from '../lib/supabase'
import { useChildStore } from '../store/useChildStore'
import { useTheme, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../constants/theme'
import { useTranslation } from '../lib/i18n'
import { useModeStore } from '../store/useModeStore'
import { useIsDiffuse } from '../components/ui/diffuse/DiffuseKit'
import { DiffuseBloomIcon, DiffuseEmptyState } from '../components/ui/diffuse/DiffusePrimitives'
import { BrandedLoader } from '../components/ui/BrandedLoader'
import { EmptyState } from '../components/ui/EmptyState'
import { PaperAlert } from '../components/ui/PaperAlert'
import { Heart } from '../components/ui/Stickers'
import { InkBackButton } from '../components/ui/InkBackButton'
import { PillButton } from '../components/ui/PillButton'
import { SiteSticker, type SiteStickerName } from '../components/stickers/SiteSticker'
import { SubscriptionTier, effectiveSeatLimit } from '../lib/revenue'
import { usePaywallEnabled } from '../store/useFeatureFlags'

interface CaregiverRow {
  id: string
  email: string
  role: string
  status: string
  created_at: string
  is_locked: boolean
  permissions?: { _display_name?: string } | null
}

/** Link invites are stored with a generated '@invite.local' / '@pending' address — never show that. */
function caregiverLabel(row: CaregiverRow, linkInvite: string): string {
  const name = row.permissions?._display_name?.trim()
  if (name) return name
  const placeholder = row.email?.includes('@invite.local') || row.email?.includes('@pending')
  return placeholder ? linkInvite : row.email
}

export default function ManageCaregivers() {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const mode = useModeStore((s) => s.mode)
  const accent = getDiffuseAccent(mode, dt.isDark)
  const { t } = useTranslation()
  const paywallOn = usePaywallEnabled()

  const STATUS_COLORS: Record<string, string> = {
    pending: stickers.peachSoft,
    accepted: colors.primaryTint,
    revoked: colors.surfaceRaised,
  }

  const STATUS_TEXT_COLORS: Record<string, string> = {
    pending: colors.warning,
    accepted: colors.success,
    revoked: colors.error,
  }

  // Diffuse status colors — ink ramp + semantic, mono type.
  const DIFFUSE_STATUS_TEXT: Record<string, string> = {
    pending: dt.colors.warning,
    accepted: dt.colors.success,
    revoked: dt.colors.error,
  }

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingTop: 60, paddingHorizontal: 20, paddingBottom: 8,
    },
    backButton: {
      width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface,
      justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border,
    },
    title: { fontSize: 18, fontWeight: '700', color: colors.text },
    subtitle: { fontSize: 14, color: colors.textMuted, paddingHorizontal: 24, marginBottom: 12 },
    seatCounter: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 24, marginBottom: 16,
    },
    seatCounterText: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
    inviteButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: colors.accent, borderRadius: 16, paddingVertical: 14,
      marginHorizontal: 24, marginBottom: 24,
    },
    inviteText: { color: colors.textInverse, fontSize: 15, fontWeight: '600' },
    list: { paddingHorizontal: 24, paddingBottom: 40 },
    card: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: colors.surface, borderRadius: 16, padding: 16,
      borderWidth: 1, borderColor: colors.border, marginBottom: 10,
    },
    siteRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
    },
    tag: {
      borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2,
      borderWidth: 1.5, borderColor: colors.text,
    },
    tagText: { fontSize: 11, fontFamily: font.bodyBold, color: colors.text, textTransform: 'capitalize' },
    siteTitle: { fontSize: 22, fontFamily: font.display, color: colors.text, textTransform: 'uppercase', letterSpacing: 0.3 },
    cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    avatar: {
      width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceRaised,
      justifyContent: 'center', alignItems: 'center',
    },
    email: { fontSize: 14, fontWeight: '600', color: colors.text },
    role: { fontSize: 12, color: colors.textMuted, textTransform: 'capitalize' },
    statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
    statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
    revokeButton: { padding: 8 },
    emptyState: { alignItems: 'center', paddingTop: 40, gap: 8 },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.textMuted },
    emptySubtitle: { fontSize: 13, color: colors.textMuted },
  }), [colors, font])

  const child = useChildStore((s) => s.activeChild)
  const [caregivers, setCaregivers] = useState<CaregiverRow[]>([])
  const [tier, setTier] = useState<SubscriptionTier>('free')
  const [loading, setLoading] = useState(true)
  const [pendingRevoke, setPendingRevoke] = useState<string | null>(null)

  useEffect(() => {
    if (!child?.id) return
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const [{ data: rows }, { data: profile }] = await Promise.all([
        supabase
          .from('child_caregivers')
          .select('id, email, role, status, created_at, is_locked, permissions')
          .eq('child_id', child.id)
          .neq('role', 'parent')
          .order('created_at', { ascending: false }),
        user
          ? supabase.from('profiles').select('subscription_tier').eq('id', user.id).single()
          : Promise.resolve({ data: null }),
      ])
      setCaregivers(rows ?? [])
      setTier((profile?.subscription_tier as SubscriptionTier) ?? 'free')
      setLoading(false)
    })()
  }, [child?.id])

  const seatLimit = effectiveSeatLimit(tier, paywallOn)
  const activeSeats = caregivers.filter((c) => c.status === 'accepted' && !c.is_locked).length
  const atLimit = activeSeats >= seatLimit
  const nextTierLabel = tier === 'free' ? 'Premium Solo' : tier === 'premium_solo' ? t('paywall_tierFamily') : null
  // No upgrade path while subscriptions are switched off (paywall flag).
  const nextTierRoute = !paywallOn || tier === 'premium_family' ? null : (tier === 'premium_solo' ? 'premium_family' : 'premium_solo')

  function revoke(id: string) {
    setPendingRevoke(id)
  }

  async function confirmRevoke() {
    const id = pendingRevoke
    if (!id) return
    setPendingRevoke(null)
    // Only mark it revoked once the DB says so: an ignored error (offline, RLS matching 0 rows)
    // showed "revoked" while the caregiver kept full access.
    const { data, error } = await supabase
      .from('child_caregivers')
      .update({ status: 'revoked' })
      .eq('id', id)
      .select('id')
    if (error || !data?.length) {
      Alert.alert(t('common_error'), t('common_checkConnection'))
      return
    }
    setCaregivers((prev) => prev.map((c) => c.id === id ? { ...c, status: 'revoked' } : c))
  }

  return (
    <View style={[styles.container, diffuse && { backgroundColor: dt.colors.bg }]}>
      <View style={styles.header}>
        {diffuse ? (
          <Pressable
            onPress={() => router.back()}
            style={[
              styles.backButton,
              { backgroundColor: 'transparent', borderColor: dt.colors.line2 },
            ]}
          >
            <ArrowLeft size={20} color={dt.colors.ink} strokeWidth={1.6} />
          </Pressable>
        ) : (
          <InkBackButton ink={colors.text} paper={colors.surface} style={{ marginBottom: 0 }} />
        )}
        {diffuse ? (
          <Text style={[
            styles.title,
            { color: dt.colors.ink, fontFamily: diffuseFont.display, fontWeight: '400' },
          ]}>{t('leaderboard_tabCaregivers')}</Text>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <SiteSticker name="stroller" size={30} cut />
            <Text style={styles.siteTitle}>{t('leaderboard_tabCaregivers')}</Text>
          </View>
        )}
        <View style={{ width: diffuse ? 40 : 44 }} />
      </View>

      <Text style={[styles.subtitle, diffuse && { color: dt.colors.ink3, fontFamily: diffuseFont.body }]}>
        {t('manageCaregivers_subtitle', { name: child?.name ?? t('careInvite_yourChild') })}
      </Text>

      <View style={styles.seatCounter}>
        {diffuse ? (
          <Users size={15} color={dt.colors.ink3} strokeWidth={1.6} />
        ) : (
          <Ionicons name="people-outline" size={16} color={colors.textMuted} />
        )}
        <Text style={[
          styles.seatCounterText,
          diffuse && { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1, textTransform: 'uppercase', fontSize: 11 },
        ]}>
          {seatLimit === 0
            ? t('app_mc_upgradeToInvite')
            : t(seatLimit === 1 ? 'app_mc_seatsUsedOne' : 'app_mc_seatsUsedMany', { used: activeSeats, limit: seatLimit })}
        </Text>
      </View>

      {atLimit && nextTierRoute && !diffuse ? (
        <PillButton
          variant="ink"
          label={t('manageCaregivers_upgradeForSeats', { tier: nextTierLabel ?? '' })}
          onPress={() => router.push(`/paywall?tier=${nextTierRoute}`)}
          style={{ marginHorizontal: 24, marginBottom: 20 }}
        />
      ) : !diffuse ? (
        <PillButton
          variant="ink"
          label={t('careInvite_title')}
          onPress={() => router.push('/invite-caregiver')}
          style={{ marginHorizontal: 24, marginBottom: 20 }}
        />
      ) : atLimit && nextTierRoute ? (
        <Pressable
          onPress={() => router.push(`/paywall?tier=${nextTierRoute}`)}
          style={[
            styles.inviteButton,
            diffuse
              ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: dt.colors.line2, borderRadius: 999 }
              : { backgroundColor: colors.accent },
          ]}
        >
          {diffuse ? (
            <ArrowUpCircle size={18} color={dt.colors.ink} strokeWidth={1.6} />
          ) : (
            <Ionicons name="arrow-up-circle-outline" size={20} color={colors.textInverse} />
          )}
          <Text style={[
            styles.inviteText,
            diffuse && { color: dt.colors.ink, fontFamily: diffuseFont.mono, letterSpacing: 1.4, textTransform: 'uppercase', fontSize: 12 },
          ]}>{t('manageCaregivers_upgradeForSeats', { tier: nextTierLabel ?? '' })}</Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => router.push('/invite-caregiver')}
          style={[
            styles.inviteButton,
            diffuse && { backgroundColor: 'transparent', borderWidth: 1, borderColor: dt.colors.line2, borderRadius: 999 },
          ]}
        >
          {diffuse ? (
            <UserPlus size={18} color={dt.colors.ink} strokeWidth={1.6} />
          ) : (
            <Ionicons name="person-add-outline" size={20} color={colors.textInverse} />
          )}
          <Text style={[
            styles.inviteText,
            diffuse && { color: dt.colors.ink, fontFamily: diffuseFont.mono, letterSpacing: 1.4, textTransform: 'uppercase', fontSize: 12 },
          ]}>{t('careInvite_title')}</Text>
        </Pressable>
      )}

      {loading ? (
        <View style={{ marginTop: 40 }}>
          <BrandedLoader logoSize={72} />
        </View>
      ) : (
        <FlatList
          data={caregivers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            diffuse ? (
              <DiffuseEmptyState
                icon={
                  <DiffuseBloomIcon color={accent} size={44} intensity={0.5}>
                    <HeartLine size={22} color={dt.colors.ink3} strokeWidth={1.6} />
                  </DiffuseBloomIcon>
                }
                title="No caregivers yet"
                message="Invite a nanny or family member to share care."
              />
            ) : (
              <EmptyState
                icon={<Heart fill={stickers.pink} size={36} />}
                iconBg={stickers.pinkSoft}
                title={t('careCircle_no_caregivers')}
                message={t('app_mc_emptyMsg')}
              />
            )
          }
          renderItem={({ item }) => {
            const statusTextColor = diffuse
              ? (DIFFUSE_STATUS_TEXT[item.status] ?? dt.colors.ink3)
              : (STATUS_TEXT_COLORS[item.status] ?? colors.textMuted)
            if (!diffuse) {
              const avatar: SiteStickerName = item.role === 'nanny' ? 'stroller' : item.role === 'family' ? 'love' : 'me'
              const statusTone = item.status === 'accepted' ? stickers.greenSoft : item.status === 'pending' ? stickers.peachSoft : colors.surfaceRaised
              return (
                <View style={styles.siteRow}>
                  <View style={styles.cardLeft}>
                    <SiteSticker name={avatar} size={38} cut />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.email, { fontFamily: font.bodyBold }]} numberOfLines={1}>{caregiverLabel(item, t('manageCaregivers_linkInvite'))}</Text>
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                        <View style={[styles.tag, { backgroundColor: stickers.yellowSoft }]}>
                          <Text style={styles.tagText}>{item.role}</Text>
                        </View>
                        <View style={[styles.tag, { backgroundColor: statusTone }]}>
                          <Text style={styles.tagText}>{item.status}</Text>
                        </View>
                        {item.is_locked && (
                          <View style={[styles.tag, { backgroundColor: stickers.peachSoft }]}>
                            <Text style={styles.tagText}>{t('manageCaregivers_readOnly')}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  {item.status !== 'revoked' && (
                    <Pressable onPress={() => revoke(item.id)} style={styles.revokeButton} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('app_mc_revokeA11y')}>
                      <Ionicons name="close" size={22} color={colors.text} />
                    </Pressable>
                  )}
                </View>
              )
            }
            return (
              <View style={[
                styles.card,
                diffuse && { backgroundColor: dt.colors.surface, borderColor: dt.colors.line },
              ]}>
                <View style={styles.cardLeft}>
                  <View style={[
                    styles.avatar,
                    diffuse && { backgroundColor: 'transparent', borderWidth: 1, borderColor: dt.colors.line2 },
                  ]}>
                    {diffuse ? (
                      <User size={18} color={dt.colors.ink3} strokeWidth={1.6} />
                    ) : (
                      <Ionicons name="person-outline" size={20} color={colors.textMuted} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[
                      styles.email,
                      diffuse && { color: dt.colors.ink, fontFamily: diffuseFont.body, fontWeight: '400' },
                    ]}>{caregiverLabel(item, t('manageCaregivers_linkInvite'))}</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                      <Text style={[
                        styles.role,
                        diffuse && { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1, textTransform: 'uppercase', fontSize: 11 },
                      ]}>{item.role}</Text>
                      <View style={[
                        styles.statusBadge,
                        diffuse
                          ? { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line2 }
                          : { backgroundColor: STATUS_COLORS[item.status] ?? colors.surfaceRaised },
                      ]}>
                        <Text style={[
                          styles.statusText,
                          { color: statusTextColor },
                          diffuse && { fontFamily: diffuseFont.mono, letterSpacing: 0.8 },
                        ]}>
                          {item.status}
                        </Text>
                      </View>
                      {item.is_locked && (
                        <View style={[
                          styles.statusBadge,
                          diffuse
                            ? { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line2 }
                            : { backgroundColor: stickers.peachSoft },
                        ]}>
                          <Text style={[
                            styles.statusText,
                            { color: diffuse ? dt.colors.warning : colors.warning },
                            diffuse && { fontFamily: diffuseFont.mono, letterSpacing: 0.8 },
                          ]}>{t('manageCaregivers_readOnly')}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                {item.status !== 'revoked' && (
                  <Pressable onPress={() => revoke(item.id)} style={styles.revokeButton}>
                    {diffuse ? (
                      <X size={20} color={dt.colors.ink3} strokeWidth={1.6} />
                    ) : (
                      <Ionicons name="close-circle-outline" size={22} color={colors.error} />
                    )}
                  </Pressable>
                )}
              </View>
            )
          }}
        />
      )}

      <PaperAlert
        visible={pendingRevoke !== null}
        title={t('app_mc_revokeTitle')}
        message={t('app_mc_revokeMsg')}
        buttons={[
          { label: t('common_cancel'), variant: 'secondary' },
          { label: t('app_mc_revoke'), variant: 'danger', onPress: confirmRevoke },
        ]}
        onRequestClose={() => setPendingRevoke(null)}
      />
    </View>
  )
}
