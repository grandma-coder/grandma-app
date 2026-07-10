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
import { SubscriptionTier, TIER_SEAT_LIMIT } from '../lib/revenue'

interface CaregiverRow {
  id: string
  email: string
  role: string
  status: string
  created_at: string
  is_locked: boolean
}

export default function ManageCaregivers() {
  const { colors, stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const mode = useModeStore((s) => s.mode)
  const accent = getDiffuseAccent(mode, dt.isDark)
  const { t } = useTranslation()

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
  }), [colors])

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
          .select('id, email, role, status, created_at, is_locked')
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

  const seatLimit = TIER_SEAT_LIMIT[tier]
  const activeSeats = caregivers.filter((c) => c.status === 'accepted' && !c.is_locked).length
  const atLimit = activeSeats >= seatLimit
  const nextTierLabel = tier === 'free' ? 'Premium Solo' : tier === 'premium_solo' ? 'Family' : null
  const nextTierRoute = tier === 'premium_family' ? null : (tier === 'premium_solo' ? 'premium_family' : 'premium_solo')

  function revoke(id: string) {
    setPendingRevoke(id)
  }

  async function confirmRevoke() {
    const id = pendingRevoke
    if (!id) return
    setPendingRevoke(null)
    await supabase
      .from('child_caregivers')
      .update({ status: 'revoked' })
      .eq('id', id)
    setCaregivers((prev) => prev.map((c) => c.id === id ? { ...c, status: 'revoked' } : c))
  }

  return (
    <View style={[styles.container, diffuse && { backgroundColor: dt.colors.bg }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={[
            styles.backButton,
            diffuse && { backgroundColor: 'transparent', borderColor: dt.colors.line2 },
          ]}
        >
          {diffuse ? (
            <ArrowLeft size={20} color={dt.colors.ink} strokeWidth={1.6} />
          ) : (
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          )}
        </Pressable>
        <Text style={[
          styles.title,
          diffuse && { color: dt.colors.ink, fontFamily: diffuseFont.display, fontWeight: '400' },
        ]}>{t('leaderboard_tabCaregivers')}</Text>
        <View style={{ width: 40 }} />
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
            ? 'Upgrade to invite caregivers'
            : `${activeSeats} of ${seatLimit} seat${seatLimit === 1 ? '' : 's'} used`}
        </Text>
      </View>

      {atLimit && nextTierRoute ? (
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
                title="No caregivers yet"
                message="Invite a nanny or family member to share care."
              />
            )
          }
          renderItem={({ item }) => {
            const statusTextColor = diffuse
              ? (DIFFUSE_STATUS_TEXT[item.status] ?? dt.colors.ink3)
              : (STATUS_TEXT_COLORS[item.status] ?? colors.textMuted)
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
                    ]}>{item.email}</Text>
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
        title="Revoke access?"
        message="This person will lose access to your child's data."
        buttons={[
          { label: 'Cancel', variant: 'secondary' },
          { label: 'Revoke', variant: 'danger', onPress: confirmRevoke },
        ]}
        onRequestClose={() => setPendingRevoke(null)}
      />
    </View>
  )
}
