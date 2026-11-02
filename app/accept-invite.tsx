import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, Alert, StyleSheet, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { ArrowLeft, Eye, PencilLine, MessageCircle, User, HeartPulse } from 'lucide-react-native'
import { supabase } from '../lib/supabase'
import { useTheme, font, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../constants/theme'
import { useTranslation } from '../lib/i18n'
import { useModeStore } from '../store/useModeStore'
import { useIsDiffuse } from '../components/ui/diffuse/DiffuseKit'
import { DiffuseBloomIcon } from '../components/ui/diffuse/DiffusePrimitives'
import { InkBackButton } from '../components/ui/InkBackButton'
import { PillButton } from '../components/ui/PillButton'
import { SiteSticker, type SiteStickerName } from '../components/stickers/SiteSticker'

type PermGlyph = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>

export default function AcceptInvite() {
  const { colors } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const mode = useModeStore((s) => s.mode)
  const accent = getDiffuseAccent(mode, dt.isDark)
  const { t } = useTranslation()
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1, backgroundColor: colors.bg,
      paddingHorizontal: 24, paddingTop: 80, alignItems: 'center',
    },
    backButton: {
      position: 'absolute', top: 60, left: 24,
      width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface,
      justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border,
    },
    emoji: { fontSize: 56, marginBottom: 20 },
    title: { fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: 8, textAlign: 'center', fontFamily: font.display },
    subtitle: { fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
    permissionsCard: {
      width: '100%', backgroundColor: colors.surface, borderRadius: 16, padding: 20,
      borderWidth: 1, borderColor: colors.border, marginBottom: 32, gap: 14,
    },
    permissionsTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 },
    permRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    permText: { fontSize: 14, color: colors.textSecondary },
    button: {
      width: '100%', backgroundColor: colors.accent, borderRadius: 16,
      paddingVertical: 16, alignItems: 'center',
    },
    buttonText: { color: colors.textInverse, fontSize: 16, fontWeight: '700' },
    declineButton: { paddingVertical: 16 },
    declineText: { color: colors.textMuted, fontSize: 14 },
    siteTitle: { fontSize: 28, color: colors.text, marginBottom: 8, textAlign: 'center', fontFamily: font.display, textTransform: 'uppercase', letterSpacing: 0.3 },
    siteEyebrow: { fontSize: 10, color: colors.textMuted, fontFamily: 'SpaceMono_400Regular', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 6 },
    siteRows: { width: '100%', marginBottom: 28 },
    siteRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12,
      borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
    },
    sitePermText: { fontSize: 15, color: colors.text, fontFamily: font.body, flex: 1 },
  }), [colors])
  const params = useLocalSearchParams<{ token: string | string[] }>()
  const token = Array.isArray(params.token) ? params.token[0] : params.token
  const [loading, setLoading] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [childName, setChildName] = useState('')
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [grantedPerms, setGrantedPerms] = useState<string[] | null>(null)

  // Gate on session — the accept-invite edge function requires a JWT.
  // Preserve the token through sign-in via a query param so the user
  // resumes here after authenticating.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return
      if (!session) {
        const qs = token ? `?invite=${encodeURIComponent(token)}` : ''
        router.replace(`/(auth)/welcome${qs}` as Parameters<typeof router.replace>[0])
        return
      }
      setCheckingAuth(false)

      // Fetch the actual granted permissions to show on the card (preview mode
      // runs the same server-side token+email validation, returns no PHI).
      if (token) {
        try {
          const { data } = await supabase.functions.invoke('accept-invite', {
            body: { token, preview: true },
          })
          if (!cancelled && data?.permissions) {
            const perms = Object.entries(data.permissions)
              .filter(([k, v]) => !k.startsWith('_') && v === true)
              .map(([k]) => k)
            setGrantedPerms(perms)
          }
        } catch {
          // Non-fatal — fall back to the generic capability list on the card.
        }
      }
    })()
    return () => { cancelled = true }
  }, [token])

  // Map a capability key to a display row. Order is stable for rendering.
  const PERM_LABELS: { key: string; icon: keyof typeof Ionicons.glyphMap; Glyph: PermGlyph; sticker: SiteStickerName; label: string }[] = [
    { key: 'view', icon: 'eye-outline', Glyph: Eye, sticker: 'eye', label: 'View the child’s logs' },
    { key: 'log_activity', icon: 'create-outline', Glyph: PencilLine, sticker: 'pencil', label: 'Log daily activities' },
    { key: 'chat', icon: 'chatbubble-outline', Glyph: MessageCircle, sticker: 'bubble', label: 'Use Grandma chat' },
    { key: 'edit_child', icon: 'person-outline', Glyph: User, sticker: 'baby', label: 'Edit the child profile' },
    { key: 'emergency', icon: 'medkit-outline', Glyph: HeartPulse, sticker: 'thermo', label: 'View medical information' },
  ]

  async function handleAccept() {
    if (!token) {
      Alert.alert(t('acceptInvite_errorTitle'), t('acceptInvite_errorNoToken'))
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('accept-invite', {
        body: { token },
      })

      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)

      setChildName(data.childName)
      setAccepted(true)
    } catch (e: any) {
      Alert.alert(t('acceptInvite_errorTitle'), e.message)
    } finally {
      setLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <View style={[styles.container, diffuse && { backgroundColor: dt.colors.bg }]}>
        <ActivityIndicator color={diffuse ? accent : colors.accent} style={{ marginTop: 120 }} />
      </View>
    )
  }

  if (accepted) {
    return (
      <View style={[styles.container, diffuse && { backgroundColor: dt.colors.bg }]}>
        {diffuse ? (
          <Text style={styles.emoji}>{t('acceptInvite_successEmoji')}</Text>
        ) : (
          <View style={{ marginBottom: 20 }}><SiteSticker name="star" size={64} cut /></View>
        )}
        <Text style={[
          diffuse ? styles.title : styles.siteTitle,
          diffuse && { color: dt.colors.ink, fontFamily: diffuseFont.display, fontWeight: '400' },
        ]}>{t('acceptInvite_successTitle')}</Text>
        <Text style={[styles.subtitle, diffuse && { color: dt.colors.ink3, fontFamily: diffuseFont.body }]}>
          {t('acceptInvite_successBody', { name: childName })}
        </Text>
        {diffuse ? (
          <Pressable
            onPress={() => router.replace('/(tabs)')}
            style={[
              styles.button,
              { backgroundColor: 'transparent', borderWidth: 1, borderColor: dt.colors.line2, borderRadius: 999 },
            ]}
          >
            <Text style={[
              styles.buttonText,
              { color: dt.colors.ink, fontFamily: diffuseFont.mono, letterSpacing: 1.6, textTransform: 'uppercase', fontSize: 13 },
            ]}>{t('acceptInvite_goHome')}</Text>
          </Pressable>
        ) : (
          <PillButton variant="ink" label={t('acceptInvite_goHome')} onPress={() => router.replace('/(tabs)')} style={{ width: '100%' }} />
        )}
      </View>
    )
  }

  return (
    <View style={[styles.container, diffuse && { backgroundColor: dt.colors.bg }]}>
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
        <InkBackButton ink={colors.text} paper={colors.surface} style={{ position: 'absolute', top: 56, left: 24, marginBottom: 0 }} />
      )}

      {diffuse ? (
        <Text style={styles.emoji}>{t('acceptInvite_headerEmoji')}</Text>
      ) : (
        <View style={{ marginBottom: 16 }}><SiteSticker name="heart" size={64} cut /></View>
      )}
      <Text style={[
        diffuse ? styles.title : styles.siteTitle,
        diffuse && { color: dt.colors.ink, fontFamily: diffuseFont.display, fontWeight: '400' },
      ]}>{t('acceptInvite_title')}</Text>
      <Text style={[styles.subtitle, diffuse && { color: dt.colors.ink3, fontFamily: diffuseFont.body }]}>
        {t('acceptInvite_subtitle')}
      </Text>

      <View style={[
        diffuse ? styles.permissionsCard : styles.siteRows,
        diffuse && { backgroundColor: dt.colors.surface, borderColor: dt.colors.line },
      ]}>
        <Text style={[
          diffuse ? styles.permissionsTitle : styles.siteEyebrow,
          diffuse && { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1.4, textTransform: 'uppercase', fontSize: 11 },
        ]}>{t('acceptInvite_permissionsTitle')}</Text>
        {/* Render the rows the owner actually granted. Falls back to the
            view/log/chat baseline when the preview fetch didn't resolve. */}
        {PERM_LABELS
          .filter((p) => (grantedPerms ? grantedPerms.includes(p.key) : ['view', 'log_activity', 'chat'].includes(p.key)))
          .map((p) => (
            <View key={p.key} style={diffuse ? styles.permRow : styles.siteRow}>
              {diffuse ? (
                <DiffuseBloomIcon color={accent} size={30} intensity={0.45}>
                  <p.Glyph size={16} color={dt.colors.ink3} strokeWidth={1.6} />
                </DiffuseBloomIcon>
              ) : (
                <SiteSticker name={p.sticker} size={30} cut />
              )}
              <Text style={[diffuse ? styles.permText : styles.sitePermText, diffuse && { color: dt.colors.ink2, fontFamily: diffuseFont.body }]}>{p.label}</Text>
            </View>
          ))}
      </View>

      {diffuse ? (
        <Pressable
          onPress={handleAccept}
          disabled={loading}
          style={[
            styles.button,
            { backgroundColor: 'transparent', borderWidth: 1, borderColor: dt.colors.hairline, borderRadius: 999 },
            loading && { opacity: 0.6 },
          ]}
        >
          {loading ? (
            <ActivityIndicator color={dt.colors.ink} />
          ) : (
            <Text style={[
              styles.buttonText,
              { color: dt.colors.ink, fontFamily: diffuseFont.mono, letterSpacing: 1.6, textTransform: 'uppercase', fontSize: 13 },
            ]}>{t('acceptInvite_acceptBtn')}</Text>
          )}
        </Pressable>
      ) : (
        <PillButton variant="ink" label={t('acceptInvite_acceptBtn')} onPress={handleAccept} disabled={loading} loading={loading} style={{ width: '100%' }} />
      )}

      <Pressable onPress={() => router.back()} style={styles.declineButton}>
        <Text style={[
          styles.declineText,
          diffuse
            ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1.2, textTransform: 'uppercase', fontSize: 11 }
            : { color: colors.text, fontFamily: font.bodyBold, textDecorationLine: 'underline' },
        ]}>{t('acceptInvite_declineBtn')}</Text>
      </Pressable>
    </View>
  )
}
