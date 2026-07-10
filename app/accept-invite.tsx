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
  const PERM_LABELS: { key: string; icon: keyof typeof Ionicons.glyphMap; Glyph: PermGlyph; label: string }[] = [
    { key: 'view', icon: 'eye-outline', Glyph: Eye, label: 'View the child’s logs' },
    { key: 'log_activity', icon: 'create-outline', Glyph: PencilLine, label: 'Log daily activities' },
    { key: 'chat', icon: 'chatbubble-outline', Glyph: MessageCircle, label: 'Use Grandma chat' },
    { key: 'edit_child', icon: 'person-outline', Glyph: User, label: 'Edit the child profile' },
    { key: 'emergency', icon: 'medkit-outline', Glyph: HeartPulse, label: 'View medical information' },
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
        <Text style={styles.emoji}>{t('acceptInvite_successEmoji')}</Text>
        <Text style={[
          styles.title,
          diffuse && { color: dt.colors.ink, fontFamily: diffuseFont.display, fontWeight: '400' },
        ]}>{t('acceptInvite_successTitle')}</Text>
        <Text style={[styles.subtitle, diffuse && { color: dt.colors.ink3, fontFamily: diffuseFont.body }]}>
          {t('acceptInvite_successBody', { name: childName })}
        </Text>
        <Pressable
          onPress={() => router.replace('/(tabs)')}
          style={[
            styles.button,
            diffuse && { backgroundColor: 'transparent', borderWidth: 1, borderColor: dt.colors.line2, borderRadius: 999 },
          ]}
        >
          <Text style={[
            styles.buttonText,
            diffuse && { color: dt.colors.ink, fontFamily: diffuseFont.mono, letterSpacing: 1.6, textTransform: 'uppercase', fontSize: 13 },
          ]}>{t('acceptInvite_goHome')}</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={[styles.container, diffuse && { backgroundColor: dt.colors.bg }]}>
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

      <Text style={styles.emoji}>{t('acceptInvite_headerEmoji')}</Text>
      <Text style={[
        styles.title,
        diffuse && { color: dt.colors.ink, fontFamily: diffuseFont.display, fontWeight: '400' },
      ]}>{t('acceptInvite_title')}</Text>
      <Text style={[styles.subtitle, diffuse && { color: dt.colors.ink3, fontFamily: diffuseFont.body }]}>
        {t('acceptInvite_subtitle')}
      </Text>

      <View style={[
        styles.permissionsCard,
        diffuse && { backgroundColor: dt.colors.surface, borderColor: dt.colors.line },
      ]}>
        <Text style={[
          styles.permissionsTitle,
          diffuse && { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1.4, textTransform: 'uppercase', fontSize: 11 },
        ]}>{t('acceptInvite_permissionsTitle')}</Text>
        {/* Render the rows the owner actually granted. Falls back to the
            view/log/chat baseline when the preview fetch didn't resolve. */}
        {PERM_LABELS
          .filter((p) => (grantedPerms ? grantedPerms.includes(p.key) : ['view', 'log_activity', 'chat'].includes(p.key)))
          .map((p) => (
            <View key={p.key} style={styles.permRow}>
              {diffuse ? (
                <DiffuseBloomIcon color={accent} size={30} intensity={0.45}>
                  <p.Glyph size={16} color={dt.colors.ink3} strokeWidth={1.6} />
                </DiffuseBloomIcon>
              ) : (
                <Ionicons name={p.icon} size={18} color={colors.accent} />
              )}
              <Text style={[styles.permText, diffuse && { color: dt.colors.ink2, fontFamily: diffuseFont.body }]}>{p.label}</Text>
            </View>
          ))}
      </View>

      <Pressable
        onPress={handleAccept}
        disabled={loading}
        style={[
          styles.button,
          diffuse && { backgroundColor: 'transparent', borderWidth: 1, borderColor: dt.colors.hairline, borderRadius: 999 },
          loading && { opacity: 0.6 },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={diffuse ? dt.colors.ink : colors.textInverse} />
        ) : (
          <Text style={[
            styles.buttonText,
            diffuse && { color: dt.colors.ink, fontFamily: diffuseFont.mono, letterSpacing: 1.6, textTransform: 'uppercase', fontSize: 13 },
          ]}>{t('acceptInvite_acceptBtn')}</Text>
        )}
      </Pressable>

      <Pressable onPress={() => router.back()} style={styles.declineButton}>
        <Text style={[
          styles.declineText,
          diffuse && { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1.2, textTransform: 'uppercase', fontSize: 11 },
        ]}>{t('acceptInvite_declineBtn')}</Text>
      </Pressable>
    </View>
  )
}
