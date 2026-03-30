import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '../../lib/supabase'

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function signUp() {
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      Alert.alert('Success', 'Check your email to confirm your account!')
      router.replace('/(auth)/sign-in')
    }
    setLoading(false)
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#FAF8F4' }}>
      <Text style={{ fontSize: 32, fontWeight: '600', color: '#1A1A2E', marginBottom: 8 }}>
        Create account
      </Text>
      <Text style={{ fontSize: 16, color: '#888', marginBottom: 40 }}>
        Meet your parenting grandma
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
        placeholder="Password (min 6 characters)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity
        onPress={signUp}
        disabled={loading}
        style={{ backgroundColor: '#7BAE8E', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 }}
      >
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
          {loading ? 'Creating account...' : 'Create account'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => router.back()}
        style={{ alignItems: 'center' }}
      >
        <Text style={{ color: '#7BAE8E', fontSize: 15 }}>
          Already have an account? Sign in
        </Text>
      </TouchableOpacity>
    </View>
  )
}