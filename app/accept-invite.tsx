import { useState } from 'react'
import { View, Text, Pressable, Alert, StyleSheet, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'

export default function AcceptInvite() {
  const { token } = useLocalSearchParams<{ token: string }>()
  const [loading, setLoading] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [childName, setChildName] = useState('')

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
        <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
      </Pressable>

      <Text style={styles.emoji}>👵</Text>
      <Text style={styles.title}>You've been invited!</Text>
      <Text style={styles.subtitle}>
        A parent has invited you to help care for their child using Grandma
      </Text>

      <View style={styles.permissionsCard}>
        <Text style={styles.permissionsTitle}>You'll be able to:</Text>
        <View style={styles.permRow}>
          <Ionicons name="eye-outline" size={18} color="#7BAE8E" />
          <Text style={styles.permText}>View child's profile and health info</Text>
        </View>
        <View style={styles.permRow}>
          <Ionicons name="create-outline" size={18} color="#7BAE8E" />
          <Text style={styles.permText}>Log feeding, sleep, and activities</Text>
        </View>
        <View style={styles.permRow}>
          <Ionicons name="chatbubble-outline" size={18} color="#7BAE8E" />
          <Text style={styles.permText}>Chat with Grandma for advice</Text>
        </View>
      </View>

      <Pressable
        onPress={handleAccept}
        disabled={loading}
        style={[styles.button, loading && { opacity: 0.6 }]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#FAF8F4',
    paddingHorizontal: 24, paddingTop: 80, alignItems: 'center',
  },
  backButton: {
    position: 'absolute', top: 60, left: 24,
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E8E4DC',
  },
  emoji: { fontSize: 56, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '700', color: '#1A1A2E', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#888', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  permissionsCard: {
    width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#E8E4DC', marginBottom: 32, gap: 14,
  },
  permissionsTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  permRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  permText: { fontSize: 14, color: '#555' },
  button: {
    width: '100%', backgroundColor: '#7BAE8E', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  declineButton: { paddingVertical: 16 },
  declineText: { color: '#888', fontSize: 14 },
})
