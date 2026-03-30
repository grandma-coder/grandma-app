import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '../../lib/supabase'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function signIn() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) Alert.alert('Error', error.message)
    setLoading(false)
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#FAF8F4' }}>
      <Text style={{ fontSize: 32, fontWeight: '600', color: '#1A1A2E', marginBottom: 8 }}>
        Welcome back
      </Text>
      <Text style={{ fontSize: 16, color: '#888', marginBottom: 40 }}>
        Grandma is ready to help 👵
      </Text>

      <TextInput
        style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0DDD8', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 12 }}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0DDD8', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 24 }}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        onPress={signIn}
        disabled={loading}
        style={{ backgroundColor: '#7BAE8E', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 }}
      >
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
          {loading ? 'Signing in...' : 'Sign in'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')} style={{ alignItems: 'center' }}>
        <Text style={{ color: '#7BAE8E', fontSize: 15 }}>Don't have an account? Sign up</Text>
      </TouchableOpacity>
    </View>
  )
}