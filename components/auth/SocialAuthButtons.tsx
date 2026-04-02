import { useEffect, useState } from 'react'
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import {
  signInWithApple,
  signInWithGoogle,
  isAppleSignInAvailable,
} from '../../lib/auth-providers'
import { colors, borderRadius, typography } from '../../constants/theme'

interface SocialAuthButtonsProps {
  onSuccess?: () => void
}

export function SocialAuthButtons({ onSuccess }: SocialAuthButtonsProps) {
  const [appleAvailable, setAppleAvailable] = useState(false)
  const [loading, setLoading] = useState<'apple' | 'google' | null>(null)

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable)
  }, [])

  async function handleApple() {
    try {
      setLoading('apple')
      await signInWithApple()
      onSuccess?.()
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Apple Sign-In Error', e.message)
      }
    } finally {
      setLoading(null)
    }
  }

  async function handleGoogle() {
    try {
      setLoading('google')
      await signInWithGoogle()
      onSuccess?.()
    } catch (e: any) {
      if (e.message !== 'Google sign-in was cancelled or failed') {
        Alert.alert('Google Sign-In Error', e.message)
      }
    } finally {
      setLoading(null)
    }
  }

  return (
    <View style={styles.container}>
      {appleAvailable && (
        <Pressable
          onPress={handleApple}
          disabled={loading !== null}
          style={({ pressed }) => [
            styles.button,
            styles.appleButton,
            pressed && styles.pressed,
            loading === 'apple' && styles.loading,
          ]}
        >
          <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
          <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
            Continue with Apple
          </Text>
        </Pressable>
      )}

      <Pressable
        onPress={handleGoogle}
        disabled={loading !== null}
        style={({ pressed }) => [
          styles.button,
          styles.googleButton,
          pressed && styles.pressed,
          loading === 'google' && styles.loading,
        ]}
      >
        <Ionicons name="logo-google" size={18} color="#1A1A2E" />
        <Text style={[styles.buttonText, { color: '#1A1A2E' }]}>
          Continue with Google
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: borderRadius.lg,
  },
  appleButton: {
    backgroundColor: '#000000',
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  loading: {
    opacity: 0.6,
  },
})
