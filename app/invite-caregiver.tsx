/**
 * Invite Caregiver — cream-paper redesign.
 *
 * Sends a caregiver invite for the active child and surfaces a shareable
 * deep-link. Two states: the invite form (email + relationship role) and the
 * success view (copyable invite link). This is a visual re-skin — the invite
 * generation, clipboard share, and navigation logic are unchanged.
 */

import { useMemo, useState } from 'react'
import {
  View,
  TextInput,
  Pressable,
  Alert,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { router } from 'expo-router'
import * as Clipboard from 'expo-clipboard'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'
import { useTranslation } from '../lib/i18n'
import { useChildStore } from '../store/useChildStore'
import { useTheme, radius, spacing } from '../constants/theme'
import { Display, MonoCaps, Body } from '../components/ui/Typography'
import { PaperCard } from '../components/ui/PaperCard'
import { PillButton } from '../components/ui/PillButton'
import { useSavedToast } from '../components/ui/SavedToast'
import { MissingStickers } from '../components/stickers/MissingStickers'

const ROLES = [
  { id: 'nanny', label: 'Nanny', Sticker: MissingStickers.CaregiverNanny },
  { id: 'family', label: 'Family', Sticker: MissingStickers.CaregiverFamily },
]

export default function InviteCaregiver() {
  const insets = useSafeAreaInsets()
  const toast = useSavedToast()
  const { colors, font, stickers, brand } = useTheme()
  const { t } = useTranslation()

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    scroll: {
      paddingHorizontal: spacing.lg,
      gap: 14,
    },
    header: {
      alignItems: 'flex-end',
      marginBottom: spacing.sm,
    },
    closeButton: {
      width: 38,
      height: 38,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    subtitle: {
      marginTop: 8,
      marginBottom: 12,
    },
    field: {
      gap: 8,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: 16,
      height: 56,
      gap: 10,
    },
    inputInner: {
      flex: 1,
      fontSize: 15,
      paddingVertical: 0,
    },
    roleRow: {
      flexDirection: 'row',
      gap: 12,
    },
    roleChip: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 22,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    roleChipActive: {
      borderColor: colors.text,
      backgroundColor: stickers.yellowSoft,
    },
    footer: {
      marginTop: spacing.lg,
      alignItems: 'center',
    },
    successWrap: {
      alignItems: 'center',
      paddingTop: spacing.xl,
      gap: 6,
    },
    stickerBadge: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: stickers.greenSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    linkCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      width: '100%',
      marginTop: spacing.lg,
      marginBottom: spacing.md,
    },
    doneButton: {
      paddingVertical: 12,
    },
  }), [colors, font, stickers, brand])

  const child = useChildStore((s) => s.activeChild)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('nanny')
  const [loading, setLoading] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)

  async function handleInvite() {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Invalid email', 'Please enter a valid email address')
      return
    }
    if (!child?.id) return

    setLoading(true)
    try {
      // Send a sensible default permission set for the chosen role so the
      // caregiver's grant reflects intent rather than the edge function's
      // generic fallback. The owner can refine per-person later in Care Circle.
      const permissions =
        role === 'family'
          ? { view: true, chat: true }
          : { view: true, log_activity: true, chat: true } // nanny → contributor

      const { data, error } = await supabase.functions.invoke('invite-caregiver', {
        body: {
          childId: child.id,
          email: email.trim().toLowerCase(),
          role,
          permissions,
        },
      })

      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)

      const link = `grandma-app://invite/${data.inviteToken}`
      setInviteLink(link)
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setLoading(false)
    }
  }

  async function copyLink() {
    if (!inviteLink) return
    await Clipboard.setStringAsync(inviteLink)
    toast.show({ title: 'Copied!', message: 'Share this link with the caregiver.' })
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Close button top-right */}
          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              style={styles.closeButton}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          {!inviteLink ? (
            <>
              {/* Title */}
              <Display size={40} color={colors.text}>
                {t('careInvite_title')}
              </Display>
              <Body size={15} color={colors.textMuted} style={styles.subtitle}>
                {t('careInvite_subtitle', { name: child?.name ?? t('careInvite_yourChild') })}
              </Body>

              {/* Email input */}
              <View style={styles.field}>
                <MonoCaps color={colors.textMuted}>{t('careInvite_field_email')}</MonoCaps>
                <View style={styles.inputRow}>
                  <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
                  <TextInput
                    style={[styles.inputInner, { color: colors.text, fontFamily: font.body }]}
                    selectionColor={brand.secondary}
                    placeholder="nanny@email.com"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>

              {/* Role selection */}
              <View style={styles.field}>
                <MonoCaps color={colors.textMuted}>{t('careInvite_field_role')}</MonoCaps>
                <View style={styles.roleRow}>
                  {ROLES.map((r) => {
                    const isActive = role === r.id
                    return (
                      <Pressable
                        key={r.id}
                        onPress={() => setRole(r.id)}
                        style={[styles.roleChip, isActive && styles.roleChipActive]}
                        accessibilityRole="button"
                        accessibilityLabel={`Select role ${r.label}`}
                      >
                        <r.Sticker size={36} />
                        <Body
                          size={15}
                          color={isActive ? colors.text : colors.textMuted}
                          style={{ fontFamily: font.bodySemiBold }}
                        >
                          {r.label}
                        </Body>
                      </Pressable>
                    )
                  })}
                </View>
              </View>

              {/* Send button */}
              <PillButton
                label={loading ? 'Sending…' : 'Send Invite'}
                variant="ink"
                onPress={handleInvite}
                disabled={loading}
                loading={loading}
                height={72}
                trailing={
                  !loading ? (
                    <Ionicons name="send" size={16} color={colors.bg} />
                  ) : undefined
                }
                style={{ marginTop: spacing.sm }}
              />

              {/* Footer */}
              <View style={styles.footer}>
                <MonoCaps color={colors.textFaint}>{t('careInvite_footer_secured')}</MonoCaps>
              </View>
            </>
          ) : (
            <View style={styles.successWrap}>
              <View style={styles.stickerBadge}>
                <Ionicons name="checkmark" size={36} color={stickers.greenInk} />
              </View>
              <Display size={36} align="center" color={colors.text}>
                {t('careInvite_sent_title')}
              </Display>
              <Body size={15} align="center" color={colors.textMuted}>
                {t('careInvite_share_with', { email })}
              </Body>

              <Pressable onPress={copyLink} style={styles.linkCard} accessibilityRole="button" accessibilityLabel="Copy invite link">
                <PaperCard flat padding={16} radius={radius.md} style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Body size={13} color={colors.textMuted} numberOfLines={2} style={{ flex: 1 }}>
                      {inviteLink}
                    </Body>
                    <Ionicons name="copy-outline" size={20} color={colors.primary} />
                  </View>
                </PaperCard>
              </Pressable>

              <Pressable
                onPress={() => router.back()}
                style={styles.doneButton}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Done"
              >
                <Body size={16} color={colors.primary} style={{ fontFamily: font.bodySemiBold }}>
                  {t('common_done')}
                </Body>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}
