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
import { Baby, Heart, Mail, Send, Check, Copy, X } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'
import { useTranslation } from '../lib/i18n'
import { useChildStore } from '../store/useChildStore'
import { useTheme, radius, spacing, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../constants/theme'
import { Display, MonoCaps, Body } from '../components/ui/Typography'
import { PaperCard } from '../components/ui/PaperCard'
import { PillButton } from '../components/ui/PillButton'
import { useSavedToast } from '../components/ui/SavedToast'
import { MissingStickers } from '../components/stickers/MissingStickers'
import { useModeStore } from '../store/useModeStore'
import { useIsDiffuse } from '../components/ui/diffuse/DiffuseKit'
import { DiffuseBloomIcon } from '../components/ui/diffuse/DiffusePrimitives'

type RoleGlyph = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>

const ROLES: { id: string; label: string; Sticker: React.ComponentType<{ size?: number }>; Glyph: RoleGlyph }[] = [
  { id: 'nanny', label: 'Nanny', Sticker: MissingStickers.CaregiverNanny, Glyph: Baby },
  { id: 'family', label: 'Family', Sticker: MissingStickers.CaregiverFamily, Glyph: Heart },
]

export default function InviteCaregiver() {
  const insets = useSafeAreaInsets()
  const toast = useSavedToast()
  const { colors, font, stickers, brand } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const mode = useModeStore((s) => s.mode)
  const accent = getDiffuseAccent(mode, dt.isDark)
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
    <View style={[styles.container, diffuse && { backgroundColor: dt.colors.bg }]}>
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
              style={[
                styles.closeButton,
                diffuse && { backgroundColor: 'transparent', borderColor: dt.colors.line2 },
              ]}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              {diffuse ? (
                <X size={18} color={dt.colors.ink} strokeWidth={1.6} />
              ) : (
                <Ionicons name="close" size={20} color={colors.textMuted} />
              )}
            </Pressable>
          </View>

          {!inviteLink ? (
            <>
              {/* Title */}
              <Display size={40} color={diffuse ? dt.colors.ink : colors.text}>
                {t('careInvite_title')}
              </Display>
              <Body size={15} color={diffuse ? dt.colors.ink3 : colors.textMuted} style={styles.subtitle}>
                {t('careInvite_subtitle', { name: child?.name ?? t('careInvite_yourChild') })}
              </Body>

              {/* Email input */}
              <View style={styles.field}>
                <MonoCaps color={diffuse ? dt.colors.ink3 : colors.textMuted}>{t('careInvite_field_email')}</MonoCaps>
                <View style={[
                  styles.inputRow,
                  diffuse && { backgroundColor: dt.colors.surface, borderColor: dt.colors.line },
                ]}>
                  {diffuse ? (
                    <Mail size={17} color={dt.colors.ink3} strokeWidth={1.6} />
                  ) : (
                    <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
                  )}
                  <TextInput
                    style={[
                      styles.inputInner,
                      diffuse
                        ? { color: dt.colors.ink, fontFamily: diffuseFont.body }
                        : { color: colors.text, fontFamily: font.body },
                    ]}
                    selectionColor={diffuse ? accent : brand.secondary}
                    placeholder="nanny@email.com"
                    placeholderTextColor={diffuse ? dt.colors.ink4 : colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>

              {/* Role selection */}
              <View style={styles.field}>
                <MonoCaps color={diffuse ? dt.colors.ink3 : colors.textMuted}>{t('careInvite_field_role')}</MonoCaps>
                <View style={styles.roleRow}>
                  {ROLES.map((r) => {
                    const isActive = role === r.id
                    if (diffuse) {
                      return (
                        <Pressable
                          key={r.id}
                          onPress={() => setRole(r.id)}
                          style={[
                            styles.roleChip,
                            {
                              backgroundColor: 'transparent',
                              borderWidth: 1,
                              borderColor: isActive ? dt.colors.hairline : dt.colors.line,
                            },
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`Select role ${r.label}`}
                        >
                          <DiffuseBloomIcon color={accent} size={40} intensity={isActive ? 0.55 : 0.32}>
                            <r.Glyph size={22} color={dt.colors.ink3} strokeWidth={1.6} />
                          </DiffuseBloomIcon>
                          <Body
                            size={15}
                            color={isActive ? dt.colors.ink : dt.colors.ink3}
                            style={{ fontFamily: isActive ? diffuseFont.bodySemiBold : diffuseFont.body }}
                          >
                            {r.label}
                          </Body>
                        </Pressable>
                      )
                    }
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
                    diffuse ? (
                      <Send size={15} color={dt.colors.ink} strokeWidth={1.7} />
                    ) : (
                      <Ionicons name="send" size={16} color={colors.bg} />
                    )
                  ) : undefined
                }
                style={{ marginTop: spacing.sm }}
              />

              {/* Footer */}
              <View style={styles.footer}>
                <MonoCaps color={diffuse ? dt.colors.ink4 : colors.textFaint}>{t('careInvite_footer_secured')}</MonoCaps>
              </View>
            </>
          ) : (
            <View style={styles.successWrap}>
              {diffuse ? (
                <View style={{ marginBottom: spacing.md }}>
                  <DiffuseBloomIcon color={accent} size={72} intensity={0.55}>
                    <Check size={34} color={dt.colors.ink} strokeWidth={1.6} />
                  </DiffuseBloomIcon>
                </View>
              ) : (
                <View style={styles.stickerBadge}>
                  <Ionicons name="checkmark" size={36} color={stickers.greenInk} />
                </View>
              )}
              <Display size={36} align="center" color={diffuse ? dt.colors.ink : colors.text}>
                {t('careInvite_sent_title')}
              </Display>
              <Body size={15} align="center" color={diffuse ? dt.colors.ink3 : colors.textMuted}>
                {t('careInvite_share_with', { email })}
              </Body>

              <Pressable onPress={copyLink} style={styles.linkCard} accessibilityRole="button" accessibilityLabel="Copy invite link">
                {diffuse ? (
                  <View style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    padding: 16,
                    borderRadius: radius.md,
                    backgroundColor: dt.colors.surface,
                    borderWidth: 1,
                    borderColor: dt.colors.line,
                  }}>
                    <Body size={13} color={dt.colors.ink3} numberOfLines={2} style={{ flex: 1, fontFamily: diffuseFont.mono }}>
                      {inviteLink}
                    </Body>
                    <Copy size={18} color={dt.colors.ink} strokeWidth={1.6} />
                  </View>
                ) : (
                  <PaperCard flat padding={16} radius={radius.md} style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Body size={13} color={colors.textMuted} numberOfLines={2} style={{ flex: 1 }}>
                        {inviteLink}
                      </Body>
                      <Ionicons name="copy-outline" size={20} color={colors.primary} />
                    </View>
                  </PaperCard>
                )}
              </Pressable>

              <Pressable
                onPress={() => router.back()}
                style={styles.doneButton}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Done"
              >
                <Body
                  size={diffuse ? 12 : 16}
                  color={diffuse ? dt.colors.ink : colors.primary}
                  style={diffuse
                    ? { fontFamily: diffuseFont.mono, letterSpacing: 2, textTransform: 'uppercase' }
                    : { fontFamily: font.bodySemiBold }}
                >
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
