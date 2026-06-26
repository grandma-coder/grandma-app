import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, Alert, StyleSheet, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { useTheme, font } from '../constants/theme'
import { useTranslation } from '../lib/i18n'

export default function AcceptInvite() {
  const { colors } = useTheme()
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
    })()
    return () => { cancelled = true }
  }, [token])

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
      <View style={styles.container}>
        <ActivityIndicator color={colors.accent} style={{ marginTop: 120 }} />
      </View>
    )
  }

  if (accepted) {
    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={styles.title}>{t('acceptInvite_successTitle')}</Text>
        <Text style={styles.subtitle}>
          {t('acceptInvite_successBody', { name: childName })}
        </Text>
        <Pressable onPress={() => router.replace('/(tabs)')} style={styles.button}>
          <Text style={styles.buttonText}>{t('acceptInvite_goHome')}</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </Pressable>

      <Text style={styles.emoji}>👵</Text>
      <Text style={styles.title}>{t('acceptInvite_title')}</Text>
      <Text style={styles.subtitle}>
        {t('acceptInvite_subtitle')}
      </Text>

      <View style={styles.permissionsCard}>
        <Text style={styles.permissionsTitle}>{t('acceptInvite_permissionsTitle')}</Text>
        <View style={styles.permRow}>
          <Ionicons name="eye-outline" size={18} color={colors.accent} />
          <Text style={styles.permText}>{t('acceptInvite_permView')}</Text>
        </View>
        <View style={styles.permRow}>
          <Ionicons name="create-outline" size={18} color={colors.accent} />
          <Text style={styles.permText}>{t('acceptInvite_permLog')}</Text>
        </View>
        <View style={styles.permRow}>
          <Ionicons name="chatbubble-outline" size={18} color={colors.accent} />
          <Text style={styles.permText}>{t('acceptInvite_permChat')}</Text>
        </View>
      </View>

      <Pressable
        onPress={handleAccept}
        disabled={loading}
        style={[styles.button, loading && { opacity: 0.6 }]}
      >
        {loading ? (
          <ActivityIndicator color={colors.textInverse} />
        ) : (
          <Text style={styles.buttonText}>{t('acceptInvite_acceptBtn')}</Text>
        )}
      </Pressable>

      <Pressable onPress={() => router.back()} style={styles.declineButton}>
        <Text style={styles.declineText}>{t('acceptInvite_declineBtn')}</Text>
      </Pressable>
    </View>
  )
}
