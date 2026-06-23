import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, Alert, StyleSheet, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { useTheme, font } from '../constants/theme'

export default function AcceptInvite() {
  const { colors } = useTheme()
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
        const t = token ? `?invite=${encodeURIComponent(token)}` : ''
        router.replace(`/(auth)/welcome${t}` as Parameters<typeof router.replace>[0])
        return
      }
      setCheckingAuth(false)
    })()
    return () => { cancelled = true }
  }, [token])

  async function handleAccept() {
    if (!token) {
      Alert.alert('Error', 'No invite token provided')
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
      Alert.alert('Error', e.message)
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
        <Text style={styles.title}>You're in!</Text>
        <Text style={styles.subtitle}>
          You now have access to {childName}'s profile
        </Text>
        <Pressable onPress={() => router.replace('/(tabs)')} style={styles.button}>
          <Text style={styles.buttonText}>Go to home</Text>
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
      <Text style={styles.title}>You've been invited!</Text>
      <Text style={styles.subtitle}>
        A parent has invited you to help care for their child using Grandma
      </Text>

      <View style={styles.permissionsCard}>
        <Text style={styles.permissionsTitle}>You'll be able to:</Text>
        <View style={styles.permRow}>
          <Ionicons name="eye-outline" size={18} color={colors.accent} />
          <Text style={styles.permText}>View child's profile and health info</Text>
        </View>
        <View style={styles.permRow}>
          <Ionicons name="create-outline" size={18} color={colors.accent} />
          <Text style={styles.permText}>Log feeding, sleep, and activities</Text>
        </View>
        <View style={styles.permRow}>
          <Ionicons name="chatbubble-outline" size={18} color={colors.accent} />
          <Text style={styles.permText}>Chat with Grandma for advice</Text>
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
          <Text style={styles.buttonText}>Accept invite</Text>
        )}
      </Pressable>

      <Pressable onPress={() => router.back()} style={styles.declineButton}>
        <Text style={styles.declineText}>Decline</Text>
      </Pressable>
    </View>
  )
}
